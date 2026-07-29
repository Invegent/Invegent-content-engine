-- Rollback for 20260730120000_client_production_readiness_queue_rpc_v1.sql.
-- Drops the one new function; no table/column/index was created by the forward
-- migration, so nothing else needs to be undone.
DROP FUNCTION IF EXISTS public.get_client_production_readiness_queue(text);
