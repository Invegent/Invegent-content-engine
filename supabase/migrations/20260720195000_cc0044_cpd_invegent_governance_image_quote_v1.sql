-- BACKFILL RECORD — applied 2026-07-20 via execute_sql at a T3 PK gate (apply_migration is
-- harness-deny-listed); recorded post-hoc. Already applied; NOT for replay (the in-txn guard raises
-- if an Invegent image_quote governance row already exists).
-- Version > 20260720180000 so the ledger stays monotonic; name is unique.
-- RENUMBERED 20260720190000 -> 20260720195000 during ledger reconciliation: version 20260720190000 is
--   already PUBLISHED on origin/main as the B2 shared-attribution fix (migration identity is permanent),
--   so this governance backfill takes the next free slot. Content unchanged from the original apply.
-- Verified live-matching 2026-07-20 (execute_sql read): c.client_creative_governance(invegent,image_quote) =
--   enabled=true · render_label=creative_library_generic_selector ·
--   contract_ref=invegent.image_quote.quote_card · declarative_registry_ref=NULL.
--
-- cc-0044 Checkpoint D (INVEGENT) · item 3 (part 1) — governance enablement row.
-- Migration identity: 20260720195000_cc0044_cpd_invegent_governance_image_quote_v1
--
-- Records that image_quote is a GOVERNED, enabled format for Invegent (governance-model completeness).
-- NOT a selectability gate: select_template / resolve_slot_assets / analyze_asset_gap / the B2 close-pass
--   do NOT read c.client_creative_governance ("declared-control-not-consulted"). Honest divergence from
--   PP/NDIS/CFW news_card rows: Invegent's CP-D proof uses the generic quote_card via the generic selector
--   and has no Creative Library v2 registry file → declarative_registry_ref=NULL (runtime-import guard),
--   render_label=creative_library_generic_selector (truthful path label, not the B1 news_card hardcode).
-- Provenance: forward SQL == _harness/cc0044_cpd_invegent_20260720/INV_STAGE_governance_apply.sql.

BEGIN;
DO $$
DECLARE
  v_inv uuid := '93494a09-cc89-41d1-b364-cb63983063a6';
  v_dup int; v_n int;
BEGIN
  SELECT count(*) INTO v_dup FROM c.client_creative_governance
    WHERE client_id=v_inv AND format='image_quote';
  IF v_dup <> 0 THEN RAISE EXCEPTION 'GUARD_FAIL: Invegent already has an image_quote governance row, n=%', v_dup; END IF;

  INSERT INTO c.client_creative_governance
    (client_id, format, enabled, render_label, contract_ref, declarative_registry_ref)
  VALUES
    (v_inv, 'image_quote', true, 'creative_library_generic_selector',
     'invegent.image_quote.quote_card', NULL);

  SELECT count(*) INTO v_n FROM c.client_creative_governance
    WHERE client_id=v_inv AND format='image_quote' AND enabled IS TRUE;
  IF v_n <> 1 THEN RAISE EXCEPTION 'POSTASSERT_FAIL: expected 1 enabled Invegent image_quote governance row, got %', v_n; END IF;
END $$;
COMMIT;

-- ROLLBACK (restore exact pre-state = no row) — validated before apply.
-- DELETE FROM c.client_creative_governance
-- WHERE client_id='93494a09-cc89-41d1-b364-cb63983063a6' AND format='image_quote'
--   AND render_label='creative_library_generic_selector';
