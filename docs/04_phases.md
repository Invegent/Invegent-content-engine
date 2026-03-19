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
**2.7 Visual Pipeline V1** ✅ — image-worker v3.3.0, Creatomate API, 1080×1080 PNG, brand colours confirmed (20 Mar 2026)
**2.8 Content Intelligence Profiles** ✅ — structured prompts, platform profiles, content_type_prompt
**2.9 Pipeline Doctor** ✅ — v1.0.0, 7 checks, auto-fixes, every 30min (19 Mar 2026)
**2.10 Pipeline Health Monitoring** ✅ — snapshots + doctor log + dashboard page (19 Mar 2026)
**2.11 Taxonomy Scorer v2 + Bundler v3** ✅ — proper category distribution, max 2 per cat (19 Mar 2026)
**2.12 Signal Clustering** ✅ — two-layer dedup, pg_trgm, story_cluster_id, bundler v4 (20 Mar 2026)
**2.13 Email Newsletter Ingest** ✅ — feeds@invegent.com, OAuth, 2h cron
**2.14 Client Portal** ✅ — portal.invegent.com, magic link, RLS, inbox, calendar, performance, feeds

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

**3.1 — AI Diagnostic Agent (Tier 1)** ✅ DEPLOYED 19 Mar 2026
- pipeline-ai-summary Edge Function running at :55 past every hour
- Reads last 8 health snapshots + 4 doctor logs → Claude API
- Writes plain-English paragraph to m.pipeline_ai_summary
- Dashboard Pipeline Log page: AI Summary section at top

**3.2 — Compliance-Aware NDIS System Prompt**
- [ ] Research NDIS Code of Conduct + Practice Standards constraints
- [ ] Rewrite NDIS Yarns brand profile system prompt
- [ ] Test against 20 recent drafts — compare output quality
- **Effort:** 3 days. Core differentiator for client sales.

**3.3 — AI Diagnostic Agent (Tier 2)**
- [ ] Upgrade to action-capable (pre-approved action list)
- [ ] Claude reasons about which action and when
- **Effort:** 1 day. Build only after Tier 1 has run 1-2 weeks.

### Deliverables — Personal Brand + YouTube

**3.4 — YouTube Shorts Pipeline**
- [ ] video-worker Edge Function (Creatomate + ElevenLabs)
- [ ] Script generation format in ai-worker (60-90s Shorts)
- [ ] YouTube Data API v3 OAuth + upload endpoint
- [ ] Voiceover-only path first, stock avatar second
- **Effort:** 3-4 weeks.

**3.5 — PK Personal YouTube Channel as ICE Client**
- [ ] New client record: PK Personal Brand
- [ ] Content scope: personal observations, NDIS, property, life
- **Effort:** 1 day (config).

**3.6 — Personal Brand Content Series**
- [ ] ICE-generated content for PK as a person
- [ ] Facebook + LinkedIn + YouTube targeted
- **Effort:** 1 day (config).

### Deliverables — Platform Expansion

**3.7 — Instagram Publisher**
- [ ] Meta App Review permissions include instagram_content_publish
- [ ] publisher update — Instagram carousel endpoint
- **Effort:** 0.5 days. After Meta App Review approved.

**3.8 — LinkedIn Live**
- [ ] OAuth connect tested once API approves
- [ ] client_publish_profile rows for both clients
- **Effort:** 0.5 days. Waiting on Community Management API.

### Deliverables — Client Sales Readiness

**3.9 — Prospect Demo Generator**
- [ ] Input prospect name + practice type → sample week of posts
- **Effort:** 2 days.

**3.10 — Client Health Weekly Report (email)**
- [ ] Sunday night Edge Function, plain-English summary via Claude
- [ ] Delivered via Resend email
- **Effort:** 2 days.

**3.11 — First External Client (Optional)**
- [ ] When visual pipeline confirmed + NDIS system prompt done + proof strong

### Phase 3 Done When
1. AI Diagnostic Agent Tier 1 running and producing accurate summaries ✅
2. Visual pipeline confirmed with 5+ image posts published successfully (in progress)
3. YouTube Shorts pipeline live with at least one personal brand video published
4. LinkedIn publishing live
5. NDIS compliance system prompt deployed

---

## Phase 4 — Scale + Intelligence
**Goal:** System runs itself. PK's role is strategist, not operator.
First external clients generating revenue. AI autonomy stack building.

**Target start:** When Phase 3 done criteria met

### Deliverables

**4.1 — AI Agent Tiers 3–6**
- Tier 3: Propose — suggests higher-risk actions for approval
- Tier 4: Predict — acts on leading indicators before failure
- Tier 5: Self-improve — reads approval + engagement patterns, proposes prompt improvements
- Tier 6: Closed loop — cross-checks own decisions against outcomes

**4.2 — Knowledge Base + Embedding Layer**
- Embeds all ingested articles + generated posts into vector store
- Queryable: "What has the NDIS sector discussed about housing in Q1?"
- NDIS Accessories research use case enabled

**4.3 — Video Pipeline Phase 2**
- Custom avatar (HeyGen — client films 3 min, generates reusable likeness)
- Dialogue mode (two-character scripts)
- Content atomisation: one brief → FB text + LI carousel + IG Reels video

**4.4 — Additional Signal Sources**
- Reddit API, YouTube Data API, Perplexity API, Apify scrapers

**4.5 — Client Websites**
- Next.js template per client — content flows ICE → Supabase → website

**4.6 — External Client Scale**
- 5-10 paying NDIS clients, self-service portal, boost agent

**4.7 — SaaS Evaluation**
- At 10 clients served for 3+ months

### Phase 4 Done When
- 8-10 clients publishing consistently
- Under 10 hours/week total operational time
- AI autonomy Tier 4+ running reliably
- Clear managed service vs SaaS decision made

---

## The AI Agent Tier Reference

| Tier | Name | Actions | Build timing |
|---|---|---|---|
| 1 | Diagnose | Read logs → plain English summary. No actions. | ✅ Phase 2 — deployed 19 Mar |
| 2 | Fix (approved list) | Execute pre-approved reversible actions. | Phase 3 — after 1-2 weeks of Tier 1 |
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
