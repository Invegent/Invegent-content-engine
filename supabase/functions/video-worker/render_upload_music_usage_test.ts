// Hermetic sequencing test for renderUploadAndLog's v3.7.0 (cc-0034) music-usage recording.
// Run: deno test --allow-env --allow-read --allow-net supabase/functions/video-worker/render_upload_music_usage_test.ts
// No real network/DB: fetch, setTimeout, console.error/warn and the supabase client are all
// stubbed, and index.ts's top-level Deno.serve entrypoint is neutralised BEFORE import.
//
// PK 2026-07-10: a music-usage write failure NEVER fails the render. So the invariants under test:
//   - the function RESOLVES with the storage url (never throws) even when record_music_usage fails;
//   - write_render_log runs EXACTLY ONCE with p_status='succeeded' (no spurious 'failed' second row);
//   - a real usage failure emits the greppable code b1_video_music_usage_write_failed —
//     console.error for a production draft, console.warn for the supervised smoke;
//   - a bound bed + a healthy RPC records exactly one usage row with the right params (p_platform null);
//   - no bed / no musicUsage → zero record_music_usage calls (legacy callers stay byte-identical).
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';

// Neutralise Deno.serve BEFORE importing index.ts (its top-level Deno.serve must not bind a port).
// Production code is byte-unchanged; only the global is stubbed here.
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (..._args: any[]) => ({ finished: Promise.resolve(), async shutdown() {}, ref() {}, unref() {}, addr: { transport: 'tcp', hostname: '0.0.0.0', port: 0 } });

const CREATOMATE_API = 'https://api.creatomate.com/v2/renders';
const RENDER_ID = 'cm-render-xyz';
const SUPABASE_URL = 'https://proj.supabase.co';

type UsageBehaviour = 'ok' | 'error' | 'reject';

// deno-lint-ignore no-explicit-any
function makeSupabaseStub(usage: UsageBehaviour): { client: any; rpcCalls: Array<{ fn: string; args: Record<string, any> }> } {
  const rpcCalls: Array<{ fn: string; args: Record<string, any> }> = [];
  // deno-lint-ignore no-explicit-any
  const client: any = {
    storage: { from: (_bucket: string) => ({ upload: (_p: string, _buf: unknown, _o: unknown) => Promise.resolve({ error: null }) }) },
    rpc: (fn: string, args: Record<string, any>) => {
      rpcCalls.push({ fn, args });
      if (fn === 'record_music_usage') {
        if (usage === 'ok') return Promise.resolve({ error: null });
        if (usage === 'error') return Promise.resolve({ error: { message: 'relation "m.music_usage_event" does not exist' } });
        return Promise.reject(new Error('usage transport error'));
      }
      return Promise.resolve({ error: null }); // write_render_log succeeds
    },
  };
  return { client, rpcCalls };
}

function installIoStubs() {
  const orig = { fetch: globalThis.fetch, setTimeout: globalThis.setTimeout, error: console.error, warn: console.warn };
  const errors: string[] = [];
  const warns: string[] = [];
  // Fire timers immediately so pollRender does not wait POLL_INTERVAL_MS.
  // deno-lint-ignore no-explicit-any
  (globalThis as any).setTimeout = (fn: (...a: any[]) => void) => { fn(); return 0; };
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = (input: any) => {
    const url = typeof input === 'string' ? input : String(input?.url ?? input);
    if (url === CREATOMATE_API) {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(''), json: () => Promise.resolve({ id: RENDER_ID }) });
    }
    if (url === `${CREATOMATE_API}/${RENDER_ID}`) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: 'succeeded', url: 'https://cdn.test/out.mp4', credits: 5 }) });
    }
    if (url === 'https://cdn.test/out.mp4') {
      return Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)) });
    }
    return Promise.reject(new Error(`unexpected fetch ${url}`));
  };
  // deno-lint-ignore no-explicit-any
  console.error = (...a: any[]) => { errors.push(a.map(String).join(' ')); };
  // deno-lint-ignore no-explicit-any
  console.warn = (...a: any[]) => { warns.push(a.map(String).join(' ')); };
  const restore = () => {
    globalThis.fetch = orig.fetch;
    globalThis.setTimeout = orig.setTimeout;
    console.error = orig.error;
    console.warn = orig.warn;
  };
  return { errors, warns, restore };
}

// deno-lint-ignore no-explicit-any
function baseOpts(supabase: any, o: { postDraftId: string | null; musicUsage?: { trackId: string; format: string } | null; logMustSucceed?: boolean }) {
  return {
    supabase,
    creatomateKey: 'test-key',
    renderScript: { template_id: 't', modifications: {}, output_format: 'mp4' },
    storagePath: 'pp/draft_stat_governed.mp4',
    postDraftId: o.postDraftId,
    clientId: 'client-9',
    iceFormatKey: 'video_short_stat',
    qaCtx: { withVoice: true, expectedFormat: 'video_short_stat', captionsExpected: false, captionsPresent: false, sceneCount: null },
    musicUsage: o.musicUsage,
    logMustSucceed: o.logMustSucceed,
  };
}

const EXPECTED_URL = `${SUPABASE_URL}/storage/v1/object/public/post-videos/pp/draft_stat_governed.mp4`;

Deno.test('renderUploadAndLog: production draft + usage RPC error → RESOLVES (no throw), one succeeded write_render_log, console.error alarm', async () => {
  Deno.env.set('SUPABASE_URL', SUPABASE_URL);
  const { client, rpcCalls } = makeSupabaseStub('error');
  const io = installIoStubs();
  let result: string | undefined;
  try {
    const { renderUploadAndLog } = await import('./index.ts');
    result = await renderUploadAndLog(baseOpts(client, {
      postDraftId: 'draft-prod',
      musicUsage: { trackId: 'trk-1', format: 'video_short_stat' },
    }));
  } finally {
    io.restore();
  }
  assertEquals(result, EXPECTED_URL); // resolved with the storage url — render kept
  const writeLogCalls = rpcCalls.filter((c) => c.fn === 'write_render_log');
  const usageCalls = rpcCalls.filter((c) => c.fn === 'record_music_usage');
  assertEquals(writeLogCalls.length, 1);                     // EXACTLY ONE write_render_log
  assertEquals(writeLogCalls[0].args.p_status, 'succeeded'); // ...succeeded, never a 'failed' second row
  assertEquals(usageCalls.length, 1);
  assertEquals(io.errors.length, 1);                         // production → console.error alarm
  assertStringIncludes(io.errors[0], 'b1_video_music_usage_write_failed');
  assertStringIncludes(io.errors[0], 'trk-1');
  assertStringIncludes(io.errors[0], RENDER_ID);
  assertEquals(io.warns.length, 0);                          // not a warn
});

Deno.test('renderUploadAndLog: smoke (postDraftId null) + usage RPC rejects → RESOLVES, console.warn alarm (no throw)', async () => {
  Deno.env.set('SUPABASE_URL', SUPABASE_URL);
  const { client, rpcCalls } = makeSupabaseStub('reject');
  const io = installIoStubs();
  let result: string | undefined;
  try {
    const { renderUploadAndLog } = await import('./index.ts');
    result = await renderUploadAndLog(baseOpts(client, {
      postDraftId: null, // supervised smoke
      musicUsage: { trackId: 'trk-1', format: 'video_short_stat' },
      logMustSucceed: true,
    }));
  } finally {
    io.restore();
  }
  assertEquals(result, EXPECTED_URL);
  const writeLogCalls = rpcCalls.filter((c) => c.fn === 'write_render_log');
  assertEquals(writeLogCalls.length, 1);
  assertEquals(writeLogCalls[0].args.p_status, 'succeeded');
  assertEquals(io.warns.length, 1);                          // smoke → console.warn
  assertStringIncludes(io.warns[0], 'b1_video_music_usage_write_failed');
  assertEquals(io.errors.length, 0);
});

Deno.test('renderUploadAndLog: bed bound + healthy RPC → one record_music_usage with right params (p_platform null), no alarm', async () => {
  Deno.env.set('SUPABASE_URL', SUPABASE_URL);
  const { client, rpcCalls } = makeSupabaseStub('ok');
  const io = installIoStubs();
  try {
    const { renderUploadAndLog } = await import('./index.ts');
    await renderUploadAndLog(baseOpts(client, {
      postDraftId: 'draft-prod',
      musicUsage: { trackId: 'trk-1', format: 'video_short_stat' },
    }));
  } finally {
    io.restore();
  }
  const usageCalls = rpcCalls.filter((c) => c.fn === 'record_music_usage');
  assertEquals(usageCalls.length, 1);
  assertEquals(usageCalls[0].args, {
    p_track_id: 'trk-1',
    p_render_id: RENDER_ID,
    p_client_id: 'client-9',
    p_draft_id: 'draft-prod',
    p_platform: null,
    p_format: 'video_short_stat',
  });
  assertEquals(io.errors.length, 0);
  assertEquals(io.warns.length, 0);
});

Deno.test('renderUploadAndLog: NO musicUsage (legacy caller) → zero record_music_usage calls, no alarm, byte-identical resolve', async () => {
  Deno.env.set('SUPABASE_URL', SUPABASE_URL);
  const { client, rpcCalls } = makeSupabaseStub('error'); // would fail IF called — proving it is not
  const io = installIoStubs();
  let result: string | undefined;
  try {
    const { renderUploadAndLog } = await import('./index.ts');
    result = await renderUploadAndLog(baseOpts(client, { postDraftId: 'draft-prod' })); // no musicUsage
  } finally {
    io.restore();
  }
  assertEquals(result, EXPECTED_URL);
  assertEquals(rpcCalls.filter((c) => c.fn === 'record_music_usage').length, 0);
  assertEquals(io.errors.length, 0);
  assertEquals(io.warns.length, 0);
});
