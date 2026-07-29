-- ============================================================================
-- RECONCILIATION BACKFILL (cc-0087, 2026-07-29): this file was NOT originally
-- committed to git under this name/version. It reproduces exact content that was
-- actually applied LIVE to project mbkmaxqhsohbtwsqolns, sourced from:
--   _harness/video_d6_lane2_20260719/m1_select_template_client_scope_rung.sql (gitignored harness dir)
-- Any 'NOT APPLIED' / 'PREPARED' / 'DESIGN' framing below is the ORIGINAL packet's
-- pre-apply language, preserved for historical fidelity -- it is STALE; this
-- migration IS live (confirmed against the Supabase migration ledger and, where
-- checked, live pg_get_functiondef/information_schema state). See
-- docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.select_template(
  p_client_slug text, p_platform text, p_format text,
  p_variant_intent text DEFAULT NULL::text, p_seed text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_context jsonb; v_client_id uuid;
  v_candidate_count int := 0; v_rejected jsonb := '[]'::jsonb; v_warnings jsonb := '[]'::jsonb;
  v_platform_unproven_warned boolean := false; v_intent_matched boolean := false;
  v_b_intent_strong jsonb := '[]'::jsonb; v_b_intent_other jsonb := '[]'::jsonb;
  v_b_strong jsonb := '[]'::jsonb; v_b_other jsonb := '[]'::jsonb; v_ranked jsonb; v_n int;
  r record; v_reason text; v_detail text;
  v_ps_total int; v_ps_passing int; v_ps_proven int;
  v_assign_id uuid; v_assign_status text; v_assign_approved_by text;
  v_proof_occurred_at timestamptz; v_proof_evidence text;
  v_slot jsonb; v_entry jsonb; v_winner jsonb; v_selected jsonb; v_reasons jsonb;
  v_alts jsonb := '[]'::jsonb; v_alt jsonb; v_rank_reasons jsonb;
BEGIN
  v_context := jsonb_build_object(
    'client_slug', p_client_slug, 'platform', p_platform, 'format', p_format,
    'variant_intent', p_variant_intent, 'seed', p_seed,
    'selectable_definition', 'visually_approved+ AND passed visual_approval proof');

  SELECT cl.client_id INTO v_client_id FROM c.client cl WHERE cl.client_slug = p_client_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','fail_closed','selected',NULL,'slot_resolution',NULL,
      'alternatives','[]'::jsonb,'rejected',v_rejected,'warnings',v_warnings,
      'fail_reason','client_not_found','context',v_context);
  END IF;

  IF p_platform IS NULL THEN
    v_warnings := v_warnings || to_jsonb('platform_input_missing'::text);
  END IF;

  FOR r IN
    SELECT t.id AS template_id, t.provider_template_id, t.provider_template_name,
           t.scope, t.client_id AS owner_client_id, t.status, t.aspect_ratio, t.created_at,
           vc.variant_key, vc.format_key, vc.fit_status
    FROM c.creative_template_variant_candidate vc
    JOIN c.creative_provider_template t ON t.id = vc.template_id
    WHERE vc.format_key = p_format
    ORDER BY t.created_at ASC, t.id ASC, vc.variant_key ASC
  LOOP
    v_candidate_count := v_candidate_count + 1;
    v_reason := NULL; v_detail := NULL; v_slot := NULL;

    -- a. scope: v0 selected generics only. v0.x (A2) ALSO admits a 'client'-scoped template,
    --    but ONLY for the client that OWNS it (t.client_id = caller). 'brand' + any other scope
    --    stay unselectable. Generic behaviour is byte-unchanged.
    IF r.scope = 'generic' THEN
      NULL;  -- selectable (unchanged)
    ELSIF r.scope = 'client' THEN
      IF r.owner_client_id IS DISTINCT FROM v_client_id THEN
        v_reason := 'wrong_scope'; v_detail := 'client_scoped_other_client';
      END IF;
    ELSE
      v_reason := 'wrong_scope'; v_detail := 'scope=' || r.scope;
    END IF;

    IF v_reason IS NULL AND r.status NOT IN
      ('smoke_rendered','visually_approved','platform_safe','client_enabled','production_proven') THEN
      v_reason := 'status_below_smoke'; v_detail := 'status=' || r.status;
    END IF;

    IF v_reason IS NULL AND p_platform IS NOT NULL THEN
      SELECT count(*),
             count(*) FILTER (WHERE s.suitability_status NOT IN ('not_suitable','blocked')),
             count(*) FILTER (WHERE s.suitability_status IN ('platform_safe','production_proven'))
      INTO v_ps_total, v_ps_passing, v_ps_proven
      FROM c.creative_template_platform_suitability s
      WHERE s.template_id = r.template_id AND s.platform = p_platform;
      IF v_ps_total = 0 THEN v_reason := 'platform_unsuitable'; v_detail := 'no_suitability_row_for_platform';
      ELSIF v_ps_passing = 0 THEN v_reason := 'platform_unsuitable'; v_detail := 'suitability_status_negative';
      ELSIF v_ps_proven = 0 THEN
        IF NOT v_platform_unproven_warned THEN
          v_warnings := v_warnings || to_jsonb('platform_suitability_unproven'::text);
          v_platform_unproven_warned := true;
        END IF;
      END IF;
    END IF;

    IF v_reason IS NULL THEN
      SELECT a.id, a.assignment_status, a.approved_by
      INTO v_assign_id, v_assign_status, v_assign_approved_by
      FROM c.creative_template_client_assignment a
      WHERE a.template_id = r.template_id AND a.client_id = v_client_id;
      IF NOT FOUND THEN v_reason := 'no_assignment';
      ELSIF v_assign_status = 'proposed' THEN v_reason := 'assignment_not_approved';
      ELSIF v_assign_status IN ('blocked','deprecated') THEN
        v_reason := 'assignment_blocked'; v_detail := 'assignment_status=' || v_assign_status;
      ELSIF v_assign_status = 'approved' THEN
        v_reason := 'not_visually_proven'; v_detail := 'assignment_approved_but_no_visual_rung';
      ELSIF v_assign_status NOT IN ('visually_approved','client_enabled','production_proven') THEN
        v_reason := 'assignment_not_approved'; v_detail := 'unrecognised_assignment_status=' || v_assign_status;
      END IF;
    END IF;

    IF v_reason IS NULL THEN
      SELECT p.occurred_at, p.evidence_reference INTO v_proof_occurred_at, v_proof_evidence
      FROM c.creative_template_proof_event p
      WHERE p.assignment_id = v_assign_id AND p.proof_type = 'visual_approval' AND p.proof_status = 'passed'
      ORDER BY p.occurred_at DESC NULLS LAST, p.created_at DESC, p.id ASC LIMIT 1;
      IF NOT FOUND THEN v_reason := 'not_visually_proven'; v_detail := 'no_passed_visual_approval_proof_on_assignment'; END IF;
    END IF;

    IF v_reason IS NULL THEN
      v_slot := public.resolve_slot_assets(p_client_slug, p_platform, p_format, r.template_id, p_seed);
      IF (v_slot->>'status') IS DISTINCT FROM 'ok' THEN
        v_reason := 'assets_fail_closed:' || COALESCE(v_slot->>'fail_reason','unknown');
      END IF;
    END IF;

    IF v_reason IS NOT NULL THEN
      v_entry := jsonb_build_object('template_id',r.template_id,'provider_template_name',r.provider_template_name,
        'variant_key',r.variant_key,'reason_code',v_reason);
      IF v_detail IS NOT NULL THEN v_entry := v_entry || jsonb_build_object('detail',v_detail); END IF;
      v_rejected := v_rejected || v_entry;
    ELSE
      v_entry := jsonb_build_object(
        'assignment_id',v_assign_id,'template_id',r.template_id,'provider_template_id',r.provider_template_id,
        'provider_template_name',r.provider_template_name,'variant_key',r.variant_key,'format_key',r.format_key,
        'aspect_ratio',r.aspect_ratio,'assignment_status',v_assign_status,'approved_by',v_assign_approved_by,
        'fit_status',r.fit_status,'proof_occurred_at',v_proof_occurred_at,'proof_evidence',v_proof_evidence,
        'scope',r.scope,
        'intent_match',(p_variant_intent IS NOT NULL AND r.variant_key = p_variant_intent),
        'slot_resolution',v_slot);
      IF p_variant_intent IS NOT NULL AND r.variant_key = p_variant_intent THEN
        v_intent_matched := true;
        IF r.fit_status = 'strong_candidate' THEN v_b_intent_strong := v_b_intent_strong || v_entry;
        ELSE v_b_intent_other := v_b_intent_other || v_entry; END IF;
      ELSIF r.fit_status = 'strong_candidate' THEN v_b_strong := v_b_strong || v_entry;
      ELSE v_b_other := v_b_other || v_entry; END IF;
    END IF;
  END LOOP;

  IF v_candidate_count = 0 THEN
    RETURN jsonb_build_object('status','fail_closed','selected',NULL,'slot_resolution',NULL,
      'alternatives','[]'::jsonb,'rejected',v_rejected,'warnings',v_warnings,
      'fail_reason','format_unmapped','context',v_context);
  END IF;

  v_ranked := v_b_intent_strong || v_b_intent_other || v_b_strong || v_b_other;
  v_n := jsonb_array_length(v_ranked);
  IF v_n = 0 THEN
    RETURN jsonb_build_object('status','fail_closed','selected',NULL,'slot_resolution',NULL,
      'alternatives','[]'::jsonb,'rejected',v_rejected,'warnings',v_warnings,
      'fail_reason','no_selectable_template','context',v_context);
  END IF;

  IF p_variant_intent IS NOT NULL AND NOT v_intent_matched THEN
    v_warnings := v_warnings || to_jsonb('variant_intent_unmatched'::text);
  END IF;

  v_winner := v_ranked -> 0;
  v_reasons := jsonb_build_array(
    'format_match',
    CASE WHEN (v_winner->>'scope') = 'generic' THEN 'generic_scope' ELSE 'client_scope' END,
    CASE WHEN p_platform IS NOT NULL THEN 'platform_declared' ELSE 'platform_skipped_null_input' END,
    'assignment_visually_approved','visual_proof_passed','assets_resolved');
  IF (v_winner->>'intent_match')::boolean THEN v_reasons := v_reasons || to_jsonb('variant_intent_match'::text); END IF;

  v_selected := jsonb_build_object(
    'assignment_id',v_winner->'assignment_id','template_id',v_winner->'template_id',
    'provider_template_id',v_winner->'provider_template_id','provider_template_name',v_winner->'provider_template_name',
    'variant_key',v_winner->'variant_key','format_key',v_winner->'format_key','aspect_ratio',v_winner->'aspect_ratio',
    'assignment_status',v_winner->'assignment_status','approved_by',v_winner->'approved_by',
    'proof',jsonb_build_object('visual_approval','passed','occurred_at',v_winner->'proof_occurred_at',
      'evidence_reference',v_winner->'proof_evidence'),
    'reasons',v_reasons);

  FOR i IN 1 .. v_n - 1 LOOP
    v_alt := v_ranked -> i; v_rank_reasons := '[]'::jsonb;
    IF (v_alt->>'intent_match')::boolean THEN v_rank_reasons := v_rank_reasons || to_jsonb('variant_intent_match'::text); END IF;
    v_rank_reasons := v_rank_reasons || to_jsonb(('fit_' || (v_alt->>'fit_status'))::text);
    v_rank_reasons := v_rank_reasons || to_jsonb('registry_order_tiebreak'::text);
    v_alts := v_alts || jsonb_build_object('template_id',v_alt->'template_id',
      'provider_template_name',v_alt->'provider_template_name','variant_key',v_alt->'variant_key',
      'rank_reasons',v_rank_reasons);
  END LOOP;

  RETURN jsonb_build_object('status','ok','selected',v_selected,'slot_resolution',v_winner->'slot_resolution',
    'alternatives',v_alts,'rejected',v_rejected,'warnings',v_warnings,'fail_reason',NULL,'context',v_context);
END;
$function$;
