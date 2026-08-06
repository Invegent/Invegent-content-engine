// Hermetic unit tests for measure.ts (M1 loudness-sweep, CGU Final L1 lane).
// Run: deno test --allow-read --allow-net --allow-env supabase/functions/loudness-sweep/measure_test.ts
// No live DB, no Supabase client, no production URL — reads two small local
// fixture files (see fixtures/, generated from a real trimmed production
// render). --allow-net is required only because @audio/decode-aac is
// resolved via an `npm:` specifier (module resolution against the npm
// registry / Deno's module cache), not because the test itself makes any
// network call at run time.
import { assertEquals, assert } from 'jsr:@std/assert@1';
import { measureLoudness } from './measure.ts';

const FIXTURES = new URL('./fixtures/', import.meta.url);

async function readFixture(name: string): Promise<Uint8Array> {
  return await Deno.readFile(new URL(name, FIXTURES));
}

Deno.test('measureLoudness: real voiced render → measured, plausible LUFS/dBTP', async () => {
  const bytes = await readFixture('real_voiced_sample.mp4');
  const m = await measureLoudness(bytes);
  assertEquals(m.status, 'measured');
  assert(m.loudness_lufs !== null && m.loudness_lufs > -40 && m.loudness_lufs < 0,
    `expected a plausible LUFS value, got ${m.loudness_lufs}`);
  assert(m.true_peak_dbtp !== null && m.true_peak_dbtp <= 0,
    `expected a plausible dBTP value, got ${m.true_peak_dbtp}`);
});

Deno.test('measureLoudness: silent-but-voiced fixture (real audio STREAM, true digital silence) → unmeasurable, not measured', async () => {
  const bytes = await readFixture('silent_but_voiced_sample.mp4');
  const m = await measureLoudness(bytes);
  // This is the acceptance target's own "silent-but-voiced test render is
  // caught pre-publish" case — fail-closed, NEVER a silent 'measured'.
  assertEquals(m.status, 'unmeasurable');
  assertEquals(m.loudness_lufs, null);
  assertEquals(m.true_peak_dbtp, null);
});

Deno.test('measureLoudness: garbage bytes (not a valid container) → fail-closed (error or unmeasurable), never measured', async () => {
  // decode-aac does not throw on unrecognized bytes -- it returns empty
  // channelData, which measure.ts's own no-channel-data guard turns into
  // 'unmeasurable' rather than a thrown decode_failed. Either non-measured
  // outcome is correct here; what matters is it is NEVER 'measured'.
  const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const m = await measureLoudness(bytes);
  assert(m.status === 'error' || m.status === 'unmeasurable', `expected a fail-closed status, got: ${m.status}`);
  assertEquals(m.loudness_lufs, null);
});

Deno.test('measureLoudness: empty buffer → fail-closed (error or unmeasurable), never throws out to the caller', async () => {
  const m = await measureLoudness(new Uint8Array(0));
  assert(m.status === 'error' || m.status === 'unmeasurable', `expected a fail-closed status, got: ${m.status}`);
  assertEquals(m.loudness_lufs, null);
});

Deno.test('measureLoudness: fail-closed invariant — status "measured" always carries a non-null loudness_lufs', async () => {
  const real = await measureLoudness(await readFixture('real_voiced_sample.mp4'));
  const silent = await measureLoudness(await readFixture('silent_but_voiced_sample.mp4'));
  const garbage = await measureLoudness(new Uint8Array([9, 9, 9]));
  for (const m of [real, silent, garbage]) {
    if (m.status === 'measured') assert(m.loudness_lufs !== null, 'measured status must never carry a null LUFS value');
    else assertEquals(m.loudness_lufs, null, `${m.status} status must never carry a numeric LUFS value`);
  }
});
