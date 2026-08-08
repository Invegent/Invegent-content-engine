-- =====================================================================
-- SILENT SCHEDULE-LOSS DETECTOR v1  --  READ-ONLY.  NOT A MIGRATION.
-- =====================================================================
-- Deliberately NOT a timestamped migration filename and deliberately NOT in
-- supabase/migrations/ -- it must never be swept into an apply run.
-- Contains ZERO DDL and ZERO DML. It is a SELECT. Nothing here repairs anything.
--
-- Authored: 2026-08-08 Sydney, CGU final-watch window (PK directive: bounded
--   read-only detector for the two PROVEN silent-loss classes; no automated
--   repair, no production mutation).
--
-- WHAT IT DETECTS -- an approved draft is bound to a filled slot, the slot's
--   publish time is approaching or past, and no publication can result:
--
--   A_NO_RENDER_ATTEMPT    approved draft, zero rows in m.post_render_log.
--                          The worker never picked it up. Nothing failed loudly;
--                          the slot simply yields nothing.
--                          Proven instance: slot 13d7bc12 (PP YT, 2026-08-03).
--
--   B_ALL_RENDERS_FAILED   approved draft, render rows exist, none succeeded,
--                          no video_url. Terminal per video-worker design
--                          (the poll SELECT only re-picks video_status='pending'),
--                          so it will never retry itself.
--                          Proven instance: slot c1f38536 (PP YT, 2026-08-13).
--
-- VALIDATION (live, 2026-08-08): fires on BOTH proven instances. For c1f38536 it
--   fires at +126.6h before publish -- i.e. it would have surfaced that loss more
--   than five days early. For 13d7bc12 it fires (retrospectively) on a slot whose
--   publish date passed with nobody noticing.
--
-- ⚠ TRIAGE IS NOT DETECTION. A hit is "no publication can result", NOT "this is a
--   defect". Deliberate abandonment looks identical from here. In the first live
--   run, the 2026-04-27..05-25 video_short_avatar cluster (17 hits) most likely
--   correlates with ledger 20260508052400
--   f_yt_pub_avatar_exclusion_remove_youtube_from_avatar_platform_support, which
--   removed YouTube from avatar platform support. Do NOT report raw hit counts as
--   losses without triage.
--
-- SCOPE FENCE: video formats only. The two proven classes are both video-render
--   losses. An image/text equivalent is plausible but UNPROVEN -- do not widen
--   this detector on speculation; widen it when a case is proven.
--
-- USAGE (read-only; safe to run any time, including during a production-write watch):
--   psql/execute_sql -- SELECT ... below. Set p_horizon_hours to bound the window.
--   Recommended operator cadence: daily, alert on hours_to_publish BETWEEN 0 AND 72
--   (that band is the actionable one -- still recoverable by re-render).
--
-- NOT DONE / DELIBERATELY OUT OF SCOPE: no ice_ro view is created here. Promoting
--   this to a curated R0 view is a separate T2 lane under the normal gate (see the
--   CLAUDE.md coverage-gap rule) and needs PK's word.
-- =====================================================================

WITH bound AS (
  SELECT s.slot_id, s.client_id, s.platform, s.format_chosen, s.scheduled_publish_at,
         s.status AS slot_status,
         d.post_draft_id, d.approval_status, d.video_status, d.video_url,
         (d.draft_format->>'video_dead_reason')     AS video_dead_reason,
         (d.draft_format->>'video_render_attempts') AS video_render_attempts,
         s.format_chosen LIKE 'video%'              AS is_video
  FROM m.slot s
  JOIN m.post_draft d ON d.post_draft_id = s.filled_draft_id
  WHERE s.status = 'filled'
    AND d.approval_status = 'approved'
), enriched AS (
  SELECT b.*,
    (SELECT count(*) FROM m.post_render_log r
      WHERE r.post_draft_id = b.post_draft_id)                        AS render_rows,
    (SELECT count(*) FROM m.post_render_log r
      WHERE r.post_draft_id = b.post_draft_id AND r.status='succeeded') AS render_ok,
    (SELECT max(r.created_at) FROM m.post_render_log r
      WHERE r.post_draft_id = b.post_draft_id)                        AS last_render_at,
    (SELECT count(*) FROM m.post_publish p
      WHERE p.post_draft_id = b.post_draft_id AND p.status='published') AS published,
    round(EXTRACT(epoch FROM (b.scheduled_publish_at - now()))/3600.0, 1) AS hours_to_publish
  FROM bound b
)
SELECT
  CASE WHEN render_rows = 0 THEN 'A_NO_RENDER_ATTEMPT'
       ELSE 'B_ALL_RENDERS_FAILED' END               AS loss_class,
  CASE WHEN hours_to_publish < 0            THEN 'LOST_ALREADY'
       WHEN hours_to_publish <= 72          THEN 'ACTIONABLE_NOW'
       ELSE 'WATCH' END                              AS urgency,
  slot_id, client_id, platform, format_chosen,
  scheduled_publish_at, hours_to_publish,
  post_draft_id, video_status, render_rows, render_ok, last_render_at,
  video_render_attempts, video_dead_reason
FROM enriched
WHERE is_video
  AND published = 0
  AND render_ok = 0          -- covers class A (0 rows) and class B (rows, none ok)
ORDER BY scheduled_publish_at DESC;
