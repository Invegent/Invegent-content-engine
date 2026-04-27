-- Stage 1.1 — add client_id to f.feed_discovery_seed
-- Backwards compatible: existing 9 seeds remain with NULL client_id.
--
-- ON DELETE SET NULL preserves the seed row (and any rssapp_feed_id /
-- feed_source_id linkage) if the client is later deleted; the seed becomes
-- effectively operator-owned, like the original 9 manual seeds.

ALTER TABLE f.feed_discovery_seed
  ADD COLUMN client_id uuid NULL
    REFERENCES c.client(client_id)
    ON DELETE SET NULL;

-- Partial index for lookups by client (review queue, per-client seed status)
CREATE INDEX IF NOT EXISTS ix_feed_discovery_seed_client_id
  ON f.feed_discovery_seed (client_id)
  WHERE client_id IS NOT NULL;

COMMENT ON COLUMN f.feed_discovery_seed.client_id IS
  'Client whose onboarding submitted this seed. NULL for operator-submitted seeds (the original 9 manual seeds use NULL).';
