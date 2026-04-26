-- Stage 9.042 — scan_critical_windows function (§B.11)
--
-- Iterate critical-urgency slots from m.slots_in_critical_window.
-- For each, raise a slot_critical_window alert (severity=critical) if no
-- such alert exists for that slot in the last 30 min (rate-limit).
--
-- Returns jsonb with counts per urgency tier.

CREATE OR REPLACE FUNCTION m.scan_critical_windows()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_alerts_raised integer := 0;
  v_critical_count integer;
  v_warning_count  integer;
  v_info_count     integer;
  v_slot record;
BEGIN
  FOR v_slot IN
    SELECT * FROM m.slots_in_critical_window WHERE urgency = 'critical'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM m.slot_alerts
      WHERE slot_id = v_slot.slot_id
        AND alert_kind = 'slot_critical_window'
        AND created_at > NOW() - interval '30 minutes'
    ) THEN
      INSERT INTO m.slot_alerts (
        alert_id, alert_kind, severity, client_id, platform, slot_id,
        payload, message, created_at
      ) VALUES (
        gen_random_uuid(), 'slot_critical_window', 'critical',
        v_slot.client_id, v_slot.platform, v_slot.slot_id,
        jsonb_build_object(
          'minutes_until_publish', v_slot.minutes_until_publish,
          'status',                v_slot.status,
          'scheduled_publish_at',  v_slot.scheduled_publish_at,
          'urgency',               v_slot.urgency
        ),
        format('Slot %s for %s/%s in critical window: %.1f minutes to publish, status=%s',
               v_slot.slot_id, v_slot.client_name, v_slot.platform,
               v_slot.minutes_until_publish, v_slot.status),
        NOW()
      );
      v_alerts_raised := v_alerts_raised + 1;
    END IF;
  END LOOP;

  SELECT COUNT(*) FILTER (WHERE urgency='critical'),
         COUNT(*) FILTER (WHERE urgency='warning'),
         COUNT(*) FILTER (WHERE urgency='info')
  INTO v_critical_count, v_warning_count, v_info_count
  FROM m.slots_in_critical_window;

  RETURN jsonb_build_object(
    'alerts_raised',  v_alerts_raised,
    'critical_count', v_critical_count,
    'warning_count',  v_warning_count,
    'info_count',     v_info_count,
    'ran_at',         NOW()
  );
END;
$$;

COMMENT ON FUNCTION m.scan_critical_windows() IS
  'Raise slot_critical_window alerts for slots in critical urgency tier. Rate-limited to one per slot per 30 min. Stage 9.042.';
