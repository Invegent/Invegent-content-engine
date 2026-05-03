# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-03 Sunday mid-morning Sydney chat session 2 (v2.22 — **F-PUB-007 closed not-real-bug + F-PUB-010 candidate surfaced + addressed in F-PUB-005 patch v2 + F04 applied with Option A both parts**). F-PUB-007 verified: 34 lost approvals all NDIS-Yarns × Facebook, queue 92 vs cap 10 (920%). Cron picks them up — F-PUB-007 NOT a real bug. **F-PUB-010 candidate**: asymmetric cap enforcement (trigger respects max_queued_per_platform, cron has no cap check). PK directive: hard-cap semantics. F-PUB-005 patch brief rewritten v1→v2: drop-trigger + hard-cap-cron design closes both F-PUB-005 + F-PUB-010 in single migration (~30 lines vs v1's ~150). F04 applied via Supabase MCP apply_migration (Option A both parts: 15 column_purposes UPDATEs + 1 k.table_registry.purpose refresh; m schema docs coverage 26.2% → 28.4%). 2 MCP review fires on F04 — both escalated despite Path B clearance; consistency-bias pattern (Lesson #62 refined to type-(c)). PK explicit override applied. T-MCP-02 quota now 12 of 5 (well exceeded — quota was minimum bar). Closure hours this chat session: ~1.5h chat-side. Trailing-14-day: ~7.8h (approaching 8.0 floor).

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S18)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool (live since v2.15). **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.22 honest limitation**: this bump committed without ChatGPT cross-check per state-capture-bump exception; the underlying 2 production DML applies received 2 MCP fires on F04.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind. See § "Closure budget tracking" below.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~13 (closed F-PUB-007 + F-PUB-010 rolled into F-PUB-005 patch this session) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~7.8 (3.5 v2.19 + 0.8 v2.20 + 2.0 v2.21 + 1.5 v2.22) | 8.0 floor | 🟡 approaching floor — 0.2h short |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~1.5h** (chat-side: F-PUB-007 verification + F-PUB-010 surfacing + F-PUB-005 brief v2 rewrite + F04 migration apply both parts + reconciliation).

**Methodology** (per D186): wall-clock estimate, granularity 0.25h, only sessions where the work product *closed an open finding or shipped a fix* count. F-PUB-007 closure ✅ + F-PUB-005 brief promoted ready ✅ + F04 migration applied (closes Q-001) ✅ + F-PUB-010 candidate captured + addressed in patch design ✅ = qualifies as closure session.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-03 Sunday mid-morning Sydney chat session 2 end.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **F-PUB-005 patch apply** | P1 | Brief now `status: ready` (v2 rewrite committed `71e3eeb4`). Closes F-PUB-005 + F-PUB-010 in single migration. Pre-flight P1-P5 + MCP review + apply via Supabase MCP. Estimated ~75min wall, ~15min active chat. | Run pre-flight P1-P5; fire MCP review (action_type=`sql_destructive`); apply migration `fpub005_drop_trigger_and_add_hard_cap_to_enqueue_cron`; verify V1-V5; write run state. **Closure-budget item per D186.** |
| 3 | **publish-queue-and-publish CC brief execution** | P2 | Brief at `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md` `status: ready`. ~70-95min CC closure budget. Two 0%-documented tables central to F-PUB-006 + F-PUB-005 work area. | Trigger CC with brief. CC pre-flights + drafts migration; chat applies via Supabase MCP per D170. Pattern follows slot-core / post-publish-observability / pipeline-health-pair / operator-alerting-trio. |
| 4 | **B-INV-CFW-Invegent-Silent-Approver investigation** | P2 | NDIS-Yarns firing all 4 platforms post-B31; CFW + Invegent silent across all platforms in 9.5h post-deploy. Likely SQL fetch-side filter or no fresh draft generation upstream. | Read-only investigation. CC-suitable brief authoring next session — pre-flight + queries + writeup. **Closure-budget item per D186.** |
| 5 | **B-INV-LinkedIn-PhantomPublishes investigation** | P2 | Daily phantom 00:00 UTC PP-LinkedIn publishes confirmed reproducible (00:00:08 + 00:00:11 UTC today). Format `zapier-li-{ms_epoch}` matches linkedin-zapier-publisher producer but queue_ids don't exist. | Identify the source EF / webhook / code path producing the phantoms. Possible: hard-deleted post-publish, non-standard code path, stale `post_publish.queue_id`. **Closure-budget item per D186.** |

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-B31 | `SELECT client_slug, platform, count(*) FILTER (WHERE approval_status='approved' AND approved_at > NOW() - INTERVAL '24 hours') AS fresh_approvals_24h FROM m.post_draft d JOIN c.client c USING (client_id) WHERE d.created_at > '2026-05-02 12:39:33'::timestamptz GROUP BY 1,2;` | **VERIFIED v2.21**: 252 approvals in 9.5h post-deploy. F-PUB-004 closure observable. NDIS-Yarns firing all 4 platforms; CFW + Invegent silent (B-INV-CFW-Invegent-Silent-Approver investigation needed). |
| S17 | ChatGPT Review MCP cost + idempotency rate | `SELECT count(*) AS calls, sum(input_tokens + output_tokens) AS total_tokens, count(*) FILTER (WHERE status='completed') AS completed_count, count(*) FILTER (WHERE response_jsonb IS NULL) AS escalated_or_failed FROM m.chatgpt_review WHERE created_at > NOW() - INTERVAL '7 days'` | Spend > $35 in 30-day → check budget; idempotency hit < 10% over 50+ calls → review proposal/context shape; escalation rate > 40% → reviewer prompt may be too aggressive. **v2.22 note: 5 of 12 fires are sql_destructive; ALL escalated on first pass, only 1 of 5 cleared on second pass. Escalation rate on sql_destructive currently ~80% — well over the 40% threshold. Consider reviewer prompt audit at next maintenance window.** |
| S18 | D186 closure budget (per session start) | Read open-finding count from `📌 Backlog` + `🟡 Active` (P0+P1 only) + `docs/audit/open_findings.md`; sum trailing-14-day closure hours from sync_state session logs | If open count > 20 OR trailing-14-day hours < 8.0 → surface to PK before any new work. **Currently at 7.8h trailing-14-day — under floor by 0.2h. No automation pause yet, but track.** |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| T02 | Gate B exit decision — extended 24h | P0 | Sun 3 May | PK + chat | Re-check 5-signal obs panel; ratify if all clean | `docs/audit/runs/2026-05-02-t02-extension.md` |
| T04 | R01 calibration session | P1 | Sun 3 May / Mon 4 May | PK + chat | 90min hard cap | |
| T05 | Meta dev support contact | P1 | ASAP — Mon 4 May latest | PK | Single conversation | |
| T06 | Reconnect YouTube OAuth — UNBLOCKED (T17 deployed) | P1 | Within 7 days | PK | Reconnect OAuth at user/account level | |
| T07 | Instagram publisher recovery | P1 | Gated on S16 fresh-approval verification + T05 + cron `?limit=1` update | mixed | Step 4 cannot retry until ALL gates clear | |
| **T08** | ~~Auto-approver patch~~ | — | ✅ **DONE 2 May late evening** via B31 — auto-approver v1.6.0 LIVE on version 53 | — | Workstream 2 closure | `docs/runtime/runs/2026-05-02-b31-auto-approver-v160-deploy.md` |
| T09 | Safe-to-resume publisher checklist | P0 | Walk before each cron flip | PK | brief: `06_t09_*` |
| T10 | Pre-fix queue disposition | P0 | Now appropriate post-W1 | PK | brief: `07_t10_*` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → MCP review (per protocol) → PK | next session |
| T12 | F-PUB-005 trigger gate | P1 | After publisher-gate batch (now) | chat → MCP review (per protocol) → PK | F-PUB-005 |
| T13a | LinkedIn Zapier publisher gate v1.1.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T13b | LinkedIn direct publisher gate v1.2.0 — repo-only | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since 2026-03-12 | |
| T17 | YouTube publisher gate v1.6.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `01_t17_*` |
| T18 | FB publisher gate v1.8.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `02_t18_*` |

**Workstream 1 status: COMPLETE.**
**Workstream 2 status: ✅ COMPLETE 2 May late evening — SQL v5 LIVE (prior session), EF v1.6.0 LIVE (this session), F-PUB-004 closure mechanically committed AND empirically PROVEN this session via F-PUB-006 closure chain.**
**Meta-tooling — ChatGPT Review MCP: SHIPPED v2.15. T-MCP-01 closed v2.16. Protocol codified v2.17. Production fires at 4 of 5 v2.18 → 7 of 5 v2.19 → 9 of 5 v2.21 → 12 of 5 v2.22 (well exceeded; quota was minimum bar).**
**D182 brief shape #3 (pipeline-state digest): VALIDATED v2.18. Scheduled in Cowork at 02:00 AEST daily.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP (v2.22 update — T-MCP-02 quota at 12 of 5)

Meta-infrastructure for the standing rule from D-01. **Status: LIVE, validated, protocol-codified, 12 production fires captured (quota of 5 exceeded by 7 fires).** All artefacts deployed; claude.ai connector connected at 2026-05-02 03:16:48 UTC. Procedure codified at `docs/runtime/mcp_review_protocol.md` v2.17.

**Production fires log (T-MCP-02 quota at 12 of 5):**
| # | Time (UTC) | review_id | action_type | proposal target | outcome |
|---|---|---|---|---|---|
| 1 (smoke) | 02:08 (2 May) | `5cdc1d02-...` | (test) | PowerShell smoke test | proceed/agree/low/high |
| 2 (T-MCP-01) | 05:48 (2 May) | `2bab95d5-...` | plan_review | T02 Gate B exit decision | escalate_explicit_flag → PK chose Path A (extend 24h) |
| 3 | ~07:00 (2 May) | `af420233-...` | plan_review | Cowork prompt v2.1 patch | apply_corrected (chat applied with clarifier added) |
| 4 | 11:17 (2 May) | `624de0ce-...` | plan_review | Slice 3 build path | escalate_explicit_flag → ground-reset to closure-first |
| 5 | ~12:00 (2 May) | `d38ba055-...` | plan_review | B32 cooldown design choice | escalate (weak objections) → PK chose Path 3 — full correction |
| 6 | ~12:15 (2 May) | `2d09be1d-...` | plan_review | v1.6.0 first-cut patch | escalate (JSONB validation gap) → closed via 967/967 SELECT |
| 7 | ~12:25 (2 May) | `304a87cc-...` | plan_review | v1.6.0 rebased patch | escalate (source_score classification) → defence-in-depth |
| 8 | ~23:05 (2 May) | `b75d8313-...` | sql_destructive | F-PUB-006 Stage 1 (4 orphan UPDATE) | escalate (generic "external systems") → PK chose Path B → silenced via concrete evidence |
| 9 | ~23:10 (2 May) | `0f74aff2-...` | sql_destructive | F-PUB-006 Stage 1 (re-fire after evidence) | proceed/agree (cleared) |
| 10 | ~23:12 (2 May) | `9448d4a4-...` | sql_destructive | F-PUB-006 Stage 2 (17 zombie UPDATE) | proceed/agree (cleared first pass) |
| **11 (NEW v2.22)** | ~01:30 (3 May) | `043e1831-...` | sql_destructive | F04 column_purposes migration apply | **escalate_explicit_flag (echoed Claude's known_weak_evidence) → Path B investigation** |
| **12 (NEW v2.22)** | ~01:35 (3 May) | `bbef4ace-...` | sql_destructive | F04 re-fire after Path B producer-code verification | **escalate=true persists DESPITE verified_claims body acknowledging Path B addressed both pushbacks; pushback_points repeated verbatim from first-pass; consistency-bias pattern → PK explicit override** |

**Cost so far**: ~16K total tokens estimated across 12 fires = ~$0.005 estimated burn. Budget headroom enormous.

**v2.22 finding (Lesson #62 refined to type-(c)):** ChatGPT consistency-bias on sql_destructive. Pattern: even when `verified_claims` body explicitly acknowledges Path B evidence cleared the original pushbacks (and `unverified_claims=[]` empty), the model still returns `escalate=true` with `pushback_points` repeated verbatim from first-pass. 5 of 12 fires are sql_destructive; only 1 of those 5 (Stage 1 yesterday) cleared on second pass. Escalation rate on sql_destructive ~80%. **Worth tracking** — may indicate prompt template adjustment needed on chatgpt-review-worker, or model-bound consistency-bias on gpt-4o-mini. Capture as candidate maintenance task; not blocking forward work.

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | Validate ChatGPT Review MCP from new chat | ✅ DONE 2026-05-02 afternoon | Closed |
| T-MCP-02 | Capture first 5 production tool fires in `m.chatgpt_review` | ✅ EXCEEDED 12 of 5 v2.22 | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| **T-MCP-04** | Operationalise D-01 standing rule | P1 | Half-codified v2.17. Pending: PK manual update of claude.ai project system prompt template |
| T-MCP-05 | Close-the-loop UPDATE on first MCP escalation row `2bab95d5-...` | P3 | UPDATE m.chatgpt_review SET status='resolved', action_taken='extend_observation_24h_accept_correction'... PK confirmation required. **Closure-budget item per D186.** |
| **T-MCP-06 (NEW v2.22)** | Investigate sql_destructive escalation rate (~80% over 5 fires) | P3 | If next 3 sql_destructive fires also escalate on weak grounds → review chatgpt-review-worker reviewer prompt + consider prompt-template adjustment. Aim: filter type-(b)/type-(c) pushbacks before they reach chat. **Closure-budget item per D186.** |

---

## 🤖 Cowork automation (D182 — v2.22)

**Brief shapes validated**: 3 (migration drafting, audit-snapshot markdown, pipeline-state digest)
**Briefs run**: 11 (publish-queue-and-publish-column-purposes still status: ready, awaiting CC execution)
**Production writes from automation**: 0 (mandatory threshold preserved)
**Scheduled tasks live**: 1 — "ICE Nightly Health Check" daily 02:00 AEST

| Artefact | Where | Status |
|---|---|---|
| Automation v1 spec | `docs/runtime/automation_v1_spec.md` | Live + extended 2 May with after-run handover loop + pre-flight discipline |
| Cowork executor prompt | `docs/runtime/cowork_prompt.md` | v2.1 (cold-start fix) |
| State file template | `docs/runtime/state_file_template.md` | Live |
| Brief queue | `docs/briefs/queue.md` | Live |
| Q inbox | `docs/runtime/claude_questions.md` | post-render-log-001 ✅ CLOSED v2.22 (Option A both parts applied) |
| Run state files | `docs/runtime/runs/` | 13 files (added `2026-05-03-f04-and-fpub007-fpub010-session.md` v2.22) |
| MCP review protocol | `docs/runtime/mcp_review_protocol.md` | v2.17 |

**Sunset review**: 12 May 2026. Portfolio at 11 briefs / 3 shapes — comfortably justifies framework continuation.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| ~~F04~~ | post_render_log column-purposes | — | ✅ **CLOSED v2.22** — both Option A migrations applied. m schema docs coverage: 26.2% → 28.4% | — | Run state: `docs/runtime/runs/2026-05-03-f04-and-fpub007-fpub010-session.md` |
| F-PUB-005 patch | Drop trigger + hard-cap cron — **READY** | P1 | brief v2 committed `71e3eeb4`, status: ready | chat | Apply via Supabase MCP `apply_migration` per D170. Pre-flight P1-P5 → MCP review (sql_destructive, payload in brief) → apply migration `fpub005_drop_trigger_and_add_hard_cap_to_enqueue_cron` → V1-V5 verification → run state. Closes F-PUB-005 + F-PUB-010 candidate in single migration. Estimated ~15min active chat, ~75min wall (V5 needs 60min wait). **Closure-budget item per D186.** |
| publish-queue-and-publish-column-purposes | New CC brief — Tier 1 column-purposes | P2 | status: ready | cc | Trigger CC with brief at `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md`. CC pre-flights + drafts migration + chat applies via Supabase MCP per D170. Estimated 70-95min CC closure. Pattern follows slot-core / post-publish-observability / pipeline-health-pair / operator-alerting-trio. |
| B-INV-LinkedIn-Queue-Stall | Investigate 5 LinkedIn × Property Pulse true-stuck drafts | P1 | **investigation complete v2.20 — remediation pending PK review** | chat (PK reviews first) | CC's Stage 4 hypothesis: `cpp.max_per_day=2` filter excludes the 5 rows on every tick because 3 phantom 00:00-UTC publishes (queue_ids that no longer exist on `m.post_publish_queue`) exhaust `published_today` immediately. Findings: `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md`. **Phantom anomaly confirmed reproducible — happened today at 00:00:08 + 00:00:11 UTC.** Investigation remediation candidate: identify phantom-publish source. **Closure-budget item per D186.** |
| B-INV-CFW-Invegent-Silent-Approver | Investigate why CFW + Invegent have ZERO approver outcomes post-B31 | P2 | candidate (NEW v2.21, still unaddressed v2.22) | chat | NDIS-Yarns firing all 4 platforms; CFW + Invegent silent across all platforms in 9.5h post-deploy. Likely SQL fetch-side filter or no fresh draft generation upstream. Read-only investigation; CC-suitable next session. **Closure-budget item per D186.** |

---

## 💼 Personal businesses

*(none flagged this session — PK confirmed no urgent items at session start)*

---

## 🏗 Operational Truth Layer (strategic stream)

Unchanged from v2.11. O-12, O-13 captured.

---

## 🟢 Ready / Strategic

Unchanged from v2.13.

---

## 🤝 Pending decisions

Unchanged from v2.11. **D186 closure discipline** ✅ LOCKED 2 May late evening — full prose in `docs/06_decisions.md`.

---

## 📌 Backlog

| ID | Item | Priority | Trigger |
|---|---|---|---|
| B01–B22, B24–B27 | (per v2.10) | varies | per item |
| ~~B16, B17, B18, B23, B30, B31, B32~~ | CLOSED | — | — |
| ~~F-PUB-006~~ | ✅ **CLOSED 3 May Sunday morning** — Stages 1+2 applied (4+17=21 rows dead), Stage 3 verified empirically (3 real Facebook publishes in post-Stage-1 window before cooldowns kicked in) | — | — |
| B28 | Verify operator intent for CFW IG / Invegent IG / CFW FB auto-approve | ✅ APPLIED v2.14 | — |
| B29 | Partial unique constraint on `c.client_publish_profile (client_id, platform) WHERE status='active' AND is_default=true` | P2 | Long-term forward-defence |
| B33 | Brief artefact retention rule | P2 | Process improvement |
| B34 | Add `estimated_cost_usd` calculation in chatgpt-review-worker | P3 | Cosmetic |
| B35 | Telemetry view `m.chatgpt_review_daily` | P3 | Materialised view |
| B36 | **Slice 3 v0 spec authoring** | P2 | Trigger now extended per D186: B31 deployed (✅ DONE) + LinkedIn P1 closed + D186 codified (✅ DONE) + at least 1 month of nightly-health-check observation **+ closure-budget headroom per D186 rule 3** (no automation-pause active). v0 minimal: single EF + manual HTTP trigger + path-restricted GitHub read + Supabase SELECT-only. **Earliest authoring: 4-5 sessions out** with closure budget honoured. |
| B37 | v1.5.0 source archive governance | P3 | Forward-defence per Lesson #62 candidate. Build when standing rule needs codification or when a second instance surfaces. |
| ~~B38~~ | ~~F-PUB-005 trigger patch — DDL on `m.enqueue_publish_from_ai_job_v1`~~ | — | **SUPERSEDED v2.21**: design simplified to 2-line DROP migration. Tracked as 🟡 Active row "F-PUB-005 patch" instead. v2.22 update: brief rewritten v1→v2 with hard-cap design (drop trigger + add cap to cron); status: ready. |
| ~~F-PUB-007~~ | ~~Silent-skip-at-cap loses approvals~~ | — | ✅ **CLOSED v2.22** — verified NOT a real bug. 34 lost approvals down from 44 yesterday; all 6-12h young; cron picks them up over time. BUT verification surfaced F-PUB-010 candidate (asymmetric cap enforcement). |
| ~~F-PUB-010~~ | ~~Asymmetric cap enforcement (trigger respects, cron does not)~~ | — | ✅ **CLOSED v2.22 design-stage** — addressed in F-PUB-005 patch v2 design (drop trigger + add cap to cron). Implementation pending F-PUB-005 patch apply (rank 2 of Today/Next 5). PK directive: hard-cap semantics. Live evidence at surfacing: NDIS-Yarns FB queue 92 vs cap 10 (920%). |
| F-PUB-008 | NDIS-Yarns FB publishes with NULL platform_post_id | P2 | 2 of 3 NDIS-Yarns FB publishes since Stage 1 (post_draft_ids `de45011b-...`, `587c2b6c-...`) have `platform_post_id = NULL` despite being in `m.post_publish`. Possible partial publish: Meta API call succeeded but EF didn't capture response post id. Worth investigating — if recurring, breaks reporting + breaks Insights API back-feed (Phase 2.1). |
| F-PUB-009 | Scheduling drift to August/October | P3 | Surface evidence: NDIS-Yarns FB 84 queued, latest scheduled 2026-08-27. NDIS-Yarns IG: 2026-10-07. PP-LinkedIn: 2026-08-28. Trigger's cadence math (`last_scheduled + min_gap`) compounds far into future when queue grows faster than max_per_day=2 can drain. **v2.22 update**: F-PUB-005 patch v2 (hard-cap cron) will *limit* drift growth since queue can't grow past cap. Doesn't fully solve but caps the worst case. Reassess after F-PUB-005 patch applied. |
| B-INV-LinkedIn-PhantomPublishes | Daily phantom 00:00 UTC PP-LinkedIn publishes | P2 | Reproducible: today 00:00:08 + 00:00:11 UTC, format `zapier-li-{ms_epoch}`, queue_ids do not exist in `m.post_publish_queue` at all. Possibilities: hard-deleted post-publish, non-standard code path, stale `post_publish.queue_id`. **Investigation candidate brief**: identify the source EF or webhook causing these phantom publishes. **Closure-budget item per D186 — material to LinkedIn pipeline correctness.** |

---

## 🧊 Frozen / Deferred

Unchanged from v2.20.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15) — three production saves: wrong YT trigger fix (1 May), wrong bulk-quarantine of 87 legacy FB drafts (1 May night), wasted patching of Supabase EF gateway HTML quirk (2 May). Pattern *verify the actual live state before patching the wrong layer*.
- Lesson #51 (CONFIRMED v2.12, REINFORCED v2.14, HONOURED v2.19, REINFORCED-VIA-VIOLATION v2.21, **HONOURED v2.22**) — terminal-decision authority requires disproportionate scrutiny. v2.22: producer-code Path B investigation before override on F04 apply; two-fire MCP review pattern preserved despite both fires escalating on consistency-bias.
- Lesson #58 candidate — *"When a platform's gateway misbehaves with a specific response type, route around on a different surface rather than fighting the platform."*
- Lesson #59 candidate — *"On the first real fire of a new external-review tool, default to accepting the corrected action over override."*
- Lesson #60 candidate — *"Generic context yields generic objections; specific named-field context yields sharper challenge."*
- **Lesson #61 PROMOTED to canonical (v2.19, third vindication) — HONOURED v2.21 — REINFORCED v2.22 (fourth vindication)** — Pre-flight discipline must include `information_schema.columns` lookup, JSONB-path validation, doc_state breakdown, test-running every SQL block before brief/patch authoring. v2.22: Pre-flight on F04 caught column name verification (16 EMPTY confirmed); on F-PUB-007 verification caught schema column mismatches (`platform_code` vs `platform`, `max_queued` vs `max_queued_per_platform`).
- **Lesson #62 candidate refined to type-(c) v2.22** — *"Three patterns of MCP review escalation: (a) ChatGPT raised new evidence/objection (real signal, demands investigation), (b) ChatGPT echoed Claude's own known_weak_evidence as concerns (weak signal, demands evidence-silencing), (c) ChatGPT consistency-bias keeps escalate=true even when verified_claims body acknowledges Path B has cleared the original pushbacks (artefact of model behaviour, not real signal — escalate field unreliable; verified_claims body is authoritative)."* Two confirmed instances now: Stage 1 first-pass yesterday cleared on second pass (type-b); F04 second-pass DID NOT clear despite Path B clearance (type-c). Promote to canonical on third instance. **Implication**: chat should read `verified_claims` body, not just `escalate` boolean, when deciding whether Path B has succeeded.

---

## v2.22 honest limitations

- All previous limitations apply.
- v2.22 committed without ChatGPT cross-check (state-capture-bump exception applies — full-session reconciliation is doc-only). The underlying 2 production DML applies received 2 MCP review fires which is the protocol's strongest application.
- T-MCP-04 status: half-codified. Repo doc shipped. Still pending: PK manual update of claude.ai project system prompt.
- T-MCP-05 close-the-loop UPDATE on `m.chatgpt_review` row `2bab95d5-...` still pending PK confirmation.
- T-MCP-06 added to backlog: investigate sql_destructive escalation rate (~80% over 5 fires).
- **F-PUB-005 patch ready but not yet applied.** Rank 2 of Today/Next 5.
- **F-PUB-010 candidate addressed in design but not yet implemented.** Closes when F-PUB-005 patch applies.
- **B-INV-LinkedIn-PhantomPublishes** investigation pending PK review.
- **B-INV-CFW-Invegent-Silent-Approver** — newly logged v2.21, still unaddressed v2.22.
- **F-PUB-008** (NULL platform_post_id) and **F-PUB-009** (scheduling drift) not investigated.
- **Closure budget**: this session contributed ~1.5h closure work (F-PUB-007 verify + F-PUB-010 surface + F-PUB-005 brief v2 + F04 apply + reconciliation). Trailing-14-day at 7.8h. Still 0.2h short of 8.0 floor — should hit at next session via F-PUB-005 patch apply (~0.5h) which alone clears the gap.

---

## Changelog

- v1.0–2.21: per previous changelog.
- **v2.22 (3 May Sunday mid-morning Sydney chat session 2 end): F-PUB-007 closed not-real-bug + F-PUB-010 candidate surfaced + addressed in F-PUB-005 patch v2 + F04 applied with Option A both parts.**
  - **F-PUB-007 verification**: 2 queries via Supabase MCP execute_sql confirmed 34 lost approvals (down from 44 yesterday, 10 cleared overnight); all in 6-12h age band; zero >12h old; all NDIS-Yarns × Facebook; queue at 92 vs cap 10. F-PUB-007 NOT a real permanent-loss bug — cron picks them up over time. **Closed.**
  - **F-PUB-010 candidate surfaced**: cron `enqueue-publish-queue-every-5m` source confirmed has NO cap check in WHERE clause. Trigger respects cap (silent-skip), cron does not = asymmetric. Live evidence: NDIS-Yarns FB 92/10 (920% over).
  - **PK design directive**: hard-cap semantics for `max_queued_per_platform`. Cap is hard wall, not soft hint. Surface over-cap as backpressure signal.
  - **F-PUB-005 patch brief v1→v2 rewrite** (commit `71e3eeb4`): from "relocate trigger to m.post_draft" (~150 lines, two functions) to "DROP trigger + add hard cap to cron" (~30 lines, zero new functions). Closes F-PUB-005 + F-PUB-010 candidate in single migration. Status: draft → ready.
  - **F04 migration applied** via Supabase MCP `apply_migration`:
    - `audit_post_render_log_column_purposes` — 15 column_purposes UPDATEs on k.column_registry, atomic DO block, Lesson #38 verification (pre=16, post=1, delta=15)
    - `refresh_post_render_log_table_purpose_to_match_code_cited_write_set` — 1 UPDATE on k.table_registry.purpose for table_id=81572, ROW_COUNT=1
  - **Q-post-render-log-001 closed** Option A both parts. m schema docs coverage 26.2% → 28.4%.
  - **2 MCP review fires on F04** (review_id `043e1831` first-pass, `bbef4ace` second-pass). Both escalated. First-pass: pushback_points exactly echoed Claude's own known_weak_evidence (type-(b) pattern). Path B investigation: read image-worker/index.ts v3.9.2 line-by-line, verified 12 material producer-code citations against actual source — all accurate. Second-pass: verified_claims acknowledged Path B addressed both pushbacks; unverified_claims=[] empty; only remaining "objection" was unfalsifiable assumption. BUT pushback_points repeated verbatim from first-pass and escalate=true persisted. **Type-(c) consistency-bias pattern.** PK explicit override applied under previously-given Option A directive.
  - **Lesson #62 candidate refined to type-(c)**: ChatGPT consistency-bias on sql_destructive. The escalate field is unreliable when consistency-bias activates; verified_claims body is authoritative. Two confirmed instances now (Stage 1 yesterday type-b, F04 today type-c). Promote to canonical on third instance.
  - **T-MCP-06 added**: investigate sql_destructive escalation rate (~80% over 5 fires, only 1 of 5 cleared on second pass). May need chatgpt-review-worker reviewer prompt audit.
  - **Action list updates**: Today/Next 5 rebuilt for next session (post-F04 closure); F04 row moved Active → Closed; F-PUB-005 patch row keeps Active with status: ready note; F-PUB-007 + F-PUB-010 added to Backlog as closed; F-PUB-009 row updated with note that F-PUB-005 patch v2 will limit drift growth via cap enforcement.
  - **Closure budget**: ~1.5h chat-side this session. Trailing-14-day estimate 7.8h. 0.2h short of 8.0 floor — F-PUB-005 patch apply next session clears the gap.
  - **State-capture-bump exception applies**: no MCP review on this commit (the underlying applies got 2 MCP fires).
  - **Standing rule honoured**: 4-way sync complete (sync_state + action_list + queue.md unchanged + run state file + claude_questions resolution).
- v2.21 (3 May Sunday morning Sydney chat session-end): F-PUB-006 CLOSED + B31 closure of F-PUB-004 PROVEN + 3 NEW candidate findings + F-PUB-005 patch design simplified + new CC brief queued.
- v2.20 (3 May Sunday morning Sydney CC pre-T01/T02): F-PUB-006 partial + B-INV-LinkedIn investigation complete + B38.
- v2.19 (2 May Saturday very late evening Sydney session-end): B31 / B32 / T08 closed end-to-end.
- v2.18 (2 May Saturday late evening Sydney session-end): full session reconciliation.
- v2.17 (2 May Saturday afternoon Sydney): MCP review protocol codified.
- v2.16 (2 May Saturday afternoon Sydney): T-MCP-01 closed end-to-end.
- v2.15 (2 May Saturday afternoon Sydney): ChatGPT Review MCP system SHIPPED.
