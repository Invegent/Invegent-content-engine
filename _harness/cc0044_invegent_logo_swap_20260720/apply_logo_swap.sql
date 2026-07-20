-- cc-0044 Invegent logo swap — promote square brand-badge, retire full-colour (T3 production rotation)
-- Makes production match the PK-approved Proof #1 look. Fail-closed single txn (any assertion → full rollback).
-- Pool-neutral: touches ONLY invegent's two logo rows; no other client/asset affected.
-- Eligibility model: resolve_slot_assets Logo slot = is_active AND asset_meta.approved (client_match, license_ok).
DO $$
DECLARE
  v_client uuid;
  v_active_pre int; v_active_post int; v_logo text;
  FULL_COLOUR CONSTANT uuid := 'd3d10010-9c4e-4f7a-8d21-0d5e6f7a8d10';  -- invegent_logo_full_colour (currently active)
  SQUARE_BADGE CONSTANT uuid := 'd3d10017-9c4e-4f7a-8d21-0d5e6f7a8d17'; -- invegent_logo_square_brand_bg (target)
BEGIN
  SELECT client_id INTO v_client FROM c.client WHERE client_slug='invegent';
  IF v_client IS NULL THEN RAISE EXCEPTION 'invegent client not found'; END IF;

  -- CAS preconditions (fail-closed if live state has drifted from the reviewed baseline)
  IF NOT EXISTS (SELECT 1 FROM c.client_brand_asset
                 WHERE asset_id=FULL_COLOUR AND client_id=v_client AND is_active AND asset_meta->>'approved'='true') THEN
    RAISE EXCEPTION 'precheck FAIL: full_colour is not the active+approved logo';
  END IF;
  IF EXISTS (SELECT 1 FROM c.client_brand_asset WHERE asset_id=SQUARE_BADGE AND is_active) THEN
    RAISE EXCEPTION 'precheck FAIL: square_brand_bg already active';
  END IF;
  SELECT count(*) INTO v_active_pre FROM c.client_brand_asset
    WHERE client_id=v_client AND asset_meta->>'usage'='logo' AND is_active;
  IF v_active_pre <> 1 THEN RAISE EXCEPTION 'precheck FAIL: expected exactly 1 active invegent logo, found %', v_active_pre; END IF;

  -- Swap
  UPDATE c.client_brand_asset
    SET is_active=true, asset_meta=jsonb_set(asset_meta,'{approved}','"true"'::jsonb)
    WHERE asset_id=SQUARE_BADGE AND client_id=v_client;
  UPDATE c.client_brand_asset
    SET is_active=false, asset_meta=jsonb_set(asset_meta,'{approved}','"false"'::jsonb)
    WHERE asset_id=FULL_COLOUR AND client_id=v_client;

  -- Postconditions: exactly one active logo, and the resolver now picks the square badge
  SELECT count(*) INTO v_active_post FROM c.client_brand_asset
    WHERE client_id=v_client AND asset_meta->>'usage'='logo' AND is_active;
  IF v_active_post <> 1 THEN RAISE EXCEPTION 'postcheck FAIL: expected exactly 1 active logo, found %', v_active_post; END IF;

  SELECT x->>'asset_key' INTO v_logo
    FROM jsonb_array_elements(public.select_template('invegent','facebook','image_quote',null,null)->'slot_resolution'->'selected') x
    WHERE x->>'slot'='Logo';
  IF v_logo IS DISTINCT FROM 'invegent_logo_square_brand_bg' THEN
    RAISE EXCEPTION 'postcheck FAIL: resolver Logo=% not invegent_logo_square_brand_bg', v_logo;
  END IF;

  RAISE NOTICE 'invegent logo swap OK: active_logo_count=%, resolver Logo=%', v_active_post, v_logo;
END $$;
