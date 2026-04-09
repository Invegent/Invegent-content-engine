// heygen-worker v1.0.0
// Renders video_short_avatar drafts via HeyGen talking photo API.
// Flow: read pending draft -> lookup avatar IDs -> submit HeyGen job ->
//       poll until complete -> download MP4 -> upload to post-videos bucket ->
//       set video_status = 'generated' -> youtube-publisher picks up next cron.
//
// Runs every 30 min via pg_cron (heygen-worker-every-30min)
// Auth: x-heygen-worker-key header (PUBLISHER_API_KEY from vault)
// Max 3 drafts per run
// Supported format: video_short_avatar
//
// draft_format fields read:
//   talking_photo_id  - HeyGen photo avatar ID (or looked up from c.brand_avatar)
//   voice_id          - HeyGen voice ID (or looked up from c.brand_avatar)
//   narration_text    - text to speak
//   render_style      - 'realistic' | 'animated' (default: 'realistic')
//   stakeholder_role  - role_code for avatar lookup fallback

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION           = 'heygen-worker-v1.0.0';
const HEYGEN_GENERATE   = 'https://api.heygen.com/v2/video/generate';
const HEYGEN_STATUS     = 'https://api.heygen.com/v1/video_status.get';
const MAX_DRAFTS        = 3;
const POLL_INTERVAL_MS  = 5000;
const POLL_MAX_ATTEMPTS = 24; // 24 x 5s = 120s max per render

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-heygen-worker-key',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function nowIso() { return new Date().toISOString(); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function lookupAvatar(
  supabase: ReturnType<typeof getServiceClient>,
  clientId: string,
  stakeholderRole: string | null,
  renderStyle: string,
): Promise<{ talking_photo_id: string; voice_id: string | null } | null> {
  const { data: rows } = await supabase.rpc('exec_sql', {
    query: `
      SELECT ba.heygen_avatar_id, ba.heygen_voice_id
      FROM c.brand_avatar ba
      JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
      WHERE ba.client_id = '${clientId}'
        AND ba.is_active = true
        AND ba.render_style = '${renderStyle}'
        ${stakeholderRole ? `AND bs.role_code = '${stakeholderRole}'` : ''}
      LIMIT 1
    `,
  });
  const row = (rows as any)?.[0];
  if (!row?.heygen_avatar_id) return null;
  return { talking_photo_id: row.heygen_avatar_id, voice_id: row.heygen_voice_id ?? null };
}

async function submitHeyGenJob(opts: {
  apiKey: string;
  talkingPhotoId: string;
  voiceId: string;
  narrationText: string;
  bgColour?: string;
}): Promise<string> {
  const { apiKey, talkingPhotoId, voiceId, narrationText, bgColour = '#F0F4F8' } = opts;
  const payload = {
    video_inputs: [{
      character: { type: 'talking_photo', talking_photo_id: talkingPhotoId },
      voice: { type: 'text', input_text: narrationText, voice_id: voiceId, speed: 1.0 },
      background: { type: 'color', value: bgColour },
    }],
    dimension: { width: 1280, height: 720 },
  };
  const resp = await fetch(HEYGEN_GENERATE, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) throw new Error(`HeyGen submit failed: ${JSON.stringify(data.error ?? data).slice(0, 300)}`);
  const videoId = data.data?.video_id;
  if (!videoId) throw new Error(`No video_id in HeyGen response`);
  return videoId;
}

async function pollHeyGenJob(apiKey: string, videoId: string): Promise<string> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const resp = await fetch(`${HEYGEN_STATUS}?video_id=${videoId}`, { headers: { 'X-Api-Key': apiKey } });
    const data = await resp.json();
    const status = data.data?.status;
    const videoUrl = data.data?.video_url;
    if (status === 'completed' && videoUrl) return videoUrl;
    if (status === 'failed') throw new Error(`HeyGen render failed: ${data.data?.error ?? 'unknown'}`);
    console.log(`[heygen-worker] ${videoId}: ${status} (${i + 1}/${POLL_MAX_ATTEMPTS})`);
  }
  throw new Error(`HeyGen render timed out after ${(POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s`);
}

async function downloadAndStore(
  supabase: ReturnType<typeof getServiceClient>,
  heygenVideoUrl: string,
  storagePath: string,
): Promise<string> {
  const dlResp = await fetch(heygenVideoUrl);
  if (!dlResp.ok) throw new Error(`HeyGen download failed: ${dlResp.status}`);
  const buffer = await dlResp.arrayBuffer();
  const { error } = await supabase.storage.from('post-videos').upload(storagePath, buffer, { contentType: 'video/mp4', upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/post-videos/${storagePath}`;
}

async function processDraft(
  supabase: ReturnType<typeof getServiceClient>,
  apiKey: string,
  draft: { post_draft_id: string; client_id: string; draft_format: any; recommended_format: string },
): Promise<object> {
  const fmt = draft.draft_format ?? {};
  const draftId = draft.post_draft_id;
  const clientId = draft.client_id;

  let talkingPhotoId: string | null = fmt.talking_photo_id ?? fmt.avatar_id ?? null;
  let voiceId: string | null        = fmt.voice_id ?? null;
  const renderStyle: string         = fmt.render_style ?? 'realistic';
  const stakeholderRole: string | null = fmt.stakeholder_role ?? null;

  if (!talkingPhotoId) {
    const avatar = await lookupAvatar(supabase, clientId, stakeholderRole, renderStyle);
    if (!avatar) throw new Error(`No active ${renderStyle} avatar for client ${clientId}${stakeholderRole ? ` role ${stakeholderRole}` : ''}`);
    talkingPhotoId = avatar.talking_photo_id;
    voiceId = voiceId ?? avatar.voice_id;
  }
  if (!voiceId) throw new Error(`No voice_id for draft ${draftId}`);

  const narrationText: string = fmt.narration_text ?? fmt.video_script?.narration_text ?? '';
  if (!narrationText) throw new Error(`narration_text missing for draft ${draftId}`);

  const { data: brandRows } = await supabase.rpc('exec_sql', {
    query: `SELECT brand_colour_primary, cl.client_slug FROM c.client_brand_profile cbp JOIN c.client cl ON cl.client_id = cbp.client_id WHERE cbp.client_id = '${clientId}' AND cbp.is_active = true LIMIT 1`,
  });
  const brand = (brandRows as any)?.[0];
  const bgColour   = brand?.brand_colour_primary ?? '#0A2A4A';
  const clientSlug = brand?.client_slug ?? clientId.substring(0, 8);

  console.log(`[heygen-worker] submitting render for draft ${draftId} avatar=${talkingPhotoId} style=${renderStyle}`);
  const heygenVideoId  = await submitHeyGenJob({ apiKey, talkingPhotoId, voiceId, narrationText, bgColour });
  const heygenVideoUrl = await pollHeyGenJob(apiKey, heygenVideoId);

  const storagePath = `${clientSlug}/${draftId}_avatar_${renderStyle}.mp4`;
  const storageUrl  = await downloadAndStore(supabase, heygenVideoUrl, storagePath);

  const updatedFormat = {
    ...fmt,
    heygen_video_id:  heygenVideoId,
    heygen_video_url: heygenVideoUrl,
    video_url:        storageUrl,
    render_style:     renderStyle,
    rendered_at:      nowIso(),
  };
  await supabase.schema('m').from('post_draft').update({
    video_url:    storageUrl,
    video_status: 'generated',
    draft_format: updatedFormat,
    updated_at:   nowIso(),
  }).eq('post_draft_id', draftId);

  console.log(`[heygen-worker] done: ${draftId} -> ${storageUrl}`);
  return { post_draft_id: draftId, format: draft.recommended_format, render_style: renderStyle, heygen_video_id: heygenVideoId, storage_url: storageUrl, status: 'generated' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return jsonResponse({ ok: true, function: 'heygen-worker', version: VERSION });

  const expected = Deno.env.get('PUBLISHER_API_KEY');
  const provided  = req.headers.get('x-heygen-worker-key');
  if (!expected) return jsonResponse({ ok: false, error: 'PUBLISHER_API_KEY not set' }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);

  const apiKey = Deno.env.get('ICE_HEYGEN_API_KEY');
  if (!apiKey) return jsonResponse({ ok: false, error: 'ICE_HEYGEN_API_KEY not set' }, 500);

  const supabase = getServiceClient();
  const results: any[] = [];

  const { data: pendingDrafts, error: fetchErr } = await supabase.schema('m').from('post_draft')
    .select('post_draft_id, client_id, draft_format, recommended_format')
    .in('approval_status', ['approved', 'published'])
    .eq('video_status', 'pending')
    .eq('recommended_format', 'video_short_avatar')
    .limit(MAX_DRAFTS);

  if (fetchErr) return jsonResponse({ ok: false, error: fetchErr.message }, 500);

  for (const draft of (pendingDrafts ?? [])) {
    try {
      const result = await processDraft(supabase, apiKey, draft);
      results.push(result);
    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 2000);
      console.error(`[heygen-worker] failed ${draft.post_draft_id}:`, msg);
      await supabase.schema('m').from('post_draft').update({
        video_status: 'failed',
        draft_format: { ...(draft.draft_format ?? {}), heygen_error: msg, heygen_failed_at: nowIso() },
        updated_at: nowIso(),
      }).eq('post_draft_id', draft.post_draft_id);
      results.push({ post_draft_id: draft.post_draft_id, status: 'failed', error: msg });
    }
  }

  if (!results.length) return jsonResponse({ ok: true, message: 'no_avatar_drafts_pending', version: VERSION });
  return jsonResponse({ ok: true, version: VERSION, processed: results.length, results });
});
