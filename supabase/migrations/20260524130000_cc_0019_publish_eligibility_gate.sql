-- cc-0019 — publish-eligibility gate before AI draft generation (Unit A)
-- Brief: docs/briefs/cc-0019-publish-eligibility-gate.md (D-01 plan_review ff05c65e: agree)
--
-- STAGE ONLY. Apply is gated on D-01 sql_destructive + the explicit PK phrase
-- "PK APPROVES CC-0019 UNIT A SQL MIGRATION". Not applied by committing this file.
--
-- This migration:
--   1. Creates m.is_publish_eligible(client_id, platform) — the single canonical
--      predicate for "is this (client, platform) a live publish target right now".
--   2. CREATE OR REPLACEs m.fill_pending_slots with its EXACT current body
--      (reproduced verbatim from pg_get_functiondef) plus ONE added gate block at
--      the top of the FOR v_slot loop, so publish-ineligible slots are skipped
--      BEFORE the candidate-pool query, the skeleton post_draft, and the ai_job
--      insert — i.e. before any AI token is spent.
--
-- Binding to live schema (verified read-only 2026-05-24, matches brief):
--   c.client_publish_profile.publish_enabled boolean; .status text ('active');
--   .paused_until timestamptz; c.client.status text NOT NULL ('active').
--
-- Rollback: CREATE OR REPLACE m.fill_pending_slots back to the prior body
-- (captured in this migration's git parent / pg_get_functiondef) and optionally
-- DROP FUNCTION m.is_publish_eligible(uuid, text). No data to revert.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Canonical predicate
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION m.is_publish_eligible(p_client_id uuid, p_platform text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'c', 'public'
AS $function$
  -- EXISTS guarantees a non-NULL boolean: returns FALSE (never NULL) when no
  -- profile exists, the pair is disabled, the pair is paused, or the client is
  -- not active — i.e. whenever the live schema cannot prove publish eligibility.
  SELECT EXISTS (
    SELECT 1
    FROM c.client_publish_profile cpp
    JOIN c.client cl ON cl.client_id = cpp.client_id
    WHERE cpp.client_id      = p_client_id
      AND cpp.platform       = p_platform
      AND cpp.publish_enabled = true
      AND cpp.status         = 'active'
      AND (cpp.paused_until IS NULL OR cpp.paused_until <= now())
      AND cl.status          = 'active'
  );
$function$;

-- Mirror the grant set of the EF-called f.ai_worker_lock_jobs_v1 so the ai-worker
-- (service_role) can call this via PostgREST and m.fill_pending_slots can call it
-- internally. SECURITY DEFINER handles c.* access regardless of invoker.
GRANT EXECUTE ON FUNCTION m.is_publish_eligible(uuid, text) TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. m.fill_pending_slots — exact current body + the one gate block.
--    The ONLY change vs the live definition is the marked cc-0019 gate.
-- ─────────────────────────────────────────────────────────────────────────────
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

    -- ┌─ cc-0019 GATE (the ONLY addition to this function) ───────────────────┐
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
    -- └─ end cc-0019 GATE ────────────────────────────────────────────────────┘

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
