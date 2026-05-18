# cc-0017b § 5.2 (Steps 7–11) — Migration SQL Part B

**Part of:** [`cc-0017b-friction-register-unified-emit-event.md`](../cc-0017b-friction-register-unified-emit-event.md)
**Prev:** [`migration-sql-part-a.md`](migration-sql-part-a.md) **Next:** [`vchecks.md`](vchecks.md)

---

This file covers migration Steps 7–11: 3 wrapper function rewrites, emission_rule seed rows, and GRANTs. All within the same atomic transaction as Steps 1–6.

---

## Step 7 — CREATE OR REPLACE FUNCTION friction.fn_emit_reconciliation_event (trigger wrapper)

Signature preserved: no args, RETURNS trigger. Bound to AFTER INSERT on `r.cadence_drift_log`.

```sql
CREATE OR REPLACE FUNCTION friction.fn_emit_reconciliation_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, r, c, public
AS $$
DECLARE
  v_client_name      text;
  v_observation_text text;
  v_problem_key      text;
  v_severity         text;
  v_related_object   jsonb;
  v_event_id         uuid;
  v_case_id          uuid;
  v_disposition      text;
BEGIN
  v_severity := COALESCE(NEW.drift_severity, 'info');
  IF v_severity NOT IN ('info','warn','critical') THEN
    v_severity := 'info';
  END IF;

  v_problem_key := COALESCE(NEW.drift_type, 'unknown_drift');

  SELECT client_name INTO v_client_name FROM c.client WHERE client_id = NEW.client_id;
  v_client_name := COALESCE(v_client_name, 'unknown_client');

  v_observation_text := format(
    '%s for %s on %s. Window: %s to %s. Observed: %s, Expected: %s.',
    NEW.drift_type, v_client_name, NEW.platform,
    NEW.observation_window_start, NEW.observation_window_end,
    COALESCE(NEW.observed_count::text, 'n/a'),
    COALESCE(NEW.expected_count::text, 'n/a')
  );

  v_related_object := jsonb_build_object(
    'type',        'client_platform',
    'client_id',   NEW.client_id,
    'client_name', v_client_name,
    'platform',    NEW.platform
  );

  -- Call canonical emit_event. Preserve cc-0014 emit_error audit pattern: catch any
  -- raise (including emit_event "no rule" exception) and log; never propagate to caller.
  BEGIN
    SELECT event_id, case_id, case_disposition
    INTO v_event_id, v_case_id, v_disposition
    FROM friction.emit_event(
      p_source             := 'reconciliation',
      p_condition_key      := v_problem_key,                                  -- 'observer_stale' today
      p_problem_key        := v_problem_key || ':' || NEW.client_id::text || ':' || NEW.platform,
      p_source_event_id    := 'r.cadence_drift_log/' || NEW.cadence_drift_log_id::text,
      p_observed_at        := NEW.created_at,
      p_related_object     := v_related_object,
      p_observation_text   := v_observation_text,
      p_raw_payload        := jsonb_build_object(
        'drift_type',               NEW.drift_type,
        'drift_severity',           NEW.drift_severity,
        'drift_details',            NEW.drift_details,
        'observed_count',           NEW.observed_count,
        'expected_count',           NEW.expected_count,
        'observation_window_start', NEW.observation_window_start,
        'observation_window_end',   NEW.observation_window_end
      ),
      p_reported_by        := 'system',
      p_severity_override  := v_severity
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO friction.emit_error
      (source, source_event_id, error_message, error_code, raw_payload, emitter_version)
    VALUES (
      'reconciliation',
      'r.cadence_drift_log/' || NEW.cadence_drift_log_id::text,
      SQLERRM, SQLSTATE,
      row_to_json(NEW)::jsonb,
      'cc-0017b-v1.0'
    );
  END;

  RETURN NEW;
END
$$;

COMMENT ON FUNCTION friction.fn_emit_reconciliation_event() IS
  'AFTER INSERT trigger on r.cadence_drift_log. v2 body (cc-0017b): thin wrapper over friction.emit_event. Signature preserved (no args, RETURNS trigger). emit_error audit pattern preserved. Idempotency: source_event_id deterministic from cadence_drift_log_id — double-fire returns idempotent_replay.';
```

---

## Step 8 — CREATE OR REPLACE FUNCTION friction.fn_emit_health_check_findings (RPC wrapper)

Signature preserved: `(p_run_id text, p_markdown_path text, p_findings jsonb) RETURNS jsonb`.

**3-tier condition_key resolution per PK directive 2026-05-18:**
1. `v_finding->>'condition_key'` if present and non-empty
2. else parse `'true-stuck-*'` problem_key prefix → `'true_stuck'`
3. else log to `friction.emit_error` with code `'CONDITION-KEY-UNRESOLVED'` and SKIP this finding

```sql
CREATE OR REPLACE FUNCTION friction.fn_emit_health_check_findings(
  p_run_id        text,
  p_markdown_path text,
  p_findings      jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
DECLARE
  v_finding         jsonb;
  v_priority        text;
  v_severity        text;
  v_problem_key     text;
  v_condition_key   text;
  v_success_count   integer := 0;
  v_failure_count   integer := 0;
  v_skipped_count   integer := 0;
BEGIN
  FOR v_finding IN SELECT jsonb_array_elements(p_findings) LOOP
    BEGIN
      v_priority := COALESCE(v_finding->>'priority', '3');
      v_severity := CASE v_priority
        WHEN '1' THEN 'critical'
        WHEN '2' THEN 'warn'
        ELSE         'info'
      END;

      v_problem_key := COALESCE(
        regexp_replace(v_finding->>'finding_id', '^priority-[0-9]+/', ''),
        'unknown_finding'
      );

      -- ── condition_key 3-tier resolution ──

      -- Tier 1: prefer explicit field on the finding
      v_condition_key := v_finding->>'condition_key';

      IF v_condition_key IS NULL OR length(trim(v_condition_key)) = 0 THEN
        -- Tier 2: fallback — parse 'true-stuck-*' problem_key → 'true_stuck'
        IF v_problem_key LIKE 'true-stuck-%' THEN
          v_condition_key := 'true_stuck';
        ELSE
          -- Tier 3: emit_error fallback. Log and skip this finding.
          BEGIN
            INSERT INTO friction.emit_error
              (source, source_event_id, error_message, error_code, raw_payload, emitter_version)
            VALUES (
              'health_check',
              p_run_id || '/' || COALESCE(v_finding->>'finding_id', 'unknown'),
              format('condition_key not derivable: no explicit field on finding and problem_key %s does not match known patterns',
                     v_problem_key),
              'CONDITION-KEY-UNRESOLVED',
              v_finding,
              'cc-0017b-v1.0'
            );
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
          v_skipped_count := v_skipped_count + 1;
          CONTINUE;  -- skip to next finding
        END IF;
      END IF;

      -- Call canonical emit_event with priority-derived severity override
      PERFORM friction.emit_event(
        p_source             := 'health_check',
        p_condition_key      := v_condition_key,
        p_problem_key        := v_problem_key,
        p_source_event_id    := p_run_id || '/' || (v_finding->>'finding_id'),
        p_observed_at        := COALESCE((v_finding->>'observed_at')::timestamptz, now()),
        p_related_object     := v_finding->'related_object',
        p_observation_text   := COALESCE(v_finding->>'observation_text', v_finding->>'title', 'no text'),
        p_raw_payload        := jsonb_build_object(
          'health_check_run_id', p_run_id,
          'finding_id',          v_finding->>'finding_id',
          'markdown_path',       p_markdown_path,
          'priority',            v_finding->>'priority',
          'raw_finding',         v_finding
        ),
        p_reported_by        := 'system',
        p_severity_override  := v_severity
      );

      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO friction.emit_error
        (source, source_event_id, error_message, error_code, raw_payload, emitter_version)
      VALUES (
        'health_check',
        p_run_id || '/' || COALESCE(v_finding->>'finding_id', 'unknown'),
        SQLERRM, SQLSTATE,
        v_finding,
        'cc-0017b-v1.0'
      );
      v_failure_count := v_failure_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success_count', v_success_count,
    'failure_count', v_failure_count,
    'skipped_count', v_skipped_count,  -- NEW v2: findings where condition_key was unresolvable
    'run_id',        p_run_id
  );
END
$$;

COMMENT ON FUNCTION friction.fn_emit_health_check_findings(text, text, jsonb) IS
  'Cowork nightly-health-check-v1 brief RPC. v2 body (cc-0017b): thin wrapper over friction.emit_event. condition_key resolution is 3-tier: (1) finding.condition_key explicit field, (2) parse true-stuck-* fallback → true_stuck, (3) emit_error + skip. Preserves priority→severity mapping via p_severity_override. Return shape extended with skipped_count.';
```

---

## Step 9 — CREATE OR REPLACE FUNCTION friction.fn_emit_manual_event (RPC wrapper)

Signature preserved exactly: 6 params, returns uuid (event_id).

```sql
CREATE OR REPLACE FUNCTION friction.fn_emit_manual_event(
  p_observation_text text,
  p_severity         text,
  p_category         text,
  p_current_route    text   DEFAULT NULL,
  p_related_object   jsonb  DEFAULT NULL,
  p_notes            text   DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
DECLARE
  v_problem_key    text;
  v_related_object jsonb;
  v_event_id       uuid;
  v_case_id        uuid;
  v_disposition    text;
BEGIN
  -- Preserve cc-0014 validation rules
  IF p_observation_text IS NULL OR length(trim(p_observation_text)) < 5 THEN
    RAISE EXCEPTION 'observation_text required and must be >= 5 characters';
  END IF;
  IF COALESCE(p_severity, 'info') NOT IN ('info', 'warn', 'critical') THEN
    RAISE EXCEPTION 'severity must be info, warn, or critical';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM friction.category
     WHERE category_code = COALESCE(p_category, 'unclassified')
       AND is_active = true
  ) THEN
    RAISE EXCEPTION 'category % is not active', COALESCE(p_category, 'unclassified');
  END IF;

  -- Preserve cc-0014 problem_key derivation: first 50 chars, lowercase, non-alphanumeric → _
  v_problem_key := lower(regexp_replace(substring(p_observation_text from 1 for 50), '[^a-z0-9]+', '_', 'g'));

  -- Preserve cc-0014 related_object merge: include dashboard_route if provided
  v_related_object := COALESCE(p_related_object, '{}'::jsonb);
  IF p_current_route IS NOT NULL THEN
    v_related_object := v_related_object || jsonb_build_object('dashboard_route', p_current_route);
  END IF;

  -- Call canonical emit_event
  SELECT event_id, case_id, case_disposition
  INTO v_event_id, v_case_id, v_disposition
  FROM friction.emit_event(
    p_source             := 'manual',
    p_condition_key      := 'manual_fab',
    p_problem_key        := v_problem_key,
    p_source_event_id    := 'manual/' || gen_random_uuid()::text,  -- non-idempotent by design
    p_observed_at        := now(),
    p_related_object     := v_related_object,
    p_observation_text   := p_observation_text,
    p_raw_payload        := jsonb_build_object(
      'form_version', 'v1',
      'notes',        p_notes
    ),
    p_reported_by        := 'pk',
    p_severity_override  := COALESCE(p_severity, 'info'),
    p_category_override  := CASE WHEN p_category IS NOT NULL THEN p_category ELSE NULL END,
    p_dynamic_context    := jsonb_build_object(
      'fab_emission',  true,
      'current_route', p_current_route
    )
  );

  RETURN v_event_id;
END
$$;

COMMENT ON FUNCTION friction.fn_emit_manual_event(text, text, text, text, jsonb, text) IS
  'invegent-dashboard /operations FAB RPC. v2 body (cc-0017b): thin wrapper over friction.emit_event. Signature preserved exactly (6 params, RETURNS uuid). Non-idempotent by design: each FAB click generates a new source_event_id. p_severity passed as p_severity_override; p_category passed as p_category_override. When p_category is set, the category_source is "manual_at_capture" (preserving cc-0014 semantics) because p_reported_by="pk".';
```

---

## Step 10 — INSERT emission_rule seed rows

One rule per `(source, condition_key)` actually emitting today (per introspection Q5, Q6, P12). Future condition_keys for the same source (e.g. new health_check finding kinds) require new INSERTs.

```sql
INSERT INTO friction.emission_rule
  (source, condition_key, default_severity, default_category_code,
   problem_key_formula, dedupe_scope, case_policy, notes)
VALUES
  ('reconciliation',
   'observer_stale',
   'warn',
   'client_commitment',
   'p_problem_key = drift_type || ":" || client_id || ":" || platform (computed by fn_emit_reconciliation_event wrapper)',
   'open_cases',
   'auto_create',
   'Bound to AFTER INSERT trigger friction_emit_reconciliation on r.cadence_drift_log. Source seed installed cc-0017a; rule seed installed cc-0017b. New drift_type values require an additional emission_rule row before emit_event accepts them.'),

  ('health_check',
   'true_stuck',
   'warn',
   'pipeline_integrity',
   'p_problem_key = finding_id with priority-N/ prefix stripped (encodes platform-client). Computed by fn_emit_health_check_findings wrapper.',
   'open_cases',
   'auto_create',
   'Bound to Cowork nightly-health-check-v1 v3.0 brief RPC. condition_key derivation 3-tier (explicit field → parse true-stuck-* → emit_error). New finding kinds beyond true-stuck-* require either (a) an additional emission_rule row + condition_key derivation in wrapper, or (b) explicit condition_key field on the finding JSON.'),

  ('manual',
   'manual_fab',
   'info',
   'unclassified',
   'p_problem_key = first 50 chars of observation_text, lowercased + non-alphanumeric → _. Computed by fn_emit_manual_event wrapper.',
   'open_cases',
   'auto_create',
   'Bound to invegent-dashboard /operations FAB RPC. Single condition_key for FAB v1. p_severity and p_category from form override the rule defaults via p_severity_override and p_category_override.');
```

---

## Step 11 — GRANTs on new functions

```sql
-- emit_event canonical entrypoint
REVOKE EXECUTE ON FUNCTION friction.emit_event(text, text, text, text, timestamptz, jsonb, text, jsonb, text, text, text, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION friction.emit_event(text, text, text, text, timestamptz, jsonb, text, jsonb, text, text, text, jsonb) TO service_role, authenticated;

-- Helper functions
REVOKE EXECUTE ON FUNCTION friction.fn_severity_rank(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION friction.fn_severity_rank(text) TO service_role, authenticated;

REVOKE EXECUTE ON FUNCTION friction.fn_attach_or_create_inner_v1(text, timestamptz, text, text, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION friction.fn_attach_or_create_inner_v1(text, timestamptz, text, text, text, text) TO service_role, authenticated;

-- The 3 wrapper function grants carry from cc-0014 unchanged (CREATE OR REPLACE preserves grants).
```

---

**End of migration body.** Transaction commits atomically; all steps land or none do.

**Next:** [`vchecks.md`](vchecks.md) — V-B1 through V-B27 post-apply verification.
