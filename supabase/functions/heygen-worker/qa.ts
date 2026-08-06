// qa.ts — QA-VISIBILITY-V0 shared pure render-QA builder.
//
// ADDITIVE / OBSERVABILITY-ONLY. This module is a pure function library: it
// constructs a small, normalized `render_spec.qa` object that is attached to
// each write_render_log call. It has NO side effects, NO Deno.serve, makes NO
// provider/network/DB/storage call, reads NO secrets, and NEVER blocks publish
// or alters render behaviour. It only DESCRIBES a render outcome that the worker
// already has in scope.
//
// `qa.engine` is a NORMALIZED label ('creatomate' | 'heygen') for observability;
// it is NOT the p_render_engine column (which is left byte-unchanged by the
// callers, including the 'creatomate+elevenlabs' value in video-worker).
//
// This file is intentionally byte-IDENTICAL between video-worker/qa.ts and
// heygen-worker/qa.ts (each Supabase edge function bundles its own directory).
//
// DEFERRED (NOT computed here, by design — no probing/re-fetch): audio_present,
// true file duration, true dimensions, visual legibility, text overflow, cost
// value, and any publish-blocking verdict.
//
// loudness_lufs / true_peak_dbtp / loudness_measurement_status (M1, CGU Final
// L1 lane — dark-write, undeployed at authoring time): threaded through as
// OPTIONAL inputs so this module stays a pure passthrough. The values
// themselves are ALWAYS supplied by the separate async loudness-sweep EF
// (supabase/functions/loudness-sweep/), NEVER measured here and NEVER
// measured synchronously in the render path — qa.ts's own no-probing/
// no-re-fetch contract (line above) is unchanged. renderUploadAndLog's own
// call sites do not populate these three fields; they default to
// null/'pending' until the sweep's write-back RPC merges a real measurement
// into render_spec.qa after the fact.

export type RenderQaInput = {
  expected_format?: string | null;
  engine?: 'creatomate' | 'heygen' | string | null;
  render_mode?: 'composition' | 'identity' | string | null;
  provider_job_id_present?: boolean | null;
  output_url_present?: boolean | null;
  storage_url_present?: boolean | null;
  status?: 'succeeded' | 'failed' | 'timeout' | string | null;
  failure_stage?: string | null;
  duration_ms?: number | null;
  duration_semantics?: string | null;
  file_size_bytes?: number | null;
  dimension?: string | null;
  aspect?: string | null;
  audio_expected?: boolean | null;
  voice_expected?: boolean | null;
  tts_provider?: string | null;
  captions_expected?: boolean | null;
  captions_present?: boolean | null;
  scene_count?: number | null;
  avatar_expected?: boolean | null;
  fallback_taken?: boolean | null;
  cost_present?: boolean | null;
  cost_estimated_flag?: boolean | null;
  loudness_lufs?: number | null;
  true_peak_dbtp?: number | null;
  loudness_measurement_status?: 'measured' | 'pending' | 'unmeasurable' | 'error' | null;
};

// Fail-safe wrapper: a QA-build glitch can NEVER fail the render/log path.
// On any throw it returns a minimal, valid QA object carrying the error text.
export function safeQa(build: () => Record<string, unknown>): Record<string, unknown> {
  try { return build(); }
  catch (e: any) { return { v: 1, qa_error: String(e?.message ?? e).slice(0, 300) }; }
}

export function buildRenderQa(i: RenderQaInput): Record<string, unknown> {
  return {
    v: 1,
    expected_format: i.expected_format ?? null,
    engine: i.engine ?? null,                       // 'creatomate' | 'heygen' (NORMALIZED in qa; NOT the p_render_engine column)
    render_mode: i.render_mode ?? null,             // 'composition' | 'identity'
    provider_job_id_present: !!i.provider_job_id_present,
    output_url_present: !!i.output_url_present,
    storage_url_present: !!i.storage_url_present,
    status: i.status ?? null,                        // 'succeeded' | 'failed' | 'timeout'
    failure_stage: i.failure_stage ?? null,
    duration_ms: i.duration_ms ?? null,
    duration_semantics: i.duration_semantics ?? null,
    file_size_bytes: i.file_size_bytes ?? null,
    dimension: i.dimension ?? null,
    aspect: i.aspect ?? null,
    audio_expected: i.audio_expected ?? null,
    voice_expected: i.voice_expected ?? null,
    tts_provider: i.tts_provider ?? null,
    captions_expected: i.captions_expected ?? null,
    captions_present: i.captions_present ?? null,
    scene_count: i.scene_count ?? null,
    avatar_expected: i.avatar_expected ?? null,
    fallback_taken: i.fallback_taken ?? null,
    cost_present: !!i.cost_present,
    cost_estimated_flag: !!i.cost_estimated_flag,
    loudness_lufs: i.loudness_lufs ?? null,
    true_peak_dbtp: i.true_peak_dbtp ?? null,
    loudness_measurement_status: i.loudness_measurement_status ?? (i.audio_expected ? 'pending' : null),
  };
}
