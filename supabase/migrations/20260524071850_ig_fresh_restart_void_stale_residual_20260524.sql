-- RECONSTRUCTED 2026-05-25 from supabase_migrations.schema_migrations (version 20260524071850),
-- applied to production via Supabase MCP apply_migration 2026-05-24; .sql file was never committed.
-- Repo-only drift closure — no DB change (version already recorded as applied).

-- Step 1a: void the 12 stale (pre-2026-05-23) needs_review/draft IG drafts; preserve the 2 fresh
UPDATE m.post_draft pd
   SET approval_status = 'voided',
       updated_at      = now()
 WHERE pd.platform = 'instagram'
   AND pd.approval_status IN ('needs_review','draft')
   AND pd.created_at < '2026-05-23'
   AND NOT EXISTS (
       SELECT 1 FROM m.post_publish p
        WHERE p.post_draft_id = pd.post_draft_id AND p.status = 'published'
   );

-- Step 1b: defensive residual queue re-purge
UPDATE m.post_publish_queue
   SET status        = 'purged',
       dead_reason   = 'fresh_restart_purge_2026-05-24',
       scheduled_for = NULL,
       locked_at     = NULL,
       locked_by     = NULL,
       updated_at    = now()
 WHERE platform = 'instagram'
   AND status   = 'queued';
