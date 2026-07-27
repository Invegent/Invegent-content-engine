-- ============================================================================
-- pa1 ROLLBACK — Per-(client,platform) schedule-cap override store
-- ============================================================================
-- Reverses 20260727140000_pa1_client_schedule_cap_override_store.sql.
-- Drop the RPCs first (they reference the table), then the table.
-- Idempotent: IF EXISTS everywhere.
-- ============================================================================

DROP FUNCTION IF EXISTS public.save_schedule_cap_override(uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_schedule_caps(uuid);
DROP TABLE IF EXISTS c.client_schedule_cap_override;
