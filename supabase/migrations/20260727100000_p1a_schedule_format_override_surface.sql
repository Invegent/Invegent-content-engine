-- Migration: p1a_schedule_format_override_surface
-- Purpose: Additive schedule-format-override editor surface.
--   (B) Adds c.client_publish_schedule.format_override (operator's durable per-slot
--       format override; NULL = use computed allocation).
--   (C) Adds public.save_week_format_override(uuid, jsonb) — the fail-closed,
--       two-pass (validate-all-then-apply) save RPC, service_role-only.
--   (D) Extends public.get_week_format_allocation(uuid, date) with purely ADDITIVE
--       return fields (per-entry format_override / effective_format /
--       effective_is_valid, and a top-level selectable_formats map).
--
-- Additive-only: no column drops, no signature changes, no behavioural change to
--   existing consumers. contract_version REMAINS 'slice_a_allocation_v1' — an
--   existing production consumer (the dashboard read-only Slice-A panel) hard-rejects
--   any other value with a visible-failure block, so the new fields are an additive
--   superset UNDER the same version string. Old consumers ignore unknown fields.
--
-- Part (D) RECORDS the LIVE dow body of get_week_format_allocation. The repo
--   artifact 20260725004336 is STALE: it carries an isodow predicate, because the
--   Sunday-row repair (dow, not isodow) was applied to production via execute_sql,
--   NOT via a migration, so the repo file was never brought forward. The live body
--   captured here uses EXTRACT(dow ...) — Sunday=0 on the Postgres dow convention,
--   which matches how c.client_publish_schedule.day_of_week is stored (domain 0..6).
--   This migration therefore also reconciles the repo to live truth (additively).
--
-- Base pre-image md5s (pg_get_functiondef, live 2026-07-27):
--   m.materialise_slots(integer)                    = 48e2db58c8696f091e60051321a1fcb8
--   public.get_week_format_allocation(uuid,date)    = 11e566b52347dd396f04b481e299bb7c
--
-- Rollback: docs/briefs/artifacts/p1a-rollback.sql
-- ============================================================================

-- (B) Operator per-slot format override column ------------------------------
ALTER TABLE c.client_publish_schedule
  ADD COLUMN IF NOT EXISTS format_override text;

COMMENT ON COLUMN c.client_publish_schedule.format_override IS
  'Operator durable per-slot format override. NULL = use the computed allocation '
  '(format-mix allocator, or legacy preferred format). When set, it wins over both. '
  'Validated at save time (public.save_week_format_override) against '
  't."5.3_content_format".platform_support for the row''s platform; an unsupported '
  'platform/format combination is rejected fail-closed.';

-- (C) Fail-closed two-pass save RPC -----------------------------------------
CREATE OR REPLACE FUNCTION public.save_week_format_override(p_client_id uuid, p_overrides jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_item jsonb; v_schedule_id uuid; v_format text; v_platform text; v_valid boolean;
  v_updated integer := 0; v_cleared integer := 0; v_bad jsonb := '[]'::jsonb;
  v_rowcount integer;
BEGIN
  IF p_client_id IS NULL THEN RAISE EXCEPTION 'save_week_format_override: p_client_id is null' USING errcode='22004'; END IF;
  IF p_overrides IS NULL OR jsonb_typeof(p_overrides) <> 'array' THEN
    RAISE EXCEPTION 'save_week_format_override: p_overrides must be a jsonb array' USING errcode='22023'; END IF;
  -- PASS 1: validate all (fail-closed, atomic; no writes)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_overrides) LOOP
    v_schedule_id := (v_item ->> 'schedule_id')::uuid;
    v_format := NULLIF(v_item ->> 'format_override', '');
    SELECT s.platform INTO v_platform FROM c.client_publish_schedule s
      WHERE s.schedule_id = v_schedule_id AND s.client_id = p_client_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'save_week_format_override: schedule_id % not found for client %', v_schedule_id, p_client_id USING errcode='23503'; END IF;
    IF v_format IS NULL THEN CONTINUE; END IF;  -- NULL/empty clears the override (always allowed)
    SELECT COALESCE((f.platform_support ->> v_platform)::boolean, false) INTO v_valid
      FROM t."5.3_content_format" f WHERE f.ice_format_key = v_format;
    IF NOT FOUND OR NOT COALESCE(v_valid, false) THEN
      v_bad := v_bad || jsonb_build_object('schedule_id', v_schedule_id, 'platform', v_platform, 'format', v_format);
    END IF;
  END LOOP;
  IF jsonb_array_length(v_bad) > 0 THEN
    RAISE EXCEPTION 'save_week_format_override: unsupported platform/format combination(s): %', v_bad::text USING errcode='23514'; END IF;
  -- PASS 2: apply (all validated). Count only rows actually updated via ROW_COUNT;
  -- a validated row that updates 0 rows (concurrent delete since PASS 1) is fail-closed
  -- (RAISE rolls back the whole single-call txn), never silently over-counted.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_overrides) LOOP
    v_schedule_id := (v_item ->> 'schedule_id')::uuid;
    v_format := NULLIF(v_item ->> 'format_override', '');
    UPDATE c.client_publish_schedule SET format_override = v_format, updated_at = now()
      WHERE schedule_id = v_schedule_id AND client_id = p_client_id;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    IF v_rowcount = 0 THEN
      RAISE EXCEPTION 'save_week_format_override: schedule_id % for client % vanished between validate and apply', v_schedule_id, p_client_id USING errcode='23503'; END IF;
    IF v_format IS NULL THEN v_cleared := v_cleared + 1; ELSE v_updated := v_updated + 1; END IF;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'client_id', p_client_id, 'set_count', v_updated, 'cleared_count', v_cleared);
END;
$function$;

-- Grants: a new public function is born anon-executable via pg_default_acl,
-- so a naming REVOKE (PUBLIC + anon + authenticated) is mandatory before the
-- service_role-only GRANT.
REVOKE ALL ON FUNCTION public.save_week_format_override(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_week_format_override(uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.save_week_format_override(uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.save_week_format_override(uuid, jsonb) TO service_role;
ALTER FUNCTION public.save_week_format_override(uuid, jsonb) OWNER TO postgres;

-- (D) Extended read RPC (additive superset; contract_version stays v1) -------
-- Body is the byte-exact LIVE dow base (md5 11e566b52347dd396f04b481e299bb7c)
-- with ONLY these additive edits:
--   1. occ CTE:    + s.format_override
--   2. marked CTE: + occ.format_override
--   3. scored CTE: + LEFT JOIN t."5.3_content_format" fo ON fo.ice_format_key
--                    = COALESCE(mk.format_override, mk.assigned_format)
--                    and + (fo.platform_support ->> mk.platform) AS eff_support_raw
--   4. entries:    + format_override / effective_format / effective_is_valid
--   5. return:     + top-level selectable_formats (per-platform valid ice_format_key[])
-- CREATE OR REPLACE preserves the existing service_role-only ACL — no grants added.
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
  v_selectable jsonb;
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
           s.format_override,
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
           occ.format_override,
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
           (f.platform_support ->> mk.platform)   AS support_raw,
           (fo.platform_support ->> mk.platform)  AS eff_support_raw
    FROM marked mk
    LEFT JOIN t."5.3_content_format" f
           ON f.ice_format_key = mk.assigned_format
    LEFT JOIN t."5.3_content_format" fo
           ON fo.ice_format_key = COALESCE(mk.format_override, mk.assigned_format)
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
                 'format_override',    sc.format_override,
                 'effective_format',   COALESCE(sc.format_override, sc.assigned_format),
                 'effective_is_valid', COALESCE(sc.eff_support_raw::boolean, false),
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

  SELECT COALESCE(jsonb_object_agg(p.platform, p.fmts), '{}'::jsonb)
    INTO v_selectable
  FROM (
    SELECT pl.platform,
           COALESCE(jsonb_agg(f.ice_format_key ORDER BY f.ice_format_key)
                    FILTER (WHERE COALESCE((f.platform_support ->> pl.platform)::boolean, false)),
                    '[]'::jsonb) AS fmts
    FROM (VALUES ('facebook'),('instagram'),('linkedin'),('youtube')) AS pl(platform)
    CROSS JOIN t."5.3_content_format" f
    WHERE f.ice_format_key IS NOT NULL
    GROUP BY pl.platform
  ) p;

  RETURN jsonb_build_object(
    'contract_version',    'slice_a_allocation_v1',
    'timezone',            COALESCE(v_tz, 'UTC'),
    'week_monday',         v_monday,
    'format_mix_enrolled', v_enrolled,
    'selectable_formats',  COALESCE(v_selectable, '{}'::jsonb),
    'platforms',           COALESCE(v_platforms, '[]'::jsonb),
    'unmatchable_rows',    COALESCE(v_unmatched, '[]'::jsonb)
  );
END;
$function$;
