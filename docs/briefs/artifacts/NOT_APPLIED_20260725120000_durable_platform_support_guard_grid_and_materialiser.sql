-- =====================================================================
-- RETIRED FROM THE MIGRATION DISCOVERY PATH -- NOT APPLIED, DO NOT RESTORE
-- =====================================================================
-- ORIGINAL PATH : supabase/migrations/20260725120000_durable_platform_support_guard_grid_and_materialiser.sql
-- CLASS         : UNAPPLIED EXECUTABLE RISK
-- LEDGER STATUS : version 20260725120000 is NOT in supabase_migrations.schema_migrations
--                 (verified live 2026-08-07). Never applied under this identity.
--
-- SUPERSEDED TWICE OVER. It CREATE OR REPLACEs m.build_weekly_demand_grid and
-- m.materialise_slots; both live definitions are NEWER and come from other ledger
-- entries (20260801023502 s7_demand_grid_capability_guard_v1 /
-- 20260727032613 p1c_materialise_slots_honour_format_override). Applying this file
-- now would REGRESS both live functions.
--
-- Retained for provenance only. Its paired rollback is retired alongside as
-- RETIRED_ROLLBACK_20260725120000_durable_platform_support_guard.sql.
-- DO NOT RESTORE. DO NOT EXECUTE.
-- BODY BELOW IS BYTE-IDENTICAL TO THE ORIGINAL.
-- =====================================================================

-- Migration: durable platform_support prevention — grid intersection + materialiser fallback guard
-- Lane: S7 durable-fix (root cause of platform-invalid slot materialisation)
-- Design of record: docs/briefs/durable-platform-support-intersection-demand-grid-gate1-v3.md
-- Tier: T3 (two live production functions on the nightly publish path). Data-neutral by design.
--
-- WHAT THIS DOES (two coupled sub-changes, one prevention):
--   Sub-change 1 — m.build_weekly_demand_grid: insert a `platform_capable` CTE between
--     `enabled_set` and `policy_backed` that intersects each candidate format against
--     t."5.3_content_format".platform_support for its platform, fail-closed
--     (COALESCE(...,false)) and is_active=true. `policy_backed` now draws FROM platform_capable.
--     Covers the ENROLLED path (grid → allocate_week_formats → slot.format_preference).
--   Sub-change 2 — m.materialise_slots: guard the NON-ENROLLED fallback (v_preferred_fmt)
--     against the same predicate before the INSERT, mirroring m.create_manual_slot_internal.
--     Disposition = DROP to empty (NOT raise — a raise aborts the whole nightly run). A new
--     v_dropped_pref counter is surfaced in the return jsonb for observability.
--
-- REBASED 2026-07-25 onto current origin 5488e85: m.materialise_slots was changed live by the
-- Sunday convention repair (EXTRACT(isodow)->EXTRACT(dow), x2). This migration is rebuilt on the
-- post-Sunday-fix body so it PRESERVES that fix and adds the guard on top (grid untouched).
-- ROLLBACK (pinned live md5 of pg_get_functiondef, current pre-image):
--   m.build_weekly_demand_grid : 2dff1dab88fb1f9e3f341ea6f9f843c7  (4330 B, unchanged)
--   m.materialise_slots        : 48e2db58c8696f091e60051321a1fcb8  (5639 B, post-Sunday-fix)
--   Rollback = CREATE OR REPLACE each back to the definition captured in the apply packet
--   (§ rollback), which is the byte source of these md5s. Fast, in-txn, touches no data.
--
-- NON-GOALS / NAMED RESIDUALS (see design v3):
--   R2a — a dropped non-enrolled preference routes to m.fill_pending_slots' default
--         COALESCE(format_preference[1],'image_quote'); image_quote is NOT valid on YouTube.
--         Airtight for FB/IG/LI; a YouTube-default hole remains (optional sub-change 3 in
--         m.fill_pending_slots — NOT in this migration).
--   Zero-delta ship condition: on live data at author time the grid is already 0-invalid and
--   every live v_preferred_fmt is valid, so BOTH sub-changes are provable no-ops (proof P2/P6).

-- =====================================================================================
-- Sub-change 1 — m.build_weekly_demand_grid  (add platform_capable CTE; repoint policy_backed)
-- =====================================================================================
CREATE OR REPLACE FUNCTION m.build_weekly_demand_grid(p_client_id uuid, p_week_start date DEFAULT CURRENT_DATE)
 RETURNS TABLE(client_id uuid, platform text, ice_format_key text, share_pct numeric, weekly_slot_count integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH slots_per_platform AS (
    SELECT cps.platform, COUNT(*)::integer AS weekly_slots
    FROM c.client_publish_schedule cps
    WHERE cps.client_id = p_client_id AND cps.enabled = true
    GROUP BY cps.platform
  ),
  candidate AS (
    SELECT d.platform, d.ice_format_key, d.default_share_pct AS share_pct
    FROM t.platform_format_mix_default d
    WHERE d.is_current = true
    UNION
    SELECT o.platform, o.ice_format_key, NULL::numeric
    FROM c.client_format_mix_override o
    WHERE o.client_id = p_client_id AND o.is_current = true
  ),
  candidate_share AS (
    SELECT cand.platform, cand.ice_format_key,
           COALESCE(
             (SELECT o.override_share_pct
                FROM c.client_format_mix_override o
               WHERE o.client_id = p_client_id AND o.is_current = true
                 AND o.platform = cand.platform AND o.ice_format_key = cand.ice_format_key
               LIMIT 1),
             max(cand.share_pct),
             0
           ) AS share_pct
    FROM candidate cand
    GROUP BY cand.platform, cand.ice_format_key
  ),
  enabled_set AS (
    SELECT cs.platform, cs.ice_format_key, cs.share_pct
    FROM candidate_share cs
    WHERE EXISTS (
      SELECT 1
      FROM c.client_format_config cfg
      WHERE cfg.client_id = p_client_id
        AND cfg.ice_format_key = cs.ice_format_key
        AND cfg.is_enabled = true
        AND (
          cfg.platform = cs.platform
          OR (
            cfg.platform IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM c.client_format_config cfg2
              WHERE cfg2.client_id = p_client_id
                AND cfg2.ice_format_key = cs.ice_format_key
                AND cfg2.platform = cs.platform
            )
          )
        )
    )
  ),
  -- SUB-CHANGE 1: platform-capability intersection (fail-closed), mirrors create_manual_slot_internal.
  -- Removes any candidate format the platform cannot publish BEFORE normalisation, so surviving
  -- shares re-weight via the existing per_platform_total/normalised CTEs (renormalize, not flatten).
  platform_capable AS (
    SELECT es.platform, es.ice_format_key, es.share_pct
    FROM enabled_set es
    WHERE EXISTS (
      SELECT 1 FROM t."5.3_content_format" cf
       WHERE cf.ice_format_key = es.ice_format_key
         AND cf.is_active = true
         AND COALESCE((cf.platform_support ->> es.platform)::boolean, false)
    )
  ),
  policy_backed AS (
    SELECT es.platform, es.ice_format_key, es.share_pct
    FROM platform_capable es
    WHERE EXISTS (SELECT 1 FROM t.format_synthesis_policy sp
                   WHERE sp.ice_format_key = es.ice_format_key AND sp.is_current = true)
      AND EXISTS (SELECT 1 FROM t.format_quality_policy qp
                   WHERE qp.ice_format_key = es.ice_format_key AND qp.is_current = true)
  ),
  per_platform_total AS (
    SELECT pb.platform AS platform, NULLIF(SUM(pb.share_pct), 0) AS total_share
    FROM policy_backed pb
    GROUP BY pb.platform
  ),
  normalised AS (
    SELECT pb.platform, pb.ice_format_key,
           CASE
             WHEN ppt.total_share IS NULL
               THEN 100.0 / NULLIF(COUNT(*) OVER (PARTITION BY pb.platform), 0)
             ELSE pb.share_pct * 100.0 / ppt.total_share
           END AS share_pct
    FROM policy_backed pb
    JOIN per_platform_total ppt ON ppt.platform = pb.platform
  ),
  with_slots AS (
    SELECT n.platform, n.ice_format_key, n.share_pct,
           COALESCE(sp.weekly_slots, 0) AS weekly_slots
    FROM normalised n
    LEFT JOIN slots_per_platform sp ON sp.platform = n.platform
  ),
  raw_alloc AS (
    SELECT ws.platform, ws.ice_format_key, ws.share_pct, ws.weekly_slots,
           (ws.share_pct / 100.0) * ws.weekly_slots AS raw,
           floor((ws.share_pct / 100.0) * ws.weekly_slots)::integer AS fl,
           ((ws.share_pct / 100.0) * ws.weekly_slots)
             - floor((ws.share_pct / 100.0) * ws.weekly_slots) AS rem
    FROM with_slots ws
  ),
  alloc_ranked AS (
    SELECT ra.*,
           row_number() OVER (
             PARTITION BY ra.platform
             ORDER BY ra.rem DESC, ra.share_pct DESC, ra.ice_format_key ASC
           ) AS rk,
           SUM(ra.fl) OVER (PARTITION BY ra.platform) AS base_sum,
           MAX(ra.weekly_slots) OVER (PARTITION BY ra.platform) AS plat_slots
    FROM raw_alloc ra
  )
  SELECT p_client_id AS client_id,
         ar.platform,
         ar.ice_format_key,
         ar.share_pct,
         (ar.fl + CASE WHEN ar.rk <= (ar.plat_slots - ar.base_sum) THEN 1 ELSE 0 END)::integer
           AS weekly_slot_count
  FROM alloc_ranked ar
  ORDER BY ar.platform, ar.share_pct DESC, ar.ice_format_key;
END;
$function$;

-- =====================================================================================
-- Sub-change 2 — m.materialise_slots  (guard v_preferred_fmt fallback; add drop counter)
-- =====================================================================================
CREATE OR REPLACE FUNCTION m.materialise_slots(p_days_forward integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_inserted_count integer := 0;
  v_skipped_count  integer := 0;
  v_dropped_pref   integer := 0;
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

      -- SUB-CHANGE 2: fallback-path platform_support guard (mirrors create_manual_slot_internal).
      -- Enrolled/grid path is already guarded upstream by sub-change 1 (v_chosen comes from the grid).
      -- Non-enrolled fallback: keep v_preferred_fmt ONLY if the platform can publish it; else DROP to
      -- empty (do NOT raise — a raise would abort the whole nightly run for every client) and count it.
      IF v_chosen IS NOT NULL THEN
        v_format_pref := ARRAY[v_chosen];
      ELSIF v_preferred_fmt IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM t."5.3_content_format" cf
               WHERE cf.ice_format_key = v_preferred_fmt
                 AND cf.is_active = true
                 AND COALESCE((cf.platform_support ->> v_rule.platform)::boolean, false)
            ) THEN
        v_format_pref := ARRAY[v_preferred_fmt];
      ELSE
        v_format_pref := ARRAY[]::text[];
        IF v_preferred_fmt IS NOT NULL THEN
          v_dropped_pref := v_dropped_pref + 1;
        END IF;
      END IF;

      INSERT INTO m.slot (client_id, platform, scheduled_publish_at, format_preference, fill_window_opens_at, fill_lead_time_minutes, status, source_kind, schedule_id)
      VALUES (v_rule.client_id, v_rule.platform, v_slot_time, v_format_pref, v_slot_time - interval '1440 minutes', 1440, 'future', 'scheduled', v_rule.schedule_id)
      ON CONFLICT DO NOTHING;
      IF FOUND THEN v_inserted_count := v_inserted_count + 1; ELSE v_skipped_count := v_skipped_count + 1; END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_inserted_count, 'skipped_already_exist', v_skipped_count, 'formats_dropped_platform_unsupported', v_dropped_pref, 'days_forward', p_days_forward, 'ran_at', now());
END;
$function$;
