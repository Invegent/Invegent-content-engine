-- =====================================================================
-- ⛔ MOST DESTRUCTIVE ARTIFACT IN THE PENDING SET
-- =====================================================================
-- ORIGINAL PATH : supabase/migrations/20260727090228_authz_role_source_inert_rollback_v1.sql
-- CLASS         : DESTRUCTIVE ROLLBACK, correctly timestamped -> IN the db push attempt set
--
-- WHAT IT DESTROYS (every target VERIFIED LIVE 2026-08-08, read-only):
--   DROP FUNCTION authz.revoke_role / authz.grant_role      -- both LIVE
--   DROP FUNCTION public.current_user_roles()               -- LIVE; the dashboard authz path calls it
--   DROP TABLE    authz.role_audit                          -- LIVE, 1 row
--   DROP TABLE    authz.user_role                           -- LIVE, 1 row == THE SOLE ADMIN
--   DROP SCHEMA   authz                                     -- succeeds once the above empty it
--
--   Executing this removes the ENTIRE authz role system AND the only admin role row.
--   There is no fail-loud step: each statement is IF EXISTS and would simply succeed.
--
-- ORDERING HAZARD: in a full `db push` this sorts BEFORE 20260728090000 (which CREATES the
--   last-admin delete guard) and 20260728090001 (which drops it). The schema would be
--   destroyed first, taking the sole admin row with it.
--
-- DO NOT RESTORE. DO NOT EXECUTE IN ANY DIRECTION. If authz ever genuinely needs reverting,
-- author a NEW migration with a NEW version number against the CURRENT live definitions.
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

-- ROLLBACK for 20260727090227_authz_role_source_inert_v1.sql (cc-0046 Slice 0.5).
-- Clean while INERT: no worker, RPC, trigger, view, or dashboard path reads any of these objects until the
-- separate enforcement lane wires them. Rolling back AFTER the first-admin seed discards the role + audit rows
-- (acceptable for an inert rollback — no dependent object). NOT applied; break-glass / reversal only.

DROP FUNCTION IF EXISTS authz.revoke_role(uuid,text,uuid,text);
DROP FUNCTION IF EXISTS authz.grant_role(uuid,text,uuid,text);
DROP FUNCTION IF EXISTS public.current_user_roles();
DROP TABLE    IF EXISTS authz.role_audit;
DROP TABLE    IF EXISTS authz.user_role;
DROP SCHEMA   IF EXISTS authz;   -- safe while empty of other objects
