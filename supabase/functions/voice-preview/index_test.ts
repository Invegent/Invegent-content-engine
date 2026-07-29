// Hermetic unit tests for voice-preview (cc-0086 Brand Host Voice supervised preview).
// Run: deno test --allow-env supabase/functions/voice-preview/index_test.ts
//
// Fully hermetic: NO real Supabase client, NO real ElevenLabs API call, NO DB, NO network.
// A canned fetchImpl is injected via handleRequest's opts (mirrors the house style of injecting
// a stub client/fetch rather than mutating globalThis.fetch, kept local to each test's call).
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { arrayBufferToBase64, callElevenLabsPreview, handleRequest, SAMPLE_TEXT, validateVoiceId } from './index.ts';

function postRequest(body: unknown): Request {
  return new Request('https://example.invalid/voice-preview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function fakeFetch(status: number, respBody: BodyInit, calls: Array<{ url: string; init: any }>): typeof fetch {
  return ((input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push({ url, init });
    return Promise.resolve(new Response(respBody, { status }));
  }) as typeof fetch;
}

// --- validateVoiceId (pure) ---------------------------------------------------

Deno.test('validateVoiceId: missing elevenlabs_voice_id => rejected', () => {
  const r = validateVoiceId({});
  assertEquals(r.ok, false);
});

Deno.test('validateVoiceId: blank/whitespace elevenlabs_voice_id => rejected', () => {
  const r = validateVoiceId({ elevenlabs_voice_id: '   ' });
  assertEquals(r.ok, false);
});

Deno.test('validateVoiceId: non-string elevenlabs_voice_id => rejected', () => {
  const r = validateVoiceId({ elevenlabs_voice_id: 12345 });
  assertEquals(r.ok, false);
});

Deno.test('validateVoiceId: null body => rejected', () => {
  const r = validateVoiceId(null);
  assertEquals(r.ok, false);
});

Deno.test('validateVoiceId: valid trimmed voice id => accepted', () => {
  const r = validateVoiceId({ elevenlabs_voice_id: '  abc123  ' });
  assert(r.ok);
  if (r.ok) assertEquals(r.voiceId, 'abc123');
});

// --- arrayBufferToBase64 (pure) ----------------------------------------------

Deno.test('arrayBufferToBase64: round-trips known bytes', () => {
  const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
  const b64 = arrayBufferToBase64(bytes.buffer);
  assertEquals(b64, btoa('Hello'));
});

Deno.test('arrayBufferToBase64: empty buffer => empty string', () => {
  assertEquals(arrayBufferToBase64(new ArrayBuffer(0)), '');
});

// --- callElevenLabsPreview (request-shaping) ---------------------------------

Deno.test('callElevenLabsPreview: posts the FIXED sample text + exact model/voice_settings shape to the correct endpoint', async () => {
  const calls: Array<{ url: string; init: any }> = [];
  const audioBytes = new Uint8Array([1, 2, 3, 4]).buffer;
  const fetchImpl = fakeFetch(200, audioBytes, calls);

  const result = await callElevenLabsPreview('voice_xyz', 'fake-api-key', fetchImpl);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, 'https://api.elevenlabs.io/v1/text-to-speech/voice_xyz');
  assertEquals(calls[0].init.method, 'POST');
  assertEquals(calls[0].init.headers['xi-api-key'], 'fake-api-key');
  assertEquals(calls[0].init.headers['Accept'], 'audio/mpeg');
  const sentBody = JSON.parse(calls[0].init.body);
  assertEquals(sentBody.text, SAMPLE_TEXT);
  assertEquals(sentBody.model_id, 'eleven_multilingual_v2');
  assertEquals(sentBody.voice_settings, { stability: 0.5, similarity_boost: 0.75 });
  assertEquals(new Uint8Array(result), new Uint8Array(audioBytes));
});

Deno.test('callElevenLabsPreview: never sends caller-supplied text — only SAMPLE_TEXT, regardless of what a caller might try to smuggle in', async () => {
  const calls: Array<{ url: string; init: any }> = [];
  const fetchImpl = fakeFetch(200, new ArrayBuffer(2), calls);
  await callElevenLabsPreview('voice_abc', 'k', fetchImpl);
  const sentBody = JSON.parse(calls[0].init.body);
  assertEquals(sentBody.text, "This is a preview of your brand's narration voice.");
});

Deno.test('callElevenLabsPreview: upstream non-2xx => throws carrying the upstream status', async () => {
  const calls: Array<{ url: string; init: any }> = [];
  const fetchImpl = fakeFetch(404, 'voice not found', calls);
  let threw = false;
  try {
    await callElevenLabsPreview('missing_voice', 'k', fetchImpl);
  } catch (e: any) {
    threw = true;
    assertEquals(e.httpStatus, 404);
  }
  assert(threw, 'a non-2xx upstream response must throw');
});

// --- handleRequest (HTTP shaping + status-mirroring) -------------------------

Deno.test('handleRequest: non-POST => 405', async () => {
  const req = new Request('https://example.invalid/voice-preview', { method: 'GET' });
  const res = await handleRequest(req);
  assertEquals(res.status, 405);
});

Deno.test('handleRequest: OPTIONS => 204 (CORS preflight)', async () => {
  const req = new Request('https://example.invalid/voice-preview', { method: 'OPTIONS' });
  const res = await handleRequest(req);
  assertEquals(res.status, 204);
});

Deno.test('handleRequest: invalid JSON body => 400', async () => {
  const req = new Request('https://example.invalid/voice-preview', {
    method: 'POST',
    body: 'not json{{{',
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const json = await res.json();
  assert(typeof json.error === 'string');
});

Deno.test('handleRequest: missing elevenlabs_voice_id => 400, no fetch attempted', async () => {
  const calls: Array<{ url: string; init: any }> = [];
  const fetchImpl = fakeFetch(200, new ArrayBuffer(0), calls);
  const res = await handleRequest(postRequest({}), { apiKey: 'k', fetchImpl });
  assertEquals(res.status, 400);
  assertEquals(calls.length, 0, 'a bad request must never reach ElevenLabs');
});

Deno.test('handleRequest: blank elevenlabs_voice_id => 400, no fetch attempted', async () => {
  const calls: Array<{ url: string; init: any }> = [];
  const fetchImpl = fakeFetch(200, new ArrayBuffer(0), calls);
  const res = await handleRequest(postRequest({ elevenlabs_voice_id: '   ' }), { apiKey: 'k', fetchImpl });
  assertEquals(res.status, 400);
  assertEquals(calls.length, 0);
});

Deno.test('handleRequest: missing ELEVENLABS_API_KEY => 502, error message never contains a key value, no fetch attempted', async () => {
  const calls: Array<{ url: string; init: any }> = [];
  const fetchImpl = fakeFetch(200, new ArrayBuffer(0), calls);
  // apiKey: null deterministically forces the "missing key" branch, independent of whatever the
  // real ELEVENLABS_API_KEY env var happens to be in the ambient test shell.
  const res = await handleRequest(postRequest({ elevenlabs_voice_id: 'v1' }), { apiKey: null, fetchImpl });
  assertEquals(res.status, 502);
  const json = await res.json();
  assert(typeof json.error === 'string');
  assert(!json.error.includes('sk_'), 'error message must never contain a key-shaped value');
  assertEquals(calls.length, 0, 'no ElevenLabs call without a key');
});

Deno.test('handleRequest: success => 200 with audio_base64 + content_type, never touches storage/DB', async () => {
  const calls: Array<{ url: string; init: any }> = [];
  const audioBytes = new Uint8Array([9, 9, 9]).buffer;
  const fetchImpl = fakeFetch(200, audioBytes, calls);
  const res = await handleRequest(postRequest({ elevenlabs_voice_id: 'v1' }), { apiKey: 'fake-key', fetchImpl });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.content_type, 'audio/mpeg');
  assertEquals(json.audio_base64, arrayBufferToBase64(audioBytes));
  assertEquals(calls.length, 1, 'exactly one ElevenLabs call for a single preview request');
});

Deno.test('handleRequest: ElevenLabs 401 => response mirrors 401, not a generic 502', async () => {
  const calls: Array<{ url: string; init: any }> = [];
  const fetchImpl = fakeFetch(401, 'unauthorized', calls);
  const res = await handleRequest(postRequest({ elevenlabs_voice_id: 'v1' }), { apiKey: 'bad-key', fetchImpl });
  assertEquals(res.status, 401);
  const json = await res.json();
  assert(typeof json.error === 'string');
});

Deno.test('handleRequest: ElevenLabs 429 (rate limited) => response mirrors 429', async () => {
  const calls: Array<{ url: string; init: any }> = [];
  const fetchImpl = fakeFetch(429, 'rate limited', calls);
  const res = await handleRequest(postRequest({ elevenlabs_voice_id: 'v1' }), { apiKey: 'k', fetchImpl });
  assertEquals(res.status, 429);
});

Deno.test('handleRequest: unexpected thrown error (not an ElevenLabsError) => 502', async () => {
  const throwingFetch = (() => {
    throw new Error('network down');
  }) as unknown as typeof fetch;
  const res = await handleRequest(postRequest({ elevenlabs_voice_id: 'v1' }), { apiKey: 'k', fetchImpl: throwingFetch });
  assertEquals(res.status, 502);
});

Deno.test('handleRequest: the ElevenLabs request body always carries ONLY the fixed sample text, even if the caller tries to inject a custom "text" field', async () => {
  const calls: Array<{ url: string; init: any }> = [];
  const fetchImpl = fakeFetch(200, new ArrayBuffer(0), calls);
  await handleRequest(
    postRequest({ elevenlabs_voice_id: 'v1', text: 'ignore me, arbitrary attacker text' }),
    { apiKey: 'k', fetchImpl },
  );
  const sentBody = JSON.parse(calls[0].init.body);
  assertEquals(sentBody.text, SAMPLE_TEXT);
});
