// youtube-publisher v1.7.0
// v1.7.0 (F-YT-PUB-AVATAR-EXCLUSION): add video_short_avatar to the eligible-format allow-list.
//   Avatar now renders true 9:16 portrait Shorts (heygen-worker v2.0.0 async + 720x1280); dimension-first
//   (Option B) satisfied. Uploads stay unlisted; metadata/MIME/upload path unchanged. Landscape proof
//   draft ba5b34eb was retired (archived_stale) so only portrait avatars are publish-eligible.
// v1.6.0 (T17, 1 May 2026): RESTORE APPROVAL GATE.
//   Adds .eq('approval_status', 'approved') to draft SELECT.
//   Mirrors WordPress publisher's fetch-time filter pattern (direct-read publisher).
//   Previous v1.5.0 read m.post_draft with no approval check — would have
//   uploaded any draft with video_status='generated' on next OAuth reconnect.
//   T15 audit (1 May) confirmed gate was missing. F-PUB-005-class fix.
//   ChatGPT-reviewed in 4 rounds; cleared by round-4 publisher track verdict.
// v1.5.0: Fix INSERT into m.post_publish (column names + attempt_no).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'youtube-publisher-v1.7.0';
const YOUTUBE_TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-youtube-publisher-key',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function nowIso() { return new Date().toISOString(); }
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function refreshAccessToken(
  supabase: ReturnType<typeof getServiceClient>,
  clientId_: string,
): Promise<string> {
  const oauthClientId = Deno.env.get('YOUTUBE_CLIENT_ID');
  const clientSecret  = Deno.env.get('YOUTUBE_CLIENT_SECRET');
  if (!oauthClientId || !clientSecret) throw new Error('YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET not set');

  const { data: channelRows } = await supabase.rpc('exec_sql', {
    query: `SELECT config FROM c.client_channel WHERE client_id = '${clientId_}' AND platform = 'youtube' LIMIT 1`,
  });
  const dbRefreshToken: string | null = (channelRows as any)?.[0]?.config?.refresh_token ?? null;

  let refreshToken: string | null = dbRefreshToken;
  if (!refreshToken) {
    const { data: profile } = await supabase.schema('c').from('client_publish_profile')
      .select('credential_env_key')
      .eq('client_id', clientId_)
      .eq('platform', 'youtube')
      .limit(1)
      .maybeSingle();
    const envKey = profile?.credential_env_key;
    if (envKey) { refreshToken = Deno.env.get(envKey) ?? null; }
  }

  if (!refreshToken) throw new Error(`No refresh token found for client ${clientId_}.`);

  const params = new URLSearchParams({
    client_id: oauthClientId, client_secret: clientSecret,
    refresh_token: refreshToken, grant_type: 'refresh_token',
  });
  const resp = await fetch(YOUTUBE_TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString(),
  });
  if (!resp.ok) throw new Error(`Token refresh failed ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  if (!data.access_token) throw new Error('No access_token in token response');
  return data.access_token;
}

async function uploadToYouTube(opts: {
  accessToken: string; videoBuffer: ArrayBuffer; title: string;
  description: string; tags: string[]; categoryId: string; privacyStatus: 'public' | 'private' | 'unlisted';
}): Promise<string> {
  const { accessToken, videoBuffer, title, description, tags, categoryId, privacyStatus } = opts;
  const metadata = { snippet: { title: title.slice(0, 100), description: description.slice(0, 5000), tags: tags.slice(0, 30), categoryId }, status: { privacyStatus } };
  const boundary = `yt_boundary_${Date.now()}`;
  const metaStr = JSON.stringify(metadata);
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [
    enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaStr}\r\n`),
    enc.encode(`--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`),
    new Uint8Array(videoBuffer),
    enc.encode(`\r\n--${boundary}--`),
  ];
  const totalLen = parts.reduce((s, p) => s + p.byteLength, 0);
  const body = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) { body.set(p, offset); offset += p.byteLength; }
  const resp = await fetch(YOUTUBE_UPLOAD_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}`, 'Content-Length': String(totalLen) },
    body,
  });
  if (!resp.ok) throw new Error(`YouTube upload ${resp.status}: ${(await resp.text()).slice(0, 500)}`);
  const data = await resp.json();
  if (!data.id) throw new Error('No video ID in YouTube response');
  return data.id;
}

function buildVideoMetadata(draft: { draft_title: string; draft_body: string; recommended_format: string }, vertical: string) {
  const isNdis = vertical.toLowerCase().includes('ndis') || vertical.toLowerCase().includes('disability');
  const title = (draft.draft_title + (draft.recommended_format.includes('stat') ? ' #data' : '')).slice(0, 100);
  const description = [draft.draft_body.slice(0, 4000), '', isNdis ? '📌 Follow for NDIS updates, policy changes, and sector insights.' : '📌 Follow for Australian property market insights and analysis.', '#Shorts'].join('\n');
  const baseTags = ['#Shorts', 'Short'];
  const topicTags = isNdis ? ['NDIS', 'disability services', 'allied health'] : ['property investment', 'Australian property', 'real estate Australia'];
  return { title, description, tags: [...baseTags, ...topicTags].slice(0, 30), categoryId: '27' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return jsonResponse({ ok: true, function: 'youtube-publisher', version: VERSION });

  const expected = Deno.env.get('PUBLISHER_API_KEY');
  const provided = req.headers.get('x-youtube-publisher-key');
  if (!expected) return jsonResponse({ ok: false, error: 'PUBLISHER_API_KEY_not_set' }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);

  const supabase = getServiceClient();
  const results: any[] = [];

  // v1.6.0 (T17): added approval_status to SELECT and .eq('approval_status', 'approved') filter.
  // Direct-read publisher — gate at fetch time, mirror WordPress pattern.
  const { data: drafts } = await supabase.schema('m').from('post_draft')
    .select('post_draft_id, client_id, draft_title, draft_body, recommended_format, video_url, draft_format, approval_status')
    .eq('video_status', 'generated')
    .eq('approval_status', 'approved')
    .is('draft_format->youtube_video_id', null)
    .not('video_url', 'is', null)
    .in('recommended_format', ['video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar'])
    .limit(2);

  for (const draft of (drafts ?? [])) {
    const startMs = Date.now();
    try {
      const { data: scope } = await supabase.rpc('exec_sql', { query: `SELECT cv.vertical_name FROM c.client_content_scope ccs JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id WHERE ccs.client_id = '${draft.client_id}' AND ccs.is_primary = true LIMIT 1` });
      const vertical = (scope as any)?.[0]?.vertical_name ?? 'professional services';
      const accessToken = await refreshAccessToken(supabase, draft.client_id);
      const videoResp = await fetch(draft.video_url);
      if (!videoResp.ok) throw new Error(`Failed to download video: ${videoResp.status}`);
      const videoBuffer = await videoResp.arrayBuffer();
      const videoSizeMb = Math.round(videoBuffer.byteLength / 1024 / 1024 * 10) / 10;
      const { title, description, tags, categoryId } = buildVideoMetadata(draft, vertical);
      const youtubeVideoId = await uploadToYouTube({ accessToken, videoBuffer, title, description, tags, categoryId, privacyStatus: 'unlisted' });
      const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
      const durationMs = Date.now() - startMs;
      await supabase.schema('m').from('post_draft').update({
        draft_format: { ...(draft.draft_format ?? {}), youtube_video_id: youtubeVideoId, youtube_url: youtubeUrl, youtube_published: nowIso() },
        video_status: 'published', updated_at: nowIso(),
      }).eq('post_draft_id', draft.post_draft_id);
      const { error: insertErr } = await supabase.schema('m').from('post_publish').insert({
        post_draft_id: draft.post_draft_id, client_id: draft.client_id,
        platform: 'youtube', platform_post_id: youtubeVideoId,
        published_at: nowIso(), status: 'published', attempt_no: 1,
        response_payload: { youtube_url: youtubeUrl, privacy_status: 'unlisted', video_size_mb: videoSizeMb, duration_ms: durationMs },
      });
      if (insertErr) console.error(`[youtube-publisher] post_publish INSERT failed:`, insertErr.message);
      results.push({ post_draft_id: draft.post_draft_id, status: 'published', youtube_video_id: youtubeVideoId, youtube_url: youtubeUrl, audit_row_inserted: !insertErr });
    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 2000);
      await supabase.schema('m').from('post_draft').update({
        video_status: 'failed', draft_format: { ...(draft.draft_format ?? {}), youtube_upload_error: msg, youtube_upload_attempted: nowIso() }, updated_at: nowIso(),
      }).eq('post_draft_id', draft.post_draft_id);
      results.push({ post_draft_id: draft.post_draft_id, status: 'failed', error: msg });
    }
  }

  if (!results.length) return jsonResponse({ ok: true, message: 'no_videos_ready_to_upload', version: VERSION });
  return jsonResponse({ ok: true, version: VERSION, processed: results.length, results });
});
