-- Stage 10.047 — Register 5 Phase B crons
-- Each Phase B cron wraps its function call with m.heartbeat() so heartbeats
-- happen on every tick. Jobnames + intervals match the rows pre-seeded in
-- m.cron_health_check (per D161 live-state-authoritative).
--
-- Per D179 ordering: this migration MUST apply after 046 (shadow filter on
-- f.ai_worker_lock_jobs_v1) so the R6 ai-worker (jobid 5) does not pick up
-- the shadow ai_jobs produced by m.fill_pending_slots(p_shadow := true).

-- 1. Fill pending slots — every 10 minutes (shadow mode)
SELECT cron.schedule(
  'fill-pending-slots-every-10m',
  '*/10 * * * *',
  $cron$
    SELECT m.heartbeat('fill-pending-slots-every-10m');
    SELECT m.fill_pending_slots(p_max_slots := 5, p_shadow := true);
  $cron$
);

-- 2. Recover stuck fill_in_progress slots — every 15 minutes
SELECT cron.schedule(
  'recover-stuck-fill-in-progress-every-15m',
  '*/15 * * * *',
  $cron$
    SELECT m.heartbeat('recover-stuck-fill-in-progress-every-15m');
    SELECT m.recover_stuck_slots();
  $cron$
);

-- 3. Try urgent breaking-news fills — every 15 minutes
SELECT cron.schedule(
  'try-urgent-breaking-fills-every-15m',
  '*/15 * * * *',
  $cron$
    SELECT m.heartbeat('try-urgent-breaking-fills-every-15m');
    SELECT m.try_urgent_breaking_fills();
  $cron$
);

-- 4. Critical-window monitor — every 30 minutes
SELECT cron.schedule(
  'critical-window-monitor-every-30m',
  '*/30 * * * *',
  $cron$
    SELECT m.heartbeat('critical-window-monitor-every-30m');
    SELECT m.scan_critical_windows();
  $cron$
);

-- 5. Pool health check — hourly at minute 15 (offset from minute 5 expire and minute 45 heartbeat-check so they don't collide).
-- m.check_pool_health is STABLE; pg_cron is fine with SELECT returning rows. (Brief suggested PERFORM, but PERFORM is PL/pgSQL-only and invalid in a plain-SQL cron body — using SELECT-and-discard, which the brief listed as the equivalent option.)
SELECT cron.schedule(
  'pool-health-check-hourly',
  '15 * * * *',
  $cron$
    SELECT m.heartbeat('pool-health-check-hourly');
    SELECT m.check_pool_health(NULL);
  $cron$
);
