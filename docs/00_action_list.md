# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-02 Saturday very late evening Sydney session-end (v2.19 — **B31 / B32 / T08 closed end-to-end this session; auto-approver v1.6.0 LIVE on Supabase version 53**). F-PUB-004 closure mechanically committed (terminal rejections begin ~T+4h after first cohort cooldowns expire ~16:30 UTC). **D186 closure discipline LOCKED** (carried from prior session; owed at session start; now in `docs/06_decisions.md`). Three MCP review fires this session under protocol v2.17 — quota T-MCP-02 now **7 of 5 (exceeded)**. Lesson #61 PROMOTED to canonical (third vindication via JSONB pre-flight). Lesson #62 candidate NEW (v1.5.0-deployed-but-not-in-repo). B37 NEW (v1.5.0 source archive governance gap captured).

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S17)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool (live since v2.15). **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17 — 7 call-side context fields + 6-step response procedure when escalation fires. **v2.19 honest limitation**: this bump committed without ChatGPT cross-check per state-capture-bump exception; the underlying B31 production deploy received 3 MCP fires which is the protocol's strongest application.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind. See § "Closure budget tracking" below.

---

## 📊 Closure budget tracking (per D186 — NEW v2.19)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~14 (estimated) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~3.5 (this session only counted so far) | 8.0 floor | 🟡 below floor — need ≥4.5h more closure work over next 13 days |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~3.5h** (B31 deploy + B32 design + T08 EF — closed three P0 items in one session). To be reflected in next session's trailing-14-day window calc.

**Methodology** (per D186): wall-clock estimate, granularity 0.25h, only sessions where the work product *closed an open finding or shipped a fix* count. Pure brief-authoring or pure exploratory build does not count toward the floor.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-02 Saturday very late evening Sydney session-end.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **Morning check on first scheduled Cowork run** | P0 | Sun 3 May 02:00 AEST = Sat 2 May 16:00 UTC. First unobserved scheduled fire of nightly-health-check v2.1. | PK signals "morning check" or "done"; chat fetches state file from GitHub |
| 3 | **S16 — verify B31 fresh-approval rate** | P0 | First success criterion that B31 actually closes F-PUB-004. ~T+24h post-deploy = ~12:40 UTC Sun 3 May. | Run S16 SQL; verify approvals across multiple (client, platform) buckets |
| 4 | **F04 migration apply** | P0 | Cowork autonomously drafted prior session at 10:20:54Z; closure-budget item per D186 | Apply `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql` via Supabase MCP per D170 + close Q-post-render-log-001 (recommend Option A) |
| 5 | **B-INV-LinkedIn-Queue-Stall investigation** | P1 | Next chat-side investigation after B31 closes; closure-budget item per D186 | Walk hypothesis order on 5 stuck PP LinkedIn drafts (sample IDs in `docs/audit/health/2026-05-02.md` Section 6b) |

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-B31 | `SELECT client_slug, platform, count(*) FILTER (WHERE approval_status='approved' AND approved_at > NOW() - INTERVAL '24 hours') AS fresh_approvals_24h FROM m.post_draft d JOIN c.client c USING (client_id) WHERE d.created_at > '2026-05-02 12:39:33'::timestamptz GROUP BY 1,2;` | Zero approvals across all (client, platform) buckets at T+24h post-deploy → investigate. **Active starting 2026-05-02 12:40 UTC.** |
| S17 (per v2.15) | ChatGPT Review MCP cost + idempotency rate | `SELECT count(*) AS calls, sum(input_tokens + output_tokens) AS total_tokens, count(*) FILTER (WHERE status='completed') AS completed_count, count(*) FILTER (WHERE response_jsonb IS NULL) AS escalated_or_failed FROM m.chatgpt_review WHERE created_at > NOW() - INTERVAL '7 days'` | Spend > $35 in any 30-day window → check budget allocation; idempotency hit rate < 10% over 50+ calls → review proposal/context shape; escalation rate > 40% → reviewer prompt may be too aggressive. Minimum-n guard — skip threshold alerts if calls < 10. |
| S18 (NEW v2.19) | D186 closure budget (per session start) | Read open-finding count from `📌 Backlog` + `🟡 Active` (P0+P1 only) + `docs/audit/open_findings.md`; sum trailing-14-day closure hours from sync_state session logs | If open count > 20 OR trailing-14-day hours < 8.0 → surface to PK before any new work. If trailing-14-day < 8.0 for 14+ days running → automation-authoring pause active per D186 rule 3. |

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
**Workstream 2 status: ✅ COMPLETE 2 May late evening — SQL v5 LIVE (prior session), EF v1.6.0 LIVE (this session), F-PUB-004 closure mechanically committed.**
**Meta-tooling — ChatGPT Review MCP: SHIPPED v2.15. T-MCP-01 closed v2.16. Protocol codified v2.17. Production fires at 4 of 5 v2.18, now 7 of 5 EXCEEDED v2.19.**
**D182 brief shape #3 (pipeline-state digest): VALIDATED v2.18. Scheduled in Cowork at 02:00 AEST daily.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP (v2.19 update — T-MCP-02 quota EXCEEDED)

Meta-infrastructure for the standing rule from D-01. **Status: LIVE, validated, protocol-codified, 7 production fires captured (quota of 5 exceeded).** All artefacts deployed; claude.ai connector connected at 2026-05-02 03:16:48 UTC. Procedure codified at `docs/runtime/mcp_review_protocol.md` v2.17.

| Artefact | Where | Status |
|---|---|---|
| `m.chatgpt_review` table | Supabase | Live (31 cols, 5 idx, 16 constraints; **7 rows now: smoke + T-MCP-01 + cowork prompt + Slice 3 plan_review + B32 design + v1.6.0 first-cut + v1.6.0 rebased**) |
| `m.mcp_oauth_client` table | Supabase | Live (DCR registry — 7 rows: 1 working `mcp_69ff8298...` + 6 dead from build-period registrations) |
| `m.mcp_oauth_code` table | Supabase | Live (auth code registry — 1 row, consumed) |
| `chatgpt-review-worker` EF | Supabase | Live v1.0 (gpt-4o-mini, json_schema strict, 30s timeout, internal-only) |
| `mcp-chatgpt-bridge` EF | Supabase | Live v1.2.2 (OAuth 2.1 + DCR + PKCE) |
| `app/mcp-consent/page.tsx` | invegent-dashboard / Vercel | Live |
| OpenAI Project `ice-review` | OpenAI | Live ($50/mo alert at $35 + 100%) |
| Service-account key `chatgpt-review-worker-v1` | OpenAI | Live (separate from ai-worker's project) |
| Supabase secrets | Supabase | All 3 set: `OPENAI_REVIEW_API_KEY`, `MCP_BRIDGE_BEARER_TOKEN`, `INTERNAL_WORKER_TOKEN` |
| claude.ai connector | claude.ai | Connected; client `mcp_69ff8298c1e006f509f104b30a0934d9` |
| Protocol doc | repo | `docs/runtime/mcp_review_protocol.md` v2.17 |

**Production fires log (T-MCP-02 quota EXCEEDED — 7 of 5):**
| # | Time (UTC) | review_id | action_type | proposal target | outcome |
|---|---|---|---|---|---|
| 1 (smoke) | 02:08 | `5cdc1d02-...` | (test) | PowerShell smoke test | proceed/agree/low/high |
| 2 (T-MCP-01) | 05:48 | `2bab95d5-...` | plan_review | T02 Gate B exit decision | escalate_explicit_flag → PK chose Path A (extend 24h) |
| 3 | ~07:00 | `af420233-...` | plan_review | Cowork prompt v2.1 patch | apply_corrected (chat applied with clarifier added) |
| 4 | 11:17 | `624de0ce-...` | plan_review | Slice 3 build path | escalate_explicit_flag → PK fired separate ChatGPT review externally; combined synthesis ground-reset to closure-first |
| 5 (NEW v2.19) | ~12:00 | `d38ba055-...` | plan_review | B32 cooldown design choice | escalate (weak objections) → PK chose Path 3 — full correction (Option B + EF cooldown) |
| 6 (NEW v2.19) | ~12:15 | `2d09be1d-...` | plan_review | v1.6.0 first-cut patch (auto-approver) | escalate (JSONB validation gap) → Lesson #61 self-flag → closed via 967/967 SELECT |
| 7 (NEW v2.19) | ~12:25 | `304a87cc-...` | plan_review | v1.6.0 rebased patch (post v1.5.0 baseline drift discovery) | escalate (source_score classification) → PK chose defence-in-depth |

**Cost so far**: ~10K total tokens estimated across 7 fires = ~$0.003 estimated burn. Budget headroom enormous.

**Idempotency**: UTC-day bucket; identical (proposal, context, action_type) within 24h served from cache (no double-charge, no duplicate row).

**Routing decisions** (backend-enforced):
- `proceed` — agree + low/medium risk + medium/high confidence → safe to apply
- `apply_corrected` — partial + corrected_action provided → apply ChatGPT's correction
- `escalate_*` — human review required (disagree / high_risk / low_confidence / explicit_flag / partial_no_correction / schema_invalid / timeout / refusal)

**Protocol** (per v2.17 — see `docs/runtime/mcp_review_protocol.md` for canonical):
- **Call-side**: 7 named context fields required — `decision_under_review`, `production_action_if_approved`, `consequence_if_delayed`, `cost_of_waiting`, `current_evidence`, `known_weak_evidence`, `default_action`
- **Response-side on escalate=true**: don't auto-proceed; separate strong vs weak objections; state lowest-risk default; state cost of waiting; recommend a path; record PK's override or acceptance reason

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | Validate ChatGPT Review MCP from new chat | ✅ DONE 2026-05-02 afternoon | Closed |
| T-MCP-02 | Capture first 5 production tool fires in `m.chatgpt_review` | ✅ EXCEEDED v2.19 (7 of 5 captured; B32 + v1.6.0 first-cut + v1.6.0 rebased pushed past quota) | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days — token leaked in chat history during build session |
| **T-MCP-04** | Operationalise D-01 standing rule | P1 | **Half-codified v2.17**: repo doc shipped. **Still pending**: PK manual update of claude.ai project system prompt template |
| T-MCP-05 (per v2.16) | Close-the-loop UPDATE on first MCP escalation row | P3 | `UPDATE m.chatgpt_review SET status='resolved', action_taken='extend_observation_24h_accept_correction', resolved_by='pk_session_2026_05_02', escalation_resolved_at=now() WHERE id='2bab95d5-36bb-47f8-88e4-75b4887d458f'`. Without this, B35 telemetry view will skew toward false-pending escalations. PK confirmation required. **Closure-budget item per D186.** |

---

## 🤖 Cowork automation (D182 — v2.19)

**Brief shapes validated**: 3 (migration drafting, audit-snapshot markdown, pipeline-state digest)
**Briefs run**: 10 (incl. nightly-health-check-v1 v1 + v2)
**Production writes from automation**: 0 (mandatory threshold preserved across all 10 runs)
**Scheduled tasks live**: 1 — "ICE Nightly Health Check" daily 02:00 AEST

| Artefact | Where | Status |
|---|---|---|
| Automation v1 spec | `docs/runtime/automation_v1_spec.md` | Live + extended 2 May with after-run handover loop + pre-flight discipline |
| Cowork executor prompt | `docs/runtime/cowork_prompt.md` | v2.1 (cold-start fix) |
| State file template | `docs/runtime/state_file_template.md` | Live |
| Brief queue | `docs/briefs/queue.md` | Live |
| Q inbox | `docs/runtime/claude_questions.md` | 4 questions all closed; post-render-log-001 pending Option A acceptance + apply |
| Run state files | `docs/runtime/runs/` | 10 files (added B31 deploy run state this session) |
| MCP review protocol | `docs/runtime/mcp_review_protocol.md` | v2.17 |

**Sunset review**: 12 May 2026. Portfolio at 10 briefs / 3 shapes — comfortably justifies framework continuation. Note: B31 was NOT a D182 brief — chat-driven directly with three MCP review fires.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| F04 | post_render_log column-purposes | P2 | review_required (Cowork autonomously ran 2026-05-02T10:20:54Z) | chat | Apply migration `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql` via Supabase MCP per D170. Resolve Q-post-render-log-column-purposes-001 (recommend Option A). **Closure-budget item per D186.** |
| B-INV-LinkedIn-Queue-Stall | Investigate 5 LinkedIn × Property Pulse true-stuck drafts | P1 | open investigation | chat | Walk hypothesis order: (1) Publisher eligibility predicate mismatch; (2) Queue row state transition bug; (3) OAuth/token silently invalid; (4) Throttle/rate-limit gate; (5) Content-body validation exclusion. Sample draft IDs: 80633543, 1b994655, 5a07f80a, 07532767, e22308fd. **Closure-budget item per D186.** |

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
| ~~B16, B17, B18, B23, B30~~ | CLOSED | | |
| ~~B31, B32~~ | ✅ **CLOSED 2 May late evening** — auto-approver v1.6.0 LIVE; B32 Path 3 chosen + applied as EF cooldown defence-in-depth (4h window via JSONB) | — | — |
| B28 | Verify operator intent for CFW IG / Invegent IG / CFW FB auto-approve | ✅ APPLIED v2.14 (conservative: all 3 disabled) | — |
| B29 | Partial unique constraint on `c.client_publish_profile (client_id, platform) WHERE status='active' AND is_default=true` | P2 | Long-term forward-defence |
| B33 | Brief artefact retention rule | P2 | Process improvement |
| B34 | Add `estimated_cost_usd` calculation in chatgpt-review-worker | P3 | Cosmetic |
| B35 | Telemetry view `m.chatgpt_review_daily` | P3 | Materialised view |
| B36 | **Slice 3 v0 spec authoring** | P2 | Trigger now extended per D186: B31 deployed (✅ DONE this session) + LinkedIn P1 closed + D186 codified (✅ DONE this session) + at least 1 month of nightly-health-check observation **+ closure-budget headroom per D186 rule 3** (no automation-pause active). v0 minimal: single EF + manual HTTP trigger + path-restricted GitHub read + Supabase SELECT-only. **Earliest authoring: 4-5 sessions out** with closure budget honoured. |
| **B37 (NEW v2.19)** | **v1.5.0 source archive governance** | P3 | Forward-defence per Lesson #62 candidate. Surface evidence: v1.5.0 was deployed via Supabase EF dashboard without corresponding push to `supabase/functions/auto-approver/index.ts`, creating a 4-week record-of-truth gap that surfaced as confusion during B31's v1.6.0 baseline rebase. Forward defence: every EF deploy via chat MCP automatically pushes source to repo first; manual dashboard deploys are last-resort and require same-session repo backfill. Build when standing rule needs codification or when a second instance surfaces. |

---

## 🧊 Frozen / Deferred

Unchanged. Plus:
- **Slice 3 build (full v1)** — deferred per ChatGPT review (review_id `624de0ce-...`) AND D186 closure-budget gate. v0 spec authoring after closure work. v1 build only after v0 produces signal.
- **Phase 4b (GitHub Actions validation)** — deferred per D183. Build when a brief actually demands cloud-side validation.
- **Phase 4c (OpenAI API answer step + Cowork correction pass)** — deferred per D183. Build when 2-3 briefs surface real questions PK cannot trivially answer.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15) — three production saves: wrong YT trigger fix (1 May), wrong bulk-quarantine of 87 legacy FB drafts (1 May night), wasted patching of Supabase EF gateway HTML quirk (2 May). Pattern *verify the actual live state before patching the wrong layer*.
- Lesson #47–#50 candidates (per v2.13).
- Lesson #51 (CONFIRMED v2.12, REINFORCED v2.14, **HONOURED + REINFORCED v2.19**) — terminal-decision authority requires disproportionate scrutiny. v2.19: most-scrutinised single deploy in ICE history (3 MCP fires + JSONB pre-flight + baseline drift correction + defence-in-depth on source_score).
- Lesson #52–#57 candidates (per v2.13).
- Lesson #58 candidate (v2.15) — *"When a platform's gateway misbehaves with a specific response type, route around on a different surface rather than fighting the platform."*
- Lesson #59 candidate (v2.16, HONOURED v2.18) — *"On the first real fire of a new external-review tool, default to accepting the corrected action over override."*
- Lesson #60 candidate (v2.17) — *"Generic context yields generic objections; specific named-field context yields sharper challenge."*
- **Lesson #61 PROMOTED to canonical (v2.19, third vindication)** — *"Pre-flight discipline must include JSONB-path validation (`SELECT ... FROM ... WHERE jsonb_path_exists`) on every brief- or patch-referenced JSONB field, AND `information_schema.columns` lookup on every brief-referenced table, AND test-running every SQL block before brief/patch authoring. Schema/syntax/JSONB-path drift is the most common author bug."* Three vindications: nightly-health-check v1 (Q7/Q9 schema bugs), nightly-health-check v2 (Q-true-stuck SQL syntax bug), B31 v1.6.0 patch (JSONB validation gap caught by MCP review #2, closed via 967/967 SELECT). Codified in `docs/runtime/automation_v1_spec.md` Pre-flight discipline section.
- **Lesson #62 candidate (NEW v2.19)** — *"Production EF source must be in repo BEFORE deploy. v1.5.0 was deployed via Supabase EF dashboard without corresponding push to supabase/functions/auto-approver/index.ts, creating a 4-week record-of-truth gap that surfaced as confusion during v1.6.0 baseline rebase. Forward defence: every EF deploy via chat MCP automatically pushes source to repo first; manual dashboard deploys are last-resort and require same-session repo backfill."* B37 captures the governance work; promote when seen in 2+ more sessions or when standing rule codified.

---

## v2.19 honest limitations

- All previous limitations apply.
- v2.19 committed without ChatGPT cross-check (state-capture-bump exception applies — full-session reconciliation is doc-only). The underlying B31 production deploy received 3 MCP review fires which is the protocol's strongest application.
- T-MCP-04 status: **half-codified**. Repo doc shipped. **Still pending**: PK manual update of claude.ai project system prompt to reference protocol doc and add standing-prompt-template instruction.
- T-MCP-05 close-the-loop UPDATE on `m.chatgpt_review` row `2bab95d5-...` still pending PK confirmation.
- **F04 migration not yet applied.** Cowork autonomously drafted at 10:20:54Z prior session. Chat owes Supabase MCP apply per D170 + Q-post-render-log-001 closure (recommend Option A). Active row.
- **B31 closure observability**: F-PUB-004 cascade closure mechanically committed but first observable terminal rejection is ~T+4h (16:30 UTC) when first cohort cooldowns expire. Fresh approvals begin ~T+4-6h. S16 verification at ~T+24h Sun 3 May.
- **Slice 3 build path**: ground reset codified into B36 backlog row + D186 closure-budget gate. If multiple sessions pass without B36 surfacing as needed, consider whether the strategic decision should formalise as D-numbered (D187 candidate). Honest gap.
- **First scheduled Cowork run**: tonight Sun 3 May 02:00 AEST. Unobserved. If anything goes sideways, chat investigates via state file fetch tomorrow morning.
- **Closure budget**: this session contributed ~3.5h closure work (B31 + B32 + T08). Trailing-14-day window calc deferred to next session header — current row uses single-session estimate as starting point.

---

## Changelog

- v1.0–2.14: per previous changelog.
- v2.15 (2 May Saturday afternoon Sydney): ChatGPT Review MCP system SHIPPED.
- v2.16 (2 May Saturday afternoon Sydney session continued): T-MCP-01 closed end-to-end.
- v2.17 (2 May Saturday afternoon Sydney session continued, third part): MCP review protocol codified in repo.
- v2.18 (2 May Saturday late evening Sydney session-end): full session reconciliation. T-MCP-01 closure + protocol v2.17 codification; D182 brief shape #3 validated v1 → v2 → v2.1.
- **v2.19 (2 May Saturday very late evening Sydney session-end): B31 / B32 / T08 closed end-to-end this session.** Two major shifts:
  - **(1) B31 / B32 / T08 all closed.** Auto-approver v1.6.0 LIVE on Supabase (version 53 ACTIVE). F-PUB-004 starvation cascade mechanically committed to closure (4h cooldown delay before first observable terminal rejections). Three MCP review fires under protocol v2.17 (B32 design + v1.6.0 first-cut + v1.6.0 rebased). JSONB pre-flight validation 967/967. Source baseline drift discovered + corrected (v1.5.0 retrieved via Supabase MCP `get_edge_function`). Defence-in-depth applied to source_score. **First chat-driven EF deploy in ICE history** via Supabase MCP `deploy_edge_function`. Run state at `docs/runtime/runs/2026-05-02-b31-auto-approver-v160-deploy.md` (commit `d5679c61`).
  - **(2) D186 closure-first discipline LOCKED.** 20-finding cap on P0+P1 + 4h/week closure floor + 2-week pause trigger. Sunset 30 June 2026. Per § "Closure budget tracking" above. New top-of-file metric row added. New S18 standing check added. Decisions.md commit `9d4233bb`.
  - **Lesson #61 PROMOTED to canonical** — third vindication via JSONB-path validation gap caught by MCP review #2 this session, closed via 967/967 SELECT before deploy.
  - **Lesson #62 candidate (NEW)** — *"Production EF source must be in repo BEFORE deploy."* Surface evidence: v1.5.0 dashboard-only deploy created 4-week record-of-truth gap.
  - **B37 NEW** — v1.5.0 source archive governance gap captured (forward defence: chat MCP deploy = repo push first).
  - **T-MCP-02 quota EXCEEDED** — was 5; now 7 with 3 fires this session. Total `m.chatgpt_review` rows now 7.
  - **Workstream 2 status: COMPLETE.**
  - **Lesson #51 honoured at scale** — most-scrutinised single deploy in ICE history.
  - Standing rule honoured: 4-way sync complete (sync_state addendum + action_list v2.19 + queue.md unchanged + decisions.md D186 NEW + run state file NEW).
  - State-capture-bump exception applies — no MCP review on this commit (the underlying deploy got 3 MCP fires which is the protocol's strongest application).
  - No production mutations this session by chat directly. EF-internal mutations: 3 m.chatgpt_review rows from MCP review fires + 1 EF deploy via Supabase MCP. 1 github commit (`f65e16d2`) before the reconciliation commits (`d5679c61` run state + `9d4233bb` D186 + this commit).
