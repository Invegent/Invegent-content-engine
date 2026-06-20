# Runbook — Voice Path Production Recovery (`creatomate+elevenlabs`) — DRAFT, read-only planning

**Created:** 2026-06-20 Sydney
**Author:** chat (Session 1, Production recovery planner)
**Status:** PLANNING / RUNBOOK DRAFT — read-only. Prepares the exact remediation plan for the
`creatomate+elevenlabs` voice-render failure. **Implements nothing. DO NOT IMPLEMENT YET.**
**Class:** `read_only_planning` — 0 secret read / 0 secret write / 0 env change / 0 worker invocation /
0 ElevenLabs call / 0 Creatomate call / 0 render creation / 0 DB mutation / 0 code edit / 0 deploy.

> **Terminology:** ICE = the Invegent Content Engine **product**; Invegent = company/platform owner.
> The voice path is the `video-worker` (Creatomate composition) **with ElevenLabs TTS** — render engine
> tag `creatomate+elevenlabs`. Companion: `render-provider-creatomate-capability-audit.md`.

---

> **✅ RESOLVED 2026-06-20 (supersedes the planning hypotheses below; see registers v3.73).** This runbook
> was authored as read-only PLANNING and its early framing ("missing voice-ID secret", §1/§4 Option A) was
> **DISPROVEN by live test** — keep the body as the audit trail, but the **proven root cause** is:
> **`service_role` lacks `SELECT` on `c.client`**, so `getBrand()`'s PostgREST read of `client_slug`
> returned null and fell back to the **client UUID**; `getVoiceId(UUID)` then matched no `pp`/`ndis` alias
> and returned null. The PP/NDIS voice secrets (`ELEVENLABS_VOICE_ID_PP` / `ELEVENLABS_VOICE_ID_NDIS`) were
> **present all along** (red herring), and it was **NOT** a stale PostgREST schema cache (a cache reload
> was tested and did not fix it — a reload re-reads the catalog but grants nothing). **Fix shipped:**
> `video-worker` **v3.1.4** (commit/merged `e388c33`, deployed fn version 50, `verify_jwt=false`) added
> **client_id-first** voice resolution (`getVoiceIdForDraft`) that does not depend on `getBrand().clientSlug`;
> a UUID-valued slug never enters the alias path. We **did NOT grant** `SELECT` on `c.client`
> (code-hardening chosen instead); **`getBrand().clientSlug` and the storage-path behaviour were left
> intentionally unchanged**. **Secondary blocker:** `ELEVENLABS_API_KEY` was invalid (`401 invalid_api_key`)
> → **PK manually rotated** it. **Verified end-to-end:** controlled PP + NDIS renders both **succeeded**
> (ElevenLabs → Creatomate → Supabase storage), 0 queue rows, 0 publish rows, nothing published.

---

## 1. Confirmed code path (read-only, `video-worker/index.ts`)

The failure is a **deliberate fail-loud guard**, firing BEFORE any external call:

1. `getBrand(supabase, draft.client_id)` (≈line 283) loads `c.client.client_slug`; returns
   `clientSlug: cl?.client_slug ?? clientId` (UUID fallback if slug null).
2. At the voice call site (≈line 511–523), for a voice format `withVoice=true`:
   `const voiceId = getVoiceId(b.clientSlug);`
   **`if (!voiceId) throw new Error(\`No ElevenLabs voice ID configured for client_slug=${b.clientSlug}\`)`.**
3. `getVoiceId(clientSlug)` (≈line 127–138) resolves the secret:
   - exact: `ELEVENLABS_VOICE_ID_<SLUG_UPPER>` (slug upper-cased, `-`→`_`);
   - else if slug contains `ndis` → `ELEVENLABS_VOICE_ID_NDIS`;
   - else if slug contains `property` or `pp` → `ELEVENLABS_VOICE_ID_PP`;
   - else `null` (v3.1.2 guard `F-VOICE-SILENT-FALLBACK` — **no silent NDIS default**).
4. The throw happens **before** ElevenLabs TTS, before the Creatomate submit/poll, before storage. On
   throw, the worker sets `video_status='failed'` and writes `m.post_render_log` with
   `p_render_engine='creatomate+elevenlabs'`, status `failed` (≈line 582–583).

**Conclusion (CORRECTED — see RESOLVED banner above):** the path matches PK's description, and no
ElevenLabs/Creatomate spend is incurred on the failing renders. But the failure was **NOT a missing
voice-ID secret** (this planning-time conclusion was disproven) — `getVoiceId` received the **client
UUID** because `getBrand()`'s `c.client` read is denied to `service_role` (missing `SELECT` grant), so it
never reached the present PP/NDIS secrets. Root cause = the **grant gap**, fixed in code by client_id-first
resolution (v3.1.4).

## 2. Confirmed `client_slug` population (read-only, `c.client`, 2026-06-20)

| Client | client_id | `client_slug` |
|---|---|---|
| NDIS-Yarns | `fb98a472…` | `ndis-yarns` |
| Property Pulse | `4036a6b5…` | `property-pulse` |

Both slugs are **now populated** (the earlier UUID-fallback risk is resolved for future renders).
Secret resolution under §1.3 therefore lands as:

- **`property-pulse`** → tries exact **`ELEVENLABS_VOICE_ID_PROPERTY_PULSE`**, else alias
  **`ELEVENLABS_VOICE_ID_PP`** (slug contains `property`).
- **`ndis-yarns`** → tries exact **`ELEVENLABS_VOICE_ID_NDIS_YARNS`**, else alias
  **`ELEVENLABS_VOICE_ID_NDIS`** (slug contains `ndis`).

> Note: slug `property-pulse` upper-cases to `PROPERTY_PULSE`, so the **exact** key is
> `ELEVENLABS_VOICE_ID_PROPERTY_PULSE`. The `ELEVENLABS_VOICE_ID_PP` alias only resolves via the
> `contains('property'|'pp')` fallback branch — both paths reach a voice id, but **at least one of the
> pair must be set**. Per PK, the likely-missing secret is the **PP** voice id.

## 3. At-risk drafts (read-only, `content_draft`, 2026-06-20)

**Pending voice drafts (`video_status='pending'`, voice formats):** 3 — but **all
`approval_status='rejected'`**:

| Client | format | approval_status | video_status |
|---|---|---|---|
| NDIS-Yarns | `video_short_kinetic_voice` | **rejected** | pending |
| NDIS-Yarns | `video_short_stat_voice` | **rejected** | pending |
| Property Pulse | `video_short_stat_voice` | **rejected** | pending |

**MATERIAL FINDING (verification-blocking):** `video-worker` draft selection is **approval-gated** —
`.in('approval_status', ['approved','published'])` (≈line 568). The 3 pending voice drafts are
**rejected**, so the worker **will not pick them up**. There are currently **0 approved/published
pending voice drafts** → the natural "let one render" verification **cannot occur** without an
**approved** voice draft (re-approve one, wait for a new one, or a PK-approved targeted invocation).

**Corroborating failure history (`m.post_render_log`, `creatomate+elevenlabs` status `failed`,
`has_voiceid_error=true`):** 9/9 —
- Property Pulse `video_short_kinetic_voice` ×7 (last 2026-06-15);
- NDIS-Yarns `video_short_kinetic_voice` ×2 (last 2026-06-18 19:00).

> Format nuance to record: the historical **failures** were all `kinetic_voice`; the current **pending**
> drafts include `stat_voice`. Both are voice formats and hit the same §1 guard, but the at-risk set is
> not identical to the failed set.

## 4. PK remediation options

### Option A — Set / verify the missing voice-ID secret(s) *(recommended root-cause fix)*
Set whichever of the voice-ID secrets is missing so `getVoiceId` resolves non-null:
- Property Pulse: **`ELEVENLABS_VOICE_ID_PP`** (alias) **or** `ELEVENLABS_VOICE_ID_PROPERTY_PULSE` (exact).
- NDIS-Yarns: **`ELEVENLABS_VOICE_ID_NDIS`** (alias) **or** `ELEVENLABS_VOICE_ID_NDIS_YARNS` (exact).

This is a **secret write** on the `video-worker` Edge Function env → **PK hard gate** (no code/deploy
needed; secrets take effect on next invocation). Requires PK to source the correct ElevenLabs voice IDs.
**Smallest fix that addresses the actual cause.** Does not change behaviour for non-voice formats.

### Option B — Disable / hold the voice formats *(stop-the-bleeding, no secret)*
Stop generating/queuing the voice formats (`*_voice`) until A is done, so no further `failed` voice
renders accrue. This is a **config/intent-level hold** (not a code change in this lane); it keeps
non-voice formats fully live. Reversible. Use if PK cannot source the voice IDs immediately.

### Option C — Later code hardening: explicit per-client voice mapping *(deferred, own lane)*
Replace the `contains('property'|'pp'|'ndis')` heuristic in `getVoiceId` with an **explicit
slug→secret map** (e.g. a small table/lookup), so resolution is deterministic and a missing mapping is
an explicit, named config gap rather than a substring coincidence. This is a **`video-worker` code
change** → its own PK-gated lane: brief → ef-builder → branch-warden → external review → PK deploy gate
(`--no-verify-jwt`). **Not this lane.**

**Recommended PK action:** **A** (set the missing PP — and verify NDIS — voice-ID secret) as the
root-cause fix, optionally with **B** as an interim hold if the IDs aren't immediately available. **C**
is the durable follow-up, separately gated.

## 5. Verification plan (after secret remediation)

Because of the §3 approval-gate finding, "let one render naturally" **requires an approved voice draft**.
Verification steps, in order of least intervention:

1. **Confirm the secret resolves** — after PK sets the secret, the very next eligible voice render should
   no longer throw the `No ElevenLabs voice ID configured…` error. (No secret *value* needs to be read to
   confirm this — success/failure of the render is the signal.)
2. **Obtain an eligible draft** — either (a) PK **re-approves** one of the 3 rejected voice drafts (moves
   it to `approved`), or (b) wait for a **new** approved voice draft to land naturally. Without one, the
   worker has nothing to pick up.
3. **Let exactly one render run** — either via the natural `video-worker` cron, or a **single PK-approved
   normal worker invocation**. Do **not** mass-trigger.
4. **Check `m.post_render_log`** for that draft: expect status `succeeded`, `p_render_engine =
   'creatomate+elevenlabs'`, `has_voiceid_error=false`, and a stored asset. That is the success criterion.
5. **Confirm non-voice formats unaffected** — spot-check a recent `creatomate` (non-voice) render still
   succeeds.

## 6. Rollback / safety

- **If voice still fails after the secret is set — DO NOT retry blindly.** Capture the new
  `m.post_render_log` error (it should now differ from `has_voiceid_error`), stop, and surface to PK; a
  persistent failure points past the secret (e.g. an invalid voice id, ElevenLabs auth, or the Creatomate
  wall-clock poll risk in the Creatomate audit §3).
- **Keep non-voice formats unaffected.** Setting a voice-ID secret does not touch the non-voice
  (`creatomate`) path; do not change selection, caps, or cron in this lane.
- **Do not publish broken voice assets.** A `failed` voice render must not be published; the publisher
  asset-guard lane is the backstop, but the recovery lane must not force-publish.
- **One at a time.** Verify a single render before re-enabling the voice formats at volume (ties to the
  production-readiness backlog: don't raise volume while a back-of-funnel gap is open).

## 7. Hard gates (this lane STOPS at each)

- **Reading a secret value** → PK approval required (not done; not needed for diagnosis).
- **Setting/writing a secret** (Option A) → **PK hard gate**.
- **Disabling/holding voice formats** (Option B) → PK decision gate.
- **Any `video-worker` code change** (Option C) → PK-gated code lane + external review + deploy gate.
- **Invoking the worker / triggering a render** → PK gate (verification step 3).
- **Re-approving a rejected draft** → PK action (changes approval state).
- **Any DB mutation / deploy** → PK gate.

## 8. Scope / non-goals + provenance

Read-only planning. No secret read, no secret write, no env change, no worker invocation, no ElevenLabs
call, no Creatomate call, no render creation, no DB mutation, no code edit, no deploy. All current-state
facts (code path, `client_slug` population, pending/rejected drafts, 9/9 failed history) were verified
read-only on 2026-06-20 (project `mbkmaxqhsohbtwsqolns`, CE HEAD `5ef412c` 0/0). **DO NOT IMPLEMENT YET** —
awaiting PK's choice of remediation option and the secret values.
