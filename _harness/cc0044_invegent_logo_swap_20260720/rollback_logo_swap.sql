-- ROLLBACK — cc-0044 Invegent logo swap. Restores full_colour as the active/approved logo, re-fences square_brand_bg.
-- Fail-closed single txn; symmetric CAS asserts. Run to revert the apply.
DO $$
DECLARE
  v_client uuid; v_active_post int; v_logo text;
  FULL_COLOUR CONSTANT uuid := 'd3d10010-9c4e-4f7a-8d21-0d5e6f7a8d10';
  SQUARE_BADGE CONSTANT uuid := 'd3d10017-9c4e-4f7a-8d21-0d5e6f7a8d17';
BEGIN
  SELECT client_id INTO v_client FROM c.client WHERE client_slug='invegent';
  IF v_client IS NULL THEN RAISE EXCEPTION 'invegent client not found'; END IF;

  -- CAS: expect square_brand_bg active (post-swap state)
  IF NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE asset_id=SQUARE_BADGE AND client_id=v_client AND is_active) THEN
    RAISE EXCEPTION 'rollback precheck FAIL: square_brand_bg is not active (nothing to revert?)';
  END IF;

  UPDATE c.client_brand_asset
    SET is_active=true, asset_meta=jsonb_set(asset_meta,'{approved}','"true"'::jsonb)
    WHERE asset_id=FULL_COLOUR AND client_id=v_client;
  UPDATE c.client_brand_asset
    SET is_active=false, asset_meta=jsonb_set(asset_meta,'{approved}','"false"'::jsonb)
    WHERE asset_id=SQUARE_BADGE AND client_id=v_client;

  SELECT count(*) INTO v_active_post FROM c.client_brand_asset
    WHERE client_id=v_client AND asset_meta->>'usage'='logo' AND is_active;
  IF v_active_post <> 1 THEN RAISE EXCEPTION 'rollback postcheck FAIL: expected exactly 1 active logo, found %', v_active_post; END IF;

  SELECT x->>'asset_key' INTO v_logo
    FROM jsonb_array_elements(public.select_template('invegent','facebook','image_quote',null,null)->'slot_resolution'->'selected') x
    WHERE x->>'slot'='Logo';
  IF v_logo IS DISTINCT FROM 'invegent_logo_full_colour' THEN
    RAISE EXCEPTION 'rollback postcheck FAIL: resolver Logo=% not invegent_logo_full_colour', v_logo;
  END IF;

  RAISE NOTICE 'invegent logo swap ROLLED BACK: active_logo_count=%, resolver Logo=%', v_active_post, v_logo;
END $$;
