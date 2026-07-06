-- MARKET-DATA PROMOTION — promote 1 intake candidate to governed/active. *** LIVE PRODUCTION CHANGE ***
-- bg_pp_market_data_chart_grid (b3a20011…), platform_scope {fb,ig,li}.
-- Option D: resolver pool drives PP image_quote production. At COMMIT the eligible pool grows
-- fb 8→9 / li 8→9 / ig 7→8. Rotation composition shifts on all three platforms. PK gate = acknowledgement.
BEGIN;

UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta || '{"approved":true,"approval_status":"governed","production_use_allowed":true,"approved_by":"PK","pk_decision":"promote (market-data, PK-ratified 2026-07-06) — LIVE PRODUCTION CHANGE acknowledged: joins the Option-D resolver pool (fb/li/ig); pool 8/8/8/7 → fb9/li9/ig8; usage constraint (abstract market/data, geography-neutral, text-clean) remains binding","promotion_lane":"pp-bg-mktdata-promo (2026-07-06)","promotion_packet":"_harness/image_harvester_v0/mktdata_promo/MKTDATA_PROMO_GATE_PACKET.md"}'::jsonb
      || jsonb_build_object('approved_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US+00:00')),
    notes = 'GOVERNED (promoted from intake_candidate 2026-07-06, PK market-data promotion — LIVE production-rotation change acknowledged: joins Option-D pool fb/li/ig). Abstract market/data line-chart-on-grid; text-clean (crop-proof passed); geography-neutral usage constraint stands.',
    updated_at = now()
WHERE asset_id = 'b3a20011-9c4e-4f7a-8d21-0d5e6f7a8b11' AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_market_data_chart_grid'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
  AND asset_meta->>'approval_status' = 'intake_candidate'
  AND asset_meta->>'sha256' = 'd3cb9b1c305d207bde49c3a114b51fa33b5693dd0fed9c5f73ec94addaf517b0';

DO $$
DECLARE promoted int; pool int; fb int; li int; ig int; gov int;
BEGIN
  SELECT count(*) INTO promoted FROM c.client_brand_asset
  WHERE asset_id = 'b3a20011-9c4e-4f7a-8d21-0d5e6f7a8b11'
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE
    AND asset_meta->>'approval_status' = 'governed' AND (asset_meta->>'production_use_allowed')::boolean IS TRUE
    AND asset_meta->>'promotion_lane' = 'pp-bg-mktdata-promo (2026-07-06)' AND asset_meta ? 'approved_at' AND asset_meta->>'approved_by' = 'PK';
  IF promoted <> 1 THEN RAISE EXCEPTION 'mktdata-promo verify failed: % promoted, expected 1 — rolled back', promoted; END IF;

  -- eligible pool must become exactly 9 (fb9/li9/ig8) — production-live under Option D
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
  IF pool<>9 OR fb<>9 OR li<>9 OR ig<>8 THEN
    RAISE EXCEPTION 'mktdata-promo verify failed: pool (all=% fb=% li=% ig=%), expected 9/9/9/8 — rolled back', pool, fb, li, ig; END IF;

  -- prior 8 governed backgrounds must remain governed (untouched)
  SELECT count(*) INTO gov FROM c.client_brand_asset
  WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' IN ('bg_brisbane_cbd','bg_perth_cbd','bg_pp_advisory_desk_flatlay','bg_pp_au_suburb_aerial_grid','bg_pp_home_keys_contract_table','bg_pp_kitchen_living_open_plan','bg_pp_perth_cbd_skyline_day_wide','bg_sydney_cbd')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF gov <> 8 THEN RAISE EXCEPTION 'mktdata-promo verify failed: prior governed set=%, expected 8 untouched — rolled back', gov; END IF;
END $$;

COMMIT;
