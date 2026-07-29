-- ============================================================================
-- RECONCILIATION BACKFILL (cc-0087, 2026-07-29): this file was NOT originally
-- committed to git under this name/version. It reproduces exact content that was
-- actually applied LIVE to project mbkmaxqhsohbtwsqolns, sourced from:
--   docs/briefs/cc-0083-sliceA-persona-name-apply-packet-v1.md §4
-- Any 'NOT APPLIED' / 'PREPARED' / 'DESIGN' framing below is the ORIGINAL packet's
-- pre-apply language, preserved for historical fidelity -- it is STALE; this
-- migration IS live (confirmed against the Supabase migration ledger and, where
-- checked, live pg_get_functiondef/information_schema state). See
-- docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md.
-- ============================================================================

-- Source: docs/briefs/cc-0083-sliceA-persona-name-apply-packet-v1.md §4
-- cc-0083 Slice A: add persona_name to c.brand_stakeholder + populate NDIS-Yarns personas.
-- Additive nullable column; NDIS-scoped backfill; transactional with an executable post-assertion.

ALTER TABLE c.brand_stakeholder
  ADD COLUMN IF NOT EXISTS persona_name text;

COMMENT ON COLUMN c.brand_stakeholder.persona_name IS
  'Human persona first name for the stakeholder role (e.g. "Sarah"). Presentational identity paired with role_label; selection remains keyed on role_code. Nullable; populated per client. cc-0083.';

-- NDIS-Yarns persona-name backfill (by client_slug + role_code; idempotent).
WITH ny AS (
  SELECT client_id FROM c.client WHERE client_slug = 'ndis-yarns'
)
UPDATE c.brand_stakeholder bs
SET persona_name = m.persona_name
FROM ny, (VALUES
  ('participant',            'Alex'),
  ('support_coordinator',    'Sarah'),
  ('local_area_coordinator', 'Marcus'),
  ('allied_health_provider', 'Priya'),
  ('plan_manager',           'James'),
  ('support_worker',         'Caleb'),
  ('family_carer',           'Diane')
) AS m(role_code, persona_name)
WHERE bs.client_id = ny.client_id
  AND bs.role_code = m.role_code;

-- Executable STOP (fail-closed): exactly 7 NDIS rows must carry the expected persona_name, else abort.
DO $$
DECLARE v_ok int;
BEGIN
  SELECT count(*) INTO v_ok
  FROM c.brand_stakeholder bs
  JOIN c.client cl ON cl.client_id = bs.client_id
  WHERE cl.client_slug = 'ndis-yarns'
    AND bs.persona_name = CASE bs.role_code
      WHEN 'participant'            THEN 'Alex'
      WHEN 'support_coordinator'    THEN 'Sarah'
      WHEN 'local_area_coordinator' THEN 'Marcus'
      WHEN 'allied_health_provider' THEN 'Priya'
      WHEN 'plan_manager'           THEN 'James'
      WHEN 'support_worker'         THEN 'Caleb'
      WHEN 'family_carer'           THEN 'Diane'
    END;
  IF v_ok <> 7 THEN
    RAISE EXCEPTION 'cc-0083 Slice A assertion failed: expected 7 NDIS persona_name rows, got %', v_ok;
  END IF;
END $$;
