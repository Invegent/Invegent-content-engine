-- F-PUB-006 Stage 1: orphan queue rows where post_draft no longer exists
-- Brief: docs/briefs/2026-05-03-fpub006-zombie-cleanup-cc.md
-- D170 boundary: CC drafts; chat applies via Supabase MCP `execute_sql` after
-- firing the MCP review (action_type=sql_destructive). DO NOT apply from CC.
--
-- Pre-flight (Step 0a) returned 4 rows on 2026-05-03 (CC pre-flight,
-- DB now() = 2026-05-02 22:51 UTC). Exact match to brief expected count.
-- Captured queue_ids (for chat reference; not used in WHERE — predicate
-- re-evaluates at apply time so any drift between draft and apply is safe):
--   d62ff526-0393-4630-8662-0729115c6b41  PP-Facebook    sched 2026-05-02 17:05
--   3deaefb3-dfc6-4b1f-a70f-44d7c44387b7  NDIS-FB        sched 2026-05-02 17:35
--   6bfcc9fb-228e-4f73-9cbd-fcb36054a458  NDIS-FB        sched 2026-05-02 17:40
--   d75ba206-3b51-49e3-88d0-d4d33da56418  PP-Facebook    sched 2026-05-02 16:50
--
-- The predicate matches by SQL state at apply time, not by id list — so if a
-- new orphan accrues between draft and apply, it will also be cleaned. If a
-- draft re-materialises (very unlikely — orphans mean post_draft_id has been
-- hard-deleted), it will be skipped. Both behaviours are correct.

UPDATE m.post_publish_queue
SET status='dead',
    dead_reason='post_draft_not_found_orphan_F-PUB-006_2026-05-03',
    updated_at=now()
WHERE status='queued'
  AND last_error='post_draft_not_found'
  AND NOT EXISTS (
    SELECT 1 FROM m.post_draft pd WHERE pd.post_draft_id = m.post_publish_queue.post_draft_id
  )
RETURNING queue_id, client_id, platform, post_draft_id;

-- ── Verification (chat runs this immediately after the UPDATE above) ─────────
-- Expected: 4 (matches Step 0a count).
SELECT count(*) AS dead_marked_stage1
FROM m.post_publish_queue
WHERE status='dead'
  AND dead_reason='post_draft_not_found_orphan_F-PUB-006_2026-05-03';
