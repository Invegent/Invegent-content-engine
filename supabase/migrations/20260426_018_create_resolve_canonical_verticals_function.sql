-- Stage 3.018 — m.resolve_canonical_verticals: returns the set of vertical_ids
-- a canonical maps to via active client subscriptions
--
-- Used by:
--   - Trigger 1 (Migration 020) when classifier sets content_class
--   - Stage 4 backfill (next stage) for already-classified canonicals
--   - Manual reconciliation if client_source assignments change
--
-- Logic: canonical → content_item_canonical_map → content_item → client_source (enabled) →
--        client (active) → client_content_scope → vertical_id
-- Filtered to active+enabled subscriptions only. Inactive sources don't generate pool entries.

CREATE OR REPLACE FUNCTION m.resolve_canonical_verticals(p_canonical_id uuid)
RETURNS TABLE(vertical_id integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT ccs.vertical_id
  FROM f.content_item_canonical_map ccm
  JOIN f.content_item ci ON ci.content_item_id = ccm.content_item_id
  JOIN c.client_source cs ON cs.source_id = ci.source_id AND cs.is_enabled = TRUE
  JOIN c.client cl ON cl.client_id = cs.client_id AND cl.status = 'active'
  JOIN c.client_content_scope ccs ON ccs.client_id = cs.client_id
  WHERE ccm.canonical_id = p_canonical_id
  ORDER BY ccs.vertical_id;
$$;

COMMENT ON FUNCTION m.resolve_canonical_verticals(uuid) IS
  'Returns vertical_ids a canonical maps to via active client subscriptions. Reads canonical → content_item → source → client_source (enabled) → client (active) → client_content_scope. Stage 3.018.';
