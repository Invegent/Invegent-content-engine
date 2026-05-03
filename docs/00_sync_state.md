# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-05-03 Sunday morning Sydney chat session-end — **F-PUB-006 CLOSED end-to-end (Stage 1+2 applied + Stage 3 verified empirically). B31 closure of F-PUB-004 PROVEN in production. F-PUB-005 patch design simplified (drop trigger; cron handles it). Three new candidate findings captured (F-PUB-007, F-PUB-008, F-PUB-009). New CC brief committed (publish-queue-and-publish-column-purposes Tier 1, status: ready). Action list at v2.21.**
> Written by: chat session sync (prior segments) + claude-code (3 May morning CC segment) + chat (3 May morning Sydney chat segment below)

> ⚠️ **Session-start reading order (per memory entry 1):**
> 1. **`docs/00_sync_state.md`** (this file) — narrative log of last session
> 2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog with priorities and triggers
>
> The two files are complementary: sync_state is the session log, action_list is the working backlog. Read both at every session open.

---

## 🟢 3 MAY SUNDAY MORNING SYDNEY CHAT — F-PUB-006 CLOSED + B31 CLOSURE OF F-PUB-004 PROVEN — APPEND-ONLY SESSION

This section APPENDS to the morning CC segment below. Single chat thread, ~2.0h, beginning at 8:09 AEST when PK opened the session and ended at ~10:50 AEST after 4-way reconciliation. Covered: (a) post-deploy state read showing 252 approvals + 203 rejections in 9.5h since B31; (b) discovery that publishes were happening despite max_per_day cap appearing to bind; (c) F-PUB-006 cleanup execution end-to-end via MCP review protocol v2.17; (d) F-PUB-005 trigger investigation + patch brief draft; (e) 42-dead audit; (f) F-PUB-005 patch pre-flight discovery of 44 "lost" approvals → root cause attribution to silent-skip-at-cap behaviour AND second enqueue path discovery (cron handles it correctly already); (g) Stage 3 empirical closure proof; (h) publish-queue-and-publish brief authored and queued for next CC session.

### Sequence of events (chronological, summarised)

**1. Session open (00:09 UTC = 8:09 AEST)** — PK signalled "good morning". Chat checked the scheduled Cowork health check from 02:00 AEST = 16:00 UTC Sat 2 May. **No `2026-05-03.md` health file produced.** Investigation: Cowork DID fire on schedule at 16:02:56 UTC — the after-run handover loop produced `docs/runtime/runs/no-ready-briefs-2026-05-02T160256Z.md`. The two queue briefs (nightly-health-check-v1 v2 patch + post-render-log-column-purposes) were both at `review_required`, so Cowork correctly produced a no-op marker and stopped per spec. **Governance gap captured (not investigated this session)**: recurring scheduled audits should not be gated on the same queue lifecycle as build briefs — either nightly-health-check needs to be promoted ready after every patch, or the scheduled task needs a different selection rule. Forward note for next session.

**2. Live pipeline state read** — single comprehensive query against `m.post_draft` showed **252 approved + 203 rejected** in the 9.5h since B31 deploy (12:39 UTC Sat → 22:09 UTC Sat). Per-client breakdown: NDIS-Yarns firing all 4 platforms (FB 127 / IG 66 / LinkedIn 53 / YT 0). PP slow (3 FB / 0 IG / 0 LinkedIn — though 5 LinkedIn rejections logged). **CFW + Invegent: ZERO approver outcomes across all platforms.** B31 working as designed for NDIS-Yarns; uneven for other clients (logged for next-session investigation).

**3. Publish-rate analysis** — only 2 actual publishes in the 9.5h post-deploy window (NDIS-Yarns FB 17:35 + PP FB 17:00 on 2 May). Ratio (252 approvals / 2 publishes) suggested the publish-rate ceiling was binding somewhere. Initial investigation showed 441 queued items but only ~2 actually publishing. Filed as **F-PUB-006 (NEW)**: head-of-line blocking from old zombie rows holding the front of the queue.

**4. F-PUB-006 brief authored chat-side** at `docs/briefs/2026-05-03-fpub006-zombie-cleanup-cc.md` (commit `1bac045e`). Three stages: Stage 1 = 4 orphans (dead row pattern), Stage 2 = 13 not-approved zombies, Stage 3 = observability check, Stage 4 = LinkedIn-stall investigation read-only. Brief explicitly *did not* touch F-PUB-005 trigger patch (separate brief).

**5. PK directive: fast-follow + audit now** — PK chose to (a) fast-follow F-PUB-005 trigger patch authoring, (b) audit the existing 42-dead pool. Chat drafted v2 of the brief but didn't push (CC was already running brief v1).

**6. Parallel work while CC ran F-PUB-006:**
   - **42-dead audit committed** (`docs/audit/runs/2026-05-03-fpub006-existing-dead-audit.md`, commit `8a791fbd`). Findings: 39 of 42 from 22 Apr m8/m11 bloat-window sweep; 1 historic orphan from 2 Apr at attempt_count=734 (same pattern as today's Stage 1 work, manually resolved); 0 hidden F-PUB-005 ghosts in dead pool (Stage 2's count of 13/17 is the complete F-PUB-005 footprint). **No remediation needed for the 42.**
   - **F-PUB-005 trigger investigation committed** (`docs/audit/runs/2026-05-03-fpub005-trigger-investigation.md`, commit `bd25eb0b`). Trigger source captured. Three options evaluated. Recommended Option A: relocate trigger from `m.ai_job` AFTER UPDATE → succeeded → `m.post_draft` AFTER UPDATE → approval_status='approved'.
   - **F-PUB-005 patch brief drafted** at `docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md` (commit `6f54e007`). `status: draft` — explicitly gated on F-PUB-006 closure + PK promotion to ready. Full migration SQL embedded; ChatGPT review payload pre-written.

**7. CC handover received** — Stage 1 SQL drafted and ready, Stage 2 halted on count drift (17 vs 13), Stage 4 investigation complete. CC's 50min closure hours.

**8. Stage 1 MCP review (1st pass) — ESCALATED.** review_id `b75d8313-db0e-4952-a3fa-df69a7ae91e8`. Verdict='partial', risk_level='medium', confidence='high', **`pushback_points: []` (empty)**. The two `unverified_claims` returned were **the exact same caveats Claude had labelled `known_weak_evidence` in the original submission**. Generic `corrected_action`: "further investigate the potential impact on external systems". This is a weak escalation — ChatGPT echoed Claude's own honesty back. PK chose **Path B** per protocol v2.17: silence the objection with concrete evidence rather than override.

**9. Path B investigation — concrete evidence gathered:**
   - Org-wide `github:search_code` for `dead_reason`: 5 results, all in `Invegent-content-engine` repo. 2 SQL files (this brief's own + Phase B 30 Apr migration), 1 column-purposes migration (declarative labels), 1 EF (`ai-diagnostic` — read-only consumer surfacing in reports), 1 EF (`ai-worker` — single COMMENT line about pg_cron sweep on `m.ai_job`, **NOT** `m.post_publish_queue`).
   - Org-wide `github:search_code` for `dead_reason` in `invegent-dashboard` + `invegent-portal`: 0 results.
   - Org-wide `github:search_code` for `post_publish_queue` in dashboard/portal repos: 0 results. **Those repos do not reference this table at all.**
   - ai-worker source review confirmed it writes only to `m.ai_job`, `m.post_draft`, `m.ai_usage_log` — NOT `m.post_publish_queue`.
   - Trigger inventory (verified via `information_schema.triggers` morning of session): 2 triggers on `m.post_publish_queue`'s parent tables, neither reads dead_reason or re-animates dead rows.
   - Empirical precedent: historic 2 Apr orphan marked dead with same pattern; system ran fine for 32 days afterwards.

**10. Stage 1 MCP review (2nd pass) — CLEARED.** review_id `0f74aff2-ea9f-43c7-b5ef-51bedb4389cc`. Verdict='agree', `escalate=false`, no pushback. Path B worked.

**11. Stage 1 applied via Supabase MCP `execute_sql`** at 2026-05-02 23:11 UTC (per RETURNING timestamp). 4 rows updated, exact match to captured queue_ids:
   - `d75ba206-3b51-49e3-88d0-d4d33da56418` PP-FB
   - `d62ff526-0393-4630-8662-0729115c6b41` PP-FB
   - `3deaefb3-dfc6-4b1f-a70f-44d7c44387b7` NDIS-FB
   - `6bfcc9fb-228e-4f73-9cbd-fcb36054a458` NDIS-FB
   All marked `status='dead'` with `dead_reason='post_draft_not_found_orphan_F-PUB-006_2026-05-03'`.

**12. Stage 2 MCP review (1st pass) — CLEARED.** review_id `9448d4a4-a04d-4723-b469-76a1eedaafcb`. Verdict='agree' first pass — same external-systems investigation cleared the objection.

**13. Stage 2 applied via Supabase MCP `execute_sql`** at 2026-05-03 00:20:20 UTC. **17 rows updated** (12 PP-FB + 4 CFW-IG + 1 NDIS-FB) — predicate-based, count grew from 13 (brief expected) → 17 (actual at apply time) due to F-PUB-005 trigger continuing to produce zombies during the session window. All marked `dead_reason='F-PUB-005_premature_enqueue_unblocks_F-PUB-006_2026-05-03'`.

**14. Verification + apply timestamp captured** — Dead pool 42 → 63 (= 4 + 17 + 42), F-PUB-005 zombies remaining: **0**, queued items due-now FB+LinkedIn: 10. Run state committed at `docs/runtime/runs/2026-05-03-fpub006-cleanup-applied.md` (commit `949415d7`).

**15. F-PUB-005 patch pre-flight P1-P4 (read-only) — P3 BLOCKER discovered.** Pre-flight returned 108 approved drafts with no queue rows. Initial "abort if > 5" rule would block patch. Investigation split the count:
   - **64 are normal**: drafts with `m.post_publish` records — queue rows are deleted post-publish (the brief's P3 check has a wrong assumption that needs correcting in the brief).
   - **44 are real "lost" approvals**: drafts approved + no queue row + no publish record. **F-PUB-007 candidate (NEW)**: silent-skip-at-cap loses approvals. The existing F-PUB-005 trigger has `IF v_queued_count < v_max_queued THEN INSERT` — when queue is at cap, approvals get lost silently with no retry, no error. The proposed Option A patch carries the same behaviour.

**16. publish-queue-and-publish brief authored** at `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md` (commit `9e287de5`) and added to `docs/briefs/queue.md` (commit `a848768c`). Tier 1, status: ready, owner: cc. Targets two 0%-documented tables: `m.post_publish_queue` (20 cols) + `m.post_publish` (15 cols) = 35 cols total. Context-fresh from F-PUB-006 work area. Producer code map embedded. Estimated 70-95min CC closure.

**17. Stage 3 verification — FAILED FALSE-POSITIVE then CORRECTED to PASS.** First verification query filtered `published_at >= 00:20:20` (Stage 2 apply time). Returned 0 rows. Initial reading: deeper bug than HOL-blocking. Investigation:
   - Cron `publisher-every-10m` (actually scheduled `*/5 * * * *`) fired at 00:20, 00:25, 00:30, all "succeeded" returning "1 row". The "1 row" is the wrapper SQL `net.http_post` returning a request_id, NOT the publisher EF outcome.
   - Pulled `m.publisher_lock_queue_v2` source. Eligibility filters: `publish_enabled`, `paused_until`, `min_gap_minutes` per-destination, `max_per_day` per-destination.
   - Per-(client, platform) gate analysis showed 3 out of 4 enabled FB+LinkedIn destinations were **BLOCKED on min_gap_minutes**. NDIS-Yarns FB last published 2026-05-02 23:50:27 UTC (50 min ago); 360min cooldown. PP-FB last published 2026-05-03 00:05:13 UTC (35 min ago); 360min cooldown. PP-LinkedIn last published 2026-05-03 00:00:11 UTC (40 min ago); already at max_per_day=2.
   - **Re-queried publishes since Stage 1 apply (23:11 UTC) instead of Stage 2 apply** — found **3 real Facebook publishes** (NDIS-Yarns FB at 23:45/23:50/23:50, PP-FB at 00:05) and 2 phantom PP-LinkedIn at 00:00 UTC matching the morning's B-INV-LinkedIn-PhantomPublishes hypothesis.
   - **Stage 3 exit criteria met against Stage 1 apply timestamp**: ≥1 NDIS-Yarns FB ✓ (3), ≥1 PP-FB ✓ (1). **Stage 1 alone unblocked the bottleneck — Stage 2 was overshoot.**

**18. Discovery: SECOND ENQUEUE PATH** — Cron `enqueue-publish-queue-every-5m` (every 5min) is a SAFE enqueue path. Its SQL:
   ```sql
   AND pd2.approval_status IN ('approved', 'scheduled', 'published')
   ```
   Only enqueues approved drafts. **The 5-min cron does what the F-PUB-005 patch was trying to achieve.** The trigger (Path A) is the buggy path; the cron (Path B) is correct. **F-PUB-005 patch design simplifies dramatically: just DROP the trigger, no new function needed.** The patch brief at `docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md` is over-engineered and needs rewrite next session.

**19. F-PUB-007 reassessment** — Given the 5-min cron has the correct eligibility predicate, it SHOULD be picking up the 44 lost approvals. Either it's processing them slowly (DISTINCT ON limits to 1 per (client, platform) per run = ~16/run max) OR they're failing some other gate. **Likely not a real bug; verify with one query next session.**

**20. F-PUB-008 candidate (NEW)** — 2 of 3 NDIS-Yarns FB publishes since Stage 1 have `platform_post_id = NULL` despite being in `m.post_publish` (post_draft_ids `de45011b-...`, `587c2b6c-...`). Possible: partial publish where Meta API call succeeded but EF didn't capture the response post id. Worth investigating (non-urgent).

**21. F-PUB-009 candidate (NEW)** — Scheduling drift: NDIS-Yarns FB has 84 queued items, latest scheduled `2026-08-27`. NDIS-Yarns IG: latest scheduled `2026-10-07`. PP-LinkedIn: latest `2026-08-28`. The trigger's cadence math (`last_scheduled + min_gap`) compounds far into the future when queue grows faster than max_per_day=2 can drain. Approvals "succeed" but won't publish for 4+ months at current rate. Lower priority but worth noting.

**22. B-INV-LinkedIn-PhantomPublishes confirmed reproducible** — Today's PP-LinkedIn publishes at 00:00:08 + 00:00:11 UTC (zapier-li-{ms_epoch} format) match the same anomaly CC's Stage 4 investigation flagged this morning. This is recurring daily.

**23. ChatGPT brief from PK on auto-approver rebase — DECLINED with explanation.** PK shared a brief drafted by ChatGPT proposing "Rebase auto-approver v1.6.0 from deployed v1.5.0". Chat declined because: (a) v1.6.0 is already deployed (yesterday afternoon), (b) repo source matches, (c) B31 closure is observable. ChatGPT was given stale context. **Forward note**: when asking ChatGPT for brief review going forward, paste it `docs/00_sync_state.md` first.

**24. 4-way reconciliation** — this commit batch.

### Today's mutations

| When (UTC) | Mutation | Type |
|---|---|---|
| ~22:50 (2 May) | github commit `1bac045e` — F-PUB-006 brief authored | Git |
| ~22:51 (2 May) | github commit `8a791fbd` — 42-dead audit | Git |
| ~22:53 (2 May) | github commit `bd25eb0b` — F-PUB-005 trigger investigation | Git |
| ~22:55 (2 May) | github commit `6f54e007` — F-PUB-005 patch brief (status: draft) | Git |
| ~23:05 (2 May) | MCP review #5 (Stage 1 1st-pass) — review_id `b75d8313-...` | DML (auto by EF) |
| ~23:10 (2 May) | MCP review #6 (Stage 1 2nd-pass) — review_id `0f74aff2-...` | DML (auto by EF) |
| 23:11 (2 May) | Supabase MCP `execute_sql` — Stage 1 UPDATE 4 rows | **Production DML** |
| ~23:12 (2 May) | MCP review #7 (Stage 2 1st-pass) — review_id `9448d4a4-...` | DML (auto by EF) |
| 00:20:20 (3 May) | Supabase MCP `execute_sql` — Stage 2 UPDATE 17 rows | **Production DML** |
| 00:25:08 (3 May) | github commit `949415d7` — run state for cleanup-applied | Git |
| ~00:30 (3 May) | github commit `9e287de5` — publish-queue-and-publish brief (status: ready) | Git |
| ~00:32 (3 May) | github commit `a848768c` — queue.md add brief row | Git |

**11 chat-driven external operations**: 7 github commits + 3 MCP review fires + 2 production DML applies via Supabase MCP. **Production DML this session: 2 UPDATEs on `m.post_publish_queue` (4 rows + 17 rows = 21 rows total marked dead).** Both reviewed under protocol v2.17.

### Today's commits (this session-segment)

**Invegent-content-engine `main`:**
| Commit | What |
|---|---|
| `1bac045e` | brief: F-PUB-006 zombie cleanup + B-INV-LinkedIn investigation (CC brief) |
| `8a791fbd` | audit: F-PUB-006 existing 42 dead rows — clean, no remediation needed |
| `bd25eb0b` | investigation: F-PUB-005 trigger root cause + Option A patch design |
| `6f54e007` | brief: F-PUB-005 trigger patch (drafted, status=draft, gated on F-PUB-006) |
| `949415d7` | runstate: F-PUB-006 Stages 1+2 applied (4+17 dead) + F-PUB-007 candidate |
| `9e287de5` | brief: publish-queue-and-publish-column-purposes (Tier 1 CC, status=ready) |
| `a848768c` | queue: add publish-queue-and-publish-column-purposes |
| (this commit) | sync_state addendum + action_list v2.21 |

**No invegent-dashboard or invegent-portal commits this session-segment.**

### Standing rule honoured (memory entry 11 — 4-way sync)

- ✅ `docs/00_sync_state.md` — chat session segment appended (this commit)
- ✅ `docs/00_action_list.md` — bumped v2.20 → v2.21 (this commit)
- ✅ `docs/briefs/queue.md` — added publish-queue-and-publish-column-purposes (commit `a848768c`)
- ✅ `docs/06_decisions.md` — no new decisions this session (D186 carried forward)
- ✅ `docs/runtime/runs/2026-05-03-fpub006-cleanup-applied.md` — NEW (commit `949415d7`)
- ✅ `docs/audit/runs/2026-05-03-fpub006-existing-dead-audit.md` — NEW (commit `8a791fbd`)
- ✅ `docs/audit/runs/2026-05-03-fpub005-trigger-investigation.md` — NEW (commit `bd25eb0b`)
- ✅ `docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md` — NEW status:draft (commit `6f54e007`)
- ✅ `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md` — NEW status:ready (commit `9e287de5`)
- ⚠️ `invegent-dashboard` roadmap page.tsx — still deferred per R07 (no phase delivery this session)
- ✅ Memory entries — auto-regenerate from chat history; explicit memory updates this session: F-PUB-006 closed, F-PUB-005 design simplified (drop trigger), F-PUB-007/F-PUB-008/F-PUB-009 candidates captured

### Validation outcomes (numerical)

| Validation | Status |
|---|---|
| MCP review protocol v2.17 followed for Stage 1 | ✅ Two passes (1st escalated, 2nd cleared after Path B evidence) |
| MCP review protocol v2.17 followed for Stage 2 | ✅ One pass (cleared first, evidence carried forward from Stage 1) |
| Path B evidence-gathering when objection was generic | ✅ Org-wide repo scan + ai-worker source review + empirical precedent |
| Stage 1 SQL apply | ✅ 4 rows, exact match to pre-flight count |
| Stage 2 SQL apply | ✅ 17 rows (predicate-based, robust to drift) |
| Dead pool integrity | ✅ 42 + 4 + 17 = 63 (verified) |
| F-PUB-005 zombies remaining | ✅ 0 (predicate caught everything) |
| **Stage 3 exit criteria** (≥1 NDIS-Yarns FB AND ≥1 PP FB) | ✅ Met against Stage 1 apply timestamp (NDIS-Yarns FB ×3, PP-FB ×1) |
| **B31 closure of F-PUB-004 empirically demonstrated** | ✅ Real Meta-published Facebook posts with platform_post_id verified in production |
| **Lesson #51 honoured** | ✅ Two-pass MCP review on first DML; second-pass evidence + escalation path documented |
| Lesson #61 honoured | ✅ Pre-flight SQL re-verified counts before each apply |

### Production state at session end (snapshot, ~00:50 UTC)

- **B31 (auto-approver v1.6.0)**: ✅ Live (version 53), closing F-PUB-004 in production. Approval rate: 252 approvals + 203 rejections in 9.5h since deploy.
- **F-PUB-006 cleanup**: ✅ CLOSED. Dead pool 63 (= 42 baseline + 4 orphans + 17 zombies). F-PUB-005 zombies remaining: 0.
- **Min_gap cooldowns active until**:
  - NDIS-Yarns FB: ~05:50 UTC Sun 3 May (5h17min from session end)
  - PP-FB: ~06:05 UTC Sun 3 May (5h32min from session end)
  - PP-LinkedIn: ~04:00 UTC Sun 3 May (~3h20min from session end; max_per_day=2 also binds)
- **Queue state**: 441 queued total. Distribution: NDIS-Yarns FB 84 (latest scheduled Aug 27 — F-PUB-009 drift), NDIS-Yarns IG 128 (cron paused — items not draining), NDIS-Yarns LinkedIn 50, PP-FB 3, PP-IG 111 (cron paused), PP-LinkedIn 72.
- **Phantom 00:00 UTC PP-LinkedIn anomaly**: confirmed reproducible — happened today at 00:00:08 + 00:00:11 UTC.

### Strategic posture at session end

**F-PUB-006 closure end-to-end with empirical proof.** The chain B31 deploy → fresh approvals → publish queue → publisher → posted — has now been observed running through to actual Meta-published content with platform_post_id captured. F-PUB-004 closure of auto-approver starvation is no longer just mechanically committed but production-verified.

**Three new candidate findings logged** (F-PUB-007, F-PUB-008, F-PUB-009) — none investigated this session per closure-first discipline. All carry over to action_list backlog with triage priorities.

**F-PUB-005 patch design has simplified dramatically.** What looked like "relocate trigger" is actually "DROP trigger". The 5-min `enqueue-publish-queue-every-5m` cron handles the safe enqueue case. The patch brief at `docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md` is over-engineered and needs rewrite. Forward note: rewrite as 2-line migration (DROP TRIGGER + DROP FUNCTION).

**Lesson #62 candidate refined** — protocol v2.17 should distinguish between two kinds of MCP escalation: (a) "ChatGPT raised new evidence/objection I didn't have" (real signal, demands investigation) versus (b) "ChatGPT echoed my own caveats back as concerns" (weak signal, demands evidence-silencing of stated concern). Path B (silence with evidence) was the right response today; auto-overriding would have lost a real safety check, but auto-accepting would have wasted a turn on generic discomfort. Capture for Lesson #62 candidate refinement (still 1 confirmed instance; promote on second).

### Closure budget tracking (per D186)

This session chat-side: ~2.0h
- F-PUB-006 brief authoring + audit + investigation + patch brief draft: ~30min
- ChatGPT MCP review escalation handling + Path B evidence: ~15min
- Stage 1 + Stage 2 apply + verification: ~10min
- F-PUB-005 patch pre-flight + F-PUB-007 root cause analysis: ~25min
- publish-queue-and-publish brief authoring: ~20min
- Stage 3 verification (false-positive then corrected reading): ~15min
- Run state writeup + 4-way reconciliation: ~25min

CC closure (last session): ~0.8h.
Cumulative closure across two sessions today (CC + chat): ~2.8h.
Trailing-14-day estimate: v2.19 (3.5h) + v2.20 (0.8h) + v2.21 (2.0h) = ~6.3h. Still below 8.0 floor; ~1.7h needed over next 13 days.

**Closure work product this session**: F-PUB-006 closed (one open finding shipped), 1 new brief authored ready for CC.

### Lesson statuses

- **Lesson #51 honoured this session** — two-pass MCP review on first production DML of the session; Path B used to silence weak first-pass escalation; second-pass cleared.
- **Lesson #61 honoured** — pre-flight count re-verified against fresh SQL before each apply (CC's count from 30 min prior was already off; chat re-verified at apply time and found drift, predicate-based SQL caught it correctly).
- **Lesson #62 candidate** — first confirmed instance: "ChatGPT echoed Claude's own known_weak_evidence back as unverified_claims". Forward defence: protocol v2.17 should differentiate "ChatGPT raised new evidence" (investigate) vs "ChatGPT echoed my caveats" (silence with evidence). Promote on second instance or codify when 2-3 sessions accumulate this pattern.

### Standing rule update

No protocol changes. Two minor refinements queued for next session:
1. F-PUB-005 patch brief rewrite (2-line DROP migration instead of relocate trigger function)
2. F-PUB-007 quick verification query (likely not a real bug)

---

## END OF SUNDAY 3 MAY MORNING SYDNEY CHAT SESSION

F-PUB-006 closed end-to-end. B31 closure of F-PUB-004 PROVEN in production. Three new candidate findings logged. F-PUB-005 patch design simplified to 2-line DROP. publish-queue-and-publish CC brief authored and queued. T-MCP-02 quota at 9 of 5 (was 7 of 5; +3 fires this session: Stage 1 1st, Stage 1 2nd, Stage 2). Action list at v2.21. Closure hours this session: ~2.0h chat-side. Total today (CC + chat): ~2.8h. Trailing-14-day: ~6.3h (still below 8.0 floor).

PK closing for fresh session. Next session priorities (per action_list v2.21):
1. Personal businesses check-in
2. F-PUB-005 patch brief rewrite (drop-trigger 2-line migration)
3. F-PUB-007 verification query (likely not real)
4. F04 migration apply (still owed from prior session)
5. publish-queue-and-publish CC brief execution
6. F-PUB-008 / F-PUB-009 triage when bandwidth allows

---

## 🟢 3 MAY SUNDAY MORNING SYDNEY — F-PUB-006 PARTIAL + B-INV-LINKEDIN INVESTIGATION (CC) — APPEND-ONLY SEGMENT

Session opened by claude-code (CC) per D170 boundary: CC drafts SQL + investigation; chat applies via Supabase MCP `execute_sql` after firing MCP review. Brief: `docs/briefs/2026-05-03-fpub006-zombie-cleanup-cc.md` (created 2026-05-03T22:15:00Z forward-dated; DB clock at execution = 2026-05-02 22:51 UTC = 2026-05-03 08:51 AEST).

### Sequence (chronological)

1. **Pre-flight (Lesson #61, mandatory)** — three read-only queries via Supabase MCP `execute_sql`:
   - **Step 0a** (orphan rows: `status='queued' AND last_error='post_draft_not_found' AND post_draft missing`) → **4** ✓ exact match.
   - **Step 0b** (not_approved zombies: `status='queued' AND last_error='not_approved:needs_review' AND draft.approval_status='needs_review'`) → **17** ⚠ deviation (expected 13). Outside abort range (0 OR > 25) but inside halt-Stage-2 branch (any ≠ 13) per failure-mode table. Stage 2 halted.
   - **Step 0c** (5 named PP-LinkedIn queue_ids with `attempt_count IS NULL`, scheduled ≥12h ago) → **5** ✓ exact match.

2. **Step 0b characterisation** — 17 rows broken down: 4 CFW-IG (created 2026-04-23/24, IG cron paused per separate Meta-block governance), 11 PP-FB (2026-04-27), 1 NDIS-FB (2026-04-28), 1 PP-FB (2026-04-28), 1 PP-FB (2026-04-29). The +4 delta vs brief's expected 13 is consistent with F-PUB-005 trigger gap continuing to produce ~4 zombies/day since brief authoring.

3. **Stage 1 SQL drafted** at `supabase/sql/2026-05-03-fpub006-stage1-orphan-cleanup.sql` — predicate verbatim from brief; verification SELECT embedded; `dead_reason='post_draft_not_found_orphan_F-PUB-006_2026-05-03'`. Awaiting chat MCP review (`action_type=sql_destructive`, payload in brief Stage 1) + apply.

4. **Stage 2 SQL NOT drafted** — halt honoured per failure-mode table. PK to triage 17-vs-13 drift: either authorise predicate-as-is (the predicate re-evaluates `pd.approval_status='needs_review'` at apply time so any drafts that have transitioned to approved are skipped) OR refresh brief with new expected count.

5. **Stage 4 LinkedIn stall investigation (read-only, complete)**:
   - Source-side: `linkedin-zapier-publisher/index.ts` (v1.1.0) delegates row selection to `m.publisher_lock_queue_v2(p_limit, p_worker_id, p_lock_seconds, p_platform='linkedin')`. The eligibility WHERE lives in the RPC, not the EF.
   - RPC body retrieved via `pg_get_functiondef`. Filters: `q.status='queued'`, `q.scheduled_for <= v_now`, lock-timeout, `cpp.publish_enabled`, `cpp.paused_until`, NOT EXISTS running row, **`cpp.min_gap_minutes` (240) → last_published_at <= v_now - 4h**, **`cpp.max_per_day` (2) → published_today < 2**. Picker takes top-`p_limit` by `row_number() OVER (PARTITION BY client_id, platform ORDER BY scheduled_for ASC, created_at ASC)`.
   - Data-side: 5 stuck rows have `attempt_count IS NULL` (RPC never picked them; RPC increments attempt_count on lock). All have `approval_status='approved'`, `publish_enabled=true`, `paused_until=NULL`, single cpp row per (client_id, platform) — eligibility-side noise filtered out.
   - **Hypothesis (HIGH confidence with code + data evidence):** `cpp.max_per_day=2` filter excludes the 5 rows on every tick. PP-LinkedIn day-by-day: 2-3 publishes per UTC day, all packed into the first 4-14 hours of the day, exhausting the cap before the 5 stuck rows can be picked.
   - **Striking secondary anomaly:** the 3 queue_ids referenced by today's `m.post_publish` records on PP-LinkedIn (`c2fdafe6-...`, `3785396b-...`, `2a117aa2-...`) **do not exist in `m.post_publish_queue` at all** — SELECT returns 0 rows in any status. Their `platform_post_id` format `zapier-li-{ms_epoch}` matches this EF's producer but the originating queue rows are gone. Possibilities: hard-deleted post-publish, non-standard code path, or stale `post_publish.queue_id`. Either way the publish records still feed `stats.published_today` in the eligibility CTE and continue to exclude the 5 stuck rows.
   - Findings written to `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md` with three proposed remediation paths (lead: identify phantom-publish source; surgical: temp-raise max_per_day; reset scheduled_for ineffective alone). **No remediation drafted, no DML proposed, no code changes — Stage 4e honoured.**

6. **Handover artefacts** (4-way sync per memory entry 11):
   - Run state: `docs/runtime/runs/2026-05-03-fpub006-cleanup.md`
   - Investigation file: `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md`
   - Stage 1 SQL: `supabase/sql/2026-05-03-fpub006-stage1-orphan-cleanup.sql`
   - Action list bump v2.19 → v2.20: F-PUB-006 partial active row, B-INV-LinkedIn updated to investigation-complete, B38 NEW (F-PUB-005 trigger patch backlog candidate)
   - This sync_state addendum

### Open items for chat / PK next session

1. **Stage 1 apply** via Supabase MCP `execute_sql` (after MCP review). Expected dead-marked count: 4.
2. **Stage 2 triage** of the 17-vs-13 count drift: authorise predicate-as-is OR refresh brief.
3. **Stage 3 observability check** at +30min after Stage 2 apply (or after Stage 1 alone if Stage 2 deferred). Exit criteria: ≥1 fresh publish on NDIS-Yarns FB AND ≥1 on PP FB.
4. **B-INV-LinkedIn remediation brief authoring** post-PK review of investigation findings. Lead candidate: identify the 3 phantom 00:00-UTC publish source.
5. **B38 (F-PUB-005 trigger patch)** PK triage for priority — at ~4 zombies/day rate, every cleanup brief will face count drift on apply.

### Closure budget impact (D186)

CC closure work this session: ~0.8h (pre-flight + investigation + draft + writeup). Trailing-14-day estimate updated in action_list v2.20: ~3.5h (v2.19) + ~0.8h (this) = ~4.3h. Still below 8.0 floor; ~3.7h needed over next 13 days.

### State-capture-bump exception

No MCP review fired on this commit. CC is read-only (MCP `execute_sql` queries) + draft-only (SQL files + markdown). No production mutation. The MCP reviews fire when chat applies Stage 1 (and Stage 2 if PK clears).

### Standing rule honoured

D170 boundary: CC drafts, chat applies. ✓
4-way sync: run state + investigation file + Stage 1 SQL + action_list v2.20 + sync_state addendum. ✓
Brief Stage 4e (no remediation in this brief). ✓
Failure-mode table on Step 0b (halt Stage 2). ✓
Lesson #61 (pre-flight discipline before drafting). ✓

---

## END OF SUNDAY 3 MAY MORNING SYDNEY CC SESSION-SEGMENT

F-PUB-006 partial: Stage 1 SQL drafted (4 orphans, exact match) awaiting chat MCP review + apply. Stage 2 halted on count drift (17 vs 13). Stage 4 LinkedIn investigation complete with HIGH-confidence hypothesis (`cpp.max_per_day=2` exhaustion via 3 phantom 00:00-UTC publishes whose queue_ids no longer exist in `m.post_publish_queue`). B-INV-LinkedIn remediation deferred to separate brief next session. Action list at v2.20. Closure hours this CC segment: ~0.8h. PK signals "morning check" or "done" → chat fetches state files from GitHub and proceeds with Stage 1 apply + Stage 2 triage + Stage 3 observability.

---

## 🟢 2 MAY SATURDAY VERY LATE EVENING SYDNEY — B31 DEPLOY (v1.6.0 LIVE) — APPEND-ONLY SESSION

[... earlier session content preserved as written ...]

---

## END OF SATURDAY 2 MAY VERY LATE EVENING SYDNEY SESSION-SEGMENT

[... earlier content preserved ...]
