# Brief 044 Result — Platform Connections Fix

**Executed:** 14 April 2026
**Repo:** invegent-dashboard
**Commit:** df8aec2

---

## Task Results

| Task | Status |
|------|--------|
| 1. Update /connect/page.tsx (dynamic platforms) | COMPLETED |
| 2. Update /clients/page.tsx Connect tab | COMPLETED |
| 3. Shared util lib/platform-status.ts | COMPLETED |
| 4. Build | PASS |
| 5. Push (Vercel auto-deploys) | COMPLETED |

---

## Changes

### lib/platform-status.ts (NEW)
- `PLATFORM_CONFIG` — label + colour per platform
- `PLATFORM_ORDER` — display order: facebook, instagram, linkedin, youtube
- `PlatformProfile` type with `is_zapier` flag
- `getTokenStatus()` — handles Zapier bridge (purple badge), expired, valid, connected-unknown

### /connect/page.tsx
- Replaced hardcoded Facebook+LinkedIn JOINs with single aggregated query
- Groups platforms by client dynamically
- Shows all platforms from DB (facebook, instagram, linkedin, youtube, any future)
- LinkedIn Zapier tokens show purple "Active — Zapier bridge" badge
- Platform info cards: 4 cards (FB, IG, LI, YT) instead of 2
- Summary bar dynamically counts connected/total per platform

### /clients/page.tsx Connect tab
- Added `is_zapier` computed column to getPublishProfiles() query
- Added `is_zapier` to PublishProfile type
- Updated getTokenBadge() to accept isZapier parameter
- Replaced hardcoded FB+LI+YT grid with dynamic `profiles.map()` rendering
- All platforms render from DB — no hardcoded platform columns

## Files Changed
| File | Action |
|------|--------|
| lib/platform-status.ts | CREATED |
| app/(dashboard)/connect/page.tsx | REWRITTEN |
| app/(dashboard)/clients/page.tsx | MODIFIED (Connect tab + type + query) |
