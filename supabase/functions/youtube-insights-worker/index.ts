// youtube-insights-worker v1.0.0 (Stage 1 MVP — docs/briefs/youtube-insights-worker.md §11)
//
// Read-back of YouTube Data API status/statistics for ICE-published YouTube videos into the EXISTING
// m.post_performance table (platform='youtube', insights_period='lifetime'). READ from YouTube +
// UPSERT to m.post_performance only. No schema change, no cron (manual invoke first), no YouTube
// mutation. Standalone from the Facebook insights-worker (different API + token model).
//
// WCCH-hardened invariants baked in:
//  - Code-level client allowlist (Property Pulse + NDIS-Yarns); CFW excluded (UNTESTED_NO_YOUTUBE_ROWS).
//  - MAX_VIDEOS_PER_RUN cap + never-collected-first ordering + duplicate-safe LATERAL selection.
//  - batch-of-50 videos.list chunking (YouTube hard limit).
//  - Live unique key is (platform_post_id, insights_period) — platform NOT in the key (verified V-2
//    2026-05-29). So the conflict target is (platform_post_id, insights_period) AND a runtime
//    cross-platform-clobber guard NEVER overwrites a non-youtube row (load-bearing MVP limitation:
//    correctness depends on YouTube<->FB platform_post_id disjointness; the guard makes it fail safe).
//  - engagement_rate divide-by-zero guard (NULL on zero/missing views; raw counts preserved).
//  - viewCount->impressions is a LOSSY platform-specific mapping (see raw_payload.source_note) — NOT
//    cross-platform comparable; consumers must filter by platform.
//  - Token-rotation containment: every OAuth exchange response is inspected for a returned
//    refresh_token; if present → stop that client, never discard, no retry-loop, surface
//    rotation_detected + ok:false; a separate approved credential-update path must persist it. No
//    schema/marker write here (kept as visible function output/log per the brief).
//  - v3.20 visibility verification is ARMED (records authoritative privacy_status), NOT closed —
//    closure needs a genuinely post-v1.11.0 upload observed public.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'youtube-insights-worker-v1.0.0';
const TOKEN_URL    = 'https://oauth2.googleapis.com/token';
const VIDEOS_URL   = 'https://www.googleapis.com/youtube/v3/videos';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const INSIGHTS_PERIOD = 'lifetime';

// Code-level allowlist (NOT DB/config-driven for MVP). Only Stage-0-confirmed STAGE1_READY clients.
const STAGE1_CLIENT_ALLOWLIST = [
  '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', // Property Pulse (STAGE1_READY 2026-05-29)
  'fb98a472-ae4d-432d-8738-2273231c1ef4', // NDIS-Yarns     (STAGE1_READY 2026-05-29)
];
const MAX_VIDEOS_PER_RUN = 100; // explicit per-run cap / backpressure
const VIDEOS_LIST_CHUNK  = 50;  // YouTube videos.list hard limit per call

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-worker-key',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function nowIso() { return new Date().toISOString(); }
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function chunk<T>(a: T[], n = VIDEOS_LIST_CHUNK): T[][] { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }

type TokenResult = { accessToken: string; scope: string | null; rotated: boolean };

// OAuth refresh→access. Returns rotated=true if Google issued a NEW refresh_token (never returns the
// token value). Token values are never logged/returned/persisted.
async function exchangeToken(refreshToken: string, oauthClientId: string, oauthSecret: string): Promise<TokenResult> {
  const params = new URLSearchParams({ client_id: oauthClientId, client_secret: oauthSecret, refresh_token: refreshToken, grant_type: 'refresh_token' });
  const resp = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.access_token) throw new Error(`token_exchange_${resp.status}`);
  return { accessToken: data.access_token as string, scope: typeof data.scope === 'string' ? data.scope : null, rotated: !!data.refresh_token };
}

// Resolve the refresh token the publisher uses; returns SOURCE LABEL only alongside the in-memory token.
async function resolveRefreshToken(supabase: ReturnType<typeof getServiceClient>, clientId: string): Promise<{ token: string | null; source: string }> {
  const { data: ch } = await supabase.rpc('exec_sql', { query: `SELECT config FROM c.client_channel WHERE client_id = '${clientId}' AND platform = 'youtube' LIMIT 1` });
  const inline = (ch as any)?.[0]?.config?.refresh_token ?? null;
  if (inline) return { token: inline, source: 'client_channel.config' };
  const { data: prof } = await supabase.schema('c').from('client_publish_profile')
    .select('credential_env_key').eq('client_id', clientId).eq('platform', 'youtube').limit(1).maybeSingle();
  const key = (prof as any)?.credential_env_key;
  if (key) { const v = Deno.env.get(key); if (v) return { token: v, source: `credential_env_key:${key}` }; return { token: null, source: `credential_env_key:${key}(env_absent)` }; }
  return { token: null, source: 'none' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return json({ ok: true, function: 'youtube-insights-worker', version: VERSION });

  // gate (matches the probe pattern): require x-worker-key == PUBLISHER_API_KEY
  const expected = Deno.env.get('PUBLISHER_API_KEY');
  if (!expected) return json({ ok: false, version: VERSION, error: 'PUBLISHER_API_KEY_not_set' }, 500);
  if (req.headers.get('x-worker-key') !== expected) return json({ ok: false, version: VERSION, error: 'Unauthorized' }, 401);

  const oauthClientId = Deno.env.get('YOUTUBE_CLIENT_ID');
  const oauthSecret   = Deno.env.get('YOUTUBE_CLIENT_SECRET');
  if (!oauthClientId || !oauthSecret) return json({ ok: false, version: VERSION, error: 'YOUTUBE_CLIENT_ID/SECRET_not_set' }, 500);

  const supabase = getServiceClient();
  const run_at = nowIso();
  let quota_units_consumed = 0;
  let okOverall = true;
  const rotation_detected: string[] = [];
  const clients: Record<string, any> = {};
  const errors: any[] = [];
  let total_processed = 0, total_upserted = 0, total_first_time = 0, total_skipped_collision = 0, total_missing = 0;

  try {
    // ---- Input selection (duplicate-safe + capped + never-collected-first) ----
    const allowSql = STAGE1_CLIENT_ALLOWLIST.map(id => `'${id}'`).join(',');
    const selectSql = `
      SELECT pp.post_publish_id, pp.client_id, pp.platform_post_id, pp.published_at,
             (perf.collected_at IS NULL) AS never_collected
      FROM m.post_publish pp
      LEFT JOIN LATERAL (
        SELECT MIN(p.collected_at) AS collected_at
        FROM m.post_performance p
        WHERE p.platform_post_id = pp.platform_post_id
          AND p.insights_period = '${INSIGHTS_PERIOD}' AND p.platform = 'youtube'
      ) perf ON true
      WHERE pp.platform = 'youtube' AND pp.status = 'published' AND pp.platform_post_id IS NOT NULL
        AND pp.client_id IN (${allowSql})
      ORDER BY (perf.collected_at IS NULL) DESC, perf.collected_at ASC NULLS FIRST, pp.published_at DESC
      LIMIT ${MAX_VIDEOS_PER_RUN}
    `;
    const { data: rows, error: selErr } = await supabase.rpc('exec_sql', { query: selectSql });
    if (selErr) return json({ ok: false, version: VERSION, error: 'select_failed', detail: selErr.message }, 500);

    const videos = ((rows as any[]) ?? []) as { post_publish_id: string; client_id: string; platform_post_id: string; published_at: string; never_collected: boolean }[];
    if (!videos.length) return json({ ok: true, version: VERSION, run_at, message: 'no_youtube_rows_to_collect', quota_units_consumed: 0 });

    // group video ids by client
    const byClient = new Map<string, typeof videos>();
    for (const v of videos) { const a = byClient.get(v.client_id) ?? []; a.push(v); byClient.set(v.client_id, a); }

    // ---- Cross-platform-clobber guard map: existing (platform_post_id -> platform) for these ids ----
    const allIds = videos.map(v => v.platform_post_id);
    const existingPlatform = new Map<string, string>();
    for (const ids of chunk(allIds, 200)) {
      const inList = ids.map(id => `'${id}'`).join(',');
      const { data: ex } = await supabase.rpc('exec_sql', {
        query: `SELECT platform_post_id, platform FROM m.post_performance WHERE insights_period = '${INSIGHTS_PERIOD}' AND platform_post_id IN (${inList})`,
      });
      for (const r of ((ex as any[]) ?? [])) existingPlatform.set(r.platform_post_id, r.platform);
    }

    for (const [clientId, vids] of byClient) {
      const summary: any = { token_source: 'none', processed: 0, upserted: 0, first_time: 0, skipped_cross_platform: 0, missing: 0, scopes_on_token: 'unknown/not_returned', errors: [] as any[] };
      clients[clientId] = summary;
      try {
        const { token, source } = await resolveRefreshToken(supabase, clientId);
        summary.token_source = source;
        if (!token) { summary.error = 'no_refresh_token_available'; okOverall = false; continue; }

        let tok: TokenResult;
        try { tok = await exchangeToken(token, oauthClientId, oauthSecret); }
        catch (e: any) {
          const msg = e?.message ?? String(e);
          if (/_400|_401/.test(msg)) { summary.verdict = 'NEEDS_RECONSENT'; summary.error = msg; }
          else { summary.error = msg; }
          okOverall = false; continue;
        }
        // token-rotation containment
        if (tok.rotated) {
          rotation_detected.push(clientId);
          summary.rotation_detected = true;
          summary.error = 'ROTATION_DETECTED: Google returned a new refresh_token; client STOPPED, token not persisted here. Requires a separate approved credential-update path.';
          okOverall = false; continue; // never retry-loop, never discard-silently (surfaced), never strand publisher
        }
        summary.scopes_on_token = tok.scope ?? 'unknown/not_returned';
        const accessToken = tok.accessToken;

        // videos.list in chunks of <=50
        const idList = vids.map(v => v.platform_post_id);
        const itemById = new Map<string, any>();
        for (const ids of chunk(idList, VIDEOS_LIST_CHUNK)) {
          const url = `${VIDEOS_URL}?part=status,statistics,snippet&id=${encodeURIComponent(ids.join(','))}`;
          const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
          quota_units_consumed += 1;
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            const m = `videos_list_${resp.status}:${(data?.error?.message ?? '').slice(0, 120)}`;
            if (resp.status === 403) { summary.verdict = 'NEEDS_RECONSENT'; summary.error = m; okOverall = false; }
            else { summary.errors.push(m); errors.push({ client_id: clientId, error: m }); okOverall = false; } // 5xx/quota transient -> next run retries
            continue;
          }
          for (const it of (data?.items ?? [])) itemById.set(it.id, it);
        }

        // resolve channel stats per distinct channel (1 unit each)
        const channelStats = new Map<string, any>();
        const channelTitle = new Map<string, string>();
        const channelIds = [...new Set([...itemById.values()].map(it => it?.snippet?.channelId).filter(Boolean))];
        for (const cid of channelIds) {
          try {
            const resp = await fetch(`${CHANNELS_URL}?part=statistics&id=${encodeURIComponent(cid)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
            quota_units_consumed += 1;
            const data = await resp.json().catch(() => ({}));
            const s = data?.items?.[0]?.statistics;
            if (resp.ok && s) channelStats.set(cid, { subscriber_count: s.hiddenSubscriberCount ? 'hidden' : (s.subscriberCount ?? null), total_view_count: s.viewCount ?? null, video_count: s.videoCount ?? null });
          } catch (_) { /* tolerate; channel stats are best-effort */ }
        }

        // per-video map + guarded upsert
        for (const v of vids) {
          summary.processed++; total_processed++;
          const it = itemById.get(v.platform_post_id);
          if (!it) { summary.missing++; total_missing++; summary.errors.push(`missing_video:${v.platform_post_id}`); continue; }

          // cross-platform-clobber guard
          const existing = existingPlatform.get(v.platform_post_id);
          if (existing && existing !== 'youtube') {
            summary.skipped_cross_platform++; total_skipped_collision++;
            summary.errors.push(`cross_platform_id_collision:${v.platform_post_id}(existing=${existing})`);
            okOverall = false; continue; // never overwrite a non-youtube row
          }

          const stats = it.statistics ?? {};
          const views = Number(stats.viewCount);
          const likeCount = stats.likeCount != null ? Number(stats.likeCount) : null;
          const commentCount = stats.commentCount != null ? Number(stats.commentCount) : null;
          const engaged = (likeCount ?? 0) + (commentCount ?? 0);
          const engagement_rate = (Number.isFinite(views) && views > 0) ? engaged / views : null; // divide-by-zero guard
          const chId = it?.snippet?.channelId ?? null;

          const raw_payload = {
            privacy_status: it?.status?.privacyStatus ?? null,           // AUTHORITATIVE (arms v3.20)
            upload_status:  it?.status?.uploadStatus ?? null,
            view_count: stats.viewCount ?? null, like_count: stats.likeCount ?? null, comment_count: stats.commentCount ?? null,
            channel_id: chId, channel_title: it?.snippet?.channelTitle ?? null,
            published_at: it?.snippet?.publishedAt ?? null,
            channel_stats: chId ? (channelStats.get(chId) ?? null) : null,
            source_note: 'youtube Data API; view_count->impressions is a LOSSY platform-specific mapping, NOT cross-platform comparable; reach/shares/clicks N/A',
            version: VERSION,
          };

          const { error: upErr } = await supabase.schema('m').from('post_performance').upsert({
            post_publish_id: v.post_publish_id, client_id: v.client_id,
            platform: 'youtube', platform_post_id: v.platform_post_id,
            impressions: stats.viewCount != null ? Number(stats.viewCount) : null,   // LOSSY mapping (see raw_payload)
            reactions: likeCount, comments: commentCount,
            engaged_users: (likeCount != null || commentCount != null) ? engaged : null,
            engagement_rate, reach: null, shares: null, clicks: null,
            collected_at: nowIso(), insights_period: INSIGHTS_PERIOD, raw_payload,
          }, { onConflict: 'platform_post_id,insights_period' });

          if (upErr) { summary.errors.push(`upsert_failed:${v.platform_post_id}:${upErr.message.slice(0, 120)}`); errors.push({ client_id: clientId, error: upErr.message.slice(0, 200) }); okOverall = false; continue; }
          summary.upserted++; total_upserted++;
          if (v.never_collected) { summary.first_time++; total_first_time++; }
        }
      } catch (e: any) {
        summary.error = (e?.message ?? String(e)).slice(0, 300); okOverall = false;
      }
    }

    return json({
      ok: okOverall, version: VERSION, run_at, quota_units_consumed,
      rotation_detected,
      totals: { total_processed, total_upserted, total_first_time, total_skipped_cross_platform: total_skipped_collision, total_missing },
      clients, errors,
      note: 'v3.20 verification is ARMED (privacy_status recorded), not closed — closure needs a post-v1.11.0 upload observed public.',
    });
  } catch (e: any) {
    return json({ ok: false, version: VERSION, run_at, error: (e?.message ?? String(e)).slice(0, 500) }, 500);
  }
});
