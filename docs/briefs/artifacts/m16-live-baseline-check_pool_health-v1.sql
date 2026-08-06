-- LIVE BASELINE — m.check_pool_health(integer) — pg_get_functiondef fresh read
-- Read via: SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n
--   ON n.oid=p.pronamespace WHERE n.nspname='m' AND p.proname='check_pool_health'
-- Read at: 2026-08-06 (control-tower orchestrator, R0 catalog path via db-read.py —
--   pg_proc/pg_get_functiondef is world-readable regardless of schema USAGE grants).
-- Project: mbkmaxqhsohbtwsqolns. This is ground truth for the M16 fix — do not trust
-- any migration-file copy of this function without a fresh live read (migration
-- ledger can drift from git per the standing CLAUDE.md/memory gotcha).
-- Per functiondef-gate discipline: this file is the REQUIRED pre-change baseline,
-- included in the NOT_APPLIED artifact's header so a reviewer can diff old vs new.

CREATE OR REPLACE FUNCTION m.check_pool_health(p_vertical_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
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
    COUNT(*) FILTER (WHERE is_active AND fitness_score_max >= 90),  -- top-tier (informational)
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
  -- so fitness gating doesn't discriminate. The fill function uses
  -- fitness_per_format jsonb at per-slot resolution where the variance lives.
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
$function$

-- m.signal_pool columns confirmed live (pg_attribute read, same session):
--   pool_id uuid · canonical_id uuid · vertical_id integer · content_class text ·
--   pool_entered_at timestamptz · pool_expires_at timestamptz · is_active boolean ·
--   fitness_per_format jsonb · fitness_score_max numeric · reuse_count integer ·
--   last_used_at timestamptz · source_domain text · source_count integer ·
--   created_at timestamptz · updated_at timestamptz
-- fitness_per_format EXISTS on the base table and is currently NEVER READ by
-- check_pool_health() — this is the exact gap Option C needs to close, and it is
-- also the same jsonb column m.fill_pending_slots' own Option-B defect should be
-- reading from (per its own code comment's documented intent, quoted above).

-- Live confirmation, same day, both verticals CFW+NDIS share (11, 12):
--   check_pool_health(11) = {"health":"green","active":70,"distinct_sources":49,
--     "total":1582,"avg_fitness":88.37,"max_fitness":98,"high_fitness":5,
--     "distinct_classes":3,"fresh_48h":13,"checked_at":"2026-08-06T03:55:21Z"}
--   check_pool_health(12) = byte-identical except vertical_id label (same pool).
-- This is the live number the fix must change FROM (currently green, masking the
-- body-health/reuse-decay starvation documented in the S1 diagnosis).
