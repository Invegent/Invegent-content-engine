-- WS-3 (b) STAGE B — BOUNDED LIVE PROVING RUN  v2   [P-5A artifact · NOT APPLIED]
-- Packet: docs/briefs/ws3-asset-gap-live-writer-scheduler-packet-v1.md (rev-2)
-- Channel: execute_sql (pure DML — no DDL, so this must NOT mint a migration version).
-- ONE call. Rollback: ws3-live-writer-stage-b-proving-run-v2-rollback.sql
--
-- PRECONDITION: Stage A applied and COMMITTED in an earlier, separate call.
-- This is the FIRST live (non-dry-run) write. Everything below runs in ONE transaction;
-- every declared guard is an executable RAISE inside it, so a breach rolls the entire
-- run back. There is no comment-only STOP and no non-aborting failure branch.
--
-- HONEST BOUNDING (v1 overclaimed this; db-rls-auditor F-4 / apply-harness AHA-01-4):
--   p_limit bounds ONLY the analyzer's first loop (the m.post_draft scan). Its SECOND
--   loop — the reconcile pass — iterates EVERY open suggestion with no limit, calling
--   select_template per row and flipping open -> resolved. So the true Stage B bound is:
--     inserts <= 25   AND   auto-resolutions <= (rows open at baseline) + (rows this run inserted).
--   The second term is load-bearing, not slack: the reconcile cursor opens AFTER the
--   insert loop, so a gap detected and resolved within the same run is legitimate, and a
--   ceiling of baseline-open alone would abort a CLEAN proving run. Guard 6 enforces this
--   exact expression. The reconcile scan itself is unbounded by construction and is small
--   today only because the backlog is 4 rows — a standing property of the analyzer,
--   carried to the daily job, and packet OQ-5.

DO $stage_b$
DECLARE
  b_total int; b_open int; b_resolved int; b_obs int; b_runs int; b_cols int; b_obs_cols int;
  a_total int; a_open int; a_resolved int; a_obs int; a_runs int;
  v_res    jsonb;
  v_run    m.asset_gap_analysis_run%ROWTYPE;
  v_errors int;
  v_md5    text;
  n        int;
  c_limit  constant int := 25;   -- declared insert ceiling for this proving run
BEGIN
  -- ==== preconditions (executable, not assumed) ==============================
  IF to_regprocedure('m.run_asset_gap_analysis_scheduled(integer,integer,boolean,text)') IS NULL
  OR to_regclass('m.asset_gap_analysis_run') IS NULL THEN
    RAISE EXCEPTION 'ws3-B STOP: Stage A objects absent — stages applied out of order';
  END IF;

  -- Stage A must have COMMITTED IN A DIFFERENT TRANSACTION, i.e. Stage A and Stage B were
  -- not pasted into one call (which would bypass the PK inspection gate between them).
  -- v1 had no such guard: its presence check was satisfied trivially by same-call composition.
  --
  -- TWO independent tests, OR'd, because this guard is load-bearing and a review round
  -- disputed the first one. Both were verified empirically on the live server (PG 17.6,
  -- 2026-08-01) by creating a table and reading its catalog row in the SAME transaction:
  --   age(xmin)                     -> 0      (fires)
  --   xmin = pg_current_xact_id()   -> true   (fires)
  -- For a row written by any EARLIER, committed transaction both are false.
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname='m' AND c.relname='asset_gap_analysis_run'
     AND (age(c.xmin) = 0 OR c.xmin = pg_current_xact_id()::xid);
  IF n <> 0 THEN
    RAISE EXCEPTION 'ws3-B STOP: Stage A was created in THIS transaction — stages must be separate calls with a PK gate between them';
  END IF;

  -- the analyzer must still be the reviewed body (packet STOP 10). Resolved by exact
  -- SIGNATURE via regprocedure — an unqualified proname lookup would silently pick an
  -- arbitrary row if an overload ever existed, and regprocedure fails loudly if absent.
  SELECT md5(pg_get_functiondef(
           'public.run_asset_gap_analysis(integer,integer,boolean,text)'::regprocedure))
    INTO v_md5;
  IF v_md5 IS DISTINCT FROM 'ec2bb745bf37d956f8537d0ee2f04b77' THEN
    RAISE EXCEPTION 'ws3-B STOP: analyzer body md5 is % — expected the reviewed capture ec2bb745bf37d956f8537d0ee2f04b77', v_md5;
  END IF;

  -- ==== baselines (every guard below has its baseline captured here) =========
  SELECT count(*) INTO b_total    FROM m.asset_gap_suggestion;
  SELECT count(*) INTO b_open     FROM m.asset_gap_suggestion WHERE status = 'open';
  SELECT count(*) INTO b_resolved FROM m.asset_gap_suggestion WHERE status = 'resolved';
  SELECT count(*) INTO b_obs      FROM m.asset_gap_observation;
  SELECT count(*) INTO b_runs     FROM m.asset_gap_analysis_run;
  SELECT count(*) INTO b_cols     FROM pg_attribute
   WHERE attrelid = 'm.asset_gap_suggestion'::regclass AND attnum > 0 AND NOT attisdropped;
  SELECT count(*) INTO b_obs_cols FROM pg_attribute
   WHERE attrelid = 'm.asset_gap_observation'::regclass AND attnum > 0 AND NOT attisdropped;

  RAISE NOTICE 'ws3-B baseline: suggestions=% (open=%, resolved=%), observations=%, runs=%, suggestion columns=%',
    b_total, b_open, b_resolved, b_obs, b_runs, b_cols;

  -- ==== the run (p_dry_run => false: the first real write) ===================
  v_res := m.run_asset_gap_analysis_scheduled(
             p_lookback_days => 7,
             p_limit         => c_limit,
             p_dry_run       => false,
             p_triggered_by  => 'proving');

  -- ==== executable STOP conditions ==========================================
  -- 1. the analyzer must not have swallowed ANY error (the guard its own
  --    `exception when others` would otherwise hide)
  v_errors := COALESCE((v_res#>>'{rejected,errors}')::int, 0)
            + COALESCE((v_res#>>'{reconciled,errors}')::int, 0);
  IF v_errors <> 0 THEN
    RAISE EXCEPTION 'ws3-B STOP: analyzer reported % swallowed error(s); payload=%', v_errors, v_res;
  END IF;

  -- 2. it must actually have run live
  IF (v_res->>'dry_run')::boolean IS NOT false THEN
    RAISE EXCEPTION 'ws3-B STOP: run executed in dry-run mode; payload=%', v_res;
  END IF;

  -- 3. recorded exactly once, and fetched BY IDENTITY (v1 fetched "newest by ran_at",
  --    which ties because ran_at defaults to the transaction timestamp)
  SELECT count(*) INTO a_runs FROM m.asset_gap_analysis_run;
  IF a_runs <> b_runs + 1 THEN
    RAISE EXCEPTION 'ws3-B STOP: expected exactly 1 new run-log row, got %', a_runs - b_runs;
  END IF;
  SELECT * INTO v_run FROM m.asset_gap_analysis_run WHERE run_id = v_res->>'run_id';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ws3-B STOP: run-log row for run_id % not found', v_res->>'run_id';
  END IF;

  -- 3b. the before-image must be COMPLETE, not merely present. Row counts must match the
  --     baselines AND every captured suggestion row must carry the table's full column
  --     set — the check that would have caught v1's 9-of-19-columns capture.
  IF jsonb_array_length(v_run.pre_state->'suggestions') IS DISTINCT FROM b_total THEN
    RAISE EXCEPTION 'ws3-B STOP: before-image holds % suggestion rows, baseline was % — rollback would be incomplete',
      jsonb_array_length(v_run.pre_state->'suggestions'), b_total;
  END IF;
  IF jsonb_array_length(v_run.pre_state->'observations') IS DISTINCT FROM b_obs THEN
    RAISE EXCEPTION 'ws3-B STOP: before-image holds % observation rows, baseline was %',
      jsonb_array_length(v_run.pre_state->'observations'), b_obs;
  END IF;
  SELECT count(*) INTO n
    FROM jsonb_array_elements(v_run.pre_state->'suggestions') e
   WHERE (SELECT count(*) FROM jsonb_object_keys(e)) <> b_cols;
  IF n <> 0 THEN
    RAISE EXCEPTION 'ws3-B STOP: % before-image suggestion row(s) do not carry all % columns — the revert path would silently lose fields', n, b_cols;
  END IF;
  -- mirror check for observations: the rollback keys its DELETE on the observation
  -- before-image and compares it field-for-field, so an incomplete capture there is
  -- exactly as fatal to the revert path as an incomplete suggestion capture.
  SELECT count(*) INTO n
    FROM jsonb_array_elements(v_run.pre_state->'observations') e
   WHERE (SELECT count(*) FROM jsonb_object_keys(e)) <> b_obs_cols;
  IF n <> 0 THEN
    RAISE EXCEPTION 'ws3-B STOP: % before-image observation row(s) do not carry all % columns', n, b_obs_cols;
  END IF;

  -- ==== post-state, bounded against the captured baselines ==================
  SELECT count(*) INTO a_total    FROM m.asset_gap_suggestion;
  SELECT count(*) INTO a_open     FROM m.asset_gap_suggestion WHERE status = 'open';
  SELECT count(*) INTO a_resolved FROM m.asset_gap_suggestion WHERE status = 'resolved';
  SELECT count(*) INTO a_obs      FROM m.asset_gap_observation;

  -- 4. no suggestion row may ever be destroyed by an analyzer run
  IF a_total < b_total THEN
    RAISE EXCEPTION 'ws3-B STOP: suggestion rows DECREASED %->% — the analyzer must never delete', b_total, a_total;
  END IF;

  -- 5. new suggestion rows are bounded by the draft-scan ceiling
  IF a_total - b_total > c_limit THEN
    RAISE EXCEPTION 'ws3-B STOP: % new suggestion rows exceeds the p_limit ceiling of %', a_total - b_total, c_limit;
  END IF;

  -- 6. the reconcile pass is unbounded by construction, so this is the real bound on it:
  --    auto-resolution can only consume rows that were open at baseline PLUS rows this
  --    same run just inserted. The `+ (a_total - b_total)` term is load-bearing, not
  --    slack: the analyzer's reconcile loop selects `WHERE status='open'` AFTER its own
  --    insert loop has run, so a gap detected and resolved within one run is legitimate.
  --    Bounding on b_open alone would abort a CLEAN proving run.
  IF a_resolved - b_resolved > b_open + (a_total - b_total) THEN
    RAISE EXCEPTION 'ws3-B STOP: % rows auto-resolved, exceeding the ceiling of % (baseline-open % + newly-inserted %). The reconcile scan is unbounded — this is its only ceiling.',
      a_resolved - b_resolved, b_open + (a_total - b_total), b_open, a_total - b_total;
  END IF;

  -- 7. observations only ever accumulate
  IF a_obs < b_obs THEN
    RAISE EXCEPTION 'ws3-B STOP: observation rows DECREASED %->%', b_obs, a_obs;
  END IF;

  RAISE NOTICE 'ws3-B ok: run_id=% · suggestions %->% (open %->%, resolved %->%) · observations %->% · before-image complete (% rows x % columns) · payload=%',
    v_run.run_id, b_total, a_total, b_open, a_open, b_resolved, a_resolved, b_obs, a_obs,
    jsonb_array_length(v_run.pre_state->'suggestions'), b_cols, v_res;
END $stage_b$;

-- ================================ END STAGE B · STOP ==========================
-- PK reviews this NOTICE (the delta, the run_id and the payload) and the
-- m.asset_gap_analysis_run row before authorising Stage C. If Stage B raised, the whole
-- run is already rolled back and the remainder of the sequence is void.
