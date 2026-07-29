-- =====================================================================
-- S9 Objective 2 — cron job 48 (enqueue) capability filter [PK ruling option (a)]
--
-- Brief: docs/briefs/s9-publisher-enforcement-build-brief-v1.md
-- Tier:  T3 (production enqueue scheduler)
--
-- Adds ONE predicate to the DISTINCT ON candidate subquery so a capability-blocked
-- draft never occupies the single per-(client,platform) enqueue slot. Paired with the
-- BEFORE INSERT trigger guard in 20260729173000 (kept as defence-in-depth).
--
-- PROVENANCE (corrected per db-rls-auditor G-2): cron.job is DB state, and there is
-- no APPLIED provenance for job 48's CURRENT command. A staged file
-- supabase/migrations/20260523_fpub_jobid48_starvation_fix.sql DOES already embed job
-- 48's command, but it was never applied as written -- its own drift guard asserts
-- md5 57bbafb19a51308a69db18607c8ad991 / len 2203, whereas the live command today is
-- md5 4a78f1bdba9c598f0799c8ba1cc40186 / len 2061. These two files are therefore the
-- first repo record of the command as it ACTUALLY runs.
--
-- SELF-VERIFYING: the job is located by (jobname, username) -- cron.job's unique index
-- is on that PAIR, not jobname alone -- using INTO STRICT so 0 or >1 matches raise
-- rather than silently picking one (G-3). The CURRENT command md5 is asserted before
-- any change; drift => the transaction aborts and nothing is altered.
-- Baseline: jobname 'enqueue-publish-queue-every-5m', schedule '*/5 * * * *',
--           username postgres, md5(command) = 4a78f1bdba9c598f0799c8ba1cc40186.
-- =====================================================================

BEGIN;

DO $mig$
DECLARE
  v_id bigint;
  v_md5 text;
BEGIN
  -- G-3: cron.job's unique index is (jobname, username), NOT jobname alone. INTO STRICT
  -- raises NO_DATA_FOUND / TOO_MANY_ROWS instead of silently taking an arbitrary row.
  SELECT jobid, md5(command) INTO STRICT v_id, v_md5
    FROM cron.job
   WHERE jobname = 'enqueue-publish-queue-every-5m'
     AND username = 'postgres';

  IF v_md5 <> '4a78f1bdba9c598f0799c8ba1cc40186' THEN
    RAISE EXCEPTION 'STOP: cron 48 command drift — got %, expected 4a78f1bdba9c598f0799c8ba1cc40186', v_md5;
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
        /* S9 Objective 2 (PK ruling 2026-07-29, option a): a capability-blocked draft
           must never consume this job's SINGLE DISTINCT ON (client_id, platform)
           candidate slot. Without this the enqueue trigger's suppression means no queue
           row is ever created, so the blocked draft stays the oldest candidate and is
           re-picked every tick forever, starving healthy newer drafts behind it
           (head-of-line starvation; cf. 20260523_fpub_jobid48_starvation_fix.sql). */
        AND pd2.final_format_authority IS DISTINCT FROM 'blocked_by_capability'
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
