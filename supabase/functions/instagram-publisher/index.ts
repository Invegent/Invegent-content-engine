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
//
// v2.1.0 (2026-05-24) — throttle robustness (pool
//   instagram.publisher.v2_deployed_cron_paused; staged, sequenced-both step 1):
// - DEFENSIVE per-account throttle in the EF (does NOT modify the shared
//   m.publisher_lock_queue_v2): before publishing, count this client's IG
//   publishes over 7d by client_id+platform (a robust key that does NOT silently
//   no-op on NULL destination_id, unlike the lock RPC's destination-keyed count),
//   enforce max_per_day + min_gap_minutes, and SKIP/REQUEUE rather than publish
//   when breached.
// - destination_id WRITE GUARANTEE (blocking gate): require profile.destination_id
//   non-null; skip rather than publish unthrottled. The success post_publish row
//   writes that same destination_id (= cpp.destination_id) so the lock RPC count
//   is reliable too.
// - 2207051 / code 4 (IG content-publishing restriction / app request limit):
//   auto-pause the affected profile via cpp.paused_until (honoured by the lock RPC).
// - Decision logging for verification (profile / destination_id / daily count /
//   last publish / cap+gap decision / skip-vs-publish).
//
// v2.2.0 (2026-05-24) — image-container readiness polling (fixes IG 400 code
//   9007 / subcode 2207027 "Media ID is not available"):
// - The v2.x image path created a container then called media_publish
//   immediately; only the video path polled readiness. Now BOTH image and video
//   (and carousel child + parent containers) poll GET
//   /{creation_id}?fields=status_code,status until status_code='FINISHED' before
//   media_publish, with a bounded timeout/retry window.
// - On status_code ERROR/EXPIRED (or timeout): fail cleanly, capture status
//   detail, and do NOT call media_publish.
// - Observability: per-poll + final status_code, attempts, waited_ms (no token).
// - All v2.1.0 throttle protections (destination_id gate, max_per_day, min_gap,
//   2207051 auto-pause) are unchanged.
//
// v2.3.0 (2026-05-24) — image publish-retry; remove the image container GET
//   (brief docs/briefs/ig-publisher-v2.3.0-image-publish-retry.md):
// - Forensics: the proven-working v1.0.0 image path published with TWO calls
//   only (POST /media -> POST /media_publish) and NEVER polled container status.
//   v2.2.0's image-path container GET (/{id}?fields=status_code) fails with
//   code 100 / subcode 33 GraphMethodException ("Authorization Error") on these
//   FB-page-derived IG tokens — a GET the working path never made.
// - FIX: the IMAGE path no longer calls pollContainerReady. It publishes
//   directly and retries media_publish ONLY on the transient "media not ready"
//   signal (9007 / 2207027) with bounded backoff (publishWithReadinessRetry).
// - Any OTHER error propagates immediately: 2207051 / code 4 still reaches the
//   v2.1.0 auto-pause catch; auth errors (190 / code 10 / 100) surface as real
//   failures, not silent retries.
// - VIDEO and CAROUSEL paths are UNCHANGED from v2.2.0 (they still poll via
//   pollContainerReady, which remains defined and in use).
// - Throttle / destination_id gate / 2207051 auto-pause: byte-unchanged.
//
// v2.4.0 (2026-05-24) — RE-B: bounded outer per-row retry cap (brief
//   docs/briefs/ig-publisher-v2.3.0-image-publish-retry.md §7 RE-B carry):
// - The outer catch previously requeued every failed row +10min WITHOUT
//   incrementing attempt_count or capping retries → a persistently-failing row
//   could retry indefinitely (a dead row was observed at attempt_count=734).
// - FIX: increment attempt_count on every failure; once a NON-rate-limited row
//   reaches MAX_PUBLISH_ATTEMPTS, mark it status='dead' (terminal) with a
//   dead_reason instead of requeuing. Under the cap, the existing +10min
//   requeue is preserved.
// - Rate-limited failures (2207051 / code 4) are EXEMPT from the dead cap: the
//   6h profile auto-pause is their containment, so an account/app-level
//   restriction never kills otherwise-publishable content. They still increment
//   attempt_count and requeue (pause-gated by the lock RPC).
// - Auth/other persistent errors therefore die after MAX_PUBLISH_ATTEMPTS
//   instead of retrying forever. The v2.3.0 in-attempt 9007/2207027 retry
//   (publishWithReadinessRetry), the destination_id gate, and the defensive
//   throttle are all byte-unchanged.

import { Hono } from 'jsr:@hono/hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { requireAssetPresent } from './asset_backstop.ts';

const app = new Hono();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-instagram-publisher-key',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const VERSION = 'instagram-publisher-v2.5.0';
// v2.5.0 (2026-06-17) — UNIFORM FINAL-ASSERTION BACKSTOP (Lane A). Adds a single
//   pure final assertion (requireAssetPresent in ./asset_backstop.ts) as the LAST
//   gate immediately before the IG POST, AFTER the existing image/video hold gates
//   and the defensive throttle (all byte-unchanged). Defence-in-depth only: refuses
//   to publish an asset-required format without its rendered asset, on
//   render_failed/render_pending, on an unknown asset-required format, and on a
//   non-approved draft ('approved' only). On publish:false the row is re-queued
//   (+15m) and skipped (last_error=backstop:<reason>), logged skipped:<reason>;
//   processing continues. STRICTLY OUT OF SCOPE: the existing hold gates, throttle,
//   carousel single-image fallback, container polling and retry logic are NOT
//   replaced/weakened; no schema/DB change; no T2.
const IG_GRAPH_BASE = 'https://graph.facebook.com/v19.0';
const IMAGE_HOLD_MINUTES = 30;
// v2.1.0: on a 2207051 / code-4 IG restriction, pause the profile this long
// (via cpp.paused_until, which m.publisher_lock_queue_v2 honours). Tunable.
const RATE_LIMIT_PAUSE_HOURS = 6;
// v2.2.0: media-container readiness polling before media_publish. Images
// usually finish in seconds; reels can take minutes.
const IMAGE_CONTAINER_POLL_MAX_MS = 120_000;
const IMAGE_CONTAINER_POLL_INTERVAL_MS = 3_000;
const VIDEO_CONTAINER_POLL_MAX_MS = 300_000;
const VIDEO_CONTAINER_POLL_INTERVAL_MS = 10_000;
// v2.3.0: image publish-retry (replaces the image container GET). Retry
// media_publish ONLY on the transient "media not ready" signal (9007/2207027).
// Bounded: 1 initial + 3 retries; total added wall-clock <= ~16s (+ pre-delay),
// far under the EF limit and the 120s poll it replaces.
const PUBLISH_RETRY_MAX_ATTEMPTS = 4;
const PUBLISH_RETRY_BACKOFF_MS = [3_000, 5_000, 8_000];
const PUBLISH_PRE_DELAY_MS = 2_000;
// The transient not-ready codes (and ONLY these) trigger a retry. \b digit
// boundaries keep this from matching a code embedded in an fbtrace_id, and it
// deliberately does NOT match 2207051 (rate limit -> must propagate to pause).
const PUBLISH_NOT_READY_RE = /\b(?:9007|2207027)\b/;
// v2.4.0 (RE-B): OUTER per-row retry cap, distinct from the in-attempt 9007
// retry above. After this many failed processing attempts, a NON-rate-limited
// queue row is marked dead (terminal) rather than requeued indefinitely. Tight
// because transient container-readiness is already absorbed in-attempt; ~40 min
// of +10min backoffs before a genuinely-broken row dies. Tunable.
const MAX_PUBLISH_ATTEMPTS = 5;

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

// v2.2.0: poll a media container until status_code='FINISHED' before publishing.
// Applies to images, reels, and carousel child/parent containers. Throws on
// ERROR/EXPIRED or timeout (caller's try/catch requeues + audits; media_publish
// is never reached for a non-FINISHED container). The poll URL carries the
// access_token and is NEVER logged — only safe status fields + counters are.
async function pollContainerReady(
  creationId: string,
  accessToken: string,
  opts: { maxWaitMs: number; intervalMs: number; label: string },
): Promise<{ status_code: string; attempts: number; waited_ms: number }> {
  const pollUrl =
    `${IG_GRAPH_BASE}/${encodeURIComponent(creationId)}?fields=status_code,status` +
    `&access_token=${encodeURIComponent(accessToken)}`;
  const start = Date.now();
  let attempts = 0;
  while (Date.now() - start < opts.maxWaitMs) {
    attempts++;
    const data = await igGet(pollUrl);
    const statusCode = (data.status_code ?? '').toString();
    const statusDetail = (data.status ?? '').toString().slice(0, 200);
    console.log(`[instagram-publisher] ${opts.label} container poll attempt=${attempts} status_code=${statusCode} status=${statusDetail}`);
    if (statusCode === 'FINISHED') {
      const waited_ms = Date.now() - start;
      console.log(`[instagram-publisher] ${opts.label} container FINISHED attempts=${attempts} waited_ms=${waited_ms}`);
      return { status_code: statusCode, attempts, waited_ms };
    }
    if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
      throw new Error(`IG container ${statusCode} (${opts.label}) after ${attempts} polls: ${statusDetail || JSON.stringify(data).slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, opts.intervalMs));
  }
  throw new Error(`IG ${opts.label} container not FINISHED within ${Math.round(opts.maxWaitMs / 1000)}s (polled ${attempts}x)`);
}

// v2.3.0: publish an already-created IMAGE container, retrying media_publish
// ONLY on the transient "media not ready" signal (9007 / 2207027). This is the
// image path's replacement for the v2.2.0 container-status GET (which fails
// 100/33 with these tokens). Any other error — including 2207051 / code 4
// (which MUST reach the v2.1.0 auto-pause catch) and auth errors (190 / code 10
// / 100) — propagates immediately, so it surfaces as a real failure rather than
// being silently retried. The publish URL carries the access_token and is NEVER
// logged; only the creationId and counters are.
async function publishWithReadinessRetry(
  publishUrl: string,
  creationId: string,
  accessToken: string,
  label: string,
): Promise<string> {
  if (PUBLISH_PRE_DELAY_MS > 0) {
    await new Promise((r) => setTimeout(r, PUBLISH_PRE_DELAY_MS));
  }
  let lastErr: unknown;
  for (let attempt = 1; attempt <= PUBLISH_RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const published = await igPost(publishUrl, {
        creation_id: creationId,
        access_token: accessToken,
      });
      const igMediaId: string = published.id;
      if (!igMediaId) throw new Error('No ig_media_id returned from publish');
      if (attempt > 1) {
        console.log(`[instagram-publisher] ${label} publish recovered creation_id=${creationId} attempt=${attempt}`);
      }
      return igMediaId;
    } catch (e: any) {
      const msg = (e?.message ?? String(e)).toString();
      const transient = PUBLISH_NOT_READY_RE.test(msg);
      const hasRetryLeft = attempt < PUBLISH_RETRY_MAX_ATTEMPTS;
      // Non-transient (incl. 2207051/code 4, 190, 100/33), or out of retries → rethrow.
      if (!transient || !hasRetryLeft) throw e;
      lastErr = e;
      const backoff = PUBLISH_RETRY_BACKOFF_MS[attempt - 1] ?? PUBLISH_RETRY_BACKOFF_MS[PUBLISH_RETRY_BACKOFF_MS.length - 1];
      const reason = /2207027/.test(msg) ? '2207027' : '9007';
      console.log(`[instagram-publisher] ${label} publish retry attempt=${attempt} reason=${reason} creation_id=${creationId} backoff_ms=${backoff}`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  // The final attempt rethrows inside the loop; this only satisfies the type checker.
  throw lastErr ?? new Error(`${label} publish failed after ${PUBLISH_RETRY_MAX_ATTEMPTS} attempts`);
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
    // VIDEO path — UNCHANGED from v2.2.0: poll the reel container to FINISHED,
    // then publish once. (No reel has published yet; left exactly as-is.)
    await pollContainerReady(creationId, accessToken, {
      maxWaitMs: VIDEO_CONTAINER_POLL_MAX_MS, intervalMs: VIDEO_CONTAINER_POLL_INTERVAL_MS, label: 'reel',
    });
    const published = await igPost(publishUrl, {
      creation_id: creationId,
      access_token: accessToken,
    });
    const igMediaId: string = published.id;
    if (!igMediaId) throw new Error('No ig_media_id returned from publish');
    return igMediaId;
  }

  // IMAGE path (v2.3.0) — do NOT poll the container status GET (it fails 100/33
  // with these tokens; the proven-working v1.0.0 path never made it). Publish
  // directly, retrying only on the transient 9007/2207027 "media not ready" signal.
  return await publishWithReadinessRetry(publishUrl, creationId, accessToken, 'image');
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
    // v2.2.0: each child must FINISH before it is attached to the parent.
    await pollContainerReady(child.id, accessToken, {
      maxWaitMs: IMAGE_CONTAINER_POLL_MAX_MS, intervalMs: IMAGE_CONTAINER_POLL_INTERVAL_MS, label: 'carousel_child',
    });
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

  // v2.2.0: wait for the parent carousel container to FINISH before publishing.
  await pollContainerReady(carousel.id, accessToken, {
    maxWaitMs: IMAGE_CONTAINER_POLL_MAX_MS, intervalMs: IMAGE_CONTAINER_POLL_INTERVAL_MS, label: 'carousel_parent',
  });

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
  // v2.1.0 throttle fields (profile is loaded via select('*'))
  max_per_day: number | null;
  min_gap_minutes: number | null;
  paused_until: string | null;
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
    // Hoisted so the catch can auto-pause this profile on a 2207051/code-4 restriction.
    let profileForPause: PublishProfile | null = null;

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
      profileForPause = profile;

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

      // For Instagram the destination_id IS the IG Business Account ID (ig_user_id).
      // BLOCKING GATE (v2.1.0): destination_id must be non-null. Both the throttle
      // count and the post_publish audit row key on it, so without it the cap can't
      // be enforced reliably — skip rather than publish unthrottled. We deliberately
      // do NOT fall back to page_id here (that was the NULL-destination fragility).
      const accessToken = profile.page_access_token;
      const destinationId = (profile.destination_id ?? '').toString();
      if (!destinationId) {
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'skipped',
          last_error: 'missing_destination_id_throttle_gate',
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({ queue_id: queueId, status: 'skipped', reason: 'missing_destination_id' });
        continue;
      }
      if (!accessToken) throw new Error('missing_page_access_token');
      const igUserId = destinationId; // guaranteed non-null; == cpp.destination_id

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

      // ── DEFENSIVE THROTTLE (v2.1.0) ───────────────────────────────────
      // Independent of m.publisher_lock_queue_v2's destination-keyed count (which
      // silently no-ops when destination_id is NULL). Count this client's IG
      // publishes over the last 7 days by client_id+platform (robust key), enforce
      // max_per_day + min_gap_minutes, and SKIP/REQUEUE rather than publish when
      // breached. Decision is logged for verification.
      {
        const maxPerDay = profile.max_per_day;
        const minGapMin = profile.min_gap_minutes;
        if (maxPerDay != null || minGapMin != null) {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
          const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
          const dayStartIso = dayStart.toISOString();
          const { data: recentPub, error: recentErr } = await supabase
            .schema('m').from('post_publish')
            .select('created_at')
            .eq('client_id', q.client_id)
            .eq('platform', 'instagram')
            .eq('status', 'published')
            .gte('created_at', sevenDaysAgo)
            .order('created_at', { ascending: false });
          if (recentErr) throw new Error(`throttle_count_failed: ${recentErr.message}`);
          const recent = (recentPub ?? []) as Array<{ created_at: string }>;
          const lastPublishedAt = recent[0]?.created_at ?? null;
          const publishedToday = recent.filter((r) => r.created_at >= dayStartIso).length;
          const gapMs = lastPublishedAt ? (Date.now() - new Date(lastPublishedAt).getTime()) : null;
          const capBreached = maxPerDay != null && publishedToday >= maxPerDay;
          const gapBreached = minGapMin != null && gapMs != null && gapMs < minGapMin * 60_000;
          console.log(`[instagram-publisher] throttle client=${q.client_id} dest=${destinationId} published_today=${publishedToday} max_per_day=${maxPerDay ?? 'none'} last_published_at=${lastPublishedAt ?? 'none'} min_gap_min=${minGapMin ?? 'none'} cap_breached=${capBreached} gap_breached=${gapBreached} decision=${capBreached || gapBreached ? 'requeue' : 'publish'}`);
          if (capBreached || gapBreached) {
            const requeueFor = capBreached
              ? new Date(dayStart.getTime() + 24 * 60 * 60_000).toISOString() // next UTC day
              : new Date(new Date(lastPublishedAt as string).getTime() + (minGapMin as number) * 60_000).toISOString();
            await supabase.schema('m').from('post_publish_queue').update({
              status: 'queued',
              scheduled_for: requeueFor,
              last_error: capBreached
                ? `throttle_max_per_day:${publishedToday}/${maxPerDay}`
                : `throttle_min_gap:${Math.round((gapMs as number) / 60_000)}m<${minGapMin}m`,
              locked_at: null, locked_by: null, updated_at: nowIso(),
            }).eq('queue_id', queueId);
            results.push({
              queue_id: queueId, status: 'throttled',
              reason: capBreached ? 'max_per_day' : 'min_gap',
              published_today: publishedToday, scheduled_for: requeueFor,
            });
            continue;
          }
        }
      }

      // ══ UNIFORM FINAL-ASSERTION BACKSTOP (v2.5.0) ═════════════════════
      // Last gate before the IG POST, AFTER the existing image/video hold gates
      // and the defensive throttle above (all unchanged). Defence-in-depth:
      // never publish an asset-required format without its rendered asset, never
      // publish a non-approved draft. On publish:false → re-queue (+15m) and skip,
      // log skipped:<reason>. carouselSlideCount is left undefined here — IG's own
      // carousel path loads slides below and applies its single-image fallback.
      {
        const backstop = requireAssetPresent({
          recommended_format: draft.recommended_format,
          image_url: draft.image_url, image_status: draft.image_status,
          video_url: draft.video_url, video_status: draft.video_status,
          approval_status: draft.approval_status,
        });
        if (!backstop.publish) {
          const backoffIso = new Date(Date.now() + 15 * 60_000).toISOString();
          await supabase.schema('m').from('post_publish_queue').update({
            status: 'queued', scheduled_for: backoffIso,
            last_error: `backstop:${backstop.reason}`,
            locked_at: null, locked_by: null, updated_at: nowIso(),
          }).eq('queue_id', queueId);
          console.log(`[instagram-publisher] backstop skipped:${backstop.reason} draft=${q.post_draft_id} format=${recFormat}`);
          results.push({ queue_id: queueId, status: 'skipped', reason: `backstop:${backstop.reason}`, format: recFormat });
          continue;
        }
      }
      // ══ END BACKSTOP ════════════════════════════════════════════════════

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
        destination_id: destinationId, // v2.1.0: guaranteed non-null, == cpp.destination_id (throttle-reliable)
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
      // RE-B (v2.4.0): every entry into the catch is one processing attempt.
      const newAttempt = (q.attempt_count ?? 0) + 1;
      console.error(`[instagram-publisher] failed ${queueId} attempt=${newAttempt}/${MAX_PUBLISH_ATTEMPTS}:`, errMsg);

      // v2.1.0: 2207051 / code 4 (IG content-publishing restriction / app request
      // limit) → auto-pause this profile via cpp.paused_until (honoured by
      // m.publisher_lock_queue_v2), so a restriction does not turn into a retry
      // burst. Does not flip publish_enabled. (Unchanged.)
      const rateLimited = /2207051|"code"\s*:\s*4\b|application request limit/i.test(errMsg);
      if (rateLimited && profileForPause?.client_publish_profile_id) {
        const pauseUntil = new Date(Date.now() + RATE_LIMIT_PAUSE_HOURS * 60 * 60_000).toISOString();
        await supabase.schema('c').from('client_publish_profile')
          .update({ paused_until: pauseUntil })
          .eq('client_publish_profile_id', profileForPause.client_publish_profile_id);
        console.warn(`[instagram-publisher] AUTO-PAUSED profile ${profileForPause.client_publish_profile_id} until ${pauseUntil} (rate-limit/2207051)`);
      }

      // RE-B (v2.4.0): bounded outer retry. A NON-rate-limited row that has
      // exhausted MAX_PUBLISH_ATTEMPTS is marked dead (terminal) instead of being
      // requeued forever. Rate-limited rows are EXEMPT from the cap — the 6h
      // auto-pause above is their containment; they always requeue (pause-gated
      // by the lock RPC) so an account/app-level restriction never kills
      // otherwise-publishable content.
      const exhausted = !rateLimited && newAttempt >= MAX_PUBLISH_ATTEMPTS;

      if (exhausted) {
        const deadReason = `re_b_max_attempts:${newAttempt}/${MAX_PUBLISH_ATTEMPTS}`;
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'dead',
          attempt_count: newAttempt,
          dead_reason: deadReason,
          last_error: errMsg,
          scheduled_for: null,
          locked_at: null, locked_by: null,
          updated_at: nowIso(),
        }).eq('queue_id', queueId);
        console.error(`[instagram-publisher] DEAD ${queueId} attempt=${newAttempt}/${MAX_PUBLISH_ATTEMPTS} dead_reason=${deadReason}`);
      } else {
        // Backoff: requeue 10 min from now with the error + attempt captured.
        // (Rate-limited rows also carry scheduled_for here, but the profile pause
        // dominates re-lock timing.)
        const backoffIso = new Date(Date.now() + 10 * 60_000).toISOString();
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'queued',
          scheduled_for: backoffIso,
          attempt_count: newAttempt,
          last_error: errMsg,
          locked_at: null, locked_by: null,
          updated_at: nowIso(),
        }).eq('queue_id', queueId);
        console.log(`[instagram-publisher] requeue ${queueId} attempt=${newAttempt}/${MAX_PUBLISH_ATTEMPTS} rate_limited=${rateLimited} next=${backoffIso}`);
      }

      // Audit-trail failed publish row (unchanged behaviour)
      await supabase.schema('m').from('post_publish').insert({
        queue_id: queueId,
        ai_job_id: q.ai_job_id,
        post_draft_id: q.post_draft_id,
        client_id: q.client_id,
        platform: 'instagram',
        destination_id: profileForPause?.destination_id ?? null,
        status: 'failed',
        platform_post_id: null,
        request_payload: null,
        response_payload: null,
        error: errMsg,
        created_at: nowIso(),
      });

      results.push({
        queue_id: queueId,
        status: exhausted ? 'dead' : 'failed',
        attempt_count: newAttempt,
        error: errMsg,
        auto_paused: rateLimited,
        dead: exhausted,
      });
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
