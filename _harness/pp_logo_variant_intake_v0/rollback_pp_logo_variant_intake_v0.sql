-- PP Logo Variant Intake v0 - standing rollback (PK-gated)
-- Removes ONLY the 18 intake-candidate rows inserted by lane_pp_logo_variant_intake_v0.sql.
-- Never touches the live pp_logo_primary (b7530c55-c320-43be-90d9-98c804694921).
BEGIN;

DELETE FROM c.client_brand_asset
WHERE asset_id IN ('c3a20001-9c4e-4f7a-8d21-0d5e6f7a8c01', 'c3a20002-9c4e-4f7a-8d21-0d5e6f7a8c02', 'c3a20003-9c4e-4f7a-8d21-0d5e6f7a8c03', 'c3a20004-9c4e-4f7a-8d21-0d5e6f7a8c04', 'c3a20005-9c4e-4f7a-8d21-0d5e6f7a8c05', 'c3a20006-9c4e-4f7a-8d21-0d5e6f7a8c06', 'c3a20007-9c4e-4f7a-8d21-0d5e6f7a8c07', 'c3a20008-9c4e-4f7a-8d21-0d5e6f7a8c08', 'c3a20009-9c4e-4f7a-8d21-0d5e6f7a8c09', 'c3a20010-9c4e-4f7a-8d21-0d5e6f7a8c10', 'c3a20011-9c4e-4f7a-8d21-0d5e6f7a8c11', 'c3a20012-9c4e-4f7a-8d21-0d5e6f7a8c12', 'c3a20013-9c4e-4f7a-8d21-0d5e6f7a8c13', 'c3a20014-9c4e-4f7a-8d21-0d5e6f7a8c14', 'c3a20015-9c4e-4f7a-8d21-0d5e6f7a8c15', 'c3a20016-9c4e-4f7a-8d21-0d5e6f7a8c16', 'c3a20017-9c4e-4f7a-8d21-0d5e6f7a8c17', 'c3a20018-9c4e-4f7a-8d21-0d5e6f7a8c18');

DO $$
BEGIN
  IF (SELECT count(*) FROM c.client_brand_asset WHERE asset_id IN ('c3a20001-9c4e-4f7a-8d21-0d5e6f7a8c01', 'c3a20002-9c4e-4f7a-8d21-0d5e6f7a8c02', 'c3a20003-9c4e-4f7a-8d21-0d5e6f7a8c03', 'c3a20004-9c4e-4f7a-8d21-0d5e6f7a8c04', 'c3a20005-9c4e-4f7a-8d21-0d5e6f7a8c05', 'c3a20006-9c4e-4f7a-8d21-0d5e6f7a8c06', 'c3a20007-9c4e-4f7a-8d21-0d5e6f7a8c07', 'c3a20008-9c4e-4f7a-8d21-0d5e6f7a8c08', 'c3a20009-9c4e-4f7a-8d21-0d5e6f7a8c09', 'c3a20010-9c4e-4f7a-8d21-0d5e6f7a8c10', 'c3a20011-9c4e-4f7a-8d21-0d5e6f7a8c11', 'c3a20012-9c4e-4f7a-8d21-0d5e6f7a8c12', 'c3a20013-9c4e-4f7a-8d21-0d5e6f7a8c13', 'c3a20014-9c4e-4f7a-8d21-0d5e6f7a8c14', 'c3a20015-9c4e-4f7a-8d21-0d5e6f7a8c15', 'c3a20016-9c4e-4f7a-8d21-0d5e6f7a8c16', 'c3a20017-9c4e-4f7a-8d21-0d5e6f7a8c17', 'c3a20018-9c4e-4f7a-8d21-0d5e6f7a8c18')) <> 0 THEN
    RAISE EXCEPTION 'ROLLBACK FAIL: intake rows still present';
  END IF;
  IF (SELECT count(*) FROM c.client_brand_asset
      WHERE asset_id = 'b7530c55-c320-43be-90d9-98c804694921'
        AND (asset_meta->>'approved')::boolean IS TRUE
        AND is_active IS TRUE) <> 1 THEN
    RAISE EXCEPTION 'ROLLBACK FAIL: live pp_logo_primary not intact';
  END IF;
END $$;

COMMIT;

-- Storage rollback (manual, PK-gated; only if full unwind is wanted):
-- delete the 18 objects listed in upload_manifest.json under brand-assets/Property_Pulse/Logos/ .
-- PP_logo_2.png is NOT part of this lane and must never be deleted.
