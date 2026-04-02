// compliance-reviewer v1.0.0
// AI-powered analysis of changed compliance policy pages.
//
// For each pending item in m.compliance_review_queue that has no ai_reviewed_at:
//   1. Fetch current page content via Jina reader
//   2. Load active compliance rules for the item's vertical
//   3. Send to Claude: what changed and does it affect our rules?
//   4. Write structured analysis back to the queue item
//
// Designed to run:
//   - Automatically: 5 min after compliance-monitor on the 1st of each month (9:05 UTC)
//   - On-demand: POST /functions/v1/compliance-reviewer from dashboard
//
// Scales to any vertical — rules are filtered by vertical_slug per item.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'compliance-reviewer-v1.0.0';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const JINA_BASE    = 'https://r.jina.ai/';

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

// ─── Fetch page content via Jina reader ──────────────────────────────────────

async function fetchPageContent(url: string): Promise<string> {
  const jinaUrl = `${JINA_BASE}${url}`;
  const resp = await fetch(jinaUrl, {
    headers: {
      'Accept': 'text/plain',
      'X-Return-Format': 'text',
    },
  });
  if (!resp.ok) throw new Error(`Jina fetch failed ${resp.status} for ${url}`);
  const text = await resp.text();
  // Truncate to 12k chars — enough for Claude to reason about without burning tokens
  return text.slice(0, 12000);
}

// ─── Load active compliance rules for a vertical ─────────────────────────────

type ComplianceRule = {
  rule_key: string;
  rule_name: string;
  risk_level: string;
  enforcement: string;
  rule_text: string;
  examples_good: string[] | null;
  examples_bad: string[] | null;
};

async function loadRules(
  supabase: ReturnType<typeof getServiceClient>,
  verticalSlug: string
): Promise<ComplianceRule[]> {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT rule_key, rule_name, risk_level, enforcement, rule_text,
             examples_good, examples_bad
      FROM t."5.7_compliance_rule"
      WHERE is_active = true
        AND vertical_slug = '${verticalSlug}'
      ORDER BY sort_order
    `,
  });
  if (error) throw new Error(`Rules load failed: ${error.message}`);
  return (data ?? []) as ComplianceRule[];
}

// ─── Claude analysis ─────────────────────────────────────────────────────────

type AIAnalysis = {
  summary: string;                          // Plain English: what changed on this page
  relevance: 'high' | 'medium' | 'low' | 'none'; // How relevant is the change to ICE content
  key_changes: string[];                    // Bullet list of specific changes detected
  affected_rules: {                         // Existing rules impacted
    rule_key: string;
    rule_name: string;
    impact: string;                         // How this rule is affected
    action: 'update' | 'strengthen' | 'relax' | 'no_change';
    suggested_update?: string;              // New rule_text if update recommended
  }[];
  new_rules_suggested: {                    // New rules to consider adding
    rule_name: string;
    rule_text: string;
    risk_level: 'high' | 'medium' | 'low';
    enforcement: 'hard_block' | 'soft_warn';
    rationale: string;
  }[];
  human_action_required: boolean;           // True if any rule updates or new rules suggested
  confidence: 'high' | 'medium' | 'low';   // AI confidence in its analysis
  confidence_reason: string;               // Why this confidence level
};

async function analyseWithClaude(
  pageName: string,
  pageContent: string,
  pageUrl: string,
  rules: ComplianceRule[],
  verticalSlug: string
): Promise<AIAnalysis> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const rulesText = rules.map(r =>
    `RULE: ${r.rule_key}\nName: ${r.rule_name}\nRisk: ${r.risk_level} | Enforcement: ${r.enforcement}\nText: ${r.rule_text}`
  ).join('\n\n---\n\n');

  const systemPrompt = `You are a compliance analyst for ICE — an AI content engine that publishes social media content for ${verticalSlug.toUpperCase()} providers in Australia.

Your job is to analyse changed policy pages and determine whether ICE's current compliance rules need updating.

ICE publishes content on behalf of allied health providers (OTs, physios, support coordinators) on Facebook, LinkedIn, and YouTube. The compliance rules govern what ICE can and cannot say in that content.

Respond ONLY with valid JSON matching the AIAnalysis schema. No preamble, no markdown.`;

  const userPrompt = `A compliance policy page has changed. Analyse what changed and how it affects ICE's content rules.

PAGE: ${pageName}
URL: ${pageUrl}

CURRENT PAGE CONTENT (may be truncated):
${pageContent}

CURRENT ICE COMPLIANCE RULES FOR ${verticalSlug.toUpperCase()} VERTICAL:
${rulesText}

Analyse:
1. What specifically changed on this page compared to what the rules currently reference?
2. Which existing rules are affected and how?
3. Are any new rules needed?
4. Is human review required?

Return a JSON object with this exact schema:
{
  "summary": "Plain English summary of what changed on this page",
  "relevance": "high|medium|low|none",
  "key_changes": ["specific change 1", "specific change 2"],
  "affected_rules": [
    {
      "rule_key": "existing_rule_key",
      "rule_name": "Existing Rule Name",
      "impact": "How this rule is affected by the page change",
      "action": "update|strengthen|relax|no_change",
      "suggested_update": "New rule_text if update recommended (omit if no_change)"
    }
  ],
  "new_rules_suggested": [
    {
      "rule_name": "Proposed Rule Name",
      "rule_text": "Full rule text",
      "risk_level": "high|medium|low",
      "enforcement": "hard_block|soft_warn",
      "rationale": "Why this new rule is needed"
    }
  ],
  "human_action_required": true,
  "confidence": "high|medium|low",
  "confidence_reason": "Why you have this confidence level"
}`;

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
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

  // Parse JSON — strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as AIAnalysis;
}

// ─── Main ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const supabase = getServiceClient();
  const results: unknown[] = [];

  // Load pending items that haven't been AI-reviewed yet
  const { data: pendingItems, error: fetchError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT review_id, source_name, url, vertical_slug
      FROM m.compliance_review_queue
      WHERE status = 'pending'
        AND ai_reviewed_at IS NULL
      ORDER BY detected_at ASC
      LIMIT 10
    `,
  });

  if (fetchError) return jsonResponse({ ok: false, error: fetchError.message }, 500);

  const items = (pendingItems ?? []) as {
    review_id: string;
    source_name: string;
    url: string;
    vertical_slug: string;
  }[];

  if (items.length === 0) {
    return jsonResponse({ ok: true, version: VERSION, message: 'no_pending_items', processed: 0 });
  }

  for (const item of items) {
    try {
      console.log(`[compliance-reviewer] analysing: ${item.source_name}`);

      // 1. Fetch page content
      const pageContent = await fetchPageContent(item.url);

      // 2. Load rules for this vertical
      const rules = await loadRules(supabase, item.vertical_slug);

      if (rules.length === 0) {
        // No rules for this vertical yet — write a note and move on
        await supabase.rpc('exec_sql', {
          query: `
            UPDATE m.compliance_review_queue
            SET ai_analysis = '{"summary": "No compliance rules configured for this vertical yet.", "relevance": "none", "key_changes": [], "affected_rules": [], "new_rules_suggested": [], "human_action_required": true, "confidence": "low", "confidence_reason": "No rules to compare against."}'::jsonb,
                ai_confidence = 'low',
                ai_reviewed_at = NOW()
            WHERE review_id = '${item.review_id}'
          `,
        });
        results.push({ review_id: item.review_id, status: 'no_rules', source: item.source_name });
        continue;
      }

      // 3. Analyse with Claude
      const analysis = await analyseWithClaude(
        item.source_name,
        pageContent,
        item.url,
        rules,
        item.vertical_slug
      );

      // 4. Write analysis back to queue item
      const analysisJson = JSON.stringify(analysis).replace(/'/g, "''");
      await supabase.rpc('exec_sql', {
        query: `
          UPDATE m.compliance_review_queue
          SET ai_analysis = '${analysisJson}'::jsonb,
              ai_confidence = '${analysis.confidence}',
              ai_reviewed_at = NOW(),
              ai_error = NULL
          WHERE review_id = '${item.review_id}'
        `,
      });

      results.push({
        review_id: item.review_id,
        source: item.source_name,
        relevance: analysis.relevance,
        confidence: analysis.confidence,
        affected_rules: analysis.affected_rules.length,
        new_rules_suggested: analysis.new_rules_suggested.length,
        human_action_required: analysis.human_action_required,
      });

      console.log(`[compliance-reviewer] done: ${item.source_name} — relevance: ${analysis.relevance}, confidence: ${analysis.confidence}`);

    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      console.error(`[compliance-reviewer] failed ${item.review_id}:`, msg);

      // Write error to item so it doesn't keep retrying silently
      await supabase.rpc('exec_sql', {
        query: `
          UPDATE m.compliance_review_queue
          SET ai_error = '${msg.replace(/'/g, "''")}',
              ai_reviewed_at = NOW()
          WHERE review_id = '${item.review_id}'
        `,
      });

      results.push({ review_id: item.review_id, source: item.source_name, status: 'error', error: msg });
    }
  }

  return jsonResponse({
    ok: true,
    version: VERSION,
    processed: results.length,
    results,
  });
});
