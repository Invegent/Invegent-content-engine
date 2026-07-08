# Brief — Creatomate Video TMR Sprint · Phase 1: Video Readiness & Scoping

**Created:** 2026-07-08 Sydney · **Author:** chat (orchestrator draft) · **Executor:** Claude Code
**Status:** ✅ Gate 1 APPROVED 2026-07-08 (D1–D6; D6 adjusted to per-platform classification, YouTube-primary) · Phase 1 COMPLETE (see result doc) · **Tier:** T1 · **Label:** SAFETY_GATE
**Result:** `docs/briefs/results/creatomate-video-tmr-sprint-phase1-result.md`

---

## Task

Open the **Creatomate Video TMR sprint** — bring governed TMR to Property Pulse **video** the way Option D brought it to static `image_quote` (governed selection → resolved assets → governed render → evidence → proven). But governing video is a real build with genuine unknowns, so **Phase 1 is read-only discovery + scoping**: map the current video path exactly, find what "govern video via TMR" actually requires, and return a **phased build plan + the sprint-shaping decisions** — so you approve each build phase on evidence, not a batch. **No build, no render, no template creation, no deploy in Phase 1.**

## Why discovery-first (the pattern that worked)

The static arc's own experience is the argument: the cross-platform proof lane discovered mid-flight that Lane W had **retired the manual render modes** — an assumption that would have wasted a build lane. The Global TMR Readiness Audit (v5.22) similarly de-risked the whole multi-client roadmap by mapping reality first. Video has more unknowns than either. A one-lane read-only discovery costs little and right-sizes everything after it.

## Source context (grounded; Phase 1 confirms the specifics)

- **PP already produces video — on the LEGACY path, ungoverned.** `video-worker` renders `video_short_stat`, `video_short_kinetic`, and their `_voice` variants via **Creatomate** (kinetic/stat animation) + **ElevenLabs** (TTS voice); `render_engine ∈ {creatomate, creatomate+elevenlabs}`. The readiness audit counted real PP legacy video renders (avatar 38 · kinetic 28 · stat 18 · stat_voice 16 · kinetic_voice 6). **None carry the governed TMR shape.**
- **`video-worker` has NO TMR wiring** (cartographer: no `select_template`/`resolve_slot_assets`/`buildTmrRenderPlan`/`isB1Governed`). Governing video = wiring the resolver into a *different* worker + render path than the proven image one.
- **There is no governed video template today.** The old governed PP 9:16 news video template (`bc32f52f…`) was **DELETED provider-side in the 2026-07-04 Creatomate cleanup**; the `video-worker` `template_smoke` governed-video smoke branch was **retired in Lane W** (410-guarded). So a governed Creatomate video template must be (re)established — a build item, not an existing asset.
- **Avatar (HeyGen) is dormant / flagged "do not start"** — 0 `client_avatar_profile` rows fleet-wide; `video_short_avatar` renders exist on the legacy path but avatar is a distinct provider + a much larger surface. Strong candidate to scope OUT of this sprint (own sprint later).
- **ElevenLabs voice has a known-issue history** (the `getBrand()` UUID-vs-slug voice-resolution bug; pre-fix LUFS audio on ~21 legacy renders). Voice is governable but adds a provider + an audio-quality dimension.
- **Platforms:** video's natural home is **YouTube** (explicitly excluded from the static pilot for exactly this sprint) plus FB/IG/LinkedIn video/reels. Static's cross-platform framing lessons (crop/scrim/logo/text-safety) carry, but 9:16 motion + audio + captions are new gates.

## Phase 1 — discovery deliverables (read-only)

1. **Current video-path map** (cartographer + code read): the exact legacy `video-worker` flow — trigger, formats, Creatomate template(s) still live vs deleted, ElevenLabs voice resolution, captions/music/vibe, `render_engine` values, storage/publish path. What's live, what's retired, what's deleted.
2. **The "govern video" gap** — precisely what Option D did for image_quote and what the equivalent requires for video: a governed video template (provider + registered `creative_provider_template` + declarative variant), resolver wiring in `video-worker` (or a new governed branch), a `governed_assets`/contract shape for video, evidence-loop coverage (shadow/drift for video), and the format→template mapping. Each named as a build sub-lane with a tier.
3. **Provider/readiness census** (read-only, recorded state only — no external calls): which Creatomate video templates exist/are registered; ElevenLabs voice config for PP; HeyGen/avatar posture; what a governed video render needs that isn't there.
4. **Phased build plan + rollout order** — the recommended sequence of build lanes (e.g. establish a governed stat/data video template → wire resolver into video-worker → first governed video render proof → voice → captions → publish → platform proof), each its own future Gate-1, with the first slice identified.
5. **Explicit not-verified list** (what Phase 1 could not determine read-only).

## Gate-1 decisions (PK) — the sprint-shaping calls

- **D1 — discovery-first.** Phase 1 = read-only discovery + phased plan (recommended), before any video build. *(alt: skip discovery, brief a build lane directly — higher risk given the deleted template + unwired worker.)*
- **D2 — first governed video format.** Recommend **`video_short_stat`** (animated data/market card) as the first to govern — it's the closest analog to the proven static `market_insight` card (data-forward, no avatar), Creatomate-only, and can start **without voice**. *(alts: kinetic; or a voice format first.)*
- **D3 — Avatar (HeyGen): IN or OUT of this sprint.** Recommend **OUT** — dormant, "do not start", distinct provider, own future sprint. This sprint = Creatomate-rendered video only.
- **D4 — Voice (ElevenLabs): in the first governed video, or fast-follow.** Recommend **OUT of the first slice** (first governed video = silent animated stat/kinetic — proves the governed video *render* path cleanly), voice as an immediate **fast-follow** phase (it carries the known getBrand/LUFS risks that deserve their own gate).
- **D5 — Governed video template sourcing.** The old 9:16 was deleted — Phase 1 confirms whether any usable Creatomate video template remains or a new governed one must be authored. Recommend Phase 1 *determines* this; the template (re)build is its own later lane (it was historically a manual Creatomate-editor + PK-paste process — a known cost).
- **D6 — Platform scope for video.** Recommend **YouTube + FB/IG/LinkedIn** (video/reels) — YT is video's home and was deliberately deferred here from static. Confirm the platform set the sprint targets.

## Boundaries (hard, Phase 1)

Read-only throughout — **no build, no code change, no render, no Creatomate template creation/edit, no deploy, no migration, no DB write, no external-provider calls, no publish.** No avatar/HeyGen work. No change to the live legacy video path or the proven static image path. No global/other-client work. Phase 1 **recommends** a build plan; it does not build, and it does not itself govern any video. Later build phases each get their own Gate-1 at the appropriate tier (governed template + resolver wiring + first render = production-touching T2/T3).

## Success criteria / Stop

**Success:** a grounded, cited current-video-path map; a precise "govern video" gap analysis; a provider/readiness census; a phased build plan with a recommended first slice; an explicit not-verified list — zero mutation, agent verdicts clean (cartographer PASS/WARN, db-rls-auditor pass on the read-only census). **Stop → PK:** discovery finds the video path is in a state that changes the sprint's shape (e.g. no viable Creatomate video template path without significant rebuild); any step would require a mutation/render/deploy to determine (out of Phase-1 bounds) → name it as a build-phase item, don't do it here.

## Note

This opens the sprint the safe way: one read-only lane that turns "do the video sprint" into an evidence-based, phased plan. Recommend approving **Phase 1 only** at this gate; the first build lane gets its own brief once discovery tells us exactly what governing PP video takes.
