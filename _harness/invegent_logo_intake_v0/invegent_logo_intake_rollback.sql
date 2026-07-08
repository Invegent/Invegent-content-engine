-- Invegent logo intake ROLLBACK: guarded delete of the 17 fenced lane rows; storage objects excluded.
BEGIN;
DELETE FROM c.client_brand_asset WHERE client_id='93494a09-cc89-41d1-b364-cb63983063a6' AND asset_meta->>'intake_lane_batch'='invegent-logo-intake-v0 (2026-07-08)'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$ DECLARE r int; BEGIN
  SELECT count(*) INTO r FROM c.client_brand_asset WHERE asset_id IN ('d3d10001-9c4e-4f7a-8d21-0d5e6f7a8d01','d3d10002-9c4e-4f7a-8d21-0d5e6f7a8d02','d3d10003-9c4e-4f7a-8d21-0d5e6f7a8d03','d3d10004-9c4e-4f7a-8d21-0d5e6f7a8d04','d3d10005-9c4e-4f7a-8d21-0d5e6f7a8d05','d3d10006-9c4e-4f7a-8d21-0d5e6f7a8d06','d3d10007-9c4e-4f7a-8d21-0d5e6f7a8d07','d3d10008-9c4e-4f7a-8d21-0d5e6f7a8d08','d3d10009-9c4e-4f7a-8d21-0d5e6f7a8d09','d3d10010-9c4e-4f7a-8d21-0d5e6f7a8d10','d3d10011-9c4e-4f7a-8d21-0d5e6f7a8d11','d3d10012-9c4e-4f7a-8d21-0d5e6f7a8d12','d3d10013-9c4e-4f7a-8d21-0d5e6f7a8d13','d3d10014-9c4e-4f7a-8d21-0d5e6f7a8d14','d3d10015-9c4e-4f7a-8d21-0d5e6f7a8d15','d3d10016-9c4e-4f7a-8d21-0d5e6f7a8d16','d3d10017-9c4e-4f7a-8d21-0d5e6f7a8d17');
  IF r <> 0 THEN RAISE EXCEPTION 'invegent-logo rollback refused: % rows remain (promoted?) — manual review', r; END IF;
END $$;
COMMIT;
