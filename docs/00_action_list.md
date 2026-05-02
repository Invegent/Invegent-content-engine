# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-02 Saturday afternoon Sydney session continued (v2.17 — **MCP review protocol codified in repo**). PK feedback post-T-MCP-01 fire formalised as `docs/runtime/mcp_review_protocol.md`: 7 named context fields when calling `ask_chatgpt_review`; 6-step response procedure when tool returns `escalate=true`. T-MCP-04 progresses to half-codified (repo doc shipped; project system prompt update in claude.ai still pending PK manual edit). v2.16 state carries forward: T-MCP-01 closed, T02 extended 24h, B31 active next focus.

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S17)
3. Asks PK about Personal businesses
4. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **As of v2.15 the mechanism for that cross-check is now automated** — `ask_chatgpt_review` MCP tool replaces what was previously copy-paste back-and-forth. **As of v2.17 the procedure for using the tool is canonical at `docs/runtime/mcp_review_protocol.md`** — 7 call-side context fields + 6-step response procedure when escalation fires. **v2.15/v2.16/v2.17 honest limitation**: these bumps committed without ChatGPT cross-check per state-capture-bump exception. T-MCP-04 codification still pending the standing-prompt-template update in claude.ai project system prompt.

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-02 Saturday afternoon Sydney session, post-T-MCP-01 closure + protocol codification.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | T-MCP-01: Validate ChatGPT Review MCP from new chat | ✅ DONE | Closed 2026-05-02 afternoon — full mechanism validated end-to-end | review_id `2bab95d5-36bb-47f8-88e4-75b4887d458f`; row in `m.chatgpt_review` verified |
| 3 | T02 Gate B exit — **EXTENDED 24h** | P0 → carries to Sun 3 May | MCP review raised valid sample-size concern (n=3 shadow ai_jobs vs <5% target); cost of waiting zero | Re-check 5-signal panel Sun 3 May; ratify if all clean. Memo: `docs/audit/runs/2026-05-02-t02-extension.md` |
| 4 | **B31: Reconstruct auto-approver v1.6.0 EF source** ← ACTIVE NEXT | P0 | T-MCP-01 + T02 closed/extended; first real-stakes use of MCP review tool **under codified protocol** | Author from production v1.5.0 + brief 09 design + cooldown spec (per B32 design choice); MCP review (per protocol) BEFORE deploy |
| 5 | MONITOR auto-approver next cron tick (S16) | P0 | First tick after T08 SQL v5 live | Run S16 query on first cron tick post-session |

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-T08 (per v2.14) | (see v2.14) | (see v2.14) |
| S17 (per v2.15) | ChatGPT Review MCP cost + idempotency rate | `SELECT count(*) AS calls, sum(input_tokens + output_tokens) AS total_tokens, count(*) FILTER (WHERE status='completed') AS completed_count, count(*) FILTER (WHERE response_jsonb IS NULL) AS escalated_or_failed FROM m.chatgpt_review WHERE created_at > NOW() - INTERVAL '7 days'` | Spend > $35 in any 30-day window → check budget allocation; idempotency hit rate < 10% over 50+ calls → review proposal/context shape (likely too noisy for cache to help); escalation rate > 40% → reviewer prompt may be too aggressive |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| T02 | Gate B exit decision — **extended 24h** | P0 | ~~Sat 2 May~~ → **Sun 3 May** (per T-MCP-01) | PK + chat | Re-check 5-signal obs panel; ratify if all clean | `docs/audit/runs/2026-05-02-t02-extension.md` |
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
**Workstream 2 status: 80% complete — SQL v5 LIVE, Path B + B28 applied; v1.6.0 EF deferred to next session.**
**Meta-tooling — ChatGPT Review MCP: SHIPPED v2.15. T-MCP-01 closed v2.16. Protocol codified v2.17.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP (per v2.15)

Meta-infrastructure for the standing rule from D-01. **Status: LIVE, validated, and protocol-codified.** All artefacts deployed; claude.ai connector connected at 2026-05-02 03:16:48 UTC; OAuth flow validated via DB inspection. **First real production fire captured 2026-05-02 ~05:48 UTC (T-MCP-01).** **Procedure codified at `docs/runtime/mcp_review_protocol.md` v2.17.**

| Artefact | Where | Status |
|---|---|---|
| `m.chatgpt_review` table | Supabase | Live (31 cols, 5 idx, 16 constraints; 2 rows: PowerShell test + T-MCP-01 first real fire) |
| `m.mcp_oauth_client` table | Supabase | Live (DCR registry — 7 rows: 1 working `mcp_69ff8298...` + 6 dead from build-period registrations; corrected from initial doc count of 5) |
| `m.mcp_oauth_code` table | Supabase | Live (auth code registry — 1 row, consumed) |
| `chatgpt-review-worker` EF | Supabase | Live v1.0 (gpt-4o-mini, json_schema strict, 30s timeout, internal-only) |
| `mcp-chatgpt-bridge` EF | Supabase | Live v1.2.2 (OAuth 2.1 + DCR + PKCE) |
| `app/mcp-consent/page.tsx` | invegent-dashboard / Vercel | Live |
| OpenAI Project `ice-review` | OpenAI | Live ($50/mo alert at $35 + 100%) |
| Service-account key `chatgpt-review-worker-v1` | OpenAI | Live (separate from ai-worker's project) |
| Supabase secrets | Supabase | All 3 set: `OPENAI_REVIEW_API_KEY`, `MCP_BRIDGE_BEARER_TOKEN`, `INTERNAL_WORKER_TOKEN` |
| claude.ai connector | claude.ai | Connected; client `mcp_69ff8298c1e006f509f104b30a0934d9` |
| **Protocol doc** | repo | **NEW v2.17: `docs/runtime/mcp_review_protocol.md`** |

**Tool**: `ask_chatgpt_review(proposal, context, action_type)` — confirmed available in fresh claude.ai chat sessions via `tool_search` deferred-load.

**Cost per call (empirical from T-MCP-01 fire)**: ~$0.0003 at gpt-4o-mini (1252 in + 253 out tokens at $0.00015/$0.0006 per 1k). Smoke test was ~$0.0001 (smaller payload). Headroom is enormous against $50/mo budget.

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
| T-MCP-02 | Capture first 5 production tool fires in `m.chatgpt_review` | P1 | After T-MCP-01 — fire #1 captured; sanity-check token counts, latency, routing decisions across the next 4 fires |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days — token leaked in chat history during build session. Rotation auto-invalidates all OAuth-issued JWTs (clean reset) |
| **T-MCP-04** | Operationalise D-01 standing rule | P1 | **Half-codified v2.17**: repo doc `docs/runtime/mcp_review_protocol.md` shipped. **Still pending**: PK manual update of claude.ai project system prompt template to reference the protocol doc and require `ask_chatgpt_review` before any production-touching action this session. |
| T-MCP-05 (per v2.16) | Close-the-loop UPDATE on first MCP escalation row | P3 | `UPDATE m.chatgpt_review SET status='resolved', action_taken='extend_observation_24h_accept_correction', resolved_by='pk_session_2026_05_02', escalation_resolved_at=now() WHERE id='2bab95d5-36bb-47f8-88e4-75b4887d458f'`. Without this, B35 telemetry view will skew toward false-pending escalations. PK confirmation required before chat applies. |

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| F04→Active | post_render_log column-purposes | P2 | brief authored | chat→CC | Awaiting CC |

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

Unchanged from v2.11.

---

## 📌 Backlog

| ID | Item | Priority | Trigger |
|---|---|---|---|
| B01–B22, B24–B27 | (per v2.10) | varies | per item |
| ~~B16, B17, B18, B23, B30~~ | CLOSED | | |
| B28 | Verify operator intent for CFW IG / Invegent IG / CFW FB auto-approve | ✅ APPLIED v2.14 (conservative: all 3 disabled) | — |
| B29 | Partial unique constraint on `c.client_publish_profile (client_id, platform) WHERE status='active' AND is_default=true` | P2 | Long-term forward-defence |
| B31 | **Reconstruct auto-approver v1.6.0 EF source** | P0 | Next session — reconstruct from current production v1.5.0 + brief 09 design + cooldown spec. **MCP review per protocol v2.17 before deploy.** Source-of-truth: production v1.5.0 (already calls `m.auto_approver_fetch_drafts`); add `eligibility_safety_net_fires` counter + cooldown filter (at SQL or EF level — design TBD per B32) |
| B32 | **Cooldown design decision: SQL filter vs EF filter** | P0 | Next session — chat presents both options to PK; MCP review per protocol; choose one |
| B33 | **Brief artefact retention rule** | P2 | Process improvement: when a brief references "v-N source as captured in v-(N-x) brief", inline the source into the current brief |
| B34 (per v2.15) | Add `estimated_cost_usd` calculation in chatgpt-review-worker | P3 | Cosmetic — currently stored as null in `m.chatgpt_review`; calculate from `(input_tokens × 0.00015 + output_tokens × 0.0006) / 1000` for gpt-4o-mini and store on insert. Powers cost-tracking views. |
| B35 (per v2.15) | Telemetry view `m.chatgpt_review_daily` | P3 | Materialised view aggregating daily count / cost / avg-latency / escalation-rate by `action_type`. Powers a dashboard tile when ready. Run nightly. **Depends on T-MCP-05 close-the-loop UPDATE for accurate escalation resolution metrics.** |

---

## 🧊 Frozen / Deferred

Unchanged. Plus:
- **T08 EF v1.6.0 deploy** — deferred per Lesson #51 (terminal-decision authority requires disproportionate scrutiny). Resumes via B31 next session, this time with **MCP review tool available + protocol codified** to provide structured cross-check.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, **third vindication v2.15**) — three production saves now: wrong YT trigger fix (1 May), wrong bulk-quarantine of 87 legacy FB drafts (1 May night), wasted patching of Supabase EF gateway HTML quirk (2 May this session). The pattern *verify the actual live state before patching the wrong layer* is now established with 3 distinct production validations across 2 days.
- Lesson #47 candidate (raised v2.12 to 10-catch session; now 11-catch with v2.14 source-provenance catch).
- Lesson #48 candidate — gate placement by consumer architecture.
- Lesson #49 candidate — eligibility vs content gates separation.
- Lesson #50 candidate — authoritative row first, eligibility predicate second.
- Lesson #51 (CONFIRMED v2.12, REINFORCED v2.14) — terminal-decision authority requires disproportionate scrutiny. Honoured 1 May night by deferring v1.6.0 EF rather than constructing without source provenance at 22:30. Will be honoured next session via B31 reconstruction with MCP review under protocol v2.17.
- Lesson #52 candidate (REINFORCED v2.13) — decoupled deploys are risk-reduction.
- Lesson #53 candidate — pre-deploy diagnostic probes.
- Lesson #54 candidate (v2.13) — tool-level deploy gate intermittency.
- Lesson #55 candidate (v2.13) — queue state as gate-firing predictor.
- Lesson #56 candidate (v2.14) — brief artefact retention via inlining (ref. B33).
- Lesson #57 candidate (v2.14) — SQL/EF deploy decoupling reinforces Lesson #52.
- Lesson #58 candidate (v2.15) — *"When a platform's gateway misbehaves with a specific response type that you don't control, route around on a different surface (Vercel for HTML; Supabase EF for JSON/backend) rather than fighting the platform. Architecture simplicity (one project does everything) is not always worth the platform fights."*
- Lesson #59 candidate (v2.16) — *"On the first real fire of a new external-review tool, default to accepting the corrected action over override even when the override case is defensible. Building trust in the rule precedes testing exception cases."*
- **Lesson #60 candidate (NEW v2.17)** — *"Generic context yields generic objections; specific named-field context yields sharper challenge. Codify the call shape early so review quality scales with usage rather than degrading."* Surface evidence: T-MCP-01 fire produced one substantive (n=3) and two weak (silent regression abstract, doc hygiene) pushback points. The weak ones map to context that wasn't structured in named fields. Captured in `docs/runtime/mcp_review_protocol.md` 7-field requirement. Promote when seen in 2+ more sessions.

---

## v2.17 honest limitations

- All previous limitations apply.
- v2.17 committed without ChatGPT cross-check (state-capture-bump exception applies — protocol doc + action_list bump are doc-only). The next bump (post-B31 deploy) should be the first non-state-capture bump that goes through ChatGPT review under the new protocol.
- T-MCP-04 status: **half-codified**. Repo doc `docs/runtime/mcp_review_protocol.md` shipped. **Still pending**: PK manual update of the claude.ai project system prompt to reference the protocol doc and add the standing-prompt-template instruction. Without the project-prompt update, the protocol depends on Claude reading memory + repo at session start, which is reliable but not enforced.
- v2.16 limitation re m.chatgpt_review row `2bab95d5...` close-the-loop UPDATE still pending PK confirmation (T-MCP-05).
- v2.15 carry-forward limitations all still apply.

---

## Changelog

- v1.0–2.14: per previous changelog.
- v2.15 (2 May Saturday afternoon Sydney): ChatGPT Review MCP system SHIPPED.
- v2.16 (2 May Saturday afternoon Sydney session continued): T-MCP-01 closed end-to-end. First real fire validated full mechanism. T02 Gate B exit decision was the proposal target; ChatGPT raised n=3 sample size concern; PK chose Path A (accept correction, extend 24h). T02 extension memo at `docs/audit/runs/2026-05-02-t02-extension.md`. T-MCP-04 behaviourally honoured (not yet codified). New T-MCP-05 captured for close-the-loop UPDATE. New Lesson #59 candidate.
- **v2.17 (2 May Saturday afternoon Sydney session continued, third part): MCP review protocol codified in repo.** PK feedback post-T-MCP-01 fire formalised as `docs/runtime/mcp_review_protocol.md`. Two halves: **call-side** — 7 named context fields required (`decision_under_review`, `production_action_if_approved`, `consequence_if_delayed`, `cost_of_waiting`, `current_evidence`, `known_weak_evidence`, `default_action`); **response-side** — 6-step procedure when tool returns `escalate=true` (don't auto-proceed; separate strong vs weak objections; state lowest-risk default; state cost of waiting; recommend a path; record PK's override or acceptance reason). Protocol weight scales with action_type: full mandatory for `sql_destructive` / `ef_deploy` / `config_change` / `plan_review`; lighter for `sql_read` / `finding_classification`. T-MCP-04 progresses to half-codified (repo doc shipped; project system prompt update in claude.ai still pending PK manual edit). Memory entry added pointing to protocol doc. New Lesson #60 candidate ("Generic context yields generic objections; specific named-field context yields sharper challenge"). State-capture-bump exception applies — no MCP review on this commit, since the meta-protocol is itself what's being defined. No production mutations.
