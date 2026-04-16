# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-16 (D118/D119/D122 build session)
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
**4 clients, 14 publish profiles, 5 platforms, 39 cron jobs, 40 Edge Functions.**

---

## ALL CLIENTS — FULL STATE

| Client | client_id | Verticals | Feeds | AI | Platforms | Website |
|---|---|---|---|---|---|---|
| NDIS Yarns | fb98a472 | NDIS, AU Disability Policy | 17 | active | FB ✅ IG ✅ LI ✅ YT ✅ | none |
| Property Pulse | 4036a6b5 | AU Property ×3 | 20+ | active | FB ✅ IG ✅ LI ✅ YT ✅ | none |
| Care For Welfare | 3eca32aa | NDIS, AU Disability Policy | 15 | active | FB ✅ IG ✅ LI ✅ WP ✅ | careforwelfare.com.au |
| Invegent | 93494a09 | AI & Automation, Social Media, Content Marketing | 5 | active | FB ✅ IG ✅ LI ✅ | invegent.com (brief 046 pending) |

---

## PLATFORM STATUS — ALL CLIENTS

| Platform | Publisher | NY | PP | CFW | Invegent | Notes |
|---|---|---|---|---|---|---|
| Facebook | publisher v1.6.0 | ✅ | ✅ | ✅ | ✅ | 375+ posts. |
| Instagram | instagram-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | 0 published — content_type_prompts now live, first drafts imminent |
| LinkedIn | linkedin-zapier-publisher v1.0.0 | ✅ | ✅ | ✅ | ✅ | LIVE. First PP post published 15 Apr. Prompts now live. |
| YouTube | youtube-publisher v1.5.0 | ✅ | ✅ | ❌ future | ❌ future | content_type_prompts now live, first video drafts imminent |
| WordPress | wordpress-publisher v1.0.0 | ❌ | ❌ | ✅ active | ❌ brief 046 | CFW pipeline generating |

---

## CONTENT TYPE PROMPTS — COVERAGE STATE (as of 16 Apr 2026)

All 3 job types (rewrite_v1, synth_bundle_v1, promo_v1) now exist for all active platforms for NDIS Yarns and Property Pulse.

| Platform | NDIS Yarns | Property Pulse | CFW | Invegent |
|---|---|---|---|---|
| Facebook | ✅ 3 job types (updated — video formats added) | ✅ 3 job types (updated) | ❌ pending | ❌ pending |
| Instagram | ✅ 3 job types (NEW 16 Apr) | ✅ 3 job types (NEW 16 Apr) | ❌ pending | ❌ pending |
| LinkedIn | ✅ 3 job types (NEW 16 Apr — professional angle) | ✅ 3 job types (NEW 16 Apr — CPA/investor angle) | ❌ pending | ❌ pending |
| YouTube | ✅ 3 job types (NEW 16 Apr — video script format) | ✅ 3 job types (NEW 16 Apr) | ❌ future | ❌ future |

**CFW and Invegent content_type_prompts:** Pending — needs a dedicated content session per client before writing prompts.

---

## DASHBOARD — CLIENTS TAB STATE (as of 16 Apr 2026)

Clients page tabs: `overview | profile | voice | digest | connect | feeds | schedule | avatars`

| Tab | Status | Description |
|---|---|---|
| overview | ✅ Live | Platform publish profiles per client |
| profile | ✅ Live | Brand profile + platform profiles + legacy prompt view |
| voice | ✅ NEW 16 Apr | Voice & Formats — prompt editor per platform/job type, avatar roster |
| digest | ✅ NEW 16 Apr | Digest Policy — mode, volume, permissiveness toggles |
| connect | ✅ Live | OAuth connection management |
| feeds | ✅ Live | Per-client feed assignment |
| schedule | ✅ Live | Unified all-platform schedule grid |
| avatars | ✅ Live (enhanced 16 Apr) | Avatar cast — gen_status badges, deactivate toggle, Poll HeyGen button |

**New Supabase functions (16 Apr build):**
- `public.upsert_content_type_prompt()` — SECURITY DEFINER INSERT/UPDATE for `c.content_type_prompt`
- `public.toggle_brand_stakeholder_active()` — SECURITY DEFINER toggle for `c.brand_stakeholder.is_active`
- `public.upsert_client_digest_policy()` — SECURITY DEFINER UPSERT for `c.client_digest_policy`
- `public.get_brand_avatars()` — patched to return `avatar_gen_status` (DROP + recreate required)

---

## RECENT SESSIONS — KEY BUILDS

### 16 Apr 2026 — D118 / D119 / D122 dashboard build
- **D118 Voice & Formats tab** ✅ BUILT — platform coverage grid (green/amber/grey dots per platform), job type tabs (Rewrite/Synthesis/Promo), monospace prompt editor with save + version tracking, output schema hint collapsible, avatar roster reference panel
- **D119 Avatar Management enhancements** ✅ BUILT — gen_status badges on each avatar slot (ready/generating/empty/failed), deactivate/reactivate toggle on each stakeholder role, Poll HeyGen status button invokes heygen-worker Edge Function
- **D122 Digest Policy tab** ✅ BUILT — strict/lenient mode selector, max/min items + window_hours number inputs, allow_paywalled / allow_blocked / allow_missing_body toggles, UPSERT handles clients with no existing policy row (CFW, Invegent show defaults)
- Operational/build split: CFW content session, content strategy, Brief 046 logged as operational (not build) work

### 16 Apr 2026 — Issues cleanup + prompts + Meta + strategic review (earlier)
**Issues resolved:**
- Token alert platform-agnostic ✅
- Deprecated feeds stale is_enabled ✅
- PP LinkedIn logo ✅, NDIS Yarns LinkedIn logo ✅
- LinkedIn portal OAuth ✅, LinkedIn redirect URI ✅

**Content type prompts — 24 changes:**
- Facebook video formats added to schema hints for both clients
- 18 new rows: Instagram (3 × 2), LinkedIn (3 × 2), YouTube (3 × 2) for NDIS Yarns and Property Pulse

**Meta business verification progress:**
- 2FA block cleared. Shrishti invited as backup admin. invegent.com domain in Meta — DNS TXT propagating.
- Business verification + App Review: In Review.

### 16 Apr 2026 — Dashboard fixes + subscription register (earlier)
- Overview approve/reject bug fixed
- Schedule grid unified all-platform view
- `k.subscription_register` + `/system/subscriptions` ✅

### 15 Apr 2026 — Pipeline audit + feed management
- Full audit: 40 Edge Functions, 39 crons (6 dead crons removed)
- Auth standardised, LinkedIn cron conflict fixed, token alerter live
- Feed management UI complete (Briefs 049–052), first PP LinkedIn post published

### 14 Apr 2026 — Biggest build day
- 4 clients, 5 platforms fully live, D101–D113 logged

---

## INFRASTRUCTURE STATE

| Metric | Value |
|---|---|
| Edge Functions | 40 |
| Active cron jobs | 39 |
| Active feeds | 31 |
| Deprecated feeds | 20 |
| content_type_prompt rows | 24 (NY + PP across 4 platforms × 3 job types) |

---

## AVATAR STATE — NDIS YARNS + PROPERTY PULSE

All 28 avatar rows have `avatar_gen_status = 'empty'`. HeyGen IDs are assigned correctly. Status 'empty' does NOT block heygen-worker — worker uses heygen_avatar_id directly. Real blocker was missing prompts (fixed 16 Apr). First video drafts expected within next ai-worker run.

---

## FEED MANAGEMENT ARCHITECTURE

**Two pages, two roles:**
- `/feeds` — global feed pool. Vertical grouping. Assign to multiple clients. Deactivate globally.
- Clients → Feeds tab — per-client. Flat list. Unassign only.

**Key rules:**
- `c.client_source` rows are NEVER deleted — only `is_enabled = false`
- Feed status: `active`, `paused`, `deprecated` only
- All feed DML → SECURITY DEFINER functions in public schema. exec_sql is READ-ONLY on c/f schemas.

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
| Invegent | invegent.com | — | — | — | Brief 046 pending |

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
| Resend | $0 (free tier) | ✅ Active |
| GitHub | $0 (free) | ✅ Active |
| Vercel | TBC | ❓ Confirm plan |
| HeyGen | TBC | ❓ Confirm plan |
| Claude Max | TBC | ❓ Confirm cost |
| OpenAI ChatGPT | TBC | ❓ Confirm status |
| **Confirmed fixed total** | **~$214 AUD/mo** | 4 TBC items unresolved |

---

## WHAT IS NEXT

### OPERATIONAL WORK (human-led, not build sessions)
1. **Click "Verify domain"** on Meta → Brand Safety → invegent.com once DNS TXT propagates
2. **Shrishti to accept** Meta Business invite and set up 2FA
3. **CFW content session** — review first CFW drafts, tune AI profile, write content_type_prompts
4. **Content strategy session** — schedule + series plan for all 4 brands
5. **Confirm 4 TBC subscription costs** — Vercel, HeyGen, Claude Max, OpenAI ChatGPT
6. **Facebook token refresh** — NY, CFW, Invegent tokens expiring May/Jun (auto-alerter will fire ~1 May)

### BUILD WORK (priority order)
1. **B5 — Weekly manager report email** — Sunday cron via Resend
2. **Publisher schedule wiring** — `c.client_publish_schedule` → publisher assigns `scheduled_for`
3. **Brief 046** — invegent.com blog section (Supabase → Next.js ISR)
4. **D120 — Auto-Approval Patterns** (Performance tab)
5. **D121 — Compliance Rules UI** (Compliance tab)
6. **D123 — Format Library UI** (System tab)
7. **D124 — Boost Configuration UI** (Phase 3.4 — Meta Standard Access dependency)
8. **RSS.app discovery pipeline** — trigger: first external client or new vertical

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

---

## PENDING DECISIONS QUICK REFERENCE

See `docs/06_decisions.md` for full detail.

**D118 / D119 / D122** — ✅ BUILT 16 Apr

**Phase 3 dashboard builds (remaining):**
- D120 — Auto-Approval Patterns (Performance tab)
- D121 — Compliance Rules UI (Compliance tab)
- D123 — Format Library UI (System tab)

**Phase 3.4:**
- D124 — Boost Configuration UI (Meta Standard Access dependency)

**RSS.app discovery pipeline:**
- Concept fully designed. Pro plan ($100 AUD/mo). 3 DB tables + 1 Edge Function + 1 cron. Trigger: first external client or new vertical.
