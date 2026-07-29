-- ============================================================================
-- RECONCILIATION BACKFILL (cc-0087, 2026-07-29): this file was NOT originally
-- committed to git under this name/version. It reproduces exact content that was
-- actually applied LIVE to project mbkmaxqhsohbtwsqolns, sourced from:
--   docs/briefs/artifacts/r3a-resolver-shadow-migration-v4.sql
-- Any 'NOT APPLIED' / 'PREPARED' / 'DESIGN' framing below is the ORIGINAL packet's
-- pre-apply language, preserved for historical fidelity -- it is STALE; this
-- migration IS live (confirmed against the Supabase migration ledger and, where
-- checked, live pg_get_functiondef/information_schema state). See
-- docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md.
-- ============================================================================

-- =====================================================================
-- R3a — resolver enforcement, SHADOW posture.  Migration artifact.
--
-- ⚠⚠ NOT APPLIED. NOT YET A MIGRATION. ⚠⚠
-- Authored OUTSIDE supabase/migrations/ so no tooling picks it up. On PK
-- approval at the R3a apply gate it moves to supabase/migrations/ with a fresh
-- version + distinct name (migration name is permanent identity).
--
-- CONTRACT: resolver-enforcement-r3-contract-gate1-v1.md (a354a15…), model B
-- (DB function = single governed resolver), D1 (natural-tuple identity),
-- SHADOW-FIRST. Precedence: 1 planner(fixed) · 2 policy restriction ·
-- 3 advisor iff active+publishable+policy-supported · 4 deterministic fallback.
--
-- SHADOW POSTURE — the resolver's decision is written to NEW additive columns
-- ONLY. It does NOT touch m.post_draft.recommended_format, whose live writer
-- remains ai-worker (= advisor pick) until a SEPARATE R3c flip gate. This
-- migration changes NO production output.
--
-- Two parts:
--   Part 1 — additive nullable columns on m.post_draft (no consumer change).
--   Part 2 — m.resolve_final_format(...) : SECURITY DEFINER, DETERMINISTIC
--            (no now()/random()), grant-disciplined for the born-anon trap.
--
-- DETERMINISM: the decision is a pure function of the inputs + the CURRENT
-- policy snapshot (t.platform_format_mix_default / t."5.3_content_format" /
-- the two format_*_policy tables + the client's format config). No now(),
-- no random(). format_resolved_at is stamped by the CALLER (ai-worker), never
-- inside the resolver, so the resolver stays replayable — matching
-- m.allocate_week_formats' discipline.
--
-- ROLLBACK (single block, additive-only, no data mutated):
--   DROP FUNCTION IF EXISTS m.resolve_final_format(uuid, text, text, text, text);
--   ALTER TABLE m.post_draft
--     DROP COLUMN IF EXISTS advisor_format, DROP COLUMN IF EXISTS requested_format,
--     DROP COLUMN IF EXISTS format_mode, DROP COLUMN IF EXISTS shadow_resolved_format,
--     DROP COLUMN IF EXISTS final_format_authority, DROP COLUMN IF EXISTS final_format_reason,
--     DROP COLUMN IF EXISTS format_policy_version, DROP COLUMN IF EXISTS format_resolved_at,
--     DROP COLUMN IF EXISTS resolver_evidence;
-- ROLLBACK IS AUTHORITATIVE + IDEMPOTENT AND ZERO-DATA: the §Part-1 pre-assertion below proves
-- apply CREATED all nine (none pre-existed), so dropping them removes only columns this migration
-- owns and never any operator data. IF EXISTS makes the rollback safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PART 1 — additive nullable columns on m.post_draft.
-- All nullable, no default, no backfill → zero consumer impact. recommended_format
-- and recommended_reason are UNCHANGED and remain the live authority in shadow.
--
-- v2/v3 FIX (apply-harness check-7 asymmetry): apply now OWNS creation authoritatively for
--   EVERY object it creates — the nine columns AND the resolver function (v3 closed the residual
--   the v2 run flagged: the function was still on CREATE OR REPLACE with no pre-existence guard).
--   (1) A named pre-apply assertion fail-CLOSES if ANY of the nine column names OR the 5-arg
--       function already exists (the function checked via to_regprocedure on its SIGNATURE — v4;
--       signature-exact and version-robust), so the migration can never silently no-op/overwrite
--       a pre-existing object while the rollback would drop it + its data/definition.
--   (2) Plain ADD COLUMN + plain CREATE FUNCTION (neither `IF NOT EXISTS` nor `OR REPLACE`) —
--       apply is authoritative about exactly what it created; a collision aborts loudly.
--   Rollback uses DROP COLUMN IF EXISTS + DROP FUNCTION IF EXISTS (idempotent). Live pre-check
--   (2026-07-25): 0 of 9 columns present AND the 5-arg function absent.
-- ---------------------------------------------------------------------

-- §Part-1 pre-assertion — NAMED, fail-closed. Aborts the whole migration if any object this
-- migration authoritatively CREATES already exists — the nine m.post_draft columns AND the
-- resolver function m.resolve_final_format(uuid,text,text,text,text). This makes apply
-- authoritative over BOTH object classes uniformly (v3 fix: check-7 previously covered only the
-- columns, leaving the CREATE-OR-REPLACE function able to silently overwrite a pre-existing
-- definition that rollback's unconditional DROP would then remove without restoring).
-- Live pre-check (2026-07-25): 0 of 9 columns present AND the 5-arg function absent.
DO $r3a_precheck$
DECLARE v_pre text[];
BEGIN
  SELECT array_agg(column_name) INTO v_pre
  FROM information_schema.columns
  WHERE table_schema = 'm' AND table_name = 'post_draft'
    AND column_name IN ('advisor_format','requested_format','format_mode','shadow_resolved_format',
                        'final_format_authority','final_format_reason','format_policy_version',
                        'format_resolved_at','resolver_evidence');
  IF v_pre IS NOT NULL THEN
    RAISE EXCEPTION 'R3a ABORT: shadow column(s) already exist on m.post_draft: % — apply is not authoritative; resolve before proceeding (rollback would otherwise drop pre-existing columns/data).', v_pre;
  END IF;

  -- Function existence keyed on the SIGNATURE via to_regprocedure (v4) — signature-exact,
  -- independent of parameter names and of pg_get_function_identity_arguments' version-dependent
  -- output format. Returns NULL when absent. (v3 used an identity-args string compare; on this
  -- instance identity-args includes names so it worked, but to_regprocedure is the unambiguous,
  -- version-robust form and removes any param-name fragility.)
  IF to_regprocedure('m.resolve_final_format(uuid, text, text, text, text)') IS NOT NULL THEN
    RAISE EXCEPTION 'R3a ABORT: m.resolve_final_format(uuid,text,text,text,text) already exists — apply is not authoritative over the function; a CREATE here would overwrite a prior definition that rollback''s DROP would remove without restoring. Resolve before proceeding.';
  END IF;
END
$r3a_precheck$;

ALTER TABLE m.post_draft
  ADD COLUMN advisor_format         text,        -- the Advisor's pick (was written straight to recommended_format)
  ADD COLUMN requested_format       text,        -- planner demand carried on the slot (NULL until W1/R3b)
  ADD COLUMN format_mode            text,        -- 'fixed'|'policy'|'manual'|'legacy' (NULL ⇒ legacy)
  ADD COLUMN shadow_resolved_format text,        -- the resolver's EFFECTIVE format in shadow (NEVER recommended_format in R3a)
  ADD COLUMN final_format_authority  text,        -- 'planner'|'policy'|'advisor'|'operator'|'resolver_fallback'|'governed_skip'
  ADD COLUMN final_format_reason     text,        -- governed enum + detail
  ADD COLUMN format_policy_version   text,        -- mix/policy identity in force at resolution
  ADD COLUMN format_resolved_at      timestamptz, -- stamped by the CALLER, not the resolver
  ADD COLUMN resolver_evidence       jsonb;       -- full emitted decision trail (support/policy evidence, gate predicates, fallback flag)

COMMENT ON COLUMN m.post_draft.shadow_resolved_format IS
  'R3a SHADOW: the governed resolver''s effective format. Compared against recommended_format '
  '(the live advisor pick) to measure the shadow delta before the R3c flip. NOT read by any '
  'renderer/publisher in R3a.';

-- ---------------------------------------------------------------------
-- PART 2 — the governed resolver (shadow-callable).
-- ---------------------------------------------------------------------
-- Plain CREATE (not CREATE OR REPLACE) — apply OWNS the function authoritatively, symmetric with
-- the plain ADD COLUMN above. The pre-assertion guarantees absence; a collision aborts loudly.
CREATE FUNCTION m.resolve_final_format(
  p_client_id        uuid,
  p_platform         text,
  p_requested_format text,   -- planner demand (fixed pick / policy allocation / operator pick); may be NULL
  p_format_mode      text,   -- 'fixed'|'policy'|'manual'|'legacy'; NULL ⇒ 'legacy'
  p_advisor_format   text    -- the Advisor's pick; may be NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_mode        text := lower(coalesce(nullif(trim(p_format_mode), ''), 'legacy'));
  v_eligible    text[];          -- eligible format keys for (client, platform), share DESC, key ASC
  v_shares      jsonb;           -- [{key, share, valid}] evidence for the platform
  v_fallback    text;            -- deterministic fallback = highest-share eligible
  v_policy_ver  text;
  v_effective   text;
  v_authority   text;
  v_reason      text;
  v_fellback    boolean := false;
  v_req_ok      boolean;
  v_adv_ok      boolean;
BEGIN
  IF p_client_id IS NULL OR p_platform IS NULL THEN
    RETURN jsonb_build_object(
      'planner_requested_format', p_requested_format,
      'effective_format', NULL,
      'authority', 'governed_skip',
      'reason', 'missing_client_or_platform',
      'fallback_occurred', true,
      'support_evidence', '[]'::jsonb,
      'policy_evidence', jsonb_build_object('eligible', '[]'::jsonb),
      'policy_version', NULL,
      'gate_predicates', jsonb_build_object(
        'platform_support', 'not_evaluated', 'dual_policy', 'not_evaluated',
        'client_enabled', 'not_evaluated', 'in_mix', 'not_evaluated',
        'buildable', 'not_evaluated_r3a', 'publisher_path', 'not_evaluated_r3a',
        'template_provider', 'not_evaluated_r3a')
    );
  END IF;

  -- Eligible policy set for (client, platform): mirrors m.build_weekly_demand_grid's
  -- policy-backed ∩ platform_support ∩ client-enabled set. Deterministic ordering.
  WITH cand AS (
    SELECT d.ice_format_key, d.default_share_pct AS share
    FROM t.platform_format_mix_default d
    WHERE d.is_current = true AND d.platform = p_platform
    UNION
    SELECT o.ice_format_key, NULL::numeric
    FROM c.client_format_mix_override o
    WHERE o.client_id = p_client_id AND o.is_current = true AND o.platform = p_platform
  ),
  cand_share AS (
    SELECT c2.ice_format_key,
           COALESCE(
             (SELECT o.override_share_pct FROM c.client_format_mix_override o
               WHERE o.client_id = p_client_id AND o.is_current = true
                 AND o.platform = p_platform AND o.ice_format_key = c2.ice_format_key LIMIT 1),
             max(c2.share), 0) AS share
    FROM cand c2 GROUP BY c2.ice_format_key
  ),
  gated AS (
    SELECT cs.ice_format_key, cs.share,
           COALESCE((f.platform_support ->> p_platform)::boolean, false) AS p1_support,
           EXISTS (SELECT 1 FROM t.format_synthesis_policy sp
                    WHERE sp.ice_format_key = cs.ice_format_key AND sp.is_current = true)
           AND EXISTS (SELECT 1 FROM t.format_quality_policy qp
                    WHERE qp.ice_format_key = cs.ice_format_key AND qp.is_current = true) AS p2_dual,
           EXISTS (SELECT 1 FROM c.client_format_config cfg
                    WHERE cfg.client_id = p_client_id AND cfg.ice_format_key = cs.ice_format_key
                      AND cfg.is_enabled = true
                      AND (cfg.platform = p_platform
                           OR (cfg.platform IS NULL AND NOT EXISTS (
                                 SELECT 1 FROM c.client_format_config c3
                                 WHERE c3.client_id = p_client_id AND c3.ice_format_key = cs.ice_format_key
                                   AND c3.platform = p_platform)))) AS p3_client
    FROM cand_share cs
    LEFT JOIN t."5.3_content_format" f ON f.ice_format_key = cs.ice_format_key
  )
  SELECT
    array_agg(ice_format_key ORDER BY share DESC NULLS LAST, ice_format_key ASC)
      FILTER (WHERE p1_support AND p2_dual AND p3_client),
    jsonb_agg(jsonb_build_object('key', ice_format_key, 'share', share,
                'p1_support', p1_support, 'p2_dual', p2_dual, 'p3_client', p3_client)
              ORDER BY share DESC NULLS LAST, ice_format_key ASC)
  INTO v_eligible, v_shares
  FROM gated;

  v_eligible := COALESCE(v_eligible, ARRAY[]::text[]);
  v_fallback := v_eligible[1];  -- NULL if the eligible set is empty

  -- Deterministic policy identity: latest effective_from of the current platform mix,
  -- plus whether the client carries an override. No now(), no random().
  SELECT 'mix@' || COALESCE(max(d.effective_from)::text, 'none')
         || CASE WHEN EXISTS (SELECT 1 FROM c.client_format_mix_override o
                               WHERE o.client_id = p_client_id AND o.is_current = true
                                 AND o.platform = p_platform)
                 THEN '|override' ELSE '' END
    INTO v_policy_ver
  FROM t.platform_format_mix_default d
  WHERE d.is_current = true AND d.platform = p_platform;

  v_req_ok := p_requested_format IS NOT NULL AND p_requested_format = ANY(v_eligible);
  v_adv_ok := p_advisor_format   IS NOT NULL AND p_advisor_format   = ANY(v_eligible);

  -- ---- Precedence ----
  IF v_mode = 'fixed' THEN
    IF v_req_ok THEN
      v_effective := p_requested_format; v_authority := 'planner';
      v_reason := 'planner_fixed_applied';
    ELSIF v_fallback IS NOT NULL THEN
      v_effective := v_fallback; v_authority := 'resolver_fallback'; v_fellback := true;
      v_reason := 'fixed_format_ineligible:' || COALESCE(p_requested_format, 'null');
    ELSE
      v_effective := NULL; v_authority := 'governed_skip'; v_fellback := true;
      v_reason := 'no_eligible_format';
    END IF;

  ELSIF v_mode = 'manual' THEN
    IF v_req_ok THEN
      v_effective := p_requested_format; v_authority := 'operator';
      v_reason := 'operator_manual_applied';
    ELSIF v_fallback IS NOT NULL THEN
      v_effective := v_fallback; v_authority := 'resolver_fallback'; v_fellback := true;
      v_reason := 'manual_format_ineligible:' || COALESCE(p_requested_format, 'null');
    ELSE
      v_effective := NULL; v_authority := 'governed_skip'; v_fellback := true;
      v_reason := 'no_eligible_format';
    END IF;

  ELSIF v_mode = 'policy' THEN
    IF v_adv_ok THEN
      v_effective := p_advisor_format; v_authority := 'advisor';
      v_reason := 'advisor_within_policy';
    ELSIF v_fallback IS NOT NULL THEN
      v_effective := v_fallback; v_authority := 'policy'; v_fellback := true;
      v_reason := 'advisor_out_of_policy:' || COALESCE(p_advisor_format, 'null');
    ELSE
      v_effective := NULL; v_authority := 'governed_skip'; v_fellback := true;
      v_reason := 'no_eligible_format';
    END IF;

  ELSE  -- 'legacy' (or unknown mode ⇒ legacy)
    IF v_adv_ok THEN
      v_effective := p_advisor_format; v_authority := 'advisor';
      v_reason := 'legacy_advisor_applied';
    ELSIF v_fallback IS NOT NULL THEN
      v_effective := v_fallback; v_authority := 'resolver_fallback'; v_fellback := true;
      v_reason := 'legacy_advisor_ineligible:' || COALESCE(p_advisor_format, 'null');
    ELSE
      v_effective := NULL; v_authority := 'governed_skip'; v_fellback := true;
      v_reason := 'no_eligible_format';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'planner_requested_format', p_requested_format,
    'effective_format',         v_effective,
    'authority',                v_authority,
    'reason',                   v_reason,
    'fallback_occurred',        v_fellback,
    'support_evidence',         COALESCE(v_shares, '[]'::jsonb),
    'policy_evidence',          jsonb_build_object(
                                  'mode', v_mode,
                                  'eligible', to_jsonb(v_eligible),
                                  'requested_eligible', v_req_ok,
                                  'advisor_eligible', v_adv_ok,
                                  'deterministic_fallback', v_fallback),
    'policy_version',           v_policy_ver,
    'gate_predicates',          jsonb_build_object(
                                  'platform_support', 'evaluated',
                                  'dual_policy',      'evaluated',
                                  'client_enabled',   'evaluated',
                                  'in_mix',           'evaluated',
                                  -- honest: these three §6.3 predicates are code/registry-side,
                                  -- not evaluable in the DB resolver. Recorded so the R3c flip
                                  -- gate knows to complete them before live authority.
                                  'buildable',        'not_evaluated_r3a',
                                  'publisher_path',   'not_evaluated_r3a',
                                  'template_provider','not_evaluated_r3a')
  );
END;
$function$;

ALTER FUNCTION m.resolve_final_format(uuid, text, text, text, text) OWNER TO postgres;

-- Born-anon trap: REVOKE from PUBLIC, anon AND authenticated; grant only the
-- worker role (service_role). Owner postgres.
REVOKE ALL ON FUNCTION m.resolve_final_format(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION m.resolve_final_format(uuid, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION m.resolve_final_format(uuid, text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION m.resolve_final_format(uuid, text, text, text, text) TO service_role;

COMMENT ON FUNCTION m.resolve_final_format(uuid, text, text, text, text) IS
  'cc-0079 R3 governed format resolver (SHADOW in R3a). Deterministic (no now()/random()); '
  'decides among planner(fixed) > policy restriction > advisor(iff eligible) > deterministic '
  'fallback, using the current mix/policy snapshot. Returns the full emitted decision trail. '
  'In R3a its output is written to m.post_draft.shadow_resolved_format + provenance columns '
  'ONLY; it does NOT write recommended_format (advisor remains live authority until R3c).';
