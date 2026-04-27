-- Fix label hardcoding in add_client_discovery_seeds RPC.
--
-- Original behaviour: every seed inserted with label = 'client-onboarding'.
-- EF's sourceName fallback chain (seed.label || feed.title || seed.seed_value)
-- always picked the hardcoded label, resulting in every f.feed_source row
-- having source_name = 'client-onboarding'. PK noticed this morning when the
-- 8 newly-discovered CFW feeds all rendered identically in the dashboard.
--
-- Fix: set label = seed_value at INSERT time. URL seeds get the URL as label;
-- keyword seeds get the keyword as label. The EF then surfaces this through
-- to feed_source.source_name automatically.
--
-- Also backfills:
--   (a) existing seeds: label='client-onboarding' → label=seed_value
--   (b) existing feed_source rows: source_name='client-onboarding'
--       → source_name = originating seed_value (joined via feed_source_id)

-- 1) Update the RPC
CREATE OR REPLACE FUNCTION public.add_client_discovery_seeds(
  p_client_id    uuid,
  p_keywords     text[] DEFAULT '{}'::text[],
  p_example_urls text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, f, c, t
AS $$
DECLARE
  v_vertical_slug text;
  v_keyword text;
  v_url text;
  v_inserted_count int := 0;
  v_skipped_count int := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM c.client
    WHERE client_id = p_client_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Client % not found or not active', p_client_id;
  END IF;

  IF (array_length(p_keywords, 1) IS NULL OR array_length(p_keywords, 1) = 0)
     AND (array_length(p_example_urls, 1) IS NULL OR array_length(p_example_urls, 1) = 0)
  THEN
    RAISE EXCEPTION 'Must provide at least one keyword or example URL';
  END IF;

  SELECT cv.vertical_slug
    INTO v_vertical_slug
  FROM c.client_content_scope ccs
  JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id
  WHERE ccs.client_id = p_client_id
  ORDER BY ccs.is_primary DESC NULLS LAST,
           COALESCE(ccs.weight, 1.0) DESC,
           cv.vertical_slug ASC
  LIMIT 1;

  IF v_vertical_slug IS NULL THEN
    v_vertical_slug := 'general';
  END IF;

  FOREACH v_keyword IN ARRAY p_keywords
  LOOP
    IF length(trim(v_keyword)) = 0 THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM f.feed_discovery_seed
      WHERE client_id = p_client_id
        AND seed_type = 'keyword'
        AND lower(seed_value) = lower(trim(v_keyword))
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    INSERT INTO f.feed_discovery_seed
      (seed_type, seed_value, vertical_slug, status, client_id, label)
    VALUES
      ('keyword', trim(v_keyword), v_vertical_slug, 'pending', p_client_id,
       trim(v_keyword));  -- label = seed_value (was hardcoded 'client-onboarding')

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  FOREACH v_url IN ARRAY p_example_urls
  LOOP
    IF length(trim(v_url)) = 0 THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    IF trim(v_url) !~* '^https?://' THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM f.feed_discovery_seed
      WHERE client_id = p_client_id
        AND seed_type = 'url'
        AND lower(seed_value) = lower(trim(v_url))
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    INSERT INTO f.feed_discovery_seed
      (seed_type, seed_value, vertical_slug, status, client_id, label)
    VALUES
      ('url', trim(v_url), v_vertical_slug, 'pending', p_client_id,
       trim(v_url));  -- label = seed_value (was hardcoded 'client-onboarding')

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted_count,
    'skipped',  v_skipped_count,
    'vertical_slug', v_vertical_slug,
    'next_discovery_run_utc', '20:00 daily'
  );
END;
$$;

-- 2) Backfill: update existing seeds with label='client-onboarding' to seed_value
UPDATE f.feed_discovery_seed
SET label = seed_value
WHERE label = 'client-onboarding';

-- 3) Backfill: rename feed_source rows whose source_name='client-onboarding'
--    to use the originating seed_value
UPDATE f.feed_source fs
SET source_name = ds.seed_value
FROM f.feed_discovery_seed ds
WHERE fs.source_id = ds.feed_source_id
  AND fs.source_name = 'client-onboarding';
