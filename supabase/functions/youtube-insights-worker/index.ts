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

// WCCH Fix 2: strict ID validation before any interpolation/use. exec_sql has no parameter binding, so
// every value reaching a raw SQL string is format-validated first; external IDs (YouTube video ids) are
// NEVER interpolated and are also validated before use. PostgREST .eq() calls are parameterised.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const YTID_RE = /^[A-Za-z0-9_-]{11}$/;
function isUuid(s: unknown): s is string { return typeof s === 'string' && UUID_RE.test(s); }
function isYtId(s: unknown): s is string { return typeof s === 'string' && YTID_RE.test(s); }
// Fail-closed: the code-constant allowlist must be valid UUIDs (caught at module load, not at runtime).
if (!STAGE1_CLIENT_ALLOWLIST.every(isUuid)) throw new Error('STAGE1_CLIENT_ALLOWLIST contains a non-UUID entry');

// WCCH Fix 3: distinguish a quota/rate-limit 403 from an insufficient-scope 403 via error.errors[].reason.
function classify403(data: any): 'quota' | 'scope' | 'other' {
  const reasons: string[] = (data?.error?.errors ?? []).map((e: any) => String(e?.reason ?? ''));
  if (reasons.some(r => /quotaExceeded|rateLimitExceeded|userRateLimitExceeded|dailyLimitExceeded/i.test(r))) return 'quota';
  if (reasons.some(r => /insufficientPermissions|insufficientScope|forbidden|authError/i.test(r))) return 'scope';
  return 'other';
}

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
// WCCH Fix 2: both lookups go through PostgREST .eq() (parameterised) — NO string-interpolated SQL.
// clientId is UUID-validated by the caller before this runs.
async function resolveRefreshToken(supabase: ReturnType<typeof getServiceClient>, clientId: string): Promise<{ token: string | null; source: string }> {
  const { data: ch } = await supabase.schema('c').from('client_channel')
    .select('config').eq('client_id', clientId).eq('platform', 'youtube').limit(1).maybeSingle();
  const inline = (ch as any)?.config?.refresh_token ?? null;
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
  let cross_platform_collision_detected = false; // WCCH Fix 4: distinct top-level flag
  const rotation_detected: string[] = [];
  const clients: Record<string, any> = {};
  const errors: any[] = [];
  let total_processed = 0, total_upserted = 0, total_first_time = 0, total_skipped_collision = 0, total_missing = 0, total_invalid_id = 0;

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

    // group video ids by client; validate client_id (UUID) and platform_post_id (YouTube id) — skip+report invalid.
    const byClient = new Map<string, typeof videos>();
    for (const v of videos) {
      if (!isUuid(v.client_id) || !isYtId(v.platform_post_id)) {
        total_invalid_id++; okOverall = false;
        errors.push({ client_id: v.client_id, error: `invalid_id_skipped:${String(v.platform_post_id).slice(0, 24)}` });
        continue;
      }
      const a = byClient.get(v.client_id) ?? []; a.push(v); byClient.set(v.client_id, a);
    }

    // NOTE (WCCH Fix 1): the cross-platform-clobber guard is enforced at WRITE TIME per row (immediate
    // re-check + platform-scoped write below), NOT via a prefetch map — a prefetch is racy and the
    // (platform_post_id, insights_period) upsert conflict target omits platform, so prefetch alone could
    // not protect the write. See the per-video write block.

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
            const baseMsg = `videos_list_${resp.status}:${(data?.error?.message ?? '').slice(0, 120)}`;
            if (resp.status === 403) {
              const kind = classify403(data); // WCCH Fix 3: scope vs quota
              if (kind === 'scope') { summary.verdict = 'NEEDS_RECONSENT'; summary.error = baseMsg; }
              else if (kind === 'quota') { summary.errors.push(`quota:${baseMsg}`); errors.push({ client_id: clientId, error: `quota:${baseMsg}` }); } // transient -> next run retries
              else { summary.errors.push(baseMsg); errors.push({ client_id: clientId, error: baseMsg }); }
            } else {
              summary.errors.push(baseMsg); errors.push({ client_id: clientId, error: baseMsg }); // 5xx/quota transient -> next run retries
            }
            okOverall = false;
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

        // per-video: build the row, then perform a WRITE-TIME platform-safe write (WCCH Fix 1).
        for (const v of vids) {
          summary.processed++; total_processed++;
          const it = itemById.get(v.platform_post_id);
          if (!it) { summary.missing++; total_missing++; summary.errors.push(`missing_video:${v.platform_post_id}`); continue; }

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
          // non-key columns only (the keys platform/platform_post_id/insights_period are never changed on update)
          const rowValues = {
            post_publish_id: v.post_publish_id, client_id: v.client_id,
            impressions: stats.viewCount != null ? Number(stats.viewCount) : null,   // LOSSY mapping (see raw_payload)
            reactions: likeCount, comments: commentCount,
            engaged_users: (likeCount != null || commentCount != null) ? engaged : null,
            engagement_rate, reach: null, shares: null, clicks: null,
            collected_at: nowIso(), raw_payload,
          };

          // WCCH Fix 1 — WRITE-TIME cross-platform-clobber guard. The live unique key is
          // (platform_post_id, insights_period) and does NOT include platform, so an upsert with that
          // conflict target could overwrite a non-youtube row. Instead, re-check the exact row IMMEDIATELY
          // before writing: INSERT when absent; UPDATE only a row that is already platform='youtube'
          // (platform-scoped filter for defence-in-depth); SKIP + flag when the existing row is any other
          // platform. This does not rely on YouTube/FB id disjointness.
          const { data: cur, error: curErr } = await supabase.schema('m').from('post_performance')
            .select('performance_id, platform')
            .eq('platform_post_id', v.platform_post_id).eq('insights_period', INSIGHTS_PERIOD)
            .limit(1).maybeSingle();
          if (curErr) { summary.errors.push(`recheck_failed:${v.platform_post_id}:${curErr.message.slice(0, 100)}`); errors.push({ client_id: clientId, error: curErr.message.slice(0, 160) }); okOverall = false; continue; }

          if (cur && cur.platform !== 'youtube') {
            cross_platform_collision_detected = true; // WCCH Fix 4: distinct top-level flag
            summary.skipped_cross_platform++; total_skipped_collision++;
            summary.errors.push(`cross_platform_id_collision:${v.platform_post_id}(existing=${cur.platform})`);
            okOverall = false; continue; // NEVER overwrite a non-youtube row
          }

          let writeErr: any = null;
          if (!cur) {
            ({ error: writeErr } = await supabase.schema('m').from('post_performance').insert({
              platform: 'youtube', platform_post_id: v.platform_post_id, insights_period: INSIGHTS_PERIOD, ...rowValues,
            }));
            // a race could insert a conflicting row between re-check and insert -> unique violation; fail safe (skip), never clobber
            if (writeErr) { summary.errors.push(`insert_conflict_or_error:${v.platform_post_id}:${writeErr.message.slice(0, 100)}`); errors.push({ client_id: clientId, error: writeErr.message.slice(0, 160) }); okOverall = false; continue; }
          } else {
            // existing row is platform='youtube' -> update ONLY that row by PK, platform-scoped
            ({ error: writeErr } = await supabase.schema('m').from('post_performance').update(rowValues)
              .eq('performance_id', cur.performance_id).eq('platform', 'youtube'));
            if (writeErr) { summary.errors.push(`update_failed:${v.platform_post_id}:${writeErr.message.slice(0, 100)}`); errors.push({ client_id: clientId, error: writeErr.message.slice(0, 160) }); okOverall = false; continue; }
          }
          summary.upserted++; total_upserted++;
          if (v.never_collected) { summary.first_time++; total_first_time++; }
        }
      } catch (e: any) {
        summary.error = (e?.message ?? String(e)).slice(0, 300); okOverall = false;
      }
    }

    return json({
      ok: okOverall, version: VERSION, run_at, quota_units_consumed,
      cross_platform_collision_detected, // WCCH Fix 4: distinct top-level flag (not only per-client strings)
      rotation_detected,
      totals: { total_processed, total_upserted, total_first_time, total_skipped_cross_platform: total_skipped_collision, total_missing, total_invalid_id },
      clients, errors,
      // WCCH Fix 5: JSON-only surfacing of rotation/collision/quota is acceptable for the MANUAL invoke
      // (a human reads ok/flags/errors). This MUST be revisited before any cron is added — an unattended
      // run needs durable alerting (e.g. friction.case), not just response JSON, so degraded states are seen.
      note: 'v3.20 verification is ARMED (privacy_status recorded), NOT closed — closure needs a post-v1.11.0 upload observed public. JSON-only alerting is manual-invoke-only; revisit before cron.',
    });
  } catch (e: any) {
    return json({ ok: false, version: VERSION, run_at, error: (e?.message ?? String(e)).slice(0, 500) }, 500);
  }
});
