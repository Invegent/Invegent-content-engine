-- ROLLBACK — WS-3 (a) Asset Gap backlog read view v1
-- Pairs with: docs/briefs/artifacts/ws3-asset-gap-backlog-view-v1.sql
--
-- APPLY/ROLLBACK IDENTITY: the apply creates exactly ONE object (ice_ro.asset_gap_backlog)
-- and issues grants scoped to it. This file drops exactly that one object. Grants on a
-- view are dropped with the view, so no separate REVOKE is required; the schema-wide
-- catch-all GRANT in the apply's Section B cannot leave a residue, because it only ever
-- targets relations that exist in ice_ro, and the total is re-asserted below.
--
-- The base tables (m.asset_gap_suggestion, m.asset_gap_observation), the ice_readonly
-- role, and all 14 pre-existing ice_ro views are untouched by both directions.

DROP VIEW IF EXISTS ice_ro.asset_gap_backlog;

-- ============================ post-rollback assertion ==============================
DO $assert$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'ice_ro' AND c.relkind = 'v' AND c.relname = 'asset_gap_backlog';
  IF n <> 0 THEN RAISE EXCEPTION 'ws3 rollback assert: asset_gap_backlog still present'; END IF;

  -- Symmetric with the apply's total=15 check: back to the pre-apply 14.
  SELECT count(*) INTO n FROM information_schema.role_table_grants
    WHERE table_schema = 'ice_ro' AND grantee = 'ice_readonly' AND privilege_type = 'SELECT';
  IF n <> 14 THEN RAISE EXCEPTION 'ws3 rollback assert: expected ice_readonly back at exactly 14 ice_ro SELECT grants, got %', n; END IF;

  IF has_schema_privilege('ice_readonly','m','USAGE') THEN RAISE EXCEPTION 'ws3 rollback assert: ice_readonly holds USAGE on m'; END IF;
  IF has_schema_privilege('ice_readonly','c','USAGE') THEN RAISE EXCEPTION 'ws3 rollback assert: ice_readonly holds USAGE on c'; END IF;

  RAISE NOTICE 'ws3 rollback ok: asset_gap_backlog dropped, ice_ro grant total back to 14, confinement intact.';
END $assert$;
