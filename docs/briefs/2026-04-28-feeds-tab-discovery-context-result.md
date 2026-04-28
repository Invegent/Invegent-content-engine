# Result: Feeds Tab — Discovery Context & Unassigned Visibility

**Date completed:** 2026-04-28
**Brief:** `2026-04-28-feeds-tab-discovery-context.md`
**Implementer:** Claude Code (CC)
**Status:** ✅ Shipped to `dashboard.invegent.com` — V8 confirmed by PK

---

## 1. Commits (invegent-dashboard `main`, direct-push)

| SHA | Subsection | Summary |
|---|---|---|
| `27e83f3` | 4.1 | `getFeeds` SELECT now uses `COALESCE(fs.config->>'feed_url', fs.config->>'url')` for `source_url` |
| `f9aac5e` | 4.2 | LATERAL join on `f.feed_discovery_seed` (most recent provisioned row), 3 new fields on server `FeedRow` (`discovery_seed_value`, `discovery_client_id`, `discovery_client_name`) |
| `a3f392b` | 4.3 + 4.4 | `classifyOrigin(feed)` discriminated-union helper; unassigned bucket renders seed_value as primary label, clickable URL link, `Auto-discovered` badge with optional `for <client>` chip, `Operator-added` chip |

Production deploy `dpl_8jSwjm77UepW6cHcYzZcuAPHc5AQ` aliased to `dashboard.invegent.com`, build duration 49s.

No content-engine repo changes — all work is read-side dashboard frontend.

---

## 2. Verification gates

| Gate | Outcome |
|---|---|
| **V1** Schema check (Supabase MCP) | ✅ 44 of 48 active/paused feeds resolve a non-null `source_url` after COALESCE. Breakdown: 8 CFW auto-discovered (all with seed_value + client_id), 9 null-client discovery, 20 operator rss_app, 7 rss_native. Remaining 4 (2 email_newsletter + 2 youtube_channel) keep their URL elsewhere — out of scope. |
| **V2** Type check / build | ✅ `npx tsc --noEmit` clean; `npm run build` green; `/feeds` route compiled to 1.3 kB / 96.3 kB First Load JS. ESLint not configured in repo (`next lint` prompts interactive setup) — skipped. |
| **V3** Local render smoke | ⚠️ Partial. Dev server compiled middleware + login successfully, but `/feeds` redirects to `/login` for any unauthenticated request, so HTML cannot be inspected programmatically without bypassing auth. Build pass + V8 visual cover the gap. |
| **V4** Click test | Deferred to V8. ✅ PK confirmed clickable URLs open rss.app feeds in new tab. |
| **V5** Filter test | Deferred to V8. ✅ PK confirmed unassigned bucket renders only in "All clients" view. |
| **V6** Empty-state test | Deferred to V8. ✅ Implicitly covered — switching to any client tab empties the bucket and renders gracefully (existing behaviour preserved). |
| **V7** Vercel preview deploy | ✅ Direct-push to main produced production deploy in 49s, aliased to `dashboard.invegent.com`. |
| **V8** Production sanity (PK) | ✅ PK confirmed: 8 CFW auto-discovered feeds in CFW-assigned section show URLs; unassigned bucket entries display seed values, clickable URLs, and origin badges as designed. |

---

## 3. Deviations from the brief

1. **V3 partial.** The brief assumed CC could view rendered HTML in the dev server. The dashboard's middleware enforces Supabase auth on every route except `/login`, so unauthenticated dev fetches redirect away. tsc + `next build` were used as substitutes; V8 covered the visual confirmation.
2. **ESLint check omitted.** `npm run lint` (`next lint`) is not configured in the project — running it triggers an interactive ESLint-bootstrap prompt. The brief's V2 line "No new ESLint warnings" was effectively a no-op against the current repo state.
3. **Three pushes, not five.** The brief suggested pushing per-subsection (4.1, 4.2, 4.3, 4.4, 4.5). 4.5 ("same render upgrade applied to assigned sections") is a no-op-by-design — the brief itself states "no additional UI change beyond what 4.1 produces" — so 4.5 has no commit. 4.3 (helper) and 4.4 (render) shipped together because the helper is dead code without the render that consumes it.
4. **Rebase mid-stream.** Between V1 and the 4.1 push, chat landed `9d9769b` (roadmap update) on `main`. CC rebased cleanly with no conflicts and continued. No code lost.

---

## 4. Follow-ups identified

| Item | Notes |
|---|---|
| **Assigned-section URL clickability** | PK flagged that assigned-section URLs render as plain `<p>` text whereas the unassigned bucket renders them as anchors. The brief explicitly scoped 4.5 to "no additional UI change," so this gap is intentional within Brief A but warrants a follow-up brief. |
| **`source_name='client-onboarding'` at write time** | All 17 discovery_pipeline rows currently store the literal label `'client-onboarding'`. The brief flagged this for a separate brief (Section 9, "Side findings"). Until that lands, `discovery_seed_value` is the only meaningful per-row label for discovery rows in the unassigned bucket — which is exactly what 4.4 falls back to. |
| **Orphan detection** | The brief deferred `kind='orphaned'` to a follow-up needing audit/activity data. `classifyOrigin` returns `'unknown'` (and the render omits a chip) for any non-discovery non-operator row to avoid lying. Re-add `kind='orphaned'` once `c.client_source` audit is available. |
| **4 non-rss_app feeds without URL** | 2 email_newsletter + 2 youtube_channel rows have neither `config->>'feed_url'` nor `config->>'url'`. URL extraction strategy for these source types is a separate concern. |
| **Branch hygiene** | Standing-protocol sweep flagged candidate orphan branches across all 3 repos (see chat). Not deleted by CC — needs PK confirmation. |
| **Stage 2.2 (assigned-but-disabled visibility)** | Partially absorbed here: any disabled feeds will already render with their URLs and origin chips once 4.1 lands. The disabled-vs-enabled visual treatment is still a separate brief. |

---

## 5. Files touched

```
invegent-dashboard/
└── app/(dashboard)/feeds/
    ├── page.tsx          (+19 lines, -3) — SELECT, FeedRow type
    └── feeds-client.tsx  (+50 lines, -3) — FeedRow type, classifyOrigin, unassigned render
```

No new files. No backend/DB changes. No Invegent-content-engine repo changes (this result file is the only edit).

---

*End of result file. `docs/00_sync_state.md` intentionally not updated — chat owns it at session close.*
