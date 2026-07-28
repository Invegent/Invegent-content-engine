-- authz_last_admin_delete_guard_v1 — closes F-DEL-1 (cc-0046 Slice 0.5).
-- F-DEL-1: authz.user_role.user_id has ON DELETE CASCADE to auth.users(id). A RAW auth.users delete of the
-- LAST administrator therefore zeroes administrators, bypassing the governed authz.revoke_role guard (which
-- raises 23514 on the last admin). PK ruling 2026-07-28: add a DB-level guard on OUR authz.user_role table
-- (NOT a trigger on GoTrue-managed auth.users). This BEFORE DELETE trigger aborts a delete that would remove
-- the last administrator's role row, so the cascade — and thus the auth.users delete — fails atomically.
-- ADDITIVE: no table/column DDL, no grant change. Behaviour changes ONLY the (never-intended) last-admin
-- deletion; normal non-last-admin deletion (Prereq-1 cascade + audit SET NULL) and grant/revoke are unaffected.
-- A deliberate governed teardown/recovery sets `authz.allow_last_admin_delete='on'` for the session to bypass.
-- Enforcement of the ROLE MODEL remains OFF and SEPARATE; this only hardens the substrate.
-- APPLIED live 2026-07-28 via apply_migration → ledger version 20260728000335 (this file records it in-repo).
-- Reviewed SQL sha256 = 55c782e9de5bcaf9123009a2bb2be2649e73666926ac7868fb23c2710b41a6d2.
-- Chain: db-rls-auditor PASS/high · security-auditor GREEN/clean/high · branch-warden safe · external review
--   1aa1a893 agree/proceed (pinned to the sha256, zero pushback). PK apply gate: PK-authorized 2026-07-28.
-- Proven live post-apply via txn-rollback (nothing committed; 1 admin): T1 direct-delete BLOCK (23514) · T2
--   auth.users cascade BLOCK aborts atomically (23514) · T3 2-admin delete ALLOWED · T4 GUC override permits ·
--   T5 viewer delete unaffected. Post-proof state unchanged (admin_count=1, pk@invegent.com=administrator).

-- SECURITY DEFINER (owner postgres, rolbypassrls) so the guard fires correctly under ANY privileged delete
-- context — including a GoTrue/supabase_auth_admin CASCADE — regardless of that role's authz schema USAGE,
-- and so the internal count sees all admin rows despite RLS FORCE on authz.user_role. search_path='' → all
-- refs schema-qualified.
CREATE OR REPLACE FUNCTION authz.prevent_last_admin_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE v_remaining int;
BEGIN
  -- deliberate governed override (console teardown / re-bootstrap) — settable only by an already
  -- fully-privileged role (schema authz is USAGE-fenced from anon/authenticated), so not an escalation.
  IF current_setting('authz.allow_last_admin_delete', true) = 'on' THEN
    RETURN OLD;
  END IF;
  SELECT count(*) INTO v_remaining
  FROM authz.user_role
  WHERE role = 'administrator' AND user_id <> OLD.user_id;
  IF v_remaining = 0 THEN
    RAISE EXCEPTION 'authz: cannot delete the last administrator (set authz.allow_last_admin_delete=on to override)'
      USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END $fn$;

-- lock the function down to match the schema posture (no anon/authenticated EXECUTE).
REVOKE ALL ON FUNCTION authz.prevent_last_admin_delete() FROM PUBLIC, anon, authenticated;

-- WHEN (OLD.role='administrator') → the trigger body only runs for administrator-row deletions; viewer/
-- governance_operator deletions and all non-admin cascades skip it entirely.
DROP TRIGGER IF EXISTS trg_prevent_last_admin_delete ON authz.user_role;
CREATE TRIGGER trg_prevent_last_admin_delete
  BEFORE DELETE ON authz.user_role
  FOR EACH ROW WHEN (OLD.role = 'administrator')
  EXECUTE FUNCTION authz.prevent_last_admin_delete();

-- fail-closed presence assertion — aborts the migration if the guard did not install.
DO $assert$
BEGIN
  IF to_regprocedure('authz.prevent_last_admin_delete()') IS NULL THEN
    RAISE EXCEPTION 'authz assert: authz.prevent_last_admin_delete() missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c     ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'authz' AND c.relname = 'user_role'
      AND t.tgname = 'trg_prevent_last_admin_delete' AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'authz assert: trg_prevent_last_admin_delete not present on authz.user_role';
  END IF;
  IF has_function_privilege('anon','authz.prevent_last_admin_delete()','EXECUTE')
     OR has_function_privilege('authenticated','authz.prevent_last_admin_delete()','EXECUTE') THEN
    RAISE EXCEPTION 'authz assert: anon/authenticated must NOT hold EXECUTE on the guard function';
  END IF;
END $assert$;
