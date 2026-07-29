-- ============================================================================
-- Governed B-roll PROMOTION Batch 1 — ROLLBACK
-- Re-fences the 3 promoted rows, returning the eligible pool 4 -> 1, and PROVES the
-- restore by recomputing the forward packet's frozen pre-image digest.
-- Identity-pinned: refuses to run against a state it did not create.
-- Storage objects are NOT touched (rows only) — the clips stay uploaded and fenced.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  c_ids  CONSTANT uuid[] := ARRAY['f84ac010-80bc-481e-91b7-cb9bc9b4b94f',
                                  'aa55659e-b9cf-4005-832e-161309ef2f2c',
                                  '4653144c-124d-4684-8ac3-5ddb245b8a74']::uuid[];
  c_incum CONSTANT uuid := '2d62b04e-c1b5-44df-b382-59cbb991e166';
  c_pre_digest CONSTANT text := '2cae61b90c9844d03396428459199b12';  -- forward's PRE-image = rollback TARGET
  v_n int; v_post int; v_dig text;
BEGIN
  PERFORM set_config('ice.rb_txid', txid_current()::text, TRUE);
  IF current_setting('ice.rb_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED: atomicity guard not armed'; END IF;

  -- G1 identity pin: all 3 must currently be in the PROMOTED state
  IF (SELECT count(*) FROM c.client_brand_asset
       WHERE asset_id = ANY(c_ids) AND is_active IS TRUE
         AND (asset_meta->>'approved')::boolean IS TRUE) <> 3 THEN
    RAISE EXCEPTION 'G1 FAILED: the 3 rows are not all in the promoted state — this rollback did not create the current state';
  END IF;

  -- ---- THE RE-FENCE ----
  UPDATE c.client_brand_asset
     SET is_active = false,
         asset_meta = (asset_meta - 'approved_by' - 'approved_at' - 'promotion_lane')
           || jsonb_build_object('approved', false, 'production_use_allowed', false,
                                 'approval_status', 'intake_candidate')
   WHERE asset_id = ANY(c_ids) AND is_active IS TRUE;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 3 THEN RAISE EXCEPTION 'G2 FAILED: expected 3 re-fenced, got %', v_n; END IF;

  -- G3 PROVE the restore: recompute the forward packet's frozen pre-image digest
  SELECT md5(string_agg(asset_id::text||'|'||is_active::text||'|'||COALESCE(asset_meta->>'approved','')
        ||'|'||COALESCE(asset_meta->>'production_use_allowed','')||'|'||COALESCE(asset_meta->>'approval_status',''),
        E'\n' ORDER BY asset_id)) INTO v_dig
    FROM c.client_brand_asset WHERE asset_id = ANY(c_ids);
  IF v_dig IS DISTINCT FROM c_pre_digest THEN
    RAISE EXCEPTION 'G3 FAILED: restore is NOT digest-exact (expected % got %)', c_pre_digest, COALESCE(v_dig,'(null)');
  END IF;

  -- G4 pool back to exactly 1, incumbent still eligible
  SELECT count(*) INTO v_post FROM c.client_brand_asset
   WHERE asset_meta->>'usage'='broll_background' AND is_active IS TRUE
     AND (asset_meta->>'approved')::boolean IS TRUE;
  IF v_post <> 1 THEN RAISE EXCEPTION 'G4 FAILED: pool is % after rollback, expected 1', v_post; END IF;
  IF NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE asset_id = c_incum AND is_active IS TRUE) THEN
    RAISE EXCEPTION 'G4 FAILED: incumbent clip disturbed during rollback'; END IF;

  RAISE NOTICE 'ROLLBACK OK: 3 re-fenced, digest-exact to %, pool back to %', c_pre_digest, v_post;
END $$;

COMMIT;
