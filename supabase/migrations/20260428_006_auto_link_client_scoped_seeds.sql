-- Auto-link client-scoped discovery seeds to c.client_source.
--
-- Architectural decision (PK, 28 Apr morning): when feed-discovery provisions
-- a feed from a seed with non-null client_id, the resulting feed should be
-- auto-linked to that client. The keyword belongs to the client, so the feed
-- belongs to the client.
--
-- Quality control is downstream:
--   - feed-intelligence (deployed v1.0.0) flags rubbish feeds
--     (>=70% give-up over 14d, zero-successes over 30d, etc.) into
--     m.agent_recommendations with type='deprecate'/'review'/'watch'
--   - Operator/agent acts on those recommendations to retire bad feeds
--
-- This trigger fires on AFTER UPDATE of f.feed_discovery_seed when:
--   - status transitions to 'provisioned'
--   - client_id IS NOT NULL (operator-exploration seeds with NULL client_id
--     are NOT auto-linked — they go to the unassigned bucket as before)
--   - feed_source_id IS NOT NULL (sanity check)
--
-- Idempotent via ON CONFLICT DO NOTHING. Backfill runs same logic for the
-- 8 existing CFW provisioned seeds.

-- 1) Trigger function
CREATE OR REPLACE FUNCTION public.tg_auto_link_seed_to_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, c
AS $$
BEGIN
  INSERT INTO c.client_source (client_id, source_id, is_enabled, weight, notes)
  VALUES (
    NEW.client_id,
    NEW.feed_source_id,
    TRUE,
    1.0,
    'auto-linked by feed-discovery'
  )
  ON CONFLICT (client_id, source_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2) Trigger attachment
DROP TRIGGER IF EXISTS trg_auto_link_seed_to_client ON f.feed_discovery_seed;

CREATE TRIGGER trg_auto_link_seed_to_client
AFTER UPDATE OF status, feed_source_id ON f.feed_discovery_seed
FOR EACH ROW
WHEN (
  NEW.status = 'provisioned'
  AND NEW.client_id IS NOT NULL
  AND NEW.feed_source_id IS NOT NULL
  AND (OLD.status IS DISTINCT FROM NEW.status
       OR OLD.feed_source_id IS DISTINCT FROM NEW.feed_source_id)
)
EXECUTE FUNCTION public.tg_auto_link_seed_to_client();

-- 3) Backfill: link the 8 existing CFW provisioned seeds to CFW now
INSERT INTO c.client_source (client_id, source_id, is_enabled, weight, notes)
SELECT
  ds.client_id,
  ds.feed_source_id,
  TRUE,
  1.0,
  'auto-linked by feed-discovery (backfill 28 Apr)'
FROM f.feed_discovery_seed ds
WHERE ds.status = 'provisioned'
  AND ds.client_id IS NOT NULL
  AND ds.feed_source_id IS NOT NULL
ON CONFLICT (client_id, source_id) DO NOTHING;
