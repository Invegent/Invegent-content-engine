-- =====================================================================
-- B2 Stage 2 — visual-approval promotion (13-rung graduation ladder, rung 6)
--
-- Promotes the 3 B2 Stage-1 dark 'proposed' assignment rows to
-- 'visually_approved' and records the PK visual-approval proof event that
-- rung 6 requires (docs/briefs/results/creatomate-registry-integrity-
-- graduation-contract-v1.md §4, rung 6: "a c.creative_template_proof_event
-- row, proof_type='visual_approval', proof_status='passed', with a concrete
-- evidence reference, attached to the SPECIFIC client assignment being
-- graduated").
--
-- PK VERDICT (this session, 2026-08-02): "all 3 cards are visually passed"
-- — on the fresh preview renders generated in B2 Stage 1 (2026-08-01):
--   render 6a41561f-219a-4ec0-8d32-f5db47c1f280 — Invegent x market_insight_card
--   render 3c703230-d93c-4dae-8ea7-bf77678450fe — NDIS-Yarns x quote_card
--   render 605e602f-00ed-4fd0-aeb7-13e04dcf24ae — Care for Welfare x quote_card
-- Full render provenance (request body, sha256, byte counts) recorded in
-- docs/briefs/b2-stage2-visual-approval-promotion-apply-packet-v1.md.
--
-- SCOPE — rung 6 ONLY. This does NOT perform rung 7 (supervised real
-- render), rung 8 (real-draft render), or rung 9 (publish proof) — those
-- are named as SEPARATE apply gates in the governing seed packet ("apply
-- gates separate, then real render->draft->publish proof events up the
-- 13-rung ladder") and are NOT authorised by this apply.
--
-- Each UPDATE and its rowcount assertion live in the SAME DO block (per the
-- known FOUND/ROW_COUNT-does-not-cross-statements defect class named in
-- creatomate-registry-integrity-graduation-contract-v1.md §3.5 finding 1).
-- WHERE assignment_status='proposed' on every UPDATE — fail-closed if state
-- has drifted since B2 Stage 1 (shared DB, concurrent sessions confirmed
-- active this session).
--
-- ATOMICITY: this file MUST be applied as a single pooled call (one
-- `apply_migration` call, or one un-split `psql -f` / `execute_sql` run) —
-- never split across multiple calls. BEGIN/COMMIT alone does not guarantee
-- atomicity across a connection-pooled multi-call channel.
--
-- (R) ROLLBACK (reference only — see the paired
--   ROLLBACK_20260802090000_b2_stage2_visual_approval_promotion_v1.sql):
--   reverts all 3 assignment rows to 'proposed'/NULL approval fields and
--   deletes the 3 proof_event rows by their deterministic IDs.
-- =====================================================================

BEGIN;

-- ---- Baseline snapshot (whole-table counts, for the real pool-neutrality
-- ---- assertion below — not just target-state achievement) ----
CREATE TEMP TABLE b2_stage2_baseline ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM c.creative_template_client_assignment WHERE assignment_status = 'visually_approved') AS baseline_visually_approved_count,
  (SELECT count(*) FROM c.creative_template_proof_event) AS baseline_proof_event_count;

-- ---- Row 1: Invegent x generic_market_insight_card_1x1_v1 ----
DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_client_assignment
     SET assignment_status = 'visually_approved',
         approved_by = 'PK',
         approved_at = now(),
         updated_at = now()
   WHERE id = 'b2510001-0000-4000-8000-000000000001'
     AND assignment_status = 'proposed';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2: expected exactly 1 row updated for assignment b2510001-...-000000000001 (invegent x market_insight_card, status proposed), got %. Row may have already been promoted or moved to a different state since B2 Stage 1 — STOP, do not force.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

-- ---- Row 2: NDIS-Yarns x generic_quote_card_1x1_v1 ----
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
    RAISE EXCEPTION 'B2 Stage-2: expected exactly 1 row updated for assignment b2510001-...-000000000002 (ndis-yarns x quote_card, status proposed), got %. STOP, do not force.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

-- ---- Row 3: Care for Welfare x generic_quote_card_1x1_v1 ----
DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_client_assignment
     SET assignment_status = 'visually_approved',
         approved_by = 'PK',
         approved_at = now(),
         updated_at = now()
   WHERE id = 'b2510001-0000-4000-8000-000000000003'
     AND assignment_status = 'proposed';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2: expected exactly 1 row updated for assignment b2510001-...-000000000003 (care-for-welfare-pty-ltd x quote_card, status proposed), got %. STOP, do not force.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

-- ---- Proof event 1: Invegent x market_insight_card ----
DO $$
DECLARE v_rows int;
BEGIN
  INSERT INTO c.creative_template_proof_event
    (id, template_id, assignment_id, platform, placement, proof_type, proof_status,
     evidence_reference, evidence_kind, occurred_at, recorded_by)
  VALUES (
    'b2520001-0000-4000-8000-000000000001',
    '0e006c5c-45aa-4829-82ec-89dd282a8c56',
    'b2510001-0000-4000-8000-000000000001',
    NULL, NULL,
    'visual_approval', 'passed',
    '6a41561f-219a-4ec0-8d32-f5db47c1f280',
    'creatomate_render_id_pk_visual_verdict',
    now(),
    'PK visual verdict "all 3 cards are visually passed" 2026-08-02 (direct, this session) on B2 Stage-1 fresh preview render 6a41561f-219a-4ec0-8d32-f5db47c1f280 (generic_market_insight_card_1x1_v1, Invegent branding, template default placeholder copy — no real editorial content rendered). Rung 6 only; rungs 7-9 (supervised render / real draft / publish) are separate future apply gates, NOT authorised here.'
  );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2: proof_event insert for assignment b2510001-...-000000000001 did not insert exactly 1 row, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

-- ---- Proof event 2: NDIS-Yarns x quote_card ----
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
    'PK visual verdict "all 3 cards are visually passed" 2026-08-02 (direct, this session) on B2 Stage-1 fresh preview render 3c703230-d93c-4dae-8ea7-bf77678450fe (generic_quote_card_1x1_v1, NDIS-Yarns branding, template default placeholder copy — no real editorial content rendered). Rung 6 only; rungs 7-9 (supervised render / real draft / publish) are separate future apply gates, NOT authorised here.'
  );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2: proof_event insert for assignment b2510001-...-000000000002 did not insert exactly 1 row, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

-- ---- Proof event 3: Care for Welfare x quote_card ----
DO $$
DECLARE v_rows int;
BEGIN
  INSERT INTO c.creative_template_proof_event
    (id, template_id, assignment_id, platform, placement, proof_type, proof_status,
     evidence_reference, evidence_kind, occurred_at, recorded_by)
  VALUES (
    'b2520001-0000-4000-8000-000000000003',
    '1cfe0f9c-3810-4bf1-8785-083fead4eefe',
    'b2510001-0000-4000-8000-000000000003',
    NULL, NULL,
    'visual_approval', 'passed',
    '605e602f-00ed-4fd0-aeb7-13e04dcf24ae',
    'creatomate_render_id_pk_visual_verdict',
    now(),
    'PK visual verdict "all 3 cards are visually passed" 2026-08-02 (direct, this session) on B2 Stage-1 fresh preview render 605e602f-00ed-4fd0-aeb7-13e04dcf24ae (generic_quote_card_1x1_v1, Care for Welfare branding, template default placeholder copy — no real editorial content rendered). Rung 6 only; rungs 7-9 (supervised render / real draft / publish) are separate future apply gates, NOT authorised here.'
  );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2: proof_event insert for assignment b2510001-...-000000000003 did not insert exactly 1 row, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

-- ---- Target-state assertion: exactly the 3 target rows reached the expected end-state ----
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM c.creative_template_client_assignment
  WHERE assignment_status = 'visually_approved'
    AND id IN ('b2510001-0000-4000-8000-000000000001',
               'b2510001-0000-4000-8000-000000000002',
               'b2510001-0000-4000-8000-000000000003')
    AND approved_by = 'PK';
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'B2 Stage-2: post-update assertion failed — expected exactly 3 rows visually_approved+approved_by=PK among the 3 target IDs, got %.', v_count
      USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_count
  FROM c.creative_template_proof_event
  WHERE id IN ('b2520001-0000-4000-8000-000000000001',
               'b2520001-0000-4000-8000-000000000002',
               'b2520001-0000-4000-8000-000000000003');
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'B2 Stage-2: post-insert assertion failed — expected exactly 3 proof_event rows, got %.', v_count
      USING ERRCODE = 'P0001';
  END IF;
END $$;

-- ---- REAL pool-neutrality assertion (AHA-06-1 fix): whole-table counts vs.
-- ---- the baseline snapshot taken at the top of this transaction — proves
-- ---- nothing OTHER than these 3 rows changed either table's population of
-- ---- visually_approved assignments / proof events. ----
DO $$
DECLARE
  v_baseline_va  int;
  v_baseline_pe  int;
  v_current_va   int;
  v_current_pe   int;
BEGIN
  SELECT baseline_visually_approved_count, baseline_proof_event_count
    INTO v_baseline_va, v_baseline_pe
  FROM b2_stage2_baseline;

  SELECT count(*) INTO v_current_va
  FROM c.creative_template_client_assignment
  WHERE assignment_status = 'visually_approved';

  SELECT count(*) INTO v_current_pe
  FROM c.creative_template_proof_event;

  IF v_current_va <> v_baseline_va + 3 THEN
    RAISE EXCEPTION 'B2 Stage-2: pool-neutrality assertion failed — visually_approved assignment count changed by % (expected exactly +3, baseline %, current %). Something outside the 3 target rows moved into/out of visually_approved during this transaction — STOP.', (v_current_va - v_baseline_va), v_baseline_va, v_current_va
      USING ERRCODE = 'P0001';
  END IF;

  IF v_current_pe <> v_baseline_pe + 3 THEN
    RAISE EXCEPTION 'B2 Stage-2: pool-neutrality assertion failed — proof_event row count changed by % (expected exactly +3, baseline %, current %). Something outside this packet inserted/deleted proof_event rows concurrently — STOP.', (v_current_pe - v_baseline_pe), v_baseline_pe, v_current_pe
      USING ERRCODE = 'P0001';
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- ROLLBACK (reference only — NOT executed by this migration; see the paired
-- file ROLLBACK_20260802090000_b2_stage2_visual_approval_promotion_v1.sql):
-- reverts the 3 assignment rows to 'proposed'/NULL and deletes the 3
-- proof_event rows by their deterministic IDs.
-- =====================================================================
