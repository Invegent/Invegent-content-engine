-- M6 site #1: verify_draft_ownership
-- Replaces actions/portal.ts verifyDraftOwnership (portal) exec_sql call.
-- Used as a pre-check before draft_approve_and_enqueue / draft_set_status
-- to confirm the session's client owns the draft (directly or via digest chain).
-- Return boolean; EXISTS replaces the "Array.isArray(data) && data.length > 0"
-- idiom in the previous exec_sql version.

CREATE OR REPLACE FUNCTION public.verify_draft_ownership(
  p_draft_id uuid,
  p_client_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM m.post_draft pd
    WHERE pd.post_draft_id = p_draft_id
      AND (
        pd.client_id = p_client_id
        OR pd.digest_item_id IN (
          SELECT di.digest_item_id
          FROM   m.digest_item di
          JOIN   m.digest_run  dr ON dr.digest_run_id = di.digest_run_id
          WHERE  dr.client_id = p_client_id
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.verify_draft_ownership(uuid, uuid) TO authenticated, service_role;
