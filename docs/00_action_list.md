# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-05 Sydney early morning session-end (v2.36 — **Tier 1 queue integrity remediation applied: M1 + M2 + M3 all live and verified. 8/8 post-apply checks PASS. 1 row dead-lettered (queue_id ad573844). 108 historical anomalies intentionally untouched per scope item 5; deferred to M6 Phase A. T-MCP-08 vindicated 2x. M4-M8 remain pending separate D-01 reviews.**). Closure budget: +~3.5h this session, trailing-14-day ~22.5h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S25)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.36 application**: 5 D-01 reviews fired this session (M1 + M2 first + M2 re-fire + M3 first + M3 re-fire). 0 final escalations remained unresolved. T-MCP-02 quota now 29.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~4 (T05 P1-urgent + M4-M8 sequenced + 3 cluster diagnoses still active) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~22.5h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~3.5h** (Tier 1 remediation: M1 ~30 min + M2 ~45 min including re-fire + M3 ~75 min including re-fire and 5-component application + 8-check verification ~30 min + sync ~30 min).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-05 Sydney early morning session-end (v2.36).
> **This session: Tier 1 queue integrity remediation — M1 + M2 + M3 applied + 8/8 verifications PASS + 4-way sync.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **M4 — Defect 5: enqueue cron `pd.scheduled_for` source + slot backfill** | **P1 (recommended next)** | Tier 1 closed cleanly. M4 addresses the new defect surfaced in brief v3: enqueue cron uses `pd.scheduled_for` for v4 slot-driven drafts but those drafts have NULL `pd.scheduled_for` (intent stored on slot, not draft). Backfill needed. | PK greenlight scope; chat fires D-01 with brief; pre-flight P1-P5; apply via Supabase MCP. |
| 3 | **T05 Meta dev support contact** | **P1-urgent** | Unchanged from v2.29 | PK fills 2 placeholders and sends |
| 4 | **CFW LI fill cycle V3-V5 acid test** | **P1** | Next CFW LI slot at ~05-06 03:04 UTC simultaneously tests parser fix (skip-path) + F-PUB-009 (scheduled_for write) + M2 (cap-tight behaviour). Triple-test window. | Next session: query `m.ai_job WHERE updated_at >= '2026-05-06 03:00+00' AND client_id = '3eca32aa-...' AND platform='linkedin'`. Verify (a) succeeded with skipped or normal output, (b) `m.post_draft.scheduled_for = m.slot.scheduled_publish_at` for new fills, (c) at most `max_per_day - published_today` rows locked per call. |
| 5 | **3 stuck-item clusters from health check** | **P1** | Surfaced 2026-05-05 morning by Section 6b of nightly-health-check-v1 v2.1: LinkedIn-PP residual (2 items, oldest 3 days), YouTube-PP unexpected (2 items), YouTube-NY unexpected (1 item). M2 cap fix may have cleared 2 of these (NDIS-YT 09:00 + PP-YT 07:00 are at configured slots; were stuck likely due to cap-loose bug). Re-evaluate. | Re-query stuck clusters after a few publisher cycles run; check whether selection bottleneck cleared with M2 in place. |

**Demoted from prior Today/Next 5 in v2.35→v2.36 cycle** (closed/resolved):

- **Cowork autonomous run validation** ✅ COMPLETE v2.36 — 2026-05-05 ~02:00 AEST run executed autonomously; `docs/audit/health/2026-05-05.md` exists; clean execution; cc-owned briefs not picked up; v2.2 owner-gate validated. Cat C true-stuck section drove M3 dead-letter targeting.

**Demoted from prior Today/Next 5 in v2.34→v2.35 cycle** (still active, just not Top 5):

- F-AAP-NEEDS-REVIEW-BACKLOG (P2) — 28 drafts in `needs_review`. Top P2 next-up.
- F-PUB-009 7-day flow check (P2) — `legacy_spread_mismatch_count` decline trajectory after ~50 newly-filled slots.

---

## 🟢 Tier 1 queue integrity remediation — STATUS BLOCK

**Brief:** `docs/briefs/2026-05-05-queue-integrity-incident.md` (commit `06510ff`).

**Tier 1 (M1-M3): ✅ COMPLETE v2.36** — all three migrations applied 2026-05-05 02:08-03:30 UTC, 8/8 post-apply checks PASS.

| Migration | Status | Applied | D-01 review_id |
|---|---|---|---|
| `m1_cleanup_trigger_filter_by_queue_id` | ✅ DONE | 02:08 UTC | `02557e30-...` (proceed first fire) |
| `m2_publisher_lock_queue_v2_per_partition_cap` | ✅ DONE | 02:35 UTC | `5850dc5a-...` escalated → `e464d685-...` re-fire proceed |
| `m3_get_next_scheduled_for_null_fallback_and_enqueue_guards` | ✅ DONE | 02:56 UTC | `ba0fe26f-...` escalated → `6657f70c-...` re-fire proceed |

**Cleanup performed:** exactly 1 row dead-lettered (queue_id `ad573844`, PP-YT Bug 3 fingerprint, confirmed in morning health check). 108 historical Bug 3 fingerprint anomalies intentionally untouched per scope item 5.

**Tier 2-3 (M4-M8): pending separate D-01 reviews.**

| Migration | Description | Status |
|---|---|---|
| M4 | Enqueue cron `pd.scheduled_for` source semantics + slot backfill for v4 drafts | ⏳ pending — recommended next |
| M5 | `p_shadow` binary decision (keep with enforcement, or rip) | ⏳ pending PK call |
| M6 | Phase A dead-letter — 108 historical Bug 3 fingerprint anomalies | ⏳ sequenced after M4 |
| M7 | Promote v4 (atomic with M8) | ⏳ pending |
| M8 | Disable legacy enqueue + Phase B dead-letter | ⏳ pending |

**T-MCP-08 vindicated 2x this session.** M2 + M3 re-fires both produced genuine new knowledge: empirical multi-partition Scenario B test (M2) and synthetic CTE-filter test (M3). Both re-fires resulted in fresh `verified_claims` reflecting added evidence + empty `corrected_action`. Distinguishable from Lesson #62 type-(c) consistency-bias.

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate | (per v2.30) | (per v2.30) |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.36 note**: 29 fires total (5 fires this session — 3 first + 2 re-fires). 7d escalation rate now 15/30 = 50% (T-MCP-06 signal still elevated; both M2 + M3 first fires escalated, both re-fires proceeded). |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at ~22.5h trailing-14-day — well above 8.0 floor.** |
| S19 | R01 Data Auditor closure effectiveness | (per v2.30) | (per v2.30) |
| S21 | Pipeline incident health | `SELECT * FROM audit.v_brand_platform_audit_matrix ORDER BY CASE likely_bottleneck WHEN 'ok_or_recently_active' THEN 99 ELSE 1 END, client_slug, platform;` | Watch for: classification shifts. v2.34 added `approved_not_queued_genuine_gap` label. |
| S22 | Cron heartbeat health | `SELECT jobname, status, minutes_since_last, consecutive_misses FROM m.cron_health_status WHERE status != 'green';` | Empty result = all crons healthy. |
| S23 | F-PUB-009 forward-flow check | `SELECT count(*) FROM m.post_draft d JOIN m.slot s ON s.filled_draft_id = d.post_draft_id WHERE d.created_at >= NOW() - INTERVAL '24 hours' AND d.scheduled_for IS NOT NULL` | Should be > 0 within 24h post-apply, growing toward majority of new slot-driven drafts having scheduled_for populated. |
| S24 | F-AI-WORKER-PARSER-SKIP-BUG forward verification | `SELECT count(*) FROM m.ai_job WHERE updated_at >= NOW() - INTERVAL '24 hours' AND status='succeeded' AND output_payload->>'skipped' = 'true'` | Should be > 0 within 24h post-apply when CFW LI fill cycles fire. Validates parser fix lets compliance skips reach the existing skip handler. |
| S25 | Cowork autonomous run check | Verify `docs/audit/health/{today}.md` exists; check no cc-owned briefs were picked up by Cowork (owner-gate working). | Empty health file or any cc-owned brief picked up = v2.2 owner-gate failure; investigate. **v2.36 status: 2026-05-05 autonomous run PASSED — file exists, clean execution, cc-owned briefs not picked up.** |
| **S26 NEW v2.36** | **Tier 1 fix forward verification** | Check (a) cron 48 still uses CTE wrapper + IS NOT NULL filter; (b) `m.post_publish_queue` NULL `scheduled_for` count = 0; (c) publisher per-partition cap respected (no overage in lock cycles). | Any drift = regression. Particularly important during M4 application — M4 should not undo M3 changes. |

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.31.

**v2.36 status delta**: Tier 1 queue integrity remediation (M1+M2+M3) shipped. M4 recommended next. M5-M8 sequenced. Cowork pipeline reliability blocker resolved v2.35 (autonomous run validated this session).

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 29 of 5)

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | ✅ DONE | Closed | — |
| T-MCP-02 | ✅ EXCEEDED 29 of 5 | — | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17 |
| T-MCP-05 | ✅ DONE v2.29 | — | — |
| T-MCP-05-NEW | Close-the-loop UPDATE on `1bae5068-...` | P3 | PK confirm |
| T-MCP-05-NEW2 | Close-the-loop UPDATE on 3 review_ids from v2.34 | P3 | Combine in next batch closure (still 7 total: 4 carry-overs + 3 from v2.34; v2.36's 3 closures fired and resolved within session) |
| T-MCP-06 | Investigate plan_review + sql_destructive escalation rates | P3 | **v2.36 strong signal**: sql_destructive at 4-of-4 escalated across v2.34+v2.36 (all type-c flavoured initially; v2.36's M2+M3 re-fires both produced genuine new evidence — type-(b) flavour). Pattern: complex multi-evidence destructive fixes likely escalate first time, proceed on re-fire after empirical strengthening. |
| T-MCP-08 | ✅ PROMOTED canonical v2.29 | **REINFORCED 2x v2.36** | M2 + M3 re-fires |
| T-MCP-09 | Lesson candidate: post-apply ACL verification | P3 | After 1-2 more instances |
| T-MCP-10 | Lesson candidate: state-snapshot age ≥ 4h re-verification | P3 | After 1-2 more instances |
| T-MCP-11 | Lesson candidate: pre-flight discipline includes verifying log/health table actually contains data | P3 | Bundle with T-MCP-12 for promotion |
| T-MCP-12 | Lesson candidate: query EVERY annotation column when verifying table contents | P3 | Bundle with T-MCP-11 for promotion |

---

## 🤖 Cowork automation (D182)

**v2.36 update**: 2026-05-05 02:00 AEST autonomous run executed cleanly under v2.2 owner-gate. `docs/audit/health/2026-05-05.md` produced; cc-owned briefs not picked up; 6 Cat C true-stuck items surfaced in Section 6b (drove M3 dead-letter targeting). v2.2 owner-gate validated.

Sunset review: 12 May 2026 — unchanged.

---

## 🧭 ICE Dashboard Architecture Review (v2.35)

Unchanged from v2.35. §1 (Current-state inventory) remains NEXT — when PK signals.

---

## 🟡 Active

Per v2.31 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **NEW v2.36: M4 — enqueue scheduled_for source + slot backfill** | Brief Defect 5; enqueue cron `pd.scheduled_for` source semantics + backfill for v4 drafts where intent lives on slot | P1 | Pending separate D-01 + PK approval | chat → next session | PK greenlight scope; chat composes apply plan; D-01; pre-flight P1-P5; apply via Supabase MCP |
| **NEW v2.36: 3 stuck-item clusters re-evaluation** | LinkedIn-PP residual + YouTube-PP unexpected + YouTube-NY unexpected | P1 | Possibly cleared by M2 cap-tight fix | chat → next session | Re-query post-M2 publisher cycles; verify whether selection bottleneck cleared |
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix on CFW LI × image_quote | P1 | DEPLOYED v2.34; awaiting CFW LI fill cycle (~05-06 03:04 UTC) | chat → next session | Query `m.ai_job` after 2026-05-06 03:04 UTC for CFW LI rows with `output_payload->>'skipped' = 'true'` |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P1 | APPLIED v2.34; awaiting next fill cycle | chat → next session | Query `m.post_draft` newly-filled rows for `scheduled_for IS NOT NULL` matching slot.scheduled_publish_at |
| **ICE Dashboard Architecture Review** | 11-section formal review | strategic-product | KICKOFF complete v2.35; §1 next | chat ↔ PK | PK signals start, write §1 in `Invegent-content-engine/docs/dashboard-review-2026-05/01-current-state-inventory.md` (~1.5h) |
| (others) | per v2.31 | — | — | — | per v2.31 |

**Closed v2.36:**

- **Cowork autonomous run validation** ✅ — 2026-05-05 02:00 AEST run executed cleanly (above).

---

## 💼 Personal businesses

*(none flagged — PK to confirm at next session start)*

---

## 📌 Backlog

**v2.36 changes**:

- **NEW v2.36**: M4 — enqueue scheduled_for source + slot backfill — promoted to Active at P1 (recommended next).
- **NEW v2.36**: M5-M8 — sequenced for Tier 2-3 of queue integrity remediation. Each pending separate D-01 + PK approval.
- **NEW v2.36**: 108 historical Bug 3 fingerprint queue rows intentionally retained as `queued`; deferred to M6 Phase A.
- **NEW v2.36**: queue_id `ad573844` dead-lettered with `dead_reason='m3_bug3_fallback_artifact_2026-05-05'`.

**v2.35 changes** (still active):

- F-COWORK-OWNER-GATE-BUG ✅ CLOSED v2.35.
- 3 stuck-item clusters from health check — promoted to Active at P1; re-evaluated v2.36 (M2 cap fix may have cleared 2 of 3).
- ICE Dashboard Architecture Review — Active strategic workstream.

**v2.34 changes** (still active):

- F-AI-WORKER-PARSER-SKIP-BUG, F-AAP-007 v2, F-PUB-009 — V3-V5 acid tests remain (Active rows). M2 cap fix added third leg to forward acid-test window.

**v2.33 additions** (still active):

- **F-AAP-NEEDS-REVIEW-BACKLOG (P2)** — 28 drafts piled in `needs_review`. Top P2 next-up.
- **B-TOKEN-HEALTH-EMPTY (P3)** — `m.platform_token_health` empty for all clients.
- **F-CFW-LI-DUP-SLOTS (P3)** — 2 CFW LI failed slots both 2026-05-04 03:04. (Now part of the 6 historic exceeded_recovery_attempts cluster post-investigation.)
- **B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING** ✅ CLOSED v2.34.

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
- **F-RECOVER-LOOP-001 (P3 demoted v2.33)** — recovery loop refactor; defence-in-depth, no longer urgent post F-AI-WORKER-PARSER-SKIP-BUG.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15)
- Lesson #51 (HONOURED v2.36 eighteenth — pre-flight P1-P5 honoured before each Tier 1 migration)
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication; honoured 3x v2.36 — once per migration)
- **Lesson #62 type-(c) — at 5+ vindications since v2.34**. Ready for canonical promotion. v2.36 NOT a new vindication: M2 + M3 re-fires were T-MCP-08 type-(b) genuine-new-knowledge, distinguishable from type-(c) by post-re-fire `verified_claims` reflecting added evidence + empty `corrected_action`.
- G1 sync_state restructure (v2.23) — honoured through v2.36
- Lessons #40, #41, #42 promoted canonical (R01 calibration v2 v2.25)
- T-MCP-08 PROMOTED canonical v2.29 — **REINFORCED 2x v2.36** (M2 + M3 re-fires both produced genuine new knowledge)
- T-MCP-09 lesson candidate: post-apply ACL verification (since v2.29)
- T-MCP-10 lesson candidate: state-snapshot age ≥ 4h re-verification (since v2.30)
- T-MCP-11 lesson candidate: pre-flight discipline includes verifying log/health tables actually contain data (since v2.31, reinforced v2.33)
- T-MCP-12 lesson candidate: query EVERY annotation column when verifying table contents (since v2.32, reinforced v2.33)
- **Lesson candidate (since v2.33, reinforced v2.34)**: when investigating cascading symptoms across multiple findings, drill into the source code of the worker producing the symptom. Promote to canonical after 1 more vindication.
- **Lesson candidate v2.34 — improved-Pattern-1**: when the brief's original fix shape involves a separate trailing UPDATE, check the existing function/view body for an existing block that can be edited surgically instead. Promote to canonical after 1 more vindication.
- **Lesson candidate v2.35 — owner-gate as v1-spec invariant**: queue-walking executors must declare owner-field claims in spec, not ad-hoc executor logic. Promote to canonical after 1 more vindication.
- **NEW lesson candidate v2.36 — empirical strengthening via in-transaction synthetic state injection**: when an empirical test is impossible against current production state (e.g., partition not at-cap due to time-of-day; no eligible candidates today), use transaction-rollback with synthetic INSERT injection to construct the desired state. Real FK constraints satisfied with existing IDs; cleanup via ROLLBACK; trigger-safety preserved with `queue_id=NULL` to avoid cleanup-trigger interference. Pattern produced 2 successful re-fires this session (M2 multi-partition + M3 CTE-filter). Promote to canonical after 1 more vindication.

---

## v2.36 honest limitations

- All v2.31-v2.35 limitations apply.
- **Tier 1 fixes are forward-only.** 108 historical Bug 3 fingerprint anomalies remain in queue as `queued`. They will not silently publish (most are Instagram on disabled profiles), but the queue boolean `has_stuck_items` will continue firing on them until M6 Phase A clears them.
- **3 stuck-item cluster re-evaluation pending.** M2 cap fix likely cleared 2 of 3 clusters (NDIS-YT 09:00 UTC and PP-YT 07:00 UTC at configured slots, stuck likely due to cap-loose bug pre-M2). Verification awaits next publisher cycle observation.
- **CFW LI fill cycle V3-V5 acid test now triple-test.** Window ~05-06 03:04 UTC tests parser fix + F-PUB-009 + M2 cap-tight simultaneously. If anything regresses, root-cause investigation will need to disambiguate.
- **M4-M8 sequenced but not started.** PK directed M4 next; chat composes brief and D-01 when PK signals.
- **7 close-the-loop UPDATEs still pending** (carried from v2.34/v2.35). v2.36's 3 closures fired and resolved within session; they did NOT add to the carry-over count.
- **Closure budget remains well above floor** (~22.5h trailing-14-day). Tier 1 work added ~3.5h; rate continues high but justified by directly attributable production-defect closure.

---

## Changelog

- v1.0–2.32: per previous changelog.
- v2.33 (2026-05-04 morning Sydney phone session): per previous changelog.
- v2.34 (2026-05-04 laptop Sydney mid-session): per previous changelog.
- v2.35 (2026-05-04 laptop Sydney evening session-end, dashboard architecture review kickoff + cowork recovery): per previous changelog.
- **v2.36 (2026-05-05 Sydney early morning session-end, Tier 1 queue integrity remediation applied):**
  - **Tier 1 queue integrity remediation: M1 + M2 + M3 ALL APPLIED AND VERIFIED.** Brief `docs/briefs/2026-05-05-queue-integrity-incident.md` (commit `06510ff`).
    - **M1 `m1_cleanup_trigger_filter_by_queue_id`** ~02:08 UTC. D-01 `02557e30-...` proceed first fire. V1-V4 PASS. Fixes cross-platform queue wipe in cleanup trigger.
    - **M2 `m2_publisher_lock_queue_v2_per_partition_cap`** ~02:35 UTC. D-01 `5850dc5a-...` escalated → re-fire `e464d685-...` proceed after empirical multi-partition transaction-rollback test (synthetic published-row injection, real FK drafts, queue_id=NULL safe vs M1). V1-V5 PASS. Fixes cap-loose bug in publisher.
    - **M3 `m3_get_next_scheduled_for_null_fallback_and_enqueue_guards`** ~02:56 UTC. Five-component atomic migration. D-01 `ba0fe26f-...` escalated → re-fire `6657f70c-...` proceed after synthetic VALUES-based CTE-filter test. V1-V8 PASS. Fixes Bug 3 fallback + enqueue NULL guards + 1-row dead-letter.
  - **Cleanup performed:** exactly 1 row dead-lettered (queue_id `ad573844`, PP-YT Bug 3 fingerprint, `dead_reason='m3_bug3_fallback_artifact_2026-05-05'`).
  - **108 historical Bug 3 fingerprint anomalies intentionally untouched** per scope item 5; deferred to M6 Phase A.
  - **NO v4 promotion** (m.bundle_client_v4 unchanged).
  - **NO legacy disable** (cron jobid 48 still active=true, just patched).
  - **NO p_shadow change** (m.fill_pending_slots untouched).
  - **8-check post-apply verification per PK directive: 8/8 PASS.** V1 false-positive (regex matched commented documentation) treated as verification-pattern issue, addressed with V1-strict comment-aware check.
  - **Cowork autonomous run 2026-05-05 02:00 AEST: PASSED.** `docs/audit/health/2026-05-05.md` produced cleanly; cc-owned briefs not picked up; v2.2 owner-gate validated. Cat C true-stuck section drove M3 dead-letter targeting.
  - **T-MCP-02 quota**: 24 → 29 (5 fires this session: 3 first + 2 re-fires).
  - **T-MCP-08 vindicated 2x**. M2 + M3 re-fires both produced genuine new knowledge (verified_claims reflected added evidence; corrected_action empty).
  - **NEW S26 standing check** added: Tier 1 fix forward verification.
  - **NEW lesson candidate v2.36**: empirical strengthening via in-transaction synthetic state injection.
  - **M4-M8 sequenced as Backlog → Active for Tier 2-3.** M4 recommended next; M5-M8 follow.
  - **Closure budget**: +~3.5h. Trailing-14d ~22.5h. Above 8.0 floor.
  - **Net P0+P1 open**: 4 → 4. Effectively unchanged (cowork validation closed; M4 promoted Active).
- v2.35 (2026-05-04 laptop Sydney evening): per previous changelog.
- v2.34 (2026-05-04 laptop Sydney mid-session): per previous changelog.
- v2.33 (2026-05-04 morning Sydney): per previous changelog.
- v2.32 (3 May Sunday late-night Sydney): per previous changelog.
- v2.31 and earlier: per prior changelog.
