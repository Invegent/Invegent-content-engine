-- Rollback: p1c_materialise_slots_honour_format_override
-- Reverses migration 20260727100100_p1c_materialise_slots_honour_format_override.sql
-- by restoring m.materialise_slots to the byte-exact live base
-- (md5 48e2db58c8696f091e60051321a1fcb8). The base body does NOT reference
-- format_override, so it is safe to apply before the column is dropped by
-- p1a-rollback.sql step (iii).
-- ============================================================================

CREATE OR REPLACE FUNCTION m.materialise_slots(p_days_forward integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_inserted_count integer := 0;
  v_skipped_count  integer := 0;
  v_rule           record;
  v_slot_time      timestamptz;
  v_format_pref    text[];
  v_preferred_fmt  text;
  v_enrolled       boolean;
  v_tz             text;
  v_local_date     date;
  v_wk_monday      date;
  v_cache          jsonb;
  v_cache_key      text;
  v_assignment     text[];
  v_n              integer;
  v_ordinal        integer;
  v_shares_json    jsonb;
  v_chosen         text;
BEGIN
  FOR v_rule IN
    SELECT cps.schedule_id, cps.client_id, cps.platform, cps.day_of_week, cps.publish_time
    FROM c.client_publish_schedule cps
    JOIN c.client c ON c.client_id = cps.client_id AND c.status = 'active'
    WHERE cps.enabled = TRUE
  LOOP
    v_enrolled := m.format_mix_enrolled(v_rule.client_id);

    v_format_pref := ARRAY[]::text[];
    v_preferred_fmt := NULL;
    IF v_rule.platform = 'facebook' THEN
      SELECT preferred_format_facebook INTO v_preferred_fmt FROM c.client_publish_profile
      WHERE client_id = v_rule.client_id AND platform = 'facebook' AND status = 'active' AND publish_enabled = TRUE LIMIT 1;
    ELSIF v_rule.platform = 'instagram' THEN
      SELECT preferred_format_instagram INTO v_preferred_fmt FROM c.client_publish_profile
      WHERE client_id = v_rule.client_id AND platform = 'instagram' AND status = 'active' AND publish_enabled = TRUE LIMIT 1;
    ELSIF v_rule.platform = 'linkedin' THEN
      SELECT preferred_format_linkedin INTO v_preferred_fmt FROM c.client_publish_profile
      WHERE client_id = v_rule.client_id AND platform = 'linkedin' AND status = 'active' AND publish_enabled = TRUE LIMIT 1;
    ELSIF v_rule.platform = 'youtube' THEN
      v_preferred_fmt := 'video_short_avatar';
    END IF;
    IF v_preferred_fmt IS NOT NULL THEN v_format_pref := ARRAY[v_preferred_fmt]; END IF;

    IF v_enrolled THEN
      SELECT timezone INTO v_tz FROM c.client WHERE client_id = v_rule.client_id;
    END IF;

    FOR v_slot_time IN SELECT scheduled_publish_at FROM m.compute_rule_slot_times(v_rule.schedule_id, p_days_forward)
    LOOP
      v_chosen := NULL;

      IF v_enrolled AND v_tz IS NOT NULL THEN
        v_local_date := (v_slot_time AT TIME ZONE v_tz)::date;
        v_wk_monday  := date_trunc('week', v_local_date)::date;
        v_cache_key  := v_rule.platform || '|' || v_wk_monday::text;

        IF v_cache IS NULL THEN v_cache := '{}'::jsonb; END IF;
        IF NOT (v_cache ? v_cache_key) THEN
          SELECT jsonb_agg(jsonb_build_object('key', g.ice_format_key, 'share', g.share_pct)
                           ORDER BY g.share_pct DESC, g.ice_format_key ASC)
            INTO v_shares_json
          FROM m.build_weekly_demand_grid(v_rule.client_id, v_wk_monday) g
          WHERE g.platform = v_rule.platform;

          SELECT COUNT(*)::integer INTO v_n
          FROM c.client_publish_schedule s
          JOIN generate_series(v_wk_monday, v_wk_monday + 6, interval '1 day') d
            ON EXTRACT(dow FROM d)::integer = s.day_of_week
          WHERE s.client_id = v_rule.client_id AND s.platform = v_rule.platform AND s.enabled = TRUE;

          IF v_shares_json IS NULL OR v_n IS NULL OR v_n = 0 THEN
            v_assignment := ARRAY[]::text[];
          ELSE
            v_assignment := m.allocate_week_formats(v_shares_json, v_n);
          END IF;

          v_cache := v_cache || jsonb_build_object(
            v_cache_key,
            to_jsonb(v_assignment)
          );
        END IF;

        SELECT occ.ordinal INTO v_ordinal
        FROM (
          SELECT (d::date + s.publish_time)::timestamp AT TIME ZONE v_tz AS occ_ts,
                 row_number() OVER (
                   ORDER BY (d::date + s.publish_time)::timestamp AT TIME ZONE v_tz ASC
                 ) AS ordinal
          FROM c.client_publish_schedule s
          JOIN generate_series(v_wk_monday, v_wk_monday + 6, interval '1 day') d
            ON EXTRACT(dow FROM d)::integer = s.day_of_week
          WHERE s.client_id = v_rule.client_id AND s.platform = v_rule.platform AND s.enabled = TRUE
        ) occ
        WHERE occ.occ_ts = v_slot_time
        ORDER BY occ.ordinal ASC
        LIMIT 1;

        v_assignment := ARRAY(
          SELECT jsonb_array_elements_text(v_cache -> v_cache_key)
        );

        IF v_ordinal IS NOT NULL
           AND v_assignment IS NOT NULL
           AND array_length(v_assignment, 1) IS NOT NULL
           AND v_ordinal >= 1
           AND v_ordinal <= array_length(v_assignment, 1) THEN
          v_chosen := v_assignment[v_ordinal];
        END IF;
      END IF;

      IF v_chosen IS NOT NULL THEN
        v_format_pref := ARRAY[v_chosen];
      ELSE
        v_format_pref := CASE WHEN v_preferred_fmt IS NOT NULL THEN ARRAY[v_preferred_fmt] ELSE ARRAY[]::text[] END;
      END IF;

      INSERT INTO m.slot (client_id, platform, scheduled_publish_at, format_preference, fill_window_opens_at, fill_lead_time_minutes, status, source_kind, schedule_id)
      VALUES (v_rule.client_id, v_rule.platform, v_slot_time, v_format_pref, v_slot_time - interval '1440 minutes', 1440, 'future', 'scheduled', v_rule.schedule_id)
      ON CONFLICT DO NOTHING;
      IF FOUND THEN v_inserted_count := v_inserted_count + 1; ELSE v_skipped_count := v_skipped_count + 1; END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_inserted_count, 'skipped_already_exist', v_skipped_count, 'days_forward', p_days_forward, 'ran_at', now());
END;
$function$
;
