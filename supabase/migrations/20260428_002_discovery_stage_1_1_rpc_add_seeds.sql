-- Stage 1.1 — RPC for client onboarding to submit discovery seeds
--
-- Pre-flight corrections (Lesson #32, captured at apply time):
--   PF4: c.client_content_scope has NO is_active column. The brief's RPC
--        used COALESCE(ccs.is_active, true) = true which would error.
--        Actual gating columns are is_primary (boolean) + weight (numeric).
--        Derivation rewritten as: ORDER BY is_primary DESC NULLS LAST,
--        weight DESC, vertical_slug ASC. Picks the primary scope first;
--        falls back to highest-weighted; ties broken alphabetically.
--   PF5: t.content_vertical's slug column is vertical_slug, not slug.
--        Brief's RPC used cv.slug — would error. Use cv.vertical_slug.
--
-- Both corrections preserve the brief's intent ("highest-weighted vertical
-- for this client"). Documented in this comment so the brief author can
-- reconcile the next-stage spec.

CREATE OR REPLACE FUNCTION public.add_client_discovery_seeds(
  p_client_id     uuid,
  p_keywords      text[]  DEFAULT '{}',
  p_example_urls  text[]  DEFAULT '{}'
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
  -- Validate client exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM c.client
    WHERE client_id = p_client_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Client % not found or not active', p_client_id;
  END IF;

  -- Validate at least one input
  IF (array_length(p_keywords, 1) IS NULL OR array_length(p_keywords, 1) = 0)
     AND (array_length(p_example_urls, 1) IS NULL OR array_length(p_example_urls, 1) = 0)
  THEN
    RAISE EXCEPTION 'Must provide at least one keyword or example URL';
  END IF;

  -- Derive primary vertical_slug from client's content scope.
  -- Pick is_primary=true first; if none, pick the highest-weighted scope.
  -- Fallback: 'general' if client has no scope rows yet (won't break the
  -- cron — discovery EF doesn't filter on slug).
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

  -- Insert keyword seeds
  FOREACH v_keyword IN ARRAY p_keywords
  LOOP
    -- Skip empty/whitespace-only entries
    IF length(trim(v_keyword)) = 0 THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Dedupe per (client_id, seed_value) — don't re-submit existing
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
       'client-onboarding');

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  -- Insert URL seeds
  FOREACH v_url IN ARRAY p_example_urls
  LOOP
    IF length(trim(v_url)) = 0 THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Basic URL sanity check
    IF trim(v_url) !~* '^https?://' THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Dedupe per (client_id, seed_value)
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
       'client-onboarding');

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

-- Grants — service_role only. PostgREST will gate the call at the API edge;
-- the dashboard's service_role-keyed Supabase client is the intended caller.
GRANT EXECUTE ON FUNCTION public.add_client_discovery_seeds(uuid, text[], text[])
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.add_client_discovery_seeds(uuid, text[], text[])
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.add_client_discovery_seeds IS
  'Captures client onboarding keywords and example URLs as discovery seeds. '
  'Existing feed-discovery-daily cron at 8pm UTC picks up status=pending rows '
  'and provisions RSS.app feeds. Idempotent on (client_id, seed_value) per type.';
