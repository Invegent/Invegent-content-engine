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

**Build sequence:**
1. B5 (weekly email) — solves dashboard monitoring gap internally
2. n8n client success workflow — when paying clients confirmed and C1 live
3. CrewAI/LangGraph portfolio intelligence — when 5+ clients demand it

**Virtual employee hierarchy:**
| Role | Tool | When |
|---|---|---|
| Pipeline Monitor | Internal (audit + B5 email) | B5 build |
| Dashboard Reviewer | Claude in Chrome / Cowork | Bridge until B5 |
| Content QA Officer | Internal (auto-approver) | Live |
| Client Success Manager | n8n → Supabase → Claude | Post C1 + paying clients |
| Audience Analyst | insights-worker extension (D4) | Post C1 |
| Compliance Officer | Internal (compliance-monitor) | Live |

---

## D074 — QA Framework — Four-Layer Approach
**Date:** 7 April 2026 | **Status:** ✅ Partially live

**Layer 1** (B1, B2): Developer verification docs committed.
**Layer 2** (B3): Automated test runner — not yet built.
**Layer 3** (B4): m.run_system_audit() LIVE — 12/12 pass on first run, weekly cron active.
**Layer 4** (B5): Weekly manager report — not yet built.

---

## D075 — OpenClaw Architecture Learnings — ICE Roadmap Gaps Identified
**Date:** 7 April 2026 | **Status:** ✅ Recorded — informs Phase 3/4 roadmap

**Context:**
Analysis of a detailed OpenClaw use-case video (Matt Wolfe / similar creator) against
ICE's current architecture. Honest gap assessment conducted to inform roadmap priorities.

**What ICE already does better:**
- Multi-client architecture with RLS isolation — his setup is purely personal/single-user
- Structured ingest → score → draft → approve → publish pipeline with dead letter queue
- NDIS profession-scoped compliance (22 rules, monthly monitoring) — no regulated industry layer in his system
- Operations dashboard + client portal architecture
- Billing/tier enforcement built in
- Multi-platform publishing with OAuth token management

**Gaps ICE should close — in priority order:**

**Gap 1 — Vector search / natural language queries (Phase 3)**
His entire system is built on SQLite + vector embeddings allowing natural language
queries across years of data ("what did I discuss with John?", "show all articles about X").
ICE has no vector layer. This is what unlocks: audience intelligence, content performance
queries in plain English, and eventually IAE audience matching.
Build path: pgvector extension (already available in Supabase) on post_publish,
canonical_content_item, and eventually audience_asset tables.

**Gap 2 — Parallel agent execution (Phase 3/4)**
His "business advisory council" runs 8 specialist agents simultaneously against 14 data
sources nightly. ICE agents run sequentially. For ICE this means: when B5 weekly manager
report is built, it should run multiple specialist sub-analyses in parallel rather than
a single linear summary. Supabase Edge Functions support concurrent HTTP calls — this
is an architectural pattern change, not a new vendor.

**Gap 3 — Self-improving prompts (Phase 3)**
When he rejects an extracted action item, his system learns and updates its own prompt.
ICE equivalent: when auto-approver rejects a draft, the rejection reason should feed back
to update the client_ai_profile scoring thresholds over time. Currently rejections are
logged but thresholds never update automatically. Build after B5 is live.

**Gap 4 — SOUL.md / ICE identity files for OpenClaw (F5 — near term)**
He gets significant leverage from identity.md and soul.md giving his bot personality,
context switching (formal in Slack vs casual in DM), and institutional knowledge.
OpenClaw SOUL.md for @InvegentICEbot is already on the action register as F5.
This should be prioritised — it gives the Telegram bot the same leverage at near zero cost.
Content: ICE architecture overview, all 12 client professions, NDIS compliance context,
PK's communication preferences, when to escalate vs handle autonomously.

**Gap 5 — Nightly parallel intelligence council (Phase 4)**
His nightly business council (8 agents, 14 data sources) is inspiring. ICE equivalent
post-C1 (Insights back-feed): a nightly cross-client intelligence run that looks at
all client performance data together, identifies patterns, and surfaces recommendations.
This is the long-term form of the B5 weekly report — not a replacement but an evolution.
Build trigger: 3+ paying clients with 3+ months of Insights data.

**Gap 6 — Security council (Phase 3)**
Nightly codebase audit by 4 specialist security agents (offensive, defensive, data
privacy, operational realism). ICE has compliance monitoring but no automated security
review of its own codebase. Given ICE handles client Facebook tokens and NDIS data,
this matters. Simple version: a monthly Claude Code run against the Edge Functions
checking for exposed secrets, SQL injection risks, token handling issues.
Add to Phase 3 deliverables.

**What NOT to copy:**
- Local SQLite / MacBook-first architecture — ICE's Supabase-cloud architecture
  is correct for a multi-client managed service. His local-first approach serves a
  solo personal assistant. Don't change this.
- Personal CRM / Fathom meeting pipeline — not relevant to ICE's use case.
- Food journal / personal life tracking — obviously not relevant.
- Video/image generation via VO and NanoBanana — ICE has Creatomate for images.
  Video generation is a Phase 4 consideration when YouTube content demand justifies it.

**Key principle extracted:**
Every piece of his system feeds every other piece — CRM informs the business council,
knowledge base informs video ideas, social stats inform the business council.
ICE should apply this same cross-pollination: Insights data should feed auto-approver
thresholds, feed scoring, and the audience asset layer simultaneously.
The pipeline should learn from what it publishes, not just publish and forget.

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| Prospect demo generator | ~1 day. Needed before first external client conversation | Phase 3 |
| Client health weekly report email (B5) | ~2 days. Sunday Edge Function via Resend | Phase 2 |
| AI compliance rule generator | ANZSCO tasks + code_of_conduct_url → Claude generates draft rules | Phase 3 |
| Content vertical → topic mapping | Map 13 verticals to relevant topics for bundler precision | Phase 3 |
| OpenClaw SOUL.md (F5) | ICE context for @InvegentICEbot — bump priority per D075 | Near term |
| pgvector layer | Natural language queries on post_publish + content items | Phase 3 |
| Self-improving auto-approver thresholds | Rejection feedback → threshold update loop | Phase 3 |
| Security council (nightly codebase audit) | Automated monthly Edge Function security review | Phase 3 |
| Instagram publisher | After Meta App Review approved | Phase 3 |
| n8n client success workflow | After C1 live + first paying client | Phase 3 |
| IAE Phase A build | Meta boost only — after all prerequisites in docs/iae/01 are met | Phase 3+ |
| Model router | When AI costs become significant | Phase 4 |
| Nightly parallel intelligence council | 8-agent cross-client nightly analysis | Phase 4 (3+ clients + C1 data) |
| SaaS vs managed service | When 10 clients served 3+ months | Phase 4 |
