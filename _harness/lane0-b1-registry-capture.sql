-- =============================================================================
-- LANE 0 — B1 REGISTRY CAPTURE — EXACT APPLY SQL v1 (2026-07-03)
-- _harness/lane0-b1-registry-capture.sql
--
-- Queue authority: PK-ratified next-work queue item 0 (action_list @ 09986ef);
--                  prerequisite for S1 forward shadow stamping (v4.80 decision 5).
-- Packet:          docs/briefs/lane0-b1-registry-capture-packet.md
--
-- WHAT IT DOES (data-only INSERTs; no DDL, no UPDATE/DELETE, no function change):
--   Captures the LIVE PRODUCTION Property Pulse image_quote template
--   (Creatomate provider_template_id fb9820f8-3fee-4448-b324-3d500fa74b40,
--   implementation news_static_centered_scrim_1x1_v1 — the B1-v2 template that
--   renders PP production posts today) into the TMR registry as a
--   CLIENT-SCOPED, evidence-cited entry:
--     1 family + 1 template + 9 field rows + 1 variant candidate
--     + 2 platform-suitability rows + 1 client assignment + 5 proof events.
--
-- WHY: after capture, shadow comparisons upgrade from the blanket
--   'expected_structural_divergence' (registry doesn't know the template) to a
--   genuine template-level comparison; select_template's rejected[] will name
--   the B1 template with reason 'wrong_scope' instead of it being invisible.
--
-- SELECTION SAFETY (the load-bearing invariant, ASSERTED IN-TRANSACTION):
--   scope='client' ⇒ select_template v0 (generic-only) REJECTS this template
--   with 'wrong_scope' — it can never be selected. After the inserts, this
--   script CALLS public.select_template('property-pulse','facebook','image_quote')
--   and ABORTS THE WHOLE TRANSACTION unless (a) the winner is UNCHANGED
--   (generic_quote_card_1x1_v1) and (b) the B1 template appears in rejected[]
--   with reason_code='wrong_scope'. Capture cannot change selection, provably.
--
-- EVIDENCE BASIS (inventory_status='captured_from_docs' — the provider project
--   holding fb9820f8 is SEPARATE from the generic-library Creatomate project;
--   the local generics API key cannot read it ["No template was found with that
--   ID"], while production rendered with it as recently as 2026-07-02):
--   · vendored implementation: supabase/functions/image-worker/index.ts (+ b1_production.ts)
--     — the 8 modification keys: CategoryBadge/Headline/Subtitle/Location/Date/Footer
--       (.text) + Background/Logo (.source); Scrim is STATIC in this template
--   · declarative registry: docs/creative-library/property-pulse.json (news family)
--   · 17 succeeded production render_specs (m.post_render_log, label=creative_library_b1_production)
--   · publish evidence: 5 distinct B1 drafts published to facebook + 5 to instagram (m.post_publish)
--   · PK approvals on the record: registers v3.98 (B0 proof 50f09ca2) · v4.00 (B1-v1 proof
--     draft 52165857-ba7e…, render_log c3c7489b…, + PK visual approval) · v4.05 (B1-v2
--     rotation+subtitle proofs PK-confirmed)
--
-- STATUS VALUES (recommended; PK ratifies at the apply gate):
--   template.status='production_proven' · family.status='active' ·
--   assignment_status='production_proven' · suitability facebook/instagram=
--   'production_proven' (publish-evidence-backed; NO other platform claimed).
--   These record the template's TRUE, already-earned production status — they
--   grant nothing new and unlock nothing in v0 selection (scope fence above).
--
-- FIXED IDS (deterministic; rollback keys): prefix c0b10001-….
-- ⛔ APPLY IS PK-GATED. PREPARED, NOT APPLIED.
--
-- ROLLBACK (reference only — reverse dependency order; expect counts 5/1/2/1/9/1/1):
--   DELETE FROM c.creative_template_proof_event      WHERE recorded_by='lane0-b1-registry-capture';
--   DELETE FROM c.creative_template_client_assignment WHERE id='c0b10001-0000-4000-8000-000000000004';
--   DELETE FROM c.creative_template_platform_suitability WHERE template_id='c0b10001-0000-4000-8000-000000000002';
--   DELETE FROM c.creative_template_variant_candidate WHERE template_id='c0b10001-0000-4000-8000-000000000002';
--   DELETE FROM c.creative_provider_template_field    WHERE template_id='c0b10001-0000-4000-8000-000000000002';
--   DELETE FROM c.creative_provider_template          WHERE id='c0b10001-0000-4000-8000-000000000002';
--   DELETE FROM c.creative_template_family            WHERE id='c0b10001-0000-4000-8000-000000000001';
-- =============================================================================

BEGIN;

DO $lane0$
DECLARE
  c_family_id   CONSTANT uuid := 'c0b10001-0000-4000-8000-000000000001';
  c_template_id CONSTANT uuid := 'c0b10001-0000-4000-8000-000000000002';
  c_variant_id  CONSTANT uuid := 'c0b10001-0000-4000-8000-000000000003';
  c_assign_id   CONSTANT uuid := 'c0b10001-0000-4000-8000-000000000004';
  c_provider_template_id CONSTANT text := 'fb9820f8-3fee-4448-b324-3d500fa74b40';
  c_marker      CONSTANT text := 'lane0-b1-registry-capture';

  v_client_id uuid;
  v_n integer;
  v_sel jsonb;
BEGIN
  -- ── 0. Preconditions ─────────────────────────────────────────────────────
  SELECT cl.client_id INTO v_client_id FROM c.client cl WHERE cl.client_slug = 'property-pulse';
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'lane0 abort: property-pulse not found';
  END IF;

  SELECT count(*) INTO v_n FROM c.creative_provider_template t
  WHERE t.provider_template_id = c_provider_template_id OR t.id = c_template_id;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'lane0 abort: B1 template already present in the registry (% rows) — re-run refused', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM c.creative_template_family f
  WHERE f.family_key = 'property_pulse.news.centered_scrim_card' OR f.id = c_family_id;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'lane0 abort: family already present (% rows) — re-run refused', v_n;
  END IF;

  -- ── 1. Family (client-scoped) ────────────────────────────────────────────
  INSERT INTO c.creative_template_family
    (id, family_key, family_name, creative_purpose, default_format_candidate,
     default_variant_candidate, scope, industry_vertical, description, status)
  VALUES
    (c_family_id,
     'property_pulse.news.centered_scrim_card',
     'Property Pulse — news centered-scrim card (live production)',
     'Client news/market-update static card: centered scrim panel over a governed background, PP branding.',
     'image_quote',
     'news_card.v1',
     'client',
     'real_estate',
     'Client-scoped family for the LIVE B1 production template (image-worker governed PP image_quote branch). Captured retroactively by lane0 (queue item 0) so shadow comparisons and the registry see the template production actually uses.',
     'active');

  -- ── 2. Template (the live B1 production template) ────────────────────────
  INSERT INTO c.creative_provider_template
    (id, provider, provider_template_id, provider_template_name, family_id,
     scope, client_id, width, height, aspect_ratio, output_type,
     file_type_candidate, provider_project_reference,
     inventory_status, inventory_source, captured_by, captured_at, status)
  VALUES
    (c_template_id,
     'creatomate',
     c_provider_template_id,
     'news_static_centered_scrim_1x1_v1',
     c_family_id,
     'client',
     v_client_id,
     1080, 1080, '1:1', 'static_image',
     'jpg',
     'SEPARATE Creatomate project from the generic TMR library (generics-project API key cannot read this id; production image-worker renders with it — its key/project differ). Provider read unavailable => docs capture.',
     'captured_from_docs',
     'vendored implementation supabase/functions/image-worker/index.ts + b1_production.ts (8 modification keys) · docs/creative-library/property-pulse.json (news family) · 17 succeeded production render_specs (m.post_render_log label=creative_library_b1_production) · registers v3.98/v4.00/v4.05',
     c_marker,
     now(),
     'production_proven');

  -- ── 3. Fields (8 dynamic modifications + 1 static scrim; element_id unknown
  --       — provider not readable; element_name is authoritative from the
  --       vendored implementation) ─────────────────────────────────────────
  INSERT INTO c.creative_provider_template_field
    (template_id, element_id, element_name, element_type, dynamic, field_kind,
     required_for_render, style_summary)
  VALUES
    (c_template_id, NULL, 'CategoryBadge', 'text',  true,  'text',       false, 'category badge (worker sends CategoryBadge.text)'),
    (c_template_id, NULL, 'Headline',      'text',  true,  'text',       true,  'headline — HARD GATE: worker THROWS over 90 chars (assertHeadlineWithinGate)'),
    (c_template_id, NULL, 'Subtitle',      'text',  true,  'text',       false, 'derived from draft_body first paragraph, truncated ≤90 (B1-v2); optional — empty renders'),
    (c_template_id, NULL, 'Location',      'text',  true,  'text',       false, 'location label'),
    (c_template_id, NULL, 'Date',          'text',  true,  'text',       false, 'date label'),
    (c_template_id, NULL, 'Footer',        'text',  true,  'text',       false, 'footer/website label'),
    (c_template_id, NULL, 'Background',    'image', true,  'background', true,  'governed background via resolve_brand_assets; B1-v2 FNV-1a rotation over [perth,brisbane,sydney]; fail-loud if unreachable'),
    (c_template_id, NULL, 'Logo',          'image', true,  'logo',       true,  'governed pp_logo_primary via resolve_brand_assets; fail-loud (NO legacy fallback for PP) — note: required=true here unlike the generics'' registry flag'),
    (c_template_id, NULL, 'Scrim',         'shape', false, 'shape',      false, 'STATIC centered scrim baked into this template (unlike TMR generics where Scrim.opacity is a dynamic modification)');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 9 THEN RAISE EXCEPTION 'lane0 abort: % field rows, expected 9', v_n; END IF;

  -- ── 4. Variant candidate (format bridge; names match the ACI contract) ───
  INSERT INTO c.creative_template_variant_candidate
    (id, template_id, format_key, variant_key, fit_status, fit_reason)
  VALUES
    (c_variant_id, c_template_id, 'image_quote', 'news_card.v1', 'strong_candidate',
     'The LIVE production variant for PP image_quote (ACI contract property_pulse.image_quote.news_card.v1; render_spec variant_key matches). Captured retroactively — fit is production-demonstrated.');

  -- ── 5. Platform suitability (publish-evidence-backed ONLY: fb + ig) ──────
  INSERT INTO c.creative_template_platform_suitability
    (template_id, platform, placement, suitability_status, reason, proof_reference, last_reviewed_at)
  VALUES
    (c_template_id, 'facebook',  'feed', 'production_proven',
     '5 distinct B1-rendered PP drafts PUBLISHED to facebook (live production path, ≤2026-07-02).',
     'm.post_publish ⋈ m.post_render_log(label=creative_library_b1_production); registers v4.00/v4.05', now()),
    (c_template_id, 'instagram', 'feed', 'production_proven',
     '5 distinct B1-rendered PP drafts PUBLISHED to instagram (live production path, ≤2026-07-02).',
     'm.post_publish ⋈ m.post_render_log(label=creative_library_b1_production); registers v4.00/v4.05', now());

  -- ── 6. Client assignment (records the template''s TRUE production status) ─
  INSERT INTO c.creative_template_client_assignment
    (id, template_id, client_id, assignment_scope, assignment_status, approved_by, approved_at)
  VALUES
    (c_assign_id, c_template_id, v_client_id, 'client_allowed', 'production_proven',
     'PK (retrospective capture of live production status — registers v4.00/v4.05; lane0)', now());

  -- ── 7. Proof events (evidence-cited; occurred_at = the recorded event dates)
  INSERT INTO c.creative_template_proof_event
    (template_id, assignment_id, platform, proof_type, proof_status,
     evidence_reference, evidence_kind, occurred_at, recorded_by)
  VALUES
    (c_template_id, c_assign_id, NULL, 'smoke_render', 'passed',
     'm.post_render_log 50f09ca2 (B0 final proof, _smoke/ only) — registers v3.98, commit 4ebec3b',
     'render_log_and_register', '2026-06-25T00:00:00Z', c_marker),
    (c_template_id, c_assign_id, NULL, 'visual_approval', 'passed',
     'B1-v1 proof: post_draft 52165857-ba7e-4a0f-82f0-92fd5f66537e / render_log c3c7489b (succeeded 2026-06-26) — PK visual approval (registers v4.00: logo/badge clear, headline in scrim) + B1-v2 rotation/subtitle proofs PK visually confirmed (registers v4.05)',
     'render_log_and_register', '2026-06-26T04:07:00Z', c_marker),
    (c_template_id, c_assign_id, NULL, 'platform_render', 'passed',
     '17 succeeded production renders, m.post_render_log label=creative_library_b1_production (14 distinct drafts, ≤2026-07-02)',
     'render_log', '2026-07-02T00:15:14Z', c_marker),
    (c_template_id, c_assign_id, 'facebook', 'platform_publish', 'passed',
     '5 distinct B1-rendered PP drafts published to facebook (m.post_publish)',
     'post_publish', '2026-07-02T00:15:14Z', c_marker),
    (c_template_id, c_assign_id, 'instagram', 'platform_publish', 'passed',
     '5 distinct B1-rendered PP drafts published to instagram (m.post_publish)',
     'post_publish', '2026-07-02T00:15:14Z', c_marker);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 5 THEN RAISE EXCEPTION 'lane0 abort: % proof rows, expected 5', v_n; END IF;

  -- ── 8. SELECTION-SAFETY INVARIANT (aborts everything if capture changes selection)
  v_sel := public.select_template('property-pulse', 'facebook', 'image_quote');
  IF (v_sel->'selected'->>'provider_template_name') IS DISTINCT FROM 'generic_quote_card_1x1_v1' THEN
    RAISE EXCEPTION 'lane0 abort: selection changed! winner=% — capture must be selection-neutral',
      v_sel->'selected'->>'provider_template_name';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_sel->'rejected') e
    WHERE e->>'provider_template_name' = 'news_static_centered_scrim_1x1_v1'
      AND e->>'reason_code' = 'wrong_scope'
  ) THEN
    RAISE EXCEPTION 'lane0 abort: B1 template not rejected as wrong_scope in select_template — expected the v0 scope fence';
  END IF;

  RAISE NOTICE 'lane0: B1 template captured (family+template+9 fields+variant+2 suitability+assignment+5 proofs); selection invariant held (winner unchanged, B1 rejected wrong_scope)';
END
$lane0$;

COMMIT;
