// pause_gate_test.ts — v1.17.0 hermetic tests for the S9 fail-closed channel-pause gate.
//
// Fully hermetic: NO DB, NO network, NO Deno.serve (index.ts guards its listener behind
// `if (import.meta.main)`). The supabase client is a hand-rolled chainable stub.
//
// Covers the required matrix. The central case is #5: a PostgREST error is returned as
// { data: null, error } WITHOUT throwing — the exact shape the old fail-open code missed,
// because it destructured only `data` and never `error`, so its catch never fired.
//
// Run: deno test --allow-read --allow-env supabase/functions/youtube-publisher/pause_gate_test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1';
import { buildPauseGate, type PauseVerdict, pauseVerdictFor } from './index.ts';

const YT = 'youtube';
const NOW = Date.parse('2026-07-30T00:00:00.000Z');
const FUTURE = '2027-01-01T00:00:00.000Z';   // the real NDIS containment value
const PAST = '2026-01-01T00:00:00.000Z';

// Reproduces: supabase.schema('c').from('client_publish_profile')
//               .select(...).eq('platform','youtube').in('client_id', ids)
function stub(opts: { data?: unknown; error?: unknown; throwAt?: 'schema' | 'from' | 'select' | 'eq' | 'in' } = {}) {
  const boom = (stage: string) => { if (opts.throwAt === stage) throw new Error(`stub throw at ${stage}`); };
  const chain: any = {
    select: (_c: string) => { boom('select'); return chain; },
    eq: (_k: string, _v: unknown) => { boom('eq'); return chain; },
    in: async (_k: string, _v: unknown) => {
      boom('in');
      return { data: opts.data ?? null, error: opts.error ?? null };
    },
  };
  return {
    schema: (_s: string) => { boom('schema'); return { from: (_t: string) => { boom('from'); return chain; } }; },
  } as any;
}

const deny = (v: PauseVerdict) => { assertEquals(v.ok, false); return v as { ok: false; reason: string; retryable: boolean }; };

// ── 1/2. successful read, no ACTIVE pause -> may proceed ─────────────────────
Deno.test('OK: successful read with paused_until NULL proceeds', async () => {
  const g = await buildPauseGate(stub({ data: [{ client_id: 'c1', paused_until: null }] }), ['c1'], NOW);
  assertEquals(pauseVerdictFor(g, 'c1').ok, true);
});

Deno.test('OK: an EXPIRED pause is not an active pause and proceeds', async () => {
  const g = await buildPauseGate(stub({ data: [{ client_id: 'c1', paused_until: PAST }] }), ['c1'], NOW);
  assertEquals(pauseVerdictFor(g, 'c1').ok, true);
});

// ── 3. active pause -> STOP ───────────────────────────────────────────────────
Deno.test('DENY: an active pause stops the claim', async () => {
  const g = await buildPauseGate(stub({ data: [{ client_id: 'c1', paused_until: FUTURE }] }), ['c1'], NOW);
  const v = deny(pauseVerdictFor(g, 'c1'));
  assert(v.reason.startsWith('channel_paused_until:'), v.reason);
});

// ── 4. missing client / profile row -> STOP (absence is NOT permission) ───────
Deno.test('DENY: a client with no youtube profile row is stopped, not allowed', async () => {
  const g = await buildPauseGate(stub({ data: [] }), ['c1'], NOW);
  const v = deny(pauseVerdictFor(g, 'c1'));
  assertEquals(v.reason, 'pause_profile_missing');
  assertEquals(v.retryable, false); // needs configuration, not a retry
});

// ── 5. THE REGRESSION CASE: error returned WITHOUT throwing -> STOP ──────────
Deno.test('DENY: a PostgREST error (data:null, error set, NO throw) denies every client', async () => {
  const g = await buildPauseGate(
    stub({ data: null, error: { code: '42501', message: 'permission denied' } }),
    ['c1', 'c2', 'c3'], NOW,
  );
  for (const id of ['c1', 'c2', 'c3']) {
    const v = deny(pauseVerdictFor(g, id));
    assert(v.reason.startsWith('pause_preload_read_error:'), v.reason);
    assertEquals(v.retryable, true);
  }
});

// ── 6/7. throw and unrecognised payload -> STOP ──────────────────────────────
Deno.test('DENY: a throw at any stage denies every client', async () => {
  for (const stage of ['schema', 'from', 'select', 'eq', 'in'] as const) {
    const g = await buildPauseGate(stub({ throwAt: stage }), ['c1', 'c2'], NOW);
    for (const id of ['c1', 'c2']) {
      const v = deny(pauseVerdictFor(g, id));
      assert(v.reason.startsWith('pause_preload_threw:'), `${stage}: ${v.reason}`);
      assertEquals(v.retryable, true);
    }
  }
});

Deny_non_array_payload();
function Deny_non_array_payload() {
  Deno.test('DENY: a non-array payload denies every client', async () => {
    for (const bad of [null, undefined, {}, 'rows', 42]) {
      const g = await buildPauseGate(stub({ data: bad }), ['c1'], NOW);
      const v = deny(pauseVerdictFor(g, 'c1'));
      assertEquals(v.reason, 'pause_preload_unrecognised_payload', `payload=${JSON.stringify(bad)}`);
    }
  });
}

// ── 8. unparseable paused_until -> STOP ──────────────────────────────────────
Deno.test('DENY: an unparseable paused_until value is stopped, not ignored', async () => {
  const g = await buildPauseGate(stub({ data: [{ client_id: 'c1', paused_until: 'not-a-date' }] }), ['c1'], NOW);
  const v = deny(pauseVerdictFor(g, 'c1'));
  assert(v.reason.startsWith('pause_unparseable:'), v.reason);
});

// ── 9. absent verdict is itself a denial ─────────────────────────────────────
Deno.test('DENY: an absent verdict never defaults to allowed', () => {
  const v = deny(pauseVerdictFor(new Map(), 'never-seen'));
  assertEquals(v.reason, 'pause_gate_absent');
});

// ── 10. per-client resolution on a PARTIAL successful read ───────────────────
Deno.test('per-client: a partial successful read allows only the clients actually proven unpaused', async () => {
  const g = await buildPauseGate(stub({
    data: [
      { client_id: 'ok', paused_until: null },
      { client_id: 'paused', paused_until: FUTURE },
      // 'absent' deliberately not returned
    ],
  }), ['ok', 'paused', 'absent'], NOW);
  assertEquals(pauseVerdictFor(g, 'ok').ok, true);
  assertEquals(deny(pauseVerdictFor(g, 'paused')).reason.startsWith('channel_paused_until:'), true);
  assertEquals(deny(pauseVerdictFor(g, 'absent')).reason, 'pause_profile_missing');
});

// ── 11/12. hygiene ──────────────────────────────────────────────────────────
Deno.test('an empty client list produces no verdicts and no spurious denials', async () => {
  const g = await buildPauseGate(stub({ data: [] }), [], NOW);
  assertEquals(g.size, 0);
});

Deno.test('duplicate and falsy client ids are de-duplicated and dropped', async () => {
  const g = await buildPauseGate(stub({ data: [{ client_id: 'c1', paused_until: null }] }),
    ['c1', 'c1', '', undefined as unknown as string], NOW);
  assertEquals(g.size, 1);
  assertEquals(pauseVerdictFor(g, 'c1').ok, true);
});

// ── the real NDIS containment value behaves as a hold ───────────────────────
Deno.test('the live NDIS containment value 2027-01-01 reads as an ACTIVE hold', async () => {
  const g = await buildPauseGate(stub({ data: [{ client_id: 'ndis', paused_until: '2027-01-01 00:00:00+00' }] }), ['ndis'], NOW);
  const v = deny(pauseVerdictFor(g, 'ndis'));
  assert(v.reason.startsWith('channel_paused_until:'), v.reason);
});
