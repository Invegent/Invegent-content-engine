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
import {
  computeParity,
  lookupAvatar,
  runPollPhase,
  runSubmitPhase,
  shadowTelemetryEnabled,
  snapshotHash,
} from './index.ts';

// --- in-memory Supabase stub ------------------------------------------------

interface SupaOpts {
  pending?: any[];
  rendering?: any[];
  avatarRow?: { heygen_avatar_id: string; heygen_voice_id: string | null } | null;
  brandRow?: { brand_colour_primary: string; client_slug: string } | null;
  existingRenderLogs?: any[];
  // AGP D-01 Gate-3 shadow resolver stub controls:
  shadowResult?: any | null;           // jsonb returned by resolve_avatar_shadow
  shadowRpcError?: { message: string } | null; // force the rpc to error
  shadowInsertError?: { message: string } | null; // force the telemetry insert to error
}

function makeSupa(opts: SupaOpts) {
  const updates: Array<{ table: string; payload: any; id: any }> = [];
  const rpcCalls: Array<{ name: string; params: any }> = [];
  const inserts: Array<{ schema: string; table: string; payload: any }> = [];

  function builder(table: string, schemaName = 'public') {
    const filters: Record<string, unknown> = {};
    let updatePayload: any = null;
    const b: any = {
      select() { return b; },
      eq(col: string, val: unknown) { filters[col] = val; return b; },
      in() { return b; },
      not() { return b; },
      limit() { return b; },
      update(payload: any) { updatePayload = payload; return b; },
      insert(payload: any) {
        inserts.push({ schema: schemaName, table, payload });
        if (schemaName === 'r' && table === 'avatar_resolution_shadow' && opts.shadowInsertError) {
          return Promise.resolve({ data: null, error: opts.shadowInsertError });
        }
        return Promise.resolve({ data: null, error: null });
      },
      then(resolve: (v: any) => void) {
        if (updatePayload !== null) {
          updates.push({ table, payload: updatePayload, id: filters['post_draft_id'] });
          return Promise.resolve({ data: null, error: null }).then(resolve);
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
    from: (t: string) => builder(t),
    rpc(name: string, params: any) {
      rpcCalls.push({ name, params });
      if (name === 'exec_sql') {
        const q: string = params?.query ?? '';
        if (q.includes('brand_avatar')) return Promise.resolve({ data: opts.avatarRow ? [opts.avatarRow] : [], error: null });
        if (q.includes('client_brand_profile')) return Promise.resolve({ data: opts.brandRow ? [opts.brandRow] : [], error: null });
        return Promise.resolve({ data: [], error: null });
      }
      if (name === 'write_render_log') return Promise.resolve({ error: null });
      if (name === 'resolve_avatar_shadow') {
        if (opts.shadowRpcError) return Promise.resolve({ data: null, error: opts.shadowRpcError });
        return Promise.resolve({ data: opts.shadowResult ?? null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    storage: { from() { return { upload() { return Promise.resolve({ error: null }); } }; } },
    __updates: updates,
    __rpcCalls: rpcCalls,
    __inserts: inserts,
  };
}

// --- AGP D-01 Gate-3 env-flag helpers (default OFF) -------------------------
// Async-aware: awaits the body BEFORE restoring the env var, so an async hook
// that reads the flag mid-flight sees the intended value.
async function withShadowFlag<T>(value: string | null, fn: () => T | Promise<T>): Promise<T> {
  const prev = Deno.env.get('AVATAR_SHADOW_TELEMETRY');
  if (value === null) Deno.env.delete('AVATAR_SHADOW_TELEMETRY');
  else Deno.env.set('AVATAR_SHADOW_TELEMETRY', value);
  try { return await fn(); }
  finally {
    if (prev === undefined) Deno.env.delete('AVATAR_SHADOW_TELEMETRY');
    else Deno.env.set('AVATAR_SHADOW_TELEMETRY', prev);
  }
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

function lookupQueries(supa: ReturnType<typeof makeSupa>): string[] {
  return supa.__rpcCalls
    .filter((c) => c.name === 'exec_sql' && String(c.params?.query ?? '').includes('brand_avatar'))
    .map((c) => String(c.params.query));
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
    assertEquals(lookupQueries(supa).length, 0, 'preset must not run a brand_avatar lookup');
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
    assertEquals(lookupQueries(supa).length, 0, 'poll must not run any brand_avatar lookup');
  } finally { restoreFetch(); }
});

Deno.test('role-selection behaviour unchanged: lookupAvatar builds role-filtered vs fallback SQL', async () => {
  const queries: string[] = [];
  const supaSpy: any = {
    rpc(_name: string, params: any) { queries.push(String(params.query)); return Promise.resolve({ data: [{ heygen_avatar_id: 'X', heygen_voice_id: 'Y' }] }); },
  };

  const withRole = await lookupAvatar(supaSpy, 'cid', 'founder', 'realistic');
  assertEquals(withRole, { talking_photo_id: 'X', voice_id: 'Y' });
  assert(queries[0].includes("role_code = 'founder'"), 'role provided => SQL must filter by role_code');
  assert(queries[0].includes("render_style = 'realistic'"), 'render_style filter preserved');

  queries.length = 0;
  await lookupAvatar(supaSpy, 'cid', null, 'realistic');
  assert(!queries[0].includes('role_code'), 'null role => SQL must NOT filter by role_code');
});

// ============================================================================
// AGP D-01 Gate-3 — shadow resolver + telemetry (production-INERT, flag-gated)
// ============================================================================

Deno.test('shadow flag: default OFF (unset/blank/off), ON only for on/true/1', async () => {
  await withShadowFlag(null,    () => assertEquals(shadowTelemetryEnabled(), false));
  await withShadowFlag('',      () => assertEquals(shadowTelemetryEnabled(), false));
  await withShadowFlag('off',   () => assertEquals(shadowTelemetryEnabled(), false));
  await withShadowFlag('no',    () => assertEquals(shadowTelemetryEnabled(), false));
  await withShadowFlag('on',    () => assertEquals(shadowTelemetryEnabled(), true));
  await withShadowFlag('ON',    () => assertEquals(shadowTelemetryEnabled(), true));
  await withShadowFlag('true',  () => assertEquals(shadowTelemetryEnabled(), true));
  await withShadowFlag('1',     () => assertEquals(shadowTelemetryEnabled(), true));
});

Deno.test('flag OFF: shadow hook is a NO-OP — live path byte-for-byte unchanged', async () => {
  await withShadowFlag('off', async () => {
    const supa = makeSupa({
      pending: [{
        post_draft_id: 'd1', client_id: 'client-uuid-1', recommended_format: 'video_short_avatar',
        draft_format: { video_script: { stakeholder_role: 'founder', render_style: 'realistic', narration_text: 'Hello there' } },
      }],
      avatarRow: { heygen_avatar_id: 'AV_ROLE', heygen_voice_id: 'VOICE_ROLE' },
      brandRow: { brand_colour_primary: '#123456', client_slug: 'acme' },
      // resolver would return this — but flag is OFF so it must never be called.
      shadowResult: { candidate_set: [], shadow_pick: null, shadow_rule: 'empty', candidate_count: 0 },
    });
    const fetchCalls = installFetch();
    try {
      await runSubmitPhase(supa as any, 'fake-key');

      // resolver RPC NEVER called; NO telemetry insert.
      assertEquals(supa.__rpcCalls.filter((c) => c.name === 'resolve_avatar_shadow').length, 0);
      assertEquals(supa.__inserts.filter((i) => i.table === 'avatar_resolution_shadow').length, 0);

      // live pick unchanged: avatar_identity + submitted payload identical to baseline.
      const gen = fetchCalls.find((c) => c.url.includes('/v2/video/generate'));
      assertExists(gen, 'HeyGen generate must still happen');
      const ai = supa.__updates.find((u) => u.payload?.video_status === 'rendering')!.payload.draft_format.avatar_identity;
      assertEquals(ai.talking_photo_id, 'AV_ROLE');
      assertEquals(ai.voice_id, 'VOICE_ROLE');
      assertEquals(ai.avatar_selected_by, 'role_filter');
    } finally { restoreFetch(); }
  });
});

Deno.test('flag ON: telemetry row captures the ACTUAL live pick + agree/drift', async () => {
  await withShadowFlag('on', async () => {
    const supa = makeSupa({
      pending: [{
        post_draft_id: 'd1', client_id: 'client-uuid-1', recommended_format: 'video_short_avatar',
        draft_format: { video_script: { stakeholder_role: 'founder', render_style: 'realistic', narration_text: 'Hello there' } },
      }],
      avatarRow: { heygen_avatar_id: 'AV_ROLE', heygen_voice_id: 'VOICE_ROLE' },
      brandRow: { brand_colour_primary: '#123456', client_slug: 'acme' },
      // shadow agrees with live (AV_ROLE)
      shadowResult: {
        candidate_set: [{ brand_avatar_id: 'ba1', heygen_avatar_id: 'AV_ROLE', heygen_voice_id: 'VOICE_ROLE', is_primary: false, is_default_host: false, shadow_selected: true }],
        shadow_pick: { heygen_avatar_id: 'AV_ROLE', heygen_voice_id: 'VOICE_ROLE' },
        shadow_rule: 'tiebreak_id',
        rejection_reasons: [],
        candidate_count: 1,
        multi_primary: false,
        multi_default_host: false,
      },
    });
    const fetchCalls = installFetch();
    try {
      await runSubmitPhase(supa as any, 'fake-key');

      // resolver called with the IDENTICAL inputs as the live pick
      const rpc = supa.__rpcCalls.find((c) => c.name === 'resolve_avatar_shadow');
      assertExists(rpc, 'resolve_avatar_shadow must be called when flag on');
      assertEquals(rpc!.params.p_client_id, 'client-uuid-1');
      assertEquals(rpc!.params.p_stakeholder_role, 'founder');
      assertEquals(rpc!.params.p_render_style, 'realistic');

      const ins = supa.__inserts.find((i) => i.schema === 'r' && i.table === 'avatar_resolution_shadow');
      assertExists(ins, 'telemetry row must be inserted into r.avatar_resolution_shadow');
      const row = ins!.payload;
      // live pick recorded verbatim (the ACTUAL pick, not a re-derivation)
      assertEquals(row.live_avatar_id, 'AV_ROLE');
      assertEquals(row.live_voice_id, 'VOICE_ROLE');
      assertEquals(row.live_selected_by, 'role_filter');
      assertEquals(row.shadow_avatar_id, 'AV_ROLE');
      assertEquals(row.agree, true);
      assertEquals(row.drift_class, 'none');
      assertEquals(row.candidate_count, 1);
      assertExists(row.brand_avatar_snapshot_hash);

      // live pick STILL drives the render — unchanged by the hook
      const ai = supa.__updates.find((u) => u.payload?.video_status === 'rendering')!.payload.draft_format.avatar_identity;
      assertEquals(ai.talking_photo_id, 'AV_ROLE');
      assertEquals(ai.avatar_selected_by, 'role_filter');
      assertExists(fetchCalls.find((c) => c.url.includes('/v2/video/generate')));
    } finally { restoreFetch(); }
  });
});

Deno.test('flag ON, resolver RPC errors: FAIL-OPEN — render still proceeds', async () => {
  await withShadowFlag('on', async () => {
    const supa = makeSupa({
      pending: [{
        post_draft_id: 'd1', client_id: 'c1', recommended_format: 'video_short_avatar',
        draft_format: { video_script: { render_style: 'realistic', narration_text: 'Hi' } },
      }],
      avatarRow: { heygen_avatar_id: 'AV_FB', heygen_voice_id: 'VOICE_FB' },
      brandRow: { brand_colour_primary: '#000', client_slug: 'x' },
      shadowRpcError: { message: 'function public.resolve_avatar_shadow does not exist' },
    });
    const fetchCalls = installFetch();
    try {
      const results = await runSubmitPhase(supa as any, 'fake-key');
      // shadow failed → NO telemetry row, but the render submitted successfully
      assertEquals(supa.__inserts.filter((i) => i.table === 'avatar_resolution_shadow').length, 0);
      assertExists(fetchCalls.find((c) => c.url.includes('/v2/video/generate')), 'render must proceed despite shadow failure');
      const r = results.find((x: any) => x.post_draft_id === 'd1');
      assertEquals(r.status, 'rendering');   // success, not failed
    } finally { restoreFetch(); }
  });
});

Deno.test('flag ON, telemetry INSERT errors: FAIL-OPEN — render still proceeds', async () => {
  await withShadowFlag('on', async () => {
    const supa = makeSupa({
      pending: [{
        post_draft_id: 'd1', client_id: 'c1', recommended_format: 'video_short_avatar',
        draft_format: { video_script: { render_style: 'realistic', narration_text: 'Hi' } },
      }],
      avatarRow: { heygen_avatar_id: 'AV_FB', heygen_voice_id: 'VOICE_FB' },
      brandRow: { brand_colour_primary: '#000', client_slug: 'x' },
      shadowResult: { candidate_set: [], shadow_pick: { heygen_avatar_id: 'AV_FB' }, shadow_rule: 'tiebreak_id', candidate_count: 1, multi_primary: false, multi_default_host: false },
      shadowInsertError: { message: 'permission denied for table avatar_resolution_shadow' },
    });
    const fetchCalls = installFetch();
    try {
      const results = await runSubmitPhase(supa as any, 'fake-key');
      assertExists(fetchCalls.find((c) => c.url.includes('/v2/video/generate')), 'render must proceed despite telemetry insert failure');
      assertEquals(results.find((x: any) => x.post_draft_id === 'd1').status, 'rendering');
    } finally { restoreFetch(); }
  });
});

Deno.test('computeParity: agree => none', () => {
  const { agree, drift_class } = computeParity(
    { avatar_id: 'AV1' },
    { shadow_avatar_id: 'AV1', candidate_count: 2, shadow_rule: 'tiebreak_created_at', multi_primary: false, multi_default_host: false },
    { render_style: 'realistic' },
  );
  assertEquals(agree, true);
  assertEquals(drift_class, 'none');
});

Deno.test('computeParity: disagree with >1 candidate, markers dormant => ordering_drift', () => {
  const { agree, drift_class } = computeParity(
    { avatar_id: 'AV_LIVE' },
    { shadow_avatar_id: 'AV_SHADOW', candidate_count: 3, shadow_rule: 'tiebreak_created_at', multi_primary: false, multi_default_host: false },
    { render_style: 'realistic' },
  );
  assertEquals(agree, false);
  assertEquals(drift_class, 'ordering_drift');
});

Deno.test('computeParity: empty candidate set => candidate_empty', () => {
  const { drift_class } = computeParity(
    { avatar_id: null },
    { shadow_avatar_id: null, candidate_count: 0, shadow_rule: 'empty', multi_primary: false, multi_default_host: false },
    { render_style: 'realistic' },
  );
  assertEquals(drift_class, 'candidate_empty');
});

Deno.test('computeParity: marker fired on disagreement => marker_drift (Gate-3 alarm)', () => {
  const { drift_class } = computeParity(
    { avatar_id: 'AV_LIVE' },
    { shadow_avatar_id: 'AV_PRIMARY', candidate_count: 2, shadow_rule: 'primary', multi_primary: false, multi_default_host: false },
    { render_style: 'realistic' },
  );
  assertEquals(drift_class, 'marker_drift');
});

Deno.test('computeParity: multi_primary / multi_default_host integrity alarms take precedence', () => {
  assertEquals(
    computeParity({ avatar_id: 'A' }, { shadow_avatar_id: 'A', candidate_count: 2, shadow_rule: 'primary', multi_primary: true }, { render_style: 'realistic' }).drift_class,
    'multi_primary',
  );
  assertEquals(
    computeParity({ avatar_id: 'A' }, { shadow_avatar_id: 'A', candidate_count: 2, shadow_rule: 'default_host', multi_default_host: true }, { render_style: 'realistic' }).drift_class,
    'multi_default_host',
  );
});

Deno.test('computeParity: null/blank render_style => input_anomaly', () => {
  assertEquals(
    computeParity({ avatar_id: 'A' }, { shadow_avatar_id: 'A', candidate_count: 1, shadow_rule: 'tiebreak_id' }, { render_style: null }).drift_class,
    'input_anomaly',
  );
  assertEquals(
    computeParity({ avatar_id: 'A' }, { shadow_avatar_id: 'A', candidate_count: 1, shadow_rule: 'tiebreak_id' }, { render_style: '   ' }).drift_class,
    'input_anomaly',
  );
});

Deno.test('shadow order is a TOTAL order (deterministic, never ties on the real SQL keys)', () => {
  // Mirror the migration ORDER BY: is_primary DESC, is_default_host DESC,
  // created_at ASC, brand_avatar_id ASC. brand_avatar_id is unique => total order.
  const rows = [
    { brand_avatar_id: 'b', is_primary: false, is_default_host: false, created_at: '2026-01-01T00:00:00Z' },
    { brand_avatar_id: 'a', is_primary: false, is_default_host: false, created_at: '2026-01-01T00:00:00Z' }, // tie on first 3 keys
    { brand_avatar_id: 'c', is_primary: true,  is_default_host: false, created_at: '2026-02-01T00:00:00Z' },
    { brand_avatar_id: 'd', is_primary: false, is_default_host: true,  created_at: '2026-03-01T00:00:00Z' },
  ];
  const cmp = (x: any, y: any) =>
    (Number(y.is_primary) - Number(x.is_primary)) ||
    (Number(y.is_default_host) - Number(x.is_default_host)) ||
    (x.created_at < y.created_at ? -1 : x.created_at > y.created_at ? 1 : 0) ||
    (x.brand_avatar_id < y.brand_avatar_id ? -1 : x.brand_avatar_id > y.brand_avatar_id ? 1 : 0);
  const sorted = [...rows].sort(cmp).map((r) => r.brand_avatar_id);
  // primary (c) first, then default_host (d), then the created_at/id tiebreak (a before b)
  assertEquals(sorted, ['c', 'd', 'a', 'b']);
  // total order: no two rows ever compare equal
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows.length; j++) {
      if (i !== j) assert(cmp(rows[i], rows[j]) !== 0, 'order must never tie (total order)');
    }
  }
});

Deno.test('snapshotHash is deterministic and order-sensitive', () => {
  const a = [{ id: 1 }, { id: 2 }];
  assertEquals(snapshotHash(a), snapshotHash([{ id: 1 }, { id: 2 }]));
  assert(snapshotHash(a) !== snapshotHash([{ id: 2 }, { id: 1 }]), 'different candidate order => different hash');
  assertEquals(snapshotHash([]), snapshotHash([]));
});
