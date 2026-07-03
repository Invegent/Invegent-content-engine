-- Batch 2: PP P0 background DB-intake (INSERT-only, governed inventory CANDIDATES)
-- 7 new c.client_brand_asset rows: is_active=false, asset_meta.approved=false, approval_status=intake_candidate.
-- NOT production approval. No UPDATE/DELETE. Existing 4 PP rows untouched.
-- Precondition (asserted below, fail-closed): the 7 files are already uploaded to
-- brand-assets/Property_Pulse/Backgrounds/ with exact expected byte sizes.
BEGIN;

-- upload prechecks (same-DB storage catalog; abort before any insert if uploads missing/wrong)
DO $$
BEGIN
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='Property_Pulse/Backgrounds/bg_pp_perth_skyline_dawn_moody.jpg' AND (metadata->>'size')::bigint = 3205720;
  IF NOT FOUND THEN RAISE EXCEPTION 'batch2 upload precheck failed: Property_Pulse/Backgrounds/bg_pp_perth_skyline_dawn_moody.jpg missing or wrong size — transaction rolled back'; END IF;
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='Property_Pulse/Backgrounds/bg_pp_au_suburb_aerial_grid.jpg' AND (metadata->>'size')::bigint = 2665506;
  IF NOT FOUND THEN RAISE EXCEPTION 'batch2 upload precheck failed: Property_Pulse/Backgrounds/bg_pp_au_suburb_aerial_grid.jpg missing or wrong size — transaction rolled back'; END IF;
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='Property_Pulse/Backgrounds/bg_pp_modern_home_exterior_front.jpg' AND (metadata->>'size')::bigint = 4908899;
  IF NOT FOUND THEN RAISE EXCEPTION 'batch2 upload precheck failed: Property_Pulse/Backgrounds/bg_pp_modern_home_exterior_front.jpg missing or wrong size — transaction rolled back'; END IF;
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='Property_Pulse/Backgrounds/bg_pp_for_sale_sign_street.jpg' AND (metadata->>'size')::bigint = 5461528;
  IF NOT FOUND THEN RAISE EXCEPTION 'batch2 upload precheck failed: Property_Pulse/Backgrounds/bg_pp_for_sale_sign_street.jpg missing or wrong size — transaction rolled back'; END IF;
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='Property_Pulse/Backgrounds/bg_pp_sold_sign_closeup.jpg' AND (metadata->>'size')::bigint = 4862585;
  IF NOT FOUND THEN RAISE EXCEPTION 'batch2 upload precheck failed: Property_Pulse/Backgrounds/bg_pp_sold_sign_closeup.jpg missing or wrong size — transaction rolled back'; END IF;
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='Property_Pulse/Backgrounds/bg_pp_home_keys_contract_table.jpg' AND (metadata->>'size')::bigint = 1129174;
  IF NOT FOUND THEN RAISE EXCEPTION 'batch2 upload precheck failed: Property_Pulse/Backgrounds/bg_pp_home_keys_contract_table.jpg missing or wrong size — transaction rolled back'; END IF;
  PERFORM 1 FROM storage.objects WHERE bucket_id='brand-assets' AND name='Property_Pulse/Backgrounds/bg_pp_open_home_entry.jpg' AND (metadata->>'size')::bigint = 2596565;
  IF NOT FOUND THEN RAISE EXCEPTION 'batch2 upload precheck failed: Property_Pulse/Backgrounds/bg_pp_open_home_entry.jpg missing or wrong size — transaction rolled back'; END IF;
END $$;

-- bg_pp_perth_skyline_dawn_moody
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b2a10001-9c4e-4f7a-8d21-0d5e6f7a8b01', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'Perth skyline dawn (moody) background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_perth_skyline_dawn_moody.jpg',
       '{"mime":"image/jpeg","bytes":3205720,"width":4480,"height":2471,"sha256":"8279d87d9464c2bb86cfaa6f198b2ae96a516ec56c14e7fae9f5e0166c0ce8d3","sha256_source":"harvest package file hashed at packet build 2026-07-03; upload target Property_Pulse/Backgrounds/bg_pp_perth_skyline_dawn_moody.jpg must byte-match (verified in apply assertions + post-upload hash check)","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_perth_skyline_dawn_moody.jpg","asset_key":"bg_pp_perth_skyline_dawn_moody","location":"Perth","aspect_ratio":"16:9","has_people":false,"has_text":false,"visual_style":"photographic","license":"Unsplash License (free for commercial use, no attribution required)","license_type":"unsplash_license","license_url":"https://unsplash.com/license","attribution_required":false,"attribution_note":"Not required (optional credit: Photo by fadder 8 on Unsplash)","photographer":"fadder 8","source_site":"unsplash","source_url":"https://unsplash.com/photos/RESEQty1uvc","original_download_url":"https://unsplash.com/photos/RESEQty1uvc/download?force=true","approved":false,"approval_status":"intake_candidate","pk_decision":"intake_only (Batch 2 DB-intake, 2026-07-03); production approval requires a separate PK gate","production_use_allowed":false,"visual_review_verdict":"PASS_WITH_NOTE","visual_review_note":"PK visual review 2026-07-03: usable as moody Perth market-update background, NOT the final bright-day hero skyline. Manual-sourcing carry for a stronger bright daytime Perth skyline stays open.","suggested_scrim_opacity":0.55,"safe_for_text_overlay":"needs_scrim","harvest_lane":"pp-background-intake-p0 (2026-07-03)","intake_lane_b2":"pp-bg-p0-db-intake-batch2 (2026-07-03)","review_packet":"_harness/pp_background_coverage_recon/batch2/BATCH2_GATE_PACKET.md"}'::jsonb,
       ARRAY['facebook','linkedin'], false,
       'Intake candidate. PK visual review: moody Perth market-update background ONLY — not the bright-day hero skyline (day-hero remains a manual-sourcing carry). Key renamed from workbook bg_pp_perth_cbd_skyline_day_wide to reflect actual content.'
WHERE NOT EXISTS (
  SELECT 1 FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_perth_skyline_dawn_moody'
);
-- bg_pp_au_suburb_aerial_grid
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b2a10002-9c4e-4f7a-8d21-0d5e6f7a8b02', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'Generic Australian suburb aerial grid background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_au_suburb_aerial_grid.jpg',
       '{"mime":"image/jpeg","bytes":2665506,"width":4000,"height":2250,"sha256":"68c8bd645b61c220b897f9f109640c8fd1fcd6c8ea34909fd7444d8bd4b8c5ce","sha256_source":"harvest package file hashed at packet build 2026-07-03; upload target Property_Pulse/Backgrounds/bg_pp_au_suburb_aerial_grid.jpg must byte-match (verified in apply assertions + post-upload hash check)","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_au_suburb_aerial_grid.jpg","asset_key":"bg_pp_au_suburb_aerial_grid","location":"Australia (generic; photographed over Melbourne — never label as Perth)","aspect_ratio":"16:9","has_people":false,"has_text":false,"visual_style":"photographic","license":"Unsplash License (free for commercial use, no attribution required)","license_type":"unsplash_license","license_url":"https://unsplash.com/license","attribution_required":false,"attribution_note":"Not required (optional credit: Photo by Tom Rumble on Unsplash)","photographer":"Tom Rumble","source_site":"unsplash","source_url":"https://unsplash.com/photos/7lvzopTxjOU","original_download_url":"https://unsplash.com/photos/7lvzopTxjOU/download?force=true","approved":false,"approval_status":"intake_candidate","pk_decision":"intake_only (Batch 2 DB-intake, 2026-07-03); production approval requires a separate PK gate","production_use_allowed":false,"visual_review_verdict":"PASS_GENERIC_ONLY","visual_review_note":"PK visual review 2026-07-03: pass as generic Australian suburb only. NEVER label as Perth.","suggested_scrim_opacity":0.64,"safe_for_text_overlay":"needs_scrim","harvest_lane":"pp-background-intake-p0 (2026-07-03)","intake_lane_b2":"pp-bg-p0-db-intake-batch2 (2026-07-03)","review_packet":"_harness/pp_background_coverage_recon/batch2/BATCH2_GATE_PACKET.md"}'::jsonb,
       ARRAY['facebook','instagram','linkedin'], false,
       'Intake candidate. PK visual review: generic Australian suburb ONLY; never label as Perth. Perth-specific aerial remains a manual-sourcing carry.'
WHERE NOT EXISTS (
  SELECT 1 FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_au_suburb_aerial_grid'
);
-- bg_pp_modern_home_exterior_front
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b2a10003-9c4e-4f7a-8d21-0d5e6f7a8b03', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'Modern Australian townhouse exteriors background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_modern_home_exterior_front.jpg',
       '{"mime":"image/jpeg","bytes":4908899,"width":3840,"height":5760,"sha256":"836d2cf62a0cac5704e956fb96d237287a77929dcc495c6229915fadfc3a28ec","sha256_source":"harvest package file hashed at packet build 2026-07-03; upload target Property_Pulse/Backgrounds/bg_pp_modern_home_exterior_front.jpg must byte-match (verified in apply assertions + post-upload hash check)","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_modern_home_exterior_front.jpg","asset_key":"bg_pp_modern_home_exterior_front","location":"Australia (Clyde North, VIC)","aspect_ratio":"2:3","has_people":false,"has_text":false,"visual_style":"photographic","license":"Unsplash License (free for commercial use, no attribution required)","license_type":"unsplash_license","license_url":"https://unsplash.com/license","attribution_required":false,"attribution_note":"Not required (optional credit: Photo by Troy Mortier on Unsplash)","photographer":"Troy Mortier","source_site":"unsplash","source_url":"https://unsplash.com/photos/sIsiRYz3VKk","original_download_url":"https://unsplash.com/photos/sIsiRYz3VKk/download?force=true","approved":false,"approval_status":"intake_candidate","pk_decision":"intake_only (Batch 2 DB-intake, 2026-07-03); production approval requires a separate PK gate","production_use_allowed":false,"visual_review_verdict":"PASS_WITH_NOTE","visual_review_note":"PK visual review 2026-07-03: useful for seller tips / modern housing / development content, NOT a detached-family-home hero.","suggested_scrim_opacity":0.58,"safe_for_text_overlay":"needs_scrim","harvest_lane":"pp-background-intake-p0 (2026-07-03)","intake_lane_b2":"pp-bg-p0-db-intake-batch2 (2026-07-03)","review_packet":"_harness/pp_background_coverage_recon/batch2/BATCH2_GATE_PACKET.md"}'::jsonb,
       ARRAY['facebook','instagram'], false,
       'Intake candidate. PK visual review: seller tips / modern housing / development content — not a detached-family-home hero.'
WHERE NOT EXISTS (
  SELECT 1 FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_modern_home_exterior_front'
);
-- bg_pp_for_sale_sign_street
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b2a10004-9c4e-4f7a-8d21-0d5e6f7a8b04', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'Unbranded FOR SALE sign background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_for_sale_sign_street.jpg',
       '{"mime":"image/jpeg","bytes":5461528,"width":6000,"height":4000,"sha256":"65e8d9c4ba5653aff4c273d38deabdc6e6963d42a76aee00cea7d7612aca55a7","sha256_source":"harvest package file hashed at packet build 2026-07-03; upload target Property_Pulse/Backgrounds/bg_pp_for_sale_sign_street.jpg must byte-match (verified in apply assertions + post-upload hash check)","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_for_sale_sign_street.jpg","asset_key":"bg_pp_for_sale_sign_street","location":"generic","aspect_ratio":"3:2","has_people":false,"has_text":true,"visual_style":"photographic","license":"Unsplash License (free for commercial use, no attribution required)","license_type":"unsplash_license","license_url":"https://unsplash.com/license","attribution_required":false,"attribution_note":"Not required (optional credit: Photo by Richard Bell on Unsplash)","photographer":"Richard Bell","source_site":"unsplash","source_url":"https://unsplash.com/photos/z1EIv3nsHJQ","original_download_url":"https://unsplash.com/photos/z1EIv3nsHJQ/download?force=true","approved":false,"approval_status":"intake_candidate","pk_decision":"intake_only (Batch 2 DB-intake, 2026-07-03); production approval requires a separate PK gate","production_use_allowed":false,"visual_review_verdict":"PARTIAL_FIT_ONLY","visual_review_note":"PK visual review 2026-07-03: utility/sign-subject background only; NOT for standard centre-text overlay unless the template offsets text (headline collides with sign text on centre crop).","suggested_scrim_opacity":0.62,"safe_for_text_overlay":"needs_scrim","harvest_lane":"pp-background-intake-p0 (2026-07-03)","intake_lane_b2":"pp-bg-p0-db-intake-batch2 (2026-07-03)","review_packet":"_harness/pp_background_coverage_recon/batch2/BATCH2_GATE_PACKET.md"}'::jsonb,
       ARRAY['facebook','instagram','linkedin'], false,
       'Intake candidate. PK visual review: PARTIAL FIT — utility/sign-subject background only; no standard centre-text overlay unless the template offsets text.'
WHERE NOT EXISTS (
  SELECT 1 FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_for_sale_sign_street'
);
-- bg_pp_sold_sign_closeup
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b2a10005-9c4e-4f7a-8d21-0d5e6f7a8b05', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'Unbranded SOLD sign on lawn background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_sold_sign_closeup.jpg',
       '{"mime":"image/jpeg","bytes":4862585,"width":4271,"height":6406,"sha256":"d566d622b28f8ecc291d848436e6399ca326bf4f87a29557abee7ee09d0c31a0","sha256_source":"harvest package file hashed at packet build 2026-07-03; upload target Property_Pulse/Backgrounds/bg_pp_sold_sign_closeup.jpg must byte-match (verified in apply assertions + post-upload hash check)","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_sold_sign_closeup.jpg","asset_key":"bg_pp_sold_sign_closeup","location":"generic","aspect_ratio":"2:3","has_people":false,"has_text":true,"visual_style":"photographic","license":"Pexels License (free for commercial use, no attribution required)","license_type":"pexels_license","license_url":"https://www.pexels.com/license/","attribution_required":false,"attribution_note":"Not required (optional credit: Photo by Thirdman on Pexels)","photographer":"Thirdman","source_site":"pexels","source_url":"https://www.pexels.com/photo/8470834/","original_download_url":"https://images.pexels.com/photos/8470834/pexels-photo-8470834.jpeg","approved":false,"approval_status":"intake_candidate","pk_decision":"intake_only (Batch 2 DB-intake, 2026-07-03); production approval requires a separate PK gate","production_use_allowed":false,"visual_review_verdict":"PASS","visual_review_note":"PK visual review 2026-07-03: pass.","suggested_scrim_opacity":0.6,"safe_for_text_overlay":"needs_scrim","harvest_lane":"pp-background-intake-p0 (2026-07-03)","intake_lane_b2":"pp-bg-p0-db-intake-batch2 (2026-07-03)","review_packet":"_harness/pp_background_coverage_recon/batch2/BATCH2_GATE_PACKET.md"}'::jsonb,
       ARRAY['facebook','instagram','linkedin'], false,
       'Intake candidate. PK visual review: PASS.'
WHERE NOT EXISTS (
  SELECT 1 FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_sold_sign_closeup'
);
-- bg_pp_home_keys_contract_table
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b2a10006-9c4e-4f7a-8d21-0d5e6f7a8b06', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'House keys and miniature house on desk background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_home_keys_contract_table.jpg',
       '{"mime":"image/jpeg","bytes":1129174,"width":4592,"height":3448,"sha256":"b900cb592db498c67f4dbdba58004eb97717c5a887b2e237146e45a9d06293a2","sha256_source":"harvest package file hashed at packet build 2026-07-03; upload target Property_Pulse/Backgrounds/bg_pp_home_keys_contract_table.jpg must byte-match (verified in apply assertions + post-upload hash check)","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_home_keys_contract_table.jpg","asset_key":"bg_pp_home_keys_contract_table","location":"generic (indoor)","aspect_ratio":"4:3","has_people":false,"has_text":false,"visual_style":"photographic","license":"Unsplash License (free for commercial use, no attribution required)","license_type":"unsplash_license","license_url":"https://unsplash.com/license","attribution_required":false,"attribution_note":"Not required (optional credit: Photo by Tierra Mallorca on Unsplash)","photographer":"Tierra Mallorca","source_site":"unsplash","source_url":"https://unsplash.com/photos/rgJ1J8SDEAY","original_download_url":"https://unsplash.com/photos/rgJ1J8SDEAY/download?force=true","approved":false,"approval_status":"intake_candidate","pk_decision":"intake_only (Batch 2 DB-intake, 2026-07-03); production approval requires a separate PK gate","production_use_allowed":false,"visual_review_verdict":"PASS","visual_review_note":"PK visual review 2026-07-03: pass.","suggested_scrim_opacity":0.56,"safe_for_text_overlay":"needs_scrim","harvest_lane":"pp-background-intake-p0 (2026-07-03)","intake_lane_b2":"pp-bg-p0-db-intake-batch2 (2026-07-03)","review_packet":"_harness/pp_background_coverage_recon/batch2/BATCH2_GATE_PACKET.md"}'::jsonb,
       ARRAY['facebook','instagram','linkedin'], false,
       'Intake candidate. PK visual review: PASS. Widely-used non-exclusive stock image.'
WHERE NOT EXISTS (
  SELECT 1 FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_home_keys_contract_table'
);
-- bg_pp_open_home_entry
INSERT INTO c.client_brand_asset (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
SELECT 'b2a10007-9c4e-4f7a-8d21-0d5e6f7a8b07', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other', 'Bright home porch entry background',
       'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Backgrounds/bg_pp_open_home_entry.jpg',
       '{"mime":"image/jpeg","bytes":2596565,"width":4945,"height":3297,"sha256":"e929cca84c1d7376a2c9984636d0fe84c4d1387054de0670e9e03b28f2840aa2","sha256_source":"harvest package file hashed at packet build 2026-07-03; upload target Property_Pulse/Backgrounds/bg_pp_open_home_entry.jpg must byte-match (verified in apply assertions + post-upload hash check)","usage":"background","bucket":"brand-assets","source_path":"Property_Pulse/Backgrounds/bg_pp_open_home_entry.jpg","asset_key":"bg_pp_open_home_entry","location":"generic (US-style porch)","aspect_ratio":"3:2","has_people":false,"has_text":false,"visual_style":"photographic","license":"Unsplash License (free for commercial use, no attribution required)","license_type":"unsplash_license","license_url":"https://unsplash.com/license","attribution_required":false,"attribution_note":"Not required (optional credit: Photo by Francesca Tosolini on Unsplash)","photographer":"Francesca Tosolini","source_site":"unsplash","source_url":"https://unsplash.com/photos/XcVm8mn7NUM","original_download_url":"https://unsplash.com/photos/XcVm8mn7NUM/download?force=true","approved":false,"approval_status":"intake_candidate","pk_decision":"intake_only (Batch 2 DB-intake, 2026-07-03); production approval requires a separate PK gate","production_use_allowed":false,"visual_review_verdict":"PASS_WITH_NOTE","visual_review_note":"PK visual review 2026-07-03: good for open-home checklist/tips; mark as generic/open-home, NOT Perth-specific.","suggested_scrim_opacity":0.55,"safe_for_text_overlay":"needs_scrim","harvest_lane":"pp-background-intake-p0 (2026-07-03)","intake_lane_b2":"pp-bg-p0-db-intake-batch2 (2026-07-03)","review_packet":"_harness/pp_background_coverage_recon/batch2/BATCH2_GATE_PACKET.md"}'::jsonb,
       ARRAY['facebook','instagram'], false,
       'Intake candidate. PK visual review: open-home checklist/tips; generic/open-home scope, not Perth-specific.'
WHERE NOT EXISTS (
  SELECT 1 FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'asset_key' = 'bg_pp_open_home_entry'
);

DO $$
DECLARE n int; pre int; tot int;
BEGIN
  SELECT count(*) INTO n FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
    AND asset_meta->>'intake_lane_b2' = 'pp-bg-p0-db-intake-batch2 (2026-07-03)'
    AND is_active IS FALSE
    AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status' = 'intake_candidate'
    AND asset_id IN ('b2a10001-9c4e-4f7a-8d21-0d5e6f7a8b01',
                     'b2a10002-9c4e-4f7a-8d21-0d5e6f7a8b02',
                     'b2a10003-9c4e-4f7a-8d21-0d5e6f7a8b03',
                     'b2a10004-9c4e-4f7a-8d21-0d5e6f7a8b04',
                     'b2a10005-9c4e-4f7a-8d21-0d5e6f7a8b05',
                     'b2a10006-9c4e-4f7a-8d21-0d5e6f7a8b06',
                     'b2a10007-9c4e-4f7a-8d21-0d5e6f7a8b07');
  IF n <> 7 THEN
    RAISE EXCEPTION 'batch2 verification failed: % candidate rows in expected state, expected 7 — transaction rolled back', n;
  END IF;

  SELECT count(*) INTO pre FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
    AND (asset_meta->>'approved')::boolean IS TRUE AND is_active IS TRUE;
  IF pre <> 4 THEN
    RAISE EXCEPTION 'batch2 verification failed: pre-existing approved+active PP rows = %, expected 4 (must be untouched) — transaction rolled back', pre;
  END IF;

  SELECT count(*) INTO tot FROM c.client_brand_asset WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
  IF tot <> 11 THEN
    RAISE EXCEPTION 'batch2 verification failed: PP total rows = %, expected 11 — transaction rolled back', tot;
  END IF;
END $$;

COMMIT;
