-- RECONSTRUCTED 2026-05-26 from supabase_migrations.schema_migrations (version 20260526091149),
-- applied to production via Supabase MCP apply_migration 2026-05-26 (Unit B-2, by CCD; sql_destructive D-01 2135ae11 + PK phrase);
-- .sql file was never committed. Repo-only drift closure — no DB change (version already recorded as applied).
-- F-YT-FAILED-NO-RETRY Unit B-2: recover the 17 token-casualty (invalid_grant/published) drafts; approval_status PRESERVED.
DO $$
DECLARE
  v_b2_count       int;
  v_guard_fail     int;
  v_b3_in_set      int;
  v_unknown_failed int;
  v_updated        int;
BEGIN
  -- GATE 1: exactly 17 B2 rows (exact predicate + no-upload guard).
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

  -- GATE 2: no-upload guard restated against the bare B2 predicate (defence in depth).
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

  -- GATE 3: no B3 (never-connected / No-refresh-token / null-client) row in the set.
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

  -- GATE 4: every remaining 'failed' video row must be a KNOWN bucket (B2 or B3).
  SELECT count(*) INTO v_unknown_failed
  FROM m.post_draft pd
  WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
    AND pd.video_status = 'failed'
    AND NOT (
      coalesce(pd.draft_format->>'youtube_upload_error','') ILIKE '%invalid_grant%'
      OR
      coalesce(pd.draft_format->>'youtube_upload_error','') ILIKE '%no refresh token%'
    );
  IF v_unknown_failed > 0 THEN
    RAISE EXCEPTION 'ABORT: % UNKNOWN failed video rows (neither B2 nor B3) — investigate before recovery', v_unknown_failed;
  END IF;

  -- SNAPSHOT FIRST (audit / rollback): capture the exact pre-state of the 17 B2 rows.
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

  -- RECOVERY UPDATE — bounded to exactly the snapshotted ids. approval_status PRESERVED (NOT written).
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