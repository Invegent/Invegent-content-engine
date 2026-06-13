-- ============================================================================
-- Content Series v2 — Stage 2: episode fan-out + retry RPCs, extended detail,
--                              approve_series_outline messaging fix
-- ============================================================================
-- Brief: docs/briefs/content-series-v2-t1-integration.md §4/§8/§9/§10 (Stage 2).
-- Adds the RPC/API foundation for Series v2 episode fan-out and retry WITHOUT
-- re-pointing the live series writer. Stage 1 (episode.intent_id + persona cols)
-- is already deployed.
--
-- DESIGN / GUARDRAILS:
--   * fan_out_episode reuses the EXISTING governed primitive
--     m.create_manual_slot_internal (the same internal create_creative_intent
--     uses) — it does NOT modify create_creative_intent (that RPC stays
--     byte-identical, so the live Single Post / T1 path is provably untouched).
--   * No direct m.post_draft insert; no direct queue insert; series_post_insert
--     is NOT called or referenced. Children flow through the normal
--     slot -> fill_pending_slots -> ai-worker -> Advisor -> compliance path.
--   * canonical_ids stays empty (create_manual_slot_internal sets ARRAY[]::uuid[])
--     so selected_canonical_ids_count remains 0 for episode fan-out (== manual).
--   * NOT included (out of scope, Stage 3+): series-writer EF re-point, automatic
--     use by the live writer, UI, T2, and any ai-worker/Advisor/compliance/
--     render/publisher/scheduling change. get_series_episodes is intentionally
--     LEFT UNTOUCHED (the live writer depends on its status='outline' filter).
--
-- ADDITIVE SCHEMA CHANGES (CHECK widenings only — existing values stay valid):
--   * m.creative_intent.intent_kind: + 'episode'
--   * c.content_series_episode.status: + 'intent_created'
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Additive CHECK widenings (required to write episode intents / mark episodes)
-- ----------------------------------------------------------------------------
ALTER TABLE m.creative_intent DROP CONSTRAINT IF EXISTS creative_intent_intent_kind_check;
ALTER TABLE m.creative_intent ADD  CONSTRAINT creative_intent_intent_kind_check
  CHECK (intent_kind = ANY (ARRAY['single'::text, 'package'::text, 'episode'::text]));

ALTER TABLE c.content_series_episode DROP CONSTRAINT IF EXISTS content_series_episode_status_check;
ALTER TABLE c.content_series_episode ADD  CONSTRAINT content_series_episode_status_check
  CHECK (status = ANY (ARRAY['outline'::text, 'writing'::text, 'draft_ready'::text, 'published'::text, 'intent_created'::text]));

-- ----------------------------------------------------------------------------
-- 1. fan_out_episode — create ONE creative_intent (intent_kind='episode') for a
--    single series episode and fan it out to one governed child slot per selected
--    platform, via the existing T1 governed primitive. Writes episode.intent_id.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fan_out_episode(
  p_episode_id   uuid,
  p_created_by   text DEFAULT 'series-v2',
  p_scheduled_for timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'm', 'c', 't', 'public'
AS $$
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

  -- Link the episode to its intent + mark it fanned out.
  UPDATE c.content_series_episode
  SET intent_id = v_intent_id, status = 'intent_created', updated_at = now()
  WHERE episode_id = p_episode_id;

  RETURN jsonb_build_object(
    'ok', true, 'episode_id', p_episode_id, 'intent_id', v_intent_id,
    'status', v_status, 'accepted', v_accepted, 'rejected', v_rejected,
    'targets', v_results);
END;
$$;

COMMENT ON FUNCTION public.fan_out_episode(uuid, text, timestamptz) IS
  'Series v2 (Stage 2): create one creative_intent (intent_kind=episode) for a series episode and fan it out to one governed child slot per selected platform via m.create_manual_slot_internal (the existing T1 primitive). Carries persona into source_material + brief. Writes episode.intent_id and status=intent_created. No direct draft/queue insert; does not call series_post_insert; canonical_ids stays empty (selected_canonical_ids_count=0). Service-role only.';

REVOKE EXECUTE ON FUNCTION public.fan_out_episode(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fan_out_episode(uuid, text, timestamptz) TO service_role;

-- ----------------------------------------------------------------------------
-- 2. retry_episode — real backend retry for a fanned-out episode.
--    Modes: refan_out | retry_failed_children | regenerate_outline_item.
--    Never re-creates a child for a platform that already has a published or
--    in-flight child (no duplicate published children; succeeded preserved).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.retry_episode(
  p_episode_id uuid,
  p_mode       text DEFAULT 'refan_out',
  p_created_by text DEFAULT 'series-v2-retry'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'm', 'c', 't', 'public'
AS $$
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

    -- Re-create a fresh governed child slot under the SAME intent (old dead slot
    -- is left in place for audit; the new slot is filled by the normal path).
    v_slot_res := m.create_manual_slot_internal(
      v_intent.client_id, v_platform, v_child_brief,
      v_intent.format_preference, v_base_ts + (v_idx * interval '1 minute'),
      v_created_by, v_ep.intent_id, 1.0);
    v_idx := v_idx + 1;

    IF (v_slot_res->>'ok')::boolean THEN
      v_recreated := v_recreated + 1;
      v_retried := v_retried || jsonb_build_array(jsonb_build_object(
        'platform', v_platform, 'status', 'recreated',
        'slot_id', v_slot_res->>'slot_id',
        'scheduled_publish_at', v_slot_res->>'scheduled_publish_at'));
    ELSE
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
$$;

COMMENT ON FUNCTION public.retry_episode(uuid, text, text) IS
  'Series v2 (Stage 2): real backend retry for a fanned-out episode. refan_out re-creates governed child slots for target platforms with no live/published child; retry_failed_children re-creates only where a dead/failed child exists. Never re-creates for a platform with a published or in-flight child (no duplicate published children; succeeded preserved). regenerate_outline_item is reserved for the Stage 3 series-writer EF. Reports retried[] and skipped[] with reasons. Service-role only.';

REVOKE EXECUTE ON FUNCTION public.retry_episode(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.retry_episode(uuid, text, text) TO service_role;

-- ----------------------------------------------------------------------------
-- 3. get_content_series_detail — EXTENDED (backward-compatible).
--    Keeps every legacy field (incl. platform_statuses from platform_drafts) and
--    ADDS per-episode: intent_id, persona/avatar fields, children (delegated to
--    get_creative_intent_detail), derived_status; and series_derived_status.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_content_series_detail(p_series_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_eps    jsonb;
  v_series jsonb;
  v_series_derived text;
BEGIN
  SELECT COALESCE(jsonb_agg(q.ep ORDER BY (q.ep->>'position')::int), '[]'::jsonb)
    INTO v_eps
  FROM (
    SELECT jsonb_build_object(
      'episode_id',         cse.episode_id,
      'position',           cse.position,
      'episode_title',      cse.episode_title,
      'episode_angle',      cse.episode_angle,
      'episode_hook',       cse.episode_hook,
      'cta_type',           cse.cta_type,
      'recommended_format', cse.recommended_format,
      'image_headline',     cse.image_headline,
      'scheduled_for',      cse.scheduled_for,
      'status',             cse.status,
      'post_draft_id',      cse.post_draft_id,
      'platform_drafts',    cse.platform_drafts,
      -- Series v2 additions:
      'intent_id',          cse.intent_id,
      'persona_label',      cse.persona_label,
      'avatar_preference',  cse.avatar_preference,
      'persona_notes',      cse.persona_notes,
      'children',           ch.children,
      'derived_status',
        CASE
          WHEN cse.intent_id IS NULL          THEN cse.status              -- legacy episode: stored status
          WHEN cc.n = 0                       THEN 'intent_created'
          WHEN cc.npub = cc.n                 THEN 'complete'
          WHEN cc.npub > 0                    THEN 'partial'
          WHEN cc.nbad = cc.n                 THEN 'failed'
          ELSE 'in_flight'
        END,
      -- legacy platform_statuses (unchanged) for backward read-compatibility
      'platform_statuses', (
        SELECT COALESCE(
          jsonb_object_agg(pd.platform, jsonb_build_object(
            'post_draft_id',   pd.post_draft_id,
            'approval_status', pd.approval_status,
            'image_status',    pd.image_status,
            'image_url',       pd.image_url)),
          '{}'::jsonb)
        FROM m.post_draft pd
        WHERE pd.post_draft_id::text = ANY(
          ARRAY(SELECT value FROM jsonb_each_text(COALESCE(cse.platform_drafts, '{}'::jsonb))))
      )
    ) AS ep
    FROM c.content_series_episode cse
    LEFT JOIN LATERAL (
      SELECT CASE
               WHEN cse.intent_id IS NULL THEN '[]'::jsonb
               ELSE COALESCE((public.get_creative_intent_detail(cse.intent_id)) -> 'children', '[]'::jsonb)
             END AS children
    ) ch ON true
    LEFT JOIN LATERAL (
      SELECT
        count(*) AS n,
        count(*) FILTER (WHERE
          e->>'publish_status' = 'published' OR e->>'slot_status' = 'published'
          OR e->>'approval_status' = 'published') AS npub,
        count(*) FILTER (WHERE
          e->>'publish_status'  IS DISTINCT FROM 'published'
          AND e->>'slot_status'     IS DISTINCT FROM 'published'
          AND e->>'approval_status' IS DISTINCT FROM 'published'
          AND (e->>'slot_status' IN ('skipped','failed')
               OR e->>'approval_status' IN ('rejected','dead','voided'))) AS nbad
      FROM jsonb_array_elements(ch.children) e
    ) cc ON true
    WHERE cse.series_id = p_series_id
  ) q;

  -- Series-level derived rollup (only meaningful once episodes carry intents).
  SELECT CASE
           WHEN count(*) FILTER (WHERE ep->>'intent_id' IS NOT NULL) = 0 THEN NULL
           WHEN count(*) FILTER (WHERE ep->>'derived_status' IN ('in_flight','intent_created','partial')) > 0 THEN 'active'
           WHEN count(*) FILTER (WHERE ep->>'intent_id' IS NOT NULL)
                = count(*) FILTER (WHERE ep->>'derived_status' = 'complete') THEN 'complete'
           WHEN count(*) FILTER (WHERE ep->>'intent_id' IS NOT NULL)
                = count(*) FILTER (WHERE ep->>'derived_status' = 'failed') THEN 'failed'
           ELSE 'partial'
         END
    INTO v_series_derived
  FROM jsonb_array_elements(v_eps) ep;

  SELECT jsonb_build_object(
    'series_id',      cs.series_id,
    'title',          cs.title,
    'topic',          cs.topic,
    'goal',           cs.goal,
    'audience_notes', cs.audience_notes,
    'tone_notes',     cs.tone_notes,
    'episode_count',  cs.episode_count,
    'platform',       cs.platform,
    'platforms',      cs.platforms,
    'status',         cs.status,
    'series_summary', cs.series_summary,
    'outline_approved_by', cs.outline_approved_by,
    'outline_approved_at', cs.outline_approved_at,
    'created_at',     cs.created_at,
    'client_timezone', COALESCE(cl.timezone, 'Australia/Sydney'),
    'series_derived_status', v_series_derived,
    'episodes',       v_eps
  )
  INTO v_series
  FROM c.content_series cs
  LEFT JOIN c.client cl ON cl.client_id = cs.client_id
  WHERE cs.series_id = p_series_id;

  RETURN v_series;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 4. approve_series_outline — messaging fix only.
--    outline_ready -> approve (unchanged success shape: ok:true, series_id).
--    already approved/writing/active/complete -> ok:true, already_approved (NOT a failure).
--    draft/outline_pending -> ok:false, outline_not_ready (genuine).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_series_outline(p_series_id uuid, p_approved_by text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_current_status text;
BEGIN
  SELECT status INTO v_current_status
  FROM c.content_series
  WHERE series_id = p_series_id;

  IF NOT FOUND OR v_current_status IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'series_not_found');
  END IF;

  IF v_current_status = 'outline_ready' THEN
    UPDATE c.content_series
    SET status = 'approved', outline_approved_by = p_approved_by,
        outline_approved_at = now(), updated_at = now()
    WHERE series_id = p_series_id;
    RETURN jsonb_build_object('ok', true, 'series_id', p_series_id, 'status', 'approved');
  END IF;

  IF v_current_status IN ('approved', 'writing', 'active', 'complete') THEN
    -- Already past outline approval — report state WITHOUT surfacing as a failure.
    RETURN jsonb_build_object('ok', true, 'series_id', p_series_id,
      'already_approved', true, 'status', v_current_status,
      'message', 'series outline already approved; series has advanced to ' || v_current_status);
  END IF;

  IF v_current_status IN ('draft', 'outline_pending') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'outline_not_ready',
      'status', v_current_status,
      'message', 'the outline has not been generated yet — generate the outline before approving');
  END IF;

  IF v_current_status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'series_cancelled', 'status', v_current_status);
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'unexpected_status', 'status', v_current_status);
END;
$function$;
