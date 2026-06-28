// image-worker v3.19.0
// v3.19.0 (2026-06-28) — ACI v0 Slice C: warn-only contract_validation. Adds an additive
//   render_spec.contract_validation evidence block (status pass|warn; checks: contract_identity,
//   headline, subtitle, assets) to the governed PP image_quote branch via the pure, never-throws
//   validateContract helper (./contract_validation.ts). Evidence-only: does NOT gate render,
//   alter image_status, or change queue/publish. No new failure mode.
//
// image-worker v3.18.0
// v3.18.0 (2026-06-27) — ACI v0 Slice B2 — echo draft_format.contract (4 identity fields)
//   into render_spec for the governed PP image_quote branch; additive evidence-only; safe
//   no-op when contract absent/malformed; STRICTLY OUT OF SCOPE: no AI/ai-worker/format-
//   selection/validation/repair/render/label/template/output-path/legacy-path change.
//
// image-worker v3.17.0
// v3.17.0 (2026-06-27) — B1-v2: governed subtitle derived from draft_body (first non-empty
//   paragraph, truncated to B1_SUBTITLE_MAX_CHARS=headline limit; derived+optional →
//   truncate/empty, never fail-loud). WHAT IS OUT OF SCOPE: no new column, no AI, no other
//   mode/path, no DB/migration/dashboard.
//
// image-worker v3.16.0
// v3.16.0 (2026-06-26) — B1-v2: deterministic PP image_quote background rotation. The
//   Property-Pulse governed image_quote branch no longer keys on the FIXED background
//   bg_perth_cbd; it now selects deterministically over the 3 governed PP backgrounds
//   (bg_perth_cbd, bg_brisbane_cbd, bg_sydney_cbd) via selectB1BackgroundKey() — a pure
//   FNV-1a 32-bit hash of post_draft_id (same draft -> same background, ALWAYS; no
//   randomness/Date/crypto/I-O). The selected key is recorded in render_spec.background_key
//   and flows into render_spec.template.asset_keys/asset_ids via the resolved asset. The
//   governed fail-loud assertGovernedAssetReachable() still runs on the RESOLVED selected
//   background. WHAT IS STRICTLY OUT OF SCOPE: NO change to the PP client_id gate, the
//   canonical slug to resolver/path, the storage path property-pulse/<id>.jpg, the label,
//   the headline gate, the fixed logo key pp_logo_primary, any non-PP / legacy / other-
//   format path; NO multi-brand, NO template selection, NO AI rewrite, NO DB/migration,
//   NO dashboard; NO deploy in this change.
//
// image-worker v3.15.1
// v3.15.1 (2026-06-26) — H2 POLICY REFINEMENT: LEGACY paths now PROCEED-ON-TRANSIENT.
//   resolveLegacyLogo() NO LONGER throws on a transient pre-flight result; the
//   RenderAssetTransientError class is removed. A storage/network blip on the bounded
//   ranged GET (transient_5xx | timeout | network) now returns the ORIGINAL logo URL
//   ({ logoUrl: rawUrl, fallback: 'transient_proceed' }) so the legacy render proceeds
//   with the logo passed through to Creatomate (Creatomate is the source of truth) —
//   exactly the pre-H2 behaviour for that case. Only a DEFINITIVE 4xx/malformed still
//   drops the logo to the EXISTING wordmark/no-logo path ({ logoUrl: null }); null/empty
//   stays null_logo; 2xx/206 stays pass-through. The per-format try/catch is unchanged
//   (it still catches genuine render failures). GOVERNED fail-loud is UNCHANGED.
//
// v3.15.0 (2026-06-26) — H2: ASSET-URL VALIDATION BEFORE CREATOMATE. A non-null but
//   UNREACHABLE logo/asset URL previously hard-failed Creatomate (the worker only
//   wordmark-fell-back on a NULL logo). WHAT CHANGED: (1) new pure module
//   ./asset_url_guard.ts (single bounded ranged GET, no DB/secret/side-effect) that
//   classifies a URL ok / broken_4xx / transient_5xx / timeout / network / malformed;
//   (2) for EACH LEGACY logo build site (image_quote, animated_text_reveal,
//   animated_data, carousel — resolved ONCE per draft before the slide loop — and the
//   video-fallback image_quote loop) the brand logo is validated via resolveLegacyLogo()
//   BEFORE building, and the VALIDATED logoUrl OVERRIDES b.logoUrl in the builder spread.
//   On a 4xx/malformed logo the legacy path falls back to the EXISTING wordmark/no-logo
//   behaviour (logoUrl=null); a transient result is handled per v3.15.1 above
//   (proceed-on-transient). (3) For the GOVERNED paths
//   (creative_library_manual_render, creative_library_draft_proof, and the B1 production
//   governed image_quote branch), a fail-loud assertGovernedAssetReachable() check on the
//   RESOLVED logo + background runs immediately BEFORE the Creatomate submit — governed
//   assets NEVER fall back; an unreachable governed asset throws (manual branch returns a
//   502 jsonResponse; draft-proof + B1 branches surface through their existing error path).
//   One logoMemo Map per request dedupes repeated validations. WHAT IS STRICTLY OUT OF
//   SCOPE: NO change to render-selection / draft eligibility / the B1 PP flag/gate / queue
//   / publisher / retry cap / DB / schema; NO migration, NO new secret; NO deploy in this
//   change. Default legacy render output for a REACHABLE logo is byte-unchanged.
//
// image-worker v3.14.1
// v3.14.1 (2026-06-26) — CREATIVE-LIBRARY BRANCH B / LANE B1-v1 FIX-FORWARD: the v3.14.0
//   governed image_quote branch never fired in production. WHAT CHANGED: the PP gate now
//   keys on the loop's resolved client_id (the reliable PP identity 4036a6b5-…) instead of
//   b.clientSlug. Root cause: getBrandAndSlug() falls back to the client-id UUID when the
//   PostgREST c.client.client_slug read returns null, so isB1GovernedImageQuote(UUID) was
//   false and PP silently rendered on the legacy buildImageQuoteScript path. The fix:
//   (1) b1_production.ts adds B1_GOVERNED_CLIENT_ID='4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
//   and changes isB1GovernedImageQuote() to gate on client_id; (2) inside the governed
//   branch, resolve_brand_assets and the storage path use the CANONICAL slug constant
//   B1_GOVERNED_CLIENT_SLUG='property-pulse' (NEVER b.clientSlug, which can be the UUID
//   fallback) — so the resolver always receives 'property-pulse' and the path is always
//   property-pulse/<draft>.jpg. renderUploadAndLog still passes the real clientId so
//   render_log.client_id records the canonical PP identity; render_spec stays governed
//   (label creative_library_b1_production, NEWS_STATIC_CENTERED_SCRIM_1x1 →
//   fb9820f8-3fee-4448-b324-3d500fa74b40, resolver_used=true, fallback_taken=false). WHAT IS
//   STRICTLY OUT OF SCOPE: behaviour of v3.14.0 is otherwise unchanged — non-PP image_quote
//   stays BYTE-UNCHANGED legacy; governed-only fail-loud for PP unchanged (no legacy
//   fallback); NO change to video/avatar/carousel/animated/text formats, queue logic,
//   publisher logic, manual-render + _smoke/ proof + 16:9 paths, legacy templates, dashboard,
//   or DB/schema; NO migration, NO new secret, NO new ice_format_key (stays 'image_quote');
//   NO AI rewrite / alternate-template / background rotation / multi-brand / Advisor.
//
// image-worker v3.14.0
// v3.14.0 (2026-06-26) — CREATIVE-LIBRARY BRANCH B / LANE B1-v1: smallest-safe PRODUCTION
//   slice — a Property-Pulse-ONLY governed branch INSIDE the EXISTING production
//   `image_quote` loop. WHAT CHANGED: (1) new pure module ./b1_production.ts (no side
//   effects) exporting B1_GOVERNED_CLIENT_SLUG='property-pulse', the fixed governed asset
//   contract B1_ASSET_KEYS={logo:'pp_logo_primary', background:'bg_perth_cbd'}, the
//   B1_PRODUCTION_LABEL, the minimal headline-length hard-gate (B1_HEADLINE_MAX_CHARS=90,
//   PROVISIONAL/to_be_calibrated — cut-plan decision D), isB1GovernedImageQuote(), and
//   assertHeadlineWithinGate(); (2) inside the image_quote loop, AFTER getBrandAndSlug and
//   the existing isImageEnabled skip, a PP-gated governed branch runs BEFORE the legacy
//   buildImageQuoteScript render: minimal headline gate → resolve_brand_assets RPC for
//   [pp_logo_primary, bg_perth_cbd] (NO legacy fallback — throw on error) → mapResolvedAssets
//   (throws on shortfall) → buildProofFieldsFromDraft → buildManualModifications →
//   computePropsHash → buildGovernedTemplateSpec(NEWS_STATIC_CENTERED_SCRIM_1x1, …) →
//   renderUploadAndLog to the PRODUCTION path `property-pulse/<draft>.jpg` (image/jpeg,
//   iceFormatKey stays 'image_quote', render_spec.label=B1_PRODUCTION_LABEL) → normal
//   production write image_url + image_status='generated' → skip the legacy render for that
//   draft. The whole branch is inside the EXISTING per-draft try/catch, so any
//   resolver/headline/render failure hits the EXISTING production failure semantics
//   (image_status='failed'). WHAT IS STRICTLY OUT OF SCOPE: non-PP image_quote stays
//   BYTE-UNCHANGED (legacy buildImageQuoteScript, png, brand-profile logo); NO change to
//   video/avatar/carousel/animated/text formats, queue logic, publisher logic, the
//   manual-render + _smoke/ proof + 16:9 paths, legacy Creatomate templates, dashboard, or
//   DB/schema; NO AI headline rewrite; NO alternate-template selection; NO background
//   rotation/selection (fixed bg_perth_cbd); NO multi-brand activation; NO Advisor-driven
//   selection; NO new ice_format_key (render-log stays 'image_quote'); NO migration, NO new
//   secret. PP becomes resolver-dependent on this path by design (fail-loud).
//
// image-worker v3.13.0
// v3.13.0 (2026-06-25) — CREATIVE-LIBRARY BRANCH B / LANE B0: additive, NON-PUBLISHING
//   support for a NEW brand-agnostic 1:1 governed implementation
//   `news_static_centered_scrim_1x1_v1` (provider_template_id
//   fb9820f8-3fee-4448-b324-3d500fa74b40, output jpg / image/jpeg) in the existing
//   `creative_library_draft_proof` branch. WHAT CHANGED: (1) manual_render.ts adds a
//   shared GovernedImpl type applied to BOTH PP_NEWS_STATIC_16x9 and the new
//   NEWS_STATIC_CENTERED_SCRIM_1x1 constant (generic template_family='news-static',
//   creative_intent='news_static'); (2) buildGovernedTemplateSpec is parametrized to take
//   the impl as its first argument (body otherwise identical — still resolver_used=true,
//   fallback_taken=false, asset_keys/asset_ids from opts); (3) the manual-render call site
//   passes PP_NEWS_STATIC_16x9 explicitly (behaviour/output byte-identical); (4) the
//   draft-proof branch resolves the impl by implementation_id from a 2-entry map, accepts
//   either known id, and derives the _smoke/ storage ext+mime + a DISTINCT path suffix from
//   impl.output_format. WHAT IS STRICTLY OUT OF SCOPE: no production/queue/publisher/advisor
//   wiring; NO m.post_draft mutation (image_url/image_status/updated_at) — draft READ-ONLY;
//   no change to buildManualModifications (the 8 keys stay); no new ice_format_key
//   (render-log stays 'image_quote'); no migration, no new secret, no shared-family registry
//   schema change; no colour modification keys; the 16:9 proof path (gate, renderScript,
//   _smoke/branch_b_proof_${id}.jpg path, image/jpeg mime) is BYTE-UNCHANGED in behaviour;
//   the template_smoke + creative_library_manual_render branches and ALL production loops
//   remain byte-unchanged; B1 production consumption stays BLOCKED.
//
// image-worker v3.12.0
// v3.12.0 — CREATIVE-LIBRARY BRANCH B / LANE B-PROOF: additive, NON-PUBLISHING
//   governed-render MECHANISM proof, gated by mode='creative_library_draft_proof'.
//   Mirrors the v3.11.0 manual branch but sources the render fields from a REAL
//   m.post_draft row READ-ONLY (no LLM): validates client_slug=property-pulse,
//   implementation_id=pp_news_static_16x9_v1, post_draft_id, asset_keys.logo/.background;
//   reads the draft (select image_headline/client_id/recommended_format) and hard-gates
//   on recommended_format='image_quote' (422) + non-blank image_headline (422); builds
//   deterministic proof fields via ./branch_b_proof.ts buildProofFieldsFromDraft();
//   resolves governed asset_keys via the service_role-only RPC public.resolve_brand_assets
//   (NO raw-URL/legacy fallback — fail loud); renders the proven PP 16:9 news template
//   with the RESOLVED governed asset URLs; writes render_spec GOVERNED evidence with
//   render_spec.label='creative_library_draft_proof' (+ source_post_draft_id) and the
//   v3.11.0 render_spec.template (resolver_used=true, fallback_taken=false). Returns
//   BEFORE production draft selection. HARD INVARIANTS: NO m.post_draft UPDATE of any
//   kind (image_url/image_status/updated_at) — the draft is READ-ONLY; NO publish/queue/
//   advisor/production-loop change; storage ONLY to _smoke/...; governed-only fail-loud
//   (resolver/render failure returns an error, never a legacy render). New pure module
//   ./branch_b_proof.ts (no side effects). renderUploadAndLog UNCHANGED. The
//   template_smoke + creative_library_manual_render branches and ALL production loops are
//   BYTE-UNCHANGED. No migration, no new secret, no new governed ice_format_key (the
//   render-log ice_format_key='image_quote' is the existing governed label; render_spec.label
//   distinguishes the proof). NO docs-registry / DB-backed registry import at runtime.
//
// image-worker v3.11.0
// v3.11.0 — CREATIVE-LIBRARY-V0.1 LANE 3B: additive, manual-only governed render mode
//   `creative_library_manual_render`. Resolves governed asset_keys via the
//   service_role-only RPC public.resolve_brand_assets (NO raw-URL fallback — fail
//   loud on resolver error/shortfall), renders the proven PP 16:9 news template with
//   the RESOLVED governed asset URLs, and writes render_spec GOVERNED evidence:
//   label='creative_library_manual_governed_render' + render_spec.template carrying
//   implementation_id/creative_intent/capability/provider/provider_template_id +
//   asset_keys + asset_ids + resolver_used=true + fallback_taken=false. Returns BEFORE
//   production draft selection; touches NO post_draft/queue/publish/advisor. New pure
//   module ./manual_render.ts (no side effects). renderUploadAndLog UNCHANGED (reuses
//   the v3.10.x renderSpec + logMustSucceed opts). The existing template_smoke branch
//   and all production loops are byte-unchanged. No migration, no new governed
//   ice_format_key (the render-log ice_format_key='image_quote' is a governed label).
//
// image-worker v3.10.2
// v3.10.2 — CREATIVE-LIBRARY-V0 GATE C fix (PK Option A): m.post_render_log.ice_format_key is
//   NOT NULL + FK to t."5.3_content_format", so null was rejected. The template_smoke row now uses
//   ice_format_key='image_quote' (nearest governed static-image key); render_spec.label=
//   'creative_library_smoke' keeps the smoke row identifiable + distinct from real image_quote
//   renders; render_spec.template (unchanged) carries the true Creative Library identity.
// v3.10.1 — CREATIVE-LIBRARY-V0 GATE C fix: the template_smoke render-log row now uses
//   iceFormatKey=null (m.post_render_log.ice_format_key is FK-constrained to the governed
//   taxonomy t."5.3_content_format"; the prior 'creative_library_smoke' label violated the FK
//   and the evidence row was silently dropped). Template identity stays in render_spec.template.
//   Also: for template_smoke ONLY (logMustSucceed=true), a render-log write failure is now a HARD
//   error (no silent swallow) so missing evidence can never masquerade as success. Production image
//   renders are UNCHANGED (logMustSucceed defaults false -> existing best-effort swallow).
// CREATIVE-LIBRARY-V0 GATE C: additive manual-only template-mode smoke branch (gated by
// body.mode==='template_smoke'); renderUploadAndLog gains optional renderSpec; writes
// render_spec.template; NO production-loop/advisor/publish/queue change; render_engine
// unchanged ('creatomate'); no migration; no new governed ice_format_key (the render-log
// ice_format_key label 'creative_library_smoke' is a telemetry label only).
//
// v3.9.2 context: carousel deadlock fix — image-worker was gating carousel on
// approval_status='approved', but carousel images must be generated BEFORE auto-approver
// can score them. Result: neither image-worker nor auto-approver would act — infinite hold.
// Fix: carousel query now uses image_status='pending' only (no approval_status gate).
// Other formats (image_quote, animated_text_reveal, animated_data) retain approval gate.
//
// v3.9.1 context: client_id resolve fix, video fallback renderer, carousel image_url write fix.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { MANUAL_RENDER_MODE, MANUAL_RENDER_LABEL, PP_NEWS_STATIC_16x9, NEWS_STATIC_CENTERED_SCRIM_1x1, isManualRenderRequest, mapResolvedAssets, buildManualModifications, computePropsHash, buildGovernedTemplateSpec } from './manual_render.ts';  // v3.11.0: LANE 3B; v3.13.0: + B0 1:1 impl
import { DRAFT_PROOF_MODE, DRAFT_PROOF_LABEL, buildProofFieldsFromDraft } from './branch_b_proof.ts';  // v3.12.0: BRANCH B / LANE B-PROOF
import { B1_ASSET_KEYS, B1_LOGO_KEY, B1_PRODUCTION_LABEL, B1_GOVERNED_CLIENT_ID, B1_GOVERNED_CLIENT_SLUG, B1_HEADLINE_MAX_CHARS, B1_SUBTITLE_MAX_CHARS, isB1GovernedImageQuote, assertHeadlineWithinGate, selectB1BackgroundKey, deriveB1Subtitle } from './b1_production.ts';  // v3.14.1: BRANCH B / LANE B1-v1 (PP-only governed image_quote; gate keys on client_id, canonical slug to resolver). v3.16.0: B1-v2 deterministic background rotation (selectB1BackgroundKey). v3.17.0: B1-v2 governed subtitle from draft_body (deriveB1Subtitle).
import { resolveLegacyLogo, assertGovernedAssetReachable, type AssetVerdict } from './asset_url_guard.ts';  // v3.15.0: H2 asset-URL validation before Creatomate
import { echoContractToRenderSpec } from './contract_echo.ts';  // v3.18.0: ACI v0 Slice B2 — echo draft_format.contract identity fields into render_spec (governed PP image_quote; evidence-only)
import { validateContract } from './contract_validation.ts';  // ACI v0 Slice C: warn-only contract validation (evidence-only, never throws)

const VERSION = 'image-worker-v3.19.0';
const CREATOMATE_API = 'https://api.creatomate.com/v2/renders';
const ANTHROPIC_API  = 'https://api.anthropic.com/v1/messages';
const POLL_INTERVAL_MS  = 1500;
const POLL_MAX_ATTEMPTS = 30;

const VIDEO_FORMATS = ['video_short_kinetic', 'video_short_stat', 'video_short_kinetic_voice', 'video_short_stat_voice'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-image-worker-key',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function nowIso() { return new Date().toISOString(); }
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function resolveClientId(
  supabase: ReturnType<typeof getServiceClient>,
  postDraftId: string,
  directClientId: string | null
): Promise<string | null> {
  if (directClientId) return directClientId;
  const { data } = await supabase.rpc('exec_sql', {
    query: `
      SELECT dr.client_id
      FROM m.post_draft pd
      JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
      JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
      WHERE pd.post_draft_id = '${postDraftId}'
      LIMIT 1
    `
  });
  return (data as any)?.[0]?.client_id ?? null;
}

async function pollRender(renderId: string, apiKey: string, startMs: number): Promise<{ url: string; creditsUsed: number | null; durationMs: number }> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const resp = await fetch(`${CREATOMATE_API}/${renderId}`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
    if (!resp.ok) throw new Error(`Poll failed: ${resp.status}`);
    const data = await resp.json();
    if (data.status === 'succeeded') {
      if (!data.url) throw new Error('No URL in render response');
      return { url: data.url, creditsUsed: data.credits != null ? Number(data.credits) : null, durationMs: Date.now() - startMs };
    }
    if (data.status === 'failed') throw new Error(`Creatomate failed: ${data.error_message ?? 'unknown'}`);
    console.log(`[image-worker] render ${renderId}: ${data.status} (${i + 1})`);
  }
  throw new Error('Render timed out');
}

async function renderUploadAndLog(opts: {
  supabase: ReturnType<typeof getServiceClient>;
  creatomateKey: string;
  renderScript: object;
  storagePath: string;
  mimeType: string;
  postDraftId: string | null;
  clientId: string | null;
  iceFormatKey: string | null;
  slideId?: string | null;
  renderSpec?: object | null;
  logMustSucceed?: boolean;  // v3.10.1: when true (template_smoke only), a render-log write failure is a HARD error
}): Promise<string> {
  const { supabase, creatomateKey, renderScript, storagePath, mimeType, postDraftId, clientId, iceFormatKey, slideId } = opts;
  const startMs = Date.now();
  let renderId: string | null = null;

  try {
    const submitResp = await fetch(CREATOMATE_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${creatomateKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(renderScript),
    });
    if (!submitResp.ok) throw new Error(`Creatomate submit ${submitResp.status}: ${await submitResp.text()}`);
    const sub = await submitResp.json();
    const render = Array.isArray(sub) ? sub[0] : sub;
    renderId = render?.id ?? null;
    if (!renderId) throw new Error('No render ID in Creatomate response');

    const { url: renderUrl, creditsUsed, durationMs } = await pollRender(renderId, creatomateKey, startMs);

    const imgBuf = await (await fetch(renderUrl)).arrayBuffer();
    const { error: upErr } = await supabase.storage.from('post-images').upload(storagePath, imgBuf, { contentType: mimeType, upsert: true });
    if (upErr) throw new Error(`Storage upload: ${upErr.message}`);
    const storageUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/post-images/${storagePath}`;

    try {
      const { error: logErr } = await supabase.rpc('write_render_log', {
        p_post_draft_id: postDraftId, p_slide_id: slideId ?? null, p_client_id: clientId,
        p_ice_format_key: iceFormatKey, p_render_engine: 'creatomate', p_creatomate_render_id: renderId,
        p_status: 'succeeded', p_output_url: renderUrl, p_storage_url: storageUrl,
        p_credits_used: creditsUsed, p_render_duration_ms: durationMs, p_error_message: null, p_render_spec: opts.renderSpec ?? null,
      });
      if (logErr) {
        console.error('[image-worker] write_render_log error:', logErr.message);
        // v3.10.1: template_smoke requires the evidence row to persist — surface, do not swallow.
        if (opts.logMustSucceed) throw new Error(`write_render_log failed: ${logErr.message}`);
      }
    } catch (logEx: any) {
      console.error('[image-worker] write_render_log threw:', logEx?.message);
      if (opts.logMustSucceed) throw (logEx instanceof Error ? logEx : new Error(String(logEx)));
    }

    return storageUrl;

  } catch (e: any) {
    const errMsg = (e?.message ?? String(e)).slice(0, 500);
    const durationMs = Date.now() - startMs;
    try {
      const { error: logErr } = await supabase.rpc('write_render_log', {
        p_post_draft_id: postDraftId, p_slide_id: slideId ?? null, p_client_id: clientId,
        p_ice_format_key: iceFormatKey, p_render_engine: 'creatomate', p_creatomate_render_id: renderId,
        p_status: errMsg.includes('timed out') ? 'timeout' : 'failed', p_output_url: null, p_storage_url: null,
        p_credits_used: null, p_render_duration_ms: durationMs, p_error_message: errMsg, p_render_spec: opts.renderSpec ?? null,
      });
      if (logErr) console.error('[image-worker] write_render_log (failure) error:', logErr.message);
    } catch (logEx: any) { console.error('[image-worker] write_render_log (failure) threw:', logEx?.message); }
    throw e;
  }
}

type StatSpec = { stat_value: string; stat_label: string; context_line: string; };

async function extractStatSpec(opts: { anthropicKey: string; postBody: string; imageHeadline: string; clientName: string; }): Promise<StatSpec> {
  const { anthropicKey, postBody, imageHeadline, clientName } = opts;
  const systemPrompt = `You are extracting data for an animated social media graphic for ${clientName}. Identify the single most compelling numeric stat. Rules:\n- stat_value: the number formatted for screen, max 12 chars (e.g. "$62.17/hr", "4.35%", "+3.7%"). Include unit/symbol.\n- stat_label: what the number IS, max 40 chars.\n- context_line: one sentence making the stat meaningful, max 80 chars.\nReturn ONLY valid JSON: { "stat_value": string, "stat_label": string, "context_line": string }`;
  const userPrompt = `Image headline: ${imageHeadline || '(none)'}\n\nPost body:\n${postBody.slice(0, 800)}\n\nExtract the stat spec.`;
  const resp = await fetch(ANTHROPIC_API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 200, temperature: 0.1, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }) });
  if (!resp.ok) throw new Error(`stat_extractor_http_${resp.status}`);
  const data = await resp.json();
  const raw = data?.content?.[0]?.text ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  let parsed: StatSpec;
  try { parsed = JSON.parse(cleaned); } catch { throw new Error(`stat_extractor_bad_json: ${cleaned.slice(0, 200)}`); }
  if (!parsed?.stat_value) throw new Error('stat_extractor_missing_stat_value');
  return parsed;
}

function buildAnimatedDataScript(opts: { statValue: string; statLabel: string; contextLine: string; clientName: string; primaryColour: string; secondaryColour: string; logoUrl: string | null; }): object {
  const { statValue, statLabel, contextLine, clientName, primaryColour, secondaryColour, logoUrl } = opts;
  const W = 1080; const H = 1080;
  const statFontSize = statValue.length <= 4 ? '200px' : statValue.length <= 6 ? '160px' : statValue.length <= 8 ? '130px' : '100px';
  const elements: object[] = [];
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: '0px', x_anchor: '0%', y_anchor: '0%', time: 0 });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: `${H}px`, x_anchor: '0%', y_anchor: '100%', time: 0 });
  if (logoUrl) { elements.push({ type: 'image', source: logoUrl, width: '80px', height: '80px', x: '44px', y: '44px', x_anchor: '0%', y_anchor: '0%', fit: 'contain', time: 0 }); }
  else { elements.push({ type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '700', font_size: '22px', fill_color: secondaryColour, x: '60px', y: '70px', x_anchor: '0%', y_anchor: '50%', time: 0 }); }
  elements.push({ type: 'shape', shape: 'circle', fill_color: secondaryColour, opacity: 0.08, width: '700px', height: '700px', x: '50%', y: '46%', x_anchor: '50%', y_anchor: '50%', time: 0 });
  elements.push({ type: 'text', text: statValue, font_family: 'Montserrat', font_weight: '900', font_size: statFontSize, fill_color: '#FFFFFF', width: `${W}px`, x_alignment: '50%', x: '0px', y: '340px', x_anchor: '0%', y_anchor: '0%', time: 0.5, enter: { effect: 'scale', duration: 0.8, easing: 'bounce' } });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: '560px', height: '5px', x: '260px', y: '590px', x_anchor: '0%', y_anchor: '0%', time: 1.2, enter: { effect: 'wipe', direction: '270', duration: 0.4 } });
  elements.push({ type: 'text', text: statLabel.toUpperCase(), font_family: 'Montserrat', font_weight: '600', font_size: '32px', fill_color: secondaryColour, width: `${W}px`, x_alignment: '50%', x: '0px', y: '610px', x_anchor: '0%', y_anchor: '0%', time: 1.8, enter: { effect: 'slide', direction: '270', duration: 0.5 } });
  elements.push({ type: 'text', text: contextLine, font_family: 'Montserrat', font_weight: '400', font_size: '28px', fill_color: '#CBD5E1', line_height: '145%', width: '860px', x_alignment: '50%', x: '110px', y: '700px', x_anchor: '0%', y_anchor: '0%', time: 2.2, enter: { effect: 'fade', duration: 0.6 } });
  elements.push({ type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '400', font_size: '26px', fill_color: '#D9E1E6', opacity: 0.7, width: `${W}px`, x_alignment: '50%', x: '0px', y: '920px', x_anchor: '0%', y_anchor: '0%', time: 2.8, enter: { effect: 'fade', duration: 0.4 } });
  return { output_format: 'gif', width: W, height: H, fill_color: primaryColour, duration: 4, frame_rate: 15, loop: true, elements };
}

function buildAnimatedTextRevealScript(opts: { headline: string; clientName: string; primaryColour: string; secondaryColour: string; logoUrl: string | null; }): object {
  const { headline, clientName, primaryColour, secondaryColour, logoUrl } = opts;
  const W = 1080; const H = 1080;
  const elements: object[] = [];
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: '0px', x_anchor: '0%', y_anchor: '0%', time: 0 });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: `${H}px`, x_anchor: '0%', y_anchor: '100%', time: 0 });
  if (logoUrl) { elements.push({ type: 'image', source: logoUrl, width: '100px', height: '100px', x: '44px', y: '44px', x_anchor: '0%', y_anchor: '0%', fit: 'contain', time: 0.3, enter: { effect: 'fade', duration: 0.5 } }); }
  else { elements.push({ type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '700', font_size: '28px', fill_color: secondaryColour, x: '60px', y: '80px', x_anchor: '0%', y_anchor: '50%', time: 0.3, enter: { effect: 'fade', duration: 0.5 } }); }
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, opacity: 0.6, width: '5px', height: '720px', x: '60px', y: '180px', x_anchor: '0%', y_anchor: '0%', time: 0.5, enter: { effect: 'slide', duration: 0.4, x_alignment: '0%', y_alignment: '0%' } });
  elements.push({ type: 'text', text: '\u201c', font_family: 'Montserrat', font_weight: '900', font_size: '160px', fill_color: secondaryColour, opacity: 0.2, width: `${W}px`, x_alignment: '50%', x: '0px', y: '340px', x_anchor: '0%', y_anchor: '0%', time: 0.6, enter: { effect: 'fade', duration: 0.6 } });
  elements.push({ type: 'text', text: headline, font_family: 'Montserrat', font_weight: '700', font_size: '62px', fill_color: '#FFFFFF', line_height: '140%', width: '860px', height: '480px', x_alignment: '50%', y_alignment: '50%', x: '110px', y: '300px', x_anchor: '0%', y_anchor: '0%', time: 0.8, enter: { effect: 'fade', duration: 1.5 } });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, opacity: 0.6, width: '320px', height: '2px', x: '380px', y: '870px', x_anchor: '0%', y_anchor: '0%', time: 2.5, enter: { effect: 'fade', duration: 0.4 } });
  elements.push({ type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '400', font_size: '30px', fill_color: '#D9E1E6', opacity: 0.75, width: `${W}px`, x_alignment: '50%', x: '0px', y: '920px', x_anchor: '0%', y_anchor: '0%', time: 2.8, enter: { effect: 'fade', duration: 0.5 } });
  return { output_format: 'gif', width: W, height: H, fill_color: primaryColour, duration: 4, frame_rate: 15, loop: true, elements };
}

function buildImageQuoteScript(opts: { headline: string; clientName: string; primaryColour: string; secondaryColour: string; logoUrl: string | null; }): object {
  const { headline, clientName, primaryColour, secondaryColour, logoUrl } = opts;
  const W = 1080; const H = 1080;
  return { output_format: 'png', width: W, height: H, fill_color: primaryColour, elements: [
    { type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: '0px', x_anchor: '0%', y_anchor: '0%' },
    { type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: `${H}px`, x_anchor: '0%', y_anchor: '100%' },
    { type: 'shape', shape: 'rectangle', fill_color: secondaryColour, opacity: 0.5, width: '5px', height: '720px', x: '60px', y: '180px', x_anchor: '0%', y_anchor: '0%' },
    ...(logoUrl ? [{ type: 'image', source: logoUrl, width: '100px', height: '100px', x: '44px', y: '44px', x_anchor: '0%', y_anchor: '0%', fit: 'contain' }] : [{ type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '700', font_size: '28px', fill_color: secondaryColour, x: '60px', y: '80px', x_anchor: '0%', y_anchor: '50%' }]),
    { type: 'text', text: '\u201C', font_family: 'Montserrat', font_weight: '900', font_size: '160px', fill_color: secondaryColour, opacity: 0.25, width: `${W}px`, x_alignment: '50%', x: '0px', y: '340px', x_anchor: '0%', y_anchor: '0%' },
    { type: 'text', text: headline, font_family: 'Montserrat', font_weight: '700', font_size: '62px', fill_color: '#FFFFFF', line_height: '140%', width: '860px', x_alignment: '50%', y_alignment: '50%', x: '110px', y: '300px', x_anchor: '0%', y_anchor: '0%', height: '480px' },
    { type: 'shape', shape: 'rectangle', fill_color: secondaryColour, opacity: 0.6, width: '320px', height: '2px', x: '380px', y: '870px', x_anchor: '0%', y_anchor: '0%' },
    { type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '400', font_size: '30px', fill_color: '#D9E1E6', opacity: 0.75, width: `${W}px`, x_alignment: '50%', x: '0px', y: '920px', x_anchor: '0%', y_anchor: '0%' },
  ]};
}

type SlideSpec = { type: 'hook' | 'point' | 'cta'; headline: string; sub_text: string | null; };
type CarouselSpec = { slides: SlideSpec[]; };

async function callContentAdvisor(opts: { anthropicKey: string; postBody: string; postTitle: string; clientName: string; vertical: string; }): Promise<CarouselSpec> {
  const { anthropicKey, postBody, postTitle, clientName, vertical } = opts;
  const systemPrompt = `You are a content strategist for ${vertical} sector carousel design. Extract a carousel slide spec. Rules: 3-6 slides. Slide 1 = hook (no sub_text). Middle = point (headline max 55 chars, sub_text max 90 chars). Last = cta (no sub_text). Return ONLY JSON: {"slides": [{"type": "hook"|"point"|"cta", "headline": string, "sub_text": string|null}]}`;
  const userPrompt = `Client: ${clientName}\nTitle: ${postTitle}\n\n${postBody}\n\nGenerate slide spec.`;
  const resp = await fetch(ANTHROPIC_API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, temperature: 0.3, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }) });
  if (!resp.ok) throw new Error(`content_advisor_http_${resp.status}`);
  const data = await resp.json();
  const raw = data?.content?.[0]?.text ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  let parsed: CarouselSpec;
  try { parsed = JSON.parse(cleaned); } catch { throw new Error('content_advisor_bad_json'); }
  if (!Array.isArray(parsed?.slides) || parsed.slides.length < 2) throw new Error('content_advisor_invalid_spec');
  return parsed;
}

function buildCarouselSlideScript(opts: { slide: SlideSpec; slideIndex: number; totalSlides: number; clientName: string; primaryColour: string; secondaryColour: string; logoUrl: string | null; }): object {
  const { slide, slideIndex, totalSlides, clientName, primaryColour, secondaryColour, logoUrl } = opts;
  const W = 1080; const H = 1080; const isHook = slide.type === 'hook'; const isCta = slide.type === 'cta';
  const elements: object[] = [];
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: '0px', x_anchor: '0%', y_anchor: '0%' });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: `${H}px`, x_anchor: '0%', y_anchor: '100%' });
  if (logoUrl) { elements.push({ type: 'image', source: logoUrl, width: '80px', height: '80px', x: '44px', y: '44px', x_anchor: '0%', y_anchor: '0%', fit: 'contain' }); }
  else { elements.push({ type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '700', font_size: '22px', fill_color: secondaryColour, x: '60px', y: '70px', x_anchor: '0%', y_anchor: '50%' }); }
  elements.push({ type: 'text', text: isHook ? 'Swipe \u2192' : `${slideIndex} / ${totalSlides}`, font_family: 'Montserrat', font_weight: '400', font_size: '24px', fill_color: secondaryColour, opacity: 0.7, x: `${W - 44}px`, y: '70px', x_anchor: '100%', y_anchor: '50%' });
  if (isHook) {
    elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, opacity: 0.6, width: '5px', height: '600px', x: '60px', y: '240px', x_anchor: '0%', y_anchor: '0%' });
    elements.push({ type: 'text', text: slide.headline, font_family: 'Montserrat', font_weight: '700', font_size: '58px', fill_color: '#FFFFFF', line_height: '130%', width: '880px', height: '580px', x_alignment: '50%', y_alignment: '50%', x: '100px', y: '240px', x_anchor: '0%', y_anchor: '0%' });
  } else if (isCta) {
    elements.push({ type: 'text', text: '?', font_family: 'Montserrat', font_weight: '900', font_size: '200px', fill_color: secondaryColour, opacity: 0.15, width: `${W}px`, x_alignment: '50%', x: '0px', y: '280px', x_anchor: '0%', y_anchor: '0%' });
    elements.push({ type: 'text', text: slide.headline, font_family: 'Montserrat', font_weight: '700', font_size: '52px', fill_color: '#FFFFFF', line_height: '130%', width: '880px', height: '460px', x_alignment: '50%', y_alignment: '50%', x: '100px', y: '280px', x_anchor: '0%', y_anchor: '0%' });
    elements.push({ type: 'text', text: `Follow ${clientName} for more`, font_family: 'Montserrat', font_weight: '400', font_size: '28px', fill_color: secondaryColour, opacity: 0.8, width: `${W}px`, x_alignment: '50%', x: '0px', y: '900px', x_anchor: '0%', y_anchor: '0%' });
  } else {
    elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: '64px', height: '64px', x: '60px', y: '200px', x_anchor: '0%', y_anchor: '0%' });
    elements.push({ type: 'text', text: String(slideIndex - 1), font_family: 'Montserrat', font_weight: '900', font_size: '36px', fill_color: primaryColour, x: '92px', y: '232px', x_anchor: '50%', y_anchor: '50%' });
    elements.push({ type: 'text', text: slide.headline, font_family: 'Montserrat', font_weight: '700', font_size: '56px', fill_color: '#FFFFFF', line_height: '125%', width: '880px', x: '100px', y: '310px', x_anchor: '0%', y_anchor: '0%' });
    elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, opacity: 0.5, width: '880px', height: '2px', x: '100px', y: '640px', x_anchor: '0%', y_anchor: '0%' });
    if (slide.sub_text) elements.push({ type: 'text', text: slide.sub_text, font_family: 'Montserrat', font_weight: '400', font_size: '34px', fill_color: '#CBD5E1', line_height: '145%', width: '880px', x: '100px', y: '660px', x_anchor: '0%', y_anchor: '0%' });
  }
  return { output_format: 'png', width: W, height: H, fill_color: primaryColour, elements };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return jsonResponse({ ok: true, function: 'image-worker', version: VERSION });

  const expected = Deno.env.get('PUBLISHER_API_KEY'); const provided = req.headers.get('x-image-worker-key');
  if (!expected) return jsonResponse({ ok: false, error: 'PUBLISHER_API_KEY_not_set' }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  const creatomateKey = Deno.env.get('CREATOMATE_API_KEY');
  if (!creatomateKey) return jsonResponse({ ok: false, error: 'CREATOMATE_API_KEY not set' }, 500);
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) return jsonResponse({ ok: false, error: 'ANTHROPIC_API_KEY not set' }, 500);

  // ── CREATIVE-LIBRARY-V0 GATE C: manual-only template-mode smoke ──────────────
  // Isolated, opt-in branch. Runs ONLY when the exact mode/template flags are present,
  // and returns BEFORE any production draft selection. No publish/queue/advisor touch.
  let body: any = {};
  try { body = await req.json(); } catch {}
  if (body?.mode === 'template_smoke' && body?.template === 'PP_NEWS_CENTRED_SCRIM_16x9_v1') {
    const supabase = getServiceClient();
    const TEMPLATE_ID = '48cba556-0a53-4001-90f0-05420d10efc0';
    const modifications: Record<string, string | null> = {
      'CategoryBadge.text': 'MARKET NEWS',
      'Headline.text': 'Sydney median house price hits record $1.6M',
      'Subtitle.text': 'Auction clearance rates climb for a third straight week',
      'Location.text': 'Sydney, NSW',
      'Date.text': '21 June 2026',
      'Footer.text': 'propertypulse.com.au',
      'Background.source': body.background_url ?? null,
      'Logo.source': body.logo_url ?? null,
    };
    if (!modifications['Background.source'] || !modifications['Logo.source']) {
      return jsonResponse({ ok: false, error: 'template_smoke requires background_url and logo_url in body' }, 400);
    }
    const renderScript = { template_id: TEMPLATE_ID, modifications, output_format: 'jpg' };
    const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(modifications)));
    const props_hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    // v3.10.2: ice_format_key='image_quote' (NOT NULL + FK to t.5.3_content_format; image_quote is the
    // nearest governed static-image key — PK Option A). render_spec.label distinguishes this smoke row
    // from real image_quote renders; render_spec.template carries the true Creative Library identity.
    const renderSpec = { label: 'creative_library_smoke', template: { template_id: 'pp-news-centred-scrim-16x9', template_version: 'v1', template_family: 'property-pulse-news', template_variant: 'centred-scrim-16x9', provider: 'creatomate', provider_template_id: TEMPLATE_ID, props_hash, asset_ids: [], fallback_taken: false } };
    const storageUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript, storagePath: '_smoke/pp_news_centred_scrim_16x9_v1.jpg', mimeType: 'image/jpeg', postDraftId: null, clientId: null, iceFormatKey: 'image_quote', renderSpec, logMustSucceed: true });
    return jsonResponse({ ok: true, mode: 'template_smoke', template: 'PP_NEWS_CENTRED_SCRIM_16x9_v1', storage_url: storageUrl, props_hash });
  }

  // ── CREATIVE-LIBRARY-V0.1 LANE 3B: manual governed render ────────────────────
  // Isolated, opt-in. Resolves governed asset_keys via the service_role-only RPC
  // public.resolve_brand_assets (NO raw-URL fallback — fail loud), renders the proven
  // PP 16:9 news template with the RESOLVED governed asset URLs, and writes
  // render_spec.template GOVERNED evidence (asset_keys + asset_ids + resolver_used).
  // Returns BEFORE production draft selection. Touches NO post_draft/queue/publish.
  if (isManualRenderRequest(body)) {
    const supabase = getServiceClient();
    const clientSlug = body?.client_slug;
    const implId = body?.implementation_id;
    const logoKey = body?.asset_keys?.logo;
    const bgKey = body?.asset_keys?.background;
    const fields = body?.fields ?? {};
    if (clientSlug !== 'property-pulse' || implId !== PP_NEWS_STATIC_16x9.implementation_id || !logoKey || !bgKey) {
      return jsonResponse({ ok: false, error: 'creative_library_manual_render requires client_slug=property-pulse, implementation_id=pp_news_static_16x9_v1, asset_keys.logo, asset_keys.background' }, 400);
    }
    if (!fields?.headline) {
      return jsonResponse({ ok: false, error: 'creative_library_manual_render requires fields.headline (hard-gate field)' }, 400);
    }
    // Resolve governed assets (service_role-only RPC). Fail loud on resolver error or shortfall — NO raw-URL fallback.
    const { data: resolved, error: resErr } = await supabase.rpc('resolve_brand_assets', { p_client_slug: clientSlug, p_asset_keys: [logoKey, bgKey] });
    if (resErr) return jsonResponse({ ok: false, error: `resolver_failed: ${resErr.message}` }, 500);
    let mapped;
    try { mapped = mapResolvedAssets(resolved as any, { logo: logoKey, background: bgKey }); }
    catch (e: any) { return jsonResponse({ ok: false, error: e?.message ?? String(e) }, 422); }
    const modifications = buildManualModifications({ fields, logoUrl: mapped.logo.asset_url, backgroundUrl: mapped.background.asset_url });
    const renderScript = { template_id: PP_NEWS_STATIC_16x9.provider_template_id, modifications, output_format: PP_NEWS_STATIC_16x9.output_format };
    const props_hash = await computePropsHash(modifications);
    const templateSpec = buildGovernedTemplateSpec(PP_NEWS_STATIC_16x9, { propsHash: props_hash, logo: mapped.logo, background: mapped.background });
    const renderSpec = { label: MANUAL_RENDER_LABEL, template: templateSpec };
    // v3.15.0 (H2): governed assets are fail-loud — verify the RESOLVED logo + background
    // are reachable BEFORE the Creatomate submit. NO fallback (governed); unreachable → 502.
    const manualMemo = new Map<string, Promise<AssetVerdict>>();
    try {
      await assertGovernedAssetReachable('logo', mapped.logo.asset_url, manualMemo);
      await assertGovernedAssetReachable('background', mapped.background.asset_url, manualMemo);
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e?.message ?? String(e) }, 502);
    }
    const storageUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript, storagePath: '_smoke/pp_news_centred_scrim_16x9_manual_governed.jpg', mimeType: 'image/jpeg', postDraftId: null, clientId: null, iceFormatKey: 'image_quote', renderSpec, logMustSucceed: true });
    return jsonResponse({ ok: true, mode: MANUAL_RENDER_MODE, implementation_id: implId, storage_url: storageUrl, props_hash, asset_keys: templateSpec.asset_keys, asset_ids: templateSpec.asset_ids, resolver_used: true, render_spec_label: MANUAL_RENDER_LABEL });
  }

  // ── CREATIVE-LIBRARY BRANCH B / LANE B-PROOF: draft-sourced governed render ───
  // Isolated, opt-in. Mirrors the v3.11.0 manual branch but sources the render fields
  // from a REAL m.post_draft row READ-ONLY (deterministic, NO LLM). Resolves governed
  // asset_keys via the service_role-only RPC public.resolve_brand_assets (NO raw-URL/
  // legacy fallback — fail loud), renders the proven PP 16:9 news template with the
  // RESOLVED governed URLs, and writes render_spec GOVERNED evidence.
  //
  // HARD INVARIANTS (this branch):
  //   - NO m.post_draft UPDATE of any kind (no image_url, no image_status, no
  //     updated_at). The draft is consumed READ-ONLY (a single SELECT).
  //   - NO publish, NO queue, NO advisor, NO production-loop change.
  //   - Storage ONLY to _smoke/... ; returns BEFORE production draft selection.
  //   - Governed-only, fail-loud: any resolver/render failure returns an error,
  //     NEVER a legacy render. No new ice_format_key (render-log ='image_quote';
  //     render_spec.label='creative_library_draft_proof' distinguishes the proof).
  if (body?.mode === DRAFT_PROOF_MODE) {
    const supabase = getServiceClient();
    const clientSlug = body?.client_slug;
    const implId = body?.implementation_id;
    const postDraftId = body?.post_draft_id;
    const logoKey = body?.asset_keys?.logo;
    const bgKey = body?.asset_keys?.background;
    // B0: resolve the governed implementation identity by id from the two known impls
    // (proven 16:9 + new brand-agnostic 1:1). Additive — the 16:9 path is unchanged.
    const impl = { [PP_NEWS_STATIC_16x9.implementation_id]: PP_NEWS_STATIC_16x9, [NEWS_STATIC_CENTERED_SCRIM_1x1.implementation_id]: NEWS_STATIC_CENTERED_SCRIM_1x1 }[implId];
    if (clientSlug !== 'property-pulse' || !impl || !postDraftId || !logoKey || !bgKey) {
      return jsonResponse({ ok: false, error: 'creative_library_draft_proof requires client_slug=property-pulse, implementation_id in {pp_news_static_16x9_v1, news_static_centered_scrim_1x1_v1}, post_draft_id, asset_keys.logo, asset_keys.background' }, 400);
    }
    // Read the draft READ-ONLY (single SELECT, no mutation anywhere in this branch).
    const { data: draft, error: draftErr } = await supabase.schema('m').from('post_draft')
      .select('image_headline, client_id, recommended_format')
      .eq('post_draft_id', postDraftId).limit(1).maybeSingle();
    if (draftErr) return jsonResponse({ ok: false, error: `draft_read_failed: ${draftErr.message}` }, 500);
    if (!draft) return jsonResponse({ ok: false, error: `post_draft not found: ${postDraftId}` }, 404);
    if (draft.recommended_format !== 'image_quote') {
      return jsonResponse({ ok: false, error: `creative_library_draft_proof requires recommended_format=image_quote (got ${draft.recommended_format ?? 'null'})` }, 422);
    }
    if (!(draft.image_headline ?? '').trim()) {
      return jsonResponse({ ok: false, error: 'missing image_headline hard-gate field' }, 422);
    }
    // Deterministic proof fields from the draft (NO LLM). Throws if image_headline blank (guarded above).
    let fields;
    try { fields = buildProofFieldsFromDraft(draft); }
    catch (e: any) { return jsonResponse({ ok: false, error: e?.message ?? String(e) }, 422); }
    // Resolve governed assets (service_role-only RPC). Fail loud on resolver error/shortfall — NO raw-URL fallback.
    const { data: resolved, error: resErr } = await supabase.rpc('resolve_brand_assets', { p_client_slug: clientSlug, p_asset_keys: [logoKey, bgKey] });
    if (resErr) return jsonResponse({ ok: false, error: `resolver_failed: ${resErr.message}` }, 500);
    let mapped;
    try { mapped = mapResolvedAssets(resolved as any, { logo: logoKey, background: bgKey }); }
    catch (e: any) { return jsonResponse({ ok: false, error: e?.message ?? String(e) }, 422); }
    const modifications = buildManualModifications({ fields, logoUrl: mapped.logo.asset_url, backgroundUrl: mapped.background.asset_url });
    const renderScript = { template_id: impl.provider_template_id, modifications, output_format: impl.output_format };
    const props_hash = await computePropsHash(modifications);
    const templateSpec = buildGovernedTemplateSpec(impl, { propsHash: props_hash, logo: mapped.logo, background: mapped.background });
    const renderSpec = { label: DRAFT_PROOF_LABEL, source_post_draft_id: postDraftId, template: templateSpec };
    // v3.15.0 (H2): governed assets are fail-loud — verify the RESOLVED logo + background
    // are reachable BEFORE the Creatomate submit. NO fallback (governed); unreachable → 502.
    const draftProofMemo = new Map<string, Promise<AssetVerdict>>();
    try {
      await assertGovernedAssetReachable('logo', mapped.logo.asset_url, draftProofMemo);
      await assertGovernedAssetReachable('background', mapped.background.asset_url, draftProofMemo);
    } catch (e: any) {
      return jsonResponse({ ok: false, error: e?.message ?? String(e) }, 502);
    }
    // Storage ext + mime from the impl's output_format (jpg→jpg/image/jpeg, png→png/image/png).
    // The proven 16:9 impl keeps its EXACT prior path `_smoke/branch_b_proof_${postDraftId}.jpg`;
    // the new 1:1 impl gets a DISTINCT `_smoke/branch_b_proof_${postDraftId}_1x1.jpg` path.
    const ext = impl.output_format === 'png' ? 'png' : 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const variantSuffix = impl.implementation_id === PP_NEWS_STATIC_16x9.implementation_id ? '' : '_1x1';
    const storagePath = `_smoke/branch_b_proof_${postDraftId}${variantSuffix}.${ext}`;
    const storageUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript, storagePath, mimeType, postDraftId, clientId: draft.client_id, iceFormatKey: 'image_quote', renderSpec, logMustSucceed: true });
    return jsonResponse({ ok: true, mode: DRAFT_PROOF_MODE, implementation_id: implId, post_draft_id: postDraftId, storage_url: storageUrl, props_hash, asset_keys: templateSpec.asset_keys, asset_ids: templateSpec.asset_ids, resolver_used: true, render_spec_label: DRAFT_PROOF_LABEL });
  }

  const supabase = getServiceClient();
  const results: any[] = [];
  // v3.15.0 (H2): ONE asset-URL validation memo per request, shared across every legacy
  // logo resolution + every governed reachability check below (a logo URL is validated at
  // most once per request even when many drafts share the same brand logo).
  const logoMemo = new Map<string, Promise<AssetVerdict>>();

  async function getBrandAndSlug(clientId: string) {
    const { data: brand } = await supabase.schema('c').from('client_brand_profile').select('brand_colour_primary,brand_colour_secondary,brand_logo_url,brand_name').eq('client_id', clientId).limit(1).maybeSingle();
    const { data: cl } = await supabase.schema('c').from('client').select('client_slug').eq('client_id', clientId).limit(1).maybeSingle();
    return { primaryColour: brand?.brand_colour_primary ?? '#0A2A4A', secondaryColour: brand?.brand_colour_secondary ?? '#1C8A8A', clientName: brand?.brand_name ?? 'ICE', logoUrl: brand?.brand_logo_url ?? null, clientSlug: cl?.client_slug ?? clientId };
  }

  async function isImageEnabled(clientId: string): Promise<boolean> {
    const { data } = await supabase.schema('c').from('client_publish_profile').select('image_generation_enabled').eq('client_id', clientId).eq('platform', 'facebook').limit(1).maybeSingle();
    return Boolean(data?.image_generation_enabled);
  }

  async function isVideoEnabled(clientId: string): Promise<boolean> {
    const { data } = await supabase.schema('c').from('client_publish_profile').select('video_generation_enabled').eq('client_id', clientId).eq('platform', 'facebook').limit(1).maybeSingle();
    return Boolean(data?.video_generation_enabled);
  }

  // ── image_quote ─────────────────────────────────────────────────────────────
  const { data: quoteDrafts } = await supabase.schema('m').from('post_draft').select('post_draft_id, client_id, image_headline, draft_body, draft_format').eq('approval_status', 'approved').eq('image_status', 'pending').eq('recommended_format', 'image_quote').limit(3);
  for (const draft of (quoteDrafts ?? [])) {
    try {
      const clientId = await resolveClientId(supabase, draft.post_draft_id, draft.client_id);
      if (!clientId) { results.push({ post_draft_id: draft.post_draft_id, format: 'image_quote', status: 'skipped', reason: 'client_id_unresolvable' }); continue; }
      if (!(await isImageEnabled(clientId))) { await supabase.schema('m').from('post_draft').update({ image_status: 'skipped', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id); results.push({ post_draft_id: draft.post_draft_id, format: 'image_quote', status: 'skipped' }); continue; }
      const b = await getBrandAndSlug(clientId);
      // ── v3.14.1 BRANCH B / LANE B1-v1: Property-Pulse-ONLY governed image_quote branch.
      // The gate keys on the loop's resolved clientId (the RELIABLE PP identity), NOT
      // b.clientSlug — getBrandAndSlug falls back to the client-id UUID when c.client.client_slug
      // is null, which made the v3.14.0 slug gate false and silently routed PP back to legacy.
      // Inside the branch, resolve_brand_assets + the storage path use the CANONICAL slug
      // constant B1_GOVERNED_CLIENT_SLUG, never b.clientSlug. Runs INSIDE this existing
      // try/catch, so any failure (headline gate / resolver / render) hits the EXISTING
      // production failure path → image_status='failed'. There is NO fallback to the legacy
      // buildImageQuoteScript for PP — governed-only, fail-loud. Every non-PP client falls
      // through to the byte-unchanged legacy path below.
      if (isB1GovernedImageQuote(clientId)) {
        assertHeadlineWithinGate(draft.image_headline);  // minimal hard-gate, BEFORE any resolver/Creatomate call
        const backgroundKey = selectB1BackgroundKey(draft.post_draft_id);          // B1-v2: deterministic per-draft background
        const b1AssetKeys = { logo: B1_LOGO_KEY, background: backgroundKey };       // B1-v2: per-draft asset contract (logo fixed)
        const { data: resolved, error: resolveErr } = await supabase.rpc('resolve_brand_assets', { p_client_slug: B1_GOVERNED_CLIENT_SLUG, p_asset_keys: [b1AssetKeys.logo, b1AssetKeys.background] });
        if (resolveErr) throw new Error(`b1 resolver_failed: ${resolveErr.message}`);
        const mapped = mapResolvedAssets(resolved as any, b1AssetKeys);  // throws on shortfall — governed-only
        const fields = buildProofFieldsFromDraft({ image_headline: draft.image_headline, client_id: clientId, recommended_format: 'image_quote' });
        const subtitle = deriveB1Subtitle(draft.draft_body);   // B1-v2: governed subtitle from draft_body (first non-empty paragraph, truncated)
        const modifications = buildManualModifications({ fields: { ...fields, subtitle }, logoUrl: mapped.logo.asset_url, backgroundUrl: mapped.background.asset_url });
        const props_hash = await computePropsHash(modifications);
        const templateSpec = buildGovernedTemplateSpec(NEWS_STATIC_CENTERED_SCRIM_1x1, { propsHash: props_hash, logo: mapped.logo, background: mapped.background });
        const renderScript = { template_id: NEWS_STATIC_CENTERED_SCRIM_1x1.provider_template_id, modifications, output_format: NEWS_STATIC_CENTERED_SCRIM_1x1.output_format };
        const renderSpec = { label: B1_PRODUCTION_LABEL, template: templateSpec, background_key: backgroundKey, subtitle_chars: subtitle.length };  // B1-v2: record selected background + subtitle length in evidence
        const renderSpecWithContract = echoContractToRenderSpec(renderSpec, (draft as any).draft_format);  // v3.18.0 (ACI v0 B2): echo the four draft_format.contract identity fields into render_spec; evidence-only, safe no-op when contract absent/malformed (validation = Slice C)
        const contract_validation = validateContract({
          draftFormat: (draft as any).draft_format,
          headline: draft.image_headline,
          subtitle,
          logoUrl: mapped.logo.asset_url,
          backgroundUrl: mapped.background.asset_url,
          headlineLimit: B1_HEADLINE_MAX_CHARS,
          subtitleLimit: B1_SUBTITLE_MAX_CHARS,
        }, nowIso);  // ACI v0 Slice C: warn-only contract validation; pure, never throws; additive evidence
        const renderSpecWithValidation = { ...renderSpecWithContract, contract_validation };
        // v3.15.0 (H2): governed assets are fail-loud — verify the RESOLVED logo + background
        // are reachable BEFORE the Creatomate submit. NO fallback (governed). A throw here hits
        // the EXISTING per-draft catch → image_status='failed'. Does NOT touch the B1 gate.
        await assertGovernedAssetReachable('logo', mapped.logo.asset_url, logoMemo);
        await assertGovernedAssetReachable('background', mapped.background.asset_url, logoMemo);
        const imageUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript, storagePath: `${B1_GOVERNED_CLIENT_SLUG}/${draft.post_draft_id}.jpg`, mimeType: 'image/jpeg', postDraftId: draft.post_draft_id, clientId, iceFormatKey: 'image_quote', renderSpec: renderSpecWithValidation });
        await supabase.schema('m').from('post_draft').update({ image_url: imageUrl, image_status: 'generated', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
        results.push({ post_draft_id: draft.post_draft_id, format: 'image_quote', status: 'generated', image_url: imageUrl, governed: true });
        continue;
      }
      const headline = (draft.image_headline ?? '').trim() || 'Insights for providers and professionals';
      // v3.15.1 (H2): validate the legacy brand logo BEFORE building; a 4xx/malformed logo
      // falls back to the existing wordmark/no-logo path (logoUrl=null overrides b.logoUrl);
      // a transient blip PROCEEDS with the original logo (Creatomate is source of truth).
      const { logoUrl } = await resolveLegacyLogo(b.logoUrl, logoMemo);
      const imageUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript: buildImageQuoteScript({ headline, ...b, logoUrl }), storagePath: `${b.clientSlug}/${draft.post_draft_id}.png`, mimeType: 'image/png', postDraftId: draft.post_draft_id, clientId, iceFormatKey: 'image_quote' });
      await supabase.schema('m').from('post_draft').update({ image_url: imageUrl, image_status: 'generated', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
      results.push({ post_draft_id: draft.post_draft_id, format: 'image_quote', status: 'generated', image_url: imageUrl });
    } catch (e: any) { const msg = (e?.message ?? String(e)).slice(0, 2000); await supabase.schema('m').from('post_draft').update({ image_status: 'failed', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id); results.push({ post_draft_id: draft.post_draft_id, format: 'image_quote', status: 'failed', error: msg }); }
  }

  // ── animated_text_reveal ────────────────────────────────────────────────────
  const { data: animDrafts } = await supabase.schema('m').from('post_draft').select('post_draft_id, client_id, image_headline').eq('approval_status', 'approved').eq('image_status', 'pending').eq('recommended_format', 'animated_text_reveal').limit(2);
  for (const draft of (animDrafts ?? [])) {
    try {
      const clientId = await resolveClientId(supabase, draft.post_draft_id, draft.client_id);
      if (!clientId) { results.push({ post_draft_id: draft.post_draft_id, format: 'animated_text_reveal', status: 'skipped', reason: 'client_id_unresolvable' }); continue; }
      if (!(await isImageEnabled(clientId))) { await supabase.schema('m').from('post_draft').update({ image_status: 'skipped', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id); results.push({ post_draft_id: draft.post_draft_id, format: 'animated_text_reveal', status: 'skipped' }); continue; }
      const b = await getBrandAndSlug(clientId);
      const headline = (draft.image_headline ?? '').trim() || 'Insights for providers and professionals';
      const { logoUrl } = await resolveLegacyLogo(b.logoUrl, logoMemo);  // v3.15.0 (H2)
      const imageUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript: buildAnimatedTextRevealScript({ headline, ...b, logoUrl }), storagePath: `${b.clientSlug}/${draft.post_draft_id}.gif`, mimeType: 'image/gif', postDraftId: draft.post_draft_id, clientId, iceFormatKey: 'animated_text_reveal' });
      await supabase.schema('m').from('post_draft').update({ image_url: imageUrl, image_status: 'generated', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
      results.push({ post_draft_id: draft.post_draft_id, format: 'animated_text_reveal', status: 'generated', image_url: imageUrl });
    } catch (e: any) { const msg = (e?.message ?? String(e)).slice(0, 2000); await supabase.schema('m').from('post_draft').update({ image_status: 'failed', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id); results.push({ post_draft_id: draft.post_draft_id, format: 'animated_text_reveal', status: 'failed', error: msg }); }
  }

  // ── animated_data ───────────────────────────────────────────────────────────
  const { data: dataDrafts } = await supabase.schema('m').from('post_draft').select('post_draft_id, client_id, draft_body, image_headline').eq('approval_status', 'approved').eq('image_status', 'pending').eq('recommended_format', 'animated_data').limit(2);
  for (const draft of (dataDrafts ?? [])) {
    try {
      const clientId = await resolveClientId(supabase, draft.post_draft_id, draft.client_id);
      if (!clientId) { results.push({ post_draft_id: draft.post_draft_id, format: 'animated_data', status: 'skipped', reason: 'client_id_unresolvable' }); continue; }
      if (!(await isImageEnabled(clientId))) { await supabase.schema('m').from('post_draft').update({ image_status: 'skipped', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id); results.push({ post_draft_id: draft.post_draft_id, format: 'animated_data', status: 'skipped' }); continue; }
      const b = await getBrandAndSlug(clientId);
      const spec = await extractStatSpec({ anthropicKey, postBody: draft.draft_body ?? '', imageHeadline: draft.image_headline ?? '', clientName: b.clientName });
      const { logoUrl } = await resolveLegacyLogo(b.logoUrl, logoMemo);  // v3.15.0 (H2)
      const imageUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript: buildAnimatedDataScript({ statValue: spec.stat_value, statLabel: spec.stat_label, contextLine: spec.context_line, ...b, logoUrl }), storagePath: `${b.clientSlug}/${draft.post_draft_id}.gif`, mimeType: 'image/gif', postDraftId: draft.post_draft_id, clientId, iceFormatKey: 'animated_data' });
      await supabase.schema('m').from('post_draft').update({ image_url: imageUrl, image_status: 'generated', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
      results.push({ post_draft_id: draft.post_draft_id, format: 'animated_data', status: 'generated', stat_value: spec.stat_value, image_url: imageUrl });
    } catch (e: any) { const msg = (e?.message ?? String(e)).slice(0, 2000); await supabase.schema('m').from('post_draft').update({ image_status: 'failed', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id); results.push({ post_draft_id: draft.post_draft_id, format: 'animated_data', status: 'failed', error: msg }); }
  }

  // ── carousel ────────────────────────────────────────────────────────────────
  // v3.9.2 fix: NO approval_status gate for carousel.
  // Carousel images must be generated BEFORE auto-approver can score the draft.
  // Gating on approval_status='approved' caused deadlock:
  //   - auto-approver won't approve without seeing the image
  //   - image-worker won't generate without approval
  // Now: pick up any carousel with image_status='pending', regardless of approval_status.
  // After image generation, auto-approver runs normally on the now-imageable draft.
  const { data: carouselDrafts } = await supabase.schema('m').from('post_draft')
    .select('post_draft_id, client_id, draft_title, draft_body')
    .eq('image_status', 'pending')
    .eq('recommended_format', 'carousel')
    .limit(2);
  for (const draft of (carouselDrafts ?? [])) {
    try {
      const clientId = await resolveClientId(supabase, draft.post_draft_id, draft.client_id);
      if (!clientId) { results.push({ post_draft_id: draft.post_draft_id, format: 'carousel', status: 'skipped', reason: 'client_id_unresolvable' }); continue; }
      if (!(await isImageEnabled(clientId))) { await supabase.schema('m').from('post_draft').update({ image_status: 'skipped', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id); results.push({ post_draft_id: draft.post_draft_id, format: 'carousel', status: 'skipped' }); continue; }
      const b = await getBrandAndSlug(clientId);
      const { data: scope } = await supabase.rpc('exec_sql', { query: `SELECT cv.vertical_name FROM c.client_content_scope ccs JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id WHERE ccs.client_id = '${clientId}' AND ccs.is_primary = true LIMIT 1` });
      const vertical = (scope as any)?.[0]?.vertical_name ?? 'professional services';
      const spec = await callContentAdvisor({ anthropicKey, postBody: draft.draft_body ?? '', postTitle: draft.draft_title ?? '', clientName: b.clientName, vertical });
      // v3.15.1 (H2): validate the legacy logo ONCE per carousel draft (before the slide
      // loop); the validated logoUrl overrides b.logoUrl for every slide. 4xx/malformed →
      // wordmark fallback; transient blip → proceed with the original logo.
      const { logoUrl } = await resolveLegacyLogo(b.logoUrl, logoMemo);
      const slideResults: any[] = [];
      let firstSlideUrl: string | null = null;
      for (let i = 0; i < spec.slides.length; i++) {
        const slide = spec.slides[i]; const slideIndex = i + 1;
        try {
          await supabase.rpc('upsert_carousel_slide', { p_post_draft_id: draft.post_draft_id, p_slide_index: slideIndex, p_slide_type: slide.type, p_headline: slide.headline, p_sub_text: slide.sub_text ?? null, p_image_url: null, p_image_status: 'pending', p_render_id: null });
          const { data: slideRow } = await supabase.rpc('exec_sql', { query: `SELECT slide_id FROM m.post_carousel_slide WHERE post_draft_id = '${draft.post_draft_id}' AND slide_index = ${slideIndex} LIMIT 1` });
          const slideId: string | null = (slideRow as any)?.[0]?.slide_id ?? null;
          const imageUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript: buildCarouselSlideScript({ slide, slideIndex, totalSlides: spec.slides.length, ...b, logoUrl }), storagePath: `${b.clientSlug}/${draft.post_draft_id}/slide_${slideIndex}.png`, mimeType: 'image/png', postDraftId: draft.post_draft_id, clientId, iceFormatKey: 'carousel', slideId });
          if (!firstSlideUrl) firstSlideUrl = imageUrl;
          await supabase.rpc('upsert_carousel_slide', { p_post_draft_id: draft.post_draft_id, p_slide_index: slideIndex, p_slide_type: slide.type, p_headline: slide.headline, p_sub_text: slide.sub_text ?? null, p_image_url: imageUrl, p_image_status: 'generated', p_render_id: '' });
          slideResults.push({ slide_index: slideIndex, type: slide.type, status: 'generated' });
        } catch (slideErr: any) {
          await supabase.rpc('upsert_carousel_slide', { p_post_draft_id: draft.post_draft_id, p_slide_index: slideIndex, p_slide_type: slide.type, p_headline: slide.headline, p_sub_text: slide.sub_text ?? null, p_image_url: null, p_image_status: 'failed', p_render_id: null });
          slideResults.push({ slide_index: slideIndex, type: slide.type, status: 'failed', error: (slideErr?.message ?? '').slice(0, 200) });
        }
      }
      const allOk = slideResults.every(s => s.status === 'generated'); const anyOk = slideResults.some(s => s.status === 'generated');
      const finalStatus = allOk ? 'generated' : (anyOk ? 'partial' : 'failed');
      await supabase.schema('m').from('post_draft').update({ image_url: firstSlideUrl, image_status: finalStatus, updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
      results.push({ post_draft_id: draft.post_draft_id, format: 'carousel', status: finalStatus, slide_count: spec.slides.length, slides: slideResults });
    } catch (e: any) { const msg = (e?.message ?? String(e)).slice(0, 2000); await supabase.schema('m').from('post_draft').update({ image_status: 'failed', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id); results.push({ post_draft_id: draft.post_draft_id, format: 'carousel', status: 'failed', error: msg }); }
  }

  // ── video format fallback: render image_quote when video_generation_enabled=false
  const { data: videoFallbackDrafts } = await supabase.schema('m').from('post_draft')
    .select('post_draft_id, client_id, image_headline, recommended_format')
    .eq('approval_status', 'approved')
    .eq('image_status', 'pending')
    .in('recommended_format', VIDEO_FORMATS)
    .limit(3);
  for (const draft of (videoFallbackDrafts ?? [])) {
    try {
      const clientId = await resolveClientId(supabase, draft.post_draft_id, draft.client_id);
      if (!clientId) { results.push({ post_draft_id: draft.post_draft_id, format: draft.recommended_format, status: 'skipped', reason: 'client_id_unresolvable' }); continue; }
      if (await isVideoEnabled(clientId)) {
        results.push({ post_draft_id: draft.post_draft_id, format: draft.recommended_format, status: 'deferred_to_video_worker' });
        continue;
      }
      if (!(await isImageEnabled(clientId))) {
        await supabase.schema('m').from('post_draft').update({ image_status: 'skipped', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
        results.push({ post_draft_id: draft.post_draft_id, format: draft.recommended_format, status: 'skipped' });
        continue;
      }
      const b = await getBrandAndSlug(clientId);
      const headline = (draft.image_headline ?? '').trim() || 'Insights for providers and professionals';
      const { logoUrl } = await resolveLegacyLogo(b.logoUrl, logoMemo);  // v3.15.0 (H2)
      const imageUrl = await renderUploadAndLog({
        supabase, creatomateKey,
        renderScript: buildImageQuoteScript({ headline, ...b, logoUrl }),
        storagePath: `${b.clientSlug}/${draft.post_draft_id}.png`,
        mimeType: 'image/png',
        postDraftId: draft.post_draft_id,
        clientId,
        iceFormatKey: 'image_quote_video_fallback',
      });
      await supabase.schema('m').from('post_draft').update({ image_url: imageUrl, image_status: 'generated', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
      results.push({ post_draft_id: draft.post_draft_id, format: draft.recommended_format, status: 'generated_as_image_quote_fallback', image_url: imageUrl });
    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 2000);
      await supabase.schema('m').from('post_draft').update({ image_status: 'failed', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
      results.push({ post_draft_id: draft.post_draft_id, format: draft.recommended_format, status: 'failed', error: msg });
    }
  }

  if (!results.length) return jsonResponse({ ok: true, message: 'no_drafts_pending', version: VERSION });
  return jsonResponse({ ok: true, version: VERSION, processed: results.length, results });
});
