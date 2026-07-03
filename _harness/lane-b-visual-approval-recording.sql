-- Lane B — PP Proof Wall — VISUAL-APPROVAL RECORDING PACKET v1 (2026-07-03)
-- Records PK's 2026-07-03 gallery decisions for the 10 APPROVED units ONLY.
-- Packet doc: docs/briefs/template-selection-v0-lane-b-recording-packet.md
-- ⛔ DO NOT APPLY until PK approves this file's exact hash.
--
-- Effect: 10 PP assignments 'proposed' → 'visually_approved' (Gate-1 decision 2: PK batch
-- approval + visual approval captured from the SAME gallery sitting — ladder L3+L4) and
-- 10 matching visual_approval/passed proof events (assignment-scoped, evidence = the
-- reviewed render file). NEEDS-TWEAK units (market_insight, testimonial, carousel×3,
-- youtube_thumbnail) are NOT touched — they stay 'proposed'/non-selectable. Zero rejects.
-- Selectable set (visually_approved+ AND passed visual proof): 0 → 10.
-- No publish · no runtime caller · no dashboard change · no Format Mix claim · no production
-- enablement (client_enabled/production_proven NOT granted) · template rows untouched
-- (template.status stays smoke_rendered — visual approval is per PP-assignment, not generic).
-- Single DO block = single transaction; exact row-count assertions; re-run = clean abort
-- (status guard matches 0 on second run).

DO $$
DECLARE
  n integer;
BEGIN
  -- ── A. 10 approved assignments: proposed → visually_approved ──────────────────────────
  UPDATE c.creative_template_client_assignment a
  SET assignment_status = 'visually_approved',
      approved_by = 'PK',
      approved_at = now(),
      updated_at  = now()
  WHERE a.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'          -- property-pulse
    AND a.assignment_status = 'proposed'
    AND a.approved_by IS NULL
    AND a.template_id IN (
      '2279bf1c-802d-405c-aa5f-7dd70fd3640b',  -- Unit 2  auction_snapshot
      'fb8a4a9b-904e-4a50-8ade-873aff4a53ae',  -- Unit 3  announcement
      '1cfe0f9c-3810-4bf1-8785-083fead4eefe',  -- Unit 4  quote_card        (content-governance note recorded in packet)
      'eed3977c-294b-4bbc-b9f1-e8d7a2239a1f',  -- Unit 5  stat_hero         (logo-transparency carry)
      'b3895039-e4a2-4eba-8fb4-e49f41659fb4',  -- Unit 6  listicle
      '890e45b7-8417-419c-8aaa-b98f7d0ffc5f',  -- Unit 7  before_after      (logo-transparency carry)
      'f13cb6f5-89cb-4e63-8c00-b75a89bcaecd',  -- Unit 9  news_summary
      '59c8bc3c-2aab-48a1-8a3d-3184db9f4c99',  -- Unit 10 portrait_feed
      '1bfbb6d2-91e0-49c5-b2d6-8d44d5f0537b',  -- Unit 11 linkedin_landscape
      '85550f09-1f28-491e-a1ea-18555821f142'   -- Unit 13 story_static
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 10 THEN
    RAISE EXCEPTION 'assignment approval updated % rows, expected exactly 10 — aborting', n;
  END IF;

  -- ── B. 10 visual_approval/passed proof events (one per approved assignment) ───────────
  INSERT INTO c.creative_template_proof_event
    (template_id, assignment_id, platform, proof_type, proof_status,
     evidence_reference, evidence_kind, occurred_at, recorded_by)
  SELECT a.template_id, a.id, m.platform, 'visual_approval', 'passed',
         m.evidence, 'local_render_file', now(),
         'PK (Lane B proof wall review 2026-07-03)'
  FROM c.creative_template_client_assignment a
  JOIN (VALUES
    ('2279bf1c-802d-405c-aa5f-7dd70fd3640b'::uuid, 'facebook',  '_harness/pp_proof_wall/02_auction_snapshot_1x1.jpg'),
    ('fb8a4a9b-904e-4a50-8ade-873aff4a53ae'::uuid, 'facebook',  '_harness/pp_proof_wall/03_announcement_1x1.jpg'),
    ('1cfe0f9c-3810-4bf1-8785-083fead4eefe'::uuid, 'facebook',  '_harness/pp_proof_wall/04_quote_card_1x1.jpg'),
    ('eed3977c-294b-4bbc-b9f1-e8d7a2239a1f'::uuid, 'facebook',  '_harness/pp_proof_wall/05_stat_hero_1x1.jpg'),
    ('b3895039-e4a2-4eba-8fb4-e49f41659fb4'::uuid, 'facebook',  '_harness/pp_proof_wall/06_listicle_1x1.jpg'),
    ('890e45b7-8417-419c-8aaa-b98f7d0ffc5f'::uuid, 'facebook',  '_harness/pp_proof_wall/07_before_after_1x1.jpg'),
    ('f13cb6f5-89cb-4e63-8c00-b75a89bcaecd'::uuid, 'facebook',  '_harness/pp_proof_wall/09_news_summary_1x1.jpg'),
    ('59c8bc3c-2aab-48a1-8a3d-3184db9f4c99'::uuid, 'instagram', '_harness/pp_proof_wall/10_portrait_feed_4x5.jpg'),
    ('1bfbb6d2-91e0-49c5-b2d6-8d44d5f0537b'::uuid, 'linkedin',  '_harness/pp_proof_wall/11_linkedin_landscape.jpg'),
    ('85550f09-1f28-491e-a1ea-18555821f142'::uuid, 'instagram', '_harness/pp_proof_wall/15_story_static_9x16.jpg')
  ) AS m(template_id, platform, evidence)
    ON m.template_id = a.template_id
  WHERE a.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
    AND a.assignment_status = 'visually_approved';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 10 THEN
    RAISE EXCEPTION 'proof INSERT created % rows, expected exactly 10 — aborting', n;
  END IF;
END
$$;

-- ============================================================================
-- ROLLBACK (reference only — run only if reversal required):
--
-- DELETE FROM c.creative_template_proof_event
-- WHERE proof_type = 'visual_approval'
--   AND recorded_by = 'PK (Lane B proof wall review 2026-07-03)';   -- expect 10
--
-- UPDATE c.creative_template_client_assignment
-- SET assignment_status = 'proposed', approved_by = NULL, approved_at = NULL, updated_at = now()
-- WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
--   AND assignment_status = 'visually_approved';                    -- expect 10
-- ============================================================================
