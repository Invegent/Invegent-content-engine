# Claude Code Brief 025 — Portal Inbox Draft Approval

**Date:** 13 April 2026
**Phase:** A — Revenue Readiness
**Repo:** `invegent-portal`
**Working directory:** `C:\Users\parve\invegent-portal`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** GitHub MCP, Supabase MCP
**Estimated time:** 3–4 hours

---

## What this builds

Clients with `require_client_approval = true` on their publish profile need a way
to review drafts before they publish. Currently the portal Inbox route exists but
shows nothing. This brief builds the full draft approval workflow.

---

## Task 1 — Create DB functions

### 1a — get_portal_inbox_drafts(p_client_id UUID)

```sql
CREATE OR REPLACE FUNCTION public.get_portal_inbox_drafts(p_client_id UUID)
RETURNS TABLE(
  post_draft_id uuid,
  draft_title text,
  draft_body text,
  platform text,
  recommended_format text,
  image_headline text,
  created_at timestamptz,
  digest_topic text
) SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    pd.post_draft_id,
    pd.draft_title,
    pd.draft_body,
    pd.platform,
    pd.recommended_format,
    pd.image_headline,
    pd.created_at,
    di.topic_label
  FROM m.post_draft pd
  LEFT JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
  WHERE pd.client_id = p_client_id
    AND pd.approval_status = 'needs_review'
  ORDER BY pd.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

### 1b — portal_approve_draft(p_client_id UUID, p_draft_id UUID)

```sql
CREATE OR REPLACE FUNCTION public.portal_approve_draft(
  p_client_id UUID,
  p_draft_id UUID
)
RETURNS jsonb SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Verify draft belongs to this client and is awaiting review
  SELECT EXISTS (
    SELECT 1 FROM m.post_draft
    WHERE post_draft_id = p_draft_id
      AND client_id = p_client_id
      AND approval_status = 'needs_review'
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN jsonb_build_object('ok', false, 'error', 'draft_not_found_or_not_reviewable');
  END IF;

  -- Approve and enqueue
  PERFORM public.draft_approve_and_enqueue(p_draft_id);

  -- Overwrite approved_by with portal indicator
  UPDATE m.post_draft
  SET approved_by = 'portal-client',
      updated_at = NOW()
  WHERE post_draft_id = p_draft_id;

  RETURN jsonb_build_object('ok', true, 'post_draft_id', p_draft_id);
END;
$$ LANGUAGE plpgsql;
```

### 1c — portal_reject_draft(p_client_id UUID, p_draft_id UUID, p_reason TEXT)

```sql
CREATE OR REPLACE FUNCTION public.portal_reject_draft(
  p_client_id UUID,
  p_draft_id UUID,
  p_reason TEXT DEFAULT 'client_rejected'
)
RETURNS jsonb SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM m.post_draft
    WHERE post_draft_id = p_draft_id
      AND client_id = p_client_id
      AND approval_status = 'needs_review'
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN jsonb_build_object('ok', false, 'error', 'draft_not_found');
  END IF;

  UPDATE m.post_draft
  SET approval_status = 'rejected',
      approved_by = 'portal-client',
      draft_format = draft_format || jsonb_build_object(
        'client_rejection', jsonb_build_object(
          'reason', p_reason,
          'rejected_at', NOW()
        )
      ),
      updated_at = NOW()
  WHERE post_draft_id = p_draft_id;

  RETURN jsonb_build_object('ok', true, 'post_draft_id', p_draft_id);
END;
$$ LANGUAGE plpgsql;
```

Grant execute on all three to service_role, authenticated.

---

## Task 2 — Server actions

**File:** `actions/portal-inbox.ts`

```typescript
'use server';
import { createServiceClient } from '@/lib/supabase/service';
import { getPortalSession } from '@/lib/portal-session';
import { revalidatePath } from 'next/cache';

export async function getInboxDrafts() {
  const session = await getPortalSession();
  if (!session?.clientId) return [];
  const supabase = createServiceClient();
  const { data } = await supabase.rpc('get_portal_inbox_drafts', {
    p_client_id: session.clientId,
  });
  return data ?? [];
}

export async function approveDraft(draftId: string) {
  const session = await getPortalSession();
  if (!session?.clientId) return { ok: false, error: 'not_authenticated' };
  const supabase = createServiceClient();
  const { data } = await supabase.rpc('portal_approve_draft', {
    p_client_id: session.clientId,
    p_draft_id: draftId,
  });
  revalidatePath('/(portal)/inbox');
  revalidatePath('/(portal)/home');
  return data;
}

export async function rejectDraft(draftId: string, reason?: string) {
  const session = await getPortalSession();
  if (!session?.clientId) return { ok: false, error: 'not_authenticated' };
  const supabase = createServiceClient();
  const { data } = await supabase.rpc('portal_reject_draft', {
    p_client_id: session.clientId,
    p_draft_id: draftId,
    p_reason: reason ?? 'client_rejected',
  });
  revalidatePath('/(portal)/inbox');
  revalidatePath('/(portal)/home');
  return data;
}
```

---

## Task 3 — Build the Inbox page

**File:** `app/(portal)/inbox/page.tsx`

This is a client component (needs interactivity for approve/reject).

### Layout:

**Empty state** (no drafts):
```
✅ You're all caught up
"No drafts are waiting for your review. We'll notify you when new content is ready."
```

**With drafts** — one card per draft:
```
┌─────────────────────────────────────────────────────┐
│ [Facebook icon] [format badge: text/image/video]    │
│                                       2 hours ago   │
│                                                     │
│ TITLE                                               │
│ Body preview (first 300 chars of draft_body)...     │
│                                                     │
│ [Expand to read full post ↓]                        │
│                                                     │
│          [Reject]           [✓ Approve]             │
└─────────────────────────────────────────────────────┘
```

**Interactions:**
- "Expand" toggle shows full draft_body
- Approve: calls approveDraft(), card fades out with success state
- Reject: shows a small inline reason input (optional text) → calls rejectDraft()
- Both buttons show loading spinner while pending
- After action: card removes itself from the list (optimistic UI)

**Format badge colours:**
- text → slate
- image_quote / carousel → violet  
- video_short_* → cyan
- Default → slate

---

## Task 4 — Add inbox badge to sidebar

The sidebar already has an Inbox nav item. Add a live badge showing draft count.

In `components/portal-sidebar.tsx`, the Inbox nav item should show a count badge
if there are drafts to review. Pass `inboxCount` as a prop from layout.tsx.

In `app/(portal)/layout.tsx`, alongside fetching brand profile, also fetch:
```typescript
const { data: inboxData } = await supabase.rpc('get_portal_inbox_drafts', {
  p_client_id: clientId
});
const inboxCount = (inboxData ?? []).length;
```

Pass `inboxCount` to the sidebar. Show as amber badge if > 0.

---

## Task 5 — Build, commit, deploy

```bash
cd C:\Users\parve\invegent-portal
npm run build
git add -A
git commit -m "feat: portal inbox — draft approval workflow with approve/reject, inbox badge"
git push origin main
```

---

## Task 6 — Write result file

Write `docs/briefs/brief_025_result.md` in Invegent-content-engine.

---

## Error handling

- `draft_approve_and_enqueue` already exists and handles the enqueue — call it, then update approved_by
- If topic_label doesn't exist on digest_item: omit from query, show draft title only
- Reject reason is optional — default to 'client_rejected' if empty string submitted
- revalidatePath clears the server cache — essential for the badge count to update

## What this does NOT include

- Campaign approval workflows (separate future brief)
- Client commenting on drafts
- Bulk approve/reject
- Push notifications for new drafts (future)
