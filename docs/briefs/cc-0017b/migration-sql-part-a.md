# cc-0017b § 5.2 (Steps 1–6) — Migration SQL Part A

**Part of:** [`cc-0017b-friction-register-unified-emit-event.md`](../cc-0017b-friction-register-unified-emit-event.md)
**Prev:** [`preflight-pset.md`](preflight-pset.md) **Next:** [`migration-sql-part-b.md`](migration-sql-part-b.md)

---

**Migration name:** `cc_0017b_friction_unified_emit_event`
**Apply via:** `apply_migration` MCP after D-01 approval.
**Recommended timing:** outside 03:30 AEST ± 30 min (cron 85 fire) and 02:00 AEST ± 30 min (cron 86 fire).
**Atomicity:** single transaction. All-or-nothing per PostgreSQL DDL semantics.

This file covers Steps 1–6. Continue to [`migration-sql-part-b.md`](migration-sql-part-b.md) for Steps 7–11.

---

## Step 1 — Transition-window NULL dedupe_fingerprint backfill on friction.case

```sql
-- Backfill any case created between cc-0017a apply (06:56:10 UTC) and this apply that has
-- NULL dedupe_fingerprint. Uses fn_compute_dedupe_fingerprint_v1 to keep formula consistent
-- with cc-0017a backfill (sha256 canonical).

WITH ranked_events AS (
  SELECT case_id, source, problem_key, related_object,
         row_number() OVER (PARTITION BY case_id ORDER BY observed_at DESC, event_id DESC) AS rn
  FROM friction.event
  WHERE case_id IS NOT NULL
)
UPDATE friction.case c
SET dedupe_fingerprint = friction.fn_compute_dedupe_fingerprint_v1(e.source, e.problem_key, e.related_object)
FROM ranked_events e
WHERE e.case_id = c.case_id
  AND e.rn = 1
  AND c.dedupe_fingerprint IS NULL;

-- Hard-stop: any remaining NULL fingerprints must be bona fide orphans (no linked event)
DO $$
DECLARE v_null_after integer;
BEGIN
  SELECT count(*) INTO v_null_after
  FROM friction.case c
  WHERE c.dedupe_fingerprint IS NULL
    AND EXISTS (SELECT 1 FROM friction.event e WHERE e.case_id = c.case_id);
  IF v_null_after > 0 THEN
    RAISE EXCEPTION 'cc-0017b Step 1 backfill incomplete: % cases with linked events still have NULL fingerprint', v_null_after
      USING HINT = 'Investigate which cases — likely a backfill formula edge case.';
  END IF;
  RAISE NOTICE 'cc-0017b Step 1: transition-window backfill complete; 0 orphan-violations.';
END $$;
```

---

## Step 2a — Extend friction.event.category_source CHECK constraint

```sql
-- Add 'category_override' (NOT 'severity_override' per PK directive 2026-05-18).
-- Severity override provenance lives in dynamic_context (Step 2b column).

ALTER TABLE friction.event DROP CONSTRAINT event_category_source_check;
ALTER TABLE friction.event ADD CONSTRAINT event_category_source_check
  CHECK (category_source = ANY (ARRAY[
    'emitter_default'::text,
    'manual_at_capture'::text,
    'triage_override'::text,
    'category_override'::text
  ]));

COMMENT ON CONSTRAINT event_category_source_check ON friction.event IS
  'Provenance of the category field. emitter_default = from emission_rule.default_category_code. manual_at_capture = PK set via FAB. triage_override = downstream operator override via fn_triage_case. category_override = emit_event caller passed p_category_override (non-manual path). Severity override provenance is stored in dynamic_context jsonb, NOT here (per PK directive 2026-05-18).';
```

## Step 2b — Add friction.event.dynamic_context column

```sql
ALTER TABLE friction.event ADD COLUMN dynamic_context jsonb;

COMMENT ON COLUMN friction.event.dynamic_context IS
  'Emission-time audit blob. Stores: (1) severity_override provenance {applied, rule_default, source_default, effective_was} when emit_event caller passed p_severity_override; (2) category_override provenance {applied, rule_default, source_default, effective_was} when caller passed p_category_override; (3) any caller-supplied p_dynamic_context (e.g. client_tier, vip flag). NULL when no overrides applied AND no caller context. Acceptable size: < 4 KB per row; no CHECK enforces this in v1.';
```

---

## Step 3 — CREATE FUNCTION friction.fn_severity_rank

```sql
CREATE OR REPLACE FUNCTION friction.fn_severity_rank(p_severity text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = friction, public
AS $$
  SELECT CASE p_severity
    WHEN 'critical' THEN 2
    WHEN 'warn'     THEN 1
    WHEN 'info'     THEN 0
    ELSE -1  -- unknown/NULL ranks below info; won't escalate
  END;
$$;

COMMENT ON FUNCTION friction.fn_severity_rank(text) IS
  'Severity comparator for escalation logic. IMMUTABLE. Used by fn_attach_or_create_inner_v1 attach-path to decide whether incoming event escalates an open case.';
```

---

## Step 4 — CREATE FUNCTION friction.fn_attach_or_create_inner_v1

Shared decision tree extracted from emit_event Step 8 so the trigger function's defence-in-depth path can reuse it without rule lookup or severity override logic.

```sql
CREATE OR REPLACE FUNCTION friction.fn_attach_or_create_inner_v1(
  p_dedupe           text,
  p_observed_at      timestamptz,
  p_severity         text,
  p_category         text,
  p_problem_key      text,
  p_observation_text text
)
RETURNS TABLE (case_id uuid, disposition text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
DECLARE
  v_case_id        uuid;
  v_closed_id      uuid;
  v_closed_at      timestamptz;
  v_retry_count    integer := 0;
  v_disposition    text;
BEGIN
  <<retry_loop>>
  LOOP
    BEGIN
      -- Path 6a: OPEN case match (acquire row lock to serialise concurrent emit calls)
      SELECT c.case_id INTO v_case_id
      FROM friction.case c
      WHERE c.dedupe_fingerprint = p_dedupe
        AND c.resolved_at IS NULL
      LIMIT 1
      FOR UPDATE;

      IF FOUND THEN
        UPDATE friction.case
        SET event_count  = event_count + 1,
            last_seen_at = GREATEST(last_seen_at, p_observed_at),
            severity     = CASE
              WHEN friction.fn_severity_rank(p_severity) > friction.fn_severity_rank(severity)
                THEN p_severity ELSE severity
            END,
            updated_at   = now()
        WHERE friction.case.case_id = v_case_id;
        v_disposition := 'attached_open';
        RETURN QUERY SELECT v_case_id, v_disposition;
        RETURN;
      END IF;

      -- No open match. Look for most recent closed case with matching fingerprint.
      SELECT c.case_id, c.resolved_at INTO v_closed_id, v_closed_at
      FROM friction.case c
      WHERE c.dedupe_fingerprint = p_dedupe
        AND c.resolved_at IS NOT NULL
      ORDER BY c.resolved_at DESC
      LIMIT 1
      FOR UPDATE;

      IF FOUND AND (now() - v_closed_at < interval '14 days') THEN
        -- Path 6b: REOPEN within 14-day window per §5.5 Clarification 1
        UPDATE friction.case
        SET resolved_at     = NULL,
            resolution_kind = 'reopened',   -- transient state marker; operator action overwrites
            reopen_count    = reopen_count + 1,
            last_seen_at    = p_observed_at,
            event_count     = event_count + 1,
            severity        = p_severity,   -- replace, not max (PK directive)
            updated_at      = now()
        WHERE friction.case.case_id = v_closed_id;
        v_case_id := v_closed_id;
        v_disposition := 'reopened_within_window';
        RETURN QUERY SELECT v_case_id, v_disposition;
        RETURN;
      END IF;

      -- Path 6c (recurrence >14d → predecessor link) or 6d (no historical match → no predecessor)
      INSERT INTO friction.case (
        case_title, first_seen_at, last_seen_at, event_count,
        severity, category, problem_key, triage_state,
        dedupe_fingerprint, predecessor_case_id
      )
      VALUES (
        LEFT(COALESCE(p_observation_text, p_problem_key, 'unnamed'), 100),
        p_observed_at, p_observed_at, 1,
        p_severity, p_category, p_problem_key, 'new',
        p_dedupe, v_closed_id  -- NULL when 6d (no historical match)
      )
      RETURNING friction.case.case_id INTO v_case_id;

      v_disposition := CASE WHEN v_closed_id IS NOT NULL
                            THEN 'created_after_window'
                            ELSE 'created_new'
                       END;
      RETURN QUERY SELECT v_case_id, v_disposition;
      RETURN;

    EXCEPTION WHEN unique_violation THEN
      -- Race: concurrent emit_event won the INSERT on case_open_dedupe_uniq.
      -- Retry SELECT path once. On second failure, re-raise.
      IF v_retry_count >= 1 THEN
        RAISE;
      END IF;
      v_retry_count := v_retry_count + 1;
      v_closed_id := NULL;
      v_closed_at := NULL;
      v_case_id := NULL;
      CONTINUE retry_loop;
    END;
  END LOOP retry_loop;
END
$$;

COMMENT ON FUNCTION friction.fn_attach_or_create_inner_v1(text, timestamptz, text, text, text, text) IS
  'Shared attach-or-create-or-reopen decision tree. Called by friction.emit_event (canonical path) AND by friction.fn_promote_event_to_case (defence-in-depth trigger path for direct INSERTs). Returns case_id + disposition. Implements 14-day reopen window per §5.5 Clarification 1. Race-safe: one retry on unique_violation, then re-raise.';
```

---

## Step 5 — CREATE OR REPLACE FUNCTION friction.fn_promote_event_to_case

Function name and trigger binding unchanged from cc-0014 (no DROP TRIGGER / CREATE TRIGGER needed). Body fully rewritten: GUC-aware bypass + defence-in-depth attach-or-create-or-reopen.

```sql
CREATE OR REPLACE FUNCTION friction.fn_promote_event_to_case()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
DECLARE
  v_bypass     text;
  v_result     RECORD;
BEGIN
  -- GUC bypass: emit_event signals it's in control via 'friction.emit_event_active' GUC.
  -- Transaction-local (set_config with is_local=true). When emit_event INSERTs into
  -- friction.event, this trigger sees the GUC, no-ops, and lets emit_event Step 8 (which is
  -- fn_attach_or_create_inner_v1) handle case resolution + Step 9's UPDATE event SET case_id.
  v_bypass := current_setting('friction.emit_event_active', true);  -- missing_ok = true
  IF v_bypass = 'true' THEN
    RETURN NEW;  -- emit_event in control; trigger no-ops
  END IF;

  -- ── Defence-in-depth path: direct INSERT bypassed emit_event ──
  -- Reachable until Wave 0c's Amendment F REVOKE on direct INSERT lands.

  -- Idempotency: pre-set case_id is respected (caller already resolved the case)
  IF NEW.case_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Log the bypass to friction.emit_error for audit (NEVER raise on audit failure)
  BEGIN
    INSERT INTO friction.emit_error
      (source, source_event_id, error_message, error_code, raw_payload, emitter_version)
    VALUES (
      NEW.source, NEW.source_event_id,
      'Direct INSERT bypassed friction.emit_event() — defence-in-depth trigger path engaged.',
      'BYPASS-DEFENCE',
      row_to_json(NEW)::jsonb,
      'cc-0017b-v1.0'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- audit failure must not block the user's INSERT
  END;

  -- Run shared attach-or-create-or-reopen decision tree
  SELECT * INTO v_result FROM friction.fn_attach_or_create_inner_v1(
    NEW.dedupe_fingerprint,
    NEW.observed_at,
    NEW.severity,
    NEW.category,
    NEW.problem_key,
    NEW.observation_text
  );

  NEW.case_id := v_result.case_id;
  RETURN NEW;
END
$$;

COMMENT ON FUNCTION friction.fn_promote_event_to_case() IS
  'BEFORE INSERT trigger on friction.event. v2 body (cc-0017b): if emit_event GUC is active, no-op (emit_event handles case logic); else defence-in-depth attach-or-create-or-reopen using shared fn_attach_or_create_inner_v1 helper. Logs bypass attempts to friction.emit_error for audit. Trigger binding (friction_event_promote_to_case) unchanged from cc-0014.';
```

---

## Step 6 — CREATE OR REPLACE FUNCTION friction.emit_event (CANONICAL ENTRYPOINT)

```sql
CREATE OR REPLACE FUNCTION friction.emit_event(
  p_source              text,
  p_condition_key       text,
  p_problem_key         text,
  p_source_event_id     text,
  p_observed_at         timestamptz,
  p_related_object      jsonb,
  p_observation_text    text,
  p_raw_payload         jsonb,
  p_reported_by         text     DEFAULT 'system',
  p_severity_override   text     DEFAULT NULL,
  p_category_override   text     DEFAULT NULL,
  p_dynamic_context     jsonb    DEFAULT NULL
)
RETURNS TABLE (
  event_id          uuid,
  case_id           uuid,
  case_disposition  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = friction, public
AS $$
DECLARE
  v_source_row       friction.source%ROWTYPE;
  v_rule             friction.emission_rule%ROWTYPE;
  v_dedupe           text;
  v_severity         text;
  v_category         text;
  v_category_source  text;
  v_event_id         uuid;
  v_case_id          uuid;
  v_disposition      text;
  v_inner            RECORD;
  v_final_context    jsonb;
  v_rule_default_sev text;
  v_rule_default_cat text;
BEGIN
  -- ── Step 1: Validate inputs ──
  IF p_source IS NULL OR length(trim(p_source)) = 0 THEN
    RAISE EXCEPTION 'emit_event: p_source is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_condition_key IS NULL OR length(trim(p_condition_key)) = 0 THEN
    RAISE EXCEPTION 'emit_event: p_condition_key is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_problem_key IS NULL OR length(trim(p_problem_key)) = 0 THEN
    RAISE EXCEPTION 'emit_event: p_problem_key is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_source_event_id IS NULL OR length(trim(p_source_event_id)) = 0 THEN
    RAISE EXCEPTION 'emit_event: p_source_event_id is required (idempotency key)' USING ERRCODE = 'P0001';
  END IF;
  IF p_observation_text IS NULL OR length(trim(p_observation_text)) < 5 THEN
    RAISE EXCEPTION 'emit_event: p_observation_text required and must be >= 5 characters' USING ERRCODE = 'P0001';
  END IF;
  IF p_observed_at IS NULL THEN
    RAISE EXCEPTION 'emit_event: p_observed_at is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_observed_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'emit_event: p_observed_at is in the future (clock skew?). value=%, now=%', p_observed_at, now()
      USING ERRCODE = 'P0001';
  END IF;
  IF p_reported_by IS NULL OR p_reported_by NOT IN ('system','pk','client','vendor','unknown') THEN
    RAISE EXCEPTION 'emit_event: p_reported_by must be one of system/pk/client/vendor/unknown; got %', p_reported_by
      USING ERRCODE = 'P0001';
  END IF;
  IF p_severity_override IS NOT NULL AND p_severity_override NOT IN ('info','warn','critical') THEN
    RAISE EXCEPTION 'emit_event: p_severity_override must be info/warn/critical or NULL; got %', p_severity_override
      USING ERRCODE = 'P0001';
  END IF;
  IF p_category_override IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM friction.category
       WHERE category_code = p_category_override AND is_active = true
    ) THEN
      RAISE EXCEPTION 'emit_event: p_category_override % is not an active friction.category code', p_category_override
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- ── Step 2: Set GUC bypass for the BEFORE INSERT trigger ──
  -- is_local = true → transaction-scoped; auto-cleared on COMMIT/ROLLBACK.
  PERFORM set_config('friction.emit_event_active', 'true', true);

  -- ── Step 3: Resolve source row (must exist + be active) ──
  SELECT * INTO v_source_row FROM friction.source
   WHERE source_code = p_source AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'emit_event: friction.source code % not found or inactive', p_source
      USING ERRCODE = 'P0001',
            HINT    = 'Register the source via INSERT INTO friction.source before emitting.';
  END IF;

  -- ── Step 4: Resolve emission_rule (strict contract per Decision 5) ──
  SELECT * INTO v_rule FROM friction.emission_rule
   WHERE source = p_source AND condition_key = p_condition_key AND enabled = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'emit_event: no enabled emission_rule for (source=%, condition_key=%)',
                    p_source, p_condition_key
      USING ERRCODE = 'P0001',
            HINT    = 'INSERT a row into friction.emission_rule before emitting under this condition_key.';
  END IF;

  -- Handle case_policy='suppress' — log to emit_error, do not write event or case
  IF v_rule.case_policy = 'suppress' THEN
    BEGIN
      INSERT INTO friction.emit_error
        (source, source_event_id, error_message, error_code, raw_payload, emitter_version)
      VALUES (
        p_source, p_source_event_id,
        format('emit_event: emission_rule.case_policy=suppress for (source=%s, condition_key=%s); event not written',
               p_source, p_condition_key),
        'POLICY-SUPPRESS',
        COALESCE(p_raw_payload, '{}'::jsonb),
        'cc-0017b-v1.0'
      );
    EXCEPTION WHEN OTHERS THEN NULL;  -- audit best-effort
    END;
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, 'suppressed_by_rule'::text;
    RETURN;
  END IF;

  -- ── Step 5: Resolve effective severity + category + category_source ──
  v_rule_default_sev := COALESCE(v_rule.default_severity, v_source_row.default_severity);
  v_rule_default_cat := COALESCE(v_rule.default_category_code, v_source_row.default_category_code);

  v_severity := COALESCE(p_severity_override, v_rule_default_sev);
  v_category := COALESCE(p_category_override, v_rule_default_cat);

  -- category_source per PK directive: 'severity_override' NOT added; severity provenance in dynamic_context.
  v_category_source := CASE
    WHEN p_reported_by = 'pk' AND p_category_override IS NOT NULL THEN 'manual_at_capture'
    WHEN p_category_override IS NOT NULL                          THEN 'category_override'
    ELSE                                                              'emitter_default'
  END;

  -- ── Step 5b: Build dynamic_context with override provenance ──
  v_final_context := COALESCE(p_dynamic_context, '{}'::jsonb);

  IF p_severity_override IS NOT NULL THEN
    v_final_context := v_final_context || jsonb_build_object(
      'severity_override', jsonb_build_object(
        'applied',        p_severity_override,
        'rule_default',   v_rule.default_severity,
        'source_default', v_source_row.default_severity,
        'effective_was',  v_rule_default_sev
      )
    );
  END IF;

  IF p_category_override IS NOT NULL THEN
    v_final_context := v_final_context || jsonb_build_object(
      'category_override', jsonb_build_object(
        'applied',        p_category_override,
        'rule_default',   v_rule.default_category_code,
        'source_default', v_source_row.default_category_code,
        'effective_was',  v_rule_default_cat
      )
    );
  END IF;

  IF v_final_context = '{}'::jsonb THEN v_final_context := NULL; END IF;

  -- ── Step 6: Compute canonical sha256 dedupe_fingerprint ──
  v_dedupe := friction.fn_compute_dedupe_fingerprint_v1(p_source, p_problem_key, p_related_object);

  -- ── Step 7: INSERT friction.event with idempotency catch on (source, source_event_id) ──
  BEGIN
    INSERT INTO friction.event (
      event_id, source, source_event_id, observed_at,
      severity, category, category_source, reported_by,
      problem_key, observation_text, related_object, raw_payload,
      dedupe_fingerprint, dynamic_context, case_id
    )
    VALUES (
      gen_random_uuid(), p_source, p_source_event_id, p_observed_at,
      v_severity, v_category, v_category_source, p_reported_by,
      p_problem_key, p_observation_text, p_related_object, p_raw_payload,
      v_dedupe, v_final_context, NULL  -- case_id patched in Step 9 after resolution
    )
    RETURNING friction.event.event_id INTO v_event_id;

  EXCEPTION WHEN unique_violation THEN
    -- Idempotent replay: (source, source_event_id) already exists. Return prior event.
    SELECT e.event_id, e.case_id INTO v_event_id, v_case_id
    FROM friction.event e
    WHERE e.source = p_source AND e.source_event_id = p_source_event_id;
    v_disposition := 'idempotent_replay';
    RETURN QUERY SELECT v_event_id, v_case_id, v_disposition;
    RETURN;
  END;

  -- ── Step 8: Attach-or-create-or-reopen via shared helper ──
  SELECT * INTO v_inner FROM friction.fn_attach_or_create_inner_v1(
    v_dedupe, p_observed_at, v_severity, v_category, p_problem_key, p_observation_text
  );
  v_case_id     := v_inner.case_id;
  v_disposition := v_inner.disposition;

  -- ── Step 9: Patch event.case_id and return ──
  UPDATE friction.event SET case_id = v_case_id WHERE event_id = v_event_id;

  RETURN QUERY SELECT v_event_id, v_case_id, v_disposition;
END
$$;

COMMENT ON FUNCTION friction.emit_event(text, text, text, text, timestamptz, jsonb, text, jsonb, text, text, text, jsonb) IS
  'Canonical entrypoint for all friction emissions (cc-0017b Wave 0b). Returns (event_id, case_id, case_disposition). Disposition values: attached_open / reopened_within_window / created_after_window / created_new / idempotent_replay / suppressed_by_rule. Sets transaction-local GUC friction.emit_event_active=true so the BEFORE INSERT trigger on friction.event no-ops. Reopen window N=14 days per §5.5 Clarification 1. Severity/category override provenance stored in dynamic_context jsonb (PK directive 2026-05-18).';
```

---

**Next:** [`migration-sql-part-b.md`](migration-sql-part-b.md) — Steps 7–11 (3 wrapper rewrites + emission_rule seeds + GRANTs).
