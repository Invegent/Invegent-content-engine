import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm";

// image-worker v1.0.2
// Fix: use Unicode chars directly in SVG — HTML entities (&ldquo; etc) are invalid XML
// Fix: pass fetch() Promise directly to initWasm() for Deno Edge Function cold start
const VERSION = "image-worker-v1.0.2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-image-worker-key" };
function jsonResponse(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
function nowIso() { return new Date().toISOString(); }
function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let wasmInitialised = false;
async function ensureWasm() {
  if (wasmInitialised) return;
  await initWasm(fetch("https://esm.sh/@resvg/resvg-wasm@2.4.1/index_bg.wasm"));
  wasmInitialised = true;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function buildQuoteCardSvg(opts: { headline: string; clientName: string; primaryColour: string; secondaryColour: string; logoBase64: string | null }): string {
  const { headline, clientName, primaryColour, secondaryColour, logoBase64 } = opts;
  const words = headline.split(" "); const lines: string[] = []; let current = "";
  for (const word of words) { const candidate = current ? `${current} ${word}` : word; if (candidate.length > 32 && current.length > 0) { lines.push(current); current = word; } else { current = candidate; } }
  if (current) lines.push(current);
  const lineHeight = 70; const totalTextHeight = lines.length * lineHeight; const textStartY = 540 - totalTextHeight / 2;
  const tspans = lines.map((line, i) => `<tspan x="540" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("");
  const logoElement = logoBase64 ? `<image x="44" y="44" width="100" height="100" href="data:image/png;base64,${logoBase64}" preserveAspectRatio="xMidYMid meet"/>` : `<text x="60" y="108" font-family="Arial, sans-serif" font-size="26" fill="${secondaryColour}" font-weight="bold">${escapeXml(clientName)}</text>`;
  const quoteY = textStartY - 90; const dividerY = textStartY + totalTextHeight + 60;
  // Unicode \u201C = left double quote — valid in SVG XML, no HTML entity needed
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${primaryColour}"/>
  <rect x="0" y="0" width="1080" height="8" fill="${secondaryColour}"/>
  <rect x="0" y="1072" width="1080" height="8" fill="${secondaryColour}"/>
  <rect x="60" y="180" width="5" height="720" fill="${secondaryColour}" opacity="0.5"/>
  ${logoElement}
  <text x="540" y="${quoteY}" font-family="Georgia, serif" font-size="140" fill="${secondaryColour}" opacity="0.35" text-anchor="middle">“</text>
  <text x="540" y="${textStartY}" font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="bold" fill="#FFFFFF" text-anchor="middle" dominant-baseline="hanging">${tspans}</text>
  <line x1="380" y1="${dividerY}" x2="700" y2="${dividerY}" stroke="${secondaryColour}" stroke-width="2" opacity="0.6"/>
  <text x="540" y="1020" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#D9E1E6" text-anchor="middle" opacity="0.75">${escapeXml(clientName)}</text>
</svg>`;
}

async function fetchLogoBase64(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;
  try { const resp = await fetch(logoUrl); if (!resp.ok) return null; const buf = await resp.arrayBuffer(); const bytes = new Uint8Array(buf); let binary = ""; for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]); return btoa(binary); }
  catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === "GET") return jsonResponse({ ok: true, function: "image-worker", version: VERSION });
  const expected = Deno.env.get("PUBLISHER_API_KEY"); const provided = req.headers.get("x-image-worker-key");
  if (!expected) return jsonResponse({ ok: false, error: "PUBLISHER_API_KEY_not_set" }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  const supabase = getServiceClient(); const results: any[] = [];
  try {
    await ensureWasm();
    const { data: drafts, error: draftsErr } = await supabase.schema("m").from("post_draft").select("post_draft_id, client_id, image_headline, recommended_format, approval_status, image_status").eq("approval_status", "approved").eq("image_status", "pending").in("recommended_format", ["image_quote", "carousel"]).limit(10);
    if (draftsErr) throw new Error(`fetch_drafts_failed: ${draftsErr.message}`);
    if (!drafts || drafts.length === 0) return jsonResponse({ ok: true, message: "no_drafts_pending", version: VERSION });
    for (const draft of drafts) {
      try {
        const { data: pubProfile } = await supabase.schema("c").from("client_publish_profile").select("image_generation_enabled").eq("client_id", draft.client_id).eq("platform", "facebook").limit(1).maybeSingle();
        if (!pubProfile?.image_generation_enabled) { await supabase.schema("m").from("post_draft").update({ image_status: "skipped", updated_at: nowIso() }).eq("post_draft_id", draft.post_draft_id); results.push({ post_draft_id: draft.post_draft_id, status: "skipped" }); continue; }
        const { data: brand } = await supabase.schema("c").from("client_brand_profile").select("brand_colour_primary, brand_colour_secondary, brand_logo_url, brand_name").eq("client_id", draft.client_id).limit(1).maybeSingle();
        const primaryColour = brand?.brand_colour_primary ?? "#0A2A4A"; const secondaryColour = brand?.brand_colour_secondary ?? "#1C8A8A"; const logoUrl = brand?.brand_logo_url ?? null; const clientName = brand?.brand_name ?? "";
        const { data: client } = await supabase.schema("c").from("client").select("client_slug").eq("client_id", draft.client_id).limit(1).maybeSingle();
        const clientSlug = client?.client_slug ?? draft.client_id;
        const headline = (draft.image_headline ?? "").trim() || "Insights for NDIS providers and allied health professionals";
        const logoBase64 = await fetchLogoBase64(logoUrl);
        const svg = buildQuoteCardSvg({ headline, clientName, primaryColour, secondaryColour, logoBase64 });
        const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1080 } });
        const pngData = resvg.render(); const pngBuffer = pngData.asPng();
        const storagePath = `${clientSlug}/${draft.post_draft_id}.png`;
        const { error: uploadErr } = await supabase.storage.from("post-images").upload(storagePath, pngBuffer, { contentType: "image/png", upsert: true });
        if (uploadErr) throw new Error(`storage_upload_failed: ${uploadErr.message}`);
        const imageUrl = `${Deno.env.get("SUPABASE_URL") ?? ""}/storage/v1/object/public/post-images/${storagePath}`;
        await supabase.schema("m").from("post_draft").update({ image_url: imageUrl, image_status: "generated", updated_at: nowIso() }).eq("post_draft_id", draft.post_draft_id);
        results.push({ post_draft_id: draft.post_draft_id, status: "generated", image_url: imageUrl });
      } catch (draftErr: any) {
        const msg = (draftErr?.message ?? String(draftErr)).slice(0, 2000);
        console.error(`[image-worker] draft ${draft.post_draft_id} failed:`, msg);
        await supabase.schema("m").from("post_draft").update({ image_status: "failed", updated_at: nowIso() }).eq("post_draft_id", draft.post_draft_id);
        results.push({ post_draft_id: draft.post_draft_id, status: "failed", error: msg });
      }
    }
  } catch (e: any) { const msg = e?.message ?? String(e); console.error("[image-worker] top-level error:", msg); return jsonResponse({ ok: false, error: msg, version: VERSION }, 500); }
  return jsonResponse({ ok: true, version: VERSION, processed: results.length, results });
});
