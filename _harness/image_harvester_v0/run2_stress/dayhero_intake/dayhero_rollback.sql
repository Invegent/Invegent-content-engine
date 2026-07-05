-- Day-hero intake ROLLBACK: delete the single candidate row IF still unpromoted (promotion-guarded).
-- Storage object intentionally NOT deleted (storage deletion is separately PK-gated).
BEGIN;
DELETE FROM c.client_brand_asset
WHERE asset_id = 'b2a10008-9c4e-4f7a-8d21-0d5e6f7a8b08'
  AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
  AND asset_meta->>'intake_lane_dayhero' = 'pp-bg-dayhero-intake (2026-07-05)'
  AND is_active IS FALSE
  AND (asset_meta->>'approved')::boolean IS FALSE;

DO $$
DECLARE remaining int;
BEGIN
  SELECT count(*) INTO remaining FROM c.client_brand_asset WHERE asset_id = 'b2a10008-9c4e-4f7a-8d21-0d5e6f7a8b08';
  IF remaining <> 0 THEN
    RAISE EXCEPTION 'dayhero rollback refused: row exists but is not in unpromoted candidate state (promoted?) — manual review required';
  END IF;
END $$;
COMMIT;
