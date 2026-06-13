-- ============================================================================
-- public.list_active_clients — read-only roster for Content Studio selectors
-- ============================================================================
-- Fixes the hardcoded dashboard CLIENTS constant (only NY + PP) so the Content
-- Studio client selector (incl. the T1 "Ideas" tab) can reach every ACTIVE
-- client — CFW + Invegent included. Read-only (STABLE, SELECT-only),
-- SECURITY DEFINER, service-role only — same posture as list_creative_intents.
-- No write path, no pipeline object touched. Per-platform publish eligibility
-- remains enforced downstream (create_manual_slot / create_creative_intent
-- via m.is_publish_eligible); this list is selector population only.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.list_active_clients()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'c', 'public'
AS $$
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('id', cl.client_id, 'name', nm.name) ORDER BY nm.name),
    '[]'::jsonb
  )
  FROM c.client cl
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT b.brand_name
         FROM c.client_brand_profile b
        WHERE b.client_id = cl.client_id AND b.is_active = true
        ORDER BY b.brand_name
        LIMIT 1),
      'Client ' || left(cl.client_id::text, 8)
    ) AS name
  ) nm
  WHERE cl.status = 'active';
$$;

COMMENT ON FUNCTION public.list_active_clients() IS
  'Read-only roster for Content Studio selectors: active clients (c.client.status=active) with their active brand name (fallback to short id). Service-role only. No write path; per-platform eligibility enforced downstream.';

REVOKE EXECUTE ON FUNCTION public.list_active_clients() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.list_active_clients() TO service_role;
