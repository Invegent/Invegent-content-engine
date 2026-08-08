-- cc-0092 A2a — Instagram proof-tier mix, property-pulse / video_short_stat (FORWARD)
--
-- STATUS: NOT APPLIED. Authored under cc-0092 Gate B (brief v1, ISSUED 2026-08-08,
--         AMENDED-1 2026-08-08 per PK ruling "Option 1"). Apply is PK's hand, and the
--         production-mutation watch gate (~2026-08-11 20:20 Sydney) must have cleared.
--
-- ROLLBACK: NOT_APPLIED_cc0092_a2a_instagram_proof_tier_mix_ROLLBACK_v1.sql
--
-- ⚠ ORDERING IS HARD: **A1 MUST BE APPLIED FIRST.** This artifact refuses to apply
--   otherwise (pre-state assertion 3). Applied before A1, the row would be INERT — the
--   format is filtered out at capability_gated — and the lane would wait for a draft that
--   can never appear, with nothing failing loudly. That silent-nothing is the exact
--   failure mode cc-0091 was opened to end, so it is made executable here, not prose.
--
-- ─── What this is ─────────────────────────────────────────────────────────────
-- ONE row in c.client_format_mix_override: property-pulse / instagram /
-- video_short_stat @ 25.00%. Its ONLY purpose is to emit one governed video draft so
-- Gate B can prove Instagram Reel transport end-to-end. It is not a discovery-mix change.
--
-- ─── Why ONE format and not three (AMENDED-1) ─────────────────────────────────
-- cc-0092 as issued sought one Reel per newly-supported format. Post-issue gate-chain
-- analysis proved only ONE of the three is reachable. m.build_weekly_demand_grid gates a
-- format through FOUR CTEs:
--     candidate_share -> enabled_set -> capability_gated -> policy_backed
-- Live state, Instagram, verified read-only 2026-08-08:
--   video_short_stat           is_enabled=true   platform_support=false(A1 fixes)  select_template status=ok
--   video_short_stat_voice     is_enabled=FALSE  platform_support=absent(A1 fixes) status=fail_closed (fail_reason=format_unmapped)
--   video_short_kinetic_voice  is_enabled=FALSE  platform_support=absent(A1 fixes) status=fail_closed (fail_reason=format_unmapped)
--
-- ⚠ STATUS vs FAIL_REASON — the distinction is load-bearing (db-rls-auditor S-8). An earlier
--   cut of these lines wrote "select_template=format_unmapped" as though that were the
--   status. It is not: the status is 'fail_closed' and 'format_unmapped' is the fail_reason.
--   capability_gated filters on status <> 'fail_closed', so a status of 'format_unmapped'
--   would PASS the gate — meaning the stated reason for these formats being excluded would
--   have been wrong even though the conclusion was right. A reader reasoning from the old
--   wording about a FUTURE format would reason wrongly, which is how this class of error
--   propagates.
--
-- 'format_unmapped' is literal: c.creative_template_variant_candidate holds ZERO rows for
-- either _voice key. The _voice formats render through the LEGACY branch in video-worker
-- (index.ts:1728 — B1_VIDEO_GOVERNED_FORMAT is the exact literal 'video_short_stat', so the
-- _voice variants never reach select_template), while the S7 demand-grid guard requires
-- governed selectability from every format. That divergence is cc-0093, NOT this artifact.
--
-- ─── Why a CLIENT OVERRIDE and not a platform-default rewrite ─────────────────
-- Read from the live function, not assumed:
--   candidate       = t.platform_format_mix_default(is_current)
--                     UNION c.client_format_mix_override(this client, is_current)
--   candidate_share = COALESCE(<this client's override share for the cell>,
--                              max(default share), 0)
-- So ONE override row ADDS one (platform, format) cell for ONE client, and leaves every
-- other BRAND byte-identical. Blast radius is one brand, one platform, one format.
-- Rewriting t.platform_format_mix_default would have moved the mix for EVERY client on
-- Instagram to prove one Reel for one of them.
--
-- ⚠ CORRECTION (db-rls-auditor S-9): an earlier cut of the sentence above also claimed
--   "every other CELL" is byte-identical. That is FALSE for the same client on the same
--   platform, and the delta block below always said so. Because the `normalised` CTE divides
--   by per_platform_total, adding a 25.00 cell renormalises PP's existing cells: carousel
--   60.00 -> 48.00 (3 -> 2 slots) and image_quote 40.00 -> 32.00. Nothing is hidden — the
--   effect is stated 25 lines down — but the summary contradicted the detail, and a summary
--   is what gets quoted into a gate. CROSS-BRAND isolation is the real and verified claim:
--   candidate and candidate_share are both filtered by client_id = p_client_id.
--
-- ─── Why 25.00 — DERIVED, not chosen ──────────────────────────────────────────
-- Allocation is largest-remainder (Hare quota) over weekly_slots = COUNT(*) of enabled
-- c.client_publish_schedule rows. property-pulse has 5 enabled Instagram rows.
-- With defaults carousel 60 / image_quote 40 and override share X:
--     normalised video share = 100X/(100+X);  raw = 5X/(100+X)
--     floor(5X/(100+X)) >= 1  <=>  5X >= 100+X  <=>  4X >= 100  <=>  X >= 25
-- 25 is therefore the SMALLEST share that wins a slot BY FLOOR ALONE rather than by
-- remainder competition. X=20 also yields 1 slot today, but only via the largest-remainder
-- tiebreak (rem .833 ranking first) — which silently loses the slot the moment another
-- format survives into the set.
--
-- ⚠ SCOPE OF THAT CLAIM, CORRECTED (db-rls-auditor O-3): 25 is minimal, and it is stable
--   against the TIEBREAK — it is NOT stable against a changing surviving set, as an earlier
--   cut of this line claimed. A third surviving format at share 20 would raise
--   per_platform_total to 145, drop video's raw to 0.862, and cost it the floor slot. The
--   protection is not the number, it is pre-state assertion 4, which pins the current default
--   set to exactly 2 rows and aborts otherwise. Overstating a guarantee that an assertion is
--   actually providing is how a later reader deletes the assertion as redundant.
--
-- Computed allocation at X=25 (carousel 48/image_quote 32/video 20 after renormalisation):
--   carousel      raw 2.4  fl 2  rem .4
--   image_quote   raw 1.6  fl 1  rem .6   -> wins the single remainder slot
--   video_short_stat raw 1.0  fl 1  rem .0
--   => carousel 2, image_quote 2, video_short_stat 1, total 5.
--
-- ⚠ DO NOT hand-renormalise. The grid's `normalised` CTE divides by per_platform_total
--   itself. A pre-normalised share would be normalised a second time and under-allocate.
--
-- ─── Expected behavioural delta — the WHOLE of it ─────────────────────────────
-- BEFORE (verified live 2026-08-08 by calling m.build_weekly_demand_grid read-only):
--   instagram  carousel 60.00 -> 3 slots ; image_quote 40.00 -> 2 slots
-- AFTER:
--   instagram  carousel 48.00 -> 2 slots ; image_quote 32.00 -> 2 slots
--              video_short_stat 20.00 -> 1 slot
-- i.e. ONE carousel slot per week becomes ONE video slot, for property-pulse only.
-- No other brand, platform, or format changes. Weekly volume is unchanged at 5.
--
-- ─── Which render path this proves ────────────────────────────────────────────
-- property-pulse's c.client_creative_governance row for 'video_short_stat' is enabled=true
-- (armed 2026-07-10), so video-worker takes renderGovernedVideoStat — the GOVERNED branch,
-- not the legacy one. That is the path worth proving.
--
-- ─── Safety ───────────────────────────────────────────────────────────────────
-- NOT IDEMPOTENT — single-shot with baseline enforcement, same posture as A1. A re-run
--   aborts in pre-state assertion 2 rather than inserting a second row.
-- ⚠ THE TWO-CURRENT-ROWS HAZARD (why assertion 2 is unconditional): the table's unique
--   key is (client_id, platform, ice_format_key, effective_from) — effective_from is IN
--   the key and defaults to CURRENT_DATE. So the same logical cell inserted on two
--   different days does NOT conflict; it produces TWO is_current=true rows. candidate_share
--   then resolves the share with `LIMIT 1` and NO ORDER BY, making the scheduled mix
--   NONDETERMINISTIC across replans. Assertion 2 therefore rejects ANY pre-existing row for
--   the cell regardless of effective_from or is_current — not merely a current one.
-- Scope: single INSERT, exactly 1 row. No DDL. No GRANT/REVOKE. No UPDATE, no DELETE.
-- Table state at authoring: c.client_format_mix_override is EMPTY (0 rows total, 0 current)
--   — this is the first row ever written to it.
-- Atomicity: BEGIN/COMMIT embedded. Requires a single-call channel that does NOT split
--   statements (N10). Supabase apply_migration honours it; NAME the channel in the record.
--
-- ─── Apply/rollback identity (SYMMETRIC) ──────────────────────────────────────
-- True prior state is "no row" (the table is empty), so the rollback DELETEs this exact
-- row rather than flipping is_current. That is the faithful restore AND it is what makes
-- forward -> rollback -> forward re-runnable for lifecycle validation; an is_current flip
-- would leave the row in place and the re-apply would then hit the unique key.
-- The audit trail of the proof lives in the cc-0092 result doc and in git, not in a
-- tombstoned row.

-- ── PRE-APPLY BASELINE (run first; record the output) ────────────────────────
-- SELECT platform, ice_format_key, share_pct, weekly_slot_count
--   FROM m.build_weekly_demand_grid(
--          (SELECT client_id FROM c.client WHERE client_slug='property-pulse'))
--  WHERE platform='instagram' ORDER BY share_pct DESC;
-- EXPECTED BASELINE (must match exactly, else STOP — the artifact is stale):
--   carousel      60.0000000000000000   3
--   image_quote   40.0000000000000000   2
--   (no video row)

BEGIN;

-- ── PRE-STATE ASSERTIONS (executable; prose baselines are not enforcement) ────
DO $$
DECLARE
  v_client uuid;
  v_n      integer;
  v_txt    text;
BEGIN
  -- 1. Client resolves to exactly one row.
  SELECT client_id INTO v_client FROM c.client WHERE client_slug = 'property-pulse';
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (pre-state 1): client_slug=property-pulse not found';
  END IF;
  IF v_client <> '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'::uuid THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (pre-state 1): property-pulse client_id is % but the artifact was authored against 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd — identity moved, artifact is stale', v_client;
  END IF;

  -- 2. No pre-existing row for this cell, ANY effective_from, ANY is_current.
  --    See "THE TWO-CURRENT-ROWS HAZARD" above — this is why the test is unconditional.
  SELECT count(*) INTO v_n
    FROM c.client_format_mix_override o
   WHERE o.client_id = v_client
     AND o.platform = 'instagram'
     AND o.ice_format_key = 'video_short_stat';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (pre-state 2): % row(s) already exist for property-pulse/instagram/video_short_stat. If this is a re-run, the migration ALREADY APPLIED — that is a NO-OP, not a failure. If it is not, a second is_current row would make candidate_share (LIMIT 1, no ORDER BY) nondeterministic. Resolve by hand; do not force.', v_n;
  END IF;

  -- 3. ⚠ A1 MUST BE APPLIED FIRST. Without it this row is inert at capability_gated.
  SELECT cf.platform_support ->> 'instagram' INTO v_txt
    FROM t."5.3_content_format" cf
   WHERE cf.ice_format_key = 'video_short_stat';
  IF v_txt IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (pre-state 3): video_short_stat platform_support->>instagram is % — APPLY cc-0091 A1 FIRST. Applied in the wrong order this row is silently inert and the Reel proof would wait forever on a draft that cannot be generated.', COALESCE(v_txt, 'ABSENT');
  END IF;

  -- 4. The default mix the 25.00 figure was derived against.
  SELECT count(*) INTO v_n
    FROM t.platform_format_mix_default d
   WHERE d.is_current AND d.platform = 'instagram'
     AND ( (d.ice_format_key = 'carousel'    AND d.default_share_pct = 60.00)
        OR (d.ice_format_key = 'image_quote' AND d.default_share_pct = 40.00) );
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (pre-state 4): the Instagram default mix is no longer carousel 60 / image_quote 40 (matched % of 2). The 25.00 share was DERIVED from that baseline and no longer guarantees exactly one slot — recompute before applying.', v_n;
  END IF;
  SELECT count(*) INTO v_n
    FROM t.platform_format_mix_default d
   WHERE d.is_current AND d.platform = 'instagram';
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (pre-state 4): the Instagram default mix has % current rows, expected exactly 2 — an unexpected format would change the renormalisation and the slot arithmetic', v_n;
  END IF;

  -- 5. Slot count the arithmetic depends on.
  SELECT count(*) INTO v_n
    FROM c.client_publish_schedule cps
   WHERE cps.client_id = v_client AND cps.enabled = true AND cps.platform = 'instagram';
  IF v_n <> 5 THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (pre-state 5): property-pulse has % enabled Instagram schedule rows, expected 5. floor(N*X/(100+X))>=1 was solved for N=5; the 25.00 share must be recomputed for N=%.', v_n, v_n;
  END IF;

  -- 6. The second capability_gated leg — independent of A1 and NOT relaxed by it.
  SELECT public.select_template('property-pulse', 'instagram', 'video_short_stat') ->> 'status'
    INTO v_txt;
  IF v_txt IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (pre-state 6): select_template returned % for property-pulse/instagram/video_short_stat — the format would be filtered at capability_gated and this row would be inert', COALESCE(v_txt, 'NULL');
  END IF;

  -- 7. enabled_set leg — the live predicate REPRODUCED VERBATIM, not paraphrased.
  --    N-1 FIX (db-rls-auditor, re-audit): the first cut tested only
  --    (client_id, ice_format_key, is_enabled=true) with NO platform predicate. The live
  --    enabled_set CTE is platform-AWARE: a NULL-platform row is a FALLBACK that applies only
  --    when no platform-specific row exists for that (client, format, platform). So a format
  --    enabled for facebook only, alongside a DISABLED instagram-specific row, satisfied the
  --    old test but is DISCARDED by the grid — a false-PASS, leaving the row inert with the
  --    pre-state reporting all clear. Latent today (every live row has platform IS NULL) but
  --    the platform-specific shape is fully supported by the grid.
  --    Any assertion that paraphrases a gate will drift from it; this one is copied.
  SELECT count(*) INTO v_n
    FROM c.client_format_config cfg
   WHERE cfg.client_id = v_client
     AND cfg.ice_format_key = 'video_short_stat'
     AND cfg.is_enabled = true
     AND ( cfg.platform = 'instagram'
        OR ( cfg.platform IS NULL
             AND NOT EXISTS (
               SELECT 1 FROM c.client_format_config cfg2
                WHERE cfg2.client_id = v_client
                  AND cfg2.ice_format_key = 'video_short_stat'
                  AND cfg2.platform = 'instagram') ) );
  IF v_n < 1 THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (pre-state 7): no c.client_format_config row enables property-pulse/video_short_stat FOR INSTAGRAM under the grid''s own enabled_set rule (a platform-specific instagram row, or a NULL-platform fallback with no instagram-specific row overriding it) — the row would be filtered at enabled_set and this override would be inert';
  END IF;

  -- 8. The two gate legs the header ADVERTISED but did not assert (db-rls-auditor S-6).
  --    capability_gated also requires cf.is_active = true, and policy_backed requires a
  --    current row in BOTH t.format_synthesis_policy and t.format_quality_policy. Both hold
  --    live, and the post-state v_vid <> 1 check would have caught either failure — so the
  --    artifact was already fail-closed. But an artifact whose header names four gate legs
  --    and enforces two is a declared-vs-enforced gap, which is precisely the class this
  --    programme exists to close. Asserting them costs nothing and makes the failure message
  --    name the actual cause instead of "video_short_stat allocated -1 slots".
  IF NOT EXISTS (SELECT 1 FROM t."5.3_content_format" cf
                  WHERE cf.ice_format_key = 'video_short_stat' AND cf.is_active = true) THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (pre-state 8): video_short_stat is not is_active — capability_gated requires it and the format would be discarded';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM t.format_synthesis_policy sp
                  WHERE sp.ice_format_key = 'video_short_stat' AND sp.is_current) THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (pre-state 8): no current t.format_synthesis_policy row for video_short_stat — the format would be filtered at policy_backed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM t.format_quality_policy qp
                  WHERE qp.ice_format_key = 'video_short_stat' AND qp.is_current) THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (pre-state 8): no current t.format_quality_policy row for video_short_stat — the format would be filtered at policy_backed';
  END IF;
END $$;

INSERT INTO c.client_format_mix_override
  (client_id, platform, ice_format_key, override_share_pct, reason, is_current)
SELECT cl.client_id, 'instagram', 'video_short_stat', 25.00,
       'cc-0092 Gate B A2a — proof-tier mix. MINIMUM share that wins exactly one weekly '
       'Instagram slot by floor alone (floor(5X/(100+X))>=1 <=> X>=25) so Gate B can prove '
       'Reel transport end-to-end on the governed render path. Proof-tier ONLY — this is '
       'NOT the material discovery mix (that is A2b, authored and deliberately NOT applied, '
       'pending the B4 permit/block verdict). Remove via the cc-0092 A2a ROLLBACK.',
       true
  FROM c.client cl
 WHERE cl.client_slug = 'property-pulse';

-- ── POST-STATE ASSERTIONS — assert the ALLOCATION OUTCOME, not just the row ───
-- m.build_weekly_demand_grid is STABLE and reads this transaction's own uncommitted
-- INSERT, so the intended scheduling result is proven fail-closed BEFORE COMMIT rather
-- than hoped for afterwards. If the allocator does not produce exactly the delta this
-- artifact claims, nothing is committed.
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
     AND o.ice_format_key = 'video_short_stat' AND o.is_current = true
     AND o.override_share_pct = 25.00;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (post-state): expected exactly 1 current 25.00%% override row, found %', v_n;
  END IF;

  SELECT
    COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='carousel'), 0),
    COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='image_quote'), 0),
    COALESCE(max(g.weekly_slot_count) FILTER (WHERE g.ice_format_key='video_short_stat'), -1),
    COALESCE(sum(g.weekly_slot_count), 0)
  INTO v_car, v_img, v_vid, v_total
  FROM m.build_weekly_demand_grid(v_client) g
  WHERE g.platform = 'instagram';

  IF v_vid <> 1 THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (post-state): video_short_stat allocated % Instagram slots, expected exactly 1. -1 means the format never survived the gate chain at all. The proof depends on this slot existing; committing an override that schedules nothing would leave the lane waiting on a draft that cannot appear.', v_vid;
  END IF;
  IF v_car <> 2 OR v_img <> 2 THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (post-state): expected carousel 2 / image_quote 2, got carousel % / image_quote % — the delta is not the one this artifact declares', v_car, v_img;
  END IF;
  IF v_total <> 5 THEN
    RAISE EXCEPTION 'cc-0092 A2a ABORT (post-state): total Instagram slots % , expected 5 — weekly volume MUST NOT change; this lane changes the mix, never the cadence', v_total;
  END IF;
END $$;

COMMIT;

-- ── POST-APPLY VERIFICATION (run; do not infer success from silence) ─────────
-- SELECT platform, ice_format_key, share_pct, weekly_slot_count
--   FROM m.build_weekly_demand_grid(
--          (SELECT client_id FROM c.client WHERE client_slug='property-pulse'))
--  WHERE platform='instagram' ORDER BY share_pct DESC;
-- EXPECTED AFTER:
--   carousel          48.0000000000000000   2
--   image_quote       32.0000000000000000   2
--   video_short_stat  20.0000000000000000   1
--
-- Then confirm NO other brand moved (all four must be byte-identical to their pre-apply
-- values; only property-pulse changes):
-- SELECT cl.client_slug, g.ice_format_key, g.weekly_slot_count
--   FROM c.client cl
--   CROSS JOIN LATERAL m.build_weekly_demand_grid(cl.client_id) g
--  WHERE g.platform='instagram' AND cl.client_slug <> 'property-pulse'
--  ORDER BY 1,2;
