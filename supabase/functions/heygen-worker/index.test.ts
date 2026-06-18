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

function makeSupa(opts: SupaOpts) {
  const updates: Array<{ table: string; payload: any; id: any }> = [];
  const rpcCalls: Array<{ name: string; params: any }> = [];

  function builder(table: string) {
    const filters: Record<string, unknown> = {};
    let updatePayload: any = null;
    const b: any = {
      select() { return b; },
      eq(col: string, val: unknown) { filters[col] = val; return b; },
      in() { return b; },
      not() { return b; },
      limit() { return b; },
      update(payload: any) { updatePayload = payload; return b; },
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
    schema() { return { from: (t: string) => builder(t) }; },
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
      return Promise.resolve({ data: null, error: null });
    },
    storage: { from() { return { upload() { return Promise.resolve({ error: null }); } }; } },
    __updates: updates,
    __rpcCalls: rpcCalls,
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
    assertEquals(lookupQueries(supa).length, 0, 'preset must not run a brand_avatar lookup even with shadow on');
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
