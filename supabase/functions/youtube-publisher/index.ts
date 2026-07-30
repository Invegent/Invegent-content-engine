// youtube-publisher v1.17.0
// v1.14.0 (F-YT-RELEASE-CONTROL) — publish only at the authorised release time. Until now youtube-publisher
//   was a direct-read publisher whose draft SELECT had NO release-time gate: it published any eligible draft on
//   the next tick regardless of scheduled_for. v1.14.0 adds a release-time gate in TWO layers:
//   (a) the SELECT now also fetches scheduled_for and adds `.or(scheduled_for.is.null,scheduled_for.lte.<now>)`,
//       so a draft is eligible only when scheduled_for IS NULL (non-scheduled / studio drafts — unchanged
//       today's behaviour, matching the enqueue cron's COALESCE(pd.scheduled_for, NOW())) OR its scheduled_for
//       has arrived; a future scheduled_for now WAITS instead of publishing early;
//   (b) a defensive per-row future-date skip at the top of the publish loop (release_gate_skip →
//       status='skipped_not_yet_scheduled') — defence-in-depth in case a future SELECT change lets one through,
//       mirroring the v1.12.0 platform-isolation per-row skip.
//   UNCHANGED / STRICTLY OUT OF SCOPE (byte-unchanged): the approval predicate IN ('approved','published'),
//   DEFAULT_PRIVACY_STATUS='public', platform isolation (.eq/skip), the no-YT-id guard, the pre-upload
//   reconcile guard, failure classification, bounded retry/backoff, channel auth-hold, the next-available
//   attempt_no audit fix, the 2/tick publish cap, the ELIGIBLE_FORMATS allow-list, and the asset backstop.
//   NO schema/DB change (scheduled_for is an existing m.post_draft column; SELECT-only read), NO new secret,
//   NO deploy in this change.
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
import { requireAssetPresent } from './asset_backstop.ts';

const VERSION = 'youtube-publisher-v1.17.0';
// v1.17.0 (2026-07-30) — S9 FINAL BOUNDARY: fail-closed channel-pause gate.
//   marker: youtube-publisher-s9-failclosed-pause-gate (grep-able in the deployed bundle).
//   CLOSES the last fail-open hole in the S9 arc, named by the architecture packet as an explicit
//   co-requirement for YouTube's containment release. The v1.8.0 paused_until preload was fail-OPEN
//   in TWO ways, and the second was worse than the documented one:
//     (1) it wrapped the read in `catch (_) {}`, swallowing throws; and
//     (2) it destructured ONLY `data`, never `error` — a PostgREST failure returns
//         { data: null, error } WITHOUT throwing, so the catch never fired either.
//   Either way the hold map ended up EMPTY, and an empty map read as "nobody is paused", so every
//   draft proceeded to the irreversible public upload. That is uniquely dangerous here because the
//   YouTube containment hold IS paused_until — a failed read of the hold was precisely the thing
//   that could let a paused channel publish.
//   NOW: buildPauseGate() returns an explicit per-client verdict and an ok verdict is REQUIRED to
//   proceed. DENY on: active pause · missing youtube profile row · read error · throw · non-array
//   payload · unparseable paused_until · absent verdict. Each DENY records a structured reason with
//   a `retryable` flag (transient read failure = retryable; missing profile = needs a human) and
//   NEVER consumes the draft — no claim, no approval change, no upload, no draft mutation — so the
//   next tick simply re-evaluates.
//   Checked at BOTH entry points: once per tick before the loop, and again as a FRESH read
//   immediately before the atomic pre-upload claim so a pause applied mid-tick still stops it.
//   SCOPE stated honestly: the CAPABILITY predicate is inside the atomic claim UPDATE (genuinely
//   atomic); the PAUSE lives on c.client_publish_profile which that UPDATE cannot join, so its
//   check is a fresh read immediately prior — window narrowed to the claim round-trip, not
//   mathematically eliminated. Closing it fully needs a claim-and-check RPC; recorded as a carry.
//   Unchanged: the v1.16.0 capability predicates (2 occurrences), the in-run pausedClients hold,
//   platform isolation, release-time gate, backoff, idempotency guards, the 2/tick cap.
// v1.16.0 (2026-07-29) — S9 CAPABILITY ENFORCEMENT, Objective 2 (publisher chokepoint).
//   marker: youtube-publisher-s9-capability-enforcement (grep-able in the deployed bundle).
//   Brief: docs/briefs/s9-publisher-enforcement-build-brief-v1.md
//   WHY YOUTUBE IS SPECIAL: every other publisher dequeues through m.publisher_lock_queue_v2, which
//   now carries a DB-side capability guard those three inherit for free. This publisher does a DIRECT
//   READ on m.post_draft and never touches that queue, so it needs its own enforcement — in TWO places,
//   because it has two entry points:
//     (1) the draft SELECT gains an exclusion on final_format_authority;
//     (2) the atomic pre-claim UPDATE — "the last guard before the irreversible public upload" — carries
//         the SAME predicate, closing the TOCTOU window between SELECT and claim. A cheap in-loop check
//         runs first so the ordinary case logs a precise reason; the claim predicate is what makes it safe.
//   NULL HANDLING IS LOAD-BEARING: the filter is `.or(is.null, neq)`, never a bare `.neq`. NULL is the
//   normal state for a healthy draft, and PostgREST `neq` does not match NULL, so a bare neq would have
//   silently stopped ALL YouTube publishing.
//   Blocked drafts are skipped, never mutated: no video_status change, no approval_status change, no
//   publish-failure status — capability blocking stays distinct from render/approval/publish failure.
const S9_PUBLISHER_MARKER = 'youtube-publisher-s9-capability-enforcement';
const CAPABILITY_BLOCKED = 'blocked_by_capability';
const S9_PAUSE_GATE_MARKER = 'youtube-publisher-s9-failclosed-pause-gate';

// ── S9 — FAIL-CLOSED CHANNEL-PAUSE GATE (v1.17.0) ────────────────────────────
// Replaces the v1.8.0 "best-effort" paused_until preload, which was fail-OPEN in two
// distinct ways — and the second was the more dangerous:
//   1. it wrapped the read in `catch (_) {}`, swallowing any throw; and
//   2. it destructured ONLY `data` (`const { data: profs } = await …`), never `error`.
//      A PostgREST failure returns { data: null, error } WITHOUT throwing, so the catch
//      never fired either. Both paths left the hold map EMPTY, and an empty map means
//      "nobody is paused" ⇒ every draft proceeded to the irreversible public upload.
// That mattered more here than anywhere else in ICE, because the YouTube containment
// hold IS `paused_until` — so a failed read of the hold was exactly the thing that
// could let a paused channel publish.
//
// This gate is fail-CLOSED and returns an explicit per-client verdict:
//   * successful read, no active pause          -> ok        (may proceed)
//   * successful read, pause active             -> DENY channel_paused_until:<iso>
//   * client has no youtube profile row         -> DENY pause_profile_missing
//   * read error / throw / unrecognised payload  -> DENY pause_preload_read_error|threw|…
//   * unparseable paused_until value            -> DENY pause_unparseable:<raw>
// A DENY is recorded as a structured reason and NEVER consumes the draft: no claim, no
// approval change, no upload, no draft mutation of any kind — so the next tick simply
// re-evaluates it. `retryable` distinguishes transient causes (read error/timeout, worth
// an automatic retry) from configuration causes (missing profile row, which needs a human).
export type PauseVerdict = { ok: true } | { ok: false; reason: string; retryable: boolean };

export async function buildPauseGate(
  supabase: ReturnType<typeof getServiceClient>,
  clientIds: string[],
  nowMs: number,
): Promise<Map<string, PauseVerdict>> {
  const gate = new Map<string, PauseVerdict>();
  const ids = [...new Set(clientIds)].filter((x) => !!x);
  if (ids.length === 0) return gate;

  const denyAll = (reason: string, retryable: boolean) => {
    for (const id of ids) gate.set(id, { ok: false, reason, retryable });
    return gate;
  };

  let rows: any[];
  try {
    const { data, error } = await supabase.schema('c').from('client_publish_profile')
      .select('client_id, paused_until').eq('platform', 'youtube').in('client_id', ids);
    if (error) {
      console.error(`[youtube-publisher] ${S9_PAUSE_GATE_MARKER} pause read ERROR -> denying all ${ids.length} client(s)`, { code: error.code, message: error.message });
      return denyAll(`pause_preload_read_error:${error.code ?? ''}:${(error.message ?? '').slice(0, 200)}`, true);
    }
    if (!Array.isArray(data)) {
      console.error(`[youtube-publisher] ${S9_PAUSE_GATE_MARKER} pause read returned a non-array payload -> denying all`);
      return denyAll('pause_preload_unrecognised_payload', true);
    }
    rows = data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[youtube-publisher] ${S9_PAUSE_GATE_MARKER} pause read THREW -> denying all ${ids.length} client(s)`, { message: msg });
    return denyAll(`pause_preload_threw:${msg.slice(0, 200)}`, true);
  }

  const byClient = new Map<string, any>();
  for (const r of rows) if (r && r.client_id) byClient.set(r.client_id, r);

  for (const id of ids) {
    const row = byClient.get(id);
    if (!row) {
      // Absence of a row is NOT permission. The old code silently treated it as "not paused".
      gate.set(id, { ok: false, reason: 'pause_profile_missing', retryable: false });
      continue;
    }
    const raw = row.paused_until;
    if (raw !== null && raw !== undefined) {
      const t = new Date(raw).getTime();
      if (!Number.isFinite(t)) {
        gate.set(id, { ok: false, reason: `pause_unparseable:${String(raw).slice(0, 60)}`, retryable: true });
        continue;
      }
      if (t > nowMs) {
        gate.set(id, { ok: false, reason: `channel_paused_until:${new Date(t).toISOString()}`, retryable: true });
        continue;
      }
      // a pause that has EXPIRED is not an active pause -> fall through to ok
    }
    gate.set(id, { ok: true });
  }
  return gate;
}

// An absent verdict is itself a denial — never default to "allowed".
export function pauseVerdictFor(
  gate: Map<string, PauseVerdict>, clientId: string,
): PauseVerdict {
  return gate.get(clientId) ?? { ok: false, reason: 'pause_gate_absent', retryable: true };
}
// v1.15.0 (2026-07-27, F-YT-PUBLISH-CLAIM) — close the concurrent-double-PUBLIC-publish race with an
//   ATOMIC single-row claim immediately before uploadToYouTube. The existing m.post_publish idempotency
//   reconcile guard only catches a COMPLETED prior publish (a landed row), NOT a CONCURRENT one: two
//   invocations on the same tick both pass every guard and both upload -> duplicate PUBLIC video.
//   v1.15.0 adds, as the LAST guard before the irreversible upload, a guarded UPDATE that stamps
//   draft_format.yt_publish_claim_at ONLY if the draft is still video_status='generated', unpublished
//   (draft_format->youtube_video_id IS NULL) and unclaimed (or the prior claim is stale >
//   YT_PUBLISH_CLAIM_TTL_MIN). Under READ COMMITTED the loser's WHERE re-evaluates after the winner
//   commits -> 0 rows -> it yields (status='skipped_publish_claim_lost'). The marker is
//   draft_format.yt_publish_claim_at (ISO-8601-Z; lexicographic == chronological); video_status STAYS
//   'generated' so the whole retry/auth/quota/pause/release state machine is BYTE-UNCHANGED. The marker
//   is auto-dropped by EVERY downstream draft_format rebuild from the pre-claim `df` (no explicit clear
//   is added anywhere). Crash-before-upload self-heals via the 15-min stale reclaim; crash-after-upload
//   is covered by the existing idempotency guard (never re-uploads). STRICTLY OUT OF SCOPE /
//   byte-unchanged: the draft SELECT, platform isolation, the release-time gate, channel-pause, the
//   idempotency reconcile guard, the no-video / backstop guards, uploadToYouTube, the success path, ALL
//   retry lanes (auth/quota/transient/terminal) + their constants, classifyYouTubeFailure, the
//   attempt_no audit, MAX_PUBLISHES_PER_TICK. NO DB/DDL/DML, NO new secret, NO status-machine change,
//   NO deploy in this change. Entrypoint VERSION bump covers the drift-gate reclass.
// v1.13.0 (2026-06-17) — UNIFORM FINAL-ASSERTION BACKSTOP + explicit no-video guard
//   (Lane A). Adds (a) an explicit `!draft.video_url` skip immediately before the
//   video download/upload (records skipped:no_video_url, continues), and (b) the
//   shared requireAssetPresent (./asset_backstop.ts) as a final defence-in-depth
//   assertion before upload. CRITICAL: youtube-publisher uses approval_status as a
//   CROSS-PLATFORM field gated IN ('approved','published') (v1.9.0) and uses
//   video_status (not approval_status) as its YT publish marker — so the backstop is
//   called with allowPublishedApproval:true to NOT regress drafts already published
//   elsewhere. video_status is ADDED to the SELECT column list only; the existing
//   .eq('video_status','generated') filter and .in('approval_status',
//   ['approved','published']) predicate are byte-unchanged. STRICTLY OUT OF SCOPE:
//   the select predicates, platform isolation, DEFAULT_PRIVACY_STATUS=public, the
//   no-YT-id / pre-upload reconcile guards, retry/backoff, attempt_no audit, 2/tick
//   cap — all byte-unchanged; no schema/DB change; no T2; no historical remediation.
const YOUTUBE_TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status';

// --- v1.8.0 hardening knobs ---
const MAX_YT_UPLOAD_ATTEMPTS = 5;    // transient failures terminalise at this many attempts
const YT_RETRY_BACKOFF_MIN   = 30;   // standard transient backoff (minutes)
const YT_QUOTA_BACKOFF_MIN    = 360; // quota = park 6h, NOT counted (YouTube quota is project/day-wide)
const YT_AUTH_PAUSE_HOURS     = 6;   // channel hold on auth failure (best-effort persist)
const MAX_PUBLISHES_PER_TICK  = 2;   // preserve existing publish cadence
const YT_PUBLISH_CLAIM_TTL_MIN = 15; // v1.15.0 F-YT-PUBLISH-CLAIM: stale-claim reclaim window (min)
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
  // v1.14.0 (F-YT-RELEASE-CONTROL): compute the release cutoff once, then gate the SELECT so a draft is
  //   only eligible when scheduled_for IS NULL (non-scheduled / studio drafts — today's behaviour) OR
  //   scheduled_for <= now (its authorised release time has arrived). NULL preserves the pre-v1.14.0 path,
  //   matching the enqueue cron's COALESCE(pd.scheduled_for, NOW()); a future scheduled_for now waits.
  // v1.16.0 (S9 OBJECTIVE 2 — ENTRY PATH 1 of 2, marker youtube-publisher-s9-capability-enforcement): exclude
  // capability-blocked drafts. This publisher BYPASSES m.publisher_lock_queue_v2 entirely (direct
  // read), so the shared DB-side dequeue guard that protects facebook/instagram/linkedin cannot see
  // it — YouTube needs its own exclusion here AND a re-check at the claim below.
  // `.or(is.null, neq)` is deliberate: a plain `.neq` would drop rows where the column IS NULL,
  // which is the NORMAL state for every healthy draft, so a bare neq would silently stop all
  // YouTube publishing. NULL means "never classified" and must remain eligible.
  const releaseCutoff = nowIso();
  const { data: drafts } = await supabase.schema('m').from('post_draft')
    .select('post_draft_id, platform, client_id, draft_title, draft_body, recommended_format, video_url, video_status, draft_format, approval_status, scheduled_for, final_format_authority')
    .eq('platform', 'youtube')
    .eq('video_status', 'generated')
    .in('approval_status', ['approved', 'published'])
    .is('draft_format->youtube_video_id', null)
    .not('video_url', 'is', null)
    .in('recommended_format', ELIGIBLE_FORMATS)
    .or(`scheduled_for.is.null,scheduled_for.lte.${releaseCutoff}`)
    .or(`final_format_authority.is.null,final_format_authority.neq.${CAPABILITY_BLOCKED}`)
    .limit(SELECT_LIMIT);

  // v1.17.0 (youtube-publisher-s9-failclosed-pause-gate) — FAIL-CLOSED channel-pause gate.
  // Was v1.8.0's "best-effort" preload, which was fail-OPEN: it swallowed throws AND never
  // read `error`, so any failure produced an empty hold map, and an empty map meant nobody
  // was paused. Correctness now DOES depend on this read succeeding — by design.
  const pauseGate = await buildPauseGate(supabase, (drafts ?? []).map((d: any) => d.client_id), Date.now());

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

    // v1.14.0 (F-YT-RELEASE-CONTROL) defence-in-depth: never publish a future-dated draft even if a future
    // SELECT change or code path lets one through. The .or() release gate above is the guarantee; this is
    // the belt-and-braces per-row re-check (mirrors the v1.12.0 platform-isolation skip pattern).
    if (draft.scheduled_for && new Date(draft.scheduled_for).getTime() > Date.now()) {
      console.log(`[youtube-publisher] release_gate_skip post_draft_id=${draft.post_draft_id} scheduled_for=${draft.scheduled_for}`);
      results.push({ post_draft_id: draft.post_draft_id, status: 'skipped_not_yet_scheduled', scheduled_for: draft.scheduled_for });
      continue;
    }

    // ── ENTRY PATH 1 — channel hold, now FAIL-CLOSED (v1.17.0) ────────────────
    // in-run hold (set on a channel auth failure later in this same tick) is unchanged
    if (pausedClients.has(draft.client_id)) {
      results.push({ post_draft_id: draft.post_draft_id, status: 'skipped_channel_paused', reason: 'in_run_channel_hold' });
      continue;
    }
    // persistent hold: an ok verdict is REQUIRED to proceed. Anything else — active pause,
    // missing profile row, read error, unparseable value, or an absent verdict — stops here,
    // BEFORE the atomic claim, so the draft is never consumed, approved or uploaded.
    const pv = pauseVerdictFor(pauseGate, draft.client_id);
    if (!pv.ok) {
      console.warn(`[youtube-publisher] ${S9_PAUSE_GATE_MARKER} DENY post_draft_id=${draft.post_draft_id} client=${draft.client_id} reason=${pv.reason} retryable=${pv.retryable}`);
      results.push({
        post_draft_id: draft.post_draft_id,
        status: 'skipped_channel_pause_gate',
        reason: pv.reason,
        retryable: pv.retryable,
      });
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

    // v1.13.0: EXPLICIT no-video guard — never attempt a YT upload without a source
    // URL. Also covered by the backstop below, but kept explicit per Lane A brief.
    if (!draft.video_url) {
      console.log(`[youtube-publisher] skipped:no_video_url post_draft_id=${draft.post_draft_id}`);
      results.push({ post_draft_id: draft.post_draft_id, status: 'skipped', reason: 'no_video_url' });
      continue;
    }

    // v1.13.0: UNIFORM FINAL-ASSERTION BACKSTOP — last defence-in-depth gate before
    // the upload, AFTER the select predicates / platform isolation / reconcile guard
    // (all unchanged). allowPublishedApproval:true because YT gates approval_status
    // IN ('approved','published') as a cross-platform field. On publish:false →
    // skip + continue (the row is left for the next selection; no DB mutation here so
    // the existing video_status='generated' selection still governs re-pickup).
    {
      const backstop = requireAssetPresent(
        { recommended_format: draft.recommended_format, draft_format: draft.draft_format, video_url: draft.video_url, video_status: draft.video_status, approval_status: draft.approval_status },
        { allowPublishedApproval: true },
      );
      if (!backstop.publish) {
        console.log(`[youtube-publisher] backstop skipped:${backstop.reason} post_draft_id=${draft.post_draft_id} format=${draft.recommended_format}`);
        results.push({ post_draft_id: draft.post_draft_id, status: 'skipped', reason: `backstop:${backstop.reason}` });
        continue;
      }
    }

    // v1.15.0 (F-YT-PUBLISH-CLAIM): ATOMIC single-row claim — the LAST guard before the irreversible
    // public upload. Two concurrent invocations both pass the guards above (the idempotency check only
    // catches a COMPLETED prior publish, not a concurrent one) and would both upload -> duplicate PUBLIC
    // video. This guarded UPDATE stamps draft_format.yt_publish_claim_at ONLY if the draft is still
    // 'generated', unpublished, and unclaimed (or the prior claim is stale > YT_PUBLISH_CLAIM_TTL_MIN).
    // Under READ COMMITTED the loser's WHERE re-evaluates after the winner commits -> 0 rows -> it yields.
    // video_status stays 'generated'; the marker is auto-dropped by every downstream draft_format rebuild
    // from `df`. Timestamps are ISO-8601-Z (lexicographic == chronological).
    // v1.16.0 (S9 OBJECTIVE 2 — ENTRY PATH 2 of 2): capability re-check at the claim.
    // (i) Cheap check on the row already read, so the ordinary case logs a precise reason.
    if (draft.final_format_authority === CAPABILITY_BLOCKED) {
      console.log(`[youtube-publisher] ${S9_PUBLISHER_MARKER} skipped:capability_blocked post_draft_id=${draft.post_draft_id} format=${draft.recommended_format}`);
      results.push({ post_draft_id: draft.post_draft_id, status: 'skipped', reason: 'capability_blocked' });
      continue;
    }

    // ── ENTRY PATH 2 — FRESH fail-closed pause re-read immediately before the claim ──
    // The tick-level gate above was read once, potentially many drafts (and many seconds)
    // ago. Re-read THIS client's hold immediately before the irreversible claim so a pause
    // applied mid-tick still stops it. Fail-closed on every non-ok verdict, and again
    // BEFORE the claim, so nothing is consumed.
    // SCOPE, stated honestly: the CAPABILITY predicate is carried INSIDE the atomic claim
    // UPDATE below, so it is genuinely atomic. The PAUSE lives on c.client_publish_profile,
    // which a PostgREST UPDATE on m.post_draft cannot join, so the pause check is a fresh
    // read taken immediately prior rather than part of the same statement. That narrows the
    // window to the claim round-trip; it does not mathematically eliminate it. Closing it
    // fully would need an RPC that claims and checks the hold in one statement — recorded
    // as a carry, not silently claimed as atomic.
    const freshPause = pauseVerdictFor(
      await buildPauseGate(supabase, [draft.client_id], Date.now()),
      draft.client_id,
    );
    if (!freshPause.ok) {
      console.warn(`[youtube-publisher] ${S9_PAUSE_GATE_MARKER} DENY at pre-claim post_draft_id=${draft.post_draft_id} reason=${freshPause.reason}`);
      results.push({
        post_draft_id: draft.post_draft_id,
        status: 'skipped_channel_pause_gate_preclaim',
        reason: freshPause.reason,
        retryable: freshPause.retryable,
      });
      continue;
    }

    const claimStaleCutoff = futureIso(-YT_PUBLISH_CLAIM_TTL_MIN * 60 * 1000);
    const { data: claimRows, error: claimErr } = await supabase.schema('m').from('post_draft')
      .update({ draft_format: { ...df, yt_publish_claim_at: nowIso() }, updated_at: nowIso() })
      .eq('post_draft_id', draft.post_draft_id)
      .eq('video_status', 'generated')
      .is('draft_format->youtube_video_id', null)
      // (ii) TOCTOU closure: the SELECT above and check (i) both ran BEFORE this claim, so a draft
      // blocked in the interval would still reach the irreversible upload. Carrying the predicate
      // INSIDE the atomic claim UPDATE means a draft blocked between SELECT and claim yields 0 rows
      // and the loop yields — exactly the pattern this file already uses for video_status and the
      // youtube_video_id guard, extended to capability.
      .or(`final_format_authority.is.null,final_format_authority.neq.${CAPABILITY_BLOCKED}`)
      .or(`draft_format->>yt_publish_claim_at.is.null,draft_format->>yt_publish_claim_at.lt.${claimStaleCutoff}`)
      .select('post_draft_id');
    if (claimErr) {
      console.error(`[youtube-publisher] publish_claim_error post_draft_id=${draft.post_draft_id}: ${claimErr.message}`);
      results.push({ post_draft_id: draft.post_draft_id, status: 'skipped_publish_claim_error' });
      continue;
    }
    if (!claimRows?.length) {
      console.log(`[youtube-publisher] publish_claim_lost post_draft_id=${draft.post_draft_id} (another invocation is publishing this draft)`);
      results.push({ post_draft_id: draft.post_draft_id, status: 'skipped_publish_claim_lost' });
      continue;
    }

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
