-- Stage 2.013 — t.dedup_policy: configurable dedup thresholds (LD16)
-- Read by Stage 8 fill function. Replaces magic-number thresholds with named profiles.
-- Default profile applies to all clients unless overridden in c.client_dedup_policy.

CREATE TABLE t.dedup_policy (
  policy_name                    text PRIMARY KEY,
  title_similarity_threshold     numeric NOT NULL,
    -- pg_trgm similarity above which two canonicals are dupes (0..1)
  keyword_overlap_threshold      numeric NOT NULL,
    -- jaccard overlap on keyword sets above which two canonicals are dupes (0..1)
  same_canonical_block_hours     integer NOT NULL,
    -- per F4/LD15: hard block re-using same canonical for same client+platform
    -- within this many hours
  same_source_diversity_min      integer NOT NULL DEFAULT 2,
    -- minimum distinct source_domains required when bundling (LD8 / source diversity)
  rationale                      text,
  is_current                     boolean NOT NULL DEFAULT true,
  created_at                     timestamptz NOT NULL DEFAULT now(),
  updated_at                     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT t_dedup_policy_title_range CHECK (
    title_similarity_threshold >= 0 AND title_similarity_threshold <= 1
  ),
  CONSTRAINT t_dedup_policy_keyword_range CHECK (
    keyword_overlap_threshold >= 0 AND keyword_overlap_threshold <= 1
  ),
  CONSTRAINT t_dedup_policy_block_positive CHECK (
    same_canonical_block_hours > 0
  )
);

-- Seed: 3 named profiles
INSERT INTO t.dedup_policy (
  policy_name, title_similarity_threshold, keyword_overlap_threshold,
  same_canonical_block_hours, same_source_diversity_min, rationale
) VALUES
  ('default', 0.75, 0.60, 168, 2,
   'Standard dedup. 168h = 7 days same-canonical block. Two distinct sources required for bundles.'),
  ('strict',  0.65, 0.50, 336, 3,
   'Tighter dedup for high-volume publishing. 14-day same-canonical block. Three sources for bundles.'),
  ('lenient', 0.85, 0.75, 72,  1,
   'Looser dedup for thin pool clients. 3-day same-canonical block. Single-source bundles permitted.');

-- Sanity
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM t.dedup_policy;
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'dedup_policy seed expected 3, got %', v_count;
  END IF;
END $$;

COMMENT ON TABLE t.dedup_policy IS
  'Named dedup threshold profiles. Default applies to all clients unless overridden. LD16. Stage 2.013.';
