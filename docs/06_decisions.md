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

**Meta Business Manager note:**
OAuth connect is sufficient for publishing. Business Manager partner
access is only required for the boost agent (Phase 3.4 ads permissions).

---

## D021 — AI Usage Ledger and Cost Attribution
**Date:** March 2026
**Status:** Designed — schema migration and ai-worker update pending (Phase 2.10)

**Decision:**
Every AI API call is written to an immutable ledger with token counts,
cost calculated at call time, and attribution to client + content type.
Cost rates are stored in a separate table (not in code) so they can
be updated without deployment when providers change pricing.

**Problem being solved:**
- No visibility into per-client AI cost — impossible to know if the
  unit economics hold as clients are added
- No separation of token costs by client — all AI spend is aggregated
- No tracking of fallback (OpenAI) usage or its relative cost
- No client-facing cost transparency

**Schema:**

```sql
-- Rates table: updated when pricing changes, no code deployment required
m.ai_model_rate
  provider           text        -- 'anthropic', 'openai', future: 'gemini'
  model              text        -- exact model string e.g. 'claude-sonnet-4-6'
  rate_input_per_1m  numeric     -- USD per 1M input tokens
  rate_output_per_1m numeric     -- USD per 1M output tokens
  effective_from     timestamptz -- when this rate came into effect
  effective_until    timestamptz -- NULL = currently active

-- Immutable usage ledger: one row per AI API call, never updated
m.ai_usage_log
  usage_id       uuid        PK
  client_id      uuid        FK → c.client
  ai_job_id      uuid        FK → m.ai_job (nullable)
  post_draft_id  uuid        FK → m.post_draft (nullable)
  provider       text        -- 'anthropic', 'openai'
  model          text        -- exact model string
  content_type   text        -- 'feed', 'campaign', 'instant', 'retry'
  platform       text        -- 'facebook', 'linkedin' etc. (nullable)
  input_tokens   integer
  output_tokens  integer
  total_tokens   integer     -- generated: input + output
  cost_usd       numeric(10,6) -- calculated at call time from rates table
  fallback_used  boolean     -- true if primary model failed, fallback ran
  created_at     timestamptz
```

**How cost is calculated:**
Both Claude and OpenAI return token counts in every API response.
ai-worker captures these, looks up current rate from `m.ai_model_rate`
where `effective_until IS NULL`, calculates:
`cost_usd = (input_tokens / 1_000_000 * rate_input) + (output_tokens / 1_000_000 * rate_output)`
and inserts one row to `m.ai_usage_log`.

On fallback: both the failed primary call and the successful fallback
call each get their own row. Both costs are attributed to the client.
Historical costs remain accurate because the ledger stores the rate
at time of call — not a reference to the current rate.

**Initial rates to seed:**

| provider | model | input/1M | output/1M |
|---|---|---|---|
| anthropic | claude-sonnet-4-6 | $3.00 | $15.00 |
| openai | gpt-4o | $2.50 | $10.00 |

**What operators see (ops dashboard — AI Costs tab):**
- Total spend this month across all clients
- Per-client breakdown — cost per post, monthly total
- Model split — Claude vs OpenAI fallback proportions
- Trend: this month vs last 3 months

**What clients see (portal — simplified):**
- Posts generated this month: N
- AI generation cost: $X.XX (included in your plan)
- This is transparency, not a billing interface — v1 is a managed
  service with bundled AI costs, not metered billing

**Why rates table not code:**
AI providers change pricing without warning. A rates table update
takes 30 seconds and is live immediately. A code change requires
a deployment. Historical data remains accurate because costs are
calculated and stored at call time, not recalculated later.

**Future model support:**
Adding Gemini, Mistral, or a new Claude model requires only a new
row in `m.ai_model_rate`. No schema changes, no code changes to
the ledger. The ai-worker stores whatever model string was used.

**Build sequence:**
1. Schema migration — create tables, seed initial rates
2. ai-worker update — capture tokens from API response, insert ledger row
3. Ops dashboard — AI Costs tab (read-only queries)
4. Client portal — simplified cost display per client

---

## D022 — Per-Post Platform Targeting Architecture
**Date:** March 2026
**Status:** Designed — schema migration and ai-worker update pending (Phase 2.11)

**Decision:**
Each post (from any content path) carries an explicit list of target
platforms. The ai-worker generates one separate draft per platform
from the same source signal, using platform-specific instructions.
This eliminates wasted generation, enables platform-appropriate
formatting, and provides the architecture for video/shorts/reels
content types in future.

**Problem being solved:**
- Currently: one draft generated, published to whichever platform the
  profile points at — no per-post platform selection
- Token waste: generating a LinkedIn long-form post for a Facebook-only
  client, or vice versa
- No differentiation: same text published to Facebook and LinkedIn
  despite very different optimal formats
- No client control: clients cannot select which platforms receive
  a given post, campaign, or series

**Architecture:**

One source signal → N drafts (one per target platform)

```
digest_item (target_platforms = ['facebook', 'linkedin'])
    ↓
ai-worker loops over target_platforms
    ↓
For each platform:
  load client_platform_profile (platform-specific voice/format rules)
  build system prompt (brand_identity + platform_voice for THIS platform)
  call Claude API
  insert post_draft (platform = 'facebook')  ← separate draft per platform
  insert post_draft (platform = 'linkedin')  ← separate draft per platform
    ↓
Each draft goes through its own:
  auto-approver → post_publish_queue → publisher
```

**Schema changes required:**

```sql
-- On m.digest_item: which platforms to generate for
ALTER TABLE m.digest_item
  ADD COLUMN target_platforms TEXT[] DEFAULT NULL;
-- NULL = inherit from client's active publish profiles
-- ['facebook'] = Facebook only, regardless of active profiles
-- ['facebook', 'linkedin'] = both

-- On m.post_draft: which platform this draft is for
ALTER TABLE m.post_draft
  ADD COLUMN platform TEXT DEFAULT NULL;
-- 'facebook', 'linkedin', 'instagram', 'instagram_reels' etc.
```

**Where target_platforms comes from per content path:**

| Content path | Source of target_platforms |
|---|---|
| Feed / daily signals | NULL → bundler reads active client_publish_profile rows |
| Content series / campaign | Set at campaign level in c.content_campaign |
| Instant / one-off post | Explicit selection in Post Studio or client portal |

**Token economics:**
Cost scales linearly with target platforms. Facebook-only clients
pay for one generation per post. Facebook + LinkedIn clients pay
for two. This is fair, transparent, and visible in the usage ledger
(D021) via the `platform` column on `m.ai_usage_log`.

**Future-proofing for video/reels/shorts:**
When Instagram Reels or TikTok is added, a new platform type
('instagram_reels') gets a new `c.client_platform_profile` row
with a prompt instructing the AI to generate a script rather than
post copy. The ai-worker, platform ticker, and usage ledger need
no structural changes — just a new profile row and platform string.
In the client portal, video platforms show greyed out with
"Contact us to activate" until the client has video production set up.

**Client portal UI — the platform ticker:**
On instant posts and campaign briefs, the client sees a row of
platform toggles (Facebook, LinkedIn, Instagram, etc.) above the
content brief. Active platforms for their account are selectable.
Inactive platforms are visible but greyed out. Default state is
their standard platform mix from active publish profiles.

---

## D023 — Client Portal Information Architecture and Auth Model
**Date:** March 2026
**Status:** Designed — build starts Phase 3.1

**Decision:**
The client portal (portal.invegent.com) is a separate Next.js app
from the ops dashboard, with Supabase Auth enforcing per-client
data isolation via RLS. The portal covers the full client lifecycle:
onboarding, operating, feedback, and offboarding. Build order is
driven by what unblocks the first paying client, not by completeness.

**Auth model:**
Supabase Auth natively supports all required methods — no third-party
auth library needed. Minimum two methods available to every client:

- **Magic link** — client enters email, receives a login link, clicks
  to authenticate. No password. Best for NDIS practice owners who
  primarily use mobile and don't want another password to remember.
- **Email OTP** — 6-digit verification code sent to email. Same
  security as magic link, different UX — better for users who prefer
  codes over clicking links (some corporate email clients block links).

Optional third method (Phase 3+ enhancement):
- **TOTP authenticator app** — Google Authenticator, Authy, 1Password.
  Client sets up once, generates a code on their phone. Higher security
  for clients who handle sensitive participant data and want it.

Password-based login is deliberately excluded. Passwords create
support overhead (resets, lockouts) that is not justified for a
managed service with a small client base. If a client specifically
requests it, it can be enabled per-account in Supabase Auth settings.

A `notifications_email` column on `c.client` stores the email address
used for auth and notifications. This is set during onboarding and
is the single address for both login links and draft review alerts.

**Full portal scope — all phases:**

Phase A — Onboarding (one time, Phase 3.1)
- Welcome screen with account overview
- Connect Facebook Page (OAuth flow — same as /connect on ops dashboard)
- Connect LinkedIn Page (when built, Phase 2.3)
- Brand voice review — client reviews AI persona, requests changes
- First content preview — 3 draft posts shown before going live
- Go-live confirmation — you flip mode from staging to auto

Phase B — Operating (ongoing, phased build)
- Draft inbox — approve/reject posts flagged below auto-approve threshold
- Content calendar — week/month view, scheduled + published + empty slots
- Platform ticker — per-post platform selection (D022, Phase 2.11)
- Instant post / slot picker — compose brief, pick available time slot,
  preview generated post, confirm (available slots calculated from
  min_gap_minutes + max_per_day in publish profile — not a free picker)
- Content series planner — campaign brief → AI-generated outline →
  client reviews/edits → schedule full series (requires Phase 2.4)
- Feedback signals — thumbs up/down on posts, "more/less like this"
  on topics, free-text topic requests ("we have a new OT joining")
- Performance dashboard — reach, engagement, follower growth
  (requires Phase 2.1 ✅ data flowing)
- Monthly report — plain-language insights + recommendations
  (requires Content Analyst Agent, Phase 3.2)
- AI cost transparency — posts generated this month, AI cost,
  "included in your plan" (requires D021 usage ledger)

Phase C — Ongoing feedback (lightweight, continuous, Phase 3+)
- Post-level signals feed back into scoring weights
- Topic preference adjustments stored in m.post_feedback
- Free-text brief requests ("we have a new OT joining next month")
  appear in ops dashboard as action items

Phase D — Leaving the platform (Phase 4)
- Pause publishing — stops auto-publishing, keeps account
- Export content history — all published posts as CSV
- Disconnect pages — revoke OAuth tokens
- Account closure request — triggers your offboarding checklist

**Build order for v1 (what unblocks first paying client):**

| Priority | Feature | Why |
|---|---|---|
| 1 | Auth + RLS policies | Security prerequisite for everything |
| 2 | Email notification on draft flagged | The doorbell — without it clients never open portal |
| 3 | Draft inbox (approve/reject) | Primary weekly client interaction |
| 4 | Calendar (read-only) | Builds trust, eliminates "what's going out?" queries |
| 5 | Facebook connect (OAuth moved from ops dashboard) | Required for external client onboarding |

Everything in Phase B and beyond is in scope — it is confirmed product
direction. The build order above is the minimum to onboard first client.
Series planner, performance, reports, offboarding are all real features
that will be built — the question is when, not whether.

**Mobile-first constraint:**
NDIS practice owners run their business from their phone. The portal
is designed mobile-first from the first component. This is a design
constraint applied at build time, not a responsive pass at the end.
Minimum touch target: 44px. All primary actions (approve/reject,
calendar navigation) must be fully operable on a 375px viewport.

**Ops dashboard visibility:**
When a client takes an action in the portal (approve, reject, flag,
feedback), it writes to the same tables the ops dashboard reads.
No separate sync needed — the operator sees client actions in real
time via the Drafts tab, Queue tab, and Failures tab.

---

## D024 — RLS Client Data Isolation for Portal Tables
**Date:** 17 March 2026
**Status:** Confirmed — applied to production

**Decision:**
Enable Row Level Security on all four portal-facing m.* tables.
Use a single helper function `public.auth_client_id()` to resolve
the current session's client_id from portal_user. All four policies
use the same simple pattern: `client_id = public.auth_client_id()`.

**Options Considered:**
- Application-layer filtering only (client code filters by client_id)
- RLS with join-based policy (encode digest chain into each policy)
- RLS with helper function + direct client_id match (chosen)

**Choice:** Helper function + direct client_id match

**Reasoning:**
Application-layer filtering alone is insufficient — a bug in the
portal code could expose one client's data to another. The digest
chain join (post_draft → digest_item → digest_run → client) is too
complex to encode safely into four separate RLS policies — and it
would have to be repeated in each one.

The correct solution was to first backfill `client_id` directly onto
`m.post_draft` for all existing rows (482 nulls resolved via the digest
join, run once as a data migration), then enforce simple direct-match
policies across all tables. Future rows are set directly at creation time.

**Implementation (17 March 2026):**

```sql
-- Helper: resolves client_id for the current auth session
CREATE OR REPLACE FUNCTION public.auth_client_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT client_id FROM public.portal_user
  WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Four tables, simple policies
ALTER TABLE m.post_draft ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.post_publish_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.post_publish ENABLE ROW LEVEL SECURITY;
ALTER TABLE m.post_performance ENABLE ROW LEVEL SECURITY;
```

**Data migration run simultaneously:**
```sql
UPDATE m.post_draft pd
SET client_id = dr.client_id
FROM m.digest_item di
JOIN m.digest_run dr ON dr.digest_run_id = di.digest_run_id
WHERE pd.digest_item_id = di.digest_item_id
AND pd.client_id IS NULL;
-- Result: 482 rows updated. 7 orphaned published rows remain null (harmless).
```

**Rule going forward:**
Every new post creation path must set `client_id` directly on
`m.post_draft` at insert time.

---

## D025 — Client Feed Feedback System: Deferred to Phase 4
**Date:** 18 March 2026
**Status:** Deferred — design agreed, build blocked on prerequisites

**Decision:**
Client-facing thumbs up / thumbs down on individual feed sources
in the portal is confirmed but deferred until Phase 4.

**What was agreed:**
Rating stored as `client_rating` on `c.client_source`. When rated,
Feed Intelligence Agent produces a plain-language report for that
feed and client — items produced, publish rate, topic coverage,
recommendation. Client sees this in the portal under the rated feed.

**Why deferred:**
1. Feed Intelligence Agent output not yet validated against real client context
2. rss.app API required before feed changes can be automated
3. No paying clients yet to validate the UX

**Schema when built:**
```sql
ALTER TABLE c.client_source ADD COLUMN client_rating TEXT
  CHECK (client_rating IN ('liked', 'disliked'));

CREATE TABLE public.feed_rating_event (
  event_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL,
  source_id  UUID NOT NULL,
  rating     TEXT NOT NULL CHECK (rating IN ('liked', 'disliked', 'cleared')),
  rated_by   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Build trigger:** first paying client live + Feed Agent validated + rss.app API active.

---

## D026 — Email Architecture for feeds@invegent.com
**Date:** 18 March 2026
**Status:** Designed — label setup pending (PK manual action)

**Decision:**
The `feeds@invegent.com` Google Workspace account is the single
email hub for all ICE inbound email processing. Two distinct
purposes are served — signal ingest (newsletters) and client
content submission — separated by a label namespace convention
that makes routing unambiguous and prevents cross-contamination.

**Context:**
`feeds@invegent.com` is a full Workspace account (confirmed 18 Mar).
It already has Gmail OAuth credentials stored in Supabase secrets
and is polled every 2h by the email-ingest Edge Function.
All routing is label-based — the Edge Function reads label names
to determine which pipeline branch to use.

**The two purposes are fundamentally different:**

| Purpose | Direction | Audience | Routing |
|---|---|---|---|
| Signal ingest (newsletters) | ICE reads | Shared — one subscription serves all clients in a vertical | Vertical-based labels |
| Client content submission | Client writes to ICE | Per-client — one client's submission must never reach another's pipeline | Client-based labels |

**Label namespace convention:**

```
newsletter/ndis               ← NDIS vertical newsletters (shared)
newsletter/property           ← Property vertical newsletters (shared)
newsletter/aged-care          ← Future vertical (shared)
newsletter/ndis-yarns/pub-name ← Client-specific newsletter (3 segments = per-client)

submit/ndis-yarns             ← Client-submitted content for NDIS Yarns
submit/property-pulse         ← Client-submitted content for Property Pulse
submit/client-slug            ← Scales per client onboarded
```

Two-segment label = shared vertical resource.
Three-segment label = client-specific resource.
Edge Function reads label prefix to determine routing branch.

**How client submission routing works:**

Each client gets a dedicated alias on `feeds@invegent.com`:
- `ndis-yarns@invegent.com` → Gmail filter → label `submit/ndis-yarns`
- `property-pulse@invegent.com` → Gmail filter → label `submit/property-pulse`
- Future client → `client-slug@invegent.com` → label `submit/client-slug`

The alias address is the client's dedicated submission address.
Emails arriving at that alias are auto-labelled by Gmail filter.
The Edge Function reads `submit/*` labels and routes to the
correct client pipeline without any manual intervention.

Google Workspace allows 30 aliases per user — sufficient for
current scale and expandable if needed.

**Infrastructure facts confirmed 18 Mar 2026:**
- `feeds@invegent.com` is a full Workspace account (not an alias on pk@)
- Aliases are added via Google Workspace Admin → Users → feeds account → Alternate email addresses
- No new OAuth credentials needed — aliases on the same account
  are accessible via the existing Gmail API credentials
- No new Edge Function needed — same email-ingest function,
  new label → new routing branch

**Image generation note (visual pipeline):**
Sharp (npm) native binaries are unreliable in Supabase Deno Edge Functions.
Recommended alternative: SVG template (pure TypeScript) → Resvg WASM
(`npm:@resvg/resvg-wasm`) → PNG → Supabase Storage.
This is the pattern Supabase's own OG image generation examples use.
No native binary dependency, confirmed working in Deno.

**Supabase Storage status (confirmed 18 Mar 2026):**
Zero buckets exist. Storage is completely untouched.
Bucket creation is part of the visual pipeline build.

**Pending manual actions (PK):**
1. Google Workspace Admin → Users → feeds@invegent.com → Add aliases:
   - `ndis-yarns@invegent.com`
   - `property-pulse@invegent.com`
2. Gmail (logged in as feeds@invegent.com) → Settings → Filters:
   - To: `ndis-yarns@invegent.com` → Apply label `submit/ndis-yarns`
   - To: `property-pulse@invegent.com` → Apply label `submit/property-pulse`
3. Future: repeat for each new client at onboarding

---

## D027 — Visual Pipeline Architecture
**Date:** 19 March 2026
**Status:** Confirmed — V1 deployed 19 Mar 2026

**Decision:**
ICE generates branded visual assets (images and carousels) automatically
for approved posts. Format selection is AI-driven at generation time,
platform-gated per client profile, and rendered by a dedicated
image-worker Edge Function. Video rendering is a separate Phase 3 layer
using the same architecture.

**Format spectrum (V1 → Phase 3):**

| Format | Code | V1 | Phase 3 |
|---|---|---|---|
| Text only | `text` | ✅ | ✅ |
| Branded quote card (single image) | `image_quote` | ✅ | ✅ |
| Carousel (multi-slide swipe post) | `carousel` | ✅ | ✅ |
| AI-generated contextual image | `image_ai` | ❌ | ✅ |
| Animated slideshow video | `video_slideshow` | ❌ | ✅ |
| Avatar video (stock or custom) | `video_avatar` | ❌ | ✅ |
| Voiceover only (no face) | `video_voiceover` | ❌ | ✅ |

**Why carousel is V1, not Phase 3:**
Carousels are the highest-performing organic format on LinkedIn for B2B
content — consistently 3-5x engagement vs single image posts. For NDIS
providers explaining policies or OT practices breaking down service types
across 5 slides, the carousel is the natural format. Creatomate handles
multi-frame export natively. Facebook and LinkedIn both support carousel
posts via their APIs. This belongs in V1, not deferred.

**Format scoring — AI decides at generation time:**
The ai-worker outputs `recommended_format` and `recommended_reason` as
part of the standard generation call. No additional API call. ~30-50
extra tokens. Logic:

| Content signal | Recommended format |
|---|---|
| Strong single stat, quote, or insight | `image_quote` |
| 4+ distinct structured points | `carousel` |
| News reaction, opinion, commentary | `text` |
| How-to or multi-step narrative | `video_slideshow` (Phase 3) |
| Short conversational engagement post | `text` |

**Platform gate — client profile controls execution:**
Even if AI recommends `image_quote`, image-worker skips it if
`image_generation_enabled = false` on the client's publish profile.
Clients are never charged for renders they haven't enabled.

**New columns on m.post_draft:**
```sql
recommended_format   text  -- 'text' | 'image_quote' | 'carousel' | 'video_slideshow' | 'video_avatar' | 'video_voiceover'
recommended_reason   text  -- one sentence explanation, for operator audit
image_headline       text  -- 10-15 word pull quote extracted at generation time (Option A)
image_url            text  -- public Supabase Storage URL once rendered
image_status         text  -- 'pending' | 'generated' | 'failed' | 'skipped'
carousel_slides      jsonb -- [{headline, body, position}] for carousel format
```

**New columns on c.client_publish_profile:**
```sql
image_generation_enabled   boolean  default false
video_generation_enabled   boolean  default false
preferred_format_facebook  text     default null  -- overrides AI recommendation per platform
preferred_format_linkedin  text     default null
preferred_format_instagram text     default null
```

**New columns on c.client_brand_profile:**
```sql
brand_colour_primary    text  -- hex e.g. '#1B4F8A'
brand_colour_secondary  text  -- hex e.g. '#F4A623'
brand_logo_url          text  -- Supabase Storage URL for logo PNG
image_style             text  -- 'quote_card' (v1), future: 'news_card', 'series_card'
persona_type            text  -- 'custom_avatar' | 'stock_avatar' | 'cartoon' | 'voiceover_only'
persona_avatar_id       text  -- HeyGen avatar ID (custom or stock)
persona_dialogue_mode   boolean default false  -- two-character script format
```

**Rendering stack:**
- Images (quote card, carousel): SVG template → Resvg WASM → PNG → Supabase Storage
- Video (Phase 3): Creatomate REST API (slideshow) / HeyGen API (avatar)
- AI-generated images (Phase 3): DALL-E 3 or Flux via Replicate

**Supabase Storage bucket:** `post-images` (public)
Path: `/{client_slug}/{post_draft_id}.png`
Carousel frames: `/{client_slug}/{post_draft_id}/slide_{n}.png`

**image-worker Edge Function:**
- Runs every 15 min via pg_cron
- Picks up: `approval_status = 'approved'` AND `image_status = 'pending'`
  AND client has `image_generation_enabled = true`
- Loads brand identity from `c.client_brand_profile`
- Renders SVG → PNG via Resvg WASM
- Uploads to Storage, updates `image_url` + `image_status = 'generated'`

**Publisher update:**
When publishing to Facebook or LinkedIn: if `image_url` is set,
attach as `picture` parameter (single image) or as carousel attachment
(multi-frame). Platform API handles embedding — no binary upload required
for single images; carousel requires multi-step attachment API.

**Content atomisation — future architecture:**
`preferred_format_per_platform` config (stored in `c.client_publish_profile`)
enables one signal → multiple format outputs simultaneously:
- LinkedIn → carousel
- Facebook → image_quote
- Instagram → image_quote (square crop)
This is the Phase 3 build. Schema supports it from day one.

**Known gap — Post Studio / manual drafts (D031):**
Drafts created via Post Studio bypass ai-worker entirely and have
`recommended_format = NULL` and `image_headline = NULL`. The image-worker
skips these. A lightweight format scorer for manual drafts is needed
to close this gap. See D031.

---

## D028 — Canva: Design Tool Only, Not API Integration
**Date:** 19 March 2026
**Status:** Confirmed — no Canva API integration planned

**Decision:**
Canva is used by the operator and clients as a design tool for
creating brand assets. It is not integrated into ICE via API.
All programmatic image generation uses SVG templates and Resvg WASM
within ICE's own pipeline.

**Options Considered:**
- Canva Connect API — programmatic brand template autofill
- Canva as design tool only, assets exported and stored in Supabase
- Custom SVG templates rendered via Resvg WASM

**Choice:** Canva for design, SVG/Resvg for programmatic generation

**Reasoning:**
Canva's Autofill and Brand Templates APIs require Enterprise subscription
(30+ person organisations, custom pricing, not publicly listed).
This is not viable for a sole-trader managed service.
The correct model for ICE: clients supply logo PNG + hex colours at
onboarding (Canva is a good tool for creating/exporting these assets).
ICE stores them in `c.client_brand_profile` and applies them to
SVG templates programmatically. Clients never need to touch a design
tool again after onboarding. For a managed service, this is a
selling point — the operator handles all of it.

**Brand kit onboarding (per client):**
1. Client supplies logo PNG + primary/secondary hex colours
2. Operator uploads logo to Supabase Storage, stores URL in brand profile
3. image-worker uses these values in all SVG template renders
4. No Canva account, no API keys, no Enterprise subscription required

---

## D029 — Video Generation Stack: Creatomate + HeyGen + ElevenLabs
**Date:** 19 March 2026
**Status:** Confirmed — Phase 3 build, architecture locked

**Decision:**
Three-layer video stack covering all client personas and format needs.
Each layer is independently callable from a video-worker Edge Function
via REST API. No server infrastructure required.

**Stack:**

| Layer | Tool | Use case |
|---|---|---|
| Slideshow / animated | Creatomate | Template-based video, no face, brand animations |
| Avatar video | HeyGen | Presenter-to-camera video, stock or custom avatar |
| Voiceover | ElevenLabs | Audio layer for any video format |

**Why Creatomate over Remotion:**
Remotion requires self-hosted rendering infrastructure (Puppeteer +
AWS servers at $50-100/month each). ICE runs on Supabase Edge Functions
with no server management. Creatomate is a cloud REST API — one HTTP
call from an Edge Function, no infrastructure. Template editor handles
design. Supports multi-frame carousel-to-video, animated transitions,
brand overlays, and royalty-free music library.

**Why HeyGen for avatars:**
HeyGen supports both stock avatars (library of diverse presenters,
no filming required) and custom avatars (client uploads 2-3 min video,
HeyGen generates reusable likeness). Avatar ID stored in
`c.client_brand_profile.persona_avatar_id`. One setup, used for
every video series that client produces.

**Persona types (stored in c.client_brand_profile.persona_type):**

| Type | Code | Description | Client objection resolved |
|---|---|---|---|
| Real person avatar | `custom_avatar` | Client films once, HeyGen generates custom likeness | Wants personal brand |
| Stock AI presenter | `stock_avatar` | Choose from HeyGen library, no filming | Camera shy / privacy concern |
| Illustrated cartoon | `cartoon` | Flat-design characters in Creatomate layout | Wants fun/distinctive format |
| Voiceover only | `voiceover_only` | ElevenLabs audio, no face shown | Professional, no gimmicks |

**Dialogue mode (`persona_dialogue_mode = true`):**
Series agent writes script as two-character exchange (Agent + Buyer,
Practitioner + Participant, etc.) instead of monologue. Creatomate
handles two-character layouts natively (left/right, speech bubbles).
HeyGen supports multi-avatar video. Same content brief, different
script structure output from ai-worker.

**Illustrated cartoon path (no Vyond required):**
V1 cartoon path uses Canva-designed character PNGs (flat illustration)
stored in Supabase Storage + Creatomate for layout and animation.
Characters are reusable across all episodes in a series. Static
characters with speech bubble dialogue is the intended format —
the writing does the humour work, not motion complexity.

**Cost per video episode (approximate):**
- Creatomate slideshow: ~$0.10-0.30 per render
- HeyGen stock avatar (60-90 sec): ~$0.50-1.50 per video
- ElevenLabs voiceover (90 sec): ~$0.05-0.10
- Custom avatar setup (one-time): ~$30-50 per client

**Build sequence (Phase 3):**
1. Creatomate account + API key → Supabase secret
2. video-worker Edge Function — picks up `recommended_format` starting with `video_`
3. Stock avatar path first (HeyGen library, no client filming required)
4. Voiceover-only path (ElevenLabs, no avatar)
5. Cartoon character path (client supplies or Canva-designed characters)
6. Custom avatar path (client filming + HeyGen custom likeness)
7. Dialogue mode script structure in series agent

**Platform routing for video:**

| Format | Facebook | LinkedIn | Instagram Reels | Aspect ratio |
|---|---|---|---|---|
| Slideshow video | ✅ | ✅ | ✅ | 1:1 or 16:9 |
| Avatar video | ✅ | ✅ | ✅ Reels | 9:16 for Reels, 1:1 for FB/LI |
| Voiceover only | ✅ | ✅ | ✅ | Same as above |

Creatomate and HeyGen both support rendering at multiple dimensions
from the same template/avatar — one job can output Facebook (1:1)
and Instagram Reels (9:16) simultaneously.

---

## D030 — Content Atomisation: One Signal, Multiple Format Outputs
**Date:** 19 March 2026
**Status:** Confirmed architecture — Phase 3 build

**Decision:**
ICE's content pipeline evolves from one-signal-one-post to
one-signal-one-content-pack. The same source signal or campaign brief
produces multiple format outputs simultaneously, each platform-native.

**What this means in practice:**

A single NDIS policy update produces:
- LinkedIn: carousel (5 slides breaking down key changes)
- Facebook: text post (plain language explanation for families)
- Instagram: quote card (the single most important number)
- Video: 60-second voiceover summary

A single campaign brief (sensory toys series, 10 episodes) produces:
- Facebook: text posts with image_quote
- LinkedIn: carousel per episode
- Instagram Reels: video_avatar or video_slideshow

**Architecture:**
`preferred_format_facebook`, `preferred_format_linkedin`,
`preferred_format_instagram` columns in `c.client_publish_profile`
define the default format per platform. These override or supplement
the AI's `recommended_format` at render time.

The ai-worker already generates platform-specific content (D022).
The image-worker and video-worker already pick up by format type.
Content atomisation is the combination of D022 + D027 + D029
working together — no new pipeline logic, just new configuration.

**Why this matters for the product:**
This is what separates ICE from a scheduler. A client briefs once.
ICE produces a platform-native content pack. Every platform gets
content optimised for its format and audience. The client approves
one brief, not five individual posts. This is the full realisation
of the signal-centric architecture — signals don't produce posts,
they produce content strategies executed across platforms.

**Build trigger:** After visual pipeline V1 proven in production +
LinkedIn API access confirmed + at least one paying client live.

---

## D031 — Visual Fields for Manual / Post Studio Drafts
**Date:** 19 March 2026
**Status:** Pending — design agreed, build deferred

**Decision:**
All content creation paths in ICE — feed pipeline AND manual/Post Studio
— must populate `recommended_format`, `recommended_reason`, and
`image_headline` so the visual pipeline applies consistently regardless
of how a draft was created.

**Problem:**
Post Studio and any future manual draft creation path bypass ai-worker
entirely. These drafts land with `recommended_format = NULL` and
`image_headline = NULL`. The image-worker skips them, so they publish
as plain text even when the client has `image_generation_enabled = true`.
This creates an inconsistent experience — pipeline drafts get images,
manual drafts don't.

**Why this matters:**
When a client manually posts something timely ("we just hired a new OT")
or creates a promotional post, that's often the content they most want
to look polished with a branded image. The pipeline drafts are handled.
The human-initiated content is not.

**Options considered:**
1. Manual patch (SQL) — operator sets fields by hand. Viable at 1-2
   clients, not scalable. Already used for testing 19 Mar 2026.
2. Post Studio UI fields — add format selector + image headline input
   to the Post Studio form. Client sets format at creation time. Fast
   to build, puts burden on the creator.
3. Lightweight format scorer — a small function runs on `needs_review`
   drafts where `recommended_format IS NULL`. Calls Claude with just
   the draft body, asks it to score format + extract image headline.
   Runs automatically, zero UI change, fully consistent with pipeline
   drafts. Higher quality than creator-chosen format.

**Choice:** Option 3 — lightweight format scorer (preferred)
with Option 2 as interim until scorer is built.

**Implementation design (Option 3):**

A new `format-scorer` Edge Function (or add to auto-approver):
- Triggered: runs after auto-approver, or as part of approval flow
- Condition: `recommended_format IS NULL` AND `draft_body IS NOT NULL`
- Input: draft body + client vertical context
- Claude call: single message, ~200 tokens
  Prompt: "Given this post body, select the best format
  (text/image_quote/carousel) and provide a 10-15 word image headline.
  Return JSON: {recommended_format, recommended_reason, image_headline}"
- Output: updates `recommended_format`, `recommended_reason`,
  `image_headline` on the draft row
- Cost: ~$0.003 per draft — negligible

**Implementation design (Option 2 — interim):**
Add to Post Studio form:
- Format selector: text / image_quote / carousel (defaults to image_quote)
- Image headline: text input, placeholder "10-15 word pull quote for image"
- Both fields optional — if blank, image-worker uses fallback headline

**Build trigger (Option 3):** After visual pipeline V1 verified working
in production with pipeline drafts. Not urgent — workaround (Option 1
manual patch, Option 2 UI) covers gap in the short term.

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| Rename Ingest + Content_fetch folders to lowercase | Cosmetic — next Claude Code session | Next build session |
| Schema migration: m.ai_model_rate + m.ai_usage_log | Prerequisite for usage ledger (D021) | Phase 2.10 |
| ai-worker update: capture tokens, write ledger | Fills usage ledger with live data | Phase 2.10 |
| Schema migration: target_platforms + platform columns | Prerequisite for platform targeting (D022) | Phase 2.11 |
| ai-worker update: loop per target platform | One draft per platform per source signal | Phase 2.11 |
| Client feed feedback (D025) | Rating → Feed Agent analysis → client report | Phase 4 |
| email-ingest Edge Function: add submit/* label routing | Reads submit/client-slug labels, routes to client pipeline | Deferred — PK to confirm Gmail strategy |
| Post Studio visual fields — format scorer (D031) | lightweight Claude call on manual drafts to populate recommended_format + image_headline | After visual pipeline V1 verified |
| Post Studio visual fields — UI interim (D031) | format selector + image headline field in Post Studio form | Next dashboard build session |
| Creatomate account + video-worker | Phase 3 video rendering | Phase 3 |
| HeyGen stock avatar path | Phase 3 video, no filming required | Phase 3 |
| ElevenLabs voiceover path | Phase 3 audio layer | Phase 3 |
| AI-generated contextual images (DALL-E 3 / Flux) | Phase 3 image quality ceiling | Phase 3 |
| Content atomisation build | D022 + D027 + D029 combined execution | Phase 3, post first paying client |
| Model router implementation | When AI costs become significant | Phase 4 |
| Trigger.dev evaluation | When pg_cron job complexity demands it | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
| Second market expansion | After NDIS vertical proven with 5+ clients | Phase 4 |
| Premium Services catalogue design | When 5 paying clients live | Phase 3+ |
| Recent post history injection into ai-worker | Prevent topic repetition | Phase 4 |
