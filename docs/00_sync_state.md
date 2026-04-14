# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-14 (Major platform expansion day — Facebook, Instagram, LinkedIn all configured)
> Written by: PK + Claude reconciliation

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. Query k schema before working on any table: `SELECT * FROM k.vw_table_summary WHERE schema_name='x' AND table_name='y'`
3. Do NOT fall into discovery mode.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
**Gate to first external client conversation is OPEN.**
**CFW is the first client. All 4 platforms required.**

---

## VERCEL DEPLOYMENTS

| App | Domain | Status | Last deploy |
|---|---|---|---|
| invegent-dashboard | dashboard.invegent.com | READY | 13 Apr |
| invegent-portal | portal.invegent.com | READY | 13 Apr |
| invegent-web | invegent.com | READY | 13 Apr |

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Version | Status | Notes |
|---|---|---|---|
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
| heygen-worker | 2 | ACTIVE | v1.1.0 |
| image-worker | 37 | ACTIVE | v3.9.2 |
| ingest | 95 | ACTIVE | |
| insights-feedback | 1 | ACTIVE | v1.0.0 — daily 3:30am UTC |
| insights-worker | 32 | ACTIVE | v14.0.0 |
| instagram-publisher | 1 | ACTIVE | v1.0.0 — cron job 53, every 15min |
| linkedin-publisher | 15 | ACTIVE | dormant — no direct profiles, waiting on API |
| linkedin-zapier-publisher | 1 | ACTIVE | v1.0.0 — NEW 14 Apr — cron every 20min |
| pipeline-diagnostician | 1 | ACTIVE | v1.0.0 |
| pipeline-healer | 1 | ACTIVE | v1.0.0 |
| pipeline-sentinel | 1 | ACTIVE | v1.0.0 |
| publisher | 58 | ACTIVE | Facebook |
| series-outline | 15 | ACTIVE | |
| series-writer | 16 | ACTIVE | |
| video-analyser | 4 | ACTIVE | v1.2.0 |
| video-worker | 14 | ACTIVE | v2.1.0 |
| weekly-manager-report | 1 | ACTIVE | v1.1.0 |
| youtube-publisher | 15 | ACTIVE | v1.5.0 — post_publish bug fixed |

---

## PLATFORM STATUS — ALL CLIENTS

| Platform | NDIS Yarns | Property Pulse | Care For Welfare | Notes |
|---|---|---|---|---|
| Facebook | ✅ token set | ✅ token set | ✅ token set | All updated with IG-capable tokens |
| Instagram | ✅ IG ID set | ✅ IG ID set | ✅ IG ID set | instagram-publisher running every 15min |
| LinkedIn | ✅ Zapier | ✅ Zapier | ✅ Zapier | linkedin-zapier-publisher running every 20min |
| YouTube | ✅ OAuth | ✅ OAuth | ❌ needs token | CFW needs YouTube OAuth setup |

---

## PIPELINE HEALTH — 14 Apr 2026

| Metric | Value | Status |
|---|---|---|
| Posts published last 7 days | 25 | ✅ Healthy |
| LinkedIn queue items ready | 3 | ✅ Will fire on next cron cycle |
| Stuck AI jobs | 0 | ✅ Clean |
| Active cron jobs | 40 | +1 linkedin-zapier-publisher |

---

## KEY SCHEMA CHANGES TODAY

- `m.post_publish_queue` unique index widened from `(post_draft_id)` to `(post_draft_id, platform)` — enables multi-platform queue items per draft
- `public.crosspost_facebook_to_linkedin()` SECURITY DEFINER function created — copies approved FB drafts to LinkedIn queue
- `public.upsert_publish_profile()` SECURITY DEFINER function created — reusable profile upsert helper

---

## ZAPIER LINKEDIN BRIDGE

| Brand | Webhook URL | Org URN | Zap status |
|---|---|---|---|
| NDIS Yarns | hooks.zapier.com/.../u7nkjq3/ | urn:li:organization:112982689 | Published ✅ |
| Property Pulse | hooks.zapier.com/.../u7nav0s/ | urn:li:organization:112999127 | Published ✅ |
| Care For Welfare | hooks.zapier.com/.../u7ngjbh/ | urn:li:organization:74152188 | Published ✅ |
| Invegent | hooks.zapier.com/.../u7nws8p/ | urn:li:organization:111966452 | Published ✅ — no client record yet |

**Rollback:** When Community Management API approved → replace webhook URLs with real tokens → disable zapier cron → direct linkedin-publisher takes over.

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Days |
|---|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 | ~1821d |
| YouTube | Property Pulse | 2 Apr 2031 | ~1816d |
| Facebook | NDIS-Yarns | 31 May 2026 | ~47d ⚠️ |
| Facebook | Property Pulse | 5 Jun 2026 | ~52d ⚠️ |
| Facebook | Care For Welfare | ~Jun 2026 | ~52d ⚠️ |

---

## EXTERNAL GATES

| Gate | Status | Action |
|---|---|---|
| Meta App Review | Business verification In Review | Do NOT edit BM. Contact dev support if stuck after 27 Apr |
| LinkedIn Community Management API | In Review | Evaluate Late.dev if still pending 13 May 2026 |
| Legal review (L001) | Not started | Hard gate before first external client signs |

---

## WHAT IS NEXT

1. **Check LinkedIn pages** — 3 queue items will fire on next cron (~20min). Verify posts appear on NDIS Yarns, PP, CFW LinkedIn pages.
2. **CFW + Invegent brand setup** — one session. Create client records, content scope, AI profiles, feeds, YouTube token for CFW. Then CFW acceptance test.
3. **Brief 043 — Subscription register** — dashboard page for all paid services. Run after CFW live.
4. **Facebook token refresh** — NDIS Yarns + PP + CFW all expiring ~May/Jun. Refresh early June.
5. **LinkedIn OAuth redirect URI** — update in LinkedIn dev portal from dashboard.invegent.com to portal.invegent.com.
6. **Set LINKEDIN_OAUTH_ENABLED=false** in portal Vercel env (currently true, shows broken button).

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| CFW YouTube token missing | HIGH | Setup in CFW+Invegent session |
| LinkedIn portal OAuth enabled but broken | MED | Set LINKEDIN_OAUTH_ENABLED=false in Vercel |
| LinkedIn redirect URI wrong | MED | Update to portal.invegent.com in LinkedIn dev portal |
| Bundler not reading topic weights | LOW | Wire when bundler next touched |
| HeyGen avatar builds pending | LOW | PK to trigger builds |
