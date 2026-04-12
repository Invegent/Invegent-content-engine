# Brief 012 Result — Portal Sidebar Redesign

**Executed:** 12 April 2026
**Executor:** Claude Code (Opus 4.6)
**Repo:** invegent-portal

---

## Task Results

| Task | Description | Status |
|------|-------------|--------|
| 1 | Create components/portal-sidebar.tsx | COMPLETED |
| 2 | Create lib/portal-data.ts (drafts count) | COMPLETED |
| 3 | Replace app/(portal)/layout.tsx | COMPLETED |
| 4 | Delete components/portal-nav.tsx | COMPLETED |
| 5 | Create stub app/(portal)/connect/page.tsx | COMPLETED |
| 6 | npm run build | PASS — zero errors |
| 7 | Commit and push | COMPLETED — f897010 |
| 8 | Write result file | COMPLETED |

---

## Details

### Task 1 — PortalSidebar component
- Desktop: fixed left sidebar (w-56, hidden md:flex), three sections — Invegent brand top, nav middle, client footer bottom with "powered by Invegent"
- Mobile: fixed bottom tab bar (flex md:hidden, z-50), 5 tabs (Home, Inbox, Calendar, Stats, Account)
- Inbox badge: amber dot when draftsCount > 0 (both desktop and mobile)
- signOut wrapped in `<form action={signOut}>` as required for server action
- Client initials avatar in footer (first letter of each word, max 2)

### Task 2 — portal-data.ts
- getPortalDraftsCount() queries m.post_draft via exec_sql RPC
- Returns 0 on any failure (badge is non-blocking)

### Task 3 — layout.tsx
- Switched from PortalNav to PortalSidebar
- Now passes clientId and draftsCount in addition to clientName
- Main content: pb-24 on mobile (clears bottom bar), md:pb-6 on desktop
- max-w-3xl (up from max-w-2xl) for wider content area with sidebar

### Task 4 — Deleted portal-nav.tsx
- Confirmed only layout.tsx imported it (grep verified)
- Safely deleted

### Task 5 — /connect stub
- Placeholder page with heading and description
- Prevents 404 when sidebar "Connect" link is clicked

### Task 6 — Build
- `npm run build` passed with zero TypeScript or import errors
- All 13 routes compiled successfully including new /connect

### Task 7 — Commit
- SHA: f897010
- 5 files changed: +231 -67
- Pushed to origin/main, Vercel auto-deploy triggered

---

## Files Changed

| File | Action |
|------|--------|
| components/portal-sidebar.tsx | CREATED |
| lib/portal-data.ts | CREATED |
| app/(portal)/layout.tsx | REPLACED |
| components/portal-nav.tsx | DELETED |
| app/(portal)/connect/page.tsx | CREATED |

---

## Notes

- No page content files were modified
- The mobile "Account" tab triggers signOut directly (brief said "shows sign out on tap, or link to /feeds for now") — used signOut for simplicity
- Lucide icons used: Home, FileText, Calendar, BarChart2, Link2, Rss, LogOut, User
