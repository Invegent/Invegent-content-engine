-- M16 Option C hermetic proof — DEFECT REGRESSION + AUTO-RELAX TRIGGER.
-- Standalone / self-contained: creates its own scratch schemas m, f, t and
-- loads the NEW check_pool_health() body (copied verbatim from
-- supabase/migrations/NOT_APPLIED_m16_pool_health_option_c_and_b_v1.sql
-- Section 1 — keep these two files in sync if either changes).
-- Intended to run against a throwaway/scratch Postgres database with NO
-- pre-existing m/f/t schemas (fresh proving DB), matching the house idiom
-- used by _harness/cc0046_hermetic/*.sql. NOT RUN in this environment — no
-- psql/local Postgres is available here; flagged honestly in the build
-- summary, not claimed green.
--
-- PROVES:
--   1. (regression reproduction) A CFW-shaped fixture — 35 fresh
--      (reuse_count=0) rows that ALL fail the body-health predicate, 34
--      reused (reuse_count=2) rows that PASS body-health but have decayed
--      below the 0.75 reuse-multiplier floor — has raw active=69 and
--      distinct_sources>=3, i.e. the metrics the OLD check_pool_health()
--      gate alone would have called 'green' (69>=50 AND sources>=3). This
--      is asserted directly (not by running the old function body, which
--      this migration replaces) so the "old gate would say green" claim is
--      checked against real arithmetic, not just narrated.
--   2. (the fix) The NEW check_pool_health() computes active_usable=0 for
--      the SAME fixture (all 69 active rows fail EITHER body-health OR the
--      decay floor) and therefore returns health='red' — not merely
--      non-green.
--   3. (auto-relax trigger) The exact boolean predicate
--      m.fill_pending_slots uses to decide whether to relax
--      (`(v_pool_health->>'health') = 'red'`, copied verbatim from the live
--      baseline) evaluates TRUE against the new function's output for this
--      fixture. This proves the STRING match the relax branch requires
--      (not just "some non-green value") — the hard correctness requirement
--      the build brief calls out explicitly.
--   HONESTY NOTE: this file does NOT execute m.fill_pending_slots itself
--   (806-line function with heavy dependency scaffolding — m.slot,
--   t.dedup_policy, t.format_quality_policy, public.classify_format_capability,
--   etc. — out of proportionate scope for this proof per the build brief's
--   own guidance). What IS proven: the actual jsonb output of the actual new
--   function, fed through the actual string-comparison predicate copied
--   verbatim from the live baseline, evaluates true. What is NOT proven:
--   that the rest of fill_pending_slots' relax branch (the relaxed_pool CTE)
--   would then successfully select candidates for THIS synthetic fixture —
--   that arithmetic is worked separately, on the real CFW numbers, in the
--   migration file's Section-1 header comment (57.2/59.8 vs relaxed
--   threshold 50).

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

-- ── NEW check_pool_health() body (Option C) — copied verbatim ──────────────
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

-- ── CFW-shaped fixture, vertical_id 9001 ────────────────────────────────
-- 35 fresh rows (reuse_count=0): NO row in f.canonical_content_body at all
-- (never even fetched) — same shape as the S1 table's paywalled/blocked/
-- dead/timeout rows, all of which fail the body-health EXISTS predicate.
-- Spread across >=3 distinct source domains so distinct_sources alone would
-- have satisfied the OLD gate's diversity leg.
INSERT INTO m.signal_pool (canonical_id, vertical_id, content_class, is_active,
  fitness_score_max, fitness_per_format, reuse_count, source_domain)
SELECT gen_random_uuid(), 9001, 'analytical', true, 88,
  '{"text":88,"image_quote":55}'::jsonb, 0,
  (ARRAY['thesector.com.au','newshub.medianet.com.au','finance.yahoo.com',
         'www.afr.com','www.canberratimes.com.au','www.news.com.au',
         'aapnews.aap.com.au'])[1 + (n % 7)]
FROM generate_series(1,35) n;

-- 34 reused rows (reuse_count=2): DO have a passing body-health row, but at
-- the 0.65 multiplier (reuse_count=2) they are below the 0.75 decay floor.
INSERT INTO m.signal_pool (canonical_id, vertical_id, content_class, is_active,
  fitness_score_max, fitness_per_format, reuse_count, source_domain)
SELECT gen_random_uuid(), 9001, 'analytical', true, 88,
  '{"text":88,"image_quote":55}'::jsonb, 2,
  (ARRAY['reuters.com','abc.net.au','smh.com.au'])[1 + (n % 3)]
FROM generate_series(1,34) n;

INSERT INTO f.canonical_content_body (canonical_id, fetch_status, extracted_text, word_count)
SELECT canonical_id, 'success', repeat('word ', 320), 320
FROM m.signal_pool WHERE vertical_id = 9001 AND reuse_count = 2;

-- ── assertions ───────────────────────────────────────────────────────────
DO $$
DECLARE
  v_raw_active integer;
  v_raw_sources integer;
  v_health jsonb;
BEGIN
  SELECT COUNT(*) FILTER (WHERE is_active),
         COUNT(DISTINCT source_domain) FILTER (WHERE is_active)
  INTO v_raw_active, v_raw_sources
  FROM m.signal_pool WHERE vertical_id = 9001;

  -- Step 1: reproduce the OLD gate's verdict from raw arithmetic (not by
  -- running old code, which no longer exists after CREATE OR REPLACE).
  IF NOT (v_raw_active >= 50 AND v_raw_sources >= 3) THEN
    RAISE EXCEPTION 'REGRESSION FIXTURE INVALID: raw active/sources (%/%) would NOT have satisfied the OLD green gate — fixture does not reproduce the defect', v_raw_active, v_raw_sources;
  END IF;
  RAISE NOTICE 'STEP 1 PASS: raw active=% distinct_sources=% -- OLD gate (active>=50 AND sources>=3) would have called this GREEN', v_raw_active, v_raw_sources;

  -- Step 2: the NEW function on the SAME fixture.
  v_health := m.check_pool_health(9001);
  RAISE NOTICE 'NEW check_pool_health(9001) = %', v_health;

  IF (v_health->>'active_usable')::int IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'STEP 2 FAIL: expected active_usable=0, got %', v_health->>'active_usable';
  END IF;
  RAISE NOTICE 'STEP 2 PASS: active_usable=0 (all 69 active rows fail body-health OR the 0.75 decay floor)';

  IF (v_health->>'health') IS DISTINCT FROM 'red' THEN
    RAISE EXCEPTION 'STEP 2 FAIL: expected health=red, got %', v_health->>'health';
  END IF;
  RAISE NOTICE 'STEP 2 PASS: health=red (the defect is FIXED — same fixture that satisfied the old raw-active green gate now correctly reads red)';

  -- Step 3: the EXACT predicate m.fill_pending_slots uses to gate relax
  -- (baseline file line ~532: IF (v_pool_health->>'health') = 'red' THEN).
  IF NOT ((v_health->>'health') = 'red') THEN
    RAISE EXCEPTION 'STEP 3 FAIL: relax predicate (health = ''red'') does NOT evaluate true -- auto-relax valve would NOT fire';
  END IF;
  RAISE NOTICE 'STEP 3 PASS: relax predicate (health = ''red'') evaluates TRUE -- fill_pending_slots'' UNCHANGED relax branch would fire for this fixture';

  RAISE NOTICE '=== ALL 3 STEPS PASS: defect reproduced from raw arithmetic, fix verified, relax-trigger predicate verified ===';
END $$;
