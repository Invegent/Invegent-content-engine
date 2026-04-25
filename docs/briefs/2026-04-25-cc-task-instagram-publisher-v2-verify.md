# Claude Code Brief — Verify IG Publisher v2.0.0 Deploy + Unpause + Monitor

**Date:** 25 April 2026 Saturday afternoon
**Owner:** PK (run by handing this brief to Claude Code in `C:\Users\parve\Invegent-content-engine`)
**Estimated runtime:** 5–10 minutes including monitoring

---

## Context (read this first, do NOT skip)

Earlier today, instagram-publisher v2.0.0 was shipped to main (commit `562ab3e`) and deployed to production via `supabase functions deploy instagram-publisher` from PK's local PowerShell. The deploy itself succeeded — the line in the deploy output that confirms this is:

```
Deployed Functions on project mbkmaxqhsohbtwsqolns: instagram-publisher
```

After deploy, PK tried to verify via curl in PowerShell. Two non-issues that **look** like errors but aren't:

1. **`UNAUTHORIZED_NO_AUTH_HEADER` on /health** — This is Supabase edge gateway requiring the `apikey` header on every function call, even GET. It's not a function-level failure. Add the apikey header and it works.

2. **`-H: The term '-H' is not recognized'`** — PowerShell aliases `curl` to `Invoke-WebRequest`, which uses different flag syntax. The verify commands need to run in real bash (which Claude Code provides) or be rewritten as `Invoke-RestMethod` calls. Not a deploy problem.

So the deploy is **done**. This brief is the verify → unpause → monitor sequence using bash.

What v2.0.0 fixes (just so you can sanity-check observed behaviour matches expectation): closed M12 cross-post bug. v1.0.0 queried `m.post_draft` directly without filtering `pd.platform = 'instagram'`. v2.0.0 uses `m.publisher_lock_queue_v1(p_platform := 'instagram')` for atomic queue-based locking with three layers of platform discipline. See `docs/decisions/D169_instagram_publisher_v2_queue_refactor.md` for full reasoning.

The instagram-publisher cron (jobid 53) is currently `active=false`. It stays paused until v2.0.0 is verified working.

---

## Pre-flight checks

Before running the sequence below, confirm:

- [ ] You're in `C:\Users\parve\Invegent-content-engine` (or wherever the repo lives)
- [ ] `git pull` has run (the brief itself was committed today)
- [ ] You have access to two environment variables PK should export before invoking you:
  - `SUPABASE_ANON_KEY` — the publishable / anon key
  - `PUBLISHER_API_KEY` — the function-level auth key (the one set inside the EF as `PUBLISHER_API_KEY`)
- [ ] If those env vars aren't set, retrieve from PK with the SQL paths:

```sql
-- SUPABASE_ANON_KEY
SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publishable_key';

-- PUBLISHER_API_KEY
SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publisher_api_key';
```

PK can run these in the Supabase SQL editor and paste the values to you. **Do not echo or log either key in your output. Do not commit them anywhere.**

---

## Step 1 — Health check (verify v2.0.0 is the deployed version)

Run via bash:

```bash
curl -s https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/instagram-publisher/health \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

**Expected output:**
```json
{"ok":true,"function":"instagram-publisher","version":"instagram-publisher-v2.0.0"}
```

**If you see `instagram-publisher-v1.0.0`:** The deploy didn't reach the edge runtime. Re-run `supabase functions deploy instagram-publisher` and retry.

**If you see `UNAUTHORIZED_NO_AUTH_HEADER`:** The `apikey` header isn't being sent. Confirm `$SUPABASE_ANON_KEY` is exported.

**If you see anything else:** Stop. Report the response to PK. Do not proceed.

---

## Step 2 — Dry run (validate platform filter + lock RPC)

This invokes the function with `dry_run: true` so it locks queue rows, runs through validation logic, but does NOT publish to Instagram. The locked rows get re-queued with `last_error: 'dry_run_ok'`.

```bash
curl -s -X POST https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/instagram-publisher \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "x-publisher-key: $PUBLISHER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 2, "dry_run": true}'
```

**Expected: one of two shapes.**

Shape A — work was found:
```json
{
  "ok": true,
  "version": "instagram-publisher-v2.0.0",
  "worker_id": "instagram-publisher-xxxxxxxx",
  "locked": 2,
  "processed": 2,
  "results": [
    { "queue_id": "...", "status": "dry_run_ok", "format": "image_quote" },
    { "queue_id": "...", "status": "dry_run_ok", "format": "image_quote" }
  ]
}
```

Shape B — nothing eligible right now:
```json
{
  "ok": true,
  "message": "no_instagram_publish_jobs",
  "worker_id": "instagram-publisher-xxxxxxxx",
  "locked": 0
}
```

Both shapes are PASS. Shape B can happen if `min_gap_minutes` or `max_per_day` thresholds are blocking everyone.

**Failure modes to watch for and what they mean:**

- `"status": "failed"` with `"error": "platform_mismatch:..."` → The lock RPC returned a non-IG row. Should be impossible. Flag to PK.
- `"status": "failed"` with `"error": "draft_platform_mismatch:..."` → A queue row tagged `platform='instagram'` points at a draft with `pd.platform != 'instagram'`. Indicates M11 trigger is broken or someone wrote a queue row manually. Flag to PK and stop.
- `"status": "failed"` with `"error": "no_active_instagram_publish_profile"` → A client has an IG queue row but no IG profile row. Data integrity issue, flag to PK.

After dry run, **verify via SQL that no real publishes happened in the last 5 min**:

```sql
SELECT COUNT(*) AS new_publishes
FROM m.post_publish
WHERE platform = 'instagram'
  AND created_at > NOW() - INTERVAL '5 min'
  AND status = 'published';
```

Expected: 0.

---

## Step 3 — Unpause cron jobid 53

Only proceed if Step 1 returned v2.0.0 AND Step 2 returned a clean PASS shape.

Run via the Supabase MCP `apply_migration` tool (or PK runs this in SQL editor — your call):

```sql
SELECT cron.alter_job(53, active := true);
```

Then verify:
```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobid = 53;
```

Expected: `active = true`.

---

## Step 4 — Monitor first live tick

The IG cron schedule is `*/15 * * * *`. So the next tick fires at the next 15-minute mark (e.g. if you unpause at 17:42, next tick is 17:45).

**Wait until at least 30 seconds past the next 15-min mark, then check:**

```sql
-- Did the cron tick fire?
SELECT 
  jrd.start_time AT TIME ZONE 'Australia/Sydney' AS aest,
  jrd.status,
  EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) AS secs,
  LEFT(jrd.return_message, 200) AS msg
FROM cron.job_run_details jrd
WHERE jrd.jobid = 53
  AND jrd.start_time > NOW() - INTERVAL '5 min'
ORDER BY jrd.start_time DESC;
```

Expected: at least one row, `status = 'succeeded'`. Note that `succeeded` only means the HTTP dispatch worked — what matters is the next query.

**Did anything actually publish?**

```sql
SELECT 
  pp.published_at AT TIME ZONE 'Australia/Sydney' AS pub_aest,
  c.client_slug,
  pd.platform AS draft_platform,
  pp.platform AS publish_platform,
  pd.platform = pp.platform AS platforms_match,
  LEFT(pd.draft_title, 60) AS title,
  pp.platform_post_id
FROM m.post_publish pp
JOIN c.client c ON c.client_id = pp.client_id
LEFT JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
WHERE pp.platform = 'instagram'
  AND pp.created_at > NOW() - INTERVAL '5 min'
ORDER BY pp.published_at DESC;
```

**Critical assertion — every row must have `platforms_match = true`.** If any row shows `platforms_match = false`, that's a regression. Stop, re-pause cron via `SELECT cron.alter_job(53, active := false)`, and flag to PK with the offending row.

If 0 rows returned, that's also fine — the throttle (`max_per_day = 2`) may have already capped the day, or `min_gap_minutes` may be holding. Check:

```sql
-- Why didn't anything publish? (if the above returned 0 rows)
SELECT 
  c.client_slug,
  cpp.max_per_day,
  cpp.min_gap_minutes,
  COUNT(*) FILTER (WHERE pp.published_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Australia/Sydney') AT TIME ZONE 'Australia/Sydney') AS pub_today,
  MAX(pp.published_at) AT TIME ZONE 'Australia/Sydney' AS last_pub_aest
FROM c.client c
JOIN c.client_publish_profile cpp ON cpp.client_id = c.client_id AND cpp.platform = 'instagram'
LEFT JOIN m.post_publish pp ON pp.client_id = c.client_id AND pp.platform = 'instagram' AND pp.status = 'published'
WHERE c.status = 'active'
GROUP BY c.client_slug, cpp.max_per_day, cpp.min_gap_minutes
ORDER BY c.client_slug;
```

Note: Invegent IG has 4 publishes today already (from v1.0.0 morning ticks). Cap is 2. Invegent will NOT publish more IG today — that's expected.

NY IG has 18 publishes today (the cross-posts from 19 April don't count for today's UTC day cap, but you can verify by checking `pub_today` for NY IG = 0 in the above query).

PP IG has 0 publishes today.

---

## Step 5 — Acceptance criteria

The deploy is verified successful when ALL of these are true:

- [ ] `/health` returns `instagram-publisher-v2.0.0`
- [ ] Dry run returns Shape A or Shape B with no `failed` rows
- [ ] Cron jobid 53 is `active = true`
- [ ] At least one cron tick has fired in the last 20 min (or you've waited 20 min for one)
- [ ] Either: a real IG publish landed AND its row has `platforms_match = true`
- [ ] Or: throttle/gap explains the absence cleanly per Step 4 query

When all six are satisfied, write a short closure note to `docs/00_sync_state.md` updating the "M12 closure" block from "deploy pending" to "deploy verified" with a timestamp. Use the GitHub MCP tool, fetch fresh SHA, single targeted edit (don't rewrite the whole file). Commit message: `docs(sync_state): IG publisher v2.0.0 deploy verified — A10b closed`.

If A10b can be closed (clean publish observed), also update `docs/15_pre_post_sales_criteria.md` Section A item A10b. That file may be stale (last touched 22 Apr per memory) — read it first, decide if a single status update is enough or if it needs broader resync; ask PK if uncertain.

---

## What NOT to do

- Don't echo or log auth keys in any output.
- Don't run `cron.alter_job` if Step 1 or Step 2 didn't pass cleanly.
- Don't commit any of the dry-run output that contains queue UUIDs or post IDs to docs unless explicitly redacting any internal identifiers PK considers sensitive.
- Don't run the cleanup script for the 18 NY IG cross-posts in this brief — that's a separate workflow PK runs manually with `$NY_IG_TOKEN`.
- Don't attempt to fix any failure you find unless it's a one-line config issue. Flag to PK.

---

## On failure / stuck state

If anything goes sideways:

1. Run `SELECT cron.alter_job(53, active := false);` to re-pause the cron defensively.
2. Capture the exact failing output.
3. Stop and report to PK with: (a) which step failed, (b) exact error message, (c) what you ran immediately before, (d) current state of `cron.job` row 53.

Don't troubleshoot beyond the obvious. The IG publisher is a single point of failure for instagram across all 4 clients — when in doubt, re-pause and let PK look.

---

## Reference docs

- `docs/decisions/D169_instagram_publisher_v2_queue_refactor.md` — full rationale for v2.0.0
- `docs/00_sync_state.md` — current system state, "M12 CLOSURE" block at top
- `supabase/functions/instagram-publisher/index.ts` — the deployed code (commit `562ab3e`)
- `supabase/functions/publisher/index.ts` — the FB publisher pattern v2.0.0 mirrors
