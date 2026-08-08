-- cc-0091 A1 — Instagram platform_support correction (FORWARD)
--
-- STATUS: NOT APPLIED. Authored under cc-0091 Gate A (brief v3, ISSUED 2026-08-08,
--         pinned commit 241cb1c1 / rollup 29785e93…). Gate A applies nothing.
--         Apply is Gate B, under a PK gate, and the production-mutation watch
--         gate (~2026-08-11 20:20 Sydney) must have cleared.
--
-- ROLLBACK: NOT_APPLIED_cc0091_a1_instagram_platform_support_correction_ROLLBACK_v1.sql
--           ⚠ The rollback is NOT symmetric with this forward (see "Apply/rollback
--           identity" below). Read it before applying this.
--
-- ─── Rationale ────────────────────────────────────────────────────────────────
-- Determination: docs/briefs/cc-0091-a1-instagram-video-format-determination-v1.md
-- Established by 11 ffprobe probes of real m.post_render_log artifacts (measurement,
-- not inference): three Creatomate short-video formats are marked unsupported on
-- Instagram while producing artifacts that satisfy every Instagram Reels publishing
-- requirement — 1080x1920 exactly 9:16, h264 High / yuv420p, AAC 44.1–48 kHz 2ch,
-- 12–27 s, ≤6.5 Mbps, on public bucket URLs (HTTP 206) on the same storage host
-- Instagram has already fetched from successfully six times.
--
-- supabase/functions/instagram-publisher/index.ts:154-158 (IG_VIDEO_FORMATS) already
-- whitelists all five short-video formats and sets media_type='REELS' at :328. The
-- publisher could always do what the registry declared it could not.
--
-- ─── PRECISION CORRECTION (matters for both SQL and A3) ───────────────────────
-- Two of the three rows do NOT hold a JSON null for "instagram" — the KEY IS ABSENT:
--   video_short_stat          {"youtube":true,"facebook":false,"linkedin":false,"instagram":false}
--   video_short_stat_voice    {"youtube":true,"facebook":false}                       <-- no instagram key
--   video_short_kinetic_voice {"youtube":true,"facebook":false}                       <-- no instagram key
--   video_short_kinetic       {"youtube":true,"facebook":false,"linkedin":false,"instagram":false}
--   video_short_avatar        {"youtube":true,"facebook":false,"linkedin":false,"instagram":true}
-- "->> 'instagram' IS NULL" therefore means ABSENT, not "declared unknown". Every
-- decision-path consumer collapses absent to false via COALESCE(...,false) — which is
-- precisely the A3 defect: an unstated value is indistinguishable from a stated denial.
--
-- ─── Cross-consumer audit (9 live consumers; read-only, pre-apply) ────────────
-- Enumerated from pg_get_functiondef over pg_proc, not from repo grep.
--
-- SILENT-COLLAPSE consumers — COALESCE((platform_support->>platform)::boolean,false);
-- absent key is indistinguishable from explicit false:
--   m.build_weekly_demand_grid              gate inside capability_gated
--   m.create_manual_slot_internal           operator slot-creation validation
--   m.resolve_final_format                  p1_support in the candidate intersection
--   public.get_client_production_readiness_queue  (3 sites)
--   public.get_studio_capabilities
--   public.save_week_format_override        operator override validation
--   public.get_week_format_allocation       FILTER (WHERE COALESCE(...,false))
--
-- ALREADY THREE-STATE-AWARE (do not rebuild these in A3 — extend them):
--   public.get_global_format_capability_pyramid
--       CASE WHEN ps_raw='true' THEN 'supported' WHEN ps_raw='false' THEN 'unsupported'
--            ELSE 'unknown' END                       <-- 'unknown' already exists
--   public.get_week_format_allocation
--       (f.platform_support ? mk.platform) AS support_key_present   <-- presence tracked
--   public.get_publishing_plan_pyramid
--       'true'->supported / 'false'->unsupported, third branch implied
--
-- NOT a consumer: instagram-publisher (hard-coded IG_VIDEO_FORMATS, no catalog read) —
-- confirmed by the same finding recorded in migration
-- 20260508052400_f_yt_pub_avatar_exclusion_remove_youtube_from_avatar_platform_support.sql.
-- This change is therefore ADVISOR/MIX-side, not publisher-side.
--
-- ─── Effect of applying THIS migration ALONE (no A2a) ─────────────────────────
-- m.build_weekly_demand_grid derives capability_gated FROM enabled_set, and
-- enabled_set is driven by the mix (share_pct). The current Instagram mix is
-- carousel 60 / image_quote 40 (t.platform_format_mix_default, is_current, effective
-- 2026-07-25). These three formats hold ZERO share, so they never enter enabled_set
-- and platform_support is never consulted for them.
--   => Applying this alone generates NO video draft and changes NO scheduling outcome.
-- The mix is the first gate; this migration corrects the second.
--
-- What it DOES change on apply (all non-automatic):
--   1. Dashboard surfaces (both pyramids, studio capabilities, week allocation) begin
--      reporting these three as supported on Instagram.
--   2. An operator CAN now manually create an Instagram video slot
--      (m.create_manual_slot_internal) or save a week override
--      (public.save_week_format_override) for them. Operator-initiated only.
--   3. m.resolve_final_format admits them to the Instagram candidate intersection —
--      still gated by the policy/mix leg, which currently excludes them.
--   4. select_template(...) <> 'fail_closed' remains an independent second gate inside
--      capability_gated; it is NOT relaxed here.
--
-- ─── Out of scope, deliberately NOT changed ───────────────────────────────────
-- video_short_kinetic stays instagram:false. Cause RECORDED (A1 determination §
-- "why UNPROVEN, not UNSUPPORTED"): its renders carry NO AUDIO STREAM — systematic
-- across 4/4 sampled renders (2026-07-16/07-19/07-26/08-03). Instagram's Reels
-- requirements enumerate an audio codec; whether the API rejects a silent MP4 was NOT
-- tested and is NOT asserted. Resolution is (a) a controlled silent-Reel proof or
-- (b) governed audio attachment. Handed to the Asset Gap lane; the Lane 5 select_music
-- dependency is RECORDED, NOT ACTIONED — Lane 5 stays FROZEN.
--
-- ⚠ OBSERVED, NOT FIXED HERE: video_short_stat_voice and video_short_kinetic_voice are
-- ALSO missing the "linkedin" key entirely — the same absent-key defect on a second
-- platform. LinkedIn is explicitly out of cc-0091 scope (validated by real feedback,
-- not to be touched). Surfaced for a separate PK decision. This migration does not
-- touch linkedin.
--
-- ─── Safety ───────────────────────────────────────────────────────────────────
-- ⚠ NOT IDEMPOTENT (corrected — N4). An earlier draft of this header claimed "re-runs are
--   a no-op". That is FALSE since the M2 pre-state block was added: this forward is now
--   SINGLE-SHOT WITH BASELINE ENFORCEMENT. A re-run does not silently no-op — it ABORTS,
--   and it now distinguishes the two reasons: "ALREADY APPLIED" (benign, no action) from
--   "baseline moved, artifact is stale" (genuine drift, STOP). The UPDATE statement itself
--   remains guarded by IS DISTINCT FROM 'true', covering both the absent-key rows (NULL)
--   and the explicit-false row, so no double-write is possible either way.
-- Scope: single UPDATE, exactly 3 rows, one JSONB key each. No DDL. No GRANT/REVOKE.
--   No other key touched (jsonb_set is key-scoped; youtube/facebook/linkedin preserved).
-- Row-count assertion: the expected affected count is 3 on first apply. A re-run does not
--   reach the UPDATE at all — it aborts in the pre-state block (see NOT IDEMPOTENT above).
--   Verify with the SELECT below BEFORE and AFTER; do not infer success from silence.
--
-- ─── Apply/rollback identity (NON-SYMMETRIC — read before applying) ───────────
-- The rollback is NOT "set all three to false". Restoring true prior state requires:
--   video_short_stat           -> instagram: false   (key existed, restore the value)
--   video_short_stat_voice     -> REMOVE the instagram key entirely
--   video_short_kinetic_voice  -> REMOVE the instagram key entirely
-- A uniform "set false" rollback would leave two rows in a state they were never in,
-- converting an absent key into a stated denial and destroying the very distinction
-- A3 exists to preserve.

-- ── PRE-APPLY BASELINE (run first; record the output) ────────────────────────
-- SELECT ice_format_key, platform_support
--   FROM t."5.3_content_format"
--  WHERE ice_format_key IN ('video_short_stat','video_short_stat_voice',
--                           'video_short_kinetic_voice','video_short_kinetic')
--  ORDER BY ice_format_key;
-- EXPECTED BASELINE (must match exactly, else STOP — the artifact is stale):
--   video_short_kinetic       {"youtube":true,"facebook":false,"linkedin":false,"instagram":false}
--   video_short_kinetic_voice {"youtube":true,"facebook":false}
--   video_short_stat          {"youtube":true,"facebook":false,"linkedin":false,"instagram":false}
--   video_short_stat_voice    {"youtube":true,"facebook":false}

BEGIN;

-- ── M2 FIX (db-rls-auditor, 2026-08-08) — EXECUTABLE pre-state assertion ─────
-- The EXPECTED BASELINE above is a COMMENT, and the post-state assertion below cannot
-- tell the two cases apart: after the UPDATE, a _voice row looks identical whether it
-- started with the instagram key ABSENT or with an explicit 'false'.
-- The ROLLBACK hardcodes the absent-key assumption and issues `platform_support -
-- 'instagram'` on both _voice rows. So if the baseline drifts between freeze and apply,
-- the forward would still pass and the rollback would then DELETE a key that legitimately
-- existed — converting a stated denial into "never stated", which is the exact
-- absent-vs-denied corruption this artifact exists to prevent, inverted into the rollback.
-- This block makes the baseline an enforced precondition instead of prose.
DO $$
DECLARE v_n integer;
BEGIN
  -- N4 FIX (db-rls-auditor): recognise ALREADY-APPLIED before asserting drift.
  -- Without this, a legitimate re-run aborts with "baseline moved, artifact is stale",
  -- which is FALSE and actively misleading — the baseline did not drift, the migration
  -- already succeeded. An operator resuming a Convention-2 sequence after an ambiguous
  -- COMMIT could not tell "already applied" from "someone else changed the data": the
  -- exact ambiguity this lane exists to abolish, re-created in its own apply path.
  SELECT count(*) INTO v_n
    FROM t."5.3_content_format"
   WHERE ice_format_key IN ('video_short_stat','video_short_stat_voice','video_short_kinetic_voice')
     AND platform_support ->> 'instagram' = 'true';
  IF v_n = 3 THEN
    SELECT count(*) INTO v_n
      FROM t."5.3_content_format"
     WHERE ice_format_key = 'video_short_kinetic'
       AND platform_support ->> 'instagram' = 'false';
    IF v_n = 1 THEN
      RAISE EXCEPTION 'cc-0091 A1: ALREADY APPLIED — all three rows are at instagram=true and video_short_kinetic is untouched. This is a NO-OP, not a drift. No action needed; do not treat this as a failure.';
    END IF;
  END IF;

  SELECT count(*) INTO v_n
    FROM t."5.3_content_format"
   WHERE ice_format_key = 'video_short_stat'
     AND platform_support ? 'instagram'
     AND platform_support ->> 'instagram' = 'false';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'cc-0091 A1 ABORT (pre-state): video_short_stat must hold an EXPLICIT instagram=false (found % rows) — baseline moved, artifact is stale', v_n;
  END IF;

  SELECT count(*) INTO v_n
    FROM t."5.3_content_format"
   WHERE ice_format_key IN ('video_short_stat_voice','video_short_kinetic_voice')
     AND NOT (platform_support ? 'instagram');
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'cc-0091 A1 ABORT (pre-state): both _voice rows must have the instagram key ABSENT (found % of 2) — if a value was since written, the ROLLBACK''s key-removal would destroy it', v_n;
  END IF;

  SELECT count(*) INTO v_n
    FROM t."5.3_content_format"
   WHERE ice_format_key = 'video_short_kinetic'
     AND platform_support ->> 'instagram' = 'false';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'cc-0091 A1 ABORT (pre-state): video_short_kinetic must hold instagram=false (found % rows)', v_n;
  END IF;
END $$;

UPDATE t."5.3_content_format"
   SET platform_support = jsonb_set(platform_support, '{instagram}', 'true'::jsonb, true),
       updated_at = now()
 WHERE ice_format_key IN ('video_short_stat',
                          'video_short_stat_voice',
                          'video_short_kinetic_voice')
   AND platform_support ->> 'instagram' IS DISTINCT FROM 'true';

-- Fail-closed row-count assertion: 3 on first apply. Any other count means the
-- baseline moved under us — abort rather than proceed on an unknown state.
DO $$
DECLARE v_ok int;
BEGIN
  SELECT count(*) INTO v_ok
    FROM t."5.3_content_format"
   WHERE ice_format_key IN ('video_short_stat','video_short_stat_voice','video_short_kinetic_voice')
     AND platform_support ->> 'instagram' = 'true';
  IF v_ok <> 3 THEN
    RAISE EXCEPTION 'cc-0091 A1 ABORT: expected 3 rows at instagram=true, found %', v_ok;
  END IF;

  -- video_short_kinetic must NOT have been touched.
  SELECT count(*) INTO v_ok
    FROM t."5.3_content_format"
   WHERE ice_format_key = 'video_short_kinetic'
     AND platform_support ->> 'instagram' = 'false';
  IF v_ok <> 1 THEN
    RAISE EXCEPTION 'cc-0091 A1 ABORT: video_short_kinetic must remain instagram=false (found % rows)', v_ok;
  END IF;
END $$;

COMMIT;

-- ── POST-APPLY VERIFICATION (run; do not infer success from silence) ─────────
-- SELECT ice_format_key, platform_support
--   FROM t."5.3_content_format"
--  WHERE ice_format_key IN ('video_short_stat','video_short_stat_voice',
--                           'video_short_kinetic_voice','video_short_kinetic')
--  ORDER BY ice_format_key;
-- EXPECTED AFTER:
--   video_short_kinetic       {"youtube":true,"facebook":false,"linkedin":false,"instagram":false}   (UNCHANGED)
--   video_short_kinetic_voice {"youtube":true,"facebook":false,"instagram":true}
--   video_short_stat          {"youtube":true,"facebook":false,"linkedin":false,"instagram":true}
--   video_short_stat_voice    {"youtube":true,"facebook":false,"instagram":true}
