// tmr_smoke.ts — TMR G2 template-proof SMOKE branch (image-worker).
//
// Isolated, opt-in, NON-PRODUCTION smoke render for the TMR Template Proof Lifecycle.
// Renders the governed inventory CANDIDATE Creatomate template
//   490ad9ea-7473-49e4-9d3c-e1ae8a12d790  (news_quote_insight_1x1_v1, 1080x1080)
// with FIXED SYNTHETIC placeholder data, writing ONLY under `_smoke/tmr/...` in the
// `post-images` bucket. It proves the template can physically render — NOT brand
// correctness, asset suitability, platform safety, or production readiness.
//
// HARD INVARIANTS (this module):
//   - Runs ONLY when body.mode === 'tmr_template_smoke' AND
//     body.provider_template_id === TMR_SMOKE_TEMPLATE_ID AND body.synthetic_only === true.
//   - Fixed synthetic modifications ONLY — NO client-supplied modifications/template/
//     storage_path/background_url/logo_url/raw-payload passthrough (rejected 400).
//   - NEVER a real/brand/stock/AI-production/prior-output asset: the Background + Logo
//     sources are NEUTRAL synthetic placeholder PNGs generated IN-CODE at execution time
//     and uploaded under `_smoke/tmr/.../inputs/`. NO client_brand_profile, NO
//     brand-assets/client-assets bucket, NO prior post-images/post-videos output, NO
//     m.post_render_log.storage_url, NO m.post_publish asset.
//   - Writes NO m.post_render_log (uses renderUploadSmokeNoLog — never calls
//     write_render_log), NO m.post_publish, NO draft, NO proof event; calls NO
//     record_tmr_proof_event; publishes/enables/binds NOTHING.
//   - The CREATOMATE_API_KEY stays inside the EF: passed in as `creatomateKey`, never
//     logged, never returned, never embedded in the response.
//   - Returns safe evidence only (ids/labels/paths) — never the API key, raw provider
//     payload, secret-bearing URL, or any production/render-log/publish/draft id.
//
// Mirrors the isolation style of manual_render.ts / branch_b_proof.ts. The production
// renderUploadAndLog in index.ts is NOT reused and NOT modified (byte-unchanged) — the
// no-log helper duplicates ONLY the render+poll+upload code and intentionally omits the
// log write, to keep this branch physically incapable of writing a render-log row.

// Minimal structural type for the service client — only the storage surface this branch
// uses. Kept structural (not `ReturnType<typeof createClient>`) so this module stays
// decoupled from the exact supabase-js generic shape used by index.ts's getServiceClient.
type SmokeSupabase = {
  storage: {
    from: (bucket: string) => {
      upload: (path: string, body: ArrayBuffer | Uint8Array, opts: { contentType: string; upsert: boolean }) => Promise<{ error: { message: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

export const TMR_SMOKE_MODE = 'tmr_template_smoke';
export const TMR_SMOKE_TEMPLATE_ID = '490ad9ea-7473-49e4-9d3c-e1ae8a12d790';
export const TMR_SMOKE_TEMPLATE_NAME = 'news_quote_insight_1x1_v1';

const CREATOMATE_API = 'https://api.creatomate.com/v2/renders';
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 30;
const SMOKE_BUCKET = 'post-images';
const SMOKE_PREFIX = `_smoke/tmr/${TMR_SMOKE_TEMPLATE_NAME}`;

// Request fields the branch allows. ANY other field on the body → reject (no passthrough).
const ALLOWED_REQUEST_FIELDS = new Set([
  'mode',
  'provider_template_id',
  'provider_template_name',
  'run_label',
  'synthetic_only',
]);
// Explicit deny-list of override/passthrough surfaces (defence-in-depth over the allow-list).
const FORBIDDEN_REQUEST_FIELDS = [
  'modifications', 'template', 'storage_path', 'publish', 'proof', 'draft',
  'background_url', 'logo_url', 'raw', 'raw_payload', 'output_format', 'elements',
];

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// true iff this is a TMR smoke request (mode gate only — deeper guards run in handler).
export function isTmrSmokeRequest(body: any): boolean {
  return body?.mode === TMR_SMOKE_MODE;
}

// ── Neutral synthetic placeholder PNGs (R1) ─────────────────────────────────────
// Hardcoded, in-code, brand-free solid-colour PNGs decoded at execution time. These are
// the ONLY image sources this branch will ever use for Background/Logo. They are NOT and
// MUST NEVER be a real, brand, stock, AI-production, or prior-output asset.
//
// Two distinct neutral greys (a 1x1 solid-colour PNG scales cleanly to any element box):
//   - background: mid grey  (#8A8F94)
//   - logo:       light grey (#C9CDD2)
// Base64 of minimal, valid 1x1 solid-colour PNGs (generated deterministically offline).
const PLACEHOLDER_BG_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mOUqvz/HwAEhgJApk5J0gAAAABJRU5ErkJggg==';
const PLACEHOLDER_LOGO_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mPk5eb+DwAEfgJT7uSVSAAAAABJRU5ErkJggg==';

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ── No-log render + upload helper ───────────────────────────────────────────────
// Submits the render script to Creatomate, polls for completion (same submit/poll shape
// as the production renderUploadAndLog / pollRender), downloads the finished asset, and
// uploads it to post-images at `storagePath`. It DOES NOT call write_render_log and DOES
// NOT write m.post_render_log — that omission is the entire point of this helper.
export async function renderUploadSmokeNoLog(opts: {
  supabase: SmokeSupabase;
  creatomateKey: string;
  renderScript: object;
  storagePath: string;
  mimeType: string;
}): Promise<{ storagePath: string; providerRenderId: string | null; dimensions: string }> {
  const { supabase, creatomateKey, renderScript, storagePath, mimeType } = opts;
  const startMs = Date.now();

  const submitResp = await fetch(CREATOMATE_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creatomateKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(renderScript),
  });
  // Do NOT echo the provider body into the thrown message (it can carry sensitive data).
  if (!submitResp.ok) throw new Error(`creatomate_submit_${submitResp.status}`);
  const sub = await submitResp.json();
  const render = Array.isArray(sub) ? sub[0] : sub;
  const renderId: string | null = render?.id ?? null;
  if (!renderId) throw new Error('creatomate_no_render_id');

  // Poll (mirror of pollRender): fixed interval, bounded attempts.
  let renderUrl: string | null = null;
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const resp = await fetch(`${CREATOMATE_API}/${renderId}`, { headers: { 'Authorization': `Bearer ${creatomateKey}` } });
    if (!resp.ok) throw new Error(`creatomate_poll_${resp.status}`);
    const data = await resp.json();
    if (data.status === 'succeeded') {
      if (!data.url) throw new Error('creatomate_no_output_url');
      renderUrl = data.url;
      break;
    }
    if (data.status === 'failed') throw new Error('creatomate_render_failed');
    console.log(`[tmr-smoke] render ${renderId}: ${data.status} (${i + 1})`);
  }
  if (!renderUrl) throw new Error('creatomate_render_timeout');
  void startMs; // duration not logged/returned — kept for parity with production timing only.

  const imgBuf = await (await fetch(renderUrl)).arrayBuffer();
  const { error: upErr } = await supabase.storage.from(SMOKE_BUCKET).upload(storagePath, imgBuf, { contentType: mimeType, upsert: true });
  if (upErr) throw new Error(`storage_upload_failed: ${upErr.message}`);

  return { storagePath, providerRenderId: renderId, dimensions: '1080x1080' };
}

// ── The isolated TMR smoke branch handler ───────────────────────────────────────
export async function handleTmrSmoke(opts: {
  body: any;
  supabase: SmokeSupabase;
  creatomateKey: string;
}): Promise<Response> {
  const { body, supabase, creatomateKey } = opts;

  // ── Request guards (all reject 400 with a SAFE error; no secret, no payload) ──
  if (body?.provider_template_id !== TMR_SMOKE_TEMPLATE_ID) {
    return jsonSafe({ ok: false, error: 'invalid_provider_template_id' }, 400);
  }
  if (body?.synthetic_only !== true) {
    return jsonSafe({ ok: false, error: 'synthetic_only_required' }, 400);
  }
  // No passthrough / override fields — only the documented request fields are allowed.
  for (const forbidden of FORBIDDEN_REQUEST_FIELDS) {
    if (forbidden in (body ?? {})) return jsonSafe({ ok: false, error: 'unsupported_field' }, 400);
  }
  for (const key of Object.keys(body ?? {})) {
    if (!ALLOWED_REQUEST_FIELDS.has(key)) return jsonSafe({ ok: false, error: 'unsupported_field' }, 400);
  }

  const runId = crypto.randomUUID();
  const inputsPrefix = `${SMOKE_PREFIX}/${runId}/inputs`;
  const outputPath = `${SMOKE_PREFIX}/${runId}/output/output.png`;

  // ── R1: neutral synthetic placeholders, generated IN-CODE, uploaded to _smoke/ inputs ──
  let bgBytes: Uint8Array;
  let logoBytes: Uint8Array;
  try {
    bgBytes = b64ToBytes(PLACEHOLDER_BG_PNG_B64);
    logoBytes = b64ToBytes(PLACEHOLDER_LOGO_PNG_B64);
    if (!bgBytes.length || !logoBytes.length) throw new Error('empty_placeholder');
  } catch {
    // No safe placeholder could be produced — do NOT fall back to any real asset.
    return jsonSafe({ ok: false, error: 'BLOCKED_no_safe_placeholder' }, 500);
  }

  const bgPath = `${inputsPrefix}/background.png`;
  const logoPath = `${inputsPrefix}/logo.png`;
  const { error: bgUpErr } = await supabase.storage.from(SMOKE_BUCKET).upload(bgPath, bgBytes, { contentType: 'image/png', upsert: true });
  if (bgUpErr) return jsonSafe({ ok: false, error: 'placeholder_upload_failed' }, 500);
  const { error: logoUpErr } = await supabase.storage.from(SMOKE_BUCKET).upload(logoPath, logoBytes, { contentType: 'image/png', upsert: true });
  if (logoUpErr) return jsonSafe({ ok: false, error: 'placeholder_upload_failed' }, 500);

  const { data: bgPub } = supabase.storage.from(SMOKE_BUCKET).getPublicUrl(bgPath);
  const { data: logoPub } = supabase.storage.from(SMOKE_BUCKET).getPublicUrl(logoPath);
  const backgroundUrl = bgPub?.publicUrl;
  const logoUrl = logoPub?.publicUrl;
  if (!backgroundUrl || !logoUrl) return jsonSafe({ ok: false, error: 'BLOCKED_no_safe_placeholder' }, 500);

  // ── Fixed synthetic modifications (server-side; real element names per field inventory) ──
  const modifications: Record<string, string> = {
    'Headline.text': 'Sydney Market Snapshot',
    'Subtitle.text': 'Clearance rates held steady this week as buyer demand remained selective.',
    'CategoryBadge.text': 'SAMPLE DATA ONLY',
    'Location.text': 'Property Pulse',
    'Date.text': 'Smoke test — not for publication',
    'Footer.text': 'TMR G2 smoke render',
    'Background.source': backgroundUrl,
    'Logo.source': logoUrl,
    // Scrim is a static shape — no modification.
  };

  const renderScript = { template_id: TMR_SMOKE_TEMPLATE_ID, modifications, output_format: 'png' };

  let providerRenderId: string | null = null;
  try {
    const res = await renderUploadSmokeNoLog({
      supabase, creatomateKey, renderScript, storagePath: outputPath, mimeType: 'image/png',
    });
    providerRenderId = res.providerRenderId;
  } catch (e: any) {
    // Safe error only — no secret, no raw provider payload.
    const safe = (e?.message ?? 'render_failed').toString().slice(0, 120);
    console.error('[tmr-smoke] render failed:', safe);
    return jsonSafe({ ok: false, error: safe }, 502);
  }

  return jsonSafe({
    gate: 'G2',
    result: 'success',
    provider: 'creatomate',
    provider_template_id: TMR_SMOKE_TEMPLATE_ID,
    provider_render_id: providerRenderId,
    smoke_storage_path: outputPath,
    dimensions: '1080x1080',
    synthetic_only: true,
    proof_event_inserted: false,
    published: false,
  }, 200);
}

// Local JSON responder (kept self-contained so this module has no coupling to index.ts).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-image-worker-key',
};
function jsonSafe(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
