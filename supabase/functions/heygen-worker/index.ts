// heygen-worker v2.0.0
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

const VERSION             = 'heygen-worker-v2.0.0';
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

async function lookupAvatar(
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

// --- Phase B: poll existing rendering jobs (one check per draft per tick) ----

async function runPollPhase(supabase: Supa, apiKey: string): Promise<any[]> {
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
        console.log(`[heygen-worker] generated ${draftId} -> ${storageUrl}`);
        results.push({ post_draft_id: draftId, phase: 'poll', status: 'generated', storage_url: storageUrl });
      } catch (e: any) {
        await markFailed(supabase, draftId, fmt, { heygen_error: `download_store_failed: ${(e?.message ?? String(e)).slice(0, 1000)}`, heygen_video_id: videoId });
        results.push({ post_draft_id: draftId, phase: 'poll', status: 'failed', error: e?.message ?? String(e) });
      }
    } else if (st.state === 'failed') {
      await markFailed(supabase, draftId, fmt, { heygen_error: JSON.stringify(st.rawError).slice(0, 2000), heygen_video_id: videoId });
      results.push({ post_draft_id: draftId, phase: 'poll', status: 'failed', error: 'heygen_render_failed' });
    } else {
      // still processing — stale check
      if (submittedAt && (Date.now() - submittedAt) > STALE_RENDER_MAX_MS) {
        await markFailed(supabase, draftId, fmt, { heygen_error: 'stale_render_timeout', last_status: 'processing', heygen_video_id: videoId });
        results.push({ post_draft_id: draftId, phase: 'poll', status: 'failed', error: 'stale_render_timeout' });
      } else {
        results.push({ post_draft_id: draftId, phase: 'poll', status: 'rendering' });
      }
    }
  }
  return results;
}

// --- Phase A: submit new pending avatar jobs --------------------------------

async function runSubmitPhase(supabase: Supa, apiKey: string): Promise<any[]> {
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
      if (!talkingPhotoId) {
        const avatar = await lookupAvatar(supabase, clientId, stakeholderRole, renderStyle);
        if (!avatar) throw new Error(`No active ${renderStyle} avatar for client ${clientId}${stakeholderRole ? ` role ${stakeholderRole}` : ''}`);
        talkingPhotoId = avatar.talking_photo_id;
        voiceId = voiceId ?? avatar.voice_id;
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
      });
      console.log(`[heygen-worker] submitted ${draftId} -> heygen ${heygenVideoId} (rendering)`);
      results.push({ post_draft_id: draftId, phase: 'submit', status: 'rendering', heygen_video_id: heygenVideoId });
    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 2000);
      console.error(`[heygen-worker] submit failed ${draftId}:`, msg);
      await markFailed(supabase, draftId, fmt, { heygen_error: `submit_error: ${msg}` });
      results.push({ post_draft_id: draftId, phase: 'submit', status: 'failed', error: msg });
    }
  }
  return results;
}

// --- Entry ------------------------------------------------------------------

Deno.serve(async (req: Request) => {
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
