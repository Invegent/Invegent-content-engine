-- cc-0092 A2b v2 — Instagram MATERIAL discovery mix, PROPERTY-PULSE ONLY (ROLLBACK)
--
-- STATUS: NOT APPLIED. Rollback for
--         NOT_APPLIED_cc0092_a2b_instagram_material_discovery_mix_v2.sql
--
-- SUPERSEDES: NOT_APPLIED_cc0092_a2b_instagram_material_discovery_mix_ROLLBACK_v1.sql
--             (hash a4af2889…), retained unaltered except for a SUPERSEDED banner.
--
-- ─── What this restores ───────────────────────────────────────────────────────
-- An EMPTY c.client_format_mix_override for property-pulse/instagram — the state the table
-- has held since creation (0 rows total, verified live 2026-08-08) and the state A2b v2
-- requires as its precondition (A2a rolled back). This DELETEs the three rows A2b v2 wrote.
--
-- ⚠ MUCH SIMPLER THAN THE v1 ROLLBACK, and that is the instrument change paying off. v1
--   rewrote the platform default table, so its rollback had to reinstate two retired rows,
--   clear self-referential superseded_by lineage, and observe a NON-DEFERRABLE FK that
--   forced UPDATE-before-DELETE (db-rls-auditor S-3 — v1's comment gave the wrong reason for
--   that ordering, so a future "cleanup" reorder would have raised a hard 23503). v2 writes
--   only client-scoped rows with no lineage column and no self-FK, so none of that exists.
--   Fewer moving parts is not cosmetic here: it removes an entire class of rollback defect.
--
-- ⚠ THIS DOES NOT REINSTATE A2a's 25.00 PROOF-TIER ROW. A2b v2 required A2a rolled back, so
--   after this rollback property-pulse has NO Instagram video share from any source, and the
--   grid returns to carousel 3 / image_quote 2. If a proof-tier slot is wanted again,
--   re-apply A2a deliberately — do not hand-edit a share here.
--
-- ⚠ THIS DOES NOT UNDO cc-0091 A1, and must not. A1 corrected a factual registry defect;
--   reverting it would re-assert a known-false claim. It has its own rollback.
--
-- ⚠ THIS DOES NOT UNPUBLISH ANYTHING. Removing the mix stops FUTURE video slots being
--   scheduled. Posts already published stay published; retraction is a manual PK act on the
--   platform itself.
--
-- ⚠ REVERTING RESTORES A ZERO-VIDEO INSTAGRAM MIX FOR PP — deliberately. carousel 60 /
--   image_quote 40 is the cc-0079-slice-2 renormalisation that removed video on
--   platform_support values cc-0091 A1 proved WRONG. A rollback restores the prior state, it
--   does not install a better one. If A2b v2 is being reverted because it was wrong, this is
--   correct; if because something downstream broke, the return of a known-defective mix is a
--   COST to record, not a side effect to pass over in silence.
--
-- Scope: single DELETE, exactly 3 rows, matched on the full natural key AND the ratified
--   shares so it cannot remove a row this lane did not write. No DDL. No GRANT/REVOKE.
-- Atomicity: BEGIN/COMMIT embedded — single-call channel required (N10).

-- ── PRE-ROLLBACK BASELINE (run first; record the output) ─────────────────────
-- SELECT platform, ice_format_key, share_pct, weekly_slot_count
--   FROM m.build_weekly_demand_grid(
--          (SELECT client_id FROM c.client WHERE client_slug='property-pulse'))
--  WHERE platform='instagram' ORDER BY share_pct DESC;
-- EXPECTED (the applied state):
--   carousel 40.00 -> 2 ; video_short_stat 35.00 -> 2 ; image_quote 25.00 -> 1

BEGIN;

DO $$
DECLARE
  v_pp uuid;
  v_n  integer;
BEGIN
  SELECT client_id INTO v_pp FROM c.client WHERE client_slug = 'property-pulse';
  IF v_pp IS NULL THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ROLLBACK ABORT (pre-state): client_slug=property-pulse not found';
  END IF;

  -- Exactly the three rows A2b v2 wrote, at their ratified shares.
  SELECT count(*) INTO v_n
    FROM c.client_format_mix_override o
   WHERE o.client_id = v_pp AND o.platform = 'instagram' AND o.is_current = true
     AND ( (o.ice_format_key='carousel'         AND o.override_share_pct=40.00)
        OR (o.ice_format_key='image_quote'      AND o.override_share_pct=25.00)
        OR (o.ice_format_key='video_short_stat' AND o.override_share_pct=35.00) );
  IF v_n = 0 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ROLLBACK ABORT (pre-state): none of the three A2b v2 rows are present. Either A2b v2 was never applied — NOTHING TO ROLL BACK, a NO-OP rather than a failure — or it was already reverted. Do not force.';
  END IF;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ROLLBACK ABORT (pre-state): found % of the 3 expected rows at their ratified shares. A partial set means the applied state is not what A2b v2 produced — resolve by hand rather than deleting an unknown subset.', v_n;
  END IF;

  -- COVERAGE GUARD, closing db-rls-auditor S-7 (the v1 rollback had a hole between its two
  -- guards: a same-cell row at a DIFFERENT share, or is_current=false, was invisible to
  -- both). This counts EVERY PP/instagram override row regardless of share or currency, so a
  -- fourth or divergent row is detected here rather than surfacing as a post-state abort
  -- with a misleading message.
  SELECT count(*) INTO v_n
    FROM c.client_format_mix_override o
   WHERE o.client_id = v_pp AND o.platform = 'instagram';
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ROLLBACK ABORT (pre-state): % total PP/instagram override rows (any share, any is_current), expected exactly 3. An extra or divergent row means another lane has written here, or the two-current-rows hazard materialised. This rollback deletes only its own three rows — STOP and establish who owns the others first.', v_n;
  END IF;

  -- Nothing outside PP/instagram is touched, but its presence invalidates "restore to empty".
  SELECT count(*) INTO v_n
    FROM c.client_format_mix_override o
   WHERE NOT (o.client_id = v_pp AND o.platform = 'instagram');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ROLLBACK ABORT (pre-state): % unrelated override row(s) exist. The table was EMPTY when this artifact was authored, so unrelated rows mean another lane has since written here. This rollback does not touch them, but the "restore to empty" assumption no longer holds — re-verify ownership before proceeding.', v_n;
  END IF;
END $$;

DELETE FROM c.client_format_mix_override o
 USING c.client cl
 WHERE cl.client_slug = 'property-pulse'
   AND o.client_id = cl.client_id
   AND o.platform = 'instagram'
   AND o.is_current = true
   AND ( (o.ice_format_key='carousel'         AND o.override_share_pct=40.00)
      OR (o.ice_format_key='image_quote'      AND o.override_share_pct=25.00)
      OR (o.ice_format_key='video_short_stat' AND o.override_share_pct=35.00) );

-- ── POST-STATE ASSERTIONS — assert the restored ALLOCATION, not just the rows ──
DO $$
DECLARE
  v_pp  uuid;
  v_n   integer;
  v_car integer;
  v_img integer;
  v_vid integer;
  v_tot integer;
BEGIN
  SELECT client_id INTO v_pp FROM c.client WHERE client_slug = 'property-pulse';

  SELECT count(*) INTO v_n
    FROM c.client_format_mix_override o
   WHERE o.client_id = v_pp AND o.platform = 'instagram';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ROLLBACK ABORT (post-state): % PP/instagram override row(s) remain, expected 0', v_n;
  END IF;

  SELECT COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='carousel'),-1),
         COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='image_quote'),-1),
         COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='video_short_stat'),-1),
         COALESCE(sum(g.weekly_slot_count),0)
    INTO v_car, v_img, v_vid, v_tot
    FROM m.build_weekly_demand_grid(v_pp) g
   WHERE g.platform='instagram';
  IF v_vid <> -1 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ROLLBACK ABORT (post-state): video_short_stat still allocates % Instagram slots for property-pulse, expected the format to be absent from the grid entirely', v_vid;
  END IF;
  IF v_car<>3 OR v_img<>2 OR v_tot<>5 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ROLLBACK ABORT (post-state): expected the pre-A2b baseline carousel 3 / image_quote 2 / total 5, got % / % / %', v_car, v_img, v_tot;
  END IF;
END $$;

COMMIT;

-- ── POST-ROLLBACK VERIFICATION (run; do not infer success from silence) ──────
-- SELECT platform, ice_format_key, share_pct, weekly_slot_count
--   FROM m.build_weekly_demand_grid(
--          (SELECT client_id FROM c.client WHERE client_slug='property-pulse'))
--  WHERE platform='instagram' ORDER BY share_pct DESC;
-- EXPECTED AFTER (identical to the pre-A2b baseline):
--   carousel 60.00 -> 3 ; image_quote 40.00 -> 2 ; (no video row)
--
-- SELECT count(*) FROM c.client_format_mix_override;   -- EXPECTED: 0
