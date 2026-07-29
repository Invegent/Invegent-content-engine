-- Packet: creatomate-registry-repair-packet-v1 (ROLLBACK)
-- Restores the EXACT pre-image captured live on 2026-07-29, before the forward packet's
-- UPDATEs. Byte-exact for every column touched, including the untruncated original
-- inventory_source string (captured verbatim, not reconstructed).
--
-- ⛔ Run ONLY to revert an applied creatomate-registry-repair-packet-v1-forward.sql.
--    Not applied by default; PK-gated like the forward file.
--
-- EXECUTION CHANNEL: same requirement as the forward file — apply as ONE statement batch
-- through ONE connection (psql -f, or one pasted mcp__supabase__execute_sql call).
--
-- SAFETY: each UPDATE asserts its own rowcount (GET DIAGNOSTICS, inside the same DO block
-- as the UPDATE) is exactly 1. This does NOT verify the row is currently in the
-- forward-applied state before overwriting — it only confirms the row exists and was
-- touched. If the DB has drifted from the forward-applied state since apply, this rollback
-- will still overwrite silently; that residual risk is accepted for v1 and named here
-- rather than hidden (apply-harness-auditor AHA-07-1).

BEGIN;

-- Row 17 (fb9820f8) — restore production_proven posture exactly as captured.
DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_provider_template
  SET status = 'production_proven',
      inventory_source = 'vendored implementation supabase/functions/image-worker/index.ts + b1_production.ts (8 modification keys) · docs/creative-library/property-pulse.json (news family) · 17 succeeded production render_specs (m.post_render_log label=creative_library_b1_production) · registers v3.98/v4.00/v4.05'
  WHERE provider_template_id = 'fb9820f8-3fee-4448-b324-3d500fa74b40';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row17 template rollback matched % rows (expected 1) — aborting', v_rows;
  END IF;
END $$;

DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_client_assignment
  SET assignment_status = 'production_proven'
  WHERE id = 'c0b10001-0000-4000-8000-000000000004';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row17 assignment rollback matched % rows (expected 1) — aborting', v_rows;
  END IF;
END $$;

DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_platform_suitability
  SET suitability_status = 'production_proven'
  WHERE id IN ('9cb2a8bd-ba39-4a4d-b79f-e059a0d13bac', '9b69fd31-a016-4491-b141-023a6c2f8c57');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 2 THEN
    RAISE EXCEPTION 'STOP: row17 suitability rollback matched % rows (expected 2) — aborting', v_rows;
  END IF;
END $$;

DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_variant_candidate
  SET fit_status = 'strong_candidate',
      fit_reason = 'The LIVE production variant for PP image_quote (ACI contract property_pulse.image_quote.news_card.v1; render_spec variant_key matches). Captured retroactively — fit is production-demonstrated.'
  WHERE id = 'c0b10001-0000-4000-8000-000000000003';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row17 variant_candidate rollback matched % rows (expected 1) — aborting', v_rows;
  END IF;
END $$;

-- Row 5 (48cba556) — restore visually_approved for NDIS + CFW.
DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_client_assignment
  SET assignment_status = 'visually_approved'
  WHERE id = 'c4737728-eb87-462f-aa79-ce6b321ba8ef';  -- ndis-yarns
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row5 ndis-yarns rollback matched % rows (expected 1) — aborting', v_rows;
  END IF;
END $$;

DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_client_assignment
  SET assignment_status = 'visually_approved'
  WHERE id = '60e43a0e-8ac3-497d-b823-8d41c2aa123b';  -- care-for-welfare-pty-ltd
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row5 CFW rollback matched % rows (expected 1) — aborting', v_rows;
  END IF;
END $$;

-- Row 7 (2140ca19) — restore visually_approved for invegent.
DO $$
DECLARE v_rows int;
BEGIN
  UPDATE c.creative_template_client_assignment
  SET assignment_status = 'visually_approved'
  WHERE id = 'ecba211b-5217-4790-afe5-a2f98616712f';  -- invegent
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'STOP: row7 invegent rollback matched % rows (expected 1) — aborting', v_rows;
  END IF;
END $$;

-- Row 19 (c11bb8ab) — nothing to revert by default (the PK-elective block, if it was
-- separately uncommented and applied, reverts the same way: set id
-- '1ee1a547-08b8-4ce8-8045-d545be16c699' assignment_status back to 'visually_approved',
-- with the same DO-block + GET DIAGNOSTICS pattern as above).

COMMIT;

-- Post-rollback verification: re-run the 4 SELECTs listed at the end of the forward file
-- and diff against the pre-apply baseline in packet doc §2 — must match exactly. Also
-- re-run the select_template calls listed there to confirm no residual drift.
