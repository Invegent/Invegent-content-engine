-- Migration: favatar_render_latency_recovery_fix1_gate_release_add_avatar
-- F-AVATAR-RENDER-LATENCY-RECOVERY — Fix 1 (forward-looking only).
--
-- PROBLEM: 'video_short_avatar' was omitted from the video-format list in BOTH
--   m.gate_queue_on_asset_status() and m.release_queue_on_asset_ready(). So an
--   avatar draft whose HeyGen video is still pending was NOT held by the +4h gate
--   and, once rendered, was NOT released-with-preserved-schedule like the other
--   video formats — leaving avatar rows exposed to early publish and without the
--   intended-schedule recovery the other video formats already get.
--
-- FIX (list-only): add 'video_short_avatar' to the SAME video-format IN-list that
--   already contains video_short_kinetic / video_short_stat /
--   video_short_kinetic_voice / video_short_stat_voice, in both functions.
--   NOTHING ELSE CHANGES — image-format lists, the +4h hold, the Fix-1
--   GREATEST(COALESCE(post_draft.scheduled_for, slot.scheduled_publish_at), NOW())
--   release logic, the status='queued' + scheduled_for > NOW()+30min guard, the
--   SECURITY posture, and both triggers are all unchanged. CREATE OR REPLACE keeps
--   trg_gate_queue_on_asset_status / trg_release_queue_on_asset_ready bound.
--
-- FORWARD-LOOKING ONLY: no requeue, no retry, no cleanup, no mutation of existing
--   queue/draft rows except via future natural trigger firings. Existing
--   failed/skipped/dead rows are NOT resurrected (release only touches
--   status='queued' future-held rows). Historical cross-published rows untouched.
--
-- Baseline md5: gate    38fd402d845dbddca76c1d82b84760c8
--               release 81a3838841efaf60c11c40154ac8cd25
-- Rollback: re-apply the prior definitions (the two baseline md5 bodies above:
--   video list without 'video_short_avatar').

-- 1. gate: hold avatar queue rows when the video is not yet generated.
CREATE OR REPLACE FUNCTION m.gate_queue_on_asset_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_format       text;
  v_image_status text;
  v_video_status text;
BEGIN
  SELECT recommended_format, image_status, video_status
    INTO v_format, v_image_status, v_video_status
    FROM m.post_draft
   WHERE post_draft_id = NEW.post_draft_id;

  -- Image formats: hold when image not yet generated
  IF v_format IN ('image_quote','carousel','animated_text_reveal','animated_data')
     AND (v_image_status IS NULL OR v_image_status = 'pending')
  THEN
    NEW.scheduled_for := GREATEST(NEW.scheduled_for, NOW() + INTERVAL '4 hours');
  END IF;

  -- Video formats: hold when video not yet generated
  IF v_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar')
     AND (v_video_status IS NULL OR v_video_status = 'pending')
  THEN
    NEW.scheduled_for := GREATEST(NEW.scheduled_for, NOW() + INTERVAL '4 hours');
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. release: when the avatar video becomes ready, release with intended schedule.
CREATE OR REPLACE FUNCTION m.release_queue_on_asset_ready()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Image formats: release when image_status leaves 'pending' (generated, failed, skipped -- all release).
  -- F-SLOT-SCHEDULE-FIDELITY Fix 1: preserve intended future schedule instead of collapsing to NOW().
  IF OLD.image_status = 'pending' AND NEW.image_status != 'pending' THEN
    IF NEW.recommended_format IN ('image_quote','carousel','animated_text_reveal','animated_data') THEN
      UPDATE m.post_publish_queue q
         SET scheduled_for = GREATEST(
               COALESCE(
                 NEW.scheduled_for,
                 (SELECT s.scheduled_publish_at FROM m.slot s WHERE s.slot_id = NEW.slot_id)
               ),
               NOW()
             )
       WHERE q.post_draft_id = NEW.post_draft_id
         AND q.status        = 'queued'
         AND q.scheduled_for > NOW() + INTERVAL '30 minutes';  -- only touch held/future items
    END IF;
  END IF;

  -- Video formats: release when video_status leaves 'pending'
  IF OLD.video_status = 'pending' AND NEW.video_status != 'pending' THEN
    IF NEW.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar') THEN
      UPDATE m.post_publish_queue q
         SET scheduled_for = GREATEST(
               COALESCE(
                 NEW.scheduled_for,
                 (SELECT s.scheduled_publish_at FROM m.slot s WHERE s.slot_id = NEW.slot_id)
               ),
               NOW()
             )
       WHERE q.post_draft_id = NEW.post_draft_id
         AND q.status        = 'queued'
         AND q.scheduled_for > NOW() + INTERVAL '30 minutes';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
