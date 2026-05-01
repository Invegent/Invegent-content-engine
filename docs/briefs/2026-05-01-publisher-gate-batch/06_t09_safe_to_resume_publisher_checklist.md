# T09 — Safe-to-Resume Publisher Checklist

**Status**: Authored, awaiting ChatGPT round-2 review (round-1 amendment to check 7 + dry_run wording folded in)
**Type**: Operational checklist
**Owner**: PK walks before each cron flip; chat helps verify

## Round-1 amendments folded in

- **Check 7**: rewritten as platform-specific subsections (generic `token_expires_at` query was wrong for YouTube, LinkedIn Zapier, WordPress)
- **Check 4 (dry run)**: wording softened for publishers that don't support dry_run (e.g. YouTube)

## Purpose

Tonight's T07 step 4 (IG cron re-enable) failed because the verification sequence was implicit in the ticket text rather than a standalone checklist. This document is the standalone checklist that any future publisher cron flip must walk.

Use this **before flipping any publisher cron from `false` to `true`**, regardless of platform.

## Pre-flip verification (8 checks)

### 1. Affected client/platform pairs disabled

```sql
-- For the platform you're about to re-enable, list all (client, platform) profiles:
SELECT cpp.client_id, c.client_name, cpp.platform, cpp.publish_enabled, cpp.paused_reason
FROM c.client_publish_profile cpp
JOIN c.client c ON c.client_id = cpp.client_id
WHERE cpp.platform = '<TARGET_PLATFORM>'
ORDER BY c.client_name;
```

**Expected**: Any client with active issues (anti-spam blocks, OAuth expired, manual quarantine) has `publish_enabled=false` AND a `paused_reason` documenting why. If a problem client shows `publish_enabled=true`, STOP — disable that client first.

### 2. Only fresh, post-fix approvals are eligible (S11 + T08 dependency)

```sql
SELECT pd.platform, COUNT(*) AS fresh_approval_count
FROM m.post_draft pd
WHERE pd.approval_status = 'approved'
  AND pd.updated_at > NOW() - INTERVAL '24 hours'
  AND pd.platform = '<TARGET_PLATFORM>'
GROUP BY pd.platform;
```

**Expected**: Non-zero count proves auto-approver is producing fresh approvals post-T08 deploy. If zero, STOP — T08 may not be working as intended.

### 3. Old queue rows quarantined or reviewed (T10 dependency)

```sql
SELECT COUNT(*) AS orphan_count
FROM m.post_publish_queue ppq
JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
WHERE ppq.platform = '<TARGET_PLATFORM>'
  AND ppq.status = 'queued'
  AND pd.approval_status != 'approved';
```

**Expected**: Zero. If non-zero, run T10 disposition before flipping cron.

### 4. Manual invocation passes (or dry_run if supported by EF)

**For publishers that support `dry_run`** (publisher v1.7.0+, instagram-publisher v2.0.0+, linkedin-zapier-publisher v1.0.0+, linkedin-publisher v1.1.0+):

Trigger manually with `{limit: 1, dry_run: true}`. Expected outcomes:
- If queue is empty: `{message: 'no_<platform>_publish_jobs'}`
- If queue has items: `{status: 'dry_run_ok'}` per row
- No `{status: 'failed'}` or `{status: 'held', reason: 'not_approved'}` (the latter = queue contamination caught by gate — STOP and run T10)

**For publishers that do NOT support `dry_run`** (youtube-publisher v1.6.0):

There is no dry-run mode. Instead:
- Hit `GET /<publisher>` — confirm version + healthy 200
- Run the eligibility query to confirm the publisher would select expected drafts only
- Reserve actual invocation until cron is flipped (with `{limit: 1}` if manual control desired)

### 5. S10 business-outcome check clean

```sql
SELECT pp.status, COUNT(*) AS row_count
FROM m.post_publish pp
WHERE pp.platform = '<TARGET_PLATFORM>'
  AND pp.created_at > NOW() - INTERVAL '24 hours'
GROUP BY pp.status;
```

**Expected**: For a stalled platform being re-enabled, mostly zeros or low counts. Any unexpected `'failed'` rows in last 24h need investigation.

### 6. S12 approval-gate compliance check clean

```sql
SELECT pp.platform, pd.approval_status, COUNT(*) AS row_count
FROM m.post_publish pp
JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
WHERE pp.platform = '<TARGET_PLATFORM>'
  AND pp.created_at > NOW() - INTERVAL '24 hours'
  AND pp.status = 'published'
GROUP BY pp.platform, pd.approval_status;
```

**Expected**: All rows in `'approved'` or `'published'`. Any in `'needs_review'` or `'rejected'` means the publisher gate isn't working — STOP and verify T13/T17/T18 deploy was successful.

### 7. Credential / token state confirmed (PLATFORM-SPECIFIC)

Different publishers have different credential layouts. Use the subsection for your target platform:

#### 7-FB — Facebook (`publisher`)

```sql
SELECT cpp.client_id, c.client_name,
  cpp.token_expires_at,
  cpp.token_expires_at > NOW() + INTERVAL '24 hours' AS valid_24h,
  CASE
    WHEN cpp.page_access_token IS NULL THEN 'missing_token'
    WHEN cpp.token_expires_at IS NULL THEN 'token_no_expiry'
    ELSE 'present'
  END AS token_state
FROM c.client_publish_profile cpp
JOIN c.client c ON c.client_id = cpp.client_id
WHERE cpp.platform = 'facebook'
  AND cpp.publish_enabled = true
  AND cpp.status = 'active';
```

Expected: all `valid_24h=true` AND `token_state='present'`. The publisher also calls `fbDebugToken` at runtime if `PUBLISH_VALIDATE_TOKEN=true` env var is set; that double-checks via Meta API.

#### 7-IG — Instagram (`instagram-publisher`)

Same as 7-FB but `WHERE cpp.platform = 'instagram'`. Tokens are Meta Page Access Tokens via the Graph API.

#### 7-LZ — LinkedIn Zapier (`linkedin-zapier-publisher`)

LinkedIn Zapier doesn't use OAuth tokens — `page_access_token` is a Zapier webhook URL.

```sql
SELECT cpp.client_id, c.client_name,
  CASE
    WHEN cpp.page_access_token IS NULL THEN 'missing_webhook'
    WHEN cpp.page_access_token NOT LIKE 'https://hooks.zapier.com%' THEN 'invalid_webhook_format'
    ELSE 'present'
  END AS webhook_state,
  cpp.page_id AS org_urn
FROM c.client_publish_profile cpp
JOIN c.client c ON c.client_id = cpp.client_id
WHERE cpp.platform = 'linkedin'
  AND cpp.publish_enabled = true
  AND cpp.status = 'active';
```

Expected: all `webhook_state='present'`. No expiry check applies (Zapier webhooks don't expire on a token clock).

#### 7-LD — LinkedIn direct (`linkedin-publisher`, repo-only)

Not deployed currently. When activated for B24/F06: same SQL pattern as 7-FB but `WHERE cpp.platform = 'linkedin'` AND check that `page_access_token` is a real LinkedIn OAuth token (not a Zapier webhook URL). Verify the `linkedInPost` API call works.

#### 7-YT — YouTube (`youtube-publisher`)

YouTube tokens live in `c.client_channel.config.refresh_token` (JSONB) OR in env vars referenced by `cpp.credential_env_key`.

```sql
SELECT cc.client_id, c.client_name,
  (cc.config->>'refresh_token') IS NOT NULL AS has_refresh_token_in_db,
  cpp.credential_env_key AS env_var_fallback
FROM c.client_channel cc
JOIN c.client c ON c.client_id = cc.client_id
LEFT JOIN c.client_publish_profile cpp ON cpp.client_id = cc.client_id AND cpp.platform = 'youtube'
WHERE cc.platform = 'youtube';
```

Expected: at least one of (`has_refresh_token_in_db`=true OR `env_var_fallback` IS NOT NULL) per client. Then verify the refresh works by triggering a manual refresh — if it returns `invalid_grant`, OAuth must be reconnected via dashboard.

#### 7-WP — WordPress (`wordpress-publisher`)

WordPress uses different config: `c.client.profile->>'wp_site_url'` + `c.client.profile->>'wp_username'` + env app password referenced by `c.client.profile->>'wp_secret_env_key'`.

```sql
SELECT c.client_id, c.client_name,
  c.profile->>'wp_site_url' AS wp_site_url,
  c.profile->>'wp_username' AS wp_username,
  c.profile->>'wp_secret_env_key' AS wp_secret_env_key,
  c.profile->>'website_publish_enabled' AS publish_enabled
FROM c.client c
WHERE c.profile->>'website_publish_enabled' = 'true'
  AND c.profile->>'wp_site_url' IS NOT NULL;
```

Expected: all three of `wp_site_url`, `wp_username`, `wp_secret_env_key` populated; the env var named in `wp_secret_env_key` exists in Supabase EF environment. Test by triggering the publisher with `{dry_run: true}` and verifying the `getWpCategoryId` call succeeds.

### 8. Rollback command pre-drafted

Draft the disable command BEFORE flipping. For Supabase MCP this is:

```
cron.alter_job(<jobid>, false)
```

Where `<jobid>` is the cron.job ID for the publisher. Have this ready in a separate window so it can be applied within seconds if smoke check fails post-flip.

## Flip the cron

Only after ALL 8 checks pass cleanly:

```sql
SELECT cron.alter_job(<jobid>, true);
```

Then:

## Post-flip smoke check (within 30 minutes)

1. Wait for first cron tick (per cron schedule)
2. Pull `m.worker_http_log` last 30 min for the platform
3. Verify response status 200 + expected results structure
4. Re-run S10 + S12 — should still be clean
5. If any anomaly — apply the rollback command immediately

## After 24h observation

1. Re-run S10 + S11 + S12 over full 24h window
2. Document outcome in `docs/audit/runs/<date>-<platform>-cron-resume.md`
3. If clean: cron is officially "resumed". If not: incident triage and possible rollback.

## Lessons applied

- **Lesson #46** — "Cron health is not system health" — checklist verifies CONSUMER-side state (drafts, queue rows, approvals, credentials), not just cron scheduler state.
- **T07 step 4 mistake** — original sequence checked `publish_enabled` profiles but didn't verify queue contents or fresh approvals.
- **D-01 standing rule** — checklist designed to be walked WITH ChatGPT in the loop for any high-stakes flip.

## Acceptance criteria (T09 done when)

1. Checklist authored and ChatGPT round-2-reviewed
2. Linked from T07 revised step 4 sequence
3. Walked successfully on T07 IG cron re-enable
4. Outcome documented in audit run state with each `<check>: pass` recorded
5. Becomes standing methodology for any future publisher cron flip
