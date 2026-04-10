# CC3 Brief — Portal Homepage + Reporting

## Context

Read `docs/00_sync_state.md` before starting.

CC1 and CC2 are complete:
- Public onboarding form: `portal.invegent.com/onboard` ✅
- Dashboard onboarding review: `dashboard.invegent.com/onboarding` ✅
- Full approval flow: creates client + portal_user + sends magic link ✅

CC3 builds what the client sees **after** they click the magic link and log in.
Currently the portal has no homepage — clients land after auth with no dashboard view.
This session also connects the existing performance page to real data.

## Repos
- Portal: `github.com/Invegent/invegent-portal` (Next.js, Vercel, portal.invegent.com)

## Supabase Project
- Project ref: `mbkmaxqhsohbtwsqolns`

## What Exists in the Portal

```
app/
  (auth)/
    login/       — magic link login ✅
    callback/    — auth callback ✅
  (portal)/
    inbox/       — draft approve/reject ✅ (working)
    calendar/    — exists, unknown content
    performance/ — WeeklyChart.tsx exists, needs real data
    feeds/       — exists, unknown content
    layout.tsx   — portal shell with nav
  onboard/       — 7-step public form ✅
  onboard/update — client update form ✅
lib/
  portal-auth.ts — getPortalSession() returns { userId, email, clientId, clientName }
actions/
  portal.ts      — approveDraft(), rejectDraft()
```

The portal session gives us `clientId` for every authenticated page.
`getPortalSession()` must be called server-side in every portal page.

## Key DB tables for portal data

```sql
m.post_publish      — published posts (client_id, platform_post_id, published_at, post_draft_id)
m.post_draft        — drafts (approval_status, draft_text, created_at)
m.post_publish_queue — upcoming queue (status='pending', scheduled_for, client_id)
m.post_performance  — engagement data (may be empty — handle gracefully)
c.client            — client name, status
c.client_service_agreement — package details
c.service_package   — package label, price
```

**Note:** `m.post_publish` may not have a direct `client_id` column.
Join chain: `post_publish → post_publish_queue → post_draft → digest_item → digest_run → client`
OR via: `post_draft.client_id` if that column exists.
Check `k.vw_table_summary` before writing any join queries.

## What To Build

---

### 1. SECURITY DEFINER functions (apply as migrations)

**a) Portal dashboard summary**
```sql
CREATE OR REPLACE FUNCTION public.get_portal_dashboard(
  p_client_id UUID
) RETURNS TABLE (
  posts_this_week     BIGINT,
  posts_last_week     BIGINT,
  drafts_pending      BIGINT,
  queue_upcoming      BIGINT,
  package_label       TEXT,
  monthly_price_aud   NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Posts published this week (Mon–Sun current week)
    (SELECT COUNT(*) FROM m.post_publish pp
     JOIN m.post_publish_queue ppq ON ppq.publish_queue_id = pp.publish_queue_id
     WHERE ppq.client_id = p_client_id
       AND pp.published_at >= date_trunc('week', NOW())
    )::BIGINT,
    -- Posts published last week
    (SELECT COUNT(*) FROM m.post_publish pp
     JOIN m.post_publish_queue ppq ON ppq.publish_queue_id = pp.publish_queue_id
     WHERE ppq.client_id = p_client_id
       AND pp.published_at >= date_trunc('week', NOW()) - INTERVAL '7 days'
       AND pp.published_at <  date_trunc('week', NOW())
    )::BIGINT,
    -- Drafts needing review
    (SELECT COUNT(*) FROM m.post_draft pd
     WHERE pd.client_id = p_client_id
       AND pd.approval_status = 'needs_review'
    )::BIGINT,
    -- Upcoming in queue
    (SELECT COUNT(*) FROM m.post_publish_queue ppq
     WHERE ppq.client_id = p_client_id
       AND ppq.status = 'pending'
    )::BIGINT,
    -- Package details
    sp.label,
    csa.monthly_price_aud
  FROM c.client_service_agreement csa
  JOIN c.service_package sp ON sp.service_package_id = csa.service_package_id
  WHERE csa.client_id = p_client_id AND csa.status = 'active'
  LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_portal_dashboard(UUID) TO service_role;
```

**Note:** If the join chain for post_publish differs, adjust accordingly.
If no service agreement exists for a client (e.g. NDIS Yarns test client),
return counts only with NULL for package fields — handle this gracefully in UI.

**b) Recent published posts for portal**
```sql
CREATE OR REPLACE FUNCTION public.get_portal_recent_posts(
  p_client_id UUID,
  p_limit     INTEGER DEFAULT 5
) RETURNS TABLE (
  post_draft_id   UUID,
  draft_text      TEXT,
  platform        TEXT,
  published_at    TIMESTAMPTZ,
  platform_post_id TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT pd.post_draft_id, pd.draft_text,
         ppq.platform, pp.published_at, pp.platform_post_id
  FROM m.post_publish pp
  JOIN m.post_publish_queue ppq ON ppq.publish_queue_id = pp.publish_queue_id
  JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
  WHERE ppq.client_id = p_client_id
  ORDER BY pp.published_at DESC
  LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_portal_recent_posts(UUID, INTEGER) TO service_role;
```

**c) Upcoming queue for portal**
```sql
CREATE OR REPLACE FUNCTION public.get_portal_upcoming(
  p_client_id UUID,
  p_limit     INTEGER DEFAULT 5
) RETURNS TABLE (
  publish_queue_id UUID,
  draft_text       TEXT,
  platform         TEXT,
  scheduled_for    TIMESTAMPTZ,
  approval_status  TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT ppq.publish_queue_id, pd.draft_text,
         ppq.platform, ppq.scheduled_for, pd.approval_status
  FROM m.post_publish_queue ppq
  JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
  WHERE ppq.client_id = p_client_id
    AND ppq.status = 'pending'
  ORDER BY ppq.scheduled_for ASC NULLS LAST
  LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_portal_upcoming(UUID, INTEGER) TO service_role;
```

**d) Weekly performance for chart (last 8 weeks)**
```sql
CREATE OR REPLACE FUNCTION public.get_portal_weekly_performance(
  p_client_id UUID
) RETURNS TABLE (
  week_start   DATE,
  posts_count  BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT date_trunc('week', pp.published_at)::DATE AS week_start,
         COUNT(*)::BIGINT AS posts_count
  FROM m.post_publish pp
  JOIN m.post_publish_queue ppq ON ppq.publish_queue_id = pp.publish_queue_id
  WHERE ppq.client_id = p_client_id
    AND pp.published_at >= NOW() - INTERVAL '8 weeks'
  GROUP BY 1
  ORDER BY 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_portal_weekly_performance(UUID) TO service_role;
```

---

### 2. Server actions — `actions/dashboard.ts` (new in portal repo)

```typescript
'use server'
import { getPortalSession } from '@/lib/portal-auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function getPortalDashboardData() {
  const session = await getPortalSession()
  if (!session) return null
  // call get_portal_dashboard(session.clientId)
  // call get_portal_recent_posts(session.clientId, 5)
  // call get_portal_upcoming(session.clientId, 5)
  // return { summary, recentPosts, upcoming, session }
}

export async function getWeeklyPerformance() {
  const session = await getPortalSession()
  if (!session) return []
  // call get_portal_weekly_performance(session.clientId)
}
```

---

### 3. Portal homepage — `app/(portal)/page.tsx`

This is currently missing. Create it.

Server component — fetch data server-side, pass to client components.

**Layout (top to bottom):**

**Welcome header**
```
Good morning, [clientName]           [today's date]
Here's your content activity this week.
```

**Stats row — 4 cards**
| Stat | Value | Note |
|---|---|---|
| Published this week | [posts_this_week] | vs [posts_last_week] last week (▲/▼ indicator) |
| Drafts to review | [drafts_pending] | Link to /inbox |
| Upcoming in queue | [queue_upcoming] | Link to /calendar |
| Your plan | [package_label] | $[price]/month |

If `posts_this_week > posts_last_week` show green up arrow.
If `posts_this_week < posts_last_week` show amber down arrow.
If no package exists (test clients), omit the plan card.

**Recent Posts section**
Title: "Recently Published"
Show last 5 published posts as cards:
- Platform badge (Facebook / LinkedIn / Instagram)
- First 120 characters of draft_text (truncated with ...)
- Published date ("Today", "Yesterday", or "Mon 7 Apr")
- If post has a platform_post_id, show a small external link icon

If no posts: empty state — "No posts published yet. Content will appear here once your pipeline is running."

**Upcoming section**
Title: "Coming Up"
Show next 5 scheduled posts:
- Platform badge
- First 80 characters of draft_text
- Scheduled for ("Tomorrow 11am", "Wed 11 Apr 2pm" etc)
- Approval status badge (approved / needs_review)

If drafts_pending > 0, show a banner above this section:
```
⚠ You have [drafts_pending] draft(s) awaiting your review.
[Review Drafts →]
```

If no upcoming: "Your queue is empty. New content will appear here as it's generated."

**Quick links row**
- Draft Inbox → /inbox
- Content Calendar → /calendar  
- Performance → /performance

---

### 4. Performance page — connect to real data

The existing `app/(portal)/performance/page.tsx` has a `WeeklyChart` component.
Update it to use real data from `get_portal_weekly_performance()`.

If the chart has no data, show an empty state:
"Performance data will appear here once content has been publishing for at least one week."

Also add above the chart:
- Total posts published (all time)
- Posts this month
- Posts this week

Don't break the existing WeeklyChart component — just feed it real data.

---

### 5. Portal layout nav — verify links

Check `app/(portal)/layout.tsx` nav links are correct:
- Home → `/` (portal homepage, this build)
- Inbox → `/inbox`
- Calendar → `/calendar`
- Performance → `/performance`

Add client name to the nav header if not already shown.

---

### 6. First login experience (nice to have if time allows)

If `posts_this_week === 0 AND drafts_pending === 0 AND queue_upcoming === 0`,
show a welcome banner on the homepage:

```
Welcome to your content portal! 🎉

Your content pipeline is being set up. You'll start seeing
content appear here within the next 24–48 hours.

In the meantime, you can:
• Check your inbox for any drafts that need your approval
• Review your upcoming content calendar

[Go to Inbox]  [View Calendar]
```

---

## File List Expected

```
app/(portal)/page.tsx             (new — portal homepage)
actions/dashboard.ts              (new — server actions for homepage data)
app/(portal)/performance/page.tsx (update — connect WeeklyChart to real data)
app/(portal)/layout.tsx           (update — verify nav + client name in header)
```

Plus Supabase migrations for the 4 SECURITY DEFINER functions above.

---

## Definition of Done

1. `portal.invegent.com` (after login) shows the homepage dashboard — not a blank page or redirect to login
2. Stats cards show real counts from DB (even if all zeros for a new client)
3. Recent posts section renders correctly (empty state if no posts)
4. Upcoming section renders correctly (empty state if no queue)
5. Performance page shows the weekly chart with real data (or empty state)
6. Nav links all work correctly
7. Client name appears in the portal header

---

## Test Sequence

After building:
1. Submit a test via `portal.invegent.com/onboard`
2. Approve in dashboard — get magic link
3. Click magic link → portal homepage loads
4. Verify: welcome header shows client name, stats show zeros (new client), empty states render cleanly
5. Also test with NDIS Yarns: create a portal_user entry for a test email pointing to NDIS Yarns client_id
   ```sql
   INSERT INTO portal_user (client_id, email)
   VALUES ('fb98a472-ae4d-432d-8738-2273231c1ef4', 'pk+ndisyarns@invegent.com');
   ```
   Then log in as that user and verify the homepage shows real NDIS Yarns post data.
