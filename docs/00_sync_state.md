# ICE — Sync State Index

> **This file is the lightweight session pointer index.** It never grows large. Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1) after two giant-file-rewrite truncation incidents in 24h. See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for the frozen pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-05 | tier-1-queue-integrity-applied | Tier 1 queue integrity incident remediation applied: M1 (cleanup trigger filter by queue_id), M2 (publisher per-partition cap), M3 (get_next_scheduled_for NULL fallback + enqueue guards + 1-row dead-letter). All 8/8 post-apply verifications pass. T-MCP-08 vindicated twice (M2 + M3 re-fires). 108 historical anomalies intentionally untouched per scope item 5; deferred to M6 Phase A. M4-M8 remain pending separate D-01 reviews. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | ICE Dashboard Architecture Review formally kicked off — three foundational decisions locked (Strategic Renovation, Brief+alerts on Telegram only, lighter agent surface). 11-section review document agreed; doc location BOTH repos; ~9-10h estimate; §1 starts next session no-rush. Plus: Cowork night-task unblock (v1-spec owner-gate added; cowork_prompt v2.1→v2.2) and manual run of nightly-health-check-v1 v2.1 (clean pass; 5 stuck items in 3 clusters filed). | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | Three queued items shipped: ai-worker v2.11.1 deployed (F-AI-WORKER-PARSER-SKIP-BUG); audit matrix CASE patch (F-AAP-007 v2); m.fill_pending_slots scheduled_for write (F-PUB-009). 2/3 D-01 reviews escalated type-(c); state-capture override with PK approval; both shipped clean. Lesson #62 type-(c) at 5+ vindications, ready for canonical promotion. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | Phone-flow knock + deep pipeline investigation. B-AUDIT-CHECK5-DRIFT retired; F-AAP-007 brief v1→v2; F-PUB-009 brief authored; F-AI-WORKER-PARSER-SKIP-BUG diagnosed (single root cause for 3 prior P1 findings). T-MCP-11/12 each reinforced. F-AAP-DRAFTS-STUCK subsumed; F-RECOVER-LOOP-001 P1→P3. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 (audit views v2); runbook v1→v2→v2.1 across 2 ChatGPT external audits; F-HISTORIC-DEAD-CLEANUP retired (Phase 1.7); T-MCP-11/12 lessons. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied; 16 dead rows swept; audit schema + 2 views; cap lift deferred (math caught). | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation; 4 stalled streams; 3 structural issues identified. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed; post-apply ACL gap surfaced via break-glass. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | Stance retired + F-AAP-001 + F-AAP-002 applied + B-AUDIT-V4-PEERS clean; T05 returns P1-urgent. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 P1 root cause confirmed. | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2 — 7 decisions + 3 lesson promotions. | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED. | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED. | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| 2026-05-03 | mid-morning-chat-session-2 | F-PUB-007 closed + F-PUB-010 surfaced + F-PUB-005 brief v2 + F04 applied. | `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-05 Sydney early morning — Tier 1 queue integrity remediation applied (M1 + M2 + M3)

~3.5h chat-side. Full detail: `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md`. Brief: `docs/briefs/2026-05-05-queue-integrity-incident.md` (commit `06510ff`).

**Three production migrations applied via Supabase MCP, in sequence:**

1. **M1 `m1_cleanup_trigger_filter_by_queue_id`** ~02:08 UTC — fixed `m.cleanup_queue_on_publish_v1` cross-platform queue wipe. Added `WHERE queue_id = NEW.queue_id` filter with NULL guard. D-01 review `02557e30-...` proceeded first time. V1-V4 PASS.

2. **M2 `m2_publisher_lock_queue_v2_per_partition_cap`** ~02:35 UTC — fixed cap-loose bug in publisher (was locking up to p_limit per partition; now respects `max_per_day - published_today`). ONE new WHERE clause in picked CTE; eligible CTE preserved. D-01 first fire `5850dc5a-...` escalated on synthetic-only Scenario B; re-fire `e464d685-...` proceeded after empirical multi-partition transaction-rollback test (synthetic published-row injection, real FK drafts, queue_id=NULL safe vs M1). V1-V5 PASS.

3. **M3 `m3_get_next_scheduled_for_null_fallback_and_enqueue_guards`** ~02:56 UTC — five-component atomic migration: (a) patched `public.get_next_scheduled_for` to return NULL instead of NOW()+5min on no-slot; (b) patched cron jobid 48 with CTE wrapper + IS NOT NULL filter; (c) added NULL guard to `draft_approve_and_enqueue` (RAISE NOTICE + skip); (d) added NULL guard to `draft_approve_and_enqueue_scheduled` (jsonb response with `reason: 'no_schedule_configured'`); (e) dead-lettered exactly 1 row `queue_id ad573844-...` (PP-YT, sub-second fingerprint, confirmed in morning health check). D-01 first fire `ba0fe26f-...` escalated on multi-object complexity + no empirical CTE-wrapper test; re-fire `6657f70c-...` proceeded after synthetic VALUES-based CTE-filter test. V1-V8 PASS.

**8-check post-apply verification (per PK directive):** all 8 PASS. V1 false-positive (regex matched commented documentation) treated as verification-pattern issue, not functional defect — V1-strict comment-aware check confirms active code is correct.

**Scope strictly honoured:** 108 historical Bug 3 fingerprint anomalies intentionally left untouched per scope item 5 (deferred to M6 Phase A). NO v4 promotion. NO legacy disable (cron jobid 48 still active=true). NO p_shadow change.

**T-MCP-08 vindicated twice this session.** M2 re-fire and M3 re-fire both produced genuine new knowledge — re-fires resulted in `verified_claims` reflecting the additional evidence and empty `corrected_action` (distinguishable from Lesson #62 type-(c) consistency-bias).

**Standing rules honoured:** D-01 (5 fires: 3 first + 2 re-fires; 0 final escalations remained unresolved), D-170 (all applies via Supabase MCP), Lesson #61 (P1-P5 before each), G1 (session-detail file lives separately).

**T-MCP-02 quota**: 24 → 29. **Net P0+P1 open**: 4 (unchanged). **Closure budget**: +~3.5h. Trailing-14d ~22.5h above 8.0 floor.

---

## 🟡 Next session priorities (carry-forward from action_list v2.36)

1. Personal businesses check-in
2. **M4 (recommended next start)** — Defect 5: enqueue cron `pd.scheduled_for` source semantics + slot backfill for v4 drafts. Pending separate D-01 + PK approval.
3. **T05 Meta dev support contact** (P1-urgent) — unchanged
4. **CFW LI fill cycle V3-V5 acid test** — when next CFW LI slot fires (~05-06 03:04 UTC). Now also tests M2 cap-tight behaviour.
5. **3 stuck-item clusters from yesterday's health check** (P1-fast-investigation) — re-evaluate post-Tier 1; some may be cleared by M2 cap fix.
6. **F-AAP-NEEDS-REVIEW-BACKLOG (P2)** — 28 drafts in `needs_review`
7. **F-PUB-009 7-day flow check (P2)**
8. **Dashboard Architecture Review §1** — when PK signals; ~1.5h estimated

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 + T05 + cron `?limit=1` update
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- **7 review_ids close-the-loop pending** (4 from prior batches + v2.34's `ba234fce`, `e462597f`, `753930ad`)
- **47 historic dead queue rows** retained as audit trail (Phase 1.7 design; F-HISTORIC-DEAD-CLEANUP RETIRED v2.32)
- **6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts`** — quiescent; F-AI-WORKER-PARSER-SKIP-BUG is forward-only, will not retroactively recover. Audit trail intact.
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design, drains via publish rate
- NDIS-Yarns LinkedIn slot `8f9e5c57-...` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 (Stage 12 migration filename audit-trail) — punted to Cycle 3
- **NEW v2.36: 108 historical Bug 3 fingerprint queue rows** — intentionally retained as `queued` per scope item 5 of M3 directive; deferred to M6 Phase A after M4 confirms upstream bugs fully fixed.
- **NEW v2.36: queue_id `ad573844-c44a-4aa1-a43a-7f222e5b912e`** — dead-lettered with `dead_reason='m3_bug3_fallback_artifact_2026-05-05'`; do not re-queue.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-05 Sydney early morning — Tier 1 queue integrity remediation applied (v2.36).*
