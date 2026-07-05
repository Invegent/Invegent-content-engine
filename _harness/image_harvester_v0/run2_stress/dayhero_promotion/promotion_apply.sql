-- Day-hero PROMOTION: 1 row intake_candidate -> governed/active. *** LIVE PRODUCTION CHANGE ***
-- Option D: the resolver pool drives PP image_quote production. This apply changes the eligible
-- background pool for facebook/linkedin callers from 5 to 6 (instagram remains 5 via the live
-- platform fence — this asset's platform_scope is {facebook,linkedin}). Rotation composition for
-- affected platforms shifts from the moment of COMMIT. PK gate approval = acknowledgement of that.
BEGIN;

UPDATE c.client_brand_asset
SET is_active = true,
    asset_meta = asset_meta
      || '{"approved":true,"approval_status":"governed","production_use_allowed":true,"approved_by":"PK","pk_decision":"promote (day-hero promotion gate, PK-approved 2026-07-05) — LIVE PRODUCTION CHANGE acknowledged: joins the Option-D resolver pool (facebook/linkedin 5→6; instagram stays 5, platform fence); usage trade-offs in visual_review_note remain recorded","promotion_lane_dayhero":"pp-bg-dayhero-promotion (2026-07-05)","promotion_packet":"_harness/image_harvester_v0/run2_stress/dayhero_promotion/PROMOTION_GATE_PACKET.md"}'::jsonb
      || jsonb_build_object('approved_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US+00:00')),
    notes = 'GOVERNED (promoted from intake_candidate 2026-07-05, PK day-hero promotion gate — LIVE production-rotation change acknowledged: eligible pool 5→6 for facebook/linkedin; instagram pool unchanged at 5 via platform fence). cc-0027 run-2 best-pick; PASS_WITH_NOTE trade-offs (skyline cranes + small rooftop corporate logos) accepted.',
    updated_at = now()
WHERE asset_id = 'b2a10008-9c4e-4f7a-8d21-0d5e6f7a8b08'
  AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
  AND asset_meta->>'asset_key' = 'bg_pp_perth_cbd_skyline_day_wide'
  AND is_active IS FALSE
  AND (asset_meta->>'approved')::boolean IS FALSE
  AND asset_meta->>'approval_status' = 'intake_candidate'
  AND asset_meta->>'intake_lane_dayhero' = 'pp-bg-dayhero-intake (2026-07-05)'
  AND asset_meta->>'sha256' = '620c77b43edc557a7f1790b15c27c4f2c993fd1588afb1322ee001c2073743cb';

DO $$
DECLARE promoted int; pool int; governed7 int; still_candidates int;
BEGIN
  SELECT count(*) INTO promoted FROM c.client_brand_asset
  WHERE asset_id = 'b2a10008-9c4e-4f7a-8d21-0d5e6f7a8b08'
    AND is_active IS TRUE
    AND (asset_meta->>'approved')::boolean IS TRUE
    AND asset_meta->>'approval_status' = 'governed'
    AND (asset_meta->>'production_use_allowed')::boolean IS TRUE
    AND asset_meta->>'promotion_lane_dayhero' = 'pp-bg-dayhero-promotion (2026-07-05)'
    AND asset_meta ? 'approved_at' AND asset_meta->>'approved_by' = 'PK';
  IF promoted <> 1 THEN
    RAISE EXCEPTION 'dayhero promotion verification failed: % rows promoted, expected 1 — rolled back', promoted;
  END IF;

  -- pool becomes exactly 6 (production-live under Option D)
  SELECT count(*) INTO pool FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'usage' = 'background'
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE
    AND (asset_meta->>'license_type' IS NOT NULL OR asset_meta->>'license' IS NOT NULL)
    AND COALESCE(asset_meta->>'bucket','') = 'brand-assets'
    AND asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim');
  IF pool <> 6 THEN
    RAISE EXCEPTION 'dayhero promotion verification failed: eligible pool = %, expected exactly 6 — rolled back', pool;
  END IF;

  SELECT count(*) INTO governed7 FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
    AND asset_meta->>'asset_key' IN ('bg_perth_cbd','bg_brisbane_cbd','bg_sydney_cbd','bg_pp_au_suburb_aerial_grid','bg_pp_home_keys_contract_table')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF governed7 <> 5 THEN
    RAISE EXCEPTION 'dayhero promotion verification failed: prior governed set = %, expected 5 untouched — rolled back', governed7;
  END IF;

  SELECT count(*) INTO still_candidates FROM c.client_brand_asset
  WHERE asset_meta->>'intake_lane_b2' = 'pp-bg-p0-db-intake-batch2 (2026-07-03)'
    AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
  IF still_candidates <> 5 THEN
    RAISE EXCEPTION 'dayhero promotion verification failed: batch-2 candidates = %, expected 5 untouched — rolled back', still_candidates;
  END IF;
END $$;

COMMIT;
