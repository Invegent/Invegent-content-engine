-- BACKFILL RECORD — applied 2026-07-20 via execute_sql at a T3 PK gate (apply_migration is
-- harness-deny-listed); recorded post-hoc. Already applied; NOT for replay (the in-txn guard raises
-- if an Invegent assignment already exists on this template).
-- Version > 20260720190000 so the ledger stays monotonic; name is unique.
-- Verified live-matching 2026-07-20 (execute_sql read): the assignment on template 1cfe0f9c is
--   assignment_status=visually_approved · scope=generic_allowed · brand_key=invegent · approved_by=PK,
--   with a linked visual_approval / passed proof · evidence = Creatomate render 3db0351b · recorded_by
--   "PK (cc-0044 CP-D Invegent FB image_quote visual gate 2026-07-20 — PASS)".
-- Applied ONLY after the controlled governed Invegent FB image_quote render PASSED PK's visual gate
--   (render 3db0351b) — a real PK-reviewed render preceded this passed-gate assertion.
--
-- cc-0044 Checkpoint D (INVEGENT) · item 3 (part 2) — quote_card assignment + visual-approval proof.
-- Migration identity: 20260720200000_cc0044_cpd_invegent_quote_card_assignment_and_proof_v1
--
-- Template generic_quote_card_1x1_v1 (1cfe0f9c, scope=generic). Once landed, select_template('invegent',
--   'facebook','image_quote') passes the assignment (visually_approved) + proof (passed visual_approval)
--   rungs; with the logo + a resolvable Background it returns 'ok', and the live B2 close-pass auto-resolves
--   the OPEN suggestion e2f70fcc. Mirrors PP's proven row shape on the same template.
-- Provenance: forward SQL == _harness/cc0044_cpd_invegent_20260720/INV_STAGE_assignment_and_proof_apply.sql.

BEGIN;
DO $$
DECLARE
  v_inv          uuid := '93494a09-cc89-41d1-b364-cb63983063a6';
  v_tid          uuid := '1cfe0f9c-3810-4bf1-8785-083fead4eefe';
  v_evidence_ref text := '_harness/cc0044_cpd_invegent_20260720/renders/invegent_fb_image_quote_proof.png (Creatomate render 3db0351b-9fe7-40b7-92ce-e090bcc117aa)';
  v_recorded_by  text := 'PK (cc-0044 CP-D Invegent FB image_quote visual gate 2026-07-20 — PASS)';
  v_assign_id    uuid;
  v_dup int; v_n int;
BEGIN
  -- Anti-fake guard: refuse to assert a passed gate with unfilled evidence
  IF v_evidence_ref LIKE '%<FILL%' OR v_recorded_by LIKE '%<FILL%' THEN
    RAISE EXCEPTION 'PLACEHOLDER_UNFILLED: fill v_evidence_ref + v_recorded_by from the real PK-approved render before applying';
  END IF;

  -- Idempotency guard: no existing assignment for this (template, client) — table has no unique(template_id,client_id)
  SELECT count(*) INTO v_dup FROM c.creative_template_client_assignment
    WHERE template_id=v_tid AND client_id=v_inv;
  IF v_dup <> 0 THEN RAISE EXCEPTION 'GUARD_FAIL: Invegent already has an assignment on this template, n=%', v_dup; END IF;

  -- (1) Assignment @ visually_approved (mirror PP's proven shape on this template)
  INSERT INTO c.creative_template_client_assignment
    (template_id, client_id, assignment_scope, assignment_status, approved_by, approved_at, brand_key, style_guide_reference)
  VALUES
    (v_tid, v_inv, 'generic_allowed', 'visually_approved', 'PK', now(), 'invegent', NULL)
  RETURNING id INTO v_assign_id;

  -- (2) Passed visual_approval proof linked to the assignment
  INSERT INTO c.creative_template_proof_event
    (template_id, assignment_id, proof_type, proof_status, evidence_kind, evidence_reference,
     platform, placement, recorded_by, occurred_at)
  VALUES
    (v_tid, v_assign_id, 'visual_approval', 'passed', 'local_render_file', v_evidence_ref,
     'facebook', NULL, v_recorded_by, now());

  -- Post-asserts: exactly one visually_approved assignment + one passed visual_approval proof on it
  SELECT count(*) INTO v_n FROM c.creative_template_client_assignment
    WHERE template_id=v_tid AND client_id=v_inv AND assignment_status='visually_approved';
  IF v_n <> 1 THEN RAISE EXCEPTION 'POSTASSERT_FAIL(assignment): expected 1, got %', v_n; END IF;
  SELECT count(*) INTO v_n FROM c.creative_template_proof_event
    WHERE assignment_id=v_assign_id AND proof_type='visual_approval' AND proof_status='passed';
  IF v_n <> 1 THEN RAISE EXCEPTION 'POSTASSERT_FAIL(proof): expected 1, got %', v_n; END IF;

  RAISE NOTICE 'Invegent quote_card assignment=% (visually_approved) + passed visual_approval proof staged', v_assign_id;
END $$;
COMMIT;

-- ROLLBACK (delete the proof then the assignment) — validated before apply. Reverts Invegent to no_assignment.
-- BEGIN;
--   DELETE FROM c.creative_template_proof_event p
--     USING c.creative_template_client_assignment a
--     WHERE p.assignment_id=a.id
--       AND a.template_id='1cfe0f9c-3810-4bf1-8785-083fead4eefe'
--       AND a.client_id='93494a09-cc89-41d1-b364-cb63983063a6';
--   DELETE FROM c.creative_template_client_assignment
--     WHERE template_id='1cfe0f9c-3810-4bf1-8785-083fead4eefe'
--       AND client_id='93494a09-cc89-41d1-b364-cb63983063a6';
-- COMMIT;
