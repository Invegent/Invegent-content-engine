// compliance-reviewer v1.3.0
// Fully vertical + profession scoped AI compliance analysis.
// v1.3.0: uses get_compliance_rules(vertical, profession) for two-dimension rule loading.
//   Rules marked profession_slugs IS NULL load for all professions in the vertical.
//   Rules with profession_slugs array load only for matching professions.
//   vertical_context and profession description injected into Claude system prompt.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'compliance-reviewer-v1.3.0';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const JINA_BASE = 'https://r.jina.ai/';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchPageContent(url: string): Promise<string> {
  const jinaUrl = `${JINA_BASE}${url}`;
  const resp = await fetch(jinaUrl, { headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' } });
  if (!resp.ok) throw new Error(`Jina fetch failed ${resp.status} for ${url}`);
  return (await resp.text()).slice(0, 12000);
}

type ComplianceRule = {
  rule_key: string;
  rule_name: string;
  risk_level: string;
  enforcement: string;
  rule_text: string;
  profession_slugs: string[] | null;
};

type PendingItem = {
  review_id: string;
  source_name: string;
  url: string;
  vertical_slug: string;
  profession_slug: string | null;
  vertical_context: string | null;
  profession_context: string | null;
};

type AIAnalysis = {
  summary: string;
  relevance: 'high' | 'medium' | 'low' | 'none';
  key_changes: string[];
  affected_rules: {
    rule_key: string;
    rule_name: string;
    impact: string;
    action: 'update' | 'strengthen' | 'relax' | 'no_change';
    suggested_update?: string;
  }[];
  new_rules_suggested: {
    rule_name: string;
    rule_text: string;
    risk_level: 'high' | 'medium' | 'low';
    enforcement: 'hard_block' | 'soft_warn';
    rationale: string;
  }[];
  human_action_required: boolean;
  confidence: 'high' | 'medium' | 'low';
  confidence_reason: string;
};

async function analyseWithClaude(
  item: PendingItem,
  pageContent: string,
  rules: ComplianceRule[]
): Promise<AIAnalysis> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const professionLine = item.profession_slug && item.profession_context
    ? `PROFESSION: ${item.profession_slug.toUpperCase()}\nPROFESSION CONTEXT: ${item.profession_context}\n`
    : '';

  const systemPrompt =
    `You are a compliance analyst for ICE — an AI content engine that publishes social media content for businesses in regulated Australian industries.\n\n` +
    `CURRENT VERTICAL: ${item.vertical_slug.toUpperCase()}\n` +
    (item.vertical_context ? `VERTICAL CONTEXT: ${item.vertical_context}\n` : '') +
    professionLine +
    `\nYour job: analyse changed policy pages and determine whether ICE's compliance rules need updating. ` +
    `Rules govern what ICE can and cannot say in social media content published for these businesses. ` +
    `Respond ONLY with valid JSON. No preamble, no markdown fences.`;

  const rulesText = rules.map(r => {
    const scope = r.profession_slugs
      ? `[Applies to: ${r.profession_slugs.join(', ')}]`
      : '[Universal — all professions in vertical]';
    return `RULE: ${r.rule_key} ${scope}\nName: ${r.rule_name}\nRisk: ${r.risk_level} | Enforcement: ${r.enforcement}\nText: ${r.rule_text}`;
  }).join('\n\n---\n\n');

  const userPrompt =
    `A compliance policy page has changed. Analyse what changed and how it affects ICE's content rules.\n\n` +
    `PAGE: ${item.source_name}\nURL: ${item.url}\n\n` +
    `CURRENT PAGE CONTENT (may be truncated):\n${pageContent}\n\n` +
    `COMPLIANCE RULES LOADED (vertical: ${item.vertical_slug}, profession: ${item.profession_slug ?? 'all'}):\n${rulesText}\n\n` +
    `Return this exact JSON:\n` +
    `{\n` +
    `  "summary": "Plain English: what changed on this page",\n` +
    `  "relevance": "high|medium|low|none",\n` +
    `  "key_changes": ["change 1"],\n` +
    `  "affected_rules": [{"rule_key": "", "rule_name": "", "impact": "", "action": "update|strengthen|relax|no_change", "suggested_update": ""}],\n` +
    `  "new_rules_suggested": [{"rule_name": "", "rule_text": "", "risk_level": "high|medium|low", "enforcement": "hard_block|soft_warn", "rationale": ""}],\n` +
    `  "human_action_required": true,\n` +
    `  "confidence": "high|medium|low",\n` +
    `  "confidence_reason": ""\n` +
    `}`;

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API failed ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';
  return JSON.parse(text.replace(/```json|```/g, '').trim()) as AIAnalysis;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const supabase = getServiceClient();
  const results: unknown[] = [];

  // Load pending items — join to get vertical_context, profession_slug, profession description
  const { data: pendingItems, error: fetchError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        crq.review_id,
        crq.source_name,
        crq.url,
        crq.vertical_slug,
        cps.profession_slug,
        cps.vertical_context,
        p.description AS profession_context
      FROM m.compliance_review_queue crq
      JOIN m.compliance_policy_source cps
        ON cps.source_key = crq.source_key
      LEFT JOIN t.profession p
        ON p.profession_slug = cps.profession_slug
      WHERE crq.status = 'pending'
        AND crq.ai_reviewed_at IS NULL
      ORDER BY crq.detected_at ASC
      LIMIT 10
    `,
  });

  if (fetchError) return jsonResponse({ ok: false, error: fetchError.message }, 500);

  const items = (pendingItems ?? []) as PendingItem[];

  if (items.length === 0) {
    return jsonResponse({ ok: true, version: VERSION, message: 'no_pending_items', processed: 0 });
  }

  for (const item of items) {
    try {
      console.log(`[compliance-reviewer] ${item.source_name} | vertical: ${item.vertical_slug} | profession: ${item.profession_slug ?? 'all'}`);

      const pageContent = await fetchPageContent(item.url);

      // Load rules scoped to vertical + profession
      // get_compliance_rules() returns: universal rules (profession_slugs IS NULL)
      //   + profession-specific rules matching p_profession_slug
      const { data: rulesData, error: rulesError } = await supabase.rpc('get_compliance_rules', {
        p_vertical_slug:   item.vertical_slug,
        p_profession_slug: item.profession_slug ?? null,
      });

      if (rulesError) throw new Error(`Rules load failed: ${rulesError.message}`);
      const rules = (rulesData ?? []) as ComplianceRule[];

      if (rules.length === 0) {
        await supabase.rpc('store_compliance_ai_analysis', {
          p_review_id:     item.review_id,
          p_ai_analysis:   { summary: 'No compliance rules configured for this vertical/profession yet. Add rules to t.5.7_compliance_rule with matching vertical_slug and optional profession_slugs.', relevance: 'none', key_changes: [], affected_rules: [], new_rules_suggested: [], human_action_required: true, confidence: 'low', confidence_reason: 'No rules to compare against.' },
          p_ai_confidence: 'low',
        });
        results.push({ review_id: item.review_id, status: 'no_rules', source: item.source_name });
        continue;
      }

      const analysis = await analyseWithClaude(item, pageContent, rules);

      const { error: writeError } = await supabase.rpc('store_compliance_ai_analysis', {
        p_review_id:     item.review_id,
        p_ai_analysis:   analysis,
        p_ai_confidence: analysis.confidence,
        p_ai_error:      null,
      });

      if (writeError) throw new Error(`DB write failed: ${writeError.message}`);

      results.push({
        review_id:             item.review_id,
        source:                item.source_name,
        vertical:              item.vertical_slug,
        profession:            item.profession_slug ?? 'all',
        rules_loaded:          rules.length,
        relevance:             analysis.relevance,
        confidence:            analysis.confidence,
        affected_rules:        analysis.affected_rules.length,
        new_rules_suggested:   analysis.new_rules_suggested.length,
        human_action_required: analysis.human_action_required,
      });

      console.log(`[compliance-reviewer] done: ${item.source_name} — ${analysis.relevance} relevance, ${rules.length} rules loaded`);

    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      console.error(`[compliance-reviewer] failed ${item.review_id}:`, msg);
      await supabase.rpc('store_compliance_ai_analysis', {
        p_review_id: item.review_id, p_ai_analysis: null, p_ai_confidence: null, p_ai_error: msg,
      });
      results.push({ review_id: item.review_id, source: item.source_name, status: 'error', error: msg });
    }
  }

  return jsonResponse({ ok: true, version: VERSION, processed: results.length, results });
});
