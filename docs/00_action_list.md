# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-18 Sydney evening (**v2.78 — FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS LOCKED.** Planning-only session. Zero production mutations. Two committed planning documents: `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`, 28.8KB, includes ASCII architecture visual) + `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` (commit `9c90687`, 15.6KB, post 3-LLM review). **32 decisions governing execution.** 4-layer architecture locked. **Wave 0 split to 0a/0b/0c**. **Telegram re-sequenced Wave 6→2**. cc-0015 + cc-0016 demoted from "next-up parallel" to Waves 7-8. cc-0017a (Wave 0a — foundational schema) **ready for authoring on PK explicit approval**. Empirical critical finding: friction.event grew from 6 to 22 rows via cron 85 first daily fire 2026-05-17 17:30 UTC (16 new events from one cron run); **dedupe NOT working** (22 events / 22 cases / max-events-per-case = 1) — this is exactly what cc-0017b Wave 0b fixes. **0 D-01 fires** (planning is pre-execution). **T-MCP-02 cum unchanged at 69**. **State-capture exceptions unchanged at 1**. **No new L-candidates** (1 watcher candidate L-v2.78-a logged at 1 occurrence: reviewer convergence pattern is high-signal). **3 commits this session** (planning doc + amendments + session note) plus this action_list update + sync_state update follow-ups. Dashboard PHASES **31st consecutive deferral** — still unblocked per D-IOL-001.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.77.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L65 + L-v2.76-a through L-v2.76-f carried. **D-IOL-001 (v2.77) carried.**

**v2.78 ADDITIONS:**
- **Friction Register Consolidation Plan v1 + AMENDMENTS LOCKED.** 32 decisions. Two committed docs. Wave sequencing of 10 waves (0a/0b/0c through 10) governs all subsequent friction-register work.
- **cc-0017 split to cc-0017a (Wave 0a — schema) + cc-0017b (Wave 0b — engine) + cc-0017c (Wave 0c — constraints).** Per reviewer consensus that Wave 0 was too large for single delivery.
- **Telegram wave moved from Wave 6 to Wave 2.** Avoids 5-wave operator alert black hole.
- **cc-0015 friction-pool-view re-sequenced from "next-up parallel" to Wave 7.** Pool view design needs empirical volume data from Waves 1-6 first.
- **cc-0016 friction-capture-evidence re-sequenced from "next-up parallel" to Wave 8.**
- **0 D-01 fires v2.78.** T-MCP-02 cum unchanged at 69.
- **No new L-candidates v2.78.** 1 watcher candidate L-v2.78-a at 1 occurrence.
- **Empirical finding preserved**: dedupe currently broken (22 events / 22 cases / max=1). Wave 0b fixes this.
- **3 commits this session** (planning doc `afc9306` + amendments `9c90687` + session note `15d1454`). Plus this action_list update + sync_state update as follow-ups.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (recon daily diagnostic + health_check signal diagnostic + dashboard PHASES sync) — unchanged from v2.77 | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~10h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.78 cycle: ~3h total** (estate inventory + 4 chat rounds of architectural convergence + planning doc + 3 review reads + amendments + session note + sync close). Mostly conceptual work, zero production mutations.

**State-capture exception count v2.78: 0**. Cumulative: 1 (unchanged from v2.77).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-18 Sydney evening (v2.78).
> **v2.78 note:** Friction register consolidation planning complete. cc-0017a (Wave 0a) is the immediate next deliverable on PK approval. cc-0015 + cc-0016 deferred to Waves 7-8.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **PK explicit approval of v1 + amendments** | **P1 (rank 1 v2.78 NEW)** | Sign-off line in amendments §9 is the only remaining execution gate. Until this lands, cc-0017a authoring cannot begin and the friction register consolidation stays a plan rather than a delivery. | PK reviews v1 + amendments → signs off | Read `docs/runtime/friction_register_consolidation_plan_v1.md` + `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` → approval |
| 2 | **cc-0017a Wave 0a authoring** | **P1 (rank 2 v2.78 NEW, gated on rank 1)** | Foundational schema: `friction.source` registry + `friction.emission_rule` + `friction.emission_rule_history` + `friction.notification_policy` + 8 new columns on `friction.case` (resolved_at + effort_level + triaged_at + triaged_by + first_viewed_at + resolution_kind + reopen_count + predecessor_case_id + dedupe_fingerprint). Seed 3 sources. Partial unique index. NO behavioural change. Authoring requires D-01 fire per ICE-PROC-001. ~3-4h authoring; separate session for execution. | chat → PK (after rank 1) | Draft brief modelled on cc-0014 brief shape; submit to D-01 |
| 3 | **Reconciliation daily cadence diagnostic** | **P1 (rank 3 v2.78 carry)** | First daily fire happened 2026-05-17 17:30 UTC and emitted **16 new friction events** (visible in friction.event). Diagnostic now has actual material to examine. Three questions: did `r.cadence_drift_log` write rows? did `friction.event` write rows? are they paired correctly? Single read-only SQL run. | chat → PK | Post-fire SQL: count `r.cadence_drift_log` rows since 2026-05-17 17:00 + count `friction.event` source='reconciliation' rows same window. |
| 4 | **Health_check V-C3 + signal-production diagnostic** | **P1 (rank 4 v2.78 carry)** | V-C3 still PENDING since 2026-05-15. Cowork brief reset to v3.0 `status: ready` via commit `9215de77` (2026-05-17). Awaiting next Cowork fire. | Cowork (scheduled) → chat | Check for new `docs/audit/health/YYYY-MM-DD.md` post-fire window; reconcile against friction.event. |
| 5 | **Music library activation** | **P2 (rank 5 v2.78 carry)** | Code already wired in `video-worker` v3.0.0 (deployed 8 May). ~30 min PK-led with chat guidance. | PK + chat | Create bucket `post-music`; upload 9 tracks; set env var; smoke test one video render. |

**Standing P0 (not ranked):** Personal businesses check-in. Crazy Domains refund + clean-up follow-up carry from v2.51.

**Passive observation v2.78**: Cron 82 + 83 + 84 + 85 (daily) + 86 unchanged. PRV v1 operator views queryable via `op_reader` role. **friction.* schema state v2.78**: 5 tables live (unchanged from v2.77); functions/triggers unchanged; **friction.event grew from 6 to 22 rows** via cron 85 first daily fire (this is the empirical evidence that motivates Wave 0b fix); friction.case grew from 6 to 22 (1:1 because dedupe broken). PostgREST exposed_schemas includes `friction`. **/operations route live in invegent-dashboard at HEAD `5753f41b`**. **Vercel invegent-dashboard production serving with FAB enabled** (unchanged). Next natural fires: cron 85 daily 03:30 AEST (≈17:30 UTC); cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 — STATUS BLOCK (NEW v2.78)

**Status v2.78: LOCKED AS PLANNING, AWAITING PK SIGN-OFF FOR EXECUTION GATE.**

**Documents committed:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`, 28.8KB, includes ASCII 4-layer architecture visual)
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` (commit `9c90687`, 15.6KB, post 3-LLM review)
- `docs/runtime/sessions/2026-05-18-v2.78-friction-register-consolidation-planning.md` (commit `15d1454`, ~18KB)

**32 decisions governing execution:** 25 v1 original + 7 amendments. Detailed in v1 plan §5 + amendments §2-§5.

**10 waves of execution:**

| Wave | Brief | Scope summary |
|---|---|---|
| **0a** | **cc-0017a** | **Foundational schema (NEXT-UP, AWAITS PK SIGN-OFF)**: source registry + emission_rule + history + notification_policy + 8 new case columns. Seed 3 sources. Partial unique index. NO behavioural change. |
| **0b** | cc-0017b | Unified `friction.emit_event` function. Attach-or-create trigger replacing `fn_promote_event_to_case`. Concurrency tests. Migrate 3 existing emit_* functions to thin wrappers. |
| **0c** | cc-0017c | Drop event.source CHECK; add FK to friction.source. Permission lockdown (REVOKE direct INSERT/UPDATE). Backfill resolved_at. |
| 1 | cc-0018 | Compliance reviewer fix + emission |
| **2** | cc-0023 | **Telegram → case-lifecycle trigger (MOVED EARLIER per amendment)** |
| 3 | cc-0019 | Doctor/fixer behaviour audit + selective emission |
| 4 | cc-0020 | Sentinel dual-write retrofit (14 days AND ≥50 incidents AND each check_name fired AND zero discrepancies AND PK sign-off) |
| 5 | cc-0021 | slot_alerts emitter |
| 6 | cc-0022 | Token simplification (add direct query → verify parity → retire dormant) |
| 7 | cc-0015 | **Pool view design (RE-SEQUENCED from "next-up parallel")** — after 1 week of empirical volume from waves 1-6 |
| 8 | cc-0016 | **Evidence/attachments (RE-SEQUENCED from "next-up parallel")** |
| 9 | cc-0024 | ai_diagnostic investigation: fix or retire |
| 10 | cc-0025 | m.pipeline_incident historical mode + backfill 7 open incidents |

**Critical empirical findings preserved:**
- 26 active diagnostic-adjacent crons (was 20 in initial census; ChatGPT corrected to 26)
- 11 distinct output tables — most overlap with friction register's purpose
- 444 dead items + 116 past-due + 141 fixer escalations + 10 pending compliance + 6 unacknowledged slot_alerts + 7 open m.pipeline_incident = invisible operator backlog today
- **pipeline-doctor genuinely auto-fixing** (350 fixes/week, image-worker nudge) — cannot retire casually
- **friction.event dedupe currently broken**: 22 events / 22 cases / max-events-per-case = 1.00 average. Wave 0b fixes this.

**Reviewer convergence audit trail (3 LLMs, 11 findings):** 10 incorporated; 2 acknowledged v2 scope; 0 rejected.

**Open gates:**
1. PK explicit approval of v1 + amendments → enables cc-0017a authoring
2. cc-0017a brief authored → D-01 review → migration applied → Wave 0a closed → unblocks 0b
3. After 0b applied: friction.event volume should be empirically observed for 1 week before pool view design (Wave 7)

---

## 🟢 cc-0014 friction register — STATUS BLOCK (unchanged v2.78)

**Status v2.78: CLOSED-ARCHIVED 2026-05-18** (per v2.77). No changes this session. Friction register transitions from experiment to standing operational infrastructure per **D-IOL-001**. Friction Register Consolidation Plan v1 + amendments (v2.78) is the next evolution of this work.

---

## 🟢 cc-0015 Friction Pool View — STATUS BLOCK (UPDATED v2.78 — RE-SEQUENCED to Wave 7)

**Status v2.78: AUTHORED, PENDING_EXECUTION, RE-SEQUENCED TO WAVE 7.** Brief unchanged at commit `9a5dc155`. File: `docs/briefs/cc-0015-friction-pool-view.md` (20.3 KB).

**v2.78 change: re-sequenced from "next-up parallel-eligible" to Wave 7 in the consolidation plan.** Reasoning per plan §3 amendment B: pool view design needs empirical volume data from Waves 1-6 emitter wiring before UI design. Designing UI against assumed volume risks immediate rebuild.

**Stage A schema additions remain valid** (`dashboard_ui` category split + `pool_session` table + backfill plan). **However**, Stage A schema work is now partially subsumed by Wave 0a (cc-0017a) which adds `effort_level` + `dashboard_ui` category among other case columns. cc-0015 Stage A may shrink in scope after Wave 0a lands.

**Priority: P2 (Wave 7).** No longer "next-up parallel" — sequencing change.

---

## 🟢 cc-0016 Friction Capture Evidence — STATUS BLOCK (UPDATED v2.78 — RE-SEQUENCED to Wave 8)

**Status v2.78: AUTHORED, PENDING_EXECUTION, RE-SEQUENCED TO WAVE 8.** Brief unchanged at commit `f35f8ea4`. File: `docs/briefs/cc-0016-friction-capture-evidence.md` (24.8 KB).

**v2.78 change: re-sequenced from "next-up parallel-eligible" to Wave 8 in the consolidation plan.** Same reasoning as cc-0015 — evidence/attachments UI design benefits from operator workflow patterns observed during Waves 1-6.

**Stage A storage bucket + jsonb column work remains valid as drafted.** No scope changes.

**Priority: P2 (Wave 8).**

---

## 🟢 cc-0012 PRV v1 — STATUS BLOCK (carried v2.78, condensed)

**Status v2.78:** **CLOSED-WITH-VERIFIED-VARIANCE v2.71.** Unchanged.

---

## 🟢 cc-0010B ice-evidence-materialiser — STATUS BLOCK (carried v2.78, condensed)

**Status v2.78:** **CLOSED-WITH-VERIFIED-VARIANCE v2.68.** Unchanged.

---

## 🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK (carried v2.78, condensed)

**Status v2.78:** **APPLIED + CLOSED v2.67.** Unchanged.

---

## 🟢 Process Upgrades L44–L48 + L52–L65 + L-v2.76-a-f + L-v2.78-a — STATUS BLOCK (UPDATED v2.78)

**Status v2.78:** L40 reified v2.68. L44 + L45 + L46 + L48 baseline-eligible (carry from v2.76). **L58 BASELINE v2.76** carried. **L62 baseline-eligible v2.77** carried. L60 at 7 occurrences (carry). L63 + L64 + L65 candidates carry from v2.75. L-v2.76-a through L-v2.76-f carry.

**v2.78 cycle outcomes:**
- **L41, L44, L45, L46, L48, L52-L65, L-v2.76-a-f**: not re-exercised v2.78 (planning-only session, no production mutations)
- **L62**: referenced in amendments §3 but no D-01 fired — no new exercise
- **L58**: NOT applied as atomic-push this session (3 separate commits intentionally sequenced: v1 first → 3 LLM reviews → amendments → session note → sync close). This is NOT an L58 violation — atomic push would have prevented the multi-LLM review workflow.

**NEW v2.78 watcher candidate:**
- **L-v2.78-a (1 occurrence)**: When publishing a planning doc for multi-LLM review, reviewer convergence pattern is high-signal. Reviewers who independently flag the same issue almost always indicate that issue is real and must be addressed. Single-reviewer findings should be pressure-tested before accepting. Pattern observed: 3 reviewers, 11 distinct findings, perfect convergence on 4 high-priority issues (Wave 0 split, dedupe key inconsistency, triage time metrics, time-only overlap). **Promotion at 1 more independent occurrence.**

**No other new candidates.**

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.78)

Unchanged. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

**v2.78 update:**
- **Day-19 verdict for cc-0014: RETIRED** (v2.77).
- **Mid-window check-in: RETIRED** (v2.77).
- **NEW v2.77 / observed v2.78**: First daily reconciliation cron 85 fire **happened 2026-05-17 17:30 UTC** — emitted 16 new friction events. Diagnostic now has material to examine. Soft deadline for diagnostic SQL run next session.
- **No new v2.78 calendar items.** PK approval of v1 + amendments has no fixed deadline.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.78 application**: 0 D-01 fires this session (planning is pre-execution). Cumulative T-MCP-02: **69** (unchanged from v2.77).

**L46 Evidence Gate v2.78**: not exercised — no D-01s fired.
**L62 v2.78 exercises**: 0 — no D-01s fired. Baseline-eligible status from v2.77 unchanged.
**State-capture exceptions v2.78: 0.** Cumulative: 1.
**Close-the-loop UPDATEs v2.78: 0.** **25 outstanding** (22 historical CCH-locked + 3 v2.77 new). No new this session.

**Note**: The 3 independent LLM reviewers used in this session were OUTSIDE the D-01 / ChatGPT Review MCP infrastructure — they were external review of a planning doc, not a production action gate. This is intentional: planning docs benefit from multi-reviewer perspective; production mutations benefit from the structured D-01 protocol.

---

## 🤖 Cowork automation (D182)

**v2.78 status:** Cowork brief v3.0 frozen at HEAD `bc32e86`. Cron 82 + 83 + 86 firing normally. **V-C3 still PENDING live run**. Awaiting next scheduled Cowork fire. Status unchanged from v2.77.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Friction Register Consolidation Plan v1 + amendments** | 32 decisions; 10 waves; 4-layer architecture | **P1 — LOCKED PLANNING (rank 1 v2.78)** | Two committed docs: `afc9306` + `9c90687`. Ready for PK execution gate. | PK reviews + signs off | Sign amendments §9 |
| **cc-0017a Wave 0a authoring** | Foundational schema (NEXT-UP) | **P1 (rank 2 v2.78, gated)** | Awaits PK sign-off on plan. Then chat drafts brief. D-01 fire required before migration. | chat → PK | Draft when PK directs |
| **Reconciliation daily cadence diagnostic** | First daily fire happened 2026-05-17 17:30 UTC; 16 new friction events emitted | **P1 (rank 3 v2.78 carry)** | OPEN. Material exists. Single read-only SQL session. | chat → PK | Post-fire SQL: count `r.cadence_drift_log` since 2026-05-17 17:00 + count `friction.event` source='reconciliation' same window. |
| **Health_check V-C3 + signal-production diagnostic** | Three sub-questions on Cowork pipe | **P1 (rank 4 v2.78 carry)** | OPEN. V-C3 PENDING. | Cowork → chat | Check for new `docs/audit/health/YYYY-MM-DD.md` post-fire; reconcile against friction.event |
| **Music library activation** | Code wired in video-worker v3.0.0; env-var gated | **P2 (rank 5 v2.78 carry)** | PENDING PK execution. | PK + chat | Create bucket; upload 9 tracks; set env var; smoke test |
| **cc-0015 friction-pool-view brief** | Authored PENDING_EXECUTION; **re-sequenced to Wave 7** | **P2 (Wave 7 v2.78)** | DRAFTED. Commit `9a5dc155`. Wave 7 awaits empirical volume data from Waves 1-6. | chat → PK (Wave 7) | Stage A may shrink after Wave 0a — re-scope when Wave 7 reached |
| **cc-0016 friction-capture-evidence brief** | Authored PENDING_EXECUTION; **re-sequenced to Wave 8** | **P2 (Wave 8 v2.78)** | DRAFTED. Commit `f35f8ea4`. Wave 8 awaits Wave 7. | chat → PK (Wave 8) | Stage A unchanged as drafted |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | **P2 (carry v2.78)** | OBSERVED. Unblocked per D-IOL-001. | chat → PK | Verify throttles + dry-run + re-enable |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter + upstream chain | **P2 (carry v2.78)** | LOGGED. Unblocked per D-IOL-001. | chat → PK | Audit m.post_draft + decide filter expansion or chain investigation |
| **Dashboard PHASES sync** | PHASES array stale since 3 May | **P2 (carry v2.78 — 31st consecutive deferral)** | Unblocked per D-IOL-001. | chat → PK | Update `app/(dashboard)/roadmap/page.tsx` at next dashboard session |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 (carry) | OPEN. | PK | When PK directs |
| **Close-the-loop batch sweep — 25 escalated remain** | Gated on PK directive | P2 (carry v2.78) | 22 historical + 3 v2.77 new. No new v2.78. | chat → future PK directive | Hold pending PK lift of CCH + meta resolution |
| **Brief v1.2 doc patch** | 6 defects + L60 + L63 + L64 + L65 + L-v2.76-a-f framing + L-v2.78-a | P3 (carry) | DRAFT scope expanded. Doc-only. | chat → future | Single doc patch when PK greenlights |
| **v1.1 cc-0012 minor doc patch (3 items)** | Var-A1 + Var-A2 + Var-A3 | P3 (carry) | HOLD | chat → future | Doc-only |
| **v1.6 cc-0010A doc patch (3 items)** | result_jsonb rename + trigger audit + queue_id non-FK | P3 (carry) | HOLD | chat → future | Doc-only |
| **v1.3 cc-0011 minor doc patch (5 items)** | E1 + Var-A/B/C/E | P3 (carry) | HOLD | chat → future | Doc-only |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 audit** | 3 geography rows + trigger filter | P3 (carry v2.71) | Strengthened v2.68. | chat → future | Separate cc-NNNN cleanup brief |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface | P2 — unblocked per D-IOL-001 | cc-0010A + cc-0010B delivered. | PK → chat | When PK greenlights |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future | DDL + tile |
| **Publisher latent config risk** | verify_jwt = false doc patch | P3 (carry) | OPEN | chat → future | Single-file commit |
| **M8b separate brief authoring** | Function rename | P3 (carry) | NOT YET AUTHORED | PK → chat | When PK directs |
| **94-row un-publishable legacy draft cohort** | SQL filter per cc-0007 | P3 (carry) | LOGGED | PK → chat → future | If PK directs |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 inline secret | P2 (security, OPEN) | OPEN | chat → future (PK approval) | PK authorisation |
| **morning-inbox-sweep-v1 brief amendment** | PK personal-email morning triage | P3 (carry) | DRAFT exists | PK → chat | PK reviews |
| **22 escalated m.chatgpt_review rows** | 21 historical CCH-locked + 1 T-MCP-05 meta | P3 (carry; gated) | Untouched per CCH | chat → future PK directive | Hold |
| **Memory cap hygiene** | 19/30 v2.78, unchanged | P3 (carry) | 11 free slots. | chat → future | Add as needed |
| **Parallel agent coordination (L47)** | informational | P3 (carry) | No conflicts observed. | chat → future | Passive observation |
| **Dashboard mobile responsiveness** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session | — |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → future | — |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future | — |
| **Vault `service_role_key` naming** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future | Read-only scope-check |
| **`00_overview.md` 11-section table** | Architecture review structure change | P3 | Required updates | chat → future | ~15 min |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure = Phase 2 B-09-14 | chat → Phase 2 | Bulk approve UI |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 natural OR synthetic test |
| **4× F-CRON-*-STALE** | jobids 1/29/30/31/39 | P2 | LOGGED | PK → future | Decide |
| **Emergency redeploy governance** | Expedited D-01? | P2 (PK decision) | PENDING PK | PK | PK rules |
| **`f4a0dd85` bridge health-check** | hygiene only | P3 (carry) | OBSERVED | PK → future | — |
| **Feature branch `feature/cc-0009-stage-b-ef-source`** | Audit artifact at HEAD `9796b0ee` | P3 (carry) | OBSERVED | PK → future | — |
| **3 pre-v2 forensic `r.reconciliation_run failed` rows** | cc-0010B Stage E pre-fire | P3 (carry v2.68) | PK forensic-accepted | informational | — |
| **github MCP write tools (L58 baseline)** | Per-file or atomic-push depending on coordination | informational (baseline) | Per-file applied v2.78 (intentional sequencing). | informational | — |
| **Localhost FAB cleanup** | `.env.local` still has flag enabled | P3 (carry) | OPEN — cross-surface duplicate risk | PK → future | Set value to false or delete line |
| **Close-the-loop UPDATEs for 3 v2.77 D-01 fires** | `3ff74643`, `6a90cacf`, `94bd6835` | P3 (carry from v2.77) | OPEN. Same close-the-loop class as 22 escalated. | chat → future PK directive | Include in next batch sweep |

**Closed v2.78:** No items closed (planning-only session).
**Closed v2.77:** cc-0014 operational window (archived early at Day 4); cron 85 weekly→daily promotion.
**Closed v2.76:** cc-0014 Stage E close; cc-0014 Stage D production deploy.
**Closed v2.75:** Stage D, E backend, E frontend, E promotion.
**Closed v2.71:** cc-0012 PRV v1 CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.70:** cc-0011 cadence-drift-checker CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.69:** cc-0010C reconciliation-matcher CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.68:** cc-0010B ice-evidence-materialiser CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.67:** cc-0010A v1.5 APPLIED + CLOSED.

---

## 💼 Personal businesses

**v2.78 carry (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.76 / v2.77.

---

## 📌 Backlog

**v2.78 changes:**

- **NEW v2.78**: Friction Register Consolidation Plan v1 + amendments LOCKED. 32 decisions. Two committed docs.
- **NEW v2.78**: cc-0017a + cc-0017b + cc-0017c briefs to be authored (Wave 0 split).
- **STATE CHANGE v2.78**: cc-0015 + cc-0016 re-sequenced from "next-up parallel" to Waves 7-8.
- **STATE CHANGE v2.78**: Telegram migration moved from Wave 6 to Wave 2.
- **STATE CHANGE v2.78**: Today/Next 5 rebuilt — rank 1 PK approval NEW; rank 2 cc-0017a authoring NEW (gated); rank 3 recon diagnostic carry; rank 4 health_check carry; rank 5 music carry.
- **NEW v2.78 watcher**: L-v2.78-a candidate (reviewer convergence is high-signal). 1 occurrence.
- **L-v2.78-a logged at 1 occurrence**.
- **0 D-01 fires v2.78**. T-MCP-02 cum unchanged at 69. State-capture exceptions unchanged at 1.
- **CARRIED v2.78**: Dashboard roadmap PHASES — **31st** consecutive deferral; still unblocked per D-IOL-001 for next dashboard session.

**Pre-v2.78 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged from v2.77.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a through L-v2.76-f framing carried from v2.77. **v2.78 updates:**

- **L41, L44, L45, L46, L48**: not exercised v2.78 (planning-only).
- **L52 / L53 / L55 / L57 / L58 / L59 / L60 / L63 / L64 / L65**: not re-exercised v2.78.
- **L58**: per-file applied v2.78 (intentional sequencing for multi-LLM review workflow; not an L58 violation).
- **L62 baseline-eligible v2.77**: unchanged. No D-01 fired v2.78.
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.78; promotion still pending.
- **NEW v2.78 candidate L-v2.78-a (1 occurrence)**: Reviewer convergence pattern is high-signal. Wait for 1 more independent occurrence to promote.
- **No other new L-candidates v2.78.**

**All candidates recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates** (L37–L65 + L-v2.76-a-f + L-v2.78-a, plus standing baseline).

---

## v2.78 honest limitations

- All v2.31–v2.77 limitations apply.
- **Planning was extensive, execution is zero v2.78.** 32 decisions locked across 2 committed planning documents. cc-0017a brief NOT YET AUTHORED. Risk is "we have a great plan" becomes "we don't actually ship it for weeks". Mitigation: PK approval gate is explicit and visible.
- **Multi-LLM review was 3 reviewers, not 4 or 5.** Higher review count would have surfaced more findings but returns diminish after 3 — first 3 already produced strong convergence. Going to 5+ would be over-investment.
- **No production validation of dedupe trigger fix yet.** Decision #23 + #25 specify the fix but the actual `fn_promote_event_to_case` rewrite happens in Wave 0b. Until then we're trusting the empirical pattern (22 events / 22 cases / max=1) is the actual current state — verified read-only this session.
- **Cross-source dedupe is deferred to v2.** Two emitters detecting same problem from different angles will create two cases under v1. Operationally OK because they'll be in the same /operations queue, but not deduped at the case level. Worth tracking as v2 priority.
- **Wave 0a/0b/0c is still a substantial single delivery arc.** Even split into three, cc-0017a alone has ~8 new columns on friction.case + 4 new tables. cc-0017b has the new trigger + emit_event function + concurrency tests. Each sub-wave may take 2-3 sessions.
- **The 3 LLM reviews could not validate empirical state.** Only chat-side with Supabase MCP could verify the dedupe gap; reviewers worked from the doc + reasoning. Review 3 GitHub-mode explicitly noted Supabase was unavailable on refresh.
- **L58 not applied v2.78** (3 separate commits intentionally sequenced for multi-LLM review workflow). This is the permitted alternative per L58 — atomic push is preferred but not mandatory when commits are not coordinated state changes.
- **Memory cap 19/30** — unchanged. 11 free slots.
- **Action_list size at v2.78**: ~40KB (similar to v2.77).
- **Per-session files v2.78**: 1 — `2026-05-18-v2.78-friction-register-consolidation-planning.md` (commit `15d1454`).
- **Doc-sync v2.78**: 3 separate commits (planning doc + amendments + session note) + this action_list update (commit pending) + sync_state update (commit `b480188`). Dashboard PHASES 31st consecutive deferral.
- **Close-the-loop UPDATEs v2.78**: 0. **25 eligible** (22 prior + 3 v2.77 new). No additions this session.
- **State-capture exceptions v2.78: 0**. Cumulative: 1.

---

## Changelog

- v1.0–v2.77: per commit history + sync_state archive.
- **v2.78 (2026-05-18 Sydney evening, FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS LOCKED):**
  - **Build arc**: scope agreement → 26-cron estate inventory + 11-table audit → 4-layer architecture convergence across 3 ChatGPT rounds → pressure-test 25 decisions with schema check empirical findings → write v1 planning doc with ASCII visual (commit `afc9306`) → 3 independent LLM reviews → write amendments doc (commit `9c90687`) → write session note (commit `15d1454`) → sync_state update (commit `b480188`) → this action_list update.
  - **32 decisions LOCKED**: 25 v1 original + 7 amendments. Includes 4-layer architecture, friction.event/case schema details, emission_rule registry, notification_policy table, dedupe formula lock, case closure semantics, severity override, direct-write enforcement, time+count overlap criterion, triage time metric columns.
  - **10-wave execution plan**: 0a (schema) / 0b (engine) / 0c (constraints) / 1 (compliance) / 2 (Telegram, moved earlier) / 3 (doctor-fixer) / 4 (sentinel) / 5 (slot_alerts) / 6 (token) / 7 (pool view) / 8 (evidence) / 9 (ai_diagnostic) / 10 (m.pipeline_incident historical).
  - **Critical empirical finding**: friction.event grew from 6 to 22 rows via cron 85 first daily fire 2026-05-17 17:30 UTC; **dedupe NOT working** (22/22, max=1). Wave 0b fixes this.
  - **3 LLM reviews**: 10 of 11 findings incorporated; 2 v2 scope; 0 rejected. Reviewer convergence on 4 high-priority issues (Wave 0 split, dedupe key, triage metric, time-only overlap).
  - **D-01 fires v2.78: 0** (planning is pre-execution). T-MCP-02 cum unchanged at 69. State-capture exceptions unchanged at 1.
  - **L-series outcomes**: No new L-candidates. L-v2.78-a watcher logged (reviewer convergence is high-signal, 1 occurrence). L58 not applied (intentional sequencing for multi-LLM workflow).
  - **Today/Next 5 rebuild**: rank 1 PK approval NEW; rank 2 cc-0017a authoring NEW (gated); rank 3-5 carries (recon diagnostic + health_check + music activation).
  - **Active rows updated v2.78**: Friction Register Consolidation Plan v1 + amendments NEW; cc-0017a authoring NEW gated; cc-0015 + cc-0016 re-sequenced to Waves 7-8.
  - **STATUS BLOCK v2.78 ADDED**: Friction Register Consolidation Plan v1 with full 10-wave summary + reviewer audit trail + open gates.
  - **Closure budget**: ~3h v2.78 cycle. Trailing-14-day cumulative ~10h above 8.0h floor.
  - **Doc-sync v2.78**: 3 separate commits + 2 follow-up updates. Dashboard PHASES still deferred (31st consecutive — eligible for next dashboard session).
  - **Production mutations v2.78**: 0 apply_migration; ~10 execute_sql (read-only inventory); 0 cron mutations; 3+ GitHub commits (docs + session + sync); 0 D-01 fires; 0 memory edits; 0 EF deploys; 0 vault writes.
  - **T-MCP-02 cum**: 69 (unchanged). State-capture exceptions: 1 (unchanged). L-v2.78-a watcher.
