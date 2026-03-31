// image-worker v3.9.1
// Fix 1: Resolve client_id from digest join chain when post_draft.client_id is null.
//         Drafts generated via seed-and-enqueue-facebook path have null client_id.
//         Without this fix, isImageEnabled() returns false and all such drafts are skipped.
// Fix 2: Add image_quote fallback renderer for video-format drafts (video_short_kinetic,
//         video_short_stat, video_short_kinetic_voice, video_short_stat_voice) when
//         video_generation_enabled = false on the client publish profile.
//         These drafts were sitting permanently in image_status='pending' with no worker
//         picking them up, causing 0 image posts since 21 Mar 2026.
// Fix 3: Carousel path was setting image_status='generated' without writing image_url.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'image-worker-v3.9.1';
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

// ─── resolveClientId ──────────────────────────────────────────────────────────
// When post_draft.client_id is null (drafts from seed-and-enqueue-facebook path),
// resolve via: post_draft -> digest_item -> digest_run -> client

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

// ─── pollRender ────────────────────────────────────────────────────────────────

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

// ─── renderUploadAndLog ────────────────────────────────────────────────────────

async function renderUploadAndLog(opts: {
  supabase: ReturnType<typeof getServiceClient>;
  creatomateKey: string;
  renderScript: object;
  storagePath: string;
  mimeType: string;
  postDraftId: string;
  clientId: string;
  iceFormatKey: string;
  slideId?: string | null;
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
        p_credits_used: creditsUsed, p_render_duration_ms: durationMs, p_error_message: null, p_render_spec: null,
      });
      if (logErr) console.error('[image-worker] write_render_log error:', logErr.message);
    } catch (logEx: any) { console.error('[image-worker] write_render_log threw:', logEx?.message); }

    return storageUrl;

  } catch (e: any) {
    const errMsg = (e?.message ?? String(e)).slice(0, 500);
    const durationMs = Date.now() - startMs;
    try {
      const { error: logErr } = await supabase.rpc('write_render_log', {
        p_post_draft_id: postDraftId, p_slide_id: slideId ?? null, p_client_id: clientId,
        p_ice_format_key: iceFormatKey, p_render_engine: 'creatomate', p_creatomate_render_id: renderId,
        p_status: errMsg.includes('timed out') ? 'timeout' : 'failed', p_output_url: null, p_storage_url: null,
        p_credits_used: null, p_render_duration_ms: durationMs, p_error_message: errMsg, p_render_spec: null,
      });
      if (logErr) console.error('[image-worker] write_render_log (failure) error:', logErr.message);
    } catch (logEx: any) { console.error('[image-worker] write_render_log (failure) threw:', logEx?.message); }
    throw e;
  }
}

// ─── animated_data stat extractor ────────────────────────────────────────────

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

// ─── render script builders ───────────────────────────────────────────────────

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

// ─── main handler ─────────────────────────────────────────────────────────────

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

  const supabase = getServiceClient();
  const results: any[] = [];

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
  const { data: quoteDrafts } = await supabase.schema('m').from('post_draft').select('post_draft_id, client_id, image_headline').eq('approval_status', 'approved').eq('image_status', 'pending').eq('recommended_format', 'image_quote').limit(3);
  for (const draft of (quoteDrafts ?? [])) {
    try {
      const clientId = await resolveClientId(supabase, draft.post_draft_id, draft.client_id);
      if (!clientId) { results.push({ post_draft_id: draft.post_draft_id, format: 'image_quote', status: 'skipped', reason: 'client_id_unresolvable' }); continue; }
      if (!(await isImageEnabled(clientId))) { await supabase.schema('m').from('post_draft').update({ image_status: 'skipped', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id); results.push({ post_draft_id: draft.post_draft_id, format: 'image_quote', status: 'skipped' }); continue; }
      const b = await getBrandAndSlug(clientId);
      const headline = (draft.image_headline ?? '').trim() || 'Insights for providers and professionals';
      const imageUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript: buildImageQuoteScript({ headline, ...b }), storagePath: `${b.clientSlug}/${draft.post_draft_id}.png`, mimeType: 'image/png', postDraftId: draft.post_draft_id, clientId, iceFormatKey: 'image_quote' });
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
      const imageUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript: buildAnimatedTextRevealScript({ headline, ...b }), storagePath: `${b.clientSlug}/${draft.post_draft_id}.gif`, mimeType: 'image/gif', postDraftId: draft.post_draft_id, clientId, iceFormatKey: 'animated_text_reveal' });
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
      console.log(`[image-worker] animated_data: ${spec.stat_value} — ${spec.stat_label}`);
      const imageUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript: buildAnimatedDataScript({ statValue: spec.stat_value, statLabel: spec.stat_label, contextLine: spec.context_line, ...b }), storagePath: `${b.clientSlug}/${draft.post_draft_id}.gif`, mimeType: 'image/gif', postDraftId: draft.post_draft_id, clientId, iceFormatKey: 'animated_data' });
      await supabase.schema('m').from('post_draft').update({ image_url: imageUrl, image_status: 'generated', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
      results.push({ post_draft_id: draft.post_draft_id, format: 'animated_data', status: 'generated', stat_value: spec.stat_value, image_url: imageUrl });
    } catch (e: any) { const msg = (e?.message ?? String(e)).slice(0, 2000); console.error('[image-worker] animated_data failed:', msg); await supabase.schema('m').from('post_draft').update({ image_status: 'failed', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id); results.push({ post_draft_id: draft.post_draft_id, format: 'animated_data', status: 'failed', error: msg }); }
  }

  // ── carousel ────────────────────────────────────────────────────────────────
  const { data: carouselDrafts } = await supabase.schema('m').from('post_draft').select('post_draft_id, client_id, draft_title, draft_body').eq('approval_status', 'approved').eq('image_status', 'pending').eq('recommended_format', 'carousel').limit(2);
  for (const draft of (carouselDrafts ?? [])) {
    try {
      const clientId = await resolveClientId(supabase, draft.post_draft_id, draft.client_id);
      if (!clientId) { results.push({ post_draft_id: draft.post_draft_id, format: 'carousel', status: 'skipped', reason: 'client_id_unresolvable' }); continue; }
      if (!(await isImageEnabled(clientId))) { await supabase.schema('m').from('post_draft').update({ image_status: 'skipped', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id); results.push({ post_draft_id: draft.post_draft_id, format: 'carousel', status: 'skipped' }); continue; }
      const b = await getBrandAndSlug(clientId);
      const { data: scope } = await supabase.rpc('exec_sql', { query: `SELECT cv.vertical_name FROM c.client_content_scope ccs JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id WHERE ccs.client_id = '${clientId}' AND ccs.is_primary = true LIMIT 1` });
      const vertical = (scope as any)?.[0]?.vertical_name ?? 'professional services';
      const spec = await callContentAdvisor({ anthropicKey, postBody: draft.draft_body ?? '', postTitle: draft.draft_title ?? '', clientName: b.clientName, vertical });
      const slideResults: any[] = [];
      let firstSlideUrl: string | null = null;
      for (let i = 0; i < spec.slides.length; i++) {
        const slide = spec.slides[i]; const slideIndex = i + 1;
        try {
          await supabase.rpc('upsert_carousel_slide', { p_post_draft_id: draft.post_draft_id, p_slide_index: slideIndex, p_slide_type: slide.type, p_headline: slide.headline, p_sub_text: slide.sub_text ?? null, p_image_url: null, p_image_status: 'pending', p_render_id: null });
          const { data: slideRow } = await supabase.rpc('exec_sql', { query: `SELECT slide_id FROM m.post_carousel_slide WHERE post_draft_id = '${draft.post_draft_id}' AND slide_index = ${slideIndex} LIMIT 1` });
          const slideId: string | null = (slideRow as any)?.[0]?.slide_id ?? null;
          const imageUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript: buildCarouselSlideScript({ slide, slideIndex, totalSlides: spec.slides.length, ...b }), storagePath: `${b.clientSlug}/${draft.post_draft_id}/slide_${slideIndex}.png`, mimeType: 'image/png', postDraftId: draft.post_draft_id, clientId, iceFormatKey: 'carousel', slideId });
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
  // Picks up video_short_kinetic / video_short_stat / voice variants that would
  // otherwise sit in image_status='pending' indefinitely when video-worker is gated.
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
      // Only apply fallback when video is disabled
      if (await isVideoEnabled(clientId)) {
        // video-worker will handle it — skip here
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
      console.log(`[image-worker] video fallback -> image_quote for ${draft.recommended_format} draft ${draft.post_draft_id}`);
      const imageUrl = await renderUploadAndLog({
        supabase, creatomateKey,
        renderScript: buildImageQuoteScript({ headline, ...b }),
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
