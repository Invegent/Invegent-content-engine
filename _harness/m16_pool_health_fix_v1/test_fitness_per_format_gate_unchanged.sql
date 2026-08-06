-- M16 Option B hermetic proof — OLD vs NEW effective_fitness formula on
-- CFW's S1-documented pool state, proving the "does not change today's
-- CFW outcome" claim rather than merely asserting it.
-- Standalone / self-contained. NOT RUN in this environment (no local
-- Postgres available) -- flagged honestly, not claimed green.
--
-- SCOPE / HONESTY NOTE: this proves the ARITHMETIC of the effective_fitness
-- expression change in isolation (the exact change made to both CTE sites
-- in m.fill_pending_slots), NOT a full run of fill_pending_slots itself
-- (see test_check_pool_health_defect_regression.sql's honesty note for why
-- a full run is out of proportionate scope here). The fixture uses the ONE
-- concretely-cited fitness_per_format number from the S1 diagnosis
-- ("for analytical, 88 comes from the text format; image_quote scores only
-- 55 for that class per t.class_format_fitness") applied to all 34 of
-- CFW's reused rows -- S1 did not cite an image_quote-specific number for
-- educational_evergreen, so this fixture does NOT invent one; it uses only
-- the analytical/image_quote=55 pair that IS cited, and documents this
-- simplification rather than fabricating an uncited number.

\set ON_ERROR_STOP on
\pset pager off

-- CFW's 34 reused, body-health-passing candidates (S1 table: reuse_count=2,
-- fetch_status=success, content_class='analytical', fitness_score_max=88).
-- fitness_per_format->>'image_quote' = 55 (the one S1-cited per-format
-- number). reuse_penalty_curve multiplier at reuse_count=2 = 0.65.
CREATE TEMP TABLE cfw_candidates AS
SELECT
  gen_random_uuid() AS canonical_id,
  88::numeric AS fitness_score_max,
  '{"text":88,"image_quote":55}'::jsonb AS fitness_per_format,
  0.65::numeric AS reuse_multiplier
FROM generate_series(1,34);

-- Chosen format for the slot under test: 'image_quote' (CFW's LinkedIn cell
-- under diagnosis in S1). Used as a literal below (both fill_pending_slots
-- CTE sites read it from v_chosen_format, a plpgsql variable already in
-- scope -- not a psql :variable, so it is inlined directly here).

-- OLD formula (live baseline, both CTE sites): fitness_score_max * multiplier.
-- NEW formula (this fix, both CTE sites):
--   COALESCE((fitness_per_format->>chosen_format)::numeric, fitness_score_max) * multiplier.
CREATE TEMP VIEW effective_fitness_both AS
SELECT
  canonical_id,
  (fitness_score_max * reuse_multiplier) AS old_effective_fitness,
  (COALESCE((fitness_per_format->>'image_quote')::numeric, fitness_score_max) * reuse_multiplier)
    AS new_effective_fitness
FROM cfw_candidates;

\echo '=== per-row old vs new effective_fitness (first 3 rows) ==='
SELECT * FROM effective_fitness_both LIMIT 3;

DO $$
DECLARE
  v_min_fitness numeric := 60;  -- CFW's live image_quote min_fitness_threshold (S1)
  v_old_qualifying integer;
  v_new_qualifying integer;
  v_old_val numeric;
  v_new_val numeric;
BEGIN
  SELECT COUNT(*) FILTER (WHERE old_effective_fitness >= v_min_fitness),
         COUNT(*) FILTER (WHERE new_effective_fitness >= v_min_fitness),
         MAX(old_effective_fitness), MAX(new_effective_fitness)
  INTO v_old_qualifying, v_new_qualifying, v_old_val, v_new_val
  FROM effective_fitness_both;

  RAISE NOTICE 'OLD: max effective_fitness=% (88*0.65), qualifying(>=60) count=%', v_old_val, v_old_qualifying;
  RAISE NOTICE 'NEW: max effective_fitness=% (55*0.65), qualifying(>=60) count=%', v_new_val, v_new_qualifying;

  IF v_old_val IS DISTINCT FROM 57.2 THEN
    RAISE EXCEPTION 'FIXTURE FAIL: expected OLD effective_fitness=57.2 (88*0.65), got %', v_old_val;
  END IF;
  IF v_new_val IS DISTINCT FROM 35.75 THEN
    RAISE EXCEPTION 'FIXTURE FAIL: expected NEW effective_fitness=35.75 (55*0.65), got %', v_new_val;
  END IF;

  IF v_old_qualifying IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'OLD FORMULA CHECK FAIL: expected 0 qualifying at threshold 60, got %', v_old_qualifying;
  END IF;
  IF v_new_qualifying IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'NEW FORMULA CHECK FAIL: expected 0 qualifying at threshold 60, got %', v_new_qualifying;
  END IF;

  IF v_old_qualifying IS DISTINCT FROM v_new_qualifying THEN
    RAISE EXCEPTION 'OUTCOME-UNCHANGED CLAIM FAILED: old_qualifying=% != new_qualifying=%', v_old_qualifying, v_new_qualifying;
  END IF;

  RAISE NOTICE '=== PASS: both OLD (57.2) and NEW (35.75) effective_fitness values fall below the 60 threshold -> 0 qualifying either way. The per-format fix is verified NOT to change CFW''s current zero-qualifying outcome for image_quote, matching S1''s own finding (correctness hygiene, not a CFW fix). Note the NEW value is LOWER than OLD here -- the per-format score (55) is below the class-max (88) for this class/format pair, so this fix does not accidentally rescue CFW as a side effect. ===';
END $$;

-- Fallback-to-class-max case: a row with NO fitness_per_format entry for the
-- chosen format must fail OPEN to fitness_score_max (never silently dropped).
DO $$
DECLARE
  v_fallback numeric;
BEGIN
  SELECT (COALESCE(('{"text":88}'::jsonb ->> 'image_quote')::numeric, 88::numeric) * 0.65)
  INTO v_fallback;
  IF v_fallback IS DISTINCT FROM 57.2 THEN
    RAISE EXCEPTION 'FALLBACK FAIL: expected fail-open to fitness_score_max (88*0.65=57.2), got %', v_fallback;
  END IF;
  RAISE NOTICE 'FALLBACK PASS: a row with no image_quote key in fitness_per_format falls open to fitness_score_max (57.2), never silently dropped -- COALESCE((sp.fitness_per_format->>v_chosen_format)::numeric, sp.fitness_score_max) verified';
END $$;
