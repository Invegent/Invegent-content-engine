# HeyGen Capability Architecture — Research Pack v1

**Created:** 2026-07-28 Sydney
**Status:** RESEARCH PACK — docs-only. **Implements nothing. No capability track is selected.**
**Class:** `docs_only` — 0 DB / 0 migration / 0 code / 0 RPC / 0 EF deploy / 0 HeyGen call / 0 render /
0 token / 0 production template / 0 Cinematic build.
**Directive (PK 2026-07-28):** do **not** ask PK to choose a track yet. Return a targeted official-source
research pack: capability-to-ICE matrix, three dialogue architectures, and a **maximum-three paid-test**
spike plan. Then PK decides.

> **Working hypothesis (to be validated by the spike, NOT a decision):**
> **HeyGen generates governed actors; HyperFrames composes the advanced finished scene.** Avatar IV/V
> renders Marcus and Alex from exact scripts + voices as transparent clips → HyperFrames places both in
> one governed room and composes captions/graphics/music/SFX into the finished dialogue MP4. Cinematic
> Avatar is a **complementary short cinematic-shot** capability, not a scripted-dialogue engine.
>
> Sources: HeyGen official developer docs, the HyperFrames docs, and the wired HyperFrames authoring
> contract, plus the current ICE code. Full list in §7. Extends
> `docs/briefs/render-provider-heygen-capability-audit.md` (2026-06-20); RI framing carried:
> **HeyGen = identity/actor-based · Creatomate = composition-based · `m.post_render_log` = telemetry spine.**

---

## 1. Current ICE usage map

Ground-truth audit of the live workers (this session). ICE uses a **narrow legacy avatar-render path**;
composition, v3 engines, transparent output, templates, translation, audio and agent capabilities are all
at zero.

| ICE function | HeyGen endpoint(s) called | Produces | Status |
|---|---|---|---|
| `heygen-worker` v2.6.0 (render) | `POST /v2/video/generate` (`character.type:'talking_photo'` · `voice.type:'text'` TTS · `background.type:'color'` · `720×1280`) | one avatar MP4, solid-colour bg | **LEGACY v2** |
| `heygen-worker` (poll) | `GET /v1/video_status.get` | render status | **LEGACY v1** (we poll; no webhooks) |
| `heygen-avatar-creator` / `heygen-avatar-poller` (asset provisioning) | `/v2/photo_avatar/*`, `upload.heygen.com/v1/asset`, reverse-engineered `api2.heygen.com/v2/avatar_group*` | provisions `c.brand_avatar` photo-avatar assets | **standing DO-NOT-REDEPLOY**; fragile undocumented surface |

Cut-based multi-character dialogue (cc-0084) is `video_inputs = scenes.map(...)` over that **same legacy
`/v2/video/generate`** — alternating full-frame single-avatar scenes stitched into one render. `credits_used`
is null (v2 render API returns no per-render cost). "We use ~1%" is directionally fair, not a measured metric;
the measured fact is the single-legacy-path reality above.

**Migration requirement:** HeyGen's official docs state the legacy v1/v2 endpoints remain supported **until
31 Oct 2026**, with new capability investment focused on **v3** (`/v3/videos`). *(PK-cited official
`developers.heygen.com/more-legacy-api`; the page did not render the date on fetch — confirm the exact page
at lane time.)* Modernising and migrating are therefore one project.

---

## 2. Official capability matrix → ICE use cases

Mapped only to ICE use cases. Every row is currently at **zero** usage.

| HeyGen capability | Official contract (verified) | ICE use case | Doc |
|---|---|---|---|
| **v3 Avatar video** (`POST /v3/videos`, `type:"avatar"`) | `engine` = `avatar_iii\|iv\|v` (default IV) · `script`+`voice_id` **XOR** `audio_url`/`audio_asset_id` (scripted lip-sync, exact words) · `background` color/image · `resolution` 4k/1080p/720p · `aspect_ratio` · `output_format` mp4/webm | **governed-actor foundation** — exact-script Marcus/Alex; the v3 replacement for our legacy render | `reference/create-video` |
| **Transparent output (WebM alpha)** | `output_format:"webm"` → alpha; auto background-removal; **rejects** a `background` in same request; needs a **matted** avatar; works IV/V/III, **not** Cinematic | actor clips with no baked bg → composite over governed backgrounds | `transparent-background-videos` |
| **Avatar V** (high-fidelity) | `engine:{type:"avatar_v"}`; cross-reference natural motion; Digital-Twin only; eligibility check | premium actor fidelity where a Digital Twin exists | `avatar-v` |
| **HyperFrames** (composition) | `POST /v3/hyperframes/renders`; inject avatar/music/SFX **URLs as composition variables** via `data-hf-src`; "combine a HeyGen avatar video with background music, sound effects, and Hyperframes graphics into one finished, produced video" | **compose the finished scene**: place actor clip(s) + governed bg + captions + music + SFX → one MP4 | `hyperframes-heygen`, authoring contract (connector) |
| **Studio Templates** | 6 variable types (text·image·video·audio·voice·character); **can only fill EDITOR-authored scenes, cannot create scenes via API** | reusable governed scene fill; possible native two-avatar route (**unproven** — see §3A) | `template-api` |
| **Cinematic Avatar** (`/v3/videos`, `type:"cinematic_avatar"`) | prompt (1–10k) · 1–3 looks in-frame · 4–15s · 720p/1080p · **generative Seedance, replaces script/voice** · no transparent output | hero/establishing/B-roll two-shot; transitions in/out of dialogue — **not** scripted dialogue | `cinematic-avatar` |
| **Video Translate** (speed/precision) + batch | 30+ languages, voice-clone + lip-sync; precision has editable proofread | NDIS/CALD multilingual variants from one governed video | `docs/video-translate` |
| **Audio: music / SFX / voice design·clone / Starfish TTS** | semantic music+SFX search; voice design/clone | audio layer we lack (ties to −58 LUFS + caption follow-ups) | `background-music`, `sound-effects`, `voices/*` |
| **Webhooks / Batch (≤100)** | event push; one batch id | replace polling; throughput | `webhook-events`, `batch-videos` |
| **AI Clipping / Motion Graphics / Data-to-Video** | scored highlights; prompt→animated titles; dataset→animated charts | net-new formats | respective docs |

---

## 3. Three dialogue architectures

For governed word-for-word two-character dialogue (Marcus + Alex). Cinematic Avatar is **excluded** here —
it is a separate experimental visual track (§4 Test 3), not a dialogue architecture, because its prompt
replaces script and voice.

### A. Native HeyGen Studio Template
One editor-authored scene holding **two `character` variables + two `voice`/`text` pairs**, filled per render.
- **For:** single API render; native scene/captions; reusable.
- **Against / unknown:** **UNPROVEN** that one scene supports two independently-speaking avatars (docs neither
  confirm nor deny); scenes must be **hand-authored in the HeyGen editor** (not API-creatable); least
  placement/determinism control. → needs the focused editor/API test (§4 Test 2 can double as this probe).

### B. Avatar IV/V transparent clips + HyperFrames composition  *(the working hypothesis)*
`POST /v3/videos type:"avatar"` renders Marcus and Alex separately (exact `script`+`voice_id`, chosen
`engine`, `output_format:"webm"` alpha) → a HyperFrames composition places both clips in one governed room
with bg/captions/music/SFX → `POST /v3/hyperframes/renders`.
- **For:** exact wording · exact voice · selected persona · governed background · deterministic placement ·
  captions/graphics/music/SFX · both actors **truly in one frame** · fully API-automatable.
- **Against / unknown:** **two avatar clips in one HyperFrames composition is not documented** (plausible —
  HyperFrames is HTML, two `<video data-hf-src>` elements — but must be proven, §4 Test 2); most moving parts
  (2 actor renders + 1 compose); cost = 2× actor-seconds + HyperFrames minutes.

### C. Current cut-based multi-scene  *(what we run today — cc-0084)*
Alternating full-frame single-avatar scenes over legacy `/v2/video/generate`, stitched to one MP4.
- **For:** **LIVE + PROVEN**, governed, cheapest, simplest; one render call.
- **Against:** never two people in one frame; cut-based only; on the **deprecating legacy v2** endpoint.

---

## 4. Controlled experiment plan — maximum three paid tests

Fenced spike: **no production change, no production template, no Cinematic production build.** All renders are
contained proofs with **zero external publish**. Reuse existing governed Marcus/Alex avatar identities (confirm
they are matting-capable before Test 1/2 — required for WebM).

| # | Test | Endpoint / method | Measures | Est. cost |
|---|---|---|---|---|
| **1** | One **transparent Marcus** clip, **exact script** | `POST /v3/videos` `type:"avatar"`, `engine:avatar_iv`, `script`+`voice_id`, `output_format:"webm"` | exact-script fidelity · matting/edge quality · WebM usability · per-sec cost | ~10s × $0.05–0.0667/sec ≈ **$0.50–0.67** |
| **2** | One **two-character HyperFrames composition**: Marcus + Alex transparent clips in **one governed setting** | Test-1 route ×2 → HyperFrames composition (`data-hf-src` avatar vars) → `POST /v3/hyperframes/renders` | **can two avatar clips co-exist in one composed scene** · placement determinism · finished-scene quality · captions/music/SFX layering | 2 clips (~$1–1.4) + HyperFrames ~1 min @ $0.10 ≈ **$1.10–1.50** |
| **3** | One **8–10s Cinematic Avatar two-shot** (participant + LAC) | `POST /v3/videos` `type:"cinematic_avatar"`, 1–3 looks, prompt | likeness consistency · visual usefulness for hero/B-roll — **NOT** dialogue accuracy | **$7.00 / video** (flat) |

**Total spike ≈ $9–10.** Optionally, the Studio-Template two-speaker probe (§3A) can piggyback Test 2's
evaluation without a 4th paid render (editor inspection + one template fill if a two-character scene can be
authored).

---

## 5. Decision matrix — RESULTS (cc-0085 spike, 2026-07-28)

Full evidence, method, and provenance: `docs/briefs/results/cc-0085-heygen-actor-compose-spike.md`.

| Axis | A. Studio Template | B. Avatar IV/V + HyperFrames | C. Cut-based (current) | — Cinematic (contrast) |
|---|---|---|---|---|
| Exact script control | ? not run this spike | ✅ exact (v3 script+voice_id confirmed) | ✅ exact (live/proven) | ❌ prompt replaces script |
| Voice control | ? not run | ✅ confirmed correct voice_id resolved | ✅ | ❌ |
| Avatar identity (governed persona) | ? not run | ✅ v3 look ID verified, likeness holds | ✅ | ✅ likeness continuity confirmed, both looks |
| Transparent actor clip (precondition for B) | n/a | ❌ **FAILED** — webm accepted, alpha uniformly opaque (5-frame rigorous test) | n/a (not used) | n/a (no output_format field) |
| Shared scene (both in one frame) | ? not run | ❌ **FAILED** — v2/v3 byte-identical MP4 despite different video URLs; neither avatar composited | ❌ (cut-based only) | ✅ both distinct, same shot, confirmed |
| Background control | ? not run | ⚠ scene rendered (bg/labels/captions worked); avatars did not | ⚠ solid colour only | ⚠ prompt-driven, plausible result |
| Determinism | ? not run | ⚠ HTML pipeline validated + rendered deterministically, but silently dropped unread variables — a worse failure mode than an error | ✅ | ❌ generative |
| Duration | scene-bound | unbounded (compose) — untested due to Test 2 failure | unbounded (cut), live-proven | 4–15s; 10s tested cleanly |
| Cost (spike-measured) | not run | ~$0.25–0.33/clip + ~$0.017/compose render (compose failed to add value) | cheapest, already live | **$7.00 flat**, confirmed |
| Latency | not run | actor clips ~75s each; compose ~fast-fail or ~few-min | 1 job, live | ~5 min (generative, slower than avatar render) |
| API automation | needs pre-authored template (unproven blocker) | ✅ full API path exists; **output not yet functional** | ✅ full, live | ✅ full, confirmed |
| Production governance | template = manual artifact | fits RI actor→compose split *in principle*; not yet demonstrated working | ✅ already governed | separate B-roll/establishing-shot lane |

**Spike verdict:** Architecture **B is unproven/failed** for the specific raw-HyperFrames-API approach
tested — both its own precondition (transparent clips) and its composition step failed under rigorous
testing, despite surface-level API success (200s, valid ids, a "completed" render). Root cause **not**
isolated (see result doc §6) — this is a **failed test of one implementation path, not proof the
architecture is impossible.** Architecture **A remains untested** (schema probe was not run this spike —
recorded honestly as not-run, not schema-infeasible). Architecture **C is the only currently-proven,
production-safe option.** Cinematic is confirmed as a strong, separate hero/B-roll capability, unrelated
to the dialogue-architecture question.

**No architecture is selected by this doc or the spike.** The next PK gate decides what follows —
options include: a narrower HyperFrames variable-injection isolation probe, a Studio-Template schema
run, resolving the webm/matting gap directly with HeyGen, or standing pat on Architecture C.

---

## 6. Fences carried into any follow-on lane

- Do not modify production · do not create a production template · do not start the Cinematic build.
- Spike renders are contained proofs, **zero external publish**; cc-0084 dialogue + monologue byte-stability
  is a regression fence for any render-path change.
- Asset-provisioning functions stay **DO-NOT-REDEPLOY**; matting requirement gates WebM on existing avatars.
- Cost opacity (v2 `credits_used` null) — v3 per-second pricing is now known, enabling estimated-cost telemetry
  (companion to the 2026-06-20 audit §5 slice).
- Any actual build is a future PK-gated lane at its stated tier; drift-gate/`config.toml`/`verify_jwt` gotchas apply.

---

## 7. Sources (official HeyGen + wired connector + ICE code only)

- v3 create-video — `developers.heygen.com/reference/create-video`
- Transparent-background WebM — `developers.heygen.com/transparent-background-videos`
- HyperFrames compose (generate-then-compose) — `developers.heygen.com/hyperframes-heygen`, `/hyperframes-overview`, + the connector's "Send to HyperFrames" authoring contract
- Studio Template API — `developers.heygen.com/template-api`
- Cinematic Avatar — `developers.heygen.com/cinematic-avatar`
- Avatar IV / V — `developers.heygen.com/avatar-iv`, `/avatar-v`
- Self-serve pricing — `developers.heygen.com/docs/pricing`
- Legacy migration (v1/v2 → v3, ~31 Oct 2026) — `developers.heygen.com/more-legacy-api` *(confirm exact page at lane time)*
- Capability index — `developers.heygen.com/llms.txt`
- Prior ICE audit — `docs/briefs/render-provider-heygen-capability-audit.md` (2026-06-20)
- Ground-truth code — `supabase/functions/heygen-worker/index.ts` v2.6.0 (this session)
</content>
