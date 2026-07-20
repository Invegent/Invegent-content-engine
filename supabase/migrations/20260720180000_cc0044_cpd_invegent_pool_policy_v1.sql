-- BACKFILL RECORD — applied 2026-07-20 via execute_sql at a T3 PK gate (apply_migration is
-- harness-deny-listed); recorded post-hoc. Already applied; NOT for replay (the in-txn idempotency
-- guard raises if an Invegent policy row already exists).
-- Version > 20260720170000 so the ledger stays monotonic; name is unique.
-- Verified live-matching 2026-07-20 (execute_sql read): c.client_asset_pool_policy(invegent) =
--   pool_policy=client_preferred · allow_vertical_shared=false · allow_global_shared=true ·
--   client_asset_score_bias=0 · minimum_fit_score=NULL · policy_version=cc-0044-invegent-v1.
--
-- cc-0044 Checkpoint D (INVEGENT) · item 2 enabler — shared-inventory pool policy.
-- Migration identity: 20260720180000_cc0044_cpd_invegent_pool_policy_v1
--
-- Let Invegent draw governed global_generic backgrounds from the reusable shared pool
--   (c.shared_creative_asset). analyze_asset_gap adds 'global_generic' to permitted scopes ONLY WHEN
--   pool_policy IN ('client_preferred','best_fit') AND allow_global_shared=true. Hard prerequisite that
--   was LIVE before this row: the CARRY-2 analyze_asset_gap `::text` cast fix (ledger 20260720160000) —
--   without it the client_preferred branch raises 22P02.
-- Provenance: forward SQL == _harness/cc0044_cpd_invegent_20260720/INV_STAGE_pool_policy_apply.sql.

BEGIN;
DO $$
DECLARE
  v_inv uuid := '93494a09-cc89-41d1-b364-cb63983063a6';
  v_dup int; v_n int;
BEGIN
  -- Idempotency guard: no existing policy row for Invegent
  SELECT count(*) INTO v_dup FROM c.client_asset_pool_policy WHERE client_id = v_inv;
  IF v_dup <> 0 THEN RAISE EXCEPTION 'GUARD_FAIL: Invegent already has a pool policy row, n=%', v_dup; END IF;

  INSERT INTO c.client_asset_pool_policy
    (client_id, pool_policy, allow_vertical_shared, allow_global_shared,
     client_asset_score_bias, minimum_fit_score, policy_version)
  VALUES
    (v_inv, 'client_preferred', false, true,
     0, NULL, 'cc-0044-invegent-v1');

  -- Post-assert: exactly one Invegent row, shaped to enable the global shared pool
  SELECT count(*) INTO v_n FROM c.client_asset_pool_policy
    WHERE client_id = v_inv AND pool_policy = 'client_preferred' AND allow_global_shared IS TRUE;
  IF v_n <> 1 THEN RAISE EXCEPTION 'POSTASSERT_FAIL: expected 1 global-shared-enabled Invegent policy, got %', v_n; END IF;
END $$;
COMMIT;

-- ROLLBACK (restore exact pre-state = no row) — validated before apply. Reverts Invegent to default client_only.
-- DELETE FROM c.client_asset_pool_policy
-- WHERE client_id = '93494a09-cc89-41d1-b364-cb63983063a6' AND policy_version = 'cc-0044-invegent-v1';
