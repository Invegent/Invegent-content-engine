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

**Decision:** Systematic read-only audit of all 40 crons and 46 Edge Functions before further feature work. 10 issues found, all fixed same session. Architecture confirmed sound — debt was operational, not structural.

---

## D108 — Auth Standardisation: No-Verify-JWT + Vault Pattern
**Date:** 15 April 2026 | **Status:** ✅ Complete

**Decision:** All cron-called Edge Functions use `verify_jwt: false` + internal API key check. 12 functions redeployed --no-verify-jwt including content_fetch. Security posture unchanged — internal key validation still in place.

---

## D109 — Publisher Platform Filter (publisher_lock_queue_v1)
**Date:** 15 April 2026 | **Status:** ✅ Fixed

**Decision:** Drop old 3-arg overload of `m.publisher_lock_queue_v1`. Only 4-arg version with `p_platform DEFAULT 'facebook'` remains. Root cause of LinkedIn never publishing: Facebook publisher was stealing all LinkedIn queue items via the unfiltered 3-arg overload.

---

## D110 — Token Expiry Alerter
**Date:** 15 April 2026 | **Status:** ✅ Live — platform-agnostic fix applied 16 Apr

**Decision:** `public.check_token_expiry()` runs daily 8:05am AEST. Writes to `m.token_expiry_alert`. Dashboard banners at 30d warning / 14d critical. Fixed 16 Apr: `WHERE pp.token_expires_at IS NOT NULL` now covers all platforms, not just Facebook.

---

## D111 — Feed Management: Shared Signal Model
**Date:** 15 April 2026 | **Status:** ✅ Live

**Decision:** Feeds are shared signals, not client-owned. Any feed can serve multiple clients simultaneously. `c.client_source` rows are NEVER deleted — only `is_enabled = false`. Feed status values: `active`, `paused`, `deprecated` only.

---

## D112 — Feed DML via SECURITY DEFINER Functions
**Date:** 15 April 2026 | **Status:** ✅ Live

**Decision:** All feed write operations go through SECURITY DEFINER functions in the public schema. Direct `exec_sql` DML on `c` and `f` schemas silently fails.

**Functions:** `public.feed_assign_client()`, `public.feed_unassign_from_client()`, `public.feed_deactivate()`

**Pattern to remember:** exec_sql = SELECT only on c/f/t schemas. Any write → SECURITY DEFINER function in public schema.

---

## D113 — Feed UI Page Separation
**Date:** 15 April 2026 | **Status:** ✅ Live

**Decision:** `/feeds` = global feed pool management. Clients → Feeds tab = per-client feed assignment only.

---

## D114 — Subscription Register: Manual Dashboard Page
**Date:** 14 April 2026 | **Status:** ✅ Built

`k.subscription_register` + `/system/subscriptions` page live. Starting data seeded: Supabase, Vercel, Creatomate, Zapier, Claude API, OpenAI, Resend, HeyGen, GitHub, Google Workspace.

---

## D115 — AI Diagnostic System
**Date:** 2 April 2026 | **Status:** ✅ Live

Daily AI-powered diagnostic at 20:00 UTC (6am AEST). Reads 7 days of metrics → Claude Sonnet → structured health report in `m.ai_diagnostic_report`. `/diagnostics` dashboard page with health gauge and Run Now button.

---

## D116 — Compliance Review DML Fix
**Date:** 2 April 2026 | **Status:** ✅ Fixed

`public.mark_compliance_review()` SECURITY DEFINER function. Compliance tab "mark as reviewed" now writes correctly via `.rpc()`.

---

## D117 — k Schema Fully Documented
**Date:** 2 April 2026 | **Status:** ✅ Complete

All 117 tables across 5 schemas documented to zero TODO entries. `k.vw_table_summary` is the first stop for any table/schema navigation in any session.

---

## D118 — Voice & Formats Dashboard Page
**Date:** 16 April 2026 | **Status:** 🔲 Brief pending

**Decision:** Build a dedicated dashboard page for managing `c.content_type_prompt` per client. Named "Voice & Formats" — not "Prompts."

**Trigger:** Instagram, LinkedIn, and YouTube had zero prompts for months — completely invisible without SQL. Content type prompts are now 24 rows across 4 platforms × 3 job types × 2 clients and grow with every new client. SQL is not a viable management interface at scale.

**What the page must include:**
1. **Platform grid** — four cards (Facebook, Instagram, LinkedIn, YouTube) per client. Green tick if all 3 job types have prompts. Amber warning if any missing. Gap is immediately visible.
2. **Prompt editor** — editable textarea for task_prompt, read-only/collapsible panel for output_schema_hint. Save via SECURITY DEFINER function.
3. **Test capability** — "Test this prompt" button. Sample article → runs through prompt → returns draft JSON in 10-15 seconds. Makes prompt tuning immediate rather than waiting 30 minutes for a pipeline run. Highest-value feature on this page.
4. **Prompt performance panel** — from `m.post_draft`: format distribution (what formats is this prompt actually selecting), auto-approval rate, most common compliance flags per prompt.
5. **Avatar roster inline** — which stakeholder roles have active avatars (from `c.brand_avatar` + `c.brand_stakeholder`). Prevents writing prompts referencing roles with no avatar assigned.
6. **Version history** — store prior prompt text on save using existing `version` column. Allow rollback when a prompt change makes draft quality worse.
7. **Cross-client copy** — "Copy from client" to seed a new client's prompts from an existing client's set. Reduces new client onboarding from 12 SQL inserts to a single click + adaptation.

**Dashboard location:** Clients page → new "Voice & Formats" tab

**DB dependency:** SECURITY DEFINER function `public.upsert_content_type_prompt()` needed for write side.

**Build estimate:** 6-8 hours Claude Code (MVP: editor + platform grid + avatar roster). Test capability and version history are Phase 2 of this brief.

---

## D119 — Avatar Management Dashboard Page
**Date:** 16 April 2026 | **Status:** 🔲 Brief pending

**Decision:** Build a dashboard page for `c.brand_avatar` and `c.brand_stakeholder`. Currently zero UI — all avatar data SQL-only.

**Trigger:** All 28 avatar rows for NDIS Yarns and Property Pulse showed `avatar_gen_status = 'empty'` — invisible without SQL. Video production visibility is completely blind without this page. This would have been caught immediately with a dashboard page.

**What the page must show:**
- Stakeholder roster per client — role_code, role_label, character brief summary, is_active
- Per role: render styles (realistic/animated), HeyGen avatar ID, voice ID, avatar_gen_status with visual indicators (ready=green, empty=amber, failed=red)
- Action: manually trigger heygen-avatar-poller for a specific avatar
- Action: deactivate/reactivate a role for a client

**Dashboard location:** Clients page → new "Avatars" tab

**Build estimate:** 3-4 hours Claude Code.

---

## D120 — Auto-Approval Patterns Dashboard
**Date:** 16 April 2026 | **Status:** 🔲 Brief pending

**Decision:** Surface auto-approver performance data from `m.auto_approval_scores` and `compliance_flags` on `m.post_draft`.

**Trigger:** Cannot currently answer "what percentage of drafts are auto-approved, what are the most common rejection reasons, is the compliance checker calibrated correctly" without SQL. This is the feedback loop that validates whether the auto-approver is working as intended.

**What must be surfaced:**
- Auto-approval rate per client per week (approved / total)
- Format distribution of approved vs rejected drafts
- Top 5 most common rejection reasons (from auto_approval_scores)
- Top compliance flags by frequency (from compliance_flags jsonb on post_draft)
- Trend over time — is the system getting better or worse at first-pass approval
- Per-client breakdown — which clients have the highest rejection rates and why

**Dashboard location:** Performance page → new "Approval Patterns" tab

**Build estimate:** 4-5 hours Claude Code. Read-only queries, no complex write side.

---

## D121 — Compliance Rules Viewer/Editor
**Date:** 16 April 2026 | **Status:** 🔲 Brief pending

**Decision:** Build a dashboard UI for viewing and editing `t.5.7_compliance_rule` — the 20 rules driving compliance checking on every draft.

**Trigger:** NDIS regulations change regularly. ICE's compliance claim — "built by an OT who knows the rules" — degrades over time if the rules cannot be maintained without SQL. Pricing updates, policy shifts, new guidance all require rule updates.

**What the page must include:**
- List all active rules: rule_text, severity (HARD_BLOCK / SOFT_WARN), applicable_verticals, is_active
- Edit rule text inline — regulation wording changes, rule text must change with it
- Add new rule — when a new NDIS policy drops, add without SQL
- Activate/deactivate rules without deleting
- Rule test: paste a draft body → run against all active rules → see which fire. Makes compliance debugging immediate.

**Dashboard location:** Compliance page → Rules tab (alongside existing compliance review queue)

**DB dependency:** SECURITY DEFINER functions needed — t schema is global taxonomy, not writable via exec_sql. Changes here affect all clients.

**Build estimate:** 4-5 hours Claude Code. Rule test panel adds ~2 hours.

---

## D122 — Client Digest Policy UI
**Date:** 16 April 2026 | **Status:** 🔲 Brief pending

**Decision:** Expose `c.client_digest_policy` in the dashboard. Controls content volume and job type mix per client — the most common operational lever when drafts are too many, too few, or wrong type.

**What must be editable:**
- max_items_per_run — how many digest items the bundler selects per run
- active_job_types — which job types are enabled (checkboxes: rewrite_v1, synth_bundle_v1, promo_v1)
- topic_match_mode — strict (exact vertical match) or lenient (broader topic matching)
- min_body_word_count — minimum article length before content is considered
- enabled — master on/off switch per client

**Dashboard location:** Clients page → AI Profile tab (digest policy logically belongs alongside AI generation config) or dedicated Settings tab

**Build estimate:** 2-3 hours Claude Code. Simple form, no complex logic.

---

## D123 — Format Library UI
**Date:** 16 April 2026 | **Status:** 🔲 Brief pending

**Decision:** Build a read-only (initially) dashboard page for `t.5.3_content_format` — the format library the ai-worker format advisor uses.

**Trigger:** `animated_data` and `animated_text_reveal` have `is_buildable = true` in the database but their `advisor_description` still says "NOT YET BUILDABLE — do not recommend." This inconsistency can mis-instruct the format advisor. No way to see or fix without SQL. As formats graduate from Phase 2 to Phase 3, the `is_buildable` flag and advisor descriptions must stay in sync.

**What the page must show:**
- All formats: name, ice_format_key, is_buildable status (green=buildable, amber=not yet, grey=deprecated), render_engine, platform_support matrix
- advisor_description text visible — the instructions sent to the format advisor
- Edit: is_buildable toggle and advisor_description — when a format graduates to buildable, a dashboard toggle not a SQL update

**Dashboard location:** System section → new "Formats" page

**Build estimate:** 2-3 hours read-only. +1-2 hours for edit capability.

---

## D124 — Boost Configuration UI
**Date:** 16 April 2026 | **Status:** 🔲 Brief pending — Phase 3.4 dependency

**Decision:** Build UI for boost configuration fields in `c.client_publish_profile`: boost_enabled, boost_budget_aud, boost_duration_days, boost_objective, boost_targeting (jsonb), boost_score_threshold.

**Trigger:** The auto-boost agent (Phase 3.4) requires these fields configured per client before it can run. Currently SQL-only. boost_targeting is a jsonb audience definition — too complex for raw JSON editing, needs a structured form.

**What must be editable:**
- boost_enabled toggle per client
- boost_budget_aud, boost_duration_days, boost_objective, boost_score_threshold
- boost_targeting — structured form for job_title, location, age_min/max (not raw JSON editing)

**Dashboard location:** Clients page → new "Boost" tab. Only visible/active when Meta Standard Access confirmed.

**Hard dependency:** Meta Standard Access graduation required before this feature is live. Phase 3.4 item.

**Build estimate:** 4-5 hours Claude Code including structured targeting UI.

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| Token alert platform-agnostic | ✅ Fixed 16 Apr — check_token_expiry() now covers all platforms | Done |
| Deprecated feeds stale cleanup | ✅ Fixed 16 Apr — 15 rows set is_enabled=false | Done |
| Content type prompts all platforms | ✅ Done 16 Apr — 24 rows across FB/IG/LI/YT for NY + PP | Done |
| NDIS Support Catalogue data load | Tables exist. Needs NDIA Excel from ndia.gov.au | Phase 3 |
| Legal review of service agreement | L001 — hard gate before external client #1 | Before C1 |
| F1 Prospect demo generator | Hold until NDIS Yarns has 60+ days data | ~mid-June 2026 |
| LinkedIn middleware evaluation | Late.dev if Community Management API still pending | 13 May 2026 |
| Bundler topic weight wiring | Blocked — all weights 1.0 until insights feedback loop verified | When insights-feedback confirmed live |
| invegent.com blog section | Brief 046 — Supabase → Next.js ISR pattern | Phase 3 |
| B5 — Weekly manager report email | Sunday cron via Resend | Phase 3 |
| Publisher schedule wiring | c.client_publish_schedule → publisher assigns scheduled_for | Phase 3 |
| Support Coordinator HeyGen avatar | Pairs with Alex for conversational scenes | Next session |
| CFW content session | Review first drafts, tune AI profile | Next session |
| Cowork daily inbox task | Gmail MCP — archive noise, surface actions. Build after Phase D complete | Phase 4 |
| Model router | ai-job → model_router → claude OR openai. When AI costs become significant | Phase 4 |
| SaaS vs managed service | When 10 clients served 3+ months | Phase 4 |
| D118 — Voice & Formats page | Clients → Voice & Formats tab. Editor + platform grid + test capability + avatar roster + version history + cross-client copy | Next build session |
| D119 — Avatar Management page | Clients → Avatars tab. Roster + status + gen state + poller trigger | Next build session |
| D120 — Auto-Approval Patterns | Performance → Approval Patterns tab. Rates, rejection reasons, compliance flag frequency | Phase 3 |
| D121 — Compliance Rules UI | Compliance → Rules tab. View/edit/add rules + rule test panel | Phase 3 |
| D122 — Client Digest Policy UI | Clients → AI Profile or Settings tab. Volume and job type controls | Next build session |
| D123 — Format Library UI | System → Formats page. Buildable status, advisor descriptions, is_buildable toggle | Phase 3 |
| D124 — Boost Configuration UI | Clients → Boost tab. All boost fields + structured targeting form | Phase 3.4 |
| Meta App Review | Business verification in review. Contact dev support if stuck after 27 Apr 2026 | Waiting |
| LinkedIn Community Management API | Evaluate Late.dev if still pending 13 May 2026 | Waiting |