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
Application-layer filtering is dangerous — a bug in filtering
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
**Status:** Revised — see D032 for updated trigger

**Decision:**
First paying client conversations will not begin until the
engine is demonstrably working well on PK's own businesses.
The trigger is quality of personal business output, not a
fixed calendar date or client-count target.

**Gate criteria (revised per D032):**
1. Visual pipeline confirmed — 5+ image posts published cleanly
2. Signal clustering live — repetition problem eliminated
3. NDIS compliance system prompt deployed
4. LinkedIn live
5. AI Diagnostic Agent Tier 1 running

**Original gate (superseded):** April/May 2026 date target.
**Revised gate:** When engine is proven on PK's personal businesses.

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
- public.manual_post_insert() — inserts post_draft + optional queue entry
- public.draft_approve_and_enqueue() — approves draft, creates queue entry
- public.draft_set_status() — updates approval_status on any draft
- public.store_facebook_page_token() — stores OAuth page token (D020)

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
The existing join chain: post_draft → digest_item → digest_run → client.
Manual posts have digest_item_id = null, so the join returns nothing.
This caused client name showing as "Unknown" and draft_approve_and_enqueue()
silently skipping queue entry creation.

**Solution:**
- ALTER TABLE m.post_draft ADD COLUMN client_id uuid (nullable FK)
- manual_post_insert() populates client_id directly
- draft_approve_and_enqueue() uses COALESCE(digest_chain_client_id, pd.client_id)
- Drafts query uses COALESCE(c_direct.client_name, c_digest.client_name, 'Unknown')

**Rule:**
All new post creation paths that bypass the feed pipeline must
set client_id directly on the post_draft row.

---

## D020 — OAuth Connect Flow Pulled Forward to Phase 3.3
**Date:** March 2026
**Status:** ✅ Implemented — 16 March 2026

**Decision:**
The Facebook OAuth page connect flow is pulled forward from Phase 3.3
and built before the Meta App Review screencast is recorded.

**What was built (16 March 2026):**
- `app/(dashboard)/connect/page.tsx` — per-client connection status + Connect/Reconnect
- `app/api/facebook/auth/route.ts` — builds OAuth URL with state=clientId
- `app/api/facebook/callback/route.ts` — token exchange, page fetch, single/multi-page handling
- `app/(dashboard)/connect/select-page/page.tsx` — picker for multi-page accounts
- `app/api/facebook/select-page/route.ts` — stores chosen page token, clears cookie
- `components/sidebar.tsx` — Connect nav item added
- `docs/migrations/20260316_oauth_connect.sql` — schema migration

**Schema changes applied:**
```sql
ALTER TABLE c.client_publish_profile
  ADD COLUMN page_access_token TEXT,
  ADD COLUMN page_id TEXT,
  ADD COLUMN page_name TEXT;
CREATE FUNCTION public.store_facebook_page_token(...) SECURITY DEFINER;
```

**Publisher v1.2.0** updated simultaneously to prefer `page_access_token`
from DB over legacy env-var method. Backward compatible — existing clients
using `destination_id` + `credential_env_key` are unaffected.

**Client onboarding note:**
The `/connect` page on the ops dashboard is the internal tool.
For external clients, this flow moves to `portal.invegent.com/connect`
(Phase 3.1) so clients can complete OAuth themselves. For managed
service onboarding before the portal exists, the workaround is to
have the client temporarily add Invegent as a Page admin, run the
flow, then optionally remove admin access.

---

## D021 — AI Usage Ledger and Cost Attribution
**Date:** March 2026
**Status:** Designed — schema migration and ai-worker update pending (Phase 2.10)

**Decision:**
Every AI API call is written to an immutable ledger with token counts,
cost calculated at call time, and attribution to client + content type.
Cost rates are stored in a separate table (not in code) so they can
be updated without deployment when providers change pricing.

See full schema, cost calculation, and build sequence in the decisions
log version prior to 19 March. All design decisions remain unchanged.

---

## D022 — Per-Post Platform Targeting Architecture
**Date:** March 2026
**Status:** Designed — schema migration and ai-worker update pending (Phase 2.11)

**Decision:**
Each post carries an explicit list of target platforms. The ai-worker
generates one separate draft per platform from the same source signal.

See full architecture in the decisions log version prior to 19 March.
All design decisions remain unchanged.

---

## D023 — Client Portal Information Architecture and Auth Model
**Date:** March 2026
**Status:** Designed — Phase 3.1 build in progress

See full auth model and portal scope in the decisions log version
prior to 19 March. All design decisions remain unchanged.

---

## D024 — RLS Client Data Isolation for Portal Tables
**Date:** 17 March 2026
**Status:** Confirmed — applied to production 17 March 2026

See full implementation details in the decisions log version
prior to 19 March. All decisions unchanged.

---

## D025 — Client Feed Feedback System: Deferred to Phase 4
**Date:** 18 March 2026
**Status:** Deferred — build trigger: first paying client + Feed Agent validated

---

## D026 — Email Architecture for feeds@invegent.com
**Date:** 18 March 2026
**Status:** Designed — label setup pending (PK manual action)

See full label namespace architecture in the decisions log version
prior to 19 March. All decisions unchanged.

---

## D027 — Visual Pipeline Architecture
**Date:** 19 March 2026
**Status:** Confirmed — V1 deployed 19 Mar 2026

See full format spectrum, rendering stack, and column definitions in
the decisions log version prior to 19 March. All decisions unchanged.

Implementation note (19 Mar): image-worker v1.4.0 deployed with GitHub
CDN font loading (rsms/inter v4.0) as workaround for font file upload
failure. Fonts should be properly uploaded to Supabase Storage
brand-assets/fonts/ when possible — PK pending manual action.

---

## D028 — Canva: Design Tool Only, Not API Integration
**Date:** 19 March 2026
**Status:** Confirmed — no Canva API integration planned

---

## D029 — Video Generation Stack: Creatomate + HeyGen + ElevenLabs
**Date:** 19 March 2026
**Status:** Confirmed — Phase 3 build, architecture locked

See full stack details, persona types, and build sequence in the
decisions log version prior to 19 March. All decisions unchanged.

---

## D030 — Content Atomisation: One Signal, Multiple Format Outputs
**Date:** 19 March 2026
**Status:** Confirmed architecture — Phase 3 build

---

## D031 — Visual Fields for Manual / Post Studio Drafts
**Date:** 19 March 2026
**Status:** Pending — lightweight format scorer (Option 3) preferred

---

## D032 — ICE Primary Purpose: Personal Businesses First
**Date:** 19 March 2026
**Status:** Confirmed — foundational principle, overrides all client-ROI framing

**Decision:**
ICE's primary purpose is to solve PK's personal content problem across
his own businesses and personal brand. External clients are a bonus
application of infrastructure that already needed to exist for personal use.

**Options Considered:**
- Build for clients first, use for personal businesses second
- Build for personal use first, clients as bonus
- Treat both equally

**Choice:** Personal businesses first, clients third

**Reasoning:**
This was the original intent of the project and was already documented
in 07_business_context.md. However, the build sessions had drifted toward
treating client acquisition as the primary driver — evaluating features
on client ROI, deferring YouTube to Phase 4, treating personal brand
as a lower priority than client infrastructure.

The reframe is important: every feature that serves PK's businesses
is justified on its own merits. It does not need a paying client to
justify it. YouTube is not a Phase 4 luxury — it is a Phase 3 personal
brand investment that serves multiple businesses simultaneously.

The engine proves itself on PK's own world first. When it is demonstrably
working well across his own businesses, external clients become a natural
extension — not the reason the system exists.

**Build priority order (immutable):**
1. Care for Welfare / NDIS Yarns
2. Property Pulse / Property Buyers Agent
3. NDIS Accessories / FBA store
4. Personal brand / YouTube channel
5. External NDIS clients
6. External property clients

**The right question for any build decision:**
Does this save PK time, reduce manual effort, or unlock a use case
across one of his businesses or personal brand?
If yes — build it. Client ROI is irrelevant to this assessment.

---

## D033 — ICE Reframe: AI-Operated Business System
**Date:** 19 March 2026
**Status:** Confirmed — strategic reframe with architectural implications

**Decision:**
ICE is not a content tool that uses AI. ICE is an AI-operated business
system that produces content as its primary output. AI runs the system —
it does not merely assist one step in the pipeline.

**The original design:**
AI appeared at one point in the pipeline (ai-worker, generating drafts).
Everything else was coded logic with hardcoded rules. The operator
(PK) monitored, debugged, and maintained the system manually.

**The revised design:**
AI appears at every stage:
- Signal layer: relevance scoring, topic clustering, emerging topic detection
- Writing layer: multi-angle drafts, voice calibration, compliance-aware generation
- Operations layer: six-tier autonomous agent stack (diagnose → fix → propose → predict → self-improve → closed loop)
- Business layer: client health reports, sales demo generation, onboarding intelligence

**Architectural implication:**
The Pipeline Doctor (deployed 19 Mar 2026) is Tier 2 infrastructure
with hardcoded logic — the current state of the operations layer.
The AI Diagnostic Agent (Tier 1) is the first true AI-in-the-loop
operations component. Building Tier 1 before Tier 2 upgrade is
deliberate: validate diagnosis quality before trusting action quality.

**The six-tier agent stack:**
- Tier 1 (Diagnose): reads logs, writes plain-English summary, no actions
- Tier 2 (Fix approved list): executes pre-approved reversible actions
- Tier 3 (Propose): suggests higher-risk actions for human approval
- Tier 4 (Predict): acts on leading indicators before failures happen
- Tier 5 (Self-improve): proposes prompt improvements from engagement data
- Tier 6 (Closed loop): cross-checks own decisions against outcomes, calibrates

**Build sequence:**
Tier 1 → (1-2 weeks validation) → Tier 2 → Phase 4: Tiers 3-6

---

## D034 — YouTube is Phase 3, Not Phase 4
**Date:** 19 March 2026
**Status:** Confirmed — changes phase plan immediately

**Decision:**
The YouTube Shorts pipeline (Creatomate + ElevenLabs + YouTube Data API)
is a Phase 3 deliverable. PK's personal YouTube channel is configured
as an ICE client in Phase 3. This is not contingent on paying clients.

**Previous position:**
YouTube was listed as Phase 4, gated on client acquisition and revenue.

**Why this was wrong:**
ICE's primary purpose is PK's personal businesses and brand (D032).
YouTube is a first-class personal brand channel. The video rendering
stack (D029) was designed with PK's personal creative output in mind
from the start. Deferring it to Phase 4 imported client-ROI thinking
into a decision that should be driven by personal use value.

**What changes:**
- 04_phases.md: YouTube Shorts pipeline moved from Phase 4 to Phase 3
- PK personal YouTube channel added as Phase 3.6 deliverable
- Personal brand content series added as Phase 3.7
- Effort estimate for Phase 3 increases by 3-4 weeks (video pipeline)
- Phase 4 no longer contains video pipeline first-build items

**What does not change:**
- Content atomisation (D030) still requires LinkedIn live + first paying client
- Custom avatar path (HeyGen, requires client filming) still Phase 4
- Full dialogue mode video still Phase 4

---

## D035 — Pipeline Monitoring Architecture: Health Snapshots + Doctor
**Date:** 19 March 2026
**Status:** Confirmed — deployed 19 March 2026

**Decision:**
Pipeline monitoring uses two complementary systems:
(1) passive health snapshots every 30 minutes — observe and record,
(2) active Pipeline Doctor every 30 minutes offset by 15 — read, diagnose, fix.

**Options Considered:**
- External monitoring tool (Datadog, Sentry)
- Single combined agent that both monitors and acts
- Separate passive observer + active fixer

**Choice:** Separate passive + active, Supabase-native

**Reasoning:**
External monitoring tools add vendor cost and complexity for a system
that is already fully instrumented via PostgreSQL. The separation of
concerns (observer vs actor) is deliberate: the health snapshot is the
source of truth for what happened; the doctor reads it to decide what
to do. Conflating them would make it harder to audit whether the doctor's
actions were correct relative to what the pipeline was actually doing.

**Health snapshot schedule:** pg_cron `*/30 * * * *` (at :00 and :30)
**Pipeline Doctor schedule:** pg_cron `15,45 * * * *` (at :15 and :45)

This staggering ensures the doctor always reads a fresh snapshot
(maximum 15 minutes old) rather than acting on potentially stale data.

**Tables:**
- `m.pipeline_health_log` — passive snapshots
- `m.pipeline_doctor_log` — doctor findings and fixes

**Doctor's seven checks (v1.0.0):**
1. image_worker_health — detects stalled/failed image generation
2. stuck_running — detects publisher timeouts without cleanup
3. past_due_queue — detects items past schedule by > 2 hours
4. image_hold_timeouts — detects posts that fell through to text
5. orphaned_ai_jobs — detects succeeded jobs with stale draft state
6. approved_images_due — detects image drafts approaching hold timeout
7. dead_items — detects dead/failed queue items, retries transient failures

**Auto-fix actions (approved list — Tier 2 equivalent):**
- Reset image_status='failed' → 'pending'
- Nudge pending image drafts (touch updated_at) when stalled
- Reset status='running' → 'queued' for stuck publisher items
- Requeue orphaned ai_jobs
- Retry dead items with < 3 attempts and transient errors

**What the doctor does NOT auto-fix:**
- Past-due items (may be daily cap — logs reason, flags after 3 consecutive checks)
- Posts already published as text after hold timeout (irreversible)
- Dead items with > 3 attempts or non-transient errors (manual review)

---

## D036 — Taxonomy Scorer v2 and Bundler v3
**Date:** 19 March 2026
**Status:** Confirmed — deployed 19 March 2026

**Decision:**
Replace the keyword-based taxonomy scorer v1 with a multi-word
phrase-based scorer v2. Replace bundler v2 with bundler v3 that
enforces a maximum of 2 items per category per bundle.

**Problem (discovered 19 Mar):**
The v1 scorer matched single keywords against topic names. The word
"rate" matched "interest_rates" for almost any article — resulting in
98% of all items being tagged as interest_rates regardless of content.
This produced highly repetitive content (4 RBA/interest rate posts per
day) and starved all other categories.

**Root cause:**
Single-word matching is too broad. "Rate" appears in: give-up rate,
approval rate, vaccination rate, heart rate, exchange rate, growth rate,
rental yield rate, interest rate. Only the last is interest_rates.

**Fix (score_digest_items_v2):**
- All category patterns use specific multi-word phrases
- interest_rates only fires on: "interest rate", "cash rate", "rba rate",
  "monetary policy", "rate decision", "basis points"
- Categories processed in priority order (most specific first)
- Score thresholds tuned per category

**Bundler v3:**
- Adds `p_max_per_cat` parameter (default 2)
- Enforces maximum 2 items per category per bundle window
- Prevents any single category from dominating the digest
- `run_pipeline_for_client` updated to call v2 scorer + v3 bundler

**Impact:**
981 items previously all tagged interest_rates were rescored.
Distribution moved to 7 categories with appropriate proportions.
Content repetition problem significantly reduced at source.
Signal clustering (Phase 3.2) will complete the fix at the semantic level.

---

## D037 — Timezone Architecture: UTC Storage, Client Timezone Display
**Date:** 19 March 2026
**Status:** Confirmed — fully implemented 19 March 2026

**Decision:**
All timestamps stored in UTC. All display uses c.client.timezone.
All user input (episode scheduling, queue scheduling) interpreted as
client timezone. Browser local time is never used for scheduling.

**Options Considered:**
- Store in client timezone (simple display, complex queries)
- Store in UTC, display in browser local time (inconsistent across devices)
- Store in UTC, display in client timezone (correct, consistent)

**Choice:** UTC storage, client timezone display

**Reasoning:**
UTC storage is the only correct approach for a multi-client system.
Browser local time varies by device and user — two operators in
different timezones would see different scheduled times for the same
post, which is confusing and error-prone. The client timezone is the
authoritative context for scheduling because the client's audience is
in their timezone, not the operator's.

**Implementation:**
- `lib/tz.ts` created in invegent-dashboard:
  - `utcToDatetimeLocal(isoUtc, tz)` — converts UTC ISO to HTML datetime-local string
  - `datetimeLocalToUtc(dtl, tz)` — converts datetime-local input to UTC ISO
  - `formatAbsoluteInTz(isoUtc, tz)` — formats UTC as human-readable in named timezone
  - `getTzAbbreviation(tz)` — returns AEDT, AEST, etc.
- All scheduling inputs in EpisodeRow.tsx, SeriesDetail.tsx use tz functions
- Queue page, Portal CalendarView all show times in client timezone with label
- `get_content_series_detail()` updated to return `client_timezone` via c.client join

**AEDT label display:**
All scheduled time displays show the timezone abbreviation (e.g. "AEDT")
so the operator and client always know which timezone is being shown.
This eliminates the class of error where someone schedules a post
at "9am" and it fires at an unexpected time due to timezone ambiguity.

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| Upload Inter fonts to Supabase Storage | PK: drag/drop to brand-assets/fonts/ via dashboard UI | This week |
| Rename Ingest + Content_fetch folders to lowercase | Cosmetic — next Claude Code session | Next build session |
| AI Diagnostic Agent Tier 1 build | Edge Function + Claude API + m.pipeline_ai_summary + dashboard section | Next build session |
| Schema migration: m.ai_model_rate + m.ai_usage_log | Prerequisite for usage ledger (D021) | Phase 2.10 |
| ai-worker update: capture tokens, write ledger | Fills usage ledger with live data | Phase 2.10 |
| Schema migration: target_platforms + platform columns | Prerequisite for platform targeting (D022) | Phase 2.11 |
| ai-worker update: loop per target platform | One draft per platform per source signal | Phase 2.11 |
| Signal clustering — semantic dedup at bundler | Replace category-based dedup. Eliminates repetition. | Phase 3.2 |
| Compliance-aware NDIS system prompt | Rewrite NDIS Yarns brand profile system prompt | Phase 3.3 |
| YouTube Shorts pipeline | Creatomate + ElevenLabs + YouTube Data API | Phase 3.5 |
| PK personal YouTube channel as ICE client | Configuration, not building | Phase 3.6 |
| Post Studio visual fields — format scorer (D031) | Lightweight Claude call on manual drafts | After visual pipeline V1 verified |
| Post Studio visual fields — UI interim (D031) | Format selector + image headline field | Next dashboard build session |
| Client feed feedback (D025) | Rating → Feed Agent analysis → client report | Phase 4 |
| email-ingest Edge Function: add submit/* label routing | Reads submit/client-slug labels | Deferred |
| Content atomisation build | D022 + D027 + D029 combined execution | Phase 3, after LinkedIn live |
| Model router implementation | When AI costs become significant | Phase 4 |
| Trigger.dev evaluation | When pg_cron job complexity demands it | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
| Second market expansion | After NDIS vertical proven with 5+ clients | Phase 4 |
| Premium Services catalogue design | When 5 paying clients live | Phase 3+ |
| Knowledge base + embedding layer | Start collecting now, queryable later | Phase 4 |
| AI agent Tiers 3-6 | After Tiers 1-2 validated | Phase 4 |
