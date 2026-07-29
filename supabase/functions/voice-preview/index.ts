// supabase/functions/voice-preview/index.ts
//
// voice-preview v1.0.0
// ============================================================================
// v1.0.0 (2026-07-29, cc-0086 — Brand Host Voice supervised preview, NEW function):
//   NEW, narrowly-scoped edge function (brief: docs/briefs/cc-0086-brand-host-voice-config-brief-v1.md).
//   Lets the dashboard's "Test voice" action call the ElevenLabs TTS endpoint with an
//   operator-supplied elevenlabs_voice_id + a FIXED, non-arbitrary sample sentence (never free
//   text from the caller — cost/abuse control per the brief) and returns the resulting audio
//   inline as base64 for supervised listening. PERSISTS NOTHING: no storage upload, no DB write,
//   no c.client_voice_config touch, no c.client_voice_config_change_log row. Mirrors
//   video-worker's generateAndUploadVoice ElevenLabs call shape EXACTLY (same endpoint
//   https://api.elevenlabs.io/v1/text-to-speech/{voice_id}, same headers, same
//   model_id:'eleven_multilingual_v2' + voice_settings body), but reads the response bytes back
//   as base64 instead of uploading to the post-videos bucket.
//
//   verify_jwt POSTURE (standing ICE gotcha — read before deploying): this slug is deliberately
//   NOT added to supabase/config.toml, so it gets the CLI/Supabase default verify_jwt=true —
//   the SAME (unlisted) posture as brand-scanner. It is dashboard-invoked ONLY (a Next.js server
//   action calling with the service-role key, which itself satisfies the JWT check), never a
//   pg_cron/webhook caller, so it carries NO x-series-key gate. Deploy this function WITHOUT
//   --no-verify-jwt — that flag is video-worker's unrelated x-series-key requirement; applying it
//   here would be the OPPOSITE of the correct posture for this function.
//
//   SECRET HANDLING: ELEVENLABS_API_KEY is read server-side only via Deno.env.get, exactly as
//   video-worker already does, and is NEVER included in any response body, thrown-error message,
//   or console.log/console.error line (only ITS ABSENCE is ever logged/returned).
//
//   STRICTLY OUT OF SCOPE: supabase/functions/video-worker/** (voice_id.ts, voice_id_test.ts,
//   index.ts, or any production TTS/render path) — none of it is imported, edited, or redeployed
//   by this change; that code stays byte-identical. No DB migration/apply, no grant/revoke, no
//   secret rotation, no storage bucket write, no new flag.
// ============================================================================

const ELEVENLABS_TTS = 'https://api.elevenlabs.io/v1/text-to-speech';

// Fixed, non-arbitrary sample text — NEVER accept free text from the caller (cost/abuse control,
// per the brief). Changing this requires a code deploy, by design.
export const SAMPLE_TEXT = "This is a preview of your brand's narration voice.";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Pure, hermetically-testable base64 encoder for the (short, seconds-long) preview clip bytes.
// Chunked to avoid a call-stack blowup from spreading a large Uint8Array into String.fromCharCode.
export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Pure request-shape validation — exported for hermetic testing. Rejects missing/blank/non-string
// elevenlabs_voice_id; accepts nothing else from the request body (no arbitrary sample text).
export function validateVoiceId(body: unknown): { ok: true; voiceId: string } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'request body must be a JSON object' };
  }
  const voiceId = (body as Record<string, unknown>).elevenlabs_voice_id;
  if (typeof voiceId !== 'string' || voiceId.trim() === '') {
    return { ok: false, error: 'elevenlabs_voice_id is required and must be a non-blank string' };
  }
  return { ok: true, voiceId: voiceId.trim() };
}

// Structured error carrying the upstream HTTP status, so the caller can mirror it (401/404/429/…)
// rather than always collapsing to a generic 502.
class ElevenLabsError extends Error {
  httpStatus: number;
  constructor(message: string, httpStatus: number) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

// Calls ElevenLabs TTS for the FIXED sample sentence only — mirrors video-worker's
// generateAndUploadVoice request shape exactly (same endpoint, headers, model_id, voice_settings).
// Returns the raw audio bytes on success; throws ElevenLabsError (with the upstream status) on a
// non-2xx response. fetchImpl is injectable for hermetic tests (no real network in tests).
export async function callElevenLabsPreview(
  voiceId: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ArrayBuffer> {
  const resp = await fetchImpl(`${ELEVENLABS_TTS}/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({
      text: SAMPLE_TEXT,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!resp.ok) {
    const detail = (await resp.text()).slice(0, 300);
    throw new ElevenLabsError(`ElevenLabs TTS ${resp.status}: ${detail}`, resp.status);
  }
  return await resp.arrayBuffer();
}

// The exported request handler — no Deno.serve side effect on import (see the import.meta.main
// guard below), so hermetic tests can call this directly with a constructed Request and an
// injected apiKey/fetch, without starting a server or touching real ElevenLabs/env state.
export async function handleRequest(
  req: Request,
  opts: { apiKey?: string | null; fetchImpl?: typeof fetch } = {},
): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'POST only' }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'request body must be valid JSON' }, 400);
  }

  const validated = validateVoiceId(body);
  if (!validated.ok) {
    return jsonResponse({ error: validated.error }, 400);
  }

  // 'apiKey' in opts lets a hermetic test force the "missing key" branch (opts.apiKey === null)
  // deterministically, independent of whatever the real ELEVENLABS_API_KEY env var happens to be
  // in the ambient shell — production callers never pass opts, so they always hit Deno.env.get.
  const apiKey = ('apiKey' in opts) ? opts.apiKey : Deno.env.get('ELEVENLABS_API_KEY');
  if (!apiKey) {
    // Never echo the key itself — only its absence is ever reported.
    console.error('[voice-preview] ELEVENLABS_API_KEY missing');
    return jsonResponse({ error: 'preview unavailable: server misconfiguration' }, 502);
  }

  try {
    const audioBuf = await callElevenLabsPreview(validated.voiceId, apiKey, opts.fetchImpl ?? fetch);
    return jsonResponse({ audio_base64: arrayBufferToBase64(audioBuf), content_type: 'audio/mpeg' }, 200);
  } catch (e: any) {
    const status = e instanceof ElevenLabsError ? e.httpStatus : 502;
    console.error('[voice-preview] ElevenLabs call failed:', e?.message ?? e);
    return jsonResponse({ error: e?.message ?? 'unexpected error calling ElevenLabs' }, status);
  }
}

// import.meta.main guard: lets the hermetic test import handleRequest / validateVoiceId /
// callElevenLabsPreview / arrayBufferToBase64 WITHOUT starting the HTTP server (mirrors
// heygen-worker/index.ts's identical pattern). In production the deployed module IS the entry
// point, so import.meta.main === true and Deno.serve runs identically (zero behaviour change).
if (import.meta.main) Deno.serve((req: Request) => handleRequest(req));
