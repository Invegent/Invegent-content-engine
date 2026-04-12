# Brief 015 Result — Dashboard Onboarding Checklist Panel

**Executed:** 12 April 2026
**Executor:** Claude Code (Opus 4.6)
**Repo:** invegent-dashboard

---

## Task Results

| Task | Description | Status |
|------|-------------|--------|
| 1 | New sections (Services, NDIS, Content Objectives, Logo) | COMPLETED |
| 2 | ReadinessChecklist component (9 items) | COMPLETED |
| 3 | scanStatus state + handleRunScans function | COMPLETED |
| 4 | Readiness Checklist section + Run Scans button in detail panel | COMPLETED |
| 5 | Create /api/onboarding/run-scans route (stub) | COMPLETED |
| 6 | Update approve modal bullet list | COMPLETED |
| 7 | Build + commit + result file | COMPLETED |

---

## Details

### Task 1 — New sections
- Services section: shows service_list in monospace pre-line format (only if provided)
- NDIS section: shows serves_ndis + ndis_registration (only if serves_ndis provided)
- Content Objectives: parses as array (with JSON.parse fallback for string format), renders as cyan pill badges
- Logo preview: renders base64 data URL in an img tag with file name (only if logo_data_url provided)
- All sections placed after Content, before Platforms & Reporting

### Task 2 — ReadinessChecklist
- 9 checklist items with emoji indicators (pass/warn/fail/pending)
- Handles content_objectives as either array or JSON string
- scanStatus-aware for brand scan and AI profile items

### Task 3 — scanStatus state + handler
- State keyed by submission_id so switching submissions preserves each one's scan state
- handleRunScans POSTs to /api/onboarding/run-scans, updates state on success/error
- Uses existing showToast for feedback

### Task 4 — Readiness section in detail panel
- Placed above Actions block
- Run Scans button (violet) hidden for approved/rejected submissions
- Shows "Scans running…" with spinner when in progress

### Task 5 — /api/onboarding/run-scans route
- Validates submission_id, checks submission exists and not already approved
- Returns ok:true (stub — TODO comments for brand-scanner and ai-profile-bootstrap Edge Function invocations)
- Logs intent to console

### Task 6 — Approve modal
- Added brand profile readiness signal: emerald "ready for extraction" or amber "will be generic"

---

## Build
- PASS — 0 errors, 43 routes compiled
- /onboarding page: 6.61KB
- /api/onboarding/run-scans: new route

## Commit
- SHA: 56578dd
- 2 files changed: +243 lines

---

## Files Changed

| File | Action |
|------|--------|
| app/(dashboard)/onboarding/page.tsx | MODIFIED — new sections, checklist, scan state, approve modal update |
| app/api/onboarding/run-scans/route.ts | CREATED — stub API route |

---

## Notes

- RefreshCw and Loader2 were already imported — no duplicate imports added
- content_objectives handled with try/catch JSON.parse for both array and string formats
- The Run Scans button is a stub — returns success immediately. Edge Functions (brand-scanner, ai-profile-bootstrap) to be implemented in separate briefs
- Only relevant files committed — untracked .claude/settings.local.json and duplicate actions/video-analyser.ts excluded
