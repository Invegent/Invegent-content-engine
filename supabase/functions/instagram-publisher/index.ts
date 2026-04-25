// instagram-publisher v2.0.0 — Queue-based refactor (M12 bug closure)
//
// HISTORY:
// v1.0.0 (Apr 2026) had M12 bug: queried m.post_draft directly without
// filtering pd.platform = 'instagram'. Result: cross-posted FB drafts to
// NY Instagram on 19 Apr 2026 (18 incidents). Re-paused 25 Apr 2026.
//
// v2.0.0 (25 Apr 2026) refactor:
// - Mirrors FB publisher (publisher v1.7.0) architecture
// - Uses m.publisher_lock_queue_v1(p_platform='instagram') RPC for atomic
//   queue locking with built-in max_per_day + min_gap_minutes throttle
// - No direct m.post_draft queries — works from queue rows that are
//   correctly platform-tagged via the M11 enqueue trigger
// - Image hold gate for image_quote (15-min wait, 30-min timeout)
// - Carousel path with multi-slide upload (parallel to FB)
// - Failure backoff with last_error captured on queue row
// - Schedule check via get_next_publish_slot
// - Platform validation: rejects any non-instagram queue row defensively

import { Hono } from 'jsr:@hono/hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-instagram-publisher-key',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const VERSION = 'instagram-publisher-v2.0.0';
const IG_GRAPH_BASE = 'https://graph.facebook.com/v19.0';
const IMAGE_HOLD_MINUTES = 30;

const IG_IMAGE_FORMATS = new Set(['image_quote', 'carousel']);
const IG_VIDEO_FORMATS = new Set([
  'video_short_kinetic', 'video_short_stat',
  'video_short_kinetic_voice', 'video_short_stat_voice',
  'video_short_avatar',
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeParseJson<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } {
  try { return { ok: true, value: JSON.parse(raw) as T }; }
  catch (e: any) { return { ok: false, error: e?.message ?? 'invalid_json' }; }
}

function nowIso() { return new Date().toISOString(); }

function parseBool(v: unknown, fallback = false) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['1','true','yes','y'].includes(s)) return true;
    if (['0','false','no','n'].includes(s)) return false;
  }
  return fallback;
}

function clampInt(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function requirePublisherKey(c: any) {
  // Backward-compat: accept both x-instagram-publisher-key (v1) and x-publisher-key (consistent w/ FB)
  const expected = Deno.env.get('PUBLISHER_API_KEY');
  const igKey = c.req.header('x-instagram-publisher-key');
  const genericKey = c.req.header('x-publisher-key');
  const provided = igKey ?? genericKey;
  if (!expected) return { ok: false, res: jsonResponse({ ok: false, error: 'PUBLISHER_API_KEY_not_set' }, 500) };
  if (!provided || provided !== expected) return { ok: false, res: jsonResponse({ ok: false, error: 'Unauthorized' }, 401) };
  return { ok: true as const };
}

// ─── Instagram Graph API helpers ─────────────────────────────────────────
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

async function publishSingleMedia(opts: {
  igUserId: string; accessToken: string;
  caption: string;
  imageUrl?: string; videoUrl?: string;
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

async function publishCarousel(opts: {
  igUserId: string; accessToken: string;
  caption: string;
  slideUrls: string[];
}): Promise<string> {
  const { igUserId, accessToken, caption, slideUrls } = opts;
  const mediaUrl = `${IG_GRAPH_BASE}/${igUserId}/media`;
  const publishUrl = `${IG_GRAPH_BASE}/${igUserId}/media_publish`;

  // Step 1: Create child item containers (one per slide)
  const childIds: string[] = [];
  for (const slideUrl of slideUrls) {
    const child = await igPost(mediaUrl, {
      image_url: slideUrl,
      is_carousel_item: 'true',
      access_token: accessToken,
    });
    if (!child.id) throw new Error('Failed to create carousel child container');
    childIds.push(child.id);
  }

  // Step 2: Create the carousel container with the child IDs
  const carousel = await igPost(mediaUrl, {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption: caption.slice(0, 2200),
    access_token: accessToken,
  });
  if (!carousel.id) throw new Error('Failed to create carousel container');

  // Step 3: Publish
  const published = await igPost(publishUrl, {
    creation_id: carousel.id,
    access_token: accessToken,
  });
  if (!published.id) throw new Error('No ig_media_id returned from carousel publish');
  return published.id;
}

// ─── Types ───────────────────────────────────────────────────────────────
type PublisherRequest = {
  limit?: number; worker_id?: string; lock_seconds?: number;
  dry_run?: boolean; dry_run_hold_minutes?: number;
};

type PublishQueueRow = {
  queue_id: string; ai_job_id: string | null; post_draft_id: string;
  client_id: string; platform: string; status: string;
  scheduled_for: string | null; attempt_count: number | null;
  last_error: string | null; locked_at: string | null; locked_by: string | null;
};

type PublishProfile = {
  client_publish_profile_id: string; client_id: string; platform: string;
  status: string; mode: string | null; is_default: boolean | null;
  destination_id: string | null;        // IG Business Account ID (ig_user_id)
  page_id: string | null;
  page_access_token: string | null;
  page_name: string | null;
  publish_enabled: boolean | null;
  test_prefix: string | null;
};

// ─── Routes ──────────────────────────────────────────────────────────────
app.options('*', () => new Response(null, { status: 204, headers: corsHeaders }));

app.get('*', (c) => {
  const path = c.req.path || '/';
  if (path.endsWith('/health')) return jsonResponse({ ok: true, function: 'instagram-publisher', version: VERSION });
  return jsonResponse({ ok: true, function: 'instagram-publisher', version: VERSION });
});

app.post('*', async (c) => {
  const gate = requirePublisherKey(c); if (!gate.ok) return gate.res;
  const supabase = getServiceClient();

  const bodyText = await c.req.text();
  const bodyJson = bodyText?.trim() ? safeParseJson<PublisherRequest>(bodyText) : ({ ok: true as const, value: {} as PublisherRequest });
  if (!bodyJson.ok) return jsonResponse({ ok: false, error: 'bad_json' }, 400);

  const limit       = clampInt(Number(bodyJson.value.limit ?? c.req.query('limit') ?? 1), 1, 20);
  const workerId    = (bodyJson.value.worker_id ?? `instagram-publisher-${crypto.randomUUID().slice(0, 8)}`).toString();
  const lockSeconds = clampInt(Number(bodyJson.value.lock_seconds ?? 600), 30, 3600);
  const dryRun      = Boolean(bodyJson.value.dry_run ?? parseBool(c.req.query('dry_run') ?? '', false));
  const dryRunHoldMin = clampInt(Number(bodyJson.value.dry_run_hold_minutes ?? 60), 1, 24 * 60);

  // ── ATOMIC QUEUE LOCK (instagram-only) ──────────────────────────────────
  // m.publisher_lock_queue_v1 with p_platform='instagram':
  // - Filters by platform = 'instagram'
  // - Enforces max_per_day + min_gap_minutes from c.client_publish_profile
  // - Sets status='running' atomically, prevents double-processing
  // - Skip-locked: concurrent ticks won't fight over rows
  const { data: lockedRows, error: lockErr } = await supabase
    .schema('m')
    .rpc('publisher_lock_queue_v1', {
      p_limit: limit,
      p_worker_id: workerId,
      p_lock_seconds: lockSeconds,
      p_platform: 'instagram',
    });

  if (lockErr) return jsonResponse({ ok: false, error: 'lock_queue_failed', detail: lockErr }, 500);

  const rows = (lockedRows ?? []) as PublishQueueRow[];
  if (!rows.length) return jsonResponse({ ok: true, message: 'no_instagram_publish_jobs', worker_id: workerId, locked: 0 });

  const results: any[] = [];

  for (const q of rows) {
    const queueId = q.queue_id;

    try {
      // ── DEFENSIVE PLATFORM CHECK ──────────────────────────────────────
      // The lock RPC already filters by platform, but defence-in-depth:
      // if somehow a non-IG row got locked, fail it loudly rather than
      // silently cross-post (this is exactly the M12 class of bug).
      if (q.platform !== 'instagram') {
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'failed',
          last_error: `platform_mismatch:expected=instagram:got=${q.platform}`,
          locked_at: null, locked_by: null,
          updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({ queue_id: queueId, status: 'failed', error: 'platform_mismatch' });
        continue;
      }

      // ── SCHEDULE CHECK ────────────────────────────────────────────────
      if (!q.scheduled_for) {
        const { data: nextSlot, error: slotErr } = await supabase.rpc('get_next_publish_slot', {
          p_client_id: q.client_id,
          p_platform: 'instagram',
        });
        if (!slotErr && nextSlot && new Date(nextSlot as string).getTime() > Date.now()) {
          await supabase.schema('m').from('post_publish_queue').update({
            status: 'queued',
            scheduled_for: nextSlot as string,
            locked_at: null, locked_by: null,
            updated_at: nowIso(),
          }).eq('queue_id', queueId);
          console.log(`[instagram-publisher] scheduled ${queueId} for ${nextSlot}`);
          results.push({ queue_id: queueId, status: 'scheduled', scheduled_for: nextSlot });
          continue;
        }
      }

      // ── LOAD CLIENT IG PROFILE ────────────────────────────────────────
      const { data: prof, error: profErr } = await supabase
        .schema('c')
        .from('client_publish_profile')
        .select('*')
        .eq('client_id', q.client_id)
        .eq('platform', 'instagram')
        .eq('status', 'active')
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profErr) throw new Error(`load_profile_failed: ${profErr.message}`);
      if (!prof) throw new Error('no_active_instagram_publish_profile');
      const profile = prof as unknown as PublishProfile;

      if (profile.publish_enabled === false) {
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'skipped',
          last_error: 'publish_disabled',
          locked_at: null, locked_by: null,
          updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({ queue_id: queueId, status: 'skipped', reason: 'publish_disabled' });
        continue;
      }

      // For Instagram: destination_id (or page_id) is the IG Business Account ID
      const igUserId = (profile.destination_id ?? profile.page_id ?? '').toString();
      const accessToken = profile.page_access_token;

      if (!igUserId) throw new Error('missing_ig_user_id');
      if (!accessToken) throw new Error('missing_page_access_token');

      // ── LOAD DRAFT ────────────────────────────────────────────────────
      // CRITICAL DIFFERENCE FROM v1.0.0:
      // We load by post_draft_id from a queue row that's already platform-tagged.
      // No risk of picking a wrong-platform draft because the queue row
      // platform was set when the trigger enqueued it (M11 fix).
      // We additionally verify pd.platform = 'instagram' as a final safety net.
      const { data: draft, error: draftErr } = await supabase
        .schema('m')
        .from('post_draft')
        .select('post_draft_id, platform, draft_title, draft_body, approval_status, image_url, image_status, video_url, video_status, recommended_format, approved_at')
        .eq('post_draft_id', q.post_draft_id)
        .maybeSingle();

      if (draftErr) throw new Error(`load_draft_failed: ${draftErr.message}`);
      if (!draft) throw new Error('post_draft_not_found');

      // ── DRAFT PLATFORM SAFETY NET (M12 closure) ───────────────────────
      if (draft.platform !== 'instagram') {
        const errMsg = `draft_platform_mismatch:queue=${q.platform}:draft=${draft.platform}:draft_id=${draft.post_draft_id}`;
        console.error(`[instagram-publisher] ${errMsg}`);
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'failed',
          last_error: errMsg,
          locked_at: null, locked_by: null,
          updated_at: nowIso(),
        }).eq('queue_id', queueId);
        await supabase.schema('m').from('post_publish').insert({
          queue_id: queueId, ai_job_id: q.ai_job_id, post_draft_id: q.post_draft_id,
          client_id: q.client_id, platform: 'instagram', destination_id: igUserId,
          status: 'failed', platform_post_id: null,
          request_payload: { reason: 'draft_platform_mismatch' },
          response_payload: null,
          error: errMsg, created_at: nowIso(),
        });
        results.push({ queue_id: queueId, status: 'failed', error: 'draft_platform_mismatch' });
        continue;
      }

      // ── APPROVAL STATUS GATE ──────────────────────────────────────────
      if (draft.approval_status !== 'approved') {
        // This shouldn't happen — the trigger should only enqueue approved drafts —
        // but if a draft was manually un-approved post-enqueue, fail cleanly.
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'queued',
          scheduled_for: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: `not_approved:${draft.approval_status}`,
          locked_at: null, locked_by: null,
          updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({ queue_id: queueId, status: 'held', reason: 'not_approved', draft_status: draft.approval_status });
        continue;
      }

      // ── FORMAT/MEDIA GATES ────────────────────────────────────────────
      const recFormat = draft.recommended_format ?? 'text';
      const isVideoFormat = IG_VIDEO_FORMATS.has(recFormat);
      const isImageFormat = IG_IMAGE_FORMATS.has(recFormat);
      const isCarousel = recFormat === 'carousel';

      if (!isVideoFormat && !isImageFormat) {
        // IG cannot post text-only. Fail this row cleanly.
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'skipped',
          last_error: `format_not_supported_on_instagram:${recFormat}`,
          locked_at: null, locked_by: null,
          updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({ queue_id: queueId, status: 'skipped', reason: `format_not_supported:${recFormat}` });
        continue;
      }

      // ── IMAGE HOLD GATE ───────────────────────────────────────────────
      if (isImageFormat && !isCarousel) {
        const imageReady = !!(draft.image_url && draft.image_status === 'generated');
        if (!imageReady && draft.image_status === 'pending') {
          const approvedAt = draft.approved_at ? new Date(draft.approved_at).getTime() : null;
          const minutesWaiting = approvedAt ? (Date.now() - approvedAt) / 60_000 : IMAGE_HOLD_MINUTES;
          if (minutesWaiting < IMAGE_HOLD_MINUTES) {
            const requeueFor = new Date(Date.now() + 15 * 60_000).toISOString();
            await supabase.schema('m').from('post_publish_queue').update({
              status: 'queued', scheduled_for: requeueFor,
              last_error: `image_pending:${Math.round(minutesWaiting)}m`,
              locked_at: null, locked_by: null, updated_at: nowIso(),
            }).eq('queue_id', queueId);
            results.push({ queue_id: queueId, status: 'held', reason: 'image_pending', minutes_waited: Math.round(minutesWaiting) });
            continue;
          }
          // Past hold window — fail it (IG can't fall back to text)
          await supabase.schema('m').from('post_publish_queue').update({
            status: 'failed',
            last_error: `image_hold_timeout:${Math.round(minutesWaiting)}m`,
            locked_at: null, locked_by: null, updated_at: nowIso(),
          }).eq('queue_id', queueId);
          results.push({ queue_id: queueId, status: 'failed', reason: 'image_hold_timeout' });
          continue;
        }
        if (!imageReady) {
          await supabase.schema('m').from('post_publish_queue').update({
            status: 'failed',
            last_error: `no_image_url:status=${draft.image_status}`,
            locked_at: null, locked_by: null, updated_at: nowIso(),
          }).eq('queue_id', queueId);
          results.push({ queue_id: queueId, status: 'failed', reason: 'no_image_url' });
          continue;
        }
      }

      if (isVideoFormat) {
        const videoReady = !!(draft.video_url && draft.video_status === 'generated');
        if (!videoReady) {
          const approvedAt = draft.approved_at ? new Date(draft.approved_at).getTime() : null;
          const minutesWaiting = approvedAt ? (Date.now() - approvedAt) / 60_000 : 0;
          // Videos can take longer — give them up to 60 min before failing
          if (minutesWaiting < 60) {
            const requeueFor = new Date(Date.now() + 15 * 60_000).toISOString();
            await supabase.schema('m').from('post_publish_queue').update({
              status: 'queued', scheduled_for: requeueFor,
              last_error: `video_pending:${Math.round(minutesWaiting)}m`,
              locked_at: null, locked_by: null, updated_at: nowIso(),
            }).eq('queue_id', queueId);
            results.push({ queue_id: queueId, status: 'held', reason: 'video_pending', minutes_waited: Math.round(minutesWaiting) });
            continue;
          }
          await supabase.schema('m').from('post_publish_queue').update({
            status: 'failed',
            last_error: `video_hold_timeout:${Math.round(minutesWaiting)}m:status=${draft.video_status}`,
            locked_at: null, locked_by: null, updated_at: nowIso(),
          }).eq('queue_id', queueId);
          results.push({ queue_id: queueId, status: 'failed', reason: 'video_hold_timeout' });
          continue;
        }
      }

      // ── DRY RUN ───────────────────────────────────────────────────────
      if (dryRun) {
        const rf = new Date(Date.now() + dryRunHoldMin * 60_000).toISOString();
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'queued', scheduled_for: rf,
          last_error: 'dry_run_ok',
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({ queue_id: queueId, status: 'dry_run_ok', format: recFormat });
        continue;
      }

      // ── BUILD CAPTION ─────────────────────────────────────────────────
      const title = (draft.draft_title ?? '').trim();
      const body  = (draft.draft_body  ?? '').trim();
      if (!title && !body) throw new Error('empty_draft');
      const testPrefix = profile.mode === 'staging' ? (profile.test_prefix ?? '[TEST] ') : '';
      const caption = `${testPrefix}${title}${title && body ? '\n\n' : ''}${body}`.trim();

      // ── PUBLISH ───────────────────────────────────────────────────────
      const startMs = Date.now();
      let igMediaId: string;
      let publishMethod: string;
      let extra: Record<string, unknown> = {};

      if (isCarousel) {
        // Load slides
        const { data: slidesRaw } = await supabase.rpc('exec_sql', {
          query: `SELECT slide_index, image_url FROM m.post_carousel_slide
                  WHERE post_draft_id = '${q.post_draft_id}' AND image_status = 'generated'
                  ORDER BY slide_index ASC`
        });
        const slides: Array<{ slide_index: number; image_url: string }> = slidesRaw ?? [];
        if (slides.length < 2) {
          // Carousel with only 1 slide — fall back to single image
          if (slides.length === 1 || (draft.image_url && draft.image_status === 'generated')) {
            const fallbackUrl = slides.length === 1 ? slides[0].image_url : draft.image_url!;
            igMediaId = await publishSingleMedia({
              igUserId, accessToken, caption,
              imageUrl: fallbackUrl,
              isVideo: false,
            });
            publishMethod = 'single_image_fallback';
            extra = { intended_format: 'carousel', actual_slides: slides.length };
          } else {
            await supabase.schema('m').from('post_publish_queue').update({
              status: 'failed',
              last_error: `carousel_no_slides_no_image_fallback`,
              locked_at: null, locked_by: null, updated_at: nowIso(),
            }).eq('queue_id', queueId);
            results.push({ queue_id: queueId, status: 'failed', reason: 'carousel_no_slides' });
            continue;
          }
        } else {
          igMediaId = await publishCarousel({
            igUserId, accessToken, caption,
            slideUrls: slides.map(s => s.image_url),
          });
          publishMethod = 'carousel';
          extra = { slide_count: slides.length };
        }
      } else if (isVideoFormat) {
        igMediaId = await publishSingleMedia({
          igUserId, accessToken, caption,
          videoUrl: draft.video_url!,
          isVideo: true,
        });
        publishMethod = 'reel';
      } else {
        // image_quote
        igMediaId = await publishSingleMedia({
          igUserId, accessToken, caption,
          imageUrl: draft.image_url!,
          isVideo: false,
        });
        publishMethod = 'single_image';
      }

      const durationMs = Date.now() - startMs;

      // ── WRITE SUCCESS RECORDS ─────────────────────────────────────────
      await supabase.schema('m').from('post_publish').insert({
        queue_id: queueId,
        ai_job_id: q.ai_job_id,
        post_draft_id: q.post_draft_id,
        client_id: q.client_id,
        platform: 'instagram',
        destination_id: igUserId,
        status: 'published',
        platform_post_id: igMediaId,
        published_at: nowIso(),
        request_payload: {
          publish_method: publishMethod,
          format: recFormat,
          duration_ms: durationMs,
          ...extra,
        },
        response_payload: { ig_media_id: igMediaId },
        error: null,
        created_at: nowIso(),
      });

      await supabase.schema('m').from('post_publish_queue').update({
        status: 'published',
        last_error: null,
        locked_at: null, locked_by: null,
        updated_at: nowIso(),
      }).eq('queue_id', queueId);

      await supabase.schema('m').from('post_draft').update({
        approval_status: 'published',
        updated_at: nowIso(),
      }).eq('post_draft_id', q.post_draft_id);

      console.log(`[instagram-publisher] ${VERSION} published ${igMediaId} for ${profile.page_name} (${publishMethod}) in ${durationMs}ms`);

      results.push({
        queue_id: queueId,
        status: 'published',
        publish_method: publishMethod,
        format: recFormat,
        ig_media_id: igMediaId,
        duration_ms: durationMs,
        ...extra,
      });

    } catch (e: any) {
      const errMsg = (e?.message ?? String(e)).slice(0, 4000);
      console.error(`[instagram-publisher] failed ${queueId}:`, errMsg);

      // Backoff: requeue 10 min from now with the error captured
      const backoffIso = new Date(Date.now() + 10 * 60_000).toISOString();
      await supabase.schema('m').from('post_publish_queue').update({
        status: 'queued',
        scheduled_for: backoffIso,
        last_error: errMsg,
        locked_at: null, locked_by: null,
        updated_at: nowIso(),
      }).eq('queue_id', queueId);

      // Audit-trail failed publish row
      await supabase.schema('m').from('post_publish').insert({
        queue_id: queueId,
        ai_job_id: q.ai_job_id,
        post_draft_id: q.post_draft_id,
        client_id: q.client_id,
        platform: 'instagram',
        destination_id: null,
        status: 'failed',
        platform_post_id: null,
        request_payload: null,
        response_payload: null,
        error: errMsg,
        created_at: nowIso(),
      });

      results.push({ queue_id: queueId, status: 'failed', error: errMsg });
    }
  }

  return jsonResponse({
    ok: true,
    version: VERSION,
    worker_id: workerId,
    locked: rows.length,
    processed: results.length,
    results,
  });
});

Deno.serve(app.fetch);
