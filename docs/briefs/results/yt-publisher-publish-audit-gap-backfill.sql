-- =====================================================================================
-- F-YT-PUB-PUBLISH-AUDIT-GAP — Unit B backfill DML
-- Insert the missing YouTube m.post_publish audit rows for cross-posted drafts that
-- published to YouTube under the old hardcoded attempt_no=1 (collided on uq_publish_attempt).
--
-- STATUS: PREPARED ARTIFACT — *** DO NOT RUN AS-IS ***.
--   Gated on: Unit A (youtube-publisher v1.10.0) DEPLOYED first (DONE — live, ef_deploy D-01
--   5bd19069) + a fresh sql_destructive D-01 + PK approval phrase. Apply via Supabase apply_migration.
--
-- COHORT (re-measured 2026-05-26 post v1.10.0 deploy): 11 drafts (2 v3.10-B2 + 9 pre-existing
--   historical), all with a youtube_video_id + youtube_published, 0 null client. v1.10.0 being live
--   means newly-draining B2 drafts get correct rows, so the cohort is bounded to these 11.
--
-- SAFETY (hard-aborts before any insert):
--   * cohort must equal the PK-approved expected count (c_expected), else ABORT (re-confirm).
--   * no cohort row may have a null youtube_video_id or null client_id.
--   * no cohort row may already have a YouTube post_publish (dedupe — redundant w/ predicate).
--   * inserts a non-colliding attempt_no = per-draft max(attempt_no)+1.
--   * platform_post_id = draft_format.youtube_video_id; published_at = draft_format.youtube_published.
--   * Facebook rows NEVER touched; B3/no-channel drafts excluded by construction (no youtube_video_id).
--   * ROW_COUNT must equal the cohort, else ABORT/rollback.
-- ROLLBACK: m.yt_audit_backfill_snapshot_20260526 holds the cohort; inserted rows are identifiable
--   by response_payload->>'backfill' = 'f_yt_pub_publish_audit_gap_20260526'.
-- =====================================================================================

DO $$
DECLARE
  v_cohort   int;
  v_bad      int;
  v_dup      int;
  v_inserted int;
  c_expected constant int := 11;  -- PK-approved cohort size; ABORT if live count differs (re-confirm)
BEGIN
  -- cohort: published video drafts with a youtube_video_id but no youtube post_publish row
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

  -- snapshot (audit / rollback) — reached only after gates pass
  CREATE TABLE m.yt_audit_backfill_snapshot_20260526 AS SELECT *, now() AS snapshot_at FROM _bf;

  -- backfill: one youtube post_publish row per cohort draft, non-colliding attempt_no
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

-- =====================================================================================
-- POST-APPLY VERIFICATION (read-only) — run SEPARATELY after the DO block commits.
-- =====================================================================================

-- V1) remaining audit-gap cohort — EXPECT 0
SELECT count(*) AS gap_remaining
FROM m.post_draft pd
WHERE pd.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
  AND pd.video_status='published'
  AND pd.draft_format->>'youtube_video_id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM m.post_publish pp WHERE pp.post_draft_id=pd.post_draft_id AND pp.platform='youtube');

-- V2) backfilled rows — EXPECT 11, each platform_post_id == the draft's youtube_video_id, no FB row touched
SELECT count(*) AS backfilled_rows,
       count(*) FILTER (WHERE pp.platform='youtube') AS as_youtube,
       count(*) FILTER (WHERE pp.platform_post_id = pd.draft_format->>'youtube_video_id') AS id_matches_draft
FROM m.post_publish pp
JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
WHERE pp.response_payload->>'backfill' = 'f_yt_pub_publish_audit_gap_20260526';

-- V3) no duplicate youtube rows per draft — EXPECT 0
SELECT count(*) AS drafts_with_multiple_yt_rows FROM (
  SELECT post_draft_id FROM m.post_publish WHERE platform='youtube' GROUP BY post_draft_id HAVING count(*) > 1) x;

-- V4) Facebook rows untouched — EXPECT unchanged FB count
SELECT count(*) AS facebook_rows_total FROM m.post_publish WHERE platform='facebook';
