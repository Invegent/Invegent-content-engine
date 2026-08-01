-- =====================================================================
-- B2 Stage 2 — visual-approval promotion, NDIS-Yarns x generic_quote_card_1x1_v1
-- (13-rung graduation ladder, rung 6). ONE candidate, own apply gate.
--
-- Split out of the original combined 3-row packet
-- (supabase/migrations/20260802090000_b2_stage2_visual_approval_promotion_v1.sql,
-- lane/b2-stage2-visual-approval-promotion, commit 7aa3e18) per PK instruction:
-- "prepare separate reviewed Stage-2 promotion packets for approved candidates
-- and stop at their individual apply gates." Same proven assertion pattern
-- (fail-closed WHERE guard, GET-DIAGNOSTICS-in-same-DO-block, whole-table
-- pool-neutrality baseline, single-pooled-call atomicity), scoped to one row.
--
-- PK VERDICT: "three visual are good" (this session, 2026-08-02), on the
-- fresh preview render generated in B2 Stage 1 (2026-08-01):
--   render 3c703230-d93c-4dae-8ea7-bf77678450fe — NDIS-Yarns x quote_card
--   sha256 fde6b894fd9db3fc0d164141c0b93381c869b7851fa5e5b89bd0d8abe028eb5d
--
-- PRODUCTION CONSEQUENCE (verified live by db-rls-auditor on the original
-- combined packet, applies identically here): NDIS-Yarns' current
-- select_template winner for image_quote is Row 5 (generic_market_insight_
-- card_1x1_v1, 0e006c5c-45aa-4829-82ec-89dd282a8c56, already
-- production_proven) — that winner is UNCHANGED by this apply. Row 7 (this
-- candidate) only becomes a newly eligible alternative. No live-winner
-- change for NDIS-Yarns.
--
-- SCOPE — rung 6 ONLY (visual approval). Rungs 7-9 (supervised render,
-- real-draft render, publish proof) are separate future apply gates, NOT
-- authorised here.
--
-- (R) ROLLBACK: see the paired
--   ROLLBACK_20260802110000_b2_stage2_ndis_quote_card_visual_approval_v1.sql
-- =====================================================================

BEGIN;

CREATE TEMP TABLE b2_stage2_ndis_baseline ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM c.creative_template_client_assignment WHERE assignment_status = 'visually_approved') AS baseline_visually_approved_count,
  (SELECT count(*) FROM c.creative_template_proof_event) AS baseline_proof_event_count;

DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_client_assignment
     SET assignment_status = 'visually_approved',
         approved_by = 'PK',
         approved_at = now(),
         updated_at = now()
   WHERE id = 'b2510001-0000-4000-8000-000000000002'
     AND assignment_status = 'proposed';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2 (NDIS): expected exactly 1 row updated for assignment b2510001-...-000000000002 (ndis-yarns x quote_card, status proposed), got %. Row may have already been promoted or moved to a different state — STOP, do not force.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

DO $$
DECLARE v_rows int;
BEGIN
  INSERT INTO c.creative_template_proof_event
    (id, template_id, assignment_id, platform, placement, proof_type, proof_status,
     evidence_reference, evidence_kind, occurred_at, recorded_by)
  VALUES (
    'b2520001-0000-4000-8000-000000000002',
    '1cfe0f9c-3810-4bf1-8785-083fead4eefe',
    'b2510001-0000-4000-8000-000000000002',
    NULL, NULL,
    'visual_approval', 'passed',
    '3c703230-d93c-4dae-8ea7-bf77678450fe',
    'creatomate_render_id_pk_visual_verdict',
    now(),
    'PK visual verdict "three visual are good" 2026-08-02 (direct, this session) on B2 Stage-1 fresh preview render 3c703230-d93c-4dae-8ea7-bf77678450fe (generic_quote_card_1x1_v1, NDIS-Yarns branding, template default placeholder copy — no real editorial content rendered). No live select_template winner change for this client (existing production_proven market_insight_card winner unaffected; this row becomes a new alternative). Rung 6 only; rungs 7-9 are separate future apply gates, NOT authorised here.'
  );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2 (NDIS): proof_event insert did not insert exactly 1 row, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

DO $$
DECLARE v_rows int;
BEGIN
  SELECT count(*) INTO v_rows
  FROM c.creative_template_client_assignment
  WHERE id = 'b2510001-0000-4000-8000-000000000002'
    AND assignment_status = 'visually_approved'
    AND approved_by = 'PK';
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2 (NDIS): post-update target-state assertion failed, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_rows
  FROM c.creative_template_proof_event
  WHERE id = 'b2520001-0000-4000-8000-000000000002';
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2 (NDIS): post-insert target-state assertion failed, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

DO $$
DECLARE
  v_baseline_va int; v_baseline_pe int; v_current_va int; v_current_pe int;
BEGIN
  SELECT baseline_visually_approved_count, baseline_proof_event_count
    INTO v_baseline_va, v_baseline_pe FROM b2_stage2_ndis_baseline;

  SELECT count(*) INTO v_current_va FROM c.creative_template_client_assignment WHERE assignment_status = 'visually_approved';
  SELECT count(*) INTO v_current_pe FROM c.creative_template_proof_event;

  IF v_current_va <> v_baseline_va + 1 THEN
    RAISE EXCEPTION 'B2 Stage-2 (NDIS): pool-neutrality assertion failed — visually_approved count changed by % (expected +1), baseline %, current %.', (v_current_va - v_baseline_va), v_baseline_va, v_current_va
      USING ERRCODE = 'P0001';
  END IF;
  IF v_current_pe <> v_baseline_pe + 1 THEN
    RAISE EXCEPTION 'B2 Stage-2 (NDIS): pool-neutrality assertion failed — proof_event count changed by % (expected +1), baseline %, current %.', (v_current_pe - v_baseline_pe), v_baseline_pe, v_current_pe
      USING ERRCODE = 'P0001';
  END IF;
END $$;

COMMIT;
