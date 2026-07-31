-- =====================================================================================
-- cc-0090-asset-graduation-read-model-v1-rollback.sql
-- Rollback for cc-0090-asset-graduation-read-model-v1.sql
--
-- Restores exact pre-apply state: the four views did not exist, ice_readonly held no
-- grant on them, and no other object referenced them (nothing else in ICE reads
-- ice_ro.asset_graduation_* yet — this is a new, unreferenced read surface).
--
-- ORDER: DROP VIEW carries its own grants away; no separate REVOKE needed. All four
-- are independent of each other and of every other ice_ro view — order between them
-- does not matter, but they are listed for a clean, auditable diff.
-- =====================================================================================

DROP VIEW IF EXISTS ice_ro.asset_graduation_client_owned;
DROP VIEW IF EXISTS ice_ro.asset_graduation_shared_reachability;
DROP VIEW IF EXISTS ice_ro.asset_graduation_client_pool_policy;
DROP VIEW IF EXISTS ice_ro.asset_graduation_geo_classes;

-- ============================ Post-rollback assertion =================================
DO $assert$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'ice_ro' AND c.relkind = 'v'
      AND c.relname IN ('asset_graduation_client_owned', 'asset_graduation_shared_reachability',
                         'asset_graduation_client_pool_policy', 'asset_graduation_geo_classes');
  IF n <> 0 THEN RAISE EXCEPTION 'cc-0090 rollback assert: % of the 4 views still exist', n; END IF;

  -- Confirm the original G-RO v2 assert's invariant still holds post-rollback: the
  -- 10 original views remain, ice_readonly's grant count returns to exactly 10.
  SELECT count(*) INTO n FROM information_schema.role_table_grants
    WHERE grantee = 'ice_readonly' AND table_schema = 'ice_ro' AND privilege_type = 'SELECT';
  IF n <> 10 THEN RAISE EXCEPTION 'cc-0090 rollback assert: expected ice_readonly back to exactly 10 SELECT grants, got %', n; END IF;

  RAISE NOTICE 'cc-0090 rollback ok: all 4 views dropped, ice_readonly restored to exactly 10 ice_ro SELECT grants.';
END $assert$;
