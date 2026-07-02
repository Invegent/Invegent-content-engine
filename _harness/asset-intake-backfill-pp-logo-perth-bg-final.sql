-- Asset Intake Backfill — PP logo + Perth background — FINAL APPLY SQL v1 (2026-07-02)
-- Packet: docs/briefs/asset-intake-backfill-pp-logo-perth-background-packet.md (§9d)
-- PK rights confirmation: 2026-07-02 (packet §10a). DO NOT APPLY until PK approves the reviewed packet.
-- Apply as postgres (NOT service_role — no UPDATE grant) via SQL editor / MCP.
-- Single DO block = single transaction; each UPDATE asserts exactly 1 matched row, else the whole apply aborts.
-- Metadata-additive only: no approved/is_active flip, no asset_url/asset_type change, no DDL, no new rows.

DO $$
DECLARE
  n integer;
BEGIN
  -- 1/2 — pp_logo_primary (b7530c55-c320-43be-90d9-98c804694921)
  UPDATE c.client_brand_asset
  SET asset_meta = asset_meta || jsonb_build_object(
        'aspect_ratio', '1:1',
        'width', 1024,
        'height', 1024,
        'has_transparency', false,
        'background_colour', '#1E2532 solid navy full-bleed',
        'source_type', 'internal_brand_asset',
        'license_type', 'brand_owned_or_pk_authorised',
        'license', 'Brand-owned / PK-authorised — Property Pulse (Invegent); authorised for ICE-generated publishing across external platforms',
        'attribution_required', false,
        'production_use_allowed', true,
        'rights_note', 'PK confirmed owned/controlled brand asset (PK rights confirmation 2026-07-02); creation method unrecorded',
        'rights_confirmed_by', 'PK',
        'rights_confirmed_at', '2026-07-02',
        'approval_status', 'governed',
        'approved_by', 'PK',
        'approved_at', now(),
        'pk_decision', 'approve',
        'logo_variants_note', 'logo_light/logo_dark variants still deferred to Asset Intake (v4.74 PK decision 2)',
        'backfill_lane', 'asset-intake-backfill-pp-v1',
        'review_packet', 'docs/briefs/asset-intake-backfill-pp-logo-perth-background-packet.md'
      ),
      updated_at = now()
  WHERE asset_id = 'b7530c55-c320-43be-90d9-98c804694921'
    AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
    AND asset_meta->>'asset_key' = 'pp_logo_primary';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'pp_logo_primary UPDATE matched % rows, expected exactly 1 — aborting', n;
  END IF;

  -- 2/2 — bg_perth_cbd (f9caed52-0859-4e22-91f6-7dc998485d77)
  UPDATE c.client_brand_asset
  SET asset_meta = asset_meta || jsonb_build_object(
        'aspect_ratio', '16:9',
        'width', 3524,
        'height', 1982,
        'safe_for_text_overlay', 'needs_scrim',
        'has_text', false,
        'has_people', false,
        'scene_type', 'suburbs-river-cityscape (aerial)',
        'visual_style', 'photographic',
        'license_type', 'licence_free',
        'license', 'Licence-free (PK-confirmed 2026-07-02); photographer attribution optional, not mandatory',
        'attribution_required', false,
        'production_use_allowed', true,
        'provenance_status', 'incomplete_pk_rights_confirmed',
        'rights_note', 'Original source/photographer unrecorded — provenance incomplete; PK confirmed licence-free with optional attribution (PK rights confirmation 2026-07-02)',
        'rights_confirmed_by', 'PK',
        'rights_confirmed_at', '2026-07-02',
        'approval_status', 'governed',
        'approved_by', 'PK',
        'approved_at', now(),
        'pk_decision', 'approve',
        'backfill_lane', 'asset-intake-backfill-pp-v1',
        'review_packet', 'docs/briefs/asset-intake-backfill-pp-logo-perth-background-packet.md'
      ),
      updated_at = now()
  WHERE asset_id = 'f9caed52-0859-4e22-91f6-7dc998485d77'
    AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
    AND asset_meta->>'asset_key' = 'bg_perth_cbd';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'bg_perth_cbd UPDATE matched % rows, expected exactly 1 — aborting', n;
  END IF;
END
$$;

-- ============================================================================
-- ROLLBACK (run only if reversal is required; restores exact pre-image
-- captured 2026-07-02 + original updated_at; verified byte-identical to live
-- by db-rls-auditor on 2026-07-02):
--
-- UPDATE c.client_brand_asset
-- SET asset_meta = '{"mime":"image/png","bytes":237798,"usage":"logo","bucket":"brand-assets","approved":true,"asset_key":"pp_logo_primary","governed_by":"creative-library-v0.1-lane1","source_path":"Property_Pulse/Logos/PP_logo_2.png"}'::jsonb,
--     updated_at = '2026-06-22 07:07:29.550742+00'
-- WHERE asset_id = 'b7530c55-c320-43be-90d9-98c804694921'
--   AND asset_meta->>'asset_key' = 'pp_logo_primary';
--
-- UPDATE c.client_brand_asset
-- SET asset_meta = '{"mime":"image/jpeg","bytes":1232061,"usage":"background","bucket":"brand-assets","approved":true,"location":"Perth","asset_key":"bg_perth_cbd","governed_by":"creative-library-v0.1-lane1","source_path":"Property_Pulse/Backgrounds/Perth_CBD_Suburbs.jpg"}'::jsonb,
--     updated_at = '2026-06-22 07:07:29.550742+00'
-- WHERE asset_id = 'f9caed52-0859-4e22-91f6-7dc998485d77'
--   AND asset_meta->>'asset_key' = 'bg_perth_cbd';
-- ============================================================================
