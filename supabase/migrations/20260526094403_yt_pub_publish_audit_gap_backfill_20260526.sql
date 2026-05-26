-- RECONSTRUCTED 2026-05-26 from supabase_migrations.schema_migrations (version 20260526094403),
-- applied to production via Supabase MCP apply_migration 2026-05-26 (F-YT-PUB-PUBLISH-AUDIT-GAP Unit B backfill, by CCD; sql_destructive D-01 998c90a3 + PK phrase);
-- .sql file was never committed. Repo-only drift closure — no DB change (version already recorded as applied).
-- Backfills the 11 missing YouTube m.post_publish audit rows for cross-posted drafts (non-colliding attempt_no).
DO $$
DECLARE
  v_cohort   int;
  v_bad      int;
  v_dup      int;
  v_inserted int;
  c_expected constant int := 11;  -- PK-approved cohort size; ABORT if live count differs (re-confirm)
BEGIN
  CREATE TEMP TABLE _bf ON COMMIT DROP AS
  SELECT pd.post_draft_id, pd.client_id,
         pd.draft_format->>'youtube_video_id'  AS yt_id,
         pd.draft_format->>'youtube_url'        AS yt_url,
         coalesce((pd.draft_format->>'youtube_published')::timestamptz, now()) AS pub_at
  FROM m.post_draft pd
  WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
    AND pd.video_status = 'published'
    AND pd.draft_format->>'youtube_video_id' IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM m.post_publish pp WHERE pp.post_draft_id = pd.post_draft_id AND pp.platform = 'youtube');

  SELECT count(*) INTO v_cohort FROM _bf;
  IF v_cohort <> c_expected THEN
    RAISE EXCEPTION 'ABORT: live cohort=% but PK-approved expected=% — re-confirm before backfill', v_cohort, c_expected;
  END IF;

  SELECT count(*) INTO v_bad FROM _bf WHERE yt_id IS NULL OR client_id IS NULL;
  IF v_bad > 0 THEN RAISE EXCEPTION 'ABORT: % cohort rows have null youtube_video_id / client_id', v_bad; END IF;

  SELECT count(*) INTO v_dup FROM _bf b
    WHERE EXISTS (SELECT 1 FROM m.post_publish pp WHERE pp.post_draft_id = b.post_draft_id AND pp.platform = 'youtube');
  IF v_dup > 0 THEN RAISE EXCEPTION 'ABORT: % cohort rows already have a YouTube post_publish (dup risk)', v_dup; END IF;

  CREATE TABLE m.yt_audit_backfill_snapshot_20260526 AS SELECT *, now() AS snapshot_at FROM _bf;

  INSERT INTO m.post_publish (post_draft_id, client_id, platform, platform_post_id, published_at, status, attempt_no, response_payload)
  SELECT b.post_draft_id, b.client_id, 'youtube', b.yt_id, b.pub_at, 'published',
         (SELECT coalesce(max(pp.attempt_no),0)+1 FROM m.post_publish pp WHERE pp.post_draft_id = b.post_draft_id),
         jsonb_build_object(
           'youtube_url', coalesce(b.yt_url, 'https://www.youtube.com/watch?v=' || b.yt_id),
           'privacy_status', 'unlisted',
           'backfill', 'f_yt_pub_publish_audit_gap_20260526',
           'backfill_reason', 'attempt_no_collision_recovered'
         )
  FROM _bf b;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RAISE NOTICE 'F-YT-PUB-PUBLISH-AUDIT-GAP backfill: inserted % youtube post_publish rows', v_inserted;
  IF v_inserted <> c_expected THEN
    RAISE EXCEPTION 'ABORT: inserted % rows, expected % — rolling back', v_inserted, c_expected;
  END IF;
END $$;