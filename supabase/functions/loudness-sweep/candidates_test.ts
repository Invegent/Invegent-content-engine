// Hermetic unit tests for candidates.ts (M1 loudness-sweep, CGU Final L1 lane).
// Run: deno test supabase/functions/loudness-sweep/candidates_test.ts
// Pure string assertions only — no DB, no network, no env.
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { selectCandidatesSql, DEFAULT_BATCH_SIZE } from './candidates.ts';

Deno.test('selectCandidatesSql: only succeeded renders', () => {
  assertStringIncludes(selectCandidatesSql(), `status = 'succeeded'`);
});
Deno.test('selectCandidatesSql: only audio-expected renders (does not touch silent-by-design formats)', () => {
  assertStringIncludes(selectCandidatesSql(), `'audio_expected') = 'true'`);
});
Deno.test('selectCandidatesSql: only still-pending renders (never re-measures an already-measured/unmeasurable/error row)', () => {
  assertStringIncludes(selectCandidatesSql(), `'loudness_measurement_status', 'pending') = 'pending'`);
});
Deno.test('selectCandidatesSql: requires a non-null storage_url (nothing to fetch otherwise)', () => {
  assertStringIncludes(selectCandidatesSql(), 'storage_url IS NOT NULL');
});
Deno.test('selectCandidatesSql: oldest-first ordering (drains a backlog in submission order)', () => {
  assertStringIncludes(selectCandidatesSql(), 'ORDER BY created_at ASC');
});
Deno.test('selectCandidatesSql: default batch size is used when no limit is passed', () => {
  assertStringIncludes(selectCandidatesSql(), `LIMIT ${DEFAULT_BATCH_SIZE}`);
});
Deno.test('selectCandidatesSql: custom limit is honored and coerced to a number (no injection surface)', () => {
  assertStringIncludes(selectCandidatesSql(25), 'LIMIT 25');
  // @ts-expect-error deliberately passing a non-numeric string to prove Number() coercion, not string interpolation
  assertEquals(selectCandidatesSql('5; DROP TABLE x;--').includes('DROP TABLE'), false);
});
