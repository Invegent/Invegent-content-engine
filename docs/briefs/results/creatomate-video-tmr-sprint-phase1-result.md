CLAIMED v5.28 · creatomate-video-tmr-sprint-phase1 · isolated-worktree-off-origin · commit-gate · 2026-07-08 (verify register head at commit — active parallel churn)

# Result — Creatomate Video TMR Sprint · Phase 1: Video Readiness & Scoping

**Packet:** `docs/briefs/creatomate-video-tmr-sprint-v1-packet.md` (Gate 1 D1–D6 PK-approved; D6 adjusted to per-platform classification, YouTube-primary) · **Tier:** T1 · **Label:** SAFETY_GATE · **Completed:** 2026-07-08
**Status:** ✅ COMPLETE — read-only, zero mutation. Both legs clean: `ice-architecture-cartographer` **PASS** (video-path map + govern-gap + publisher classification), `db-rls-auditor` **PASS** (live census, SELECT-only). PP only · Creatomate video only · no HeyGen · no ElevenLabs in first slice.

## Headline

**PP video is 100% legacy and ungoverned, and the sprint starts from zero governed video assets.** `video-worker` renders 4 Creatomate(+ElevenLabs) formats with **no TMR wiring**; there is **no registered video Creatomate template at all** (the registry is 18/18 `static_image`); **0 of all PP video renders carry the governed shape**. **YouTube is the only safe first proof target** — it's the sole platform with a live native-video publish path, and historically PP's dominant video channel. The first build slice is clear: **govern `video_short_stat` (silent, Creatomate-only) → prove on YouTube.**

## 1. Current PP video path map

`video-worker` (Deno.serve, `x-video-worker-key`-gated, batch limit 4) → selects `m.post_draft` rows (`video_status='pending'`, approved/published, `recommended_format ∈` the 4 video formats) → `processDraft` (brand+logo from `getBrand`/`client_brand_profile`, **not** a governed resolver) → per-format branch (`buildKineticTextSpec` / `buildStatRevealSpec`) → **Creatomate `/v2/renders` with an INLINE composition built in code (no provider `template_id`)** → (`_voice`: ElevenLabs TTS + burned-in captions) → upload mp4 to `post-videos` bucket → `write_render_log` (`render_spec = {qa}` only). Music/vibe layer exists but is **env-gated OFF**. The retired `template_smoke` branch 410-guards (its template `bc32f52f…` was deleted). *(cartographer, cited to `video-worker/index.ts`.)*

## 2. Current video formats & which are active

`c.client_format_config` (col `ice_format_key`) — PP has **all four Creatomate video formats ENABLED**: `video_short_stat`, `video_short_stat_voice`, `video_short_kinetic`, `video_short_kinetic_voice`. `video_short_avatar` has **no format-config row** — it runs off a separate `brand_avatar` + `video_generation_enabled` gate (HeyGen, out of scope). Live succeeded renders: avatar 38 · kinetic 28 · stat 18 · stat_voice 16 · kinetic_voice 6.

## 3. Current Creatomate template / provider state

`c.creative_provider_template` = **18 rows, 100% `output_type='static_image'`, ZERO video** (`duration_seconds` NULL on all). The only 9:16 row is a **static** card. The deleted PP 9:16 video IDs (`bc32f52f…`, `490ad9ea…`) are **already gone** from the registry. Only `fb9820f8…` (the 1:1 static news card) is `production_proven`. **No usable governed video template exists** — and the legacy path doesn't use a provider template anyway (it composes inline). So the sprint has **nothing to bind to** and must author a governed video template from zero.

## 4. Existing video-worker wiring (legacy vs governed)

**Zero TMR wiring** — grep confirms no `select_template` / `resolve_slot_assets` / `buildTmrRenderPlan` / `isB1Governed` / `resolveCreativeContract` in `video-worker`. Contrast the proven image path (`image-worker/index.ts:652-717`): `isB1GovernedImageQuote → select_template → buildTmrRenderPlan → resolve_slot_assets slot_resolution → contract echo/validate → fail-loud`. The video path has **none** of it; it picks the AI `recommended_format` directly and composes inline.

## 5. Legacy vs governed — the split

**CONFIRMED: all PP video is legacy.** `render_spec ? 'tmr'` = **0** across every video format and every render state (succeeded + failed). The governed TMR shape appears only on `image_quote` (4 of 290 succeeded). The governed spine has **never touched video**. The legacy path also never persisted a Creatomate `provider_template_id` into `render_spec` (video rows carry only `{qa}`).

## 6. What's missing to make video TMR-governed — 5 named build sub-lanes

- **V1 — Author a governed video template (T3).** No video provider template exists. Requires a new Creatomate 9:16 template + a registered `c.creative_provider_template` row (`output_type='video'`) + a new declarative `variant` in `property-pulse.json`. **Design fork:** the legacy path renders *inline* (no template), so Phase 2 must decide provider-template-bound (like image) **vs** governing the inline composition parametrically. Historically the template process is manual Creatomate-editor + PK-paste — a real cost.
- **V2 — Resolver wiring in a governed video branch (T2/T3).** A new governed branch in `video-worker/processDraft` (or new worker) that calls a video-aware `select_template` / `resolve_slot_assets`, mirroring Option D.
- **V3 — Video capability-contract shape (T2).** Author `property_pulse.video_short_stat.*` in the declarative registry — including **motion/audio field classes the image contract lacks**.
- **V4 — Evidence-loop coverage (T2).** The drift probe + shadow stamper key on `render_label`/`contract_ref` and cover only `image_quote`. A governed video needs a video `render_label` + drift/shadow coverage (the Spine-Gen v1 `c.client_creative_governance` table already generalises the probe by (client, format) — video slots in there).
- **V5 — format→template mapping (T1/T2).** Decide which of the 4 legacy formats map to the governed template; recommend `video_short_stat` first.

## 7. First safe proof target — per-platform publisher classification (D6)

| Platform | Native-video publish | Evidence | Verdict |
|---|---|---|---|
| **YouTube** | ✅ live, hardened (native mp4, all 5 formats) | `youtube-publisher/index.ts:197-225`; historically PP's dominant video channel (avatar 36·kinetic 28·stat 16·…) | **`native_video_supported` — FIRST PROOF TARGET** |
| **Facebook** | ❌ blocked | `publisher/guard.ts:58-61` (`fb_video_publish_not_supported_interim`); pivoted to `image_quote` | `unsupported` |
| **LinkedIn** | ❌ video blocked (deployed = zapier text+image) | `linkedin-zapier-publisher`; modest legacy video, stopped May 2026 | `image_or_text_only` |
| **Instagram** | ⚠️ Reels code present, **0 reels ever published (2 avatar)**, unproven | `instagram-publisher/index.ts:311-328` | `requires_publisher_work` |

**No build plan should depend on FB/IG/LinkedIn video publishing** — each is a separate downstream publisher-build lane. **YouTube is the confirmed first proof target** (both code and data agree).

## 8. Recommended first build slice

**Govern `video_short_stat` — silent, Creatomate-only (no voice, no avatar) — and prove it end-to-end to YouTube.** This is the closest analog to the proven static `market_insight` card (data-forward), avoids the two riskiest dimensions, and targets the one platform that can actually publish video. Scope = V1 (template) + V3 (contract) + V2 (wiring) + V4 (evidence) + V5 (mapping=stat), proven by a governed YouTube render.

## 9. Risks & carries

- **No governed video template = the critical-path build item** (V1) — includes the provider-template-vs-inline design fork; historically manual + PK-paste.
- **Voice is not just deferred — it's currently broken:** `c.client_avatar_profile` is empty fleet-wide, so no client-scoped ElevenLabs `voice_id` resolves → **9 recorded `No ElevenLabs voice ID configured` render failures**. D4 (voice OUT of first slice) is confirmed *necessary*, not just prudent; voice becomes its own lane that must first fix voice_id config.
- **Avatar (HeyGen)** has live config (1 active PP `brand_avatar` with `heygen_avatar_id`+`heygen_voice_id`) but is **OUT** (D3) — own future sprint.
- **Evidence loop** has no video coverage today (V4); the Spine-Gen `c.client_creative_governance` table already supports adding a video (client, format) row.
- **FB/IG/LI video publishing** each require separate publisher work; IG Reels is code-present but production-unproven.
- **Git hygiene:** CLAUDE.md asserts CE HEAD `3fa45bd` but local HEAD is `9906e1a` (later, incl. cc-0029 LinkedIn) — resolve the anchor before any build lane pins one. A secondary legacy HTTP-400 storage-download render failure was also seen (source-asset fetch).

## 10. Gate-1 plan for Phase 2 (build)

Recommend Phase 2 = **one Gate-1 brief scoping the first build slice** (govern `video_short_stat` → YouTube proof), sequenced dark-first where possible:
1. **V1 template + V3 contract + V5 mapping** authored first (declarative/registry + a new Creatomate video template) — reviewable before any live render.
2. **V2 governed video-worker branch** wired to consume them (behaviour-preserving: legacy video path untouched; only governed `video_short_stat` for PP flows the new branch).
3. **First governed YouTube render proof** + **V4 evidence** (governance row + drift/shadow coverage).
Each at its tier (V1/V2 production-touching = T3; V3/V4/V5 = T2). The Phase-2 brief resolves the **provider-template-vs-inline** design fork as its first decision.

## What Phase 1 did NOT do

No build, render, template creation, deploy, migration, DB write, external-provider call, or publish. Live provider-side existence of any Creatomate video template was not probed (needs an external API call — out of Phase-1 bounds; the registry shows none regardless). No live platform action. Boundaries honoured in full.
