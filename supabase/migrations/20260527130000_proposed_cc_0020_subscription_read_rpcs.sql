-- TOMBSTONE — superseded by:
--   20260527114144_cc_0020_subscription_read_rpcs.sql (canonical RPCs, anon/auth REVOKE folded in)
--   20260527114333_cc_0020_subscription_rpcs_revoke_anon_auth.sql (historical hotfix, retained)
-- The original proposed RPC migration was applied to production at version
-- 20260527114144 (not at the placeholder version 20260527130000 in this filename).
-- This file is intentionally a no-op so the version slot is permanently consumed
-- and a future supabase db push cannot silently re-execute the original DDL.
SELECT 1 WHERE false;
