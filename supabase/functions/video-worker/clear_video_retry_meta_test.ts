// F-VIDEO-RENDER-CLAIM (v3.13.0): focused unit test for the pure clearVideoRetryMeta helper.
// Run: deno test --allow-env --allow-read --allow-net supabase/functions/video-worker/clear_video_retry_meta_test.ts
// index.ts has a top-level Deno.serve entrypoint — it is neutralised BEFORE the dynamic import
// (mirrors classify_render_failure_test.ts / render_upload_music_usage_test.ts) so importing the
// module does not bind a port. clearVideoRetryMeta is exported inert (like classifyRenderFailure);
// no production caller imports it.
import { assertEquals } from 'jsr:@std/assert@1';

// Neutralise Deno.serve BEFORE importing index.ts. Production code is byte-unchanged; only the global
// is stubbed here. The dynamic import below (NOT a hoisted static import) runs after this statement.
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (..._args: any[]) => ({ finished: Promise.resolve(), async shutdown() {}, ref() {}, unref() {}, addr: { transport: 'tcp', hostname: '0.0.0.0', port: 0 } });

const { clearVideoRetryMeta } = await import('./index.ts');

Deno.test('clearVideoRetryMeta: strips all five retry/claim keys (incl. v3.13.0 render_claim_at)', () => {
  const df = {
    video_render_attempts: 2,
    video_retry_after: '2026-07-27T12:00:00.000Z',
    video_last_error: 'Render timed out after 2 minutes',
    video_dead_reason: 'max_render_attempts:3/3',
    render_claim_at: '2026-07-27T11:45:00.000Z',
  };
  const out = clearVideoRetryMeta(df);
  assertEquals(out.video_render_attempts, undefined);
  assertEquals(out.video_retry_after, undefined);
  assertEquals(out.video_last_error, undefined);
  assertEquals(out.video_dead_reason, undefined);
  assertEquals(out.render_claim_at, undefined);
  assertEquals(Object.keys(out).length, 0);
});

Deno.test('clearVideoRetryMeta: preserves unrelated draft_format keys', () => {
  const df = {
    render_claim_at: '2026-07-27T11:45:00.000Z',
    video_render_attempts: 1,
    video_script: { scenes: [{ id: 's1' }] },
    format_chosen: 'video_short_stat',
    some_flag: true,
  };
  const out = clearVideoRetryMeta(df);
  assertEquals(out.render_claim_at, undefined);
  assertEquals(out.video_render_attempts, undefined);
  assertEquals(out.video_script, df.video_script);
  assertEquals(out.format_chosen, 'video_short_stat');
  assertEquals(out.some_flag, true);
});

Deno.test('clearVideoRetryMeta: is pure — input object is not mutated', () => {
  const df = { render_claim_at: 'x', keep: 1 };
  const out = clearVideoRetryMeta(df);
  assertEquals(df.render_claim_at, 'x'); // original untouched
  assertEquals(out.render_claim_at, undefined);
  assertEquals(out.keep, 1);
});

Deno.test('clearVideoRetryMeta: null / undefined draft_format yields an empty object', () => {
  assertEquals(clearVideoRetryMeta(null), {});
  assertEquals(clearVideoRetryMeta(undefined), {});
});
