-- Rollback for migration: 20260719072503_create_shared_asset_pool_v0
-- Companion to: supabase/migrations/20260719072503_create_shared_asset_pool_v0.sql
--
-- WHY THIS FILE LIVES IN _harness/ (NOT in supabase/migrations/):
--   A file named 20260719072503_*.rollback.sql inside supabase/migrations/ would share the
--   version prefix 20260719072503 with the forward migration and register as a DUPLICATE
--   migration version to the Supabase CLI (migration name = permanent identity; standing
--   CLAUDE.md gotcha). Standalone SQL artifacts in this repo live under _harness/ (music v0's
--   header cites _harness/ndis_yarns_logo_intake_v0/…apply.sql the same way). This is a
--   reference/executable rollback artifact, not a migration.
--
-- WHAT IT DOES
--   Drops the six shared-asset-pool tables in REVERSE create-order, schema-qualified. All six
--   ship EMPTY (no rows, no RPC, no storage objects, no worker state), and every child FK is
--   ON DELETE CASCADE, so no row orphans and rollback leaves ZERO residue.
--
-- ⛔ APPLY IS PK-GATED. Run only on explicit PK approval, pinned to the forward migration's
--    sha256. Reverse of create-order: children before parents.

DROP TABLE IF EXISTS c.client_asset_profile;
DROP TABLE IF EXISTS m.shared_asset_usage_event;
DROP TABLE IF EXISTS m.shared_asset_review_event;
DROP TABLE IF EXISTS m.shared_asset_license;
DROP TABLE IF EXISTS m.shared_asset_suitability;
DROP TABLE IF EXISTS m.shared_asset;

-- Post-rollback residue check (reference — run manually; expects zero rows for each):
--   SELECT to_regclass('m.shared_asset'),
--          to_regclass('m.shared_asset_suitability'),
--          to_regclass('m.shared_asset_license'),
--          to_regclass('m.shared_asset_review_event'),
--          to_regclass('m.shared_asset_usage_event'),
--          to_regclass('c.client_asset_profile');   -- all NULL => zero residue
