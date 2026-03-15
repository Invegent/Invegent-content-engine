# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning. This prevents
relitigating the same decisions in future sessions, provides
context for anyone new to the project, and creates an honest
record of why the system is built the way it is.

Format: Decision → Options Considered → Choice → Reasoning → Date

---

## D001 — Signal-Centric vs Post-Centric Architecture
**Date:** November 2025
**Status:** Confirmed — foundational to entire system

**Decision:**
ICE is built signal-centric. The pipeline starts with raw
information streams, extracts meaning, and synthesises content.
It does not start with content templates that get filled in.

**Options Considered:**
- Post-centric: define post templates, fill with current data
- Signal-centric: ingest signals, extract meaning, generate posts

**Choice:** Signal-centric

**Reasoning:**
Post-centric tools already exist (Buffer, Hootsuite, Later).
They solve the distribution problem but not the content creation
problem. The real pain for small businesses is not "how do I
schedule a post" but "what should I post about and why does it
matter to my audience." Signal-centric architecture solves this
upstream problem. Every piece of content ICE produces is
traceable back to a real-world signal — making it genuinely
informative rather than manufactured noise. This is the core
competitive differentiator.

---

## D002 — Supabase vs Firebase vs AWS RDS
**Date:** November 2025
**Status:** Confirmed — infrastructure built on this

**Decision:**
Use Supabase as the primary backend infrastructure.

**Options Considered:**
- Supabase (PostgreSQL managed + Edge Functions + Auth + RLS)
- Firebase (Google, NoSQL, proprietary)
- AWS RDS + Lambda (PostgreSQL, maximum control)
- Airtable (no-code, low ceiling)

**Choice:** Supabase

**Reasoning:**
Supabase has the highest ceiling with the lowest lock-in.
It is managed PostgreSQL — the world's most battle-tested
relational database. If Supabase is ever outgrown, migration
to raw PostgreSQL on any cloud provider is straightforward
because the data and schema are standard SQL. Firebase
has high vendor lock-in (proprietary NoSQL) and limited
support for complex relational queries. AWS RDS requires
significant DevOps knowledge to manage. Airtable has a
hard ceiling that ICE would hit quickly. Supabase also
provides Auth, Row Level Security, Edge Functions, and
Realtime out of the box — reducing the number of vendors
required.

---

## D003 — Content Vertical Taxonomy Layer Design
**Date:** December 2025
**Status:** Confirmed — implemented in production

**Decision:**
Implement a vertical layer between global content domains
and jurisdiction-specific programs in the taxonomy.

**Options Considered:**
- Flat taxonomy: global domains → topics (no vertical layer)
- Two-level: domains → verticals only
- Three-level: domains → verticals → jurisdiction-specific programs

**Choice:** Three-level with vertical as the intermediate layer

**Reasoning:**
The flat approach broke when trying to handle NDIS specifically.
NDIS is an Australian government program — it is not a global
category. But "Disability Services" is a global vertical that
exists in every country. The vertical layer allows:
- Global: Health & Wellness → Disability Services (universal)
- Australia: Disability Services → NDIS (jurisdiction-specific)
- New Zealand: Disability Services → NDCP (if expanded)
This means new jurisdictions add rows to t.content_vertical
without ever touching the global taxonomy structure.
The architecture scales to any country without breaking
existing clients.

---

## D004 — OpenAI Assistants API Abandoned
**Date:** January 2026
**Status:** Confirmed — Assistants API deprecated by OpenAI

**Decision:**
Do not use OpenAI Assistants API. Use Chat Completions /
Messages API with personas stored in the database.

**Options Considered:**
- OpenAI Assistants API (persistent threads, built-in instructions)
- Chat Completions API with database-stored personas
- Anthropic Claude Messages API

**Choice:** Database-stored personas + Messages/Chat Completions API

**Reasoning:**
The Assistants API was designed for conversational agents.
ICE does not need conversation — it needs batch processing
with consistent persona application. Storing personas in
the database was architecturally correct before the deprecation
and is now the only viable approach. The database-driven
approach is actually superior: personas are version-controlled,
per-client configurable, visible in the dashboard, and portable
across AI providers. No rebuild required when OpenAI deprecated
Assistants — the architecture was already correct.

Note: OpenAI's Responses API (2025) adds server-side thread
storage but is designed for interactive chat, not batch pipelines.
ICE's stateless-per-call approach with explicit context injection
from the DB is the correct pattern for scheduled content generation.

---

## D005 — Next.js vs Retool for Dashboard
**Date:** February 2026
**Status:** Confirmed — Retool retired March 2026, Next.js live

**Decision:**
Retool was used as a transitional tool during Phase 1.
The operations dashboard is now live in Next.js on Vercel
built by Claude Code. dashboard.invegent.com is live with all 9 tabs.
Retool subscription cancelled March 2026.

**Options Considered:**
- Retool (low-code, drag and drop)
- Bubble (visual builder, connects to Supabase via API)
- React + Vercel + Claude Code (full code, full control)
- Supabase Studio + custom views

**Choice:** Next.js + Vercel + Claude Code

**Reasoning:**
Retool proved problematic: layout bugs, AI stalling on complex
prompts, permission errors surfacing late, no pixel-level control.
Every problem encountered in the Retool build would not exist
in a Claude Code-built Next.js app. The deployment workflow
(describe → Claude Code writes → git push → Vercel deploys in 60 seconds)
is faster than Retool AI for any non-trivial change.
The same Next.js pattern serves all three layers: operations
dashboard, client portal, and client websites — one codebase
pattern, one deployment platform, one AI builder.

---

## D006 — Claude API as Primary AI Model
**Date:** March 2026
**Status:** Confirmed — implemented in ai-worker v2.1.0

**Decision:**
Primary AI model is Anthropic Claude (claude-sonnet-4-6).
OpenAI GPT-4o is retained as silent fallback.
Per-client model config in c.client_brand_profile.

**Options Considered:**
- OpenAI GPT-4o only
- Claude only
- Both, with per-client model preference
- Both, with automatic routing based on task type

**Choice:** Claude primary, OpenAI fallback, per-client config

**Reasoning:**
Claude is measurably better for ICE's core use case —
long-form synthesis across multiple sources, maintaining
consistent brand voice, and following complex multi-rule
instructions like NDIS compliance requirements.
Per-client config in client_brand_profile means clients can be
migrated or tested individually. OpenAI retained as fallback
reduces vendor concentration risk.

**Implementation:**
ai-worker v2.1.0 dispatches to Anthropic Messages API
if model.startsWith('claude-'), otherwise OpenAI Chat Completions.
Both NDIS Yarns and Property Pulse configured for claude-sonnet-4-6,
temperature 0.72, max_output_tokens 1200.
Fallback incidents logged in draft_format JSON: fallback_used: true.

---

## D007 — Single Supabase Instance for All Clients
**Date:** November 2025
**Status:** Confirmed — implemented via RLS

**Decision:**
All clients share one Supabase project. Client data isolation
is enforced via Row Level Security at the database level,
not at the application level.

**Options Considered:**
- One Supabase project per client (full isolation, high cost)
- One shared project with application-level filtering
- One shared project with RLS (database-level enforcement)

**Choice:** One shared project with RLS

**Reasoning:**
One project per client becomes unmanageable at 10+ clients.
Application-level filtering is dangerous — a bug in filtering
logic could expose one client's data to another. RLS enforces
isolation at the database level. Schema designed with client_id
on every relevant table. This is the correct enterprise pattern
for multi-tenant SaaS.

---

## D008 — pg_cron + Edge Functions for Pipeline Orchestration
**Date:** November 2025
**Status:** Confirmed — all pipeline workers use this pattern

**Decision:**
Use pg_cron to schedule Edge Functions as the pipeline
orchestration mechanism. No external workflow tools.

**Options Considered:**
- pg_cron + Supabase Edge Functions (internal, no new vendors)
- Zapier / Make (external workflow automation)
- Trigger.dev (modern job queue platform)
- AWS EventBridge + Lambda

**Choice:** pg_cron + Edge Functions

**Reasoning:**
pg_cron is built into Supabase and requires no additional
infrastructure or cost. Edge Functions run in the same
environment as the database. The pattern is proven — all
existing pipeline workers use it successfully. Will be
re-evaluated at 20+ clients or when job queue complexity demands it.

---

## D009 — Chat-to-SQL-to-Supabase Development Workflow
**Date:** November 2025
**Status:** Confirmed — primary development method for DB changes

**Decision:**
All database changes follow the pattern: describe in chat
→ Claude generates SQL → review → apply via Supabase MCP
apply_migration. No direct ad-hoc database editing.

**Options Considered:**
- Direct Supabase UI table editing (dangerous, no review step)
- Ad-hoc SQL in SQL editor (fast but no documentation)
- Chat → SQL → review → apply (slower but documented)
- Full migration framework (too heavy for current scale)

**Choice:** Chat → SQL → review → apply

**Reasoning:**
The founder has no traditional development background.
The chat-to-SQL workflow makes every database change reviewable,
explainable, and documented before it touches production.
Claude Code adoption (Phase 2 onwards) extends this to code
changes as well.

---

## D010 — Managed Service First, SaaS Later
**Date:** March 2026
**Status:** Confirmed — Phase 1-3 strategy

**Decision:**
ICE is monetised as a done-for-you managed content service
($500-1,500/month per client) before any consideration of
a self-serve SaaS platform.

**Options Considered:**
- Build SaaS platform first, find customers second
- Build managed service first, evaluate SaaS later
- Build both simultaneously

**Choice:** Managed service first

**Reasoning:**
A SaaS platform requires OAuth onboarding flows, self-service
client configuration, support infrastructure, reliability
guarantees, and Meta App Review completion — 12-18 months
beyond current state. A managed service requires none of these.
The managed service generates the proof points that make the
SaaS pitch credible. The managed service IS the product.
SaaS is a distribution model decision made after the product
is proven.

---

## D011 — NDIS Vertical as Primary Target Market
**Date:** March 2026
**Status:** Confirmed — 90-day focus

**Decision:**
The primary target for the first external clients is NDIS
providers (OT practices, physiotherapy, support coordination,
plan management) in Australia. Property professionals are
secondary. Other verticals are future.

**Options Considered:**
- Broad horizontal: any small business needing content
- Two verticals simultaneously: NDIS + Property
- Single vertical focus: NDIS providers only (initially)

**Choice:** NDIS providers as primary, property secondary

**Reasoning:**
The founder is a CPA and NDIS plan manager, married to the OT
who runs Care for Welfare. This creates a trust advantage no
general marketing agency can replicate. NDIS Yarns is proof of
concept already in market. The compliance requirements in NDIS
content make providers anxious — ICE's insider founder context
addresses this directly.

---

## D012 — Operational Tables Not Documented in Blueprint
**Date:** March 2026
**Status:** Noted — intentional omission, not a gap

**Decision:**
A number of tables exist in the live database that are not
listed in the blueprint schema map. These are intentionally
omitted as they are operational/logging infrastructure.

**Tables in this category:**
- f.cron_http_log, f.ingest_error_log
- f.raw_metric_point, f.raw_timeseries_point, f.trend_point
- m.ai_job_attempt, m.digest_item_manual_tag
- m.platform_token_health, m.taxonomy_tag, m.worker_http_log
- k.column_purpose_backup, k.column_purpose_import
- Full t.* ANZSIC / ANZSCO / demographics classification tables

---

## D013 — Edge Function Folder Naming Convention
**Date:** March 2026
**Status:** Pending — to resolve in next Claude Code session

**Decision:**
Two Edge Function folders use mixed-case names
(supabase/functions/Ingest, supabase/functions/Content_fetch)
while all other folders and Supabase slugs use lowercase.

**Resolution:**
Rename the two GitHub folders to lowercase in the next Claude Code
terminal session using git mv. Cosmetic only — no production impact.

---

## D014 — Content Intelligence Profiles Architecture
**Date:** March 2026
**Status:** Confirmed — implemented in Phase 2.8

**Decision:**
Replace the monolithic c.client_ai_profile system prompt with a
three-table structured content intelligence profile system:
c.client_brand_profile + c.client_platform_profile + c.content_type_prompt.

**Options Considered:**
- Keep monolithic system prompt in c.client_ai_profile
- Structured profiles with separate tables per concern
- External prompt management tool (Langsmith, Promptlayer)

**Choice:** Three-table structured profiles

**Reasoning:**
The monolithic system prompt cannot be partially updated,
mixes brand voice and platform rules into one block, has no
per-platform differentiation, and cannot be edited via UI safely.
The three-table approach separates concerns: brand identity
(stable), platform rules (stable per platform), and task prompts
(iterable via SQL UPDATE without code deployment).

**Implementation:**
- brand_identity_prompt + platform_voice_prompt → system prompt
- task_prompt + output_schema_hint + source payload → user prompt
- Legacy fallback preserves backward compatibility

---

## D015 — Launch Readiness Gate: Quality Before Clients
**Date:** March 2026
**Status:** Confirmed — active constraint

**Decision:**
First paying client conversations will not begin until a
sustained period of quality-verified publishing is observed.

**Gate criteria (all must be true):**
1. Both profiles: 4+ consecutive weeks of quality-verified posts
2. Facebook page history clean enough to serve as proof point
3. Meta App Review approved or in final review stage
4. LinkedIn recovered (or confirmed not a blocker for Facebook-only clients)
5. NDIS Yarns proof point document prepared

**Target first client conversation:** April/May 2026,
conditional on gate criteria.

---

## D016 — Premium Services Layer: Deferred
**Date:** March 2026
**Status:** Deferred — revisit at 5 paying clients

**Decision:**
Premium Services catalogue deliberately deferred until 5 paying clients.
Exception: monthly strategy call ($200-250/month) can be offered
informally from client 1 onwards — no delivery infrastructure required.

---

## D017 — Email Newsletter Feed Architecture
**Date:** March 2026
**Status:** Designed — implementation pending (Phase 4.2)

**Decision:**
Email newsletters as primary path to solving paywall content gaps.
Full article body arrives in email — no Jina fetch, no Cloudflare.

**Architecture:**
- Dedicated account: feeds@invegent.com
- Vertical aliases: feeds.ndis@, feeds.property@invegent.com
- Future: feeds.client-[slug]@invegent.com
- Gmail labels auto-applied by To: address filter
- f.feed_source: source_type_code = 'email_newsletter'
- f.raw_content_item: external_id = Gmail message ID (dedup)
- email-ingest Edge Function every 2h via pg_cron
- Gmail History API (incremental from last_history_id)

---

## D018 — m/c Schema Write Pattern: SECURITY DEFINER Functions
**Date:** March 2026
**Status:** Confirmed — standard pattern for all dashboard writes

**Decision:**
All writes from the Next.js dashboard to the m or c Supabase schemas
must go through SECURITY DEFINER PostgreSQL functions called via
supabase.rpc(), not via direct .schema("m").from().insert() calls.

**Options Considered:**
- Direct PostgREST calls with service role key (fails — m/c schemas not exposed)
- exec_sql() RPC with SQL string interpolation (works but unsafe for user input)
- SECURITY DEFINER named functions with typed parameters (safe, correct)

**Choice:** SECURITY DEFINER named functions

**Reasoning:**
The m and c schemas are not exposed via PostgREST for security reasons.
Direct .schema("m").from().insert() calls return 403 even with service
role key. exec_sql() with string interpolation works but creates SQL
injection risk for any field containing user-generated content (draft body,
client names, etc.). SECURITY DEFINER functions accept typed parameters,
run with superuser privileges at the DB level, bypass RLS and schema
exposure restrictions, and are safe for production use.

**Functions created as of March 2026:**
- public.manual_post_insert(p_platform, p_draft_body, p_approval_status,
  p_client_id, p_destination) — inserts post_draft + optional queue entry
- public.draft_approve_and_enqueue(p_draft_id) — approves draft and creates
  queue entry using direct client_id or digest chain as fallback
- public.draft_set_status(p_draft_id, p_status, p_approved_by) — updates
  approval_status on any draft

**Pattern rule:**
Whenever a new dashboard write operation touches m or c schema,
create a new SECURITY DEFINER function first, then call it via .rpc().
Never use string interpolation in exec_sql for user-supplied content.

---

## D019 — Direct client_id on post_draft for Manual Posts
**Date:** March 2026
**Status:** Confirmed — implemented

**Decision:**
Add a direct client_id FK column to m.post_draft to support manual
and Post Studio posts that have no digest chain.

**Problem:**
The existing join chain for resolving client name and client_id
from a post_draft is: post_draft → digest_item → digest_run → client.
Manual/Post Studio posts have digest_item_id = null (no feed source),
so this join chain returns nothing. This caused:
- Client name showing as "Unknown" in Drafts tab
- draft_approve_and_enqueue() silently skipping queue entry creation
  (couldn't find client_id, so skipped the INSERT)

**Solution:**
- ALTER TABLE m.post_draft ADD COLUMN client_id uuid (nullable FK)
- manual_post_insert() populates client_id directly at creation time
- draft_approve_and_enqueue() uses COALESCE(digest_chain_client_id, pd.client_id)
  so both pathways work
- Drafts query uses COALESCE(c_direct.client_name, c_digest.client_name, 'Unknown')

**Rule:**
All new post creation paths that bypass the feed pipeline must
set client_id directly on the post_draft row.

---

## D020 — OAuth Connect Flow Pulled Forward to Phase 3.3
**Date:** March 2026
**Status:** Confirmed — next build target

**Decision:**
The Facebook OAuth page connect flow (originally Phase 3.3 client
onboarding) is pulled forward and will be built before the Meta
App Review screencast is recorded.

**Context:**
Meta App Review requires the screencast to demonstrate the OAuth
authorization flow — a user granting the app permission to access
their Facebook Page via Meta's consent screen. ICE currently connects
pages by manually storing tokens, which is not visible in a recording.

**Plan:**
- Build /connect page on dashboard.invegent.com
- Facebook Login OAuth flow: connect button → Meta consent screen
  (shows pages_manage_posts, pages_read_engagement, pages_show_list) →
  callback → token stored → page connected
- Screencast demo: disconnect Care for Welfare from Meta Business Manager,
  then reconnect it live during recording as if onboarding a new client
- This is real, functional onboarding infrastructure — not a demo mockup

**Prerequisites:** All met. No Phase 2 blockers apply to building this flow.

**Build session:** 16 March 2026 (next chat)

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| Rename Ingest + Content_fetch folders to lowercase | Cosmetic — next Claude Code session | Next build session |
| Model router implementation | When AI costs become significant | Phase 4 |
| Trigger.dev evaluation | When pg_cron job complexity demands it | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
| Second market expansion | After NDIS vertical proven with 5+ clients | Phase 4 |
| YouTube / video layer | When client demand justifies investment | Phase 4 |
| Premium Services catalogue design | When 5 paying clients live | Phase 3+ |
| Recent post history injection into ai-worker | Prevent topic repetition — planned enhancement | Phase 4 |
| Mobile dashboard responsive design | Internal tool, defer until first paying client | Phase 4 |
