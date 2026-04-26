-- Stage 7.032 — Slot confidence composite (LD10)
--
-- Inputs (per LD10):
--   p_best_fitness       — chosen format's fitness for the bundle (0..1)
--   p_pool_size          — count of pool entries that were viable for this slot
--   p_top_recency_score  — recency of selected content (0..1; 1.0 = just published)
--   p_source_diversity   — distinct source_domain count in the bundle (1+ for single-item)
--
-- Composite weights (sum to 1.00):
--   0.50 fitness    (quality of match — most important)
--   0.20 pool       (log-scaled, saturates at ~10 viable items)
--   0.20 recency    (linear)
--   0.10 diversity  (log-scaled, saturates at ~3 sources)
--
-- IMMUTABLE: same inputs always produce same output. No table reads.
-- Stage 8's fill function calls this after pool selection to populate
-- m.slot.slot_confidence.

CREATE OR REPLACE FUNCTION m.compute_slot_confidence(
  p_best_fitness        numeric,
  p_pool_size           integer,
  p_top_recency_score   numeric,
  p_source_diversity    integer
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_fitness   numeric;
  v_pool      numeric;
  v_recency   numeric;
  v_diversity numeric;
  v_score     numeric;
BEGIN
  -- Defensive clamp + null-safety on the two 0..1 inputs
  v_fitness := GREATEST(0.0, LEAST(1.0, COALESCE(p_best_fitness, 0.0)));
  v_recency := GREATEST(0.0, LEAST(1.0, COALESCE(p_top_recency_score, 0.0)));

  -- Pool size: log-scaled, saturates at 10 viable items.
  -- ln(11)/ln(11) = 1.0; ln(2)/ln(11) ≈ 0.289 (1 item); ln(6)/ln(11) ≈ 0.747 (5 items)
  v_pool := LEAST(1.0,
    ln(GREATEST(1, COALESCE(p_pool_size, 0)) + 1)::numeric / ln(11)::numeric
  );

  -- Source diversity: log-scaled, saturates at 3 distinct domains.
  -- ln(4)/ln(4) = 1.0; ln(2)/ln(4) = 0.5 (1 source); ln(3)/ln(4) ≈ 0.792 (2 sources)
  v_diversity := LEAST(1.0,
    ln(GREATEST(1, COALESCE(p_source_diversity, 0)) + 1)::numeric / ln(4)::numeric
  );

  v_score :=
      0.50 * v_fitness
    + 0.20 * v_pool
    + 0.20 * v_recency
    + 0.10 * v_diversity;

  RETURN ROUND(v_score, 4);
END;
$$;

COMMENT ON FUNCTION m.compute_slot_confidence(numeric, integer, numeric, integer) IS
  'LD10 composite slot confidence in 0..1. Weights: 0.50 fitness, 0.20 pool (log-saturated at 10), 0.20 recency, 0.10 diversity (log-saturated at 3). IMMUTABLE. Stage 7.032.';
