# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D043 — See previous commits

---

## D044 — YouTube Shorts Pipeline Stage A: Silent MP4 via Creatomate
**Date:** 20 March 2026 | **Status:** ✅ Complete

Silent 9:16 MP4 renders via Creatomate. video_short_kinetic + video_short_stat.
ai-worker v2.6.0 generates video_script JSON. video-worker v1.0.0 renders.
Formats gated off (is_enabled=false) until credentials confirmed.

---

## D045 — YouTube Shorts Pipeline Stage B: ElevenLabs Voice + YouTube Upload
**Date:** 20 March 2026 | **Status:** ✅ Complete

**Decision:**
With both ElevenLabs voices confirmed (NDIS Yarns + Property Pulse), wire Stage B
in a single session: TTS into MP4 + YouTube Data API v3 upload.

**Implementation (20 Mar 2026):**

video-worker v2.0.0:
- `generateAndUploadVoice()`: ElevenLabs TTS → MP3 → Supabase Storage → public URL
- Voice ID resolved per client slug: `ELEVENLABS_VOICE_ID_{SLUG_UPPER}`
  Falls back to `ELEVENLABS_VOICE_ID_NDIS` / `ELEVENLABS_VOICE_ID_PP`
- Audio element added to Creatomate render spec: `{type: 'audio', source: audioUrl, time: 0}`
- `processDraft()` handles all 4 video formats, `withVoice` flag controls audio path
- Stage A silent formats unchanged — same code path, audioUrl = null

youtube-publisher v1.0.0:
- `refreshAccessToken()`: POST to oauth2.googleapis.com/token with refresh_token
- `uploadToYouTube()`: multipart upload (JSON metadata + binary MP4)
- Uploads as `unlisted` by default — PK manually changes to public after review
- Writes `youtube_video_id` + `youtube_url` to `draft_format` jsonb
- Writes to `m.post_publish` (platform='youtube') for cross-platform consistency
- pg_cron job 34: every 30min at :15 and :45 (offset from video-worker at :00 and :30)

Format registry updated:
- `video_short_kinetic_voice`, `video_short_stat_voice`: `is_buildable=true`
- `video_long_explainer`, `video_long_podcast_clip`, `video_short_avatar`: remain `is_buildable=false` (Stage C)

Voices confirmed:
- NDIS Yarns: `iamiUYVj7ixJcRZQkS8B` — Australian female, warm/professional
- Property Pulse: `YCxeyFA0G7yTk6Wuv2oq` — confident/measured male

**To activate voice formats:**
```sql
UPDATE c.client_format_config
SET is_enabled = true
WHERE ice_format_key IN ('video_short_kinetic_voice', 'video_short_stat_voice')
  AND client_id = '<client_id>';
```

**To add external client YouTube channel:**
1. Client grants Channel Manager access to pk@invegent.com
2. OAuth Playground → get refresh token for that channel
3. Add `YOUTUBE_REFRESH_TOKEN_{CLIENT_SLUG_UPPER}` secret to Supabase
4. Update `c.client_channel` row with real `channel_id`
5. No code changes needed

**Stage C (future):**
- `video_short_avatar`: HeyGen API, AI talking head
- `video_long_explainer`: multi-scene narrated, 3-8 min
- `video_long_podcast_clip`: waveform + captions from podcast RSS

---

## D046 — Client Acquisition: Platform Lead Forms → Website Onboarding
**Date:** 21 March 2026 | **Status:** ✅ Decided, not yet built

**Decision:**
Platform forms (Facebook, LinkedIn, Instagram, Invegent pages) are lead capture only.
All onboarding happens on invegent.com. Platforms feed into the website — the website
does not feed back into platforms.

**Architecture:**
```
Platform (Facebook / LinkedIn / Instagram / Invegent pages)
  ↓
  Lead form — captures: name, business, email, intent signal
  ↓
  Redirects to invegent.com/onboard
  ↓
  ┌──────────────────────┬───────────────────────────┐
  │  Ready to start now  │  Want to understand first │
  │  → Onboarding form   │  → Calendar booking       │
  │  → Supabase config   │  → Discovery call         │
  │  → Welcome email     │  → Post-call → form       │
  └──────────────────────┴───────────────────────────┘
```

**Reasoning:**
Platform lead forms cannot branch, cannot trigger multi-step flows, cannot write
to a database without middleware. Building a full onboarding experience on each
platform would mean six separate implementations with no shared logic. One website
onboarding flow serves all acquisition channels.

**Onboarding form approach — Option A + Hybrid:**
- Form captures the hard stuff: brand voice inputs, platform preferences,
  format preferences per platform, tier selection, compliance context.
- PK does the technical config afterward: feeds, prompts, DB rows.
- This eliminates the discovery call for ready-now clients without requiring
  a fully self-configuring system.
- Manual technical config stays with PK until the system is proven at scale.

---

## D047 — Onboarding Flow: Two Paths Based on Client Intent
**Date:** 21 March 2026 | **Status:** ✅ Decided, not yet built

**Decision:**
The onboarding flow must respect two distinct client intents without forcing
either type through the wrong process.

**Path 1 — Ready to start:**
Client lands on invegent.com/onboard, selects "Ready to start."
Completes the onboarding form (brand voice, platforms, formats, tier).
Data submits to Supabase lead table. Triggers welcome email.
PK receives notification and completes technical config within 2 business days.

**Path 2 — Wants to understand first:**
Client lands on invegent.com/onboard, selects "Tell me more first."
Routed to calendar booking (Calendly or equivalent).
Books a 20-minute discovery call with PK.
Post-call: if proceeding, directed back to onboarding form.

**Why this matters:**
Forcing a ready-now client through a sales call wastes both parties' time
and introduces friction at the moment of highest intent. Forcing a
needs-context client straight to a config form produces a poor brand profile
because they haven't had the questions answered yet. Both paths exist simultaneously.

---

## D048 — Client Acquisition AI: Chatbot First, Voice Assistant Future
**Date:** 21 March 2026 | **Status:** ✅ Decided

**Decision:**
The near-term AI acquisition tool is a website chatbot — not a live voice assistant.
A live AI voice assistant is a future Phase 4 build.

**Chatbot scope (when built):**
- Available 24/7 on invegent.com
- Handles FAQ: how does ICE work, what's included, how much does it cost,
  what platforms, what's the compliance angle
- Qualifies the prospect: what sector, which platforms, where they are now
- Routes to onboarding form (ready now) or calendar booking (needs call)
- Does not attempt to close — it qualifies and routes

**Why chatbot before voice:**
PK works full time. Any tool that eliminates the need for a synchronous
response from PK adds direct value. A chatbot handles inbound interest at
any hour without PK involvement. A voice assistant requires significantly
more infrastructure (telephony or real-time audio API) and is not justified
before paying clients exist.

**Pre-recorded onboarding video:**
In parallel with the chatbot, a short pre-recorded video ("what ICE does and
what onboarding looks like") will be produced using the existing ICE pipeline:
PK writes the script, Creatomate + ElevenLabs renders it. This can be embedded
on the website and linked from platform profiles. Later, real client onboarding
calls can be offered to be recorded as testimonial assets (client's consent required).

---

## D049 — Package Design: Standard Tiers + Source Allocation Concept
**Date:** 21 March 2026 | **Status:** 🟡 Direction set, detail pending

**Decision:**
ICE packages will be defined by three dimensions, not just volume:
1. Platform coverage — which platforms are included
2. Post volume — how many posts per week per platform
3. Source allocation — how many RSS feeds and newsletters monitored per client

The source allocation dimension is ICE's differentiator vs generic agencies.
Every other provider promises "posts per week." ICE can promise "we monitor
N sector sources daily and every post is traceable to a real signal."
That commitment is enforceable because the pipeline either produces the
content or it doesn't — there is no human bottleneck to blame.

**Standard tiers remain (Starter / Standard / Premium / Custom).**
Custom is an assessment-based option for clients whose requirements don't
fit the standard tiers. It is priced after a scoping conversation.

**Source allocation numbers are not yet fixed.**

---

## D050 — Invegent Pages as Client Acquisition Channel (Not NDIS Yarns / Property Pulse)
**Date:** 21 March 2026 | **Status:** ✅ Decided

**Decision:**
NDIS Yarns and Property Pulse will NOT be used as lead generation channels
for the Invegent managed content service. Invegent will build its own pages
(Facebook, Instagram, LinkedIn, YouTube) specifically for the Invegent brand.
These pages run on ICE and carry CTAs about the service.
The client pages remain pure sector resources.

---

## D051 — ai-worker v2.6.1: Format Advisor Seed Extraction Fix
**Date:** 22 March 2026 | **Status:** ✅ Deployed

**Decision:**
Fix the format advisor's seed extraction so it reads from the correct nested
location within each job type's payload, enabling non-text visual formats to
be selected for new drafts.

**Root cause:**
`seedTitle` and `seedBody` were read from the top level of `input_payload`
(`payload.title`, `payload.body`). Both pipeline job types nest content one level deeper:
- `rewrite_v1`: `input_payload.digest_item.{title, body_text}`
- `synth_bundle_v1`: `input_payload.items[0].title` + concatenated `items[].body_text`

The format advisor received empty strings and always responded with text-only default.
`image_headline` was still being written correctly — creating a confusing state:
`image_headline` populated but `format_decided = 'text'` and no image generated.

**Fix (ai-worker v2.6.1):**
Job-type-aware extraction before the format advisor call.

**Side effect discovered during diagnosis:**
24 backlogged NDIS approved drafts (text-only, pre-visual-pipeline, February 2026)
were cleared. Confirmed dead as of 30 Mar 2026.

---

## D052 — 00_sync_state.md: Machine-Written Live State File for Session Handoff
**Date:** 22 March 2026 | **Status:** ✅ Deployed

**Decision:**
Introduce `docs/00_sync_state.md` as a machine-written, automatically overwritten
file that captures the true live deployed state of ICE at any point in time.

**Problem solved:**
Session-to-session context loss was causing ICE work sessions to start from stale
or incorrect assumptions about deployed state.

**Implementation:**
- File location: `docs/00_sync_state.md` in `Invegent-content-engine`.
- Overwritten every 12 hours by the Cowork pulse task.
- Contents: current phase, Edge Function versions + deploy numbers, pg_cron schedule,
  Vercel frontend status, GitHub latest commit SHAs, known active issues,
  client pipeline status, credentials status, and "what is next" build queue.
- First written: 2026-03-22 05:30 UTC.

**Session start protocol:**
At the start of every session, Claude reads `docs/00_sync_state.md` via GitHub MCP
before answering any question or writing any code.

---

## D053 — Claude Desktop MCP Startup Timeout Fix: Global npm Install
**Date:** 30 March 2026 | **Status:** ✅ Deployed

**Problem:**
Claude Desktop PowerShell MCP connections were timing out on startup.
Root cause: Supabase and Xero MCP servers were configured with `npx -y @latest`,
causing npm to check for and potentially re-download the latest package version
on every Claude Desktop startup. This exceeded the MCP server startup timeout.

**Fix:**
Installed both packages globally via npm:
```
npm install -g @supabase/mcp-server-supabase
npm install -g @xeroapi/xero-mcp-server
```

Updated `claude_desktop_config.json` to point directly to the installed `.cmd` files:
- Supabase: `C:\Users\parve\AppData\Roaming\npm\mcp-server-supabase.cmd`
- Xero: `C:\Users\parve\AppData\Roaming\npm\xero-mcp-server.cmd`

Global installs start instantly — no network check on startup.

**Side note:**
This session also revealed that Python was not installed on the system.
Python 3.12.10 was installed via winget (`winget install Python.Python.3.12`).

**Credential exposure:**
The Claude Code session that performed this fix displayed the raw
`claude_desktop_config.json` in the conversation, exposing:
- Supabase access token (`sbp_...`)
- GitHub PAT (`ghp_...`)
- Xero client secret

These should be rotated as soon as possible.

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| Activate video formats for clients | `UPDATE c.client_format_config SET is_enabled=true` for desired formats | Now ready |
| Update c.client_channel with real YouTube channel IDs | OAuth Playground to get refresh tokens | Stage B setup |
| YouTube Stage C — HeyGen avatar, long-form | `video_short_avatar`, `video_long_explainer` | Phase 4 |
| m.post_format_performance population | insights-worker per-format engagement aggregates | Phase 2.1 completion |
| AI Diagnostic Agent — Tier 2 | After 1-2 weeks of Tier 1 validation | ~1 Apr 2026 |
| Instagram publisher | 0.5 days after Meta App Review approved | Phase 3 |
| Prospect demo generator | Needs scoping conversation | Phase 3 |
| Client health weekly report (email) | 2 days. Retention driver. | Phase 3 |
| Model router implementation | When AI costs become significant | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
| Upgrade Creatomate to Growth plan | When Phase 3 video pipeline starts | Phase 3 |
| Package source allocation numbers | Define RSS feeds + newsletters per tier | Phase 3 |
| Website chatbot build | Qualifies prospects, routes to form or calendar | Phase 3 |
| Onboarding form build (invegent.com/onboard) | Two-path flow: ready-now vs needs-call | Phase 3 |
| Invegent brand pages setup | Facebook, Instagram, LinkedIn, YouTube for Invegent itself | Phase 3 |
| Pre-recorded onboarding video | Script → Creatomate + ElevenLabs | Phase 3 |
| AI voice assistant | Future Phase 4 — after chatbot proven | Phase 4 |
| Fix Cowork scheduled task UUID | Resume auto 00_sync_state.md writes | Now |
