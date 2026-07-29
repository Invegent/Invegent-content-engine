-- ROLLBACK_20260726072610_gcp_slice3_list_active_clients_add_slug_v1.sql
-- =====================================================================
-- Rollback for 20260726072610_gcp_slice3_list_active_clients_add_slug_v1.sql
--   (renamed from ROLLBACK_gcp_slice3_list_active_clients_add_slug_v1.sql during the
--   2026-07-29 migration-integrity reconciliation — content unchanged, only the paired
--   forward file's name is updated in this header to track the rename)
-- =====================================================================
-- Restores public.list_active_clients() to the EXACT pre-image captured at
-- authoring (the byte source of md5 08c812cacf71d2851115526e9b7e36b9, 650 B).
-- CREATE OR REPLACE preserves ACL; in-txn; touches no data.
--
-- VERIFY BEFORE APPLYING ROLLBACK: the live definition should hash to
--   the post-change image (slug key present). After this rollback the live
--   md5 must return to 08c812cacf71d2851115526e9b7e36b9.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.list_active_clients()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'c', 'public'
AS $function$
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
$function$;
