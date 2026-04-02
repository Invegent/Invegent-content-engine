# Cowork Task — Weekly Token Expiry Alert
**Schedule:** Friday 8:00am AEST (Thursday 22:00 UTC)
**cron:** 0 22 * * 4
**Type:** Health monitoring
**Autonomy:** Full — runs without human input

## Purpose
Check all active client platform tokens for upcoming expiry.
Alert if any token expires within 30 days.
Log health status regardless of alert.

## Steps

### 1. Query token status
Connect to Supabase project `mbkmaxqhsohbtwsqolns` and run:

```sql
SELECT 
  c.client_name,
  cpp.platform,
  cpp.page_name,
  cpp.credential_env_key,
  cpp.token_expires_at,
  CASE 
    WHEN cpp.token_expires_at IS NULL THEN 'no_expiry_tracked'
    WHEN cpp.token_expires_at < NOW() + INTERVAL '7 days'  THEN 'critical'
    WHEN cpp.token_expires_at < NOW() + INTERVAL '30 days' THEN 'warning'
    WHEN cpp.token_expires_at < NOW() + INTERVAL '60 days' THEN 'watch'
    ELSE 'ok'
  END AS status,
  EXTRACT(DAY FROM (cpp.token_expires_at - NOW()))::integer AS days_remaining
FROM c.client_publish_profile cpp
JOIN c.client c ON c.client_id = cpp.client_id
WHERE cpp.publish_enabled = true
ORDER BY cpp.token_expires_at ASC NULLS FIRST;
```

### 2. If any status = 'critical' or 'warning'
Create file `docs/alerts/token_expiry_{YYYY_MM_DD}.md` with:
- Which client/platform is expiring
- How many days remaining
- The credential_env_key that needs refreshing
- Steps to refresh:
  - For Facebook: go to dashboard.invegent.com/clients → Connect tab → reconnect
  - For YouTube: run OAuth flow via dashboard Connect tab
- Commit to GitHub repo `Invegent/Invegent-content-engine`
- Commit message: `alert: token expiry warning — {client} {platform} expires in {N} days`

### 3. Always write to health log
Append a one-line entry to `docs/alerts/token_health_log.md`:
`{ISO_DATE}: All tokens OK` or `{ISO_DATE}: WARNING — {client}/{platform} expires in {N} days`

Commit with message: `chore: weekly token health check {YYYY-MM-DD}`

## What NOT to do
- Do not attempt to refresh tokens yourself — this requires OAuth browser flow
- Do not delete or modify existing alert files
- Do not create alerts for disabled clients (publish_enabled = false)
