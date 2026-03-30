import { createClient } from "jsr:@supabase/supabase-js@2";

// series-writer v1.2.0
const VERSION = "series-writer-v1.2.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-series-key", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
function jsonResponse(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
function nowIso() { return new Date().toISOString(); }
function getServiceClient() { const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!url || !key) throw new Error("Missing credentials"); return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }); }
function safeParseJson<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } { try { return { ok: true, value: JSON.parse(raw) as T }; } catch (e: any) { return { ok: false, error: e?.message ?? "invalid_json" }; } }

async function writeEpisode(opts: { apiKey: string; model: string; systemPrompt: string; seriesTitle: string; seriesTopic: string; platform: string; episodePosition: number; episodeCount: number; episodeTitle: string; episodeAngle: string; episodeHook: string; ctaType: string }): Promise<{ title: string; body: string }> {
  const { apiKey, model, systemPrompt, seriesTitle, seriesTopic, platform, episodePosition, episodeCount, episodeTitle, episodeAngle, episodeHook, ctaType } = opts;
  const userPrompt = `Write episode ${episodePosition} of ${episodeCount} in the series "${seriesTitle}".\n\nSeries topic: ${seriesTopic}\nPlatform: ${platform}\n\nEpisode brief:\n- Title: ${episodeTitle}\n- Key message: ${episodeAngle}\n- Opening hook: ${episodeHook}\n- CTA type: ${ctaType}\n\nWrite a complete, polished ${platform} post. Start with the hook. Develop the angle. End with a ${ctaType}-style CTA. Format for ${platform}.\n\nReturn ONLY: {"title": "10-12 word headline", "body": "complete post body"}`;
  const resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 1200, temperature: 0.72, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }) });
  const text = await resp.text(); if (!resp.ok) throw new Error(`anthropic_http_${resp.status}: ${text.slice(0, 800)}`);
  const outer = safeParseJson<any>(text); if (!outer.ok) throw new Error(`anthropic_bad_json: ${outer.error}`);
  const content = (outer.value?.content?.[0]?.text ?? "").trim();
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const parsed = safeParseJson<{ title: string; body: string }>(cleaned); if (!parsed.ok) throw new Error(`episode_non_json: ${parsed.error}`);
  if (!parsed.value?.title || !parsed.value?.body) throw new Error("episode_missing_title_or_body");
  return { title: String(parsed.value.title).trim(), body: String(parsed.value.body).trim() };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === "GET") return jsonResponse({ ok: true, function: "series-writer", version: VERSION });
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
    if (series.status !== "approved") return jsonResponse({ ok: false, error: "series_not_approved", status: series.status });
    const { data: episodesData } = await supabase.rpc("get_series_episodes", { p_series_id: seriesId });
    const episodes = (episodesData as any[]) ?? []; if (episodes.length === 0) return jsonResponse({ ok: false, error: "no_outline_episodes_found" });
    const { data: brandData } = await supabase.rpc("get_client_brand_for_series", { p_client_id: series.client_id });
    const brand = brandData as any; const model = brand?.model ?? "claude-sonnet-4-6";
    const platforms: string[] = Array.isArray(series.platforms) && series.platforms.length > 0 ? series.platforms : [series.platform ?? "facebook"];
    await supabase.rpc("update_series_status", { p_series_id: seriesId, p_status: "writing" });
    const results: any[] = []; let successCount = 0; let failCount = 0;
    for (const ep of episodes) {
      const episodeResults: any[] = [];
      for (const platform of platforms) {
        try {
          const { data: platData } = await supabase.rpc("get_client_platform_profile_for_series", { p_client_id: series.client_id, p_platform: platform });
          const plat = platData as any;
          const systemPrompt = [brand?.brand_identity_prompt ?? "", plat?.platform_voice_prompt ?? ""].filter(Boolean).join("\n\n");
          const written = await writeEpisode({ apiKey: anthropicKey, model, systemPrompt, seriesTitle: series.title, seriesTopic: series.topic, platform, episodePosition: ep.position, episodeCount: series.episode_count, episodeTitle: ep.episode_title ?? "", episodeAngle: ep.episode_angle ?? "", episodeHook: ep.episode_hook ?? "", ctaType: ep.cta_type ?? "question" });
          const { data: insertResult, error: insertErr } = await supabase.rpc("series_post_insert", { p_client_id: series.client_id, p_platform: platform, p_draft_title: written.title, p_draft_body: written.body, p_series_id: seriesId, p_episode_id: ep.episode_id, p_scheduled_for: ep.scheduled_for ?? null, p_recommended_format: ep.recommended_format ?? "image_quote", p_image_headline: ep.image_headline ?? written.title });
          if (insertErr) throw new Error(`series_post_insert_failed: ${insertErr.message}`);
          successCount++; episodeResults.push({ platform, post_draft_id: insertResult?.post_draft_id, status: "draft_ready", title: written.title });
        } catch (platErr: any) {
          failCount++; episodeResults.push({ platform, status: "failed", error: (platErr?.message ?? String(platErr)).slice(0, 800) });
        }
      }
      results.push({ episode_id: ep.episode_id, position: ep.position, platforms: episodeResults });
    }
    const newStatus = failCount === 0 ? "active" : "writing";
    await supabase.rpc("update_series_status", { p_series_id: seriesId, p_status: newStatus });
    return jsonResponse({ ok: true, version: VERSION, series_id: seriesId, series_status: newStatus, platforms_used: platforms, drafts_written: successCount, drafts_failed: failCount, results });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await supabase.rpc("update_series_status", { p_series_id: seriesId, p_status: "approved" });
    return jsonResponse({ ok: false, error: msg, version: VERSION }, 500);
  }
});
