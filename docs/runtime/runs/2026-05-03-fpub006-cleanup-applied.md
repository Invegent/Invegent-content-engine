# F-PUB-006 cleanup applied — chat-side run state

**Brief:** `docs/briefs/2026-05-03-fpub006-zombie-cleanup-cc.md`
**Predecessor:** `docs/runtime/runs/2026-05-03-fpub006-cleanup.md` (CC's pre-flight + Stage 4 investigation)
**Owner:** chat (chat applies DML stages per D170 boundary; CC drafted SQL)
**Outcome:** Stages 1+2 applied successfully. Stage 3 observation window 2026-05-03 00:20 → 00:50 UTC.

---

## Apply timeline

| Step | UTC | Action | Result |
|---|---|---|---|
| 22:51 | CC pre-flight | 4 + 17 + 5 — Stage 2 deviation (+4 vs brief expected 13) | CC halted Stage 2; Stage 1 SQL drafted |
| 22:55 | Chat re-verify | 4 + 17 (PP-FB +1 since CC) | F-PUB-005 trigger actively producing zombies confirmed |
| 23:00 | Investigation: 42-dead audit + F-PUB-005 design | Audit committed `8a791fbd`; investigation `bd25eb0b`; patch brief `6f54e007` | Drafted, not applied |
| 23:05 | MCP review Stage 1 (1st pass) | escalate=true, partial, generic "external systems" objection | PK chose Path B — silence objection with evidence |
| 23:08 | Path B investigation | Org-wide grep dead_reason: 5 results all in content-engine; 0 in dashboard/portal repos; ai-worker dead_reason is comment about m.ai_job not queue | Concrete evidence gathered |
| 23:10 | MCP review Stage 1 (2nd pass) | proceed, agree, 0 pushback | review_id `0f74aff2-ea9f-43c7-b5ef-51bedb4389cc` |
| 23:11 | **Stage 1 applied** | UPDATE returned 4 rows: d75ba206, d62ff526 (PP-FB); 3deaefb3, 6bfcc9fb (NDIS-FB) | dead_reason=`post_draft_not_found_orphan_F-PUB-006_2026-05-03` |
| 23:12 | MCP review Stage 2 (1st pass) | proceed, agree, 0 pushback | review_id `9448d4a4-a04d-4723-b469-76a1eedaafcb` |
| 00:20 | **Stage 2 applied** | UPDATE returned 17 rows: 12 PP-FB + 4 CFW-IG + 1 NDIS-FB | dead_reason=`F-PUB-005_premature_enqueue_unblocks_F-PUB-006_2026-05-03` |
| 00:21 | Verification + apply timestamp captured | Dead pool: 4 + 17 + 42 = 63; F-PUB-005 zombies remaining: 0; queued items due-now: 10 | Stage 3 observation window: 00:20 → 00:50 UTC |

---

## SQL applied (verbatim)

### Stage 1
```sql
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
**Returned 4 rows.**

### Stage 2
```sql
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
**Returned 17 rows.**

---

## MCP review trail

Three reviews fired this session, two distinct outcomes:

| review_id | stage | pass | verdict | escalate | resolution |
|---|---|---|---|---|---|
| `b75d8313-db0e-4952-a3fa-df69a7ae91e8` | 1 | 1st | partial | true | Generic "external systems" with empty pushback_points. Path B per protocol v2.17. |
| `0f74aff2-ea9f-43c7-b5ef-51bedb4389cc` | 1 | 2nd | agree | false | Cleared after Path B evidence. |
| `9448d4a4-a04d-4723-b469-76a1eedaafcb` | 2 | 1st | agree | false | Same evidence carried forward; cleared first pass. |

The 1st-pass Stage 1 escalation is a useful data point for the protocol: ChatGPT echoed Claude's own `known_weak_evidence` back as "unverified claims" and produced a generic correction. Path B (silence objection with evidence) was the right response. Capturing as **Lesson #62 candidate**: protocol v2.17 should differentiate between "ChatGPT raised new evidence I didn't have" and "ChatGPT echoed my own caveats" — the former requires investigation, the latter requires evidence-gathering.

---

## Path B investigation — evidence captured

Org-wide grep across `Invegent-content-engine`, `invegent-dashboard`, `invegent-portal` for `dead_reason` and `post_publish_queue`:

- 5 `dead_reason` references total, all in `Invegent-content-engine`
  - 2 SQL files (this brief's own SQL + Phase B 30 Apr migration; declarative)
  - 1 column-purposes migration (labels only)
  - `supabase/functions/ai-diagnostic/index.ts` — read-only consumer
  - `supabase/functions/ai-worker/index.ts` — single comment about pg_cron sweep on `m.ai_job` (different table)
- 0 `dead_reason` references in dashboard/portal repos
- 0 `post_publish_queue` references in dashboard/portal repos
- ai-worker source review confirmed no writes to `m.post_publish_queue` from that EF
- Trigger inventory (verified via `information_schema.triggers`): 2 triggers on `m.post_publish_queue`'s parent tables only
  - `trg_enqueue_publish_from_ai_job_v1` on `m.ai_job` (writes queue rows; does not read dead status)
  - `trg_handle_draft_rejection` on `m.post_draft` (resets slot only; doesn't touch queue)

**Conclusion:** zero external-system dependency on dead status semantics. Empirical precedent: the historic 2 Apr orphan (queue_id with attempt_count=734) was marked dead manually with the same pattern; the system continued running normally for 32 days afterwards.

---

## F-PUB-005 patch brief — pre-flight result (BLOCKED)

Pre-flight P1-P4 run during Stage 3 observation window:

| Check | Expected | Actual | Status |
|---|---|---|---|
| P1 — trigger inventory | 2 (old + handler), new trigger absent | 2 expected present, new absent | ✓ |
| P2 — function source intact | matches investigation | confirmed | ✓ |
| P3 — approved-without-queue | 0 (abort if > 5) | **108 total → 64 normal post-publish + 44 real "lost"** | ⚠️ **BLOCKER** |
| P4 — quiet hour | < 5 ai_job succeeds in last 30 min | 2 | ✓ |

**P3 has two components:**
- 64 approved drafts have `m.post_publish` records (queue rows are normally deleted post-publish — the brief's P3 check has a wrong assumption; queue rows do NOT persist after successful publish).
- **44 approved drafts have NO `m.post_publish` record AND no queue row.** These are real "lost" approvals that never published.

**Root cause hypothesis (NEW finding — F-PUB-007 candidate):** the existing trigger silently skips when queue is at `max_queued_per_platform` cap:
```sql
IF v_queued_count < v_max_queued THEN
  -- only inserts if under cap
```
Approvals that hit during cap-saturation periods get lost — no queue row, no retry, no error logged.

The proposed Option A F-PUB-005 patch carries the same silent-skip-at-cap behaviour. Fixing that is beyond the patch's scope.

**Decision: F-PUB-005 patch brief remains `status: draft`. Do NOT promote to `ready`.**

A new candidate brief is needed:
- **F-PUB-007 — silent-skip-at-cap loses approvals.** Triage scope: backfill the 44 lost approvals (or mark stale) AND extend trigger to log skipped-at-cap events for observability. Estimated 0.5-1.5h closure budget.

---

## Action list bumps required (next session)

- F-PUB-006: mark **CLOSED (cleanup phase)** — Stages 1+2 applied, dead pool 63, 0 F-PUB-005 zombies remaining. Stage 3 observation pending.
- F-PUB-005 trigger patch: **status remains `draft`** — gated on F-PUB-007 resolution
- F-PUB-007 (NEW): silent-skip-at-cap finding — added as candidate; estimate 0.5-1.5h closure
- B-INV-LinkedIn-Queue-Stall: investigation complete; remediation pending PK review
- B-INV-LinkedIn-PhantomPublishes: investigation candidate (Stage 4 secondary anomaly — 3 daily 00:00 UTC PP-LinkedIn publishes whose queue_ids don't exist)
- B38 reconciliation: action_list v2.20 row pointing at separate F-PUB-005 candidate is redundant with `docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md` — collapse next session

---

## Stage 3 — observation window

**Apply time UTC:** 2026-05-03 00:20:20
**Window:** 2026-05-03 00:20 → 00:50 UTC (= 10:20 → 10:50 AEST)
**Publisher cron:** every 10 min → 3 ticks expected

**Exit criteria (from brief):**
- ≥ 1 fresh publish in NDIS-Yarns FB AND
- ≥ 1 fresh publish in PP FB

**Already-queued items due-now at apply time:** 10 (FB + LinkedIn combined)

**Stage 3 verification SQL** (chat runs at ~00:50 UTC):
```sql
SELECT 
  c.client_slug, pp.platform, count(*) AS published_post_stage2,
  MIN(pp.published_at) AS first_publish, MAX(pp.published_at) AS last_publish
FROM m.post_publish pp
JOIN c.client c ON c.client_id = pp.client_id
WHERE pp.published_at >= '2026-05-03 00:20:20+00'::timestamptz
GROUP BY c.client_slug, pp.platform
ORDER BY c.client_slug, pp.platform;
```

If exit criteria met: F-PUB-006 closes successfully and B31 closure of F-PUB-004 is empirically demonstrated.
If 0 fresh publishes: deeper bug than HOL — stop, write findings, do not loop.

---

## Closure budget tracking (per D186)

This session (chat-side):
- F-PUB-006 Stage 1 + Stage 2 apply + verifications: ~30 min
- 42-dead audit + F-PUB-005 investigation + patch brief draft (parallel work): ~25 min
- Path B evidence-gathering for ChatGPT review: ~10 min
- Run state writeup (this doc): ~10 min

Approx: 1.25h chat-side closure work. CC closure (last session): ~0.8h. Total trailing-day ~2h. D186 floor: 4h/week — track at week end.
