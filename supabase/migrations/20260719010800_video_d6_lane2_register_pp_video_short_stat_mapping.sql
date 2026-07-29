-- ============================================================================
-- RECONCILIATION BACKFILL (cc-0087, 2026-07-29): this file was NOT originally
-- committed to git under this name/version. It reproduces exact content that was
-- actually applied LIVE to project mbkmaxqhsohbtwsqolns, sourced from:
--   _harness/video_d6_lane2_20260719/m2_register_pp_video_short_stat_mapping.sql (gitignored harness dir)
-- Any 'NOT APPLIED' / 'PREPARED' / 'DESIGN' framing below is the ORIGINAL packet's
-- pre-apply language, preserved for historical fidelity -- it is STALE; this
-- migration IS live (confirmed against the Supabase migration ledger and, where
-- checked, live pg_get_functiondef/information_schema state). See
-- docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md.
-- ============================================================================

DO $$
DECLARE
  v_template uuid := 'a3d8472d-9438-4312-9f11-b6a920be4014';
  v_client  uuid := '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';  -- PP
  v_assign  uuid;
  v_sel     jsonb;
  v_img     jsonb;
BEGIN
  -- 2a. template → selectable rung (CAS: only from governance_reviewed)
  UPDATE c.creative_provider_template
     SET status = 'visually_approved', updated_at = now()
   WHERE id = v_template AND status = 'governance_reviewed';

  -- 2b. variant candidate: maps video_short_stat → this template (UNIQUE template_id,variant_key)
  INSERT INTO c.creative_template_variant_candidate
    (template_id, format_key, variant_key, fit_status, fit_reason, reviewed_by, reviewed_at)
  VALUES (v_template, 'video_short_stat', 'stat-reveal-9x16-video-v2', 'strong_candidate',
          'D6 Lane 2 — direct-bind variant promoted to spine mapping (baked-bg, logo-only slot)', 'PK', now())
  ON CONFLICT (template_id, variant_key) DO NOTHING;

  -- 2c. Logo dynamic field (bg stays BAKED → NO background field) (UNIQUE template_id,element_name)
  INSERT INTO c.creative_provider_template_field
    (template_id, element_name, field_kind, dynamic, required_for_render, style_summary)
  VALUES (v_template, 'Logo', 'logo', true, true,
          'Governed brand logo — the only governed VISUAL slot (background + accent baked, per D2)')
  ON CONFLICT (template_id, element_name) DO NOTHING;

  -- 2c2. Platform suitability (REQUIRED: select_template filter (c) hard-rejects a non-null platform
  --      with no suitability row — 'candidate' = passing-but-unproven, mirrors the generic image
  --      templates; yields the expected 'platform_suitability_unproven' warning, NOT a reject).
  --      (UNIQUE template_id,platform,placement). 9:16 video → the three social feeds.
  INSERT INTO c.creative_template_platform_suitability
    (template_id, platform, placement, suitability_status, reason)
  VALUES
    (v_template, 'facebook',  'feed', 'candidate', 'D6 Lane 2 — video_short_stat 9x16; visual+audio approved, platform-unproven'),
    (v_template, 'instagram', 'feed', 'candidate', 'D6 Lane 2 — video_short_stat 9x16; visual+audio approved, platform-unproven'),
    (v_template, 'linkedin',  'feed', 'candidate', 'D6 Lane 2 — video_short_stat 9x16; visual+audio approved, platform-unproven')
  ON CONFLICT (template_id, platform, placement) DO NOTHING;

  -- 2d. client assignment (no unique key → guard NOT EXISTS)
  IF NOT EXISTS (SELECT 1 FROM c.creative_template_client_assignment
                 WHERE template_id = v_template AND client_id = v_client) THEN
    INSERT INTO c.creative_template_client_assignment
      (template_id, client_id, assignment_scope, assignment_status, style_guide_reference, approved_by, approved_at)
    VALUES (v_template, v_client, 'client_allowed', 'visually_approved',
            'docs/creative-library/property-pulse.json (video_short_stat)', 'PK', now());
  END IF;
  SELECT id INTO v_assign FROM c.creative_template_client_assignment
   WHERE template_id = v_template AND client_id = v_client;

  -- 2e. visual-approval proof event (reuse 8c41689a + Lane 1 PK PASS; logo parity confirmed)
  IF NOT EXISTS (SELECT 1 FROM c.creative_template_proof_event
                 WHERE assignment_id = v_assign AND proof_type = 'visual_approval' AND proof_status = 'passed') THEN
    INSERT INTO c.creative_template_proof_event
      (template_id, assignment_id, platform, proof_type, proof_status, evidence_reference, evidence_kind, occurred_at, recorded_by)
    VALUES (v_template, v_assign, NULL, 'visual_approval', 'passed',
      'm.post_render_log 8c41689a-582b-4728-a658-76c7eeeb8a65 — governed PP video_short_stat combo-audio render (c11bb8ab, variant stat-reveal-9x16-video-v2, logo PP_logo_2.png == spine first-eligible pp_logo_primary); PK visual+audio PASS, Video D6 Lane 1, 2026-07-19',
      'render_log', '2026-07-19T00:00:00Z'::timestamptz, 'PK');
  END IF;

  -- ── IN-TXN FAIL-CLOSED ASSERTIONS (ROLLBACK on any breach) ─────────────────────────────
  -- (i) exit test: PP video_short_stat now resolves ok with a Logo.source (bg baked)
  v_sel := public.select_template('property-pulse','facebook','video_short_stat',NULL,'lane2-gate');
  IF (v_sel->>'status') IS DISTINCT FROM 'ok'
     OR (v_sel#>>'{slot_resolution,modifications,Logo.source}') IS NULL THEN
    RAISE EXCEPTION 'LANE2 EXIT TEST FAILED: PP video_short_stat not ok/logo-resolved: %', v_sel;
  END IF;
  -- (ii) pool-neutrality / cross-brand: NDIS must NOT resolve this PP-owned client template
  IF (public.select_template('ndis-yarns','facebook','video_short_stat',NULL,'lane2-neutral')->>'status') <> 'fail_closed' THEN
    RAISE EXCEPTION 'LANE2 CROSS-BRAND BLEED: ndis-yarns resolved video_short_stat';
  END IF;
  -- (iii) regression: PP image_quote WINNER unchanged (status AND selected.template_id both pinned)
  v_img := public.select_template('property-pulse','facebook','image_quote',NULL,'lane2-regress');
  IF (v_img->>'status') IS DISTINCT FROM 'ok'
     OR (v_img#>>'{selected,template_id}') IS DISTINCT FROM '0e006c5c-45aa-4829-82ec-89dd282a8c56' THEN
    RAISE EXCEPTION 'LANE2 REGRESSION: PP image_quote winner changed (status/%): %',
      (v_img#>>'{selected,template_id}'), v_img;
  END IF;
END $$;
