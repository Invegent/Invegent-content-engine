# cc-0017b § 5.4–5.5 — Hard-stop Conditions + Rollback Path

**Part of:** [`cc-0017b-friction-register-unified-emit-event.md`](../cc-0017b-friction-register-unified-emit-event.md)
**Prev:** [`vchecks.md`](vchecks.md) **Next:** [`d01-postapply-deferred.md`](d01-postapply-deferred.md)

---

## 5.4 Hard-stop conditions

The migration is considered FAILED if any of:

- `apply_migration` raises any error (DDL or runtime within Step 1 DO block)
- The Step 1 DO block raises "transition-window backfill incomplete" exception
- **V-B1:** CHECK constraint doesn't contain `'category_override'` OR DOES contain `'severity_override'`
- **V-B2:** `dynamic_context` column missing or wrong type
- **V-B3:** fn_severity_rank returns wrong values for any of the 5 inputs
- **V-B4:** fn_attach_or_create_inner_v1 missing or wrong signature
- **V-B5:** fn_promote_event_to_case body lacks GUC check OR doesn't call fn_attach_or_create_inner_v1 OR doesn't log BYPASS-DEFENCE
- **V-B6:** emit_event signature wrong OR not SECURITY DEFINER
- **V-B7:** any wrapper signature changed
- **V-B8:** trigger count wrong (would mean a trigger was accidentally dropped or duplicated)
- **V-B9:** < 3 emission_rule seed rows or any field wrong
- **V-B10:** case_disposition ≠ 'created_new' on a fresh fingerprint
- **V-B11:** idempotent_replay path didn't return same event_id
- **V-B12:** attach_open didn't escalate severity OR didn't increment event_count
- **V-B13:** reopen didn't preserve case_id OR didn't set resolution_kind='reopened' OR didn't increment reopen_count OR didn't replace severity to 'info'
- **V-B14:** new case wasn't distinct from predecessor OR predecessor_case_id link is wrong
- **V-B15:** severity_override audit not present in dynamic_context OR category_source incorrectly contains 'severity_override'
- **V-B16:** category_override audit not present OR category_source ≠ 'category_override' for non-manual path
- **V-B17:** manual path returned category_source='category_override' (would mean cc-0014 semantics broken)
- **V-B18:** missing rule didn't raise P0001
- **V-B19:** suppress rule produced an event row (should be NULL) OR didn't write emit_error
- **V-B20:** direct INSERT didn't get case_id assigned OR no BYPASS-DEFENCE emit_error row
- **V-B21:** GUC leaked across transactions (current_setting non-empty at top level)
- **V-B22:** synthetic reconciliation INSERT didn't produce a friction.event (only if V-B22 was run, not SKIPPED-BY-PK-DIRECTION)
- **V-B23:** health_check wrapper result counts wrong OR fewer/more events than expected
- **V-B24:** manual wrapper returned wrong field values
- **V-B25:** 10 sequential emits didn't produce exactly 1 case with event_count=10
- **V-B26:** service_role couldn't EXECUTE emit_event
- **V-B27:** any non-zero residual

**On any hard-stop:** stop. Do not proceed to Wave 0c authoring. Roll back per §5.5. Author a v1.1 patch addressing the failure mode. Re-fire D-01.

---

## 5.5 Rollback path

Order of operations: drop new objects → restore cc-0014 function bodies verbatim → restore CHECK constraint.

### Step 5.5.1 — Drop new helper functions

```sql
DROP FUNCTION IF EXISTS friction.fn_attach_or_create_inner_v1(text, timestamptz, text, text, text, text);
DROP FUNCTION IF EXISTS friction.fn_severity_rank(text);
DROP FUNCTION IF EXISTS friction.emit_event(text, text, text, text, timestamptz, jsonb, text, jsonb, text, text, text, jsonb);
```

### Step 5.5.2 — DELETE the 3 emission_rule seed rows

```sql
DELETE FROM friction.emission_rule
WHERE (source, condition_key) IN (
  ('reconciliation', 'observer_stale'),
  ('health_check',   'true_stuck'),
  ('manual',         'manual_fab')
);
```

### Step 5.5.3 — Drop `dynamic_context` column

```sql
-- Forensic data on existing rows is acceptable loss in rollback.
ALTER TABLE friction.event DROP COLUMN IF EXISTS dynamic_context;
```

### Step 5.5.4 — Restore category_source CHECK to pre-0b 3-value enum

```sql
ALTER TABLE friction.event DROP CONSTRAINT event_category_source_check;
ALTER TABLE friction.event ADD CONSTRAINT event_category_source_check
  CHECK (category_source = ANY (ARRAY[
    'emitter_default'::text,
    'manual_at_capture'::text,
    'triage_override'::text
  ]));
```

### Step 5.5.5 — Restore cc-0014 function bodies (verbatim)

**CRITICAL: the apply session must have captured these from pre-flight P2 output before applying the migration.** Without that capture, rollback for `fn_emit_health_check_findings` + `fn_emit_manual_event` requires manually re-deriving from git history (cc-0014 commit).

#### 5.5.5a — fn_promote_event_to_case (cc-0014 body, verbatim from introspection)

```sql
CREATE OR REPLACE FUNCTION friction.fn_promote_event_to_case()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
DECLARE
  v_case_id        uuid;
  v_old_severity   text;
  v_new_severity   text;
BEGIN
  IF NEW.case_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT c.case_id, c.severity INTO v_case_id, v_old_severity
  FROM friction.case c
  WHERE c.category = NEW.category
    AND c.last_seen_at > now() - INTERVAL '7 days'
    AND c.triage_state NOT IN ('duplicate', 'ignored')
    AND EXISTS (
      SELECT 1 FROM friction.event e
      WHERE e.case_id = c.case_id AND e.dedupe_fingerprint = NEW.dedupe_fingerprint
    )
  ORDER BY c.last_seen_at DESC LIMIT 1;
  IF v_case_id IS NOT NULL THEN
    v_new_severity := CASE
      WHEN v_old_severity = 'critical' OR NEW.severity = 'critical' THEN 'critical'
      WHEN v_old_severity = 'warn'     OR NEW.severity = 'warn'     THEN 'warn'
      ELSE 'info'
    END;
    UPDATE friction.case
    SET event_count = event_count + 1,
        last_seen_at = GREATEST(last_seen_at, NEW.observed_at),
        severity = v_new_severity, updated_at = now()
    WHERE case_id = v_case_id;
    NEW.case_id := v_case_id;
  ELSE
    INSERT INTO friction.case (case_title, first_seen_at, last_seen_at, event_count,
                                severity, category, problem_key, triage_state)
    VALUES (LEFT(COALESCE(NEW.observation_text, NEW.problem_key, 'unnamed'), 100),
            NEW.observed_at, NEW.observed_at, 1,
            NEW.severity, NEW.category, NEW.problem_key, 'new')
    RETURNING case_id INTO v_case_id;
    NEW.case_id := v_case_id;
  END IF;
  RETURN NEW;
END $$;
```

#### 5.5.5b — fn_emit_reconciliation_event (cc-0014 body, verbatim from introspection)

```sql
CREATE OR REPLACE FUNCTION friction.fn_emit_reconciliation_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, r, c, public
AS $$
DECLARE
  v_client_name text; v_observation_text text; v_problem_key text; v_severity text;
  v_dedupe_fingerprint text; v_related_object jsonb;
BEGIN
  v_severity := COALESCE(NEW.drift_severity, 'info');
  IF v_severity NOT IN ('info','warn','critical') THEN v_severity := 'info'; END IF;
  v_problem_key := COALESCE(NEW.drift_type, 'unknown_drift');
  SELECT client_name INTO v_client_name FROM c.client WHERE client_id = NEW.client_id;
  v_client_name := COALESCE(v_client_name, 'unknown_client');
  v_observation_text := format(
    '%s for %s on %s. Window: %s to %s. Observed: %s, Expected: %s.',
    NEW.drift_type, v_client_name, NEW.platform,
    NEW.observation_window_start, NEW.observation_window_end,
    COALESCE(NEW.observed_count::text, 'n/a'), COALESCE(NEW.expected_count::text, 'n/a'));
  v_related_object := jsonb_build_object(
    'type','client_platform','client_id',NEW.client_id,
    'client_name',v_client_name,'platform',NEW.platform);
  v_dedupe_fingerprint := md5('reconciliation' || '|' || v_problem_key || '|' ||
                               NEW.client_id::text || '|' || NEW.platform || '|' || 'client_commitment');
  BEGIN
    INSERT INTO friction.event (source, source_event_id, observed_at, severity, category,
                                 category_source, reported_by, problem_key, observation_text,
                                 related_object, raw_payload, dedupe_fingerprint)
    VALUES ('reconciliation',
            'r.cadence_drift_log/' || NEW.cadence_drift_log_id::text,
            NEW.created_at, v_severity, 'client_commitment', 'emitter_default', 'system',
            v_problem_key, v_observation_text, v_related_object,
            jsonb_build_object('drift_type',NEW.drift_type,'drift_severity',NEW.drift_severity,
                                'drift_details',NEW.drift_details,'observed_count',NEW.observed_count,
                                'expected_count',NEW.expected_count,
                                'observation_window_start',NEW.observation_window_start,
                                'observation_window_end',NEW.observation_window_end),
            v_dedupe_fingerprint);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO friction.emit_error (source, source_event_id, error_message, error_code, raw_payload, emitter_version)
    VALUES ('reconciliation', 'r.cadence_drift_log/' || NEW.cadence_drift_log_id::text,
            SQLERRM, SQLSTATE, row_to_json(NEW)::jsonb, 'cc-0014-v1.0');
  END;
  RETURN NEW;
END $$;
```

#### 5.5.5c — fn_emit_health_check_findings (cc-0014 body — placeholder)

**Body NOT included verbatim in this brief.** Apply session must paste it from pre-flight P2 output. The function signature is `(p_run_id text, p_markdown_path text, p_findings jsonb) RETURNS jsonb`. Schematic body (per introspection):

```sql
-- Reference shape only — DO NOT execute. Apply session pastes the captured P2 body here.
CREATE OR REPLACE FUNCTION friction.fn_emit_health_check_findings(p_run_id text, p_markdown_path text, p_findings jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = friction, public
AS $function$
DECLARE
  v_finding jsonb; v_success_count integer := 0; v_failure_count integer := 0;
  v_severity text; v_problem_key text; v_dedupe_fingerprint text;
BEGIN
  FOR v_finding IN SELECT jsonb_array_elements(p_findings) LOOP
    BEGIN
      v_severity := CASE COALESCE(v_finding->>'priority', '3')
        WHEN '1' THEN 'critical' WHEN '2' THEN 'warn' ELSE 'info'
      END;
      v_problem_key := COALESCE(
        regexp_replace(v_finding->>'finding_id', '^priority-[0-9]+/', ''),
        'unknown_finding');
      v_dedupe_fingerprint := md5('health_check' || '|' || v_problem_key || '|' ||
        COALESCE((v_finding->'related_object')::text, '') || '|' || 'pipeline_integrity');
      INSERT INTO friction.event (source, source_event_id, observed_at, severity, category, category_source,
                                   reported_by, problem_key, observation_text, related_object, raw_payload, dedupe_fingerprint)
      VALUES ('health_check', p_run_id || '/' || (v_finding->>'finding_id'),
              now(), v_severity, 'pipeline_integrity', 'emitter_default', 'system',
              v_problem_key, COALESCE(v_finding->>'observation_text', v_finding->>'title', 'no text'),
              v_finding->'related_object',
              jsonb_build_object('health_check_run_id', p_run_id, 'finding_id', v_finding->>'finding_id',
                                  'markdown_path', p_markdown_path, 'priority', v_finding->>'priority',
                                  'raw_finding', v_finding),
              v_dedupe_fingerprint);
      v_success_count := v_success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO friction.emit_error (source, source_event_id, error_message, error_code, raw_payload, emitter_version)
      VALUES ('health_check', p_run_id || '/' || (v_finding->>'finding_id'),
              SQLERRM, SQLSTATE, v_finding, 'cc-0014-v1.0');
      v_failure_count := v_failure_count + 1;
    END;
  END LOOP;
  RETURN jsonb_build_object('success_count', v_success_count, 'failure_count', v_failure_count, 'run_id', p_run_id);
END $function$;
```

#### 5.5.5d — fn_emit_manual_event (cc-0014 body — placeholder)

**Body NOT included verbatim.** Apply session must paste from pre-flight P2 output. Signature: `(p_observation_text text, p_severity text, p_category text, p_current_route text DEFAULT NULL, p_related_object jsonb DEFAULT NULL, p_notes text DEFAULT NULL) RETURNS uuid`. Schematic body:

```sql
-- Reference shape only — DO NOT execute. Apply session pastes the captured P2 body here.
CREATE OR REPLACE FUNCTION friction.fn_emit_manual_event(
  p_observation_text text, p_severity text, p_category text,
  p_current_route text DEFAULT NULL, p_related_object jsonb DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = friction, public
AS $function$
DECLARE
  v_event_id uuid; v_severity text; v_category text;
  v_problem_key text; v_dedupe_fingerprint text; v_related_object jsonb;
BEGIN
  IF p_observation_text IS NULL OR length(trim(p_observation_text)) < 5 THEN
    RAISE EXCEPTION 'observation_text required and must be >= 5 characters';
  END IF;
  v_severity := COALESCE(p_severity, 'info');
  IF v_severity NOT IN ('info', 'warn', 'critical') THEN
    RAISE EXCEPTION 'severity must be info, warn, or critical';
  END IF;
  v_category := COALESCE(p_category, 'unclassified');
  IF NOT EXISTS (SELECT 1 FROM friction.category WHERE category_code = v_category AND is_active = true) THEN
    RAISE EXCEPTION 'category % is not active', v_category;
  END IF;
  v_problem_key := lower(regexp_replace(substring(p_observation_text from 1 for 50), '[^a-z0-9]+', '_', 'g'));
  v_related_object := COALESCE(p_related_object, '{}'::jsonb);
  IF p_current_route IS NOT NULL THEN
    v_related_object := v_related_object || jsonb_build_object('dashboard_route', p_current_route);
  END IF;
  v_dedupe_fingerprint := md5('manual' || '|' || v_problem_key || '|' || v_related_object::text || '|' || v_category);
  v_event_id := gen_random_uuid();
  INSERT INTO friction.event (event_id, source, source_event_id, observed_at, severity, category,
                               category_source, reported_by, problem_key, observation_text, related_object,
                               raw_payload, dedupe_fingerprint)
  VALUES (v_event_id, 'manual', 'manual/' || v_event_id::text, now(),
          v_severity, v_category,
          CASE WHEN p_category IS NOT NULL THEN 'manual_at_capture' ELSE 'emitter_default' END,
          'pk', v_problem_key, p_observation_text, v_related_object,
          jsonb_build_object('form_version', 'v1', 'notes', p_notes),
          v_dedupe_fingerprint);
  RETURN v_event_id;
END $function$;
```

---

## Post-rollback expected state

- `friction.*` schema returns to cc-0017a Wave 0a state (9 tables, 10 functions including `fn_compute_dedupe_fingerprint_v1`)
- 22 existing cases preserved with their sha256 fingerprints (rollback does NOT touch case data)
- Existing 3 emit_* wrappers + fn_promote_event_to_case revert to cc-0014 bodies (no behavioural change vs the pre-0b state)
- `dynamic_context` column dropped; data on test events would already have been cleaned by V-B27 cleanup
- `category_source` CHECK constraint restored to 3 values
- emission_rule + notification_policy tables empty again (only the 3 seed rows deleted; the table structure stays as cc-0017a created it)
- Triggers binding unchanged (`friction_event_promote_to_case` still bound to `fn_promote_event_to_case`; `friction_emit_reconciliation` still bound to `fn_emit_reconciliation_event`)

**Verification queries to run post-rollback:**

```sql
-- 1. Re-run pre-flight P1-P11 (skipping P12-P15 which can drift) and verify all match cc-0017a baseline
-- 2. Confirm emit_event function is gone
SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'friction' AND p.proname = 'emit_event';
-- Expected: 0

-- 3. Confirm dynamic_context column is gone
SELECT count(*) FROM information_schema.columns
WHERE table_schema = 'friction' AND table_name = 'event' AND column_name = 'dynamic_context';
-- Expected: 0

-- 4. Confirm category_source CHECK has 3 values again
SELECT pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace n ON n.oid = cls.relnamespace
WHERE n.nspname = 'friction' AND cls.relname = 'event' AND con.conname = 'event_category_source_check';
-- Expected def does NOT contain 'category_override'
```

Rollback is clean and reversible. Apply rollback only if a post-apply V-check fails with no clear remediation.

---

**Next:** [`d01-postapply-deferred.md`](d01-postapply-deferred.md) — D-01 framing + post-apply commitments + deferred decisions.
