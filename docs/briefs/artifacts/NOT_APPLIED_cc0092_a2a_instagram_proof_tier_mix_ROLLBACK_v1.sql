-- cc-0092 A2a — Instagram proof-tier mix, property-pulse / video_short_stat (ROLLBACK)
--
-- STATUS: NOT APPLIED. Rollback for
--         NOT_APPLIED_cc0092_a2a_instagram_proof_tier_mix_v1.sql
--
-- ─── What this restores ───────────────────────────────────────────────────────
-- True prior state is NO ROW: c.client_format_mix_override was EMPTY (0 rows total,
-- 0 current) when A2a was authored, so A2a's INSERT wrote the first row ever. This
-- rollback DELETEs exactly that row and returns the table to empty.
--
-- ─── Why DELETE and not is_current = false ────────────────────────────────────
-- Two independent reasons, and they converge:
--   1. FAITHFUL RESTORE. Flipping is_current would leave the table in a state it was
--      never in ("used once, then retired") rather than the state it was actually in
--      ("never used"). Same doctrine as A1's non-symmetric rollback: restore the state
--      that existed, not a state that merely behaves the same.
--   2. RE-RUNNABILITY. The unique key is (client_id, platform, ice_format_key,
--      effective_from). An is_current flip leaves the row in place, so re-applying the
--      forward on the SAME day would hit that key and fail — breaking the required
--      lifecycle shape (forward -> assertions -> rollback -> baseline assertions ->
--      forward again -> assertions). DELETE keeps the lifecycle re-runnable.
-- The audit trail of the proof lives in the cc-0092 result doc and in git. It does not
-- depend on a tombstoned row, and a tombstone would cost the two properties above.
--
-- ─── Scope ────────────────────────────────────────────────────────────────────
-- Single DELETE, exactly 1 row, matched on the full natural key AND the 25.00 share so
-- it cannot remove a row this lane did not write. No DDL. No GRANT/REVOKE. Nothing else
-- is touched — not A1 (registry correction), not c.client_format_config, not the
-- platform defaults, not any other brand.
--
-- ⚠ THIS ROLLBACK DOES NOT UNDO A1. A1 is an independent artifact with its own rollback.
--   Reverting A2a alone returns property-pulse's Instagram mix to carousel 3 /
--   image_quote 2 and leaves the registry correctly stating that video_short_stat is
--   supported on Instagram — which is TRUE and should stay stated. Reverting A1 as well
--   would re-assert a known-false registry claim; do that only for a deliberate reason.
--
-- ⚠ THIS ROLLBACK DOES NOT UNPUBLISH ANYTHING. If a Reel has already published, removing
--   the mix row stops FUTURE video slots being scheduled. It does not and cannot retract
--   a published post. Retraction is a separate, manual, PK act on the platform itself.
--
-- Atomicity: BEGIN/COMMIT embedded — same single-call-channel requirement as the forward.

-- ── PRE-ROLLBACK BASELINE (run first; record the output) ─────────────────────
-- SELECT platform, ice_format_key, share_pct, weekly_slot_count
--   FROM m.build_weekly_demand_grid(
--          (SELECT client_id FROM c.client WHERE client_slug='property-pulse'))
--  WHERE platform='instagram' ORDER BY share_pct DESC;
-- EXPECTED (the applied state):
--   carousel          48.0000000000000000   2
--   image_quote       32.0000000000000000   2
--   video_short_stat  20.0000000000000000   1

BEGIN;

-- ── PRE-STATE ASSERTIONS ──────────────────────────────────────────────────────
DO $$
DECLARE
  v_client uuid;
  v_n      integer;
BEGIN
  SELECT client_id INTO v_client FROM c.client WHERE client_slug = 'property-pulse';
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'cc-0092 A2a ROLLBACK ABORT (pre-state): client_slug=property-pulse not found';
  END IF;

  -- Exactly the row A2a wrote must be present — no more, no fewer.
  SELECT count(*) INTO v_n
    FROM c.client_format_mix_override o
   WHERE o.client_id = v_client
     AND o.platform = 'instagram'
     AND o.ice_format_key = 'video_short_stat'
     AND o.override_share_pct = 25.00
     AND o.is_current = true;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'cc-0092 A2a ROLLBACK ABORT (pre-state): no current 25.00%% override row for property-pulse/instagram/video_short_stat. Either A2a was never applied — in which case there is NOTHING TO ROLL BACK and this is a NO-OP, not a failure — or the row was already removed or altered. Do not force.';
  END IF;
  IF v_n > 1 THEN
    RAISE EXCEPTION 'cc-0092 A2a ROLLBACK ABORT (pre-state): found % matching current rows, expected 1. More than one means the two-current-rows hazard materialised (the unique key includes effective_from). Resolve by hand — a blind DELETE here would remove rows this lane did not author.', v_n;
  END IF;

  -- DATA-LOSS GUARD: refuse if any OTHER override row exists that this rollback would
  -- leave behind in an unexpected state. At authoring the table was empty, so the only
  -- legitimate content is A2a's single row.
  SELECT count(*) INTO v_n
    FROM c.client_format_mix_override o
   WHERE NOT (o.client_id = v_client
              AND o.platform = 'instagram'
              AND o.ice_format_key = 'video_short_stat');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0092 A2a ROLLBACK ABORT (pre-state): % unrelated override row(s) exist. The table was EMPTY when A2a was authored, so unrelated rows mean another lane has since written here. This rollback does not touch them, but their presence means the "restore to empty" assumption no longer holds — STOP and re-verify who owns them before proceeding.', v_n;
  END IF;

  -- COVERAGE GUARD — S-7 BACK-PORT (db-rls-auditor re-audit N-6). The two guards above have a
  -- hole BETWEEN them: guard one filters on override_share_pct=25.00 AND is_current=true, and
  -- the data-loss guard EXCLUDES this cell via NOT(...). So a same-cell row at a DIFFERENT
  -- share, or with is_current=false, is invisible to BOTH — the DELETE would then proceed and
  -- the whole rollback would abort at post-state with "rows remain for the cell", which is
  -- fail-closed but names the symptom rather than the cause. This counts EVERY row for the
  -- cell regardless of share or currency, so a divergent row is caught here with an accurate
  -- message. The fix was written for the A2b v2 rollback first and is back-ported unchanged.
  SELECT count(*) INTO v_n
    FROM c.client_format_mix_override o
   WHERE o.client_id = v_client
     AND o.platform = 'instagram'
     AND o.ice_format_key = 'video_short_stat';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'cc-0092 A2a ROLLBACK ABORT (pre-state): % total row(s) for property-pulse/instagram/video_short_stat (ANY share, ANY is_current), expected exactly 1. More than one means the two-current-rows hazard materialised or a share was altered; this rollback deletes only the 25.00 current row it authored — STOP and establish who owns the others before proceeding.', v_n;
  END IF;
END $$;

DELETE FROM c.client_format_mix_override o
 USING c.client cl
 WHERE cl.client_slug = 'property-pulse'
   AND o.client_id = cl.client_id
   AND o.platform = 'instagram'
   AND o.ice_format_key = 'video_short_stat'
   AND o.override_share_pct = 25.00
   AND o.is_current = true;

-- ── POST-STATE ASSERTIONS — assert the restored ALLOCATION, not just the row ──
DO $$
DECLARE
  v_client uuid;
  v_n      integer;
  v_car    integer;
  v_img    integer;
  v_vid    integer;
  v_total  integer;
BEGIN
  SELECT client_id INTO v_client FROM c.client WHERE client_slug = 'property-pulse';

  SELECT count(*) INTO v_n
    FROM c.client_format_mix_override o
   WHERE o.client_id = v_client AND o.platform = 'instagram'
     AND o.ice_format_key = 'video_short_stat';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0092 A2a ROLLBACK ABORT (post-state): % row(s) remain for the cell, expected 0', v_n;
  END IF;

  SELECT
    COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='carousel'), 0),
    COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='image_quote'), 0),
    COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='video_short_stat'), -1),
    COALESCE(sum(g.weekly_slot_count), 0)
  INTO v_car, v_img, v_vid, v_total
  FROM m.build_weekly_demand_grid(v_client) g
  WHERE g.platform = 'instagram';

  IF v_vid <> -1 THEN
    RAISE EXCEPTION 'cc-0092 A2a ROLLBACK ABORT (post-state): video_short_stat still allocates % Instagram slots, expected the format to be absent from the grid entirely', v_vid;
  END IF;
  IF v_car <> 3 OR v_img <> 2 THEN
    RAISE EXCEPTION 'cc-0092 A2a ROLLBACK ABORT (post-state): expected the pre-A2a baseline carousel 3 / image_quote 2, got carousel % / image_quote %', v_car, v_img;
  END IF;
  IF v_total <> 5 THEN
    RAISE EXCEPTION 'cc-0092 A2a ROLLBACK ABORT (post-state): total Instagram slots %, expected 5', v_total;
  END IF;
END $$;

COMMIT;

-- ── POST-ROLLBACK VERIFICATION (run; do not infer success from silence) ──────
-- SELECT platform, ice_format_key, share_pct, weekly_slot_count
--   FROM m.build_weekly_demand_grid(
--          (SELECT client_id FROM c.client WHERE client_slug='property-pulse'))
--  WHERE platform='instagram' ORDER BY share_pct DESC;
-- EXPECTED AFTER (identical to the pre-A2a baseline):
--   carousel      60.0000000000000000   3
--   image_quote   40.0000000000000000   2
--   (no video row)
--
-- SELECT count(*) FROM c.client_format_mix_override;   -- EXPECTED: 0
