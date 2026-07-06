-- =============================================================================
-- S1 — HOURLY SHADOW-STAMPING CRON (D-01, sql_destructive class) — PREPARED
-- _harness/s1-hourly-cron-schedule.sql
--
-- Authority: S1 ratified design (docs/briefs/s1-forward-shadow-stamping-packet.md —
--   "hourly context"; result doc §6a/b: cron = the final S1 gate) + PK 2026-07-06
--   "Finish TMR pilot closure — run S1 hourly cron gate / D-01".
-- Function: public.stamp_tmr_shadow_forward() — live since v4.86 (ledger 20260703130939),
--   supervised-proven twice (no-op 2026-07-03; real stamp 2026-07-05 = the first
--   `agreement` row). Idempotent (NOT-EXISTS + partial unique index); concurrent-run
--   race aborts atomically; caps at 20/run (clamp 1..100); writes ONLY c.tmr_shadow_decision.
--
-- WHAT IT DOES: schedules ONE pg_cron job:
--   name    'tmr-shadow-stamp-hourly'
--   spec    '5 * * * *'  (hourly at :05 — offset from the :00/:15/:30/:45 image-worker
--           ticks so fresh renders settle before stamping)
--   command SELECT public.stamp_tmr_shadow_forward();
--   (runs as the cron owner; the SECDEF function's own posture governs its writes)
--
-- Pre-asserts (fail-closed): function exists+SECDEF · no job-name clash.
--
-- ⛔ APPLY IS PK-GATED (D-01: hash-pinned external review sql_destructive + PK directive).
-- ROLLBACK: SELECT cron.unschedule('tmr-shadow-stamp-hourly');  -- single call, complete
-- =============================================================================

DO $s1cron$
DECLARE
  v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM pg_proc p
  WHERE p.proname = 'stamp_tmr_shadow_forward' AND p.pronamespace = 'public'::regnamespace AND p.prosecdef;
  IF v_n <> 1 THEN RAISE EXCEPTION 's1cron abort: stamper function missing or not SECDEF (%)', v_n; END IF;

  SELECT count(*) INTO v_n FROM cron.job WHERE jobname = 'tmr-shadow-stamp-hourly';
  IF v_n <> 0 THEN RAISE EXCEPTION 's1cron abort: job name already scheduled (% rows)', v_n; END IF;

  PERFORM cron.schedule('tmr-shadow-stamp-hourly', '5 * * * *', 'SELECT public.stamp_tmr_shadow_forward();');

  SELECT count(*) INTO v_n FROM cron.job WHERE jobname = 'tmr-shadow-stamp-hourly' AND active;
  IF v_n <> 1 THEN RAISE EXCEPTION 's1cron abort: job not active after schedule (%)', v_n; END IF;

  RAISE NOTICE 's1 cron scheduled: tmr-shadow-stamp-hourly @ 5 * * * *';
END
$s1cron$;
