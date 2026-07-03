-- =============================================================================
-- LANE 2 — NEEDS-TWEAK FIXES — VISUAL-APPROVAL RECORDING PACKET v1 (2026-07-03)
-- _harness/lane2-visual-approval-recording.sql
--
-- Authority: PK review 2026-07-03 — ALL FOUR units approved + TMR-GOV-TESTIMONIAL-1
--            ratified (docs/briefs/lane2-needs-tweak-fixes-packet.md; before/after
--            gallery _harness/lane2_fix_previews/lane2_before_after_review.html).
-- Evidence:  fix previews + SAVED-template re-smokes PIXEL-IDENTICAL to the
--            approved previews (mean abs diff 0.0 for both edited templates).
--            Template edits PK-paste-saved in Creatomate (no API update endpoint).
--
-- WHAT IT DOES (one transaction, fail-loud):
--   (A) 6 PP assignments 'proposed' → 'visually_approved' (the full Lane-B
--       needs-tweak set: market_insight · testimonial · carousel cover/body/closing
--       · youtube thumbnail), approved_by='PK'.
--   (B) 6 assignment-scoped visual_approval/passed proof events, evidence-cited
--       per unit (testimonial's cites the ratified source-guard rule).
--   (C) Retire the carousel-closing 'Footer' field row (the element no longer
--       exists in the saved template) — registry mirrors template truth.
--   (D) In-transaction ladder assert: PP selectable set == 16 after the flips.
--   Selectable set: 10 → 16 (the ENTIRE 16-template generic library becomes
--   selectable). Nothing reaches client_enabled/production_proven; no publish
--   proof; runtime still consumes none of this (selector dark).
--
-- Pre-state verified live 2026-07-03: exactly 6 target assignments proposed+
-- unapproved; 0 visual_approval proofs on them; closing Footer field row exists
-- (id fdb0f01e-b0fa-4758-bbcb-40ab5f398032 — pre-image in rollback below).
--
-- ⛔ APPLY IS PK-GATED (hash approval). PREPARED, NOT APPLIED.
--
-- ROLLBACK (reference only; point-in-time exact):
--   DELETE FROM c.creative_template_proof_event
--     WHERE recorded_by = 'PK (Lane 2 needs-tweak review 2026-07-03)';        -- expect 6
--   UPDATE c.creative_template_client_assignment
--     SET assignment_status='proposed', approved_by=NULL, approved_at=NULL, updated_at=now()
--     WHERE client_id='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
--       AND assignment_status='visually_approved'
--       AND template_id IN ('0e006c5c-45aa-4829-82ec-89dd282a8c56','757bc319-17cf-4b92-b6fd-2a6ad5a3bab8',
--                           '15ef4676-83ee-4dea-9973-9d50e0b86d3f','fcdf3bb3-bcb3-4f93-a0c4-ead0d3582219',
--                           '756a5b89-c896-4192-a6c8-fe246eab9ca3','7f3e6587-509e-4305-af37-1a3fe3311efa'); -- expect 6
--   INSERT INTO c.creative_provider_template_field
--     (id, template_id, element_id, element_name, element_type, track, dynamic, field_kind,
--      default_value_safe, style_summary, constraints, required_for_render, created_at)
--   VALUES ('fdb0f01e-b0fa-4758-bbcb-40ab5f398032','756a5b89-c896-4192-a6c8-fe246eab9ca3',
--           'Footer','Footer','text','6',true,'text','Footer',NULL,NULL,false,
--           '2026-07-02T12:42:40.43611Z');  -- restores full pre-image incl. original created_at (db-rls-auditor)
-- =============================================================================

BEGIN;

DO $lane2$
DECLARE
  c_client  CONSTANT uuid := '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';  -- property-pulse
  c_marker  CONSTANT text := 'PK (Lane 2 needs-tweak review 2026-07-03)';
  v_n int;
  v_selectable int;
BEGIN
  -- ── pre-asserts ────────────────────────────────────────────────────────────
  SELECT count(*) INTO v_n FROM c.creative_template_client_assignment a
  WHERE a.client_id = c_client AND a.assignment_status = 'proposed' AND a.approved_by IS NULL
    AND a.template_id IN ('0e006c5c-45aa-4829-82ec-89dd282a8c56','757bc319-17cf-4b92-b6fd-2a6ad5a3bab8',
                          '15ef4676-83ee-4dea-9973-9d50e0b86d3f','fcdf3bb3-bcb3-4f93-a0c4-ead0d3582219',
                          '756a5b89-c896-4192-a6c8-fe246eab9ca3','7f3e6587-509e-4305-af37-1a3fe3311efa');
  IF v_n <> 6 THEN RAISE EXCEPTION 'lane2 abort: % target assignments proposed+unapproved (expected 6)', v_n; END IF;

  SELECT count(*) INTO v_n FROM c.creative_template_proof_event p
  WHERE p.recorded_by = c_marker;
  IF v_n <> 0 THEN RAISE EXCEPTION 'lane2 abort: recording marker already used (% rows) — re-run refused', v_n; END IF;

  -- ── (A) 6 flips ────────────────────────────────────────────────────────────
  UPDATE c.creative_template_client_assignment a
  SET assignment_status = 'visually_approved', approved_by = 'PK', approved_at = now(), updated_at = now()
  WHERE a.client_id = c_client AND a.assignment_status = 'proposed' AND a.approved_by IS NULL
    AND a.template_id IN ('0e006c5c-45aa-4829-82ec-89dd282a8c56','757bc319-17cf-4b92-b6fd-2a6ad5a3bab8',
                          '15ef4676-83ee-4dea-9973-9d50e0b86d3f','fcdf3bb3-bcb3-4f93-a0c4-ead0d3582219',
                          '756a5b89-c896-4192-a6c8-fe246eab9ca3','7f3e6587-509e-4305-af37-1a3fe3311efa');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 6 THEN RAISE EXCEPTION 'lane2 abort: flipped % rows, expected 6', v_n; END IF;

  -- ── (B) 6 proof events ─────────────────────────────────────────────────────
  INSERT INTO c.creative_template_proof_event
    (template_id, assignment_id, platform, proof_type, proof_status,
     evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT a.template_id, a.id, m.platform, 'visual_approval', 'passed', m.evidence, 'local_render_file', now(), c_marker
  FROM c.creative_template_client_assignment a
  JOIN (VALUES
    ('0e006c5c-45aa-4829-82ec-89dd282a8c56'::uuid, 'facebook',
     '_harness/lane2_fix_previews/fix_01_market_insight.jpg — location-matched pairing (template unchanged); Lane B original _harness/pp_proof_wall/01_market_insight_1x1.jpg'),
    ('757bc319-17cf-4b92-b6fd-2a6ad5a3bab8'::uuid, 'facebook',
     '_harness/lane2_fix_previews/fix_08_testimonial.jpg — approved under ratified TMR-GOV-TESTIMONIAL-1 source-guard rule (docs/briefs/lane2-needs-tweak-fixes-packet.md §3; source-marked attribution mandatory)'),
    ('15ef4676-83ee-4dea-9973-9d50e0b86d3f'::uuid, 'facebook',
     '_harness/pp_proof_wall/12_carousel_cover_1x1.jpg — approved 2026-07-03 as part of the carousel set (closing-slide fix reviewed in the same sitting)'),
    ('fcdf3bb3-bcb3-4f93-a0c4-ead0d3582219'::uuid, 'facebook',
     '_harness/pp_proof_wall/13_carousel_body_1x1.jpg — approved 2026-07-03 as part of the carousel set'),
    ('756a5b89-c896-4192-a6c8-fe246eab9ca3'::uuid, 'facebook',
     '_harness/lane2_fix_previews/fix_14_carousel_closing.jpg + resmoke_closing.jpg — Footer duplication removed; saved-template re-smoke pixel-identical (mean abs diff 0.0)'),
    ('7f3e6587-509e-4305-af37-1a3fe3311efa'::uuid, 'youtube',
     '_harness/lane2_fix_previews/fix_16_youtube_thumbnail.jpg + resmoke_thumbnail.jpg — EpisodeNumber relocated to y=35% (badge stack); saved-template re-smoke pixel-identical (mean abs diff 0.0); FaceObject stays optional-unfilled')
  ) AS m(template_id, platform, evidence) ON m.template_id = a.template_id
  WHERE a.client_id = c_client AND a.assignment_status = 'visually_approved';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 6 THEN RAISE EXCEPTION 'lane2 abort: % proof rows, expected 6', v_n; END IF;

  -- ── (C) retire the closing Footer field row (template truth changed) ───────
  DELETE FROM c.creative_provider_template_field
  WHERE template_id = '756a5b89-c896-4192-a6c8-fe246eab9ca3' AND element_name = 'Footer';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN RAISE EXCEPTION 'lane2 abort: Footer field-row delete affected % rows, expected 1', v_n; END IF;

  -- ── (D) ladder assert: PP selectable set must be exactly 16 ────────────────
  SELECT count(*) INTO v_selectable
  FROM c.creative_template_client_assignment a
  WHERE a.client_id = c_client
    AND a.assignment_status IN ('visually_approved','client_enabled','production_proven')
    AND a.assignment_scope = 'generic_allowed'
    AND EXISTS (SELECT 1 FROM c.creative_template_proof_event p
                WHERE p.assignment_id = a.id AND p.proof_type='visual_approval' AND p.proof_status='passed');
  IF v_selectable <> 16 THEN
    RAISE EXCEPTION 'lane2 abort: selectable generic set = % after flips (expected 16)', v_selectable;
  END IF;

  RAISE NOTICE 'lane2 recording: 6 flips + 6 proofs + Footer field retired; generic selectable set = 16';
END
$lane2$;

COMMIT;
