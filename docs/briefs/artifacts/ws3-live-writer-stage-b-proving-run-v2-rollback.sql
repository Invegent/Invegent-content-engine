-- ROLLBACK — WS-3 (b) STAGE B (one analyzer run) v2
-- Pairs with: ws3-live-writer-stage-b-proving-run-v2.sql   ·   Channel: execute_sql. ONE call.
--
-- EXECUTOR: the table owner / apply principal (postgres). service_role holds SELECT+INSERT
-- only on m.asset_gap_analysis_run (append-only by design) and cannot DELETE from it.
-- Declared here because v1 left the executor unstated.
--
-- ROLL BACK AFTER Stage C (so no new run can land mid-revert) and BEFORE Stage A (whose
-- rollback destroys the before-images this file depends on).
--
-- WHICH RUN: by default the newest NON-dry run, with a deterministic tiebreaker
-- (ran_at DESC, id DESC) — v1 ordered on ran_at alone, which ties because ran_at defaults
-- to the transaction timestamp. To revert a specific run, set v_target_run_id below.
-- Reverting several runs requires running this file once per run, NEWEST FIRST: the
-- before-images only compose in reverse chronological order.
--
-- WHY THIS IS A REAL PATH, not a declared one: the wrapper captures a FULL-ROW before-image
-- (to_jsonb of every row of both gap tables) in the SAME transaction as the run, Stage B
-- machine-asserts that the capture carries the table's complete column set, and step 5
-- below verifies the restored state field-for-field against that image. v1 captured 9 of
-- the 19 columns the analyzer mutates and verified only row COUNTS, so its incompleteness
-- was invisible in both directions.
--
-- ============================================================================
-- ⚠⚠ READ THIS BEFORE RUNNING — ONE ACCEPTED, DECLARED LIMIT (PK ruling 2026-08-01)
-- ============================================================================
-- Every other failure mode in this file fails CLOSED: it raises and refuses. THIS ONE
-- DOES NOT. It is accepted deliberately, not overlooked.
--
--   THIS IS A WHOLE-TABLE RESTORE TO THE BEFORE-IMAGE SNAPSHOT, NOT A PER-RUN DIFF.
--
-- The deletes below remove EVERY row absent from the snapshot. That is exactly right for
-- the analyzer run's own writes — but it will ALSO DESTROY ANY ROW WRITTEN BY ANYTHING
-- ELSE between the run and this revert. And because the snapshot is whole-table, the
-- bidirectional EXCEPT at step 5 then compares the truncated table to the snapshot, finds
-- no difference, and reports "reverted and verified field-for-field".
--
--   ⇒ This branch is silently destructive AND self-confirming. A clean success message
--     is NOT evidence that third-party rows survived. There were none to survive, by
--     assumption — see below.
--
-- WHAT THE ACCEPTANCE RESTS ON (verified 2026-08-01, all four must still hold):
--   1. Zero code readers of m.asset_gap_suggestion / m.asset_gap_observation across BOTH
--      repositories (Invegent-content-engine and invegent-dashboard).
--   2. public.run_asset_gap_analysis is the ONLY database object whose source references
--      either table (pg_proc scan).
--   3. No view reads them; no triggers exist on them.
--   4. Both are service-role-only, RLS enabled, zero policies.
--
-- ⛔ STOP CONDITION FOR THE OPERATOR: if ANY consumer or writer of these two tables has
--    been added since — a dashboard surface, a second analyzer, a manual remediation
--    script, a backfill — DO NOT RUN THIS FILE. The ruling that made it safe has lapsed
--    and must be re-decided (packet §5, OQ-10). The fix, if needed, is run attribution:
--    add `AND created_at >= v_run.ran_at` to both deletes and raise if the two predicates
--    disagree.
--
-- ✅ HOW TO CHECK THAT STOP — do not eyeball it, run these. Takes under a minute.
--    Do not treat "I think nothing reads these tables" as having checked.
--
--    (a) Database side. Expect EXACTLY ONE row and nothing else; any additional function,
--        any view, any trigger = STOP.
--          SELECT 'fn: '||n.nspname||'.'||p.proname
--            FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--           WHERE p.prosrc ~ 'asset_gap_(suggestion|observation)'
--          UNION ALL
--          SELECT 'view: '||schemaname||'.'||viewname FROM pg_views
--           WHERE definition ~ 'asset_gap_(suggestion|observation)'
--          UNION ALL
--          SELECT 'trigger: '||c.relname||'.'||t.tgname
--            FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
--            JOIN pg_namespace n ON n.oid = c.relnamespace
--           WHERE n.nspname = 'm'
--             AND c.relname IN ('asset_gap_suggestion','asset_gap_observation')
--             AND NOT t.tgisinternal
--          UNION ALL
--          -- INBOUND foreign keys: another table pointing AT these is a consumer, and
--          -- deleting rows here would cascade or block. (Excludes the known internal
--          -- observation -> suggestion FK.)
--          SELECT 'inbound fk: '||src.relname||'.'||con.conname
--            FROM pg_constraint con
--            JOIN pg_class tgt ON tgt.oid = con.confrelid
--            JOIN pg_namespace tn ON tn.oid = tgt.relnamespace
--            JOIN pg_class src ON src.oid = con.conrelid
--           WHERE con.contype = 'f' AND tn.nspname = 'm'
--             AND tgt.relname IN ('asset_gap_suggestion','asset_gap_observation')
--             AND src.relname <> 'asset_gap_observation'
--          UNION ALL
--          -- Non-view rewrite rules on the tables (a rule can silently redirect DML).
--          SELECT 'rule: '||c.relname||'.'||r.rulename
--            FROM pg_rewrite r JOIN pg_class c ON c.oid = r.ev_class
--            JOIN pg_namespace n ON n.oid = c.relnamespace
--           WHERE n.nspname = 'm'
--             AND c.relname IN ('asset_gap_suggestion','asset_gap_observation')
--             AND r.rulename <> '_RETURN'
--          UNION ALL
--          -- Logical-replication publications: a downstream subscriber IS a consumer,
--          -- and it would replicate these deletes off-cluster.
--          SELECT 'publication: '||pubname||' -> '||tablename
--            FROM pg_publication_tables
--           WHERE schemaname = 'm'
--             AND tablename IN ('asset_gap_suggestion','asset_gap_observation');
--        EXPECTED (2026-08-01 baseline, query re-run to confirm): exactly ONE line —
--          fn: public.run_asset_gap_analysis
--        Anything beyond that single line ⇒ STOP. (Note: public.preview_asset_gap_analysis
--        and public.analyze_asset_gap do NOT appear — they never name either table in their
--        own source. Their absence here is correct, not a sign the query failed.)
--        WHAT THIS QUERY DOES AND DOES NOT COVER — stated so it is not over-trusted:
--          COVERED: functions/procedures (incl. dynamic SQL, because prosrc is raw source
--          text and a literal table name inside an EXECUTE string still matches) · views ·
--          non-internal triggers · inbound foreign keys · rewrite rules · logical-
--          replication publications.
--          NOT COVERED: a caller that builds the table name by concatenation or from a
--          variable (e.g. EXECUTE 'DELETE FROM m.asset_gap_' || v_suffix), and any reader
--          outside this database (an external ETL job, a BI tool, a direct psql session).
--          Those cannot be enumerated from the catalog. If any exist, this check will give
--          a false all-clear — which is why check (c), the both-repos grep, is not optional.
--
--    (b) Grant posture. Expect no anon/authenticated reach and RLS on with zero policies:
--          SELECT c.relname, c.relrowsecurity,
--                 (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policies,
--                 has_table_privilege('anon',          c.oid, 'SELECT') AS anon_sel,
--                 has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_sel
--            FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--           WHERE n.nspname='m'
--             AND c.relname IN ('asset_gap_suggestion','asset_gap_observation');
--        EXPECTED: relrowsecurity = t, policies = 0, both privilege columns = f, on both rows.
--
--    (c) Code side, BOTH repositories — the dashboard is a separate repo and is the one
--        most likely to have grown a reader:
--          grep -rIn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
--            -E 'asset_gap_suggestion|asset_gap_observation|run_asset_gap_analysis' \
--            <content-engine-root> <invegent-dashboard-root>
--        EXPECTED: zero functional hits. (One prose-comment hit at
--        supabase/functions/image-worker/index.ts:45 is known and is not a reader.)
--
-- Flagged independently by apply-harness-auditor (AHA-03-6) and external review
-- 66fb08f0-4015-4513-8e62-ed3da3f8ae32 (HIGH risk, "isn't adequately mitigated").
-- PK ruled DECLARE rather than tighten, 2026-08-01. Full record: packet §5.
-- ============================================================================

BEGIN;
-- to_jsonb renders timestamptz in the session timezone; the wrapper pins UTC, so the
-- comparison side must too or step 5 fails on formatting alone.
SET LOCAL TimeZone = 'UTC';

DO $rb_b$
DECLARE
  v_target_run_id text := NULL;          -- set to a run_id to revert that specific run
  v_run     m.asset_gap_analysis_run%ROWTYPE;
  v_deleted int; v_restored int; v_obs_deleted int; n int;
BEGIN
  -- ==== environment + ordering preconditions, BEFORE the run is selected ==============
  -- (Ordering matters here for a plpgsql reason as well as a logical one: FOUND is reset by
  -- every query, so nothing may sit between the SELECT INTO below and its IF NOT FOUND.)

  -- The TimeZone pin must actually be in force. If SET LOCAL degraded to a no-op (e.g. the
  -- channel did not keep BEGIN and the DO block on one backend), to_jsonb would render
  -- timestamptz in the ambient zone while pre_state was captured under UTC, and step 5
  -- would fail on formatting alone. Name that cause rather than discover it as a data diff.
  IF current_setting('TimeZone') <> 'UTC' THEN
    RAISE EXCEPTION 'ws3-B rollback STOP: TimeZone is % not UTC — the SET LOCAL did not take, so the before-image comparison would be invalid', current_setting('TimeZone');
  END IF;

  -- Ordering guard, mirroring rollback A's: Stage C must already be rolled back. While the
  -- job is armed it can fire at 16:50 UTC mid-revert and write a new run over the state
  -- this file is restoring. (§5 claimed each rollback file enforces its own place; without
  -- this, that was true of A and not of B — apply-harness-auditor AHA-02-5.)
  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'asset-gap-analysis-daily';
  IF n <> 0 THEN
    RAISE EXCEPTION 'ws3-B rollback STOP: asset-gap-analysis-daily is still scheduled — roll back Stage C FIRST';
  END IF;

  -- ==== select the run to revert ======================================================
  IF v_target_run_id IS NOT NULL THEN
    SELECT * INTO v_run FROM m.asset_gap_analysis_run WHERE run_id = v_target_run_id;
  ELSE
    SELECT * INTO v_run FROM m.asset_gap_analysis_run
     WHERE dry_run = false ORDER BY ran_at DESC, id DESC LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ws3-B rollback STOP: no matching run to revert';
  END IF;
  IF v_run.dry_run THEN
    RAISE EXCEPTION 'ws3-B rollback STOP: run % is a dry run and wrote nothing — refusing to act on the wrong run', v_run.run_id;
  END IF;
  IF v_run.pre_state IS NULL
     OR jsonb_typeof(v_run.pre_state->'suggestions')  <> 'array'
     OR jsonb_typeof(v_run.pre_state->'observations') <> 'array' THEN
    RAISE EXCEPTION 'ws3-B rollback STOP: run % has no usable before-image — MANUAL PK RECONCILIATION REQUIRED, do not improvise', v_run.run_id;
  END IF;

  -- It must be the NEWEST non-dry run: reverting out of order would restore stale state
  -- over a later run's writes.
  SELECT count(*) INTO n FROM m.asset_gap_analysis_run
   WHERE dry_run = false AND (ran_at, id) > (v_run.ran_at, v_run.id);
  IF n <> 0 THEN
    RAISE EXCEPTION 'ws3-B rollback STOP: % newer non-dry run(s) exist — revert newest first', n;
  END IF;

  RAISE NOTICE 'ws3-B rollback: reverting run % (ran_at %)', v_run.run_id, v_run.ran_at;

  -- 1. delete observation rows created by this run (FK to suggestion is ON DELETE CASCADE,
  --    so doing observations first is belt; step 2 would cascade anyway)
  DELETE FROM m.asset_gap_observation o
   WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_run.pre_state->'observations') e
                      WHERE (e->>'id')::uuid = o.id);
  GET DIAGNOSTICS v_obs_deleted = ROW_COUNT;

  -- 2. delete suggestion rows created by this run
  DELETE FROM m.asset_gap_suggestion s
   WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_run.pre_state->'suggestions') e
                      WHERE (e->>'id')::uuid = s.id);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- 3. restore EVERY pre-existing suggestion row, UNCONDITIONALLY and in full.
  --    v1 filtered this UPDATE on `(status, demand_count) IS DISTINCT FROM ...`, which
  --    skipped exactly the common case: the analyzer's repeat-detection UPDATE leaves
  --    status unchanged and recomputes demand_count to the same value, while overwriting
  --    last_seen_at / updated_at / latest_source_post_id / source_of_demand and the six
  --    cc-0046 classification columns. No filter here — restoring a row to its own values
  --    is a harmless no-op, and totality is what makes step 5 provable.
  UPDATE m.asset_gap_suggestion s SET
    appetite_signature          = r.appetite_signature,
    client_id                   = r.client_id,
    client_pool_policy          = r.client_pool_policy,
    permitted_governance_scopes = r.permitted_governance_scopes,
    preferred_scope_order       = r.preferred_scope_order,
    sourcing_target_scope       = r.sourcing_target_scope,
    vertical_key                = r.vertical_key,
    platform                    = r.platform,
    format                      = r.format,
    slot_kind                   = r.slot_kind,
    appetite_descriptor         = r.appetite_descriptor,
    why_needed                  = r.why_needed,
    primary_route               = r.primary_route,
    asset_gap_detected          = r.asset_gap_detected,
    asset_gap_drainability      = r.asset_gap_drainability,
    status                      = r.status,
    demand_count                = r.demand_count,
    priority_score              = r.priority_score,
    first_seen_at               = r.first_seen_at,
    last_seen_at                = r.last_seen_at,
    latest_source_post_id       = r.latest_source_post_id,
    source_of_demand            = r.source_of_demand,
    analyzer_version            = r.analyzer_version,
    inventory_policy_version    = r.inventory_policy_version,
    attempt_count               = r.attempt_count,
    next_retry_at               = r.next_retry_at,
    claimed_by                  = r.claimed_by,
    claim_expires_at            = r.claim_expires_at,
    last_error_code             = r.last_error_code,
    harvest_manifest_ref        = r.harvest_manifest_ref,
    candidates_ref              = r.candidates_ref,
    resolved_client_asset_id    = r.resolved_client_asset_id,
    resolved_shared_asset_id    = r.resolved_shared_asset_id,
    dismissed_reason            = r.dismissed_reason,
    created_at                  = r.created_at,
    updated_at                  = r.updated_at,
    subject_kind                = r.subject_kind,
    failure_state               = r.failure_state,
    classifier_version          = r.classifier_version,
    diagnostic_evidence         = r.diagnostic_evidence,
    diagnosed_at                = r.diagnosed_at,
    evidence_confidence         = r.evidence_confidence
  FROM jsonb_array_elements(v_run.pre_state->'suggestions') e
       CROSS JOIN LATERAL jsonb_populate_record(NULL::m.asset_gap_suggestion, e) r
  WHERE s.id = r.id;
  GET DIAGNOSTICS v_restored = ROW_COUNT;

  -- 3b. the restore must have touched EVERY before-imaged row. Step 5 subsumes this, but
  --     asserting it here localises the failure to the restore rather than to the compare.
  IF v_restored <> jsonb_array_length(v_run.pre_state->'suggestions') THEN
    RAISE EXCEPTION 'ws3-B rollback assert: restored % row(s) but the before-image holds %',
      v_restored, jsonb_array_length(v_run.pre_state->'suggestions');
  END IF;

  -- 4. drop the run-log row LAST, so a failure above leaves the before-image intact
  DELETE FROM m.asset_gap_analysis_run WHERE id = v_run.id;

  -- 5. FIELD-LEVEL fail-closed verification (v1 compared row counts only, so a partial
  --    restore could not be detected). Symmetric difference in both directions must be
  --    empty — this is what makes the "reverted" claim provable rather than asserted.
  SELECT count(*) INTO n FROM (
    SELECT to_jsonb(s) AS j FROM m.asset_gap_suggestion s
    EXCEPT
    SELECT e FROM jsonb_array_elements(v_run.pre_state->'suggestions') e) d;
  IF n <> 0 THEN RAISE EXCEPTION 'ws3-B rollback assert: % suggestion row(s) differ from the before-image after restore', n; END IF;

  SELECT count(*) INTO n FROM (
    SELECT e AS j FROM jsonb_array_elements(v_run.pre_state->'suggestions') e
    EXCEPT
    SELECT to_jsonb(s) FROM m.asset_gap_suggestion s) d;
  IF n <> 0 THEN RAISE EXCEPTION 'ws3-B rollback assert: % before-image suggestion row(s) are missing after restore', n; END IF;

  SELECT count(*) INTO n FROM (
    SELECT to_jsonb(o) AS j FROM m.asset_gap_observation o
    EXCEPT
    SELECT e FROM jsonb_array_elements(v_run.pre_state->'observations') e) d;
  IF n <> 0 THEN RAISE EXCEPTION 'ws3-B rollback assert: % observation row(s) differ from the before-image', n; END IF;

  SELECT count(*) INTO n FROM (
    SELECT e AS j FROM jsonb_array_elements(v_run.pre_state->'observations') e
    EXCEPT
    SELECT to_jsonb(o) FROM m.asset_gap_observation o) d;
  IF n <> 0 THEN RAISE EXCEPTION 'ws3-B rollback assert: % before-image observation row(s) are missing', n; END IF;

  RAISE NOTICE 'ws3-B rollback ok: run % reverted and verified field-for-field — % suggestion row(s) deleted, % restored, % observation row(s) deleted.',
    v_run.run_id, v_deleted, v_restored, v_obs_deleted;
END $rb_b$;

COMMIT;
