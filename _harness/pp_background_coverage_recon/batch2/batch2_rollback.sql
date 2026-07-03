-- Batch 2 ROLLBACK: delete ONLY the 7 Batch-2 intake-candidate rows (guarded), restoring PP to 4 rows.
-- Refuses to delete any row that is active or approved (i.e. anything promoted since intake).
BEGIN;

DELETE FROM c.client_brand_asset
WHERE asset_id IN ('b2a10001-9c4e-4f7a-8d21-0d5e6f7a8b01',
                     'b2a10002-9c4e-4f7a-8d21-0d5e6f7a8b02',
                     'b2a10003-9c4e-4f7a-8d21-0d5e6f7a8b03',
                     'b2a10004-9c4e-4f7a-8d21-0d5e6f7a8b04',
                     'b2a10005-9c4e-4f7a-8d21-0d5e6f7a8b05',
                     'b2a10006-9c4e-4f7a-8d21-0d5e6f7a8b06',
                     'b2a10007-9c4e-4f7a-8d21-0d5e6f7a8b07')
  AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
  AND asset_meta->>'intake_lane_b2' = 'pp-bg-p0-db-intake-batch2 (2026-07-03)'
  AND is_active IS FALSE
  AND (asset_meta->>'approved')::boolean IS FALSE;

DO $$
DECLARE remaining int; tot int;
BEGIN
  SELECT count(*) INTO remaining FROM c.client_brand_asset
  WHERE asset_meta->>'intake_lane_b2' = 'pp-bg-p0-db-intake-batch2 (2026-07-03)';
  IF remaining <> 0 THEN
    RAISE EXCEPTION 'batch2 rollback verification failed: % lane rows remain (some may be promoted — manual review required)', remaining;
  END IF;
  SELECT count(*) INTO tot FROM c.client_brand_asset WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';
  IF tot <> 4 THEN
    RAISE EXCEPTION 'batch2 rollback verification failed: PP total rows = %, expected 4', tot;
  END IF;
END $$;

COMMIT;
-- NOTE: storage objects uploaded for Batch 2 are NOT deleted by this script (storage deletion is
-- PK-gated and out of scope); after a rollback they become inert ungoverned files pending PK decision.
