-- ============================================================================
-- FPUB jobid 48 head-of-line starvation fix   [STAGED — NOT YET APPLIED]
-- pool_key: facebook.enqueue.jobid48_head_of_line_starvation
-- Authored 2026-05-23. PK-approved repair shape: Mutation A only (staging).
-- ============================================================================
--
-- ROOT CAUSE
--   Cron jobid 48 (enqueue-publish-queue-every-5m, schedule */5, active)
--   selects one row per (client_id, platform) via
--   `SELECT DISTINCT ON (...) ... ORDER BY created_at ASC` in an INNER
--   subquery, then filters `computed_scheduled_for IS NOT NULL` in the OUTER
--   query -- i.e. AFTER the partition has already collapsed to one row.
--   NDIS Yarns / facebook's oldest eligible drafts are a 19-draft cluster all
--   stamped 2026-04-17 06:50:00.109341 with scheduled_for + slot both NULL
--   (NULL computed schedule). One of them always wins the single slot, is
--   discarded by the outer NULL filter (0 inserts), never queues, never
--   publishes, and stays eligible forever -- starving >=11 newer schedulable
--   drafts (oldest 0181a606 @ 2026-05-02; plus 10 from 2026-05-09..05-20).
--   NY FB has been dark since the last publish 2026-05-07 22:00 UTC.
--
-- MUTATION A (this migration)
--   Move/resolve the schedule filter to BEFORE DISTINCT ON: add a LEFT JOIN to
--   m.slot inside the inner subquery and require
--   `COALESCE(pd2.scheduled_for, s2.scheduled_publish_at) IS NOT NULL` there,
--   so DISTINCT ON selects the oldest SCHEDULABLE draft. An unschedulable
--   draft can no longer occupy the single per-(client,platform) slot.
--   PRESERVED verbatim: duplicate-queue guard, duplicate-published guard,
--   F-PUB-010 max_queued_per_platform cap, ON CONFLICT (post_draft_id,
--   platform) DO NOTHING, and one-row-per-(client,platform) DISTINCT ON.
--   The original outer `WHERE computed_scheduled_for IS NOT NULL` is KEPT
--   (now redundant) so no existing guard is removed.
--
-- EXPLICIT NON-ACTIONS
--   - Poison cluster (19 drafts incl. 0de778a9) NOT updated / scheduled / voided.
--   - No manual backfill (the fixed cron drains naturally, 1 row/tick under cap).
--   - 110 m8_* dead rows NOT touched / NOT requeued.
--
-- PRECONDITION / DRIFT GUARD (assumptions captured at staging time 2026-05-23)
--   jobid:               48  (resolved by jobname at apply time)
--   current command md5: 57bbafb19a51308a69db18607c8ad991
--   current command len: 2203
--   The DO block below ABORTS (RAISE EXCEPTION) if the live command md5/length
--   differ, so this migration is a safe no-op against a drifted command
--   (re-derive the repair against the current command before applying).
-- ============================================================================

DO $mig$
DECLARE
  v_jobid   bigint;
  v_command text;
  v_md5     text;
  v_len     integer;
BEGIN
  SELECT jobid, command
    INTO v_jobid, v_command
    FROM cron.job
   WHERE jobname = 'enqueue-publish-queue-every-5m';

  IF v_jobid IS NULL THEN
    RAISE EXCEPTION
      'jobid48 starvation fix: cron job "enqueue-publish-queue-every-5m" not found -- aborting.';
  END IF;

  v_md5 := md5(v_command);
  v_len := length(v_command);

  IF v_md5 <> '57bbafb19a51308a69db18607c8ad991' OR v_len <> 2203 THEN
    RAISE EXCEPTION
      'jobid48 starvation fix: live command drift on job % (expected md5 57bbafb19a51308a69db18607c8ad991 / len 2203, found md5 % / len %). Aborting -- re-derive the repair against the current command before applying.',
      v_jobid, v_md5, v_len;
  END IF;

  PERFORM cron.alter_job(
    job_id  := v_jobid,
    command := $cron$
  WITH candidates AS (
    SELECT
      j.ai_job_id,
      j.post_draft_id,
      j.client_id,
      j.platform,
      COALESCE(
        pd.scheduled_for,
        s.scheduled_publish_at
      ) AS computed_scheduled_for
    FROM (
      SELECT DISTINCT ON (j2.client_id, j2.platform)
        j2.ai_job_id, j2.post_draft_id, j2.client_id, j2.platform
      FROM m.ai_job j2
      JOIN m.post_draft pd2 ON pd2.post_draft_id = j2.post_draft_id
      LEFT JOIN m.slot s2 ON s2.slot_id = pd2.slot_id  -- [+] starvation fix: slot lookup for pre-DISTINCT schedulability
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
        -- [+] FPUB jobid48 starvation fix (2026-05-23): require a resolvable
        -- schedule BEFORE DISTINCT ON so an unschedulable draft (the 2026-04-17
        -- NULL-schedule NY/FB cluster) cannot win the single per-(client,
        -- platform) slot and starve newer schedulable drafts.
        AND COALESCE(pd2.scheduled_for, s2.scheduled_publish_at) IS NOT NULL
        -- F-PUB-010 hard-cap enforcement preserved verbatim
        AND (
          SELECT COUNT(*)
          FROM m.post_publish_queue q3
          WHERE q3.client_id = j2.client_id
            AND q3.platform = j2.platform
            AND q3.status = 'queued'
        ) < COALESCE(
          (
            SELECT cpp.max_queued_per_platform
            FROM c.client_publish_profile cpp
            WHERE cpp.client_id = j2.client_id
              AND cpp.platform = j2.platform
            LIMIT 1
          ),
          10
        )
      ORDER BY j2.client_id, j2.platform, j2.created_at ASC
    ) j
    JOIN m.post_draft pd ON pd.post_draft_id = j.post_draft_id
    LEFT JOIN m.slot s ON s.slot_id = pd.slot_id  -- M4: slot intent lookup
  )
  INSERT INTO m.post_publish_queue
    (ai_job_id, post_draft_id, client_id, platform, scheduled_for, status)
  SELECT
    ai_job_id, post_draft_id, client_id, platform, computed_scheduled_for, 'queued'
  FROM candidates
  WHERE computed_scheduled_for IS NOT NULL  -- defensive: redundant now that the inner query pre-filters NULL; kept to preserve the existing guard verbatim
  ON CONFLICT (post_draft_id, platform) DO NOTHING;
  $cron$
  );

  RAISE NOTICE 'jobid48 starvation fix applied to job % (schedule filter moved before DISTINCT ON).', v_jobid;
END
$mig$;

-- ============================================================================
-- ROLLBACK (run manually if needed -- restores the EXACT pre-change command).
--
-- Preferred: at apply time capture the live body first and re-apply it:
--     SELECT command FROM cron.job WHERE jobid = 48;   -- save verbatim
-- The exact original command (md5 57bbafb19a51308a69db18607c8ad991, len 2203)
-- as it stood on 2026-05-23 was:
-- ----------------------------------------------------------------------------
-- SELECT cron.alter_job(
--   job_id  := (SELECT jobid FROM cron.job WHERE jobname='enqueue-publish-queue-every-5m'),
--   command := $cron$
--   WITH candidates AS (
--     SELECT
--       j.ai_job_id,
--       j.post_draft_id,
--       j.client_id,
--       j.platform,
--       COALESCE(
--         pd.scheduled_for,
--         s.scheduled_publish_at
--         -- M8 Path A 2026-05-XX: legacy fallback removed from COALESCE chain.
--         -- Legacy rows with both NULL are skipped via WHERE computed_scheduled_for IS NOT NULL.
--       ) AS computed_scheduled_for
--     FROM (
--       SELECT DISTINCT ON (j2.client_id, j2.platform)
--         j2.ai_job_id, j2.post_draft_id, j2.client_id, j2.platform
--       FROM m.ai_job j2
--       JOIN m.post_draft pd2 ON pd2.post_draft_id = j2.post_draft_id
--       WHERE j2.status = 'succeeded'
--         AND j2.post_draft_id IS NOT NULL
--         AND pd2.approval_status IN ('approved', 'scheduled', 'published')
--         AND NOT EXISTS (
--           SELECT 1 FROM m.post_publish_queue q
--           WHERE q.post_draft_id = j2.post_draft_id
--         )
--         AND NOT EXISTS (
--           SELECT 1 FROM m.post_publish p
--           WHERE p.post_draft_id = j2.post_draft_id AND p.status = 'published'
--         )
--         -- F-PUB-010 hard-cap enforcement preserved verbatim
--         AND (
--           SELECT COUNT(*)
--           FROM m.post_publish_queue q3
--           WHERE q3.client_id = j2.client_id
--             AND q3.platform = j2.platform
--             AND q3.status = 'queued'
--         ) < COALESCE(
--           (
--             SELECT cpp.max_queued_per_platform
--             FROM c.client_publish_profile cpp
--             WHERE cpp.client_id = j2.client_id
--               AND cpp.platform = j2.platform
--             LIMIT 1
--           ),
--           10
--         )
--       ORDER BY j2.client_id, j2.platform, j2.created_at ASC
--     ) j
--     JOIN m.post_draft pd ON pd.post_draft_id = j.post_draft_id
--     LEFT JOIN m.slot s ON s.slot_id = pd.slot_id  -- M4: slot intent lookup
--   )
--   INSERT INTO m.post_publish_queue
--     (ai_job_id, post_draft_id, client_id, platform, scheduled_for, status)
--   SELECT
--     ai_job_id, post_draft_id, client_id, platform, computed_scheduled_for, 'queued'
--   FROM candidates
--   WHERE computed_scheduled_for IS NOT NULL  -- M3 Bug 3 fix; M8 Path A: also filters legacy rows with no resolvable schedule
--   ON CONFLICT (post_draft_id, platform) DO NOTHING;
--   $cron$
-- );
-- -- verify rollback restored the original:
-- -- SELECT md5(command)='57bbafb19a51308a69db18607c8ad991' AS rollback_md5_ok,
-- --        length(command)=2203 AS rollback_len_ok
-- -- FROM cron.job WHERE jobid = 48;   -- both must be true
-- ============================================================================

-- ============================================================================
-- POST-CHANGE VERIFICATION (run after apply; all read-only)
-- ----------------------------------------------------------------------------
-- V1. Command updated as expected:
--   SELECT md5(command) <> '57bbafb19a51308a69db18607c8ad991'                                AS command_changed,
--          command LIKE '%LEFT JOIN m.slot s2%'                                              AS has_inner_slot_join,
--          command LIKE '%COALESCE(pd2.scheduled_for, s2.scheduled_publish_at) IS NOT NULL%' AS has_inner_null_filter,
--          command LIKE '%ON CONFLICT (post_draft_id, platform) DO NOTHING%'                 AS conflict_guard_intact,
--          active
--   FROM cron.job WHERE jobid = 48;   -- expect all booleans true, active true
--
-- V2. NY/FB dry-run head is now a SCHEDULABLE draft (expect 0181a606 @ 2026-05-02, non-null schedule):
--   SELECT DISTINCT ON (a.client_id, a.platform)
--     a.post_draft_id, COALESCE(d.scheduled_for, s.scheduled_publish_at) AS computed_scheduled_for
--   FROM m.ai_job a JOIN m.post_draft d ON d.post_draft_id=a.post_draft_id
--   LEFT JOIN m.slot s ON s.slot_id=d.slot_id
--   WHERE a.status='succeeded' AND a.post_draft_id IS NOT NULL
--     AND d.approval_status IN ('approved','scheduled','published')
--     AND a.client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND a.platform='facebook'
--     AND NOT EXISTS (SELECT 1 FROM m.post_publish_queue q WHERE q.post_draft_id=a.post_draft_id)
--     AND NOT EXISTS (SELECT 1 FROM m.post_publish p WHERE p.post_draft_id=a.post_draft_id AND p.status='published')
--     AND COALESCE(d.scheduled_for, s.scheduled_publish_at) IS NOT NULL
--   ORDER BY a.client_id, a.platform, a.created_at ASC;
--
-- V3. Poison NULL-schedule cluster absent from schedulable candidates:
--   (same as V2 but with `AND COALESCE(d.scheduled_for, s.scheduled_publish_at) IS NULL`
--    plus the post-fix inner filter -> expect 0 selectable poison rows)
--
-- V4. NY/FB queue rows begin appearing after 1-2 ticks (queued count rises from 0):
--   SELECT status, count(*) FROM m.post_publish_queue
--   WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND platform='facebook' GROUP BY status;
--
-- V5. m8_* dead rows unchanged (expect 110):
--   SELECT count(*) FROM m.post_publish_queue
--   WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND platform='facebook'
--     AND status='dead' AND COALESCE(dead_reason, last_error, '') LIKE 'm8\_%';
--
-- V6. Other Facebook clients not regressed (snapshot before/after; only NY/FB queued should rise):
--   SELECT client_id, status, count(*) FROM m.post_publish_queue
--   WHERE platform='facebook' GROUP BY client_id, status ORDER BY client_id, status;
-- ============================================================================
