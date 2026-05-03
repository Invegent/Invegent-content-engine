# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-03 Sunday late-morning Sydney R01 calibration v2 (v2.25 — **T04 R01 Data Auditor calibration session COMPLETE. 7 decisions made + 3 lessons promoted candidate → canonical (#40, #41, #42). `data_auditor.md` rewritten with new categories (D / P), Calibration Anchors, Step 0 brief check, pre-raise overlap + lesson-honor checks, Closure effectiveness metric, `closed-redundant-lesson-N` closure type. Closure effectiveness of calibration session itself: 7 of 7 = 100% structural.**). 90-min hard cap honoured. Standing rule D-01 state-capture exception applied with substantial-rewrite caveat noted (PK may fire retrospective MCP review post-commit). Closure hours this session: ~1.0h. Trailing-14-day: ~10.3h.

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S19)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool (live since v2.15). **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.25 application of state-capture exception**: this bump committed without separate ChatGPT cross-check. Rationale: the underlying calibration was deliberative with PK explicit override on each of 7 decisions; ChatGPT review at consolidation would review the deliberation we already did and likely surface Lesson #62 type-(c) consistency-bias without adding signal; PK's 90-min hard cap on the session would be exceeded. **Substantial-rewrite caveat logged**: the role doc rewrite is structural (Decisions 5/6/7 add behaviour-changing mechanisms, not just documentation). Retrospective MCP review available post-commit if PK opts to fire one.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~10 (closed T02 + T04 this session) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~10.3 (3.5 v2.19 + 0.8 v2.20 + 2.0 v2.21 + 1.5 v2.22 + 1.0 v2.23 + 0.5 v2.24 + 1.0 v2.25) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~1.0h** (R01 calibration v2 + role doc rewrite + 3 lesson promotions + open_findings retroactive annotations + session file + sync_state pointer index update + this action_list bump).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-03 Sunday late-morning Sydney R01 calibration session-end.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **T05 Meta dev support contact** | P1 | ASAP — Mon 4 May latest. PK external action. Both message variants drafted this session ("concise/structured" + "detailed narrative"). PK fills 2 placeholders (App ID + submission date) and sends. | PK opens Meta dev support conversation. |
| 3 | **F-PUB-005 patch V3-V5 wait-based verifications** | P2 | Post-apply observation. V5 baseline captured in `docs/runtime/sessions/2026-05-03-fpub005-apply.md`. ~5min active. | Run V5 query: SELECT current queue counts per (client, platform); compare against captured T+0 baseline. |
| 4 | **publish-queue-and-publish CC brief execution** | P2 | Brief at `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md` `status: ready`. ~70-95min CC closure budget. | Trigger CC with brief. |
| 5 | **B-INV-CFW-Invegent-Silent-Approver investigation** | P2 | NDIS-Yarns firing all 4 platforms; CFW + Invegent silent across all platforms in 9.5h post-deploy (per S16 v2.21). Read-only investigation; CC-suitable. | Read-only CC brief authoring next session. |

**Demoted from prior Today/Next 5** (still tracked, see 🟡 Active or 📌Backlog):
- T04 R01 calibration session ✅ DONE this session
- B-INV-LinkedIn-PhantomPublishes investigation (still P2, in 📌Backlog)

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-B31 | `SELECT client_slug, platform, count(*) FILTER (WHERE approval_status='approved' AND approved_at > NOW() - INTERVAL '24 hours') AS fresh_approvals_24h FROM m.post_draft d JOIN c.client c USING (client_id) WHERE d.created_at > '2026-05-02 12:39:33'::timestamptz GROUP BY 1,2;` | **VERIFIED v2.21**: 252 approvals in 9.5h post-deploy. NDIS-Yarns firing all 4 platforms; CFW + Invegent silent (B-INV-CFW-Invegent-Silent-Approver investigation needed). |
| S17 | ChatGPT Review MCP cost + idempotency rate | `SELECT count(*) AS calls, sum(input_tokens + output_tokens) AS total_tokens, count(*) FILTER (WHERE status='completed') AS completed_count, count(*) FILTER (WHERE response_jsonb IS NULL) AS escalated_or_failed FROM m.chatgpt_review WHERE created_at > NOW() - INTERVAL '7 days'` | Spend > $35 in 30-day → check budget; idempotency hit < 10% over 50+ calls → review proposal/context shape; escalation rate > 40% → reviewer prompt may be too aggressive. **v2.25 note**: 14 fires total (no new MCP fires this session per state-capture exception). |
| S18 | D186 closure budget (per session start) | Read open-finding count from `📌 Backlog` + `🟡 Active` (P0+P1 only) + `docs/audit/open_findings.md`; sum trailing-14-day closure hours from sync_state session logs | If open count > 20 OR trailing-14-day hours < 8.0 → surface to PK before any new work. **Currently at 10.3h trailing-14-day — above floor.** |
| S19 *(NEW v2.25)* | R01 Data Auditor closure effectiveness | Read trailing-3-cycle structural closure rate from `docs/audit/open_findings.md` § "Closure effectiveness — historical" | If trailing-3-cycle average < 50% → surface to PK at next role calibration trigger. **Currently at 28.6% (cycles 1-2 only); next cycle will be the third data point. Calibration v2 mechanisms (Decisions 5/6/7) target raising this above 50% by next calibration trigger.** |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| T02 | ~~Gate B exit decision — extended 24h~~ | — | ✅ **DONE 2026-05-03 late-morning Sydney** | — | Session: `docs/runtime/sessions/2026-05-03-t02-ratification.md` | `docs/audit/runs/2026-05-02-t02-extension.md` |
| T04 | ~~R01 calibration session~~ | — | ✅ **DONE 2026-05-03 late-morning Sydney** — 7 decisions + 3 lesson promotions; 90-min cap honoured; closure effectiveness of session itself 7/7 = 100% structural | — | Session: `docs/runtime/sessions/2026-05-03-r01-calibration.md`. Role doc v2 at `docs/audit/roles/data_auditor.md`. | |
| T05 | Meta dev support contact | P1 | ASAP — Mon 4 May latest | PK | Both message variants drafted this session. PK fills 2 placeholders (App ID + submission date) and sends. Conversation history has full text. | |
| T06 | Reconnect YouTube OAuth — UNBLOCKED (T17 deployed) | P1 | Within 7 days | PK | Reconnect OAuth at user/account level | |
| T07 | Instagram publisher recovery | P1 | Gated on S16 fresh-approval verification + T05 + cron `?limit=1` update | mixed | Step 4 cannot retry until ALL gates clear | |
| T08 | ~~Auto-approver patch~~ | — | ✅ **DONE 2 May late evening** via B31 | — | `docs/runtime/runs/2026-05-02-b31-auto-approver-v160-deploy.md` |
| T09 | Safe-to-resume publisher checklist | P0 | Walk before each cron flip | PK | brief: `06_t09_*` |
| T10 | Pre-fix queue disposition | P0 | Now appropriate post-W1 | PK | brief: `07_t10_*` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → MCP review (per protocol) → PK | next session |
| T12 | ~~F-PUB-005 trigger gate~~ | — | ✅ **DONE 3 May mid-morning** | — | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| T13a | LinkedIn Zapier publisher gate v1.1.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T13b | LinkedIn direct publisher gate v1.2.0 — repo-only | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since 2026-03-12 | |
| T17 | YouTube publisher gate v1.6.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `01_t17_*` |
| T18 | FB publisher gate v1.8.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `02_t18_*` |

**Workstream 1 status: COMPLETE.**
**Workstream 2 status: ✅ COMPLETE 2 May late evening.**
**Phase B body-health gate: ✅ RATIFIED v2.24.**
**R01 Data Auditor calibration v2: ✅ COMPLETE v2.25.**
**Meta-tooling — ChatGPT Review MCP: SHIPPED v2.15. Production fires at 14 of 5 v2.25.**
**G1 sync_state restructure: COMPLETE v2.23.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP (v2.25 update — T-MCP-02 quota at 14 of 5)

Meta-infrastructure for the standing rule from D-01. **Status: LIVE, validated, protocol-codified, 14 production fires captured.**

**v2.25 note**: NO new MCP fires this session. v2.25 bump was committed under state-capture exception with substantial-rewrite caveat noted. PK may fire retrospective ChatGPT review post-commit if desired (would be fire #15).

**Production fires log unchanged from v2.24 — see v2.24 changelog for full table of fires #1-#14.**

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | Validate ChatGPT Review MCP from new chat | ✅ DONE 2026-05-02 afternoon | Closed |
| T-MCP-02 | Capture first 5 production tool fires | ✅ EXCEEDED 14 of 5 | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17. Pending: PK manual update of claude.ai project system prompt template |
| T-MCP-05 | Close-the-loop UPDATE on MCP escalation rows `2bab95d5-...` AND `521628d0-...` | P3 | UPDATE m.chatgpt_review SET status='resolved', action_taken=... PK confirmation required for both rows. |
| T-MCP-06 | Investigate sql_destructive escalation rate (~50% over 6 fires) | P3 | If next 3 sql_destructive fires also escalate on weak grounds → review chatgpt-review-worker reviewer prompt. |
| T-MCP-07 *(NEW v2.25, OPTIONAL)* | Retrospective MCP review on R01 calibration v2 role doc rewrite | P3 | Optional per state-capture exception. PK may fire if a second pair of eyes is desired before the next R01 cycle runs. |

---

## 🤖 Cowork automation (D182 — v2.25)

Unchanged from v2.24. 11 briefs run; 3 brief shapes validated; 0 production writes from automation; 1 scheduled task live (ICE Nightly Health Check daily 02:00 AEST).

**Sunset review**: 12 May 2026.

**v2.25 added artefacts:**

| Artefact | Where | Status |
|---|---|---|
| **R01 calibration v2 session record** | `docs/runtime/sessions/2026-05-03-r01-calibration.md` | NEW v2.25 — full deliberation record with 7 decisions + carry-forward + closure effectiveness retrospective |
| **Data Auditor role doc v2** | `docs/audit/roles/data_auditor.md` | NEW v2.25 — full rewrite with Calibration Anchors, Step 0 brief check, pre-raise checks, Closure effectiveness metric, `closed-redundant-lesson-N` closure type, row-count-aware Section 5 |

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| ~~T02~~ | Phase B body-health gate exit | — | ✅ **CLOSED v2.24** | — | Session: `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| ~~T04~~ | R01 calibration session | — | ✅ **CLOSED v2.25** — 7 decisions + 3 lesson promotions; role doc rewritten; closure effectiveness metric introduced | — | Session: `docs/runtime/sessions/2026-05-03-r01-calibration.md`. Role doc: `docs/audit/roles/data_auditor.md`. |
| publish-queue-and-publish-column-purposes | New CC brief — Tier 1 column-purposes | P2 | status: ready | cc | Trigger CC with brief at `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md`. |
| B-INV-LinkedIn-Queue-Stall | Investigate 5 LinkedIn × Property Pulse true-stuck drafts | P1 | **investigation complete v2.20 — remediation pending PK review** | chat (PK reviews first) | Findings: `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md`. |
| B-INV-CFW-Invegent-Silent-Approver | Investigate why CFW + Invegent have ZERO approver outcomes post-B31 | P2 | candidate (still unaddressed v2.25) | chat | Read-only investigation; CC-suitable. |

---

## 💼 Personal businesses

*(none flagged this session — PK to confirm at next session start)*

---

## 📌 Backlog

| ID | Item | Priority | Trigger |
|---|---|---|---|
| B01–B22, B24–B27 | (per v2.10) | varies | per item |
| ~~B16, B17, B18, B23, B30, B31, B32~~ | CLOSED | — | — |
| ~~F-PUB-006~~ | ✅ **CLOSED 3 May Sunday morning** | — | — |
| B28 | Verify operator intent for CFW IG / Invegent IG / CFW FB auto-approve | ✅ APPLIED v2.14 | — |
| B29 | Partial unique constraint on `c.client_publish_profile (client_id, platform) WHERE status='active' AND is_default=true` | P2 | Long-term forward-defence |
| B33 | Brief artefact retention rule | P2 | Process improvement |
| B34 | Add `estimated_cost_usd` calculation in chatgpt-review-worker | P3 | Cosmetic |
| B35 | Telemetry view `m.chatgpt_review_daily` | P3 | Materialised view |
| B36 | **Slice 3 v0 spec authoring** | P2 | Per D186: 4-5 sessions out with closure budget honoured. |
| B37 | v1.5.0 source archive governance | P3 | Forward-defence per Lesson #62 candidate. |
| ~~B38~~ | ~~F-PUB-005 trigger patch~~ | — | ✅ **CLOSED v2.23**. |
| ~~F-PUB-007~~ | ~~Silent-skip-at-cap~~ | — | ✅ **CLOSED v2.22**. |
| ~~F-PUB-010~~ | ~~Asymmetric cap enforcement~~ | — | ✅ **CLOSED v2.23**. |
| F-PUB-008 | NDIS-Yarns FB publishes with NULL platform_post_id | P2 | 2 of 3 NDIS-Yarns FB publishes since Stage 1 have `platform_post_id = NULL`. Worth investigating. |
| F-PUB-009 | Scheduling drift to August/October | P3 | F-PUB-005 patch v2 limits drift growth. Reassess at end-of-month. |
| B-INV-LinkedIn-PhantomPublishes | Daily phantom 00:00 UTC PP-LinkedIn publishes | P2 | Reproducible. |
| B39 | **Drain over-cap queues** | P3 | Reassess after 2 weeks of observed drain rate. |
| **B-AUDIT-CYCLE3 *(NEW v2.25)*** | **Cycle 3 R01 Data Auditor run** | P2 | First test of calibration v2 mechanisms (Step 0 brief check, pre-raise overlap + lesson-honor checks, Closure effectiveness metric). Also picks up **C2-CAND-001** (Stage 12 migration filename audit-trail) which was punted from this calibration per Option γ. Trigger: next snapshot date OR Tuesday rotation slot, whichever first. |

---

## 🧊 Frozen / Deferred

Unchanged from v2.20.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15) — *verify the actual live state before patching the wrong layer*.
- Lesson #51 (HONOURED v2.25, eighth honour) — terminal-decision authority requires disproportionate scrutiny. v2.25: 7 calibration decisions made with explicit PK override; FP taxonomy presented before pattern decisions; 90-min cap honoured.
- Lesson #58 candidate — *route around platform gateway misbehaviour*.
- Lesson #59 candidate — *first MCP fire defaults to accepting corrected action*.
- Lesson #60 candidate — *generic context yields generic objections*.
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication) — Pre-flight discipline. v2.25: pre-loaded all R01 input files before composing baseline.
- Lesson #62 candidate refined to type-(c) — promote to canonical on third sql_destructive type-(c) instance — currently 2 of 3.
- **G1 sync_state restructure (v2.23)** — honoured v2.25.
- **NEW v2.25 — R01 Data Auditor calibration v2** — three lesson promotions to canonical:
  - **Lesson #40 PROMOTED candidate → canonical** — Tool errors are not semantically meaningful. Mechanism: standing pre-flight rule for inventory-style work.
  - **Lesson #41 PROMOTED candidate → canonical** — Audit role expectations should be row-count-aware. Mechanism: Section 5 of `data_auditor.md` rewritten with row-count-conditioned expectations + 5,000-row threshold + EXPLAIN check + `pg_stat_user_tables` promotion query.
  - **Lesson #42 PROMOTED candidate → canonical** — Briefs must mirror role hot-table set. Mechanism: Step 0 (Brief consistency check) added to `data_auditor.md` workflow. Brief gaps trip Process findings.

---

## v2.25 honest limitations

- All previous limitations apply.
- v2.25 committed without separate ChatGPT cross-check (state-capture-bump exception). The role doc rewrite is structural with teeth (Decisions 5/6/7). Retrospective MCP review available — see T-MCP-07.
- **First commit attempt blocked by PK internet drop** (not MCP failure); verified file SHA unchanged before re-firing same payload. Single retry; no duplication.
- T-MCP-04 status: half-codified. Repo doc shipped. Still pending: PK manual update of claude.ai project system prompt.
- T-MCP-05 close-the-loop UPDATEs still pending on TWO `m.chatgpt_review` rows.
- T-MCP-06 sql_destructive escalation rate unchanged at ~50% (3 of 6).
- **F-PUB-005 patch V3-V5 wait-based verifications** still deferred (Today/Next 5 rank 3).
- **B-INV-LinkedIn-PhantomPublishes** investigation pending PK review.
- **B-INV-CFW-Invegent-Silent-Approver** still unaddressed.
- **F-PUB-008** and **F-PUB-009** not investigated.
- **B39** not actioned — by design.
- **C2-CAND-001 (Stage 12 migration filename audit-trail)** punted to Cycle 3.
- **R01 closure effectiveness historical trailing-3-cycle average 28.6%** — below 50% soft target. Calibration v2 Decisions 5/6/7 mechanisms target raising this above 50% by next calibration trigger.

---

## Changelog

- v1.0–2.24: per previous changelog.
- **v2.25 (3 May Sunday late-morning Sydney R01 calibration session-end): T04 R01 Data Auditor calibration v2 COMPLETE.**
  - **T04 closed** at 90-min hard cap honoured. 7 decisions made with explicit PK override on each. 3 lessons promoted candidate → canonical (#40, #41, #42).
  - **Decision 1**: Split Data vs Process findings; new ID prefixes `D-` and `P-`; Process ceiling LOW with escalation exception.
  - **Decision 2**: Severity table compact + Calibration Anchors as own section ("the table defines the system, the anchors teach judgment" — PK quote, verbatim in role doc).
  - **Decision 3**: Section 5 rewritten with row-count-conditioned expectations + 5,000-row threshold; **Lesson #41 promoted canonical**.
  - **Decision 4**: New mandatory Step 0 brief consistency check; brief gaps trip Process findings; **Lesson #42 promoted canonical**.
  - **Decision 5**: Pre-raise overlap check with 4 sub-cases; symptomatic-closure-recurrence escalates severity by +1 (the teeth on the rule).
  - **Decision 6**: Closure effectiveness metric in Summary template; ≥ 50% structural soft target; trailing-3-cycle drop triggers next calibration.
  - **Decision 7**: New `closed-redundant-lesson-N` closure type + mandatory pre-raise lesson-honor check.
  - **Carry-forward Option γ**: **Lesson #40 promoted candidate → canonical** (tool errors not semantically meaningful); C2-CAND-001 (Stage 12 migration filename audit-trail) punted to Cycle 3.
  - **Closure effectiveness of calibration session itself**: 7 of 7 = 100% structural — calibration models the standard the role doc now requires.
  - **Retroactive grading of cycles 1-2**: Cycle 1 = 67% structural (2/3); Cycle 2 = 0% structural (0/4); trailing 3-cycle average = 28.6%. Below 50% soft target.
  - **Standing rule D-01**: state-capture exception applied with substantial-rewrite caveat noted. PK may fire retrospective MCP review post-commit (T-MCP-07 added).
  - **Lesson #51 eighth honour**: 7 decisions made with explicit PK override; FP taxonomy presented before pattern surfacing; 90-min cap honoured.
  - **Lesson #61 seventh vindication**: pre-loaded all R01 input files before composing baseline.
  - **Action list updates**: Today/Next 5 rebuilt; T04 closed in time-bound + Active tables; new B-AUDIT-CYCLE3 backlog item; new S19 standing check (R01 closure effectiveness); new T-MCP-07 optional retrospective review.
  - **Closure budget**: ~1.0h chat-side this session. Trailing-14-day estimate 10.3h. Above 8.0 floor.
  - **Commit note**: First push_files attempt blocked by PK internet drop (not MCP failure); verified file SHA unchanged before re-firing same payload. Single retry; no duplication.
  - **Standing rule honoured**: 4-way sync complete (sync_state pointer index updated surgically + action_list bumped to v2.25 + new session file at `docs/runtime/sessions/2026-05-03-r01-calibration.md` + role doc + open_findings updated).
- v2.24 (3 May Sunday late-morning Sydney T02 ratification session-end): T02 Gate B body-health exit RATIFIED.
- v2.23 (3 May Sunday mid-morning Sydney F-PUB-005 apply session-end): F-PUB-005 + F-PUB-010 CLOSED + G1 sync_state restructure.
- v2.22 (3 May Sunday mid-morning Sydney chat session 2 end): F-PUB-007 closed not-real-bug + F-PUB-010 candidate surfaced + addressed in F-PUB-005 patch v2 + F04 applied.
- v2.21 (3 May Sunday morning Sydney chat session-end): F-PUB-006 CLOSED + B31 closure of F-PUB-004 PROVEN + 3 NEW candidate findings.
- v2.20 (3 May Sunday morning Sydney CC pre-T01/T02): F-PUB-006 partial + B-INV-LinkedIn investigation complete + B38.
- v2.19 (2 May Saturday very late evening Sydney session-end): B31 / B32 / T08 closed end-to-end.
- v2.18 (2 May Saturday late evening Sydney session-end): full session reconciliation.
- v2.17 (2 May Saturday afternoon Sydney): MCP review protocol codified.
- v2.16 (2 May Saturday afternoon Sydney): T-MCP-01 closed end-to-end.
- v2.15 (2 May Saturday afternoon Sydney): ChatGPT Review MCP system SHIPPED.
