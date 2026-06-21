// qa_test.ts — QA-VISIBILITY-V0 hermetic tests for the pure render-QA builder.
//
// Fully hermetic: NO DB, NO network, NO Deno.serve. Exercises ./qa.ts directly.
// Run: deno test supabase/functions/video-worker/qa_test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1';
import { buildRenderQa, safeQa } from './qa.ts';

// The complete key set buildRenderQa MUST always emit on a normal build.
const FULL_KEYS = [
  'v', 'expected_format', 'engine', 'render_mode', 'provider_job_id_present',
  'output_url_present', 'storage_url_present', 'status', 'failure_stage',
  'duration_ms', 'duration_semantics', 'file_size_bytes', 'dimension', 'aspect',
  'audio_expected', 'voice_expected', 'tts_provider', 'captions_expected',
  'captions_present', 'scene_count', 'avatar_expected', 'fallback_taken',
  'cost_present', 'cost_estimated_flag',
];

function assertShape(qa: Record<string, unknown>) {
  assertEquals(qa.v, 1, 'v must be 1');
  for (const k of FULL_KEYS) assert(k in qa, `missing key: ${k}`);
  assertEquals(Object.keys(qa).length, FULL_KEYS.length, 'no extra/missing keys');
}

// (1) Creatomate kinetic (non-voice) shape.
Deno.test('creatomate kinetic (non-voice) success shape', () => {
  const qa = buildRenderQa({
    expected_format: 'video_short_kinetic', engine: 'creatomate', render_mode: 'composition',
    duration_semantics: 'render_wallclock', dimension: '1080x1920', aspect: '9:16',
    status: 'succeeded', failure_stage: null, provider_job_id_present: true,
    output_url_present: true, storage_url_present: true, duration_ms: 42000,
    file_size_bytes: 1234567, audio_expected: false, voice_expected: false, tts_provider: null,
    captions_expected: false, captions_present: false, scene_count: 5,
    avatar_expected: false, fallback_taken: false, cost_present: true, cost_estimated_flag: false,
  });
  assertShape(qa);
  assertEquals(qa.engine, 'creatomate');
  assertEquals(qa.render_mode, 'composition');
  assertEquals(qa.voice_expected, false);
  assertEquals(qa.tts_provider, null);
  assertEquals(qa.captions_expected, false);
  assertEquals(qa.file_size_bytes, 1234567);
  assertEquals(qa.cost_present, true);
});

// (2) Creatomate kinetic_voice with voice + captions + elevenlabs.
Deno.test('creatomate kinetic_voice: voice_expected + tts_provider + captions_expected', () => {
  const qa = buildRenderQa({
    expected_format: 'video_short_kinetic_voice', engine: 'creatomate', render_mode: 'composition',
    duration_semantics: 'render_wallclock', dimension: '1080x1920', aspect: '9:16',
    status: 'succeeded', provider_job_id_present: true, output_url_present: true,
    storage_url_present: true, duration_ms: 51000, file_size_bytes: 2222222,
    audio_expected: true, voice_expected: true, tts_provider: 'elevenlabs',
    captions_expected: true, captions_present: true, scene_count: 6,
    avatar_expected: false, fallback_taken: false, cost_present: true, cost_estimated_flag: false,
  });
  assertShape(qa);
  assertEquals(qa.voice_expected, true);
  assertEquals(qa.audio_expected, true);
  assertEquals(qa.tts_provider, 'elevenlabs');
  assertEquals(qa.captions_expected, true);
  assertEquals(qa.captions_present, true);
});

// (3) Creatomate stat (non-voice, scene_count null).
Deno.test('creatomate stat (non-voice): scene_count null', () => {
  const qa = buildRenderQa({
    expected_format: 'video_short_stat', engine: 'creatomate', render_mode: 'composition',
    duration_semantics: 'render_wallclock', dimension: '1080x1920', aspect: '9:16',
    status: 'succeeded', provider_job_id_present: true, output_url_present: true,
    storage_url_present: true, duration_ms: 30000, file_size_bytes: 999,
    audio_expected: false, voice_expected: false, tts_provider: null,
    captions_expected: false, captions_present: false, scene_count: null,
    avatar_expected: false, fallback_taken: false, cost_present: false, cost_estimated_flag: false,
  });
  assertShape(qa);
  assertEquals(qa.scene_count, null);
  assertEquals(qa.expected_format, 'video_short_stat');
});

// (4) HeyGen avatar success.
Deno.test('heygen avatar success: avatar_expected + identity render_mode + poll_detection', () => {
  const qa = buildRenderQa({
    expected_format: 'video_short_avatar', engine: 'heygen', render_mode: 'identity',
    provider_job_id_present: true, output_url_present: true, storage_url_present: true,
    status: 'succeeded', failure_stage: null, duration_ms: 90000,
    duration_semantics: 'submit_to_poll_detection', file_size_bytes: null,
    dimension: '720x1280', aspect: '9:16', audio_expected: true, voice_expected: true,
    tts_provider: 'heygen', captions_expected: false, captions_present: false, scene_count: 1,
    avatar_expected: true, fallback_taken: false, cost_present: false, cost_estimated_flag: false,
  });
  assertShape(qa);
  assertEquals(qa.engine, 'heygen');
  assertEquals(qa.render_mode, 'identity');
  assertEquals(qa.duration_semantics, 'submit_to_poll_detection');
  assertEquals(qa.avatar_expected, true);
  assertEquals(qa.tts_provider, 'heygen');
  assertEquals(qa.file_size_bytes, null);
  assertEquals(qa.dimension, '720x1280');
});

// (5) HeyGen fallback path (fallback_taken=true).
Deno.test('heygen fallback path: fallback_taken=true', () => {
  const selectedBy = 'fallback_limit1';
  const qa = buildRenderQa({
    expected_format: 'video_short_avatar', engine: 'heygen', render_mode: 'identity',
    status: 'succeeded', avatar_expected: true,
    fallback_taken: (selectedBy === 'fallback_limit1'),
    duration_semantics: 'submit_to_poll_detection', scene_count: 1,
  });
  assertShape(qa);
  assertEquals(qa.fallback_taken, true);
});

// (6) Failure-stage coverage: stage + status pairs are carried verbatim.
Deno.test('failure-stage coverage: tts / download_store / render / timeout', () => {
  const cases: Array<{ stage: string; status: string }> = [
    { stage: 'tts', status: 'failed' },
    { stage: 'download_store', status: 'failed' },
    { stage: 'render', status: 'failed' },
    { stage: 'timeout', status: 'timeout' },
  ];
  for (const c of cases) {
    const qa = buildRenderQa({ status: c.status, failure_stage: c.stage, engine: 'creatomate' });
    assertShape(qa);
    assertEquals(qa.status, c.status);
    assertEquals(qa.failure_stage, c.stage);
  }
});

// (7) Voice vs non-voice QA shape difference.
Deno.test('voice vs non-voice differ on voice_expected/tts_provider', () => {
  const nonVoice = buildRenderQa({ engine: 'creatomate', voice_expected: false, audio_expected: false, tts_provider: null });
  const voice = buildRenderQa({ engine: 'creatomate', voice_expected: true, audio_expected: true, tts_provider: 'elevenlabs' });
  assertEquals(nonVoice.voice_expected, false);
  assertEquals(nonVoice.tts_provider, null);
  assertEquals(voice.voice_expected, true);
  assertEquals(voice.tts_provider, 'elevenlabs');
  assert(nonVoice.voice_expected !== voice.voice_expected);
});

// (8) Fail-safe: safeQa swallows a throw into a minimal valid QA object.
Deno.test('safeQa: a throwing build returns { v:1, qa_error }', () => {
  const out = safeQa(() => { throw new Error('boom'); });
  assertEquals(out, { v: 1, qa_error: 'boom' });
});

Deno.test('safeQa: a normal build passes through unchanged', () => {
  const out = safeQa(() => buildRenderQa({ engine: 'creatomate', status: 'succeeded' }));
  assertEquals(out.v, 1);
  assertEquals(out.engine, 'creatomate');
  assert(!('qa_error' in out), 'no qa_error on a clean build');
});
