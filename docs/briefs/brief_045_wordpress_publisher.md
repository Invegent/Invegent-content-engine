# Brief 045 — WordPress publisher for Care For Welfare

**Date:** 14 April 2026
**Phase:** 3 — Website SEO
**Repo:** `Invegent-content-engine`
**Working directory:** `C:\Users\parve\Invegent-content-engine`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** Supabase MCP, GitHub MCP
**Estimated time:** 2–3 hours
**Deploy manually:** `npx supabase functions deploy wordpress-publisher --project-ref mbkmaxqhsohbtwsqolns`

---

## Context

Care For Welfare has a live WordPress site at careforwelfare.com.au.
Yoast SEO is installed. The site already has an "NDIS News" blog category.
ICE generates 150–280 word posts from real NDIS signals.
Publishing those posts to WordPress gives CFW permanent indexed URLs on Google
for NDIS-related searches — free organic traffic from people actively searching
for what CFW offers.

**Credentials stored:**
- WordPress URL: `https://www.careforwelfare.com.au`
- Username: `admin`
- Application Password: stored in Supabase secret `CFW_WP_APP_PASSWORD`
- Category: `ndis-news`
- Config stored in `c.client.profile` JSONB for client_id `3eca32aa-e460-462f-a846-3f6ace6a3cae`

**Pattern:** Cross-post pattern (same as instagram-publisher).
queries `m.post_draft` directly for approved drafts not yet published to `website`.
No queue changes needed.

---

## Task 1 — Verify Application Password works

Before writing any code, test the WP REST API from PowerShell:

```powershell
$username = "admin"
$appPassword = "U258 Of6q CqDD SvIN zkfC tUBn"
$base64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$username`:$appPassword"))
$headers = @{ Authorization = "Basic $base64" }

$resp = Invoke-RestMethod -Uri "https://www.careforwelfare.com.au/wp-json/wp/v2/users/me" -Headers $headers
Write-Host "Logged in as: $($resp.name) (id: $($resp.id))"
```

Expected: returns user details for admin.
If 401: the Application Password wasn't saved correctly. Regenerate in WordPress admin.

---

## Task 2 — Get the NDIS News category ID

```powershell
$resp = Invoke-RestMethod -Uri "https://www.careforwelfare.com.au/wp-json/wp/v2/categories?slug=ndis-news" -Headers $headers
Write-Host "Category ID: $($resp[0].id) Name: $($resp[0].name)"
```

Note the category ID — it will be used in the Edge Function.
If `ndis-news` doesn't exist, check what categories are available:
```powershell
$resp = Invoke-RestMethod -Uri "https://www.careforwelfare.com.au/wp-json/wp/v2/categories" -Headers $headers
$resp | ForEach-Object { Write-Host "$($_.id): $($_.name) ($($_.slug))" }
```

If no NDIS News category exists, create it:
```powershell
$body = @{ name = "NDIS News"; slug = "ndis-news" } | ConvertTo-Json
$resp = Invoke-RestMethod -Uri "https://www.careforwelfare.com.au/wp-json/wp/v2/categories" -Method POST -Headers ($headers + @{"Content-Type"="application/json"}) -Body $body
Write-Host "Created category ID: $($resp.id)"
```

---

## Task 3 — Build wordpress-publisher Edge Function

Create `supabase/functions/wordpress-publisher/index.ts`:

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'wordpress-publisher-v1.0.0';
// Publishes approved ICE drafts to WordPress sites via REST API.
// Cross-post pattern: queries post_draft directly, no queue changes.
// Currently configured for Care For Welfare (careforwelfare.com.au).
// Extensible: any client with wp_site_url + wp_username in c.client.profile
// and a WP app password secret will be picked up automatically.

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '');
}

async function getWpCategoryId(
  siteUrl: string,
  authHeader: string,
  categorySlug: string
): Promise<number | null> {
  try {
    const resp = await fetch(
      `${siteUrl}/wp-json/wp/v2/categories?slug=${categorySlug}`,
      { headers: { Authorization: authHeader } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.[0]?.id ?? null;
  } catch { return null; }
}

async function publishToWordPress(opts: {
  siteUrl: string;
  authHeader: string;
  title: string;
  content: string;
  slug: string;
  categoryId: number | null;
  excerpt: string;
}): Promise<{ postId: number; postUrl: string }> {
  const { siteUrl, authHeader, title, content, slug, categoryId, excerpt } = opts;

  const body: Record<string, unknown> = {
    title,
    content,
    slug,
    status: 'publish',
    excerpt,
    meta: {},
  };
  if (categoryId) body.categories = [categoryId];

  const resp = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`wp_api_${resp.status}: ${JSON.stringify(data).slice(0, 400)}`);
  }
  return { postId: Number(data.id), postUrl: data.link };
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

  const dryRun = Boolean(body.dry_run ?? false);
  const results: any[] = [];

  // Find all active clients with WordPress config in profile
  const { data: clients } = await supabase.rpc('exec_sql', {
    query: `
      SELECT client_id, client_name,
        profile->>'wp_site_url' AS wp_site_url,
        profile->>'wp_username' AS wp_username,
        profile->>'wp_category_slug' AS wp_category_slug,
        profile->>'wp_secret_env_key' AS wp_secret_env_key
      FROM c.client
      WHERE status = 'active'
        AND profile->>'website_publish_enabled' = 'true'
        AND profile->>'wp_site_url' IS NOT NULL
        AND profile->>'wp_username' IS NOT NULL
    `,
  });

  for (const client of (clients as any[] ?? [])) {
    const { client_id, client_name, wp_site_url, wp_username, wp_category_slug } = client;

    // Resolve app password from env
    // Convention: CFW_WP_APP_PASSWORD, or use wp_secret_env_key if set
    const envKey = client.wp_secret_env_key ?? 'CFW_WP_APP_PASSWORD';
    const appPassword = Deno.env.get(envKey);
    if (!appPassword) {
      console.error(`[wp-pub] No app password env var ${envKey} for ${client_name}`);
      results.push({ client: client_name, status: 'skipped', reason: `missing_env_${envKey}` });
      continue;
    }

    const authHeader = 'Basic ' + btoa(`${wp_username}:${appPassword}`);

    // Get category ID
    const categoryId = wp_category_slug
      ? await getWpCategoryId(wp_site_url, authHeader, wp_category_slug)
      : null;

    // Find approved drafts not yet published to website
    const { data: drafts } = await supabase.rpc('exec_sql', {
      query: `
        SELECT pd.post_draft_id, pd.draft_title, pd.draft_body, pd.client_id
        FROM m.post_draft pd
        WHERE pd.client_id = '${client_id}'
          AND pd.approval_status = 'approved'
          AND pd.platform = 'facebook'
          AND pd.draft_title IS NOT NULL
          AND pd.draft_body IS NOT NULL
          AND LENGTH(pd.draft_body) > 50
          AND NOT EXISTS (
            SELECT 1 FROM m.post_publish pp
            WHERE pp.post_draft_id = pd.post_draft_id
              AND pp.platform = 'website'
          )
        ORDER BY pd.approved_at ASC
        LIMIT 3
      `,
    });

    for (const draft of (drafts as any[] ?? [])) {
      const { post_draft_id, draft_title, draft_body } = draft;
      const startMs = Date.now();

      try {
        const title = (draft_title ?? '').trim();
        const content = (draft_body ?? '').trim();
        const slug = slugify(title);
        const excerpt = content.slice(0, 155).replace(/\s\w+$/, '...');

        if (dryRun) {
          results.push({ post_draft_id, client: client_name, status: 'dry_run_ok', title, slug });
          continue;
        }

        const { postId, postUrl } = await publishToWordPress({
          siteUrl: wp_site_url,
          authHeader,
          title,
          content,
          slug,
          categoryId,
          excerpt,
        });

        // Write post_publish record
        await supabase.schema('m').from('post_publish').insert({
          post_draft_id,
          client_id,
          platform: 'website',
          platform_post_id: String(postId),
          published_at: nowIso(),
          status: 'published',
          attempt_no: 1,
          response_payload: {
            wp_post_id: postId,
            wp_post_url: postUrl,
            wp_site: wp_site_url,
            duration_ms: Date.now() - startMs,
          },
          created_at: nowIso(),
        });

        results.push({
          post_draft_id,
          client: client_name,
          status: 'published',
          wp_post_id: postId,
          wp_post_url: postUrl,
          duration_ms: Date.now() - startMs,
        });

        console.log(`[wp-pub] ${VERSION} published to ${wp_site_url}: ${postUrl}`);

      } catch (e: any) {
        const errMsg = (e?.message ?? String(e)).slice(0, 2000);
        console.error(`[wp-pub] failed ${post_draft_id}:`, errMsg);
        results.push({ post_draft_id, client: client_name, status: 'failed', error: errMsg });
      }
    }
  }

  return jsonResponse({
    ok: true, version: VERSION,
    dry_run: dryRun,
    processed: results.length,
    results,
  });
});
```

---

## Task 4 — Add cron job

```sql
SELECT cron.schedule(
  'wordpress-publisher-every-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/wordpress-publisher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-publisher-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'PUBLISHER_API_KEY')
    ),
    body := '{}'
  );
  $$
);
```

Why every 6 hours (not 15 minutes): WordPress posts are permanent indexed content.
Publishing 3-4 posts per day per client is ideal for SEO.
Too many posts too fast looks spammy to Google.

Verify:
```sql
SELECT jobname, schedule, active FROM cron.job
WHERE jobname = 'wordpress-publisher-every-6h';
```

---

## Task 5 — Deploy

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/wordpress-publisher/
git commit -m "feat: wordpress-publisher v1.0.0 — ICE to WordPress cross-post via REST API"
git push origin main
npx supabase functions deploy wordpress-publisher --project-ref mbkmaxqhsohbtwsqolns
```

---

## Task 6 — Test

Dry run first:
```powershell
curl -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/wordpress-publisher `
  -H "Content-Type: application/json" `
  -H "x-publisher-key: $env:PUBLISHER_API_KEY" `
  -d '{"dry_run": true}'
```

Expected: shows drafts that would be published, with title and slug. No actual posts created.

Then live run:
```powershell
curl -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/wordpress-publisher `
  -H "Content-Type: application/json" `
  -H "x-publisher-key: $env:PUBLISHER_API_KEY" `
  -d '{}'
```

Verify in DB:
```sql
SELECT pp.platform, pp.platform_post_id,
  pp.response_payload->>'wp_post_url' AS post_url,
  pp.published_at, c.client_name
FROM m.post_publish pp
JOIN c.client c ON c.client_id = pp.client_id
WHERE pp.platform = 'website'
ORDER BY pp.published_at DESC
LIMIT 5;
```

Also check careforwelfare.com.au/ndis-news/ — posts should appear there.

---

## Task 7 — Write result file

Write `docs/briefs/brief_045_result.md`:
- Category ID found: yes/no, ID number
- API auth test: passed/failed
- Dry run: how many drafts would be published
- Live run: posts published, URLs
- Posts visible on careforwelfare.com.au/ndis-news/: yes/no
- Any errors

---

## Error handling

- If API returns 401: Application Password is wrong or username is wrong.
  Double-check in WordPress Admin → Users → Profile → Application Passwords.
  The password must include the spaces exactly as shown: `U258 Of6q CqDD SvIN zkfC tUBn`
- If API returns 403: REST API may be blocked by a security plugin.
  In WordPress Admin → Settings → Permalinks → Save (re-enables REST API).
  Or check if a plugin like Wordfence is blocking API access.
- If slug already exists: WordPress will auto-append -2, -3 etc. Not an error.
- If category not found: posts will publish without a category. Not fatal.
  Run the category creation PowerShell command from Task 2.
- Never publish drafts with `draft_body` under 50 characters — already filtered in query.
