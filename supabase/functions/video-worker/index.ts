// video-worker v3.7.0
// ============================================================================
// v3.7.0 (2026-07-10, cc-0034 — GOVERNED MUSIC-USAGE RECORDING, DARK/ADDITIVE):
//   ADDITIVE. A governed video render now records WHICH governed music track it consumed, into
//   m.music_usage_event, via the NEW RPC public.record_music_usage. WHAT CHANGED (all additive):
//     (1) resolveGovernedMusicBedUrl now returns { url, trackId } instead of a bare url string —
//         select_music already returns track_id in its row, so the track_id is no longer discarded.
//         SEMANTICS UNCHANGED: an RPC error still THROWS b1_video_missing_music_rpc (never a silent
//         degrade); an empty result set → { url:'', trackId:null }. (row→bed mapping = the pure
//         mapSelectMusicRow in ./music_usage.ts.)
//     (2) renderUploadAndLog gains ONE optional opt, musicUsage?: { trackId, format } | null. AFTER
//         a SUCCESSFUL render, AFTER the existing write_render_log call, and OUTSIDE the render
//         try/catch, if musicUsage is present AND the Creatomate renderId is non-null it calls
//         public.record_music_usage (p_render_id = the CREATOMATE render UUID; p_platform = NULL
//         deliberately — a draft fans out to many platforms). Idempotent per render id (RPC ON
//         CONFLICT DO NOTHING). A USAGE-WRITE FAILURE NEVER FAILS THE RENDER (PK 2026-07-10, reversing
//         the earlier strict-throw): recordMusicUsage returns a result and never throws; on failure
//         the render is kept and we LOG the stable code b1_video_music_usage_write_failed —
//         console.error for production drafts, console.warn for the supervised smoke — then continue.
//         *** CONSEQUENCE (do not soften): a governed PRODUCTION render can now succeed and PUBLISH
//         with NO usage row if the record_music_usage write fails. Music provenance is BEST-EFFORT,
//         not guaranteed. The loud console.error is the ONLY signal — there is no durable alarm and
//         no retry here (a pipeline_incident row is a separate lane). *** This trade was chosen
//         because failing the render would set post_draft.video_status='failed', write a SECOND
//         'failed' render_log, and RETRY — re-rendering and re-spending Creatomate credits on an
//         artifact that already succeeded; losing a bookkeeping write must not destroy a paid render.
//         Every existing caller passes NO musicUsage, so their behaviour is byte-identical (the
//         record helper no-ops when musicUsage is absent).
//     (3) renderGovernedVideoStat + the governed_video_stat_smoke entrypoint pass
//         musicUsage = bed.trackId ? { trackId, format } : null (musicUsageFromBed) — so zero
//         eligible tracks (silent bed) → no musicUsage → NO usage row (D3: record ONLY when a bed
//         was actually bound). MusicBed.source binding is UNCHANGED ('' when no bed, key always
//         present — buildGovernedVideoStatPlan untouched).
//   NOTE — public.record_music_usage is APPLIED (ledger 20260710121423, 2026-07-10). It REQUIRES a
//   non-NULL p_render_id (a NULL cannot be deduplicated by the partial unique index) and is idempotent
//   per Creatomate render id. Note also that select_music now REQUIRES content_id_safe (ledger
//   20260710115043) and NO track in the library is Content-ID-safe — so today every governed render
//   binds no bed, writes no usage row, and emits no alarm (the D3 no-op, not a failure).
//   STRICTLY OUT OF SCOPE: select_music SQL, write_render_log, the legacy MUSIC_LIBRARY/
//   resolveMusicUrl/VIDEO_WORKER_MUSIC_ENABLED path, isKinetic/isStat/_voice, buildGovernedVideo
//   StatPlan modifications keys, assertStatFieldsWithinGate, the enabled governance gate, pollRender,
//   composeRenderSpec — all BYTE-UNCHANGED. No migration/apply, grant, secret, flag flip, or deploy.
//
// video-worker v3.5.0
// ============================================================================
// v3.5.0 (2026-07-09, CREATIVE-LIBRARY VIDEO TMR PHASE 2 — GOVERNED video_short_stat, DARK):
//   ADDITIVE + SHIPS DARK. New Property-Pulse-ONLY governed VIDEO stat-reveal branch in
//   processDraft, the VIDEO counterpart of the proven image-worker B1 governed image_quote
//   branch. Governing brief docs/briefs/creatomate-video-tmr-sprint-phase2-packet-v2.md
//   (PK Gate 1 2026-07-09; D1(a) provider-template-bound, D2=baked still-image background).
//   WHAT CHANGED (all additive; every existing branch body + helper is BYTE-UNCHANGED):
//     (1) NEW pure module ./b1_video_stat.ts (no side effects) — isB1GovernedVideoStat(
//         clientId, format) [gate keys on client_id + 'video_short_stat', NOT the _voice
//         variant], assertStatFieldsWithinGate (4 hard-gates: stat_value≤12 / stat_label≤48 /
//         context_line≤160 / cta_text≤90, policy hard_gate_throw, no truncation), and the
//         PURE buildGovernedVideoStatPlan → { providerTemplateId, modifications, templateSpec }.
//     (2) NEW async isVideoGovernanceEnabled(supabase, clientId, format) reads
//         c.client_creative_governance.enabled (service-role, read-only, fail-closed: any
//         error/missing → false). At v3.5.0 ship the (PP, video_short_stat) row was enabled=FALSE
//         (migration 20260708000000, seeded DARK), so the gate was FALSE → the governed branch did
//         not fire → the legacy isStat path ran → behaviour byte-identical. (The row was later
//         armed enabled=true on 2026-07-10; see the isVideoGovernanceEnabled doc below for the
//         current ARMED state.)
//     (3) NEW async renderGovernedVideoStat(...) — DIRECT-BIND to provider template
//         901a30ce-292a-4e4f-8e46-fef93f71e098 (PK-pinned; select_template routing REPLACES
//         this once the render is visually approved — see b1_video_stat.ts). Template-mode
//         renderScript = { template_id, modifications, output_format:'mp4' } (Background BAKED;
//         5 dynamic mods StatValue/StatLabel/ContextLine/CtaText/Logo.source). Reuses the
//         UNMODIFIED renderUploadAndLog (polymorphic on renderScript shape); stamps render_spec
//         label='creative_library_video_stat_production' + a nested tmr evidence block via the
//         EXISTING templateSpec/renderSpecLabel opts (renderUploadAndLog byte-unchanged).
//     (4) EARLY-RETURN fork at the top of processDraft, BEFORE the isKinetic/isStat block:
//         if (isB1GovernedVideoStat && await isVideoGovernanceEnabled) → render governed → return.
//         At v3.5.0 ship the row was DARK so this fork was never taken; the row is now armed
//         (enabled=true, 2026-07-10) → the fork IS taken for PP video_short_stat.
//     (5) NEW supervised SMOKE entrypoint (mode==='governed_video_stat_smoke') in Deno.serve,
//         BEFORE draft selection, mirroring the retired B0 image/video smoke mechanism: renders
//         the governed template with SAMPLE fields to post-videos/_smoke/, writes ONE
//         post_render_log row (postDraftId=null, clientId=null, logMustSucceed=true), and
//         RETURNS. It does NOT read a production draft, does NOT require enabled=true, does NOT
//         flip enabled, does NOT publish.
//   STRICTLY OUT OF SCOPE: buildStatRevealSpec / renderUploadAndLog / pollRender / getBrand /
//   getVoiceIdForDraft / resolveMusicUrl / generateAndUploadVoice / buildKineticTextSpec and
//   EVERY kinetic/voice/captions/music/QA path are BYTE-UNCHANGED; the _voice variant is NOT
//   governed; NO DB migration/apply, NO grant/revoke, NO new secret, NO flag flip, NO deploy,
//   NO live render in this change. Every format other than PP video_short_stat, and every other
//   client, is byte-identical.
//
// video-worker v3.4.0
// ============================================================================
// v3.4.0 (2026-07-05, LANE W / TMR DEAD-REFERENCE CLEANUP — C3):
//   Governing plan docs/briefs/tmr-dead-reference-cleanup-plan-packet.md Lane W;
//   recon result docs/briefs/results/creatomate-provider-reconciliation-v0-result.md;
//   guard rule TMR-GOV-PROVIDER-1. WHAT CHANGED: the manual-only Gate D2 video
//   template_smoke surface is RETIRED — its provider template bc32f52f… (PP 9:16
//   news video) was DELETED provider-side in the 2026-07-04 cleanup (recon Leg-3
//   discovery). The smoke branch BODY in Deno.serve is removed and the mode now
//   returns an EXPLICIT 410 guard ({ ok:false, error:'template_smoke_retired',
//   note:'retired 2026-07-05 Lane W …' }) so a stray manual request can NEVER fall
//   through toward the production loop (design D-W1 — guards, not silent removal).
//   ./template_smoke.ts is TRIMMED to its single LIVE export composeRenderSpec
//   (consumed by the PRODUCTION renderUploadAndLog at all 4 render_spec log sites);
//   SMOKE_TEMPLATE_NAME/SMOKE_PROVIDER_TEMPLATE_ID/SMOKE_RENDER_SPEC_LABEL/
//   isSmokeRequest/buildSmokeModifications/buildTemplateRenderScript/computePropsHash/
//   buildRenderSpecTemplate are removed; template_smoke_test.ts trimmed to
//   composeRenderSpec coverage. WHAT IS STRICTLY OUT OF SCOPE: renderUploadAndLog and
//   EVERY production render path (kinetic/stat/voice/captions/music/QA) are
//   BYTE-UNCHANGED except the import line; NO change to draft selection, queue,
//   publisher, p_render_engine values, DB/migration, secrets; NO deploy in this change.
//
// video-worker v3.3.1
// ============================================================================
// v3.3.1 (2026-06-26, H2 POLICY REFINEMENT — PROCEED-ON-TRANSIENT):
//   resolveLegacyLogo() NO LONGER throws on a transient pre-flight result; the
//   RenderAssetTransientError class is removed. A storage/network blip on the
//   bounded ranged GET (transient_5xx | timeout | network) now returns the ORIGINAL
//   logo URL ({ logoUrl: rawUrl, fallback: 'transient_proceed' }) so the render
//   proceeds with the logo passed through to Creatomate (source of truth) — exactly
//   the pre-H2 behaviour for that case. Only a DEFINITIVE 4xx/malformed still drops
//   the logo to the wordmark/no-logo path ({ logoUrl: null }); null stays null_logo;
//   2xx/206 stays pass-through. The per-draft try/catch is unchanged.
//
// v3.3.0 (2026-06-26, H2 — ASSET-URL VALIDATION BEFORE CREATOMATE):
//   ADDITIVE. A non-null but UNREACHABLE brand logo URL previously hard-failed
//   Creatomate; the kinetic/stat builders only drop the logo element on a NULL
//   logoUrl. New pure module ./asset_url_guard.ts (single bounded ranged GET, no
//   DB/secret/side-effect) classifies a URL ok / broken_4xx / transient_5xx /
//   timeout / network / malformed. In processDraft, ONE logoMemo Map per request
//   is created and the brand logo (b.logoUrl) is validated via resolveLegacyLogo()
//   BEFORE the kinetic/stat spec is built; the VALIDATED logoUrl OVERRIDES b.logoUrl
//   into buildKineticTextSpec/buildStatRevealSpec (their `if (logoUrl)` guard already
//   drops the logo element on null → wordmark fallback). A 4xx/malformed logo →
//   wordmark fallback; a transient result is handled per v3.3.1 above
//   (proceed-on-transient). STRICTLY OUT OF SCOPE: NO change to the
//   voice/TTS path, captions, music, draft selection, queue, publisher, retry, DB,
//   p_render_engine values, or the template_smoke branch (its Logo/Background come from
//   the request body, NOT a resolver — there is no governed resolver render path in
//   video-worker to add the fail-loud check to); NO migration, NO new secret, NO deploy.
//
// video-worker v3.2.0
// ============================================================================
// v3.2.0 (2026-06-22, CREATIVE-LIBRARY-V0 GATE D2 — template-mode VIDEO smoke):
//   ADDITIVE, manual-only. New isolated smoke branch in Deno.serve, gated by
//   isSmokeRequest(body) (mode==='template_smoke' AND template===
//   'PP_NEWS_CENTRED_SCRIM_9x16_VIDEO_v1'), that runs BEFORE any production
//   draft selection and RETURNS before it. It renders the proven Creatomate
//   animated Property Pulse news template (template mode; provider template
//   bc32f52f-f9da-4749-90aa-03f7572f0719; MP4 1080x1920), stores the MP4 to
//   post-videos/_smoke/, and writes ONE m.post_render_log row whose render_spec
//   carries BOTH qa (preserved) and template (additive sibling) plus a label
//   'creative_library_video_smoke'. ice_format_key='video_short_stat' is a
//   governed LABEL only — true identity lives in render_spec.template. New pure
//   module ./template_smoke.ts (no side effects). renderUploadAndLog gains
//   optional templateSpec/renderSpecLabel/logMustSucceed opts and nullable
//   postDraftId/clientId (smoke passes null — touches NO post_draft). The three
//   PRODUCTION callers are byte-unchanged (no extras => render_spec === { qa }).
//   STRICTLY OUT OF SCOPE: no DB migration, no new taxonomy/format key, no
//   publish/queue/advisor wiring, no production-path render/selection change,
//   p_render_engine values byte-unchanged, NO DEPLOY in this change. (GATE D2)
//
// video-worker v3.1.0
// ============================================================================
// v3.1.5 (2026-06-21, QA-VISIBILITY-V0):
//   ADDITIVE / OBSERVABILITY-ONLY. Attach a normalized `qa` object to every
//   write_render_log call's render_spec (previously always null in video-worker).
//   New pure, fail-safe module ./qa.ts (buildRenderQa + safeQa) — no side effects.
//   A minimal qaCtx is threaded from processDraft into renderUploadAndLog and a
//   qa.{success,catch} object is set at the two in-render log sites plus the
//   per-draft outer Deno.serve catch (engine='creatomate', render_mode=
//   'composition', duration_semantics='render_wallclock', dimension=
//   '1080x1920', aspect='9:16'). file_size_bytes at success reuses the already-
//   in-scope render buffer length (NO re-fetch/probe). STRICTLY OUT OF SCOPE:
//   no DB migration, no render/poll/storage/status/queue/publish/selection
//   change, p_render_engine values byte-unchanged ('creatomate' /
//   'creatomate+elevenlabs'), no provider call added, no secret access, no
//   audio_present/loudness/true-duration/true-dimension/cost-value/legibility,
//   no publish-blocking verdict (all DEFERRED). (QA-VISIBILITY-V0)
//
// v3.1.4 (2026-06-20, VOICE-ID-RESOLUTION-HARDENING):
//   Resolve the ElevenLabs voice by client_id (always present on the draft),
//   not by getBrand().clientSlug. Root cause: service_role lacks SELECT on
//   c.client, so getBrand()'s PostgREST read of client_slug returns null and
//   falls back to the client UUID; the old getVoiceId(clientSlug) then received
//   a UUID, matched no property/pp/ndis alias, returned null, and the voice
//   render failed before ElevenLabs ("No ElevenLabs voice ID configured for
//   client_slug=<uuid>"). Fix: getVoiceIdForDraft({clientId,clientSlug,format})
//   in the new pure module ./voice_id.ts resolves by client_id first; a
//   UUID-valued clientSlug NEVER enters the substring-alias path; a real
//   (non-UUID) slug still works as a secondary path. The fail-loud throw is
//   enriched with client_id, observed slug, method, and format. getBrand() is
//   UNCHANGED and still used for brand colour/logo/profile — only voice identity
//   stops depending on its slug fallback. STRICTLY OUT OF SCOPE: no DB grant /
//   migration, no secret read/write, no render_engine string change
//   ('creatomate' / 'creatomate+elevenlabs' unchanged), no change to
//   captions/music/layout/timing/storage paths/write_render_log args/draft
//   selection/queue logic, no publisher change. (F-VOICE-ID-RESOLUTION)
//
// v3.1.2 (2026-06-02, VOICE-MAPPING-GUARD):
//   Narrow voice-selection guard. getVoiceId() no longer silently falls back to
//   the NDIS voice for an unrecognised client_slug — it now returns null so the
//   caller fails the draft loudly (video_status='failed' + post_render_log)
//   rather than rendering a new brand in the wrong (NDIS) voice. Exact
//   ELEVENLABS_VOICE_ID_<SLUG> still wins; the ndis/property(pp) legacy aliases
//   are unchanged. Caller throw message clarified to include client_slug=<slug>.
//   Voice-selection ONLY — no captions/layout/timing/audio-volume/format/storage
//   change. (F-VOICE-SILENT-FALLBACK)
//
// v3.1.1 (2026-06-02, CREATOMATE-AUDIO-VOLUME-CONTRACT-FIX):
//   Audio-only value-format fix. Creatomate's audio `volume` property is a
//   PERCENTAGE string ("0%"–"100%", default "100%"), not a 0–1 fraction. The
//   prior numeric values were misread by the renderer as ~1% — a measured
//   ~40 dB voice attenuation (source mp3 ~-18.1 LUFS → final mp4 ~-58.2 LUFS).
//   Fix: voice elements volume 1.0 → "100%" (kinetic + stat); music element
//   volume 0.15 → "15%" (kinetic + stat; latent, env-gated off). NOTHING else
//   changes — no captions/layout/timing/text/brand/storage/logging/DB/queue
//   change, no VERSION-const bump, no deploy. Pure audio gain contract fix.
//
// v3.1.0 (2026-06-02, CREATOMATE-PASS-1-CAPTIONS):
//   Burned-in captions for video_short_kinetic_voice ONLY. Additive render-
//   spec layer — no pipeline/schema/selection/approval/queue/publisher change,
//   no ai-worker change, NO DEPLOY in this change. Captions are manual
//   Creatomate type:'text' elements over a per-caption dark scrim, derived from
//   video_script.narration_text (the same text fed to ElevenLabs TTS), confined
//   to a reserved band y1300–1520 that clears the kinetic content above and the
//   9:16 platform safe area below (bottom bar y1620). Timing is deterministic,
//   video-duration-proportional, with min/max clamps + underflow merge
//   (word-accurate timing is Pass 2). Caption construction is pure + fail-safe
//   (returns [] on any internal issue) so it can NEVER fail the TTS/render/
//   storage path; the empty-narration throw is unchanged. When captions are on,
//   the kinetic 'Keep watching' / 'Follow {client}' footer labels are
//   suppressed and point.body is height-capped to keep the band collision-free.
//   stat_voice + non-voice formats are byte-unchanged (Pass 2 / out of scope).
//
// v3.0.0 (2026-05-08, F-VIDEO-QUALITY-UPGRADE-A-B-C):
//   THREE coordinated improvements landing in one EF deploy. All changes are
//   render-spec-only — no pipeline logic, no schema, no ai-worker change,
//   no change to draft selection / approval / queue / publisher behaviour.
//
//   A. BACKGROUND MUSIC LAYER (env-gated, default OFF):
//      - Per-format vibe mapping:
//          video_short_stat            → 'news'   (energetic / factual)
//          video_short_kinetic         → 'upbeat' (motivational)
//          video_short_kinetic_voice   → 'calm'   (low-key bed under TTS)
//          video_short_stat_voice      → 'calm'
//      - Tracks live in Supabase storage at post-music/<vibe>/track-N.mp3.
//      - resolveMusicUrl() picks one at random per render.
//      - Activation gate: VIDEO_WORKER_MUSIC_ENABLED env var must equal 'true'.
//        Default 'false' (or unset) → silent music layer; render behaviour
//        is byte-for-byte identical to v2.1.0 until activation.
//      - Music volume 0.15, ElevenLabs TTS voice volume 1.0; both audio
//        elements layered when both present (Creatomate mixes).
//
//   B. ANIMATION POLISH:
//      - Tightened element stagger within point scenes
//        (counter → accent → headline → underline → body) using a 0.15s step
//        instead of the previous compressed 0.1s/0.2s mixed offsets.
//      - Slide direction alternation on point scenes via slideDirForPoint():
//        rotates 270 (up) → 0 (→from-left) → 180 (←from-right) by point
//        index. Reduces the perceived sameness of every point sliding from
//        below.
//      - Decorative background circle in stat reveal now uses scale enter
//        (1.2s ease-out) at t=0 instead of appearing instantly.
//
//   C. 9:16 SAFE-LAYOUT FIX:
//      Y-coordinate adjustments (kinetic + stat where applicable):
//        Top brand bar:                     y=0    → y=140
//        Bottom brand bar:                  y=H    → y=1620
//        Logo:                              y=44   → y=160
//        Wordmark text:                     y=90   → y=200
//        Hook subtitle '↓ Keep watching':  y=1700 → y=1480
//        Point counter (e.g. '1/3'):       y=190  → y=290
//        Kinetic CTA footer:                y=1650 → y=1450
//        Stat reveal CTA text:              y=1430 → y=1340
//        Stat reveal branding line:         y=1780 → y=1500
//      All middle-band elements (y=400–1300) are unchanged.
//      No total-duration changes (kinetic = sum of scenes; stat = 20s).
//
// ----------------------------------------------------------------------------
// ACTIVATION CHECKLIST (post-deploy, PK to action):
//   1. Create Supabase storage bucket 'post-music' as public-read.
//   2. Upload ≥1 track per vibe to:
//        post-music/news/track-1.mp3      (and optionally track-2, track-3)
//        post-music/upbeat/track-1.mp3
//        post-music/calm/track-1.mp3
//      Source guidance: YouTube Audio Library, Pixabay Music, Free Music
//      Archive (CC0/CC-BY), or licensed Epidemic Sound / Artlist tracks.
//      30–60s loops at -14 LUFS preferred.
//   3. Flip EF env var: VIDEO_WORKER_MUSIC_ENABLED=true
//   4. Music goes live on next render. No second deploy required.
//   Until step 3, music layer is silently skipped — v2.1.0-equivalent.
//
// PRIOR HISTORY:
//   v2.1.0 (Apr 2026): also process drafts with approval_status='published'.
//   v2.0.x: original Creatomate kinetic + stat render path.
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getVoiceIdForDraft } from './voice_id.ts';
import { buildRenderQa, safeQa } from './qa.ts';  // v3.1.5: QA-VISIBILITY-V0 (additive)
import { composeRenderSpec } from './template_smoke.ts';  // v3.2.0: GATE D2; v3.4.0 LANE W: module trimmed to this single live export (production render_spec composer) — the smoke surface is retired
import { resolveLegacyLogo, type AssetVerdict } from './asset_url_guard.ts';  // v3.3.0: H2 asset-URL validation before Creatomate
import { isB1GovernedVideoStat, buildGovernedVideoStatPlan, composeGovernedVideoNarration, B1_VIDEO_PRODUCTION_LABEL, B1_VIDEO_GOVERNED_FORMAT, B1_VIDEO_GOVERNED_CLIENT_ID, type B1VideoStatFields } from './b1_video_stat.ts';  // v3.6.0: CREATIVE-LIBRARY VIDEO TMR — governed PP video_short_stat COMBO AUDIO (DARK)
import { mapSelectMusicRow, musicUsageFromBed, recordMusicUsage, type MusicUsageDescriptor } from './music_usage.ts';  // v3.7.0 (cc-0034): governed music-usage recording (record_music_usage)

// v3.6.0 (cc-0032 step 5, DARK): governed PP video_short_stat now renders COMBO AUDIO — a voiceover
// over an optional governed music bed — binding the registered v2 template c11bb8ab (VoiceAudio +
// MusicBed slots). renderGovernedVideoStat + the governed_video_stat_smoke entrypoint compose the VO
// narration (composeGovernedVideoNarration, CTA visual-only), generate it via generateAndUploadVoice
// (PP voice), resolve the bed via the service-role public.select_music RPC (empty result set → '' =
// silent bed per N1; an RPC ERROR THROWS b1_video_missing_music_rpc — never a silent degrade), and pass
// both audio URLs into buildGovernedVideoStatPlan. The enabled=false gate,
// fork placement, renderUploadAndLog, and every legacy path (isKinetic/isStat/_voice, MUSIC_LIBRARY/
// resolveMusicUrl) are BYTE-UNCHANGED. STRICTLY OUT OF SCOPE: enabled=true flip, live render/publish,
// worker deploy (held on the c11bb8ab key-identity precondition), the select_music apply (ledger-held).
const VERSION = 'video-worker-v3.7.0';
const CREATOMATE_API    = 'https://api.creatomate.com/v2/renders';
const ELEVENLABS_TTS    = 'https://api.elevenlabs.io/v1/text-to-speech';
const POLL_INTERVAL_MS  = 2500;
const POLL_MAX_ATTEMPTS = 48;  // 2 min max

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-video-worker-key',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function nowIso() { return new Date().toISOString(); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// v3.1.4: voice-id resolution moved to ./voice_id.ts (getVoiceIdForDraft),
// resolving by client_id first. See header. The v3.1.2 slug guard (no silent
// NDIS default) is preserved there as the secondary, non-UUID slug path.

// === v3.0.0 (A): Music library (env-gated, off-by-default) ==================
//
// To add a new track: upload mp3 to Supabase storage at post-music/<vibe>/...,
// then add the relative path to the matching array below. To add a new vibe:
// add a key to MUSIC_LIBRARY and map a format to it via VIBE_FOR_FORMAT.
//
const MUSIC_LIBRARY: Record<string, string[]> = {
  news: [
    'post-music/news/track-1.mp3',
    'post-music/news/track-2.mp3',
    'post-music/news/track-3.mp3',
  ],
  upbeat: [
    'post-music/upbeat/track-1.mp3',
    'post-music/upbeat/track-2.mp3',
    'post-music/upbeat/track-3.mp3',
  ],
  calm: [
    'post-music/calm/track-1.mp3',
    'post-music/calm/track-2.mp3',
    'post-music/calm/track-3.mp3',
  ],
};

const VIBE_FOR_FORMAT: Record<string, keyof typeof MUSIC_LIBRARY> = {
  video_short_kinetic:        'upbeat',
  video_short_kinetic_voice:  'calm',
  video_short_stat:           'news',
  video_short_stat_voice:     'calm',
};

function resolveMusicUrl(format: string): string | null {
  if (Deno.env.get('VIDEO_WORKER_MUSIC_ENABLED') !== 'true') return null;
  const vibe = VIBE_FOR_FORMAT[format];
  if (!vibe) return null;
  const tracks = MUSIC_LIBRARY[vibe];
  if (!tracks?.length) return null;
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!supabaseUrl) return null;
  const path = tracks[Math.floor(Math.random() * tracks.length)];
  return `${supabaseUrl}/storage/v1/object/public/${path}`;
}

// === v3.0.0 (B): Animation polish helper ====================================
// Slide direction alternation across point scenes for perceptual variety.
// pointIndex1Based starts at 1 (first point in a scene sequence).
function slideDirForPoint(pointIndex1Based: number): string {
  switch (pointIndex1Based % 3) {
    case 1:  return '270'; // slide upward (default; matches original behaviour)
    case 2:  return '0';   // slide rightward (enters from left edge)
    case 0:  return '180'; // slide leftward (enters from right edge)
    default: return '270';
  }
}

async function generateAndUploadVoice(
  supabase: ReturnType<typeof getServiceClient>,
  narrationText: string,
  voiceId: string,
  storagePath: string,
): Promise<string | null> {
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!apiKey || !voiceId) { console.error('[video-worker] ElevenLabs key or voice ID missing'); return null; }
  const resp = await fetch(`${ELEVENLABS_TTS}/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({ text: narrationText, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  });
  if (!resp.ok) { console.error(`[video-worker] ElevenLabs TTS ${resp.status}: ${(await resp.text()).slice(0, 300)}`); return null; }
  const audioBuf = await resp.arrayBuffer();
  const { error: upErr } = await supabase.storage.from('post-videos').upload(storagePath, audioBuf, { contentType: 'audio/mpeg', upsert: true });
  if (upErr) { console.error('[video-worker] audio upload failed:', upErr.message); return null; }
  return `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/post-videos/${storagePath}`;
}

// v3.6.0 (cc-0032 step 5): resolve the governed music bed via the service-role public.select_music
// RPC. Contract is OWNED by the TMR Music Lane (packet cc-0032 §2/§3); this worker only CALLS it:
//   select_music(p_scope_kind, p_scope_value, p_min_duration_seconds DEFAULT 12, p_mood DEFAULT NULL)
//   RETURNS TABLE(track_id, track_key, title, mood, duration_seconds, loudness_lufs,
//                 storage_bucket, storage_path)
// An EMPTY RESULT SET is the "no bed" signal (packet line 65) → '' (legitimate silent bed; N1 —
// MusicBed.source:'' DISABLES the element, verified R1 in EMPTY_BED_TEST_RESULT). storage_path is
// returned RAW and already bucket-prefixed ('post-music/global/…'), so the public URL is
// …/object/public/<storage_path> (do NOT double-prefix — cc-0032 storage_path carry).
// FAIL LOUD on error (PK 2026-07-10): an RPC error THROWS (b1_video_missing_music_rpc), mirroring the
// b1_video_missing_voiceover / b1_video_missing_governed_logo guards. A swallowed RPC error is exactly
// how a silent-bed defect ships — never degrade an error to ''. Only an EMPTY result set means "no bed".
// Consequence: the governed combo branch cannot render until select_music exists in the DB. Correct.
// v3.7.0 (cc-0034): returns { url, trackId } instead of a bare url — select_music already returns
// track_id in its row, so it is no longer discarded (needed to record which track a render consumed).
// SEMANTICS UNCHANGED: RPC error → THROW; empty result set → { url:'', trackId:null }. The row→bed
// mapping is the pure mapSelectMusicRow (./music_usage.ts); trackId is null whenever url is '' so
// "bed bound" ⟺ trackId !== null (D3).
async function resolveGovernedMusicBedUrl(
  supabase: ReturnType<typeof getServiceClient>,
  opts: { scopeKind: string; scopeValue: string },
): Promise<{ url: string; trackId: string | null }> {
  const { data, error } = await supabase.rpc('select_music', {
    p_scope_kind: opts.scopeKind,
    p_scope_value: opts.scopeValue,
  });
  if (error) {
    // FAIL LOUD — an RPC error is never a silent bed (PK 2026-07-10).
    throw new Error(`b1_video_missing_music_rpc: select_music failed (${error.message})`);
  }
  const rows = (data ?? []) as Array<{ storage_path?: string | null; track_id?: string | null }>;
  const publicObjectBaseUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/`;
  return mapSelectMusicRow(rows, publicObjectBaseUrl);
}

async function pollRender(renderId: string, apiKey: string, startMs: number): Promise<{ url: string; creditsUsed: number | null; durationMs: number }> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const resp = await fetch(`${CREATOMATE_API}/${renderId}`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
    if (!resp.ok) throw new Error(`Poll failed: ${resp.status}`);
    const data = await resp.json();
    if (data.status === 'succeeded') return { url: data.url, creditsUsed: data.credits != null ? Number(data.credits) : null, durationMs: Date.now() - startMs };
    if (data.status === 'failed') throw new Error(`Creatomate failed: ${data.error_message ?? 'unknown'}`);
    console.log(`[video-worker] render ${renderId}: ${data.status} (${i + 1}/${POLL_MAX_ATTEMPTS})`);
  }
  throw new Error('Render timed out after 2 minutes');
}

// v3.1.5 (QA-VISIBILITY-V0): minimal, render-derived QA context threaded from
// processDraft. Pure data already in scope — no probe, no fetch, no secret read.
type QaCtx = {
  withVoice: boolean;
  expectedFormat: string;
  captionsExpected: boolean;
  captionsPresent: boolean;
  sceneCount: number | null;
};

// v3.7.0 (cc-0034): exported for the hermetic renderUploadAndLog sequencing test (the D5-strict
// "write_render_log runs exactly once as 'succeeded' AND the usage throw propagates without a
// spurious 'failed' log" invariant). Production behaviour is unchanged — the export is inert.
export async function renderUploadAndLog(opts: {
  supabase: ReturnType<typeof getServiceClient>;
  creatomateKey: string;
  renderScript: object;
  storagePath: string;
  postDraftId: string | null;
  clientId: string | null;
  iceFormatKey: string;
  qaCtx: QaCtx;  // v3.1.5: QA-VISIBILITY-V0 (additive observability)
  templateSpec?: Record<string, unknown> | null;  // v3.2.0 GATE D2: render_spec.template (smoke only)
  renderSpecLabel?: string | null;                // v3.2.0 GATE D2: render_spec.label (smoke only)
  logMustSucceed?: boolean;                        // v3.2.0 GATE D2: smoke requires the evidence row to persist
  musicUsage?: MusicUsageDescriptor | null;        // v3.7.0 (cc-0034): governed track consumed → record_music_usage (null / absent = no bed bound = no row)
}): Promise<string> {
  const { supabase, creatomateKey, renderScript, storagePath, postDraftId, clientId, iceFormatKey, qaCtx } = opts;
  const startMs = Date.now();
  let renderId: string | null = null;
  // v3.7.0 (cc-0034): hoisted so the success value survives the try/catch — the music-usage write
  // runs OUTSIDE this try (below), where a strict D5 throw cannot be swallowed into a 'failed'
  // render_log by the outer catch. The catch always rethrows, so control only reaches past the
  // block when storageUrl was assigned on the success path.
  let storageUrl: string;
  try {
    const submitResp = await fetch(CREATOMATE_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${creatomateKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(renderScript),
    });
    if (!submitResp.ok) throw new Error(`Creatomate submit ${submitResp.status}: ${await submitResp.text()}`);
    const sub = await submitResp.json();
    const render = Array.isArray(sub) ? sub[0] : sub;
    renderId = render?.id ?? null;
    if (!renderId) throw new Error('No render ID in Creatomate response');
    const { url: renderUrl, creditsUsed, durationMs } = await pollRender(renderId, creatomateKey, startMs);
    const vidBuf = await (await fetch(renderUrl)).arrayBuffer();
    const { error: upErr } = await supabase.storage.from('post-videos').upload(storagePath, vidBuf, { contentType: 'video/mp4', upsert: true });
    if (upErr) throw new Error(`Storage upload: ${upErr.message}`);
    storageUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/post-videos/${storagePath}`;
    try {
      // v3.1.5 (QA-VISIBILITY-V0): additive render-QA on the SUCCESS log. file_size_bytes
      // reuses the already-fetched render buffer (vidBuf) — no re-fetch/probe.
      const renderSpec = composeRenderSpec(
        safeQa(() => buildRenderQa({
          expected_format: qaCtx.expectedFormat,
          engine: 'creatomate', render_mode: 'composition',
          duration_semantics: 'render_wallclock',
          dimension: '1080x1920', aspect: '9:16',
          status: 'succeeded', failure_stage: null,
          provider_job_id_present: !!renderId,
          output_url_present: !!renderUrl,
          storage_url_present: !!storageUrl,
          duration_ms: durationMs,
          file_size_bytes: vidBuf.byteLength,
          audio_expected: qaCtx.withVoice,
          voice_expected: qaCtx.withVoice,
          tts_provider: qaCtx.withVoice ? 'elevenlabs' : null,
          captions_expected: qaCtx.captionsExpected,
          captions_present: qaCtx.captionsPresent,
          scene_count: qaCtx.sceneCount,
          avatar_expected: false,
          fallback_taken: false,
          cost_present: creditsUsed != null,
          cost_estimated_flag: false,
        })),
        { label: opts.renderSpecLabel, template: opts.templateSpec },
      );
      const { error: logErr } = await supabase.rpc('write_render_log', {
        p_post_draft_id: postDraftId, p_slide_id: null, p_client_id: clientId,
        p_ice_format_key: iceFormatKey, p_render_engine: 'creatomate',
        p_creatomate_render_id: renderId, p_status: 'succeeded',
        p_output_url: renderUrl, p_storage_url: storageUrl,
        p_credits_used: creditsUsed, p_render_duration_ms: durationMs,
        p_error_message: null, p_render_spec: renderSpec,
      });
      if (logErr) {
        console.error('[video-worker] write_render_log error:', logErr.message);
        if (opts.logMustSucceed) throw new Error(`write_render_log failed: ${logErr.message}`);
      }
    } catch (logEx: any) {
      console.error('[video-worker] write_render_log threw:', logEx?.message);
      if (opts.logMustSucceed) throw (logEx instanceof Error ? logEx : new Error(String(logEx)));
    }
  } catch (e: any) {
    const errMsg = (e?.message ?? String(e)).slice(0, 500);
    const isTimeout = errMsg.includes('timed out');
    // v3.1.5 (QA-VISIBILITY-V0): classify the render failure stage (observational).
    const failureStage = isTimeout ? 'timeout'
      : /submit/i.test(errMsg) ? 'submit'
      : /Creatomate failed|Poll failed/i.test(errMsg) ? 'render'
      : /Storage upload|No render ID/i.test(errMsg) ? 'download_store'
      : 'render';
    try {
      // v3.1.5 (QA-VISIBILITY-V0): additive render-QA on the in-render CATCH log.
      const renderSpec = composeRenderSpec(
        safeQa(() => buildRenderQa({
          expected_format: qaCtx.expectedFormat,
          engine: 'creatomate', render_mode: 'composition',
          duration_semantics: 'render_wallclock',
          dimension: '1080x1920', aspect: '9:16',
          status: isTimeout ? 'timeout' : 'failed',
          failure_stage: failureStage,
          provider_job_id_present: !!renderId,
          output_url_present: false,
          storage_url_present: false,
          duration_ms: Date.now() - startMs,
          file_size_bytes: null,
          audio_expected: qaCtx.withVoice,
          voice_expected: qaCtx.withVoice,
          tts_provider: qaCtx.withVoice ? 'elevenlabs' : null,
          captions_expected: qaCtx.captionsExpected,
          captions_present: qaCtx.captionsPresent,
          scene_count: qaCtx.sceneCount,
          avatar_expected: false,
          fallback_taken: false,
          cost_present: false,
          cost_estimated_flag: false,
        })),
        { label: opts.renderSpecLabel, template: opts.templateSpec },
      );
      await supabase.rpc('write_render_log', {
        p_post_draft_id: postDraftId, p_slide_id: null, p_client_id: clientId,
        p_ice_format_key: iceFormatKey, p_render_engine: 'creatomate',
        p_creatomate_render_id: renderId, p_status: isTimeout ? 'timeout' : 'failed',
        p_output_url: null, p_storage_url: null, p_credits_used: null,
        p_render_duration_ms: Date.now() - startMs, p_error_message: errMsg, p_render_spec: renderSpec,
      });
    } catch (logEx: any) { console.error('[video-worker] write_render_log (fail) threw:', logEx?.message); }
    throw e;
  }
  // v3.7.0 (cc-0034): record which governed music track this SUCCESSFUL render consumed. Placed
  // OUTSIDE the render try/catch on purpose and — per PK 2026-07-10 — a usage-write failure NEVER
  // fails the render. recordMusicUsage never throws; it returns a result. No-ops unless a bed was
  // actually bound (musicUsage present — D3) AND a Creatomate renderId is present (FIX 2). On a
  // real write failure we LOG LOUD and CONTINUE: console.error for production drafts, console.warn
  // for the supervised smoke — both carrying the stable, greppable code
  // b1_video_music_usage_write_failed. write_render_log has already run EXACTLY ONCE with status
  // 'succeeded'; the render is NOT retried, credits are NOT re-spent, and provenance is best-effort
  // (see the v3.7.0 file header). Idempotent per render id (record_music_usage ON CONFLICT DO NOTHING).
  const musicUsageResult = await recordMusicUsage(supabase, { musicUsage: opts.musicUsage, renderId, clientId, postDraftId });
  if (opts.musicUsage && !musicUsageResult.recorded && musicUsageResult.error) {
    const detail = `b1_video_music_usage_write_failed: ${musicUsageResult.error} (track_id=${opts.musicUsage.trackId}, render_id=${renderId})`;
    if (postDraftId !== null) {
      console.error(`[video-worker] ${detail}`);  // production: loud alarm — provenance best-effort, render kept
    } else {
      console.warn(`[video-worker] ${detail}`);   // supervised smoke
    }
  }
  return storageUrl;
}

async function getBrand(supabase: ReturnType<typeof getServiceClient>, clientId: string) {
  const { data: brand } = await supabase.schema('c').from('client_brand_profile')
    .select('brand_colour_primary,brand_colour_secondary,brand_logo_url,brand_name')
    .eq('client_id', clientId).limit(1).maybeSingle();
  const { data: cl } = await supabase.schema('c').from('client')
    .select('client_slug').eq('client_id', clientId).limit(1).maybeSingle();
  return {
    primaryColour:   brand?.brand_colour_primary   ?? '#0A2A4A',
    secondaryColour: brand?.brand_colour_secondary ?? '#1C8A8A',
    clientName:      brand?.brand_name             ?? 'ICE',
    logoUrl:         brand?.brand_logo_url         ?? null,
    clientSlug:      cl?.client_slug               ?? clientId,
  };
}

type VideoScene = { type: 'hook' | 'point' | 'cta'; headline: string; body: string | null; duration_s: number; };

// === v3.1.0: burned-in captions (kinetic_voice only) ========================
// Pass 1: deterministic, video-duration-proportional. Manual Creatomate
// type:'text' over a per-caption dark scrim, confined to a reserved band that
// clears the kinetic content above (hook/CTA boxes end ≤y1260, point.body
// height-capped to ≤y1255) and the 9:16 platform safe area below (band bottom
// y1520 < the y1620 bottom bar). Word-accurate (audio-synced) timing = Pass 2.
const CAP_BAND = {
  x: 90, width: 900,             // ≥90px side margins (partial right-rail clear)
  scrimY: 1300, scrimHeight: 220, // scrim band 1300–1520
  textY: 1330, textHeight: 170,   // 2 lines @ 40px/130%, centred in the scrim
  fontSize: 40, lineHeight: '130%',
};
const CAP_MAX_CHARS = 64;   // ~2 lines at 40px in 900px
const CAP_MIN_S = 1.2;      // min on-screen seconds (shorter slices get merged)
const CAP_MAX_S = 5.0;      // max on-screen seconds (then hides; brief gap)

// Split text into word-safe chunks of ≤ maxChars. Pure.
function chunkCaption(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const chunks: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    if ((cur.length + 1 + w.length) <= maxChars) cur += ' ' + w;
    else { chunks.push(cur); cur = w; }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// Build burned-in caption elements (scrim + text) across the full video.
// PURE + FAIL-SAFE: never throws — returns [] on any internal issue so a caption
// glitch can never fail the render/TTS/storage path. Timing is proportional to
// each chunk's character length against the video's total duration, with an
// underflow-merge (chunks < CAP_MIN_S fold into a neighbour) and a per-caption
// min/max clamp. Captions are timed to the VIDEO duration (= Σ scene durations),
// not the audio length, so they are approximate vs speech (Pass-1 limitation).
function buildCaptionElements(narrationText: string | null | undefined, totalDuration: number): object[] {
  try {
    const text = (narrationText ?? '').replace(/\s+/g, ' ').trim();
    if (!text || !(totalDuration > 0)) return [];
    const chunks = chunkCaption(text, CAP_MAX_CHARS);
    if (chunks.length === 0) return [];

    const totalLen = chunks.reduce((n, c) => n + c.length, 0) || 1;
    const durs = chunks.map(c => (c.length / totalLen) * totalDuration);

    // Underflow merge: fold any chunk shorter than CAP_MIN_S into its neighbour
    // (next, or previous if last), preserving Σdur == totalDuration.
    for (let guard = 0; guard < chunks.length + 1; guard++) {
      if (chunks.length <= 1) break;
      const i = durs.findIndex(d => d < CAP_MIN_S);
      if (i === -1) break;
      const j = i < chunks.length - 1 ? i + 1 : i - 1;
      chunks[j] = i < j ? `${chunks[i]} ${chunks[j]}` : `${chunks[j]} ${chunks[i]}`;
      durs[j] += durs[i];
      chunks.splice(i, 1);
      durs.splice(i, 1);
    }

    const els: object[] = [];
    let t = 0;
    for (let i = 0; i < chunks.length; i++) {
      if (t >= totalDuration) break;
      const shown = Math.min(Math.max(durs[i], CAP_MIN_S), CAP_MAX_S, totalDuration - t);
      if (shown <= 0) break;
      // scrim first (under) …
      els.push({ type: 'shape', shape: 'rectangle', fill_color: '#0B1220', opacity: 0.62, border_radius: '24px',
        width: `${CAP_BAND.width}px`, height: `${CAP_BAND.scrimHeight}px`, x: `${CAP_BAND.x}px`, y: `${CAP_BAND.scrimY}px`,
        x_anchor: '0%', y_anchor: '0%', time: t, duration: shown,
        enter: { effect: 'fade', duration: 0.15 }, exit: { effect: 'fade', duration: 0.15 } });
      // … then caption text (over).
      els.push({ type: 'text', text: chunks[i], font_family: 'Montserrat', font_weight: '500',
        font_size: `${CAP_BAND.fontSize}px`, fill_color: '#FFFFFF', line_height: CAP_BAND.lineHeight,
        width: `${CAP_BAND.width}px`, height: `${CAP_BAND.textHeight}px`, x_alignment: '50%', y_alignment: '50%',
        x: `${CAP_BAND.x}px`, y: `${CAP_BAND.textY}px`, x_anchor: '0%', y_anchor: '0%', time: t, duration: shown,
        enter: { effect: 'fade', duration: 0.15 }, exit: { effect: 'fade', duration: 0.15 } });
      t += durs[i]; // advance by the proportional slice to stay synced to total
    }
    return els;
  } catch (_e) {
    return [];
  }
}

// === buildKineticTextSpec ====================================================
// v3.0.0 changes: layout coords (C), animation polish (B), music layer (A).
// v3.1.0: optional burned-in captions (kinetic_voice only) — see header.
function buildKineticTextSpec(opts: {
  scenes: VideoScene[];
  clientName: string; primaryColour: string; secondaryColour: string; logoUrl: string | null;
  audioUrl?: string | null;
  musicUrl?: string | null;  // v3.0.0
  captionText?: string | null;  // v3.1.0 — kinetic_voice captions only
}): object {
  const { scenes, clientName, primaryColour, secondaryColour, logoUrl, audioUrl, musicUrl, captionText } = opts;
  const withCaptions = !!(captionText && captionText.trim());  // v3.1.0
  const W = 1080, H = 1920;
  let t = 0;
  const timings = scenes.map(s => { const e = { start: t, dur: s.duration_s }; t += s.duration_s; return e; });
  const totalDuration = t;
  const elements: object[] = [];

  // v3.0.0 (A): Music bed first (under voice). Skipped silently if env-gated off.
  if (musicUrl) elements.push({ type: 'audio', source: musicUrl, time: 0, duration: totalDuration, volume: '15%' });
  if (audioUrl) elements.push({ type: 'audio', source: audioUrl, time: 0, duration: totalDuration, volume: '100%' });

  // v3.0.0 (C): brand bars moved off canvas edges to clear Shorts UI.
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: '140px', x_anchor: '0%', y_anchor: '0%' });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: '1620px', x_anchor: '0%', y_anchor: '100%' });

  // v3.0.0 (C): logo / wordmark moved down out of YT top channel-name overlay.
  if (logoUrl) {
    elements.push({ type: 'image', source: logoUrl, width: '90px', height: '90px', x: '44px', y: '160px', x_anchor: '0%', y_anchor: '0%', fit: 'contain' });
  } else {
    elements.push({ type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '700', font_size: '26px', fill_color: secondaryColour, x: '60px', y: '200px', x_anchor: '0%', y_anchor: '50%' });
  }
  const pointSceneCount = scenes.filter(s => s.type === 'point').length;
  let pointNum = 0;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const { start: tStart, dur: tDur } = timings[i];
    const F = 0.5, FO = 0.35;
    if (scene.type === 'hook') {
      elements.push({ type: 'text', text: scene.headline, font_family: 'Montserrat', font_weight: '900', font_size: '76px', fill_color: '#FFFFFF', line_height: '130%', width: '960px', height: '700px', x_alignment: '50%', y_alignment: '50%', x: '60px', y: '560px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.4, duration: tDur - 0.8, enter: { effect: 'fade', duration: F }, exit: { effect: 'fade', duration: FO } });
      // v3.0.0 (C): subtitle moved up from y=1700 to y=1480 to clear bottom UI.
      // v3.1.0: suppressed when captions are on (it sits inside the caption band).
      if (!withCaptions) elements.push({ type: 'text', text: '\u2193 Keep watching', font_family: 'Montserrat', font_weight: '400', font_size: '26px', fill_color: secondaryColour, opacity: 0.75, width: `${W}px`, x_alignment: '50%', x: '0px', y: '1480px', x_anchor: '0%', y_anchor: '0%', time: tStart + 1.2, duration: tDur - 1.6, enter: { effect: 'fade', duration: 0.6 }, exit: { effect: 'fade', duration: FO } });
    } else if (scene.type === 'cta') {
      elements.push({ type: 'text', text: '?', font_family: 'Montserrat', font_weight: '900', font_size: '500px', fill_color: secondaryColour, opacity: 0.07, width: `${W}px`, x_alignment: '50%', x: '0px', y: '400px', x_anchor: '0%', y_anchor: '0%', time: tStart, duration: tDur });
      elements.push({ type: 'text', text: scene.headline, font_family: 'Montserrat', font_weight: '700', font_size: '62px', fill_color: '#FFFFFF', line_height: '130%', width: '880px', height: '600px', x_alignment: '50%', y_alignment: '50%', x: '100px', y: '650px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.3, duration: tDur - 0.6, enter: { effect: 'fade', duration: F }, exit: { effect: 'fade', duration: FO } });
      // v3.0.0 (C): footer moved up from y=1650 to y=1450.
      // v3.1.0: suppressed when captions are on (it sits inside the caption band).
      if (!withCaptions) elements.push({ type: 'text', text: `Follow ${clientName} for more`, font_family: 'Montserrat', font_weight: '400', font_size: '30px', fill_color: secondaryColour, opacity: 0.8, width: `${W}px`, x_alignment: '50%', x: '0px', y: '1450px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.9, duration: tDur - 1.1, enter: { effect: 'fade', duration: 0.5 } });
    } else {
      pointNum++;
      const sliDir = slideDirForPoint(pointNum); // v3.0.0 (B): direction rotates 270 / 0 / 180
      // v3.0.0 (C): counter moved down from y=190 to y=290 (clear of moved logo).
      // v3.0.0 (B): tightened stagger — 0.15 / 0.30 / 0.50 / 0.75 / 0.90.
      elements.push({ type: 'text', text: `${pointNum}/${pointSceneCount}`, font_family: 'Montserrat', font_weight: '400', font_size: '28px', fill_color: secondaryColour, opacity: 0.6, x: `${W - 60}px`, y: '290px', x_anchor: '100%', y_anchor: '50%', time: tStart + 0.15, duration: tDur - 0.4, enter: { effect: 'fade', duration: 0.3 }, exit: { effect: 'fade', duration: 0.3 } });
      elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, opacity: 0.7, width: '5px', height: '340px', x: '60px', y: '480px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.30, duration: tDur - 0.6, enter: { effect: 'slide', direction: sliDir, duration: 0.4 }, exit: { effect: 'fade', duration: 0.3 } });
      elements.push({ type: 'text', text: scene.headline, font_family: 'Montserrat', font_weight: '700', font_size: '64px', fill_color: '#FFFFFF', line_height: '130%', width: '880px', x: '100px', y: '480px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.50, duration: tDur - 0.8, enter: { effect: 'fade', duration: F }, exit: { effect: 'fade', duration: FO } });
      if (scene.body) {
        elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, opacity: 0.4, width: '880px', height: '2px', x: '100px', y: '870px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.75, duration: tDur - 1.0, enter: { effect: 'wipe', direction: sliDir, duration: 0.4 }, exit: { effect: 'fade', duration: 0.3 } });
        // v3.1.0: when captions are on, height-cap the body (bottom ≤ ~y1255) and
        // shrink long bodies so they cannot grow into the caption band (y1300+).
        const bodyCap = withCaptions ? { height: '360px' } : {};
        const bodyFont = withCaptions && scene.body.length > 150 ? '34px' : '40px';
        elements.push({ type: 'text', text: scene.body, font_family: 'Montserrat', font_weight: '400', font_size: bodyFont, fill_color: '#CBD5E1', line_height: '145%', width: '880px', ...bodyCap, x: '100px', y: '895px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.90, duration: tDur - 1.0, enter: { effect: 'fade', duration: F }, exit: { effect: 'fade', duration: FO } });
      }
    }
  }
  // v3.1.0: burned-in captions layered on top (kinetic_voice only). Pure +
  // fail-safe — returns [] on any internal issue, never fails the render.
  if (withCaptions) {
    for (const el of buildCaptionElements(captionText, totalDuration)) elements.push(el);
  }
  return { output_format: 'mp4', width: W, height: H, duration: totalDuration, frame_rate: 30, fill_color: primaryColour, elements };
}

// === buildStatRevealSpec =====================================================
// v3.0.0 changes: layout coords (C), animation polish (B), music layer (A).
function buildStatRevealSpec(opts: {
  statValue: string; statLabel: string; contextLine: string; ctaText: string;
  clientName: string; primaryColour: string; secondaryColour: string; logoUrl: string | null;
  audioUrl?: string | null;
  musicUrl?: string | null;  // v3.0.0
}): object {
  const { statValue, statLabel, contextLine, ctaText, clientName, primaryColour, secondaryColour, logoUrl, audioUrl, musicUrl } = opts;
  const W = 1080, H = 1920;
  const statFontSize = statValue.length <= 4 ? '220px' : statValue.length <= 6 ? '180px' : statValue.length <= 8 ? '150px' : '120px';
  const elements: object[] = [];

  // v3.0.0 (A): Music bed first (under voice). Skipped silently if env-gated off.
  if (musicUrl) elements.push({ type: 'audio', source: musicUrl, time: 0, duration: 20, volume: '15%' });
  if (audioUrl) elements.push({ type: 'audio', source: audioUrl, time: 0, duration: 20, volume: '100%' });

  // v3.0.0 (C): brand bars moved off canvas edges.
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: '140px', x_anchor: '0%', y_anchor: '0%' });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: '1620px', x_anchor: '0%', y_anchor: '100%' });

  // v3.0.0 (C): logo / wordmark moved down.
  if (logoUrl) { elements.push({ type: 'image', source: logoUrl, width: '90px', height: '90px', x: '44px', y: '160px', x_anchor: '0%', y_anchor: '0%', fit: 'contain' }); }
  else { elements.push({ type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '700', font_size: '26px', fill_color: secondaryColour, x: '60px', y: '200px', x_anchor: '0%', y_anchor: '50%' }); }

  // v3.0.0 (B): decorative circle now scale-enters (1.2s ease-out) at t=0
  // instead of appearing instantly. Adds gentle motion to the otherwise static
  // background during the first 1.5s before the stat scale-bounces in.
  elements.push({ type: 'shape', shape: 'circle', fill_color: secondaryColour, opacity: 0.06, width: '900px', height: '900px', x: '50%', y: '48%', x_anchor: '50%', y_anchor: '50%', time: 0, enter: { effect: 'scale', duration: 1.2, easing: 'ease-out' } });

  elements.push({ type: 'text', text: statValue, font_family: 'Montserrat', font_weight: '900', font_size: statFontSize, fill_color: '#FFFFFF', width: `${W}px`, x_alignment: '50%', x: '0px', y: '680px', x_anchor: '0%', y_anchor: '0%', time: 1.5, enter: { effect: 'scale', duration: 0.9, easing: 'bounce' } });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: '640px', height: '6px', x: '220px', y: '1060px', x_anchor: '0%', y_anchor: '0%', time: 3.5, enter: { effect: 'wipe', direction: '270', duration: 0.5 } });
  elements.push({ type: 'text', text: statLabel.toUpperCase(), font_family: 'Montserrat', font_weight: '600', font_size: '36px', fill_color: secondaryColour, width: `${W}px`, x_alignment: '50%', x: '0px', y: '1090px', x_anchor: '0%', y_anchor: '0%', time: 4.5, enter: { effect: 'slide', direction: '270', duration: 0.5 } });
  elements.push({ type: 'text', text: contextLine, font_family: 'Montserrat', font_weight: '400', font_size: '34px', fill_color: '#CBD5E1', line_height: '145%', width: '860px', x_alignment: '50%', x: '110px', y: '1200px', x_anchor: '0%', y_anchor: '0%', time: 6.5, enter: { effect: 'fade', duration: 0.7 } });

  // v3.0.0 (C): CTA moved up from y=1430 to y=1340.
  elements.push({ type: 'text', text: ctaText, font_family: 'Montserrat', font_weight: '600', font_size: '42px', fill_color: '#FFFFFF', line_height: '140%', width: '880px', x_alignment: '50%', x: '100px', y: '1340px', x_anchor: '0%', y_anchor: '0%', time: 10.0, enter: { effect: 'fade', duration: 0.7 } });
  // v3.0.0 (C): branding moved up from y=1780 to y=1500 (clear of bottom UI).
  elements.push({ type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '400', font_size: '30px', fill_color: '#D9E1E6', opacity: 0.7, width: `${W}px`, x_alignment: '50%', x: '0px', y: '1500px', x_anchor: '0%', y_anchor: '0%', time: 14.0, enter: { effect: 'fade', duration: 0.5 } });
  return { output_format: 'mp4', width: W, height: H, duration: 20, frame_rate: 30, fill_color: primaryColour, elements };
}

// === v3.5.0: CREATIVE-LIBRARY VIDEO TMR — governed PP video_short_stat (ARMED) ==============
//
// Governance gate. Reads c.client_creative_governance.enabled (service-role, read-only)
// for (clientId, format). FAIL-CLOSED: any error / missing row / null → false → the governed
// branch does NOT fire → the legacy isStat path runs (behaviour byte-identical). The (PP,
// video_short_stat) row is enabled=true (armed 2026-07-10; migration 20260708000000 seeded it
// DARK, PK flipped it after the combo render was visually+audibly approved), so this returns true
// for the governed PP client + format in production. Every other (clientId, format) still fails closed.
async function isVideoGovernanceEnabled(
  supabase: ReturnType<typeof getServiceClient>,
  clientId: string,
  format: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.schema('c').from('client_creative_governance')
      .select('enabled').eq('client_id', clientId).eq('format', format).maybeSingle();
    if (error) { console.error('[video-worker] governance read error (fail-closed → false):', error.message); return false; }
    return data?.enabled === true;
  } catch (e: any) {
    console.error('[video-worker] governance read threw (fail-closed → false):', e?.message);
    return false;
  }
}

// Governed VIDEO stat-reveal render. Mirrors the proven image-worker B1 governed image_quote
// branch: hard-gate the 4 text fields → build the DIRECT-BIND template-mode plan → reuse the
// UNMODIFIED renderUploadAndLog (polymorphic; template-mode renderScript). Background is BAKED
// into the provider template; Logo is the only governed asset modification. render_spec carries
// label='creative_library_video_stat_production' + a nested tmr evidence block (via the existing
// templateSpec/renderSpecLabel opts — renderUploadAndLog stays byte-unchanged). Governed-only /
// fail-loud: any throw (field gate / missing logo / render) hits the caller's per-draft catch →
// video_status='failed'. There is NO fallback to the legacy buildStatRevealSpec for this branch.
async function renderGovernedVideoStat(opts: {
  supabase: ReturnType<typeof getServiceClient>;
  creatomateKey: string;
  draft: { post_draft_id: string; client_id: string; draft_format: any; recommended_format: string; };
  brand: { primaryColour: string; secondaryColour: string; clientName: string; logoUrl: string | null; clientSlug: string };
  qaCtx: QaCtx;
}): Promise<object> {
  const { supabase, creatomateKey, draft, brand, qaCtx } = opts;
  const fmt = draft.recommended_format;
  const vs  = draft.draft_format?.video_script;

  // Fields sourced from the draft video_script (same source the legacy stat path reads); the plan
  // builder hard-gates all four (fail loud, no truncation) before any Creatomate call.
  const fields: B1VideoStatFields = {
    statValue:   vs?.stat_value   ?? '',
    statLabel:   vs?.stat_label   ?? '',
    contextLine: vs?.context_line ?? '',
    ctaText:     vs?.cta_text     ?? '',
  };

  // v3.6.0 (cc-0032 step 5): COMBO AUDIO. Compose the concise VO narration (CTA visual-only),
  // resolve the PP voice by client_id (fail-loud if unresolved — existing behaviour), generate the
  // VO, and resolve the governed music bed via select_music (empty result → '' silent bed per N1; an
  // RPC error throws b1_video_missing_music_rpc).
  const narration = composeGovernedVideoNarration(fields);
  const { voiceId, method } = getVoiceIdForDraft({ clientId: draft.client_id, clientSlug: brand.clientSlug, format: fmt });
  if (!voiceId) throw new Error(`No ElevenLabs voice ID configured for client_id=${draft.client_id} client_slug=${brand.clientSlug} method=${method} format=${fmt} (governed video_short_stat)`);
  const voicePath = `${brand.clientSlug}/${draft.post_draft_id}_stat_governed_voice.mp3`;
  const voiceUrl = await generateAndUploadVoice(supabase, narration, voiceId, voicePath);
  if (!voiceUrl) throw new Error('b1_video_governed_voiceover_failed');

  const bed = await resolveGovernedMusicBedUrl(supabase, { scopeKind: 'format', scopeValue: B1_VIDEO_GOVERNED_FORMAT });

  const plan = buildGovernedVideoStatPlan(fields, brand.logoUrl, voiceUrl, bed.url);

  // Template-mode renderScript (Creatomate v2/renders template-mode): { template_id, modifications,
  // output_format:'mp4' }. output_format is the template-mode video output field (mirrors the
  // image-worker's { template_id, modifications, output_format:'jpg' }; renderUploadAndLog is
  // polymorphic on the renderScript shape and passes it verbatim to the provider).
  const renderScript = { template_id: plan.providerTemplateId, modifications: plan.modifications, output_format: 'mp4' };

  // render_spec: label + nested tmr evidence carried via the EXISTING templateSpec/renderSpecLabel
  // opts (renderUploadAndLog emits render_spec.template verbatim → the tmr block rides inside it).
  // qaCtx marked withVoice=true (combo audio) so the render-QA reflects the VO.
  const comboQaCtx: QaCtx = { ...qaCtx, withVoice: true, captionsExpected: false, captionsPresent: false };
  const storagePath = `${brand.clientSlug}/${draft.post_draft_id}_stat_governed.mp4`;
  const videoUrl = await renderUploadAndLog({
    supabase, creatomateKey, renderScript, storagePath,
    postDraftId: draft.post_draft_id, clientId: draft.client_id, iceFormatKey: fmt, qaCtx: comboQaCtx,
    templateSpec: plan.templateSpec as unknown as Record<string, unknown>,
    renderSpecLabel: B1_VIDEO_PRODUCTION_LABEL,
    // v3.7.0 (cc-0034): record the governed track consumed — null when no bed was bound (D3).
    musicUsage: musicUsageFromBed(bed, fmt),
  });
  await supabase.schema('m').from('post_draft').update({ video_url: videoUrl, video_status: 'generated', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
  return { post_draft_id: draft.post_draft_id, format: fmt, status: 'generated', video_url: videoUrl, governed: true };
}

async function processDraft(opts: {
  supabase: ReturnType<typeof getServiceClient>;
  creatomateKey: string;
  draft: { post_draft_id: string; client_id: string; draft_format: any; recommended_format: string; };
  withVoice: boolean;
  logoMemo: Map<string, Promise<AssetVerdict>>;  // v3.3.0 (H2): per-request asset-URL validation memo
}): Promise<object> {
  const { supabase, creatomateKey, draft, withVoice, logoMemo } = opts;
  const fmt = draft.recommended_format;
  const vs  = draft.draft_format?.video_script;
  const brand = await getBrand(supabase, draft.client_id);
  // v3.3.1 (H2): validate the brand logo BEFORE building the render spec; a 4xx/malformed
  // logo falls back to the existing wordmark/no-logo path (logoUrl=null overrides
  // brand.logoUrl); a transient blip PROCEEDS with the original logo (Creatomate is source
  // of truth — resolveLegacyLogo never throws).
  const { logoUrl } = await resolveLegacyLogo(brand.logoUrl, logoMemo);
  const b   = { ...brand, logoUrl };

  // v3.0.0 (A): resolve music URL once per draft. Null if env-gated off.
  const musicUrl = resolveMusicUrl(fmt);

  let audioUrl: string | null = null;
  let captionText: string | null = null;  // v3.1.0 — kinetic_voice captions
  if (withVoice) {
    const { voiceId, method } = getVoiceIdForDraft({ clientId: draft.client_id, clientSlug: b.clientSlug, format: fmt });
    if (!voiceId) throw new Error(`No ElevenLabs voice ID configured for client_id=${draft.client_id} client_slug=${b.clientSlug} method=${method} format=${fmt}`);
    const narration = vs?.narration_text ?? '';
    if (!narration) throw new Error('video_script.narration_text is empty');
    const audioPath = `${b.clientSlug}/${draft.post_draft_id}_voice.mp3`;
    audioUrl = await generateAndUploadVoice(supabase, narration, voiceId, audioPath);
    if (!audioUrl) throw new Error('ElevenLabs TTS failed');
    captionText = narration;  // captions derive from the same narration as the TTS
  }
  // v3.1.5 (QA-VISIBILITY-V0): minimal QA context — render-derived data already in scope.
  const narrationForQa = vs?.narration_text ?? '';
  const qaCtx: QaCtx = {
    withVoice,
    expectedFormat: fmt,
    captionsExpected: (fmt === 'video_short_kinetic_voice'),
    captionsPresent: (fmt === 'video_short_kinetic_voice' && !!narrationForQa),
    sceneCount: (vs?.scenes?.length ?? null),
  };
  // ── v3.5.0 CREATIVE-LIBRARY VIDEO TMR: Property-Pulse-ONLY governed video_short_stat branch.
  // Runs BEFORE the legacy isKinetic/isStat block with an EARLY RETURN, so both legacy branch
  // bodies stay byte-untouched. Gate keys on client_id + format (NOT the _voice variant) AND the
  // governance flag (fail-closed). The (PP, video_short_stat) row is enabled=true (armed
  // 2026-07-10), so this fork IS taken for the governed PP client + video_short_stat → the governed
  // render runs (it has produced draft-linked render 8c41689a). Governed-only, fail-loud: any throw
  // hits the existing per-draft catch → video_status='failed' (no legacy fallback for this branch).
  // Every other client / format falls through unchanged (fail-closed).
  if (isB1GovernedVideoStat(draft.client_id, fmt) && await isVideoGovernanceEnabled(supabase, draft.client_id, B1_VIDEO_GOVERNED_FORMAT)) {
    return await renderGovernedVideoStat({ supabase, creatomateKey, draft, brand: b, qaCtx });
  }

  const isKinetic = fmt === 'video_short_kinetic' || fmt === 'video_short_kinetic_voice';
  const isStat    = fmt === 'video_short_stat'    || fmt === 'video_short_stat_voice';
  if (isKinetic) {
    if (!vs?.scenes || !Array.isArray(vs.scenes) || vs.scenes.length < 3)
      throw new Error('missing_or_invalid_video_script_scenes');
    const spec = buildKineticTextSpec({ scenes: vs.scenes, ...b, audioUrl, musicUrl, captionText });
    const storagePath = `${b.clientSlug}/${draft.post_draft_id}_kinetic${withVoice ? '_voice' : ''}.mp4`;
    const videoUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript: spec, storagePath, postDraftId: draft.post_draft_id, clientId: draft.client_id, iceFormatKey: fmt, qaCtx });
    await supabase.schema('m').from('post_draft').update({ video_url: videoUrl, video_status: 'generated', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
    return { post_draft_id: draft.post_draft_id, format: fmt, status: 'generated', video_url: videoUrl };
  }
  if (isStat) {
    if (!vs?.stat_value) throw new Error('missing_video_script_stat_value');
    const spec = buildStatRevealSpec({ statValue: vs.stat_value, statLabel: vs.stat_label ?? 'key statistic', contextLine: vs.context_line ?? '', ctaText: vs.cta_text ?? 'What does this mean for you?', ...b, audioUrl, musicUrl });
    const storagePath = `${b.clientSlug}/${draft.post_draft_id}_stat${withVoice ? '_voice' : ''}.mp4`;
    const videoUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript: spec, storagePath, postDraftId: draft.post_draft_id, clientId: draft.client_id, iceFormatKey: fmt, qaCtx });
    await supabase.schema('m').from('post_draft').update({ video_url: videoUrl, video_status: 'generated', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
    return { post_draft_id: draft.post_draft_id, format: fmt, status: 'generated', video_url: videoUrl };
  }
  throw new Error(`Unsupported format: ${fmt}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return jsonResponse({ ok: true, function: 'video-worker', version: VERSION });

  const expected = Deno.env.get('PUBLISHER_API_KEY');
  const provided  = req.headers.get('x-video-worker-key');
  if (!expected) return jsonResponse({ ok: false, error: 'PUBLISHER_API_KEY_not_set' }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);

  const creatomateKey = Deno.env.get('CREATOMATE_API_KEY');
  if (!creatomateKey) return jsonResponse({ ok: false, error: 'CREATOMATE_API_KEY not set' }, 500);

  // ── LANE W (v3.4.0): template_smoke RETIRED — explicit 410 guard (D-W1) ─────
  // The Gate D2 smoke branch rendered bc32f52f… (PP 9:16 news video), which was
  // DELETED provider-side (recon Leg-3, 2026-07-05). The branch body + the smoke
  // exports of ./template_smoke.ts are removed; the mode returns an explicit 410
  // (fires on the mode alone, any template value) so a stray manual request can
  // NEVER fall through toward the production loop.
  let smokeBody: any = {};
  try { smokeBody = await req.json(); } catch { /* no/invalid body => not a smoke request */ }
  if (smokeBody?.mode === 'template_smoke') {
    return jsonResponse({ ok: false, error: 'template_smoke_retired', note: 'retired 2026-07-05 Lane W — provider templates deleted; see docs/governance/tmr-gov-provider-1-pre-cleanup-guard.md' }, 410);
  }

  // ── v3.5.0: SUPERVISED GOVERNED VIDEO STAT SMOKE (mode==='governed_video_stat_smoke') ──────
  // Renders the DIRECT-BIND governed stat template (901a30ce…) with SAMPLE video_script fields to
  // post-videos/_smoke/ and writes ONE post_render_log row (postDraftId=null, clientId=null,
  // logMustSucceed=true), then RETURNS — mirroring the retired B0 image/video smoke mechanism.
  // It does NOT read a production draft, does NOT require governance enabled=true, does NOT flip
  // enabled, does NOT publish. Same x-video-worker-key auth as the production path (already
  // checked above). Optional body.fields overrides let the supervisor vary the sample copy; blank
  // fields fall back to the built-in sample (each within its contract max_chars).
  if (smokeBody?.mode === 'governed_video_stat_smoke') {
    try {
      const sf = smokeBody?.fields ?? {};
      const sampleFields: B1VideoStatFields = {
        statValue:   String(sf.stat_value   ?? '$782K'),
        statLabel:   String(sf.stat_label   ?? 'Perth median house price'),
        contextLine: String(sf.context_line ?? 'Up 3.7% over the past quarter — the strongest capital-city growth in the country.'),
        ctaText:     String(sf.cta_text     ?? 'What does this mean for your next move?'),
      };
      const sampleLogo = String(smokeBody?.logo_url ?? 'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png');
      const smokeSupabase = getServiceClient();

      // v3.6.0 (cc-0032 step 5): COMBO AUDIO in the smoke — compose the concise VO narration,
      // resolve the PP voice by the governed client_id (slug 'property-pulse'), generate the VO
      // (fail-loud if unresolved), and resolve the governed bed via select_music (empty result → ''
      // silent bed per N1; RPC error throws). Voice-id resolution is identical to the production branch.
      const narration = composeGovernedVideoNarration(sampleFields);
      const { voiceId, method } = getVoiceIdForDraft({ clientId: B1_VIDEO_GOVERNED_CLIENT_ID, clientSlug: 'property-pulse', format: B1_VIDEO_GOVERNED_FORMAT });
      if (!voiceId) throw new Error(`No ElevenLabs voice ID configured for governed smoke (client_id=${B1_VIDEO_GOVERNED_CLIENT_ID} method=${method})`);
      const smokeVoiceUrl = await generateAndUploadVoice(smokeSupabase, narration, voiceId, '_smoke/governed_video_stat_v1_voice.mp3');
      if (!smokeVoiceUrl) throw new Error('b1_video_governed_smoke_voiceover_failed');
      const smokeBed = await resolveGovernedMusicBedUrl(smokeSupabase, { scopeKind: 'format', scopeValue: B1_VIDEO_GOVERNED_FORMAT });

      const plan = buildGovernedVideoStatPlan(sampleFields, sampleLogo, smokeVoiceUrl, smokeBed.url);
      const renderScript = { template_id: plan.providerTemplateId, modifications: plan.modifications, output_format: 'mp4' };
      const storageUrl = await renderUploadAndLog({
        supabase: smokeSupabase, creatomateKey, renderScript,
        storagePath: '_smoke/governed_video_stat_v1.mp4',
        postDraftId: null, clientId: null, iceFormatKey: B1_VIDEO_GOVERNED_FORMAT,
        qaCtx: { withVoice: true, expectedFormat: B1_VIDEO_GOVERNED_FORMAT, captionsExpected: false, captionsPresent: false, sceneCount: null },
        templateSpec: plan.templateSpec as unknown as Record<string, unknown>,
        renderSpecLabel: B1_VIDEO_PRODUCTION_LABEL,
        logMustSucceed: true,
        // v3.7.0 (cc-0034): smoke has no draft (postDraftId null) → D5 LENIENT; format = the governed
        // format. null when no bed was bound (D3).
        musicUsage: musicUsageFromBed(smokeBed, B1_VIDEO_GOVERNED_FORMAT),
      });
      return jsonResponse({ ok: true, mode: 'governed_video_stat_smoke', provider_template_id: plan.providerTemplateId, render_spec_label: B1_VIDEO_PRODUCTION_LABEL, music_bed: !!smokeBed.url, storage_url: storageUrl, version: VERSION });
    } catch (e: any) {
      return jsonResponse({ ok: false, mode: 'governed_video_stat_smoke', error: (e?.message ?? String(e)).slice(0, 500), version: VERSION }, 500);
    }
  }

  const supabase = getServiceClient();
  const results: any[] = [];
  // v3.3.0 (H2): ONE asset-URL validation memo per request, shared across every draft's
  // logo resolution (a brand logo URL is validated at most once per request).
  const logoMemo = new Map<string, Promise<AssetVerdict>>();

  // Pick drafts: video formats, video_status='pending', approval in (approved, published).
  const { data: pendingDrafts } = await supabase.schema('m').from('post_draft')
    .select('post_draft_id, client_id, draft_format, recommended_format')
    .in('approval_status', ['approved', 'published'])
    .eq('video_status', 'pending')
    .in('recommended_format', ['video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice'])
    .limit(4);

  for (const draft of (pendingDrafts ?? [])) {
    const withVoice = draft.recommended_format.endsWith('_voice');
    try {
      const result = await processDraft({ supabase, creatomateKey, draft, withVoice, logoMemo });
      results.push(result);
      console.log(`[video-worker] ${VERSION} done: ${draft.post_draft_id} (${draft.recommended_format})`);
    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 2000);
      console.error(`[video-worker] failed ${draft.post_draft_id}:`, msg);
      await supabase.schema('m').from('post_draft').update({ video_status: 'failed', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
      // v3.1.5 (QA-VISIBILITY-V0): additive render-QA on the OUTER per-draft pre-render
      // catch. p_render_engine is LEFT EXACTLY as-is; qa.engine is the normalized label.
      const outerFmt = draft.recommended_format;
      const outerFailureStage = /No ElevenLabs voice ID/i.test(msg) ? 'voice_id_resolution'
        : /TTS failed/i.test(msg) ? 'tts'
        : /narration_text is empty/i.test(msg) ? 'narration'
        : /scenes|stat_value/i.test(msg) ? 'validation'
        : 'pre_render';
      const outerRenderSpec = {
        qa: safeQa(() => buildRenderQa({
          expected_format: outerFmt,
          engine: 'creatomate', render_mode: 'composition',
          duration_semantics: 'render_wallclock',
          dimension: '1080x1920', aspect: '9:16',
          status: 'failed', failure_stage: outerFailureStage,
          provider_job_id_present: false,
          output_url_present: false,
          storage_url_present: false,
          duration_ms: 0,
          file_size_bytes: null,
          audio_expected: withVoice,
          voice_expected: withVoice,
          tts_provider: withVoice ? 'elevenlabs' : null,
          captions_expected: (outerFmt === 'video_short_kinetic_voice'),
          captions_present: false,
          scene_count: (draft.draft_format?.video_script?.scenes?.length ?? null),
          avatar_expected: false,
          fallback_taken: null,
          cost_present: false,
          cost_estimated_flag: false,
        })),
      };
      try { await supabase.rpc('write_render_log', { p_post_draft_id: draft.post_draft_id, p_slide_id: null, p_client_id: draft.client_id, p_ice_format_key: draft.recommended_format, p_render_engine: withVoice ? 'creatomate+elevenlabs' : 'creatomate', p_creatomate_render_id: null, p_status: 'failed', p_output_url: null, p_storage_url: null, p_credits_used: null, p_render_duration_ms: 0, p_error_message: msg, p_render_spec: outerRenderSpec }); } catch { }
      results.push({ post_draft_id: draft.post_draft_id, format: draft.recommended_format, status: 'failed', error: msg });
    }
  }

  if (!results.length) return jsonResponse({ ok: true, message: 'no_video_drafts_pending', version: VERSION });
  return jsonResponse({ ok: true, version: VERSION, processed: results.length, results });
});
