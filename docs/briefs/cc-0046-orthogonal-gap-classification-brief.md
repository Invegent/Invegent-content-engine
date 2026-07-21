# Brief cc-0046 — Orthogonal Gap Classification & Routing Precision (precursor lane)

**Created:** 2026-07-21 Sydney · **rev-2** (Gate-1 REVISE folded in: orthogonal `(subject_kind, failure_state)` model; genuine-absence inventory proof; tie determinism; `format_unmapped` default; Option R changes; backfill correction; expanded sole-sourcing invariant)
**Author:** chat (orchestrator)
**Executor:** Claude Code (ef-builder) + PK gates
**Status:** draft — **Gate-1 review pending (rev-2). Do NOT build until PK authorizes.**
**Result file:** `docs/briefs/results/cc-0046-orthogonal-gap-classification.md` (created on completion)
**Lane class / tier:** SIDE_PROVING → **T2** for the additive/dark DB + isolated-function change; DDL apply, function apply, and backfill UPDATE are each **T3 PK gates**.

> **Standing constraint (PK):** the *Gap Taxonomy & Drain Routing Decision Packet v1* is accepted as architectural direction. **This lane lands and proves the classifier/routing substrate ONLY — it does not begin the backgrounds-only sourcing drain.** No gap may trigger an outward-facing sourcing action until this precursor is proven and a *separate* drain lane is gated. No build, migration, apply, backfill, or sourcing is authorized by this brief.

---

## Task

Upgrade ICE's asset-gap classifier so it distinguishes — **orthogonally** — *what* a demand is about (`subject_kind`) from *why* it cannot be filled (`failure_state`), and derives a remediation route + automation posture from the **pair**, not from a single collapsed code. Today `public.analyze_asset_gap` flattens the full `select_template` reject set into one coarse `primary_route` by first-match priority, which mislabels real cases (proven live). Critically, the classifier must **prove genuine static-background absence** against the broader governed/candidate inventory before it may emit a sourcing verdict — an existing-but-ungoverned background must route to operator/config/manual, never to sourcing. This lane finalizes the orthogonal contract, decides storage, upgrades precision (incl. deterministic tie handling and component-level multi-part diagnostics), adds routing output (additive/dark), preserves full legacy compatibility, and proves the result against named live + controlled fixtures — so a later, separate lane can drive a backgrounds-only drain on a **hard, non-fabricable `governed_sourcing` entry condition**.

## Source context

**Producer / classifier (changed here):**
- `supabase/migrations/20260720160000_analyze_asset_gap_v1_1_permitted_text_cast.sql` — live `analyze_asset_gap(client_slug, platform, format, seed)`. First-match reject collapse = lines **95–110**. STABLE/SECDEF/`search_path=''`/service-role-only.
- `supabase/migrations/20260703035154_create_select_template_v1.sql` — `select_template`; **authoritative reject vocabulary** (§4; lines 191–280): `wrong_scope`, `status_below_smoke`, `platform_unsuitable` (`no_suitability_row_for_platform` | `suitability_status_negative`), `no_assignment`, `assignment_not_approved`, `assignment_blocked`, `not_visually_proven`, `assets_fail_closed:<echoed>`; `fail_reason` ∈ `client_not_found | format_unmapped | no_selectable_template`.
- `derive_asset_appetite` (status ∈ `ok|ambiguous|fail_closed`) and `resolve_slot_assets` (`fail_reason` ∈ `no_governed_background | missing_required_logo | …`).

**Inventory (the genuine-absence proof — grounded 2026-07-21):**
- `c.client_brand_asset` — client-specific assets. Fences: `is_active` (column) + `asset_meta` jsonb keys (`approved`/`approval_status`/`production_use_allowed`); typed by `asset_type`; `platform_scope`.
- `c.shared_creative_asset` — shared/generic assets. Fences: `is_active`/`approval_status`/`production_use_allowed`/`purpose_bound` (columns); relevance via `governance_scope`/`vertical_key`/`allowed_clients`/`excluded_clients`; typed by `asset_kind`.

**Consumer / storage (extended additively):**
- `docs/briefs/cc-0041-asset-gap-analysis-ddl-packet-v1.sql` — applied shape of `m.asset_gap_suggestion` (live column set confirmed identical, 36 cols).
- `supabase/migrations/20260720190000_cc0044_b2_run_asset_gap_analysis_shared_attribution_fix_v1.sql` — live `run_asset_gap_analysis` **writer**; its fail-closed validation (lines **92–107**) is the **only** live consumer of the analyzer's classification keys.

**Compatibility surface (grounded):** `gap_type` does **not** exist in the CE repo (0 hits). Neither CE nor `invegent-dashboard` has any reader of `asset_gap_suggestion`/`primary_route`/`drainability` (0 hits). Live legacy fields = `primary_route`, `asset_gap_detected`, `asset_gap_drainability`, `why_needed`, `slot_kind`.

**Governance that constrains routing:** `CLAUDE.md` → *Image workflow §2 non-negotiables* + *NDIS staged real-imagery policy*. A `governed_sourcing` verdict is **necessary, not sufficient** — the drain lane still applies every §2/NDIS gate.

### Live fixture evidence (read-only, project `mbkmaxqhsohbtwsqolns`, 2026-07-21)

| Fixture (live row) | `select_template` truth | Current output | **Correct (subject_kind, failure_state) → route** |
|---|---|---|---|
| carousel — CFW/fb `0532d311`, CFW/li `3b7b0d36`, INV/li `273626e5` | `fail_closed`; **all deepest candidates = `no_assignment`** | `governance_gap` / detected=false / **ambiguous=true** | `(assignment, unassigned)` → **`config_repair`** |
| PP YouTube `22d3df93` (`video_short_stat`) | `fail_closed`; deepest = `platform_unsuitable` | `template_gap` / detected=**true** / why=`no_governed_background` | `(platform_config, misconfigured)` → **`config_repair`**; never sources (video subject) |
| INV image_quote/fb `cf02a8e4` (happy) | `ok`; reject codes are noise on non-winners | route=`none` ✓ | `(none, none)` → no gap |
| true static-background absence | *(controlled — D6/F5)* | — | `(static_background, absent)` → **`governed_sourcing`** — only after the inventory proof |

## Scope

**In scope:** (1) finalize the **orthogonal** contract — five axes with an **independent, subject-free `failure_state` vocabulary**, routing/automation derived from the **pair** `(subject_kind, failure_state)`; (2) decide storage (D1); (3) upgrade precision (D4) — diagnose beyond the first reject; distinguish `unsupported`/`absent`/`unassigned`/`unapproved`/`unproven`/`blocked`/`misconfigured`/`negative`; **prove genuine inventory absence before any sourcing verdict**; deterministic tie handling; component-level multi-part diagnostics; preserve `unresolved` over guessing; (4) add routing output additive/dark; (5) prove against named live + controlled fixtures (D6); (6) preserve compatibility (D5).

**Out of scope (hard boundaries — PK):** no image search/download/provider call; no drain dispatcher; no ticket claim-state execution; no automatic assignment or platform-suitability mutation; no candidate promotion; no browser automation; no production deployment; no video/logo/generative/NDIS-sensitive expansion. **Config repair here = detect → classify → prepare the operator route; it does NOT mean creating assignments or suitability rows.**

## Allowed actions

- Read-only DB probes (`select_template`, `analyze_asset_gap`, `derive_asset_appetite`, `resolve_slot_assets`, inventory tables, catalog) via `execute_sql` (R1) / `db-read.py` (R0) to design and validate.
- Author in an **isolated worktree** (ef-builder): the additive/dark DDL; the new read-only inventory-probe helper; the upgraded `analyze_asset_gap` + `run_asset_gap_analysis` bodies; hermetic fixture tests.
- Run hermetic tests + read-only re-probes to prove the fixture matrix **before** any apply; prepare exact apply + rollback; route through the full T2/T3 chain (db-rls-auditor + external review pinned to hash + branch-warden).

## Forbidden actions

- **No migration apply, DML/DDL against production, deploy, or merge** without an explicit PK gate. DDL apply, function apply, and backfill are **T3 hard stops**.
- No sourcing/download/provider call; no drain dispatcher; no claim-state; no assignment/suitability/candidate mutation; no promotion; no browser automation.
- No change to any legacy output key, vocabulary, or the writer's fail-closed validation semantics that could reject a row that validates today.
- **Active hold-states (from `docs/00_sync_state.md`):** NDIS production video enablement stays OFF (`c.client_creative_governance` untouched); the diverged local `invegent-dashboard` `main` + orphaned `AddTemplateDraftWizard.tsx` commits are a separate PK item — untouched; no logo/video/generative sourcing.
- Do not mark anything proven/approved/resolved as a side effect of classification.

## Success criteria

1. **Orthogonal contract (D1):** `failure_state` carries **no subject**; route + automation are pure functions of the **pair** `(subject_kind, failure_state)`, single-source-derived (cannot drift).
2. **Diagnostic matrix (D2):** every reject/`fail_reason`/derive/inventory outcome maps to exactly one `(subject_kind, failure_state)` → route/automation, with least-blocked-layer diagnosis **and** deterministic tie handling (divergent deepest candidates → `unresolved/manual_triage` unless a justified conservative rule applies).
3. **Genuine-absence proof (D4/D8):** `governed_sourcing` is emitted **iff** `subject_kind=static_background` ∧ `failure_state=absent` ∧ evidence conclusive ∧ no governed selection exists ∧ **no relevant existing candidate/inventory item exists in any state**. Existing-but-ungoverned static backgrounds route to operator/config/manual. `missing_required_logo` alone never proves logo absence → `unresolved` when inventory can't distinguish.
4. **Precision proven (D6):** carousel ×3 → `config_repair`; PP YouTube → `config_repair` (platform), no sourcing; the 5 static-background governance fixtures classify distinctly (unapproved/unproven/blocked/unassigned-misconfigured/**absent**), and **only `absent` → `governed_sourcing`**; ambiguous/unresolved fixtures never source.
5. **Compatibility (D5):** legacy keys byte-identical; writer accepts exactly today's set; new columns born NULL; **open** rows re-diagnosed from current evidence, **resolved/historical** rows get a precise class only from contemporaneous evidence else NULL/`unresolved`.
6. **Handoff (D8) written;** full T2/T3 chain clean before any apply; apply + backfill only at their PK gates.

## Stop condition

Deliver D1–D8 for Gate-1 review and **stop**. On authorization: build in isolated worktree, prove D6 locally, run the chain, stop again at the T3 apply gate. Report per result template. Any tripped STOP (D7) voids the remainder → fresh PK gate.

---

# Design deliverables

## D1 — Canonical classification & storage model

### D1.1 Five orthogonal axes — `failure_state` is subject-free

| Axis | Question | Vocabulary |
|---|---|---|
| **`subject_kind`** | *What* is remediated? | `static_background`, `logo`, `image`, `video_broll`, `template`, `assignment`, `platform_config`, `appetite`, `none` |
| **`failure_state`** | *Why* (subject-independent) | **`absent` · `unassigned` · `unapproved` · `unproven` · `blocked` · `misconfigured` · `negative` · `unsupported` · `ambiguous` · `unresolved` · `none`** |
| **`remediation_route`** | *Who/what* fixes it | `governed_sourcing` · `operator_approval` · `config_repair` · `operator_template_build` · `manual_triage` · `capability_backlog` |
| **`automation_class`** | *May automation act?* | `governed_auto_sourcing` (drain-eligible) · `operator_manual` · `no_automation` · `backlog` |
| candidate-governance posture | posture a produced candidate must take | `fenced_until_approved` (default) · `not_applicable` — **not a ticket column** (candidate/package data) |

**Orthogonality guarantee:** `subject_kind` and `failure_state` are *diagnosed* independently. `remediation_route` and `automation_class` are **pure functions of the pair** `(subject_kind, failure_state)` (D2 map) — never independently written, so they cannot contradict the diagnosis. The same `failure_state` routes differently per subject (e.g. `misconfigured`: `platform_config` → `config_repair`, `template` → `operator_template_build`), which is exactly why routing keys on the pair.

### D1.2 Storage decision (Option R, revised per Gate-1 #6)

**Canonical on `m.asset_gap_suggestion` (additive, dark):** `subject_kind`, `failure_state`, `classifier_version`, `diagnostic_evidence jsonb`, `diagnosed_at timestamptz`, `evidence_confidence text` (`conclusive|insufficient`).
- **Route + automation are DERIVED from the pair** via two IMMUTABLE functions `public.asset_gap_route(subject_kind, failure_state)` and `public.asset_gap_automation(subject_kind, failure_state)` — single derivation source ⇒ cannot drift.
- **Index the canonical pair** `(subject_kind, failure_state)`. **No functional route index this lane** (removed per #6).
- **Candidate-level governance state stays candidate/package data.** The ticket keeps only its existing aggregate lifecycle (`status` + `candidates_ref`); no `candidate_governance_posture` column is added. Add a named aggregate ticket state later only under its own gate.

> **Open decision D1-a (PK / db-rls-auditor):** ratify Option R (derive via pair functions + pair index). Generated-column and CHECK variants are recorded as alternatives; no sourcing behaviour depends on the choice.

## D2 — Reject-code → `(subject_kind, failure_state)` diagnostic matrix

**Least-blocked-candidate rule.** On `fail_closed / no_selectable_template`, find the **deepest layer** any candidate reached (furthest wins):
`f. assets_fail_closed > e. not_visually_proven > d. assignment_{blocked|unapproved|absent} > c. platform_unsuitable > b. status_below_smoke > a. wrong_scope`.

**Tie determinism (Gate-1 #4).** Collect **all** candidates at that deepest layer. If they yield the **same** `(subject_kind, failure_state)` → use it (`evidence_confidence=conclusive`). If they yield **materially different** diagnoses → do **not** take array[0]: set `(none/appetite, ambiguous)` or `(…, unresolved)` → `manual_triage`, `evidence_confidence=insufficient`, and record **every** competing diagnosis in `diagnostic_evidence`. A conservative precedence rule may override **only** if explicitly justified — and **sourcing is never reachable through a tie**: any divergence that includes a non-sourcing diagnosis blocks sourcing.

| Binding evidence | `subject_kind` | `failure_state` | `remediation_route` | `automation_class` |
|---|---|---|---|---|
| `fail_reason=client_not_found` | `none` | `unresolved` | `manual_triage` | `no_automation` |
| `fail_reason=format_unmapped` **(no registry proof — default)** | `template` | `unsupported` | `capability_backlog` | `backlog` |
| `format_unmapped` **and** authoritative registry proves format supported | `template` | `absent` | `operator_template_build` | `operator_manual` |
| deepest = `wrong_scope` | `template` | `misconfigured` | `operator_template_build` | `operator_manual` |
| deepest = `status_below_smoke` | `template` | `unproven` | `operator_template_build` | `operator_manual` |
| deepest = `platform_unsuitable`/`no_suitability_row_for_platform` | `platform_config` | `misconfigured` | `config_repair` | `operator_manual` |
| deepest = `platform_unsuitable`/`suitability_status_negative` | `platform_config` | `negative` | `manual_triage` | `no_automation` |
| deepest = `no_assignment` | `assignment` | `unassigned` | **`config_repair`** | `operator_manual` |
| deepest = `assignment_not_approved` | `assignment` | `unapproved` | `operator_approval` | `operator_manual` |
| deepest = `not_visually_proven` | `assignment` | `unproven` | `operator_approval` | `operator_manual` |
| deepest = `assignment_blocked` | `assignment` | `blocked` | `manual_triage` | `no_automation` |
| **asset layer, `static_background`** — see D2.1 inventory proof | `static_background` | `absent` \| `unapproved` \| `unproven` \| `blocked` \| `unassigned` \| `misconfigured` \| `unresolved` | per pair (below) | per pair |
| `assets_fail_closed:missing_required_logo` — see D2.1 | `logo` | `absent` \| `unapproved` \| `unproven` \| `unresolved` | `operator_approval` (`unresolved`→`manual_triage`) | `operator_manual` / `no_automation` |
| asset layer, `image`/`video_broll` (out-of-scope subjects) | `image`/`video_broll` | `absent`→`capability_backlog`; ungoverned→`operator_approval`/`manual_triage` | — | `backlog`/`operator_manual`/`no_automation` |
| `derive=ambiguous` **and no higher failure**, or divergent tie | `appetite` | `ambiguous` | `manual_triage` | `no_automation` |
| `derive=fail_closed` | `appetite` | `unresolved` | `manual_triage` | `no_automation` |
| unmapped / insufficient | `none` | `unresolved` | `manual_triage` | `no_automation` |

**Static-background pair routes (D2.1 output):** `(static_background, absent)` → **`governed_sourcing` / `governed_auto_sourcing`** (the ONLY sourcing pair); `unapproved`/`unproven` → `operator_approval`; `unassigned`/`misconfigured` → `config_repair`; `blocked` → `manual_triage`; `unresolved` → `manual_triage`. None but `absent` is drain-eligible.

### D2.1 Genuine static-background / logo absence proof (Gate-1 #2, #3, #8)

`resolve_slot_assets=no_governed_background` proves only that **no governed-selectable** asset exists — **not** absence. Before any `absent` verdict, a read-only inventory probe `public.probe_asset_inventory(p_client_slug, p_vertical_key, p_slot_kind)` (STABLE/SECDEF/`search_path=''`/service-role-only) enumerates **every relevant item in every state**:
- `c.client_brand_asset` where `client_id=client` ∧ `asset_type=<slot type>` — **all** `is_active`/`asset_meta`-fence states.
- `c.shared_creative_asset` where `asset_kind=<slot type>` ∧ relevant to the client (`governance_scope`/`vertical_key` match, `client ∈ allowed_clients` or empty, `client ∉ excluded_clients`) — **all** `is_active`/`approval_status`/`production_use_allowed`/`purpose_bound` states.

Returns `{ n_relevant_total, n_governed_selectable, n_existing_ungoverned, ungoverned_breakdown, relevance_conclusive }`. Classifier decision for `static_background` when `resolve=no_governed_background`:

| Probe outcome | `failure_state` | `evidence_confidence` | route |
|---|---|---|---|
| `relevance_conclusive=false` (scope/vertical match ambiguous) | `unresolved` | insufficient | `manual_triage` |
| `n_relevant_total = 0` (nothing exists in any state) | **`absent`** | conclusive | **`governed_sourcing`** |
| exists, all inactive / intake_candidate / approval pending | `unapproved` | conclusive | `operator_approval` |
| exists, approved+active but no visual proof | `unproven` | conclusive | `operator_approval` |
| exists, `purpose_bound`/held/deprecated | `blocked` | conclusive | `manual_triage` |
| exists, governed elsewhere but not scoped/assigned to this client | `misconfigured`/`unassigned` | conclusive | `config_repair` |
| ungoverned states mixed/indistinguishable | `unresolved` | insufficient | `manual_triage` |

**`missing_required_logo`** uses the same probe on `logo`; where inventory cannot distinguish absent from ungoverned → `unresolved`. Logo never reaches `governed_sourcing` regardless (sourcing forbidden for logos).

## D3 — Additive migration plan (⛔ NOT APPLIED; T3 apply gate)

Identity minted at apply (> latest `20260720200000`): `cc0046_asset_gap_orthogonal_classification_v1`. Additive/dark; RLS/grants inherit table posture.

```sql
-- ⛔ DESIGN — NOT APPLIED. T3 PK apply gate. Additive + dark; zero legacy-column change.
begin;

-- 1) Canonical diagnosed columns (born NULL = dark) --------------------------------
alter table m.asset_gap_suggestion
  add column subject_kind        text
    check (subject_kind is null or subject_kind in
      ('static_background','logo','image','video_broll','template','assignment','platform_config','appetite','none')),
  add column failure_state       text
    check (failure_state is null or failure_state in
      ('absent','unassigned','unapproved','unproven','blocked','misconfigured','negative',
       'unsupported','ambiguous','unresolved','none')),
  add column classifier_version  text,
  add column diagnostic_evidence jsonb,
  add column diagnosed_at        timestamptz,
  add column evidence_confidence text
    check (evidence_confidence is null or evidence_confidence in ('conclusive','insufficient'));

-- 2) Non-drifting derivation from the PAIR (single source) -------------------------
create or replace function public.asset_gap_route(p_subject text, p_state text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_subject is null or p_state is null then null
    when p_state = 'none' then null
    when p_subject = 'static_background' and p_state = 'absent'                       then 'governed_sourcing'
    when p_subject = 'static_background' and p_state in ('unapproved','unproven')     then 'operator_approval'
    when p_subject = 'static_background' and p_state in ('unassigned','misconfigured') then 'config_repair'
    when p_subject = 'static_background'                                              then 'manual_triage'
    when p_subject = 'logo' and p_state in ('absent','unapproved','unproven')         then 'operator_approval'
    when p_subject = 'logo'                                                           then 'manual_triage'
    when p_subject in ('image','video_broll') and p_state = 'absent'                  then 'capability_backlog'
    when p_subject in ('image','video_broll') and p_state in ('unapproved','unproven') then 'operator_approval'
    when p_subject in ('image','video_broll')                                        then 'manual_triage'
    when p_subject = 'template' and p_state = 'unsupported'                           then 'capability_backlog'
    when p_subject = 'template' and p_state in ('absent','misconfigured','unproven')  then 'operator_template_build'
    when p_subject = 'assignment' and p_state = 'unassigned'                          then 'config_repair'
    when p_subject = 'assignment' and p_state in ('unapproved','unproven')            then 'operator_approval'
    when p_subject = 'assignment' and p_state = 'blocked'                             then 'manual_triage'
    when p_subject = 'platform_config' and p_state = 'misconfigured'                  then 'config_repair'
    when p_subject = 'platform_config'                                                then 'manual_triage'  -- incl. negative
    else 'manual_triage'  -- appetite/none/unresolved/ambiguous
  end;
$$;

create or replace function public.asset_gap_automation(p_subject text, p_state text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_subject is null or p_state is null then null
    when public.asset_gap_route(p_subject, p_state) is null                     then null
    when p_subject = 'static_background' and p_state = 'absent'                 then 'governed_auto_sourcing'
    when public.asset_gap_route(p_subject, p_state) = 'capability_backlog'      then 'backlog'
    when public.asset_gap_route(p_subject, p_state) = 'manual_triage'           then 'no_automation'
    else 'operator_manual'
  end;
$$;

-- 3) Index the canonical PAIR (no functional route index) -------------------------
create index asset_gap_suggestion_diag_pair_idx
  on m.asset_gap_suggestion (subject_kind, failure_state);

revoke all on function public.asset_gap_route(text,text)      from public, anon, authenticated;
revoke all on function public.asset_gap_automation(text,text) from public, anon, authenticated;
grant execute on function public.asset_gap_route(text,text)      to service_role;
grant execute on function public.asset_gap_automation(text,text) to service_role;

commit;
-- ROLLBACK (reference): drop index asset_gap_suggestion_diag_pair_idx;
--   drop function public.asset_gap_route(text,text); drop function public.asset_gap_automation(text,text);
--   alter table m.asset_gap_suggestion drop column evidence_confidence, drop column diagnosed_at,
--     drop column diagnostic_evidence, drop column classifier_version, drop column failure_state, drop column subject_kind;
```

The new read-only helper `public.probe_asset_inventory(...)` (D2.1) is a separate object in the same migration (SECDEF/STABLE/service-role-only; db-rls-auditor reviews its grants). A secret-free `ice_ro` read view over the pair is proposed as R0 coverage (its own small T2/T3 add) — named so the coverage gap is closed properly, not via widened `execute_sql`.

## D4 — Analyzer / function change plan

**`analyze_asset_gap` (CREATE OR REPLACE; STABLE/SECDEF/`search_path=''`):**
1. Keep the body and **every legacy key byte-identical** (`primary_route`, `asset_gap_detected`, `asset_gap_drainability`, `why_needed`, `slot_kind`, appetite/signature/scope keys). No legacy semantics change; `asset_gap_detected` and the auto-close oracle unchanged.
2. Add a **diagnosis block**: iterate the full `rejected[]`, compute the deepest layer, collect **all** deepest candidates, apply the tie rule (D2), fold in `fail_reason`, `derive` status (ambiguity only when no higher failure), and — for `static_background`/`logo` asset-layer cases — call `probe_asset_inventory` (D2.1) to separate genuine `absent` from ungoverned. Emit additive keys: `subject_kind`, `failure_state`, `remediation_route = asset_gap_route(subject_kind, failure_state)`, `automation_class = asset_gap_automation(...)`, `evidence_confidence`, `candidate_governance_posture` (`fenced_until_approved` iff route=`governed_sourcing`, else `not_applicable`), and `diagnostic_evidence` = { deepest_layer, all competing diagnoses, observed reject codes, inventory-probe summary, ambiguity flag, **per-component diagnostics for multi-part/carousel** }.
3. **Multi-part (carousel):** diagnose each component; record all in `diagnostic_evidence`; **never force a single sourcing route** when components differ — divergence → `ambiguous`/`unresolved` → `manual_triage`.
4. Preserve `unresolved` for any unmapped/mixed/insufficient evidence; never guess a sourcing route.

**`run_asset_gap_analysis` (writer; CREATE OR REPLACE):**
1. Persist the new columns (`subject_kind`, `failure_state`, `classifier_version`, `diagnostic_evidence`, `diagnosed_at`, `evidence_confidence`) on INSERT/UPDATE; route/automation are derived, not written.
2. **Do not tighten** fail-closed validation on new keys in any way that could reject a today-valid row; legacy validation unchanged.
3. No detect/drain/close-pass semantic change; drain *entry* precision is a read-side contract for the future lane (D8).

Built in an **isolated worktree**; local + hermetic proof before any apply.

## D5 — Compatibility & backfill strategy

- **Legacy unchanged (hermetic diff):** for all 8 live rows + fixtures, assert pre/post analyzer legacy keys **identical**, and the writer's `inserted/updated/rejected` counters identical on a dry-run over the same inputs. Any delta = STOP.
- **No live reader breaks:** grounded — only the writer consumes the keys.
- **Backfill (data-only UPDATE, T3, evidence-gated — corrected per #7):**
  - **Open rows** — re-diagnose from **current** evidence (re-probe + inventory probe); set `subject_kind`/`failure_state`/`diagnosed_at`/`evidence_confidence` where the diagnosis is conclusive, else `failure_state=unresolved` / leave NULL.
  - **Resolved / historical rows** — a current re-probe is **not** their historical diagnosis. Assign a precise class **only** from contemporaneous evidence (e.g. `diagnostic_evidence`/observations captured at the time); otherwise leave the new fields **NULL** (or `unresolved`). No retroactive precise classification from today's state.
  - Backfill writes **no** route/automation (derived) and triggers **no** sourcing. Expected on current data: 3 carousel (open) → `(assignment, unassigned)`; PP YouTube (open) → `(platform_config, misconfigured)`; resolved rows → NULL unless contemporaneous evidence exists.
- **Rollout order (each its own T3 gate; rollback proven first):** DDL + helper apply → function apply → backfill. Migration name = permanent identity.

## D6 — Named fixture & test matrix

| # | Fixture | Kind | Expected `(subject_kind, failure_state)` | route | `governed_sourcing`? |
|---|---|---|---|---|---|
| F1–F3 | carousel CFW/fb `0532d311`, CFW/li `3b7b0d36`, INV/li `273626e5` | live | `(assignment, unassigned)` | `config_repair` | **no** |
| F4 | PP/youtube `video_short_stat` `22d3df93` | live | `(platform_config, misconfigured)` | `config_repair` | **no** (video subject) |
| F5 | happy INV/fb image_quote `cf02a8e4` | live | `(none, none)` | — | **no** |
| **G1** | static-bg exists but **unapproved** (intake_candidate / inactive) | controlled | `(static_background, unapproved)` | `operator_approval` | **no** |
| **G2** | static-bg exists, approved+active, **not visually proven** | controlled | `(static_background, unproven)` | `operator_approval` | **no** |
| **G3** | static-bg exists but **blocked/held** (`purpose_bound`/deprecated) | controlled | `(static_background, blocked)` | `manual_triage` | **no** |
| **G4** | static-bg exists but **unassigned/misconfigured** for this client (scope/allow-list) | controlled | `(static_background, misconfigured)` | `config_repair` | **no** |
| **G5** | **genuinely absent** — zero relevant static-bg rows in either table, any state; `resolve=no_governed_background`; probe conclusive | controlled | `(static_background, absent)` | **`governed_sourcing`** | **YES (only)** |
| L1 | `missing_required_logo`, inventory cannot distinguish absent vs ungoverned | controlled | `(logo, unresolved)` | `manual_triage` | **no** |
| A1 | appetite ambiguous, template selectable, no higher failure | controlled | `(appetite, ambiguous)` | `manual_triage` | **no** |
| T1 | divergent deepest candidates (materially different diagnoses) | controlled | `(none, unresolved)` `evidence_confidence=insufficient` | `manual_triage` | **no** |
| U1 | unmapped/mixed reject set | controlled | `(none, unresolved)` | `manual_triage` | **no** |

G1–G5 must be built **read-only** (hermetic fixture / `ROLLBACK` transaction — never a live INSERT). **Invariant test:** across the whole matrix, `governed_sourcing` appears **iff** the D8 conjunction holds; **zero** false `governed_sourcing`; G5 is the only YES.

## D7 — STOP conditions

Any voids the remainder → fresh PK gate:
- A legacy output key changes value for any row/fixture.
- Any fixture other than G5 produces `governed_sourcing`, or G5 fails to.
- `governed_sourcing` reached without the full D8 conjunction (esp. `evidence_confidence=conclusive` + probe `n_relevant_total=0`), or reached through a tie.
- Route/automation observed to disagree with `(subject_kind, failure_state)` (derivation drift).
- Writer begins rejecting a today-valid row, or dry-run counters diverge from baseline.
- Backfill would assign a precise class on insufficient/non-contemporaneous evidence.
- Any hard-boundary action attempted (sourcing, drain, claim-state, assignment/suitability mutation, promotion, deploy, browser).
- External review non-clean; `reviewed_input_hash` ≠ current hash; unexpected origin movement / files; rollback path invalidated.
- Apply attempted without its explicit T3 PK gate.

## D8 — Handoff contract for the backgrounds-only drain lane (later, separate)

The future drain **must not** re-derive routing. Its **hard entry condition** — the expanded sole-sourcing invariant (Gate-1 #8), all required:

```
status = 'open'
AND asset_gap_detected = true
AND subject_kind  = 'static_background'
AND failure_state = 'absent'
AND evidence_confidence = 'conclusive'
AND asset_gap_route(subject_kind, failure_state)      = 'governed_sourcing'
AND asset_gap_automation(subject_kind, failure_state) = 'governed_auto_sourcing'
-- guaranteed by the classifier before 'absent' is written (re-assert at drain time):
--   • no governed selection exists (resolve_slot_assets = no_governed_background)
--   • no relevant existing candidate/inventory item exists in ANY state (probe n_relevant_total = 0)
```

Rows failing any clause are **out of scope for sourcing** — routed to operator/config/manual/backlog elsewhere, never sourced. The drain additionally, non-negotiably, applies every downstream gate this classifier does not replace: Image-workflow §2 non-negotiables (fenced-until-approved; PK visual verdict is the only deciding act; sha256+licence; pool-neutrality; full T3 + live proof + rollback-proven), and the NDIS staged real-imagery policy (Phase-1 person-free only; Phase 2/3 held) for NDIS-vertical rows. `governed_sourcing` is *eligibility in principle*, not licence to source people/cultural imagery. Subject gating keeps `logo`/`image`/`video_broll` out of sourcing entirely.

---

## Notes / open decisions for PK (Gate-1 rev-2)

- **D1-a** — ratify Option R (pair-derived route/automation + pair index; no functional route index). *Recommend R.*
- **D2-a** — `format_unmapped` default is now `(template, unsupported)` → `capability_backlog` (per #5); `operator_template_build` only with authoritative registry proof that the format is supported. A known-formats registry is a follow-up lane. *Confirm.*
- **D2-b (new)** — `platform_config` `negative` (explicit `not_suitable`/`blocked` suitability) routes to `manual_triage` (conservative — overriding a deliberate negative is a human call); `misconfigured` (no suitability row, e.g. PP YouTube) → `config_repair`. *Confirm the split.*
- **Tiering** — additive/dark DDL + helper + isolated functions = T2; DDL apply, function apply, backfill UPDATE are each T3. External review pinned to the final migration+function hash before any apply.
- cc-0046 is the next free number. Brief is **uncommitted-to-main / feature-branch only**, pending Gate-1. Nothing is applied by drafting this.
