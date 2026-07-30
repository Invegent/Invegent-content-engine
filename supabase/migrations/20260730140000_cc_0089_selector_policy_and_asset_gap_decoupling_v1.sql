-- ============================================================================
-- cc-0089 — Creatomate Global: Selector-Policy Decoupling + Asset-Gap Isolation
-- ⛔ PREPARED — NOT APPLIED. Apply is a PK-gated stop (T2/T3 per CLAUDE.md). Local-only,
--    isolated-worktree diff; no migration has been run, no function has been deployed.
-- ============================================================================
-- Brief:  docs/briefs/cc-0089-creatomate-global-selector-asset-gap-decoupling-brief-v1.md
--         (referenced by the PK task; the file was not present in this worktree at
--         authoring time — see the ef-builder handback open_issues. All requirements
--         implemented here are taken from the task's own inline specification, which
--         reproduced the brief's Part 1/Part 2 content in full.)
--
-- PROBLEM (live-confirmed 2026-07-30, read-only, before this migration):
--   public.select_template(client_slug, platform, format, variant_intent, seed) ranks its
--   11 generic facebook/PP/image_quote candidates by
--     (i) variant-intent match, (ii) fit_status='strong_candidate', (iii)
--     t.created_at ASC, t.id ASC, vc.variant_key ASC.
--   Six of those candidates (incl. generic_market_insight_card_1x1_v1,
--   0e006c5c-45aa-4829-82ec-89dd282a8c56, and generic_announcement_card_1x1_v1,
--   fb8a4a9b-904e-4a50-8ade-873aff4a53ae) share the IDENTICAL created_at
--   (2026-07-02 11:12:41.987075+00), so the winner today is decided purely by lowest
--   UUID — market_insight, which is only suitability_status='candidate' for facebook
--   (NOT production_proven). announcement_card IS the only facebook production_proven
--   template in the set, but its UUID loses the tiebreak, so it can never win.
--   public.derive_asset_appetite / public.analyze_asset_gap (cc-0042,
--   20260719170000_cc_0042_appetite_inventory_read_path_v1.sql) independently order
--   their OWN candidate set by the SAME created_at ASC, template_id ASC tiebreak — a
--   separate but structurally identical latent defect that PK ruled must be fixed
--   WITHOUT coupling the two functions to a shared mechanism (see DESIGN below).
--
-- DESIGN (PK Gate-1 ruling, cc-0089): a NEW dedicated selector-policy table that
--   select_template ALONE reads for ranking preference. derive_asset_appetite and
--   analyze_asset_gap NEVER reference it — this is the load-bearing architectural
--   constraint, not a style preference. This migration:
--     1. Creates c.creative_template_selector_policy (service-role-only, RLS-enabled,
--        deny-by-default — mirrors c.creative_template_platform_suitability's posture
--        from 20260630042316_tmr3_template_metadata_registry.sql).
--     2. CREATE OR REPLACE FUNCTION public.select_template(...): SAME signature,
--        functionally IDENTICAL output for every candidate with NO policy row (the
--        regression-safety net — zero policy rows ⇒ byte-identical to today). The
--        ONLY body change is a LEFT JOIN to the new table in the per-format candidate
--        cursor, with COALESCE(policy.priority, 0) DESC inserted into that cursor's
--        ORDER BY immediately BEFORE t.created_at ASC, t.id ASC, vc.variant_key ASC.
--        Because rank-bucket membership (intent-strong / intent-other / strong_candidate
--        / other) is decided AFTER the cursor scan (by which jsonb array a survivor is
--        pushed onto, per the original design), changing only the cursor's internal scan
--        order changes ONLY the within-bucket tiebreak — priority can promote a template
--        within its existing rank bucket, it can NEVER move a template into a different
--        bucket or override genuine platform-intent / fit_status matching.
--     3. public.derive_asset_appetite and public.analyze_asset_gap
--        (cc_0042_appetite_inventory_read_path_v1.sql) are NOT touched by this migration
--        in any way — re-confirmed by re-reading the final diff: neither function's SQL
--        text changed, and neither references c.creative_template_selector_policy.
--     4. Inserts EXACTLY ONE governed policy row (reviewable, named, single DML
--        statement — not a silent code default): generic_announcement_card_1x1_v1
--        (fb8a4a9b-904e-4a50-8ade-873aff4a53ae) on platform='facebook', priority=100.
--        This makes announcement_card explicitly *selectable* by select_template; it
--        does NOT flip any autoselect/unattended-publish toggle — no such flag was
--        found separate from select_template's own ranking (select_template already
--        ships dark per its own header: "no production consumer").
--
-- LIVE ID VERIFICATION (2026-07-30, read-only, ice_ro.template_registry_status via
--   scripts/db-read.py — zero-prompt R0 path):
--     fb8a4a9b-904e-4a50-8ade-873aff4a53ae -> generic_announcement_card_1x1_v1  (re-verified)
--     0e006c5c-45aa-4829-82ec-89dd282a8c56 -> generic_market_insight_card_1x1_v1 (re-verified)
--
-- REGRESSION-SAFETY BASELINE (must remain byte-identical; this migration does not
--   change either function's SQL text so it holds trivially):
--   analyze_asset_gap('property-pulse','facebook','image_quote', <real PP fb image_quote
--   draft id>) -> status:'ok', asset_gap_detected:false, primary_route:'none',
--   diagnostic_evidence.reason:'select_template_ok'... (see task evidence). Zero
--   m.asset_gap_suggestion rows for this client+format, unaffected.
--
-- OUT OF SCOPE (unchanged, confirmed by re-reading the final diff):
--   derive_asset_appetite / analyze_asset_gap SQL bodies · carousel · B-roll governance
--   · any client other than Property Pulse · Dashboard portfolio-weights ·
--   buildTmrRenderPlan/worker layout logic · any autoselect/unattended-publish flag
--   (none found distinct from select_template's own ranking).
--
-- ROLLBACK: see supabase/migrations/ROLLBACK_20260730140000_cc_0089_selector_policy_and_asset_gap_decoupling_v1.sql
--   (executes the CHEAP option — DELETE the one policy row — which is the preferred,
--   sufficient rollback; the FULL option — DROP the table + restore select_template's
--   verbatim pre-change body — is documented in full at the bottom of that same file,
--   commented-out, for use only if the table/column itself must be removed).
-- ============================================================================

BEGIN;

-- ── 1. c.creative_template_selector_policy — select_template-ONLY ranking preference ──
-- Mirrors c.creative_template_platform_suitability's posture (20260630042316):
-- service-role-only, RLS enabled with NO permissive policies (deny-by-default for
-- anon/authenticated; service_role bypasses RLS). One active priority row per
-- template×platform (simplest correct model — no effective-date ranges; none needed).
create table c.creative_template_selector_policy (
  policy_id   uuid primary key default gen_random_uuid(),
  template_id uuid not null references c.creative_provider_template(id),
  platform    text not null,
  priority    integer not null default 0,
  reason      text not null,
  created_by  text not null,
  created_at  timestamptz not null default now(),
  unique (template_id, platform)
);
comment on table c.creative_template_selector_policy is
'cc-0089: select_template-ONLY ranking preference. Read EXCLUSIVELY by public.select_template as a within-rank-bucket tiebreak (COALESCE(priority,0) DESC, applied before t.created_at ASC, t.id ASC, vc.variant_key ASC). NEVER read by derive_asset_appetite / analyze_asset_gap or any other function — this separation is the load-bearing architectural decoupling from the Asset Gap tiebreak defect (PK Gate-1 ruling). One row per (template_id, platform); higher priority wins ties within the SAME rank bucket only — it cannot promote a template across bucket boundaries (intent-match / fit_status are decided independently of this table).';

create index ctsp_platform_priority_idx on c.creative_template_selector_policy (platform, priority desc);

-- Grants: service-role-only (revoking PUBLIC alone is insufficient — name anon, authenticated).
revoke all on c.creative_template_selector_policy from public, anon, authenticated;
grant select, insert, update, delete on c.creative_template_selector_policy to service_role;

-- RLS: deny-all hardening (matches the TMR posture) — ENABLE RLS, NO permissive policies.
alter table c.creative_template_selector_policy enable row level security;

-- ── 2. public.select_template — additive ranking tiebreak ONLY ────────────────────────
-- SAME signature. Every line is byte-identical to the live body
-- (supabase/migrations/20260703035154_create_select_template_v1.sql) EXCEPT the
-- candidate cursor's FROM/JOIN/ORDER BY (marked "cc-0089" below) — zero policy rows
-- for a given (template_id, platform) ⇒ COALESCE(policy.priority, 0) = 0 for every
-- row ⇒ the ORDER BY collapses to the original t.created_at ASC, t.id ASC,
-- vc.variant_key ASC ⇒ output is functionally identical to today when the policy
-- table is empty for the candidate set in play.
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

  -- Survivor rank buckets. The candidate loop scans in (COALESCE(policy.priority,0) DESC,
  -- t.created_at ASC, t.id ASC) order (cc-0089: priority added ahead of the original
  -- tiebreak), so each bucket is ALREADY in tiebreak order; ranked list = intent-match
  -- buckets first, then strong_candidate before others (§4 rank rule i–iii). Priority
  -- ONLY changes ordering WITHIN a bucket — bucket membership below is still decided
  -- purely by intent-match / fit_status, exactly as before.
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
    -- cc-0089: select_template-ONLY ranking preference. LEFT JOIN so a template with NO
    -- policy row for THIS platform behaves exactly as before (COALESCE below = 0).
    -- derive_asset_appetite / analyze_asset_gap do NOT join this table — the decoupling
    -- is structural, not just a runtime no-op.
    LEFT JOIN c.creative_template_selector_policy policy
      ON policy.template_id = t.id AND policy.platform = p_platform
    WHERE vc.format_key = p_format
    -- cc-0089: COALESCE(policy.priority, 0) DESC inserted BEFORE the original tiebreak.
    -- This can only reorder candidates WITHIN the rank bucket they are later placed into
    -- (bucket assignment below depends on intent-match/fit_status, not on this order) —
    -- it never overrides genuine platform-intent matching or promotes a wrong-format /
    -- wrong-scope / unapproved candidate.
    ORDER BY COALESCE(policy.priority, 0) DESC, t.created_at ASC, t.id ASC, vc.variant_key ASC
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
'Template Selection v0 (Lane C): read-only TMR template selector. Given (client_slug, platform, format, variant_intent?, seed?) returns the approved + visually proven template assignment ICE would use, composing public.resolve_slot_assets for the winner''s slot fill — or fails closed with per-candidate reason codes. Generic scope only; variant_intent is a ranker not a filter; no template-level seed rotation (seed = background rotation only). cc-0089: within-rank-bucket ties additionally broken by COALESCE(c.creative_template_selector_policy.priority, 0) DESC (select_template-ONLY; never read by derive_asset_appetite/analyze_asset_gap), applied BEFORE t.created_at ASC, t.id ASC, vc.variant_key ASC. Service-role-only. Ships dark (no production consumer).';

-- ── Grants: service-role-only (revoking PUBLIC alone is insufficient — name anon, authenticated) ──
-- Unchanged from the live grants (CREATE OR REPLACE preserves the ACL either way; restated
-- explicitly here for clarity and because this file is the new canonical source).
REVOKE ALL ON FUNCTION public.select_template(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.select_template(text, text, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_template(text, text, text, text, text) TO service_role;

-- ── 3. Governed policy row — the ONLY DML in this migration ───────────────────────────
-- Live ID re-verified 2026-07-30 via ice_ro.template_registry_status (see header).
-- Makes generic_announcement_card_1x1_v1 reachable for facebook; does NOT flip any
-- autoselect/unattended-publish toggle (select_template ships dark; no such flag exists).
insert into c.creative_template_selector_policy
  (template_id, platform, priority, reason, created_by)
values (
  'fb8a4a9b-904e-4a50-8ade-873aff4a53ae'::uuid,
  'facebook',
  100,
  'cc-0089: PK-approved governed selectability for the only facebook production_proven PP image_quote template, decoupled from Asset Gap tiebreak',
  'cc-0089-selector-decoupling'
);

COMMIT;

-- ============================================================================
-- ROLLBACK (reference only — NOT executed here): see the sibling file
--   supabase/migrations/ROLLBACK_20260730140000_cc_0089_selector_policy_and_asset_gap_decoupling_v1.sql
-- which executes the CHEAP option (DELETE the one policy row) and documents the FULL
-- option (DROP FUNCTION back to the pre-change body + DROP TABLE) as a commented-out
-- alternative for use only if the table/column itself must be removed.
-- ============================================================================
