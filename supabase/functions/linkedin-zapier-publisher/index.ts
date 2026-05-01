import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'linkedin-zapier-publisher-v1.1.0';
// v1.1.0 (T13, 1 May 2026): APPROVAL GATE added — mirror IG v2.0.0 per-row pattern.
//   v1.0.0 had NO approval gate (didn't even SELECT approval_status).
//   28+ unreviewed posts published in 14d before this patch (T16 audit window).
//   F-PUB-005-class fix. ChatGPT-reviewed in 4 rounds; cleared by round-4.
// v1.0.0 (12 Mar 2026): Temporary bridge — routes LinkedIn queue items to Zapier webhooks.
// Zapier posts to LinkedIn Company Pages using its own approved OAuth.
// Replace with direct linkedin-publisher when Community Management API is approved.
//
// page_access_token on c.client_publish_profile (linkedin) = Zapier webhook URL
// page_id = org URN (urn:li:organization:XXXXXXXXX)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-publisher-key',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function nowIso() { return new Date().toISOString(); }
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return jsonResponse({ ok: true, version: VERSION });

  const expectedKey = Deno.env.get('PUBLISHER_API_KEY');
  const providedKey = req.headers.get('x-publisher-key') ?? '';
  if (expectedKey && providedKey !== expectedKey) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  const supabase = getServiceClient();
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body fine */ }

  const limit = Math.min(Math.max(Number(body.limit ?? 3), 1), 10);
  const workerId = `zapier-pub-${crypto.randomUUID().slice(0, 8)}`;
  const dryRun = Boolean(body.dry_run ?? false);

  // Step 1: Cross-post approved FB drafts into LinkedIn queue
  // (RPC disabled D154 18 Apr 2026 — returns no-op; native LinkedIn seeding via cron handles enqueue.)
  const { data: crossPostResult } = await supabase.rpc('crosspost_facebook_to_linkedin', {
    p_hours_lookback: 48,
    p_limit: 20,
  });
  console.log(`[zapier-pub] cross-post:`, JSON.stringify(crossPostResult));

  // Step 2: Lock LinkedIn queue items
  const { data: lockedRows, error: lockErr } = await supabase
    .schema('m')
    .rpc('publisher_lock_queue_v2', {
      p_limit: limit,
      p_worker_id: workerId,
      p_lock_seconds: 300,
      p_platform: 'linkedin',
    });

  if (lockErr) {
    return jsonResponse({ ok: false, error: 'lock_failed', detail: lockErr.message }, 500);
  }

  const rows = (lockedRows ?? []) as any[];
  if (!rows.length) {
    return jsonResponse({ ok: true, version: VERSION, message: 'no_linkedin_jobs', cross_post: crossPostResult });
  }

  const results: any[] = [];

  for (const q of rows) {
    const queueId = q.queue_id;
    const startMs = Date.now();

    try {
      // Load LinkedIn profile -- page_access_token = Zapier webhook URL
      const { data: prof } = await supabase
        .schema('c')
        .from('client_publish_profile')
        .select('page_access_token, page_id, page_name, publish_enabled')
        .eq('client_id', q.client_id)
        .eq('platform', 'linkedin')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (!prof) throw new Error('no_active_linkedin_profile');
      if (!prof.publish_enabled) throw new Error('publish_disabled');

      const zapierWebhookUrl = prof.page_access_token;
      const orgUrn = prof.page_id;

      if (!zapierWebhookUrl?.startsWith('https://hooks.zapier.com')) {
        throw new Error('invalid_zapier_webhook_url');
      }

      // Load draft
      // v1.1.0 (T13): added approval_status to SELECT for gate check below
      const { data: draft } = await supabase
        .schema('m')
        .from('post_draft')
        .select('post_draft_id, draft_title, draft_body, approval_status')
        .eq('post_draft_id', q.post_draft_id)
        .maybeSingle();

      if (!draft) throw new Error('post_draft_not_found');

      // v1.1.0 (T13): APPROVAL GATE (mirror IG v2.0.0 per-row pattern).
      // Publisher previously had no gate — F-PUB-005-class fix.
      // 28+ unreviewed posts published in 14d before this patch (T16 audit window).
      if (draft.approval_status !== 'approved') {
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'queued',
          scheduled_for: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: `not_approved:${draft.approval_status}`,
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({ queue_id: queueId, status: 'held', reason: 'not_approved', draft_status: draft.approval_status });
        continue;
      }

      const title = (draft.draft_title ?? '').trim();
      const draftBody = (draft.draft_body ?? '').trim();
      if (!title && !draftBody) throw new Error('empty_draft');

      const text = `${title}${title && draftBody ? '\n\n' : ''}${draftBody}`.trim().slice(0, 3000);

      if (dryRun) {
        await supabase.schema('m').from('post_publish_queue').update({
          status: 'queued',
          scheduled_for: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: 'dry_run_ok',
          locked_at: null, locked_by: null, updated_at: nowIso(),
        }).eq('queue_id', queueId);
        results.push({ queue_id: queueId, status: 'dry_run_ok', text_length: text.length });
        continue;
      }

      // POST to Zapier webhook
      const zapResp = await fetch(zapierWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          title,
          client_name: prof.page_name,
          post_draft_id: q.post_draft_id,
          queue_id: queueId,
        }),
      });

      const zapText = await zapResp.text();
      if (!zapResp.ok) throw new Error(`zapier_${zapResp.status}: ${zapText.slice(0, 400)}`);

      const durationMs = Date.now() - startMs;
      const platformPostId = `zapier-li-${Date.now()}`;

      // Write post_publish record
      await supabase.schema('m').from('post_publish').insert({
        queue_id: queueId,
        post_draft_id: q.post_draft_id,
        client_id: q.client_id,
        platform: 'linkedin',
        destination_id: orgUrn,
        status: 'published',
        platform_post_id: platformPostId,
        published_at: nowIso(),
        request_payload: { webhook_prefix: zapierWebhookUrl.slice(0, 60), text_length: text.length },
        response_payload: { zapier_response: zapText.slice(0, 200), duration_ms: durationMs },
        error: null,
        created_at: nowIso(),
      });

      // Update queue
      await supabase.schema('m').from('post_publish_queue').update({
        status: 'published',
        last_error: null,
        locked_at: null, locked_by: null, updated_at: nowIso(),
      }).eq('queue_id', queueId);

      results.push({
        queue_id: queueId,
        post_draft_id: q.post_draft_id,
        status: 'published',
        platform_post_id: platformPostId,
        client: prof.page_name,
        duration_ms: durationMs,
      });

      console.log(`[zapier-pub] ${VERSION} → ${prof.page_name} in ${durationMs}ms`);

    } catch (e: any) {
      const errMsg = (e?.message ?? String(e)).slice(0, 2000);
      console.error(`[zapier-pub] failed ${queueId}:`, errMsg);
      await supabase.schema('m').from('post_publish_queue').update({
        status: 'queued',
        scheduled_for: new Date(Date.now() + 15 * 60_000).toISOString(),
        last_error: errMsg,
        locked_at: null, locked_by: null, updated_at: nowIso(),
      }).eq('queue_id', queueId);
      results.push({ queue_id: queueId, status: 'failed', error: errMsg });
    }
  }

  return jsonResponse({
    ok: true, version: VERSION, worker_id: workerId,
    cross_post: crossPostResult,
    locked: rows.length, processed: results.length, results,
  });
});
