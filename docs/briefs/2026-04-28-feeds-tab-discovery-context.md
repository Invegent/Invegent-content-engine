# Brief: Feeds Tab — Discovery Context & Unassigned Visibility

**Date:** 2026-04-28
**Author:** PK + Chat
**Implementer:** Claude Code (CC)
**Working repo:** `invegent-dashboard` (primary), `Invegent-content-engine` (reference only)
**Branch:** `main` (direct-push, no PR ceremony — single-repo frontend work)
**Status:** Ready for CC

---

## 1. Why this brief exists

This morning's screenshot (PK to chat, ~7:50am Sydney) showed the Feeds tab's "UNASSIGNED — 8 FEEDS" section listing 8 newly-discovered RSS.app feeds, all named "client-onboarding", all marked "No data yet", with no URL visible and no indication of which client originally requested them.

The data is there — `f.feed_source.config->>'feed_url'` has the rss.app URL, `f.feed_discovery_seed.seed_value` has the originating keyword/URL, `f.feed_discovery_seed.client_id` records who asked for it. The UI just isn't surfacing any of it.

After migration 006 (auto-link client-scoped seeds), those 8 specific feeds now appear assigned to CFW. But the unassigned bucket still has real operational value:

1. **Orphaned feeds from cleanup ops** — when an operator removes feed assignments (e.g. yesterday's removal of 24 inherited NDIS-Yarns assignments from CFW), the underlying `f.feed_source` row stays alive with `status='active'`. Ingest continues, content piles up unused, RSS.app quota gets consumed. The bucket is the audit view that surfaces "this is alive but nobody's using it".
2. **Operator-exploration seeds** — seeds with `client_id IS NULL` (currently 9 pre-Stage-1.1 rows). These deliberately bypass auto-link.

The bucket's purpose is right. The UX is wrong.

---

## 2. Current state (what's broken)

**Visible to operator on the Feeds tab unassigned section:**
- `source_name` only — which is `'client-onboarding'` for all 8 discovery-provisioned rows because the EF used `seed.label || feed.title || seed.seed_value` and all 9 seeds were submitted with `label='client-onboarding'`
- No URL
- No origin context (discovery? operator-exploration? orphaned?)
- No seed value (the keyword that produced this feed)

**What the FeedRow type expects:**
```typescript
type FeedRow = {
  source_id: string; source_name: string; source_url: string | null;
  ...
};
```

`source_url` is null for these rows. There is no `source_url` column on `f.feed_source` — the URL lives at `config->>'feed_url'`. The server query that produces FeedRow rows is not extracting it.

**Where the rendering happens:**
- `app/(dashboard)/feeds/feeds-client.tsx` — the unassigned bucket render block (`{unassignedRows.length > 0 && ...}`)
- The `<p>` that renders `feed.source_url` exists but receives null

---

## 3. Target state

For each row in the unassigned bucket, show:

1. **A meaningful primary label** — for discovery-originated feeds, the seed_value (keyword or URL); for orphaned/operator-added feeds, fall back to source_name
2. **The feed URL** (clickable, opens in new tab) — `config->>'feed_url'`
3. **An origin badge** explaining why this row is in the unassigned bucket:
   - `Auto-discovered` (existing badge already in `ADDED_BY_BADGE`) — `added_by='discovery_pipeline'`
   - `Originally for: <client_name>` — when there's a related row in `f.feed_discovery_seed` with non-null `client_id` that was un-linked or never-linked
   - `Operator exploration` — `added_by='operator'` and never had a c.client_source row
   - `Orphaned` — has prior c.client_source rows that were all removed (drift signal)
4. **Health indicator** stays as-is (existing logic)

For each row in the **assigned** sections (existing groups), also extract `feed_url` from config when `source_url` is null, so existing healthy rss_app feeds also show URLs (currently many existing rows likely show no URL for the same root-cause reason).

---

## 4. Implementation plan

### 4.1 Server-side data layer

**Where:** `app/(dashboard)/feeds/page.tsx` (server component) and any helper query module it uses.

**Change:** the query that produces `rows: FeedRow[]` must extract `feed_url` from `config->>'feed_url'` and assign to `source_url` when the column-level value is null. This is a SELECT-side change; do not modify f.feed_source structure.

Suggested SQL pattern:
```sql
SELECT
  fs.source_id,
  fs.source_name,
  COALESCE(fs.config->>'feed_url', fs.config->>'url') AS source_url,
  fs.source_type_code,
  ...
```

Use `COALESCE` for forward compatibility — older rows may have `url`, newer ones use `feed_url`.

### 4.2 Discovery-context join

Add an optional join from `f.feed_source` to `f.feed_discovery_seed` so the row carries:
- `discovery_seed_value` (text, nullable)
- `discovery_client_id` (uuid, nullable)
- `discovery_client_name` (text, nullable, via further join to c.client)

Pattern:
```sql
LEFT JOIN LATERAL (
  SELECT
    ds.seed_value,
    ds.client_id,
    cc.client_name
  FROM f.feed_discovery_seed ds
  LEFT JOIN c.client cc ON cc.client_id = ds.client_id
  WHERE ds.feed_source_id = fs.source_id
  ORDER BY ds.provisioned_at DESC
  LIMIT 1
) discovery ON TRUE
```

A feed with no matching discovery row gets all-nulls. A feed with one or more matching seeds gets the most recent one.

Add these to the `FeedRow` type:
```typescript
type FeedRow = {
  ...
  discovery_seed_value?: string | null;
  discovery_client_id?: string | null;
  discovery_client_name?: string | null;
};
```

### 4.3 Origin classification (client-side helper)

Add a helper in `feeds-client.tsx` (or a new `lib/feed-origin.ts`):

```typescript
type FeedOrigin =
  | { kind: 'discovery'; seedValue: string; originalClient?: string }
  | { kind: 'operator'; }
  | { kind: 'orphaned'; lastClient?: string }
  | { kind: 'unknown' };

function classifyOrigin(feed: FeedRow): FeedOrigin {
  if (feed.added_by === 'discovery_pipeline' && feed.discovery_seed_value) {
    return {
      kind: 'discovery',
      seedValue: feed.discovery_seed_value,
      originalClient: feed.discovery_client_name ?? undefined,
    };
  }
  if (feed.added_by === 'operator') return { kind: 'operator' };
  // orphaned detection: had c.client_source rows historically but none now.
  // If we don't have audit data to detect this cleanly, return 'unknown'
  // for non-discovery non-operator rows. Out of scope to add audit query
  // for orphaned detection in this brief — defer to a follow-up.
  return { kind: 'unknown' };
}
```

### 4.4 Render upgrade for unassigned section

In the unassigned-bucket render block of `feeds-client.tsx`:

- Primary label: `feed.discovery_seed_value ?? feed.source_name`
- Below the label: `<a href={feed.source_url}>{feed.source_url}</a>` (open in new tab, truncate at 60 chars)
- Origin badge row:
  - For `discovery`: render the existing `Auto-discovered` badge plus a small chip "for {originalClient}" if originalClient is set
  - For `operator`: small grey chip "Operator-added"
  - For `orphaned` / `unknown`: small grey chip "Orphaned" (or omit if `unknown` to avoid lying)

### 4.5 Same render upgrade applied to the assigned sections

The assigned-feeds grouping ALSO benefits from the COALESCE fix in 4.1 — many existing rss_app rows likely render without URL today for the same root-cause. No additional UI change beyond what 4.1 produces.

---

## 5. Verification gates

CC must complete V1–V8 in order. Stop and ask if any gate fails.

**V1 — Schema check.** Run via Supabase MCP: confirm the SELECT in 4.1 + 4.2 returns rows with non-null `source_url` for at least the 8 CFW auto-discovered feeds and the existing 5+ operator-added rss_app feeds (RBA, DSS, Team DSC, etc.). Report row counts.

**V2 — Type check.** `npm run build` (or whatever the dashboard's typecheck command is — check `package.json` `scripts`). Must pass. No new ESLint warnings.

**V3 — Local render smoke.** Run dev server, load Feeds page, confirm:
- Unassigned bucket: each of the 9 (formerly 8 + 1 still-failed) rows shows a feed URL and either a seed value or a sensible source_name
- At least one row shows the `Auto-discovered` badge
- Assigned sections: existing rss_app rows now show URLs

**V4 — Click test.** Click a feed URL in the unassigned bucket → opens new tab → real rss.app feed loads.

**V5 — Filter test.** Toggle "All clients" / individual client tabs. Unassigned bucket only renders in "All clients" view (existing behaviour, must not regress).

**V6 — Empty-state test.** Test with a clean unassigned bucket (filter or stub) — empty state must still render gracefully.

**V7 — Vercel preview deploy.** Push to main, wait for Vercel deploy, open preview URL. PK to confirm visually.

**V8 — Production sanity.** After main deploys to dashboard.invegent.com, PK opens the Feeds page, confirms the 8 CFW auto-discovered feeds (now in CFW-assigned section, not unassigned) show URLs and seed values where applicable.

---

## 6. Files touched (estimate)

**invegent-dashboard:**
- `app/(dashboard)/feeds/page.tsx` — server query (4.1, 4.2)
- `app/(dashboard)/feeds/feeds-client.tsx` — type, classifyOrigin helper, render upgrade (4.3, 4.4)
- Possibly `lib/feed-origin.ts` (new) if helper is split out
- No new components needed (extending existing FeedsClient)

**No backend/DB changes required.** All work is read-side.

---

## 7. Out of scope

- Orphan detection via audit history (deferred — needs c.client_source audit table or activity log)
- Bulk Assign/Deactivate UX
- Search/filter within unassigned bucket
- Refactor of source_name strategy (separate brief — `client-onboarding` should be replaced by seed_value at write time)
- Any change to f.feed_source structure
- Any change to discovery EF or its config schema
- Stage 2.2 charter item (assigned-but-disabled visibility) is **partially absorbed** by 4.5 here for URL rendering; the disabled-vs-enabled visual treatment can come in a separate brief

---

## 8. Standing-protocol checklist (CC must follow)

- Read `docs/00_sync_state.md` from `Invegent-content-engine` first
- Read `docs/00_docs_index.md` for context
- Check for non-main branches in `invegent-dashboard` and `invegent-portal` and flag orphans before starting
- Direct-push to main; no PR
- After V8 PK approval, write a result file at `docs/briefs/2026-04-28-feeds-tab-discovery-context-result.md` in `Invegent-content-engine` summarising: commits, V1–V8 outcomes, any deviations from the brief, follow-up suggestions
- Do NOT update `docs/00_sync_state.md` — chat does that at session close

---

## 9. Background context (if CC needs it)

This morning's chat session:
- Migration `005` (`95abfa30`) — added 5-param overload of `create_feed_source_rss` to fix PostgREST schema-cache failure on 9 CFW seeds
- Migration `006` (`7834d3a`) — added trigger `tg_auto_link_seed_to_client` to auto-link client-scoped discovery seeds to `c.client_source`; backfilled 8 CFW links
- CFW pool: 2 → 10 active feeds
- Architectural decision: discovery decides assignment, `feed-intelligence` decides retention via `m.agent_recommendations`

Side findings logged but not addressed today:
- Overload B (6-param) of `create_feed_source_rss` has a latent NOT NULL bug — never executed
- Deployed `feed-discovery` EF differs from GitHub source (`feed_url` vs `url` in config jsonb) — fix in chat lane this session
- `source_name='client-onboarding'` for all 8 discovery rows — deferred to a follow-up brief

---

End of brief.
