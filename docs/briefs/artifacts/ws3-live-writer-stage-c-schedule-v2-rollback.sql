-- ROLLBACK — WS-3 (b) STAGE C (schedule) v2
-- Pairs with: ws3-live-writer-stage-c-schedule-v2.sql   ·   Channel: execute_sql. ONE call.
--
-- EXECUTOR: the table owner / apply principal (postgres). service_role does NOT hold any
-- privilege on m.cron_health_check (relacl is postgres + inspector_ro only), so this file
-- is not executable as service_role. Declared here because v1 left the executor unstated.
--
-- ROLL BACK FIRST, before Stage B: while the job exists it can fire at 16:50 UTC and write
-- a NEW run, which would invalidate a Stage-B revert performed before it.
--
-- Apply/rollback identity: Stage C CREATED exactly two things — one m.cron_health_check row
-- (a plain INSERT, guarded by a NOT EXISTS precondition, so it can never have modified a
-- pre-existing row) and one cron.job. This file removes exactly those two.

DO $rb_c$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'asset-gap-analysis-daily';
  IF n > 0 THEN
    PERFORM cron.unschedule('asset-gap-analysis-daily');
  END IF;

  -- Qualified by the marker Stage C's INSERT wrote, and the row count asserted, so this
  -- PROVES it is removing the row Stage C created rather than assuming the sequence. An
  -- unqualified delete would destroy a row seeded by another lane — or auto-created by
  -- m.heartbeat() at the wrong 60-minute interval — with no before-image.
  -- (apply-harness-auditor AHA-02-11.)
  DELETE FROM m.cron_health_check
   WHERE jobname = 'asset-gap-analysis-daily'
     AND notes   = 'WS-3. Asset Gap analyzer live writer + auto-reconcile. Daily.';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'ws3-C rollback STOP: expected to remove exactly 1 health-check row bearing the WS-3 marker, removed % — a row exists that Stage C did not create; reconcile by hand, do not delete blind', n;
  END IF;

  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'asset-gap-analysis-daily';
  IF n <> 0 THEN RAISE EXCEPTION 'ws3-C rollback assert: job still scheduled'; END IF;
  SELECT count(*) INTO n FROM m.cron_health_check WHERE jobname = 'asset-gap-analysis-daily';
  IF n <> 0 THEN RAISE EXCEPTION 'ws3-C rollback assert: health-check row still present'; END IF;

  -- Scoped to WS-3's OWN identity (AHA-03-5). Rev-3 asserted a fleet-wide fact — that NO
  -- job holds the 16:50 slot — which let an unrelated third-party job legitimately
  -- scheduled at 16:50 raise here and, because this whole file is one DO block, roll the
  -- entire reversal back. WS-3 would have become unrollbackable until a frozen artifact
  -- was edited: the same class of defect as F-3. What this rollback is entitled to assert
  -- is that ITS job is gone, which the two checks above already prove. Fleet occupancy is
  -- reported, never enforced.
  SELECT count(*) INTO n FROM cron.job
   WHERE btrim(regexp_replace(schedule, '\s+', ' ', 'g')) = '50 16 * * *';
  IF n <> 0 THEN
    RAISE NOTICE 'ws3-C rollback note: % unrelated job(s) now hold the 16:50 slot — informational, not a failure.', n;
  END IF;

  RAISE NOTICE 'ws3-C rollback ok: asset-gap-analysis-daily unscheduled (armed or disarmed), health expectation removed.';
END $rb_c$;
