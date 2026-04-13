# Brief 032 Result — Portal Queue View

**Executed:** 13 April 2026
**Repo:** invegent-portal
**Commit:** cdeb476

## Task Results
| Task | Status |
|------|--------|
| 1. get_portal_upcoming_queue() DB function | COMPLETED |
| 2. "Coming up this week" section on home page | COMPLETED |
| 3. Build | PASS |
| 4. Commit and push | COMPLETED |

## Details
- DB function returns next 7 days of queued items with local time formatting (Australia/Sydney)
- Section added between "Recent posts" and "Quick actions" on portal home
- Grouped by day_label (e.g. "Tue 15 Apr")
- Each item shows: platform badge, format badge (text=slate, image=violet, video=cyan), title, time
- Empty state: "Nothing scheduled in the next 7 days"
- No existing sections modified — additive only
