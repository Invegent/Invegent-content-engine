// Hermetic unit tests for scripts/ws4-d4-kinetic-proof-render.ts (WS-4/WS-5 D4 out-of-band proof
// render harness). No live network calls, no DB, no secrets — every fetch is a mocked injectable.
// Run: deno test --allow-env scripts/ws4-d4-kinetic-proof-render_test.ts
import { assert, assertEquals, assertThrows, assertRejects } from 'jsr:@std/assert@1';
import {
  generateKineticScriptViaAiWorker,
  generateKineticScriptViaAnthropicDirect,
  kineticSystemPrompt,
  kineticUserPrompt,
  buildManualSelectorResponse,
  fireKineticProofRender,
  DEFAULT_PP_PRIMARY_COLOUR,
  DEFAULT_PP_SECONDARY_COLOUR,
  DEFAULT_PP_LOGO_URL,
  DEFAULT_PROVIDER_TEMPLATE_ID,
  type KineticGenerationResult,
} from './ws4-d4-kinetic-proof-render.ts';
import type { KineticScene } from '../supabase/functions/video-worker/b1_video_kinetic.ts';

const CREATOMATE_KEY = 'test-creatomate-key';

// ── Strategy 1: ai-worker HTTP (real queue-consumer contract, mocked) ─────────────────────────────

// Realistic ai-worker POST response envelope — mirrors ai-worker/index.ts:2013's actual shape
// (`{ ok, version, worker_id, locked, processed, results: [...] }`), with a `video_script_generated`
// hit per job (ai-worker/index.ts:1990) — NOTE the response never carries scenes, per the NAMED GAP.
function mockAiWorkerFetch(hit = true): typeof fetch {
  return ((_url: string, _init: RequestInit) => {
    return Promise.resolve(new Response(JSON.stringify({
      ok: true, version: 'ai-worker-v2.25.0', worker_id: 'ws4-d4-kinetic-proof', locked: 1, processed: 1,
      results: [{
        ai_job_id: 'job-1', post_draft_id: 'draft-abc-123', status: 'succeeded',
        provider: 'anthropic', model: 'claude-sonnet-4-6', format_decided: 'video_short_kinetic',
        format_reason: 'schedule', compliance_rules_injected: 0,
        video_script_generated: hit, input_tokens: 500, output_tokens: 300,
      }],
    }), { status: 200 })) as unknown as Promise<Response>;
  }) as unknown as typeof fetch;
}

const realisticScenes: KineticScene[] = [
  { type: 'hook', headline: 'Perth rents just hit a 10-year high', body: null, duration_s: 6 },
  { type: 'point', headline: 'Median asking rent: $650/week', body: 'Up 9% since last year', duration_s: 8 },
  { type: 'cta', headline: 'Thinking of listing this spring?', body: null, duration_s: 5 },
];

Deno.test('ai-worker strategy: hit + readBackFn → returns scenes from the read-back, not the HTTP response', async () => {
  const result = await generateKineticScriptViaAiWorker({
    aiWorkerUrl: 'https://example.test/ai-worker',
    aiWorkerKey: 'k',
    fetchImpl: mockAiWorkerFetch(true),
    readBackFn: async (postDraftId) => {
      assertEquals(postDraftId, 'draft-abc-123');
      return { scenes: realisticScenes, narration_text: 'narration', total_duration_s: 19 };
    },
  });
  assertEquals(result.source, 'ai_worker_http');
  assertEquals(result.scenes, realisticScenes);
  assertEquals(result.narration_text, 'narration');
});

Deno.test('ai-worker strategy: no video_script_generated hit → throws (does not silently proceed)', async () => {
  await assertRejects(
    () => generateKineticScriptViaAiWorker({ aiWorkerUrl: 'x', aiWorkerKey: 'k', fetchImpl: mockAiWorkerFetch(false) }),
    Error,
    'ai_worker_no_video_script_generated',
  );
});

Deno.test('ai-worker strategy: hit but NO readBackFn supplied → throws naming the gap (never guesses scenes)', async () => {
  await assertRejects(
    () => generateKineticScriptViaAiWorker({ aiWorkerUrl: 'x', aiWorkerKey: 'k', fetchImpl: mockAiWorkerFetch(true) }),
    Error,
    'ai_worker_readback_required',
  );
});

Deno.test('ai-worker strategy: readBackFn returns empty/null → throws', async () => {
  await assertRejects(
    () => generateKineticScriptViaAiWorker({ aiWorkerUrl: 'x', aiWorkerKey: 'k', fetchImpl: mockAiWorkerFetch(true), readBackFn: async () => null }),
    Error,
    'ai_worker_readback_empty',
  );
});

Deno.test('ai-worker strategy: non-2xx HTTP → throws with status', async () => {
  const badFetch = (() => Promise.resolve(new Response('server error', { status: 500 }))) as unknown as typeof fetch;
  await assertRejects(
    () => generateKineticScriptViaAiWorker({ aiWorkerUrl: 'x', aiWorkerKey: 'k', fetchImpl: badFetch }),
    Error,
    'ai_worker_http_500',
  );
});

// ── Strategy 2: Anthropic direct (verbatim-prompt, single-call alternative) ───────────────────────

Deno.test('prompt citation: kineticSystemPrompt/kineticUserPrompt match ai-worker/index.ts:728-729 verbatim (spot checks)', () => {
  const sys = kineticSystemPrompt('Property Pulse', 'real estate');
  assert(sys.includes('YouTube Shorts script writer for Property Pulse, a real estate sector'));
  assert(sys.includes('Produce exactly 3-5 scenes: one hook (first), one to three point scenes (middle), one cta (last)'));
  assert(sys.includes('hook: headline max 60 chars, no body, duration_s 5-7'));
  assert(sys.includes('point: headline max 55 chars, body max 100 chars'));
  assert(sys.includes('cta: headline max 65 chars'));
  const usr = kineticUserPrompt('My Title', 'My body text');
  assertEquals(usr, 'Post title: My Title\n\nPost body:\nMy body text\n\nGenerate the video script.');
});

// Realistic Anthropic response shape (data.content[0].text carries the JSON, mirrors
// generateVideoScript's own parsing at ai-worker/index.ts:736-745).
function mockAnthropicFetch(bodyText: string, status = 200): typeof fetch {
  return ((_url: string, _init: RequestInit) => Promise.resolve(new Response(JSON.stringify({
    id: 'msg_test', type: 'message', role: 'assistant',
    content: [{ type: 'text', text: bodyText }],
    model: 'claude-sonnet-4-6',
  }), { status }))) as unknown as typeof fetch;
}

const realisticAnthropicJson = JSON.stringify({
  format: 'kinetic_text',
  scenes: [
    { type: 'hook', headline: 'Perth rents just hit a 10-year high', body: null, duration_s: 6 },
    { type: 'point', headline: 'Median asking rent: $650/week', body: 'Up 9% since this time last year', duration_s: 8 },
    { type: 'point', headline: 'Vacancy rate sits at just 0.8%', body: 'Tenants are competing for every listing', duration_s: 8 },
    { type: 'cta', headline: 'Thinking of listing this spring?', body: null, duration_s: 5 },
  ],
  total_duration_s: 27,
  narration_text: 'Perth rents just hit a 10-year high...',
});

Deno.test('anthropic-direct: parses a clean JSON response into scenes', async () => {
  const result = await generateKineticScriptViaAnthropicDirect({
    anthropicKey: 'k', postTitle: 'Perth rental update', postBody: 'body text',
    clientName: 'Property Pulse', vertical: 'real estate',
    fetchImpl: mockAnthropicFetch(realisticAnthropicJson),
  });
  assertEquals(result.source, 'anthropic_direct');
  assertEquals(result.scenes.length, 4);
  assertEquals(result.scenes[0].type, 'hook');
  assertEquals(result.scenes[3].type, 'cta');
  // total_duration_s is RECOMPUTED as the scene-duration sum (mirrors ai-worker/index.ts:742), not
  // trusted verbatim from the model — 6+8+8+5=27, matches here, but the recompute is what's tested.
  assertEquals(result.total_duration_s, 27);
});

Deno.test('anthropic-direct: strips ```json fences before parsing (mirrors ai-worker exactly)', async () => {
  const fenced = '```json\n' + realisticAnthropicJson + '\n```';
  const result = await generateKineticScriptViaAnthropicDirect({
    anthropicKey: 'k', postTitle: 't', postBody: 'b', clientName: 'PP', vertical: 'real estate',
    fetchImpl: mockAnthropicFetch(fenced),
  });
  assertEquals(result.scenes.length, 4);
});

Deno.test('anthropic-direct: fewer than 3 scenes → throws (never proceeds on an invalid script)', async () => {
  const badJson = JSON.stringify({ scenes: [{ type: 'hook', headline: 'H', body: null, duration_s: 5 }] });
  await assertRejects(
    () => generateKineticScriptViaAnthropicDirect({ anthropicKey: 'k', postTitle: 't', postBody: 'b', clientName: 'PP', vertical: 'v', fetchImpl: mockAnthropicFetch(badJson) }),
    Error,
    'anthropic_kinetic_invalid_scenes',
  );
});

Deno.test('anthropic-direct: malformed JSON → throws with the raw text', async () => {
  await assertRejects(
    () => generateKineticScriptViaAnthropicDirect({ anthropicKey: 'k', postTitle: 't', postBody: 'b', clientName: 'PP', vertical: 'v', fetchImpl: mockAnthropicFetch('not json at all') }),
    Error,
    'anthropic_kinetic_parse_failed',
  );
});

Deno.test('anthropic-direct: non-2xx HTTP → throws', async () => {
  await assertRejects(
    () => generateKineticScriptViaAnthropicDirect({ anthropicKey: 'k', postTitle: 't', postBody: 'b', clientName: 'PP', vertical: 'v', fetchImpl: mockAnthropicFetch('unauthorized', 401) }),
    Error,
    'anthropic_http_401',
  );
});

// ── buildManualSelectorResponse — the select_template BYPASS shape ────────────────────────────────

Deno.test('buildManualSelectorResponse: status ok, Logo.source set, warnings name the bypass explicitly', () => {
  const resp = buildManualSelectorResponse({ providerTemplateId: DEFAULT_PROVIDER_TEMPLATE_ID, logoUrl: DEFAULT_PP_LOGO_URL });
  assertEquals(resp.status, 'ok');
  assertEquals(resp.selected?.provider_template_id, DEFAULT_PROVIDER_TEMPLATE_ID);
  assertEquals(resp.slot_resolution?.modifications?.['Logo.source'], DEFAULT_PP_LOGO_URL);
  assert(resp.slot_resolution?.warnings?.some((w) => String(w).includes('BYPASSED')));
  assert(resp.warnings?.some((w) => String(w).includes('select_template')));
});

// ── fireKineticProofRender — the ACTUAL production plan-building code, real select_template bypass ─

const mockSubmitOk = (_renderScript: object, _key: string, startMs?: number) => Promise.resolve({
  renderId: 'render-123', url: 'https://mock.test/out.mp4', creditsUsed: 2, durationMs: 1000,
});
const mockSubmitFails = (_renderScript: object, _key: string, _startMs?: number): Promise<never> =>
  Promise.reject(new Error('Creatomate submit 500: boom'));

Deno.test('fireKineticProofRender: succeeds, uses the REAL buildGovernedVideoKineticPlan output, select_template never called', async () => {
  const scenes: KineticScene[] = [
    { type: 'hook', headline: 'Hook headline', body: null, duration_s: 6 },
    { type: 'point', headline: 'Point headline', body: 'Point body', duration_s: 8 },
    { type: 'cta', headline: 'Cta headline', body: null, duration_s: 5 },
  ];
  const evidence = await fireKineticProofRender({
    scenes, providerTemplateId: DEFAULT_PROVIDER_TEMPLATE_ID, logoUrl: DEFAULT_PP_LOGO_URL,
    primaryColour: DEFAULT_PP_PRIMARY_COLOUR, secondaryColour: DEFAULT_PP_SECONDARY_COLOUR,
    clientName: 'Property Pulse', creatomateKey: CREATOMATE_KEY,
    submitAndPollFn: mockSubmitOk as any,
  });
  assertEquals(evidence.status, 'succeeded');
  if (evidence.status === 'succeeded') {
    assertEquals(evidence.provider_render_id, 'render-123');
    assertEquals(evidence.output_video_url, 'https://mock.test/out.mp4');
    assertEquals(evidence.provider_template_id_used, DEFAULT_PROVIDER_TEMPLATE_ID);
    assertEquals(evidence.bypassed_select_template, true);
    assertEquals(evidence.scene_summary, { active_point_count: 1, total_duration_seconds: 19 });
    // exact suffixed keys (the real plan builder ran) — spot-check, not the full 3-point exhaustive
    // set (already covered by b1_video_kinetic_test.ts).
    assertEquals(evidence.modifications_used['HookHeadline.text'], 'Hook headline');
    assertEquals(evidence.modifications_used['Logo.source'], DEFAULT_PP_LOGO_URL);
    assertEquals(evidence.modifications_used['Background.fill_color'], DEFAULT_PP_PRIMARY_COLOUR);
    assertEquals(evidence.modifications_used['duration'], 19);
  }
});

Deno.test('fireKineticProofRender: invalid scenes → status failed, error names the gate, no Creatomate call attempted', async () => {
  let submitCalled = false;
  const spySubmit = (..._args: any[]) => { submitCalled = true; return mockSubmitOk(_args[0], _args[1], _args[2]); };
  const evidence = await fireKineticProofRender({
    scenes: [{ type: 'point', headline: 'no hook first', body: null, duration_s: 8 }] as KineticScene[],
    providerTemplateId: DEFAULT_PROVIDER_TEMPLATE_ID, logoUrl: DEFAULT_PP_LOGO_URL,
    primaryColour: DEFAULT_PP_PRIMARY_COLOUR, secondaryColour: DEFAULT_PP_SECONDARY_COLOUR,
    clientName: 'Property Pulse', creatomateKey: CREATOMATE_KEY,
    submitAndPollFn: spySubmit as any,
  });
  assertEquals(evidence.status, 'failed');
  if (evidence.status === 'failed') {
    assert(evidence.error.includes('missing_or_invalid_scenes'));
    assertEquals(evidence.modifications_used, null);
  }
  assertEquals(submitCalled, false, 'a gate failure must never reach the Creatomate call');
});

Deno.test('fireKineticProofRender: Creatomate submit throws → status failed, modifications_used still captured (plan succeeded, render did not)', async () => {
  const scenes: KineticScene[] = [
    { type: 'hook', headline: 'H', body: null, duration_s: 6 },
    { type: 'point', headline: 'P', body: null, duration_s: 8 },
    { type: 'cta', headline: 'C', body: null, duration_s: 5 },
  ];
  const evidence = await fireKineticProofRender({
    scenes, providerTemplateId: DEFAULT_PROVIDER_TEMPLATE_ID, logoUrl: DEFAULT_PP_LOGO_URL,
    primaryColour: DEFAULT_PP_PRIMARY_COLOUR, secondaryColour: DEFAULT_PP_SECONDARY_COLOUR,
    clientName: 'Property Pulse', creatomateKey: CREATOMATE_KEY,
    submitAndPollFn: mockSubmitFails as any,
  });
  assertEquals(evidence.status, 'failed');
  if (evidence.status === 'failed') {
    assert(evidence.error.includes('Creatomate submit 500'));
    assert(evidence.modifications_used !== null, 'plan-building succeeded before the render call failed');
    assertEquals(evidence.modifications_used?.['HookHeadline.text'], 'H');
  }
});

Deno.test('fireKineticProofRender: missing Logo.source in the manual selector shape → fails loud (no client-name fallback, matches the governed contract)', async () => {
  const scenes: KineticScene[] = [
    { type: 'hook', headline: 'H', body: null, duration_s: 6 },
    { type: 'point', headline: 'P', body: null, duration_s: 8 },
    { type: 'cta', headline: 'C', body: null, duration_s: 5 },
  ];
  const evidence = await fireKineticProofRender({
    scenes, providerTemplateId: DEFAULT_PROVIDER_TEMPLATE_ID, logoUrl: '   ',  // blank
    primaryColour: DEFAULT_PP_PRIMARY_COLOUR, secondaryColour: DEFAULT_PP_SECONDARY_COLOUR,
    clientName: 'Property Pulse', creatomateKey: CREATOMATE_KEY,
    submitAndPollFn: mockSubmitOk as any,
  });
  assertEquals(evidence.status, 'failed');
  if (evidence.status === 'failed') assert(evidence.error.includes('tmr_video_slot_resolution_incomplete'));
});

// ── no-DB-write structural guarantee (a static grep-style check, not a live assertion) ────────────
Deno.test('structural: the harness module source contains no Supabase client / DB-write call', async () => {
  const src = await Deno.readTextFile(new URL('./ws4-d4-kinetic-proof-render.ts', import.meta.url));
  assert(!src.includes('createClient('), 'must never construct a Supabase client itself');
  assert(!src.includes('.rpc('), 'must never call an RPC (write or otherwise) itself');
  assert(!src.includes("from('post_draft')"), 'must never touch m.post_draft');
  assert(!src.includes('creative_template_proof_event'), 'must never touch the proof-event table');
});
