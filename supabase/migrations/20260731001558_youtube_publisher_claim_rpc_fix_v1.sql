-- youtube-publisher claim-rpc fix v1
-- Root cause: this project's PostgREST fails to resolve column names when a composite
-- or=()/and=() filter is combined with a PATCH/UPDATE request (confirmed method-specific,
-- confirmed column-agnostic, confirmed not a schema-cache issue). youtube-publisher's atomic
-- pre-claim UPDATE used two chained .or() filters and has been failing 100% of attempts with
-- 42703 "column ... does not exist" since at least 2026-07-30 22:15Z, silently blocking all
-- YouTube publishing (both NDIS-Yarns and Property Pulse drafts affected, unrelated to either
-- client's own state). This function moves the exact same WHERE predicate into native SQL,
-- fully bypassing PostgREST's composite-filter translation for mutations. No enforcement
-- semantics changed: NULL final_format_authority remains eligible (the load-bearing NULL
-- handling from the original .or(is.null, neq) is preserved exactly), 'blocked_by_capability'
-- remains excluded, and the claim-staleness TOCTOU guard (15 min TTL) is preserved exactly.
--
-- SECURITY INVOKER (default) deliberately: service_role already holds direct UPDATE on
-- m.post_draft (verified via information_schema.role_table_grants — only service_role and
-- postgres have UPDATE), so no SECURITY DEFINER privilege widening is needed.
-- search_path pinned defensively per house convention even though INVOKER.
--
-- Return column renamed to claimed_post_draft_id (rather than post_draft_id) to sidestep
-- any ambiguity between the OUT/RETURNS TABLE column and the table's own post_draft_id
-- column referenced inside the function body; the caller only checks array length
-- (claimRows?.length), never a field value, so the rename is behavior-neutral.
--
-- draft_format is updated via jsonb_set against the CURRENT row value (read under the
-- UPDATE's row lock) rather than a JS-side spread of a value fetched moments earlier in a
-- separate SELECT — this is a strict improvement (no lost-update risk) and does not change
-- the claim's observable semantics: every other key in draft_format is preserved untouched,
-- exactly as the original `{ ...df, yt_publish_claim_at: nowIso() }` intended.
--
-- The claim timestamp is formatted to match the JS `Date.prototype.toISOString()` shape
-- (YYYY-MM-DDTHH:MI:SS.mmmZ) that the rest of this file's comments document as load-bearing
-- ("ISO-8601-Z; lexicographic == chronological"), so no downstream reader of draft_format
-- sees a differently-shaped timestamp string.

CREATE OR REPLACE FUNCTION public.claim_post_draft_for_youtube_publish(
  p_post_draft_id uuid,
  p_claim_stale_cutoff timestamptz
)
RETURNS TABLE(claimed_post_draft_id uuid)
LANGUAGE sql
SET search_path = ''
AS $$
  UPDATE m.post_draft
  SET draft_format = jsonb_set(
        coalesce(draft_format, '{}'::jsonb),
        '{yt_publish_claim_at}',
        to_jsonb(to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
      ),
      updated_at = now()
  WHERE post_draft_id = p_post_draft_id
    AND video_status = 'generated'
    AND (draft_format->>'youtube_video_id') IS NULL
    AND (final_format_authority IS NULL OR final_format_authority <> 'blocked_by_capability')
    AND (
      (draft_format->>'yt_publish_claim_at') IS NULL
      OR (draft_format->>'yt_publish_claim_at')::timestamptz < p_claim_stale_cutoff
    )
  RETURNING post_draft_id AS claimed_post_draft_id;
$$;

REVOKE ALL ON FUNCTION public.claim_post_draft_for_youtube_publish(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_post_draft_for_youtube_publish(uuid, timestamptz) TO service_role;
REVOKE EXECUTE ON FUNCTION public.claim_post_draft_for_youtube_publish(uuid, timestamptz) FROM anon, authenticated;
