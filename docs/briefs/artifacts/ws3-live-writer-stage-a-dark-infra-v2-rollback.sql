-- ROLLBACK — WS-3 (b) STAGE A (dark infra) v2
-- Pairs with: ws3-live-writer-stage-a-dark-infra-v2.sql   ·   Channel: apply_migration. ONE call.
--
-- EXECUTOR: the object owner / apply principal (postgres).
--
-- ROLL BACK LAST. Ordering is load-bearing: Stage B's rollback READS
-- m.asset_gap_analysis_run for its before-images. Dropping Stage A first destroys every
-- before-image and makes every committed run permanently unrevertable.
--
-- Apply/rollback identity: Stage A created exactly two objects; this drops exactly those
-- two. Neither direction touches public.run_asset_gap_analysis, the two cc-0041 gap
-- tables, or any cron object.

DO $rb_a_guard$
DECLARE n int;
BEGIN
  -- Capture the analyzer's CURRENT body hash, whatever it is. The closing assertion
  -- compares against THIS, not against a frozen 2026-08-01 value: the correct
  -- apply/rollback-identity property is "this rollback did not change the analyzer", not
  -- "the analyzer still equals the capture the apply was reviewed against". Pinning the
  -- frozen hash here would make a legitimate future analyzer revision — or a Postgres
  -- upgrade that changes pg_get_functiondef deparsing — abort the rollback AFTER its
  -- DROPs, undoing its own work and leaving the reversal path unusable exactly when it is
  -- needed. (Forward-direction md5 pins in Stages A/B/C are a different question and
  -- correctly stay frozen.) Caught by db-rls-auditor F-3.
  -- M-3 (db-rls-auditor, round 3): `::regprocedure` THROWS 42883 if the analyzer's
  -- signature ever changes or it is dropped — which would block this entire reversal path
  -- at its first statement, for a reason rollback A does not even depend on. That is a
  -- narrowed residual of exactly the defect class F-3 was cut to close. `to_regprocedure`
  -- returns NULL instead of raising; NULL is recorded as 'absent' and compared as such.
  PERFORM set_config('ice.ws3_analyzer_md5_before',
    COALESCE(
      (SELECT md5(pg_get_functiondef(oid))
         FROM (SELECT to_regprocedure('public.run_asset_gap_analysis(integer,integer,boolean,text)') AS oid) t
        WHERE t.oid IS NOT NULL),
      'absent'),
    true);

  -- M-2 (db-rls-auditor, round 3): this file is multi-statement and the closing assertion
  -- depends on the transaction-local GUC above surviving to it. Stages A and C got a
  -- composition anchor in rev-3; this file did not, so on a non-composing channel the GUC
  -- would be gone and the closing check would raise a FALSE "the analyzer changed" —
  -- after the DROPs, mid-reversal, which is the worst possible diagnosis to hand someone.
  -- Anchor it so a non-composing channel says so plainly instead.
  PERFORM set_config('ice.ws3_rb_a_txid', pg_current_xact_id()::text, true);

  -- fail closed if a revertable run still exists — dropping the table would strand it
  IF to_regclass('m.asset_gap_analysis_run') IS NOT NULL THEN
    SELECT count(*) INTO n FROM m.asset_gap_analysis_run WHERE dry_run = false;
    IF n <> 0 THEN
      RAISE EXCEPTION 'ws3-A rollback STOP: % live run(s) still recorded — revert them via the Stage B rollback FIRST, or their before-images are destroyed with this table', n;
    END IF;
  END IF;

  -- fail closed if the schedule still exists — it would fire into a missing wrapper
  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'asset-gap-analysis-daily';
  IF n <> 0 THEN
    RAISE EXCEPTION 'ws3-A rollback STOP: asset-gap-analysis-daily is still scheduled — roll back Stage C FIRST';
  END IF;
END $rb_a_guard$;

DROP FUNCTION IF EXISTS m.run_asset_gap_analysis_scheduled(integer, integer, boolean, text);
DROP TABLE IF EXISTS m.asset_gap_analysis_run;

DO $rb_a$
DECLARE n int;
BEGIN
  IF to_regprocedure('m.run_asset_gap_analysis_scheduled(integer,integer,boolean,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'ws3-A rollback assert: wrapper still present';
  END IF;
  IF to_regclass('m.asset_gap_analysis_run') IS NOT NULL THEN
    RAISE EXCEPTION 'ws3-A rollback assert: run-log table still present';
  END IF;

  -- M-2: distinguish "did not compose" from "the analyzer changed" BEFORE comparing.
  -- Without this, a lost GUC reads as a changed analyzer.
  IF current_setting('ice.ws3_rb_a_txid', true) IS DISTINCT FROM pg_current_xact_id()::text THEN
    RAISE EXCEPTION 'ws3-A rollback STOP: this file did not execute as a single transaction (anchor=%, current=%). The DROPs above may already have committed — verify by hand; do NOT read this as an analyzer change.',
      current_setting('ice.ws3_rb_a_txid', true), pg_current_xact_id()::text;
  END IF;

  -- The analyzer is never touched by either direction. Compared start-vs-end within THIS
  -- rollback, so the assertion proves what it should (this rollback changed nothing) and
  -- cannot be defeated by an unrelated, legitimate change to the analyzer. 'absent' on
  -- either side is a legitimate value, not an error (M-3): rollback A does not require
  -- the analyzer to exist, only that IT did not alter it.
  IF COALESCE(
       (SELECT md5(pg_get_functiondef(oid))
          FROM (SELECT to_regprocedure('public.run_asset_gap_analysis(integer,integer,boolean,text)') AS oid) t
         WHERE t.oid IS NOT NULL),
       'absent')
     IS DISTINCT FROM current_setting('ice.ws3_analyzer_md5_before', true) THEN
    RAISE EXCEPTION 'ws3-A rollback assert: public.run_asset_gap_analysis changed during this rollback (% -> %)',
      current_setting('ice.ws3_analyzer_md5_before', true),
      COALESCE(
        (SELECT md5(pg_get_functiondef(oid))
           FROM (SELECT to_regprocedure('public.run_asset_gap_analysis(integer,integer,boolean,text)') AS oid) t
          WHERE t.oid IS NOT NULL),
        'absent');
  END IF;

  RAISE NOTICE 'ws3-A rollback ok: run-log + wrapper dropped; public.run_asset_gap_analysis unchanged by this rollback (md5/state %).',
    current_setting('ice.ws3_analyzer_md5_before', true);
END $rb_a$;
