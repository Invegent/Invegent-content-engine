-- Migration: create_select_template_v1
-- Template Selection v0 Lane C — public.select_template (read-only TMR template selector RPC)
--
-- Design:  docs/briefs/template-selection-v0-design-packet.md
--          (§3 lifecycle ladder L0–L5 · §4 decision chain — PK-ratified at Gate 1)
-- Mirror:  supabase/migrations/20260703002813_create_resolve_slot_assets_v1.sql
--          (posture precedent: SECDEF/STABLE/search_path=''/service-role-only/fail-closed)
--
-- WHAT IT DOES
--   Given (client_slug, platform, format, optional variant_intent, optional seed) it answers:
--   WHICH approved AND visually proven TMR template assignment ICE would use — or FAILS
--   CLOSED with per-candidate, machine-readable reason codes. This is the TMR brain between
--   the Format Advisor (upstream: decides *format*) and Asset Selection Slice-1
--   (public.resolve_slot_assets, downstream: fills the chosen template's slots — composed
--   here, so callers get template pick + slot modifications + all reasons in ONE call).
--   Every candidate is evaluated and every rejection carries a reason_code (day-one
--   explainability contract — the future "why picked / why not" views consume this).
--
-- DECISION CHAIN (design packet §4; FIRST failing filter = the candidate's reason_code)
--   0. client lookup (c.client by client_slug; PK column client_id)
--        miss ⇒ fail_closed 'client_not_found'
--   1. candidate set = templates whose c.creative_template_variant_candidate.format_key
--      = p_format;  empty ⇒ fail_closed 'format_unmapped' (never guess a template class)
--   2. per candidate, in order:
--        a. scope = 'generic'                        else 'wrong_scope' (v0 selects generics only)
--        b. status ≥ smoke_rendered                  else 'status_below_smoke'
--        c. platform suitability row exists and is non-negative
--                                                    else 'platform_unsuitable'
--           (rows below platform_safe/production_proven pass ONLY with the visible warning
--            'platform_suitability_unproven', once per call — claims never launder into proof)
--        d. client assignment visually_approved+     else 'no_assignment' /
--                                                    'assignment_not_approved' (proposed) /
--                                                    'assignment_blocked' (blocked|deprecated) /
--                                                    'not_visually_proven' (approved = pre-visual rung)
--        e. visual proof: a c.creative_template_proof_event row with assignment_id = that
--           assignment, proof_type='visual_approval', proof_status='passed'
--                                                    else 'not_visually_proven'
--        f. public.resolve_slot_assets(client, platform, format, template, seed) = ok
--                                                    else 'assets_fail_closed:<echoed fail_reason>'
--           (only called for candidates that survived a–e; ≤16 templates, each call cheap)
--   3. rank survivors: (i) exact variant_key = p_variant_intent first (RANKER, not a filter
--      — PK Gate-1 decision 5: it can reorder survivors, never empty the set);
--      (ii) fit_status 'strong_candidate' before others; (iii) template created_at ASC,
--      id ASC. Zero survivors from a NON-empty candidate set ⇒ fail_closed
--      'no_selectable_template' with rejected[] fully populated (the "why not" payload).
--
-- CONTRACT NOTES / NON-CLAIMS
--   · NO template-level seed rotation in v0: p_seed passes through UNCHANGED to
--     resolve_slot_assets for BACKGROUND rotation only. Same inputs (any seed) ⇒ same
--     template, always; the seed may only vary the winner's slot_resolution background.
--   · p_variant_intent matching no survivor ⇒ warning 'variant_intent_unmatched' (once) and
--     the same winner as the no-intent call.
--   · suitability_status normalization: the live CHECK vocabulary is
--     (unknown|candidate|not_suitable|needs_review|platform_safe|production_proven|blocked)
--     — NOT the draft's ('unsuitable','failed','rejected'). Negative here =
--     ('not_suitable','blocked') ⇒ reject 'platform_unsuitable'. A template passes silently
--     only on ('platform_safe','production_proven'); anything else passes WITH the
--     'platform_suitability_unproven' warning.
--   · NULL p_platform never silently defeats the platform fence: no platform rejection is
--     possible (permissive), but the call carries warning 'platform_input_missing' once per
--     call (same doctrine as resolve_slot_assets), and the winner's reasons[] carry
--     'platform_skipped_null_input' instead of 'platform_declared' (no false claim).
--   · The selectable set may honestly be EMPTY at launch (design packet R1): calls
--     fail-close with reasons until the proof-wall lane lands visual_approval proofs.
--   · This RPC claims NOTHING above L5: no platform_safe / client_enabled /
--     production_proven promotion, no render, no publish, no production wiring, no write of
--     any kind. Ships dark (no production consumer).
--
-- SECURITY POSTURE (copied from public.resolve_slot_assets)
--   SECURITY DEFINER · STABLE (read-only, no writes) · SET search_path = '' with ALL
--   references schema-qualified · no dynamic SQL · EXECUTE revoked from PUBLIC, anon,
--   authenticated and granted to service_role only. Policy failures NEVER raise — they are
--   fail_closed returns; only genuine errors may raise.
--
-- ⛔ APPLY IS PK-GATED. This file is PREPARED, NOT APPLIED. Do not run it without explicit
--    PK apply approval. Ships dark: no production consumer, no worker/runtime change.
--
-- ROLLBACK (reference only — NOT executed by this migration):
--   DROP FUNCTION IF EXISTS public.select_template(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.select_template(
  p_client_slug    text,
  p_platform       text,
  p_format         text,
  p_variant_intent text DEFAULT NULL,
  p_seed           text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_context   jsonb;
  v_client_id uuid;

  v_candidate_count int   := 0;
  v_rejected        jsonb := '[]'::jsonb;
  v_warnings        jsonb := '[]'::jsonb;
  v_platform_unproven_warned boolean := false;
  v_intent_matched           boolean := false;

  -- Survivor rank buckets. The candidate loop scans in (t.created_at ASC, t.id ASC) order,
  -- so each bucket is ALREADY in tiebreak order; ranked list = intent-match buckets first,
  -- then strong_candidate before others (§4 rank rule i–iii).
  v_b_intent_strong jsonb := '[]'::jsonb;
  v_b_intent_other  jsonb := '[]'::jsonb;
  v_b_strong        jsonb := '[]'::jsonb;
  v_b_other         jsonb := '[]'::jsonb;
  v_ranked          jsonb;
  v_n               int;

  r        record;
  v_reason text;
  v_detail text;

  v_ps_total   int;
  v_ps_passing int;
  v_ps_proven  int;

  v_assign_id          uuid;
  v_assign_status      text;
  v_assign_approved_by text;

  v_proof_occurred_at timestamptz;
  v_proof_evidence    text;

  v_slot         jsonb;   -- winner-candidate's resolve_slot_assets payload (kept, not re-called)
  v_entry        jsonb;
  v_winner       jsonb;
  v_selected     jsonb;
  v_reasons      jsonb;
  v_alts         jsonb := '[]'::jsonb;
  v_alt          jsonb;
  v_rank_reasons jsonb;
BEGIN
  v_context := jsonb_build_object(
    'client_slug',    p_client_slug,
    'platform',       p_platform,
    'format',         p_format,
    'variant_intent', p_variant_intent,
    -- p_seed is NOT used for template rotation in v0 — it passes through to
    -- resolve_slot_assets for background rotation only.
    'seed',           p_seed,
    'selectable_definition', 'visually_approved+ AND passed visual_approval proof'
  );

  -- ── 0. Client lookup (c.client PK column is client_id) ────────────────────────────────
  SELECT cl.client_id INTO v_client_id
  FROM c.client cl
  WHERE cl.client_slug = p_client_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'fail_closed', 'selected', NULL, 'slot_resolution', NULL,
      'alternatives', '[]'::jsonb, 'rejected', v_rejected, 'warnings', v_warnings,
      'fail_reason', 'client_not_found', 'context', v_context);
  END IF;

  -- NULL p_platform: the platform fence cannot be evaluated. Candidates PASS the platform
  -- filter (permissive), but NEVER silently — visible warning once per call (same doctrine
  -- as resolve_slot_assets: permissive is fine, silent is not).
  IF p_platform IS NULL THEN
    v_warnings := v_warnings || to_jsonb('platform_input_missing'::text);
  END IF;

  -- ── 1.–2. Candidate set (format_key match) + ordered filter chain per candidate ───────
  FOR r IN
    SELECT
      t.id                     AS template_id,
      t.provider_template_id,
      t.provider_template_name,
      t.scope,
      t.status,
      t.aspect_ratio,
      t.created_at,
      vc.variant_key,
      vc.format_key,
      vc.fit_status
    FROM c.creative_template_variant_candidate vc
    JOIN c.creative_provider_template t ON t.id = vc.template_id
    WHERE vc.format_key = p_format
    ORDER BY t.created_at ASC, t.id ASC, vc.variant_key ASC
  LOOP
    v_candidate_count := v_candidate_count + 1;
    v_reason := NULL;
    v_detail := NULL;
    v_slot   := NULL;

    -- a. scope: v0 selects generics only ('client'-scoped joins are a later rung).
    IF r.scope <> 'generic' THEN
      v_reason := 'wrong_scope';
      v_detail := 'scope=' || r.scope;

    -- b. status: must be at or above the smoke_rendered lifecycle rung (L0).
    ELSIF r.status NOT IN
      ('smoke_rendered', 'visually_approved', 'platform_safe', 'client_enabled', 'production_proven') THEN
      v_reason := 'status_below_smoke';
      v_detail := 'status=' || r.status;
    END IF;

    -- c. platform suitability (only evaluable with a known caller platform; NULL p_platform
    --    = permissive-with-visible-warning, emitted once before this loop).
    IF v_reason IS NULL AND p_platform IS NOT NULL THEN
      SELECT
        count(*),
        count(*) FILTER (WHERE s.suitability_status NOT IN ('not_suitable', 'blocked')),
        count(*) FILTER (WHERE s.suitability_status IN ('platform_safe', 'production_proven'))
      INTO v_ps_total, v_ps_passing, v_ps_proven
      FROM c.creative_template_platform_suitability s
      WHERE s.template_id = r.template_id
        AND s.platform    = p_platform;

      IF v_ps_total = 0 THEN
        v_reason := 'platform_unsuitable';
        v_detail := 'no_suitability_row_for_platform';
      ELSIF v_ps_passing = 0 THEN
        v_reason := 'platform_unsuitable';
        v_detail := 'suitability_status_negative';
      ELSIF v_ps_proven = 0 THEN
        -- Passing on an unproven declaration ('unknown'/'candidate'/'needs_review') is
        -- permitted, but ONLY visibly: warning once per call (design packet R4 —
        -- suitability claims must never launder into platform_safe).
        IF NOT v_platform_unproven_warned THEN
          v_warnings := v_warnings || to_jsonb('platform_suitability_unproven'::text);
          v_platform_unproven_warned := true;
        END IF;
      END IF;
    END IF;

    -- d. client assignment: must exist and sit at visually_approved or above.
    IF v_reason IS NULL THEN
      SELECT a.id, a.assignment_status, a.approved_by
      INTO v_assign_id, v_assign_status, v_assign_approved_by
      FROM c.creative_template_client_assignment a
      WHERE a.template_id = r.template_id
        AND a.client_id   = v_client_id;

      IF NOT FOUND THEN
        v_reason := 'no_assignment';
      ELSIF v_assign_status = 'proposed' THEN
        v_reason := 'assignment_not_approved';
      ELSIF v_assign_status IN ('blocked', 'deprecated') THEN
        v_reason := 'assignment_blocked';
        v_detail := 'assignment_status=' || v_assign_status;
      ELSIF v_assign_status = 'approved' THEN
        -- approved is the pre-visual rung (L3): admitted to the visual gate, NOT selectable.
        v_reason := 'not_visually_proven';
        v_detail := 'assignment_approved_but_no_visual_rung';
      ELSIF v_assign_status NOT IN ('visually_approved', 'client_enabled', 'production_proven') THEN
        -- defensive: unreachable under the current CHECK vocabulary — fail closed, never guess.
        v_reason := 'assignment_not_approved';
        v_detail := 'unrecognised_assignment_status=' || v_assign_status;
      END IF;
    END IF;

    -- e. visual proof: hard selectability gate (design packet Q4) — a passed
    --    visual_approval proof event attached to THIS assignment_id.
    IF v_reason IS NULL THEN
      SELECT p.occurred_at, p.evidence_reference
      INTO v_proof_occurred_at, v_proof_evidence
      FROM c.creative_template_proof_event p
      WHERE p.assignment_id = v_assign_id
        AND p.proof_type    = 'visual_approval'
        AND p.proof_status  = 'passed'
      ORDER BY p.occurred_at DESC NULLS LAST, p.created_at DESC, p.id ASC
      LIMIT 1;
      IF NOT FOUND THEN
        v_reason := 'not_visually_proven';
        v_detail := 'no_passed_visual_approval_proof_on_assignment';
      END IF;
    END IF;

    -- f. asset composition: Slice-1 must answer ok for this (client, template) — its
    --    fail_reason is echoed verbatim so the two fail-closed layers stay distinguishable.
    IF v_reason IS NULL THEN
      v_slot := public.resolve_slot_assets(p_client_slug, p_platform, p_format, r.template_id, p_seed);
      IF (v_slot->>'status') IS DISTINCT FROM 'ok' THEN
        v_reason := 'assets_fail_closed:' || COALESCE(v_slot->>'fail_reason', 'unknown');
      END IF;
    END IF;

    IF v_reason IS NOT NULL THEN
      v_entry := jsonb_build_object(
        'template_id',            r.template_id,
        'provider_template_name', r.provider_template_name,
        'variant_key',            r.variant_key,
        'reason_code',            v_reason);
      IF v_detail IS NOT NULL THEN
        v_entry := v_entry || jsonb_build_object('detail', v_detail);
      END IF;
      v_rejected := v_rejected || v_entry;
    ELSE
      -- Survivor: keep everything the winner payload needs (incl. the resolve_slot_assets
      -- jsonb — kept here so the winner is never re-called).
      v_entry := jsonb_build_object(
        'assignment_id',          v_assign_id,
        'template_id',            r.template_id,
        'provider_template_id',   r.provider_template_id,
        'provider_template_name', r.provider_template_name,
        'variant_key',            r.variant_key,
        'format_key',             r.format_key,
        'aspect_ratio',           r.aspect_ratio,
        'assignment_status',      v_assign_status,
        'approved_by',            v_assign_approved_by,
        'fit_status',             r.fit_status,
        'proof_occurred_at',      v_proof_occurred_at,
        'proof_evidence',         v_proof_evidence,
        'intent_match',           (p_variant_intent IS NOT NULL AND r.variant_key = p_variant_intent),
        'slot_resolution',        v_slot);

      IF p_variant_intent IS NOT NULL AND r.variant_key = p_variant_intent THEN
        v_intent_matched := true;
        IF r.fit_status = 'strong_candidate' THEN
          v_b_intent_strong := v_b_intent_strong || v_entry;
        ELSE
          v_b_intent_other := v_b_intent_other || v_entry;
        END IF;
      ELSIF r.fit_status = 'strong_candidate' THEN
        v_b_strong := v_b_strong || v_entry;
      ELSE
        v_b_other := v_b_other || v_entry;
      END IF;
    END IF;
  END LOOP;

  -- ── 1. Empty candidate set: the format maps to NO template class — never guess ────────
  IF v_candidate_count = 0 THEN
    RETURN jsonb_build_object(
      'status', 'fail_closed', 'selected', NULL, 'slot_resolution', NULL,
      'alternatives', '[]'::jsonb, 'rejected', v_rejected, 'warnings', v_warnings,
      'fail_reason', 'format_unmapped', 'context', v_context);
  END IF;

  -- ── 3. Rank survivors (intent → fit → registry order; buckets already tie-broken) ─────
  v_ranked := v_b_intent_strong || v_b_intent_other || v_b_strong || v_b_other;
  v_n      := jsonb_array_length(v_ranked);

  IF v_n = 0 THEN
    -- Candidates existed but none is selectable: rejected[] is the "why not" payload.
    RETURN jsonb_build_object(
      'status', 'fail_closed', 'selected', NULL, 'slot_resolution', NULL,
      'alternatives', '[]'::jsonb, 'rejected', v_rejected, 'warnings', v_warnings,
      'fail_reason', 'no_selectable_template', 'context', v_context);
  END IF;

  -- variant intent is a RANKER, not a filter: an unmatched intent changes nothing except
  -- this visible warning (once per call).
  IF p_variant_intent IS NOT NULL AND NOT v_intent_matched THEN
    v_warnings := v_warnings || to_jsonb('variant_intent_unmatched'::text);
  END IF;

  v_winner := v_ranked -> 0;

  v_reasons := jsonb_build_array(
    'format_match',
    'generic_scope',
    CASE WHEN p_platform IS NOT NULL THEN 'platform_declared' ELSE 'platform_skipped_null_input' END,
    'assignment_visually_approved',
    'visual_proof_passed',
    'assets_resolved');
  IF (v_winner->>'intent_match')::boolean THEN
    v_reasons := v_reasons || to_jsonb('variant_intent_match'::text);
  END IF;

  v_selected := jsonb_build_object(
    'assignment_id',          v_winner->'assignment_id',
    'template_id',            v_winner->'template_id',
    'provider_template_id',   v_winner->'provider_template_id',
    'provider_template_name', v_winner->'provider_template_name',
    'variant_key',            v_winner->'variant_key',
    'format_key',             v_winner->'format_key',
    'aspect_ratio',           v_winner->'aspect_ratio',
    'assignment_status',      v_winner->'assignment_status',
    'approved_by',            v_winner->'approved_by',
    'proof', jsonb_build_object(
      'visual_approval',    'passed',
      'occurred_at',        v_winner->'proof_occurred_at',
      'evidence_reference', v_winner->'proof_evidence'),
    'reasons', v_reasons);

  -- Ranked runners-up, each with its rank_reasons (explainability for "why not first").
  FOR i IN 1 .. v_n - 1 LOOP
    v_alt := v_ranked -> i;
    v_rank_reasons := '[]'::jsonb;
    IF (v_alt->>'intent_match')::boolean THEN
      v_rank_reasons := v_rank_reasons || to_jsonb('variant_intent_match'::text);
    END IF;
    v_rank_reasons := v_rank_reasons || to_jsonb(('fit_' || (v_alt->>'fit_status'))::text);
    v_rank_reasons := v_rank_reasons || to_jsonb('registry_order_tiebreak'::text);
    v_alts := v_alts || jsonb_build_object(
      'template_id',            v_alt->'template_id',
      'provider_template_name', v_alt->'provider_template_name',
      'variant_key',            v_alt->'variant_key',
      'rank_reasons',           v_rank_reasons);
  END LOOP;

  RETURN jsonb_build_object(
    'status',          'ok',
    'selected',        v_selected,
    'slot_resolution', v_winner->'slot_resolution',
    'alternatives',    v_alts,
    'rejected',        v_rejected,
    'warnings',        v_warnings,
    'fail_reason',     NULL,
    'context',         v_context);
END;
$$;

COMMENT ON FUNCTION public.select_template(text, text, text, text, text) IS
'Template Selection v0 (Lane C): read-only TMR template selector. Given (client_slug, platform, format, variant_intent?, seed?) returns the approved + visually proven template assignment ICE would use, composing public.resolve_slot_assets for the winner''s slot fill — or fails closed with per-candidate reason codes. Generic scope only; variant_intent is a ranker not a filter; no template-level seed rotation (seed = background rotation only). Service-role-only. Ships dark (no production consumer).';

-- ── Grants: service-role-only (revoking PUBLIC alone is insufficient — name anon, authenticated) ──
REVOKE ALL ON FUNCTION public.select_template(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.select_template(text, text, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_template(text, text, text, text, text) TO service_role;
