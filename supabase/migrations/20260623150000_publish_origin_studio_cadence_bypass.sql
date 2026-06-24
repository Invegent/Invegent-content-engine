-- ============================================================================
-- Publishing-Origin: Content Studio cadence bypass   [DRAFT — NOT YET APPLIED]
-- Migration name = permanent identity (new number / distinct name).
-- pool_key: facebook.enqueue.publish_origin_studio_cadence
-- Authored 2026-06-23. PK-approved design — additive / opt-in / feed byte-unchanged.
-- ============================================================================
--
-- GOAL
--   Content Studio (operator) publish-queue rows bypass the automatic-feed
--   cadence (max_per_day + min_gap_minutes) and publish ASAP, while feed rows
--   are byte-unchanged and every hard safety gate is preserved. This migration
--   carries an origin marker from intent -> queue; the publisher EF reads it.
--
-- PART (a) — metadata-only column add (fast, constant default).
--   m.post_publish_queue gains publish_origin text NOT NULL DEFAULT 'feed'
--   CHECK IN ('feed','studio','series'). Constant default => no table rewrite;
--   all existing rows default 'feed' (safe — they keep current cadence).
--
-- PART (b) — re-alter LIVE cron jobid 48 (enqueue-publish-queue-every-5m).
--   The CURRENT live body (the starvation-fix + F-PUB-010 hard-cap shape) is
--   reproduced VERBATIM and only these SURGICAL additions are made:
--     1. OUTER candidates SELECT also LEFT JOINs m.creative_intent ci on
--        pd.intent_id, computing:
--           CASE WHEN ci.created_by = 'content-studio'
--                THEN 'studio' ELSE 'feed' END AS publish_origin
--        (series-writer rows -> 'feed'; ONLY created_by='content-studio' = studio).
--     2. computed_scheduled_for becomes origin-aware:
--           studio -> COALESCE(pd.scheduled_for, NOW())   (ASAP unless operator
--                                                          set an explicit time)
--           feed   -> COALESCE(pd.scheduled_for, s.scheduled_publish_at)  [BYTE-
--                                                          IDENTICAL to today]
--     3. publish_origin added to the INSERT column list and final SELECT.
--   STRICTLY UNCHANGED: the inner DISTINCT-ON subquery WHERE (starvation guard
--   + F-PUB-010 max_queued_per_platform hard cap), the one-row-per-(client,
--   platform) DISTINCT ON, the final WHERE computed_scheduled_for IS NOT NULL,
--   and ON CONFLICT (post_draft_id, platform) DO NOTHING. FEED cadence/behaviour
--   is not touched. No existing queued row is mutated.
--
-- DRIFT GUARD
--   The DO block ABORTS (RAISE EXCEPTION) unless the live jobid-48 command still
--   matches the body captured at authoring time (the deployed starvation-fix
--   body, md5 a/len from 20260523_fpub_jobid48_starvation_fix.sql). If the live
--   command has drifted, re-derive this surgical patch against the current body
--   before applying — this migration is a safe no-op against a drifted command.
--   NOTE: capture the live md5/len at apply time (see PRE-APPLY below) and fill
--   EXPECTED_MD5 / EXPECTED_LEN before running. Authoring could not query prod.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART (a): metadata-only column (constant default => fast, no rewrite)
-- ----------------------------------------------------------------------------
ALTER TABLE m.post_publish_queue
  ADD COLUMN IF NOT EXISTS publish_origin text NOT NULL DEFAULT 'feed'
    CHECK (publish_origin IN ('feed','studio','series'));

COMMENT ON COLUMN m.post_publish_queue.publish_origin IS
  'Publishing-Origin (2026-06-23): how this queue row entered ICE. feed = automatic-feed cron (default, existing cadence); studio = Content Studio operator intent (created_by=content-studio -> publisher EF bypasses max_per_day/min_gap, ASAP, with a 10m studio min-gap burst floor); series = series-writer rows (treated as feed cadence). Derived at enqueue from m.creative_intent.created_by via post_draft.intent_id.';

-- ----------------------------------------------------------------------------
-- PART (b): re-alter LIVE cron jobid 48 with the surgical origin additions
-- ----------------------------------------------------------------------------
-- PRE-APPLY (run read-only, fill the two literals below before applying):
--   SELECT md5(command) AS live_md5, length(command) AS live_len
--   FROM cron.job WHERE jobname = 'enqueue-publish-queue-every-5m';
-- Expected (deployed starvation-fix body, len 2203). Confirm md5 == the live
-- value at apply time; if it differs, STOP and re-derive (do not force).
DO $mig$
DECLARE
  v_jobid   bigint;
  v_command text;
  v_md5     text;
  v_len     integer;
  -- Fill these from the PRE-APPLY query at apply time. The starvation-fix
  -- migration recorded len 2203 for its post-apply body; md5 must be captured
  -- live (the comment-stripping done by cron may change whitespace). Leaving
  -- EXPECTED_MD5 NULL DISABLES the md5 check and relies on the len + structural
  -- LIKE checks below — set it to enforce strict identity.
  v_expected_md5 text := '89b6aadebd2d283367005e616de5c383';  -- live jobid-48 md5 captured 2026-06-23 (db-rls-auditor); strict guard aborts on any drift
  v_expected_len integer := 2556;       -- live jobid-48 body length captured 2026-06-23
BEGIN
  SELECT jobid, command
    INTO v_jobid, v_command
    FROM cron.job
   WHERE jobname = 'enqueue-publish-queue-every-5m';

  IF v_jobid IS NULL THEN
    RAISE EXCEPTION
      'publish_origin: cron job "enqueue-publish-queue-every-5m" not found -- aborting.';
  END IF;

  v_md5 := md5(v_command);
  v_len := length(v_command);

  -- Structural drift guard: the live body MUST be the deployed starvation-fix
  -- shape (inner slot join + inner null filter + F-PUB-010 cap + conflict guard)
  -- and MUST NOT already carry the origin change. Abort on any mismatch.
  IF v_command NOT LIKE '%LEFT JOIN m.slot s2 ON s2.slot_id = pd2.slot_id%'
     OR v_command NOT LIKE '%COALESCE(pd2.scheduled_for, s2.scheduled_publish_at) IS NOT NULL%'
     OR v_command NOT LIKE '%max_queued_per_platform%'
     OR v_command NOT LIKE '%ON CONFLICT (post_draft_id, platform) DO NOTHING%' THEN
    RAISE EXCEPTION
      'publish_origin: live jobid-48 body is NOT the expected starvation-fix shape (md5 % / len %). Re-derive the surgical patch before applying.',
      v_md5, v_len;
  END IF;

  IF v_command LIKE '%publish_origin%' THEN
    RAISE EXCEPTION
      'publish_origin: live jobid-48 body already contains publish_origin (md5 % / len %). Already applied or drifted -- aborting.',
      v_md5, v_len;
  END IF;

  IF v_expected_md5 IS NOT NULL AND v_md5 <> v_expected_md5 THEN
    RAISE EXCEPTION
      'publish_origin: live jobid-48 command md5 drift (expected % / found %, len %). Aborting -- re-derive against the current command.',
      v_expected_md5, v_md5, v_len;
  END IF;

  IF v_len <> v_expected_len THEN
    RAISE WARNING
      'publish_origin: live jobid-48 command length % differs from expected % (structural guards passed). Confirm the body before relying on this run.',
      v_len, v_expected_len;
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
      -- [+] Publishing-Origin (2026-06-23): derive origin from the parent
      -- creative_intent. ONLY operator Content Studio rows (created_by =
      -- 'content-studio') are 'studio'; series-writer and all feed rows -> 'feed'.
      CASE WHEN ci.created_by = 'content-studio' THEN 'studio' ELSE 'feed' END
        AS publish_origin,
      -- [+] Publishing-Origin: studio publishes ASAP (NOW()) unless the operator
      -- set an explicit pd.scheduled_for. The FEED branch is BYTE-IDENTICAL to
      -- the deployed starvation-fix body (COALESCE(scheduled_for, slot)).
      CASE WHEN ci.created_by = 'content-studio'
           THEN COALESCE(pd.scheduled_for, NOW())
           ELSE COALESCE(pd.scheduled_for, s.scheduled_publish_at)
      END AS computed_scheduled_for
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
    LEFT JOIN m.creative_intent ci ON ci.intent_id = pd.intent_id  -- [+] Publishing-Origin: parent intent origin lookup
  )
  INSERT INTO m.post_publish_queue
    (ai_job_id, post_draft_id, client_id, platform, scheduled_for, status, publish_origin)
  SELECT
    ai_job_id, post_draft_id, client_id, platform, computed_scheduled_for, 'queued', publish_origin
  FROM candidates
  WHERE computed_scheduled_for IS NOT NULL  -- defensive: redundant for studio (NOW() never NULL); kept to preserve the existing guard verbatim
  ON CONFLICT (post_draft_id, platform) DO NOTHING;
  $cron$
  );

  RAISE NOTICE 'publish_origin: jobid-48 enqueue updated (origin marker + studio ASAP schedule). Feed branch byte-unchanged.';
END
$mig$;

-- ============================================================================
-- ROLLBACK (run manually if needed)
--   PART (b): re-apply the EXACT pre-change body. Preferred — capture live first:
--     SELECT command FROM cron.job WHERE jobname='enqueue-publish-queue-every-5m';  -- save verbatim BEFORE applying
--   then cron.alter_job(...) it back. The pre-change body is the deployed
--   starvation-fix body in 20260523_fpub_jobid48_starvation_fix.sql.
--   PART (a): the column is additive and inert for feed rows. If a full revert
--   is required AND no row depends on it:
--     ALTER TABLE m.post_publish_queue DROP COLUMN IF EXISTS publish_origin;
--   (Safe only if the publisher EF version reading publish_origin is also rolled
--    back; otherwise the EF tolerates a missing column via its per-row fetch.)
-- ============================================================================

-- ============================================================================
-- POST-CHANGE VERIFICATION (run after apply; all read-only)
-- V1. Column present, default feed:
--   SELECT column_default, is_nullable FROM information_schema.columns
--   WHERE table_schema='m' AND table_name='post_publish_queue' AND column_name='publish_origin';
-- V2. Existing rows all 'feed' (no row mutated):
--   SELECT publish_origin, count(*) FROM m.post_publish_queue GROUP BY publish_origin;
-- V3. Cron body updated + guards intact:
--   SELECT command LIKE '%publish_origin%'                                   AS has_origin,
--          command LIKE '%creative_intent ci ON ci.intent_id = pd.intent_id%' AS has_intent_join,
--          command LIKE '%LEFT JOIN m.slot s2%'                              AS starvation_intact,
--          command LIKE '%max_queued_per_platform%'                          AS cap_intact,
--          command LIKE '%ON CONFLICT (post_draft_id, platform) DO NOTHING%' AS conflict_intact,
--          active
--   FROM cron.job WHERE jobname='enqueue-publish-queue-every-5m';  -- all true
-- V4. After 1-2 ticks: studio drafts (intent created_by='content-studio') enqueue
--   with publish_origin='studio'; feed rows still 'feed':
--   SELECT q.publish_origin, count(*) FROM m.post_publish_queue q
--   WHERE q.status='queued' GROUP BY q.publish_origin;
-- ============================================================================
