-- authz_last_admin_delete_guard_rollback_v1 — reverses 20260728090000_authz_last_admin_delete_guard_v1.
-- Drops the F-DEL-1 last-administrator delete guard, returning authz.user_role to its pre-guard behaviour
-- (raw auth.users CASCADE of the last admin succeeds again — the documented residual). ADDITIVE reversal:
-- touches only the trigger + function this pair introduced; no table/column/grant change.

DROP TRIGGER IF EXISTS trg_prevent_last_admin_delete ON authz.user_role;
DROP FUNCTION IF EXISTS authz.prevent_last_admin_delete();

-- fail-closed reversal assertion.
DO $assert$
BEGIN
  IF to_regprocedure('authz.prevent_last_admin_delete()') IS NOT NULL THEN
    RAISE EXCEPTION 'authz rollback assert: authz.prevent_last_admin_delete() still present';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c     ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'authz' AND c.relname = 'user_role'
      AND t.tgname = 'trg_prevent_last_admin_delete' AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'authz rollback assert: trg_prevent_last_admin_delete still present';
  END IF;
END $assert$;
