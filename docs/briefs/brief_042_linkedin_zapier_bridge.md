# Brief 042 — LinkedIn via Zapier webhook bridge

**Date:** 14 April 2026  
**Phase:** 3 — Platform expansion  
**Repo:** `Invegent-content-engine`  
**Working directory:** `C:\Users\parve\Invegent-content-engine`  
**Supabase project:** `mbkmaxqhsohbtwsqolns`  
**MCPs required:** Supabase MCP, GitHub MCP  
**Estimated time:** 3–4 hours (plus PK Zapier setup time)  
**Deploy manually:** `npx supabase functions deploy linkedin-zapier-publisher --project-ref mbkmaxqhsohbtwsqolns`

---

## Context

LinkedIn's Community Management API (`w_organization_social` scope) is still in review.
Direct LinkedIn publishing is blocked until it is approved.

**Workaround:** Route LinkedIn posts through Zapier, which has pre-approved LinkedIn
organisation publishing permissions. ICE sends post content via webhook. Zapier posts
to the LinkedIn Company Page using its own OAuth.

**Architecture:**
```
Approved Facebook draft
  → cross-post function copies to LinkedIn queue
  → linkedin-zapier-publisher picks up queue item
  → POSTs to Zapier webhook URL (stored per client)
  → Zapier posts to LinkedIn Company Page
  → post_publish record written
```

**Why cross-post not re-seed:**  
The bundler seeder only creates seeds for `platform='facebook'`. Rather than doubling
AI costs by generating separate LinkedIn drafts, this brief cross-posts approved
Facebook drafts to the LinkedIn queue. The content is reused as-is.

**Rollback path:**  
When Community Management API is approved: delete Zapier webhook URL from profiles,
insert real LinkedIn access tokens, re-enable the existing `linkedin-publisher` cron.
No code changes required to any other part of the pipeline.

---

## PART 1 — PK MANUAL: Zapier setup

**Do this before running Claude Code.**

### Step 1 — Zapier account

Go to [zapier.com](https://zapier.com). Create an account or log in.

Recommended plan: **Starter ($19.99/month)**.
Estimated task volume: 5 posts/week × 4 brands = ~80 tasks/month. Starter covers 750 tasks.
Free plan (100 tasks/month) is too tight — don’t use it.

### Step 2 — Create 4 Zaps (one per LinkedIn page)

Repeat this process for each brand: **NDIS Yarns, Property Pulse, Care For Welfare, Invegent**.

**For each Zap:**

1. Click **Create Zap**
2. **Trigger:** Search for “Webhooks by Zapier” → select **Catch Hook**
   - No setup needed — Zapier generates a unique webhook URL
   - Click **Continue** → copy the webhook URL (you’ll need it in Part 2)
   - Click **Test trigger** — it will wait for a test payload
3. **Action:** Search for “LinkedIn” → select **Create Company Update**
   - Connect your LinkedIn account (pk@invegent.com) — only needed once, reused for all 4 Zaps
   - **Company:** select the correct page (NDIS Yarns / Property Pulse / Care For Welfare / Invegent)
   - **Message:** click the field → select **Text** from the webhook payload
   - Click **Continue** → **Test action** — this sends a test post to the LinkedIn page
   - Verify the test post appears on the LinkedIn page
4. Name the Zap clearly: e.g. “ICE → NDIS Yarns LinkedIn”
5. Click **Publish**

### Step 3 — Collect webhook URLs and org IDs

After creating all 4 Zaps, collect:

| Brand | Zapier webhook URL | LinkedIn page URL |
|---|---|---|
| NDIS Yarns | https://hooks.zapier.com/... | linkedin.com/company/... |
| Property Pulse | https://hooks.zapier.com/... | linkedin.com/company/... |
| Care For Welfare | https://hooks.zapier.com/... | linkedin.com/company/... |
| Invegent | https://hooks.zapier.com/... | linkedin.com/company/... |

Also get the **numeric org ID** for each page:
- Go to each LinkedIn page as an admin
- Click **Admin tools** → the browser URL will contain the numeric ID
  e.g. `https://www.linkedin.com/company/12345678/admin/` → org ID is `12345678`
- Org URN format: `urn:li:organization:12345678`

**Provide the webhook URLs and org URNs to Claude Code to run Part 2.**

---

## PART 2 — Claude Code execution

### Task 1 — Insert LinkedIn publish profiles

For each client, insert a LinkedIn publish profile.
`page_access_token` = Zapier webhook URL (not a real token — used as routing target).
`page_id` = org URN.

Replace all placeholder values with the actual URLs and URNs from Part 1:

```sql
-- NDIS Yarns
SELECT public.upsert_publish_profile(
  'fb98a472-ae4d-432d-8738-2273231c1ef4', 'linkedin',
  '{NDIS_YARNS_ZAPIER_WEBHOOK_URL}',
  '{NDIS_YARNS_ORG_URN}',
  'NDIS Yarns'
);

-- Property Pulse
SELECT public.upsert_publish_profile(
  '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd', 'linkedin',
  '{PROPERTY_PULSE_ZAPIER_WEBHOOK_URL}',
  '{PROPERTY_PULSE_ORG_URN}',
  'Property Pulse'
);

-- Care For Welfare
SELECT public.upsert_publish_profile(
  '3eca32aa-e460-462f-a846-3f6ace6a3cae', 'linkedin',
  '{CFW_ZAPIER_WEBHOOK_URL}',
  '{CFW_ORG_URN}',
  'Care For Welfare'
);
```

Verify:
```sql
SELECT c.client_name, cpp.platform, cpp.page_id, cpp.page_name,
  LEFT(cpp.page_access_token, 40) AS webhook_prefix
FROM c.client_publish_profile cpp
JOIN c.client c ON c.client_id = cpp.client_id
WHERE cpp.platform = 'linkedin'
ORDER BY c.client_name;
```

Expected: 3 rows (Invegent page is not a client record yet — skip for now).
All webhook_prefix values should start with `https://hooks.zapier.com`.

---

### Task 2 — Create cross-post function

This function copies recently approved Facebook drafts into LinkedIn queue items.
It runs on a schedule and only cross-posts drafts that haven’t been queued for LinkedIn yet.

```sql
CREATE OR REPLACE FUNCTION public.crosspost_facebook_to_linkedin(
  p_hours_lookback int DEFAULT 24,
  p_limit int DEFAULT 10
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted int := 0;
  v_rec record;
BEGIN
  FOR v_rec IN
    SELECT
      pd.post_draft_id,
      pd.client_id,
      pd.approved_at
    FROM m.post_draft pd
    -- Has an active LinkedIn publish profile
    INNER JOIN c.client_publish_profile cpp
      ON cpp.client_id = pd.client_id
      AND cpp.platform = 'linkedin'
      AND cpp.status = 'active'
      AND cpp.publish_enabled = true
      AND cpp.page_access_token IS NOT NULL
    WHERE
      pd.platform = 'facebook'
      AND pd.approval_status = 'approved'
      AND pd.approved_at > NOW() - (p_hours_lookback || ' hours')::interval
      -- Not already queued or published for LinkedIn
      AND NOT EXISTS (
        SELECT 1 FROM m.post_publish_queue ppq
        WHERE ppq.post_draft_id = pd.post_draft_id
          AND ppq.platform = 'linkedin'
      )
      AND NOT EXISTS (
        SELECT 1 FROM m.post_publish pp
        WHERE pp.post_draft_id = pd.post_draft_id
          AND pp.platform = 'linkedin'
      )
    ORDER BY pd.approved_at ASC
    LIMIT p_limit
  LOOP
    INSERT INTO m.post_publish_queue (
      post_draft_id, client_id, platform, status,
      scheduled_for, attempt_count
    ) VALUES (
      v_rec.post_draft_id,
      v_rec.client_id,
      'linkedin',
      'queued',
      NOW() + interval '5 minutes',
      0
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'queued_for_linkedin', v_inserted
  );
END;
$$;
```

Verify function created:
```sql
SELECT proname FROM pg_proc
WHERE proname = 'crosspost_facebook_to_linkedin'
  AND pronamespace = 'public'::regnamespace;
```

---

### Task 3 — Build linkedin-zapier-publisher Edge Function

Create `supabase/functions/linkedin-zapier-publisher/index.ts`:

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'linkedin-zapier-publisher-v1.0.0';
// Temporary bridge: routes LinkedIn queue items to Zapier webhook.
// Zapier posts to LinkedIn Company Pages using its own approved OAuth.
// Replace with direct linkedin-publisher when Community Management API is approved.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-publisher-key',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

  // Step 1: Run cross-post to populate LinkedIn queue from approved FB drafts
  const { data: crossPostResult } = await supabase.rpc('crosspost_facebook_to_linkedin', {
    p_hours_lookback: 48,
    p_limit: 20,
  });
  console.log(`[zapier-pub] cross-post result:`, JSON.stringify(crossPostResult));

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
    return jsonResponse({
      ok: true, version: VERSION,
      message: 'no_linkedin_jobs',
      cross_post: crossPostResult,
    });
  }

  const results: any[] = [];

  for (const q of rows) {
    const queueId = q.queue_id;
    const startMs = Date.now();

    try {
      // Load LinkedIn publish profile — page_access_token = Zapier webhook URL
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

      if (!zapierWebhookUrl || !zapierWebhookUrl.startsWith('https://hooks.zapier.com')) {
        throw new Error('invalid_zapier_webhook_url: token field must contain a Zapier webhook URL');
      }

      // Load draft content
      const { data: draft } = await supabase
        .schema('m')
        .from('post_draft')
        .select('post_draft_id, draft_title, draft_body')
        .eq('post_draft_id', q.post_draft_id)
        .maybeSingle();

      if (!draft) throw new Error('post_draft_not_found');

      const title = (draft.draft_title ?? '').trim();
      const body = (draft.draft_body ?? '').trim();
      if (!title && !body) throw new Error('empty_draft');

      const text = `${title}${title && body ? '\n\n' : ''}${body}`.trim().slice(0, 3000);

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
      const webhookPayload = {
        text,
        title,
        client_name: prof.page_name,
        post_draft_id: q.post_draft_id,
        queue_id: queueId,
        published_at: nowIso(),
      };

      const zapResp = await fetch(zapierWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      const zapText = await zapResp.text();
      if (!zapResp.ok) {
        throw new Error(`zapier_webhook_${zapResp.status}: ${zapText.slice(0, 400)}`);
      }

      const durationMs = Date.now() - startMs;
      const platformPostId = `zapier-${Date.now()}`;

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
        request_payload: { webhook_url: zapierWebhookUrl.slice(0, 60) + '...', text_length: text.length },
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
        duration_ms: durationMs,
      });

      console.log(`[zapier-pub] ${VERSION} posted to ${prof.page_name} in ${durationMs}ms`);

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
    ok: true, version: VERSION,
    worker_id: workerId,
    cross_post: crossPostResult,
    locked: rows.length,
    processed: results.length,
    results,
  });
});
```

---

### Task 4 — Add cron job

The existing `linkedin-publisher` cron runs every 15 minutes. We need to add a new one
for the Zapier publisher. The existing linkedin-publisher cron will be harmless — it
will find no profiles with valid tokens and do nothing.

```sql
-- Add cron for linkedin-zapier-publisher (runs every 20 minutes, offset from other publishers)
SELECT cron.schedule(
  'linkedin-zapier-publisher-every-20m',
  '*/20 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/linkedin-zapier-publisher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-publisher-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'PUBLISHER_API_KEY')
    ),
    body := '{}'
  );
  $$
);
```

Verify:
```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'linkedin-zapier-publisher-every-20m';
```

---

### Task 5 — Deploy

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/linkedin-zapier-publisher/
git commit -m "feat: linkedin-zapier-publisher v1.0.0 — Zapier webhook bridge for LinkedIn publishing"
git push origin main
npx supabase functions deploy linkedin-zapier-publisher --project-ref mbkmaxqhsohbtwsqolns
```

---

### Task 6 — End-to-end test

Trigger manually with dry_run first:

```powershell
# Dry run — checks cross-posting logic without sending to Zapier
curl -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/linkedin-zapier-publisher `
  -H "Content-Type: application/json" `
  -H "x-publisher-key: $env:PUBLISHER_API_KEY" `
  -d '{"dry_run": true}'
```

Check the response:
- `cross_post.queued_for_linkedin` should be > 0 if there are recent approved FB drafts
- `results` should show `dry_run_ok` entries

Then do a real run:
```powershell
curl -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/linkedin-zapier-publisher `
  -H "Content-Type: application/json" `
  -H "x-publisher-key: $env:PUBLISHER_API_KEY" `
  -d '{}'
```

Verify in DB:
```sql
SELECT pp.platform, pp.platform_post_id, pp.published_at, c.client_name
FROM m.post_publish pp
JOIN c.client c ON c.client_id = pp.client_id
WHERE pp.platform = 'linkedin'
ORDER BY pp.published_at DESC
LIMIT 5;
```

And check the LinkedIn pages directly — posts should appear within 1–2 minutes of Zapier receiving the webhook.

---

### Task 7 — Write result file

Write `docs/briefs/brief_042_result.md`:
- LinkedIn publish profiles inserted: yes/no per client
- crosspost_facebook_to_linkedin function: created
- linkedin-zapier-publisher: deployed
- Cron job: active
- Dry run result: how many drafts cross-posted
- Live test result: posts visible on LinkedIn pages yes/no
- Any errors

---

## Rollback when Community Management API is approved

When LinkedIn approves the API (check 13 May 2026 — evaluate Late.dev middleware if still pending):

1. Generate a real LinkedIn member access token with `w_organization_social` scope
2. Update each LinkedIn publish profile: replace Zapier webhook URL with real token
3. Disable the `linkedin-zapier-publisher-every-20m` cron job
4. The existing `linkedin-publisher` cron (already running every 15min) takes over automatically
5. Delete the Zapier Zaps — no longer needed

```sql
-- Disable Zapier cron when switching to direct API
SELECT cron.unschedule('linkedin-zapier-publisher-every-20m');
```

---

## Error handling

- If `cross_post.queued_for_linkedin` is 0: no approved FB drafts in the last 48h. This is not
  an error — it just means no content to cross-post yet. Check if NDIS Yarns or PP have had
  any approved drafts recently with `SELECT * FROM m.post_draft WHERE approval_status='approved'
  AND approved_at > NOW() - INTERVAL '48 hours' LIMIT 5`.
- If Zapier returns 4xx: webhook URL is wrong or the Zap is paused. Check Zapier dashboard.
- If Zapier returns 200 but post doesn’t appear on LinkedIn: the Zap action failed. Check
  Zapier task history for error details.
- Never modify the `linkedin-publisher` function — it should remain untouched for clean rollback.
