-- 20260630000000_gfcp_slice1a_get_global_format_capability_pyramid_rpc.sql
-- =====================================================================
-- Global Format Capability Pyramid — Slice 1A read-only DATA CONTRACT.
-- Creates a single CLIENT-AGNOSTIC read-only RPC that assembles the global
-- (platform × format) capability matrix the future Create -> Format Capability
-- UI (Slice 1B) will consume. NO UI, NO writes, NO editable controls, NO variant
-- model, NO canonical model.
--
-- LOAD-BEARING FRAMING (PK, v4.17): v0 is an EVIDENCE-AND-RECONCILIATION VIEW,
--   NOT the final canonical source of truth. Where the scattered sources disagree
--   the disagreement is SURFACED as diagnostics (Layer G) and NEVER resolved by
--   mutation. The normalized source of truth is the separate, later, PK-gated
--   "Canonical Capability Model v1" carry.
--
-- WHY AN RPC (not a server action / view) — D2:
--   Schema t.* has NO usage for anon/authenticated/service_role, and schema m.*
--   is service-role-only — so neither a browser nor a service-role REST/server
--   action can read t.*/m.* directly (PGRST106-class). A SECURITY DEFINER function
--   owned by postgres can read t.*/m.* and return a sanitized jsonb payload.
--   (See docs/briefs/global-format-capability-pyramid-slice1a-backend-brief.md §3.)
--
-- SECURITY POSTURE (mirrors proven PPP Slice 1A exactly):
--   * LANGUAGE sql, STABLE (read-only; no DML), SECURITY DEFINER, owner postgres.
--   * search_path pinned ('public, pg_temp'); all table refs are schema-qualified
--     (t.*, m.*, public.*) so resolution is independent of search_path. No dynamic SQL.
--   * EXECUTE revoked from PUBLIC, anon, authenticated; granted ONLY to service_role
--     (the dashboard's server-side service-role client). Browser/anon cannot call it.
--   * Returns NO secrets — page_access_token / credential_env_key / destination_id /
--     raw client.profile / raw render_spec are never selected. Only whitelisted
--     capability/evidence facts are returned.
--
-- LAYERED EVIDENCE MODEL (D1) — each (platform × format) cell derives one
--   global_support_state from independently-sourced layers:
--     A declared support   t."5.3_content_format".platform_support
--     B configured default t.platform_format_mix_default (is_current)
--     C governed readiness t.format_synthesis_policy / format_quality_policy / class_format_fitness (is_current)
--     D render proof       m.post_render_log (status='succeeded') JOIN m.post_draft (platform)
--     E publish proof      m.post_publish (status='published') JOIN m.post_draft (recommended_format)
--     F creative proof     m.post_render_log.render_spec->>'variant_key' (production-evidence-only, D4)
--     G diagnostics        derived conflicts between A-F (surfaced, never resolved)
--
-- PUBLISHER PATH (D3): publisher_path_status is honest evidence/inference —
--   publisher_proven ONLY from real m.post_publish evidence; else publisher_unsupported
--   (declared-unsupported) or publisher_unknown. NO publisher_inferred is asserted in v0
--   unless a named auditable coverage list is approved (PK Decision 2, v4.18). Publisher
--   certainty is never invented.
--
-- NON-BUILD PRODUCTION PROOF (PK Decision 1, v4.18): for requires_build=false formats
--   (e.g. text) no render proof is required, so a declared-supported, publish-proven
--   non-build format resolves to proven_in_production on publish evidence alone. Build
--   formats (requires_build=true) still require render+publish per the layered model.
--
-- CREATIVE / VARIANT (D4): production-render-evidence-only (render_spec.variant_key);
--   docs/creative-library/* JSON is NEVER read at runtime; variant_model_status stays
--   'not_modelled'; variant_capability[] is a placeholder unless p_include_variants=true,
--   in which case it carries production render evidence only (still evidence, never an allowlist).
--
-- STATUS: APPLIED / PROVEN (2026-06-29, register v4.19). Live in production
--   (project mbkmaxqhsohbtwsqolns). reviewed_input_hash
--   e10ad5a89097bbd431be150a4f60c9c206598ee151994646d60b4318428a77be.
--   Reviews: db-rls-auditor PASS, security-auditor GREEN/CLEAN, external review
--   agree/proceed (review_id 267a5ae7-eb12-4555-81ea-760c10c82631).
--   APPLY PATH: applied via execute_sql FALLBACK under explicit PK authorization
--   because apply_migration was harness-denied before mutation (same proven pattern
--   as PPP Slice 1A / Control Tower P1). The supabase_migrations ledger was then
--   BACKFILLED: version 20260630000000 / name
--   gfcp_slice1a_get_global_format_capability_pyramid_rpc recorded exactly once.
--   Live proof: 4 platforms / 13 formats / 52 cells; maturity Proven-in-production 14 /
--   Conflict 13 / Supported-in-theory 10 / Blocked 8 / Policy-only 5 /
--   Configured-and-enforceable 1 / Smoke-proven 1; publisher proven 21 / unknown 17 /
--   unsupported 14 (no publisher_inferred); website channel_outside_model diagnostic only;
--   no-secret scan PASS; no raw render_spec dump; advisor no new finding.
--   This file is the SQL-of-record for the applied function; the body below was applied
--   BYTE-FOR-BYTE (only this STATUS comment block changed post-apply).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_global_format_capability_pyramid(
  p_platform         text    DEFAULT NULL,
  p_ice_format_key   text    DEFAULT NULL,
  p_include_variants boolean DEFAULT false
)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public, pg_temp'
AS $$
  WITH platforms AS (
    SELECT DISTINCT platform FROM t.platform_format_mix_default
     WHERE is_current AND (p_platform IS NULL OR platform = p_platform)
  ),
  fmt AS (
    SELECT ice_format_key, format_name, platform_support, render_engine, requires_build
      FROM t."5.3_content_format"
     WHERE is_active AND ice_format_key IS NOT NULL
       AND (p_ice_format_key IS NULL OR ice_format_key = p_ice_format_key)
  ),
  cells AS (
    SELECT p.platform, f.ice_format_key, f.format_name, f.platform_support,
           f.render_engine AS render_engine_decl, f.requires_build
      FROM platforms p CROSS JOIN fmt f
  ),
  ev_render AS (
    SELECT pd.platform, rl.ice_format_key,
           count(*) AS render_succ,
           max(rl.render_engine) AS render_engine_obs,
           bool_or(rl.render_spec ? 'variant_key') AS has_variant,
           max(rl.render_spec->>'variant_key') AS variant_key_sample
      FROM m.post_render_log rl
      JOIN m.post_draft pd ON pd.post_draft_id = rl.post_draft_id
     WHERE rl.status='succeeded' AND rl.ice_format_key IS NOT NULL
     GROUP BY pd.platform, rl.ice_format_key
  ),
  ev_publish AS (
    SELECT pp.platform, pd.recommended_format AS ice_format_key, count(*) AS pub_count
      FROM m.post_publish pp
      JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
     WHERE pp.status='published' AND pd.recommended_format IS NOT NULL
     GROUP BY pp.platform, pd.recommended_format
  ),
  enriched AS (
    SELECT c.platform, c.ice_format_key, c.format_name, c.requires_build, c.render_engine_decl,
      (c.platform_support->>c.platform) AS ps_raw,
      (SELECT d.default_share_pct FROM t.platform_format_mix_default d
         WHERE d.is_current AND d.platform=c.platform AND d.ice_format_key=c.ice_format_key LIMIT 1) AS default_share_pct,
      EXISTS(SELECT 1 FROM t.format_synthesis_policy sp WHERE sp.is_current AND sp.ice_format_key=c.ice_format_key) AS synth,
      EXISTS(SELECT 1 FROM t.format_quality_policy qp WHERE qp.is_current AND qp.ice_format_key=c.ice_format_key) AS qual,
      EXISTS(SELECT 1 FROM t.class_format_fitness ff WHERE ff.is_current AND ff.ice_format_key=c.ice_format_key) AS fit,
      COALESCE(er.render_succ,0) AS render_succ, er.render_engine_obs,
      COALESCE(er.has_variant,false) AS has_variant, er.variant_key_sample,
      COALESCE(ep.pub_count,0) AS pub_count
    FROM cells c
    LEFT JOIN ev_render er ON er.platform=c.platform AND er.ice_format_key=c.ice_format_key
    LEFT JOIN ev_publish ep ON ep.platform=c.platform AND ep.ice_format_key=c.ice_format_key
  ),
  derived AS (
    SELECT e.*,
      (e.ps_raw='true') AS support_true,
      (e.render_succ>0) AS render_proof,
      (e.pub_count>0) AS publish_proof,
      (e.default_share_pct IS NOT NULL) AS configured,
      (e.synth AND e.qual) AS gov,
      (e.synth OR e.qual OR e.fit) AS any_policy
    FROM enriched e
  ),
  final_rows AS (
    SELECT d.*,
      CASE
        WHEN NOT d.support_true AND (d.configured OR d.render_proof OR d.publish_proof) THEN 'conflict'
        WHEN NOT d.support_true THEN 'blocked'
        -- PK Decision 1 (v4.18 model correction): non-build formats need no render proof —
        -- a declared-supported, publish-proven non-build format IS production-proven.
        WHEN (NOT d.requires_build) AND d.publish_proof THEN 'proven_in_production'
        WHEN d.render_proof AND d.publish_proof THEN 'proven_in_production'
        WHEN d.render_proof THEN 'smoke_proven'
        WHEN d.configured AND d.gov THEN 'configured_and_enforceable'
        WHEN d.configured AND NOT d.gov THEN 'configured_not_smoke_proven'
        WHEN d.any_policy THEN 'policy_only'
        WHEN (d.configured OR d.publish_proof) AND NOT d.any_policy THEN 'ungoverned'
        ELSE 'supported_in_theory_only'
      END AS global_support_state,
      CASE WHEN d.publish_proof THEN 'publisher_proven'
           WHEN NOT d.support_true THEN 'publisher_unsupported'
           ELSE 'publisher_unknown' END AS publisher_path_status,
      CASE WHEN d.render_proof THEN 'proven'
           WHEN NOT d.requires_build THEN 'none'
           ELSE 'unknown' END AS render_path_status,
      CASE WHEN d.has_variant THEN 'production_evidence' ELSE 'none' END AS creative_library_status,
      array_remove(ARRAY[
        CASE WHEN NOT d.support_true THEN 'global_platform_block' END,
        CASE WHEN NOT (d.synth AND d.qual) THEN 'policy_gap' END,
        CASE WHEN d.requires_build AND NOT d.render_proof THEN 'render_path_gap' END,
        CASE WHEN NOT d.publish_proof THEN 'publisher_path_gap' END,
        'variant_model_gap'
      ], NULL) AS blocked_reasons
    FROM derived d
  ),
  labelled AS (
    SELECT f.*,
      CASE f.global_support_state
        WHEN 'proven_in_production' THEN 'Proven in production'
        WHEN 'smoke_proven' THEN 'Smoke-proven'
        WHEN 'configured_and_enforceable' THEN 'Configured and enforceable'
        WHEN 'configured_not_smoke_proven' THEN 'Configured but not smoke-proven'
        WHEN 'policy_only' THEN 'Policy exists but no render/publish proof'
        WHEN 'supported_in_theory_only' THEN 'Supported in theory only'
        WHEN 'ungoverned' THEN 'Ungoverned'
        WHEN 'conflict' THEN 'Conflict / diagnostic'
        WHEN 'blocked' THEN 'Blocked'
        ELSE 'Not evaluated' END AS evidence_maturity
    FROM final_rows f
  ),
  matrix AS (
    SELECT jsonb_agg(jsonb_build_object(
      'platform', l.platform, 'ice_format_key', l.ice_format_key, 'display_label', l.format_name,
      'global_support_state', l.global_support_state,
      'platform_support', CASE WHEN l.ps_raw='true' THEN 'supported' WHEN l.ps_raw='false' THEN 'unsupported' ELSE 'unknown' END,
      'configured_default_present', l.configured, 'default_mix_pct', l.default_share_pct,
      'synthesis_policy_present', l.synth, 'quality_policy_present', l.qual, 'fitness_policy_present', l.fit,
      'render_path_status', l.render_path_status, 'render_provider', l.render_engine_obs,
      'publisher_path_status', l.publisher_path_status,
      'smoke_or_proof_status', CASE WHEN l.render_proof THEN 'proven' ELSE 'not_evaluated' END,
      'creative_library_status', l.creative_library_status, 'variant_model_status', 'not_modelled',
      'evidence_maturity', l.evidence_maturity,
      'blocked_reasons', to_jsonb(l.blocked_reasons),
      'operator_actions', to_jsonb(array_remove(ARRAY[
        CASE WHEN NOT l.support_true THEN 'Declared-unsupported on this platform — surfaced for reconciliation' END,
        CASE WHEN NOT (l.synth AND l.qual) THEN 'Add synthesis/quality policy for this format' END,
        CASE WHEN l.requires_build AND NOT l.render_proof THEN 'No successful render evidence yet for this pair' END,
        CASE WHEN NOT l.publish_proof THEN 'No publish evidence yet for this pair' END
      ], NULL)),
      'detail_payload', jsonb_build_object(
        'platform_support_raw', l.ps_raw, 'default_share_pct', l.default_share_pct,
        'synthesis_policy_present', l.synth, 'quality_policy_present', l.qual, 'fitness_policy_present', l.fit,
        'render_engine_declared', l.render_engine_decl, 'requires_build', l.requires_build,
        'render_provider_observed', l.render_engine_obs, 'render_success_count', l.render_succ,
        'publish_count', l.pub_count, 'creative_evidence', l.has_variant, 'variant_key_sample', l.variant_key_sample
      )
    ) ORDER BY l.platform, l.ice_format_key) AS arr FROM labelled l
  ),
  diag AS (
    SELECT jsonb_build_array(
      jsonb_build_object('code','default_without_support',
        'count',(SELECT count(*) FROM labelled WHERE configured AND NOT support_true),
        'examples',(SELECT jsonb_agg(platform||':'||ice_format_key) FROM (SELECT platform,ice_format_key FROM labelled WHERE configured AND NOT support_true ORDER BY 1,2 LIMIT 5) s)),
      jsonb_build_object('code','publish_evidence_without_support',
        'count',(SELECT count(*) FROM labelled WHERE publish_proof AND NOT support_true),
        'examples',(SELECT jsonb_agg(platform||':'||ice_format_key) FROM (SELECT platform,ice_format_key FROM labelled WHERE publish_proof AND NOT support_true ORDER BY 1,2 LIMIT 5) s)),
      jsonb_build_object('code','channel_outside_model',
        'count',(SELECT count(DISTINCT platform) FROM m.post_publish WHERE status='published' AND platform NOT IN (SELECT platform FROM t.platform_format_mix_default WHERE is_current)),
        'examples',(SELECT jsonb_agg(DISTINCT platform) FROM m.post_publish WHERE status='published' AND platform NOT IN (SELECT platform FROM t.platform_format_mix_default WHERE is_current))),
      jsonb_build_object('code','render_without_publish',
        'count',(SELECT count(*) FROM labelled WHERE render_proof AND NOT publish_proof),
        'note','render proof (D) does not imply publisher reach (E)')
    ) AS arr
  ),
  evsum AS (
    SELECT jsonb_build_array(
      jsonb_build_object('layer','A_declared_support','cells_true',(SELECT count(*) FROM labelled WHERE support_true)),
      jsonb_build_object('layer','B_configured_default','cells',(SELECT count(*) FROM labelled WHERE configured)),
      jsonb_build_object('layer','C_governed_readiness','cells_synth_and_qual',(SELECT count(*) FROM labelled WHERE gov)),
      jsonb_build_object('layer','D_render_proof','cells',(SELECT count(*) FROM labelled WHERE render_proof)),
      jsonb_build_object('layer','E_publish_proof','cells',(SELECT count(*) FROM labelled WHERE publish_proof)),
      jsonb_build_object('layer','F_creative_evidence','cells',(SELECT count(*) FROM labelled WHERE has_variant))
    ) AS arr
  )
  SELECT jsonb_build_object(
    'contract_version','gfcp.v0',
    'generated_at', now(),
    'global_summary', jsonb_build_object(
      'platform_count',(SELECT count(*) FROM platforms),
      'format_count',(SELECT count(*) FROM fmt),
      'cell_count',(SELECT count(*) FROM labelled),
      'conflict_count',(SELECT count(*) FROM labelled WHERE global_support_state='conflict'),
      'state_counts',(SELECT jsonb_object_agg(global_support_state,c) FROM (SELECT global_support_state,count(*) c FROM labelled GROUP BY 1) s)),
    'platforms', COALESCE((SELECT jsonb_agg(jsonb_build_object('platform',platform,'modelled',true) ORDER BY platform) FROM platforms),'[]'::jsonb)
       || jsonb_build_array(jsonb_build_object('platform','website','modelled',false,'flag','evidence_only')),
    'formats', COALESCE((SELECT jsonb_agg(jsonb_build_object('ice_format_key',ice_format_key,'display_label',format_name) ORDER BY ice_format_key) FROM fmt),'[]'::jsonb),
    'platform_format_matrix', COALESCE((SELECT arr FROM matrix),'[]'::jsonb),
    'variant_capability', CASE WHEN p_include_variants
      THEN COALESCE((SELECT jsonb_agg(DISTINCT jsonb_build_object(
             'variant_key', variant_key_sample, 'variant_model_status','not_modelled',
             'evidence_source','m.post_render_log', 'note','production_evidence_only'))
             FROM labelled WHERE variant_key_sample IS NOT NULL),'[]'::jsonb)
      ELSE jsonb_build_array(jsonb_build_object('variant_model_status','not_modelled','note','placeholder — production-evidence-only when p_include_variants=true')) END,
    'creative_library_links', COALESCE((SELECT jsonb_agg(DISTINCT jsonb_build_object(
        'variant_key',variant_key_sample,'evidence_source','m.post_render_log','note','production_evidence_only'))
        FROM labelled WHERE variant_key_sample IS NOT NULL),'[]'::jsonb),
    'evidence_summary',(SELECT arr FROM evsum),
    'diagnostics',(SELECT arr FROM diag),
    'missing_model_pieces', jsonb_build_array(
      'variant_capability_model_missing','publisher_capability_catalog_missing',
      'render_path_catalog_missing','channel_model_incomplete','canonical_capability_model_absent'),
    'source_metadata', jsonb_build_object(
      'sources', jsonb_build_array('t."5.3_content_format"','t.platform_format_mix_default','t.format_synthesis_policy','t.format_quality_policy','t.class_format_fitness','m.post_render_log','m.post_publish','m.post_draft'),
      'is_current_filters','t.* is_current=true; render status=succeeded; publish status=published',
      'evidence_windows','all-time succeeded renders / all-time published posts (no time window — stated honestly)',
      'filters_applied', jsonb_build_object('p_platform',p_platform,'p_ice_format_key',p_ice_format_key,'p_include_variants',p_include_variants))
  );
$$;

-- Least-privilege EXECUTE: service_role only (the dashboard server-side caller).
-- REVOKE FROM PUBLIC alone is insufficient on Supabase — revoke anon/authenticated explicitly.
REVOKE EXECUTE ON FUNCTION public.get_global_format_capability_pyramid(text, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_global_format_capability_pyramid(text, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_global_format_capability_pyramid(text, text, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_format_capability_pyramid(text, text, boolean) TO service_role;
