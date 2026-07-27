// F-VIDEO-AUDIO-FAILCLOSED (v3.14.0, Phase A — PK option A / audio-EXPECTED): tests for the pure audio
// helpers (mp4HasAudioTrack, assertAudioSpec, specHasAudio), the SCOPED post-render enforcement wired in
// renderUploadAndLog (audio-expected fails closed on a lost track; by-design-silent is exempt), and a
// classification confirmation that both audio errors are TERMINAL (never retried by the v3.12.0 classifier).
// Run: deno test --allow-env --allow-read --allow-net supabase/functions/video-worker/audio_failclosed_test.ts
// index.ts has a top-level Deno.serve entrypoint — it is neutralised BEFORE the dynamic import
// (mirrors render_upload_music_usage_test.ts) so importing the module does not bind a port.
import { assertEquals, assertThrows, assertRejects, assertStringIncludes } from 'jsr:@std/assert@1';

// Neutralise Deno.serve BEFORE importing index.ts. Production code is byte-unchanged; only the global
// is stubbed here. The dynamic import below (NOT a hoisted static import) runs after this statement.
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (..._args: any[]) => ({ finished: Promise.resolve(), async shutdown() {}, ref() {}, unref() {}, addr: { transport: 'tcp', hostname: '0.0.0.0', port: 0 } });

const { mp4HasAudioTrack, assertAudioSpec, specHasAudio, classifyRenderFailure, renderUploadAndLog } = await import('./index.ts');

const SOUN = [0x73, 0x6f, 0x75, 0x6e];

// ── (1) mp4HasAudioTrack: the PRIMARY post-render audio-stream check ───────────────────────────────
Deno.test('mp4HasAudioTrack: bytes containing the soun handler → true', () => {
  const withAudio = new Uint8Array([0x68, 0x64, 0x6c, 0x72, ...SOUN, 0x00]);
  assertEquals(mp4HasAudioTrack(withAudio), true);
});

Deno.test('mp4HasAudioTrack: video-only bytes (vide handler, no soun) → false (fail-closed)', () => {
  const videoOnly = new Uint8Array([0x76, 0x69, 0x64, 0x65, 0x00, 0x6d, 0x64, 0x69, 0x72]);
  assertEquals(mp4HasAudioTrack(videoOnly), false);
});

Deno.test('mp4HasAudioTrack: soun at the very start / very end is found', () => {
  assertEquals(mp4HasAudioTrack(new Uint8Array(SOUN)), true);
  assertEquals(mp4HasAudioTrack(new Uint8Array([0x00, 0x00, ...SOUN])), true);
});

Deno.test('mp4HasAudioTrack: empty / too-short / partial soun → false', () => {
  assertEquals(mp4HasAudioTrack(new Uint8Array([])), false);
  assertEquals(mp4HasAudioTrack(new Uint8Array([0x73, 0x6f, 0x75])), false);  // 'sou' only
  assertEquals(mp4HasAudioTrack(new Uint8Array([0x00, 0x00, 0x00])), false);
});

// ── (2) specHasAudio: the audio-EXPECTED gate (PK option A) ────────────────────────────────────────
Deno.test('specHasAudio: composition spec WITH an audio element → true', () => {
  assertEquals(specHasAudio({ elements: [{ type: 'text', text: 'hi' }, { type: 'audio', source: 'https://cdn/v.mp3', volume: '100%' }] }), true);
});

Deno.test('specHasAudio: by-design-silent kinetic (composition, no audio element) → false (exempt)', () => {
  assertEquals(specHasAudio({ elements: [{ type: 'text', text: 'hi' }, { type: 'image', source: 'https://cdn/bg.jpg' }] }), false);
});

Deno.test('specHasAudio: template-mode with a non-empty VoiceAudio.source → true; silent bed only → false', () => {
  assertEquals(specHasAudio({ template_id: 't', modifications: { 'VoiceAudio.source': 'https://cdn/vo.mp3', 'MusicBed.source': '' } }), true);
  assertEquals(specHasAudio({ template_id: 't', modifications: { 'MusicBed.source': '' } }), false);      // silent bed = no audio
  assertEquals(specHasAudio({ template_id: 't', modifications: {} }), false);                             // governed-smoke shape
  assertEquals(specHasAudio({ template_id: 't', modifications: { 'MusicBed.source': 'https://cdn/bed.mp3' } }), true);
});

// ── (3) assertAudioSpec: the pre-render spec defence-in-depth ──────────────────────────────────────
Deno.test('assertAudioSpec: well-formed percent-string volumes → no throw', () => {
  assertAudioSpec({ elements: [{ type: 'audio', source: 'https://cdn/v.mp3', volume: '100%' }, { type: 'audio', source: 'https://cdn/m.mp3', volume: '15%' }] });
});

Deno.test('assertAudioSpec: -58 LUFS fraction misconfig (volume as a number) → AUDIO_SPEC_ASSERT_FAILED (terminal)', () => {
  const err = assertThrows(() => assertAudioSpec({ elements: [{ type: 'audio', source: 'https://cdn/v.mp3', volume: 0.15 }] }), Error);
  assertStringIncludes(err.message, 'AUDIO_SPEC_ASSERT_FAILED');
  assertEquals(classifyRenderFailure(err.message), 'terminal');
});

Deno.test('assertAudioSpec: empty audio source → AUDIO_SPEC_ASSERT_FAILED (terminal)', () => {
  const err = assertThrows(() => assertAudioSpec({ elements: [{ type: 'audio', source: '', volume: '100%' }] }), Error);
  assertStringIncludes(err.message, 'AUDIO_SPEC_ASSERT_FAILED');
  assertEquals(classifyRenderFailure(err.message), 'terminal');
});

Deno.test('assertAudioSpec: template-mode present-but-empty VoiceAudio.source → throws; silent MusicBed → no throw', () => {
  assertThrows(() => assertAudioSpec({ template_id: 't', modifications: { 'VoiceAudio.source': '' } }), Error, 'AUDIO_SPEC_ASSERT_FAILED');
  assertAudioSpec({ template_id: 't', modifications: { 'VoiceAudio.source': 'https://cdn/vo.mp3', 'MusicBed.source': '' } }); // silent bed is fine
});

Deno.test('assertAudioSpec: no-audio shapes → no throw (no-op)', () => {
  assertAudioSpec({ template_id: 't', modifications: {}, output_format: 'mp4' });
  assertAudioSpec({ elements: [{ type: 'text', text: 'hi' }] });
  assertAudioSpec({ something: 'else' });
});

// ── (4) classification confirmation: both thrown audio errors are TERMINAL (never retried) ─────────
Deno.test('classifyRenderFailure: AUDIO_STREAM_MISSING and AUDIO_SPEC_ASSERT_FAILED are terminal', () => {
  assertEquals(classifyRenderFailure('AUDIO_STREAM_MISSING: rendered mp4 has no soun audio track (fail-closed, not published)'), 'terminal');
  assertEquals(classifyRenderFailure('AUDIO_SPEC_ASSERT_FAILED: audio element[0] volume must be a percent string like "100%" (bad type=number)'), 'terminal');
  assertEquals(classifyRenderFailure('AUDIO_SPEC_ASSERT_FAILED: audio VoiceAudio.source source is empty (silent render refused)'), 'terminal');
});

// ── (5) INTEGRATION through renderUploadAndLog: the SCOPED post-render enforcement (PK option A) ────
const CREATOMATE_API = 'https://api.creatomate.com/v2/renders';
const RENDER_ID = 'cm-render-abc';
const OUT_URL = 'https://cdn.test/out.mp4';
const SUPABASE_URL = 'https://proj.supabase.co';

// deno-lint-ignore no-explicit-any
function makeSupabaseStub(): any {
  return {
    storage: { from: (_b: string) => ({ upload: (_p: string, _buf: unknown, _o: unknown) => Promise.resolve({ error: null }) }) },
    rpc: (_fn: string, _args: Record<string, unknown>) => Promise.resolve({ error: null }),
  };
}

// mp4Bytes: the buffer the render-download fetch returns (with or without a soun track).
function installIoStubs(mp4Bytes: Uint8Array) {
  const orig = { fetch: globalThis.fetch, setTimeout: globalThis.setTimeout, log: console.log };
  const logs: string[] = [];
  // deno-lint-ignore no-explicit-any
  (globalThis as any).setTimeout = (fn: (...a: any[]) => void) => { fn(); return 0; };
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = (input: any) => {
    const url = typeof input === 'string' ? input : String(input?.url ?? input);
    if (url === CREATOMATE_API) return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(''), json: () => Promise.resolve({ id: RENDER_ID }) });
    if (url === `${CREATOMATE_API}/${RENDER_ID}`) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: 'succeeded', url: OUT_URL, credits: 5 }) });
    if (url === OUT_URL) return Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(mp4Bytes.buffer) });
    return Promise.reject(new Error(`unexpected fetch ${url}`));
  };
  // deno-lint-ignore no-explicit-any
  console.log = (...a: any[]) => { logs.push(a.map(String).join(' ')); };
  return { logs, restore: () => { globalThis.fetch = orig.fetch; globalThis.setTimeout = orig.setTimeout; console.log = orig.log; } };
}

// deno-lint-ignore no-explicit-any
function baseOpts(supabase: any, renderScript: object) {
  return {
    supabase, creatomateKey: 'k', renderScript, storagePath: 'pp/d_stat.mp4',
    postDraftId: 'draft-1', clientId: 'client-9', iceFormatKey: 'video_short_stat',
    qaCtx: { withVoice: true, expectedFormat: 'video_short_stat', captionsExpected: false, captionsPresent: false, sceneCount: null },
  };
}

Deno.test('renderUploadAndLog (a): spec WITH audio + output has NO soun → THROWS AUDIO_STREAM_MISSING (fail-closed)', async () => {
  Deno.env.set('SUPABASE_URL', SUPABASE_URL);
  const io = installIoStubs(new Uint8Array(16)); // 16 zero bytes — no soun
  try {
    await assertRejects(
      () => renderUploadAndLog(baseOpts(makeSupabaseStub(), { output_format: 'mp4', elements: [{ type: 'audio', source: 'https://cdn/voice.mp3', volume: '100%' }] })),
      Error,
      'AUDIO_STREAM_MISSING',
    );
  } finally { io.restore(); }
});

Deno.test('renderUploadAndLog (b): spec with NO audio + output has no soun → RESOLVES (enforcement SKIPPED, exempt)', async () => {
  Deno.env.set('SUPABASE_URL', SUPABASE_URL);
  const io = installIoStubs(new Uint8Array(16)); // silent output, but no audio expected
  let result: string | undefined;
  try {
    // by-design-silent kinetic: composition spec with no audio element.
    result = await renderUploadAndLog(baseOpts(makeSupabaseStub(), { output_format: 'mp4', elements: [{ type: 'text', text: 'hi' }] }));
  } finally { io.restore(); }
  assertEquals(result, `${SUPABASE_URL}/storage/v1/object/public/post-videos/pp/d_stat.mp4`);
  assertEquals(io.logs.some((l) => l.includes('audio_check_skipped:no_audio_in_spec')), true); // visible skip
});

Deno.test('renderUploadAndLog (c): spec WITH audio + output HAS soun → RESOLVES (audio present, passes)', async () => {
  Deno.env.set('SUPABASE_URL', SUPABASE_URL);
  const io = installIoStubs(new Uint8Array([0, 0, 0, 0, ...SOUN, 0, 0, 0, 0])); // has soun
  let result: string | undefined;
  try {
    result = await renderUploadAndLog(baseOpts(makeSupabaseStub(), { output_format: 'mp4', elements: [{ type: 'audio', source: 'https://cdn/voice.mp3', volume: '100%' }] }));
  } finally { io.restore(); }
  assertEquals(result, `${SUPABASE_URL}/storage/v1/object/public/post-videos/pp/d_stat.mp4`);
});
