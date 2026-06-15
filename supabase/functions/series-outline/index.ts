import { createClient } from "jsr:@supabase/supabase-js@2";

// series-outline v1.6.0
// v1.6.0 (Stage 1.5 — F-SERIES-AVATAR-DIFFERENTIATION, Hybrid narrator model; PK
//   approved Option C). ADDITIVE, OPT-IN, SHADOW-ONLY DOWNSTREAM. Adds a conservative
//   Multi-Perspective presenter mode to the outline generator while preserving the
//   default Brand Host behaviour byte-for-byte in the common case.
//   WHAT CHANGED vs v1.5.0:
//   (a) detectMultiPerspective(title, topic, goal, roles): a conservative detector.
//       It returns true ONLY when the topic/goal/title contains an explicit
//       multi-perspective signal phrase OR names >= 3 distinct active brand role
//       labels/codes. If unsure → false → Brand Host mode (unchanged path).
//   (b) When (and only when) multi-perspective is detected, fetch the client's ACTIVE
//       c.brand_stakeholder taxonomy (role_code / role_label / demographic_hint) via
//       the same read the ai-worker shadow suggester uses, and inject it into the
//       prompt with instructions to: keep persona_label = audience/subject; set
//       avatar_preference = a PRESENTER role drawn from the closed taxonomy, encoded
//       as "role_code=<code>; presenter=<plain English>"; vary the presenter role
//       across episodes where the topic supports it; never invent a role; fall back to
//       the brand host where no stakeholder presenter fits.
//   (c) Brand Host mode is the DEFAULT and is unchanged: same systemPrompt
//       (brand_identity_prompt + strategist line), same userPrompt persona block,
//       same "do NOT invent a persona that conflicts with the series audience" wording.
//   STRICTLY OUT OF SCOPE (unchanged): resolveValidFormats / UNION resolver, the
//   format whitelist + clamp, fail-loud, save_series_outline, the episode schema, and
//   ALL downstream gates. avatar_preference remains FREE TEXT in the same column; no
//   new DB column; no migration. Downstream this is SHADOW-ONLY: the ai-worker Stage 1
//   suggester reads avatar_preference and writes avatar_role_suggestion
//   (observability), but the CONSUMED stakeholder_role stays NULL, heygen-worker is
//   untouched, avatar selection stays fallback_limit1 to the A2-pinned host, and there
//   is NO render change. verify_jwt=false preserved.
//   v1.5.0 (Stage 2 — F-SERIES-FORMAT-DIVERSITY per-platform): resolveValidFormats now
//     returns the UNION of capability-valid formats across the eligible selected
//     platforms (a format is offered if valid on AT LEAST ONE), replacing the v1.3.0
//     INTERSECTION. The episode recommended_format is a PREFERRED hint; fan_out_episode
//     re-resolves the final per-platform format. Persona capture, save_series_outline,
//     the whitelist clamp, and all downstream gates UNCHANGED. verify_jwt=false.
//   v1.4.0 (persona capture — additive over v1.3.0): the outline prompt asks the model
//     for per-episode persona fields (persona_label / avatar_preference / persona_notes),
//     episodeRows maps them (cleanStr) so save_series_outline persists them. PERSONA IS
//     CAPTURED AS PLANNING INTENT ONLY.
//   v1.3.0 (Stage 3.5a — platform-aware outline): capability-aware resolver +
//     resolver-driven whitelist + fail-loud. Downstream gates unchanged.
//   v1.2.0 (prior): static text|image_quote|carousel clamp, singular platform.
const VERSION = "series-outline-v1.6.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-series-key", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
function jsonResponse(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
function nowIso() { return new Date().toISOString(); }
function getServiceClient() { const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (!url || !key) throw new Error("Missing credentials"); return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }); }
function safeParseJson<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } { try { return { ok: true, value: JSON.parse(raw) as T }; } catch (e: any) { return { ok: false, error: e?.message ?? "invalid_json" }; } }
// v1.4.0: sanitise a model-supplied persona string field -> trimmed string or null.
function cleanStr(v: unknown): string | null { const s = (v ?? "").toString().trim(); return s.length > 0 ? s : null; }

// Stage 3.5a: cta vocabulary is unchanged from v1.2.0.
const CTA_TYPES = ["question", "link", "save", "share", "comment"];

// ---------------------------------------------------------------------------
// v1.6.0 (Stage 1.5): brand stakeholder role type + conservative mode detector.
// ---------------------------------------------------------------------------
type BrandRole = { role_code: string; role_label: string; demographic_hint: string | null };

// Explicit multi-perspective SIGNAL PHRASES. Conservative: presence of any one of
// these in title/topic/goal is a strong opt-in signal. Matched case-insensitively on
// word/substring boundaries. Kept deliberately small and unambiguous.
const MULTI_PERSPECTIVE_SIGNALS = [
  "multi-perspective", "multi perspective", "multiple perspectives",
  "different perspectives", "different lenses", "different lens",
  "seven perspectives", "perspectives of", "perspective of each",
  "from the view of", "from the viewpoint of", "through the eyes of",
  "through the lens of", "each stakeholder", "different stakeholders",
  "stakeholder perspectives", "different avatars", "different presenters",
];

// v1.6.0: detect explicit opt-in Multi-Perspective mode. Two independent triggers:
//   (1) an explicit signal phrase appears in title/topic/goal; OR
//   (2) the combined text names >= 2 DISTINCT active brand role labels or codes.
// Conservative by design: if neither trigger fires, return false (Brand Host mode).
// Returns the matched roles (for telemetry/prompt) when triggered by role-naming.
function detectMultiPerspective(
  title: string | null, topic: string | null, goal: string | null, roles: BrandRole[],
): { multi: boolean; trigger: string; namedRoles: string[] } {
  const hay = [title ?? "", topic ?? "", goal ?? ""].join("\n").toLowerCase();
  if (!hay.trim()) return { multi: false, trigger: "empty", namedRoles: [] };

  // Trigger 1 — explicit signal phrase.
  for (const sig of MULTI_PERSPECTIVE_SIGNALS) {
    if (hay.includes(sig)) return { multi: true, trigger: `signal_phrase:${sig}`, namedRoles: [] };
  }

  // Trigger 2 — >= 3 distinct active brand roles named (by label or code).
  // Threshold is 3 (not 2) deliberately: a 2-role mention is frequently incidental
  // (e.g. "what a buyer's agent wishes first home buyers knew") or a single-narrator
  // comparison, and flipping those into presenter mode would be too broad. Explicit
  // multi-perspective REQUESTS are already caught by the signal phrases above, so the
  // role-count path only needs to catch genuine multi-stakeholder enumerations, which
  // in practice list 3+ roles. Conservative-by-design: when unsure, stay Brand Host.
  const named = new Set<string>();
  for (const r of roles) {
    const label = (r.role_label ?? "").toLowerCase().trim();
    const code = (r.role_code ?? "").toLowerCase().trim();
    const codeAsWords = code.replace(/_/g, " ");
    if (label && hay.includes(label)) { named.add(r.role_code); continue; }
    if (code && hay.includes(code)) { named.add(r.role_code); continue; }
    if (codeAsWords && hay.includes(codeAsWords)) { named.add(r.role_code); continue; }
  }
  if (named.size >= 3) return { multi: true, trigger: "role_naming", namedRoles: [...named] };

  return { multi: false, trigger: "none", namedRoles: [] };
}

// Stage 3.5a / Stage 2: resolve the set of episode formats offered to the outline,
// using public.get_studio_capabilities(client_id). UNCHANGED from v1.5.0.
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

  const unionSet = new Set<string>();
  for (const p of eligibleSelected) {
    for (const fmt of (perPlatformValid[p] ?? [])) unionSet.add(fmt);
  }
  let validFormats: string[] = [...unionSet];
  validFormats.sort();
  return { validFormats, videoOnlyInSet, eligibleSelected, ineligibleSelected, perPlatformValid };
}

async function generateOutline(opts: { apiKey: string; model: string; title: string; topic: string; goal: string | null; audienceNotes: string | null; toneNotes: string | null; episodeCount: number; platformsLabel: string; validFormats: string[]; videoOnlyInSet: boolean; brandIdentityPrompt: string | null; multiPerspective: boolean; brandRoles: BrandRole[] }): Promise<{ series_summary: string; episodes: any[] }> {
  const { apiKey, model, title, topic, goal, audienceNotes, toneNotes, episodeCount, platformsLabel, validFormats, videoOnlyInSet, brandIdentityPrompt, multiPerspective, brandRoles } = opts;
  const formatList = validFormats.join("|");
  const videoNote = videoOnlyInSet
    ? `\nIMPORTANT: this series includes a video-only platform (e.g. YouTube). Prefer a video format for recommended_format so the video platform is served well; fan-out adapts the non-video platforms automatically.`
    : "";
  const systemPrompt = [brandIdentityPrompt ?? "", `You are an expert content strategist planning a ${episodeCount}-episode social media series for ${platformsLabel}.\nReturn ONLY valid JSON \u2014 no markdown, no preamble.`].filter(Boolean).join("\n\n");

  // v1.6.0: the persona-field instruction block is mode-dependent. DEFAULT (Brand
  // Host) is byte-identical to v1.5.0. MULTI-PERSPECTIVE injects the closed role
  // taxonomy and a presenter-diversity instruction; avatar_preference becomes a
  // role-encoded presenter intent ("role_code=<code>; presenter=<plain English>").
  const personaInstruction = (!multiPerspective || brandRoles.length === 0)
    ? `persona_label / avatar_preference / persona_notes: OPTIONAL audience-persona capture — set any to null if not applicable; do NOT invent a persona that conflicts with the series audience.`
    : [
        `MULTI-PERSPECTIVE PRESENTER MODE is ON for this series (an explicit multi-perspective request was detected).`,
        `Available presenter roles for this brand (choose ONLY from this closed set; never invent a role):`,
        brandRoles.map(r => `- role_code=${r.role_code} (${r.role_label})${r.demographic_hint ? ` — ${r.demographic_hint}` : ""}`).join("\n"),
        `For each episode:`,
        `- persona_label = the AUDIENCE / subject the episode speaks to (who is watching).`,
        `- avatar_preference = the PRESENTER who delivers this episode, encoded EXACTLY as: "role_code=<one code from the list>; presenter=<plain-English description of that presenter>". Keep the brand voice as overall framing, but the presenter role MAY differ from the default brand host.`,
        `- VARY the presenter role across episodes where the topic supports distinct stakeholder viewpoints. Do not collapse every episode to the same role unless the topic genuinely calls for it.`,
        `- If no stakeholder presenter fits an episode, set avatar_preference to "role_code=brand_host; presenter=<the default brand host>" and keep the brand's default voice.`,
        `- persona_notes = one sentence of tone/nuance.`,
        `Do NOT invent role codes outside the list above (the only extra allowed value is brand_host).`,
      ].join("\n");

  const userPrompt = `Plan a ${episodeCount}-episode content series.\n\nSeries title: ${title}\nTopic: ${topic}\n${goal ? `Goal: ${goal}` : ""}\n${audienceNotes ? `Target audience: ${audienceNotes}` : ""}\n${toneNotes ? `Tone guidance: ${toneNotes}` : ""}\nTarget platforms: ${platformsLabel}${videoNote}\n\nReturn this exact JSON structure:\n{\n  "series_summary": "1-2 sentence overview",\n  "episodes": [{\n    "position": 1,\n    "episode_title": "max 10 words",\n    "episode_angle": "key message (1-2 sentences)",\n    "episode_hook": "opening line (1 sentence)",\n    "cta_type": "question",\n    "recommended_format": "${validFormats[0]}",\n    "image_headline": "10-15 word pull quote",\n    "persona_label": "the audience persona this episode speaks to, e.g. \\"Priya — First-Time Investor\\" (or null)",\n    "avatar_preference": "preferred on-screen presenter / voice persona for this episode if any (or null)",\n    "persona_notes": "one sentence of persona / tone nuance for this episode (or null)"\n  }]\n}\n\ncta_type: question|link|save|share|comment\nrecommended_format: ${formatList}\n(Choose recommended_format ONLY from that list. It is a PREFERRED hint — each platform's final format is adapted automatically at fan-out, so pick the best primary format for this episode.)\n${personaInstruction}\nReturn exactly ${episodeCount} episodes.`;
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

    const selectedPlatforms: string[] = Array.isArray(series.platforms) && series.platforms.length > 0
      ? series.platforms
      : (series.platform ? [series.platform] : []);
    if (selectedPlatforms.length === 0) return jsonResponse({ ok: false, error: "no_target_platforms" }, 400);

    const { data: capData, error: capErr } = await supabase.rpc("get_studio_capabilities", { p_client_id: series.client_id });
    if (capErr) throw new Error(`get_studio_capabilities_failed: ${capErr.message}`);
    const cap = resolveValidFormats(capData, selectedPlatforms);

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

    // v1.6.0 (Stage 1.5): fetch the active brand role taxonomy ONLY to run the
    // conservative detector. Read-only; same shape the ai-worker shadow suggester
    // reads. If this read fails for any reason, fall back to Brand Host mode (the
    // detector receives [] and returns multi=false) — NEVER block outline generation.
    let brandRoles: BrandRole[] = [];
    try {
      const { data: roleRows } = await supabase.rpc("exec_sql", {
        query: `SELECT role_code, role_label, COALESCE(demographic_hint, '') AS demographic_hint
                FROM c.brand_stakeholder
                WHERE client_id = '${series.client_id}' AND is_active = true
                ORDER BY sort_order ASC, role_code ASC`,
      });
      brandRoles = ((roleRows ?? []) as any[]).map(r => ({ role_code: r.role_code, role_label: r.role_label, demographic_hint: r.demographic_hint || null }));
    } catch (_e) { brandRoles = []; }

    const mp = detectMultiPerspective(series.title, series.topic, series.goal, brandRoles);

    const outline = await generateOutline({ apiKey: anthropicKey, model, title: series.title, topic: series.topic, goal: series.goal, audienceNotes: series.audience_notes, toneNotes: series.tone_notes, episodeCount: series.episode_count, platformsLabel, validFormats: cap.validFormats, videoOnlyInSet: cap.videoOnlyInSet, brandIdentityPrompt: brand?.brand_identity_prompt ?? null, multiPerspective: mp.multi, brandRoles });
    const episodes = outline.episodes.slice(0, series.episode_count);

    const validSet = new Set(cap.validFormats);
    const fallbackFormat = cap.validFormats[0];
    const episodeRows = episodes.map((ep: any, i: number) => ({ client_id: series.client_id, position: Number(ep.position ?? (i + 1)), episode_title: String(ep.episode_title ?? "").trim(), episode_angle: String(ep.episode_angle ?? "").trim(), episode_hook: String(ep.episode_hook ?? "").trim(), cta_type: CTA_TYPES.includes(ep.cta_type) ? ep.cta_type : "question", recommended_format: validSet.has(ep.recommended_format) ? ep.recommended_format : fallbackFormat, image_headline: String(ep.image_headline ?? ep.episode_title ?? "").trim(), persona_label: cleanStr(ep.persona_label), avatar_preference: cleanStr(ep.avatar_preference), persona_notes: cleanStr(ep.persona_notes) }));

    const { error: saveErr } = await supabase.rpc("save_series_outline", { p_series_id: seriesId, p_series_summary: outline.series_summary ?? null, p_outline_json: episodes, p_episode_rows: episodeRows });
    if (saveErr) throw new Error(`save_series_outline_failed: ${saveErr.message}`);
    return jsonResponse({ ok: true, version: VERSION, series_id: seriesId, series_summary: outline.series_summary, episode_count: episodes.length, valid_formats: cap.validFormats, video_only_in_set: cap.videoOnlyInSet, narrator_mode: mp.multi ? "multi_perspective" : "brand_host", narrator_mode_trigger: mp.trigger, episodes: episodeRows });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await supabase.rpc("update_series_status", { p_series_id: seriesId, p_status: "draft" });
    return jsonResponse({ ok: false, error: msg, version: VERSION }, 500);
  }
});
