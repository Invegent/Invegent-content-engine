-- Hotfix: feed-discovery EF calls create_feed_source_rss with 5 named params
-- (p_source_name, p_source_type_code, p_config, p_content_origin, p_added_by).
-- Neither existing overload matches under PostgREST's named-arg resolution:
--   * 3-param overload doesn't accept p_content_origin or p_added_by
--   * 6-param overload requires p_status which the EF doesn't pass
-- All 9 CFW seeds failed at 06:00 UTC 28 Apr with "function not found in schema cache".
--
-- Fix: add a 5-param overload that exactly matches the EF's call.
-- Mirrors the values seen in the 9 existing discovery_pipeline rows in f.feed_source.
--
-- Note: overload B (6-param) has a separate latent bug — its INSERT omits
-- output_kind and refresh_cadence (NOT NULL columns with no defaults). It has
-- never executed successfully because PostgREST never resolved a call to it.
-- This migration does NOT touch it. Recommend dropping or fixing in a follow-up.

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
  v_feed_url := p_config ->> 'url';

  -- Dedupe on existing feed URL (matches the manual exec_sql check the EF was doing)
  IF v_feed_url IS NOT NULL THEN
    SELECT source_id INTO v_source_id
    FROM f.feed_source
    WHERE config ->> 'url' = v_feed_url
    LIMIT 1;

    IF v_source_id IS NOT NULL THEN
      RETURN v_source_id;
    END IF;
  END IF;

  -- Insert with all required NOT NULL columns set explicitly
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

-- Force PostgREST schema cache reload so the new overload is visible immediately
NOTIFY pgrst, 'reload schema';
