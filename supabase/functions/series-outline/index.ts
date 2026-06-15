import { createClient } from "jsr:@supabase/supabase-js@2";

// series-outline v1.5.0
// v1.5.0 (Stage 2 — F-SERIES-FORMAT-DIVERSITY per-platform): resolveValidFormats now
//   returns the UNION of capability-valid formats across the eligible selected
//   platforms (a format is offered if valid on AT LEAST ONE), replacing the v1.3.0
//   INTERSECTION. Rationale: with publisher-real platform_support (Stage 0), no single
//   format is valid across a {fb,ig,li,yt} set (YouTube needs video, LinkedIn needs
//   text, Facebook needs non-video — mutually exclusive), so the intersection is empty
//   and the v1.4.0 outline 422s (no_valid_format_for_platform_set) for every
//   YouTube-inclusive series. The episode recommended_format is now a PREFERRED hint;
//   fan_out_episode (Stage 1) re-resolves the final per-platform format (keep-if-valid /
//   deterministic-first-valid / fail-loud) at fan-out. Fail-loud HERE triggers ONLY when
//   the union is empty (the client has no buildable+supported format on ANY selected
//   platform). Persona capture, save_series_outline, the whitelist clamp, and all
//   downstream gates are UNCHANGED. verify_jwt=false preserved.
// v1.4.0 (persona capture — additive over v1.3.0): the outline prompt now also
//   asks the model for per-episode persona fields (persona_label /
//   avatar_preference / persona_notes), and episodeRows maps them through
//   (sanitised via cleanStr -> trimmed string or null) so save_series_outline
//   persists them into the Stage-1 episode persona columns (the RPC already
//   accepts these keys — verified). PERSONA IS CAPTURED AS PLANNING INTENT ONLY:
//   NO HeyGen / avatar / brand_avatar / A2 / Branch-A change, NO Stage 4 work, and
//   the v1.3.0 platform-aware capability resolver / whitelist / fail-loud logic is
//   UNCHANGED. verify_jwt=false preserved.
// v1.3.0 (Stage 3.5a — platform-aware outline): the outline generator is now
//   capability-aware. Previously it received only series.platform (singular) and
//   hard-clamped recommended_format to text|image_quote|carousel in BOTH the prompt
//   and the validation whitelist — so a YouTube-targeted series was STRUCTURALLY
//   incapable of emitting a video format, and every YouTube child was rejected
//   downstream by the capability gate (zero YouTube output). v1.3.0:
//   (a) reads series.platforms[] (falls back to [series.platform]);
//   (b) calls public.get_studio_capabilities(client_id) — the SAME resolver Single
//       Post / Studio uses — to learn per-platform/per-format state;
//   (c) computes the VALID format set = formats whose state ∈ {enabled,
//       enabled_unproven} on EVERY selected eligible platform (intersection, so a
//       single episode format works on all targets), and whether any selected
//       platform is video_only (YouTube);
//   (d) feeds that valid set into the prompt AND uses it as the validation
//       whitelist (resolver-driven, NOT a hardcoded list) — so video formats can
//       now be emitted for video-inclusive series, and text is excluded where a
//       platform (e.g. Instagram) does not support it;
//   (e) if NO format is valid across the selected set, FAILS LOUD
//       (no_valid_format_for_platform_set, HTTP 422) — never silently picks text.
//   DOWNSTREAM GATES UNCHANGED: fan_out_episode, create_manual_slot_internal, the
//   per-platform capability rejection, Advisor, compliance, render, publisher are
//   all untouched. The whitelist + the downstream gate remain hard backstops, so a
//   bad model choice is still rejected, never published invalid.
//   NOTE: branch creation via the GitHub bridge is unavailable, so this lands on
//   main UNDEPLOYED (dev direct-push convention). Production behaviour is unchanged
//   until a separate CLI deploy, which is gated on D-01 + PK approval.
//   v1.2.0 (prior): static text|image_quote|carousel clamp, singular platform.
const VERSION = "series-outline-v1.5.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-series-key", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
function jsonResponse(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
function nowIso() { return new Date().toISOString(); }
function getServiceClient() { const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!url || !key) throw new Error("Missing credentials"); return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }); }
function safeParseJson<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } { try { return { ok: true, value: JSON.parse(raw) as T }; } catch (e: any) { return { ok: false, error: e?.message ?? "invalid_json" }; } }
// v1.4.0: sanitise a model-supplied persona string field -> trimmed string or null.
function cleanStr(v: unknown): string | null { const s = (v ?? "").toString().trim(); return s.length > 0 ? s : null; }

// Stage 3.5a: cta vocabulary is unchanged from v1.2.0.
const CTA_TYPES = ["question", "link", "save", "share", "comment"];

// Stage 3.5a / Stage 2: resolve the set of episode formats offered to the outline,
// using public.get_studio_capabilities(client_id). A format is valid on a platform
// only if its state is 'enabled' or 'enabled_unproven' there. v1.5.0 returns the
// UNION across eligible selected platforms (valid on >= 1 platform); fan_out_episode
// re-resolves the final per-platform format, so the single per-episode
// recommended_format is a PREFERRED hint, not an all-platform guarantee.
type CapFormat = { format: string; supported: boolean; state: string; reason: string | null; proven: boolean };
type CapPlatform = { platform: string; eligible: boolean; video_only: boolean; formats: CapFormat[] };
const VALID_STATES = new Set(["enabled", "enabled_unproven"]);

function resolveValidFormats(capabilities: any, selectedPlatforms: string[]): {
  validFormats: string[];
  videoOnlyInSet: boolean;
  eligibleSelected: string[];
  ineligibleSelected: string[];
  perPlatformValid: Record<string, string[]>;
} {
  const platforms: CapPlatform[] = Array.isArray(capabilities?.platforms) ? capabilities.platforms : [];
  const byPlatform = new Map<string, CapPlatform>();
  for (const p of platforms) byPlatform.set(p.platform, p);

  const eligibleSelected: string[] = [];
  const ineligibleSelected: string[] = [];
  const perPlatformValid: Record<string, string[]> = {};
  let videoOnlyInSet = false;

  for (const sel of selectedPlatforms) {
    const cap = byPlatform.get(sel);
    if (!cap || cap.eligible !== true) { ineligibleSelected.push(sel); continue; }
    eligibleSelected.push(sel);
    if (cap.video_only === true) videoOnlyInSet = true;
    const valid = (cap.formats ?? [])
      .filter((f) => f.supported === true && VALID_STATES.has(f.state))
      .map((f) => f.format);
    perPlatformValid[sel] = valid;
  }

  // v1.5.0: UNION across eligible selected platforms — a format is offered if it
  // is valid on AT LEAST ONE eligible selected platform. fan_out_episode re-resolves
  // the final per-platform format at fan-out, so the single episode recommended_format
  // is only a preferred hint. This removes the impossible {fb,ig,li,yt} empty
  // intersection (which 422'd every YouTube-inclusive series) and the avatar collapse.
  const unionSet = new Set<string>();
  for (const p of eligibleSelected) {
    for (const fmt of (perPlatformValid[p] ?? [])) unionSet.add(fmt);
  }
  let validFormats: string[] = [...unionSet];
  validFormats.sort();
  return { validFormats, videoOnlyInSet, eligibleSelected, ineligibleSelected, perPlatformValid };
}

async function generateOutline(opts: { apiKey: string; model: string; title: string; topic: string; goal: string | null; audienceNotes: string | null; toneNotes: string | null; episodeCount: number; platformsLabel: string; validFormats: string[]; videoOnlyInSet: boolean; brandIdentityPrompt: string | null }): Promise<{ series_summary: string; episodes: any[] }> {
  const { apiKey, model, title, topic, goal, audienceNotes, toneNotes, episodeCount, platformsLabel, validFormats, videoOnlyInSet, brandIdentityPrompt } = opts;
  const formatList = validFormats.join("|");
  const videoNote = videoOnlyInSet
    ? `\nIMPORTANT: this series includes a video-only platform (e.g. YouTube). Prefer a video format for recommended_format so the video platform is served well; fan-out adapts the non-video platforms automatically.`
    : "";
  const systemPrompt = [brandIdentityPrompt ?? "", `You are an expert content strategist planning a ${episodeCount}-episode social media series for ${platformsLabel}.\nReturn ONLY valid JSON \u2014 no markdown, no preamble.`].filter(Boolean).join("\n\n");
  const userPrompt = `Plan a ${episodeCount}-episode content series.\n\nSeries title: ${title}\nTopic: ${topic}\n${goal ? `Goal: ${goal}` : ""}\n${audienceNotes ? `Target audience: ${audienceNotes}` : ""}\n${toneNotes ? `Tone guidance: ${toneNotes}` : ""}\nTarget platforms: ${platformsLabel}${videoNote}\n\nReturn this exact JSON structure:\n{\n  "series_summary": "1-2 sentence overview",\n  "episodes": [{\n    "position": 1,\n    "episode_title": "max 10 words",\n    "episode_angle": "key message (1-2 sentences)",\n    "episode_hook": "opening line (1 sentence)",\n    "cta_type": "question",\n    "recommended_format": "${validFormats[0]}",\n    "image_headline": "10-15 word pull quote",\n    "persona_label": "the audience persona this episode speaks to, e.g. \\"Priya — First-Time Investor\\" (or null)",\n    "avatar_preference": "preferred on-screen presenter / voice persona for this episode if any (or null)",\n    "persona_notes": "one sentence of persona / tone nuance for this episode (or null)"\n  }]\n}\n\ncta_type: question|link|save|share|comment\nrecommended_format: ${formatList}\n(Choose recommended_format ONLY from that list. It is a PREFERRED hint — each platform's final format is adapted automatically at fan-out, so pick the best primary format for this episode.)\npersona_label / avatar_preference / persona_notes: OPTIONAL audience-persona capture — set any to null if not applicable; do NOT invent a persona that conflicts with the series audience.\nReturn exactly ${episodeCount} episodes.`;
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

    // Stage 3.5a: selected platforms = series.platforms[] if present, else the singular series.platform.
    const selectedPlatforms: string[] = Array.isArray(series.platforms) && series.platforms.length > 0
      ? series.platforms
      : (series.platform ? [series.platform] : []);
    if (selectedPlatforms.length === 0) return jsonResponse({ ok: false, error: "no_target_platforms" }, 400);

    // Stage 3.5a: resolve capability-valid formats BEFORE moving the series to outline_pending,
    // so a capability failure leaves the series in its original status.
    const { data: capData, error: capErr } = await supabase.rpc("get_studio_capabilities", { p_client_id: series.client_id });
    if (capErr) throw new Error(`get_studio_capabilities_failed: ${capErr.message}`);
    const cap = resolveValidFormats(capData, selectedPlatforms);

    // Fail loud if no format is valid on ANY selected platform — never silently pick text.
    if (cap.validFormats.length === 0) {
      return jsonResponse({
        ok: false,
        error: "no_valid_format_for_platform_set",
        version: VERSION,
        detail: "no buildable+supported format is valid for ANY selected platform; adjust the platform selection or client eligibility",
        selected_platforms: selectedPlatforms,
        eligible_selected: cap.eligibleSelected,
        ineligible_selected: cap.ineligibleSelected,
        per_platform_valid: cap.perPlatformValid,
      }, 422);
    }

    await supabase.rpc("update_series_status", { p_series_id: seriesId, p_status: "outline_pending" });
    const { data: brandData } = await supabase.rpc("get_client_brand_for_series", { p_client_id: series.client_id });
    const brand = brandData as any; const model = brand?.model ?? "claude-sonnet-4-6";
    const platformsLabel = cap.eligibleSelected.join(", ") || selectedPlatforms.join(", ");
    const outline = await generateOutline({ apiKey: anthropicKey, model, title: series.title, topic: series.topic, goal: series.goal, audienceNotes: series.audience_notes, toneNotes: series.tone_notes, episodeCount: series.episode_count, platformsLabel, validFormats: cap.validFormats, videoOnlyInSet: cap.videoOnlyInSet, brandIdentityPrompt: brand?.brand_identity_prompt ?? null });
    const episodes = outline.episodes.slice(0, series.episode_count);

    // Stage 3.5a: validation whitelist is the resolver-driven valid set (NOT a hardcoded
    // text|image_quote|carousel). A model choice outside the valid set is clamped to the first
    // valid format (deterministic, capability-safe) — never to a hardcoded static format.
    const validSet = new Set(cap.validFormats);
    const fallbackFormat = cap.validFormats[0];
    const episodeRows = episodes.map((ep: any, i: number) => ({ client_id: series.client_id, position: Number(ep.position ?? (i + 1)), episode_title: String(ep.episode_title ?? "").trim(), episode_angle: String(ep.episode_angle ?? "").trim(), episode_hook: String(ep.episode_hook ?? "").trim(), cta_type: CTA_TYPES.includes(ep.cta_type) ? ep.cta_type : "question", recommended_format: validSet.has(ep.recommended_format) ? ep.recommended_format : fallbackFormat, image_headline: String(ep.image_headline ?? ep.episode_title ?? "").trim(), persona_label: cleanStr(ep.persona_label), avatar_preference: cleanStr(ep.avatar_preference), persona_notes: cleanStr(ep.persona_notes) }));

    const { error: saveErr } = await supabase.rpc("save_series_outline", { p_series_id: seriesId, p_series_summary: outline.series_summary ?? null, p_outline_json: episodes, p_episode_rows: episodeRows });
    if (saveErr) throw new Error(`save_series_outline_failed: ${saveErr.message}`);
    return jsonResponse({ ok: true, version: VERSION, series_id: seriesId, series_summary: outline.series_summary, episode_count: episodes.length, valid_formats: cap.validFormats, video_only_in_set: cap.videoOnlyInSet, episodes: episodeRows });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await supabase.rpc("update_series_status", { p_series_id: seriesId, p_status: "draft" });
    return jsonResponse({ ok: false, error: msg, version: VERSION }, 500);
  }
});
