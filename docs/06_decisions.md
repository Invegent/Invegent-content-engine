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

**Choice:** Signal-centric

**Reasoning:**
Post-centric tools already exist (Buffer, Hootsuite, Later).
They solve the distribution problem but not the content creation
problem. Signal-centric architecture solves the upstream problem.
Every piece of content ICE produces is traceable back to a
real-world signal — making it genuinely informative rather than
manufactured noise. This is the core competitive differentiator.

---

## D002 — Supabase vs Firebase vs AWS RDS
**Date:** November 2025
**Status:** Confirmed — infrastructure built on this
**Choice:** Supabase (PostgreSQL managed + Edge Functions + Auth + RLS)

---

## D003 — Content Vertical Taxonomy Layer Design
**Date:** December 2025
**Status:** Confirmed — implemented in production
**Choice:** Three-level: domains → verticals → jurisdiction-specific programs

---

## D004 — OpenAI Assistants API Abandoned
**Date:** January 2026
**Status:** Confirmed — Assistants API deprecated by OpenAI
**Choice:** Database-stored personas + Messages/Chat Completions API

---

## D005 — Next.js vs Retool for Dashboard
**Date:** February 2026
**Status:** Confirmed — Retool retired March 2026, Next.js live
**Choice:** Next.js + Vercel + Claude Code

---

## D006 — Claude API as Primary AI Model
**Date:** March 2026
**Status:** Confirmed — implemented in ai-worker v2.1.0
**Choice:** Claude primary (claude-sonnet-4-6), OpenAI fallback, per-client config

---

## D007 — Single Supabase Instance for All Clients
**Date:** November 2025
**Status:** Confirmed — implemented via RLS
**Choice:** One shared project with Row Level Security

---

## D008 — pg_cron + Edge Functions for Pipeline Orchestration
**Date:** November 2025
**Status:** Confirmed — all pipeline workers use this pattern
**Choice:** pg_cron + Supabase Edge Functions

---

## D009 — Chat-to-SQL-to-Supabase Development Workflow
**Date:** November 2025
**Status:** Confirmed — primary development method for DB changes
**Choice:** Describe → Claude generates SQL → review → apply_migration

---

## D010 — Managed Service First, SaaS Later
**Date:** March 2026
**Status:** Confirmed — Phase 1-3 strategy
**Choice:** Managed service first, SaaS evaluated at 10+ clients

---

## D011 — NDIS Vertical as Primary Target Market
**Date:** March 2026
**Status:** Confirmed — 90-day focus
**Choice:** NDIS providers primary, property secondary

---

## D012 — Operational Tables Not Documented in Blueprint
**Date:** March 2026
**Status:** Noted — intentional omission, not a gap

---

## D013 — Edge Function Folder Naming Convention
**Date:** March 2026
**Status:** Pending — rename Ingest + Content_fetch to lowercase in next Claude Code session

---

## D014 — Content Intelligence Profiles Architecture
**Date:** March 2026
**Status:** Confirmed — implemented
**Choice:** c.client_brand_profile + c.client_platform_profile + c.content_type_prompt

---

## D015 — Launch Readiness Gate: Quality Before Clients
**Date:** March 2026
**Status:** Revised — see D032 for updated trigger

---

## D016 — Premium Services Layer: Deferred
**Date:** March 2026
**Status:** Deferred — revisit at 5 paying clients

---

## D017 — Email Newsletter Feed Architecture
**Date:** March 2026
**Status:** Designed — implementation pending (Phase 4.2)

---

## D018 — m/c Schema Write Pattern: SECURITY DEFINER Functions
**Date:** March 2026
**Status:** Confirmed — standard pattern for all writes to m/c schemas
**Rule:** All writes to m or c schema via SECURITY DEFINER functions called with .rpc()

---

## D019 — Direct client_id on post_draft for Manual Posts
**Date:** March 2026
**Status:** Confirmed — implemented

---

## D020 — OAuth Connect Flow
**Date:** March 2026
**Status:** ✅ Implemented — 16 March 2026

---

## D021 — AI Usage Ledger and Cost Attribution
**Date:** March 2026
**Status:** Designed — pending Phase 2.10

---

## D022 — Per-Post Platform Targeting Architecture
**Date:** March 2026
**Status:** Designed — pending Phase 2.11

---

## D023 — Client Portal Information Architecture and Auth Model
**Date:** March 2026
**Status:** Designed — Phase 3.1 build in progress

---

## D024 — RLS Client Data Isolation for Portal Tables
**Date:** 17 March 2026
**Status:** Confirmed — applied to production

---

## D025 — Client Feed Feedback System: Deferred to Phase 4
**Date:** 18 March 2026
**Status:** Deferred

---

## D026 — Email Architecture for feeds@invegent.com
**Date:** 18 March 2026
**Status:** Designed — label setup pending

---

## D027 — Visual Pipeline Architecture
**Date:** 19 March 2026
**Status:** Confirmed — V1 deployed. See D040 for Creatomate decision.

---

## D028 — Canva: Design Tool Only
**Date:** 19 March 2026
**Status:** Confirmed — no API integration

---

## D029 — Video Generation Stack: Creatomate + HeyGen + ElevenLabs
**Date:** 19 March 2026
**Status:** Confirmed — Phase 3 build

---

## D030 — Content Atomisation: One Signal, Multiple Format Outputs
**Date:** 19 March 2026
**Status:** Confirmed architecture — Phase 3 build

---

## D031 — Visual Fields for Manual / Post Studio Drafts
**Date:** 19 March 2026
**Status:** Pending — lightweight format scorer preferred

---

## D032 — ICE Primary Purpose: Personal Businesses First
**Date:** 19 March 2026
**Status:** Confirmed — foundational, overrides all client-ROI framing

**Build priority order (immutable):**
1. Care for Welfare / NDIS Yarns
2. Property Pulse / Property Buyers Agent
3. NDIS Accessories / FBA store
4. Personal brand / YouTube channel
5. External NDIS clients
6. External property clients

---

## D033 — ICE Reframe: AI-Operated Business System
**Date:** 19 March 2026
**Status:** Confirmed

**The six-tier agent stack:**
- Tier 1 (Diagnose): ✅ deployed 19 Mar
- Tier 2 (Fix approved list): Pipeline Doctor equivalent
- Tier 3–6: future phases

---

## D034 — YouTube is Phase 3, Not Phase 4
**Date:** 19 March 2026
**Status:** Confirmed

---

## D035 — Pipeline Monitoring Architecture
**Date:** 19 March 2026
**Status:** Confirmed — deployed 19 March 2026

---

## D036 — Taxonomy Scorer v2 and Bundler v3
**Date:** 19 March 2026
**Status:** Confirmed — superseded by D038

---

## D037 — Timezone Architecture: UTC Storage, Client Timezone Display
**Date:** 19 March 2026
**Status:** Confirmed — fully implemented

---

## D038 — Signal Clustering: Two-Layer Deduplication
**Date:** 20 March 2026
**Status:** Confirmed — deployed

---

## D039 — Two-Attempt Rule: Switch Tools, Not Implementations
**Date:** 20 March 2026
**Status:** Confirmed — build discipline

---

## D040 — Creatomate as Visual Pipeline Rendering Engine
**Date:** 20 March 2026
**Status:** Confirmed — production, image-worker v3.5.1+

Background colour: root-level `fill_color` on composition (NOT shape element).
Plan: Essential $54/month, 2,000 credits.

---

## D041 — NDIS Compliance Framework Architecture
**Date:** 20 March 2026
**Status:** Confirmed — 20 active rules, ai-worker v2.4.0 live

---

## D042 — Carousel Pipeline: Content Advisor + Organic Multi-Photo
**Date:** 20 March 2026
**Status:** Confirmed — image-worker v3.5.1, publisher v1.6.0

**Option 1 (live):** Organic multi-photo — upload N slides unpublished,
post feed with `attached_media[]`. No extra permissions needed.

**Option 2 (future):** Meta Ads API carousel — deferred until
`ads_management` approved + boosting active. Slide images reused as-is.

**Content advisor:** claude-sonnet-4-6, temp 0.3. Reads post body +
brand profile + vertical. Returns slide spec (3-6 slides, hook/point/cta).
Stored in `m.post_carousel_slide`. Schema: 11 slides verified in first run.

---

## D043 — Visual Pipeline Infrastructure: Format Registry + Advisor Foundation
**Date:** 20 March 2026
**Status:** Confirmed — all schema deployed

**Decision:**
Before building animated formats or promoting the content advisor upstream,
establish the full infrastructure foundation that makes the visual pipeline
scalable, observable, and commercially sound.

**The gap identified:**
The existing pipeline had format decisions hardcoded in Edge Functions,
no cost visibility per client, no record of why the advisor made a
format choice, no per-client billing gate for formats, and a stale
`carousel_slides` jsonb column conflicting with the proper slide table.
As formats multiply (animated, video), each of these gaps compounds.

**What was built (20 Mar 2026):**

**Step 1 — `t.5.3_content_format` upgraded**
Added ICE pipeline fields: `is_buildable`, `requires_build`, `render_engine`,
`output_mime_type`, `ice_format_key`, `advisor_description`, `best_for`,
`min_content_signals`, `platform_support`.
`advisor_description` is what Claude reads to understand when to recommend
each format. `is_buildable = false` formats are visible to the advisor
but will not be recommended.

Format registry as of 20 Mar:
| ice_format_key | is_buildable | engine |
|---|---|---|
| text | ✅ | none |
| image_quote | ✅ | creatomate |
| carousel | ✅ | creatomate |
| animated_text_reveal | ⬜ requires_build | creatomate |
| animated_data | ⬜ requires_build | creatomate |
| video_short | ⬜ requires_build | creatomate+elevenlabs |

**Step 2 — `c.client_brand_asset`**
Proper brand asset registry. Fields: asset_type, asset_url, asset_meta,
platform_scope. Replaces scattered brand fields on client_brand_profile
for anything beyond primary/secondary colour and logo. Future animated
formats and video use this for intros, voiceovers, fonts, music.

**Step 3 — `c.client_format_config`**
Per-client format eligibility gate. One row per client × format.
Content advisor checks this before recommending. Also billing gate —
only formats in the service agreement should be enabled.
Both NDIS Yarns and Property Pulse seeded with current buildable formats.
Adding a new format to a client = one INSERT, no code change.

**Step 4 — Resolved `carousel_slides` jsonb conflict**
`post_draft.carousel_slides` (zero rows of data) dropped.
`m.post_carousel_slide` is the canonical carousel storage.

**Step 5 — `m.post_render_log`**
Central Creatomate render audit. Every render attempt logged: render_id,
credits_used, render_duration_ms, output_url, storage_url, render_spec.
Enables per-client credit cost attribution, retry history, debugging.

**Step 6 — `m.post_visual_spec`**
Stores content advisor's full structured output before rendering.
Fields: post_draft_id, ice_format_key, advisor_model, advisor_prompt_key,
spec (jsonb), generation_ms.
`advisor_prompt_key` is the versioning field — when the advisor prompt
changes, increment this key so decisions trace to the prompt that made them.

**Step 7 — `m.post_format_performance`**
Format-level engagement aggregation per client.
Fields: client_id, ice_format_key, rolling_window_days, avg_reach,
avg_engagement_rate, best_post_draft_id, computed_at.
Populated by insights-worker. Content advisor reads this when performing
format recommendations — if image_quote consistently outperforms text
for a client, the advisor learns to recommend it more. This is the
feedback loop that makes the advisor genuinely intelligent over time.

**What's next in the visual pipeline build order:**
1. ✅ Schema foundation (this decision)
2. Promote content advisor upstream into ai-worker (reads format table + client_format_config)
3. Write to m.post_visual_spec and m.post_render_log in image-worker
4. Build animated_text_reveal (flip is_buildable, add render path in image-worker)
5. Build animated_data
6. Phase 3: video_short

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| Promote content advisor upstream into ai-worker | Reads t.5.3_content_format + c.client_format_config | Next build session |
| Wire m.post_visual_spec write into image-worker | Store advisor spec before rendering | Next build session |
| Wire m.post_render_log write into image-worker | Cost transparency per render | Next build session |
| Build animated_text_reveal | Flip is_buildable, add GIF render path | After advisor promotion |
| Build animated_data | Flip is_buildable, add counting number animation | After animated_text_reveal |
| Rename Ingest + Content_fetch folders to lowercase | Cosmetic — next Claude Code session | Next build session |
| Test compliance injection against 20 recent drafts | Confirm no over-hedging | After PK review complete |
| YouTube Shorts pipeline | Creatomate + ElevenLabs + YouTube Data API | Phase 3.5 |
| PK personal YouTube channel as ICE client | Configuration, not building | Phase 3.6 |
| Prospect demo generator (Option B) | Needs proper scoping conversation | When ready |
| Option 2 carousel (Meta Ads API) | When ads_management approved + boosting active | Phase 3+ |
| m.post_format_performance population | insights-worker update to write per-format aggregates | Phase 2.1 completion |
| Content atomisation build | D022 + D027 + D029 combined execution | Phase 3 |
| Model router implementation | When AI costs become significant | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
| Upgrade Creatomate to Growth plan | When Phase 3 video pipeline starts | Phase 3 |
