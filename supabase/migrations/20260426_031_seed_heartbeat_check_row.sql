-- Stage 6.031 — Add cron-heartbeat-check-hourly to m.cron_health_check seed
-- (Stage 1 seeded 10 jobnames; this is the 11th, separately because it monitors itself)

INSERT INTO m.cron_health_check (jobname, expected_interval_minutes, notes)
VALUES (
  'cron-heartbeat-check-hourly',
  60,
  'Stage 6. Self-monitoring: writes its own heartbeat then checks all others.'
)
ON CONFLICT (jobname) DO NOTHING;

-- Sanity
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM m.cron_health_check;
  IF v_count <> 11 THEN
    RAISE EXCEPTION 'cron_health_check expected 11 rows after Stage 6.031, got %', v_count;
  END IF;
END $$;
