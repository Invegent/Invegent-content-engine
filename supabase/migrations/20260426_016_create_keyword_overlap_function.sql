-- Stage 2.016 — m.keyword_overlap: jaccard overlap on tokenised keyword sets
-- IMMUTABLE so it can be used in computed columns and indexes.
-- Returns numeric in [0,1] where 1.0 = identical token sets.
--
-- Implementation: lowercase, split on non-word chars, drop tokens shorter than 4 chars
-- (filters common stopwords without a stopword list), compute jaccard on the result.

CREATE OR REPLACE FUNCTION m.keyword_overlap(p_a text, p_b text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  v_set_a text[];
  v_set_b text[];
  v_intersection int;
  v_union int;
BEGIN
  IF p_a IS NULL OR p_b IS NULL OR length(trim(p_a)) = 0 OR length(trim(p_b)) = 0 THEN
    RETURN 0;
  END IF;

  -- Tokenise: lowercase → split on non-word → drop short tokens → distinct
  SELECT array_agg(DISTINCT t)
    INTO v_set_a
  FROM unnest(regexp_split_to_array(lower(p_a), '\W+')) AS t
  WHERE length(t) >= 4;

  SELECT array_agg(DISTINCT t)
    INTO v_set_b
  FROM unnest(regexp_split_to_array(lower(p_b), '\W+')) AS t
  WHERE length(t) >= 4;

  IF v_set_a IS NULL OR v_set_b IS NULL OR
     array_length(v_set_a, 1) IS NULL OR array_length(v_set_b, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Jaccard: |A ∩ B| / |A ∪ B|
  SELECT COUNT(*) INTO v_intersection
  FROM (SELECT unnest(v_set_a) INTERSECT SELECT unnest(v_set_b)) x;

  SELECT COUNT(*) INTO v_union
  FROM (SELECT unnest(v_set_a) UNION SELECT unnest(v_set_b)) x;

  IF v_union = 0 THEN
    RETURN 0;
  END IF;

  RETURN (v_intersection::numeric / v_union::numeric);
END;
$$;

COMMENT ON FUNCTION m.keyword_overlap(text, text) IS
  'Jaccard overlap on tokenised keyword sets. Tokens lowercased + split on non-word + filtered to len>=4. Returns 0..1. IMMUTABLE. LD8. Stage 2.016.';
