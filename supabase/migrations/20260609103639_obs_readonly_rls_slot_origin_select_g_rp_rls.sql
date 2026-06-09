-- G-RP-RLS: row visibility for obs_readonly on the slot-originated population only.
-- Approved by PK exact-phrase (D-01 review 9b03b489): CREATE POLICY ONLY; NO OTHER
-- PRODUCTION MUTATION. Additive, permissive, role-scoped SELECT policy on m.post_draft
-- (RLS already enabled). Does not alter the existing portal policies. obs_readonly stays
-- NOBYPASSRLS, read-only, limited to the 45 approved column-level SELECT grants. No DML.
--
-- Repo-parity backfill of the migration already applied to production
-- (mbkmaxqhsohbtwsqolns) and recorded as 20260609103639_obs_readonly_rls_slot_origin_select_g_rp_rls.
-- Contains no password, DSN, key, token, or credential.
CREATE POLICY obs_readonly_read_slot_origin
  ON m.post_draft
  FOR SELECT TO obs_readonly
  USING (slot_id IS NOT NULL);
