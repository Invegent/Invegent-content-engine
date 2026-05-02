---
brief_id: chatgpt-review-mcp-v1
status: ready
risk_tier: 2
owner: cc
created_by: PK
created: 2026-05-02
default_action: draft_only
allowed_paths:
  - supabase/migrations/**
  - supabase/functions/chatgpt-review-worker/**
  - supabase/functions/mcp-chatgpt-bridge/**
  - docs/runtime/runs/**
  - docs/briefs/queue.md
  - docs/briefs/chatgpt-review-mcp-v1.md
forbidden_actions:
  - apply_migration
  - deploy_edge_function
  - commit_secrets
  - update_production_data
  - close_audit_finding
idempotency_check: "migration_file_absent_AND_ef_dir_absent"
success_output:
  - supabase/migrations/{YYYYMMDDHHMMSS}_chatgpt_review_table.sql
  - supabase/functions/chatgpt-review-worker/index.ts
  - supabase/functions/chatgpt-review-worker/schema.ts
  - supabase/functions/mcp-chatgpt-bridge/index.ts
  - supabase/functions/mcp-chatgpt-bridge/routing.ts
  - docs/runtime/runs/chatgpt-review-mcp-v1-{YYYY-MM-DDTHHMMSSZ}.md
---

# Brief — ChatGPT Review MCP v1

## Goal

Replace the manual Claude → PK → ChatGPT → PK → Claude shuttle with a single MCP tool Claude can call directly. ChatGPT receives the proposal, returns a structured review, and the bridge EF auto-routes based on backend rules. PK is escalated to only when the review verdict materially diverges from Claude's proposal or risk is high.

Empirical case: 1 May early morning UTC session — two ChatGPT cross-checks prevented two wrong-direction production actions (wrong YT trigger fix, wrong bulk-quarantine of 87 legacy FB drafts). Both were caught manually. PK spent ~4 hours shuttling between chat windows. This MCP automates the shuttle.

## Architecture

```
Claude (chat in claude.ai)
  ↓ MCP tool call: ask_chatgpt_review(proposal, context, action_type)
mcp-chatgpt-bridge (Supabase Edge Function)
  ├─ verifies bearer token
  ├─ context_hash idempotency check against m.chatgpt_review
  ├─ inserts pending row
  ├─ calls chatgpt-review-worker internally
  ├─ applies routing rules (backend-enforced, not model-enforced)
  └─ returns routed decision to Claude
chatgpt-review-worker (Supabase Edge Function)
  └─ POST https://api.openai.com/v1/responses
     model: gpt-4o-mini
     text.format.type: json_schema (strict)
```

No tools exposed to ChatGPT in v1. Text in, structured text out. ChatGPT cannot read the database, cannot call GitHub, cannot write anywhere.

## PK setup steps (do before deploy)

1. **OpenAI Platform Project:** sign in at platform.openai.com → Projects → New project named `ice-chatgpt-review`. This is separate from the project ai-worker uses.
2. **Hard spend limit:** Settings → Limits → Hard limit $30/mo, soft alert $20/mo on the new project.
3. **API key:** API keys → Create → assign to `ice-chatgpt-review` project, name it `chatgpt-review-worker-v1`. Copy the `sk-proj-...` value once.
4. **Supabase secret:** from PowerShell in `C:\Users\parve\Invegent-content-engine`:
   ```
   supabase secrets set OPENAI_REVIEW_API_KEY=sk-proj-...
   supabase secrets set MCP_BRIDGE_BEARER_TOKEN=$(openssl rand -hex 32)
   ```
   The bearer token is what claude.ai will send in the Authorization header. Save it locally — it'll be needed for the connector setup.
5. **Smoke test (PK runs before CC deploys EFs):**
   ```
   curl https://api.openai.com/v1/responses \
     -H "Authorization: Bearer $env:OPENAI_REVIEW_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4o-mini","input":"Reply with JSON: {\"ok\": true}","text":{"format":{"type":"json_object"}}}'
   ```
   Confirms key works. `json_object` is fine for smoke test only — production worker uses `json_schema`.

## Build sequence — files CC writes

### File 1 — Migration: `m.chatgpt_review` table

`supabase/migrations/{YYYYMMDDHHMMSS}_chatgpt_review_table.sql`

```sql
create schema if not exists m;

create table m.chatgpt_review (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Provenance
  run_slug text,
  action_type text not null,
  actor text not null default 'claude',
  source text not null default 'claude_mcp',

  -- Request
  proposal text not null,
  context jsonb,
  context_hash text not null,
  request_jsonb jsonb,

  -- OpenAI response provenance
  response_id text,
  model text not null,
  schema_version text not null default 'v1',
  response_jsonb jsonb,

  -- Decoded review fields (denormalised for query speed)
  verdict text,
  risk_level text,
  confidence text,
  requires_pk_escalation boolean,
  escalation_reason text,

  -- Routing decision (backend-determined, not model-determined)
  routing_decision text,
  action_taken text,

  -- Cost + latency
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(10,6),
  latency_ms integer,

  -- Status
  status text not null default 'pending',
  error_message text,

  -- Escalation lifecycle
  escalated_at timestamptz,
  escalation_resolved_at timestamptz,
  resolved_by text,

  -- Constraints
  constraint chatgpt_review_status_check
    check (status in ('pending','completed','failed','escalated','resolved')),
  constraint chatgpt_review_verdict_check
    check (verdict is null or verdict in ('agree','disagree','partial')),
  constraint chatgpt_review_risk_check
    check (risk_level is null or risk_level in ('low','medium','high')),
  constraint chatgpt_review_confidence_check
    check (confidence is null or confidence in ('low','medium','high')),
  constraint chatgpt_review_routing_check
    check (routing_decision is null or routing_decision in (
      'proceed','apply_corrected','escalate_disagree','escalate_high_risk',
      'escalate_low_confidence','escalate_explicit_flag','escalate_partial_no_correction',
      'escalate_schema_invalid','escalate_timeout','escalate_refusal'
    ))
);

-- Idempotency: same proposal + same context shouldn't double-charge OpenAI within 24h
create unique index chatgpt_review_idempotency
  on m.chatgpt_review (context_hash, action_type)
  where created_at > now() - interval '24 hours';

create index chatgpt_review_status_created
  on m.chatgpt_review (status, created_at desc);

create index chatgpt_review_escalated
  on m.chatgpt_review (escalated_at)
  where escalated_at is not null and escalation_resolved_at is null;

comment on table m.chatgpt_review is
  'Canonical audit log of every Claude→ChatGPT cross-check via mcp-chatgpt-bridge. One row per ChatGPT call. Backend-enforced routing decisions captured in routing_decision column.';
```

PK applies via Supabase MCP per D170. CC drafts only.

### File 2 — Worker: `chatgpt-review-worker/schema.ts`

Verbatim Responses API structured output schema. Production uses `json_schema`, not `json_object`.

```typescript
export const REVIEW_SCHEMA = {
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
} as const;

export const REVIEWER_SYSTEM_PROMPT = `You are an independent reviewer for Parveen Kumar's ICE platform. Claude has proposed an action. Your job is to cross-check it before execution.

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
```

### File 3 — Worker: `chatgpt-review-worker/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { REVIEW_SCHEMA, REVIEWER_SYSTEM_PROMPT } from './schema.ts';

const OPENAI_KEY = Deno.env.get('OPENAI_REVIEW_API_KEY')!;
const MODEL = 'gpt-4o-mini';
const TIMEOUT_MS = 30_000;

interface WorkerInput {
  proposal: string;
  context: Record<string, unknown>;
  action_type: string;
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Internal-only EF: bearer enforced upstream by mcp-chatgpt-bridge
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${Deno.env.get('INTERNAL_WORKER_TOKEN')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body: WorkerInput = await req.json();
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
        instructions: REVIEWER_SYSTEM_PROMPT,
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
        ok: false, error: 'openai_error', detail: err.slice(0, 500),
        latency_ms: Date.now() - t0
      }, { status: 502 });
    }

    const data = await r.json();
    const outputText = data.output_text
      ?? data.output?.[0]?.content?.[0]?.text
      ?? null;

    if (!outputText) {
      return Response.json({
        ok: false, error: 'empty_output', response_id: data.id,
        latency_ms: Date.now() - t0
      }, { status: 502 });
    }

    let parsed;
    try { parsed = JSON.parse(outputText); }
    catch (e) {
      return Response.json({
        ok: false, error: 'schema_invalid', detail: String(e),
        response_id: data.id, raw: outputText.slice(0, 500),
        latency_ms: Date.now() - t0
      }, { status: 502 });
    }

    return Response.json({
      ok: true,
      review: parsed,
      response_id: data.id,
      model: MODEL,
      input_tokens: data.usage?.input_tokens ?? null,
      output_tokens: data.usage?.output_tokens ?? null,
      latency_ms: Date.now() - t0
    });

  } catch (e: any) {
    if (e.name === 'AbortError') {
      return Response.json({
        ok: false, error: 'timeout', latency_ms: Date.now() - t0
      }, { status: 504 });
    }
    return Response.json({
      ok: false, error: 'unexpected', detail: String(e),
      latency_ms: Date.now() - t0
    }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
});
```

### File 4 — Bridge: `mcp-chatgpt-bridge/routing.ts`

**Backend-enforced routing.** Model recommends; EF decides.

```typescript
export interface ReviewResult {
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

export interface RoutingOutcome {
  decision:
    | 'proceed'
    | 'apply_corrected'
    | 'escalate_disagree'
    | 'escalate_high_risk'
    | 'escalate_low_confidence'
    | 'escalate_explicit_flag'
    | 'escalate_partial_no_correction'
    | 'escalate_schema_invalid'
    | 'escalate_timeout'
    | 'escalate_refusal';
  escalate: boolean;
  reason: string;
}

export function routeReview(r: ReviewResult | null, error?: string): RoutingOutcome {
  if (error === 'schema_invalid') return { decision: 'escalate_schema_invalid', escalate: true, reason: 'ChatGPT response did not match schema' };
  if (error === 'timeout')         return { decision: 'escalate_timeout', escalate: true, reason: 'ChatGPT call timed out' };
  if (error === 'empty_output')    return { decision: 'escalate_refusal', escalate: true, reason: 'ChatGPT returned empty output' };
  if (!r)                          return { decision: 'escalate_refusal', escalate: true, reason: 'No review parsed' };

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

  // verdict=agree, risk=low|medium, confidence=medium|high, no flag
  return { decision: 'proceed', escalate: false, reason: 'Reviewer agrees; safe to proceed' };
}
```

### File 5 — Bridge: `mcp-chatgpt-bridge/index.ts`

MCP protocol layer. Implements one tool: `ask_chatgpt_review`. Bearer auth on inbound; context_hash idempotency; logs every call to `m.chatgpt_review`.

Key responsibilities (CC fills in details):
- Implement MCP HTTP/SSE server protocol per spec at https://spec.modelcontextprotocol.io/
- Validate inbound bearer token equals `MCP_BRIDGE_BEARER_TOKEN` env var
- Compute `context_hash = sha256(action_type + proposal + canonicalised_context_json)`
- INSERT row into `m.chatgpt_review` with `status='pending'`. If unique-violation on `context_hash + action_type` within 24h, return the prior row's routing decision (idempotency)
- Call `chatgpt-review-worker` EF internally with `INTERNAL_WORKER_TOKEN`
- Apply `routeReview()` from routing.ts
- UPDATE the row with verdict, risk, confidence, routing_decision, action_taken, costs, latency, status
- If `escalate=true`, also UPDATE `escalated_at = now()` and `status='escalated'`
- Return MCP-shaped response to Claude with: `{decision, escalate, reason, review (full), review_id (DB row uuid)}`

## Tool surface exposed to Claude

One tool only:

```
ask_chatgpt_review(
  proposal: string,        // What Claude is about to do, in full prose
  context: object,         // Structured context: SQL queries Claude ran, files Claude read,
                           // evidence Claude has, relevant constraints
  action_type: string      // 'sql_destructive' | 'sql_read' | 'ef_deploy' | 'config_change' |
                           //   'plan_review' | 'finding_classification' | 'other'
) → {
  decision: 'proceed' | 'apply_corrected' | 'escalate_*',
  escalate: boolean,
  reason: string,
  review: ReviewResult,    // full schema response from ChatGPT
  review_id: uuid          // m.chatgpt_review row id for trace-back
}
```

## Smoke test plan (after deploy)

Three test cases CC writes as bash scripts in `supabase/functions/mcp-chatgpt-bridge/test/`:

1. **Agree-low** — propose a safe SELECT-only query review. Expect `decision=proceed, escalate=false`.
2. **Disagree-known** — replay last night's bulk-quarantine proposal verbatim. Expect `decision=escalate_disagree`. This is the regression test for the cross-check working.
3. **Schema-invalid simulation** — inject malformed model output via a feature flag. Expect `decision=escalate_schema_invalid`.

PK runs all three after deploy. Expected total cost: <$0.05.

## Acceptance criteria

1. Migration file exists in `supabase/migrations/`, applies cleanly via `apply_migration`, table exists in `m.chatgpt_review` with all columns + constraints + indexes.
2. Both EF directories exist with index.ts + supporting files. Both deploy via `supabase functions deploy` without errors.
3. Three smoke tests pass.
4. Bridge URL added to claude.ai custom connectors with bearer token. Tool `ask_chatgpt_review` appears in Claude's tool list.
5. End-to-end test: Claude calls `ask_chatgpt_review` with a real ICE audit proposal. Row appears in `m.chatgpt_review`. Routing decision matches expectation.

## Out of scope for v1

- ChatGPT calling GitHub, Supabase, or any other tools. Pure text-in / text-out.
- Stateful multi-turn ChatGPT threads (`previous_response_id`). Each call is independent.
- Per-tool variants (`ask_chatgpt_code_review`, `ask_chatgpt_audit_review`, etc.). One generic tool. Specialise later if needed.
- Auto-resolve of escalations. PK manually clears `escalation_resolved_at` for now.
- Markdown logging to `docs/audit/runs/chatgpt-reviews/`. DB is canonical in v1; markdown digest is a v2 add.
- Model upgrade to gpt-4o. Pilot stays on gpt-4o-mini; benchmark sample of 10–20 reviews against gpt-4o once 50+ reviews accumulated.

## Known checks before deploy

1. **Claude.ai custom connector auth model.** Confirm whether bearer-token works cleanly for self-hosted MCP servers in claude.ai consumer interface, or if OAuth wrapper is required. If OAuth needed, swap bridge auth middleware in a follow-up commit; business logic unaffected.
2. **MCP HTTP/SSE spec compliance.** Bridge must implement the MCP server protocol correctly. CC consults https://spec.modelcontextprotocol.io/ during implementation.
3. **Supabase EF cold-start latency.** Reviewer roundtrip target <8s end-to-end. If cold-start adds >3s on first call, consider keeping the worker EF warm with a cron ping.

## Likely questions and defaults (answer-key per D182)

| Question | Default |
|---|---|
| MCP transport (HTTP vs SSE)? | HTTP for v1; SSE in v2 if Claude needs streaming |
| Should context_hash include the model name? | No — same proposal + same context = same idempotency window regardless of model |
| What if claude.ai connector requires OAuth? | Build bearer-first; PK adds OAuth wrapper as a v1.1 follow-up |
| Should escalations send a notification (email, Slack)? | No — `m.chatgpt_review` query at session start surfaces unresolved escalations; no push channel in v1 |
| What if `context` is huge (e.g. full schema dump)? | Bridge truncates `context` to 50KB before hashing + sending; logs truncation flag in `request_jsonb` |
| Run_slug — auto-generate or required? | Optional; auto-generate `<action_type>-<short_hash>` if not provided |
| Should this brief block T08? | No. Different surface, different EF, no shared deps. Run in parallel. |

## References

- `docs/runtime/structured_red_team_review_v1_proposal.md` — conceptual parent (D-01 / D185 awaiting ratification)
- `docs/00_sync_state.md` 1 May early morning UTC section — empirical case for build (two ChatGPT cross-check saves)
- Lesson #45 — mandatory pre-checks before destructive actions
- Lesson #46 — cron health is not system health
- D170 — apply_migration via Supabase MCP, not CLI
- D182 — non-blocking automation execution model
- OpenAI Responses API docs — https://platform.openai.com/docs/api-reference/responses
- MCP spec — https://spec.modelcontextprotocol.io/
