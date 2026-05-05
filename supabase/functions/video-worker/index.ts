// video-worker v2.1.0 — fix: also process drafts with approval_status='published'
// Root cause: publisher marks draft 'published' before video-worker can pick it up.
// Fix: query for approval_status IN ('approved','published') so no video draft is missed.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'video-worker-v2.1.0';
const CREATOMATE_API    = 'https://api.creatomate.com/v2/renders';
const ELEVENLABS_TTS    = 'https://api.elevenlabs.io/v1/text-to-speech';
const POLL_INTERVAL_MS  = 2500;
const POLL_MAX_ATTEMPTS = 48;  // 2 min max

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-video-worker-key',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function nowIso() { return new Date().toISOString(); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getVoiceId(clientSlug: string): string | null {
  const slugUpper = clientSlug.toUpperCase().replace(/-/g, '_');
  const exact = Deno.env.get(`ELEVENLABS_VOICE_ID_${slugUpper}`);
  if (exact) return exact;
  if (clientSlug.toLowerCase().includes('ndis')) return Deno.env.get('ELEVENLABS_VOICE_ID_NDIS') ?? null;
  if (clientSlug.toLowerCase().includes('property') || clientSlug.toLowerCase().includes('pp')) return Deno.env.get('ELEVENLABS_VOICE_ID_PP') ?? null;
  return Deno.env.get('ELEVENLABS_VOICE_ID_NDIS') ?? null;
}

async function generateAndUploadVoice(
  supabase: ReturnType<typeof getServiceClient>,
  narrationText: string,
  voiceId: string,
  storagePath: string,
): Promise<string | null> {
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!apiKey || !voiceId) { console.error('[video-worker] ElevenLabs key or voice ID missing'); return null; }
  const resp = await fetch(`${ELEVENLABS_TTS}/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({ text: narrationText, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  });
  if (!resp.ok) { console.error(`[video-worker] ElevenLabs TTS ${resp.status}: ${(await resp.text()).slice(0, 300)}`); return null; }
  const audioBuf = await resp.arrayBuffer();
  const { error: upErr } = await supabase.storage.from('post-videos').upload(storagePath, audioBuf, { contentType: 'audio/mpeg', upsert: true });
  if (upErr) { console.error('[video-worker] audio upload failed:', upErr.message); return null; }
  return `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/post-videos/${storagePath}`;
}

async function pollRender(renderId: string, apiKey: string, startMs: number): Promise<{ url: string; creditsUsed: number | null; durationMs: number }> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const resp = await fetch(`${CREATOMATE_API}/${renderId}`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
    if (!resp.ok) throw new Error(`Poll failed: ${resp.status}`);
    const data = await resp.json();
    if (data.status === 'succeeded') return { url: data.url, creditsUsed: data.credits != null ? Number(data.credits) : null, durationMs: Date.now() - startMs };
    if (data.status === 'failed') throw new Error(`Creatomate failed: ${data.error_message ?? 'unknown'}`);
    console.log(`[video-worker] render ${renderId}: ${data.status} (${i + 1}/${POLL_MAX_ATTEMPTS})`);
  }
  throw new Error('Render timed out after 2 minutes');
}

async function renderUploadAndLog(opts: {
  supabase: ReturnType<typeof getServiceClient>;
  creatomateKey: string;
  renderScript: object;
  storagePath: string;
  postDraftId: string;
  clientId: string;
  iceFormatKey: string;
}): Promise<string> {
  const { supabase, creatomateKey, renderScript, storagePath, postDraftId, clientId, iceFormatKey } = opts;
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
    const vidBuf = await (await fetch(renderUrl)).arrayBuffer();
    const { error: upErr } = await supabase.storage.from('post-videos').upload(storagePath, vidBuf, { contentType: 'video/mp4', upsert: true });
    if (upErr) throw new Error(`Storage upload: ${upErr.message}`);
    const storageUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/post-videos/${storagePath}`;
    try {
      const { error: logErr } = await supabase.rpc('write_render_log', {
        p_post_draft_id: postDraftId, p_slide_id: null, p_client_id: clientId,
        p_ice_format_key: iceFormatKey, p_render_engine: 'creatomate',
        p_creatomate_render_id: renderId, p_status: 'succeeded',
        p_output_url: renderUrl, p_storage_url: storageUrl,
        p_credits_used: creditsUsed, p_render_duration_ms: durationMs,
        p_error_message: null, p_render_spec: null,
      });
      if (logErr) console.error('[video-worker] write_render_log error:', logErr.message);
    } catch (logEx: any) { console.error('[video-worker] write_render_log threw:', logEx?.message); }
    return storageUrl;
  } catch (e: any) {
    const errMsg = (e?.message ?? String(e)).slice(0, 500);
    try {
      await supabase.rpc('write_render_log', {
        p_post_draft_id: postDraftId, p_slide_id: null, p_client_id: clientId,
        p_ice_format_key: iceFormatKey, p_render_engine: 'creatomate',
        p_creatomate_render_id: renderId, p_status: errMsg.includes('timed out') ? 'timeout' : 'failed',
        p_output_url: null, p_storage_url: null, p_credits_used: null,
        p_render_duration_ms: Date.now() - startMs, p_error_message: errMsg, p_render_spec: null,
      });
    } catch (logEx: any) { console.error('[video-worker] write_render_log (fail) threw:', logEx?.message); }
    throw e;
  }
}

async function getBrand(supabase: ReturnType<typeof getServiceClient>, clientId: string) {
  const { data: brand } = await supabase.schema('c').from('client_brand_profile')
    .select('brand_colour_primary,brand_colour_secondary,brand_logo_url,brand_name')
    .eq('client_id', clientId).limit(1).maybeSingle();
  const { data: cl } = await supabase.schema('c').from('client')
    .select('client_slug').eq('client_id', clientId).limit(1).maybeSingle();
  return {
    primaryColour:   brand?.brand_colour_primary   ?? '#0A2A4A',
    secondaryColour: brand?.brand_colour_secondary ?? '#1C8A8A',
    clientName:      brand?.brand_name             ?? 'ICE',
    logoUrl:         brand?.brand_logo_url         ?? null,
    clientSlug:      cl?.client_slug               ?? clientId,
  };
}

type VideoScene = { type: 'hook' | 'point' | 'cta'; headline: string; body: string | null; duration_s: number; };

function buildKineticTextSpec(opts: {
  scenes: VideoScene[];
  clientName: string; primaryColour: string; secondaryColour: string; logoUrl: string | null;
  audioUrl?: string | null;
}): object {
  const { scenes, clientName, primaryColour, secondaryColour, logoUrl, audioUrl } = opts;
  const W = 1080, H = 1920;
  let t = 0;
  const timings = scenes.map(s => { const e = { start: t, dur: s.duration_s }; t += s.duration_s; return e; });
  const totalDuration = t;
  const elements: object[] = [];
  if (audioUrl) elements.push({ type: 'audio', source: audioUrl, time: 0, duration: totalDuration, volume: 1.0 });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: '0px', x_anchor: '0%', y_anchor: '0%' });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: `${H}px`, x_anchor: '0%', y_anchor: '100%' });
  if (logoUrl) {
    elements.push({ type: 'image', source: logoUrl, width: '90px', height: '90px', x: '44px', y: '44px', x_anchor: '0%', y_anchor: '0%', fit: 'contain' });
  } else {
    elements.push({ type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '700', font_size: '26px', fill_color: secondaryColour, x: '60px', y: '90px', x_anchor: '0%', y_anchor: '50%' });
  }
  const pointSceneCount = scenes.filter(s => s.type === 'point').length;
  let pointNum = 0;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const { start: tStart, dur: tDur } = timings[i];
    const F = 0.5, FO = 0.35;
    if (scene.type === 'hook') {
      elements.push({ type: 'text', text: scene.headline, font_family: 'Montserrat', font_weight: '900', font_size: '76px', fill_color: '#FFFFFF', line_height: '130%', width: '960px', height: '700px', x_alignment: '50%', y_alignment: '50%', x: '60px', y: '560px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.4, duration: tDur - 0.8, enter: { effect: 'fade', duration: F }, exit: { effect: 'fade', duration: FO } });
      elements.push({ type: 'text', text: '\u2193 Keep watching', font_family: 'Montserrat', font_weight: '400', font_size: '26px', fill_color: secondaryColour, opacity: 0.75, width: `${W}px`, x_alignment: '50%', x: '0px', y: '1700px', x_anchor: '0%', y_anchor: '0%', time: tStart + 1.2, duration: tDur - 1.6, enter: { effect: 'fade', duration: 0.6 }, exit: { effect: 'fade', duration: FO } });
    } else if (scene.type === 'cta') {
      elements.push({ type: 'text', text: '?', font_family: 'Montserrat', font_weight: '900', font_size: '500px', fill_color: secondaryColour, opacity: 0.07, width: `${W}px`, x_alignment: '50%', x: '0px', y: '400px', x_anchor: '0%', y_anchor: '0%', time: tStart, duration: tDur });
      elements.push({ type: 'text', text: scene.headline, font_family: 'Montserrat', font_weight: '700', font_size: '62px', fill_color: '#FFFFFF', line_height: '130%', width: '880px', height: '600px', x_alignment: '50%', y_alignment: '50%', x: '100px', y: '650px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.3, duration: tDur - 0.6, enter: { effect: 'fade', duration: F }, exit: { effect: 'fade', duration: FO } });
      elements.push({ type: 'text', text: `Follow ${clientName} for more`, font_family: 'Montserrat', font_weight: '400', font_size: '30px', fill_color: secondaryColour, opacity: 0.8, width: `${W}px`, x_alignment: '50%', x: '0px', y: '1650px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.9, duration: tDur - 1.1, enter: { effect: 'fade', duration: 0.5 } });
    } else {
      pointNum++;
      elements.push({ type: 'text', text: `${pointNum}/${pointSceneCount}`, font_family: 'Montserrat', font_weight: '400', font_size: '28px', fill_color: secondaryColour, opacity: 0.6, x: `${W - 60}px`, y: '190px', x_anchor: '100%', y_anchor: '50%', time: tStart + 0.2, duration: tDur - 0.4, enter: { effect: 'fade', duration: 0.3 }, exit: { effect: 'fade', duration: 0.3 } });
      elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, opacity: 0.7, width: '5px', height: '340px', x: '60px', y: '480px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.3, duration: tDur - 0.6, enter: { effect: 'slide', direction: '270', duration: 0.35 }, exit: { effect: 'fade', duration: 0.3 } });
      elements.push({ type: 'text', text: scene.headline, font_family: 'Montserrat', font_weight: '700', font_size: '64px', fill_color: '#FFFFFF', line_height: '130%', width: '880px', x: '100px', y: '480px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.4, duration: tDur - 0.8, enter: { effect: 'fade', duration: F }, exit: { effect: 'fade', duration: FO } });
      if (scene.body) {
        elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, opacity: 0.4, width: '880px', height: '2px', x: '100px', y: '870px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.6, duration: tDur - 1.0, enter: { effect: 'wipe', direction: '270', duration: 0.35 }, exit: { effect: 'fade', duration: 0.3 } });
        elements.push({ type: 'text', text: scene.body, font_family: 'Montserrat', font_weight: '400', font_size: '40px', fill_color: '#CBD5E1', line_height: '145%', width: '880px', x: '100px', y: '895px', x_anchor: '0%', y_anchor: '0%', time: tStart + 0.7, duration: tDur - 1.0, enter: { effect: 'fade', duration: F }, exit: { effect: 'fade', duration: FO } });
      }
    }
  }
  return { output_format: 'mp4', width: W, height: H, duration: totalDuration, frame_rate: 30, fill_color: primaryColour, elements };
}

function buildStatRevealSpec(opts: {
  statValue: string; statLabel: string; contextLine: string; ctaText: string;
  clientName: string; primaryColour: string; secondaryColour: string; logoUrl: string | null;
  audioUrl?: string | null;
}): object {
  const { statValue, statLabel, contextLine, ctaText, clientName, primaryColour, secondaryColour, logoUrl, audioUrl } = opts;
  const W = 1080, H = 1920;
  const statFontSize = statValue.length <= 4 ? '220px' : statValue.length <= 6 ? '180px' : statValue.length <= 8 ? '150px' : '120px';
  const elements: object[] = [];
  if (audioUrl) elements.push({ type: 'audio', source: audioUrl, time: 0, duration: 20, volume: 1.0 });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: '0px', x_anchor: '0%', y_anchor: '0%' });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: `${W}px`, height: '8px', x: '0px', y: `${H}px`, x_anchor: '0%', y_anchor: '100%' });
  if (logoUrl) { elements.push({ type: 'image', source: logoUrl, width: '90px', height: '90px', x: '44px', y: '44px', x_anchor: '0%', y_anchor: '0%', fit: 'contain' }); }
  else { elements.push({ type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '700', font_size: '26px', fill_color: secondaryColour, x: '60px', y: '90px', x_anchor: '0%', y_anchor: '50%' }); }
  elements.push({ type: 'shape', shape: 'circle', fill_color: secondaryColour, opacity: 0.06, width: '900px', height: '900px', x: '50%', y: '48%', x_anchor: '50%', y_anchor: '50%', time: 0 });
  elements.push({ type: 'text', text: statValue, font_family: 'Montserrat', font_weight: '900', font_size: statFontSize, fill_color: '#FFFFFF', width: `${W}px`, x_alignment: '50%', x: '0px', y: '680px', x_anchor: '0%', y_anchor: '0%', time: 1.5, enter: { effect: 'scale', duration: 0.9, easing: 'bounce' } });
  elements.push({ type: 'shape', shape: 'rectangle', fill_color: secondaryColour, width: '640px', height: '6px', x: '220px', y: '1060px', x_anchor: '0%', y_anchor: '0%', time: 3.5, enter: { effect: 'wipe', direction: '270', duration: 0.5 } });
  elements.push({ type: 'text', text: statLabel.toUpperCase(), font_family: 'Montserrat', font_weight: '600', font_size: '36px', fill_color: secondaryColour, width: `${W}px`, x_alignment: '50%', x: '0px', y: '1090px', x_anchor: '0%', y_anchor: '0%', time: 4.5, enter: { effect: 'slide', direction: '270', duration: 0.5 } });
  elements.push({ type: 'text', text: contextLine, font_family: 'Montserrat', font_weight: '400', font_size: '34px', fill_color: '#CBD5E1', line_height: '145%', width: '860px', x_alignment: '50%', x: '110px', y: '1200px', x_anchor: '0%', y_anchor: '0%', time: 6.5, enter: { effect: 'fade', duration: 0.7 } });
  elements.push({ type: 'text', text: ctaText, font_family: 'Montserrat', font_weight: '600', font_size: '42px', fill_color: '#FFFFFF', line_height: '140%', width: '880px', x_alignment: '50%', x: '100px', y: '1430px', x_anchor: '0%', y_anchor: '0%', time: 10.0, enter: { effect: 'fade', duration: 0.7 } });
  elements.push({ type: 'text', text: clientName, font_family: 'Montserrat', font_weight: '400', font_size: '30px', fill_color: '#D9E1E6', opacity: 0.7, width: `${W}px`, x_alignment: '50%', x: '0px', y: '1780px', x_anchor: '0%', y_anchor: '0%', time: 14.0, enter: { effect: 'fade', duration: 0.5 } });
  return { output_format: 'mp4', width: W, height: H, duration: 20, frame_rate: 30, fill_color: primaryColour, elements };
}

async function processDraft(opts: {
  supabase: ReturnType<typeof getServiceClient>;
  creatomateKey: string;
  draft: { post_draft_id: string; client_id: string; draft_format: any; recommended_format: string; };
  withVoice: boolean;
}): Promise<object> {
  const { supabase, creatomateKey, draft, withVoice } = opts;
  const fmt = draft.recommended_format;
  const vs  = draft.draft_format?.video_script;
  const b   = await getBrand(supabase, draft.client_id);
  let audioUrl: string | null = null;
  if (withVoice) {
    const voiceId = getVoiceId(b.clientSlug);
    if (!voiceId) throw new Error(`No voice ID configured for client ${b.clientSlug}`);
    const narration = vs?.narration_text ?? '';
    if (!narration) throw new Error('video_script.narration_text is empty');
    const audioPath = `${b.clientSlug}/${draft.post_draft_id}_voice.mp3`;
    audioUrl = await generateAndUploadVoice(supabase, narration, voiceId, audioPath);
    if (!audioUrl) throw new Error('ElevenLabs TTS failed');
  }
  const isKinetic = fmt === 'video_short_kinetic' || fmt === 'video_short_kinetic_voice';
  const isStat    = fmt === 'video_short_stat'    || fmt === 'video_short_stat_voice';
  if (isKinetic) {
    if (!vs?.scenes || !Array.isArray(vs.scenes) || vs.scenes.length < 3)
      throw new Error('missing_or_invalid_video_script_scenes');
    const spec = buildKineticTextSpec({ scenes: vs.scenes, ...b, audioUrl });
    const storagePath = `${b.clientSlug}/${draft.post_draft_id}_kinetic${withVoice ? '_voice' : ''}.mp4`;
    const videoUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript: spec, storagePath, postDraftId: draft.post_draft_id, clientId: draft.client_id, iceFormatKey: fmt });
    await supabase.schema('m').from('post_draft').update({ video_url: videoUrl, video_status: 'generated', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
    return { post_draft_id: draft.post_draft_id, format: fmt, status: 'generated', video_url: videoUrl };
  }
  if (isStat) {
    if (!vs?.stat_value) throw new Error('missing_video_script_stat_value');
    const spec = buildStatRevealSpec({ statValue: vs.stat_value, statLabel: vs.stat_label ?? 'key statistic', contextLine: vs.context_line ?? '', ctaText: vs.cta_text ?? 'What does this mean for you?', ...b, audioUrl });
    const storagePath = `${b.clientSlug}/${draft.post_draft_id}_stat${withVoice ? '_voice' : ''}.mp4`;
    const videoUrl = await renderUploadAndLog({ supabase, creatomateKey, renderScript: spec, storagePath, postDraftId: draft.post_draft_id, clientId: draft.client_id, iceFormatKey: fmt });
    await supabase.schema('m').from('post_draft').update({ video_url: videoUrl, video_status: 'generated', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
    return { post_draft_id: draft.post_draft_id, format: fmt, status: 'generated', video_url: videoUrl };
  }
  throw new Error(`Unsupported format: ${fmt}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return jsonResponse({ ok: true, function: 'video-worker', version: VERSION });

  const expected = Deno.env.get('PUBLISHER_API_KEY');
  const provided  = req.headers.get('x-video-worker-key');
  if (!expected) return jsonResponse({ ok: false, error: 'PUBLISHER_API_KEY_not_set' }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);

  const creatomateKey = Deno.env.get('CREATOMATE_API_KEY');
  if (!creatomateKey) return jsonResponse({ ok: false, error: 'CREATOMATE_API_KEY not set' }, 500);

  const supabase = getServiceClient();
  const results: any[] = [];

  // v2.1.0 FIX: include both 'approved' and 'published' approval_status.
  // Previously only 'approved' was queried, which meant drafts published to Facebook
  // before video-worker ran were permanently skipped.
  const { data: pendingDrafts } = await supabase.schema('m').from('post_draft')
    .select('post_draft_id, client_id, draft_format, recommended_format')
    .in('approval_status', ['approved', 'published'])
    .eq('video_status', 'pending')
    .in('recommended_format', ['video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice'])
    .limit(4);

  for (const draft of (pendingDrafts ?? [])) {
    const withVoice = draft.recommended_format.endsWith('_voice');
    try {
      const result = await processDraft({ supabase, creatomateKey, draft, withVoice });
      results.push(result);
      console.log(`[video-worker] ${VERSION} done: ${draft.post_draft_id} (${draft.recommended_format})`);
    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 2000);
      console.error(`[video-worker] failed ${draft.post_draft_id}:`, msg);
      await supabase.schema('m').from('post_draft').update({ video_status: 'failed', updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
      try { await supabase.rpc('write_render_log', { p_post_draft_id: draft.post_draft_id, p_slide_id: null, p_client_id: draft.client_id, p_ice_format_key: draft.recommended_format, p_render_engine: withVoice ? 'creatomate+elevenlabs' : 'creatomate', p_creatomate_render_id: null, p_status: 'failed', p_output_url: null, p_storage_url: null, p_credits_used: null, p_render_duration_ms: 0, p_error_message: msg, p_render_spec: null }); } catch { }
      results.push({ post_draft_id: draft.post_draft_id, format: draft.recommended_format, status: 'failed', error: msg });
    }
  }

  if (!results.length) return jsonResponse({ ok: true, message: 'no_video_drafts_pending', version: VERSION });
  return jsonResponse({ ok: true, version: VERSION, processed: results.length, results });
});
