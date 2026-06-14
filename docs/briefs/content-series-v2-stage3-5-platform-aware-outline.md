# Content Series v2 — Stage 3.5: Platform-Aware Outline + Retry-for-Mismatch (CCD-ready brief)

**Brief ID:** `content-series-v2-stage3-5-platform-aware-outline`
**Parent:** Series v2 `1607072b`, Stage 3 `52173b78`, live reconciliation `fad2a501` (issues #3/#4/#8). Capability resolver `get_studio_capabilities` (capability-alignment `9e05b766`).
**Status:** BRIEF ONLY — read-only discovery complete, no implementation. Gates: CCD patch (EF + RPC, staged) → D-01 → PK exact phrase → deploy → V-checks → close-out.
**Class:** mixed — `series-outline` EF change + `retry_episode` RPC change. **No new DB object** (resolver already exists).
**Authority impact:** none (docs-only brief).

---

## 1. Executive diagnosis

Stage 3 fan-out is proven correct (PP `1a3e5596`: 14/14 governed, 10 published, 0 bypass/dead/skipped). The defect is **pre-fan-out**: the outline generator is platform-blind. Two concrete causes, both verified in source today:

1. **`series-outline` EF (`522871e3`, v1.2.0) cannot emit a video format at all.** It receives only `series.platform` (singular), and hard-restricts `recommended_format` to **`text|image_quote|carousel`** in both the prompt instruction and the validation whitelist (`["text","image_quote","carousel"].includes(ep.recommended_format) ? … : "image_quote"`). So a YouTube-targeted series is *structurally incapable* of producing a video format → every YouTube child is correctly rejected downstream by the capability gate → YouTube yields zero output. This is the root of reconciliation #3.
2. **`retry_episode` re-tries the same losing format.** It re-creates slots with `v_intent.format_preference` (the original episode format), so retrying a rejected YouTube `image_quote` child just re-rejects it (#8).

The downstream gates are working *exactly right* — they reject text→YouTube and text→Instagram (#4). The fix must make the *outline* platform-aware so it stops proposing impossible combos, **without weakening any gate**.

## 2. Exact source files / functions

- **`supabase/functions/series-outline/index.ts`** (`series-outline-v1.2.0`, blob `522871e3`, 7,077 B) — `generateOutline()` (prompt + format whitelist) + the `episodeRows` map (the `["text","image_quote","carousel"]` clamp). **Primary change site.**
- **`public.get_studio_capabilities(p_client_id uuid)`** — EXISTS, callable, SECURITY DEFINER, returns per-platform `{platform, eligible, video_only, formats:[{format, supported, proven, state, reason, …}]}`. **Reuse; no change.**
- **`public.fan_out_episode(p_episode_id, p_created_by, p_scheduled_for)`** — passes one `recommended_format` to every platform via `m.create_manual_slot_internal`; the per-platform capability rejection (`format_not_supported_on_platform`) lives in that slot-creation path. **No change** — it correctly rejects; Stage 3.5 stops feeding it impossible combos.
- **`public.retry_episode(p_episode_id, p_mode, p_created_by)`** — modes `refan_out` / `retry_failed_children` (+ `regenerate_outline_item` returns `mode_not_available_in_stage2`). Re-creates with `format_preference` unchanged. **Change site #2.**

## 3. Current data flow

```
series (platform singular + platforms[]) 
  → series-outline EF: generateOutline(series.platform)   ← only sees ONE platform; emits text|image_quote|carousel ONLY
  → save_series_outline → episode.recommended_format (one format/episode, platform-blind)
  → series-writer EF (Stage 3): fan_out_episode(episode)  ← per episode
      → creative_intent(format_preference = episode.recommended_format, target_platforms = platforms[])
      → per platform: create_manual_slot_internal(same format)  ← capability gate here: video-only platform + static format = REJECT
  → governed children (Advisor/compliance/render/queue) for accepted; rejected recorded in fanout_result
  → retry_episode: re-creates rejected with SAME format_preference  ← re-rejects
```
The break is the first arrow: the outline never learns the platform set's capabilities, so it bakes in formats that the last arrow must reject.

## 4. Proposed minimal implementation plan

**Stage 3.5a — platform-aware outline (the core fix):**
- `series-outline` EF reads the series' **`platforms[]`** (not just singular `platform`) and calls **`get_studio_capabilities(client_id)`** once.
- Compute the **buildable+supported format set per selected platform** (state ∈ {enabled, enabled_unproven}); derive whether the platform set includes any **video_only** platform (YouTube).
- Pass this capability summary into the outline prompt so the model assigns each episode a `recommended_format` that is valid for the series' platforms — and **widen the validation whitelist** to include the video formats (`video_short_kinetic|video_short_stat|video_short_kinetic_voice|video_short_stat_voice|video_short_avatar`) so a video choice can actually be stored (the current hard clamp is the real blocker).
- **Per-platform format is the better target** but is a bigger change (episode→one-format today). Minimal Stage 3.5: choose a format **valid across the selected set**, and where the set mixes video-only + static platforms, prefer a format that maximises coverage OR (cleaner) let the outline mark episodes that should be video so YouTube gets a video child. Recommended minimal: **the outline picks a format that is valid for the most-constrained selected platform** (if YouTube is selected, the episode format must be a video format), so no impossible combo is ever stored. Document the residual (mixed-set episodes may over-constrain static platforms to video) as a follow-up to per-platform-format (Stage 4+).
- The clamp fallback changes from `image_quote` to **a capability-valid default for the platform set** (never a static format when the set is video-only).

**Stage 3.5b — retry repairs the format:**
- `retry_episode` (refan_out / retry_failed_children): before re-creating a rejected platform's slot, **re-resolve a valid format for that platform via `get_studio_capabilities`** instead of blindly reusing `format_preference`. If the original format is invalid for the platform, pick a buildable+supported one (prefer proven); if none exists, record `rejected: no_valid_format_for_platform` rather than re-creating a doomed slot.
- Preserve all current safety: published children never touched, in-flight preserved, dead slots left for audit, new slot under the same intent.

**No change to:** `fan_out_episode`, `create_manual_slot_internal`, the capability gate, Advisor, compliance, render, publisher. The whole fix is "stop proposing impossible formats" + "retry proposes a possible one."

## 5. Risk assessment

- **Outline prompt change** could alter format mix for existing single-platform series — mitigate: when only one non-video platform is selected, the valid set still includes text/image_quote/carousel, so behaviour is unchanged for the common FB/IG/LI-only case; only video-only-inclusive sets change.
- **Whitelist widening** is the load-bearing change — without it, no video format can ever be stored regardless of prompt. Low risk (additive; the formats are already taxonomy-buildable and gate-validated downstream).
- **Over-constraint on mixed sets** (YouTube + FB in one episode → both get video): acceptable interim; flagged for per-platform-format follow-up. Does not produce *invalid* output, only *less varied* output.
- **retry re-resolution** must not pick an unproven/unbuildable format — bounded by the resolver's `state` field (only enabled/enabled_unproven).
- `known_weak_evidence`: the model's adherence to the capability constraint in-prompt isn't guaranteed; the **whitelist clamp + downstream gate remain the hard backstops** (a bad model choice is still rejected, never published invalid).

## 6. Validation plan (post-deploy, read-only + controlled)

1. New series with YouTube selected → outline assigns **video formats** to YouTube-targeted episodes; YouTube children are **accepted** (not rejected).
2. New series FB/IG/LI only → outline still produces text/image_quote/carousel; no regression in format variety.
3. Instagram-inclusive episode → never assigned `text` (resolver marks IG text unsupported).
4. Mixed YouTube+static set → no `format_not_supported_on_platform` rejection in `fanout_result` for the capability-driven choice.
5. `retry_episode` on a previously rejected YouTube child → re-resolves to a **video** format and the new slot is **accepted**, not re-rejected.
6. retry never duplicates a published child; dead slots remain for audit.
7. Downstream unchanged: Advisor runs per child, compliance gates per child, no direct draft/queue bypass.
8. A series where a platform has *no* valid buildable format → outline/retry records a clear reason, no doomed slot created.

## 7. Stop / escalation conditions

- If widening the whitelist surfaces a format the **downstream render path can't actually build** for that platform → stop, do not ship that format in the allow-list (resolver `state` should already exclude it; verify).
- If the outline model cannot reliably honour the capability constraint even with the whitelist backstop (invalid combos still proposed at high rate) → escalate; consider moving format assignment out of the model into a deterministic post-step.
- Any sign the change would let an asset-less or unsupported post reach publish (it must not — gates unchanged) → stop.

## 8. D-01 requirement

**Yes — D-01 required before implementation.** This changes live Series behaviour (outline format selection + retry semantics) on a deployed EF (`series-outline`) and a live RPC (`retry_episode`). Per governance, an `ef_deploy` + RPC change of this class fires D-01 (`ask_chatgpt_review`) → PK exact-phrase before deploy. Staged: 3.5a (outline EF) and 3.5b (retry RPC) may be one coordinated D-01 or two; recommend **two** (outline EF first — it's the value; retry second). Rollback: redeploy `series-outline-v1.2.0` (blob `522871e3`) and re-apply prior `retry_episode` def; both single-step, no DB data change.

## 9. Explicitly out of scope

Per-platform-per-episode distinct formats (Stage 4+); persona/avatar capture (separate avatar lane, #5); scheduling fidelity (#7, separate lane); Stage 4 UI (#1/#2); T2 asset QA; publisher hard-blocks; Option C; Fix 2; register reconciliation; weakening any downstream gate; the `regenerate_outline_item` retry mode (remains a series-writer-EF concern, not this brief).

## 10. What CCD may implement after PK approval

3.5a: `series-outline` EF reads `platforms[]`, calls `get_studio_capabilities`, constrains + widens the format whitelist to include video formats, capability-valid clamp default. 3.5b: `retry_episode` re-resolves a valid per-platform format before re-creating a slot, records `no_valid_format_for_platform` where none exists. Each D-01'd; `fan_out_episode`/gates/Advisor/compliance/render/publisher unchanged. Nothing before D-01 + PK phrase.
