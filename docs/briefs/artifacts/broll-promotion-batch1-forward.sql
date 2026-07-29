-- ============================================================================
-- Governed B-roll PROMOTION Batch 1 — FORWARD.  T3 · PRODUCT_PROOF
-- PK visual verdict 2026-07-29: "Promote the top three".
--
-- Promotes EXACTLY 3 fenced batch-1 rows to eligible, taking the eligible B-roll
-- pool from 1 -> 4 (the ratified rotation-readiness floor).
--   f84ac010  broll_pp_au_wa_perth_coastal          (rank 1, au_wa_perth)
--   aa55659e  broll_pp_generic_apartment_abstract   (rank 2, generic)
--   4653144c  broll_pp_au_nsw_suburb_waterway       (rank 3, au_nsw_sydney_metro)
-- RANK 4 (9cf9d01a broll_pp_au_nsw_suburb_skyline) STAYS FENCED — asserted by G4.
--
-- NOT a template repoint: output spec is unchanged (the template governs it), so
-- TPR-1 / Addendum v1 does not trigger. No template, resolver, worker or overlay change.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  c_ids   CONSTANT uuid[] := ARRAY['f84ac010-80bc-481e-91b7-cb9bc9b4b94f',
                                   'aa55659e-b9cf-4005-832e-161309ef2f2c',
                                   '4653144c-124d-4684-8ac3-5ddb245b8a74']::uuid[];
  c_sky   CONSTANT uuid := '9cf9d01a-8db3-4183-b2bc-a4cf334b16f1';
  c_incum CONSTANT uuid := '2d62b04e-c1b5-44df-b382-59cbb991e166';
  c_tid   CONSTANT uuid := 'dd5fd75e-982d-4c3d-89cd-7ce0936076b2';
  c_pre_digest CONSTANT text := '2cae61b90c9844d03396428459199b12';

  v_n int; v_pre int; v_post int; v_dig text; v_winner text; v_distinct int;
BEGIN
  -- G0 atomicity armed BEFORE any write
  PERFORM set_config('ice.promo_txid', txid_current()::text, TRUE);
  IF current_setting('ice.promo_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED: atomicity guard not armed'; END IF;

  -- G1 identity pin: the 3 targets must be in the exact fenced state this packet froze
  SELECT md5(string_agg(asset_id::text||'|'||is_active::text||'|'||COALESCE(asset_meta->>'approved','')
        ||'|'||COALESCE(asset_meta->>'production_use_allowed','')||'|'||COALESCE(asset_meta->>'approval_status',''),
        E'\n' ORDER BY asset_id)) INTO v_dig
    FROM c.client_brand_asset WHERE asset_id = ANY(c_ids);
  IF v_dig IS DISTINCT FROM c_pre_digest THEN
    RAISE EXCEPTION 'G1 FAILED: pre-image digest mismatch (expected % got %) — state drifted', c_pre_digest, COALESCE(v_dig,'(null)');
  END IF;

  -- G2 live baseline: pool must be exactly 1 before promotion
  SELECT count(*) INTO v_pre FROM c.client_brand_asset
   WHERE asset_meta->>'usage'='broll_background' AND is_active IS TRUE
     AND (asset_meta->>'approved')::boolean IS TRUE;
  IF v_pre <> 1 THEN RAISE EXCEPTION 'G2 FAILED: expected pool=1 pre-promotion, found %', v_pre; END IF;

  -- ---- THE PROMOTION (CAS-pinned to the fenced state) ----
  UPDATE c.client_brand_asset
     SET is_active = true,
         asset_meta = asset_meta || jsonb_build_object(
           'approved', true, 'production_use_allowed', true,
           'approval_status', 'governed', 'approved_by', 'PK',
           'approved_at', now()::text,
           'promotion_lane', 'broll-promotion-batch1 (2026-07-29)')
   WHERE asset_id = ANY(c_ids)
     AND is_active IS FALSE
     AND (asset_meta->>'approved')::boolean IS FALSE;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 3 THEN RAISE EXCEPTION 'G3 FAILED: expected exactly 3 promoted, got %', v_n; END IF;

  -- G4 rank-4 skyline clip MUST remain fenced
  IF EXISTS (SELECT 1 FROM c.client_brand_asset WHERE asset_id = c_sky
             AND (is_active IS TRUE OR (asset_meta->>'approved')::boolean IS TRUE)) THEN
    RAISE EXCEPTION 'G4 FAILED: rank-4 skyline clip was promoted but must stay fenced'; END IF;

  -- G5 incumbent clip untouched and still eligible
  IF NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE asset_id = c_incum
                 AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE) THEN
    RAISE EXCEPTION 'G5 FAILED: incumbent pool clip disturbed'; END IF;

  -- G6 pool is EXACTLY 4 (not 3, not 5) — the ratified floor, hit precisely
  SELECT count(*) INTO v_post FROM c.client_brand_asset
   WHERE asset_meta->>'usage'='broll_background' AND is_active IS TRUE
     AND (asset_meta->>'approved')::boolean IS TRUE;
  IF v_post <> 4 THEN RAISE EXCEPTION 'G6 FAILED: eligible pool is %, expected exactly 4', v_post; END IF;

  -- G7 template winner unchanged at the production signature
  v_winner := public.select_template('property-pulse', NULL, 'video_short_stat', NULL, 'promo-guard')
              ->'selected'->>'provider_template_name';
  IF v_winner IS DISTINCT FROM 'AU_generic_national_Suburb_9:16_V1' THEN
    RAISE EXCEPTION 'G7 FAILED: template winner is % but must remain AU_generic_national_Suburb_9:16_V1',
      COALESCE(v_winner,'(none)'); END IF;

  -- G8 ROTATION PROOF: every one of the 4 clips must be reachable across seeds
  SELECT count(DISTINCT p) INTO v_distinct FROM (
    SELECT (public.resolve_slot_assets('property-pulse',NULL,'video_short_stat',c_tid,'gseed-'||g)
            ->'selected'->0)->>'asset_key' AS p
    FROM generate_series(1,24) g) q;
  IF v_distinct <> 4 THEN
    RAISE EXCEPTION 'G8 FAILED: only % of 4 clips reachable across 24 seeds (unreachable clip)', v_distinct; END IF;

  IF current_setting('ice.promo_txid', TRUE) IS DISTINCT FROM txid_current()::text THEN
    RAISE EXCEPTION 'G0 FAILED (post): txn identity changed'; END IF;

  RAISE NOTICE 'PROMOTION OK: pool % -> %, all 4 reachable, rank-4 still fenced, winner %', v_pre, v_post, v_winner;
END $$;

COMMIT;
