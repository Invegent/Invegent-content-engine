-- Slice B · Migration B (DML) — governed promotion of ONE clip + additive registration of template 46c5c4ac.
-- CONTAINED PROOF posture: new variant fit_status='candidate' (never wins a default/no-intent call);
-- youtube-scoped (clip platform_scope=['youtube']); incumbents untouched. Apply AFTER Migration A (resolver v1.3).
-- Fail-closed: CAS-guarded promotion + in-txn eligibility + pool-neutrality assertions (RAISE → rollback).
-- Rollback: 02_ROLLBACK_promote_and_register_broll_slice_b.sql.

-- ============ PART 1: governed promotion of clip 2d62b04e (CAS-guarded, fail-closed) ============
DO $$
DECLARE
  v_bg_before int;
  v_bg_after  int;
  v_updated   int;
  v_broll_ok  int;
BEGIN
  -- baseline: PP eligible usage='background' pool (must be UNCHANGED by this promotion)
  SELECT count(*) INTO v_bg_before
  FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
    AND asset_meta->>'usage' = 'background'
    AND is_active IS TRUE
    AND (asset_meta->>'approved')::boolean IS TRUE;

  -- CAS-guarded promotion: only flips the fenced broll row with the verified sha256.
  UPDATE c.client_brand_asset
  SET is_active = true,
      asset_meta = asset_meta || jsonb_build_object(
        'approved',               true,
        'approval_status',        'governed',
        'production_use_allowed', true,
        'safe_for_text_overlay',  'needs_scrim',      -- MANDATORY normalisation (was 'needs_gradient_scrim')
        'approved_by',            'PK',
        'approved_at',            to_jsonb(now()),
        'promotion_lane',         'governed-broll-consumption-v1-slice-b',
        'promotion_packet',       'docs/briefs/governed-broll-consumption-v1-slice-b-packet-DRAFT.md'
      ),
      updated_at = now()
  WHERE asset_id = '2d62b04e-c1b5-44df-b382-59cbb991e166'
    AND client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
    AND asset_meta->>'asset_key' = 'broll_pp_au_suburb_aerial'
    AND is_active IS FALSE
    AND (asset_meta->>'approved')::boolean IS FALSE
    AND asset_meta->>'approval_status' = 'intake_candidate'
    AND asset_meta->>'sha256' = '4c89358d842db974c16354c88fb0e920bc2bd81ad24ff5c4ef7222a413da8885';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'SLICE_B_PROMOTE_CAS_FAIL: expected 1 row, updated % (state moved or sha mismatch)', v_updated;
  END IF;

  -- assert the clip is now RESOLVER-ELIGIBLE as a broll_background (mirrors resolve_slot_assets v1.3 gates)
  SELECT count(*) INTO v_broll_ok
  FROM c.client_brand_asset
  WHERE asset_id = '2d62b04e-c1b5-44df-b382-59cbb991e166'
    AND is_active IS TRUE
    AND (asset_meta->>'approved')::boolean IS TRUE
    AND asset_meta->>'approval_status' = 'governed'
    AND (asset_meta->>'production_use_allowed')::boolean IS TRUE
    AND (asset_meta->>'license_type' IS NOT NULL OR asset_meta->>'license' IS NOT NULL)
    AND COALESCE(asset_meta->>'bucket','') = 'brand-assets'
    AND asset_meta->>'safe_for_text_overlay' IN ('true','needs_scrim')
    AND asset_meta->>'usage' = 'broll_background';
  IF v_broll_ok <> 1 THEN
    RAISE EXCEPTION 'SLICE_B_BROLL_NOT_ELIGIBLE: post-promote eligibility count = % (expected 1)', v_broll_ok;
  END IF;

  -- pool-neutrality: the image-background pool must be UNCHANGED (this promotion adds only a broll row)
  SELECT count(*) INTO v_bg_after
  FROM c.client_brand_asset
  WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
    AND asset_meta->>'usage' = 'background'
    AND is_active IS TRUE
    AND (asset_meta->>'approved')::boolean IS TRUE;
  IF v_bg_after <> v_bg_before THEN
    RAISE EXCEPTION 'SLICE_B_POOL_NEUTRALITY_FAIL: background pool changed % -> %', v_bg_before, v_bg_after;
  END IF;
END $$;

-- ============ PART 2: additive registration of template 46c5c4ac (FK order, single PP assignment) ============
DO $$
DECLARE
  v_tid uuid;
  v_aid uuid;
BEGIN
  INSERT INTO c.creative_provider_template
    (provider, provider_template_id, provider_template_name, scope, status, output_type,
     aspect_ratio, width, height, duration_seconds, family_id, file_type_candidate, inventory_status)
  VALUES
    ('creatomate','46c5c4ac-4d35-488c-b57c-44e05d790fb9','AU_generic_national_Suburb_9:16_V1',
     'generic','visually_approved','video','9:16',720,1280,8,
     'c0b10001-0000-4000-8000-000000000001','mp4','captured_from_manual_entry')
  RETURNING id INTO v_tid;

  -- Fields: Background is VIDEO-typed (the anchor of the whole scoped fix); Logo required; text fields for completeness.
  INSERT INTO c.creative_provider_template_field
    (template_id, element_id, element_name, element_type, field_kind, dynamic, track, required_for_render, default_value_safe)
  VALUES
    (v_tid,'Background','Background','video','background', true, '1', true, ''),
    (v_tid, NULL,       'Logo',      NULL,   'logo',       true, NULL, true, NULL),
    (v_tid, NULL,       'StatValue', 'text', 'text',       false,NULL, false,NULL),
    (v_tid, NULL,       'StatLabel', 'text', 'text',       false,NULL, false,NULL),
    (v_tid, NULL,       'ContextLine','text','text',       false,NULL, false,NULL),
    (v_tid, NULL,       'CtaText',   'text', 'text',       false,NULL, false,NULL);

  INSERT INTO c.creative_template_variant_candidate
    (template_id, variant_key, format_key, fit_status, fit_reason, reviewed_by)
  VALUES
    (v_tid,'stat-reveal-9x16-broll-v1','video_short_stat','candidate',
     'Slice B contained proof — B-roll video Background variant; intent-only selection (never default-wins)','PK');

  -- NO platform_suitability row (deliberate containment): select_template evaluates suitability ONLY
  -- when p_platform IS NOT NULL (select_template_v1.sql:204). With zero suitability rows this template
  -- is selectable ONLY at p_platform=null (production signature), where fit_status='candidate' keeps it
  -- BELOW the strong incumbents on a no-intent call, and the intent call selects it. At ANY explicit
  -- platform it is rejected 'platform_unsuitable: no_suitability_row_for_platform' — so it can NEVER
  -- become the sole selectable at youtube (or anywhere). Zero default-win landmine.

  INSERT INTO c.creative_template_client_assignment
    (template_id, client_id, assignment_scope, assignment_status, approved_by, approved_at, style_guide_reference)
  VALUES
    (v_tid,'4036a6b5-b4a3-406e-998d-c2fe14a8bbdd','client_allowed','visually_approved','PK', now(),
     'docs/creative-library/property-pulse.json (video_short_stat)')
  RETURNING id INTO v_aid;

  -- Proof event: the REAL Slice A PK visual gate on THIS template + THIS clip (2026-07-28).
  INSERT INTO c.creative_template_proof_event
    (template_id, assignment_id, proof_type, proof_status, occurred_at, evidence_kind, recorded_by, evidence_reference)
  VALUES
    (v_tid, v_aid, 'visual_approval','passed', now(), 'local_render_file',
     'PK (Slice A visual gate 2026-07-28)',
     '_harness/cc_broll_consumption_sliceA_20260728/renders/slice_a_broll_au_suburb.mp4 sha256 58fd69c13eb34da54c681c02722da65b4e8a06b4e18d3cb48c98c6ee72150882 ; render_id 950a88d9-e747-4033-9d3d-03b4e31aa672');
END $$;
