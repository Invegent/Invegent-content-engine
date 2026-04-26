-- Stage 2.017 — GiST trigram index on f.canonical_content_item.canonical_title
-- Speeds up Stage 8 fill function dedup checks (m.title_similarity in WHERE clause)
-- from a sequential scan over the full canonical table to an index lookup.
--
-- Note: column is canonical_title (not title — v4 had this wrong).

CREATE INDEX IF NOT EXISTS idx_canonical_title_trgm
  ON f.canonical_content_item
  USING GIST (canonical_title gist_trgm_ops);

COMMENT ON INDEX f.idx_canonical_title_trgm IS
  'Trigram GiST index for fast similarity lookups on canonical_title. Used by Stage 8 fill function dedup. Stage 2.017.';
