-- ============================================================================
-- B-roll platform_scope correction v1 — FORWARD
-- Lane: broll-platform-scope-correction-v1 · T2 · SAFETY_GATE
-- PK instruction 2026-07-29: "Fix the platform_scope on both rows"
--
-- WHAT: c.client_brand_asset.platform_scope  {youtube} -> {facebook,instagram,youtube}
--       on exactly 2 rows (the only two usage='broll_background' rows that exist).
--       LinkedIn deliberately EXCLUDED (video-broll-intake-v1 Gate-1 ruling 4 —
--       until LinkedIn's governed vertical-video template + publisher path are proven).
--
-- NO DDL. NO GRANT. NO fence change. NO fit_status/enabled change. 2 rows, 1 column.
--
-- SAFETY MODEL — every guard below is an executable RAISE, never a comment:
--   G0 atomicity armed BEFORE the first write (preventive, not detective)
--   G1 pre-image digest must match the frozen value (refuses a state it did not create)
--   G2 row count must be exactly 2 (fail-closed on over/under-match)
--   G3 post-image must be exactly the intended scope on both rows
--   G4 PRODUCTION-SIGNATURE INVARIANCE: the resolver payload at p_platform=NULL
--      (the real production call) must be byte-identical before and after.
--      This is the guard that proves the change cannot alter what production renders.
--   G5 LinkedIn must still fail closed (proves the exclusion actually took)
-- Any guard failing aborts the whole transaction. Nothing partial can land.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  c_expect_pre_digest CONSTANT text := 'a779f700296959c8cf18e28cdcceb1b8';
  c_tid               CONSTANT uuid := 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2';
  c_a1                CONSTANT uuid := '42211c0f-6d06-4780-950a-a4a1d61b880b'; -- perth skyline (fenced)
  c_a2                CONSTANT uuid := '2d62b04e-c1b5-44df-b382-59cbb991e166'; -- au suburb aerial (live)
  c_new_scope         CONSTANT text[] := ARRAY['facebook','instagram','youtube'];

  v_pre_digest  text;
  v_post_bad    int;
  v_n           int;
  v_before_null jsonb;
  v_after_null  jsonb;
  v_li          text;
BEGIN
  -- G0 — arm atomicity BEFORE any write.
  PERFORM set_config('ice.apply_txid', txid_current()::text, TRUE);
  IF current_setting('ice.apply_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED: atomicity guard could not be armed — refusing to write';
  END IF;

  -- G1 — pre-image identity. Refuses to run against a state this packet did not freeze.
  SELECT md5(string_agg(
           asset_id::text || '|' || COALESCE(platform_scope::text,'NULL') || '|' ||
           is_active::text || '|' || COALESCE(asset_meta->>'approved','') || '|' ||
           COALESCE(asset_meta->>'safe_for_text_overlay',''), E'\n' ORDER BY asset_id))
    INTO v_pre_digest
    FROM c.client_brand_asset
   WHERE asset_id IN (c_a1, c_a2);

  IF v_pre_digest IS DISTINCT FROM c_expect_pre_digest THEN
    RAISE EXCEPTION 'G1 FAILED: pre-image digest mismatch. expected=% actual=% — state drifted since freeze, refusing to write',
      c_expect_pre_digest, COALESCE(v_pre_digest,'(null)');
  END IF;

  -- Baseline the production-signature resolver payload BEFORE the write (for G4).
  v_before_null := public.resolve_slot_assets('property-pulse', NULL, 'video_short_stat', c_tid, 'apply-invariance-probe');

  -- ---- THE CHANGE -------------------------------------------------------
  UPDATE c.client_brand_asset
     SET platform_scope = c_new_scope
   WHERE asset_id IN (c_a1, c_a2)
     AND platform_scope = ARRAY['youtube']::text[];   -- CAS: only from the known state
  GET DIAGNOSTICS v_n = ROW_COUNT;

  -- G2 — exactly 2 rows, no more, no fewer.
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'G2 FAILED: expected exactly 2 rows updated, got % — refusing to commit', v_n;
  END IF;

  -- G3 — post-image is exactly the intended scope on both rows.
  SELECT count(*) INTO v_post_bad
    FROM c.client_brand_asset
   WHERE asset_id IN (c_a1, c_a2)
     AND platform_scope IS DISTINCT FROM c_new_scope;
  IF v_post_bad <> 0 THEN
    RAISE EXCEPTION 'G3 FAILED: % of 2 rows do not carry the intended scope — refusing to commit', v_post_bad;
  END IF;

  -- G4 — PRODUCTION-SIGNATURE INVARIANCE. The production video path calls with
  -- p_platform=NULL; its resolver payload must be byte-identical across this change.
  v_after_null := public.resolve_slot_assets('property-pulse', NULL, 'video_short_stat', c_tid, 'apply-invariance-probe');
  IF v_before_null IS DISTINCT FROM v_after_null THEN
    RAISE EXCEPTION 'G4 FAILED: production-signature resolver payload CHANGED. before=% after=% — refusing to commit',
      v_before_null::text, v_after_null::text;
  END IF;

  -- G5 — LinkedIn must STILL fail closed (ruling 4 exclusion actually took effect).
  v_li := public.resolve_slot_assets('property-pulse', 'linkedin', 'video_short_stat', c_tid, 'apply-invariance-probe')->>'status';
  IF v_li IS DISTINCT FROM 'fail_closed' THEN
    RAISE EXCEPTION 'G5 FAILED: linkedin resolved "%" but must remain fail_closed — refusing to commit', COALESCE(v_li,'(null)');
  END IF;

  -- G0 re-assert: same transaction throughout.
  IF current_setting('ice.apply_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED (post): transaction identity changed mid-apply — refusing to commit';
  END IF;

  RAISE NOTICE 'APPLY OK: 2 rows -> {facebook,instagram,youtube}; production-signature payload byte-identical; linkedin still fail_closed';
END $$;

COMMIT;

-- Post-apply readback (run separately; expect both rows = {facebook,instagram,youtube}).
-- SELECT asset_id, asset_meta->>'asset_key' AS asset_key, platform_scope
--   FROM c.client_brand_asset
--  WHERE asset_id IN ('42211c0f-6d06-4780-950a-a4a1d61b880b','2d62b04e-c1b5-44df-b382-59cbb991e166')
--  ORDER BY created_at;
