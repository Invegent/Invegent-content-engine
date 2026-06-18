-- ============================================================================
-- AGP D-01 Gate #3 (Phase 3.1) — Shadow avatar resolver + resolution telemetry
-- ============================================================================
-- Brief: docs/briefs/agp-d01-3-shadow-resolver-telemetry.md (§B, §D).
--
-- AUTHORED, NOT APPLIED. This file is committed local-only as the Phase-3.2
-- artifact. Applying it is a SEPARATE, PK-gated step (via apply_migration).
-- Migration name = permanent identity — a revision gets a NEW number/name,
-- never an in-place SQL change to this name.
--
-- Two ADDITIVE, PRODUCTION-INERT objects:
--   1. r.avatar_resolution_shadow  — one telemetry row per real resolution.
--   2. public.resolve_avatar_shadow(uuid, text, text) RETURNS jsonb
--        — a PURE, READ-ONLY shadow resolver (SECURITY DEFINER, service_role
--          only, SET search_path, fully schema-qualified). It reads ONLY the
--          live candidate filter from c.brand_avatar (+ optional role join to
--          c.brand_stakeholder) and returns a decision record. It NEVER reads
--          or writes production selection state and NEVER mutates anything.
--
-- Neither object is wired into the production selection path. The heygen-worker
-- shadow hook that calls these is itself behind the AVATAR_SHADOW_TELEMETRY
-- feature flag (default OFF) and is fail-open. lookupAvatar / the A2 pin / the
-- live LIMIT-1 branch are byte-unchanged. Rollback = flag-off (no code revert);
-- abandoning = DROP these two additive objects (no production dependency).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Telemetry schema (additive; isolated from production schemas m/c/f/k/t).
-- ----------------------------------------------------------------------------
-- 'r' is an existing shared reconciliation schema; create-if-absent only (idempotent,
-- no-op in prod where it already exists). This lane adds table/function-specific
-- comments only — it intentionally does NOT (re)comment or reframe the shared schema.
CREATE SCHEMA IF NOT EXISTS r;

-- ----------------------------------------------------------------------------
-- 1. r.avatar_resolution_shadow — one row per real (live) resolution event.
--    Columns per brief §D. Append-only telemetry; no production dependency.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS r.avatar_resolution_shadow (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resolved_at                timestamptz NOT NULL DEFAULT now(),
  post_draft_id              uuid REFERENCES m.post_draft (post_draft_id) ON DELETE SET NULL,
  client_id                  uuid,
  stakeholder_role           text,
  render_style               text,
  -- ACTUAL live pick (from lookupAvatar) — recorded, never re-derived.
  live_avatar_id             text,
  live_voice_id              text,
  live_selected_by           text,
  -- Shadow pick under the explicit total order (brief §B.2).
  shadow_avatar_id           text,
  shadow_voice_id            text,
  shadow_rule                text,
  candidate_set              jsonb,
  rejection_reasons          jsonb,
  candidate_count            int,
  agree                      boolean,
  drift_class                text,
  brand_avatar_snapshot_hash text,
  created_by_run_id          uuid
);

COMMENT ON TABLE r.avatar_resolution_shadow IS
  'AGP D-01 Gate-3 telemetry: one row per real heygen-worker avatar resolution capturing the ACTUAL live pick (from lookupAvatar) alongside the shadow resolver decision under an explicit total order. Side-effect-free observer; production selection is never wired to this table. Populated only when AVATAR_SHADOW_TELEMETRY is on (default off); writes are best-effort/fail-open.';
COMMENT ON COLUMN r.avatar_resolution_shadow.live_avatar_id IS
  'The ACTUAL avatar id used for the render (from lookupAvatar) — recorded verbatim, never re-derived, so live truth is exact.';
COMMENT ON COLUMN r.avatar_resolution_shadow.shadow_rule IS
  'Rule the shadow pick fired under: primary | default_host | tiebreak_created_at | tiebreak_id | empty.';
COMMENT ON COLUMN r.avatar_resolution_shadow.agree IS
  'shadow_avatar_id IS NOT DISTINCT FROM live_avatar_id (null-safe parity).';
COMMENT ON COLUMN r.avatar_resolution_shadow.drift_class IS
  'Parity taxonomy (brief §E): none | ordering_drift | marker_drift | candidate_empty | multi_primary | multi_default_host | input_anomaly.';
COMMENT ON COLUMN r.avatar_resolution_shadow.brand_avatar_snapshot_hash IS
  'Hash of the (client, render_style) candidate rows at decision time → deterministic offline replay against candidate_set.';

CREATE INDEX IF NOT EXISTS avatar_resolution_shadow_resolved_at_idx
  ON r.avatar_resolution_shadow (resolved_at DESC);
CREATE INDEX IF NOT EXISTS avatar_resolution_shadow_drift_class_idx
  ON r.avatar_resolution_shadow (drift_class);
CREATE INDEX IF NOT EXISTS avatar_resolution_shadow_client_style_idx
  ON r.avatar_resolution_shadow (client_id, render_style);
CREATE INDEX IF NOT EXISTS avatar_resolution_shadow_post_draft_idx
  ON r.avatar_resolution_shadow (post_draft_id);

-- ----------------------------------------------------------------------------
-- 1b. Security — RLS on, deny-by-default; service_role-only INSERT/SELECT.
--     (The heygen-worker hook uses service_role, which has BYPASSRLS.)
-- ----------------------------------------------------------------------------
ALTER TABLE r.avatar_resolution_shadow ENABLE ROW LEVEL SECURITY;
-- No policies → anon/authenticated get NO row access. service_role via grants.
GRANT USAGE ON SCHEMA r TO service_role;
GRANT SELECT, INSERT ON r.avatar_resolution_shadow TO service_role;
-- Neutralise the inherited redundant SELECT grant from the schema-r default ACL
-- (pg_default_acl on schema r auto-grants SELECT to anon/authenticator on new tables).
-- RLS already denies all anon/authenticator rows; this makes the table's grants
-- strictly service_role-only and avoids introducing an avoidable anon/authenticator grant.
REVOKE SELECT ON r.avatar_resolution_shadow FROM anon, authenticator;
-- Deliberately NO grants to anon/authenticated and no UPDATE/DELETE (append-only).

-- ----------------------------------------------------------------------------
-- 2. public.resolve_avatar_shadow — pure, read-only shadow resolver.
--    SECURITY DEFINER, SET search_path, fully schema-qualified, service_role
--    only — matching the hardened posture of public.list_active_clients /
--    public.list_creative_intents. Reads ONLY the live candidate filter; does
--    NOT read or write any production selection state.
--
--    Candidate set = c.brand_avatar rows matching client_id + is_active +
--    render_style (+ optional role_code via join to c.brand_stakeholder),
--    EXACTLY the live filter (brief §A.1). Shadow pick under the EXPLICIT
--    total order (brief §B.2):
--      ORDER BY is_primary DESC, is_default_host DESC, created_at ASC,
--               brand_avatar_id ASC
--      LIMIT 1
--    — a TOTAL order (brand_avatar_id is unique) so it never ties.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_avatar_shadow(
  p_client_id        uuid,
  p_stakeholder_role text,
  p_render_style     text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'c', 'public'
AS $$
  WITH candidates AS (
    SELECT
      ba.brand_avatar_id,
      ba.stakeholder_id,
      bs.role_code,
      ba.heygen_avatar_id,
      ba.heygen_voice_id,
      ba.is_primary,
      ba.is_default_host,
      ba.created_at
    FROM c.brand_avatar ba
    JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
    WHERE ba.client_id = p_client_id
      AND ba.is_active = true
      AND ba.render_style = p_render_style
      AND (p_stakeholder_role IS NULL OR bs.role_code = p_stakeholder_role)
  ),
  ordered AS (
    SELECT
      c.*,
      row_number() OVER (
        ORDER BY c.is_primary DESC,
                 c.is_default_host DESC,
                 c.created_at ASC,
                 c.brand_avatar_id ASC
      ) AS rn
    FROM candidates c
  ),
  pick AS (
    SELECT * FROM ordered WHERE rn = 1
  )
  SELECT jsonb_build_object(
    'candidate_set', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'brand_avatar_id',  o.brand_avatar_id,
          'stakeholder_id',   o.stakeholder_id,
          'role_code',        o.role_code,
          'heygen_avatar_id', o.heygen_avatar_id,
          'heygen_voice_id',  o.heygen_voice_id,
          'is_primary',       o.is_primary,
          'is_default_host',  o.is_default_host,
          'created_at',       o.created_at,
          'shadow_selected',  (o.rn = 1)
        )
        ORDER BY o.rn
      )
      FROM ordered o
    ), '[]'::jsonb),
    'shadow_pick', (
      SELECT jsonb_build_object(
        'heygen_avatar_id', p.heygen_avatar_id,
        'heygen_voice_id',  p.heygen_voice_id
      )
      FROM pick p
    ),
    'shadow_rule', COALESCE((
      SELECT CASE
        WHEN p.is_primary       THEN 'primary'
        WHEN p.is_default_host  THEN 'default_host'
        WHEN (SELECT count(*) FROM ordered) > 1 THEN 'tiebreak_created_at'
        ELSE 'tiebreak_id'
      END
      FROM pick p
    ), 'empty'),
    'rejection_reasons', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'brand_avatar_id', o.brand_avatar_id,
          'reason', CASE
            WHEN o.rn = 1 THEN 'selected'
            ELSE 'lower_priority_under_total_order'
          END
        )
        ORDER BY o.rn
      )
      FROM ordered o
      WHERE o.rn <> 1
    ), '[]'::jsonb),
    'candidate_count', (SELECT count(*)::int FROM ordered),
    'multi_primary',      ((SELECT count(*) FROM ordered WHERE is_primary)      > 1),
    'multi_default_host', ((SELECT count(*) FROM ordered WHERE is_default_host) > 1)
  );
$$;

COMMENT ON FUNCTION public.resolve_avatar_shadow(uuid, text, text) IS
  'AGP D-01 Gate-3 shadow resolver (read-only, pure): re-derives the live candidate set (c.brand_avatar: client + is_active + render_style + optional role via c.brand_stakeholder) and returns {candidate_set (ordered, with shadow_selected marker + per-row fields), shadow_pick, shadow_rule (primary|default_host|tiebreak_created_at|tiebreak_id|empty), rejection_reasons, candidate_count, multi_primary, multi_default_host} under the explicit total order is_primary DESC, is_default_host DESC, created_at ASC, brand_avatar_id ASC LIMIT 1. Reads NO production selection state; writes nothing. Service-role only.';

REVOKE EXECUTE ON FUNCTION public.resolve_avatar_shadow(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.resolve_avatar_shadow(uuid, text, text) TO service_role;
