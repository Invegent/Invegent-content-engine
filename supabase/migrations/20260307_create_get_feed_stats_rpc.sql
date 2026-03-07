-- RPC for feed intelligence agent: returns give-up and success stats for a single source
CREATE OR REPLACE FUNCTION public.get_feed_stats(
  p_source_id     uuid,
  p_since_14d     timestamptz,
  p_since_30d     timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = f, public
AS $$
DECLARE
  v_result jsonb;
  v_give_up_statuses text[] := ARRAY['paywalled','blocked','blocked_permanent','timeout','error'];
BEGIN
  SELECT jsonb_build_object(
    'total_14d',        COUNT(ccb.canonical_id) FILTER (WHERE ccb.created_at >= p_since_14d),
    'give_ups_14d',     COUNT(ccb.canonical_id) FILTER (
                          WHERE ccb.created_at >= p_since_14d
                          AND ccb.fetch_status = ANY(v_give_up_statuses)
                        ),
    'successes_14d',    COUNT(ccb.canonical_id) FILTER (
                          WHERE ccb.created_at >= p_since_14d
                          AND ccb.fetch_status = 'success'
                        ),
    'successes_30d',    COUNT(ccb.canonical_id) FILTER (
                          WHERE ccb.created_at >= p_since_30d
                          AND ccb.fetch_status = 'success'
                        ),
    'give_up_pct_14d',  ROUND(
                          COUNT(ccb.canonical_id) FILTER (
                            WHERE ccb.created_at >= p_since_14d
                            AND ccb.fetch_status = ANY(v_give_up_statuses)
                          )::numeric
                          / NULLIF(COUNT(ccb.canonical_id) FILTER (WHERE ccb.created_at >= p_since_14d), 0) * 100,
                          1
                        )
  ) INTO v_result
  FROM f.ingest_run ir
  JOIN f.raw_content_item rci ON rci.run_id = ir.run_id
  JOIN f.content_item ci ON ci.raw_content_item_id = rci.raw_content_item_id
  JOIN f.content_item_canonical_map cicm ON cicm.content_item_id = ci.content_item_id
  JOIN f.canonical_content_body ccb ON ccb.canonical_id = cicm.canonical_id
  WHERE ir.source_id = p_source_id;

  RETURN COALESCE(v_result, jsonb_build_object(
    'total_14d', 0, 'give_ups_14d', 0, 'successes_14d', 0,
    'successes_30d', 0, 'give_up_pct_14d', 0
  ));
END;
$$;
