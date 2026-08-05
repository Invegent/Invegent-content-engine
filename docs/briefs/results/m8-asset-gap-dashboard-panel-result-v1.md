# Result — M8: Asset Gap dashboard panel

**Brief file:** `docs/briefs/m8-asset-gap-dashboard-panel-gate1-brief-v1.md`
**Executed by:** Claude Code (orchestrator + `dashboard-ia-lint` + `ef-builder` + `branch-warden`)
**Completed:** 2026-08-05 Sydney

---

## 1. Result status

`Complete` — **M8 CLOSED 2026-08-05** (PK live-gate acceptance). `invegent-dashboard`
`main` already carries the commit (§2) — verified via `git fetch` + `git log origin/main -1`
(`main` tip == `1d87ec7`, a linear fast-forward from `fc9c5c9`, no merge commit, same commit
object as the feature-branch push) and independently via `list_commits` on the GitHub API (no
open/merged PR exists for this branch — `main` was fast-forwarded directly, most likely by
this platform's own push-time reconciliation, not by any action taken in this conversation).
**PK direction (2026-08-05): treat as already merged — no further merge action required.**
Content-engine repo commits are docs-only.

## 0. Live read-only visual gate (2026-08-05, PK-directed closeout)

PK asked for a live visual gate before closure: open `/clients`, confirm the tab renders
real WS-3 backlog rows, verify gap category/reason/drainability/demand/readiness
cross-reference, verify the four execution-path badges, verify the schedule-plan warning,
across multiple clients/formats, with durable evidence.

**What was actually possible in this environment, and what was not — reported honestly, not
glossed over:**

- **No browser-rendered screenshot was captured.** This session has no browser-automation
  tool, and the dashboard's `middleware.ts` hard-redirects every unauthenticated request to
  `/login` (real Supabase auth required on every route, no bypass, no test account found in
  the repo). No PK session/credential was available or attempted to be fabricated/bypassed.
- **Substituted: direct, read-only live-database verification** against the same production
  Supabase project (`mbkmaxqhsohbtwsqolns`) the dashboard itself reads — querying
  `ice_ro.asset_gap_backlog` and `get_client_production_readiness_queue(...)` exactly as the
  shipped code does, and hand-tracing the result through `deriveExecutionPath`/
  `hasScheduledButNotExecutable`'s actual logic. **PK accepted this as sufficient** (three-way
  decision recorded 2026-08-05: merge state treated as already-done, data-layer verification
  accepted in place of a screenshot, the `scheduled_demand` defect below logged rather than
  fixed inline).

**Live evidence gathered (durable record, this file):**

`ice_ro.asset_gap_backlog` — 8 live rows, unchanged shape/enum-membership from the brief:

| client_slug | platform | format | primary_route | status | drainability | demand |
|---|---|---|---|---|---|---|
| care-for-welfare-pty-ltd | facebook | carousel | governance_gap | open | blocked_by_template | 1 |
| care-for-welfare-pty-ltd | facebook | image_quote | governance_gap | resolved | blocked_by_template | 1 |
| care-for-welfare-pty-ltd | linkedin | carousel | governance_gap | open | blocked_by_template | 3 |
| invegent | facebook | image_quote | governance_gap | resolved | blocked_by_template | 1 |
| invegent | instagram | image_quote | governance_gap | resolved | blocked_by_template | 5 |
| invegent | linkedin | carousel | governance_gap | open | blocked_by_template | 2 |
| invegent | linkedin | image_quote | governance_gap | resolved | blocked_by_template | 5 |
| property-pulse | youtube | video_short_stat | template_gap | resolved | blocked_by_template | 3 |

Every `primary_route`/`status`/`asset_gap_drainability` value present is a member of the
closed unions shipped in `lib/asset-gap.ts` — zero unrecognised-value fallback would fire.

Cross-referenced against live `get_client_production_readiness_queue(...)` output for the
SAME (platform, format) cells, hand-traced through `deriveExecutionPath`:

| client | platform/format | live overall_state / capability_status | derived execution path | matches expectation |
|---|---|---|---|---|
| CFW | facebook/carousel | `blocked` / `unsupported_silent_degrade` | **Blocked** | ✅ open governance_gap row, cell genuinely blocked live |
| CFW | linkedin/carousel | `blocked` / `unsupported_silent_degrade` | **Blocked** | ✅ same |
| CFW | facebook/image_quote | `ready` / `ready` | **Autonomy-ready** | ✅ resolved backlog row, cell now ready live |
| Invegent | facebook, instagram, linkedin/image_quote | `ready` / `ready` (all three) | **Autonomy-ready** | ✅ all three resolved backlog rows, all three ready live |
| Invegent | linkedin/carousel | **no readiness-queue row returned at all** | **Unclassified** | ✅ real, live exercise of the honest no-signal fallback — an open backlog row with genuinely no cross-referenceable readiness cell, not a parsing failure |
| Property Pulse | youtube/video_short_stat | `ready` / `ready` | **Autonomy-ready** | ✅ resolved backlog row, cell now ready live |

Three of the four execution-path states (`blocked`, `autonomy_ready`, `unclassified`) are
directly evidenced against live production data, across 3 clients, 3 platforms (facebook,
linkedin, youtube), and 3 formats (carousel, image_quote, video_short_stat). `supervised`
(`governance_unproven`) was not present in any live cell queried at this moment — the
derivation branch itself is unchanged, already-typed, already reviewed, and reuses an
already-shipped, already-live classifier status (`governance_unproven` appears elsewhere in
the already-merged `lib/format-capability.ts` vocabulary) — not fabricated, simply not
currently instantiated by live data.

**Direct badge-state evidence, named explicitly (closeout addendum, 2026-08-05):**

- **Blocked:** CFW facebook/carousel and CFW linkedin/carousel — both live `overall_state=blocked`
  / `capability_status=unsupported_silent_degrade`, both against open `governance_gap` backlog
  rows (row table above, rows 1 and 3).
- **Autonomy-ready:** CFW facebook/image_quote, all three Invegent image_quote cells
  (facebook/instagram/linkedin), and Property Pulse youtube/video_short_stat — all five live
  `overall_state=ready` / `capability_status=ready`, all five against `resolved` backlog rows.
- **Unclassified:** Invegent linkedin/carousel — an open backlog row with genuinely no
  cross-referenceable Production Readiness Queue cell returned at all; the honest no-signal
  fallback exercised live, not a parsing failure.
- (`supervised` remains not live-instantiated, as recorded above — the derivation branch itself
  is unchanged and already reviewed, not a gap in this evidence pass.)

**All 8 live `ice_ro.asset_gap_backlog` rows** are the exact 8 rows in the table above — this
was a full read of the view for the queried clients at closeout, not a sample; every row's
`primary_route`/`status`/`asset_gap_drainability` is accounted for and cross-referenced against
the readiness queue in the second table above.

### 0.1 PK-attested visual confirmation (2026-08-05, closeout addendum)

**PK personally opened the live production dashboard** (`/clients?tab=asset-gap`) and visually
confirmed, first-hand:

- The Asset Gap tab renders with real backlog rows for the active client.
- The **Property Pulse** row (`youtube` / `video_short_stat`, `template_gap` primary route,
  `resolved` status, `blocked_by_template` drainability) renders correctly, consistent with the
  live-DB row recorded in the table above (row 8).

This is a first-hand PK visual attestation, not a data-layer inference — it supersedes, for this
specific client/row, the "no browser-rendered screenshot was ever obtained" caveat below (§6).
No image file is attached to this record (none was captured in-session by the executing agent,
which has no browser/credentials available — see §0/§6); the record is PK's own dated
confirmation, made from the real production session, not a substitute inference by chat.

**A real, pre-existing defect was found during this verification, NOT introduced by M8:**
`get_client_production_readiness_queue`'s live `scheduled_demand` field is a **boolean**
at the SQL level (`NOT ac.is_probe_cell AS scheduled_demand`,
`supabase/migrations/20260730120000_client_production_readiness_queue_rpc_v1.sql:320`) — a
real-vs-probe-cell flag, not a count. The already-shipped (pre-M8, on `main` before this lane
started) `lib/production-readiness-queue.ts` types it `number | null` and parses it with
`asNum()`, which silently nulls every real value (`asNum(true)` → `null`). Confirmed live:
every queried cell returns `scheduled_demand` as a boolean/boolean-string, never a number.
**Consequence:** the already-shipped Production Readiness Queue tab's "Scheduled demand"
count has always rendered `—` for every client (pre-existing, not an M8 regression), and M8's
new schedule-plan warning (`hasScheduledButNotExecutable`) can structurally never fire, since
it depends on that same mistyped field. **Per PK direction (2026-08-05): logged here, not
fixed in this lane** — fixing it means editing shared code outside M8's authorised 4-file
scope. Tracked as its own follow-up (see §7).

## 2. Commit(s)

- **`invegent-dashboard`** `1d87ec7` — `feat(clients): add read-only Asset Gap backlog tab (M8)`,
  pushed to `claude/asset-gap-dashboard-panel-bdey55`; `main` fast-forwarded to the same
  commit outside this conversation's own git actions (confirmed live, §1) — treated as merged
  per PK direction, no separate merge performed.
- **`invegent-content-engine`** — this result doc + the Gate-1 brief, committed to
  `claude/asset-gap-dashboard-panel-bdey55` and pushed.
- **Zero commits to any `invegent-content-engine` `main`.** Zero DML/DDL, zero migrations,
  zero writes of any kind against that repo's DB objects — every Supabase call made during
  this lane (including the §0 live-gate verification) was a read-only `execute_sql` SELECT.

## 3. Files changed

**`invegent-dashboard`:**
- `lib/asset-gap.ts` — created. Types + pure normaliser for `ice_ro.asset_gap_backlog`
  (six closed unions mirrored verbatim from the base table's real CHECK constraints),
  `deriveExecutionPath`/`hasScheduledButNotExecutable` derived helpers.
- `actions/asset-gap.ts` — created. `'use server'` boundary; one fully static,
  zero-interpolation `exec_sql` SELECT; client-side filter to the active client.
- `components/clients/AssetGapTab.tsx` — created. Read-only table, zero controls.
- `app/(dashboard)/clients/page.tsx` — modified (+31/-2). New `asset-gap` tab wired into
  the existing `TABS`/`Promise.all`/render-switch pattern; broadened the existing
  `needsProductionReadinessQueue` flag to also cover the new tab (cross-reference data).

**`invegent-content-engine`:**
- `docs/briefs/m8-asset-gap-dashboard-panel-gate1-brief-v1.md` — created (Gate-1 brief).
- `docs/briefs/results/m8-asset-gap-dashboard-panel-result-v1.md` — created (this file).

## 4. Actions taken

- Read the live WS-3 backend evidence (`ice_ro.asset_gap_backlog` view SQL, the CE Asset Gap
  Register v1 §0.4 two-register model, the cc-0041/cc-0046 DDL for every enum's real CHECK
  constraint) and the current dashboard IA (`operator-journey-ia-v1.md`,
  `global-client-picker-v1-brief.md`, the seven prior `/clients` tabs, and the closest
  precedent — `ProductionReadinessQueueTab.tsx` + `lib/production-readiness-queue.ts`).
- Confirmed the dashboard cannot reach schema `ice_ro` directly over PostgREST (not in its
  exposed-schema list) and identified the already-shipped, precedented workaround
  (`actions/capability-matrix.ts`'s static-literal `exec_sql` pattern) rather than proposing
  any new CE-side RPC/view/grant.
- Drafted the Gate-1 brief; ran `dashboard-ia-lint` against it BEFORE any code was written
  (explicit task requirement) — verdict **WARN, no BLOCK**. It flagged two things, both
  addressed:
  1. The derived "execution path" badge must be visually labelled as inferred, not a raw
     backend fact, with its own closed union + label map (never an inline string) — done.
  2. A real defect in the brief's own draft Notes: it had claimed client-scoping would use
     RPC bind-parameters, but other `exec_sql` call sites in this repo actually interpolate
     raw strings — the brief was corrected in place (fetch-all + client-side filter, zero
     interpolation) before implementation, avoiding a new injection-sink call site entirely.
- Ran `ef-builder` in an isolated worktree with the corrected, fully-specified design
  (exact enum values, exact derivation rules, exact file list). It implemented all 4 files,
  ran `npm ci` / `npx tsc --noEmit` (clean) / `npm run build` (clean, all 65 routes
  including `/clients`) / `npm test` (362/362 pass, no regressions) / attempted `npm run
  lint` (no ESLint config committed in this repo — flagged, not silently skipped).
- **Manually reviewed the diff and caught one real bug ef-builder introduced:** `evidence_
  confidence` was typed `number | null` and parsed with `asNum`, but the base table's real
  column is a 2-value text enum (`'conclusive' | 'insufficient'`) — `asNum` would have
  silently nulled it on every real row. Fixed to `string | null` / `asStr` and re-verified
  `tsc --noEmit` clean.
- Ran `branch-warden` before committing — verdict **safe** (correct branch, zero
  ahead/behind drift, working-tree diff confined to exactly the 4 intended files, no shared/
  contended worktree).
- Attempted a live dev-server visual check; the whole dashboard requires live Supabase
  credentials at the `middleware.ts` layer on every request, and this sandbox has none
  configured — confirmed this is a pre-existing, environment-wide condition (every `/clients`
  tab 500s the same way, not something this change introduced), not a defect in the new tab.
  Substituted: clean `tsc --noEmit`, clean `next build` (which does compile/type-check the
  route including the new tab), the full passing test suite, and a manual line-by-line code
  review as the verification actually performed.
- Re-ran build + full test suite after the manual fix — both clean.
- Committed and pushed to `claude/asset-gap-dashboard-panel-bdey55` on `invegent-dashboard`.

## 5. Constraints confirmed

- No CE-repo DB/schema/RPC/grant change — confirmed; zero `invegent-content-engine` code
  or DB touched, only its docs.
- No Content Engine production schedule change — confirmed; read-only visibility only.
- No new `exec_sql` call site with interpolated/dynamic SQL — confirmed; the query in
  `actions/asset-gap.ts` is one fixed literal string, byte-identical on every call.
- No PostgREST schema-exposure or grant change — confirmed; nothing touched outside the
  4 dashboard-repo files.
- Execution-path badge never presented as a raw backend fact — confirmed; labelled "derived"
  in the column header, every cell's caption, and the panel's own description paragraph.
- Zero write/promote/dismiss/edit control on the new tab — confirmed; the component renders
  read-only markup only, no form, no mutation import, no server action beyond the one read.
- No deploy/merge to `main` — confirmed; this lane's terminal act is the push above.

## 6. Open issues

- **`dashboard-ia-lint` is still a candidate agent** (per `CLAUDE.md`), and this lane is its
  first real-diff proving opportunity as named in that file — but the lint pass in this lane
  ran against the DESIGN (the brief), before the diff existed, per the task's explicit
  ordering ("run the review before implementation"). A second `dashboard-ia-lint` pass
  against the ACTUAL diff was not run in this lane (time-boxed); recommended as the next
  step before this proves the agent on a real diff rather than a design doc.
- **No browser-rendered screenshot was ever obtained by the executing agent (superseded/closed
  by §0/§0.1).** A live read-only data-layer gate against the real production Supabase project
  was run first, and PK accepted it in place of an agent-captured screenshot (2026-08-05
  decision). **PK subsequently performed the first-hand visual check personally** (§0.1,
  2026-08-05 closeout addendum): opened `/clients?tab=asset-gap` in the real production
  dashboard and confirmed the tab and the Property Pulse row render correctly. That is the one
  outstanding first-hand look this section previously flagged — now done, by PK directly, not
  by the agent (which still has no browser/credentials in this environment).
- **A real, pre-existing (non-M8) defect was found during the §0 live gate — now FIXED,
  separately from M8 (M8.2, closed 2026-08-05):** the already-shipped
  `lib/production-readiness-queue.ts` mistyped the live RPC's boolean `scheduled_demand` field
  as `number | null`, silently nulling every real value. Logged here at M8 closeout, then
  repaired in its own bounded follow-on lane — see
  `docs/briefs/results/m8.2-scheduled-demand-contract-repair-result-v1.md` for the full record
  (authoritative-meaning research, live-data verification, the fix, and regression tests).
- **`dashboard-ia-lint`'s own ungoverned-question finding stands, unresolved by this lane**:
  whether the IA spec's single-status-vocabulary rule (§6.2) is meant to exempt non-content-
  pipeline domain objects (the capability/readiness/asset-gap vocabulary family) — this
  lane extended the existing, already-shipped precedent rather than resolving the ambiguity;
  flagged for a future IA-spec clarification, not blocking here.
- **The "legacy-routed" state PK named in the task outcome was deliberately NOT implemented**
  as a derivable value, and stays not-implemented at closeout. No in-scope data source (the
  WS-3 view, the readiness-queue RPC) carries evidence of legacy-vs-governed routing — that
  lives in `client_creative_governance` rows, a third data source this brief scoped out to
  avoid fabricating a taxonomy from absence-of-data. The derived badge instead has an honest
  fourth state, `unclassified`, for any cell with no readiness-queue signal — live-exercised
  in §0 (Invegent `linkedin`/`carousel`). **PK named this gap explicitly at closeout and
  scoped it as its own follow-on, not a blocker to M8** — see §7, **M8.1**.
- Per-client and empty-backlog states were verified by code inspection (both branches of
  `AssetGapTab`'s `rows.length === 0` check exist and match the established empty-state
  wording convention) plus the §0 live multi-client query set, not by an actual empty vs.
  populated screenshot pair.

## 7. Next recommended step

**M8 is closed.** Two named follow-ons from M8 closeout (2026-08-05), preserved here as the
durable record of the original scope decision:

- **"M8.1 — dashboard legacy-route authority integration."** Add true legacy-vs-governed
  routing detection to the execution-path badge by reading `client_creative_governance`
  presence/proof-posture per (client, platform, format) — the data source this lane
  deliberately left out of scope (§6). Replaces `unclassified` with a real `legacy_routed`
  state where the evidence supports it; `unclassified` remains the honest fallback everywhere
  else. **Explicitly does not block M8** (PK direction). **Status: not started** — still open,
  bounded, non-blocking.
- **"M8.2 — `scheduled_demand` type-mismatch fix."** Originally logged 2026-08-05 as a
  one-line correction, not fixed in the M8 lane (shared code outside M8's authorised 4-file
  scope). **Status: CLOSED 2026-08-05, same day** — opened as its own bounded lane and
  completed. Full record: `docs/briefs/results/m8.2-scheduled-demand-contract-repair-result-v1.md`
  (brief: `docs/briefs/m8.2-scheduled-demand-contract-repair-gate1-brief-v1.md`). Summary:
  `scheduled_demand` retyped `boolean | null`, parsed with `asBoolOrNull`; the Production
  Readiness Queue tab's "Scheduled demand" cell and `hasScheduledButNotExecutable` (Asset Gap
  schedule-plan flag) both repaired off the same authoritative field; regression tests added
  for true/false/null-missing/malformed; live-verified; pushed to
  `claude/asset-gap-dashboard-panel-bdey55` (`b3440ec`). No schedule-row, readiness-semantics,
  or Asset Gap backend data changed, per PK constraint.
- Separately, still open but non-blocking: a second `dashboard-ia-lint` pass against the
  actual merged diff (this lane's lint pass ran pre-implementation, against the design) would
  complete that agent's first real-diff proving run per `CLAUDE.md`.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass with notes` — **M8 CLOSED 2026-08-05**

**Notes:**

- Output matches the brief's in-scope items: new tab, gap category / why / status /
  drainability / demand display, cross-reference to the existing readiness-queue cell,
  derived execution-path badge (clearly labelled), schedule-plan indicator. All present, and
  three of four execution-path states + the cross-reference logic were live-verified against
  real production data in §0.
- Constraints respected (§5). One real bug was caught and fixed during review (`evidence_
  confidence` type), not silently left in.
- No unexpected files changed — `branch-warden` independently confirmed the working-tree
  diff was confined to exactly the 4 intended files.
- Success criteria met with two named, PK-accepted exceptions: no browser-rendered screenshot
  (data-layer live verification substituted and accepted, §0), and the "legacy-routed"
  execution-path value not implemented (named at closeout as **M8.1**, explicitly non-blocking
  per PK).
- **New finding, not a new risk introduced by M8:** the pre-existing `scheduled_demand`
  type mismatch (§0/§6) — read-only, no security/blast-radius implication, but a real
  functional gap in already-shipped code that this lane's own schedule-plan feature depends
  on. Logged, not fixed, per PK direction.
- Follow-up: see §7 (M8.1 + the `scheduled_demand` fix, neither blocking).

## 9. Learning notes (chat fills this)

- **A brief drafted before deep implementation research can still contain a wrong technical
  claim** (the `$1`-parameter-binding assumption) — `dashboard-ia-lint`'s WARN caught it by
  cross-checking other call sites in the actual repo, not by auditing IA rules per se. Worth
  naming explicitly: even a "pure IA" review agent can surface a correctness defect as a side
  effect of reading real code for context — its handoff notes (`db_rls_auditor` field) named
  this precisely rather than silently absorbing it into the IA verdict.
- **Reusable pattern:** when a dashboard surface needs to read an `ice_ro.*` view and the
  table is small, "fetch-all via one static literal `exec_sql` + filter client-side" is a
  clean, zero-injection-surface alternative to adding a new parameterised RPC — already
  precedented in `capability-matrix.ts`, now reused here. Worth naming as a standing pattern
  for any future small `ice_ro` view the dashboard needs.
- **Ambiguity in the task's own outcome wording** ("blocked, supervised, legacy-routed or
  autonomy-ready") did not correspond to any actual closed-union field in the codebase
  searched. Rather than either fabricating a plausible-sounding mapping or blocking the whole
  lane on a clarifying question, the honest middle path taken here — implement the three
  states that ARE evidence-grounded, add a fourth honest "unclassified" fallback, and name
  the gap explicitly in the result doc — matches this codebase's own established "never
  guess toward a real enum member" discipline (`normaliseResponsibleLane`'s file-header rule)
  extended to a task-level ambiguity, not just a parsing one.
