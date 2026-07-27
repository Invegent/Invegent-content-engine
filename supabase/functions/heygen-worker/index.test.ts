// heygen-worker v2.4.1 — hermetic tests for F-HEYGEN-AVATAR-IDENTITY-TELEMETRY +
// cc-0063 Step B (governed host-designation resolver, Leg 2 of the Route A proof).
//
// Fully hermetic: NO real Supabase client, NO real HeyGen API call, NO DB, NO network at
// runtime (globalThis.fetch is stubbed to intercept HeyGen generate/status/download URLs and
// return canned responses). The real exported phase functions are exercised against an in-memory
// Supabase stub that records every .update() payload and every .rpc() call.
//
// Proves (v2.1.1 / AGP-D01-3, preserved):
//   1. submit writes draft_format.avatar_identity
//   2. captured talking_photo_id / voice_id are the EXACT values submitted to HeyGen
//   3. avatar_selected_by is set correctly (now: default_host | primary_fallback |
//      undesignated_tiebreak | preset — role_filter/fallback_limit1 retired from EMISSION)
//   4. the poll / render-log path COPIES the captured avatar_identity into render_spec verbatim
//   5. the poll path does NOT call lookupAvatar (no brand_avatar reselection query)
//   6. lookupAvatar builds the same role-filtered SQL (role predicate unchanged)
//
// Proves (cc-0063 Step B, Leg 2 — the anti-hardcode + non-collapse core):
//   7. the resolver query carries the PK-ruled order (is_default_host DESC BEFORE is_primary
//      DESC, then created_at ASC, then brand_avatar_id ASC)
//   8. reason code DERIVED (not hardcoded): {default:true} => default_host;
//      {primary:true} => primary_fallback; {neither} => undesignated_tiebreak
//   9. empty candidate set => structured avatar_resolution_outcome = 'no_eligible_avatar' + failed
//  10. query ERROR => avatar_resolution_outcome = 'resolution_failed', distinct from (NOT
//      collapsed into) 'no_eligible_avatar' (the :92 repair / 2026-07-23 non-collapse)
//
// Run: deno test --allow-env supabase/functions/heygen-worker/index.test.ts

import { assert, assertEquals, assertExists } from 'jsr:@std/assert@1';
import { lookupAvatar, runPollPhase, runSubmitPhase } from './index.ts';

// --- in-memory Supabase stub ------------------------------------------------

type AvatarStubRow = { heygen_avatar_id: string; heygen_voice_id: string | null; is_default_host?: boolean; is_primary?: boolean } | null;

interface SupaOpts {
  pending?: any[];
  rendering?: any[];
  avatarRow?: AvatarStubRow;
  // cc-0083 Slice B: let the ROLE-filtered resolve and the ROLE-LESS (default-host) resolve return
  // DIFFERENT rows, so the default-host fallback can be exercised. When unset, both fall back to
  // avatarRow — every pre-existing test is byte-unchanged (they set only avatarRow).
  roleAvatarRow?: AvatarStubRow;
  noRoleAvatarRow?: AvatarStubRow;
  avatarError?: { message?: string } | null;   // cc-0063 Step B: inject an exec_sql error on the brand_avatar query
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
        if (q.includes('brand_avatar')) {
          if (opts.avatarError) return Promise.resolve({ data: null, error: opts.avatarError });
          // cc-0083 Slice B: a role-filtered resolve carries `role_code`; a role-less (default-host)
          // resolve does not. Return the role/no-role specific row when the test supplied one,
          // else fall back to avatarRow (backward-compatible with all existing tests).
          const isRoleQuery = q.includes('role_code');
          let row: AvatarStubRow = opts.avatarRow ?? null;
          if (isRoleQuery && 'roleAvatarRow' in opts) row = opts.roleAvatarRow ?? null;
          if (!isRoleQuery && 'noRoleAvatarRow' in opts) row = opts.noRoleAvatarRow ?? null;
          return Promise.resolve({ data: row ? [row] : [], error: null });
        }
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

Deno.test('submit (default_host): captures avatar_identity = the EXACT values submitted to HeyGen', async () => {
  const supa = makeSupa({
    pending: [{
      post_draft_id: 'd1', client_id: 'client-uuid-1', recommended_format: 'video_short_avatar',
      draft_format: { video_script: { stakeholder_role: 'founder', render_style: 'realistic', narration_text: 'Hello there' } },
    }],
    avatarRow: { heygen_avatar_id: 'AV_ROLE', heygen_voice_id: 'VOICE_ROLE', is_default_host: true, is_primary: false },
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
    assertEquals(ai.avatar_selected_by, 'default_host');   // cc-0063 Step B: designated host won
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

Deno.test('submit (undesignated_tiebreak): no role, undesignated avatar => avatar_selected_by=undesignated_tiebreak', async () => {
  const supa = makeSupa({
    pending: [{
      post_draft_id: 'd3', client_id: 'c3', recommended_format: 'video_short_avatar',
      draft_format: { render_style: 'realistic', narration_text: 'Hi' },   // no role, no preset id
    }],
    avatarRow: { heygen_avatar_id: 'AV_FB', heygen_voice_id: 'VOICE_FB', is_default_host: false, is_primary: false },
    brandRow: { brand_colour_primary: '#0A2A4A', client_slug: 'gamma' },
  });
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const ai = supa.__updates.find((u) => u.payload?.video_status === 'rendering')!.payload.draft_format.avatar_identity;
    assertEquals(ai.avatar_selected_by, 'undesignated_tiebreak');
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

Deno.test('shadow ON: exactly one shadow rpc call with the ACTUAL live pick (default_host)', async () => {
  const prev = Deno.env.get('AVATAR_SHADOW_TELEMETRY');
  Deno.env.set('AVATAR_SHADOW_TELEMETRY', 'true');
  const supa = makeSupa({
    pending: [{
      post_draft_id: 'd1', client_id: 'client-uuid-1', recommended_format: 'video_short_avatar',
      draft_format: { video_script: { stakeholder_role: 'founder', render_style: 'realistic', narration_text: 'Hello there' } },
    }],
    avatarRow: { heygen_avatar_id: 'AV_ROLE', heygen_voice_id: 'VOICE_ROLE', is_default_host: true, is_primary: false },
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
    assertEquals(p.p_live_selected_by, 'default_host');

    // shadow must NOT have changed the live pick captured into draft_format
    const ai = supa.__updates.find((u) => u.payload?.video_status === 'rendering')!.payload.draft_format.avatar_identity;
    assertEquals(ai.talking_photo_id, 'AV_ROLE');
    assertEquals(ai.avatar_selected_by, 'default_host');
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
    rpc(_name: string, params: any) { queries.push(String(params.query)); return Promise.resolve({ data: [{ heygen_avatar_id: 'X', heygen_voice_id: 'Y', is_default_host: false, is_primary: false }], error: null }); },
  };

  const withRole = await lookupAvatar(supaSpy, 'cid', 'founder', 'realistic');
  // cc-0063 Step B: return is now a discriminated union; undesignated row => undesignated_tiebreak.
  assertEquals(withRole, { outcome: 'undesignated_tiebreak', talking_photo_id: 'X', voice_id: 'Y' });
  assert(queries[0].includes("role_code = 'founder'"), 'role provided => SQL must filter by role_code');
  assert(queries[0].includes("render_style = 'realistic'"), 'render_style filter preserved');

  queries.length = 0;
  await lookupAvatar(supaSpy, 'cid', null, 'realistic');
  assert(!queries[0].includes('role_code'), 'null role => SQL must NOT filter by role_code');
});

// --- cc-0063 Step B — Leg 2 of the Route A proof (governed host-designation resolver) --------
//
// Hermetic constructed-candidate tests. Leg 2 CANNOT show that live PostgREST/exec_sql behaves
// as this harness does — that is the exact assumption that caused the cc-0052 outage; the deployed
// call site is covered by Leg 1 (natural live submit) and the live ORDER BY by Leg 3 (read-only
// live-engine replay). Both are POST-DEPLOY, PK-run — out of this lane's scope.

// A pending avatar draft with NO preset identity => the resolver runs. avatarRow/avatarError vary.
function submitSupaWithAvatar(
  avatarRow: SupaOpts['avatarRow'],
  extra: Partial<SupaOpts> = {},
) {
  return makeSupa({
    pending: [{
      post_draft_id: 'dX', client_id: 'cX', recommended_format: 'video_short_avatar',
      draft_format: { render_style: 'realistic', narration_text: 'Hi' },
    }],
    avatarRow,
    brandRow: { brand_colour_primary: '#0A2A4A', client_slug: 'zeta' },
    ...extra,
  });
}

Deno.test('Step B: lookupAvatar query carries the ruled order (is_default_host DESC BEFORE is_primary DESC, then created_at ASC, then brand_avatar_id ASC)', async () => {
  const queries: string[] = [];
  const supaSpy: any = {
    rpc(_name: string, params: any) {
      queries.push(String(params.query));
      return Promise.resolve({ data: [{ heygen_avatar_id: 'X', heygen_voice_id: 'Y', is_default_host: true, is_primary: false }], error: null });
    },
  };
  await lookupAvatar(supaSpy, 'cid', null, 'realistic');
  const q = queries[0];
  const iOrderBy  = q.indexOf('ORDER BY');
  const iDefault  = q.indexOf('is_default_host DESC');
  const iPrimary  = q.indexOf('is_primary DESC');
  const iCreated  = q.indexOf('created_at ASC');
  const iAvatarId = q.indexOf('brand_avatar_id ASC');
  assert(iOrderBy >= 0, 'query must carry an ORDER BY');
  assert(iDefault > iOrderBy, 'is_default_host DESC must appear in the ORDER BY');
  assert(iDefault < iPrimary, 'is_default_host DESC must PRECEDE is_primary DESC (ruled order, diverges from shadow)');
  assert(iPrimary < iCreated, 'is_primary DESC must precede created_at ASC');
  assert(iCreated < iAvatarId, 'created_at ASC must precede brand_avatar_id ASC');
});

Deno.test('Step B derive default_host: {is_default_host:true, is_primary:false} => avatar_selected_by=default_host', async () => {
  const supa = submitSupaWithAvatar({ heygen_avatar_id: 'AV_DH', heygen_voice_id: 'V_DH', is_default_host: true, is_primary: false });
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const ai = supa.__updates.find((u) => u.payload?.video_status === 'rendering')!.payload.draft_format.avatar_identity;
    assertEquals(ai.avatar_selected_by, 'default_host');
    assertEquals(ai.talking_photo_id, 'AV_DH');
  } finally { restoreFetch(); }
});

Deno.test('Step B derive primary_fallback (anti-hardcode): {is_default_host:false, is_primary:true} => avatar_selected_by=primary_fallback', async () => {
  const supa = submitSupaWithAvatar({ heygen_avatar_id: 'AV_PR', heygen_voice_id: 'V_PR', is_default_host: false, is_primary: true });
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const ai = supa.__updates.find((u) => u.payload?.video_status === 'rendering')!.payload.draft_format.avatar_identity;
    // a hardcoded default_host would FAIL here — this proves the code is DERIVED
    assertEquals(ai.avatar_selected_by, 'primary_fallback');
    assertEquals(ai.talking_photo_id, 'AV_PR');
  } finally { restoreFetch(); }
});

Deno.test('Step B derive undesignated_tiebreak (anti-hardcode): {is_default_host:false, is_primary:false} => avatar_selected_by=undesignated_tiebreak', async () => {
  const supa = submitSupaWithAvatar({ heygen_avatar_id: 'AV_TB', heygen_voice_id: 'V_TB', is_default_host: false, is_primary: false });
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const ai = supa.__updates.find((u) => u.payload?.video_status === 'rendering')!.payload.draft_format.avatar_identity;
    assertEquals(ai.avatar_selected_by, 'undesignated_tiebreak');
    assertEquals(ai.talking_photo_id, 'AV_TB');
  } finally { restoreFetch(); }
});

Deno.test('Step B no_eligible_avatar: empty candidate set => structured avatar_resolution_outcome + video_status=failed', async () => {
  const supa = submitSupaWithAvatar(null);   // avatarRow null => exec_sql returns {data:[], error:null}
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const upd = supa.__updates.find((u) => u.payload?.video_status === 'failed');
    assertExists(upd, 'empty candidate set must mark the draft failed');
    assertEquals(upd!.payload.video_status, 'failed');
    assertEquals(upd!.payload.draft_format.avatar_resolution_outcome, 'no_eligible_avatar');
    // fail-closed: no HeyGen submit occurred
    assertEquals(supa.__updates.find((u) => u.payload?.video_status === 'rendering'), undefined, 'no submit on an empty candidate set');
  } finally { restoreFetch(); }
});

Deno.test('Step B resolution_failed distinct from no_eligible_avatar: query error => avatar_resolution_outcome=resolution_failed (the :92 repair)', async () => {
  const supa = submitSupaWithAvatar(null, { avatarError: { message: 'db boom' } });
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const upd = supa.__updates.find((u) => u.payload?.video_status === 'failed');
    assertExists(upd, 'a query error must mark the draft failed (never a silent false-null)');
    assertEquals(upd!.payload.draft_format.avatar_resolution_outcome, 'resolution_failed');
    // the 2026-07-23 non-collapse: an errored query is NOT reported as "no avatar"
    assert(upd!.payload.draft_format.avatar_resolution_outcome !== 'no_eligible_avatar',
      'a query error must NOT collapse into no_eligible_avatar');
    // fail-closed: no HeyGen submit occurred
    assertEquals(supa.__updates.find((u) => u.payload?.video_status === 'rendering'), undefined, 'no submit on a resolution error');
  } finally { restoreFetch(); }
});

// --- cc-0083 Slice B — role-requested default-host fallback (§3) + telemetry (§4) -----------
//
// The selection seam: ai-worker now writes video_script.stakeholder_role for a clear/confident
// role. heygen-worker consumes it, but a requested-yet-unavailable role must fall back to the
// client default host (PK ruling) rather than fail closed. Telemetry (avatar_identity):
// requested_stakeholder_role (string|null) + role_fallback_to_default_host (boolean).

// A pending avatar draft carrying a stakeholder_role; role/no-role resolves configured per case.
function submitSupaWithRole(role: string | null, extra: Partial<SupaOpts>) {
  return makeSupa({
    pending: [{
      post_draft_id: 'dR', client_id: 'cR', recommended_format: 'video_short_avatar',
      draft_format: { video_script: { stakeholder_role: role, render_style: 'realistic', narration_text: 'Hi' } },
    }],
    brandRow: { brand_colour_primary: '#0A2A4A', client_slug: 'rho' },
    ...extra,
  });
}

// (a) role requested + an eligible avatar for that role => role-matched pick, NO fallback.
Deno.test('cc-0083 (a) role requested + eligible avatar => role-matched pick, role_fallback_to_default_host=false', async () => {
  const supa = submitSupaWithRole('participant', {
    roleAvatarRow: { heygen_avatar_id: 'AV_PART', heygen_voice_id: 'V_PART', is_default_host: false, is_primary: false },
    noRoleAvatarRow: { heygen_avatar_id: 'AV_HOST', heygen_voice_id: 'V_HOST', is_default_host: true, is_primary: false },
  });
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const ai = supa.__updates.find((u) => u.payload?.video_status === 'rendering')!.payload.draft_format.avatar_identity;
    assertEquals(ai.talking_photo_id, 'AV_PART', 'role avatar chosen, not the default host');
    assertEquals(ai.requested_stakeholder_role, 'participant');
    assertEquals(ai.role_fallback_to_default_host, false);
    // exactly one brand_avatar lookup (the role query) — no fallback re-resolve needed
    assertEquals(lookupQueries(supa).length, 1, 'a matched role must not trigger the fallback lookup');
    assert(lookupQueries(supa)[0].includes("role_code = 'participant'"), 'the single lookup is role-filtered');
  } finally { restoreFetch(); }
});

// (b) role requested + NO eligible avatar for it + a default host present => fall back to host, flag true.
Deno.test('cc-0083 (b) role requested + role unavailable + default host present => fallback to default host, role_fallback_to_default_host=true', async () => {
  const supa = submitSupaWithRole('participant', {
    roleAvatarRow: null,   // role query returns empty
    noRoleAvatarRow: { heygen_avatar_id: 'AV_HOST', heygen_voice_id: 'V_HOST', is_default_host: true, is_primary: false },
  });
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const upd = supa.__updates.find((u) => u.payload?.video_status === 'rendering');
    assertExists(upd, 'a requested-but-unavailable role must NOT hard-fail when a default host exists');
    const ai = upd!.payload.draft_format.avatar_identity;
    assertEquals(ai.talking_photo_id, 'AV_HOST', 'the client default host is used');
    assertEquals(ai.avatar_selected_by, 'default_host');
    assertEquals(ai.requested_stakeholder_role, 'participant', 'telemetry records the role that was requested');
    assertEquals(ai.role_fallback_to_default_host, true);
    // two lookups: the role-filtered one (empty) then the role-less fallback
    const qs = lookupQueries(supa);
    assertEquals(qs.length, 2, 'role miss must trigger a second, role-less lookup');
    assert(qs[0].includes("role_code = 'participant'"), 'first lookup is role-filtered');
    assert(!qs[1].includes('role_code'), 'second (fallback) lookup is role-less');
  } finally { restoreFetch(); }
});

// (c) role requested + no avatar at all (default host also missing) => genuine hard fail (unchanged).
Deno.test('cc-0083 (c) role requested + no avatar at all => hard fail (no_eligible_avatar)', async () => {
  const supa = submitSupaWithRole('participant', {
    roleAvatarRow: null,
    noRoleAvatarRow: null,   // even the role-less fallback finds nothing
  });
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const upd = supa.__updates.find((u) => u.payload?.video_status === 'failed');
    assertExists(upd, 'no role avatar AND no default host must still hard-fail');
    assertEquals(upd!.payload.draft_format.avatar_resolution_outcome, 'no_eligible_avatar');
    // fail-closed: no submit
    assertEquals(supa.__updates.find((u) => u.payload?.video_status === 'rendering'), undefined, 'no submit when nothing resolves');
  } finally { restoreFetch(); }
});

// (d) no role requested + default host present => default host, requested role null, no fallback flag.
Deno.test('cc-0083 (d) no role requested + default host present => default host, requested_stakeholder_role=null, role_fallback_to_default_host=false', async () => {
  const supa = submitSupaWithRole(null, {
    noRoleAvatarRow: { heygen_avatar_id: 'AV_HOST', heygen_voice_id: 'V_HOST', is_default_host: true, is_primary: false },
  });
  installFetch();
  try {
    await runSubmitPhase(supa as any, 'fake-key');
    const ai = supa.__updates.find((u) => u.payload?.video_status === 'rendering')!.payload.draft_format.avatar_identity;
    assertEquals(ai.talking_photo_id, 'AV_HOST');
    assertEquals(ai.avatar_selected_by, 'default_host');
    assertEquals(ai.requested_stakeholder_role, null);
    assertEquals(ai.role_fallback_to_default_host, false, 'no role requested => this was never a fallback');
    // exactly one (role-less) lookup — no fallback path taken
    const qs = lookupQueries(supa);
    assertEquals(qs.length, 1, 'no role => a single role-less lookup, no fallback');
    assert(!qs[0].includes('role_code'), 'the single lookup is role-less');
  } finally { restoreFetch(); }
});
