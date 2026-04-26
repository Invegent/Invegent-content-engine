-- Stage 9.043 — hot_breaking_pool view (§B.12, H3)
--
-- High-fitness, fresh, never-used timely_breaking items in pool, joined
-- to client_content_scope to surface per-client availability.
--
-- Filters:
--   - is_active = true (in pool, not expired)
--   - content_class = 'timely_breaking' (48h freshness window per t.class_freshness_rule)
--   - fitness_score_max >= 80 (high quality on 0..100 scale)
--   - first_seen_at within last 24h (genuinely recent)
--   - reuse_count = 0 (not yet used by any client)
--
-- Used by try_urgent_breaking_fills to decide whether to insert urgent slots.

CREATE OR REPLACE VIEW m.hot_breaking_pool AS
SELECT
  sp.canonical_id,
  sp.vertical_id,
  ccs.client_id,
  c.client_name,
  sp.fitness_score_max,
  sp.content_class,
  sp.source_domain,
  cci.canonical_title,
  cci.canonical_url,
  cci.first_seen_at,
  ROUND((EXTRACT(epoch FROM (NOW() - cci.first_seen_at)) / 3600.0)::numeric, 2)
    AS hours_since_first_seen,
  sp.pool_entered_at,
  sp.reuse_count
FROM m.signal_pool sp
JOIN c.client_content_scope ccs ON ccs.vertical_id = sp.vertical_id
JOIN c.client c ON c.client_id = ccs.client_id AND c.status = 'active'
JOIN f.canonical_content_item cci ON cci.canonical_id = sp.canonical_id
WHERE sp.is_active = true
  AND sp.content_class = 'timely_breaking'
  AND sp.fitness_score_max >= 80
  AND cci.first_seen_at > NOW() - interval '24 hours'
  AND sp.reuse_count = 0
ORDER BY cci.first_seen_at DESC, sp.fitness_score_max DESC;

COMMENT ON VIEW m.hot_breaking_pool IS
  'High-fitness fresh timely_breaking items in pool, never-used, joined to client scope. fitness>=80, first_seen<24h, reuse_count=0. Stage 9.043.';
