# Gate-1 Packet — Creatomate Governed Video Production (S3)

**Created:** 2026-07-24 Sydney
**Author:** S3 (ICE orchestrator session)
**Executor:** PK-gated; Claude Code executes only the allowed actions below
**Status:** draft — **HELD**, not issued
**Base:** CE `ad4a6a9` (origin/main == HEAD, parity 0/0, verified by `git fetch --prune` + `git ls-remote` at authoring time)
**Lane class:** PRODUCT_PROOF
**Tier:** **T2** for Slice 1 (governed smoke) with a mandatory secret-handling rider; **T3** for every slice beyond it
**Task ID:** NOT ALLOCATED — the control tower allocates `cc-` IDs centrally. No register version is claimed by this document.
**Result file:** `docs/briefs/results/{cc-ID}-creatomate-governed-video-production.md` (created on completion)

> **HOLD STATE.** This packet is authored in preparation only. Its window does not open until **cc-0079 Slice 2 (S1) reaches its next PK gate.** As of 2026-07-24 that gate has **HALTED at `db-rls-auditor` and is being re-cut** — the window is further away, not closer. Nothing here is approved. Authoring this file is RECORDING a proposal, never approving it.

---

## 0. Headline finding — the premise needs correcting before the lane opens

PK's framing was *"ICE is currently producing static images; the objective is to make the Creatomate video path operational."*

The first half is not what the live system shows. **The Creatomate video path is already producing production renders — but almost all of that output bypasses the governed spine.** The accurate statement of the problem is:

> Governed Creatomate video is a **single point**: one provider template, one format, one aspect ratio, one enabled client. Everything else that renders video through Creatomate today runs on the **legacy ungoverned path** — code-composed specs with no `select_template`, no `resolve_slot_assets`, no governed logo, no governed background.

Evidence, live, at authoring time:

| Fact | Value | Source |
|---|---|---|
| PP slots allocated to a video format, last 14d | **18** (kinetic 10 · stat_voice 4 · kinetic_voice 2 · **stat 2**) | `ice_ro.slot_status` |
| …of those, allocated to the ONE governed format (`video_short_stat`) | **2 of 18 (11%)** | same |
| Creatomate video renders, last 30d, production (non-smoke) | kinetic 6 · stat_voice 3 · kinetic_voice 3 · **stat 1 succeeded + 1 failed** | `ice_ro.render_status` |
| Governed-path production renders, **ever** | **2** — one success (2026-07-10), one failure (2026-07-16), both on draft `1f5633de` | `m.post_render_log` |
| Video templates in `c.creative_provider_template` | 8 | `ice_ro.template_registry_status` |
| …that the selector can even see (have a `creative_template_variant_candidate` row) | **1 of 8** — `c11bb8ab` only | `c.creative_template_variant_candidate` |
| Clients with ANY video governance row | **1** — property-pulse / `video_short_stat` / `enabled=true` (2026-07-10) | `c.client_creative_governance` |

So the lane is not "switch video on". It is **"close the gap between one proven governed point and the video volume the system is already producing ungoverned."**

### 0.1 Two distinct problems — and exactly which one the smoke proves

The finding above splits into two problems that are easy to conflate and must not be:

- **P1 — Render correctness.** Given a governed selection, does the path produce a correct, on-brand, **audible** video?
- **P2 — Selection breadth.** Can the governed spine *see* more than one template, so that video output stops falling to legacy?

**The Slice 1 smoke proves a bounded part of P1. It proves nothing whatsoever about P2 — and by construction it never can.**

- **What it proves (P1, bounded):** that `select_template` → `resolve_slot_assets` → `buildGovernedVideoStatPlan` → Creatomate → storage → evidence works end to end for the one governed template, resolving the smoked client's **own** logo, background, voice, and spoken brand name, and producing an artifact whose audio is **measured**, not assumed. Run for two clients, it proves the spine is genuinely generic rather than PP-shaped.
- **What it does NOT prove about P1:** production behaviour. The smoke bypasses draft selection, the AI copy layer, and the governance gate, and it feeds hand-supplied fields. G5 — the `max_chars` hard-gate that killed the only recent production draft — is a *production-input* failure the smoke cannot surface at all unless deliberately probed, which is exactly why §3.4 exists. A green smoke is **not** evidence that production video works.
- **What it does NOT prove about P2, structurally:** the smoke's parity guard `assertExpectedVideoProviderTemplate` **asserts** the single template `c11bb8ab` and throws on anything else (`index.ts:1202-1203`). The harness is deliberately built to pin the one known-good surface, so it can never detect, exercise, or narrow the breadth gap. **Reading a green smoke as progress on P2 would be a category error.** P2 is closed only by G1 work — running the inventory → candidacy → status → assignment → visual-proof chain for video templates — every step of which is a PK visual gate (H5), not something any render proves.

**Stated plainly for the record: this lane's Slice 1 is a P1 confidence step. The dominant problem is P2, and Slice 1 does not touch it.**

---

## 1. Task

Define and prove the **governed** Creatomate video production path as an operational capability, starting from a supervised smoke render that PK inspects — with audio explicitly in the PASS criteria — and with no publication, no enablement, and no rotation-pool entry until PK approves each step separately.

---

## 2. What "operational" means concretely, and what is missing

### 2.1 Definition adopted for this lane

A Creatomate video format is **operational** for a client when all six hold, each independently checkable:

1. **Selectable** — `public.select_template(<slug>, <platform>, <format>, …)` returns `status='ok'` with a `selected` template for that client and format.
2. **Governed-bound** — the render plan takes its provider template, logo, and (where the variant is not baked-background) background from `resolve_slot_assets`, not from code constants.
3. **Enabled** — a `c.client_creative_governance` row exists for `(client_id, format)` with `enabled=true`, so `processDraft` takes the governed fork rather than the legacy one.
4. **Audible** — the rendered artifact carries the intended voiceover, and the music-bed state in the artifact matches the evidence row's `audio.music_bed`.
5. **Evidenced** — one `m.post_render_log` row per render carrying resolver-driven identity, and that row attributes the render to a client.
6. **Survivable** — real AI-authored copy passes the field hard-gates, or fails in a way that is recoverable rather than a permanent dead draft.

### 2.2 Already live — do NOT rebuild (each re-verified against `ad4a6a9` and the live DB)

| Component | State | Evidence |
|---|---|---|
| Governed video branch in production | LIVE — `index.ts:1092`, gate is runtime governance (`fmt === B1_VIDEO_GOVERNED_FORMAT && isVideoGovernanceEnabled(...)`), fail-closed | `supabase/functions/video-worker/index.ts:1092-1094` |
| Spine-driven plan builder | LIVE — `buildGovernedVideoStatPlan` consumes `select_template`; `Logo.source` REQUIRED fail-loud; `Background.source` OPTIONAL (v3.10.0 Option B) | `b1_video_stat.ts:293-333` |
| Combo audio | LIVE — `VoiceAudio.source` required fail-loud; `MusicBed.source` **always a key**, `''` = deliberately silent bed (N1); `MusicBed.volume` never set (N3) | `b1_video_stat.ts:310-333` |
| Supervised smoke entrypoint | LIVE — `mode:'governed_video_stat_smoke'`, client-parameterisable (`client_slug` · `client_id` · `fields` · `seed`), does not read a draft, does not require `enabled=true`, does not flip it, does not publish | `index.ts:1154-1221` |
| Governance gate | LIVE, fail-closed to `false` on any error/missing row | `index.ts:912-931` |
| Deploy state | **video-worker deployed 3.11.0 == repo 3.11.0, entrypoint hash identical, drift class A-LE clean** | `ice_ro.deploy_drift_status`, checked 2026-07-23 17:00Z |
| Governed template | `c11bb8ab-18bd-45ff-aedd-0a59cb3773ab` (`video_stat_reveal_9x16_v2`), generic scope, `visually_approved`, 9:16, 12s | `ice_ro.template_registry_status` |
| Assignments on `c11bb8ab` | property-pulse `visually_approved` (2 passed visual proofs) · ndis-yarns `visually_approved` (1 passed visual proof) | `c.creative_template_client_assignment` + `c.creative_template_proof_event` |

**Correction to the seed packet's carried claim:** it stated *"NDIS production video is OFF"* — true, but the reason matters. NDIS **already holds a visually_approved assignment with a passed visual proof on the governed template.** What it lacks is a `c.client_creative_governance` row for `(ndis-yarns, video_short_stat)`. NDIS video is one governed **data** row away from live, not a build.

### 2.3 The gaps — what is actually missing

**G1 — Seven of eight video templates are invisible to the selector.**
`creative_provider_template` holds 8 video rows; only `c11bb8ab` has a `creative_template_variant_candidate` row. The six generic video templates (Multi-Stat Tips 1x1/9x16, Quote Statement 1x1/9x16, Stat Reveal 1x1/9x16) sit at status `classified` with **zero** candidate rows; the PP-scoped `901a30ce` sits at `governance_reviewed` with zero. `select_template` iterates `creative_template_variant_candidate`, so a template with no candidate row is not merely rejected — it is never considered. The inventory → candidacy → status → assignment → visual-proof chain has **never been run for video**.

**G2 — One governed video format exists.** `B1_VIDEO_GOVERNED_FORMAT` is `'video_short_stat'`. `video_short_kinetic`, `video_short_kinetic_voice`, and `video_short_stat_voice` have no governed builder and no variant candidacy. They are 16 of PP's last 18 video slots.

**G3 — `video_short_stat_voice` is a naming trap.** It reads as a governed variant; it is not. `index.ts:1086` excludes it explicitly, and `index.ts:1097` routes it to the legacy `isStat` branch. A reader — or a scheduler — that treats `video_short_stat_voice` as governed is wrong.

**G4a — The standing Creatomate audio gotcha is INVERTED on this path — do not "fix" it.**
The general ICE rule is *`source:""` renders SILENT; omit the key entirely to get the template's baked default.* The governed video plan **relies on that as a feature**: `MusicBed.source` is **always** sent as a key, and `''` is the deliberate bind for "no governed bed" under policy N1 (`b1_video_stat.ts:310-333`). `Background.source`, by contrast, is **omitted** when absent precisely so a baked-bg template is left untouched — sending `''` there would blank the element. So on this path: **`MusicBed` always-key-sometimes-empty is correct; `Background` omit-when-absent is correct.** A future reader applying the general gotcha uniformly would break one or the other. The consequence for this lane is that a **silent music bed is a legitimate outcome**, which is why criterion 5 checks *agreement* between the artifact and the evidence rather than merely checking that sound exists.

**G4 — No machine audio verification exists anywhere in the video path.** `qa.ts:17` states it outright: *audio_present, loudness_lufs, true file duration, true dimensions* are **DEFERRED, not computed, by design — no probing/re-fetch**. `audio_expected` / `voice_expected` / `tts_provider` are **declared intent**, not measurement. Live proof that this matters: the smoke render of **2026-07-09 recorded `status='succeeded'` with `tts_provider: null, audio_expected: false, voice_expected: false`** — a silent video logged as a success. This is the exact declared-control-never-read failure mode, and it is the mechanism behind the earlier silent-video PK FAIL.

**G5 — Governed production has a 1-in-2 real-draft success rate, and the failure is permanent.** The only two governed production attempts were both on draft `1f5633de`: success 2026-07-10, then failure 2026-07-16 with
`b1_video: cta_text length 133 exceeds max_chars=90 (no truncation / no AI rewrite in v1)`, `failure_stage: pre_render`.
The field hard-gate is correct and deliberate, but the AI layer is not constrained to the video contract's `max_chars`, and there is no truncation or repair. A draft that trips it is a dead draft.

**G6 — Smoke evidence cannot attribute a render to a client.** The smoke calls `renderUploadAndLog` with `postDraftId: null, clientId: null` (`index.ts:1208`) and a **fixed** storage path `_smoke/governed_video_stat_v1.mp4` (+ `_smoke/governed_video_stat_v1_voice.mp3`). Consequence: a second client's smoke **silently overwrites** the first client's artifact, and the evidence row records no client. A multi-client governed video proof cannot be evidenced from the log alone.

**G7 — Smoke identity is caller-asserted and unverified (the video-lane false-green hazard).** The smoke resolves along **two independent identity axes**:
- `client_slug` → `select_template` → template + `Logo.source` + `Background.source`
- `client_id` → `getBrand` (brand name in the narration) + `resolveGovernedVoice` (voice)

The code comment at `index.ts:1170-1174` concedes the worker **cannot** check they agree (`service_role` lacks `SELECT` on `c.client`). A supervisor passing a mismatched pair gets a **chimera render** — one brand's template and logo, another brand's voice and spoken name — that renders successfully and logs `succeeded`. See §3.2 for why the proposed design cannot produce this.

**G8 — `post-videos` is a PUBLIC bucket.** Smoke artifacts land at a world-readable URL. This is not publication (no social post, no queue row), but it is not private either, and the packet states it rather than implying secrecy.

---

## 3. The governed smoke-render proof design (Slice 1)

### 3.1 Shape

**Zero code change. Zero deploy. Zero DB mutation authored by this lane.** Slice 1 invokes the **already-deployed** `governed_video_stat_smoke` entrypoint on `video-worker` v3.11.0 and inspects what comes out.

| Parameter | Value | Why |
|---|---|---|
| Client A | `property-pulse` / `4036a6b5-b4a3-406e-998d-c2fe14a8bbdd` | The only governance-enabled video client; establishes the reference artifact |
| Client B | `ndis-yarns` / `fb98a472-ae4d-432d-8738-2273231c1ef4` | Has a `visually_approved` assignment + passed visual proof on `c11bb8ab`, but **no governance row** — proving it here proves the generic spine without enabling anything |
| Template | `c11bb8ab-18bd-45ff-aedd-0a59cb3773ab` — resolved by the selector, **asserted** by the smoke's parity guard (`index.ts:1202`) | Drift → the smoke refuses to render rather than prove against a different surface |
| Format | `video_short_stat` (the only governed video format) | §2.3 G2 |
| Fields | Explicit per-run `fields` overrides, **each ≤ its contract `max_chars`** | Exercises the hard-gate rather than tripping it (G5 is proven separately, §3.4) |
| Seed | Distinct per run, recorded | Makes the selection reproducible |
| Runs | 2 (A, then B), **serialised** | The fixed storage path (G6) means they overwrite; artifacts must be captured between runs |

### 3.2 Why this smoke **cannot** reproduce the `governed_image_quote_smoke` false green

The image smoke's defect is that client and template are **not body-parameterisable** — `B1_GOVERNED_CLIENT_SLUG` is the literal `'property-pulse'` and it asserts PP's `48cba556` template. Aimed at another brand it renders PP's card, passes its own assertion, and returns green.

This design cannot do that, for three structural reasons plus one procedural guard:

1. **Client identity is an input, not a constant.** `client_slug` and `client_id` are read from the request body (`index.ts:1168, 1175`) and flow into `select_template`, `resolve_slot_assets`, `getBrand`, and `resolveGovernedVoice`. There is no client literal in the render path to fall back to. (The `client_id` default exists only for an omitted field; **both are supplied explicitly on every run** — see the STOP in §6.)
2. **Template drift fails closed, loudly.** `assertExpectedVideoProviderTemplate` (`index.ts:1203`) throws if the selector returns anything other than `c11bb8ab`. A wrong-brand resolution cannot render at all, let alone render green. This is the inverse of the image smoke, which asserts the template it hardcoded and therefore always agrees with itself.
3. **The evidence is resolver-derived, not asserted.** `plan.templateSpec` identity comes from the selector response, so the logged row describes what was actually resolved.

**The residual hazard is G7, and it is procedural, not structural.** A mismatched `client_slug` / `client_id` pair produces a chimera the worker cannot detect. **Mitigation, binding on this lane:** the two identifiers for each run are taken from a **single** `c.client` lookup performed and recorded immediately before the run, and the pair is written into the result doc verbatim. A run whose pair was not taken from that lookup is void. This is a named limitation of the harness, not a claim that the harness is safe.

### 3.3 What is inspected — and the PASS/FAIL criteria

Because §2.3 G4 establishes that **the system performs no audio measurement of any kind**, PASS cannot rest on `status='succeeded'` or on `audio_expected`. Both were true for renders PK has already rejected.

Each run is inspected on **eight** criteria. **All eight must PASS. Any FAIL fails the run.**

| # | Criterion | PASS | FAIL |
|---|---|---|---|
| 1 | Response | `ok:true`, `provider_template_id == c11bb8ab…`, `version == video-worker-v3.11.0`, `storage_url` present | Any mismatch; any `ok:false`; any 5xx |
| 2 | Evidence row | Exactly **one** new `m.post_render_log` row, `ice_format_key='video_short_stat'`, `status='succeeded'`, `render_spec.label == B1_VIDEO_PRODUCTION_LABEL`, `render_spec.template` identity fields match the selector response | Zero or >1 row; identity mismatch |
| 3 | **Audio — voice present (measured)** | The downloaded MP4 is probed (`ffprobe`): **an audio stream exists**, its duration is within 1s of the video duration, and its **mean volume is above −45 dBFS** | No audio stream · silent track · mean volume ≤ −45 dBFS |
| 4 | **Audio — voice intelligible and correct (PK, by ear)** | PK hears the narration; it is the smoked client's brand name and the supplied sample copy; not clipped, not truncated mid-word | Wrong brand spoken · unintelligible · truncated |
| 5 | **Audio — music bed matches evidence** | The evidence row's `audio.music_bed` boolean agrees with what is audible: `true` → a bed is present under the voice; `false` → no bed, and the silence is the deliberate N1 `''` bind, recorded as such | Evidence says bed, none audible (or the reverse) |
| 6 | **Audio — level** | Measured integrated loudness recorded and **stated in the result doc**. Reference: the v3.1.1 fix targeted the ~40 dB attenuation defect (source ≈ −18.1 LUFS → final ≈ −58.2 LUFS). A render measuring near −58 LUFS **FAILS** as a regression | ≈ −58 LUFS or otherwise inaudible at normal playback |
| 7 | **Visual — governed identity** | The smoked client's **own** logo is rendered; background is the baked template background (or the resolved `Background.source` if the variant supplies one) and is recorded as which; the four text slots carry the supplied sample copy; 1080×1920 | Another client's logo · missing logo · wrong copy · wrong dimensions |
| 8 | **Artifact captured before overwrite** | The MP4 is downloaded and its **sha256 recorded** before the next run starts (G6) | Run B started before run A's artifact was captured |

**Criterion 3 is the criterion the silent-video precedent demands, and it is new.** It is performed by the operator on the downloaded artifact — it is **not** a claim that the worker gained an audio check. The worker still measures nothing (G4 stands). Adding a machine audio gate to the worker is a **separate, later slice** (§7, H4).

### 3.4 The G5 hard-gate probe (same slice, no extra risk)

One additional smoke run with `cta_text` deliberately set **over** 90 characters. **Expected: `ok:false`, HTTP 500, `error` containing `exceeds max_chars=90`, no render, no storage write, no Creatomate credit spent.** This proves the hard-gate fails closed pre-render and pins the exact behaviour behind G5. A run that instead renders, truncates, or silently rewrites is a **STOP** — it would mean the gate is not enforced where it is claimed to be.

---

## 4. Scope

**In scope**
- Invoking the already-deployed `governed_video_stat_smoke` entrypoint for PP and NDIS Yarns, serialised, with the §3.3 inspection.
- The §3.4 hard-gate probe.
- Downloading, hashing, and archiving each artifact under this session's `_harness/` sub-root.
- Recording findings and the gap analysis in the result doc.

**Out of scope** (each needs its own Gate 1)
- Any `c.client_creative_governance` change, including the one-row NDIS video enable.
- Any variant-candidacy, assignment, template-status, or proof-event write — including admitting the six generic video templates (G1).
- Any new governed video format or builder (G2/G3).
- Any AI-layer change to constrain video copy to contract `max_chars` (G5).
- Any code change to parameterise the smoke storage path or attribute the smoke log row (G6).
- Any worker-side audio gate (G4/H4).
- Any publication, queue row, rotation-pool entry, or `video_status` mutation.
- HeyGen / avatar / persona selection — **S4's lane** (`video_short_avatar` is `heygen`, not Creatomate; it is the highest-volume video format at 15 renders/30d for NDIS and is *not* this lane's subject).
- The Creatomate key rotation carry.

---

## 5. Allowed / Forbidden

**Allowed**
- Read-only DB reads: `ice_ro.*` via `python scripts/db-read.py`; `c.*` / `m.*` SELECTs via `execute_sql` where no view covers them.
- Read-only git and repo reads.
- Exactly **four** POSTs to the deployed `video-worker` `governed_video_stat_smoke` entrypoint (PP, NDIS, hard-gate probe, and at most **one** re-run of a single failed run after PK says so).
- Downloading the produced artifacts and computing sha256.
- Writing files **only** under this session's `_harness/` sub-root and the result doc.

**Forbidden**
- Any production render intended for publication. Any publish, queue insert, or `post_draft.video_status` write.
- Any enablement of any client's video governance flag — including NDIS, and including "just to test".
- Any DB mutation of any kind. *(The one `m.post_render_log` row the worker writes per smoke is the worker's own logged evidence, not a mutation authored by this lane. It is expected, it is counted in criterion 2, and it is disclosed here rather than glossed.)*
- Any deploy. `supabase functions deploy` without `--no-verify-jwt` flips `verify_jwt` to true and breaks `x-series-key`-only callers (401→502). The sanctioned path is `scripts/safe-deploy.sh <ef> --allow-warn` and **it is PK's to run.**
- Any code edit to `video-worker` or any other EF.
- Allocating a `cc-` ID or claiming a register version.
- Repairing anything discovered in passing. A defect found mid-lane is reported and left alone.
- Opening the window before S1's gate.

---

## 6. Gates and STOP conditions

**Gate 1** — PK approves this packet. Tier confirmed. Window confirmed open (S1 gate reached).
**Gate 2** — PK inspects the artifacts and rules PASS/FAIL per §3.3. **PK's audio-and-visual verdict is the only deciding act.** No agent, log field, or `status='succeeded'` substitutes for it.

**Secret-handling rider (CCF-02 R2 — mandatory at T2 for read-only secret USE).**
Secret: `PUBLISHER_API_KEY`, conveyed as the `x-video-worker-key` header. **USE only, never change.** Conveyed by PK at execution time by a route PK chooses; **never echoed into a transcript, a result doc, a harness file, or a shell history entry.** No other secret is touched. `CREATOMATE_API_KEY` and `ELEVENLABS_API_KEY` are read **by the deployed function from its own environment** and are never handled by this lane.

**STOP conditions — any one voids the remainder of the sequence; resumption needs a fresh PK gate.**

1. Base moved: HEAD ≠ `ad4a6a9` or origin/main ≠ HEAD at execution time, unless independently verified benign and unrelated.
2. `video-worker` deployed version ≠ `3.11.0`, or drift class ≠ A-LE clean, at execution time.
3. `assertExpectedVideoProviderTemplate` throws (selector no longer resolves `c11bb8ab`) — the governed surface moved; do not prove against a different one.
4. A run's `client_slug` / `client_id` pair was not taken from the single recorded `c.client` lookup (§3.2 G7 mitigation).
5. More than one `m.post_render_log` row appears for a run, or a row appears with a non-null `post_draft_id` — the smoke touched a production draft.
6. Any `m.post_draft`, `m.post_publish_queue`, or `c.client_creative_governance` row changes during the window.
7. Criterion 3 fails (no audio stream / silent / below −45 dBFS) — **hard stop, no re-run without PK.** This is the precedent failure.
8. The §3.4 hard-gate probe **renders** instead of failing closed.
9. Run B started before run A's artifact was captured and hashed (G6 overwrite).
10. Creatomate returns 403 `code:1010` — Cloudflare UA block, **not** an auth failure; do not "fix" it by rotating the key. Stop and report.
11. Any expenditure beyond the four authorised POSTs.

### Rollback — written and validated BEFORE any run

| What Slice 1 creates | Reversible? | Rollback |
|---|---|---|
| Creatomate render (credits) | **No** | Not reversible. Bounded by the 4-POST cap; each run's credit cost is recorded. Accepted, stated, not hidden. |
| Storage object `_smoke/governed_video_stat_v1.mp4` (+ `_voice.mp3`) | Yes | Fixed paths under `post-videos/_smoke/`. Delete-by-path, PK-run. **Validated before run 1** by confirming the current object at that path is a prior smoke artifact with a recorded sha256, so "restore to prior state" is a defined target rather than a guess. Bucket is PUBLIC (G8) — the URL is world-readable while it exists. |
| `m.post_render_log` row(s) | Append-only evidence | **Not deleted.** These are governance evidence and rolling them back would falsify the record. Each row's `render_log_id` is recorded in the result doc and annotated as a supervised smoke. |
| Repo / EF / DB schema | N/A | Nothing is changed. |
| `_harness/` artifacts | Yes | Local; delete. |

**Nothing in Slice 1 alters production behaviour.** Rollback is therefore about artifact hygiene, not about restoring service. The genuinely irreversible element is the Creatomate spend, and it is capped and disclosed above.

---

## 7. Named handoffs

| # | Item | Owner |
|---|---|---|
| H1 | Live DB / RLS / grant verification of any later governance, assignment, candidacy, or proof-event write | **`db-rls-auditor`** — required in the T3 chain for every slice beyond Slice 1 |
| H2 | Post-deploy verification if any later slice deploys `video-worker` | **`deploy-verifier`** (PROVEN 2026-07-19) — runs AFTER PK's deploy, advisory only |
| H3 | Whether **format allocation** should send PP's video slots to the governed format at all — 16 of 18 currently go to legacy formats | **S1 / cc-0079 schedule→format authority arc.** This lane is held behind exactly this question and must not pre-empt it. |
| H4 | A worker-side machine audio gate (probe the artifact, assert an audio stream + loudness floor, fail the render otherwise) — closing G4 permanently | **PK decision → future Gate-1 lane.** Slice 1 measures audio operator-side only; it does not add a control. |
| H5 | Admitting the six generic video templates through inventory → candidacy → visual approval → assignment (G1) | **PK — per-template visual gate.** No agent approves a template. |
| H6 | HeyGen / avatar / persona (`video_short_avatar`) | **S4** — explicitly not entangled here |
| H7 | Creatomate API key rotation carry (deployed key ≠ local key) | **PK** — untouched by this lane |
| H8 | Brand-conformance judgment on any rendered video | **PK** — never an agent |

---

## 8. Success criteria

1. Four smoke invocations executed exactly as specified; no fifth.
2. PP and NDIS artifacts each captured, hashed, and archived **before** the next run overwrote the path.
3. All eight §3.3 criteria evaluated and recorded per run, with the **measured** audio values (stream presence, duration, mean dBFS, integrated LUFS) written into the result doc as numbers, not as "PASS".
4. §3.4 hard-gate probe failed closed pre-render with the expected error and no storage write.
5. G1–G8 either confirmed or corrected against what the runs showed, with evidence.
6. Zero enablement, zero publication, zero DB mutation authored by this lane; the only new DB rows are the per-render evidence rows counted in criterion 2.
7. PK's Gate-2 verdict recorded verbatim.

## 9. Stop condition

Report per `docs/briefs/_template_result.md`, then stop. **Do not proceed to any enablement, format expansion, template admission, or code change** — each is a separate Gate 1.

---

## 10. Open questions for PK

1. **Given §0.1, is Slice 1 the right first move at all?** It is a P1 confidence step; the dominant problem is P2 (selection breadth), which Slice 1 structurally cannot touch. With S1's gate now halted at `db-rls-auditor` and being re-cut, the window is further out — which makes this a real choice rather than a sequencing formality. Three options: **(a)** run Slice 1 as written — cheap, independent of H3, buys audio confidence the system has never had; **(b)** skip to a P2 Gate-1 packet (the G1 video candidacy chain), leaving render confidence unproven; **(c)** author the P2 packet now while held, and run Slice 1 when the window opens. **Recommend (c)** — it uses the hold productively and keeps the cheap P1 proof without letting it stand in for the real gap.
2. **NDIS in Slice 1 — yes or no?** Including it proves the generic spine across two brands at the cost of one extra render and the G6 serialisation constraint. It enables nothing either way. Recommend **yes**.
3. **The −45 dBFS floor and the −58 LUFS regression threshold in criteria 3 and 6 are my proposed values**, derived from the v3.1.1 attenuation-defect record, not from a ratified standard. PK should confirm or set them.
4. **G5 (`cta_text` over `max_chars` → permanently dead draft) is a live production defect**, not a smoke concern. Should it be raised as its own priority item now, or carried?
