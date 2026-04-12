# Brief 020 Result — Weekly Manager Report Email (B5)

**Executed:** 12 April 2026
**Executor:** Claude Code (Opus 4.6)
**Repo:** Invegent-content-engine
**Supabase project:** mbkmaxqhsohbtwsqolns

---

## Task Results

| Task | Description | Status |
|------|-------------|--------|
| 1 | Create weekly-manager-report Edge Function | COMPLETED |
| 2 | Create pg_cron job (Sunday 21:00 UTC) | COMPLETED — job ID 47 |
| 3 | Git push + deploy | COMPLETED — ACTIVE via CLI |
| 4 | Manual test trigger | COMPLETED — email sent |
| 5 | Write result file | COMPLETED |

---

## Details

### Edge Function
- **Name:** weekly-manager-report
- **Version:** v1.0.0
- **Status:** ACTIVE
- **Accepts:** GET and POST (pg_cron compatibility)

### pg_cron Job
- **Job name:** weekly-manager-report-monday-7am-aest
- **Schedule:** `0 21 * * 0` (Sunday 21:00 UTC = Monday 7:00 AEST)
- **Active:** true
- **Auth pattern:** Uses vault secrets `project_url` and `service_role_key` (same pattern as draft-notifier-every-30m)

### Manual Test Result
```json
{
  "ok": true,
  "version": "weekly-manager-report-v1.0.0",
  "recipient": "pk@invegent.com",
  "subject": "⚠️ ICE Weekly — 29 posts published — 12 April 2026",
  "totalPosts": 29,
  "alerts": 2
}
```
- Email delivered to pk@invegent.com
- 29 posts published in last 7 days across all active clients
- 2 alerts detected (likely needs_review count + token/stuck warnings)

### Report Sections
1. Pipeline headline with health status emoji
2. Per-client breakdown table (posts, drafts to review, dead items)
3. Alerts section (stuck jobs, token expiry, high review queue)
4. Footer with dashboard link

---

## Commits
- `c2ee9d3` — weekly-manager-report Edge Function v1.0.0

---

## Notes
- RESEND_API_KEY and NOTIFY_FROM already set as Supabase secrets (same as draft-notifier)
- Recipient defaults to pk@invegent.com, overridable via MANAGER_REPORT_EMAIL env
- The "⚠️" in the subject indicates alerts were found — this is correct behaviour
- First automated Monday report will arrive 14 April 2026 at 7am AEST
