import { createClient } from "jsr:@supabase/supabase-js@2";

const VERSION = "ai-profile-bootstrap-v1.0.0";
const JINA_BASE = "https://r.jina.ai/";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchViaJina(url: string): Promise<string | null> {
  try {
    const res = await fetch(`${JINA_BASE}${url}`, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 8000); // cap at 8000 chars to control context size
  } catch {
    return null;
  }
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

function buildPrompt(submission: Record<string, any>, websiteContent: string | null, facebookContent: string | null): string {
  const formData = submission.form_data ?? {};
  const businessName = formData.business_name ?? submission.business_name ?? "this business";
  const industryVertical = formData.industry_vertical ?? submission.industry_vertical ?? "";
  const industryDetail = formData.industry_detail ?? submission.industry_detail ?? "";
  const brandVoice = formData.brand_voice ?? submission.brand_voice ?? "";
  const serviceList = formData.service_list ?? "";
  const contentObjectives = Array.isArray(formData.content_objectives)
    ? formData.content_objectives.join(", ")
    : "";
  const serveNdis = formData.serves_ndis ?? "";
  const ndisReg = formData.ndis_registration ?? "";
  const state = formData.business_state ?? submission.business_state ?? "Australia";

  return `You are helping set up a social media content profile for an Australian business.
Analyse the information below and generate a content profile in JSON format.

## Business Information
Business name: ${businessName}
Industry: ${industryVertical}
Location: ${state}
About: ${industryDetail}
Services offered:
${serviceList}

NDIS provider: ${serveNdis} (registration: ${ndisReg})
Content objectives: ${contentObjectives}
Preferred brand voice: ${brandVoice}

${websiteContent ? `## Website content\n${websiteContent}\n` : ""}
${facebookContent ? `## Facebook page content\n${facebookContent}\n` : ""}

## Instructions
Generate a JSON object with exactly these keys:

{
  "persona_description": "2-3 sentences describing who this business is and what they stand for. Written from the brand perspective.",
  "presenter_name": "A short brand handle (1-2 words, no spaces). E.g. 'Yarns' for NDIS Yarns, 'Pulse' for Property Pulse.",
  "brand_voice": "3-5 comma-separated tone attributes. E.g. 'warm, supportive, plain-English, empowering'",
  "style_notes": ["4-6 specific style instructions as array items. E.g. 'Use simple sentences', 'Include one actionable takeaway per post'"],
  "profession_slug": "One of: occupational_therapy | physiotherapy | speech_pathology | behaviour_support | support_coordination | support_worker | plan_management | mortgage_broking | real_estate_agent | buyers_agent | building | property_investment | general_health | other",
  "content_topics": ["5-8 specific topic areas this business should regularly post about"],
  "system_prompt_draft": "A complete system prompt for an AI content writer for this brand. Start with: 'You are the content writer for the brand \\"${businessName}\\" (slug: ${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}). You rewrite a news seed into value-added content with hooks, clarity, and brand voice. Return ONLY valid JSON with keys: title, body, meta.' Then add VOICE AND FORMAT instructions specific to this business."
}

Return ONLY the JSON object. No markdown, no explanation, no preamble.`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST only" }), { status: 405 });
  }

  let submission_id: string;
  try {
    const body = await req.json();
    submission_id = body.submission_id;
    if (!submission_id) throw new Error("submission_id required");
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 400 });
  }

  const supabase = getServiceClient();
  const log: string[] = [];

  try {
    // Load submission
    const { data: rows } = await supabase.rpc("exec_sql", {
      query: `
        SELECT submission_id, form_data, website_url, facebook_page_url,
               business_name, industry_vertical, industry_detail, brand_voice, business_state
        FROM c.onboarding_submission
        WHERE submission_id = '${submission_id}'::uuid
        LIMIT 1
      `,
    });

    if (!rows?.[0]) {
      return new Response(JSON.stringify({ ok: false, error: "Submission not found" }), { status: 404 });
    }

    const submission = rows[0];
    const formData = submission.form_data ?? {};
    const websiteUrl: string | null = formData.website_url ?? submission.website_url ?? null;
    const facebookUrl: string | null = formData.facebook_page_url ?? submission.facebook_page_url ?? null;

    // Fetch website content via Jina
    let websiteContent: string | null = null;
    if (websiteUrl) {
      log.push(`Fetching website via Jina: ${websiteUrl}`);
      websiteContent = await fetchViaJina(websiteUrl);
      log.push(websiteContent ? `Website fetched: ${websiteContent.length} chars` : "Website fetch failed");
    }

    // Fetch Facebook page content via Jina (best effort)
    let facebookContent: string | null = null;
    if (facebookUrl) {
      log.push(`Fetching Facebook page via Jina: ${facebookUrl}`);
      facebookContent = await fetchViaJina(facebookUrl);
      log.push(facebookContent ? `Facebook fetched: ${facebookContent.length} chars` : "Facebook fetch failed or blocked");
    }

    // Build prompt and call Claude
    const prompt = buildPrompt(submission, websiteContent, facebookContent);
    log.push("Calling Claude API...");

    const rawResponse = await callClaude(prompt);
    log.push(`Claude response received: ${rawResponse.length} chars`);

    // Parse Claude's JSON response
    let profileData: Record<string, any>;
    try {
      // Strip markdown code blocks if present
      const cleaned = rawResponse.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      profileData = JSON.parse(cleaned);
    } catch (e: any) {
      log.push(`JSON parse failed: ${e.message}. Raw: ${rawResponse.slice(0, 200)}`);
      throw new Error(`Claude returned invalid JSON: ${e.message}`);
    }

    // Validate required keys
    const required = ["persona_description", "presenter_name", "brand_voice", "style_notes", "system_prompt_draft"];
    for (const key of required) {
      if (!profileData[key]) {
        log.push(`Warning: missing key '${key}' in Claude response`);
      }
    }

    const aiScanResult = {
      persona_description: profileData.persona_description ?? null,
      presenter_name: profileData.presenter_name ?? null,
      brand_voice: profileData.brand_voice ?? null,
      style_notes: profileData.style_notes ?? [],
      profession_slug: profileData.profession_slug ?? "other",
      content_topics: profileData.content_topics ?? [],
      system_prompt_draft: profileData.system_prompt_draft ?? null,
      model_used: "claude-sonnet-4-6",
      scanned_at: new Date().toISOString(),
      website_fetched: websiteContent !== null,
      facebook_fetched: facebookContent !== null,
      log,
    };

    // Write back to submission
    const { data: updateResult } = await supabase.rpc("update_submission_ai_scan", {
      p_submission_id: submission_id,
      p_ai_scan_result: aiScanResult,
    });

    log.push(`Submission updated: ${updateResult}`);

    return new Response(
      JSON.stringify({ ok: true, version: VERSION, ai_profile_scan_result: aiScanResult, log }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error(`[ai-profile-bootstrap] error:`, e);
    return new Response(
      JSON.stringify({ ok: false, error: e.message, log }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
