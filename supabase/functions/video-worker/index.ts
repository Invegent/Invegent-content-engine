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
import { SMOKE_TEMPLATE_NAME, SMOKE_RENDER_SPEC_LABEL, isSmokeRequest, buildSmokeModifications, buildTemplateRenderScript, computePropsHash, buildRenderSpecTemplate, composeRenderSpec } from './template_smoke.ts';  // v3.2.0: GATE D2
import { resolveLegacyLogo, type AssetVerdict } from './asset_url_guard.ts';  // v3.3.0: H2 asset-URL validation before Creatomate

const VERSION = 'video-worker-v3.3.1';
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

async function renderUploadAndLog(opts: {
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
}): Promise<string> {
  const { supabase, creatomateKey, renderScript, storagePath, postDraftId, clientId, iceFormatKey, qaCtx } = opts;
  const startMs = Date.now();
  let renderId: string | null = null;
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
    const storageUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/post-videos/${storagePath}`;
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
    return storageUrl;
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

  // ── CREATIVE-LIBRARY-V0 GATE D2: manual-only template-mode VIDEO smoke ──────
  // Isolated, opt-in branch. Runs ONLY for the exact mode/template flags and
  // returns BEFORE any production draft selection. Touches NO post_draft, queue,
  // advisor, or publish path. Renders the proven Property Pulse animated news
  // template (Creatomate template mode), stores the MP4, and writes ONE
  // post_render_log row whose render_spec carries BOTH qa (preserved) and
  // template (additive sibling). ice_format_key='video_short_stat' is a governed
  // LABEL only; true identity lives in render_spec.template.
  let smokeBody: any = {};
  try { smokeBody = await req.json(); } catch { /* no/invalid body => not a smoke request */ }
  if (isSmokeRequest(smokeBody)) {
    const supabase = getServiceClient();
    const modifications = buildSmokeModifications(smokeBody);
    if (!modifications['Background.source'] || !modifications['Logo.source']) {
      return jsonResponse({ ok: false, error: 'template_smoke requires background_url and logo_url in body' }, 400);
    }
    const renderScript = buildTemplateRenderScript(modifications);
    const props_hash = await computePropsHash(modifications);
    const templateSpec = buildRenderSpecTemplate(props_hash);
    const qaCtx: QaCtx = { withVoice: false, expectedFormat: 'video_short_stat', captionsExpected: false, captionsPresent: false, sceneCount: null };
    const storageUrl = await renderUploadAndLog({
      supabase, creatomateKey, renderScript,
      storagePath: '_smoke/pp_news_centred_scrim_9x16_video_v1.mp4',
      postDraftId: null, clientId: null, iceFormatKey: 'video_short_stat',
      qaCtx, templateSpec, renderSpecLabel: SMOKE_RENDER_SPEC_LABEL, logMustSucceed: true,
    });
    return jsonResponse({ ok: true, mode: 'template_smoke', template: SMOKE_TEMPLATE_NAME, storage_url: storageUrl, props_hash, render_spec_label: SMOKE_RENDER_SPEC_LABEL });
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
