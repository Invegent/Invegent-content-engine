-- ============================================================================
-- RECONCILIATION BACKFILL (cc-0087, 2026-07-29): this file was NOT originally
-- committed to git under this name/version. It reproduces exact content that was
-- actually applied LIVE to project mbkmaxqhsohbtwsqolns, sourced from:
--   git branch posting-cap-p1 (commit 684e19e), cherry-picked
-- Any 'NOT APPLIED' / 'PREPARED' / 'DESIGN' framing below is the ORIGINAL packet's
-- pre-apply language, preserved for historical fidelity -- it is STALE; this
-- migration IS live (confirmed against the Supabase migration ledger and, where
-- checked, live pg_get_functiondef/information_schema state). See
-- docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md.
-- ============================================================================

-- ============================================================================
-- pa1 — Per-(client,platform) schedule-cap override store
-- ============================================================================
-- Greenfield (verified 2026-07-27, read-only, project mbkmaxqhsohbtwsqolns):
--   * c.client_schedule_cap_override        does NOT exist
--   * public.save_schedule_cap_override(...)  does NOT exist
--   * public.get_schedule_caps(...)           does NOT exist
--
-- Purpose: UI-ADVISORY store. Lets an operator raise how many slots the
-- dashboard ScheduleTab permits per (client, platform), overriding the
-- hardcoded client-side TIERS constant (standard = 2/day, 5/week). NULL
-- max_* => fall back to the hardcoded standard tier. NOT read by any worker;
-- does not change publishing behaviour. Access is ONLY via the two SECURITY
-- DEFINER RPCs below (owned by postgres); the table itself is locked down
-- because schema c is PostgREST-exposed and new tables are born with a
-- permissive default ACL.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (A) Table
-- ----------------------------------------------------------------------------
CREATE TABLE c.client_schedule_cap_override (
  override_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL REFERENCES c.client(client_id),
  platform     text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
  max_per_day  integer CHECK (max_per_day  IS NULL OR (max_per_day  BETWEEN 1 AND 10)),
  max_per_week integer CHECK (max_per_week IS NULL OR (max_per_week BETWEEN 1 AND 50)),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, platform)
);

COMMENT ON TABLE c.client_schedule_cap_override IS 'Per-(client,platform) operator override of the dashboard schedule cap (UI-advisory: raises how many slots ScheduleTab lets an operator schedule; NULL max_* = fall back to the hardcoded standard tier). NOT read by any worker; does not change publishing.';

-- ----------------------------------------------------------------------------
-- (B) Lock-down — schema c is PostgREST-exposed, so this is mandatory.
--     No RLS policy is created => deny-by-default. Access is only via the
--     SECURITY DEFINER RPCs below, which are owned by postgres.
-- ----------------------------------------------------------------------------
ALTER TABLE c.client_schedule_cap_override ENABLE ROW LEVEL SECURITY;
ALTER TABLE c.client_schedule_cap_override FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE c.client_schedule_cap_override FROM PUBLIC;
REVOKE ALL ON TABLE c.client_schedule_cap_override FROM anon;
REVOKE ALL ON TABLE c.client_schedule_cap_override FROM authenticated;

-- ----------------------------------------------------------------------------
-- (C) Read RPC — public.get_schedule_caps(p_client_id uuid) RETURNS jsonb
--     Returns a jsonb object keyed by platform, each value
--     {"max_per_day":<int|null>,"max_per_week":<int|null>}, ONLY for platforms
--     that have an override row for the client. Unset platforms are omitted so
--     the dashboard applies its tier default. Returns {} when none.
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.get_schedule_caps(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT coalesce(
           jsonb_object_agg(
             o.platform,
             jsonb_build_object(
               'max_per_day',  o.max_per_day,
               'max_per_week', o.max_per_week
             )
           ),
           '{}'::jsonb
         )
    INTO v_result
    FROM c.client_schedule_cap_override AS o
   WHERE o.client_id = p_client_id;

  RETURN v_result;
END;
$function$;

-- ----------------------------------------------------------------------------
-- (D) Write RPC — public.save_schedule_cap_override(...)
--     Fail-closed: no catch-all handlers. Every failure RAISEs a specific
--     SQLSTATE and aborts.
--       * p_client_id NULL                -> 22004 (null_value_not_allowed)
--       * p_platform not one of the 4     -> 22023 (invalid_parameter_value)
--       * out-of-bounds non-null max_*    -> 23514 (check_violation)
--       * client not found in c.client    -> 23503 (foreign_key_violation)
--     Both max_* NULL  -> DELETE the override row (reset to tier default).
--     Otherwise        -> UPSERT on (client_id, platform).
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.save_schedule_cap_override(
  p_client_id   uuid,
  p_platform    text,
  p_max_per_day integer,
  p_max_per_week integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_exists boolean;
BEGIN
  -- Argument validation (fail-closed, specific SQLSTATEs) --------------------
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'p_client_id must not be null'
      USING ERRCODE = '22004';
  END IF;

  IF p_platform IS NULL OR p_platform NOT IN ('facebook','instagram','linkedin','youtube') THEN
    RAISE EXCEPTION 'p_platform must be one of facebook, instagram, linkedin, youtube (got %)', p_platform
      USING ERRCODE = '22023';
  END IF;

  IF p_max_per_day IS NOT NULL AND (p_max_per_day < 1 OR p_max_per_day > 10) THEN
    RAISE EXCEPTION 'p_max_per_day must be between 1 and 10 (got %)', p_max_per_day
      USING ERRCODE = '23514';
  END IF;

  IF p_max_per_week IS NOT NULL AND (p_max_per_week < 1 OR p_max_per_week > 50) THEN
    RAISE EXCEPTION 'p_max_per_week must be between 1 and 50 (got %)', p_max_per_week
      USING ERRCODE = '23514';
  END IF;

  -- Client must exist --------------------------------------------------------
  SELECT EXISTS (
           SELECT 1 FROM c.client AS cl WHERE cl.client_id = p_client_id
         )
    INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'client % does not exist in c.client', p_client_id
      USING ERRCODE = '23503';
  END IF;

  -- Both NULL => clear (reset to tier default) -------------------------------
  IF p_max_per_day IS NULL AND p_max_per_week IS NULL THEN
    DELETE FROM c.client_schedule_cap_override AS o
     WHERE o.client_id = p_client_id
       AND o.platform  = p_platform;

    RETURN jsonb_build_object(
      'ok',        true,
      'action',    'cleared',
      'client_id', p_client_id,
      'platform',  p_platform
    );
  END IF;

  -- Otherwise UPSERT ---------------------------------------------------------
  INSERT INTO c.client_schedule_cap_override AS o
         (client_id, platform, max_per_day, max_per_week)
  VALUES (p_client_id, p_platform, p_max_per_day, p_max_per_week)
  ON CONFLICT (client_id, platform) DO UPDATE
    SET max_per_day  = EXCLUDED.max_per_day,
        max_per_week = EXCLUDED.max_per_week,
        updated_at   = now();

  RETURN jsonb_build_object(
    'ok',           true,
    'action',       'set',
    'client_id',    p_client_id,
    'platform',     p_platform,
    'max_per_day',  p_max_per_day,
    'max_per_week', p_max_per_week
  );
END;
$function$;

-- ----------------------------------------------------------------------------
-- (E) Grants — public functions are born anon-executable, so revoke is
--     mandatory. Owned by postgres so SECURITY DEFINER runs as postgres.
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_schedule_caps(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_schedule_caps(uuid) TO service_role;
ALTER FUNCTION public.get_schedule_caps(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.save_schedule_cap_override(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_schedule_cap_override(uuid, text, integer, integer) TO service_role;
ALTER FUNCTION public.save_schedule_cap_override(uuid, text, integer, integer) OWNER TO postgres;
