# Brief — M8: Asset Gap dashboard panel

**Created:** 2026-08-05 Sydney
**Author:** Claude Code (orchestrator)
**Executor:** Claude Code (ef-builder lane, `invegent-dashboard` repo)
**Status:** issued
**Tier:** **T2** (additive, read-only dashboard surface; zero CE DB/schema change; zero write path)
**Lane class (CCF-02):** PRODUCT_PROOF
**Result file:** `docs/briefs/results/m8-asset-gap-dashboard-panel-result-v1.md` (created on completion)

---

## Task

Add an **Asset Gap** tab to the `invegent-dashboard` `/clients` surface that lets PK see,
per client × platform × format: what capability/asset is missing, why the scheduled format
can't run, whether the gap is template/asset/governance/provider/config-related, current
status + owning lane, and the underlying Asset Gap Register evidence — sourced live from the
already-applied WS-3 `ice_ro.asset_gap_backlog` view, following the dashboard's own existing
read/tab conventions. Add a schedule-plan indicator wherever a selected format is not
currently executable.

## Source context

- `docs/briefs/artifacts/ws3-asset-gap-backlog-view-v1.sql` — the live view's exact column
  set (id, client_slug, platform/format/slot_kind, `why_needed`, `primary_route`,
  `asset_gap_detected`, `asset_gap_drainability`, `subject_kind`, `failure_state`, `status`,
  `demand_count`, `priority_score`, resolution FK pointers, timestamps). Applied 2026-08-02
  (register v6.117/v6.124 pointers, `docs/briefs/results/ws3-asset-gap-read-view-result-v1.md`).
  **This lane reads it; it does not touch it.**
- `docs/briefs/ice-asset-gap-register-v1.md` §0.4 — the two-register model: the DB ledger
  (`ice_ro.asset_gap_backlog`) is authoritative for analyzer-detected, cell-attributable
  asset demand; `get_client_production_readiness_queue` is authoritative for cell ownership;
  the markdown register is retained only for 9 pool-depth items no detector can see.
- `docs/briefs/results/cc-0046-orthogonal-gap-classification.md` — `primary_route` /
  `subject_kind` / `failure_state` semantics (the dual-axis + orthogonal classifier this view
  exposes verbatim).
- **Dashboard repo, read-only precedent for querying `ice_ro.*` from the dashboard:**
  `invegent-dashboard/actions/capability-matrix.ts` — the dashboard's service-role
  `supabase-js` client cannot reach schema `ice_ro` directly (not in PostgREST's exposed
  schema list — same class of gap as the standing PGRST106 gotcha), so the established,
  already-shipped pattern is a **static, hardcoded SELECT string** (no interpolation) via the
  `exec_sql` SECURITY DEFINER RPC. `actions/production-readiness-queue.ts` explicitly notes
  *why* it avoids adding new `exec_sql` call sites when an RPC exists instead (cc-0054
  injection-sink hygiene) — that constraint does not apply here because the query is a fixed
  literal string with zero user input, identical in shape to `capability-matrix.ts`'s
  `Q_TEMPLATES`/`Q_GOVERNANCE`.
- **Nearest existing dashboard precedent for this exact panel shape:**
  `invegent-dashboard/components/clients/ProductionReadinessQueueTab.tsx` +
  `lib/production-readiness-queue.ts` — per-(platform, format) cell table, `overall_state`
  (ready/blocked/waiting_for_proof/not_configured) + `responsible_lane` (closed 8-value
  union incl. `asset_gap`) + `capability.status`. This is the dashboard's **existing** answer
  to "current status and owning lane" and "is this format executable" — the new tab
  cross-references the same (platform, format) cell rather than re-deriving those two facts.
- `invegent-dashboard/docs/dashboard/operator-journey-ia-v1.md` — governing IA spec (five-
  section shell, `/clients` tab conventions, status-colour severity scale §7, URL-addressable
  tabs via `?tab=`).
- `invegent-dashboard/docs/dashboard/global-client-picker-v1-brief.md` — second
  `dashboard-ia-lint` governing doc; the client-scoping model this new tab must follow.
- `invegent-dashboard/app/(dashboard)/clients/page.tsx` — the tab-wiring pattern to extend
  (`TABS` array, `needsX` conditional fetch flags, `Promise.all` fetch, tab render switch).

## Scope

**In scope:**
- One new **`asset-gap`** tab on `/clients` (server component, URL-addressable
  `?tab=asset-gap`, client-scoped like `production-readiness`).
- One new read-only server action reading `ice_ro.asset_gap_backlog` for the active client via
  the `exec_sql` static-query pattern (`capability-matrix.ts` precedent).
- Per-row display: platform/format/slot_kind, `why_needed`, `primary_route` (mapped to a
  plain-language "gap category": governance / template / asset / provider-config), `status`
  (open/resolved/…), `demand_count`, `priority_score`, `subject_kind`/`failure_state`,
  resolution pointers, first/last-seen timestamps — every field sourced, none invented.
- A cross-reference to the SAME (platform, format) cell's existing Production Readiness Queue
  row (`overall_state`, `responsible_lane`, `capability.status`) where available, so "current
  status + owning lane" and "is this executable right now" reuse the dashboard's existing,
  already-shipped classifier output rather than re-deriving it.
- A schedule-plan indicator: for any (platform, format) with `scheduled_demand > 0` (from the
  readiness-queue cross-reference) whose `overall_state` is not `ready`, surface an explicit
  "scheduled but not currently executable" flag on that row.
- `dashboard-ia-lint` run against this brief's design contract + the implemented diff before
  the result doc is written (explicit task requirement).

**Out of scope (deliberately, each named):**
- **Any CE-repo change.** No new view, no new RPC, no migration, no change to
  `m.asset_gap_suggestion`/`ice_ro.asset_gap_backlog` semantics or grants. This lane is
  dashboard-repo-only.
- **Any Content Engine production schedule change.** Read-only visibility only.
- The 9 markdown-register-only pool-depth items (§0.4 of the CE register) — not
  DB-representable, out of this view, out of this tab.
- A brand-new "blocked / supervised / legacy-routed / autonomy-ready" DB column or backend
  concept. No such column exists on `asset_gap_backlog`, `get_client_production_readiness_queue`,
  or anywhere else searched. **Design decision (this brief):** render this as a clearly-labelled
  *derived, presentation-only* execution-path badge built from already-surfaced fields
  (`capability.status` + `responsible_lane` + `overall_state`), using the exact same
  "presentation-only, never re-judges" discipline as `assetPoolMismatch()` in
  `lib/production-readiness-queue.ts`. It is explicitly flagged in-UI as inferred, not a raw
  backend fact, and documented as a judgment call in the result doc — consistent with how
  `ProductionReadinessQueueTab.tsx`'s own header already flags one deliberate adaptation this
  way rather than blocking on it.
- A global top-right client picker (D14/R1.4 in the IA spec) — known deferred IA carry,
  unrelated to this lane; the new tab uses the existing per-page client-pill pattern already
  on `/clients`.
- Editing/dismissing/promoting/resolving any backlog row. Zero controls, zero mutation —
  matches every other tab on this page's read-only convention.

## Allowed actions

- Add one server action (dashboard repo) reading `ice_ro.asset_gap_backlog` via `exec_sql`
  with a fixed literal SELECT (no interpolated input).
- Add one new tab component + wire it into `/clients` `page.tsx` (TABS array, `needsX` flag,
  fetch, render switch) — same shape as the seven prior tabs added to this file.
- Invoke `dashboard-ia-lint` on the design contract and again on the final diff.
- Run local typecheck/build in the isolated worktree.
- Start the dev server and visually verify the tab renders correctly for at least one client
  with open backlog rows and one with none.

## Forbidden actions

- Touching `invegent-content-engine` in any way (no commits, no CE-side DB reads beyond what
  is already documented above as evidence).
- Adding a new `exec_sql` call site with interpolated/dynamic SQL (injection-sink hygiene,
  per `production-readiness-queue.ts`'s own stated rationale) — the query must be a fixed
  literal string.
- Widening PostgREST schema exposure, adding a new grant, or otherwise changing DB posture.
- Presenting the derived execution-path badge as a raw backend fact (must carry a "derived"
  / inferred label, per the design decision above).
- Any write/promote/dismiss control on the new tab.
- Deploy/merge to `main` — this lane's stop condition is push to the designated feature
  branch; merge is a separate, later PK act (unchanged standing gate).

## Success criteria

- `/clients?client=<slug>&tab=asset-gap` renders a client-scoped table of that client's
  `ice_ro.asset_gap_backlog` rows (or an honest empty state — indistinguishable from a failed
  read, matching this codebase's standing convention), with gap category, why/status/priority,
  and the cross-referenced readiness-queue cell context where available.
- Schedule-plan indicator appears on any row where the format is scheduled but not currently
  executable.
- `dashboard-ia-lint` returns PASS or WARN (not BLOCK) against the design + the final diff; any
  WARN is recorded in the result doc, not silently dropped.
- Typecheck/build clean; dev-server visual check captured (screenshot or described state) for
  at least one populated and one empty client.
- Zero CE-repo diff. Zero write/mutation code path on the new tab.

## Stop condition

Report per the result template, then stop. Push to `claude/asset-gap-dashboard-panel-bdey55`
on `invegent-dashboard` is this lane's terminal act; merge to `main` is a separate future PK
gate, unchanged.

---

## Notes

- `dashboard-ia-lint` is listed in `CLAUDE.md` as a **candidate** (not yet proven) — this lane
  is explicitly named in that file as its first real-diff proving opportunity ("it stays
  candidate until it has audited at least one real dashboard diff"). Its verdict here is
  advisory input to this lane's own PK gate, not a blocking gate in itself, consistent with
  every other candidate agent's standing in the team table.
- **Correction (post `dashboard-ia-lint` WARN, 2026-08-05):** the original draft of this note
  claimed client-scoping would use a `$1`-shaped parameter-bound `exec_sql` call. That is
  **not** how `exec_sql` is actually invoked elsewhere in this repo — other call sites in
  `app/(dashboard)/clients/page.tsx` (e.g. `getPublishProfiles`, `getYoutubeChannels`)
  interpolate `client_id` directly into the query string, i.e. `exec_sql` takes one opaque
  SQL string with no bind-parameter support. Interpolating a client slug into that string
  would be a new injection-sink call site — exactly what `production-readiness-queue.ts`'s
  own comment says to avoid. **Corrected design:** the new action fetches the FULL,
  zero-interpolation, fixed-literal `SELECT * FROM ice_ro.asset_gap_backlog ORDER BY …`
  (identical in shape to `capability-matrix.ts`'s `Q_TEMPLATES`/`Q_GOVERNANCE` — no `WHERE`
  clause, no interpolated value at all) and filters to the active client **in TypeScript,
  after the fetch**, exactly like `capability-matrix.ts` does for its client-name resolution.
  The live table is tiny (historically 8 rows total across all clients — see the CE register),
  so fetch-all + client-side filter carries no meaningful cost and needs zero new injection
  surface. This replaces the retracted `$1` claim; the row above is struck through by this
  correction, not deleted, per house no-historical-rewrite convention.
