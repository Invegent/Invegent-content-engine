# cc-0017b § 5.3 — V-checks (V-B1 through V-B27)

**Part of:** [`cc-0017b-friction-register-unified-emit-event.md`](../cc-0017b-friction-register-unified-emit-event.md)
**Prev:** [`migration-sql-part-b.md`](migration-sql-part-b.md) **Next:** [`hardstop-rollback.md`](hardstop-rollback.md)

---

V-checks run after `apply_migration` returns success. Each is independent. A failure in one does not block the others. If any required V-check fails, the migration must be rolled back per [`hardstop-rollback.md`](hardstop-rollback.md).

---

## Schema-state V-checks (V-B1 – V-B9)

**V-B1 — category_source CHECK extended; ABSENT 'severity_override':**
```sql
SELECT pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace n ON n.oid = cls.relnamespace
WHERE n.nspname = 'friction' AND cls.relname = 'event'
  AND con.conname = 'event_category_source_check';
-- Expected: CHECK contains 'emitter_default', 'manual_at_capture', 'triage_override', 'category_override'
-- HARD-FAIL if contains 'severity_override' OR missing 'category_override'
```

**V-B2 — dynamic_context column exists on friction.event:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'friction' AND table_name = 'event' AND column_name = 'dynamic_context';
-- Expected: 1 row; data_type=jsonb; is_nullable=YES
```

**V-B3 — fn_severity_rank exists, IMMUTABLE, returns correct values:**
```sql
SELECT
  friction.fn_severity_rank('info')     AS info_rank,      -- 0
  friction.fn_severity_rank('warn')     AS warn_rank,      -- 1
  friction.fn_severity_rank('critical') AS critical_rank,  -- 2
  friction.fn_severity_rank(NULL)       AS null_rank,      -- -1
  friction.fn_severity_rank('bogus')    AS bogus_rank;     -- -1
-- Expected: 0, 1, 2, -1, -1
```

**V-B4 — fn_attach_or_create_inner_v1 exists with correct signature:**
```sql
SELECT pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS returns
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction' AND p.proname = 'fn_attach_or_create_inner_v1';
-- Expected args: p_dedupe text, p_observed_at timestamp with time zone, p_severity text,
--                p_category text, p_problem_key text, p_observation_text text
-- Expected returns: TABLE(case_id uuid, disposition text)
```

**V-B5 — fn_promote_event_to_case body contains GUC bypass + calls helper:**
```sql
SELECT pg_get_functiondef(p.oid) LIKE '%current_setting(''friction.emit_event_active''%' AS has_guc_check,
       pg_get_functiondef(p.oid) LIKE '%fn_attach_or_create_inner_v1%' AS calls_helper,
       pg_get_functiondef(p.oid) LIKE '%BYPASS-DEFENCE%' AS logs_bypass
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction' AND p.proname = 'fn_promote_event_to_case';
-- Expected: all 3 columns true
```

**V-B6 — friction.emit_event exists with 12-parameter signature:**
```sql
SELECT pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS returns,
       p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction' AND p.proname = 'emit_event';
-- Expected args:
--   p_source text, p_condition_key text, p_problem_key text, p_source_event_id text,
--   p_observed_at timestamp with time zone, p_related_object jsonb, p_observation_text text,
--   p_raw_payload jsonb, p_reported_by text, p_severity_override text,
--   p_category_override text, p_dynamic_context jsonb
-- Expected returns: TABLE(event_id uuid, case_id uuid, case_disposition text)
-- Expected security_definer: true
```

**V-B7 — 3 wrapper functions preserve exact prior signatures:**
```sql
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS returns
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction'
  AND p.proname IN ('fn_emit_reconciliation_event', 'fn_emit_health_check_findings', 'fn_emit_manual_event')
ORDER BY p.proname;
-- Expected:
--   fn_emit_health_check_findings | p_run_id text, p_markdown_path text, p_findings jsonb | jsonb
--   fn_emit_manual_event          | p_observation_text text, p_severity text, p_category text, p_current_route text, p_related_object jsonb, p_notes text | uuid
--   fn_emit_reconciliation_event  | (empty) | trigger
```

**V-B8 — Triggers still bound correctly (none added, none dropped):**
```sql
SELECT count(*) FILTER (WHERE t.tgname = 'friction_event_promote_to_case') AS promote_trg,
       count(*) FILTER (WHERE t.tgname = 'friction_emit_reconciliation') AS recon_trg
FROM pg_trigger t WHERE NOT t.tgisinternal;
-- Expected: promote_trg=1, recon_trg=1
```

**V-B9 — 3 emission_rule seed rows landed:**
```sql
SELECT source, condition_key, default_severity, default_category_code, case_policy
FROM friction.emission_rule
WHERE (source, condition_key) IN (
  ('reconciliation', 'observer_stale'),
  ('health_check',   'true_stuck'),
  ('manual',         'manual_fab')
)
ORDER BY source, condition_key;
-- Expected: 3 rows matching Step 10 INSERT values
```

---

## Happy-path V-checks (V-B10 – V-B12)

**V-B10 — emit_event happy path (created_new):**
```sql
SELECT event_id, case_id, case_disposition
FROM friction.emit_event(
  p_source             := 'manual',
  p_condition_key      := 'manual_fab',
  p_problem_key        := 'cc-0017b-test/v-b10',
  p_source_event_id    := 'cc-0017b-test/v-b10-' || gen_random_uuid()::text,
  p_observed_at        := now(),
  p_related_object     := '{"type":"test"}'::jsonb,
  p_observation_text   := 'cc-0017b-test/v-b10 happy path',
  p_raw_payload        := '{"test":true}'::jsonb,
  p_reported_by        := 'pk',
  p_severity_override  := 'info'
);
-- Expected: event_id NOT NULL; case_id NOT NULL; case_disposition='created_new'
```

**V-B11 — Idempotent replay returns same event/case:**
```sql
WITH first_emit AS (
  SELECT * FROM friction.emit_event(
    p_source             := 'manual',
    p_condition_key      := 'manual_fab',
    p_problem_key        := 'cc-0017b-test/v-b11',
    p_source_event_id    := 'cc-0017b-test/v-b11-FIXED-IDEMPOTENCY-KEY',
    p_observed_at        := now(),
    p_related_object     := '{"type":"test"}'::jsonb,
    p_observation_text   := 'cc-0017b-test/v-b11 idempotent replay',
    p_raw_payload        := '{"test":true}'::jsonb,
    p_reported_by        := 'pk',
    p_severity_override  := 'info'
  )
),
second_emit AS (
  SELECT * FROM friction.emit_event(
    p_source             := 'manual',
    p_condition_key      := 'manual_fab',
    p_problem_key        := 'cc-0017b-test/v-b11',
    p_source_event_id    := 'cc-0017b-test/v-b11-FIXED-IDEMPOTENCY-KEY',
    p_observed_at        := now(),
    p_related_object     := '{"type":"test","second_call":true}'::jsonb,
    p_observation_text   := 'cc-0017b-test/v-b11 second call',
    p_raw_payload        := '{"test":true,"call":2}'::jsonb,
    p_reported_by        := 'pk',
    p_severity_override  := 'info'
  )
)
SELECT
  (SELECT event_id FROM first_emit) = (SELECT event_id FROM second_emit) AS event_ids_match,
  (SELECT case_disposition FROM first_emit) AS first_disposition,
  (SELECT case_disposition FROM second_emit) AS second_disposition;
-- Expected: event_ids_match=true; first_disposition='created_new'; second_disposition='idempotent_replay'
```

**V-B12 — emit_event attach-to-open (same fingerprint → attaches, severity escalates):**
```sql
WITH first_emit AS (
  SELECT * FROM friction.emit_event(
    p_source             := 'manual', p_condition_key := 'manual_fab',
    p_problem_key        := 'cc-0017b-test/v-b12-attach',
    p_source_event_id    := 'cc-0017b-test/v-b12-attach-1',
    p_observed_at        := now(), p_related_object := '{"k":"v"}'::jsonb,
    p_observation_text   := 'cc-0017b-test/v-b12 first emit',
    p_raw_payload        := '{}'::jsonb, p_reported_by := 'pk', p_severity_override := 'info'
  )
),
second_emit AS (
  SELECT * FROM friction.emit_event(
    p_source             := 'manual', p_condition_key := 'manual_fab',
    p_problem_key        := 'cc-0017b-test/v-b12-attach',
    p_source_event_id    := 'cc-0017b-test/v-b12-attach-2',
    p_observed_at        := now(), p_related_object := '{"k":"v"}'::jsonb,
    p_observation_text   := 'cc-0017b-test/v-b12 second emit',
    p_raw_payload        := '{}'::jsonb, p_reported_by := 'pk', p_severity_override := 'warn'  -- escalate
  )
)
SELECT
  (SELECT case_id FROM first_emit) = (SELECT case_id FROM second_emit) AS case_ids_match,
  (SELECT case_disposition FROM second_emit) AS second_disposition,
  (SELECT severity FROM friction.case WHERE case_id = (SELECT case_id FROM first_emit)) AS case_severity_after,
  (SELECT event_count FROM friction.case WHERE case_id = (SELECT case_id FROM first_emit)) AS event_count_after;
-- Expected: case_ids_match=true; second_disposition='attached_open'; case_severity_after='warn'; event_count_after=2
```

---

## Reopen-semantics V-checks (V-B13 – V-B14)

**V-B13 — Reopen within 14-day window:**
```sql
WITH setup AS (
  SELECT * FROM friction.emit_event(
    p_source := 'manual', p_condition_key := 'manual_fab',
    p_problem_key := 'cc-0017b-test/v-b13-reopen',
    p_source_event_id := 'cc-0017b-test/v-b13-reopen-1',
    p_observed_at := now() - interval '3 days', p_related_object := '{}'::jsonb,
    p_observation_text := 'cc-0017b-test/v-b13 setup case for reopen',
    p_raw_payload := '{}'::jsonb, p_reported_by := 'pk', p_severity_override := 'critical'
  )
),
close_case AS (
  UPDATE friction.case
  SET resolved_at = now() - interval '5 days', resolution_kind = 'acted_on'
  WHERE case_id = (SELECT case_id FROM setup)
  RETURNING case_id
),
reopen AS (
  SELECT * FROM friction.emit_event(
    p_source := 'manual', p_condition_key := 'manual_fab',
    p_problem_key := 'cc-0017b-test/v-b13-reopen',
    p_source_event_id := 'cc-0017b-test/v-b13-reopen-2',
    p_observed_at := now(), p_related_object := '{}'::jsonb,
    p_observation_text := 'cc-0017b-test/v-b13 recurrence within 14d',
    p_raw_payload := '{}'::jsonb, p_reported_by := 'pk',
    p_severity_override := 'info'   -- new severity should REPLACE per PK directive
  )
)
SELECT
  (SELECT case_id FROM setup) = (SELECT case_id FROM reopen) AS case_id_preserved,
  (SELECT case_disposition FROM reopen) AS reopen_disposition,
  c.resolved_at IS NULL                 AS is_open_after_reopen,
  c.resolution_kind                     AS resolution_kind_after,
  c.reopen_count                        AS reopen_count_after,
  c.severity                            AS severity_after  -- expect 'info' (replaced)
FROM friction.case c
WHERE c.case_id = (SELECT case_id FROM reopen);
-- Expected: case_id_preserved=true; reopen_disposition='reopened_within_window';
--           is_open_after_reopen=true; resolution_kind_after='reopened';
--           reopen_count_after=1; severity_after='info'
```

**V-B14 — create_after_window (close >14d ago, emit, verify predecessor link):**
```sql
WITH setup AS (
  SELECT * FROM friction.emit_event(
    p_source := 'manual', p_condition_key := 'manual_fab',
    p_problem_key := 'cc-0017b-test/v-b14-after-window',
    p_source_event_id := 'cc-0017b-test/v-b14-after-window-1',
    p_observed_at := now() - interval '20 days', p_related_object := '{}'::jsonb,
    p_observation_text := 'cc-0017b-test/v-b14 setup case',
    p_raw_payload := '{}'::jsonb, p_reported_by := 'pk', p_severity_override := 'warn'
  )
),
close_old AS (
  UPDATE friction.case
  SET resolved_at = now() - interval '18 days', resolution_kind = 'tracked_done'
  WHERE case_id = (SELECT case_id FROM setup)
  RETURNING case_id AS predecessor_id
),
emit_new AS (
  SELECT * FROM friction.emit_event(
    p_source := 'manual', p_condition_key := 'manual_fab',
    p_problem_key := 'cc-0017b-test/v-b14-after-window',
    p_source_event_id := 'cc-0017b-test/v-b14-after-window-2',
    p_observed_at := now(), p_related_object := '{}'::jsonb,
    p_observation_text := 'cc-0017b-test/v-b14 new case after window',
    p_raw_payload := '{}'::jsonb, p_reported_by := 'pk', p_severity_override := 'warn'
  )
)
SELECT
  (SELECT case_disposition FROM emit_new) AS disposition,
  (SELECT case_id FROM emit_new) != (SELECT predecessor_id FROM close_old) AS new_case_distinct,
  c.predecessor_case_id = (SELECT predecessor_id FROM close_old) AS predecessor_link_correct
FROM friction.case c
WHERE c.case_id = (SELECT case_id FROM emit_new);
-- Expected: disposition='created_after_window'; new_case_distinct=true; predecessor_link_correct=true
```

---

## Override-semantics V-checks (V-B15 – V-B17)

**V-B15 — severity_override provenance in dynamic_context (NOT category_source):**
```sql
WITH e AS (
  SELECT * FROM friction.emit_event(
    p_source := 'manual', p_condition_key := 'manual_fab',
    p_problem_key := 'cc-0017b-test/v-b15-sev-override',
    p_source_event_id := 'cc-0017b-test/v-b15-' || gen_random_uuid()::text,
    p_observed_at := now(), p_related_object := '{}'::jsonb,
    p_observation_text := 'cc-0017b-test/v-b15 severity override provenance',
    p_raw_payload := '{}'::jsonb, p_reported_by := 'pk',
    p_severity_override := 'critical'    -- rule default is 'info'
  )
)
SELECT
  ev.severity                                                    AS severity_actual,
  ev.category_source                                             AS category_source_actual,
  ev.dynamic_context ? 'severity_override'                       AS has_sev_override_audit,
  ev.dynamic_context -> 'severity_override' ->> 'applied'        AS audit_applied,
  ev.dynamic_context -> 'severity_override' ->> 'effective_was'  AS audit_effective_was
FROM friction.event ev WHERE ev.event_id = (SELECT event_id FROM e);
-- Expected: severity_actual='critical'; category_source_actual='manual_at_capture' (NOT severity_override);
--           has_sev_override_audit=true; audit_applied='critical'; audit_effective_was='info'
```

**V-B16 — category_override sets category_source='category_override' for non-manual path:**
```sql
WITH e AS (
  SELECT * FROM friction.emit_event(
    p_source := 'manual', p_condition_key := 'manual_fab',
    p_problem_key := 'cc-0017b-test/v-b16-cat-override',
    p_source_event_id := 'cc-0017b-test/v-b16-' || gen_random_uuid()::text,
    p_observed_at := now(), p_related_object := '{}'::jsonb,
    p_observation_text := 'cc-0017b-test/v-b16 category override non-manual',
    p_raw_payload := '{}'::jsonb,
    p_reported_by := 'system',                       -- non-manual path
    p_category_override := 'operator_friction'       -- rule default is 'unclassified'
  )
)
SELECT
  ev.category                                                       AS category_actual,
  ev.category_source                                                AS category_source_actual,
  ev.dynamic_context ? 'category_override'                          AS has_cat_override_audit,
  ev.dynamic_context -> 'category_override' ->> 'applied'           AS audit_applied,
  ev.dynamic_context -> 'category_override' ->> 'effective_was'     AS audit_effective_was
FROM friction.event ev WHERE ev.event_id = (SELECT event_id FROM e);
-- Expected: category_actual='operator_friction'; category_source_actual='category_override';
--           has_cat_override_audit=true; audit_applied='operator_friction'; audit_effective_was='unclassified'
```

**V-B17 — Manual path with category override keeps 'manual_at_capture' (cc-0014 semantics):**
```sql
WITH e AS (
  SELECT friction.fn_emit_manual_event(
    p_observation_text := 'cc-0017b-test/v-b17 manual_at_capture preservation',
    p_severity         := 'warn',
    p_category         := 'operator_friction',
    p_current_route    := '/cc-0017b-test',
    p_related_object   := NULL,
    p_notes            := 'V-B17'
  ) AS event_id
)
SELECT ev.category, ev.category_source
FROM friction.event ev WHERE ev.event_id = (SELECT event_id FROM e);
-- Expected: category='operator_friction'; category_source='manual_at_capture' (NOT 'category_override')
```

---

## Failure-mode V-checks (V-B18 – V-B19)

**V-B18 — emit_event with missing rule raises P0001:**
```sql
-- This MUST raise an error
SELECT * FROM friction.emit_event(
  p_source := 'manual', p_condition_key := 'cc-0017b-test-nonexistent-condition',
  p_problem_key := 'cc-0017b-test/v-b18',
  p_source_event_id := 'cc-0017b-test/v-b18-' || gen_random_uuid()::text,
  p_observed_at := now(), p_related_object := '{}'::jsonb,
  p_observation_text := 'cc-0017b-test/v-b18 missing rule',
  p_raw_payload := '{}'::jsonb, p_reported_by := 'pk'
);
-- MUST raise: 'no enabled emission_rule for (source=manual, condition_key=cc-0017b-test-nonexistent-condition)'
-- ERRCODE P0001
```

**V-B19 — emit_event with suppress rule writes emit_error + returns suppressed_by_rule:**
```sql
-- Setup: insert a suppress rule
INSERT INTO friction.emission_rule
  (source, condition_key, default_severity, default_category_code, problem_key_formula, dedupe_scope, case_policy)
VALUES ('manual', 'cc-0017b-test-suppress', 'info', 'unclassified', 'test', 'open_cases', 'suppress');

WITH e AS (
  SELECT * FROM friction.emit_event(
    p_source := 'manual', p_condition_key := 'cc-0017b-test-suppress',
    p_problem_key := 'cc-0017b-test/v-b19',
    p_source_event_id := 'cc-0017b-test/v-b19-' || gen_random_uuid()::text,
    p_observed_at := now(), p_related_object := '{}'::jsonb,
    p_observation_text := 'cc-0017b-test/v-b19 suppress rule test',
    p_raw_payload := '{}'::jsonb, p_reported_by := 'pk'
  )
)
SELECT
  (SELECT event_id FROM e) AS event_id_returned,
  (SELECT case_id FROM e) AS case_id_returned,
  (SELECT case_disposition FROM e) AS disposition_returned,
  (SELECT count(*) FROM friction.emit_error WHERE source_event_id LIKE 'cc-0017b-test/v-b19%') AS emit_error_count;
-- Expected: event_id_returned=NULL; case_id_returned=NULL; disposition_returned='suppressed_by_rule'; emit_error_count=1
```

---

## Trigger-defence V-checks (V-B20 – V-B21)

**V-B20 — Direct INSERT triggers defence-in-depth path:**
```sql
-- Confirm GUC NOT set before direct INSERT
SELECT current_setting('friction.emit_event_active', true) AS guc_before_direct;
-- Expected: ''

-- Direct INSERT (bypass emit_event)
INSERT INTO friction.event (
  source, source_event_id, observed_at, severity, category, category_source,
  reported_by, problem_key, observation_text, related_object, raw_payload, dedupe_fingerprint
)
VALUES (
  'manual', 'cc-0017b-test/v-b20-direct-' || gen_random_uuid()::text, now(),
  'info', 'operator_friction', 'emitter_default', 'pk',
  'cc-0017b-test/v-b20-direct',
  'cc-0017b-test/v-b20 direct INSERT bypassing emit_event',
  '{"direct":true}'::jsonb, '{}'::jsonb,
  friction.fn_compute_dedupe_fingerprint_v1('manual', 'cc-0017b-test/v-b20-direct', '{"direct":true}'::jsonb)
);

SELECT
  (SELECT count(*) FROM friction.event WHERE source_event_id LIKE 'cc-0017b-test/v-b20-direct-%' AND case_id IS NOT NULL) AS event_has_case_id,
  (SELECT count(*) FROM friction.emit_error WHERE source_event_id LIKE 'cc-0017b-test/v-b20-direct-%' AND error_code = 'BYPASS-DEFENCE') AS bypass_logged;
-- Expected: event_has_case_id=1; bypass_logged=1
```

**V-B21 — GUC transaction-locality (no cross-transaction leak):**
```sql
-- After all prior V-B steps, the GUC should be clear at top level
SELECT current_setting('friction.emit_event_active', true) AS guc_after_emits;
-- Expected: '' (set_config is_local=true semantics; clears on COMMIT/ROLLBACK)
```

---

## Wrapper end-to-end V-checks (V-B22 – V-B24)

**V-B22 — Reconciliation wrapper end-to-end (synthetic INSERT to r.cadence_drift_log):**
```sql
WITH ins_drift AS (
  INSERT INTO r.cadence_drift_log
    (cadence_drift_log_id, client_id, platform, drift_type, drift_severity,
     drift_details, observed_count, expected_count,
     observation_window_start, observation_window_end, created_at)
  VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-cc0017b00022',
    (SELECT client_id FROM c.client
       WHERE client_slug IN ('ndis-yarns','property-pulse','invegent','care-for-welfare') LIMIT 1),
    'instagram', 'observer_stale', 'warn',
    '{"test":"v-b22"}'::jsonb, 0, 1,
    now() - interval '1 day', now(), now()
  )
  RETURNING cadence_drift_log_id
)
SELECT
  (SELECT count(*) FROM friction.event
     WHERE source_event_id = 'r.cadence_drift_log/' || (SELECT cadence_drift_log_id FROM ins_drift)::text
  ) AS event_landed,
  (SELECT case_id FROM friction.event
     WHERE source_event_id = 'r.cadence_drift_log/' || (SELECT cadence_drift_log_id FROM ins_drift)::text
  ) IS NOT NULL AS case_attached;
-- Expected: event_landed=1, case_attached=true
```

> **V-B22 EXECUTION NOTE:** writes a row to `r.cadence_drift_log` that triggers downstream reconciliation logic. **Apply-time decision:** if PK prefers to skip this V-check, the wrapper logic is exercised indirectly via the natural cron 85 fire window (next is 03:30 AEST = 17:30 UTC). Mark as `SKIPPED-BY-PK-DIRECTION` in apply notes if PK opts out.

**V-B23 — Health_check wrapper 3-tier condition_key resolution:**
```sql
-- Prerequisite: add a temporary emission_rule for tier-1 explicit condition_key
INSERT INTO friction.emission_rule (source, condition_key, problem_key_formula, default_severity, default_category_code)
VALUES ('health_check', 'cc-0017b-test-explicit', 'test rule for v-b23 tier 1', 'critical', 'pipeline_integrity');

WITH result AS (
  SELECT friction.fn_emit_health_check_findings(
    p_run_id        := 'cc-0017b-test/v-b23-run',
    p_markdown_path := '/test/v-b23.md',
    p_findings      := jsonb_build_array(
      jsonb_build_object(
        'finding_id', 'priority-1/test-explicit',
        'priority', '1',
        'condition_key', 'cc-0017b-test-explicit',   -- tier 1: explicit field
        'observation_text', 'cc-0017b-test/v-b23 explicit condition_key test',
        'related_object', '{"k":"v1"}'::jsonb
      ),
      jsonb_build_object(
        'finding_id', 'priority-2/true-stuck-instagram-test-client',
        'priority', '2',
        -- no condition_key field → tier 2: parse fallback
        'observation_text', 'cc-0017b-test/v-b23 true-stuck fallback test',
        'related_object', '{"k":"v2"}'::jsonb
      ),
      jsonb_build_object(
        'finding_id', 'priority-3/cc-0017b-test-unmatchable-prefix',
        'priority', '3',
        -- no condition_key + doesn't match true-stuck-* → tier 3: emit_error skip
        'observation_text', 'cc-0017b-test/v-b23 unresolvable condition_key test',
        'related_object', '{"k":"v3"}'::jsonb
      )
    )
  ) AS r
)
SELECT
  (SELECT r FROM result) AS health_check_result,
  (SELECT count(*) FROM friction.event WHERE source_event_id LIKE 'cc-0017b-test/v-b23-run/%') AS events_landed,
  (SELECT count(*) FROM friction.emit_error
     WHERE source_event_id LIKE 'cc-0017b-test/v-b23-run/%' AND error_code = 'CONDITION-KEY-UNRESOLVED'
  ) AS unresolved_skipped;
-- Expected:
--   health_check_result: success_count=2, failure_count=0, skipped_count=1
--   events_landed=2 (explicit + true-stuck)
--   unresolved_skipped=1 (unmatchable one)
```

**V-B24 — Manual wrapper end-to-end:**
```sql
WITH e AS (
  SELECT friction.fn_emit_manual_event(
    p_observation_text := 'cc-0017b-test/v-b24 manual wrapper end-to-end',
    p_severity         := 'warn',
    p_category         := 'operator_friction',
    p_current_route    := '/cc-0017b-test',
    p_related_object   := jsonb_build_object('k','v'),
    p_notes            := 'V-B24'
  ) AS event_id
)
SELECT
  ev.event_id IS NOT NULL                                AS event_returned,
  ev.case_id  IS NOT NULL                                AS case_attached,
  ev.severity                                            AS severity_set,
  ev.category                                            AS category_set,
  ev.category_source                                     AS category_source_set,
  ev.reported_by                                         AS reported_by_set,
  ev.related_object ->> 'dashboard_route'                AS route_in_related,
  ev.dynamic_context ? 'severity_override'               AS sev_override_audited,
  ev.dynamic_context ? 'category_override'               AS cat_override_audited,
  ev.dynamic_context -> 'fab_emission'                   AS fab_context_present
FROM friction.event ev WHERE ev.event_id = (SELECT event_id FROM e);
-- Expected: event_returned=true; case_attached=true; severity_set='warn'; category_set='operator_friction';
--           category_source_set='manual_at_capture' (NOT 'category_override');
--           reported_by_set='pk'; route_in_related='/cc-0017b-test';
--           sev_override_audited=true; cat_override_audited=true; fab_context_present=true
```

---

## Invariant + Security + Cleanup V-checks (V-B25 – V-B27)

**V-B25 — Sequential 10-call invariant: 1 case, 10 events:**
```sql
DO $$
DECLARE i integer;
BEGIN
  FOR i IN 1..10 LOOP
    PERFORM friction.emit_event(
      p_source := 'manual', p_condition_key := 'manual_fab',
      p_problem_key := 'cc-0017b-test/v-b25-concurrency',
      p_source_event_id := 'cc-0017b-test/v-b25-' || i::text,
      p_observed_at := now(), p_related_object := '{"concurrency":"test"}'::jsonb,
      p_observation_text := 'cc-0017b-test/v-b25 concurrency invariant',
      p_raw_payload := jsonb_build_object('iter', i),
      p_reported_by := 'pk', p_severity_override := 'info'
    );
  END LOOP;
END $$;

SELECT
  count(DISTINCT case_id) AS distinct_case_count,
  count(*) AS event_count,
  (SELECT event_count FROM friction.case
    WHERE problem_key = 'cc-0017b-test/v-b25-concurrency'
      AND resolved_at IS NULL LIMIT 1) AS case_event_count_field
FROM friction.event
WHERE source_event_id LIKE 'cc-0017b-test/v-b25-%';
-- Expected: distinct_case_count=1, event_count=10, case_event_count_field=10
-- NB: TRUE concurrency would require pg_background; this validates the sequential invariant.
```

**V-B26 — service_role can EXECUTE emit_event:**
```sql
SET ROLE service_role;
SELECT * FROM friction.emit_event(
  p_source := 'manual', p_condition_key := 'manual_fab',
  p_problem_key := 'cc-0017b-test/v-b26-svc-role',
  p_source_event_id := 'cc-0017b-test/v-b26-' || gen_random_uuid()::text,
  p_observed_at := now(), p_related_object := '{}'::jsonb,
  p_observation_text := 'cc-0017b-test/v-b26 service_role can call',
  p_raw_payload := '{}'::jsonb,
  p_reported_by := 'system', p_severity_override := 'info'
);
RESET ROLE;
-- MUST succeed. Returns 3 columns.
```

**V-B27 — Test row cleanup leaves zero residual:**
```sql
DELETE FROM friction.event       WHERE source_event_id LIKE 'cc-0017b-test/%';
DELETE FROM friction.event       WHERE source_event_id LIKE 'r.cadence_drift_log/aaaaaaaa-aaaa-aaaa-aaaa-cc0017b00022';
DELETE FROM friction.case        WHERE problem_key LIKE 'cc-0017b-test/%';
DELETE FROM friction.emit_error  WHERE source_event_id LIKE 'cc-0017b-test/%';
DELETE FROM friction.emission_rule WHERE source = 'manual' AND condition_key = 'cc-0017b-test-suppress';
DELETE FROM friction.emission_rule WHERE source = 'health_check' AND condition_key = 'cc-0017b-test-explicit';
DELETE FROM r.cadence_drift_log  WHERE cadence_drift_log_id = 'aaaaaaaa-aaaa-aaaa-aaaa-cc0017b00022';

SELECT
  (SELECT count(*) FROM friction.event WHERE source_event_id LIKE 'cc-0017b-test/%' OR source_event_id LIKE 'r.cadence_drift_log/aaaaaaaa-%') AS test_events_residual,
  (SELECT count(*) FROM friction.case WHERE problem_key LIKE 'cc-0017b-test/%') AS test_cases_residual,
  (SELECT count(*) FROM friction.emit_error WHERE source_event_id LIKE 'cc-0017b-test/%') AS test_errors_residual,
  (SELECT count(*) FROM friction.emission_rule WHERE condition_key LIKE 'cc-0017b-test-%') AS test_rules_residual,
  (SELECT count(*) FROM r.cadence_drift_log WHERE cadence_drift_log_id = 'aaaaaaaa-aaaa-aaaa-aaaa-cc0017b00022') AS test_drift_residual,
  (SELECT count(*) FROM friction.event)  AS event_total_after,
  (SELECT count(*) FROM friction.case)   AS case_total_after,
  (SELECT count(*) FROM friction.source) AS source_total_after;
-- Expected: all 5 residuals = 0
-- Production state preserved: event_total_after = P8.event_total baseline, case_total_after = P8.case_total
```

---

**Next:** [`hardstop-rollback.md`](hardstop-rollback.md) — hard-stop conditions + rollback SQL.
