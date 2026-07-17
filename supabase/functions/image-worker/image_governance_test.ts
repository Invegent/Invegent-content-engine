// image_governance_test.ts — Spine Gen v2 / D6-1 + D6-2 hermetic tests (image-worker).
// Fully hermetic: NO real DB / network / Deno.serve. A tiny chainable mock stands in for the
// service-role supabase client and returns a preset per-table result. Proves:
//  (a) isImageGovernanceEnabled → governed (true) ONLY for an enabled row; legacy (false) for
//      a disabled row, an absent row, a read error, and a thrown read (FAIL-CLOSED);
//  (b) getGovernedClientSlug → returns the resolved slug, and THROWS governed_slug_unresolved
//      on a null / empty slug or a read error (never the UUID fallback).
// Run: deno test supabase/functions/image-worker/image_governance_test.ts

import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { isImageGovernanceEnabled, getGovernedClientSlug } from './image_governance.ts';

type TableResult = { data: any; error: any };

// Minimal chainable supabase mock. schema().from(table) selects which preset result the
// terminal maybeSingle() resolves to; select/eq/limit are no-op chain links. `throwTable`
// makes maybeSingle() THROW for that table (exercises the try/catch fail-closed path).
function mockSupabase(byTable: Record<string, TableResult>, throwTable?: string) {
  let currentTable = '';
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    limit: () => builder,
    maybeSingle: async () => {
      if (throwTable && throwTable === currentTable) throw new Error('connection reset');
      return byTable[currentTable] ?? { data: null, error: null };
    },
  };
  return {
    schema: (_s: string) => ({
      from: (t: string) => { currentTable = t; return builder; },
    }),
  };
}

const PP_CLIENT_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';

// ── (a) governance gate ─────────────────────────────────────────────────────────

// (a1) enabled=true row → governed branch fires (true).
Deno.test('D6-1 a1: enabled=true row → isImageGovernanceEnabled === true (governed)', async () => {
  const sb = mockSupabase({ client_creative_governance: { data: { enabled: true }, error: null } });
  assertEquals(await isImageGovernanceEnabled(sb, PP_CLIENT_ID, 'image_quote'), true);
});

// (a2) enabled=false row → legacy path (false).
Deno.test('D6-1 a2: enabled=false row → false (legacy path)', async () => {
  const sb = mockSupabase({ client_creative_governance: { data: { enabled: false }, error: null } });
  assertEquals(await isImageGovernanceEnabled(sb, PP_CLIENT_ID, 'image_quote'), false);
});

// (a3) absent row (data=null) → fail-closed false.
Deno.test('D6-1 a3: absent governance row → false (fail-closed)', async () => {
  const sb = mockSupabase({ client_creative_governance: { data: null, error: null } });
  assertEquals(await isImageGovernanceEnabled(sb, 'unknown-client', 'image_quote'), false);
});

// (a4) read error → fail-closed false.
Deno.test('D6-1 a4: governance read error → false (fail-closed)', async () => {
  const sb = mockSupabase({ client_creative_governance: { data: null, error: { message: 'PGRST boom' } } });
  assertEquals(await isImageGovernanceEnabled(sb, PP_CLIENT_ID, 'image_quote'), false);
});

// (a5) thrown read (network) → caught, fail-closed false.
Deno.test('D6-1 a5: governance read throws → false (fail-closed via try/catch)', async () => {
  const sb = mockSupabase({}, 'client_creative_governance');
  assertEquals(await isImageGovernanceEnabled(sb, PP_CLIENT_ID, 'image_quote'), false);
});

// (a6) enabled is a non-strict-true truthy (e.g. 'true' string / 1) → still false (strict === true).
Deno.test('D6-1 a6: non-strict-true enabled value → false (strict === true only)', async () => {
  const sb = mockSupabase({ client_creative_governance: { data: { enabled: 'true' }, error: null } });
  assertEquals(await isImageGovernanceEnabled(sb, PP_CLIENT_ID, 'image_quote'), false);
});

// ── (b) governed slug resolution ────────────────────────────────────────────────

// (b1) present slug → returned verbatim (correct slug passed through).
Deno.test('D6-2 b1: present client_slug → returned', async () => {
  const sb = mockSupabase({ client: { data: { client_slug: 'property-pulse' }, error: null } });
  assertEquals(await getGovernedClientSlug(sb, PP_CLIENT_ID), 'property-pulse');
});

// (b1b) a DIFFERENT brand's slug resolves too (path is not PP-bound).
Deno.test('D6-2 b1b: a non-PP client_slug resolves (not PP-bound)', async () => {
  const sb = mockSupabase({ client: { data: { client_slug: 'ndis-yarns' }, error: null } });
  assertEquals(await getGovernedClientSlug(sb, 'some-other-client-id'), 'ndis-yarns');
});

// (b2) null slug → throws governed_slug_unresolved (NEVER the UUID fallback).
Deno.test('D6-2 b2: null client_slug → throws governed_slug_unresolved', async () => {
  const sb = mockSupabase({ client: { data: { client_slug: null }, error: null } });
  await assertRejects(() => getGovernedClientSlug(sb, PP_CLIENT_ID), Error, 'governed_slug_unresolved');
});

// (b3) absent row / empty-whitespace slug → throws governed_slug_unresolved.
Deno.test('D6-2 b3: absent row and whitespace slug → throws governed_slug_unresolved', async () => {
  const sbAbsent = mockSupabase({ client: { data: null, error: null } });
  await assertRejects(() => getGovernedClientSlug(sbAbsent, PP_CLIENT_ID), Error, 'governed_slug_unresolved');
  const sbBlank = mockSupabase({ client: { data: { client_slug: '   ' }, error: null } });
  await assertRejects(() => getGovernedClientSlug(sbBlank, PP_CLIENT_ID), Error, 'governed_slug_unresolved');
});

// (b4) read error → throws governed_slug_unresolved (surfaces the DB message).
Deno.test('D6-2 b4: slug read error → throws governed_slug_unresolved with message', async () => {
  const sb = mockSupabase({ client: { data: null, error: { message: 'PGRST106' } } });
  const err = await assertRejects(() => getGovernedClientSlug(sb, PP_CLIENT_ID), Error, 'governed_slug_unresolved');
  assert(String(err).includes('PGRST106'));
});
