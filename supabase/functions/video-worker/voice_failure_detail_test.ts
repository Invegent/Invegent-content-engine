// v3.18.0 (F-VOICE-DIAGNOSABILITY) — focused test for sanitizeVoiceFailureDetail + the
// classification invariant it exists to protect.
//
// THE INVARIANT UNDER TEST: embedding a sanitized provider detail in a VO failure message can
// NEVER change classifyRenderFailure's verdict. Provider bodies are free text; without this, an
// ElevenLabs body containing "Gateway Timeout" or a bare "500" would silently flip a TERMINAL
// voiceover failure into a RETRIED one — changing retry semantics as a side effect of a
// diagnosability fix. Retry semantics are deliberately unchanged by v3.18.0.
//
// Run: deno test supabase/functions/video-worker/voice_failure_detail_test.ts
//
// index.ts has a top-level, unguarded Deno.serve entrypoint — it is neutralised BEFORE the dynamic
// import (mirrors clear_video_retry_meta_test.ts / classify_render_failure_test.ts) so importing the
// module here does not start a live HTTP listener. Production code is byte-unchanged; only the
// global is stubbed. The dynamic import below is NOT a hoisted static import, so it runs after.
import { assert, assertEquals } from 'jsr:@std/assert@1';

// deno-lint-ignore no-explicit-any
(Deno as any).serve = (..._args: any[]) => ({ finished: Promise.resolve(), async shutdown() {}, ref() {}, unref() {}, addr: { transport: 'tcp', hostname: '0.0.0.0', port: 0 } });

const { classifyRenderFailure, sanitizeVoiceFailureDetail } = await import('./index.ts');

// Independent re-declaration of classifyRenderFailure's transient regex. Deliberately NOT imported
// from index.ts: if someone edits the production regex, this copy stops mirroring it and the tests
// below fail loudly rather than silently re-deriving the same (possibly wrong) answer.
const CLASSIFIER_MIRROR = /timed out|timeout|\b5\d\d\b|fetch failed|network|temporar|failed to download/i;

// Real-shaped ElevenLabs / storage failure bodies, including ones deliberately chosen because they
// contain transient-classifier trigger words.
const PROVIDER_BODIES = [
  '{"detail":{"status":"invalid_api_key","message":"Invalid API key provided"}}',
  '{"detail":{"status":"quota_exceeded","message":"You have exceeded your character quota"}}',
  '{"detail":{"status":"voice_not_found","message":"A voice with voice_id was not found."}}',
  '502 Bad Gateway',
  'Gateway Timeout',
  'upstream request timed out',
  'fetch failed',
  'temporary network failure',
  'Internal Server Error 500',
  'failed to download the requested resource',
  '',
];

Deno.test('sanitized detail never flips a terminal VO failure to transient', () => {
  for (const body of PROVIDER_BODIES) {
    const detail = sanitizeVoiceFailureDetail(body);
    for (const prefix of [
      'b1_video_governed_voiceover_failed',
      'ElevenLabs TTS failed',
      'b1_video_governed_smoke_voiceover_failed',
    ]) {
      for (const reason of ['voice_api_key_missing', 'voice_id_missing', 'tts_empty_audio_body',
                            'tts_http_status_401', 'tts_http_status_429', 'tts_http_status_500',
                            'tts_http_status_503', 'audio_upload_failed', 'tts_fetch_threw']) {
        const msg = `${prefix}: ${reason}:${detail}`;
        assertEquals(
          classifyRenderFailure(msg),
          'terminal',
          `expected terminal for ${JSON.stringify(msg)}`,
        );
      }
    }
  }
});

Deno.test('the raw (unsanitized) bodies WOULD have flipped classification — proves the guard is load-bearing', () => {
  const flippers = ['502 Bad Gateway', 'Gateway Timeout', 'upstream request timed out',
                    'fetch failed', 'temporary network failure', 'Internal Server Error 500',
                    'failed to download the requested resource'];
  for (const body of flippers) {
    assertEquals(
      classifyRenderFailure(`b1_video_governed_voiceover_failed: tts_http_status_502:${body}`),
      'transient',
      `expected RAW body ${JSON.stringify(body)} to flip classification (guard would be pointless otherwise)`,
    );
  }
});

Deno.test('tts_http_status_<5xx> token alone cannot flip classification', () => {
  // The underscore before the digits denies \b5\d\d\b its leading word boundary.
  for (const s of [500, 502, 503, 504]) {
    assertEquals(classifyRenderFailure(`b1_video_governed_voiceover_failed: tts_http_status_${s}:`), 'terminal');
  }
});

Deno.test('sanitizer preserves the diagnostically useful part', () => {
  const d = sanitizeVoiceFailureDetail('{"detail":{"status":"invalid_api_key","message":"Invalid API key provided"}}');
  assert(d.includes('invalid_api_key'), `lost the useful token: ${d}`);
  assert(d.includes('Invalid API key provided'), `lost the useful message: ${d}`);
});

// ── v3.18.0 rev-2 (external review 083e73ea): the NARROWING ────────────────────────────────────
// rev-1 replaced ANY 3-digit run with '~', destroying operationally useful provider numbers. These
// assert the narrowed behaviour: only a bare word-bounded 5xx is touched; everything else survives.

Deno.test('rev-2: numbers that CANNOT flip classification are preserved VERBATIM', () => {
  for (const [body, mustKeep] of [
    ['character limit 5000 exceeded', '5000'],   // 4 digits → trailing \b denied → safe
    ['status 429 rate limited', '429'],          // wrong leading digit → safe
    ['HTTP 404 voice not found', '404'],         // wrong leading digit → safe
    ['retry after 30 seconds', '30'],            // 2 digits → safe
    ['quota 12345 of 300000', '300000'],         // long runs → safe
  ] as const) {
    const d = sanitizeVoiceFailureDetail(body);
    assert(d.includes(mustKeep), `rev-1 regression: ${JSON.stringify(mustKeep)} was destroyed in ${JSON.stringify(d)}`);
  }
});

Deno.test('rev-2: a bare 5xx is neutralised but its EXACT value is still readable', () => {
  for (const s of ['500', '502', '503', '504', '599']) {
    const d = sanitizeVoiceFailureDetail(`upstream returned ${s} from provider`);
    assert(d.includes(s), `lost the status value entirely: ${d}`);
    assertEquals(classifyRenderFailure(`b1_video_governed_voiceover_failed: tts_http_status_${s}:${d}`), 'terminal');
  }
});

Deno.test('rev-2: overlapping triggers that re-form after one pass are still neutralised', () => {
  // "fetch failed to download": the leftmost alternative consumes "fetch failed", leaving an intact
  // "failed to download" behind it. This is exactly what the fail-closed backstop exists for.
  for (const nasty of [
    'fetch failed to download the asset',
    'network timeout: fetch failed to download',
    'timed out timeout timed out',
    'fetch failed failed to download network 503 temporary',
  ]) {
    const d = sanitizeVoiceFailureDetail(nasty);
    assertEquals(
      CLASSIFIER_MIRROR.test(d), false,
      `a transient trigger SURVIVED sanitisation: ${JSON.stringify(d)}`,
    );
    assertEquals(classifyRenderFailure(`b1_video_governed_voiceover_failed: tts_http_status_502:${d}`), 'terminal');
  }
});

Deno.test('sanitizer bounds length and normalises whitespace', () => {
  const long = 'x'.repeat(500);
  assert(sanitizeVoiceFailureDetail(long).length <= 200);
  assertEquals(sanitizeVoiceFailureDetail('  a\n\n b \t c  '), 'a b c');
  assertEquals(sanitizeVoiceFailureDetail(''), '');
});
