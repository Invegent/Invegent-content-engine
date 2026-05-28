-- APPLIED TO PRODUCTION at version 20260527114333 (mbkmaxqhsohbtwsqolns).
-- Retained for schema_migrations parity and audit trail. Now also folded into
-- 20260527114144_cc_0020_subscription_read_rpcs.sql, so re-applying this file
-- is idempotent (the REVOKEs target the same state already enforced by 114144).

-- ============================================================================
-- cc-0020 Stage 4-C grants hardening (hotfix)
-- ============================================================================
-- Supabase default privileges GRANT EXECUTE on new public functions DIRECTLY to
-- anon + authenticated, so the `REVOKE ... FROM PUBLIC` in the RPC migration
-- (20260527130000) did NOT remove their access. These RPCs are SECURITY DEFINER
-- over the deny-by-default k.* financial tables and must be service_role-only
-- (server-side). Explicitly revoke EXECUTE from anon + authenticated so there is
-- no browser/PostgREST path to candidate/spend data or the review mutation.
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.get_subscription_import_candidates(text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_subscription_spend_events(integer)            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_subscription_spend_trends(integer)            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.review_subscription_candidate(uuid, text, uuid)   FROM anon, authenticated;