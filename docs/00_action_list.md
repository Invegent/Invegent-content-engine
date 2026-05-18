# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-18 Sydney afternoon (**v2.79 — FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS SIGNED + cc-0017a EXECUTION GATE OPEN.** Pre-signature clarifications §5.5 locked via single-file commit `aeaddb28` (reopen window N = 14 days; triage time metric phase-based formula `triaged_at - created_at` Waves 1-6 → `triaged_at - first_viewed_at` primary + `triaged_at - created_at` secondary Wave 7+). PK signature recorded in amendments doc §9 via atomic 4-file push (this commit). **cc-0017a Wave 0a brief authoring un-gated and rank 1 next session.** **0 D-01 fires v2.79** (signature is pre-execution). **T-MCP-02 cum unchanged at 69**. **State-capture exceptions unchanged at 1**. **No new L-candidates** (L-v2.78-a watcher at 1 occurrence preserved). L58 properly exercised for the 4-file atomic push. Dashboard PHASES **32nd consecutive deferral** — still unblocked per D-IOL-001.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.78.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a carried. **D-IOL-001 (v2.77) carried.**

**v2.79 ADDITIONS:**
- **Friction Register Consolidation Plan v1 + amendments SIGNED.** PK signature recorded in amendments doc §9. Execution gate OPEN. 32 decisions remain governing execution (no new decisions v2.79 — clarifications §5.5 are within existing amendments G and C).
- **cc-0017a Wave 0a brief authoring un-gated.** Now rank 1 in Today/Next 5. ~3-4h authoring session. D-01 fire required before any migration.
- **0 D-01 fires v2.79.** T-MCP-02 cum unchanged at 69.
- **No new L-candidates v2.79.** L58 properly exercised (single-file `aeaddb28` first, then atomic 4-file push for state-coordinated sync).
- **2-commit signature gate**: `aeaddb28` (clarifications) → this commit (signature + 4-way sync).

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (recon daily diagnostic + health_check signal diagnostic + dashboard PHASES sync) — unchanged from v2.78 | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~10h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.79 cycle: ~1h total** (pre-signature concern review + ChatGPT consult relay + 2 commits including atomic 4-way sync). Mostly procedural, zero production mutations.

**State-capture exception count v2.79: 0**. Cumulative: 1 (unchanged from v2.78).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-18 Sydney afternoon (v2.79).
> **v2.79 note:** Friction register consolidation plan SIGNED. cc-0017a Wave 0a authoring is un-gated and rank 1. Recon daily diagnostic moves to rank 2 (was rank 3 v2.78). All others shift up.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0017a Wave 0a authoring** | **P1 (rank 1 v2.79 NEW)** | PK signature recorded; execution gate OPEN. Foundational schema: `friction.source` registry + `friction.emission_rule` + `friction.emission_rule_history` + `friction.notification_policy` + 9 new columns on `friction.case` (`resolved_at`, `effort_level`, `triaged_at`, `triaged_by`, `first_viewed_at`, `resolution_kind`, `reopen_count`, `predecessor_case_id`, `dedupe_fingerprint`). Seed 3 sources. Partial unique index `case_open_dedupe_uniq` on `(dedupe_fingerprint) WHERE resolved_at IS NULL`. NO behavioural change. Authoring requires D-01 fire per ICE-PROC-001. ~3-4h authoring; separate session for execution. | chat → PK | Draft brief modelled on cc-0014 brief shape (multi-stage with V-checks); submit to D-01 review when complete |
| 2 | **Reconciliation daily cadence diagnostic** | **P1 (rank 2 v2.79 carry)** | First daily fire happened 2026-05-17 17:30 UTC and emitted **16 new friction events**. Diagnostic has material. Single read-only SQL run. | chat → PK | Post-fire SQL: count `r.cadence_drift_log` rows since 2026-05-17 17:00 + count `friction.event` source='reconciliation' rows same window |
| 3 | **Health_check V-C3 + signal-production diagnostic** | **P1 (rank 3 v2.79 carry)** | V-C3 still PENDING since 2026-05-15. Cowork brief reset to v3.0 `status: ready` via commit `9215de77`. Awaiting next Cowork fire. | Cowork (scheduled) → chat | Check for new `docs/audit/health/YYYY-MM-DD.md` post-fire window; reconcile against friction.event |
| 4 | **Music library activation** | **P2 (rank 4 v2.79 carry)** | Code already wired in `video-worker` v3.0.0 (deployed 8 May). ~30 min PK-led with chat guidance. | PK + chat | Create bucket `post-music`; upload 9 tracks; set env var; smoke test one video render |
| 5 | **Standing P0: Personal businesses check-in** | **P0 (rank 5 v2.79 carry)** | Crazy Domains refund + clean-up follow-up carry from v2.51. | PK | Update at next session start |

**Passive observation v2.79**: Cron 82 + 83 + 84 + 85 (daily) + 86 unchanged. PRV v1 operator views queryable via `op_reader` role. **friction.* schema state v2.79**: 5 tables live (unchanged from v2.78); functions/triggers unchanged; friction.event = 22 rows (unchanged from v2.78 close; no new fires this session); friction.case = 22 rows (1:1 because dedupe broken — fix scoped to Wave 0b cc-0017b). PostgREST exposed_schemas includes `friction`. **/operations route live in invegent-dashboard at HEAD `5753f41b`**. **Vercel invegent-dashboard production serving with FAB enabled** (unchanged). Next natural fires: cron 85 daily 03:30 AEST (≈17:30 UTC); cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 — STATUS BLOCK (UPDATED v2.79 — SIGNED)

**Status v2.79: SIGNED 2026-05-18 Sydney afternoon. EXECUTION GATE OPEN.**

**Documents committed:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`, 28.8KB, includes ASCII 4-layer architecture visual)
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` v2 (commit `aeaddb28` for §5.5; signature recorded this commit)
- `docs/runtime/sessions/2026-05-18-v2.78-friction-register-consolidation-planning.md` (commit `15d1454`, ~18KB)
- `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` (this commit)

**32 decisions governing execution:** 25 v1 original + 7 amendments. §5.5 pre-signature clarifications (reopen N=14d; triage metric phase-based) are within Amendments G and C — no new decision count.

**PK signature:** Parveen Kumar (PK) — recorded 2026-05-18 Sydney afternoon (v2.79). Sign-off block in amendments doc §9 filled.

**10 waves of execution:**

| Wave | Brief | Scope summary | Status |
|---|---|---|---|
| **0a** | **cc-0017a** | **Foundational schema (NEXT-UP, rank 1 v2.79)**: source registry + emission_rule + history + notification_policy + 9 new case columns + dedupe_fingerprint. Seed 3 sources. Partial unique index. NO behavioural change. | **UN-GATED v2.79 — authoring next session** |
| **0b** | cc-0017b | Unified `friction.emit_event` function. Attach-or-create trigger replacing `fn_promote_event_to_case`. Concurrency tests. Migrate 3 existing emit_* functions to thin wrappers. | Sequenced behind 0a |
| **0c** | cc-0017c | Drop event.source CHECK; add FK to friction.source. Permission lockdown (REVOKE direct INSERT/UPDATE). Backfill resolved_at. | Sequenced behind 0b |
| 1 | cc-0018 | Compliance reviewer fix + emission | Sequenced |
| **2** | cc-0023 | **Telegram → case-lifecycle trigger (MOVED EARLIER per amendment §4)** | Sequenced |
| 3 | cc-0019 | Doctor/fixer behaviour audit + selective emission | Sequenced |
| 4 | cc-0020 | Sentinel dual-write retrofit (14 days AND ≥50 incidents AND each check_name fired AND zero discrepancies AND PK sign-off) | Sequenced |
| 5 | cc-0021 | slot_alerts emitter | Sequenced |
| 6 | cc-0022 | Token simplification (add direct query → verify parity → retire dormant) | Sequenced |
| 7 | cc-0015 | **Pool view design (RE-SEQUENCED from "next-up parallel")** — after 1 week of empirical volume from waves 1-6 | Sequenced |
| 8 | cc-0016 | **Evidence/attachments (RE-SEQUENCED from "next-up parallel")** | Sequenced |
| 9 | cc-0024 | ai_diagnostic investigation: fix or retire | Sequenced |
| 10 | cc-0025 | m.pipeline_incident historical mode + backfill 7 open incidents | Sequenced |

**Critical empirical findings preserved from v2.78:**
- 26 active diagnostic-adjacent crons
- 11 distinct output tables
- 444 dead items + 116 past-due + 141 fixer escalations + 10 pending compliance + 6 unacknowledged slot_alerts + 7 open m.pipeline_incident = invisible operator backlog today
- pipeline-doctor genuinely auto-fixing (350 fixes/week) — cannot retire casually
- friction.event dedupe currently broken: 22 events / 22 cases / max-events-per-case = 1.00 average. Wave 0b fixes this.

**Pre-signature clarifications (§5.5, locked 2026-05-18 evening, signed v2.79):**
1. **Reopen window N = 14 days** (single global constant; per-source override is v2 scope)
2. **Triage metric measurement strategy phase-based** (`triaged_at - created_at` Waves 1-6; `triaged_at - first_viewed_at` primary + `triaged_at - created_at` secondary Wave 7+)

**Open gates:**
1. ~~PK explicit approval of v1 + amendments~~ ✅ CLOSED v2.79
2. cc-0017a brief authored → D-01 review → migration applied → Wave 0a closed → unblocks 0b
3. After 0b applied: friction.event volume should be empirically observed for 1 week before pool view design (Wave 7)

---

## 🟢 cc-0014 friction register — STATUS BLOCK (unchanged v2.79)

**Status v2.79: CLOSED-ARCHIVED 2026-05-18** (per v2.77). No changes this session. Friction Register Consolidation Plan v1 + amendments (v2.78-v2.79) is the next evolution of this work.

---

## 🟢 cc-0015 Friction Pool View — STATUS BLOCK (unchanged v2.79)

**Status v2.79: AUTHORED, PENDING_EXECUTION, SEQUENCED AS WAVE 7.** Brief unchanged at commit `9a5dc155`. File: `docs/briefs/cc-0015-friction-pool-view.md` (20.3 KB).

Stage A schema additions remain valid but partially subsumed by Wave 0a (cc-0017a) which adds `effort_level` + `dashboard_ui` category among other case columns. cc-0015 Stage A may shrink in scope after Wave 0a lands.

**Priority: P2 (Wave 7).**

---

## 🟢 cc-0016 Friction Capture Evidence — STATUS BLOCK (unchanged v2.79)

**Status v2.79: AUTHORED, PENDING_EXECUTION, SEQUENCED AS WAVE 8.** Brief unchanged at commit `f35f8ea4`. File: `docs/briefs/cc-0016-friction-capture-evidence.md` (24.8 KB).

Stage A storage bucket + jsonb column work remains valid as drafted. No scope changes.

**Priority: P2 (Wave 8).**

---

## 🟢 cc-0012 PRV v1 — STATUS BLOCK (carried v2.79, condensed)

**Status v2.79:** **CLOSED-WITH-VERIFIED-VARIANCE v2.71.** Unchanged.

---

## 🟢 cc-0010B ice-evidence-materialiser — STATUS BLOCK (carried v2.79, condensed)

**Status v2.79:** **CLOSED-WITH-VERIFIED-VARIANCE v2.68.** Unchanged.

---

## 🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK (carried v2.79, condensed)

**Status v2.79:** **APPLIED + CLOSED v2.67.** Unchanged.

---

## 🟢 Process Upgrades L44–L48 + L52–L65 + L-v2.76-a-f + L-v2.78-a — STATUS BLOCK (carried v2.79)

**Status v2.79:** L40 reified v2.68. L44 + L45 + L46 + L48 baseline-eligible (carry from v2.76). **L58 BASELINE v2.76** carried — **properly exercised v2.79** for atomic 4-file push. **L62 baseline-eligible v2.77** carried. L60 at 7 occurrences (carry). L63 + L64 + L65 candidates carry. L-v2.76-a-f carry. L-v2.78-a watcher (reviewer convergence) at 1 occurrence carry.

**v2.79 cycle outcomes:**
- **L58**: properly applied as atomic 4-file push for state-coordinated sync (amendments signature + sync_state + action_list + per-session). Single-file commit `aeaddb28` first was appropriate as it was a unilateral doc edit PK needed to read before signing.
- **L62**: not exercised — no D-01 fired v2.79.
- **L-v2.78-a watcher**: not re-exercised v2.79 (no new external reviews this session).
- **No other L re-exercises v2.79.**

**No new L-candidates v2.79.**

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.79)

Unchanged. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

**v2.79 update:**
- **PK approval of v1 + amendments: CLOSED v2.79** (signature recorded).
- **NEW v2.79 / observed**: First daily reconciliation cron 85 fire **happened 2026-05-17 17:30 UTC** — emitted 16 new friction events. Diagnostic now has material to examine. Soft deadline for diagnostic SQL run next session (now rank 2).
- **No new v2.79 calendar items.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.79 application**: 0 D-01 fires this session (signature is pre-execution). Cumulative T-MCP-02: **69** (unchanged from v2.78).

**L46 Evidence Gate v2.79**: not exercised — no D-01s fired.
**L62 v2.79 exercises**: 0 — no D-01s fired. Baseline-eligible status from v2.77 unchanged.
**State-capture exceptions v2.79: 0.** Cumulative: 1.
**Close-the-loop UPDATEs v2.79: 0.** **25 outstanding** (22 historical CCH-locked + 3 v2.77 new). No new this session.

**Note**: The 4th ChatGPT cross-check used in this session was OUTSIDE the D-01 / ChatGPT Review MCP infrastructure — it was external review of a planning doc pre-signature, not a production action gate. Consistent with the 3 v2.78 review LLMs.

---

## 🤖 Cowork automation (D182)

**v2.79 status:** Cowork brief v3.0 frozen at HEAD `bc32e86`. Cron 82 + 83 + 86 firing normally. **V-C3 still PENDING live run**. Awaiting next scheduled Cowork fire. Status unchanged from v2.78.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Friction Register Consolidation Plan v1 + amendments** | SIGNED 2026-05-18 v2.79 | **P1 — SIGNED (gate CLOSED rank-1 from v2.78)** | Three committed docs + signature record. Execution gate OPEN. | chat → PK | Proceed to cc-0017a |
| **cc-0017a Wave 0a authoring** | Foundational schema (rank 1 v2.79) | **P1 (rank 1 v2.79 UN-GATED)** | UN-GATED v2.79. ~3-4h authoring. D-01 fire required. | chat → PK | Draft when PK directs |
| **Reconciliation daily cadence diagnostic** | First daily fire happened 2026-05-17 17:30 UTC; 16 new friction events emitted | **P1 (rank 2 v2.79 carry)** | OPEN. Material exists. Single read-only SQL session. | chat → PK | Post-fire SQL: count `r.cadence_drift_log` since 2026-05-17 17:00 + count `friction.event` source='reconciliation' same window |
| **Health_check V-C3 + signal-production diagnostic** | Three sub-questions on Cowork pipe | **P1 (rank 3 v2.79 carry)** | OPEN. V-C3 PENDING. | Cowork → chat | Check for new `docs/audit/health/YYYY-MM-DD.md` post-fire; reconcile against friction.event |
| **Music library activation** | Code wired in video-worker v3.0.0; env-var gated | **P2 (rank 4 v2.79 carry)** | PENDING PK execution. | PK + chat | Create bucket; upload 9 tracks; set env var; smoke test |
| **cc-0015 friction-pool-view brief** | Authored PENDING_EXECUTION; sequenced as Wave 7 | **P2 (Wave 7 v2.79)** | DRAFTED. Commit `9a5dc155`. Wave 7 awaits empirical volume from Waves 1-6. | chat → PK (Wave 7) | Stage A may shrink after Wave 0a |
| **cc-0016 friction-capture-evidence brief** | Authored PENDING_EXECUTION; sequenced as Wave 8 | **P2 (Wave 8 v2.79)** | DRAFTED. Commit `f35f8ea4`. Wave 8 awaits Wave 7. | chat → PK (Wave 8) | Stage A unchanged as drafted |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | **P2 (carry v2.79)** | OBSERVED. Unblocked per D-IOL-001. | chat → PK | Verify throttles + dry-run + re-enable |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter + upstream chain | **P2 (carry v2.79)** | LOGGED. Unblocked per D-IOL-001. | chat → PK | Audit m.post_draft + decide filter expansion or chain investigation |
| **Dashboard PHASES sync** | PHASES array stale since 3 May | **P2 (carry v2.79 — 32nd consecutive deferral)** | Unblocked per D-IOL-001. | chat → PK | Update `app/(dashboard)/roadmap/page.tsx` at next dashboard session |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 (carry) | OPEN. | PK | When PK directs |
| **Close-the-loop batch sweep — 25 escalated remain** | Gated on PK directive | P2 (carry v2.79) | 22 historical + 3 v2.77 new. No new v2.79. | chat → future PK directive | Hold pending PK lift of CCH + meta resolution |
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
| **Memory cap hygiene** | 19/30 v2.79, unchanged | P3 (carry) | 11 free slots. | chat → future | Add as needed |
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
| **github MCP write tools (L58 baseline)** | Per-file or atomic-push depending on coordination | informational (baseline) | Atomic 4-file push applied v2.79 (proper L58 exercise). | informational | — |
| **Localhost FAB cleanup** | `.env.local` still has flag enabled | P3 (carry) | OPEN — cross-surface duplicate risk | PK → future | Set value to false or delete line |
| **Close-the-loop UPDATEs for 3 v2.77 D-01 fires** | `3ff74643`, `6a90cacf`, `94bd6835` | P3 (carry from v2.77) | OPEN. Same close-the-loop class as 22 escalated. | chat → future PK directive | Include in next batch sweep |

**Closed v2.79:** PK approval gate on Friction Register Consolidation Plan v1 + amendments (signature recorded).
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

**v2.79 carry (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.78.

---

## 📌 Backlog

**v2.79 changes:**

- **NEW v2.79**: Friction Register Consolidation Plan v1 + amendments SIGNED. PK signature recorded in amendments §9. Execution gate OPEN.
- **STATE CHANGE v2.79**: cc-0017a Wave 0a authoring UN-GATED. Promoted to rank 1.
- **STATE CHANGE v2.79**: Today/Next 5 rebuilt — rank 1 cc-0017a authoring NEW (un-gated); ranks 2-5 shift up from v2.78 ranks 3-5 + Standing P0.
- **NEW v2.79 commits**: `aeaddb28` (pre-signature clarifications §5.5) + this commit (atomic 4-file push: signature + sync_state + action_list + session note).
- **L58 properly exercised v2.79**: single-file commit `aeaddb28` first (unilateral doc edit PK needed to read), then atomic 4-file push for state-coordinated sync.
- **0 D-01 fires v2.79**. T-MCP-02 cum unchanged at 69. State-capture exceptions unchanged at 1.
- **CARRIED v2.79**: Dashboard roadmap PHASES — **32nd** consecutive deferral; still unblocked per D-IOL-001 for next dashboard session.

**Pre-v2.79 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged from v2.78.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a through L-v2.76-f framing + L-v2.78-a carried from v2.78. **v2.79 updates:**

- **L41, L44, L45, L46, L48**: not exercised v2.79.
- **L52 / L53 / L55 / L57 / L59 / L60 / L63 / L64 / L65**: not re-exercised v2.79.
- **L58 (baseline)**: properly applied as atomic 4-file push for state-coordinated sync. Single-file commit `aeaddb28` first was correct (unilateral doc edit PK needed to read before signing). The 4-file atomic push is the correct application for state-coordinated changes.
- **L62 baseline-eligible v2.77**: unchanged. No D-01 fired v2.79.
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.79; promotion still pending.
- **L-v2.78-a watcher (1 occurrence)**: reviewer convergence pattern. Not re-exercised v2.79 (no new external multi-LLM review this session — only 4th cross-check). 1 occurrence carry.
- **No new L-candidates v2.79.**

**All candidates recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates** (L37–L65 + L-v2.76-a-f + L-v2.78-a, plus standing baseline).

---

## v2.79 honest limitations

- All v2.31–v2.78 limitations apply.
- **Signature is a procedural milestone, not a delivery.** cc-0017a brief is NOT YET AUTHORED. Risk: "we signed the plan" becomes "we don't actually ship Wave 0a for weeks". Mitigation: rank 1 in Today/Next 5 makes the next-up explicit and visible.
- **The 32-decision count is locked, but cc-0017a will surface implementation details not yet specified** (e.g., exact problem_key formulas per source, exact rollback SQL for 0a tables, parity test specifics for 0b). Brief authoring is the next material work; expect 3-4h of careful drafting.
- **No new production validation of the dedupe trigger fix.** Decision #23 + #25 + Wave 0b still describe the fix; the actual `fn_promote_event_to_case` rewrite happens in Wave 0b. Current empirical state (22 events / 22 cases / max=1) preserved as the baseline.
- **Memory cap 19/30** — unchanged. 11 free slots.
- **Action_list size at v2.79**: ~42KB (similar to v2.78).
- **Sync_state size at v2.79**: ~22KB (slightly up from v2.78 — v2.79 inline + v2.78 inline retained per G1).
- **Per-session files v2.79**: 1 — `2026-05-18-v2.79-friction-plan-signed.md` (this commit).
- **Doc-sync v2.79**: 1 pre-signature commit (`aeaddb28`, single-file) + 1 atomic 4-file push (this commit). Dashboard PHASES 32nd consecutive deferral.
- **Close-the-loop UPDATEs v2.79**: 0. **25 eligible** (22 prior + 3 v2.77 new). No additions this session.
- **State-capture exceptions v2.79: 0**. Cumulative: 1.

---

## Changelog

- v1.0–v2.78: per commit history + sync_state archive.
- **v2.79 (2026-05-18 Sydney afternoon, FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS SIGNED):**
  - **Build arc**: pre-signature concern review (chat read v1 plan + amendments full; surfaced 4 conscious-thinking items + smaller heads-ups) → PK consulted ChatGPT as 4th cross-check → ChatGPT confirmed sound; recommended N=14d tightening → PK accepted → commit `aeaddb28` (§5.5 pre-signature clarifications: reopen N=14d + triage metric phase-based) → PK signed → atomic 4-file push (this commit: amendments §9 signature + sync_state v2.79 + action_list v2.79 + new per-session file).
  - **Pre-signature clarifications LOCKED in §5.5**: (1) reopen window N = 14 days (single global constant; per-source tunable is v2 scope per §6 update); (2) triage metric measurement strategy phase-based (`triaged_at - created_at` Waves 1-6; `triaged_at - first_viewed_at` primary + `triaged_at - created_at` secondary Wave 7+). Both are within-amendment clarifications — 32-decision total stands.
  - **PK signature recorded**: amendments §9 PK approval line filled (Parveen Kumar (PK) — approved 2026-05-18 Sydney; date 2026-05-18). Execution gate OPEN.
  - **cc-0017a Wave 0a authoring UN-GATED.** Promoted to rank 1 in Today/Next 5.
  - **D-01 fires v2.79: 0** (signature is pre-execution). T-MCP-02 cum unchanged at 69. State-capture exceptions unchanged at 1.
  - **L-series outcomes**: L58 properly exercised (single-file `aeaddb28` first, then atomic 4-file push). No new L-candidates. L-v2.78-a watcher at 1 occurrence carry.
  - **Today/Next 5 rebuild**: rank 1 cc-0017a authoring NEW (un-gated); rank 2 recon diagnostic (was rank 3 v2.78); rank 3 health_check (was rank 4 v2.78); rank 4 music (was rank 5 v2.78); rank 5 Standing P0 personal businesses.
  - **Active rows updated v2.79**: Friction Register Consolidation Plan row marked SIGNED; cc-0017a authoring row UN-GATED.
  - **STATUS BLOCK v2.79 UPDATE**: Friction Register Consolidation Plan v1 status block now includes signature record, 4 committed docs, gate 1 marked CLOSED.
  - **Closure budget**: ~1h v2.79 cycle. Trailing-14-day cumulative ~10h above 8.0h floor.
  - **Doc-sync v2.79**: 1 pre-signature single-file commit + 1 atomic 4-file push. Dashboard PHASES still deferred (32nd consecutive — eligible for next dashboard session).
  - **Production mutations v2.79**: 0 apply_migration; 0 execute_sql; 0 cron mutations; 2 GitHub commits (aeaddb28 + this atomic 4-file push); 0 D-01 fires; 0 memory edits; 0 EF deploys; 0 vault writes.
  - **T-MCP-02 cum**: 69 (unchanged). State-capture exceptions: 1 (unchanged). L-v2.78-a watcher: 1 occurrence (unchanged).
