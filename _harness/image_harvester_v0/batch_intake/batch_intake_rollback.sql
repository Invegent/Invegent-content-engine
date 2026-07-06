-- PP background B3 BATCH INTAKE ROLLBACK: delete the 8 candidate rows IF still unpromoted (guarded).
-- Storage objects intentionally NOT deleted (storage deletion is separately PK-gated).
BEGIN;
DELETE FROM c.client_brand_asset
WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'intake_lane_batch'='pp-bg-b3-batch-intake (2026-07-06)'
  AND is_active IS FALSE AND (asset_meta->>'approved')::boolean IS FALSE;
DO $$
DECLARE remaining int;
BEGIN
  SELECT count(*) INTO remaining FROM c.client_brand_asset
  WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd' AND asset_meta->>'intake_lane_batch'='pp-bg-b3-batch-intake (2026-07-06)';
  IF remaining <> 0 THEN
    RAISE EXCEPTION 'batch-intake rollback refused: % lane rows remain (promoted?) — manual review', remaining; END IF;
END $$;
COMMIT;
