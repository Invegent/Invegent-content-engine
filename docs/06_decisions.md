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
2. Signal clustering live — repetition problem eliminated ✅ (D038)
3. NDIS compliance system prompt deployed
4. LinkedIn live
5. AI Diagnostic Agent Tier 1 running ✅ (deployed 19 Mar)

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

See full implementation details in the decisions log prior to 19 March.

---

## D021 — AI Usage Ledger and Cost Attribution
**Date:** March 2026
**Status:** Designed — schema migration and ai-worker update pending (Phase 2.10)

See full schema and build sequence in the decisions log prior to 19 March.

---

## D022 — Per-Post Platform Targeting Architecture
**Date:** March 2026
**Status:** Designed — schema migration and ai-worker update pending (Phase 2.11)

See full architecture in the decisions log prior to 19 March.

---

## D023 — Client Portal Information Architecture and Auth Model
**Date:** March 2026
**Status:** Designed — Phase 3.1 build in progress

See full auth model and portal scope in the decisions log prior to 19 March.

---

## D024 — RLS Client Data Isolation for Portal Tables
**Date:** 17 March 2026
**Status:** Confirmed — applied to production 17 March 2026

See full implementation details in the decisions log prior to 19 March.

---

## D025 — Client Feed Feedback System: Deferred to Phase 4
**Date:** 18 March 2026
**Status:** Deferred — build trigger: first paying client + Feed Agent validated

---

## D026 — Email Architecture for feeds@invegent.com
**Date:** 18 March 2026
**Status:** Designed — label setup pending (PK manual action)

See full label namespace architecture in the decisions log prior to 19 March.

---

## D027 — Visual Pipeline Architecture
**Date:** 19 March 2026
**Status:** Confirmed — V1 deployed 19 Mar 2026

See full format spectrum, rendering stack, and column definitions in
the decisions log prior to 19 March.

Implementation note (20 Mar): image-worker v3.3.0 deployed. Switched
from local WASM rendering (Resvg/Satori) to Creatomate cloud API.
See D040 for full decision record.

---

## D028 — Canva: Design Tool Only, Not API Integration
**Date:** 19 March 2026
**Status:** Confirmed — no Canva API integration planned

---

## D029 — Video Generation Stack: Creatomate + HeyGen + ElevenLabs
**Date:** 19 March 2026
**Status:** Confirmed — Phase 3 build, architecture locked

See full stack details in the decisions log prior to 19 March.

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

**Build priority order (immutable):**
1. Care for Welfare / NDIS Yarns
2. Property Pulse / Property Buyers Agent
3. NDIS Accessories / FBA store
4. Personal brand / YouTube channel
5. External NDIS clients
6. External property clients

**The right question for any build decision:**
Does this save PK time, reduce manual effort, or unlock a use case
across one of his businesses or personal brand? If yes — build it.

---

## D033 — ICE Reframe: AI-Operated Business System
**Date:** 19 March 2026
**Status:** Confirmed — strategic reframe with architectural implications

**Decision:**
ICE is not a content tool that uses AI. ICE is an AI-operated business
system that produces content as its primary output.

**The six-tier agent stack:**
- Tier 1 (Diagnose): reads logs, writes plain-English summary ✅ deployed 19 Mar
- Tier 2 (Fix approved list): executes pre-approved reversible actions (Pipeline Doctor = Tier 2 equivalent)
- Tier 3 (Propose): suggests higher-risk actions for human approval
- Tier 4 (Predict): acts on leading indicators before failures happen
- Tier 5 (Self-improve): proposes prompt improvements from engagement data
- Tier 6 (Closed loop): cross-checks own decisions against outcomes, calibrates

---

## D034 — YouTube is Phase 3, Not Phase 4
**Date:** 19 March 2026
**Status:** Confirmed — changes phase plan immediately

**Decision:**
YouTube Shorts pipeline (Creatomate + ElevenLabs + YouTube Data API)
is a Phase 3 deliverable. PK's personal YouTube channel is configured
as an ICE client in Phase 3. Not contingent on paying clients.

---

## D035 — Pipeline Monitoring Architecture: Health Snapshots + Doctor
**Date:** 19 March 2026
**Status:** Confirmed — deployed 19 March 2026

**Health snapshot schedule:** `*/30 * * * *` (at :00 and :30)
**Pipeline Doctor schedule:** `15,45 * * * *` (at :15 and :45)
**AI Diagnostic summary:** `55 * * * *` (at :55 — reads fresh doctor data)

---

## D036 — Taxonomy Scorer v2 and Bundler v3
**Date:** 19 March 2026
**Status:** Confirmed — deployed 19 March 2026, superseded by D038

See full details in the decisions log prior to 19 March.

---

## D037 — Timezone Architecture: UTC Storage, Client Timezone Display
**Date:** 19 March 2026
**Status:** Confirmed — fully implemented 19 March 2026

All timestamps stored in UTC. All display uses `c.client.timezone`.
All user input interpreted as client timezone. Browser local time never used.

---

## D038 — Signal Clustering: Two-Layer Deduplication
**Date:** 20 March 2026
**Status:** Confirmed — deployed 20 March 2026

**Decision:**
Replace single-layer canonical_id dedup with two-layer signal clustering:
(1) canonical_id dedup at selection time — prevents re-selecting the same
article across hourly digest runs, and (2) title similarity clustering —
groups different URLs covering the same story and bundles only one.

**Fix:**
Extension: pg_trgm enabled. `select_digest_items_v2` updated with Dedupe 2.
New column: `m.digest_item.story_cluster_id uuid`. New function:
`m.cluster_digest_items_v1`. New bundler: `m.bundle_client_v4`.
`run_pipeline_for_client` updated to call cluster step between select and bundle.

---

## D039 — Two-Attempt Rule: Switch Tools, Not Implementations
**Date:** 20 March 2026
**Status:** Confirmed — added to build discipline docs

If a fix fails twice using the same approach, stop and question the tool.
The right question: "Is this tool capable?" not "What did I get wrong this time?"

---

## D040 — Creatomate as Visual Pipeline Rendering Engine
**Date:** 20 March 2026
**Status:** Confirmed — production, image-worker v3.3.0+

Use Creatomate cloud API for all visual asset generation.
Background colour: root-level `fill_color` on composition (NOT shape element).
Font: Montserrat. Logo: direct Supabase Storage URL.
Plan: Essential $54/month, 2,000 credits.

---

## D041 — NDIS Compliance Framework Architecture
**Date:** 20 March 2026
**Status:** Confirmed — 20 active rules, ai-worker v2.4.0 injecting live

Rules in `t.5.7_compliance_rule` (vertical_slug = 'ndis').
ai-worker fetches and prepends compliance block to every system prompt.
HARD_BLOCK violations → draft marked dead. SOFT_WARN → included with
disclaimer guidance. All rules sourced from official NDIS documents only.
Monthly policy change detection cron running (compliance-monitor v1.2.0).

---

## D042 — Carousel Pipeline: Content Advisor + Organic Multi-Photo
**Date:** 20 March 2026
**Status:** Confirmed — deployed image-worker v3.5.0, publisher v1.6.0

**Decision:**
Carousel posts use a two-stage pipeline: (1) Claude content advisor
generates a precise slide spec from the post body, (2) Creatomate renders
one 1080×1080px PNG per slide, (3) publisher uploads slides as unpublished
photos then posts a multi-photo feed update (organic carousel).

**Option 1 (implemented): Organic multi-photo gallery**
Uses existing page access token. Each slide uploaded to `/{page-id}/photos`
with `published=false` → returns photo_id. Then `/{page-id}/feed` posted
with `attached_media[]` array of all photo_ids. No additional permissions
required beyond `pages_manage_posts` (already in App Review queue).

**Option 2 (future): Meta Ads API carousel**
Requires `ads_management` permission — deferred until Meta App Review
approves advertising permissions and boosting is active. At that point,
carousel posts can also be boosted as paid carousel ads. The slide images
stored in `m.post_carousel_slide` will be reused — no regeneration needed.

**Content Advisor:**
Claude (claude-sonnet-4-6, temperature 0.3) reads post body + brand profile
+ content vertical. Returns structured JSON: slide count (3-6), slide type
(hook/point/cta), headline (max 55 chars), sub_text (max 90 chars, null
for hook/cta). No hardcoded rules — Claude decides structure per content.

**Slide templates:**
- hook: large centred headline, "Swipe →" top right, left accent line
- point: numbered badge (slide_index-1), headline, horizontal divider, sub_text
- cta: large "?" watermark, centred question, "Follow [client] for more" footer

**Schema:**
`m.post_carousel_slide` — one row per slide. Fields: slide_id, post_draft_id,
slide_index, slide_type, headline, sub_text, image_url, image_status,
creatomate_render_id. Slides stored permanently — reusable for Option 2.

**Carousel gate:**
Publisher holds carousel posts until image_status = 'generated'.
image-worker only processes image_quote (single PNG) — carousel has its
own separate path within image-worker.

**Previous bug fixed:**
image-worker v3.3.0 was processing carousel posts and generating a single
PNG (same as image_quote). 9 incorrectly generated PNGs cleared.
image-worker v3.4.0 excluded carousel from image_quote query.
publisher v1.5.0 added carousel gate (hold if image not ready).
image-worker v3.5.0 + publisher v1.6.0 = full carousel pipeline.

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| Rename Ingest + Content_fetch folders to lowercase | Cosmetic — next Claude Code session | Next build session |
| Schema migration: m.ai_model_rate + m.ai_usage_log | Prerequisite for usage ledger (D021) | Phase 2.10 |
| ai-worker update: capture tokens, write ledger | Fills usage ledger with live data | Phase 2.10 |
| Test compliance injection against 20 recent drafts | Confirm no over-hedging | After PK review complete |
| YouTube Shorts pipeline | Creatomate + ElevenLabs + YouTube Data API | Phase 3.5 |
| PK personal YouTube channel as ICE client | Configuration, not building | Phase 3.6 |
| Prospect demo generator (Option B) | Needs proper scoping conversation before building | When ready |
| Option 2 carousel (Meta Ads API) | When ads_management permission approved + boosting active | Phase 3+ |
| Post Studio visual fields — format scorer (D031) | Lightweight Claude call on manual drafts | After visual pipeline verified |
| Content atomisation build | D022 + D027 + D029 combined execution | Phase 3, after LinkedIn live |
| Model router implementation | When AI costs become significant | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
| Second market expansion | After NDIS vertical proven with 5+ clients | Phase 4 |
| Upgrade Creatomate to Growth plan | When Phase 3 video pipeline starts | Phase 3 |
