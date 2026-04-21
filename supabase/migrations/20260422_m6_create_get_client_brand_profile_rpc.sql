-- M6 site #3: get_client_brand_profile
-- Replaces lib/portal-data.ts getClientBrandProfile exec_sql call.
-- Called from (portal)/layout.tsx to render client-specific brand colours/logo
-- on every authenticated portal page.
-- Return shape matches the existing ClientBrandProfile TS type exactly —
-- no downstream code changes needed.

CREATE OR REPLACE FUNCTION public.get_client_brand_profile(
  p_client_id uuid
)
RETURNS TABLE (
  brand_colour_primary   text,
  brand_colour_secondary text,
  accent_hex             text,
  brand_logo_url         text,
  brand_name             text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT brand_colour_primary, brand_colour_secondary, accent_hex,
         brand_logo_url, brand_name
  FROM c.client_brand_profile
  WHERE client_id = p_client_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_brand_profile(uuid) TO authenticated, service_role;
