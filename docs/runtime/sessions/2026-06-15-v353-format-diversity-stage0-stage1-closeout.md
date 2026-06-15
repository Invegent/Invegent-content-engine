# v3.53 — F-SERIES-FORMAT-DIVERSITY Stage 0 + Stage 1 Close-out

**Date:** 2026-06-15 (Sydney)
**Lane:** F-SERIES-FORMAT-DIVERSITY — per-platform format resolution
**Status:** COMPLETE / DEPLOYED / VERIFIED
**D-01:** `fa5c1ab6-c034-4979-b698-754296d55ff2` (agree / medium risk / high confidence / proceed / escalate=false)
**PK approval phrase:** `PK APPROVES F-SERIES-FORMAT-DIVERSITY STAGE 0+1 APPLY`

---

## Part A — Problem

- The series-outline **intersection** model created an "avatar collapse." It computed the set of capability-valid formats common to **every** selected platform.
- For a `{fb, ig, li, yt}` series with publisher-real `platform_support`, the only format valid on all four was `video_short_avatar` → the series mathematically collapsed to `video_short_avatar` for every platform.
- The Facebook publisher (`guard.ts`) **cannot publish video**; the LinkedIn Zapier publisher is **text/title only**. So an avatar-everywhere result is publisher-impossible on FB and LI.
- Previous behaviour therefore either:
  - collapsed to `video_short_avatar` on every platform (publisher-impossible on FB/LI), or
  - dropped YouTube entirely (when the intersection excluded video to keep FB/LI publishable), producing an empty/penalising outcome.

## Part B — Deployment

**Stage 2 (prior lane — LIVE / verified):**
- `series-outline` **v1.4.0 → v1.5.0**.
- `resolveValidFormats` changed from **INTERSECTION → UNION** (a format is offered if valid on at least one eligible selected platform; episode `recommended_format` becomes a PREFERRED hint; fail-loud only when the union is empty).
- Deployed; Supabase function **version 48**; live GET `series-outline-v1.5.0`; `verify_jwt=false` preserved.

**Stage 0 (this lane — APPLIED):**
- `platform_support` corrected to publisher reality on 9 formats in `t."5.3_content_format"` (explicit full-object SET per format; `text` unchanged).
- Facebook loses all video + animated; LinkedIn loses `image_quote`/`carousel`/`video_short_avatar` (Zapier is text-only); Instagram loses animated; avatar keeps Instagram; YouTube unchanged.
- Migration `f_series_format_diversity_stage0_platform_support_publisher_reality` — file commit `0aecc23f`, content sha `a029f6fd`.
- Pre-flight baseline-md5 guard (abort-on-drift) and planned-md5 post-check (abort-on-mismatch) both **passed**.

**Stage 1 (this lane — APPLIED):**
- `public.fan_out_episode(uuid, text, timestamptz)` redefined to resolve the final format **per platform**, lifting the proven `retry_episode` **Stage 3.5b** resolver verbatim: load `get_studio_capabilities(client_id)` once; for each platform compute its valid formats (eligible platform AND `supported=true` AND `state IN (enabled, enabled_unproven)`); keep the episode `recommended_format` if still valid there; else deterministic first-valid (sorted); else reject `no_valid_format_for_platform` (no doomed slot).
- Preserved: persona carry, schedule stagger, `source_material`, the `creative_intent` insert (`format_preference` still stores the episode `recommended_format`), the `m.create_manual_slot_internal` gate, intent/episode status roll-up, and the top-level return shape. Accepted target objects gain additive `format` + `format_changed`.
- Migration `f_series_format_diversity_stage1_fan_out_episode_per_platform` — file commit `aa05c168`, content sha `4a2f0484`.
- Lifted from `retry_episode` Stage 3.5b logic (proven live since v3.46).

**Records:**
- D-01: `fa5c1ab6-c034-4979-b698-754296d55ff2`.
- `fan_out_episode` md5: **before `7934ce55c1a4a6fc61a7da659378be58` → after `d305aec0d8b27ed6e78a3a1612f3e443`**.
- Apply order: Stage 2 (already live) → Stage 0 → Stage 1, via `apply_migration`.

## Part C — Verification

**Function anchors (post-apply):**
- `fan_out_episode` — CHANGED (`7934ce55…` → `d305aec0…`).
- `retry_episode` — unchanged (`3d21cd0f`).
- `m.create_manual_slot_internal` — unchanged (`9ec86b61`).
- `get_studio_capabilities` — unchanged (`7e1cef46`).

**Stage 0 matrix:** all 9 corrected formats + `text` match the planned end-state md5 (MATCH).

**Live post-Stage-0 resolver valid sets:**

- **FB:** carousel, image_quote, text
- **IG:** carousel, image_quote, video_short_avatar
- **LI:** text
- **YT:** video_short_avatar, video_short_kinetic, video_short_kinetic_voice, video_short_stat, video_short_stat_voice

**Production verification (live `get_studio_capabilities` + deployed resolution logic):**

- **PP `{fb, ig, li, yt}` (pref = video_short_avatar):** FB carousel · IG video_short_avatar · LI text · YT video_short_avatar
- **CFW `{fb, ig, li}` (pref = carousel):** FB carousel · IG carousel · LI text

**No platform dropped. No publisher-impossible FB/LI format selected.**

**No test rows leaked:** `get_studio_capabilities` is STABLE (cannot write); verification never invoked `fan_out_episode` / `create_manual_slot_internal` / any INSERT; 0 `creative_intent` and 0 `slot` rows created in the window.

**avatar-collapse failure mode CLOSED. YouTube-drop failure mode CLOSED.**

**Latent-future note (NOT a defect, NOT remediated here):** `video_short`, `video_long_podcast_clip`, and `video_long_explainer` still carry `facebook:true` in `platform_support`, but they are `is_buildable=false` and `get_studio_capabilities` reports them `state='hidden'`, so the resolver never offers them (verified live). Their support must be reviewed if any becomes buildable.

## Part D — Remaining carries

**Kept OPEN:**
- YT positive-publish watch (first legitimate YouTube publish must succeed while FB/IG/LI siblings receive no YouTube row).
- YT-CROSSPUB-HISTORICAL-REMEDIATION (P2 OPEN).
- F-AVATAR-RENDER-LATENCY-RECOVERY (PARTIAL COMPLETE / OPEN — forward mechanism repaired v3.52; historical population untouched).
- F-SLOT-SCHEDULE-FIDELITY (P4 / WATCH).
- F-SERIES-AVATAR-DIFFERENTIATION (Branch B, P3 DEFERRED).

**Closed:**
- F-SERIES-FORMAT-DIVERSITY → COMPLETE / DEPLOYED / VERIFIED.

## Part E — Authority impact

**Authority impact: none.**

The decision tree is unchanged. The deployment changes only platform-specific format resolution **downstream** of the decision tree (T1 / as-built decision flow untouched; no T1 promotion, no architecture change).

**Rollback (per-stage, independent, zero data impact):**
- Stage 1 — `CREATE OR REPLACE fan_out_episode` to the prior body `7934ce55` (inlined in the Stage 1 migration footer block comment).
- Stage 0 — restore the 9 baseline `platform_support` rows (exact JSON + baseline md5s inlined in the Stage 0 migration footer).
- Stage 2 — redeploy `series-outline` v1.4.0 (CLI); independent.

**Lane footprint:** 2 applied migrations (1 ref-table value flip + 1 function redefinition) + 1 prior EF deploy (series-outline v1.5.0). This register-reconciliation pass is **docs-only — 0 code / 0 SQL / 0 migration / 0 deploy / 0 queue / 0 historical remediation / 0 publisher / 0 dashboard / 0 production mutation.**
