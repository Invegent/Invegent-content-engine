-- RPCs for content_fetch v2.4 — bypass PostgREST f.* schema exposure
-- Root cause: f schema not in PostgREST exposed_schemas, .schema('f') reads fail silently

CREATE OR REPLACE FUNCTION public.content_fetch_load_canonicals(
  p_since_iso  timestamptz,
  p_limit      int
)
RETURNS TABLE (
  canonical_id    uuid,
  canonical_url   text,
  canonical_title text,
  last_seen_at    timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = f, public
AS $$
  SELECT canonical_id, canonical_url, canonical_title, last_seen_at
  FROM f.canonical_content_item
  WHERE last_seen_at >= p_since_iso
  ORDER BY last_seen_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.content_fetch_load_bodies(
  p_canonical_ids  uuid[]
)
RETURNS TABLE (
  canonical_id       uuid,
  fetch_status       text,
  resolution_status  text,
  fetched_at         timestamptz,
  expires_at         timestamptz,
  fetch_attempts     int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = f, public
AS $$
  SELECT canonical_id, fetch_status, resolution_status, fetched_at, expires_at, fetch_attempts
  FROM f.canonical_content_body
  WHERE canonical_id = ANY(p_canonical_ids);
$$;

CREATE OR REPLACE FUNCTION public.content_fetch_upsert_body(
  p_canonical_id       uuid,
  p_resolution_status  text,
  p_fetch_status       text,
  p_fetch_method       text,
  p_fetched_at         timestamptz,
  p_http_status        int,
  p_final_url          text,
  p_content_type       text,
  p_extracted_text     text,
  p_extracted_excerpt  text,
  p_word_count         int,
  p_error_message      text,
  p_fetch_attempts     int,
  p_expires_at         timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = f, public
AS $$
DECLARE v_result jsonb;
BEGIN
  INSERT INTO f.canonical_content_body (
    canonical_id, resolution_status, fetch_status, fetch_method,
    fetched_at, http_status, final_url, content_type,
    extracted_text, extracted_excerpt, word_count,
    error_message, fetch_attempts, expires_at
  ) VALUES (
    p_canonical_id, p_resolution_status, p_fetch_status, p_fetch_method,
    p_fetched_at, p_http_status, p_final_url, p_content_type,
    p_extracted_text, p_extracted_excerpt, p_word_count,
    p_error_message, p_fetch_attempts, p_expires_at
  )
  ON CONFLICT (canonical_id) DO UPDATE SET
    resolution_status = EXCLUDED.resolution_status,
    fetch_status      = EXCLUDED.fetch_status,
    fetch_method      = EXCLUDED.fetch_method,
    fetched_at        = EXCLUDED.fetched_at,
    http_status       = EXCLUDED.http_status,
    final_url         = EXCLUDED.final_url,
    content_type      = EXCLUDED.content_type,
    extracted_text    = EXCLUDED.extracted_text,
    extracted_excerpt = EXCLUDED.extracted_excerpt,
    word_count        = EXCLUDED.word_count,
    error_message     = EXCLUDED.error_message,
    fetch_attempts    = EXCLUDED.fetch_attempts,
    expires_at        = EXCLUDED.expires_at,
    updated_at        = now()
  RETURNING jsonb_build_object('canonical_id', canonical_id, 'fetch_status', fetch_status) INTO v_result;
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
