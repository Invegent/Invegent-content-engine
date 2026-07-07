-- RUN8 BALCONY/COASTAL BATCH INTAKE — 2 uploads + 2 INSERT-only double-fenced candidates.
-- T2 SAFETY_GATE. All four fences set. NOT approval/promotion. First lane under Image Workflow Accel v1 (P1 batch / P4 one pointer).
-- P2 mechanical same-shape gate PASSED vs the proven market-data/v5.12 template (same table · asset_type 'other' · identical
--    column set · four fences false · same eligibility key set [usage/bucket/license/safe_for_text_overlay/sha256/asset_key] ·
--    bucket=brand-assets · no DDL · no GRANT/REVOKE · no ON CONFLICT) → full review chain rides the proven shape; per-apply guards NOT waived.
-- POOL-NEUTRAL (machine-asserted): eligible pool UNCHANGED at fb 9 / li 9 / ig 8; is_active=false ⇒ resolver rejects at first filter.
BEGIN;

DO $$
BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='Property_Pulse/Backgrounds/bg_pp_city_skyline_vantage.jpg' AND (metadata->>'size')::bigint = 1254714;
  IF NOT FOUND THEN RAISE EXCEPTION 'run8-intake precheck failed: Property_Pulse/Backgrounds/bg_pp_city_skyline_vantage.jpg missing or wrong size — rolled back'; END IF;
END $$;

INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b3a20012-9c4e-4f7a-8d21-0d5e6f7a8b12', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'City skyline vantage (generic) background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_city_skyline_vantage.jpg',
       '{"mime":"image/jpeg","bytes":1254714,"width":4000,"height":2667,"sha256":"2ef9d39b15ba0e683e7e3bd3b3114a91e3b6df6b38aa0e3529155e58fb45c66d","sha256_source":"run8 harvest final hashed at intake build 2026-07-06; upload target Property_Pulse/Backgrounds/bg_pp_city_skyline_vantage.jpg size-prechecked in-SQL + post-upload public-URL sha256 verified","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_city_skyline_vantage.jpg","asset_key":"bg_pp_city_skyline_vantage","aspect_ratio":"3:2","visual_style":"photographic","license":"Pexels License","license_type":"pexels_license","license_url":"https://www.pexels.com/license/","attribution_required":false,"attribution_note":"Photo by Kaique Rocha on Pexels (courtesy credit; attribution not legally required)","photographer":"Kaique Rocha","source_site":"pexels","source_url":"https://www.pexels.com/photo/aerial-photography-of-city-skyline-97906/","original_download_url":"https://images.pexels.com/photos/97906/pexels-photo-97906.jpeg","source_pexels_id":"97906","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"pk_decision":"intake_only (run8 balcony/coastal batch, PK-gated 2026-07-06); production approval/promotion requires a separate PK gate — Option D: resolver pool is production-live","visual_review_verdict":"ACCEPT_VISUAL_ONLY","visual_review_note":"run8 Row A best-pick; PK ACCEPT (generic) 2026-07-06. Elevated dense city skyline under large clean sky; strong upper negative space.","text_safety":"no legible third-party signage/brand/watermark/rego/boat-name in the 1:1 centre-crop band (image-reviewer + orchestrator concur)","crop_proof":"PASSED — orchestrator 1:1 centre-crop at 1080 under scrim 0.56, headline crisp over clean negative space, zero legible text survives. Artifacts: _harness/image_harvester_v0/run8_balcony_coastal/orch_cropproof/","scrim_proof_spec":"1:1, 1080px, scrim 0.56","ai_exclusion":"n/a — real photograph (Pexels), not AI-generated; reviewer + orchestrator concur","suggested_scrim_opacity":0.56,"safe_for_text_overlay":"needs_scrim","harvest_lane":"cc-0027 image-harvester run8 balcony/coastal (2026-07-06)","intake_lane_batch":"pp-bg-balcony-coastal-intake (2026-07-06)","review_packet":"_harness/image_harvester_v0/run8_balcony_coastal/intake/BALCONY_COASTAL_INTAKE_GATE_PACKET.md","dominant_visual":"Elevated dense city skyline (Sao Paulo, Brazil) under a large clean blue sky with scattered cloud; strong upper-third negative space; person-free.","label_constraint":"GENERIC non-Australian skyline (Sao Paulo) — usable generic-only; NEVER label AU/Perth/WA/any Australian capital; the pool already carries real Perth/Brisbane/Sydney CBD skylines.","geography":"generic_non_au"}'::jsonb, ARRAY['facebook','instagram','linkedin'], false,
       'Intake candidate (run8 balcony/coastal, ACCEPT_VISUAL_ONLY 2026-07-06). GENERIC non-Australian skyline (Sao Paulo) — usable generic-only; NEVER label AU/Perth/WA/any Australian capital; the pool already carries real Perth/Brisbane/Sydney CBD skylines. Promotion = separate PK gate (Option D production-live).'
WHERE NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key'='bg_pp_city_skyline_vantage');

DO $$
BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='Property_Pulse/Backgrounds/bg_pp_coastal_waterfront.jpg' AND (metadata->>'size')::bigint = 1613937;
  IF NOT FOUND THEN RAISE EXCEPTION 'run8-intake precheck failed: Property_Pulse/Backgrounds/bg_pp_coastal_waterfront.jpg missing or wrong size — rolled back'; END IF;
END $$;

INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b3a20013-9c4e-4f7a-8d21-0d5e6f7a8b13', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'Coastal waterfront (AU) background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_coastal_waterfront.jpg',
       '{"mime":"image/jpeg","bytes":1613937,"width":4000,"height":2666,"sha256":"b164c47a28edd1f5e24ab09fed932ba4d18cd3a53f595c009cd1debcea346966","sha256_source":"run8 harvest final hashed at intake build 2026-07-06; upload target Property_Pulse/Backgrounds/bg_pp_coastal_waterfront.jpg size-prechecked in-SQL + post-upload public-URL sha256 verified","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_coastal_waterfront.jpg","asset_key":"bg_pp_coastal_waterfront","aspect_ratio":"3:2","visual_style":"photographic","license":"Pexels License","license_type":"pexels_license","license_url":"https://www.pexels.com/license/","attribution_required":false,"attribution_note":"Photo by Paul Pulimoottil on Pexels (courtesy credit; attribution not legally required)","photographer":"Paul Pulimoottil","source_site":"pexels","source_url":"https://www.pexels.com/photo/stunning-aerial-view-of-whitehaven-beach-australia-33698814/","original_download_url":"https://images.pexels.com/photos/33698814/pexels-photo-33698814.jpeg","source_pexels_id":"33698814","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"pk_decision":"intake_only (run8 balcony/coastal batch, PK-gated 2026-07-06); production approval/promotion requires a separate PK gate — Option D: resolver pool is production-live","visual_review_verdict":"ACCEPT_VISUAL_ONLY","visual_review_note":"run8 Row B best-pick; PK ACCEPT 2026-07-06. Verifiable AU coastal (Whitehaven Beach / Hill Inlet, Whitsundays QLD); turquoise water, clean upper sky/water negative space; two small unbranded moored vessels lower-centre (croppable/scrimmable).","text_safety":"no legible third-party signage/brand/watermark/rego/boat-name in the 1:1 centre-crop band (image-reviewer + orchestrator concur)","crop_proof":"PASSED — orchestrator 1:1 centre-crop at 1080 under scrim 0.56, headline crisp over clean negative space, zero legible text survives. Artifacts: _harness/image_harvester_v0/run8_balcony_coastal/orch_cropproof/","scrim_proof_spec":"1:1, 1080px, scrim 0.56","ai_exclusion":"n/a — real photograph (Pexels), not AI-generated; reviewer + orchestrator concur","suggested_scrim_opacity":0.56,"safe_for_text_overlay":"needs_scrim","harvest_lane":"cc-0027 image-harvester run8 balcony/coastal (2026-07-06)","intake_lane_batch":"pp-bg-balcony-coastal-intake (2026-07-06)","review_packet":"_harness/image_harvester_v0/run8_balcony_coastal/intake/BALCONY_COASTAL_INTAKE_GATE_PACKET.md","dominant_visual":"Aerial AU coastal: Whitehaven Beach / Hill Inlet, Whitsundays QLD — turquoise water, white silica sand, forested headland, clean sky negative space; two small unbranded moored vessels lower-centre; no people; no readable branding.","label_constraint":"Verifiable AU coastal (Whitehaven Beach, Whitsundays QLD) — label AU coastal ONLY; NEVER label Perth/WA (it is QLD, not WA); fills the pool''s coastal gap.","geography":"au_qld_not_wa"}'::jsonb, ARRAY['facebook','instagram','linkedin'], false,
       'Intake candidate (run8 balcony/coastal, ACCEPT_VISUAL_ONLY 2026-07-06). Verifiable AU coastal (Whitehaven Beach, Whitsundays QLD) — label AU coastal ONLY; NEVER label Perth/WA (it is QLD, not WA); fills the pool''s coastal gap. Promotion = separate PK gate (Option D production-live).'
WHERE NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key'='bg_pp_coastal_waterfront');

DO $$
DECLARE n int; pool int; fb int; li int; ig int;
BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE asset_id IN ('b3a20012-9c4e-4f7a-8d21-0d5e6f7a8b12','b3a20013-9c4e-4f7a-8d21-0d5e6f7a8b13') AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND (asset_meta->>'production_use_allowed')::boolean IS FALSE
    AND asset_meta->>'intake_lane_batch'='pp-bg-balcony-coastal-intake (2026-07-06)' AND asset_meta->>'visual_review_verdict'='ACCEPT_VISUAL_ONLY';
  IF n <> 2 THEN RAISE EXCEPTION 'run8-intake verify failed: % fenced rows, expected 2 — rolled back', n; END IF;

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
    RAISE EXCEPTION 'run8-intake verify failed: pool changed (all=% fb=% li=% ig=%, expected UNCHANGED 9/9/9/8) — rolled back', pool, fb, li, ig; END IF;
END $$;

COMMIT;
