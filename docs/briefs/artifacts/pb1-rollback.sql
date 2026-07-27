-- =====================================================================
-- PB1 rollback — drops the two publish-cadence RPCs + the audit table.
-- Exact signatures matching 20260727150000_pb1_publish_cadence_write_rpc.sql.
-- c.client_publish_profile is untouched by the forward migration DDL, so
-- there is no cap-table change to reverse.
-- =====================================================================

DROP FUNCTION IF EXISTS public.save_publish_cadence(uuid, text, integer, integer, text);
DROP FUNCTION IF EXISTS public.get_publish_cadence(uuid);
DROP TABLE IF EXISTS c.publish_cadence_change_log;
