-- =====================================================================
-- PB1 — Publish-cadence write path (Path B), fenced.
-- Adds, against c.client_publish_profile:
--   (A) public.get_publish_cadence(uuid)                      — READ, dashboard display
--   (B) public.save_publish_cadence(uuid,text,int,int,text)   — WRITE, service_role-only
-- Plus an append-only audit table:
--   (0) c.publish_cadence_change_log                          — write-only via the RPC
--
-- SAFETY: c.client_publish_profile also holds credentials
-- (page_access_token, credential_env_key, token_expires_at, page_id, ...).
-- The WRITE RPC touches a strict COLUMN WHITELIST only
-- (max_per_day, max_queued_per_platform, updated_at) and is UPDATE-ONLY
-- (never INSERT — a partial insert would leave a credential-less row).
--
-- Verified live (READ ONLY, project mbkmaxqhsohbtwsqolns, 2026-07-27):
--   * neither function pre-exists
--   * c.publish_cadence_change_log does NOT pre-exist (greenfield)
--   * c.client_publish_profile has UNIQUE (client_id, platform)
--   * columns present: max_per_day, max_queued_per_platform (NOT NULL dflt 10),
--     min_gap_minutes, publish_enabled, updated_at (EXISTS -> included in SET)
--
-- Bare CREATE FUNCTION (NOT CREATE OR REPLACE) so a pre-existing object
-- aborts this migration fail-closed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (0) APPEND-ONLY AUDIT TABLE — c.publish_cadence_change_log
-- Schema c is PostgREST-exposed, so lock it down like the cap table:
-- RLS ENABLE + FORCE (no policy => zero rows visible to any client role),
-- REVOKE ALL FROM PUBLIC, anon, authenticated; NO grants to anyone.
-- Only the SECURITY DEFINER RPC (running as owner postgres) inserts.
-- No update/delete path is ever granted — append-only.
-- ---------------------------------------------------------------------
CREATE TABLE c.publish_cadence_change_log (
  log_id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                    uuid NOT NULL,
  platform                     text NOT NULL,
  changed_by                   text,            -- best-effort actor (free-text; ICE has no real actor identity)
  old_max_per_day              integer,
  new_max_per_day              integer,
  old_max_queued_per_platform  integer,
  new_max_queued_per_platform  integer,
  changed_at                   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE c.publish_cadence_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE c.publish_cadence_change_log FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE c.publish_cadence_change_log FROM PUBLIC, anon, authenticated;
-- schema-c default ACL auto-grants SELECT to service_role + inspector_ro on new
-- tables; revoke those too so the table is literally grant-less (append-only,
-- readable/writable ONLY via the definer RPC running as owner postgres).
REVOKE ALL ON TABLE c.publish_cadence_change_log FROM service_role, inspector_ro;

COMMENT ON TABLE c.publish_cadence_change_log IS
  'PB1 append-only audit of publish-cadence changes. Written ONLY by '
  'public.save_publish_cadence (SECURITY DEFINER, owner postgres). RLS '
  'ENABLE+FORCE with no policy and no grants — no client role reads or writes it.';

-- ---------------------------------------------------------------------
-- (A) READ RPC — public.get_publish_cadence(p_client_id uuid)
-- ---------------------------------------------------------------------
CREATE FUNCTION public.get_publish_cadence(p_client_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
STABLE
AS $function$
  SELECT COALESCE(
    jsonb_object_agg(
      cpp.platform,
      jsonb_build_object(
        'max_per_day',             cpp.max_per_day,
        'max_queued_per_platform', cpp.max_queued_per_platform,
        'min_gap_minutes',         cpp.min_gap_minutes,
        'publish_enabled',         cpp.publish_enabled
      )
    ),
    '{}'::jsonb
  )
  FROM c.client_publish_profile AS cpp
  WHERE cpp.client_id = p_client_id;
$function$;

COMMENT ON FUNCTION public.get_publish_cadence(uuid) IS
  'PB1 READ: returns current publish cadence per platform for a client as a '
  'jsonb object {platform: {max_per_day, max_queued_per_platform, '
  'min_gap_minutes, publish_enabled}}. Credentials never returned.';

-- ---------------------------------------------------------------------
-- (B) WRITE RPC — public.save_publish_cadence(uuid, text, int, int, text)
-- UPDATE-ONLY, strict column whitelist. service_role-only.
-- Captures old values, enforces LinkedIn hard clamp, audits every change.
-- ---------------------------------------------------------------------
CREATE FUNCTION public.save_publish_cadence(
  p_client_id                uuid,
  p_platform                 text,
  p_max_per_day              integer,
  p_max_queued_per_platform  integer,
  p_changed_by               text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_old_mpd        integer;
  v_old_mq         integer;
  v_max_per_day    integer;
  v_max_queued     integer;
  v_warning        text := NULL;
BEGIN
  -- ---- Validation (fail-closed, BEFORE any write) ----
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'p_client_id must not be null'
      USING ERRCODE = '22004';
  END IF;

  IF p_platform IS NULL
     OR p_platform NOT IN ('facebook','instagram','linkedin','youtube') THEN
    RAISE EXCEPTION 'p_platform must be one of facebook,instagram,linkedin,youtube (got %)', p_platform
      USING ERRCODE = '22023';
  END IF;

  -- max_per_day is REQUIRED and bounded 1..10
  IF p_max_per_day IS NULL OR p_max_per_day < 1 OR p_max_per_day > 10 THEN
    RAISE EXCEPTION 'p_max_per_day must be an integer in 1..10 (got %)', p_max_per_day
      USING ERRCODE = '23514';
  END IF;

  -- LinkedIn HARD CLAMP (PK decision): max_per_day capped at 2 for linkedin only.
  IF p_platform = 'linkedin' AND p_max_per_day > 2 THEN
    RAISE EXCEPTION 'linkedin max_per_day is capped at 2 by design (got %)', p_max_per_day
      USING ERRCODE = '23514';
  END IF;

  -- max_queued is OPTIONAL: NULL => leave unchanged; if provided, bounded 1..50
  IF p_max_queued_per_platform IS NOT NULL
     AND (p_max_queued_per_platform < 1 OR p_max_queued_per_platform > 50) THEN
    RAISE EXCEPTION 'p_max_queued_per_platform, when provided, must be in 1..50 (got %)', p_max_queued_per_platform
      USING ERRCODE = '23514';
  END IF;

  -- ---- Capture OLD values + fail-closed existence check ----
  -- Profile row must already exist (it carries credentials). Never INSERT it.
  SELECT cpp.max_per_day, cpp.max_queued_per_platform
    INTO v_old_mpd, v_old_mq
    FROM c.client_publish_profile AS cpp
   WHERE cpp.client_id = p_client_id
     AND cpp.platform  = p_platform;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'publish profile not found for client % platform % (no row created)', p_client_id, p_platform
      USING ERRCODE = '23503';
  END IF;

  -- ---- Whitelisted UPDATE-ONLY write ----
  -- SET names ONLY max_per_day, max_queued_per_platform, updated_at.
  -- NEVER touches any token/credential/publish_enabled/other column.
  UPDATE c.client_publish_profile AS cpp
     SET max_per_day             = p_max_per_day,
         max_queued_per_platform = COALESCE(p_max_queued_per_platform, cpp.max_queued_per_platform),
         updated_at              = now()
   WHERE cpp.client_id = p_client_id
     AND cpp.platform  = p_platform
  RETURNING cpp.max_per_day, cpp.max_queued_per_platform
       INTO v_max_per_day, v_max_queued;

  -- ---- Append-only audit row (one per accepted change) ----
  INSERT INTO c.publish_cadence_change_log (
    client_id,
    platform,
    changed_by,
    old_max_per_day,
    new_max_per_day,
    old_max_queued_per_platform,
    new_max_queued_per_platform
  ) VALUES (
    p_client_id,
    p_platform,
    p_changed_by,
    v_old_mpd,
    p_max_per_day,
    v_old_mq,
    COALESCE(p_max_queued_per_platform, v_old_mq)
  );

  -- LinkedIn accepted value is informational-warned (PK decision).
  IF p_platform = 'linkedin' THEN
    v_warning := 'linkedin_cadence_is_by_design_2_per_day';
  END IF;

  RETURN jsonb_build_object(
    'ok',                      true,
    'client_id',               p_client_id,
    'platform',                p_platform,
    'max_per_day',             v_max_per_day,
    'max_queued_per_platform', v_max_queued,
    'warning',                 v_warning
  );
END;
$function$;

COMMENT ON FUNCTION public.save_publish_cadence(uuid, text, integer, integer, text) IS
  'PB1 WRITE (service_role-only): sets max_per_day / max_queued_per_platform '
  'for an EXISTING (client_id, platform) publish profile, capturing old values '
  'to the append-only c.publish_cadence_change_log. UPDATE-ONLY, strict column '
  'whitelist (max_per_day, max_queued_per_platform, updated_at) — never touches '
  'credentials or publish_enabled. LinkedIn hard-clamped to max_per_day<=2. '
  'Fail-closed validation; missing profile row -> raise (never INSERT).';

-- ---------------------------------------------------------------------
-- (C) Grants — both functions: service_role-only, owner postgres
-- (The audit table gets NO grants — see section 0.)
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_publish_cadence(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_publish_cadence(uuid)
  TO service_role;
ALTER FUNCTION public.get_publish_cadence(uuid)
  OWNER TO postgres;

REVOKE ALL ON FUNCTION public.save_publish_cadence(uuid, text, integer, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_publish_cadence(uuid, text, integer, integer, text)
  TO service_role;
ALTER FUNCTION public.save_publish_cadence(uuid, text, integer, integer, text)
  OWNER TO postgres;
