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

**What was built:**
- `t.5.3_content_format` upgraded with ICE pipeline fields
- `c.client_brand_asset`, `c.client_format_config` tables
- `m.post_render_log`, `m.post_visual_spec`, `m.post_format_performance` tables
- SECURITY DEFINER RPCs: write_visual_spec, write_render_log, upsert_format_performance
- Content advisor promoted upstream into ai-worker v2.5.0
- Animated formats: animated_text_reveal + animated_data (image-worker v3.8.0)

---

## D044 — YouTube Shorts Pipeline Stage A: Silent MP4 via Creatomate
**Date:** 20 March 2026
**Status:** Confirmed — deployed

**Decision:**
Implement YouTube Shorts pipeline in three stages to ship value
at each step without blocking on credentials:
- Stage A (this): Silent MP4 via Creatomate. No ElevenLabs, no YouTube OAuth needed.
  Formats: video_short_kinetic, video_short_stat. Gated off (is_enabled=false)
  in c.client_format_config until credentials are ready.
- Stage B: Add ElevenLabs voiceover + YouTube Data API upload.
  Credentials required: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID_NDIS,
  ELEVENLABS_VOICE_ID_PP, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET,
  YOUTUBE_REFRESH_TOKEN_NDIS, YOUTUBE_REFRESH_TOKEN_PP.
- Stage C: HeyGen avatar, long-form explainer, podcast clip.

**Why this order:**
Stage A builds and validates the full render pipeline (script → Creatomate →
Storage) without any external credential setup. It means Stage B is a
2-3 hour wire-up once credentials are confirmed, not a full build.
narrtion_text is pre-generated in Stage A and stored in draft_format.video_script —
it's ready for ElevenLabs in Stage B with no ai-worker changes needed.

**What was built (Stage A — 20 Mar 2026):**

Schema:
- `m.post_draft`: video_url + video_status columns added
- `recommended_format` constraint expanded to include all 7 video subformats
- `t.5.3_content_format`: 7 video format rows seeded:
  - Stage A buildable: video_short_kinetic, video_short_stat
  - Stage B (is_buildable=false): video_short_kinetic_voice, video_short_stat_voice
  - Stage C (is_buildable=false): video_short_avatar, video_long_explainer, video_long_podcast_clip
- `c.client_format_config`: Stage A formats seeded with is_enabled=false
- `c.client_channel`: YouTube stub rows for both clients (disabled)
- `public.set_draft_video_script()` SECURITY DEFINER RPC
- `post-videos` Storage bucket (public)
- pg_cron job 33: video-worker every 30 min

ai-worker v2.6.0:
- `VIDEO_FORMATS` set
- `generateVideoScript()`: mini Claude call (temp 0.25) after format decision
  - kinetic_text: produces scenes array (hook/point/cta) + narration_text
  - stat_reveal: extracts stat_value, stat_label, context_line, cta_text + narration_text
- Stored via `set_draft_video_script()` RPC (merges into draft_format, sets video_status=pending)
- `video_script_generated` flag in result payload

video-worker v1.0.0:
- `buildKineticTextScript()`: 9:16 (1080×1920) MP4, 30fps, scene-timed elements
  - hook: large centred headline + "↓ Keep watching" nudge
  - point: accent bar + headline + divider + body, scene counter top-right
  - cta: question mark watermark + cta headline + follow text
- `buildStatRevealVideoScript()`: 9:16 (1080×1920) MP4, 20s, stat scale-bounce at 1.5s
- `pollRender()`: 2.5s interval, 48 attempts (2 min max for MP4)
- `renderUploadAndLog()`: submit + poll + upload post-videos + write_render_log
- Reads approved drafts with video_status=pending
- Writes video_url + video_status=generated on success
- Auth: x-video-worker-key header (reuses PUBLISHER_API_KEY secret)

**Multi-channel ownership model:**
- pk@invegent.com owns NDIS Yarns + Property Pulse channels
- One OAuth app, one refresh token per channel
- External clients: Channel Manager access + their own YOUTUBE_REFRESH_TOKEN_CLIENT_SLUG secret
  + client_channel row — no code changes needed per new client

**Podcast client model (future):**
ICE ingests client RSS podcast feed as signal source, generates Shorts
referencing each episode, publishes autonomously. Client controls
their own long-form; ICE handles the Short-form layer.

**To activate Stage A formats:**
```sql
UPDATE c.client_format_config
SET is_enabled = true
WHERE ice_format_key IN ('video_short_kinetic', 'video_short_stat')
  AND client_id = '<client_id>';
```
Do this after confirming Creatomate plan covers MP4 output.

**To advance to Stage B:**
1. Add 7 Supabase secrets (ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID_NDIS,
   ELEVENLABS_VOICE_ID_PP, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET,
   YOUTUBE_REFRESH_TOKEN_NDIS, YOUTUBE_REFRESH_TOKEN_PP)
2. Build youtube-publisher Edge Function
3. Add ElevenLabs TTS call in video-worker between script + Creatomate render
4. Flip is_buildable=true for voice format rows in t.5.3_content_format
5. Update c.client_channel with real channel IDs

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| YouTube Stage B wire-up | When 7 secrets confirmed in Supabase | Next session after PK setup |
| Activate Stage A formats | Confirm Creatomate MP4 plan covers → flip is_enabled=true | Before first video test |
| youtube-publisher Edge Function | YouTube Data API v3 upload (OAuth token refresh) | Stage B |
| ElevenLabs TTS in video-worker | Between script and Creatomate render | Stage B |
| m.post_format_performance population | Update insights-worker per-format engagement aggregates | Phase 2.1 completion |
| AI Diagnostic Agent — Tier 2 | After ~1-2 weeks of Tier 1 validation | ~1 Apr 2026 |
| Instagram publisher | 0.5 days after Meta App Review approved | Phase 3 |
| Prospect demo generator | Needs scoping conversation | Phase 3 |
| Client health weekly report (email) | 2 days. Retention driver. | Phase 3 |
| Rename Ingest + Content_fetch folders to lowercase | Cosmetic — next Claude Code session | Phase 3 |
| Model router implementation | When AI costs become significant | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
| Upgrade Creatomate to Growth plan | When Phase 3 video pipeline starts | Phase 3 |
