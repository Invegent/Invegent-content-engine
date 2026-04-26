-- Stage 2.015 — m.title_similarity: pg_trgm-based fuzzy title comparison
-- IMMUTABLE so it can be used in indexes and parallelised in queries.
-- Returns numeric in [0,1] where 1.0 = identical.

CREATE OR REPLACE FUNCTION m.title_similarity(p_a text, p_b text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  -- pg_trgm similarity() returns real; cast to numeric for type stability across callers.
  -- Coalesce NULL inputs to '' so the function never returns NULL.
  SELECT similarity(coalesce(p_a, ''), coalesce(p_b, ''))::numeric;
$$;

COMMENT ON FUNCTION m.title_similarity(text, text) IS
  'Trigram-based fuzzy title similarity. Returns 0..1 where 1=identical. IMMUTABLE. LD8. Stage 2.015.';
