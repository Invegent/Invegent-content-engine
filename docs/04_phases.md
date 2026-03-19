# ICE — Project Phases & Deliverables

## Primary Build Principle

ICE is built for PK's personal businesses first, personal brand second, external clients third.
External clients are a bonus application — they are never the driver of build decisions.
YouTube and personal brand content are Phase 3 features, not Phase 4 afterthoughts.

## Phase Summary
Phase 1 — Stabilise    ✅ COMPLETE
Phase 2 — Automate     ✅ MOSTLY COMPLETE (LinkedIn blocked)
Phase 3 — Expand + Personal Brand   ← YOU ARE HERE
Phase 4 — Scale + Intelligence

A phase does not end until ALL done criteria are met.

---

## Phase 1 — Stabilise ✅ COMPLETE
**Completed:** March 2026

**1.1 Feed Quality** ✅ — 26 active sources
**1.2 Auto-Approval Agent** ✅ — v1.4.0, 9-gate logic
**1.3 Dashboard** ✅ — Next.js live, Retool cancelled
**1.4 Both Clients Publishing** ✅ — 5+ posts/week
**1.5 Security & Backups** ✅ — Supabase Pro, daily backups
**1.6 Meta App Review** 🔄 — Screencasts + icon uploaded. Business verification In Review. Complete data handling section → await verification → submit permissions review. Calendar: Wed 1 Apr.
**1.7 Dead Letter Queue** ✅ — deployed

---

## Phase 2 — Automate ✅ MOSTLY COMPLETE
**Goal:** ICE operates autonomously. Human input under 2 hours/week.

**2.1 Facebook Insights Back-Feed** ✅ — insights-worker v18, daily 3am UTC
**2.2 Feed Intelligence Agent** ✅ — feed-intelligence v7, Sundays 2am UTC
**2.3 LinkedIn Publisher** 🔴 BLOCKED — Community Management API under review (~25 Mar)
**2.4 Content Series** ✅ — series-writer, series-outline, Content Studio UI all live
**2.5 Next.js Dashboard** ✅ — all tabs live, Retool cancelled
**2.6 Public Proof Dashboard** ✅ — invegent.com/proof live
**2.7 Visual Pipeline V1** ✅ — image-worker v1.4.0, brand profiles, WASM rendering (19 Mar 2026)
**2.8 Content Intelligence Profiles** ✅ — structured prompts, platform profiles, content_type_prompt
**2.9 Pipeline Doctor** ✅ — v1.0.0, 7 checks, auto-fixes, every 30min (19 Mar 2026)
**2.10 Pipeline Health Monitoring** ✅ — snapshots + doctor log + dashboard page (19 Mar 2026)
**2.11 Taxonomy Scorer v2 + Bundler v3** ✅ — proper category distribution, max 2 per cat (19 Mar 2026)
**2.12 Email Newsletter Ingest** ✅ — feeds@invegent.com, OAuth, 2h cron
**2.13 Client Portal** ✅ — portal.invegent.com, magic link, RLS, inbox, calendar, performance, feeds

### Phase 2 Done When
1. LinkedIn publisher live ← only remaining item
2. All other criteria already met

---

## Phase 3 — Expand + Personal Brand ← YOU ARE HERE
**Goal:** The engine runs itself and proves its value on PK's own businesses.
Personal brand and YouTube pipeline built. First external client optional.

**Target start:** Now (Phase 2 functionally complete; LinkedIn unblock is administrative)
**Target duration:** 8-12 weeks

### Deliverables — AI Intelligence Layer

**3.1 — AI Diagnostic Agent (Tier 1)**
- [ ] `pipeline-ai-summary` Edge Function — reads doctor log + health snapshots
- [ ] Calls Claude API with log data as context
- [ ] Writes plain-English summary to `m.pipeline_ai_summary` table
- [ ] Dashboard Pipeline Log page: "What happened overnight" section
- [ ] No actions taken — diagnosis + explanation only
- [ ] Runs every hour via pg_cron
- **Effort:** 1 day. **Priority: FIRST.**

**3.2 — Signal Clustering (Dedup at Source)**
- [ ] Bundler pre-selection step — semantic similarity grouping
- [ ] When 3+ items cover the same story, pick best angle only
- [ ] Eliminates repetition problem (4 RBA posts in one day → 1)
- [ ] Replaces keyword category-based dedup with reasoning-based selection
- **Effort:** 2 days.

**3.3 — Compliance-Aware NDIS System Prompt**
- [ ] Research: NDIS Code of Conduct + Practice Standards key constraints
- [ ] Rewrite NDIS Yarns `c.client_ai_profile` system prompt
- [ ] Compliance awareness built into generation, not post-generation checking
- [ ] Test against 20 recent drafts — compare output quality
- [ ] Document the compliance rules applied in `06_decisions.md`
- **Effort:** 3 days. Core differentiator for NDIS client sales.

**3.4 — AI Diagnostic Agent (Tier 2)**
- [ ] Upgrade Tier 1 to action-capable
- [ ] Pre-approved action list (same as Pipeline Doctor)
- [ ] Claude reasons about which action and when (not hardcoded if-statements)
- [ ] Novel failures handled via reasoning, not just pattern matching
- **Effort:** 1 day. **Build only after Tier 1 has run for 1-2 weeks.**

### Deliverables — Personal Brand + YouTube

**3.5 — YouTube Shorts Pipeline**
- [ ] Creatomate account + API key → Supabase secret
- [ ] `video-worker` Edge Function — picks up `recommended_format` starting with `video_`
- [ ] ElevenLabs voiceover integration
- [ ] Script generation format in ai-worker (60-90 sec Shorts format)
- [ ] YouTube Data API v3 OAuth + upload endpoint
- [ ] Voiceover-only path first (no avatar filming required)
- [ ] Stock avatar path (HeyGen library, no filming)
- **Effort:** 3-4 weeks.

**3.6 — PK Personal YouTube Channel as ICE Client**
- [ ] New client record: PK Personal Brand
- [ ] `persona_type = 'voiceover_only'` to start, `'stock_avatar'` phase 2
- [ ] Content scope: personal observations, NDIS sector commentary, property insights, life
- [ ] Series agent configured for PK voice
- [ ] YouTube channel created and connected
- **Effort:** 1 day (configuration, not building).

**3.7 — Personal Brand Content Series**
- [ ] ICE-generated content for PK as a person (not just his business pages)
- [ ] Separate from NDIS Yarns + Property Pulse — PK's own voice + brand
- [ ] Facebook + LinkedIn + YouTube all targeted
- **Effort:** 1 day (configuration).

### Deliverables — Platform Expansion

**3.8 — Instagram Publisher**
- [ ] Add `instagram_content_publish` + `instagram_basic` permissions to Meta App Review
- [ ] `publisher` update — Instagram carousel endpoint
- [ ] `client_publish_profile` row for both clients on Instagram
- **Effort:** 0.5 days. **After Meta App Review approved.**

**3.9 — LinkedIn Live**
- [ ] OAuth connect flow tested end-to-end once API approves
- [ ] `client_publish_profile` rows for LinkedIn (both clients)
- [ ] Test posts verified
- **Effort:** 0.5 days. **Waiting on Community Management API (~25 Mar).**

### Deliverables — Client Sales Readiness (Optional)

**3.10 — Prospect Demo Generator**
- [ ] Internal dashboard tool: input prospect name + practice type
- [ ] Output: sample week of posts for that specific practice
- [ ] Uses existing taxonomy + ai-worker with temporary profile
- [ ] Transforms sales conversations from generic to personalised
- **Effort:** 2 days.

**3.11 — Client Health Weekly Report**
- [ ] Edge Function: Sunday night, reads post_performance per client
- [ ] Claude API: plain-English paragraph summary
- [ ] Delivered via Resend email — no portal changes required
- [ ] "This week: 5 posts, top post reached 840 people, suggest X next week"
- **Effort:** 2 days.

**3.12 — First External Client (Optional)**
- [ ] Only when: visual pipeline confirmed + NDIS system prompt done + proof page strong
- [ ] Portal technically ready — the barrier is sales readiness, not engineering
- [ ] Target: NDIS OT practice or support coordination service via personal network

### Phase 3 Done When
1. AI Diagnostic Agent Tier 1 running and producing accurate summaries
2. Visual pipeline confirmed with 5+ image posts published successfully
3. YouTube Shorts pipeline live with at least one personal brand video published
4. LinkedIn publishing live
5. Signal clustering eliminating repetition at source

---

## Phase 4 — Scale + Intelligence
**Goal:** System runs itself. PK's role is strategist, not operator.
First external clients generating revenue. AI autonomy stack building.

**Target start:** When Phase 3 done criteria met

### Deliverables

**4.1 — AI Agent Tiers 3–6**
- Tier 3: Propose — suggests higher-risk actions (redeployments, config changes) for one-click approval
- Tier 4: Predict — reads leading indicators, acts before failures happen
- Tier 5: Self-improve — reads approval + engagement patterns, proposes prompt improvements
- Tier 6: Closed loop — cross-checks own decisions against outcomes, calibrates autonomously
- **Effort:** 1-2 days per tier, spaced 2-4 weeks apart to observe reliability at each tier.

**4.2 — Knowledge Base + Embedding Layer**
- Background process embeds all ingested articles + generated posts into vector store
- Queryable conversationally: "What has the NDIS sector discussed about housing in Q1?"
- Proprietary data asset — grows with every article ingested
- NDIS Accessories store product research use case enabled
- Cross-client pattern intelligence (what's working across the NDIS provider network)
- **Effort:** 2 days setup, then autonomous.

**4.3 — Video Pipeline Phase 2**
- Custom avatar (HeyGen — client films 3 min video, generates reusable likeness)
- Dialogue mode (two-character scripts, Creatomate two-avatar layouts)
- Content atomisation: one brief → FB text + LI carousel + IG Reels video simultaneously
- **Effort:** 2-3 weeks.

**4.4 — Additional Signal Sources**
- Reddit API (free, high signal for niche communities)
- YouTube Data API for trending topics
- Perplexity API for paywall bypass + real-time synthesis
- Apify scrapers for priority non-RSS sources

**4.5 — Client Websites**
- Next.js template per client
- Content flows ICE → Supabase → website automatically
- SEO-optimised, auto-updating
- NDIS Yarns website + Property Pulse website first

**4.6 — External Client Scale**
- 5-10 paying NDIS clients
- Client self-service portal (onboarding, OAuth, feedback)
- Client health reports via Content Analyst Agent
- Boost agent (Facebook Ads API)
- Per-client operational time under 30 min/week

**4.7 — SaaS Evaluation**
- At 10 clients served for 3+ months
- Unit economics confirmed
- Evaluate: continue managed service OR build self-serve platform

### Phase 4 Done When
- 8-10 clients publishing consistently
- Under 10 hours/week total operational time
- AI autonomy Tier 4+ running reliably
- Clear managed service vs SaaS decision made

---

## The AI Agent Tier Reference

| Tier | Name | Actions | Build timing |
|---|---|---|---|
| 1 | Diagnose | Read logs → plain English summary. No actions. | Phase 3 — FIRST |
| 2 | Fix (approved list) | Execute pre-approved reversible actions. Smarter than Pipeline Doctor. | Phase 3 — after 1-2 weeks of Tier 1 |
| 3 | Propose | Suggests higher-risk actions, awaits approval. | Phase 4 |
| 4 | Predict | Acts on leading indicators before failure. | Phase 4 |
| 5 | Self-improve | Proposes prompt improvements from engagement data. | Phase 4 |
| 6 | Closed loop | Cross-checks own decisions against outcomes, calibrates autonomously. | Phase 4 |

---

## Platform Priority Order

1. Facebook ✅ — primary platform, proven
2. LinkedIn 🔴 — blocked on API, code done
3. YouTube 🟡 — Phase 3, personal brand driver
4. Instagram ⬜ — after Meta App Review, 0.5 days
5. Email newsletter ⬜ — Phase 4
6. TikTok ⬜ — not prioritised
7. Twitter/X ⬜ — not prioritised ($100/month API minimum)

---

## What Is Out of Scope (All Phases)

- Native mobile app (PWA covers this)
- Full ad campaign management (boost only)
- CRM / lead management
- Community management (comment responses)
- White-label reseller platform (evaluate Phase 4 only)
- Platforms outside Australia initially
