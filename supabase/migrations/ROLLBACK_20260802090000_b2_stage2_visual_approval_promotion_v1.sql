-- =====================================================================
-- ROLLBACK for 20260802090000_b2_stage2_visual_approval_promotion_v1.sql
--
-- Reverts the 3 B2 assignment rows to 'proposed' (approved_by/approved_at
-- NULL) and deletes the 3 proof_event rows this migration inserted, by
-- their deterministic IDs.
--
-- FIXED post-apply-harness-auditor review (AHA-07-1): each UPDATE below now
-- carries a state guard (WHERE ... AND assignment_status = 'visually_approved'
-- AND approved_by = 'PK') so it can only revert a row that is still exactly
-- in the state THIS forward migration left it in. If a later, independent
-- apply has since moved a row further (e.g. to 'client_enabled'/
-- 'production_proven' via rung 7-9 work), the guard excludes it, the
-- rowcount assertion fires 0-vs-1, and the whole rollback aborts with a
-- named exception instead of silently overwriting that later state.
--
-- Reference only — NOT executed by the paired forward migration.
-- =====================================================================

BEGIN;

DO $$
DECLARE v_rows int;
BEGIN
  DELETE FROM c.creative_template_proof_event
   WHERE id = 'b2520001-0000-4000-8000-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Rollback: expected exactly 1 proof_event row deleted for b2520001-...-000000000001, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

DO $$
DECLARE v_rows int;
BEGIN
  DELETE FROM c.creative_template_proof_event
   WHERE id = 'b2520001-0000-4000-8000-000000000002';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Rollback: expected exactly 1 proof_event row deleted for b2520001-...-000000000002, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

DO $$
DECLARE v_rows int;
BEGIN
  DELETE FROM c.creative_template_proof_event
   WHERE id = 'b2520001-0000-4000-8000-000000000003';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Rollback: expected exactly 1 proof_event row deleted for b2520001-...-000000000003, got %.', v_rows
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
    RAISE EXCEPTION 'Rollback: expected exactly 1 row reverted for b2510001-...-000000000001 (state guard: assignment_status=visually_approved AND approved_by=PK), got %. Row state has drifted since forward-apply (likely moved past rung 6 via later work) — STOP, do not force.', v_rows
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
    RAISE EXCEPTION 'Rollback: expected exactly 1 row reverted for b2510001-...-000000000002 (state guard: assignment_status=visually_approved AND approved_by=PK), got %. Row state has drifted since forward-apply (likely moved past rung 6 via later work) — STOP, do not force.', v_rows
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
   WHERE id = 'b2510001-0000-4000-8000-000000000003'
     AND assignment_status = 'visually_approved'
     AND approved_by = 'PK';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Rollback: expected exactly 1 row reverted for b2510001-...-000000000003 (state guard: assignment_status=visually_approved AND approved_by=PK), got %. Row state has drifted since forward-apply (likely moved past rung 6 via later work) — STOP, do not force.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

COMMIT;
