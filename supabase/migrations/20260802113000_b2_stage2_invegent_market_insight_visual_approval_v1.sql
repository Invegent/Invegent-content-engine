-- =====================================================================
-- B2 Stage 2 — visual-approval promotion, Invegent x generic_market_insight_card_1x1_v1
-- (13-rung graduation ladder, rung 6). ONE candidate, own apply gate.
--
-- *** THIS APPLY CHANGES A LIVE PRODUCTION SELECTOR WINNER — READ FULLY ***
--
-- Split out of the original combined 3-row packet
-- (supabase/migrations/20260802090000_b2_stage2_visual_approval_promotion_v1.sql,
-- lane/b2-stage2-visual-approval-promotion, commit 7aa3e18) per PK instruction:
-- "prepare separate reviewed Stage-2 promotion packets for approved candidates
-- and stop at their individual apply gates." Isolated into its OWN packet
-- specifically because of the consequence below — never bundle this row with
-- NDIS/CFW's (which have zero live-winner consequence) again.
--
-- PK VERDICT: "three visual are good" (this session, 2026-08-02), given on
-- the resent visual sitting card v2 which explicitly stated: "Your approval
-- on this card specifically authorises that flip" — referring to the exact
-- consequence below. On the fresh preview render generated in B2 Stage 1
-- (2026-08-01):
--   render 6a41561f-219a-4ec0-8d32-f5db47c1f280 — Invegent x market_insight_card
--   sha256 3836a2f42d70349bfcb36da424f02606811d4d9c47f5f8c0c41baf7cbdcc6705
--
-- *** EXACT PRODUCTION CONSEQUENCE (verified live by db-rls-auditor,
-- confirmed by direct empirical select_template calls, PK-authorised) ***
-- Invegent's CURRENT select_template winner for image_quote is Row 7
-- (generic_quote_card_1x1_v1, 1cfe0f9c-3810-4bf1-8785-083fead4eefe,
-- assignment ecba211b-5217-4790-afe5-a2f98616712f, production_proven) —
-- this is Invegent's real, live, currently-serving image_quote template.
-- Row 5 (this candidate, 0e006c5c-45aa-4829-82ec-89dd282a8c56) and Row 7
-- share an IDENTICAL c.creative_provider_template.created_at (precision
-- note added post-db-rls-auditor review: the tiebreak keys off the
-- TEMPLATE rows' created_at, 2026-07-02 11:12:41.987075+00 for both —
-- NOT the assignment rows', which differ substantially, 2026-07-20 vs
-- 2026-08-01) and have ZERO c.creative_template_selector_policy priority
-- rows, so select_template's tiebreak falls through to raw
-- t.id ASC ordering (t = c.creative_provider_template), which favours
-- Row 5 (0e006c5c < 1cfe0f9c lexicographically).
-- THE INSTANT this migration commits, promoting Row 5 to visually_approved
-- makes it selectable, and select_template's winner for Invegent x
-- {facebook,instagram,linkedin,website} x image_quote FLIPS from Row 7 to
-- Row 5 — with NO further apply step required. This is the row-7-to-row-5
-- live-winner change named in the original B2 seed packet ("the EXPLICIT
-- Invegent live-winner flip accept/reject (row 7->row 5, confined +
-- reversible + before/after evidence attached)"). PK's verdict on the v2
-- sitting card explicitly authorised this exact flip.
--
-- REVERSIBILITY: confined to Invegent only (NDIS/CFW/PP untouched — they
-- either don't hold this assignment or their own tiebreak differs). The
-- paired rollback reverts the assignment to proposed/NULL, which removes
-- Row 5 from selectability again, restoring Row 7 as the winner (Row 7's
-- own production_proven assignment is untouched by either direction).
--
-- SCOPE — rung 6 ONLY (visual approval). Rungs 7-9 are separate future
-- apply gates, NOT authorised here.
--
-- ATOMICITY: this file MUST be applied as a single pooled call — one
-- mcp__supabase__apply_migration call with this entire script as the
-- `query` parameter, or one un-split `psql -f` run. NEVER split the
-- statements below across multiple tool calls or a pooled multi-call
-- channel; BEGIN/COMMIT alone does not guarantee atomicity across a
-- connection-pooled multi-call channel.
--
-- POST-COMMIT MANUAL OPERATOR STEP (NOT enforced by this migration file —
-- there is no in-transaction way to gate on it, since the flip this step
-- verifies has already committed by the time it can run; this is a
-- separate, human-initiated verification + rollback-if-needed action, not
-- an in-file STOP): immediately after commit, re-run
-- select_template('invegent','facebook'|'instagram'|'linkedin'|'website',
-- 'image_quote',NULL,NULL) and confirm the winner is now Row 5
-- (0e006c5c...) as predicted. A mismatch means something about the
-- predicted tiebreak was wrong — treat it as grounds to run the paired
-- rollback, not as a footnote to note and move past.
--
-- (R) ROLLBACK: see the paired
--   ROLLBACK_20260802113000_b2_stage2_invegent_market_insight_visual_approval_v1.sql
-- =====================================================================

BEGIN;

CREATE TEMP TABLE b2_stage2_invegent_baseline ON COMMIT DROP AS
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
   WHERE id = 'b2510001-0000-4000-8000-000000000001'
     AND assignment_status = 'proposed';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2 (Invegent): expected exactly 1 row updated for assignment b2510001-...-000000000001 (invegent x market_insight_card, status proposed), got %. Row may have already been promoted or moved to a different state — STOP, do not force.', v_rows
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
    'b2520001-0000-4000-8000-000000000001',
    '0e006c5c-45aa-4829-82ec-89dd282a8c56',
    'b2510001-0000-4000-8000-000000000001',
    NULL, NULL,
    'visual_approval', 'passed',
    '6a41561f-219a-4ec0-8d32-f5db47c1f280',
    'creatomate_render_id_pk_visual_verdict',
    now(),
    'PK visual verdict "three visual are good" 2026-08-02 (direct, this session), given on the B2 Stage-1 v2 resent sitting card which explicitly stated "Your approval on this card specifically authorises that flip" — PK approval on THIS card authorises the row-7-to-row-5 live select_template winner change for invegent x image_quote (Row 7 generic_quote_card_1x1_v1 1cfe0f9c... -> Row 5 generic_market_insight_card_1x1_v1 0e006c5c..., via identical-created_at template-id tiebreak, zero selector_policy priority rows). Render 6a41561f-219a-4ec0-8d32-f5db47c1f280, template default placeholder copy — no real editorial content rendered. Rung 6 only; rungs 7-9 are separate future apply gates, NOT authorised here.'
  );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2 (Invegent): proof_event insert did not insert exactly 1 row, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

DO $$
DECLARE v_rows int;
BEGIN
  SELECT count(*) INTO v_rows
  FROM c.creative_template_client_assignment
  WHERE id = 'b2510001-0000-4000-8000-000000000001'
    AND assignment_status = 'visually_approved'
    AND approved_by = 'PK';
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2 (Invegent): post-update target-state assertion failed, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_rows
  FROM c.creative_template_proof_event
  WHERE id = 'b2520001-0000-4000-8000-000000000001';
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'B2 Stage-2 (Invegent): post-insert target-state assertion failed, got %.', v_rows
      USING ERRCODE = 'P0001';
  END IF;
END $$;

DO $$
DECLARE
  v_baseline_va int; v_baseline_pe int; v_current_va int; v_current_pe int;
BEGIN
  SELECT baseline_visually_approved_count, baseline_proof_event_count
    INTO v_baseline_va, v_baseline_pe FROM b2_stage2_invegent_baseline;

  SELECT count(*) INTO v_current_va FROM c.creative_template_client_assignment WHERE assignment_status = 'visually_approved';
  SELECT count(*) INTO v_current_pe FROM c.creative_template_proof_event;

  IF v_current_va <> v_baseline_va + 1 THEN
    RAISE EXCEPTION 'B2 Stage-2 (Invegent): pool-neutrality assertion failed — visually_approved count changed by % (expected +1), baseline %, current %.', (v_current_va - v_baseline_va), v_baseline_va, v_current_va
      USING ERRCODE = 'P0001';
  END IF;
  IF v_current_pe <> v_baseline_pe + 1 THEN
    RAISE EXCEPTION 'B2 Stage-2 (Invegent): pool-neutrality assertion failed — proof_event count changed by % (expected +1), baseline %, current %.', (v_current_pe - v_baseline_pe), v_baseline_pe, v_current_pe
      USING ERRCODE = 'P0001';
  END IF;
END $$;

COMMIT;
