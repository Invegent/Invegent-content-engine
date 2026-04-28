# Result: Feeds Tab — URL Clickability + Dual-URL + Source_name Polish

**Date completed:** 2026-04-28
**Brief:** `2026-04-28-feeds-tab-clickability-dual-url.md`
**Implementer:** Claude Code (CC)
**Status:** ✅ Shipped to `dashboard.invegent.com` — V8 confirmed by PK

---

## 1. Commits

| Repo | SHA | Subsection | Summary |
|---|---|---|---|
| content-engine | `cbfabed` | 4.1 | Migration 009 — `public.f_url_to_friendly_name(text)` IMMUTABLE helper, backfill of 2 URL-shaped `source_name` rows, `add_client_discovery_seeds` rewrite (URL-seed `label` now derived via the helper) |
| dashboard | `80635c2` | (out-of-scope unblock) | Fix `{client}` JSX-expression bug in `roadmap/page.tsx:644` — escaped to `&#123;client&#125;`. Production deploy `02574c5` was failing build before this brief started |
| dashboard | `81f1c1b` | 4.2 | `discovery_seed_type` added to LATERAL subquery, GROUP BY, and server-side `FeedRow` type |
| dashboard | `eca8b80` | 4.3 + 4.4 + 4.5 | `getFeedUrls(feed)` helper, small `<FeedUrlLines>` component for the dual-URL render block, both assigned and unassigned buckets switched to it |

Production deploy `dpl_…5zktm70d4` aliased to `dashboard.invegent.com`, build 49s.

---

## 2. Verification gates

| Gate | Outcome |
|---|---|
| **V1** Function smoke (Supabase MCP) | ✅ on the SQL spec. Function returns `Ndis news`, `Otaus news`, `Example blog`, `Acme`, `Multi-Word-Domain`, passthrough for `not a url`, NULL for NULL. Brief's Section 3.3 expected-output table had a typo for `NDIS news` (acronym preservation) and `Multi-word-domain` (hyphen casing) — `initcap()` doesn't preserve acronyms or pause at non-alphanumerics. PK approved Option 1: accept the SQL-spec semantics, treat brief prose as the typo. |
| **V2** Backfill row count (Supabase MCP) | ✅ 0 rows remain with URL-shaped `source_name` after backfill; `Ndis news` + `Otaus news` rows present, both carrying their rss.app `feed_url` |
| **V3** Server query check | ✅ 6 CFW keyword rows return `discovery_seed_type='keyword'`; 2 CFW URL rows return `'url'` with `seed_value` = original site, `source_url` = rss.app XML |
| **V4** Type check / build | ✅ `npx tsc --noEmit` clean (after roadmap unblock); `npm run build` green; `/feeds` route 1.3 kB / 96.4 kB First Load JS (was 96.3 kB before this brief — +0.1 kB for `<FeedUrlLines>`) |
| **V5** Dev server smoke | ⚠️ Same auth-wall pattern as Brief A — middleware redirects to `/login` for unauthenticated dev fetches. `next build` substituted for visual confirmation (no warnings, no errors) |
| **V6** Vercel deploy | ✅ Three new Production deploys (roadmap unblock + 4.2 + 4.3-4.5), all Ready in ~50s each. The 44m-old `02574c5` Error deploy that PK probably saw in the dashboard is the pre-existing roadmap break, fixed in `80635c2` |
| **V7** Production sanity (Supabase MCP) | ✅ Live `f.feed_source` rows match V2; `add_client_discovery_seeds` RPC body confirmed to call `f_url_to_friendly_name` for URL seeds going forward |
| **V8** PK browser test (`dashboard.invegent.com/feeds`) | ✅ PK confirmed |

---

## 3. Deviations from the brief

1. **Production unblock outside the brief.** Before V1, the previous deploy `02574c5` (this morning's roadmap update from chat) was erroring on a `{client}` literal in JSX text being parsed as a non-existent expression. I fixed the one character (`80635c2`) before pushing 4.2 — otherwise my pushes would have inherited the broken build. PK previously asked CC to "identify root causes and fix underlying issues rather than bypassing safety checks"; the fix is one character matching the file's own entity-escape convention. Logging here for transparency rather than as an architectural change.
2. **Brief Section 3.3 typo + V8 prose mismatch.** The expected-output table had `NDIS news` (acronym uppercase) and `Multi-word-domain` (hyphens not retitled). Both contradict `initcap()` semantics in the function spec — which is what actually produces `Ndis news` and `Multi-Word-Domain`. V2's query searches for `'Ndis news'` (not `'NDIS news'`), so V2 was internally consistent with the implementation; only Section 3.3's table and V8's prose were the typos. PK confirmed: SQL spec authoritative, accept the literal initcap output, document the typo here.
3. **4.3 + 4.4 + 4.5 in one commit, not three.** Brief implied per-subsection commits. `getFeedUrls` (4.3) is dead code without `<FeedUrlLines>` consuming it (4.4/4.5), and 4.5 was "same as 4.4" not a separate change. Single commit was honest about the unit of work.
4. **Extracted `<FeedUrlLines>` component instead of inline IIFE.** Brief's example was inline IIFE duplicated in both render blocks. The dual-URL JSX is ~15 lines × 2 sites; one shared component is the clean version of the same behaviour. Same output, same accessibility, less to maintain.

---

## 4. Follow-ups identified

| Item | Notes |
|---|---|
| **rss.app `/feeds/{id}` API enrichment** | The 20 operator-added rss_app feeds have no original site URL captured at creation time. Showing the dual-URL block for them would need an API lookup (rss.app exposes the source URL/keyword that produced each feed). Brief flagged as out-of-scope; tracked for future. |
| **`f.feed_source.source_url_original` column** | If/when API enrichment lands, persistent storage of original URL belongs in a typed column rather than re-fetched. Defer until API enrichment proves itself. |
| **Friendly-name vocabulary expansion** | `news` / `blog` / `feed` / `rss` / `feeds` covered. Brief flagged room for `.gov.au → "(government)"` style enrichments. Measure first — only 2 production rows currently use the helper, statistical case for adding patterns is thin. |
| **Bulk re-rename of operator-added rss_app feeds** | Brief explicitly: respect operator names. No action. |
| **9 NULL-client operator-exploration seeds in unassigned bucket** | Pre-existing per Brief A. They render their `seed_value` as primary label and now also a clickable URL via `<FeedUrlLines>`. No further action this brief. |
| **Roadmap roadmap-page.tsx hygiene** | The `{client}` bug recurred because this is the third roadmap edit in two days using `{client}` as plain text. Worth a one-line lint rule or just consistently using HTML entities. Out of scope here. |
| **Branch hygiene** | Same orphan list as Brief A's result — content-engine 4 candidate orphans, dashboard 6, portal 1. Phase B's `feature/slot-driven-v3-build` is active. Not deleted by CC. |

---

## 5. Files touched

```
Invegent-content-engine/
└── supabase/migrations/
    └── 20260428_009_friendly_url_source_names.sql   (new, 174 lines)

invegent-dashboard/
├── app/(dashboard)/feeds/
│   ├── page.tsx           (+4 lines)  — seed_type SELECT, GROUP BY, FeedRow
│   └── feeds-client.tsx   (+48 lines, -5)  — discovery_seed_type, getFeedUrls,
│                                              FeedUrlLines, both render blocks
└── app/(dashboard)/roadmap/
    └── page.tsx           (1 char)    — {client} JSX escape fix
```

No new components beyond `<FeedUrlLines>`. No DB schema changes (function + UPDATE + RPC replace, all in migration 009).

---

*End of result file. `docs/00_sync_state.md` intentionally not updated — chat owns it at session close.*
