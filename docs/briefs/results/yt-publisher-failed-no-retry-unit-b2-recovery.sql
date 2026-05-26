-- =====================================================================================
-- Unit B-2 recovery DML — F-YT-FAILED-NO-RETRY (Strategy B)
-- 17 B2 token-casualty YouTube drafts: video_status 'failed' -> 'generated'
--
-- STATUS: PREPARED ARTIFACT ONLY — *** DO NOT RUN AS-IS ***.
--   Execution is gated on: (1) Unit A youtube-publisher v1.9.0 DEPLOYED first (A-then-B);
--   (2) a fresh D-01 `sql_destructive` review (verdict + PK approval phrase); applied via
--   Supabase MCP `apply_migration` only (the sanctioned m.* DML path).
--
-- WHY STRATEGY B (not a data flip of approval_status):
--   CCD read-only scoping (2026-05-26) found all 17 B2 drafts have a Facebook m.post_publish
--   row and ZERO YouTube row. So approval_status='published' is TRUTHFUL cross-platform state
--   (published to Facebook), NOT a YouTube artifact. This DML therefore does NOT touch
--   approval_status. The publisher v1.9.0 predicate broadening (approval_status IN
--   ('approved','published')) is what re-selects these once video_status='generated'.
--
-- SCOPE GUARANTEES (all enforced as hard-aborts before any UPDATE):
--   * exactly 17 rows match the B2 predicate + no-upload guard, else ABORT
--   * none of the 17 has a youtube_video_id or a YouTube m.post_publish row, else ABORT
--   * no B3 (No-refresh-token / null-client) row leaks into the set, else ABORT
--   * every remaining 'failed' video row classifies as a KNOWN bucket (B2 or B3), else ABORT
--   * UPDATE is bounded to exactly the snapshotted ids; ROW_COUNT must equal 17, else ABORT
--   * approval_status is NEVER written; B1 / B3 / archived_stale / pending / published rows
--     (other than the exact B2 'failed' set) are NEVER touched
--
-- ROLLBACK: forward-only data movement; the m.yt_b2_recovery_snapshot_20260526 table captures
--   the pre-state (post_draft_id + video_status + approval_status + draft_format) for a manual
--   revert to 'failed' if ever needed.
-- =====================================================================================

DO $$
DECLARE
  v_b2_count       int;
  v_guard_fail     int;
  v_b3_in_set      int;
  v_unknown_failed int;
  v_updated        int;
BEGIN
  ----------------------------------------------------------------------------------
  -- GATE 1: exactly 17 B2 rows (exact predicate + no-upload guard).
  -- (Also the re-run guard: after a successful apply these rows are 'generated', so a
  --  second run finds 0 here and aborts before re-snapshotting / re-updating.)
  ----------------------------------------------------------------------------------
  SELECT count(*) INTO v_b2_count
  FROM m.post_draft pd
  WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
    AND pd.video_status = 'failed'
    AND pd.approval_status = 'published'
    AND coalesce(pd.draft_format->>'youtube_upload_error','') ILIKE '%invalid_grant%'
    AND pd.video_url IS NOT NULL
    AND (pd.draft_format->>'youtube_video_id') IS NULL
    AND NOT EXISTS (SELECT 1 FROM m.post_publish pp WHERE pp.post_draft_id = pd.post_draft_id AND pp.platform = 'youtube');

  IF v_b2_count <> 17 THEN
    RAISE EXCEPTION 'ABORT: expected exactly 17 B2 rows, found % — investigate before recovery', v_b2_count;
  END IF;

  ----------------------------------------------------------------------------------
  -- GATE 2: no-upload guard restated against the bare B2 predicate (defence in depth).
  ----------------------------------------------------------------------------------
  SELECT count(*) INTO v_guard_fail
  FROM m.post_draft pd
  WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
    AND pd.video_status = 'failed'
    AND pd.approval_status = 'published'
    AND coalesce(pd.draft_format->>'youtube_upload_error','') ILIKE '%invalid_grant%'
    AND ( (pd.draft_format->>'youtube_video_id') IS NOT NULL
          OR EXISTS (SELECT 1 FROM m.post_publish pp WHERE pp.post_draft_id = pd.post_draft_id AND pp.platform = 'youtube') );
  IF v_guard_fail > 0 THEN
    RAISE EXCEPTION 'ABORT: % B2-predicate rows fail the no-upload guard (have a YT id or a YT post_publish)', v_guard_fail;
  END IF;

  ----------------------------------------------------------------------------------
  -- GATE 3: no B3 (never-connected / No-refresh-token / null-client) row in the set.
  ----------------------------------------------------------------------------------
  SELECT count(*) INTO v_b3_in_set
  FROM m.post_draft pd
  WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
    AND pd.video_status = 'failed'
    AND pd.approval_status = 'published'
    AND coalesce(pd.draft_format->>'youtube_upload_error','') ILIKE '%invalid_grant%'
    AND ( coalesce(pd.draft_format->>'youtube_upload_error','') ILIKE '%no refresh token%'
          OR pd.client_id IS NULL );
  IF v_b3_in_set > 0 THEN
    RAISE EXCEPTION 'ABORT: % B3/no-refresh-token/null-client rows leaked into the B2 set', v_b3_in_set;
  END IF;

  ----------------------------------------------------------------------------------
  -- GATE 4: every remaining 'failed' video row must be a KNOWN bucket (B2 or B3).
  -- UNKNOWN = a failed video row that is neither B2 (invalid_grant) nor B3 (no refresh token).
  ----------------------------------------------------------------------------------
  SELECT count(*) INTO v_unknown_failed
  FROM m.post_draft pd
  WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
    AND pd.video_status = 'failed'
    AND NOT (
      -- B2: token-refresh invalid_grant
      coalesce(pd.draft_format->>'youtube_upload_error','') ILIKE '%invalid_grant%'
      OR
      -- B3: never-connected channel
      coalesce(pd.draft_format->>'youtube_upload_error','') ILIKE '%no refresh token%'
    );
  IF v_unknown_failed > 0 THEN
    RAISE EXCEPTION 'ABORT: % UNKNOWN failed video rows (neither B2 nor B3) — investigate before recovery', v_unknown_failed;
  END IF;

  ----------------------------------------------------------------------------------
  -- SNAPSHOT FIRST (audit / rollback): capture the exact pre-state of the 17 B2 rows.
  -- Reached only after all gates pass.
  ----------------------------------------------------------------------------------
  CREATE TABLE m.yt_b2_recovery_snapshot_20260526 AS
  SELECT pd.post_draft_id, pd.video_status, pd.approval_status, pd.draft_format, pd.updated_at, now() AS snapshot_at
  FROM m.post_draft pd
  WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
    AND pd.video_status = 'failed'
    AND pd.approval_status = 'published'
    AND coalesce(pd.draft_format->>'youtube_upload_error','') ILIKE '%invalid_grant%'
    AND pd.video_url IS NOT NULL
    AND (pd.draft_format->>'youtube_video_id') IS NULL
    AND NOT EXISTS (SELECT 1 FROM m.post_publish pp WHERE pp.post_draft_id = pd.post_draft_id AND pp.platform = 'youtube');

  ----------------------------------------------------------------------------------
  -- RECOVERY UPDATE — bounded to exactly the snapshotted ids.
  --   video_status 'failed' -> 'generated'
  --   strip stale YouTube error/retry/dead keys
  --   youtube_upload_attempts = 0
  --   add audit breadcrumb; approval_status PRESERVED (NOT written)
  ----------------------------------------------------------------------------------
  UPDATE m.post_draft pd
  SET video_status = 'generated',
      draft_format = (pd.draft_format
                        - ARRAY['youtube_upload_error','youtube_retry_after','youtube_dead_reason','youtube_upload_attempted'])
                      || jsonb_build_object(
                           'youtube_upload_attempts', 0,
                           'youtube_b2_recovery', 'unit_b2_token_casualty_20260526',
                           'youtube_b2_recovered_from_video_status', 'failed',
                           'youtube_b2_approval_status_preserved', 'published'
                         ),
      updated_at = now()
  WHERE pd.post_draft_id IN (SELECT post_draft_id FROM m.yt_b2_recovery_snapshot_20260526);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Unit B-2: % rows reset failed->generated (approval_status preserved; B1/B3 untouched)', v_updated;
  IF v_updated <> 17 THEN
    RAISE EXCEPTION 'ABORT: UPDATE touched % rows, expected 17 — rolling back', v_updated;
  END IF;
END $$;

-- =====================================================================================
-- POST-APPLY VERIFICATION — read-only SELECTs. Run SEPARATELY after the DO block commits.
-- (These mutate nothing; they confirm the recovery landed as scoped.)
-- =====================================================================================

-- V1) B2 count remaining — EXPECT 0 (all 17 recovered out of 'failed').
SELECT count(*) AS b2_remaining_failed
FROM m.post_draft pd
WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
  AND pd.video_status = 'failed'
  AND pd.approval_status = 'published'
  AND coalesce(pd.draft_format->>'youtube_upload_error','') ILIKE '%invalid_grant%';

-- V2) Generated-pool guard — the recovered set must be clean (EXPECT recovered=17, all guards 0).
SELECT
  count(*) FILTER (WHERE pd.draft_format ? 'youtube_b2_recovery')                       AS recovered_marked,
  count(*) FILTER (WHERE pd.draft_format->>'youtube_video_id' IS NOT NULL)              AS with_youtube_video_id,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM m.post_publish pp
                                 WHERE pp.post_draft_id = pd.post_draft_id AND pp.platform='youtube')) AS with_youtube_post_publish,
  count(*) FILTER (WHERE pd.draft_format ? 'youtube_upload_error')                      AS with_stale_error
FROM m.post_draft pd
WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
  AND pd.video_status = 'generated'
  AND pd.draft_format ? 'youtube_b2_recovery';

-- V3) Remaining failed bucket classification — EXPECT only B3 (9 'No refresh token' / published).
SELECT
  coalesce(pd.draft_format->>'youtube_upload_error','NO_ERROR') AS youtube_error,
  pd.approval_status,
  count(*) AS n
FROM m.post_draft pd
WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
  AND pd.video_status = 'failed'
GROUP BY 1, 2
ORDER BY n DESC, youtube_error, approval_status;

-- V4) Current distribution over the YouTube video formats.
SELECT pd.video_status, count(*) AS n
FROM m.post_draft pd
WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
GROUP BY pd.video_status
ORDER BY pd.video_status;
