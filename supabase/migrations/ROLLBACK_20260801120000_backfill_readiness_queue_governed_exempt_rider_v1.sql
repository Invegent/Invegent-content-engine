-- =====================================================================
-- ROLLBACK for 20260801120000_backfill_readiness_queue_governed_exempt_rider_v1.sql
--
-- Restores public.get_client_production_readiness_queue to the EXACT
-- tracked-predecessor body from 20260730120000_client_production_readiness_queue_rpc_v1.sql
-- (byte-identical to that file's CREATE FUNCTION body) — i.e. removes the D1
-- governed-exempt rider (exempt_cells CTE, is_governed_exempt column, the
-- four downstream CASE overrides, and the capability_status_overlay field).
--
-- Does NOT touch public.is_capability_exempt_format — that predicate predates
-- this rider (20260729143000_s9_layer1_capability_gate_fill_pending_slots.sql)
-- and is out of scope for this rollback.
--
-- Reference only — NOT executed by the paired forward migration.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_client_production_readiness_queue(p_client_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
STABLE
AS $function$
DECLARE
  v_client_id uuid;
  v_timezone  text;
  v_result    jsonb;
BEGIN
  IF p_client_slug IS NULL OR btrim(p_client_slug) = '' THEN
    RAISE EXCEPTION 'p_client_slug must not be null or blank'
      USING ERRCODE = '22004';
  END IF;

  SELECT cl.client_id, cl.timezone INTO v_client_id, v_timezone
    FROM c.client AS cl
   WHERE cl.client_slug = p_client_slug;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'unknown client_slug % (no matching c.client row)', p_client_slug
      USING ERRCODE = '23503';
  END IF;

  v_timezone := COALESCE(v_timezone, 'UTC');

  WITH
  platforms(platform) AS (
    VALUES ('facebook'), ('instagram'), ('linkedin'), ('youtube')
  ),
  cfg_cells AS (
    SELECT DISTINCT p.platform, cfg.ice_format_key AS format
    FROM c.client_format_config AS cfg
    CROSS JOIN platforms AS p
    WHERE cfg.client_id = v_client_id
      AND cfg.is_enabled = true
      AND (cfg.platform = p.platform OR cfg.platform IS NULL)
  ),
  sched_cells AS (
    SELECT DISTINCT cps.platform, cps.format_override AS format
    FROM c.client_publish_schedule AS cps
    WHERE cps.client_id = v_client_id
      AND cps.enabled = true
      AND cps.format_override IS NOT NULL
  ),
  slot_cells AS (
    SELECT DISTINCT s.platform, COALESCE(s.format_chosen, s.format_preference[1]) AS format
    FROM m.slot AS s
    WHERE s.client_id = v_client_id
      AND COALESCE(s.format_chosen, s.format_preference[1]) IS NOT NULL
  ),
  requested_cells AS (
    SELECT platform, format, false AS is_probe_cell FROM cfg_cells
    UNION
    SELECT platform, format, false AS is_probe_cell FROM sched_cells
    UNION
    SELECT platform, format, false AS is_probe_cell FROM slot_cells
  ),
  probe_cells AS (
    SELECT p.platform, 'image_quote'::text AS format, true AS is_probe_cell
    FROM platforms AS p
    WHERE NOT EXISTS (SELECT 1 FROM requested_cells AS rc WHERE rc.platform = p.platform)
  ),
  all_cells AS (
    SELECT platform, format, is_probe_cell FROM requested_cells
    UNION
    SELECT platform, format, is_probe_cell FROM probe_cells
  ),
  profile_rows AS (
    SELECT cpp.platform, cpp.status, cpp.publish_enabled,
           cpp.paused_until, cpp.paused_reason, cpp.paused_at
    FROM c.client_publish_profile AS cpp
    WHERE cpp.client_id = v_client_id
  ),
  schedule_platform_rows AS (
    SELECT cps.platform, count(*) AS enabled_schedule_row_count
    FROM c.client_publish_schedule AS cps
    WHERE cps.client_id = v_client_id
      AND cps.enabled = true
    GROUP BY cps.platform
  ),
  portfolio_summary AS (
    SELECT public.get_creative_template_portfolio_summary(p_client_slug) AS psum
  ),
  by_format_rows AS (
    SELECT
      elem->>'format_key'                              AS format_key,
      elem->>'platform'                                 AS platform,
      elem->>'production_winner_provider_template_id'   AS production_winner_provider_template_id,
      elem->>'production_winner_name'                   AS production_winner_name,
      NULLIF(elem->>'eligible_alternate_count','')::int  AS eligible_alternate_count
    FROM portfolio_summary AS ps
    CROSS JOIN LATERAL jsonb_array_elements(ps.psum->'by_format') AS elem
  ),
  cells_computed AS (
    SELECT
      ac.platform,
      ac.format,
      ac.is_probe_cell,
      NOT ac.is_probe_cell AS scheduled_demand,
      (SELECT s.scheduled_publish_at
         FROM m.slot AS s
        WHERE s.client_id = v_client_id
          AND s.platform  = ac.platform
          AND (s.format_chosen = ac.format
               OR (s.format_chosen IS NULL AND ac.format = ANY (s.format_preference)))
          AND s.scheduled_publish_at > now()
          AND s.filled_at IS NULL
        ORDER BY s.scheduled_publish_at ASC
        LIMIT 1) AS next_slot_occurrence,
      (SELECT min(occ.ts)
         FROM c.client_publish_schedule AS cps
         CROSS JOIN LATERAL (
           SELECT (d::date + cps.publish_time)::timestamp AT TIME ZONE v_timezone AS ts
           FROM generate_series(CURRENT_DATE, CURRENT_DATE + 13, interval '1 day') AS d
           WHERE EXTRACT(dow FROM d)::integer = cps.day_of_week
         ) AS occ
        WHERE cps.client_id = v_client_id
          AND cps.platform  = ac.platform
          AND cps.enabled   = true
          AND cps.format_override = ac.format
          AND occ.ts > now()) AS next_projected_occurrence,
      pr.status          AS profile_status,
      pr.publish_enabled AS profile_publish_enabled,
      pr.paused_until    AS profile_paused_until,
      pr.paused_reason   AS profile_paused_reason,
      pr.paused_at       AS profile_paused_at,
      (pr.platform IS NOT NULL) AS has_profile_row,
      (spr.platform IS NOT NULL AND spr.enabled_schedule_row_count > 0) AS has_schedule_row,
      public.classify_format_capability(p_client_slug, ac.platform, ac.format) AS cap,
      (
        EXISTS (
          SELECT 1 FROM t."5.3_content_format" AS cf
           WHERE cf.ice_format_key = ac.format
             AND cf.is_active = true
             AND COALESCE((cf.platform_support ->> ac.platform)::boolean, false)
        )
        AND EXISTS (
          SELECT 1 FROM c.client_format_config AS cfg
           WHERE cfg.client_id = v_client_id
             AND cfg.ice_format_key = ac.format
             AND cfg.is_enabled = true
             AND (
               cfg.platform = ac.platform
               OR (
                 cfg.platform IS NULL
                 AND NOT EXISTS (
                   SELECT 1 FROM c.client_format_config AS cfg2
                    WHERE cfg2.client_id = v_client_id
                      AND cfg2.ice_format_key = ac.format
                      AND cfg2.platform = ac.platform
                 )
               )
             )
        )
      ) AS runtime_reachable,
      (SELECT bf.production_winner_provider_template_id
         FROM by_format_rows AS bf
        WHERE bf.format_key = ac.format
          AND (bf.platform = ac.platform OR bf.platform IS NULL)
        ORDER BY (bf.platform IS NOT NULL) DESC
        LIMIT 1) AS template_winner_id,
      (SELECT bf.production_winner_name
         FROM by_format_rows AS bf
        WHERE bf.format_key = ac.format
          AND (bf.platform = ac.platform OR bf.platform IS NULL)
        ORDER BY (bf.platform IS NOT NULL) DESC
        LIMIT 1) AS template_winner_name,
      (SELECT bf.eligible_alternate_count
         FROM by_format_rows AS bf
        WHERE bf.format_key = ac.format
          AND (bf.platform = ac.platform OR bf.platform IS NULL)
        ORDER BY (bf.platform IS NOT NULL) DESC
        LIMIT 1) AS eligible_template_count
    FROM all_cells AS ac
    LEFT JOIN profile_rows AS pr ON pr.platform = ac.platform
    LEFT JOIN schedule_platform_rows AS spr ON spr.platform = ac.platform
  ),
  cells_with_template AS (
    SELECT
      cc.*,
      COALESCE(
        NULLIF(cc.cap #>> '{evidence,selected,template_id}', ''),
        NULLIF(cc.cap #>> '{evidence,template_id}', '')
      )::uuid AS resolved_template_id,
      (cc.profile_paused_until IS NOT NULL AND cc.profile_paused_until > now()) AS is_currently_paused
    FROM cells_computed AS cc
  ),
  cells_with_slots AS (
    SELECT
      ct.*,
      tf.has_video_bg,
      tf.has_image_bg,
      tf.has_logo,
      CASE
        WHEN tf.has_video_bg THEN 'broll_background'
        WHEN tf.has_image_bg THEN 'background'
        ELSE NULL
      END AS required_usage_key
    FROM cells_with_template AS ct
    LEFT JOIN LATERAL (
      SELECT
        bool_or(f.field_kind = 'background' AND f.element_type = 'video')                          AS has_video_bg,
        bool_or(f.field_kind = 'background' AND f.element_type IS DISTINCT FROM 'video')            AS has_image_bg,
        bool_or(f.field_kind = 'logo')                                                               AS has_logo
      FROM c.creative_provider_template_field AS f
      WHERE f.template_id = ct.resolved_template_id
        AND f.dynamic = true
        AND f.field_kind IN ('background', 'logo', 'image')
    ) AS tf ON ct.resolved_template_id IS NOT NULL
  ),
  cells_with_pool AS (
    SELECT
      cs.*,
      CASE WHEN cs.required_usage_key IS NULL THEN NULL ELSE
        (SELECT count(*)
           FROM c.client_brand_asset AS a
          WHERE a.client_id = v_client_id
            AND a.asset_meta ->> 'usage' = cs.required_usage_key
            AND a.is_active = true
            AND (a.asset_meta ->> 'approved') = 'true')
      END AS declared_asset_pool_count,
      CASE WHEN cs.required_usage_key IS NULL THEN NULL ELSE
        (SELECT count(*)
           FROM c.client_brand_asset AS a
          WHERE a.client_id = v_client_id
            AND a.asset_meta ->> 'usage' = cs.required_usage_key
            AND a.is_active = true
            AND (a.asset_meta ->> 'approved') = 'true'
            AND a.asset_meta ->> 'bucket' = 'brand-assets'
            AND (a.asset_meta ->> 'license_type' IS NOT NULL OR a.asset_meta ->> 'license' IS NOT NULL)
            AND (
                  a.asset_meta ->> 'license_expires_at' IS NULL
               OR (a.asset_meta ->> 'license_expires_at')::timestamptz > now()
                )
            AND (
                  cs.required_usage_key = 'logo'
               OR a.asset_meta ->> 'safe_for_text_overlay' IN ('true', 'needs_scrim')
                ))
      END AS resolver_reachable_asset_count,
      CASE
        WHEN cs.required_usage_key = 'broll_background' THEN 4
        WHEN cs.required_usage_key IS NOT NULL THEN 1
        ELSE NULL
      END AS minimum_required_pool
    FROM cells_with_slots AS cs
  ),
  final_rows AS (
    SELECT
      cp.*,
      cp.cap->>'status'      AS capability_status,
      cp.cap->>'reason_code' AS capability_reason,
      COALESCE(cp.next_slot_occurrence, cp.next_projected_occurrence) AS next_scheduled_occurrence,
      CASE
        WHEN cp.next_slot_occurrence IS NOT NULL THEN 'materialised_slot'
        WHEN cp.next_projected_occurrence IS NOT NULL THEN 'projected_schedule'
        ELSE 'none'
      END AS next_occurrence_source,
      (cp.has_profile_row AND cp.has_schedule_row) AS publisher_readiness,
      CASE
        WHEN cp.has_profile_row AND cp.has_schedule_row THEN 'both_present'
        WHEN cp.has_profile_row AND NOT cp.has_schedule_row THEN 'schedule_missing'
        WHEN NOT cp.has_profile_row AND cp.has_schedule_row THEN 'profile_missing'
        ELSE 'both_missing'
      END AS publisher_readiness_reason
    FROM cells_with_pool AS cp
  ),
  routed_rows AS (
    SELECT
      fr.*,
      CASE
        WHEN fr.capability_status = 'publisher_path_missing' THEN 'publisher_onboarding'
        WHEN fr.is_currently_paused THEN 'capability_enforcement'
        WHEN fr.capability_status = 'template_missing' THEN 'creatomate_global'
        WHEN fr.capability_status = 'pipeline_missing' THEN 'worker_lane'
        WHEN fr.capability_status = 'governance_unproven' THEN 'graduation_governance'
        WHEN fr.capability_status = 'unsupported_silent_degrade' THEN 'capability_template_remediation'
        WHEN fr.capability_status = 'asset_shortage' THEN 'asset_gap'
        WHEN fr.capability_status = 'ready' AND NOT fr.scheduled_demand THEN 'dashboard_onboarding'
        WHEN fr.capability_status = 'ready' AND fr.scheduled_demand AND NOT fr.runtime_reachable THEN 'capability_template_remediation'
        WHEN fr.capability_status = 'unknown' THEN NULL
        ELSE NULL
      END AS responsible_lane,
      CASE
        WHEN fr.capability_status = 'publisher_path_missing' THEN 'Create publisher profile + schedule row (publisher onboarding)'
        WHEN fr.is_currently_paused THEN 'Awaiting PK-directed platform release (capability enforcement containment hold)'
        WHEN fr.capability_status = 'template_missing' THEN 'Register/build a selectable template for this format (Creatomate Global)'
        WHEN fr.capability_status = 'pipeline_missing' THEN 'Engineering fix — structural resolver gap (e.g. missing required logo slot)'
        WHEN fr.capability_status = 'governance_unproven' THEN 'Complete governance/proof step on the candidate template'
        WHEN fr.capability_status = 'unsupported_silent_degrade' THEN 'Apply capability enforcement (R3) — live publishing on an ungoverned path with no currently selectable template'
        WHEN fr.capability_status = 'asset_shortage' THEN 'Source/approve additional governed assets for the required slot (Asset Gap)'
        WHEN fr.capability_status = 'ready' AND NOT fr.scheduled_demand THEN 'Configure client_format_config / schedule row to activate this cell (dashboard onboarding)'
        WHEN fr.capability_status = 'ready' AND fr.scheduled_demand AND NOT fr.runtime_reachable THEN 'Reconcile platform_support/client_format_config — classifier says ready but this format is not runtime-reachable on this platform'
        WHEN fr.capability_status = 'unknown' THEN 'Investigate — classifier returned an ungrounded status (reason_code: ' || COALESCE(fr.capability_reason, 'none') || ')'
        WHEN fr.capability_status = 'ready' AND fr.scheduled_demand AND fr.runtime_reachable THEN 'None — cell is production ready'
        ELSE 'Investigate — unclassified cell state'
      END AS next_required_outcome,
      CASE
        WHEN fr.capability_status = 'ready' THEN NULL
        WHEN fr.capability_status = 'publisher_path_missing' THEN 'No c.client_publish_profile row exists for this platform'
        WHEN fr.capability_status = 'template_missing' THEN 'No selectable template registered for this format/platform (reason_code: ' || COALESCE(fr.capability_reason, 'unknown') || ')'
        WHEN fr.capability_status = 'governance_unproven' THEN 'Governance/proof gate unmet on candidate template (reason_code: ' || COALESCE(fr.capability_reason, 'unknown') || ')'
        WHEN fr.capability_status = 'pipeline_missing' THEN 'Structural resolver gap (reason_code: ' || COALESCE(fr.capability_reason, 'unknown') || ')'
        WHEN fr.capability_status = 'asset_shortage' THEN 'Insufficient declared/resolver-reachable assets for the required slot (reason_code: ' || COALESCE(fr.capability_reason, 'unknown') || ')'
        WHEN fr.capability_status = 'unsupported_silent_degrade' THEN 'Live publishing on an ungoverned/legacy path — no currently selectable template, enforcement not yet applied (blocker: ' || COALESCE(fr.capability_reason, 'unknown') || ')'
        WHEN fr.capability_status = 'unknown' THEN 'Classifier could not ground a status — reason_code: ' || COALESCE(fr.capability_reason, 'ungrounded')
        ELSE NULL
      END AS missing_proof_or_gate,
      CASE
        WHEN fr.capability_status = 'publisher_path_missing' THEN 'not_configured'
        WHEN fr.is_probe_cell THEN 'not_configured'
        WHEN fr.is_currently_paused THEN 'blocked'
        WHEN fr.capability_status IN ('template_missing','pipeline_missing','unsupported_silent_degrade','asset_shortage','unknown') THEN 'blocked'
        WHEN fr.capability_status = 'governance_unproven' THEN 'waiting_for_proof'
        WHEN fr.capability_status = 'ready' AND NOT fr.runtime_reachable THEN 'blocked'
        WHEN fr.capability_status = 'ready' AND fr.runtime_reachable THEN 'ready'
        ELSE 'blocked'
      END AS overall_state
    FROM final_rows AS fr
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'platform',                     r.platform,
        'format',                       r.format,
        'is_probe_cell',                r.is_probe_cell,
        'scheduled_demand',             r.scheduled_demand,
        'next_scheduled_occurrence',    r.next_scheduled_occurrence,
        'next_occurrence_source',       r.next_occurrence_source,
        'platform_pause_state', jsonb_build_object(
          'has_profile_row', r.has_profile_row,
          'state',           CASE
                                WHEN NOT r.has_profile_row THEN 'no_profile_row'
                                WHEN r.is_currently_paused THEN 'paused'
                                ELSE 'active'
                              END,
          'publish_enabled', r.profile_publish_enabled,
          'paused_until',    r.profile_paused_until,
          'paused_reason',   r.profile_paused_reason,
          'paused_at',       r.profile_paused_at
        ),
        'publisher_readiness',          r.publisher_readiness,
        'publisher_readiness_reason',   r.publisher_readiness_reason,
        'capability_status',            r.capability_status,
        'capability_reason',            r.capability_reason,
        'capability_routed_lane_raw',   r.cap->>'routed_lane',
        'runtime_reachable',            r.runtime_reachable,
        'template_winner', jsonb_build_object(
          'provider_template_id', r.template_winner_id,
          'name',                 r.template_winner_name
        ),
        'eligible_template_count',      r.eligible_template_count,
        'required_asset_slots',         CASE WHEN r.required_usage_key IS NULL THEN NULL
                                              ELSE jsonb_build_array(r.required_usage_key)
                                                     || CASE WHEN r.has_logo AND r.required_usage_key <> 'logo'
                                                             THEN jsonb_build_array('logo (secondary, not counted below — see missing_proof_or_gate)')
                                                             ELSE '[]'::jsonb END
                                         END,
        'declared_asset_pool_count',    r.declared_asset_pool_count,
        'resolver_reachable_asset_count', r.resolver_reachable_asset_count,
        'minimum_required_pool',        r.minimum_required_pool,
        'missing_proof_or_gate',        r.missing_proof_or_gate,
        'responsible_lane',             r.responsible_lane,
        'next_required_outcome',        r.next_required_outcome,
        'overall_state',                r.overall_state
      )
      ORDER BY r.platform, r.format
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM routed_rows AS r;

  RETURN v_result;
END;
$function$;

COMMENT ON FUNCTION public.get_client_production_readiness_queue(text) IS
  'READ-ONLY: Client Production Readiness Queue. One jsonb array element per relevant '
  '(platform, format) cell for a client (4 named platforms: facebook/instagram/linkedin/youtube). '
  'Pure composition of classify_format_capability, get_creative_template_portfolio_summary, '
  'platform_support x client_format_config (runtime_reachable — an independently-computed, '
  'orthogonal signal, NOT a reuse of a predicate proven live-enforced elsewhere; '
  'capability_status remains the actual proven production-fill gate), '
  'client_publish_profile/schedule, m.slot, and client_brand_asset declared-vs-resolver-reachable '
  'counts. No decision logic is reimplemented — every capability verdict is the classifier''s own '
  'untouched return value. overall_state is a coarse triage column that always renders ALONGSIDE, '
  'never in place of, the full per-field detail. Unknown/blank p_client_slug RAISES. Service-role '
  'only. Ships dark (no dashboard consumer wired in this migration). '
  'Brief: cc-0088-client-production-readiness-queue-brief-v1.md. Added by '
  '20260730120000_client_production_readiness_queue_rpc_v1.sql.';

REVOKE ALL ON FUNCTION public.get_client_production_readiness_queue(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_client_production_readiness_queue(text) FROM service_role;
GRANT EXECUTE ON FUNCTION public.get_client_production_readiness_queue(text) TO service_role;
ALTER FUNCTION public.get_client_production_readiness_queue(text) OWNER TO postgres;

COMMIT;
