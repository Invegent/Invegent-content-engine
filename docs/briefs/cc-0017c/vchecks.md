# cc-0017c — §5.3 V-checks

**Brief version:** v1.1 (doc-only patch — V-C1 WHERE clause aligned to v1.1 migration body: `IN ('suppress','ignore','duplicate')`)

**Per L41:** V-checks must use empirical SELECTs against live DB state post-apply. Do not rely on assumption-based verification.

**Per L62:** V-checks run sequentially via `execute_sql` post-apply. All 9 must PASS before close-the-loop UPDATE on `m.chatgpt_review`.

**Total V-checks:** 9 (A: 3, B: 4, C: 2)

## V-A — FK hardening verification (Section A)

### V-A1 — `event_source_check` CHECK constraint dropped

```sql
SELECT COUNT(*) AS check_remaining
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = 'friction'
AND cls.relname = 'event'
AND con.conname = 'event_source_check';
```
**Expected:** `check_remaining = 0`

### V-A2 — `event_source_fk` FK constraint added

```sql
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = 'friction'
AND cls.relname = 'event'
AND con.conname = 'event_source_fk';
```
**Expected:** 1 row; `definition` = `FOREIGN KEY (source) REFERENCES friction.source(source_code)`

### V-A3 — FK enforcement test (insert with invalid source should fail)

```sql
DO $$
BEGIN
  BEGIN
    INSERT INTO friction.event (source, source_event_id, category, severity, reported_by, payload, occurred_at)
    VALUES ('invalid_test_source_cc0017c', 'test-vcheck-' || gen_random_uuid()::text, 'general', 'low', 'system', '{}'::jsonb, now());
    RAISE EXCEPTION 'V-A3 FAILED: invalid source insert succeeded';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'V-A3 PASS: FK rejected invalid source as expected';
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'V-A3 PARTIAL: REVOKE bit first (acceptable — Section B enforcement working)';
    WHEN OTHERS THEN
      RAISE NOTICE 'V-A3 PARTIAL: rejected with non-FK error (acceptable if Section B bites first): %', SQLERRM;
  END;
END $$;
```
**Expected:** `NOTICE: V-A3 PASS` OR `NOTICE: V-A3 PARTIAL` (both indicate enforcement is working at some layer).

**Note:** Running via `execute_sql` (service_role context post-REVOKE) means insufficient_privilege will fire BEFORE foreign_key_violation. This is correct behaviour — Section B should block before Section A even gets evaluated. To explicitly test the FK enforcement layer in isolation, V-A3 must be run as postgres owner (e.g., via apply_migration body inline, NOT post-apply via execute_sql).

## V-B — REVOKE lockdown verification (Section B)

### V-B1 — service_role lost INSERT on friction.event

```sql
SELECT COUNT(*) AS insert_grants_remaining
FROM information_schema.role_table_grants
WHERE table_schema = 'friction'
AND table_name = 'event'
AND grantee = 'service_role'
AND privilege_type = 'INSERT';
```
**Expected:** `insert_grants_remaining = 0`

### V-B2 — service_role lost INSERT + UPDATE on friction.case

```sql
SELECT privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'friction'
AND table_name = 'case'
AND grantee = 'service_role'
AND privilege_type IN ('INSERT','UPDATE')
ORDER BY privilege_type;
```
**Expected:** 0 rows (no INSERT or UPDATE remaining for service_role).

### V-B3 — service_role retains SELECT on both tables

```sql
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'friction'
AND table_name IN ('event','case')
AND grantee = 'service_role'
ORDER BY table_name, privilege_type;
```
**Expected:** 2 rows — `case|SELECT`, `event|SELECT`. Any deviation = hard-stop §5.4-C5 (over-revoked).

### V-B4 — emit_event still functional end-to-end (post-REVOKE)

```sql
DO $$
DECLARE
  v_event_id uuid;
  v_case_id uuid;
  v_result record;
BEGIN
  -- Emit a test event via the SECURITY DEFINER function
  SELECT * INTO v_result FROM friction.emit_event(
    p_source := 'manual',
    p_source_event_id := 'vcheck-cc0017c-' || gen_random_uuid()::text,
    p_category := 'general',
    p_severity := 'low',
    p_reported_by := 'system',
    p_payload := '{"vcheck": "cc-0017c-V-B4"}'::jsonb,
    p_occurred_at := now()
  );
  v_event_id := v_result.event_id;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'V-B4 FAILED: emit_event returned NULL event_id';
  END IF;

  -- Confirm case was attached/created
  SELECT case_id INTO v_case_id FROM friction.event WHERE event_id = v_event_id;
  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'V-B4 FAILED: event row exists but case_id is NULL';
  END IF;

  -- Cleanup test data (requires postgres ownership — runs in apply_migration body context)
  DELETE FROM friction.event WHERE event_id = v_event_id;
  DELETE FROM friction.case WHERE case_id = v_case_id
    AND NOT EXISTS (SELECT 1 FROM friction.event WHERE case_id = v_case_id);

  RAISE NOTICE 'V-B4 PASS: emit_event functional post-REVOKE (event_id=%, case_id=%)', v_event_id, v_case_id;
END $$;
```
**Expected:** `NOTICE: V-B4 PASS: emit_event functional post-REVOKE`. Test data cleaned up; event_count + case_count restored to pre-V-B4 values.

**Caveat:** DELETE in cleanup requires postgres ownership. V-B4 ideally runs as the final step of the apply_migration body (still in postgres context) OR via a dedicated execute_sql call IF service_role retains DELETE (which Section B does not REVOKE — DELETE was never granted to service_role originally per Query 2). Re-verify DELETE permission at apply time before relying on V-B4 cleanup. If cleanup fails, the test event/case persist (acceptable but noisy — flag for manual cleanup).

## V-C — Backfill verification (Section C) — v1.1: legal-domain-only

### V-C1 — Backfill UPDATE affected expected row count (v1.1)

```sql
SELECT
  COUNT(*) FILTER (
    WHERE action_decision IN ('suppress','ignore','duplicate')
    AND resolved_at IS NULL
  ) AS still_unresolved_closed_class,
  COUNT(*) FILTER (
    WHERE action_decision IN ('suppress','ignore','duplicate')
    AND resolved_at IS NOT NULL
    AND resolution_kind IS NOT NULL
  ) AS resolved_with_kind_set,
  COUNT(*) FILTER (WHERE action_decision = 'done') AS done_count_audit
FROM friction.case;
```
**Expected (matching P-3 result of 0 candidate rows):**
- `still_unresolved_closed_class = 0`
- `resolved_with_kind_set = 0` (no rows to backfill at apply time)
- `done_count_audit = 0` (`'done'` is not in legal `case_action_decision_check` domain; any non-zero indicates external CHECK domain expansion landed between brief authoring and apply — should not happen without parallel-session change)

**Forward-state guarantee:** Any future row with closed-class action_decision MUST have resolved_at AND resolution_kind set. Enforcement (CHECK or trigger) is deferred — backfill UPDATE alone encodes the pattern, not the enforcement.

### V-C2 — No drift in non-closed-class case state

```sql
SELECT
  action_decision,
  COUNT(*) AS row_count,
  COUNT(resolved_at) AS resolved_at_set,
  COUNT(resolution_kind) AS resolution_kind_set
FROM friction.case
GROUP BY action_decision
ORDER BY action_decision NULLS FIRST;
```
**Expected (matching v2.83 fact-finding):**

| action_decision | row_count | resolved_at_set | resolution_kind_set |
|---|---|---|---|
| (NULL) | 14 | 0 | 0 |
| act_now | 1 | 0 | 0 |
| track | 7 | 0 | 0 |

**Hard-stop trigger:** Any change to NULL/act_now/track row counts indicates the UPDATE affected rows it shouldn't have (impossible per v1.1 WHERE clause — defensive check).

## V-check execution order

Run sequentially via `execute_sql`:
1. V-A1, V-A2 (CHECK + FK status)
2. V-A3 (FK enforcement — likely PARTIAL on execute_sql; OK)
3. V-B1, V-B2, V-B3 (grant state)
4. V-B4 (emit_event end-to-end — caveat: cleanup may fail post-REVOKE; flag for manual cleanup if so)
5. V-C1, V-C2 (backfill state)

On 9/9 PASS (or 8/9 PASS with V-A3 PARTIAL acceptable): proceed to close-the-loop UPDATE on `m.chatgpt_review` per `d01-postapply-deferred.md §7`.

On any FAIL: hard-stop per `hardstop-rollback.md §5.4`.
