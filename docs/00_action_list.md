# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-02 Saturday late evening Sydney session-end (v2.18 — **session-end full reconciliation**). Two major workstreams shipped end-to-end this session: (1) T-MCP-01 closure + MCP review protocol v2.17 codification; (2) D182 nightly-health-check brief shape #3 validated across v1 → v2 → v2.1 + Cowork prompt v2.1 (cold-start fix) + scheduled at 02:00 AEST daily. Slice 3 build path ground-reset to closure-first discipline per ChatGPT review (review_id `624de0ce-...`). B31 reconfirmed as next-session-active. D186 closure discipline authoring owed at next session start.

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S17)
3. Asks PK about Personal businesses
4. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool (live since v2.15). **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17 — 7 call-side context fields + 6-step response procedure when escalation fires. **v2.18 honest limitation**: this bump committed without ChatGPT cross-check per state-capture-bump exception. T-MCP-04 codification still half-pending the standing-prompt-template update in claude.ai project system prompt.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-02 Saturday late evening Sydney session-end.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **Morning check on first scheduled Cowork run** | P0 | Sun 3 May 02:00 AEST = Sat 2 May 16:00 UTC. First unobserved scheduled fire of nightly-health-check v2.1. | PK signals "morning check" or "done"; chat fetches state file from GitHub |
| 3 | **D186 closure discipline** authoring | P0 | Owed from this session — chat conceded twice in writing then ran out of time | Author as doc-only decision codifying hard time cap on find-vs-fix |
| 4 | **B32 cooldown design choice** (SQL filter vs EF filter) | P0 | Gates B31 reconstruction | Chat presents both options; MCP review per protocol; PK chooses |
| 5 | **B31 reconstruct auto-approver v1.6.0 EF source** | P0 | Closes F-PUB-004 cascade visible in tonight's nightly health check (3h pipeline stasis, ai_job 24h zero) | Chat authors EF source per B32 outcome + protocol v2.17 MCP review BEFORE deploy |

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-T08 (per v2.14) | (see v2.14) | (see v2.14) |
| S17 (per v2.15) | ChatGPT Review MCP cost + idempotency rate | `SELECT count(*) AS calls, sum(input_tokens + output_tokens) AS total_tokens, count(*) FILTER (WHERE status='completed') AS completed_count, count(*) FILTER (WHERE response_jsonb IS NULL) AS escalated_or_failed FROM m.chatgpt_review WHERE created_at > NOW() - INTERVAL '7 days'` | Spend > $35 in any 30-day window → check budget allocation; idempotency hit rate < 10% over 50+ calls → review proposal/context shape; escalation rate > 40% → reviewer prompt may be too aggressive. **NEW v2.18: minimum-n guard — skip threshold alerts if calls < 10. Small-sample escalation rates are misleading.** |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| T02 | Gate B exit decision — extended 24h | P0 | Sun 3 May | PK + chat | Re-check 5-signal obs panel; ratify if all clean | `docs/audit/runs/2026-05-02-t02-extension.md` |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | Awareness only — already passed | |
| T04 | R01 calibration session | P1 | Sun 3 May / Mon 4 May | PK + chat | 90min hard cap | |
| T05 | Meta dev support contact | P1 | ASAP — Mon 4 May latest | PK | Single conversation | |
| T06 | Reconnect YouTube OAuth — UNBLOCKED (T17 deployed) | P1 | Within 7 days | PK | Reconnect OAuth at user/account level | |
| T07 | Instagram publisher recovery | P1 | Gated on T08 EF + T10 + T09 + T05 | mixed | Step 4 revised; T08 EF still needed | |
| T08 | **Auto-approver patch — split status: SQL v5 LIVE / EF v1.6.0 DEFERRED** | P0 | EF deploy next session | chat → MCP review (per protocol) → PK | Reconstruct EF source per B31 |
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
**Workstream 2 status: 80% complete — SQL v5 LIVE, Path B + B28 applied; v1.6.0 EF deferred to next session via B31.**
**Meta-tooling — ChatGPT Review MCP: SHIPPED v2.15. T-MCP-01 closed v2.16. Protocol codified v2.17. Production fires at 4 of 5 (T-MCP-02) v2.18.**
**D182 brief shape #3 (pipeline-state digest): VALIDATED v2.18. Scheduled in Cowork at 02:00 AEST daily.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP (per v2.15, protocol v2.17, T-MCP-02 progress v2.18)

Meta-infrastructure for the standing rule from D-01. **Status: LIVE, validated, protocol-codified, 4 production fires captured.** All artefacts deployed; claude.ai connector connected at 2026-05-02 03:16:48 UTC; OAuth flow validated via DB inspection. Procedure codified at `docs/runtime/mcp_review_protocol.md` v2.17.

| Artefact | Where | Status |
|---|---|---|
| `m.chatgpt_review` table | Supabase | Live (31 cols, 5 idx, 16 constraints; **4 rows now: smoke test + T-MCP-01 + cowork prompt review + Slice 3 plan_review**) |
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

**Tool**: `ask_chatgpt_review(proposal, context, action_type)` — confirmed available in fresh claude.ai chat sessions via `tool_search` deferred-load.

**Production fires log (T-MCP-02 progress: 4 of 5):**
| # | Time (UTC) | review_id | action_type | proposal target | outcome |
|---|---|---|---|---|---|
| 1 (smoke) | 02:08 | `5cdc1d02-...` | (test) | PowerShell smoke test | proceed/agree/low/high |
| 2 (T-MCP-01) | 05:48 | `2bab95d5-...` | plan_review | T02 Gate B exit decision | escalate_explicit_flag → PK chose Path A (extend 24h) |
| 3 | ~07:00 | `af420233-...` | plan_review | Cowork prompt v2.1 patch | apply_corrected (chat applied with clarifier added) |
| 4 | 11:17 | `624de0ce-...` | plan_review | Slice 3 build path | escalate_explicit_flag (high confidence) → PK fired separate ChatGPT review externally; combined synthesis ground-reset to closure-first |

**Cost so far**: 7,602 total tokens across 4 fires = ~$0.0023 estimated burn. Budget headroom enormous.

**Idempotency**: UTC-day bucket; identical (proposal, context, action_type) within 24h served from cache (no double-charge, no duplicate row).

**Routing decisions** (backend-enforced):
- `proceed` — agree + low/medium risk + medium/high confidence → safe to apply
- `apply_corrected` — partial + corrected_action provided → apply ChatGPT's correction
- `escalate_disagree` / `escalate_high_risk` / `escalate_low_confidence` / `escalate_explicit_flag` / `escalate_partial_no_correction` / `escalate_schema_invalid` / `escalate_timeout` / `escalate_refusal` → human review required

**Protocol** (per v2.17 — see `docs/runtime/mcp_review_protocol.md` for canonical):
- **Call-side**: 7 named context fields required — `decision_under_review`, `production_action_if_approved`, `consequence_if_delayed`, `cost_of_waiting`, `current_evidence`, `known_weak_evidence`, `default_action`
- **Response-side on escalate=true**: don't auto-proceed; separate strong vs weak objections; state lowest-risk default; state cost of waiting; recommend a path; record PK's override or acceptance reason

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | Validate ChatGPT Review MCP from new chat | ✅ DONE 2026-05-02 afternoon | Closed — full validation evidence in v2.16 changelog |
| T-MCP-02 | Capture first 5 production tool fires in `m.chatgpt_review` | P1 — **4 of 5 captured v2.18** | Next fire fills the quota — likely B32 design review next session |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days — token leaked in chat history during build session |
| **T-MCP-04** | Operationalise D-01 standing rule | P1 | **Half-codified v2.17**: repo doc shipped. **Still pending**: PK manual update of claude.ai project system prompt template |
| T-MCP-05 (per v2.16) | Close-the-loop UPDATE on first MCP escalation row | P3 | `UPDATE m.chatgpt_review SET status='resolved', action_taken='extend_observation_24h_accept_correction', resolved_by='pk_session_2026_05_02', escalation_resolved_at=now() WHERE id='2bab95d5-36bb-47f8-88e4-75b4887d458f'`. Without this, B35 telemetry view will skew toward false-pending escalations. PK confirmation required before chat applies. |

---

## 🤖 Cowork automation (D182 — v2.18)

**Brief shapes validated**: 3 (migration drafting, audit-snapshot markdown, pipeline-state digest)
**Briefs run**: 9 (incl. nightly-health-check-v1 v1 + v2)
**Production writes from automation**: 0 (mandatory threshold preserved across all 9 runs)
**Scheduled tasks live**: 1 — "ICE Nightly Health Check" daily 02:00 AEST

| Artefact | Where | Status |
|---|---|---|
| Automation v1 spec | `docs/runtime/automation_v1_spec.md` | Live + extended 2 May with after-run handover loop + pre-flight discipline |
| Cowork executor prompt | `docs/runtime/cowork_prompt.md` | v2.1 (cold-start fix) |
| State file template | `docs/runtime/state_file_template.md` | Live |
| Brief queue | `docs/briefs/queue.md` | Live |
| Q inbox | `docs/runtime/claude_questions.md` | 4 questions all closed (audit-slice-2-001, nightly-health-check-v1 001 + 002, post-render-log 001 — open awaiting next-session migration apply) |
| Run state files | `docs/runtime/runs/` | 9 files |
| MCP review protocol | `docs/runtime/mcp_review_protocol.md` | v2.17 |

**Brief shape #3 lock**: nightly-health-check-v1 v2.1 with slice-notation Q-true-stuck SQL. Hit 7-of-7 measurable thresholds on v2 second run. Cowork can fire on the prompt cold without context-setting from PK.

**Sunset review**: 12 May 2026. Portfolio at 9 briefs / 3 shapes — comfortably justifies framework continuation.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| F04 | post_render_log column-purposes | P2 | review_required (Cowork autonomously ran 2026-05-02T10:20:54Z) | chat | Apply migration `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql` via Supabase MCP per D170. Resolve Q-post-render-log-column-purposes-001 (recommend Option A). |

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

Unchanged from v2.11. **D186 closure discipline** authoring is owed next session start (chat conceded in writing this session, ran out of time before authoring).

---

## 📌 Backlog

| ID | Item | Priority | Trigger |
|---|---|---|---|
| B01–B22, B24–B27 | (per v2.10) | varies | per item |
| ~~B16, B17, B18, B23, B30~~ | CLOSED | | |
| B28 | Verify operator intent for CFW IG / Invegent IG / CFW FB auto-approve | ✅ APPLIED v2.14 (conservative: all 3 disabled) | — |
| B29 | Partial unique constraint on `c.client_publish_profile (client_id, platform) WHERE status='active' AND is_default=true` | P2 | Long-term forward-defence |
| B31 | **Reconstruct auto-approver v1.6.0 EF source** | P0 | Next session — reconstruct from current production v1.5.0 + brief 09 design + cooldown spec. **MCP review per protocol v2.17 before deploy.** |
| B32 | **Cooldown design decision: SQL filter vs EF filter** | P0 | Next session — chat presents both options to PK; MCP review per protocol; choose one |
| B33 | **Brief artefact retention rule** | P2 | Process improvement |
| B34 (per v2.15) | Add `estimated_cost_usd` calculation in chatgpt-review-worker | P3 | Cosmetic |
| B35 (per v2.15) | Telemetry view `m.chatgpt_review_daily` | P3 | Materialised view |
| **B36 (NEW v2.18)** | **Slice 3 v0 spec authoring** | P2 | Trigger: B31 deployed + LinkedIn P1 closed + D186 codified + at least 1 month of nightly-health-check observation. **Per ChatGPT review on Slice 3 build path: "You don't need more discovery yet. You need closure discipline + one minimal audit prototype."** v0 minimal: single EF + manual HTTP trigger + tool surface (GitHub read with path-restricted read paths, GitHub write to `docs/audit/runs/{date}-data.md` only, Supabase SELECT-only). NO cron. NO new telemetry table. NO Q&A loop. Test value-of-Slice-3 hypothesis with manual fires before adding observability scaffolding. v1 architecture (deferred until v0 surfaces signal): two separate workers, two separate OpenAI keys, two separate budgets ($50/mo `ice-review` + $20/mo `ice-audit`). **Earliest authoring: 4-5 sessions out.** |
| **B-INV-LinkedIn-Queue-Stall (NEW v2.18)** | **Investigate 5 LinkedIn × Property Pulse true-stuck drafts** | P1 | Next session after B31. Hypothesis order locked from PK turn: (1) Publisher eligibility predicate mismatch; (2) Queue row state transition bug; (3) OAuth/token silently invalid; (4) Throttle/rate-limit gate; (5) Content-body validation exclusion. Sample draft IDs in `docs/audit/health/2026-05-02.md` Section 6b: 80633543, 1b994655, 5a07f80a, 07532767, e22308fd. |

---

## 🧊 Frozen / Deferred

Unchanged. Plus:
- **T08 EF v1.6.0 deploy** — deferred per Lesson #51. Resumes via B31 next session under MCP review protocol v2.17.
- **Slice 3 build (full v1)** — deferred per ChatGPT review (review_id `624de0ce-...`). v0 spec authoring after closure work. v1 build only after v0 produces signal.
- **Phase 4b (GitHub Actions validation)** — deferred per D183. Build when a brief actually demands cloud-side validation.
- **Phase 4c (OpenAI API answer step + Cowork correction pass)** — deferred per D183. Build when 2-3 briefs surface real questions PK cannot trivially answer.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, **third vindication v2.15**) — three production saves: wrong YT trigger fix (1 May), wrong bulk-quarantine of 87 legacy FB drafts (1 May night), wasted patching of Supabase EF gateway HTML quirk (2 May). Pattern *verify the actual live state before patching the wrong layer*.
- Lesson #47 candidate — 11-catch session pattern.
- Lesson #48 candidate — gate placement by consumer architecture.
- Lesson #49 candidate — eligibility vs content gates separation.
- Lesson #50 candidate — authoritative row first, eligibility predicate second.
- Lesson #51 (CONFIRMED v2.12, REINFORCED v2.14, **HONOURED v2.18**) — terminal-decision authority requires disproportionate scrutiny. Honoured this session by NOT attempting B31 in session-tail at 7+ hours.
- Lesson #52 candidate — decoupled deploys are risk-reduction.
- Lesson #53 candidate — pre-deploy diagnostic probes.
- Lesson #54 candidate — tool-level deploy gate intermittency.
- Lesson #55 candidate — queue state as gate-firing predictor.
- Lesson #56 candidate — brief artefact retention via inlining (ref. B33).
- Lesson #57 candidate — SQL/EF deploy decoupling reinforces Lesson #52.
- Lesson #58 candidate (v2.15) — *"When a platform's gateway misbehaves with a specific response type, route around on a different surface rather than fighting the platform."*
- Lesson #59 candidate (v2.16, **HONOURED v2.18**) — *"On the first real fire of a new external-review tool, default to accepting the corrected action over override."* Honoured via Path A on T02 extension.
- Lesson #60 candidate (v2.17) — *"Generic context yields generic objections; specific named-field context yields sharper challenge."*
- **Lesson #61 candidate (NEW v2.18, two-vindication-pattern)** — *"Pre-flight discipline must include `information_schema.columns` lookup AND test-running every SQL block before brief-authoring. Schema/syntax drift is the most common brief-author bug."* Surface evidence: nightly-health-check v1 had 4 schema bugs in Q7/Q9 recovered via default-and-continue (column-rename pattern); nightly-health-check v2 had 1 SQL syntax bug in Q-true-stuck recovered same way (`array_agg LIMIT` invalid Postgres). audit-slice-2 also had 6 schema-drift fallbacks earlier in week (different brief, same pattern). Promote on next vindication. Codified as canonical pre-flight requirement in `docs/runtime/automation_v1_spec.md` "Pre-flight discipline" section.

---

## v2.18 honest limitations

- All previous limitations apply.
- v2.18 committed without ChatGPT cross-check (state-capture-bump exception applies — full-session reconciliation is doc-only). Next non-state-capture bump goes through ChatGPT review under protocol v2.17.
- T-MCP-04 status: **half-codified**. Repo doc shipped. **Still pending**: PK manual update of claude.ai project system prompt to reference protocol doc and add standing-prompt-template instruction.
- v2.16 limitation re m.chatgpt_review row `2bab95d5...` close-the-loop UPDATE still pending PK confirmation (T-MCP-05).
- **D186 closure discipline NOT authored this session.** Chat conceded in writing twice and ran out of session time. Carried forward as next-session top deliverable. Honest miss.
- **F04 migration not yet applied.** Cowork autonomously drafted at 10:20:54Z with 1 LOW + 15 HIGH. Chat owes Supabase MCP apply per D170 + Q-post-render-log-001 closure (recommend Option A). Carried forward.
- **Slice 3 build path**: ground reset NOT codified as decision. Captured as B36 backlog row only. If multiple sessions pass without B36 surfacing, consider whether the strategic decision should formalise as D-numbered (D187 candidate). Honest gap.
- **First scheduled Cowork run**: tonight Sun 3 May 02:00 AEST. Unobserved. If anything goes sideways, chat investigates via state file fetch tomorrow morning.

---

## Changelog

- v1.0–2.14: per previous changelog.
- v2.15 (2 May Saturday afternoon Sydney): ChatGPT Review MCP system SHIPPED.
- v2.16 (2 May Saturday afternoon Sydney session continued): T-MCP-01 closed end-to-end. T02 Gate B exit decision was the proposal target; ChatGPT raised n=3 sample size concern; PK chose Path A.
- v2.17 (2 May Saturday afternoon Sydney session continued, third part): MCP review protocol codified in repo. PK feedback post-T-MCP-01 fire formalised as `docs/runtime/mcp_review_protocol.md`.
- **v2.18 (2 May Saturday late evening Sydney session-end): full session reconciliation.** Two major workstreams shipped end-to-end this session:
  - **(1)** T-MCP-01 closure + MCP review protocol v2.17 codification + 4 of 5 production fires captured (T-MCP-02 progress).
  - **(2)** D182 nightly-health-check brief shape #3 validated across v1 → v2 → v2.1 (7-of-7 thresholds on v2 run) + Cowork prompt v2.1 cold-start fix (validated against ChatGPT review, two pushback points addressed) + after-run handover loop codified in automation_v1_spec.md (state file is canonical handover, no paste required) + scheduled "ICE Nightly Health Check" daily 02:00 AEST in Cowork.
  - **Slice 3 build path ground-reset to closure-first discipline** per ChatGPT review on the build proposal (review_id `624de0ce-...`). Cut Slice 3 from session entirely; v0 minimal authoring earliest 4-5 sessions out after B31 + LinkedIn P1 + D186 + 1 month of nightly-health-check observation. Two-worker / two-budget architecture preserved for v1 timeline only.
  - **B31 reconfirmed as next-session-active.** B32 cooldown design choice gates B31 reconstruction.
  - **D186 closure discipline authoring owed at next session start.** Chat conceded in writing twice this session, ran out of time before authoring — honest miss carried forward.
  - **B36 (NEW)** Slice 3 v0 spec authoring captured in backlog with full constraint set.
  - **B-INV-LinkedIn-Queue-Stall (NEW)** captured as separate investigation thread post-B31.
  - **Lesson #61 candidate** (two-vindication-pattern: brief-author SQL bugs across nightly-health-check v1 + v2) codified in `docs/runtime/automation_v1_spec.md` Pre-flight discipline section.
  - **Two Lessons honoured this session**: #51 (NOT attempting B31 in session-tail) + #59 (Path A on T02 extension over Path B override).
  - Standing rule honoured: 4-way sync complete (sync_state addendum + action_list v2.18 + queue.md already up-to-date + automation_v1_spec.md extended this session).
  - State-capture-bump exception applies — no MCP review on this commit, since full-session reconciliation is doc-only.
  - No production mutations this session (only EF-internal DML via 4 ChatGPT review fires).
