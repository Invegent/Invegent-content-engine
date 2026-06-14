-- Migration: stage3_5b_retry_episode_platform_aware
-- Stage 3.5b — platform-aware retry_episode.
--
-- PROBLEM: retry_episode re-created a rejected child slot by passing
--   v_intent.format_preference (the episode's ORIGINAL format) back into
--   m.create_manual_slot_internal. When the child was rejected because that
--   format is invalid for the platform (e.g. image_quote -> YouTube), retry
--   reproduced the identical (platform, format) pair and got the identical
--   format_not_supported_on_platform rejection — a no-op for exactly the
--   failures it should fix.
--
-- FIX (minimal, retry-scoped): before re-creating a slot, re-resolve a valid
--   format for THAT platform via public.get_studio_capabilities(client_id) —
--   the SAME resolver Stage 3.5a uses, which reads the SAME platform_support +
--   state predicate that create_manual_slot_internal's gate enforces:
--     - if v_intent.format_preference is still valid for the platform -> keep it
--       (no behaviour change for combos that were valid all along);
--     - else if the platform has any valid format -> pick a deterministic valid
--       alternative (first, sorted);
--     - else -> FAIL LOUD for that platform (no_valid_format_for_platform), with
--       NO doomed slot created.
--
-- UNCHANGED (byte-for-byte): mode guard; episode/intent load; brief reuse;
--   published-child protection; in-flight-child protection; dead/failed-slot
--   audit retention; intent-status recompute; fanout_result retry-summary append;
--   the m.create_manual_slot_internal gate (still the hard backstop if resolver
--   and gate ever diverged). No schema change, no signature change.
--
-- get_studio_capabilities is STABLE SECURITY DEFINER (read-only); called ONCE per
--   retry invocation and reused across the platform loop.
--
-- Rollback: re-apply the prior definition (md5 d85366fda2b12cd1e0f9d3b56f6f0bb8).
--
-- APPLY STATE (2026-06-14): APPLIED / VERIFIED in production.
--   The originating commit (5fc0fa40f45cbb07088c10061fdad0189ae9caaf) described
--   this migration as STAGED / NOT APPLIED (gated on D-01 + PK); that is now
--   SUPERSEDED — apply_migration has run and the change is live & verified.
--   Apply facts:
--     - migration:      stage3_5b_retry_episode_platform_aware
--     - D-01:           6917cc0e-a944-40b2-ab98-77ec27f448ad (proceed / agree / medium / high)
--     - prior md5:      d85366fda2b12cd1e0f9d3b56f6f0bb8
--     - production md5: 3d21cd0f...   (live retry_episode after apply; signature unchanged)
--   Verified in production: invalid YouTube image_quote retry repaired ->
--   video_short_avatar; valid Facebook image_quote kept unchanged;
--   no_valid_format_for_platform branch confirmed; published children protected
--   (already_published); in-flight children protected (in_flight_preserved);
--   dead/failed history preserved; no production series mutated.
--   Stage 3.5b APPLIED & VERIFIED; Stage 3.5 overall CLOSED in the registers
--   (docs/00_action_list.md + docs/00_sync_state.md v3.46).
--   NOTE: comments-only cleanup — the executable SQL below is UNCHANGED and was
--   NOT re-applied by this edit.

CREATE OR REPLACE FUNCTION public.retry_episode(p_episode_id uuid, p_mode text DEFAULT 'refan_out'::text, p_created_by text DEFAULT 'series-v2-retry'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'm', 'c', 't', 'public'
AS $function$
DECLARE
  v_ep            c.content_series_episode%ROWTYPE;
  v_intent        m.creative_intent%ROWTYPE;
  v_child_brief   text;
  v_created_by    text := COALESCE(NULLIF(trim(p_created_by), ''), 'series-v2-retry');
  v_platform      text;
  v_rec           record;
  v_slot_res      jsonb;
  v_base_ts       timestamptz;
  v_idx           integer := 0;
  v_retried       jsonb := '[]'::jsonb;
  v_skipped       jsonb := '[]'::jsonb;
  v_recreated     integer := 0;
  v_status        text;
  -- Stage 3.5b: capability resolver (loaded once) + per-platform resolution.
  v_caps          jsonb;
  v_valid_formats text[];
  v_resolved_fmt  text;
BEGIN
  IF p_mode IS NULL OR p_mode NOT IN ('refan_out', 'retry_failed_children', 'regenerate_outline_item') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_mode',
      'detail', 'mode must be one of refan_out | retry_failed_children | regenerate_outline_item');
  END IF;

  SELECT * INTO v_ep FROM c.content_series_episode WHERE episode_id = p_episode_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'episode_not_found');
  END IF;

  -- regenerate_outline_item re-runs the outline EF for one episode; that is a
  -- series-writer EF concern (Stage 3) and is intentionally NOT implemented in
  -- the Stage 2 RPC layer.
  IF p_mode = 'regenerate_outline_item' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'mode_not_available_in_stage2',
      'detail', 'outline regeneration runs via the series-writer EF (Stage 3); the Stage 2 RPC layer covers refan_out and retry_failed_children only');
  END IF;

  IF v_ep.intent_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'episode_not_fanned_out',
      'detail', 'call fan_out_episode first');
  END IF;

  SELECT * INTO v_intent FROM m.creative_intent WHERE intent_id = v_ep.intent_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'intent_not_found', 'intent_id', v_ep.intent_id);
  END IF;

  -- Re-use the brief the intent already carries.
  v_child_brief := COALESCE(v_intent.source_material->>'brief', '');
  IF length(v_child_brief) < 20 THEN
    v_child_brief := 'Series episode retry: ' || COALESCE(v_ep.episode_title, 'episode') ||
                     ' (' || COALESCE(v_ep.episode_angle, '') || ')';
  END IF;

  -- Stage 3.5b: load the capability resolver ONCE for the whole retry (read-only,
  -- STABLE SECURITY DEFINER); reused per platform inside the loop below.
  v_caps := public.get_studio_capabilities(v_intent.client_id);

  v_base_ts := now() + interval '1 hour';

  -- For each target platform, classify the current child population, then decide.
  --   has_published : a child is published (slot/draft/publish) -> NEVER touch (no dup)
  --   has_in_flight : a child still progressing                 -> preserve (skip)
  --   only dead/failed/skipped (or, for refan_out, none)        -> re-create
  FOR v_rec IN
    SELECT p.platform,
           COALESCE(bool_or(h.is_pub), false)      AS has_published,
           COALESCE(bool_or(h.is_inflight), false) AS has_in_flight,
           COALESCE(bool_or(h.is_dead), false)     AS has_dead,
           count(h.slot_id)                         AS n_children
    FROM unnest(v_intent.target_platforms) AS p(platform)
    LEFT JOIN LATERAL (
      -- NULL-safe classification: a missing draft/publish row must read as
      -- "not published"/"not dead", never SQL NULL (which would drop the row
      -- out of bool_or via three-valued logic).
      SELECT s.slot_id,
             (COALESCE(s.status = 'published', false)
                OR COALESCE(d.approval_status = 'published', false)
                OR COALESCE(pub.status = 'published', false))                  AS is_pub,
             (NOT (COALESCE(s.status = 'published', false)
                     OR COALESCE(d.approval_status = 'published', false)
                     OR COALESCE(pub.status = 'published', false))
                AND (COALESCE(s.status IN ('skipped','failed'), false)
                     OR COALESCE(d.approval_status IN ('rejected','dead','voided'), false))) AS is_dead,
             (NOT (COALESCE(s.status = 'published', false)
                     OR COALESCE(d.approval_status = 'published', false)
                     OR COALESCE(pub.status = 'published', false))
                AND NOT (COALESCE(s.status IN ('skipped','failed'), false)
                     OR COALESCE(d.approval_status IN ('rejected','dead','voided'), false))) AS is_inflight
      FROM m.slot s
      LEFT JOIN m.post_draft d ON d.slot_id = s.slot_id
      LEFT JOIN LATERAL (
        SELECT status FROM m.post_publish pp
        WHERE pp.post_draft_id = d.post_draft_id ORDER BY pp.created_at DESC LIMIT 1
      ) pub ON true
      WHERE s.intent_id = v_ep.intent_id AND s.platform = p.platform
    ) h ON true
    GROUP BY p.platform
  LOOP
    v_platform := v_rec.platform;

    IF v_rec.has_published THEN
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'reason', 'already_published'));
      CONTINUE;
    END IF;

    IF v_rec.has_in_flight THEN
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'reason', 'in_flight_preserved'));
      CONTINUE;
    END IF;

    -- retry_failed_children only acts where a dead child exists; refan_out also
    -- covers platforms that never produced a child (n_children = 0).
    IF p_mode = 'retry_failed_children' AND NOT v_rec.has_dead THEN
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'reason', 'no_failed_child'));
      CONTINUE;
    END IF;

    IF v_rec.n_children = 0 AND p_mode = 'retry_failed_children' THEN
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'reason', 'no_child_to_retry'));
      CONTINUE;
    END IF;

    -- Stage 3.5b: re-resolve a valid format for THIS platform before re-creating,
    -- so retry never replays a known-invalid (platform, format) pair. Same predicate
    -- as create_manual_slot_internal's gate and get_studio_capabilities:
    -- eligible platform AND format supported=true AND state in (enabled, enabled_unproven).
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
      v_retried := v_retried || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'status', 'rejected',
        'reason', 'no_valid_format_for_platform'));
      CONTINUE;
    END IF;

    IF v_intent.format_preference IS NOT NULL
       AND v_intent.format_preference = ANY(v_valid_formats) THEN
      v_resolved_fmt := v_intent.format_preference;   -- still valid: keep, no behaviour change
    ELSE
      v_resolved_fmt := v_valid_formats[1];           -- deterministic valid alternative (first, sorted)
    END IF;

    -- Re-create a fresh governed child slot under the SAME intent (old dead slot
    -- is left in place for audit; the new slot is filled by the normal path). The
    -- resolved format is guaranteed valid for the platform, so create_manual_slot_internal
    -- will not reject on format_not_supported_on_platform.
    v_slot_res := m.create_manual_slot_internal(
      v_intent.client_id, v_platform, v_child_brief,
      v_resolved_fmt, v_base_ts + (v_idx * interval '1 minute'),
      v_created_by, v_ep.intent_id, 1.0);
    v_idx := v_idx + 1;

    IF (v_slot_res->>'ok')::boolean THEN
      v_recreated := v_recreated + 1;
      v_retried := v_retried || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'status', 'recreated',
        'slot_id', v_slot_res->>'slot_id',
        'format', v_resolved_fmt,
        'format_changed', (v_resolved_fmt IS DISTINCT FROM v_intent.format_preference),
        'scheduled_publish_at', v_slot_res->>'scheduled_publish_at'));
    ELSE
      -- Backstop: if the gate still rejects a resolver-valid format (resolver/gate
      -- divergence), record it rather than create a bad slot.
      v_retried := v_retried || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'status', 'rejected',
        'reason', v_slot_res->>'error', 'format', v_slot_res->>'format'));
    END IF;
  END LOOP;

  -- Recompute intent status from its live (non-dead) children.
  SELECT CASE
           WHEN count(*) = 0 THEN 'failed'
           WHEN count(*) FILTER (WHERE s.status NOT IN ('skipped','failed')) = 0 THEN 'failed'
           WHEN count(*) FILTER (WHERE s.status IN ('skipped','failed')) = 0 THEN 'active'
           ELSE 'partial'
         END
    INTO v_status
  FROM m.slot s WHERE s.intent_id = v_ep.intent_id;

  UPDATE m.creative_intent
  SET status = COALESCE(v_status, status),
      fanout_result = COALESCE(fanout_result, '[]'::jsonb) || jsonb_build_object(
        'retry', jsonb_build_object('mode', p_mode, 'recreated', v_recreated,
                                    'retried', v_retried, 'skipped', v_skipped)),
      updated_at = now()
  WHERE intent_id = v_ep.intent_id;

  RETURN jsonb_build_object(
    'ok', true, 'episode_id', p_episode_id, 'intent_id', v_ep.intent_id,
    'mode', p_mode, 'recreated', v_recreated,
    'retried', v_retried, 'skipped', v_skipped, 'intent_status', v_status);
END;
$function$;
