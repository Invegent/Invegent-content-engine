// heygen-worker v2.1.1 — hermetic tests for F-HEYGEN-AVATAR-IDENTITY-TELEMETRY.
//
// Fully hermetic: NO real Supabase client, NO real HeyGen API call, NO DB, NO network at
// runtime (globalThis.fetch is stubbed to intercept HeyGen generate/status/download URLs and
// return canned responses). The real exported phase functions are exercised against an in-memory
// Supabase stub that records every .update() payload and every .rpc() call.
//
// Proves:
//   1. submit writes draft_format.avatar_identity
//   2. captured talking_photo_id / voice_id are the EXACT values submitted to HeyGen
//   3. avatar_selected_by is set correctly (role_filter | fallback_limit1 | preset)
//   4. the poll / render-log path COPIES the captured avatar_identity into render_spec
//   5. the poll path does NOT call lookupAvatar (no brand_avatar reselection query)
//   6. role-selection behaviour is unchanged (lookupAvatar builds the same role-filtered SQL)
//
// Run: deno test --allow-env supabase/functions/heygen-worker/index.test.ts

import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1';
import { lookupAvatar, runPollPhase, runSubmitPhase } from './index.ts';

// --- in-memory Supabase stub ------------------------------------------------

interface SupaOpts {
  pending?: any[];
  rendering?: any[];
  avatarRow?: { heygen_avatar_id: string; heygen_voice_id: string | null } | null;
  brandRow?: { brand_colour_primary: string; client_slug: string } | null;
  existingRenderLogs?: any[];
}

// A recorded query-builder chain invocation (used to assert lookupAvatar's chain shape).
interface QbRecord {
  schema: string | null;
  table: string;
  select: string | null;
  eqCalls: Array<[string, unknown]>;
  limit: number | undefined;
  orderCalled: boolean;
}

function makeSupa(opts: SupaOpts) {
  const updates: Array<{ table: string; payload: any; id: any }> = [];
  const rpcCalls: Array<{ name: string; params: any }> = [];
  // v2.4.0 (CC-0048): lookupAvatar now uses the query-builder (schema('c').from('brand_avatar')…),
  // NOT exec_sql. Record every brand_avatar chain invocation so tests can assert its exact shape.
  const avatarLookups: QbRecord[] = [];

  function builder(table: string, schemaName: string | null) {
    const filters: Record<string, unknown> = {};
    const eqCalls: Array<[string, unknown]> = [];
    let selectArg: string | null = null;
    let limitArg: number | undefined = undefined;
    let orderCalled = false;
    let updatePayload: any = null;
    const b: any = {
      select(arg?: string) { selectArg = arg ?? null; return b; },
      eq(col: string, val: unknown) { filters[col] = val; eqCalls.push([col, val]); return b; },
      in() { return b; },
      not() { return b; },
      order() { orderCalled = true; return b; },
      limit(n?: number) { limitArg = n; return b; },
      update(payload: any) { updatePayload = payload; return b; },
      then(resolve: (v: any) => void) {
        if (updatePayload !== null) {
          updates.push({ table, payload: updatePayload, id: filters['post_draft_id'] });
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (table === 'brand_avatar') {
          avatarLookups.push({ schema: schemaName, table, select: selectArg, eqCalls: [...eqCalls], limit: limitArg, orderCalled });
          return Promise.resolve({ data: opts.avatarRow ? [opts.avatarRow] : [], error: null }).then(resolve);
        }
        if (table === 'post_render_log') {
          return Promise.resolve({ data: opts.existingRenderLogs ?? [], error: null }).then(resolve);
        }
        if (table === 'post_draft') {
          if (filters['video_status'] === 'pending') return Promise.resolve({ data: opts.pending ?? [], error: null }).then(resolve);
          if (filters['video_status'] === 'rendering') return Promise.resolve({ data: opts.rendering ?? [], error: null }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return b;
  }

  return {
    schema(name: string) { return { from: (t: string) => builder(t, name) }; },
    from: (t: string) => builder(t, null),
    rpc(name: string, params: any) {
      rpcCalls.push({ name, params });
      if (name === 'exec_sql') {
        const q: string = params?.query ?? '';
        // brand_avatar is NO LONGER an exec_sql path (v2.4.0); only the brand-colour lookup
        // (client_brand_profile) remains on exec_sql — left byte-unchanged by this lane.
        if (q.includes('client_brand_profile')) return Promise.resolve({ data: opts.brandRow ? [opts.brandRow] : [], error: null });
        return Promise.resolve({ data: [], error: null });
      }
      if (name === 'write_render_log') return Promise.resolve({ error: null });
      return Promise.resolve({ data: null, error: null });
    },
    storage: { from() { return { upload() { return Promise.resolve({ error: null }); } }; } },
    __updates: updates,
    __rpcCalls: rpcCalls,
    __avatarLookups: avatarLookups,
  };
}

// --- fetch stub (intercepts HeyGen + download; NO real network) -------------

function installFetch(): Array<{ url: string; method: string; body: any }> {
  const calls: Array<{ url: string; method: string; body: any }> = [];
  globalThis.fetch = ((input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body });
    if (url.startsWith('https://api.heygen.com/v2/video/generate')) {
      return Promise.resolve(new Response(JSON.stringify({ data: { video_id: 'vid_test_123' } }), { status: 200 }));
    }
    if (url.startsWith('https://api.heygen.com/v1/video_status.get')) {
      return Promise.resolve(new Response(JSON.stringify({ data: { status: 'completed', video_url: 'https://heygen.example/out.mp4' } }), { status: 200 }));
    }
    if (url.startsWith('https://heygen.example/')) {
      return Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 }));
    }
    return Promise.resolve(new Response('{}', { status: 200 }));
  }) as typeof fetch;
  return calls;
}

const realFetch = globalThis.fetch;
function restoreFetch() { globalThis.fetch = realFetch; }

// v2.4.0 (CC-0048): a brand_avatar lookup is now a query-builder chain, not an exec_sql call.
// This returns the recorded brand_avatar chain invocations (empty => no lookup ran).
function avatarLookups(supa: ReturnType<typeof makeSupa>): QbRecord[] {
  return supa.__avatarLookups;
}

// --- tests ------------------------------------------------------------------

Deno.test('submit (role_filter): captures avatar_identity = the EXACT values submitted to HeyGen', async () => {
  const supa = makeSupa({
    pending: [{
      post_draft_id: 'd1', client_id: 'client-uuid-1', recommended_format: 'video_short_avatar',
      draft_format: { video_script: { stakeholder_role: 'founder', render_style: 'realistic', narration_text: 'Hello there' } },
    }],
    avatarRow: { heygen_avatar_id: 'AV_ROLE', heygen_voice_id: 'VOICE_ROLE' },
    brandRow: { brand_colour_primary: '#123456', client_slug: 'acme' },
  });
  const fetchCalls = installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');

    // what was actually sent to HeyGen
    const gen = fetchCalls.find((c) => c.url.includes('/v2/video/generate'));
    assertExists(gen, 'HeyGen generate call must have been made');
    const sent = JSON.parse(gen!.body).video_inputs[0];
    const sentTalkingPhoto = sent.character.talking_photo_id;
    const sentVoice = sent.voice.voice_id;

    // what was captured into draft_format at submit
    const upd = supa.__updates.find((u) => u.payload?.video_status === 'rendering');
    assertExists(upd, 'markRendering update must have been written');
    const ai = upd!.payload.draft_format.avatar_identity;
    assertExists(ai, 'avatar_identity must be present in draft_format');

    assertEquals(ai.talking_photo_id, 'AV_ROLE');
    assertEquals(ai.voice_id, 'VOICE_ROLE');
    assertEquals(ai.talking_photo_id, sentTalkingPhoto);   // captured == submitted
    assertEquals(ai.voice_id, sentVoice);                  // captured == submitted
    assertEquals(ai.render_style, 'realistic');
    assertEquals(ai.stakeholder_role, 'founder');
    assertEquals(ai.avatar_selected_by, 'role_filter');
  } finally { restoreFetch(); }
});

Deno.test('submit (preset): avatar_selected_by=preset and NO lookupAvatar query', async () => {
  const supa = makeSupa({
    pending: [{
      post_draft_id: 'd2', client_id: 'c2', recommended_format: 'video_short_avatar',
      draft_format: { talking_photo_id: 'AV_PRESET', voice_id: 'VOICE_PRESET', render_style: 'realistic', narration_text: 'Yo' },
    }],
    brandRow: { brand_colour_primary: '#000000', client_slug: 'beta' },
  });
  const fetchCalls = installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const sent = JSON.parse(fetchCalls.find((c) => c.url.includes('/v2/video/generate'))!.body).video_inputs[0];
    const ai = supa.__updates.find((u) => u.payload?.video_status === 'rendering')!.payload.draft_format.avatar_identity;

    assertEquals(ai.avatar_selected_by, 'preset');
    assertEquals(ai.talking_photo_id, 'AV_PRESET');
    assertEquals(ai.voice_id, 'VOICE_PRESET');
    assertEquals(ai.talking_photo_id, sent.character.talking_photo_id);
    assertEquals(avatarLookups(supa).length, 0, 'preset must not run a brand_avatar lookup');
  } finally { restoreFetch(); }
});

Deno.test('submit (fallback_limit1): no role => avatar_selected_by=fallback_limit1', async () => {
  const supa = makeSupa({
    pending: [{
      post_draft_id: 'd3', client_id: 'c3', recommended_format: 'video_short_avatar',
      draft_format: { render_style: 'realistic', narration_text: 'Hi' },   // no role, no preset id
    }],
    avatarRow: { heygen_avatar_id: 'AV_FB', heygen_voice_id: 'VOICE_FB' },
    brandRow: { brand_colour_primary: '#0A2A4A', client_slug: 'gamma' },
  });
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const ai = supa.__updates.find((u) => u.payload?.video_status === 'rendering')!.payload.draft_format.avatar_identity;
    assertEquals(ai.avatar_selected_by, 'fallback_limit1');
    assertEquals(ai.talking_photo_id, 'AV_FB');
    assertEquals(ai.stakeholder_role, null);
  } finally { restoreFetch(); }
});

Deno.test('poll: COPIES captured avatar_identity into render_spec and does NOT reselect', async () => {
  const captured = {
    talking_photo_id: 'AV_ROLE', voice_id: 'VOICE_ROLE',
    render_style: 'realistic', stakeholder_role: 'founder', avatar_selected_by: 'role_filter',
  };
  const supa = makeSupa({
    rendering: [{
      post_draft_id: 'd1', client_id: 'c1', recommended_format: 'video_short_avatar',
      draft_format: {
        heygen_video_id: 'vid_test_123', heygen_submitted_at: '2026-06-10T00:00:00.000Z',
        render_style: 'realistic', storage_path: 'acme/d1.mp4', client_slug: 'acme',
        avatar_identity: captured,
      },
    }],
    existingRenderLogs: [],
  });
  installFetch();
  try {
    await runPollPhase(supa as any, 'fake-key');

    const wr = supa.__rpcCalls.find((c) => c.name === 'write_render_log');
    assertExists(wr, 'write_render_log must have been called for the terminal outcome');
    assertEquals(wr!.params.p_render_engine, 'heygen');
    assertEquals(wr!.params.p_status, 'succeeded');
    // the captured identity is copied verbatim into render_spec
    assertEquals(wr!.params.p_render_spec.avatar_identity, captured);
    // poll never re-derived / reselected the avatar
    assertEquals(avatarLookups(supa).length, 0, 'poll must not run any brand_avatar lookup');
  } finally { restoreFetch(); }
});

// --- AGP-D01-3 shadow-resolver telemetry (additive, flag-gated, fail-open) ----

function shadowCalls(supa: ReturnType<typeof makeSupa>) {
  return supa.__rpcCalls.filter((c) => c.name === 'resolve_and_record_avatar_shadow');
}

Deno.test('shadow OFF: AVATAR_SHADOW_TELEMETRY unset => no shadow rpc call (no-op)', async () => {
  const prev = Deno.env.get('AVATAR_SHADOW_TELEMETRY');
  Deno.env.delete('AVATAR_SHADOW_TELEMETRY');
  const supa = makeSupa({
    pending: [{
      post_draft_id: 'd1', client_id: 'client-uuid-1', recommended_format: 'video_short_avatar',
      draft_format: { video_script: { stakeholder_role: 'founder', render_style: 'realistic', narration_text: 'Hello there' } },
    }],
    avatarRow: { heygen_avatar_id: 'AV_ROLE', heygen_voice_id: 'VOICE_ROLE' },
    brandRow: { brand_colour_primary: '#123456', client_slug: 'acme' },
  });
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    // submit still completed (live path unaffected)
    assertExists(supa.__updates.find((u) => u.payload?.video_status === 'rendering'), 'submit must still complete with flag off');
    // strict no-op: zero shadow rpc calls
    assertEquals(shadowCalls(supa).length, 0, 'flag off must not call the shadow rpc');
  } finally {
    restoreFetch();
    if (prev === undefined) Deno.env.delete('AVATAR_SHADOW_TELEMETRY'); else Deno.env.set('AVATAR_SHADOW_TELEMETRY', prev);
  }
});

Deno.test('shadow ON: exactly one shadow rpc call with the ACTUAL live pick (role_filter)', async () => {
  const prev = Deno.env.get('AVATAR_SHADOW_TELEMETRY');
  Deno.env.set('AVATAR_SHADOW_TELEMETRY', 'true');
  const supa = makeSupa({
    pending: [{
      post_draft_id: 'd1', client_id: 'client-uuid-1', recommended_format: 'video_short_avatar',
      draft_format: { video_script: { stakeholder_role: 'founder', render_style: 'realistic', narration_text: 'Hello there' } },
    }],
    avatarRow: { heygen_avatar_id: 'AV_ROLE', heygen_voice_id: 'VOICE_ROLE' },
    brandRow: { brand_colour_primary: '#123456', client_slug: 'acme' },
  });
  const fetchCalls = installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');

    const calls = shadowCalls(supa);
    assertEquals(calls.length, 1, 'flag on must call the shadow rpc exactly once');
    const p = calls[0].params;

    // args carry the ACTUAL live pick == what was submitted to HeyGen
    const sent = JSON.parse(fetchCalls.find((c) => c.url.includes('/v2/video/generate'))!.body).video_inputs[0];
    assertEquals(p.p_post_draft_id, 'd1');
    assertEquals(p.p_client_id, 'client-uuid-1');
    assertEquals(p.p_stakeholder_role, 'founder');
    assertEquals(p.p_render_style, 'realistic');
    assertEquals(p.p_live_avatar_id, 'AV_ROLE');
    assertEquals(p.p_live_voice_id, 'VOICE_ROLE');
    assertEquals(p.p_live_avatar_id, sent.character.talking_photo_id);   // shadow live id == submitted id
    assertEquals(p.p_live_voice_id, sent.voice.voice_id);
    assertEquals(p.p_live_selected_by, 'role_filter');

    // shadow must NOT have changed the live pick captured into draft_format
    const ai = supa.__updates.find((u) => u.payload?.video_status === 'rendering')!.payload.draft_format.avatar_identity;
    assertEquals(ai.talking_photo_id, 'AV_ROLE');
    assertEquals(ai.avatar_selected_by, 'role_filter');
  } finally {
    restoreFetch();
    if (prev === undefined) Deno.env.delete('AVATAR_SHADOW_TELEMETRY'); else Deno.env.set('AVATAR_SHADOW_TELEMETRY', prev);
  }
});

Deno.test('shadow ON (preset): live_selected_by=preset and live id = the preset id', async () => {
  const prev = Deno.env.get('AVATAR_SHADOW_TELEMETRY');
  Deno.env.set('AVATAR_SHADOW_TELEMETRY', '1');
  const supa = makeSupa({
    pending: [{
      post_draft_id: 'd2', client_id: 'c2', recommended_format: 'video_short_avatar',
      draft_format: { talking_photo_id: 'AV_PRESET', voice_id: 'VOICE_PRESET', render_style: 'realistic', narration_text: 'Yo' },
    }],
    brandRow: { brand_colour_primary: '#000000', client_slug: 'beta' },
  });
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const calls = shadowCalls(supa);
    assertEquals(calls.length, 1, 'preset submit with flag on still records shadow exactly once');
    const p = calls[0].params;
    assertEquals(p.p_live_selected_by, 'preset');
    assertEquals(p.p_live_avatar_id, 'AV_PRESET');
    assertEquals(p.p_live_voice_id, 'VOICE_PRESET');
    assertEquals(p.p_stakeholder_role, null);
    // preset path must STILL not run a brand_avatar lookup (live path byte-identical)
    assertEquals(avatarLookups(supa).length, 0, 'preset must not run a brand_avatar lookup even with shadow on');
  } finally {
    restoreFetch();
    if (prev === undefined) Deno.env.delete('AVATAR_SHADOW_TELEMETRY'); else Deno.env.set('AVATAR_SHADOW_TELEMETRY', prev);
  }
});

Deno.test('shadow ON: fail-open — when the shadow rpc throws, submit still completes and does NOT throw', async () => {
  const prev = Deno.env.get('AVATAR_SHADOW_TELEMETRY');
  Deno.env.set('AVATAR_SHADOW_TELEMETRY', 'true');
  const supa = makeSupa({
    pending: [{
      post_draft_id: 'd1', client_id: 'c1', recommended_format: 'video_short_avatar',
      draft_format: { render_style: 'realistic', narration_text: 'Hi' },
    }],
    avatarRow: { heygen_avatar_id: 'AV_FB', heygen_voice_id: 'VOICE_FB' },
    brandRow: { brand_colour_primary: '#0A2A4A', client_slug: 'gamma' },
  });
  // Make ONLY the shadow rpc throw; everything else behaves normally.
  const baseRpc = supa.rpc.bind(supa);
  (supa as any).rpc = (name: string, params: any) => {
    if (name === 'resolve_and_record_avatar_shadow') {
      supa.__rpcCalls.push({ name, params });
      throw new Error('simulated shadow rpc failure');
    }
    return baseRpc(name, params);
  };
  installFetch();
  try {
    // must NOT throw
    const results = await runSubmitPhase(supa as any, 'fake-key');
    // submit reached the rendering state (render proceeded past the shadow hook)
    const upd = supa.__updates.find((u) => u.payload?.video_status === 'rendering');
    assertExists(upd, 'submit must complete to rendering despite shadow rpc failure');
    // a HeyGen submit actually happened (the live lifecycle was not interrupted)
    const r = results.find((x: any) => x.post_draft_id === 'd1' && x.phase === 'submit');
    assertEquals(r?.status, 'rendering', 'submit phase result must be rendering (fail-open)');
    // the shadow rpc was attempted exactly once
    assertEquals(shadowCalls(supa).length, 1, 'shadow rpc attempted once even though it threw');
  } finally {
    restoreFetch();
    if (prev === undefined) Deno.env.delete('AVATAR_SHADOW_TELEMETRY'); else Deno.env.set('AVATAR_SHADOW_TELEMETRY', prev);
  }
});

// --- CC-0048 (v2.4.0): lookupAvatar query-builder parity ---------------------
// The exec_sql string-interpolation was replaced by a supabase-js query-builder call at STRICT
// behavioural parity. These tests record the chain (schema/table/select-embed/eq/limit/order) and
// prove selection behaviour is unchanged. NOTE: the PostgREST inner-join embed RESOLUTION and live
// selection parity are NOT provable here (the client is mocked) — that is a required POST-DEPLOY
// live-parity verification, named in the deploy plan.

// Focused recording spy for lookupAvatar's chain (independent of makeSupa).
function makeQbSpy(result: { data: any; error?: any }) {
  const rec: QbRecord = { schema: null, table: null as any, select: null, eqCalls: [], limit: undefined, orderCalled: false };
  const qb: any = {
    select(arg: string) { rec.select = arg; return qb; },
    eq(col: string, val: unknown) { rec.eqCalls.push([col, val]); return qb; },
    order() { rec.orderCalled = true; return qb; },
    limit(n: number) { rec.limit = n; return qb; },
    then(resolve: (v: any) => void) { return Promise.resolve({ error: null, ...result }).then(resolve); },
  };
  const supa: any = { schema(name: string) { rec.schema = name; return { from(t: string) { rec.table = t; return qb; } }; } };
  return { supa, rec };
}

function eqVal(rec: QbRecord, col: string): unknown {
  const hit = rec.eqCalls.find(([c]) => c === col);
  return hit ? hit[1] : undefined;
}
function hasEq(rec: QbRecord, col: string): boolean {
  return rec.eqCalls.some(([c]) => c === col);
}

// live-oracle fixtures
const PP_ROW = { heygen_avatar_id: '5d03454fbd0c469692f1a27ccbe6a000', heygen_voice_id: 'D2UxCOjgDceKldjA4JrK' };
const NY_ROW = { heygen_avatar_id: '7e98bd3860f14ee18c9b4909e46ac77c', heygen_voice_id: 'P2AIevlJPypjV8xL6zXE' };

Deno.test('lookupAvatar (role): correct chain shape + PP row mapping', async () => {
  const { supa, rec } = makeQbSpy({ data: [PP_ROW] });
  const out = await lookupAvatar(supa, 'pp-client', 'founder', 'realistic');

  // mapping
  assertEquals(out, { talking_photo_id: PP_ROW.heygen_avatar_id, voice_id: PP_ROW.heygen_voice_id });

  // schema c, table brand_avatar
  assertEquals(rec.schema, 'c');
  assertEquals(rec.table, 'brand_avatar');

  // inner-join embed on brand_stakeholder + both selected columns
  assert(rec.select!.includes('brand_stakeholder!brand_avatar_stakeholder_id_fkey!inner(role_code)'), 'inner-join embed on brand_stakeholder must be present');
  assert(rec.select!.includes('heygen_avatar_id'), 'select must include heygen_avatar_id');
  assert(rec.select!.includes('heygen_voice_id'), 'select must include heygen_voice_id');

  // exact filters (no more, no less on the non-role fences)
  assertEquals(eqVal(rec, 'client_id'), 'pp-client');
  assertEquals(eqVal(rec, 'is_active'), true);
  assertEquals(eqVal(rec, 'render_style'), 'realistic');

  // role filter applied when a role is passed
  assert(hasEq(rec, 'brand_stakeholder.role_code'), 'role provided => role_code filter must be applied');
  assertEquals(eqVal(rec, 'brand_stakeholder.role_code'), 'founder');

  // LIMIT 1, no ORDER BY
  assertEquals(rec.limit, 1);
  assertEquals(rec.orderCalled, false, 'must NOT add ordering (parity: LIMIT 1 with no ORDER BY)');
});

Deno.test('lookupAvatar (no role): role_code filter is NOT applied; inner join still present', async () => {
  const { supa, rec } = makeQbSpy({ data: [NY_ROW] });
  const out = await lookupAvatar(supa, 'ny-client', null, 'realistic');

  assertEquals(out, { talking_photo_id: NY_ROW.heygen_avatar_id, voice_id: NY_ROW.heygen_voice_id });
  assertEquals(rec.schema, 'c');
  assertEquals(rec.table, 'brand_avatar');
  // inner join preserved EVEN with null role (avatar with no matching stakeholder stays ineligible)
  assert(rec.select!.includes('brand_stakeholder!brand_avatar_stakeholder_id_fkey!inner(role_code)'), 'inner-join embed must be present even with null role');
  // role filter must NOT be present
  assert(!hasEq(rec, 'brand_stakeholder.role_code'), 'null role => role_code filter must NOT be applied');
  // other filters intact
  assertEquals(eqVal(rec, 'client_id'), 'ny-client');
  assertEquals(eqVal(rec, 'is_active'), true);
  assertEquals(eqVal(rec, 'render_style'), 'realistic');
  assertEquals(rec.limit, 1);
  assertEquals(rec.orderCalled, false);
});

Deno.test('lookupAvatar: missing voice_id maps to null', async () => {
  const { supa } = makeQbSpy({ data: [{ heygen_avatar_id: 'AV_NOVOICE' }] });   // no heygen_voice_id
  const out = await lookupAvatar(supa, 'c', 'role', 'realistic');
  assertEquals(out, { talking_photo_id: 'AV_NOVOICE', voice_id: null });
});

Deno.test('lookupAvatar: heygen_voice_id null maps to null', async () => {
  const { supa } = makeQbSpy({ data: [{ heygen_avatar_id: 'AV_X', heygen_voice_id: null }] });
  const out = await lookupAvatar(supa, 'c', null, 'realistic');
  assertEquals(out, { talking_photo_id: 'AV_X', voice_id: null });
});

Deno.test('lookupAvatar: empty result ([]) returns null (Invegent/CFW zero-candidate)', async () => {
  const { supa } = makeQbSpy({ data: [] });
  const out = await lookupAvatar(supa, 'invegent', null, 'realistic');
  assertEquals(out, null);
});

Deno.test('lookupAvatar: null data returns null (zero-candidate)', async () => {
  const { supa } = makeQbSpy({ data: null });
  const out = await lookupAvatar(supa, 'cfw', 'role', 'realistic');
  assertEquals(out, null);
});

Deno.test('lookupAvatar: row without heygen_avatar_id returns null', async () => {
  const { supa } = makeQbSpy({ data: [{ heygen_voice_id: 'V_ONLY' }] });
  const out = await lookupAvatar(supa, 'c', null, 'realistic');
  assertEquals(out, null);
});

Deno.test('lookupAvatar: error-swallow parity — data undefined on error returns null (no throw)', async () => {
  // Parity invariant 6: the impl destructures ONLY `data`; an error yields null (caller then throws).
  const { supa } = makeQbSpy({ data: undefined, error: { message: 'boom' } });
  const out = await lookupAvatar(supa, 'c', 'role', 'realistic');
  assertEquals(out, null);   // must NOT throw here
});
