# Brief cc-0085 — HeyGen actor→compose fenced spike (≤3 experiments / ≤4 paid renders / hard cap $12)

**Created:** 2026-07-28 Sydney
**Author:** chat
**Executor:** Claude Code (orchestrator) — live HeyGen API + wired HyperFrames connector
**Status:** complete — executed 2026-07-28 (PK go + key conveyance received; Test 2 given one PK-authorized retry beyond the ≤4-render cap per the hard-boundary ruling). See result file.
**Result file:** `docs/briefs/results/cc-0085-heygen-actor-compose-spike.md` — **filed**
**Tier / lane:** **T2 · SIDE_PROVING** (capability proof; no product ship). Read-only secret USE → **Gate-1 secret rider** (below).
**Task ID:** cc-0085 — claimed, re-verified next-free at issue (no collision; prior highest = cc-0084).

> **Refines** the research-pack §4 test plan (`docs/video/heygen-capability-architecture-research-pack-v1.md`)
> with the Gate-1 amendments: official v3 identity/capability preflight · 3 experiments / ≤4 renders · variable-driven
> HyperFrames ZIP contract · decisive shared-scene dialogue acceptance · separate Marcus/Alex likeness scoring ·
> provider-side cleanup · hard $12 ceiling. **No architecture is selected by this spike.**

---

## Task

Run a fenced spike — **3 experiments, at most 4 billable renders** — to resolve the unknowns blocking a
governed two-character dialogue architecture choice. Generate contained proof renders, inspect them against
fixed decisive criteria, fill the research-pack §5 decision matrix, then stop. The working hypothesis under
test is *HeyGen generates governed actors (v3 transparent clips) → HyperFrames composes the finished scene*;
the spike is equally willing to return that it fails. **No architecture selection or production build follows automatically.**

## Source context

- `docs/video/heygen-capability-architecture-research-pack-v1.md` — architectures (§3), test plan (§4), matrix (§5), sources (§7).
- `docs/briefs/render-provider-heygen-capability-audit.md` (2026-06-20) — two HeyGen surfaces; asset-provisioning = DO-NOT-REDEPLOY.
- `supabase/functions/heygen-worker/index.ts` v2.6.0 — legacy render; `lookupAvatar` maps `c.brand_avatar`(`heygen_avatar_id`,`heygen_voice_id`); env `ICE_HEYGEN_API_KEY`.
- `docs/briefs/results/cc-0084-multi-character-dialogue.md` — the synthetic LAC↔participant dialogue to reuse (trimmed); byte-stability regression fence.
- Official contracts (verified): `developers.heygen.com/reference/create-video` (v3 `type:"avatar"`; engine `avatar_iii|iv|v`; `script`+`voice_id` XOR `audio_url`; `output_format` mp4/webm; returns a **subtitle sidecar**) · `/transparent-background-videos` (`output_format:"webm"` = alpha; needs a **matted** avatar) · `/generate-avatar-video` (look metadata carries engine/type/ownership; Avatar IV default, Avatar V via look metadata) · `/hyperframes` + `/hyperframes-heygen` (**self-contained HTML/CSS/JS project ZIP → upload as asset → `POST /v3/hyperframes/renders` with declared composition variables**; `Idempotency-Key` supported) · `/cinematic-avatar` (`type:"cinematic_avatar"`; 1–3 **look IDs**; 4–15s; generative; prompt replaces script/voice) · `/docs/pricing`.
- Wired HyperFrames connector (MCP `39c5b873…`): may **author** the composition project; the **raw render API is the evidence path**.

## Gate-1 secret rider (CCF-02 R2)

- **Which secret:** `ICE_HEYGEN_API_KEY` (HeyGen `X-Api-Key`). Read-only USE for authenticated GET/POST; **no posture change** (not rotated, not printed, not written to any file/artifact/register).
- **Conveyance:** PK conveys the key to the executor out-of-band; **never in the transcript, result doc, provenance files, or committed artifacts.** Provenance records request/response shapes and ids, **never the key**.

## Scope

**In scope:**
- **Test 0 — official v3 identity/capability preflight (read-only, FREE).** DB read maps Marcus + Alex to their governed identities ONLY. Then **HeyGen is the capability authority**: via official GET endpoints confirm, per actor, valid **v3 look IDs** (Cinematic requires look IDs), **voice IDs**, **avatar type**, **supported engines** (Avatar IV default / Avatar V via look metadata), and **ownership/status**. Do **not** assume the legacy `heygen_avatar_id` is the correct v3 look ID. Record each actor's **avatar type** (drives the per-second cost estimate). **Matting:** if HeyGen metadata exposes an explicit matting/webm flag, record it; **if it does not, do NOT mark Test 0 pass/fail from the DB or infer it — Test 1's live WebM request is the definitive matting-compatibility test.**
- **Test 1 — Marcus transparent actor clip (paid render #1).** `POST /v3/videos` `type:"avatar"`, `engine:{type:"avatar_iv"}`, exact `script` + verified `voice_id`, `output_format:"webm"`, **1080p / 30fps / 9:16**, line ~4–6s. Fidelity evidence (payload alone is insufficient): record the **exact input script**, the **returned subtitle sidecar**, a **manual listening verdict** (omitted / substituted / unintelligible words), **voice correctness**, and **lip-sync quality**; plus matting/edge quality and measured per-second cost.
- **Test 2 — two-character shared-scene composition (paid renders #2 Alex clip + #3 HyperFrames).** Render Alex the same way (1080p/30/9:16, 4–6s). Then build a **self-contained HyperFrames project ZIP** exposing declared composition variables — e.g. `marcus_video_url`, `alex_video_url`, `background`, `captions`, `audio` — bound to **two `<video>` elements**; upload as an asset and submit `POST /v3/hyperframes/renders`, using an **`Idempotency-Key`** on both the asset upload and the render submit to avoid duplicate charges. The connector may author the project; the raw render API is the evidence path. **Decisive acceptance — Test 2 PASSES only if the finished 9:16 MP4 shows:** both characters visible in the **same governed setting**; the **cc-0084 synthetic LAC↔participant dialogue** (trimmed to 4–6s lines); **sequential speech, no overlapping voices**; the **active speaker visibly lip-synced**; the **listening character visually stable (not disappearing)**; **fixed left/right placement**; **captions + background applied**; **no default-host substitution**. Anything less is a recorded PARTIAL/FAIL, not a pass.
- **Studio-Template two-speaker probe (unpaid, piggyback).** Editor/API **schema inspection only** — whether one scene can expose two avatar + two voice/text variables. Finding vocabulary is exactly: **`schema-feasible` / `schema-infeasible` / `still-requires-paid-render`.** It may not be reported as "works" — schema feasibility ≠ proof that two independently-speaking avatars render correctly in one scene.
- **Test 3 — Cinematic two-shot (paid render #4).** `POST /v3/videos` `type:"cinematic_avatar"`, passing the **verified Marcus + Alex look IDs**, participant+LAC establishing prompt, 8–10s, 1080p, 9:16. Score: **Marcus likeness (separately)**, **Alex likeness (separately)**, **both remain distinct**, **both in the same shot**, **prompt adherence**, **setting/scale continuity**, **usefulness as an establishing/hero/B-roll shot**. **Do not test scripted dialogue** (its prompt replaces script/voice).
- Fill research-pack §5 matrix from observed results; write the result doc.

**Out of scope:** any production change; a **production** Studio template; the Cinematic **build**; any external publish; any `heygen-worker`/ai-worker code change or deploy; any DB write / selection / marker / `post_render_log` / `brand_avatar` mutation; Video Translate / audio / webhooks / batch tracks.

## Allowed actions

- Read-only DB lookups for the Marcus/Alex governed identity mapping.
- Authenticated HeyGen **GET** preflight (Test 0) and **paid POST renders (Tests 1–3, ≤4 renders)** on `ICE_HEYGEN_API_KEY`, within the cost ceiling, with `Idempotency-Key` on Test-2 asset/render calls.
- Use the wired HyperFrames connector to **author** the Test-2 project; use the raw render API as the evidence path.
- Write proof artifacts + provenance (request/response shapes, ids, byte sha256, duration, avatar type, reported/derived cost — **never the API key**) under `_harness/cc0085_heygen_spike/**`.
- Author the result doc + fill §5.

## Forbidden actions

- **No external publish** of any render; all renders are contained proofs.
- **No production change / deploy / migration / DB write** (selection, marker, `post_render_log`, `brand_avatar`, any `m.*`/`c.*` mutation).
- **No production Studio template**; the probe is schema inspection only.
- **No Cinematic production build**; Test 3 is one evaluation render.
- **Do not touch** `heygen-avatar-creator` / `heygen-avatar-poller` (DO-NOT-REDEPLOY) or the reverse-engineered `api2.heygen.com` surface.
- **Do not exceed US$12.** Do not fire a render that would breach the cap → STOP to PK.
- **No real participant/client data** — use only the fully synthetic NDIS dialogue (cc-0084 synthetic set or a fresh synthetic equivalent). Marcus/Alex are the only avatar identities used; never a real client's live brand for a proof.
- Never write the API key to any file, artifact, register, or the transcript.
- Do not treat any result as an architecture decision — that is a separate PK gate.

## Success criteria

- **Test 0:** confirmed v3 look IDs + voice IDs + avatar type + supported engines + ownership/status for both actors, from official HeyGen GETs (DB used only for the identity mapping). Matting recorded if HeyGen exposes it; otherwise explicitly deferred to Test 1 (not guessed from DB).
- **Test 1:** downloadable WebM + the five-part fidelity record (exact script · subtitle sidecar · manual listening verdict · voice correctness · lip-sync quality) + matting/edge judgment + measured per-second cost at the recorded avatar type.
- **Test 2:** a definitive verdict against the full decisive-acceptance checklist above (PASS only if every item holds), the finished 9:16 MP4, placement-determinism + captions/bg/audio observations, and the Studio-Template finding in the `schema-feasible / schema-infeasible / still-requires-paid-render` vocabulary.
- **Test 3:** the Cinematic two-shot with separate Marcus + Alex likeness scores, distinctness, same-shot, prompt-adherence, continuity, and hero/B-roll usefulness — explicitly not scored on dialogue.
- Research-pack §5 `?`/`⚠` cells resolved (or honestly BLOCKED with reason).
- **≤4 billable renders**, total spend recorded **≤ $12**, zero `post_publish`, zero production artifacts; provider artifacts cleaned up per below.

## Stop condition

Report per `docs/briefs/_template_result.md`, fill §5, then STOP. No architecture selection or build follows.
Immediate STOP → surface to PK if: a render would breach $12 · the connector/API would force an external publish
to render · any step would write production · Test 0 cannot verify a valid v3 look ID for an actor.

---

## Notes

- **Cost ceiling / Convention-2 sequence:** hard cap **US$12** (est. ≈$9–10: Cinematic $7 flat + Marcus+Alex actor
  clips at the recorded per-second avatar-type rate + ~1–2 HyperFrames min @ $0.10/min 1080p30). PK approves the
  ceiling + ordered Tests 0→1→2→3 + STOP conditions once at Gate 1; the executor does not re-gate each render but
  STOPs on any breach. **Record each actor's avatar type before estimating its final clip cost.**
- **Provider-artifact cleanup:** after downloading + hashing each output — retain request/response **metadata**
  locally under the harness dir; **delete the temporary HeyGen videos and HyperFrames renders** from the provider,
  unless the result doc explicitly records a temporary review-retention reason; **never** place any output into ICE
  storage, publishing queues, or client channels.
- **HyperFrames control caveat:** the connector `compose` owns layout internally and may not expose the exact
  two-avatar variable binding — prefer the raw ZIP→asset→`/v3/hyperframes/renders` variable-driven path for the
  evidence; use the connector as an authoring aid and name which route produced each result.
- **Consistency:** 1080p / 30fps / 9:16 for both actor clips and the composition so evidence is comparable. Actor lines 4–6s.
- **Task-ID claim:** cut the result-doc claim stub and re-verify next-free before finalising; renumber if a lower timestamp claims cc-0085.
- The hypothesis is on trial; no architecture is pre-selected.
</content>
