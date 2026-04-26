-- Stage 6.030 — Register 5 Phase A crons + 1 heartbeat-check cron
-- Each Phase A cron wraps its function call with m.heartbeat() so heartbeats
-- happen on every tick.

-- 1. Pool expiry — hourly at minute 5
SELECT cron.schedule(
  'expire-signal-pool-hourly',
  '5 * * * *',
  $cron$
    SELECT m.heartbeat('expire-signal-pool-hourly');
    SELECT m.expire_signal_pool();
  $cron$
);

-- 2. Pool reconciliation — daily at 16:30 UTC (~02:30/03:30 AEST)
SELECT cron.schedule(
  'reconcile-signal-pool-daily',
  '30 16 * * *',
  $cron$
    SELECT m.heartbeat('reconcile-signal-pool-daily');
    SELECT m.reconcile_signal_pool();
  $cron$
);

-- 3. Pool backfill — every 15 minutes (catches async-race misses)
SELECT cron.schedule(
  'backfill-missing-pool-entries-every-15m',
  '*/15 * * * *',
  $cron$
    SELECT m.heartbeat('backfill-missing-pool-entries-every-15m');
    SELECT m.backfill_missing_pool_entries();
  $cron$
);

-- 4. Slot materialisation — daily at 15:00 UTC (~01:00/02:00 AEST)
SELECT cron.schedule(
  'materialise-slots-nightly',
  '0 15 * * *',
  $cron$
    SELECT m.heartbeat('materialise-slots-nightly');
    SELECT m.materialise_slots(7);
  $cron$
);

-- 5. Slot promotion — every 5 minutes
SELECT cron.schedule(
  'promote-slots-to-pending-every-5m',
  '*/5 * * * *',
  $cron$
    SELECT m.heartbeat('promote-slots-to-pending-every-5m');
    SELECT m.promote_slots_to_pending();
  $cron$
);

-- 6. Heartbeat check — hourly at minute 45 (offset from minute 5 expire so they don't collide)
SELECT cron.schedule(
  'cron-heartbeat-check-hourly',
  '45 * * * *',
  $cron$
    SELECT m.heartbeat('cron-heartbeat-check-hourly');
    SELECT m.check_cron_heartbeats();
  $cron$
);
