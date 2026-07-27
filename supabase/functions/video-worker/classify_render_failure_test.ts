// F-VIDEO-RENDER-RETRY (v3.12.0): focused unit test for the pure classifyRenderFailure classifier.
// Run: deno test --allow-env --allow-read --allow-net supabase/functions/video-worker/classify_render_failure_test.ts
// index.ts has a top-level Deno.serve entrypoint — it is neutralised BEFORE the dynamic import
// (mirrors render_upload_music_usage_test.ts) so importing the module does not bind a port.
import { assertEquals } from 'jsr:@std/assert@1';

// Neutralise Deno.serve BEFORE importing index.ts. Production code is byte-unchanged; only the global
// is stubbed here. The dynamic import below (NOT a hoisted static import) runs after this statement.
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (..._args: any[]) => ({ finished: Promise.resolve(), async shutdown() {}, ref() {}, unref() {}, addr: { transport: 'tcp', hostname: '0.0.0.0', port: 0 } });

const { classifyRenderFailure } = await import('./index.ts');

Deno.test('classifyRenderFailure: render timeout is transient (the core F-VIDEO-RENDER-RETRY case)', () => {
  assertEquals(classifyRenderFailure('Render timed out after 2 minutes'), 'transient');
  assertEquals(classifyRenderFailure('request timeout'), 'transient');
});

Deno.test('classifyRenderFailure: 5xx / network / download blips are transient', () => {
  assertEquals(classifyRenderFailure('Poll failed: 503'), 'transient');
  assertEquals(classifyRenderFailure('Creatomate submit 500: internal error'), 'transient');
  assertEquals(classifyRenderFailure('fetch failed'), 'transient');
  assertEquals(classifyRenderFailure('network error'), 'transient');
  assertEquals(classifyRenderFailure('temporary glitch'), 'transient');
  assertEquals(classifyRenderFailure('failed to download render'), 'transient');
});

Deno.test('classifyRenderFailure: validation / bad-input errors are terminal (fail fast)', () => {
  assertEquals(classifyRenderFailure('missing_video_script_stat_value'), 'terminal');
  assertEquals(classifyRenderFailure('missing_or_invalid_video_script_scenes'), 'terminal');
  assertEquals(classifyRenderFailure('No ElevenLabs voice ID configured for client_id=abc format=video_short_stat'), 'terminal');
  assertEquals(classifyRenderFailure('video_script.narration_text is empty'), 'terminal');
  assertEquals(classifyRenderFailure('Unsupported format: carousel'), 'terminal');
});

Deno.test('classifyRenderFailure: unknown / empty errors default to terminal (never retry forever)', () => {
  assertEquals(classifyRenderFailure('something weird happened'), 'terminal');
  assertEquals(classifyRenderFailure(''), 'terminal');
  // A 3-digit code that is NOT a 5xx must NOT be matched by \b5\d\d\b.
  assertEquals(classifyRenderFailure('error code 404 not found'), 'terminal');
});
