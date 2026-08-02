// Hermetic unit tests for creatomate_submit.ts — the extracted Creatomate submit+poll HTTP logic.
// v3.16.2 (Fix 1): proves a poll-stage throw still surfaces the render id to the caller via
// `.creatomateRenderId` on the rethrown error (the db-rls-auditor regression finding on the v3.16.1
// extraction — see this module's own header for the full account).
// Run: deno test --allow-env supabase/functions/video-worker/creatomate_submit_test.ts
import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { submitAndPollCreatomateRender, pollRender, CREATOMATE_API } from './creatomate_submit.ts';

const RENDER_ID = 'render-abc-123';
const OUT_URL = 'https://cdn.test/out.mp4';

// deno-lint-ignore no-explicit-any
function installStubs(opts: {
  submitOk?: boolean;
  submitStatus?: number;
  submitBodyHasId?: boolean;
  pollResponses: Array<{ status: number; body: any }>;
}) {
  const orig = { fetch: globalThis.fetch, setTimeout: globalThis.setTimeout };
  let pollCallIndex = 0;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).setTimeout = (fn: (...a: any[]) => void) => { fn(); return 0; };
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = (input: any) => {
    const url = typeof input === 'string' ? input : String(input?.url ?? input);
    if (url === CREATOMATE_API) {
      const ok = opts.submitOk ?? true;
      const status = opts.submitStatus ?? 200;
      return Promise.resolve({
        ok, status,
        text: () => Promise.resolve(ok ? '' : 'submit failed body'),
        json: () => Promise.resolve(opts.submitBodyHasId === false ? {} : { id: RENDER_ID }),
      });
    }
    if (url === `${CREATOMATE_API}/${RENDER_ID}`) {
      const r = opts.pollResponses[Math.min(pollCallIndex, opts.pollResponses.length - 1)];
      pollCallIndex++;
      return Promise.resolve({ ok: r.status < 400, status: r.status, json: () => Promise.resolve(r.body) });
    }
    return Promise.reject(new Error(`unexpected fetch ${url}`));
  };
  return { restore: () => { globalThis.fetch = orig.fetch; globalThis.setTimeout = orig.setTimeout; } };
}

Deno.test('submitAndPollCreatomateRender: success path returns renderId/url/creditsUsed/durationMs', async () => {
  const io = installStubs({ pollResponses: [{ status: 200, body: { status: 'succeeded', url: OUT_URL, credits: 3 } }] });
  try {
    const result = await submitAndPollCreatomateRender({ output_format: 'mp4' }, 'key', Date.now());
    assertEquals(result.renderId, RENDER_ID);
    assertEquals(result.url, OUT_URL);
    assertEquals(result.creditsUsed, 3);
    assert(typeof result.durationMs === 'number');
  } finally { io.restore(); }
});

Deno.test('submitAndPollCreatomateRender: submit HTTP failure → throws, NO creatomateRenderId (no id was ever minted)', async () => {
  const io = installStubs({ submitOk: false, submitStatus: 500, pollResponses: [] });
  try {
    const err = await assertRejects(
      () => submitAndPollCreatomateRender({ output_format: 'mp4' }, 'key'),
      Error,
      'Creatomate submit 500',
    );
    assertEquals((err as any).creatomateRenderId, undefined);
  } finally { io.restore(); }
});

Deno.test('submitAndPollCreatomateRender: submit response missing id → throws, NO creatomateRenderId', async () => {
  const io = installStubs({ submitBodyHasId: false, pollResponses: [] });
  try {
    const err = await assertRejects(
      () => submitAndPollCreatomateRender({ output_format: 'mp4' }, 'key'),
      Error,
      'No render ID in Creatomate response',
    );
    assertEquals((err as any).creatomateRenderId, undefined);
  } finally { io.restore(); }
});

// ── Fix 1 — the regression this test file exists to prove is fixed ────────────────────────────────

Deno.test('submitAndPollCreatomateRender: poll returns status=failed → thrown error carries .creatomateRenderId', async () => {
  const io = installStubs({ pollResponses: [{ status: 200, body: { status: 'failed', error_message: 'provider render error' } }] });
  try {
    const err = await assertRejects(
      () => submitAndPollCreatomateRender({ output_format: 'mp4' }, 'key'),
      Error,
      'Creatomate failed: provider render error',
    );
    assertEquals((err as any).creatomateRenderId, RENDER_ID, 'the real render id must survive a poll-stage failure');
  } finally { io.restore(); }
});

Deno.test('submitAndPollCreatomateRender: poll HTTP error → thrown error carries .creatomateRenderId', async () => {
  const io = installStubs({ pollResponses: [{ status: 503, body: {} }] });
  try {
    const err = await assertRejects(
      () => submitAndPollCreatomateRender({ output_format: 'mp4' }, 'key'),
      Error,
      'Poll failed: 503',
    );
    assertEquals((err as any).creatomateRenderId, RENDER_ID);
  } finally { io.restore(); }
});

Deno.test('submitAndPollCreatomateRender: poll timeout (never succeeds within POLL_MAX_ATTEMPTS) → thrown error carries .creatomateRenderId', async () => {
  // every poll attempt returns 'rendering' (never succeeded/failed) → pollRender exhausts its budget
  // and throws 'Render timed out after 2 minutes' — the exact real-world failure class Fix 1 targets.
  const io = installStubs({ pollResponses: [{ status: 200, body: { status: 'rendering' } }] });
  const origLog = console.log;
  console.log = () => {};  // mute pollRender's per-attempt progress log (48 lines) — cosmetic only
  try {
    const err = await assertRejects(
      () => submitAndPollCreatomateRender({ output_format: 'mp4' }, 'key'),
      Error,
      'Render timed out after 2 minutes',
    );
    assertEquals((err as any).creatomateRenderId, RENDER_ID, 'a render-timeout is exactly the failure class Fix 1 targets — the id must survive it');
  } finally { io.restore(); console.log = origLog; }
});

Deno.test('submitAndPollCreatomateRender: error message/stack are UNCHANGED by the .creatomateRenderId attachment (same object, not wrapped)', async () => {
  const io = installStubs({ pollResponses: [{ status: 200, body: { status: 'failed', error_message: 'boom' } }] });
  try {
    let caught: any = null;
    try {
      await submitAndPollCreatomateRender({ output_format: 'mp4' }, 'key');
    } catch (e) { caught = e; }
    assert(caught instanceof Error);
    assertEquals(caught.message, 'Creatomate failed: boom');
    assert(typeof caught.stack === 'string' && caught.stack.length > 0);
  } finally { io.restore(); }
});

// ── pollRender itself — unchanged behaviour, exercised directly ───────────────────────────────────

Deno.test('pollRender: succeeded status resolves with url/creditsUsed/durationMs', async () => {
  const io = installStubs({ pollResponses: [{ status: 200, body: { status: 'succeeded', url: OUT_URL, credits: null } }] });
  try {
    const result = await pollRender(RENDER_ID, 'key', Date.now());
    assertEquals(result.url, OUT_URL);
    assertEquals(result.creditsUsed, null);
  } finally { io.restore(); }
});

Deno.test('pollRender: failed status throws with the provider error_message', async () => {
  const io = installStubs({ pollResponses: [{ status: 200, body: { status: 'failed', error_message: 'specific reason' } }] });
  try {
    await assertRejects(() => pollRender(RENDER_ID, 'key', Date.now()), Error, 'Creatomate failed: specific reason');
  } finally { io.restore(); }
});
