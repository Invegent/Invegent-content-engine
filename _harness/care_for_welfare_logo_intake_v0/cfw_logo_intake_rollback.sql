-- CFW logo intake ROLLBACK: guarded delete of the 16 fenced lane rows; storage objects excluded.
BEGIN;
DELETE FROM c.client_brand_asset WHERE client_id='3eca32aa-e460-462f-a846-3f6ace6a3cae' AND asset_meta->>'intake_lane_batch'='cfw-logo-intake-v0 (2026-07-08)'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$ DECLARE r int; BEGIN
  SELECT count(*) INTO r FROM c.client_brand_asset WHERE asset_id IN ('d2c10001-9c4e-4f7a-8d21-0d5e6f7a8c01','d2c10002-9c4e-4f7a-8d21-0d5e6f7a8c02','d2c10003-9c4e-4f7a-8d21-0d5e6f7a8c03','d2c10004-9c4e-4f7a-8d21-0d5e6f7a8c04','d2c10005-9c4e-4f7a-8d21-0d5e6f7a8c05','d2c10006-9c4e-4f7a-8d21-0d5e6f7a8c06','d2c10007-9c4e-4f7a-8d21-0d5e6f7a8c07','d2c10008-9c4e-4f7a-8d21-0d5e6f7a8c08','d2c10009-9c4e-4f7a-8d21-0d5e6f7a8c09','d2c10010-9c4e-4f7a-8d21-0d5e6f7a8c10','d2c10011-9c4e-4f7a-8d21-0d5e6f7a8c11','d2c10012-9c4e-4f7a-8d21-0d5e6f7a8c12','d2c10013-9c4e-4f7a-8d21-0d5e6f7a8c13','d2c10014-9c4e-4f7a-8d21-0d5e6f7a8c14','d2c10015-9c4e-4f7a-8d21-0d5e6f7a8c15','d2c10016-9c4e-4f7a-8d21-0d5e6f7a8c16');
  IF r <> 0 THEN RAISE EXCEPTION 'cfw-logo rollback refused: % rows remain (promoted?) — manual review', r; END IF;
END $$;
COMMIT;
