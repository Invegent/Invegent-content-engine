# Claude Code Brief 031 — Portal Performance Tab

**Date:** 13 April 2026
**Phase:** C — Client Experience
**Repo:** `invegent-portal`
**Working directory:** `C:\Users\parve\invegent-portal`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** GitHub MCP, Supabase MCP
**Estimated time:** 3 hours

---

## What this builds

The "proof of value" screen. When a client sees their follower count climbing
and engagement rate up, they don't cancel. This brief builds the portal
Performance tab using data from `m.post_performance` (insights-worker v14).

---

## Task 1 — Create DB function

```sql
CREATE OR REPLACE FUNCTION public.get_portal_performance(
  p_client_id UUID,
  p_days INT DEFAULT 30
)
RETURNS jsonb SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object(
    'posts_with_data',
      (SELECT COUNT(*) FROM m.post_performance pp
       JOIN m.post_publish pub ON pub.post_publish_id = pp.post_publish_id
       WHERE pub.client_id = p_client_id
         AND pub.published_at > NOW() - (p_days || ' days')::INTERVAL),
    'avg_engagement_rate',
      (SELECT ROUND(AVG(pp.engagement_rate)::numeric, 3)
       FROM m.post_performance pp
       JOIN m.post_publish pub ON pub.post_publish_id = pp.post_publish_id
       WHERE pub.client_id = p_client_id
         AND pub.published_at > NOW() - (p_days || ' days')::INTERVAL),
    'total_reach',
      (SELECT SUM(pp.reach)
       FROM m.post_performance pp
       JOIN m.post_publish pub ON pub.post_publish_id = pp.post_publish_id
       WHERE pub.client_id = p_client_id
         AND pub.published_at > NOW() - (p_days || ' days')::INTERVAL),
    'top_posts',
      (SELECT jsonb_agg(t) FROM (
         SELECT pd.draft_title, pub.published_at,
                pp.reach, pp.engagement_rate, pub.platform
         FROM m.post_performance pp
         JOIN m.post_publish pub ON pub.post_publish_id = pp.post_publish_id
         JOIN m.post_draft pd ON pd.post_draft_id = pub.post_draft_id
         WHERE pub.client_id = p_client_id
         ORDER BY pp.engagement_rate DESC NULLS LAST
         LIMIT 3
       ) t)
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_portal_performance(UUID, INT) TO service_role, authenticated;
```

---

## Task 2 — Build Performance page

**File:** `app/(portal)/performance/page.tsx`

If `posts_with_data = 0`:
```
📊 Performance data is building
"Engagement data starts appearing after your first posts have been
published for 24 hours. Check back tomorrow."
```

If data available:

**Summary cards (top row):**
```
[Posts tracked: N]  [Avg engagement: N.N%]  [Total reach: N]
```

**Top 3 posts by engagement:**
Card for each: title (truncated), published date, platform icon,
reach number, engagement rate as a percentage badge.

**Note at bottom:**
"Performance data is collected daily from your Facebook page via the
Facebook Insights API."

---

## Task 3 — Build, commit, deploy

```bash
cd C:\Users\parve\invegent-portal
npm run build
git add -A
git commit -m "feat: portal performance tab — engagement data, top posts, reach summary"
git push origin main
```

---

## Task 4 — Write result file

Write `docs/briefs/brief_031_result.md` in Invegent-content-engine.

---

## Notes

- m.post_performance schema: check with k.vw_table_summary before querying
- engagement_rate may be stored as a decimal (0.042 = 4.2%) — multiply by 100 for display
- If no m.post_performance rows exist yet (insights-worker hasn't populated it): show the empty state, not an error
