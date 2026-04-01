// youtube-publisher v1.3.0
// Uploads approved video drafts (video_status=generated) to YouTube via Data API v3.
// OAuth 2.0 token refresh per client.
//
// Refresh token resolution order:
//   1. c.client_channel.config->>'refresh_token'  (set by dashboard OAuth flow)
//   2. env var named by c.client_publish_profile.credential_env_key (legacy Supabase secret)
//
// Writes youtube_video_id to m.post_draft.
// Adds youtube_publish row to m.post_publish.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'youtube-publisher-v1.3.0';
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

// ─── OAuth token refresh ──────────────────────────────────────────────────────────────────
// Resolution order:
//   1. c.client_channel.config->>'refresh_token'  ← set by dashboard OAuth flow
//   2. env var from c.client_publish_profile.credential_env_key  ← legacy secrets

async function refreshAccessToken(
  supabase: ReturnType<typeof getServiceClient>,
  clientId_: string,
): Promise<string> {
  const oauthClientId = Deno.env.get('YOUTUBE_CLIENT_ID');
  const clientSecret  = Deno.env.get('YOUTUBE_CLIENT_SECRET');
  if (!oauthClientId || !clientSecret) throw new Error('YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET not set');

  // ── Attempt 1: DB config (set by dashboard OAuth flow) ──────────────────
  const { data: channelRows } = await supabase.rpc('exec_sql', {
    query: `SELECT config FROM c.client_channel WHERE client_id = '${clientId_}' AND platform = 'youtube' LIMIT 1`,
  });
  const dbRefreshToken: string | null = (channelRows as any)?.[0]?.config?.refresh_token ?? null;

  // ── Attempt 2: Legacy env var ────────────────────────────────────────────
  let refreshToken: string | null = dbRefreshToken;
  if (!refreshToken) {
    const { data: profile } = await supabase.schema('c').from('client_publish_profile')
      .select('credential_env_key')
      .eq('client_id', clientId_)
      .eq('platform', 'youtube')
      .limit(1)
      .maybeSingle();

    const envKey = profile?.credential_env_key;
    if (envKey) {
      refreshToken = Deno.env.get(envKey) ?? null;
      if (refreshToken) {
        console.log(`[youtube-publisher] using legacy env var ${envKey} for client ${clientId_} — reconnect via dashboard to migrate`);
      }
    }
  }

  if (!refreshToken) {
    throw new Error(
      `No refresh token found for client ${clientId_}. ` +
      `Connect via dashboard (Clients → Connect → YouTube) or set credential_env_key in client_publish_profile.`
    );
  }

  const params = new URLSearchParams({
    client_id:     oauthClientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type:    'refresh_token',
  });

  const resp = await fetch(YOUTUBE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });
  if (!resp.ok) throw new Error(`Token refresh failed ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  if (!data.access_token) throw new Error('No access_token in token response');
  return data.access_token;
}

// ─── YouTube upload ───────────────────────────────────────────────────────────────────────
// Returns YouTube video ID (e.g. "dQw4w9WgXcQ")

async function uploadToYouTube(opts: {
  accessToken: string;
  videoBuffer:  ArrayBuffer;
  title:        string;
  description:  string;
  tags:         string[];
  categoryId:   string;
  privacyStatus: 'public' | 'private' | 'unlisted';
}): Promise<string> {
  const { accessToken, videoBuffer, title, description, tags, categoryId, privacyStatus } = opts;

  const metadata = {
    snippet: {
      title: title.slice(0, 100),
      description: description.slice(0, 5000),
      tags: tags.slice(0, 30),
      categoryId,
    },
    status: { privacyStatus },
  };

  const boundary = `yt_boundary_${Date.now()}`;
  const metaStr  = JSON.stringify(metadata);
  const enc      = new TextEncoder();

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
    headers: {
      'Authorization':   `Bearer ${accessToken}`,
      'Content-Type':    `multipart/related; boundary=${boundary}`,
      'Content-Length':  String(totalLen),
    },
    body,
  });

  if (!resp.ok) throw new Error(`YouTube upload ${resp.status}: ${(await resp.text()).slice(0, 500)}`);
  const data = await resp.json();
  if (!data.id) throw new Error('No video ID in YouTube response');
  return data.id;
}

// ─── Build video metadata from draft ───────────────────────────────────────────────────

function buildVideoMetadata(
  draft: { draft_title: string; draft_body: string; recommended_format: string },
  vertical: string
): { title: string; description: string; tags: string[]; categoryId: string } {
  const isNdis = vertical.toLowerCase().includes('ndis') || vertical.toLowerCase().includes('disability');
  const categoryId = '27'; // Education

  const formatHint = draft.recommended_format.includes('stat') ? ' #data' : '';
  const title = (draft.draft_title + formatHint).slice(0, 100);

  const description = [
    draft.draft_body.slice(0, 4000),
    '',
    isNdis
      ? '\ud83d\udccc Follow for NDIS updates, policy changes, and sector insights.'
      : '\ud83d\udccc Follow for Australian property market insights and analysis.',
    '#Shorts',
  ].join('\n');

  const baseTags = ['#Shorts', 'Short'];
  const ndisTag  = isNdis ? ['NDIS', 'disability services', 'allied health', 'NDIS update', 'NDIS 2025'] : [];
  const propTag  = !isNdis ? ['property investment', 'Australian property', 'real estate Australia', 'property market'] : [];
  const tags = [...baseTags, ...ndisTag, ...propTag].slice(0, 30);

  return { title, description, tags, categoryId };
}

// ─── Main ────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return jsonResponse({ ok: true, function: 'youtube-publisher', version: VERSION });

  const expected = Deno.env.get('PUBLISHER_API_KEY');
  const provided  = req.headers.get('x-youtube-publisher-key');
  if (!expected) return jsonResponse({ ok: false, error: 'PUBLISHER_API_KEY_not_set' }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);

  const supabase = getServiceClient();
  const results: any[] = [];

  const { data: drafts } = await supabase.schema('m').from('post_draft')
    .select('post_draft_id, client_id, draft_title, draft_body, recommended_format, video_url, draft_format')
    .eq('approval_status', 'approved')
    .eq('video_status', 'generated')
    .is('draft_format->youtube_video_id', null)
    .not('video_url', 'is', null)
    .in('recommended_format', ['video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice'])
    .limit(2);

  for (const draft of (drafts ?? [])) {
    const startMs = Date.now();
    try {
      const { data: scope } = await supabase.rpc('exec_sql', {
        query: `SELECT cv.vertical_name FROM c.client_content_scope ccs JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id WHERE ccs.client_id = '${draft.client_id}' AND ccs.is_primary = true LIMIT 1`
      });
      const vertical = (scope as any)?.[0]?.vertical_name ?? 'professional services';

      const accessToken = await refreshAccessToken(supabase, draft.client_id);

      const videoResp = await fetch(draft.video_url);
      if (!videoResp.ok) throw new Error(`Failed to download video: ${videoResp.status}`);
      const videoBuffer = await videoResp.arrayBuffer();
      const videoSizeMb = Math.round(videoBuffer.byteLength / 1024 / 1024 * 10) / 10;
      console.log(`[youtube-publisher] uploading ${videoSizeMb}MB for ${draft.post_draft_id}`);

      const { title, description, tags, categoryId } = buildVideoMetadata(draft, vertical);

      const youtubeVideoId = await uploadToYouTube({
        accessToken, videoBuffer, title, description, tags, categoryId,
        privacyStatus: 'unlisted',
      });

      const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
      const durationMs = Date.now() - startMs;

      const updatedFormat = {
        ...(draft.draft_format ?? {}),
        youtube_video_id:  youtubeVideoId,
        youtube_url:       youtubeUrl,
        youtube_published: nowIso(),
      };
      await supabase.schema('m').from('post_draft').update({
        draft_format: updatedFormat,
        video_status: 'published',
        updated_at:   nowIso(),
      }).eq('post_draft_id', draft.post_draft_id);

      await supabase.schema('m').from('post_publish').insert({
        post_draft_id:    draft.post_draft_id,
        client_id:        draft.client_id,
        platform:         'youtube',
        platform_post_id: youtubeVideoId,
        published_at:     nowIso(),
        status:           'published',
        publish_meta:     { youtube_url: youtubeUrl, privacy_status: 'unlisted', video_size_mb: videoSizeMb, duration_ms: durationMs },
      });

      results.push({ post_draft_id: draft.post_draft_id, status: 'published', youtube_video_id: youtubeVideoId, youtube_url: youtubeUrl, video_size_mb: videoSizeMb, duration_ms: durationMs });
      console.log(`[youtube-publisher] ${VERSION} done: ${youtubeVideoId} in ${durationMs}ms`);

    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 2000);
      console.error(`[youtube-publisher] failed ${draft.post_draft_id}:`, msg);
      await supabase.schema('m').from('post_draft').update({
        video_status: 'failed',
        draft_format: { ...(draft.draft_format ?? {}), youtube_upload_error: msg, youtube_upload_attempted: nowIso() },
        updated_at: nowIso(),
      }).eq('post_draft_id', draft.post_draft_id);
      results.push({ post_draft_id: draft.post_draft_id, status: 'failed', error: msg });
    }
  }

  if (!results.length) return jsonResponse({ ok: true, message: 'no_videos_ready_to_upload', version: VERSION });
  return jsonResponse({ ok: true, version: VERSION, processed: results.length, results });
});
