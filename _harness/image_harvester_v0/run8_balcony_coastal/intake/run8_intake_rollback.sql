-- run8 batch intake ROLLBACK: guarded delete of the 2 unpromoted lane rows; storage objects excluded.
BEGIN;
DELETE FROM c.client_brand_asset WHERE asset_id IN ('b3a20012-9c4e-4f7a-8d21-0d5e6f7a8b12','b3a20013-9c4e-4f7a-8d21-0d5e6f7a8b13') AND client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
  AND asset_meta->>'intake_lane_batch'='pp-bg-balcony-coastal-intake (2026-07-06)' AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$ DECLARE r int; BEGIN
  SELECT count(*) INTO r FROM c.client_brand_asset WHERE asset_id IN ('b3a20012-9c4e-4f7a-8d21-0d5e6f7a8b12','b3a20013-9c4e-4f7a-8d21-0d5e6f7a8b13');
  IF r <> 0 THEN RAISE EXCEPTION 'run8 rollback refused: row remains (promoted?) — manual review'; END IF;
END $$;
COMMIT;
