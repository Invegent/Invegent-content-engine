// heygen-worker v2.1.1
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

const VERSION             = 'heygen-worker-v2.1.1';
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

export async function lookupAvatar(
  supabase: Supa,
  clientId: string,
  stakeholderRole: string | null,
  renderStyle: string,
): Promise<{ talking_photo_id: string; voice_id: string | null } | null> {
  const { data: rows } = await supabase.rpc('exec_sql', {
    query: `
      SELECT ba.heygen_avatar_id, ba.heygen_voice_id
      FROM c.brand_avatar ba
      JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
      WHERE ba.client_id = '${clientId}'
        AND ba.is_active = true
        AND ba.render_style = '${renderStyle}'
        ${stakeholderRole ? `AND bs.role_code = '${stakeholderRole}'` : ''}
      LIMIT 1
    `,
  });
  const row = (rows as any)?.[0];
  if (!row?.heygen_avatar_id) return null;
  return { talking_photo_id: row.heygen_avatar_id, voice_id: row.heygen_voice_id ?? null };
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
  opts: { status: 'succeeded' | 'failed' | 'timeout'; providerJobId: string | null; outputUrl?: string | null; storageUrl?: string | null; errorMessage?: string | null },
): Promise<void> {
  const draftId = draft.post_draft_id;
  try {
    const fmt = draft.draft_format ?? {};
    const { status, providerJobId, outputUrl = null, storageUrl = null, errorMessage = null } = opts;

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
        await writeRenderLog(supabase, draft, { status: 'failed', providerJobId: videoId, errorMessage: dlErr });
        results.push({ post_draft_id: draftId, phase: 'poll', status: 'failed', error: e?.message ?? String(e) });
      }
    } else if (st.state === 'failed') {
      await markFailed(supabase, draftId, fmt, { heygen_error: JSON.stringify(st.rawError).slice(0, 2000), heygen_video_id: videoId });
      // telemetry-only: terminal failure (provider render failed)
      await writeRenderLog(supabase, draft, { status: 'failed', providerJobId: videoId, errorMessage: `heygen_render_failed: ${JSON.stringify(st.rawError).slice(0, 1000)}` });
      results.push({ post_draft_id: draftId, phase: 'poll', status: 'failed', error: 'heygen_render_failed' });
    } else {
      // still processing — stale check
      if (submittedAt && (Date.now() - submittedAt) > STALE_RENDER_MAX_MS) {
        await markFailed(supabase, draftId, fmt, { heygen_error: 'stale_render_timeout', last_status: 'processing', heygen_video_id: videoId });
        // telemetry-only: terminal timeout
        await writeRenderLog(supabase, draft, { status: 'timeout', providerJobId: videoId, errorMessage: 'stale_render_timeout' });
        results.push({ post_draft_id: draftId, phase: 'poll', status: 'failed', error: 'stale_render_timeout' });
      } else {
        results.push({ post_draft_id: draftId, phase: 'poll', status: 'rendering' });
      }
    }
  }
  return results;
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
      let avatarSelectedBy: 'role_filter' | 'fallback_limit1' | 'preset' = 'preset';
      if (!talkingPhotoId) {
        const avatar = await lookupAvatar(supabase, clientId, stakeholderRole, renderStyle);
        if (!avatar) throw new Error(`No active ${renderStyle} avatar for client ${clientId}${stakeholderRole ? ` role ${stakeholderRole}` : ''}`);
        talkingPhotoId = avatar.talking_photo_id;
        voiceId = voiceId ?? avatar.voice_id;
        avatarSelectedBy = stakeholderRole ? 'role_filter' : 'fallback_limit1';
      }
      if (!voiceId) throw new Error(`No voice_id for draft ${draftId}`);

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
