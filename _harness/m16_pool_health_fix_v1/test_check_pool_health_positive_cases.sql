-- M16 Option C hermetic proof — POSITIVE CASES (healthy pool stays green;
-- a distinctly different degraded shape correctly reads non-green).
-- Standalone / self-contained (same schema/function setup pattern as
-- test_check_pool_health_defect_regression.sql — kept duplicated per file so
-- each hermetic file is independently runnable against a fresh scratch DB,
-- matching the _harness/cc0046_hermetic/*.sql house idiom).
-- NOT RUN in this environment — no psql/local Postgres available here.
--
-- PROVES:
--   1. A genuinely healthy pool (mostly fresh rows that DO pass body-health,
--      good source diversity, no reuse-decay) still reads 'green' under the
--      NEW function -- i.e. the fix does not indiscriminately flip every
--      pool to red/yellow, only ones that are actually usable-thin.
--   2. A pool shaped DIFFERENTLY from the exact CFW fixture (fewer active
--      rows, a mix of pass/fail body-health, all fresh/undecayed -- no
--      reuse-decay at all, unlike CFW's shape) lands in the 'yellow' band,
--      proving the new active_usable signal generalizes beyond one
--      hard-coded scenario, not just the literal CFW numbers, and that the
--      gate is a real three-tier gate (not a green/red binary in practice).

\set ON_ERROR_STOP on
\pset pager off

DROP SCHEMA IF EXISTS m CASCADE;
DROP SCHEMA IF EXISTS f CASCADE;
DROP SCHEMA IF EXISTS t CASCADE;
CREATE SCHEMA m;
CREATE SCHEMA f;
CREATE SCHEMA t;

CREATE TABLE m.signal_pool (
  pool_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id      uuid NOT NULL,
  vertical_id       integer NOT NULL,
  content_class     text,
  pool_entered_at   timestamptz NOT NULL DEFAULT now(),
  pool_expires_at   timestamptz,
  is_active         boolean NOT NULL DEFAULT true,
  fitness_per_format jsonb,
  fitness_score_max numeric,
  reuse_count       integer NOT NULL DEFAULT 0,
  last_used_at      timestamptz,
  source_domain     text,
  source_count      integer,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE f.canonical_content_body (
  canonical_id   uuid PRIMARY KEY,
  fetch_status   text,
  extracted_text text,
  word_count     integer
);

CREATE TABLE t.reuse_penalty_curve (
  reuse_count_min integer NOT NULL,
  reuse_count_max integer,
  fitness_multiplier numeric NOT NULL,
  is_current boolean NOT NULL DEFAULT true
);
INSERT INTO t.reuse_penalty_curve VALUES
  (0, 0, 1.00, true),
  (1, 1, 0.85, true),
  (2, 2, 0.65, true),
  (3, NULL, 0.50, true);

-- ── NEW check_pool_health() body (Option C) — copied verbatim, must stay in
-- sync with the migration file's Section 1 and the sibling regression test.
CREATE OR REPLACE FUNCTION m.check_pool_health(p_vertical_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_total               integer;
  v_active               integer;
  v_high_fitness         integer;
  v_distinct_sources     integer;
  v_distinct_classes     integer;
  v_fresh_48h            integer;
  v_max_fitness          numeric;
  v_avg_fitness          numeric;
  v_health               text;
  v_body_health_pass     integer;
  v_active_usable        integer;
  v_body_health_pass_rate numeric;
  v_decay_healthy_floor  CONSTANT numeric := 0.75;
BEGIN
  WITH pool_rows AS (
    SELECT
      sp.pool_id,
      sp.is_active,
      sp.source_domain,
      sp.content_class,
      sp.pool_entered_at,
      sp.fitness_score_max,
      sp.reuse_count,
      COALESCE(rpc.fitness_multiplier, 1.0) AS reuse_multiplier,
      EXISTS (
        SELECT 1
        FROM f.canonical_content_body ccb
        WHERE ccb.canonical_id = sp.canonical_id
          AND ccb.fetch_status = 'success'
          AND ccb.extracted_text IS NOT NULL
          AND LENGTH(TRIM(ccb.extracted_text)) >= 200
          AND COALESCE(ccb.word_count, 0) >= 300
      ) AS body_health_pass
    FROM m.signal_pool sp
    LEFT JOIN t.reuse_penalty_curve rpc
      ON sp.reuse_count >= rpc.reuse_count_min
      AND (sp.reuse_count <= rpc.reuse_count_max OR rpc.reuse_count_max IS NULL)
      AND rpc.is_current = true
    WHERE sp.vertical_id = p_vertical_id
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_active),
    COUNT(*) FILTER (WHERE is_active AND fitness_score_max >= 90),
    COUNT(DISTINCT source_domain) FILTER (WHERE is_active AND source_domain IS NOT NULL),
    COUNT(DISTINCT content_class) FILTER (WHERE is_active),
    COUNT(*) FILTER (WHERE is_active AND pool_entered_at > NOW() - interval '48 hours'),
    MAX(fitness_score_max) FILTER (WHERE is_active),
    AVG(fitness_score_max) FILTER (WHERE is_active),
    COUNT(*) FILTER (WHERE is_active AND body_health_pass),
    COUNT(*) FILTER (WHERE is_active AND body_health_pass AND reuse_multiplier >= v_decay_healthy_floor)
  INTO
    v_total, v_active, v_high_fitness, v_distinct_sources, v_distinct_classes,
    v_fresh_48h, v_max_fitness, v_avg_fitness, v_body_health_pass, v_active_usable
  FROM pool_rows;

  v_body_health_pass_rate := ROUND(
    COALESCE(v_body_health_pass, 0)::numeric / NULLIF(v_active, 0), 4
  );

  v_health := CASE
    WHEN v_active_usable >= 50 AND v_distinct_sources >= 3 THEN 'green'
    WHEN v_active_usable >= 20 AND v_distinct_sources >= 2 THEN 'yellow'
    ELSE 'red'
  END;

  RETURN jsonb_build_object(
    'vertical_id',            p_vertical_id,
    'total',                  v_total,
    'active',                 v_active,
    'high_fitness',           v_high_fitness,
    'distinct_sources',       v_distinct_sources,
    'distinct_classes',       v_distinct_classes,
    'fresh_48h',               v_fresh_48h,
    'max_fitness',             v_max_fitness,
    'avg_fitness',              ROUND(COALESCE(v_avg_fitness, 0)::numeric, 2),
    'health',                   v_health,
    'checked_at',                NOW(),
    'active_usable',             v_active_usable,
    'body_health_pass_count',    v_body_health_pass,
    'body_health_pass_rate',     COALESCE(v_body_health_pass_rate, 0),
    'decay_healthy_floor',       v_decay_healthy_floor
  );
END;
$function$;
-- ── end function body ───────────────────────────────────────────────────

-- ── Fixture A, vertical_id 9002: GENUINELY HEALTHY pool ─────────────────
-- 60 active rows, all reuse_count=0 (multiplier 1.00, well above the 0.75
-- floor), ALL with a passing body-health row, spread across 6 domains.
INSERT INTO m.signal_pool (canonical_id, vertical_id, content_class, is_active,
  fitness_score_max, fitness_per_format, reuse_count, source_domain)
SELECT gen_random_uuid(), 9002, 'analytical', true, 90,
  '{"text":90,"image_quote":72}'::jsonb, 0,
  (ARRAY['a.example.com','b.example.com','c.example.com',
         'd.example.com','e.example.com','f.example.com'])[1 + (n % 6)]
FROM generate_series(1,60) n;

INSERT INTO f.canonical_content_body (canonical_id, fetch_status, extracted_text, word_count)
SELECT canonical_id, 'success', repeat('word ', 400), 400
FROM m.signal_pool WHERE vertical_id = 9002;

-- ── Fixture B, vertical_id 9003: DIFFERENTLY-SHAPED degraded pool ───────
-- 40 active rows total, all fresh (reuse_count=0, NO reuse-decay at all --
-- this is deliberately NOT the CFW shape, to prove the signal generalizes):
-- 15 fail body-health (never fetched), 25 DO pass body-health. 3 domains.
-- Expect active_usable=25 (>=20, <50) with distinct_sources=3 (>=2) -> the
-- middle 'yellow' tier, distinct from both the healthy-green and the
-- fully-collapsed-red (CFW) fixtures.
INSERT INTO m.signal_pool (canonical_id, vertical_id, content_class, is_active,
  fitness_score_max, fitness_per_format, reuse_count, source_domain)
SELECT gen_random_uuid(), 9003, 'educational_evergreen', true, 85,
  '{"text":85,"image_quote":61}'::jsonb, 0,
  (ARRAY['g.example.com','h.example.com','i.example.com'])[1 + (n % 3)]
FROM generate_series(1,15) n;  -- fails body-health (no body row at all)

-- Insert-and-capture the body-health-PASSING batch's canonical_ids via
-- RETURNING, so the correct 25 rows get a body row -- deliberately NOT
-- relying on ORDER BY canonical_id (uuids are random, not insertion-ordered,
-- so that would silently mix the two batches).
WITH inserted AS (
  INSERT INTO m.signal_pool (canonical_id, vertical_id, content_class, is_active,
    fitness_score_max, fitness_per_format, reuse_count, source_domain)
  SELECT gen_random_uuid(), 9003, 'educational_evergreen', true, 85,
    '{"text":85,"image_quote":61}'::jsonb, 0,
    (ARRAY['g.example.com','h.example.com','i.example.com'])[1 + (n % 3)]
  FROM generate_series(1,25) n
  RETURNING canonical_id
)
INSERT INTO f.canonical_content_body (canonical_id, fetch_status, extracted_text, word_count)
SELECT canonical_id, 'success', repeat('word ', 350), 350
FROM inserted;

-- ── assertions ───────────────────────────────────────────────────────────
DO $$
DECLARE
  v_health_a jsonb;
  v_health_b jsonb;
BEGIN
  v_health_a := m.check_pool_health(9002);
  RAISE NOTICE 'Fixture A (healthy, vertical 9002) = %', v_health_a;
  IF (v_health_a->>'health') IS DISTINCT FROM 'green' THEN
    RAISE EXCEPTION 'FIXTURE A FAIL: expected health=green for a genuinely healthy pool, got %', v_health_a->>'health';
  END IF;
  IF (v_health_a->>'active_usable')::int IS DISTINCT FROM 60 THEN
    RAISE EXCEPTION 'FIXTURE A FAIL: expected active_usable=60, got %', v_health_a->>'active_usable';
  END IF;
  RAISE NOTICE 'FIXTURE A PASS: health=green, active_usable=60 -- fix does not false-positive on a healthy pool';

  v_health_b := m.check_pool_health(9003);
  RAISE NOTICE 'Fixture B (differently-degraded, vertical 9003) = %', v_health_b;
  -- 25 body-health-passing, undecayed (multiplier 1.00 >= 0.75) rows ->
  -- active_usable=25 (>=20, <50). distinct_sources=3 (>=2) -> lands in the
  -- middle 'yellow' tier, distinct from Fixture A's green and the
  -- defect-regression fixture's red.
  IF (v_health_b->>'active_usable')::int IS DISTINCT FROM 25 THEN
    RAISE EXCEPTION 'FIXTURE B FAIL: expected active_usable=25, got %', v_health_b->>'active_usable';
  END IF;
  IF (v_health_b->>'health') IS DISTINCT FROM 'yellow' THEN
    RAISE EXCEPTION 'FIXTURE B FAIL: expected health=yellow (20<=active_usable<50, sources>=2), got %', v_health_b->>'health';
  END IF;
  RAISE NOTICE 'FIXTURE B PASS: health=yellow, active_usable=25 -- a DIFFERENTLY-shaped (non-CFW, non-decayed) degraded pool lands in the middle tier, confirming the signal is not overfit to the exact CFW numbers and the gate is a real three-tier gate';

  RAISE NOTICE '=== ALL POSITIVE-CASE ASSERTIONS PASS ===';
END $$;
