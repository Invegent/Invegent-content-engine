-- RECONSTRUCTED 2026-05-25 from supabase_migrations.schema_migrations (version 20260524070529),
-- applied to production via Supabase MCP apply_migration 2026-05-24; .sql file was never committed.
-- Repo-only drift closure — no DB change (version already recorded as applied).

-- Step 0: additive constraint extension to allow 'voided'
ALTER TABLE m.post_draft DROP CONSTRAINT post_draft_approval_status_check;
ALTER TABLE m.post_draft ADD CONSTRAINT post_draft_approval_status_check
  CHECK (approval_status = ANY (ARRAY['draft','needs_review','approved','rejected','scheduled','published','dead','voided']));

-- Step 1: void stale never-published IG drafts (trigger no-ops since 'voided' != 'rejected')
UPDATE m.post_draft pd
   SET approval_status = 'voided',
       updated_at      = now()
 WHERE pd.platform = 'instagram'
   AND pd.approval_status IN ('approved','scheduled','published')
   AND NOT EXISTS (
       SELECT 1 FROM m.post_publish p
        WHERE p.post_draft_id = pd.post_draft_id AND p.status = 'published'
   );

-- Step 2: re-purge residual queued IG rows
UPDATE m.post_publish_queue
   SET status        = 'purged',
       dead_reason   = 'fresh_restart_purge_2026-05-24',
       scheduled_for = NULL,
       locked_at     = NULL,
       locked_by     = NULL,
       updated_at    = now()
 WHERE platform = 'instagram'
   AND status   = 'queued';
