-- B3M4 intake ROLLBACK: guarded delete of the 2 unpromoted lane rows; storage objects excluded (separate gate).
BEGIN;
DELETE FROM c.client_brand_asset WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'intake_lane_batch'='pp-bg-b3m4-intake (2026-07-06)'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$ DECLARE r int; BEGIN
  SELECT count(*) INTO r FROM c.client_brand_asset WHERE asset_id IN ('b3a20009-9c4e-4f7a-8d21-0d5e6f7a8b09','b3a20010-9c4e-4f7a-8d21-0d5e6f7a8b10');
  IF r <> 0 THEN RAISE EXCEPTION 'b3m4 rollback refused: % lane rows remain (promoted?) — manual review', r; END IF;
END $$;
COMMIT;
