-- =====================================================================
-- ROLLBACK for 20260802113000_b2_stage2_invegent_market_insight_visual_approval_v1.sql
--
-- Reverts the Invegent assignment to proposed/NULL, which removes Row 5
-- from select_template selectability and restores Row 7
-- (generic_quote_card_1x1_v1, assignment ecba211b-...) as Invegent's
-- image_quote winner again (Row 7's own production_proven assignment is
-- untouched by either direction of this migration/rollback pair).
--
-- State-guarded (only reverts if still exactly in the forward-applied
-- state) — same fix class as the NDIS/CFW packets.
--
-- POST-ROLLBACK VERIFICATION REQUIRED: re-run select_template for invegent
-- x image_quote and confirm the winner is back to Row 7.
-- =====================================================================

BEGIN;

DO $$
DECLARE v_rows int;
BEGIN
  DELETE FROM c.creative_template_proof_event
   WHERE id = 'b2520001-0000-4000-8000-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Rollback (Invegent): expected exactly 1 proof_event row deleted, got %.', v_rows
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
   WHERE id = 'b2510001-0000-4000-8000-000000000001'
     AND assignment_status = 'visually_approved'
     AND approved_by = 'PK';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Rollback (Invegent): expected exactly 1 row reverted (state guard: visually_approved AND approved_by=PK), got %. Row state has drifted since forward-apply — STOP, do not force.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

COMMIT;
