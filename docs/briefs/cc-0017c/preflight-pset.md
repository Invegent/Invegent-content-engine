# cc-0017c — §5.1 Pre-flight P-set

**Per L62 + ICE-PROC-001:** Pre-flight P-set must be re-run immediately before apply, AND results captured in D-01 evidence package. If drift detected between brief-authoring P-set (this file's expected values) and apply-time P-set, hard-stop per `hardstop-rollback.md §5.4-A1`.

## P-1 — Capture current grants on friction.event + friction.case as JSON

**Purpose:** Authoritative snapshot for exact rollback. **NOT** the design-time reference in `risks-and-grants.md §4` — the live snapshot is authoritative.

**SQL:**
```sql
SELECT jsonb_build_object(
  'captured_at', now(),
  'friction_event_grants', (
    SELECT jsonb_agg(jsonb_build_object(
      'grantee', grantee,
      'privilege_type', privilege_type,
      'is_grantable', is_grantable
    ) ORDER BY grantee, privilege_type)
    FROM information_schema.role_table_grants
    WHERE table_schema = 'friction' AND table_name = 'event'
  ),
  'friction_case_grants', (
    SELECT jsonb_agg(jsonb_build_object(
      'grantee', grantee,
      'privilege_type', privilege_type,
      'is_grantable', is_grantable
    ) ORDER BY grantee, privilege_type)
    FROM information_schema.role_table_grants
    WHERE table_schema = 'friction' AND table_name = 'case'
  )
) AS preflight_grants_snapshot;
```

**Expected at apply (from v2.83 fact-finding):** matches `risks-and-grants.md §4` design-time reference. Capture deviations as drift.

**Use:** D-01 evidence (`current_evidence` field) + rollback exact-restore body in `hardstop-rollback.md §5.5-B`.

## P-2 — FK validity probe on friction.event.source

**Purpose:** Confirm no orphan rows before FK swap. Hard-stop if any row's source doesn't map to a friction.source row.

**SQL:**
```sql
SELECT
  e.source AS event_source_value,
  COUNT(*) AS event_count,
  s.source_code AS friction_source_match,
  s.is_active,
  CASE
    WHEN s.source_code IS NULL THEN 'FK_VIOLATION_ORPHAN'
    WHEN s.is_active = false THEN 'FK_VALID_BUT_INACTIVE_SOURCE'
    ELSE 'FK_VALID'
  END AS fk_validity
FROM friction.event e
LEFT JOIN friction.source s ON s.source_code = e.source
GROUP BY e.source, s.source_code, s.is_active
ORDER BY e.source;
```

**Expected at apply (from v2.83 fact-finding):**

| event_source_value | event_count | friction_source_match | is_active | fk_validity |
|---|---|---|---|---|
| health_check | 5 | health_check | true | FK_VALID |
| manual | 8 | manual | true | FK_VALID |
| reconciliation | 9 | reconciliation | true | FK_VALID |

**Hard-stop trigger:** Any row with `fk_validity = 'FK_VIOLATION_ORPHAN'` → hard-stop per `hardstop-rollback.md §5.4-A2`. `FK_VALID_BUT_INACTIVE_SOURCE` is acceptable (FK references source_code as PK, which is active-agnostic; is_active is a soft flag).

## P-3 — Backfill candidate count

**Purpose:** Capture exact row count that will be affected by Section C UPDATE.

**SQL:**
```sql
SELECT
  COUNT(*) FILTER (
    WHERE action_decision IN ('suppress','ignore','duplicate','done')
    AND resolved_at IS NULL
  ) AS backfill_candidate_count,
  COUNT(*) FILTER (
    WHERE action_decision IN ('suppress','ignore','duplicate','done')
  ) AS closed_class_total,
  COUNT(*) FILTER (WHERE action_decision IS NULL) AS null_count,
  COUNT(*) FILTER (WHERE action_decision = 'track') AS track_count,
  COUNT(*) FILTER (WHERE action_decision = 'act_now') AS act_now_count,
  COUNT(*) FILTER (WHERE action_decision = 'defer_intentionally') AS defer_intentionally_count,
  COUNT(*) AS total_cases
FROM friction.case;
```

**Expected at apply (from v2.83 fact-finding):**
- `backfill_candidate_count = 0`
- `closed_class_total = 0`
- `null_count = 14`
- `track_count = 7`
- `act_now_count = 1`
- `defer_intentionally_count = 0`
- `total_cases = 22`

**Hard-stop trigger:** `backfill_candidate_count` value diverges from `0` AND PK has not explicitly approved the diverged count post-fact → hard-stop per `hardstop-rollback.md §5.4-A3`. Drift requires PK decision before proceeding.

## P-4 — Production baseline counts

**Purpose:** Sanity check before any mutation.

**SQL:**
```sql
SELECT
  (SELECT COUNT(*) FROM friction.event) AS event_count,
  (SELECT COUNT(*) FROM friction.case) AS case_count,
  (SELECT COUNT(*) FROM friction.source WHERE is_active = true) AS active_source_count,
  (SELECT COUNT(*) FROM friction.source) AS total_source_count;
```

**Expected at apply:**
- `event_count = 22` (or higher if new events emitted between fact-finding and apply)
- `case_count = 22` (or higher)
- `active_source_count = 3` (reconciliation, health_check, manual)
- `total_source_count = 3`

**Hard-stop trigger:** `active_source_count < 3` (any seed deactivated) OR `total_source_count > 3` (new source seed added that may need FK handling). Either case requires PK decision.

## P-5 — CHECK constraint definition capture

**Purpose:** Capture exact body of `event_source_check` for rollback restoration.

**SQL:**
```sql
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = 'friction'
AND cls.relname = 'event'
AND con.conname = 'event_source_check';
```

**Expected at apply (from v2.83 fact-finding):**
- `constraint_name`: `event_source_check`
- `constraint_definition`: `CHECK ((source = ANY (ARRAY['reconciliation'::text, 'health_check'::text, 'manual'::text])))`

**Use:** Rollback body in `hardstop-rollback.md §5.5-A` re-adds this exact CHECK if FK swap is reverted.

**Hard-stop trigger:** Constraint not found (already dropped — indicates earlier partial apply) OR definition diverges from expected (indicates external schema change between fact-finding and apply).

## P-set summary for D-01 evidence

D-01 fire payload must include verbatim P-set output in `current_evidence` field:

```json
{
  "preflight_grants_snapshot": "<P-1 result>",
  "fk_validity_probe": "<P-2 result>",
  "backfill_candidate_count": "<P-3 result>",
  "production_baseline": "<P-4 result>",
  "check_constraint_capture": "<P-5 result>",
  "captured_at": "<timestamp>",
  "drift_from_brief_authoring": "<none | listed deltas>"
}
```

**Drift detection algorithm:**
1. P-1: compare grant rows by `(grantee, privilege_type)` set. New entries OR missing entries = drift.
2. P-2: any new `event_source_value` not in `{health_check, manual, reconciliation}` = drift. Any `FK_VIOLATION_ORPHAN` = hard-stop regardless of drift status.
3. P-3: `backfill_candidate_count > 0` = drift.
4. P-4: `total_source_count != 3` OR `active_source_count != 3` = drift.
5. P-5: definition mismatch = drift.

Any drift item logged in `drift_from_brief_authoring`. Drift handling per L62: PK decision required before proceeding.
