-- 20260729120000_classify_format_capability_v2_publisher_path.sql
-- =====================================================================
-- Shared Capability Contract — public.classify_format_capability (read-only, dark)
-- Extension: adds a 7th status, publisher_path_missing.
-- Brief: docs/briefs/shared-capability-contract-classifier-publisher-path-extension-gate1-v1.md
--        (PK-approved "Design (A)" — absolute precedence).
-- Base:  supabase/migrations/20260728034955_classify_format_capability_v1.sql (LIVE, applied).
--        This migration is CREATE OR REPLACE over that function; it reproduces the entire
--        existing body byte-for-byte and inserts exactly ONE new check.
--
-- WHAT CHANGED (and nothing else)
--   A new check is inserted immediately after the existing client_slug → client_id
--   resolution and BEFORE the "── 1. select_template ──" block. It has ABSOLUTE
--   PRECEDENCE over every other status (including `ready`): if a client resolved
--   AND a platform was named, but `c.client_publish_profile` has NO row at all for
--   that (client_id, platform), the function returns immediately with the new
--   status `publisher_path_missing` — before `select_template` is even called.
--
--   Exact semantics:
--     - Only fires when v_client_id IS NOT NULL AND p_platform IS NOT NULL. If the
--       client_slug did not resolve (v_client_id IS NULL), this check does NOT fire,
--       so the existing client_not_found → unknown path (§3b, unchanged below) still
--       runs exactly as before.
--     - Fires on ROW EXISTENCE ONLY: NOT EXISTS (SELECT 1 FROM c.client_publish_profile
--       cpp WHERE cpp.client_id = v_client_id AND cpp.platform = p_platform). It
--       deliberately does NOT inspect publish_enabled, status, or paused_until — a row
--       that EXISTS but is disabled/paused does NOT trigger this status and falls
--       through to the unchanged select_template-driven logic below (hard scope
--       boundary from the brief; do not widen).
--     - On fire: RETURN jsonb_build_object('status','publisher_path_missing',
--       'reason_code','no_publish_profile_row','routed_lane','publisher_onboarding', ...).
--
-- WHAT IS STRICTLY OUT OF SCOPE (unchanged from v1, reaffirmed here)
--   - No change to select_template / resolve_slot_assets / any other resolver.
--   - No change to the silent-degrade overlay, the fail_reason mapping, or the
--     unknown fallback — all reproduced byte-for-byte below.
--   - No enablement/disablement inspection of c.client_publish_profile rows (row
--     existence only, per the brief's explicit scope fence).
--   - No new table, no DDL beyond CREATE OR REPLACE FUNCTION, no grant change (the
--     trailing REVOKE/GRANT block is reissued identically — safe/idempotent).
--   - No enforcement, no production consumer wired, no behaviour change to any
--     caller — the function remains dark (service_role-only, no consumer wired
--     this lane).
--
-- SECURITY POSTURE — unchanged: SECURITY DEFINER, owner postgres, STABLE,
--   SET search_path = '' with all references schema-qualified, no dynamic SQL,
--   EXECUTE revoked from PUBLIC/anon/authenticated, granted to service_role only.
--
-- (R) ROLLBACK: supabase/migrations/ROLLBACK_20260729120000_classify_format_capability_v2_publisher_path.sql
--     (CREATE OR REPLACE back to the exact prior body — byte-identical to
--     20260728034955_classify_format_capability_v1.sql's function body).
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

  -- ── 0. PUBLISHER PATH CHECK (ABSOLUTE PRECEDENCE — evaluated before select_template) ───
  -- Only fires on a resolvable client + named platform. Row-existence ONLY: a row that
  -- exists but is disabled/paused does NOT fire this and falls through unchanged below.
  IF v_client_id IS NOT NULL AND p_platform IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM c.client_publish_profile cpp
      WHERE cpp.client_id = v_client_id
        AND cpp.platform  = p_platform
    ) THEN
      RETURN jsonb_build_object(
        'status',      'publisher_path_missing',
        'reason_code', 'no_publish_profile_row',
        'routed_lane', 'publisher_onboarding',
        'evidence', jsonb_build_object(
          'client_id', v_client_id,
          'platform',  p_platform,
          'note',      'no row in c.client_publish_profile for this (client, platform)',
          'source',    'c.client_publish_profile'),
        'context', v_context);
    END IF;
  END IF;

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
'Shared Capability Contract classifier (read-only, dark). Given (client_slug, platform, format) returns jsonb { status, reason_code, routed_lane, evidence } with exactly one of seven statuses: publisher_path_missing · ready · asset_shortage · template_missing · pipeline_missing · governance_unproven · unsupported_silent_degrade. publisher_path_missing has ABSOLUTE PRECEDENCE — evaluated before select_template is even called — and fires only on row-EXISTENCE (client_id, platform) in c.client_publish_profile (not publish_enabled/status/paused_until; a disabled-but-present row falls through unchanged). Composes public.select_template (governance authority) + public.resolve_slot_assets (shortage-vs-pipeline split) + m.post_publish (silent-degrade overlay, precedence-first) + c.client_publish_profile (publisher-path precedence-first). Classification only — no gate, no enforcement, no behaviour change. Service-role-only. Ships dark (no production consumer). Brief: shared-capability-contract-classifier-publisher-path-extension-gate1-v1.md (base: shared-capability-contract-classifier-gate1-v1.md).';

-- ── Grants: service-role-only. REVOKE PUBLIC alone is insufficient — name anon, authenticated
--    (Supabase pg_default_acl makes new public funcs anon/authenticated-executable at birth).
--    Reissuing identical grants on CREATE OR REPLACE is safe/idempotent.
REVOKE ALL ON FUNCTION public.classify_format_capability(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.classify_format_capability(text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.classify_format_capability(text, text, text) TO service_role;
