-- M6 site #2: get_client_name_by_id
-- Replaces lib/portal-auth.ts getPortalSession's client_name lookup.
-- Called during session resolution, before any dashboard data RPCs.
-- Separate RPC (not folded into get_portal_home_stats / get_portal_dashboard)
-- because it runs pre-dashboard and those RPCs have heavier payloads.

CREATE OR REPLACE FUNCTION public.get_client_name_by_id(
  p_client_id uuid
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_name
  FROM c.client
  WHERE client_id = p_client_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_name_by_id(uuid) TO authenticated, service_role;
