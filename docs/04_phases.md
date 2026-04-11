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
**1.6 Meta App Review** 🔄 — Screencasts + icon uploaded. Business verification In Review.
  Next check: 14 Apr 2026 (calendar set).
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
**2.7 Visual Pipeline V1** ✅ — image-worker v3.9.1, Creatomate API, 1080×1080 PNG
**2.8 Content Intelligence Profiles** ✅ — structured prompts, platform profiles
**2.9 Pipeline Doctor** ✅ — v1.0.0, 7 checks, auto-fixes, every 30min
**2.10 Pipeline Health Monitoring** ✅ — snapshots + doctor log (now logging, D063) + dashboard
**2.11 Taxonomy Scorer v2 + Bundler v3** ✅
**2.12 Signal Clustering** ✅ — two-layer dedup, pg_trgm, bundler v4
**2.13 Email Newsletter Ingest** ✅ — feeds@invegent.com, OAuth, 2h cron
**2.14 Client Portal** ✅ — portal.invegent.com, magic link, RLS

### Phase 2 Done When
1. LinkedIn publisher live ← only remaining item
2. All other criteria already met

---

## Phase 3 — Expand + Personal Brand ← YOU ARE HERE
**Goal:** The engine runs itself and proves its value on PK's own businesses.
Personal brand and YouTube pipeline built. First external client optional.

**Target start:** Now (Phase 2 functionally complete; LinkedIn unblock is administrative)
**Target duration:** 8-12 weeks from March 2026

### Deliverables — AI Intelligence Layer

**3.1 — AI Diagnostic Agent (Tier 1)** ✅ DEPLOYED 19 Mar 2026
- pipeline-ai-summary Edge Function at :55 past every hour
- Reads health snapshots + doctor logs → Claude API → plain-English summary
- Dashboard Monitor → Pipeline page

**3.2 — Compliance-Aware NDIS System Prompt** ✅ DEPLOYED 20 Mar 2026
- 20 active rules in t.5.7_compliance_rule (HARD_BLOCK + SOFT_WARN)
- ai-worker v2.5.1 injects rules into every NDIS draft
- compliance-monitor v1.2.0 watches 5 policy URLs monthly (SHA-256 hash)
- Compliance test: 0/20 HARD_BLOCK, 3/20 SOFT_WARN ✅

**3.3 — AI Diagnostic Agent (Tier 2)** ✅ DEPLOYED 2 Apr 2026
- ai-diagnostic v1.0.0 Edge Function
- Daily health report with trend analysis, per-client scoring (NDIS Yarns + Property Pulse)
- AI-generated recommendations and predictive warnings via Claude API
- Dashboard /diagnostics page + /api/diagnostics route live
- (D070)

**3.14 — AI Compliance Reviewer** ✅ DEPLOYED 2 Apr 2026
- compliance-reviewer v1.3.0 Edge Function
- Triggered: pg_cron 9:05 UTC 1st of month (5 min after compliance-monitor)
- Also on-demand via dashboard "Run AI Review" button
- Per changed URL: fetches page → loads scoped rules → Claude analysis →
  writes: summary, relevance, key_changes, affected_rules (with suggested updates),
  new_rules_suggested, confidence, human_action_required
- Dashboard: AI analysis panel per queue item, confidence/relevance badges,
  expandable affected rules + suggested updates
- Fully vertical-agnostic: adding ASIC mortgage broker URLs = INSERT rows, no code change
- First run: 5/5 NDIS items analysed, 4/5 action required (D065)

**3.15 — Profession Dimension** ✅ DEPLOYED 2 Apr 2026
- t.profession reference table: 12 professions (7 NDIS, 5 property)
- NDIS: occupational_therapy, physiotherapy, speech_pathology, behaviour_support,
  support_coordination, support_worker, plan_management
- Property: mortgage_broking, real_estate_agent, buyers_agent, building, property_investment
- profession_slugs text[] on t.5.7_compliance_rule:
  NULL = universal; array = scoped to specific professions
  4 rules now scoped: ndis_ot_scope_of_practice (OT only),
  ndis_no_diagnostic_implications (clinical professions),
  ndis_early_childhood_claims (OT/physio/speech),
  ndis_plan_management_commentary (plan_management/support_coordination)
- profession_slug on m.compliance_policy_source, m.compliance_review_queue, c.client
- Care for Welfare set to occupational_therapy
- get_compliance_rules(vertical, profession) SECURITY DEFINER function:
  returns universal rules + profession-matching rules in one call
  OT gets 22 rules. Support worker gets 19 rules. No false positives.
- Outstanding: wire get_compliance_rules() into ai-worker (next session) (D066)

### Deliverables — Personal Brand + YouTube

**3.4 — YouTube Shorts Pipeline Stage A — Silent MP4** ✅ DEPLOYED 20 Mar 2026
- video-worker v1.0.0: video_short_kinetic + video_short_stat formats
- Creatomate renders 9:16 1080×1920 MP4

**3.5 — YouTube Shorts Pipeline Stage B — Voice + Upload** ✅ DEPLOYED 1 Apr 2026
- ElevenLabs Creator plan: NDIS voice AU female, PP voice confident male
- youtube-publisher v1.2.0: DB-driven credential lookup
- Property Pulse: YouTube connected, first Short published live
- NDIS Yarns: pending Brand Account conversion

**3.6 — Cowork Automation Tasks** ✅ LIVE 21 Mar 2026
- Weekly reconciliation: Monday 7am AEST
- Nightly reconciler + auditor: midnight/2am AEST

**3.7 — YouTube Stage C — AI Avatar**
- [ ] HeyGen API integration (Phase 4)

### Deliverables — Platform Expansion

**3.8 — Instagram Publisher**
- [ ] After Meta App Review approved. 0.5 days.

**3.9 — LinkedIn Live**
- [ ] 0.5 days when API approves. Code done.

### Deliverables — Client Onboarding

**3.16 — Client Onboarding Pipeline** ✅ DEPLOYED 11 Apr 2026 (D083)
- 7-step public onboarding form at portal.invegent.com/onboard
- Dashboard review panel: all 7 sections, operator notes, Request Info flow
- Request Info: flags specific fields, writes message → client gets email with update link
- Client updates at portal.invegent.com/onboard/update?id=...&token=...
- Approve flow: creates c.client + portal_user + c.client_service_agreement atomically
- onboarding-notifier v2.0.0: operator email + client confirmation email
- 4 service packages: Starter $500 / Standard $900 / Growth $1,500 / Professional $2,000
- Auth Site URL changed to portal.invegent.com
- Care for Welfare onboarded as first test client (client_id: 3eca32aa) — end-to-end verified

**Known gaps (next session):**
- Portal callback redirects to /inbox instead of / — fix needed
- Platform OAuth connection page missing — clients cannot yet connect Facebook/LinkedIn pages
- Portal publishing schedule view missing
- Magic link delivery unreliable via Supabase default — needs Resend SMTP

### Deliverables — Client Sales Readiness

**3.10 — Prospect Demo Generator**
- [ ] Input prospect name + practice type → sample week of posts
- Effort: 1 day. Needed before first client conversation.

**3.11 — Client Health Weekly Report (email)**
- [ ] Sunday night Edge Function, plain-English summary via Claude, Resend delivery
- Effort: 2 days

**3.12 — m.post_format_performance Population** ✅ DEPLOYED 31 Mar 2026
- refresh_post_format_performance() running daily, data flowing

**3.13 — First External Client (Optional)**
- [ ] When prospect demo ready + NDIS proof doc prepared + legal review complete

### Phase 3 Done When
1. AI Diagnostic Agent Tier 1 running ✅
2. Visual pipeline confirmed ✅
3. YouTube Shorts pipeline live ✅
4. LinkedIn publishing live ← waiting on API
5. NDIS compliance system prompt ✅
6. AI Compliance Reviewer live ✅ (D065)
7. Profession dimension deployed ✅ (D066)
8. Client onboarding pipeline live ✅ (D083)

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
- Tier 6: Closed loop — cross-checks decisions against outcomes, calibrates autonomously

**4.2 — Knowledge Base + Embedding Layer**

**4.3 — Video Pipeline Phase 2** — HeyGen avatar, dialogue mode, content atomisation

**4.4 — Additional Signal Sources** — Reddit, YouTube Data API, Perplexity, Apify

**4.5 — Client Websites** — Next.js per client, content auto-flows ICE → web

**4.6 — External Client Scale** — 5-10 paying clients, boost agent

**4.7 — SaaS Evaluation** — at 10 clients, 3+ months

### Phase 4 Done When
- 8-10 clients publishing consistently
- Under 10 hours/week total operational time
- AI autonomy Tier 4+ running reliably
- Clear managed service vs SaaS decision made

---

## The AI Agent Tier Reference

| Tier | Name | Actions | Status |
|---|---|---|---|
| 1 | Diagnose | Read logs → plain English summary. No actions. | ✅ Deployed 19 Mar |
| 2 | Fix + Recommend | pipeline-fixer: pre-approved auto-fixes (D057). ai-diagnostic v1.0.0: daily scored report, trend, recommendations, predictions (D070). | ✅ Deployed 2 Apr 2026 |
| 3 | Propose | Suggests higher-risk actions, awaits approval. | Phase 4 |
| 4 | Predict | Acts on leading indicators before failure. | Phase 4 |
| 5 | Self-improve | Proposes prompt improvements from engagement data. | Phase 4 |
| 6 | Closed loop | Cross-checks decisions against outcomes, calibrates. | Phase 4 |

---

## Platform Priority Order

1. Facebook ✅ — primary platform, proven
2. LinkedIn 🔴 — blocked on API, code done
3. YouTube 🟡 — PP live, NDIS Yarns pending Brand Account
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
