-- =====================================================================
-- ROLLBACK — S9 Objective 2 cron job 48 capability filter (20260729183000)
--
-- Brief: docs/briefs/s9-publisher-enforcement-build-brief-v1.md
-- Tier:  T3 (production enqueue scheduler)
--
-- Restores job 48 to its EXACT pre-change command. Asserts the CURRENT command is the
-- post-change one before reverting, so a double-rollback or unrelated drift aborts.
--
-- cron.job is DB state with NO repo provenance, exactly like publisher_lock_queue
-- v1/v2 which this lane already backfills. These two files are the first repo
-- record of job 48's command.
--
-- SELF-VERIFYING: the job is located by jobname (stable) rather than a hardcoded
-- jobid, and the CURRENT command md5 is asserted before any change. Drift => the
-- transaction aborts and nothing is altered.
-- Baseline: jobname 'enqueue-publish-queue-every-5m', schedule '*/5 * * * *',
--           username postgres, md5(command) = 4a78f1bdba9c598f0799c8ba1cc40186.
-- =====================================================================

BEGIN;

DO $mig$
DECLARE
  v_id bigint;
  v_md5 text;
BEGIN
  SELECT jobid, md5(command) INTO v_id, v_md5
    FROM cron.job WHERE jobname = 'enqueue-publish-queue-every-5m';

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'STOP: cron job enqueue-publish-queue-every-5m not found';
  END IF;
  IF v_md5 <> '747c643163f1f7a1c500e63ec5411d31' THEN
    RAISE EXCEPTION 'STOP: cron 48 command drift — got %, expected 747c643163f1f7a1c500e63ec5411d31', v_md5;
  END IF;

  PERFORM cron.alter_job(job_id := v_id, command := $cron$
  WITH candidates AS (
    SELECT
      j.ai_job_id,
      j.post_draft_id,
      j.client_id,
      j.platform,
      CASE WHEN ci.created_by = 'content-studio' THEN 'studio' ELSE 'feed' END AS publish_origin,
      CASE WHEN ci.created_by = 'content-studio'
           THEN COALESCE(pd.scheduled_for, NOW())
           ELSE COALESCE(pd.scheduled_for, s.scheduled_publish_at)
      END AS computed_scheduled_for
    FROM (
      SELECT DISTINCT ON (j2.client_id, j2.platform)
        j2.ai_job_id, j2.post_draft_id, j2.client_id, j2.platform
      FROM m.ai_job j2
      JOIN m.post_draft pd2 ON pd2.post_draft_id = j2.post_draft_id
      LEFT JOIN m.slot s2 ON s2.slot_id = pd2.slot_id
      WHERE j2.status = 'succeeded'
        AND j2.post_draft_id IS NOT NULL
        AND pd2.approval_status IN ('approved', 'scheduled', 'published')
        AND NOT EXISTS (SELECT 1 FROM m.post_publish_queue q WHERE q.post_draft_id = j2.post_draft_id)
        AND NOT EXISTS (SELECT 1 FROM m.post_publish p WHERE p.post_draft_id = j2.post_draft_id AND p.status = 'published')
        AND COALESCE(pd2.scheduled_for, s2.scheduled_publish_at) IS NOT NULL
        AND (SELECT COUNT(*) FROM m.post_publish_queue q3 WHERE q3.client_id = j2.client_id AND q3.platform = j2.platform AND q3.status = 'queued')
            < COALESCE((SELECT cpp.max_queued_per_platform FROM c.client_publish_profile cpp WHERE cpp.client_id = j2.client_id AND cpp.platform = j2.platform LIMIT 1), 10)
      ORDER BY j2.client_id, j2.platform, j2.created_at ASC
    ) j
    JOIN m.post_draft pd ON pd.post_draft_id = j.post_draft_id
    LEFT JOIN m.slot s ON s.slot_id = pd.slot_id
    LEFT JOIN m.creative_intent ci ON ci.intent_id = pd.intent_id
  )
  INSERT INTO m.post_publish_queue
    (ai_job_id, post_draft_id, client_id, platform, scheduled_for, status, publish_origin)
  SELECT ai_job_id, post_draft_id, client_id, platform, computed_scheduled_for, 'queued', publish_origin
  FROM candidates
  WHERE computed_scheduled_for IS NOT NULL
  ON CONFLICT (post_draft_id, platform) DO NOTHING;
  $cron$);

  RAISE NOTICE 'cron job % command updated', v_id;
END
$mig$;

COMMIT;
