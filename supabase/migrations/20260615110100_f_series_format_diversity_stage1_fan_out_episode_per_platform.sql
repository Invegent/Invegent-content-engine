-- ============================================================================
-- F-SERIES-FORMAT-DIVERSITY — Stage 1: fan_out_episode per-platform format
-- ============================================================================
-- Redefines public.fan_out_episode(uuid, text, timestamptz) so it resolves the
-- final content format PER PLATFORM, instead of passing the single episode
-- recommended_format to every platform (which dropped FB/LI whenever the common
-- format was publisher-impossible there, and forced "avatar collapse" once
-- platform_support was corrected in Stage 0).
--
-- The per-platform resolver is lifted VERBATIM from the proven retry_episode
-- Stage 3.5b block (same predicate as the create_manual_slot_internal gate and
-- get_studio_capabilities):
--   * load get_studio_capabilities(client_id) ONCE (read-only STABLE);
--   * for each target platform, compute its valid formats
--       (eligible platform AND format supported=true AND state in
--        (enabled, enabled_unproven));
--   * keep the episode recommended_format if still valid on that platform;
--   * else pick the deterministic first valid format (sorted ascending);
--   * if none, record 'no_valid_format_for_platform' and create no doomed slot;
--   * call m.create_manual_slot_internal with the resolved platform format.
--
-- PRESERVED byte-for-byte vs the prior body (md5 7934ce55c1a4a6fc61a7da659378be58):
--   episode/series/client guards, series-approved guard, child brief + persona
--   carry, source_material, the creative_intent insert (format_preference still
--   stores the episode recommended_format), per-platform 1-minute schedule
--   stagger, the m.create_manual_slot_internal gate, intent status roll-up,
--   episode link/status update, and the top-level return shape. Each accepted
--   target object additionally carries 'format' + 'format_changed' (additive
--   audit only).
--
-- DOES NOT CHANGE: series-outline, retry_episode, create_manual_slot_internal,
--   get_studio_capabilities, schema, publishers.
--
-- ORDER DEPENDENCY: Stage 2 (series-outline v1.5.0) is live; apply this
--   immediately after Stage 0 (platform_support correction) so the resolver reads
--   publisher-real capabilities at fan-out.
--
-- Rollback: CREATE OR REPLACE back to the prior body (md5 7934ce55…); the exact
--   prior definition is inlined in the ROLLBACK block comment at the footer (also
--   preserved in migration 20260613120000_series_v2_stage2_fanout_retry_detail.sql
--   and recoverable via pg_get_functiondef).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fan_out_episode(p_episode_id uuid, p_created_by text DEFAULT 'series-v2'::text, p_scheduled_for timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'm', 'c', 't', 'public'
AS $function$
DECLARE
  v_ep            c.content_series_episode%ROWTYPE;
  v_cs            c.content_series%ROWTYPE;
  v_intent_id     uuid;
  v_child_brief   text;
  v_source        jsonb;
  v_platforms     text[];
  v_platform      text;
  v_base_ts       timestamptz;
  v_assigned_ts   timestamptz;
  v_idx           integer := 0;
  v_slot_res      jsonb;
  v_results       jsonb := '[]'::jsonb;
  v_accepted      integer := 0;
  v_rejected      integer := 0;
  v_status        text;
  v_created_by    text := COALESCE(NULLIF(trim(p_created_by), ''), 'series-v2');
  -- Stage 1 (F-SERIES-FORMAT-DIVERSITY): per-platform format resolution,
  -- lifted verbatim from the proven retry_episode Stage 3.5b resolver.
  v_caps          jsonb;
  v_pref          text;
  v_valid_formats text[];
  v_resolved_fmt  text;
BEGIN
  SELECT * INTO v_ep FROM c.content_series_episode WHERE episode_id = p_episode_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'episode_not_found');
  END IF;

  IF v_ep.intent_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'episode_already_has_intent',
      'intent_id', v_ep.intent_id,
      'detail', 'this episode has already been fanned out; use retry_episode to re-fan failed/missing children');
  END IF;

  SELECT * INTO v_cs FROM c.content_series WHERE series_id = v_ep.series_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'series_not_found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM c.client WHERE client_id = v_cs.client_id AND status = 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'client_not_active');
  END IF;

  -- Outline must be approved before fan-out (governed flow); this guards manual
  -- mis-use only — it does NOT touch normal series generation.
  IF v_cs.status NOT IN ('approved', 'writing', 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'series_not_approved',
      'status', v_cs.status,
      'detail', 'series outline must be approved before episode fan-out');
  END IF;

  -- Compose the child brief (carries persona where present) — >= 20 chars enforced downstream.
  v_child_brief :=
       'Series "' || COALESCE(v_cs.title, 'series') || '" — episode ' || COALESCE(v_ep.position::text, '?')
    || ': ' || COALESCE(v_ep.episode_title, '(untitled episode)')
    || COALESCE(E'\nAngle: '              || NULLIF(trim(v_ep.episode_angle), ''), '')
    || COALESCE(E'\nHook: '               || NULLIF(trim(v_ep.episode_hook), ''),  '')
    || COALESCE(E'\nPersona: '            || NULLIF(trim(v_ep.persona_label), ''), '')
    || COALESCE(E'\nAvatar preference: '  || NULLIF(trim(v_ep.avatar_preference), ''), '')
    || COALESCE(E'\nPersona notes: '      || NULLIF(trim(v_ep.persona_notes), ''), '');

  IF length(v_child_brief) < 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'episode_brief_too_short',
      'detail', 'episode title/angle/hook do not carry enough intent to fan out');
  END IF;

  -- Selected platforms: series.platforms[] if present, else the single series.platform.
  v_platforms := COALESCE(NULLIF(v_cs.platforms, '{}'::text[]), ARRAY[v_cs.platform]);
  IF v_platforms IS NULL OR array_length(v_platforms, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_target_platforms');
  END IF;

  v_source := jsonb_build_object(
    'brief',      v_child_brief,
    'series_id',  v_ep.series_id,
    'episode_id', v_ep.episode_id,
    'position',   v_ep.position,
    'persona', jsonb_build_object(
      'persona_label',     v_ep.persona_label,
      'avatar_preference', v_ep.avatar_preference,
      'persona_notes',     v_ep.persona_notes)
  );

  -- Create the episode intent (status starts 'fanning_out'; finalised below).
  INSERT INTO m.creative_intent (
    client_id, intent_kind, source_material, format_preference,
    target_platforms, status, created_by
  ) VALUES (
    v_cs.client_id, 'episode', v_source,
    NULLIF(trim(COALESCE(v_ep.recommended_format, '')), ''),
    v_platforms, 'fanning_out', v_created_by
  )
  RETURNING intent_id INTO v_intent_id;

  -- Fan out: one governed child slot per platform, distinct timestamps.
  v_base_ts := COALESCE(p_scheduled_for, v_ep.scheduled_for, now() + interval '1 hour');
  IF v_base_ts < now() THEN v_base_ts := now() + interval '1 hour'; END IF;

  -- Stage 1: load the capability resolver ONCE (read-only STABLE SECURITY DEFINER)
  -- and the episode's PREFERRED format; the final format is resolved PER PLATFORM
  -- inside the loop below, mirroring retry_episode Stage 3.5b. Replaces the prior
  -- behaviour of passing the single recommended_format to every platform.
  v_caps := public.get_studio_capabilities(v_cs.client_id);
  v_pref := NULLIF(trim(COALESCE(v_ep.recommended_format, '')), '');

  FOREACH v_platform IN ARRAY v_platforms
  LOOP
    v_assigned_ts := v_base_ts + (v_idx * interval '1 minute');
    v_idx := v_idx + 1;

    -- Stage 1: resolve a valid format for THIS platform. Same predicate as the
    -- create_manual_slot_internal gate and get_studio_capabilities: eligible
    -- platform AND format supported=true AND state in (enabled, enabled_unproven).
    SELECT array_agg(fmt ORDER BY fmt) INTO v_valid_formats
    FROM (
      SELECT f->>'format' AS fmt
      FROM jsonb_array_elements(v_caps->'platforms') pp
      CROSS JOIN jsonb_array_elements(pp->'formats') f
      WHERE pp->>'platform' = v_platform
        AND COALESCE((pp->>'eligible')::boolean, false) = true
        AND COALESCE((f->>'supported')::boolean, false) = true
        AND f->>'state' IN ('enabled','enabled_unproven')
    ) q;

    IF v_valid_formats IS NULL OR array_length(v_valid_formats, 1) IS NULL THEN
      -- No buildable+supported format for this platform: do NOT create a doomed slot.
      v_rejected := v_rejected + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'status', 'rejected',
        'reason', 'no_valid_format_for_platform'));
      CONTINUE;
    END IF;

    IF v_pref IS NOT NULL AND v_pref = ANY(v_valid_formats) THEN
      v_resolved_fmt := v_pref;             -- preferred still valid here: keep (no behaviour change)
    ELSE
      v_resolved_fmt := v_valid_formats[1]; -- deterministic valid alternative (first, sorted)
    END IF;

    v_slot_res := m.create_manual_slot_internal(
      v_cs.client_id, v_platform, v_child_brief,
      v_resolved_fmt,
      v_assigned_ts, v_created_by, v_intent_id, 1.0);

    IF (v_slot_res->>'ok')::boolean THEN
      v_accepted := v_accepted + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'status', 'accepted',
        'slot_id', v_slot_res->>'slot_id',
        'scheduled_publish_at', v_slot_res->>'scheduled_publish_at',
        'format_preference', v_slot_res->>'format_preference',
        'format', v_resolved_fmt,
        'format_changed', (v_resolved_fmt IS DISTINCT FROM v_pref)));
    ELSE
      v_rejected := v_rejected + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'status', 'rejected',
        'reason', v_slot_res->>'error', 'format', v_slot_res->>'format'));
    END IF;
  END LOOP;

  v_status := CASE
                WHEN v_accepted = 0 THEN 'failed'
                WHEN v_rejected = 0 THEN 'active'
                ELSE 'partial'
              END;

  UPDATE m.creative_intent
  SET status = v_status, fanout_result = v_results, updated_at = now()
  WHERE intent_id = v_intent_id;

  -- Link the episode to its intent + mark it fanned out.
  UPDATE c.content_series_episode
  SET intent_id = v_intent_id, status = 'intent_created', updated_at = now()
  WHERE episode_id = p_episode_id;

  RETURN jsonb_build_object(
    'ok', true, 'episode_id', p_episode_id, 'intent_id', v_intent_id,
    'status', v_status, 'accepted', v_accepted, 'rejected', v_rejected,
    'targets', v_results);
END;
$function$;

/* ============================================================================
   ROLLBACK (manual; forward-only convention) — restore the PRIOR body
   (md5 7934ce55c1a4a6fc61a7da659378be58). Run this exact CREATE OR REPLACE:

CREATE OR REPLACE FUNCTION public.fan_out_episode(p_episode_id uuid, p_created_by text DEFAULT 'series-v2'::text, p_scheduled_for timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'm', 'c', 't', 'public'
AS $function$
DECLARE
  v_ep            c.content_series_episode%ROWTYPE;
  v_cs            c.content_series%ROWTYPE;
  v_intent_id     uuid;
  v_child_brief   text;
  v_source        jsonb;
  v_platforms     text[];
  v_platform      text;
  v_base_ts       timestamptz;
  v_assigned_ts   timestamptz;
  v_idx           integer := 0;
  v_slot_res      jsonb;
  v_results       jsonb := '[]'::jsonb;
  v_accepted      integer := 0;
  v_rejected      integer := 0;
  v_status        text;
  v_created_by    text := COALESCE(NULLIF(trim(p_created_by), ''), 'series-v2');
BEGIN
  SELECT * INTO v_ep FROM c.content_series_episode WHERE episode_id = p_episode_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'episode_not_found');
  END IF;
  IF v_ep.intent_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'episode_already_has_intent',
      'intent_id', v_ep.intent_id,
      'detail', 'this episode has already been fanned out; use retry_episode to re-fan failed/missing children');
  END IF;
  SELECT * INTO v_cs FROM c.content_series WHERE series_id = v_ep.series_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'series_not_found');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM c.client WHERE client_id = v_cs.client_id AND status = 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'client_not_active');
  END IF;
  IF v_cs.status NOT IN ('approved', 'writing', 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'series_not_approved',
      'status', v_cs.status,
      'detail', 'series outline must be approved before episode fan-out');
  END IF;
  v_child_brief :=
       'Series "' || COALESCE(v_cs.title, 'series') || '" — episode ' || COALESCE(v_ep.position::text, '?')
    || ': ' || COALESCE(v_ep.episode_title, '(untitled episode)')
    || COALESCE(E'\nAngle: '              || NULLIF(trim(v_ep.episode_angle), ''), '')
    || COALESCE(E'\nHook: '               || NULLIF(trim(v_ep.episode_hook), ''),  '')
    || COALESCE(E'\nPersona: '            || NULLIF(trim(v_ep.persona_label), ''), '')
    || COALESCE(E'\nAvatar preference: '  || NULLIF(trim(v_ep.avatar_preference), ''), '')
    || COALESCE(E'\nPersona notes: '      || NULLIF(trim(v_ep.persona_notes), ''), '');
  IF length(v_child_brief) < 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'episode_brief_too_short',
      'detail', 'episode title/angle/hook do not carry enough intent to fan out');
  END IF;
  v_platforms := COALESCE(NULLIF(v_cs.platforms, '{}'::text[]), ARRAY[v_cs.platform]);
  IF v_platforms IS NULL OR array_length(v_platforms, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_target_platforms');
  END IF;
  v_source := jsonb_build_object(
    'brief',      v_child_brief,
    'series_id',  v_ep.series_id,
    'episode_id', v_ep.episode_id,
    'position',   v_ep.position,
    'persona', jsonb_build_object(
      'persona_label',     v_ep.persona_label,
      'avatar_preference', v_ep.avatar_preference,
      'persona_notes',     v_ep.persona_notes)
  );
  INSERT INTO m.creative_intent (
    client_id, intent_kind, source_material, format_preference,
    target_platforms, status, created_by
  ) VALUES (
    v_cs.client_id, 'episode', v_source,
    NULLIF(trim(COALESCE(v_ep.recommended_format, '')), ''),
    v_platforms, 'fanning_out', v_created_by
  )
  RETURNING intent_id INTO v_intent_id;
  v_base_ts := COALESCE(p_scheduled_for, v_ep.scheduled_for, now() + interval '1 hour');
  IF v_base_ts < now() THEN v_base_ts := now() + interval '1 hour'; END IF;
  FOREACH v_platform IN ARRAY v_platforms
  LOOP
    v_assigned_ts := v_base_ts + (v_idx * interval '1 minute');
    v_idx := v_idx + 1;
    v_slot_res := m.create_manual_slot_internal(
      v_cs.client_id, v_platform, v_child_brief,
      NULLIF(trim(COALESCE(v_ep.recommended_format, '')), ''),
      v_assigned_ts, v_created_by, v_intent_id, 1.0);
    IF (v_slot_res->>'ok')::boolean THEN
      v_accepted := v_accepted + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'status', 'accepted',
        'slot_id', v_slot_res->>'slot_id',
        'scheduled_publish_at', v_slot_res->>'scheduled_publish_at',
        'format_preference', v_slot_res->>'format_preference'));
    ELSE
      v_rejected := v_rejected + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'status', 'rejected',
        'reason', v_slot_res->>'error', 'format', v_slot_res->>'format'));
    END IF;
  END LOOP;
  v_status := CASE
                WHEN v_accepted = 0 THEN 'failed'
                WHEN v_rejected = 0 THEN 'active'
                ELSE 'partial'
              END;
  UPDATE m.creative_intent
  SET status = v_status, fanout_result = v_results, updated_at = now()
  WHERE intent_id = v_intent_id;
  UPDATE c.content_series_episode
  SET intent_id = v_intent_id, status = 'intent_created', updated_at = now()
  WHERE episode_id = p_episode_id;
  RETURN jsonb_build_object(
    'ok', true, 'episode_id', p_episode_id, 'intent_id', v_intent_id,
    'status', v_status, 'accepted', v_accepted, 'rejected', v_rejected,
    'targets', v_results);
END;
$function$;

   ============================================================================ */
