-- RECONSTRUCTED 2026-05-26 from supabase_migrations.schema_migrations (version 20260526054427),
-- applied to production via Supabase MCP apply_migration 2026-05-26 (B1 quota recovery; executor chat/CCH);
-- .sql file was never committed. Repo-only drift closure — no DB change (version already recorded as applied).
-- F-YT-FAILED-NO-RETRY Unit B1: recover the 5 transient 429/quota 'failed' YouTube drafts (approved, guard-passing).
DO $$
DECLARE v_affected int;
BEGIN
  WITH upd AS (
    UPDATE m.post_draft AS pd
    SET video_status = 'generated',
        draft_format = (pd.draft_format
          - 'youtube_upload_error' - 'youtube_upload_attempted'
          - 'youtube_retry_after' - 'youtube_upload_attempts' - 'youtube_dead_reason'),
        updated_at = now()
    WHERE pd.video_status = 'failed'
      AND pd.approval_status = 'approved'
      AND (pd.draft_format->>'youtube_video_id') IS NULL
      AND NOT EXISTS (SELECT 1 FROM m.post_publish pp
                      WHERE pp.post_draft_id = pd.post_draft_id AND pp.platform='youtube')
      AND (pd.draft_format->>'youtube_upload_error' ILIKE '%429%'
           OR pd.draft_format->>'youtube_upload_error' ILIKE '%quota%')
      AND EXISTS (SELECT 1 FROM c.client_channel cc
                  WHERE cc.client_id = pd.client_id AND cc.platform='youtube'
                    AND (cc.config->>'refresh_token') IS NOT NULL)
    RETURNING 1)
  SELECT count(*) INTO v_affected FROM upd;
  IF v_affected <> 5 THEN
    RAISE EXCEPTION 'B1 recovery affected % rows, expected 5 — aborting', v_affected;
  END IF;
END $$;