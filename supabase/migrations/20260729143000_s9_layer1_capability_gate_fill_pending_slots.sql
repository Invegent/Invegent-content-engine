-- =====================================================================
-- S9 Capability Enforcement -- Objective 1 / LAYER 1 (schedule-fill chokepoint)
--   REV 2 (2026-07-29) -- incorporates PK ruling "Option A" (template-less carve-out).
--
-- Brief:        docs/briefs/s9-resolver-enforcement-build-brief-v1.md
-- Architecture: docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md
--               (PK-approved 2026-07-28, five rulings) section 2.1 Layer 1, section 4.
-- Tier:         T3 (production schedule-fill function; the PK apply gate is a HARD STOP)
--
-- NOT PREVIOUSLY APPLIED. This file was re-cut in place after the PK ruling; the
-- version identity 20260729143000 was never applied and holds no schema_migrations
-- ledger row, so re-cutting it is not a rewrite of an applied migration.
--
-- WHAT CHANGES (two objects, ONE transaction -- they must apply together, because
-- the gate calls the helper)
--   1. NEW public.is_capability_exempt_format(text) -- read-only registry accessor.
--   2. m.fill_pending_slots gains ONE fail-closed capability gate, placed immediately
--      after the existing cc-0019 publish-eligibility gate and ABOVE the T0 manual
--      branch (so manual and automated slots are gated uniformly).
--      For each pending slot it classifies the candidate format via the live, dark,
--      service-role-only public.classify_format_capability(client_slug, platform, format).
--        * status = 'ready'      -> behaviour is byte-for-byte UNCHANGED.
--        * non-ready + EXEMPT    -> proceeds unchanged (template-less carve-out, below).
--        * non-ready + NOT exempt-> the slot is SKIPPED WITH EVIDENCE and the loop
--                                   CONTINUEs before any pool query / skeleton draft /
--                                   ai_job / token spend.
--      NO substitution, no re-pick, no fallback to a legacy default: the schedule's
--      desired format is preserved as unmet demand (PK ruling 3).
--
-- TEMPLATE-LESS CARVE-OUT (PK ruling 2026-07-29, "Option A")
--   Formats with render_engine='none' need no visual template, so select_template
--   legitimately fail-closes for them and the classifier reports
--   unsupported_silent_degrade -- a coverage artefact, not a capability gap. Without
--   the carve-out the gate would stop ALL plain-text posting (~220 publishes/90d).
--   The exemption is evaluated ONLY on the non-ready path (ready path byte-unchanged,
--   no added latency) and on exactly the format string that was classified.
--   Audit the exempt set with ONE query -- it is never hardcoded in a worker:
--     SELECT ice_format_key FROM t."5.3_content_format" WHERE render_engine='none';
--
-- BLOCKED-STATE REPRESENTATION (no TABLE schema change -- no ALTER TABLE anywhere)
--   m.slot.status                     = 'skipped'                 (existing value)
--   m.slot.skip_reason                = 'capability_blocked:<status>:<format>'
--   m.slot_fill_attempt.decision      = 'skipped'                 (existing value)
--   m.slot_fill_attempt.skip_reason   = the same composed code
--   m.slot_fill_attempt.pool_snapshot = { gate, client_slug, capability: <classifier jsonb> }
--   m.slot_fill_attempt.error_message = SQLSTATE/SQLERRM, exception paths only
--   m.slot.format_chosen is NOT overwritten, and no m.post_draft row is created, so
--   video_status / approval_status / publish-failure statuses are untouched by
--   construction (PK ruling 3 forbids reusing any of them for capability blocking).
--
-- FAIL-CLOSED SEMANTICS
--   * Unresolvable client_slug   -> status 'unknown'                -> skip.
--   * Classifier raises          -> status 'capability_check_error' -> skip THAT SLOT
--     ONLY. Never re-raised: re-raising would abort the whole batch transaction and
--     roll back other clients' already-filled slots in the same cron tick. SQLSTATE
--     and SQLERRM are captured to error_message AND emitted as a RAISE WARNING.
--   * Exemption lookup raises    -> treated as NOT exempt (stays gated) + WARNING.
--     An exemption that cannot be proven is never granted.
--   * Each EXCEPTION block wraps ONLY its single call, never surrounding logic, so
--     neither can mask an unrelated defect in the slot loop.
--   * The ready test is generic (IS DISTINCT FROM 'ready'), never an enumeration of
--     blocked statuses, so any future classifier status is covered by construction.
--
-- BASELINE PROVENANCE
--   The pre-change body embedded below is byte-identical to the LIVE function pulled
--   fresh via pg_get_functiondef on 2026-07-29: prosrc md5
--   afd62a2116d23cb0a03d089d108e6a36, length 27080. Verified, not assumed.
--
-- SECURITY / GRANTS
--   m.fill_pending_slots is unchanged in posture: SECURITY INVOKER, owner postgres,
--   invoked only by cron job 75 ("*/10 * * * *", username postgres), which holds
--   EXECUTE on public.classify_format_capability. The ONLY grant statements in this
--   migration are the four on the NEW helper (REVOKE from PUBLIC/anon/authenticated,
--   GRANT to service_role) -- required because new public functions are born
--   anon-executable via pg_default_acl. Every reference is schema-qualified.
--
-- ROLLBACK
--   supabase/migrations/ROLLBACK_20260729143000_s9_layer1_capability_gate_fill_pending_slots.sql
--   (restores the exact pre-change body, then drops the new helper).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1/2 — public.is_capability_exempt_format(text)  [NEW, read-only]
--
-- WHY THIS EXISTS (PK ruling 2026-07-29, Option A). A format whose registry row
-- says render_engine='none' needs no visual template. public.select_template
-- therefore legitimately fail-closes 'format_unmapped' for it, and because such
-- posts DO publish, classify_format_capability's precedence-first silent-degrade
-- overlay reports 'unsupported_silent_degrade'. That is a classifier-coverage
-- artefact, not a capability gap. Today exactly ONE active format matches:
--   SELECT ice_format_key FROM t."5.3_content_format" WHERE render_engine='none';
--   -> 'text'   (output_mime_type='text/plain')
-- That one-line query IS the audit of the exempt set — the list is never
-- hardcoded in a worker, so it cannot drift from the registry.
--
-- WHY A FUNCTION rather than an inline query in each layer: schema `t` grants
-- USAGE to postgres/inspector_ro/retool_ui ONLY — NOT service_role — so the
-- ai-worker edge function (service_role) cannot read t."5.3_content_format"
-- directly. A single SECURITY DEFINER accessor gives BOTH layers one shared
-- source of truth and avoids routing a safety gate through the arbitrary-SQL
-- exec_sql function (a known authz hazard).
--
-- FAIL-CLOSED BY CONSTRUCTION: returns TRUE only when a row positively matches.
-- NULL input, unknown format, missing row, or NULL render_engine all yield
-- FALSE (= NOT exempt = still gated). EXISTS never returns NULL.
--
-- Security posture mirrors public.classify_format_capability / select_template:
-- SECURITY DEFINER, owner postgres, STABLE, SET search_path='' with every
-- reference schema-qualified, no dynamic SQL, EXECUTE revoked from PUBLIC/anon/
-- authenticated and granted to service_role only. The REVOKEs are MANDATORY, not
-- decorative: new public functions are born anon-executable via pg_default_acl.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_capability_exempt_format(p_format text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM t."5.3_content_format" f
    WHERE f.ice_format_key = p_format
      AND f.render_engine  = 'none'
  );
$fn$;

REVOKE ALL ON FUNCTION public.is_capability_exempt_format(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_capability_exempt_format(text) FROM anon;
REVOKE ALL ON FUNCTION public.is_capability_exempt_format(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_capability_exempt_format(text) TO service_role;

-- ---------------------------------------------------------------------------
-- 2/2 — m.fill_pending_slots: add the fail-closed capability gate
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION m.fill_pending_slots(p_max_slots integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_slot                  record;
  v_dedup                 record;
  v_synthesis             record;
  v_quality               record;
  v_pool_health           jsonb;
  v_threshold_check       jsonb;
  v_chosen_format         text;
  v_min_fitness           numeric;
  v_threshold_relaxed     boolean;
  v_pool_count            integer;
  v_pool_total_in_scope   integer;
  v_pool_snapshot         jsonb;
  v_top_pool_rows         jsonb;
  v_canonical_ids         uuid[];
  v_evergreen_id          uuid;
  v_is_evergreen          boolean;
  v_best_fitness          numeric;
  v_top_recency           numeric;
  v_source_diversity      integer;
  v_slot_confidence       numeric;
  v_decision              text;
  v_skip_reason           text;
  v_skeleton_draft_id     uuid;
  v_ai_job_id             uuid;
  v_attempt_id            uuid;
  v_evergreen_ratio       numeric;
  v_processed_count       integer := 0;
  v_results               jsonb := '[]'::jsonb;
  v_per_slot_result       jsonb;
  v_evergreen_row         record;
  -- S9 Layer 1 capability gate (fail-closed) — added by 20260729143000
  v_cap_slug              text;
  v_cap_format            text;
  v_cap_status            text;
  v_cap_evidence          jsonb;
  v_cap_error             text;
  v_cap_skip              text;
  v_cap_exempt            boolean;
BEGIN
  SELECT * INTO v_dedup
  FROM t.dedup_policy
  WHERE policy_name='default' AND is_current=true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('processed', 0, 'error', 'default dedup_policy not found', 'ran_at', NOW());
  END IF;

  FOR v_slot IN
    SELECT *
    FROM m.slot
    WHERE status = 'pending_fill'
      AND fill_window_opens_at <= NOW()
    ORDER BY scheduled_publish_at ASC
    LIMIT p_max_slots
    FOR UPDATE SKIP LOCKED
  LOOP
    v_processed_count := v_processed_count + 1;
    v_threshold_relaxed := false;
    v_decision := NULL;
    v_skip_reason := NULL;
    v_canonical_ids := NULL;
    v_evergreen_id := NULL;
    v_is_evergreen := false;
    v_pool_snapshot := '{}'::jsonb;
    v_skeleton_draft_id := NULL;
    v_ai_job_id := NULL;
    v_best_fitness := 0;
    v_top_recency := 0;
    v_source_diversity := 0;
    v_pool_health := NULL;
    v_evergreen_ratio := NULL;

    -- cc-0019 GATE (the ONLY addition to this function)
    -- Cost gate: if this (client, platform) has no live publish path, do not
    -- spend AI tokens. Preserve visibility (slot_fill_attempt + results), mark
    -- the slot skipped, and CONTINUE before any pool query / draft / ai_job.
    IF NOT m.is_publish_eligible(v_slot.client_id, v_slot.platform) THEN
      INSERT INTO m.slot_fill_attempt (
        attempt_id, slot_id, attempted_at, pool_size_at_attempt, pool_snapshot,
        decision, skip_reason, selected_canonical_ids, selected_evergreen_id,
        chosen_format, threshold_relaxed, pool_health_at_attempt,
        evergreen_ratio_at_attempt, error_message, created_at
      ) VALUES (
        gen_random_uuid(), v_slot.slot_id, NOW(), 0, '{}'::jsonb,
        'skipped', 'publish_path_disabled', NULL, NULL,
        COALESCE(v_slot.format_preference[1],'image_quote'), false, NULL,
        NULL, NULL, NOW()
      );

      UPDATE m.slot
      SET status = 'skipped', skip_reason = 'publish_path_disabled', updated_at = NOW()
      WHERE slot_id = v_slot.slot_id;

      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'slot_id', v_slot.slot_id, 'client_id', v_slot.client_id,
        'platform', v_slot.platform, 'decision', 'skipped',
        'skip_reason', 'publish_path_disabled'));

      CONTINUE;  -- no skeleton draft, no ai_job, no token spend
    END IF;
    -- end cc-0019 GATE

    -- == S9 LAYER 1 CAPABILITY GATE (fail-closed) ==============================
    -- Brief:        docs/briefs/s9-resolver-enforcement-build-brief-v1.md
    -- Architecture: docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md
    --               section 2.1, "Layer 1 (schedule-fill, m.fill_pending_slots)".
    -- Classify the candidate format for THIS (client, platform) cell BEFORE any
    -- pool query, skeleton draft, ai_job or token spend. Anything other than
    -- 'ready' is a SKIP WITH EVIDENCE, never a substitution to another legacy
    -- format (PK ruling 3: no silent degrade; the schedule's desired format is
    -- preserved as unmet demand). Deliberately positioned ABOVE the T0 manual
    -- branch so operator-authored slots are gated identically to automated ones
    -- (PK ruling 2026-07-29: apply uniformly, no carve-out by slot origin).
    -- The ready test is GENERIC, never an enumeration of blocked statuses, so any
    -- status the classifier gains later (e.g. publisher_path_missing) is covered
    -- by construction.
    v_cap_format   := COALESCE(v_slot.format_preference[1], 'image_quote');
    v_cap_status   := NULL;
    v_cap_evidence := NULL;
    v_cap_error    := NULL;
    v_cap_skip     := NULL;
    v_cap_slug     := NULL;
    v_cap_exempt   := false;

    -- classify_format_capability takes p_client_slug; this function otherwise
    -- works purely in client_id (uuid), so resolve the slug explicitly.
    SELECT cl.client_slug INTO v_cap_slug
    FROM c.client cl
    WHERE cl.client_id = v_slot.client_id;

    IF v_cap_slug IS NULL THEN
      -- Cannot address the cell, so cannot prove capability: fail closed.
      v_cap_status := 'unknown';
      v_cap_error  := 'client_slug_unresolved';
    ELSE
      -- EXCEPTION SCOPE IS DELIBERATELY MINIMAL: this block wraps ONLY the
      -- classifier call, never the surrounding slot logic, so an unrelated
      -- defect elsewhere in this loop can never be silently swallowed here.
      BEGIN
        v_cap_evidence := public.classify_format_capability(
                            v_cap_slug, v_slot.platform, v_cap_format);
        v_cap_status   := COALESCE(v_cap_evidence->>'status', 'unknown');
      EXCEPTION WHEN OTHERS THEN
        -- Fail closed at the SINGLE-SLOT level only, and never re-raise: an
        -- exception escaping here would abort the whole batch transaction and
        -- roll back other clients' already-filled slots in the same cron tick.
        -- SQLSTATE/SQLERRM are CAPTURED (attempt.error_message plus a WARNING),
        -- never swallowed, so a real recurring classifier defect stays
        -- distinguishable from an expected non-ready classification.
        v_cap_status := 'capability_check_error';
        v_cap_error  := 'sqlstate=' || SQLSTATE || '; sqlerrm=' || left(SQLERRM, 400);
        RAISE WARNING '[s9-layer1] classify_format_capability failed: slot=% client=% platform=% format=% sqlstate=% sqlerrm=%',
          v_slot.slot_id, v_slot.client_id, v_slot.platform, v_cap_format, SQLSTATE, SQLERRM;
      END;
    END IF;

    IF v_cap_status IS DISTINCT FROM 'ready' THEN
      -- ---- TEMPLATE-LESS CARVE-OUT (PK ruling 2026-07-29, Option A) ----------
      -- A format with render_engine='none' needs no visual template, so
      -- select_template legitimately fail-closes 'format_unmapped' for it and
      -- the classifier's silent-degrade overlay then reports
      -- unsupported_silent_degrade. That is a classifier-coverage artefact, NOT
      -- a capability gap: today this is true of 'text' and nothing else. Without
      -- this carve-out the gate would stop ALL plain-text posting.
      -- The exemption is evaluated ONLY on the non-ready path, so the ready path
      -- is byte-unchanged and pays no extra call; and it is evaluated on exactly
      -- the format string that was classified, so the two cannot diverge.
      -- FAIL-CLOSED: a lookup error means NOT exempt (stay gated) — an exemption
      -- lookup that cannot prove exemption must never grant it.
      BEGIN
        v_cap_exempt := COALESCE(public.is_capability_exempt_format(v_cap_format), false);
      EXCEPTION WHEN OTHERS THEN
        v_cap_exempt := false;
        RAISE WARNING '[s9-layer1] is_capability_exempt_format failed (treated as NOT exempt): slot=% format=% sqlstate=% sqlerrm=%',
          v_slot.slot_id, v_cap_format, SQLSTATE, SQLERRM;
      END;
    END IF;

    IF v_cap_status IS DISTINCT FROM 'ready' AND NOT v_cap_exempt THEN
      v_cap_skip := 'capability_blocked:' || v_cap_status || ':' || v_cap_format;

      INSERT INTO m.slot_fill_attempt (
        attempt_id, slot_id, attempted_at, pool_size_at_attempt, pool_snapshot,
        decision, skip_reason, selected_canonical_ids, selected_evergreen_id,
        chosen_format, threshold_relaxed, pool_health_at_attempt,
        evergreen_ratio_at_attempt, error_message, created_at
      ) VALUES (
        gen_random_uuid(), v_slot.slot_id, NOW(), 0,
        jsonb_build_object(
          'gate',        's9_layer1',
          'client_slug', v_cap_slug,
          'capability',  COALESCE(v_cap_evidence, '{}'::jsonb)),
        'skipped', v_cap_skip, NULL, NULL,
        v_cap_format, false, NULL,
        NULL, v_cap_error, NOW()
      );

      UPDATE m.slot
      SET status = 'skipped', skip_reason = v_cap_skip, updated_at = NOW()
      WHERE slot_id = v_slot.slot_id;

      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'slot_id',                v_slot.slot_id,
        'client_id',              v_slot.client_id,
        'platform',               v_slot.platform,
        'format',                 v_cap_format,
        'decision',               'skipped',
        'skip_reason',            v_cap_skip,
        'capability_status',      v_cap_status,
        'capability_reason_code', v_cap_evidence->>'reason_code',
        'capability_error',       v_cap_error));

      CONTINUE;  -- no pool query, no skeleton draft, no ai_job, no token spend
    END IF;
    -- end S9 LAYER 1 CAPABILITY GATE

    -- T0 MANUAL BRANCH (source_kind='manual')
    -- Operator-brief slots synthesise from slot-carried source_material ONLY.
    -- The global canonical pool, dedup windows, pool health and the evergreen
    -- library are never consulted for operator briefs (T0 rule 7). The branch
    -- enqueues the same slot_fill_synthesis_v1 ai_job (synthesis_mode='manual')
    -- so the draft passes the identical Advisor + compliance + approval chain.
    -- Format preference is carried as preference only — the Advisor retains
    -- format authority (format_preference_explicit marks a real operator pick).
    IF v_slot.source_kind = 'manual' THEN
      v_chosen_format := COALESCE(v_slot.format_preference[1], 'image_quote');

      IF v_slot.source_material IS NULL OR length(trim(v_slot.source_material)) < 20 THEN
        INSERT INTO m.slot_fill_attempt (
          attempt_id, slot_id, attempted_at, pool_size_at_attempt, pool_snapshot,
          decision, skip_reason, selected_canonical_ids, selected_evergreen_id,
          chosen_format, threshold_relaxed, pool_health_at_attempt,
          evergreen_ratio_at_attempt, error_message, created_at
        ) VALUES (
          gen_random_uuid(), v_slot.slot_id, NOW(), 0,
          jsonb_build_object('manual', true),
          'failed', 'manual_source_material_missing', NULL, NULL,
          v_chosen_format, false, NULL, NULL, NULL, NOW()
        );

        UPDATE m.slot
        SET status = 'failed', skip_reason = 'manual_source_material_missing', updated_at = NOW()
        WHERE slot_id = v_slot.slot_id;

        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'slot_id', v_slot.slot_id, 'client_id', v_slot.client_id,
          'platform', v_slot.platform, 'decision', 'failed',
          'skip_reason', 'manual_source_material_missing', 'manual', true));

        CONTINUE;
      END IF;

      v_decision := 'filled';
      v_pool_snapshot := jsonb_build_object(
        'manual', true,
        'source', 'slot.source_material',
        'created_by', v_slot.created_by,
        'format_preference_explicit', COALESCE(array_length(v_slot.format_preference, 1), 0) > 0
      );

      INSERT INTO m.slot_fill_attempt (
        attempt_id, slot_id, attempted_at, pool_size_at_attempt, pool_snapshot,
        decision, skip_reason, selected_canonical_ids, selected_evergreen_id,
        chosen_format, threshold_relaxed, pool_health_at_attempt,
        evergreen_ratio_at_attempt, error_message, created_at
      ) VALUES (
        gen_random_uuid(), v_slot.slot_id, NOW(), 0, v_pool_snapshot,
        'filled', NULL, NULL, NULL,
        v_chosen_format, false, NULL, NULL, NULL, NOW()
      ) RETURNING attempt_id INTO v_attempt_id;

      INSERT INTO m.post_draft (
        post_draft_id, client_id, platform, slot_id, intent_id,
        approval_status, draft_title, draft_body, scheduled_for,
        version, created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_slot.client_id, v_slot.platform, v_slot.slot_id, v_slot.intent_id,
        'draft', NULL, '', v_slot.scheduled_publish_at,
        1, 'fill_function', NOW(), NOW()
      )
      ON CONFLICT (slot_id) WHERE (slot_id IS NOT NULL) DO UPDATE SET
        intent_id            = EXCLUDED.intent_id,
        approval_status      = 'draft',
        draft_title          = NULL,
        draft_body           = '',
        draft_format         = NULL,
        recommended_format   = NULL,
        recommended_reason   = NULL,
        image_headline       = NULL,
        image_url            = NULL,
        image_status         = 'pending',
        video_url            = NULL,
        video_status         = NULL,
        auto_approval_scores = NULL,
        compliance_flags     = '[]'::jsonb,
        dead_reason          = NULL,
        approved_by          = NULL,
        approved_at          = NULL,
        scheduled_for        = EXCLUDED.scheduled_for,
        notification_sent_at = NULL,
        version              = m.post_draft.version + 1,
        updated_at           = NOW()
      RETURNING post_draft_id INTO v_skeleton_draft_id;

      INSERT INTO m.ai_job (
        ai_job_id, client_id, platform, slot_id, post_draft_id,
        digest_run_id, post_seed_id,
        job_type, status, priority,
        input_payload, output_payload, created_at, updated_at, attempts
      ) VALUES (
        gen_random_uuid(), v_slot.client_id, v_slot.platform, v_slot.slot_id,
        v_skeleton_draft_id,
        NULL, NULL,
        'slot_fill_synthesis_v1', 'queued', 100,
        jsonb_build_object(
          'slot_id', v_slot.slot_id,
          'format', v_chosen_format,
          'format_preference_explicit', COALESCE(array_length(v_slot.format_preference, 1), 0) > 0,
          'synthesis_mode', 'manual',
          'source_material', v_slot.source_material,
          'created_by', v_slot.created_by,
          'canonical_ids', '[]'::jsonb,
          'evergreen_id', NULL,
          'is_evergreen', false,
          'fitness_score', NULL,
          'recency_score', NULL,
          'slot_confidence', NULL,
          'attempt_id', v_attempt_id,
          'enqueued_at', NOW()
        ),
        '{}'::jsonb, NOW(), NOW(), 0
      )
      ON CONFLICT (post_draft_id, job_type) DO UPDATE SET
        slot_id        = EXCLUDED.slot_id,
        status         = 'queued',
        priority       = 100,
        input_payload  = EXCLUDED.input_payload,
        output_payload = '{}'::jsonb,
        error          = NULL,
        dead_reason    = NULL,
        locked_at      = NULL,
        locked_by      = NULL,
        attempts       = 0,
        updated_at     = NOW()
      RETURNING ai_job_id INTO v_ai_job_id;

      UPDATE m.slot_fill_attempt SET ai_job_id = v_ai_job_id
      WHERE attempt_id = v_attempt_id;

      UPDATE m.slot
      SET status = 'fill_in_progress',
          filled_draft_id = v_skeleton_draft_id,
          format_chosen = v_chosen_format,
          slot_confidence = v_slot.slot_confidence,  -- T1: preserve high confidence set at creation (T0 single posts created NULL -> stays NULL)
          filled_at = NOW(),
          updated_at = NOW()
      WHERE slot_id = v_slot.slot_id;

      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'slot_id', v_slot.slot_id,
        'client_id', v_slot.client_id,
        'platform', v_slot.platform,
        'scheduled_publish_at', v_slot.scheduled_publish_at,
        'format', v_chosen_format,
        'decision', 'filled',
        'manual', true,
        'ai_job_id', v_ai_job_id,
        'skeleton_draft_id', v_skeleton_draft_id));

      CONTINUE;
    END IF;
    -- end T0 MANUAL BRANCH

    v_chosen_format := COALESCE(v_slot.format_preference[1], 'image_quote');

    SELECT * INTO v_synthesis FROM t.format_synthesis_policy
    WHERE ice_format_key = v_chosen_format AND is_current=true;
    SELECT * INTO v_quality FROM t.format_quality_policy
    WHERE ice_format_key = v_chosen_format AND is_current=true;

    IF v_synthesis IS NULL OR v_quality IS NULL THEN
      v_decision := 'failed';
      v_skip_reason := 'format_policy_missing:' || v_chosen_format;
    ELSE
      v_min_fitness := v_quality.min_fitness_threshold;

      WITH client_verticals AS (
        SELECT vertical_id AS vid
        FROM c.client_content_scope
        WHERE client_id = v_slot.client_id
      ),
      candidate_pool AS (
        SELECT
          sp.canonical_id,
          sp.vertical_id,
          sp.content_class,
          sp.fitness_score_max,
          sp.source_domain,
          sp.reuse_count,
          cci.canonical_title,
          cci.first_seen_at,
          cci.canonical_url,
          cfr.freshness_window_hours,
          rpc.fitness_multiplier,
          (sp.fitness_score_max * COALESCE(rpc.fitness_multiplier, 1.0)) AS effective_fitness,
          GREATEST(0.0, LEAST(1.0,
            1.0 - (EXTRACT(epoch FROM (NOW() - cci.first_seen_at)) / 3600.0)
                   / NULLIF(cfr.freshness_window_hours, 0)
          )) AS recency_score
        FROM m.signal_pool sp
        JOIN client_verticals cv ON cv.vid = sp.vertical_id
        JOIN f.canonical_content_item cci ON cci.canonical_id = sp.canonical_id
        LEFT JOIN t.class_freshness_rule cfr
          ON cfr.class_code = sp.content_class AND cfr.is_current=true
        LEFT JOIN t.reuse_penalty_curve rpc
          ON sp.reuse_count >= rpc.reuse_count_min
          AND (sp.reuse_count <= rpc.reuse_count_max OR rpc.reuse_count_max IS NULL)
          AND rpc.is_current=true
        WHERE sp.is_active = true
          AND NOT EXISTS (
            SELECT 1
            FROM m.slot s2
            WHERE s2.client_id = v_slot.client_id
              AND s2.status IN ('filled','approved','published','fill_in_progress')
              AND s2.filled_at > NOW() - (v_dedup.same_canonical_block_hours * interval '1 hour')
              AND sp.canonical_id = ANY(s2.canonical_ids)
          )
          AND NOT EXISTS (
            SELECT 1
            FROM m.post_draft pd
            JOIN m.slot s2 ON s2.filled_draft_id = pd.post_draft_id
            WHERE s2.client_id = v_slot.client_id
              AND pd.created_at > NOW() - (v_dedup.same_canonical_block_hours * interval '1 hour')
              AND pd.draft_title IS NOT NULL
              AND m.title_similarity(cci.canonical_title, pd.draft_title) >
                  LEAST(v_dedup.title_similarity_threshold, v_quality.max_dedup_similarity)
          )
          AND EXISTS (
            SELECT 1
            FROM f.canonical_content_body ccb
            WHERE ccb.canonical_id = sp.canonical_id
              AND ccb.fetch_status = 'success'
              AND ccb.extracted_text IS NOT NULL
              AND LENGTH(TRIM(ccb.extracted_text)) >= 200
              AND COALESCE(ccb.word_count, 0) >= 300
          )
      )
      SELECT
        COUNT(*) FILTER (WHERE effective_fitness >= v_min_fitness),
        COUNT(*),
        jsonb_agg(jsonb_build_object(
          'canonical_id', canonical_id,
          'effective_fitness', effective_fitness,
          'recency_score', recency_score,
          'source_domain', source_domain,
          'reuse_count', reuse_count,
          'canonical_title', canonical_title
        ) ORDER BY effective_fitness DESC, recency_score DESC)
          FILTER (WHERE effective_fitness >= v_min_fitness)
      INTO v_pool_count, v_pool_total_in_scope, v_top_pool_rows
      FROM candidate_pool;

      v_pool_snapshot := jsonb_build_object(
        'qualifying_count', v_pool_count,
        'total_in_scope',   v_pool_total_in_scope,
        'min_fitness',      v_min_fitness,
        'top_items',        COALESCE(v_top_pool_rows, '[]'::jsonb)
      );

      IF v_pool_count < v_quality.min_pool_size_for_format THEN
        SELECT m.check_pool_health(
          (SELECT vertical_id FROM c.client_content_scope
           WHERE client_id = v_slot.client_id LIMIT 1)
        ) INTO v_pool_health;

        IF (v_pool_health->>'health') = 'red' THEN
          v_min_fitness := GREATEST(0, v_min_fitness - 10);
          v_threshold_relaxed := true;

          WITH client_verticals AS (
            SELECT vertical_id AS vid
            FROM c.client_content_scope
            WHERE client_id = v_slot.client_id
          ),
          relaxed_pool AS (
            SELECT
              sp.canonical_id,
              sp.source_domain,
              cci.canonical_title,
              cci.first_seen_at,
              cfr.freshness_window_hours,
              (sp.fitness_score_max * COALESCE(rpc.fitness_multiplier, 1.0)) AS eff_fit,
              GREATEST(0.0, LEAST(1.0,
                1.0 - (EXTRACT(epoch FROM (NOW() - cci.first_seen_at)) / 3600.0)
                       / NULLIF(cfr.freshness_window_hours, 0)
              )) AS rec
            FROM m.signal_pool sp
            JOIN client_verticals cv ON cv.vid = sp.vertical_id
            JOIN f.canonical_content_item cci ON cci.canonical_id = sp.canonical_id
            LEFT JOIN t.class_freshness_rule cfr
              ON cfr.class_code = sp.content_class AND cfr.is_current=true
            LEFT JOIN t.reuse_penalty_curve rpc
              ON sp.reuse_count >= rpc.reuse_count_min
              AND (sp.reuse_count <= rpc.reuse_count_max OR rpc.reuse_count_max IS NULL)
              AND rpc.is_current=true
            WHERE sp.is_active = true
              AND NOT EXISTS (
                SELECT 1 FROM m.slot s2
                WHERE s2.client_id = v_slot.client_id
                  AND s2.status IN ('filled','approved','published','fill_in_progress')
                  AND s2.filled_at > NOW() - (v_dedup.same_canonical_block_hours * interval '1 hour')
                  AND sp.canonical_id = ANY(s2.canonical_ids)
              )
              AND EXISTS (
                SELECT 1
                FROM f.canonical_content_body ccb
                WHERE ccb.canonical_id = sp.canonical_id
                  AND ccb.fetch_status = 'success'
                  AND ccb.extracted_text IS NOT NULL
                  AND LENGTH(TRIM(ccb.extracted_text)) >= 200
                  AND COALESCE(ccb.word_count, 0) >= 300
              )
          )
          SELECT
            COUNT(*) FILTER (WHERE eff_fit >= v_min_fitness),
            jsonb_agg(jsonb_build_object(
              'canonical_id', canonical_id,
              'effective_fitness', eff_fit,
              'recency_score', rec,
              'source_domain', source_domain,
              'canonical_title', canonical_title
            ) ORDER BY eff_fit DESC, rec DESC)
              FILTER (WHERE eff_fit >= v_min_fitness)
          INTO v_pool_count, v_top_pool_rows
          FROM relaxed_pool;

          v_pool_snapshot := v_pool_snapshot
            || jsonb_build_object('relaxed_min_fitness', v_min_fitness,
                                  'relaxed_top_items', COALESCE(v_top_pool_rows,'[]'::jsonb));
        END IF;
      END IF;

      IF v_pool_count >= v_quality.min_pool_size_for_format THEN
        IF v_synthesis.synthesis_mode = 'single_item' THEN
          v_canonical_ids := ARRAY[(v_top_pool_rows->0->>'canonical_id')::uuid];
          v_best_fitness := (v_top_pool_rows->0->>'effective_fitness')::numeric;
          v_top_recency  := (v_top_pool_rows->0->>'recency_score')::numeric;
          v_source_diversity := 1;
          v_decision := 'filled';
        ELSE
          DECLARE
            v_bundle_size integer := v_synthesis.bundle_size_max;
            v_picked uuid[] := ARRAY[]::uuid[];
            v_picked_sources text[] := ARRAY[]::text[];
            v_idx integer := 0;
            v_distinct_sources integer := 0;
          BEGIN
            WHILE COALESCE(array_length(v_picked, 1), 0) < v_bundle_size
                  AND v_idx < jsonb_array_length(v_top_pool_rows) LOOP
              v_picked := v_picked || ARRAY[(v_top_pool_rows->v_idx->>'canonical_id')::uuid];
              v_picked_sources := v_picked_sources || ARRAY[v_top_pool_rows->v_idx->>'source_domain'];
              v_idx := v_idx + 1;
            END LOOP;

            SELECT COUNT(DISTINCT s) INTO v_distinct_sources
            FROM unnest(v_picked_sources) s WHERE s IS NOT NULL;

            IF COALESCE(array_length(v_picked, 1), 0) = v_bundle_size
               AND v_distinct_sources >= v_dedup.same_source_diversity_min THEN
              v_canonical_ids := v_picked;
              v_best_fitness := (v_top_pool_rows->0->>'effective_fitness')::numeric;
              v_top_recency  := (v_top_pool_rows->0->>'recency_score')::numeric;
              v_source_diversity := v_distinct_sources;
              v_decision := 'filled';
            ELSE
              v_decision := NULL;
              v_skip_reason := format('bundle_diversity_insufficient:got_%s_need_%s',
                                      v_distinct_sources, v_dedup.same_source_diversity_min);
            END IF;
          END;
        END IF;
      END IF;

      IF v_decision IS NULL OR v_decision NOT IN ('filled','failed') THEN
        SELECT m.check_evergreen_threshold(v_slot.client_id) INTO v_threshold_check;
        v_evergreen_ratio := COALESCE((v_threshold_check->>'ratio_used')::numeric, 0);

        IF (v_threshold_check->>'alert')::boolean = true THEN
          v_decision := 'skipped';
          v_skip_reason := COALESCE(v_skip_reason, 'pool_thin') || ';evergreen_threshold_exceeded';
        ELSE
          SELECT * INTO v_evergreen_row
          FROM t.evergreen_library el
          WHERE el.is_active = true
            AND v_chosen_format = ANY(el.format_keys)
            AND EXISTS (
              SELECT 1 FROM unnest(el.vertical_ids) vid
              JOIN c.client_content_scope ccs ON ccs.vertical_id = vid
              WHERE ccs.client_id = v_slot.client_id
            )
            AND (el.last_used_at IS NULL
                 OR el.last_used_at < NOW() - (el.use_cooldown_days * interval '1 day'))
          ORDER BY el.is_core DESC, el.last_used_at NULLS FIRST, el.use_count ASC
          LIMIT 1;

          IF FOUND THEN
            v_evergreen_id := v_evergreen_row.evergreen_id;
            v_is_evergreen := true;
            v_best_fitness := 70;
            v_top_recency := 0.5;
            v_source_diversity := 1;
            v_decision := 'evergreen';
          ELSE
            v_decision := 'skipped';
            v_skip_reason := COALESCE(v_skip_reason, 'pool_thin') || ';no_eligible_evergreen';
          END IF;
        END IF;
      END IF;

      IF v_decision IN ('filled','evergreen') THEN
        v_slot_confidence := m.compute_slot_confidence(
          v_best_fitness, v_pool_count, v_top_recency, v_source_diversity
        );
      ELSE
        v_slot_confidence := 0;
      END IF;
    END IF;

    INSERT INTO m.slot_fill_attempt (
      attempt_id, slot_id, attempted_at, pool_size_at_attempt, pool_snapshot,
      decision, skip_reason, selected_canonical_ids, selected_evergreen_id,
      chosen_format, threshold_relaxed, pool_health_at_attempt,
      evergreen_ratio_at_attempt, error_message, created_at
    ) VALUES (
      gen_random_uuid(), v_slot.slot_id, NOW(),
      v_pool_count, v_pool_snapshot,
      v_decision, v_skip_reason, v_canonical_ids, v_evergreen_id,
      v_chosen_format, v_threshold_relaxed, v_pool_health,
      v_evergreen_ratio, NULL, NOW()
    ) RETURNING attempt_id INTO v_attempt_id;

    IF v_decision IN ('filled','evergreen') THEN
      -- F-PUB-009 — write slot intent to post_draft.scheduled_for at fill time.
      INSERT INTO m.post_draft (
        post_draft_id, client_id, platform, slot_id,
        approval_status, draft_title, draft_body, scheduled_for,
        version, created_by, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_slot.client_id, v_slot.platform, v_slot.slot_id,
        'draft', NULL, '', v_slot.scheduled_publish_at,
        1, 'fill_function', NOW(), NOW()
      )
      ON CONFLICT (slot_id) WHERE (slot_id IS NOT NULL) DO UPDATE SET
        approval_status      = 'draft',
        draft_title          = NULL,
        draft_body           = '',
        draft_format         = NULL,
        recommended_format   = NULL,
        recommended_reason   = NULL,
        image_headline       = NULL,
        image_url            = NULL,
        image_status         = 'pending',
        video_url            = NULL,
        video_status         = NULL,
        auto_approval_scores = NULL,
        compliance_flags     = '[]'::jsonb,
        dead_reason          = NULL,
        approved_by          = NULL,
        approved_at          = NULL,
        scheduled_for        = EXCLUDED.scheduled_for,
        notification_sent_at = NULL,
        version              = m.post_draft.version + 1,
        updated_at           = NOW()
      RETURNING post_draft_id INTO v_skeleton_draft_id;

      INSERT INTO m.ai_job (
        ai_job_id, client_id, platform, slot_id, post_draft_id,
        digest_run_id, post_seed_id,
        job_type, status, priority,
        input_payload, output_payload, created_at, updated_at, attempts
      ) VALUES (
        gen_random_uuid(), v_slot.client_id, v_slot.platform, v_slot.slot_id,
        v_skeleton_draft_id,
        NULL, NULL,
        'slot_fill_synthesis_v1', 'queued', 100,
        jsonb_build_object(
          'slot_id', v_slot.slot_id,
          'format', v_chosen_format,
          'synthesis_mode', CASE WHEN v_is_evergreen THEN 'evergreen'
                                 ELSE v_synthesis.synthesis_mode END,
          'canonical_ids', COALESCE(to_jsonb(v_canonical_ids), '[]'::jsonb),
          'evergreen_id', v_evergreen_id,
          'is_evergreen', v_is_evergreen,
          'fitness_score', v_best_fitness,
          'recency_score', v_top_recency,
          'slot_confidence', v_slot_confidence,
          'attempt_id', v_attempt_id,
          'enqueued_at', NOW()
        ),
        '{}'::jsonb, NOW(), NOW(), 0
      )
      ON CONFLICT (post_draft_id, job_type) DO UPDATE SET
        slot_id        = EXCLUDED.slot_id,
        status         = 'queued',
        priority       = 100,
        input_payload  = EXCLUDED.input_payload,
        output_payload = '{}'::jsonb,
        error          = NULL,
        dead_reason    = NULL,
        locked_at      = NULL,
        locked_by      = NULL,
        attempts       = 0,
        updated_at     = NOW()
      RETURNING ai_job_id INTO v_ai_job_id;

      UPDATE m.slot_fill_attempt SET ai_job_id = v_ai_job_id
      WHERE attempt_id = v_attempt_id;

      UPDATE m.slot
      SET status = 'fill_in_progress',
          filled_draft_id = v_skeleton_draft_id,
          canonical_ids = v_canonical_ids,
          evergreen_id = v_evergreen_id,
          is_evergreen = v_is_evergreen,
          format_chosen = v_chosen_format,
          slot_confidence = v_slot_confidence,
          filled_at = NOW(),
          updated_at = NOW()
      WHERE slot_id = v_slot.slot_id;

      IF v_canonical_ids IS NOT NULL AND array_length(v_canonical_ids, 1) > 0 THEN
        UPDATE m.signal_pool
        SET reuse_count = reuse_count + 1,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE canonical_id = ANY(v_canonical_ids)
          AND vertical_id IN (
            SELECT vertical_id FROM c.client_content_scope
            WHERE client_id = v_slot.client_id
          );
      END IF;

      IF v_evergreen_id IS NOT NULL THEN
        UPDATE t.evergreen_library
        SET use_count = use_count + 1,
            last_used_at = NOW(),
            last_used_for_client = v_slot.client_id,
            updated_at = NOW()
        WHERE evergreen_id = v_evergreen_id;
      END IF;

    ELSE
      UPDATE m.slot
      SET status = COALESCE(v_decision, 'skipped'),
          skip_reason = v_skip_reason,
          updated_at = NOW()
      WHERE slot_id = v_slot.slot_id;
    END IF;

    v_per_slot_result := jsonb_build_object(
      'slot_id', v_slot.slot_id,
      'client_id', v_slot.client_id,
      'platform', v_slot.platform,
      'scheduled_publish_at', v_slot.scheduled_publish_at,
      'format', v_chosen_format,
      'decision', v_decision,
      'skip_reason', v_skip_reason,
      'canonical_ids', COALESCE(to_jsonb(v_canonical_ids), 'null'::jsonb),
      'evergreen_id', v_evergreen_id,
      'is_evergreen', v_is_evergreen,
      'pool_size', v_pool_count,
      'threshold_relaxed', v_threshold_relaxed,
      'slot_confidence', v_slot_confidence,
      'ai_job_id', v_ai_job_id,
      'skeleton_draft_id', v_skeleton_draft_id
    );
    v_results := v_results || jsonb_build_array(v_per_slot_result);

  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed_count,
    'results', v_results,
    'ran_at', NOW()
  );
END;
$function$;

COMMIT;
