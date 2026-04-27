-- Migration 005's create_feed_source_rss 5-param wrapper had a latent dedupe
-- bug: it read p_config->>'url' but the EF actually sends p_config->>'feed_url'
-- (the convention every other rss_app feed in f.feed_source uses, and what
-- the ingest pipeline reads). Hadn't bitten us yet because seeds only get
-- processed once, but a re-processed seed would have created duplicate
-- feed_source rows.
--
-- Fix: COALESCE both keys when reading from p_config (input) and from existing
-- f.feed_source rows (lookup). Forward and backward compatible.

CREATE OR REPLACE FUNCTION public.create_feed_source_rss(
  p_source_name      text,
  p_source_type_code text,
  p_config           jsonb,
  p_content_origin   text,
  p_added_by         text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_id uuid;
  v_feed_url  text;
BEGIN
  -- Read the URL from either key (convention is `feed_url`; older rows or
  -- legacy callers may use `url`)
  v_feed_url := COALESCE(p_config ->> 'feed_url', p_config ->> 'url');

  -- Dedupe on existing feed URL across both keys
  IF v_feed_url IS NOT NULL THEN
    SELECT source_id INTO v_source_id
    FROM f.feed_source
    WHERE COALESCE(config ->> 'feed_url', config ->> 'url') = v_feed_url
    LIMIT 1;

    IF v_source_id IS NOT NULL THEN
      RETURN v_source_id;
    END IF;
  END IF;

  -- Insert with all required NOT NULL columns set explicitly.
  -- p_config is passed through as-is, so whichever key the caller used
  -- gets stored verbatim. New callers should use `feed_url`.
  INSERT INTO f.feed_source (
    source_name,
    source_type_code,
    output_kind,
    status,
    refresh_cadence,
    collection_region_key,
    default_content_region_key,
    config,
    content_origin,
    added_by,
    created_at,
    updated_at
  ) VALUES (
    p_source_name,
    p_source_type_code,
    'content_item',
    'active',
    'every_6h',
    'au',
    'au',
    p_config,
    p_content_origin,
    p_added_by,
    NOW(),
    NOW()
  )
  RETURNING source_id INTO v_source_id;

  RETURN v_source_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_feed_source_rss(text, text, jsonb, text, text)
  TO authenticated, service_role, anon;

NOTIFY pgrst, 'reload schema';
