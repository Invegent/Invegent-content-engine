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
- [x] Business verification submitted — In Review (~2 working days)
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

**2.3 LinkedIn Publisher** 🔲 READY TO BUILD
- [x] New account: pk@invegent.com (18 Mar 2026)
- [x] Invegent Company Page connected + verified
- [x] Invegent Publisher app (Client ID: 78npkxuir4z64j)
- [x] Share on LinkedIn (Default Tier) + OpenID Connect (Standard Tier) added
- [ ] linkedin-publisher Edge Function
- [ ] OAuth connect flow on portal (/connect, same pattern as D020)
- [ ] c.client_channel rows for LinkedIn per client
- [ ] Test posts verified on both clients

**2.4 Campaigns** ⏸ DEFERRED to Phase 3

**2.5 Next.js Dashboard** ✅ COMPLETE
- dashboard.invegent.com — all tabs live
- Retool cancelled March 2026

**2.6 Public Proof Dashboard** ✅ COMPLETE (18 Mar 2026)
- [x] invegent-web repo created + deployed to Vercel
- [x] invegent.com DNS configured (A record 76.76.21.21, www CNAME) — propagating
- [x] /proof — summary page, platform cards, education layer
- [x] /proof/facebook — full deep dive: volume, reach, impressions,
      interactions, engagement rate, weekly chart, recent posts, top posts
- [x] /proof/linkedin — placeholder with education layer + "coming soon"
- [x] public.vw_proof_ndis_yarns view — live data feed (anon read)
      Columns: total_posts_published, posts_this_month, posts_this_week,
      first_published_at, total_reach, total_impressions, total_interactions,
      total_reactions, total_comments, total_shares, avg_engagement_rate,
      posts_with_insights, weekly_breakdown, recent_posts, top_posts
- [ ] Follower count — needs page_fans from Facebook Graph API
      (insights-worker update — next session)
- [ ] invegent.com DNS fully propagated + green in Vercel

**2.7 Audience Foundation** 🔲 ACTIVE
- Distribution started 16 Mar 2026
- Target: 500+ engaged NDIS Yarns followers before first client conversation

**2.8 Content Intelligence Profiles** ✅ COMPLETE
- claude-sonnet-4-6 primary, OpenAI silent fallback
- ai-worker v2.1.0 with structured prompts

**2.9 Post Studio** ✅ COMPLETE
- End-to-end verified: Post Studio → Queue → Facebook

**2.10 AI Usage Ledger** 🔲 PLANNED — see D021

**2.11 Per-Post Platform Targeting** 🔲 PLANNED — see D022

### Phase 2 Done When
1. Less than 2 hours/week total manual input ✅ (approaching)
2. Performance data flowing back into scoring ✅
3. LinkedIn publishing live 🔲 (unblocked — ready to build)
4. Next.js dashboard live ✅
5. Usage ledger running (2.10)
6. Platform targeting in pipeline (2.11)

---

## Phase 3 — Expand
**Goal:** First paying client onboarded.

**3.1 Client Portal v1** 🔄 IN PROGRESS
- [x] portal.invegent.com live
- [x] Magic link auth — Resend SMTP, confirmed working (17-18 Mar 2026)
- [x] portal_user: email → client_id, user_id hydrated on first login
- [x] PKCE flow: same-browser requirement documented
- [x] Middleware: /callback excluded from auth guard
- [x] Draft inbox — approve/reject → publish queue ✅
- [x] Calendar — read-only ✅
- [x] draft-notifier v2 — 30min cadence, email confirmed working ✅
- [x] RLS on m.post_draft (SELECT+UPDATE), post_publish_queue, post_publish,
      post_performance — confirmed working 18 Mar 2026
- [ ] Facebook OAuth connect flow moved to portal (D020)
- [ ] Draft notifier email subject redesign (pending)

**3.2 Content Analyst Agent** 🔲
**3.3 Client Onboarding Flow** 🔲
**3.4 Distribution Layer (Boost Agent)** 🔲
**3.5 Meta App Review (permissions submission)** 🔲
**3.6 Evergreen Content Type** 🔲
**3.7 Client Portal v2** 🔲
**3.8 Content Series Planner** 🔲
**3.9 Client Offboarding Flow** 🔲

### Phase 3 Done When
1. First paying client live for 4 weeks
2. Portal v1 used by at least one client
3. Content Analyst Agent or manual weekly report
4. Meta App Review approved or in final review

---

## Phase 4 — Scale
4.1 Multi-Client Ops / 4.2 Signal Sources / 4.3 AI Model Abstraction /
4.4 Client Websites / 4.5 Vertical Expansion / 4.6 SaaS Evaluation /
4.7 Mobile Dashboard / 4.8 TOTP for Portal

---

## Platform Publishing Roadmap

| Platform | Phase | Status | Notes |
|---|---|---|---|
| Facebook | 1 | ✅ Live | Primary platform |
| LinkedIn | 2 | 🔲 Ready to build | Unblocked 18 Mar 2026 |
| Instagram | 2+ | 🔲 Planned | Same Meta API sprint |
| Email newsletter | 3 | 🔲 Planned | Resend API |
| Reddit | 4 | 🔲 Signal only | Not publishing |
| YouTube | 4 | 🔲 Planned | Requires video layer |
| TikTok | Skip | ❌ | Wrong audience |
| Twitter/X | Skip | ❌ | $100/month API |

---

## Infrastructure Status (18 March 2026)

### Edge Functions (11 active)
| Function | Version | Status |
|---|---|---|
| ingest | v81 | ✅ |
| content_fetch | v52 | ✅ |
| ai-worker | v49 | ✅ |
| publisher | v41 | ✅ |
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

### LinkedIn Apps
| App | Client ID | Status |
|---|---|---|
| Invegent Publisher | 78npkxuir4z64j | ✅ Verified, Share on LinkedIn added |
| Invegent Community | 78im589pktk59k | ✅ Verified (secondary) |

### Supabase Public Views
| View | Purpose | Status |
|---|---|---|
| public.vw_proof_ndis_yarns | Proof Dashboard data feed | ✅ Live, anon read granted |
| public.auth_client_id() | RLS helper — portal client isolation | ✅ Live |

### Email
| Component | Status |
|---|---|
| Resend domain (invegent.com) | ✅ Verified 16 Mar |
| Supabase Auth SMTP | ✅ smtp.resend.com:465 |
| RESEND_API_KEY Edge Secret | ✅ Added 17 Mar |
| Magic link delivery | ✅ Confirmed working |

---

## Next Session Priorities

1. **invegent.com DNS** — confirm green in Vercel (should be done by morning)
2. **Follower count on Proof Dashboard** — insights-worker update to pull
   page_fans from Facebook Graph API → add to vw_proof_ndis_yarns
3. **LinkedIn publisher (2.3)** — build linkedin-publisher Edge Function
   using Invegent Publisher app (Client ID: 78npkxuir4z64j)
4. **Meta App Review** — upload screencasts, complete data handling section,
   await business verification approval, submit permissions review
5. **Draft notifier subject redesign** — design before first real client

---

## What Is Out of Scope

- Native mobile app
- Video production
- Full ad campaign management (boost only)
- CRM / lead management
- Community management
- White-label reseller platform
- Platforms outside Australia initially
