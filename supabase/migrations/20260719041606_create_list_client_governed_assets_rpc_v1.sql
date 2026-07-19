-- ============================================================================
-- public.list_client_governed_assets — read-only enumerator for a client's
-- LIVE GOVERNED asset pool (eligible-only)
-- ============================================================================
-- Lane: creative-library Slice-1 dynamic governed-asset keys (CE reader RPC).
-- Brief: docs/briefs/creative-library-slice1-dynamic-keys-brief-v1.md
--        (PK Gate 1 approved 2026-07-19; DECISION-1 = eligible-only).
--
-- PURPOSE
--   Enumerates every governed (LIVE + APPROVED) asset row for one client so the
--   dashboard /creative-library "Governed Assets" panel can replace its hardcoded
--   per-client expectedKeys list with a live read. No existing reader enumerates
--   the governed pool: resolve_brand_assets is whitelist-only (= ANY(p_asset_keys)),
--   resolve_slot_assets emits only the single winner + true rejects, and
--   get_client_creative_governance is enablement-only — so this reader is
--   evidence-forced, not duplicative.
--
-- ELIGIBLE-ONLY SCOPE (DECISION-1)
--   Returns ONLY the governed pool: is_active = true AND
--   (asset_meta->>'approved')::boolean IS TRUE. Fenced / not-yet-approved assets
--   are intentionally excluded (Slice-2 Slot Eligibility already surfaces why-not).
--   This lane only READS; it promotes / un-fences / mutates nothing.
--
-- SAFETY MIRROR
--   Near-exact safety mirror of public.resolve_brand_assets (same table
--   c.client_brand_asset, same c.client join on client_id, same eligibility
--   predicate, same asset_meta key projection) and of the D-B reader
--   public.get_client_creative_governance (ledger 20260719012947): STABLE ·
--   SECURITY DEFINER · pinned empty search_path · fully schema-qualified ·
--   EXECUTE revoked from PUBLIC, anon, authenticated · granted to service_role
--   ONLY. geo_scope is included deliberately (resolve_brand_assets omits it).
--
-- SECURITY POSTURE
--   SECURITY DEFINER (reads schema `c`, which is service-role-only / not REST-
--   exposed; the definer's fixed column projection + WHERE + the deny-by-default
--   ACL below are the only exposure controls — all load-bearing). New `public`
--   functions are BORN anon+authenticated-executable via pg_default_acl —
--   revoking PUBLIC alone is INSUFFICIENT, so anon and authenticated are revoked
--   EXPLICITLY, then EXECUTE is granted to service_role only. The CREATE +
--   REVOKE/GRANT + ACL post-assert are wrapped in an EXPLICIT BEGIN/COMMIT so
--   there is no committed window (not even a brief one) in which
--   anon/authenticated can execute the function.
--
-- force_rls=false OWNER DURABILITY CAVEAT (maintenance note; D-B result §6)
--   The SECURITY DEFINER read of schema `c` depends on this function being owned
--   by a BYPASSRLS / table-owner principal. Applying via apply_migration as
--   `postgres` yields the correct owner. If this function is ever re-created under
--   a NON-privileged owner, the definer read is silently RLS-filtered and the
--   function returns [] rather than erroring — a silent-empty failure mode. Verify
--   ownership (and that force_rls stays false on c.client_brand_asset / c.client)
--   if the pool ever reads empty for a client known to have governed assets.
--
-- ✅ APPLIED 2026-07-19 via apply_migration (harness deny temporarily lifted, then
--    restored) under ledger version 20260719041606; filename reconciled to that
--    applied version (apply_migration mints its own wall-clock version, keeps the
--    name). This repo file is the byte-exact source of the live function, backfilled
--    onto main at the Static-Image Governance Dashboard arc closeout (v5.91) so the
--    repo matches the live ledger. SQL body unchanged from the reviewed/applied text.
--
-- ROLLBACK (reference only — NOT executed by this migration):
--   DROP FUNCTION IF EXISTS public.list_client_governed_assets(text);
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.list_client_governed_assets(p_client_slug text)
RETURNS TABLE (
  asset_key   text,
  asset_type  text,
  asset_name  text,
  asset_url   text,
  usage       text,
  geo_scope   text,
  is_active   boolean,
  approved    boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    cba.asset_meta->>'asset_key'           AS asset_key,
    cba.asset_type                         AS asset_type,
    cba.asset_name                         AS asset_name,
    cba.asset_url                          AS asset_url,
    cba.asset_meta->>'usage'               AS usage,
    cba.asset_meta->>'geo_scope'           AS geo_scope,
    cba.is_active                          AS is_active,
    (cba.asset_meta->>'approved')::boolean AS approved
  FROM c.client_brand_asset cba
  JOIN c.client cl ON cl.client_id = cba.client_id
  WHERE cl.client_slug = p_client_slug
    AND cba.is_active = true
    AND (cba.asset_meta->>'approved')::boolean IS TRUE
  ORDER BY (cba.asset_meta->>'usage'), cba.asset_meta->>'asset_key';
$$;

COMMENT ON FUNCTION public.list_client_governed_assets(text) IS
  'Read-only enumerator for a client''s LIVE GOVERNED (eligible-only) asset pool. Returns rows {asset_key, asset_type, asset_name, asset_url, usage, geo_scope, is_active, approved} from c.client_brand_asset for the requested client_slug where is_active = true AND (asset_meta->>''approved'')::boolean IS TRUE, ordered by usage, asset_key. Service-role only (schema c is not REST-exposed; anon/authenticated EXECUTE revoked). No write path. Mirrors public.resolve_brand_assets / public.get_client_creative_governance safety posture. Consumed by the invegent-dashboard /creative-library Governed Assets panel via its service-role client.';

-- Revoking PUBLIC alone is insufficient — name anon and authenticated explicitly
-- (new public functions are born anon/authenticated-executable via pg_default_acl).
REVOKE ALL   ON FUNCTION public.list_client_governed_assets(text) FROM PUBLIC;
REVOKE ALL   ON FUNCTION public.list_client_governed_assets(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_client_governed_assets(text) TO service_role;

-- In-txn ACL post-assert: fail the whole transaction (nothing commits) if the
-- deny-by-default posture is not exactly right. has_function_privilege /
-- RAISE live in pg_catalog and resolve under the empty search_path.
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.list_client_governed_assets(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.list_client_governed_assets(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'ACL post-assert failed: anon/authenticated can EXECUTE list_client_governed_assets';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.list_client_governed_assets(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'ACL post-assert failed: service_role cannot EXECUTE list_client_governed_assets';
  END IF;
END $$;

COMMIT;
