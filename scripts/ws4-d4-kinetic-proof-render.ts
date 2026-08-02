#!/usr/bin/env -S deno run --allow-net --allow-env
// scripts/ws4-d4-kinetic-proof-render.ts
//
// WS-4/WS-5 D4 — OUT-OF-BAND kinetic proof-render harness.
//
// WHY THIS EXISTS (PK decision, 2026-08-01): db-rls-auditor found that
// c.client_creative_governance.enabled ONLY gates video-worker's renderGovernedVideoKinetic branch —
// it does NOT gate public.select_template's normal eligibility path, which the live S9 production
// cron (m.fill_pending_slots) reads every 10 minutes. The moment ANY future migration promotes the
// kinetic template's registry status + adds an assignment-scoped proof event far enough for
// select_template to succeed, the self-healing cron starts auto-filling REAL production PP YouTube
// kinetic slots — independent of the governance flag. So the untested render code path needs a
// human-observed proof BEFORE any such registry promotion, via a render that is genuinely OUT OF
// BAND: it bypasses public.select_template / public.classify_format_capability's shared global
// eligibility state entirely (a hand-supplied provider_template_id, no registry read at all).
//
// THREE CLEANLY SEPARATED CONCERNS (the orchestrator, not this build step, executes this live):
//   1. Script generation  — generateKineticScriptViaAiWorker / generateKineticScriptViaAnthropicDirect
//   2. Plan + render fire — buildManualSelectorResponse + fireKineticProofRender (reuses the REAL
//                            buildGovernedVideoKineticPlan + submitAndPollCreatomateRender — the
//                            actual production plan-building + Creatomate-calling code, imported, not
//                            duplicated — WITHOUT ever calling select_template)
//   3. Evidence output     — printEvidence / main() — NO DB writes anywhere in this file. The result is
//                            printed as JSON; the orchestrator performs any DB write (proof_event, etc.)
//                            as its own separate, reviewable step, AFTER PK's visual confirmation.
//
// ⚠ NAMED GAP (found while building this harness, not silently resolved) — ai-worker's real, deployed
// HTTP endpoint (app.post('*', ...), ai-worker/index.ts:1339+) is a JOB-QUEUE CONSUMER: it locks real
// pending f.ai_processing_job rows (via the RPC ai_worker_lock_jobs_v1 — a LIVE DB WRITE baked into
// ai-worker's own code, outside this harness's control) and, for a video-format job, generates the
// video_script and writes it DIRECTLY to m.post_draft via the RPC set_draft_video_script
// (ai-worker/index.ts:1980) — the HTTP RESPONSE never carries the scene content, only a boolean
// video_script_generated flag per job (ai-worker/index.ts:1990). "Call ai-worker over HTTPS and get a
// scene array back" is therefore not something ai-worker's real contract can do in ONE call: a real
// proof render via the queue path needs (a) a real kinetic-format job already queued for ai-worker to
// pick up — this harness does NOT seed one, that is a live DB write outside its scope — and (b) a
// SEPARATE read-only lookup of the resulting draft_format.video_script.scenes, which this harness
// does not perform itself (no default DB client) — the caller must inject a readBackFn.
// generateKineticScriptViaAnthropicDirect is offered as a documented, SAFER, single-call alternative:
// it calls Anthropic directly with the EXACT kinetic system/user prompt strings copied verbatim from
// ai-worker/index.ts:728-729 (cited, not invented) — genuinely real AI-authored content, in one HTTP
// call, that never mutates ai-worker's live job queue. Neither strategy is silently chosen for the
// orchestrator — both are implemented, named, and the CLI's --strategy flag picks explicitly.

import {
  buildGovernedVideoKineticPlan,
  assertKineticScenesWithinGate,
  type KineticScene,
  type TmrSelectorResponse,
} from '../supabase/functions/video-worker/b1_video_kinetic.ts';
import {
  submitAndPollCreatomateRender,
} from '../supabase/functions/video-worker/creatomate_submit.ts';

// ── verbatim citation of ai-worker's real kinetic prompt (ai-worker/index.ts:728-729, v2.25.0) ────
// Copied, NOT modified — used only by generateKineticScriptViaAnthropicDirect below. If ai-worker's
// prompt ever changes, this citation goes stale; it is not re-derived at runtime (ai-worker's prompt
// builder is a private, unexported function — importing index.ts would trigger its own module's
// side effects, e.g. ai-worker's app.fetch listener setup).
export function kineticSystemPrompt(clientName: string, vertical: string): string {
  return `You are a YouTube Shorts script writer for ${clientName}, a ${vertical} sector social media presence.\n\nYour task: take a social media post and convert it into a tight kinetic text video script.\n\nRules:\n- Produce exactly 3-5 scenes: one hook (first), one to three point scenes (middle), one cta (last)\n- hook: headline max 60 chars, no body, duration_s 5-7\n- point: headline max 55 chars, body max 100 chars (one supporting line), duration_s 6-9\n- cta: headline max 65 chars (engagement question), no body, duration_s 4-6\n- Total video: 25-40 seconds\n- narration_text: natural spoken version of all scenes in sequence (~60-80 words)\n- Headlines must be punchy standalone statements — someone reading them in 1 second must get the point\n- Body text provides the single most credible supporting fact or stat\n\nReturn ONLY valid JSON:\n{\n  \"format\": \"kinetic_text\",\n  \"scenes\": [\n    {\"type\": \"hook\", \"headline\": string, \"body\": null, \"duration_s\": number},\n    {\"type\": \"point\", \"headline\": string, \"body\": string, \"duration_s\": number},\n    {\"type\": \"cta\", \"headline\": string, \"body\": null, \"duration_s\": number}\n  ],\n  \"total_duration_s\": number,\n  \"narration_text\": string\n}`;
}
export function kineticUserPrompt(postTitle: string, postBody: string): string {
  return `Post title: ${postTitle || '(none)'}\n\nPost body:\n${postBody.slice(0, 1000)}\n\nGenerate the video script.`;
}

export type KineticGenerationResult = {
  scenes: KineticScene[];
  narration_text: string | null;
  total_duration_s: number | null;
  source: 'ai_worker_http' | 'anthropic_direct' | 'mock';
  raw: unknown;
};

// ── Strategy 1 (most literal reading of the instruction — "call the real, already-deployed ai-worker
// edge function over HTTPS"). See the NAMED GAP note above: this genuinely calls ai-worker's real
// endpoint, but ai-worker's response never carries the scene content — readBackFn (caller-injected,
// read-only) is REQUIRED to fetch it back from m.post_draft after ai-worker's RPC write completes.
// This harness performs NO DB write or read of its own; readBackFn is entirely the caller's/
// orchestrator's responsibility to supply (or the whole call fails loud rather than guessing).
export async function generateKineticScriptViaAiWorker(opts: {
  aiWorkerUrl: string;
  aiWorkerKey: string;
  workerId?: string;
  fetchImpl?: typeof fetch;
  readBackFn?: (postDraftId: string) => Promise<{ scenes: KineticScene[]; narration_text?: string | null; total_duration_s?: number | null } | null>;
}): Promise<KineticGenerationResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const resp = await fetchFn(opts.aiWorkerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-ai-worker-key': opts.aiWorkerKey },
    body: JSON.stringify({ limit: 1, worker_id: opts.workerId ?? 'ws4-d4-kinetic-proof' }),
  });
  if (!resp.ok) throw new Error(`ai_worker_http_${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  const hit = results.find((r: any) => r?.video_script_generated === true);
  if (!hit) {
    throw new Error(`ai_worker_no_video_script_generated: locked=${data?.locked ?? 0} processed=${data?.processed ?? 0} results=${JSON.stringify(results)} — a real kinetic-format job must already be queued for ai-worker to pick up; this harness does not seed one`);
  }
  if (!opts.readBackFn) {
    throw new Error(`ai_worker_readback_required: ai-worker never returns video_script/scenes over HTTP (writes via set_draft_video_script RPC) — supply readBackFn to read m.post_draft.draft_format.video_script for post_draft_id=${hit.post_draft_id}`);
  }
  const readBack = await opts.readBackFn(hit.post_draft_id);
  if (!readBack || !Array.isArray(readBack.scenes) || readBack.scenes.length === 0) {
    throw new Error(`ai_worker_readback_empty: post_draft_id=${hit.post_draft_id}`);
  }
  return {
    scenes: readBack.scenes,
    narration_text: readBack.narration_text ?? null,
    total_duration_s: readBack.total_duration_s ?? null,
    source: 'ai_worker_http',
    raw: { job_result: hit, read_back: readBack },
  };
}

// ── Strategy 2 (documented, safer alternative — a genuine single-call HTTP round trip that returns
// real AI-authored content without touching ai-worker's live job queue). Calls Anthropic directly
// with the VERBATIM kinetic prompt (kineticSystemPrompt/kineticUserPrompt above), parses the response
// EXACTLY as generateVideoScript does (ai-worker/index.ts:736-745: strip ```json fences, JSON.parse,
// require scenes.length >= 3, recompute total_duration_s as the scene-duration sum).
export async function generateKineticScriptViaAnthropicDirect(opts: {
  anthropicKey: string;
  postTitle: string;
  postBody: string;
  clientName: string;
  vertical: string;
  fetchImpl?: typeof fetch;
}): Promise<KineticGenerationResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const resp = await fetchFn('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': opts.anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', max_tokens: 700, temperature: 0.25,
      system: kineticSystemPrompt(opts.clientName, opts.vertical),
      messages: [{ role: 'user', content: kineticUserPrompt(opts.postTitle, opts.postBody) }],
    }),
  });
  if (!resp.ok) throw new Error(`anthropic_http_${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const raw = data?.content?.[0]?.text ?? '';
  const cleaned = String(raw).replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`anthropic_kinetic_parse_failed: ${cleaned.slice(0, 300)}`);
  }
  if (!Array.isArray(parsed?.scenes) || parsed.scenes.length < 3) {
    throw new Error(`anthropic_kinetic_invalid_scenes: ${JSON.stringify(parsed)}`);
  }
  const totalDuration = parsed.scenes.reduce((s: number, sc: any) => s + Number(sc.duration_s ?? 7), 0);
  return {
    scenes: parsed.scenes as KineticScene[],
    narration_text: parsed.narration_text ?? null,
    total_duration_s: totalDuration,
    source: 'anthropic_direct',
    raw: parsed,
  };
}

// ── Concern 2: plan construction + render firing ──────────────────────────────────────────────────

// A synthetic, hand-built TmrSelectorResponse shape — NOT a live public.select_template call.
// buildGovernedVideoKineticPlan only ever reads the fields on this object; it has no way to tell this
// apart from a real selector response, which is exactly the point (the plan-building code under test
// is EXERCISED FOR REAL, only its data source is swapped for a hand-supplied one).
export function buildManualSelectorResponse(opts: {
  providerTemplateId: string;
  logoUrl: string;
  seed?: string;
}): TmrSelectorResponse {
  return {
    status: 'ok',
    context: { seed: opts.seed ?? 'ws4-d4-manual-proof-render' },
    selected: {
      provider_template_id: opts.providerTemplateId,
      provider_template_name: 'generic_kinetic_text_9x16_v1 (MANUAL PROOF RENDER — select_template BYPASSED)',
      variant_key: 'kinetic-typography-9x16-video-v1',
      format_key: 'video_short_kinetic',
      aspect_ratio: '9:16',
      assignment_status: 'manual_out_of_band_proof',
      reasons: ['manual_proof_render_hand_supplied'],
    },
    slot_resolution: {
      status: 'ok',
      modifications: { 'Logo.source': opts.logoUrl },
      selected: [{ slot: 'Logo', asset_key: 'pp_logo_primary_manual', asset_url: opts.logoUrl, reasons: ['manual_proof_render_hand_supplied'] }],
      rejected: [],
      warnings: ['MANUAL_PROOF_RENDER: select_template BYPASSED — synthetic selector-response shape, not a live resolver result'],
      fail_reason: null,
      context: {},
    },
    warnings: ['MANUAL_PROOF_RENDER: select_template/classify_format_capability BYPASSED entirely'],
    rejected: [],
    alternatives: [],
    fail_reason: null,
  };
}

export type ProofRenderEvidence =
  | {
      status: 'succeeded';
      provider_render_id: string;
      output_video_url: string;
      wall_clock_ms: number;
      credits_used: number | null;
      modifications_used: Record<string, string | number>;
      provider_template_id_used: string;
      scene_summary: { active_point_count: number; total_duration_seconds: number };
      bypassed_select_template: true;
    }
  | {
      status: 'failed';
      error: string;
      wall_clock_ms: number;
      modifications_used: Record<string, string | number> | null;
      provider_template_id_used: string;
      bypassed_select_template: true;
    };

// Fires the ACTUAL production plan-building + Creatomate-calling code (buildGovernedVideoKineticPlan +
// submitAndPollCreatomateRender, imported verbatim from the real modules — not duplicated/forked)
// against a HAND-SUPPLIED provider_template_id/logo/colours, WITHOUT ever calling select_template.
// NO DB writes, NO storage upload, NO write_render_log — evidence only, returned to the caller.
export async function fireKineticProofRender(opts: {
  scenes: KineticScene[];
  providerTemplateId: string;
  logoUrl: string;
  primaryColour: string;
  secondaryColour: string;
  clientName: string;
  creatomateKey: string;
  submitAndPollFn?: typeof submitAndPollCreatomateRender;  // injectable — dry-run supplies a mock
}): Promise<ProofRenderEvidence> {
  const startMs = Date.now();
  let modifications: Record<string, string | number> | null = null;
  try {
    // Re-gate defensively (buildGovernedVideoKineticPlan gates internally too — belt-and-braces, and
    // gives a clean failure BEFORE constructing the synthetic selector response).
    assertKineticScenesWithinGate(opts.scenes);
    const selectorResponse = buildManualSelectorResponse({
      providerTemplateId: opts.providerTemplateId, logoUrl: opts.logoUrl,
    });
    const plan = buildGovernedVideoKineticPlan(selectorResponse, opts.scenes, {
      primaryColour: opts.primaryColour, secondaryColour: opts.secondaryColour, clientName: opts.clientName,
    });
    modifications = plan.modifications;
    const renderScript = { template_id: plan.providerTemplateId, modifications: plan.modifications, output_format: 'mp4' };
    const submitFn = opts.submitAndPollFn ?? submitAndPollCreatomateRender;
    const result = await submitFn(renderScript, opts.creatomateKey, startMs);
    return {
      status: 'succeeded',
      provider_render_id: result.renderId,
      output_video_url: result.url,
      wall_clock_ms: result.durationMs,
      credits_used: result.creditsUsed,
      modifications_used: plan.modifications,
      provider_template_id_used: opts.providerTemplateId,
      scene_summary: plan.templateSpec.tmr.scene_summary,
      bypassed_select_template: true,
    };
  } catch (e: any) {
    return {
      status: 'failed',
      error: (e?.message ?? String(e)).slice(0, 2000),
      wall_clock_ms: Date.now() - startMs,
      modifications_used: modifications,
      provider_template_id_used: opts.providerTemplateId,
      bypassed_select_template: true,
    };
  }
}

// ── Concern 3: CLI / evidence output only — no DB writes anywhere in this file ────────────────────

// Documented fallback constants (the SAME values getBrand() in video-worker/index.ts:944-960 falls
// back to when c.client_brand_profile has no row / null columns — NOT independently re-verified
// against PP's live client_brand_profile row by this build step, since that would be a live DB read
// this harness is not making). Override via CLI flags/env for a real run if PP's live values differ.
export const DEFAULT_PP_PRIMARY_COLOUR = '#0A2A4A';
export const DEFAULT_PP_SECONDARY_COLOUR = '#1C8A8A';
// "Verified serving" per docs/briefs/ws4-kinetic-transposition-operator-guide-v1.md's own note (the
// real project-ref host, not the `x.supabase.co` placeholder used elsewhere in that document set).
export const DEFAULT_PP_LOGO_URL = 'https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png';
export const DEFAULT_PP_CLIENT_NAME = 'Property Pulse';
export const DEFAULT_PROVIDER_TEMPLATE_ID = '0bd871ae-79c1-431a-a7bd-9f631a6cf75a';  // per the coordinator's instruction — the WS-5-captured Creatomate template UUID

function parseArgs(args: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith('--')) { out[key] = next; i++; } else { out[key] = true; }
  }
  return out;
}

// Fixture used by --dry-run and the mock strategy — a realistic 3-point kinetic script, matching
// generateVideoScript's real output shape (ai-worker/index.ts:728's declared JSON contract).
function mockKineticGeneration(): KineticGenerationResult {
  return {
    source: 'mock',
    narration_text: 'Perth rents just hit a 10-year high. Median asking rent is $650 a week, up 9% on last year. Vacancy sits at just 0.8%, so tenants are competing for every listing. And new listings are down 12% on last spring. Thinking of listing this spring? Follow Property Pulse for more.',
    total_duration_s: 35,
    scenes: [
      { type: 'hook', headline: 'Perth rents just hit a 10-year high', body: null, duration_s: 6 },
      { type: 'point', headline: 'Median asking rent: $650/week', body: 'Up 9% since this time last year', duration_s: 8 },
      { type: 'point', headline: 'Vacancy rate sits at just 0.8%', body: 'Tenants are competing for every listing', duration_s: 8 },
      { type: 'point', headline: 'New listings are down 12% on last spring', body: 'Sellers who list early face less competition', duration_s: 8 },
      { type: 'cta', headline: 'Thinking of listing this spring?', body: null, duration_s: 5 },
    ],
    raw: { mock: true },
  };
}

// Mock submitAndPollCreatomateRender — used only by --dry-run, never fires a real Creatomate call.
function mockSubmitAndPoll(_renderScript: object, _key: string, startMs?: number) {
  return Promise.resolve({
    renderId: 'MOCK-RENDER-ID-00000000-0000-0000-0000-000000000000',
    url: 'https://mock.example.test/renders/mock-output.mp4',
    creditsUsed: 0,
    durationMs: Date.now() - (startMs ?? Date.now()),
  });
}

async function main() {
  const args = parseArgs(Deno.args);
  const dryRun = args['dry-run'] === true || args['dry-run'] === 'true';
  const strategy = (args['strategy'] as string) ?? (dryRun ? 'mock' : 'anthropic-direct');

  const providerTemplateId = (args['template-id'] as string) ?? DEFAULT_PROVIDER_TEMPLATE_ID;
  const logoUrl = (args['logo-url'] as string) ?? DEFAULT_PP_LOGO_URL;
  const primaryColour = (args['primary-colour'] as string) ?? DEFAULT_PP_PRIMARY_COLOUR;
  const secondaryColour = (args['secondary-colour'] as string) ?? DEFAULT_PP_SECONDARY_COLOUR;
  const clientName = (args['client-name'] as string) ?? DEFAULT_PP_CLIENT_NAME;
  const postTitle = (args['post-title'] as string) ?? 'Perth rental market update';
  const postBody = (args['post-body'] as string) ?? 'Perth rents have hit a 10-year high, with vacancy under 1% and new listings down sharply on last spring.';
  const vertical = (args['vertical'] as string) ?? 'real estate';

  let generation: KineticGenerationResult;
  if (dryRun || strategy === 'mock') {
    generation = mockKineticGeneration();
    console.log('[ws4-d4-kinetic-proof-render] DRY-RUN / mock strategy — no live network call for script generation.');
  } else if (strategy === 'anthropic-direct') {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not set (required for --strategy anthropic-direct)');
    generation = await generateKineticScriptViaAnthropicDirect({ anthropicKey, postTitle, postBody, clientName, vertical });
  } else if (strategy === 'ai-worker') {
    const aiWorkerUrl = Deno.env.get('AI_WORKER_URL');
    const aiWorkerKey = Deno.env.get('AI_WORKER_API_KEY');
    if (!aiWorkerUrl || !aiWorkerKey) throw new Error('AI_WORKER_URL and AI_WORKER_API_KEY must be set (required for --strategy ai-worker)');
    throw new Error('strategy=ai-worker requires a readBackFn (a real, orchestrator-supplied read of m.post_draft.draft_format.video_script) — not wired in this CLI entrypoint; call generateKineticScriptViaAiWorker(...) directly with readBackFn supplied, per the NAMED GAP note at the top of this file.');
  } else {
    throw new Error(`unknown --strategy '${strategy}' (expected mock | anthropic-direct | ai-worker)`);
  }

  console.log('[ws4-d4-kinetic-proof-render] scenes generated:', JSON.stringify(generation.scenes, null, 2));

  const creatomateKey = dryRun ? 'DRY-RUN-UNUSED-KEY' : Deno.env.get('CREATOMATE_API_KEY');
  if (!creatomateKey) throw new Error('CREATOMATE_API_KEY not set');

  const evidence = await fireKineticProofRender({
    scenes: generation.scenes,
    providerTemplateId, logoUrl, primaryColour, secondaryColour, clientName,
    creatomateKey,
    submitAndPollFn: dryRun ? (mockSubmitAndPoll as typeof submitAndPollCreatomateRender) : undefined,
  });

  console.log('[ws4-d4-kinetic-proof-render] EVIDENCE (no DB write performed by this script):');
  console.log(JSON.stringify(evidence, null, 2));

  if (evidence.status === 'failed') Deno.exit(1);
}

if (import.meta.main) {
  main().catch((e) => { console.error('[ws4-d4-kinetic-proof-render] fatal:', e?.message ?? e); Deno.exit(1); });
}
