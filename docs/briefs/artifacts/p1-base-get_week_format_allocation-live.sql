CREATE OR REPLACE FUNCTION public.get_week_format_allocation(p_client_id uuid, p_week_start date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_tz        text;
  v_monday    date;
  v_enrolled  boolean;
  v_platforms jsonb;
  v_unmatched jsonb;
BEGIN
  IF p_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_client',
                              'message', 'No client supplied.');
  END IF;

  SELECT cl.timezone INTO v_tz
  FROM c.client cl
  WHERE cl.client_id = p_client_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'client_not_found',
                              'message', 'No such client.');
  END IF;

  v_monday := date_trunc(
                'week',
                COALESCE(p_week_start,
                         (now() AT TIME ZONE COALESCE(v_tz, 'UTC'))::date)
              )::date;

  v_enrolled := m.format_mix_enrolled(p_client_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'platform',     s.platform,
           'schedule_id',  s.schedule_id::text,
           'day_of_week',  s.day_of_week,
           'publish_time', to_char(s.publish_time, 'HH24:MI'),
           'reason_code',  CASE WHEN s.day_of_week = 0
                                THEN 'sunday_written_as_zero'
                                ELSE 'day_of_week_out_of_isodow_range' END
         ) ORDER BY s.platform, s.publish_time), '[]'::jsonb)
    INTO v_unmatched
  FROM c.client_publish_schedule s
  WHERE s.client_id = p_client_id
    AND s.enabled = true
    AND (s.day_of_week IS NULL OR s.day_of_week NOT BETWEEN 0 AND 6);

  WITH occ AS (
    SELECT s.platform,
           s.schedule_id,
           s.day_of_week,
           s.publish_time,
           row_number() OVER (
             PARTITION BY s.platform
             ORDER BY (d::date + s.publish_time)::timestamp
                        AT TIME ZONE COALESCE(v_tz, 'UTC') ASC
           ) AS ordinal
    FROM c.client_publish_schedule s
    JOIN generate_series(v_monday, v_monday + 6, interval '1 day') d
      ON EXTRACT(dow FROM d)::integer = s.day_of_week
    WHERE s.client_id = p_client_id
      AND s.enabled = true
  ),
  n AS (
    SELECT occ.platform, count(*)::integer AS n
    FROM occ GROUP BY occ.platform
  ),
  grid AS (
    SELECT g.platform,
           jsonb_agg(jsonb_build_object('key', g.ice_format_key, 'share', g.share_pct)
                     ORDER BY g.share_pct DESC, g.ice_format_key ASC) AS shares
    FROM m.build_weekly_demand_grid(p_client_id, v_monday) g
    GROUP BY g.platform
  ),
  alloc AS (
    SELECT n.platform,
           n.n,
           CASE
             WHEN v_enrolled AND grid.shares IS NOT NULL AND n.n > 0
               THEN m.allocate_week_formats(grid.shares, n.n)
             ELSE ARRAY[]::text[]
           END AS a,
           CASE
             WHEN NOT v_enrolled            THEN 'not_enrolled_legacy_fallback'
             WHEN grid.shares IS NULL       THEN 'grid_empty_legacy_fallback'
             ELSE 'allocated'
           END AS allocation_status
    FROM n LEFT JOIN grid ON grid.platform = n.platform
  ),
  legacy AS (
    SELECT a.platform,
           CASE a.platform
             WHEN 'youtube' THEN 'video_short_avatar'
             ELSE (
               SELECT CASE a.platform
                        WHEN 'facebook'  THEN pr.preferred_format_facebook
                        WHEN 'instagram' THEN pr.preferred_format_instagram
                        WHEN 'linkedin'  THEN pr.preferred_format_linkedin
                      END
               FROM c.client_publish_profile pr
               WHERE pr.client_id = p_client_id
                 AND pr.platform = a.platform
                 AND pr.status = 'active'
                 AND pr.publish_enabled = true
               LIMIT 1
             )
           END AS legacy_format
    FROM alloc a
  ),
  marked AS (
    SELECT occ.platform,
           occ.ordinal,
           occ.schedule_id,
           occ.day_of_week,
           occ.publish_time,
           alloc.n,
           alloc.allocation_status,
           l.legacy_format,
           CASE WHEN array_length(alloc.a, 1) IS NOT NULL
                     AND occ.ordinal <= array_length(alloc.a, 1)
                THEN alloc.a[occ.ordinal] END AS allocator_format,
           COALESCE(
             CASE WHEN array_length(alloc.a, 1) IS NOT NULL
                       AND occ.ordinal <= array_length(alloc.a, 1)
                  THEN alloc.a[occ.ordinal] END,
             l.legacy_format
           ) AS assigned_format
    FROM occ
    JOIN alloc ON alloc.platform = occ.platform
    LEFT JOIN legacy l ON l.platform = occ.platform
  ),
  scored AS (
    SELECT mk.*,
           f.ice_format_key AS known_format,
           (f.platform_support ? mk.platform)     AS support_key_present,
           (f.platform_support ->> mk.platform)   AS support_raw
    FROM marked mk
    LEFT JOIN t."5.3_content_format" f
           ON f.ice_format_key = mk.assigned_format
  )
  SELECT COALESCE(jsonb_agg(x.p ORDER BY x.p ->> 'platform'), '[]'::jsonb)
    INTO v_platforms
  FROM (
    SELECT jsonb_build_object(
             'platform',          sc.platform,
             'slot_count',        sc.n,
             'allocation_status', min(sc.allocation_status),
             'legacy_format',     min(sc.legacy_format),
             'invalid_count',     count(*) FILTER (
                                    WHERE NOT COALESCE(sc.support_raw::boolean, false)),
             'entries',           jsonb_agg(jsonb_build_object(
                 'ordinal',           sc.ordinal,
                 'schedule_id',       sc.schedule_id::text,
                 'day_of_week',       sc.day_of_week,
                 'publish_time',      to_char(sc.publish_time, 'HH24:MI'),
                 'assigned_format',   sc.assigned_format,
                 'allocation_source', CASE WHEN sc.allocator_format IS NOT NULL
                                           THEN 'format_mix_allocator'
                                           ELSE 'legacy_preferred_format' END,
                 'is_valid',          COALESCE(sc.support_raw::boolean, false),
                 'invalid_reason_code',
                   CASE
                     WHEN sc.assigned_format IS NULL       THEN 'no_format_assigned'
                     WHEN sc.known_format IS NULL          THEN 'format_key_unknown'
                     WHEN NOT sc.support_key_present       THEN 'platform_absent_from_support_map'
                     WHEN sc.support_raw::boolean IS FALSE THEN 'platform_support_false'
                     ELSE NULL
                   END
               ) ORDER BY sc.ordinal)
           ) AS p
    FROM scored sc
    GROUP BY sc.platform, sc.n
  ) x;

  RETURN jsonb_build_object(
    'contract_version',    'slice_a_allocation_v1',
    'timezone',            COALESCE(v_tz, 'UTC'),
    'week_monday',         v_monday,
    'format_mix_enrolled', v_enrolled,
    'platforms',           COALESCE(v_platforms, '[]'::jsonb),
    'unmatchable_rows',    COALESCE(v_unmatched, '[]'::jsonb)
  );
END;
$function$
