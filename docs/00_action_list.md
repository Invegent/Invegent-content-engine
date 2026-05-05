# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-05 Sydney late afternoon session-end (v2.38 — **M5 (`p_shadow` / `is_shadow` removal + cascade fix on `m.check_evergreen_threshold`) APPLIED via `m5_remove_p_shadow_corrected_v2`. First apply failed at view-rewrite step (`42P16`); P3 dependency miss surfaced; corrected packet re-fired D-01 cleanly; 7/7 post-apply verifications PASS. M4 invariants intact. M6 Phase A promoted to recommended-next.**). Closure budget: +~1.5h this session, day total ~6h, trailing-14-day ~25h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S27)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.38 application**: 2 D-01 reviews fired this session (M5 original + M5 corrected). Both proceed/agree first-fire, no pushback. Notable clean-proceed counter-pattern after recent `sql_destructive` escalation streak. T-MCP-02 quota now 33.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~4 (T05 P1-urgent + M6-M8 sequenced + 3 cluster diagnoses still active) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~25h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~1.5h** (M5 inspection + 5 pre-D-01 checks + 2 D-01 fires + first apply (failed → rolled back) + diagnosis + corrected migration + 7-check verification + sync).

**Day total (5 May): ~6h** (Tier 1 morning ~3.5h + M4 afternoon ~1h + M5 late afternoon ~1.5h).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-05 Sydney late afternoon session-end (v2.38).
> **This session: M5 applied (corrected; cascade fix on m.check_evergreen_threshold) + 7/7 verifications + 4-way sync.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **M6 Phase A — 108 historical Bug 3 fingerprint dead-letter** | **P1 (recommended next)** | M5 closed cleanly. M6 Phase A is the next sequenced item (v2.36 brief). 108 queue rows currently sitting `queued` since `m3_bug3_fallback_artifact_2026-05-05`-style fingerprints. Will not silently publish (most Instagram on disabled profiles) but should be cleaned up. | PK directs start; chat composes brief + D-01 + pre-flight P1-P5; apply via Supabase MCP DML. |
| 3 | **T05 Meta dev support contact** | **P1-urgent** | Unchanged from v2.29 | PK fills 2 placeholders and sends |
| 4 | **CFW LI fill cycle V3-V5 QUINTUPLE-test acid test** | **P1** | Next CFW LI slot at ~05-06 03:04 UTC simultaneously tests parser fix + F-PUB-009 + M2 cap-tight + M4 slot-intent routing + M5 no-shadow signature. Quintuple-test window. | Next session: query `m.ai_job WHERE updated_at >= '2026-05-06 03:00+00' AND client_id = '3eca32aa-...' AND platform='linkedin'` + `m.post_publish_queue` for newly-enqueued CFW LI rows. Verify: (a) ai_job succeeded, (b) `m.post_draft.scheduled_for = m.slot.scheduled_publish_at` for new fills, (c) per-partition cap respected, (d) queue row aligned to `slot.scheduled_publish_at`, (e) no errors from new function signature. |
| 5 | **3 stuck-item clusters from health check** | **P1** | Surfaced 2026-05-05 morning. M2+M4+M5 may have collectively cleared mismatched slot intent for v4 entries in these clusters. Re-evaluate. | Re-query stuck clusters after a few publisher cycles run; check whether selection bottleneck cleared. |

**Demoted from prior Today/Next 5 in v2.37→v2.38 cycle** (closed/resolved):

- **M5 — `p_shadow` binary decision** ✅ APPLIED v2.38 — Option A (remove). 5 DB-only changes + cascade fix on `m.check_evergreen_threshold`. 2 D-01 fires both clean proceed. 7/7 verifications PASS.

**Demoted from prior Today/Next 5 in v2.36→v2.37 cycle** (still active, just not Top 5):

- F-AAP-NEEDS-REVIEW-BACKLOG (P2) — 28 drafts in `needs_review`. Top P2 next-up.
- F-PUB-009 7-day flow check (P2) — combined with M4/M5 forward-flow expectation.

---

## 🟢 Tier 1 + M4 + M5 queue integrity & cleanup remediation — STATUS BLOCK

**Brief:** `docs/briefs/2026-05-05-queue-integrity-incident.md` v3 (commit `06510ff`).

**Tier 1 (M1-M3): ✅ COMPLETE v2.36** — all three migrations applied 2026-05-05 02:08-03:30 UTC, 8/8 post-apply checks PASS.

**M4: ✅ COMPLETE v2.37** — applied 2026-05-05 ~04:14 UTC, 8/8 post-apply checks PASS.

**M5: ✅ COMPLETE v2.38** — applied 2026-05-05 ~05:25 UTC, 7/7 post-apply checks PASS. First apply attempt failed at view-rewrite (`42P16`); corrected packet re-fired D-01 cleanly.

| Migration | Status | Applied | D-01 review_ids |
|---|---|---|---|
| `m1_cleanup_trigger_filter_by_queue_id` | ✅ DONE | 02:08 UTC | `02557e30-...` (proceed first fire) |
| `m2_publisher_lock_queue_v2_per_partition_cap` | ✅ DONE | 02:35 UTC | `5850dc5a-...` escalated → `e464d685-...` re-fire proceed |
| `m3_get_next_scheduled_for_null_fallback_and_enqueue_guards` | ✅ DONE | 02:56 UTC | `ba0fe26f-...` escalated → `6657f70c-...` re-fire proceed |
| `m4_enqueue_scheduled_for_slot_intent_and_backfill` | ✅ DONE | ~04:14 UTC | `b03eaf14-...` escalated → `602b0fb2-...` re-fire escalated → **Lesson #62 state-capture override** (PK approval) |
| `m4_close_the_loop_d01_reviews` | ✅ DONE | ~04:21 UTC | (audit-trail-only DML; no review needed) |
| `m5_remove_p_shadow_corrected_v2` | ✅ DONE | ~05:25 UTC | `b3609bc4-...` proceed → first apply failed (`42P16`) → `713dc407-...` corrected packet proceed → applied cleanly |

**Cleanup performed:** v2.36 dead-lettered queue_id `ad573844`. v2.37 backfilled 147 rows of `m.post_draft.scheduled_for`. v2.38 dropped p_shadow / is_shadow + indexes; refactored view + `m.check_evergreen_threshold` + `m.fill_pending_slots`; updated cron 75.

**Tier 2-3 (M6-M8): pending separate D-01 reviews.**

| Migration | Description | Status |
|---|---|---|
| M6 Phase A | Dead-letter 108 historical Bug 3 fingerprint anomalies | ⏳ pending PK call — recommended next |
| M6 Phase B | Address 47 v4 mismatch queue rows | ⏳ sequenced after M6 Phase A |
| M7 | Promote v4 (atomic with M8) | ⏳ pending |
| M8 | Disable legacy enqueue + remaining legacy futures | ⏳ pending |

**T-MCP-08 vindicated 2x in v2.36 (M2 + M3 re-fires).** **Lesson #62 vindicated 1x in v2.37 (M4 re-fire); sixth vindication overall.** **v2.38 clean-proceed counter-pattern: 2/2 D-01 fires proceed first-time without escalation despite `sql_destructive` action_type.**

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate | (per v2.30) | (per v2.30) |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.38 note**: 33 fires total (2 fires this session — M5 original + corrected, both clean proceed). 7d escalation rate now 17/34 = 50% (T-MCP-06 signal slightly lower this session due to clean proceeds). |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at ~25h trailing-14-day — well above 8.0 floor.** |
| S19 | R01 Data Auditor closure effectiveness | (per v2.30) | (per v2.30) |
| S21 | Pipeline incident health | `SELECT * FROM audit.v_brand_platform_audit_matrix ORDER BY CASE likely_bottleneck WHEN 'ok_or_recently_active' THEN 99 ELSE 1 END, client_slug, platform;` | Watch for: classification shifts. v2.34 added `approved_not_queued_genuine_gap` label. |
| S22 | Cron heartbeat health | `SELECT jobname, status, minutes_since_last, consecutive_misses FROM m.cron_health_status WHERE status != 'green';` | Empty result = all crons healthy. |
| S23 | F-PUB-009 forward-flow check | `SELECT count(*) FROM m.post_draft d JOIN m.slot s ON s.filled_draft_id = d.post_draft_id WHERE d.created_at >= NOW() - INTERVAL '24 hours' AND d.scheduled_for IS NOT NULL` | Should be > 0 within 24h post-apply, growing. |
| S24 | F-AI-WORKER-PARSER-SKIP-BUG forward verification | `SELECT count(*) FROM m.ai_job WHERE updated_at >= NOW() - INTERVAL '24 hours' AND status='succeeded' AND output_payload->>'skipped' = 'true'` | Should be > 0 within 24h post-apply when CFW LI fill cycles fire. |
| S25 | Cowork autonomous run check | Verify `docs/audit/health/{today}.md` exists; check no cc-owned briefs were picked up by Cowork. | Empty health file or any cc-owned brief picked up = v2.2 owner-gate failure; investigate. |
| S26 | Tier 1 fix forward verification | Check (a) cron 48 still uses CTE wrapper + IS NOT NULL filter; (b) `m.post_publish_queue` NULL `scheduled_for` count = 0; (c) publisher per-partition cap respected. | Any drift = regression. |
| S27 | M4 forward verification | (1) `SELECT count(*) FROM m.post_draft pd JOIN m.slot s ON s.slot_id = pd.slot_id WHERE pd.slot_id IS NOT NULL AND pd.scheduled_for IS DISTINCT FROM s.scheduled_publish_at` — should remain 0. (2) `SELECT count(*) FROM m.post_publish_queue q JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id WHERE pd.slot_id IS NOT NULL AND q.status='queued' AND q.scheduled_for = (SELECT s.scheduled_publish_at FROM m.slot s WHERE s.slot_id = pd.slot_id)` — should grow as new v4 queue rows are produced by patched cron 48. | Drift on (1) = M4 regression. Stagnation on (2) = patched cron not producing aligned rows. **v2.38 verified: drift=0, aligned=3 (no regression post-M5).** |
| **S28 NEW v2.38** | **M5 forward verification** | (1) `m.fill_pending_slots(p_max_slots integer)` exists, no p_shadow arg. (2) After cron 75 fires, no errors in `cron.job_run_details` for jobid 75. (3) `m.evergreen_ratio_7d` returns rows on every call. (4) `m.check_evergreen_threshold` returns `alert` and `ratio_used` keys for any active client. | Any failure = M5 regression. |

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.31.

**v2.38 status delta**: Tier 1 + M4 + M5 shipped. M6 Phase A recommended next. M6 Phase B + M7 + M8 sequenced.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 33 of 5)

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | ✅ DONE | Closed | — |
| T-MCP-02 | ✅ EXCEEDED 33 of 5 | — | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17 |
| T-MCP-05 | ✅ DONE v2.29 | — | — |
| T-MCP-05-NEW | Close-the-loop UPDATE on `1bae5068-...` | P3 | PK confirm |
| T-MCP-05-NEW2 | Close-the-loop UPDATE on review_ids from v2.34 + v2.38 | P3 | Combine in next batch closure (7 carry-overs + v2.38's `b3609bc4` + `713dc407` = 9 pending) |
| T-MCP-06 | Investigate plan_review + sql_destructive escalation rates | P3 | **v2.38 update**: sql_destructive at 6-of-8 escalated across v2.34+v2.36+v2.37+v2.38. M5's 2-of-2 clean proceeds reduce signal slightly. Pattern: clean proceeds possible when PK pre-approves + non-destructive at client layer + empirically-grounded evidence + rollback explicit. |
| T-MCP-08 | ✅ PROMOTED canonical v2.29 | **REINFORCED 2x v2.36** | M2 + M3 re-fires |
| T-MCP-09 | Lesson candidate: post-apply ACL verification | P3 | After 1-2 more instances |
| T-MCP-10 | Lesson candidate: state-snapshot age ≥ 4h re-verification | P3 | After 1-2 more instances |
| T-MCP-11 | Lesson candidate: pre-flight discipline includes verifying log/health table actually contains data | P3 | Bundle with T-MCP-12 for promotion |
| T-MCP-12 | Lesson candidate: query EVERY annotation column when verifying table contents | P3 | Bundle with T-MCP-11 for promotion |
| **T-MCP-13 NEW v2.38** | **Lesson candidate: pre-flight P3 must trace transitive view→fn→fn dependencies, not just touch-points** | P2 | Surfaced v2.38 (M5 first apply failed at `42P16`; `m.check_evergreen_threshold` not in original D-01 packet). Reinforces Lesson #61. Promote to canonical after 1 more vindication. |

---

## 🤖 Cowork automation (D182)

**v2.38 update**: 2026-05-05 02:00 AEST autonomous run executed cleanly under v2.2 owner-gate (per v2.36). Sunset review: 12 May 2026 — unchanged.

---

## 🧭 ICE Dashboard Architecture Review (v2.35)

Unchanged from v2.35. §1 (Current-state inventory) remains NEXT — when PK signals.

---

## 🟡 Active

Per v2.31 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **NEW v2.38: M6 Phase A — 108 historical Bug 3 dead-letter** | Clean up `queued` rows with Bug 3 fingerprint | P1 | Pending PK call | PK → chat → next session | PK directs start; chat composes brief + D-01 + pre-flight P1-P5; apply via Supabase MCP DML (UPDATE m.post_publish_queue SET status='dead', dead_reason='m6_phase_a_historical_bug3_fingerprint' WHERE ...). |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | Address as part of M6 Phase B. |
| **3 stuck-item clusters re-evaluation** | LinkedIn-PP residual + YouTube-PP unexpected + YouTube-NY unexpected | P1 | Possibly cleared by M2+M4+M5 | chat → next session | Re-query post-M5 publisher cycles; verify whether selection bottleneck cleared |
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix on CFW LI × image_quote | P1 | DEPLOYED v2.34; awaiting CFW LI fill cycle (~05-06 03:04 UTC) | chat → next session | Query `m.ai_job` after 2026-05-06 03:04 UTC for CFW LI rows with `output_payload->>'skipped' = 'true'` |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P1 | APPLIED v2.34; combined with M4/M5 forward-flow check | chat → next session | Query `m.post_draft` newly-filled rows for `scheduled_for IS NOT NULL` matching `slot.scheduled_publish_at` |
| **ICE Dashboard Architecture Review** | 11-section formal review | strategic-product | KICKOFF complete v2.35; §1 next | chat ↔ PK | PK signals start, write §1 in `Invegent-content-engine/docs/dashboard-review-2026-05/01-current-state-inventory.md` (~1.5h) |
| (others) | per v2.31 | — | — | — | per v2.31 |

**Closed v2.38:**

- **M5 — `p_shadow` / `is_shadow` removal + cascade fix on `m.check_evergreen_threshold`** ✅ — applied via `m5_remove_p_shadow_corrected_v2`; 7/7 verifications PASS; 2 clean D-01 proceeds.

---

## 💼 Personal businesses

*(none flagged — PK to confirm at next session start)*

---

## 📌 Backlog

**v2.38 changes**:

- **NEW v2.38**: T-MCP-13 lesson candidate (pre-flight P3 transitive dependency mapping) — promoted to T-MCP table.
- **Closed v2.38**: M5 — applied + 7/7 verifications + 4-way sync.
- **Promoted v2.38**: M6 Phase A → recommended next.

**v2.37 changes** (still active):

- M6-M8 sequenced for Tier 2-3. M6 Phase A promoted Active v2.38.
- 108 historical Bug 3 fingerprint queue rows intentionally retained as `queued`; M6 Phase A address scope.
- queue_id `ad573844` dead-lettered.
- 47 v4-origin queue rows still mismatch slot intent — M6 Phase B address scope.

**v2.36 changes** (still active):

- (M5 closed in v2.38; M6-M8 still sequenced)

**v2.35 changes** (still active):

- F-COWORK-OWNER-GATE-BUG ✅ CLOSED v2.35.
- 3 stuck-item clusters from health check — Active P1; re-evaluated v2.36 + v2.37 + v2.38.
- ICE Dashboard Architecture Review — Active strategic workstream.

**v2.34 changes** (still active):

- F-AI-WORKER-PARSER-SKIP-BUG, F-AAP-007 v2, F-PUB-009 — V3-V5 acid tests remain (Active rows). M5 added 5th leg to forward acid-test window (now quintuple-test).

**v2.33 additions** (still active):

- **F-AAP-NEEDS-REVIEW-BACKLOG (P2)** — 28 drafts. Top P2 next-up.
- **B-TOKEN-HEALTH-EMPTY (P3)** — `m.platform_token_health` empty for all clients.
- **F-CFW-LI-DUP-SLOTS (P3)** — historic; part of 6 exceeded_recovery_attempts cluster.

**Carried from v2.31**:

- **B-WORKER-LOG-GAP (P3)**, **B-AUDIT-FRAMEWORK-PROPOSAL (P3)**, **B-CRON-BLOAT (P3)**, **F-AAP-003 (P3)**, **B-CRON-V3-ORPHAN (P3)**, **B-CRON-V3-ORPHAN-READERS (P3)**, **F-AAP-004/005/006 (P3-P4 dormant)**, **F-AAP-001 dead-join cleanup**, **B-AUDIT-CYCLE3**, **F-PUB-008** (NULL platform_post_id, P2), **B-INV-LinkedIn-PhantomPublishes** (P2), **B39** (Drain over-cap queues, P3 by design), **B-PP-FB-ORPHAN-PENDING-FILL (P3)**, **F-RECOVER-LOOP-001 (P3 demoted v2.33)**.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15)
- Lesson #51 (HONOURED v2.38 twentieth — pre-flight P1-P5 honoured before M5 apply, with P3 miss caught at apply-time)
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication; **REINFORCED v2.38 — P3 dependency mapping miss surfaced as `42P16` view-rewrite error; lesson candidate T-MCP-13 added**)
- **Lesson #62 type-(c) — sixth vindication v2.37 (M4 re-fire). READY FOR CANONICAL PROMOTION.** v2.38 did not vindicate (clean proceeds); promotion still pending.
- G1 sync_state restructure (v2.23) — honoured through v2.38
- Lessons #40, #41, #42 promoted canonical (R01 calibration v2 v2.25)
- T-MCP-08 PROMOTED canonical v2.29 — REINFORCED 2x v2.36
- T-MCP-09 lesson candidate: post-apply ACL verification (since v2.29)
- T-MCP-10 lesson candidate: state-snapshot age ≥ 4h re-verification (since v2.30)
- T-MCP-11 lesson candidate: pre-flight discipline includes verifying log/health tables actually contain data (since v2.31, reinforced v2.33)
- T-MCP-12 lesson candidate: query EVERY annotation column when verifying table contents (since v2.32, reinforced v2.33)
- **T-MCP-13 NEW v2.38: pre-flight P3 must trace transitive view→fn→fn dependencies, not just touch-points.** Promote to canonical after 1 more vindication.
- **Lesson candidate (since v2.33, reinforced v2.34)**: when investigating cascading symptoms across multiple findings, drill into the source code of the worker producing the symptom.
- **Lesson candidate v2.34 — improved-Pattern-1**: when the brief's original fix shape involves a separate trailing UPDATE, check the existing function/view body for an existing block that can be edited surgically.
- **Lesson candidate v2.35 — owner-gate as v1-spec invariant**.
- **Lesson candidate v2.36 — empirical strengthening via in-transaction synthetic state injection**: REINFORCED 1x v2.37.
- **NEW v2.38 — clean-proceed counter-pattern on sql_destructive**: 2-of-2 M5 D-01 fires proceeded first-time without escalation, despite recent streak of escalations. Pattern signals: PK pre-approves + change non-destructive at client layer + evidence empirically grounded (37 already-published shadow records) + rollback path explicit. Track for T-MCP-06 nuance.

---

## v2.38 honest limitations

- All v2.31-v2.37 limitations apply.
- **160 records lost their `is_shadow=true` marker.** Audit trail of which v4 records were originally flagged irretrievable. Acceptable: flag was inert (37 already published live regardless).
- **`m.evergreen_ratio_7d` view lost the live/shadow split.** Any external dashboard query against the old column names (`live_filled_total`, `live_evergreen_ratio`, `shadow_*`) would break. None known to exist; GitHub TS search returned 0 hits.
- **Pre-flight P3 dependency map should have caught `m.check_evergreen_threshold` before first apply.** Lesson candidate T-MCP-13 logged. First apply failure was atomic rollback with zero production residue, so cost was ~15 min of re-inspection + re-D-01 only.
- **M6 Phase A not yet started.** PK directs M6 next; chat composes brief and D-01 when PK signals.
- **9 close-the-loop UPDATEs still pending** (carry-over 7 + v2.38's `b3609bc4` + `713dc407`). Combine in next batch closure.
- **Closure budget remains well above floor** (~25h trailing-14-day). M5 added ~1.5h; rate continues high but justified by directly attributable production-defect closure.

---

## Changelog

- v1.0–2.32: per previous changelog.
- v2.33–2.37: per previous changelog.
- **v2.38 (2026-05-05 Sydney late afternoon session-end, M5 applied corrected cascade fix):**
  - **M5 (`p_shadow` / `is_shadow` removal) APPLIED.** Migration `m5_remove_p_shadow_corrected_v2` ~05:25 UTC. 7-step atomic transaction: DROP VIEW → CREATE VIEW (new shape) → refactor `m.check_evergreen_threshold` → refactor `m.fill_pending_slots(p_max_slots integer DEFAULT 5)` → DROP old 2-arg fn signature → cron.alter_job(75) → DROP COLUMN is_shadow on `m.post_draft` and `m.ai_job` (cascade-drops 2 indexes).
  - **First apply attempt FAILED** at A1 with `42P16: cannot drop columns from view`. Atomic rollback; production state unchanged. P3 dependency miss surfaced: `m.check_evergreen_threshold` reads `live_*`/`shadow_*` columns and is called by `m.fill_pending_slots`. PK directed re-fire with corrected packet adding cascade fix.
  - **D-01 fires this session: 2 (both proceed first-fire, no pushback).** First fire `b3609bc4-...` (original packet). Second fire `713dc407-...` (corrected packet adding cascade fix). Notable counter-pattern after recent `sql_destructive` escalation streak.
  - **7/7 post-apply verification PASS.** V1 (fn signature), V2 (view columns clean), V3 (post_draft.is_shadow gone), V4 (ai_job.is_shadow gone), V5 (both indexes cascade-dropped), V6 (cron 75 has no p_shadow), V7 (`m.check_evergreen_threshold` returns `alert` + `ratio_used` for CFW with sensible values).
  - **M4 invariants intact post-M5:** S27 drift=0; aligned v4 queue=3 (no regression). Pending-fill slots = 0 at apply time.
  - **NEW S28 standing check** added: M5 forward verification.
  - **M6 Phase A promoted** to Active P1 (recommended next). Brief reuses v2.36 incident document.
  - **160 records lost is_shadow=true marker** — carry-forward note. Acceptable; flag was inert.
  - **NEW T-MCP-13 lesson candidate**: pre-flight P3 must trace transitive view→fn→fn dependencies, not just touch-points. Reinforces Lesson #61.
  - **NEW lesson candidate**: clean-proceed counter-pattern on `sql_destructive` when PK pre-approves + non-destructive client-side + empirically grounded + rollback explicit.
  - **T-MCP-02 quota**: 31 → 33 (2 fires this session: M5 original + corrected, both clean proceed).
  - **Closure budget**: +~1.5h M5. Day total ~6h. Trailing-14d ~25h. Above 8.0 floor.
  - **Net P0+P1 open**: 4 → 4. M5 closed; M6 Phase A promoted Active.
- v2.37 (2026-05-05 Sydney early afternoon): per previous changelog.
- v2.36 (2026-05-05 Sydney early morning): per previous changelog.
