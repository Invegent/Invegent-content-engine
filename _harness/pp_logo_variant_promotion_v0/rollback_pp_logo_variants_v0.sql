-- PP Logo Variant Promotion v0 - standing rollback (PK-gated)
-- Restores the 7 promoted rows to their EXACT pre-promotion intake fences and strips
-- every promotion-added meta key. Never touches the live pp_logo_primary or the 11
-- held candidates.
BEGIN;

UPDATE c.client_brand_asset
SET is_active      = false,
    platform_scope = NULL,
    asset_meta     = (asset_meta - 'approved_at' - 'approved_by' - 'promotion_lane'
                                  - 'promotion_packet' - 'governed_by')
                     || jsonb_build_object(
                       'approved', false,
                       'approval_status', 'intake_candidate',
                       'production_use_allowed', false,
                       'pk_decision', 'intake_only (PP Logo Variant Intake v0, 2026-07-03); production approval requires a separate PK gate'),
    updated_at     = now()
WHERE asset_id IN ('c3a20009-9c4e-4f7a-8d21-0d5e6f7a8c09', 'c3a20011-9c4e-4f7a-8d21-0d5e6f7a8c11', 'c3a20012-9c4e-4f7a-8d21-0d5e6f7a8c12', 'c3a20013-9c4e-4f7a-8d21-0d5e6f7a8c13', 'c3a20014-9c4e-4f7a-8d21-0d5e6f7a8c14', 'c3a20017-9c4e-4f7a-8d21-0d5e6f7a8c17', 'c3a20018-9c4e-4f7a-8d21-0d5e6f7a8c18');

DO $$
BEGIN
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id IN ('c3a20009-9c4e-4f7a-8d21-0d5e6f7a8c09', 'c3a20011-9c4e-4f7a-8d21-0d5e6f7a8c11', 'c3a20012-9c4e-4f7a-8d21-0d5e6f7a8c12', 'c3a20013-9c4e-4f7a-8d21-0d5e6f7a8c13', 'c3a20014-9c4e-4f7a-8d21-0d5e6f7a8c14', 'c3a20017-9c4e-4f7a-8d21-0d5e6f7a8c17', 'c3a20018-9c4e-4f7a-8d21-0d5e6f7a8c18')
        AND is_active IS FALSE
        AND (asset_meta->>'approved')::boolean IS FALSE
        AND asset_meta->>'approval_status' = 'intake_candidate'
        AND (asset_meta->>'production_use_allowed')::boolean IS FALSE
        AND platform_scope IS NULL
        AND NOT (asset_meta ? 'approved_at')
        AND NOT (asset_meta ? 'promotion_lane')) <> 7 THEN
    RAISE EXCEPTION 'ROLLBACK FAIL: promoted rows not fully restored to intake fences';
  END IF;
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id = 'b7530c55-c320-43be-90d9-98c804694921'
        AND (asset_meta->>'approved')::boolean IS TRUE
        AND is_active IS TRUE) <> 1 THEN
    RAISE EXCEPTION 'ROLLBACK FAIL: live pp_logo_primary not intact';
  END IF;
END $$;

COMMIT;
