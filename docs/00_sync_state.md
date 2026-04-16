# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-16 (End-of-session full reconciliation — 16 Apr session)
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

**Root cause of zero avatar/video drafts identified and fixed:** ai-worker had no content_type_prompt rows for Instagram, LinkedIn, or YouTube — format advisor never selected video formats. Now fixed. First video_short_avatar, video_short_kinetic, and video_short_stat drafts should appear within the next pipeline run.

**CFW and Invegent content_type_prompts:** Pending — needs a dedicated content session per client before writing prompts.

---

## RECENT SESSIONS — KEY BUILDS

### 16 Apr 2026 — Issues cleanup + prompts + Meta + strategic review
**Issues resolved:**
- Token alert platform-agnostic ✅ — `check_token_expiry()` rewritten: `WHERE pp.token_expires_at IS NOT NULL` covers all platforms
- Deprecated feeds stale is_enabled ✅ — 15 rows in `c.client_source` set to `is_enabled=false`. 0 remaining stale.
- PP LinkedIn logo ✅ — set directly in LinkedIn company page
- NDIS Yarns LinkedIn logo ✅ — confirmed
- LinkedIn portal OAuth ✅ — code already correct, `LINKEDIN_OAUTH_ENABLED` env var absent in Vercel portal
- LinkedIn redirect URI ✅ — already correct at `portal.invegent.com/api/connect/linkedin/callback`

**Content type prompts — 24 changes:**
- Facebook output_schema_hint updated for both clients (all 3 job types): video formats added to allowed list (video_short_avatar, video_short_kinetic, video_short_stat)
- 18 new rows: Instagram (3 × 2), LinkedIn (3 × 2), YouTube (3 × 2) for NDIS Yarns and Property Pulse
- LinkedIn: professional audience, sector intelligence / CPA analyst angle — not just tone but content angle
- Instagram: full spec, visual-first, hashtags field, warm community (NY) / punchy investor (PP)
- YouTube: video-only, Hook/Body/CTA script structure, narration_text always required

**Meta business verification progress:**
- 2FA block cleared — 3 unclaimed accounts removed/downgraded, now 0 out of 1 admin needing 2FA
- Shrishti invited as backup admin: s.sharma@careforwelfare.com.au (invite pending acceptance)
- invegent.com domain added to Meta Business Portfolio — DNS TXT record added to CrazyDomains (`facebook-domain-verification=xan3u879zi4z2xv32y2im4lguec2r6`), propagation pending
- Business verification status: In Review, unblocked

**Strategic discussions (no builds, decisions logged):**
- RSS.app discovery pipeline concept: multi-source types (URLs, keywords, Facebook pages, Reddit, Google News, YouTube, Twitter), seed → queue → result architecture, Pro plan ($100/mo) for API access
- Content monetisation: NDIS Yarns, Property Pulse, Invegent as media properties not just proof-of-concept clients
- Multi-lens review (CEO/CFO/CTO/Sales/Ops/Auditor): key themes — gap between built and validated, external client conversation not started, 30 NDIS Yarns followers is a distribution problem
- Dashboard UI gaps identified: D118–D124 logged (Voice & Formats, Avatars, Approval Patterns, Compliance Rules, Digest Policy, Format Library, Boost Config)

**Decisions logged:** D118–D124 in `docs/06_decisions.md`

### 16 Apr 2026 — Dashboard fixes + subscription register (earlier in same day)
- Overview approve/reject bug fixed: `DraftActionButtons.tsx` client component using `fetch` with JSON body
- Schedule grid redesigned: unified all-platform grid (one view, platform icons per cell)
- `k.subscription_register` + `/system/subscriptions` page built and live (Brief 043 ✅ COMPLETE)
- Subscription register seeded: Supabase, Vercel, Creatomate, Zapier, Claude API, OpenAI, Resend, HeyGen, GitHub, Google Workspace
- Memory + docs full reconciliation: 10-session audit, D114–D117 added

### 15 Apr 2026 — Pipeline audit + feed management
- Full audit: 40 Edge Functions, 39 crons (6 dead crons removed)
- Auth standardised: 12 functions redeployed --no-verify-jwt
- publisher_lock_queue_v1 platform filter fixed → LinkedIn live
- Token expiry alerter: `public.check_token_expiry()` daily 8:05am AEST
- PP Facebook token refreshed (expires 14 Jun 2026)
- Feed management UI complete (Briefs 049–052)
- First PP LinkedIn post published

### 14 Apr 2026 — Biggest build day
- 4 clients, 5 platforms fully live
- instagram-publisher v1.0.0, linkedin-zapier-publisher v1.0.0, wordpress-publisher v1.0.0
- CFW careforwelfare.com.au SEO publishing active
- Invegent brand client created (93494a09)
- D101–D113 logged

---

## INFRASTRUCTURE STATE

| Metric | Value |
|---|---|
| Edge Functions | 40 |
| Active cron jobs | 39 |
| Active feeds | 31 |
| Deprecated feeds | 20 (stale is_enabled cleanup done 16 Apr — 0 stale remaining) |
| content_type_prompt rows | 24 (NY + PP across 4 platforms × 3 job types) |

---

## AVATAR STATE — NDIS YARNS + PROPERTY PULSE

All 28 avatar rows have `avatar_gen_status = 'empty'`. HeyGen IDs are assigned correctly. This status does NOT block heygen-worker — worker queries by `is_active = true` and uses heygen_avatar_id directly. Status 'empty' means gen-status tracking was not updated after HeyGen completion, not that avatars are missing.

**Real blocker was:** missing content_type_prompts for YouTube/Instagram/LinkedIn → format advisor never selected video_short_avatar → zero video drafts → heygen-worker had nothing to process. Fixed 16 Apr.

**Next expected:** video_short_avatar drafts should appear within the next ai-worker run now that prompts exist for all platforms.

---

## FEED MANAGEMENT ARCHITECTURE

**Two pages, two roles:**
- `/feeds` — global feed pool. Vertical grouping. Assign to multiple clients. Deactivate globally. Uses `k.vw_feed_intelligence`.
- Clients → Feeds tab — per-client. Flat list. Unassign only.

**Key rules:**
- `c.client_source` rows are NEVER deleted — only `is_enabled = false`
- Feed status: `active`, `paused`, `deprecated` only (not 'inactive' — check constraint violation)
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

`public.check_token_expiry()` runs daily 8:05am AEST. Now platform-agnostic (fixed 16 Apr). Writes to `m.token_expiry_alert`. Dashboard banners at 30d warning / 14d critical.

---

## META BUSINESS VERIFICATION — CURRENT STATE (16 Apr 2026)

| Item | Status |
|---|---|
| 2FA block | ✅ Cleared — 0 out of 1 admin needing 2FA |
| Unclaimed accounts | ✅ Downgraded to partial/basic access |
| Shrishti backup admin | ⏳ Invite sent to s.sharma@careforwelfare.com.au — pending acceptance + 2FA setup |
| invegent.com domain | ⏳ DNS TXT record added to CrazyDomains — propagating. Click Verify domain when resolved. |
| Business verification | ⏳ In Review — unblocked, awaiting Meta decision |
| App Review | ⏳ In Review — contact dev support if stuck after 27 Apr 2026 |

---

## EXTERNAL GATES

| Gate | Status | Next action |
|---|---|---|
| Meta App Review | Business verification In Review — 2FA unblocked, domain pending | Click Verify domain once DNS propagates |
| LinkedIn Community Management API | In Review | Evaluate Late.dev if still pending 13 May |
| Legal review (L001) | Not started | Hard gate before first external client signs. Deferred until advertising Invegent starts. |

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
1. **D118 — Voice & Formats page** ← NEXT BUILD SESSION
2. **D119 — Avatar Management page**
3. **D122 — Client Digest Policy UI**
4. **B5 — Weekly manager report email** — Sunday cron via Resend
5. **Publisher schedule wiring** — `c.client_publish_schedule` → publisher assigns `scheduled_for`
6. **Brief 046** — invegent.com blog section (Supabase → Next.js ISR)
7. **D120 — Auto-Approval Patterns** (Performance tab)
8. **D121 — Compliance Rules UI** (Compliance tab)
9. **D123 — Format Library UI** (System tab)
10. **D124 — Boost Configuration UI** (Phase 3.4 — Meta Standard Access dependency)
11. **RSS.app discovery pipeline** — trigger: first external client or new vertical

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| CFW WordPress username is 'admin' | LOW | Deferred — ICE Publisher app password live and working, low risk |
| Bundler not reading topic weights | LOW | Deferred — all weights 1.0, no insights data yet. Wire when insights-feedback loop verified. |
| invegent.com domain verification | MED | DNS TXT propagating — click Verify domain when resolved |
| Shrishti backup admin pending | LOW | She needs to accept invite and enable 2FA |
| CFW + Invegent content_type_prompts missing | MED | Needs CFW content session (operational) before writing prompts |
| 4 TBC subscription costs | LOW | Vercel, HeyGen, Claude Max, OpenAI ChatGPT — confirm and update register |
| NDIS Yarns 30 followers | HIGH (strategic) | Distribution problem not content quality — needs active seeding strategy |

---

## PENDING DECISIONS QUICK REFERENCE

See `docs/06_decisions.md` for full detail on all pending items.

**Next build session priority:**
- D118 — Voice & Formats page (Clients tab)
- D119 — Avatar Management page (Clients tab)
- D122 — Client Digest Policy UI (Clients tab)

**Phase 3 dashboard builds:**
- D120 — Auto-Approval Patterns
- D121 — Compliance Rules UI
- D123 — Format Library UI

**Phase 3.4:**
- D124 — Boost Configuration UI (Meta Standard Access dependency)

**RSS.app discovery pipeline:**
- Concept fully designed. Pro plan ($100 AUD/mo) for API access. 3 DB tables + 1 Edge Function + 1 cron. 8-10 hours Claude Code. Trigger: first external client or new vertical.
