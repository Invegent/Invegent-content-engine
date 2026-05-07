// heygen-avatar-poller v2.0.0
// v2.0.0: Use correct HeyGen endpoints discovered via browser network inspection.
//   - Avatar group details: GET https://api2.heygen.com/v2/avatar_group?id={group_id}
//   - Look list: GET https://api2.heygen.com/v2/avatar_group/look/list?avatar_group_id={group_id}
//   - No training required for talking photo video generation.
//   - Look avatar_id from group response is the talking_photo_id for heygen-worker.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION          = 'heygen-avatar-poller-v2.0.0';
const HG_API           = 'https://api.heygen.com';
const HG_API2          = 'https://api2.heygen.com';
const HG_POLL_GEN      = (id: string) => `${HG_API}/v2/photo_avatar/generation/${id}`;
const HG_CREATE_GROUP  = `${HG_API}/v2/photo_avatar/avatar_group/create`;
const HG_UPLOAD_BASE   = 'https://upload.heygen.com/v1/asset';
// Correct endpoints from browser network inspection:
const HG_GROUP_DETAIL  = (gid: string) => `${HG_API2}/v2/avatar_group?id=${gid}`;
const HG_GROUP_LOOKS   = (gid: string) => `${HG_API2}/v2/avatar_group/look/list?avatar_group_id=${gid}`;
// Fallback: original api.heygen.com endpoint
const HG_LIST_FALLBACK = (gid: string) => `${HG_API}/v2/photo_avatar/${gid}/avatars`;
const MAX_JOBS_PER_RUN = 5;

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-publisher-key',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function nowIso() { return new Date().toISOString(); }

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function hgGet(apiKey: string, url: string): Promise<any> {
  const resp = await fetch(url, { headers: { 'X-Api-Key': apiKey, 'Accept': 'application/json' } });
  const text = await resp.text();
  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error(`HeyGen GET ${url} non-JSON: ${text.slice(0, 200)}`); }
  if (!resp.ok) throw new Error(`HeyGen GET ${url} ${resp.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

async function hgPost(apiKey: string, url: string, body: object): Promise<any> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error(`HeyGen POST ${url} non-JSON: ${text.slice(0, 200)}`); }
  if (!resp.ok) throw new Error(`HeyGen POST ${url} ${resp.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

async function advanceGenerating(
  supabase: ReturnType<typeof getServiceClient>,
  apiKey: string,
  job: any,
): Promise<string> {
  const data   = await hgGet(apiKey, HG_POLL_GEN(job.generation_id));
  const d      = data?.data ?? data;
  const status = d?.status ?? d?.generation_status;
  console.log(`[poller] ${job.role_label}/${job.render_style} generating status=${status}`);
  await supabase.rpc('store_gen_poll_response', { p_brand_avatar_id: job.brand_avatar_id, p_response: JSON.stringify(d) });

  if (status !== 'success' && status !== 'completed' && status !== 'done') {
    if (status === 'failed' || status === 'error') {
      await supabase.rpc('fail_avatar_generation', { p_brand_avatar_id: job.brand_avatar_id, p_error: JSON.stringify(d).slice(0, 300) });
      return 'failed';
    }
    return `still_generating:${status}`;
  }

  const imageUrls: string[] = d?.image_url_list ?? [];
  if (!imageUrls.length) throw new Error('Generation succeeded but image_url_list is empty');
  console.log(`[poller] generation done ${imageUrls.length} images. Downloading...`);

  const imgResp  = await fetch(imageUrls[0]);
  if (!imgResp.ok) throw new Error(`Image download failed: ${imgResp.status}`);
  const imgBytes = await imgResp.arrayBuffer();

  const uploadResp = await fetch(HG_UPLOAD_BASE, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'image/jpeg' },
    body: imgBytes,
  });
  const uploadText = await uploadResp.text();
  let uploadData: any;
  try { uploadData = JSON.parse(uploadText); } catch { throw new Error(`Upload non-JSON: ${uploadText.slice(0, 200)}`); }
  if (!uploadResp.ok) throw new Error(`Upload failed ${uploadResp.status}: ${uploadText.slice(0, 200)}`);
  const imageKey = uploadData?.data?.image_key ?? uploadData?.image_key;
  if (!imageKey) throw new Error(`No image_key: ${uploadText.slice(0, 200)}`);
  console.log(`[poller] uploaded image_key=${imageKey}`);

  const createResp = await hgPost(apiKey, HG_CREATE_GROUP, {
    name: job.role_label, image_key: imageKey, generation_id: job.generation_id,
  });
  const groupId = createResp?.data?.id ?? createResp?.data?.group_id;
  if (!groupId) throw new Error(`createGroup no id: ${JSON.stringify(createResp).slice(0, 200)}`);
  console.log(`[poller] group created group_id=${groupId}`);

  await supabase.rpc('advance_avatar_to_creating', {
    p_brand_avatar_id: job.brand_avatar_id,
    p_group_id: groupId,
    p_image_url_list: imageUrls,
  });
  return 'group_created';
}

async function advanceTraining(
  supabase: ReturnType<typeof getServiceClient>,
  apiKey: string,
  job: any,
): Promise<string> {
  console.log(`[poller] ${job.role_label}/${job.render_style} extracting look from group ${job.group_id}`);

  let avatarId: string | null = null;
  let debugInfo = '';

  // Strategy 1: GET api2.heygen.com/v2/avatar_group?id={group_id} (found via browser network inspection)
  try {
    const groupData = await hgGet(apiKey, HG_GROUP_DETAIL(job.group_id));
    debugInfo += `group_detail:${JSON.stringify(groupData).slice(0, 400)} `;
    console.log(`[poller] group_detail response: ${JSON.stringify(groupData).slice(0, 600)}`);
    const g = groupData?.data ?? groupData;
    // Look for avatar/look IDs in group detail response
    const looks = g?.looks ?? g?.avatar_looks ?? g?.list ?? [];
    if (Array.isArray(looks) && looks.length > 0) {
      avatarId = looks[0]?.avatar_id ?? looks[0]?.id ?? looks[0]?.talking_photo_id;
      console.log(`[poller] found ${looks.length} looks in group_detail, using ${avatarId}`);
    }
    // Also check if group itself has an avatar_id field
    if (!avatarId) {
      avatarId = g?.avatar_id ?? g?.talking_photo_id ?? g?.look_id;
    }
    // Check status
    const groupStatus = g?.status ?? 'unknown';
    console.log(`[poller] group status=${groupStatus} avatarId=${avatarId}`);
  } catch (e: any) {
    console.warn(`[poller] group_detail failed: ${e.message}`);
    debugInfo += `group_detail_error:${e.message} `;
  }

  // Strategy 2: GET api2.heygen.com/v2/avatar_group/look/list?avatar_group_id={group_id}
  if (!avatarId) {
    try {
      const lookData = await hgGet(apiKey, HG_GROUP_LOOKS(job.group_id));
      debugInfo += `look_list:${JSON.stringify(lookData).slice(0, 400)} `;
      console.log(`[poller] look_list response: ${JSON.stringify(lookData).slice(0, 600)}`);
      const looks = lookData?.data?.list ?? lookData?.data ?? lookData?.list ?? lookData?.avatars ?? [];
      if (Array.isArray(looks) && looks.length > 0) {
        avatarId = looks[0]?.avatar_id ?? looks[0]?.id ?? looks[0]?.talking_photo_id;
        console.log(`[poller] found ${looks.length} looks in look_list, using ${avatarId}`);
      }
    } catch (e: any) {
      console.warn(`[poller] look_list failed: ${e.message}`);
      debugInfo += `look_list_error:${e.message} `;
    }
  }

  // Strategy 3: fallback original endpoint
  if (!avatarId) {
    try {
      const fallback = await hgGet(apiKey, HG_LIST_FALLBACK(job.group_id));
      debugInfo += `fallback:${JSON.stringify(fallback).slice(0, 400)} `;
      console.log(`[poller] fallback response: ${JSON.stringify(fallback).slice(0, 600)}`);
      const avs = fallback?.data?.avatars ?? fallback?.data?.list ?? (Array.isArray(fallback?.data) ? fallback.data : []) ?? [];
      if (Array.isArray(avs) && avs.length > 0) {
        avatarId = avs[0]?.avatar_id ?? avs[0]?.id;
        console.log(`[poller] found ${avs.length} in fallback, using ${avatarId}`);
      }
    } catch (e: any) {
      console.warn(`[poller] fallback failed: ${e.message}`);
      debugInfo += `fallback_error:${e.message} `;
    }
  }

  if (!avatarId) {
    // Store debug info and wait
    await supabase.rpc('store_gen_poll_response', { p_brand_avatar_id: job.brand_avatar_id, p_response: debugInfo.slice(0, 2000) });
    console.log(`[poller] no avatar found yet — debug: ${debugInfo.slice(0, 500)}`);
    return `waiting:no_avatar_found`;
  }

  const displayName = `${job.role_label} (${job.render_style.charAt(0).toUpperCase() + job.render_style.slice(1)})`;
  const { error } = await supabase.rpc('complete_avatar_training', {
    p_brand_avatar_id: job.brand_avatar_id,
    p_stakeholder_id:  job.stakeholder_id,
    p_avatar_id:       avatarId,
    p_display_name:    displayName,
  });
  if (error) throw new Error(`DB complete failed: ${error.message}`);
  return `active:${avatarId}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const expectedKey = Deno.env.get('PUBLISHER_API_KEY');
  const providedKey = req.headers.get('x-publisher-key');
  if (!expectedKey) return json({ ok: false, error: 'PUBLISHER_API_KEY not configured' }, 500);
  if (providedKey !== expectedKey) return json({ ok: false, error: 'Unauthorized' }, 401);
  if (req.method === 'GET') return json({ ok: true, version: VERSION });

  const apiKey = Deno.env.get('ICE_HEYGEN_API_KEY');
  if (!apiKey) return json({ ok: false, error: 'ICE_HEYGEN_API_KEY not configured' }, 500);
  const supabase = getServiceClient();

  const { data: jobs, error: fetchErr } = await supabase.rpc('exec_sql', {
    query: `
      SELECT ba.brand_avatar_id, ba.stakeholder_id, ba.render_style,
             ba.generation_id, ba.group_id, ba.avatar_gen_status, bs.role_label
      FROM c.brand_avatar ba
      JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
      WHERE ba.avatar_gen_status IN ('generating', 'training')
        AND ba.generation_id IS NOT NULL
      ORDER BY ba.gen_started_at ASC
      LIMIT ${MAX_JOBS_PER_RUN}
    `,
  });

  if (fetchErr) return json({ ok: false, error: fetchErr.message }, 500);
  if (!jobs?.length) return json({ ok: true, version: VERSION, message: 'no_pending_jobs' });

  const results: any[] = [];
  for (const job of (jobs as any[])) {
    try {
      const outcome = job.avatar_gen_status === 'generating'
        ? await advanceGenerating(supabase, apiKey, job)
        : await advanceTraining(supabase, apiKey, job);
      results.push({ role_label: job.role_label, render_style: job.render_style, from_status: job.avatar_gen_status, outcome });
    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 500);
      console.error(`[poller] FAILED ${job.role_label}/${job.render_style}: ${msg}`);
      await supabase.rpc('fail_avatar_generation', { p_brand_avatar_id: job.brand_avatar_id, p_error: msg.slice(0, 300) });
      results.push({ role_label: job.role_label, render_style: job.render_style, outcome: 'error', error: msg });
    }
  }

  return json({
    ok: results.every(r => r.outcome !== 'error' && r.outcome !== 'failed'),
    version: VERSION, polled_at: nowIso(),
    jobs_processed: results.length,
    activated: results.filter(r => r.outcome?.startsWith('active')).length,
    waiting:   results.filter(r => r.outcome?.startsWith('waiting')).length,
    failed:    results.filter(r => r.outcome === 'error' || r.outcome === 'failed').length,
    results,
  });
});
