import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-worker-id, x-ai-worker-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const VERSION = "ai-worker-v2.7.1";
// v2.7.1 — Write compliance_flags to m.post_draft (D088)
//   Skip (HARD_BLOCK): compliance_flags = [{rule, severity: 'HARD_BLOCK', triggered: true, at}]
//   Success: compliance_flags = [] (rules checked, none triggered)
// v2.7.0 — Profession-scoped compliance rule loading (D066)
//   fetchComplianceBlock now loads rules filtered by client profession_slug
//   An OT client gets OT-specific rules; a support worker gets only universal rules
//   Global rules (vertical_slug IS NULL) now correctly included for all clients
//
// v2.6.1 — Fix format advisor seed extraction
// seedTitle/seedBody were reading seed.title and seed.body (top-level) but
// rewrite_v1 payload nests content in seed.digest_item.{title,body_text}
// and synth_bundle_v1 nests in seed.items[].{title,body_text}.
// Both extracted as empty strings → format advisor saw empty seed → always
// decided 'text' → no images generated.
// Fix: extract from nested digest_item / items[] by job type.
//
// v2.6.0 — YouTube pipeline Stage A
// v2.5.1 — Fix writeVisualSpec: destructure {error} from .rpc() call.
// v2.5.0 — Content advisor promoted upstream (D043 Step 8)

const FORMAT_ADVISOR_PROMPT_KEY = "format-advisor-v1";
const VIDEO_FORMATS = new Set([
  'video_short_kinetic', 'video_short_stat',
  'video_short_kinetic_voice', 'video_short_stat_voice',
  'video_short_avatar', 'video_long_explainer', 'video_long_podcast_clip',
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeParseJson<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } {
  try { return { ok: true, value: JSON.parse(raw) as T }; }
  catch (e: any) { return { ok: false, error: e?.message ?? "invalid_json" }; }
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function nowIso() { return new Date().toISOString(); }

async function generateVideoScript(opts: {
  anthropicKey: string;
  formatKey: string;
  postTitle: string;
  postBody: string;
  clientName: string;
  vertical: string;
}): Promise<object | null> {
  const { anthropicKey, formatKey, postTitle, postBody, clientName, vertical } = opts;

  if (formatKey === 'video_short_kinetic' || formatKey === 'video_short_kinetic_voice') {
    const systemPrompt = `You are a YouTube Shorts script writer for ${clientName}, a ${vertical} sector social media presence.\n\nYour task: take a social media post and convert it into a tight kinetic text video script.\n\nRules:\n- Produce exactly 3-5 scenes: one hook (first), one to three point scenes (middle), one cta (last)\n- hook: headline max 60 chars, no body, duration_s 5-7\n- point: headline max 55 chars, body max 100 chars (one supporting line), duration_s 6-9\n- cta: headline max 65 chars (engagement question), no body, duration_s 4-6\n- Total video: 25-40 seconds\n- narration_text: natural spoken version of all scenes in sequence (~60-80 words)\n- Headlines must be punchy standalone statements — someone reading them in 1 second must get the point\n- Body text provides the single most credible supporting fact or stat\n\nReturn ONLY valid JSON:\n{\n  "format": "kinetic_text",\n  "scenes": [\n    {"type": "hook", "headline": string, "body": null, "duration_s": number},\n    {"type": "point", "headline": string, "body": string, "duration_s": number},\n    {"type": "cta", "headline": string, "body": null, "duration_s": number}\n  ],\n  "total_duration_s": number,\n  "narration_text": string\n}`;
    const userPrompt = `Post title: ${postTitle || '(none)'}\n\nPost body:\n${postBody.slice(0, 1000)}\n\nGenerate the video script.`;
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 700, temperature: 0.25, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
    });
    if (!resp.ok) { console.error('[ai-worker] video_script_kinetic http', resp.status); return null; }
    const data = await resp.json();
    const raw = data?.content?.[0]?.text ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed?.scenes) || parsed.scenes.length < 3) return null;
      const total = parsed.scenes.reduce((s: number, sc: any) => s + Number(sc.duration_s ?? 7), 0);
      parsed.total_duration_s = total;
      return parsed;
    } catch { console.error('[ai-worker] video_script_kinetic parse failed'); return null; }
  }

  if (formatKey === 'video_short_stat' || formatKey === 'video_short_stat_voice') {
    const systemPrompt = `You are extracting data for an animated social media video for ${clientName}.\n\nIdentify the single most compelling numeric stat and build a 20-second video spec.\n\nRules:\n- stat_value: the number formatted for screen, max 12 chars (e.g. "$62.17/hr", "4.35%", "+3.7%"). Include unit/symbol.\n- stat_label: what the number IS, max 35 chars.\n- context_line: one sentence making the stat meaningful, max 75 chars.\n- cta_text: one engagement question, max 65 chars.\n- narration_text: spoken 20-second script (~45-55 words).\n\nReturn ONLY valid JSON:\n{\n  "format": "stat_reveal",\n  "stat_value": string,\n  "stat_label": string,\n  "context_line": string,\n  "cta_text": string,\n  "total_duration_s": 20,\n  "narration_text": string\n}`;
    const userPrompt = `Post title: ${postTitle || '(none)'}\n\nPost body:\n${postBody.slice(0, 600)}\n\nExtract the video stat spec.`;
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, temperature: 0.1, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
    });
    if (!resp.ok) { console.error('[ai-worker] video_script_stat http', resp.status); return null; }
    const data = await resp.json();
    const raw = data?.content?.[0]?.text ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (!parsed?.stat_value) return null;
      parsed.total_duration_s = 20;
      return parsed;
    } catch { console.error('[ai-worker] video_script_stat parse failed'); return null; }
  }

  return null;
}

type FormatInfo = { ice_format_key: string; format_name: string; advisor_description: string; best_for: string; min_content_signals: string; };

async function fetchFormatContext(supabase: ReturnType<typeof getServiceClient>, clientId: string, platform: string): Promise<{ formats: FormatInfo[]; perfSummary: string }> {
  try {
    const { data: formatRows } = await supabase.rpc("exec_sql", {
      query: `
        SELECT f.ice_format_key, f.format_name,
          COALESCE(f.advisor_description,'') AS advisor_description,
          COALESCE(f.best_for,'') AS best_for,
          COALESCE(f.min_content_signals,'') AS min_content_signals,
          COALESCE(f.platform_support,'{}')::text AS platform_support_raw
        FROM "t"."5.3_content_format" f
        WHERE f.is_buildable = true AND f.ice_format_key IS NOT NULL
          AND (
            EXISTS (SELECT 1 FROM c.client_format_config cfc
              WHERE cfc.client_id = '${clientId}' AND cfc.ice_format_key = f.ice_format_key
                AND cfc.is_enabled = true AND (cfc.platform IS NULL OR cfc.platform = '${platform}'))
            OR NOT EXISTS (SELECT 1 FROM c.client_format_config cfc2 WHERE cfc2.client_id = '${clientId}')
          )
        ORDER BY f.sort_order ASC
      `
    });
    const allFormats: FormatInfo[] = [];
    for (const r of (formatRows ?? [])) {
      try { const s = JSON.parse(r.platform_support_raw ?? '{}'); if (s[platform] === false) continue; } catch { }
      allFormats.push({ ice_format_key: r.ice_format_key, format_name: r.format_name, advisor_description: r.advisor_description, best_for: r.best_for, min_content_signals: r.min_content_signals });
    }
    const formats = allFormats.length > 0 ? allFormats : [{ ice_format_key: 'text', format_name: 'Text post', advisor_description: 'Plain text post.', best_for: 'General content', min_content_signals: 'Any' }];
    let perfSummary = '';
    try {
      const { data: perfRows } = await supabase.rpc('exec_sql', { query: `SELECT ice_format_key, avg_engagement_rate, post_count FROM m.post_format_performance WHERE client_id = '${clientId}' AND rolling_window_days = 30 AND post_count >= 3 ORDER BY avg_engagement_rate DESC NULLS LAST LIMIT 5` });
      const perf: any[] = perfRows ?? [];
      if (perf.length > 0) perfSummary = `\nPerformance data (last 30 days):\n${perf.map((p: any) => `  ${p.ice_format_key}: ${(Number(p.avg_engagement_rate ?? 0) * 100).toFixed(1)}% avg engagement (${p.post_count} posts)`).join('\n')}\n`;
    } catch { }
    return { formats, perfSummary };
  } catch (e: any) {
    console.error('[ai-worker] fetchFormatContext failed:', e?.message);
    return { formats: [{ ice_format_key: 'text', format_name: 'Text post', advisor_description: 'Plain text.', best_for: 'General', min_content_signals: 'Any' }], perfSummary: '' };
  }
}

async function callFormatAdvisor(opts: { anthropicKey: string; seedTitle: string; seedBody: string; clientName: string; vertical: string; formats: FormatInfo[]; perfSummary: string; }): Promise<{ formatKey: string; reason: string; imageHeadline: string; durationMs: number }> {
  const { anthropicKey, seedTitle, seedBody, clientName, vertical, formats, perfSummary } = opts;
  const startMs = Date.now();
  const formatPalette = formats.map(f => `FORMAT: ${f.ice_format_key} (${f.format_name})\n${f.advisor_description}\nBest for: ${f.best_for}\nMinimum signals: ${f.min_content_signals}`).join('\n\n');
  const systemPrompt = `You are a content format advisor for ${clientName}, a ${vertical} sector social media presence.\n\nYour task: read a content seed and select the optimal format from the available palette.\n\nAVAILABLE FORMATS:\n${formatPalette}\n${perfSummary}\nDECISION RULES:\n- Choose the format that best serves the content's natural structure\n- Default to text if the content is conversational, reactive, or opinionated\n- carousel requires 3+ distinct structured points and minimum 200 words\n- image_quote requires one genuinely striking stat or insight that stands alone\n- video_short_kinetic requires 3+ distinct points expressible in 60 chars each\n- video_short_stat requires one striking numeric stat that anchors the story\n- Never choose a visual format to add interest if the content doesn't support it\n\nReturn ONLY valid JSON: {"format_key": string, "reason": string, "image_headline": string}`;
  const userPrompt = `Content seed:\nTitle: ${seedTitle || '(no title)'}\nBody preview: ${seedBody.slice(0, 600)}${seedBody.length > 600 ? '...' : ''}\n\nSelect the optimal format.`;
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, temperature: 0.2, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
  });
  if (!resp.ok) throw new Error(`format_advisor_http_${resp.status}`);
  const data = await resp.json();
  const raw = data?.content?.[0]?.text ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  let parsed: any;
  try { parsed = JSON.parse(cleaned); } catch { throw new Error(`format_advisor_bad_json: ${cleaned.slice(0, 200)}`); }
  const validKeys = formats.map(f => f.ice_format_key);
  const formatKey = validKeys.includes(parsed?.format_key ?? '') ? parsed.format_key : 'text';
  return { formatKey, reason: String(parsed?.reason ?? '').trim(), imageHeadline: String(parsed?.image_headline ?? '').trim(), durationMs: Date.now() - startMs };
}

async function writeVisualSpec(supabase: ReturnType<typeof getServiceClient>, postDraftId: string, formatKey: string, reason: string, imageHeadline: string, durationMs: number): Promise<void> {
  try {
    const { error } = await supabase.rpc('write_visual_spec', { p_post_draft_id: postDraftId, p_ice_format_key: formatKey, p_advisor_model: 'claude-sonnet-4-6', p_advisor_prompt_key: FORMAT_ADVISOR_PROMPT_KEY, p_spec: { format_key: formatKey, reason, image_headline: imageHeadline }, p_generation_ms: durationMs });
    if (error) console.error('[ai-worker] writeVisualSpec RPC error:', error.message);
  } catch (e: any) { console.error('[ai-worker] writeVisualSpec threw:', e?.message); }
}

async function fetchComplianceBlock(
  supabase: ReturnType<typeof getServiceClient>,
  clientId: string
): Promise<string> {
  try {
    // Step 1: Get client's verticals and profession
    const { data: scopeRows } = await supabase.rpc('exec_sql', {
      query: `
        SELECT DISTINCT cv.vertical_slug
        FROM c.client_content_scope ccs
        JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id
        WHERE ccs.client_id = '${clientId}'
          AND cv.is_active = true
          AND cv.vertical_slug IS NOT NULL
      `
    });
    const slugs: string[] = (scopeRows ?? []).map((r: any) => r.vertical_slug).filter(Boolean);
    if (!slugs.length) return '';

    // Step 2: Get client's profession_slug (may be null)
    const { data: clientRow } = await supabase.rpc('exec_sql', {
      query: `SELECT profession_slug FROM c.client WHERE client_id = '${clientId}'`
    });
    const professionSlug: string | null = (clientRow as any[])?.[0]?.profession_slug ?? null;

    // Step 3: Load scoped compliance rules
    // Loads:
    //   a) Vertical-specific rules where profession_slugs IS NULL (universal for all professions)
    //   b) Vertical-specific rules where client's profession is in profession_slugs[]
    //   c) Global rules where vertical_slug IS NULL (apply to all clients always)
    const slugList = slugs.map(s => `'${s}'`).join(',');
    const professionFilter = professionSlug
      ? `OR '${professionSlug}' = ANY(profession_slugs)`
      : '';

    const { data: ruleRows } = await supabase.rpc('exec_sql', {
      query: `
        SELECT DISTINCT ON (rule_key)
          rule_name, rule_text, risk_level, enforcement, examples_good, examples_bad, sort_order
        FROM t."5.7_compliance_rule"
        WHERE is_active = true
          AND (
            -- Vertical-specific rules (universal or profession-matched)
            (
              vertical_slug IN (${slugList})
              AND (profession_slugs IS NULL ${professionFilter})
            )
            -- Global rules: vertical_slug IS NULL — always apply
            OR vertical_slug IS NULL
          )
        ORDER BY rule_key, sort_order ASC
      `
    });

    const rules: any[] = ruleRows ?? [];
    if (!rules.length) return '';

    // Step 4: Build compliance block text (same format as before)
    const lines: string[] = [
      '=== COMPLIANCE REQUIREMENTS ===',
      'HARD_BLOCK: if violated, return {"skip": true, "reason": "compliance_block: [rule_name]"}.',
      'SOFT_WARN: apply best judgment.',
      '',
    ];
    for (const rule of rules) {
      lines.push(`RULE: ${rule.rule_name} [${rule.risk_level.toUpperCase()} \u2014 ${rule.enforcement}]`);
      lines.push(rule.rule_text);
      if (rule.examples_bad && !rule.examples_bad.startsWith('TBD'))
        lines.push(`  PROHIBITED: ${rule.examples_bad}`);
      if (rule.examples_good && !rule.examples_good.startsWith('TBD'))
        lines.push(`  PREFERRED: ${rule.examples_good}`);
      lines.push('');
    }
    if (professionSlug) {
      lines.push(`[Rules loaded for vertical(s): ${slugs.join(', ')} | profession: ${professionSlug}]`);
    }
    lines.push('=== END COMPLIANCE ===', '');
    return lines.join('\n');

  } catch (e: any) {
    console.error('[ai-worker] fetchComplianceBlock failed:', e?.message);
    return '';
  }
}

async function calculateCostUsd(supabase: ReturnType<typeof getServiceClient>, provider: string, model: string, inputTokens: number, outputTokens: number): Promise<number> {
  try {
    const { data } = await supabase.schema('m').from('ai_model_rate').select('rate_input_per_1m, rate_output_per_1m').eq('provider', provider).eq('model', model).is('effective_until', null).limit(1).maybeSingle();
    if (!data) return 0;
    return Math.round(((inputTokens / 1_000_000) * Number(data.rate_input_per_1m) + (outputTokens / 1_000_000) * Number(data.rate_output_per_1m)) * 1_000_000) / 1_000_000;
  } catch { return 0; }
}

async function writeUsageLog(supabase: ReturnType<typeof getServiceClient>, opts: { clientId: string; aiJobId?: string | null; postDraftId?: string | null; provider: string; model: string; contentType: string; platform: string; inputTokens: number; outputTokens: number; costUsd: number; fallbackUsed: boolean; errorCall: boolean; }): Promise<void> {
  try {
    await supabase.schema('m').from('ai_usage_log').insert({ client_id: opts.clientId, ai_job_id: opts.aiJobId ?? null, post_draft_id: opts.postDraftId ?? null, provider: opts.provider, model: opts.model, content_type: opts.contentType, platform: opts.platform, input_tokens: opts.inputTokens, output_tokens: opts.outputTokens, cost_usd: opts.costUsd, fallback_used: opts.fallbackUsed, error_call: opts.errorCall });
  } catch (e) { console.error('[ai_usage_log] write failed:', e); }
}

async function callClaude(opts: { apiKey: string; model: string; systemPrompt: string; userPrompt: string; temperature: number; maxOutputTokens: number; }) {
  const { apiKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens } = opts;
  const resp = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model, max_tokens: maxOutputTokens, temperature, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }) });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`anthropic_http_${resp.status}: ${text.slice(0, 1200)}`);
  const outer = safeParseJson<any>(text);
  if (!outer.ok) throw new Error(`anthropic_bad_json: ${outer.error}`);
  const content = outer.value?.content?.[0]?.text;
  if (!content) throw new Error('anthropic_empty_content');
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const parsed = safeParseJson<any>(cleaned);
  if (!parsed.ok) throw new Error(`anthropic_non_json: ${parsed.error} | raw: ${cleaned.slice(0, 400)}`);
  if (!parsed.value?.title || !parsed.value?.body) throw new Error('anthropic_missing_title_or_body');
  const usage = outer.value?.usage ?? {};
  return { title: String(parsed.value.title).trim(), body: String(parsed.value.body).trim(), imageHeadline: String(parsed.value.image_headline ?? '').trim(), meta: parsed.value.meta ?? {}, skip: parsed.value.skip === true, skipReason: parsed.value.reason ?? '', inputTokens: Number(usage.input_tokens ?? 0), outputTokens: Number(usage.output_tokens ?? 0) };
}

async function callOpenAI(opts: { apiKey: string; model: string; systemPrompt: string; userPrompt: string; temperature: number; maxOutputTokens: number; }) {
  const { apiKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens } = opts;
  const resp = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, temperature, max_tokens: maxOutputTokens, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }) });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`openai_http_${resp.status}: ${text.slice(0, 1200)}`);
  const outer = safeParseJson<any>(text);
  if (!outer.ok) throw new Error(`openai_bad_json_outer: ${outer.error}`);
  const content = outer.value?.choices?.[0]?.message?.content;
  if (!content) throw new Error('openai_empty_content');
  const parsed = safeParseJson<any>(content);
  if (!parsed.ok) throw new Error(`openai_non_json: ${parsed.error}`);
  if (!parsed.value?.title || !parsed.value?.body) throw new Error('openai_missing_title_or_body');
  const usage = outer.value?.usage ?? {};
  return { title: String(parsed.value.title).trim(), body: String(parsed.value.body).trim(), imageHeadline: String(parsed.value.image_headline ?? '').trim(), meta: parsed.value.meta ?? {}, skip: parsed.value.skip === true, skipReason: parsed.value.reason ?? '', inputTokens: Number(usage.prompt_tokens ?? 0), outputTokens: Number(usage.completion_tokens ?? 0) };
}

function buildFormatOutputSchema(decidedFormat: string, advisorImageHeadline: string): string {
  const needsImage = ['image_quote', 'carousel', 'animated_text_reveal', 'animated_data'].includes(decidedFormat);
  const isVideo = VIDEO_FORMATS.has(decidedFormat);
  const imageHeadlineInstruction = needsImage
    ? `- image_headline: 10-15 word pull quote for the visual overlay. Starting point: "${advisorImageHeadline}"`
    : `- image_headline: empty string`;
  const formatInstruction = isVideo
    ? `This post will be published as a ${decidedFormat} YouTube Short. Write a structured, informative post with clear distinct points. The video scenes will be generated separately from this body.`
    : decidedFormat === 'text' ? 'This post will be published as plain text. Write a conversational, engaging post.'
    : decidedFormat === 'image_quote' ? 'This post will be published with a branded image overlay. Write a post with one strong central insight.'
    : decidedFormat === 'carousel' ? 'This post will be published as a multi-slide carousel. Write a structured post with clearly distinct sections (3-5 strong points).'
    : `This post will be published as ${decidedFormat}. Write accordingly.`;
  return `${formatInstruction}\n\nReturn ONLY valid JSON:\n{\n  "title": string,\n  "body": string,\n  "image_headline": string,\n  "meta": object\n}\nIf the source content violates a HARD_BLOCK compliance rule:\n{"skip": true, "reason": "compliance_block: [rule name]"}\n\nField rules:\n- title: 8-12 word headline\n- body: full post body text optimised for ${decidedFormat} format\n${imageHeadlineInstruction}\n- meta: any extra metadata as object`;
}

async function assemblePrompts(supabase: ReturnType<typeof getServiceClient>, clientId: string, platform: string, jobType: string, seedPayload: any, decidedFormat: string, advisorImageHeadline: string): Promise<{ systemPrompt: string; userPrompt: string; model: string; temperature: number; maxOutputTokens: number; usedLegacy: boolean; complianceRuleCount: number; }> {
  const complianceBlock = await fetchComplianceBlock(supabase, clientId);
  const complianceRuleCount = complianceBlock ? (complianceBlock.match(/^RULE:/gm) ?? []).length : 0;
  const { data: brand } = await supabase.schema('c').from('client_brand_profile').select('*').eq('client_id', clientId).eq('is_active', true).limit(1).maybeSingle();
  const { data: platProfile } = await supabase.schema('c').from('client_platform_profile').select('platform_voice_prompt').eq('client_id', clientId).eq('platform', platform).eq('is_active', true).limit(1).maybeSingle();
  const { data: ctPrompt } = await supabase.schema('c').from('content_type_prompt').select('task_prompt, output_schema_hint').eq('client_id', clientId).eq('platform', platform).eq('job_type', jobType).eq('is_active', true).limit(1).maybeSingle();
  if (brand) {
    const model = (brand.model ?? 'claude-sonnet-4-6').toString();
    const temperature = Number(brand.temperature ?? 0.72);
    const maxOutputTokens = Number(brand.max_output_tokens ?? 1200);
    const systemPrompt = [complianceBlock, brand.brand_identity_prompt ?? '', platProfile?.platform_voice_prompt ?? ''].filter(Boolean).join('\n\n');
    const outputSchema = ctPrompt?.output_schema_hint ?? buildFormatOutputSchema(decidedFormat, advisorImageHeadline);
    const taskInstruction = ctPrompt?.task_prompt ?? 'Rewrite the seed content into a valuable, engaging post for the target platform.';
    const userPrompt = [taskInstruction, `\nSeed content (JSON):\n${JSON.stringify(seedPayload)}`, `\n${outputSchema}`].join('\n');
    return { systemPrompt, userPrompt, model, temperature, maxOutputTokens, usedLegacy: false, complianceRuleCount };
  }
  const { data: legacyProfile } = await supabase.schema('c').from('client_ai_profile').select('system_prompt, model, generation, persona, guidelines, platform_rules').eq('client_id', clientId).eq('status', 'active').order('is_default', { ascending: false }).limit(1).maybeSingle();
  if (!legacyProfile) throw new Error('no_client_profile_found');
  const model = (legacyProfile.model ?? 'claude-sonnet-4-6').toString();
  const gen = legacyProfile.generation ?? {};
  const systemPrompt = [complianceBlock, legacyProfile.system_prompt ?? '', 'Persona: ' + JSON.stringify(legacyProfile.persona ?? {}), 'Guidelines: ' + JSON.stringify(legacyProfile.guidelines ?? {}), 'Platform rules: ' + JSON.stringify(legacyProfile.platform_rules ?? {}), `Return ONLY valid JSON: {"title": string, "body": string, "image_headline": string, "meta": object}. If source violates HARD_BLOCK rule, return {"skip": true, "reason": "compliance_block: [rule name]"}`].filter(Boolean).join('\n\n');
  const userPrompt = `Rewrite this seed into a platform-appropriate post optimised for ${decidedFormat} format.\n\nSeed:\n${JSON.stringify(seedPayload)}\n\nReturn ONLY JSON: {"title": string, "body": string, "image_headline": string, "meta": object}`;
  return { systemPrompt, userPrompt, model, temperature: Number(gen.temperature ?? 0.72), maxOutputTokens: Number(gen.max_output_tokens ?? 1200), usedLegacy: true, complianceRuleCount };
}

type WorkerRequest = { limit?: number; worker_id?: string; lock_seconds?: number; };
type AiJobRow = { ai_job_id: string; client_id: string; post_draft_id: string; platform: string; job_type: string; input_payload: any; };

app.options('*', () => new Response(null, { status: 204, headers: corsHeaders }));

app.use('*', async (c, next) => {
  if (c.req.method !== 'POST') return next();
  const expected = Deno.env.get('AI_WORKER_API_KEY');
  const provided = c.req.header('x-ai-worker-key');
  if (!expected) return jsonResponse({ ok: false, error: 'AI_WORKER_API_KEY_not_set' }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  return next();
});

app.get('*', (c) => jsonResponse({ ok: true, function: 'ai-worker', version: VERSION }, 200));

app.post('*', async (c) => {
  const supabase = getServiceClient();
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!anthropicKey && !openaiKey) return jsonResponse({ ok: false, error: 'no_ai_api_key_configured' }, 500);

  const url = new URL(c.req.url);
  const bodyText = await c.req.text();
  const bodyJson = bodyText?.trim() ? safeParseJson<WorkerRequest>(bodyText) : ({ ok: true, value: {} as WorkerRequest } as const);
  if (!bodyJson.ok) return jsonResponse({ ok: false, error: 'bad_json' }, 400);

  const limit = Math.min(Math.max(Number(bodyJson.value.limit ?? url.searchParams.get('limit') ?? 1), 1), 20);
  const workerId = bodyJson.value.worker_id ?? url.searchParams.get('worker_id') ?? `worker-${crypto.randomUUID().slice(0, 8)}`;
  const lockSeconds = Math.min(Math.max(Number(bodyJson.value.lock_seconds ?? 600), 30), 3600);

  const { data: lockedData, error: lockErr } = await supabase.schema('f').rpc('ai_worker_lock_jobs_v1', { p_limit: limit, p_worker_id: workerId, p_lock_seconds: lockSeconds });
  if (lockErr) return jsonResponse({ ok: false, error: 'lock_jobs_failed', detail: lockErr }, 500);

  const jobs = (lockedData ?? []) as AiJobRow[];
  if (!jobs.length) return jsonResponse({ ok: true, message: 'no_jobs', worker_id: workerId, locked: 0 }, 200);

  const results: any[] = [];

  for (const job of jobs) {
    const jobId = job.ai_job_id;
    const platform = job.platform ?? 'facebook';
    const jobType = job.job_type ?? 'rewrite_v1';

    try {
      // Step 1: Format palette
      const { formats, perfSummary } = await fetchFormatContext(supabase, job.client_id, platform);

      // Step 2: Extract seed content — must handle nested payload structure
      // rewrite_v1:      input_payload.digest_item.{title, body_text}
      // synth_bundle_v1: input_payload.items[].{title, body_text}
      // Legacy/other:    input_payload.{title, body, content, excerpt, summary}
      const rawPayload = job.input_payload ?? {};
      let seedTitle = String(rawPayload.title ?? rawPayload.headline ?? '');
      let seedBody  = String(rawPayload.body ?? rawPayload.content ?? rawPayload.excerpt ?? rawPayload.summary ?? '');

      if (!seedTitle && !seedBody) {
        if (jobType === 'rewrite_v1' && rawPayload.digest_item) {
          const di = rawPayload.digest_item;
          seedTitle = String(di.title ?? di.url ?? '');
          seedBody  = String(di.body_text ?? di.content ?? di.excerpt ?? '');
        } else if (jobType === 'synth_bundle_v1' && Array.isArray(rawPayload.items) && rawPayload.items.length > 0) {
          seedTitle = String(rawPayload.items[0].title ?? rawPayload.items[0].url ?? '');
          seedBody  = rawPayload.items
            .map((it: any) => String(it.body_text ?? it.content ?? it.excerpt ?? ''))
            .filter(Boolean)
            .join('\n\n---\n\n');
        }
      }

      // seed passed to assemblePrompts — full payload for generation context
      const seed = rawPayload;

      let clientName = '', vertical = 'professional services';
      try {
        const { data: brand } = await supabase.schema('c').from('client_brand_profile').select('brand_name').eq('client_id', job.client_id).eq('is_active', true).limit(1).maybeSingle();
        clientName = brand?.brand_name ?? '';
        const { data: scope } = await supabase.rpc('exec_sql', { query: `SELECT cv.vertical_name FROM c.client_content_scope ccs JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id WHERE ccs.client_id = '${job.client_id}' AND ccs.is_primary = true LIMIT 1` });
        vertical = (scope as any)?.[0]?.vertical_name ?? 'professional services';
      } catch { }

      let decidedFormat = 'text', advisorReason = '', advisorImageHeadline = '', advisorDurationMs = 0;
      if (anthropicKey && formats.length > 0) {
        try {
          const advised = await callFormatAdvisor({ anthropicKey, seedTitle, seedBody, clientName, vertical, formats, perfSummary });
          decidedFormat = advised.formatKey; advisorReason = advised.reason; advisorImageHeadline = advised.imageHeadline; advisorDurationMs = advised.durationMs;
          console.log(`[ai-worker] ${VERSION} — job ${jobId}: advisor chose ${decidedFormat} (${advisorDurationMs}ms) seedTitle="${seedTitle.slice(0, 60)}"`);
        } catch (advisorErr: any) {
          console.error(`[ai-worker] format advisor failed for ${jobId}, defaulting to text:`, advisorErr?.message);
        }
      }

      // Step 3: Write visual spec
      await writeVisualSpec(supabase, job.post_draft_id, decidedFormat, advisorReason, advisorImageHeadline, advisorDurationMs);

      // Step 4: Assemble prompts
      const { systemPrompt, userPrompt, model, temperature, maxOutputTokens, usedLegacy, complianceRuleCount } =
        await assemblePrompts(supabase, job.client_id, platform, jobType, seed, decidedFormat, advisorImageHeadline);
      if (complianceRuleCount > 0) console.log(`[ai-worker] ${jobId}: ${complianceRuleCount} compliance rules injected`);

      // Step 5: Generate
      const isPrimary = model.startsWith('claude');
      const primaryProvider = isPrimary ? 'anthropic' : 'openai';
      let result: Awaited<ReturnType<typeof callClaude>> | null = null;
      let fallbackUsed = false, primaryError: string | null = null;

      if (isPrimary && anthropicKey) {
        try { result = await callClaude({ apiKey: anthropicKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens }); }
        catch (e: any) { primaryError = e?.message ?? String(e); console.error(`[ai-worker] Claude failed for ${jobId}:`, primaryError); await writeUsageLog(supabase, { clientId: job.client_id, aiJobId: jobId, postDraftId: job.post_draft_id, provider: 'anthropic', model, contentType: jobType, platform, inputTokens: 0, outputTokens: 0, costUsd: 0, fallbackUsed: false, errorCall: true }); }
      } else if (!isPrimary && openaiKey) {
        try { result = await callOpenAI({ apiKey: openaiKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens }); }
        catch (e: any) { primaryError = e?.message ?? String(e); await writeUsageLog(supabase, { clientId: job.client_id, aiJobId: jobId, postDraftId: job.post_draft_id, provider: 'openai', model, contentType: jobType, platform, inputTokens: 0, outputTokens: 0, costUsd: 0, fallbackUsed: false, errorCall: true }); }
      }

      if (!result && primaryError && openaiKey) {
        fallbackUsed = true;
        const fallbackModel = 'gpt-4o';
        result = await callOpenAI({ apiKey: openaiKey, model: fallbackModel, systemPrompt, userPrompt, temperature, maxOutputTokens });
        await writeUsageLog(supabase, { clientId: job.client_id, aiJobId: jobId, postDraftId: job.post_draft_id, provider: 'openai', model: fallbackModel, contentType: jobType, platform, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: await calculateCostUsd(supabase, 'openai', fallbackModel, result.inputTokens, result.outputTokens), fallbackUsed: true, errorCall: false });
      } else if (result) {
        await writeUsageLog(supabase, { clientId: job.client_id, aiJobId: jobId, postDraftId: job.post_draft_id, provider: primaryProvider, model, contentType: jobType, platform, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: await calculateCostUsd(supabase, primaryProvider, model, result.inputTokens, result.outputTokens), fallbackUsed: false, errorCall: false });
      }

      if (!result) throw new Error(primaryError ?? 'all_providers_failed');

      if (result.skip) {
        const skipReason = result.skipReason || 'compliance_block';
        await supabase.schema('m').from('post_draft').update({
          approval_status: 'dead',
          draft_format: { compliance_skip: true, reason: skipReason, at: nowIso() },
          compliance_flags: [{ rule: skipReason, severity: 'HARD_BLOCK', triggered: true, at: nowIso() }],
          updated_at: nowIso(),
        }).eq('post_draft_id', job.post_draft_id);
        await supabase.schema('m').from('ai_job').update({ status: 'succeeded', output_payload: { skipped: true, reason: skipReason }, error: null, locked_by: null, locked_at: null, updated_at: nowIso() }).eq('ai_job_id', jobId);
        results.push({ ai_job_id: jobId, post_draft_id: job.post_draft_id, status: 'compliance_skip', reason: skipReason }); continue;
      }

      const finalImageHeadline = result.imageHeadline || advisorImageHeadline;
      const draftMeta = { ...(typeof result.meta === 'object' && result.meta ? result.meta : {}), ai: { provider: fallbackUsed ? 'openai' : primaryProvider, model: fallbackUsed ? 'gpt-4o' : model, fallback_used: fallbackUsed, legacy_profile: usedLegacy, compliance_rules_injected: complianceRuleCount, format_advisor_key: FORMAT_ADVISOR_PROMPT_KEY, format_decided: decidedFormat, format_reason: advisorReason, worker_id: workerId, ai_job_id: jobId, at: nowIso(), input_tokens: result.inputTokens, output_tokens: result.outputTokens } };

      const baseUpdate: any = {
        draft_title: result.title,
        draft_body: result.body,
        draft_format: draftMeta,
        approval_status: 'needs_review',
        recommended_format: decidedFormat,
        recommended_reason: advisorReason,
        image_headline: finalImageHeadline,
        compliance_flags: [],  // rules were checked, none triggered a skip
        updated_at: nowIso(),
      };

      await supabase.schema('m').from('post_draft').update(baseUpdate).eq('post_draft_id', job.post_draft_id);

      // Step 6: Video script — non-fatal
      let videoScriptGenerated = false;
      if (VIDEO_FORMATS.has(decidedFormat) && anthropicKey) {
        try {
          const videoScript = await generateVideoScript({ anthropicKey, formatKey: decidedFormat, postTitle: result.title, postBody: result.body, clientName, vertical });
          if (videoScript) {
            const { error: vsErr } = await supabase.rpc('set_draft_video_script', { p_post_draft_id: job.post_draft_id, p_video_script: videoScript as any });
            if (vsErr) console.error('[ai-worker] set_draft_video_script error:', vsErr.message);
            else videoScriptGenerated = true;
          }
        } catch (vsErr: any) { console.error('[ai-worker] generateVideoScript threw:', vsErr?.message); }
      }

      await supabase.schema('m').from('ai_job').update({ status: 'succeeded', output_payload: { title: result.title, body: result.body, meta: draftMeta }, error: null, locked_by: null, locked_at: null, updated_at: nowIso() }).eq('ai_job_id', jobId);

      results.push({ ai_job_id: jobId, post_draft_id: job.post_draft_id, status: 'succeeded', provider: fallbackUsed ? 'openai_fallback' : primaryProvider, model: fallbackUsed ? 'gpt-4o' : model, format_decided: decidedFormat, format_reason: advisorReason, compliance_rules_injected: complianceRuleCount, video_script_generated: videoScriptGenerated, input_tokens: result.inputTokens, output_tokens: result.outputTokens });

    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 4000);
      await supabase.schema('m').from('ai_job').update({ status: 'failed', error: msg, locked_by: null, locked_at: null, updated_at: nowIso() }).eq('ai_job_id', jobId);
      results.push({ ai_job_id: jobId, post_draft_id: job.post_draft_id, status: 'failed', error: msg });
    }
  }

  return jsonResponse({ ok: true, version: VERSION, worker_id: workerId, locked: jobs.length, processed: results.length, results });
});

app.all('*', (c) => jsonResponse({ ok: false, error: 'route_not_found', version: VERSION }, 404));

Deno.serve(app.fetch);
