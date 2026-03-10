# ICE — Invegent Content Engine

## What It Is
ICE is a signal-centric AI content engine that transforms raw information streams into branded, platform-ready social media content. It serves as the content operation backbone for NDIS allied health providers, property professionals, and any business vertical requiring consistent, intelligent content publishing.

## What It Does
- Ingests signals from RSS feeds, web sources, email newsletters, Google Trends, YouTube, Reddit, and social platforms
- Canonicalises and scores content by relevance per client vertical
- Generates platform-specific drafts in each client's brand voice using AI
- Routes drafts through auto-approval or human review based on confidence scoring
- Publishes approved content to Facebook, LinkedIn, email, and client websites
- Analyses performance and feeds results back into scoring to improve over time

## Current Status
**Phase 2 — In Progress**
- Pipeline: ✅ Working (ingest → canonicalise → score → draft → approve → publish)
- Clients: NDIS Yarns (disability services), Property Pulse (property investment)
- Dashboard: ✅ Next.js live at dashboard.invegent.com — all 8 tabs live (Retool cancelled March 2026)
- Database: Supabase Pro (PostgreSQL, 30+ tables, daily backups active)
- Publishing: Facebook ✅ | LinkedIn ⏳ (pending account recovery)
- AI: Claude API primary (claude-sonnet-4-6) | OpenAI fallback

## Phase Completion Summary
- ✅ Phase 1 — Stabilise: COMPLETE
- 🔄 Phase 2 — Automate: IN PROGRESS (2.1 ✅ 2.2 ✅ 2.3 ⏳ 2.5 ✅ 2.8 ✅ 2.9 ✅)
- ⏸ Phase 3 — Expand: NOT STARTED
- ⏸ Phase 4 — Scale: NOT STARTED

## Repository Structure
```
/docs                    Project documentation (markdown, single source of truth)
/supabase/functions      Edge Functions (Deno/TypeScript) — one folder per function
/supabase/migrations     DDL migration files
RUNBOOK_ROLLBACK.md      Emergency rollback procedure
```

## Schema History Note
The full Phase 1 database schema (all tables across f, m, c, t, a, k schemas) was
built incrementally before formal migration file discipline was established. The live
schema in Supabase is the source of truth for Phase 1 table definitions. Migration
files in /supabase/migrations cover Phase 2 onwards. All future DDL changes must
include a dated migration file committed alongside deployment.

## Key Infrastructure
- Supabase project: mbkmaxqhsohbtwsqolns (ap-southeast-2, Sydney)
- GitHub org: github.com/Invegent
- Primary repo: github.com/Invegent/Invegent-content-engine
- Dashboard repo: github.com/Invegent/invegent-dashboard (Next.js, live)
- Portal repo: github.com/Invegent/invegent-portal (Next.js, planned)
- Deployment: Vercel
- Dashboard URL: dashboard.invegent.com ✅ live
- Portal URL: portal.invegent.com (planned)
