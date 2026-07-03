-- ============================================================================
-- PP Logo Variant Intake v0 - governed intake DML (PK-gated; DO NOT APPLY without PK approval)
-- Lane: pp-logo-variant-intake-v0 (2026-07-03)
-- Packet: docs/briefs/pp-logo-variant-intake-v0-packet.md
-- Source: Claude Design project https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd
-- Posture: intake candidates ONLY - triple-fenced (is_active=false, approved=false,
--          production_use_allowed=false, approval_status=intake_candidate).
--          The live pp_logo_primary (b7530c55-c320-43be-90d9-98c804694921) is NOT touched.
-- Apply order: storage uploads (upload_manifest.json, upsert=false) FIRST, then this file.
-- 0 DDL / 18 data-only INSERTs / fail-closed assertions / in-transaction invariant probes.
-- ============================================================================

BEGIN;

-- ── A1: client identity (fail-closed) ──────────────────────────────────────
DO $$
BEGIN
  IF (SELECT count(*) FROM c.client
      WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND client_slug = 'property-pulse') <> 1 THEN
    RAISE EXCEPTION 'A1 FAIL: Property Pulse client row not found/mismatched';
  END IF;
END $$;

-- ── A2: no pre-existing rows for these asset_ids or asset_keys (fail-closed, idempotency guard)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM c.client_brand_asset
             WHERE asset_id IN ('c3a20001-9c4e-4f7a-8d21-0d5e6f7a8c01', 'c3a20002-9c4e-4f7a-8d21-0d5e6f7a8c02', 'c3a20003-9c4e-4f7a-8d21-0d5e6f7a8c03', 'c3a20004-9c4e-4f7a-8d21-0d5e6f7a8c04', 'c3a20005-9c4e-4f7a-8d21-0d5e6f7a8c05', 'c3a20006-9c4e-4f7a-8d21-0d5e6f7a8c06', 'c3a20007-9c4e-4f7a-8d21-0d5e6f7a8c07', 'c3a20008-9c4e-4f7a-8d21-0d5e6f7a8c08', 'c3a20009-9c4e-4f7a-8d21-0d5e6f7a8c09', 'c3a20010-9c4e-4f7a-8d21-0d5e6f7a8c10', 'c3a20011-9c4e-4f7a-8d21-0d5e6f7a8c11', 'c3a20012-9c4e-4f7a-8d21-0d5e6f7a8c12', 'c3a20013-9c4e-4f7a-8d21-0d5e6f7a8c13', 'c3a20014-9c4e-4f7a-8d21-0d5e6f7a8c14', 'c3a20015-9c4e-4f7a-8d21-0d5e6f7a8c15', 'c3a20016-9c4e-4f7a-8d21-0d5e6f7a8c16', 'c3a20017-9c4e-4f7a-8d21-0d5e6f7a8c17', 'c3a20018-9c4e-4f7a-8d21-0d5e6f7a8c18')) THEN
    RAISE EXCEPTION 'A2 FAIL: one or more intake asset_ids already exist';
  END IF;
  IF EXISTS (SELECT 1 FROM c.client_brand_asset
             WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
               AND asset_meta->>'asset_key' IN ('pp_logo_master_svg', 'pp_logo_master_editable_svg', 'pp_logo_full_colour_svg', 'pp_logo_white_svg', 'pp_logo_dark_svg', 'pp_logo_mark_only_svg', 'pp_logo_mark_only_dark_svg', 'pp_logo_master_png_512', 'pp_logo_master_png_1024', 'pp_logo_master_png_2048', 'pp_logo_full_colour_png_1024', 'pp_logo_white_png_1024', 'pp_logo_dark_png_1024', 'pp_logo_mark_only_png_512', 'pp_logo_mark_only_png_1024', 'pp_logo_square_navy_bg_png_512', 'pp_logo_square_navy_bg_png_1024', 'pp_logo_watermark_white_png')) THEN
    RAISE EXCEPTION 'A2 FAIL: one or more intake asset_keys already exist for property-pulse';
  END IF;
END $$;

-- ── A3: live primary logo intact BEFORE change (fail-closed) ────────────────
DO $$
BEGIN
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id = 'b7530c55-c320-43be-90d9-98c804694921'
        AND asset_meta->>'asset_key' = 'pp_logo_primary'
        AND (asset_meta->>'approved')::boolean IS TRUE
        AND is_active IS TRUE) <> 1 THEN
    RAISE EXCEPTION 'A3 FAIL: live pp_logo_primary not in expected pre-state';
  END IF;
END $$;

-- ── A4: storage objects uploaded and byte-sizes match (fail-closed; run AFTER uploads)
DO $$
DECLARE
  missing int;
BEGIN
  SELECT count(*) INTO missing
  FROM (VALUES
        ('Property_Pulse/Logos/pp_logo_master.svg', 6951),
        ('Property_Pulse/Logos/pp_logo_master_editable.svg', 800),
        ('Property_Pulse/Logos/pp_logo_full_colour.svg', 6951),
        ('Property_Pulse/Logos/pp_logo_white.svg', 6951),
        ('Property_Pulse/Logos/pp_logo_dark.svg', 6951),
        ('Property_Pulse/Logos/pp_logo_mark_only.svg', 623),
        ('Property_Pulse/Logos/pp_logo_mark_only_dark.svg', 623),
        ('Property_Pulse/Logos/pp_logo_master_transparent_512.png', 25361),
        ('Property_Pulse/Logos/pp_logo_master_transparent_1024.png', 57316),
        ('Property_Pulse/Logos/pp_logo_master_transparent_2048.png', 136752),
        ('Property_Pulse/Logos/pp_logo_full_colour_1024.png', 61891),
        ('Property_Pulse/Logos/pp_logo_white_1024.png', 50690),
        ('Property_Pulse/Logos/pp_logo_dark_1024.png', 60522),
        ('Property_Pulse/Logos/pp_logo_mark_only_transparent_512.png', 21082),
        ('Property_Pulse/Logos/pp_logo_mark_only_transparent_1024.png', 71599),
        ('Property_Pulse/Logos/pp_logo_square_navy_bg_512.png', 30592),
        ('Property_Pulse/Logos/pp_logo_square_navy_bg_1024.png', 73754),
        ('Property_Pulse/Logos/pp_logo_watermark_white_transparent.png', 45489)
       ) AS expected(pth, sz)
  WHERE NOT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id = 'brand-assets'
      AND o.name = expected.pth
      AND (o.metadata->>'size')::bigint = expected.sz);
  IF missing <> 0 THEN
    RAISE EXCEPTION 'A4 FAIL: % storage object(s) missing or size-mismatched - run uploads first', missing;
  END IF;
END $$;

-- ── 18 data-only INSERTs (intake candidates, triple-fenced) ─────────────────

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20001-9c4e-4f7a-8d21-0d5e6f7a8c01', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo master (pp_logo_master.svg)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_master.svg',
   '{"asset_key":"pp_logo_master_svg","usage":"logo_vector_source","logo_role":"logo_master","colour_mode":"white_gold","background_type":"dark","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_master.svg","mime":"image/svg+xml","bytes":6951,"sha256":"71923fd4642a062c1edb1e185808db192f1957aa7d2663091a8daabebd9ef053","file_format":"svg","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_master.svg","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"scalable":true,"has_transparency":true,"visual_verification":"true vector (paths only, no embedded raster); fills match brand palette exactly; verified pp-logo-variant-intake-v0 (2026-07-03)","vector_note":"text converted to outlines; renders without fonts","viewBox":"125 254 752 402"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20002-9c4e-4f7a-8d21-0d5e6f7a8c02', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo master editable (pp_logo_master_editable.svg)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_master_editable.svg',
   '{"asset_key":"pp_logo_master_editable_svg","usage":"logo_vector_source","logo_role":"logo_master_editable","colour_mode":"white_gold","background_type":"dark","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_master_editable.svg","mime":"image/svg+xml","bytes":800,"sha256":"e971759e807f822793bc55020bdbe16f670a07ea52b9d0f14be04ac32a8b31fe","file_format":"svg","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_master_editable.svg","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"scalable":true,"has_transparency":true,"visual_verification":"true vector (paths only, no embedded raster); fills match brand palette exactly; verified pp-logo-variant-intake-v0 (2026-07-03)","vector_note":"live-text editing source ONLY; requires Urbanist 600+800 installed","font_dependency":"Urbanist 600 + 800","viewBox":"125 254 752 402"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20003-9c4e-4f7a-8d21-0d5e6f7a8c03', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo primary light bg (pp_logo_full_colour.svg)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_full_colour.svg',
   '{"asset_key":"pp_logo_full_colour_svg","usage":"logo_vector_source","logo_role":"logo_primary_light_bg","colour_mode":"navy_gold","background_type":"light","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_full_colour.svg","mime":"image/svg+xml","bytes":6951,"sha256":"f12765b3d84fccc2191f4998788f8806a05b6dfb00f64d30f6c31ef4f166ecb0","file_format":"svg","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_full_colour.svg","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"scalable":true,"has_transparency":true,"visual_verification":"true vector (paths only, no embedded raster); fills match brand palette exactly; verified pp-logo-variant-intake-v0 (2026-07-03)","vector_note":"outlines; Property + roof in brand navy for light backgrounds","viewBox":"125 254 752 402"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20004-9c4e-4f7a-8d21-0d5e6f7a8c04', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo white (pp_logo_white.svg)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_white.svg',
   '{"asset_key":"pp_logo_white_svg","usage":"logo_vector_source","logo_role":"logo_white","colour_mode":"white_mono","background_type":"dark","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_white.svg","mime":"image/svg+xml","bytes":6951,"sha256":"29d2fff49a25a7cf3f27d7b02790703eca3d51b4a0bf1f0387ffef1a4944368b","file_format":"svg","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_white.svg","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"scalable":true,"has_transparency":true,"visual_verification":"true vector (paths only, no embedded raster); fills match brand palette exactly; verified pp-logo-variant-intake-v0 (2026-07-03)","vector_note":"outlines","viewBox":"125 254 752 402"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20005-9c4e-4f7a-8d21-0d5e6f7a8c05', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo dark (pp_logo_dark.svg)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_dark.svg',
   '{"asset_key":"pp_logo_dark_svg","usage":"logo_vector_source","logo_role":"logo_dark","colour_mode":"navy_mono","background_type":"light","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_dark.svg","mime":"image/svg+xml","bytes":6951,"sha256":"b1800cd2e63ceec21e4570416f43e4c088cf8e229711724659b4a8ed37c91553","file_format":"svg","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_dark.svg","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"scalable":true,"has_transparency":true,"visual_verification":"true vector (paths only, no embedded raster); fills match brand palette exactly; verified pp-logo-variant-intake-v0 (2026-07-03)","vector_note":"outlines","viewBox":"125 254 752 402"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20006-9c4e-4f7a-8d21-0d5e6f7a8c06', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo mark (pp_logo_mark_only.svg)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_mark_only.svg',
   '{"asset_key":"pp_logo_mark_only_svg","usage":"logo_vector_source","logo_role":"logo_mark","colour_mode":"white_gold","background_type":"dark","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_mark_only.svg","mime":"image/svg+xml","bytes":623,"sha256":"3cb8563bb1621c80db92ce7a19ba02e09ef511bf77b98f2658372c0a852fe115","file_format":"svg","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_mark_only.svg","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"scalable":true,"has_transparency":true,"visual_verification":"true vector (paths only, no embedded raster); fills match brand palette exactly; verified pp-logo-variant-intake-v0 (2026-07-03)","vector_note":"roof + pulse only; white roof needs dark background","viewBox":"189 266 624 266"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20007-9c4e-4f7a-8d21-0d5e6f7a8c07', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo mark (pp_logo_mark_only_dark.svg)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_mark_only_dark.svg',
   '{"asset_key":"pp_logo_mark_only_dark_svg","usage":"logo_vector_source","logo_role":"logo_mark","colour_mode":"navy_gold","background_type":"light","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_mark_only_dark.svg","mime":"image/svg+xml","bytes":623,"sha256":"0c2892c76eb37ef15e5bdbfe719299171673d7366ef4c0229875395a49550ee2","file_format":"svg","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_mark_only_dark.svg","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"scalable":true,"has_transparency":true,"visual_verification":"true vector (paths only, no embedded raster); fills match brand palette exactly; verified pp-logo-variant-intake-v0 (2026-07-03)","vector_note":"roof + pulse only; navy roof for light backgrounds","viewBox":"189 266 624 266"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20008-9c4e-4f7a-8d21-0d5e6f7a8c08', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo master (pp_logo_master_transparent_512.png)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_master_transparent_512.png',
   '{"asset_key":"pp_logo_master_png_512","usage":"logo","logo_role":"logo_master","colour_mode":"white_gold","background_type":"transparent","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_master_transparent_512.png","mime":"image/png","bytes":25361,"sha256":"88cc62acb980e9494908aa5184bd4299aee4a2989d9071220efc6b5ac8926751","file_format":"png","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_master_transparent_512.png","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"width":512,"height":274,"aspect_ratio":"512:274","has_transparency":true,"visual_verification":"alpha transparency verified; dominant colours match brand palette; visual identity match vs live logo confirmed; verified pp-logo-variant-intake-v0 (2026-07-03)","render_note":"rendered from pp_logo_master.svg"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20009-9c4e-4f7a-8d21-0d5e6f7a8c09', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo master (pp_logo_master_transparent_1024.png)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_master_transparent_1024.png',
   '{"asset_key":"pp_logo_master_png_1024","usage":"logo","logo_role":"logo_master","colour_mode":"white_gold","background_type":"transparent","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_master_transparent_1024.png","mime":"image/png","bytes":57316,"sha256":"69d9697c220bd64fe09cce9a6ad5396541dd85cbe35e481c28ceb7259b2e5697","file_format":"png","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_master_transparent_1024.png","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"width":1024,"height":547,"aspect_ratio":"1024:547","has_transparency":true,"visual_verification":"alpha transparency verified; dominant colours match brand palette; visual identity match vs live logo confirmed; verified pp-logo-variant-intake-v0 (2026-07-03)","render_note":"rendered from pp_logo_master.svg"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20010-9c4e-4f7a-8d21-0d5e6f7a8c10', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo master (pp_logo_master_transparent_2048.png)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_master_transparent_2048.png',
   '{"asset_key":"pp_logo_master_png_2048","usage":"logo","logo_role":"logo_master","colour_mode":"white_gold","background_type":"transparent","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_master_transparent_2048.png","mime":"image/png","bytes":136752,"sha256":"308cc34c2b0ff2875cb91224865750500d7d5e951768766f654a4a599430086f","file_format":"png","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_master_transparent_2048.png","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"width":2048,"height":1095,"aspect_ratio":"2048:1095","has_transparency":true,"visual_verification":"alpha transparency verified; dominant colours match brand palette; visual identity match vs live logo confirmed; verified pp-logo-variant-intake-v0 (2026-07-03)","render_note":"rendered from pp_logo_master.svg"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20011-9c4e-4f7a-8d21-0d5e6f7a8c11', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo primary light bg (pp_logo_full_colour_1024.png)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_full_colour_1024.png',
   '{"asset_key":"pp_logo_full_colour_png_1024","usage":"logo","logo_role":"logo_primary_light_bg","colour_mode":"navy_gold","background_type":"transparent","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_full_colour_1024.png","mime":"image/png","bytes":61891,"sha256":"9423a7b619bed6117e8c1f926a50b34c983af8ee695caae3c885996795cf7864","file_format":"png","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_full_colour_1024.png","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"width":1024,"height":547,"aspect_ratio":"1024:547","has_transparency":true,"visual_verification":"alpha transparency verified; dominant colours match brand palette; visual identity match vs live logo confirmed; verified pp-logo-variant-intake-v0 (2026-07-03)","render_note":"rendered from pp_logo_full_colour.svg"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20012-9c4e-4f7a-8d21-0d5e6f7a8c12', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo white (pp_logo_white_1024.png)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_white_1024.png',
   '{"asset_key":"pp_logo_white_png_1024","usage":"logo","logo_role":"logo_white","colour_mode":"white_mono","background_type":"transparent","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_white_1024.png","mime":"image/png","bytes":50690,"sha256":"8f90163fd5968867423997670e05eba67f8cfcad742596906c923de9b8cee1b5","file_format":"png","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_white_1024.png","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"width":1024,"height":547,"aspect_ratio":"1024:547","has_transparency":true,"visual_verification":"alpha transparency verified; dominant colours match brand palette; visual identity match vs live logo confirmed; verified pp-logo-variant-intake-v0 (2026-07-03)","render_note":"rendered from pp_logo_white.svg"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20013-9c4e-4f7a-8d21-0d5e6f7a8c13', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo dark (pp_logo_dark_1024.png)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_dark_1024.png',
   '{"asset_key":"pp_logo_dark_png_1024","usage":"logo","logo_role":"logo_dark","colour_mode":"navy_mono","background_type":"transparent","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_dark_1024.png","mime":"image/png","bytes":60522,"sha256":"af725d11040d03d0320ac5424f7cb8385eb9a53157ddef3ac5a90c427b74ad61","file_format":"png","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"vector/pp_logo_dark_1024.png","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"width":1024,"height":547,"aspect_ratio":"1024:547","has_transparency":true,"visual_verification":"alpha transparency verified; dominant colours match brand palette; visual identity match vs live logo confirmed; verified pp-logo-variant-intake-v0 (2026-07-03)","render_note":"rendered from pp_logo_dark.svg"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20014-9c4e-4f7a-8d21-0d5e6f7a8c14', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo mark (pp_logo_mark_only_transparent_512.png)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_mark_only_transparent_512.png',
   '{"asset_key":"pp_logo_mark_only_png_512","usage":"logo","logo_role":"logo_mark","colour_mode":"white_gold","background_type":"transparent","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_mark_only_transparent_512.png","mime":"image/png","bytes":21082,"sha256":"5a05207747a09e68f0ba7fe05745cc7738bdfdac74df2b74bef2db242e06b092","file_format":"png","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"assets/pp_logo_mark_only_transparent_512.png","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"width":512,"height":512,"aspect_ratio":"1:1","has_transparency":true,"visual_verification":"alpha transparency verified; dominant colours match brand palette; visual identity match vs live logo confirmed; verified pp-logo-variant-intake-v0 (2026-07-03)","render_note":"raster-derived export; white roof needs dark background"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20015-9c4e-4f7a-8d21-0d5e6f7a8c15', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo mark (pp_logo_mark_only_transparent_1024.png)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_mark_only_transparent_1024.png',
   '{"asset_key":"pp_logo_mark_only_png_1024","usage":"logo","logo_role":"logo_mark","colour_mode":"white_gold","background_type":"transparent","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_mark_only_transparent_1024.png","mime":"image/png","bytes":71599,"sha256":"5c612982d3e67020cceefd777e701ab283ff695c964546a3b1287f5bc87b0e37","file_format":"png","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"assets/pp_logo_mark_only_transparent_1024.png","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"width":1024,"height":1024,"aspect_ratio":"1:1","has_transparency":true,"visual_verification":"alpha transparency verified; dominant colours match brand palette; visual identity match vs live logo confirmed; verified pp-logo-variant-intake-v0 (2026-07-03)","render_note":"raster-derived export; white roof needs dark background"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20016-9c4e-4f7a-8d21-0d5e6f7a8c16', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo square (pp_logo_square_navy_bg_512.png)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_square_navy_bg_512.png',
   '{"asset_key":"pp_logo_square_navy_bg_png_512","usage":"logo","logo_role":"logo_square","colour_mode":"white_gold_on_navy","background_type":"solid_navy","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_square_navy_bg_512.png","mime":"image/png","bytes":30592,"sha256":"4d51bba8e1d775e00bb624d74ec8a649a6c08a12ee8e0ad5c09333e65a2a4966","file_format":"png","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"assets/pp_logo_square_navy_bg_512.png","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"width":512,"height":512,"aspect_ratio":"1:1","has_transparency":false,"visual_verification":"intentionally opaque solid #1E2532 navy background (no alpha); dominant colours match brand palette; visual identity match vs live logo confirmed; verified pp-logo-variant-intake-v0 (2026-07-03)","render_note":"solid #1E2532 background, generous padding; boxed corner/profile badge"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20017-9c4e-4f7a-8d21-0d5e6f7a8c17', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo square (pp_logo_square_navy_bg_1024.png)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_square_navy_bg_1024.png',
   '{"asset_key":"pp_logo_square_navy_bg_png_1024","usage":"logo","logo_role":"logo_square","colour_mode":"white_gold_on_navy","background_type":"solid_navy","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_square_navy_bg_1024.png","mime":"image/png","bytes":73754,"sha256":"0956757dcc6488d6955549eae0875a5fb08ea1d0990086a279160cf2726cea3c","file_format":"png","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"assets/pp_logo_square_navy_bg_1024.png","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"width":1024,"height":1024,"aspect_ratio":"1:1","has_transparency":false,"visual_verification":"intentionally opaque solid #1E2532 navy background (no alpha); dominant colours match brand palette; visual identity match vs live logo confirmed; verified pp-logo-variant-intake-v0 (2026-07-03)","render_note":"solid #1E2532 background, generous padding; boxed corner/profile badge"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

INSERT INTO c.client_brand_asset
  (asset_id, client_id, asset_type, asset_name, asset_url, asset_meta, platform_scope, is_active, notes)
VALUES
  ('c3a20018-9c4e-4f7a-8d21-0d5e6f7a8c18', '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'other',
   'Property Pulse logo watermark (pp_logo_watermark_white_transparent.png)',
   'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/pp_logo_watermark_white_transparent.png',
   '{"asset_key":"pp_logo_watermark_white_png","usage":"logo","logo_role":"logo_watermark","colour_mode":"white_mono","background_type":"transparent","bucket":"brand-assets","source_path":"Property_Pulse/Logos/pp_logo_watermark_white_transparent.png","mime":"image/png","bytes":45489,"sha256":"dc4734d561c985f9496f74a9c8d6fec4413785ce54f07310d7571d3a584ed497","file_format":"png","approved":false,"approval_status":"intake_candidate","production_use_allowed":false,"attribution_required":false,"license":"Brand-owned / PK-authorised - Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms","license_type":"brand_owned_or_pk_authorised","rights_note":"PK owns/controls the Property Pulse logo and authorises ICE use (mirrors pp_logo_primary rights confirmation 2026-07-02)","pk_decision":"intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate","intake_lane":"pp-logo-variant-intake-v0 (2026-07-03)","review_packet":"docs/briefs/pp-logo-variant-intake-v0-packet.md","source":"claude_design_export","source_project":"https://claude.ai/design/p/b6e699fa-909a-4dbd-9fc1-187905be37cd","source_file":"assets/pp_logo_watermark_white_transparent.png","source_limitations":"Reconstructed kit, not the original designer master file: mark polygons traced from the 1024px production raster (sha256 feafee4e44526636...) which is byte-identical to the live pp_logo_primary object; wordmark rebuilt from Urbanist 600/800 font outlines (close visual match, slight letterform deviation visible in overlay evidence). Carry: replace with true original vector master if ever found.","brand_palette":{"navy":"#1E2532","gold":"#ECA02D","white":"#FFFFFF"},"width":800,"height":428,"aspect_ratio":"800:428","has_transparency":true,"visual_verification":"alpha transparency verified; dominant colours match brand palette; visual identity match vs live logo confirmed; verified pp-logo-variant-intake-v0 (2026-07-03)","render_note":"corner watermark; use at reduced opacity (40-70%)"}'::jsonb,
   NULL, false,
   'Intake candidate (Claude Design logo kit v2, pp-logo-variant-intake-v0 (2026-07-03)). Not selectable: is_active=false + approved=false + production_use_allowed=false. Promotion requires a separate PK gate.');

-- ── P1: exactly 18 new rows, every one fully fenced ─────────────────────────
DO $$
BEGIN
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id IN ('c3a20001-9c4e-4f7a-8d21-0d5e6f7a8c01', 'c3a20002-9c4e-4f7a-8d21-0d5e6f7a8c02', 'c3a20003-9c4e-4f7a-8d21-0d5e6f7a8c03', 'c3a20004-9c4e-4f7a-8d21-0d5e6f7a8c04', 'c3a20005-9c4e-4f7a-8d21-0d5e6f7a8c05', 'c3a20006-9c4e-4f7a-8d21-0d5e6f7a8c06', 'c3a20007-9c4e-4f7a-8d21-0d5e6f7a8c07', 'c3a20008-9c4e-4f7a-8d21-0d5e6f7a8c08', 'c3a20009-9c4e-4f7a-8d21-0d5e6f7a8c09', 'c3a20010-9c4e-4f7a-8d21-0d5e6f7a8c10', 'c3a20011-9c4e-4f7a-8d21-0d5e6f7a8c11', 'c3a20012-9c4e-4f7a-8d21-0d5e6f7a8c12', 'c3a20013-9c4e-4f7a-8d21-0d5e6f7a8c13', 'c3a20014-9c4e-4f7a-8d21-0d5e6f7a8c14', 'c3a20015-9c4e-4f7a-8d21-0d5e6f7a8c15', 'c3a20016-9c4e-4f7a-8d21-0d5e6f7a8c16', 'c3a20017-9c4e-4f7a-8d21-0d5e6f7a8c17', 'c3a20018-9c4e-4f7a-8d21-0d5e6f7a8c18')
        AND is_active IS FALSE
        AND (asset_meta->>'approved')::boolean IS FALSE
        AND asset_meta->>'approval_status' = 'intake_candidate'
        AND (asset_meta->>'production_use_allowed')::boolean IS FALSE) <> 18 THEN
    RAISE EXCEPTION 'P1 FAIL: inserted rows not exactly 18 fully-fenced intake candidates';
  END IF;
END $$;

-- ── P2: governed resolver returns ONLY the live primary for all logo keys ───
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM public.resolve_brand_assets('property-pulse',
        ARRAY['pp_logo_primary', 'pp_logo_master_svg', 'pp_logo_master_editable_svg', 'pp_logo_full_colour_svg', 'pp_logo_white_svg', 'pp_logo_dark_svg', 'pp_logo_mark_only_svg', 'pp_logo_mark_only_dark_svg', 'pp_logo_master_png_512', 'pp_logo_master_png_1024', 'pp_logo_master_png_2048', 'pp_logo_full_colour_png_1024', 'pp_logo_white_png_1024', 'pp_logo_dark_png_1024', 'pp_logo_mark_only_png_512', 'pp_logo_mark_only_png_1024', 'pp_logo_square_navy_bg_png_512', 'pp_logo_square_navy_bg_png_1024', 'pp_logo_watermark_white_png']);
  IF n <> 1 THEN
    RAISE EXCEPTION 'P2 FAIL: resolve_brand_assets returned % rows (expected 1: live primary only)', n;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.resolve_brand_assets('property-pulse', ARRAY['pp_logo_primary'])
    WHERE asset_id = 'b7530c55-c320-43be-90d9-98c804694921') THEN
    RAISE EXCEPTION 'P2 FAIL: live pp_logo_primary no longer resolves';
  END IF;
END $$;

-- ── P3: production selection PROVABLY unchanged (live template probe) ───────
-- Baseline recorded pre-change 2026-07-03: status=ok, Logo pick=b7530c55-c320-43be-90d9-98c804694921,
-- rejected_logos=0. Post-insert expectation: Logo pick unchanged; the 11 new
-- usage='logo' candidates appear ONLY as rejected 'inactive'; the 7 SVG rows
-- (usage='logo_vector_source') are invisible to the resolver.
DO $$
DECLARE
  r jsonb;
  pick text;
  rej_logo_inactive int;
  rej_logo_other int;
BEGIN
  r := public.resolve_slot_assets('property-pulse', 'facebook', NULL,
        'c0b10001-0000-4000-8000-000000000002', NULL);
  IF r->>'status' <> 'ok' THEN
    RAISE EXCEPTION 'P3 FAIL: resolver status % (expected ok)', r->>'status';
  END IF;
  SELECT e->>'asset_id' INTO pick
  FROM jsonb_array_elements(r->'selected') e WHERE e->>'slot' = 'Logo';
  IF pick IS DISTINCT FROM 'b7530c55-c320-43be-90d9-98c804694921' THEN
    RAISE EXCEPTION 'P3 FAIL: Logo pick changed to % (expected live primary)', pick;
  END IF;
  SELECT
    count(*) FILTER (WHERE e->>'reason_code' = 'inactive'),
    count(*) FILTER (WHERE e->>'reason_code' <> 'inactive')
  INTO rej_logo_inactive, rej_logo_other
  FROM jsonb_array_elements(r->'rejected') e
  WHERE e->>'slot' = 'Logo';
  IF rej_logo_inactive <> 11 OR rej_logo_other <> 0 THEN
    RAISE EXCEPTION 'P3 FAIL: rejected Logo entries inactive=%/other=% (expected 11/0)',
      rej_logo_inactive, rej_logo_other;
  END IF;
END $$;

COMMIT;
