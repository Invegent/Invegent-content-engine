-- Stage 9.040 — Recovery for stuck fill_in_progress slots (LD13/F10)
--
-- A slot transitions fill_in_progress when fill_pending_slots picks it up.
-- ai-worker should transition it forward (to filled) shortly after.
-- If ai-worker times out or errors, the slot can sit stuck.
-- This function detects and recovers them.
--
-- Behaviour:
--   - Find slots with status='fill_in_progress' AND filled_at older than threshold
--   - Count prior successful fill attempts for this slot via m.slot_fill_attempt
--     (decisions 'filled' or 'evergreen' represent successful pickups)
--   - If attempts < max: reset slot to pending_fill, audit row with decision='recovered_to_pending'
--   - If attempts >= max: mark slot failed, audit row + raise slot_recovery_exhausted alert
--
-- Defaults: stale=30 min, max_attempts=3 (matches D157 pattern from R6 ai-worker).
--
-- Returns jsonb {recovered_to_pending, marked_failed, alerts_raised, stale_threshold_minutes, max_attempts, ran_at}.

CREATE OR REPLACE FUNCTION m.recover_stuck_slots(
  p_stale_threshold_minutes integer DEFAULT 30,
  p_max_recovery_attempts   integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_recovered_to_pending integer := 0;
  v_marked_failed        integer := 0;
  v_alerts_raised        integer := 0;
  v_slot                 record;
  v_attempt_count        integer;
BEGIN
  FOR v_slot IN
    SELECT s.*
    FROM m.slot s
    WHERE s.status = 'fill_in_progress'
      AND s.filled_at < NOW() - (p_stale_threshold_minutes * interval '1 minute')
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT COUNT(*)
    INTO v_attempt_count
    FROM m.slot_fill_attempt
    WHERE slot_id = v_slot.slot_id
      AND decision IN ('filled', 'evergreen');

    IF v_attempt_count < p_max_recovery_attempts THEN
      -- Reset to pending_fill (clear all fill-state cols; honour evergreen_consistency CHECK)
      UPDATE m.slot
      SET status            = 'pending_fill',
          filled_draft_id   = NULL,
          canonical_ids     = NULL,
          evergreen_id      = NULL,
          is_evergreen      = false,
          format_chosen     = NULL,
          slot_confidence   = NULL,
          filled_at         = NULL,
          updated_at        = NOW()
      WHERE slot_id = v_slot.slot_id;

      INSERT INTO m.slot_fill_attempt (
        attempt_id, slot_id, attempted_at, pool_size_at_attempt,
        decision, skip_reason, threshold_relaxed, error_message, created_at
      ) VALUES (
        gen_random_uuid(), v_slot.slot_id, NOW(), 0,
        'recovered_to_pending',
        format('stuck_in_fill_in_progress_for_%s_minutes_or_more', p_stale_threshold_minutes),
        false, NULL, NOW()
      );

      v_recovered_to_pending := v_recovered_to_pending + 1;
    ELSE
      -- Mark failed; raise alert
      UPDATE m.slot
      SET status        = 'failed',
          skip_reason   = 'exceeded_recovery_attempts',
          updated_at    = NOW()
      WHERE slot_id = v_slot.slot_id;

      INSERT INTO m.slot_fill_attempt (
        attempt_id, slot_id, attempted_at, pool_size_at_attempt,
        decision, skip_reason, threshold_relaxed, error_message, created_at
      ) VALUES (
        gen_random_uuid(), v_slot.slot_id, NOW(), 0,
        'marked_failed', 'exceeded_recovery_attempts', false, NULL, NOW()
      );

      INSERT INTO m.slot_alerts (
        alert_id, alert_kind, severity, client_id, platform, slot_id,
        payload, message, created_at
      ) VALUES (
        gen_random_uuid(), 'slot_recovery_exhausted', 'warning',
        v_slot.client_id, v_slot.platform, v_slot.slot_id,
        jsonb_build_object(
          'attempts', v_attempt_count,
          'max_attempts', p_max_recovery_attempts,
          'scheduled_publish_at', v_slot.scheduled_publish_at,
          'stale_threshold_minutes', p_stale_threshold_minutes
        ),
        format('Slot %s exhausted recovery attempts (%s/%s). scheduled_publish_at=%s',
               v_slot.slot_id, v_attempt_count, p_max_recovery_attempts,
               v_slot.scheduled_publish_at),
        NOW()
      );

      v_marked_failed := v_marked_failed + 1;
      v_alerts_raised := v_alerts_raised + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'recovered_to_pending',     v_recovered_to_pending,
    'marked_failed',            v_marked_failed,
    'alerts_raised',            v_alerts_raised,
    'stale_threshold_minutes',  p_stale_threshold_minutes,
    'max_attempts',             p_max_recovery_attempts,
    'ran_at',                   NOW()
  );
END;
$$;

COMMENT ON FUNCTION m.recover_stuck_slots(integer, integer) IS
  'LD13/F10 recovery for stuck fill_in_progress slots. Reset <max attempts back to pending_fill, mark >=max as failed + alert. Defaults: stale=30 min, max_attempts=3. Audit rows with decision=recovered_to_pending|marked_failed. Stage 9.040.';
