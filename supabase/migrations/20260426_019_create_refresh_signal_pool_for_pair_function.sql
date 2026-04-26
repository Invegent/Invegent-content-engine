-- Stage 3.019 — m.refresh_signal_pool_for_pair: upsert one (canonical, vertical) pool entry
-- Per LD2/F9: only reset pool_expires_at when content_class actually changes OR
-- when re-activating an inactive entry. Existing active entries with same class get
-- fitness/source refresh but keep their original expiry.

CREATE OR REPLACE FUNCTION m.refresh_signal_pool_for_pair(
  p_canonical_id uuid,
  p_vertical_id  integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_class           text;
  v_freshness_hours integer;
  v_fitness_jsonb   jsonb;
  v_fitness_max     numeric;
  v_url             text;
  v_source_domain   text;
  v_source_count    integer;
  v_existing_class  text;
  v_existing_active boolean;
  v_should_reset_expiry boolean;
BEGIN
  -- 1. Read class and url from canonical body + item
  SELECT ccb.content_class, cci.canonical_url
    INTO v_class, v_url
  FROM f.canonical_content_body ccb
  JOIN f.canonical_content_item cci ON cci.canonical_id = ccb.canonical_id
  WHERE ccb.canonical_id = p_canonical_id;

  -- Defensive: if no body or no class, do nothing (trigger shouldn't have fired,
  -- but a manual call could land here)
  IF v_class IS NULL THEN
    RETURN;
  END IF;

  -- 2. Freshness window for this class
  SELECT freshness_window_hours INTO v_freshness_hours
  FROM t.class_freshness_rule
  WHERE class_code = v_class;

  -- Defensive default: if no rule for this class (e.g. a new class added without
  -- a freshness rule), use 168h (7 days).
  IF v_freshness_hours IS NULL THEN
    v_freshness_hours := 168;
  END IF;

  -- 3. Build fitness_per_format jsonb from t.class_format_fitness (global, current)
  SELECT
    jsonb_object_agg(ice_format_key, fitness_score),
    MAX(fitness_score)
    INTO v_fitness_jsonb, v_fitness_max
  FROM t.class_format_fitness
  WHERE class_code = v_class AND is_current = TRUE;

  -- Defensive: if no fitness rows for this class, fall back to empty + 0 max
  IF v_fitness_jsonb IS NULL THEN
    v_fitness_jsonb := '{}'::jsonb;
    v_fitness_max := 0;
  END IF;

  -- 4. Extract source_domain from canonical_url (lowercased host before path/port)
  v_source_domain := lower(substring(coalesce(v_url, '') FROM '(?:https?://)?([^/:]+)'));
  IF v_source_domain = '' THEN
    v_source_domain := NULL;
  END IF;

  -- 5. Source count: how many distinct content_item rows produced this canonical
  SELECT COUNT(DISTINCT ci.source_id) INTO v_source_count
  FROM f.content_item_canonical_map ccm
  JOIN f.content_item ci ON ci.content_item_id = ccm.content_item_id
  WHERE ccm.canonical_id = p_canonical_id;
  IF v_source_count IS NULL OR v_source_count < 1 THEN
    v_source_count := 1;
  END IF;

  -- 6. Look up existing entry to apply F9 logic
  SELECT content_class, is_active
    INTO v_existing_class, v_existing_active
  FROM m.signal_pool
  WHERE canonical_id = p_canonical_id AND vertical_id = p_vertical_id;

  -- F9: reset expiry on (a) new entry, (b) class changed, (c) re-activating inactive entry
  v_should_reset_expiry := (
    v_existing_class IS NULL
    OR v_existing_class IS DISTINCT FROM v_class
    OR v_existing_active = FALSE
  );

  -- 7. UPSERT
  INSERT INTO m.signal_pool (
    canonical_id, vertical_id, content_class,
    pool_entered_at, pool_expires_at, is_active,
    fitness_per_format, fitness_score_max,
    source_domain, source_count
  ) VALUES (
    p_canonical_id, p_vertical_id, v_class,
    now(), now() + make_interval(hours => v_freshness_hours), TRUE,
    v_fitness_jsonb, v_fitness_max,
    v_source_domain, v_source_count
  )
  ON CONFLICT (canonical_id, vertical_id) DO UPDATE SET
    content_class      = EXCLUDED.content_class,
    fitness_per_format = EXCLUDED.fitness_per_format,
    fitness_score_max  = EXCLUDED.fitness_score_max,
    source_domain      = EXCLUDED.source_domain,
    source_count       = EXCLUDED.source_count,
    is_active          = TRUE,
    -- F9: only reset entered_at + expires_at when reset condition met
    pool_entered_at    = CASE WHEN v_should_reset_expiry
                              THEN EXCLUDED.pool_entered_at
                              ELSE m.signal_pool.pool_entered_at END,
    pool_expires_at    = CASE WHEN v_should_reset_expiry
                              THEN EXCLUDED.pool_expires_at
                              ELSE m.signal_pool.pool_expires_at END,
    updated_at         = now();
END;
$$;

COMMENT ON FUNCTION m.refresh_signal_pool_for_pair(uuid, integer) IS
  'Upsert one (canonical, vertical) entry in m.signal_pool. F9: pool_expires_at only resets on class change or inactive→active. Stage 3.019.';
