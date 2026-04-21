-- M6 site #4: get_portal_drafts_count
-- Replaces lib/portal-data.ts getPortalDraftsCount exec_sql call.
-- Called from (portal)/layout.tsx to render the sidebar "drafts to review"
-- badge on every authenticated portal page.
-- Separate RPC (not folded into get_portal_home_stats) because the layout
-- needs this single field on every page — folding would force every page
-- to fetch the full home-stats jsonb payload.

CREATE OR REPLACE FUNCTION public.get_portal_drafts_count(
  p_client_id uuid
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM m.post_draft
  WHERE client_id = p_client_id
    AND approval_status = 'needs_review';
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_drafts_count(uuid) TO authenticated, service_role;
