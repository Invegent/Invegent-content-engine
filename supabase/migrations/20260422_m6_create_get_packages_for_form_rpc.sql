-- M6 site #5: get_packages_for_form
-- Replaces actions/onboarding.ts getPackagesForForm exec_sql call.
-- Called from /onboard (public unauthenticated route) to render the service
-- package picker on the onboarding form. Data itself is public (service
-- packages on offer); GRANT explicitly includes anon.
-- Different grant pattern from M6 sites #1-#4 because those are authenticated
-- portal paths — don't apply the default blindly.

CREATE OR REPLACE FUNCTION public.get_packages_for_form()
RETURNS TABLE (
  service_package_id uuid,
  package_code       text,
  label              text,
  tagline            text,
  base_price_aud     numeric,
  version            integer,
  channels           json
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.service_package_id,
         sp.package_code,
         sp.label,
         sp.tagline,
         sp.base_price_aud,
         sp.version,
         json_agg(json_build_object(
           'channel_code', spc.channel_code,
           'posts_per_week', COALESCE(spc.posts_per_week_override, pc.posts_per_week),
           'platform', pc.platform,
           'description', pc.description
         )) AS channels
  FROM c.service_package sp
  JOIN c.service_package_channel spc ON spc.service_package_id = sp.service_package_id
  JOIN c.platform_channel pc ON pc.channel_code = spc.channel_code
  WHERE sp.is_current = true
  GROUP BY sp.service_package_id, sp.package_code, sp.label, sp.tagline, sp.base_price_aud, sp.version
  ORDER BY sp.base_price_aud;
$$;

GRANT EXECUTE ON FUNCTION public.get_packages_for_form() TO anon, authenticated, service_role;
