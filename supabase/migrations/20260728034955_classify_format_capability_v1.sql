-- NOT_APPLIED_classify_format_capability_v1.sql
-- =====================================================================
-- Shared Capability Contract — public.classify_format_capability (read-only, dark)
-- Brief: docs/briefs/shared-capability-contract-classifier-gate1-v1.md
--        (DESIGN GATE — DECIDED + normative spec; Live-grounding findings — authoritative)
-- Mirror posture: supabase/migrations/20260703035154_create_select_template_v1.sql
--        (SECDEF / STABLE / search_path='' / service-role-only / fail-closed).
--
-- STATUS: NOT YET APPLIED. Apply is PK-GATED (T3). Filename is deliberately NOT a
--   timestamped migration name so no apply tool sweeps it up; the apply lane renames
--   it to a real identity (same convention as NOT_APPLIED_cc0080_*).
--
-- WHAT IT DOES
--   Given a single (client_slug, platform, format) CELL it returns exactly one of six
--   capability statuses — ready · asset_shortage · template_missing · pipeline_missing ·
--   governance_unproven · unsupported_silent_degrade — plus the exact reason_code and the
--   owning lane the gap routes to, as jsonb { status, reason_code, routed_lane, evidence }.
--   It is the interface the S2 Dashboard Format Capability Indicator and the S8 Asset Gap
--   Demand Register both consume (both are blocked on it existing first).
--
--   CLASSIFICATION ONLY. It reads capability from the governed resolver spine
--   (public.select_template + public.resolve_slot_assets) and the live publish log
--   (m.post_publish). It does NOT gate, block, or change any production behaviour — it does
--   not touch the silent-degrade / resolver_fallback / legacy-render / auto-publish path.
--   Enforcement is a SEPARATE future PK-gated R3 lane
--   (docs/briefs/resolver-enforcement-r3-contract-gate1-v1.md).
--
-- NORMATIVE LOGIC (precedence order — brief §DESIGN GATE)
--   1. v_st := public.select_template(client, platform, format, NULL, NULL) — governance authority.
--      status='ok' → ready.
--   2. SILENT-DEGRADE OVERLAY FIRST (precedence wins): if v_st.status='fail_closed' AND a recent
--      published m.post_publish row exists for THIS cell within c_silent_degrade_window →
--      unsupported_silent_degrade, reason_code=<v_st.fail_reason> (blocker preserved),
--      routed_lane='enforcement_r3'. Silent-degrade CANNOT rely on final_format_authority
--      (~99% unmarked live) — it is COMPOSED from select_template=fail_closed AND publish evidence.
--   3. Else map v_st fail_closed by the MOST-PROGRESSED rejected candidate
--      (assets(3) > governance(2) > template-structural(1)):
--        - fail_reason='format_unmapped' (rejected[] empty)       → template_missing / template_creatomate_heygen
--        - rejected reason_code ∈ {no_assignment, assignment_not_approved,
--            assignment_blocked, not_visually_proven}             → governance_unproven / governance_proof
--        - rejected reason_code ∈ {platform_unsuitable, wrong_scope,
--            status_below_smoke}                                  → template_missing / template_creatomate_heygen
--        - rejected reason_code LIKE 'assets_fail_closed:%' (template selectable + governed, assets
--            failed): call public.resolve_slot_assets(client, platform, format, <that template_id>, NULL)
--            DIRECTLY and read the per-slot rejected[] cardinality —
--              · fail_reason='missing_required_logo' (structural) OR empty rejected[]
--                (zero candidates of required usage)              → pipeline_missing / engineering
--              · non-empty rejected[] (governed assets exist, all fenced)
--                                                                 → asset_shortage / asset_gap_s8
--   4. Any fail_reason / reason_code NOT grounded in resolver source → fail-closed to status='unknown'
--      with the raw reason in reason_code. NEVER fabricate a status.
--
-- CELL-JOIN COLUMN VERIFICATION (silent-degrade overlay) — verified, NOT guessed:
--   * m.post_publish.platform + m.post_draft.recommended_format via pd.post_draft_id = pp.post_draft_id
--       — the PROVEN pyramid RPC ev_publish CTE
--       (20260630000000_gfcp_slice1a_get_global_format_capability_pyramid_rpc.sql:114-119).
--   * m.post_publish.client_id + m.post_publish.published_at
--       — 20260503092929_f_aap_002_audit_check7_v4_compat.sql:339-341
--         (LEFT JOIN m.post_publish pp ON pp.client_id = cl.client_id ... MAX(pp.published_at)).
--   * m.post_draft.recommended_format column — 20260508003600_f_insights_rpc_migrations_missing.sql:89-93.
--   Platform authority = pp.platform (the actual publish channel), matching the pyramid precedent
--   (the reconciler notes ~155 rows where pp.platform <> pd.platform; pp.platform is the publish truth).
--   Format is only available via pd.recommended_format (no format column on m.post_publish) — the
--   same single available signal the proven pyramid uses.
--
-- SECURITY POSTURE (copied from public.select_template / public.resolve_slot_assets)
--   SECURITY DEFINER, owner postgres · STABLE (read-only, no writes) · SET search_path = ''
--   with ALL references schema-qualified · no dynamic SQL · EXECUTE revoked from PUBLIC, anon,
--   authenticated and granted to service_role ONLY (Supabase public funcs are born
--   anon-executable via pg_default_acl — the REVOKE from anon/authenticated is mandatory, not
--   optional). Ships DARK: no production consumer wired this lane, no behaviour change.
--
-- READ-ONLY: no INSERT/UPDATE/DELETE, no DDL inside, no enforcement.
--
-- (R) ROLLBACK (reference only — NOT executed by this migration):
--   DROP FUNCTION IF EXISTS public.classify_format_capability(text, text, text);
-- =====================================================================

CREATE OR REPLACE FUNCTION public.classify_format_capability(
  p_client_slug text,
  p_platform    text,
  p_format      text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- ── TUNABLE: silent-degrade recency window (PK default 90 days). Single obvious line. ──
  c_silent_degrade_window CONSTANT interval := interval '90 days';

  v_context     jsonb;
  v_client_id   uuid;

  v_st          jsonb;
  v_st_status   text;
  v_fail_reason text;
  v_rejected    jsonb;

  -- silent-degrade probe
  v_pub_count  int := 0;
  v_latest_pub timestamptz;
  v_sample_ids jsonb := '[]'::jsonb;

  -- most-progressed rejected candidate
  r_entry     jsonb;
  v_rank      int;
  v_best_rank int := -1;
  v_best_cand jsonb;
  v_cand_reason text;
  v_cand_tmpl uuid;

  -- assets sub-resolution (resolve_slot_assets called directly)
  v_rsa           jsonb;
  v_rsa_status    text;
  v_rsa_fail      text;
  v_rsa_rejected  jsonb;
  v_rsa_selected  jsonb;
  v_rsa_rej_count int;
  v_rsa_sel_count int;
  v_rsa_reasons   jsonb;
BEGIN
  v_context := jsonb_build_object(
    'client_slug', p_client_slug,
    'platform',    p_platform,
    'format',      p_format,
    'classifier_version', 'classify_format_capability.v1',
    'silent_degrade_window', c_silent_degrade_window::text
  );

  -- Resolve client (c.client PK column is client_id). NULL = slug did not resolve.
  SELECT cl.client_id INTO v_client_id
  FROM c.client cl
  WHERE cl.client_slug = p_client_slug;

  -- ── 1. select_template = the governance authority for this cell ───────────────────────
  v_st          := public.select_template(p_client_slug, p_platform, p_format, NULL, NULL);
  v_st_status   := v_st->>'status';
  v_fail_reason := v_st->>'fail_reason';
  v_rejected    := COALESCE(v_st->'rejected', '[]'::jsonb);

  -- Ready short-circuit.
  IF v_st_status = 'ok' THEN
    RETURN jsonb_build_object(
      'status',      'ready',
      'reason_code', 'selectable',
      'routed_lane', NULL,
      'evidence', jsonb_build_object(
        'selected', v_st->'selected',
        'source',   'public.select_template'),
      'context', v_context);
  END IF;

  -- From here, select_template failed closed.

  -- ── 2. SILENT-DEGRADE OVERLAY (precedence WINS over the underlying blocker) ────────────
  -- Requires a groundable cell (known platform + format) and a resolvable client. Composed
  -- signal: select_template=fail_closed AND a recent published m.post_publish row for the cell.
  IF v_client_id IS NOT NULL AND p_platform IS NOT NULL AND p_format IS NOT NULL THEN
    SELECT count(*), max(pp.published_at)
      INTO v_pub_count, v_latest_pub
    FROM m.post_publish pp
    JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
    WHERE pp.client_id       = v_client_id
      AND pp.status          = 'published'
      AND pp.platform        = p_platform
      AND pd.recommended_format = p_format
      AND pp.published_at IS NOT NULL
      AND pp.published_at   >= now() - c_silent_degrade_window;

    IF v_pub_count > 0 THEN
      SELECT COALESCE(jsonb_agg(s.post_publish_id ORDER BY s.published_at DESC), '[]'::jsonb)
        INTO v_sample_ids
      FROM (
        SELECT pp.post_publish_id, pp.published_at
        FROM m.post_publish pp
        JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
        WHERE pp.client_id       = v_client_id
          AND pp.status          = 'published'
          AND pp.platform        = p_platform
          AND pd.recommended_format = p_format
          AND pp.published_at IS NOT NULL
          AND pp.published_at   >= now() - c_silent_degrade_window
        ORDER BY pp.published_at DESC
        LIMIT 5
      ) s;

      RETURN jsonb_build_object(
        'status',      'unsupported_silent_degrade',
        'reason_code', COALESCE(v_fail_reason, 'unknown'),   -- underlying blocker preserved
        'routed_lane', 'enforcement_r3',
        'evidence', jsonb_build_object(
          'publish_count',           v_pub_count,
          'latest_published_at',     v_latest_pub,
          'sample_post_publish_ids', v_sample_ids,
          'select_template_status',  v_st_status,
          'blocker_fail_reason',     v_fail_reason,
          'window',                  c_silent_degrade_window::text,
          'source', 'select_template=fail_closed AND m.post_publish(status=published) in window'),
        'context', v_context);
    END IF;
  END IF;

  -- ── 3. Map select_template fail_closed → the four resolver-grounded statuses ───────────

  -- 3a. format maps to NO template class (rejected[] empty) → Template missing.
  IF v_fail_reason = 'format_unmapped' THEN
    RETURN jsonb_build_object(
      'status',      'template_missing',
      'reason_code', 'format_unmapped',
      'routed_lane', 'template_creatomate_heygen',
      'evidence', jsonb_build_object(
        'fail_reason',    v_fail_reason,
        'rejected_count', jsonb_array_length(v_rejected),
        'source',         'public.select_template'),
      'context', v_context);
  END IF;

  -- 3b. bad slug — NEVER fabricate; fail-closed to unknown.
  IF v_fail_reason = 'client_not_found' THEN
    RETURN jsonb_build_object(
      'status',      'unknown',
      'reason_code', 'client_not_found',
      'routed_lane', NULL,
      'evidence', jsonb_build_object(
        'source', 'public.select_template',
        'note',   'client_slug did not resolve against c.client'),
      'context', v_context);
  END IF;

  -- 3c. no_selectable_template → classify by the MOST-PROGRESSED rejected candidate.
  --     progression rank: assets(3) > governance(2) > template-structural(1) > ungrounded(0).
  FOR r_entry IN SELECT elem FROM jsonb_array_elements(v_rejected) AS elem
  LOOP
    v_cand_reason := r_entry->>'reason_code';
    v_rank :=
      CASE
        WHEN v_cand_reason LIKE 'assets_fail_closed:%' THEN 3
        WHEN v_cand_reason IN ('no_assignment','assignment_not_approved','assignment_blocked','not_visually_proven') THEN 2
        WHEN v_cand_reason IN ('platform_unsuitable','wrong_scope','status_below_smoke') THEN 1
        ELSE 0
      END;
    IF v_rank > v_best_rank THEN
      v_best_rank := v_rank;
      v_best_cand := r_entry;
    END IF;
  END LOOP;

  IF v_best_cand IS NOT NULL THEN
    v_cand_reason := v_best_cand->>'reason_code';

    -- rank 2: governance rejection → Governance unproven (from the assignment/proof code, not a supply count).
    IF v_best_rank = 2 THEN
      RETURN jsonb_build_object(
        'status',      'governance_unproven',
        'reason_code', v_cand_reason,
        'routed_lane', 'governance_proof',
        'evidence', jsonb_build_object(
          'template_id',            v_best_cand->'template_id',
          'provider_template_name', v_best_cand->'provider_template_name',
          'source',                 'public.select_template rejected[]'),
        'context', v_context);

    -- rank 1: template-structural rejection → Template missing.
    ELSIF v_best_rank = 1 THEN
      RETURN jsonb_build_object(
        'status',      'template_missing',
        'reason_code', v_cand_reason,
        'routed_lane', 'template_creatomate_heygen',
        'evidence', jsonb_build_object(
          'template_id',            v_best_cand->'template_id',
          'provider_template_name', v_best_cand->'provider_template_name',
          'source',                 'public.select_template rejected[]'),
        'context', v_context);

    -- rank 3: template selectable + governed, ASSETS failed → resolve_slot_assets DIRECTLY to
    --         split Asset shortage (governed assets exist but fenced) from Pipeline missing (structural).
    ELSIF v_best_rank = 3 THEN
      v_cand_tmpl := (v_best_cand->>'template_id')::uuid;
      v_rsa           := public.resolve_slot_assets(p_client_slug, p_platform, p_format, v_cand_tmpl, NULL);
      v_rsa_status    := v_rsa->>'status';
      v_rsa_fail      := v_rsa->>'fail_reason';
      v_rsa_rejected  := COALESCE(v_rsa->'rejected', '[]'::jsonb);
      v_rsa_selected  := COALESCE(v_rsa->'selected', '[]'::jsonb);
      v_rsa_rej_count := jsonb_array_length(v_rsa_rejected);
      v_rsa_sel_count := jsonb_array_length(v_rsa_selected);

      -- Defensive: the direct call uses the SAME args select_template used (seed does not change
      -- fail state), so it MUST fail_closed here. If it does not, the evidence is ungrounded.
      IF v_rsa_status IS DISTINCT FROM 'fail_closed' THEN
        RETURN jsonb_build_object(
          'status',      'unknown',
          'reason_code', v_cand_reason,
          'routed_lane', NULL,
          'evidence', jsonb_build_object(
            'template_id',            v_cand_tmpl,
            'resolve_slot_assets_status', v_rsa_status,
            'note',   'select_template rejected on assets but direct resolve did not fail_closed — surfaced for review',
            'source', 'public.resolve_slot_assets (direct)'),
          'context', v_context);
      END IF;

      -- structural (missing required logo) OR zero candidate assets of required usage → Pipeline missing.
      IF v_rsa_fail = 'missing_required_logo' OR v_rsa_rej_count = 0 THEN
        RETURN jsonb_build_object(
          'status',      'pipeline_missing',
          'reason_code', COALESCE(v_rsa_fail, v_cand_reason),
          'routed_lane', 'engineering',
          'evidence', jsonb_build_object(
            'template_id',         v_cand_tmpl,
            'resolve_fail_reason', v_rsa_fail,
            'eligible_count',      v_rsa_sel_count,
            'rejected_count',      v_rsa_rej_count,
            'source',              'public.resolve_slot_assets (direct)'),
          'context', v_context);
      END IF;

      -- non-empty rejected[]: governed assets exist but ALL fenced → Asset shortage (routes S8).
      SELECT COALESCE(jsonb_agg(DISTINCT elem->>'reason_code'), '[]'::jsonb)
        INTO v_rsa_reasons
      FROM jsonb_array_elements(v_rsa_rejected) AS elem;

      RETURN jsonb_build_object(
        'status',      'asset_shortage',
        'reason_code', COALESCE(v_rsa_fail, v_cand_reason),
        'routed_lane', 'asset_gap_s8',
        'evidence', jsonb_build_object(
          'template_id',           v_cand_tmpl,
          'resolve_fail_reason',   v_rsa_fail,
          'eligible_count',        v_rsa_sel_count,
          'rejected_count',        v_rsa_rej_count,
          'rejected_reason_codes', v_rsa_reasons,
          'source',                'public.resolve_slot_assets (direct)'),
        'context', v_context);
    END IF;
  END IF;

  -- ── 4. Not grounded in resolver source → fail-closed to unknown (NEVER fabricate a status) ─
  RETURN jsonb_build_object(
    'status',      'unknown',
    'reason_code', COALESCE(v_cand_reason, v_fail_reason, 'ungrounded'),
    'routed_lane', NULL,
    'evidence', jsonb_build_object(
      'select_template_status',      v_st_status,
      'select_template_fail_reason', v_fail_reason,
      'rejected',                    v_rejected,
      'note',   'reason_code not grounded in resolver source — surfaced for review',
      'source', 'public.select_template'),
    'context', v_context);
END;
$$;

COMMENT ON FUNCTION public.classify_format_capability(text, text, text) IS
'Shared Capability Contract classifier (read-only, dark). Given (client_slug, platform, format) returns jsonb { status, reason_code, routed_lane, evidence } with exactly one of six statuses: ready · asset_shortage · template_missing · pipeline_missing · governance_unproven · unsupported_silent_degrade. Composes public.select_template (governance authority) + public.resolve_slot_assets (shortage-vs-pipeline split) + m.post_publish (silent-degrade overlay, precedence-first). Classification only — no gate, no enforcement, no behaviour change. Service-role-only. Ships dark (no production consumer). Brief: shared-capability-contract-classifier-gate1-v1.md.';

-- ── Grants: service-role-only. REVOKE PUBLIC alone is insufficient — name anon, authenticated
--    (Supabase pg_default_acl makes new public funcs anon/authenticated-executable at birth).
REVOKE ALL ON FUNCTION public.classify_format_capability(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.classify_format_capability(text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.classify_format_capability(text, text, text) TO service_role;
