-- NDIS bg ROTATION - promote 4 fenced rows -> eligible (governed). CAS-guarded, fail-closed. T3.
-- Mirrors the v5.74 N5 promotion. PK visual PASS 2026-07-19 (crop-proof PROMO_FINALISTS_4.jpg).
DO $$
DECLARE
  v_ndis uuid;
  v_elig_before int; v_pp_before int; v_elig_after int; v_pp_after int; v_upd int;
BEGIN
  SELECT client_id INTO v_ndis FROM c.client WHERE client_slug='ndis-yarns';
  IF v_ndis IS NULL THEN RAISE EXCEPTION 'STOP: ndis-yarns client not found'; END IF;

  SELECT count(*) INTO v_elig_before FROM c.client_brand_asset a
    WHERE a.client_id=v_ndis AND a.asset_type='other' AND a.is_active
      AND a.asset_meta->>'approved'='true' AND a.asset_meta->>'usage'='background';
  SELECT count(*) INTO v_pp_before FROM c.client_brand_asset a
    JOIN c.client cc ON cc.client_id=a.client_id
    WHERE cc.client_slug='property-pulse' AND a.is_active AND a.asset_meta->>'approved'='true';
  IF v_elig_before <> 1  THEN RAISE EXCEPTION 'STOP: NDIS eligible-bg baseline expected 1 got %', v_elig_before; END IF;
  IF v_pp_before   <> 30 THEN RAISE EXCEPTION 'STOP: PP eligible baseline expected 30 got %', v_pp_before; END IF;

  UPDATE c.client_brand_asset
  SET is_active = true,
      asset_meta = asset_meta || jsonb_build_object(
        'approved', true,
        'production_use_allowed', true,
        'approval_status', 'governed',
        'safe_for_text_overlay', 'needs_scrim',
        'promoted_by', 'D7 NDIS bg rotation promotion (4-of-14) - PK visual gate 2026-07-19; crop-proof PROMO_FINALISTS_4.jpg')
  WHERE client_id = v_ndis
    AND asset_id IN (
      'a6eba9f9-874e-461e-bcd4-16d43b7a7f3c',   -- bg_ny_brand_texture_flat_navy
      'c2143420-af9e-4bc9-80c5-f68beec7ed19',   -- bg_ny_brand_texture_deep_navy_solid
      'a7a1de90-18fb-4419-ab11-a75ba3aa92fc',   -- bg_ny_brand_texture_teal_navy_gradient
      '6849877f-b906-4cc8-8bf6-98b130537b6a')   -- bg_ny_datagrid_navy_grid
    AND is_active = false
    AND asset_meta->>'approved' = 'false'
    AND asset_meta->>'approval_status' = 'intake_candidate';   -- CAS guard (only flip still-fenced rows)
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  IF v_upd <> 4 THEN RAISE EXCEPTION 'STOP: expected 4 promoted got % (CAS mismatch / already promoted / wrong id)', v_upd; END IF;

  -- every target now fully governed
  IF EXISTS (SELECT 1 FROM c.client_brand_asset a
             WHERE a.client_id=v_ndis AND a.asset_id IN (
               'a6eba9f9-874e-461e-bcd4-16d43b7a7f3c','c2143420-af9e-4bc9-80c5-f68beec7ed19',
               'a7a1de90-18fb-4419-ab11-a75ba3aa92fc','6849877f-b906-4cc8-8bf6-98b130537b6a')
               AND NOT (a.is_active
                        AND a.asset_meta->>'approved'='true'
                        AND a.asset_meta->>'production_use_allowed'='true'
                        AND a.asset_meta->>'approval_status'='governed')) THEN
    RAISE EXCEPTION 'STOP: a promoted row is not fully governed';
  END IF;

  SELECT count(*) INTO v_elig_after FROM c.client_brand_asset a
    WHERE a.client_id=v_ndis AND a.asset_type='other' AND a.is_active
      AND a.asset_meta->>'approved'='true' AND a.asset_meta->>'usage'='background';
  SELECT count(*) INTO v_pp_after FROM c.client_brand_asset a
    JOIN c.client cc ON cc.client_id=a.client_id
    WHERE cc.client_slug='property-pulse' AND a.is_active AND a.asset_meta->>'approved'='true';
  IF v_elig_after <> v_elig_before + 4 THEN RAISE EXCEPTION 'STOP: NDIS eligible-bg expected % got %', v_elig_before+4, v_elig_after; END IF;
  IF v_pp_after   <> v_pp_before      THEN RAISE EXCEPTION 'STOP: PP eligible moved % -> %', v_pp_before, v_pp_after; END IF;

  RAISE NOTICE 'OK: 4 NDIS bg promoted; NDIS eligible-bg %->% ; PP eligible % unchanged', v_elig_before, v_elig_after, v_pp_after;
END $$;
