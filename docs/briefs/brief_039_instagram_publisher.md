# Brief 039 — instagram-publisher v1.0.0

**Date:** 14 April 2026  
**Phase:** 3 — Platform expansion  
**Repo:** `Invegent-content-engine`  
**Working directory:** `C:\Users\parve\Invegent-content-engine`  
**Supabase project:** `mbkmaxqhsohbtwsqolns`  
**MCPs required:** Supabase MCP, GitHub MCP  
**Estimated time:** 3–4 hours  
**Deploy manually:** `npx supabase functions deploy instagram-publisher --project-ref mbkmaxqhsohbtwsqolns`

---

## Context

Instagram does not exist anywhere in ICE. No publisher, no queue items, no publish profiles. This brief builds it from scratch.

**Architecture decision:** Cross-post pattern (same as youtube-publisher). The instagram-publisher queries `m.post_draft` directly for approved drafts with `image_url` or `video_url` that haven't been published to Instagram yet. No changes needed to seeding, queue, or auto-approver.

**Token model:** Instagram Business publishing uses the same Facebook Page Access Token. The `page_access_token` on the Instagram publish profile = the Facebook token. The `page_id` = the Instagram Business Account ID (NOT the Facebook page ID — they are different numbers).

**Format support:**
- `image_quote`, `carousel` → Instagram image post (single image from `image_url`)
- `video_short_kinetic`, `video_short_stat`, `video_short_kinetic_voice`, `video_short_stat_voice`, `video_short_avatar` → Instagram Reels (from `video_url`)
- `text` → SKIP. Instagram does not support text-only posts. Mark as skipped in logs, do not fail.

---

## Task 1 — Auto-configure Instagram publish profiles for NDIS Yarns and Property Pulse

Before building the publisher, set up the two existing clients for Instagram.

### 1a — Get Instagram Business Account IDs

For each client, call the Graph API using their existing Facebook page token to retrieve the linked Instagram Business Account ID.

```sql
-- Get NDIS Yarns Facebook credentials
SELECT page_access_token, page_id, page_name, client_id
FROM c.client_publish_profile
WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'
  AND platform = 'facebook';

-- Get Property Pulse Facebook credentials
SELECT page_access_token, page_id, page_name, client_id
FROM c.client_publish_profile
WHERE client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
  AND platform = 'facebook';
```

For each client, call this URL using PowerShell:

```powershell
# Replace {PAGE_ID} and {TOKEN} with values from above
$response = Invoke-RestMethod -Uri "https://graph.facebook.com/v19.0/{PAGE_ID}?fields=instagram_business_account&access_token={TOKEN}"
$igUserId = $response.instagram_business_account.id
Write-Host "IG User ID: $igUserId"
```

Expected: a numeric string like `17841400000000000`.

If the response has no `instagram_business_account` field, the Facebook page does not have a linked Instagram Business account. Stop and report this — do not proceed with that client.

### 1b — Insert Instagram publish profiles

Use the IG User IDs retrieved above. Same token as Facebook. Run via exec_sql:

```sql
-- NDIS Yarns Instagram (replace {IG_USER_ID_NY} and {FB_TOKEN_NY} with actual values)
INSERT INTO c.client_publish_profile (
  client_id, platform, status, publish_enabled,
  page_access_token, page_id, page_name,
  image_generation_enabled, video_generation_enabled,
  auto_approve_enabled, require_client_approval
) VALUES (
  'fb98a472-ae4d-432d-8738-2273231c1ef4',
  'instagram', 'active', true,
  '{FB_TOKEN_NY}', '{IG_USER_ID_NY}', 'NDIS Yarns',
  true, true, true, false
)
ON CONFLICT (client_id, platform) DO NOTHING;

-- Property Pulse Instagram (replace {IG_USER_ID_PP} and {FB_TOKEN_PP})
INSERT INTO c.client_publish_profile (
  client_id, platform, status, publish_enabled,
  page_access_token, page_id, page_name,
  image_generation_enabled, video_generation_enabled,
  auto_approve_enabled, require_client_approval
) VALUES (
  '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd',
  'instagram', 'active', true,
  '{FB_TOKEN_PP}', '{IG_USER_ID_PP}', 'Property Pulse',
  true, true, true, false
)
ON CONFLICT (client_id, platform) DO NOTHING;
```

Verify:
```sql
SELECT client_id, platform, page_id, page_name, publish_enabled
FROM c.client_publish_profile
WHERE platform = 'instagram';
```

Expected: 2 rows.

---

## Task 2 — Build instagram-publisher Edge Function

Create `supabase/functions/instagram-publisher/index.ts`.

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'instagram-publisher-v1.0.0';
const IG_GRAPH_BASE = 'https://graph.facebook.com/v19.0';

const IG_IMAGE_FORMATS = new Set([
  'image_quote', 'carousel',
]);
const IG_VIDEO_FORMATS = new Set([
  'video_short_kinetic', 'video_short_stat',
  'video_short_kinetic_voice', 'video_short_stat_voice',
  'video_short_avatar',
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-instagram-publisher-key',
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
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function igPost(url: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams(params);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await resp.json();
  if (!resp.ok || data.error) {
    throw new Error(`IG API error ${resp.status}: ${JSON.stringify(data.error ?? data).slice(0, 400)}`);
  }
  return data;
}

async function igGet(url: string): Promise<any> {
  const resp = await fetch(url);
  const data = await resp.json();
  if (!resp.ok || data.error) {
    throw new Error(`IG GET error ${resp.status}: ${JSON.stringify(data.error ?? data).slice(0, 400)}`);
  }
  return data;
}

async function pollVideoStatus(creationId: string, accessToken: string, maxWaitMs = 300_000): Promise<void> {
  const pollUrl = `${IG_GRAPH_BASE}/${creationId}?fields=status_code&access_token=${accessToken}`;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const data = await igGet(pollUrl);
    const statusCode = data.status_code;
    console.log(`[instagram-publisher] video status: ${statusCode}`);
    if (statusCode === 'FINISHED') return;
    if (statusCode === 'ERROR') throw new Error(`IG video processing failed: ${JSON.stringify(data)}`);
    await new Promise(r => setTimeout(r, 10_000));
  }
  throw new Error('IG video processing timed out after 5 minutes');
}

async function publishToInstagram(opts: {
  igUserId: string;
  accessToken: string;
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  isVideo: boolean;
}): Promise<string> {
  const { igUserId, accessToken, caption, imageUrl, videoUrl, isVideo } = opts;
  const mediaUrl = `${IG_GRAPH_BASE}/${igUserId}/media`;
  const publishUrl = `${IG_GRAPH_BASE}/${igUserId}/media_publish`;

  // Step 1: Create media container
  const containerParams: Record<string, string> = {
    caption: caption.slice(0, 2200),
    access_token: accessToken,
  };
  if (isVideo && videoUrl) {
    containerParams.video_url = videoUrl;
    containerParams.media_type = 'REELS';
  } else if (imageUrl) {
    containerParams.image_url = imageUrl;
  } else {
    throw new Error('No image_url or video_url available for Instagram post');
  }

  const container = await igPost(mediaUrl, containerParams);
  const creationId: string = container.id;
  if (!creationId) throw new Error('No creation_id returned from IG media container');

  // Step 2: Poll for video processing (images are instant)
  if (isVideo) {
    await pollVideoStatus(creationId, accessToken);
  }

  // Step 3: Publish
  const published = await igPost(publishUrl, {
    creation_id: creationId,
    access_token: accessToken,
  });
  const igMediaId: string = published.id;
  if (!igMediaId) throw new Error('No ig_media_id returned from publish');
  return igMediaId;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === 'GET') return jsonResponse({ ok: true, function: 'instagram-publisher', version: VERSION });

  const expected = Deno.env.get('PUBLISHER_API_KEY');
  const provided = req.headers.get('x-instagram-publisher-key');
  if (!expected) return jsonResponse({ ok: false, error: 'PUBLISHER_API_KEY_not_set' }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);

  const supabase = getServiceClient();
  const results: any[] = [];

  // Get all active Instagram publish profiles
  const { data: profiles } = await supabase.rpc('exec_sql', {
    query: `
      SELECT client_id, page_id AS ig_user_id, page_access_token, page_name
      FROM c.client_publish_profile
      WHERE platform = 'instagram'
        AND status = 'active'
        AND publish_enabled = true
        AND page_access_token IS NOT NULL
        AND page_id IS NOT NULL
    `,
  });

  for (const profile of (profiles as any[] ?? [])) {
    const { client_id, ig_user_id, page_access_token, page_name } = profile;

    // Find publishable drafts for this client:
    // - approved, with image_url or video_url
    // - not already published to Instagram
    // - format is not text
    const { data: drafts } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          pd.post_draft_id, pd.draft_title, pd.draft_body,
          pd.recommended_format, pd.image_url, pd.video_url
        FROM m.post_draft pd
        WHERE pd.client_id = '${client_id}'
          AND pd.approval_status = 'approved'
          AND pd.recommended_format IS NOT NULL
          AND pd.recommended_format != 'text'
          AND (
            (pd.image_url IS NOT NULL AND pd.image_url != '')
            OR (pd.video_url IS NOT NULL AND pd.video_url != '')
          )
          AND NOT EXISTS (
            SELECT 1 FROM m.post_publish pp
            WHERE pp.post_draft_id = pd.post_draft_id
              AND pp.platform = 'instagram'
          )
        ORDER BY pd.created_at ASC
        LIMIT 3
      `,
    });

    for (const draft of (drafts as any[] ?? [])) {
      const { post_draft_id, draft_title, draft_body, recommended_format, image_url, video_url } = draft;
      const startMs = Date.now();

      try {
        const isVideoFormat = IG_VIDEO_FORMATS.has(recommended_format);
        const isImageFormat = IG_IMAGE_FORMATS.has(recommended_format);

        if (!isVideoFormat && !isImageFormat) {
          console.log(`[instagram-publisher] skipping unsupported format ${recommended_format} for ${post_draft_id}`);
          results.push({ post_draft_id, status: 'skipped', reason: `format_not_supported_on_instagram: ${recommended_format}` });
          continue;
        }

        if (isVideoFormat && (!video_url || video_url === '')) {
          console.log(`[instagram-publisher] no video_url for ${post_draft_id}, skipping`);
          results.push({ post_draft_id, status: 'skipped', reason: 'no_video_url' });
          continue;
        }

        if (isImageFormat && (!image_url || image_url === '')) {
          console.log(`[instagram-publisher] no image_url for ${post_draft_id}, skipping`);
          results.push({ post_draft_id, status: 'skipped', reason: 'no_image_url' });
          continue;
        }

        const caption = `${draft_title}\n\n${draft_body}`.slice(0, 2200);

        const igMediaId = await publishToInstagram({
          igUserId: ig_user_id,
          accessToken: page_access_token,
          caption,
          imageUrl: image_url ?? undefined,
          videoUrl: video_url ?? undefined,
          isVideo: isVideoFormat,
        });

        const durationMs = Date.now() - startMs;
        const igPostUrl = `https://www.instagram.com/p/${igMediaId}/`;

        // Write post_publish record
        const { error: insertErr } = await supabase.schema('m').from('post_publish').insert({
          post_draft_id,
          client_id,
          platform: 'instagram',
          platform_post_id: igMediaId,
          published_at: nowIso(),
          status: 'published',
          attempt_no: 1,
          response_payload: {
            ig_media_id: igMediaId,
            ig_post_url: igPostUrl,
            format: recommended_format,
            duration_ms: durationMs,
          },
        });

        if (insertErr) {
          console.error(`[instagram-publisher] post_publish INSERT failed for ${igMediaId}:`, insertErr.message);
        }

        results.push({
          post_draft_id,
          status: 'published',
          ig_media_id: igMediaId,
          ig_post_url: igPostUrl,
          format: recommended_format,
          duration_ms: durationMs,
          audit_row_inserted: !insertErr,
        });

        console.log(`[instagram-publisher] ${VERSION} published ${igMediaId} for ${page_name} in ${durationMs}ms`);

      } catch (e: any) {
        const msg = (e?.message ?? String(e)).slice(0, 2000);
        console.error(`[instagram-publisher] failed ${post_draft_id}:`, msg);
        results.push({ post_draft_id, status: 'failed', error: msg });
      }
    }
  }

  if (!results.length) {
    return jsonResponse({ ok: true, message: 'no_instagram_posts_ready', version: VERSION });
  }
  return jsonResponse({ ok: true, version: VERSION, processed: results.length, results });
});
```

---

## Task 3 — Register instagram-publisher in k schema

```sql
INSERT INTO k.edge_function_registry (function_name, version, description, trigger_type, status)
VALUES (
  'instagram-publisher', 'v1.0.0',
  'Publishes approved drafts with image_url or video_url to Instagram Business accounts via Graph API. Cross-post pattern — queries post_draft directly, no queue changes required.',
  'cron',
  'active'
)
ON CONFLICT (function_name) DO UPDATE SET version = 'v1.0.0', status = 'active', updated_at = NOW();
```

---

## Task 4 — Add cron job

```sql
-- Run instagram-publisher every 15 minutes
SELECT cron.schedule(
  'instagram-publisher-every-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/instagram-publisher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-instagram-publisher-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'PUBLISHER_API_KEY')
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
WHERE jobname = 'instagram-publisher-every-15m';
```

---

## Task 5 — Deploy

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/instagram-publisher/
git commit -m "feat: instagram-publisher v1.0.0 — cross-post to Instagram via Graph API"
git push origin main
npx supabase functions deploy instagram-publisher --project-ref mbkmaxqhsohbtwsqolns
```

---

## Task 6 — Test

Trigger manually to confirm it runs without error:

```powershell
$publisherKey = (supabase secrets list --project-ref mbkmaxqhsohbtwsqolns | Where-Object { $_ -match 'PUBLISHER_API_KEY' })
# Or use the key directly from env
curl -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/instagram-publisher `
  -H "Content-Type: application/json" `
  -H "x-instagram-publisher-key: $PUBLISHER_API_KEY"
```

Then verify:
```sql
-- Check if any posts were published to Instagram
SELECT pp.post_draft_id, pp.platform, pp.platform_post_id, pp.published_at
FROM m.post_publish pp
WHERE pp.platform = 'instagram'
ORDER BY pp.published_at DESC
LIMIT 5;
```

Expected: At least 1 row if any approved drafts with image_url exist for NDIS Yarns or Property Pulse.

If 0 rows and no errors: check if any approved drafts exist with image_url set:
```sql
SELECT post_draft_id, recommended_format, image_url, video_url
FROM m.post_draft
WHERE approval_status = 'approved'
  AND recommended_format != 'text'
  AND (image_url IS NOT NULL OR video_url IS NOT NULL)
LIMIT 5;
```

If no such drafts exist, the publisher is correctly built — it just has nothing to post yet. Report this clearly in the result file.

---

## Task 7 — Write result file

Write `docs/briefs/brief_039_result.md`:
- Instagram Business Account IDs retrieved for NDIS Yarns and Property Pulse (or error if not linked)
- Publish profiles inserted
- instagram-publisher v1.0.0 deployed
- Cron job active
- Test result: posts published or "no posts ready"
- Any errors

---

## Error handling

- If IG API returns error code 190 (invalid/expired token): token is expired. Report to PK — do not retry.
- If IG API returns error code 24 (media not processable): the video_url format is not compatible with Instagram Reels. Log and skip.
- If the Facebook page has no linked Instagram Business account: report to PK — the page must be connected to an Instagram Business account in Facebook Business Manager before publishing can proceed.
- If `poll_video_status` times out: mark as failed with reason `ig_video_processing_timeout`. Do not publish.
