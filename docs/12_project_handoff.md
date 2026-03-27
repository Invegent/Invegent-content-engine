# ICE — Invegent Content Engine
## Complete Project Handoff Document
**Last updated: 27 March 2026**
**Purpose: Full context transfer to new Claude project — upload this as the first project document**

---

## ⚠️ CRITICAL: SESSION STARTUP PROTOCOL

**At the start of every session involving ICE technical work — before answering any question or writing any code — read the live sync state file from GitHub:**

```
Owner: Invegent
Repo: Invegent-content-engine
Path: docs/00_sync_state.md
```

Use the GitHub MCP `get_file_contents` tool. This file is overwritten every 12 hours by the Cowork pulse task and contains the actual live deployed state: Edge Function versions, Vercel deploy status, active pipeline issues, and what is next. **Do not rely on memory alone for version numbers, pipeline status, or known issues. If this file contradicts memory or 04_phases.md, the sync state file wins.**

If the GitHub MCP is unavailable at session start, say so explicitly before proceeding.

---

## WHO PK IS

**Parveen Kumar (PK)** — pk@invegent.com

- CPA with 20 years experience: financial accounting, tax, management accounting
- Senior Analyst background in fashion retail (analytics, demand signals, performance at scale)
- NDIS Plan Manager — operational understanding of the NDIS ecosystem from provider and participant side
- Business administrator for **Care for Welfare** — a mobile allied health NDIS practice (OT, founded by spouse)
- Active property investor
- Solo builder of ICE — no traditional development background; builds AI-assisted via Claude Code

**Why this matters:** ICE was not built by a developer looking for a market. It was built by a finance professional and NDIS operator solving a problem they personally experience running a real allied health practice.

---

## WHAT ICE IS

ICE (Invegent Content Engine) is a **signal-centric AI content pipeline**. Unlike scheduling tools (Buffer, Hootsuite), ICE starts upstream — ingesting raw information streams, extracting meaning, and synthesising branded, platform-ready content automatically.

**Core philosophy:** Signals first, posts second. Every piece of content ICE produces is traceable back to a real-world signal — a policy update, a market movement, a research finding.

**Pipeline:** Ingest → Canonicalise → Score → Draft → Approve → Publish → Analyse

**Primary differentiator:** ICE solves *what to post and why it matters* — not just distribution. This is the upstream intelligence gap that all existing tools ignore.

**Business model:** Done-for-you managed content service — $500–$1,500/month per client. NDIS providers are the primary target (Phase 1-3). Property professionals are secondary. SaaS is a Phase 4 decision after the managed service is proven.

---

## THE THREE BUSINESSES ICE SERVES

1. **Care for Welfare (existing)** — NDIS allied health OT practice. NDIS Yarns Facebook page runs on ICE autopilot, building digital authority and generating referrals without consuming founder time.

2. **Invegent (the platform)** — The content engine business itself. Revenue target: $8,000–$15,000/month at 10 clients.

3. **Property Investment (personal)** — Property Pulse validates the property vertical and builds personal brand authority.

**STANDING PRINCIPLE — ICE build priority order:**
1. PK's personal businesses — Care for Welfare, Property Buyers Agent (future), NDIS Accessories/FBA (future)
2. PK's personal hobbies and creative brand — YouTube, personal content
3. External clients — bonus application, not the driver

Never gate build decisions on client ROI alone. Never treat YouTube or personal brand features as lower priority than client features. The engine proves itself on PK's own world first.

---

## TWO TEST CLIENTS (Internal Proof)

**NDIS Yarns** (primary proof vehicle for NDIS provider service)
- `client_id: fb98a472-ae4d-432d-8738-2273231c1ef4`
- `client_ai_profile_id: 3cbcd894-fee4-4511-bfe3-f03de422794a`
- Vertical: Disability Services → NDIS (Australia)
- Platforms: Facebook (LinkedIn ready but API approval pending)
- Status: Publishing. As of 22 Mar 2026 — queue blocked by 24 zombie approved drafts from Feb 2026 (GPT-era, text-only). Fix: `UPDATE m.post_draft SET approval_status='dead', dead_reason='pre-visual-pipeline backlog cleared' WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND approval_status='approved';`

**Property Pulse** (property investment proof)
- `client_id: 4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`
- Vertical: Real Estate → AU Residential Property + AU Mortgage & Lending
- Platforms: Facebook
- Status: HEALTHY. 7 posts queued as of 22 Mar 2026.

---

## CURRENT PHASE STATUS (as of 22 March 2026)

**Active: Phase 3 — Expand + Personal Brand**

**Phase 1 — COMPLETE:**
- ✅ Feed quality — 26 active sources per client (all rss_app)
- ✅ Auto-approver v1.4.0 — nine-phrase blocklist, five-gate logic
- ✅ Supabase Pro — daily physical backups active
- ✅ Dead Letter Queue — `dead_reason` columns, daily 2am UTC sweep
- ✅ Next.js Dashboard (2.5) — 8 tabs live at dashboard.invegent.com
- ⏳ Meta App Review — business verification In Review. Screencasts uploaded ✅. App icon uploaded ✅. Data handling + reviewer instructions section still to complete. Calendar: 1 Apr.

**Phase 2 — Mostly complete:**
- ✅ Facebook Insights (2.1)
- ✅ Feed Intelligence (2.2)
- ✅ Next.js Dashboard (2.5)
- ✅ Public Proof Dashboard (2.6) — live at invegent.com
- 🔴 LinkedIn (2.3) — Community Management API form submitted. Status: "1 of 2. Access Form Review". Calendar check: 25 Mar.
- ⏸ Campaigns (2.4) — deferred

**Phase 3 — Active build queue:**
- Cowork nightly pipeline health task (planned)
- AI Diagnostic Agent Tier 2 (~1 Apr)
- m.post_format_performance population
- Prospect demo generator (est. 2 days)
- Client health weekly report email (est. 2 days)

---

## INFRASTRUCTURE

### Supabase
- **Project ID:** `mbkmaxqhsohbtwsqolns` (ap-southeast-2)
- **Plan:** Pro — daily physical backups active
- **Schemas:** `f.*` (feeds/ingest), `m.*` (publishing pipeline), `c.*` (client config), `t.*` (taxonomy), `a.*` (enrichment), `k.*` (governance)
- **Auth:** Supabase Auth + Row Level Security — multi-tenant client isolation at DB level
- **PostgREST schema exposure:** `c` and `f` schemas NOT exposed via PostgREST. Use `exec_sql` RPC or `security definer` SQL functions called via `.rpc()` to bypass. Direct `.schema("m").from().select()` returns zero rows silently when schema isn't exposed — writes work fine.

### GitHub
- **Primary repo:** `github.com/Invegent/Invegent-content-engine`
- **Docs:** `/docs` folder — all markdown files
- **Dashboard repo:** `invegent-dashboard`
- **Portal repo:** `invegent-portal`
- **Web repo:** `invegent-web`

### Vercel
- **Team slug:** `pk-2528s-projects`
- **Team ID:** `team_kYqCrehXYxW02AycsKVzwNrE`
- **dashboard:** `dashboard.invegent.com` | Project ID: `prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg`
- **portal:** `portal.invegent.com` | Project ID: `prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa`
- **web:** `invegent.com` | Project ID: `prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ`
- `VERCEL_TOKEN` stored in Windows env vars

### AI
- **Primary:** Anthropic Claude API — `claude-sonnet-4-6`
- **Fallback:** OpenAI GPT-4o (silent fallback only)
- **Config:** Per-client in `c.client_ai_profile`. Both client rows updated from broken `model = null` state.

### Email
- **Email ingest:** `feeds@invegent.com` Google Workspace — OAuth 2.0 credentials stored as Supabase secrets (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_TARGET_EMAIL`)
- **Labels:** `newsletter/ndis`, `newsletter/property`
- **Transactional:** Resend — magic link + draft notifier. `RESEND_API_KEY` + `NOTIFY_FROM` in portal Vercel env vars ✅

### Visual / Media
- **Images:** Creatomate Essential — $54/month — 1080×1080 PNG
- **TTS/Video:** ElevenLabs Creator — NDIS + Property Pulse voices confirmed
- **YouTube:** OAuth 2.0 both channels — uploads unlisted by default
- **Brand design:** Canva preferred over code-generated assets

### MCP Connectors (Claude Desktop `claude_desktop_config.json` on Windows)
- GitHub MCP
- Supabase MCP (also available via Claude.ai web connector — requires OAuth re-auth if session drops)
- Google Calendar MCP — ICE task tracking
- Windows MCP (`uv` installed)
- Xero MCP — Care for Welfare (`xero-care-for-welfare`)

---

## LIVE EDGE FUNCTIONS (as of 22 March 2026)

23 active functions on Supabase project `mbkmaxqhsohbtwsqolns`:

| Function | Version | Notes |
|---|---|---|
| ai-worker | v2.6.1 | Primary AI generation. Anthropic primary, OpenAI fallback. Format advisor seed extraction fix (D051). |
| publisher | v1.3.x | Facebook photo endpoint. publisher_lock_queue_v2 duplicate fixed. |
| video-worker | v2.0.0 | ElevenLabs TTS voice added (D045). |
| youtube-publisher | v1.0.0 | OAuth 2.0 YouTube upload, unlisted by default (D045). |
| image-worker | v3.3.0 | Creatomate Essential. 1080×1080 PNG. Root-level fill_color for bg. Montserrat font. D039 Two-Attempt Rule. |
| compliance-monitor | v1.2.0 | Monthly cron. 5 NDIS policy URLs. SHA-256 hash comparison. Alerts in m.compliance_review_queue. |
| auto-approver | v1.4.0 | Five-gate logic: auto_approve_enabled flag, not previously rejected, final_score threshold, draft body length, nine-phrase keyword blocklist. |
| insights-worker | v18 | Facebook Graph API /insights daily. Writes m.post_performance. |
| ingest | stable | RSS ingest every 6h. |
| content_fetch | v2.5 | TRUSTED_FREE_DOMAINS bypass (abc.net.au, gov.au, NDS, Inclusion Australia, OT Australia). GOVAU_CLOUDFLARE_DOMAINS with 5 retries + 12h cooldown. Drupal filter URL fast-rejection. |
| linkedin-publisher | v1.1.0 | Community app (78im589pktk59k). pg_cron every 15min. store_linkedin_org_token() helper. |
| email-ingest | v2 | Gmail History API. Polls every 2h. Dedup via external_id (Gmail message ID). |
| draft-notifier | v1.1 | Root cause fix: exec_sql silently failing for DML on m schema. Fix: public.mark_drafts_notified(uuid[]) SECURITY DEFINER function. |
| feed-intelligence | v7 | Weekly analysis. Give-up rates, content quality per source. Recommendations to m.agent_recommendations. |
| series-writer | v1.2.0 | Content Series backend. |
| series-outline | v1.2.0 | Content Series backend. |
| pipeline-doctor | v1.0.0 | Diagnostic agent. |
| pipeline-ai-summary | stable | AI pipeline summary. |
| pipeline-health-snapshot | — | Health monitoring. |
| bundler | stable | Digest engine. Scores canonical items by relevance to client verticals. |
| inspector / inspector_sql_ro | — | Utility functions. |

---

## PG_CRON SCHEDULE (22 active jobs)

| Schedule | Job |
|---|---|
| every 5 min | ai-worker (limit 5), publisher (limit 2), enqueue-publish-queue |
| every 10 min | content_fetch, sweep-stale, seed-and-enqueue-facebook, auto-approver |
| every 15 min | linkedin-publisher, image-worker |
| every 30 min | draft-notifier, pipeline-health-snapshot, video-worker |
| :15 :45 | pipeline-doctor, youtube-publisher |
| :55 | pipeline-ai-summary |
| hourly :00 | planner (create_digest_run) |
| hourly :05 | run_pipeline_for_client (Property Pulse) |
| every 2h | email-ingest |
| every 6h | ingest (RSS) |
| daily 0 21 UTC (8am AEDT) | run_pipeline_for_client (NDIS Yarns), token-health-write |
| daily 0 2 UTC | dead-letter-sweep |
| daily 0 3 UTC | insights-worker |
| weekly Sunday 0 2 UTC | feed-intelligence |
| 1st of month 0 9 UTC | compliance-monitor |

---

## DATABASE SCHEMA

### Schema Map
- `f.*` — Feed / Ingest layer (facts, raw data)
- `m.*` — Publishing layer (meaning, decisions, outputs)
- `c.*` — Client configuration layer
- `t.*` — Taxonomy reference layer (global, never changes)
- `a.*` — Enrichment layer (keywords, topics)
- `k.*` — Governance / data catalog

### Key Tables

**f schema — Feed & Ingest**
- `f.feed_source` — master list of all feed sources
- `f.ingest_run` — log of each ingest execution
- `f.raw_content_item` — raw items from each source
- `f.content_item` — normalised content items
- `f.canonical_content_item` — deduplicated canonical identity
- `f.canonical_content_body` — full text extraction (fetch_status: pending → success | give_up_paywall | give_up_blocked | dead)

**m schema — Publishing Pipeline**
- `m.digest_run` — digest execution windows
- `m.digest_item` — scored and selected items per digest
- `m.post_draft` — AI-generated drafts (approval_status: needs_review | approved | rejected | dead)
- `m.post_publish_queue` — approved posts awaiting publishing
- `m.post_publish` — published post record (includes platform_post_id)
- `m.post_performance` — engagement data (reach, impressions, engagement rate, clicks, shares)
- `m.post_boost` — boost job record (campaign_id, adset_id, ad_id, status)
- `m.ai_job` — job queue for AI processing
- `m.compliance_review_queue` — compliance alerts
- `m.agent_recommendations` — feed intelligence recommendations
- `m.post_format_performance` — format performance tracking (populating)

**c schema — Client Configuration**
- `c.client` — client identity (name, slug, timezone, status). Field: `client_slug` (not `slug`)
- `c.client_ai_profile` — AI persona, system prompt, model, platform rules. PK: `client_ai_profile_id`
- `c.client_channel` — platform connections per client
- `c.client_digest_policy` — content selection rules
- `c.client_publish_profile` — publishing settings (mode: auto|manual|staging, throttle, token, boost settings)
- `c.client_source` — feed → client links with weights
- `c.client_content_scope` — client → content vertical links

**t schema — Taxonomy**
- `t.content_vertical` — vertical hierarchy (global → jurisdiction-specific)
- `t.6.0_content_domain` — 17 top-level domains
- `t.6.1_content_pillar` — 71 pillars per domain
- `t.6.2_content_theme` — 715 themes per pillar
- `t.6.3_content_topic` — 2,582 specific topics
- `t.5.4_use_case_prompt_template` — 27 prompt templates
- `t.5.5_cta_master` — 9 CTAs
- `t.5.6_brand_voice` — brand voice definitions
- `t.5.7_compliance_rule` — 20 NDIS compliance rules (all active, including rules 7+8: OT scope + early childhood)

### Join Chain for Post → Client
`post_draft → digest_item → digest_run → client`
(no direct `client_id` on `post_draft` — backfilled 482 nulls in Mar 2026; 7 orphaned published rows remain null — harmless)

### RLS Applied (March 2026)
- `auth_client_id()` helper function created
- RLS + policies on: `m.post_draft` (SELECT+UPDATE), `m.post_publish_queue` (SELECT), `m.post_publish` (SELECT), `m.post_performance` (SELECT)
- Portal magic link confirmed working. Same-browser PKCE requirement documented.

---

## DASHBOARD — dashboard.invegent.com

**5 nav items:** Inbox / Create / Clients / Monitor / Roadmap

- **Inbox:** Drafts + Queue + Failures tabs
- **Create:** Content Studio — platform filter respected (YouTube excluded from picker)
- **Clients:** Overview / Profile / Connect / Feeds tabs. Feed Suggestions panel (approve/reject with review note).
- **Monitor:** Pipeline / Visuals / Compliance / AI Costs tabs
- **Roadmap:** Full phase + deliverable view, live progress bars, external blockers section

**Multi-user:** Email/password auth, service role key server-side.

---

## PORTAL — portal.invegent.com

**Pages:**
- `/inbox` — draft approval for clients
- `/performance` — engagement data. Uses `get_portal_performance(p_client_id, p_weeks)` with explicit param (not auth_client_id)
- `/calendar` v2 — `get_portal_calendar(p_client_id, p_year, p_month)` fn. Month/week/day drawer. Platform icons greyed past. Adjacent months preloaded. Campaign row reserved.
- `/feeds` — read-only active/inactive feed list + "Suggest a source" form → `public.feed_suggestion` table

---

## WEB — invegent.com

- Public proof dashboard (Phase 2.6) — live NDIS Yarns metrics
- Privacy Policy live at `invegent.com/Invegent_Privacy_Policy`
- Data Deletion URL live

---

## COWORK TASKS (Claude Code automated)

- **Weekly reconciliation** — Monday 7am AEST. Docs sync, roadmap sync, pending decisions review. GitHub-only (no Supabase). Writes `docs/00_sync_state.md`.
- **Nightly health check** — planned (Supabase pipeline only)

---

## CREDENTIALS STATUS (as of 22 March 2026)

| Credential | Status |
|---|---|
| Anthropic API | Active — primary AI provider |
| OpenAI API | Active — fallback only |
| Facebook page tokens | Active — both clients |
| LinkedIn org tokens | Stored — publisher code ready, API approval pending |
| ElevenLabs Creator | Active — NDIS + PP voices confirmed |
| YouTube OAuth | Active — both channels, uploads unlisted by default |
| Creatomate Essential | Active — $54/mo |
| Resend | Active — magic link + draft notifier |
| Gmail OAuth (email-ingest) | Active — feeds@invegent.com |
| Xero (Care for Welfare) | Active — via MCP |

---

## KNOWN ACTIVE ISSUES (as of 22 March 2026)

| Issue | Status | Action needed |
|---|---|---|
| NDIS draft queue empty | ⚠️ NEEDS ACTION | 24 zombie approved drafts from Feb 2026 (GPT-era, text-only) blocking fresh generation. Confirm with PK then run: `UPDATE m.post_draft SET approval_status='dead', dead_reason='pre-visual-pipeline backlog cleared 2026-03-22' WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND approval_status='approved';` |
| LinkedIn publisher | 🔵 External blocker | Community Management API review in progress. Community app ID: 78im589pktk59k. |
| Meta App Review | 🔵 External blocker | Business verification In Review. Data handling + reviewer instructions section still to complete. |

---

## KEY ARCHITECTURAL DECISIONS (condensed — full log in docs/06_decisions.md)

| ID | Decision | Choice |
|---|---|---|
| D001 | Signal-centric vs post-centric | Signal-centric — foundational |
| D002 | Database | Supabase / PostgreSQL — lowest lock-in, portable |
| D003 | Taxonomy | Three-level: domains → verticals → jurisdiction-specific |
| D004 | OpenAI Assistants API | Abandoned — deprecated. Database-stored personas instead |
| D005 | Dashboard | Next.js + Vercel + Claude Code. Retool was transitional (cancelled Mar 2026) |
| D006 | AI model | Claude primary, OpenAI fallback, per-client config |
| D007 | Multi-tenancy | Single Supabase project, RLS at DB level |
| D008 | Pipeline orchestration | pg_cron + Edge Functions — no external tools |
| D009 | Dev workflow | Chat → SQL → review → apply. No ad-hoc database editing |
| D010 | Business model | Managed service first, SaaS evaluated in Phase 4 |
| D011 | Target market | NDIS providers primary, property secondary |
| D039 | Image generation | Two-attempt rule: Creatomate first, text-only fallback |
| D040 | Image vendor | Creatomate Essential $54/mo. Chosen over Bannerbear, Canva API, Replicate |
| D045 | Video pipeline | ElevenLabs TTS + YouTube publisher. Unlisted by default. |
| D046–D050 | Platform forms → website onboarding | Two-path onboarding: chatbot-first. Invegent gets own brand pages. |
| D051 | ai-worker format advisor | Seed extraction fix — both rewrite_v1 and synth_bundle_v1 nest content one level deeper than payload |

---

## KEY LEARNINGS & GOTCHAS

- **Schema discovery before DML:** Always check `information_schema.columns` before writing queries. Column names differ from assumed conventions (e.g., `client_slug` not `slug`, `client_ai_profile_id` as PK).
- **PostgREST schema exposure:** `c` and `f` schemas not exposed via PostgREST. Use `exec_sql` RPC or `security definer` SQL functions called via `.rpc()`. Direct `.schema("m").from().select()` returns zero rows silently.
- **Join chain:** `post_draft → digest_item → digest_run → client` (no direct `client_id` on post_draft).
- **Content quality guardrails matter:** Silent AI model fallback (to gpt-4o-mini) produced low-quality output that reached a live audience. Explicit provider/model config + auto-approver blocklist + system prompt rules are all necessary layers.
- **Retool AI:** Stalls on complex prompts. Reliable only for small single-action steps. Do not use for ICE work.
- **Distribution is a missing layer:** Content without audience reach solves nothing. Facebook cold start, community building, paid boosting, and cross-promotion network flywheel between ICE clients are all needed.
- **Docs-first discipline:** Decisions and architecture should be fully documented in `06_decisions.md` before implementation begins.
- **SECURITY DEFINER pattern:** When exec_sql silently fails for DML on m schema, the fix is a `public.function_name() SECURITY DEFINER` SQL function. Example: `public.mark_drafts_notified(uuid[])`.
- **RLS on post_draft:** `auth_client_id()` helper created. Portal magic link: same-browser PKCE requirement.
- **ai-worker format advisor:** Seed content sits one level deeper than payload in both rewrite_v1 and synth_bundle_v1 — was causing all NDIS drafts to be text-only with no images until D051 fix.

---

## STANDING RULES (apply every session)

1. **Read `docs/00_sync_state.md` at session start** — before any code or SQL. GitHub MCP → Invegent/Invegent-content-engine → docs/00_sync_state.md.

2. **Docs + memory + dashboard must stay in sync every session.** Whenever docs (`/docs/*.md`) or memory are updated with ICE progress, ALSO update `app/(dashboard)/roadmap/page.tsx` in `invegent-dashboard` repo — specifically the PHASES array and `lastUpdated` date.

3. **All significant decisions committed to `docs/06_decisions.md` before or immediately after implementation.**

4. **Schema discovery before DML** — always check `information_schema.columns` before writing queries.

5. **Never write ad-hoc SQL directly to production** — chat → SQL → review → apply workflow.

6. **All important ICE reminders go to Google Calendar as well as memory.**

---

## SESSION WORKFLOW

- **Claude Code (terminal):** All execution and building — Edge Functions, schema changes, Next.js builds.
- **This Project chat:** Architecture, strategy, SQL authoring, documentation, decisions.
- **Supabase MCP:** Direct DB queries in chat. Available via Claude.ai web connector (requires OAuth re-auth if session drops).
- **GitHub MCP:** File reads/writes, commits.
- **Google Calendar MCP:** Task and reminder tracking.
- **Windows MCP:** Local file operations on PK's Windows machine.
- **Xero MCP:** Care for Welfare accounting (`xero-care-for-welfare`).

Sessions typically start with PK saying **"what's next task"** — respond with a quick orientation from sync state + memory, then the top-priority item from the build queue.

---

## COMMUNICATION PREFERENCES

- **Direct, depth-oriented, strategic.** No fluff.
- **Full content in responses** — not summaries of what could be written.
- **Claude leads on technical recommendations** — thresholds, architecture decisions, specific choices. PK does not want to be asked for approval on each detail.
- **Australian English** — spelling, terminology throughout.
- **Honest assessment over validation.** Push back when something is wrong.
- **No excessive check-ins** — make reasonable assumptions and execute, flag blockers.
- **Build iterative end-to-end slices** — not complete upfront architecture.

---

## PLATFORM PRIORITIES

- **Primary:** Facebook + LinkedIn
- **Phase 2:** Instagram
- **Phase 3:** YouTube (video pipeline built Mar 2026 — D045)
- **Phase 4 (signal ingest only):** Reddit
- **Deprioritised:** TikTok, Twitter/X

---

## META APP REVIEW STATUS

- Privacy Policy URL: live at invegent.com/Invegent_Privacy_Policy
- Data Deletion URL: live
- Screencasts: uploaded ✅
- App icon: uploaded ✅
- Business verification: In Review
- Data handling + reviewer instructions: **still to complete**
- Calendar reminder: 1 Apr 2026
- Permissions to request (all five in ONE review): `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `ads_management`, `ads_read`
- Timeline after submission: 2–8 weeks

---

## COMPLIANCE FRAMEWORK

- 20 NDIS rules active in `t.5.7_compliance_rule` (all 20 including rules 7+8: OT scope + early childhood)
- Compliance test result (20 Mar 2026): 0/20 HARD_BLOCK, 3/20 minor SOFT_WARN on 20 published drafts — calibrated correctly
- compliance-monitor watching 5 policy URLs monthly — SHA-256 hash comparison
- Initial hashes stored 20 Mar 2026
- SECURITY DEFINER write functions: `compliance_update_source_hash`, `compliance_update_source_checked`, `compliance_insert_review_alert`
- Dashboard /compliance panel live

---

## CONTENT PIPELINE — THE FOUR AGENTS

**Agent 1 — Auto-Approver (v1.4.0, active)**
Five-gate logic: `auto_approve_enabled` flag → not previously rejected → `final_score` threshold → draft body length → nine-phrase keyword blocklist (includes "feed resolved", "source material", "technical issue", "pipeline")

**Agent 2 — Feed Intelligence (v7, active)**
Weekly analysis. Give-up rates per source (>70% for 2 weeks → flag). Recommendations to `m.agent_recommendations`. Dashboard panel: approve/dismiss.

**Agent 3 — Content Analyst (planned, Phase 3)**
Weekly performance reports per client. Reads `m.post_performance`. Delivers to client portal.

**Agent 4 — Auto-Boost (planned, Phase 3)**
Facebook Ads API four-step hierarchy: Campaign → Ad Set → Ad Creative → Ad. Writes to `m.post_boost`. Requires Standard Access graduation + Meta App Review ads permissions.

---

## CONTENT SERIES (built Mar 2026)

- Backend: `series-outline` v1.2.0, `series-writer` v1.2.0
- Brief-in / series-out: brief → 10-post outline → full drafts → post_draft pipeline
- Content Studio in dashboard: platform filter respected, YouTube excluded from picker
- Portal: `/calendar` reserved campaign row

---

## VISUAL PIPELINE (built Mar 2026)

- `image-worker v3.3.0` — Creatomate Essential, 1080×1080 PNG
- Root-level `fill_color` for background (NOT shape element)
- Montserrat font, direct logo URL
- D039 Two-Attempt Rule: Creatomate first → text-only fallback
- Property Pulse brand: #1E2532/#ECA02D + logo
- Resvg WASM render: was failing (plain text fallback active); resolved via Creatomate switch

---

## FRONTEND BUILD ORDER

1. ✅ Dashboard (`dashboard.invegent.com`) — internal team
2. ✅ Portal (`portal.invegent.com`) — paying clients (RLS auth)
3. ✅ Web (`invegent.com`) — public (proof dashboard live)
4. 🔲 Portal — ongoing feature additions
5. 🔲 Client websites — Next.js template, one per client, config-driven (Phase 4)

---

## UNIT ECONOMICS

**Standard tier — $800/month per client:**
- AI generation: ~$15/month (Claude API)
- Platform costs: ~$5/month (Supabase/Vercel share)
- Gross margin: ~$780/month per client (97%)
- Founder time target: 30 min/week per client
- At 10 clients: 5 hours/week, $8,000/month → ~$1,600/hour effective rate

---

## TARGET REVENUE

- 3 months: 3 paying clients, $2,000–$3,000/month
- 6 months: 6 paying clients, $5,000–$8,000/month
- 12 months: 10 paying clients, $8,000–$15,000/month

**First paying client:** Acquisition begins when Phase 1 done criteria are all met (they are). Next step: prepare NDIS Yarns proof point document, identify 5 specific NDIS providers.

---

## CROSS-PROMOTION NETWORK STRATEGY

Each new client strengthens every other client. NDIS Yarns is the hub. Week 1 onboarding: Welcome post featuring new client. Month 1: Spotlight post. Ongoing: cross-tag in relevant content. This network effect means clients don't leave because leaving means losing access to network reach.

---

## DISTRIBUTION STRATEGY

1. **Seed (free, week 1-2):** Client's existing network, founder personal profile share, cross-promotion from NDIS Yarns
2. **Community (free, ongoing):** NDIS Facebook groups participation as practitioner, LinkedIn outreach
3. **Paid Boost (month 1 onward):** $200–$400/month Facebook ads per client, $10–$20 per post boost
4. **Network Flywheel (ongoing):** Cross-promotion between ICE clients compounds

---

*This document was generated 27 March 2026 as a complete handoff for project transfer.*
*Upload to new Claude project as the primary context document.*
*Read docs/00_sync_state.md at every session start to get live state.*
