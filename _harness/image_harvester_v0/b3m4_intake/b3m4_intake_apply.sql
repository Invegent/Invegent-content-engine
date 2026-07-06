-- PP B3M4 INTAKE — 2 uploads + 2 INSERT-only double-fenced candidates (advisory desk + contract pen-on-blank).
-- T2 SAFETY_GATE. is_active=false + approved=false + production_use_allowed=false. NOT approval/promotion.
-- POOL-NEUTRAL (machine-asserted): fb 6 / li 6 / ig 5 UNCHANGED; is_active is resolve_slot_assets' FIRST reject.
BEGIN;

DO $$
BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='Property_Pulse/Backgrounds/bg_pp_advisory_desk_flatlay.jpg' AND (metadata->>'size')::bigint = 2948464;
  IF NOT FOUND THEN RAISE EXCEPTION 'b3m4-intake precheck failed: Property_Pulse/Backgrounds/bg_pp_advisory_desk_flatlay.jpg missing or wrong size — rolled back'; END IF;
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='Property_Pulse/Backgrounds/bg_pp_contract_signing_closeup.jpg' AND (metadata->>'size')::bigint = 277280;
  IF NOT FOUND THEN RAISE EXCEPTION 'b3m4-intake precheck failed: Property_Pulse/Backgrounds/bg_pp_contract_signing_closeup.jpg missing or wrong size — rolled back'; END IF;
END $$;

-- bg_pp_advisory_desk_flatlay
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b3a20009-9c4e-4f7a-8d21-0d5e6f7a8b09', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'Advisory desk flat-lay (person-free) background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_advisory_desk_flatlay.jpg',
       '{"mime":"image/jpeg","bytes":2948464,"width":6000,"height":4000,"sha256":"97e00405eb8c260c2376b3efd05ba6cebeb0ba4a8dfc2ddb7c646f3a3d0cf98a","sha256_source":"B3M4 harvest final hashed at intake build 2026-07-06; upload target Property_Pulse/Backgrounds/bg_pp_advisory_desk_flatlay.jpg size-prechecked in-SQL + post-upload public-URL sha256 verified","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_advisory_desk_flatlay.jpg","asset_key":"bg_pp_advisory_desk_flatlay","aspect_ratio":"3:2","visual_style":"photographic","license":"Pexels License","license_type":"pexels_license","license_url":"https://www.pexels.com/license/","attribution_required":false,"attribution_note":"Photo by Towfiqu barbhuiya on Pexels (courtesy credit; attribution not legally required)","photographer":"Towfiqu barbhuiya","source_site":"pexels","source_url":"https://www.pexels.com/photo/11391944/","original_download_url":"https://images.pexels.com/photos/11391944/pexels-photo-11391944.jpeg","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"pk_decision":"intake_only (B3M4 intake, PK-gated 2026-07-06); production approval/promotion requires a separate PK gate — Option D: resolver pool is production-live, so any future promotion changes production rotation","visual_review_verdict":"ACCEPT_VISUAL_ONLY","visual_review_note":"B3M4 best-pick; ACCEPT_VISUAL_ONLY 2026-07-06; person-free advisory desk; reviewer PASS zero scope flags","suggested_scrim_opacity":0.55,"safe_for_text_overlay":"needs_scrim","harvest_lane":"cc-0027 image-harvester B3M4 (2026-07-06)","intake_lane_batch":"pp-bg-b3m4-intake (2026-07-06)","review_packet":"_harness/image_harvester_v0/b3m4_intake/B3M4_INTAKE_GATE_PACKET.md","dominant_visual":"Person-free top-down advisory desk flat-lay on warm wood: tablet with blank grey screen, black reading glasses, gold ballpoint pen, small succulent; no branding, no readable text, no faces.","label_constraint":"person-free advisory/desk flat-lay; generic, never location-specific; REFRAME of the workbook agent-tablet slot (no identifiable person, no model release) — key proposed bg_pp_advisory_desk_flatlay (PK may instead key bg_pp_real_estate_agent_tablet to fill that workbook row)"}'::jsonb, ARRAY['facebook','instagram','linkedin'], false, 'Intake candidate (B3M4, ACCEPT_VISUAL_ONLY 2026-07-06). person-free advisory/desk flat-lay; generic, never location-specific; REFRAME of the workbook agent-tablet slot (no identifiable person, no model release) — key proposed bg_pp_advisory_desk_flatlay (PK may instead key bg_pp_real_estate_agent_tablet to fill that workbook row) Promotion = separate PK gate (Option D production-live).'
WHERE NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key'='bg_pp_advisory_desk_flatlay');

-- bg_pp_contract_signing_closeup
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b3a20010-9c4e-4f7a-8d21-0d5e6f7a8b10', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'Contract signing — pen on blank sheet background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_contract_signing_closeup.jpg',
       '{"mime":"image/jpeg","bytes":277280,"width":3888,"height":2592,"sha256":"ff4d3682f7a758cf5bba58c53b8dc16d4223a5a1f43c241b65012c9133283b82","sha256_source":"B3M4 harvest final hashed at intake build 2026-07-06; upload target Property_Pulse/Backgrounds/bg_pp_contract_signing_closeup.jpg size-prechecked in-SQL + post-upload public-URL sha256 verified","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_contract_signing_closeup.jpg","asset_key":"bg_pp_contract_signing_closeup","aspect_ratio":"3:2","visual_style":"photographic","license":"Pexels License","license_type":"pexels_license","license_url":"https://www.pexels.com/license/","attribution_required":false,"attribution_note":"Photo by Elisabeth Ende on Pexels (courtesy credit; attribution not legally required)","photographer":"Elisabeth Ende","source_site":"pexels","source_url":"https://www.pexels.com/photo/7431849/","original_download_url":"https://images.pexels.com/photos/7431849/pexels-photo-7431849.jpeg","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"pk_decision":"intake_only (B3M4 intake, PK-gated 2026-07-06); production approval/promotion requires a separate PK gate — Option D: resolver pool is production-live, so any future promotion changes production rotation","visual_review_verdict":"ACCEPT_VISUAL_ONLY","visual_review_note":"B3M4 best-pick; ACCEPT_VISUAL_ONLY 2026-07-06; blank contract PREFERRED; reviewer PASS zero scope flags","suggested_scrim_opacity":0.6,"safe_for_text_overlay":"needs_scrim","harvest_lane":"cc-0027 image-harvester B3M4 (2026-07-06)","intake_lane_batch":"pp-bg-b3m4-intake (2026-07-06)","review_packet":"_harness/image_harvester_v0/b3m4_intake/B3M4_INTAKE_GATE_PACKET.md","dominant_visual":"Close-up of a black fountain pen resting on the edge of a completely BLANK sheet of paper on plain white; no text, signature, keys, hands, or faces.","label_constraint":"pen on blank paper; NO legible document content (blank preferred per PK 2026-07-06); generic contract/settlement theme; near-white field — confirm scrim holds headline contrast"}'::jsonb, ARRAY['facebook','instagram','linkedin'], false, 'Intake candidate (B3M4, ACCEPT_VISUAL_ONLY 2026-07-06). pen on blank paper; NO legible document content (blank preferred per PK 2026-07-06); generic contract/settlement theme; near-white field — confirm scrim holds headline contrast Promotion = separate PK gate (Option D production-live).'
WHERE NOT EXISTS (SELECT 1 FROM c.client_brand_asset WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key'='bg_pp_contract_signing_closeup');

DO $$
DECLARE n int; pool int; fb int; li int; ig int; gov int; truerows int;
BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'intake_lane_batch'='pp-bg-b3m4-intake (2026-07-06)'
    AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status'='intake_candidate' AND (asset_meta->>'production_use_allowed')::boolean IS FALSE
    AND asset_meta->>'visual_review_verdict'='ACCEPT_VISUAL_ONLY';
  IF n <> 2 THEN RAISE EXCEPTION 'b3m4-intake verify failed: % fenced rows, expected 2 — rolled back', n; END IF;

  SELECT count(*) INTO truerows FROM c.client_brand_asset
  WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'intake_lane_batch'='pp-bg-b3m4-intake (2026-07-06)'
    AND (is_active IS TRUE OR (asset_meta->>'approved')::boolean IS TRUE OR (asset_meta->>'production_use_allowed')::boolean IS TRUE);
  IF truerows <> 0 THEN RAISE EXCEPTION 'b3m4-intake verify failed: % new rows carry a true flag — rolled back', truerows; END IF;

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
  IF pool<>6 OR fb<>6 OR li<>6 OR ig<>5 THEN
    RAISE EXCEPTION 'b3m4-intake verify failed: pool neutrality broken (all=% fb=% li=% ig=%, expected 6/6/6/5) — rolled back', pool, fb, li, ig; END IF;

  SELECT count(*) INTO gov FROM c.client_brand_asset
  WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' IN
    ('bg_perth_cbd','bg_brisbane_cbd','bg_sydney_cbd','bg_pp_au_suburb_aerial_grid','bg_pp_home_keys_contract_table','bg_pp_perth_cbd_skyline_day_wide')
    AND is_active IS TRUE AND (asset_meta->>'approved')::boolean IS TRUE;
  IF gov <> 6 THEN RAISE EXCEPTION 'b3m4-intake verify failed: governed set=%, expected 6 — rolled back', gov; END IF;
END $$;

COMMIT;
