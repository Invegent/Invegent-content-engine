-- Day-hero intake: INSERT exactly 1 inactive intake-candidate row for bg_pp_perth_cbd_skyline_day_wide
-- (cc-0027 run-2 best-pick gl7nkS_h4lo, PK-accepted 2026-07-05). NOT approval, NOT promotion.
-- The reserved day-wide key is now filled by a genuine bright-day image per its reservation purpose.
-- Fail-closed: storage precheck (size), NOT-EXISTS dedup, end-state assertions incl.
-- PRODUCTION-CRITICAL pool check: eligible background pool must remain EXACTLY 5 (Option D live).
BEGIN;

DO $$
BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets'
    AND name='Property_Pulse/Backgrounds/bg_pp_perth_cbd_skyline_day_wide.jpg' AND (metadata->>'size')::bigint = 2386153;
  IF NOT FOUND THEN RAISE EXCEPTION 'dayhero precheck failed: storage object missing or wrong size — rolled back'; END IF;
END $$;

INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b2a10008-9c4e-4f7a-8d21-0d5e6f7a8b08', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'Perth CBD bright-day skyline hero background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_perth_cbd_skyline_day_wide.jpg',
       '{"mime":"image/jpeg","bytes":2386153,"width":4000,"height":2250,"sha256":"620c77b43edc557a7f1790b15c27c4f2c993fd1588afb1322ee001c2073743cb","sha256_source":"cc-0027 run2_stress harvest file hashed at packet build 2026-07-05; upload target Property_Pulse/Backgrounds/bg_pp_perth_cbd_skyline_day_wide.jpg must byte-match (in-SQL size precheck + mandatory post-upload public-URL sha256 check)","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_perth_cbd_skyline_day_wide.jpg","asset_key":"bg_pp_perth_cbd_skyline_day_wide","location":"Perth","aspect_ratio":"16:9","has_people":false,"has_text":false,"visual_style":"photographic","license":"Unsplash License (free for commercial use, no attribution required)","license_type":"unsplash_license","license_url":"https://unsplash.com/license","attribution_required":false,"attribution_note":"Not required (optional credit: Photo by Joshua Leong on Unsplash)","photographer":"Joshua Leong (@jleonnn)","source_site":"unsplash","source_url":"https://unsplash.com/photos/gl7nkS_h4lo","original_download_url":"https://unsplash.com/photos/gl7nkS_h4lo/download?force=true","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"pk_decision":"intake_only (day-hero intake lane, PK best-pick acceptance 2026-07-05); production approval/promotion requires a separate PK gate — WARNING: since Option D (v4.95) the resolver pool drives LIVE PP image_quote production, so promotion of this asset changes production rotation","visual_review_verdict":"PASS_WITH_NOTE","visual_review_note":"cc-0027 run-2 stress proof: harvester best-pick, image-reviewer concurred PASS_WITH_NOTE (skyline construction cranes + small rooftop corporate logos [RioTinto + one LED sign] legible at full res = accepted trade-off, no agency branding, no faces); PK ACCEPTED as day-hero best-pick 2026-07-05 — closes the bright-day Perth skyline sourcing carry at the sourcing level.","suggested_scrim_opacity":0.48,"safe_for_text_overlay":"needs_scrim","harvest_lane":"cc-0027 image-harvester run2_stress (2026-07-05)","intake_lane_dayhero":"pp-bg-dayhero-intake (2026-07-05)","review_packet":"_harness/image_harvester_v0/run2_stress/dayhero_intake/DAYHERO_GATE_PACKET.md"}'::jsonb,
       ARRAY['facebook','linkedin'], false,
       'Intake candidate (cc-0027 run-2 best-pick, PK-accepted day-hero — closes the bright-day Perth skyline sourcing carry). PROMOTION WARNING: resolver pool is production-live (Option D) — promoting this asset changes PP image_quote rotation in production; promotion is its own PK gate.'
WHERE NOT EXISTS (
  SELECT 1 FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_perth_cbd_skyline_day_wide'
);

DO $$
DECLARE n int; pool int; governed int;
BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE asset_id = 'b2a10008-9c4e-4f7a-8d21-0d5e6f7a8b08'
    AND is_active IS FALSE
    AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status' = 'intake_candidate'
    AND (asset_meta->>'production_use_allowed')::boolean IS FALSE
    AND asset_meta->>'intake_lane_dayhero' = 'pp-bg-dayhero-intake (2026-07-05)'
    AND asset_meta->>'sha256' = '620c77b43edc557a7f1790b15c27c4f2c993fd1588afb1322ee001c2073743cb';
  IF n <> 1 THEN
    RAISE EXCEPTION 'dayhero verification failed: % rows in expected candidate state, expected 1 — rolled back', n;
  END IF;

  -- PRODUCTION-CRITICAL (Option D live): the eligible background pool must be unchanged at exactly 5
  SELECT count(*) INTO pool FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'usage' = 'background'
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE
    AND (asset_meta->>'license_type' IS NOT NULL OR asset_meta->>'license' IS NOT NULL)
    AND COALESCE(asset_meta->>'bucket','') = 'brand-assets'
    AND asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim');
  IF pool <> 5 THEN
    RAISE EXCEPTION 'dayhero verification failed: eligible background pool = %, expected UNCHANGED 5 (Option D production-live) — rolled back', pool;
  END IF;

  SELECT count(*) INTO governed FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
    AND asset_meta->>'asset_key' IN ('bg_perth_cbd','bg_brisbane_cbd','bg_sydney_cbd','bg_pp_au_suburb_aerial_grid','bg_pp_home_keys_contract_table')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF governed <> 5 THEN
    RAISE EXCEPTION 'dayhero verification failed: governed background set = %, expected 5 untouched — rolled back', governed;
  END IF;
END $$;

COMMIT;
