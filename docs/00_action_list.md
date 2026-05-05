# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-05 Sydney early afternoon session-end (v2.37 — **M4 (Defect 5: enqueue scheduled_for source semantics + slot intent backfill) APPLIED via Lesson #62 state-capture override after both D-01 reviews escalated with verbatim-identical generic pushback. 8/8 post-apply verifications PASS. Forward flow proven within minutes of apply (2 new v4 queue rows correctly aligned to slot.scheduled_publish_at). Lesson #62 sixth vindication; ready for canonical promotion. M5 promoted to recommended-next.**). Closure budget: +~1h this session, day total ~4.5h, trailing-14-day ~23.5h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S26+S27)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.37 application**: 2 D-01 reviews fired this session (M4 first + M4 re-fire). Both escalated with verbatim-identical generic pushback after empirical strengthening. PK approved Lesson #62 state-capture override. Both reviews closed-the-loop within session via `m4_close_the_loop_d01_reviews` migration. T-MCP-02 quota now 31.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~4 (T05 P1-urgent + M5-M8 sequenced + 3 cluster diagnoses still active) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~23.5h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~1h** (M4 P1-P5 ~15 min + 2 D-01 fires + transaction-rollback empirical test ~15 min + apply ~5 min + 8-check verification ~15 min + close-the-loop ~5 min + sync ~5 min).

**Day total (5 May): ~4.5h** (Tier 1 morning ~3.5h + M4 afternoon ~1h).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-05 Sydney early afternoon session-end (v2.37).
> **This session: M4 applied (state-capture override) + 8/8 verifications + 4-way sync.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **M5 — `p_shadow` binary decision (remove vs enforce)** | **P1 (recommended next)** | Tier 1 + M4 closed cleanly. M5 is the next sequenced item. Brief Section 6 cost asymmetry favours (a) remove (~3 file changes) unless PK names a real shadow use case ((b) enforce ~5 file changes across `m.auto_approver_fetch_drafts`, auto-approver TS, jobid 48 SQL, ai-worker, publishers). | PK: name use case or confirm (a). Chat composes apply plan; D-01; pre-flight P1-P5; apply via Supabase MCP (DDL: DROP COLUMN if (a); DML+code if (b)). |
| 3 | **T05 Meta dev support contact** | **P1-urgent** | Unchanged from v2.29 | PK fills 2 placeholders and sends |
| 4 | **CFW LI fill cycle V3-V5 QUADRUPLE-test acid test** | **P1** | Next CFW LI slot at ~05-06 03:04 UTC simultaneously tests parser fix (skip-path) + F-PUB-009 (scheduled_for write) + M2 (cap-tight behaviour) + M4 (slot-intent routing into queue). Quadruple-test window. | Next session: query `m.ai_job WHERE updated_at >= '2026-05-06 03:00+00' AND client_id = '3eca32aa-...' AND platform='linkedin'` + `m.post_publish_queue` for newly-enqueued CFW LI rows. Verify: (a) ai_job succeeded with skipped or normal output, (b) `m.post_draft.scheduled_for = m.slot.scheduled_publish_at` for new fills, (c) at most `max_per_day - published_today` rows locked per call, (d) queue row `scheduled_for = slot.scheduled_publish_at` for the v4-origin row. |
| 5 | **3 stuck-item clusters from health check** | **P1** | Surfaced 2026-05-05 morning by Section 6b of nightly-health-check-v1 v2.1: LinkedIn-PP residual (2 items, oldest 3 days), YouTube-PP unexpected (2 items), YouTube-NY unexpected (1 item). M2 + M4 fixes may have cleared mismatched slot intent for v4 entries in these clusters. Re-evaluate. | Re-query stuck clusters after a few publisher cycles run; check whether selection bottleneck cleared with M2 + M4 in place. |

**Demoted from prior Today/Next 5 in v2.36→v2.37 cycle** (closed/resolved):

- **M4 — enqueue scheduled_for source + slot backfill** ✅ APPLIED v2.37 — 147 rows backfilled, cron 48 patched, 8/8 verifications PASS, both D-01 close-the-loop within session.

**Demoted from prior Today/Next 5 in v2.35→v2.36 cycle** (still active, just not Top 5):

- F-AAP-NEEDS-REVIEW-BACKLOG (P2) — 28 drafts in `needs_review`. Top P2 next-up.
- F-PUB-009 7-day flow check (P2) — `legacy_spread_mismatch_count` decline trajectory after ~50 newly-filled slots. Combined with M4 forward-flow expectation.

---

## 🟢 Tier 1 + M4 queue integrity remediation — STATUS BLOCK

**Brief:** `docs/briefs/2026-05-05-queue-integrity-incident.md` v3 (commit `06510ff`).

**Tier 1 (M1-M3): ✅ COMPLETE v2.36** — all three migrations applied 2026-05-05 02:08-03:30 UTC, 8/8 post-apply checks PASS.

**M4: ✅ COMPLETE v2.37** — applied 2026-05-05 ~04:14 UTC, 8/8 post-apply checks PASS.

| Migration | Status | Applied | D-01 review_id |
|---|---|---|---|
| `m1_cleanup_trigger_filter_by_queue_id` | ✅ DONE | 02:08 UTC | `02557e30-...` (proceed first fire) |
| `m2_publisher_lock_queue_v2_per_partition_cap` | ✅ DONE | 02:35 UTC | `5850dc5a-...` escalated → `e464d685-...` re-fire proceed |
| `m3_get_next_scheduled_for_null_fallback_and_enqueue_guards` | ✅ DONE | 02:56 UTC | `ba0fe26f-...` escalated → `6657f70c-...` re-fire proceed |
| `m4_enqueue_scheduled_for_slot_intent_and_backfill` | ✅ DONE | ~04:14 UTC | `b03eaf14-...` escalated → `602b0fb2-...` re-fire escalated → **Lesson #62 state-capture override** (PK approval) |
| `m4_close_the_loop_d01_reviews` | ✅ DONE | ~04:21 UTC | (audit-trail-only DML; no review needed) |

**Cleanup performed:** v2.36 dead-lettered queue_id `ad573844`. v2.37 backfilled 147 rows of `m.post_draft.scheduled_for`.

**Tier 2-3 (M5-M8): pending separate D-01 reviews.**

| Migration | Description | Status |
|---|---|---|
| M5 | `p_shadow` binary decision (remove vs enforce) | ⏳ pending PK call — recommended next |
| M6 | Phase A dead-letter — 108 historical Bug 3 fingerprint anomalies | ⏳ sequenced after M5 |
| M7 | Promote v4 (atomic with M8) | ⏳ pending |
| M8 | Disable legacy enqueue + Phase B dead-letter (47 v4 mismatch + remaining legacy futures) | ⏳ pending |

**T-MCP-08 vindicated 2x in v2.36 (M2 + M3 re-fires).** **Lesson #62 vindicated 1x in v2.37 (M4 re-fire); sixth vindication overall — ready for canonical promotion.**

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate | (per v2.30) | (per v2.30) |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.37 note**: 31 fires total (2 fires this session — both M4 first + re-fire, both escalated). 7d escalation rate now 17/32 = 53% (T-MCP-06 signal still elevated; M4 added 2 escalations). |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at ~23.5h trailing-14-day — well above 8.0 floor.** |
| S19 | R01 Data Auditor closure effectiveness | (per v2.30) | (per v2.30) |
| S21 | Pipeline incident health | `SELECT * FROM audit.v_brand_platform_audit_matrix ORDER BY CASE likely_bottleneck WHEN 'ok_or_recently_active' THEN 99 ELSE 1 END, client_slug, platform;` | Watch for: classification shifts. v2.34 added `approved_not_queued_genuine_gap` label. |
| S22 | Cron heartbeat health | `SELECT jobname, status, minutes_since_last, consecutive_misses FROM m.cron_health_status WHERE status != 'green';` | Empty result = all crons healthy. |
| S23 | F-PUB-009 forward-flow check | `SELECT count(*) FROM m.post_draft d JOIN m.slot s ON s.filled_draft_id = d.post_draft_id WHERE d.created_at >= NOW() - INTERVAL '24 hours' AND d.scheduled_for IS NOT NULL` | Should be > 0 within 24h post-apply, growing. **v2.37 note**: M4 backfill aligned 147 historic v4 drafts; new fills via F-PUB-009 will continue forward-write. |
| S24 | F-AI-WORKER-PARSER-SKIP-BUG forward verification | `SELECT count(*) FROM m.ai_job WHERE updated_at >= NOW() - INTERVAL '24 hours' AND status='succeeded' AND output_payload->>'skipped' = 'true'` | Should be > 0 within 24h post-apply when CFW LI fill cycles fire. |
| S25 | Cowork autonomous run check | Verify `docs/audit/health/{today}.md` exists; check no cc-owned briefs were picked up by Cowork. | Empty health file or any cc-owned brief picked up = v2.2 owner-gate failure; investigate. |
| S26 | Tier 1 fix forward verification | Check (a) cron 48 still uses CTE wrapper + IS NOT NULL filter; (b) `m.post_publish_queue` NULL `scheduled_for` count = 0; (c) publisher per-partition cap respected. | Any drift = regression. |
| **S27 NEW v2.37** | **M4 forward verification** | (1) `SELECT count(*) FROM m.post_draft pd JOIN m.slot s ON s.slot_id = pd.slot_id WHERE pd.slot_id IS NOT NULL AND pd.scheduled_for IS DISTINCT FROM s.scheduled_publish_at` — should remain 0. (2) `SELECT count(*) FROM m.post_publish_queue q JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id WHERE pd.slot_id IS NOT NULL AND q.status='queued' AND q.scheduled_for = (SELECT s.scheduled_publish_at FROM m.slot s WHERE s.slot_id = pd.slot_id)` — should grow as new v4 queue rows are produced by patched cron 48. | Drift on (1) = M4 regression. Stagnation on (2) = patched cron not producing aligned rows. |

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.31.

**v2.37 status delta**: Tier 1 + M4 (Defect 5) shipped. M5 recommended next. M6-M8 sequenced.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 31 of 5)

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | ✅ DONE | Closed | — |
| T-MCP-02 | ✅ EXCEEDED 31 of 5 | — | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17 |
| T-MCP-05 | ✅ DONE v2.29 | — | — |
| T-MCP-05-NEW | Close-the-loop UPDATE on `1bae5068-...` | P3 | PK confirm |
| T-MCP-05-NEW2 | Close-the-loop UPDATE on 3 review_ids from v2.34 | P3 | Combine in next batch closure (still 7 carry-overs from prior sessions; v2.36's 3 + v2.37's 2 closures fired and resolved within session) |
| T-MCP-06 | Investigate plan_review + sql_destructive escalation rates | P3 | **v2.37 strong signal**: sql_destructive at 6-of-6 escalated across v2.34+v2.36+v2.37 (M4 added 2-of-2). Pattern: complex multi-evidence destructive fixes likely escalate first time, may proceed on re-fire after empirical strengthening (v2.36 M2/M3) OR remain stuck-generic on re-fire (v2.37 M4) → state-capture override required. |
| T-MCP-08 | ✅ PROMOTED canonical v2.29 | **REINFORCED 2x v2.36** | M2 + M3 re-fires |
| T-MCP-09 | Lesson candidate: post-apply ACL verification | P3 | After 1-2 more instances |
| T-MCP-10 | Lesson candidate: state-snapshot age ≥ 4h re-verification | P3 | After 1-2 more instances |
| T-MCP-11 | Lesson candidate: pre-flight discipline includes verifying log/health table actually contains data | P3 | Bundle with T-MCP-12 for promotion |
| T-MCP-12 | Lesson candidate: query EVERY annotation column when verifying table contents | P3 | Bundle with T-MCP-11 for promotion |

---

## 🤖 Cowork automation (D182)

**v2.37 update**: 2026-05-05 02:00 AEST autonomous run executed cleanly under v2.2 owner-gate (per v2.36). Sunset review: 12 May 2026 — unchanged.

---

## 🧭 ICE Dashboard Architecture Review (v2.35)

Unchanged from v2.35. §1 (Current-state inventory) remains NEXT — when PK signals.

---

## 🟡 Active

Per v2.31 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **NEW v2.37: M5 — `p_shadow` binary decision** | (a) remove entirely (~3 file changes; cleaner) OR (b) enforce across 5 components (~5 file changes; only correct if real use case) | P1 | Pending PK call | PK → chat → next session | PK names use case OR confirms (a); chat composes apply plan; D-01; pre-flight P1-P5; apply via Supabase MCP. |
| **NEW v2.37: 47 v4 mismatch queue rows** | Pre-M4 legacy artifacts; M4 forward-only by design | P3 | Carry-forward | Backlog → M6 Phase B | Address as part of M6 Phase B (after M5 binary resolved). |
| **3 stuck-item clusters re-evaluation** | LinkedIn-PP residual + YouTube-PP unexpected + YouTube-NY unexpected | P1 | Possibly cleared by M2 cap-tight + M4 slot-intent fixes | chat → next session | Re-query post-M4 publisher cycles; verify whether selection bottleneck cleared |
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix on CFW LI × image_quote | P1 | DEPLOYED v2.34; awaiting CFW LI fill cycle (~05-06 03:04 UTC) | chat → next session | Query `m.ai_job` after 2026-05-06 03:04 UTC for CFW LI rows with `output_payload->>'skipped' = 'true'` |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P1 | APPLIED v2.34; combined with M4 forward-flow check | chat → next session | Query `m.post_draft` newly-filled rows for `scheduled_for IS NOT NULL` matching `slot.scheduled_publish_at` |
| **ICE Dashboard Architecture Review** | 11-section formal review | strategic-product | KICKOFF complete v2.35; §1 next | chat ↔ PK | PK signals start, write §1 in `Invegent-content-engine/docs/dashboard-review-2026-05/01-current-state-inventory.md` (~1.5h) |
| (others) | per v2.31 | — | — | — | per v2.31 |

**Closed v2.37:**

- **M4 — enqueue scheduled_for source + slot backfill** ✅ — applied via Lesson #62 state-capture override; 8/8 verifications PASS; both D-01 reviews close-the-loop within session.

---

## 💼 Personal businesses

*(none flagged — PK to confirm at next session start)*

---

## 📌 Backlog

**v2.37 changes**:

- **NEW v2.37**: M5 — `p_shadow` binary decision — promoted to Active at P1 (recommended next).
- **NEW v2.37**: 47 v4-origin queue rows still mismatch slot intent — carry-forward; M6 Phase B address scope.
- **Closed v2.37**: M4 — enqueue scheduled_for source + slot backfill (applied + 8/8 verifications + close-the-loop done within session).

**v2.36 changes** (still active):

- M5-M8 sequenced for Tier 2-3. Each pending separate D-01 + PK approval. M5 promoted Active v2.37.
- 108 historical Bug 3 fingerprint queue rows intentionally retained as `queued`; deferred to M6 Phase A.
- queue_id `ad573844` dead-lettered with `dead_reason='m3_bug3_fallback_artifact_2026-05-05'`.

**v2.35 changes** (still active):

- F-COWORK-OWNER-GATE-BUG ✅ CLOSED v2.35.
- 3 stuck-item clusters from health check — Active P1; re-evaluated v2.36 + v2.37.
- ICE Dashboard Architecture Review — Active strategic workstream.

**v2.34 changes** (still active):

- F-AI-WORKER-PARSER-SKIP-BUG, F-AAP-007 v2, F-PUB-009 — V3-V5 acid tests remain (Active rows). M2 cap fix + M4 slot-intent fix added 2 more legs to forward acid-test window (now quadruple-test).

**v2.33 additions** (still active):

- **F-AAP-NEEDS-REVIEW-BACKLOG (P2)** — 28 drafts piled in `needs_review`. Top P2 next-up.
- **B-TOKEN-HEALTH-EMPTY (P3)** — `m.platform_token_health` empty for all clients.
- **F-CFW-LI-DUP-SLOTS (P3)** — historic; part of 6 exceeded_recovery_attempts cluster.

**Carried from v2.31**:

- **B-WORKER-LOG-GAP (P3)** — instrumentation gap.
- **B-AUDIT-FRAMEWORK-PROPOSAL (P3)** — 18 additional views from ChatGPT proposal v2 (deferred).
- **B-CRON-BLOAT (P3)** — `cron.job_run_details` ~260MB suspected bloat.
- **F-AAP-003 (P3)** — misleading metric in `m.vw_ops_pipeline_health`.
- **B-CRON-V3-ORPHAN (P3)** + **B-CRON-V3-ORPHAN-READERS (P3)**.
- **F-AAP-004/005/006 (P3-P4 dormant)**.
- **F-AAP-001 dead-join cleanup**.
- **B-AUDIT-CYCLE3**.
- **F-PUB-008** — NULL platform_post_id (P2).
- **B-INV-LinkedIn-PhantomPublishes** (P2).
- **B39** — Drain over-cap queues (P3, by design).
- **B-PP-FB-ORPHAN-PENDING-FILL (P3)** — PP Facebook 1 orphan + 1 pending_fill.
- **F-RECOVER-LOOP-001 (P3 demoted v2.33)** — recovery loop refactor; defence-in-depth.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15)
- Lesson #51 (HONOURED v2.37 nineteenth — pre-flight P1-P5 honoured before M4 apply)
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication; honoured 1x v2.37)
- **Lesson #62 type-(c) — sixth vindication v2.37 (M4 re-fire). READY FOR CANONICAL PROMOTION.** Pattern: ChatGPT MCP escalates `sql_destructive` actions with generic verbatim-identical pushback even when `verified_claims` body acknowledges clearance. `corrected_action` remains generic (not empty). State-capture override is the appropriate path.
- G1 sync_state restructure (v2.23) — honoured through v2.37
- Lessons #40, #41, #42 promoted canonical (R01 calibration v2 v2.25)
- T-MCP-08 PROMOTED canonical v2.29 — REINFORCED 2x v2.36
- T-MCP-09 lesson candidate: post-apply ACL verification (since v2.29)
- T-MCP-10 lesson candidate: state-snapshot age ≥ 4h re-verification (since v2.30)
- T-MCP-11 lesson candidate: pre-flight discipline includes verifying log/health tables actually contain data (since v2.31, reinforced v2.33)
- T-MCP-12 lesson candidate: query EVERY annotation column when verifying table contents (since v2.32, reinforced v2.33)
- **Lesson candidate (since v2.33, reinforced v2.34)**: when investigating cascading symptoms across multiple findings, drill into the source code of the worker producing the symptom. Promote to canonical after 1 more vindication.
- **Lesson candidate v2.34 — improved-Pattern-1**: when the brief's original fix shape involves a separate trailing UPDATE, check the existing function/view body for an existing block that can be edited surgically instead. Promote to canonical after 1 more vindication.
- **Lesson candidate v2.35 — owner-gate as v1-spec invariant**: queue-walking executors must declare owner-field claims in spec, not ad-hoc executor logic. Promote to canonical after 1 more vindication.
- **Lesson candidate v2.36 — empirical strengthening via in-transaction synthetic state injection**: REINFORCED 1x v2.37 (M4 transaction-rollback test with 4 scenarios). Promote to canonical after 1 more vindication.

---

## v2.37 honest limitations

- All v2.31-v2.36 limitations apply.
- **M4 is forward-only.** 47 pre-M4 v4-origin queue rows still mismatch slot intent. They will publish at the wrong time relative to slot intent (the legacy `get_next_scheduled_for` time they were enqueued with). M4 does NOT retroactively rewrite existing queue rows. M6 Phase B address scope.
- **108 historical Bug 3 fingerprint anomalies** still queued (v2.36 carry-over). Will not silently publish (most are Instagram on disabled profiles). M6 Phase A address scope.
- **3 stuck-item cluster re-evaluation pending.** M2 cap fix + M4 slot-intent fix may have cleared some. Verification awaits next publisher cycle observation.
- **CFW LI fill cycle V3-V5 acid test now QUADRUPLE-test.** Window ~05-06 03:04 UTC tests parser fix + F-PUB-009 + M2 cap-tight + M4 slot-intent simultaneously. If anything regresses, root-cause investigation will need to disambiguate four interacting fixes.
- **M5-M8 sequenced but not started.** PK directs M5 next; chat composes brief and D-01 when PK signals.
- **7 close-the-loop UPDATEs still pending** (carried from v2.34/v2.35). v2.36's 3 closures + v2.37's 2 closures fired and resolved within session; they did NOT add to the carry-over count.
- **Closure budget remains well above floor** (~23.5h trailing-14-day). M4 added ~1h; rate continues high but justified by directly attributable production-defect closure.

---

## Changelog

- v1.0–2.32: per previous changelog.
- v2.33–2.36: per previous changelog.
- **v2.37 (2026-05-05 Sydney early afternoon session-end, M4 applied via Lesson #62 state-capture override):**
  - **M4 (Defect 5) APPLIED.** Migration `m4_enqueue_scheduled_for_slot_intent_and_backfill` ~04:14 UTC. Two atomic ops: (1) UPDATE m.post_draft scheduled_for from slot.scheduled_publish_at for 147 v4 drafts where pd was NULL; (2) cron.alter_job(48) adds LEFT JOIN m.slot + s.scheduled_publish_at as 2nd COALESCE arg. M3 guard + F-PUB-010 cap + ON CONFLICT preserved verbatim.
  - **D-01 fires this session: 2 (both escalated).** First fire `b03eaf14-...` generic pushback. Re-fire `602b0fb2-...` after empirical strengthening (transaction-rollback test covering 4 schedule-resolution scenarios + 147-row backfill determinism check) escalated with **VERBATIM-IDENTICAL** pushback. PK approved Lesson #62 state-capture override.
  - **8/8 post-apply verification PASS.** V1 (147 rows backfilled), V2 (alignment 160 = 147 new + 13 prior F-PUB-009; diverging=0; still-null=0), V3 (cron 48 LEFT JOIN + new resolution order), V4 (M3 guard preserved), V5 (legacy fallback preserved), V6 (queue NULL scheduled_for count = 0), V7 (no v4 promotion / no legacy disable / no p_shadow change / no broad queue cleanup), V8 (both D-01 reviews close-the-loop UPDATEd via `m4_close_the_loop_d01_reviews` migration).
  - **Forward-flow bonus**: 2 new v4-origin queue rows created post-apply by patched cron, both aligned to `slot.scheduled_publish_at`.
  - **Lesson #62 sixth vindication.** Ready for canonical promotion. Pattern: pushback wording verbatim-identical between fires; corrected_action remains generic (not empty); no specific empirical concern raised. Distinguishable from T-MCP-08 type-(b) genuine new knowledge.
  - **NEW S27 standing check** added: M4 forward verification.
  - **M5 promoted** to Active P1 (recommended next). Brief Section 6 cost asymmetry favours (a) remove unless PK names a use case.
  - **47 v4-origin queue rows still mismatch slot intent** — carry-forward; M6 Phase B address scope. M4 forward-only by design.
  - **T-MCP-02 quota**: 29 → 31 (2 fires this session: M4 first + re-fire).
  - **Closure budget**: +~1h M4. Day total ~4.5h. Trailing-14d ~23.5h. Above 8.0 floor.
  - **Net P0+P1 open**: 4 → 4. M4 closed; M5 promoted Active.
- v2.36 (2026-05-05 Sydney early morning): per previous changelog.
- v2.35 and earlier: per prior changelog.
