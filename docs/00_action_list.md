# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-03 Sunday late-afternoon Sydney F-AAP-001 close-out (v2.27 — **F-PUB-005 V3-V5 PASS confirmed; B-INV-CFW-Invegent-Silent-Approver resolved; new finding F-AAP-001 P1 logged with confirmed root cause; ChatGPT correction validated; stance retire criterion #1 fired but stance NOT retired pending PK explicit signal**). Closure budget: +0.9h this session, trailing-14-day 10.3 → 11.2h.

---

## 🧭 Operational stance — PK trust-rebuild (active 2026-05-03 → revisit when patches verified holding)

**Recorded 2026-05-03 mid-morning at PK explicit instruction. Retire criterion #1 FIRED v2.27 (V3-V5 PASS); stance NOT retired — PK accepted close only, did not signal retirement.**

Recent fires on the publishing layer (F-PUB-004 through F-PUB-010 closures, IG subcode 2207051 block, phantom 00:00 UTC LinkedIn publishes, 5 over-cap (client, platform) combos draining slowly) accumulated faster than verification cycles. PK signalled need to rebuild trust in the system before opening new external action.

**Operational order of priorities while this stance is active:**

1. **Validate patches held** — F-PUB-005 V3-V5 wait-based verifications ✅ DONE v2.27 (PASS), idle-state observation, drain pattern on over-cap queues
2. **Investigate observable anomalies** — B-INV-CFW-Invegent-Silent-Approver ✅ RESOLVED v2.27 (premise superseded; F-AAP-001 logged P1), B-INV-LinkedIn-PhantomPublishes (read-only, still pending)
3. **Author/execute closure briefs** — publish-queue-and-publish CC brief (deferred), F-AAP-001 fix brief (next session)
4. **External action only after 1+2+3 produce stable state** — T05 Meta dev support contact, T11 YouTube failed-draft replay plan

**Stance retire criteria (any one):**

- ~~F-PUB-005 V3-V5 verifications run + result is "patches held"~~ ✅ **FIRED v2.27** (single query, PASS verdict, ~13h post-apply)
- 7 days of clean nightly-health-check observations post-2026-05-03
- PK explicit signal that trust is restored

**v2.27 status: criterion #1 FIRED but stance NOT retired**. PK accepted close-out (a) and accepted ChatGPT correction (b → source inspection); did not give explicit retirement signal. Chat continues to honour stance: T05 stays P1-deferred, not surfaced as urgent at session start. PK to retire or keep at next session start; chat will propose retirement under S20.

**Honour this stance**: chat does NOT surface T05 (or other external actions) as urgent at session-start until PK explicitly retires. T05 stays P1-deferred — not P1-urgent.

This stance does NOT prevent: read-only investigations, low-risk closures, observation queries, role calibration work, internal documentation, or any action that strengthens system understanding without external commitment.

**Removal of this stance**: chat removes this section in the next action_list bump after retirement is explicitly confirmed by PK in chat.

---

## How this file works

**At session start**, chat reads this file and:
1. **Reads the Operational stance section above** — applies the stance to all priority decisions in this session
2. Rebuilds the Today / Next 5 view honouring the stance
3. Runs Standing checks (S1–S20)
4. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
5. Asks PK about Personal businesses
6. Surfaces Time-bound items due today/tomorrow — but **P1-deferred items per stance are not surfaced as urgent**

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.27 application**: ONE MCP review fired (review_id `1e5ab2eb-...`, `plan_review` action_type, ESCALATED). PK accepted correction → source inspection performed → finding upgraded from inferred to confirmed. Second fire skipped under state-capture exception (same accepted close-out plan, evidence strengthened not weakened, lower risk than original).

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~10 (closed B-INV-CFW-Invegent-Silent-Approver; added F-AAP-001 P1) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~11.2h (10.3h prior + 0.9h v2.27) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This bump's closure hours: ~0.9h** (V3-V5 verifications + B-INV investigation + 2 EF source reads + diagnostic SQL chain + commit drafting). Above 0.25h granularity threshold; increments trailing-14-day.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-03 Sunday late-afternoon Sydney F-AAP-001 session-end.
> **Honours Operational stance above** — T05 stays P1-deferred (criterion #1 fired but PK did not explicitly retire); F-AAP-001 fix brief promoted as next-session work.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **Operational stance retire decision** | P1 | Criterion #1 fired v2.27 (V3-V5 PASS, patches held ~13h). Chat to propose retirement at next session start under S20. If PK retires, T05 returns to P1-urgent. If PK keeps stance, F-AAP-001 fix brief takes rank 2. | PK explicit signal at next session start: "retire stance" or "keep stance." |
| 3 | **F-AAP-001 fix brief — Path 1 SQL fetcher rewrite** | P1 | F-AAP-001 logged v2.27 with confirmed root cause. Path 1 (loosen SQL fetcher) recommended over Path 2 (populate digest_item_id at slot-fill). Brief drafting + acceptance criteria + migration name. CC-suitable for migration drafting; chat applies via Supabase MCP per D170. **Honours stance** — closes a finding without external action. | Author brief in `docs/briefs/2026-05-03-or-later-faap001-fix.md`. Triggers MCP review on `sql_destructive` before apply. |
| 4 | **publish-queue-and-publish CC brief execution** | P2 | Brief at `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md` `status: ready`. ~70-95min CC closure budget. Two 0%-documented tables central to F-PUB-006 + F-PUB-005 work area. Documentation-only outcome; honours stance. Demoted from rank 4 of v2.26 (still queued). | Trigger CC with brief. CC pre-flights + drafts migration; chat applies via Supabase MCP per D170. |
| 5 | **T05 Meta dev support contact** | P1-deferred | **Per Operational stance** — PK pushed to next week for trust-rebuild. Both message variants drafted in 2026-05-03 conversation history. PK fills 2 placeholders (App ID + submission date) and sends when stance is retired. Do NOT surface as urgent at session start. **Note**: criterion #1 fired v2.27; if PK retires stance at next session, T05 returns to P1-urgent. | When stance retired: PK opens Meta dev support conversation using one of the two drafted variants. |

**Demoted from prior Today/Next 5** (still tracked):
- F-PUB-005 V3-V5 wait-based verifications ✅ DONE v2.27 (PASS)
- B-INV-CFW-Invegent-Silent-Approver investigation ✅ RESOLVED v2.27 (premise superseded; F-AAP-001 P1 logged)
- B-INV-LinkedIn-PhantomPublishes investigation (still P2, in 📌 Backlog)

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-B31 | `SELECT client_slug, platform, count(*) FILTER (WHERE approval_status='approved' AND approved_at > NOW() - INTERVAL '24 hours') AS fresh_approvals_24h FROM m.post_draft d JOIN c.client c USING (client_id) WHERE d.created_at > '2026-05-02 12:39:33'::timestamptz GROUP BY 1,2;` | **REFRAMED v2.27**: silence is system-wide post-2026-05-02 19:00 UTC; **F-AAP-001 root cause documented** (slot-driven v4 vs SQL fetcher contract break). S16 retired pending F-AAP-001 fix; will be re-instated post-fix as auto-approver health metric. |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.27 note**: 15 fires total (1 new this session, escalated, accepted by PK). Pattern: `plan_review` action_type with inferred hypotheses + one-tool-call-away upstream confirmation = high-value escalation. T-MCP-06 sql_destructive hypothesis does NOT apply to this fire — different action_type. |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at 11.2h trailing-14-day — well above 8.0 floor.** |
| S19 | R01 Data Auditor closure effectiveness | Read trailing-3-cycle structural closure rate from `docs/audit/open_findings.md` § "Closure effectiveness — historical" | **Currently at 28.6% (cycles 1-2 only); next cycle will be the third data point.** |
| S20 | **Operational stance retire criteria** | Check Operational stance section at top of this file. Has any retire criterion fired? (V3-V5 verifications run with PASS verdict / 7 days clean nightly-health-check / PK explicit signal) | **v2.27**: criterion #1 FIRED. Stance NOT retired (PK accepted close only). Chat to propose retirement at next session start. If retired, T05 returns to P1-urgent. |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| T02 | ~~Gate B exit decision — extended 24h~~ | — | ✅ **DONE 2026-05-03 late-morning Sydney** | — | Session: `docs/runtime/sessions/2026-05-03-t02-ratification.md` | `docs/audit/runs/2026-05-02-t02-extension.md` |
| T04 | ~~R01 calibration session~~ | — | ✅ **DONE 2026-05-03 late-morning Sydney** | — | Session: `docs/runtime/sessions/2026-05-03-r01-calibration.md`. Role doc v2 at `docs/audit/roles/data_auditor.md`. | |
| **T05** | **Meta dev support contact** | **P1-deferred (was P1)** | **DEFERRED to next week per Operational stance (recorded 2026-05-03 session-end). v2.27 note: stance criterion #1 fired but stance NOT retired; T05 stays deferred until PK explicit retirement signal.** | PK | Both message variants drafted in 2026-05-03 conversation history. PK fills 2 placeholders (App ID + submission date) and sends when stance retired. Do NOT surface as urgent at session start. | |
| T06 | Reconnect YouTube OAuth — UNBLOCKED | P1 | Within 7 days | PK | Reconnect OAuth at user/account level | |
| T07 | Instagram publisher recovery | P1 | Gated on S16 + T05 + cron `?limit=1` update; **v2.27 update**: F-AAP-001 fix may also be a precondition since auto-approver feeds publisher pipeline | mixed | Step 4 cannot retry until ALL gates clear | |
| T08 | ~~Auto-approver patch~~ | — | ✅ **DONE 2 May late evening** via B31 | — | `docs/runtime/runs/2026-05-02-b31-auto-approver-v160-deploy.md` |
| T09 | Safe-to-resume publisher checklist | P0 | Walk before each cron flip | PK | brief: `06_t09_*` |
| T10 | Pre-fix queue disposition | P0 | Now appropriate post-W1 | PK | brief: `07_t10_*` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → MCP review → PK | next session |
| T12 | ~~F-PUB-005 trigger gate~~ | — | ✅ **DONE 3 May mid-morning** | — | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| T13a | LinkedIn Zapier publisher gate v1.1.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T13b | LinkedIn direct publisher gate v1.2.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since 2026-03-12 | |
| T17 | YouTube publisher gate v1.6.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `01_t17_*` |
| T18 | FB publisher gate v1.8.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `02_t18_*` |

**Workstream 1 status: COMPLETE.**
**Workstream 2 status: ✅ COMPLETE 2 May late evening.**
**Phase B body-health gate: ✅ RATIFIED v2.24.**
**R01 Data Auditor calibration v2: ✅ COMPLETE v2.25.**
**Meta-tooling — ChatGPT Review MCP: SHIPPED v2.15. Production fires at 15 of 5 v2.27.**
**G1 sync_state restructure: COMPLETE v2.23.**
**Operational stance — PK trust-rebuild: ACTIVE v2.27 (criterion #1 fired but stance not retired pending PK explicit signal).**
**F-PUB-005 V3-V5 verification: ✅ COMPLETE v2.27 (PASS).**
**B-INV-CFW-Invegent-Silent-Approver: ✅ RESOLVED v2.27 (premise superseded by F-AAP-001).**

---

## 🛠 Meta-tooling — ChatGPT Review MCP (v2.27 update — T-MCP-02 quota at 15 of 5)

One new fire this session: review_id `1e5ab2eb-d29b-4fa6-8e0c-262780f31e0d`, action_type=`plan_review`, ESCALATED, PK accepted correction (do EF source inspection), correction validated by source-read evidence. New pattern signal captured: `plan_review` action_type with inferred hypotheses + one-tool-call-away upstream confirmation = high-value escalation pattern. Distinct from T-MCP-06's sql_destructive hypothesis.

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | ✅ DONE | Closed | — |
| T-MCP-02 | ✅ EXCEEDED 15 of 5 | — | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17. Pending PK manual update. |
| T-MCP-05 | Close-the-loop UPDATE on `2bab95d5-...` AND `521628d0-...` AND **NEW v2.27: `1e5ab2eb-...`** | P3 | PK confirmation required. |
| T-MCP-06 | Investigate sql_destructive escalation rate (~50%) | P3 | If next 3 sql_destructive fires also escalate weak. **v2.27 note**: this session's escalation was `plan_review`, not sql_destructive — does not advance T-MCP-06 hypothesis. |
| T-MCP-07 | Retrospective MCP review on R01 calibration v2 | P3 | Optional. PK fires if desired. |
| **T-MCP-08 (NEW v2.27)** | **Lesson candidate**: "On `plan_review` actions where the plan logs a finding with inferred hypotheses, MCP escalation is high-value when a plausible upstream confirmation is one tool-call away — the source inspection often upgrades the finding from hypothesis to confirmed mechanism, or refutes it cleanly." | P3 | After 2-3 more such instances, promote to canonical lesson. |

---

## 🤖 Cowork automation (D182 — v2.27)

Unchanged from v2.25/v2.26. 11 briefs run; 3 brief shapes validated; 0 production writes from automation; 1 scheduled task live.

**Sunset review**: 12 May 2026.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| ~~T02~~ | Phase B body-health gate exit | — | ✅ **CLOSED v2.24** | — | Session: `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| ~~T04~~ | R01 calibration session | — | ✅ **CLOSED v2.25** | — | Session: `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| ~~F-PUB-005-V3-V5~~ | F-PUB-005 V3-V5 wait-based verifications | — | ✅ **CLOSED v2.27 (PASS)** | — | Session: `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| ~~B-INV-CFW-Invegent-Silent-Approver~~ | Investigate why CFW + Invegent silent post-B31 | — | ✅ **RESOLVED v2.27** (premise superseded by F-AAP-001) | — | F-AAP-001 supersedes; see Backlog. |
| **F-AAP-001 (NEW v2.27)** | Auto-approver SQL fetcher schema/contract break with slot-driven v4 architecture | **P1** | logged with confirmed root cause | chat | Author Path 1 fix brief next session. See Backlog details below. |
| publish-queue-and-publish-column-purposes | New CC brief | P2 | status: ready | cc | Trigger CC with brief. Demoted to rank 4 of Today/Next 5 v2.27. |
| B-INV-LinkedIn-Queue-Stall | Investigate 5 LinkedIn × Property Pulse true-stuck drafts | P1 | investigation complete v2.20 — remediation pending PK review | chat | Findings: `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md`. |

---

## 💼 Personal businesses

*(none flagged this session — PK to confirm at next session start)*

---

## 📌 Backlog

**NEW v2.27 — F-AAP-001 (P1):** Auto-approver SQL fetch function `m.auto_approver_fetch_drafts` requires INNER JOIN on `m.digest_item` + `m.digest_run`, incompatible with slot-driven v4 drafts (`slot_fill_synthesis_v1` job type, ai-worker v2.10.0+) that have `pd.digest_item_id = NULL`. 131 of 135 post-25-April drafts unreachable; 0 of 122 current `needs_review` drafts pass current SQL fetch. Auto-approver silent on entire v4 architecture since 2026-05-02 19:00 UTC (legacy digest-flow backlog exhausted then). Detailed analysis: `docs/runtime/sessions/2026-05-03-faap001-rootcause.md`.

**Fix paths:**
- **Path 1 (preferred)**: rewrite SQL fetcher to LEFT JOIN `m.digest_item`/`m.digest_run`; read `client_id` from `pd.client_id` instead of `dr.client_id`; preserve LATERAL on `c.client_publish_profile`. Removes a stale dependency the v4 architecture is intentionally trying to drop.
- **Path 2**: populate `digest_item_id` at slot-fill time (more surface area; couples v4 to dropped v3 dependency).

**Out of scope of fix brief**: per-platform `auto_approve_enabled` config audit (CFW × FB/IG, Invegent × IG are `false`); audit of other SQL functions/triggers/views authored against legacy digest-flow that may need v4 updates (F-AAP-001 may have peers).

**Other backlog (unchanged from v2.25):**

- **B-AUDIT-CYCLE3** — Cycle 3 R01 Data Auditor run (first test of calibration v2 mechanisms; picks up C2-CAND-001 punted from this calibration)
- **F-PUB-008** — NDIS-Yarns FB publishes with NULL platform_post_id (P2, not investigated)
- **F-PUB-009** — Scheduling drift to August/October (P3, bounded by F-PUB-005 patch v2)
- **B-INV-LinkedIn-PhantomPublishes** — Daily phantom 00:00 UTC PP-LinkedIn publishes (P2, reproducible)
- **B39** — Drain over-cap queues (P3, by design)
- **B-AUDIT-V4-PEERS (NEW v2.27 candidate)** — Audit pass on other SQL functions/triggers/views authored against legacy digest-flow that may need v4 updates. F-AAP-001 may have peers. Read-only investigation; CC-suitable. Trigger when bandwidth allows.

---

## 🧊 Frozen / Deferred

Unchanged from v2.20.

---

## 🎓 Canonical Lessons

Unchanged from v2.25/v2.26.

- Lesson #46 (PROMOTED, third vindication v2.15)
- Lesson #51 (HONOURED v2.25, eighth honour; HONOURED v2.27 ninth honour — pre-flight discipline applied to investigation SQL chain)
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication)
- Lesson #62 candidate refined to type-(c). **v2.27 NOTE**: type-(c) does NOT apply to this session's MCP escalation — the escalation produced genuinely new knowledge, distinct from "consistency-bias restatement of caveats".
- G1 sync_state restructure (v2.23) — honoured v2.25/v2.27
- Lessons #40, #41, #42 promoted candidate → canonical (R01 calibration v2 v2.25)
- **Lesson candidate (NEW v2.27, T-MCP-08)**: "On `plan_review` actions where the plan logs a finding with inferred hypotheses, MCP escalation is high-value when a plausible upstream confirmation is one tool-call away — the source inspection often upgrades the finding from hypothesis to confirmed mechanism, or refutes it cleanly." Promote after 2-3 more instances.

---

## v2.27 honest limitations

- All v2.25/v2.26 limitations apply.
- **F-AAP-001 root cause confirmed via source inspection but fix not yet designed.** The Path 1 SQL fetcher rewrite is conceptually clean but the migration drafting and acceptance criteria are next-session work. Risk of fix surface area expanding (e.g., discovering peers via B-AUDIT-V4-PEERS) is acknowledged.
- **Operational stance criterion #1 fired but stance not retired**. Chat respects PK's literal instruction (close session, no retirement signal). Next session, S20 will propose retirement; PK has the call. If criterion #1 alone is insufficient for PK trust-restoration, the other criteria (7 days clean / explicit signal) remain available.
- **Single MCP fire this session despite F-AAP-001 evidence upgrade**. Second MCP fire was skipped under state-capture exception (same accepted close-out plan, evidence strengthened not weakened). If retrospective review is desired, T-MCP-07-style retrospective on this session's commit is available.
- T-MCP-04 status: half-codified.
- T-MCP-05 close-the-loop UPDATEs still pending; v2.27 adds review_id `1e5ab2eb-...` to the queue.
- T-MCP-06 sql_destructive escalation rate unchanged at ~50%; v2.27's escalation was `plan_review`, doesn't advance the hypothesis.

---

## Changelog

- v1.0–2.26: per previous changelog.
- **v2.27 (3 May Sunday late-afternoon Sydney F-AAP-001 close-out): F-PUB-005 V3-V5 PASS + B-INV-CFW-Invegent-Silent-Approver resolved + F-AAP-001 P1 logged with confirmed root cause + ChatGPT correction validated.**
  - **Step 1 — F-PUB-005 V3-V5 wait-based verifications PASS**. Single combined SQL query against post-apply T+0 baseline at `2026-05-03 02:29:48 UTC`. Zero growth on any over-cap (client, platform) combo over ~13h post-apply. Two below-cap combos drained by 1 each (publisher functional). V3 backpressure as designed (NDIS-Yarns × FB shows 19 approved-not-enqueued, cap signal). V4 zero new zombies. V5 PASS.
  - **Step 2 — B-INV-CFW-Invegent-Silent-Approver investigation REFRAMED + RESOLVED**. Funnel SQL revealed silence is system-wide post-2026-05-02 19:00 UTC, not CFW/Invegent-specific. Newest `approved` draft `created_at` = 2026-04-25 07:00 UTC. Newest `needs_review` = 2026-05-03 07:00 UTC. Auto-approver silent on entire population.
  - **MCP review fire**: review_id `1e5ab2eb-d29b-4fa6-8e0c-262780f31e0d`, action_type=`plan_review` for proposed close-out with inferred F-AAP-001 hypotheses. **ESCALATED** with corrected_action: "Conduct a follow-up inspection on the auto-approver v1.6.0 source code before committing the changes to confirm the validity of F-AAP-001 hypothesis." PK accepted correction.
  - **Source inspection** (the ChatGPT-prompted step): `auto-approver` v53/v1.6.0 SQL fetch function source captured (INNER JOIN through `m.digest_item` + `m.digest_run`, `client_id` read from `dr.client_id`); `ai-worker` v94/v2.11.0 source captured (`slot_fill_synthesis_v1` introduced v2.10.0, builds in-memory digest_item-shaped seed for LLM only, never inserts `m.digest_item` row, never touches `pd.digest_item_id`).
  - **JOIN-chain diagnostic**: 109 of 122 `needs_review` drafts have `pd.digest_item_id IS NULL` on the draft itself. 13 of 122 have full chain intact but fail `cpp.auto_approve_enabled = false`. **0 of 122 pass current SQL filter.** Date inflection: oldest NULL-digest_item_id draft `created_at` = 2026-04-27 01:40 UTC (one day after slot-driven Phase A complete on 26 April per memory). 131 of 135 post-25-April drafts (97%) have NULL digest_item_id; 2 of 562 historical approved drafts (0.4%) had it.
  - **F-AAP-001 (NEW P1)**: auto-approver SQL fetch function `m.auto_approver_fetch_drafts` schema/contract break with slot-driven v4 architecture. Confirmed mechanism (no longer hypothesis). Path 1 (loosen SQL fetcher) preferred over Path 2 (populate digest_item_id at slot-fill).
  - **ChatGPT correction VALIDATED**: original F-AAP-001 hypotheses (created_at cutoff at 2026-04-25; per-client gate excludes CFW + Invegent) were **wrong** — created_at cutoff was a coincidence (legacy digest-flow backlog exhaustion timing); per-client gate exists but is secondary, not the primary mechanism. Without the source inspection, F-AAP-001 would have committed with the wrong root cause.
  - **Lesson #62 type-(c) does NOT apply** to this MCP escalation — escalation produced genuinely new knowledge by prompting upstream source inspection. New T-MCP-08 lesson candidate captured: `plan_review` action_type with inferred hypotheses + one-tool-call-away upstream confirmation = high-value escalation pattern.
  - **Stance retire criterion #1 FIRED** (V3-V5 PASS, ~13h post-apply, patches held). Stance NOT retired this session — PK accepted close only, did not signal retirement. T05 stays P1-deferred; chat to propose retirement at next session start under S20.
  - **B-INV-CFW-Invegent-Silent-Approver row** moved from Active to ✅ RESOLVED (premise superseded by F-AAP-001).
  - **F-AAP-001 row** added to Active (P1, logged with confirmed root cause) and to Backlog (with full mechanism + fix paths).
  - **Today/Next 5 rebuilt**: rank 1 personal businesses; rank 2 stance retire decision; rank 3 F-AAP-001 fix brief (next-session); rank 4 publish-queue-and-publish CC brief (still queued); rank 5 T05 (P1-deferred per stance).
  - **State-capture exception applied to second MCP fire**: only one MCP fire this session (the initial close-out plan review). Second fire skipped under exception (same accepted plan, evidence strengthened, lower risk than original).
  - **T-MCP-05** queue updated with review_id `1e5ab2eb-...` for close-the-loop UPDATE pending PK confirmation.
  - **Closure budget**: +0.9h (above 0.25h granularity threshold). Trailing-14-day 10.3 → 11.2h. Above 8.0 floor.
  - **No new EF deploys, no DDL, no production DML.** Read-only investigation + documentation commit.
- v2.26 (3 May Sunday late-morning Sydney session-end reconcile): T05 deferred + Operational stance recorded + Today/Next 5 rebuilt to lead with patch-validation work.
- v2.25 (3 May Sunday late-morning Sydney R01 calibration session-end): T04 R01 Data Auditor calibration v2 COMPLETE.
- v2.24 (3 May Sunday late-morning Sydney T02 ratification session-end): T02 Gate B body-health exit RATIFIED.
- v2.23 (3 May Sunday mid-morning Sydney F-PUB-005 apply session-end): F-PUB-005 + F-PUB-010 CLOSED + G1 sync_state restructure.
- v2.22 (3 May Sunday mid-morning Sydney chat session 2 end): F-PUB-007 closed not-real-bug + F-PUB-010 candidate surfaced + addressed in F-PUB-005 patch v2 + F04 applied.
- v2.21 (3 May Sunday morning Sydney chat session-end): F-PUB-006 CLOSED + B31 closure of F-PUB-004 PROVEN.
- v2.20 (3 May Sunday morning Sydney CC pre-T01/T02): F-PUB-006 partial + B-INV-LinkedIn investigation complete + B38.
- v2.19 (2 May Saturday very late evening Sydney session-end): B31 / B32 / T08 closed end-to-end.
- v2.18 (2 May Saturday late evening Sydney session-end): full session reconciliation.
- v2.17 (2 May Saturday afternoon Sydney): MCP review protocol codified.
- v2.16 (2 May Saturday afternoon Sydney): T-MCP-01 closed end-to-end.
- v2.15 (2 May Saturday afternoon Sydney): ChatGPT Review MCP system SHIPPED.
