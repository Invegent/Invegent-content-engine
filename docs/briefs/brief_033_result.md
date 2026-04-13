# Brief 033 Result — Client Weekly Summary Email

**Executed:** 13 April 2026
**Commit:** d1af0e9

## Task Results
| Task | Status |
|------|--------|
| Edge Function: client-weekly-summary | COMPLETED — ACTIVE |
| pg_cron: client-weekly-summary-monday-730am-aest (job 51) | COMPLETED |
| Manual test | COMPLETED — 2 emails sent |

## Manual Test Result
```json
{"ok":true,"version":"client-weekly-summary-v1.0.0","results":[
  {"client":"NDIS-Yarns","email":"pk@invegent.com","sent":true},
  {"client":"Care For Welfare Pty Ltd","email":"parveenkumar11@hotmail.com","sent":true}
]}
```
Property Pulse skipped (no notifications_email).

## Key Decisions
- Used `notifications_email` from c.client instead of auth.users JOIN (client_id != auth user id in this project)
- Property Pulse has NULL notifications_email — skipped gracefully
- Email includes: posts published this week (up to 5), upcoming queued count, drafts to review with portal link
- Schedule: Monday 7:30am AEST (30 min after manager report)
