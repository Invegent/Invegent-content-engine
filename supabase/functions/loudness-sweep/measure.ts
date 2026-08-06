// measure.ts — pure loudness-measurement module for the M1 loudness-sweep EF.
//
// UNDEPLOYED (CGU Final L1 lane, isolated worktree, PK build-acceleration
// ruling docs/briefs/cgu-final-build-acceleration-ruling-v1.md). Authored
// alongside NOT_APPLIED_m1_create_record_render_loudness_rpc.sql; nothing in
// this directory is wired to a cron trigger or deployed.
//
// Resolves design-doc open question #3 (docs/briefs/seeds/
// cgu-m1-loudness-measurement-design-v1.md §10.3): a pure-Deno/WASM EBU R128
// path is NOT merely unexplored -- it is empirically proven feasible here,
// cross-validated against the existing proven ffmpeg-based harness
// (_harness/audio_gate_v0/audio_gate.py) across 20 real production renders +
// 1 synthetic silent-but-voiced fixture (see the L1 result doc for the full
// cross-validation table; max |delta| 0.749 LUFS across 20 files, both tools
// agreeing on every PASS/FAIL classification including the fixture). This
// REPLACES the design doc's Option C "external measurement service" with an
// in-process decode+measure -- no second HTTP hop, no hosting-choice TBC.
//
// Pipeline: MP4 bytes -> @audio/decode-aac (FAAD2-WASM, self-contained M4A
// demux+decode -> PCM Float32Array channels) -> @audio/loudness-lufs
// (pure-JS ITU-R BS.1770-4 integrated loudness) + @audio/loudness-truepeak
// (pure-JS 4x-oversampled true peak). No ffmpeg subprocess, no network call
// beyond the one fetch of the render bytes the caller already needs.
//
// Fail-closed by construction, mirroring audio_gate.py's own doctrine
// (uncertain => never a silent "measured" PASS): any decode exception, zero
// channel data, or a null/non-finite LUFS value returns status
// 'unmeasurable' (audio stream exists but could not be confidently
// measured) or 'error' (measurement pipeline itself failed) -- NEVER
// 'measured' without a real numeric value. This mirrors
// record_render_loudness's own DB-side guard (p_status='measured' requires
// non-null p_loudness_lufs).
//
// Pure module: no Deno.serve, no Supabase client, no top-level env read --
// safe to import from a test or from index.ts, exactly like
// video-worker/creatomate_submit.ts's own stated reason for existing as a
// sibling module.

// @deno-types="npm:@audio/decode-aac"
import decodeAac from 'npm:@audio/decode-aac@1.3.4';
// @deno-types="npm:@audio/loudness-lufs"
import lufs from 'npm:@audio/loudness-lufs@1.0.2';
// @deno-types="npm:@audio/loudness-truepeak"
import truepeak from 'npm:@audio/loudness-truepeak@1.1.3';

export type LoudnessMeasurement = {
  status: 'measured' | 'unmeasurable' | 'error';
  loudness_lufs: number | null;
  true_peak_dbtp: number | null;
  reason: string;
};

export async function measureLoudness(mp4Bytes: Uint8Array): Promise<LoudnessMeasurement> {
  let channelData: Float32Array[];
  let sampleRate: number;
  try {
    const decoded = await decodeAac(mp4Bytes);
    channelData = decoded.channelData;
    sampleRate = decoded.sampleRate;
  } catch (e: any) {
    // Decode failure (corrupt/unsupported container, no audio track at all,
    // etc.) -- 'error', not 'unmeasurable': the pipeline itself did not run,
    // as distinct from "it ran and the result was silence".
    return { status: 'error', loudness_lufs: null, true_peak_dbtp: null,
             reason: `decode_failed: ${String(e?.message ?? e).slice(0, 200)}` };
  }

  if (!channelData?.length || !sampleRate) {
    return { status: 'unmeasurable', loudness_lufs: null, true_peak_dbtp: null,
             reason: 'no_channel_data' };
  }

  let li: number | null;
  let tp: number;
  try {
    li = lufs(channelData, { fs: sampleRate });
    tp = truepeak(channelData, { fs: sampleRate });
  } catch (e: any) {
    return { status: 'error', loudness_lufs: null, true_peak_dbtp: null,
             reason: `measurement_threw: ${String(e?.message ?? e).slice(0, 200)}` };
  }

  // lufs() returns null for silence / fully-gated input (its own fail-closed
  // contract, see @audio/loudness-lufs's own doc comment) -- this is the
  // "silent-but-voiced" catch the M1 acceptance target names.
  if (li === null || !Number.isFinite(li)) {
    return { status: 'unmeasurable', loudness_lufs: null, true_peak_dbtp: null,
             reason: 'loudness_non_finite_or_silent' };
  }

  return {
    status: 'measured',
    loudness_lufs: li,
    true_peak_dbtp: Number.isFinite(tp) ? tp : null,
    reason: `measured (${li.toFixed(1)} LUFS)`,
  };
}
