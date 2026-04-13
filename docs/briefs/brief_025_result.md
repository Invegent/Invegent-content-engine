# Brief 025 Result — Portal Inbox Draft Approval

**Executed:** 13 April 2026
**Executor:** Claude Code (Opus 4.6)
**Repo:** invegent-portal
**Commit:** dfaee49

---

## Task Results

| Task | Description | Status |
|------|-------------|--------|
| 1 | DB functions: get_portal_inbox_drafts, portal_approve_draft, portal_reject_draft | COMPLETED |
| 2 | Server actions: actions/portal-inbox.ts | COMPLETED |
| 3 | Inbox page + DraftCard rewrite | COMPLETED |
| 4 | Inbox badge (numeric count) in sidebar | COMPLETED |
| 5 | Build | PASS — 0 errors |
| 6 | Commit and push | COMPLETED |

---

## Details

### DB Functions
- `get_portal_inbox_drafts(UUID)` — returns needs_review drafts with title, body, platform, format, topic
- `portal_approve_draft(UUID, UUID)` — verifies ownership, calls draft_approve_and_enqueue, overwrites approved_by to 'portal-client'
- `portal_reject_draft(UUID, UUID, TEXT)` — verifies ownership, sets rejected status, stores client_rejection reason in draft_format JSONB

### Server Actions (actions/portal-inbox.ts)
- `getInboxDrafts()` — fetches via SECURITY DEFINER RPC
- `approveDraft(draftId)` — approves + enqueues via RPC, revalidates cache
- `rejectDraft(draftId, reason?)` — rejects via RPC, revalidates cache

### Inbox Page
- Server component fetches drafts via getInboxDrafts()
- Empty state: checkmark icon + "You're all caught up!"
- DraftCard: client component with expand/collapse, format badges, approve/reject buttons
- Reject flow: two-step — click Reject shows optional reason input, then Confirm Reject
- Loading spinners on both buttons during action
- Optimistic UI: card dismissed immediately on success

### Sidebar Badge
- Changed from amber dot to numeric badge showing actual count
- Shows on both desktop sidebar and mobile tab bar

### Files Changed
- actions/portal-inbox.ts — CREATED (replaces inline exec_sql with SECURITY DEFINER RPCs)
- app/(portal)/inbox/page.tsx — REWRITTEN (uses new getInboxDrafts action)
- app/(portal)/inbox/DraftCard.tsx — REWRITTEN (expand/collapse, format badges, two-step reject, loading states)
- components/portal-sidebar.tsx — MODIFIED (numeric badge instead of dot)

---

## Notes
- The old actions/portal.ts approve/reject functions still exist for backward compatibility but are no longer imported by the inbox. They can be removed in a future cleanup.
- revalidatePath ensures the layout re-fetches draftsCount so the sidebar badge updates after approve/reject
