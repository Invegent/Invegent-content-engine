-- cc-0092 A2b — Instagram MATERIAL discovery mix (FORWARD)
--
-- STATUS: NOT APPLIED — AND NOT APPLICABLE BY cc-0092 UNDER ANY OUTCOME.
--         cc-0092 Gate B authors this and stops. Its B4 verdict is this artifact's INPUT,
--         never its execution. Applying it requires a SEPARATE PK gate in a later lane.
--         The production-mutation watch gate (~2026-08-11 20:20 Sydney) also applies.
--
-- ROLLBACK: NOT_APPLIED_cc0092_a2b_instagram_material_discovery_mix_ROLLBACK_v1.sql
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
-- requires_first:        cc-0091 A1 (applied) AND cc-0092 A2a (ROLLED BACK — see below)
-- ═════════════════════════════════════════════════════════════════════════════
--
-- ⚠ AMENDED-1 SCOPE: one proof format, not three. cc-0092's gate-chain analysis proved
--   video_short_stat_voice and video_short_kinetic_voice are unreachable (is_enabled=false
--   AND select_template=format_unmapped). They are therefore NOT in this mix. Adding them
--   would allocate slots to formats the grid discards, silently shrinking real output.
--   Their admission is cc-0093's subject.
--
-- ⚠ video_short_kinetic is NOT in this mix either — instagram:false stands, cause recorded
--   (no audio stream, 4/4 renders; cc-0091 A1 determination).
--
-- ─── What this restores, and why these numbers are not invented ───────────────
-- The Instagram default mix HISTORY (read live 2026-08-08) is the whole argument:
--
--   2026-04-22 (evidence-based, superseded):
--     carousel               30.00  "Buffer 2026 + Hootsuite — carousels 6.9% engagement"
--     image_quote            20.00  "Buffer 2026 — single images 4.4%; low production cost"
--     video_short_kinetic    20.00  "Buffer 2026 reach — Reels get 2.25x reach of single-image"
--     video_short_stat_voice 15.00  "YouTube Shorts data — voice reels drive retention"
--     animated_data          10.00  /  animated_text_reveal 5.00
--     => SHORT VIDEO 35.00, motion overall 50.00
--
--   2026-07-25 (current, cc-0079-slice-2):
--     carousel 60.00 / image_quote 40.00   "renormalized vs platform_support (Fault A)"
--     => SHORT VIDEO 0.00
--
-- cc-0079 Slice-2 renormalised against platform_support values cc-0091 A1 has since proven
-- WRONG. It did not decide that video underperforms; it removed video because the registry
-- said Instagram could not carry it. This artifact restores the ORIGINAL, evidence-cited
-- 35.00 short-video weighting — the prior deliberate product position — rather than
-- inventing a new number. Only the CARRIER changes: video_short_stat is the one currently
-- schedulable short-video format, so it holds the 35.00 that kinetic+stat_voice held.
--
--   ✅ PK-CONFIRMED 2026-08-08: carousel 40.00 / image_quote 25.00 / video_short_stat 35.00
--                                (= 100.00)
--
-- The 40/25 split keeps carousel ahead of image_quote as every prior version did.
--
-- 35.00 IS A PRODUCT ELECTION, not a derivation — evidence constrains it (it restores the
-- documented 2026-04-22 short-video weighting) but does not determine it. PK made that
-- election explicitly on 2026-08-08 ("confirm 35.00 for A2b"). It is now RATIFIED, and the
-- allocation table below is computed against it and verified in-transaction by the
-- post-state assertions.
-- ⚠ IF THE FIGURE EVER CHANGES: every number in the allocation block below, and both
--   post-state assertions 2 and 3, are computed from 35.00 and hardcode the resulting slot
--   counts. They are FAIL-CLOSED, so a changed share makes this artifact ABORT rather than
--   silently ship a different mix — but that means the artifact must be re-derived and
--   re-frozen, not edited in one place.
--
-- ─── Computed allocation (largest-remainder, live allocator semantics) ────────
-- Reaches EXACTLY TWO brands. invegent and care-for-welfare-pty-ltd are unaffected —
-- both fail select_template for video_short_stat independently (verified live), so the
-- format never survives capability_gated for them regardless of any share.
--
--   property-pulse (5 IG slots): raw 2.00 / 1.25 / 1.75 -> fl 2/1/1, rem .00/.25/.75
--     => carousel 2, image_quote 1, video_short_stat 2   (total 5, unchanged)
--   ndis-yarns (7 IG slots):     raw 2.80 / 1.75 / 2.45 -> fl 2/1/2, rem .80/.75/.45
--     => carousel 3, image_quote 2, video_short_stat 2   (total 7, unchanged)
--
-- Weekly volume does not change for anyone. Only the mix does.
--
-- ─── ⚠ ORDERING: A2a MUST BE ROLLED BACK FIRST ────────────────────────────────
-- candidate_share resolves a cell as
--     COALESCE(<client override share>, max(<platform default share>), 0)
-- so while A2a's property-pulse override (25.00) is is_current=true it TAKES PRECEDENCE
-- over this platform default (35.00). Applying A2b without rolling A2a back would leave
-- property-pulse silently on the proof-tier share while the record claimed it was on the
-- material mix — a false statement about live behaviour, in the lane whose entire subject
-- is false capability statements. Pre-state assertion 3 makes that executable.
--
-- ─── Supersession, not in-place UPDATE ────────────────────────────────────────
-- t.platform_format_mix_default is a versioned table (is_current / superseded_by /
-- effective_from). This artifact flips the two current rows to is_current=false and INSERTs
-- three new ones, matching how the 2026-04-22 -> 2026-07-25 change was made.
-- ⚠ DEVIATION, DELIBERATE AND FLAGGED: the 2026-07-25 change left superseded_by NULL on the
--   rows it retired. This artifact POPULATES superseded_by, which is what the column is for
--   and makes the lineage machine-followable. It is strictly additive — nothing reads
--   superseded_by (candidate filters on is_current only), so it cannot change behaviour.
--   Flagged here so a reviewer sees it as a choice rather than a slip; say so if unwanted.
--
-- ─── Safety ───────────────────────────────────────────────────────────────────
-- NOT IDEMPOTENT — single-shot with baseline enforcement. A re-run aborts in pre-state 4.
-- Scope: 1 UPDATE (2 rows) + 1 INSERT (3 rows) in t.platform_format_mix_default. No DDL.
--   No GRANT/REVOKE. No client-scoped table touched. No cadence or schedule change.
-- Atomicity: BEGIN/COMMIT embedded — single-call channel required (N10).
-- BLAST RADIUS: platform-wide by construction. Two brands actually move (above); the other
--   two are inert for an independent reason that this artifact does NOT rely on staying
--   true — post-state assertion 3 re-checks their totals rather than assuming.

-- ── PRE-APPLY BASELINE (run first; record the output) ────────────────────────
-- SELECT ice_format_key, default_share_pct, is_current
--   FROM t.platform_format_mix_default
--  WHERE platform='instagram' AND is_current ORDER BY ice_format_key;
-- EXPECTED: carousel 60.00 / image_quote 40.00  (exactly two rows)

BEGIN;

DO $$
DECLARE
  v_n     integer;
  v_pp    uuid;
  v_txt   text;
BEGIN
  SELECT client_id INTO v_pp FROM c.client WHERE client_slug = 'property-pulse';

  -- 1. cc-0091 A1 must be applied.
  SELECT cf.platform_support ->> 'instagram' INTO v_txt
    FROM t."5.3_content_format" cf WHERE cf.ice_format_key = 'video_short_stat';
  IF v_txt IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'cc-0092 A2b ABORT (pre-state 1): video_short_stat platform_support->>instagram is % — cc-0091 A1 must be applied first or this mix allocates slots to a format the grid discards', COALESCE(v_txt,'ABSENT');
  END IF;

  -- 2. ⚠ THE PROOF DEPENDENCY, MADE EXECUTABLE.
  --    A prose "depends on the B3 proof" is exactly the class of declared-but-unenforced
  --    protection this programme exists to eliminate. If the Reel was never published,
  --    this refuses to apply.
  --    NOTE ON EVIDENCE SHAPE: m.post_publish has NO publish_method column and its
  --    response_payload is {"ig_media_id": ...}. Whether the media published as a REEL is
  --    NOT recorded in the row — it follows from instagram-publisher setting
  --    media_type='REELS' for every format in IG_VIDEO_FORMATS (index.ts:154-158, :328).
  --    So this asserts what the DB can actually prove: a published Instagram post for this
  --    client whose draft format is video_short_stat, carrying a real platform_post_id.
  SELECT count(*) INTO v_n
    FROM m.post_publish pp
    JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
   WHERE pp.client_id = v_pp
     AND pp.platform = 'instagram'
     AND pp.status = 'published'
     AND pp.platform_post_id IS NOT NULL
     AND pd.recommended_format = 'video_short_stat';
  IF v_n < 1 THEN
    RAISE EXCEPTION 'cc-0092 A2b ABORT (pre-state 2): NO published Instagram video_short_stat post exists for property-pulse. This artifact depends on the cc-0092 B3 transport proof and MUST NOT be applied before it. If B4 returned BLOCK, this artifact is void — do not force it.';
  END IF;

  -- 3. ⚠ A2a's proof-tier override must be gone, or it silently outranks this mix.
  SELECT count(*) INTO v_n
    FROM c.client_format_mix_override o
   WHERE o.client_id = v_pp AND o.platform = 'instagram'
     AND o.ice_format_key = 'video_short_stat' AND o.is_current = true;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0092 A2b ABORT (pre-state 3): % current A2a override row(s) still exist for property-pulse. candidate_share COALESCEs the client override OVER this platform default, so property-pulse would stay on the 25.00 proof-tier share while the record claimed 35.00. Run the A2a ROLLBACK first.', v_n;
  END IF;

  -- 4. Exact expected baseline.
  SELECT count(*) INTO v_n
    FROM t.platform_format_mix_default d
   WHERE d.platform='instagram' AND d.is_current;
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'cc-0092 A2b ABORT (pre-state 4): expected exactly 2 current Instagram default rows, found % — if this is a re-run the migration ALREADY APPLIED (a NO-OP, not a failure); otherwise the baseline moved and this artifact is stale', v_n;
  END IF;
  SELECT count(*) INTO v_n
    FROM t.platform_format_mix_default d
   WHERE d.platform='instagram' AND d.is_current
     AND ( (d.ice_format_key='carousel' AND d.default_share_pct=60.00)
        OR (d.ice_format_key='image_quote' AND d.default_share_pct=40.00) );
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'cc-0092 A2b ABORT (pre-state 4): current Instagram defaults are not carousel 60.00 / image_quote 40.00 (matched % of 2) — the allocation arithmetic in this header was computed against that baseline', v_n;
  END IF;
END $$;

-- Retire the current rows, recording lineage.
WITH inserted AS (
  INSERT INTO t.platform_format_mix_default
    (platform, ice_format_key, default_share_pct, evidence_source, evidence_note, is_current)
  VALUES
    ('instagram','carousel',        40.00,'cc-0092-a2b',
     'Restores the 2026-04-22 evidence-based ordering (carousel leads static). cc-0079-slice-2 '
     'had inflated carousel to 60.00 only because video was removed on WRONG platform_support '
     'data, corrected by cc-0091 A1.'),
    ('instagram','image_quote',     25.00,'cc-0092-a2b',
     'Buffer 2026 — single images 4.4%; lowest production cost. Retains the carousel>image '
     'ordering held in every prior version.'),
    ('instagram','video_short_stat',35.00,'cc-0092-a2b',
     'Restores the 35.00 SHORT-VIDEO weighting of the 2026-04-22 mix (video_short_kinetic 20.00 '
     '+ video_short_stat_voice 15.00), which cc-0079-slice-2 zeroed on platform_support values '
     'cc-0091 A1 proved wrong. Original basis: "Reels get 2.25x reach of single-image posts" '
     '(Buffer 2026 reach analysis). Carrier changed to video_short_stat — the only currently '
     'schedulable short-video format; the _voice formats are unreachable (cc-0093). Transport '
     'proven by the cc-0092 B3 Reel proof, enforced executably by this migration.')
  RETURNING mix_default_id, ice_format_key
)
UPDATE t.platform_format_mix_default d
   SET is_current = false,
       superseded_by = COALESCE(
         (SELECT i.mix_default_id FROM inserted i WHERE i.ice_format_key = d.ice_format_key),
         (SELECT i.mix_default_id FROM inserted i WHERE i.ice_format_key = 'video_short_stat')),
       updated_at = now()
 WHERE d.platform = 'instagram'
   AND d.is_current = true
   AND d.evidence_source = 'cc-0079-slice-2';

-- ── POST-STATE ASSERTIONS — assert the ALLOCATION, not just the rows ──────────
DO $$
DECLARE
  v_n integer; v_car integer; v_img integer; v_vid integer; v_tot integer;
BEGIN
  SELECT count(*) INTO v_n FROM t.platform_format_mix_default
   WHERE platform='instagram' AND is_current;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'cc-0092 A2b ABORT (post-state 1): expected exactly 3 current Instagram rows, found %', v_n;
  END IF;

  SELECT COALESCE(sum(default_share_pct),0) INTO v_n FROM t.platform_format_mix_default
   WHERE platform='instagram' AND is_current;
  IF v_n <> 100 THEN
    RAISE EXCEPTION 'cc-0092 A2b ABORT (post-state 1): current Instagram shares sum to %, expected 100', v_n;
  END IF;

  -- 2. property-pulse allocation.
  SELECT COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='carousel'),0),
         COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='image_quote'),0),
         COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='video_short_stat'),-1),
         COALESCE(sum(g.weekly_slot_count),0)
    INTO v_car, v_img, v_vid, v_tot
    FROM m.build_weekly_demand_grid((SELECT client_id FROM c.client WHERE client_slug='property-pulse')) g
   WHERE g.platform='instagram';
  IF v_car<>2 OR v_img<>1 OR v_vid<>2 OR v_tot<>5 THEN
    RAISE EXCEPTION 'cc-0092 A2b ABORT (post-state 2): property-pulse Instagram expected carousel 2 / image_quote 1 / video 2 / total 5, got % / % / % / %', v_car, v_img, v_vid, v_tot;
  END IF;

  -- 3. ndis-yarns allocation — re-checked, NOT assumed.
  SELECT COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='carousel'),0),
         COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='image_quote'),0),
         COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='video_short_stat'),-1),
         COALESCE(sum(g.weekly_slot_count),0)
    INTO v_car, v_img, v_vid, v_tot
    FROM m.build_weekly_demand_grid((SELECT client_id FROM c.client WHERE client_slug='ndis-yarns')) g
   WHERE g.platform='instagram';
  IF v_car<>3 OR v_img<>2 OR v_vid<>2 OR v_tot<>7 THEN
    RAISE EXCEPTION 'cc-0092 A2b ABORT (post-state 3): ndis-yarns Instagram expected carousel 3 / image_quote 2 / video 2 / total 7, got % / % / % / %', v_car, v_img, v_vid, v_tot;
  END IF;

  -- 4. The two brands this artifact claims are UNAFFECTED must still total what they did.
  SELECT COALESCE(sum(g.weekly_slot_count),0) INTO v_tot
    FROM c.client cl CROSS JOIN LATERAL m.build_weekly_demand_grid(cl.client_id) g
   WHERE g.platform='instagram' AND cl.client_slug IN ('invegent','care-for-welfare-pty-ltd');
  IF v_tot <> 6 THEN
    RAISE EXCEPTION 'cc-0092 A2b ABORT (post-state 4): invegent + care-for-welfare Instagram slots total %, expected 6 (3+3, unchanged). This artifact claims they are unaffected; that claim is verified here rather than assumed.', v_tot;
  END IF;

  SELECT count(*) INTO v_n
    FROM c.client cl CROSS JOIN LATERAL m.build_weekly_demand_grid(cl.client_id) g
   WHERE g.platform='instagram' AND g.ice_format_key='video_short_stat'
     AND cl.client_slug IN ('invegent','care-for-welfare-pty-ltd');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0092 A2b ABORT (post-state 4): video_short_stat entered the grid for invegent/care-for-welfare (% rows). They were expected to fail select_template independently. Their template governance changed — STOP and re-verify before shipping video to a brand that has not proven it.', v_n;
  END IF;
END $$;

COMMIT;

-- ── POST-APPLY VERIFICATION (run; do not infer success from silence) ─────────
-- SELECT cl.client_slug, g.ice_format_key, g.share_pct, g.weekly_slot_count
--   FROM c.client cl CROSS JOIN LATERAL m.build_weekly_demand_grid(cl.client_id) g
--  WHERE g.platform='instagram' ORDER BY 1,2;
-- EXPECTED: property-pulse carousel 2 / image_quote 1 / video_short_stat 2
--           ndis-yarns     carousel 3 / image_quote 2 / video_short_stat 2
--           invegent, care-for-welfare-pty-ltd — unchanged, no video row
