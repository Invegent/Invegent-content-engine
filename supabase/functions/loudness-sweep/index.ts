// index.ts — loudness-sweep Edge Function entrypoint (M1, CGU Final L1 lane).
//
// UNDEPLOYED. Authored on an isolated branch/worktree per PK build-
// acceleration ruling docs/briefs/cgu-final-build-acceleration-ruling-v1.md.
// Not wired to pg_cron (see the commented-out intended registration in
// NOT_APPLIED_m1_create_record_render_loudness_rpc.sql), not deployed, not
// activated. Deploy/apply/cron-activation is a separate future PK T3 gate.
//
// Design authority: docs/briefs/seeds/cgu-m1-loudness-measurement-design-v1.md
// §7 Phase 1 -- an ASYNC scheduled sweep, decoupled from the render hot path
// (renderUploadAndLog), per §4's wall-clock finding: the pipeline already has
// a documented, no-retry timeout failure mode at the Creatomate 2-minute poll
// ceiling, so a synchronous measurement call inside the render path is not a
// safe default. This EF runs on its OWN schedule, well after a render has
// already succeeded and been logged.
//
// Per-invocation: pull a small batch of succeeded, audio-expected renders
// whose render_spec.qa.loudness_measurement_status is still 'pending' (the
// qa.ts default -- see supabase/functions/video-worker/qa.ts), measure each
// via measure.ts (pure-Deno/WASM, no external service -- see that file's own
// header for the resolved design-doc TBC), and write the result back via
// record_render_loudness. Dark-write only: never touches publish state,
// never blocks anything, matches qa.ts's own "NEVER blocks publish" contract.
//
// Top-level Deno.serve lives ONLY here (not in measure.ts / candidates.ts),
// mirroring video-worker/index.ts's own stated reason: importing this file
// from a test would start a live listener as an import side effect, so
// hermetic tests import the pure sibling modules instead.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { measureLoudness } from './measure.ts';
import { selectCandidatesSql, DEFAULT_BATCH_SIZE } from './candidates.ts';

function getClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('loudness-sweep: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Candidate = { render_log_id: string; storage_url: string };

// Narrow structural type (mirrors video-worker/music_usage.ts's own
// MusicUsageRpcClient) — any real or stubbed Supabase client satisfies this
// without pulling in the full generated-Database generic, which this
// undeployed EF has none of yet (no `Database` type has been generated
// against a schema that includes these still-NOT_APPLIED RPCs).
type LoudnessSweepRpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data?: unknown; error?: { message?: string } | null } | null | undefined>;
};

export async function runSweep(
  supabase: LoudnessSweepRpcClient,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<{ processed: number; measured: number; unmeasurable: number; error: number; skipped_no_storage_url: number }> {
  const res = await supabase.rpc('exec_readonly_loudness_candidates', { p_limit: batchSize });
  const data = res?.data;
  const error = res?.error;
  // NOTE (undeployed placeholder): exec_readonly_loudness_candidates is NOT
  // part of this lane's migration -- a real apply packet would either add a
  // narrow SECURITY DEFINER read RPC (mirroring the ice_ro pattern) or grant
  // this EF's own restricted role SELECT on the exact columns needed
  // (render_log_id, storage_url, render_spec) from m.post_render_log. Exact
  // read-path choice is named as an open item in the L1 result doc -- NOT
  // decided here, matching design doc §8's own "to_be_confirmed at Phase-1
  // design time" note on the observability read path.
  if (error) throw new Error(`loudness-sweep: candidate query failed: ${error.message}`);

  const candidates = (data ?? []) as Candidate[];
  let measured = 0, unmeasurable = 0, errorCount = 0, skipped = 0;

  for (const c of candidates) {
    if (!c.storage_url) { skipped++; continue; }
    let bytes: Uint8Array;
    try {
      const resp = await fetch(c.storage_url);
      if (!resp.ok) throw new Error(`fetch ${resp.status}`);
      bytes = new Uint8Array(await resp.arrayBuffer());
    } catch (e: any) {
      await supabase.rpc('record_render_loudness', {
        p_render_log_id: c.render_log_id, p_status: 'error',
        p_loudness_lufs: null, p_true_peak_dbtp: null,
      });
      errorCount++;
      continue;
    }

    const m = await measureLoudness(bytes);
    await supabase.rpc('record_render_loudness', {
      p_render_log_id: c.render_log_id,
      p_status: m.status,
      p_loudness_lufs: m.loudness_lufs,
      p_true_peak_dbtp: m.true_peak_dbtp,
    });
    if (m.status === 'measured') measured++;
    else if (m.status === 'unmeasurable') unmeasurable++;
    else errorCount++;
  }

  return { processed: candidates.length, measured, unmeasurable, error: errorCount, skipped_no_storage_url: skipped };
}

Deno.serve(async (req: Request) => {
  try {
    const supabase = getClient();
    const url = new URL(req.url);
    const batchSize = Number(url.searchParams.get('batch')) || DEFAULT_BATCH_SIZE;
    const result = await runSweep(supabase, batchSize);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500 });
  }
});
