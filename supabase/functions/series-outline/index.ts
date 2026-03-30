import { createClient } from "jsr:@supabase/supabase-js@2";

// series-outline v1.2.0
const VERSION = "series-outline-v1.2.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-series-key", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
function jsonResponse(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
function nowIso() { return new Date().toISOString(); }
function getServiceClient() { const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!url || !key) throw new Error("Missing credentials"); return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }); }
function safeParseJson<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } { try { return { ok: true, value: JSON.parse(raw) as T }; } catch (e: any) { return { ok: false, error: e?.message ?? "invalid_json" }; } }

async function generateOutline(opts: { apiKey: string; model: string; title: string; topic: string; goal: string | null; audienceNotes: string | null; toneNotes: string | null; episodeCount: number; platform: string; brandIdentityPrompt: string | null }): Promise<{ series_summary: string; episodes: any[] }> {
  const { apiKey, model, title, topic, goal, audienceNotes, toneNotes, episodeCount, platform, brandIdentityPrompt } = opts;
  const systemPrompt = [brandIdentityPrompt ?? "", `You are an expert content strategist planning a ${episodeCount}-episode social media series for ${platform}.\nReturn ONLY valid JSON \u2014 no markdown, no preamble.`].filter(Boolean).join("\n\n");
  const userPrompt = `Plan a ${episodeCount}-episode content series.\n\nSeries title: ${title}\nTopic: ${topic}\n${goal ? `Goal: ${goal}` : ""}\n${audienceNotes ? `Target audience: ${audienceNotes}` : ""}\n${toneNotes ? `Tone guidance: ${toneNotes}` : ""}\nPlatform: ${platform}\n\nReturn this exact JSON structure:\n{\n  "series_summary": "1-2 sentence overview",\n  "episodes": [{\n    "position": 1,\n    "episode_title": "max 10 words",\n    "episode_angle": "key message (1-2 sentences)",\n    "episode_hook": "opening line (1 sentence)",\n    "cta_type": "question",\n    "recommended_format": "image_quote",\n    "image_headline": "10-15 word pull quote"\n  }]\n}\n\ncta_type: question|link|save|share|comment\nrecommended_format: text|image_quote|carousel\nReturn exactly ${episodeCount} episodes.`;
  const resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 4000, temperature: 0.75, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }) });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`anthropic_http_${resp.status}: ${text.slice(0, 800)}`);
  const outer = safeParseJson<any>(text); if (!outer.ok) throw new Error(`anthropic_bad_json: ${outer.error}`);
  const content = (outer.value?.content?.[0]?.text ?? "").trim();
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const parsed = safeParseJson<{ series_summary: string; episodes: any[] }>(cleaned);
  if (!parsed.ok) throw new Error(`outline_non_json: ${parsed.error}`);
  if (!Array.isArray(parsed.value?.episodes) || parsed.value.episodes.length === 0) throw new Error("outline_missing_episodes");
  return parsed.value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === "GET") return jsonResponse({ ok: true, function: "series-outline", version: VERSION });
  const expected = Deno.env.get("AI_WORKER_API_KEY"); const provided = req.headers.get("x-series-key");
  if (!expected) return jsonResponse({ ok: false, error: "AI_WORKER_API_KEY_not_set" }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY"); if (!anthropicKey) return jsonResponse({ ok: false, error: "ANTHROPIC_API_KEY_not_set" }, 500);
  const bodyText = await req.text(); const body = safeParseJson<{ series_id: string }>(bodyText);
  if (!body.ok || !body.value?.series_id) return jsonResponse({ ok: false, error: "series_id_required" }, 400);
  const seriesId = body.value.series_id; const supabase = getServiceClient();
  try {
    const { data: seriesData, error: seriesErr } = await supabase.rpc("get_series_for_outline", { p_series_id: seriesId });
    if (seriesErr) throw new Error(`load_series_failed: ${seriesErr.message}`);
    if (!seriesData) throw new Error("series_not_found");
    const series = seriesData as any;
    if (!['draft', 'outline_pending'].includes(series.status)) return jsonResponse({ ok: false, error: "series_already_outlined", status: series.status });
    await supabase.rpc("update_series_status", { p_series_id: seriesId, p_status: "outline_pending" });
    const { data: brandData } = await supabase.rpc("get_client_brand_for_series", { p_client_id: series.client_id });
    const brand = brandData as any; const model = brand?.model ?? "claude-sonnet-4-6";
    const outline = await generateOutline({ apiKey: anthropicKey, model, title: series.title, topic: series.topic, goal: series.goal, audienceNotes: series.audience_notes, toneNotes: series.tone_notes, episodeCount: series.episode_count, platform: series.platform, brandIdentityPrompt: brand?.brand_identity_prompt ?? null });
    const episodes = outline.episodes.slice(0, series.episode_count);
    const episodeRows = episodes.map((ep: any, i: number) => ({ client_id: series.client_id, position: Number(ep.position ?? (i + 1)), episode_title: String(ep.episode_title ?? "").trim(), episode_angle: String(ep.episode_angle ?? "").trim(), episode_hook: String(ep.episode_hook ?? "").trim(), cta_type: ["question","link","save","share","comment"].includes(ep.cta_type) ? ep.cta_type : "question", recommended_format: ["text","image_quote","carousel"].includes(ep.recommended_format) ? ep.recommended_format : "image_quote", image_headline: String(ep.image_headline ?? ep.episode_title ?? "").trim() }));
    const { error: saveErr } = await supabase.rpc("save_series_outline", { p_series_id: seriesId, p_series_summary: outline.series_summary ?? null, p_outline_json: episodes, p_episode_rows: episodeRows });
    if (saveErr) throw new Error(`save_series_outline_failed: ${saveErr.message}`);
    return jsonResponse({ ok: true, version: VERSION, series_id: seriesId, series_summary: outline.series_summary, episode_count: episodes.length, episodes: episodeRows });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await supabase.rpc("update_series_status", { p_series_id: seriesId, p_status: "draft" });
    return jsonResponse({ ok: false, error: msg, version: VERSION }, 500);
  }
});
