-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ ⛔ SUPERSEDED — DO NOT APPLY. Its forward was NEVER APPLIED, so there is   ║
-- ║ nothing this file could roll back.                                        ║
-- ║                                                                           ║
-- ║ Superseded by: NOT_APPLIED_cc0092_a2b_instagram_material_discovery_mix_   ║
-- ║                ROLLBACK_v2.sql                                            ║
-- ║                                                                           ║
-- ║ Retained unaltered (except this banner) alongside the v1 forward it        ║
-- ║ reverses. Also preserves db-rls-auditor S-3: the UPDATE-before-DELETE      ║
-- ║ order below is MANDATORY because of the non-deferrable self-referential FK ║
-- ║ platform_format_mix_default_superseded_by_fkey — NOT for the reason the    ║
-- ║ comment at "Reinstate the prior version FIRST" gives. Reordering these two ║
-- ║ statements would raise a hard 23503. v2 has no lineage column and no       ║
-- ║ self-FK, so that hazard does not exist there at all.                       ║
-- ║                                                                           ║
-- ║ Frozen hash of this file at BLOCK: a4af2889eb38f3ab (sha256:16, LF).       ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
--
-- cc-0092 A2b — Instagram MATERIAL discovery mix (ROLLBACK)
--
-- STATUS: NOT APPLIED. Rollback for
--         NOT_APPLIED_cc0092_a2b_instagram_material_discovery_mix_v1.sql
--
-- ─── What this restores ───────────────────────────────────────────────────────
-- The exact pre-A2b state of t.platform_format_mix_default for instagram:
--   carousel    60.00  evidence_source='cc-0079-slice-2'  is_current=true  superseded_by=NULL
--   image_quote 40.00  evidence_source='cc-0079-slice-2'  is_current=true  superseded_by=NULL
-- and NO 'cc-0092-a2b' rows.
--
-- ⚠ THIS RESTORES A KNOWN-DEFECTIVE MIX, DELIBERATELY. carousel 60 / image_quote 40 is the
--   cc-0079 Slice-2 renormalisation that zeroed Instagram video on platform_support values
--   cc-0091 A1 proved WRONG. A rollback's job is to restore the prior state, not to install
--   a better one. If A2b is being reverted because it was wrong, this is correct. If it is
--   being reverted because something downstream broke, the defective mix returning is a
--   COST to weigh, not a side effect to ignore — say so in the record.
--
-- ⚠ THIS DOES NOT UNDO cc-0091 A1, and must not. A1 corrected a factual registry defect;
--   reverting it would re-assert a known-false claim. It has its own rollback if genuinely
--   needed.
--
-- ⚠ THIS DOES NOT UNPUBLISH ANYTHING. Removing the mix stops FUTURE video slots being
--   scheduled. Posts already published stay published; retraction is a manual PK act on the
--   platform itself.
--
-- ⚠ THIS DOES NOT RE-CREATE A2a's proof-tier override. A2b required that override to be
--   rolled back first, so after this rollback property-pulse has NO video share at all,
--   from either source. If a proof-tier slot is wanted again, re-apply A2a deliberately.
--
-- Why DELETE + restore rather than another supersession layer: true prior state is "the
-- slice-2 rows are current and nothing supersedes them". Stacking a third version would
-- leave a lineage that misrepresents history as three deliberate product positions when the
-- middle one was reverted. It would also break forward -> rollback -> forward re-runnability
-- (the forward asserts exactly 2 current rows). Same doctrine as the A2a rollback.
--
-- Atomicity: BEGIN/COMMIT embedded — single-call channel required (N10).

-- ── PRE-ROLLBACK BASELINE (run first; record the output) ─────────────────────
-- SELECT ice_format_key, default_share_pct, evidence_source, is_current
--   FROM t.platform_format_mix_default WHERE platform='instagram' ORDER BY is_current DESC, ice_format_key;
-- EXPECTED (the applied state): three is_current rows, all evidence_source='cc-0092-a2b'
--   carousel 40.00 / image_quote 25.00 / video_short_stat 35.00

BEGIN;

DO $$
DECLARE v_n integer;
BEGIN
  -- The A2b rows must be present and current.
  SELECT count(*) INTO v_n FROM t.platform_format_mix_default
   WHERE platform='instagram' AND is_current AND evidence_source='cc-0092-a2b';
  IF v_n = 0 THEN
    RAISE EXCEPTION 'cc-0092 A2b ROLLBACK ABORT (pre-state): no current cc-0092-a2b Instagram rows. Either A2b was never applied — NOTHING TO ROLL BACK, a NO-OP rather than a failure — or it was already reverted. Do not force.';
  END IF;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'cc-0092 A2b ROLLBACK ABORT (pre-state): found % current cc-0092-a2b rows, expected exactly 3 — state is not what A2b produced; resolve by hand', v_n;
  END IF;

  -- The rows to be reinstated must exist, retired, exactly as A2b left them.
  SELECT count(*) INTO v_n FROM t.platform_format_mix_default
   WHERE platform='instagram' AND NOT is_current AND evidence_source='cc-0079-slice-2'
     AND ( (ice_format_key='carousel' AND default_share_pct=60.00)
        OR (ice_format_key='image_quote' AND default_share_pct=40.00) );
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'cc-0092 A2b ROLLBACK ABORT (pre-state): expected 2 retired cc-0079-slice-2 rows (carousel 60.00 / image_quote 40.00) to reinstate, found %. Without them this rollback would leave Instagram with NO current mix at all — refusing rather than emptying the mix.', v_n;
  END IF;
END $$;

-- Reinstate the prior version FIRST, so Instagram is never left without a current mix.
UPDATE t.platform_format_mix_default
   SET is_current = true, superseded_by = NULL, updated_at = now()
 WHERE platform = 'instagram'
   AND is_current = false
   AND evidence_source = 'cc-0079-slice-2'
   AND ( (ice_format_key='carousel' AND default_share_pct=60.00)
      OR (ice_format_key='image_quote' AND default_share_pct=40.00) );

DELETE FROM t.platform_format_mix_default
 WHERE platform = 'instagram'
   AND evidence_source = 'cc-0092-a2b';

-- ── POST-STATE ASSERTIONS ─────────────────────────────────────────────────────
DO $$
DECLARE v_n integer; v_car integer; v_img integer; v_vid integer; v_tot integer;
BEGIN
  SELECT count(*) INTO v_n FROM t.platform_format_mix_default
   WHERE platform='instagram' AND evidence_source='cc-0092-a2b';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0092 A2b ROLLBACK ABORT (post-state): % cc-0092-a2b row(s) remain, expected 0', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM t.platform_format_mix_default
   WHERE platform='instagram' AND is_current;
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'cc-0092 A2b ROLLBACK ABORT (post-state): expected exactly 2 current Instagram rows, found %', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM t.platform_format_mix_default
   WHERE platform='instagram' AND is_current AND superseded_by IS NOT NULL;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0092 A2b ROLLBACK ABORT (post-state): % current row(s) still carry superseded_by — lineage not cleared', v_n;
  END IF;

  -- The restored allocation must match the pre-A2b baseline exactly.
  SELECT COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='carousel'),0),
         COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='image_quote'),0),
         COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='video_short_stat'),-1),
         COALESCE(sum(g.weekly_slot_count),0)
    INTO v_car, v_img, v_vid, v_tot
    FROM m.build_weekly_demand_grid((SELECT client_id FROM c.client WHERE client_slug='property-pulse')) g
   WHERE g.platform='instagram';
  IF v_car<>3 OR v_img<>2 OR v_vid<>-1 OR v_tot<>5 THEN
    RAISE EXCEPTION 'cc-0092 A2b ROLLBACK ABORT (post-state): property-pulse Instagram expected carousel 3 / image_quote 2 / no video row / total 5, got % / % / % / %', v_car, v_img, v_vid, v_tot;
  END IF;
END $$;

COMMIT;

-- ── POST-ROLLBACK VERIFICATION (run; do not infer success from silence) ──────
-- SELECT ice_format_key, default_share_pct, evidence_source, is_current, superseded_by
--   FROM t.platform_format_mix_default WHERE platform='instagram' AND is_current ORDER BY 1;
-- EXPECTED: carousel 60.00 / image_quote 40.00, both evidence_source='cc-0079-slice-2',
--           both superseded_by NULL, and no video row anywhere current.
