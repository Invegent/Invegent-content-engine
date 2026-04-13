# Claude Code Brief 037 — Dashboard Navigation Restructure

**Date:** 13 April 2026
**Phase:** D — Intelligence
**Repo:** `invegent-dashboard`
**Working directory:** `C:\Users\parve\invegent-dashboard`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** GitHub MCP
**Estimated time:** 3–4 hours

---

## What this builds

The dashboard currently has 20+ routes in a flat nav. Everything is equally prominent.
The operator's three real intents — "is everything working?", "what needs my attention?",
"let me configure something" — require navigating different tabs.

This brief restructures the nav into three clear zones:
- **Status** — always visible, persistent
- **Today** — the new Overview (operator briefing, built in Brief 030)
- **Deep work** — all configuration and analytical tabs, collapsible

---

## Task 1 — Audit current nav structure

Read the current nav component:
```bash
find . -name "*.tsx" | xargs grep -l "nav\|sidebar\|NavLink" | head -10
```

Identify:
- Where the nav links are defined
- Current link list
- How active states work

---

## Task 2 — Design the new nav structure

```
STATUS STRIP (top of every page, persistent)
  ● System: [green dot] All good  —  or  ● [red dot] 1 critical
  Quick: [28 posts this week]  [0 stuck jobs]  [Inbox: 0]

TODAY (primary nav section)
  Overview (operator briefing)     ← new landing page (Brief 030)
  Inbox (draft review)             ← with count badge
  Queue (publish schedule)         ← today's posts

MONITOR
  Flow (pipeline diagram)          ← existing monitor tab
  Pipeline log
  Diagnostics
  Failures

CONTENT
  Content Studio
  Visuals
  Performance
  Costs

CONFIGURATION
  Clients
  Feeds
  Compliance
  Onboarding
  Connect

SYSTEM
  Roadmap
```

---

## Task 3 — Build the persistent status strip

This is a thin bar that appears at the top of every dashboard page (in the layout).

**File:** `components/status-strip.tsx`

```tsx
// Server component — fetches system status
import { createServiceClient } from '@/lib/supabase/service';

export async function StatusStrip() {
  const supabase = createServiceClient();
  const { data } = await supabase.rpc('exec_sql', { query: `
    SELECT
      (SELECT COUNT(*) FROM m.pipeline_incident WHERE resolved_at IS NULL AND severity = 'CRITICAL') AS criticals,
      (SELECT COUNT(*) FROM m.ai_job WHERE status = 'pending' AND created_at < NOW() - INTERVAL '2 hours') AS stuck,
      (SELECT COUNT(*) FROM m.post_publish WHERE published_at > NOW() - INTERVAL '7 days') AS posts_7d,
      (SELECT COUNT(*) FROM m.post_draft WHERE approval_status = 'needs_review') AS inbox
  `});

  const s = (data as any[])?.[0] ?? {};
  const criticals = Number(s.criticals ?? 0);
  const stuck = Number(s.stuck ?? 0);
  const isHealthy = criticals === 0 && stuck === 0;

  return (
    <div className={`flex items-center gap-4 px-4 py-1.5 text-xs border-b ${
      criticals > 0 ? 'bg-red-950 border-red-900 text-red-300' :
      stuck > 0 ? 'bg-amber-950 border-amber-900 text-amber-300' :
      'bg-slate-900 border-slate-800 text-slate-400'
    }`}>
      <span className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${
          criticals > 0 ? 'bg-red-400' : stuck > 0 ? 'bg-amber-400' : 'bg-emerald-400'
        }`} />
        {criticals > 0 ? `${criticals} critical` : stuck > 0 ? `${stuck} stuck` : 'All systems healthy'}
      </span>
      <span>·</span>
      <span>{s.posts_7d ?? 0} posts this week</span>
      {Number(s.inbox) > 0 && (
        <>
          <span>·</span>
          <span className="text-amber-400">{s.inbox} in inbox</span>
        </>
      )}
    </div>
  );
}
```

Add `<StatusStrip />` to `app/(dashboard)/layout.tsx`, above the existing nav.
Use `revalidate = 60` or make it a client component that polls every 60s.

---

## Task 4 — Restructure the nav

Find the nav component and reorganise links into the 6 groups from Task 2.
Add section labels ("TODAY", "MONITOR", "CONTENT", "CONFIGURATION", "SYSTEM").
Section labels: `text-[10px] uppercase tracking-widest text-slate-500 px-3 pt-4 pb-1`.

Keep the same link styles — only the grouping and labels change.

Add inbox badge: query the draft count in layout and pass to the nav.

---

## Task 5 — Build, commit, deploy

```bash
cd C:\Users\parve\invegent-dashboard
npm run build
git add -A
git commit -m "feat: dashboard nav restructure — status strip + 6-zone nav (Today/Monitor/Content/Config/System)"
git push origin main
```

---

## Task 6 — Write result file

Write `docs/briefs/brief_037_result.md` in Invegent-content-engine.

---

## Error handling

- If the nav is in multiple places (mobile + desktop), update both consistently.
- StatusStrip is a server component with a 60s revalidate — not real-time.
  For real-time: convert to client component using a simple fetch on an interval.
- Do NOT remove any existing routes — only reorganise the nav labels and grouping.
- The existing Overview page was rebuilt in Brief 030 — keep it as-is, just ensure
  it appears under "TODAY" in the new nav structure.
