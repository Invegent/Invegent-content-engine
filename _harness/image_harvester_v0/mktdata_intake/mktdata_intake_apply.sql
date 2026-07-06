-- PP MARKET-DATA re-source INTAKE — 1 upload + 1 INSERT-only double-fenced candidate.
-- T2 SAFETY_GATE. is_active=false + approved=false + production_use_allowed=false. NOT approval/promotion.
-- POOL-NEUTRAL (machine-asserted): pool UNCHANGED at fb 8 / li 8 / ig 7; is_active is resolve_slot_assets' FIRST reject.
-- NOTE: only bg_pp_market_data_chart_grid is intaken here — the other 8 roster assets are ALREADY in the DB
-- (7 fenced candidates from the v5.12 batch + kitchen governed/active from the v5.16 promotion).
BEGIN;

DO $$
BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='Property_Pulse/Backgrounds/bg_pp_market_data_chart_grid.jpg' AND (metadata->>'size')::bigint = 1147375;
  IF NOT FOUND THEN RAISE EXCEPTION 'mktdata-intake precheck failed: Property_Pulse/Backgrounds/bg_pp_market_data_chart_grid.jpg missing or wrong size — rolled back'; END IF;
END $$;

INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b3a20011-9c4e-4f7a-8d21-0d5e6f7a8b11', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'Market data — line chart on grid background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_market_data_chart_grid.jpg',
       '{"mime":"image/jpeg","bytes":1147375,"width":2400,"height":3600,"sha256":"d3cb9b1c305d207bde49c3a114b51fa33b5693dd0fed9c5f73ec94addaf517b0","sha256_source":"market-data re-source final hashed at intake build 2026-07-06; upload target Property_Pulse/Backgrounds/bg_pp_market_data_chart_grid.jpg size-prechecked in-SQL + post-upload public-URL sha256 verified","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_market_data_chart_grid.jpg","asset_key":"bg_pp_market_data_chart_grid","aspect_ratio":"2:3","visual_style":"photographic","license":"Pexels License","license_type":"pexels_license","license_url":"https://www.pexels.com/license/","attribution_required":false,"attribution_note":"Photo by cottonbro studio on Pexels (courtesy credit; attribution not legally required)","photographer":"cottonbro studio","source_site":"pexels","source_url":"https://www.pexels.com/photo/chart-on-black-background-6203470/","original_download_url":"https://images.pexels.com/photos/6203470/pexels-photo-6203470.jpeg","source_pexels_id":"6203470","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"pk_decision":"intake_only (market-data re-source intake, PK-gated 2026-07-06); production approval/promotion requires a separate PK gate — Option D: resolver pool is production-live, so any future promotion changes production rotation","visual_review_verdict":"ACCEPT_VISUAL_ONLY","visual_review_note":"market-data RE-SOURCE best-pick (replaces the HELD Morris-Charts pick). PK ACCEPT_VISUAL_ONLY 2026-07-06. Reads clearly as market/data (neon line-chart on dark grid).","text_safety":"zero legible text — no ticker, claim, date, legend, brand, or agency text anywhere in the full frame","crop_proof":"PASSED — orchestrator re-ran the exact 1:1 centre-crop at 1080 under scrim 0.56 (the proof the prior Morris-Charts pick failed); zero legible text survives. Artifacts: _harness/image_harvester_v0/run7_mktdata_resource/orch_cropproof/","scrim_proof_spec":"1:1, 1080px, scrim 0.56","ai_exclusion":"AI-diffusion exclusion CLEARED — real photo-of-screen (display moire, RGB sub-pixel bloom, natural exposure, coherent grid); reviewer + orchestrator concur, not AI-generated","suggested_scrim_opacity":0.56,"safe_for_text_overlay":"needs_scrim","harvest_lane":"cc-0027 image-harvester market-data re-source run7 (2026-07-06)","intake_lane_batch":"pp-bg-mktdata-intake (2026-07-06)","review_packet":"_harness/image_harvester_v0/mktdata_intake/MKTDATA_INTAKE_GATE_PACKET.md","dominant_visual":"Neon-blue jagged line chart over a plain grid on a dark screen; pure graphical shapes, no labels or numbers.","label_constraint":"abstract market/data line-chart-on-grid; generic, geography-neutral; text-clean (crop-proof passed)"}'::jsonb, ARRAY['facebook','instagram','linkedin'], false, 'Intake candidate (market-data re-source, ACCEPT_VISUAL_ONLY 2026-07-06). Replaces the HELD Morris-Charts pick; zero legible text, crop-proof passed at 1:1 1080 scrim 0.56; AI-diffusion cleared (real photo-of-screen). Promotion = separate PK gate (Option D production-live).'
WHERE NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key'='bg_pp_market_data_chart_grid');

DO $$
DECLARE n int; pool int; fb int; li int; ig int;
BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE asset_id='b3a20011-9c4e-4f7a-8d21-0d5e6f7a8b11' AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND (asset_meta->>'production_use_allowed')::boolean IS FALSE
    AND asset_meta->>'intake_lane_batch'='pp-bg-mktdata-intake (2026-07-06)' AND asset_meta->>'visual_review_verdict'='ACCEPT_VISUAL_ONLY'
    AND asset_meta->>'sha256'='d3cb9b1c305d207bde49c3a114b51fa33b5693dd0fed9c5f73ec94addaf517b0';
  IF n <> 1 THEN RAISE EXCEPTION 'mktdata-intake verify failed: % fenced rows, expected 1 — rolled back', n; END IF;

  -- pool UNCHANGED at 8/8/7 (production-live under Option D)
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
    RAISE EXCEPTION 'mktdata-intake verify failed: pool changed (all=% fb=% li=% ig=%, expected UNCHANGED 8/8/8/7) — rolled back', pool, fb, li, ig; END IF;
END $$;

COMMIT;
