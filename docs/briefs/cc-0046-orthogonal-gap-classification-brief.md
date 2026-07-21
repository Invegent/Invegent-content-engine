# Brief cc-0046 — Orthogonal Gap Classification & Routing Precision (precursor lane)

**Created:** 2026-07-21 Sydney
**Author:** chat (orchestrator)
**Executor:** Claude Code (ef-builder) + PK gates
**Status:** draft — **Gate-1 review pending. Do NOT build until PK authorizes.**
**Result file:** `docs/briefs/results/cc-0046-orthogonal-gap-classification.md` (created on completion)
**Lane class / tier:** SIDE_PROVING (classifier substrate) → **T2** for the additive/dark DB + isolated-function change; the backfill UPDATE and any function apply are **T3 PK gates**.

> **Standing constraint (from PK's task):** the *Gap Taxonomy & Drain Routing Decision Packet v1* is accepted as architectural direction. **This lane lands and proves the classifier/routing substrate ONLY. It does not begin the backgrounds-only sourcing drain.** No gap may trigger an outward-facing sourcing action until this precursor is proven and a *separate* drain lane is gated.

---

## Task

Upgrade ICE's asset-gap classifier so it reliably and orthogonally distinguishes *why* a slot cannot be filled — a genuinely absent static background, an existing-but-unassigned template, an unapproved/unproven assignment, a missing/negative platform config, a blocked/held condition, an ambiguous appetite, or unresolved evidence — and emits a **diagnosed remediation route** and **automation posture** for each. Today `public.analyze_asset_gap` collapses the full `select_template` reject set into a single coarse `primary_route` by first-match priority, which mislabels real cases (proven live below). This lane finalizes the orthogonal classification contract, decides the physical storage model, upgrades the classifier's precision, adds routing output (additive/dark), preserves full legacy compatibility, and proves the result against named live fixtures — so that a later, separate lane can drive a backgrounds-only sourcing drain using a **hard `governed_sourcing` entry condition** it cannot fabricate.

## Source context

**Producer / classifier (the thing this lane changes):**
- `supabase/migrations/20260720160000_analyze_asset_gap_v1_1_permitted_text_cast.sql` — live `public.analyze_asset_gap(client_slug, platform, format, seed)`. The reject-collapse is lines **95–110** (first-match priority → one of `system_error|template_gap|governance_gap|asset_gap`). STABLE / SECURITY DEFINER / `search_path=''` / service-role-only.
- `supabase/migrations/20260703035154_create_select_template_v1.sql` — `public.select_template`. **Authoritative source of the reject vocabulary** (decision chain §4; reason codes at lines 191–280): `wrong_scope`, `status_below_smoke`, `platform_unsuitable` (`no_suitability_row_for_platform` | `suitability_status_negative`), `no_assignment`, `assignment_not_approved`, `assignment_blocked`, `not_visually_proven`, `assets_fail_closed:<echoed>`; top-level `fail_reason` ∈ `client_not_found | format_unmapped | no_selectable_template`.
- `public.derive_asset_appetite` (status ∈ `ok|ambiguous|fail_closed`) and `public.resolve_slot_assets` (`fail_reason` ∈ `no_governed_background | missing_required_logo | …`) — the asset-layer inputs the analyzer already composes.

**Consumer / storage (the thing this lane extends, additively):**
- `docs/briefs/cc-0041-asset-gap-analysis-ddl-packet-v1.sql` — the applied shape of `m.asset_gap_suggestion` (dual-axis `primary_route` × `asset_gap_detected`/`asset_gap_drainability`, lifecycle `status`, partial-unique live index). **Live column set confirmed identical (36 cols, read-only `information_schema` check 2026-07-21).**
- `supabase/migrations/20260720190000_cc0044_b2_run_asset_gap_analysis_shared_attribution_fix_v1.sql` — live `public.run_asset_gap_analysis` **writer**. Its fail-closed validation (lines **92–107**) is the **only live consumer** of the analyzer's classification keys.

**Compatibility surface (grounded 2026-07-21):**
- `gap_type` **does not exist** in the CE repo (grep, 0 hits) — it is not a live column. The live legacy fields are `primary_route`, `asset_gap_detected`, `asset_gap_drainability`, `why_needed`, `slot_kind`.
- **Neither** `invegent-content-engine` **nor** `invegent-dashboard` contains any reader of `asset_gap_suggestion` / `primary_route` / `drainability` (grep, 0 hits in dashboard). The sole live consumer is the `run_asset_gap_analysis` writer's validation contract.

**Governance context that constrains the routing:**
- `CLAUDE.md` → *Image workflow acceleration* §2 non-negotiables (PK visual verdict is the only deciding act; fenced-until-approved; sha256/licence; pool-neutrality) and *NDIS sensitive real-imagery intake* staged lane (Phase-1 person-free only; Phase 2/3 held). A `governed_sourcing` verdict from this classifier is **necessary, not sufficient** — the drain lane still applies every §2 / NDIS gate.

### Live fixture evidence (read-only, project `mbkmaxqhsohbtwsqolns`, 2026-07-21)

Current `m.asset_gap_suggestion` holds 8 rows. Re-probing `select_template`/`analyze_asset_gap` for the named fixtures:

| Fixture (live row) | `select_template` truth | Current `analyze_asset_gap` | **Correct diagnosis this lane must produce** |
|---|---|---|---|
| carousel — CFW/fb `0532d311`, CFW/li `3b7b0d36`, INV/li `273626e5` | `fail_closed` / `no_selectable_template`; **all 3 candidate rejects = `no_assignment`** | `governance_gap` / detected=false / `triage_only` / **ambiguous=true** (muddled + noisy) | `failure_state=assignment_absent` → **`config_repair`** (assign existing generic template); **not** governance-lumped, **not** ambiguous, **not** sourcing |
| PP YouTube `22d3df93` (`video_short_stat`) | `fail_closed` / `no_selectable_template`; **1st reject = `platform_unsuitable`** | `template_gap` / detected=**true** / why=**`no_governed_background`** (falsely reads as an asset gap) | `failure_state=platform_unconfigured` → **`config_repair`** (platform); **never** `governed_sourcing` (and `video_broll` subject is sourcing-forbidden) |
| INV image_quote/fb `cf02a8e4` (happy) | `ok` (selectable); rejects `[no_assignment, wrong_scope]` are **noise on non-winners** | route=`none` / detected=false ✓ | no gap — must **not** route to sourcing (proves reject-code presence ≠ failure) |
| true static-background absence | *(controlled read-only fixture — see D6)* | — | `failure_state=background_absent` → **`governed_sourcing`** (the only sourcing verdict) |

These four cases are the proof targets. The carousel and YouTube rows demonstrate the two live misclassifications the lane exists to correct.

## Scope

**In scope**
1. Finalize the **orthogonal classification contract** (five axes: `subject_kind`, `failure_state`, `remediation_route`, `automation_class`, candidate-governance posture).
2. **Decide the physical storage model before proposing DDL** (D1): what is canonical on `m.asset_gap_suggestion`, what stays candidate/package data, and how `remediation_route`/`automation_class` are kept consistent so duplicate fields cannot drift.
3. **Upgrade classifier precision** (D4): diagnose beyond the first short-circuit reject code; distinguish `format_unmapped` from `no_assignment`; distinguish absent / unapproved / unproven / blocked / misconfigured; preserve `unresolved` rather than guessing; represent per-variant / multi-part (carousel) appetite instead of collapsing it into a misleading sourcing route.
4. Add **routing output only** — `governed_sourcing`, `operator_approval`, `config_repair`, `operator_template_build`, `manual_triage`, `capability_backlog` — additive/dark.
5. **Prove against named fixtures** (D6): the three carousel `no_assignment` tickets → `config_repair`; the PP YouTube ticket → platform `config_repair`, no sourcing; one controlled static-background-absence fixture → `governed_sourcing`; ambiguous and unresolved fixtures **never** route to sourcing.
6. **Preserve compatibility** (D5): legacy `primary_route` / `asset_gap_detected` / `asset_gap_drainability` / `why_needed` continue to work; new fields are additive/dark; no historical row is assigned a precise classification where evidence is insufficient.

**Out of scope (hard boundaries — PK's task):** No image search, download, or provider call. No drain dispatcher. No ticket claim-state execution. No automatic assignment or platform-suitability mutation. No candidate promotion. No browser automation. No production deployment. No video / logo / generative-media / NDIS-sensitive expansion. **Config repair here means detect → classify → prepare the operator route; it does NOT mean silently creating assignments or suitability rows.**

## Allowed actions

- Read-only DB probes (`select_template`, `analyze_asset_gap`, `derive_asset_appetite`, `resolve_slot_assets`, catalog) to design and validate — via `execute_sql` (R1) / `db-read.py` (R0). Both target functions are STABLE/read-only.
- Author, in an **isolated worktree** (ef-builder): (a) the additive/dark DDL migration file; (b) the upgraded `analyze_asset_gap` and `run_asset_gap_analysis` function bodies; (c) hermetic tests for the fixture matrix.
- Run local/hermetic tests and read-only re-probes to prove the fixture matrix **before** any apply.
- Prepare the exact apply commands + rollback, and route through the full T2/T3 review chain (db-rls-auditor + external review pinned to hash + branch-warden).

## Forbidden actions

- **Do not apply any migration, run any DML/DDL against production, deploy, or merge** without an explicit PK gate. Apply of the DDL and the backfill UPDATE are **T3 hard stops**.
- Do not source, download, or call any image provider; do not build or arm a drain dispatcher; do not write claim-state; do not create/mutate any assignment, suitability, or candidate row; no browser automation.
- Do not change any legacy output key, vocabulary, or the writer's fail-closed validation semantics in a way that could reject a row that validates today.
- **Active hold-states carried into Forbidden (from `docs/00_sync_state.md`):** NDIS production video enablement stays OFF (`c.client_creative_governance` untouched); the diverged local `invegent-dashboard` `main` + orphaned `AddTemplateDraftWizard.tsx` commits are a separate PK item — untouched; no logo/video/generative sourcing (image-agents proven-scoped to person-free backgrounds only).
- Do not mark anything proven, approved, or resolved as a side effect of classification.

## Success criteria

1. **Contract finalized (D1):** the five axes, their value vocabularies, and the storage decision are written and internally consistent; `remediation_route`/`automation_class` are provably non-drifting from `failure_state` (single derivation source).
2. **Diagnostic matrix complete (D2):** every `select_template` reject code + `fail_reason` + derive/resolve outcome maps to exactly one `failure_state` → `subject_kind` / `remediation_route` / `automation_class`, with the least-blocked-candidate precedence defined.
3. **Precision proven (D6):** on live/controlled fixtures the upgraded classifier produces — the 3 carousel rows → `config_repair`; PP YouTube → `config_repair` (platform), `governed_sourcing=false`; the controlled true-absence fixture → `governed_sourcing`; every ambiguous/unresolved fixture → a non-sourcing route. **`governed_sourcing` appears iff `failure_state=background_absent` on a `static_background` slot with no shared-pool hit.**
4. **Compatibility proven (D5):** for all 8 existing rows and every fixture, the legacy keys are byte-identical to the pre-change analyzer, and `run_asset_gap_analysis` validation accepts exactly the rows it accepts today (hermetic diff). New columns born NULL; backfill assigns a precise class only where evidence is sufficient, else `unresolved`.
5. **Handoff contract written (D8):** the drain lane's hard entry condition is specified against the new fields, with the §2/NDIS gates named as still-required downstream.
6. Full T2/T3 chain clean (db-rls-auditor pass · external review pinned to the final hash · branch-warden safe) before any apply; apply and backfill happen only at their PK gates.

## Stop condition

Deliver the design (this brief's D1–D8) for Gate-1 review and **stop**. On PK authorization, build in the isolated worktree, prove the fixture matrix locally, run the review chain, and stop again at the T3 apply gate. Report per the result template. Any tripped STOP condition (D7) voids the remainder and returns to a fresh PK gate.

---

# Design deliverables

## D1 — Canonical classification & storage model

### D1.1 The five orthogonal axes

| Axis | Question it answers | Vocabulary (proposed) |
|---|---|---|
| **`subject_kind`** | *What* is the remediation acting on? | `static_background`, `logo`, `image`, `video_broll`, `template`, `assignment`, `platform_config`, `appetite`, `none` |
| **`failure_state`** | *Why* can this slot not be filled (the binding failure)? | `client_not_found`, `template_absent`, `template_not_generic`, `template_unproven`, `platform_unconfigured`, `platform_negative`, `assignment_absent`, `assignment_unapproved`, `assignment_blocked`, `assignment_unproven`, `background_absent`, `logo_absent`, `broll_absent`, `appetite_ambiguous`, `appetite_unresolved`, `unresolved` |
| **`remediation_route`** | *Who/what* fixes it (the routing output) | `governed_sourcing`, `operator_approval`, `config_repair`, `operator_template_build`, `manual_triage`, `capability_backlog` |
| **`automation_class`** | *May automation act?* (the drain gate) | `governed_auto_sourcing` (drain-eligible), `operator_manual`, `no_automation`, `backlog` |
| **candidate-governance posture** | *What governance state may any produced candidate hold?* | `fenced_until_approved` (default), `not_applicable` |

**Orthogonality guarantee:** `subject_kind` and `failure_state` are *diagnosed* (computed from evidence). `remediation_route` and `automation_class` are **pure functions of `failure_state`** (see D2 map) — they are never independently written, so they cannot contradict the diagnosis. Candidate-governance posture is **not a diagnosis of the ticket** — it is the posture the *future* candidate/package must be born into, and per the storage decision below it is **not** a ticket column.

### D1.2 Storage-model decision (decided before DDL, per task scope #2)

**Decision (recommended — Option R):**
- **Canonical on `m.asset_gap_suggestion` (additive, dark):** `subject_kind`, `failure_state`, plus `classifier_version` (rollout provenance) and `diagnostic_evidence jsonb` (the least-blocked candidate + observed reject codes + shared-hit flag — explainability/audit, not authority).
- **`remediation_route` / `automation_class` are DERIVED, not stored as free columns** — via one **IMMUTABLE** mapping function each, `public.asset_gap_route(failure_state)` and `public.asset_gap_automation(failure_state)`. A single derivation source ⇒ **duplicate fields cannot drift** (satisfies "prefer deriving … or enforce consistency mechanically"). Exposed for humans through a read view; made drain-queryable through a **functional index** `ON m.asset_gap_suggestion (public.asset_gap_route(failure_state))` (immutable fn ⇒ indexable) so the future drain scan stays index-ordered without a redundant stored column.
- **Candidate-level governance state stays candidate/package data.** The ticket already carries the aggregate lifecycle it needs (`status` ∈ open/queued/harvesting/candidates_ready/resolved/dismissed/failed + `candidates_ref`). No `candidate_governance_posture` column is added this lane. If a *clearly named aggregate ticket state* is later required, it is added deliberately under its own gate — never duplicated from per-candidate flags.

**Alternatives (flagged for the db-rls-auditor / PK storage call):**
- *Option G* — store `remediation_route`/`automation_class` as `GENERATED ALWAYS AS (CASE failure_state …) STORED` columns. Also non-drifting and on-table indexable, but requires a table rewrite on add (trivial at 8 rows) and pins the mapping in DDL (revising the map = a new migration). Prefer Option R so the map lives in a versioned function.
- *Option C* — store raw route columns + a `CHECK` tying them to `failure_state`. Rejected: most verbose, easiest to desync on a vocab addition.

> **Open decision D1-a (PK / db-rls-auditor):** ratify Option R vs G. Both meet the non-drift requirement; R keeps the map in a function + functional index, G keeps it in the row. No sourcing behaviour depends on the choice.

## D2 — Reject-code diagnostic matrix

**Core precision rule (replaces the first-match collapse):** when `select_template` = `fail_closed / no_selectable_template`, diagnose from the **least-blocked candidate** — the candidate that advanced *furthest* down the decision chain — because its blocker is the nearest actionable remediation. Layer order (furthest = wins):

```
f. assets_fail_closed  >  e. not_visually_proven  >  d. assignment_{blocked|unapproved|absent}
   >  c. platform_unsuitable  >  b. status_below_smoke  >  a. wrong_scope
```

This is "diagnose beyond the first short-circuit": we scan **all** rejected candidates, take the max layer reached, and read its specific code — not the first code encountered, and not a lumped route.

| `select_template` evidence (binding) | `failure_state` | `subject_kind` | `remediation_route` | `automation_class` |
|---|---|---|---|---|
| `fail_reason=client_not_found` | `client_not_found` | `none` | `manual_triage` | `no_automation` |
| `fail_reason=format_unmapped` (empty candidate set) | `template_absent` | `template` | `operator_template_build` † | `operator_manual` |
| least-blocked reject = `wrong_scope` | `template_not_generic` | `template` | `operator_template_build` | `operator_manual` |
| least-blocked = `status_below_smoke` | `template_unproven` | `template` | `operator_template_build` | `operator_manual` |
| least-blocked = `platform_unsuitable` / `no_suitability_row_for_platform` | `platform_unconfigured` | `platform_config` | `config_repair` | `operator_manual` |
| least-blocked = `platform_unsuitable` / `suitability_status_negative` | `platform_negative` | `platform_config` | `config_repair` | `operator_manual` |
| least-blocked = `no_assignment` | `assignment_absent` | `assignment` | **`config_repair`** | `operator_manual` |
| least-blocked = `assignment_not_approved` | `assignment_unapproved` | `assignment` | `operator_approval` | `operator_manual` |
| least-blocked = `assignment_blocked` | `assignment_blocked` | `assignment` | `manual_triage` | `no_automation` |
| least-blocked = `not_visually_proven` | `assignment_unproven` | `assignment` | `operator_approval` | `operator_manual` |
| least-blocked = `assets_fail_closed:no_governed_background`, slot=`static_background`, **no shared-pool hit** | **`background_absent`** | `static_background` | **`governed_sourcing`** | **`governed_auto_sourcing`** |
| `assets_fail_closed:missing_required_logo` | `logo_absent` | `logo` | `operator_approval` | `operator_manual` |
| `assets_fail_closed:*`, slot=`video_broll` | `broll_absent` | `video_broll` | `capability_backlog` | `backlog` |
| derive appetite = `ambiguous` **and no higher template/assignment/platform failure** | `appetite_ambiguous` | `appetite` | `manual_triage` | `no_automation` |
| derive appetite = `fail_closed` | `appetite_unresolved` | `appetite` | `manual_triage` | `no_automation` |
| unmapped / mixed / evidence insufficient | `unresolved` | `none` | `manual_triage` | `no_automation` |

**`background_absent` is the ONLY row that yields `governed_sourcing` / `governed_auto_sourcing`.** Every other state is operator, manual, or backlog. This single fact is the drain's hard gate (D8).

**Precedence notes that fix the live misclassifications:**
- **Appetite ambiguity is subordinate to any template/assignment/platform failure.** The carousel rows probe `derive=ambiguous`, but their binding failure is `no_assignment` (layer d, upstream of assets). Template-layer diagnosis wins → `assignment_absent` → `config_repair`; the ambiguity is recorded in `diagnostic_evidence`, never turned into detected/sourcing. (This is why the multi-part/carousel appetite no longer produces a misleading route.)
- **Asset-reason `why_needed` is not a failure_state.** The PP YouTube row reports `why_needed=no_governed_background` today, but its binding failure is `platform_unsuitable` (layer c). The new diagnosis reads the layer, not the asset echo → `platform_unconfigured` → `config_repair`; `governed_sourcing=false`.
- **Reject codes on non-winning candidates are noise when a winner exists.** The happy INV image_quote row carries `[no_assignment, wrong_scope]` in `rejected[]` yet `select_template=ok` → `failure_state=NULL` (no gap). The classifier keys off the *selected outcome*, never the mere presence of a reject code.

> **Open decision D2-a (PK):** `format_unmapped` (†) — a supported format with no template maps to `operator_template_build`; a genuinely unsupported format should be `capability_backlog`. Distinguishing needs a known-formats set the analyzer can read. Proposed default = `operator_template_build` + a `diagnostic_evidence` flag; a formats-registry refinement is a follow-up. Confirm default.

## D3 — Additive migration plan (proposed DDL — ⛔ NOT APPLIED; T3 apply gate)

Migration identity (minted at apply, > latest `20260720200000`): `cc0046_asset_gap_orthogonal_classification_v1`. Additive + dark; RLS/grants unchanged (inherits table posture). Two ALTERs so the diagnosed columns exist before the derivation objects reference them.

```sql
-- ⛔ DESIGN — NOT APPLIED. T3 PK apply gate. Additive + dark; zero legacy-column change.
begin;

-- 1) Canonical diagnosed columns (born NULL = dark until backfilled) ---------------
alter table m.asset_gap_suggestion
  add column subject_kind      text
    check (subject_kind is null or subject_kind in
      ('static_background','logo','image','video_broll','template','assignment','platform_config','appetite','none')),
  add column failure_state     text
    check (failure_state is null or failure_state in
      ('client_not_found','template_absent','template_not_generic','template_unproven',
       'platform_unconfigured','platform_negative','assignment_absent','assignment_unapproved',
       'assignment_blocked','assignment_unproven','background_absent','logo_absent','broll_absent',
       'appetite_ambiguous','appetite_unresolved','unresolved')),
  add column classifier_version text,
  add column diagnostic_evidence jsonb;

-- 2) Non-drifting derivation (single source = these IMMUTABLE fns) -----------------
create or replace function public.asset_gap_route(p_failure_state text)
returns text language sql immutable set search_path = '' as $$
  select case p_failure_state
    when 'background_absent'    then 'governed_sourcing'
    when 'assignment_unapproved' then 'operator_approval'
    when 'assignment_unproven'   then 'operator_approval'
    when 'logo_absent'           then 'operator_approval'
    when 'platform_unconfigured' then 'config_repair'
    when 'platform_negative'     then 'config_repair'
    when 'assignment_absent'     then 'config_repair'
    when 'template_absent'       then 'operator_template_build'
    when 'template_not_generic'  then 'operator_template_build'
    when 'template_unproven'     then 'operator_template_build'
    when 'broll_absent'          then 'capability_backlog'
    when 'client_not_found'      then 'manual_triage'
    when 'assignment_blocked'    then 'manual_triage'
    when 'appetite_ambiguous'    then 'manual_triage'
    when 'appetite_unresolved'   then 'manual_triage'
    when 'unresolved'            then 'manual_triage'
    else null end;
$$;

create or replace function public.asset_gap_automation(p_failure_state text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_failure_state = 'background_absent' then 'governed_auto_sourcing'
    when p_failure_state in ('assignment_unapproved','assignment_unproven','logo_absent',
                             'platform_unconfigured','platform_negative','assignment_absent',
                             'template_absent','template_not_generic','template_unproven') then 'operator_manual'
    when p_failure_state = 'broll_absent' then 'backlog'
    when p_failure_state is null then null
    else 'no_automation' end;
$$;

-- 3) Human read surface + drain-queryable functional index ------------------------
create index asset_gap_suggestion_route_fidx
  on m.asset_gap_suggestion (public.asset_gap_route(failure_state));

-- grants for the two fns mirror the analyzer posture (service-role-only; revoke anon/auth)
revoke all on function public.asset_gap_route(text)      from public, anon, authenticated;
revoke all on function public.asset_gap_automation(text) from public, anon, authenticated;
grant execute on function public.asset_gap_route(text)      to service_role;
grant execute on function public.asset_gap_automation(text) to service_role;

commit;
-- ROLLBACK (reference): drop index asset_gap_suggestion_route_fidx;
--   drop function public.asset_gap_route(text); drop function public.asset_gap_automation(text);
--   alter table m.asset_gap_suggestion drop column diagnostic_evidence, drop column classifier_version,
--     drop column failure_state, drop column subject_kind;
```

A read view (e.g. `ice_ro.asset_gap_routing_status`, secret-free) exposing `(id, client, format, subject_kind, failure_state, route, automation_class, status)` is proposed as the R0 coverage for this queue (no view exists today) — its own small T2/T3 add; named here so the coverage gap is closed the right way, not via widened `execute_sql`.

## D4 — Analyzer / function change plan

**`public.analyze_asset_gap` (CREATE OR REPLACE; STABLE/SECDEF/`search_path=''` preserved):**
1. Keep the existing body and **every legacy output key byte-identical** (`primary_route`, `asset_gap_detected`, `asset_gap_drainability`, `why_needed`, `slot_kind`, appetite/signature/scope keys). No legacy semantics change.
2. Add a **diagnosis block** that computes `(subject_kind, failure_state)` from the full `select_template` result — iterate `rejected[]` to find the **max layer reached** (D2 precedence), read that candidate's `reason_code` + `detail`; fold in `fail_reason` (`client_not_found`/`format_unmapped`), the `derive_asset_appetite` status (ambiguity only when no higher-layer failure), and the existing shared-pool + `slot_kind` checks for the asset layer. Emit `subject_kind`, `failure_state`, `remediation_route = public.asset_gap_route(failure_state)`, `automation_class = public.asset_gap_automation(failure_state)`, `candidate_governance_posture` (`fenced_until_approved` iff route=`governed_sourcing`, else `not_applicable`), and a `diagnostic_evidence` object (max layer, observed reject codes, shared-hit, ambiguity flag) — **all additive keys**.
3. Preserve `unresolved` explicitly: any unmapped/mixed/insufficient evidence → `failure_state=unresolved` (never a guessed sourcing route).

**`public.run_asset_gap_analysis` (writer; CREATE OR REPLACE):**
1. Extend the INSERT/UPDATE column lists to persist `subject_kind`, `failure_state`, `classifier_version`, `diagnostic_evidence` (route/automation are derived, not written).
2. **Do not tighten** the fail-closed validation on the new keys in a way that could reject a today-valid row — validate new fields only when present; legacy validation unchanged. Analyzer + writer ship together, so the new keys are present in practice; tolerance is belt-and-suspenders for rollout ordering.
3. No change to detect/drain/close-pass semantics this lane — `asset_gap_detected` and the auto-close oracle stay exactly as today. The drain *entry* precision is a **read-side** contract for the future lane (D8), not a writer behaviour change here.

Both functions are built in an **isolated worktree** by ef-builder; local + hermetic proof before any apply.

## D5 — Compatibility & backfill strategy

- **Legacy keys unchanged.** Hermetic diff harness: for all 8 live rows + every fixture, assert the pre-change and post-change analyzer return **identical** legacy keys; assert `run_asset_gap_analysis` accepts/rejects the exact same set (compare `inserted/updated/rejected` counters on a dry-run over the same inputs). Any legacy delta = STOP.
- **No live reader breaks:** grounded finding — there is no dashboard/reader consumer in either repo; the only consumer is the writer, covered above.
- **Backfill (data-only UPDATE, T3 gate, evidence-gated):** a one-time pass re-probes each existing row's `(client, platform, format)` and sets `subject_kind`/`failure_state` **only** when the re-probe yields a single, unambiguous least-blocked diagnosis; otherwise leaves `failure_state=unresolved` (or NULL). This honours "no historical row is assigned a precise classification where evidence is insufficient." Expected on current data: 3 carousel → `assignment_absent`; PP YouTube → `platform_unconfigured`; resolved image_quote rows → stay resolved (diagnosis recorded as historical, no route side-effect). Backfill writes **no** route/automation columns (derived) and triggers **no** sourcing.
- **Rollout order:** DDL apply (T3) → function apply (T3) → backfill (T3), each its own gate; rollback proven before each. Migration name = permanent identity; any revision gets a new number.

## D6 — Named fixture & test matrix

| # | Fixture | Binding | Expected `failure_state` | Expected `route` | `governed_sourcing`? |
|---|---|---|---|---|---|
| F1 | CFW/fb carousel `0532d311` | live | `assignment_absent` | `config_repair` | **no** |
| F2 | CFW/li carousel `3b7b0d36` | live | `assignment_absent` | `config_repair` | **no** |
| F3 | INV/li carousel `273626e5` | live | `assignment_absent` | `config_repair` | **no** |
| F4 | PP/youtube `video_short_stat` `22d3df93` | live | `platform_unconfigured` | `config_repair` | **no** (also video subject) |
| F5 | **controlled true static-bg absence** | read-only synthetic: a client+format with a `generic` template that is assigned + `visually_approved` + visual-proof-passed, `static_background` slot, but `resolve_slot_assets=no_governed_background` **and** no shared-pool hit | `background_absent` | `governed_sourcing` | **YES** (the only YES) |
| F6 | INV/fb image_quote `cf02a8e4` (happy) | live | NULL (no gap) | — | **no** |
| F7 | ambiguous-appetite (template selectable, appetite genuinely ambiguous, no higher failure) | controlled | `appetite_ambiguous` | `manual_triage` | **no** |
| F8 | unresolved (mixed/unknown reject set) | controlled | `unresolved` | `manual_triage` | **no** |
| F9 | logo-absent (`missing_required_logo`) | controlled/live if available | `logo_absent` | `operator_approval` | **no** |

F5 must be built as a **read-only** probe (no rows created in production): construct it via a hermetic fixture in the isolated worktree (or a transaction that `ROLLBACK`s), never a live INSERT. **Invariant test across the whole matrix:** `governed_sourcing` ⇔ `failure_state=background_absent` ⇔ (`subject_kind=static_background` ∧ slot=`static_background` ∧ no shared hit). Zero false `governed_sourcing`.

## D7 — STOP conditions

Any of the following voids the remainder of the sequence and returns to a fresh PK gate:
- A legacy output key changes value for any row/fixture (compatibility break).
- Any fixture other than F5 produces `governed_sourcing`, **or** F5 fails to (false-negative/positive on the sole sourcing verdict).
- `remediation_route`/`automation_class` observed to disagree with `failure_state` (derivation drift — should be impossible under Option R; if seen, the model is wrong).
- The writer's validation begins rejecting a row it accepts today, or the `inserted/updated/rejected` dry-run counters diverge from baseline.
- A backfill would assign a precise class on insufficient evidence.
- Any hard-boundary action attempted (sourcing, drain arming, claim-state, assignment/suitability mutation, promotion, deploy, browser).
- External review returns any non-clean verdict; `reviewed_input_hash` ≠ current packet/diff hash; unexpected origin movement; unexpected files in the change set; rollback path invalidated.
- Apply attempted without its explicit T3 PK gate.

## D8 — Handoff contract for the backgrounds-only drain lane (later, separate)

The future drain lane consumes this classifier and **must not** re-derive routing. Its **hard entry condition** (all required):

```
status = 'open'
AND asset_gap_detected = true
AND slot_kind = 'static_background'
AND failure_state = 'background_absent'
AND public.asset_gap_route(failure_state)      = 'governed_sourcing'
AND public.asset_gap_automation(failure_state) = 'governed_auto_sourcing'
```

Rows failing any clause are **out of scope for sourcing** — routed to their operator/manual/backlog destinations by other lanes/operators, never sourced. The drain lane additionally, and non-negotiably, applies **every** downstream gate this classifier does *not* replace:
- Image-workflow §2 non-negotiables (fenced-until-approved; PK visual verdict is the only deciding act; sha256 + licence provenance; pool-neutrality machine-assertion; full T3 + live proof + rollback-proven on any production rotation).
- NDIS staged real-imagery policy (Phase-1 person-free only; Phase 2/3 held; disability-info sensitivity) for NDIS-vertical rows — `governed_sourcing` is *eligibility in principle*, not licence to source people/cultural imagery.
- No logo/video/generative sourcing (subject_kind gates those out: `logo`/`video_broll` never reach `governed_sourcing`).

The classifier's contribution is precisely one thing: a machine-checkable, non-fabricable `governed_sourcing` verdict that says *"this is a genuine static-background absence"* — so the drain can trust its entry gate and nothing else routes into sourcing by accident.

---

## Notes / open decisions for PK (Gate-1)

- **D1-a** — storage: ratify **Option R** (derive route/automation via immutable fns + functional index) vs Option G (generated columns). *Recommend R.*
- **D2-a** — `format_unmapped` default route: `operator_template_build` vs `capability_backlog` (needs a known-formats set to distinguish). *Recommend `operator_template_build` + evidence flag; formats-registry refinement as follow-up.*
- **Tiering** — additive/dark DDL + isolated-function change = T2; the DDL apply, function apply, and backfill UPDATE are each T3 (DML/DDL → production). External review is pinned to the final migration+function hash before any apply.
- **No number collision risk noted** — cc-0046 is the next free number (highest in `docs/` = cc-0045).
- This brief is **uncommitted** pending Gate-1. On approval: issue → build in isolated worktree → prove D6 → review chain → T3 apply gates. Nothing is applied by drafting this.
