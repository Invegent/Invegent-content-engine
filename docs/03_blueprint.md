# ICE — Technical Blueprint

## Architecture Overview

ICE is built on a single Supabase backend serving multiple surfaces.
All intelligence, automation, and data lives in one place.
Multiple apps and agents read from and write to the same database.
```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                │
│              (PostgreSQL + Edge Functions + Auth)               │
│                                                                 │
│  PIPELINE ENGINE          AGENT LAYER          DATA LAYER       │
│  ───────────────          ───────────          ──────────       │
│  ingest-worker            auto-approver        f.* (feeds)      │
│  content-fetch            feed-intelligence    m.* (publishing) │
│  ai-worker                content-analyst      c.* (clients)    │
│  bundler                  insights-worker      t.* (taxonomy)   │
│  publisher                boost-worker         a.* (enrichment) │
│  pg_cron (scheduler)                           k.* (governance) │
└──────────┬──────────────────────┬──────────────────┬───────────┘
           │                      │                  │
           ▼                      ▼                  ▼
┌──────────────┐      ┌──────────────┐    ┌──────────────┐
│  Operations  │      │    Client    │    │   Client     │
│  Dashboard   │      │    Portal    │    │   Websites   │
│              │      │              │    │  (one per    │
│  Next.js     │      │  Next.js     │    │   client)    │
│  Vercel      │      │  Vercel      │    │  Next.js     │
│  (team only) │      │  (RLS auth)  │    │  Vercel      │
└──────────────┘      └──────────────┘    └──────────────┘
         │                      │                  │
         └──────────────────────┴──────────────────┘
                           Claude Code
               builds and maintains all three
```

## Frontend Architecture

**Three separate Next.js apps, three separate GitHub repos:**

| App | Repo | URL | Audience |
|---|---|---|---|
| Operations Dashboard | invegent-dashboard | dashboard.invegent.com | Internal team (2-3 people) |
| Client Portal | invegent-portal | portal.invegent.com | Paying clients |
| Marketing / Web | invegent-web | invegent.com | Public |

All deployed on Vercel. Subdomain DNS via Cloudflare pointing to Vercel.

Client proof pages (NDIS Yarns, Property Pulse) are served as subdomains of invegent.com
(e.g. ndisyarns.invegent.com) until separate domains are warranted.

**Dashboard authentication:** Supabase Auth (email/password), multi-user from day one.
No sign-up flow — users created manually by admin. All authenticated users have full
read/write access (no per-user RLS for internal dashboard). Service role key used
server-side for all data fetching.

**Client portal authentication:** Supabase Auth + Row Level Security enforced at DB level.
Each client sees only their own data.

---

## Technology Stack

### Core Infrastructure
| Component | Technology | Purpose |
|---|---|---|
| Database | Supabase / PostgreSQL | Single source of truth for all data |
| Serverless functions | Supabase Edge Functions (Deno/TypeScript) | Pipeline workers and agents |
| Scheduling | pg_cron | Automated pipeline orchestration |
| Auth | Supabase Auth + RLS | Multi-tenant client isolation |
| Storage | Supabase Storage | File assets if needed |

### AI Layer
| Component | Technology | Notes |
|---|---|---|
| Primary model | Claude API (Anthropic) | Better synthesis, brand voice, compliance |
| Secondary model | OpenAI GPT-4o | Fallback, specific tasks |
| Model routing | client_ai_profile.model | Per-client config, swappable |
| API pattern | Chat Completions / Responses API | Not Assistants (deprecated) |

### Publishing Layer
| Platform | API | Status |
|---|---|---|
| Facebook | Meta Graph API | ✅ Working |
| LinkedIn | LinkedIn API v2 | ⏳ Pending account recovery |
| Email | Resend API | 🔲 Planned |
| Website | Next.js + Supabase | 🔲 Planned |
| Instagram | Meta Graph API | 🔲 Future |

### Development & Deployment
| Component | Technology | Purpose |
|---|---|---|
| Dashboard / Portal / Sites | Next.js 14 (App Router) | All three client layers |
| Component library | shadcn/ui + Tailwind | Production-grade UI |
| Deployment | Vercel | Auto-deploy on git push |
| Version control | GitHub (Invegent org) | Source of truth for code |
| AI builder | Claude Code | Builds and maintains all layers |
| Local DB access | Supabase MCP | Direct DB queries in chat |

---

## Database Schema

### Schema Map
```
f.*  — Feed / Ingest layer (facts, raw data)
m.*  — Publishing layer (meaning, decisions, outputs)
c.*  — Client configuration layer
t.*  — Taxonomy reference layer (global, never changes)
a.*  — Enrichment layer (keywords, topics)
k.*  — Governance / data catalog
```

### Key Tables by Schema

**f schema — Feed & Ingest**
```
f.feed_source              Master list of all feed sources
f.ingest_run               Log of each ingest execution
f.ingest_error_log         Errors from ingest runs
f.raw_content_item         Raw items from each source
f.content_item             Normalised content items
f.canonical_content_item   Deduplicated canonical identity
f.content_item_canonical_map  Item → canonical mapping
f.canonical_content_body   Full text extraction with workflow states
f.cron_http_log            HTTP log for cron-triggered function calls
f.raw_metric_point         Raw metric data points
f.raw_timeseries_point     Raw timeseries data
f.trend_point              Trend signal data
```

**m schema — Publishing Pipeline**
```
m.digest_run               Digest execution windows
m.digest_item              Scored and selected items per digest
m.digest_item_manual_tag   Manual taxonomy tags on digest items
m.post_seed                Seed records linking digest items to AI jobs
m.post_draft               AI-generated drafts awaiting approval
                           NOTE: post_draft has NO direct client_id column.
                           Client resolution: post_draft → m.post_seed → client_id
m.post_publish_queue       Approved posts awaiting publishing
m.post_publish             Published post record
m.post_performance         Engagement data from platform APIs ✅ (Phase 2.1)
m.post_feedback            Manual feedback on published posts
m.post_boost               Boost job record (campaign_id, adset_id, ad_id, status)
m.ai_job                   Job queue for AI processing tasks
m.ai_job_attempt           Individual attempt records per ai_job
m.taxonomy_tag             Taxonomy tags applied to content
m.agent_recommendations    Feed intelligence agent output ✅ (Phase 2.2)
m.platform_token_health    Facebook token health check results
m.worker_http_log          HTTP response log for Edge Function calls
m.vw_ops_pipeline_health   View: pipeline health summary for dashboard
m.vw_ops_failures_24h      View: dead/failed items in last 24 hours
m.vw_ops_token_health      View: token expiry status per client
```

**c schema — Client Configuration**
```
c.client                   Client identity (name, slug, timezone, status)
c.client_ai_profile        AI persona, system prompt, model, platform rules
c.client_channel           Platform connections per client
c.client_digest_policy     Content selection rules (strict/lenient, window)
c.client_publish_profile   Publishing settings (mode, throttle, token, enabled,
                           boost_enabled, boost_budget_aud, boost_duration_days,
                           boost_objective, boost_targeting jsonb, boost_score_threshold)
c.client_source            Feed → client links with weights
c.client_content_scope     Client → content vertical links
```

**t schema — Taxonomy**
```
t.content_vertical         Vertical hierarchy (global → jurisdiction-specific)
t.6.0_content_domain       Top-level domains (17 domains)
t.6.1_content_pillar       Pillars per domain (71 pillars)
t.6.2_content_theme        Themes per pillar (715 themes)
t.6.3_content_topic        Specific topics (2,582 topics)
t.5.4_use_case_prompt_template  Prompt templates (27)
t.5.5_cta_master           CTA library (9 CTAs)
t.5.6_brand_voice          Brand voice definitions
t.5.7_compliance_rule      Disclaimer and compliance rules
(+ additional ANZSIC, ANZSCO, audience and platform taxonomy tables)
```

**Key client IDs (production)**
```
NDIS Yarns:      fb98a472-ae4d-432d-8738-2273231c1ef4
Property Pulse:  4036a6b5-b4a3-406e-998d-c2fe14a8bbdd
```

---

## Active Edge Functions & Cron Schedule

| Function | Version | Schedule | Purpose |
|---|---|---|---|
| ingest | v75 | Every 6 hours | RSS feed ingestion |
| content_fetch | v45 | Every 10 min | Full text extraction (Jina) |
| ai-worker | v40 | Every 5 min | AI draft generation |
| auto-approver | v9 | Every 10 min | Auto-approve qualifying drafts |
| publisher | v34 | Every 5 min | Publish to Facebook |
| insights-worker | v11 | Daily 3am UTC | Facebook Insights back-feed |
| feed-intelligence | v1 | Weekly Sun 2am UTC | Feed quality analysis |
| inspector | v63 | On-demand | Pipeline diagnostics |
| inspector_sql_ro | v18 | On-demand | Read-only SQL diagnostics |

**Additional pg_cron jobs (SQL-only, no Edge Function):**
- planner-hourly — creates digest runs and populates digest items
- m_phase2_ndis_daily_8am_sydney — NDIS scoring, selection, bundling, seeding
- m_phase2_property_hourly — Property scoring, selection, bundling, seeding
- enqueue-publish-queue-every-5m — moves approved drafts into publish queue
- seed-and-enqueue-facebook-every-10m — seeds AI jobs for Facebook
- sweep-stale-running-every-10m — requeues stuck AI jobs and publish queue items
- dead-letter-sweep-daily — daily sweep of stale items to dead status (2am UTC)
- token-health-daily-7am-sydney — writes token health check results

---

## Critical Architecture Gotchas

**PostgREST schema exposure:** The f, m, c schemas are NOT in PostgREST's
exposed_schemas list. Direct `.from()` calls via Supabase JS client return
zero rows silently. Fix: use SECURITY DEFINER RPCs in public schema, or
use service role key server-side (bypasses PostgREST entirely).

**post_draft has no direct client_id:** Client resolution requires joining
through m.post_seed via the seed relationship. Direct column reference causes
ERROR: 42703.

**Edge Function deployment confirmation:** Use get_logs with service: edge-function
— not the deploy response. Ground truth is always actual table row counts.

---

## Pipeline Flow

```
INGEST
pg_cron (every 6 hours)
→ ingest-worker Edge Function
→ reads f.feed_source (active feeds)
→ fetches RSS/API content
→ writes to f.raw_content_item
→ creates f.content_item (normalised)
→ deduplicates into f.canonical_content_item

CONTENT FETCH
pg_cron (every 10 minutes)
→ content-fetch Edge Function
→ reads canonical items with status = 'pending_fetch'
→ attempts full text extraction via Jina reader
→ writes to f.canonical_content_body
→ status: 'success' | 'give_up_paywall' | 'give_up_blocked' | 'dead'

DIGEST
pg_cron (hourly + client-specific schedules)
→ SQL functions (score_digest_items, select, bundle, seed)
→ reads client_content_scope → vertical → relevant topics
→ scores canonical items by relevance to client verticals
→ selects top items into m.digest_item
→ seeds m.ai_job via m.post_seed

AI GENERATION
pg_cron (every 5 minutes)
→ ai-worker Edge Function
→ reads m.ai_job (status = 'queued')
→ reads c.client_ai_profile (persona, system prompt, model)
→ calls Claude/OpenAI API
→ writes m.post_draft (approval_status = 'needs_review')

APPROVAL
Auto: auto-approver agent (every 10 min) scores against rules → auto-approve or flag
Manual: human reviews draft in dashboard → approve/reject
→ approved drafts → m.post_publish_queue

PUBLISH
pg_cron (every 5 minutes)
→ publisher Edge Function
→ reads m.post_publish_queue (due items, mode = 'auto')
→ calls platform API (Facebook, LinkedIn etc)
→ writes m.post_publish
→ updates queue item status

PERFORMANCE ✅ (Phase 2.1 complete)
pg_cron (daily 3am UTC)
→ insights-worker Edge Function
→ calls Facebook Graph API /insights
→ writes m.post_performance
→ feeds back into digest scoring

FEED INTELLIGENCE ✅ (Phase 2.2 complete)
pg_cron (weekly Sunday 2am UTC)
→ feed-intelligence Edge Function
→ analyses feed give-up rates and content quality
→ writes recommendations to m.agent_recommendations
```

---

## Content Vertical Taxonomy

A three-level hierarchy that handles both global and jurisdiction-specific content:
```
Global Domain (universal)
└── Vertical (industry-level, stable)
    └── Market/Program (jurisdiction-specific)

Example:
Health & Wellness
└── Disability Services (global vertical)
    └── NDIS (Australia-specific)
    └── NDCP (New Zealand, future)

Business & Finance
└── Real Estate (global vertical)
    └── AU Residential Property
    └── AU Commercial Property
    └── UK Property (future)
```

This architecture means:
- New jurisdiction = add rows to t.content_vertical, never change global taxonomy
- New client = configure their vertical scope in c.client_content_scope
- Bundler reads client scope → finds relevant topics → scores content automatically

---

## The Four Agents

### Agent 1 — Auto-Approval Agent ✅ COMPLETE (v9)
**Purpose:** Eliminate manual review of 80-90% of drafts

Runs every 10 minutes via pg_cron. 5-gate logic:
1. auto_approve_enabled flag
2. Not previously rejected
3. Digest score above threshold
4. Body length within range
5. Keyword blocklist clear

approved_by = 'auto-agent-v1' for auditability.

### Agent 2 — Feed Intelligence Agent ✅ COMPLETE (v1)
**Purpose:** Keep feed quality high without manual monitoring

Runs weekly Sunday 2am UTC. Analyses give-up rates per source.
Recommendations written to m.agent_recommendations.
Human approves/rejects recommendations in dashboard.

### Agent 3 — Content Analyst Agent 🔲 PLANNED (Phase 3.2)
**Purpose:** Generate weekly performance reports per client
**Dependencies:** Facebook Insights back-feed (2.1) must be running ✅

### Agent 4 — Auto-Boost Agent 🔲 PLANNED (Phase 3.4)
**Purpose:** Automatically boost top-performing posts via Facebook Ads API
**Dependencies:** m.post_performance (2.1) ✅, Meta App Review ads permissions

---

## Publishing Mode Architecture

Each client has a mode setting in c.client_publish_profile:
```
auto     → approved drafts publish automatically on schedule
manual   → approved drafts sit in queue, human triggers publish
staging  → nothing publishes, for testing only
```

---

## Key Architectural Decisions

| Decision | Choice | Reason |
|---|---|---|
| Database | Supabase / PostgreSQL | Low lock-in, portable, RLS built-in |
| AI API | Claude primary, OpenAI fallback | Claude better for synthesis and brand voice |
| Persona storage | Database (client_ai_profile) | Not in API (Assistants deprecated), portable |
| Pipeline orchestration | pg_cron + Edge Functions | Already proven, no new infrastructure |
| Frontend | Next.js + Vercel | Claude Code builds it, auto-deploy, same pattern for all layers |
| Multi-tenancy | Supabase RLS | Enforced at DB level, not application level |
| Feed normalisation | Single schema regardless of source | source_type_code field, normaliser per type |
| Frontend repos | Two separate repos (dashboard + portal) | Focused scope, simpler Vercel config |
| Domain structure | Subdomains of invegent.com | Cost control, all under one brand |
