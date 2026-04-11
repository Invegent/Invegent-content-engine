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
**1.6 Meta App Review** 🔄 — Business verification In Review. Next check: 14 Apr 2026.
**1.7 Dead Letter Queue** ✅ — deployed

---

## Phase 2 — Automate ✅ MOSTLY COMPLETE
**Goal:** ICE operates autonomously. Human input under 2 hours/week.

**2.1 Facebook Insights Back-Feed** ✅ — insights-worker v18, daily 3am UTC
**2.2 Feed Intelligence Agent** ✅ — feed-intelligence v7, Sundays 2am UTC
**2.3 LinkedIn Publisher** 🔴 BLOCKED — Community Management API under review
**2.4 Content Series** ✅ — series-writer, series-outline, Content Studio UI all live
**2.5 Next.js Dashboard** ✅ — all tabs live, Retool cancelled
**2.6 Public Proof Dashboard** ✅ — invegent.com/proof live
**2.7 Visual Pipeline V1** ✅ — image-worker v3.9.2, Creatomate API, 1080×1080 PNG
**2.8 Content Intelligence Profiles** ✅ — structured prompts, platform profiles
**2.9 Pipeline Doctor** ✅ — v1.0.0, 7 checks, auto-fixes, every 30min
**2.10 Pipeline Health Monitoring** ✅ — snapshots + doctor log + dashboard
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

### Deliverables — AI Intelligence Layer

**3.1 — AI Diagnostic Agent (Tier 1)** ✅ DEPLOYED 19 Mar 2026
**3.2 — Compliance-Aware NDIS System Prompt** ✅ DEPLOYED 20 Mar 2026
**3.3 — AI Diagnostic Agent (Tier 2)** ✅ DEPLOYED 2 Apr 2026
**3.14 — AI Compliance Reviewer** ✅ DEPLOYED 2 Apr 2026
**3.15 — Profession Dimension** ✅ DEPLOYED 2 Apr 2026

### Deliverables — Personal Brand + YouTube

**3.4 — YouTube Shorts Pipeline Stage A — Silent MP4** ✅ DEPLOYED 20 Mar 2026
**3.5 — YouTube Shorts Pipeline Stage B — Voice + Upload** ✅ DEPLOYED 1 Apr 2026
**3.6 — Cowork Automation Tasks** ✅ LIVE 21 Mar 2026
**3.7 — YouTube Stage C — AI Avatar**
- [ ] HeyGen API integration (Phase 4)

### Deliverables — Platform Expansion

**3.8 — Instagram Publisher**
- [ ] After Meta App Review approved. 0.5 days.

**3.9 — LinkedIn Live**
- [ ] 0.5 days when API approves. Code done.

### Deliverables — Client Onboarding

**3.16 — Client Onboarding Pipeline** ✅ DEPLOYED 11 Apr 2026 (D083)
- 7-step public form, dashboard review/approve, portal homepage
- Care for Welfare end-to-end verified

**3.17 — Onboarding Intelligence Layer** ⬜ DESIGNED 11 Apr 2026 (D087, D088)
- [ ] Resend SMTP for magic links (P0 — configure in Supabase dashboard)
- [ ] Portal callback fix: / not /inbox (Brief 011)
- [ ] Logo upload field in onboarding Step 1 (Brief 011 touches DB; form build next)
- [ ] Content objectives + service list in onboarding form
- [ ] brand-scanner Edge Function (async, website → logo → colours)
- [ ] AI profile bootstrap Edge Function (website + Facebook → Claude draft)
- [ ] Dashboard checklist panel (scan status, inline overrides, Run Scans button)
- [ ] c.client_brand_profile table (Brief 011)
- [ ] Portal CSS custom properties per client session (reads brand_profile)

**3.18 — NDIS Support Item Taxonomy** ⬜ DESIGNED 11 Apr 2026 (D084)
- [ ] t.ndis_registration_group table (Brief 011 creates structure)
- [ ] t.ndis_support_item table (Brief 011 creates structure)
- [ ] c.client_registration_group junction (Brief 011)
- [ ] c.client_support_item junction (Brief 011)
- [ ] Data load from NDIA Excel — separate task after tables exist
- [ ] plain_description column AI-written by Claude on load

**3.19 — Audit Trail Hardening** ⬜ DESIGNED 11 Apr 2026 (D088)
- [ ] approved_by + approved_at + auto_approval_scores on m.post_draft (Brief 011)
- [ ] compliance_flags JSONB on m.post_draft (Brief 011)
- [ ] require_client_approval on c.client_publish_profile (Brief 011)
- [ ] Immutable published post trigger (Brief 011)
- [ ] ai-worker updated to write compliance_flags on generation
- [ ] auto-approver updated to write approved_by + approved_at + scores

**3.20 — Portal Redesign** ⬜ DESIGNED 11 Apr 2026 (D088)
- [ ] Collapsible left sidebar replacing top nav bar
- [ ] Invegent branding top of sidebar, client identity in footer
- [ ] Mobile bottom tab bar
- [ ] Platform OAuth connect page (/connect)
- [ ] "powered by Invegent" in portal footer
- [ ] Portal home page: connect banner if platforms unconnected

### Deliverables — Client Sales Readiness

**3.10 — Prospect Demo Generator**
- [ ] ~1 day. Needed before first external client conversation.

**3.11 — Client Health Weekly Report (email)**
- [ ] ~2 days. Sunday Edge Function via Resend.

**3.12 — m.post_format_performance Population** ✅ DEPLOYED 31 Mar 2026

**3.13 — First External Client (Optional)**
- [ ] When: prospect demo ready + NDIS proof doc prepared + legal review complete

### Phase 3 Done When
1. AI Diagnostic Agent Tier 1 running ✅
2. Visual pipeline confirmed ✅
3. YouTube Shorts pipeline live ✅
4. LinkedIn publishing live ← waiting on API
5. NDIS compliance system prompt ✅
6. AI Compliance Reviewer live ✅ (D065)
7. Profession dimension deployed ✅ (D066)
8. Client onboarding pipeline live ✅ (D083)
9. Audit trail hardened (D088) ← in progress
10. Portal redesign complete (D088) ← in progress

---

## Phase 4 — Scale + Intelligence
**Goal:** System runs itself. PK's role is strategist, not operator.

**4.1 — AI Agent Tiers 3–6**
**4.2 — Knowledge Base + Embedding Layer**
**4.3 — Video Pipeline Phase 2** — HeyGen avatar conversations, D082
**4.4 — Additional Signal Sources**
**4.5 — Client Websites**
**4.6 — External Client Scale** — 5-10 paying clients
**4.7 — SaaS Evaluation**

### Phase 4 Done When
- 8-10 clients publishing consistently
- Under 10 hours/week total operational time
- AI autonomy Tier 4+ running reliably
- Clear managed service vs SaaS decision made

---

## The AI Agent Tier Reference

| Tier | Name | Status |
|---|---|---|
| 1 | Diagnose | ✅ Deployed 19 Mar |
| 2 | Fix + Recommend | ✅ Deployed 2 Apr 2026 |
| 3 | Propose | Phase 4 |
| 4 | Predict | Phase 4 |
| 5 | Self-improve | Phase 4 |
| 6 | Closed loop | Phase 4 |

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
- Physical product catalogue (deferred — different business model)
