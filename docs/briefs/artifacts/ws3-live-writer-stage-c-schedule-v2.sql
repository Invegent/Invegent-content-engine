-- WS-3 (b) STAGE C — SCHEDULE  v2   [P-5A artifact · NOT APPLIED]
-- Packet: docs/briefs/ws3-asset-gap-live-writer-scheduler-packet-v1.md (rev-2)
-- Channel: execute_sql (no DDL — a cron row and a health-check row).
-- ONE call. Rollback: ws3-live-writer-stage-c-schedule-v2-rollback.sql
--
-- PRECONDITION: Stage A and Stage B applied and COMMITTED in earlier, separate calls,
-- and Stage B's proving run was clean. v1 asserted NONE of this — a schedule could be
-- established over an unproven or entirely absent writer path.

DO $stage_c$
DECLARE n int; v_sched text; v_cmd text; v_md5 text;
BEGIN
  -- Transaction anchor — this file is multi-statement (guards, INSERT, cron.schedule,
  -- assertions) and its safety story depends on composing as ONE transaction, so that a
  -- failed C3 assertion undoes the seed row and the schedule. Re-checked in C3.
  PERFORM set_config('ice.ws3_stage_c_txid', pg_current_xact_id()::text, true);

  -- ==== preconditions ========================================================
  IF to_regprocedure('m.run_asset_gap_analysis_scheduled(integer,integer,boolean,text)') IS NULL
  OR to_regclass('m.asset_gap_analysis_run') IS NULL THEN
    RAISE EXCEPTION 'ws3-C STOP: Stage A objects absent — stages applied out of order';
  END IF;

  -- prior stages must have COMMITTED in different transactions (see Stage B's guard for
  -- the empirical verification of both tests)
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname='m' AND c.relname='asset_gap_analysis_run'
     AND (age(c.xmin) = 0 OR c.xmin = pg_current_xact_id()::xid);
  IF n <> 0 THEN
    RAISE EXCEPTION 'ws3-C STOP: Stage A was created in THIS transaction — stages must be separate calls';
  END IF;

  -- Stage B must have produced a CLEAN proving run. This is the executable form of
  -- packet STOP 3 ("Stage B reports error_count > 0 — do not proceed to Stage C").
  SELECT count(*) INTO n FROM m.asset_gap_analysis_run
   WHERE triggered_by = 'proving' AND dry_run = false AND error_count = 0;
  IF n < 1 THEN
    RAISE EXCEPTION 'ws3-C STOP: no clean Stage B proving run recorded (triggered_by=proving, dry_run=false, error_count=0) — refusing to schedule an unproven writer';
  END IF;
  -- Stage B and Stage C share the execute_sql channel, so pasting B+C into one call is the
  -- most operationally likely composition error — and it would schedule a standing
  -- autonomous writer off a proving run PK never inspected. This is the guard that stops it.
  SELECT count(*) INTO n FROM m.asset_gap_analysis_run
   WHERE triggered_by = 'proving' AND dry_run = false
     AND (age(xmin) = 0 OR xmin = pg_current_xact_id()::xid);
  IF n <> 0 THEN
    RAISE EXCEPTION 'ws3-C STOP: the proving run was written in THIS transaction — Stage B and Stage C must be separate calls';
  END IF;

  -- the analyzer must still be the reviewed body (packet STOP 10)
  SELECT md5(pg_get_functiondef(
           'public.run_asset_gap_analysis(integer,integer,boolean,text)'::regprocedure))
    INTO v_md5;
  IF v_md5 IS DISTINCT FROM 'ec2bb745bf37d956f8537d0ee2f04b77' THEN
    RAISE EXCEPTION 'ws3-C STOP: analyzer body md5 is % — expected the reviewed capture', v_md5;
  END IF;

  -- STOP 6, narrowed to the facts this stage actually depends on (v1 declared a broad
  -- "cron.job state differs from baseline" STOP with no captured baseline to compare to):
  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'asset-gap-analysis-daily';
  IF n <> 0 THEN RAISE EXCEPTION 'ws3-C STOP: a job named asset-gap-analysis-daily already exists'; END IF;
  -- whitespace-normalised: `schedule` is free text, so an exact-string match would miss a
  -- job holding the same minute under a differently-spaced spelling
  SELECT count(*) INTO n FROM cron.job
   WHERE btrim(regexp_replace(schedule, '\s+', ' ', 'g')) = '50 16 * * *';
  IF n <> 0 THEN RAISE EXCEPTION 'ws3-C STOP: the 50 16 * * * slot is no longer free (% job(s) hold it)', n; END IF;

  -- The health-seed must be an INSERT, never an UPDATE. v1 used ON CONFLICT DO UPDATE
  -- while its rollback deleted unconditionally — so in the conflict branch the rollback
  -- would have destroyed a pre-existing row Stage C never created, with no before-image.
  SELECT count(*) INTO n FROM m.cron_health_check WHERE jobname = 'asset-gap-analysis-daily';
  IF n <> 0 THEN
    RAISE EXCEPTION 'ws3-C STOP: a cron_health_check row for asset-gap-analysis-daily already exists — this stage may only CREATE one, and its rollback may only remove one it created';
  END IF;
END $stage_c$;

-- ---------------------------------------------------------------------------
-- C1 · Seed the cron-health expectation BEFORE the job can heartbeat.
--      m.heartbeat() auto-creates a missing row at expected_interval_minutes = 60 (live
--      body, 2026-08-01). For a DAILY job that default is wrong and would raise a
--      permanent false "missing heartbeat". Both existing daily jobs are explicitly seeded
--      at 1440 (materialise-slots-nightly, reconcile-signal-pool-daily). Order is
--      load-bearing: seed, then schedule. Plain INSERT — the guard above proved no row exists.
INSERT INTO m.cron_health_check (jobname, last_heartbeat_at, expected_interval_minutes, notes)
VALUES ('asset-gap-analysis-daily', now(), 1440,
        'WS-3. Asset Gap analyzer live writer + auto-reconcile. Daily.');

-- ---------------------------------------------------------------------------
-- C2 · The job — CREATED DISARMED (active = false). 16:50 UTC = 02:50 Sydney (AEST).
--      Verified free against the live cron inventory; nearest neighbours are 16:30
--      reconcile-signal-pool and 17:00 drift-check-daily-fire. Runs after the day's
--      drafts are approved, outside the drift band. The two-statement heartbeat+call
--      form matches six precedent jobs. p_dry_run is passed EXPLICITLY — the wrapper's
--      own default is true.
--
-- ⚑ M-1 REMEDIATION (PK directive 2026-08-01). Rev-3 called `cron.schedule` as a bare
--    top-level statement, which creates the job ACTIVE. If this multi-statement file did
--    not compose as one transaction, that statement committed on its own: a later C3
--    assertion failure then printed `ws3-C STOP` while a standing autonomous live writer
--    was armed and would fire at 16:50 UTC — the operator reading "nothing applied".
--    Detection alone could not fix that; the anchor in C3 reports the state, it cannot
--    undo it.
--
--    The fix is STRUCTURAL, not a better message. The whole create-then-disarm sequence
--    is ONE DO block, which is atomic on any channel regardless of how the file composes.
--    Arming is deferred to C4, the LAST statement in the file, behind a full re-check.
--    So the worst state this file can leave behind is a job that EXISTS but CANNOT FIRE.
--    A tripped STOP can no longer leave an armed writer, by construction.
DO $schedule$
DECLARE v_jobid bigint; n int;
BEGIN
  v_jobid := cron.schedule(
    'asset-gap-analysis-daily',
    '50 16 * * *',
    $job$
    SELECT m.heartbeat('asset-gap-analysis-daily');
    SELECT m.run_asset_gap_analysis_scheduled(
             p_lookback_days => 7,
             p_limit         => 500,
             p_dry_run       => false,
             p_triggered_by  => 'cron');
  $job$
  );

  -- Disarm in the SAME atomic block that created it. (pg_cron 1.6.4; `active=false` is a
  -- supported, already-in-use state — 3 live jobs sit disarmed today.)
  PERFORM cron.alter_job(job_id => v_jobid, active => false);

  -- Fail closed if it did not take: an armed job must never survive this block.
  SELECT count(*) INTO n FROM cron.job WHERE jobid = v_jobid AND active;
  IF n <> 0 THEN
    RAISE EXCEPTION 'ws3-C STOP: job % is still ACTIVE after the disarm — refusing to leave an armed writer', v_jobid;
  END IF;

  RAISE NOTICE 'ws3-C: job % created DISARMED (active=false); it cannot fire until C4 arms it.', v_jobid;
END $schedule$;

-- ---------------------------------------------------------------------------
-- C3 · Stage C fail-closed assertions
DO $assert_c$
DECLARE n int; v_sched text; v_cmd text;
BEGIN
  -- Anchor check. The message now states the TRUE post-M-1 consequence: the objects
  -- created above have already landed and this RAISE cannot remove them — but the job
  -- among them is DISARMED and cannot fire, so the recovery is unhurried.
  IF current_setting('ice.ws3_stage_c_txid', true) IS DISTINCT FROM pg_current_xact_id()::text THEN
    RAISE EXCEPTION 'ws3-C STOP: this file did not execute as a single transaction (anchor=%, current=%). The health-seed row and the cron job HAVE ALREADY COMMITTED and this abort cannot remove them — but the job was created DISARMED (active=false) and CANNOT FIRE. Required action: run ws3-live-writer-stage-c-schedule-v2-rollback.sql before any retry (a bare retry will trip the "jobname already exists" precondition).',
      current_setting('ice.ws3_stage_c_txid', true), pg_current_xact_id()::text;
  END IF;

  SELECT count(*) INTO n FROM m.cron_health_check
   WHERE jobname='asset-gap-analysis-daily' AND expected_interval_minutes = 1440;
  IF n <> 1 THEN RAISE EXCEPTION 'ws3-C assert: cron_health_check seed missing or wrong interval'; END IF;

  -- NOTE: no `AND active` here — at this point the job is deliberately DISARMED (C2).
  -- C4 arms it, last, after everything below has passed.
  SELECT count(*), max(schedule), max(command) INTO n, v_sched, v_cmd
    FROM cron.job WHERE jobname = 'asset-gap-analysis-daily';
  IF n <> 1 THEN RAISE EXCEPTION 'ws3-C assert: expected exactly 1 job row, got %', n; END IF;
  IF v_sched <> '50 16 * * *' THEN RAISE EXCEPTION 'ws3-C assert: schedule is %, expected 50 16 * * *', v_sched; END IF;

  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'asset-gap-analysis-daily' AND active;
  IF n <> 0 THEN RAISE EXCEPTION 'ws3-C assert: job is ARMED before C4 — the disarm in C2 did not hold'; END IF;

  -- Must call the PERSISTING wrapper (which records evidence + before-image), never the
  -- bare analyzer, and must pass p_dry_run explicitly rather than relying on a default.
  --
  -- WHITESPACE-INSENSITIVE, deliberately. cron.job.command stores the C2 body verbatim,
  -- and that body column-aligns its arguments — `p_dry_run       => false`, seven spaces.
  -- A single-space LIKE pattern can never match it, which would make this assertion raise
  -- on a byte-correct apply and abort Stage C every time. (That is exactly what the
  -- previous cut did; caught by apply-harness-auditor AHA-02-2 / db-rls-auditor F-2.)
  IF v_cmd !~ 'm\.run_asset_gap_analysis_scheduled'
  OR v_cmd ~  'public\.run_asset_gap_analysis\s*\('
  OR v_cmd !~ 'p_dry_run\s*=>\s*false' THEN
    RAISE EXCEPTION 'ws3-C assert: job command does not call the persisting wrapper with an explicit p_dry_run => false. command=%', v_cmd;
  END IF;

  -- liveness stays a per-call argument on BOTH functions, never a changed default, so any
  -- ungoverned caller of either still gets the safe behaviour
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
   WHERE ((ns.nspname='public' AND p.proname='run_asset_gap_analysis')
       OR (ns.nspname='m'      AND p.proname='run_asset_gap_analysis_scheduled'))
     AND pg_get_function_arguments(p.oid) LIKE '%p_dry_run boolean DEFAULT true%';
  IF n <> 2 THEN RAISE EXCEPTION 'ws3-C assert: expected BOTH functions to default p_dry_run to true, matched %', n; END IF;

  RAISE NOTICE 'ws3-C ok (pre-arm): asset-gap-analysis-daily present at 50 16 * * *, DISARMED, calling the persisting wrapper with explicit p_dry_run=>false; health expectation seeded at 1440m; both functions still default to dry-run.';
END $assert_c$;

-- ---------------------------------------------------------------------------
-- C4 · ARM — the LAST statement in this file, and the only one that makes the writer
--      capable of firing. One atomic DO block: it re-verifies every precondition that
--      matters and flips active=true only if all of them still hold.
--
--      This ordering is the M-1 remediation. If ANY earlier statement or assertion in
--      this file fails — on a composing channel or a non-composing one — control never
--      reaches here, and the job stays disarmed. There is no path through this file that
--      ends with an armed writer and an unhappy operator.
DO $arm$
DECLARE n int; v_jobid bigint;
BEGIN
  -- the whole file must still be one transaction
  IF current_setting('ice.ws3_stage_c_txid', true) IS DISTINCT FROM pg_current_xact_id()::text THEN
    RAISE EXCEPTION 'ws3-C ARM STOP: composition anchor lost — refusing to arm. The job remains DISARMED and cannot fire; run the Stage C rollback.';
  END IF;

  -- the writer path must exist
  IF to_regprocedure('m.run_asset_gap_analysis_scheduled(integer,integer,boolean,text)') IS NULL THEN
    RAISE EXCEPTION 'ws3-C ARM STOP: wrapper absent — refusing to arm a job whose target does not exist';
  END IF;

  -- a clean, committed proving run must still be on record
  SELECT count(*) INTO n FROM m.asset_gap_analysis_run
   WHERE triggered_by = 'proving' AND dry_run = false AND error_count = 0;
  IF n < 1 THEN
    RAISE EXCEPTION 'ws3-C ARM STOP: no clean proving run on record — refusing to arm an unproven writer';
  END IF;

  -- the analyzer must still be the reviewed body
  IF md5(pg_get_functiondef(
           'public.run_asset_gap_analysis(integer,integer,boolean,text)'::regprocedure))
     IS DISTINCT FROM 'ec2bb745bf37d956f8537d0ee2f04b77' THEN
    RAISE EXCEPTION 'ws3-C ARM STOP: analyzer body changed since freeze — refusing to arm';
  END IF;

  -- exactly one, still disarmed, still ours
  SELECT jobid INTO v_jobid FROM cron.job
   WHERE jobname = 'asset-gap-analysis-daily' AND NOT active
     AND command ~ 'm\.run_asset_gap_analysis_scheduled'
     AND command ~ 'p_dry_run\s*=>\s*false';
  IF v_jobid IS NULL THEN
    RAISE EXCEPTION 'ws3-C ARM STOP: no matching disarmed WS-3 job found — refusing to arm';
  END IF;

  PERFORM cron.alter_job(job_id => v_jobid, active => true);

  SELECT count(*) INTO n FROM cron.job WHERE jobid = v_jobid AND active;
  IF n <> 1 THEN RAISE EXCEPTION 'ws3-C ARM assert: job % did not arm', v_jobid; END IF;

  RAISE NOTICE 'ws3-C ARMED: job % is now active and will fire at 50 16 * * * UTC. Kill switch: SELECT cron.alter_job(job_id => %, active => false); full removal: the Stage C rollback.',
    v_jobid, v_jobid;
END $arm$;

-- ================================ END STAGE C =================================
-- Post-apply monitoring is a NAMED READ, not an automatic alert — see packet §6.1.
-- A scheduled run CANNOT raise on error_count > 0 without rolling back the very evidence
-- row that records it (pg_cron runs each job as one transaction), so the run log is
-- written and the condition is surfaced by the §6.1 read. Automated alerting is OQ-6.
