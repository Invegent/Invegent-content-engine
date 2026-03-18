# Visual Pipeline V1 — Build Spec
**Date:** 19 March 2026  
**Decision refs:** D027, D028, D029  
**Schema migration:** Already applied — `20260319_visual_pipeline_schema.sql`  
**Storage buckets:** `brand-assets` (PUBLIC) + `post-images` (PUBLIC) — already created  

---

## What this build delivers

Three coordinated changes:

1. **ai-worker v2.3.0** — extend JSON output to include `recommended_format`, `recommended_reason`, `image_headline`. Write these fields to `m.post_draft` after generation.

2. **image-worker v1.0.0** — new Edge Function. Polls every 15 min. Picks up approved drafts with pending images. Renders branded PNG via SVG + Resvg WASM. Uploads to Supabase Storage. Updates draft.

3. **publisher v1.3.0** — when a draft has `image_url` set, post as a photo to Facebook instead of plain text feed post.

---

## Part 1 — ai-worker v2.3.0

**File:** `supabase/functions/ai-worker/index.ts`

### What changes

**A. Output schema hint — add 3 new fields**

In `assemblePrompts()`, find the `outputSchema` variable. Update it to:

```typescript
const outputSchema = ctPrompt?.output_schema_hint ??
  `Return ONLY valid JSON with these exact fields:
{
  "title": string,           // 8-12 word post headline
  "body": string,            // full post body text
  "recommended_format": string,  // one of: "text" | "image_quote" | "carousel"
  "recommended_reason": string,  // one sentence explaining the format choice
  "image_headline": string,      // 10-15 word pull quote for image overlay (required even if format is text)
  "meta": object             // any extra metadata
}

Format selection rules:
- "image_quote": post contains a strong single stat, insight, quote, or tip that stands alone visually
- "carousel": post has 4 or more distinct structured points that benefit from separate slides
- "text": conversational post, news reaction, opinion, or engagement question — no strong visual anchor`;
```

**B. Validation — add new fields to guard**

In `callClaude()` and `callOpenAI()`, after the existing `if (!parsed.value?.title || !parsed.value?.body)` check, the functions currently throw. Update the return type and return the new fields:

In `callClaude()`, update the return statement:
```typescript
return {
  title: String(parsed.value.title).trim(),
  body: String(parsed.value.body).trim(),
  recommendedFormat: String(parsed.value.recommended_format ?? 'text').trim(),
  recommendedReason: String(parsed.value.recommended_reason ?? '').trim(),
  imageHeadline: String(parsed.value.image_headline ?? '').trim(),
  meta: parsed.value.meta ?? {},
  inputTokens: Number(usage.input_tokens ?? 0),
  outputTokens: Number(usage.output_tokens ?? 0),
};
```

Do the same in `callOpenAI()`.

**C. Write new fields to post_draft**

In the main job loop, find the `post_draft` update block. Add the three new fields:

```typescript
await supabase.schema("m").from("post_draft").update({
  draft_title: result.title,
  draft_body: result.body,
  draft_format: draftMeta,
  approval_status: "needs_review",
  recommended_format: result.recommendedFormat,
  recommended_reason: result.recommendedReason,
  image_headline: result.imageHeadline,
  // image_status stays 'pending' (default) — image-worker picks it up after approval
  updated_at: nowIso(),
}).eq("post_draft_id", job.post_draft_id);
```

**D. Update VERSION** to `"ai-worker-v2.3.0"`

---

## Part 2 — image-worker v1.0.0

**File:** `supabase/functions/image-worker/index.ts` ← **new file**

### Full implementation

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";
import { initWasm, Resvg } from "npm:@resvg/resvg-wasm";

const VERSION = "image-worker-v1.0.0";

// Initialise Resvg WASM once at cold start
let wasmInitialised = false;
async function ensureWasm() {
  if (wasmInitialised) return;
  // Fetch the WASM binary from the npm CDN
  const wasmResp = await fetch(
    "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm/index_bg.wasm"
  );
  const wasmBuf = await wasmResp.arrayBuffer();
  await initWasm(wasmBuf);
  wasmInitialised = true;
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function nowIso() { return new Date().toISOString(); }

// ─────────────────────────────────────────────────────────────────
// SVG Quote Card Template
// 1080x1080 px — square format for Facebook/LinkedIn
// ─────────────────────────────────────────────────────────────────

function buildQuoteCardSvg(opts: {
  headline: string;
  clientName: string;
  primaryColour: string;
  secondaryColour: string;
  logoBase64: string | null;  // null if logo not available
}): string {
  const { headline, clientName, primaryColour, secondaryColour, logoBase64 } = opts;

  // Word-wrap headline at ~35 chars per line
  const words = headline.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > 35 && current.length > 0) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());

  // Build tspan elements for multi-line headline
  const lineHeight = 72;
  const startY = 420 - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines.map((line, i) =>
    `<tspan x="540" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join("");

  const logoElement = logoBase64
    ? `<image x="40" y="40" width="120" height="120" href="data:image/png;base64,${logoBase64}" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="60" y="110" font-family="Arial, sans-serif" font-size="28" fill="${secondaryColour}" font-weight="bold">${escapeXml(clientName)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1080" viewBox="0 0 1080 1080">
  <!-- Background -->
  <rect width="1080" height="1080" fill="${primaryColour}"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="1080" height="8" fill="${secondaryColour}"/>

  <!-- Bottom accent bar -->
  <rect x="0" y="1072" width="1080" height="8" fill="${secondaryColour}"/>

  <!-- Left accent line -->
  <rect x="60" y="200" width="6" height="680" fill="${secondaryColour}" opacity="0.6"/>

  <!-- Logo or client name -->
  ${logoElement}

  <!-- Opening quote mark -->
  <text x="540" y="${startY - 80}" 
    font-family="Georgia, serif" 
    font-size="120" 
    fill="${secondaryColour}" 
    opacity="0.4"
    text-anchor="middle">"</text>

  <!-- Headline text -->
  <text 
    x="540" 
    y="${startY}"
    font-family="Arial, sans-serif"
    font-size="58"
    font-weight="bold"
    fill="#FFFFFF"
    text-anchor="middle"
    dominant-baseline="middle">${tspans}</text>

  <!-- Divider line -->
  <line x1="400" y1="${startY + (lines.length - 1) * lineHeight + 80}" x2="680" y2="${startY + (lines.length - 1) * lineHeight + 80}" stroke="${secondaryColour}" stroke-width="2" opacity="0.7"/>

  <!-- Client name footer -->
  <text 
    x="540" 
    y="980"
    font-family="Arial, sans-serif"
    font-size="32"
    fill="#D9E1E6"
    text-anchor="middle"
    opacity="0.8">${escapeXml(clientName)}</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─────────────────────────────────────────────────────────────────
// Fetch logo from Storage URL and convert to base64
// Returns null if fetch fails — image renders without logo
// ─────────────────────────────────────────────────────────────────

async function fetchLogoBase64(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    const resp = await fetch(logoUrl);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth gate — same pattern as other workers
  const expected = Deno.env.get("IMAGE_WORKER_API_KEY");
  const provided = req.headers.get("x-image-worker-key");
  if (!expected) return jsonResponse({ ok: false, error: "IMAGE_WORKER_API_KEY_not_set" }, 500);
  if (req.method !== "GET" && (!provided || provided !== expected)) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  // Health check
  const url = new URL(req.url);
  if (url.pathname.endsWith("/health") || req.method === "GET") {
    return jsonResponse({ ok: true, function: "image-worker", version: VERSION });
  }

  const supabase = getServiceClient();
  const results: any[] = [];

  try {
    await ensureWasm();

    // 1) Find approved drafts needing image generation
    //    Join to client_publish_profile to check image_generation_enabled
    //    Join to client_brand_profile to get brand colours + logo
    const { data: drafts, error: draftsErr } = await supabase
      .schema("m")
      .from("post_draft")
      .select(`
        post_draft_id,
        client_id,
        image_headline,
        recommended_format,
        approval_status,
        image_status
      `)
      .eq("approval_status", "approved")
      .eq("image_status", "pending")
      .in("recommended_format", ["image_quote", "carousel"])
      .limit(10);

    if (draftsErr) throw new Error(`fetch_drafts_failed: ${draftsErr.message}`);
    if (!drafts || drafts.length === 0) {
      return jsonResponse({ ok: true, message: "no_drafts_pending", version: VERSION });
    }

    for (const draft of drafts) {
      try {
        // 2) Check image_generation_enabled for this client
        const { data: pubProfile } = await supabase
          .schema("c")
          .from("client_publish_profile")
          .select("image_generation_enabled")
          .eq("client_id", draft.client_id)
          .eq("platform", "facebook")
          .limit(1)
          .maybeSingle();

        if (!pubProfile?.image_generation_enabled) {
          // Skip and mark as skipped — client hasn't enabled image generation
          await supabase.schema("m").from("post_draft")
            .update({ image_status: "skipped", updated_at: nowIso() })
            .eq("post_draft_id", draft.post_draft_id);
          results.push({ post_draft_id: draft.post_draft_id, status: "skipped", reason: "image_generation_disabled" });
          continue;
        }

        // 3) Load brand profile
        const { data: brand } = await supabase
          .schema("c")
          .from("client_brand_profile")
          .select("brand_colour_primary, brand_colour_secondary, brand_logo_url, brand_name")
          .eq("client_id", draft.client_id)
          .limit(1)
          .maybeSingle();

        const primaryColour = brand?.brand_colour_primary ?? "#0A2A4A";
        const secondaryColour = brand?.brand_colour_secondary ?? "#1C8A8A";
        const logoUrl = brand?.brand_logo_url ?? null;
        const clientName = brand?.brand_name ?? "";

        // Also get client slug for storage path
        const { data: client } = await supabase
          .schema("c")
          .from("client")
          .select("client_slug")
          .eq("client_id", draft.client_id)
          .limit(1)
          .maybeSingle();

        const clientSlug = client?.client_slug ?? draft.client_id;

        // 4) Get image headline — fall back to a generic string if missing
        const headline = draft.image_headline?.trim() ||
          "Insights for NDIS providers and allied health professionals";

        // 5) Fetch logo as base64
        const logoBase64 = await fetchLogoBase64(logoUrl);

        // 6) Build SVG
        const svg = buildQuoteCardSvg({
          headline,
          clientName,
          primaryColour,
          secondaryColour,
          logoBase64,
        });

        // 7) Render SVG → PNG via Resvg WASM
        const resvg = new Resvg(svg, {
          fitTo: { mode: "width", value: 1080 },
        });
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        // 8) Upload PNG to Supabase Storage
        const storagePath = `${clientSlug}/${draft.post_draft_id}.png`;
        const { error: uploadErr } = await supabase.storage
          .from("post-images")
          .upload(storagePath, pngBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadErr) throw new Error(`storage_upload_failed: ${uploadErr.message}`);

        // 9) Build public URL
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const imageUrl = `${supabaseUrl}/storage/v1/object/public/post-images/${storagePath}`;

        // 10) Update post_draft with image URL and status
        await supabase.schema("m").from("post_draft")
          .update({
            image_url: imageUrl,
            image_status: "generated",
            updated_at: nowIso(),
          })
          .eq("post_draft_id", draft.post_draft_id);

        results.push({
          post_draft_id: draft.post_draft_id,
          status: "generated",
          image_url: imageUrl,
          headline_used: headline,
        });

      } catch (draftErr: any) {
        const msg = (draftErr?.message ?? String(draftErr)).slice(0, 2000);
        // Mark as failed so image-worker doesn't retry endlessly
        await supabase.schema("m").from("post_draft")
          .update({ image_status: "failed", updated_at: nowIso() })
          .eq("post_draft_id", draft.post_draft_id);
        results.push({ post_draft_id: draft.post_draft_id, status: "failed", error: msg });
      }
    }

  } catch (e: any) {
    return jsonResponse({ ok: false, error: e?.message ?? String(e), version: VERSION }, 500);
  }

  return jsonResponse({
    ok: true,
    version: VERSION,
    processed: results.length,
    results,
  });
});
```

---

## Part 3 — publisher v1.3.0

**File:** `supabase/functions/publisher/index.ts`

### What changes

**A. New helper function — fbPostWithPhoto**

Add this function alongside the existing `fbPostToFeed`:

```typescript
async function fbPostWithPhoto(opts: {
  graphVersion: string;
  pageId: string;
  pageToken: string;
  message: string;
  imageUrl: string;
}) {
  const { graphVersion, pageId, pageToken, message, imageUrl } = opts;

  // Facebook /photos endpoint publishes image + caption as a single post
  const url = `https://graph.facebook.com/${graphVersion}/${pageId}/photos`;
  const body = new URLSearchParams();
  body.set("caption", message);
  body.set("url", imageUrl);          // Facebook fetches image from this URL
  body.set("access_token", pageToken);

  const resp = await fetch(url, { method: "POST", body });
  const text = await resp.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

  if (!resp.ok) {
    throw new Error(`facebook_photo_http_${resp.status}: ${text.slice(0, 1200)}`);
  }
  if (!parsed?.id) {
    throw new Error(`facebook_photo_missing_post_id: ${text.slice(0, 1200)}`);
  }

  return parsed; // { id: "...", post_id: "..." }
}
```

**B. Load image_url from draft**

In the draft loading step (step 3 in the main loop), extend the select to include the new fields:

```typescript
const { data: draft, error: draftErr } = await supabase
  .schema("m")
  .from("post_draft")
  .select("post_draft_id, draft_title, draft_body, approval_status, image_url, image_status")
  .eq("post_draft_id", q.post_draft_id)
  .maybeSingle();
```

**C. Use photo endpoint when image_url is set**

Replace the existing step 8 publish block:

```typescript
// 8) Publish — use photo endpoint if image is ready, otherwise plain feed post
const hasImage = draft.image_url && draft.image_status === "generated";

let fbResp: any;
let publishMethod: string;

if (hasImage) {
  fbResp = await fbPostWithPhoto({
    graphVersion,
    pageId,
    pageToken,
    message: msg,
    imageUrl: draft.image_url!,
  });
  publishMethod = "photo";
} else {
  fbResp = await fbPostToFeed({ graphVersion, pageId, pageToken, message: msg });
  publishMethod = "feed";
}

const platformPostId = fbResp?.id ?? fbResp?.post_id ?? null;
```

Update the publish log insert to include `publish_method`:

```typescript
request_payload: { 
  endpoint: hasImage ? `/${pageId}/photos` : `/${pageId}/feed`,
  graph_version: graphVersion, 
  dry_run: false, 
  message_len: msg.length, 
  token_source: tokenSource,
  publish_method: publishMethod,
  has_image: hasImage,
},
```

**D. Update VERSION** to `"publisher-v1.3.0"`

---

## Part 4 — pg_cron job for image-worker

After deploying the image-worker Edge Function, add a pg_cron schedule.

Run this SQL in Supabase SQL Editor:

```sql
-- image-worker: every 15 minutes
SELECT cron.schedule(
  'image-worker-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/image-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-image-worker-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'IMAGE_WORKER_API_KEY')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## Part 5 — Supabase secrets to add

In Supabase Dashboard → Edge Functions → Secrets, add:

```
IMAGE_WORKER_API_KEY = <generate a random 32-char string>
```

---

## Part 6 — Deploy order

1. Add `IMAGE_WORKER_API_KEY` secret in Supabase
2. Deploy `ai-worker` (v2.3.0)
3. Deploy `image-worker` (v1.0.0) — new function
4. Deploy `publisher` (v1.3.0)
5. Add pg_cron job for image-worker
6. Test: manually approve one NDIS Yarns draft, wait 15 min, check `image_status = 'generated'` on the draft row, check `post-images` bucket for the PNG

---

## Verification queries (run after deploy)

```sql
-- Check image-worker picked up a draft
SELECT post_draft_id, image_status, image_url, recommended_format, image_headline
FROM m.post_draft
WHERE image_status IN ('generated', 'failed', 'skipped')
ORDER BY updated_at DESC
LIMIT 10;

-- Check image_generation_enabled for NDIS Yarns
SELECT client_id, platform, image_generation_enabled, preferred_format_facebook
FROM c.client_publish_profile
WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4';
```

---

## Notes for Claude Code

- The `@resvg/resvg-wasm` package must be imported from npm: `npm:@resvg/resvg-wasm`
- The WASM binary is fetched from jsdelivr CDN at cold start — this is the same pattern used by Supabase's own OG image examples
- The `post-images` and `brand-assets` Storage buckets are already created and set to PUBLIC in production
- NDIS Yarns brand profile already seeded: primary `#0A2A4A`, secondary `#1C8A8A`, logo URL set
- `image_generation_enabled = true` already set for NDIS Yarns Facebook profile
- Do not change any existing SQL schema — migration was already applied
- The `c` schema is not exposed via PostgREST — always use `supabase.schema("c").from(...)` with service role key
