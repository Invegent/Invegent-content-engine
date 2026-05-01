# T09 — Safe-to-Resume Publisher Checklist

**Status**: Authored, awaiting ChatGPT review
**Type**: Operational checklist
**Owner**: PK walks before each cron flip; chat helps verify

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
-- For platforms where T08 is the dependency: how many fresh approvals in last 24h?
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
-- Are there any pre-fix queue rows still referencing non-approved drafts?
SELECT COUNT(*) AS orphan_count
FROM m.post_publish_queue ppq
JOIN m.post_draft pd ON pd.post_draft_id = ppq.post_draft_id
WHERE ppq.platform = '<TARGET_PLATFORM>'
  AND ppq.status = 'queued'
  AND pd.approval_status != 'approved';
```

**Expected**: Zero. If non-zero, run T10 disposition before flipping cron. The new publisher gate (post-T13/T17/T18) will hold these on next run anyway, but better to pre-empt the noise.

### 4. Dry run passes

Trigger the publisher manually with `{limit: 1, dry_run: true}`. Expected outcomes:
- If queue is empty: `{message: 'no_<platform>_publish_jobs'}`
- If queue has items: `{status: 'dry_run_ok'}` per row
- No `{status: 'failed'}` or `{status: 'held', reason: 'not_approved'}` (the latter would indicate a queue contamination caught by the new gate — STOP and run T10).

### 5. S10 business-outcome check clean

```sql
-- Last 24h publishing health for target platform
SELECT pp.status, COUNT(*) AS row_count
FROM m.post_publish pp
WHERE pp.platform = '<TARGET_PLATFORM>'
  AND pp.created_at > NOW() - INTERVAL '24 hours'
GROUP BY pp.status;
```

**Expected**: For a stalled platform being re-enabled, you'd expect mostly zeros or low counts. Any unexpected `'failed'` rows in last 24h need investigation.

### 6. S12 approval-gate compliance check clean

```sql
-- Verify no published rows with non-approved drafts (post-publisher-gate-deploy)
SELECT pp.platform, pd.approval_status, COUNT(*) AS row_count
FROM m.post_publish pp
JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
WHERE pp.platform = '<TARGET_PLATFORM>'
  AND pp.created_at > NOW() - INTERVAL '24 hours'
  AND pp.status = 'published'
GROUP BY pp.platform, pd.approval_status;
```

**Expected**: All rows in `'approved'` or `'published'`. Any in `'needs_review'` or `'rejected'` means the publisher gate isn't working — STOP and verify T13/T17/T18 deploy was successful.

### 7. OAuth + token state confirmed

```sql
-- Verify access tokens haven't expired for the platform
SELECT cpp.client_id, c.client_name,
  cpp.token_expires_at,
  cpp.token_expires_at > NOW() + INTERVAL '24 hours' AS valid_24h
FROM c.client_publish_profile cpp
JOIN c.client c ON c.client_id = cpp.client_id
WHERE cpp.platform = '<TARGET_PLATFORM>'
  AND cpp.publish_enabled = true
  AND cpp.status = 'active';
```

**Expected**: All `valid_24h=true`. Any `false` or NULL — refresh OAuth before flipping cron.

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

- **Lesson #46** — "Cron health is not system health" — checklist verifies CONSUMER-side state (drafts, queue rows, approvals), not just cron scheduler state.
- **T07 step 4 mistake** — original sequence checked `publish_enabled` profiles but didn't verify queue contents or fresh approvals. This checklist catches that.
- **D-01 standing rule** — checklist is designed to be walked WITH ChatGPT in the loop for any high-stakes flip.

## Acceptance criteria (T09 done when)

1. Checklist authored and ChatGPT-reviewed
2. Linked from T07 revised step 4 sequence
3. Walked successfully on T07 IG cron re-enable
4. Outcome documented in audit run state with each `<check>: pass` recorded
5. Becomes standing methodology for any future publisher cron flip
