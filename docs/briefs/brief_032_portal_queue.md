# Claude Code Brief 032 — Portal Queue View

**Date:** 13 April 2026
**Phase:** C — Client Experience
**Repo:** `invegent-portal`
**Working directory:** `C:\Users\parve\invegent-portal`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** GitHub MCP, Supabase MCP
**Estimated time:** 2 hours

---

## What this builds

A "Coming up" section in the portal — clients can see the next 7 days
of scheduled posts. Answers the anxiety question: "Is anything being
created for me right now?"

This is a simple read-only view. Can be added to the portal Home page
(below recent posts) OR as a separate Calendar tab. Add to Home page first —
it's quicker and higher value.

---

## Task 1 — Create DB function

```sql
CREATE OR REPLACE FUNCTION public.get_portal_upcoming_queue(
  p_client_id UUID,
  p_days INT DEFAULT 7
)
RETURNS TABLE(
  scheduled_for_local text,
  day_label text,
  platform text,
  draft_title text,
  recommended_format text
) SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tz text;
BEGIN
  SELECT COALESCE(timezone, 'Australia/Sydney') INTO v_tz FROM c.client WHERE client_id = p_client_id;

  RETURN QUERY
  SELECT
    to_char(ppq.scheduled_for AT TIME ZONE v_tz, 'Dy DD Mon HH12:MI AM') AS scheduled_for_local,
    to_char(ppq.scheduled_for AT TIME ZONE v_tz, 'Dy DD Mon') AS day_label,
    ppq.platform,
    pd.draft_title,
    pd.recommended_format
  FROM m.post_publish_queue ppq
  JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
  WHERE ppq.client_id = p_client_id
    AND ppq.status = 'queued'
    AND ppq.scheduled_for BETWEEN NOW() AND NOW() + (p_days || ' days')::INTERVAL
  ORDER BY ppq.scheduled_for ASC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_portal_upcoming_queue(UUID, INT) TO service_role, authenticated;
```

---

## Task 2 — Add "Coming up" section to portal Home

In `app/(portal)/home/page.tsx`, add a fifth section below recent posts:

**Section 5 — Coming up this week**

Group items by day_label. For each day:
```
Tue 15 Apr
  [Facebook icon] text  — "Why NDIS plan reviews matter"
  [Facebook icon] image — "OT services in the community"
```

If queue is empty:
```
"Nothing scheduled in the next 7 days. Content is being generated and
will appear here once approved."
```

Format badge colours same as Brief 025 (text=slate, image=violet, video=cyan).

---

## Task 3 — Build, commit, deploy

```bash
cd C:\Users\parve\invegent-portal
npm run build
git add -A
git commit -m "feat: portal home — upcoming queue view (next 7 days)"
git push origin main
```

---

## Task 4 — Write result file

Write `docs/briefs/brief_032_result.md` in Invegent-content-engine.
