-- M11: fix the ON CONFLICT target in enqueue-publish-queue-every-5m cron (jobid 48).
--
-- Cron body used ON CONFLICT (post_draft_id). Actual unique index on
-- m.post_publish_queue is (post_draft_id, platform) — index was presumably
-- extended around 14 Apr when Instagram support landed. Cron SQL was not
-- updated to match.
--
-- Effect: Postgres raised "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification" on every run. Cron has been
-- failing silently since 2026-04-14 05:20 UTC (first failure) through
-- 2026-04-22 01:25 UTC (last observed failure before this fix) = 2258
-- failed runs over ~8 days. Nothing was enqueued for any platform during
-- that window.
--
-- Publisher impact:
--   - instagram-publisher bypasses the queue entirely (reads m.post_draft
--     directly). Continued publishing normally through the outage.
--   - publisher (Facebook) reads ONLY from m.post_publish_queue. Had
--     nothing to process for 8 days. This is the root cause of the
--     "FB got 0 posts, IG got 18" disparity documented in M8 as out-of-
--     scope and picked up as the M11 diagnostic.
--
-- Fix: surgical. ON CONFLICT (post_draft_id) -> ON CONFLICT (post_draft_id,
-- platform) to match the actual unique index. No other behaviour change.
--
-- Applied to the live cron job via cron.alter_job in the same migration
-- call as this file records. This SQL is for reproducibility — someone
-- replaying migrations from scratch gets the corrected body.

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname='enqueue-publish-queue-every-5m'),
  command := $cron$
  INSERT INTO m.post_publish_queue
    (ai_job_id, post_draft_id, client_id, platform, scheduled_for, status)
  SELECT
    j.ai_job_id,
    j.post_draft_id,
    j.client_id,
    j.platform,
    COALESCE(
      pd.scheduled_for,
      public.get_next_scheduled_for(j.client_id, j.platform, NOW())
    ),
    'queued'
  FROM (
    SELECT DISTINCT ON (j2.client_id, j2.platform)
      j2.ai_job_id, j2.post_draft_id, j2.client_id, j2.platform
    FROM m.ai_job j2
    JOIN m.post_draft pd2 ON pd2.post_draft_id = j2.post_draft_id
    WHERE j2.status = 'succeeded'
      AND j2.post_draft_id IS NOT NULL
      AND pd2.approval_status IN ('approved', 'scheduled', 'published')
      AND NOT EXISTS (
        SELECT 1 FROM m.post_publish_queue q
        WHERE q.post_draft_id = j2.post_draft_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM m.post_publish p
        WHERE p.post_draft_id = j2.post_draft_id AND p.status = 'published'
      )
    ORDER BY j2.client_id, j2.platform, j2.created_at ASC
  ) j
  JOIN m.post_draft pd ON pd.post_draft_id = j.post_draft_id
  ON CONFLICT (post_draft_id, platform) DO NOTHING;
  $cron$
);
