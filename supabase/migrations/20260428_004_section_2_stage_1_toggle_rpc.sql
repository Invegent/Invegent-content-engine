-- Stage 2.1 — RPC for per-platform publisher profile toggles from dashboard

CREATE OR REPLACE FUNCTION public.update_publish_profile_toggle(
  p_client_id  uuid,
  p_platform   text,
  p_field      text,
  p_value      jsonb,
  p_changed_by text DEFAULT 'dashboard'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, c
AS $$
DECLARE
  v_allowed_fields text[] := ARRAY['mode', 'publish_enabled', 'r6_enabled', 'auto_approve_enabled'];
  v_allowed_modes  text[] := ARRAY['auto', 'manual', 'staging'];
  v_old_value      jsonb;
  v_updated_count  int;
BEGIN
  -- Validate field is in allowed set
  IF NOT (p_field = ANY(v_allowed_fields)) THEN
    RAISE EXCEPTION 'Field % not allowed. Allowed fields: %', p_field, v_allowed_fields;
  END IF;

  -- Validate value shape per field
  IF p_field = 'mode' THEN
    -- mode allows NULL or one of three text values
    IF p_value IS NOT NULL
       AND jsonb_typeof(p_value) != 'null'
       AND NOT (
         jsonb_typeof(p_value) = 'string'
         AND (p_value #>> '{}') = ANY(v_allowed_modes)
       )
    THEN
      RAISE EXCEPTION 'Invalid mode value: %. Allowed: %, or null', p_value, v_allowed_modes;
    END IF;
  ELSE
    -- the 3 boolean fields require boolean
    IF p_value IS NULL OR jsonb_typeof(p_value) != 'boolean' THEN
      RAISE EXCEPTION 'Field % requires a boolean value, got %', p_field, jsonb_typeof(p_value);
    END IF;
  END IF;

  -- Validate target row exists
  IF NOT EXISTS (
    SELECT 1 FROM c.client_publish_profile
    WHERE client_id = p_client_id AND platform = p_platform
  ) THEN
    RAISE EXCEPTION 'No publish profile found for client % on platform %', p_client_id, p_platform;
  END IF;

  -- Capture old value for audit
  EXECUTE format(
    'SELECT to_jsonb(%I) FROM c.client_publish_profile WHERE client_id = $1 AND platform = $2',
    p_field
  ) INTO v_old_value USING p_client_id, p_platform;

  -- Apply update — dynamic SQL because column name is parameter
  IF p_field = 'mode' THEN
    EXECUTE format(
      'UPDATE c.client_publish_profile SET %I = $1, updated_at = NOW() WHERE client_id = $2 AND platform = $3',
      p_field
    ) USING (p_value #>> '{}'), p_client_id, p_platform;
  ELSE
    EXECUTE format(
      'UPDATE c.client_publish_profile SET %I = $1, updated_at = NOW() WHERE client_id = $2 AND platform = $3',
      p_field
    ) USING (p_value)::boolean, p_client_id, p_platform;
  END IF;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count != 1 THEN
    RAISE EXCEPTION 'Expected 1 row updated, got %', v_updated_count;
  END IF;

  -- Audit trail
  INSERT INTO c.client_publish_profile_audit
    (client_id, platform, field, old_value, new_value, changed_by)
  VALUES
    (p_client_id, p_platform, p_field, v_old_value, p_value, p_changed_by);

  RETURN jsonb_build_object(
    'success',    true,
    'client_id',  p_client_id,
    'platform',   p_platform,
    'field',      p_field,
    'old_value',  v_old_value,
    'new_value',  p_value
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_publish_profile_toggle(uuid, text, text, jsonb, text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_publish_profile_toggle(uuid, text, text, jsonb, text)
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.update_publish_profile_toggle IS
  'Updates a single toggle field on c.client_publish_profile with audit trail. '
  'Allowed fields: mode (auto|manual|staging|null), publish_enabled, r6_enabled, '
  'auto_approve_enabled. Stage 2.1 deliverable.';
