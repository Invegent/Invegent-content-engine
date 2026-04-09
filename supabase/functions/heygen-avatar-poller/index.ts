// heygen-avatar-poller v1.0.0
// State machine poller for avatar generation jobs.
// Runs every 60 seconds via pg_cron. Each run advances pending jobs by ONE step.
//
// State machine:
//   generating → (poll HeyGen) → training    (if generation complete, starts train)
//   training   → (poll HeyGen) → active      (if training complete, writes avatar_id)
//   active     → done, skip
//   failed     → skip (requires manual restart via heygen-avatar-creator)
//
// Each run processes MAX 5 jobs to stay within Supabase function time limits.
// Auth: x-publisher-key header (PUBLISHER_API_KEY)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION          = 'heygen-avatar-poller-v1.0.0';
const HG_BASE          = 'https://api.heygen.com';
const HG_POLL_GEN      = (id: string)  => `${HG_BASE}/v2/photo_avatar/generation/${id}`;
const HG_TRAIN         = `${HG_BASE}/v2/photo_avatar/train`;
const HG_POLL_TRAIN    = (gid: string) => `${HG_BASE}/v2/photo_avatar/${gid}`;
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
  const data = await resp.json();
  if (!resp.ok) throw new Error(`HeyGen GET ${url} → ${resp.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

async function hgPost(apiKey: string, url: string, body: object): Promise<any> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`HeyGen POST ${url} → ${resp.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

async function advanceGenerating(
  supabase: ReturnType<typeof getServiceClient>,
  apiKey: string,
  job: any,
): Promise<string> {
  const data = await hgGet(apiKey, HG_POLL_GEN(job.generation_id));
  const d    = data?.data ?? data;
  const status = d?.status ?? d?.generation_status;
  console.log(`[poller] ${job.role_label}/${job.render_style} generating → HeyGen status=${status}`);

  if (status === 'success' || status === 'completed' || status === 'done') {
    // data.id is the group_id in HeyGen's response (not data.group_id)
    const groupId = d?.group_id ?? d?.avatar_group_id ?? d?.id ?? job.generation_id;
    const imageCount = (d?.image_url_list ?? []).length;
    console.log(`[poller] generation done → group_id=${groupId} images=${imageCount}`);

    // Start training
    await hgPost(apiKey, HG_TRAIN, { group_id: groupId });
    console.log(`[poller] training started for group_id=${groupId}`);

    // Advance state to training
    await supabase.rpc('exec_sql', {
      query: `UPDATE c.brand_avatar SET group_id = '${groupId}', avatar_gen_status = 'training' WHERE brand_avatar_id = '${job.brand_avatar_id}'`,
    });
    return 'advanced_to_training';
  }

  if (status === 'failed' || status === 'error') {
    await supabase.rpc('exec_sql', {
      query: `UPDATE c.brand_avatar SET avatar_gen_status = 'failed', avatar_gen_error = '${(JSON.stringify(d)).replace(/'/g, "''")}' WHERE brand_avatar_id = '${job.brand_avatar_id}'`,
    });
    return 'failed';
  }

  return `still_generating:${status}`;
}

async function advanceTraining(
  supabase: ReturnType<typeof getServiceClient>,
  apiKey: string,
  job: any,
): Promise<string> {
  const data = await hgGet(apiKey, HG_POLL_TRAIN(job.group_id));
  const d    = data?.data ?? data;
  const status = d?.status ?? d?.train_status ?? d?.training_status;
  console.log(`[poller] ${job.role_label}/${job.render_style} training → HeyGen status=${status} keys=${Object.keys(d ?? {}).join(',')}`);

  if (status === 'completed' || status === 'trained' || status === 'success') {
    const avatarId = d?.avatar_id ?? d?.talking_photo_id ?? job.group_id;
    const displayName = `${job.role_label} (${job.render_style.charAt(0).toUpperCase() + job.render_style.slice(1)})`;
    console.log(`[poller] training complete → avatar_id=${avatarId}`);

    await supabase.rpc('exec_sql', {
      query: `
        UPDATE c.brand_avatar
        SET heygen_avatar_id    = '${avatarId}',
            avatar_display_name = '${displayName.replace(/'/g, "''")}',
            is_active           = true,
            avatar_gen_status   = 'active',
            gen_completed_at    = NOW()
        WHERE brand_avatar_id = '${job.brand_avatar_id}'
      `,
    });

    // Update stakeholder timestamp
    await supabase.rpc('exec_sql', {
      query: `UPDATE c.brand_stakeholder SET last_generated_at = NOW() WHERE stakeholder_id = '${job.stakeholder_id}'`,
    });

    return `active:${avatarId}`;
  }

  if (status === 'failed' || status === 'error') {
    await supabase.rpc('exec_sql', {
      query: `UPDATE c.brand_avatar SET avatar_gen_status = 'failed', avatar_gen_error = '${(JSON.stringify(d)).replace(/'/g, "''")}' WHERE brand_avatar_id = '${job.brand_avatar_id}'`,
    });
    return 'failed';
  }

  return `still_training:${status}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const expectedKey = Deno.env.get('PUBLISHER_API_KEY');
  const providedKey = req.headers.get('x-publisher-key');
  if (!expectedKey) return json({ ok: false, error: 'PUBLISHER_API_KEY not configured' }, 500);
  if (providedKey !== expectedKey) return json({ ok: false, error: 'Unauthorized' }, 401);

  if (req.method === 'GET') {
    return json({ ok: true, version: VERSION, info: 'heygen-avatar-poller — advances generating/training jobs one step per run' });
  }

  const apiKey = Deno.env.get('ICE_HEYGEN_API_KEY');
  if (!apiKey) return json({ ok: false, error: 'ICE_HEYGEN_API_KEY not configured' }, 500);

  const supabase = getServiceClient();

  // Fetch pending jobs
  const { data: jobs, error: fetchErr } = await supabase.rpc('exec_sql', {
    query: `
      SELECT ba.brand_avatar_id, ba.stakeholder_id, ba.render_style,
             ba.generation_id, ba.group_id, ba.avatar_gen_status,
             bs.role_label
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
    console.log(`[poller] processing ${job.role_label}/${job.render_style} status=${job.avatar_gen_status}`);
    try {
      let outcome: string;
      if (job.avatar_gen_status === 'generating') {
        outcome = await advanceGenerating(supabase, apiKey, job);
      } else {
        outcome = await advanceTraining(supabase, apiKey, job);
      }
      results.push({ role_label: job.role_label, render_style: job.render_style, from_status: job.avatar_gen_status, outcome });
    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 500);
      console.error(`[poller] error ${job.role_label}/${job.render_style}:`, msg);
      await supabase.rpc('exec_sql', {
        query: `UPDATE c.brand_avatar SET avatar_gen_status = 'failed', avatar_gen_error = '${msg.replace(/'/g, "''")}' WHERE brand_avatar_id = '${job.brand_avatar_id}'`,
      });
      results.push({ role_label: job.role_label, render_style: job.render_style, from_status: job.avatar_gen_status, outcome: 'error', error: msg });
    }
  }

  const activated = results.filter(r => r.outcome?.startsWith('active')).length;
  const advanced  = results.filter(r => r.outcome === 'advanced_to_training').length;
  const failed    = results.filter(r => r.outcome === 'failed' || r.outcome === 'error').length;
  const waiting   = results.filter(r => r.outcome?.startsWith('still')).length;

  return json({
    ok:         failed === 0,
    version:    VERSION,
    polled_at:  nowIso(),
    jobs_processed: results.length,
    activated, advanced, waiting, failed,
    results,
  });
});
