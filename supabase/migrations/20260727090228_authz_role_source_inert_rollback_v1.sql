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
