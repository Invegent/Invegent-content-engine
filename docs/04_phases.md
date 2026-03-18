# ICE — Project Phases & Deliverables

## Phase Summary
Phase 1 — Stabilise    ✅ COMPLETE
Phase 2 — Automate     ← YOU ARE HERE
Phase 3 — Expand
Phase 4 — Scale

Each phase has a clear goal, specific deliverables, and a definition
of done. A phase does not end until ALL done criteria are met.

---

## Phase 1 — Stabilise ✅ COMPLETE
**Completed:** March 2026

**1.1 Feed Quality** ✅ — 26 active sources (22 RSS + 2 email + 2 native)
**1.2 Auto-Approval Agent** ✅ — v1.4.0, 9-gate logic, runs every 10 min
**1.3 Dashboard** ✅ — Retool replaced by Next.js, cancelled March 2026
**1.4 Both Clients Publishing** ✅ — 5+ posts/week, 103 total published
**1.5 Security & Backups** ✅ — Supabase Pro, daily backups, PAT rotated

**1.6 — Meta App Review** 🔄 IN PROGRESS
- [x] Privacy Policy + Data Deletion URLs live
- [x] Business verification submitted — In Review
- [x] Correct permissions: pages_manage_posts, pages_read_engagement, pages_show_list
- [x] pages_manage_posts API test calls: green tick
- [x] Facebook OAuth connect flow built (D020, 16 Mar 2026)
- [x] Screencasts recorded for all 3 permissions (18 Mar 2026)
- [ ] Screencasts uploaded to App Review submission
- [ ] Data handling + reviewer instructions sections completed
- [ ] Business verification approval confirmed
- [ ] Permissions review submitted (2-8 weeks for decision)

**1.7 Dead Letter Queue** ✅ — dead status + dead_reason + 2am UTC sweep

---

## Phase 2 — Automate ← YOU ARE HERE
**Started:** March 2026

**2.1 Facebook Insights Back-Feed** ✅ COMPLETE
- insights-worker v18, daily 3am UTC
- m.post_performance table, 56 rows collected

**2.2 Feed Intelligence Agent** ✅ COMPLETE
- feed-intelligence v7, Sundays 2am UTC
- Give-up rate analysis + recommendations to DB

**2.3 LinkedIn Publisher** 🔄 IN PROGRESS — waiting on API approval
- [x] LinkedIn account: pk@invegent.com (18 Mar 2026)
- [x] NDIS Yarns LinkedIn Company Page created
- [x] Property Pulse LinkedIn Company Page created (URL: property-pulse-au)
- [x] Invegent Community app (Client ID: 78im589pktk59k) — correct app for org posting
      NOTE: Invegent Publisher (78npkxuir4z64j) = personal posting only, wrong app
- [x] Community Management API access form submitted (1-5 business days)
      Use case: Page management + Page analytics
- [x] linkedin-publisher Edge Function v1.1 deployed
- [x] publisher_lock_queue_v2 updated with p_platform filter
- [x] store_linkedin_org_token() SECURITY DEFINER function created
- [x] pg_cron: linkedin-publisher-every-15m scheduled
- [x] Dashboard /connect page updated — dual platform UI (Facebook + LinkedIn)
- [x] /api/linkedin/auth + /api/linkedin/callback routes deployed
- [x] Vercel LINKEDIN_CLIENT_ID/SECRET updated to Community app credentials
- [x] Callback URL added to Invegent Community app Auth tab
- [ ] Community Management API approval (pending — 1-5 business days)
- [ ] OAuth connect flow tested end-to-end (blocked until approval)
- [ ] client_publish_profile rows for LinkedIn (NDIS Yarns + Property Pulse)
- [ ] Test posts verified on both clients

**2.4 Campaigns** ⏸ DEFERRED to Phase 3

**2.5 Next.js Dashboard** ✅ COMPLETE
- dashboard.invegent.com — all tabs live
- Retool cancelled March 2026

**2.6 Public Proof Dashboard** ✅ COMPLETE (18 Mar 2026)
- [x] invegent-web repo created + deployed to Vercel
- [x] invegent.com DNS configured (A record + www CNAME) — propagating
- [x] /proof — summary, platform cards, education layer
- [x] /proof/facebook — volume, reach, impressions, interactions,
      engagement rate, weekly chart, recent posts, top posts
- [x] /proof/linkedin — placeholder with education layer
- [x] public.vw_proof_ndis_yarns — live data feed, anon read
- [ ] Follower count (page_fans) — insights-worker update pending
- [ ] invegent.com DNS confirmed green in Vercel

**2.7 Audience Foundation** 🔲 ACTIVE
- Distribution started 16 Mar 2026
- NDIS Yarns + Property Pulse LinkedIn pages created 18 Mar 2026
- Target: 500+ engaged NDIS Yarns followers before first client conversation

**2.8 Content Intelligence Profiles** ✅ COMPLETE
**2.9 Post Studio** ✅ COMPLETE
**2.10 AI Usage Ledger** 🔲 PLANNED — see D021
**2.11 Per-Post Platform Targeting** 🔲 PLANNED — see D022

### Phase 2 Done When
1. Less than 2 hours/week manual input ✅
2. Performance data flowing ✅
3. LinkedIn publishing live 🔄 (waiting on Community Management API)
4. Dashboard live ✅
5. Usage ledger running (2.10)
6. Platform targeting (2.11)

---

## Phase 3 — Expand
**Goal:** First paying client onboarded.

**3.1 Client Portal v1** 🔄 IN PROGRESS
- [x] portal.invegent.com live
- [x] Magic link auth — Resend SMTP confirmed working
- [x] portal_user: email → client_id, user_id hydrated on first login
- [x] Draft inbox, calendar ✅
- [x] draft-notifier v2 — 30min cadence ✅
- [x] RLS on post_draft, post_publish_queue, post_publish, post_performance ✅
- [ ] Facebook OAuth connect flow moved to portal
- [ ] Draft notifier email subject redesign

**3.2–3.9** 🔲 See previous version for full detail

### Phase 3 Done When
1. First paying client live for 4 weeks
2. Portal v1 used by at least one client
3. Content Analyst Agent or manual weekly report
4. Meta App Review approved or in final review

---

## Phase 4 — Scale
4.1–4.8 deferred — see decisions log

---

## Platform Publishing Roadmap

| Platform | Phase | Status | Notes |
|---|---|---|---|
| Facebook | 1 | ✅ Live | Primary platform |
| LinkedIn | 2 | 🔄 In progress | Waiting Community Mgmt API approval |
| Instagram | 2+ | 🔲 Planned | Same Meta API sprint |
| Email newsletter | 3 | 🔲 Planned | Resend API |
| Reddit | 4 | 🔲 Signal only | Not publishing |
| YouTube | 4 | 🔲 Planned | Requires video layer |
| TikTok | Skip | ❌ | Wrong audience |
| Twitter/X | Skip | ❌ | $100/month API |

---

## Infrastructure Status (18 March 2026)

### Edge Functions (12 active)
| Function | Version | Status |
|---|---|---|
| ingest | v81 | ✅ |
| content_fetch | v52 | ✅ |
| ai-worker | v49 | ✅ |
| publisher | v41 | ✅ |
| linkedin-publisher | v2 | ✅ NEW |
| auto-approver | v16 | ✅ |
| insights-worker | v18 | ✅ |
| feed-intelligence | v7 | ✅ |
| email-ingest | v2 | ✅ |
| draft-notifier | v2 | ✅ |
| inspector | v69 | ✅ |
| inspector_sql_ro | v24 | ✅ |

### Vercel Projects
| Project | Domain | Status |
|---|---|---|
| invegent-dashboard | dashboard.invegent.com | ✅ Live |
| invegent-portal | portal.invegent.com | ✅ Live |
| invegent-web | invegent.com | ✅ Deployed, DNS propagating |

### LinkedIn Setup
| Item | Detail | Status |
|---|---|---|
| Account | pk@invegent.com | ✅ |
| Invegent Publisher app | 78npkxuir4z64j — w_member_social only | ✅ (not used for ICE) |
| Invegent Community app | 78im589pktk59k — org posting | ✅ correct app |
| Community Management API | Access form submitted | ⏳ 1-5 days |
| NDIS Yarns LinkedIn Page | Created 18 Mar | ✅ |
| Property Pulse LinkedIn Page | property-pulse-au — Created 18 Mar | ✅ |

### Supabase DB Functions
| Function | Purpose | Status |
|---|---|---|
| public.auth_client_id() | RLS helper — portal client isolation | ✅ |
| public.store_linkedin_org_token() | Store LinkedIn org OAuth token | ✅ |
| m.publisher_lock_queue_v2(p_platform) | Platform-filtered queue lock | ✅ |
| public.vw_proof_ndis_yarns | Proof Dashboard data feed | ✅ |

### Email
| Component | Status |
|---|---|
| Resend domain (invegent.com) | ✅ Verified |
| Supabase Auth SMTP | ✅ smtp.resend.com:465 |
| RESEND_API_KEY Edge Secret | ✅ |
| Magic link delivery | ✅ Confirmed |

---

## Next Session Priorities

1. **invegent.com DNS** — confirm green in Vercel
2. **LinkedIn Community Management API approval** — check email, then
   test OAuth connect flow on dashboard.invegent.com/connect
3. **LinkedIn client_publish_profile rows** — insert for NDIS Yarns
   and Property Pulse after OAuth connect confirmed
4. **Follower count on Proof Dashboard** — insights-worker update
5. **Meta App Review** — upload screencasts, complete submission
   once business verification approval email arrives

---

## What Is Out of Scope
- Native mobile app / Video production / Full ad campaigns
- CRM / Community management / White-label / Non-AU initially
