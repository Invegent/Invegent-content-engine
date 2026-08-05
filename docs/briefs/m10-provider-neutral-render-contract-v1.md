# M10 — Provider-Neutral Governed Render Contract (v1, design doc)

**Created:** 2026-08-05 Sydney · **Author:** orchestrator (docs-only lane `m10-m9-docs-foundation`)
**Status:** DRAFT — submitted for PK Gate-1 review. This document's existence is the artifact the M10
finite acceptance test names, but closing M10's row in the CGU Final must-have table
(`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md:399`) is a PK ratification act, not an
act this document performs on itself. Until ratified, M10 stays **OPEN** in the register.
**Class:** docs_only — 0 code / 0 DB / 0 migration / 0 RPC / 0 EF deploy / 0 provider call by this document.
**Extracted from:** the two real, closed governed video format implementations (`video_short_stat`,
`video_short_kinetic`) cross-checked against the governed image implementation (`image_quote`), per the
CGU-v1 25/25 verdict (`docs/briefs/results/cgu-v1-final-reread-and-verdict-v1.md`, 2026-08-04) — satisfying
M10's own dependency ("Phase 0 CLOSED... ≥2 real format implementations", delta-audit `:505-506`).
**Companions:** `docs/briefs/render-provider-creatomate-capability-audit.md` §7 (the aspirational sketch
this formalizes), `docs/governance/governor-architecture.md` (Governor-pattern alignment, §8),
`docs/creative-library/registry-schema-v2.md` (the declarative registry this contract's §2 must not be
conflated with).
**Governing milestone:** M10, `docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md:399`.

> **What this document is not:** a working provider abstraction, a second provider, or a refactor of
> `video-worker`/`image-worker`. It is the shape a future provider-abstraction lane would implement
> against — extracted from what is actually built and actually broke in production, not invented.

---

## 0. What "provider-neutral" means here — and does not mean yet

No provider abstraction exists in code today. `video-worker` (`supabase/functions/video-worker/index.ts`)
and `image-worker` (`supabase/functions/image-worker/index.ts`) are two independent Deno Edge Functions,
each with its own duplicated-but-structurally-parallel governed-render branch. Creatomate is the only
provider either one calls. HeyGen exists as a wholly separate function (`heygen-worker`) for avatar video,
on its own render/poll/log path, never unified with either. There is no interface a second provider would
implement, and no code shared between the two workers' governed branches beyond convention.

"Provider-neutral" in this document means: the eight stages below (§1–§8) are *already* the same shape
across both workers and both real formats, even though nothing enforces that shape as a type or interface.
This document names that shape explicitly, with citations, so a future abstraction lane has a real contract
to implement against instead of re-deriving it from scratch — and so it inherits the three production
lessons (§6) instead of re-discovering them the expensive way.

---

## 1. Governed input

A governed render request is built from: `client_id`/`client_slug`, an `ice_format_key`
(`video_short_stat`, `video_short_kinetic`, `image_quote`, …), a nullable `platform` (both governed video
calls pass `p_platform: null` today — video is "ONE 9:16 render, not per-platform" by design,
`video-worker/index.ts:1444-1445`), a draft/seed id, draft-derived text fields, and whatever assets/audio
the identity-resolution step (§2) returns.

Two structurally different render-spec shapes coexist in production and a provider-neutral contract must
name the split rather than assume one canonical shape:

- **Governed (template-mode):** `{ providerTemplateId, modifications, templateSpec|tmrEvidence }`,
  produced by a pure builder function per format — `buildGovernedVideoStatPlan`
  (`video-worker/b1_video_stat.ts:494-622`), `buildGovernedVideoKineticPlan`
  (`video-worker/b1_video_kinetic.ts`), `buildTmrRenderPlan` (`image-worker/b1_production.ts:356-418`).
  Each builder is documented as pure — no I/O, no `Date.now`, no randomness (`b1_video_stat.ts:8`) — and
  sends Creatomate a `{ template_id, modifications, output_format }` payload
  (`video-worker/index.ts:1492`), never composition JSON.
- **Legacy (composition-mode):** composition JSON built inline from `c.client_brand_profile` and hardcoded
  layout logic — `buildStatRevealSpec`/`buildKineticTextSpec` (`video-worker/index.ts:1222-1343`),
  `buildImageQuoteScript`/`buildAnimatedDataScript` (`image-worker/index.ts:774-866`).

**Contract clause:** a governed render request never carries free-floating asset URLs or unreviewed text —
every field traces back through §2/§3 to a resolver, not to inline client-profile lookups. The legacy path
is the only place `c.client_brand_profile` is read directly for logo/colour at render time
(`video-worker/index.ts:1113-1130`).

---

## 2. Template / format identity

Identity resolution is one RPC: **`public.select_template(p_client_slug, p_platform, p_format,
p_variant_intent, p_seed)`** (`supabase/migrations/20260703035154_create_select_template_v1.sql:81-417`),
`SECURITY DEFINER`, `service_role`-only, read-only, called identically by both workers.

- **Decision chain, first-failing-filter wins** (`:19-45`): client resolved → candidate set = variant
  candidates matching `format_key` → generic-scope only (v0) → provider-template `status ≥
  smoke_rendered` → platform-suitability present → client `assignment_status ≥ visually_approved` **with
  a passed `visual_approval` proof event on that assignment** → `resolve_slot_assets` succeeds → survivors
  ranked (not filtered) by variant-intent match. **Every rejection carries a machine-readable
  `reason_code`**; the full `rejected[]`/`alternatives[]` payload returns even on success (`:16-17`).
- **The registry's 12-rung provider-template `status` ladder (`discovered → … → production_proven`,
  `supabase/migrations/20260630042316_tmr3_template_metadata_registry.sql:68-73`) is largely aspirational
  as a *selection* gate.** `select_template` only requires `status ≥ smoke_rendered` on that column
  (`create_select_template_v1.sql:196-199`). The **real** selection eligibility gate is a different pair
  of facts: `c.creative_template_client_assignment.assignment_status ≥ visually_approved`
  **and** a `c.creative_template_proof_event` row (`proof_type='visual_approval'`, `proof_status='passed'`)
  on that specific assignment. **A template can be selectable and rendering in production while its own
  registry `status` column still reads `smoke_rendered`** — confirmed live (row 5 of the graduation
  contract has 60 real renders and a `production_proven` PP assignment while `status` has never been
  bumped past `smoke_rendered`, `docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md:107-109`).
  A provider-neutral contract must resolve identity against the assignment+proof-event pair, never against
  the provider-template `status` column alone.
- **Binding continuity, not just binding.** `assertStatTemplateBindingMatch`
  (`video-worker/b1_video_stat.ts:257-290`, invoked `video-worker/index.ts:1458`) compares the template
  binding an earlier `ai-worker` generation-time call recorded on the draft against the render-time
  `select_template` winner, and throws `b1_video_stat_template_binding_mismatch` on drift — a real,
  shipped defense against "validate against template A, silently render against template B"
  (`b1_video_stat.ts:240-249`). The image path has no equivalent binding-continuity check found in this
  pass. **Any provider adapter that resolves identity once at generation time and again at render time
  needs this guard — its absence is a silent-drift risk, not a hypothetical one.**
- **Modification-key grammar is per-template, not standardized even within one provider.** The stat
  template uses bare keys (`'StatValue'`); the kinetic template uses suffixed keys
  (`'HookHeadline.text'`) — confirmed against the live provider template, not assumed
  (`video-worker/index.ts:136-139`). A provider-neutral contract cannot assume one key grammar per
  provider, only per template.
- **"Never guess a layout."** Image's per-winner text-field mapping is a hardcoded allowlist,
  `TMR_WINNER_TEXT_FIELDS` (`image-worker/b1_production.ts:212-272`, four winners mapped today). An
  unmapped winner throws `tmr_winner_unmapped` rather than guessing a layout (`b1_production.ts:372-375`).
  This fail-loud doctrine is a design principle to carry into any provider-neutral identity/binding layer
  verbatim: an unrecognized template/variant is a hard stop, never a best-effort render.

---

## 3. Asset and field binding

Governed renders receive **no free asset URLs from the worker** — everything comes from
`slot_resolution.modifications`, itself produced by `public.resolve_slot_assets` inside the same
`select_template` call (migration decision-chain step `f`, `:38-40,274-281`).

- **Logo is hard-required** on both workers; its absence throws (`tmr_video_slot_resolution_incomplete` /
  `tmr_slot_resolution_incomplete`, `b1_video_stat.ts:523-525`; `b1_production.ts:383-385`). **Background is
  optional on video** (baked-background templates simply omit the key, `b1_video_stat.ts:527-533,557-559`)
  **but required on image** (`b1_production.ts:383-385`) — a real, documented asymmetry a provider-neutral
  contract must either standardize deliberately or state per-format, not paper over.
- **Voice:** `resolveGovernedVoice(supabase, clientId)` (`video-worker/voice_id.ts`) reads
  `c.client_voice_config`, fail-closed to `{voiceId:null, method:'unresolved'}` internally on any
  error/missing/disabled row (`video-worker/index.ts:513-520`) — **the resolver itself never throws; the
  caller decides absence is fatal** and throws (`video-worker/index.ts:1475`). This "resolver returns a
  null state, caller decides severity" split is a pattern worth keeping distinct from Tier-1 hard-gates
  (§4) in any provider-neutral binding layer.
- **Music:** `resolveGovernedMusicBedUrl` calls RPC `public.select_music(...)`
  (`video-worker/index.ts:902-917`). **An RPC error throws** (`b1_video_missing_music_rpc`), but **an
  empty result set is a legitimate silent bed** (`MusicBed.source=''`), never conflated with a failure to
  determine state (doctrine stated `:893-896`). A provider-neutral binding contract must keep
  "resolver determined there is legitimately nothing here" and "resolver failed to determine anything"
  as two distinct signals — collapsing them is exactly the representational bug behind the silent-template
  trap (§6.2).
- **Eyebrow text** (governed, per-winner baked value, `c.creative_provider_template_field`): missing/blank
  throws `b1_video_stat_eyebrow_value_missing` — **deliberately no freeform/default fallback**
  (`b1_video_stat.ts:308-336`). Governed content never silently defaults to unreviewed text.
- **Output-geometry correction is fenced off from content bindings.** `assertParityOverlayDisjoint`
  (`b1_video_stat.ts:186-198`) throws `b1_video_parity_overlay_conflict` if the render-time output-parity
  overlay (TPR-1 correction, §6.1) would ever touch an asset `.source` or `.volume` key — the overlay may
  only ever correct output dimensions/duration, never content. This disjointness guarantee is a contract
  clause, not an implementation detail: a provider-neutral binding layer must keep "what geometry this
  renders at" and "what content this renders" structurally unable to collide.

---

## 4. Validation and fail-closed behavior

Two tiers, and a provider-neutral contract must keep them distinct — they carry different guarantees.

**Tier 1 — hard-gate, throw, no fallback ("never guess").** Every one of these throws before (or instead
of) spending a provider render:

- `assertStatFieldsWithinGate` / `assertHeadlineWithinGate` — blank or over-`max_chars` text throws;
  explicitly "no truncation, no AI rewrite" (`b1_video_stat.ts:210-231`, `b1_production.ts:98-118`).
- `assertKineticScenesWithinGate` (`video-worker/index.ts:133-139`) — structural + char-limit gate.
- `assertAudioSpec` (`video-worker/index.ts:768-779`) — every declared audio element must have a
  non-empty string source and, for composition-mode specs, a percentage-string volume
  (`/^\d{1,3}%$/`) — the historical root cause it closes was a `-58 LUFS` volume read as a `0–1` fraction
  instead of a percentage (`video-worker/index.ts:414-422`). No-ops when the spec declares no audio.
- `assertParityOverlayDisjoint`, `assertStatTemplateBindingMatch`, the eyebrow max-chars check — all
  described above, all fail-loud.
- `getGovernedVideoClientSlug`/`getGovernedClientSlug` — throws `governed_slug_unresolved` rather than
  silently falling back to the raw client-id UUID, closing a documented past defect class
  (`video-worker/index.ts:555` comment; `docs/architecture/current-ice-flow-v3.md:41-46`). **Governed
  identity resolution must never silently degrade to an ungoverned identity.**
- No fallback exists from a governed branch to the legacy render path on any Tier-1 throw — stated
  repeatedly by design ("Governed-only, fail-loud... no fallback," `video-worker/index.ts:1626-1627`).

**One named exception — fail-closed means "silently take the legacy path," not throw.**
`isVideoGovernanceEnabled`/`isImageGovernanceEnabled` (`video-worker/index.ts:1344-1358`;
`image-worker/image_governance.ts:26-40`) read `c.client_creative_governance.enabled` and fail-closed to
`false` on any read error or missing row — the governed branch simply does not fire and the request falls
through to the legacy composition path. **This is different failure semantics from every other gate in
this section**: absence of governance enablement is not a validation failure, it is a routing decision, and
a provider-neutral contract must document this distinction explicitly rather than imply all fail-closed
paths behave the same way.

**Tier 2 — WARN-only, never throws, observability only.** `validateContract`
(`image-worker/contract_validation.ts:52-136`) checks contract-identity match, headline/subtitle length,
and asset presence, writing a `{status:'pass'|'warn', checks[], warnings[]}` block into
`render_spec.contract_validation` — explicitly does **not** gate the render, alter `image_status`, or
change queue/publish behavior (`contract_validation.ts:6-7`). **No video-worker equivalent was found in
this pass** — video's validation is exclusively Tier-1. A provider-neutral contract should keep the
Tier-1/Tier-2 split as a first-class concept (hard-gate vs. advisory-observed), not assume every provider
implementation needs both.

**Retry/backoff (video; not independently confirmed for image in this pass).**
`classifyRenderFailure(msg)` (`video-worker/index.ts:711-715`) buckets any thrown message `'transient'`
(timeout/5xx/network/fetch-failed/temporary/failed-to-download, regex-matched) or `'terminal'` (the
default — an unknown error is never retried forever). Transient-under-cap
(`MAX_VIDEO_RENDER_ATTEMPTS=3`, `VIDEO_RETRY_BACKOFF_MIN=10` min, `:684-685`) resets to
`video_status='pending'` with a backoff timestamp; terminal or transient-at-cap sets `video_status='failed'`
with a named `video_dead_reason`. Draft claiming is race-safe via `SECURITY DEFINER` RPC
`claim_pending_video_drafts` (`FOR UPDATE SKIP LOCKED`, `:1789-1797`), replacing an earlier unlocked
`SELECT` that could double-render.

---

## 5. Render evidence

The production writer is `renderUploadAndLog` (`video-worker/index.ts:940-1111`), calling RPC
`write_render_log` (13 params: draft/slide/client/format ids, `render_engine='creatomate'`, provider
render id, `status`, output/storage URL, credits, duration, error, `render_spec`) into **`m.post_render_log`**
(column-purpose audit: `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql:66-97`).

- **Currency note:** that audit (2026-05-02) found `render_spec` NULL on all 932 rows at the time. By the
  current code, `render_spec` **is** populated for governed branches via `composeRenderSpec(qa,
  {label, template})` (`video-worker/template_smoke.ts:20-29`) — a `qa` block, an optional `label`
  (e.g. `B1_VIDEO_PRODUCTION_LABEL`), and an optional `template` block carrying the full TMR evidence
  (winner id, registry template id, assignment id, variant key, seed, `bind_mode:'resolved'`,
  `resolver_used:true`, `slot_reasons[]`/`slot_warnings[]`, `selector_status`, an `audio:{voiceover,
  music_bed}` flag pair, and an `output_spec` naming whether dimensions came from the parity overlay or
  the provider default). **Whether legacy composition-mode renders populate `render_spec` today was not
  independently confirmed in this pass — named open question, §9.**
- **This is telemetry evidence, not proof-ladder evidence — the two are separate systems.** The TMR proof
  ladder (`c.creative_template_proof_event`, `proof_type ∈ {smoke_render, visual_approval, platform_render,
  platform_publish}`) is a distinct table, written through a separate (and, as of this pass, unverified —
  §9) write path. No code in either worker inserts into `c.creative_template_proof_event`. A `render_spec`
  block on a `post_render_log` row is evidence a human/auditor can inspect after the fact; it is not itself
  a proof-event insert.
- **Music provenance is explicitly best-effort, not guaranteed.** `record_music_usage`
  (`video-worker/index.ts:1101-1109`) deliberately does not fail the render on write failure — a named
  PK-ruled trade-off (2026-07-10, `:222-232`), logged loudly on failure but never fatal. A provider-neutral
  contract should mark any similarly "nice-to-have, never blocking" evidence writes the same way, rather
  than implying every evidence write carries the same guarantee.

---

## 6. Provider response normalization

Two real, named, closed production incidents are the canonical lessons a provider-neutral
response-normalization layer must encode without re-deriving them the expensive way.

### 6.1 TPR-1 (Template Parity) — declared spec ≠ measured output

**Origin rule** (`docs/00_sync_state.md:48`, restated `docs/briefs/tpr-1-addendum-v1.md:18-20`): any
repoint of a governed format's default template must diff the output spec (resolution/duration/codec) of
outgoing vs. incoming and state the delta at Gate 1. **Origin incident:** a v6.48 B-roll activation shipped
a silent `1080×1920/12s → 720×1280/8s` product downgrade that three independent review rounds
(`db-rls-auditor`, `apply-harness-auditor`, external review) all missed, because a selector repoint reads
as a config change, not a product-output change (`tpr-1-addendum-v1.md:22-24`).

**The addendum (TPR-1.a–f, ratified 2026-07-29)** closes a follow-on gap the original rule couldn't see:
a later activation corrects output geometry **at render time** (a worker-code overlay constant), not in the
saved provider-template row — so a registry-only spec check would report a `1080×1920/12s` production
default as `720×1280/8s`, wrongly (`tpr-1-addendum-v1.md:40-44`). The fix is a mandatory **three-surface
effective-spec model**: **Surface A** — the saved provider-template spec (`c.creative_provider_template`);
**Surface B** — the worker-applied render-time overlay (a code constant); **Surface C** — the measured
output from a real production-signature render (`tpr-1-addendum-v1.md:60-76`). Any future repoint must
name all three plus a `specs_match=true|false` verdict; overlays may only ever correct geometry, never
governed bindings (`assertParityOverlayDisjoint`, §3).

**Contract clause:** a provider-neutral response-normalization layer needs a "declared vs. effective vs.
measured" spec concept, not just "declared." A layer that only reads a provider's declared template
metadata reproduces exactly the class of defect TPR-1 exists to catch.

### 6.2 The silent-template trap — two named instances, one representational lesson

No single canonical definition of this phrase exists elsewhere in the repo (it is coined in the M10 row
itself, `creatomate-global-ultimate-final-delta-audit-v1.md:399`) — this document treats it as covering
both concrete incidents below rather than picking one silently:

- **(a) Fenced silent/background-free templates mistaken for capability.** Six fenced generic video
  templates are silent + background-free (0-audio-track intake) — not drop-in governed candidates; writing
  candidacy rows for them would record a false capability (`docs/briefs/ice-asset-gap-register-v1.md:286-289`).
  "Audio is never measured anywhere in ICE — any 'video succeeded' row is not proof of audio"
  (`ice-asset-gap-register-v1.md:408-410`).
- **(b) The silent-plan/audio-gate representation collision (v3.17.1, production incident, 2026-08-03).**
  The governed `video_short_kinetic` silent-scope plan always bound `'VoiceAudio.source': ''` — an
  empty-but-present key. `assertAudioSpec` correctly exempts only `MusicBed.source=''` as an intentional
  silent bed and throws on any *other* empty declared source — so every governed kinetic render died at the
  pre-render gate (`video-worker/index.ts:3-24`, confirmed against production failure on draft `90381483`).
  **Fix:** the silent kinetic plan now **omits** `VoiceAudio.source` entirely rather than setting it to
  `''`, so `assertAudioSpec` is a no-op and `specHasAudio()` correctly evaluates `false`, exempting the
  plan from post-render audio enforcement (`video-worker/index.ts:12-20`, marker
  `KINETIC_SILENT_VOICE_OMIT_MARKER`). This fix landed hours before the CGU-v1 25/25 verdict and is the
  concrete reason PP YouTube kinetic went from failing to production-published
  (`docs/briefs/results/cgu-v1-final-reread-and-verdict-v1.md:30-33`).

**Contract clause:** a template/format that is silent *by design* must remain representationally
distinguishable from a template that declared audio and silently lost it. "Key present, value empty" is
not a safe way to represent "no audio" — omission, not an empty string, is the only representation that
survives a strict presence-vs-loudness gate correctly. Any provider adapter's silence-declaration
convention must be checked against this specific failure mode before being trusted.

### 6.3 The audio-presence-vs-loudness gap

Two layers exist, only one is built. **Phase A (live, v3.14.0):** pre-render `assertAudioSpec` (§4) plus
post-render `mp4HasAudioTrack(bytes)` (`video-worker/index.ts:723-729`) — a pure byte-scan for the ASCII
`'soun'` `hdlr` handler-type marker a real audio track carries, gated to only fire when the spec declared
audio (`specHasAudio`, `:785-787`). A voiced/music render that comes back with no `'soun'` marker throws
`AUDIO_STREAM_MISSING` **before storage upload, before `video_status` is ever set to `'generated'`**
(`video-worker/index.ts:986-997`) — i.e. before auto-publish becomes reachable. A legitimately silent
format is exempt and only logs a skip line. **Phase B (true integrated-LUFS loudness measurement) is
explicitly, repeatedly deferred — not implemented** (`video-worker/index.ts:171-172,204-205`; corroborated
by M1's own delta-audit row, "true LUFS measurement exists only as an offline harness tool, never wired to
a live render," `creatomate-global-ultimate-final-delta-audit-v1.md:390`).

**Contract clause:** "renders successfully," "has an audio track," and "is audible content" are three
distinct claims. This provider's response normalization currently supports the first two only. A
provider-neutral contract must keep them as three separately-named checks so a future provider adapter (or
M1's own LUFS build-out) can add the third without redefining what the first two already mean.

### 6.4 Poll/timeout normalization

Submit and poll are isolated in `video-worker/creatomate_submit.ts`, deliberately moved out of `index.ts`
so it can be imported without triggering the module's top-level `Deno.serve` side effect (`:1-34`).
`pollRender` polls every 2.5s up to 48 attempts (2-minute ceiling) and throws `Render timed out after 2
minutes` on exhaustion (`:43-54`). A v3.16.2 fix (`video-worker/index.ts:70-91`) ensures the Creatomate
render id survives to the failure-path log even when failure happens after a successful submit but during
polling — previously this traceability silently degraded to `null`.

---

## 7. Publication handoff

Two legitimate, structurally different handoff shapes coexist — a provider-neutral contract must
accommodate both, not assume one:

- **YouTube bypasses the shared publish queue entirely.** `youtube-publisher/index.ts` selects directly off
  `m.post_draft` (`video_status='generated'`, `approval_status ∈ {approved,published}`,
  `:452-456`), claims race-safely via a `draft_format.yt_publish_claim_at` TTL marker under READ COMMITTED
  (`:267-271,568-569`), and on success sets `video_status='published'` directly on the draft
  (`:531,647-648`). Independently confirmed by the architecture snapshot: "YouTube bypasses the publish
  queue... `youtube-publisher` selects approved drafts directly" (`docs/architecture/current-ice-flow-v3.md:66,231-232`).
- **Every other platform goes through a shared queue.** `auto-approver/index.ts` sets `approval_status`
  (`'approved'` or `'rejected'`, firing `trg_handle_draft_rejection`, `:265-267,310-316`); qualifying
  drafts enter `m.post_publish_queue`; `publisher/index.ts` consumes the queue and on success **inserts
  into `m.post_publish`** (`:553-562`), marking the queue row `status:'published'`; on failure it inserts a
  `status:'failed'` row (`:581-582`) or requeues with backoff (`:571`). **An unapproved draft never reaches
  the publish-evidence table at all** — no `post_publish` row is written for a draft held at the approval
  gate (`:408-410`), by design.

**Contract clause:** publication handoff is a stage, not a single mechanism — a provider-neutral contract
must name "does this format/platform bypass the shared queue" as an explicit, per-format property, not an
implicit assumption inherited from whichever platform was built first.

---

## 8. Observability and rollback boundaries

**No in-worker rollback or compensation exists.** A render failure fails the draft; it is retried (per §4),
never compensated — there is no "undo a partial render" logic, because renders are not transactional
side-effecting operations against external state in a way that needs compensation.

**The Governor pattern (`docs/governance/governor-architecture.md`) governs deploy/git state, not
render-contract correctness.** That spec is explicitly "Phase 0 — accepted architecture, no
implementation... No Governor named here is built yet" except `branch-warden`, its reference implementation
(`governor-architecture.md:3-5`). Of the named Governors, only two are realized: `branch-warden` (git
state, proven) and — per CLAUDE.md's team table, cross-referencing this same spec's §3/§10 — `deploy-verifier`
(post-deploy content/drift verification, proven 2026-07-19). **Neither governs the render contract itself**
(template identity resolution, asset binding, render-evidence correctness) — both govern deploy/git/DB-apply
state. `drift-check`/`tmr-drift-probe` exist as separate edge functions; their depth was not independently
re-verified in this pass (§9).

**The actual render-correctness enforcement mechanism today is entirely in-path, inside the worker** — the
Tier-1 fail-closed gates of §4 and the audio-track check of §6.3. This is architecturally different from
the Governor pattern: Governors are external, stateless, read-only, and advisory-only by contract
(`governor-architecture.md:65-91`); the worker's gates are internal, enforce at mutation time, and can
themselves block the very operation they observe. **A provider-neutral contract should keep these two
enforcement layers named separately** — render-level failures are handled by the in-path retry/dead-letter
mechanism inside the contract (§4/§5); deploy/schema-level failures are handled by the Governor pattern
outside it. Conflating them would misdescribe both.

---

## 9. Current production footprint (grounding, not spec)

Per the M11a legacy-routing inventory (`docs/briefs/results/m11a-legacy-routing-inventory-result-v1.md`,
2026-08-04) and the CGU-v1 verdict, the honest current split — not a universal claim:

| Client × format | Verdict | Note |
|---|---|---|
| PP/NDIS/CFW/Invegent × `image_quote` (FB/IG/LI) | **GOVERNED** | Live post-cutover for all four; pre-cutover history only in the "legacy" counts |
| All 4 clients × `text` (FB/LI) | **CAPABILITY-EXEMPT** | `render_engine='none'`, no `select_template` fork by design |
| PP × `carousel` (FB/IG) | **DECLARED-LEGACY-GOVERNED** | 100% `render_spec IS NULL`, never TMR-routed, despite a governance row (D2) declaring it intentional |
| PP × `video_short_stat` (YT) | **MIXED, transitioning** | governance row since 2026-07-09; `_voice` variant 100% legacy, permanently |
| NDIS × `video_short_stat` (YT) | **MIXED, just switched on** | governance row 2 days old at audit time |
| PP × `video_short_kinetic` (YT) | **MIXED, was legacy 3 days before this audit** | 19 legacy successes pre-governance-row vs. 1 true-governed success |
| CFW/NDIS × `carousel` | **UNDECLARED-LEGACY** | identical legacy path as PP, zero governance row of any kind — CFW alone: 171 succeeded/90d |

Two structural traps this footprint makes concrete, and any provider-neutral contract must design *for*,
not just document: **(1)** the `_voice` format-key suffix is **permanently, structurally excluded** from
the governed contract by a strict `===` match, not a transitional gap
(`m11a-legacy-routing-inventory-result-v1.md:66-86`); **(2)** an exact format-key match is **necessary but
not sufficient** — a cell legacy-routes until that client's `c.client_creative_governance` row actually
exists, so a cell can flip from legacy to governed the instant a governance row is created, with zero code
change (`m11a-legacy-routing-inventory-result-v1.md:127-149`).

**Architecture-snapshot currency warning:** `docs/architecture/current-ice-flow-v3.md` is dated 2026-06-26
and predates the entire governed-video buildout described in this document. This document is grounded
directly against worker source (§1–§8), not against that stale snapshot.

---

## 10. Acceptance matrix

| # | Contract element | Grounded in | Extracted from ≥2 real implementations? | Status |
|---|---|---|---|---|
| 1 | Governed input (§1) | `b1_video_stat.ts`, `b1_video_kinetic.ts`, `b1_production.ts` builders | Yes — stat + kinetic + image_quote | PASS |
| 2 | Template/format identity (§2) | `create_select_template_v1.sql`, graduation-contract §1.2, `assertStatTemplateBindingMatch` | Yes — shared RPC, per-template key-grammar divergence shown | PASS |
| 3 | Asset/field binding (§3) | voice/music/eyebrow resolvers, `assertParityOverlayDisjoint` | Yes — video vs. image asymmetry named | PASS |
| 4 | Validation/fail-closed (§4) | Tier-1/Tier-2 asserts, governance-enablement fail-closed-to-legacy | Yes — video Tier-1 exhaustive, image Tier-2 named as video-absent | PASS |
| 5 | Render evidence (§5) | `write_render_log`, `composeRenderSpec`, proof-event table separation | Partial — legacy `render_spec` population unverified (§9 open item) | PASS WITH OPEN ITEM |
| 6 | Provider response normalization — TPR-1 / silent-template trap / audio-loudness (§6) | `tpr-1-addendum-v1.md`, kinetic v3.17.1 fix, `assertAudioSpec`/`mp4HasAudioTrack` | Yes — all three lessons cited to closed production incidents | PASS |
| 7 | Publication handoff (§7) | `youtube-publisher`, `auto-approver`/`publisher` queue path | Yes — two coexisting shapes both cited | PASS |
| 8 | Observability/rollback boundaries (§8) | `governor-architecture.md`, in-worker gate enforcement | N/A (architectural, not per-format) | PASS |
| 9 | Current-footprint honesty check (§9) | M11a inventory, CGU-v1 verdict | N/A | PASS |
| — | **M10's own finite acceptance test** (delta-audit `:399`): *"A design doc exists, extracted from ≥2 real format implementations... without re-deriving TPR-1, the silent-template trap, the audio-presence-vs-loudness gap"* | This document | Yes | **DRAFT COMPLETE — pending PK ratification** |

---

## 11. Dependencies

```
CGU-v1 verdict (Phase 0 CLOSED, 2 real formats proven) ─→ this document authorable
  ─→ PK Gate-1 review/ratification ─→ M10 row closes in the register
      (a future provider-abstraction lane may then implement against this contract —
       not scoped, not authorized, not scheduled by this document)
```

- **Phase 0 CLOSED** — satisfied; cited throughout (CGU-v1 verdict, 2026-08-04). This document could not
  have been grounded in ≥2 real implementations before this closed.
- **M11a inventory** — this document benefits from, is not blocked by, M11a's finding that governance-row
  existence (not code-path existence) is the real governed/legacy discriminator (§9).
- **No second render provider** is named, scoped, or assumed by this document — an explicit hard exclusion
  the parent programme already states (`creatomate-global-ultimate-final-delta-audit-v1.md:430`).

---

## 12. Exclusions (out of scope — this document)

Implementation of a provider abstraction layer · a second render provider · refactoring
`video-worker`/`image-worker` into shared code · any DB/migration/RPC/deploy change · building out any
Governor named in `governor-architecture.md` · implementing Phase-B LUFS measurement (M1's scope, not
M10's) · resolving the WS-5 kinetic lane's unreconciled "rung 6–13" proof numbering (named in the sibling
M9 document's §4, not this one) · closing M10 in the register (a PK ratification act).

---

## 13. Open questions / named handoffs

1. **Proof-event write-RPC status is unverified in this pass.** A companion doc,
   `docs/briefs/tmr-template-proof-lifecycle-v1-g1-write-rpc-apply-result.md`, appears by title to record
   its application, but was not read here — verify before assuming §5's proof-ladder/telemetry separation
   still matches current reality.
2. **Whether legacy composition-mode renders populate `render_spec` today was not independently confirmed**
   — the 2026-05-02 audit found it universally NULL; only governed-branch population was directly traced in
   this pass (§5, §10 row 5).
3. **The "silent-template trap" term has no single canonical definition elsewhere in the repo** — this
   document treats it as covering both named incidents (§6.2); if PK intends a narrower or different
   referent, this section should be revised, not silently reinterpreted downstream.
4. **`drift-check`/`tmr-drift-probe` depth was not independently re-verified** — named present, not audited,
   in §8.
