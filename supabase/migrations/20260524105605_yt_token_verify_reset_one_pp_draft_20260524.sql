-- RECONSTRUCTED 2026-05-25 from supabase_migrations.schema_migrations (version 20260524105605),
-- applied to production via Supabase MCP apply_migration 2026-05-24; .sql file was never committed.
-- Repo-only drift closure — no DB change (version already recorded as applied).

-- D-01 review_id 82443c8c; PK approved. Single-draft YT token verification reset.
-- Reset ONE PP failed video draft -> generated so youtube-publisher (jobid 34) re-attempts
-- with the freshly re-exchanged Production token. Guarded + idempotent + reversible.
UPDATE m.post_draft
SET video_status = 'generated', updated_at = now()
WHERE post_draft_id = '2afce74e-36f2-4af9-a108-69b8c8d9bf78'
  AND video_status = 'failed'
  AND approval_status = 'approved'
  AND (draft_format->>'youtube_video_id') IS NULL;
