-- Stage 7.033 — Per-vertical pool health assessment (D.8/H1)
--
-- Returns jsonb with raw counts + a green/yellow/red health classification.
-- Stage 8's fill function calls this when a slot's pool query returns
-- borderline counts; if health=red, the fill function may relax the
-- min_fitness_threshold one tier (per t.format_quality_policy) before
-- falling back to evergreen.
--
-- IMPORTANT: fitness_score_max in production clusters tightly at 88-98
-- because every classified canonical has at least one well-fitting format.
-- Fitness does NOT discriminate pool quality at the per-vertical level.
-- Health gating uses depth + source diversity only. high_fitness counts
-- items at >= 90 (top-tier on 0..100 scale) but is informational only.
-- Per-slot fitness variance lives in fitness_per_format jsonb, which
-- Stage 8's fill function uses at slot resolution.
--
-- STABLE: reads tables; same inputs same outputs within a transaction.
-- Single-row scan over m.signal_pool filtered by vertical_id.

CREATE OR REPLACE FUNCTION m.check_pool_health(p_vertical_id integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total            integer;
  v_active           integer;
  v_high_fitness     integer;  -- informational only (>= 90 on 0..100 scale)
  v_distinct_sources integer;
  v_distinct_classes integer;
  v_fresh_48h        integer;
  v_max_fitness      numeric;
  v_avg_fitness      numeric;
  v_health           text;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_active),
    COUNT(*) FILTER (WHERE is_active AND fitness_score_max >= 90),
    COUNT(DISTINCT source_domain) FILTER (WHERE is_active AND source_domain IS NOT NULL),
    COUNT(DISTINCT content_class) FILTER (WHERE is_active),
    COUNT(*) FILTER (WHERE is_active AND pool_entered_at > NOW() - interval '48 hours'),
    MAX(fitness_score_max) FILTER (WHERE is_active),
    AVG(fitness_score_max) FILTER (WHERE is_active)
  INTO
    v_total,
    v_active,
    v_high_fitness,
    v_distinct_sources,
    v_distinct_classes,
    v_fresh_48h,
    v_max_fitness,
    v_avg_fitness
  FROM m.signal_pool
  WHERE vertical_id = p_vertical_id;

  -- Health gates on depth + source diversity ONLY.
  -- Fitness in production is narrowly distributed (88-98 across all entries)
  -- so fitness gating doesn't discriminate.
  v_health := CASE
    WHEN v_active >= 50 AND v_distinct_sources >= 3 THEN 'green'
    WHEN v_active >= 20 AND v_distinct_sources >= 2 THEN 'yellow'
    ELSE 'red'
  END;

  RETURN jsonb_build_object(
    'vertical_id',       p_vertical_id,
    'total',             v_total,
    'active',            v_active,
    'high_fitness',      v_high_fitness,
    'distinct_sources',  v_distinct_sources,
    'distinct_classes',  v_distinct_classes,
    'fresh_48h',         v_fresh_48h,
    'max_fitness',       v_max_fitness,
    'avg_fitness',       ROUND(COALESCE(v_avg_fitness, 0)::numeric, 2),
    'health',            v_health,
    'checked_at',        NOW()
  );
END;
$$;

COMMENT ON FUNCTION m.check_pool_health(integer) IS
  'D.8/H1 per-vertical pool health. Returns jsonb {total, active, high_fitness (>=90 of 100), distinct_sources, distinct_classes, fresh_48h, max_fitness, avg_fitness, health, checked_at}. health = green | yellow | red, gated on depth + source diversity only (fitness in production clusters narrowly so does not discriminate). STABLE. Stage 7.033 (fix-up: drop fitness gating).';
