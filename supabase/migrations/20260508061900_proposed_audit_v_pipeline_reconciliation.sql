-- ============================================================================
-- PROPOSED MIGRATION — DO NOT APPLY WITHOUT EXPLICIT PK APPROVAL
--
-- Filename intentionally prefixed `proposed_` so this is filtered out of any
-- `supabase db push` flow (chat applies via Supabase MCP `apply_migration`
-- explicitly per D-170; this file is a queued draft awaiting review).
--
-- TRACK A: pipeline reconciliation view
-- Authored: 2026-05-08, in parallel with F-VIDEO-QUALITY-UPGRADE-A-B-C ship
-- Purpose: row-level slot → draft → queue → publish reconciliation. Surfaces
--          mismatches between adjacent pipeline stages with a `rollup_state`
--          column for dashboard tile rendering.
--
-- Why: existing audit/m views (audit.v_publish_queue_summary,
--      audit.v_publish_success_recent, audit.v_slot_health_by_client_platform,
--      m.slots_in_critical_window, m.vw_ops_pipeline_health) are aggregate
--      or single-stage. None walk the full chain at row granularity.
--
-- Mismatch flags exposed:
--   mm_planned_vs_decided          slot.format_chosen ≠ draft.recommended_format
--                                   (informational — design-allowed: advisor
--                                    is permitted to override planner intent)
--   mm_decided_vs_generated         video/image format chosen but render asset
--                                   missing despite approval_status ∈ (approved,
--                                   published, needs_review)
--   mm_generated_vs_published       render succeeded but no successful
--                                   m.post_publish row, AND scheduled_publish_at
--                                   < now() − 2h. Suppressed for non-live
--                                   channels via channel_state.
--   mm_published_vs_platform_claim  m.post_publish.status='published' but
--                                   platform_post_id IS NULL (proxy for
--                                   platform-reality lie; live platform-API
--                                   verification is out of view scope).
--
-- Channel state v0.1 (refinable):
--   live                    publish_enabled = true and not temp-paused
--   temp_paused             paused_until > now()
--   standing_hold_disabled  publish_enabled = false (e.g. NY × IG)
--   unconfigured            no client_publish_profile row for (client, platform)
--   unknown                 fallthrough
--
--   v0.1 limitations: doesn't yet detect global "publisher EF not deployed"
--   (LinkedIn case). A v0.2 iteration should join m.vw_ef_drift_current to
--   surface missing publisher EFs so mm_generated_vs_published is suppressed
--   for client-platform pairs whose publisher hasn't shipped.
--
-- Window: last 30 days history + next 14 days forward.
--
-- Refinement queue (track in docs/00_action_list.md as P3 follow-ups):
--   - F-RECON-CHANNEL-STATE-V0.2: integrate vw_ef_drift_current for
--     publisher-undeployed detection.
--   - F-RECON-PLATFORM-VERIFY: optional column platform_reality_state powered
--     by a periodic platform-API check (out of view scope, separate worker).
-- ============================================================================

CREATE OR REPLACE VIEW audit.v_pipeline_reconciliation AS
SELECT
  -- Slot stage
  s.slot_id,
  cl.client_slug,
  cl.client_id,
  s.platform,
  s.scheduled_publish_at,
  s.fill_window_opens_at,
  s.status                              AS slot_status,
  s.format_chosen                       AS slot_format_planned,
  s.format_preference                   AS slot_format_preference,
  s.filled_at,
  s.skip_reason                         AS slot_skip_reason,

  -- Draft stage
  pd.post_draft_id,
  pd.created_at                         AS draft_created_at,
  pd.recommended_format                 AS draft_format_decided,
  pd.draft_format -> 'ai' ->> 'format_decided' AS draft_format_decided_ai_path,
  pd.approval_status                    AS draft_approval_status,
  pd.video_status                       AS draft_video_status,
  pd.image_status                       AS draft_image_status,
  pd.video_url                          AS draft_video_url,
  pd.image_url                          AS draft_image_url,
  pd.dead_reason                        AS draft_dead_reason,

  -- Queue stage (latest queue row per draft+platform)
  q.queue_id,
  q.status                              AS queue_status,
  q.scheduled_for                       AS queue_scheduled_for,
  q.attempt_count                       AS queue_attempt_count,
  q.last_error                          AS queue_last_error,
  q.dead_reason                         AS queue_dead_reason,

  -- Publish stage (latest successful or failed attempt per draft+platform)
  pp.post_publish_id,
  pp.status                             AS publish_status,
  pp.platform_post_id,
  pp.published_at,
  pp.error                              AS publish_error,

  -- Channel state v0.1
  CASE
    WHEN cpp.client_publish_profile_id IS NULL                              THEN 'unconfigured'
    WHEN cpp.publish_enabled = false                                        THEN 'standing_hold_disabled'
    WHEN cpp.paused_until IS NOT NULL AND cpp.paused_until > now()          THEN 'temp_paused'
    WHEN cpp.publish_enabled = true                                         THEN 'live'
    ELSE 'unknown'
  END                                   AS channel_state,

  -- Mismatch flags
  -- 1. planned ≠ decided (informational — advisor override is design-allowed)
  CASE
    WHEN s.format_chosen IS NOT NULL
     AND pd.recommended_format IS NOT NULL
     AND s.format_chosen <> pd.recommended_format
    THEN true ELSE false
  END                                   AS mm_planned_vs_decided,

  -- 2. decided ≠ generated (advisor picked render format, asset missing)
  CASE
    WHEN pd.recommended_format LIKE 'video_%'
     AND coalesce(pd.video_status, 'null') NOT IN ('generated','published')
     AND pd.approval_status IN ('approved','published','needs_review')
    THEN true
    WHEN pd.recommended_format IN ('image_quote','carousel')
     AND coalesce(pd.image_status, 'null') NOT IN ('generated','published')
     AND pd.approval_status IN ('approved','published','needs_review')
    THEN true
    ELSE false
  END                                   AS mm_decided_vs_generated,

  -- 3. generated ≠ published (render succeeded but publish missing > 2h)
  --    SUPPRESSED for non-live channels (channel_state filter inside CASE).
  CASE
    WHEN (
      (pd.recommended_format LIKE 'video_%' AND pd.video_status IN ('generated','published'))
      OR (pd.recommended_format IN ('image_quote','carousel') AND pd.image_status IN ('generated','published'))
      OR (pd.recommended_format = 'text')
    )
    AND pd.approval_status = 'approved'
    AND pp.status IS DISTINCT FROM 'published'
    AND s.scheduled_publish_at < now() - interval '2 hours'
    AND (
      cpp.client_publish_profile_id IS NULL
      OR (cpp.publish_enabled = true
          AND (cpp.paused_until IS NULL OR cpp.paused_until <= now()))
    )
    THEN true ELSE false
  END                                   AS mm_generated_vs_published,

  -- 4. published claim ≠ platform id present (proxy for platform reality)
  CASE
    WHEN pp.status = 'published' AND pp.platform_post_id IS NULL
    THEN true ELSE false
  END                                   AS mm_published_vs_platform_claim,

  -- Rollup state for dashboard tile
  CASE
    WHEN s.status IN ('skipped','cancelled')                           THEN 'slot_skipped'
    WHEN s.filled_at IS NULL AND s.scheduled_publish_at < now()        THEN 'slot_overdue_unfilled'
    WHEN s.filled_at IS NULL                                           THEN 'slot_future'
    WHEN pd.post_draft_id IS NULL                                      THEN 'draft_missing'
    WHEN pd.approval_status = 'dead'                                   THEN 'draft_dead'
    WHEN pd.recommended_format LIKE 'video_%'
     AND pd.video_status NOT IN ('generated','published')              THEN 'render_pending_or_failed'
    WHEN pd.recommended_format IN ('image_quote','carousel')
     AND pd.image_status NOT IN ('generated','published')              THEN 'render_pending_or_failed'
    WHEN pp.post_publish_id IS NULL
     AND s.scheduled_publish_at < now() - interval '2 hours'
     AND (cpp.publish_enabled = false
          OR (cpp.paused_until IS NOT NULL AND cpp.paused_until > now())) THEN 'publish_held_by_channel_state'
    WHEN pp.post_publish_id IS NULL
     AND s.scheduled_publish_at < now() - interval '2 hours'           THEN 'publish_missing'
    WHEN pp.status = 'failed'                                          THEN 'publish_failed'
    WHEN pp.status = 'published'
     AND pp.platform_post_id IS NOT NULL                               THEN 'platform_claimed_ok'
    WHEN pp.status = 'published'
     AND pp.platform_post_id IS NULL                                   THEN 'platform_claim_no_id'
    ELSE 'in_flight'
  END                                   AS rollup_state

FROM m.slot s
JOIN c.client cl ON cl.client_id = s.client_id
LEFT JOIN m.post_draft pd
  ON pd.post_draft_id = s.filled_draft_id
LEFT JOIN c.client_publish_profile cpp
  ON cpp.client_id = s.client_id
 AND cpp.platform  = s.platform
 AND cpp.is_default = true
LEFT JOIN LATERAL (
  SELECT q.*
  FROM m.post_publish_queue q
  WHERE q.post_draft_id = pd.post_draft_id
    AND q.platform     = s.platform
  ORDER BY q.created_at DESC
  LIMIT 1
) q ON true
LEFT JOIN LATERAL (
  SELECT p.*
  FROM m.post_publish p
  WHERE p.post_draft_id = pd.post_draft_id
    AND p.platform     = s.platform
  ORDER BY (p.status = 'published') DESC, p.created_at DESC
  LIMIT 1
) pp ON true
WHERE s.scheduled_publish_at >= now() - interval '30 days'
  AND s.scheduled_publish_at <  now() + interval '14 days'
;

COMMENT ON VIEW audit.v_pipeline_reconciliation IS
  'TRACK-A v0.1 row-level slot→draft→queue→publish reconciliation. Mismatch '
  'flags + channel_state dimension. Window: 30d back, 14d forward. Authored '
  '2026-05-08; not applied until PK approval. See header comment for '
  'refinement queue (F-RECON-CHANNEL-STATE-V0.2, F-RECON-PLATFORM-VERIFY).';
