-- Stage 1.007 — m.cron_health_check: heartbeat tracking for slot-driven crons
-- Distinct from existing m.cron_health_alert / m.cron_health_snapshot.
-- Each cron writes its jobname here on every tick (via m.heartbeat() helper, Stage 6).
-- m.check_cron_heartbeats() (Stage 6) compares last_heartbeat_at vs expected_interval
-- and raises slot_alerts when a cron stops heartbeating.

CREATE TABLE m.cron_health_check (
  jobname                   text PRIMARY KEY,
  last_heartbeat_at         timestamptz,
  expected_interval_minutes integer NOT NULL,
    -- expected gap between heartbeats; alerts fire at 1.5x this interval
  consecutive_misses        integer NOT NULL DEFAULT 0,
  last_alert_at             timestamptz,
    -- last time a missing-heartbeat alert was raised (rate-limit alerting)
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE m.cron_health_check IS
  'Heartbeat tracking for slot-driven Phase A/B crons. Read by m.check_cron_heartbeats() (Stage 6). Stage 1.007.';

-- Seed the 10 expected jobnames (per v4 expected count). Stage 6 registers the
-- corresponding cron entries; this seed pre-populates the rows so the heartbeat
-- helper can UPDATE in place from tick 1.
INSERT INTO m.cron_health_check (jobname, expected_interval_minutes, notes) VALUES
  ('expire-signal-pool-hourly',                60,   'Stage 6. Expires pool entries past pool_expires_at.'),
  ('reconcile-signal-pool-daily',              1440, 'Stage 6. Full pool recompute on class drift.'),
  ('backfill-missing-pool-entries-every-15m',  15,   'Stage 6. Async race miss backfill (LD19 batch limited).'),
  ('materialise-slots-nightly',                1440, 'Stage 6. Materialises next 7 days of slots.'),
  ('promote-slots-to-pending-every-5m',        5,    'Stage 6. future → pending_fill at fill_window_opens_at.'),
  ('fill-pending-slots-every-10m',             10,   'Stage 10. The fill function tick.'),
  ('recover-stuck-fill-in-progress-every-15m', 15,   'Stage 10. fill_in_progress > 1h → pending_fill (LD13/F10).'),
  ('try-urgent-breaking-fills-every-15m',      15,   'Stage 10. Breaking news auto-insert (LD17/LD20).'),
  ('critical-window-monitor-every-30m',        30,   'Stage 10. Alerts on slots <2h to publish unfilled.'),
  ('pool-health-check-hourly',                 60,   'Stage 10. Per-vertical pool depth assessment.');

-- Sanity: 10 rows seeded
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM m.cron_health_check;
  IF v_count <> 10 THEN
    RAISE EXCEPTION 'cron_health_check seed count expected 10, got %', v_count;
  END IF;
END $$;
