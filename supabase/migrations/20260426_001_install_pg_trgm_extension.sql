-- Stage 1.001 — Install pg_trgm for title-similarity dedup (used in Stage 2 helpers)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMENT ON EXTENSION pg_trgm IS
  'Trigram matching for fuzzy title-similarity dedup in slot-driven fill function. Added 2026-04-26 Stage 1.001.';
