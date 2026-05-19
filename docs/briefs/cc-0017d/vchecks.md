# cc-0017d — §5.3 V-checks

**Part of:** [`cc-0017d-friction-case-mutation-functions.md`](../cc-0017d-friction-case-mutation-functions.md)
**Prev:** [`migration-sql.md`](migration-sql.md) **Next:** [`hardstop-rollback.md`](hardstop-rollback.md)

---

V-checks run via `execute_sql` (NOT `apply_migration`) post-apply. All 6 new functions are SECURITY DEFINER + postgres-owned, so `execute_sql` (authenticated context) can invoke them via the granted EXECUTE permissions. Direct DML on `friction.case`/`event`/`emit_error` is locked down — fixtures must be seeded via `friction.emit_event` (SECDEF + service_role/authenticated EXECUTE per P-ζ).

**Test data namespace:**
- `source_event_id` prefix: `cc-0017d-test/`
- `problem_key` prefix: `cc-0017d-test/`
- `observation_text` prefix: `cc-0017d-test/`
- `case_title` will be derived by emit_event from observation_text/problem_key

All test fixtures cleaned by V-F1 (`purge_test_case`) as the final smoke test. V-Z1 confirms zero residue.

---

## V-A — Function signature verification (L-v2.85-a HIGH-SIGNAL discipline)

### V-A1 — All 6 deployed signatures match brief expectations

```sql
SELECT
  proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_function_result(p.oid)             AS rettype
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction'
  AND proname IN ('triage_case','resolve_case','reopen_case',
                  'mark_duplicate','record_first_view','purge_test_case')
ORDER BY proname;
```

**Expected: 6 rows, byte-exact match:**

| proname | args | rettype |
|---|---|---|
| mark_duplicate | `p_case_id uuid, p_predecessor_case_id uuid, p_actor text` | `TABLE(out_case_id uuid, out_predecessor_case_id uuid, out_resolved_at timestamp with time zone)` |
| purge_test_case | `p_pattern text` | `TABLE(out_events_deleted integer, out_cases_deleted integer, out_errors_deleted integer)` |
| record_first_view | `p_case_id uuid, p_actor text` | `TABLE(out_case_id uuid, out_first_viewed_at timestamp with time zone, out_was_already_viewed boolean)` |
| reopen_case | `p_case_id uuid, p_actor text, p_clear_action_decision boolean` | `TABLE(out_case_id uuid, out_reopen_count integer, out_prior_resolution_kind text)` |
| resolve_case | `p_case_id uuid, p_resolution_kind text, p_actor text` | `TABLE(out_case_id uuid, out_resolved_at timestamp with time zone, out_resolution_kind text)` |
| triage_case | `p_case_id uuid, p_action_decision text, p_actor text, p_effort_level text, p_next_review_at timestamp with time zone` | `TABLE(out_case_id uuid, out_triaged_at timestamp with time zone, out_action_decision text, out_triage_state text)` |

**Failure mode:** any mismatch on args or rettype → V-A1 FAIL → hard-stop §5.4-B1 (signature drift; investigate apply_migration result).

---

## V-B — Security mode + owner verification

### V-B1 — All 6 are SECURITY DEFINER + postgres-owned + correct search_path

```sql
SELECT
  proname,
  prosecdef                            AS is_security_definer,
  pg_get_userbyid(proowner)            AS owner,
  proconfig                            AS settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction'
  AND proname IN ('triage_case','resolve_case','reopen_case',
                  'mark_duplicate','record_first_view','purge_test_case')
ORDER BY proname;
```

**Expected: 6 rows.** Each: `is_security_definer = true`, `owner = 'postgres'`, `settings = {"search_path=friction, public"}` (Postgres normalises whitespace to exactly this form).

---

## V-C — Grant matrix verification

### V-C1 — All 6 grants match §4 matrix

```sql
SELECT
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'friction'
  AND routine_name IN ('triage_case','resolve_case','reopen_case',
                       'mark_duplicate','record_first_view','purge_test_case')
ORDER BY routine_name, grantee;
```

**Expected per function:**

| routine_name | grantee | privilege_type |
|---|---|---|
| triage_case | authenticated | EXECUTE |
| triage_case | postgres | EXECUTE |
| triage_case | service_role | EXECUTE |
| resolve_case | authenticated | EXECUTE |
| resolve_case | postgres | EXECUTE |
| resolve_case | service_role | EXECUTE |
| reopen_case | authenticated | EXECUTE |
| reopen_case | postgres | EXECUTE |
| reopen_case | service_role | EXECUTE |
| mark_duplicate | authenticated | EXECUTE |
| mark_duplicate | postgres | EXECUTE |
| mark_duplicate | service_role | EXECUTE |
| record_first_view | authenticated | EXECUTE |
| record_first_view | postgres | EXECUTE |
| record_first_view | service_role | EXECUTE |
| purge_test_case | postgres | EXECUTE |
| purge_test_case | service_role | EXECUTE |

**Total: 17 rows** (16 for functions 1-5 = 5×3, plus 2 for purge_test_case (postgres + service_role only), minus zero — wait that's 5×3=15 + 2 = 17 ✅).

### V-C2 — purge_test_case NOT granted to authenticated

```sql
SELECT count(*) AS bad_grants
FROM information_schema.routine_privileges
WHERE routine_schema = 'friction'
  AND routine_name = 'purge_test_case'
  AND grantee = 'authenticated';
```

**Expected: `bad_grants = 0`.**

---

## V-D — Positive smoke tests

### V-D-setup — Seed 7 fixture cases via emit_event

```sql
-- v-d-001 — triage smoke target (starts new)
SELECT * FROM friction.emit_event(
  p_source            := 'manual',
  p_condition_key     := 'cc_0017d_test_001',
  p_problem_key       := 'cc-0017d-test/triage-smoke',
  p_source_event_id   := 'cc-0017d-test/v-d-001',
  p_observed_at       := now(),
  p_observation_text  := 'cc-0017d-test/v-d-001 triage smoke fixture'
);
-- v-d-002 — resolve smoke target (will be pre-triaged via friction.triage_case)
SELECT * FROM friction.emit_event(
  p_source            := 'manual',
  p_condition_key     := 'cc_0017d_test_002',
  p_problem_key       := 'cc-0017d-test/resolve-smoke',
  p_source_event_id   := 'cc-0017d-test/v-d-002',
  p_observed_at       := now(),
  p_observation_text  := 'cc-0017d-test/v-d-002 resolve smoke fixture'
);
-- v-d-003 — reopen smoke target (will be pre-resolved)
SELECT * FROM friction.emit_event(
  p_source            := 'manual',
  p_condition_key     := 'cc_0017d_test_003',
  p_problem_key       := 'cc-0017d-test/reopen-smoke',
  p_source_event_id   := 'cc-0017d-test/v-d-003',
  p_observed_at       := now(),
  p_observation_text  := 'cc-0017d-test/v-d-003 reopen smoke fixture'
);
-- v-d-004 — mark_duplicate smoke target
SELECT * FROM friction.emit_event(
  p_source            := 'manual',
  p_condition_key     := 'cc_0017d_test_004',
  p_problem_key       := 'cc-0017d-test/dupe-smoke',
  p_source_event_id   := 'cc-0017d-test/v-d-004',
  p_observed_at       := now(),
  p_observation_text  := 'cc-0017d-test/v-d-004 mark_duplicate target'
);
-- v-d-005 — mark_duplicate predecessor
SELECT * FROM friction.emit_event(
  p_source            := 'manual',
  p_condition_key     := 'cc_0017d_test_005',
  p_problem_key       := 'cc-0017d-test/dupe-predecessor',
  p_source_event_id   := 'cc-0017d-test/v-d-005',
  p_observed_at       := now(),
  p_observation_text  := 'cc-0017d-test/v-d-005 mark_duplicate predecessor'
);
-- v-d-006 — record_first_view smoke target
SELECT * FROM friction.emit_event(
  p_source            := 'manual',
  p_condition_key     := 'cc_0017d_test_006',
  p_problem_key       := 'cc-0017d-test/first-view-smoke',
  p_source_event_id   := 'cc-0017d-test/v-d-006',
  p_observed_at       := now(),
  p_observation_text  := 'cc-0017d-test/v-d-006 record_first_view smoke fixture'
);
-- v-d-007 — V-E2 fixture (used in negative test for missing next_review_at)
SELECT * FROM friction.emit_event(
  p_source            := 'manual',
  p_condition_key     := 'cc_0017d_test_007',
  p_problem_key       := 'cc-0017d-test/missing-next-review',
  p_source_event_id   := 'cc-0017d-test/v-d-007',
  p_observed_at       := now(),
  p_observation_text  := 'cc-0017d-test/v-d-007 negative test for track without next_review'
);
```

**Expected:** 7 successful emit_event calls; each returns a `(event_id, case_id, case_disposition)` row. Capture case_ids for downstream V-D/V-E calls (lookup by `source_event_id`).

### V-D1 — friction.triage_case happy path (track + next_review_at)

```sql
SELECT * FROM friction.triage_case(
  p_case_id          := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-001%' LIMIT 1),
  p_action_decision  := 'track',
  p_actor            := 'cc-0017d-vcheck',
  p_effort_level     := 'moderate',
  p_next_review_at   := now() + interval '7 days'
);
```

**Expected:** 1 row. `out_action_decision = 'track'`, `out_triage_state = 'acknowledged'`, `out_triaged_at IS NOT NULL` and equals approximately now().

### V-D2 — friction.resolve_case happy path (after triage)

```sql
-- First triage as 'track' with next_review_at
SELECT friction.triage_case(
  p_case_id := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-002%' LIMIT 1),
  p_action_decision := 'track',
  p_next_review_at  := now() + interval '7 days'
);
-- Then resolve with matching resolution_kind
SELECT * FROM friction.resolve_case(
  p_case_id         := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-002%' LIMIT 1),
  p_resolution_kind := 'tracked_done',
  p_actor           := 'cc-0017d-vcheck'
);
```

**Expected:** 1 row. `out_resolved_at IS NOT NULL`, `out_resolution_kind = 'tracked_done'`.

### V-D3 — friction.reopen_case happy path

```sql
-- Use v-d-002 which is now resolved (from V-D2)
SELECT * FROM friction.reopen_case(
  p_case_id := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-002%' LIMIT 1),
  p_actor   := 'cc-0017d-vcheck'
);
```

**Expected:** 1 row. `out_reopen_count = 1` (was 0), `out_prior_resolution_kind = 'tracked_done'`. Post-call `friction.case.resolved_at IS NULL` and `resolution_kind = 'reopened'`.

### V-D4 — friction.mark_duplicate happy path

```sql
SELECT * FROM friction.mark_duplicate(
  p_case_id             := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-004%' LIMIT 1),
  p_predecessor_case_id := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-005%' LIMIT 1),
  p_actor               := 'cc-0017d-vcheck'
);
```

**Expected:** 1 row. `out_predecessor_case_id` matches v-d-005's case_id. `out_resolved_at IS NOT NULL`. Post-call: triage_state=duplicate, action_decision=duplicate, resolution_kind=duplicate. Expected side-effect: 1 row inserted into `friction.emit_error` with `error_code = 'CROSS-FINGERPRINT-DUPLICATE'` since v-d-004 and v-d-005 have different problem_keys → different fingerprints.

### V-D5 — friction.record_first_view idempotency

```sql
-- First call
SELECT * FROM friction.record_first_view(
  p_case_id := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-006%' LIMIT 1),
  p_actor   := 'cc-0017d-vcheck'
);
-- Second call (idempotent — should return was_already_viewed=true)
SELECT * FROM friction.record_first_view(
  p_case_id := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-006%' LIMIT 1),
  p_actor   := 'cc-0017d-vcheck'
);
```

**Expected:** First call returns `out_was_already_viewed = false`, `out_first_viewed_at` set to now(). Second call returns `out_was_already_viewed = true`, `out_first_viewed_at` unchanged from first call.

---

## V-E — Negative validation tests

### V-E1 — triage_case rejects closure-class action_decision

```sql
SELECT * FROM friction.triage_case(
  p_case_id := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-007%' LIMIT 1),
  p_action_decision := 'suppress'
);
```
**Expected:** SQLSTATE `P0001`, message contains `closure-class or invalid`.

### V-E2 — triage_case rejects track without next_review_at

```sql
SELECT * FROM friction.triage_case(
  p_case_id := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-007%' LIMIT 1),
  p_action_decision := 'track'
);
```
**Expected:** SQLSTATE `P0001`, message contains `requires next_review_at`.

### V-E3 — triage_case rejects resolved case

```sql
-- Pre-condition: v-d-004 was resolved by V-D4 (mark_duplicate)
SELECT * FROM friction.triage_case(
  p_case_id := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-004%' LIMIT 1),
  p_action_decision := 'act_now'
);
```
**Expected:** SQLSTATE `P0001`, message contains `is resolved`.

### V-E4 — resolve_case rejects reopened as resolution_kind

```sql
SELECT * FROM friction.resolve_case(
  p_case_id := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-007%' LIMIT 1),
  p_resolution_kind := 'reopened'
);
```
**Expected:** SQLSTATE `P0001`, message contains `transient marker`.

### V-E5 — resolve_case rejects mismatched mapping

```sql
-- v-d-007 should be untriaged (action_decision=NULL); resolve_case should reject any kind
SELECT * FROM friction.resolve_case(
  p_case_id := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-007%' LIMIT 1),
  p_resolution_kind := 'acted_on'
);
```
**Expected:** SQLSTATE `P0001`, message contains `requires action_decision=act_now, but case_id ... has action_decision=NULL`.

### V-E6 — reopen_case rejects open case

```sql
SELECT * FROM friction.reopen_case(
  p_case_id := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-007%' LIMIT 1)
);
```
**Expected:** SQLSTATE `P0001`, message contains `already open`.

### V-E7 — mark_duplicate rejects self-link

```sql
SELECT * FROM friction.mark_duplicate(
  p_case_id             := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-007%' LIMIT 1),
  p_predecessor_case_id := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-007%' LIMIT 1)
);
```
**Expected:** SQLSTATE `P0001`, message contains `no self-link`.

### V-E8 — mark_duplicate rejects non-existent predecessor

```sql
SELECT * FROM friction.mark_duplicate(
  p_case_id             := (SELECT case_id FROM friction.case WHERE case_title LIKE 'cc-0017d-test/v-d-007%' LIMIT 1),
  p_predecessor_case_id := '00000000-0000-0000-0000-000000000000'
);
```
**Expected:** SQLSTATE `P0002`, message contains `predecessor_case_id ... not found`.

### V-E9 — record_first_view rejects non-existent case

```sql
SELECT * FROM friction.record_first_view(
  p_case_id := '00000000-0000-0000-0000-000000000000'
);
```
**Expected:** SQLSTATE `P0002`, message contains `not found`.

### V-E10 — purge_test_case rejects non-conforming pattern

```sql
SELECT * FROM friction.purge_test_case(p_pattern := 'production-data-%');
```
**Expected:** SQLSTATE `P0001`, message contains `must match`.

---

## V-F — Purge self-test

### V-F1 — friction.purge_test_case cleans V-D + V-E fixtures

```sql
SELECT * FROM friction.purge_test_case(p_pattern := 'cc-0017d-test/%');
```

**Expected:** 1 row. `out_events_deleted ≥ 7` (the 7 emit_event calls), `out_cases_deleted ≥ 7` (the 7 cases created), `out_errors_deleted ≥ 1` (the CROSS-FINGERPRINT-DUPLICATE audit row from V-D4).

---

## V-Z — Final invariant

### V-Z1 — Zero cc-0017d-test/ residue across all 3 tables

```sql
SELECT
  (SELECT count(*) FROM friction.event       WHERE observation_text LIKE 'cc-0017d-test/%' OR source_event_id LIKE 'cc-0017d-test/%') AS events_left,
  (SELECT count(*) FROM friction.case        WHERE case_title LIKE 'cc-0017d-test/%')                                                  AS cases_left,
  (SELECT count(*) FROM friction.emit_error  WHERE source_event_id LIKE 'cc-0017d-test/%')                                             AS errors_left;
```

**Expected:** `events_left = 0`, `cases_left = 0`, `errors_left = 0`. If any > 0, V-F1 didn't catch all residue → investigate before close.

### V-Z2 — Production case count returned to pre-V-D baseline

```sql
SELECT count(*) AS total_cases FROM friction.case;
```

**Expected:** Equal to P-6 baseline `total_cases` value (typically 29; tolerate +0–5 drift from concurrent cron 85/86 events between baseline capture and V-Z2 run). Specifically: `V-Z2.total_cases <= P-6.total_cases + 5`.

---

**V-check count summary:** V-A1 (1) + V-B1 (1) + V-C1+C2 (2) + V-D setup + V-D1-D5 (6) + V-E1-E10 (10) + V-F1 (1) + V-Z1+Z2 (2) = **23 V-checks**.

**Hard-stop conditions on V-check failure:** see [`hardstop-rollback.md §5.4`](hardstop-rollback.md).
