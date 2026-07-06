-- PROMOTION v2 — promote 2 intake candidates to governed/active. *** LIVE PRODUCTION CHANGE ***
-- kitchen_living_open_plan (#1) + advisory_desk_flatlay (#2), both platform_scope {fb,ig,li}.
-- Option D: resolver pool drives PP image_quote production. At COMMIT the eligible pool grows
-- fb 6→8 / li 6→8 / ig 5→7. Rotation composition shifts on all three platforms. PK gate = acknowledgement.
BEGIN;

-- bg_pp_kitchen_living_open_plan (#1)
UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta || '{"approved":true,"approval_status":"governed","production_use_allowed":true,"approved_by":"PK","pk_decision":"promote (promotion review v2 #1, PK-ratified 2026-07-06) — LIVE PRODUCTION CHANGE acknowledged: joins the Option-D resolver pool (fb/li/ig); pool 6/6/6/5 → fb8/li8/ig7; usage constraints in visual_review_note/label_constraint remain binding","promotion_lane":"pp-bg-promo-v2 (2026-07-06)","promotion_packet":"_harness/image_harvester_v0/promo_review2/PROMOTION_V2_GATE_PACKET.md"}'::jsonb
      || jsonb_build_object('approved_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US+00:00')),
    notes = 'GOVERNED (promoted from intake_candidate 2026-07-06, PK promotion review v2 #1 — LIVE production-rotation change acknowledged: joins Option-D pool fb/li/ig). Verified-AU open-plan; warm sunset-flare mood (style note); first interior in the pool.',
    updated_at = now()
WHERE asset_id = 'b3a20003-9c4e-4f7a-8d21-0d5e6f7a8b03' AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_kitchen_living_open_plan'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
  AND asset_meta->>'approval_status' = 'intake_candidate'
  AND asset_meta->>'sha256' = 'c889522be3da733e2b19a6b62b20a268e9c989de90430b40896f6b85b6325c27';

-- bg_pp_advisory_desk_flatlay (#2)
UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta || '{"approved":true,"approval_status":"governed","production_use_allowed":true,"approved_by":"PK","pk_decision":"promote (promotion review v2 #2, PK-ratified 2026-07-06) — LIVE PRODUCTION CHANGE acknowledged: joins the Option-D resolver pool (fb/li/ig); pool 6/6/6/5 → fb8/li8/ig7; usage constraints in visual_review_note/label_constraint remain binding","promotion_lane":"pp-bg-promo-v2 (2026-07-06)","promotion_packet":"_harness/image_harvester_v0/promo_review2/PROMOTION_V2_GATE_PACKET.md"}'::jsonb
      || jsonb_build_object('approved_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US+00:00')),
    notes = 'GOVERNED (promoted from intake_candidate 2026-07-06, PK promotion review v2 #2 — LIVE production-rotation change acknowledged: joins Option-D pool fb/li/ig). Person-free advisory desk; usage constraint stands: generic, never location-specific.',
    updated_at = now()
WHERE asset_id = 'b3a20009-9c4e-4f7a-8d21-0d5e6f7a8b09' AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_advisory_desk_flatlay'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
  AND asset_meta->>'approval_status' = 'intake_candidate'
  AND asset_meta->>'sha256' = '97e00405eb8c260c2376b3efd05ba6cebeb0ba4a8dfc2ddb7c646f3a3d0cf98a';

DO $$
DECLARE promoted int; pool int; fb int; li int; ig int; gov int;
BEGIN
  SELECT count(*) INTO promoted FROM c.client_brand_asset
  WHERE asset_id IN ('b3a20003-9c4e-4f7a-8d21-0d5e6f7a8b03','b3a20009-9c4e-4f7a-8d21-0d5e6f7a8b09')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE
    AND asset_meta->>'approval_status' = 'governed' AND (asset_meta->>'production_use_allowed')::boolean IS TRUE
    AND asset_meta->>'promotion_lane' = 'pp-bg-promo-v2 (2026-07-06)' AND asset_meta ? 'approved_at' AND asset_meta->>'approved_by' = 'PK';
  IF promoted <> 2 THEN RAISE EXCEPTION 'promo-v2 verify failed: % promoted, expected 2 — rolled back', promoted; END IF;

  -- eligible pool must become exactly 8 (fb8/li8/ig7) — production-live under Option D
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
  IF pool<>8 OR fb<>8 OR li<>8 OR ig<>7 THEN
    RAISE EXCEPTION 'promo-v2 verify failed: pool (all=% fb=% li=% ig=%), expected 8/8/8/7 — rolled back', pool, fb, li, ig; END IF;

  SELECT count(*) INTO gov FROM c.client_brand_asset
  WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' IN
    ('bg_perth_cbd','bg_brisbane_cbd','bg_sydney_cbd','bg_pp_au_suburb_aerial_grid','bg_pp_home_keys_contract_table','bg_pp_perth_cbd_skyline_day_wide')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF gov <> 6 THEN RAISE EXCEPTION 'promo-v2 verify failed: prior governed set=%, expected 6 untouched — rolled back', gov; END IF;
END $$;

COMMIT;
