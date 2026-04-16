# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D100 — See earlier commits

---

## D101 — Instagram Publishing via Graph API — Cross-post Pattern
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Build instagram-publisher as a cross-post function (queries post_draft directly, not queue-based). Uses same Facebook Page Access Token to publish to linked Instagram Business Account via Graph API.

**Key finding:** Instagram Business account must be linked to the Facebook Page in Facebook Business Manager before the Graph API returns an `instagram_business_account` field. The Graph API token also needs `instagram_basic` and `instagram_content_publish` permissions — added via "API setup with Facebook login" use case, not "API setup with Instagram login".

**Format routing:** image_quote/carousel → image post. video_short_* → Reels. text → skipped (Instagram does not support text-only).

**What was built:** instagram-publisher v1.0.0. Cron job 53 every 15min. Publish profiles for NDIS Yarns, Property Pulse, CFW, Invegent.

---

## D102 — LinkedIn Publishing via Zapier Webhook Bridge
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Route LinkedIn posts through Zapier as a temporary bridge while Community Management API (`w_organization_social`) is pending approval.

**Rollback:** When Community Management API approved → replace webhook URLs with real tokens → linkedin-zapier-publisher detects non-Zapier URL and routes correctly.

**Key fix:** `m.post_publish_queue` unique index widened from `(post_draft_id)` to `(post_draft_id, platform)` to support one draft being queued for multiple platforms.

**Zap configuration:** NDIS Yarns: u7nkjq3 | Property Pulse: u7nav0s | Care For Welfare: u7ngjbh | Invegent: u7nws8p

---

## D103 — Invegent as ICE Client
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Create Invegent as a full ICE client. client_id: `93494a09-cc89-41d1-b364-cb63983063a6`. New verticals: AI & Automation, Social Media Strategy, Content Marketing. AI tone: conversational, practical, curious. Platforms: FB, IG, LI (Zapier).

---

## D104 — Care For Welfare Full Pipeline Setup
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Configure CFW as a full ICE client. Clone NDIS Yarns content scope, create OT-specific AI profile, set profession_slug = occupational_therapy. Warmer tone than NDIS Yarns. Platforms: FB, IG, LI (Zapier), WP.

---

## D105 — WordPress Publishing for CFW Website SEO
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Publish approved CFW drafts to careforwelfare.com.au/ndis-news/ via WordPress REST API. Max 3 posts per 6-hour run. Yoast SEO handles meta. Mod_Security requires User-Agent: Mozilla/5.0 header.

**Credentials:** Username `admin`, secret `CFW_WP_APP_PASSWORD`, category ID 20.

---

## D106 — Platform Connections Dashboard — Dynamic Rendering
**Date:** 14 April 2026 | **Status:** ✅ Live

**Decision:** Both `/connect` page and Clients → Connect tab render platforms dynamically from `c.client_publish_profile`. LinkedIn profiles with page_access_token starting `https://hooks.zapier.com` show purple Zapier bridge badge.

---

## D107 — Full Pipeline Audit Methodology
**Date:** 15 April 2026 | **Status:** ✅ Complete

---

## D108 — Auth Standardisation: No-Verify-JWT + Vault Pattern
**Date:** 15 April 2026 | **Status:** ✅ Complete

**Decision:** All cron-called Edge Functions use `verify_jwt: false` + internal API key check. 12 functions redeployed --no-verify-jwt. Security posture unchanged.

---

## D109 — Publisher Platform Filter (publisher_lock_queue_v1)
**Date:** 15 April 2026 | **Status:** ✅ Fixed

**Decision:** Drop old 3-arg overload of `m.publisher_lock_queue_v1`. Only 4-arg version with `p_platform DEFAULT 'facebook'` remains.

---

## D110 — Token Expiry Alerter
**Date:** 15 April 2026 | **Status:** ✅ Live — platform-agnostic fix applied 16 Apr

**Decision:** `public.check_token_expiry()` runs daily 8:05am AEST. Writes to `m.token_expiry_alert`. Dashboard banners at 30d warning / 14d critical.

---

## D111 — Feed Management: Shared Signal Model
**Date:** 15 April 2026 | **Status:** ✅ Live

**Decision:** Feeds are shared signals. `c.client_source` rows NEVER deleted — only `is_enabled = false`. Feed status: `active`, `paused`, `deprecated` only.

---

## D112 — Feed DML via SECURITY DEFINER Functions
**Date:** 15 April 2026 | **Status:** ✅ Live

**Functions:** `public.feed_assign_client()`, `public.feed_unassign_from_client()`, `public.feed_deactivate()`

**Pattern:** exec_sql = SELECT only on c/f/t schemas. Any write → SECURITY DEFINER function in public schema.

---

## D113 — Feed UI Page Separation
**Date:** 15 April 2026 | **Status:** ✅ Live

**Decision:** `/feeds` = global pool. Clients → Feeds tab = per-client assignment only.

---

## D114 — Subscription Register
**Date:** 14 April 2026 | **Status:** ✅ Live

`k.subscription_register` + `/system/subscriptions`. RSS.app Pro added 16 Apr.

---

## D115 — AI Diagnostic System
**Date:** 2 April 2026 | **Status:** ✅ Live

Daily 6am AEST. `m.ai_diagnostic_report`. `/diagnostics` page.

---

## D116 — Compliance Review DML Fix
**Date:** 2 April 2026 | **Status:** ✅ Fixed

---

## D117 — k Schema Fully Documented
**Date:** 2 April 2026 | **Status:** ✅ Complete

---

## D118 — Voice & Formats Dashboard Page
**Date:** 16 April 2026 | **Status:** ✅ BUILT

**What was built:** Clients page → Voice & Formats tab. Platform coverage grid (4 cards, green/amber/grey dots), job type tabs (Rewrite/Synthesis/Promo), monospace prompt editor with version tracking, output schema hint collapsible, avatar roster reference panel. `public.upsert_content_type_prompt()` SECURITY DEFINER function.

---

## D119 — Avatar Management Dashboard Page
**Date:** 16 April 2026 | **Status:** ✅ BUILT

**What was built:** AvatarTab enhanced — `avatar_gen_status` badges (ready/empty/failed), deactivate/reactivate toggle per stakeholder, Poll HeyGen button invokes heygen-worker. `public.toggle_brand_stakeholder_active()` function. `get_brand_avatars()` patched to return gen_status.

---

## D120 — Auto-Approval Patterns Dashboard
**Date:** 16 April 2026 | **Status:** ✅ BUILT

**What was built:** Performance page → Approval Patterns tab (`?view=approvals`). Gate failure bar chart, per-client pass rate progress bars, weekly trend table, calibration note. Key finding: 100% of failures are `body_length` — prompts generating posts over the 1800 char limit.

---

## D121 — Compliance Rules Viewer/Editor
**Date:** 16 April 2026 | **Status:** ✅ BUILT

**What was built:** Compliance page → Rules inner tab. 23 rules grouped by vertical. Expand/collapse per rule. Inline edit for rule_name + rule_text. Activate/deactivate toggle. Add new rule form. `public.toggle_compliance_rule_active()` + `public.upsert_compliance_rule()` functions.

---

## D122 — Client Digest Policy UI
**Date:** 16 April 2026 | **Status:** ✅ BUILT

**What was built:** Clients page → Digest Policy tab. Strict/lenient mode selector, max/min items + window_hours inputs, three permissiveness toggles. UPSERT handles CFW + Invegent which have no existing policy row. `public.upsert_client_digest_policy()` function.

---

## D123 — Format Library UI
**Date:** 16 April 2026 | **Status:** ✅ BUILT

**What was built:** System → Format Library page. 21 formats grouped by category. is_buildable toggle, advisor description inline edit. Conflict detection: `animated_data` and `animated_text_reveal` flagged red — is_buildable=true but advisor text still says "NOT YET BUILDABLE". Fix in dashboard. `public.update_content_format()` function.

**Immediate action required:** Fix advisor descriptions for `animated_data` and `animated_text_reveal` via Format Library page.

---

## D124 — Boost Configuration UI
**Date:** 16 April 2026 | **Status:** 🔲 Pending — Meta Standard Access dependency

**Decision:** Build UI for boost config fields in `c.client_publish_profile`. Hard dependency: Meta Standard Access graduation required. Phase 3.4 item.

---

## D125 — RSS.app Discovery Pipeline
**Date:** 16 April 2026 | **Status:** ✅ LIVE

**Decision:** Build a feed discovery pipeline using RSS.app Pro API to programmatically generate RSS feeds from keywords and URLs, and auto-provision them into `f.feed_source` for the existing ingest-worker to pick up.

**Architecture:**
- `f.feed_discovery_seed` table — seed entries (url OR keyword, vertical_slug, status, rssapp_feed_id)
- `feed-discovery` Edge Function v1.0.0 — calls RSS.app API, inserts into f.feed_source via SECURITY DEFINER, marks seeds provisioned
- pg_cron job #61 — daily 8am AEST (`0 20 * * *`)
- RSSAPP_API_KEY in vault — format `c_key:s_secret` (key and secret joined with colon)

**RSS.app API:**
- Base: `https://api.rss.app/v1/feeds`
- Auth: `Authorization: Bearer KEY:SECRET`
- Create by keyword: `{ "keyword": "NDIS Australia", "region": "AU:en" }`
- Create by URL: `{ "url": "https://ndis.gov.au/news" }`
- Returns `rss_feed_url` which goes directly into `f.feed_source.config.url`

**First run results:** 9/9 seeds provisioned. All active in f.feed_source.

**To add more seeds:**
```sql
INSERT INTO f.feed_discovery_seed (seed_type, seed_value, region, vertical_slug, label)
VALUES ('keyword', 'NDIS news 2026', 'AU:en', 'ndis', 'NDIS news 2026');
```
Daily cron picks up `status = 'pending'` rows automatically.

**SECURITY DEFINER functions created:** `public.create_feed_source_rss()`, `public.update_feed_discovery_seed()`

---

## B5 — Weekly Manager Report Email
**Date:** 16 April 2026 | **Status:** ✅ BUILT

**Decision:** weekly-manager-report Edge Function v2.0.0. Sunday 21:00 UTC (Monday 7am AEST). Sends to pk@invegent.com via Resend. 10 parallel queries: pipeline health, per-client summary, token expiry warnings, feed health, pipeline incidents, AI costs. HTML email, mobile-readable.

---

## Publisher Schedule Wiring
**Date:** 16 April 2026 | **Status:** ✅ BUILT

**Decision:** publisher v1.7.0. `public.get_next_publish_slot(client_id, platform)` SECURITY DEFINER function. Reads `c.client_publish_schedule`, finds next slot after NOW() in client timezone, wraps to next week if needed. Returns NULL if no schedule configured (= publish immediately). publisher_lock_queue_v2 already had the `scheduled_for IS NULL OR scheduled_for <= NOW()` filter. Verified live — two queue items correctly assigned schedule slots.

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| NDIS Support Catalogue data load | Tables exist. Needs NDIA Excel from ndia.gov.au | Phase 3 |
| Legal review of service agreement | L001 — hard gate before external client #1 | Before C1 |
| F1 Prospect demo generator | Hold until NDIS Yarns has 60+ days data | ~mid-June 2026 |
| LinkedIn Community Management API | Evaluate Late.dev if still pending 13 May 2026 | 13 May 2026 |
| Bundler topic weight wiring | Blocked — all weights 1.0 until insights feedback loop verified | When live |
| D124 — Boost Configuration UI | Meta Standard Access dependency | Phase 3.4 |
| RSS.app discovery dashboard page | Seed management UI — add/view/manage without SQL | Phase 3 |
| Cowork daily inbox task | Gmail MCP — archive noise, surface actions | Phase 4 |
| Model router | ai-job → model_router → claude OR openai | Phase 4 |
| SaaS vs managed service | When 10 clients served 3+ months | Phase 4 |
| Meta App Review | In Review. Contact dev support if stuck after 27 Apr 2026 | Waiting |
| animated_data advisor conflict | Fix in Format Library page — remove NOT YET BUILDABLE text | Immediate |
| Assign 9 RSS.app feeds to clients | Via Feeds page in dashboard | Immediate |
| CFW content session | Review first drafts, tune AI profile, write prompts | Next session |
| Confirm TBC subscription costs | Vercel, HeyGen, Claude Max, OpenAI — update subscription register | Next session |
