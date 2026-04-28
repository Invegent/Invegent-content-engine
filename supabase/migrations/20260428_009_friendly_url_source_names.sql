-- Migration 009: friendly URL → source_name
-- 1. New PL/pgSQL helper public.f_url_to_friendly_name(text)
-- 2. Backfill existing URL-shaped source_name values on discovery rows
-- 3. Update public.add_client_discovery_seeds: URL-seed label = friendly name
--
-- Brief: docs/briefs/2026-04-28-feeds-tab-clickability-dual-url.md (section 3.3 + 4.1)

-- ── 1) helper ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.f_url_to_friendly_name(p_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_host text;
  v_path text;
  v_label text;
  v_tail text;
  v_path_descriptor text;
BEGIN
  IF p_url IS NULL OR p_url !~* '^https?://' THEN
    RETURN p_url;
  END IF;

  v_host := lower(regexp_replace(p_url, '^https?://', ''));
  v_path := '';
  IF position('/' in v_host) > 0 THEN
    v_path := substring(v_host from position('/' in v_host));
    v_host := substring(v_host from 1 for position('/' in v_host) - 1);
  END IF;

  v_host := regexp_replace(v_host, '^www\.', '');

  v_label := initcap(split_part(v_host, '.', 1));

  v_tail := lower(trim(both '/' from v_path));
  IF v_tail IN ('', 'feed', 'rss', 'feeds') THEN
    v_path_descriptor := '';
  ELSIF v_tail = 'news' THEN
    v_path_descriptor := ' news';
  ELSIF v_tail LIKE 'news/%' OR v_tail LIKE 'news?%' THEN
    v_path_descriptor := ' news';
  ELSIF v_tail = 'blog' THEN
    v_path_descriptor := ' blog';
  ELSIF v_tail LIKE 'blog/%' OR v_tail LIKE 'blog?%' THEN
    v_path_descriptor := ' blog';
  ELSE
    v_path_descriptor := '';
  END IF;

  RETURN v_label || v_path_descriptor;
END;
$$;

GRANT EXECUTE ON FUNCTION public.f_url_to_friendly_name(text) TO authenticated, service_role, anon;

-- ── 2) backfill ────────────────────────────────────────────────────────────
-- Targets discovery_pipeline rows whose source_name still looks like a URL
-- (set that way by migration 007's seed_value backfill).
UPDATE f.feed_source fs
SET source_name = public.f_url_to_friendly_name(fs.source_name)
WHERE fs.added_by = 'discovery_pipeline'
  AND fs.source_name ~* '^https?://';

-- ── 3) RPC: URL-seed label = friendly name ────────────────────────────────
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
       trim(v_keyword));

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
       public.f_url_to_friendly_name(trim(v_url)));

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
