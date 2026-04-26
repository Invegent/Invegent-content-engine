-- Stage 6.029 — Heartbeat helper + cron health view + heartbeat-check function

-- Helper: each Phase A cron calls this at the start of its command
CREATE OR REPLACE FUNCTION m.heartbeat(p_jobname text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE m.cron_health_check
  SET last_heartbeat_at = now(),
      consecutive_misses = 0,
      updated_at = now()
  WHERE jobname = p_jobname;

  -- If the row doesn't exist (cron added without seed), create it permissively
  IF NOT FOUND THEN
    INSERT INTO m.cron_health_check (jobname, last_heartbeat_at, expected_interval_minutes, notes)
    VALUES (p_jobname, now(), 60, 'Auto-created on first heartbeat');
  END IF;
END;
$$;

COMMENT ON FUNCTION m.heartbeat(text) IS
  'Records a cron heartbeat in m.cron_health_check. Each Phase A cron calls this at start of command. Stage 6.029.';

-- View: human-readable health status across all tracked crons
CREATE OR REPLACE VIEW m.cron_health_status AS
SELECT
  c.jobname,
  c.last_heartbeat_at,
  c.expected_interval_minutes,
  c.consecutive_misses,
  CASE
    WHEN c.last_heartbeat_at IS NULL THEN 'never_fired'
    WHEN c.last_heartbeat_at >
         now() - (c.expected_interval_minutes * interval '1 minute') THEN 'green'
    WHEN c.last_heartbeat_at >
         now() - (1.5 * c.expected_interval_minutes * interval '1 minute') THEN 'yellow'
    ELSE 'red'
  END AS status,
  EXTRACT(epoch FROM (now() - c.last_heartbeat_at)) / 60 AS minutes_since_last
FROM m.cron_health_check c
ORDER BY c.jobname;

COMMENT ON VIEW m.cron_health_status IS
  'Human-readable cron health: green/yellow/red based on last_heartbeat_at vs expected_interval. Stage 6.029.';

-- Check function: scans for crons over 1.5x interval; raises slot_alerts
CREATE OR REPLACE FUNCTION m.check_cron_heartbeats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_alerted_count integer := 0;
  v_row record;
BEGIN
  FOR v_row IN
    SELECT jobname, last_heartbeat_at, expected_interval_minutes, last_alert_at
    FROM m.cron_health_check
    WHERE last_heartbeat_at IS NOT NULL  -- ignore never-fired (handled differently)
      AND last_heartbeat_at < now() - (1.5 * expected_interval_minutes * interval '1 minute')
      -- Rate-limit: don't spam alerts; only re-alert after 1 hour
      AND (last_alert_at IS NULL OR last_alert_at < now() - interval '1 hour')
  LOOP
    INSERT INTO m.slot_alerts (alert_kind, severity, payload, message)
    VALUES (
      'cron_heartbeat_missing',
      CASE
        WHEN v_row.expected_interval_minutes <= 5 THEN 'critical'
        WHEN v_row.expected_interval_minutes <= 30 THEN 'warning'
        ELSE 'info'
      END,
      jsonb_build_object(
        'jobname', v_row.jobname,
        'last_heartbeat_at', v_row.last_heartbeat_at,
        'expected_interval_minutes', v_row.expected_interval_minutes,
        'minutes_since_last', EXTRACT(epoch FROM (now() - v_row.last_heartbeat_at)) / 60
      ),
      format('Cron %s missed heartbeat. Last seen %s minutes ago (interval %s min).',
             v_row.jobname,
             ROUND(EXTRACT(epoch FROM (now() - v_row.last_heartbeat_at)) / 60),
             v_row.expected_interval_minutes)
    );

    UPDATE m.cron_health_check
    SET last_alert_at = now(),
        consecutive_misses = consecutive_misses + 1,
        updated_at = now()
    WHERE jobname = v_row.jobname;

    v_alerted_count := v_alerted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'alerted_count', v_alerted_count,
    'ran_at', now()
  );
END;
$$;

COMMENT ON FUNCTION m.check_cron_heartbeats() IS
  'Scans cron_health_check for missed heartbeats (>1.5x interval). Raises slot_alerts of cron_heartbeat_missing kind. Rate-limited 1h between alerts per jobname. Stage 6.029.';
