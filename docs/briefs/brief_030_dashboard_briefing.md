# Claude Code Brief 030 — Dashboard Operator Briefing

**Date:** 13 April 2026
**Phase:** B — System Intelligence
**Repo:** `invegent-dashboard`
**Working directory:** `C:\Users\parve\invegent-dashboard`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** GitHub MCP, Supabase MCP
**Estimated time:** 3–4 hours
**Depends on:** Brief 027 (pipeline_incident table)

---

## What this builds

PK currently opens the dashboard and has no single screen that answers:
"Is everything working? What needs my attention today?"

This brief rebuilds the Overview page as a daily operator briefing —
a single screen that answers those questions in under 10 seconds.

---

## Task 1 — Create server action for briefing data

**File:** `actions/operator-briefing.ts`

```typescript
'use server';
import { createServiceClient } from '@/lib/supabase/service';

export async function getOperatorBriefing() {
  const supabase = createServiceClient();

  const [health, todaySchedule, draftsNeedingReview, incidents] = await Promise.all([
    // System health
    supabase.rpc('exec_sql', { query: `
      SELECT
        (SELECT COUNT(*) FROM m.ai_job WHERE status = 'pending' AND created_at < NOW() - INTERVAL '2 hours') AS stuck_jobs,
        (SELECT COUNT(*) FROM m.post_publish_queue WHERE status = 'queued' AND scheduled_for <= NOW()) AS overdue_queue,
        (SELECT COUNT(*) FROM m.pipeline_incident WHERE resolved_at IS NULL AND severity = 'CRITICAL') AS open_criticals,
        (SELECT COUNT(*) FROM m.pipeline_incident WHERE resolved_at IS NULL AND severity = 'WARNING') AS open_warnings,
        (SELECT COUNT(*) FROM m.post_publish WHERE published_at > NOW() - INTERVAL '24 hours') AS published_today
    `}),
    // Today's publishing schedule
    supabase.rpc('exec_sql', { query: `
      SELECT
        ppq.post_publish_queue_id,
        c.client_name,
        ppq.platform,
        ppq.scheduled_for AT TIME ZONE 'Australia/Sydney' AS scheduled_local,
        pd.draft_title,
        pd.recommended_format
      FROM m.post_publish_queue ppq
      JOIN c.client c ON c.client_id = ppq.client_id
      JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
      WHERE ppq.status = 'queued'
        AND ppq.scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      ORDER BY ppq.scheduled_for ASC
      LIMIT 20
    `}),
    // Drafts needing human review
    supabase.rpc('exec_sql', { query: `
      SELECT
        pd.post_draft_id,
        c.client_name,
        pd.draft_title,
        pd.platform,
        pd.created_at
      FROM m.post_draft pd
      JOIN c.client c ON c.client_id = pd.client_id
      WHERE pd.approval_status = 'needs_review'
      ORDER BY pd.created_at DESC
      LIMIT 10
    `}),
    // Open incidents
    supabase.rpc('exec_sql', { query: `
      SELECT
        pi.incident_id,
        c.client_name,
        pi.check_name,
        pi.severity,
        pi.description,
        pi.auto_healable,
        pi.detected_at
      FROM m.pipeline_incident pi
      LEFT JOIN c.client c ON c.client_id = pi.client_id
      WHERE pi.resolved_at IS NULL
      ORDER BY
        CASE pi.severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,
        pi.detected_at DESC
      LIMIT 10
    `}),
  ]);

  const healthRow = (health.data as any[])?.[0] ?? {};
  const systemStatus: 'healthy' | 'warning' | 'critical' =
    Number(healthRow.open_criticals) > 0 ? 'critical' :
    Number(healthRow.open_warnings) > 0 || Number(healthRow.stuck_jobs) > 0 ? 'warning' :
    'healthy';

  return {
    systemStatus,
    health: {
      stuckJobs: Number(healthRow.stuck_jobs ?? 0),
      overdueQueue: Number(healthRow.overdue_queue ?? 0),
      openCriticals: Number(healthRow.open_criticals ?? 0),
      openWarnings: Number(healthRow.open_warnings ?? 0),
      publishedToday: Number(healthRow.published_today ?? 0),
    },
    todaySchedule: (todaySchedule.data ?? []) as any[],
    draftsNeedingReview: (draftsNeedingReview.data ?? []) as any[],
    openIncidents: (incidents.data ?? []) as any[],
  };
}
```

---

## Task 2 — Rebuild Overview page as Operator Briefing

**File:** `app/(dashboard)/overview/page.tsx`

Layout — four zones stacked vertically:

### Zone 1 — System status bar (always first)

A single full-width banner:
- 🟢 GREEN: "All systems healthy — {N} posts published today"
- 🟡 AMBER: "Warnings detected — {N} open issues"
- 🔴 RED: "Critical issues require attention — {N} criticals"

Background colour matches status. Large, impossible to miss.

### Zone 2 — Today's attention (2-column grid)

**Left:** Drafts to review
- If 0: "✅ Inbox clear"
- If > 0: list each draft with client name, title, platform, age. Each row has [Approve] and [Reject] inline buttons that call the existing draft approval actions.

**Right:** Open incidents
- If 0: "✅ No active incidents"
- If > 0: list each with severity dot (red/amber), client name, check name, description, "Auto-healable" badge if applicable.
- CRITICAL incidents shown with red left border.

### Zone 3 — Today's publishing schedule

Timeline view of what publishes today (next 24h from queue).
Each item: time (AEST) · client name · platform icon · draft title.
If empty: "No posts scheduled in the next 24 hours."

### Zone 4 — Quick stats (4 cards)

```
[Published today: N]  [Stuck jobs: N]  [Overdue queue: N]  [Open incidents: N]
```

Colour coding: green if 0 for stuck/overdue/incidents. Red if > 0.

---

## Task 3 — Add persistent health indicator to nav

In `components/nav.tsx` (or equivalent nav component), add a small coloured
dot next to "Overview" in the nav that reflects systemStatus.

Fetch systemStatus server-side in the layout and pass as prop, or use a
shared server action that both layout and page can call.

---

## Task 4 — Build, commit, deploy

```bash
cd C:\Users\parve\invegent-dashboard
npm run build
git add -A
git commit -m "feat: operator briefing — system status, today's drafts, incidents, schedule"
git push origin main
```

---

## Task 5 — Write result file

Write `docs/briefs/brief_030_result.md` in Invegent-content-engine.

---

## Notes

- If pipeline_incident table doesn't exist yet (Brief 027 not run): the incidents
  query will fail. Add a try/catch that returns [] for incidents and continues.
- The existing Overview page may have some components worth keeping — audit it
  first before replacing, in case performance charts or token status are already there.
- Draft approval buttons on this page should reuse the existing server actions
  from the dashboard's existing draft approval flow.
