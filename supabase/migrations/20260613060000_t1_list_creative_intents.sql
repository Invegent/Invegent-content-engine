-- ============================================================================
-- T1 visibility: public.list_creative_intents — read-only list path
-- ============================================================================
-- Brief: docs/briefs/content-studio-t1-visibility.md §6/§10. The ONLY DB object
-- this lane adds. Read-only (STABLE, SELECT-only), SECURITY DEFINER, service-
-- role only — same posture as get_creative_intent_detail. Powers the Content
-- Studio "Ideas" list before the operator drills into one intent.
--
-- Returns parent rows (newest first, one client) + per-child TERMINAL COUNTS so
-- the dashboard can derive the display status on the client (compute-on-display;
-- NO backend rollup, NO trigger, NO write). get_creative_intent_detail is
-- unchanged and remains the drill-down source.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.list_creative_intents(
  p_client_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'm', 'c', 'public'
AS $$
  SELECT COALESCE(jsonb_agg(r ORDER BY (r->>'created_at') DESC), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'intent_id',        ci.intent_id,
      'client_id',        ci.client_id,
      'intent_kind',      ci.intent_kind,
      'created_by',       ci.created_by,
      'created_at',       ci.created_at,
      'stored_status',    ci.status,
      'target_platforms', ci.target_platforms,
      'source_summary',   left(COALESCE(ci.source_material->>'brief', ci.source_material::text), 160),
      -- per-child terminal counts (display-derivation inputs; no persistence)
      'child_total',      COALESCE(cc.total, 0),
      'child_published',  COALESCE(cc.published, 0),
      'child_failed',     COALESCE(cc.failed, 0),
      'child_inflight',   COALESCE(cc.inflight, 0),
      'fanout_rejected',  (
        SELECT count(*) FROM jsonb_array_elements(COALESCE(ci.fanout_result, '[]'::jsonb)) fr
        WHERE fr->>'status' = 'rejected'
      )
    ) AS r
    FROM m.creative_intent ci
    LEFT JOIN LATERAL (
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE COALESCE(pub.published, false)) AS published,
        count(*) FILTER (WHERE NOT COALESCE(pub.published, false)
                           AND (s.status IN ('skipped','failed') OR d.approval_status = 'dead')) AS failed,
        count(*) FILTER (WHERE NOT COALESCE(pub.published, false)
                           AND NOT (s.status IN ('skipped','failed') OR d.approval_status = 'dead')) AS inflight
      FROM m.slot s
      LEFT JOIN m.post_draft d ON d.slot_id = s.slot_id
      LEFT JOIN LATERAL (
        SELECT bool_or(pp.status = 'published') AS published
        FROM m.post_publish pp WHERE pp.post_draft_id = d.post_draft_id
      ) pub ON true
      WHERE s.intent_id = ci.intent_id
    ) cc ON true
    WHERE ci.client_id = p_client_id
    ORDER BY ci.created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200))
  ) z;
$$;

COMMENT ON FUNCTION public.list_creative_intents(uuid, integer) IS
  'T1 visibility (read-only): newest-first creative_intent rows for one client + per-child terminal counts (published/failed/inflight) and fanout_rejected, for client-side display-status derivation. No persistence, no rollup. Service-role only.';

REVOKE EXECUTE ON FUNCTION public.list_creative_intents(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.list_creative_intents(uuid, integer) TO service_role;
