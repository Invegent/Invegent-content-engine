-- NDIS logo intake ROLLBACK: guarded delete of the 17 fenced lane rows; storage objects excluded.
BEGIN;
DELETE FROM c.client_brand_asset WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND asset_meta->>'intake_lane_batch'='ndis-yarns-logo-intake-v0 (2026-07-08)'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$ DECLARE r int; BEGIN
  SELECT count(*) INTO r FROM c.client_brand_asset WHERE asset_id IN ('d1b10001-9c4e-4f7a-8d21-0d5e6f7a8b01','d1b10002-9c4e-4f7a-8d21-0d5e6f7a8b02','d1b10003-9c4e-4f7a-8d21-0d5e6f7a8b03','d1b10004-9c4e-4f7a-8d21-0d5e6f7a8b04','d1b10005-9c4e-4f7a-8d21-0d5e6f7a8b05','d1b10006-9c4e-4f7a-8d21-0d5e6f7a8b06','d1b10007-9c4e-4f7a-8d21-0d5e6f7a8b07','d1b10008-9c4e-4f7a-8d21-0d5e6f7a8b08','d1b10009-9c4e-4f7a-8d21-0d5e6f7a8b09','d1b10010-9c4e-4f7a-8d21-0d5e6f7a8b10','d1b10011-9c4e-4f7a-8d21-0d5e6f7a8b11','d1b10012-9c4e-4f7a-8d21-0d5e6f7a8b12','d1b10013-9c4e-4f7a-8d21-0d5e6f7a8b13','d1b10014-9c4e-4f7a-8d21-0d5e6f7a8b14','d1b10015-9c4e-4f7a-8d21-0d5e6f7a8b15','d1b10016-9c4e-4f7a-8d21-0d5e6f7a8b16','d1b10017-9c4e-4f7a-8d21-0d5e6f7a8b17');
  IF r <> 0 THEN RAISE EXCEPTION 'ndis-logo rollback refused: % rows remain (promoted?) — manual review', r; END IF;
END $$;
COMMIT;
