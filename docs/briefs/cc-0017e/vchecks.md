# cc-0017e v1.0 — V-Check Matrix

**Status:** AUTHORED-PENDING-APPLY.
**Parent brief:** `docs/briefs/cc-0017e-friction-case-history-and-compat.md`

All V-checks below are READ-ONLY SQL — they verify post-apply state. Execute via `execute_sql` after migration applies. No mutations.

**Fixture-naming convention (reaffirmed from cc-0017d v1.1):** slash-prefix `cc-0017e/v-d/...` for ALL V-check fixtures. Strict-prefix residue cross-checks use `LIKE 'cc-0017e/%'` patterns. The hyphen-vs-slash mismatch that caused cc-0017d v2.86 Drift 3 is avoided here by adhering to slash-prefix discipline.

---

## V-A — Function signature integrity

All 6 patched functions retain stable signatures. Byte-match against brief Section 2 + 3 expectations.

### V-A1 — Signature match for all 6 patched functions

```sql
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_function_result(p.oid) AS returns,
  p.prosecdef AS sec_def
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction'
  AND p.proname IN ('fn_triage_case','triage_case','resolve_case','reopen_case','mark_duplicate','record_first_view')
ORDER BY p.proname;
```

**Expected matrix (post-apply):**

| proname | args | returns | sec_def |
|---|---|---|---|
| fn_triage_case | p_case_id uuid, p_triage_state text, p_category text, p_quality_flag boolean, p_capture_reason text, p_capture_reason_note text, p_action_decision text, p_next_review_at timestamptz, p_suppression_reason text, p_notes text, p_actor text | uuid | true |
| mark_duplicate | p_case_id uuid, p_predecessor_case_id uuid, p_actor text | TABLE(out_case_id uuid, out_predecessor_case_id uuid, out_resolved_at timestamptz) | true |
| record_first_view | p_case_id uuid, p_actor text | TABLE(out_case_id uuid, out_first_viewed_at timestamptz, out_was_already_viewed boolean) | true |
| reopen_case | p_case_id uuid, p_actor text, p_clear_action_decision boolean | TABLE(out_case_id uuid, out_reopen_count integer, out_prior_resolution_kind text) | true |
| resolve_case | p_case_id uuid, p_resolution_kind text, p_actor text | TABLE(out_case_id uuid, out_resolved_at timestamptz, out_resolution_kind text) | true |
| triage_case | p_case_id uuid, p_action_decision text, p_actor text, p_effort_level text, p_next_review_at timestamptz | TABLE(out_case_id uuid, out_triaged_at timestamptz, out_action_decision text, out_triage_state text) | true |

L-v2.85-a discipline: signature deviation = STRICT FAIL.

### V-A2 — fn_triage_case body contains triaged_at/triaged_by write logic (post-patch)

```sql
SELECT
  CASE
    WHEN prosrc ILIKE '%triaged_at%' AND prosrc ILIKE '%triaged_by%'
      AND prosrc ILIKE '%case_history%' THEN 'PASS'
    ELSE 'FAIL'
  END AS result
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction' AND p.proname = 'fn_triage_case';
```

Expected: `PASS`. Pre-apply: `FAIL` (body did not reference these). This is the patch-recognition probe.

---

## V-B — Security attributes

### V-B1 — All 6 patched functions are SECURITY DEFINER with search_path=friction,public

```sql
SELECT
  p.proname,
  p.prosecdef,
  p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction'
  AND p.proname IN ('fn_triage_case','triage_case','resolve_case','reopen_case','mark_duplicate','record_first_view');
```

Expected: all 6 rows show `prosecdef=true` and `proconfig` contains `search_path=friction, public`.

### V-B2 — case_history owned by postgres role

```sql
SELECT
  c.relname,
  pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'friction' AND c.relname = 'case_history';
```

Expected: `owner=postgres`.

---

## V-C — Grant matrix

### V-C1 — case_history grants

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'friction' AND table_name = 'case_history'
ORDER BY grantee, privilege_type;
```

**Expected matrix:**

| grantee | privilege_type |
|---|---|
| postgres | DELETE |
| postgres | INSERT |
| postgres | REFERENCES |
| postgres | SELECT |
| postgres | TRIGGER |
| postgres | TRUNCATE |
| postgres | UPDATE |
| service_role | SELECT |

NO grants for `authenticated`, `anon`, or `PUBLIC`. Cc-0017c lockdown pattern.

### V-C2 — service_role cannot directly INSERT into case_history

Verification via attempted DML — exercised in V-E negative tests (see V-E5).

---

## V-D — Positive smoke (function exercise + history INSERT verification)

**Setup:** create 1 V-D fixture case using slash-prefix convention.

### V-D-setup (writes 1 fixture case)

Note: cc-0017d v1.1 Drift 1 established that `emit_event`'s emission_rule may reject manual-source test-prefix payloads. Fallback: direct INSERT into friction.event followed by trigger-driven case promotion, OR direct INSERT into friction."case" if event-promotion path is undesired for V-D scope.

**Recommended for cc-0017e V-D:** direct INSERT into friction."case" via service_role bypass (service_role has SELECT-only on case; use postgres-owner role via apply_migration for the seed). This avoids the emission_rule CHECK trap.

```sql
-- V-D fixture seed (run via apply_migration as postgres owner)
INSERT INTO friction."case" (
  case_id, case_title, first_seen_at, last_seen_at, event_count,
  severity, category, problem_key, triage_state, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  'cc-0017e/v-d/fixture-001',
  now(), now(), 1,
  'low', 'cc-0017e/v-d/category', 'cc-0017e/v-d/problem-key-001',
  'new', now(), now()
)
RETURNING case_id;  -- capture into v_d_case_id for subsequent V-D tests
```

### V-D1 — triage_case writes case_history with change_kind='triage'

```sql
-- Step 1: call triage_case on V-D fixture
SELECT * FROM friction.triage_case(
  p_case_id         := '<v_d_case_id>',
  p_action_decision := 'act_now',
  p_actor           := 'cc-0017e/v-d/actor-1'
);

-- Step 2: verify history row exists
SELECT change_kind, changed_by,
       (before_row->>'triage_state') AS before_state,
       (after_row->>'triage_state') AS after_state,
       (after_row->>'triaged_at') IS NOT NULL AS triaged_at_set
FROM friction.case_history
WHERE case_id = '<v_d_case_id>'
  AND change_kind = 'triage';
```

**Expected:** 1 row. before_state='new', after_state='acknowledged', triaged_at_set=true.

### V-D2 — resolve_case writes case_history with change_kind='resolve'

```sql
SELECT * FROM friction.resolve_case(
  p_case_id         := '<v_d_case_id>',
  p_resolution_kind := 'acted_on',
  p_actor           := 'cc-0017e/v-d/actor-1'
);

SELECT change_kind, (after_row->>'resolution_kind') AS after_resolution
FROM friction.case_history
WHERE case_id = '<v_d_case_id>' AND change_kind = 'resolve';
```

Expected: 1 row. after_resolution='acted_on'.

### V-D3 — reopen_case writes case_history with change_kind='reopen'

```sql
SELECT * FROM friction.reopen_case(
  p_case_id := '<v_d_case_id>',
  p_actor   := 'cc-0017e/v-d/actor-1'
);

SELECT change_kind, (after_row->>'resolved_at') AS after_resolved
FROM friction.case_history
WHERE case_id = '<v_d_case_id>' AND change_kind = 'reopen';
```

Expected: 1 row. after_resolved=null (resolved_at cleared by reopen).

### V-D4 — record_first_view writes case_history on first call, NOT on idempotent second call

```sql
-- First call: should write history
SELECT * FROM friction.record_first_view(
  p_case_id := '<v_d_case_id>',
  p_actor   := 'cc-0017e/v-d/actor-1'
);

-- Second call: idempotent, should NOT write history
SELECT * FROM friction.record_first_view(
  p_case_id := '<v_d_case_id>',
  p_actor   := 'cc-0017e/v-d/actor-1'
);

SELECT count(*) AS first_view_history_count
FROM friction.case_history
WHERE case_id = '<v_d_case_id>' AND change_kind = 'first_view';
```

Expected: count = 1 (exactly one history row despite two function calls).

### V-D5 — mark_duplicate writes case_history (requires 2nd V-D fixture as predecessor)

```sql
-- Seed predecessor (run via apply_migration)
INSERT INTO friction."case" (case_id, case_title, first_seen_at, last_seen_at, event_count,
                              severity, category, problem_key, triage_state, created_at, updated_at)
VALUES (gen_random_uuid(), 'cc-0017e/v-d/fixture-002', now(), now(), 1,
        'low', 'cc-0017e/v-d/category', 'cc-0017e/v-d/problem-key-002',
        'new', now(), now())
RETURNING case_id;  -- v_d_predecessor_id

-- Need a third 'open' case to mark as duplicate
INSERT INTO friction."case" (case_id, case_title, first_seen_at, last_seen_at, event_count,
                              severity, category, problem_key, triage_state, created_at, updated_at)
VALUES (gen_random_uuid(), 'cc-0017e/v-d/fixture-003', now(), now(), 1,
        'low', 'cc-0017e/v-d/category', 'cc-0017e/v-d/problem-key-003',
        'new', now(), now())
RETURNING case_id;  -- v_d_duplicate_id

-- Call mark_duplicate
SELECT * FROM friction.mark_duplicate(
  p_case_id             := '<v_d_duplicate_id>',
  p_predecessor_case_id := '<v_d_predecessor_id>',
  p_actor               := 'cc-0017e/v-d/actor-1'
);

SELECT change_kind, (after_row->>'triage_state') AS after_state
FROM friction.case_history
WHERE case_id = '<v_d_duplicate_id>' AND change_kind = 'mark_duplicate';
```

Expected: 1 row. after_state='duplicate'.

### V-D6 — fn_triage_case writes case_history with change_kind='compat_legacy_triage'

Use a 4th V-D fixture:
```sql
INSERT INTO friction."case" (case_id, case_title, first_seen_at, last_seen_at, event_count,
                              severity, category, problem_key, triage_state, created_at, updated_at)
VALUES (gen_random_uuid(), 'cc-0017e/v-d/fixture-004', now(), now(), 1,
        'low', 'cc-0017e/v-d/category', 'cc-0017e/v-d/problem-key-004',
        'new', now(), now())
RETURNING case_id;  -- v_d_compat_id

SELECT friction.fn_triage_case(
  p_case_id      := '<v_d_compat_id>',
  p_triage_state := 'acknowledged',
  p_actor        := 'cc-0017e/v-d/actor-1'
);

SELECT change_kind, (after_row->>'triaged_at') IS NOT NULL AS triaged_at_set,
                    (after_row->>'triaged_by') AS triaged_by
FROM friction.case_history
WHERE case_id = '<v_d_compat_id>' AND change_kind = 'compat_legacy_triage';
```

Expected: 1 row. triaged_at_set=true, triaged_by='cc-0017e/v-d/actor-1'.

---

## V-E — Negative tests

### V-E1 — case_history CHECK constraint rejects invalid change_kind

Attempted as postgres owner via apply_migration:
```sql
INSERT INTO friction.case_history (case_id, changed_by, change_kind, before_row, after_row)
VALUES ('<v_d_case_id>', 'test', 'bogus_kind', NULL, NULL);
```
Expected: ERRCODE 23514 (check_violation).

### V-E2 — case_history FK rejects orphan case_id

```sql
INSERT INTO friction.case_history (case_id, changed_by, change_kind, before_row, after_row)
VALUES (gen_random_uuid(), 'test', 'triage', NULL, NULL);
```
Expected: ERRCODE 23503 (foreign_key_violation).

### V-E3 — service_role cannot INSERT into case_history

Attempted by switching role:
```sql
SET ROLE service_role;
INSERT INTO friction.case_history (case_id, changed_by, change_kind, before_row, after_row)
VALUES ('<v_d_case_id>', 'test', 'triage', NULL, NULL);
RESET ROLE;
```
Expected: ERRCODE 42501 (insufficient_privilege).

### V-E4 — service_role cannot UPDATE case_history

```sql
SET ROLE service_role;
UPDATE friction.case_history SET change_kind = 'triage' WHERE history_id = (SELECT history_id FROM friction.case_history LIMIT 1);
RESET ROLE;
```
Expected: ERRCODE 42501.

### V-E5 — service_role cannot DELETE from case_history

```sql
SET ROLE service_role;
DELETE FROM friction.case_history WHERE history_id = (SELECT history_id FROM friction.case_history LIMIT 1);
RESET ROLE;
```
Expected: ERRCODE 42501.

### V-E6 — fn_triage_case rejects NULL p_case_id

```sql
SELECT friction.fn_triage_case(p_case_id := NULL, p_triage_state := 'acknowledged');
```
Expected: ERRCODE P0001 with message containing 'p_case_id is required'.

### V-E7 — fn_triage_case rejects nonexistent case_id

```sql
SELECT friction.fn_triage_case(p_case_id := gen_random_uuid(), p_triage_state := 'acknowledged');
```
Expected: ERRCODE P0002 with message containing 'not found in friction.case'.

### V-E8 — Existing cc-0017d negative tests still pass byte-stable

Re-run all 10 V-E negative tests from cc-0017d V-E1–E10 (resolve_case validation, triage_case validation, mark_duplicate validation, reopen_case validation). All should pass unchanged — function patches preserved validation logic byte-stable.

---

## V-F — Backfill effect verification (item D)

### V-F1 — Backfill row counts (corrected expected matrix per design)

```sql
SELECT
  count(*) FILTER (WHERE triage_state = 'acknowledged'
                     AND triaged_by = 'legacy_backfill') AS backfilled_in_case,
  count(*) FILTER (WHERE triage_state = 'acknowledged'
                     AND triaged_at IS NULL) AS remaining_null_triaged_at,
  count(*) FILTER (WHERE triage_state = 'acknowledged'
                     AND triaged_by IS NULL) AS remaining_null_triaged_by
FROM friction."case";
```

Expected matrix:
- backfilled_in_case = 8
- remaining_null_triaged_at = 0
- remaining_null_triaged_by = 0

### V-F2 — Backfill history rows

```sql
SELECT count(*) AS backfill_history_rows
FROM friction.case_history
WHERE change_kind = 'backfill' AND changed_by = 'cc-0017e-backfill';
```

Expected: 8 rows.

### V-F3 — Backfill triaged_at = reviewed_at (every row)

```sql
SELECT count(*) AS mismatches
FROM friction."case"
WHERE triage_state = 'acknowledged'
  AND triaged_by = 'legacy_backfill'
  AND triaged_at IS DISTINCT FROM reviewed_at;
```

Expected: 0.

### V-F4 — before_row/after_row jsonb captures correct delta

```sql
SELECT
  count(*) FILTER (WHERE (before_row->>'triaged_at') IS NULL
                     AND (after_row->>'triaged_at') IS NOT NULL) AS triaged_at_delta_correct,
  count(*) FILTER (WHERE (before_row->>'triaged_by') IS NULL
                     AND (after_row->>'triaged_by') = 'legacy_backfill') AS triaged_by_delta_correct
FROM friction.case_history
WHERE change_kind = 'backfill';
```

Expected: triaged_at_delta_correct = 8 AND triaged_by_delta_correct = 8.

---

## V-Z — Residue cross-checks (CONVENTION CODIFICATION FOR ITEM H)

### Section H — V-Z3 convention codification

> **V-Z convention (canonical statement):**
>
> Every brief introducing mutation functions OR shadow tables MUST include this V-Z section, verifying post-apply on the live database:
>
> 1. **V-Z1 (strict-prefix residue):** zero rows in target tables match the brief's fixture-prefix pattern (slash-prefix convention). Confirms V-D test fixtures fully purged.
> 2. **V-Z2 (baseline count preservation):** baseline row counts in all affected tables equal the pre-apply baseline (after subtracting expected backfill / DDL-inserted rows). Confirms migration did not silently delete or duplicate non-fixture rows.
> 3. **V-Z3 (shadow-table operation alignment):** for briefs introducing or writing to a shadow table, the count of shadow-table rows added during V-D positive smoke equals the count of V-D positive operations exercised. Confirms function patches actually emit the audit row they claim to emit; catches silent INSERT failures from CHECK mismatches, permissions gaps, or exception-swallowed code paths.
>
> V-Z3 is the operation-to-shadow alignment check. Without it, a function patch that silently fails to INSERT history passes positive smoke but leaves the audit trail incomplete.

### V-Z1 — strict-prefix residue (cc-0017e fixtures cleaned)

```sql
SELECT
  (SELECT count(*) FROM friction."case"
     WHERE case_title LIKE 'cc-0017e/%'
        OR category LIKE 'cc-0017e/%'
        OR problem_key LIKE 'cc-0017e/%') AS case_residue,
  (SELECT count(*) FROM friction.case_history
     WHERE changed_by LIKE 'cc-0017e/v-d/%') AS history_residue,
  (SELECT count(*) FROM friction.emit_error
     WHERE source_event_id LIKE 'cc-0017e/%') AS emit_error_residue;
```

Expected: all three = 0 AFTER V-D fixture cleanup via friction.purge_test_case('cc-0017e/v-d/%').

Note: `friction.purge_test_case` (cc-0017d L-v2.85-d realised) is the canonical purge helper.

### V-Z2 — baseline count preservation

```sql
SELECT
  (SELECT count(*) FROM friction."case") AS total_cases,
  (SELECT count(*) FROM friction.event) AS total_events,
  (SELECT count(*) FROM friction.source) AS total_sources,
  (SELECT count(*) FROM friction.category) AS total_categories;
```

Expected (matches v2.87 sync_state baseline):
- total_cases = 29
- total_events = 29
- total_sources = 3
- total_categories = unchanged (capture pre-apply value)

If V-D fixtures introduced extra cases that were NOT cleaned: failure mode. Run V-Z1 cleanup first.

### V-Z3 — shadow-table operation alignment (NEW; CONVENTION CODIFICATION)

V-D exercises this operation count (per V-D matrix above):
- 1× triage_case (V-D1)
- 1× resolve_case (V-D2)
- 1× reopen_case (V-D3)
- 1× record_first_view positive (V-D4 first call)
- 1× mark_duplicate (V-D5)
- 1× fn_triage_case (V-D6)

Total expected V-D positive operations: 6 → 6 case_history rows.

Plus item D backfill: 8 case_history rows with change_kind='backfill'.

Total post-apply case_history rows from this migration: 6 (V-D) + 8 (backfill) = 14.

```sql
-- BEFORE V-D fixture cleanup: 14 expected
-- AFTER V-D fixture cleanup: 8 expected (V-D rows purged with fixtures; backfill rows survive)

SELECT change_kind, count(*) AS history_rows
FROM friction.case_history
GROUP BY change_kind
ORDER BY change_kind;
```

**Expected matrix (POST V-D cleanup):**

| change_kind | history_rows |
|---|---|
| backfill | 8 |

**Expected matrix (POST V-D BUT PRE-cleanup) — captured during V-check window:**

| change_kind | history_rows |
|---|---|
| triage | 1 |
| resolve | 1 |
| reopen | 1 |
| first_view | 1 |
| mark_duplicate | 1 |
| compat_legacy_triage | 1 |
| backfill | 8 |

Total pre-cleanup: 14. **V-Z3 PASS condition: pre-cleanup totals match operation counts exactly.** Drift here = silent INSERT failure inside one of the mutation function patches.

---

## V-check execution order

1. V-A1 (signature byte-match) — abort if FAIL before any further checks
2. V-A2 (fn_triage_case body recognition)
3. V-B1, V-B2 (security attributes)
4. V-C1 (grant matrix)
5. V-F1, V-F2, V-F3, V-F4 (backfill effect — runs without V-D fixtures)
6. V-D-setup (4 fixture cases via apply_migration)
7. V-D1–V-D6 (positive smoke)
8. V-E1–V-E8 (negative tests)
9. V-Z3 (shadow-table alignment — pre-cleanup count snapshot)
10. V-D fixture cleanup via friction.purge_test_case('cc-0017e/v-d/%')
11. V-Z1, V-Z2 (residue + baseline) — post-cleanup
12. V-Z3 (post-cleanup count snapshot — 8 backfill rows survive)

Any strict FAIL = brief-level disposition (Path A re-author OR Path B-prime inline correction OR PK escalation).

---

## V-check disposition matrix

| V-check | Strict FAIL action |
|---|---|
| V-A1 | ABORT — substitution-class drift; fix migration-sql.md |
| V-A2 | ABORT — body did not patch correctly; re-apply |
| V-B1–B2 | ABORT — security attribute regression |
| V-C1 | Path B-prime — inline GRANT/REVOKE correction migration |
| V-D1–D6 | ABORT — function patch broken |
| V-E1–E8 | PK escalation — security/validation regression |
| V-F1–F4 | Path B-prime — backfill correction; investigate root cause |
| V-Z1 | Path B-prime — cleanup migration v2 (cc-0017d pattern) |
| V-Z2 | PK escalation — baseline count drift |
| V-Z3 | PK escalation — silent INSERT failure in patch surface (CONVENTION GAP) |
