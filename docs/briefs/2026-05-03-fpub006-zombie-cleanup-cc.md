---
id: fpub006-zombie-cleanup-and-linkedin-investigation
status: ready
created: 2026-05-03T22:15:00Z
owner: claude-code
chat-applies-dml: yes
sunset: 2026-05-04T22:15:00Z
related-findings: F-PUB-006 (NEW), F-PUB-005, B-INV-LinkedIn-Queue-Stall
related-decisions: D170 (chat applies migrations), D186 (closure-first), Lesson #51, Lesson #61
related-runs: 2026-05-02-b31-auto-approver-v160-deploy.md
---

# F-PUB-006 Zombie Queue Cleanup + B-INV-LinkedIn-Queue-Stall Investigation

## Purpose

Close head-of-line blocking on `m.post_publish_queue` that was exposed by B31 deploy on Sat 2 May. Investigate (not yet remediate) the 5 PP-LinkedIn stuck-cluster items.

## Context

- B31 deployed auto-approver v1.6.0 at 2026-05-02 12:39:33 UTC. Source: `supabase/functions/auto-approver/index.ts` commit `f65e16d2`.
- Sun 3 May 22:09 UTC pipeline state: 252 fresh approvals + 203 rejections post-deploy. Only **2 publishes** in the 9.5h since deploy (NDIS-Yarns FB 17:35, PP FB 17:00).
- Investigation (chat session 3 May morning) found:
  - **F-PUB-006 (NEW)**: publisher fetches oldest-`scheduled_for` first with small per-tick limit. 4 orphan rows (`post_draft_not_found`) + 13 unapproved rows (`not_approved:needs_review`) hold the front of the queue. Fresh items behind never get attempted.
  - **5 PP-LinkedIn rows** (separate cluster) have `attempt_count = null`, no errors, scheduled 24-31h ago — never touched by the publisher at all. Different bug; investigate before remediating.
- This was invisible before B31 because F-PUB-004 starvation kept fresh items from joining the queue.

## Prerequisites

- Supabase MCP available (chat-side; CC drafts SQL, chat applies)
- GitHub MCP available (CC commits investigation findings)
- ChatGPT Review MCP available (chat fires before each DML stage)

## Pre-flight validation (Lesson #61 — RUN FIRST)

CC executes these read-only queries via Supabase `execute_sql`. Counts must match expected before any DML stage proceeds. If counts deviate, stop and write discrepancy to state file.

### Step 0a — orphan rows
```sql
SELECT count(*) AS orphan_count
FROM m.post_publish_queue q
WHERE q.status='queued'
  AND q.last_error='post_draft_not_found'
  AND NOT EXISTS (
    SELECT 1 FROM m.post_draft pd WHERE pd.post_draft_id = q.post_draft_id
  );
```
**Expected:** 4 rows. **Abort if:** 0 OR > 10.

### Step 0b — not_approved zombies
```sql
SELECT count(*) AS not_approved_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status='queued'
  AND q.last_error='not_approved:needs_review'
  AND pd.approval_status='needs_review';
```
**Expected:** 13 rows. **Abort if:** 0 OR > 25.

### Step 0c — LinkedIn stuck cluster (read-only inspection)
```sql
SELECT q.queue_id, q.post_draft_id, q.scheduled_for, q.attempt_count,
       q.last_error, q.locked_at, q.locked_by,
       pd.approval_status, pd.image_status, pd.video_status,
       pd.draft_format->>'auto_review' IS NOT NULL AS has_auto_review_payload
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
JOIN c.client c ON c.client_id = q.client_id
WHERE q.status='queued'
  AND q.platform='linkedin'
  AND c.client_slug='property-pulse'
  AND q.attempt_count IS NULL
  AND q.scheduled_for <= now() - interval '12 hours'
ORDER BY q.scheduled_for;
```
**Expected:** 5 rows. **Abort if:** 0.

---

## Stage 1 — Orphan cleanup (DML, chat-applies)

### What

Mark the 4 orphan queue rows as `dead` with explicit reason. These rows reference `post_draft_id` values that no longer exist in `m.post_draft`. They are confirmed zombies — they will never publish under any circumstance.

### How

CC drafts the SQL into `supabase/sql/2026-05-03-fpub006-stage1-orphan-cleanup.sql`. Chat reviews, fires MCP review, applies via `execute_sql`.

### SQL

```sql
-- F-PUB-006 Stage 1: orphan queue rows where post_draft no longer exists
UPDATE m.post_publish_queue
SET status='dead',
    dead_reason='post_draft_not_found_orphan_F-PUB-006_2026-05-03',
    updated_at=now()
WHERE status='queued'
  AND last_error='post_draft_not_found'
  AND NOT EXISTS (
    SELECT 1 FROM m.post_draft pd WHERE pd.post_draft_id = m.post_publish_queue.post_draft_id
  )
RETURNING queue_id, client_id, platform, post_draft_id;
```

### Verification

```sql
SELECT count(*) FROM m.post_publish_queue
WHERE status='dead' AND dead_reason LIKE '%F-PUB-006_2026-05-03';
```
**Expected:** 4 (or whatever Step 0a returned).

### MCP Review payload (chat fires before apply)

- `action_type`: `sql_destructive`
- `decision_under_review`: "Mark 4 orphan queue rows as dead to unblock head-of-line in publisher"
- `production_action_if_approved`: SQL block above
- `consequence_if_delayed`: "B31 closure remains unobservable; NDIS-Yarns FB and PP FB stay at 1 publish/day despite headroom"
- `cost_of_waiting`: "low — orphans accumulate by ~1/day, observable backlog grows but no permanent harm"
- `current_evidence`: pre-flight count + chat session investigation Q4 results
- `known_weak_evidence`: "haven't confirmed orphan rows aren't being touched by some background reconciler"
- `default_action`: "apply Stage 1; observe 30min; if no fresh publishes, investigate before Stage 2"

---

## Stage 2 — Not-approved zombie cleanup (DML, chat-applies)

### What

Mark the 13 not-approved queue rows as `dead`. These were enqueued by the F-PUB-005 trigger gap (trigger function `m.enqueue_publish_from_ai_job_v1` doesn't check `approval_status`). The referenced drafts are at `needs_review` — under v1.6.0 they will be terminally rejected within 24h. Queue rows pointing at rejected drafts are zombies.

### Decision rationale

**Why mark dead now rather than wait?** If we wait, the trigger `trg_handle_draft_rejection` fires when each draft moves to `rejected` and resets the slot. But the queue row itself doesn't get cleaned automatically — the draft moves to `rejected`, the publisher gate on the next attempt becomes `not_approved:rejected`, queue row stays alive forever. So they're zombies either way.

**What this does NOT do:** patch F-PUB-005 (the trigger gap that causes premature enqueue). That's a DDL change, separate brief, separate MCP review. This brief only cleans up the symptoms.

### SQL

```sql
-- F-PUB-006 Stage 2: not-approved queue rows pointing at needs_review drafts
UPDATE m.post_publish_queue q
SET status='dead',
    dead_reason='F-PUB-005_premature_enqueue_unblocks_F-PUB-006_2026-05-03',
    updated_at=now()
FROM m.post_draft pd
WHERE q.post_draft_id = pd.post_draft_id
  AND q.status='queued'
  AND q.last_error='not_approved:needs_review'
  AND pd.approval_status='needs_review'
RETURNING q.queue_id, q.client_id, q.platform, q.post_draft_id;
```

### Verification

```sql
SELECT count(*) FROM m.post_publish_queue
WHERE status='dead' AND dead_reason LIKE 'F-PUB-005_premature_enqueue_unblocks_F-PUB-006_2026-05-03';
```
**Expected:** 13 (or whatever Step 0b returned).

### MCP Review payload (chat fires before apply)

- `action_type`: `sql_destructive`
- `decision_under_review`: "Mark 13 unapproved queue rows as dead — these were prematurely enqueued by F-PUB-005 trigger gap and will never publish"
- `production_action_if_approved`: SQL block above
- `consequence_if_delayed`: "Stage 1 alone may not free up enough fronts of queue; HOL blocking persists"
- `cost_of_waiting`: "low — same reasoning as Stage 1"
- `current_evidence`: pre-flight count + draft approval_status confirmed `needs_review`
- `known_weak_evidence`: "if v1.6.0 approves any of these 13 in the next 30min before we apply, we lose those approvals; minor — they re-enter queue freshly"
- `default_action`: "apply Stage 2 after Stage 1 verified observable; if Stage 1 alone closes the bottleneck, defer Stage 2 24h"

---

## Stage 3 — Observable closure check (read-only)

### What

Wait 30 minutes after Stage 2 apply. Confirm fresh publishes are flowing.

### Query

```sql
SELECT 
  c.client_slug, pp.platform, count(*) AS published_post_stage2,
  MIN(pp.published_at) AS first_publish, MAX(pp.published_at) AS last_publish
FROM m.post_publish pp
JOIN c.client c ON c.client_id = pp.client_id
WHERE pp.published_at >= '<stage_2_apply_timestamp>'::timestamptz
GROUP BY c.client_slug, pp.platform
ORDER BY c.client_slug, pp.platform;
```

### Exit criteria

- **At least 1 fresh publish** in NDIS-Yarns FB within 30 min (4 fresh items waiting, slot available)
- **At least 1 fresh publish** in PP FB within 30 min (1 fresh item waiting, slot available)
- LinkedIn / IG / WordPress not part of this gate (LinkedIn has separate B-INV stall; IG paused)

If 0 fresh publishes after 30 min: B31 closure has a deeper issue than HOL blocking. Stop. Write findings to state file. Do not assume cleanup worked.

This is the **first concrete proof B31 closes F-PUB-004 in production** — F-PUB-004 → fresh approvals → publish queue → publisher → posted.

---

## Stage 4 — LinkedIn stall investigation (READ-ONLY)

### What

Investigate why the 5 PP-LinkedIn rows are never being fetched. Different mechanism than HOL blocking. Do NOT remediate in this brief — that's a separate brief next session.

### Steps

**4a.** CC reads `supabase/functions/linkedin-zapier-publisher/index.ts` (full source). Identify:
- The eligibility query (which rows does it fetch?)
- ORDER BY, LIMIT, filters on platform / scheduled_for / status / image_status / approval_status
- Any client-level allowlist or vertical filter

**4b.** Run diagnostic queries on the 5 stuck rows:

```sql
-- Full state dump on the 5 stuck rows
SELECT 
  q.queue_id, q.scheduled_for, q.attempt_count, q.locked_at,
  pd.approval_status, pd.image_url, pd.image_status, pd.video_status,
  pd.draft_format ? 'r6' AS has_r6_payload,
  pd.draft_format ? 'image_quote' AS has_image_quote_payload,
  cpp.publish_enabled, cpp.paused_until, cpp.r6_enabled,
  cpp.preferred_format_linkedin
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
JOIN c.client c ON c.client_id = q.client_id
LEFT JOIN c.client_publish_profile cpp 
  ON cpp.client_id = q.client_id AND cpp.platform = q.platform AND cpp.is_default
WHERE q.queue_id IN (
  '479236ad-c14a-4418-8f13-d9ab0fd63173',
  'cd0db34a-4761-4334-b8a2-8b2b7152d7b6',
  '5085087f-c47a-4768-95a8-20d88c01dd50',
  'dd0a25e5-3e91-4728-b9af-0a12fcc4114c',
  'c3a23f32-b0dd-462c-bc79-c184f74ac225'
);
```

**4c.** Compare findings against the source from 4a. Form hypothesis: which filter excludes these rows?

**4d.** Write findings to `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md`. Include:
- Source-side eligibility logic (excerpt from publisher EF)
- Data-side state of the 5 rows (Q output)
- Hypothesis (which filter is excluding them, with evidence)
- Proposed remediation direction (NOT applied)

**4e. STOP.** Do not propose or apply remediation. Remediation goes in a separate brief next session, after PK reviews findings.

---

## Exit criteria (whole brief)

- ✅ Pre-flight counts match expected (4 + 13 + 5)
- ✅ Stage 1: 4 orphan rows now `dead` with reason
- ✅ Stage 2: 13 zombie rows now `dead` with reason
- ✅ Stage 3: ≥ 1 fresh publish in BOTH NDIS-Yarns FB AND PP FB within 30 min of Stage 2 apply
- ✅ Stage 4: investigation findings committed to repo

If any stage fails, halt the brief and write state file with what worked + what didn't + what's needed to resume.

---

## Failure modes

| If… | Then… |
|---|---|
| Step 0a returns ≠ 4 | Stop, write count discrepancy to state file. Don't proceed to Stage 1. |
| Step 0b returns ≠ 13 | Stop, write count discrepancy. Don't proceed to Stage 2. |
| Step 0c returns ≠ 5 | Note in state file but proceed (Stage 4 is read-only, drift is fine to investigate). |
| MCP review on Stage 1 returns `escalate` | Follow protocol v2.17 response-side procedure. Pause for PK. |
| MCP review on Stage 2 returns `escalate` | Same. Apply Stage 1 only if Stage 1 was approved; treat Stage 2 as paused. |
| Stage 3 shows 0 fresh publishes after 30 min | Deeper bug than HOL. Stop. Write to state file. Don't loop or guess. |
| Stage 4a finds source contains DML or destructive logic | Note in findings, don't run anything. CC is read-only here. |

---

## Handover (per memory entry 11 — 4-way sync)

After completion (success or partial), CC writes:

- **Run state**: `docs/runtime/runs/2026-05-03-fpub006-cleanup.md` — chronological log of pre-flight counts, MCP review IDs, SQL apply results, Stage 3 observed timestamps, Stage 4 hypothesis summary
- **Investigation file** (Stage 4 output): `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md`
- **Action list bump**: `docs/00_action_list.md` v2.19 → v2.20 with:
  - F-PUB-006 marked closed (or partial)
  - F-PUB-005 status updated (still open — trigger patch is separate)
  - B-INV-LinkedIn-Queue-Stall → "investigation complete, remediation pending PK review"
  - Add row for F-PUB-005 trigger patch as new candidate (no priority assigned yet — PK to review)
- **Sync state addendum**: `docs/00_sync_state.md` — append session segment

PK signals "morning check" or "done" → chat fetches state file from GitHub.

---

## What this brief explicitly does NOT do

- Patch the F-PUB-005 trigger function (that's DDL, separate brief, separate MCP review)
- Remediate the LinkedIn stall (Stage 4 is investigation only)
- Re-enable the IG cron (paused for separate Meta-block reasons; T05 + T07 governance)
- Touch any post_draft rows (only post_publish_queue)
- Bulk-quarantine anything by pattern (named queue_ids only — Lesson #46)

---

## Estimated time

- Pre-flight (CC): 5 min
- Stage 1 (CC drafts SQL + chat MCP review + apply): 15 min
- Stage 2 (same): 15 min
- Stage 3 (wait + observe): 30 min
- Stage 4 (CC source read + diagnostic + write findings): 30-45 min

Total: ~95-110 min. Closure budget tracking per D186: estimate 1.5h logged.

---

## Open questions for PK (no blocker — answer when convenient)

1. F-PUB-005 trigger patch — defer to next session, or fast-follow this brief? (Recommend defer.)
2. The `m.post_publish_queue.dead = 42` baseline from Sat — should we audit those 42 too, or leave as-is until next sweep brief? (Recommend leave.)
