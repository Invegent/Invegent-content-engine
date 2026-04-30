# Operational Audit Run — 2026-04-30 · Publishers (YouTube + Instagram)

**Trigger:** PK request 2026-04-30 evening Sydney — "audit why YouTube and Instagram aren't working"  
**Scope:** Operational (publisher-side), not Data Auditor scope. Filed here for traceability but NOT under any formal audit role yet (Operations Auditor not built per D181 standing rule).  
**Mode:** Manual investigation by chat session via Supabase MCP.  
**Snapshot reference:** `docs/audit/snapshots/2026-04-30.md` flagged the symptoms in Sections 6, 7, 11; this run drilled into causes.

---

## Symptoms (from snapshot)

- Section 7: 19 YouTube slots filled (NDIS-Yarns 5, Property Pulse 14) + 32 Instagram slots filled across 4 clients in last 14 days.
- Section 11: 14-day publish counts — Facebook 42, LinkedIn 93, Instagram 22 published + 1 failed, **YouTube absent entirely**.
- Section 6: `instagram-publisher-every-15m` (jobid 53) is `active=false`. Three legacy `seed-and-enqueue-*` jobs all `active=false` (jobid 11/64/65).

---

## F-PUB-001  ·  HIGH  ·  open  ·  YouTube enqueue trigger excludes YouTube

**Area:** Publisher pipeline  
**Object:** `m.enqueue_publish_from_ai_job_v1` (AFTER UPDATE trigger on `m.ai_job`)  
**Severity rationale:** entire YouTube publishing path silently broken for 3+ weeks; AI synthesis jobs are completing for YouTube slots (see F-PUB-003) but their output never reaches the publish queue.

### Issue

The trigger function `m.enqueue_publish_from_ai_job_v1` contains a hard-coded platform whitelist:

```sql
AND COALESCE(new.platform, '') IN ('facebook', 'linkedin', 'instagram')
```

`youtube` is not in this list. When a YouTube `m.ai_job` row updates to `status='succeeded'`, the trigger fires but the IF guard rejects YT immediately. No row is ever inserted into `m.post_publish_queue` for YouTube content.

The `youtube-publisher-every-30min` cron job (jobid 34) is healthy (48/48 successful runs in last 24h), but it is reading from an empty queue. It returns 200 to pg_cron because finding zero rows is not an error — it just means "nothing to publish".

### Evidence

- Trigger function definition pulled live from `pg_proc` — line 7 of body: `AND COALESCE(new.platform, '') IN ('facebook', 'linkedin', 'instagram')`.
- `m.post_publish_queue` for `platform='youtube'` (any time window): 2 rows total, both `dead`, both from 2026-04-09. **Zero rows since.**
- 19 YouTube slots are `filled` and all 19 have `m.ai_job` rows in `status='succeeded'` (see F-PUB-003 / sanity check).
- `youtube-publisher-every-30min` last 24h: 48 runs, all `succeeded`, no errors in `cron.job_run_details`.
- `m.post_publish` shows zero rows for `platform='youtube'` in last 14 days (snapshot section 11 confirmed).

### Recommended action

**Architecture question for PK first:** is YouTube intended to go through `m.enqueue_publish_from_ai_job_v1`, or was it deliberately excluded because YouTube uses a different path (e.g. via `video-worker` → `heygen-worker` → some YouTube-specific enqueue function we haven't found)?

Three paths forward depending on the answer:

1. **YT was meant to be in the trigger** (most likely — since `m.fill_pending_slots` produces YT slots and they go through the same `slot_fill_synthesis_v1` ai_job pipeline as FB/LI/IG):  
   One-line migration: add `'youtube'` to the whitelist tuple in the trigger. Tier 1, ~5 min, count-delta verification on `m.post_publish_queue` rows for YT after first fire.

2. **YT has a separate path that's also broken:**  
   We need to find that path and fix it. Check whether `video-worker` or `heygen-worker` is supposed to enqueue (their cron runs are healthy but doing what?). May require source-of-EF-truth from `supabase/functions/`.

3. **YT is intentionally NOT supposed to publish via this pipeline yet (e.g. waiting for full video-render readiness):**  
   Then the slot-fill side should NOT be filling YT slots either — or those filled slots should have a `status='blocked_by_platform'` or similar marker. As-is, YT slots fill, AI synthesis runs (incurring cost), and the output never publishes — that's a hidden cost leak (see F-PUB-003).

### Resolution

_(open — awaits PK architecture confirmation, then captured in T06 of action_list)_

---

## F-PUB-002  ·  MEDIUM  ·  open  ·  Instagram publisher disabled in response to Meta anti-spam block

**Area:** Publisher pipeline  
**Object:** `cron.job` jobid 53 `instagram-publisher-every-15m`  
**Severity rationale:** known to operator (cron is deliberately off). Backlog growing daily but not bleeding cost in the same way YT is.

### Issue

The Instagram publisher cron has been disabled (`active=false`) since 2026-04-25 ~08:15 UTC. Its 796th run that day attempted to publish a Property Pulse IG post and received Meta API error:

```
403: {
  "message": "Application request limit reached",
  "type": "OAuthException",
  "is_transient": false,
  "code": 4,
  "error_subcode": 2207051,
  "error_user_title": "Action is blocked",
  "error_user_msg": "We restrict certain activity to protect our commun..."
}
```

`error_subcode 2207051` is Meta's per-IG-account anti-automation flag, raised when posting cadence + content shape match their automated-behavior heuristics. `is_transient=false` means Meta classifies this as not auto-recoverable.

Since the cron was disabled, **92 Instagram queue items have accumulated across 4 clients**:

| Client | IG queued |
|---|---|
| Property Pulse | 53 |
| NDIS-Yarns | 24 |
| Care For Welfare | 10 |
| Invegent | 5 |
| **Total** | **92** |

### Evidence

- `cron.job` row for jobid 53: `active=false`.
- `cron.job_run_details` for jobid 53: 796 runs from 2026-04-13 21:45 to 2026-04-25 08:15, all `succeeded` at the cron level (the 403 was a publishing failure inside the EF, not a cron failure).
- `m.post_publish` row for the failed IG attempt: client=Property Pulse, created_at=2026-04-25 08:15 UTC, status=`failed`, full error JSON above.
- `m.post_publish_queue` IG `queued` rows by client: PP 53, NDIS 24, CFW 10, Invegent 5 — all `created_at` between 2026-04-23 11:40 and 2026-04-30 01:10.
- **Facebook is unaffected:** 42 FB posts published 2026-04-18 through 2026-04-30 06:10, zero `2207051` / spam errors. The block is per-IG-account, not per-Meta-app.

### Recommended action

Three options for IG recovery, requires PK decision:

1. **Resume IG publisher for the 3 unaffected clients only (NDIS-Yarns, CFW, Invegent).**  
   Use `c.client_publish_profile` per-client toggle. Property Pulse stays paused. Lowest risk.

2. **Resume all four clients with reduced cadence on PP.**  
   Adjust `min_post_gap_minutes` for PP to ~6h+ and accept that PP IG will catch up slowly. Risk: if PP IG account is still flagged, immediate re-block.

3. **Manual Meta Business Suite review of PP IG account first, then resume.**  
   Overlaps with T05 Meta business verification — PK contacts Meta dev support, gets visibility into PP IG account status, then resume based on what Meta says. Highest path-to-permanent-fix but slowest.

A combined path is reasonable: do (1) immediately to unblock NDIS/CFW/Invegent (production output for 3 of 4 clients), then do (3) for PP separately. (2) is the riskiest of the three.

### Resolution

_(open — captured in T07 of action_list, awaits PK decision)_

---

## F-PUB-003  ·  LOW  ·  observation  ·  YouTube AI synthesis cost may be sunk while publish path is broken

**Area:** Cost / hidden waste  
**Object:** `m.ai_job` rows where `slot_id` points at `m.slot.platform='youtube'`  
**Severity rationale:** observation, not action item. Verifiable. Cost impact unquantified.

### Issue

With F-PUB-001 active, YouTube slots are filling normally and triggering `slot_fill_synthesis_v1` ai_jobs. Verified: 19 of 19 YT-slot ai_jobs are in `status='succeeded'`. That synthesis incurred AI generation cost (script + metadata + possibly video-render via `video-worker` and `heygen-worker`).

`heygen-worker-every-30min` and `video-worker-every-30min` are both running 48/48 successfully in last 24h. We have not verified what those workers are actually producing for YT slots. They may be rendering full videos that never publish — cost leak.

### Evidence

- 19 YT-slot ai_jobs all `succeeded` (verified live).
- `video-worker-every-30min` (jobid 33) and `heygen-worker-every-30min` (jobid 44) both healthy 48/48.
- No corresponding `m.post_publish_queue` rows (see F-PUB-001).

### Recommended action

Deferred follow-up captured as B21 in action_list: when F-PUB-001 is fixed, audit whether `m.post_render_log` / video-worker output / HeyGen renders for the 19 stranded YT slots represent sunk AI cost. Quantify and decide whether to reuse those rendered assets or write them off.

### Resolution

_(open — informational, gated on F-PUB-001 fix)_

---

## Out-of-scope notes (for completeness)

- **Three legacy `seed-and-enqueue-*` crons (jobid 11 FB, 64 IG, 65 LinkedIn) are inactive.** All show `ERROR: canceling statement due to statement timeout` from their last attempted run. These are LEGACY paths from the pre-slot-driven era (per D170+). Their inactivity is correct — the slot-driven trigger `m.enqueue_publish_from_ai_job_v1` replaced them. The timeout errors are residual evidence of the build burst that exceeded their query budget; not relevant to current operations. Worth a one-line note in the relevant decision log if it isn't already captured.

- **Tokens shown as 2099-12-31 in snapshot Section 16** for FB+IG across all 4 clients are placeholder "never-tracked" sentinels, not real expiry. FB is publishing 42 posts in 14d unaffected, so token state is functional even with the placeholder. Out-of-scope for this audit (Security Auditor when role exists).

- **`enqueue-publish-queue-every-5m` (jobid 48)** showed an `ON CONFLICT specification` error in `last_error` but its 24h record is 288/288 succeeded. That error is historical (pre-window) and not relevant to current operations. Captured here for completeness; no action needed.

---

## Closure plan

- F-PUB-001: PK decides architecture, then T06 action item executes. If option 1 (most likely), one-line migration via Supabase MCP per D170. Verifies: YT row count in `m.post_publish_queue` increases on first trigger fire after migration applied.
- F-PUB-002: PK decides which clients to resume + per-client cadence. T07 captures. Resume = re-enable cron jobid 53 + adjust per-client `client_publish_profile.min_post_gap_minutes` if option 2.
- F-PUB-003: gated on F-PUB-001 fix. B21 in backlog.

All three findings logged in `docs/00_action_list.md` (T06, T07, B21). Not logged in `docs/audit/open_findings.md` because that file is currently scoped to the Data Auditor role per D181 — these are operational findings without a formal Operations Auditor role yet.
