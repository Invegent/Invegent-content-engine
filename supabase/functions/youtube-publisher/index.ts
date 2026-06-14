// youtube-publisher v1.12.0
// v1.12.0 (F-YT-PLATFORM-ISOLATION) — P0 cross-platform publish fix. youtube-publisher is a DIRECT-READ
//   publisher: it SELECTs m.post_draft itself (not the platform-tagged queue the FB/IG publishers use). The
//   v1.11.0 SELECT had NO platform predicate, so for NY/PP — where the series-outline v1.3.0 format
//   intersection collapses all four platform drafts to video_short_avatar — it picked up the Facebook,
//   Instagram AND LinkedIn drafts and uploaded each to YouTube (public since v1.11.0). Read-only audit
//   2026-06-14 sized it as facebook/instagram/linkedin -> youtube cross-publishes spanning ~2 months across
//   NY+PP (M12 cross-platform class — the same bug instagram-publisher was refactored out of in v2.0.0).
//   FIX (isolation only): (a) add 'platform' to the SELECT columns + a HARD .eq('platform','youtube') filter;
//   (b) a defensive per-row `draft.platform !== 'youtube'` skip in the loop (defence-in-depth, mirrors
//   instagram-publisher v2.0.0). NOTHING else changes: upload path, DEFAULT_PRIVACY_STATUS (public), approval
//   predicate, ELIGIBLE_FORMATS (still includes video_short_avatar), no-YT-id guard, pre-upload reconcile
//   guard, failure classification, retry/backoff, channel hold, 2/tick cap, attempt_no audit fix — all
//   byte-unchanged. NO render-worker change, NO queue change, NO visibility change, NO historical remediation
//   of the already-uploaded cross-posts (separate lane). D-01 e0c87546; PK exact-phrase 2026-06-15.
// v1.11.0 (visibility): default production YouTube visibility unlisted -> PUBLIC. Future production uploads
//   now publish as Public (PK directive 2026-05-29; ICE Shorts/videos were going out Unlisted). The single
//   source of truth is the named module constant DEFAULT_PRIVACY_STATUS = 'public', referenced from BOTH the
//   YouTube upload privacyStatus AND the m.post_publish audit response_payload.privacy_status so the recorded
//   metadata can never drift from the actual intended visibility. SAFETY DEPENDS ON THE APPROVAL GATE: a
//   Public default is only safe because the draft SELECT below gates on approval_status IN ('approved',
//   'published') AND video_status='generated' AND recommended_format in the format allow-list AND
//   draft_format->youtube_video_id IS NULL. If that predicate is ever weakened, this Public default becomes
//   unsafe and must be re-reviewed. NO env/config/UI/per-client setting, NO schema change, NO backfill, NO
//   historical audit cleanup, NO YouTube API mutation of existing videos. Everything else byte-unchanged from
//   v1.10.0: approval predicate, metadata, failure classification, bounded retry, channel auth-hold, the
//   no-YT-id guard, the pre-upload reconcile guard, the format allow-list, the 2/tick cap, and the
//   next-available attempt_no audit fix. Already-published drafts (youtube_video_id set / video_status not
//   'generated') are never re-selected and never re-uploaded, so this does not touch any historical video.
// v1.10.0 (F-YT-PUB-PUBLISH-AUDIT-GAP): fix the silently-dropped YouTube post_publish audit row for
//   cross-posted drafts. m.post_publish has uq_publish_attempt UNIQUE(post_draft_id, attempt_no); the
//   success path hardcoded attempt_no=1, which collides with the draft's existing Facebook row (also
//   attempt_no=1) → the youtube audit INSERT was rejected, and the error was logged-not-thrown, so the
//   draft was marked published while its YouTube post_publish row was silently lost. v1.10.0: (a) pick
//   the NEXT available attempt_no per post_draft_id (max(attempt_no)+1) for the youtube insert so it no
//   longer collides; (b) on a residual insert error, do NOT swallow it — write a durable
//   youtube_audit_insert_failed marker into draft_format (the draft is already published, never
//   re-selected, so no re-upload). No re-upload, no double-publish. Everything else byte-unchanged from
//   v1.9.0: the approval predicate IN ('approved','published'), metadata, unlisted privacy, failure
//   classification, bounded retry, channel auth-hold, the no-YT-id guard, the pre-upload reconcile guard,
//   the format allow-list and the 2/tick cap. Pairs with the one-time backfill of historical missing
//   youtube audit rows (Unit B; separate sql_destructive step) — brief docs/briefs/yt-publisher-publish-audit-gap.md.
// v1.9.0 (F-YT-FAILED-NO-RETRY Unit B-2 — cross-platform approval predicate):
//   Broaden the draft SELECT from approval_status='approved' to approval_status IN ('approved','published').
//   FINDING (CCD read-only scoping 2026-05-26): all 17 B2 token-casualty drafts (the OAuth Testing-mode
//   invalid_grant set) have a Facebook m.post_publish row and ZERO YouTube row — so their
//   approval_status='published' is TRUTHFUL cross-platform state (they were published to Facebook), NOT a
//   YouTube artifact. approval_status is a draft-level / cross-platform field and must NOT gate the YouTube
//   leg. YouTube publish eligibility is correctly governed by YouTube-SPECIFIC guards only:
//     - draft_format.youtube_video_id IS NULL                (no prior YT upload id)
//     - no m.post_publish row with platform='youtube'        (pre-upload reconcile guard — unchanged)
//     - recommended_format in the 5-format allow-list + video_url IS NOT NULL + video_status='generated'
//   So a draft already published elsewhere stays eligible for its YouTube leg, behind those unchanged
//   guards — no double-publish (a draft that already has a YT id / YT post row is skipped or reconciled,
//   never re-uploaded). Everything else is byte-unchanged from v1.8.0: the successful-publish path,
//   metadata, unlisted privacy, failure classification (auth/quota/transient/terminal), bounded retry,
//   channel auth-hold, the no-YT-id guard, the format allow-list, and the 2/tick cap. approval_status is
//   NOT written by this function. Pairs with the bounded Unit B-2 recovery DML (video_status
//   failed->generated on the exact 17 ids; approval_status PRESERVED) — prepared, NOT yet applied:
//   docs/briefs/results/yt-publisher-failed-no-retry-unit-b2-recovery.sql.
// v1.8.0 (F-YT-FAILED-NO-RETRY): failure classification + bounded retry + channel-level auth hold.
//   The v1.7.0 catch unconditionally set video_status='failed' and the SELECT only re-selects
//   'generated' — so any transient failure (token blip, 5xx, quota, download fail) permanently
//   bricked a draft, and a channel-wide token outage silently froze the whole rendered backlog.
//   v1.8.0 classifies failures (auth | quota | transient | terminal) and contains each:
//     - transient under cap  -> stays 'generated', attempts++, retry_after = now+30m (re-tried after backoff)
//     - transient at cap (5)  -> video_status='failed' + youtube_dead_reason='max_attempts:n/5' (true terminal)
//     - quota (429/quotaExceeded; project-wide) -> stays 'generated', retry_after = now+6h, NOT counted, never terminal
//     - auth (invalid_grant/401/token) -> stays 'generated', NOT counted, NOT failed; channel hold:
//         best-effort c.client_publish_profile.paused_until = now+6h (column confirmed via direct SQL; the EF
//         PostgREST write path is unverified, so it is best-effort) PLUS an in-run pausedClients skip of that
//         channel's remaining drafts — the in-run set is the actual guarantee, the persist is only an optimisation.
//     - terminal (4xx content/metadata reject, 'no video id') -> video_status='failed' immediately + dead_reason
//   Retry state lives in draft_format jsonb (video_status is text / no-CHECK — no DDL): youtube_upload_attempts,
//   youtube_retry_after, youtube_dead_reason. SELECT keeps EVERY v1.7.0 predicate (incl the 5-format allow-list
//   with video_short_avatar and the youtube_video_id-IS-NULL guard); limit 2->5 with backed-off + channel-paused
//   drafts skipped in JS, and effective uploads capped at 2/tick to preserve the existing cadence.
//   Idempotency / no-duplicate-upload hardened: youtubeVideoId is captured in an outer scope so an
//   upload-succeeded-but-persist-failed error recovers forward (re-persists the id, never re-uploads); plus a
//   pre-upload m.post_publish existence check reconciles any prior orphaned upload instead of re-uploading.
//   The successful-publish path, metadata, approval gate, format allow-list and unlisted privacy are UNCHANGED;
//   on success any prior youtube_retry_after / youtube_upload_attempts / error / dead_reason are cleared.
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

const VERSION = 'youtube-publisher-v1.12.0';
const YOUTUBE_TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status';

// --- v1.8.0 hardening knobs ---
const MAX_YT_UPLOAD_ATTEMPTS = 5;    // transient failures terminalise at this many attempts
const YT_RETRY_BACKOFF_MIN   = 30;   // standard transient backoff (minutes)
const YT_QUOTA_BACKOFF_MIN    = 360; // quota = park 6h, NOT counted (YouTube quota is project/day-wide)
const YT_AUTH_PAUSE_HOURS     = 6;   // channel hold on auth failure (best-effort persist)
const MAX_PUBLISHES_PER_TICK  = 2;   // preserve existing publish cadence
const SELECT_LIMIT            = 5;   // fetch a few extra so backed-off drafts don't starve fresh ones
const ELIGIBLE_FORMATS = ['video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar'];
// v1.11.0: single source of truth for future-publish visibility. Referenced by BOTH the upload privacyStatus
// and the audit response_payload.privacy_status so recorded metadata never drifts from intended visibility.
const DEFAULT_PRIVACY_STATUS: 'public' | 'private' | 'unlisted' = 'public';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-youtube-publisher-key',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function nowIso() { return new Date().toISOString(); }
function futureIso(ms: number) { return new Date(Date.now() + ms).toISOString(); }
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// v1.8.0: classify a thrown error message into a containment class.
// Word-boundary digit matching so codes embedded in trace ids are not matched (PUBLISH_NOT_READY_RE lesson).
function classifyYouTubeFailure(errMsg: string): 'auth' | 'quota' | 'transient' | 'terminal' {
  const m = (errMsg || '').toLowerCase();
  if (/invalid_grant|token refresh failed|expired or revoked|unauthorized|\b401\b/.test(m)) return 'auth';
  if (/quota|quotaexceeded|\b429\b|ratelimitexceeded|userratelimitexceeded/.test(m)) return 'quota';
  if (/\b5\d\d\b|backenderror|internalerror|failed to download|fetch failed|network|timeout|temporar/.test(m)) return 'transient';
  if (/\b40[03]\b|unsupported|invalid (metadata|video)|no video id/.test(m)) return 'terminal';
  return 'transient'; // default: bounded retry under the cap — safer than instant death
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

  // v1.6.0 (T17): approval gate at fetch time. v1.7.0: video_short_avatar in allow-list.
  // v1.8.0: SELECT predicates UNCHANGED in meaning (incl youtube_video_id-IS-NULL guard + 5-format list);
  //         limit bumped 2->5; backed-off/paused drafts skipped in JS; effective uploads capped at 2/tick.
  // v1.9.0: approval predicate broadened 'approved' -> IN ('approved','published') — cross-platform fix
  //         (a draft already published to e.g. Facebook still needs its YouTube leg). The no-YT-id guard
  //         and the pre-upload m.post_publish reconcile guard below are what prevent double-upload.
  // v1.12.0 (F-YT-PLATFORM-ISOLATION): HARD platform filter — this direct-read publisher must only ever
  //         select YouTube-targeted drafts. Without it, every video_short_avatar draft (fb/ig/li included)
  //         was eligible and got uploaded to YouTube. 'platform' is now selected + gated here, with a
  //         defensive per-row re-check in the loop below (mirrors instagram-publisher v2.0.0).
  const { data: drafts } = await supabase.schema('m').from('post_draft')
    .select('post_draft_id, platform, client_id, draft_title, draft_body, recommended_format, video_url, draft_format, approval_status')
    .eq('platform', 'youtube')
    .eq('video_status', 'generated')
    .in('approval_status', ['approved', 'published'])
    .is('draft_format->youtube_video_id', null)
    .not('video_url', 'is', null)
    .in('recommended_format', ELIGIBLE_FORMATS)
    .limit(SELECT_LIMIT);

  // v1.8.0: best-effort preload of channel holds (paused_until). Correctness does NOT depend on this —
  // the in-run pausedClients set is the guarantee; this only avoids re-probing a known-dead channel.
  const pausedUntil = new Map<string, number>();
  try {
    const ids = [...new Set((drafts ?? []).map((d: any) => d.client_id))];
    if (ids.length) {
      const { data: profs } = await supabase.schema('c').from('client_publish_profile')
        .select('client_id, paused_until').eq('platform', 'youtube').in('client_id', ids);
      for (const p of (profs ?? [])) { if (p.paused_until) pausedUntil.set(p.client_id, new Date(p.paused_until).getTime()); }
    }
  } catch (_) { /* best-effort: proceed with no preloaded holds */ }

  const pausedClients = new Set<string>(); // in-run channel hold — the actual guarantee
  let publishCount = 0;
  const nowMs = Date.now();

  for (const draft of (drafts ?? [])) {
    if (publishCount >= MAX_PUBLISHES_PER_TICK) break;

    // v1.12.0 (F-YT-PLATFORM-ISOLATION) defence-in-depth: never upload a non-youtube draft even if a future
    // SELECT change or code path lets one through. Exact M12 cross-platform class.
    if (draft.platform !== 'youtube') {
      console.error(`[youtube-publisher] platform_isolation_skip post_draft_id=${draft.post_draft_id} platform=${draft.platform}`);
      results.push({ post_draft_id: draft.post_draft_id, status: 'skipped_platform_isolation', platform: draft.platform });
      continue;
    }

    // channel hold (persistent best-effort OR in-run)
    const heldUntil = pausedUntil.get(draft.client_id);
    if (pausedClients.has(draft.client_id) || (heldUntil && heldUntil > nowMs)) {
      results.push({ post_draft_id: draft.post_draft_id, status: 'skipped_channel_paused' });
      continue;
    }
    // per-draft backoff
    const ra = draft.draft_format?.youtube_retry_after;
    if (ra && new Date(ra).getTime() > nowMs) {
      results.push({ post_draft_id: draft.post_draft_id, status: 'skipped_backoff' });
      continue;
    }

    const df = draft.draft_format ?? {};

    // v1.8.0 pre-upload idempotency guard: if an m.post_publish youtube row already exists for this draft
    // (e.g. a prior upload landed but the draft persist failed), reconcile to published — never re-upload.
    try {
      const { data: existing } = await supabase.schema('m').from('post_publish')
        .select('platform_post_id').eq('post_draft_id', draft.post_draft_id).eq('platform', 'youtube').limit(1).maybeSingle();
      if (existing?.platform_post_id) {
        const recDf = { ...df, youtube_video_id: existing.platform_post_id, youtube_url: `https://www.youtube.com/watch?v=${existing.platform_post_id}`, youtube_published: nowIso(), youtube_recovered: true };
        delete (recDf as any).youtube_retry_after; delete (recDf as any).youtube_upload_attempts;
        await supabase.schema('m').from('post_draft').update({ video_status: 'published', draft_format: recDf, updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
        results.push({ post_draft_id: draft.post_draft_id, status: 'already_published_reconciled', youtube_video_id: existing.platform_post_id });
        continue;
      }
    } catch (_) { /* if the guard read fails, fall through to the normal upload path */ }

    let youtubeVideoId: string | null = null;
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
      youtubeVideoId = await uploadToYouTube({ accessToken, videoBuffer, title, description, tags, categoryId, privacyStatus: DEFAULT_PRIVACY_STATUS });
      const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
      const durationMs = Date.now() - startMs;
      // success: persist + CLEAR any retry metadata left from prior attempts
      const okDf = { ...df, youtube_video_id: youtubeVideoId, youtube_url: youtubeUrl, youtube_published: nowIso() };
      delete (okDf as any).youtube_retry_after; delete (okDf as any).youtube_upload_attempts;
      delete (okDf as any).youtube_upload_error; delete (okDf as any).youtube_dead_reason;
      await supabase.schema('m').from('post_draft').update({
        draft_format: okDf, video_status: 'published', updated_at: nowIso(),
      }).eq('post_draft_id', draft.post_draft_id);
      // v1.10.0 (F-YT-PUB-PUBLISH-AUDIT-GAP): pick the next available attempt_no for this draft so the
      // youtube audit row does not collide with another platform's row on uq_publish_attempt
      // (post_draft_id, attempt_no). A cross-posted draft already holds a Facebook row at attempt_no=1,
      // so the old hardcoded attempt_no=1 was rejected and the YT audit row was silently lost.
      let nextAttemptNo = 1;
      try {
        const { data: priorRows } = await supabase.schema('m').from('post_publish')
          .select('attempt_no').eq('post_draft_id', draft.post_draft_id)
          .order('attempt_no', { ascending: false }).limit(1);
        nextAttemptNo = Number(priorRows?.[0]?.attempt_no ?? 0) + 1;
      } catch (_) { nextAttemptNo = 1; }
      const { error: insertErr } = await supabase.schema('m').from('post_publish').insert({
        post_draft_id: draft.post_draft_id, client_id: draft.client_id,
        platform: 'youtube', platform_post_id: youtubeVideoId,
        published_at: nowIso(), status: 'published', attempt_no: nextAttemptNo,
        response_payload: { youtube_url: youtubeUrl, privacy_status: DEFAULT_PRIVACY_STATUS, video_size_mb: videoSizeMb, duration_ms: durationMs },
      });
      if (insertErr) {
        // v1.10.0: do NOT swallow silently. The draft is already video_status='published' (so it will not be
        // re-selected and never re-uploads) — record a durable, visible marker so any residual audit miss is
        // discoverable + backfillable instead of invisible.
        console.error(`[youtube-publisher] post_publish INSERT failed:`, insertErr.message);
        try {
          await supabase.schema('m').from('post_draft').update({
            draft_format: { ...okDf, youtube_audit_insert_failed: insertErr.message ?? true, youtube_audit_insert_failed_at: nowIso() },
            updated_at: nowIso(),
          }).eq('post_draft_id', draft.post_draft_id);
        } catch (_) { /* marker is best-effort */ }
      }
      publishCount++;
      results.push({ post_draft_id: draft.post_draft_id, status: 'published', youtube_video_id: youtubeVideoId, youtube_url: youtubeUrl, audit_row_inserted: !insertErr, attempt_no: nextAttemptNo });
    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 2000);

      // v1.8.0 idempotency: upload landed but a later step threw -> recover forward, NEVER re-upload.
      if (youtubeVideoId) {
        const recDf = { ...df, youtube_video_id: youtubeVideoId, youtube_url: `https://www.youtube.com/watch?v=${youtubeVideoId}`, youtube_published: nowIso(), youtube_recovered: true };
        delete (recDf as any).youtube_retry_after; delete (recDf as any).youtube_upload_attempts;
        try {
          await supabase.schema('m').from('post_draft').update({ video_status: 'published', draft_format: recDf, updated_at: nowIso() }).eq('post_draft_id', draft.post_draft_id);
        } catch (_) { /* leave for the pre-upload reconcile guard next tick */ }
        publishCount++;
        results.push({ post_draft_id: draft.post_draft_id, status: 'published_recovered', youtube_video_id: youtubeVideoId });
        continue;
      }

      const cls = classifyYouTubeFailure(msg);
      const attempts = Number(df.youtube_upload_attempts ?? 0);

      if (cls === 'auth') {
        // channel-level: do NOT count, do NOT fail. Best-effort persist hold + in-run skip of this channel.
        try {
          await supabase.schema('c').from('client_publish_profile')
            .update({ paused_until: futureIso(YT_AUTH_PAUSE_HOURS * 3600 * 1000) })
            .eq('client_id', draft.client_id).eq('platform', 'youtube');
        } catch (_) { /* best-effort; the in-run set still protects this tick */ }
        pausedClients.add(draft.client_id);
        await supabase.schema('m').from('post_draft').update({
          draft_format: { ...df, youtube_upload_error: msg, youtube_upload_attempted: nowIso(), youtube_retry_after: futureIso(YT_RETRY_BACKOFF_MIN * 60 * 1000) },
          updated_at: nowIso(),
        }).eq('post_draft_id', draft.post_draft_id); // video_status stays 'generated'
        results.push({ post_draft_id: draft.post_draft_id, status: 'channel_paused_auth', paused_hours: YT_AUTH_PAUSE_HOURS });
      } else if (cls === 'quota') {
        // project-wide rate limit: park long, do NOT count, never terminalise (self-heals on daily reset).
        await supabase.schema('m').from('post_draft').update({
          draft_format: { ...df, youtube_upload_error: msg, youtube_upload_attempted: nowIso(), youtube_retry_after: futureIso(YT_QUOTA_BACKOFF_MIN * 60 * 1000) },
          updated_at: nowIso(),
        }).eq('post_draft_id', draft.post_draft_id); // video_status stays 'generated'
        results.push({ post_draft_id: draft.post_draft_id, status: 'retry_queued_quota', retry_after_min: YT_QUOTA_BACKOFF_MIN });
      } else if (cls === 'transient' && (attempts + 1) < MAX_YT_UPLOAD_ATTEMPTS) {
        const n = attempts + 1;
        await supabase.schema('m').from('post_draft').update({
          draft_format: { ...df, youtube_upload_error: msg, youtube_upload_attempted: nowIso(), youtube_upload_attempts: n, youtube_retry_after: futureIso(YT_RETRY_BACKOFF_MIN * 60 * 1000) },
          updated_at: nowIso(),
        }).eq('post_draft_id', draft.post_draft_id); // video_status stays 'generated'
        results.push({ post_draft_id: draft.post_draft_id, status: 'retry_queued', attempt: n });
      } else {
        // terminal class, OR transient at/over the cap -> true terminal
        const n = attempts + 1;
        const deadReason = cls === 'transient' ? `max_attempts:${n}/${MAX_YT_UPLOAD_ATTEMPTS}` : `terminal:${cls}`;
        await supabase.schema('m').from('post_draft').update({
          video_status: 'failed',
          draft_format: { ...df, youtube_upload_error: msg, youtube_upload_attempted: nowIso(), youtube_upload_attempts: n, youtube_dead_reason: deadReason },
          updated_at: nowIso(),
        }).eq('post_draft_id', draft.post_draft_id);
        results.push({ post_draft_id: draft.post_draft_id, status: 'failed', dead_reason: deadReason });
      }
    }
  }

  if (!results.length) return jsonResponse({ ok: true, message: 'no_videos_ready_to_upload', version: VERSION });
  return jsonResponse({ ok: true, version: VERSION, processed: results.length, results });
});
