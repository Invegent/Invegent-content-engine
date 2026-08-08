-- =====================================================================
-- RETIRED -- destructive rollback of a LIVE safety guard
-- =====================================================================
-- ORIGINAL PATH : supabase/migrations/20260728090001_authz_last_admin_delete_guard_rollback_v1.sql
-- CLASS         : DESTRUCTIVE ROLLBACK, correctly timestamped -> IN the db push attempt set
--
-- WHAT IT DESTROYS (VERIFIED LIVE 2026-08-08, read-only):
--   DROP TRIGGER  trg_prevent_last_admin_delete ON authz.user_role   -- LIVE
--   DROP FUNCTION authz.prevent_last_admin_delete()                  -- LIVE
--
--   This is the F-DEL-1 last-admin delete guard. Removing it re-opens the exact failure
--   it exists to prevent: deleting the final admin role row (authz.user_role holds 1 row).
--
-- DO NOT RESTORE. DO NOT EXECUTE.
--
-- RETIRED FROM THE MIGRATION DISCOVERY PATH -- DO NOT RESTORE, DO NOT EXECUTE
-- Authorized by PK 2026-08-08 (CGU final-watch window). File move only; NO DB execution.
--
-- WHY THIS CLASS IS DIFFERENT FROM THE ROLLBACK_*.sql CLUTTER:
--   `supabase db push` SKIPS non-timestamped filenames ("file name must match pattern
--   <timestamp>_name.sql") -- proven by db push --dry-run, 2026-08-08. THIS file is
--   correctly timestamped, so the CLI does NOT skip it: it sits in the real attempt set
--   of 65 pending migrations and WOULD be executed by a `supabase db push`.
--
-- BODY BELOW IS BYTE-IDENTICAL TO THE ORIGINAL.
-- =====================================================================

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
