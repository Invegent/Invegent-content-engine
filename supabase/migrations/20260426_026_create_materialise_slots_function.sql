-- Stage 5.026 — m.materialise_slots: main materialiser
-- Walks every active client × enabled schedule rule, generates future slot times,
-- and INSERTs them with ON CONFLICT DO NOTHING (uses idx_slot_unique_active).

CREATE OR REPLACE FUNCTION m.materialise_slots(p_days_forward integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted_count integer := 0;
  v_skipped_count  integer := 0;
  v_rule           record;
  v_slot_time      timestamptz;
  v_format_pref    text[];
  v_preferred_fmt  text;
BEGIN
  FOR v_rule IN
    SELECT
      cps.schedule_id, cps.client_id, cps.platform, cps.day_of_week, cps.publish_time
    FROM c.client_publish_schedule cps
    JOIN c.client c ON c.client_id = cps.client_id AND c.status = 'active'
    WHERE cps.enabled = TRUE
  LOOP
    -- Resolve format_preference for this (client, platform)
    v_format_pref := ARRAY[]::text[];

    IF v_rule.platform = 'facebook' THEN
      SELECT preferred_format_facebook INTO v_preferred_fmt
      FROM c.client_publish_profile
      WHERE client_id = v_rule.client_id AND platform = 'facebook'
        AND status = 'active' AND publish_enabled = TRUE
      LIMIT 1;
    ELSIF v_rule.platform = 'instagram' THEN
      SELECT preferred_format_instagram INTO v_preferred_fmt
      FROM c.client_publish_profile
      WHERE client_id = v_rule.client_id AND platform = 'instagram'
        AND status = 'active' AND publish_enabled = TRUE
      LIMIT 1;
    ELSIF v_rule.platform = 'linkedin' THEN
      SELECT preferred_format_linkedin INTO v_preferred_fmt
      FROM c.client_publish_profile
      WHERE client_id = v_rule.client_id AND platform = 'linkedin'
        AND status = 'active' AND publish_enabled = TRUE
      LIMIT 1;
    ELSIF v_rule.platform = 'youtube' THEN
      -- No preferred_format_youtube column; default per memory note
      v_preferred_fmt := 'video_short_avatar';
    END IF;

    IF v_preferred_fmt IS NOT NULL THEN
      v_format_pref := ARRAY[v_preferred_fmt];
    END IF;

    -- Generate slot times for this rule and INSERT
    FOR v_slot_time IN
      SELECT scheduled_publish_at FROM m.compute_rule_slot_times(v_rule.schedule_id, p_days_forward)
    LOOP
      INSERT INTO m.slot (
        client_id, platform, scheduled_publish_at,
        format_preference, fill_window_opens_at, fill_lead_time_minutes,
        status, source_kind, schedule_id
      ) VALUES (
        v_rule.client_id, v_rule.platform, v_slot_time,
        v_format_pref, v_slot_time - interval '1440 minutes', 1440,
        'future', 'scheduled', v_rule.schedule_id
      )
      ON CONFLICT DO NOTHING;

      IF FOUND THEN
        v_inserted_count := v_inserted_count + 1;
      ELSE
        v_skipped_count := v_skipped_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted_count,
    'skipped_already_exist', v_skipped_count,
    'days_forward', p_days_forward,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION m.materialise_slots(integer) IS
  'Materialises forward slots from c.client_publish_schedule. ON CONFLICT DO NOTHING via idx_slot_unique_active. Sets fill_window_opens_at = scheduled_publish_at - 24h (LD4). Stage 5.026.';
