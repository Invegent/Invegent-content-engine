// schedule_authority_pin_test.ts — v2.22.0 hermetic tests.
// Fully hermetic: NO DB, NO network, NO Deno.serve (index.ts guards its listener behind
// `if (import.meta.main)`, so importing it here does NOT start the server). The supabase
// client is a hand-rolled chainable stub — no @supabase/supabase-js runtime is exercised.
// Covers:
//   (1) isVideoStatGovernanceEnabled — true only for an enabled row; false for disabled /
//       missing / query-error / thrown (fail-closed).
//   (2) shouldPinVideoStat — the pure pin predicate.
//   (3) clampField — no-op within max · word-boundary truncation · hard-slice fallback ·
//       null/undefined → ''.
// Run: deno test --allow-read --allow-env supabase/functions/ai-worker/schedule_authority_pin_test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1';
import { clampField, isVideoStatGovernanceEnabled, shouldPinVideoStat } from './index.ts';

// --- chainable supabase stub -------------------------------------------------
// Reproduces the exact call shape used by isVideoStatGovernanceEnabled:
//   supabase.schema('c').from('client_creative_governance')
//           .select('enabled').eq(...).eq(...).maybeSingle()
// `maybeSingle()` resolves to the configured { data, error }; `throwOn` lets a
// stage throw synchronously so we can prove the try/catch fail-closed path.
function stubClient(opts: {
  result?: { data: any; error: any };
  throwAt?: 'schema' | 'from' | 'select' | 'eq' | 'maybeSingle';
}): any {
  const result = opts.result ?? { data: null, error: null };
  const maybeThrow = (stage: string) => {
    if (opts.throwAt === stage) throw new Error(`stub throw at ${stage}`);
  };
  const chain: any = {
    select: (_c: string) => { maybeThrow('select'); return chain; },
    eq: (_k: string, _v: unknown) => { maybeThrow('eq'); return chain; },
    maybeSingle: async () => { maybeThrow('maybeSingle'); return result; },
  };
  return {
    schema: (_s: string) => { maybeThrow('schema'); return { from: (_t: string) => { maybeThrow('from'); return chain; } }; },
  };
}

// (1) isVideoStatGovernanceEnabled ------------------------------------------------
Deno.test('isVideoStatGovernanceEnabled: true only for an enabled row', async () => {
  const sb = stubClient({ result: { data: { enabled: true }, error: null } });
  assertEquals(await isVideoStatGovernanceEnabled(sb, 'client-uuid'), true);
});

Deno.test('isVideoStatGovernanceEnabled: false when the row is disabled', async () => {
  const sb = stubClient({ result: { data: { enabled: false }, error: null } });
  assertEquals(await isVideoStatGovernanceEnabled(sb, 'client-uuid'), false);
});

Deno.test('isVideoStatGovernanceEnabled: false when no row exists (maybeSingle null)', async () => {
  const sb = stubClient({ result: { data: null, error: null } });
  assertEquals(await isVideoStatGovernanceEnabled(sb, 'client-uuid'), false);
});

Deno.test('isVideoStatGovernanceEnabled: fail-closed on a query error', async () => {
  const sb = stubClient({ result: { data: { enabled: true }, error: { message: 'boom' } } });
  // Even with enabled:true present, an accompanying error must fail closed.
  assertEquals(await isVideoStatGovernanceEnabled(sb, 'client-uuid'), false);
});

Deno.test('isVideoStatGovernanceEnabled: fail-closed (never throws) when the client throws', async () => {
  for (const stage of ['schema', 'from', 'select', 'eq', 'maybeSingle'] as const) {
    const sb = stubClient({ throwAt: stage });
    assertEquals(await isVideoStatGovernanceEnabled(sb, 'client-uuid'), false, `throwAt=${stage}`);
  }
});

Deno.test('isVideoStatGovernanceEnabled: false when enabled is truthy-but-not-true (strict ===)', async () => {
  const sb = stubClient({ result: { data: { enabled: 'true' }, error: null } });
  assertEquals(await isVideoStatGovernanceEnabled(sb, 'client-uuid'), false);
});

// (2) shouldPinVideoStat ----------------------------------------------------------
Deno.test('shouldPinVideoStat: fires for (video_short_stat, youtube, enabled=true)', () => {
  assert(shouldPinVideoStat('video_short_stat', 'youtube', true));
});

Deno.test('shouldPinVideoStat: does NOT fire for a different input format', () => {
  assert(!shouldPinVideoStat('image_quote', 'youtube', true));
  assert(!shouldPinVideoStat('video_short_stat_voice', 'youtube', true));
  assert(!shouldPinVideoStat(null, 'youtube', true));
  assert(!shouldPinVideoStat(undefined, 'youtube', true));
});

Deno.test('shouldPinVideoStat: does NOT fire on a non-youtube platform', () => {
  assert(!shouldPinVideoStat('video_short_stat', 'instagram', true));
  assert(!shouldPinVideoStat('video_short_stat', 'facebook', true));
  assert(!shouldPinVideoStat('video_short_stat', null, true));
  assert(!shouldPinVideoStat('video_short_stat', 'YouTube', true)); // case-sensitive by design
});

Deno.test('shouldPinVideoStat: does NOT fire when governance is disabled', () => {
  assert(!shouldPinVideoStat('video_short_stat', 'youtube', false));
});

// (3) clampField ------------------------------------------------------------------
Deno.test('clampField: no-op when within max (common case, exact/under)', () => {
  assertEquals(clampField('4.35%', 12), '4.35%');
  assertEquals(clampField('exactlyten!', 11), 'exactlyten!'); // length 11 == max
  assertEquals(clampField('  padded  ', 20), 'padded');       // trims but does not truncate
});

Deno.test('clampField: word-boundary truncation when over max', () => {
  // 90-char cta trimmed to <=65 at a space, not mid-word.
  const long = 'Are you ready to discover how the local property market is shifting this quarter today';
  const out = clampField(long, 65);
  assert(out.length <= 65, `len ${out.length} must be <= 65`);
  assert(!out.endsWith(' '), 'no trailing space');
  // truncation happened at a word boundary => last token is a whole word from the source
  assert(long.startsWith(out), 'clamped output is a prefix of the source');
  assert(!out.includes('  '), 'no doubled spaces');
});

Deno.test('clampField: hard-slice fallback when the tail has no usable space', () => {
  // A single long token with no spaces in the tail: cannot break on a word boundary,
  // so it hard-slices to exactly max.
  const token = 'A' + 'x'.repeat(40); // 41 chars, no spaces
  const out = clampField(token, 12);
  assertEquals(out.length, 12);
  assertEquals(out, token.slice(0, 12));
});

Deno.test('clampField: space before the 60% floor still hard-slices (not an early cut)', () => {
  // Space at index 2 (< floor(20*0.6)=12) must be ignored -> hard slice to 20.
  const s = 'ab ' + 'y'.repeat(40);
  const out = clampField(s, 20);
  assertEquals(out.length, 20);
  assertEquals(out, s.slice(0, 20).trim());
});

Deno.test('clampField: null/undefined/non-string -> empty string', () => {
  assertEquals(clampField(null, 10), '');
  assertEquals(clampField(undefined, 10), '');
  assertEquals(clampField(123, 10), '123');   // numbers stringify
});
