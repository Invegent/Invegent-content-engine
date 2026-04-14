import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'wordpress-publisher-v1.0.0';
// Publishes approved ICE drafts to WordPress sites via REST API.
// Cross-post pattern: queries post_draft directly, no queue changes.
// Currently configured for Care For Welfare (careforwelfare.com.au).
// Extensible: any client with wp_site_url + wp_username in c.client.profile
// and a WP app password secret will be picked up automatically.

// IMPORTANT: careforwelfare.com.au has Mod_Security which blocks requests
// without a standard User-Agent header. All fetch calls include a browser UA.
const WP_UA = 'Mozilla/5.0 (compatible; Invegent-WP-Publisher/1.0)';

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
      { headers: { Authorization: authHeader, 'User-Agent': WP_UA, Accept: 'application/json' } }
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
      'User-Agent': WP_UA,
      Accept: 'application/json',
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
  let reqBody: any = {};
  try { reqBody = await req.json(); } catch { /* empty body fine */ }

  const dryRun = Boolean(reqBody.dry_run ?? false);
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

    const envKey = client.wp_secret_env_key ?? 'CFW_WP_APP_PASSWORD';
    const appPassword = Deno.env.get(envKey);
    if (!appPassword) {
      console.error(`[wp-pub] No app password env var ${envKey} for ${client_name}`);
      results.push({ client: client_name, status: 'skipped', reason: `missing_env_${envKey}` });
      continue;
    }

    const authHeader = 'Basic ' + btoa(`${wp_username}:${appPassword}`);

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
          post_draft_id, client: client_name, status: 'published',
          wp_post_id: postId, wp_post_url: postUrl,
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
