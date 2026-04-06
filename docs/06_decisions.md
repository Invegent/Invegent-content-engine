# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D061 — See earlier commits

---

## D062 — post_seed Platform Column + Constraint Fix
**Date:** 2 April 2026 | **Status:** ✅ Live

Added `platform` column to `m.post_seed`. New constraint `post_seed_uniq_run_item_platform`
on (digest_run_id, digest_item_id, platform). YouTube excluded from text pipeline.
Fixes CROSS JOIN duplicate conflict bug in seed_client_to_ai_v2.

---

## D063 — Pipeline Doctor Log Harvester
**Date:** 2 April 2026 | **Status:** ✅ Live

`m.harvest_pipeline_doctor_log()` SECURITY DEFINER function reads doctor HTTP response
from `net._http_response`, writes structured results to `m.pipeline_doctor_log`.
pg_cron at :17/:47 (2 min after doctor at :15/:45). 37 records in log at session end.

---

## D064 — post_publish_queue acknowledged_at Pattern
**Date:** 2 April 2026 | **Status:** ✅ Live

Added `acknowledged_at` + `acknowledged_by` to `m.post_publish_queue`.
Doctor harvester skips acknowledged dead items from issues_found count.
Enables formal closure of known-bad items without deletion.

---

## D065 — AI Compliance Reviewer (Phase 3.14)
**Date:** 2 April 2026 | **Status:** ✅ Live

compliance-reviewer v1.3.0. Fetches changed pages via Jina, loads scoped rules
via get_compliance_rules(), sends to Claude with vertical+profession context.
Writes structured ai_analysis JSONB to m.compliance_review_queue.
pg_cron 9:05 UTC 1st of month. Dashboard AI panel live.
First run: 5/5 NDIS items analysed, 4/5 action required.

---

## D066 — Profession Dimension for Compliance + Content
**Date:** 2 April 2026 | **Status:** ✅ Live

t.profession table (12 professions: 7 NDIS, 5 property).
profession_slugs[] on t.5.7_compliance_rule (4 rules scoped).
profession_slug on m.compliance_policy_source, m.compliance_review_queue, c.client.
Care for Welfare = occupational_therapy.
get_compliance_rules(vertical, profession) SECURITY DEFINER function.
OT gets 22 rules (16 universal + 3 OT-specific + 3 global).
Support worker gets 19 (16 + 3 global). No false positives.

t.profession also stores: anzsco_occupation_id, anzsic_class_code,
code_of_conduct_url, code_of_conduct_name, regulator_website.
All 12 professions backfilled. code_of_conduct_url is the input for
the future AI compliance rule generator — fetched fresh via Jina when needed.
Storing URL (not text) is correct — avoids stale copies, uses existing fetch infrastructure.

---

## D067 — Claude Code Agentic Loop — First Autonomous Execution
**Date:** 2 April 2026 | **Status:** ✅ Proven

Establish the Claude Code agentic loop as the standard pattern for
well-scoped ICE build tasks that don't require mid-execution human judgment.

Brief format that works:
- Current state check query per task (idempotent)
- Exact SQL/code with no ambiguity
- Verification query with explicit expected result
- Error handling: skip and log, don't guess
- Completion protocol: write progress file

First execution: 4 tasks, no human intervention, completed in minutes.
Claude Code handled ANZSIC 8699 not existing → used NULL (correct).

Directory: `C:\Users\parve\Invegent-content-engine`
MCPs needed: Supabase MCP + GitHub MCP (both in claude_desktop_config.json)
Proven tasks: ai-worker deploy, schema migration, k registry updates, Cowork file creation.

---

## D068 — k Schema as Primary Navigation Tool
**Date:** 2 April 2026 | **Status:** ✅ Adopted

Replace ad-hoc `information_schema.columns` discovery with structured nav
against `k.vw_table_summary` and `k.vw_db_columns` at session start.

Rationale: Every session was spending 3-5 tool calls rediscovering column
names and FK relationships already in the k registry.

Standard pattern:
```sql
SELECT schema_name, table_name, purpose, columns_list, fk_edges
FROM k.vw_table_summary
WHERE schema_name = 'x' AND table_name = 'y';
```

---

## D069 — k Schema Full Repair
**Date:** 2 April 2026 | **Status:** ✅ Complete

**Problem:** k schema governance catalog had three bugs and was partially non-functional.

**Bugs fixed:**
1. `refresh_table_registry()` — hardcoded schema list excluded `c` and `f`
2. `refresh_column_registry()` — same exclusion of `c` and `f` schemas
3. `sync_registries()` — referenced `vw_db_objects.object_type` but column is `object_kind`

**Infrastructure added:**
- Weekly pg_cron: `k-schema-refresh-weekly` every Sunday 3am UTC
- `refresh_catalog()` now covers all 8 registered schemas

**Documentation completed:**
- c schema: 14 tables, 207 columns now registered and documented
- f schema: 12 tables, 149 columns now registered and documented
- m schema: all 19 remaining TODO tables documented
- Total: 117 tables fully documented across all schemas — zero TODO entries

**Key principle confirmed:**
Manually-coded purpose/join_keys/advisory entries are preserved on every
refresh (ON CONFLICT only updates structural fields). Safe to re-run at any time.

---

## D070 — AI Diagnostic Agent v1.0.0 — Tier 2 Daily Health Report
**Date:** 2 April 2026 | **Status:** ✅ Live

New `ai-diagnostic` Edge Function providing a Tier 2 daily health report for the ICE pipeline.

**Capabilities:**
- Trend analysis across pipeline health snapshots
- Per-client scoring — NDIS Yarns and Property Pulse assessed separately
- AI-generated recommendations based on detected patterns
- Predictive warnings for emerging pipeline risks

**Dashboard:** `/diagnostics` page and `/api/diagnostics` Next.js route live in invegent-dashboard.

---

## D071 — IAE Strategic Decision — Do Not Build Yet
**Date:** April 2026 | **Status:** ✅ Decided — concept stage only

**Decision:**
IAE (Invegent Advertising Engine) is recognised as a legitimate future
product extension of ICE. The decision is explicitly NOT to build it yet.

**Build trigger:**
- 2-3 paying ICE clients confirmed
- Client demand for paid amplification explicitly validated
- All prerequisites in docs/iae/01_iae_prerequisites.md met

**Documentation:** docs/iae/

---

## D072 — Audience as Asset — Schema Pattern
**Date:** April 2026 | **Status:** ✅ Live — deployed 7 Apr 2026

**Decision:**
Audience data has a dual nature — fact and configuration-linked.

```
c.client_audience_policy  — what to build (configuration)
m.audience_asset          — what got built (fact, FK to c.client)
m.audience_performance    — how it performed in IAE
k.vw_audience_summary     — intelligence view (synthesises above)
```

k gains views, not tables. Guru got smarter, not fatter.
3 tables deployed. 6 seed rows (3 per client). k catalog updated.

---

## D073 — External AI Agents Strategy — n8n for Client Success, Internal First
**Date:** 7 April 2026 | **Status:** ✅ Decided

**Decision:**
ICE's Supabase-internal agent architecture handles 80% of what external agent
frameworks would do, and does it more reliably because it is closer to the data.
External agent tooling is deferred until ICE has paying clients and specific
gaps the internal architecture cannot fill.

**Context:**
Research conducted across CrewAI, LangGraph, AutoGen, n8n, Make, Zapier.
All are technically capable. The question for ICE is whether the remaining gaps
justify the added complexity and operational overhead of an external layer.

**The three-layer landscape:**
- Agentic frameworks (CrewAI, LangGraph, AutoGen) — code-level, production-grade,
  best for stateful multi-agent workflows. LangGraph for durability and human-in-loop.
  CrewAI for intuitive role-based team modelling. AutoGen for conversational agents.
- Workflow automation platforms (n8n, Make, Zapier) — visual, lower code,
  n8n leads for technical teams with native Supabase + Anthropic + LangChain
  integration. Self-hosted n8n = unlimited executions for ~$10/month server cost.
- Browser agents (Claude in Chrome / Cowork) — already configured in ICE,
  usable immediately for dashboard monitoring tasks.

**What ICE already covers internally (no external agent needed):**
- Pipeline health monitoring — pipeline-doctor, ai-diagnostic, m.run_system_audit()
- Content generation and approval — ai-worker, auto-approver
- Publishing — publisher Edge Function
- Compliance review — compliance-reviewer, compliance-monitor
- Weekly system audit — m.run_system_audit() + cron (deployed 7 Apr)

**The two external agent use cases worth pursuing:**

1. Dashboard Monitor — build as Claude in Chrome / Cowork task when B5
   (weekly email report) is not yet live. Once B5 exists, the email covers this
   and the Cowork task is redundant. Not a priority.

2. Client Success Agent — once paying clients exist and C1 (Insights back-feed)
   is live. An n8n workflow that: triggers weekly per client → queries Supabase
   for publishing + engagement data → calls Claude API for plain-language summary
   → sends to client portal or PK for approval. n8n is the right tool here because
   it bridges Supabase data with client communication outside Supabase's scope.

**Virtual employee hierarchy mapping:**
| Role | Tool | When |
|---|---|---|
| Pipeline Monitor | Internal (audit + B5 email) | B5 build |
| Dashboard Reviewer | Claude in Chrome / Cowork | Bridge until B5 |
| Content QA Officer | Internal (auto-approver) | Live |
| Client Success Manager | n8n → Supabase → Claude | Post C1 + paying clients |
| Audience Analyst | insights-worker extension (D4) | Post C1 |
| Compliance Officer | Internal (compliance-monitor) | Live |

**Build sequence:**
1. B5 (weekly email) — solves dashboard monitoring gap internally
2. n8n client success workflow — when paying clients confirmed and C1 live
3. CrewAI/LangGraph portfolio intelligence — when 5+ clients demand it

**Key principle:**
Don't add agent frameworks for the sake of having them. External agents should
solve problems the internal architecture genuinely cannot — primarily client
communication and cross-system workflows that span beyond Supabase's boundary.

---

## D074 — QA Framework — Four-Layer Approach
**Date:** 7 April 2026 | **Status:** ✅ Partially live

**Decision:**
ICE adopts a four-layer quality assurance framework to move from reactive
error discovery to proactive verification.

**Layer 1 — Developer verification** (B1, B2): docs/quality/01 and 02 committed.
Checklist every build must pass before production deploy. No more deploy-and-see.

**Layer 2 — Automated test runner** (B3): not yet built.
m.pipeline_test_expectation table + test-runner Edge Function.
Runs every 30 min. Pass/fail against documented expected ranges.
Brief ready: docs/briefs/2026-04-07-qa-framework-phase2.md

**Layer 3 — System audit function** (B4): LIVE as of 7 Apr 2026.
m.run_system_audit() — 12 invariant checks across operational, data integrity,
compliance, structural categories. First run: 12/12 pass.
Weekly cron: ice-system-audit-weekly, Sunday 13:00 UTC.

**Layer 4 — Weekly manager report** (B5): not yet built.
Extends ai-diagnostic to deliver structured email every Sunday night.
Brief ready: docs/briefs/2026-04-07-qa-framework-phase2.md

**Principle:**
The goal is proactive confidence — verified system state — not reactive hope.
"The test suite ran 47 minutes ago and all 12 checks passed" vs "I hope this is working."

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| Prospect demo generator | ~1 day. Needed before first external client conversation | Phase 3 |
| Client health weekly report email (B5) | ~2 days. Sunday Edge Function via Resend | Phase 2 |
| NDIS Yarns YouTube | Convert channel to Brand Account, connect via dashboard | This session |
| AI compliance rule generator | ANZSCO tasks + code_of_conduct_url → Claude generates draft rules | Phase 3 |
| Content vertical → topic mapping | Map 13 verticals to relevant topics for bundler precision | Phase 3 |
| OpenClaw SOUL.md | ICE context for @InvegentICEbot | Phase 3 |
| Instagram publisher | After Meta App Review approved | Phase 3 |
| n8n client success workflow | After C1 live + first paying client | Phase 3 |
| IAE Phase A build | Meta boost only — after all prerequisites in docs/iae/01 are met | Phase 3+ |
| Model router | When AI costs become significant | Phase 4 |
| SaaS vs managed service | When 10 clients served 3+ months | Phase 4 |
