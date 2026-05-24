-- RECONSTRUCTED 2026-05-25 from supabase_migrations.schema_migrations (version 20260524112024),
-- applied to production via Supabase MCP apply_migration 2026-05-24; .sql file was never committed.
-- Repo-only drift closure — no DB change (version already recorded as applied).

-- D-01 5f7bfc52; PK approved. NY+PP YouTube backlog: release fresh (>=12 May), soft-retire stale (<12 May).
-- Statement 1: release fresh -> generated (publisher jobid 34 drains 2/tick)
UPDATE m.post_draft
SET video_status = 'generated', updated_at = now()
WHERE client_id IN (SELECT client_id FROM c.client WHERE client_name IN ('NDIS-Yarns','Property Pulse'))
  AND approval_status = 'approved'
  AND video_status = 'failed'
  AND recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice')
  AND video_url IS NOT NULL
  AND (draft_format->>'youtube_video_id') IS NULL
  AND updated_at >= '2026-05-12 00:00:00+00';

-- Statement 2: soft-retire stale -> archived_stale (terminal, publisher-invisible, reversible)
UPDATE m.post_draft
SET video_status = 'archived_stale', updated_at = now()
WHERE client_id IN (SELECT client_id FROM c.client WHERE client_name IN ('NDIS-Yarns','Property Pulse'))
  AND approval_status = 'approved'
  AND video_status = 'failed'
  AND recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice')
  AND video_url IS NOT NULL
  AND (draft_format->>'youtube_video_id') IS NULL
  AND updated_at < '2026-05-12 00:00:00+00';
