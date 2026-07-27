-- F-VIDEO-RENDER-CLAIM: race-safe claim of pending video drafts.
-- Additive SECURITY DEFINER fn; the house FOR UPDATE SKIP LOCKED idiom (cf. m.fill_pending_slots).
-- No table DDL, no new column. video_status is free-text (no CHECK) so the transient 'rendering'
-- value needs no schema change. Owner = postgres (has UPDATE on m.post_draft). service_role-only EXECUTE.
--
-- Authored LOCAL-ONLY (F-VIDEO-RENDER-CLAIM lane). APPLY IS A PK GATE — this file is not applied by
-- authoring it. Migration name = permanent identity: do NOT reuse this filename with different SQL;
-- a revision gets a new 14-digit timestamp and a distinct name.
CREATE OR REPLACE FUNCTION public.claim_pending_video_drafts(p_limit int DEFAULT 4)
RETURNS TABLE(post_draft_id uuid, client_id uuid, draft_format jsonb, recommended_format text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $func$
  UPDATE m.post_draft p
  SET video_status = 'rendering',
      draft_format = jsonb_set(coalesce(p.draft_format, '{}'::jsonb), '{render_claim_at}', to_jsonb(now()), true),
      updated_at = now()
  WHERE p.post_draft_id IN (
    SELECT c.post_draft_id
    FROM m.post_draft c
    WHERE c.approval_status IN ('approved','published')
      AND c.recommended_format IN ('video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice')
      AND ( c.video_status = 'pending'
         OR ( c.video_status = 'rendering'
              AND (c.draft_format->>'render_claim_at') IS NOT NULL
              AND (c.draft_format->>'render_claim_at')::timestamptz < now() - interval '15 minutes' ) )
      AND ( (c.draft_format->>'video_retry_after') IS NULL
         OR (c.draft_format->>'video_retry_after')::timestamptz <= now() )
    ORDER BY c.updated_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING p.post_draft_id, p.client_id, p.draft_format, p.recommended_format;
$func$;

REVOKE EXECUTE ON FUNCTION public.claim_pending_video_drafts(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_video_drafts(int) TO service_role;
