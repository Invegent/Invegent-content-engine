// heygen-worker v2.2.0
// v2.5.0 — cc-0083 Slice B: ROLE-REQUESTED DEFAULT-HOST FALLBACK. cc-0083-marker:
//          heygen-worker-cc0083-role-fallback-default-host. When a stakeholder_role IS requested
//          (ai-worker v2.23.0 now promotes a clear/confident role into video_script.stakeholder_role)
//          but no active avatar carries it, runSubmitPhase no longer fails closed: it RE-RESOLVES
//          role-less (lookupAvatar(supabase, clientId, null, renderStyle)); if that yields
//          default_host|primary_fallback|undesignated_tiebreak it uses that host (sets talkingPhotoId,
//          voiceId, avatarSelectedBy) and flags roleFallbackToDefaultHost=true. Only a genuinely-no-
//          avatar client (default host ALSO missing) still hard-fails no_eligible_avatar. When NO role
//          was requested, the no_eligible_avatar hard-fail is UNCHANGED. The 'resolution_failed'
//          branch is UNCHANGED (a query error never masquerades as a fallback). Telemetry: the
//          submit-time avatar_identity object gains requested_stakeholder_role (string|null) and
//          role_fallback_to_default_host (boolean). STRICTLY OUT OF SCOPE: NO lookupAvatar SQL/order
//          change · NO migration/DB object · NO new interpolation · the preset short-circuit
//          precedence UNCHANGED · poller/dashboard display UNTOUCHED (§6) · ai-worker not edited here.
//          (cc-0083-sliceB: role-requested-default-host-fallback)
// v2.4.1 — cc-0063 STEP B: GOVERNED-HOST-DESIGNATION-RESOLVER. Make the LIVE avatar resolver
//          CONSUME the governed host designation step A wrote. lookupAvatar now (a) SELECTs
//          ba.is_default_host, ba.is_primary, (b) applies the PK-ruled TOTAL order
//          `ORDER BY ba.is_default_host DESC, ba.is_primary DESC, ba.created_at ASC,
//          ba.brand_avatar_id ASC` (rank-1 "explicit governed assignment" is a RESERVED,
//          currently-inapplicable position — no such column exists — intentionally absent),
//          (c) changes `is_active = true` → `is_active IS TRUE` (nullable column; both exclude
//          NULL identically), (d) CHECKS the exec_sql `error` (the `:92` repair — a failed query
//          can no longer be reported as "no avatar"), and (e) returns a DISCRIMINATED UNION
//          {default_host|primary_fallback|undesignated_tiebreak | no_eligible_avatar |
//          resolution_failed} instead of a bare row-or-null. The reason code is derived testing
//          `is_default_host` FIRST per §1.4 — this INTENTIONALLY DIVERGES from
//          public.resolve_and_record_avatar_shadow (is_primary-first): is_default_host outranks
//          is_primary by PK ruling; the shadow resolver is SUPERSEDED ON ORDERING — a CARRY, NOT
//          an edit (its SQL is untouched). runSubmitPhase branches on the four outcomes; the two
//          failure outcomes call markFailed with a STRUCTURED `avatar_resolution_outcome`
//          ('no_eligible_avatar' vs 'resolution_failed') alongside the human heygen_error string,
//          so cases 3 and 4 are queryable apart without parsing text (R-B). avatarSelectedBy union
//          widened to default_host|primary_fallback|undesignated_tiebreak|preset (role_filter/
//          fallback_limit1 retired from EMISSION; historical stored values untouched, :259's
//          runtime compare still reads old rows). VERSION v2.4.1 (NOT v2.4.0 — heygen-worker was
//          rolled back FROM a v2.4.0 during cc-0052; a fresh, never-deployed string keeps the
//          drift/deploy-verifier VERSION bookkeeping unambiguous). STRICTLY OUT OF SCOPE: NO
//          migration / NO new DB object · NO new string interpolation (still only clientId,
//          renderStyle, stakeholderRole) · the `:427` preset short-circuit precedence UNCHANGED ·
//          the `:455` brand-profile error-discard site UNTOUCHED (different function) · the
//          compliance loader UNTOUCHED · ai-worker UNTOUCHED · no avatar activation / no step C ·
//          no shadow-flag flip. (cc-0063-step-b: governed-host-designation-resolver)
// v2.3.0 — QA-VISIBILITY-V0: ADDITIVE / OBSERVABILITY-ONLY. Add a normalized `qa` object
//          (engine='heygen', render_mode='identity', duration_semantics=
//          'submit_to_poll_detection') INTO the existing writeRenderLog render_spec, built
//          via the new pure, fail-safe module ./qa.ts (buildRenderQa + safeQa). All existing
//          render_spec fields (provider/provider_job_id/avatar_identity/etc.) are preserved.
//          An optional opts.failureStage threads the terminal stage from the 4 callers
//          (success → null; download/store catch → 'download_store'; provider-render-failed →
//          'render'; stale-timeout → 'timeout'). STRICTLY OUT OF SCOPE: no migration, no
//          provider call added, no secret access, no file-size/dimension probe (file_size_bytes
//          stays null; dimension read from existing fmt.render_dimension), no change to
//          markGenerated/markFailed/poll/submit/shadow/selection/publish logic, p_render_engine
//          unchanged ('heygen'), no publish-blocking verdict. (QA-VISIBILITY-V0)
// v2.2.0 — AGP-D01-3 AVATAR-SHADOW-RESOLVER-TELEMETRY: shadow-only, additive, FLAG-GATED (default OFF).
//          After runSubmitPhase resolves the LIVE avatar pick (lookupAvatar fallback/role OR the
//          preset branch), and ONLY when env AVATAR_SHADOW_TELEMETRY is truthy, fire-and-best-effort
//          call the typed RPC public.resolve_and_record_avatar_shadow with the ACTUAL live pick
//          (p_live_avatar_id/voice/selected_by) so the shadow resolver can re-derive a deterministic
//          pick and record drift telemetry into r.avatar_resolution_shadow. FAIL-OPEN: any RPC error
//          is swallowed (console.error) — the render proceeds byte-identically. The shadow result is
//          NEVER read back and NEVER influences selection. lookupAvatar and the live selection/submit
//          path are UNCHANGED (byte-identical). Uses the existing service-role client and a typed
//          .rpc (NOT exec_sql). STRICTLY OUT OF SCOPE: no avatar activation, no A2 pin change, no
//          brand_avatar marker backfill, no stakeholder_role logic change, no Branch B, no write to
//          c.brand_avatar or any selection state. The migration (table + RPC) is a separate gated apply.
// v2.1.1 — F-HEYGEN-AVATAR-IDENTITY-TELEMETRY: observability-only. Capture the ACTUAL avatar identity
//          selected at SUBMIT time (talking_photo_id, voice_id, render_style, stakeholder_role,
//          avatar_selected_by ∈ {role_filter | fallback_limit1 | preset}) into draft_format.avatar_identity
//          via the existing markRendering `extra` object, then COPY it verbatim (NO re-derivation,
//          NO reselection) into post_render_log.render_spec.avatar_identity at the terminal poll
//          outcome via writeRenderLog. Records WHICH avatar was used. Does NOT change avatar selection,
//          HeyGen payload semantics, rendering, publishing, routing, scheduling, or business logic.
//          NO new HeyGen API call, NO schema change, NO migration, NO RPC change. avatar_identity is
//          null for pre-v2.1.1 in-flight drafts (no backfill). Role-aware selection + multi-avatar
//          dialogue remain OUT OF SCOPE.
// v2.1.0 — F-HEYGEN-RENDER-TELEMETRY: telemetry-only. Mirror each TERMINAL render outcome
//          (succeeded | failed | timeout) into m.post_render_log via the existing engine-agnostic
//          public.write_render_log RPC (render_engine='heygen'). Closes the gap where HeyGen renders
//          were invisible in post_render_log (which was Creatomate-only). Best-effort + idempotent
//          (per post_draft_id + provider_job_id); adds NO new HeyGen API calls (logs data already
//          fetched); logs NO secrets/keys/headers; NEVER fails the render lifecycle. credits_used
//          stays null (per-render cost is not exposed by the HeyGen API). Provider job id + submitted/
//          completed timestamps + dimension/style live in render_spec; render_duration_ms is the
//          submitted->completed wall-clock. No schema change. Submit-phase (pre-render) failures are
//          intentionally NOT logged here (no provider_job_id yet; out of the terminal-outcome scope).
// v2.0.0 — F-HEYGEN-WORKER-ASYNC-RENDER: async two-phase render lifecycle. Submit (Phase A) and
//          poll (Phase B) are decoupled across cron ticks so no single invocation waits for the full
//          HeyGen render — removes the synchronous in-request poll loop that died at the Supabase EF
//          ~150s request limit. State machine: pending -> rendering -> generated|failed. Persists
//          heygen_video_id at submit (no resubmit / no duplicate render); raw HeyGen error JSON on failure.
// v1.3.0 — F-HEYGEN-WORKER-POLL-BUDGET: extend HeyGen polling window to 240s (30 × 8s) — superseded by v2.0.0.
// v1.2.0 — F-HEYGEN-WORKER-LANDSCAPE-DIMENSION: portrait 720x1280 render for Shorts-native avatar output.
// v1.1.0 — Fix: also read stakeholder_role and render_style from draft_format.video_script
//          (ai-worker writes via set_draft_video_script which nests inside video_script)

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildRenderQa, safeQa } from './qa.ts';  // v2.3.0: QA-VISIBILITY-V0 (additive)

const VERSION             = 'heygen-worker-v2.5.0';  // cc-0083-sliceB: role-requested-default-host-fallback
const HEYGEN_GENERATE     = 'https://api.heygen.com/v2/video/generate';
const HEYGEN_STATUS       = 'https://api.heygen.com/v1/video_status.get';
const MAX_SUBMITS         = 3;                // Phase A: pending drafts to submit per tick
const MAX_POLLS           = 5;                // Phase B: rendering drafts to check per tick
const STALE_RENDER_MAX_MS = 30 * 60 * 1000;  // 30 min: a rendering draft older than this is failed
const RENDER_DIMENSION    = '720x1280';       // 9:16 portrait — YouTube Shorts native (F-HEYGEN-WORKER-LANDSCAPE-DIMENSION)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-heygen-worker-key',
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

type Supa = ReturnType<typeof getServiceClient>;

// cc-0063 Step B: consume the governed host designation. PK-ruled TOTAL order is
//   1 explicit governed assignment (RESERVED — no such column exists today; intentionally
//     ABSENT from the ORDER BY so a future key slots in above designation without renumbering),
//   2 is_default_host DESC  (the governed designation — LIVE, load-bearing),
//   3 is_primary DESC       (secondary fallback only — currently inert),
//   4 created_at ASC, brand_avatar_id ASC  (deterministic tie-breakers — total order, never ties).
// The reason code is derived testing is_default_host FIRST (§1.4). This INTENTIONALLY DIVERGES
// from public.resolve_and_record_avatar_shadow (is_primary-first) — is_default_host outranks
// is_primary by PK ruling; the shadow resolver is SUPERSEDED ON ORDERING, a carry not an edit
// (its applied SQL is untouched). The exec_sql `error` is CHECKED (the :92 repair): a failed
// query returns 'resolution_failed', NEVER a false 'no_eligible_avatar'. No new interpolation —
// the only interpolated values remain clientId, renderStyle, stakeholderRole.
export type AvatarResolution =
  | { outcome: 'default_host' | 'primary_fallback' | 'undesignated_tiebreak';
      talking_photo_id: string; voice_id: string | null }
  | { outcome: 'no_eligible_avatar' }
  | { outcome: 'resolution_failed'; error_detail: string };

export async function lookupAvatar(
  supabase: Supa,
  clientId: string,
  stakeholderRole: string | null,
  renderStyle: string,
): Promise<AvatarResolution> {
  const { data: rows, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT ba.heygen_avatar_id, ba.heygen_voice_id, ba.is_default_host, ba.is_primary
      FROM c.brand_avatar ba
      JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
      WHERE ba.client_id = '${clientId}'
        AND ba.is_active IS TRUE
        AND ba.render_style = '${renderStyle}'
        ${stakeholderRole ? `AND bs.role_code = '${stakeholderRole}'` : ''}
      ORDER BY ba.is_default_host DESC, ba.is_primary DESC, ba.created_at ASC, ba.brand_avatar_id ASC
      LIMIT 1
    `,
  });
  if (error) return { outcome: 'resolution_failed', error_detail: (error.message ?? String(error)).slice(0, 500) };
  const row = (rows as any)?.[0];
  if (!row?.heygen_avatar_id) return { outcome: 'no_eligible_avatar' };
  const outcome = row.is_default_host ? 'default_host'
                : row.is_primary      ? 'primary_fallback'
                :                        'undesignated_tiebreak';
  return { outcome, talking_photo_id: row.heygen_avatar_id, voice_id: row.heygen_voice_id ?? null };
}

// --- HeyGen calls -----------------------------------------------------------

async function submitHeyGenJob(opts: {
  apiKey: string; talkingPhotoId: string; voiceId: string;
  narrationText: string; bgColour?: string;
}): Promise<string> {
  const { apiKey, talkingPhotoId, voiceId, narrationText, bgColour = '#F0F4F8' } = opts;
  const payload = {
    video_inputs: [{
      character: { type: 'talking_photo', talking_photo_id: talkingPhotoId },
      voice: { type: 'text', input_text: narrationText, voice_id: voiceId, speed: 1.0 },
      background: { type: 'color', value: bgColour },
    }],
    dimension: { width: 720, height: 1280 },   // 9:16 portrait — YouTube Shorts native
  };
  const resp = await fetch(HEYGEN_GENERATE, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) throw new Error(`HeyGen submit failed (${resp.status}): ${JSON.stringify(data.error ?? data).slice(0, 400)}`);
  const videoId = data.data?.video_id;
  if (!videoId) throw new Error('No video_id in HeyGen response');
  return videoId;
}

type HeyGenStatus =
  | { state: 'completed'; videoUrl: string }
  | { state: 'processing' }
  | { state: 'failed'; rawError: unknown };

// Single non-blocking status check. Throws on a transient/HTTP error so the caller
// leaves the draft 'rendering' and retries on the next tick (never auto-fails on a blip).
async function pollOnce(apiKey: string, videoId: string): Promise<HeyGenStatus> {
  const resp = await fetch(`${HEYGEN_STATUS}?video_id=${videoId}`, { headers: { 'X-Api-Key': apiKey } });
  if (!resp.ok) throw new Error(`status_get http ${resp.status}`);
  const data = await resp.json();
  const status   = data?.data?.status;
  const videoUrl = data?.data?.video_url;
  if (status === 'completed' && videoUrl) return { state: 'completed', videoUrl };
  if (status === 'failed')                return { state: 'failed', rawError: data?.data?.error ?? data };
  return { state: 'processing' };  // pending / processing / waiting / unknown → still rendering
}

async function downloadAndStore(supabase: Supa, heygenVideoUrl: string, storagePath: string): Promise<string> {
  const dlResp = await fetch(heygenVideoUrl);
  if (!dlResp.ok) throw new Error(`HeyGen download failed: ${dlResp.status}`);
  const buffer = await dlResp.arrayBuffer();
  const { error } = await supabase.storage.from('post-videos').upload(storagePath, buffer, { contentType: 'video/mp4', upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/post-videos/${storagePath}`;
}

// --- DB state transitions ---------------------------------------------------

async function markRendering(supabase: Supa, draftId: string, fmt: any, heygenVideoId: string, submittedAt: string, extra: Record<string, unknown> = {}) {
  await supabase.schema('m').from('post_draft').update({
    video_status: 'rendering',
    draft_format: { ...fmt, heygen_video_id: heygenVideoId, heygen_submitted_at: submittedAt, render_dimension: RENDER_DIMENSION, ...extra },
    updated_at: nowIso(),
  }).eq('post_draft_id', draftId);
}

async function markGenerated(supabase: Supa, draftId: string, fmt: any, storageUrl: string, heygenVideoUrl: string) {
  await supabase.schema('m').from('post_draft').update({
    video_url: storageUrl,
    video_status: 'generated',
    draft_format: { ...fmt, heygen_video_url: heygenVideoUrl, video_url: storageUrl, rendered_at: nowIso() },
    updated_at: nowIso(),
  }).eq('post_draft_id', draftId);
}

async function markFailed(supabase: Supa, draftId: string, fmt: any, errFields: Record<string, unknown>) {
  await supabase.schema('m').from('post_draft').update({
    video_status: 'failed',
    draft_format: { ...fmt, ...errFields, heygen_failed_at: nowIso() },
    updated_at: nowIso(),
  }).eq('post_draft_id', draftId);
}

// --- Telemetry-only: mirror the render outcome into m.post_render_log -------
// Best-effort, idempotent, observational. Reuses the existing engine-agnostic
// public.write_render_log SECURITY DEFINER RPC (the same writer the Creatomate
// workers use). NEVER throws into the render lifecycle. Adds NO HeyGen API calls.
// Logs no secrets. credits_used is null (cost not exposed by the HeyGen API).
async function writeRenderLog(
  supabase: Supa,
  draft: { post_draft_id: string; client_id: string | null; draft_format: any },
  opts: { status: 'succeeded' | 'failed' | 'timeout'; providerJobId: string | null; outputUrl?: string | null; storageUrl?: string | null; errorMessage?: string | null; failureStage?: string | null },
): Promise<void> {
  const draftId = draft.post_draft_id;
  try {
    const fmt = draft.draft_format ?? {};
    const { status, providerJobId, outputUrl = null, storageUrl = null, errorMessage = null, failureStage = null } = opts;

    // Idempotency: skip if a HeyGen row already exists for this draft + provider job id.
    if (providerJobId) {
      const { data: existing } = await supabase.schema('m').from('post_render_log')
        .select('render_log_id, render_spec')
        .eq('post_draft_id', draftId)
        .eq('render_engine', 'heygen');
      const dup = (existing ?? []).some((r: any) => r?.render_spec?.provider_job_id === providerJobId);
      if (dup) {
        console.log(`[heygen-worker] render_log skip (already logged) ${draftId} job=${providerJobId}`);
        return;
      }
    }

    const submittedIso: string | null = fmt.heygen_submitted_at ?? null;
    const submittedMs = submittedIso ? (Date.parse(submittedIso) || 0) : 0;
    const durationMs = submittedMs ? (Date.now() - submittedMs) : null;
    const renderStyle: string | null = fmt.render_style ?? fmt.video_script?.render_style ?? null;

    // v2.1.1 (observability-only): copy the avatar identity captured at SUBMIT time
    // (draft_format.avatar_identity). Pure copy — poll NEVER re-derives or reselects the avatar.
    // Null for pre-v2.1.1 in-flight drafts (no backfill).
    const avatarIdentity = fmt.avatar_identity ?? null;

    const renderSpec = {
      provider: 'heygen',
      provider_job_id: providerJobId,
      submitted_at: submittedIso,
      completed_at: nowIso(),
      render_dimension: fmt.render_dimension ?? RENDER_DIMENSION,
      render_style: renderStyle,
      avatar_identity: avatarIdentity,
      telemetry_source: VERSION,
      // v2.3.0 (QA-VISIBILITY-V0): additive normalized render-QA. All inputs are
      // already-in-scope render facts — no probe, no fetch, no secret read.
      qa: safeQa(() => buildRenderQa({
        expected_format: 'video_short_avatar',
        engine: 'heygen', render_mode: 'identity',
        provider_job_id_present: !!providerJobId,
        output_url_present: !!outputUrl,
        storage_url_present: !!storageUrl,
        status,
        failure_stage: failureStage ?? null,
        duration_ms: durationMs,
        duration_semantics: 'submit_to_poll_detection',
        file_size_bytes: null,  // NOT captured at the log site (downloadAndStore untouched)
        dimension: (fmt.render_dimension ?? '720x1280'),
        aspect: '9:16',
        audio_expected: true,
        voice_expected: true,
        tts_provider: 'heygen',
        captions_expected: false,
        captions_present: false,
        scene_count: 1,
        avatar_expected: true,
        fallback_taken: (fmt.avatar_identity?.avatar_selected_by === 'fallback_limit1'),
        cost_present: false,
        cost_estimated_flag: false,
      })),
    };

    const { error } = await supabase.rpc('write_render_log', {
      p_post_draft_id: draftId,
      p_slide_id: null,
      p_client_id: draft.client_id ?? null,
      p_ice_format_key: 'video_short_avatar',
      p_render_engine: 'heygen',
      p_creatomate_render_id: null,
      p_status: status,
      p_output_url: outputUrl,
      p_storage_url: storageUrl,
      p_credits_used: null,
      p_render_duration_ms: durationMs,
      p_error_message: errorMessage,
      p_render_spec: renderSpec,
    });
    if (error) {
      console.log(`[heygen-worker] render_log write failed (non-fatal) ${draftId}: ${error.message ?? error}`);
    } else {
      console.log(`[heygen-worker] render_log ${status} ${draftId} job=${providerJobId ?? 'n/a'} dur=${durationMs ?? 'n/a'}ms`);
    }
  } catch (e: any) {
    // Telemetry must NEVER break the render lifecycle.
    console.log(`[heygen-worker] render_log telemetry error (non-fatal) ${draftId}: ${e?.message ?? e}`);
  }
}

// --- Phase B: poll existing rendering jobs (one check per draft per tick) ----

export async function runPollPhase(supabase: Supa, apiKey: string): Promise<any[]> {
  const results: any[] = [];
  const { data: rendering } = await supabase.schema('m').from('post_draft')
    .select('post_draft_id, client_id, draft_format, recommended_format')
    .eq('recommended_format', 'video_short_avatar')
    .eq('video_status', 'rendering')
    .not('draft_format->heygen_video_id', 'is', null)
    .limit(MAX_POLLS);

  for (const draft of (rendering ?? [])) {
    const fmt = draft.draft_format ?? {};
    const draftId = draft.post_draft_id;
    const videoId: string = fmt.heygen_video_id;
    const submittedAt = Date.parse(fmt.heygen_submitted_at ?? '') || 0;

    let st: HeyGenStatus;
    try {
      st = await pollOnce(apiKey, videoId);
    } catch (e: any) {
      // transient status-endpoint error → leave rendering, retry next tick
      console.log(`[heygen-worker] poll transient ${draftId} (${videoId}): ${e?.message ?? e}`);
      results.push({ post_draft_id: draftId, phase: 'poll', status: 'rendering', note: 'transient_poll_error' });
      continue;
    }

    if (st.state === 'completed') {
      try {
        const renderStyle: string = fmt.render_style ?? fmt.video_script?.render_style ?? 'realistic';
        const storagePath: string = fmt.storage_path ?? `${fmt.client_slug ?? draft.client_id.substring(0, 8)}/${draftId}_avatar_${renderStyle}.mp4`;
        const storageUrl = await downloadAndStore(supabase, st.videoUrl, storagePath);
        await markGenerated(supabase, draftId, fmt, storageUrl, st.videoUrl);
        // telemetry-only: terminal success
        await writeRenderLog(supabase, draft, { status: 'succeeded', providerJobId: videoId, outputUrl: st.videoUrl, storageUrl });
        console.log(`[heygen-worker] generated ${draftId} -> ${storageUrl}`);
        results.push({ post_draft_id: draftId, phase: 'poll', status: 'generated', storage_url: storageUrl });
      } catch (e: any) {
        const dlErr = `download_store_failed: ${(e?.message ?? String(e)).slice(0, 1000)}`;
        await markFailed(supabase, draftId, fmt, { heygen_error: dlErr, heygen_video_id: videoId });
        // telemetry-only: terminal failure (HeyGen completed but our download/store failed)
        await writeRenderLog(supabase, draft, { status: 'failed', providerJobId: videoId, errorMessage: dlErr, failureStage: 'download_store' });
        results.push({ post_draft_id: draftId, phase: 'poll', status: 'failed', error: e?.message ?? String(e) });
      }
    } else if (st.state === 'failed') {
      await markFailed(supabase, draftId, fmt, { heygen_error: JSON.stringify(st.rawError).slice(0, 2000), heygen_video_id: videoId });
      // telemetry-only: terminal failure (provider render failed)
      await writeRenderLog(supabase, draft, { status: 'failed', providerJobId: videoId, errorMessage: `heygen_render_failed: ${JSON.stringify(st.rawError).slice(0, 1000)}`, failureStage: 'render' });
      results.push({ post_draft_id: draftId, phase: 'poll', status: 'failed', error: 'heygen_render_failed' });
    } else {
      // still processing — stale check
      if (submittedAt && (Date.now() - submittedAt) > STALE_RENDER_MAX_MS) {
        await markFailed(supabase, draftId, fmt, { heygen_error: 'stale_render_timeout', last_status: 'processing', heygen_video_id: videoId });
        // telemetry-only: terminal timeout
        await writeRenderLog(supabase, draft, { status: 'timeout', providerJobId: videoId, errorMessage: 'stale_render_timeout', failureStage: 'timeout' });
        results.push({ post_draft_id: draftId, phase: 'poll', status: 'failed', error: 'stale_render_timeout' });
      } else {
        results.push({ post_draft_id: draftId, phase: 'poll', status: 'rendering' });
      }
    }
  }
  return results;
}

// --- Shadow-only avatar-resolution telemetry (AGP-D01-3) --------------------
// FLAG-GATED (AVATAR_SHADOW_TELEMETRY, default OFF) + FAIL-OPEN. Records the LIVE
// pick alongside a deterministic shadow pick via the public.resolve_and_record_avatar_shadow
// RPC (writes ONLY r.avatar_resolution_shadow). NEVER read back, NEVER influences
// selection, NEVER throws into the render lifecycle. Uses the typed .rpc (NOT exec_sql).
function shadowTelemetryEnabled(): boolean {
  const v = (Deno.env.get('AVATAR_SHADOW_TELEMETRY') ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export async function recordAvatarShadow(
  supabase: Supa,
  args: {
    postDraftId: string;
    clientId: string;
    stakeholderRole: string | null;
    renderStyle: string;
    liveAvatarId: string;
    liveVoiceId: string | null;
    liveSelectedBy: string;
    runId?: string | null;
  },
): Promise<void> {
  if (!shadowTelemetryEnabled()) return;   // flag OFF => strict no-op (no RPC call)
  try {
    const { error } = await supabase.rpc('resolve_and_record_avatar_shadow', {
      p_post_draft_id:    args.postDraftId,
      p_client_id:        args.clientId,
      p_stakeholder_role: args.stakeholderRole,
      p_render_style:     args.renderStyle,
      p_live_avatar_id:   args.liveAvatarId,
      p_live_voice_id:    args.liveVoiceId,
      p_live_selected_by: args.liveSelectedBy,
      p_run_id:           args.runId ?? null,
    });
    if (error) console.error('[heygen-worker] shadow telemetry failed (non-fatal)', error?.message ?? error);
  } catch (e) {
    // FAIL-OPEN: never break the render lifecycle. Swallow and continue.
    console.error('[heygen-worker] shadow telemetry failed (non-fatal)', e);
  }
}

// --- Phase A: submit new pending avatar jobs --------------------------------

export async function runSubmitPhase(supabase: Supa, apiKey: string): Promise<any[]> {
  const results: any[] = [];
  const { data: pending } = await supabase.schema('m').from('post_draft')
    .select('post_draft_id, client_id, draft_format, recommended_format')
    .eq('recommended_format', 'video_short_avatar')
    .eq('video_status', 'pending')
    .in('approval_status', ['approved', 'published'])
    .limit(MAX_SUBMITS);

  for (const draft of (pending ?? [])) {
    const fmt = draft.draft_format ?? {};
    const vs = fmt.video_script ?? {};
    const draftId = draft.post_draft_id;
    const clientId = draft.client_id;

    // GUARD 1+2: never resubmit / no duplicate external render.
    if (fmt.heygen_video_id) {
      await markRendering(supabase, draftId, fmt, fmt.heygen_video_id, fmt.heygen_submitted_at ?? nowIso());
      results.push({ post_draft_id: draftId, phase: 'submit', status: 'rendering', note: 'recovered_existing_video_id' });
      continue;
    }

    try {
      const renderStyle: string = fmt.render_style ?? vs.render_style ?? 'realistic';
      const stakeholderRole: string | null = fmt.stakeholder_role ?? vs.stakeholder_role ?? null;
      const narrationText: string = fmt.narration_text ?? vs.narration_text ?? '';
      if (!narrationText) throw new Error(`narration_text missing for draft ${draftId}`);

      let talkingPhotoId: string | null = fmt.talking_photo_id ?? fmt.avatar_id ?? null;
      let voiceId: string | null = fmt.voice_id ?? null;
      // v2.1.1 (observability-only): record HOW the avatar was selected. Default 'preset' = identity
      // already present in draft_format (no lookup). Does NOT influence which avatar is chosen.
      // cc-0063 Step B: 'role_filter'/'fallback_limit1' are RETIRED FROM EMISSION; the resolver now
      // emits the governed codes default_host|primary_fallback|undesignated_tiebreak. 'preset' is
      // retained — the :427 short-circuit is carried governance debt (unchanged precedence).
      let avatarSelectedBy: 'default_host' | 'primary_fallback' | 'undesignated_tiebreak' | 'preset' = 'preset';
      // cc-0083 Slice B: set true iff a requested stakeholder_role had no eligible avatar and we
      // fell back to the client default host (role-less re-resolve). Telemetry only (see §4).
      let roleFallbackToDefaultHost = false;
      if (!talkingPhotoId) {
        const res = await lookupAvatar(supabase, clientId, stakeholderRole, renderStyle);
        // cc-0063 Step B: fail closed on a query error, DISTINCT from a genuinely empty candidate
        // set (the 2026-07-23 non-collapse). The structured avatar_resolution_outcome is the
        // downstream-observable discriminator (R-B); the heygen_error string is for humans.
        if (res.outcome === 'resolution_failed') {
          await markFailed(supabase, draftId, fmt, {
            heygen_error: `submit_error: avatar resolution failed for client ${clientId}: ${res.error_detail}`,
            avatar_resolution_outcome: 'resolution_failed',
          });
          results.push({ post_draft_id: draftId, phase: 'submit', status: 'failed', error: 'resolution_failed' });
          continue;
        }
        if (res.outcome === 'no_eligible_avatar') {
          if (stakeholderRole) {
            // cc-0083 Slice B: a role was requested but no active avatar carries it → fall back to
            // the client default host (role-less resolve). Only a genuinely-no-avatar client (default
            // host ALSO missing) still hard-fails. resolution_failed stays a hard fail above (unchanged).
            const fb = await lookupAvatar(supabase, clientId, null, renderStyle);
            if (fb.outcome === 'default_host' || fb.outcome === 'primary_fallback' || fb.outcome === 'undesignated_tiebreak') {
              talkingPhotoId = fb.talking_photo_id;
              voiceId = voiceId ?? fb.voice_id;
              avatarSelectedBy = fb.outcome;      // the host actually used
              roleFallbackToDefaultHost = true;   // telemetry (see §4)
            } else {
              await markFailed(supabase, draftId, fmt, {
                heygen_error: `submit_error: No active ${renderStyle} avatar for client ${clientId} (role ${stakeholderRole} unavailable AND no default host)`,
                avatar_resolution_outcome: 'no_eligible_avatar',
              });
              results.push({ post_draft_id: draftId, phase: 'submit', status: 'failed', error: 'no_eligible_avatar' });
              continue;
            }
          } else {
            // no role requested AND no avatar at all → genuine hard fail (unchanged)
            await markFailed(supabase, draftId, fmt, {
              heygen_error: `submit_error: No active ${renderStyle} avatar for client ${clientId}`,
              avatar_resolution_outcome: 'no_eligible_avatar',
            });
            results.push({ post_draft_id: draftId, phase: 'submit', status: 'failed', error: 'no_eligible_avatar' });
            continue;
          }
        } else {
          talkingPhotoId = res.talking_photo_id;
          voiceId = voiceId ?? res.voice_id;
          avatarSelectedBy = res.outcome;   // default_host | primary_fallback | undesignated_tiebreak
        }
      }
      if (!voiceId) throw new Error(`No voice_id for draft ${draftId}`);

      // AGP-D01-3 shadow telemetry (additive, flag-gated, fail-open): record the ACTUAL
      // live pick (talkingPhotoId/voiceId/avatarSelectedBy) so the shadow resolver can
      // measure ordering nondeterminism. Result is NEVER read back; selection is unchanged.
      await recordAvatarShadow(supabase, {
        postDraftId:     draftId,
        clientId,
        stakeholderRole,
        renderStyle,
        liveAvatarId:    talkingPhotoId,
        liveVoiceId:     voiceId,
        liveSelectedBy:  avatarSelectedBy,
        runId:           null,
      });

      const { data: brandRows } = await supabase.rpc('exec_sql', {
        query: `SELECT brand_colour_primary, cl.client_slug FROM c.client_brand_profile cbp JOIN c.client cl ON cl.client_id = cbp.client_id WHERE cbp.client_id = '${clientId}' AND cbp.is_active = true LIMIT 1`,
      });
      const brand = (brandRows as any)?.[0];
      const bgColour = brand?.brand_colour_primary ?? '#0A2A4A';
      const clientSlug = brand?.client_slug ?? clientId.substring(0, 8);
      const storagePath = `${clientSlug}/${draftId}_avatar_${renderStyle}.mp4`;

      console.log(`[heygen-worker] submit ${draftId} avatar=${talkingPhotoId} style=${renderStyle} role=${stakeholderRole ?? 'any'}`);
      const heygenVideoId = await submitHeyGenJob({ apiKey, talkingPhotoId, voiceId, narrationText, bgColour });

      // Persist immediately and return — no polling in this invocation.
      await markRendering(supabase, draftId, fmt, heygenVideoId, nowIso(), {
        render_style: renderStyle, storage_path: storagePath, client_slug: clientSlug,
        // v2.1.1 (observability-only): capture the ACTUAL avatar identity selected for THIS submit.
        // Copied verbatim into render_spec at poll/terminal — never re-derived or reselected.
        avatar_identity: {
          talking_photo_id: talkingPhotoId,
          voice_id: voiceId,
          render_style: renderStyle,
          stakeholder_role: stakeholderRole,
          avatar_selected_by: avatarSelectedBy,
          // cc-0083 Slice B telemetry (§4): the role heygen-worker filtered on, and whether a
          // requested-but-unavailable role fell back to the client default host.
          requested_stakeholder_role: stakeholderRole,
          role_fallback_to_default_host: roleFallbackToDefaultHost,
        },
      });
      console.log(`[heygen-worker] submitted ${draftId} -> heygen ${heygenVideoId} (rendering)`);
      results.push({ post_draft_id: draftId, phase: 'submit', status: 'rendering', heygen_video_id: heygenVideoId });
    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 2000);
      console.error(`[heygen-worker] submit failed ${draftId}:`, msg);
      await markFailed(supabase, draftId, fmt, { heygen_error: `submit_error: ${msg}` });
      // NOTE: submit-phase (pre-render) failures are intentionally NOT written to post_render_log —
      // no provider_job_id exists yet, and this telemetry is scoped to terminal RENDER outcomes.
      results.push({ post_draft_id: draftId, phase: 'submit', status: 'failed', error: msg });
    }
  }
  return results;
}

// --- Entry ------------------------------------------------------------------

// import.meta.main guard: lets the hermetic test import the exported phase functions
// WITHOUT starting the HTTP server. In production the deployed module IS the entry point,
// so import.meta.main === true and Deno.serve runs identically (zero behaviour change).
if (import.meta.main) Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return jsonResponse({ ok: true, function: 'heygen-worker', version: VERSION });

  const expected = Deno.env.get('PUBLISHER_API_KEY');
  const provided = req.headers.get('x-heygen-worker-key');
  if (!expected) return jsonResponse({ ok: false, error: 'PUBLISHER_API_KEY not set' }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);

  const apiKey = Deno.env.get('ICE_HEYGEN_API_KEY');
  if (!apiKey) return jsonResponse({ ok: false, error: 'ICE_HEYGEN_API_KEY not set' }, 500);

  const supabase = getServiceClient();

  // Phase B first (poll existing renders), then Phase A (submit new) — so a draft
  // submitted this tick is not polled until the next tick.
  const polled    = await runPollPhase(supabase, apiKey);
  const submitted = await runSubmitPhase(supabase, apiKey);

  if (!polled.length && !submitted.length) {
    return jsonResponse({ ok: true, message: 'no_avatar_drafts_pending_or_rendering', version: VERSION });
  }
  return jsonResponse({ ok: true, version: VERSION, polled, submitted });
});
