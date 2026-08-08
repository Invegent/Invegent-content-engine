-- cc-0092 A2b v2 — Instagram MATERIAL discovery mix, PROPERTY-PULSE ONLY (FORWARD)
--
-- STATUS: NOT APPLIED — AND NOT APPLICABLE BY cc-0092 UNDER ANY OUTCOME.
--         cc-0092 Gate B authors this and stops. Its B4 verdict is this artifact's INPUT,
--         never its execution. Applying it requires a SEPARATE PK gate in a later lane.
--         The production-mutation watch gate (~2026-08-11 20:20 Sydney) also applies.
--
-- SUPERSEDES: NOT_APPLIED_cc0092_a2b_instagram_material_discovery_mix_v1.sql (hash
--             65d7f533…), which is retained UNALTERED except for a SUPERSEDED banner as an
--             audit record. v1 is NOT a revision of this file — it used a different
--             INSTRUMENT (see below) and carried a defect (M-1) that reached a PK
--             ratification. Read v1's banner before reading this.
--
-- ROLLBACK: NOT_APPLIED_cc0092_a2b_instagram_material_discovery_mix_ROLLBACK_v2.sql
--
-- ═══ MACHINE-READABLE PROOF DEPENDENCY BLOCK ═════════════════════════════════
-- depends_on_proof:      cc-0092 B3 Instagram Reel transport proof
-- proof_count_required:  1
-- proof_formats:         video_short_stat
-- proof_client:          property-pulse
-- proof_platform:        instagram
-- proof_evidence_table:  m.post_publish (status='published', platform_post_id NOT NULL)
-- proof_format_source:   m.post_draft.recommended_format
-- verdict_gate:          cc-0092 B4 must return PERMIT
-- enforcement:           EXECUTABLE — pre-state assertion 2 below, not prose
-- blocked_if:            B4 returns BLOCK, or no qualifying m.post_publish row exists
-- requires_first:        cc-0091 A1 (applied) AND cc-0092 A2a (ROLLED BACK)
-- instrument:            c.client_format_mix_override — per-client, 3 rows, PP only
-- brands_affected:       property-pulse ONLY
-- brands_untouched:      ndis-yarns, invegent, care-for-welfare-pty-ltd
-- ═════════════════════════════════════════════════════════════════════════════
--
-- ─── WHY v2 EXISTS — the instrument changed, on PK ruling ──────────────────────
-- db-rls-auditor returned BLOCK on v1 (2026-08-08). Finding M-1: v1 rewrote the PLATFORM
-- default mix (t.platform_format_mix_default) and derived its per-brand impact table from
-- the platform default SET, assuming carousel survives for every brand. It does not survive
-- for ndis-yarns — public.select_template('ndis-yarns','instagram','carousel') returns
-- status='fail_closed' (fail_reason='no_selectable_template'; no template assignment), and
-- NDIS's live Instagram grid is image_quote 100.00 -> 7 slots with NO carousel at all.
-- v1 therefore understated NDIS by 2x: it claimed 2 of 7 weekly slots would become video;
-- the true figure was 4 of 7 — a brand with ZERO Instagram video history going
-- majority-video. v1's post-state assertion 3 would have caught it AT APPLY (so the
-- fail-closed design worked), but it did NOT catch it at the PK ratification of the 35.00
-- share, which had already happened against the wrong table. That is the harm.
--
-- ROOT LESSON, now structural rather than remembered: a PLATFORM-level share cannot express
-- a per-brand product intent, because each brand's surviving set differs by TEMPLATE
-- GRADUATION STATE. The identical 35.00 meant 40% of PP's Instagram and 57% of NDIS's.
-- PK ruling 2026-08-08: "Per-client overrides, decouple A2a, and re-put 35.00 for PP only."
--
-- ⚠ THIS MAKES THE M-1 ERROR CLASS IMPOSSIBLE, not merely fixed. v2 touches no platform
--   default and writes no row for any brand but property-pulse, so no other brand's
--   surviving set can affect this artifact's outcome and this artifact cannot affect theirs.
--   The blast-radius claim no longer depends on a fact about NDIS being true.
--
-- ─── ⚠ 35.00 RE-PUT AND RE-CONFIRMED — for PP only, and its MEANING is now exact ──
-- Under v1's platform instrument, 35.00 was a share of a renormalised 100 and yielded 40%
-- of PP's Instagram. Under a per-client override the SAME NUMBER means something different:
-- an override ADDS its cell on top of the unchanged 100-point default base, so a bare
-- video_short_stat override of 35.00 gives 35/135 = 25.9% -> raw 1.296 -> ONE slot. That is
-- no better than A2a's proof tier and would NOT be a material discovery mix.
--
-- So v2 expresses PP's WHOLE Instagram mix as three override rows summing to exactly 100:
--
--   ✅ PK-CONFIRMED 2026-08-08 (re-put after the v1 BLOCK, PP only):
--        carousel 40.00 / image_quote 25.00 / video_short_stat 35.00   (= 100.00)
--
-- Because the three override rows COVER every format that survives PP's gate chain and sum
-- to 100, candidate_share resolves each cell from the override and per_platform_total is
-- exactly 100 — so the normalised shares ARE 40 / 25 / 35, and "35.00" means precisely
-- "35% of Property Pulse's Instagram allocation". Under v1 the number's meaning was
-- emergent; here it is exact by construction. That is the point of covering the whole mix
-- rather than overriding one cell.
--
-- ⚠ THE COVERAGE PROPERTY IS LOAD-BEARING AND IS ASSERTED — but credit the RIGHT assertions.
--   If a fourth format ever survives PP's chain without an override row, it contributes its
--   DEFAULT share, per_platform_total exceeds 100, and all three shares silently dilute.
--   N-2 FIX (db-rls-auditor re-audit): an earlier cut of this note claimed "pre-state assertion
--   6 pins the surviving set to exactly these three". IT DOES NOT. Pre-state 6 iterates a fixed
--   list of the three named formats and reports any that FAIL to survive; it never tests the
--   converse, that no FOURTH format survives. The protection is the COMBINATION of:
--     pre-state 5   — only 2 current platform defaults exist, and they ARE carousel 60 /
--                     image_quote 40, so no third default can contribute an uncovered cell;
--     post-state 1  — exactly 3 current PP/instagram override rows summing to exactly 100.00;
--     post-state 2  — the resulting allocation is exactly carousel 2 / image_quote 1 / video 2.
--   That combination IS adequate. The defect was crediting one assertion with another's work —
--   which matters because A2a:76-82 names this exact failure mode in its own voice:
--   "Overstating a guarantee that an assertion is actually providing is how a later reader
--   deletes the assertion as redundant." This packet diagnosed the pattern and then repeated it.
--   Pre-state 6's real job is narrower and still essential: verify that each of the three named
--   formats DOES survive every leg of PP's gate chain.
--
-- ─── Computed allocation (largest-remainder; PP's ACTUAL surviving set) ────────
-- Verified live 2026-08-08 — every leg, per format, for THIS brand rather than assumed from
-- the platform table (the v1 M-1 lesson): carousel / image_quote / video_short_stat each
-- return select_template='ok', cf.is_active=true, a current t.format_synthesis_policy row,
-- a current t.format_quality_policy row, and an enabled c.client_format_config row.
-- property-pulse has 5 enabled Instagram c.client_publish_schedule rows.
--
--   normalised 40.00 / 25.00 / 35.00 over 5 slots:
--     carousel          raw 2.00  fl 2  rem .00
--     image_quote       raw 1.25  fl 1  rem .25
--     video_short_stat  raw 1.75  fl 1  rem .75  -> takes the single remainder slot
--   => carousel 2, image_quote 1, video_short_stat 2, total 5
--
-- BEFORE (live, verified by calling m.build_weekly_demand_grid read-only):
--   carousel 60.00 -> 3 ; image_quote 40.00 -> 2 ; (no video row)
-- AFTER:
--   carousel 40.00 -> 2 ; image_quote 25.00 -> 1 ; video_short_stat 35.00 -> 2
-- Weekly volume unchanged at 5. Video goes 0 -> 2 of 5 (40%) for property-pulse ONLY.
--
-- ndis-yarns stays image_quote 100.00 -> 7 with no video, exactly as today. invegent and
-- care-for-welfare-pty-ltd stay unchanged. All three are untouched BY CONSTRUCTION — no row
-- is written for them and no platform default moves.
--
-- ─── ⚠ ORDERING: A2a MUST BE ROLLED BACK FIRST (unchanged from v1, different reason) ──
-- A2a writes the SAME CELL this artifact writes (property-pulse / instagram /
-- video_short_stat). Under v1 the conflict was semantic — the override outranked the
-- platform default. Here it is also MECHANICAL: the unique key is (client_id, platform,
-- ice_format_key, effective_from), so applying this on A2a's calendar day raises 23505, and
-- on any OTHER day it silently creates TWO is_current rows for the cell — which
-- candidate_share resolves with LIMIT 1 and no ORDER BY, making PP's scheduled mix
-- nondeterministic across replans. Pre-state assertion 3 refuses either way.
--
-- ─── Formats deliberately NOT in this mix ─────────────────────────────────────
-- video_short_stat_voice / video_short_kinetic_voice — unreachable (is_enabled=false AND
--   select_template status='fail_closed', fail_reason='format_unmapped'). Allocating to them
--   would hand slots to formats the grid discards, silently SHRINKING real output. cc-0093.
-- video_short_kinetic — instagram:false stands; cause recorded (no audio stream, 4/4
--   renders; cc-0091 A1 determination).
-- video_short_avatar — Instagram-proven (6 Reels) but has NO c.client_format_config row for
--   any client and returns format_unmapped. Also cc-0093. NOT smuggled in here.
--
-- ─── Safety ───────────────────────────────────────────────────────────────────
-- NOT IDEMPOTENT — single-shot with baseline enforcement. Re-run aborts at pre-state 3.
-- Scope: single INSERT, exactly 3 rows, one table. No DDL. No GRANT/REVOKE. No UPDATE, no
--   DELETE, no supersession bookkeeping (nothing to retire — the table is empty once A2a is
--   rolled back). No platform default touched. No cadence or schedule change.
-- ⚠ NO ON CONFLICT, deliberately. A conflict target would silently no-op a double-apply and
--   mask it. Failing loudly on 23505 is correct here.
-- Atomicity: BEGIN/COMMIT embedded. Requires a single-call channel that does not split
--   statements (N10). Supabase apply_migration honours it; NAME the channel in the record.
--   ⚠ N10 is closed by ASSERTION, not proof (db-rls-auditor O-15b) — unverifiable without
--   performing a write. Exposure here is small: BEGIN is the first statement and COMMIT the
--   last, so assertion-to-write atomicity holds either way.
--
-- ─── Apply/rollback identity (SYMMETRIC) ──────────────────────────────────────
-- True prior state is an EMPTY c.client_format_mix_override (0 rows), which is the state
-- after A2a's rollback and the state the table has held since creation. The rollback DELETEs
-- these three rows and returns it to empty — faithful, and it keeps
-- forward -> rollback -> forward re-runnable (an is_current flip would leave the rows in
-- place and the re-apply would hit the unique key).
-- ⚠ The rollback does NOT reinstate A2a's 25.00 row. After it, PP has no video share from
--   any source. Re-apply A2a deliberately if a proof-tier slot is wanted again.

-- ── PRE-APPLY BASELINE (run first; record the output) ────────────────────────
-- SELECT platform, ice_format_key, share_pct, weekly_slot_count
--   FROM m.build_weekly_demand_grid(
--          (SELECT client_id FROM c.client WHERE client_slug='property-pulse'))
--  WHERE platform='instagram' ORDER BY share_pct DESC;
-- EXPECTED BASELINE: carousel 60.00 -> 3 ; image_quote 40.00 -> 2 ; no video row.
-- SELECT count(*) FROM c.client_format_mix_override;   -- EXPECTED: 0

BEGIN;

DO $$
DECLARE
  v_pp   uuid;
  v_n    integer;
  v_txt  text;
  v_bad  text;
BEGIN
  -- 1. Client identity.
  SELECT client_id INTO v_pp FROM c.client WHERE client_slug = 'property-pulse';
  IF v_pp IS NULL THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (pre-state 1): client_slug=property-pulse not found';
  END IF;
  IF v_pp <> '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (pre-state 1): property-pulse client_id is % but this artifact was authored against 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd — identity moved, artifact is stale', v_pp;
  END IF;

  -- 2. ⚠ THE PROOF DEPENDENCY, MADE EXECUTABLE.
  --    NOTE ON EVIDENCE SHAPE: m.post_publish has NO publish_method column and no format
  --    column; response_payload is {"ig_media_id": …}. Format lives on
  --    m.post_draft.recommended_format (confirmed the only populated format column on
  --    published IG video drafts). That the media published as a REEL is an INFERENCE from
  --    instagram-publisher setting media_type='REELS' for IG_VIDEO_FORMATS
  --    (index.ts:154-158, :328) — it is NOT a DB fact and is not asserted as one.
  SELECT count(*) INTO v_n
    FROM m.post_publish pp
    JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
   WHERE pp.client_id = v_pp
     AND pp.platform = 'instagram'
     AND pp.status = 'published'
     AND pp.platform_post_id IS NOT NULL
     AND pd.recommended_format = 'video_short_stat';
  IF v_n < 1 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (pre-state 2): NO published Instagram video_short_stat post exists for property-pulse. This artifact depends on the cc-0092 B3 transport proof and MUST NOT be applied before it. If B4 returned BLOCK, this artifact is VOID — do not force it.';
  END IF;

  -- 3. ⚠ A2a rolled back, AND no pre-existing row for ANY of the three cells.
  --    Unconditional on effective_from and is_current — see the two-current-rows note above.
  SELECT count(*) INTO v_n
    FROM c.client_format_mix_override o
   WHERE o.client_id = v_pp AND o.platform = 'instagram'
     AND o.ice_format_key IN ('carousel','image_quote','video_short_stat');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (pre-state 3): % pre-existing override row(s) for property-pulse/instagram across (carousel, image_quote, video_short_stat), expected 0. If A2a is still applied, run the A2a ROLLBACK first — its cell is one of these three. If this is a re-run, the migration ALREADY APPLIED (a NO-OP, not a failure). A second is_current row for any cell would make candidate_share (LIMIT 1, no ORDER BY) nondeterministic. Resolve by hand; do not force.', v_n;
  END IF;

  -- 4. cc-0091 A1 must be applied.
  SELECT cf.platform_support ->> 'instagram' INTO v_txt
    FROM t."5.3_content_format" cf WHERE cf.ice_format_key = 'video_short_stat';
  IF v_txt IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (pre-state 4): video_short_stat platform_support->>instagram is % — cc-0091 A1 must be applied first, or this mix allocates 35%% of PP''s Instagram to a format the grid discards and the real effect is a 35%% CUT in output', COALESCE(v_txt,'ABSENT');
  END IF;

  -- 5. Platform defaults must be the 2-row baseline. Not because this artifact rewrites them
  --    (it does not) but because the override set is designed to COVER the surviving mix: a
  --    third default format that survives PP's chain would break the sum-to-100 property.
  SELECT count(*) INTO v_n
    FROM t.platform_format_mix_default d
   WHERE d.platform='instagram' AND d.is_current;
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (pre-state 5): % current Instagram platform-default rows, expected exactly 2 (carousel, image_quote). A third default could survive PP''s gate chain WITHOUT an override row, inflating per_platform_total above 100 and silently diluting all three shares.', v_n;
  END IF;
  -- N-3 FIX (db-rls-auditor re-audit) — RESTORED REGRESSION. v1 carried TWO checks here; the
  -- v2 re-cut kept only the bare count above, while this header still justified pre-state 5 as
  -- the guard for the sum-to-100 coverage property. A count does not guard that: a SUBSTITUTED
  -- default set (two current rows that are not carousel 60 / image_quote 40) passes a count and
  -- then, if a substituted default survives PP's chain, adds a fourth candidate cell,
  -- per_platform_total exceeds 100, and all three ratified shares dilute. Measured magnitude
  -- (auditor's read-only simulation, carousel override removed so carousel falls back to its
  -- default 60): PP becomes carousel 3 / video_short_stat 1 / image_quote 1 — THE VIDEO SLOT
  -- COUNT HALVES, 2 -> 1, which is the entire point of this artifact. A2a never lost this
  -- check, so v2 was weaker than both its predecessor and its sibling in the same freeze set.
  SELECT count(*) INTO v_n
    FROM t.platform_format_mix_default d
   WHERE d.platform='instagram' AND d.is_current
     AND ( (d.ice_format_key='carousel'    AND d.default_share_pct=60.00)
        OR (d.ice_format_key='image_quote' AND d.default_share_pct=40.00) );
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (pre-state 5): the two current Instagram defaults are not carousel 60.00 and image_quote 40.00 (matched % of 2). The 40/25/35 override set was designed to COVER exactly the formats those defaults produce; a substituted default could survive PP''s chain uncovered, push per_platform_total above 100 and dilute every ratified share.', v_n;
  END IF;

  -- 6. ⚠ FULL PER-BRAND GATE-CHAIN CHECK — every leg, every format, for THIS brand.
  --    This is the direct closure of the v1 M-1 defect (an allocation derived from the
  --    platform set instead of the brand's actual surviving set) and of db-rls-auditor S-6
  --    (cf.is_active and the policy_backed leg were named in the header but unasserted).
  SELECT string_agg(x.fmt || ':' || x.why, ', ') INTO v_bad
  FROM (
    SELECT f.fmt,
           CASE
             WHEN NOT EXISTS (SELECT 1 FROM t."5.3_content_format" cf
                               WHERE cf.ice_format_key=f.fmt AND cf.is_active=true)
               THEN 'not_is_active'
             WHEN COALESCE((SELECT cf.platform_support->>'instagram'
                              FROM t."5.3_content_format" cf
                             WHERE cf.ice_format_key=f.fmt),'') <> 'true'
               THEN 'platform_support_not_true'
             WHEN COALESCE(public.select_template('property-pulse','instagram',f.fmt)
                             ->>'status','fail_closed') = 'fail_closed'
               THEN 'select_template_fail_closed'
             -- N-1 FIX (db-rls-auditor re-audit): the live enabled_set predicate REPRODUCED
             -- VERBATIM. The first cut omitted the platform dimension entirely, so a format
             -- enabled for another platform alongside a DISABLED instagram-specific row
             -- satisfied this leg while the grid DISCARDED it — a false-PASS that would report
             -- the coverage property intact when it was broken, redirecting the failure to
             -- post-state 2 with a slot-count message instead of a cause. A NULL-platform row
             -- is a FALLBACK, live only when no instagram-specific row exists.
             WHEN NOT EXISTS (SELECT 1 FROM c.client_format_config cfg
                               WHERE cfg.client_id=v_pp AND cfg.ice_format_key=f.fmt
                                 AND cfg.is_enabled=true
                                 AND ( cfg.platform = 'instagram'
                                    OR ( cfg.platform IS NULL
                                         AND NOT EXISTS (
                                           SELECT 1 FROM c.client_format_config cfg2
                                            WHERE cfg2.client_id=v_pp
                                              AND cfg2.ice_format_key=f.fmt
                                              AND cfg2.platform='instagram') ) ))
               THEN 'not_enabled_for_instagram_under_grid_rule'
             WHEN NOT EXISTS (SELECT 1 FROM t.format_synthesis_policy sp
                               WHERE sp.ice_format_key=f.fmt AND sp.is_current)
               THEN 'no_current_synthesis_policy'
             WHEN NOT EXISTS (SELECT 1 FROM t.format_quality_policy qp
                               WHERE qp.ice_format_key=f.fmt AND qp.is_current)
               THEN 'no_current_quality_policy'
           END AS why
      FROM (VALUES ('carousel'),('image_quote'),('video_short_stat')) AS f(fmt)
  ) x
  WHERE x.why IS NOT NULL;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (pre-state 6): the override set must COVER exactly the formats that survive property-pulse''s gate chain, and these do not survive: %. Any non-surviving format is discarded, so its share is REDISTRIBUTED to the others — the mix would not be the ratified 40/25/35. Re-derive against the brand''s actual surviving set; do NOT edit the shares to compensate.', v_bad;
  END IF;

  -- 7. Slot count the arithmetic depends on.
  SELECT count(*) INTO v_n
    FROM c.client_publish_schedule cps
   WHERE cps.client_id = v_pp AND cps.enabled = true AND cps.platform = 'instagram';
  IF v_n <> 5 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (pre-state 7): property-pulse has % enabled Instagram schedule rows, expected 5. The allocation table (carousel 2 / image_quote 1 / video 2) was computed for 5 slots and must be re-derived for %.', v_n, v_n;
  END IF;
END $$;

-- ⚠ PERCENT SIGNS: the `reason` literal below uses SINGLE % ("40% of PP's Instagram"), while
-- the RAISE strings above use DOUBLED %%. Both are correct and the difference is not a
-- typo: plpgsql collapses %% only inside RAISE format strings. `reason` is STORED DATA, so a
-- doubled %% would persist literally into the column. Two occurrences were wrong in the first
-- v2 cut and are fixed here — caught pre-review, 2026-08-08. Do not "normalise" them.
INSERT INTO c.client_format_mix_override
  (client_id, platform, ice_format_key, override_share_pct, reason, is_current)
SELECT cl.client_id, 'instagram', v.fmt, v.share,
       'cc-0092 Gate B A2b v2 — MATERIAL Instagram discovery mix, property-pulse ONLY. '
       'Per-client instrument on PK ruling 2026-08-08 after db-rls-auditor BLOCKed v1: a '
       'PLATFORM-level share cannot express a per-brand intent, because each brand''s '
       'surviving format set differs by template graduation state (the identical 35.00 meant '
       '40% of PP''s Instagram and 57% of NDIS''s). These three rows COVER PP''s whole '
       'surviving mix and sum to 100, so the normalised shares are exactly 40/25/35 and '
       '"35.00" means precisely 35% of PP''s Instagram. Restores the 35.00 short-video '
       'weighting of the 2026-04-22 evidence-based mix (video_short_kinetic 20.00 + '
       'video_short_stat_voice 15.00; "Reels get 2.25x reach of single-image posts", Buffer '
       '2026) which cc-0079-slice-2 zeroed on platform_support values cc-0091 A1 proved '
       'wrong. Carrier is video_short_stat — the only currently schedulable short-video '
       'format; the _voice formats and video_short_avatar are unreachable (cc-0093). '
       'Transport proven by the cc-0092 B3 Reel proof, enforced executably by this migration. '
       'Remove via the cc-0092 A2b v2 ROLLBACK.',
       true
  FROM c.client cl
 CROSS JOIN (VALUES ('carousel', 40.00), ('image_quote', 25.00), ('video_short_stat', 35.00))
              AS v(fmt, share)
 WHERE cl.client_slug = 'property-pulse';

-- ── POST-STATE ASSERTIONS — assert the ALLOCATION OUTCOME, not just the rows ───
-- m.build_weekly_demand_grid is STABLE and observes this transaction's own uncommitted
-- write (confirmed by db-rls-auditor O-2: a STABLE function runs with the calling
-- statement's snapshot, which includes earlier commands of the same transaction). So the
-- intended scheduling result is proven fail-closed BEFORE COMMIT.
DO $$
DECLARE
  v_pp   uuid;
  v_n    integer;
  v_sum  numeric;          -- numeric, NOT integer: db-rls-auditor S-1. An integer variable
                           -- rounds the numeric sum, so any total in [99.50,100.49] would
                           -- have satisfied "<> 100" — an assertion that did not enforce
                           -- the property it was written to enforce.
  v_car  integer;
  v_img  integer;
  v_vid  integer;
  v_tot  integer;
BEGIN
  SELECT client_id INTO v_pp FROM c.client WHERE client_slug = 'property-pulse';

  SELECT count(*), COALESCE(sum(o.override_share_pct), 0)
    INTO v_n, v_sum
    FROM c.client_format_mix_override o
   WHERE o.client_id = v_pp AND o.platform = 'instagram' AND o.is_current = true;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (post-state 1): expected exactly 3 current PP Instagram override rows, found %', v_n;
  END IF;
  IF v_sum <> 100.00 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (post-state 1): PP Instagram override shares sum to %, expected exactly 100.00 — the sum-to-100 coverage property is what makes the normalised shares equal the ratified 40/25/35', v_sum;
  END IF;

  -- 2. The ratified allocation.
  SELECT COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='carousel'),-1),
         COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='image_quote'),-1),
         COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='video_short_stat'),-1),
         COALESCE(sum(g.weekly_slot_count),0)
    INTO v_car, v_img, v_vid, v_tot
    FROM m.build_weekly_demand_grid(v_pp) g
   WHERE g.platform='instagram';
  IF v_car<>2 OR v_img<>1 OR v_vid<>2 OR v_tot<>5 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (post-state 2): property-pulse Instagram expected carousel 2 / image_quote 1 / video_short_stat 2 / total 5, got % / % / % / % (-1 = format absent from the grid entirely)', v_car, v_img, v_vid, v_tot;
  END IF;

  -- 3. ⚠ NO VIDEO REACHES ANY OTHER BRAND — a safety DENYLIST, and named as one.
  --    N-4 FIX (db-rls-auditor re-audit), two parts:
  --    (a) HONEST DESCRIPTION. The first cut called this "INVARIANCE against values captured in
  --        THIS transaction". It is not — nothing is captured; it is an absolute "zero video
  --        rows for other brands" test. That mislabel MATTERED: invariance would be
  --        format-agnostic by nature, so calling it invariance made a hand-written key list
  --        look adequate when a key list can never be.
  --    (b) FORMAT-AGNOSTIC PREDICATE. The old IN-list named 5 keys; t."5.3_content_format"
  --        holds 8 active video-prefixed formats. It omitted `video_short` — is_active=true AND
  --        platform_support->>'instagram'='true', i.e. the one omitted format Instagram already
  --        accepts — plus video_long_explainer and video_long_podcast_clip. LIKE 'video%' cannot
  --        go stale as formats are added, which a maintained list always eventually does.
  SELECT count(*) INTO v_n
    FROM c.client cl
    CROSS JOIN LATERAL m.build_weekly_demand_grid(cl.client_id) g
   WHERE g.platform = 'instagram'
     AND cl.client_slug <> 'property-pulse'
     AND g.ice_format_key LIKE 'video%';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (post-state 3): % video row(s) appeared in the Instagram grid for a brand other than property-pulse. This artifact writes nothing for any other brand, so this must not happen — do NOT ship video to a brand that has not proven transport.', v_n;
  END IF;

  -- 4. ⚠ WRITE CONFINEMENT — this artifact wrote ONLY property-pulse rows.
  --    PK RULING 2026-08-08, and it replaces what stood here. The previous post-state 4 pinned
  --    ndis-yarns to image_quote 7 / total 7. That directly contradicted this artifact's own
  --    central design claim (lines 51-54: "no other brand's surviving set can affect this
  --    artifact's outcome") by making its applicability depend on exactly such a fact — and on
  --    facts that ordinary governance changes falsify (ndis/carousel is_enabled, its template
  --    assignments, its cadence). A Property-Pulse-only artifact must not refuse to apply
  --    because NDIS legitimately changed. PK: "Its blast-radius proof should establish that it
  --    writes only PP rows, rather than asserting what NDIS happens to look like."
  --
  --    Note this was the sharpest second-order defect of the v2 re-cut: the remedy for M-1
  --    ("you asserted a wrong fact about NDIS") reintroduced an assertion of a fact about NDIS.
  --
  --    WRITE CONFINEMENT IS GUARANTEED STATICALLY, which is stronger than any runtime probe of
  --    another brand's state: the INSERT's only source of client_id is
  --    `FROM c.client cl WHERE cl.client_slug = 'property-pulse'`, and this artifact contains
  --    no UPDATE and no DELETE. It therefore CANNOT write another brand's row. What is worth
  --    asserting at runtime is the resulting FOOTPRINT — that PP's own rows are exactly the
  --    three intended, with nothing extra accumulated.
  SELECT count(*) INTO v_n
    FROM c.client_format_mix_override o
   WHERE o.client_id = v_pp AND o.platform = 'instagram';
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'cc-0092 A2b v2 ABORT (post-state 4): % total property-pulse/instagram override row(s) (ANY share, ANY is_current), expected exactly the 3 this artifact writes. A different count means rows accumulated beyond this artifact''s footprint — and a second is_current row for any cell makes candidate_share (LIMIT 1, no ORDER BY) nondeterministic.', v_n;
  END IF;
END $$;

COMMIT;

-- ── POST-APPLY VERIFICATION (run; do not infer success from silence) ─────────
-- SELECT cl.client_slug, g.ice_format_key, g.share_pct, g.weekly_slot_count
--   FROM c.client cl CROSS JOIN LATERAL m.build_weekly_demand_grid(cl.client_id) g
--  WHERE g.platform='instagram' ORDER BY 1,2;
-- EXPECTED:
--   property-pulse            carousel 40.00 -> 2 ; image_quote 25.00 -> 1 ;
--                             video_short_stat 35.00 -> 2
--   every other brand         IDENTICAL to the pre-apply baseline you recorded above, and NO
--                             video row. Compare against YOUR recorded baseline, not against
--                             figures written here — those brands' mixes are free to change for
--                             their own reasons between authoring and apply, and this artifact
--                             writes nothing for them (PK ruling 2026-08-08; see post-state 4).
