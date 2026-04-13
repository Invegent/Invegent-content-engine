import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'instagram-publisher-v1.0.0';
const IG_GRAPH_BASE = 'https://graph.facebook.com/v19.0';

const IG_IMAGE_FORMATS = new Set([
  'image_quote', 'carousel',
]);
const IG_VIDEO_FORMATS = new Set([
  'video_short_kinetic', 'video_short_stat',
  'video_short_kinetic_voice', 'video_short_stat_voice',
  'video_short_avatar',
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-instagram-publisher-key',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function nowIso() { return new Date().toISOString(); }
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function igPost(url: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams(params);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) {
    throw new Error(`IG API error ${resp.status}: ${JSON.stringify(data.error ?? data).slice(0, 400)}`);
  }
  return data;
}

async function igGet(url: string): Promise<any> {
  const resp = await fetch(url);
  const data = await resp.json();
  if (!resp.ok || data.error) {
    throw new Error(`IG GET error ${resp.status}: ${JSON.stringify(data.error ?? data).slice(0, 400)}`);
  }
  return data;
}

async function pollVideoStatus(creationId: string, accessToken: string, maxWaitMs = 300_000): Promise<void> {
  const pollUrl = `${IG_GRAPH_BASE}/${creationId}?fields=status_code&access_token=${accessToken}`;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const data = await igGet(pollUrl);
    const statusCode = data.status_code;
    console.log(`[instagram-publisher] video status: ${statusCode}`);
    if (statusCode === 'FINISHED') return;
    if (statusCode === 'ERROR') throw new Error(`IG video processing failed: ${JSON.stringify(data)}`);
    await new Promise(r => setTimeout(r, 10_000));
  }
  throw new Error('IG video processing timed out after 5 minutes');
}

async function publishToInstagram(opts: {
  igUserId: string;
  accessToken: string;
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  isVideo: boolean;
}): Promise<string> {
  const { igUserId, accessToken, caption, imageUrl, videoUrl, isVideo } = opts;
  const mediaUrl = `${IG_GRAPH_BASE}/${igUserId}/media`;
  const publishUrl = `${IG_GRAPH_BASE}/${igUserId}/media_publish`;

  const containerParams: Record<string, string> = {
    caption: caption.slice(0, 2200),
    access_token: accessToken,
  };
  if (isVideo && videoUrl) {
    containerParams.video_url = videoUrl;
    containerParams.media_type = 'REELS';
  } else if (imageUrl) {
    containerParams.image_url = imageUrl;
  } else {
    throw new Error('No image_url or video_url available for Instagram post');
  }

  const container = await igPost(mediaUrl, containerParams);
  const creationId: string = container.id;
  if (!creationId) throw new Error('No creation_id returned from IG media container');

  if (isVideo) {
    await pollVideoStatus(creationId, accessToken);
  }

  const published = await igPost(publishUrl, {
    creation_id: creationId,
    access_token: accessToken,
  });
  const igMediaId: string = published.id;
  if (!igMediaId) throw new Error('No ig_media_id returned from publish');
  return igMediaId;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return jsonResponse({ ok: true, function: 'instagram-publisher', version: VERSION });

  const expected = Deno.env.get('PUBLISHER_API_KEY');
  const provided = req.headers.get('x-instagram-publisher-key');
  if (!expected) return jsonResponse({ ok: false, error: 'PUBLISHER_API_KEY_not_set' }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);

  const supabase = getServiceClient();
  const results: any[] = [];

  const { data: profiles } = await supabase.rpc('exec_sql', {
    query: `
      SELECT client_id, page_id AS ig_user_id, page_access_token, page_name
      FROM c.client_publish_profile
      WHERE platform = 'instagram'
        AND status = 'active'
        AND publish_enabled = true
        AND page_access_token IS NOT NULL
        AND page_id IS NOT NULL
    `,
  });

  for (const profile of (profiles as any[] ?? [])) {
    const { client_id, ig_user_id, page_access_token, page_name } = profile;

    const { data: drafts } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          pd.post_draft_id, pd.draft_title, pd.draft_body,
          pd.recommended_format, pd.image_url, pd.video_url
        FROM m.post_draft pd
        WHERE pd.client_id = '${client_id}'
          AND pd.approval_status = 'approved'
          AND pd.recommended_format IS NOT NULL
          AND pd.recommended_format != 'text'
          AND (
            (pd.image_url IS NOT NULL AND pd.image_url != '')
            OR (pd.video_url IS NOT NULL AND pd.video_url != '')
          )
          AND NOT EXISTS (
            SELECT 1 FROM m.post_publish pp
            WHERE pp.post_draft_id = pd.post_draft_id
              AND pp.platform = 'instagram'
          )
        ORDER BY pd.created_at ASC
        LIMIT 3
      `,
    });

    for (const draft of (drafts as any[] ?? [])) {
      const { post_draft_id, draft_title, draft_body, recommended_format, image_url, video_url } = draft;
      const startMs = Date.now();

      try {
        const isVideoFormat = IG_VIDEO_FORMATS.has(recommended_format);
        const isImageFormat = IG_IMAGE_FORMATS.has(recommended_format);

        if (!isVideoFormat && !isImageFormat) {
          results.push({ post_draft_id, status: 'skipped', reason: `format_not_supported: ${recommended_format}` });
          continue;
        }
        if (isVideoFormat && (!video_url || video_url === '')) {
          results.push({ post_draft_id, status: 'skipped', reason: 'no_video_url' });
          continue;
        }
        if (isImageFormat && (!image_url || image_url === '')) {
          results.push({ post_draft_id, status: 'skipped', reason: 'no_image_url' });
          continue;
        }

        const caption = `${draft_title}\n\n${draft_body}`.slice(0, 2200);

        const igMediaId = await publishToInstagram({
          igUserId: ig_user_id,
          accessToken: page_access_token,
          caption,
          imageUrl: image_url ?? undefined,
          videoUrl: video_url ?? undefined,
          isVideo: isVideoFormat,
        });

        const durationMs = Date.now() - startMs;

        const { error: insertErr } = await supabase.schema('m').from('post_publish').insert({
          post_draft_id,
          client_id,
          platform: 'instagram',
          platform_post_id: igMediaId,
          published_at: nowIso(),
          status: 'published',
          attempt_no: 1,
          response_payload: {
            ig_media_id: igMediaId,
            format: recommended_format,
            duration_ms: durationMs,
          },
        });

        if (insertErr) console.error(`[instagram-publisher] INSERT failed:`, insertErr.message);

        results.push({
          post_draft_id, status: 'published', ig_media_id: igMediaId,
          format: recommended_format, duration_ms: durationMs,
        });
        console.log(`[instagram-publisher] ${VERSION} published ${igMediaId} for ${page_name} in ${durationMs}ms`);

      } catch (e: any) {
        console.error(`[instagram-publisher] failed ${post_draft_id}:`, e?.message);
        results.push({ post_draft_id, status: 'failed', error: (e?.message ?? '').slice(0, 500) });
      }
    }
  }

  if (!results.length) return jsonResponse({ ok: true, message: 'no_instagram_posts_ready', version: VERSION });
  return jsonResponse({ ok: true, version: VERSION, processed: results.length, results });
});
