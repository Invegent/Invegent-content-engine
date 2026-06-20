# Sprint Plan — Production Quality Recovery (execution brief, docs-only)

**Created:** 2026-06-20 Sydney
**Author:** chat (Session 1, implementation/docs owner + voice-path recovery owner)
**Status:** PLANNING / SPRINT EXECUTION BRIEF — docs-only. Sequences the production-quality recovery
work. **This is a sprint execution brief, NOT a roadmap replacement** (roadmap authority stays with
`docs/04_phases.md`; task-queue authority stays with `docs/00_action_list.md`). **Implements nothing.**
**Class:** `docs_only` — 0 secret read / 0 secret write / 0 env-config change / 0 DB mutation / 0 code
edit / 0 deploy / 0 worker invocation / 0 provider call / 0 render creation / 0 draft re-approval.

> **Terminology:** ICE = the Invegent Content Engine **product**; Invegent = company/platform owner.
> Companions: `voice-path-production-recovery-runbook.md` (the detailed voice runbook),
> `render-provider-creatomate-capability-audit.md`, `render-provider-heygen-capability-audit.md`.

---

## 0. Governing principle — production quality BEFORE engagement optimization

Fix what is **shipping broken** before optimising what is shipping. Engagement/creative optimisation
(P2 Creative Format Evidence, character/persona selection, CI/RI build) stays **gated and downstream**
— it is blocked anyway (P2 NOT READY; Engagement A1 outcome-pending; AGP telemetry OFF). This sprint is
**production-quality recovery + diagnostics only.** No optimisation lane opens here.

**Sequencing:** **(D1) Voice Path Production Recovery FIRST** → then **(D2) YouTube privacy read-only
audit** → then **(D3) Production QA Visibility** (render-log spine extension). Analytics/collection
defects are explicitly **parked** (§5). **Estimate: 3–5 lane-days, gated on PK turnaround at each gate —
NOT guaranteed calendar days** (each irreversible step waits for PK; the clock is PK-response-bound).

---

## D1 — Voice Path Production Recovery (FIRST lane) + ElevenLabs Provider Specialist v0

**Detailed runbook:** `docs/briefs/voice-path-production-recovery-runbook.md` (registers v3.71). This
section is the sprint-level summary + the two folded-in items (Provider Specialist v0, low-volume
backfill).

### D1.1 Confirmed root cause (read-only, re-verified 2026-06-20)

- The `creatomate+elevenlabs` failures are **genuine voice-format failures** — **all 9 failed renders
  are `video_short_kinetic_voice`** with **narration text present** (Property Pulse ×7 last 2026-06-15,
  NDIS-Yarns ×2 last 2026-06-18 19:00). Not routing, not Creatomate, not storage, not a false alarm.
- **Root cause:** `getVoiceId(clientSlug)` returns **null** → `video-worker` throws
  `No ElevenLabs voice ID configured for client_slug=<X>` (fail-loud guard, `video-worker` ≈line 520).
- **The throw fires BEFORE ElevenLabs TTS, before the Creatomate submit/poll, before storage** →
  **no provider spend** on any of the 9 failures (verified in the deployed source: the `if (!voiceId)
  throw` precedes `generateAndUploadVoice`).
- **Deployed posture (verified):** `video-worker` function **version 49**, **`verify_jwt=false`**,
  source **`video-worker-v3.1.3`** (carries the v3.1.2 voice-mapping guard `F-VOICE-SILENT-FALLBACK`
  AND the v3.1.1 audio-volume `"100%"` contract fix). Byte-identical to the repo.
- **`client_slug` NOW populated:** **`property-pulse`** (`4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`),
  **`ndis-yarns`** (`fb98a472-ae4d-432d-8738-2273231c1ef4`) — resolves the UUID-fallback for future
  renders.

### D1.2 Candidate secrets (PK to supply values; orchestrator never reads/sets without the gate)

`getVoiceId` resolves the **exact** `ELEVENLABS_VOICE_ID_<SLUG_UPPER>` first, then a legacy alias:

- **Property Pulse** → `ELEVENLABS_VOICE_ID_PROPERTY_PULSE` (exact) **or** `ELEVENLABS_VOICE_ID_PP`
  (alias). **PP is the likely missing/regressed mapping.**
- **NDIS-Yarns** → `ELEVENLABS_VOICE_ID_NDIS_YARNS` (exact) **or** `ELEVENLABS_VOICE_ID_NDIS` (alias).

Setting any one of the pair to a valid ElevenLabs voice id makes `getVoiceId` resolve non-null. **Secret
write = PK hard gate** (no code/deploy needed; takes effect on next invocation).

### D1.3 Remediation options (PK-gated; none executed)

- **A.** verify/set the required ElevenLabs voice-ID secret(s) — root-cause fix (recommended).
- **B.** hold the `*_voice` formats until secrets confirmed — stop-the-bleeding; non-voice unaffected.
- **C.** later code hardening — explicit per-client voice mapping replacing the substring heuristic
  (own PK-gated code lane: brief → ef-builder → branch-warden → external review → deploy gate).

### D1.4 Verification (the natural path is BLOCKED — material)

`video-worker` selection is **approval-gated** (`approval_status IN ('approved','published')`). The
**3 pending voice drafts are ALL `approval_status='rejected'`** (NY `video_short_kinetic_voice`, NY
`video_short_stat_voice`, PP `video_short_stat_voice`) and there are **0 approved/published pending
voice drafts** (re-verified 2026-06-20). So recovery **cannot self-verify naturally** — verification
requires one of: **(a) PK re-approves one rejected voice draft**, **(b) a new approved voice draft
lands**, or **(c) a single PK-approved controlled worker invocation on an approved voice draft**. Then
check `m.post_render_log` for `succeeded` + `has_voiceid_error=false` (see the §D3 telemetry caveat).

### D1.5 Rollback / safety

- **Rollback = unset/revert the voice secret OR hold the voice formats → the path returns to fail-loud**
  (`video_status='failed'`, no broken voice asset published). The fail-loud guard is the safety net.
- If voice still fails **after** the secret is set, **do NOT retry blindly** — capture the new
  `m.post_render_log` error, stop, surface to PK (points past the secret: invalid voice id / ElevenLabs
  auth / the Creatomate in-request poll wall-clock risk).
- Keep non-voice (`creatomate`) formats unaffected; verify one render before re-enabling at volume.

### D1.6 ElevenLabs Provider Specialist v0 (runs INSIDE this lane)

- **Scope:** establish ICE's ElevenLabs integration facts from **live public provider docs** — voice-id
  semantics, the TTS model in use (`eleven_multilingual_v2`), voice_settings (stability/similarity),
  audio format (`audio/mpeg`), and how a voice id is sourced/verified in the ElevenLabs dashboard.
- **HARD GATE:** Provider Specialist v0 may read **public docs only**. **Any ElevenLabs API call, any
  credential/voice-id read, any account/dashboard call, any provider spend = PK gate.** It informs the
  secret decision; it does not perform it.

### D1.7 F-VOICE-LOWVOL-BACKFILL (folded into D1 — PK decision AFTER recovery)

- **Carry confirmed.** Pre-v3.1.1 voice renders carry the ~-58 LUFS low-volume audio (the v3.1.1 fix
  corrected **future** renders only; v3.1.1 is deployed in v3.1.3).
- **Affected set (read-only recount 2026-06-20):** **15 already-rendered (published) voice videos** —
  NDIS-Yarns **8** (5 `kinetic_voice` + 3 `stat_voice`), Property Pulse **7** (4 `kinetic_voice` + 3
  `stat_voice`). *(The carry's earlier figure was "~21"; the exact pre-fix LUFS-affected subset needs a
  render-date filter PK can scope at decision time — the render-log success rows are tagged
  `render_engine='creatomate'`, not `'+elevenlabs'`, so the engine tag alone cannot isolate them; see
  §D3.)*
- **Decision is PK's, AFTER voice recovery is verified:** **re-render** the affected set at corrected
  volume, **or leave** them as-is. Re-rendering is itself gated (it is render creation + provider spend)
  and must not precede a verified-good voice path.

---

## D2 — YouTube privacy read-only audit (production-quality diagnostic)

- **Why here:** "is what we shipped actually public/visible?" is a production-quality question, not an
  engagement one. Registers record YouTube privacy as **historical/closed** (recent publishes PUBLIC;
  the live YouTube constraint is **low audience/distribution**, not privacy). This audit **re-confirms
  that read-only** so the closed status is evidence-backed, not assumed.
- **Scope:** read-only inspection of recent YouTube publishes' privacy status (via existing publish
  records / read-only YouTube data already in hand). **No publish, no re-publish, no privacy mutation,
  no API write.** If it surfaces any non-public recent publish, that becomes its own gated finding.

---

## D3 — Production QA Visibility (EXTEND the existing render-log spine — not greenfield)

- **Framing (explicit):** this **extends the existing `m.post_render_log` + `write_render_log` spine** —
  **not** a new system, not a new table, not a greenfield QA surface. The spine already exists and is
  the telemetry backbone for all render providers.
- **Concrete gap found this preflight (read-only):** the `write_render_log` **success path hardcodes
  `p_render_engine='creatomate'`**, while only the **failure path** tags `'creatomate+elevenlabs'`. So
  **successful voice renders are indistinguishable from non-voice renders by engine tag** — you can see
  voice *failures* but not voice *successes*. This is the first candidate QA-visibility improvement:
  make the engine tag (and/or a voice flag) consistent across success and failure so the render-log can
  answer "did voice renders succeed?" directly. Also relevant: `render_spec` is null on the Creatomate
  path (per the Creatomate capability audit §2).
- **DO NOT IMPLEMENT YET.** Any change to `write_render_log` / `video-worker` is a PK-gated code lane
  (brief → ef-builder → branch-warden → external review → deploy gate `--no-verify-jwt`). This sprint
  only **names** the extension; it does not build it.

---

## 5. Deliberately PARKED (analytics/collection carry — NOT sprint blockers)

These are real but **out of scope** for the production-quality sprint and explicitly deferred:

- **FB reach `#100`** — the Engagement A1 reach metric still returns Graph error `#100` for the
  account-scoped case; A1 (insights-worker v14.5.0 fail-safe fallback) is **deployed, outcome-pending**.
  This is an **analytics** signal-quality matter (its next step is a PK-gated Graph probe), **not** a
  production-quality render blocker. Stays a carry.
- **CFW FB collection stall** — Care-for-Welfare FB collection is stalled; this is a **collection/data**
  defect, parked as a carry, **not** part of this sprint.

Parking these keeps the sprint focused on what ships broken (voice) and what we can verify read-only
(YouTube privacy, render-log visibility), without dragging in the slower analytics/collection lanes.

---

## 6. Hard-stop gates (this sprint STOPS at each — explicit PK approval required)

- **Reading a secret value** → PK gate.
- **Setting/writing a secret** (D1 Option A) → **PK hard gate** (needs the voice-id values).
- **Holding/disabling voice formats** (D1 Option B) → PK decision gate.
- **Any `video-worker` / `write_render_log` code change** (D1 Option C, D3) → PK-gated code lane + external review + deploy gate.
- **Invoking the worker / creating any render** (verification, low-vol re-render) → PK gate.
- **Re-approving a rejected draft** → PK action.
- **Any ElevenLabs / Creatomate API call, credential/voice-id read, or provider spend** (incl. Provider Specialist v0 beyond public docs) → PK gate.
- **Any DB mutation / migration / deploy** → PK gate.
- **Low-volume backfill re-render decision** → PK decides, after voice recovery is verified.

---

## 7. Scope / non-goals + provenance

Docs only — sprint execution brief. No secret read/write, no env/config change, no DB mutation, no code
edit, no deploy, no worker invocation, no provider call, no render creation, no draft re-approval. **No
second roadmap created; `docs/04_phases.md` not edited.** All current-state facts (root cause, deployed
v3.1.3/version 49, `client_slug` population, 3 rejected pending voice drafts, 0 approved pending voice
drafts, 9 failed `kinetic_voice` renders, 15 published voice videos, render-engine tag asymmetry) were
verified read-only on 2026-06-20 (project `mbkmaxqhsohbtwsqolns`, CE HEAD `efd7582` 0/0). **DO NOT
IMPLEMENT YET** — every lane above is PK-gated.
