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
Responses API with personas stored in the database.

**Options Considered:**
- OpenAI Assistants API (persistent threads, built-in instructions)
- Chat Completions API with database-stored personas
- Anthropic Claude API

**Choice:** Database-stored personas + Responses/Chat Completions API

**Reasoning:**
The Assistants API was designed for conversational agents.
ICE does not need conversation — it needs batch processing
with consistent persona application. Storing personas in
c.client_ai_profile was architecturally correct before
the deprecation and is now the only viable approach.
The database-driven approach is actually superior: personas
are version-controlled, per-client configurable, visible
in the dashboard, and portable across AI providers.
No rebuild required when OpenAI deprecated Assistants —
the architecture was already correct.

---

## D005 — Next.js vs Retool for Dashboard
**Date:** February 2026
**Status:** Confirmed — Retool is transitional, Next.js is target

**Decision:**
Retool is used as a transitional tool during Phase 1.
The long-term operations dashboard, client portal, and
client websites will all be built in Next.js on Vercel
by Claude Code.

**Options Considered:**
- Retool (low-code, drag and drop)
- Bubble (visual builder, connects to Supabase via API)
- React + Vercel + Claude Code (full code, full control)
- Supabase Studio + custom views

**Choice:** Next.js + Vercel + Claude Code

**Reasoning:**
Retool was chosen initially as the fastest path to a working
dashboard. It proved problematic: layout bugs caused by
component nesting, AI stalling on complex prompts,
permission errors surfacing late, no pixel-level control,
Enterprise API access required for programmatic manipulation.
Every problem encountered in the Retool build would not exist
in a Claude Code-built Next.js app. Claude Code controls the
full output — no JSON exports, no component dragging,
no wiring issues. The deployment workflow (describe →
Claude Code writes → git push → Vercel deploys in 60 seconds)
is faster than Retool AI for any non-trivial change.
Additionally, the same Next.js pattern serves all three
layers: operations dashboard, client portal, and client
websites — one codebase pattern, one deployment platform,
one AI builder.

---

## D006 — Claude API as Primary AI Model
**Date:** March 2026
**Status:** Confirmed — pending implementation in ai-worker

**Decision:**
Switch primary AI model from OpenAI GPT-4o to Anthropic
Claude as the default for content generation. Retain OpenAI
as fallback option.

**Options Considered:**
- OpenAI GPT-4o only
- Claude only
- Both, with per-client model preference
- Both, with automatic routing based on task type

**Choice:** Claude primary, OpenAI fallback, per-client config

**Reasoning:**
Claude is measurably better for ICE's core use case —
long-form synthesis across multiple sources, maintaining
consistent brand voice across a long document, and following
complex multi-rule instructions like NDIS compliance
requirements. For a content engine where quality and
brand consistency are the core value proposition, the
better synthesis model is the right choice. Per-client
config in client_ai_profile means clients can be migrated
gradually. OpenAI retained as fallback reduces vendor
concentration risk.

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
One project per client becomes unmanageable at 10+ clients —
separate deployments, separate costs, separate maintenance.
Application-level filtering is dangerous — a bug in the
filtering logic could expose one client's data to another.
RLS enforces isolation at the database level, meaning a bug
in the application cannot cause a data leak — the database
itself rejects unauthorized queries. Schema already designed
with client_id on every relevant table. This is the correct
enterprise pattern for multi-tenant SaaS.

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
environment as the database, reducing latency and complexity.
The pattern is proven — all existing pipeline workers
(ingest-worker, content-fetch, ai-worker, bundler, publisher)
use this pattern successfully. External tools like Zapier
add vendor dependency and per-task costs that compound at
scale. Trigger.dev is a better long-term solution for
complex job queues but adds migration work that is not
yet justified. The existing pattern is sufficient for
current scale and will be re-evaluated at 20+ clients
or when job queue complexity demands it.

---

## D009 — Chat-to-SQL-to-Supabase Development Workflow
**Date:** November 2025
**Status:** Confirmed — primary development method

**Decision:**
All database changes follow the pattern: describe in chat
→ Claude generates SQL → review → apply in Supabase SQL editor.
No direct ad-hoc database editing.

**Options Considered:**
- Direct Supabase UI table editing (dangerous, no review step)
- Ad-hoc SQL in SQL editor (fast but no documentation)
- Chat → SQL → review → apply (slower but documented)
- Full migration framework (too heavy for current scale)

**Choice:** Chat → SQL → review → apply

**Reasoning:**
The founder has no traditional development background.
The chat-to-SQL workflow makes every database change
reviewable, explainable, and documented before it touches
production. It also means Claude can reason about the
full schema context when generating changes, reducing
errors. The workflow has produced 30+ tables and
complex migrations without data loss. It will continue
until a formal migration framework becomes necessary at scale.

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
A SaaS platform requires: proper OAuth onboarding flows,
self-service client configuration, support infrastructure,
reliability guarantees, sales and marketing, and Meta App
Review completion. These are 12-18 months of work beyond
what exists today. A managed service requires none of these —
just a working pipeline and a client willing to pay.
The managed service also generates the proof points
(follower growth, engagement rates, time saved) that
make the SaaS pitch credible. Building SaaS before
the managed service is proven is building in the wrong order.
The managed service IS the product. SaaS is a distribution
model decision made after the product is proven.

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
The founder is a practising OT with deep domain knowledge
of the NDIS sector. This creates a trust advantage that
no general marketing agency can replicate — walking into
an NDIS provider conversation as a peer, not a vendor.
NDIS Yarns is proof of concept already in market.
The compliance requirements in NDIS content make
providers particularly anxious about getting it wrong —
ICE's NDIS-specific taxonomy and an OT founder addresses
this anxiety directly. Broad horizontal targeting diffuses
this advantage across a market where ICE has no edge.
Win the NDIS vertical completely before expanding.

---

## D012 — Operational Tables Not Documented in Blueprint
**Date:** March 2026
**Status:** Noted — intentional omission, not a gap

**Decision:**
A number of tables exist in the live database that are not
listed in the blueprint schema map. These are intentionally
omitted from the blueprint as they are operational/logging
infrastructure rather than pipeline data flow tables.

**Tables in this category:**
- f.cron_http_log — HTTP response log for pg_cron invocations
- f.ingest_error_log — detailed error log per ingest run
- f.raw_metric_point, f.raw_timeseries_point, f.trend_point — raw
  signal data for future trend intelligence features (not yet used)
- m.ai_job_attempt — attempt-level retry tracking per ai_job
- m.digest_item_manual_tag — manual topic tags on digest items
- m.platform_token_health — token validity written daily by cron
- m.taxonomy_tag — tags applied to pipeline items
- m.worker_http_log — HTTP response log for Edge Function invocations
- k.column_purpose_backup, k.column_purpose_import — governance
  import artefacts from initial schema build
- Full t.* ANZSIC / ANZSCO / demographics classification tables
  (40+ tables covering Australian standard industry, occupation,
  and demographic classifications — built as taxonomy foundation,
  not yet wired into active pipeline)

**Reasoning:**
The blueprint documents the pipeline data flow — what matters
for understanding how content moves from signal to post. Logging
tables, governance artefacts, and future-use classification tables
would add noise without adding understanding. They are acknowledged
here so future sessions don't mistake their absence from the
blueprint as an undocumented gap.

---

## D013 — Edge Function Folder Naming Convention
**Date:** March 2026
**Status:** Noted — inconsistency to resolve in next Claude Code session

**Decision:**
Two Edge Function folders in GitHub use mixed-case names
(supabase/functions/Ingest, supabase/functions/Content_fetch)
while all other folders and Supabase slugs use lowercase
(auto-approver, ai-worker, publisher, inspector, inspector_sql_ro).

**Current state:**
- GitHub: Ingest, Content_fetch (mixed case — how they were originally committed)
- Supabase slugs: ingest, content_fetch (lowercase)

**Resolution:**
Rename the two GitHub folders to lowercase in the next Claude Code
terminal session (git mv is required — cannot be done safely via
GitHub API without risk of history disruption). Do not rename via
the GitHub web UI or API. Target state: all function folders
lowercase, matching their Supabase slug names exactly.

This is cosmetic only — Supabase deploys by slug, not folder name.
No production impact until the rename is executed.

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| Rename Ingest + Content_fetch folders to lowercase | Cosmetic — next Claude Code session | Next build session |
| Retool cancellation date | When Next.js dashboard is live and stable | Phase 2 completion |
| Model router implementation | When AI costs become significant | Phase 4 |
| Trigger.dev evaluation | When pg_cron job complexity demands it | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
| Second market expansion | After NDIS vertical proven with 5+ clients | Phase 4 |
| YouTube / video layer | When client demand justifies investment | Phase 4 |
