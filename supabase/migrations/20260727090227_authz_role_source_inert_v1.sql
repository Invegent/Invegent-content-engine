-- authz_role_source_inert_v1 — inert role source of truth (cc-0046 Slice 0.5).
-- APPLIED live 2026-07-27 via apply_migration, ledger version 20260727090227 (this file records it in-repo).
-- Reviewed package SQL sha256 (§1-§6 pre-annotation) = cc902a96778de266696ca9f958357dbe4440d7b997930a17ef422600cc6c3cf2.
-- Chain: db-rls-auditor (concerns->fixed) · security-auditor (concerns/GREEN-inert->fixed) · external df82a33b (partial->PK, no concrete defect).
-- INERT: nothing reads current_user_roles() yet => zero behaviour change. Enforcement is a SEPARATE later PK gate.

-- schema
CREATE SCHEMA IF NOT EXISTS authz;
REVOKE ALL   ON SCHEMA authz FROM PUBLIC;
REVOKE USAGE ON SCHEMA authz FROM anon, authenticated;
GRANT  USAGE ON SCHEMA authz TO service_role;

-- role table
CREATE TABLE authz.user_role (
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('viewer','governance_operator','administrator')),
  client_id   uuid        NULL,
  granted_by  uuid        NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_role_pkey PRIMARY KEY (user_id, role),
  CONSTRAINT user_role_client_id_pinned_null CHECK (client_id IS NULL)
);
ALTER TABLE authz.user_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE authz.user_role FORCE  ROW LEVEL SECURITY;
COMMENT ON TABLE authz.user_role IS 'authz role source. RLS ENABLE+FORCE zero policies = deny-by-default. FORCE is INERT vs postgres/service_role (rolbypassrls=TRUE) — defence-in-depth only; real boundary vs anon/authenticated = schema USAGE-fence + REVOKE. Reads via public.current_user_roles() (SECDEF); writes via authz.grant_role/revoke_role (SECDEF, service_role-only). client_id pinned NULL until v2 per-client scope.';
REVOKE ALL ON authz.user_role FROM PUBLIC, anon, authenticated;

-- append-only audit table
CREATE TABLE authz.role_audit (
  id                   bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at                   timestamptz NOT NULL DEFAULT now(),
  actor_user_id        uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_uid_snapshot   uuid        NOT NULL,
  actor_email_snapshot text        NOT NULL,
  action               text        NOT NULL CHECK (action IN ('grant','revoke','bootstrap')),
  target_user_id       uuid        NOT NULL,
  role                 text        NOT NULL,
  is_self_mod          boolean     NOT NULL DEFAULT false,
  outcome              text        NOT NULL,
  detail               jsonb       NULL
);
ALTER TABLE authz.role_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE authz.role_audit FORCE  ROW LEVEL SECURITY;
REVOKE ALL ON authz.role_audit FROM PUBLIC, anon, authenticated;

-- read fn (Shape A: zero-arg, auth.uid(), granted authenticated)
CREATE OR REPLACE FUNCTION public.current_user_roles()
RETURNS TABLE (role text, client_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT ur.role, ur.client_id
  FROM authz.user_role ur
  WHERE ur.user_id = auth.uid()
$fn$;
REVOKE ALL ON FUNCTION public.current_user_roles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_roles() TO authenticated;

-- write fns (Shape B: service_role-only, re-validate administrator inside, fail-closed)
CREATE OR REPLACE FUNCTION authz.grant_role(
  p_actor_user_id uuid, p_actor_email text, p_target_user_id uuid, p_role text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE v_is_admin boolean; v_rows int;
BEGIN
  IF p_role NOT IN ('viewer','governance_operator','administrator') THEN
    RAISE EXCEPTION 'authz.grant_role: invalid role %', p_role USING ERRCODE = '22023';
  END IF;
  SELECT EXISTS (SELECT 1 FROM authz.user_role WHERE user_id = p_actor_user_id AND role = 'administrator')
    INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'authz.grant_role: actor % is not an administrator', p_actor_user_id USING ERRCODE = '42501';
  END IF;
  INSERT INTO authz.user_role (user_id, role, granted_by)
    VALUES (p_target_user_id, p_role, p_actor_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  INSERT INTO authz.role_audit
    (actor_user_id, actor_uid_snapshot, actor_email_snapshot, action, target_user_id, role, is_self_mod, outcome)
    VALUES (p_actor_user_id, p_actor_user_id, p_actor_email, 'grant', p_target_user_id, p_role,
            p_actor_user_id = p_target_user_id, CASE WHEN v_rows > 0 THEN 'applied' ELSE 'noop' END);
END $fn$;

CREATE OR REPLACE FUNCTION authz.revoke_role(
  p_actor_user_id uuid, p_actor_email text, p_target_user_id uuid, p_role text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE v_is_admin boolean; v_admin_count int; v_rows int;
BEGIN
  SELECT EXISTS (SELECT 1 FROM authz.user_role WHERE user_id = p_actor_user_id AND role = 'administrator')
    INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'authz.revoke_role: actor % is not an administrator', p_actor_user_id USING ERRCODE = '42501';
  END IF;
  IF p_role = 'administrator' THEN
    PERFORM 1 FROM authz.user_role WHERE role = 'administrator' FOR UPDATE;
    SELECT count(*) INTO v_admin_count FROM authz.user_role WHERE role = 'administrator';
    IF v_admin_count <= 1 AND EXISTS (SELECT 1 FROM authz.user_role
        WHERE user_id = p_target_user_id AND role = 'administrator') THEN
      RAISE EXCEPTION 'authz.revoke_role: cannot remove the last administrator' USING ERRCODE = '23514';
    END IF;
  END IF;
  DELETE FROM authz.user_role WHERE user_id = p_target_user_id AND role = p_role;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  INSERT INTO authz.role_audit
    (actor_user_id, actor_uid_snapshot, actor_email_snapshot, action, target_user_id, role, is_self_mod, outcome)
    VALUES (p_actor_user_id, p_actor_user_id, p_actor_email, 'revoke', p_target_user_id, p_role,
            p_actor_user_id = p_target_user_id, CASE WHEN v_rows > 0 THEN 'applied' ELSE 'noop' END);
END $fn$;

REVOKE ALL ON FUNCTION authz.grant_role(uuid,text,uuid,text)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION authz.revoke_role(uuid,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION authz.grant_role(uuid,text,uuid,text)  TO service_role;
GRANT EXECUTE ON FUNCTION authz.revoke_role(uuid,text,uuid,text) TO service_role;

-- fail-closed ACL assertion — LAST (references the functions above); aborts the whole migration on a bad posture
DO $assert$
DECLARE bad int;
BEGIN
  IF has_schema_privilege('anon','authz','USAGE') OR has_schema_privilege('authenticated','authz','USAGE') THEN
    RAISE EXCEPTION 'authz assert: anon/authenticated must not hold USAGE on schema authz';
  END IF;
  SELECT count(*) INTO bad FROM (
    SELECT 1 WHERE has_table_privilege('anon','authz.user_role','SELECT,INSERT,UPDATE,DELETE')
    UNION ALL SELECT 1 WHERE has_table_privilege('authenticated','authz.user_role','SELECT,INSERT,UPDATE,DELETE')
    UNION ALL SELECT 1 WHERE has_table_privilege('anon','authz.role_audit','SELECT,INSERT,UPDATE,DELETE')
    UNION ALL SELECT 1 WHERE has_table_privilege('authenticated','authz.role_audit','SELECT,INSERT,UPDATE,DELETE')
  ) t;
  IF bad > 0 THEN RAISE EXCEPTION 'authz assert: anon/authenticated hold table privileges they must not'; END IF;
  IF (SELECT bool_and(relrowsecurity AND relforcerowsecurity) FROM pg_class
      WHERE oid IN ('authz.user_role'::regclass,'authz.role_audit'::regclass)) IS NOT TRUE THEN
    RAISE EXCEPTION 'authz assert: RLS must be ENABLE+FORCE on both tables';
  END IF;
  IF NOT has_function_privilege('authenticated','public.current_user_roles()','EXECUTE') THEN
    RAISE EXCEPTION 'authz assert: authenticated must hold EXECUTE on public.current_user_roles()';
  END IF;
  IF has_function_privilege('anon','public.current_user_roles()','EXECUTE') THEN
    RAISE EXCEPTION 'authz assert: anon must NOT hold EXECUTE on public.current_user_roles()';
  END IF;
  IF has_function_privilege('anon','authz.grant_role(uuid,text,uuid,text)','EXECUTE')
     OR has_function_privilege('authenticated','authz.grant_role(uuid,text,uuid,text)','EXECUTE')
     OR has_function_privilege('anon','authz.revoke_role(uuid,text,uuid,text)','EXECUTE')
     OR has_function_privilege('authenticated','authz.revoke_role(uuid,text,uuid,text)','EXECUTE') THEN
    RAISE EXCEPTION 'authz assert: anon/authenticated must NOT hold EXECUTE on authz write functions';
  END IF;
END $assert$;
