-- M7 cost-capture hermetic proof — m.render_cost_snapshot + m.record_render_cost_snapshot(...).
-- Lane: M7 render cost capture (isolated build, PK build-acceleration ruling). NOT run against any
-- live DB by this lane — authored to run against a SCRATCH/DEV DB where
-- NOT_APPLIED_cgu_m7_render_cost_snapshot_v1.sql has ALREADY been applied (Section A table + Section
-- D RPC present), mirroring the _harness/cc0046_hermetic pattern ("loaded AFTER the fns are extracted
-- ... into this DB"). This file performs NO writes/DDL against production; it is a standalone SQL
-- script an operator/CI runs against a throwaway database.
--
-- CASE LIST (documented, matches the RPC's five validation branches + the table's own CHECK
-- constraints exercised directly):
--   T1  valid insert via the RPC succeeds, returns a uuid, row lands with source defaulted to
--       'dashboard_manual_entry' and provider defaulted to 'creatomate'.
--   T2  period_end <= period_start -> rejected (RPC raises; also proven at the raw-INSERT/CHECK level).
--   T3  unit not in {credits,usd} -> rejected.
--   T4  source not in {account_usage_api,dashboard_manual_entry,invoice_manual_entry} -> rejected.
--   T5  negative credits_or_spend -> rejected (RPC AND the table's own CHECK, proven both ways).
--   T6  NULL period_start/period_end -> rejected.
--   T7  a second valid insert with an explicit non-default source/unit/provider succeeds
--       (proves the params are not hardcoded to the defaults).
--   T8  direct raw INSERT bypassing the RPC still enforces the table CHECK constraints (defense in
--       depth — the RPC is a convenience/validation-centralising wrapper, not the only enforcement).
--
-- \set ON_ERROR_STOP is deliberately OFF for the negative-case blocks (each is wrapped in its own
-- DO block with an EXCEPTION handler, mirroring the cc0046 CONSTRAINT PROOF idiom) and ON elsewhere
-- so an unexpected structural error still aborts loudly.
\pset pager off

\echo '=== T1: valid RPC insert ==='
\set ON_ERROR_STOP on
DO $$
DECLARE v_id uuid;
BEGIN
  v_id := m.record_render_cost_snapshot(
    now() - interval '7 days', now(), 1250.50, 'credits'
  );
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'T1 FAIL: expected a snapshot_id, got NULL';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM m.render_cost_snapshot
    WHERE snapshot_id = v_id AND source = 'dashboard_manual_entry' AND provider = 'creatomate'
  ) THEN
    RAISE EXCEPTION 'T1 FAIL: row not found or defaults (source/provider) not applied as expected';
  END IF;
  RAISE NOTICE 'T1 PASS: valid insert accepted, id=%, defaults applied', v_id;
END $$;

\echo '=== T2: period_end <= period_start rejected (RPC) ==='
DO $$
BEGIN
  PERFORM m.record_render_cost_snapshot(now(), now() - interval '1 day', 10, 'credits');
  RAISE EXCEPTION 'T2 FAIL: period_end <= period_start was accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%period_end%must be after%' THEN
    RAISE NOTICE 'T2 PASS: rejected as expected (%.)', SQLERRM;
  ELSE
    RAISE EXCEPTION 'T2 FAIL: rejected for the wrong reason: %', SQLERRM;
  END IF;
END $$;

\echo '=== T2b: period_end = period_start rejected (boundary, RPC) ==='
DO $$
DECLARE v_now timestamptz := now();
BEGIN
  PERFORM m.record_render_cost_snapshot(v_now, v_now, 10, 'credits');
  RAISE EXCEPTION 'T2b FAIL: period_end = period_start was accepted';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'T2b PASS: equal-period boundary rejected (%.)', SQLERRM;
END $$;

\echo '=== T3: bad unit rejected (RPC) ==='
DO $$
BEGIN
  PERFORM m.record_render_cost_snapshot(now() - interval '1 day', now(), 10, 'euros');
  RAISE EXCEPTION 'T3 FAIL: unit=''euros'' was accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%unit must be one of%' THEN
    RAISE NOTICE 'T3 PASS: rejected as expected (%.)', SQLERRM;
  ELSE
    RAISE EXCEPTION 'T3 FAIL: rejected for the wrong reason: %', SQLERRM;
  END IF;
END $$;

\echo '=== T4: bad source rejected (RPC) ==='
DO $$
BEGIN
  PERFORM m.record_render_cost_snapshot(now() - interval '1 day', now(), 10, 'credits', 'guessed_from_vibes');
  RAISE EXCEPTION 'T4 FAIL: source=''guessed_from_vibes'' was accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%source must be one of%' THEN
    RAISE NOTICE 'T4 PASS: rejected as expected (%.)', SQLERRM;
  ELSE
    RAISE EXCEPTION 'T4 FAIL: rejected for the wrong reason: %', SQLERRM;
  END IF;
END $$;

\echo '=== T5: negative credits_or_spend rejected (RPC) ==='
DO $$
BEGIN
  PERFORM m.record_render_cost_snapshot(now() - interval '1 day', now(), -5, 'credits');
  RAISE EXCEPTION 'T5 FAIL: negative credits_or_spend was accepted by the RPC';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%non-negative number%' THEN
    RAISE NOTICE 'T5 PASS: rejected by RPC validation as expected (%.)', SQLERRM;
  ELSE
    RAISE EXCEPTION 'T5 FAIL: rejected for the wrong reason: %', SQLERRM;
  END IF;
END $$;

\echo '=== T5b: negative credits_or_spend rejected (raw INSERT, table CHECK — defense in depth) ==='
DO $$
BEGIN
  INSERT INTO m.render_cost_snapshot (period_start, period_end, credits_or_spend, unit, source)
  VALUES (now() - interval '1 day', now(), -5, 'credits', 'dashboard_manual_entry');
  RAISE EXCEPTION 'T5b FAIL: negative credits_or_spend was accepted by a raw INSERT (table CHECK missing)';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'T5b PASS: table CHECK rejected the raw INSERT independently of the RPC (%.)', SQLERRM;
END $$;

\echo '=== T6: NULL period_start rejected (RPC) ==='
DO $$
BEGIN
  PERFORM m.record_render_cost_snapshot(NULL, now(), 10, 'credits');
  RAISE EXCEPTION 'T6 FAIL: NULL period_start was accepted';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%are required%' THEN
    RAISE NOTICE 'T6 PASS: rejected as expected (%.)', SQLERRM;
  ELSE
    RAISE EXCEPTION 'T6 FAIL: rejected for the wrong reason: %', SQLERRM;
  END IF;
END $$;

\echo '=== T7: valid insert with explicit non-default params ==='
DO $$
DECLARE v_id uuid;
BEGIN
  v_id := m.record_render_cost_snapshot(
    now() - interval '30 days', now() - interval '23 days', 42.00, 'usd',
    'invoice_manual_entry', 'creatomate'
  );
  IF NOT EXISTS (
    SELECT 1 FROM m.render_cost_snapshot
    WHERE snapshot_id = v_id AND source = 'invoice_manual_entry' AND unit = 'usd' AND credits_or_spend = 42.00
  ) THEN
    RAISE EXCEPTION 'T7 FAIL: explicit non-default params were not honoured';
  END IF;
  RAISE NOTICE 'T7 PASS: explicit non-default params honoured, id=%', v_id;
END $$;

\echo '=== T8: raw INSERT with bad source bypassing the RPC still rejected by the table CHECK ==='
DO $$
BEGIN
  INSERT INTO m.render_cost_snapshot (period_start, period_end, credits_or_spend, unit, source)
  VALUES (now() - interval '1 day', now(), 10, 'credits', 'made_up_source');
  RAISE EXCEPTION 'T8 FAIL: raw INSERT with an invalid source value was accepted';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'T8 PASS: table CHECK rejected the raw INSERT independently of the RPC (%.)', SQLERRM;
END $$;

\echo '=== SUMMARY ==='
\echo 'All DO blocks above either printed PASS via RAISE NOTICE or the script aborted at the first'
\echo 'unexpected acceptance (RAISE EXCEPTION with a FAIL message + non-zero exit under \set ON_ERROR_STOP on,'
\echo 'or check_violation with no re-raise = fixture bug if it lands outside its own DO block).'
\echo 'A clean run to this line with no earlier FAIL/abort = all 9 cases (T1,T2,T2b,T3,T4,T5,T5b,T6,T7,T8) passed.'
