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
**1.4 Both Clients Publishing** ✅ — 5+ posts/week, 103+ total published
**1.5 Security & Backups** ✅ — Supabase Pro, daily backups, PAT rotated

**1.6 — Meta App Review** 🔄 IN PROGRESS
- [x] Privacy Policy + Data Deletion URLs live
- [x] Business verification submitted — In Review
- [x] Correct permissions: pages_manage_posts, pages_read_engagement, pages_show_list
- [x] Screencasts recorded for all 3 permissions (18 Mar 2026)
- [ ] Upload screencasts to App Review submission
- [ ] Complete data handling + reviewer instructions
- [ ] Business verification approval confirmed
- [ ] Permissions review submitted (2-8 weeks for decision)
- Calendar reminder: Wed 1 Apr 2026

**1.7 Dead Letter Queue** ✅ — dead status + dead_reason + 2am UTC sweep

---

## Phase 2 — Automate ← YOU ARE HERE
**Started:** March 2026

**2.1 Facebook Insights Back-Feed** ✅ COMPLETE
- insights-worker v18, daily 3am UTC
- m.post_performance table populated

**2.2 Feed Intelligence Agent** ✅ COMPLETE
- feed-intelligence v7, Sundays 2am UTC
- Give-up rate analysis + recommendations to DB

**2.3 LinkedIn Publisher** 🔄 IN PROGRESS — waiting on API approval
- [x] LinkedIn account: pk@invegent.com
- [x] NDIS Yarns LinkedIn Company Page created
- [x] Property Pulse LinkedIn Company Page created (URL: property-pulse-au)
- [x] Invegent Community app (78im589pktk59k) — correct app for org posting
      NOTE: Invegent Publisher (78npkxuir4z64j) = w_member_social only, wrong app
- [x] Community Management API access form submitted
      Status: "1 of 2. Access Form Review" — may request docs in 10-14 business days
- [x] linkedin-publisher Edge Function v1.1 deployed
- [x] publisher_lock_queue_v2 updated with p_platform filter parameter
- [x] store_linkedin_org_token() SECURITY DEFINER function created
- [x] pg_cron: linkedin-publisher-every-15m scheduled
- [x] Dashboard /connect — dual platform UI (Facebook + LinkedIn columns)
- [x] /api/linkedin/auth + /api/linkedin/callback routes deployed
- [x] Vercel LINKEDIN_CLIENT_ID/SECRET = Community app credentials
- [x] Callback URL added to Invegent Community app Auth tab
- [ ] Community Management API approval (calendar reminder: Wed 25 Mar)
- [ ] OAuth connect flow tested end-to-end
- [ ] client_publish_profile rows for LinkedIn (NDIS Yarns + Property Pulse)
- [ ] Test posts verified on both clients

**2.4 Campaigns** ⏸ DEFERRED to Phase 3

**2.5 Next.js Dashboard** ✅ COMPLETE
- dashboard.invegent.com — all tabs live including Roadmap
- Retool cancelled March 2026

**2.6 Public Proof Dashboard** ✅ COMPLETE
- invegent.com/proof + /proof/facebook + /proof/linkedin
- public.vw_proof_ndis_yarns — live data feed
- invegent.com DNS live

**2.7 Audience Foundation** 🔲 ACTIVE
- NDIS Yarns + Property Pulse LinkedIn pages created 18 Mar 2026

**2.8–2.11** ✅ or 🔲 see previous version

### Phase 2 Done When
1. Less than 2 hours/week manual input ✅
2. Performance data flowing ✅
3. LinkedIn publishing live 🔄 (Community Management API pending)
4. Dashboard live ✅

---

## Phase 3 — Expand
**Goal:** First paying client onboarded.

**3.1 Client Portal v1** 🔄 IN PROGRESS
- [x] portal.invegent.com live
- [x] Magic link auth, RLS, draft inbox, calendar, draft-notifier ✅
- [x] draft-notifier v1.1 — fixed silent marking failure (mark_drafts_notified fn)
- [ ] Portal /performance page (planned 20 Mar 2026)
- [ ] Portal settings page (client_submitted_requires_approval toggle)
- [ ] portal_user.role = contributor | approver

**3.2 Visual Content Pipeline** 🔲 PLANNED (27 Mar 2026)
- image-worker Edge Function (sharp library, template-based)
- Brand visual identity section in Client Profile (logo, colours, style)
- Client-submitted content via email attachments
- New columns: content_origin, image_url, image_style on m.post_draft
- New setting: client_submitted_requires_approval on c.client
- Platform specs: FB 1200x630 JPEG, LI 1200x627 JPEG, 3-step LI upload

**3.3 Client Onboarding Flow** 🔲
**3.4 Boost Agent** 🔲
**3.5 Evergreen Content** 🔲
**3.6 First External Client** 🔲

### Phase 3 Done When
1. First paying client live for 4 weeks
2. Portal v1 used by at least one client
3. Meta App Review approved or in final review

---

## Phase 4 — Scale
4.1 Multi-Client Ops
4.2 Reddit + YouTube signal sources
4.3 AI model router
4.4 Client websites (ICE → web auto-publish)
4.5 Short form video pipeline (ElevenLabs + Creatomate)
4.6 Portal mobile PWA with camera (photo/video submission)
4.7 Aged care / mental health vertical
4.8 SaaS evaluation at 10 clients

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
| draft-notifier | v3 | ✅ fixed |
| inspector | v69 | ✅ |
| inspector_sql_ro | v24 | ✅ |

### Supabase DB Functions
| Function | Purpose | Status |
|---|---|---|
| public.auth_client_id() | RLS helper — portal isolation | ✅ |
| public.store_linkedin_org_token() | LinkedIn OAuth token storage | ✅ |
| public.mark_drafts_notified(uuid[]) | Draft notifier marking fix | ✅ |
| public.store_facebook_page_token() | Facebook OAuth token storage | ✅ |
| m.publisher_lock_queue_v2(p_platform) | Platform-filtered queue lock | ✅ |
| public.vw_proof_ndis_yarns | Proof dashboard data feed | ✅ |

### Vercel Projects
| Project | Domain | Status |
|---|---|---|
| invegent-dashboard | dashboard.invegent.com | ✅ Live |
| invegent-portal | portal.invegent.com | ✅ Live |
| invegent-web | invegent.com | ✅ Live |

### LinkedIn Setup
| Item | Detail | Status |
|---|---|---|
| Account | pk@invegent.com | ✅ |
| Invegent Publisher app | 78npkxuir4z64j — w_member_social | ✅ (not used for ICE) |
| Invegent Community app | 78im589pktk59k — org posting | ✅ correct app |
| Community Management API | Access form submitted, review in progress | ⏳ 1 of 2 |
| NDIS Yarns LinkedIn Page | Created 18 Mar | ✅ |
| Property Pulse LinkedIn Page | property-pulse-au, created 18 Mar | ✅ |

---

## Calendar Reminders Set
- Wed 25 Mar — Check LinkedIn Community Management API status
- Fri 20 Mar — Build portal /performance page
- Wed 1 Apr — Check Meta App Review + submit permissions review
- Fri 27 Mar — Build visual content pipeline (image-worker + client-submitted)

---

## What Is Out of Scope (All Phases)
- Native mobile app (PWA covers this)
- Full ad campaign management (boost only)
- CRM / lead management
- Community management (comment responses)
- White-label reseller platform (evaluate Phase 4 only)
- Long-form video (separate planning when reached)
- Platforms outside Australia initially
