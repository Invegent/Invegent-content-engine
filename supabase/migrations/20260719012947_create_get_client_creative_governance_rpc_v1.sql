-- ============================================================================
-- public.get_client_creative_governance — read-only reader for the governed-
-- creative enablement spine (c.client_creative_governance)
-- ============================================================================
-- Lane: D-B (Static-Image Governance Dashboard). Exposes the governance spine to
-- a trusted backend (invegent-dashboard via its service-role client) so the
-- dashboard can surface a governance-enablement panel. TODAY no reader RPC reads
-- this table and schema `c` is NOT REST-exposed — this is the first reader.
--
-- Brief:  docs/briefs/client-creative-governance-reader-rpc-v1.md (PK Gate 1
--         approved 2026-07-19; DEC-1 nullable slug · DEC-2 jsonb · DEC-3 closed
--         column set · DEC-4 name · DEC-5 T3 · DEC-6 DB-RPC-only scope).
-- Mirror: 20260613070000_list_active_clients.sql (RETURNS jsonb / LANGUAGE sql /
--         STABLE / SECURITY DEFINER / search_path / COALESCE / COMMENT / named
--         REVOKE FROM PUBLIC,anon,authenticated / GRANT service_role).
-- Target: 20260707000000_create_client_creative_governance_v1.sql (table DDL +
--         service-fenced posture this reader preserves).
--
-- READ-ONLY / ADDITIVE. Creates ONE new function. No change to any existing
-- object, no data change, no change to c.client_creative_governance. Returns
-- ONLY non-sensitive governance metadata (no id, no client_id, no created_at).
--
-- SECURITY POSTURE
--   SECURITY DEFINER (reads schema `c`, which is service-role-only / not REST-
--   exposed; the definer's fixed column projection + WHERE + the deny-by-default
--   ACL below are the only exposure controls — all load-bearing). New `public`
--   functions are BORN anon+authenticated-executable via pg_default_acl —
--   revoking PUBLIC alone is INSUFFICIENT, so anon and authenticated are revoked
--   EXPLICITLY, then EXECUTE is granted to service_role only. The REVOKE/GRANT
--   are in this same migration (applied in apply_migration's implicit
--   transaction) so there is no committed window in which anon/authenticated can
--   execute the function.
--
-- ⛔ APPLY IS PK-GATED. Prepared, NOT applied — a local draft until PK approves
--    the apply (apply_migration is harness deny-listed → temporary lift).
--
-- POST-APPLY ACL ASSERT (run at the PK-gated apply; db-rls-auditor handoff):
--   SELECT has_function_privilege('anon',
--            'public.get_client_creative_governance(text)', 'EXECUTE')          AS anon_exec,          -- expect false
--          has_function_privilege('authenticated',
--            'public.get_client_creative_governance(text)', 'EXECUTE')          AS authenticated_exec, -- expect false
--          has_function_privilege('service_role',
--            'public.get_client_creative_governance(text)', 'EXECUTE')          AS service_role_exec;  -- expect true
--
-- ROLLBACK (reference only — NOT executed by this migration):
--   DROP FUNCTION IF EXISTS public.get_client_creative_governance(text);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_client_creative_governance(p_client_slug text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'c', 'public'
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'client_slug',              cl.client_slug,
        'format',                   g.format,
        'enabled',                  g.enabled,
        'contract_ref',             g.contract_ref,
        'render_label',             g.render_label,
        'declarative_registry_ref', g.declarative_registry_ref,
        'updated_at',               g.updated_at
      )
      ORDER BY cl.client_slug, g.format
    ),
    '[]'::jsonb
  )
  FROM c.client_creative_governance g
  JOIN c.client cl ON cl.client_id = g.client_id
  WHERE (p_client_slug IS NULL OR cl.client_slug = p_client_slug);
$$;

COMMENT ON FUNCTION public.get_client_creative_governance(text) IS
  'Read-only reader for the governed-creative enablement spine c.client_creative_governance. Returns a jsonb array of {client_slug, format, enabled, contract_ref, render_label, declarative_registry_ref, updated_at}; p_client_slug NULL = all governed clients, else that client only; ordered by client_slug, format. Service-role only (schema c is not REST-exposed; anon/authenticated EXECUTE revoked). No write path. Consumed by the invegent-dashboard governance-enablement panel via its service-role client. Mirror of public.list_active_clients posture.';

-- Revoking PUBLIC alone is insufficient — name anon and authenticated explicitly
-- (new public functions are born anon/authenticated-executable via pg_default_acl).
REVOKE EXECUTE ON FUNCTION public.get_client_creative_governance(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_client_creative_governance(text) TO service_role;
