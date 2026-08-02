-- =====================================================================
-- ROLLBACK for 20260802100000_d2_pp_legacy_carousel_governance_declaration_v1.sql
-- Deletes the single declaration row by its deterministic ID.
-- Reference only — NOT executed by the paired forward migration.
-- =====================================================================

BEGIN;

DO $$
DECLARE v_rows int;
BEGIN
  DELETE FROM c.client_creative_governance
   WHERE id = 'd2510001-0000-4000-8000-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Rollback: expected exactly 1 row deleted for d2510001-...-000000000001, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

COMMIT;
