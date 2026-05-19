# cc-0017d — §5.1 Pre-flight P-set

**Part of:** [`cc-0017d-friction-case-mutation-functions.md`](../cc-0017d-friction-case-mutation-functions.md)
**Prev:** [`risks-and-grants.md`](risks-and-grants.md) **Next:** [`migration-sql.md`](migration-sql.md)

---

These queries are **read-only** and MUST be re-run via `execute_sql` against production immediately before D-01 fire AND again immediately before `apply_migration`. Any drift from brief-authoring reference values (§1.1 of main file) triggers hard-stop §5.4-A1.

P-1 captures the grant matrix as JSON for exact rollback (cc-0017c pattern).
P-2 through P-7 are drift-detection re-runs of the original probes plus apply-time additions (P-7 = postgres DELETE check; P-8 = authenticated role existence; P-9 = case_id reservation for V-checks).

---

## P-1 — Grant matrix snapshot as JSON (for rollback fidelity)

```sql
SELECT jsonb_build_object(
  'case_grants', (
    SELECT jsonb_agg(jsonb_build_object('grantee', grantee, 'privilege', privilege_type) ORDER BY grantee, privilege_type)
    FROM information_schema.table_privileges
    WHERE table_schema = 'friction' AND table_name = 'case'
  ),
  'event_grants', (
    SELECT jsonb_agg(jsonb_build_object('grantee', grantee, 'privilege', privilege_type) ORDER BY grantee, privilege_type)
    FROM information_schema.table_privileges
    WHERE table_schema = 'friction' AND table_name = 'event'
  ),
  'emit_error_grants', (
    SELECT jsonb_agg(jsonb_build_object('grantee', grantee, 'privilege', privilege_type) ORDER BY grantee, privilege_type)
    FROM information_schema.table_privileges
    WHERE table_schema = 'friction' AND table_name = 'emit_error'
  )
) AS grant_snapshot;
```

**Expected at apply time:** case + event = postgres full + service_role SELECT only; emit_error = current cc-0014 state (postgres full + service_role INSERT/SELECT/UPDATE per cc-0014 baseline). **Record output verbatim before apply; rollback restores exactly this.**

## P-2 — Function naming collision drift check

```sql
SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction'
  AND proname IN ('triage_case','resolve_case','reopen_case',
                  'mark_duplicate','record_first_view','purge_test_case','purge_test_event');
-- Expected at apply time: 0 rows
```

## P-3 — CHECK domain drift check

```sql
SELECT conname, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'friction' AND t.relname = 'case' AND c.contype = 'c'
  AND conname IN (
    'case_action_decision_check',
    'case_triage_state_check',
    'case_resolution_kind_check',
    'case_effort_level_check',
    'case_severity_check',
    'suppress_requires_reason',
    'track_or_defer_requires_next_review'
  )
ORDER BY conname;
```

**Expected at apply time:** 7 rows; definitions byte-identical to §1.1 of main file. If any CHECK has been altered between authoring and apply, hard-stop.

## P-4 — `fn_triage_case` shape stability

```sql
SELECT
  p.prosecdef AS is_security_definer,
  pg_get_userbyid(p.proowner) AS owner,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction' AND p.proname = 'fn_triage_case';
```

**Expected:** `true | postgres | p_case_id uuid, p_triage_state text, p_category text, p_quality_flag boolean, p_capture_reason text, p_capture_reason_note text, p_action_decision text, p_next_review_at timestamp with time zone, p_suppression_reason text, p_notes text`. If owner shifted to non-postgres or SECDEF flag flipped, hard-stop (legacy function broke since authoring).

## P-5 — emit_event signature stability (L-v2.85-a discipline)

```sql
SELECT pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction' AND p.proname = 'emit_event';
```

**Expected:** `p_source text, p_condition_key text, p_problem_key text, p_source_event_id text, p_observed_at timestamp with time zone, p_related_object jsonb, p_observation_text text, p_raw_payload jsonb, p_reported_by text, p_severity_override text, p_category_override text, p_dynamic_context jsonb` (12 params). L-v2.85-a discipline: V-checks reference this verbatim.

## P-6 — Lifecycle bucket baseline (V-check comparison anchor)

```sql
SELECT
  count(*) FILTER (WHERE resolved_at IS NULL)            AS open_cases,
  count(*) FILTER (WHERE resolved_at IS NOT NULL)        AS resolved_cases,
  count(*) FILTER (WHERE triaged_at IS NOT NULL)         AS triaged_count,
  count(*) FILTER (WHERE reviewed_at IS NOT NULL)        AS reviewed_count,
  count(*) FILTER (WHERE first_viewed_at IS NOT NULL)    AS first_viewed_count,
  count(*) FILTER (WHERE predecessor_case_id IS NOT NULL) AS dupe_linked_count,
  count(*) FILTER (WHERE triage_state = 'acknowledged')   AS acknowledged_count,
  count(*) FILTER (WHERE triage_state = 'new')            AS new_count,
  count(*)                                                AS total_cases
FROM friction.case;
```

**Authoring reference (record at apply time; expect small drift from new cron 85 events):**
```
open_cases=29  resolved_cases=0  triaged_count=0  reviewed_count=8
first_viewed_count=0  dupe_linked_count=0  acknowledged_count=8
new_count=21  total_cases=29
```

Drift envelope: open_cases may grow up to +5 between authoring and apply (cron 85 nightly fires ≈17:30 UTC + cron 86 ≈02:00 UTC). resolved_count, first_viewed_count, dupe_linked_count MUST remain 0 (no other code path sets them). Acknowledged_count may grow if PK dashboards triggered fn_triage_case manually.

## P-7 — Postgres role DELETE confirmation (purge_test_case prerequisite)

```sql
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'friction'
  AND table_name IN ('event','case','emit_error')
  AND grantee = 'postgres'
  AND privilege_type = 'DELETE'
ORDER BY table_name;
-- Expected: 3 rows (event, case, emit_error all postgres DELETE)
```

## P-8 — Authenticated role existence + grant target verification

```sql
SELECT rolname
FROM pg_roles
WHERE rolname IN ('service_role','authenticated','anon','postgres','PUBLIC')
ORDER BY rolname;
-- Expected: 4 rows (postgres, service_role, authenticated, anon — PUBLIC is implicit, not in pg_roles)
```

## P-9 — Test case_id reservation (V-check fixture namespace)

V-checks use UUIDs in the namespace `00000000-0000-0000-0000-cc0017d0NNNN`. Confirm none currently exist:

```sql
SELECT count(*) AS collisions
FROM friction.case
WHERE case_id::text LIKE '00000000-0000-0000-0000-cc0017d0%';
-- Expected: 0
```

## P-10 — friction.category active set (test inserts use 'operator_friction')

```sql
SELECT category_code
FROM friction.category
WHERE category_code = 'operator_friction' AND is_active = true;
-- Expected: 1 row
```

Hard-stop §5.4 references P-3, P-4, P-5, P-6, P-10 by row count and content equality. P-1 is informational (captured for rollback). P-2, P-7, P-8, P-9 are binary (presence/absence drift gates).

**Hard-stop trigger:** if any of P-2 returns ≥ 1 row, OR P-3 returns ≠ 7 rows with non-matching definitions, OR P-4 returns non-postgres owner or `is_security_definer=false`, OR P-5 returns ≠ the 12-param emit_event signature byte-for-byte, OR P-7 returns ≠ 3 rows, OR P-8 returns < 4 rows including service_role and authenticated, OR P-9 returns > 0 collisions, OR P-10 returns 0 rows → **do not fire D-01; do not apply.** Refresh brief.
