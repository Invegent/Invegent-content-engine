-- cc-0063 — Brand Host Designation v0 — ROLLBACK
-- =============================================================================================
-- ⛔ DESIGN — NOT APPLIED. Authored BEFORE the forward apply, per the T2 chain requirement that a
--    rollback exists and is validated before any apply.
-- Forward: 20260724120000_cc0063_brand_host_designation_v1.sql
-- Packet:  docs/briefs/cc-0063-brand-host-designation-gate1-packet-m2-v1.md
--
-- This is a SEPARATE migration with its own number and a distinct name — never an edit to the
-- forward file (migration name = permanent identity).
--
-- ROLLBACK TARGET IS THE STATE THAT EXISTS TODAY: 0 rows with is_default_host = true. This is a
-- return to a proven, currently-live configuration, not a constructed one.
--
-- ⚠ NEITHER APPLY NOR ROLLBACK CAN CHANGE A RENDERED OUTPUT. The marker is unread by live
--    selection, so this is a governance correction, not an incident recovery. Do not describe it
--    as an outage remedy.
--
-- ⚠ A DRY-RUN DOES NOT VALIDATE THIS. ICE has been burned by reconcile dry-runs that skip the write
--    so constraint failures surface only at live apply. This rollback is validated by being the
--    exact inverse of a single-column update to a currently-existing state, plus the read-only
--    post-state simulation recorded in the packet's review-chain section. Do not claim dry-run
--    coverage in the result doc.
--
-- Same transaction shape and NULL handling as the forward migration: one atomic DO block, `IS TRUE`
-- throughout, no explicit BEGIN/COMMIT.
-- =============================================================================================

DO $cc0063_rb$
DECLARE
  v_n      int;
  v_total  int;
  v_active int;
BEGIN
  UPDATE c.brand_avatar
     SET is_default_host = false
   WHERE brand_avatar_id IN (
           '83ff167d-a844-4e1c-9d1a-d8ff257c11bc',  -- ndis-yarns     | realistic | support_coordinator
           'd6c422fb-9dc5-4bcc-aba6-2e6e942f2cdd'   -- property-pulse | realistic | buyers_agent
         )
     AND is_default_host = true;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'cc-0063 ROLLBACK STOP: cleared % row(s), expected exactly 2', v_n;
  END IF;

  -- Post-rollback invariants: no designation anywhere, is_active still untouched.
  SELECT count(*) INTO v_total FROM c.brand_avatar WHERE is_default_host;
  IF v_total <> 0 THEN
    RAISE EXCEPTION 'cc-0063 ROLLBACK STOP: % designated row(s) remain, expected 0', v_total;
  END IF;

  SELECT count(*) INTO v_active FROM c.brand_avatar WHERE is_active IS TRUE;
  IF v_active <> 2 THEN
    RAISE EXCEPTION 'cc-0063 ROLLBACK STOP: is_active changed — % active row(s), expected 2', v_active;
  END IF;

  RAISE NOTICE 'cc-0063 rollback: designation cleared on % row(s); is_active untouched', v_n;
END
$cc0063_rb$;
