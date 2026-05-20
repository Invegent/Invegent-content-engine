# cc-0018 — Friction Wave 0f: emit_event Routing + Helper Extension

**Version:** v1.0 — AUTHORED-PENDING-APPLY
**Date authored:** 2026-05-20 Sydney (post-v2.93)
**Date applied:** PENDING
**Wave:** Wave 0f of Friction Register Consolidation Plan v1
**Predecessor:** cc-0017e (CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.90; v1.1 8-item backlog patch CLOSED v2.91 at commit `be4e6772`)
**Plan gate:** 14 (next open gate after Wave 0e closed v2.90, Gate 13 closed)
**Authoring agent:** Claude (chat)
**Author session:** post-v2.93 planning (CCD observing Cowork lifecycle in parallel)

> **This is brief authoring only.** Zero production mutations. Zero Supabase calls. Zero D-01 fires. Apply happens in a future session under PK directive with fresh D-01 fire + full preflight P-set discipline per cc-0017a-e precedent.

---

## 1. Scope

### IN (per PK directive 2026-05-20)

| ID | Item | Source |
|---|---|---|
| **B** | Operator-action audit event emission via `friction.emit_event` from each mutation function | cc-0017e §1 deferred (Wave 0f candidate) |
| **G** | `emit_event` rule relaxation / test-mode bypass | cc-0017e §1 deferred (Wave 0f candidate) |
| **L-v2.90-d** | `friction.purge_test_case` helper extension to cover `friction.case_history` | cc-0017e apply discovery (v2.90 Defect 5) |

### OUT / DEFER (per PK directive 2026-05-20)

| ID | Item | Disposition |
|---|---|---|
| F | `friction.case` write-side CHECK enforcing open/resolved invariant | DEFERRED to Wave 0g — requires PK to formalise the exact invariant first (which terminal states require which timestamps set/null) |
| E | `fn_triage_case` deprecation / rename | DEFERRED to Wave 0h — requires multi-surface external-caller inventory across content-engine + Invegent-dashboard (known callsite: `app/(dashboard)/operations/case-row.tsx` `.rpc('friction.fn_triage_case', ...)`) + Edge Functions + any PostgREST RPC consumers. Defer until Wave 7 (cc-0015) + Wave 8 (cc-0016) close so the full friction surface is settled before deprecating the legacy function |
| Q-004 brief patch | DECOUPLED — Cat A clause simplification in `docs/briefs/nightly-health-check-v1.md` is a separate docs-only commit at PK direction. PK resolves Q-004 in `docs/runtime/claude_answers.md` independently of this Wave |
| Recurring-brief lifecycle convention | OUT OF SCOPE — `docs/briefs/queue.md` / `docs/runtime/automation_v1_spec.md` governance work is operational governance, not friction-register infrastructure |
| PRV / dashboard UI work | OUT OF SCOPE — dashboard is reference-only for Wave 0f. No Invegent-dashboard PR, no dashboard branch, no dashboard deploy |

### Hard scope guard (PK directive verbatim)

> "No production mutations. No apply_migration. No D-01 fire. No Wave 0f scope creep beyond B + G + L-v2.90-d. No fn_triage_case rename. No friction.case invariant CHECK/trigger. No PRV/dashboard UI work. No Q-004 resolution."

This brief is **AUTHORING ONLY**. Apply happens in a future session.

---

## 2. Empirical preconditions

### 2.1 Probes carried forward from cc-0017e v2.90 (no re-probe at authoring)

These were captured at cc-0017e authoring + apply and are still empirically valid at the time of this authoring session. Re-validation happens at the future apply session via §2.2 P-set.

| Probe | Result (v2.90/v2.93 baseline) |
|---|---|
| `friction.*` table count | 10 (case_history added v2.90) |
| `friction.*` function count | 19 |
| `friction.purge_test_case` exists | YES (cc-0017d v2.86) |
| `friction.purge_test_case` body deletes from | `event`, `case`, `emit_error` only — **NOT case_history** |
| `friction.case_history.case_id` FK ON DELETE | RESTRICT |
| `friction.emit_event` function exists | YES (cc-0017a) |
| `friction.emission_rule` table exists | YES (cc-0017a) |
| `friction.emission_rule_history` shadow table | YES (cc-0017a/b) |
| `friction.category` table exists | YES (cc-0017a) |
| V-D direct-INSERT fallback pattern | Codified at cc-0017d v1.1 Drift 1 — V-D fixture seeding uses direct INSERT INTO friction.case / friction.event bypassing emit_event |
| Slash-prefix fixture naming convention | `^cc-[0-9]{4}[a-z]?-test/` (cc-0017d v1.1 Drift 3; L-v2.90-c) |
| Mutation function inventory (cc-0017d + cc-0017e) | 6 mutation functions all SECURITY DEFINER: `triage_case`, `resolve_case`, `reopen_case`, `mark_duplicate`, `record_first_view`, `fn_triage_case` (11-arg post-cc-0017e v2.90) |
| Baseline row counts at v2.90 close | friction.case = 29, friction.event = 29, friction.case_history = 8 (backfill only), friction.emit_error = 0 |

### 2.2 Probes required at apply session (must run clean before D-01 fires)

| Probe | Assertion |
|---|---|
| **P1** | `friction.*` table count = 10 (case_history present from v2.90); flag any unexpected additions or removals |
| **P2** | `friction.*` function count = 19; specifically `purge_test_case`, `emit_event`, `fn_emit_health_check_findings`, and all 6 mutation functions (`triage_case`, `resolve_case`, `reopen_case`, `mark_duplicate`, `record_first_view`, `fn_triage_case`) all SECURITY DEFINER |
| **P3** | `friction.purge_test_case` current body inspection via `pg_get_functiondef` — confirm: (a) DELETE statements target `event`, `case`, `emit_error` only; (b) regex enforcement on `^cc-[0-9]{4}[a-z]?-test/`; (c) no DELETE on case_history; (d) function signature shape (`p_pattern text` + scalar/return shape); (e) error mode on FK-fail (RAISE or silent — likely RAISE per Postgres default) |
| **P4** | `friction.emission_rule` row inventory — exact list of (rule_id, source_pattern, category_code, severity_default, is_active, case_creation) — needed to plan Item G changes and confirm no pre-existing `operator-action` or `test-fixture` rule conflicts |
| **P5** | `friction.category` row inventory — exact list of (code, is_active, sort_order, description) — confirm `operator_action` and `test_fixture` codes are not already present |
| **P6** | `friction.case_history` row count baseline — expected 8 (v2.90 backfill); flag any operational additions accrued between v2.90 and apply session |
| **P7** | `friction.case` row count baseline — expected 29 (v2.87+ baseline preserved through v2.90); flag any operational additions |
| **P8** | `friction.event` row count baseline — expected 29 (v2.90) + 5 (cc-0017e + nightly-health-check 2026-05-17 emission) + any subsequent emissions (e.g. if cron 53 re-enabled or if more nightly-health-check fires landed between v2.93 and apply session) |
| **P9** | External caller inventory for `friction.purge_test_case` — `pg_get_functiondef`-based grep of all friction.* function bodies; expected 0 in-DB callers (helper is invoked manually) |
| **P10** | `friction.emit_event` signature inspection — confirm current arg list + return shape — needed to plan item G Path A vs Path B |

### 2.3 Transactional EXEC pre-validation harness (per L-v2.86-a)

Before D-01 fires, the full migration block must validate cleanly inside a single transactional `PERFORM exec()` wrapper that runs every CREATE OR REPLACE / INSERT / etc. against a marker context. Any substitution-class drift surfaced here, not at apply.

---

## 3. Design summary

### 3.1 Item B — Operator-action audit event emission

**Intent:** Every successful operator triage action (via the /operations dashboard route or any direct SECURITY DEFINER call) leaves an audit trail in `friction.event` capturing what the operator did, when, and why.

**Current state:**
- Operator clicks a triage button at `app/(dashboard)/operations/case-row.tsx`
- Dashboard calls `friction.fn_triage_case(p_case_id, p_triage_state, ..., p_actor)` via PostgREST `.rpc()` (or `triage_case` / `resolve_case` / etc. for newer mutation surface)
- After v2.90 cc-0017e: mutation function writes to `friction.case_history` with `change_kind='triage'` (or equivalent for resolve/reopen/etc.)
- **No `friction.event` row is emitted for the operator action itself** — case_history captures the row-level audit, but downstream consumers (PRV-5 Triage Inbox future, audit dashboards, etc.) look in friction.event for the action stream

**Proposed change:**

1. New `friction.category` row:
   - `code='operator_action'`
   - `is_active=true`
   - `sort_order=N+1` (next-available)
   - `description='Operator triage actions on friction.case via SECURITY DEFINER mutation functions'`

2. New `friction.emission_rule` row:
   - `source_pattern='^friction-operator-action/'`
   - `category_code='operator_action'`
   - `severity_default='info'`
   - `is_active=true`
   - `case_creation='none'` (operator-actions observe existing cases; never create new ones)

3. Patch each of the 6 mutation functions (`triage_case`, `resolve_case`, `reopen_case`, `mark_duplicate`, `record_first_view`, `fn_triage_case`) to call `friction.emit_event(...)` immediately after the case_history INSERT, with the following payload:

```sql
-- existing: SELECT ... FOR UPDATE into v_current
-- existing: validation
-- existing: UPDATE friction."case" ...
-- existing: post-UPDATE v_after reload
-- existing: INSERT INTO friction.case_history (...)
-- NEW:
PERFORM friction.emit_event(
    p_source           := 'operator_action',
    p_source_event_id  := format('friction-operator-action/%s/%s/%s',
                                  '<change_kind_literal>',
                                  p_case_id::text,
                                  extract(epoch from now())::bigint::text),
    p_severity         := 'info',
    p_category         := 'operator_action',
    p_observed_at      := now(),
    p_reported_by      := COALESCE(p_actor, current_user::text),
    p_payload          := jsonb_build_object(
        'change_kind',   '<change_kind_literal>',
        'case_id',       p_case_id,
        'actor',         COALESCE(p_actor, current_user::text),
        'before_state',  to_jsonb(v_current),
        'after_state',   to_jsonb(v_after)
    )
);
-- existing: RETURN QUERY ...
```

(The exact `friction.emit_event` arg list will be validated against the live function signature at apply-session P10. The shape above reflects the canonical pattern from cc-0017a; apply session adapts as needed.)

**Per-function change_kind literals:**
- `triage_case` → `'triage'`
- `resolve_case` → `'resolve'`
- `reopen_case` → `'reopen'`
- `mark_duplicate` → `'mark_duplicate'`
- `record_first_view` → `'first_view'` (emit ONLY when `first_viewed_at` actually changes — matches case_history INSERT discipline from cc-0017e v2.90)
- `fn_triage_case` → `'compat_legacy_triage'` (matches case_history change_kind set at cc-0017e v2.90)

**Signature stability:** all 6 mutation function signatures byte-stable across the patch (L-v2.85-a applied). RETURNS TABLE columns retain `out_` prefix (L-v2.86-b applied). Each function's body grows by ~12-15 lines for the emit_event call.

**`friction.case`%ROWTYPE quoting:** preserved through all patches (L-v2.86-c applied).

**Single-`%` RAISE EXCEPTION placeholders:** preserved through all patches (L-v2.86-a applied).

**Dashboard impact:** **NONE.** The /operations route + `case-row.tsx` already call the SECURITY DEFINER mutation functions via `.rpc()`. The emit_event call lives entirely inside the mutation function body — transparent to all callers. No dashboard code change required for Wave 0f.

### 3.2 Item G — emit_event rule relaxation / test-mode bypass

**Current state:**
- `friction.emit_event` applies `friction.emission_rule` to route incoming events by source/source_event_id pattern
- V-D test fixtures use naming pattern `cc-NNNN[a-z]?-test/...` (slash-prefix convention per cc-0017d v1.1 Drift 3)
- **`emit_event`'s emission_rule patterns DO NOT match the test-fixture naming pattern** — there is no active emission_rule that routes `^cc-[0-9]{4}[a-z]?-test/` sources
- V-D-setup workaround: direct INSERT INTO friction.case / friction.event bypassing emit_event (codified at cc-0017d v1.1 Drift 1)

**Problem:** Test-mode fixtures bypass the production code path. Production code uses `emit_event`; tests do not. This is acceptable for now (V-D coverage still validates the mutation function bodies) but creates an asymmetric test surface — a behavioural difference between test-mode and production-mode emission flow goes undetected by V-D.

**Why direct-INSERT fallback remains acceptable until Wave 0f lands:**
- Correctly seeds fixture data to satisfy V-D positive smoke tests across cc-0017a/b/c/d/e
- V-Z residue cleanup still works (V-Z1 checks slash-prefix residue regardless of how fixtures were emitted)
- Production code paths are independent (operator actions, health_check emission via `fn_emit_health_check_findings`, system events all use `emit_event` normally)
- The asymmetry is a known carry, not a silent defect — it is referenced in every Wave 0a-0e brief's V-D-setup section

**Proposed change (two-path approach; preferred path documented; alternative captured for PK to override at D-01):**

**Path A — Test-mode emission_rule (PREFERRED, default for Wave 0f):**

1. New `friction.category` row:
   - `code='test_fixture'`
   - `is_active=true`
   - `sort_order=N+2`
   - `description='V-D and V-Z test fixtures emitted via slash-prefix naming convention (cc-NNNN[a-z]?-test/...)'`

2. New `friction.emission_rule` row:
   - `source_pattern='^cc-[0-9]{4}[a-z]?-test/'`
   - `category_code='test_fixture'`
   - `severity_default='info'`
   - `is_active=true`
   - `case_creation='always'` (test fixtures create cases on demand; matches existing V-D usage)

3. V-D-setup migration patterns can now use `emit_event` for fixture seeding instead of direct INSERT (optional — direct INSERT continues to work; this just makes the canonical path available).

**Path B — Explicit test-mode arg (ALTERNATIVE; PK override at D-01):**

1. Add optional `p_test_mode boolean DEFAULT false` to `friction.emit_event` signature (signature-compatible — existing callers unaffected by the new optional arg with default).
2. When `p_test_mode=true`, skip the emission_rule lookup entirely; route to a hard-coded `category='test_fixture'`.
3. V-D-setup migrations explicitly pass `p_test_mode := true`.

**Recommendation:** Path A. `emission_rule` is the canonical routing surface; relaxation matches existing infrastructure rather than introducing a sidecar bypass. Path B is an escape hatch that creates an alternate routing surface needing its own observability.

### 3.3 Item L-v2.90-d — purge_test_case helper case_history coverage

**Current state:**
- `friction.purge_test_case(p_pattern text)` realised at cc-0017d v2.86
- Body shape (per v2.90 session observation and cc-0017d v1.1 Drift 3 documentation):
  - Regex-validates `p_pattern` against `^cc-[0-9]{4}[a-z]?-test/`
  - DELETE FROM `friction.event` WHERE source_event_id matches pattern
  - DELETE FROM `friction.emit_error` WHERE source_event_id matches pattern
  - DELETE FROM `friction."case"` WHERE title or source_event_id matches pattern
  - Returns diagnostic counts per table
- **`case_history` is NOT covered** (v2.90 Defect 5 / L-v2.90-d)

**Gap:**
- `friction.case_history.case_id` references `friction.case(case_id)` with `ON DELETE RESTRICT`
- Calling `purge_test_case` on a fixture pattern that includes cases with associated case_history rows → FK violation at the `DELETE FROM friction."case"` step → P0001 error → cleanup aborts mid-pass with `event` already deleted but `case` rows preserved (asymmetric residue)
- v2.90 worked around this with the inline `cc_0017e_vcheck_audit_cleanup` migration (explicit `DELETE FROM friction.case_history` before `DELETE FROM friction."case"` — see cc-0017e v2.90 session detail)

**Proposed change:**

Patch `friction.purge_test_case` body to DELETE from `case_history` BEFORE deleting from `case`, in correct FK-dependency order:

```sql
-- existing: regex validation on p_pattern against '^cc-[0-9]{4}[a-z]?-test/'
-- existing: DELETE FROM friction.event WHERE source_event_id ~ p_pattern;
-- NEW: DELETE FROM friction.case_history
--      WHERE case_id IN (
--        SELECT case_id FROM friction."case"
--        WHERE title ~ p_pattern OR source_event_id ~ p_pattern
--        -- (exact pattern source surface captured at apply-session P3 probe)
--      );
-- existing: DELETE FROM friction.emit_error WHERE source_event_id ~ p_pattern;
-- existing: DELETE FROM friction."case" WHERE title ~ p_pattern OR source_event_id ~ p_pattern;
-- existing: RETURN <diagnostic shape>;
```

**Signature stability:** function signature unchanged (single `p_pattern text` arg).

**Diagnostic return shape:** extend the helper's return to include `case_history_deleted bigint` count alongside `event_deleted`, `emit_error_deleted`, `case_deleted` (current shape — exact return signature captured at apply-time P3 probe; this is a forward-compatible addition).

**Authoring note:** The helper's exact pattern-matching surface (title vs source_event_id vs both) is captured at apply-time P3 probe. The Wave 0f patch preserves whatever pattern surface the current helper uses; it ONLY adds the case_history DELETE step in correct FK-dependency order, nothing more. No widening of the helper's scope, no signature change, no regex change.

---

## 4. Apply sequencing

1. **Pre-apply P-set** (P1-P10 above) runs clean.
2. **Transactional EXEC pre-validation harness** (per L-v2.86-a) validates the full migration block on a marker `PERFORM` before the real apply.
3. **D-01 fires** (sql_destructive, single combined fire — see §6).
4. **Apply order within the migration (single atomic transaction):**
   a. New `friction.category` rows: `operator_action` + `test_fixture` (G Path A)
   b. New `friction.emission_rule` rows: operator-action pattern + test-fixture pattern (G Path A)
   c. CREATE OR REPLACE FUNCTION `friction.purge_test_case` (L-v2.90-d patch — case_history DELETE in correct FK order)
   d. CREATE OR REPLACE FUNCTION `friction.triage_case` (Item B — add emit_event call)
   e. CREATE OR REPLACE FUNCTION `friction.resolve_case` (Item B — add emit_event call)
   f. CREATE OR REPLACE FUNCTION `friction.reopen_case` (Item B — add emit_event call)
   g. CREATE OR REPLACE FUNCTION `friction.mark_duplicate` (Item B — add emit_event call)
   h. CREATE OR REPLACE FUNCTION `friction.record_first_view` (Item B — emit_event ONLY on first_viewed_at change)
   i. CREATE OR REPLACE FUNCTION `friction.fn_triage_case` (Item B — add emit_event call with change_kind='compat_legacy_triage')
   j. COMMENT statements on updated functions + new category + new emission_rule rows
5. **V-check matrix** (per §7) runs post-apply.

**Sequence ordering rationale:**
- `friction.category` and `friction.emission_rule` rows must exist before any mutation function tries to `emit_event` (FK protection + correct routing from the first call)
- `purge_test_case` patch (step c) is independent of items B+G and can be applied anywhere; placing it before the mutation patches keeps DDL-then-function-patches ordering clean
- Mutation function patches (steps d-i) reference the new `emission_rule` rows transitively (via `emit_event` lookup), so they go after the data rows
- COMMENT statements run last

---

## 5. Hard stops (apply-time, NOT this authoring session)

**This authoring session has 0 production mutations. The list below applies to the FUTURE apply session.**

1. **D-01 must fire** before any migration executes. Action type: `sql_destructive`. Proposal must reference this brief by commit SHA and enumerate the 2 friction.category rows + 2 friction.emission_rule rows + 7 function patches (6 mutation functions + purge_test_case).
2. **Pre-apply P-set** (P1-P10) must run clean. Any P-check FAIL aborts.
3. **Transactional EXEC pre-validation harness** (per L-v2.86-a) must succeed on a marker `PERFORM` block before the real apply.
4. **`friction.category` + `friction.emission_rule` data rows must be created BEFORE mutation function patches** — function patches call emit_event which looks up emission_rule by pattern; reverse ordering creates a "function patched but emission_rule missing" window where the first call would route to friction.emit_error with reason='no_matching_emission_rule'.
5. **`purge_test_case` patch is independent** — applied as a separate step within the same migration; failure here does not block items B+G but signals helper-coverage gap and should trigger Path B-prime.
6. **If V-A1 byte-match fails on any function patch** at the proposed migration, ABORT before applying. Fix substitution-class drift first.
7. **V-Z3 must PASS strict** at close. If V-Z3 returns mismatched counts between V-D operator-action calls and friction.event row inserts, the patch surface has a silent emit_event failure and apply is not closed-clean.
8. **If `purge_test_case` V-L regression test produces FK violation** (intentional test — deliberately call helper on a case that has case_history rows; expect clean DELETE chain, NOT FK error), apply rollback and investigate.
9. **No fn_triage_case rename, no friction.case invariant CHECK/trigger, no PRV/dashboard UI work, no Q-004 resolution** — these are Wave 0g/0h/separate-track items and any drift into them at apply is scope violation.

---

## 6. D-01 map

| Wave 0f scope | D-01 fires |
|---|---|
| **Combined brief (B + G + L-v2.90-d)** | **1 fire (`sql_destructive`)** at apply session, single cycle covers all 3 items |
| Authoring (this session) | **0 fires** — brief authoring is read-only documentation |
| Apply (future session) | 1 fire as above |

**D-01 proposal template for apply session:**

```
Apply cc-0018 v1.0 friction Wave 0f: emit_event routing + purge_test_case helper extension.

Brief commit: <commit-SHA of this brief>

Production action: apply_migration with name 'cc_0018_friction_wave_0f_emit_event_and_helper_extension' against project mbkmaxqhsohbtwsqolns (ap-southeast-2).

Migration content (single atomic transaction):
  1. INSERT 2 rows into friction.category: 'operator_action', 'test_fixture'
  2. INSERT 2 rows into friction.emission_rule: operator-action pattern + test-fixture pattern
  3. CREATE OR REPLACE FUNCTION friction.purge_test_case (signature stable; add case_history DELETE in correct FK-dependency order)
  4. CREATE OR REPLACE FUNCTION friction.triage_case (signature stable; add emit_event call after case_history INSERT)
  5. CREATE OR REPLACE FUNCTION friction.resolve_case (signature stable; same pattern; change_kind='resolve')
  6. CREATE OR REPLACE FUNCTION friction.reopen_case (signature stable; same pattern; change_kind='reopen')
  7. CREATE OR REPLACE FUNCTION friction.mark_duplicate (signature stable; same pattern; change_kind='mark_duplicate')
  8. CREATE OR REPLACE FUNCTION friction.record_first_view (signature stable; emit_event ONLY when first_viewed_at actually changes; change_kind='first_view')
  9. CREATE OR REPLACE FUNCTION friction.fn_triage_case (11-arg signature stable; emit_event call; change_kind='compat_legacy_triage')
  + COMMENT statements on updated objects

Consequence if delayed: Wave 0f blocked. case_history captures the row-level audit but operator-action stream still invisible to friction.event consumers. V-D test seeding continues to use direct-INSERT fallback (cc-0017d v1.1 Drift 1). purge_test_case continues to require inline cleanup workaround (cc-0017e v2.90 pattern) on any test that creates case_history rows.

Cost of waiting: each week delays operator-action visibility in friction.event by 1 week; each Wave 0g/0h apply that touches V-D fixtures continues to require inline cleanup migrations.
```

---

## 7. V-check plan

### V-A — Function signature byte-stability (all 7 patched functions)

- **V-A1:** `pg_get_functiondef` on all 7 functions matches expected post-patch shape; signatures byte-stable; SECURITY DEFINER preserved; `search_path=friction,public` preserved
- **V-A2:** Each mutation function body contains exactly one `friction.emit_event(...)` call at the correct insertion point post-case_history-INSERT (or zero for purge_test_case; one for fn_triage_case at the compat-legacy-triage path)
- **V-A3:** `purge_test_case` body contains DELETE statements in correct FK-dependency order (event → case_history → emit_error → case)

### V-B — Permissions

- **V-B1:** All 6 mutation functions retain SECURITY DEFINER + `search_path=friction,public`
- **V-B2:** purge_test_case retains SECURITY DEFINER + `search_path=friction,public`
- **V-B3:** New `friction.category` + `friction.emission_rule` data rows owned by postgres; service_role grants intact (cc-0017c lockdown preserved)

### V-C — Data layer

- **V-C1:** 2 new `friction.category` rows present (`operator_action`, `test_fixture`); both `is_active=true`
- **V-C2:** 2 new `friction.emission_rule` rows present matching expected `source_pattern`s
- **V-C3:** No existing category/rule rows accidentally deleted or modified beyond the new inserts (count delta = +2 on each table)

### V-D — Positive smoke (operator-action emission)

Using V-D fixtures created at `cc-0018-test/v-d/fixture-NNN` slash-prefix naming:

- **V-D1:** Call `friction.triage_case` on fixture-001 → verify case_history row written + friction.event row emitted with `source='operator_action'`, `source_event_id` matching `^friction-operator-action/triage/`, `severity='info'`, `category='operator_action'`
- **V-D2:** Call `friction.resolve_case` on fixture-001 → verify same emission pattern with `change_kind='resolve'`
- **V-D3:** Call `friction.reopen_case` on fixture-001 → verify same emission pattern with `change_kind='reopen'`
- **V-D4:** Call `friction.mark_duplicate` on fixture-003 (with V-D-setup pre-creating fixture-002 predecessor) → verify same emission pattern with `change_kind='mark_duplicate'`
- **V-D5:** Call `friction.record_first_view` on fixture-001 first time → verify emission. Call second time (idempotent path) → verify NO emission (record_first_view special case; matches case_history INSERT discipline)
- **V-D6:** Call `friction.fn_triage_case` on fixture-004 (11-arg with `p_actor='cc-0018-test-actor'`) → verify emission with `change_kind='compat_legacy_triage'`

### V-G — emit_event routing (test-mode fixture)

- **V-G1:** Direct call to `friction.emit_event(p_source='test_fixture', p_source_event_id='cc-0018-test/v-g/fixture-001', ...)` → verify it succeeds (no emit_error row) and routes to `category='test_fixture'` via the new emission_rule
- **V-G2:** Verify friction.event row created in V-G1 has the expected shape (category, severity, payload preserved)
- **V-G3:** (Path A only) Verify direct INSERT pattern still works for backward compatibility — V-D-setup direct INSERT remains available even though emit_event is now the preferred path

### V-L — purge_test_case helper extension

- **V-L1:** Create test fixture set including a case + case_history rows (via V-D operations on a `cc-0018-test/v-l/` pattern)
- **V-L2:** Call `friction.purge_test_case('cc-0018-test/v-l/%')` (exact pattern syntax depends on apply-time P3 probe) → verify clean DELETE chain (no FK error); confirm case_history rows deleted before case rows; diagnostic return includes `case_history_deleted` count
- **V-L3:** Re-run V-L2 → verify idempotent (0 rows deleted second time, no error)
- **V-L4:** Negative test: call `friction.purge_test_case('not-cc-test/...')` (pattern violates regex `^cc-[0-9]{4}[a-z]?-test/`) → still raises P0001 'must match...' (existing regex enforcement preserved)

### V-E — Negative tests

- **V-E1:** Direct INSERT into `friction.case_history` bypassing functions → still rejected by service_role lockdown (cc-0017c grants intact); ERRCODE 42501
- **V-E2:** `emit_event` with `source` not matching any active emission_rule → still routes to `friction.emit_error` with `reason='no_matching_emission_rule'` (existing behaviour preserved)
- **V-E3:** `purge_test_case` with pattern NOT matching `^cc-[0-9]{4}[a-z]?-test/` regex → still raises P0001 'must match...'

### V-Z — Residue cross-check (per cc-0017e §3.5 V-Z3 convention)

- **V-Z1 (strict-prefix residue):** 0 fixture-prefix rows remain in `friction."case"` + `friction.case_history` + `friction.event` + `friction.emit_error` after V-D + V-G + V-L cleanup
- **V-Z2 (baseline count preservation):** `friction."case"` row count = pre-apply baseline; `friction.case_history` row count = pre-apply baseline + (any operational rows added between authoring and apply); `friction.event` row count delta accounted for (operational additions + V-D + V-G fixtures that survived past cleanup are 0)
- **V-Z3 (shadow-table operation alignment):** case_history row count delta during V-D ops = count of V-D positive operations exercised (V-D1 + V-D2 + V-D3 + V-D4 + V-D6 = 5 ops with case_history INSERT; V-D5 first call = +1 = 6 ops total); friction.event row count delta during V-D = 6 (one per case_history INSERT) + V-G1 = 7

### V-N — No unintended dashboard dependency

- **V-N1:** `app/(dashboard)/operations/case-row.tsx` `.rpc('friction.fn_triage_case', ...)` callsite continues to work without modification — verify via manual smoke test (PK clicks a triage button on /operations; observe successful response + case_history row written + friction.event row emitted)
- **V-N2:** `app/(dashboard)/operations/page.tsx` `friction.fn_recent_cases(50)` callsite continues to work without modification — verify via /operations page load
- **V-N3:** No dashboard code changes required at any point in the apply, confirmed by inspection at apply-time (Invegent-dashboard repo HEAD unchanged by this Wave)

---

## 8. Repo split

**Primary: Invegent-content-engine** — all production work lives here.

| Work | Repo / path | When |
|---|---|---|
| Brief authoring (this commit) | `Invegent-content-engine` :: `docs/briefs/cc-0018-friction-wave-0f-emit-event-and-helper-extension.md` | THIS SESSION |
| Apply migration | `Invegent-content-engine` :: Supabase MCP `apply_migration` (no migration file in repo for schema-only changes; migration recorded in `supabase_migrations.schema_migrations` table) | FUTURE APPLY SESSION |
| Per-session detail (post-apply) | `Invegent-content-engine` :: `docs/runtime/sessions/YYYY-MM-DD-cc0018-applied.md` | FUTURE APPLY SESSION |
| Result artefact (post-apply) | `Invegent-content-engine` :: `docs/results/cc-0018-friction-wave-0f.md` (optional, on cc-0017a-d/0011 precedent) | FUTURE APPLY SESSION |
| sync_state + action_list updates (post-apply) | `Invegent-content-engine` :: `docs/00_sync_state.md` + `docs/00_action_list.md` | FUTURE APPLY SESSION |

**Reference only: Invegent-dashboard** — NO EDITS in Wave 0f.

| Inspection only | Repo / path | Purpose |
|---|---|---|
| Operator triage callsite | `Invegent-dashboard` :: `app/(dashboard)/operations/case-row.tsx` | V-N1 manual smoke test post-apply (verify .rpc continues to work transparently after the function body grew) |
| Operator recent-cases callsite | `Invegent-dashboard` :: `app/(dashboard)/operations/page.tsx` | V-N2 manual smoke test post-apply |

Invegent-dashboard remains at its v2.93 HEAD throughout Wave 0f. No dashboard PR, no dashboard branch, no dashboard deploy, no dashboard code review. Dashboard inspection is read-only verification that the function-body grow did not break the .rpc surface (which it shouldn't, since signatures are byte-stable).

---

## 9. Lesson tie-ins (watching at apply time)

| Lesson | Status | Apply-time exercise expectation |
|---|---|---|
| L-v2.86-a (HIGH-SIGNAL) | candidate | EXERCISED — transactional EXEC pre-validation harness in migration block |
| L-v2.85-a (HIGH-SIGNAL) | candidate | EXERCISED — function-signature probe done at authoring (P2 carry) + V-A1 byte-match at apply |
| L-v2.85-b | candidate | Path B-prime pattern available if substitution-class drift surfaces |
| L-v2.85-d | REALIZED | `friction.purge_test_case` available — and being patched in this wave (so the REALIZED state is preserved + extended) |
| L-v2.85-e | applied | Single-file brief authoring this session (smaller scope than cc-0017e multi-file split warrants single file) |
| L-v2.86-b | candidate | EXERCISED — `out_`-prefix preserved on cc-0017d mutation-function RETURNS TABLE patches |
| L-v2.86-c | candidate | EXERCISED — `friction."case"%ROWTYPE` quoting preserved through all 6 mutation function patches |
| L-v2.88-b | realised v2.90 | EXERCISED — V-Z3 convention applied (shadow-table operation alignment check) |
| L-v2.88-c | realised v2.90 | EXERCISED — apply-time P-set re-verification (P1-P10 at apply, not just authoring P-carry) |
| L-v2.88-d | realised v2.90 | EXERCISED — in-function INSERT pattern (emit_event PERFORM call inside mutation function body) |
| L-v2.90-a (HIGH-SIGNAL) | candidate | EXERCISED — V-D fixture constraint-surface probing (friction.category + emission_rule values pre-validated at P4+P5) |
| L-v2.90-b (HIGH-SIGNAL) | NOT applicable | No arity changes in this wave (purge_test_case + 6 mutation functions all signature-stable) |
| L-v2.90-c | candidate | EXERCISED — V-D fixtures use slash-prefix naming `cc-0018-test/v-d/fixture-NNN` and `cc-0018-test/v-g/...` and `cc-0018-test/v-l/...` |
| L-v2.90-d | REALIZED | This wave realises L-v2.90-d by patching purge_test_case to cover case_history |
| L-v2.90-e | candidate | EXERCISED — close-the-loop SQL template validated against `m.chatgpt_review` schema at brief authoring (cf. cc-0017e v2.91 8-item backlog) |
| L40 | baseline | `m.chatgpt_review` close-the-loop UPDATE at apply close |
| L41 | baseline | `apply_migration` NOT `db push` — friction schema is `k.schema_registry`-registered |
| L46 | baseline | Mandatory D-01 fire pre-production-action |
| L58 | baseline | Atomic close-the-loop at apply close |
| L62 | baseline | D-01 fire + close-the-loop semantics |

---

## 10. Open design decisions (PK to override at D-01 or v1.1)

| # | Decision | Default chosen | Rationale | Override path |
|---|---|---|---|---|
| 1 | Item G implementation path | **Path A** (new emission_rule + new category) | Canonical routing surface; no sidecar bypass; matches existing infrastructure; preserves observability symmetry between test and production paths | v1.1 switch to Path B (explicit `p_test_mode` arg on emit_event) if PK directs |
| 2 | Operator-action `source_event_id` format | `friction-operator-action/{change_kind}/{case_id}/{epoch_ms}` | Self-describing; case_id enables joining back to friction.case; epoch_ms enables temporal ordering and disambiguates same-second multi-action sequences | v1.1 use different format (e.g. shorter, or with a `v1` version marker) if PK directs |
| 3 | Operator-action category code | `operator_action` | Matches change_kind convention (snake_case verbs); readable; consistent with existing categories | v1.1 use different name (e.g. `triage_action`, `manual_action`) if PK directs |
| 4 | Operator-action severity default | `info` | Operator actions are observations of existing cases, not new findings; downstream rules can re-route by `change_kind` if needed | v1.1 use `none` or `debug` if PK directs |
| 5 | `record_first_view` emit_event policy | Emit ONLY on first_viewed_at change | Matches case_history INSERT discipline at cc-0017e v2.90 (skip idempotent path) | v1.1 always emit (including idempotent path with explicit was_already_viewed=true payload) if PK directs |
| 6 | Test-fixture category code | `test_fixture` | Conventional; readable | v1.1 use `test_artifact` or `synthetic_fixture` if PK directs |
| 7 | `purge_test_case` diagnostic return shape extension | Add `case_history_deleted bigint` to return alongside existing per-table counts | Symmetric with existing diagnostic shape; forward-compatible | v1.1 use JSONB return or keep scalar if PK directs |
| 8 | V-D fixture naming pattern for this Wave | `cc-0018-test/v-d/fixture-NNN`, `cc-0018-test/v-g/...`, `cc-0018-test/v-l/...` | Slash-prefix convention per cc-0017d v1.1 Drift 3 + L-v2.90-c; sub-namespaces by V-section for clarity | — |
| 9 | Mutation-function `change_kind` per emit_event call | Identical to case_history `change_kind` (existing cc-0017e convention) | Symmetric audit signal; downstream consumers can join case_history.change_kind = friction.event payload->>'change_kind' | — |
| 10 | Operator-action `case_creation` rule | `none` (operator-actions never create new cases) | Operator-action is an observation of an existing case, not a case source. emit_event with case_creation='none' writes to friction.event without creating a new friction.case row | v1.1 use `link_only` if PK introduces a new case_creation value for this semantic |

---

## 11. Authoring metadata

**Authoring session:** post-v2.93 (2026-05-20 Sydney; CCD observing Cowork lifecycle in parallel)
**Authoring scope:** brief file only — single-file authoring per L-v2.85-e (cc-0017e was multi-file at ~85KB across 8 files; Wave 0f is smaller scope and fits cleanly in a single file)
**Production mutations this session:** 0
**D-01 fires this session:** 0
**T-MCP-02 consumption this session:** 0 (no execute_sql, no ask_chatgpt_review)
**Memory cap status:** 19/30 (no new edits this session)
**State-capture exceptions this session:** 0 (cumulative: 1 unchanged)

**Probes executed at authoring (read-only carry from prior sessions):**
- P-carry-1: friction.* schema state from cc-0017e v2.90 + v2.91 + v2.92 + v2.93 (10 tables, 19 functions, baseline counts preserved through v2.93)
- P-carry-2: purge_test_case body shape inferred from v2.90 session notes (deletes from event/case/emit_error; FK-RESTRICT on case_history exposed at apply discovery)
- P-carry-3: emission_rule routing semantics from cc-0017a/b/c brief reads (slash-prefix convention, regex pattern matching)
- P-carry-4: V-D direct-INSERT fallback from cc-0017d v1.1 Drift 1
- P-carry-5: emission_rule_history shadow-table precedent from cc-0017e P1b (shape mirrored at cc-0017e §3.1 case_history)
- P-carry-6: /operations route + case-row.tsx inventory from D-FR-RECON-001 (fc726e3c)

**No fresh probes at authoring** — all probes happen at apply-time per §2.2 P1-P10. This is consistent with cc-0017e Wave 0e pattern (authoring with carry-forward + apply with full P-set re-verification).

**Authoring commit:** single `create_or_update_file` for this file. No multi-file split needed at Wave 0f authoring scope.

**Author session does NOT include:**
- 0 Supabase calls (execute_sql, apply_migration)
- 0 Edge Function deploys
- 0 Cron mutations
- 0 dashboard repo edits
- 0 memory edits
- 0 decisions.md edits
- 0 Q-004 resolution (Q-004 is PK-track only)
- 0 Cowork brief lifecycle work (separate track)

---

## 12. Changelog

- **v1.0 (2026-05-20 Sydney post-v2.93):** Authored. Single-file brief covering items B + G + L-v2.90-d per PK directive 2026-05-20. Items F + E explicitly deferred to Wave 0g and 0h respectively. Q-004 resolution decoupled. Recurring-brief lifecycle convention out of scope. Dashboard reference-only. Apply pending under future PK directive with fresh D-01 fire + full preflight P-set discipline (P1-P10) + transactional EXEC pre-validation harness per L-v2.86-a.

---

*Brief authored 2026-05-20 Sydney by chat (Claude) at post-v2.93 planning. Single-file shape (cc-0017a-d precedent). Scope ratified by PK directive 2026-05-20. Apply pending.*
