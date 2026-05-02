// chatgpt-review-worker — calls OpenAI Responses API with strict json_schema
// OPENAI_REVIEW_API_KEY → OpenAI Project ice-review, key chatgpt-review-worker-v1
// INTERNAL_WORKER_TOKEN → shared secret with mcp-chatgpt-bridge (internal-only EF)
//
// Per docs/briefs/chatgpt-review-mcp-v1.md (v1.1)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const OPENAI_KEY = Deno.env.get('OPENAI_REVIEW_API_KEY')!;
const INTERNAL_TOKEN = Deno.env.get('INTERNAL_WORKER_TOKEN')!;
const MODEL = 'gpt-4o-mini';
const TIMEOUT_MS = 30_000;

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['agree', 'disagree', 'partial'] },
    risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    pushback_points: { type: 'array', items: { type: 'string' } },
    verified_claims: { type: 'array', items: { type: 'string' } },
    unverified_claims: { type: 'array', items: { type: 'string' } },
    assumptions: { type: 'array', items: { type: 'string' } },
    corrected_action: { type: 'string' },
    requires_pk_escalation: { type: 'boolean' },
    escalation_reason: { type: 'string' }
  },
  required: [
    'verdict','risk_level','confidence','pushback_points','verified_claims',
    'unverified_claims','assumptions','corrected_action',
    'requires_pk_escalation','escalation_reason'
  ],
  additionalProperties: false
};

const SYSTEM_PROMPT = `You are an independent reviewer for Parveen Kumar's ICE platform. Claude has proposed an action. Your job is to cross-check it before execution.

Rules:
1. Be skeptical. Identify what Claude has assumed without evidence.
2. Distinguish verified claims (Claude provided evidence) from unverified claims (Claude asserted without evidence).
3. If Claude's proposal is correct, verdict=agree. If wrong, verdict=disagree. If partially right, verdict=partial AND provide corrected_action.
4. risk_level reflects worst-case impact if the proposal is executed wrong: low=reversible+low scope, medium=reversible+wider scope, high=irreversible OR production-affecting OR data-loss-possible.
5. confidence reflects YOUR certainty in your own review, not Claude's certainty in the proposal.
6. Set requires_pk_escalation=true ONLY when something requires human judgment Claude alone shouldn't make: brand voice, client-facing wording, legal/compliance, secrets, irreversible production writes with unclear backfill implications.
7. If verdict=partial, corrected_action MUST be non-empty. Otherwise return empty string.
8. Never fabricate evidence. If you can't verify a claim from what Claude provided, list it under unverified_claims.

Return ONLY JSON matching the schema. No prose.`;

interface WorkerInput {
  proposal: string;
  context: Record<string, unknown>;
  action_type: string;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Internal-only EF: bearer enforced upstream by mcp-chatgpt-bridge
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${INTERNAL_TOKEN}`) {
    return new Response(
      JSON.stringify({ ok: false, error: 'unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: WorkerInput;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json(
      { ok: false, error: 'invalid_json', detail: String(e) },
      { status: 400 }
    );
  }

  const t0 = Date.now();

  const userInput = JSON.stringify({
    action_type: body.action_type,
    proposal: body.proposal,
    context: body.context
  });

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: ac.signal,
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: SYSTEM_PROMPT,
        input: userInput,
        text: {
          format: {
            type: 'json_schema',
            name: 'chatgpt_review_result',
            strict: true,
            schema: REVIEW_SCHEMA
          }
        }
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return Response.json({
        ok: false,
        error: 'openai_error',
        status_code: r.status,
        detail: err.slice(0, 500),
        latency_ms: Date.now() - t0
      }, { status: 502 });
    }

    const data = await r.json();

    // Extract output text — Responses API output shape
    let outputText: string | null = null;
    if (typeof data.output_text === 'string') {
      outputText = data.output_text;
    } else if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item?.type === 'message' && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c?.type === 'output_text' && typeof c.text === 'string') {
              outputText = c.text;
              break;
            }
          }
        }
        if (outputText) break;
      }
    }

    if (!outputText) {
      return Response.json({
        ok: false,
        error: 'empty_output',
        response_id: data.id ?? null,
        latency_ms: Date.now() - t0
      }, { status: 502 });
    }

    let parsed;
    try {
      parsed = JSON.parse(outputText);
    } catch (e) {
      return Response.json({
        ok: false,
        error: 'schema_invalid',
        detail: String(e),
        response_id: data.id ?? null,
        raw: outputText.slice(0, 500),
        latency_ms: Date.now() - t0
      }, { status: 502 });
    }

    return Response.json({
      ok: true,
      review: parsed,
      response_id: data.id ?? null,
      model: MODEL,
      input_tokens: data.usage?.input_tokens ?? null,
      output_tokens: data.usage?.output_tokens ?? null,
      latency_ms: Date.now() - t0
    });

  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return Response.json({
        ok: false,
        error: 'timeout',
        latency_ms: Date.now() - t0
      }, { status: 504 });
    }
    return Response.json({
      ok: false,
      error: 'unexpected',
      detail: String(e),
      latency_ms: Date.now() - t0
    }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
});
