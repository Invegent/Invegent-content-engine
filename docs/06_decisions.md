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
queries across years of data. ICE has no vector layer. This is what unlocks:
audience intelligence, content performance queries in plain English, and eventually
IAE audience matching. Build path: pgvector on post_publish + canonical_content_item.

**Gap 2 — Parallel agent execution (Phase 3/4)**
When B5 weekly manager report is built, it should run multiple specialist
sub-analyses in parallel rather than a single linear summary.

**Gap 3 — Self-improving prompts (Phase 3)**
Rejection reason → feed back to update client_ai_profile scoring thresholds over time.

**Gap 4 — SOUL.md / ICE identity files for OpenClaw (F5 — near term)**
ICE context for @InvegentICEbot — already on action register as F5.

**Gap 5 — Nightly parallel intelligence council (Phase 4)**
Cross-client intelligence run post-C1. Build trigger: 3+ paying clients.

**Gap 6 — Security council (Phase 3)**
Monthly Claude Code run against Edge Functions: exposed secrets, SQL injection,
token handling. ICE handles client Facebook tokens and NDIS data — this matters.

**What NOT to copy:**
Local SQLite architecture, personal CRM, food journal, VO/NanoBanana video gen.

**Key principle extracted:**
Every piece should feed every other piece — Insights → auto-approver thresholds,
feed scoring, and audience asset layer simultaneously. The pipeline should learn
from what it publishes, not just publish and forget.

---

## D076 — Video Tracker + Video Analyser (Phase 3 Video Pipeline)
**Date:** 8 April 2026 | **Status:** ✅ Live

video-worker v2.1.0 bug fixed. video-analyser v1.2.0 + YouTube Data API live
(ICE_YOUTUBE_DATA_API_KEY). Channel subscriptions (ingest v95, 2 channels, 6h cron).
Analyse tab live in dashboard Monitor section.

---

## D077 — HeyGen Avatar Pipeline — Architecture
**Date:** 8 April 2026 | **Status:** ✅ Live

HeyGen API key tested (600 credits). c.client_avatar_profile table, consent form v1.0
(L005 satisfied). ICE_HEYGEN_API_KEY in Edge Function secrets. heygen-intro and
heygen-test one-shot functions deployed.

---

## D078 — video_short_avatar is_buildable = true
**Date:** 9 April 2026 | **Status:** ✅ Live

video_short_avatar in t.5.3_content_format set is_buildable=true.
Format advisor will now select it for conversational/educational content.
advisor_description updated. best_for: conversational education, participant guides,
stakeholder Q&A, advocacy.

---

## D079 — heygen-worker Script Resolution Pattern
**Date:** 9 April 2026 | **Status:** ✅ Live

heygen-worker reads narration_text + stakeholder_role from draft_format.video_script
(set by ai-worker via set_draft_video_script RPC). Top-level draft_format fields
also supported as override. Stakeholder_role → c.brand_avatar lookup for avatar ID
and voice ID.

---

## D080 — Alex Avatar Smile Issue
**Date:** 9 April 2026 | **Status:** ✅ Noted — cosmetic only

Both Alex avatars (realistic and animated) have an overly broad smile from the
photo generation prompt. Fix for next avatar: add "neutral, composed expression —
not smiling broadly" to the "Describe your avatar" field in HeyGen.
Does not affect pipeline functionality. Applied to all subsequent avatar briefs.

---

## D081 — Character Maturity Principle — Solo Videos Before Conversations
**Date:** 9 April 2026 | **Status:** ✅ Decided — governs avatar content strategy

**Decision:**
Each avatar character must establish its own identity through solo videos before
participating in dual-character conversations. Dual-character conversation format
is explicitly not available to a character until they have reached a minimum solo
video threshold.

**Threshold (tentative — review after first 30 days of avatar content):**
- Minimum solo videos published per character before conversation eligibility: **10**
- Both characters in a proposed conversation must independently meet the threshold

**Current cast maturity — NDIS Yarns (as of 9 Apr 2026):**

| Character | Role | Solo videos published | Conversation eligible |
|---|---|---|---|
| Alex (Realistic) | NDIS Participant | 1 (test) | ❌ |
| Alex (Animated) | NDIS Participant | 1 (test) | ❌ |
| All others | Various | 0 | ❌ |

---

## D082 — Dual-Character Conversation Format — Deferred to Phase 4
**Date:** 9 April 2026 | **Status:** ✅ Decided — deferred, not cancelled

**Decision:**
video_short_avatar_conversation format is deferred to Phase 4.
Single-character avatar videos run first. Conversations unlock when characters
are mature per D081 threshold.

**Build trigger:**
- Both characters in a proposed pair have ≥ 10 published solo videos (D081)
- Single-character avatar format is proven — engagement data exists
- Stitching solution validated (ffmpeg-wasm vs Creatomate video composition)

---

## D083 — Client Onboarding Pipeline Architecture
**Date:** 11 April 2026 | **Status:** ✅ Live

**Decision:**
Client onboarding follows a multi-step public form → dashboard review → atomic approve
pattern. All functions are SECURITY DEFINER in public schema to support anon callers
and service role restrictions on c/m schema DML.

**What was built:**
- 7-step public onboarding form at `portal.invegent.com/onboard` (no auth required)
- `c.onboarding_submission` table — captures all 7 sections as JSONB
- `c.client_service_agreement` table — agreement locked at approval time
- `c.service_package` + `c.service_package_channel` — 4 packages seeded
- `c.platform_channel` — 8 channel types seeded
- onboarding-notifier v2.0.0 — handles new_submission, needs_info, approved events

**SECURITY DEFINER functions (all anon/service-role callable):**
- `public.submit_onboarding(JSONB)` — anon callable, inserts to c.onboarding_submission
- `public.get_onboarding_submissions(TEXT)` — list with package details
- `public.get_onboarding_submission_detail(UUID)` — full detail for review
- `public.request_onboarding_info(UUID, JSONB, TEXT, UUID)` — flags fields, sets update_token
- `public.approve_onboarding(UUID, TEXT)` — creates client + portal_user + agreement atomically
- `public.reject_onboarding(UUID, TEXT, TEXT)` — marks rejected
- `public.update_onboarding_submission(UUID, UUID, JSONB)` — anon callable, client updates
- `public.validate_update_token(UUID, UUID)` — anon callable, returns missing_fields + operator_notes

**Dashboard flows:**
- Onboarding tab: submission list → detail panel with 7 sections
- Request Info: flag fields + write message → client email with update link
- Approve: atomic creation of client, portal_user, agreement → magic link sent

**Atomic approval pattern:**
`approve_onboarding()` creates c.client + auth.users portal_user + c.client_service_agreement
in a single transaction. If any step fails, nothing is created. Prevents partial state.

**Key learnings:**
- `approve_onboarding` needed `client_slug` not `client_name` — fixed
- `validate_update_token` must return `operator_notes` so client knows what to fix
- Auth Site URL must be `portal.invegent.com` (not dashboard) for magic link callbacks
- PostgREST cannot be used for c/f schema DML — SECURITY DEFINER pattern is the only path

**First client onboarded:** Care for Welfare (client_id: 3eca32aa-e460-462f-a846-3f6ace6a3cae)
Portal login confirmed working 11 Apr 2026.

**Pending decisions (not yet made):**
- D084: Platform OAuth connection — use existing Facebook connect flow or new portal-specific flow?
- D085: Magic link delivery — Resend SMTP vs Supabase custom SMTP config

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| D084: Platform OAuth connection | Portal page for clients to connect Facebook/LinkedIn — use existing flow or new portal-specific? | Next session |
| D085: Magic link delivery | Resend SMTP vs Supabase custom SMTP — magic link via Supabase default unreliable to Hotmail | Next session |
| Prospect demo generator (F1) | ~1 day. Needed before first external client conversation | Phase 3 |
| Client health weekly report email (B5) | ~2 days. Sunday Edge Function via Resend | Phase 3 |
| Publisher schedule wiring | c.client_publish_schedule → publisher assigns scheduled_for | Phase 3 |
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
| video_short_avatar_conversation | D082 — after D081 maturity threshold met for both characters | Phase 4 |
| Nightly parallel intelligence council | 8-agent cross-client nightly analysis | Phase 4 (3+ clients + C1 data) |
| SaaS vs managed service | When 10 clients served 3+ months | Phase 4 |
