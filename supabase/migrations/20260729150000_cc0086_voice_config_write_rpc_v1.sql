-- =====================================================================
-- cc-0086 — Brand Host Voice governed dashboard config, write path.
-- Adds, against c.client_voice_config:
--   (A) public.get_voice_config(uuid)              — READ, dashboard display, fail-closed shape
--   (B) public.save_voice_config(uuid,text,bool,text) — WRITE, service_role-only, UPSERT-capable
-- Plus an append-only audit table:
--   (0) c.client_voice_config_change_log            — write-only via the RPC
--
-- Brief: docs/briefs/cc-0086-brand-host-voice-config-brief-v1.md
-- Pattern cloned from: 20260727150000_pb1_publish_cadence_write_rpc.sql
--
-- WHAT CHANGED vs. the pb1 precedent (deliberate divergences, both PK-specified):
--   * The audit table ships RLS ENABLE **+ FORCE** (the newer, more hardened convention —
--     c.publish_cadence_change_log only has ENABLE). c.client_voice_config itself (the base
--     table, migration 20260719180000) is UNCHANGED and keeps ENABLE-only; this migration
--     touches ONLY the new audit table's RLS posture, never the base table's.
--   * The audit table's REVOKE ALL also names service_role + inspector_ro explicitly (not just
--     PUBLIC/anon/authenticated) — this table is readable/writable by NOTHING directly, not even
--     service_role; only the two SECURITY DEFINER functions below (running as owner postgres)
--     ever touch it.
--   * save_voice_config is UPSERT-capable (INSERT ... ON CONFLICT (client_id) DO UPDATE), unlike
--     save_publish_cadence's UPDATE-ONLY posture — most c.client rows currently have ZERO
--     client_voice_config rows (only property-pulse + ndis-yarns are configured today), and
--     onboarding a brand-new client's voice without a code edit is the whole point of this
--     feature. created_at is never touched on the update path (table DEFAULT sets it on INSERT
--     only; the UPDATE branch's column list deliberately excludes it).
--
-- SAFETY: c.client_voice_config holds NO credentials (elevenlabs_voice_id is a public-ish
-- identifier, not a secret — ELEVENLABS_API_KEY is unchanged and untouched by this migration).
-- Both RPCs validate p_client_id against c.client and raise a clear exception on an unknown id
-- (never a silently-empty shape for a garbage UUID).
--
-- Verified live (READ ONLY, project mbkmaxqhsohbtwsqolns, 2026-07-29 — see brief § Source context):
--   * neither function pre-exists
--   * c.client_voice_config_change_log does NOT pre-exist (greenfield)
--   * c.client_voice_config has PRIMARY KEY (client_id) — the ON CONFLICT target below
--   * exactly 2 of 4 c.client rows have a client_voice_config row (property-pulse, ndis-yarns);
--     care-for-welfare-pty-ltd and invegent have none — the "new brand, no config yet" case
--
-- Bare CREATE FUNCTION (NOT CREATE OR REPLACE) so a pre-existing object aborts this migration
-- fail-closed.
--
-- ATOMICITY: explicit BEGIN/COMMIT wrapper (matching 20260719180000_create_client_voice_config_v1.sql's
-- own convention) so this migration's transactional scope is stated outright rather than resting on
-- an unnamed apply channel's implicit-simple-query-protocol behaviour.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- (0) APPEND-ONLY AUDIT TABLE — c.client_voice_config_change_log
-- Schema c is PostgREST-exposed, so lock it down like publish_cadence_change_log, PLUS the
-- newer FORCE convention and a full REVOKE (including service_role + inspector_ro — nothing
-- reads or writes this table except the SECURITY DEFINER RPCs, running as owner postgres).
-- No update/delete path is ever granted — append-only.
-- ---------------------------------------------------------------------
CREATE TABLE c.client_voice_config_change_log (
  log_id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                   uuid NOT NULL,
  changed_by                  text,            -- best-effort actor (free-text; ICE has no real actor identity)
  old_elevenlabs_voice_id     text,
  new_elevenlabs_voice_id     text,
  old_enabled                 boolean,
  new_enabled                 boolean,
  changed_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE c.client_voice_config_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE c.client_voice_config_change_log FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE c.client_voice_config_change_log FROM PUBLIC, anon, authenticated;
-- schema-c default ACL auto-grants SELECT to service_role + inspector_ro on new tables; revoke
-- those too so the table is literally grant-less (append-only, readable/writable ONLY via the
-- definer RPCs running as owner postgres — not even service_role touches it directly).
REVOKE ALL ON TABLE c.client_voice_config_change_log FROM service_role, inspector_ro;

COMMENT ON TABLE c.client_voice_config_change_log IS
  'cc-0086 append-only audit of Brand Host Voice config changes. Written ONLY by '
  'public.save_voice_config (SECURITY DEFINER, owner postgres). RLS ENABLE+FORCE with no '
  'policy and NO grants to any role, including service_role — no role reads or writes it directly.';

-- ---------------------------------------------------------------------
-- (A) READ RPC — public.get_voice_config(p_client_id uuid)
-- Fail-closed SHAPE (no row is NOT an error): configured=false + nulls when no
-- client_voice_config row exists. changed_by/changed_at come from the latest audit-log row
-- (LEFT JOIN LATERAL) when one exists, else null (e.g. the two pre-feature PP/NDIS rows).
-- Unknown p_client_id (not in c.client) IS an error — raised, never a silent empty shape.
-- ---------------------------------------------------------------------
CREATE FUNCTION public.get_voice_config(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
STABLE
AS $function$
DECLARE
  v_client_exists      boolean;
  v_voice_id           text;
  v_enabled            boolean;
  v_updated_at         timestamptz;
  v_changed_by         text;
BEGIN
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'p_client_id must not be null'
      USING ERRCODE = '22004';
  END IF;

  SELECT EXISTS (SELECT 1 FROM c.client AS cl WHERE cl.client_id = p_client_id)
    INTO v_client_exists;

  IF NOT v_client_exists THEN
    RAISE EXCEPTION 'unknown client_id % (no matching c.client row)', p_client_id
      USING ERRCODE = '23503';
  END IF;

  -- LEFT JOIN so a client with NO client_voice_config row still returns a row (all voice
  -- columns null => configured=false); LEFT JOIN LATERAL so a config row with NO audit history
  -- yet (the two pre-existing PP/NDIS rows) still returns changed_by=null rather than excluding
  -- the row.
  SELECT cvc.elevenlabs_voice_id, cvc.enabled, cvc.updated_at, latest.changed_by
    INTO v_voice_id, v_enabled, v_updated_at, v_changed_by
    FROM c.client_voice_config AS cvc
    LEFT JOIN LATERAL (
      SELECT l.changed_by
        FROM c.client_voice_config_change_log AS l
       WHERE l.client_id = p_client_id
       ORDER BY l.changed_at DESC
       LIMIT 1
    ) AS latest ON true
   WHERE cvc.client_id = p_client_id;

  RETURN jsonb_build_object(
    'client_id',           p_client_id,
    'configured',          (v_voice_id IS NOT NULL),
    'elevenlabs_voice_id', v_voice_id,
    'enabled',             v_enabled,
    'updated_at',          v_updated_at,
    'changed_by',          v_changed_by
  );
END;
$function$;

COMMENT ON FUNCTION public.get_voice_config(uuid) IS
  'cc-0086 READ: returns Brand Host Voice config status for a client as jsonb '
  '{client_id, configured, elevenlabs_voice_id, enabled, updated_at, changed_by}. '
  'configured=false + all nulls when no client_voice_config row exists (never an error). '
  'Unknown client_id (not in c.client) RAISES. changed_by is sourced from the latest '
  'c.client_voice_config_change_log row for the client, or null if none exists yet.';

-- ---------------------------------------------------------------------
-- (B) WRITE RPC — public.save_voice_config(uuid, text, boolean, text)
-- UPSERT-capable (unlike save_publish_cadence's UPDATE-ONLY): most clients today have ZERO
-- client_voice_config rows, and first-time configuration (no code edit) is the point.
-- Captures old values (null when there was no prior row = "first configuration", not an error).
-- ---------------------------------------------------------------------
CREATE FUNCTION public.save_voice_config(
  p_client_id                uuid,
  p_elevenlabs_voice_id      text,
  p_enabled                  boolean,
  p_changed_by               text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_client_exists      boolean;
  v_voice_id_trimmed   text;
  v_old_voice_id       text;
  v_old_enabled        boolean;
  v_new_voice_id       text;
  v_new_enabled        boolean;
  v_new_updated_at     timestamptz;
BEGIN
  -- ---- Validation (fail-closed, BEFORE any write) ----
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'p_client_id must not be null'
      USING ERRCODE = '22004';
  END IF;

  SELECT EXISTS (SELECT 1 FROM c.client AS cl WHERE cl.client_id = p_client_id)
    INTO v_client_exists;

  IF NOT v_client_exists THEN
    RAISE EXCEPTION 'unknown client_id % (no matching c.client row)', p_client_id
      USING ERRCODE = '23503';
  END IF;

  -- Mirrors the table's own CHECK (btrim(elevenlabs_voice_id) <> '') but fails with a clear
  -- RPC-level message rather than a raw constraint violation surfaced to the dashboard.
  v_voice_id_trimmed := btrim(COALESCE(p_elevenlabs_voice_id, ''));
  IF p_elevenlabs_voice_id IS NULL OR v_voice_id_trimmed = '' THEN
    RAISE EXCEPTION 'p_elevenlabs_voice_id must not be null or blank'
      USING ERRCODE = '23514';
  END IF;

  IF p_enabled IS NULL THEN
    RAISE EXCEPTION 'p_enabled must not be null'
      USING ERRCODE = '22004';
  END IF;

  -- ---- Capture OLD values (row may not exist — null values = "first configuration") ----
  SELECT cvc.elevenlabs_voice_id, cvc.enabled
    INTO v_old_voice_id, v_old_enabled
    FROM c.client_voice_config AS cvc
   WHERE cvc.client_id = p_client_id;

  -- ---- Upsert (INSERT-or-UPDATE, PK = client_id). created_at is NEVER touched on the update
  -- path (its table DEFAULT fires on INSERT only; the SET list below deliberately omits it). ----
  INSERT INTO c.client_voice_config (client_id, elevenlabs_voice_id, enabled, updated_at)
  VALUES (p_client_id, v_voice_id_trimmed, p_enabled, now())
  ON CONFLICT (client_id) DO UPDATE
    SET elevenlabs_voice_id = EXCLUDED.elevenlabs_voice_id,
        enabled             = EXCLUDED.enabled,
        updated_at          = now()
  RETURNING elevenlabs_voice_id, enabled, updated_at
    INTO v_new_voice_id, v_new_enabled, v_new_updated_at;

  -- ---- Append-only audit row (one per accepted change; old values null on first config) ----
  INSERT INTO c.client_voice_config_change_log (
    client_id,
    changed_by,
    old_elevenlabs_voice_id,
    new_elevenlabs_voice_id,
    old_enabled,
    new_enabled
  ) VALUES (
    p_client_id,
    p_changed_by,
    v_old_voice_id,
    v_new_voice_id,
    v_old_enabled,
    v_new_enabled
  );

  RETURN jsonb_build_object(
    'client_id',           p_client_id,
    'elevenlabs_voice_id', v_new_voice_id,
    'enabled',             v_new_enabled,
    'updated_at',          v_new_updated_at,
    'changed_by',          p_changed_by,
    'previous',            jsonb_build_object(
      'elevenlabs_voice_id', v_old_voice_id,
      'enabled',             v_old_enabled
    )
  );
END;
$function$;

COMMENT ON FUNCTION public.save_voice_config(uuid, text, boolean, text) IS
  'cc-0086 WRITE (service_role-only): UPSERTs c.client_voice_config for a client '
  '(INSERT ... ON CONFLICT (client_id) DO UPDATE — first-time configuration is NOT an error), '
  'capturing old values (null on first configuration) to the append-only '
  'c.client_voice_config_change_log. Fail-closed validation: unknown client_id, null/blank '
  'elevenlabs_voice_id, or null enabled all RAISE before any write. Never touches created_at '
  'on the update path.';

-- ---------------------------------------------------------------------
-- (C) Grants — both functions: service_role-only, owner postgres
-- (The audit table gets NO grants — see section 0.)
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_voice_config(uuid)
  FROM PUBLIC, anon, authenticated;
-- Defensive, matching the audit table's own pattern above: make the "service_role-only" claim
-- self-enforcing rather than resting on an unverified default-ACL assumption (neutralizes any
-- default EXECUTE grant a future ACL change might introduce for these roles on new functions).
REVOKE ALL ON FUNCTION public.get_voice_config(uuid)
  FROM service_role, inspector_ro;
GRANT EXECUTE ON FUNCTION public.get_voice_config(uuid)
  TO service_role;
ALTER FUNCTION public.get_voice_config(uuid)
  OWNER TO postgres;

REVOKE ALL ON FUNCTION public.save_voice_config(uuid, text, boolean, text)
  FROM PUBLIC, anon, authenticated;
-- Defensive, same rationale as get_voice_config above.
REVOKE ALL ON FUNCTION public.save_voice_config(uuid, text, boolean, text)
  FROM service_role, inspector_ro;
GRANT EXECUTE ON FUNCTION public.save_voice_config(uuid, text, boolean, text)
  TO service_role;
ALTER FUNCTION public.save_voice_config(uuid, text, boolean, text)
  OWNER TO postgres;

COMMIT;

-- =====================================================================
-- ROLLBACK (ordered; run top-to-bottom — drop functions before the table they reference):
--   DROP FUNCTION IF EXISTS public.save_voice_config(uuid, text, boolean, text);
--   DROP FUNCTION IF EXISTS public.get_voice_config(uuid);
--   DROP TABLE IF EXISTS c.client_voice_config_change_log;
-- c.client_voice_config itself (the base table, migration 20260719180000) is NOT touched by
-- this migration and is NOT part of this rollback.
-- =====================================================================
