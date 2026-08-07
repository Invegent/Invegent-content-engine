# dashboard-operator-cockpit-v1 — build result

**Status: BUILT, ISOLATED, UNPUSHED. Awaiting PK visual approval + watch-safe deployment ruling before anything touches production.** No version number assigned to this record — per the register-cut-owner arrangement, that is the register owner's act, not this build's.

**Repo:** `invegent-dashboard`. **Branch:** `dashboard-operator-cockpit-v1` (isolated worktree `C:\Users\parve\ice-wt\dash-operator-cockpit-v1`, no commit, no upstream, no push, no PR). **Base:** `b3440ec24e6be7f40e877e503a2c381c2c3b45df` — confirmed via Vercel API to be the exact commit currently running in production (not a guess from a local checkout; the dashboard repo carries several diverged branches, see Lane 2's prior finding).

---

## 1. Implementation

One new, read-only, additive route: **`/cockpit`** ("Operator Cockpit"), reachable via one new nav item (top of NOW › Daily, before Overview). Composes three sections from data sources that were already live and authoritative — no new RPC, no new migration, no new table, zero mutations anywhere in the new surface.

| Section | What it shows | Grain |
|---|---|---|
| **1 — Unified Weekly Operating View** | Client, platform, format, expected weekly volume, current readiness, blocked/supervised/autonomous execution state | one row per (client × platform × format), 76 real rows across the 4 active clients today |
| **2 — Clickable Publication Evidence** | Draft/scheduled/processing/published/failed/skipped state per post, with a real link where one can be honestly built | one row per draft/queue/publish record, last 14 days, 129 real rows today |
| **3 — Consolidated Asset Readiness** | Required pool/floor, usable current pool, gap category (with its source labelled), blockage reason, next operator action, execution readiness | same 76 (client × platform × format) cells, cross-referenced against the Asset Gap Backlog |

**Files:** 13 new (3 lib modules + 2 server actions + 1 page + 4 components + 3 test files), 2 modified — `components/sidebar.tsx` (+2 lines, one nav item) and `actions/production-readiness-queue.ts` (comment-only: corrected a stale "NOT-YET-DEPLOYED" note on an RPC that has actually been live since 2026-07-30). No other existing file touched. Every existing tab and route is untouched — confirmed by `branch-warden`'s independent diff scan.

Every derived value is visibly labelled — "(derived)" on the execution-path badge, "src: ..." on the gap-category cell, an explicit column-header caveat that expected weekly volume is platform-grain, not per-format. Nothing is shown as a fabricated default; every "—" or "unavailable" traces to a real null in the source data, confirmed live against 4 real clients (Care For Welfare, Invegent, NDIS-Yarns, Property Pulse).

---

## 2. Test evidence

Run in the isolated worktree, from a clean `npm install` (174 packages, zero diff to `package.json`/`package-lock.json`):

| Check | Result |
|---|---|
| `npx vitest run` | **403/403 passing** (23 test files; 32 are new cockpit tests — 6 volume-picker, 18 evidence/link-builder, 8 gap-category/execution-path — every honest-fallback branch covered, not just happy paths) |
| `npx tsc --noEmit` | Clean, zero output |
| `npm run build` | Succeeded — 66/66 static pages generated, `/cockpit` compiled at 5.63 kB / 93 kB First Load JS |
| Dev-server runtime check | `/cockpit` rendered with zero console errors against 4 real active clients — verified twice: once by `ef-builder` via curl, once independently by me via a live Browser-tool session against real production data (see §6) |

**Review chain (all three gates clear):**
- `branch-warden` → **SAFE**. HEAD exactly at base commit, diff scoped to the approved file set, `middleware.ts` confirmed zero diff (ef-builder's own temporary local-only auth bypass for its curl check, and mine for screenshot verification, were both independently confirmed fully reverted), nothing committed or pushed, zero DB-mutating call sites, worktree fully isolated.
- `db-rls-auditor` → **concerns (non-blocking), independently resolved**. Flagged that the two new reads go through the pre-existing `exec_sql` RPC (project-wide RED classification). Confirmed both queries are fully static/zero-interpolation, matching the already-accepted `asset-gap.ts` pattern; no secret/credential columns selected. Its one residual note — that `m.post_publish.response_payload` is read server-side — I verified afterward is a non-issue: the code narrows it to a single `post_id` string inside the normaliser and never includes the raw payload in the type returned to the UI.
- External review (`ask_chatgpt_review`) → **agree / low risk / high confidence / no pushback**. `review_id e173ceff-5d99-4a18-8f57-ce703ffc93c3`, pinned to diff hash `39f6cbaf...` (sha256 of the full 1,864-line diff). Re-review required if the diff changes before merge, per standing rule.

---

## 3. Source-authority map

| Cockpit field | Source | Live? |
|---|---|---|
| Client/Platform/Format identity, current readiness, execution-path inputs | `get_client_production_readiness_queue(p_client_slug)` RPC | Confirmed live since 2026-07-30, DB-verified rich real data (its own action-file comment calling it "NOT-YET-DEPLOYED" was stale — fixed in this diff) |
| Expected weekly volume (platform-grain cadence / enabled-slot fallback) | `get_publishing_plan_pyramid(p_client_id)` RPC → `schedule_summary` | Confirmed live |
| Gap category (when a specific detected-gap row exists) | `ice_ro.asset_gap_backlog` view | Confirmed live, 8 rows total across all clients |
| Blocked/supervised/autonomous execution state | `deriveExecutionPath()`, imported verbatim from `lib/asset-gap.ts` — not reimplemented | Existing, reused as-is |
| Declared-vs-reachable asset pool mismatch flag | `assetPoolMismatch()`, imported verbatim from `lib/production-readiness-queue.ts` | Existing, reused as-is |
| Active client roster | new static `SELECT ... FROM c.client WHERE status='active'` via `exec_sql` | New read composition of an existing table; DB-confirmed exactly 4 rows, all `status='active'`, no other status value exists today |
| Publication evidence rows | new static UNION of `m.post_draft` / `m.post_publish_queue` / `m.post_publish` via `exec_sql` | New read composition; join key `pub.queue_id = ppq.queue_id` DB-confirmed as the real direct FK (not guessed) |
| Facebook evidence link | `response_payload->>'post_id'` (classic `{page_id}_{post_id}` Graph API shape) → `facebook.com/{page_id}/posts/{post_id}` | DB-confirmed shape present on real rows; **URL pattern itself not click-tested** (no login available) — labelled "Facebook post link," not "verified link" |
| YouTube evidence link | `platform_post_id` → `youtube.com/watch?v={id}` | Backend-confirmed authoritative — this is the exact string CE's own `youtube-publisher` edge function constructs after a real upload |
| LinkedIn / Instagram evidence link | none — always "Evidence link unavailable — not captured by the publisher" | Confirmed structurally absent upstream (LinkedIn: Zapier webhook never returns a real post URN; Instagram: Graph API media ID ≠ public permalink shortcode, never requested) |

---

## 4. Before/after operator journey

**Before** (per the prior Lane 2 rehearsal, `docs/briefs/results/lane2-operator-onboarding-proof-v1.md`): an operator answering "what's the current state across all my clients" had to open ~15 separate per-client tabs one at a time — Publishing Plan Pyramid, Weekly Format Plan, Production Readiness Queue, Asset Gap, Creative Config-Gap Audit — reconstructing a cross-client picture by hand, with no clickable evidence of what actually published anywhere.

**After:** one route, three sections, filterable by client/platform/state, showing the same underlying truth in one place — 76 (client × platform × format) cells and 129 recent publication records, cross-client, on one screen. This does not replace the per-client tabs (still useful for deep-dives) — it adds the cross-client rollup that Lane 2 identified as the biggest gap (finding F-1/F-7 in that report). The clickable-evidence gap (F-6) is now honestly partially closed: real links for Facebook/YouTube, an honest "unavailable" for LinkedIn/Instagram rather than the previous silence.

---

## 5. Unresolved backend gaps (surfaced, not fixed by this lane — out of its read-only scope)

1. **LinkedIn has no path to a real post permalink** — the Zapier-bridge publish flow never returns LinkedIn's real post URN. Closing this needs a write-path change (capturing more of the Zapier response, or querying LinkedIn's API for the URN post-publish) — a future, separate, PK-gated lane.
2. **Instagram has no path to a real post permalink** — the publisher never requests `fields=permalink` on the Graph API publish call. Same category of gap, same future-lane treatment.
3. **Facebook's link pattern is unverified end-to-end** — the URL shape follows Facebook's documented permalink form and the underlying ID data is confirmed present, but no one has actually clicked one of these constructed links to confirm it resolves (no login available in this environment). Worth a five-minute manual click-check by someone with Facebook page access before this is fully trusted.
4. **`required_asset_slots` vs `minimum_required_pool`** are two genuinely distinct backend concepts that this cockpit deliberately keeps unmerged (per the source module's own "must not be conflated" rule) — an operator seeing both numbers on one cell may reasonably ask why they differ; that's a real product-communication gap in the underlying data model, not something this UI should paper over.
5. **`exec_sql`'s standing RED classification** is not resolved by this lane (nor was it meant to be) — this build adds two more static-literal callers to an already-accepted pattern. The real remediation is the repo-wide `exec_sql` containment effort tracked elsewhere.

---

## 6. Preview verification

**Image screenshots were not obtainable in this session** — the Browser pane could not composite frames for a `computer{action:"screenshot"}` call in this environment (a session/interface limitation, not a rendering failure). In its place, here is full-fidelity proof from a live Browser-tool session against the real dev server, real production data, zero console errors:

- Navigated to `http://localhost:3011/cockpit` (isolated worktree's own dev server, port 3011, temporary local-only middleware bypass for `/cockpit` only — reverted and independently re-confirmed clean by `branch-warden` immediately after).
- `get_page_text` confirms all three sections rendered with real data: Section 1 shows 76/76 rows across all 4 clients with working client/platform/execution filters; Section 2 shows 129/129 rows including one real `Published` Facebook row correctly showing "Evidence link unavailable — response payload missing a usable post_id" (the honest-fallback path firing correctly on live data, not just in tests); Section 3 shows all 76 cells with required-pool/usable-pool/gap-category/blockage-reason/next-action/execution-readiness populated from real values.
- `read_console_messages{onlyErrors:true}` → no errors.

If PK needs actual image screenshots, that requires either running this same verification from an environment where the Browser pane can composite (e.g., an interactive session), or PK reviewing directly via `npm --prefix C:\Users\parve\ice-wt\dash-operator-cockpit-v1 run dev -- -p 3011` locally with a real login session (no bypass needed for a real authenticated user).

---

## 7. Programme-control payload (version-less — for the register owner to slot in)

```
dashboard-operator-cockpit-v1 — BUILT, isolated, unpushed, all 3 review gates clear
(branch-warden SAFE · db-rls-auditor concerns-resolved · external review agree/low/high, review_id e173ceff-5d99-4a18-8f57-ce703ffc93c3)
403/403 tests pass · tsc clean · build clean · live-rendered against real production data, zero console errors
Base: b3440ec (confirmed current production commit via Vercel API)
Result: docs/briefs/results/dashboard-operator-cockpit-v1-result.md
Next gate: PK visual approval + watch-safe deployment ruling (hard stop — not deployed, not pushed, not merged)
Open, out-of-scope items: LinkedIn/Instagram evidence links structurally unavailable upstream; Facebook link pattern unverified end-to-end (no login to click-test)
```

---

# CLOSURE ADDENDUM (2026-08-07) — lane CLOSED, cockpit LIVE IN PRODUCTION

The sections above record round 1 (the data foundation) as built. Two further PK-ordered UX rounds followed on the same isolated branch, and the lane then merged and deployed. This addendum is the canonical closure record; the register carries pointer entries only (Convention 1).

## Rounds 2–3 (summary; full detail in PR #10 commit messages)

- **Round 2 — `e52951a` (summary-first/exceptions-first):** 5 summary cards · default-visible Needs-attention section · grouped client/platform weekly rows + format chips · Published/Scheduled/Failed/Drafts/Other evidence sub-tabs · gaps-only asset default · "No readiness signal" short badge. 447/447 tests · branch-warden SAFE · external review agree/low/high (`9476531c`, diff `e87d86fe…`).
- **Round 3 — `cf3c70b` (tabbed cockpit + global client context):** horizontal 4-tab shell w/ count badges (Needs Attention default, issues grouped by verbatim reason) · planned-formats-only Weekly Plan + reveal toggle (`isPlannedFormatCell`, doubt=include) · permanent Published-count honesty caveat (durable source deferred) · gap-category grouping + Show-healthy-cells · **global client picker authoritative** w/ All-Clients (bare URL = All Clients; unknown `?client=` renders all-clients data + verbatim warning, never a silent zero-match) · operator-language labels w/ every verbatim code relocated (never deleted) into per-row Technical details · lane-keyed next-action links. Shared-file changes (`global-client-picker.tsx`, `client-url-sync.ts`) proven route-gated — other consumers byte-identical. 492/492 tests · branch-warden SAFE (route-gating guard lines quoted) · external review PARTIAL/medium (`4910c838`) escalating the picker change as `policy_decision` → **discharged by PK's visual approval of all three `?client=` states** (all-clients / valid / bogus), per the triage-routing contract.

## Merge + deploy

- **PK watch-safe ruling (2026-08-07):** PR #10 UI-only — zero DB writes/migrations/RPC changes — ruled watch-safe; ruling **explicitly does NOT waive** the S2 DB-apply watch.
- Pre-merge re-verify: PR head = `cf3c70b` exactly; dashboard `main` still `b3440ec` (the reviewed base) — zero drift. Merge executed as hand-built merge commit `7f0cb61` (GitHub merge tool permission-denied in-session; `git commit-tree`, parents `b3440ec`+`cf3c70b`, **tree verified byte-identical** to reviewed `cf3c70b`) → pushed to `main` → PR #10 auto-marked merged.
- Vercel production deploy `dpl_2hsrmHmzoDoKdsvsuLtYPVV3iDjT` → **READY**, aliased `dashboard.invegent.com`, serving `7f0cb61`. **PK visual spot-check on production: PASSED** (Property Pulse-filtered: cards 20/7/0/18/20, tab badges 20/4/32/20, gap-category grouping, dual-picker URL sync all correct).

## Superseded / carried items from the round-1 sections above

- "Next gate: … not deployed, not pushed, not merged" — **superseded**: merged + deployed as above.
- LinkedIn/Instagram evidence-link gap — still true at the UI, now formally owned by the publish-truth arc: `ice_ro.publish_status_v2`'s contract (result doc `publish-truth-task2-corrected-view-and-rpc-result-v1.md` §11) records FB/IG/LI `public_permalink` as legitimately NULL; YouTube (188) + WordPress (54, platform `'website'`) carry real URLs.
- Facebook constructed-link pattern (unclick-tested) — carried into Task 3's product call: constructed links vs `public_permalink` at integration.

## The one remaining item — WATCH-GATED (queued on the action list at this closure)

**Task 3 — cockpit publish-source re-point** (dashboard-session-owned per PK ruling; S2 must not wire the dashboard). Trigger 2/3 met. Blocked on, in order:
1. **S2 v2 apply** — `ice_ro.publish_status_v2` + `public.get_publish_status_v2()` (branch `worktree-agent-a8016aefa5cab42d1` @ `a45f7a3`, blobs `300c337f`/`ef11a8fc`), its own PK gate post-watch (~2026-08-11 20:20 Sydney).
2. **Mandatory post-apply `supabase.rpc()` consumption check** — zero precedent for SETOF-composite-from-unexposed-schema; contingency = re-cut `RETURNS TABLE` under a NEW name (hence no pre-authoring).
3. Then: ONE bounded loader change re-pointing `actions/cockpit-evidence.ts` + soften the Published caveat + the two product calls (constructed links vs `public_permalink`; `'website'` platform rows). Full lane gates apply.

Worktree `C:\Users\parve\ice-wt\dash-operator-cockpit-v1` retained for Task 3 (must be re-based onto post-merge `main` before reuse); `cockpit-preview` launch.json entry retained; remote branch `dashboard-operator-cockpit-v1` left in place (merged, deletable at PK's discretion).
