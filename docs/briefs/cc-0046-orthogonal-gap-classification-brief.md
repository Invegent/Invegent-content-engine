# Brief cc-0046 — Orthogonal Gap Classification & Routing Precision (precursor lane)

**Created:** 2026-07-21 Sydney · **rev-3** (final Gate-1 revisions folded in: full inventory-probe universe; candidate-store completeness proof; template-remediation corrections; deterministic tie contract; mechanical sole-sourcing CHECK; drain-time freshness + atomic claim; fixed-identity 3-artifact migration packaging). rev-2 accepted: Option R · `format_unmapped=unsupported` default · platform-`negative` split.
**Author:** chat (orchestrator) · **Executor:** Claude Code (ef-builder) + PK gates
**Status:** **CLOSED — production applied, proven, and reconciled to origin/main.** Final main commit: `a7413357151d3e5a4fa2556c614fd4f24a502c06`. (Classifier/routing substrate LIVE; three migration identities applied `20260721100000`/`20260721110000`/`20260721120000`; result: `docs/briefs/results/cc-0046-orthogonal-gap-classification.md`. Backgrounds-only static-image drain NOT opened — requires a new brief + separate PK Gate-1.)
**Result file:** `docs/briefs/results/cc-0046-orthogonal-gap-classification.md` (created on completion)
**Lane class / tier:** SIDE_PROVING → **T2** for the additive/dark DB + isolated-function change; the three apply artifacts (DDL+helpers · function replacement · backfill) are **three separate T3 PK gates**.

> **Standing constraint (PK):** the *Gap Taxonomy & Drain Routing Decision Packet v1* is accepted direction. **This lane lands and proves the classifier/routing substrate ONLY — it does not begin the backgrounds-only sourcing drain.** No gap may trigger an outward-facing sourcing action until this precursor is proven and a *separate* drain lane is gated. No build, apply, backfill, or sourcing is authorized by this brief.

---

## Task

Upgrade ICE's asset-gap classifier so it distinguishes — orthogonally — *what* a demand is about (`subject_kind`) from *why* it cannot be filled (`failure_state`), deriving remediation route + automation posture from the **pair**. Today `analyze_asset_gap` collapses the full `select_template` reject set into one coarse route by first-match priority, mislabelling real cases (proven live). The classifier must **prove genuine static-background absence against the complete defined inventory universe** — including relevant *near-match* items that exist but fail a configurable fence — before it may emit a sourcing verdict, and must declare coverage **inconclusive** (→ `unresolved`, never source) whenever any authoritative candidate store cannot be checked. This lane finalizes the orthogonal contract, decides storage, upgrades precision (deterministic tie handling; component-level multi-part diagnostics; mechanical protection of the sole-sourcing pair), adds routing output additive/dark, preserves legacy compatibility, and proves the result against named fixtures — so a later, separate lane drives a backgrounds-only drain on a **hard, freshly-revalidated, non-fabricable `governed_sourcing` entry condition**.

## Source context

**Producer / classifier (changed here):**
- `supabase/migrations/20260720160000_analyze_asset_gap_v1_1_permitted_text_cast.sql` — live `analyze_asset_gap`; first-match collapse = lines **95–110**. STABLE/SECDEF/`search_path=''`/service-role-only.
- `supabase/migrations/20260703035154_create_select_template_v1.sql` — `select_template`; authoritative reject vocabulary (§4; lines 191–280).
- `derive_asset_appetite` (`ok|ambiguous|fail_closed`) · `resolve_slot_assets` (`no_governed_background | missing_required_logo | …`).

**Inventory universe (genuine-absence proof — schema-grounded 2026-07-21):**
- `c.client_brand_asset` — client-specific assets; fences `is_active` (col) + `asset_meta` jsonb keys (`approved`/`approval_status`/`production_use_allowed`); typed `asset_type`; `platform_scope`.
- `c.shared_creative_asset` — shared/generic; fences `is_active`/`approval_status`/`production_use_allowed`/`purpose_bound`; relevance `governance_scope`/`vertical_key`/`allowed_clients`/`excluded_clients`; typed `asset_kind`.
- **Exhaustiveness evidence:** a `create table … (asset|candidate|intake|staging|harvest|brand|creative)` sweep of `supabase/migrations/**` returns only these two image-asset stores (plus the *template* registry tables and `c.music_*`, which are not image inventory). Every `_harness/**/*_intake_apply.sql` promotes candidates by **INSERTing fenced rows into these two tables** — so DB-intaken candidates are visible here in their fenced state. **Pre-intake filesystem harvest packages** (`_harness/image_harvester_v0/**`) are *not* DB-visible — see D2.2.

**Consumer / storage (extended additively):**
- `docs/briefs/cc-0041-asset-gap-analysis-ddl-packet-v1.sql` — applied shape of `m.asset_gap_suggestion` (live 36-col set confirmed).
- `supabase/migrations/20260720190000_cc0044_b2_run_asset_gap_analysis_shared_attribution_fix_v1.sql` — live `run_asset_gap_analysis` **writer**; its fail-closed validation (lines 92–107) is the **only** live consumer of the analyzer's classification keys.

**Compatibility (grounded):** `gap_type` does not exist in CE (0 hits). No reader of `asset_gap_suggestion`/`primary_route`/`drainability` in CE or `invegent-dashboard` (0 hits). Live legacy fields = `primary_route`, `asset_gap_detected`, `asset_gap_drainability`, `why_needed`, `slot_kind`.

**Governance:** `CLAUDE.md` → Image-workflow §2 non-negotiables + NDIS staged real-imagery policy. `governed_sourcing` is necessary, not sufficient.

### Live fixture evidence (read-only, `mbkmaxqhsohbtwsqolns`, 2026-07-21)

| Fixture (live) | `select_template` truth | Current output | **Correct `(subject_kind, failure_state)` → route** |
|---|---|---|---|
| carousel ×3 (CFW/fb `0532d311`, CFW/li `3b7b0d36`, INV/li `273626e5`) | `fail_closed`; all deepest = `no_assignment` | `governance_gap` / detected=false / ambiguous=true | `(assignment, unassigned)` → **`config_repair`** |
| PP YouTube `22d3df93` (`video_short_stat`) | `fail_closed`; deepest = `platform_unsuitable` | `template_gap` / detected=true / why=`no_governed_background` | `(platform_config, misconfigured)` → **`config_repair`**; never sources (video) |
| INV image_quote/fb `cf02a8e4` (happy) | `ok`; rejects are non-winner noise | route=`none` ✓ | `(none, none)` → no gap |
| true static-bg absence | *(controlled — D6/G5)* | — | `(static_background, absent)` → **`governed_sourcing`** — only after the complete-inventory proof |

## Scope

**In scope:** finalize the orthogonal `(subject_kind, failure_state)` contract; storage (D1); precision upgrade (D4) incl. the complete inventory universe + candidate-store completeness (D2.1/D2.2), deterministic ties (D2.3), multi-part component diagnostics, mechanical sole-sourcing protection (D3), drain-time freshness handoff (D8); additive/dark routing output; proof against named live + controlled fixtures (D6); legacy compatibility (D5).

**Out of scope (hard boundaries — PK):** no image search/download/provider call; no drain dispatcher; no claim-state execution; no automatic assignment or suitability mutation; no candidate promotion; no browser automation; no production deploy; no video/logo/generative/NDIS-sensitive expansion. **Config repair = detect → classify → prepare the operator route; never create assignments or suitability rows.**

## Allowed actions

- Read-only DB probes to design/validate. Author in an **isolated worktree**: the three apply artifacts (D3), the read-only `probe_asset_inventory` helper, the upgraded `analyze_asset_gap` + `run_asset_gap_analysis`, and hermetic fixture tests. Run hermetic tests + read-only re-probes before any apply; route through the full T2/T3 chain (db-rls-auditor + external review pinned to each artifact hash + branch-warden).

## Forbidden actions

- **No migration apply, DML/DDL against production, deploy, or merge** without an explicit PK gate. Each of the three artifacts is a **T3 hard stop**.
- No sourcing/download/provider call; no drain; no claim-state; no assignment/suitability/candidate mutation; no promotion; no browser automation.
- No change to any legacy output key, vocabulary, or writer validation semantics that could reject a today-valid row.
- **Active hold-states (`docs/00_sync_state.md`):** NDIS production video enablement OFF (`c.client_creative_governance` untouched); the diverged local `invegent-dashboard` `main` + orphaned `AddTemplateDraftWizard.tsx` commits are a separate PK item — untouched; no logo/video/generative sourcing.
- Do not mark anything proven/approved/resolved as a side effect.

## Success criteria

1. **Orthogonal contract (D1):** `failure_state` carries no subject; route + automation are pure functions of the pair, single-source-derived.
2. **Complete-inventory absence proof (D2.1/D2.2):** `governed_sourcing` iff `subject_kind=static_background` ∧ `failure_state=absent` ∧ `evidence_confidence=conclusive` ∧ **proven resolver/probe vertical alignment (`vertical_basis_conclusive=true`)** ∧ no governed selection ∧ `n_inventory_total=0` over the complete defined universe ∧ `coverage_conclusive=true`. (Concern-1 fix, PK 2026-07-21: probe + resolver both consume the single authoritative `public.derive_template_vertical(candidate_template_id)` — no divergent derivation; platform_scope is a configurable near-match on both origins.) Any uncheckable authoritative store → `coverage_conclusive=false` → `unresolved`. Existing near-match/ungoverned items are **diagnosed, not filtered out**.
3. **Deterministic ties (D2.3):** materially divergent deepest diagnoses **always** → `(none, unresolved)`, `insufficient`, `manual_triage`. No optional outcomes.
4. **Template remediation corrected (D2):** `(template,absent)`→`operator_template_build`; `(template,unproven)`→`operator_approval`; `(template,misconfigured)`→`config_repair` when safely diagnosable else `manual_triage`; `status_below_smoke` never routes to template build; `wrong_scope` never assumes a new template unless config/reuse provably cannot resolve.
5. **Mechanical protection (D3/#5):** a DB CHECK forbids persisting `(static_background, absent)` unless `evidence_confidence='conclusive'`.
6. **Fixtures (D6):** carousel→`config_repair`; PP YouTube→`config_repair`; the 5 static-bg governance fixtures classify distinctly, only **absent → `governed_sourcing`**; coverage-inconclusive → `unresolved`; ties/ambiguity never source.
7. **Compatibility (D5):** legacy keys byte-identical; writer accepts exactly today's set; open rows re-diagnosed from current evidence; resolved/historical rows precise only from contemporaneous evidence, else NULL/`unresolved`.
8. **Packaging (D3/#7):** three fixed-identity, separately reviewable + rollbackable artifacts; reviewed hash == applied artifact (no apply-time mint). Handoff (D8) with drain-time freshness + atomic claim written. Full chain clean before any apply.

## Stop condition

Deliver D1–D8 for Gate-1 review and **stop**. On authorization: build in isolated worktree, prove D6 locally, run the chain per artifact, stop at each T3 apply gate. Report per result template. Any tripped STOP (D7) voids the remainder → fresh PK gate.

---

# Design deliverables

## D1 — Canonical classification & storage model

### D1.1 Five orthogonal axes — `failure_state` is subject-free

| Axis | Vocabulary |
|---|---|
| **`subject_kind`** | `static_background`, `logo`, `image`, `video_broll`, `template`, `assignment`, `platform_config`, `appetite`, `none` |
| **`failure_state`** (subject-free) | `absent` · `unassigned` · `unapproved` · `unproven` · `blocked` · `misconfigured` · `negative` · `unsupported` · `ambiguous` · `unresolved` · `none` |
| **`remediation_route`** | `governed_sourcing` · `operator_approval` · `config_repair` · `operator_template_build` · `manual_triage` · `capability_backlog` |
| **`automation_class`** | `governed_auto_sourcing` (drain-eligible) · `operator_manual` · `no_automation` · `backlog` |
| candidate-governance posture | `fenced_until_approved` / `not_applicable` — **not a ticket column** (candidate/package data) |

Route + automation are pure functions of the **pair** `(subject_kind, failure_state)` (D2), never independently written → cannot contradict the diagnosis.

### D1.2 Storage (Option R — accepted rev-2, finalized)

Canonical additive/dark columns: `subject_kind`, `failure_state`, `classifier_version`, `diagnostic_evidence jsonb`, `diagnosed_at timestamptz`, `evidence_confidence text` (`conclusive|insufficient`). Route/automation derived via `public.asset_gap_route(subject, state)` / `public.asset_gap_automation(subject, state)` (immutable, single source). Index the pair `(subject_kind, failure_state)`; no functional route index. Plus the mechanical sole-sourcing CHECK (#5, D3). Candidate-level governance stays candidate/package data.

## D2 — Reject → `(subject_kind, failure_state)` diagnostic matrix

**Least-blocked-candidate rule.** On `fail_closed / no_selectable_template`, find the deepest layer any candidate reached: `f. assets_fail_closed > e. not_visually_proven > d. assignment_{blocked|unapproved|absent} > c. platform_unsuitable > b. status_below_smoke > a. wrong_scope`.

| Binding evidence | `subject_kind` | `failure_state` | route | automation |
|---|---|---|---|---|
| `fail_reason=client_not_found` | `none` | `unresolved` | `manual_triage` | `no_automation` |
| `format_unmapped` (no registry proof — default) | `template` | `unsupported` | `capability_backlog` | `backlog` |
| `format_unmapped` + authoritative registry proves supported | `template` | `absent` | `operator_template_build` | `operator_manual` |
| deepest = `wrong_scope`, config/reuse **can** resolve (safely diagnosable) | `template` | `misconfigured` | `config_repair` | `operator_manual` |
| deepest = `wrong_scope`, config/reuse **cannot** resolve (not safely diagnosable) | `none` | `unresolved` | `manual_triage` | `no_automation` |
| deepest = `status_below_smoke` | `template` | `unproven` | `operator_approval` | `operator_manual` |
| deepest = `platform_unsuitable`/`no_suitability_row_for_platform` | `platform_config` | `misconfigured` | `config_repair` | `operator_manual` |
| deepest = `platform_unsuitable`/`suitability_status_negative` | `platform_config` | `negative` | `manual_triage` | `no_automation` |
| deepest = `no_assignment` | `assignment` | `unassigned` | **`config_repair`** | `operator_manual` |
| deepest = `assignment_not_approved` | `assignment` | `unapproved` | `operator_approval` | `operator_manual` |
| deepest = `not_visually_proven` | `assignment` | `unproven` | `operator_approval` | `operator_manual` |
| deepest = `assignment_blocked` | `assignment` | `blocked` | `manual_triage` | `no_automation` |
| asset layer `static_background` — **D2.1 complete-inventory proof** | `static_background` | `absent`\|`unapproved`\|`unproven`\|`blocked`\|`unassigned`\|`misconfigured`\|`unresolved` | per pair | per pair |
| `assets_fail_closed:missing_required_logo` — D2.1 (never sourcing) | `logo` | `absent`\|`unapproved`\|`unproven`\|`unresolved` | `operator_approval` (`unresolved`→`manual_triage`) | per pair |
| asset layer `image`/`video_broll` | `image`/`video_broll` | `absent`→`capability_backlog`; ungoverned→`operator_approval`; else `manual_triage` | — | per pair |
| **materially divergent deepest candidates (tie — D2.3)** | `none` | `unresolved` | `manual_triage` | `no_automation` |
| `derive=ambiguous` **and no stronger binding failure** | `appetite` | `ambiguous` | `manual_triage` | `no_automation` |
| `derive=fail_closed` | `appetite` | `unresolved` | `manual_triage` | `no_automation` |
| unmapped / insufficient | `none` | `unresolved` | `manual_triage` | `no_automation` |

**Template corrections (#3):** `status_below_smoke` → `(template, unproven)` → `operator_approval` (**not** template build). `wrong_scope` → `(template, misconfigured)` → `config_repair` **only** when the classifier can safely diagnose that re-scoping/reuse resolves it; otherwise `(none, unresolved)` → `manual_triage` (a new build is a downstream human decision, never assumed). `(template, absent)` (registry-proven only) → `operator_template_build`.

### D2.1 Complete static-background / logo inventory proof (#1)

Read-only helper `public.probe_asset_inventory(p_client_slug, p_vertical_key, p_slot_kind)` (STABLE/SECDEF/`search_path=''`/service-role-only) enumerates the **complete defined universe** and, crucially, **does not filter near-matches out before diagnosing them**. Returns:

- `n_inventory_total` — every item of the slot type in the universe (client rows + relevant shared rows), **before** any configurable fence.
- `n_currently_eligible` — items passing all governance fences (governed + usable now).
- `n_governed_selectable` — subset `resolve_slot_assets` would actually pick (adds platform / text-safety).
- `n_near_match` — items relevant-in-principle that fail a **configurable** fence (no assignment / client-scope / `allowed_clients` allow-list / `excluded_clients` / `platform_scope`).
- `n_existing_ungoverned` — items that fail a **governance** fence (`is_active`/`approved`/`approval_status`/`production_use_allowed`/`purpose_bound`).
- `near_match_breakdown` — per-item jsonb naming the exact failing fence.
- `coverage_conclusive` — true **only** if every declared store (D2.2) was enumerable.

**Decision for `static_background` when `resolve=no_governed_background`:**

| Probe outcome | `failure_state` | `evidence_confidence` | route |
|---|---|---|---|
| `coverage_conclusive=false` | `unresolved` | `insufficient` | `manual_triage` |
| `n_inventory_total = 0` (universe empty, incl. near-matches) | **`absent`** | `conclusive` | **`governed_sourcing`** |
| `n_existing_ungoverned>0`, all inactive / intake_candidate / approval-pending | `unapproved` | `conclusive` | `operator_approval` |
| ungoverned, approved+active, no visual proof | `unproven` | `conclusive` | `operator_approval` |
| ungoverned, `purpose_bound`/held/deprecated | `blocked` | `conclusive` | `manual_triage` |
| `n_near_match>0` — governed elsewhere but fails allow-list / scope / assignment / platform for this client | `misconfigured`/`unassigned` | `conclusive` | `config_repair` |
| mixed / indistinguishable near-match+ungoverned | `unresolved` | `insufficient` | `manual_triage` |

`missing_required_logo` runs the same probe on `logo`; indistinguishable absent-vs-ungoverned → `unresolved`. Logo never reaches `governed_sourcing`.

### D2.2 Candidate-store completeness (#2)

**Authoritative locations an asset candidate may exist, and their checkability:**

| Store | Location | Checkable by the DB probe? |
|---|---|---|
| Governed client assets (incl. fenced intake rows) | `c.client_brand_asset` | **Yes** — all states |
| Governed shared assets (incl. fenced intake rows) | `c.shared_creative_asset` | **Yes** — all states |
| In-flight demand / candidate reference for this signature | `m.asset_gap_suggestion` (`status∈harvesting/candidates_ready`, `candidates_ref`/`harvest_manifest_ref` non-null) | **Yes** |
| Pre-intake filesystem harvest/review packages | `_harness/image_harvester_v0/**` (contact sheets, manifests) | **No — not DB-visible** |

**Exhaustiveness verdict:** `c.client_brand_asset` + `c.shared_creative_asset` are exhaustive for **DB-intaken** inventory (intake writes fenced rows there — grounded above), and the in-flight demand check covers active harvests. **Pre-intake filesystem packages are outside DB visibility.** Therefore `coverage_conclusive=true` is asserted **only** over the DB universe + in-flight-demand check; the residual (a harvested-but-not-yet-intaken package) is handled by two mechanisms: (a) the future drain is the **sole** harvest initiator and is gated on this verdict, so it will not double-source; (b) **drain-time freshness re-validation** (D8). **Rule:** if any declared store cannot be read at classification time (probe error, permission, or a store added later that the helper does not yet cover) → `coverage_conclusive=false` → `unresolved`. **Never source from incomplete coverage.** *(Build-time db-rls-auditor step: confirm via `list_tables` that no image-asset store beyond the two tables exists at build; if one is found, extend the helper before the probe is trusted.)*

### D2.3 Deterministic tie contract (#4)

Collect **all** candidates at the deepest layer. If they yield the **same** `(subject_kind, failure_state)` → use it, `evidence_confidence=conclusive`. If they yield **materially different** diagnoses → **always** emit exactly: `subject_kind=none`, `failure_state=unresolved`, `evidence_confidence=insufficient`, route `manual_triage`; record every competing diagnosis in `diagnostic_evidence`. **No optional/`or` outcomes; no conservative-precedence override.** `(appetite, ambiguous)` is reserved **solely** for a genuine appetite-ambiguity result with no stronger binding failure. Multi-part/carousel: diagnose each component into `diagnostic_evidence`; divergent components are a tie → `(none, unresolved)`.

## D3 — Additive migration plan — three fixed-identity artifacts (⛔ NOT APPLIED; three T3 gates) (#7)

**No apply-time mint.** Names + contents are fixed **now**, before external review, so each reviewed hash exactly equals the applied artifact. Apply is via `execute_sql` at the T3 gate (apply_migration is harness-deny-listed); the ledger row is backfilled with the **same** fixed identity — not a fresh apply-time version. Each artifact has its own rollback file under `_harness/cc0046_*/` and is reviewed/applied/rolled-back independently.

**Artifact 1 — `supabase/migrations/20260721100000_cc0046_asset_gap_orthogonal_classification_ddl_v1.sql`** (columns + CHECK + derivation fns + probe helper + pair index + grants):

```sql
-- ⛔ DESIGN — NOT APPLIED. T3 gate #1. Additive + dark; zero legacy-column change.
begin;

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
    check (evidence_confidence is null or evidence_confidence in ('conclusive','insufficient')),
  -- #5 mechanical protection: the sole-sourcing pair cannot persist without conclusive evidence
  add constraint gap_absent_static_bg_requires_conclusive
    check ( subject_kind  is distinct from 'static_background'
         or failure_state is distinct from 'absent'
         or evidence_confidence is not distinct from 'conclusive' );

create or replace function public.asset_gap_route(p_subject text, p_state text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_subject is null or p_state is null then null
    when p_state = 'none' then null
    when p_subject='static_background' and p_state='absent'                          then 'governed_sourcing'
    when p_subject='static_background' and p_state in ('unapproved','unproven')       then 'operator_approval'
    when p_subject='static_background' and p_state in ('unassigned','misconfigured')  then 'config_repair'
    when p_subject='static_background'                                               then 'manual_triage'
    when p_subject='logo' and p_state in ('absent','unapproved','unproven')           then 'operator_approval'
    when p_subject='logo'                                                            then 'manual_triage'
    when p_subject in ('image','video_broll') and p_state='absent'                    then 'capability_backlog'
    when p_subject in ('image','video_broll') and p_state in ('unapproved','unproven') then 'operator_approval'
    when p_subject in ('image','video_broll')                                        then 'manual_triage'
    when p_subject='template' and p_state='unsupported'                              then 'capability_backlog'
    when p_subject='template' and p_state='absent'                                   then 'operator_template_build'
    when p_subject='template' and p_state='unproven'                                 then 'operator_approval'
    when p_subject='template' and p_state='misconfigured'                            then 'config_repair'
    when p_subject='template'                                                        then 'manual_triage'
    when p_subject='assignment' and p_state='unassigned'                             then 'config_repair'
    when p_subject='assignment' and p_state in ('unapproved','unproven')              then 'operator_approval'
    when p_subject='assignment'                                                      then 'manual_triage'
    when p_subject='platform_config' and p_state='misconfigured'                     then 'config_repair'
    when p_subject='platform_config'                                                 then 'manual_triage'  -- negative
    else 'manual_triage'
  end;
$$;

create or replace function public.asset_gap_automation(p_subject text, p_state text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_subject is null or p_state is null                              then null
    when public.asset_gap_route(p_subject,p_state) is null                 then null
    when p_subject='static_background' and p_state='absent'                then 'governed_auto_sourcing'
    when public.asset_gap_route(p_subject,p_state) = 'capability_backlog'  then 'backlog'
    when public.asset_gap_route(p_subject,p_state) = 'manual_triage'       then 'no_automation'
    else 'operator_manual'
  end;
$$;

-- read-only complete-inventory probe (D2.1/D2.2). Body scans the two asset tables across ALL
-- states (near-matches retained), plus the in-flight-demand check; sets coverage_conclusive.
-- (full body authored in the worktree; db-rls-auditor reviews grants + fence logic)
create or replace function public.probe_asset_inventory(p_client_slug text, p_vertical_key text, p_slot_kind text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$ /* … */ $$;

create index asset_gap_suggestion_diag_pair_idx
  on m.asset_gap_suggestion (subject_kind, failure_state);

revoke all on function public.asset_gap_route(text,text)          from public, anon, authenticated;
revoke all on function public.asset_gap_automation(text,text)     from public, anon, authenticated;
revoke all on function public.probe_asset_inventory(text,text,text) from public, anon, authenticated;
grant execute on function public.asset_gap_route(text,text)          to service_role;
grant execute on function public.asset_gap_automation(text,text)     to service_role;
grant execute on function public.probe_asset_inventory(text,text,text) to service_role;

commit;
-- ROLLBACK (_harness/cc0046_ddl/rollback.sql): drop index …_diag_pair_idx; drop the 3 functions;
--   alter table … drop constraint gap_absent_static_bg_requires_conclusive, drop the 6 columns.
```

**Artifact 2 — `20260721110000_cc0046_analyze_and_writer_orthogonal_v1.sql`** — `CREATE OR REPLACE` of `analyze_asset_gap` (adds the diagnosis block, calls `probe_asset_inventory`, emits additive keys; legacy keys byte-identical) and `run_asset_gap_analysis` (persists the new columns; validation not tightened). Rollback = byte-exact prior bodies (captured live pre-apply, like the cc-0044 precedent).

**Artifact 3 — `20260721120000_cc0046_backfill_open_rows_v1.sql`** — evidence-gated backfill UPDATE (open rows only; D5). Rollback = set the new columns back to NULL for the touched ids.

A secret-free `ice_ro` read view over the pair is proposed as R0 coverage in its own later T2 add (named so the gap is closed properly, not via widened `execute_sql`).

## D4 — Analyzer / function change plan

`analyze_asset_gap`: keep body + **every legacy key byte-identical**; add the diagnosis block (deepest-layer scan → D2.3 tie contract → `fail_reason`/`derive` fold-in → `probe_asset_inventory` for asset-layer → pair emission); emit additive keys `subject_kind`, `failure_state`, `remediation_route`, `automation_class`, `evidence_confidence`, `candidate_governance_posture`, `diagnostic_evidence` (deepest layer · competing diagnoses · reject codes · **full probe summary incl. `coverage_conclusive`** · per-component multi-part diagnostics). **`(static_background, absent)` is emitted only when `coverage_conclusive=true` ∧ `n_inventory_total=0` ∧ `resolve=no_governed_background`**, with `evidence_confidence=conclusive` — otherwise a non-sourcing pair. `run_asset_gap_analysis`: persist new columns; no validation tightening; no detect/close-pass semantic change. Built in an isolated worktree; hermetic proof before apply.

## D5 — Compatibility & backfill

- **Legacy unchanged (hermetic diff):** pre/post analyzer legacy keys identical for all 8 rows + fixtures; writer `inserted/updated/rejected` counters identical on dry-run. Any delta = STOP.
- **Backfill (Artifact 3, T3, evidence-gated):** **open** rows re-diagnosed from **current** evidence (incl. inventory probe); set fields where conclusive, else `unresolved`/NULL. **Resolved/historical** rows get a precise class **only** from contemporaneous evidence (captured `diagnostic_evidence`/observations); otherwise NULL — no retroactive classification from today's state. Writes no route/automation (derived); triggers no sourcing.

## D6 — Named fixture & test matrix

| # | Fixture | Kind | Expected `(subject_kind, failure_state)` | route | `governed_sourcing`? |
|---|---|---|---|---|---|
| F1–F3 | carousel CFW/fb, CFW/li, INV/li | live | `(assignment, unassigned)` | `config_repair` | no |
| F4 | PP/youtube `video_short_stat` | live | `(platform_config, misconfigured)` | `config_repair` | no |
| F5 | happy INV/fb image_quote | live | `(none, none)` | — | no |
| G1 | static-bg exists, **unapproved** (intake_candidate/inactive) | controlled | `(static_background, unapproved)` | `operator_approval` | no |
| G2 | static-bg exists, approved+active, **unproven** | controlled | `(static_background, unproven)` | `operator_approval` | no |
| G3 | static-bg exists, **blocked/held** (`purpose_bound`/deprecated) | controlled | `(static_background, blocked)` | `manual_triage` | no |
| G4 | static-bg exists, governed elsewhere, **near-match** (allow-list/scope/assignment) | controlled | `(static_background, misconfigured)` | `config_repair` | no |
| **G5** | **genuinely absent** — `n_inventory_total=0`, `coverage_conclusive=true`, `resolve=no_governed_background` | controlled | `(static_background, absent)` | **`governed_sourcing`** | **YES (only)** |
| C1 | **coverage inconclusive** — a declared store unreadable | controlled | `(static_background, unresolved)` `insufficient` | `manual_triage` | no |
| L1 | `missing_required_logo`, absent-vs-ungoverned indistinguishable | controlled | `(logo, unresolved)` | `manual_triage` | no |
| S1 | `status_below_smoke` (template below smoke rung) | controlled | `(template, unproven)` | `operator_approval` | no |
| W1 | `wrong_scope`, re-scope/reuse resolves | controlled | `(template, misconfigured)` | `config_repair` | no |
| W2 | `wrong_scope`, not safely diagnosable | controlled | `(none, unresolved)` | `manual_triage` | no |
| A1 | genuine appetite ambiguity, no stronger failure | controlled | `(appetite, ambiguous)` | `manual_triage` | no |
| T1 | divergent deepest candidates (tie) | controlled | `(none, unresolved)` `insufficient` | `manual_triage` | no |

G1–G5/C1 built **read-only** (hermetic fixture / `ROLLBACK` txn — never a live INSERT). **Invariant test:** across the matrix, `governed_sourcing` appears **iff** the D8 conjunction holds; **zero** false `governed_sourcing`; G5 is the only YES; the CHECK constraint rejects a hand-forged `(static_background, absent)` with `evidence_confidence≠conclusive`.

## D7 — STOP conditions

Any voids the remainder → fresh PK gate: a legacy key changes value · any fixture but G5 yields `governed_sourcing`, or G5 does not · `governed_sourcing` reached without the full D8 conjunction (esp. `coverage_conclusive=true` ∧ `n_inventory_total=0` ∧ `evidence_confidence=conclusive`) or through a tie · a tie yields anything but `(none, unresolved)/insufficient/manual_triage` · route/automation disagree with the pair · the CHECK constraint fails to reject a forged absent pair · writer rejects a today-valid row or dry-run counters diverge · backfill would classify on insufficient/non-contemporaneous evidence · any hard-boundary action attempted · external review non-clean / `reviewed_input_hash` ≠ artifact hash / unexpected origin movement or files / rollback invalidated · apply attempted without its T3 gate.

## D8 — Handoff contract for the backgrounds-only drain lane (later, separate)

The drain **must not** re-derive routing and **must not** trust a stale classifier result. Its posture is **validate-and-claim, atomically** (#6):

```
-- single transaction, race-resistant:
BEGIN;
  SELECT pg_advisory_xact_lock(hashtext('agap:'||appetite_signature));   -- serialize per signature
  -- 1) re-read the stored verdict; 2) FRESHLY re-run the probe NOW:
  -- fresh probe MUST use the SAME authoritative vertical basis (candidate_template_id), never a
  -- re-derivation — probe_asset_inventory and resolve_slot_assets both consume public.derive_template_vertical.
  probe := public.probe_asset_inventory(client_slug, platform, candidate_template_id, 'static_background');
  -- proceed to claim ONLY if ALL hold on fresh evidence:
  --   subject_kind='static_background' AND failure_state='absent'
  --   AND evidence_confidence='conclusive'
  --   AND asset_gap_route(subject_kind,failure_state)='governed_sourcing'
  --   AND asset_gap_automation(...)='governed_auto_sourcing'
  --   AND (probe->>'vertical_basis_conclusive')::bool = true    -- proven resolver/probe vertical alignment
  --   AND (probe->>'coverage_conclusive')::bool = true          -- coverage still conclusive
  --   AND resolve_slot_assets(...)->>'fail_reason' = 'no_governed_background'  -- no governed selection
  --   AND (probe->>'n_inventory_total')::int = 0                -- relevant inventory STILL zero
  -- CAS claim (never touch a moved row):
  UPDATE m.asset_gap_suggestion
     SET status='harvesting', claimed_by=:worker, claim_expires_at=now()+interval '…'
   WHERE id=:id AND status='open' AND subject_kind='static_background' AND failure_state='absent'
   RETURNING id;   -- zero rows ⇒ lost the race / state moved ⇒ abort, do not source
COMMIT;
```

A stale classifier result **never** independently authorizes sourcing — the fresh probe + zero-inventory + conclusive-coverage re-assertion inside the locked, CAS-guarded claim is mandatory. Rows failing any clause are out of scope for sourcing. The drain still applies every downstream gate this classifier does not replace: Image-workflow §2 non-negotiables (fenced-until-approved · PK visual verdict is the only deciding act · sha256+licence · pool-neutrality · full T3 + live proof + rollback-proven) and the NDIS staged real-imagery policy (Phase-1 person-free only; Phase 2/3 held). `governed_sourcing` is eligibility in principle. Subject gating keeps `logo`/`image`/`video_broll` out of sourcing entirely.

---

## Notes for PK (Gate-1 rev-3)

- All seven final revisions folded: (1) full probe universe with near-match retention; (2) candidate-store completeness + `coverage_conclusive`; (3) template-remediation corrections + `status_below_smoke`/`wrong_scope` fixes; (4) deterministic tie contract; (5) mechanical `(static_background,absent)` CHECK; (6) drain-time freshness + atomic validate-and-claim in D8; (7) three fixed-identity, separately-reviewable/rollbackable artifacts, reviewed-hash == applied.
- Accepted rev-2 items retained: Option R · `format_unmapped=unsupported` default · `platform_config negative`→`manual_triage`.
- Tiering: additive/dark DDL+helpers = T2 authoring; the three apply artifacts are three separate T3 gates, external review pinned per-artifact hash.
- Brief is feature-branch only, **uncommitted-to-main**, pending Gate-1. Nothing is applied by drafting this.
