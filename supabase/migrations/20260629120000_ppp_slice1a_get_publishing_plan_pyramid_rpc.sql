-- 20260629120000_ppp_slice1a_get_publishing_plan_pyramid_rpc.sql
-- =====================================================================
-- Publishing Plan Pyramid — Slice 1A read-only DATA CONTRACT.
-- Creates a single read-only RPC that assembles the client-specific
-- platform × format matrix payload the future read-only Pyramid UI (Slice 1B)
-- will consume. NO UI, NO writes, NO editable controls, NO variant model.
--
-- WHY AN RPC (not a server action / view):
--   Schema t.* has NO usage for anon/authenticated/service_role, and schema m.*
--   is service-role-only — so neither a browser nor a service-role REST/server
--   action can read t.format_*/t.platform_format_mix_default or m.format_mix_enrolled
--   directly (PGRST106-class). A SECURITY DEFINER function owned by postgres can
--   read c.*, t.* and m.* and return a sanitized jsonb payload. This is the
--   cleanest, least-privilege read path. (See docs/briefs/publishing-plan-pyramid-inventory-brief.md §14.)
--
-- SECURITY POSTURE:
--   * LANGUAGE sql, STABLE (read-only; no DML), SECURITY DEFINER, owner postgres.
--   * search_path pinned ('public, pg_temp'); all table refs are schema-qualified
--     (c.*, t.*, m.*) so resolution is independent of search_path. No dynamic SQL.
--   * EXECUTE revoked from PUBLIC, anon, authenticated; granted ONLY to service_role
--     (the dashboard's server-side service-role client). Browser/anon cannot call it.
--   * Returns NO secrets — page_access_token / credential_env_key / destination_id /
--     raw client.profile are never selected. Only enablement/eligibility/policy/mix
--     facts + safe schedule/cadence summary are returned.
--
-- READ-ONLY EVIDENCE CONTRACT (Slice 1A):
--   * client_summary: client_id/slug/name + format_mix control/enrollment mode +
--     editable_status='disabled' + variant_mix_status='not_modelled'.
--   * schedule_summary: per-platform publish enablement, cadence, slot counts.
--   * format_matrix: per platform × format cell with eligibility_state
--     (active/available/off/blocked), effective_mix_pct, mix_source, default/override
--     share, max_per_week (+ max_per_week_enforced=false, since it is NOT enforced
--     anywhere yet), synthesis/quality/fitness policy presence, render/publisher path,
--     enrollment_status, evidence_maturity, blocked_reasons[], operator_actions[],
--     and a detail_payload jsonb for the future side drawer.
--   * variant_placeholder: variant_mix_status='not_modelled' + missing_model_pieces[].
--
-- NOTE (honest finding surfaced by the contract, not a bug): some
--   t.platform_format_mix_default rows exist for (platform, format) pairs that
--   t."5.3_content_format".platform_support marks false. The contract reports those
--   cells as blocked:platform_unsupported (support is the source of truth for
--   eligibility) while still showing the default share in detail — this reveals a
--   real defaults-vs-support inconsistency in t.* for later cleanup; it is NOT
--   introduced here.
--
-- STATUS: NOT YET APPLIED. PK-gated apply later. Validated read-only against live
--   production data (PP + non-PP CFW) via docs/briefs/ppp-slice1a-data-contract-validation.md.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_publishing_plan_pyramid(p_client_id uuid)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public, pg_temp'
AS $$
  WITH platforms AS (
    SELECT DISTINCT platform FROM t.platform_format_mix_default WHERE is_current
  ),
  fmt AS (
    SELECT ice_format_key, format_name, platform_support, render_engine, requires_build
      FROM t."5.3_content_format"
     WHERE is_active AND ice_format_key IS NOT NULL
  ),
  cells AS (
    SELECT p.platform, f.ice_format_key, f.format_name, f.platform_support, f.render_engine, f.requires_build
      FROM platforms p CROSS JOIN fmt f
     WHERE (f.platform_support->>p.platform) = 'true'
        OR EXISTS (SELECT 1 FROM t.platform_format_mix_default d
                    WHERE d.is_current AND d.platform=p.platform AND d.ice_format_key=f.ice_format_key)
        OR EXISTS (SELECT 1 FROM c.client_format_config cf
                    WHERE cf.client_id=p_client_id AND cf.ice_format_key=f.ice_format_key
                      AND (cf.platform=p.platform OR cf.platform IS NULL))
  ),
  enriched AS (
    SELECT c.platform, c.ice_format_key, c.format_name, c.render_engine, c.requires_build,
      (c.platform_support->>c.platform) AS platform_support_raw,
      COALESCE(
        (SELECT cf.is_enabled FROM c.client_format_config cf
          WHERE cf.client_id=p_client_id AND cf.ice_format_key=c.ice_format_key AND cf.platform=c.platform LIMIT 1),
        (SELECT cf.is_enabled FROM c.client_format_config cf
          WHERE cf.client_id=p_client_id AND cf.ice_format_key=c.ice_format_key AND cf.platform IS NULL LIMIT 1)
      ) AS client_format_enabled,
      (SELECT cf.max_per_week FROM c.client_format_config cf
        WHERE cf.client_id=p_client_id AND cf.ice_format_key=c.ice_format_key
          AND (cf.platform=c.platform OR cf.platform IS NULL)
        ORDER BY (cf.platform=c.platform) DESC NULLS LAST LIMIT 1) AS max_per_week,
      (SELECT d.default_share_pct FROM t.platform_format_mix_default d
        WHERE d.is_current AND d.platform=c.platform AND d.ice_format_key=c.ice_format_key LIMIT 1) AS default_share_pct,
      (SELECT o.override_share_pct FROM c.client_format_mix_override o
        WHERE o.client_id=p_client_id AND o.is_current AND o.ice_format_key=c.ice_format_key
          AND (o.platform=c.platform OR o.platform IS NULL)
        ORDER BY (o.platform=c.platform) DESC NULLS LAST LIMIT 1) AS override_share_pct,
      EXISTS(SELECT 1 FROM t.format_synthesis_policy sp WHERE sp.is_current AND sp.ice_format_key=c.ice_format_key) AS synthesis_policy_present,
      EXISTS(SELECT 1 FROM t.format_quality_policy qp WHERE qp.is_current AND qp.ice_format_key=c.ice_format_key) AS quality_policy_present,
      EXISTS(SELECT 1 FROM t.class_format_fitness ff WHERE ff.is_current AND ff.ice_format_key=c.ice_format_key) AS fitness_present,
      (SELECT pp.publish_enabled FROM c.client_publish_profile pp WHERE pp.client_id=p_client_id AND pp.platform=c.platform LIMIT 1) AS publish_enabled,
      (SELECT pp.status FROM c.client_publish_profile pp WHERE pp.client_id=p_client_id AND pp.platform=c.platform LIMIT 1) AS profile_status
    FROM cells c
  ),
  rows1 AS (
    SELECT e.*,
      COALESCE(e.override_share_pct, e.default_share_pct) AS effective_mix_pct,
      CASE WHEN e.override_share_pct IS NOT NULL THEN 'client_override'
           WHEN e.default_share_pct IS NOT NULL THEN 'platform_default'
           ELSE 'none' END AS mix_source,
      m.format_mix_enrolled(p_client_id) AS enrolled,
      array_remove(ARRAY[
        CASE WHEN e.platform_support_raw IS DISTINCT FROM 'true' THEN 'platform_unsupported' END,
        CASE WHEN NOT e.synthesis_policy_present THEN 'format_policy_missing:synthesis' END,
        CASE WHEN NOT e.quality_policy_present THEN 'format_policy_missing:quality' END,
        CASE WHEN e.publish_enabled IS NOT TRUE THEN 'publisher_path_unavailable' END,
        CASE WHEN (e.requires_build IS TRUE AND (e.render_engine IS NULL OR e.render_engine='none')) THEN 'render_path_missing' END
      ], NULL) AS blocked_reasons
    FROM enriched e
  ),
  rows2 AS (
    SELECT r.*,
      CASE
        WHEN array_length(r.blocked_reasons,1) > 0 THEN 'blocked'
        WHEN r.client_format_enabled IS NOT TRUE THEN 'off'
        WHEN r.enrolled AND COALESCE(r.effective_mix_pct,0) > 0 THEN 'active'
        ELSE 'available'
      END AS eligibility_state,
      CASE
        WHEN array_length(r.blocked_reasons,1) > 0 THEN 'Blocked'
        WHEN r.client_format_enabled IS NOT TRUE THEN 'Supported in theory only'
        WHEN r.enrolled THEN 'Configured and enforced'
        ELSE 'Configured but not smoke-proven'
      END AS evidence_maturity
    FROM rows1 r
  ),
  matrix AS (
    SELECT jsonb_agg(jsonb_build_object(
      'platform', r.platform,
      'ice_format_key', r.ice_format_key,
      'display_label', r.format_name,
      'platform_support', CASE WHEN r.platform_support_raw='true' THEN 'supported'
                               WHEN r.platform_support_raw='false' THEN 'unsupported'
                               ELSE 'unknown' END,
      'client_format_enabled', COALESCE(r.client_format_enabled,false),
      'effective_mix_pct', r.effective_mix_pct,
      'mix_source', r.mix_source,
      'default_share_pct', r.default_share_pct,
      'override_share_pct', r.override_share_pct,
      'max_per_week', r.max_per_week,
      'max_per_week_enforced', false,
      'synthesis_policy_present', r.synthesis_policy_present,
      'quality_policy_present', r.quality_policy_present,
      'fitness_present', r.fitness_present,
      'render_path_status', COALESCE(r.render_engine,'none'),
      'publisher_path_status', CASE WHEN r.publish_enabled IS TRUE THEN 'enabled'
                                    WHEN r.publish_enabled IS FALSE THEN 'disabled'
                                    ELSE 'missing' END,
      'smoke_or_proof_status', 'not_evaluated',
      'enrollment_status', CASE WHEN r.enrolled THEN 'enforced' ELSE 'not_enrolled' END,
      'eligibility_state', r.eligibility_state,
      'evidence_maturity', r.evidence_maturity,
      'blocked_reasons', to_jsonb(r.blocked_reasons),
      'operator_actions', to_jsonb(array_remove(ARRAY[
        CASE WHEN 'platform_unsupported' = ANY(r.blocked_reasons) THEN 'No action — format not supported on this platform' END,
        CASE WHEN 'format_policy_missing:synthesis' = ANY(r.blocked_reasons) THEN 'Add a synthesis policy for this format' END,
        CASE WHEN 'format_policy_missing:quality' = ANY(r.blocked_reasons) THEN 'Add a quality policy for this format' END,
        CASE WHEN 'publisher_path_unavailable' = ANY(r.blocked_reasons) THEN 'Enable publishing for this platform' END,
        CASE WHEN 'render_path_missing' = ANY(r.blocked_reasons) THEN 'No render path for this format' END,
        CASE WHEN array_length(r.blocked_reasons,1) IS NULL AND r.client_format_enabled IS NOT TRUE THEN 'Enable this format for the client to activate' END,
        CASE WHEN array_length(r.blocked_reasons,1) IS NULL AND r.client_format_enabled IS TRUE AND NOT r.enrolled THEN 'Enroll client format_mix to enforce allocation' END
      ], NULL)),
      'detail_payload', jsonb_build_object(
        'platform_support_raw', r.platform_support_raw,
        'default_share_pct', r.default_share_pct,
        'override_share_pct', r.override_share_pct,
        'synthesis_policy_present', r.synthesis_policy_present,
        'quality_policy_present', r.quality_policy_present,
        'fitness_present', r.fitness_present,
        'render_engine', r.render_engine,
        'requires_build', r.requires_build,
        'publish_enabled', r.publish_enabled,
        'profile_status', r.profile_status,
        'enrolled', r.enrolled
      )
    ) ORDER BY r.platform, r.ice_format_key) AS arr
    FROM rows2 r
  ),
  schedule AS (
    SELECT jsonb_agg(jsonb_build_object(
      'platform', p.platform,
      'publish_enabled', pp.publish_enabled,
      'profile_status', pp.status,
      'mode', pp.mode,
      'connected', (pp.page_id IS NOT NULL OR p.platform='youtube'),
      'eligible', (pp.publish_enabled IS TRUE AND pp.status='active' AND (pp.paused_until IS NULL OR pp.paused_until < now())),
      'max_per_day', pp.max_per_day,
      'min_gap_minutes', pp.min_gap_minutes,
      'paused_until', pp.paused_until,
      'cadence', (SELECT jsonb_build_object(
                    'posts_per_period', cr.posts_per_period,
                    'period_unit', cr.period_unit,
                    'weekdays', cr.weekdays,
                    'preferred_local_times', cr.preferred_local_times,
                    'expected_format', cr.expected_format,
                    'source','c.client_cadence_rule')
                  FROM c.client_cadence_rule cr
                  WHERE cr.client_id=p_client_id AND cr.platform=p.platform AND cr.is_active
                  ORDER BY cr.valid_from DESC NULLS LAST LIMIT 1),
      'enabled_slot_count', (SELECT count(*) FROM c.client_publish_schedule s
                              WHERE s.client_id=p_client_id AND s.platform=p.platform AND s.enabled),
      'total_slot_count', (SELECT count(*) FROM c.client_publish_schedule s
                            WHERE s.client_id=p_client_id AND s.platform=p.platform)
    ) ORDER BY p.platform) AS arr
    FROM platforms p
    LEFT JOIN c.client_publish_profile pp ON pp.client_id=p_client_id AND pp.platform=p.platform
  )
  SELECT jsonb_build_object(
    'contract_version','ppp_slice1a_v1',
    'generated_at', now(),
    'client_summary', (SELECT jsonb_build_object(
        'client_id', cl.client_id,
        'client_slug', cl.client_slug,
        'client_name', cl.client_name,
        'format_mix_control', jsonb_build_object(
          'enrolled', m.format_mix_enrolled(cl.client_id),
          'mode', COALESCE((SELECT e.rollout_stage FROM c.client_control_tower_enrollment e
                             WHERE e.client_id=cl.client_id AND e.control_type='format_mix' AND e.is_current AND e.status='active' LIMIT 1),'legacy'),
          'approval_status', (SELECT e.approval_status FROM c.client_control_tower_enrollment e
                               WHERE e.client_id=cl.client_id AND e.control_type='format_mix' AND e.is_current AND e.status='active' LIMIT 1),
          'enrollment_row_present', EXISTS(SELECT 1 FROM c.client_control_tower_enrollment e
                                            WHERE e.client_id=cl.client_id AND e.control_type='format_mix' AND e.is_current)
        ),
        'editable_status','disabled',
        'variant_mix_status','not_modelled'
      ) FROM c.client cl WHERE cl.client_id=p_client_id),
    'schedule_summary', COALESCE((SELECT arr FROM schedule),'[]'::jsonb),
    'format_matrix', COALESCE((SELECT arr FROM matrix),'[]'::jsonb),
    'variant_placeholder', jsonb_build_object(
      'variant_mix_status','not_modelled',
      'missing_model_pieces', jsonb_build_array(
        'variant allowlist','variant target %','client/platform/format/variant binding',
        'selector enforcement','template/contract proof','brand asset proof','smoke/proof status')
    )
  );
$$;

-- Least-privilege EXECUTE: service_role only (the dashboard server-side caller).
-- REVOKE FROM PUBLIC alone is insufficient on Supabase — revoke anon/authenticated explicitly.
REVOKE EXECUTE ON FUNCTION public.get_publishing_plan_pyramid(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_publishing_plan_pyramid(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_publishing_plan_pyramid(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_publishing_plan_pyramid(uuid) TO service_role;
