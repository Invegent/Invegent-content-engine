# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-18 Sydney evening (**v2.79 — FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS SIGNED.** Pre-signature chat review surfaced 2 residual ambiguities. PK obtained 4th cross-check (ChatGPT). 2 clarifications locked into amendments §5.5: (1) reopen window N = 14 days; (2) triage time metric by phase (`triaged_at - created_at` Waves 1-6; `triaged_at - first_viewed_at` primary + `created_at` secondary Wave 7+). Pre-signature commit `aeaddb28` updated amendments doc. PK signed: "Approved and recorded in addendum doc as well". **cc-0017a Wave 0a authoring execution gate now OPEN.** Today/Next 5 rebuilt: cc-0017a authoring → rank 1 (was v2.78 rank 2 gated). **0 D-01 fires** (signature is pre-execution). **T-MCP-02 cum unchanged at 69**. **State-capture exceptions unchanged at 1**. **L-v2.78-a watcher candidate now at 2 occurrences** — eligible for baseline promotion next session. 4-way atomic sync this commit (amendments §9 signed + sync_state v2.79 + this file + new session file). Dashboard PHASES **32nd consecutive deferral**.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.78.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a (watcher → promotion-eligible v2.79) carried. **D-IOL-001 (v2.77) carried.**

**v2.79 ADDITIONS:**
- **Friction Register Consolidation Plan v1 + amendments + §5.5 SIGNED 2026-05-18 Sydney evening.** PK approval recorded in §9 of amendments doc. Execution gate for cc-0017a now OPEN.
- **§5.5 NEW (in amendments doc)** locks 2 within-amendment clarifications: (1) reopen window N = 14 days; (2) triage time metric measurement strategy phase-based.
- **Today/Next 5 rebuilt.** cc-0017a authoring promoted to rank 1 (was rank 2 gated on PK approval per v2.78). PK approval row removed as resolved.
- **L-v2.78-a watcher candidate now at 2 occurrences** post-v2.79 (chat pre-signature concerns + ChatGPT 4th cross-check convergence). Eligible for baseline promotion at next session's lesson cycle.
- **0 D-01 fires v2.79.** T-MCP-02 cum unchanged at 69.
- **No new L-candidates v2.79.**
- **4 commits via 4-way atomic push_files this session close** (amendments §9 + sync_state + this file + session file). Pre-signature commit `aeaddb28` was the 2nd commit this session.
- **Dashboard PHASES sync: 32nd consecutive deferral.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (recon daily diagnostic + health_check signal diagnostic + dashboard PHASES sync) — unchanged from v2.78 | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~10h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.79 cycle: ~1.5h total** (pre-signature review + ChatGPT consultation + clarifications commit + signature + 4-way sync). Lean session, no production mutations.

**State-capture exception count v2.79: 0**. Cumulative: 1 (unchanged from v2.77).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-18 Sydney evening (v2.79).
> **v2.79 note:** PK approval gate CLOSED. cc-0017a Wave 0a authoring is now UNGATED and is the immediate next deliverable. Rank 5 unranked because the next-natural-rank-5 candidate (close-the-loop batch sweep) is gated on PK directive.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0017a Wave 0a authoring** | **P1 (rank 1 v2.79 — UNGATED, promoted from v2.78 rank 2)** | Friction plan SIGNED; execution gate OPEN. Foundational schema: source registry + emission_rule + history + notification_policy + 9 new case columns (resolved_at + effort_level + triaged_at + triaged_by + first_viewed_at + resolution_kind + reopen_count + predecessor_case_id + dedupe_fingerprint). Seed 3 sources. Partial unique index. NO behavioural change. Reopen window N = 14 days (lives in Wave 0b emit_event body, not 0a schema). ~3-4h authoring session; separate session for D-01 + execution. | chat → PK | Draft brief modelled on cc-0014 brief shape; submit to D-01 |
| 2 | **Reconciliation daily cadence diagnostic** | **P1 (rank 2 v2.79 — promoted from v2.78 rank 3)** | First daily fire happened 2026-05-17 17:30 UTC and emitted **16 new friction events** (visible in friction.event). Diagnostic now has actual material. Three questions: did `r.cadence_drift_log` write rows? did `friction.event` write rows? are they paired correctly? Single read-only SQL run. | chat → PK | Post-fire SQL: count `r.cadence_drift_log` rows since 2026-05-17 17:00 + count `friction.event source='reconciliation'` rows same window. |
| 3 | **Health_check V-C3 + signal-production diagnostic** | **P1 (rank 3 v2.79 — promoted from v2.78 rank 4)** | V-C3 still PENDING since 2026-05-15. Cowork brief reset to v3.0 `status: ready` via commit `9215de77`. Awaiting next Cowork fire. | Cowork (scheduled) → chat | Check for new `docs/audit/health/YYYY-MM-DD.md` post-fire window; reconcile against friction.event. |
| 4 | **Music library activation** | **P2 (rank 4 v2.79 — promoted from v2.78 rank 5)** | Code already wired in `video-worker` v3.0.0. ~30 min PK-led with chat guidance. | PK + chat | Create bucket `post-music`; upload 9 tracks; set env var; smoke test one video render. |
| — | (rank 5 unranked) | — | Next-natural candidate (close-the-loop batch sweep) is gated on PK directive; pre-emptive ranking creates pressure where the gate is the actual blocker. Leave unranked until PK directs. | — | — |

**Standing P0 (not ranked):** Personal businesses check-in. Crazy Domains refund + clean-up follow-up carry from v2.51.

**Passive observation v2.79**: Cron 82 + 83 + 84 + 85 (daily) + 86 unchanged. PRV v1 operator views queryable via `op_reader` role. **friction.* schema state v2.79**: 5 tables live (unchanged from v2.78); functions/triggers unchanged; friction.event = 22 rows (unchanged from v2.78); friction.case = 22 rows; dedupe broken (max events/case = 1) — Wave 0b will fix. PostgREST exposed_schemas includes `friction`. /operations route live in invegent-dashboard at HEAD `5753f41b`. Vercel invegent-dashboard production serving with FAB enabled. Next natural fires: cron 85 daily 03:30 AEST (≈17:30 UTC); cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (UPDATED v2.79 — SIGNED)

**Status v2.79: ✅ SIGNED 2026-05-18 Sydney evening. EXECUTION GATE OPEN.**

**Documents committed:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`, 28.8 KB, includes ASCII 4-layer architecture visual) — unchanged v2.79
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` (now SIGNED with §5.5 + §9 PK approval; latest commit this 4-way sync) — updated v2.79
- `docs/runtime/sessions/2026-05-18-v2.78-friction-register-consolidation-planning.md` (commit `15d1454`, ~18KB) — v2.78
- `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` (this commit) — v2.79
- Pre-signature clarifications commit: `aeaddb28` (v2.79 mid-session)

**32 decisions governing execution + 2 within-amendment clarifications:** 25 v1 + 7 amendments (A-G) + §5.5 Clarification 1 (reopen N = 14 days) + §5.5 Clarification 2 (triage metric phase-based). Detailed in v1 plan §5 + amendments §2-§5 + §5.5.

**10 waves of execution:**

| Wave | Brief | Scope summary |
|---|---|---|
| **0a** | **cc-0017a** | **Foundational schema (NEXT-UP, EXECUTION GATE OPEN v2.79)**: source registry + emission_rule + history + notification_policy + 9 new case columns (resolved_at + effort_level + triaged_at + triaged_by + first_viewed_at + resolution_kind + reopen_count + predecessor_case_id + dedupe_fingerprint). Seed 3 sources. Partial unique index. NO behavioural change. |
| **0b** | cc-0017b | Unified `friction.emit_event` function (reopen window N = 14 days locked here). Attach-or-create trigger replacing `fn_promote_event_to_case`. Concurrency tests. Migrate 3 existing emit_* functions to thin wrappers. |
| **0c** | cc-0017c | Drop event.source CHECK; add FK to friction.source. Permission lockdown (REVOKE direct INSERT/UPDATE). Backfill resolved_at. |
| 1 | cc-0018 | Compliance reviewer fix + emission |
| **2** | cc-0023 | **Telegram → case-lifecycle trigger (MOVED EARLIER per amendment)** |
| 3 | cc-0019 | Doctor/fixer behaviour audit + selective emission |
| 4 | cc-0020 | Sentinel dual-write retrofit (14 days AND ≥50 incidents AND each check_name fired AND zero discrepancies AND PK sign-off) |
| 5 | cc-0021 | slot_alerts emitter |
| 6 | cc-0022 | Token simplification (add direct query → verify parity → retire dormant) |
| 7 | cc-0015 | **Pool view design (RE-SEQUENCED)** — after 1 week of empirical volume from waves 1-6 |
| 8 | cc-0016 | **Evidence/attachments (RE-SEQUENCED)** |
| 9 | cc-0024 | ai_diagnostic investigation: fix or retire |
| 10 | cc-0025 | m.pipeline_incident historical mode + backfill 7 open incidents |

**Open gates v2.79:**
1. ✅ PK explicit approval of v1 + amendments → **CLOSED 2026-05-18 Sydney evening**
2. ⏳ cc-0017a brief authored → D-01 review → migration applied → Wave 0a closed → unblocks 0b
3. ⏳ After 0b applied: friction.event volume should be empirically observed for 1 week before pool view design (Wave 7)

**Reviewer convergence audit trail (3 LLMs v1 + 4th pre-signature cross-check):** 10 of 11 v1 reviewer findings incorporated; 2 acknowledged v2 scope; 0 rejected. 4th cross-check converged on 2 residual ambiguities → §5.5 clarifications locked.

**Critical empirical findings preserved unchanged from v2.78:**
- 26 active diagnostic-adjacent crons
- 11 distinct output tables — most overlap with friction register's purpose
- 444 dead items + 116 past-due + 141 fixer escalations + 10 pending compliance + 6 unacknowledged slot_alerts + 7 open m.pipeline_incident = invisible operator backlog today
- **pipeline-doctor genuinely auto-fixing** (350 fixes/week, image-worker nudge) — cannot retire casually
- **friction.event dedupe currently broken**: 22 events / 22 cases / max-events-per-case = 1.00 average. Wave 0b fixes this with reopen-within-14-days logic (per §5.5 Clarification 1).

---

## 🟢 cc-0014 friction register — STATUS BLOCK (unchanged v2.79)

**Status v2.79: CLOSED-ARCHIVED 2026-05-18** (per v2.77). No changes this session. Friction register transitions from experiment to standing operational infrastructure per **D-IOL-001**. Friction Register Consolidation Plan v1 + amendments + §5.5 SIGNED v2.79 is the next evolution of this work.

---

## 🟢 cc-0015 Friction Pool View — STATUS BLOCK (unchanged v2.79 — Wave 7)

**Status v2.79: AUTHORED, PENDING_EXECUTION, SEQUENCED TO WAVE 7.** Brief unchanged at commit `9a5dc155`. File: `docs/briefs/cc-0015-friction-pool-view.md` (20.3 KB).

Stage A schema work is partially subsumed by Wave 0a (cc-0017a) which adds `effort_level` + `dashboard_ui` category among other case columns. cc-0015 Stage A scope shrinks after Wave 0a lands. Re-scope when Wave 7 reached.

**Priority: P2 (Wave 7).**

---

## 🟢 cc-0016 Friction Capture Evidence — STATUS BLOCK (unchanged v2.79 — Wave 8)

**Status v2.79: AUTHORED, PENDING_EXECUTION, SEQUENCED TO WAVE 8.** Brief unchanged at commit `f35f8ea4`. File: `docs/briefs/cc-0016-friction-capture-evidence.md` (24.8 KB).

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

## 🟢 Process Upgrades L44–L48 + L52–L65 + L-v2.76-a-f + L-v2.78-a — STATUS BLOCK (UPDATED v2.79)

**Status v2.79:** L40 reified v2.68. L44 + L45 + L46 + L48 baseline-eligible (carry from v2.76). **L58 BASELINE v2.76** carried. **L62 baseline-eligible v2.77** carried. L60 at 7 occurrences (carry). L63 + L64 + L65 candidates carry from v2.75. L-v2.76-a through L-v2.76-f carry.

**v2.79 cycle outcomes:**
- **L41, L44, L45, L46, L48, L52-L65, L-v2.76-a-f**: not re-exercised v2.79 (planning/signature is pre-execution)
- **L62**: not re-exercised (no D-01 fires v2.79)
- **L58**: 4-way atomic push_files applied this session close — L58 baseline applied correctly
- **L-v2.78-a watcher candidate** now at **2 occurrences** post-v2.79. **ELIGIBLE FOR BASELINE PROMOTION at next session's lesson cycle.** Baseline candidate text: *When publishing a planning doc for multi-reviewer cross-check, reviewer convergence is high-signal. Reviewers who independently flag the same issue almost always indicate that issue is real and must be addressed. Single-reviewer findings should be pressure-tested before accepting.*

**No other new candidates v2.79.**

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.79)

Unchanged. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

**v2.79 update:**
- **PK approval deadline: RESOLVED 2026-05-18 Sydney evening.**
- **Reconciliation daily diagnostic soft deadline carries** — next cron 85 fire ≈2026-05-19 03:30 AEST; material now exists from 2026-05-17 daily fire.
- **No new v2.79 calendar items.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.79 application**: 0 D-01 fires this session (signature is pre-execution). Cumulative T-MCP-02: **69** (unchanged from v2.78).

**L46 Evidence Gate v2.79**: not exercised — no D-01s fired.
**L62 v2.79 exercises**: 0 — no D-01s fired. Baseline-eligible status from v2.77 unchanged.
**State-capture exceptions v2.79: 0.** Cumulative: 1.
**Close-the-loop UPDATEs v2.79: 0.** **25 outstanding** (22 historical CCH-locked + 3 v2.77 new). No new this session.

**Note**: The 4th ChatGPT cross-check used in pre-signature review was OUTSIDE the D-01 / ChatGPT Review MCP infrastructure — consistent with how the 3 v1 reviewers operated. Planning docs benefit from ad-hoc multi-reviewer perspective; production mutations use the structured D-01 protocol.

---

## 🤖 Cowork automation (D182)

**v2.79 status:** Cowork brief v3.0 frozen at HEAD `bc32e86`. Cron 82 + 83 + 86 firing normally. **V-C3 still PENDING live run**. Awaiting next scheduled Cowork fire. Status unchanged from v2.78.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0017a Wave 0a authoring** | Foundational schema (UNGATED) | **P1 — rank 1 v2.79 (was rank 2 gated v2.78)** | EXECUTION GATE OPEN. Awaits chat brief drafting. D-01 fire required before migration. | chat → PK | Draft brief modelled on cc-0014 brief shape |
| **Reconciliation daily cadence diagnostic** | First daily fire happened 2026-05-17 17:30 UTC; 16 new friction events emitted | **P1 (rank 2 v2.79 promoted from rank 3)** | OPEN. Material exists. Single read-only SQL session. | chat → PK | Post-fire SQL count comparison |
| **Health_check V-C3 + signal-production diagnostic** | Three sub-questions on Cowork pipe | **P1 (rank 3 v2.79 promoted from rank 4)** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md` |
| **Music library activation** | Code wired in video-worker v3.0.0; env-var gated | **P2 (rank 4 v2.79 promoted from rank 5)** | PENDING PK execution. | PK + chat | Create bucket; upload 9 tracks; set env var; smoke test |
| **cc-0015 friction-pool-view brief** | Authored PENDING_EXECUTION; Wave 7 | **P2 (Wave 7 v2.79)** | DRAFTED. Commit `9a5dc155`. Wave 7 awaits empirical volume from Waves 1-6. | chat → PK (Wave 7) | Stage A may shrink after Wave 0a — re-scope when Wave 7 reached |
| **cc-0016 friction-capture-evidence brief** | Authored PENDING_EXECUTION; Wave 8 | **P2 (Wave 8 v2.79)** | DRAFTED. Commit `f35f8ea4`. Wave 8 awaits Wave 7. | chat → PK (Wave 8) | Stage A unchanged as drafted |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | **P2 (carry v2.79)** | OBSERVED. Unblocked per D-IOL-001. | chat → PK | Verify throttles + dry-run + re-enable |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter + upstream chain | **P2 (carry v2.79)** | LOGGED. Unblocked per D-IOL-001. | chat → PK | Audit m.post_draft + decide filter expansion or chain investigation |
| **Dashboard PHASES sync** | PHASES array stale since 3 May | **P2 (carry v2.79 — 32nd consecutive deferral)** | Unblocked per D-IOL-001. | chat → PK | Update `app/(dashboard)/roadmap/page.tsx` at next dashboard session |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 (carry) | OPEN. | PK | When PK directs |
| **Close-the-loop batch sweep — 25 escalated remain** | Gated on PK directive | P2 (carry v2.79) | 22 historical + 3 v2.77 new. No new v2.79. | chat → future PK directive | Hold pending PK lift of CCH + meta resolution |
| **L-v2.78-a baseline promotion** | Reviewer convergence is high-signal | **P3 (carry v2.79 — eligible at next lesson cycle)** | 2 occurrences reached this session. | chat → next session | Promote to baseline at appropriate cycle |
| **Brief v1.2 doc patch** | 6 defects + L60 + L63 + L64 + L65 + L-v2.76-a-f framing + L-v2.78-a if promoted | P3 (carry) | DRAFT scope expanded v2.79 (add L-v2.78-a if promoted). Doc-only. | chat → future | Single doc patch when PK greenlights |
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
| **github MCP write tools (L58 baseline)** | Per-file or atomic-push depending on coordination | informational (baseline) | Atomic push_files applied v2.79 (this 4-way sync close). | informational | — |
| **Localhost FAB cleanup** | `.env.local` still has flag enabled | P3 (carry) | OPEN — cross-surface duplicate risk | PK → future | Set value to false or delete line |
| **Close-the-loop UPDATEs for 3 v2.77 D-01 fires** | `3ff74643`, `6a90cacf`, `94bd6835` | P3 (carry from v2.77) | OPEN. Same close-the-loop class as 22 escalated. | chat → future PK directive | Include in next batch sweep |

**Closed v2.79:** PK approval gate for Friction Register Consolidation Plan (was v2.78 rank 1) → CLOSED. Amendment G reopen window TBD → LOCKED 14 days (§5.5 Clarification 1). Amendment C triage metric basis ambiguity → LOCKED phase-based (§5.5 Clarification 2).
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

*(Standing P0 to ask at next session start. None raised v2.79.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.76 / v2.77 / v2.78.

---

## 📌 Backlog

**v2.79 changes:**

- **STATE CHANGE v2.79**: Friction Register Consolidation Plan v1 + amendments + §5.5 SIGNED 2026-05-18 Sydney evening. cc-0017a Wave 0a execution gate OPEN.
- **STATE CHANGE v2.79**: Today/Next 5 rebuilt — rank 1 = cc-0017a authoring (was rank 2 gated v2.78). Ranks 2-4 promoted from v2.78 ranks 3-5. Rank 5 unranked.
- **STATE CHANGE v2.79**: L-v2.78-a watcher candidate now at 2 occurrences — eligible for baseline promotion at next session's lesson cycle.
- **0 D-01 fires v2.79**. T-MCP-02 cum unchanged at 69. State-capture exceptions unchanged at 1.
- **No new L-candidates v2.79.**
- **4-way atomic push_files this session close** (amendments §9 signed + sync_state + this file + new session file). L58 baseline applied correctly. Pre-signature commit `aeaddb28` was 2nd commit this session.
- **CARRIED v2.79**: Dashboard roadmap PHASES — **32nd** consecutive deferral; still unblocked per D-IOL-001 for next dashboard session.

**Pre-v2.79 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged from v2.78.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a framing carried from v2.78. **v2.79 updates:**

- **L41, L44, L45, L46, L48**: not exercised v2.79 (planning/signature pre-execution).
- **L52 / L53 / L55 / L57 / L58 / L59 / L60 / L63 / L64 / L65**: not re-exercised v2.79.
- **L58**: 4-way atomic push_files applied this session close (correct baseline application).
- **L62 baseline-eligible v2.77**: unchanged. No D-01 fired v2.79.
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.79; promotion still pending.
- **L-v2.78-a watcher candidate now at 2 occurrences** post-v2.79. **ELIGIBLE FOR BASELINE PROMOTION at next session's lesson cycle.** Baseline candidate text: *When publishing a planning doc for multi-reviewer cross-check, reviewer convergence is high-signal. Reviewers who independently flag the same issue almost always indicate that issue is real and must be addressed. Single-reviewer findings should be pressure-tested before accepting.*
- **No other new L-candidates v2.79.**

**All candidates recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates** (L37–L65 + L-v2.76-a-f + L-v2.78-a, plus standing baseline).

---

## v2.79 honest limitations

- All v2.31–v2.78 limitations apply.
- **Signature is text-only in §9 of amendments doc**; no cryptographic provenance. PK identity confirmed by conversation context. This is acceptable for a planning doc; production mutations have stronger guardrails (D-01, V-checks, audit trails in `m.chatgpt_review`).
- **No production validation of locked decisions yet.** v1 + amendments + §5.5 locks architecture; Wave 0a execution (cc-0017a brief authoring + D-01 + migration) is the next concrete delivery. Risk: "we have a great plan and a signature" becomes "we don't actually ship it for weeks". Mitigation: cc-0017a authoring is now P1 rank 1 with no further gates.
- **ChatGPT 4th cross-check was conducted outside D-01 / ChatGPT Review MCP infrastructure.** Intentional — D-01 reserved for production mutations. Multi-LLM review of planning docs uses ad-hoc reviewer perspective.
- **L-v2.78-a baseline promotion eligible but not yet promoted.** Next session's lesson cycle is the right time. Delaying promotion to a fresh session ensures the lesson is fully crystallised before going to baseline.
- **Wave 0a/0b/0c is still substantial.** Even split into three, cc-0017a alone has 9 new columns on friction.case + 4 new tables. cc-0017b has the new trigger + emit_event function + concurrency tests. Each sub-wave may take 2-3 sessions.
- **Memory cap 19/30** — unchanged. 11 free slots.
- **Action_list size at v2.79**: ~37KB (was 32KB v2.78; ~5KB net growth from v2.79 STATUS BLOCK + Today/Next 5 rebuild + changelog).
- **Per-session files v2.79**: 1 — `2026-05-18-v2.79-friction-plan-signed.md` (this commit).
- **Doc-sync v2.79**: 2 commits this session — `aeaddb28` (pre-signature clarifications, single file) + this 4-way atomic push_files (amendments §9 + sync_state + this file + new session file). Dashboard PHASES 32nd consecutive deferral.
- **Close-the-loop UPDATEs v2.79**: 0. **25 eligible** (22 prior + 3 v2.77 new). No additions this session.
- **State-capture exceptions v2.79: 0**. Cumulative: 1.

---

## Changelog

- v1.0–v2.78: per commit history + sync_state archive.
- **v2.79 (2026-05-18 Sydney evening, FRICTION REGISTER CONSOLIDATION PLAN v1 + AMENDMENTS SIGNED):**
  - **Build arc**: session open + state load → PK requests pre-signature review → chat surfaces 4 conscious-thought items + 5 heads-ups → PK consults ChatGPT (4th cross-check) → 2 clarifications recommended (reopen N = 14 days; triage metric phase-based) → pre-signature commit `aeaddb28` adds §5.5 to amendments doc → PK signs ("Approved and recorded in addendum doc as well") → 4-way atomic push_files (this commit).
  - **§5.5 LOCKED in amendments doc**: 2 within-amendment clarifications (no new architectural decision; 32-decision total stands). Clarification 1: reopen window N = 14 days (resolves Amendment G "TBD propose 7 days"). Clarification 2: triage metric measurement strategy phase-based (Waves 1-6 `triaged_at - created_at`; Wave 7+ `triaged_at - first_viewed_at` primary + `created_at` secondary).
  - **PK signature recorded** in amendments §9: "Parveen Kumar (PK) — Approved and recorded in addendum doc as well". Date: 2026-05-18 Sydney evening.
  - **cc-0017a Wave 0a authoring execution gate OPEN.** Today/Next 5 rebuilt with cc-0017a authoring as rank 1 (was rank 2 gated v2.78).
  - **D-01 fires v2.79: 0** (signature pre-execution). T-MCP-02 cum unchanged at 69. State-capture exceptions unchanged at 1.
  - **L-series outcomes**: No new L-candidates. L-v2.78-a watcher candidate now at 2 occurrences post-v2.79 — eligible for baseline promotion at next session's lesson cycle. L58 baseline correctly applied (4-way atomic push_files this commit).
  - **Active rows updated v2.79**: cc-0017a authoring promoted to rank 1 ungated; recon diag rank 2; health_check rank 3; music activation rank 4; PK approval row removed as resolved; L-v2.78-a baseline promotion added as P3 carry.
  - **STATUS BLOCK v2.79 updated**: Friction Register Consolidation Plan SIGNED 2026-05-18; gate 1 closed; gates 2-3 pending.
  - **Closure budget**: ~1.5h v2.79 cycle. Trailing-14-day cumulative ~10h above 8.0h floor.
  - **Doc-sync v2.79**: 2 commits (`aeaddb28` pre-signature + this 4-way atomic). Dashboard PHASES 32nd consecutive deferral.
  - **Production mutations v2.79**: 0 apply_migration; 0 execute_sql writes; 0 cron mutations; 0 EF deploys; 0 vault writes; 0 memory edits.
  - **T-MCP-02 cum**: 69 (unchanged). State-capture exceptions: 1 (unchanged). L-v2.78-a watcher → promotion-eligible.
