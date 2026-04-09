// heygen-avatar-creator v1.1.0
// Generates AI photo avatars from character_brief in c.brand_stakeholder.
// Writes avatar IDs to c.brand_avatar so heygen-worker can render videos immediately.
//
// Flow per render_style:
//   1. Read character_brief from c.brand_stakeholder
//   2. POST /v2/photo_avatar/photo/generate → generation_id
//   3. Poll GET /v2/photo_avatar/generation/{id} → data.id used as group_id (auto-created by HeyGen)
//   4. POST /v2/photo_avatar/train with group_id
//   5. Poll GET /v2/photo_avatar/{group_id} → wait for completed
//   6. Write avatar_id to c.brand_avatar, set is_active=true
//   7. Update last_generated_at on c.brand_stakeholder
//
// v1.1.0 fixes:
//   - pollGeneration now uses d?.id as group_id fallback (HeyGen returns data.id not data.group_id)
//   - trainGroup logs full response on error for easier debugging
//   - pollTraining logs raw status field on every poll
//   - age enum fix: valid values are Young Adult / Early Middle Age / Late Middle Age / Senior / Unspecified
//
// Auth: x-publisher-key header (PUBLISHER_API_KEY vault secret)
//
// POST body:
//   { "stakeholder_id": "<uuid>", "render_style": "realistic" | "animated" | "both" }
//   OR { "client_id": "<uuid>" } — runs all stakeholders for a client (both styles each)
//
// GET: health check

import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'heygen-avatar-creator-v1.1.0';

const HG_BASE            = 'https://api.heygen.com';
const HG_GENERATE        = `${HG_BASE}/v2/photo_avatar/photo/generate`;
const HG_POLL_GENERATION = (id: string) => `${HG_BASE}/v2/photo_avatar/generation/${id}`;
const HG_TRAIN           = `${HG_BASE}/v2/photo_avatar/train`;
const HG_POLL_TRAINING   = (groupId: string) => `${HG_BASE}/v2/photo_avatar/${groupId}`;

const POLL_INTERVAL_MS   = 5_000;
const GENERATE_MAX_POLLS = 36;   // 36 × 5s = 3 min
const TRAIN_MAX_POLLS    = 72;   // 72 × 5s = 6 min

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-publisher-key',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function nowIso() { return new Date().toISOString(); }

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ── HeyGen helpers ─────────────────────────────────────────────────────────────

async function hgPost(apiKey: string, url: string, body: object): Promise<any> {
  const resp = await fetch(url, {
    method:  'POST',
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok || data?.error) {
    throw new Error(`HeyGen POST ${url} → ${resp.status}: ${JSON.stringify(data?.error ?? data).slice(0, 500)}`);
  }
  return data;
}

async function hgGet(apiKey: string, url: string): Promise<any> {
  const resp = await fetch(url, {
    headers: { 'X-Api-Key': apiKey, 'Accept': 'application/json' },
  });
  const data = await resp.json();
  if (!resp.ok || data?.error) {
    throw new Error(`HeyGen GET ${url} → ${resp.status}: ${JSON.stringify(data?.error ?? data).slice(0, 500)}`);
  }
  return data;
}

// ── Phase 1: generate AI photos ────────────────────────────────────────────────

async function generatePhotos(
  apiKey: string,
  brief: Record<string, string>,
  style: 'Realistic' | 'Animated',
): Promise<string> {
  console.log(`[avatar-creator] generating — style=${style} name=${brief.name} age=${brief.age}`);
  const body = {
    name:        brief.name,
    age:         brief.age,
    gender:      brief.gender,
    ethnicity:   brief.ethnicity,
    orientation: brief.orientation ?? 'horizontal',
    pose:        brief.pose        ?? 'half_body',
    style,
    appearance:  brief.appearance,
  };
  const data = await hgPost(apiKey, HG_GENERATE, body);
  const generationId = data?.data?.generation_id;
  if (!generationId) throw new Error(`No generation_id in response: ${JSON.stringify(data).slice(0, 300)}`);
  console.log(`[avatar-creator] generation started → generation_id=${generationId}`);
  return generationId;
}

// ── Phase 2: poll generation → extract group_id ────────────────────────────────
// HeyGen returns data.id (not data.group_id) when generation completes.
// data.id === the generation_id, which also serves as the avatar group id.

async function pollGeneration(apiKey: string, generationId: string): Promise<string> {
  for (let i = 0; i < GENERATE_MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const data = await hgGet(apiKey, HG_POLL_GENERATION(generationId));
    const d = data?.data ?? data;
    const status = d?.status ?? d?.generation_status;
    console.log(`[avatar-creator] poll generation ${i + 1}/${GENERATE_MAX_POLLS} → status=${status}`);

    if (status === 'success' || status === 'completed' || status === 'done') {
      // HeyGen returns data.id (= generationId) not data.group_id
      // data.id is used as the avatar group_id for training
      const groupId = d?.group_id ?? d?.avatar_group_id ?? d?.id ?? generationId;
      const imageCount = (d?.image_url_list ?? []).length;
      console.log(`[avatar-creator] generation complete → group_id=${groupId} images=${imageCount}`);
      return groupId;
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(`Photo generation failed: ${JSON.stringify(d).slice(0, 400)}`);
    }
  }
  throw new Error(`Photo generation timed out after ${(GENERATE_MAX_POLLS * POLL_INTERVAL_MS) / 1000}s`);
}

// ── Phase 3: train the avatar group ────────────────────────────────────────────

async function trainGroup(apiKey: string, groupId: string): Promise<void> {
  console.log(`[avatar-creator] training → group_id=${groupId}`);
  const data = await hgPost(apiKey, HG_TRAIN, { group_id: groupId });
  console.log(`[avatar-creator] train response: ${JSON.stringify(data).slice(0, 200)}`);
}

// ── Phase 4: poll training until completed ─────────────────────────────────────

async function pollTraining(apiKey: string, groupId: string): Promise<string> {
  for (let i = 0; i < TRAIN_MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const data = await hgGet(apiKey, HG_POLL_TRAINING(groupId));
    const d = data?.data ?? data;
    const status = d?.status ?? d?.train_status ?? d?.training_status;
    console.log(`[avatar-creator] poll training ${i + 1}/${TRAIN_MAX_POLLS} → status=${status} raw_keys=${Object.keys(d ?? {}).join(',')}`);

    if (status === 'completed' || status === 'trained' || status === 'success') {
      const avatarId = d?.avatar_id ?? d?.talking_photo_id ?? groupId;
      console.log(`[avatar-creator] training complete → avatar_id=${avatarId}`);
      return avatarId;
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(`Avatar training failed: ${JSON.stringify(d).slice(0, 400)}`);
    }
  }
  throw new Error(`Avatar training timed out after ${(TRAIN_MAX_POLLS * POLL_INTERVAL_MS) / 1000}s`);
}

// ── DB writes ──────────────────────────────────────────────────────────────────

async function writeToBrandAvatar(
  supabase: ReturnType<typeof getServiceClient>,
  stakeholderId: string,
  renderStyle: 'realistic' | 'animated',
  avatarId: string,
  displayName: string,
): Promise<void> {
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      UPDATE c.brand_avatar
      SET heygen_avatar_id = '${avatarId}',
          avatar_display_name = '${displayName.replace(/'/g, "''")}',
          is_active = true
      WHERE stakeholder_id = '${stakeholderId}'
        AND render_style = '${renderStyle}'
    `,
  });
  if (error) throw new Error(`DB write failed: ${error.message}`);
  console.log(`[avatar-creator] ✓ wrote avatar_id=${avatarId} render_style=${renderStyle}`);
}

async function updateStakeholderTimestamp(
  supabase: ReturnType<typeof getServiceClient>,
  stakeholderId: string,
): Promise<void> {
  await supabase.rpc('exec_sql', {
    query: `UPDATE c.brand_stakeholder SET last_generated_at = NOW() WHERE stakeholder_id = '${stakeholderId}'`,
  });
}

// ── Core pipeline: one stakeholder + one style ─────────────────────────────────

async function runPipeline(opts: {
  supabase:      ReturnType<typeof getServiceClient>;
  apiKey:        string;
  stakeholderId: string;
  roleLabel:     string;
  brief:         Record<string, string>;
  renderStyle:   'realistic' | 'animated';
}): Promise<{ avatarId: string; durationMs: number }> {
  const { supabase, apiKey, stakeholderId, roleLabel, brief, renderStyle } = opts;
  const start = Date.now();
  const hgStyle = renderStyle === 'realistic' ? 'Realistic' : 'Animated';
  const displayName = `${roleLabel} (${renderStyle.charAt(0).toUpperCase() + renderStyle.slice(1)})`;

  const generationId = await generatePhotos(apiKey, brief, hgStyle);
  const groupId      = await pollGeneration(apiKey, generationId);
  await trainGroup(apiKey, groupId);
  const avatarId     = await pollTraining(apiKey, groupId);

  await writeToBrandAvatar(supabase, stakeholderId, renderStyle, avatarId, displayName);
  await updateStakeholderTimestamp(supabase, stakeholderId);

  return { avatarId, durationMs: Date.now() - start };
}

// ── Fetch stakeholders ─────────────────────────────────────────────────────────

async function fetchStakeholders(
  supabase: ReturnType<typeof getServiceClient>,
  opts: { stakeholderId?: string; clientId?: string },
): Promise<Array<{ stakeholder_id: string; role_label: string; character_brief: Record<string, string> | null }>> {
  const where = opts.stakeholderId
    ? `stakeholder_id = '${opts.stakeholderId}'`
    : `client_id = '${opts.clientId}'`;
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `SELECT stakeholder_id, role_label, character_brief FROM c.brand_stakeholder WHERE ${where} AND is_active = true ORDER BY sort_order ASC`,
  });
  if (error) throw new Error(`Failed to fetch stakeholders: ${error.message}`);
  return (data ?? []) as any[];
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  const expectedKey = Deno.env.get('PUBLISHER_API_KEY');
  const providedKey = req.headers.get('x-publisher-key');
  if (!expectedKey) return json({ ok: false, error: 'PUBLISHER_API_KEY not configured' }, 500);
  if (providedKey !== expectedKey) return json({ ok: false, error: 'Unauthorized' }, 401);

  if (req.method === 'GET') {
    return json({ ok: true, version: VERSION,
      endpoints: { generate: 'POST /v2/photo_avatar/photo/generate', poll_generate: 'GET /v2/photo_avatar/generation/{id}', train: 'POST /v2/photo_avatar/train', poll_training: 'GET /v2/photo_avatar/{group_id}' },
    });
  }

  const apiKey = Deno.env.get('ICE_HEYGEN_API_KEY');
  if (!apiKey) return json({ ok: false, error: 'ICE_HEYGEN_API_KEY not configured' }, 500);

  const supabase = getServiceClient();

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Invalid JSON body' }, 400); }

  const { stakeholder_id, client_id, render_style = 'both' } = body ?? {};
  if (!stakeholder_id && !client_id) return json({ ok: false, error: 'Provide stakeholder_id or client_id' }, 400);
  if (!['realistic', 'animated', 'both'].includes(render_style)) return json({ ok: false, error: 'render_style must be realistic | animated | both' }, 400);

  let stakeholders: any[];
  try { stakeholders = await fetchStakeholders(supabase, { stakeholderId: stakeholder_id, clientId: client_id }); }
  catch (e: any) { return json({ ok: false, error: e.message }, 500); }
  if (!stakeholders.length) return json({ ok: false, error: 'No active stakeholders found' }, 404);

  const styles: Array<'realistic' | 'animated'> =
    render_style === 'both' ? ['realistic', 'animated'] : [render_style as 'realistic' | 'animated'];

  const results: any[] = [];
  const startedAt = nowIso();

  for (const s of stakeholders) {
    if (!s.character_brief) {
      results.push({ stakeholder_id: s.stakeholder_id, role_label: s.role_label, status: 'skipped', reason: 'character_brief is null' });
      continue;
    }
    for (const style of styles) {
      console.log(`\n[avatar-creator] ── ${s.role_label} / ${style} ──`);
      try {
        const { avatarId, durationMs } = await runPipeline({ supabase, apiKey, stakeholderId: s.stakeholder_id, roleLabel: s.role_label, brief: s.character_brief, renderStyle: style });
        results.push({ stakeholder_id: s.stakeholder_id, role_label: s.role_label, render_style: style, status: 'created', avatar_id: avatarId, duration_s: Math.round(durationMs / 1000) });
      } catch (e: any) {
        const msg = (e?.message ?? String(e)).slice(0, 800);
        console.error(`[avatar-creator] FAILED ${s.role_label}/${style}:`, msg);
        results.push({ stakeholder_id: s.stakeholder_id, role_label: s.role_label, render_style: style, status: 'failed', error: msg });
      }
    }
  }

  const created = results.filter(r => r.status === 'created').length;
  const failed  = results.filter(r => r.status === 'failed').length;
  return json({ ok: failed === 0, version: VERSION, started_at: startedAt, finished_at: nowIso(), created, failed, skipped: results.filter(r => r.status === 'skipped').length, results });
});
