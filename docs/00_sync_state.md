# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-16 (End-of-session full reconciliation — 16 Apr evening session)
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
**4 clients, 14 publish profiles, 5 platforms, 40 cron jobs, 41 Edge Functions.**

---

## ALL CLIENTS — FULL STATE

| Client | client_id | Verticals | Feeds | AI | Platforms | Website |
|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | NDIS, AU Disability Policy | 17+ | active | FB ✅ IG ✅ LI ✅ YT ✅ | none |
| Property Pulse | 4036a6b5 | AU Property ×3 | 20+ | active | FB ✅ IG ✅ LI ✅ YT ✅ | none |
| Care For Welfare | 3eca32aa | NDIS, AU Disability Policy | 15 | active | FB ✅ IG ✅ LI ✅ WP ✅ | careforwelfare.com.au |
| Invegent | 93494a09 | AI & Automation, Social Media, Content Marketing | 5 | active | FB ✅ IG ✅ LI ✅ | invegent.com ✅ blog live |

---

## PLATFORM STATUS — ALL CLIENTS

| Platform | Publisher | NY | PP | CFW | Invegent | Notes |
|---|---|---|---|---|---|---|
| Facebook | publisher v1.7.0 | ✅ | ✅ | ✅ | ✅ | 375+ posts. Schedule wiring live. |
| Instagram | instagram-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | 0 published — prompts live, first drafts imminent |
| LinkedIn | linkedin-zapier-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | LIVE. First PP post published 15 Apr. |
| YouTube | youtube-publisher v1.5.0 | ✅ | ✅ | ❌ future | ❌ future | prompts live, first video drafts imminent |
| WordPress | wordpress-publisher v1.0.0 | ❌ | ❌ | ✅ active | ❌ | CFW pipeline generating |

---

## CONTENT TYPE PROMPTS — COVERAGE STATE (as of 16 Apr 2026)

| Platform | NDIS Yarns | Property Pulse | CFW | Invegent |
|---|---|---|---|---|
| Facebook | ✅ 3 job types | ✅ 3 job types | ❌ pending | ❌ pending |
| Instagram | ✅ 3 job types | ✅ 3 job types | ❌ pending | ❌ pending |
| LinkedIn | ✅ 3 job types | ✅ 3 job types | ❌ pending | ❌ pending |
| YouTube | ✅ 3 job types | ✅ 3 job types | ❌ future | ❌ future |

**CFW and Invegent content_type_prompts:** Pending — needs a dedicated content session per client before writing prompts.

---

## DASHBOARD — CLIENTS TAB STATE (as of 16 Apr 2026)

Clients page tabs: `overview | profile | voice | digest | connect | feeds | schedule | avatars`

| Tab | Status | Description |
|---|---|---|
| overview | ✅ Live | Platform publish profiles per client |
| profile | ✅ Live | Brand profile + platform profiles |
| voice | ✅ BUILT 16 Apr | Voice & Formats — prompt editor per platform/job type + avatar roster |
| digest | ✅ BUILT 16 Apr | Digest Policy — mode, volume, permissiveness toggles |
| connect | ✅ Live | OAuth connection management |
| feeds | ✅ Live | Per-client feed assignment |
| schedule | ✅ Live | Unified all-platform schedule grid |
| avatars | ✅ ENHANCED 16 Apr | Avatar cast — gen_status badges, deactivate toggle, Poll HeyGen button |

---

## DASHBOARD — OTHER PAGES (as of 16 Apr 2026)

| Page | Location | Status |
|---|---|---|
| Approval Patterns | Performance → Approval Patterns tab | ✅ BUILT 16 Apr |
| Compliance Rules | Compliance → Rules tab | ✅ BUILT 16 Apr |
| Format Library | System → Format Library | ✅ BUILT 16 Apr |
| Subscriptions | System → Subscriptions | ✅ Live |
| Diagnostics | /diagnostics | ✅ Live |
| Weekly Manager Report | Email via Resend, Sunday 7am AEST | ✅ BUILT 16 Apr (B5) |

---

## RECENT SESSIONS — KEY BUILDS

### 16 Apr 2026 — Evening: RSS.app discovery pipeline
- **D125 — RSS.app Discovery Pipeline** ✅ LIVE
- `f.feed_discovery_seed` table created with migrations
- `feed-discovery` Edge Function v1.0.0 deployed (job #61, daily 8am AEST)
- RSSAPP_API_KEY stored in vault (format: `c_key:s_secret`)
- 9 seeds seeded and all provisioned: 5 NDIS keyword feeds + 3 property keyword feeds + 1 NDIS.gov.au URL feed
- 9 new rows in `f.feed_source` with `source_type_code = 'rss_app'`, all active
- Ingest-worker picks up new feeds automatically on next 6-hour run
- **Next step:** Assign new feeds to clients via Feeds page in dashboard

### 16 Apr 2026 — Afternoon: Dashboard UI gaps + pipeline builds
- **D118 Voice & Formats tab** ✅ — platform coverage grid, prompt editor, avatar roster
- **D119 Avatar enhancements** ✅ — gen_status badges, deactivate toggle, Poll HeyGen button
- **D120 Approval Patterns tab** ✅ — gate failures, per-client pass rates, weekly trend
- **D121 Compliance Rules UI** ✅ — view/edit/add rules, activate/deactivate toggle
- **D122 Digest Policy tab** ✅ — mode, volume, permissiveness — UPSERT handles missing rows
- **D123 Format Library** ✅ — buildable status, advisor descriptions, is_buildable toggle, conflict detection
- **B5 Weekly manager report** ✅ — Sunday 7am AEST via Resend, 10 parallel queries
- **Publisher schedule wiring** ✅ — publisher v1.7.0, `get_next_publish_slot()` live, verified with 2 queue items
- **Brief 046 invegent.com blog** ✅ — already existed, verified clean
- Operational/build split documented in sync state

### 16 Apr 2026 — Morning: Issues cleanup + prompts + Meta
- Token alert platform-agnostic ✅
- Deprecated feeds stale is_enabled ✅ (15 rows cleaned)
- 24 content_type_prompt changes: video formats + IG/LI/YT prompts for NY + PP
- Meta business verification unblocked, In Review

### 15 Apr 2026 — Pipeline audit
- 40 Edge Functions, 39 crons audited (6 dead removed)
- Auth standardised, LinkedIn cron conflict fixed
- Feed management UI complete (Briefs 049–052)

---

## INFRASTRUCTURE STATE

| Metric | Value |
|---|---|
| Edge Functions | 41 (feed-discovery added) |
| Active cron jobs | 40 (feed-discovery-daily job #61 added) |
| Active feeds | 40 (31 existing + 9 new rss_app discovery feeds) |
| Deprecated feeds | 20 |
| content_type_prompt rows | 24 (NY + PP across 4 platforms × 3 job types) |
| f.feed_discovery_seed rows | 9 (all provisioned) |

---

## RSS.APP DISCOVERY PIPELINE STATE

| Seed | Type | Vertical | Status | RSS.app Feed ID |
|---|---|---|---|---|
| NDIS Australia news | keyword | ndis | ✅ provisioned | toiBx3ZzzIKGId2L |
| NDIS policy updates | keyword | ndis | ✅ provisioned | tLgTnwFWGtaS0nyZ |
| NDIS funding news | keyword | ndis | ✅ provisioned | t785oYEIjEIy96ar |
| OT NDIS news | keyword | ndis | ✅ provisioned | t6PK2zcCG1nNnFUz |
| Disability support AU | keyword | ndis | ✅ provisioned | tBd3HCOMITfZkYkA |
| AU property market | keyword | property | ✅ provisioned | tMmfW7sCTutlGntE |
| RBA rates news | keyword | property | ✅ provisioned | tF5mt5p84ebf0PTY |
| AU real estate 2026 | keyword | property | ✅ provisioned | tj7kacCeDv797d7j |
| NDIS.gov.au news | url | ndis | ✅ provisioned | RIGrXDAHuYBRnDcT |

**To add more seeds:** `INSERT INTO f.feed_discovery_seed (seed_type, seed_value, region, vertical_slug, label) VALUES (...)`
Daily cron picks up `status = 'pending'` rows automatically at 8am AEST.

**RSSAPP_API_KEY format:** `c_key:s_secret` (key and secret joined with colon, stored as single vault secret)

---

## AVATAR STATE — NDIS YARNS + PROPERTY PULSE

All 28 avatar rows have `avatar_gen_status = 'empty'`. HeyGen IDs assigned correctly. Status 'empty' does NOT block heygen-worker. Real blocker was missing prompts (fixed 16 Apr). First video drafts expected within next ai-worker run.

---

## FEED MANAGEMENT ARCHITECTURE

**Three feed types now active:**
- Native RSS feeds — direct RSS/Atom URLs from publisher sites
- RSS.app feeds (`source_type_code = 'rss_app'`) — generated by RSS.app from keywords/URLs
- YouTube channel feeds — YouTube RSS via public RSS URL

**Key rules:**
- `c.client_source` rows are NEVER deleted — only `is_enabled = false`
- Feed status: `active`, `paused`, `deprecated` only
- All feed DML → SECURITY DEFINER functions in public schema
- `f.feed_discovery_seed` seeds → provisioned → `f.feed_source` → ingest-worker

---

## ZAPIER LINKEDIN BRIDGE

| Brand | Org URN | Webhook (partial) | Status |
|---|---|---|---|
| NDIS Yarns | urn:li:organization:112982689 | hooks.zapier.com/.../u7nkjq3/ | ✅ |
| Property Pulse | urn:li:organization:112999127 | hooks.zapier.com/.../u7nav0s/ | ✅ |
| Care For Welfare | urn:li:organization:74152188 | hooks.zapier.com/.../u7ngjbh/ | ✅ |
| Invegent | urn:li:organization:111966452 | hooks.zapier.com/.../u7nws8p/ | ✅ |

---

## WORDPRESS PUBLISHER

| Client | Site | Username | Secret | Category ID | Status |
|---|---|---|---|---|---|
| Care For Welfare | careforwelfare.com.au | admin | CFW_WP_APP_PASSWORD | 20 (NDIS News) | ACTIVE |
| Invegent | invegent.com | — | — | — | blog live via Next.js ISR |

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Alert |
|---|---|---|---|
| YouTube | NDIS Yarns | 7 Apr 2031 | ✅ |
| YouTube | Property Pulse | 2 Apr 2031 | ✅ |
| Facebook | NDIS Yarns | 31 May 2026 | ⚠️ Auto-alert fires ~1 May |
| Facebook | Property Pulse | 14 Jun 2026 | ✅ Refreshed 15 Apr |
| Facebook | Care For Welfare | ~Jun 2026 | ⚠️ Auto-alert at 30d |
| Facebook | Invegent | ~Jun 2026 | ⚠️ Auto-alert at 30d |

---

## META BUSINESS VERIFICATION — CURRENT STATE (16 Apr 2026)

| Item | Status |
|---|---|
| 2FA block | ✅ Cleared |
| Shrishti backup admin | ⏳ Invite sent — pending acceptance + 2FA |
| invegent.com domain | ⏳ DNS TXT propagating — click Verify domain when resolved |
| Business verification | ⏳ In Review |
| App Review | ⏳ In Review — contact dev support if stuck after 27 Apr 2026 |

---

## EXTERNAL GATES

| Gate | Status | Next action |
|---|---|---|
| Meta App Review | Business verification In Review | Click Verify domain once DNS propagates |
| LinkedIn Community Management API | In Review | Evaluate Late.dev if still pending 13 May |
| Legal review (L001) | Not started | Hard gate before first external client signs |

---

## SUBSCRIPTION REGISTER — CONFIRMED COSTS (as of 16 Apr 2026)

| Service | Monthly AUD | Status |
|---|---|---|
| Supabase Pro | $25 | ✅ Active |
| Creatomate Essential | ~$85 | ✅ Active |
| Zapier | ~$30 | ✅ Active |
| Google Workspace (2 users) | $74 | ✅ Active |
| RSS.app Pro | ~$100 | ✅ Active (upgraded 16 Apr) |
| Resend | $0 (free tier) | ✅ Active |
| GitHub | $0 (free) | ✅ Active |
| Vercel | TBC | ❓ Confirm plan |
| HeyGen | TBC | ❓ Confirm plan |
| Claude Max | TBC | ❓ Confirm cost |
| OpenAI ChatGPT | TBC | ❓ Confirm status |
| **Confirmed fixed total** | **~$314 AUD/mo** | 4 TBC items + RSS.app added |

---

## WHAT IS NEXT

### OPERATIONAL WORK (human-led, not build sessions)
1. **Assign 9 new RSS.app feeds** to clients via Feeds page (NDIS feeds → NY + CFW, property → PP)
2. **Fix advisor description conflicts** — Format Library page → animated_data + animated_text_reveal → edit out "NOT YET BUILDABLE" text
3. **Click "Verify domain"** on Meta → Brand Safety → invegent.com once DNS TXT propagates
4. **Shrishti to accept** Meta Business invite and set up 2FA
5. **CFW content session** — review first CFW drafts, tune AI profile, write content_type_prompts
6. **Content strategy session** — schedule + series plan for all 4 brands
7. **Confirm 4 TBC subscription costs** — Vercel, HeyGen, Claude Max, OpenAI ChatGPT (update subscription register)
8. **Facebook token refresh** — NY, CFW, Invegent tokens expiring May/Jun (auto-alerter will fire ~1 May)

### BUILD WORK (priority order)
1. **D124 — Boost Config UI** — hard dependency on Meta Standard Access. Not yet.
2. **Additional RSS.app seeds** — add more discovery seeds as new verticals or clients onboard
3. **RSS.app discovery dashboard page** — manage seeds, view provisioning status, add new seeds without SQL
4. **Cowork daily inbox task** — Gmail MCP inbox management (Phase 4)

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| CFW WordPress username is 'admin' | LOW | Deferred — low risk |
| Bundler not reading topic weights | LOW | Deferred — wire when insights feedback loop verified |
| invegent.com domain verification | MED | DNS TXT propagating — click Verify when resolved |
| Shrishti backup admin pending | LOW | She needs to accept invite + enable 2FA |
| CFW + Invegent content_type_prompts missing | MED | Needs CFW content session (operational) |
| 4 TBC subscription costs | LOW | Vercel, HeyGen, Claude Max, OpenAI ChatGPT |
| NDIS Yarns 30 followers | HIGH (strategic) | Distribution problem — needs active seeding strategy |
| animated_data + animated_text_reveal advisor conflict | MED | is_buildable=true but description says NOT YET BUILDABLE — fix in Format Library page |
| 9 new RSS.app feeds unassigned | MED | Assign to clients via Feeds page |

---

## PENDING DECISIONS QUICK REFERENCE

See `docs/06_decisions.md` for full detail.

**D118–D123** — ✅ ALL BUILT 16 Apr
**B5, Publisher schedule, Brief 046** — ✅ ALL BUILT 16 Apr
**D125 RSS.app Discovery Pipeline** — ✅ LIVE 16 Apr

**Remaining Phase 3 builds:**
- D124 — Boost Configuration UI (Meta Standard Access dependency)
- RSS.app discovery dashboard page (seed management UI)

**Phase 4:**
- Cowork daily inbox task
- Model router
- SaaS vs managed service evaluation
