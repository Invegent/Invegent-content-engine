// mcp-chatgpt-bridge — MCP server (Streamable HTTP, JSON-RPC 2.0)
// Exposes one tool: ask_chatgpt_review(proposal, context, action_type)
//
// MCP_BRIDGE_BEARER_TOKEN → claude.ai → bridge inbound auth
// INTERNAL_WORKER_TOKEN   → bridge → chatgpt-review-worker auth
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY → DB writes to m.chatgpt_review (auto-injected by Supabase EF runtime)
//
// Per docs/briefs/chatgpt-review-mcp-v1.md (v1.1)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encodeHex } from 'https://deno.land/std@0.224.0/encoding/hex.ts';

const BRIDGE_TOKEN = Deno.env.get('MCP_BRIDGE_BEARER_TOKEN')!;
const INTERNAL_TOKEN = Deno.env.get('INTERNAL_WORKER_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WORKER_URL = `${SUPABASE_URL}/functions/v1/chatgpt-review-worker`;
const MAX_CONTEXT_BYTES = 50_000;
const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'mcp-chatgpt-bridge', version: '1.0.0' };

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Stable JSON serialiser with sorted keys (deterministic for hashing)
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return '{' + entries.map(([k, v]) => JSON.stringify(k) + ':' + canonicalJson(v)).join(',') + '}';
  }
  return 'null';
}

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return encodeHex(new Uint8Array(buf));
}

function utcDateBucket(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

interface ReviewResult {
  verdict: 'agree' | 'disagree' | 'partial';
  risk_level: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  corrected_action: string;
  requires_pk_escalation: boolean;
  escalation_reason: string;
  pushback_points: string[];
  verified_claims: string[];
  unverified_claims: string[];
  assumptions: string[];
}

type RoutingDecision =
  | 'proceed' | 'apply_corrected'
  | 'escalate_disagree' | 'escalate_high_risk' | 'escalate_low_confidence'
  | 'escalate_explicit_flag' | 'escalate_partial_no_correction'
  | 'escalate_schema_invalid' | 'escalate_timeout' | 'escalate_refusal';

interface RoutingOutcome {
  decision: RoutingDecision;
  escalate: boolean;
  reason: string;
}

function routeReview(r: ReviewResult | null, error?: string): RoutingOutcome {
  if (error === 'schema_invalid') return { decision: 'escalate_schema_invalid', escalate: true, reason: 'ChatGPT response did not match schema' };
  if (error === 'timeout')        return { decision: 'escalate_timeout', escalate: true, reason: 'ChatGPT call timed out' };
  if (error === 'empty_output')   return { decision: 'escalate_refusal', escalate: true, reason: 'ChatGPT returned empty output' };
  if (error)                      return { decision: 'escalate_refusal', escalate: true, reason: `Worker error: ${error}` };
  if (!r)                         return { decision: 'escalate_refusal', escalate: true, reason: 'No review parsed' };

  if (r.requires_pk_escalation) return { decision: 'escalate_explicit_flag', escalate: true, reason: r.escalation_reason || 'Reviewer requested escalation' };
  if (r.verdict === 'disagree') return { decision: 'escalate_disagree', escalate: true, reason: 'Reviewer disagrees with proposal' };
  if (r.risk_level === 'high')  return { decision: 'escalate_high_risk', escalate: true, reason: 'High risk level — human approval required' };
  if (r.confidence === 'low')   return { decision: 'escalate_low_confidence', escalate: true, reason: 'Reviewer has low confidence in own review' };

  if (r.verdict === 'partial') {
    if (!r.corrected_action || r.corrected_action.trim().length === 0) {
      return { decision: 'escalate_partial_no_correction', escalate: true, reason: 'Partial verdict without corrected_action' };
    }
    return { decision: 'apply_corrected', escalate: false, reason: 'Reviewer suggests correction; safe to apply' };
  }

  return { decision: 'proceed', escalate: false, reason: 'Reviewer agrees; safe to proceed' };
}

const TOOL_DEFINITION = {
  name: 'ask_chatgpt_review',
  description: 'Cross-check a Claude proposal with ChatGPT (gpt-4o-mini) before executing it. Returns a structured review with verdict, risk_level, confidence, and a backend-determined routing decision. The bridge auto-escalates to PK on disagree, high risk, low confidence, refusal, timeout, or partial-without-correction. Claude should call this BEFORE any destructive action (production SQL DML/DDL, EF deploys, config changes affecting clients) and BEFORE any plan that involves multiple coordinated steps. Idempotent within a UTC day on identical inputs (no double-charge).',
  inputSchema: {
    type: 'object',
    properties: {
      proposal: {
        type: 'string',
        description: 'Full prose description of what Claude is about to do. Be specific. Include the exact SQL / config change / file edit being proposed.'
      },
      context: {
        type: 'object',
        description: 'Structured context: SQL queries Claude has already run + their results, files Claude has read, evidence Claude has gathered, relevant constraints. Will be canonicalised + hashed for idempotency. Truncated at 50KB.'
      },
      action_type: {
        type: 'string',
        enum: ['sql_destructive', 'sql_read', 'ef_deploy', 'config_change', 'plan_review', 'finding_classification', 'other'],
        description: 'Category of action being proposed.'
      }
    },
    required: ['proposal', 'context', 'action_type']
  }
};

async function handleToolCall(args: any) {
  const t0 = Date.now();
  const proposal = String(args?.proposal ?? '');
  const action_type = String(args?.action_type ?? 'other');
  let context: Record<string, unknown> = (args?.context && typeof args.context === 'object') ? args.context : {};

  // Truncate context if too large
  let truncated = false;
  let contextJson = canonicalJson(context);
  if (contextJson.length > MAX_CONTEXT_BYTES) {
    truncated = true;
    context = {
      _truncated: true,
      _original_size_bytes: contextJson.length,
      summary: contextJson.slice(0, MAX_CONTEXT_BYTES - 200) + '...[TRUNCATED]'
    };
    contextJson = canonicalJson(context);
  }

  const dateBucket = utcDateBucket();
  const context_hash = await sha256Hex(`${action_type}|${proposal}|${contextJson}`);
  const idempotency_key = await sha256Hex(`${action_type}|${proposal}|${contextJson}|${dateBucket}`);

  // Check for prior completed review (idempotency hit)
  const { data: existing } = await supabase
    .schema('m')
    .from('chatgpt_review')
    .select('id, verdict, risk_level, confidence, requires_pk_escalation, escalation_reason, routing_decision, response_jsonb, status')
    .eq('idempotency_key', idempotency_key)
    .neq('status', 'pending')
    .maybeSingle();

  if (existing && existing.routing_decision) {
    return {
      decision: existing.routing_decision,
      escalate: existing.routing_decision.startsWith('escalate_'),
      reason: 'Served from prior review (idempotency hit)',
      review: existing.response_jsonb,
      review_id: existing.id,
      idempotent: true
    };
  }

  // Insert pending row
  const { data: inserted, error: insertErr } = await supabase
    .schema('m')
    .from('chatgpt_review')
    .insert({
      action_type,
      proposal,
      context,
      context_hash,
      idempotency_key,
      model: 'gpt-4o-mini',
      schema_version: 'v1',
      status: 'pending',
      request_jsonb: { truncated, action_type }
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    // Possible race on idempotency_key — re-fetch any row, even pending
    const { data: existing2 } = await supabase
      .schema('m')
      .from('chatgpt_review')
      .select('id, routing_decision, response_jsonb, status')
      .eq('idempotency_key', idempotency_key)
      .maybeSingle();

    if (existing2 && existing2.routing_decision) {
      return {
        decision: existing2.routing_decision,
        escalate: String(existing2.routing_decision).startsWith('escalate_'),
        reason: 'Served from prior review (idempotency race)',
        review: existing2.response_jsonb,
        review_id: existing2.id,
        idempotent: true
      };
    }

    return {
      decision: 'escalate_refusal',
      escalate: true,
      reason: `DB insert failed: ${insertErr?.message ?? 'unknown'}`,
      review: null,
      review_id: existing2?.id ?? null,
      idempotent: false
    };
  }

  const reviewId = inserted.id as string;

  // Call worker
  let workerResp: any = null;
  let workerError: string | undefined;
  try {
    const r = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${INTERNAL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ proposal, context, action_type })
    });
    workerResp = await r.json();
    if (!workerResp?.ok) {
      workerError = workerResp?.error ?? `http_${r.status}`;
    }
  } catch (e) {
    workerError = `fetch_failed: ${String(e)}`;
  }

  const review: ReviewResult | null = workerResp?.review ?? null;
  const routing = routeReview(review, workerError);

  // Update row with results
  const updatePayload: Record<string, unknown> = {
    status: routing.escalate ? 'escalated' : 'completed',
    routing_decision: routing.decision,
    response_id: workerResp?.response_id ?? null,
    response_jsonb: review,
    verdict: review?.verdict ?? null,
    risk_level: review?.risk_level ?? null,
    confidence: review?.confidence ?? null,
    requires_pk_escalation: review?.requires_pk_escalation ?? null,
    escalation_reason: review?.escalation_reason ?? routing.reason,
    input_tokens: workerResp?.input_tokens ?? null,
    output_tokens: workerResp?.output_tokens ?? null,
    latency_ms: workerResp?.latency_ms ?? (Date.now() - t0),
    error_message: workerError ?? null,
    action_taken: routing.decision
  };
  if (routing.escalate) {
    updatePayload.escalated_at = new Date().toISOString();
  }

  const { error: updateErr } = await supabase
    .schema('m')
    .from('chatgpt_review')
    .update(updatePayload)
    .eq('id', reviewId);

  // Even if update fails, return the routing decision (the call happened)
  return {
    decision: routing.decision,
    escalate: routing.escalate,
    reason: routing.reason,
    review,
    review_id: reviewId,
    idempotent: false,
    db_update_error: updateErr?.message ?? null
  };
}

// JSON-RPC dispatcher
async function handleRpc(msg: any): Promise<any | null> {
  const id = msg?.id ?? null;
  const method = msg?.method;
  const params = msg?.params;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO
      }
    };
  }

  if (method === 'notifications/initialized') {
    // Notification — no response
    return null;
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: [TOOL_DEFINITION] }
    };
  }

  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments ?? {};
    if (name !== 'ask_chatgpt_review') {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Unknown tool: ${name}` }
      };
    }
    try {
      const result = await handleToolCall(args);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: false
        }
      };
    } catch (e) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `Tool execution error: ${String(e)}` }],
          isError: true
        }
      };
    }
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` }
  };
}

serve(async (req) => {
  // CORS preflight (claude.ai may probe)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Inbound bearer auth
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${BRIDGE_TOKEN}`) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32000, message: 'Unauthorized' }
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let msg: any;
  try {
    msg = await req.json();
  } catch (e) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: `Parse error: ${String(e)}` }
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const response = await handleRpc(msg);

  if (response === null) {
    // Notification — return 202 Accepted with no body
    return new Response(null, {
      status: 202,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
});
