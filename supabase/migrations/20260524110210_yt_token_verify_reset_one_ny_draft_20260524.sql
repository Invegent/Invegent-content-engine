-- RECONSTRUCTED 2026-05-25 from supabase_migrations.schema_migrations (version 20260524110210),
-- applied to production via Supabase MCP apply_migration 2026-05-24; .sql file was never committed.
-- Repo-only drift closure — no DB change (version already recorded as applied).

-- D-01 82443c8c (single-draft YT verify pattern); PK approved drip. NY token confirmation.
UPDATE m.post_draft
SET video_status = 'generated', updated_at = now()
WHERE post_draft_id = 'b9860637-931b-46fe-b5c3-53b08bfdb187'
  AND video_status = 'failed'
  AND approval_status = 'approved'
  AND (draft_format->>'youtube_video_id') IS NULL;
