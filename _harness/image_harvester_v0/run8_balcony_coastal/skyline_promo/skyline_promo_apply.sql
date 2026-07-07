-- SKYLINE PROMOTION — promote 1 intake candidate to governed/active. *** LIVE PRODUCTION CHANGE ***
-- bg_pp_city_skyline_vantage (b3a20012…, GENERIC Sao Paulo skyline), platform_scope {fb,ig,li}.
-- Option D: resolver pool drives PP image_quote production. At COMMIT the eligible pool grows fb 10→11 / li 10→11 / ig 9→10.
-- §2 keeps the FULL T3 chain (P2 waiver is intake-only). PK gate = live-rotation acknowledgement. GEOGRAPHY FENCE: generic-only, never AU/Perth/WA.
BEGIN;

UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta || '{"approved":true,"approval_status":"governed","production_use_allowed":true,"approved_by":"PK","pk_decision":"promote (city_skyline_vantage, PK-ratified 2026-07-06) — LIVE PRODUCTION CHANGE acknowledged: joins the Option-D resolver pool (fb/li/ig); pool 10/10/10/9 → 11/11/11/10; GENERIC-only geography fence (never label AU/Perth/WA — it is Sao Paulo) remains binding","promotion_lane":"pp-bg-skyline-promo (2026-07-06)","promotion_packet":"_harness/image_harvester_v0/run8_balcony_coastal/skyline_promo/SKYLINE_PROMO_GATE_PACKET.md"}'::jsonb
      || jsonb_build_object('approved_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US+00:00')),
    notes = 'GOVERNED (promoted from intake_candidate 2026-07-06, PK skyline promotion — LIVE production-rotation change acknowledged: joins Option-D pool fb/li/ig). GENERIC non-Australian skyline (Sao Paulo); usable generic-only; NEVER label AU/Perth/WA/any Australian capital.',
    updated_at = now()
WHERE asset_id = 'b3a20012-9c4e-4f7a-8d21-0d5e6f7a8b12' AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_city_skyline_vantage'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
  AND asset_meta->>'approval_status' = 'intake_candidate'
  AND asset_meta->>'sha256' = '2ef9d39b15ba0e683e7e3bd3b3114a91e3b6df6b38aa0e3529155e58fb45c66d';

DO $$
DECLARE promoted int; pool int; fb int; li int; ig int; gov int;
BEGIN
  SELECT count(*) INTO promoted FROM c.client_brand_asset
  WHERE asset_id = 'b3a20012-9c4e-4f7a-8d21-0d5e6f7a8b12'
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE
    AND asset_meta->>'approval_status' = 'governed' AND (asset_meta->>'production_use_allowed')::boolean IS TRUE
    AND asset_meta->>'promotion_lane' = 'pp-bg-skyline-promo (2026-07-06)' AND asset_meta ? 'approved_at' AND asset_meta->>'approved_by' = 'PK';
  IF promoted <> 1 THEN RAISE EXCEPTION 'skyline-promo verify failed: % promoted, expected 1 — rolled back', promoted; END IF;

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
  IF pool<>11 OR fb<>11 OR li<>11 OR ig<>10 THEN
    RAISE EXCEPTION 'skyline-promo verify failed: pool (all=% fb=% li=% ig=%), expected 11/11/11/10 — rolled back', pool, fb, li, ig; END IF;

  SELECT count(*) INTO gov FROM c.client_brand_asset
  WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' IN ('bg_brisbane_cbd','bg_perth_cbd','bg_pp_advisory_desk_flatlay','bg_pp_au_suburb_aerial_grid','bg_pp_coastal_waterfront','bg_pp_home_keys_contract_table','bg_pp_kitchen_living_open_plan','bg_pp_market_data_chart_grid','bg_pp_perth_cbd_skyline_day_wide','bg_sydney_cbd')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF gov <> 10 THEN RAISE EXCEPTION 'skyline-promo verify failed: prior governed set=%, expected 10 untouched — rolled back', gov; END IF;
END $$;

COMMIT;
