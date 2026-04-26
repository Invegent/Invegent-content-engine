-- Stage 9.044 — try_urgent_breaking_fills function (§B.12, F6/LD17)
-- WITH LD20 REPLACEABLE-SLOT CHECK
--
-- For each active (client, platform):
--   1. LD20 collision check — is there a NON-replaceable slot in next horizon hours?
--      Non-replaceable = status IN ('approved','published')
--                        OR (status='filled' AND is_evergreen=false AND slot_confidence > threshold)
--      Replaceable = pending_fill, fill_in_progress, filled-low-confidence, filled-evergreen.
--      A replaceable slot can be displaced by breaking news.
--      An non-replaceable slot blocks breaking news (don't disrupt approved/locked-in content).
--   2. If non-replaceable slot exists → skip this combo.
--   3. Else: query m.hot_breaking_pool for this client.
--      If found → INSERT urgent slot with source_kind='breaking', publish in 30 min.
--      The next fill_pending_slots cron tick picks it up via the normal flow.
--
-- This function does NOT fill slots itself — it inserts urgent slots that
-- the regular fill function processes. Single source of synthesis logic.
--
-- Defaults: horizon=6h, replaceable_confidence_threshold=0.65.

CREATE OR REPLACE FUNCTION m.try_urgent_breaking_fills(
  p_horizon_hours                       integer DEFAULT 6,
  p_replaceable_confidence_threshold    numeric DEFAULT 0.65
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted_count integer := 0;
  v_skipped_count  integer := 0;
  v_combo          record;
  v_breaking       record;
  v_publish_at     timestamptz;
  v_results        jsonb := '[]'::jsonb;
BEGIN
  FOR v_combo IN
    SELECT DISTINCT cp.client_id, cp.platform
    FROM c.client_publish_profile cp
    WHERE cp.publish_enabled = true
      AND (cp.paused_until IS NULL OR cp.paused_until < NOW())
  LOOP
    -- LD20 replaceable check
    IF EXISTS (
      SELECT 1
      FROM m.slot s
      WHERE s.client_id = v_combo.client_id
        AND s.platform  = v_combo.platform
        AND s.scheduled_publish_at BETWEEN NOW()
                                       AND NOW() + (p_horizon_hours * interval '1 hour')
        AND (
              s.status IN ('approved', 'published')
           OR (s.status = 'filled'
               AND s.is_evergreen = false
               AND COALESCE(s.slot_confidence, 0) > p_replaceable_confidence_threshold)
        )
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'client_id', v_combo.client_id,
        'platform',  v_combo.platform,
        'action',    'skipped',
        'reason',    'non_replaceable_slot_in_horizon'
      ));
      CONTINUE;
    END IF;

    -- Find a hot breaking item for this client
    SELECT * INTO v_breaking
    FROM m.hot_breaking_pool
    WHERE client_id = v_combo.client_id
    LIMIT 1;

    IF NOT FOUND THEN
      v_skipped_count := v_skipped_count + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'client_id', v_combo.client_id,
        'platform',  v_combo.platform,
        'action',    'skipped',
        'reason',    'no_breaking_in_pool'
      ));
      CONTINUE;
    END IF;

    -- Insert urgent slot — publish in 30 minutes; fill window already open.
    -- Format preference 'image_quote' as safe fallback (cheap, fast); fill function
    -- evaluates against quality policy and may upgrade or skip.
    v_publish_at := NOW() + interval '30 minutes';

    INSERT INTO m.slot (
      slot_id, client_id, platform, scheduled_publish_at,
      format_preference, fill_window_opens_at, fill_lead_time_minutes,
      status, source_kind, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_combo.client_id, v_combo.platform, v_publish_at,
      ARRAY['image_quote'],
      NOW(),  -- fill window opens immediately
      30,     -- 30 min lead time (override of normal 1440)
      'pending_fill', 'breaking', NOW(), NOW()
    );

    v_inserted_count := v_inserted_count + 1;
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'client_id',            v_combo.client_id,
      'platform',             v_combo.platform,
      'action',               'inserted_urgent_slot',
      'canonical_id',         v_breaking.canonical_id,
      'canonical_title',      v_breaking.canonical_title,
      'fitness_score_max',    v_breaking.fitness_score_max,
      'hours_since_first_seen', v_breaking.hours_since_first_seen,
      'scheduled_publish_at', v_publish_at
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'inserted',                          v_inserted_count,
    'skipped',                           v_skipped_count,
    'horizon_hours',                     p_horizon_hours,
    'replaceable_confidence_threshold',  p_replaceable_confidence_threshold,
    'results',                           v_results,
    'ran_at',                            NOW()
  );
END;
$$;

COMMENT ON FUNCTION m.try_urgent_breaking_fills(integer, numeric) IS
  'F6/LD17 + LD20 replaceable check. For each active (client, platform): if hot breaking exists AND no non-replaceable slot in horizon → INSERT urgent slot for fill function to process. Replaceable = pending_fill, fill_in_progress, filled-low-confidence (<threshold), filled-evergreen. Defaults: horizon=6h, threshold=0.65. Stage 9.044.';
