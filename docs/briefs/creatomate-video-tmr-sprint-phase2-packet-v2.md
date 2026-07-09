# Brief — Govern PP `video_short_stat` (`vid_market_stat_reveal`) → first governed video TMR proof

**Created:** 2026-07-09 Sydney
**Author:** brief-author (orchestrator draft — proposal only)
**Executor:** Claude Code
**Status:** ✅ **Gate 1 APPROVED (PK, 2026-07-09)** — direction approved; D1/D2/D4 + roster pinned below. No build/render/apply authorised yet — the next gate covers V1/V2/render.
**Tier:** phased — authoring T2 (dark) → wiring + first render T3 (production-touching) · **Label:** PRODUCT_PROOF
**Result file:** `docs/briefs/results/creatomate-video-tmr-sprint-phase2-result.md` (created on completion)

> ## Gate-1 rulings (PK, 2026-07-09) — PINNED
>
> - **Roster:** `vid_market_stat_reveal` is **LOCKED** as the first governed video TMR proof (resolves Open Question 1). The v5.31 roster pause no longer gates this single first-proof template.
> - **D1 = (a) provider-template-bound.** Author + register a Creatomate 9:16 video template as `c.creative_provider_template` (`output_type='video'`) + declarative variant; render via `select_template → provider_template_id → buildTmrRenderPlan`. Inline-governed (b) is NOT taken.
> - **D2 = still-image Ken-Burns NOW.** First proof uses `_harness/video_tmr/video_premium_market_v4.json` (governed 17-pool still + Ken-Burns + **0.55** scrim). **Do NOT wait for footage-first.** B-roll remains a **separate lane** and becomes a **later background swap AFTER the video spine is proven**.
> - **D4 = render-and-inspect only.** ONE governed render, inspect the mp4. **No live publish and no unlisted YouTube publish in this gate.** A live/unlisted YouTube publish is a separate future gate.
> - **Scrim values (authoritative, from source):** `market_v4` = **0.55** (`_harness/video_tmr/video_premium_market_v4.json`), footage v2 = **0.60** (`_harness/video_tmr/video_short_stat_footage_v2_source.json`). The older 0.52 DECISION_PREP value is **NOT authoritative**.
>
> **Next gate (prepared, NOT authorised here):** V1 provider-template registration/build · V2 governed `video-worker` branch · ONE supervised render-and-inspect proof. Each production-touching step gets the full T3 chain + a PK gate at its tier.

> **Supersedes** the stale predecessor packet `docs/briefs/creatomate-video-tmr-sprint-phase2-packet.md` (draft, never approved). That packet pre-dated two 2026-07-08 developments this brief folds in: (1) the v5.36 premium-template build with real-image backgrounds + Ken-Burns + scrim + VO proven (`docs/briefs/results/pp-video-tmr-premium-templates-v1-result.md`); (2) PK's creative-direction decision that PP video uses FOOTAGE/B-roll backgrounds (`_harness/video_tmr/footage_proof_v1_result.md:1-8` + `docs/00_sync_state.md` v5.36 pointer), which flips the predecessor's D2. This brief is the single reconciled Gate-1 brief.

---

## Task

Govern the TMR spine to **one** Property Pulse video format — **`video_short_stat`**, template **`vid_market_stat_reveal`** (silent, Creatomate-only, no voice, no avatar) — and prove it end-to-end with **ONE governed render**, inspected as an mp4 (render-and-inspect; **no publish by default** — see D4). Built **dark-first**: the legacy `video-worker` inline video path stays **byte-untouched**; only a new governed `video_short_stat` branch for PP flows the new path, and only once proven. This is the first governed video slice; the pattern it proves is what every later video format reuses. (Predecessor scope, reconciled: `docs/briefs/creatomate-video-tmr-sprint-phase2-packet.md:10-12`; first-slice rationale: `docs/briefs/results/creatomate-video-tmr-sprint-phase1-result.md:52-53`.)

## Source context

- `docs/briefs/results/creatomate-video-tmr-sprint-phase1-result.md` — v5.28 readiness. **No governed video template exists** — `c.creative_provider_template` is 18/18 `static_image`, zero video; the old 9:16 (`bc32f52f…`) is deleted (`:20-22`). Legacy `video-worker` renders **INLINE** (composition built in code, no provider `template_id`), with **zero TMR wiring** — the load-bearing design fork D1 (`:14`,`:24-26`). YouTube is the only safe first proof target (`:44-49`). Voice is **broken** fleet-wide (empty `c.client_avatar_profile` → 9 `No ElevenLabs voice ID` render failures) — voice-OUT is *necessary*, not just prudent (`:58`). The 5-sub-lane gap V1–V5 (`:34-38`).
- `docs/briefs/results/pp-video-tmr-premium-templates-v1-result.md` — v5.36. Five premium templates BUILT + rendered + PK-viewed; the market template's **named dynamic fields = Background, StatValue, StatLabel, ContextLine, CtaText, Logo** (`:18-20`). Source JSON `_harness/video_tmr/video_premium_market_v4.json` (+ `_v5_vo.json` VO variant). **VO proven end-to-end** (ElevenLabs PP host voice `YCxeyFA0G7yTk6Wuv2oq`) but is a *later follow* (`:28-30`). The dark **V3/V4/V5 declarative + governance-row authoring is already done + reviewed** (creative-graph-auditor PASS + db-rls-auditor PASS), **held** pending the locked template (`:44`).
- `docs/briefs/pp-video-tmr-template-workbook-v1.md` — v5.31 roster, **build PAUSED pending PK roster sign-off** (`:3`). `vid_market_stat_reveal` = P0 first governed proof template, design_status **needs premium redesign** (`:17`,`:34`,`:129`); the workbook's 5 named fields for it are `StatValue`,`StatLabel`,`ContextLine`,`CtaText`,`Logo` (`:146`). NB: the workbook's D2 assumption is background-free/no-pool (`:9`,`:79`) — **now superseded** by the footage/still-image reconciliation below.
- `_harness/video_tmr/video_premium_market_v4.json` — the **still-image Ken-Burns** candidate design for `vid_market_stat_reveal`: `Background` is a **governed 17-pool still** (`brand-assets/Property_Pulse/Backgrounds/Perth_CBD_Suburbs.jpg`, `:20`) with a Ken-Burns zoom (`x_scale`/`y_scale` 108%→134%, `:22-29`) and a **0.55** scrim (`rgba(18,25,50,0.55)`, `:43`); named dynamic fields Background/Logo/StatValue/StatLabel/ContextLine/CtaText (the `MARKET UPDATE` eyebrow + accent bars are **baked**, not dynamic).
- `_harness/video_tmr/footage_proof_v1_result.md` — footage/B-roll approach PROVEN end-to-end at 1080×1920 (`:7-8`), BUT clip C1 `broll_pp_city_skyline_vantage_c1_37643438.mp4` is **REJECTED for production** (readable `WERK37` signage + near-monochrome; the text-safety rule caught it, `:21`); the no-footage still-image alternative (`video_premium_*_v1.json`, Ken-Burns on a governed still) is explicitly noted (`:23`); the provider-vs-inline fork remains a Phase 2 build decision (`:24`).
- `_harness/video_tmr/video_short_stat_footage_v2_source.json` — footage candidate design (full-frame Pexels video layer + **0.60** scrim; C1 clip rejected; `:1-11`).
- `docs/00_sync_state.md` — v5.36 pointer (templates held pending locked template; music-lane + b-roll-lane are parallel PK sessions); v5.31 (workbook paused). `docs/00_action_list.md` — DO NOT START: HeyGen · B0/B1 (`:169`); FB video publish not supported (`:337`,`:348`); YT publisher carry F-YT-FAILED-NO-RETRY (`:25`).
- Orchestrator-verified anchors (asserted, not verified by the drafting agent): dark V3/V5 authoring held **uncommitted** in worktree `C:/Users/parve/ice-worktrees/video-tmr-phase2-dark` (branch `video-tmr-phase2-dark` @ `01af927`) — modified `docs/creative-library/property-pulse.json`, modified `docs/creative-library/registry-schema-v2.md`, new migration `supabase/migrations/20260708000000_seed_client_creative_governance_video_short_stat_v1.sql`; B-roll lane (`_harness/pp_video_broll_v0/`) has **zero production-usable clips** (1 harvested, rejected); no governed VIDEO provider template exists yet (18/18 static_image).

## Scope

**In scope:** Property Pulse only · the single format `video_short_stat` · the single template `vid_market_stat_reveal` · Creatomate video only · silent (no voice/VO in this proof) · the five sub-lanes V1–V5 for this one format · exactly ONE governed render, inspected as an mp4 (render-and-inspect) · resolution of D1 (fork), D2 (background source), D4 (YouTube proof depth) at Gate 1.

**Out of scope (explicitly excluded, recorded as dependencies/later lanes, NOT absorbed):** any other video format (`video_short_kinetic`, `_voice`, avatar, tips/multi-stat/suburb/sales templates) · voice/VO wiring (separately PROVEN v5.36, a *later* follow) · HeyGen/avatar · the **music lane** (out of scope, deferred — named handoff) · the **B-roll footage sourcing lane** (blocking ONLY if PK elects footage-first; named handoff — see Dependencies) · any other client (NDIS/CFW/Invegent) · any live platform publish (FB/IG/LinkedIn video are separate publisher lanes; a live YouTube publish is gated separately per D4) · any schema change beyond the additive governance row + declarative-registry authoring already held.

## The Gate-1 decisions (PK)

### D1 — provider-template-bound vs inline-governed (carried forward, unresolved)

- **(a) Provider-template-bound (RECOMMENDED — mirrors the proven image spine).** Author a Creatomate 9:16 video template, register it as `c.creative_provider_template` (`output_type='video'`) + a declarative `variant`, and render `video_short_stat` via `select_template → provider_template_id → buildTmrRenderPlan`, exactly as the image path (`docs/briefs/results/creatomate-video-tmr-sprint-phase1-result.md:26`). **Pro:** one governance/evidence model for image and video. **Con:** manual video-template authoring + re-plumbing the video render from inline to template-based.
- **(b) Inline-governed.** Keep the inline `buildStatRevealSpec` composition but drive its parameters from the governed resolver + a contract. **Pro:** less re-plumbing, no new provider template. **Con:** a second, bespoke governance model diverging from the image spine; `select_template`/`buildTmrRenderPlan` assume a provider template so evidence maps less cleanly (`docs/briefs/creatomate-video-tmr-sprint-phase2-packet.md:26`).

**Recommendation: (a).** ✅ **PK ruling 2026-07-09: (a) provider-template-bound.** (b) inline-governed is not taken.

### D2 — background source (UPDATED — now the load-bearing fork for THIS proof)

The predecessor packet's D2 was "no background pool — logo + identity + template only" (`docs/briefs/creatomate-video-tmr-sprint-phase2-packet.md:18`,`:42`; workbook `pp-video-tmr-template-workbook-v1.md:9`,`:79`). **That is now superseded.** PK's 2026-07-08 creative-direction call is that **PP video uses FOOTAGE/B-roll backgrounds** (`_harness/video_tmr/footage_proof_v1_result.md:1-8`; `docs/00_sync_state.md` v5.36 pointer). This makes the background source the load-bearing decision for this proof. Three candidate designs for `vid_market_stat_reveal`:

| Candidate | Evidence | Status |
|---|---|---|
| **Background-free solid** (brand-navy, no photo/footage) | predecessor D2 (`…phase2-packet.md:18`); workbook background-free P0 (`…workbook-v1.md:79`) | **SUPERSEDED / REJECTED** — PK's footage call and the v5.36 premium rebuild both moved past flat backgrounds (`…premium-templates-v1-result.md:8`) |
| **Still-image Ken-Burns from the existing 17-pool** | `_harness/video_tmr/video_premium_market_v4.json` — governed 17-pool still Background (`:20`) + Ken-Burns 108%→134% (`:22-29`) + 0.55 scrim (`:43`); explicitly the "no-footage alternative … zero sourcing" (`footage_proof_v1_result.md:23`) | **AVAILABLE NOW — zero new sourcing** (reuses the ratified 17-image pool) |
| **Footage / B-roll** | approach PROVEN end-to-end (`footage_proof_v1_result.md:7-8`); design `_harness/video_tmr/video_short_stat_footage_v2_source.json` (0.60 scrim) | **BLOCKED on the B-roll lane** — the only harvested clip (C1) is REJECTED (`footage_proof_v1_result.md:21`); lane additionally gated on video-source licence ratification + fetch mechanics + a candidate-scoped harvester (see Dependencies) |

**Recommendation: use the still-image Ken-Burns template (`video_premium_market_v4.json`) for the FIRST proof**, to **decouple the governed-spine proof from the blocked B-roll lane**, with **footage as a later background-source swap** once the B-roll lane delivers a clean production clip. This proves the spine now against a governed asset that already exists; the swap to footage is then a background-source change on a proven spine, not a spine risk. ✅ **PK ruling 2026-07-09: still-image Ken-Burns NOW; do not wait for footage-first. B-roll stays a separate lane and becomes a later background swap after the spine is proven.**

> Minor evidence note for PK: the DECISION_PREP note references a 0.52 scrim; the actual `video_premium_market_v4.json` file uses **0.55** (`:43`) and the footage variant uses **0.60** (`video_short_stat_footage_v2_source.json`). Cited from the files. Scrim level is a visual-gate tuning parameter, not a scope item.

### D4 — YouTube proof depth (carried forward)

Recommend **render-and-inspect only (no live publish)** for the first proof. An actual publish to PP's live YouTube channel is outward-facing and gets a **separate explicit T3 gate** (or an unlisted/private upload). ✅ **PK ruling 2026-07-09: render-and-inspect only — no live publish AND no unlisted YouTube publish in this gate.** A YouTube publish of any kind is a separate future gate. (`docs/briefs/creatomate-video-tmr-sprint-phase2-packet.md:44`; YT publisher carry F-YT-FAILED-NO-RETRY `docs/00_action_list.md:25`.)

## The five sub-lanes (which are already authored-and-held)

1. **V1 — author + register the governed `vid_market_stat_reveal` provider template** (T3). If D1=(a): lock the template look (the premium `video_premium_market_v4.json` design, or its footage variant per D2) → save a Creatomate `provider_template_id` → register `c.creative_provider_template` (`output_type='video'`). **NOT yet done** — no governed video template exists (`…phase1-result.md:20-22`); historically manual Creatomate-editor + PK-paste (`…phase1-result.md:34`).
2. **V2 — behaviour-preserving governed `video-worker` branch** (T3). A PP-`video_short_stat`-only fork that calls the video-aware selector/resolver and renders via the governed template. **Legacy inline video path + all other formats/clients byte-untouched** and proven inert. ef-builder in an isolated worktree; full T3 chain. **NOT yet done.**
3. **V3 — video capability-contract + declarative variant** in `property-pulse.json` (motion/audio field classes the image contract lacks). **ALREADY AUTHORED + REVIEWED (creative-graph-auditor PASS + db-rls-auditor PASS), HELD** in worktree `video-tmr-phase2-dark @ 01af927` (asserted by orchestrator; `…premium-templates-v1-result.md:44`).
4. **V4 — evidence-loop hook**: a `video_short_stat` row in `c.client_creative_governance` (the Spine-Gen table already keys by client×format; `…phase1-result.md:37`). **ALREADY AUTHORED, HELD** (migration `20260708000000_seed_client_creative_governance_video_short_stat_v1.sql`, worktree above — asserted).
5. **V5 — format→template mapping**: `video_short_stat` → the new template. **AUTHORED-with-V3/V4, HELD** (declarative variant in the held `property-pulse.json`).

Dark-first phasing: land the held V3/V5 authoring + V4 governance row (each re-reviewed at its next gate per CCF-02 R3) → V1 register the provider template → V2 governed branch → first render proof. Authoring = T2; wiring + first render = T3.

## Voice / VO

**Keep the first proof SILENT — voice OUT.** Fleet-wide `c.client_avatar_profile` is empty → voice is *broken*, not merely deferred (`…phase1-result.md:58`). VO is **separately PROVEN** (v5.36, ElevenLabs PP host voice `YCxeyFA0G7yTk6Wuv2oq`, `…premium-templates-v1-result.md:28-30`) and is a **later follow lane**, not part of this proof (its own carries: governed audio bucket, designate `is_default_host`, `…premium-templates-v1-result.md:40-42`).

## Dependencies (named handoffs — NOT absorbed into this lane)

- **B-roll footage sourcing lane** (`_harness/pp_video_broll_v0/`): **blocking ONLY if PK elects footage-first (D2); non-blocking if the still-image path is chosen.** Current state (asserted): zero production-usable clips (1 harvested, C1 REJECTED — `footage_proof_v1_result.md:21`); additionally gated on (a) video-source licence allow-list ratification (Pexels Video recommended, NOT yet ratified — mirrors the ratified Pexels image source), (b) fetch mechanics, (c) a candidate-scoped harvester (`image-harvester` is PROVEN for STILL images only). **PK has instructed the B-roll sourcing lane must NOT run in this session** (see Forbidden actions).
- **Music lane** (parallel PK session; Music Library v0 schema is live-dark per `docs/00_sync_state.md` v5.38): **out of scope, deferred.** The first proof is silent; music is a separate audio-slot lane behind the `select_music()` RPC + dark video-worker integration.

## Allowed actions

- Read the held worktree authoring, the template source JSON, and registers to prepare the reconciled build plan (read-only).
- **Only after PK approves this brief at Gate 1 and pins the D1/D2/D4 decisions:** land the held V3/V5 declarative authoring + V4 governance row (each re-reviewed at its next gate; T2 authoring), then proceed to V1 template register + V2 governed branch + the single render proof under the full T3 chain with the PK gate(s) named below.
- Produce exactly ONE governed `video_short_stat` render and inspect the mp4 (layout, logo, StatValue/StatLabel/ContextLine/CtaText legibility over the chosen background + scrim, brand colours, 9:16 framing, duration).
- Report the result per the result template, then stop.

## Forbidden actions

- **No build / render / apply / deploy / publish of any kind until PK approves the next gate.** This brief is a proposal; Gate 1 is unchanged.
- **No B-roll / footage sourcing this session** — PK-instructed hold; the B-roll lane must not run (asserted PK instruction; lane state `_harness/pp_video_broll_v0/`).
- **No music work** — out of scope, deferred (Music Library v0 ships dark, `docs/00_sync_state.md` v5.38).
- **No live YouTube (or FB/IG/LinkedIn) publish** — a live YouTube publish requires a separate explicit T3 gate (D4); FB video publish is unsupported by design (`docs/00_action_list.md:337`,`:348`); IG Reels unproven; LinkedIn video image/text-only (`…phase1-result.md:45-47`).
- **Legacy `video-worker` inline video path + all other formats/clients stay byte-untouched** (behaviour-preserving; proven inert for everything but PP `video_short_stat`).
- **No voice/VO, no HeyGen/avatar** in this proof (HeyGen/B0/B1 DO NOT START, `docs/00_action_list.md:169`).
- **No schema change beyond the additive `c.client_creative_governance` governance row + the declarative-registry authoring already held** (each reviewed at its gate).
- **No new Creatomate template beyond the single `vid_market_stat_reveal`**; no other roster template (roster still paused — see Open questions).
- Re-pin the CE HEAD anchor before any build step (Phase 1 recorded a CLAUDE.md-vs-local drift, `…phase1-result.md:62`); never assume a stale anchor.

## Success criteria

- The held V3 capability-contract + V5 mapping + V4 governance row are landed and re-reviewed clean (creative-graph-auditor + db-rls-auditor), legacy + other formats/clients proven untouched.
- A governed `vid_market_stat_reveal` provider template (D1=(a)) is registered as `c.creative_provider_template` (`output_type='video'`) — or, if D1=(b), the inline builder is governed via the resolver + contract.
- A behaviour-preserving governed `video-worker` branch renders the governed `video_short_stat` for PP only; the legacy inline path and all other formats/clients are byte-identical (diff-proven).
- **Exactly ONE** governed `video_short_stat` render is produced and **visually inspected as good** — StatValue/StatLabel/ContextLine/CtaText all legible over the chosen background + scrim, logo crisp, brand colours correct, clean 9:16 (no bottom-UI collision), duration within target.
- All agent verdicts clean; external review pinned to the final diff hash; PK gate(s) satisfied at each production-touching (T3) step.

## Stop condition

When the criteria are met, report the result per `docs/briefs/_template_result.md`, then stop. **Stop → PK** if: D1 (fork), D2 (background source), or D4 (YouTube depth) is unresolved at Gate 1; PK elects footage-first and the B-roll lane cannot deliver a clean production clip (proof blocked on a lane held this session); the held authoring fails re-review; the governed branch would alter the legacy path or another format/client; any step would publish to a live channel without D4's separate approval; the single render fails a visual gate in a non-trivial way; or a pinned anchor/hash mismatches (Convention-2 STOP).

---

## Notes

This slice is the video analog of Option D's first governed image render. It deliberately picks the safest format (silent stat, no voice/avatar), reuses an already-built + PK-viewed premium template and already-authored-and-held dark V3/V4/V5, and — per the D2 recommendation — decouples the spine proof from the blocked B-roll lane by proving against a governed still first, treating footage as a later background-source swap on a proven spine. Approve the **first-proof format only**; the other P0 templates, footage swap, voice, and other platforms are later lanes.

## Open questions (PK) — ALL RESOLVED at Gate 1 (2026-07-09)

1. ~~**Roster sign-off**~~ → ✅ **RESOLVED: `vid_market_stat_reveal` LOCKED** as the first governed video proof.
2. ~~**D1**~~ → ✅ **RESOLVED: (a) provider-template-bound.**
3. ~~**D2**~~ → ✅ **RESOLVED: still-image Ken-Burns NOW** (17-pool, 0.55 scrim); footage is a later swap on a proven spine; B-roll stays a separate lane.
4. ~~**D4**~~ → ✅ **RESOLVED: render-and-inspect only** — no live publish, no unlisted YouTube publish this gate.

## Build-gate handoffs (recorded for the executor, not this gate)

- **db-rls-auditor** — live-verify at the build gate: `c.creative_provider_template` video-row absence (18/18 static_image), no `video_short_stat` governance row yet, and re-review the held V3/V4/V5 authoring diff (CCF-02 R3).
- **branch-warden** — verify git state of worktree `video-tmr-phase2-dark @ 01af927` (held/uncommitted authoring) and re-pin the CE HEAD anchor before any build step (Phase 1 recorded a CLAUDE.md-vs-local drift).
