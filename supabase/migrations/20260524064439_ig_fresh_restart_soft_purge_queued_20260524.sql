-- RECONSTRUCTED 2026-05-25 from supabase_migrations.schema_migrations (version 20260524064439),
-- applied to production via Supabase MCP apply_migration 2026-05-24; .sql file was never committed.
-- Repo-only drift closure — no DB change (version already recorded as applied).

UPDATE m.post_publish_queue
   SET status        = 'purged',
       dead_reason   = 'fresh_restart_purge_2026-05-24',
       scheduled_for = NULL,
       locked_at     = NULL,
       locked_by     = NULL,
       updated_at    = now()
 WHERE platform = 'instagram'
   AND status   = 'queued';
