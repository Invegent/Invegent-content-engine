-- WS-3 (b) STAGE A — DARK INFRA  v2   [P-5A artifact · NOT APPLIED]
-- Packet: docs/briefs/ws3-asset-gap-live-writer-scheduler-packet-v1.md (rev-2)
-- Channel: apply_migration (DDL). ONE call. Rollback: ws3-live-writer-stage-a-dark-infra-v2-rollback.sql
--
-- v2 re-cut. v1 shipped all three stages in one file with comment-banner stage
-- boundaries; db-rls-auditor returned `block` and apply-harness-auditor (shadow) returned
-- CONCERNS, both naming the same root problem — declared controls the executable text did
-- not enforce. The stages are now THREE SEPARATELY HASHED FILES, so "one file = one call"
-- is structural rather than advisory, and each later stage machine-asserts that the prior
-- stage COMMITTED IN A DIFFERENT TRANSACTION.
--
-- Stage A changes no behaviour: the analyzer's dry-run default stays true, the new
-- wrapper's dry-run default is ALSO true, nothing calls the wrapper, and no schedule
-- exists. Everything it creates is dark.

-- ---------------------------------------------------------------------------
-- A0 · Transaction anchor. This file is MULTI-STATEMENT and its safety story depends on
-- the whole file composing as ONE transaction (so a failed A3 assertion undoes the DDL
-- above it). That is a property of the apply channel, not of the SQL — so rather than
-- assume it, stamp the transaction id here and re-check it in A3. A mismatch or a NULL
-- proves the file did NOT compose, and A3 aborts instead of silently leaving a partial
-- dark-infra footprint behind a failed assertion. (House idiom, per the broll-parity and
-- cc-0079 apply packets.)
DO $anchor$ BEGIN
  PERFORM set_config('ice.ws3_stage_a_txid', pg_current_xact_id()::text, true);
END $anchor$;

-- ---------------------------------------------------------------------------
-- A1 · m.asset_gap_analysis_run — durable per-run evidence + full before-image.
--
-- WHY: public.run_asset_gap_analysis returns its counters as jsonb and swallows every
-- per-row exception internally (`exception when others`). A bare SELECT in a cron command
-- discards that jsonb, and cron.job_run_details records only success/failure plus an error
-- string — never the counters. A run that silently errored on every row would be
-- indistinguishable from a clean one. This table is what makes the schedule auditable.
--
-- pre_state is a FULL-ROW before-image (to_jsonb of every row of both gap tables),
-- deliberately not a hand-picked column list: v1 captured 9 of the 19 columns the analyzer
-- mutates, so its declared "every governed run is reversible" was false and no machine
-- check could see it. Capturing whole rows makes coverage total by construction and
-- survives future columns being added to either table.
CREATE TABLE m.asset_gap_analysis_run (
  id             uuid primary key default gen_random_uuid(),
  run_id         text        not null,
  ran_at         timestamptz not null default now(),
  triggered_by   text        not null,            -- 'cron' | 'manual' | 'proving'
  dry_run        boolean     not null,
  lookback_days  int,
  row_limit      int,
  scanned        int,
  inserted       int,
  updated        int,
  reconciled_resolved int,
  error_count    int,                             -- rejected.errors + reconciled.errors
  result         jsonb       not null,            -- the returned payload, verbatim
  -- {"suggestions":[<full row jsonb>,...], "observations":[<full row jsonb>,...]}
  pre_state      jsonb       not null
);
COMMENT ON TABLE m.asset_gap_analysis_run IS
  'WS-3: durable per-run evidence + full-row before-image for public.run_asset_gap_analysis. The analyzer swallows per-row exceptions into counters returned as jsonb; a bare SELECT in a cron command discards that. Written ONLY by m.run_asset_gap_analysis_scheduled(). Reachability control (live-verified): anon and authenticated hold no USAGE on schema m and no grant on this table.';

CREATE INDEX asset_gap_analysis_run_ran_at_idx ON m.asset_gap_analysis_run (ran_at DESC, id DESC);
CREATE UNIQUE INDEX asset_gap_analysis_run_run_id_uidx ON m.asset_gap_analysis_run (run_id);

ALTER TABLE m.asset_gap_analysis_run ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON m.asset_gap_analysis_run FROM PUBLIC, anon, authenticated;
-- Append-only for the writer principal. DELETE is deliberately NOT granted: the only
-- deleter is the rollback, which runs as the table OWNER (postgres) — see the rollback
-- file's executor declaration. cc-0041 grants service_role full arwd on its two gap
-- tables; this table diverges deliberately (append-only evidence), so the "mirrors
-- cc-0041" claim is NOT made. inspector_ro SELECT follows the cc-0041 / schema-m
-- convention (61 of 61 m tables carry it).
GRANT SELECT, INSERT ON m.asset_gap_analysis_run TO service_role;
GRANT SELECT ON m.asset_gap_analysis_run TO inspector_ro;

-- ---------------------------------------------------------------------------
-- A2 · m.run_asset_gap_analysis_scheduled() — the cron entrypoint.
--
-- Schema `m`, NOT `public`: a NEW function in public is born with the default ACL granting
-- EXECUTE to anon + authenticated (the gotcha applies to CREATE, which this is). Schema m
-- grants anon/authenticated no USAGE, so placement is the fail-safe; the REVOKE is
-- belt-and-suspenders. A3 verifies this with has_function_privilege, which — unlike
-- v1's aclexplode/pg_roles join — correctly accounts for privileges inherited via PUBLIC
-- (PUBLIC renders as grantee oid 0 and was silently discarded by the v1 join).
--
-- p_dry_run DEFAULTS TO true. v1 defaulted it to false, which contradicted the packet's own
-- stated invariant ("no ungoverned caller gets a live-write default") on the very object
-- the packet creates: a bare `SELECT m.run_asset_gap_analysis_scheduled()` would have been
-- a live 500-row write. Both real call sites (Stage B, Stage C) pass p_dry_run explicitly.
--
-- Thin wrapper: captures the before-image, calls the analyzer unchanged, records the
-- payload. It re-implements, re-orders, filters and reinterprets nothing.
-- Bare CREATE, deliberately not CREATE OR REPLACE: this is a brand-new object, and
-- CREATE OR REPLACE would silently overwrite a pre-existing body AND preserve its existing
-- ACL — which would defeat the grant posture asserted in A3. Failing loudly is correct.
CREATE FUNCTION m.run_asset_gap_analysis_scheduled(
  p_lookback_days integer DEFAULT 7,
  p_limit         integer DEFAULT 500,
  p_dry_run       boolean DEFAULT true,
  p_triggered_by  text    DEFAULT 'cron'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
-- to_jsonb renders timestamptz in the SESSION timezone. Pinning UTC here makes the
-- before-image byte-stable regardless of who runs the wrapper, so the rollback's
-- field-level equality verification cannot fail spuriously on formatting alone.
SET TimeZone TO 'UTC'
AS $fn$
DECLARE
  v_result    jsonb;
  v_pre_state jsonb;
BEGIN
  -- Full-row before-image FIRST, in the same transaction as the run it describes.
  SELECT jsonb_build_object(
           'suggestions',  COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id)
                                       FROM m.asset_gap_suggestion s), '[]'::jsonb),
           'observations', COALESCE((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id)
                                       FROM m.asset_gap_observation o), '[]'::jsonb))
    INTO v_pre_state;

  v_result := public.run_asset_gap_analysis(
                p_lookback_days => p_lookback_days,
                p_limit         => p_limit,
                p_dry_run       => p_dry_run,
                p_run_id        => NULL);

  INSERT INTO m.asset_gap_analysis_run (
    run_id, triggered_by, dry_run, lookback_days, row_limit,
    scanned, inserted, updated, reconciled_resolved, error_count, result, pre_state)
  VALUES (
    v_result->>'run_id',
    p_triggered_by,
    (v_result->>'dry_run')::boolean,
    (v_result->>'lookback_days')::int,
    (v_result->>'limit')::int,
    (v_result->>'scanned')::int,
    (v_result->>'inserted')::int,
    (v_result->>'updated')::int,
    (v_result#>>'{reconciled,resolved}')::int,
    COALESCE((v_result#>>'{rejected,errors}')::int, 0)
      + COALESCE((v_result#>>'{reconciled,errors}')::int, 0),
    v_result,
    v_pre_state);

  RETURN v_result;
END;
$fn$;

REVOKE ALL ON FUNCTION m.run_asset_gap_analysis_scheduled(integer, integer, boolean, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION m.run_asset_gap_analysis_scheduled(integer, integer, boolean, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- A3 · Stage A fail-closed assertions (same transaction — any RAISE rolls Stage A back)
DO $assert_a$
DECLARE n int; v_md5 text;
BEGIN
  -- --- the file must have composed as ONE transaction (see A0) ---
  IF current_setting('ice.ws3_stage_a_txid', true) IS DISTINCT FROM pg_current_xact_id()::text THEN
    RAISE EXCEPTION 'ws3-A STOP: this file did not execute as a single transaction (anchor=%, current=%) — a failed assertion would not undo the DDL above. Apply it through a channel that composes multi-statement input atomically.',
      current_setting('ice.ws3_stage_a_txid', true), pg_current_xact_id()::text;
  END IF;

  -- --- the analyzer this whole design is built on must be the body that was reviewed ---
  -- (packet STOP 10, now executable: v1 declared this STOP in prose only and its nearest
  -- check tested the argument string, which cannot detect a body change at all.)
  -- Resolved by exact SIGNATURE via regprocedure — an unqualified proname lookup would
  -- silently pick an arbitrary row under an overload.
  SELECT md5(pg_get_functiondef(
           'public.run_asset_gap_analysis(integer,integer,boolean,text)'::regprocedure))
    INTO v_md5;
  IF v_md5 IS DISTINCT FROM 'ec2bb745bf37d956f8537d0ee2f04b77' THEN
    RAISE EXCEPTION 'ws3-A STOP: public.run_asset_gap_analysis body md5 is % — expected the reviewed 2026-08-01 capture ec2bb745bf37d956f8537d0ee2f04b77. The design basis is invalidated; re-review before applying.', v_md5;
  END IF;

  -- --- run-log table ---
  IF to_regclass('m.asset_gap_analysis_run') IS NULL THEN
    RAISE EXCEPTION 'ws3-A assert: run-log table missing'; END IF;

  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname='m' AND c.relname='asset_gap_analysis_run' AND c.relrowsecurity;
  IF n <> 1 THEN RAISE EXCEPTION 'ws3-A assert: RLS not enabled on run-log table'; END IF;

  -- deny-all means ZERO policies — v1 declared this and never asserted it
  SELECT count(*) INTO n FROM pg_policy WHERE polrelid = 'm.asset_gap_analysis_run'::regclass;
  IF n <> 0 THEN RAISE EXCEPTION 'ws3-A assert: run-log table has % RLS policy/policies, expected deny-all (0)', n; END IF;

  -- has_table_privilege accounts for PUBLIC inheritance; information_schema (v1) does not
  IF has_table_privilege('anon',          'm.asset_gap_analysis_run', 'SELECT')
  OR has_table_privilege('anon',          'm.asset_gap_analysis_run', 'INSERT')
  OR has_table_privilege('authenticated', 'm.asset_gap_analysis_run', 'SELECT')
  OR has_table_privilege('authenticated', 'm.asset_gap_analysis_run', 'INSERT') THEN
    RAISE EXCEPTION 'ws3-A assert: anon/authenticated can reach the run-log table';
  END IF;

  -- positive side: the writer principal must actually hold what it needs (v1 asserted only absence)
  IF NOT has_table_privilege('service_role', 'm.asset_gap_analysis_run', 'SELECT')
  OR NOT has_table_privilege('service_role', 'm.asset_gap_analysis_run', 'INSERT') THEN
    RAISE EXCEPTION 'ws3-A assert: service_role lacks SELECT/INSERT on the run-log table';
  END IF;
  IF has_table_privilege('service_role', 'm.asset_gap_analysis_run', 'DELETE') THEN
    RAISE EXCEPTION 'ws3-A assert: run-log table is meant to be append-only for service_role';
  END IF;

  -- --- wrapper ---
  IF to_regprocedure('m.run_asset_gap_analysis_scheduled(integer,integer,boolean,text)') IS NULL THEN
    RAISE EXCEPTION 'ws3-A assert: wrapper missing'; END IF;

  IF has_function_privilege('anon',          'm.run_asset_gap_analysis_scheduled(integer,integer,boolean,text)', 'EXECUTE')
  OR has_function_privilege('authenticated', 'm.run_asset_gap_analysis_scheduled(integer,integer,boolean,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'ws3-A assert: wrapper is EXECUTE-able by anon/authenticated';
  END IF;
  IF NOT has_function_privilege('service_role', 'm.run_asset_gap_analysis_scheduled(integer,integer,boolean,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'ws3-A assert: service_role lacks EXECUTE on the wrapper';
  END IF;

  -- the wrapper must NOT carry a live-write default (the invariant v1 asserted only for the analyzer)
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
   WHERE ns.nspname='m' AND p.proname='run_asset_gap_analysis_scheduled'
     AND pg_get_function_arguments(p.oid) LIKE '%p_dry_run boolean DEFAULT true%';
  IF n <> 1 THEN RAISE EXCEPTION 'ws3-A assert: wrapper does not default p_dry_run to true'; END IF;

  -- --- Stage A must not have done Stage B/C's work ---
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
   WHERE ns.nspname='public' AND p.proname='run_asset_gap_analysis'
     AND pg_get_function_arguments(p.oid) LIKE '%p_dry_run boolean DEFAULT true%';
  IF n <> 1 THEN RAISE EXCEPTION 'ws3-A assert: analyzer dry-run default changed — Stage A must not touch it'; END IF;

  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'asset-gap-analysis-daily';
  IF n <> 0 THEN RAISE EXCEPTION 'ws3-A assert: schedule exists after Stage A — Stage A must stay dark'; END IF;

  SELECT count(*) INTO n FROM m.asset_gap_analysis_run;
  IF n <> 0 THEN RAISE EXCEPTION 'ws3-A assert: run-log is not empty after Stage A'; END IF;

  RAISE NOTICE 'ws3-A ok: analyzer body md5 matches the reviewed capture; run-log (deny-all, append-only, no anon/authenticated reach) + wrapper (dry-run default true, service_role only) created dark; no schedule; no run recorded.';
END $assert_a$;

-- ================================ END STAGE A · STOP ==========================
-- The apply channel ends here. Stage B is a SEPARATE file and a SEPARATE call, and it
-- machine-asserts that this stage committed in a different transaction.
