-- ============================================================================
-- public.get_studio_capabilities — Content Studio platform×format capability resolver
-- ============================================================================
-- Brief: docs/briefs/content-studio-capability-alignment.md. The shared, evidence-
-- driven capability source for BOTH Single Post and Content Series, replacing the
-- hardcoded platform/format arrays in the dashboard. Read-only (STABLE, SELECT-only),
-- SECURITY DEFINER, service-role only — same posture as list_active_clients /
-- get_creative_intent_detail. No write path, no pipeline object touched.
--
-- Computes, for ONE client, per ELIGIBLE platform (c.client_publish_profile) × each
-- active taxonomy format (t."5.3_content_format"):
--   buildable      = is_buildable
--   supported      = platform_support[platform] = true   (TAXONOMY is the gate of record)
--   proven         = published rows exist in the last 90d (m.post_publish, global)
--   state          = enabled | enabled_unproven | disabled | hidden
--   reason         = plain-language why (for disabled/hidden)
--
-- State rules (brief §3 + §8):
--   not buildable                              -> hidden  ("not buildable yet")
--   buildable + supported + proven             -> enabled
--   buildable + supported + not proven         -> enabled_unproven (first-of-its-kind)
--   buildable + not supported, video-only plat -> hidden  ("{platform} is video-only")
--   buildable + not supported, text (render none) -> hidden ("no text-only surface on {platform}")
--   buildable + not supported, otherwise       -> disabled ("not supported on {platform}")
--
-- NOTE (LinkedIn video, escalated to PK): video_short_kinetic_voice / _stat_voice have
-- platform_support.linkedin = false in the taxonomy yet have published LI rows. Per
-- brief §6/§10 (surface only what platform_support permits; do not expand engine
-- capability / do not override taxonomy), this resolver treats them as
-- disabled-with-reason on LinkedIn (proven_count is still reported for visibility).
-- Enabling them is a taxonomy data change (platform_support.linkedin=true), out of
-- scope here and gated separately.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_studio_capabilities(p_client_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'c', 't', 'm', 'public'
AS $$
  WITH elig AS (
    SELECT DISTINCT cpp.platform
    FROM c.client_publish_profile cpp
    WHERE cpp.client_id = p_client_id
      AND cpp.publish_enabled = true
      AND cpp.status = 'active'
  ),
  fmt AS (
    SELECT cf.ice_format_key AS format,
           cf.is_buildable    AS buildable,
           cf.requires_build,
           cf.render_engine,
           cf.platform_support,
           left(COALESCE(cf.advisor_description, ''), 160) AS advisor_description
    FROM t."5.3_content_format" cf
    WHERE cf.is_active = true AND cf.ice_format_key IS NOT NULL
  ),
  proven AS (
    SELECT pp.platform, pd.recommended_format AS format, count(*) AS n
    FROM m.post_publish pp
    JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
    WHERE pp.status = 'published'
      AND pp.published_at > now() - interval '90 days'
      AND pd.recommended_format IS NOT NULL
    GROUP BY pp.platform, pd.recommended_format
  ),
  pf AS (
    SELECT e.platform, f.format, f.buildable, f.requires_build, f.render_engine,
           f.advisor_description,
           COALESCE((f.platform_support ->> e.platform)::boolean, false) AS supported,
           COALESCE(pr.n, 0) AS proven_count
    FROM elig e
    CROSS JOIN fmt f
    LEFT JOIN proven pr ON pr.platform = e.platform AND pr.format = f.format
  ),
  pv AS (
    SELECT platform, NOT bool_or(supported AND format NOT LIKE 'video%') AS video_only
    FROM pf GROUP BY platform
  ),
  st AS (
    SELECT pf.*, pv.video_only,
      CASE
        WHEN NOT pf.buildable THEN 'hidden'
        WHEN pf.supported AND pf.proven_count > 0 THEN 'enabled'
        WHEN pf.supported THEN 'enabled_unproven'
        WHEN pv.video_only THEN 'hidden'
        WHEN pf.render_engine = 'none' THEN 'hidden'
        ELSE 'disabled'
      END AS state,
      CASE
        WHEN NOT pf.buildable THEN 'not buildable yet'
        WHEN pf.supported THEN NULL
        WHEN pv.video_only THEN pf.platform || ' is video-only'
        WHEN pf.render_engine = 'none' THEN 'no text-only surface on ' || pf.platform
        ELSE 'not supported on ' || pf.platform
      END AS reason
    FROM pf JOIN pv ON pv.platform = pf.platform
  )
  SELECT jsonb_build_object(
    'ok', true,
    'client_id', p_client_id,
    'platforms', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'platform', g.platform,
          'eligible', true,
          'video_only', g.video_only,
          'formats', g.formats
        ) ORDER BY g.platform)
      FROM (
        SELECT platform,
               bool_or(video_only) AS video_only,
               jsonb_agg(
                 jsonb_build_object(
                   'format', format,
                   'buildable', buildable,
                   'supported', supported,
                   'proven', proven_count > 0,
                   'proven_count', proven_count,
                   'requires_build', requires_build,
                   'render_engine', render_engine,
                   'advisor_description', advisor_description,
                   'state', state,
                   'reason', reason
                 ) ORDER BY format) AS formats
        FROM st
        GROUP BY platform
      ) g
    ), '[]'::jsonb)
  );
$$;

COMMENT ON FUNCTION public.get_studio_capabilities(uuid) IS
  'Content Studio capability resolver (read-only): per eligible platform × active taxonomy format -> {buildable, supported(=platform_support), proven(90d), proven_count, render_engine, state(enabled/enabled_unproven/disabled/hidden), reason}. Taxonomy is the gate of record; proven is informational. Service-role only. No write, no pipeline object.';

REVOKE EXECUTE ON FUNCTION public.get_studio_capabilities(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_studio_capabilities(uuid) TO service_role;
