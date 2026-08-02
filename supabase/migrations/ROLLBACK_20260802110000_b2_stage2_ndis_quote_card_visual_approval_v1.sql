-- =====================================================================
-- ROLLBACK for 20260802110000_b2_stage2_ndis_quote_card_visual_approval_v1.sql
-- State-guarded (only reverts if still exactly in the forward-applied state).
--
-- ATOMICITY: apply as a single pooled call — one mcp__supabase__apply_migration
-- call with this entire script as the `query` parameter, or one un-split
-- `psql -f` run. Never split across multiple tool calls.
-- =====================================================================

BEGIN;

DO $$
DECLARE v_rows int;
BEGIN
  DELETE FROM c.creative_template_proof_event
   WHERE id = 'b2520001-0000-4000-8000-000000000002';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Rollback (NDIS): expected exactly 1 proof_event row deleted, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_client_assignment
     SET assignment_status = 'proposed',
         approved_by = NULL,
         approved_at = NULL,
         updated_at = now()
   WHERE id = 'b2510001-0000-4000-8000-000000000002'
     AND assignment_status = 'visually_approved'
     AND approved_by = 'PK';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Rollback (NDIS): expected exactly 1 row reverted (state guard: visually_approved AND approved_by=PK), got %. Row state has drifted since forward-apply — STOP, do not force.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

COMMIT;
