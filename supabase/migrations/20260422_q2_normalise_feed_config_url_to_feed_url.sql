-- Q2 closure: normalise 14 feeds where config has 'url' instead of 'feed_url'.
-- The ingest EF reads config.feed_url; the 14 affected sources have been silently
-- rejected on every ingest cron run. This migration renames the key in place,
-- preserving all other JSONB keys.

-- Belt and braces — abort if any row has both keys (would lose data on the rename)
DO $$
DECLARE
  conflict_count INT;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM f.feed_source
  WHERE config ? 'url' AND config ? 'feed_url';

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Q2 migration aborted: % rows have both config.url AND config.feed_url; manual reconciliation needed', conflict_count;
  END IF;
END $$;

-- Rename config.url -> config.feed_url, preserving all other keys
UPDATE f.feed_source
SET
  config = (config - 'url') || jsonb_build_object('feed_url', config->>'url'),
  updated_at = NOW()
WHERE config ? 'url'
  AND NOT (config ? 'feed_url');
