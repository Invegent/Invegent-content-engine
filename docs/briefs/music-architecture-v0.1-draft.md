---
status: draft
owner: PK
review_state: needs_vendor_license_confirmation
production_state: no_commit_to_build
supabase_writes: none
github_writes: doc_only
created: 2026-05-08
last_updated: 2026-05-08
session: v2.55
supersedes: none
related:
  - docs/00_action_list.md (P3 "Music library activation checklist", PENDING PK ACTION)
  - supabase/functions/video-worker/index.ts v3.0.0 (commit 4ae5b5a7, env-gated music feature)
  - docs/06_decisions.md D006 (Claude primary, OpenAI fallback — vendor concentration policy)
---

# Music Architecture v0.1 — DRAFT research brief

## ⚠️ STANDING FLAG

**This brief proposes possible schema, Edge Function, and CRON work. Nothing is applied or built until each stage receives its own brief, its own D-01 fire, and explicit PK apply approval per ICE governance D-01.**

This document is a research artifact only. It does NOT authorise:

- Schema migrations or DDL of any kind
- Edge Function authoring or deployment
- CRON job creation, modification, or scheduling
- Supabase Storage bucket creation
- Vendor commitments or paid plan signup
- Retirement of any current ICE feature
- Changes to `video-worker` beyond what is already deployed at v3.0.0

Each implementation stage in §[Build Sequence] will require its own brief, its own D-01 fire, and explicit PK apply approval before any production state changes.

---

## Relationship to current `video-worker` v3.0.0 music feature

The env-gated `post-music` / 9-MP3 manual activation path shipped in `video-worker` v3.0.0 (commit `4ae5b5a7`, 8 May 2026) **remains the current ICE music plan-of-record**.

**This document does not retire that path.** It proposes an alternative architecture (API-generated Vibe Pool with scene-aware selection) that would supersede the 9-MP3 path **only if** PK adopts it after the Stage 0 prompt-sandbox eval.

Until that decision:

- The "Music library activation checklist" P3 PK action stays open in `docs/00_action_list.md` (status: PENDING PK ACTION). It is not deleted, retired, or marked obsolete by this brief.
- The `VIDEO_WORKER_MUSIC_ENABLED` env flag remains the single gate for any music feature shipping.
- No scope expansion in `video-worker` until Stage 0 outcome is decided.

If PK adopts this architecture: the P3 action is replaced (not deleted) with a forward link to this brief and a successor implementation action.

---

## Bottom line

Three external sources (ChatGPT, Grok, and a third architectural source) collectively give a defensible MVP. None give a production system for a managed-service model where Invegent operates the API and clients receive monetised output.

This brief takes the external research, corrects the licensing analysis (verified against current Mubert and ElevenLabs Music v1 terms), fixes three architectural proposals that collide with ICE's actual stack (sidechain ducking against rendered HeyGen MP4, separate Gemini LLM call, schema gaps in cold-start scope), and proposes an ICE-native integration aligned with format-advisor-v1 and the existing EF/CRON pattern.

**Bottom-line recommendation:** prompt-sandbox Mubert Startup+, Stable Audio, and Beatoven during Stage 0 (PK manual, ~1 week). Defer all build work and all schema authoring until Stage 0 decision plus the five vendor/operational confirmations in §[Required Confirmations] are resolved.

---

## Where the three external sources land

- **ChatGPT** — sound on schema design, weak on licensing reality, generic on Hindi.
- **Grok** — better on vendor matrix, glosses over the Content ID exposure.
- **Third architectural source** — strongest on architecture (Vibe Pool, FFmpeg sidechain, defensive logging) but three of those proposals don't survive contact with ICE's actual stack.

Together they produce a defensible MVP. None of them have visibility into ICE's slot-driven v4 architecture, format-advisor-v1 (shipped 8 May, ai-worker v2.12.0), or the HeyGen avatar pipeline shape.

---

## The licensing landmines

### Landmine 1 — Mubert Content ID prohibition (corrected)

Mubert's API 3.0 FAQ states verbatim: "we strictly prohibit to distribute our tracks via music streaming services or music stocks, or register them via Content ID systems" (per current Mubert API page, May 2026).

**Practical risk reading (corrected per external review):** Mubert's hard prohibition is against registering tracks in Content ID or distributing them as standalone music. The practical risk is **not** ordinary YouTube monetisation by clients — YouTube Content ID access requires copyright owners to meet eligibility criteria and prove exclusive rights, and is not automatically granted on YouTube Partner Programme enrolment. Licensed/non-exclusive music is a common example of content that may not qualify for Content ID.

The real exposure is:

- Accidental or third-party Content ID registration (a bad actor uploads similar AI-generated content and registers it; YouTube algorithms match)
- Distributor ingestion (a track somehow ending up in a music streaming pipeline)
- Future ICE workflow that treats generated tracks as standalone or licensable music assets (e.g., a client portal that lets clients download tracks separately)

License-evidence logging reduces dispute friction. It does not remove upstream licence-scope risk.

### Landmine 2 — Mubert tier gap for managed-service model

Based on current Mubert API page and FAQ wording (May 2026):

- **Startup at $199/mo**: monetise the app/game where music is used **in-app**
- **Startup+ at $499/mo**: minimum tier for **sublicensing** — i.e., for end-users to export content containing Mubert music and post it on social media

ICE's managed-service shape: Invegent generates → embeds in client video → publishes to client's owned channel. Output is exported by the end-user (the client) and posted publicly. Per current Mubert API/FAQ wording, this maps to the Startup+ definition.

**License floor for ICE based on current Mubert page/FAQ: $499/mo, not $199/mo.** Confirm directly with Mubert sales before any commitment — public FAQ wording is necessary but not sufficient evidence.

### Landmine 3 — ElevenLabs "Music Libraries & Repositories" clause (precision)

ElevenLabs Music v1 Terms (May 2026) define **Music Libraries & Repositories** as: "any arrangement in which Customer creates or permits others to create a library, catalogue, database, or other repository of Output with the intent of licensing it or otherwise making it available to third parties."

The Vibe Pool design proposed in this brief would qualify as a Music Library/Repository under this definition. ElevenLabs Music v1 Terms also define a **Customer Solution** as subscription-based hosted services for end users — close to ICE's managed-service shape.

**ElevenLabs self-serve tiers prohibit Music Libraries & Repositories; Enterprise / Enterprise Music lists this as custom.** Treat ElevenLabs as quote-required before any architecture commitment. Do not bet the Vibe Pool design on ElevenLabs until that quote is in hand.

### Landmine 4 — Suno and Udio carry training-data litigation

Suno and Udio output quality is strongest in 2026, but commercial license terms remain unsettled (training-data lawsuits in flight as of April 2026). For agency client work in regulated verticals (NDIS, property), this license risk is unacceptable.

**Avoid Suno/Udio for client work in 2026.**

### The provider the external research missed — Stable Audio (softened)

Stable Audio (Stability AI) appears more permissive on generated-output ownership: their terms state users retain ownership and have commercial rights, including the ability to license to third parties.

However, their pricing/license pages also draw lines around Enterprise use for larger organisations, apps/games, API/managed deployment, and annual revenue thresholds.

**Stable Audio appears promising for ICE's model and materially cleaner than Suno/Udio, but Invegent's managed-service / agency usage should be confirmed against Stability AI's commercial or Enterprise terms before treating it as cleared.**

### Net licensing read

| Provider | License clarity | Vibe Pool legal | Required tier | Status |
|---|---|---|---|---|
| Mubert | Clean ex-Content-ID per FAQ | Allowed on Startup+ per FAQ | Startup+ ($499/mo per current page) | Confirm with Mubert sales |
| ElevenLabs Music | Self-serve prohibits Libraries; Enterprise custom | Quote-required | Enterprise (TBD) | Quote required if Stage 0 justifies |
| Stable Audio | Materially cleaner than Suno/Udio | Likely allowed but TBD | Confirm against Enterprise threshold | Confirm against Stability AI commercial/Enterprise terms |
| Beatoven | Clean | Allowed | Commercial | Eval candidate in Stage 0 |
| Suno / Udio | Unsettled (training-data litigation in flight Apr 2026) | Unsafe for client work | — | Avoid |

**Wording note (per review):** ElevenLabs and Stable Audio appear materially cleaner than Suno/Udio, but both still require plan-fit confirmation for Invegent's managed-service model. License evidence reduces dispute friction; it does not remove upstream licence-scope risk.

**Recommendation:** prompt-sandbox **Mubert Startup+, Stable Audio, and Beatoven** during Stage 0. Pursue an ElevenLabs Music Enterprise quote in parallel only if Stage 0 output quality justifies the negotiation.

---

## The Vibe Pool — pre-generated, not per-render

The third source's Pool concept is right. The implementation as written has three holes.

**Hole 1 — reuse semantics undefined.** "Marks as used" is meaningless without scope. Three viable scoping rules:

- Per-client × per-platform × 90 days — same client can't get the same track twice on the same platform within 3 months. Cross-client reuse allowed (Property Pulse and a future property client share a pool).
- Per-client × forever — never reuse within a client. Forces continuous topup.
- Per-vibe × per-platform — pool-level uniqueness, no client awareness.

For a managed-service model with cross-client risk (two property clients posting the same backing track in the same week looks bad), the recommended rule is **per-client × per-platform × 90 days** with cross-client allowed but a same-day-cross-client dedup check.

**Hole 2 — no cold-start path.** First time a client/vibe combo is requested, the pool is empty. Three options:

- Synchronous fallback — call the API live, accept 15–45s latency on first render.
- Generic starter pool — ~50 generic instrumental tracks across 5 vibe categories, used until per-client pool fills.
- Fail-soft to no music — render without music for first 2 weeks while pool builds.

Recommendation: **generic starter pool**. It is the cheapest, lowest-risk option and matches PK's "no manual MP3 work" goal because it is generated once via API, not curated manually. Schema must support this — the global starter pool tracks have no client_id (see schema section below).

**Hole 3 — staleness and refresh policy not specified.** Tracks have shelf life. Pool needs:

- Topup target: maintain ≥20 unused tracks per (client, platform, vibe) tuple
- Refresh CRON: weekly check, generate 5 new tracks per (client, platform, vibe) where pool < 20
- Retirement: tracks unused for 365 days get archived to cold storage
- Failure handling: provider outage → CRON skips, retries next cycle, logs to `m.music_generation_log` (see schema below — explicitly NOT `m.ef_drift_log`)

**Pool sizing math:** at 5 NDIS-Yarns × YouTube + 5 Property-Pulse × YouTube slots/wk = 520 videos/yr. Add FB/LI/IG when expanded = ~2000/yr. Add 2 future external clients = ~4000/yr. With 90-day per-client uniqueness window, ~250 active tracks per client across vibes. At 4 clients = 1000 tracks. At 22-second average, ~2MB each = ~2GB Supabase Storage. Supabase Pro 8GB tier handles this. Free tier 1GB does not.

---

## Audio engineering — the HeyGen voice-source upstream pattern (revised per review)

The third source's `sidechaincompress` proposal is right in principle. Implementation depends on having the voice track separable from the video.

### Best path (ICE-native, recommended)

**Generate or retain narration audio upstream of HeyGen.** Per HeyGen API documentation, video generation supports `audio_url` or `audio_asset_id` as the avatar voice source — the avatar lip-syncs to audio you provide rather than to HeyGen-internal TTS. The flow becomes:

1. ICE TTS layer (ElevenLabs voice or future) generates narration WAV/MP3 → stored in Supabase Storage at a known path
2. video-worker submits to HeyGen with `audio_url` pointing at the stored narration → HeyGen returns rendered MP4 with the narration baked in
3. video-worker pulls a Vibe Pool track, runs FFmpeg `sidechaincompress` with the original narration WAV as sidechain key signal, the music track as input, and the rendered HeyGen MP4 as the video layer

This makes ducking technically clean: the sidechain key signal is the actual narration audio, not reverse-engineered from a baked render. It also means the same WAV serves two purposes (HeyGen voice source + sidechain key), no extraction step needed.

**Confirmation required:** Stage 6 design depends on `audio_url`/`audio_asset_id` being available on ICE's HeyGen plan. Verify before designing around it (see §[Required Confirmations] item 4).

### Fallback path

VAD over the rendered HeyGen MP4 (`silero-vad` or `webrtcvad` or FFmpeg `silenceremove`) to produce a voice-presence timeline, then use that as the sidechain key signal. ~5–10s extra render time, less precise than the upstream-voice approach.

### Avoid

Hoping HeyGen returns a clean voice stem alongside the rendered MP4. Do not depend on it unless the HeyGen API explicitly confirms stem output is available on ICE's plan.

### Hindi instrument frequency-clash

The third source's 2–5 kHz Hindi-instrument frequency-clash insight is real and good. The fix proposal — apply low-pass to music — is half right. A low-pass cut hurts the music's body. Better: FFmpeg `equalizer` with a narrow notch around 2.5 kHz on the music track, only when voiceover is active.

The harder truth on Hindi: as of mid-2026, AI music providers don't faithfully render "subtle tabla, bansuri" prompts. Outputs tend to be stereotyped. **Test in Stage 0 before committing.** If unusable, fall back to neutral instrumental for Hindi content with no Indian-accent prompt.

---

## ICE-native integration — don't import Gemini

Per D006 (Claude primary + OpenAI fallback): adding Gemini for music brief generation creates the vendor concentration ICE has explicitly resisted.

Three paths:

- **Path 1 — extend `format-advisor-v1`.** ai-worker v2.12.0 already runs `callFormatAdvisor` with platform/vertical/tone context. Extend the same call to emit a music brief alongside the format selection. One LLM call, one cost line, one place to maintain prompts.
- **Path 2 — separate `music-advisor-v1` chain.** Dedicated EF that takes format-advisor output + client music profile as input and emits a music brief. Chain after format-advisor. Adds latency and cost but cleaner separation of concerns.
- **Path 3 — deterministic mapping.** Map (format × vertical × tone) → pre-defined music brief templates. No LLM call. Fastest, cheapest, lowest variability. Loses creative range.

**Recommendation:** start with Path 3 (deterministic) for the MVP. Move to Path 1 (extend format-advisor) once 2–3 weeks of output reveal gaps Path 3 can't cover. Path 2 is overkill for current scale.

---

## Schema sketch — DRAFT, no DDL applied

**Important:** The schema below is illustrative. No migration is authored. No DDL is applied. Schema authoring at Stage 1 will require its own brief, its own D-01 fire, and explicit PK apply approval. The migration itself is a separate gate after schema review.

```sql
-- ============================================================
-- DRAFT ONLY. No migration authored. No DDL applied.
-- Schema authoring is a Stage 1 deliverable that will require
-- its own brief + D-01 + apply approval.
-- ============================================================

-- Per-client preferences
c.client_music_profile (
  client_id          uuid primary key references c.client(id),
  music_enabled      boolean default false,
  preferred_provider text,
  preferred_vibes    text[],
  banned_vibes       text[],
  cultural_accents   text[],
  vocals_allowed     boolean default false,
  default_energy     text,
  default_volume_bed numeric,
  language_preferences text[],
  created_at         timestamptz,
  updated_at         timestamptz
)

-- Per-render music intent (one row per rendered video)
m.music_brief (
  brief_id        uuid primary key,
  draft_id        uuid,
  slot_id         uuid,
  format          text,
  platform        text,
  vertical        text,
  tone            text,
  language        text,
  derived_mood    text,
  derived_energy  text,
  derived_tempo_bpm numeric,
  derived_genre   text,
  derived_instruments text[],
  avoid           text[],
  prompt_text     text,
  generated_by    text check (generated_by in
                    ('deterministic', 'format-advisor', 'music-advisor')),
  created_at      timestamptz
)

-- Vibe Pool — core table. Updated per external review with
-- platform, language, scope, reservation cols, license-snapshot,
-- loudness_lufs/bpm/instrumental_only.
m.music_pool (
  track_id        uuid primary key,
  scope           text check (scope in ('global_starter', 'client')),
  client_id       uuid null,        -- null for global_starter scope
  vibe_key        text,
  platform        text,
  language        text,
  provider        text,
  provider_track_id    text,
  provider_license_id  text,
  provider_receipt_json jsonb,
  generation_prompt    text,
  generation_params    jsonb,
  storage_path    text,
  audio_hash_sha256 text,
  loudness_lufs   numeric,
  bpm             numeric,
  instrumental_only boolean,
  duration_seconds numeric,
  license_tier_at_generation text,
  license_snapshot_hash      text,
  license_snapshot_text_path text,
  generated_at    timestamptz,
  last_used_at    timestamptz,
  use_count       int default 0,
  reserved_at     timestamptz,
  reserved_until  timestamptz,
  reserved_by_render_id uuid,
  status          text check (status in
                    ('available', 'reserved', 'used', 'archived', 'revoked'))
)

-- Audit trail of pool consumption
m.music_pool_use (
  use_id          uuid primary key,
  track_id        uuid references m.music_pool(track_id),
  draft_id        uuid,
  slot_id         uuid,
  client_id       uuid,
  platform        text,
  used_at         timestamptz,
  video_render_id uuid
)

-- Defensive logging for Content ID dispute kit
m.music_render_log (
  render_id            uuid primary key,
  draft_id             uuid,
  slot_id              uuid,
  track_id             uuid,
  provider             text,
  provider_track_id    text,
  license_tier         text,
  generation_prompt    text,
  audio_hash_sha256    text,
  embedded_at          timestamptz,
  video_render_path    text,
  dispute_evidence_pdf_path text null
)

-- Vendor generation events (outage, rate limit, generation success/fail).
-- DELIBERATELY NOT m.ef_drift_log — that table is reserved for
-- repo/deploy parity per F-EF-DRIFT-PREVENTION work.
m.music_generation_log (
  log_id        uuid primary key,
  provider      text,
  event_type    text check (event_type in
                  ('topup_attempt', 'topup_success', 'outage',
                   'rate_limit', 'auth_failure', 'quality_reject', 'other')),
  request_params jsonb,
  response_status int,
  error_text    text,
  occurred_at   timestamptz
)
```

**Three things this schema is explicitly NOT:** (1) it is not authored as a migration file; (2) it is not applied; (3) it is not committed beyond this brief. Stage 1 will own schema authoring as a separate deliverable.

---

## Build sequence — DRAFT, no production commit

Each stage requires its own brief, its own D-01 fire, and explicit PK apply approval. "Estimate" below is solo-builder rough sizing only.

| Stage | Scope | Estimate | Per-stage gate before any work |
|---|---|---|---|
| **0** | Prompt sandbox + provider eval — PK manual prompt-testing of Mubert Startup+ trial, Stable Audio, Beatoven across NDIS/property/Hindi prompts | ~1 wk PK time | None (no production touch) |
| **1** | Draft schema authoring + deterministic music-brief mapping (Path 3). **No production migration applied at this stage.** Output is a reviewable schema artifact, not a live table. | ~1 wk | Own brief + D-01 + PK apply approval. Migration itself is a separate gate after schema review. |
| **2** | `music-pool-generator` Edge Function + CRON (weekly topup) | ~1–2 wk | Own brief + D-01 + apply (includes CRON) |
| **3** | Generic starter pool seeding (one-time generation, ~50 tracks) | ~1 day | Own brief + D-01 + apply |
| **4** | `video-worker` integration — slide videos only, no ducking | ~1 wk | Own brief + D-01 + apply (touches existing EF; STANDING_THREE check applies) |
| **5** | Client music profile UI + defensive logging | ~1 wk | Own brief + D-01 |
| **6** | Avatar/voice support — upstream voice (HeyGen `audio_url`) + sidechain ducking | ~2–3 wk | Own brief + D-01; gated on HeyGen pipeline maturity (currently in beta) |
| **7** | Path 1 LLM upgrade if deterministic mapping insufficient | ~1 wk | Own brief + D-01 |

**Stage 1 explicit framing (per review):** Stage 1 produces a **draft schema artifact only** — no production migration is authored. Migration is a separate gate after schema is reviewed and apply approval is given.

---

## Cost reality

| Line | Phase 1 (4 clients) | Phase 4 target (10 clients) |
|---|---|---|
| Music API (Mubert Startup+, current page price) | ~$499/mo | ~$499/mo (likely Business tier ~$999 at scale) |
| Storage (Supabase Pro) | already paid | already paid |
| Compute (EF runs) | negligible | negligible |
| LLM brief (Path 1, if adopted) | ~$5/mo | ~$15/mo |
| **Per-client floor** | **~$125/client/mo** | **~$50/client/mo** |

At Standard-tier client pricing of $800/mo, $50–125/client/mo for music is 6–15% of revenue. Tolerable.

**Not tolerable** if forced to ElevenLabs Enterprise without negotiation — Enterprise quotes for "music repository for managed service with 10 clients" can land at $2k–5k/mo. Confirm before assuming this path is viable.

---

## Required confirmations before implementation

Before any Stage 1+ work begins, the following must be resolved:

1. **Mubert Startup+ sublicensing confirmed for Invegent-managed client publishing** — direct confirmation from Mubert sales, not inference from public FAQ alone.
2. **Stable Audio managed-service / agency use confirmed** against Stability AI's commercial or Enterprise terms — direct confirmation against the actual Enterprise threshold language.
3. **ElevenLabs Music Enterprise quote requested** — only if Stage 0 prompt-sandbox shows ElevenLabs output quality justifies the Enterprise negotiation.
4. **HeyGen voice-source path confirmed** — verify `audio_url` / `audio_asset_id` is supported on ICE's HeyGen plan before designing Stage 6 around it.
5. **Decision made: keep 9-MP3 manual activation vs supersede with Vibe Pool** — Stage 0 outcome drives this decision; until decided, both paths stay alive in `docs/00_action_list.md`.

Until all five are resolved, this brief stays in `status: draft` and no implementation work begins.

---

## Decisions PK owes themselves before Stage 0

1. **Provider — Mubert Startup+ at $499/mo, or hold for Stable Audio eval?** Recommendation: run prompt sandbox first, two-week eval, then commit.
2. **Music for English-only, or Hindi included from MVP?** Recommendation: ship English-only first. Add Hindi as Stage 5+ once provider quality is verified in Stage 0.
3. **Pool reuse policy — per-client × per-platform × 90 days, or stricter?** Recommendation: 90-day window with cross-client allowed plus same-day-cross-client dedup check.
4. **Cold-start — generic starter pool, synchronous fallback, or no-music-while-pool-fills?** Recommendation: generic starter pool.
5. **LLM brief layer — deterministic, extend format-advisor, or separate music-advisor?** Recommendation: start deterministic (Path 3); earn the LLM layer if needed.
6. **Avatar pipeline timing — defer avatar-music until HeyGen out of beta?** Recommendation: yes.
7. **Existing P3 PK action "Music library activation checklist"** — does Stage 0 outcome retire it? Open question pending Stage 0.

---

## Review status — doc-only draft

This brief was developed across two chat sessions in v2.55 (2026-05-08 Sydney) and reviewed by an external ChatGPT pass. The external review surfaced 8 substantive corrections, all incorporated into this v0.1 draft.

Per v2.53/v2.54 doc-only commit precedent (D-01 doc-only carve-out), this draft brief does not require an MCP `ask_chatgpt_review` D-01 fire. **The external review here is sufficient for doc-only draft brief review only — it is NOT a substitute for the per-stage D-01 fires that will be required at each implementation stage.**

When Stage 1 (or any subsequent stage) authors a schema, an EF, a CRON, or any production-touching artifact, that stage gets its own brief and its own MCP D-01 fire. The reviews are not transferable across stages.

---

## Open questions / honest limitations of this brief

- **Vendor pricing snapshots are dated May 2026.** All vendor pages cited may shift. Re-verify at Stage 0 entry.
- **Stable Audio Enterprise threshold language is incomplete in public docs.** Direct confirmation required.
- **HeyGen `audio_url` / `audio_asset_id` is documented but plan-tier-gating is unclear.** ICE plan tier may not support it. Verify before designing Stage 6 around it.
- **Hindi prompt fidelity is asserted-as-poor based on industry signal, not direct ICE testing.** Stage 0 must include side-by-side Hindi prompt eval across all candidate providers.
- **Pool-sizing math assumes 22-second average track length and 2MB average file size.** Both are approximations; revise after Stage 0 generates real samples.
- **Cross-client Vibe Pool sharing logic** (Property Pulse + future property client sharing the property-vibe pool) is proposed but not deeply designed. Stage 1 schema work will need to make the cross-client semantics explicit.
- **Brief does not address audio quality regression detection.** If a Mubert generation produces a clipped/distorted track, the pool ingests it as-is. Stage 2 should include a basic loudness/peak validation pass before marking a track `available`.

---

*End of v0.1 draft. Status: needs vendor license confirmation. Production state: no commit to build. Next step: PK Stage 0 prompt sandbox.*
