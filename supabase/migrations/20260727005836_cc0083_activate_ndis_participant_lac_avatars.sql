-- ============================================================================
-- RECONCILIATION BACKFILL (cc-0087, 2026-07-29): this file was NOT originally
-- committed to git under this name/version. It reproduces exact content that was
-- actually applied LIVE to project mbkmaxqhsohbtwsqolns, sourced from:
--   docs/briefs/cc-0083-sliceC-activate-avatars-apply-packet-v2.md §4
-- Any 'NOT APPLIED' / 'PREPARED' / 'DESIGN' framing below is the ORIGINAL packet's
-- pre-apply language, preserved for historical fidelity -- it is STALE; this
-- migration IS live (confirmed against the Supabase migration ledger and, where
-- checked, live pg_get_functiondef/information_schema state). See
-- docs/briefs/results/cc-0087-migration-ledger-reconciliation-result-v1.md.
-- ============================================================================

-- Source: docs/briefs/cc-0083-sliceC-activate-avatars-apply-packet-v2.md §4 (v2 supersedes v1 —
-- closes an apply-harness-auditor finding; v2 is the correct source for this migration).
-- cc-0083 Slice C: activate NDIS-Yarns realistic avatars for participant + local_area_coordinator.
-- Governed multi-active; default host UNCHANGED; join-scoped; pre- AND post- fail-closed assertions.

-- (A) PRE-ASSERTION — pin the baseline so the write set is provably exactly the 2 target rows.
--     Aborts on any drift from §2 (a target already active, or a different active count).
DO $$
DECLARE v_pre_active int; v_pre_targets_inactive int;
BEGIN
  SELECT count(*) INTO v_pre_active
  FROM c.brand_avatar ba
  JOIN c.client cl ON cl.client_id = ba.client_id
  WHERE cl.client_slug = 'ndis-yarns' AND ba.render_style = 'realistic' AND ba.is_active IS TRUE;

  SELECT count(*) INTO v_pre_targets_inactive
  FROM c.brand_avatar ba
  JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
  JOIN c.client cl ON cl.client_id = ba.client_id
  WHERE cl.client_slug = 'ndis-yarns' AND ba.render_style = 'realistic'
    AND bs.role_code IN ('participant', 'local_area_coordinator')
    AND ba.is_active IS NOT TRUE;

  IF v_pre_active <> 1 THEN
    RAISE EXCEPTION 'cc-0083 Slice C pre-check: expected exactly 1 active realistic avatar at baseline, got %', v_pre_active;
  END IF;
  IF v_pre_targets_inactive <> 2 THEN
    RAISE EXCEPTION 'cc-0083 Slice C pre-check: expected participant+LAC realistic both inactive at baseline, got % inactive', v_pre_targets_inactive;
  END IF;
END $$;

-- (B) UPDATE — unconditional over the role-scoped realistic set (the pre-check guarantees this set
--     is exactly the 2 inactive target rows, so no data-dependent guard is needed).
WITH ny AS (SELECT client_id FROM c.client WHERE client_slug = 'ndis-yarns')
UPDATE c.brand_avatar ba
SET is_active = true
FROM ny, c.brand_stakeholder bs
WHERE ba.client_id = ny.client_id
  AND ba.stakeholder_id = bs.stakeholder_id
  AND ba.render_style = 'realistic'
  AND bs.role_code IN ('participant', 'local_area_coordinator');

-- (C) POST-ASSERTION — exactly 3 active realistic avatars in the expected role set,
--     and exactly 1 realistic default host (unchanged). Else abort.
DO $$
DECLARE v_active int; v_expected int; v_default int;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE bs.role_code IN
           ('support_coordinator','participant','local_area_coordinator'))
    INTO v_active, v_expected
  FROM c.brand_avatar ba
  JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
  JOIN c.client cl ON cl.client_id = ba.client_id
  WHERE cl.client_slug = 'ndis-yarns' AND ba.render_style = 'realistic' AND ba.is_active IS TRUE;

  SELECT count(*) INTO v_default
  FROM c.brand_avatar ba
  JOIN c.client cl ON cl.client_id = ba.client_id
  WHERE cl.client_slug = 'ndis-yarns' AND ba.render_style = 'realistic' AND ba.is_default_host IS TRUE;

  IF v_active <> 3 OR v_expected <> 3 THEN
    RAISE EXCEPTION 'cc-0083 Slice C: expected 3 active realistic avatars in the role set, got active=% in_set=%', v_active, v_expected;
  END IF;
  IF v_default <> 1 THEN
    RAISE EXCEPTION 'cc-0083 Slice C: default host count changed; expected 1, got %', v_default;
  END IF;
END $$;
