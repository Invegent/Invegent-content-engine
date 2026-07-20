-- BACKFILL RECORD — applied 2026-07-20 via execute_sql at a T3 PK gate (apply_migration is
-- harness-deny-listed); recorded post-hoc. Already applied; NOT for replay (the CAS guards on the
-- fenced state make a replay fail-closed by design).
-- Version > the already-applied 20260720160000 so the ledger stays monotonic; name is unique.
-- Verified live-matching 2026-07-20 (execute_sql read): c.shared_creative_asset 0ba46053 =
--   is_active=true · production_use_allowed=true · approval_status=governed · allowed_clients={invegent}.
--
-- cc-0044 Checkpoint D (INVEGENT) · item 2 (background) — shared-inventory background promotion.
-- Migration identity: 20260720170000_cc0044_cpd_invegent_shared_bg_promote_scoped_v1
--
-- Promote ONE fenced global_generic shared background to production, scoped to Invegent, so
--   resolve_shared_pool_assets / resolve_slot_assets(v1.2) can resolve a Background for Invegent FB
--   image_quote — the brief's "reusable governed shared inventory" closure (zero fresh client sourcing).
--   Asset 0ba46053 "Shared BG — Data-centre server" (Pexels License; sha256 c30f186f…; person_free; 1:1).
--   Scope: allowed_clients := [invegent] → resolvable by Invegent ONLY (other 7 shared bgs stay fenced).
-- Provenance: forward SQL == _harness/cc0044_cpd_invegent_20260720/INV_STAGE_shared_bg_promote_apply.sql.
-- §2 guards present at apply: licence + sha256 provenance (verified) · in-txn pool-neutrality assertion ·
--   CAS/fail-closed · reversible.

BEGIN;
DO $$
DECLARE
  v_inv   uuid := '93494a09-cc89-41d1-b364-cb63983063a6';
  v_sid   uuid := '0ba46053-b22b-40c7-b5c5-5bfc8b52d0a1';
  v_sha   text := 'c30f186f05566068bba6903234b17280fc947c8cde9bd580ed9f8c34d4f26af5';
  v_client_elig_before bigint; v_client_elig_after bigint;
  v_other_shared_prod_before bigint; v_other_shared_prod_after bigint;
  v_n int;
BEGIN
  -- Pool-neutrality BEFORE: client_brand_asset eligibility (untouched by this txn) + OTHER production-eligible shared bgs
  SELECT count(*) INTO v_client_elig_before FROM c.client_brand_asset WHERE is_active AND asset_meta->>'approved'='true';
  SELECT count(*) INTO v_other_shared_prod_before FROM c.shared_creative_asset
    WHERE id <> v_sid AND asset_kind='static_background' AND is_active AND production_use_allowed;

  -- Promote — CAS on the fenced state; Invegent-scope via allowed_clients
  UPDATE c.shared_creative_asset
  SET is_active               = true,
      production_use_allowed   = true,
      approval_status          = 'governed',
      allowed_clients          = ARRAY[v_inv]::uuid[],
      asset_meta               = asset_meta || jsonb_build_object(
        'promoted_by','cc-0044 CP-D (Invegent) shared-bg promotion; PK gate 2026-07-20. Invegent-scoped (allowed_clients=[invegent]); dark until Invegent pool-policy lands (post CARRY-2 fix).'),
      updated_at               = now()
  WHERE id = v_sid
    AND is_active = false                          -- CAS guard
    AND production_use_allowed = false             -- CAS guard
    AND approval_status = 'intake_candidate'       -- CAS guard
    AND asset_meta->>'sha256' = v_sha;             -- identity guard (bytes verified)
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN RAISE EXCEPTION 'CAS_FAIL(shared_bg): expected to promote exactly 1 fenced row, got %', v_n; END IF;

  -- Pool-neutrality AFTER + fail-closed assertions
  SELECT count(*) INTO v_client_elig_after FROM c.client_brand_asset WHERE is_active AND asset_meta->>'approved'='true';
  SELECT count(*) INTO v_other_shared_prod_after FROM c.shared_creative_asset
    WHERE id <> v_sid AND asset_kind='static_background' AND is_active AND production_use_allowed;
  IF v_client_elig_after <> v_client_elig_before THEN
    RAISE EXCEPTION 'POOL_NEUTRALITY_FAIL: client_brand_asset eligible count changed %→% (shared promotion must not touch client pools)', v_client_elig_before, v_client_elig_after; END IF;
  IF v_other_shared_prod_after <> v_other_shared_prod_before THEN
    RAISE EXCEPTION 'POOL_NEUTRALITY_FAIL: OTHER production-eligible shared bg count changed %→% (must promote ONLY this row)', v_other_shared_prod_before, v_other_shared_prod_after; END IF;

  -- Post-assert (a): this row production-eligible-shaped + Invegent-scoped
  SELECT count(*) INTO v_n FROM c.shared_creative_asset
    WHERE id=v_sid AND is_active AND production_use_allowed AND approval_status='governed'
      AND allowed_clients = ARRAY[v_inv]::uuid[] AND asset_meta->>'sha256'=v_sha;
  IF v_n <> 1 THEN RAISE EXCEPTION 'POSTASSERT_FAIL(a): promoted row not production+invegent-scoped, got %', v_n; END IF;

  -- Post-assert (b): exactly ONE production-eligible shared static_background total, and it is this id
  SELECT count(*) INTO v_n FROM c.shared_creative_asset
    WHERE asset_kind='static_background' AND is_active AND production_use_allowed;
  IF v_n <> 1 THEN RAISE EXCEPTION 'POSTASSERT_FAIL(b): expected exactly 1 production shared bg, got %', v_n; END IF;

  -- Post-assert (c): scoping is a non-empty allowlist = [invegent] (non-invegent clients structurally excluded)
  SELECT count(*) INTO v_n FROM c.shared_creative_asset
    WHERE id=v_sid AND array_length(allowed_clients,1)=1 AND v_inv = ANY(allowed_clients);
  IF v_n <> 1 THEN RAISE EXCEPTION 'POSTASSERT_FAIL(c): allowed_clients not = [invegent]'; END IF;
END $$;
COMMIT;

-- ROLLBACK (restore exact fenced state) — validated before apply. Reversible: dark asset, no consumer.
-- BEGIN;
--   UPDATE c.shared_creative_asset
--   SET is_active=false, production_use_allowed=false, approval_status='intake_candidate',
--       allowed_clients='{}'::uuid[],
--       asset_meta = asset_meta - 'promoted_by',
--       updated_at = now()
--   WHERE id='0ba46053-b22b-40c7-b5c5-5bfc8b52d0a1';
-- COMMIT;
