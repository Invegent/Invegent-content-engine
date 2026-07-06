-- market-data intake ROLLBACK: guarded delete of the 1 unpromoted lane row; storage object excluded.
BEGIN;
DELETE FROM c.client_brand_asset WHERE asset_id='b3a20011-9c4e-4f7a-8d21-0d5e6f7a8b11' AND client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
  AND asset_meta->>'intake_lane_batch'='pp-bg-mktdata-intake (2026-07-06)' AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$ DECLARE r int; BEGIN
  SELECT count(*) INTO r FROM c.client_brand_asset WHERE asset_id='b3a20011-9c4e-4f7a-8d21-0d5e6f7a8b11';
  IF r <> 0 THEN RAISE EXCEPTION 'mktdata rollback refused: row remains (promoted?) — manual review'; END IF;
END $$;
COMMIT;
