# Claude Code Brief 024 — Portal Home Page

**Date:** 13 April 2026
**Phase:** A — Revenue Readiness
**Repo:** `invegent-portal`
**Working directory:** `C:\Users\parve\invegent-portal`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** GitHub MCP, Supabase MCP
**Estimated time:** 3–4 hours

---

## What this builds

The portal Home page currently shows a connect banner and nothing else.
A client who logs in today cannot see any evidence that ICE is working for them.

This brief builds the client-facing Home page — the screen that answers within
5 seconds: "How many posts went out this week? Is everything working?"

---

## Task 1 — Create DB functions

All queries use the portal session client_id. Use the existing `getPortalSession()`
pattern — extract client_id server-side, pass explicitly to SECURITY DEFINER functions.

### 1a — get_portal_home_stats(p_client_id UUID)

```sql
CREATE OR REPLACE FUNCTION public.get_portal_home_stats(p_client_id UUID)
RETURNS jsonb SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tz text;
BEGIN
  SELECT COALESCE(timezone, 'Australia/Sydney') INTO v_tz
  FROM c.client WHERE client_id = p_client_id;

  RETURN jsonb_build_object(
    'posts_this_week',
      (SELECT COUNT(*) FROM m.post_publish
       WHERE client_id = p_client_id
         AND published_at > NOW() - INTERVAL '7 days'),
    'posts_last_week',
      (SELECT COUNT(*) FROM m.post_publish
       WHERE client_id = p_client_id
         AND published_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'),
    'drafts_to_review',
      (SELECT COUNT(*) FROM m.post_draft
       WHERE client_id = p_client_id
         AND approval_status = 'needs_review'),
    'next_scheduled',
      (SELECT scheduled_for FROM m.post_publish_queue
       WHERE client_id = p_client_id AND status = 'queued'
         AND scheduled_for > NOW()
       ORDER BY scheduled_for ASC LIMIT 1),
    'platforms_connected',
      (SELECT jsonb_agg(jsonb_build_object(
         'platform', platform,
         'page_name', page_name,
         'publish_enabled', publish_enabled,
         'token_ok', (token_expires_at IS NULL OR token_expires_at > NOW() + INTERVAL '7 days')
       ))
       FROM c.client_publish_profile
       WHERE client_id = p_client_id AND status = 'active')
  );
END;
$$ LANGUAGE plpgsql;
```

### 1b — get_portal_recent_posts(p_client_id UUID, p_limit INT DEFAULT 5)

```sql
CREATE OR REPLACE FUNCTION public.get_portal_recent_posts(
  p_client_id UUID,
  p_limit INT DEFAULT 5
)
RETURNS TABLE(
  post_publish_id uuid,
  platform text,
  draft_title text,
  draft_body text,
  published_at timestamptz,
  platform_post_id text,
  image_url text
) SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.post_publish_id,
    pp.platform,
    pd.draft_title,
    LEFT(pd.draft_body, 280) AS draft_body,
    pp.published_at,
    pp.platform_post_id,
    pd.image_headline
  FROM m.post_publish pp
  JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
  WHERE pp.client_id = p_client_id
  ORDER BY pp.published_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

Grant execute to service_role, authenticated on both functions.

---

## Task 2 — Build portal Home page

**File:** `app/(portal)/home/page.tsx` (or the existing home/index route — check current structure)

The page has four sections stacked vertically:

### Section 1 — Week at a glance (3 stat cards)

```
[Posts this week: 5]  [Next post: Tue 12:00 PM]  [Drafts to review: 0]
```

- Posts this week: large number, green if > 0, amber if 0
- Comparison: "vs 4 last week" in small text below
- Next post: formatted in client timezone (Australia/Sydney). Show "No posts scheduled" if none queued
- Drafts to review: badge-style. If > 0, show as amber with link to /inbox

### Section 2 — Platform status row

For each connected platform (from platforms_connected in stats):
```
[Facebook icon] NDIS-Yarns Page   ✅ Connected
[LinkedIn icon] Not connected      → Connect
```

Health dot: green if publish_enabled + token_ok, amber if token expiring, red if not connected.
Tap → /connect

### Section 3 — Recent posts (last 5)

For each post: platform icon + date published + draft_title + first 140 chars of body.
Card style, no images needed initially.
If 0 posts: empty state — "Your first posts are being prepared. They'll appear here once published."

### Section 4 — Quick actions (only if relevant)

- If drafts_to_review > 0: amber card — "You have {n} draft(s) waiting for your approval" → /inbox
- If no platforms connected: "Connect your Facebook page to start publishing" → /connect

---

## Task 3 — Create server action

**File:** `actions/portal-home.ts`

```typescript
'use server';
import { createServiceClient } from '@/lib/supabase/service';
import { getPortalSession } from '@/lib/portal-session';

export async function getPortalHomeData() {
  const session = await getPortalSession();
  if (!session?.clientId) return null;
  const supabase = createServiceClient();
  const [statsResult, postsResult] = await Promise.all([
    supabase.rpc('get_portal_home_stats', { p_client_id: session.clientId }),
    supabase.rpc('get_portal_recent_posts', { p_client_id: session.clientId, p_limit: 5 }),
  ]);
  return {
    stats: statsResult.data,
    posts: postsResult.data ?? [],
  };
}
```

---

## Task 4 — Style guide

- Stat cards: white background, rounded-xl, border border-slate-200 (light), border-slate-800 (dark)
- Large numbers: text-3xl font-bold
- Section headers: text-xs uppercase tracking-widest text-slate-500
- Platform status dots: emerald-400 (ok), amber-400 (warning), red-400 (error), slate-400 (not connected)
- Post cards: hover:bg-slate-50 dark:hover:bg-slate-800/50
- Brand primary colour: use var(--brand-primary) for accents (already injected by layout)
- Empty states: slate-400 text, centered, no dramatic illustrations

---

## Task 5 — Build, commit, deploy

```bash
cd C:\Users\parve\invegent-portal
npm run build
git add -A
git commit -m "feat: portal home page — week stats, recent posts, platform status, quick actions"
git push origin main
```

Vercel auto-deploys. Confirm portal.invegent.com/home loads without errors.

---

## Task 6 — Write result file

Write `docs/briefs/brief_024_result.md` in Invegent-content-engine:
- DB functions created
- Home page built (sections list)
- Build: PASS/FAIL
- Commit SHA
- Notes

---

## Error handling

- If `getPortalSession()` pattern differs from what's in other portal pages: follow the existing pattern exactly — check `lib/portal-session.ts` or equivalent
- If `image_headline` doesn't exist on `m.post_draft`: use `recommended_format` or omit the image field
- The `post_publish` table may not have a direct FK to `post_draft` — join via `post_draft_id` column on both tables
- If draft_body is long: truncate to 280 chars with `LEFT()` in SQL or `.slice(0, 280)` in TSX
- next_scheduled: format in Australia/Sydney using toLocaleString with timeZone option

## What this does NOT include

- Performance charts (Brief 031)
- Full post detail view
- Campaign progress
- Notifications system
