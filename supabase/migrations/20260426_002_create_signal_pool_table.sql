-- Stage 1.002 — m.signal_pool: vertical-scoped materialised pool of canonicals
-- Each (canonical_id, vertical_id) is a pool entry. Filled by Stage 3 trigger on
-- f.canonical_vertical_map insert. Read by Stage 8 fill function.

CREATE TABLE m.signal_pool (
  pool_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id         uuid NOT NULL REFERENCES f.canonical_content_item(canonical_id) ON DELETE CASCADE,
  vertical_id          integer NOT NULL REFERENCES t.content_vertical(vertical_id) ON DELETE CASCADE,
  content_class        text NOT NULL,
    -- denormalised from f.canonical_content_body.content_class for fast filtering;
    -- refreshed by Stage 3 trigger when class changes
  pool_entered_at      timestamptz NOT NULL DEFAULT now(),
  pool_expires_at      timestamptz NOT NULL,
    -- computed from t.class_freshness_rule (created in Stage 2);
    -- per F9 in v3, only reset when class changes or entry was inactive
  is_active            boolean NOT NULL DEFAULT true,
  fitness_per_format   jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- {"image_quote": 0.82, "carousel": 0.65, ...}
    -- computed from t.class_format_fitness × c.client_class_fitness_override at insert/refresh
  fitness_score_max    numeric NOT NULL DEFAULT 0,
    -- max value across fitness_per_format, used for cheap top-N pool sort
  reuse_count          integer NOT NULL DEFAULT 0,
    -- incremented when pool entry is selected by fill function
  last_used_at         timestamptz,
    -- set when pool entry is selected; drives reuse penalty curve (LD9, Stage 2)
  source_domain        text,
    -- extracted host of canonical_url; used for source-diversity gate in fill function
  source_count         integer NOT NULL DEFAULT 1,
    -- number of f.feed_source rows that produced this canonical
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT m_signal_pool_canonical_vertical_uniq UNIQUE (canonical_id, vertical_id)
);

-- Pool lookup hot path: filter by vertical + active, sorted by fitness desc
CREATE INDEX idx_signal_pool_vertical_active_fitness
  ON m.signal_pool (vertical_id, fitness_score_max DESC)
  WHERE is_active = true;

-- Expiry sweep
CREATE INDEX idx_signal_pool_expires
  ON m.signal_pool (pool_expires_at)
  WHERE is_active = true;

-- Diversity gate (source_domain count per pool selection)
CREATE INDEX idx_signal_pool_source_domain
  ON m.signal_pool (source_domain)
  WHERE is_active = true;

-- Canonical-side joins (e.g. when refreshing by canonical)
CREATE INDEX idx_signal_pool_canonical
  ON m.signal_pool (canonical_id);

COMMENT ON TABLE m.signal_pool IS
  'Materialised vertical-scoped pool of canonicals available for slot fill. Populated by Stage 3 trigger when canonical_vertical_map gets a new row. Read by Stage 8 fill function. Stage 1.002.';
