-- COASTAL PROMOTION — promote 1 intake candidate to governed/active. *** LIVE PRODUCTION CHANGE ***
-- bg_pp_coastal_waterfront (b3a20013…, Whitehaven QLD), platform_scope {fb,ig,li}. First coastal in the live pool.
-- Option D: resolver pool drives PP image_quote production. At COMMIT the eligible pool grows fb 9→10 / li 9→10 / ig 8→9.
-- §2 keeps the FULL T3 chain (P2 waiver is intake-only). PK gate = live-rotation acknowledgement.
BEGIN;

UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta || '{"approved":true,"approval_status":"governed","production_use_allowed":true,"approved_by":"PK","pk_decision":"promote (coastal_waterfront, PK-ratified 2026-07-06) — LIVE PRODUCTION CHANGE acknowledged: joins the Option-D resolver pool (fb/li/ig); pool 9/9/9/8 → fb10/li10/ig9; label constraint (AU coastal / Whitehaven QLD, NEVER Perth/WA) remains binding","promotion_lane":"pp-bg-coastal-promo (2026-07-06)","promotion_packet":"_harness/image_harvester_v0/run8_balcony_coastal/coastal_promo/COASTAL_PROMO_GATE_PACKET.md"}'::jsonb
      || jsonb_build_object('approved_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US+00:00')),
    notes = 'GOVERNED (promoted from intake_candidate 2026-07-06, PK coastal promotion — LIVE production-rotation change acknowledged: joins Option-D pool fb/li/ig; first coastal in the pool). AU coastal (Whitehaven QLD); label AU coastal only, NEVER Perth/WA; two small unbranded moored vessels lower-centre (scrim/crop).',
    updated_at = now()
WHERE asset_id = 'b3a20013-9c4e-4f7a-8d21-0d5e6f7a8b13' AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_coastal_waterfront'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
  AND asset_meta->>'approval_status' = 'intake_candidate'
  AND asset_meta->>'sha256' = 'b164c47a28edd1f5e24ab09fed932ba4d18cd3a53f595c009cd1debcea346966';

DO $$
DECLARE promoted int; pool int; fb int; li int; ig int; gov int;
BEGIN
  SELECT count(*) INTO promoted FROM c.client_brand_asset
  WHERE asset_id = 'b3a20013-9c4e-4f7a-8d21-0d5e6f7a8b13'
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE
    AND asset_meta->>'approval_status' = 'governed' AND (asset_meta->>'production_use_allowed')::boolean IS TRUE
    AND asset_meta->>'promotion_lane' = 'pp-bg-coastal-promo (2026-07-06)' AND asset_meta ? 'approved_at' AND asset_meta->>'approved_by' = 'PK';
  IF promoted <> 1 THEN RAISE EXCEPTION 'coastal-promo verify failed: % promoted, expected 1 — rolled back', promoted; END IF;

  WITH elig AS (
    SELECT a.platform_scope FROM c.client_brand_asset a
    WHERE a.client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND a.asset_meta->>'usage'='background'
      AND a.is_active AND (a.asset_meta->>'approved')::boolean
      AND (a.asset_meta->>'license_type' IS NOT NULL OR a.asset_meta->>'license' IS NOT NULL)
      AND COALESCE(a.asset_meta->>'bucket','')='brand-assets'
      AND a.asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim'))
  SELECT count(*), count(*) FILTER (WHERE platform_scope IS NULL OR 'facebook'=ANY(platform_scope)),
         count(*) FILTER (WHERE platform_scope IS NULL OR 'linkedin'=ANY(platform_scope)),
         count(*) FILTER (WHERE platform_scope IS NULL OR 'instagram'=ANY(platform_scope))
    INTO pool, fb, li, ig FROM elig;
  IF pool<>10 OR fb<>10 OR li<>10 OR ig<>9 THEN
    RAISE EXCEPTION 'coastal-promo verify failed: pool (all=% fb=% li=% ig=%), expected 10/10/10/9 — rolled back', pool, fb, li, ig; END IF;

  SELECT count(*) INTO gov FROM c.client_brand_asset
  WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' IN ('bg_brisbane_cbd','bg_perth_cbd','bg_pp_advisory_desk_flatlay','bg_pp_au_suburb_aerial_grid','bg_pp_home_keys_contract_table','bg_pp_kitchen_living_open_plan','bg_pp_market_data_chart_grid','bg_pp_perth_cbd_skyline_day_wide','bg_sydney_cbd')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF gov <> 9 THEN RAISE EXCEPTION 'coastal-promo verify failed: prior governed set=%, expected 9 untouched — rolled back', gov; END IF;
END $$;

COMMIT;
