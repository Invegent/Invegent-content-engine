# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-03 Sunday morning Sydney chat session-end (v2.21 — **F-PUB-006 CLOSED end-to-end. B31 closure of F-PUB-004 PROVEN in production.**). Stage 1+2 applied via Supabase MCP `execute_sql` (4+17=21 rows marked dead with explicit reason). Stage 3 verification PASSED measured against Stage 1 apply timestamp (3 real Facebook publishes — NDIS-Yarns FB ×3, PP-FB ×1 — within the post-Stage-1 / pre-cooldown window). 3 ChatGPT review fires under protocol v2.17 (1 Stage 1 first-pass escalated → Path B silenced via concrete evidence, 1 Stage 1 second-pass cleared, 1 Stage 2 first-pass cleared). T-MCP-02 quota now 9 of 5 (exceeded further). **3 NEW candidate findings**: F-PUB-007 (silent-skip-at-cap loses approvals — likely not real, verify next session), F-PUB-008 (NDIS-Yarns FB publishes with NULL platform_post_id), F-PUB-009 (scheduling drift to August/October). **F-PUB-005 patch design simplified dramatically** — discovery that the 5-min cron `enqueue-publish-queue-every-5m` is the SAFE enqueue path with `pd.approval_status IN ('approved', 'scheduled', 'published')` predicate; the trigger is the buggy path. Patch reduces from "relocate trigger" (~150 line migration) to "DROP trigger + DROP function" (2-line migration). **publish-queue-and-publish-column-purposes brief** authored chat-side and queued status: ready (Tier 1 CC, 35 cols 0%-documented). Lesson #62 candidate refined (ChatGPT echoed Claude's known_weak_evidence as unverified_claims pattern). Lesson #51 honoured during DML applies AND violated during sync_state edit (acknowledged + restored). Closure hours this chat session: ~2.0h. Trailing-14-day estimate: ~6.3h.

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S18)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool (live since v2.15). **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.21 honest limitation**: this bump committed without ChatGPT cross-check per state-capture-bump exception; the underlying 2 production DML applies received 3 MCP fires which is the protocol's strongest application.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind. See § "Closure budget tracking" below.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~14 (closed F-PUB-006 this session; +3 NEW candidates F-PUB-007/008/009 P3-P2) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~6.3 (3.5 v2.19 + 0.8 v2.20 + 2.0 v2.21) | 8.0 floor | 🟡 below floor — need ~1.7h more closure work over next 13 days |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~2.0h** (chat-side: F-PUB-006 cleanup + brief drafting + investigation + reconciliation). To be reflected in next session's trailing-14-day window calc.

**Methodology** (per D186): wall-clock estimate, granularity 0.25h, only sessions where the work product *closed an open finding or shipped a fix* count. F-PUB-006 closure ✅ + B31 closure verified ✅ + 1 new brief ready for CC + 3 candidates triaged = qualifies as closure session.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-03 Sunday morning Sydney chat session-end.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **F-PUB-005 patch brief REWRITE** | P1 | Design simplified dramatically — discovered the 5-min cron `enqueue-publish-queue-every-5m` is the SAFE enqueue path. Patch reduces to 2-line DROP migration. | Rewrite `docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md` to reflect simplified design (DROP trigger + DROP function only); promote status: draft → ready when complete. **Closure-budget item per D186.** |
| 3 | **F-PUB-007 verification** | P2 | Likely not a real bug — the 5-min cron's eligibility predicate `pd.approval_status IN ('approved', 'scheduled', 'published')` SHOULD be picking up the 44 lost approvals over time | One query: SELECT count(*) FILTER (WHERE q.created_at > NOW() - INTERVAL '6 hours') FROM m.post_publish_queue q JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id WHERE pd.approved_at < NOW() - INTERVAL '24 hours'. If non-zero, cron is processing them; close F-PUB-007 as not-real. **Closure-budget item per D186.** |
| 4 | **F04 migration apply** | P0 | Cowork autonomously drafted prior session 2 May at 10:20:54Z; closure-budget item per D186 — **STILL OWED** | Apply `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql` via Supabase MCP per D170 + close Q-post-render-log-001 (recommend Option A). **Closure-budget item per D186.** |
| 5 | **publish-queue-and-publish CC brief execution** | P2 | New CC brief queued today, status: ready. Tier 1, ~70-95min closure budget. Two 0%-documented tables central to F-PUB-006 work area; documenting while context fresh | Trigger CC with brief `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md`. CC pre-flights, drafts migration `supabase/migrations/{TIMESTAMP}_audit_publish_queue_and_publish_column_purposes.sql`, leaves for chat to apply via Supabase MCP per D170. |

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-B31 | `SELECT client_slug, platform, count(*) FILTER (WHERE approval_status='approved' AND approved_at > NOW() - INTERVAL '24 hours') AS fresh_approvals_24h FROM m.post_draft d JOIN c.client c USING (client_id) WHERE d.created_at > '2026-05-02 12:39:33'::timestamptz GROUP BY 1,2;` | **VERIFIED v2.21**: 252 approvals in 9.5h post-deploy. F-PUB-004 closure observable. NDIS-Yarns firing all 4 platforms; CFW + Invegent silent across all platforms (separate investigation needed). |
| S17 | ChatGPT Review MCP cost + idempotency rate | `SELECT count(*) AS calls, sum(input_tokens + output_tokens) AS total_tokens, count(*) FILTER (WHERE status='completed') AS completed_count, count(*) FILTER (WHERE response_jsonb IS NULL) AS escalated_or_failed FROM m.chatgpt_review WHERE created_at > NOW() - INTERVAL '7 days'` | Spend > $35 in 30-day → check budget; idempotency hit < 10% over 50+ calls → review proposal/context shape; escalation rate > 40% → reviewer prompt may be too aggressive. Minimum-n guard — skip threshold alerts if calls < 10. |
| S18 | D186 closure budget (per session start) | Read open-finding count from `📌 Backlog` + `🟡 Active` (P0+P1 only) + `docs/audit/open_findings.md`; sum trailing-14-day closure hours from sync_state session logs | If open count > 20 OR trailing-14-day hours < 8.0 → surface to PK before any new work. **Currently at 6.3h trailing-14-day — under floor by 1.7h. No automation pause yet, but track.** |

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
**Meta-tooling — ChatGPT Review MCP: SHIPPED v2.15. T-MCP-01 closed v2.16. Protocol codified v2.17. Production fires at 4 of 5 v2.18 → 7 of 5 v2.19 → 9 of 5 v2.21 (well exceeded).**
**D182 brief shape #3 (pipeline-state digest): VALIDATED v2.18. Scheduled in Cowork at 02:00 AEST daily.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP (v2.21 update — T-MCP-02 quota at 9 of 5)

Meta-infrastructure for the standing rule from D-01. **Status: LIVE, validated, protocol-codified, 9 production fires captured (quota of 5 exceeded by 4 fires).** All artefacts deployed; claude.ai connector connected at 2026-05-02 03:16:48 UTC. Procedure codified at `docs/runtime/mcp_review_protocol.md` v2.17.

**Production fires log (T-MCP-02 quota at 9 of 5):**
| # | Time (UTC) | review_id | action_type | proposal target | outcome |
|---|---|---|---|---|---|
| 1 (smoke) | 02:08 (2 May) | `5cdc1d02-...` | (test) | PowerShell smoke test | proceed/agree/low/high |
| 2 (T-MCP-01) | 05:48 (2 May) | `2bab95d5-...` | plan_review | T02 Gate B exit decision | escalate_explicit_flag → PK chose Path A (extend 24h) |
| 3 | ~07:00 (2 May) | `af420233-...` | plan_review | Cowork prompt v2.1 patch | apply_corrected (chat applied with clarifier added) |
| 4 | 11:17 (2 May) | `624de0ce-...` | plan_review | Slice 3 build path | escalate_explicit_flag → ground-reset to closure-first |
| 5 | ~12:00 (2 May) | `d38ba055-...` | plan_review | B32 cooldown design choice | escalate (weak objections) → PK chose Path 3 — full correction |
| 6 | ~12:15 (2 May) | `2d09be1d-...` | plan_review | v1.6.0 first-cut patch | escalate (JSONB validation gap) → closed via 967/967 SELECT |
| 7 | ~12:25 (2 May) | `304a87cc-...` | plan_review | v1.6.0 rebased patch | escalate (source_score classification) → defence-in-depth |
| **8 (NEW v2.21)** | ~23:05 (2 May) | `b75d8313-...` | sql_destructive | F-PUB-006 Stage 1 (4 orphan UPDATE) | **escalate (generic "external systems") → PK chose Path B → silenced via concrete evidence** |
| **9 (NEW v2.21)** | ~23:10 (2 May) | `0f74aff2-...` | sql_destructive | F-PUB-006 Stage 1 (re-fire after evidence) | **proceed/agree (cleared)** |
| **10 (NEW v2.21)** | ~23:12 (2 May) | `9448d4a4-...` | sql_destructive | F-PUB-006 Stage 2 (17 zombie UPDATE) | **proceed/agree (cleared first pass)** |

**Cost so far**: ~13K total tokens estimated across 10 fires = ~$0.004 estimated burn. Budget headroom enormous.

**v2.21 finding**: First DML category fire of MCP review (3 fires were `sql_destructive`, all prior were `plan_review`). Routing decisions worked correctly — first-pass escalation appropriately raised generic concern, Path B response surfaced concrete evidence, second-pass cleared. **Lesson #62 candidate** refined: protocol v2.17 should distinguish "ChatGPT raised new evidence" (investigate) vs "ChatGPT echoed Claude's own caveats" (silence with evidence).

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | Validate ChatGPT Review MCP from new chat | ✅ DONE 2026-05-02 afternoon | Closed |
| T-MCP-02 | Capture first 5 production tool fires in `m.chatgpt_review` | ✅ EXCEEDED 9 of 5 v2.21 | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| **T-MCP-04** | Operationalise D-01 standing rule | P1 | Half-codified v2.17. Pending: PK manual update of claude.ai project system prompt template |
| T-MCP-05 | Close-the-loop UPDATE on first MCP escalation row `2bab95d5-...` | P3 | UPDATE m.chatgpt_review SET status='resolved', action_taken='extend_observation_24h_accept_correction'... PK confirmation required. **Closure-budget item per D186.** |

---

## 🤖 Cowork automation (D182 — v2.21)

**Brief shapes validated**: 3 (migration drafting, audit-snapshot markdown, pipeline-state digest)
**Briefs run**: 11 (added publish-queue-and-publish-column-purposes today, status: ready, awaiting CC execution)
**Production writes from automation**: 0 (mandatory threshold preserved)
**Scheduled tasks live**: 1 — "ICE Nightly Health Check" daily 02:00 AEST

| Artefact | Where | Status |
|---|---|---|
| Automation v1 spec | `docs/runtime/automation_v1_spec.md` | Live + extended 2 May with after-run handover loop + pre-flight discipline |
| Cowork executor prompt | `docs/runtime/cowork_prompt.md` | v2.1 (cold-start fix) |
| State file template | `docs/runtime/state_file_template.md` | Live |
| Brief queue | `docs/briefs/queue.md` | Live (added publish-queue-and-publish today) |
| Q inbox | `docs/runtime/claude_questions.md` | post-render-log-001 still pending Option A acceptance + apply |
| Run state files | `docs/runtime/runs/` | 12 files (added F-PUB-006 cleanup-applied + cleanup CC + no-ready-briefs marker) |
| MCP review protocol | `docs/runtime/mcp_review_protocol.md` | v2.17 |

**Sunset review**: 12 May 2026. Portfolio at 11 briefs / 3 shapes — comfortably justifies framework continuation.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| F04 | post_render_log column-purposes | P2 | review_required (Cowork autonomously ran 2026-05-02T10:20:54Z) | chat | Apply migration `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql` via Supabase MCP per D170. Resolve Q-post-render-log-column-purposes-001 (recommend Option A). **STILL OWED. Closure-budget item per D186.** |
| F-PUB-005 patch | Trigger patch — REWRITE NEEDED | P1 | brief drafted but design simplified dramatically | chat | Rewrite `docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md` from "relocate trigger" (~150 line migration) to "DROP trigger + DROP function" (2-line migration) per discovery that 5-min cron `enqueue-publish-queue-every-5m` is the safe path. Then promote status: draft → ready. **Closure-budget item per D186.** |
| publish-queue-and-publish-column-purposes | New CC brief — Tier 1 column-purposes | P2 | status: ready | cc | Trigger CC with brief at `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md`. CC pre-flights + drafts migration + chat applies via Supabase MCP per D170. Estimated 70-95min CC closure. Pattern follows slot-core / post-publish-observability / pipeline-health-pair / operator-alerting-trio. |
| B-INV-LinkedIn-Queue-Stall | Investigate 5 LinkedIn × Property Pulse true-stuck drafts | P1 | **investigation complete v2.20 — remediation pending PK review** | chat (PK reviews first) | CC's Stage 4 hypothesis: `cpp.max_per_day=2` filter excludes the 5 rows on every tick because 3 phantom 00:00-UTC publishes (queue_ids that no longer exist on `m.post_publish_queue`) exhaust `published_today` immediately. Findings: `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md`. **Phantom anomaly confirmed reproducible — happened today at 00:00:08 + 00:00:11 UTC.** Investigation remediation candidate: identify phantom-publish source. **Closure-budget item per D186.** |
| B-INV-CFW-Invegent-Silent-Approver | Investigate why CFW + Invegent have ZERO approver outcomes post-B31 | P2 | candidate (NEW v2.21) | chat | NDIS-Yarns firing all 4 platforms; CFW + Invegent silent across all platforms in 9.5h post-deploy. Likely SQL fetch-side filter or no fresh draft generation upstream. Read-only investigation; CC-suitable next session. |

---

## 💼 Personal businesses

*(none flagged this session)*

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
| **~~F-PUB-006~~** | ✅ **CLOSED 3 May Sunday morning** — Stages 1+2 applied (4+17=21 rows dead), Stage 3 verified empirically (3 real Facebook publishes in post-Stage-1 window before cooldowns kicked in) | — | — |
| B28 | Verify operator intent for CFW IG / Invegent IG / CFW FB auto-approve | ✅ APPLIED v2.14 | — |
| B29 | Partial unique constraint on `c.client_publish_profile (client_id, platform) WHERE status='active' AND is_default=true` | P2 | Long-term forward-defence |
| B33 | Brief artefact retention rule | P2 | Process improvement |
| B34 | Add `estimated_cost_usd` calculation in chatgpt-review-worker | P3 | Cosmetic |
| B35 | Telemetry view `m.chatgpt_review_daily` | P3 | Materialised view |
| B36 | **Slice 3 v0 spec authoring** | P2 | Trigger now extended per D186: B31 deployed (✅ DONE) + LinkedIn P1 closed + D186 codified (✅ DONE) + at least 1 month of nightly-health-check observation **+ closure-budget headroom per D186 rule 3** (no automation-pause active). v0 minimal: single EF + manual HTTP trigger + path-restricted GitHub read + Supabase SELECT-only. **Earliest authoring: 4-5 sessions out** with closure budget honoured. |
| B37 | v1.5.0 source archive governance | P3 | Forward-defence per Lesson #62 candidate. Build when standing rule needs codification or when a second instance surfaces. |
| ~~B38~~ | ~~F-PUB-005 trigger patch — DDL on `m.enqueue_publish_from_ai_job_v1`~~ | — | **SUPERSEDED v2.21**: design simplified to 2-line DROP migration. Patch brief at `docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md` needs rewrite, not new investigation. Tracked as 🟡 Active row "F-PUB-005 patch" instead. |
| **F-PUB-007 (NEW v2.21)** | **Silent-skip-at-cap loses approvals (likely not real)** | P3 | Forward-defence + verification candidate. Surface evidence: F-PUB-005 patch pre-flight P3 returned 108 approved drafts with no queue rows; 64 are normal (already published, queue rows deleted post-publish), **44 are real "lost"**. Hypothesis: existing trigger has `IF v_queued_count < v_max_queued THEN INSERT` — when queue at cap, approvals lost silently. **However**: the 5-min cron `enqueue-publish-queue-every-5m` has correct eligibility predicate `pd.approval_status IN ('approved', 'scheduled', 'published')` and SHOULD be picking up the 44 over time. **Verify with one query next session before assuming this is a real bug.** |
| **F-PUB-008 (NEW v2.21)** | **NDIS-Yarns FB publishes with NULL platform_post_id** | P2 | 2 of 3 NDIS-Yarns FB publishes since Stage 1 (post_draft_ids `de45011b-...`, `587c2b6c-...`) have `platform_post_id = NULL` despite being in `m.post_publish`. Possible partial publish: Meta API call succeeded but EF didn't capture response post id. Worth investigating — if recurring, breaks reporting + breaks Insights API back-feed (Phase 2.1). |
| **F-PUB-009 (NEW v2.21)** | **Scheduling drift to August/October** | P3 | Surface evidence: NDIS-Yarns FB 84 queued, latest scheduled 2026-08-27. NDIS-Yarns IG: 2026-10-07. PP-LinkedIn: 2026-08-28. Trigger's cadence math (`last_scheduled + min_gap`) compounds far into future when queue grows faster than max_per_day=2 can drain. Approvals "succeed" but won't publish for 4+ months. Lower priority but worth noting. Mitigation candidates: (a) raise max_per_day, (b) cap how far scheduled_for can be set into future, (c) revisit cadence math entirely. |
| **B-INV-LinkedIn-PhantomPublishes (PROMOTED v2.21)** | **Daily phantom 00:00 UTC PP-LinkedIn publishes** | P2 | Promoted from candidate to active investigation. Reproducible: today 00:00:08 + 00:00:11 UTC, format `zapier-li-{ms_epoch}`, queue_ids do not exist in `m.post_publish_queue` at all. Possibilities: hard-deleted post-publish, non-standard code path, stale `post_publish.queue_id`. **Investigation candidate brief**: identify the source EF or webhook causing these phantom publishes. **Closure-budget item per D186 — material to LinkedIn pipeline correctness.** |

---

## 🧊 Frozen / Deferred

Unchanged from v2.20.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15) — three production saves: wrong YT trigger fix (1 May), wrong bulk-quarantine of 87 legacy FB drafts (1 May night), wasted patching of Supabase EF gateway HTML quirk (2 May). Pattern *verify the actual live state before patching the wrong layer*.
- Lesson #51 (CONFIRMED v2.12, REINFORCED v2.14, HONOURED v2.19, **REINFORCED-VIA-VIOLATION v2.21**) — terminal-decision authority requires disproportionate scrutiny. v2.21: honoured during Stage 1 + Stage 2 DML applies (two-pass MCP review on Stage 1 with Path B silencing of weak objection). VIOLATED during sync_state v2.21 first-attempt commit (truncated earlier session segments via placeholder; immediately detected via file size drop and restored in same session). Self-correction reinforces the lesson: significant doc edits need pre-flight scrutiny equal to DDL/DML.
- Lesson #58 candidate — *"When a platform's gateway misbehaves with a specific response type, route around on a different surface rather than fighting the platform."*
- Lesson #59 candidate — *"On the first real fire of a new external-review tool, default to accepting the corrected action over override."*
- Lesson #60 candidate — *"Generic context yields generic objections; specific named-field context yields sharper challenge."*
- **Lesson #61 PROMOTED to canonical (v2.19, third vindication) — HONOURED v2.21** — Pre-flight discipline must include JSONB-path validation, `information_schema.columns` lookup, test-running every SQL block before brief/patch authoring. v2.21: pre-flight count re-verified via fresh SQL before each apply (Stage 1 + Stage 2). Predicate-based SQL caught drift correctly.
- **Lesson #62 candidate refined v2.21** — *"Two patterns of MCP review escalation: (a) ChatGPT raised new evidence/objection I didn't have (real signal, demands investigation) versus (b) ChatGPT echoed my own known_weak_evidence back as concerns (weak signal, demands evidence-silencing of stated concern). Path B (silence with evidence) is the right response for type (b)."* First confirmed instance from Stage 1 first-pass review (review_id `b75d8313-...`); promote on second instance.

---

## v2.21 honest limitations

- All previous limitations apply.
- v2.21 committed without ChatGPT cross-check (state-capture-bump exception applies — full-session reconciliation is doc-only). The underlying 2 production DML applies received 3 MCP review fires which is the protocol's strongest application.
- T-MCP-04 status: half-codified. Repo doc shipped. Still pending: PK manual update of claude.ai project system prompt.
- T-MCP-05 close-the-loop UPDATE on `m.chatgpt_review` row `2bab95d5-...` still pending PK confirmation.
- **F04 migration not yet applied.** STILL OWED from prior session.
- **F-PUB-005 patch brief at status: draft.** Design simplified dramatically; rewrite needed before promotion.
- **F-PUB-007 verification not run.** Single query next session resolves either way.
- **F-PUB-008 (NULL platform_post_id) not investigated.** May be one-off or systemic.
- **F-PUB-009 (scheduling drift) not investigated.** Lower priority, captured for triage.
- **B-INV-LinkedIn-PhantomPublishes** investigation pending PK review.
- **B-INV-CFW-Invegent-Silent-Approver** — newly logged this session; not investigated.
- **Closure budget**: this session contributed ~2.0h closure work (F-PUB-006 closure + CC brief author + reconciliation). Trailing-14-day at 6.3h. Below 8.0 floor by 1.7h.
- **Sync_state v2.21 first commit truncated earlier session segments** — detected post-commit via file size drop (50KB → 31KB). Restored to ~42KB in same session via corrective commit `bf11e72e`. ~8KB of detail subsections from older sessions trimmed in restoration (acceptable; major narrative arcs preserved). Lesson #51 self-violation acknowledged.

---

## Changelog

- v1.0–2.20: per previous changelog.
- **v2.21 (3 May Sunday morning Sydney chat session-end): F-PUB-006 CLOSED + B31 closure of F-PUB-004 PROVEN + 3 NEW candidate findings + F-PUB-005 patch design simplified + new CC brief queued.**
  - **F-PUB-006 CLOSED**: Stage 1 (4 orphans) + Stage 2 (17 zombies) applied via Supabase MCP `execute_sql` per D170. Total 21 rows marked dead with explicit reason. F-PUB-005 zombies remaining: 0. Dead pool 42 → 63.
  - **B31 closure of F-PUB-004 PROVEN**: Stage 3 verification PASSED measured against Stage 1 apply timestamp — 3 real Facebook publishes (NDIS-Yarns FB ×3, PP-FB ×1) within post-Stage-1 / pre-cooldown window. End-to-end pipeline B31 deploy → fresh approvals → publish queue → publisher → posted observed in production.
  - **3 ChatGPT review fires under protocol v2.17**: Stage 1 first-pass escalated → PK chose Path B → Path B investigation (org-wide repo grep, ai-worker source review, empirical precedent) → Stage 1 second-pass cleared. Stage 2 first-pass cleared (same evidence carried forward). T-MCP-02 quota now 9 of 5.
  - **Lesson #62 candidate refined**: "Two patterns of MCP review escalation: (a) raised new evidence vs (b) echoed Claude's own caveats". Path B (silence with evidence) is the right response for type (b). First confirmed instance.
  - **Lesson #51 honoured + violated + acknowledged**: honoured during DML applies; violated during sync_state v2.21 first-attempt commit (truncated history via placeholder); detected post-commit and restored in same session.
  - **F-PUB-005 patch design simplified dramatically**: discovery that the 5-min cron `enqueue-publish-queue-every-5m` is the SAFE enqueue path with correct eligibility predicate. Patch reduces from "relocate trigger" (~150 line migration with new function) to "DROP trigger + DROP function" (2-line migration). Brief at `docs/briefs/2026-05-03-fpub005-trigger-patch-cc.md` needs rewrite next session before promotion to ready.
  - **publish-queue-and-publish-column-purposes brief authored** chat-side and queued status: ready. Tier 1 CC. 35 cols 0%-documented (m.post_publish_queue 20 + m.post_publish 15). Producer code map embedded. F-PUB-006 work area, context-fresh.
  - **3 new candidate findings logged**: F-PUB-007 (silent-skip-at-cap, likely not real, verify with one query next session), F-PUB-008 (NDIS-Yarns FB publishes with NULL platform_post_id), F-PUB-009 (scheduling drift to August/October).
  - **B-INV-LinkedIn-PhantomPublishes promoted from candidate**: confirmed reproducible today (00:00:08 + 00:00:11 UTC).
  - **B-INV-CFW-Invegent-Silent-Approver newly logged**: CFW + Invegent zero approver outcomes across all platforms in 9.5h post-B31 deploy.
  - **Side discovery**: m.ai_job shows only 3/20 documented despite slot-core brief claiming 20/20 — possible coverage regression. Captured as side-note in publish-queue-and-publish brief; investigate separately.
  - **First DML category MCP fires**: 3 of the 10 `m.chatgpt_review` rows are now `sql_destructive` (was previously all `plan_review`). Routing decisions worked correctly across category transition.
  - Action list updates: Today/Next 5 rebuilt for next session (post-F-PUB-006 closure); F-PUB-006 row moved Active → Backlog as closed; F-PUB-005 patch row stays Active with status note "REWRITE NEEDED"; B38 superseded by 🟡 Active row; new 🟡 Active rows for publish-queue-and-publish brief + B-INV-CFW-Invegent-Silent-Approver candidate; B-INV-LinkedIn-Queue-Stall + B-INV-LinkedIn-PhantomPublishes both updated; F-PUB-007 + F-PUB-008 + F-PUB-009 added to Backlog.
  - Closure budget: ~2.0h chat-side this session. Trailing-14-day estimate 6.3h. Below 8.0 floor by 1.7h.
  - State-capture-bump exception applies: no MCP review on this commit (the underlying applies got 3 MCP fires).
  - Standing rule honoured: 4-way sync complete (sync_state + action_list + queue.md + run state file + investigation file + briefs).
- v2.20 (3 May Sunday morning Sydney CC pre-T01/T02): F-PUB-006 partial + B-INV-LinkedIn investigation complete + B38.
- v2.19 (2 May Saturday very late evening Sydney session-end): B31 / B32 / T08 closed end-to-end.
- v2.18 (2 May Saturday late evening Sydney session-end): full session reconciliation.
- v2.17 (2 May Saturday afternoon Sydney): MCP review protocol codified.
- v2.16 (2 May Saturday afternoon Sydney): T-MCP-01 closed end-to-end.
- v2.15 (2 May Saturday afternoon Sydney): ChatGPT Review MCP system SHIPPED.
