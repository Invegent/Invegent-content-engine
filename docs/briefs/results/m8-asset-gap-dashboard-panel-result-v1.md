# Result — M8: Asset Gap dashboard panel

**Brief file:** `docs/briefs/m8-asset-gap-dashboard-panel-gate1-brief-v1.md`
**Executed by:** Claude Code (orchestrator + `dashboard-ia-lint` + `ef-builder` + `branch-warden`)
**Completed:** 2026-08-05 Sydney

---

## 1. Result status

`Complete` — dashboard-side implementation pushed to the designated feature branch.
Merge to `main` on either repo is a separate future PK act (unchanged standing gate).

## 2. Commit(s)

- **`invegent-dashboard`** `1d87ec7` — `feat(clients): add read-only Asset Gap backlog tab (M8)`,
  pushed to `claude/asset-gap-dashboard-panel-bdey55` (`origin` set up to track).
- **`invegent-content-engine`** — this result doc + the Gate-1 brief, docs-only, not yet
  committed at the time of writing (commit is a separate, explicit step per this repo's
  house convention: commit only on instruction — see Notes).
- **Zero commits to any `main`.** Zero commits, zero reads-that-mutate, zero migrations
  against `invegent-content-engine`'s DB objects.

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
- **No live visual verification was possible in this environment** (see §4) — the tab's
  correctness rests on typecheck/build/tests/code review, not an actual rendered screenshot.
  A live check against a real Supabase project (populated + empty client) is recommended
  before this is treated as fully production-verified.
- **`dashboard-ia-lint`'s own ungoverned-question finding stands, unresolved by this lane**:
  whether the IA spec's single-status-vocabulary rule (§6.2) is meant to exempt non-content-
  pipeline domain objects (the capability/readiness/asset-gap vocabulary family) — this
  lane extended the existing, already-shipped precedent rather than resolving the ambiguity;
  flagged for a future IA-spec clarification, not blocking here.
- **The "legacy-routed" state PK named in the task outcome was deliberately NOT implemented**
  as a derivable value. No in-scope data source (the WS-3 view, the readiness-queue RPC)
  carries evidence of legacy-vs-governed routing — that lives in `client_creative_governance`
  rows, a third data source this brief scoped out to avoid fabricating a taxonomy from
  absence-of-data. The derived badge instead has an honest fourth state, `unclassified`, for
  any cell with no readiness-queue signal. **This is a genuine gap against the task's stated
  outcome** ("blocked, supervised, legacy-routed or autonomy-ready") — surfaced here rather
  than silently narrowed. If PK wants true legacy-routed detection, that is a follow-on lane
  reading `client_creative_governance` presence/proof-posture per (client, platform, format).
- Per-client and empty-backlog states were verified by code inspection (both branches of
  `AssetGapTab`'s `rows.length === 0` check exist and match the established empty-state
  wording convention), not by an actual empty vs. populated screenshot pair.

## 7. Next recommended step

Live visual verification against a real Supabase project (one client with open backlog rows,
one with none), followed by a second `dashboard-ia-lint` pass against the actual merged diff
to complete that agent's first real-diff proving run — then this is ready for a PK merge
decision on `invegent-dashboard`. Separately: a scoped follow-on brief if true legacy-routed
detection (via `client_creative_governance`) is wanted for the execution-path badge.

---

## 8. Verification (chat fills this)

**Verdict:** `Pass with notes`

**Notes:**

- Output matches the brief's in-scope items: new tab, gap category / why / status /
  drainability / demand display, cross-reference to the existing readiness-queue cell,
  derived execution-path badge (clearly labelled), schedule-plan indicator. All present.
- Constraints respected (§5). One real bug was caught and fixed during review (`evidence_
  confidence` type), not silently left in.
- No unexpected files changed — `branch-warden` independently confirmed the working-tree
  diff was confined to exactly the 4 intended files.
- Success criteria mostly met; the two shortfalls are both honestly named in §6 rather than
  glossed over: no live visual screenshot (environment-blocked, not skipped), and the
  "legacy-routed" execution-path value was not implemented (no defensible data source in
  scope) rather than fabricated.
- New risk: none identified beyond the two open issues above — read-only, zero new
  injection surface, zero CE-repo blast radius.
- Follow-up: see §7.

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
