# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-02 Saturday afternoon Sydney (v2.15 — **ChatGPT Review MCP system SHIPPED and CONNECTED**). Three migrations + two Edge Functions + one Vercel page + one OpenAI project + three Supabase secrets — all live. claude.ai connector connected at 2026-05-02 03:16:48 UTC; OAuth flow validated end-to-end via DB inspection (PKCE passed, JWT issued, last_used_at populated). Standing rule from D-01 now has automated mechanism. Lesson #46 vindicated for the third time; Lesson #58 candidate captured.

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S17)
3. Asks PK about Personal businesses
4. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **As of v2.15 the mechanism for that cross-check is now automated** — `ask_chatgpt_review` MCP tool replaces what was previously copy-paste back-and-forth. **v2.15 honest limitation**: this bump committed without ChatGPT cross-check per state-capture-bump exception (last manual bump before T-MCP-04 makes it standard).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-02 Saturday afternoon Sydney session.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **T-MCP-01: Validate ChatGPT Review MCP from new chat** | P0 | Tool not available in current session — connector loads at session start | Open fresh claude.ai chat (in this Project), request a real proposal review, confirm tool fires + writes correctly to `m.chatgpt_review` |
| 3 | T02 Gate B exit decision (if not actioned) | P0 | Sat 2 May | Default: exit on schedule |
| 4 | **B31: Reconstruct v1.6.0 EF source** | P0 | T08 not complete until cooldown ships; **first real-stakes use of MCP review tool** | Author from v1.5.0 + brief 09 design + cooldown spec; MCP review before deploy |
| 5 | **MONITOR auto-approver next cron tick** | P0 | First tick after T08 SQL v5 live | Run S16 on first cron tick post-session |

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-T08 (per v2.14) | (see v2.14) | (see v2.14) |
| **S17 (NEW v2.15)** | **ChatGPT Review MCP cost + idempotency rate** | `SELECT count(*) AS calls, sum(input_tokens + output_tokens) AS total_tokens, count(*) FILTER (WHERE status='completed') AS completed_count, count(*) FILTER (WHERE response_jsonb IS NULL) AS escalated_or_failed FROM m.chatgpt_review WHERE created_at > NOW() - INTERVAL '7 days'` | Spend > $35 in any 30-day window → check budget allocation; idempotency hit rate < 10% over 50+ calls → review proposal/context shape (likely too noisy for cache to help); escalation rate > 40% → reviewer prompt may be too aggressive |

---

## 🔴 Time-bound (calendar-driven deadlines)

| ID | Item | Priority | Due | Owner | Next action / Done when | Source |
|---|---|---|---|---|---|---|
| T02 | Gate B exit decision | P0 | Sat 2 May | PK + chat | Default: exit on schedule | |
| T03 | Anthropic $200 cap reset | P3 | Fri 1 May | passive | Awareness only — already passed | |
| T04 | R01 calibration session | P1 | Sun 3 May / Mon 4 May | PK + chat | 90min hard cap | |
| T05 | Meta dev support contact | P1 | ASAP — Mon 4 May latest | PK | Single conversation | |
| T06 | Reconnect YouTube OAuth — UNBLOCKED (T17 deployed) | P1 | Within 7 days | PK | Reconnect OAuth at user/account level | |
| T07 | Instagram publisher recovery | P1 | Gated on T08 EF + T10 + T09 + T05 | mixed | Step 4 revised; T08 EF still needed | |
| T08 | **Auto-approver patch — split status: SQL v5 LIVE / EF v1.6.0 DEFERRED** | P0 | EF deploy next session | chat → MCP review → PK | Reconstruct EF source per B31 |
| T09 | Safe-to-resume publisher checklist | P0 | Walk before each cron flip | PK | brief: `06_t09_*` |
| T10 | Pre-fix queue disposition | P0 | Now appropriate post-W1 | PK | brief: `07_t10_*` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → MCP review → PK | next session |
| T12 | F-PUB-005 trigger gate | P1 | After publisher-gate batch (now) | chat → MCP review → PK | F-PUB-005 |
| T13a | LinkedIn Zapier publisher gate v1.1.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T13b | LinkedIn direct publisher gate v1.2.0 — repo-only | P0 | ✅ DONE 2026-05-01 evening | — | brief: `03_t13_*` |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since 2026-03-12 | |
| T17 | YouTube publisher gate v1.6.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `01_t17_*` |
| T18 | FB publisher gate v1.8.0 | P0 | ✅ DONE 2026-05-01 evening | — | brief: `02_t18_*` |

**Workstream 1 status: COMPLETE.**
**Workstream 2 status: 80% complete — SQL v5 LIVE, Path B + B28 applied; v1.6.0 EF deferred to next session.**
**Meta-tooling — ChatGPT Review MCP: SHIPPED v2.15.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP (NEW v2.15)

Meta-infrastructure for the standing rule from D-01. **Status: LIVE.** All artefacts deployed; claude.ai connector connected at 2026-05-02 03:16:48 UTC; OAuth flow validated via DB inspection.

| Artefact | Where | Status |
|---|---|---|
| `m.chatgpt_review` table | Supabase | Live (31 cols, 5 idx, 16 constraints) |
| `m.mcp_oauth_client` table | Supabase | Live (DCR registry — 5 rows: 1 working `mcp_69ff8298...`, 4 dead failed-consent-page rows) |
| `m.mcp_oauth_code` table | Supabase | Live (auth code registry — 1 row, consumed) |
| `chatgpt-review-worker` EF | Supabase | Live v1.0 (gpt-4o-mini, json_schema strict, 30s timeout, internal-only) |
| `mcp-chatgpt-bridge` EF | Supabase | Live v1.2.2 (OAuth 2.1 + DCR + PKCE) |
| `app/mcp-consent/page.tsx` | invegent-dashboard / Vercel | Live |
| OpenAI Project `ice-review` | OpenAI | Live ($50/mo alert at $35 + 100%) |
| Service-account key `chatgpt-review-worker-v1` | OpenAI | Live (separate from ai-worker's project) |
| Supabase secrets | Supabase | All 3 set: `OPENAI_REVIEW_API_KEY`, `MCP_BRIDGE_BEARER_TOKEN`, `INTERNAL_WORKER_TOKEN` |
| claude.ai connector | claude.ai | Connected; client `mcp_69ff8298c1e006f509f104b30a0934d9` |

**Tool**: `ask_chatgpt_review(proposal, context, action_type)` — available in new claude.ai chat sessions (within Project to retain memory + project files).

**Cost per call**: ~$0.0001 (gpt-4o-mini, ~500 input + 50 output tokens, 3.6s latency).

**Idempotency**: UTC-day bucket; identical (proposal, context, action_type) within 24h served from cache (no double-charge, no duplicate row).

**Routing decisions** (backend-enforced):
- `proceed` — agree + low/medium risk + medium/high confidence → safe to apply
- `apply_corrected` — partial + corrected_action provided → apply ChatGPT's correction
- `escalate_disagree` / `escalate_high_risk` / `escalate_low_confidence` / `escalate_explicit_flag` / `escalate_partial_no_correction` / `escalate_schema_invalid` / `escalate_timeout` / `escalate_refusal` → human review required

| ID | Item | Priority | Trigger |
|---|---|---|---|
| **T-MCP-01** | **Validate ChatGPT Review MCP from new chat** | P0 | Today — open new claude.ai chat in this Project, run a real proposal review, confirm tool fires + DB row written |
| **T-MCP-02** | Capture first 5 production tool fires in `m.chatgpt_review` | P1 | After T-MCP-01 — sanity-check token counts, latency, routing decisions |
| **T-MCP-03** | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days — token leaked in chat history during build session. Rotation auto-invalidates all OAuth-issued JWTs (clean reset) |
| **T-MCP-04** | Operationalise D-01 standing rule via Today/Next 5 prompt | P1 | Behavioural — add to standing prompt: "Before any production patch this session, did you use `ask_chatgpt_review`?" |

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

Unchanged from v2.13. R13 expanded scope per v2.14: postmortem now also captures the v1.6.0 EF source-provenance gap as a process-failure data point — tighten artefact retention rules so future v-N briefs don't reference disappeared v-(N-x) briefs without inlining the relevant source.

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
| B31 | **Reconstruct auto-approver v1.6.0 EF source** | P0 | Next session — reconstruct from current production v1.5.0 + brief 09 design + cooldown spec. **MCP review before deploy.** Source-of-truth: production v1.5.0 (already calls `m.auto_approver_fetch_drafts`); add `eligibility_safety_net_fires` counter + cooldown filter (at SQL or EF level — design TBD per B32) |
| B32 | **Cooldown design decision: SQL filter vs EF filter** | P0 | Next session — chat presents both options to PK; MCP review; choose one |
| B33 | **Brief artefact retention rule** | P2 | Process improvement: when a brief references "v-N source as captured in v-(N-x) brief", inline the source into the current brief |
| **B34 (NEW v2.15)** | **Add `estimated_cost_usd` calculation in chatgpt-review-worker** | P3 | Cosmetic — currently stored as null in `m.chatgpt_review`; calculate from `(input_tokens × 0.00015 + output_tokens × 0.0006) / 1000` for gpt-4o-mini and store on insert. Powers cost-tracking views. |
| **B35 (NEW v2.15)** | **Telemetry view `m.chatgpt_review_daily`** | P3 | Materialised view aggregating daily count / cost / avg-latency / escalation-rate by `action_type`. Powers a dashboard tile when ready. Run nightly. |

---

## 🧊 Frozen / Deferred

Unchanged. Plus:
- **T08 EF v1.6.0 deploy** — deferred per Lesson #51 (terminal-decision authority requires disproportionate scrutiny). Resumes via B31 next session, this time with **MCP review tool available** to provide structured cross-check.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, **third vindication v2.15**) — three production saves now: wrong YT trigger fix (1 May), wrong bulk-quarantine of 87 legacy FB drafts (1 May night), wasted patching of Supabase EF gateway HTML quirk (2 May this session). The pattern *verify the actual live state before patching the wrong layer* is now established with 3 distinct production validations across 2 days.
- Lesson #47 candidate (raised v2.12 to 10-catch session; now 11-catch with v2.14 source-provenance catch).
- Lesson #48 candidate — gate placement by consumer architecture.
- Lesson #49 candidate — eligibility vs content gates separation.
- Lesson #50 candidate — authoritative row first, eligibility predicate second.
- Lesson #51 (CONFIRMED v2.12, REINFORCED v2.14) — terminal-decision authority requires disproportionate scrutiny. Honoured 1 May night by deferring v1.6.0 EF rather than constructing without source provenance at 22:30. Will be honoured next session via B31 reconstruction with MCP review.
- Lesson #52 candidate (REINFORCED v2.13) — decoupled deploys are risk-reduction.
- Lesson #53 candidate — pre-deploy diagnostic probes.
- Lesson #54 candidate (v2.13) — tool-level deploy gate intermittency.
- Lesson #55 candidate (v2.13) — queue state as gate-firing predictor.
- Lesson #56 candidate (v2.14) — brief artefact retention via inlining (ref. B33).
- Lesson #57 candidate (v2.14) — SQL/EF deploy decoupling reinforces Lesson #52.
- **Lesson #58 candidate (NEW v2.15)** — *"When a platform's gateway misbehaves with a specific response type that you don't control, route around on a different surface (Vercel for HTML; Supabase EF for JSON/backend) rather than fighting the platform. Architecture simplicity (one project does everything) is not always worth the platform fights."* Surface evidence: Supabase EF gateway rewrites `text/html` to `text/plain` and injects `nosniff`. Code-level fixes can't recover. Promote when seen in 2+ more sessions.

---

## v2.15 honest limitations

- All previous limitations apply.
- v2.15 committed without ChatGPT cross-check (state-capture-bump exception). **The very next patch — T08 EF v1.6.0 reconstruction (B31) — should be the first real-stakes production fire of the new MCP review tool.**
- T-MCP-01 (validate tool fires in real session) is **mandatory before claiming the system is fully operational**. Connection works; tool invocation pending — connector tools only load at chat session start, so validation requires a fresh chat.
- Bridge bearer token leaked in chat history during build session (T-MCP-03 captures rotation within 7 days; not urgent).
- T-MCP-02 (capture first 5 production fires) is the empirical confidence-builder before declaring D-01 fully automated.

---

## Changelog

- v1.0–2.14: per previous changelog.
- **v2.15 (2 May Saturday afternoon Sydney): ChatGPT Review MCP system SHIPPED.** Built end-to-end in single ~9hr session from problem statement (1 May 4hr context-window incident) through deployed working system. Three migrations applied via Supabase MCP per D170: `m.chatgpt_review` + `m.mcp_oauth_client` + `m.mcp_oauth_code`. Two EFs deployed: `chatgpt-review-worker` v1.0 + `mcp-chatgpt-bridge` v1.2.2 (OAuth 2.1 + DCR + PKCE). One Vercel page added: `app/mcp-consent/page.tsx` in invegent-dashboard. OpenAI project `ice-review` with $50/mo alert. Three Supabase secrets set. claude.ai connector connected at 2026-05-02 03:16:48 UTC; OAuth flow validated via DB inspection (PKCE passed, JWT issued, `last_used_at` populated 2 sec after auth code consumed). Two ChatGPT review rounds during build caught real bugs: `now()` in partial unique index would have failed Postgres IMMUTABLE requirement; alerting wording correction. Hit Supabase EF gateway quirk on text/html responses; diagnosed via live header inspection (Lesson #46 third vindication); routed around via Vercel-hosted consent page (Lesson #58 candidate). 6 commits in Invegent-content-engine + 1 in invegent-dashboard. New section "🛠 Meta-tooling — ChatGPT Review MCP" with 4 T-MCP items. New backlog: B34 (cost calc) + B35 (telemetry view). New standing check S17 (cost + idempotency rate). New Today/Next 5 rank-2 (validate tool from new chat). T08 status unchanged (still split: SQL v5 LIVE / EF v1.6.0 DEFERRED — B31 next session). **The mechanism that automates the human-in-the-middle review pattern is now itself live.**
