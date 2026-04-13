# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-14 (Briefs 038-039 complete, 040-041 pending manual tokens)
> Written by: PK + Claude reconciliation

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. For any table you are about to work with, query k schema FIRST:
   ```sql
   SELECT schema_name, table_name, purpose, columns_list, fk_edges, allowed_ops
   FROM k.vw_table_summary
   WHERE schema_name = 'x' AND table_name = 'y';
   ```
3. Do NOT fall into discovery mode. k.vw_table_summary is the single-stop navigation layer.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (verified 7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
**Gate to first external client conversation is OPEN.**
**Legal review (L001) required before first external client signs.**
**CFW is the first client. All 4 platforms required: Facebook, LinkedIn, Instagram, YouTube.**

---

## VERCEL DEPLOYMENTS

| App | Domain | Status | Last deploy | Commit |
|---|---|---|---|---|
| invegent-dashboard | dashboard.invegent.com | READY | 13 Apr | `2e2d04b` nav restructure |
| invegent-portal | portal.invegent.com | READY | 13 Apr | `cdeb4761` queue view |
| invegent-web | invegent.com | READY | 13 Apr | `bf71fe48` NDIS landing page |

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Version | Status | Notes |
|---|---|---|---|
| ai-profile-bootstrap | 1 | ACTIVE | v1.0.0 |
| ai-worker | 73 | ACTIVE | v2.8.0 — format advisor preferred format bias |
| auto-approver | 30 | ACTIVE | v1.4.1 |
| brand-scanner | 1 | ACTIVE | v1.0.0 |
| client-weekly-summary | 1 | ACTIVE | v1.0.0 |
| compliance-monitor | 14 | ACTIVE | monthly |
| compliance-reviewer | 4 | ACTIVE | v1.3.0 |
| content_fetch | 65 | ACTIVE | |
| draft-notifier | 16 | ACTIVE | |
| email-ingest | 15 | ACTIVE | |
| feed-intelligence | 20 | ACTIVE | |
| heygen-avatar-creator | ACTIVE | v2.2.0 | |
| heygen-avatar-poller | ACTIVE | v2.0.0 | |
| heygen-worker | 2 | ACTIVE | v1.1.0 |
| image-worker | 37 | ACTIVE | v3.9.2 |
| ingest | 95 | ACTIVE | v8-youtube-channel |
| insights-feedback | 1 | ACTIVE | v1.0.0 — daily 3:30am UTC |
| insights-worker | 32 | ACTIVE | v14.0.0 |
| instagram-publisher | 1 | ACTIVE | v1.0.0 — NEW 14 Apr — no profiles yet |
| inspector | 82 | ACTIVE | |
| inspector_sql_ro | 37 | ACTIVE | |
| linkedin-publisher | 15 | ACTIVE | waiting on API approval + publish profiles |
| onboarding-notifier | 2 | ACTIVE | v2.0.0 |
| pipeline-ai-summary | 14 | ACTIVE | |
| pipeline-diagnostician | 1 | ACTIVE | v1.0.0 |
| pipeline-doctor | 13 | ACTIVE | |
| pipeline-healer | 1 | ACTIVE | v1.0.0 |
| pipeline-sentinel | 1 | ACTIVE | v1.0.0 |
| publisher | 58 | ACTIVE | Facebook only |
| series-outline | 15 | ACTIVE | |
| series-writer | 16 | ACTIVE | |
| video-analyser | 4 | ACTIVE | v1.2.0 |
| video-worker | 14 | ACTIVE | v2.1.0 |
| weekly-manager-report | 1 | ACTIVE | v1.1.0 |
| youtube-publisher | 15 | ACTIVE | v1.5.0 (verify deployed — post_publish bug fix) |

---

## PLATFORM STATUS — LIVE

| Platform | Publisher | Ever published | Profiles exist | Notes |
|---|---|---|---|---|
| Facebook | ✅ | ✅ 374 posts | NY + PP | Working end-to-end |
| YouTube | ✅ v1.5.0 | ⚠️ 1 post | NY + PP | post_publish bug in deployed version — confirm v1.5.0 deployed |
| LinkedIn | ✅ deployed | ❌ never | ❌ none | No publish profiles. Manual tokens needed. Community Mgmt API pending |
| Instagram | ✅ v1.0.0 | ❌ never | ❌ none | FB pages not linked to IG Business accounts — fix in FB Business Manager |

---

## PIPELINE HEALTH — VERIFIED 14 Apr 2026

| Metric | Value | Status |
|---|---|---|
| Posts published last 7 days | 25 | ✅ Healthy |
| Drafts needing review | 0 | ✅ Clean |
| Stuck AI jobs (>2h) | 0 | ✅ Clean |
| Open incidents (CRITICAL) | 1 | CFW no_drafts_48h — expected |
| Active cron jobs | 39 | +1 instagram-publisher |
| Topic score weights | 2 | NDIS Yarns — seeded |

---

## BRIEF STATUS — 14 Apr 2026

| Brief | Status | Notes |
|---|---|---|
| 038 — format advisor bias | ✅ COMPLETE | ai-worker v2.8.0 deployed |
| 039 — instagram-publisher | ✅ BUILT, ⚠️ BLOCKED | Publisher deployed, cron active. BLOCKED: FB pages not linked to IG Business accounts |
| 040 — YouTube fix + LinkedIn | 🔲 PENDING | PK gathering manual tokens. Run after tokens collected |
| 041 — CFW all 4 platforms | 🔲 PENDING | Run after 040 complete and tokens gathered |

---

## MANUAL ACTIONS REQUIRED (PK)

### Priority 1 — Instagram Business account linking
Neither NDIS Yarns nor Property Pulse Facebook pages have a linked Instagram Business account.
The instagram-publisher is ready but cannot publish without these links.

**Steps:**
1. Go to [business.facebook.com](https://business.facebook.com)
2. Select NDIS Yarns Facebook Page → Settings → Instagram → Connect Account
3. Repeat for Property Pulse Facebook Page
4. Once linked, the Graph API will return `instagram_business_account.id`
5. Re-run Brief 039 Task 1a to retrieve IDs and insert publish profiles

### Priority 2 — LinkedIn tokens (for Brief 040)
See Brief 040 Task 4 for exact steps. Need for NDIS Yarns, Property Pulse, CFW.

### Priority 3 — CFW tokens (for Brief 041)
Facebook, LinkedIn, Instagram, YouTube tokens for CFW.
See Brief 041 MANUAL SETUP section.

### Priority 4 — LinkedIn portal OAuth fix
- Set `LINKEDIN_OAUTH_ENABLED=false` in portal Vercel env (currently true, causing OAuth errors)
- Update redirect URI in LinkedIn Developer Portal from `dashboard.invegent.com` → `portal.invegent.com`

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Days |
|---|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 | ~1821d |
| YouTube | Property Pulse | 2 Apr 2031 | ~1816d |
| Facebook | NDIS-Yarns | 31 May 2026 | ~47d ⚠️ |
| Facebook | Property Pulse | 5 Jun 2026 | ~52d ⚠️ |

---

## EXTERNAL GATES

| Gate | Status | Action |
|---|---|---|
| Meta App Review | Business verification "In Review" | Do NOT edit BM. Contact developer support if stuck after 27 Apr |
| LinkedIn Community Management API | "1 of 2. Access Form Review" | Evaluate Late.dev middleware if still pending 13 May 2026 |
| Legal review (L001) | Not started | Hard gate before first external client signs |

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| IG Business accounts not linked to FB pages | HIGH | PK action required in Facebook Business Manager |
| LinkedIn OAUTH_ENABLED=true in portal but API not approved | MED | Set to false in Vercel portal env |
| LinkedIn redirect URI wrong in dev portal | MED | Update to portal.invegent.com |
| CFW empty shell | EXPECTED | Acceptance test after platform tokens configured |
| Facebook tokens expiring ~47-52 days | MED | Refresh early June |
| YouTube post_publish bug | LOW | Confirm v1.5.0 deployed (Brief 040 Task 1) |
| 2 HeyGen intro items stuck pending (Apr 9) | LOW | Waiting on avatar builds |
| Bundler topic weight wiring | LOW | Wire when bundler next touched |

---

## WHAT IS NEXT

1. **PK: Link Instagram Business accounts** to NDIS Yarns + Property Pulse Facebook pages in Business Manager
2. **PK: Generate LinkedIn tokens** for NY, PP, CFW (Brief 040 Task 4 instructions)
3. **Run Brief 040** — YouTube post_publish fix + LinkedIn profiles
4. **PK: Gather CFW tokens** for all 4 platforms (Brief 041 MANUAL SETUP)
5. **Run Brief 041** — CFW platform configuration + acceptance test
6. **Fix portal LinkedIn OAuth** — set LINKEDIN_OAUTH_ENABLED=false in Vercel + fix redirect URI
7. **Facebook token refresh** — early June
