# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-14 (Session close — all 4 clients fully configured)
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
**All 4 clients configured and publishing. Content accumulating across Facebook, Instagram, LinkedIn.**

---

## ALL CLIENTS — FULL STATE

| Client | client_id | Verticals | Feeds | AI Profile | Platforms |
|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | NDIS, AU Disability Policy | 17 | active | FB, IG, LI, YT |
| Property Pulse | 4036a6b5 | AU Property ×3 | 20 | active | FB, IG, LI, YT |
| Care For Welfare | 3eca32aa | NDIS, AU Disability Policy | 17 | active | FB, IG, LI |
| Invegent | 93494a09 | AI & Automation, Social Media, Content Marketing | 5 | active | FB, IG, LI |

**New today:** Care For Welfare + Invegent fully configured. Invegent client_id: `93494a09-cc89-41d1-b364-cb63983063a6`

---

## PLATFORM STATUS

| Platform | Publisher | NY | PP | CFW | Invegent |
|---|---|---|---|---|---|
| Facebook | publisher v1.3.x | ✅ 374 posts | ✅ working | ✅ configured | ✅ configured |
| Instagram | instagram-publisher v1.0.0 | ✅ configured | ✅ configured | ✅ configured | ✅ configured |
| LinkedIn | linkedin-zapier-publisher v1.0.0 | ✅ Zapier | ✅ Zapier | ✅ Zapier | ✅ Zapier |
| YouTube | youtube-publisher v1.5.0 | ✅ OAuth | ✅ OAuth | ❌ future | ❌ future |

**Instagram:** No posts yet — needs approved drafts with image_url. NDIS Yarns image generation stopped ~20 Mar (ai-worker v2.8.0 fix in progress). PP image formats working.
**LinkedIn:** 3 queue items loaded, first posts expected within 20min of session end.
**Instagram + LinkedIn zero published** — both pipelines started today, content needs to flow through.

---

## ZAPIER LINKEDIN BRIDGE

| Brand | Org URN | Webhook (partial) |
|---|---|---|
| NDIS Yarns | urn:li:organization:112982689 | hooks.zapier.com/.../u7nkjq3/ |
| Property Pulse | urn:li:organization:112999127 | hooks.zapier.com/.../u7nav0s/ |
| Care For Welfare | urn:li:organization:74152188 | hooks.zapier.com/.../u7ngjbh/ |
| Invegent | urn:li:organization:111966452 | hooks.zapier.com/.../u7nws8p/ |

**Rollback plan:** When Community Management API approved → replace webhook URLs with real tokens → disable zapier cron → direct linkedin-publisher takes over automatically.

---

## NEW VERTICALS CREATED TODAY

| vertical_id | vertical_name | vertical_slug | domain |
|---|---|---|---|
| 15 | AI & Automation | ai-automation | Technology (13) |
| 16 | Social Media Strategy | social-media-strategy | Technology (13) |
| 17 | Content Marketing | content-marketing | Business & Finance (5) |

---

## NEW FEED SOURCES CREATED TODAY (Invegent)

| source_id | source_name |
|---|---|
| fe33f1c7 | TechCrunch AI |
| c498af1c | The Verge AI |
| e5f1dc41 | Marketing AI Institute |
| 35e0fe3a | Social Media Examiner |
| a70085c9 | Content Marketing Institute |

---

## KEY SCHEMA CHANGES TODAY

- `m.post_publish_queue` unique index widened: `(post_draft_id)` → `(post_draft_id, platform)` — enables multi-platform queue per draft
- `public.crosspost_facebook_to_linkedin()` SECURITY DEFINER — copies approved FB drafts to LinkedIn queue (runs inside linkedin-zapier-publisher)
- `public.upsert_publish_profile()` SECURITY DEFINER — reusable profile upsert helper
- 3 new content verticals (AI/Social/Content)
- Invegent client record created: `93494a09-cc89-41d1-b364-cb63983063a6`

---

## SUPABASE EDGE FUNCTIONS — LIVE

| Function | Version | Status | Notes |
|---|---|---|---|
| ai-worker | 73 | ACTIVE | v2.8.0 — format advisor preferred format bias |
| auto-approver | 30 | ACTIVE | v1.4.1 |
| instagram-publisher | 1 | ACTIVE | v1.0.0 — every 15min |
| linkedin-publisher | 15 | ACTIVE | dormant — waiting on Community Mgmt API |
| linkedin-zapier-publisher | 1 | ACTIVE | v1.0.0 — every 20min — NEW |
| publisher | 58 | ACTIVE | Facebook |
| youtube-publisher | 15 | ACTIVE | v1.5.0 |
| pipeline-sentinel | 1 | ACTIVE | every 15min |
| pipeline-healer | 1 | ACTIVE | every 15min offset |
| pipeline-diagnostician | 1 | ACTIVE | on-demand |
| weekly-manager-report | 1 | ACTIVE | Mon 7am AEST |
| client-weekly-summary | 1 | ACTIVE | Mon 7:30am AEST |
| insights-feedback | 1 | ACTIVE | daily 3:30am UTC |
| insights-worker | 32 | ACTIVE | v14.0.0 |
| image-worker | 37 | ACTIVE | v3.9.2 |
| video-worker | 14 | ACTIVE | v2.1.0 |
| ingest | 95 | ACTIVE | every 6h |
| content_fetch | 65 | ACTIVE | every 10min |

**Active cron jobs: 40**

---

## PIPELINE HEALTH — 14 Apr 2026

| Metric | Value | Status |
|---|---|---|
| Posts last 7 days | 24 | ✅ |
| Needs review | 0 | ✅ |
| Stuck AI jobs | 0 | ✅ |
| Open CRITICAL incidents | 1 | CFW no_drafts_48h — will clear once content flows |
| LinkedIn published | 0 | Expected — just started |
| Instagram published | 0 | Expected — needs image_url on drafts |

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Days |
|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ~1821d |
| YouTube | Property Pulse | 2 Apr 2031 | ~1816d |
| Facebook | NDIS Yarns | 31 May 2026 | ~47d ⚠️ |
| Facebook | Property Pulse | 5 Jun 2026 | ~52d ⚠️ |
| Facebook | Care For Welfare | ~Jun 2026 | ~52d ⚠️ |
| Facebook | Invegent | ~Jun 2026 | ~52d ⚠️ |

---

## EXTERNAL GATES

| Gate | Status | Next action |
|---|---|---|
| Meta App Review | Business verification In Review | Contact dev support if stuck after 27 Apr |
| LinkedIn Community Management API | In Review | Evaluate Late.dev if still pending 13 May |
| Legal review (L001) | Not started | Before first external client signs |

---

## WHAT IS NEXT

1. **Monitor LinkedIn + Instagram** — check all 4 brand pages over next 24-48h. Confirm posts appear.
2. **Iron out publication issues** — watch for stuck jobs, failed queue items, Zapier errors. Use Sentinel + dashboard.
3. **NDIS Yarns image generation** — ai-worker v2.8.0 format advisor fix deployed. Monitor if image_quote drafts now appear for NDIS Yarns.
4. **Brief 043 — Subscription register** — dashboard page for all paid services.
5. **Portal LinkedIn OAuth fix** — set LINKEDIN_OAUTH_ENABLED=false in Vercel portal env.
6. **LinkedIn redirect URI** — update in LinkedIn dev portal from dashboard.invegent.com → portal.invegent.com.
7. **Facebook token refresh** — all 4 clients expiring May/Jun. Refresh early June.
8. **CFW CRITICAL incident** — will auto-resolve once first draft generates for CFW (within 24h).
