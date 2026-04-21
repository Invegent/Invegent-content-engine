-- M7: public.create_feed_source — dashboard feeds/create route replacement.
-- Validates inputs (source_type_code whitelist, URL shape), dedupes by
-- config.feed_url (Q2 canonical key), and inserts with feed_url as the
-- canonical key. Returns (source_id, source_name) to match the route's
-- existing response shape.
--
-- Supersedes the Q2 companion fix for this file (invegent-dashboard
-- fix/q2-dashboard-feeds-create-key, commit 26162c6) since the RPC writes
-- feed_url natively.

CREATE OR REPLACE FUNCTION public.create_feed_source(
  p_source_name      text,
  p_source_type_code text,
  p_feed_url         text,
  p_content_origin   text DEFAULT NULL
)
RETURNS TABLE (
  source_id   uuid,
  source_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_types text[] := ARRAY[
    'rss_app', 'rss_native', 'email_newsletter',
    'youtube_channel', 'youtube_analytics', 'google_trends'
  ];
  v_existing_id uuid;
  v_new_id      uuid;
BEGIN
  IF p_source_name IS NULL OR btrim(p_source_name) = '' THEN
    RAISE EXCEPTION 'source_name must not be empty' USING ERRCODE = '22023';
  END IF;

  IF p_source_type_code IS NULL OR NOT (p_source_type_code = ANY(v_allowed_types)) THEN
    RAISE EXCEPTION 'source_type_code must be one of %', v_allowed_types
      USING ERRCODE = '22023';
  END IF;

  IF p_feed_url IS NOT NULL AND p_feed_url <> '' AND NOT (p_feed_url ~* '^https?://') THEN
    RAISE EXCEPTION 'feed_url must start with http:// or https://' USING ERRCODE = '22023';
  END IF;

  -- Dedup by config.feed_url (Q2 canonical key)
  IF p_feed_url IS NOT NULL AND p_feed_url <> '' THEN
    SELECT fs.source_id INTO v_existing_id
    FROM f.feed_source fs
    WHERE fs.config ->> 'feed_url' = p_feed_url
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN QUERY
      SELECT fs.source_id, fs.source_name
      FROM f.feed_source fs
      WHERE fs.source_id = v_existing_id;
      RETURN;
    END IF;
  END IF;

  INSERT INTO f.feed_source (
    source_name,
    source_type_code,
    status,
    output_kind,
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
    'active',
    'content_item',
    'every_6h',
    'au',
    'au',
    jsonb_build_object('feed_url', p_feed_url),
    p_content_origin,
    'operator',
    NOW(),
    NOW()
  )
  RETURNING feed_source.source_id INTO v_new_id;

  RETURN QUERY
  SELECT fs.source_id, fs.source_name
  FROM f.feed_source fs
  WHERE fs.source_id = v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_feed_source(text, text, text, text) TO authenticated, service_role;
