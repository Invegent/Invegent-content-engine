-- Stage 2.012 — t.reuse_penalty_curve: soft penalty for reusing pool entries (LD9)
-- Read by Stage 8 fill function. Replaces binary "used → exclude" with a curve
-- that lowers fitness by a multiplier based on prior use count.
-- e.g. reuse_count=0 → 1.0 (no penalty); reuse_count=3+ → 0.5 (halved).

CREATE TABLE t.reuse_penalty_curve (
  reuse_count_min    integer PRIMARY KEY,
    -- bucket lower bound (inclusive); 0,1,2,3 in seed
  reuse_count_max    integer,
    -- bucket upper bound (inclusive); NULL means "and above"
  fitness_multiplier numeric NOT NULL,
    -- multiplied against fitness_score in fill function ranking
  rationale          text,
  is_current         boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT t_reuse_penalty_curve_multiplier_range CHECK (
    fitness_multiplier > 0 AND fitness_multiplier <= 1
  ),
  CONSTRAINT t_reuse_penalty_curve_bucket_consistency CHECK (
    reuse_count_max IS NULL OR reuse_count_max >= reuse_count_min
  )
);

-- Seed: 4 rows
INSERT INTO t.reuse_penalty_curve (reuse_count_min, reuse_count_max, fitness_multiplier, rationale) VALUES
  (0, 0,    1.00, 'Never used; full fitness preserved.'),
  (1, 1,    0.85, 'Used once; soft 15% penalty allows reuse if pool is otherwise thin.'),
  (2, 2,    0.65, 'Used twice; meaningful penalty discourages over-use.'),
  (3, NULL, 0.50, 'Used 3+ times; halved fitness; near-block in normal pool.');

-- Sanity
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM t.reuse_penalty_curve;
  IF v_count <> 4 THEN
    RAISE EXCEPTION 'reuse_penalty_curve seed expected 4, got %', v_count;
  END IF;
END $$;

COMMENT ON TABLE t.reuse_penalty_curve IS
  'Soft penalty curve for reusing pool entries. Replaces binary dedup with smooth degradation. LD9. Stage 2.012.';
