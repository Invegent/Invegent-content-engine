// heygen-avatar-creator v2.0.0
// Fire-and-forget avatar generation starter.
// Calls HeyGen generate API and returns immediately — no polling.
// heygen-avatar-poller (pg_cron every 60s) advances jobs through the state machine.
//
// State written to c.brand_avatar:
//   avatar_gen_status: empty → generating (this function) → training → active (poller)
//   generation_id: HeyGen generation_id saved here for poller to pick up
//
// POST body:
//   { "stakeholder_id": "<uuid>", "render_style": "realistic" | "animated" | "both" }
//   OR { "client_id": "<uuid>" } — starts all stakeholders for a client
//
// GET: health check + status of any in-progress jobs for client_id query param

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION    = 'heygen-avatar-creator-v2.0.0';
const HG_GENERATE = 'https://api.heygen.com/v2/photo_avatar/photo/generate';

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

async function startGeneration(
  apiKey: string,
  brief: Record<string, string>,
  style: 'Realistic' | 'Animated',
): Promise<string> {
  const resp = await fetch(HG_GENERATE, {
    method:  'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      name:        brief.name,
      age:         brief.age,
      gender:      brief.gender,
      ethnicity:   brief.ethnicity,
      orientation: brief.orientation ?? 'horizontal',
      pose:        brief.pose        ?? 'half_body',
      style,
      appearance:  brief.appearance,
    }),
  });
  const data = await resp.json();
  if (!resp.ok || data?.error) {
    throw new Error(`HeyGen generate failed ${resp.status}: ${JSON.stringify(data?.error ?? data).slice(0, 400)}`);
  }
  const generationId = data?.data?.generation_id;
  if (!generationId) throw new Error(`No generation_id in response: ${JSON.stringify(data).slice(0, 300)}`);
  return generationId;
}

async function saveGenerationId(
  supabase: ReturnType<typeof getServiceClient>,
  stakeholderId: string,
  renderStyle: string,
  generationId: string,
): Promise<void> {
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      UPDATE c.brand_avatar
      SET generation_id     = '${generationId}',
          avatar_gen_status = 'generating',
          avatar_gen_error  = NULL,
          gen_started_at    = NOW(),
          is_active         = false
      WHERE stakeholder_id = '${stakeholderId}'
        AND render_style   = '${renderStyle}'
    `,
  });
  if (error) throw new Error(`DB save failed: ${error.message}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const expectedKey = Deno.env.get('PUBLISHER_API_KEY');
  const providedKey = req.headers.get('x-publisher-key');
  if (!expectedKey) return json({ ok: false, error: 'PUBLISHER_API_KEY not configured' }, 500);
  if (providedKey !== expectedKey) return json({ ok: false, error: 'Unauthorized' }, 401);

  const supabase = getServiceClient();

  if (req.method === 'GET') {
    // Health check + optional in-progress job status
    const url      = new URL(req.url);
    const clientId = url.searchParams.get('client_id');
    if (clientId) {
      const { data } = await supabase.rpc('exec_sql', {
        query: `
          SELECT bs.role_label, ba.render_style, ba.avatar_gen_status,
                 ba.generation_id, ba.group_id, ba.gen_started_at, ba.avatar_gen_error
          FROM c.brand_avatar ba
          JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
          WHERE bs.client_id = '${clientId}'
          ORDER BY bs.sort_order, ba.render_style
        `,
      });
      return json({ ok: true, version: VERSION, jobs: data ?? [] });
    }
    return json({ ok: true, version: VERSION, info: 'heygen-avatar-creator — starts generation jobs. heygen-avatar-poller advances them.' });
  }

  const apiKey = Deno.env.get('ICE_HEYGEN_API_KEY');
  if (!apiKey) return json({ ok: false, error: 'ICE_HEYGEN_API_KEY not configured' }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Invalid JSON body' }, 400); }

  const { stakeholder_id, client_id, render_style = 'both' } = body ?? {};
  if (!stakeholder_id && !client_id) return json({ ok: false, error: 'Provide stakeholder_id or client_id' }, 400);
  if (!['realistic', 'animated', 'both'].includes(render_style)) return json({ ok: false, error: 'render_style must be realistic | animated | both' }, 400);

  // Fetch stakeholders
  const where = stakeholder_id ? `stakeholder_id = '${stakeholder_id}'` : `client_id = '${client_id}'`;
  const { data: stakeholders, error: fetchErr } = await supabase.rpc('exec_sql', {
    query: `SELECT stakeholder_id, role_label, character_brief FROM c.brand_stakeholder WHERE ${where} AND is_active = true ORDER BY sort_order ASC`,
  });
  if (fetchErr) return json({ ok: false, error: fetchErr.message }, 500);
  if (!stakeholders?.length) return json({ ok: false, error: 'No active stakeholders found' }, 404);

  const styles: string[] = render_style === 'both' ? ['realistic', 'animated'] : [render_style];
  const results: any[] = [];

  for (const s of (stakeholders as any[])) {
    if (!s.character_brief) {
      results.push({ role_label: s.role_label, status: 'skipped', reason: 'character_brief is null' });
      continue;
    }
    for (const style of styles) {
      const hgStyle = style === 'realistic' ? 'Realistic' : 'Animated';
      try {
        const generationId = await startGeneration(apiKey, s.character_brief, hgStyle as 'Realistic' | 'Animated');
        await saveGenerationId(supabase, s.stakeholder_id, style, generationId);
        console.log(`[avatar-creator] started ${s.role_label}/${style} → generation_id=${generationId}`);
        results.push({ role_label: s.role_label, render_style: style, status: 'started', generation_id: generationId });
      } catch (e: any) {
        const msg = (e?.message ?? String(e)).slice(0, 500);
        console.error(`[avatar-creator] FAILED ${s.role_label}/${style}:`, msg);
        results.push({ role_label: s.role_label, render_style: style, status: 'failed', error: msg });
      }
    }
  }

  const started = results.filter(r => r.status === 'started').length;
  const failed  = results.filter(r => r.status === 'failed').length;
  return json({
    ok:         failed === 0,
    version:    VERSION,
    started_at: nowIso(),
    message:    `${started} generation(s) started. heygen-avatar-poller will advance them automatically.`,
    started, failed,
    skipped:    results.filter(r => r.status === 'skipped').length,
    results,
  });
});
