# Claude Code Brief 012 — Portal Sidebar Redesign

**Date:** 12 April 2026  
**Status:** READY TO RUN  
**Decisions:** D088  
**Repo:** `invegent-portal`  
**Working directory:** `C:\Users\parve\invegent-portal`  
**Estimated time:** 3–4 hours autonomous execution  

---

## Context

The portal currently has a cramped top navigation bar in `components/portal-nav.tsx`.
It shows the client name and all nav items in a single 56px bar — everything truncates
on mobile and there is no room to grow.

This brief replaces it with a collapsible left sidebar (desktop) and a bottom tab bar
(mobile). The design was decided in D088. A mockup was produced in session.

**Do not change any page content files.** Only touch layout and navigation components.

---

## Current file structure (do not delete these)

```
app/(portal)/layout.tsx          ← wraps all portal pages, renders nav
components/portal-nav.tsx        ← current top nav — REPLACE this
lib/portal-auth.ts               ← getPortalSession() — do not touch
actions/auth.ts                  ← signOut() server action — do not touch
```

---

## What getPortalSession() returns

```typescript
type PortalSession = {
  userId: string;
  email: string;
  clientId: string;
  clientName: string;
};
```

The layout.tsx already calls `getPortalSession()` and passes `clientName` to the nav.
We need to also pass `clientId` so the sidebar can fetch the draft count badge.

---

## Task 1 — Create PortalSidebar component

**File to create:** `components/portal-sidebar.tsx`

This is a client component. It receives:
```typescript
{
  clientName: string;
  clientId: string;
  draftsCount: number;   // for inbox badge
}
```

### Desktop sidebar (hidden on mobile: `hidden md:flex`)

A fixed left sidebar, `w-56` wide, full height, white background, right border.
Three sections stacked vertically with `flex flex-col h-screen`:

**Top section — Invegent brand:**
```
padding: 20px 16px 14px
border-bottom: 1px solid slate-100

Row: cyan-500 rounded-lg 28x28 with white "I" + "Invegent" text (13px, font-medium)
Below: "Content Engine" in 11px slate-400
```

**Middle section — Nav items** (`flex-1 overflow-y-auto py-3 px-2`):

Two groups with small uppercase labels (10px, slate-400, px-2 mb-1 mt-4):

Group 1 label: none (no label for first group)
```
Home          /           Home icon
Inbox         /inbox      FileText icon  + badge if draftsCount > 0
Calendar      /calendar   Calendar icon
Performance   /performance  BarChart2 icon
```

Group 2 label: "Settings"
```
Connect       /connect    Link2 icon
Sources       /feeds      Rss icon
```

Each nav item: `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm`
- Active: `bg-cyan-50 text-cyan-700 font-medium`
- Inactive: `text-slate-500 hover:text-slate-800 hover:bg-slate-50`

Inbox badge: small amber dot (`w-2 h-2 rounded-full bg-amber-400 ml-auto`)
only render if `draftsCount > 0`.

**Bottom section — Client identity** (`border-t border-slate-100 p-3`):
```
Row with gap-2.5:
  Avatar circle: w-8 h-8, rounded-full, bg-cyan-100, cyan-700 text
    initials = first letter of each word in clientName (max 2)
  Column:
    clientName  (12px, font-medium, slate-900, truncate)
    "My portal" (11px, slate-400)
  Logout button: ml-auto, p-1.5, rounded-md, slate-400 icon
    uses LogOut icon from lucide-react
    onClick: calls the signOut server action
    (import signOut from "@/actions/auth" — wrap in a form or call directly)
```

Below the client row, centered:
```
"powered by Invegent"  — 10px, slate-300, py-2
```

### Mobile bottom tab bar (`flex md:hidden`)

Fixed bottom, full width, white background, top border, z-50.
5 equal tabs:
```
Home        /          Home icon
Inbox       /inbox     FileText icon + amber dot if draftsCount > 0
Calendar    /calendar  Calendar icon
Stats       /performance  BarChart2 icon
Account     (no nav — just shows sign out on tap, or link to /feeds for now)
```

Each tab: `flex flex-col items-center gap-1 py-2 flex-1`
- Icon: 20px
- Label: 9px
- Active: cyan-600
- Inactive: slate-400

---

## Task 2 — Fetch draft count server-side

**File to create:** `lib/portal-data.ts`

```typescript
import { createServiceClient } from "@/lib/supabase/service";

export async function getPortalDraftsCount(clientId: string): Promise<number> {
  const service = createServiceClient();
  const { data } = await service.rpc("exec_sql", {
    query: `
      SELECT COUNT(*)::int AS count
      FROM m.post_draft
      WHERE client_id = '${clientId}'::uuid
        AND approval_status = 'needs_review'
    `,
  });
  if (Array.isArray(data) && data[0]?.count) {
    return Number(data[0].count);
  }
  return 0;
}
```

---

## Task 3 — Update layout.tsx

**File:** `app/(portal)/layout.tsx`

Replace entirely with:

```typescript
import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { getPortalDraftsCount } from "@/lib/portal-data";
import PortalSidebar from "@/components/portal-sidebar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/login");

  const draftsCount = await getPortalDraftsCount(session.clientId);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <PortalSidebar
        clientName={session.clientName}
        clientId={session.clientId}
        draftsCount={draftsCount}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-6 max-w-3xl w-full mx-auto pb-24 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

Note: `pb-24` on mobile gives space above the bottom tab bar.
`md:pb-6` removes that extra padding on desktop.

---

## Task 4 — Delete old nav component

Delete `components/portal-nav.tsx` — it is fully replaced by `components/portal-sidebar.tsx`.

Verify no other file imports `portal-nav` before deleting.
Check with: search for `portal-nav` across the repo. If found elsewhere, update those imports.

---

## Task 5 — Create stub /connect page

The sidebar links to `/connect` but the page doesn't exist yet.
Create a stub so the link doesn't 404:

**File:** `app/(portal)/connect/page.tsx`

```typescript
export const dynamic = "force-dynamic";

export default function ConnectPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Connect your platforms</h1>
      <p className="text-sm text-slate-500">
        Connect your Facebook and LinkedIn pages so Invegent can publish content on your behalf.
        Platform connection will be available here shortly.
      </p>
    </div>
  );
}
```

---

## Task 6 — Verify build

Run:
```bash
cd C:\Users\parve\invegent-portal
npm run build
```

Expected: build succeeds with no errors.
If TypeScript errors: fix them before committing.
If import errors on deleted portal-nav: update the imports.

---

## Task 7 — Commit and push

Commit all changes to the `invegent-portal` repo:
```
git add -A
git commit -m "feat: portal sidebar redesign (D088) — collapsible left nav, client footer, mobile bottom bar"
git push origin main
```

Vercel will auto-deploy. Confirm deployment succeeds by checking
https://portal.invegent.com loads without error.

---

## Task 8 — Write result file

Write `docs/briefs/brief_012_result.md` in the `Invegent-content-engine` repo:
- Task 1: COMPLETED / FAILED (with error)
- Task 2: COMPLETED / FAILED
- Task 3: COMPLETED / FAILED
- Task 4: COMPLETED / SKIPPED (if portal-nav was imported elsewhere)
- Task 5: COMPLETED / FAILED
- Task 6: Build status (PASS / FAIL with error)
- Task 7: Commit SHA
- Any notes or issues encountered

---

## Error handling

- If `signOut` cannot be called directly from a client component,
  wrap it in a `<form action={signOut}>` with a submit button styled as the logout icon.
- If `exec_sql` RPC fails for the draft count, return 0 and continue —
  a missing badge is not a blocker.
- If the build fails due to a missing Lucide icon, check the exact import name
  at `lucide-react` v0.383.0 — use `Link2` for connect, `Rss` for sources.
- Do not change any page content files — only layout and nav components.

---

## What this brief does NOT include

- Per-client brand colours / logo from c.client_brand_profile (separate brief)
- /connect page full implementation (Brief 013)
- Collapsible sidebar toggle button (can add in a follow-up if desired)
- Notification system beyond the inbox badge
