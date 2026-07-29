-- ============================================================================
-- B-roll platform_scope correction v1 — ROLLBACK
-- Restores c.client_brand_asset.platform_scope to {youtube} on exactly the 2 rows
-- the forward packet changed, and PROVES the restore by recomputing the forward
-- packet's own frozen pre-image digest.
--
-- Self-verifying and identity-pinned: refuses to run against a state it did not
-- create (i.e. if the forward apply never ran, or something else moved the rows).
-- Same guard model as forward — every check is an executable RAISE.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  c_expect_pre_digest CONSTANT text := 'a779f700296959c8cf18e28cdcceb1b8';  -- forward's PRE-image = rollback's TARGET
  c_tid               CONSTANT uuid := 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2';
  c_a1                CONSTANT uuid := '42211c0f-6d06-4780-950a-a4a1d61b880b';
  c_a2                CONSTANT uuid := '2d62b04e-c1b5-44df-b382-59cbb991e166';
  c_applied_scope     CONSTANT text[] := ARRAY['facebook','instagram','youtube'];
  c_orig_scope        CONSTANT text[] := ARRAY['youtube'];

  v_n            int;
  v_restored     text;
  v_before_null  jsonb;
  v_after_null   jsonb;
BEGIN
  -- G0 — arm atomicity before any write.
  PERFORM set_config('ice.rollback_txid', txid_current()::text, TRUE);
  IF current_setting('ice.rollback_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED: atomicity guard could not be armed — refusing to write';
  END IF;

  -- G1 — identity pin: both rows must currently be in the APPLIED state.
  IF (SELECT count(*) FROM c.client_brand_asset
       WHERE asset_id IN (c_a1, c_a2) AND platform_scope = c_applied_scope) <> 2 THEN
    RAISE EXCEPTION 'G1 FAILED: the 2 rows are not both in the applied state {facebook,instagram,youtube} — this rollback did not create the current state, refusing to write';
  END IF;

  v_before_null := public.resolve_slot_assets('property-pulse', NULL, 'video_short_stat', c_tid, 'rollback-invariance-probe');

  -- ---- THE RESTORE ------------------------------------------------------
  UPDATE c.client_brand_asset
     SET platform_scope = c_orig_scope
   WHERE asset_id IN (c_a1, c_a2)
     AND platform_scope = c_applied_scope;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n <> 2 THEN
    RAISE EXCEPTION 'G2 FAILED: expected exactly 2 rows restored, got % — refusing to commit', v_n;
  END IF;

  -- G3 — PROVE the restore: recompute the forward packet's frozen pre-image digest.
  SELECT md5(string_agg(
           asset_id::text || '|' || COALESCE(platform_scope::text,'NULL') || '|' ||
           is_active::text || '|' || COALESCE(asset_meta->>'approved','') || '|' ||
           COALESCE(asset_meta->>'safe_for_text_overlay',''), E'\n' ORDER BY asset_id))
    INTO v_restored
    FROM c.client_brand_asset
   WHERE asset_id IN (c_a1, c_a2);

  IF v_restored IS DISTINCT FROM c_expect_pre_digest THEN
    RAISE EXCEPTION 'G3 FAILED: restore is NOT digest-exact. expected=% actual=% — refusing to commit',
      c_expect_pre_digest, COALESCE(v_restored,'(null)');
  END IF;

  -- G4 — production-signature invariance holds on the way back too.
  v_after_null := public.resolve_slot_assets('property-pulse', NULL, 'video_short_stat', c_tid, 'rollback-invariance-probe');
  IF v_before_null IS DISTINCT FROM v_after_null THEN
    RAISE EXCEPTION 'G4 FAILED: production-signature resolver payload changed during rollback — refusing to commit';
  END IF;

  IF current_setting('ice.rollback_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED (post): transaction identity changed mid-rollback — refusing to commit';
  END IF;

  RAISE NOTICE 'ROLLBACK OK: 2 rows restored to {youtube}; digest-exact to %; production-signature payload unchanged', c_expect_pre_digest;
END $$;

COMMIT;
