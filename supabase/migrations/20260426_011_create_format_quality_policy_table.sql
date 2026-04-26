-- Stage 2.011 — t.format_quality_policy: per-format quality gates for fill function
-- Read by Stage 8 fill function to gate pool candidates by minimum fitness.
-- Tighter thresholds for high-production formats (avatar video) where bad inputs
-- waste expensive generation; looser for cheap formats (text post).

CREATE TABLE t.format_quality_policy (
  ice_format_key            text PRIMARY KEY,
  min_fitness_threshold     numeric NOT NULL,
    -- 0..100 scale matching t.class_format_fitness.fitness_score
  min_pool_size_for_format  integer NOT NULL DEFAULT 3,
    -- minimum candidate count before fill function picks this format
  max_dedup_similarity      numeric NOT NULL DEFAULT 0.75,
    -- title-similarity threshold above which canonicals count as duplicates
  rationale                 text,
  is_current                boolean NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT t_format_quality_policy_threshold_range CHECK (
    min_fitness_threshold >= 0 AND min_fitness_threshold <= 100
  ),
  CONSTRAINT t_format_quality_policy_pool_size_positive CHECK (
    min_pool_size_for_format >= 1
  ),
  CONSTRAINT t_format_quality_policy_similarity_range CHECK (
    max_dedup_similarity >= 0 AND max_dedup_similarity <= 1
  )
);

-- Seed: 10 rows. Higher production cost = higher min threshold (don't waste avatar
-- generation budget on weak inputs). Carousel needs deeper pool (3+ canonicals).
INSERT INTO t.format_quality_policy (ice_format_key, min_fitness_threshold, min_pool_size_for_format, max_dedup_similarity, rationale) VALUES
  ('image_quote',                60, 2, 0.75, 'Cheap to generate, low risk. Standard threshold.'),
  ('text',                       50, 3, 0.70, 'Lowest production cost. Most permissive. Bundle of 2 needs pool of 3+.'),
  ('carousel',                   55, 4, 0.70, 'Bundle of 3 needs pool of 4+ for diversity. Moderate threshold.'),
  ('video_short_avatar',         75, 2, 0.80, 'Highest production cost (avatar generation $$$). Strict input gate.'),
  ('video_short_kinetic',        65, 2, 0.75, 'Mid-cost kinetic typography. Above-average threshold.'),
  ('video_short_kinetic_voice',  70, 2, 0.80, 'Higher cost (voice + kinetic). Tighter than text-only kinetic.'),
  ('video_short_stat',           65, 2, 0.75, 'Mid-cost stat animation. Above-average threshold.'),
  ('video_short_stat_voice',     70, 2, 0.80, 'Higher cost (voice + stat). Tighter than text-only stat.'),
  ('animated_data',              70, 2, 0.80, 'Custom animation work. Strict input gate.'),
  ('animated_text_reveal',       60, 2, 0.75, 'Lower-cost reveal animation. Standard threshold.');

-- Sanity
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM t.format_quality_policy;
  IF v_count <> 10 THEN
    RAISE EXCEPTION 'format_quality_policy seed expected 10, got %', v_count;
  END IF;
END $$;

COMMENT ON TABLE t.format_quality_policy IS
  'Per-format fill function quality gates. Tighter thresholds for high-production formats. Stage 2.011.';
