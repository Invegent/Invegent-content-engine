# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D061 — See earlier commits

---

## D062 — post_seed Platform Column + Constraint Fix
**Date:** 2 April 2026 | **Status:** ✅ Live

Added `platform` column to `m.post_seed`. New constraint `post_seed_uniq_run_item_platform`
on (digest_run_id, digest_item_id, platform). YouTube excluded from text pipeline.
Fixes CROSS JOIN duplicate conflict bug in seed_client_to_ai_v2.

---

## D063 — Pipeline Doctor Log Harvester
**Date:** 2 April 2026 | **Status:** ✅ Live

`m.harvest_pipeline_doctor_log()` SECURITY DEFINER function reads doctor HTTP response
from `net._http_response`, writes structured results to `m.pipeline_doctor_log`.
pg_cron at :17/:47 (2 min after doctor at :15/:45). 37 records in log at session end.

---

## D064 — post_publish_queue acknowledged_at Pattern
**Date:** 2 April 2026 | **Status:** ✅ Live

Added `acknowledged_at` + `acknowledged_by` to `m.post_publish_queue`.
Doctor harvester skips acknowledged dead items from issues_found count.
Enables formal closure of known-bad items without deletion.

---

## D065 — AI Compliance Reviewer (Phase 3.14)
**Date:** 2 April 2026 | **Status:** ✅ Live

compliance-reviewer v1.3.0. Fetches changed pages via Jina, loads scoped rules
via get_compliance_rules(), sends to Claude with vertical+profession context.
Writes structured ai_analysis JSONB to m.compliance_review_queue.
pg_cron 9:05 UTC 1st of month. Dashboard AI panel live.
First run: 5/5 NDIS items analysed, 4/5 action required.

---

## D066 — Profession Dimension for Compliance + Content
**Date:** 2 April 2026 | **Status:** ✅ Live

t.profession table (12 professions: 7 NDIS, 5 property).
profession_slugs[] on t.5.7_compliance_rule (4 rules scoped).
profession_slug on m.compliance_policy_source, m.compliance_review_queue, c.client.
Care for Welfare = occupational_therapy.
get_compliance_rules(vertical, profession) SECURITY DEFINER function.
OT gets 22 rules (16 universal + 3 OT-specific + 3 global).
Support worker gets 19 (16 + 3 global). No false positives.

t.profession also stores: anzsco_occupation_id, anzsic_class_code,
code_of_conduct_url, code_of_conduct_name, regulator_website.
All 12 professions backfilled. code_of_conduct_url is the input for
the future AI compliance rule generator — fetched fresh via Jina when needed.
Storing URL (not text) is correct — avoids stale copies, uses existing fetch infrastructure.

---

## D067 — Claude Code Agentic Loop — First Autonomous Execution
**Date:** 2 April 2026 | **Status:** ✅ Proven

Establish the Claude Code agentic loop as the standard pattern for
well-scoped ICE build tasks that don't require mid-execution human judgment.

Brief format that works:
- Current state check query per task (idempotent)
- Exact SQL/code with no ambiguity
- Verification query with explicit expected result
- Error handling: skip and log, don't guess
- Completion protocol: write progress file

First execution: 4 tasks, no human intervention, completed in minutes.
Claude Code handled ANZSIC 8699 not existing → used NULL (correct).

Directory: `C:\Users\parve\Invegent-content-engine`
MCPs needed: Supabase MCP + GitHub MCP (both in claude_desktop_config.json)
Proven tasks: ai-worker deploy, schema migration, k registry updates, Cowork file creation.

---

## D068 — k Schema as Primary Navigation Tool
**Date:** 2 April 2026 | **Status:** ✅ Adopted

Replace ad-hoc `information_schema.columns` discovery with structured nav
against `k.vw_table_summary` and `k.vw_db_columns` at session start.

Rationale: Every session was spending 3-5 tool calls rediscovering column
names and FK relationships already in the k registry.

Standard pattern:
```sql
SELECT schema_name, table_name, purpose, columns_list, fk_edges
FROM k.vw_table_summary
WHERE schema_name = 'x' AND table_name = 'y';
```

---

## D069 — k Schema Full Repair
**Date:** 2 April 2026 | **Status:** ✅ Complete

**Problem:** k schema governance catalog had three bugs and was partially non-functional.

**Bugs fixed:**
1. `refresh_table_registry()` — hardcoded schema list excluded `c` and `f`
2. `refresh_column_registry()` — same exclusion of `c` and `f` schemas
3. `sync_registries()` — referenced `vw_db_objects.object_type` but column is `object_kind`

**Infrastructure added:**
- Weekly pg_cron: `k-schema-refresh-weekly` every Sunday 3am UTC
- `refresh_catalog()` now covers all 8 registered schemas

**Documentation completed:**
- c schema: 14 tables, 207 columns now registered and documented
- f schema: 12 tables, 149 columns now registered and documented
- m schema: all 19 remaining TODO tables documented
- Total: 117 tables fully documented across all schemas — zero TODO entries

**Key principle confirmed:**
Manually-coded purpose/join_keys/advisory entries are preserved on every
refresh (ON CONFLICT only updates structural fields). Safe to re-run at any time.

---

## D070 — AI Diagnostic Agent v1.0.0 — Tier 2 Daily Health Report
**Date:** 2 April 2026 | **Status:** ✅ Live

New `ai-diagnostic` Edge Function providing a Tier 2 daily health report for the ICE pipeline.

**Capabilities:**
- Trend analysis across pipeline health snapshots
- Per-client scoring — NDIS Yarns and Property Pulse assessed separately
- AI-generated recommendations based on detected patterns
- Predictive warnings for emerging pipeline risks

**Dashboard:** `/diagnostics` page and `/api/diagnostics` Next.js route live in invegent-dashboard.

---

## D071 — IAE Strategic Decision — Do Not Build Yet
**Date:** April 2026 | **Status:** ✅ Decided — concept stage only

**Decision:**
IAE (Invegent Advertising Engine) is recognised as a legitimate future
product extension of ICE. The decision is explicitly NOT to build it yet.

**Build trigger:**
- 2-3 paying ICE clients confirmed
- Client demand for paid amplification explicitly validated
- All prerequisites in docs/iae/01_iae_prerequisites.md met

**Documentation:** docs/iae/

---

## D072 — Audience as Asset — Schema Pattern
**Date:** April 2026 | **Status:** ✅ Live — deployed 7 Apr 2026

**Decision:**
Audience data has a dual nature — fact and configuration-linked.

```
c.client_audience_policy  — what to build (configuration)
m.audience_asset          — what got built (fact, FK to c.client)
m.audience_performance    — how it performed in IAE
k.vw_audience_summary     — intelligence view (synthesises above)
```

k gains views, not tables. Guru got smarter, not fatter.
3 tables deployed. 6 seed rows (3 per client). k catalog updated.

---

## D073 — External AI Agents Strategy — n8n for Client Success, Internal First
**Date:** 7 April 2026 | **Status:** ✅ Decided

**Decision:**
ICE's Supabase-internal agent architecture handles 80% of what external agent
frameworks would do, and does it more reliably because it is closer to the data.
External agent tooling is deferred until ICE has paying clients and specific
gaps the internal architecture cannot fill.

**Build sequence:**
1. B5 (weekly email) — solves dashboard monitoring gap internally
2. n8n client success workflow — when paying clients confirmed and C1 live
3. CrewAI/LangGraph portfolio intelligence — when 5+ clients demand it

---

## D074 — QA Framework — Four-Layer Approach
**Date:** 7 April 2026 | **Status:** ✅ Partially live

**Layer 1** (B1, B2): Developer verification docs committed.
**Layer 2** (B3): Automated test runner — not yet built.
**Layer 3** (B4): m.run_system_audit() LIVE — 12/12 pass on first run, weekly cron active.
**Layer 4** (B5): Weekly manager report — not yet built.

---

## D075 — OpenClaw Architecture Learnings — ICE Roadmap Gaps Identified
**Date:** 7 April 2026 | **Status:** ✅ Recorded — informs Phase 3/4 roadmap

Gaps to close: vector search, parallel agent execution, self-improving prompts,
OpenClaw SOUL.md (F5), nightly intelligence council (Phase 4), security council.
What NOT to copy: local SQLite, personal CRM, food journal, VO video gen.
Key principle: every piece should feed every other piece.

---

## D076 — Video Tracker + Video Analyser (Phase 3 Video Pipeline)
**Date:** 8 April 2026 | **Status:** ✅ Live

video-worker v2.1.0 bug fixed. video-analyser v1.2.0 + YouTube Data API live
(ICE_YOUTUBE_DATA_API_KEY). Channel subscriptions (ingest v95, 2 channels, 6h cron).
Analyse tab live in dashboard Monitor section.

---

## D077 — HeyGen Avatar Pipeline — Architecture
**Date:** 8 April 2026 | **Status:** ✅ Live

HeyGen API key tested (600 credits). c.client_avatar_profile table, consent form v1.0
(L005 satisfied). ICE_HEYGEN_API_KEY in Edge Function secrets.

---

## D078 — video_short_avatar is_buildable = true
**Date:** 9 April 2026 | **Status:** ✅ Live

video_short_avatar in t.5.3_content_format set is_buildable=true.
Format advisor will now select it for conversational/educational content.

---

## D079 — heygen-worker Script Resolution Pattern
**Date:** 9 April 2026 | **Status:** ✅ Live

heygen-worker reads narration_text + stakeholder_role from draft_format.video_script.
Stakeholder_role → c.brand_avatar lookup for avatar ID and voice ID.

---

## D080 — Alex Avatar Smile Issue
**Date:** 9 April 2026 | **Status:** ✅ Noted — cosmetic only

Fix for next avatar: add "neutral, composed expression — not smiling broadly".
Does not affect pipeline functionality. Applied to all subsequent avatar briefs.

---

## D081 — Character Maturity Principle — Solo Videos Before Conversations
**Date:** 9 April 2026 | **Status:** ✅ Decided

Minimum 10 solo videos published per character before conversation eligibility.
Both characters in a proposed pair must independently meet the threshold.
Review at 60-day mark (approximately June 2026).

---

## D082 — Dual-Character Conversation Format — Deferred to Phase 4
**Date:** 9 April 2026 | **Status:** ✅ Decided — deferred, not cancelled

Build trigger: both characters ≥ 10 solo videos + stitching solution validated.

---

## D083 — Client Onboarding Pipeline Architecture
**Date:** 11 April 2026 | **Status:** ✅ Live

7-step public onboarding form → dashboard review → atomic approve pattern.
All functions SECURITY DEFINER. approve_onboarding() creates client + portal_user
+ agreement atomically. First client: Care for Welfare (3eca32aa). Portal confirmed working.
See sync_state.md for full function list.

---

## D084 — NDIS Support Item Taxonomy — Reference Tables
**Date:** 11 April 2026 | **Status:** ✅ Designed — build queued (Brief 011)

**Decision:**
NDIS Support Catalogue and Registration Group data lives in the t schema as reference
tables, loaded from NDIA published documents, updated annually each July.
Linked to clients via c schema junction tables following the existing t/c pattern.

**Why:**
NDIS item numbers are the shared anchor that normalises free-text service descriptions
across clients. A client who types "OT home visits" and one who types "home assessment
by an OT" both map to the same item number. This enables signal scoring precision,
cross-client content leverage, and future compliance price-limit checking.

**Four tables:**

`t.ndis_registration_group`
- registration_group_id TEXT (PK) — e.g. "0104"
- group_name TEXT — official NDIA name
- plain_description TEXT — AI-written plain English
- profession_slugs TEXT[] — FK to t.profession

`t.ndis_support_item`
- item_number TEXT (PK) — e.g. "01_022_0110_1_3"
- registration_group_id TEXT — FK to t.ndis_registration_group (primary group)
- support_category_number INT — 1–15
- support_category_name TEXT
- item_name TEXT — official NDIA name
- plain_description TEXT — AI-written for content generation context
- cross_group_ids TEXT[] — other groups that can also deliver this item
- profession_slugs TEXT[] — FK to t.profession
- price_limit_aud NUMERIC — current price limit (future compliance guard)
- unit TEXT — 'per hour' | 'per session' | 'per report'
- is_active BOOL — false = retired item
- effective_from DATE — financial year this version applies from

`c.client_registration_group`
- client_id UUID — FK to c.client
- registration_group_id TEXT — FK to t.ndis_registration_group
- confirmed_by_client BOOL
- inferred_from_profession BOOL

`c.client_support_item`
- client_support_item_id UUID (PK)
- client_id UUID — FK to c.client
- item_number TEXT — FK to t.ndis_support_item
- client_description TEXT — their words, preserved as-is
- is_featured BOOL — featured items get higher bundler weighting
- source TEXT — 'onboarding_form' | 'ai_mapped' | 'pk_manual' | 'reg_group_inferred'

**Data source:** NDIA publishes Support Catalogue as Excel annually (July FY start).
One load task per year. plain_description column AI-written by Claude on load.

**Scope:** NDIS only. Property vertical has no equivalent government catalogue.
Physical products deferred entirely.

**Annual maintenance:** New items → INSERT. Retired items → is_active = false + alert
clients. Price changes → update price_limit_aud. One task, under 2 hours each July.

---

## D085 — ICE Compliance Philosophy — Medium Not Enforcer
**Date:** 11 April 2026 | **Status:** ✅ Decided — governs all compliance rule design

**Decision:**
ICE is a content publishing medium, not a compliance enforcement service.
The NDIS Code of Conduct applies identically to all providers regardless of
registration status. ICE's role is to not be the instrument of a breach —
not to police what clients can publish.

**Key findings that drove this decision:**
- 245,762 unregistered vs 21,387 registered NDIS providers (92% unregistered)
- NDIS Code of Conduct applies equally to both — one baseline, not two rule sets
- ICE is NOT a "platform provider" under NDIS law (platform providers connect
  participants with workers and collect NDIS funding — ICE does neither)
- ICE's peer group is NDIS marketing agencies — not regulated by the Commission
- Human approval step is the compliance gate, not the AI compliance engine

**Rule design consequences:**
- Previous HARD_BLOCK rules based on registration status are removed
- All rules rewritten as SOFT_WARN (flag for human review, client decides)
- One exception: content that demeans or exploits people with disability
  remains HARD_BLOCK — this makes ICE a co-publisher of harmful content,
  not just a medium. Australian Consumer Law applies regardless of client approval.
- No registration number ever required from clients
- Registered vs unregistered is self-declared context, never enforced

**What ICE compliance rules now cover (4 of 7 Code obligations):**
1. Dignity and respect — no demeaning or exploitative language (HARD_BLOCK)
2. Honesty and transparency — no false eligibility claims (SOFT_WARN)
3. Privacy — no identifiable participant content without implied consent (SOFT_WARN)
4. Rights — no content that undermines participant choice and control (SOFT_WARN)

Obligations 3, 5, 7 (safe delivery, raise concerns, prevent misconduct) are
operational — not content-relevant. ICE cannot affect or monitor these.

---

## D086 — Provider Type on c.client — Two Fields, Self-Declared
**Date:** 11 April 2026 | **Status:** ✅ Designed — build queued (Brief 011)

**Decision:**
Only two NDIS-related fields on c.client. Both self-declared, never enforced.

`serves_ndis_participants` BOOL
— Determines whether NDIS Code of Conduct compliance rules apply at all.
— A physio with no NDIS clients is different from one who has 80% NDIS.

`ndis_registration_status` TEXT
— 'registered' | 'unregistered' | 'mixed' | 'unknown'
— Self-declared. Used for content tone context only.
— Never enforced. Never gate-kept. Client knows their own status.
— 'mixed' covers practices registered for some services, unregistered for others (real and common).
— 'unknown' is a valid answer — many smaller providers are uncertain.

**What was removed from the design:**
- Registration number — private, not ICE's to demand
- Registration expiry date — client's responsibility to manage
- Registration group enforcement — removed per D085
- Hard gates based on registration status — removed per D085

**Onboarding form questions (plain language):**
1. "Do you work with NDIS participants?" Yes / No → sets serves_ndis_participants
2. "Are you a registered NDIS provider?" Yes / No / Some services / Not sure
   → sets ndis_registration_status
3. "If registered, what registration groups do you hold?" (optional free text)
   → feeds t.ndis_registration_group lookup, not enforced

---

## D087 — Onboarding Content Strategy Layer
**Date:** 11 April 2026 | **Status:** ✅ Designed — build queued (Brief 011)

**Decision:**
The 7-step onboarding form must capture what the client wants their content
to achieve, not just who they are. This data feeds the AI profile directly
and makes content relevant from day one.

**What was added to the form:**

Step 1 (Identity) — logo upload field added:
- "Upload your logo (optional — we'll find it from your website if not provided)"
- Accepts PNG, SVG, JPG. Stored in Supabase Storage on submit.

Step 2 (Services) — service list field added:
- "List the services you want featured in your content. One per line."
- Free text. AI maps to NDIS item numbers during profile scan.
- Preserved verbatim in c.client_support_item.client_description.

New question in Step 3 (Objectives) — content goals:
- "What do you want your content to achieve?" Multi-select in plain language:
  - Educate people about NDIS and disability
  - Promote our specific services
  - Build our reputation and brand
  - Share community stories and outcomes
  - Show we are trustworthy and credible
- ICE calculates content mix automatically from selections
- Client does not set percentages

**What was explicitly NOT added to the public form:**
- Format preferences — clients have no frame of reference at onboarding.
  Add to portal Settings after they've seen 2–3 weeks of content.
- "Topics to avoid" — creates anxiety at the sales stage. PK adds
  this to the AI profile manually after the onboarding call.
- Physical products — deferred entirely. Different business model,
  not ready to design.
- Content mix percentages — calculated by ICE, not entered by client.

**Brand extraction pipeline (runs on approval):**
- brand-scanner Edge Function: scrapes website → extracts logo URL
  (og:image, schema.org, favicon) → downloads to Supabase Storage
  → extracts dominant hex colours → writes to c.client_brand_profile
- Falls back to uploaded logo if scrape fails
- Falls back to manual entry by PK if both fail
- Async — PK sees spinner, checklist populates when complete
- LinkedIn scrape is best-effort (blocks scrapers) — not a required item

**AI profile bootstrap pipeline (runs on approval):**
- Fetches website + Facebook public page via Jina
- Sends to Claude with NDIS vertical context + service list
- Generates draft: persona, brand voice, profession slug, system prompt
- Writes to client_ai_profile with status = 'draft'
- Content generation holds 48 hours (or until PK activates)
- Portal shows "Your first posts are being prepared" message during hold
- Profile is versioned — re-running scan creates new draft, not overwrite

**Checklist gate (in dashboard before approve button):**
- Logo found/uploaded ✓/✗
- Colour palette extracted ✓/✗
- AI profile drafted ✓ needs review
- All form sections complete ✓/✗
- Any flagged fields from Request Info flow
- PK can override any item inline before approving

---

## D088 — Audit Trail Hardening + Portal Architecture
**Date:** 11 April 2026 | **Status:** ✅ Designed — build queued (Brief 011)

**Trigger:** Informal NDIS audit exercise — asked: if the Commission investigated
a client, could ICE demonstrate it acted as a responsible publisher?

**Finding:** ICE is NOT a platform provider under NDIS law (platform providers
connect participants with workers and collect NDIS funding — ICE does neither).
ICE is a B2B content publishing tool, comparable to an NDIS marketing agency.
Not subject to Commission regulation. Not subject to July 2026 mandatory registration.

**Gaps identified and decisions made:**

**Gap F5 — No record of who approved each draft and when:**
Add to m.post_draft:
- `approved_by` TEXT — portal_user_id (UUID as text) or 'auto-approver'
- `approved_at` TIMESTAMPTZ
- `auto_approval_scores` JSONB — the 9-gate scores if auto-approved, null if human

**Gap F6 — Compliance flags not recorded per draft:**
Add to m.post_draft:
- `compliance_flags` JSONB — array of {rule_id, severity, reason} for any
  rules that fired during ai-worker generation. Empty array if none.
  Auto-approver also writes its gate scores here.

**Gap F7 — Published content archive is deletable:**
Add immutable policy:
- DB trigger on m.post_draft: BEFORE DELETE, raise exception if
  approval_status = 'published'. Soft-archive only — never hard delete.
- DB trigger on m.post_publish: BEFORE DELETE, raise exception always.
  Published records are permanent audit trail.

**Gap F8 — Auto-approver creates no-human-in-loop path for external clients:**
Product decision: external clients default to manual approval in portal.
- New field on c.client_publish_profile: `require_client_approval` BOOL default true
- Auto-publish is opt-in for external clients, not the default
- Clients toggle this in portal Settings when ready
- Internal clients (NDIS Yarns, PP) unaffected — already set to auto

**Gap F9 — Service agreement not legally reviewed:**
Already tracked as L001. Hard gate before external client #1.
No build action — legal review required.

**Portal sidebar redesign (also decided this session):**
- Left sidebar replaces top navigation bar
- Invegent logo + "Content Engine" label at top of sidebar
- Nav items: Home, Inbox (with badge), Calendar, Performance, Connect Platforms, Sources
- Client name + plan + avatar at bottom of sidebar (not in header)
- "powered by Invegent" in portal footer — small, always present
- Collapsible sidebar (icon-only mode) for more content width
- Mobile: bottom tab bar (Home, Inbox, Calendar, Stats, Account)

**Magic link delivery fix (D085 original — now resolved):**
Resend SMTP configured in Supabase Auth custom SMTP settings.
Magic links route through Resend → reliable delivery including Hotmail.
This is P0 before any external client approval.

**Platform OAuth connect page (D084 original — now designed):**
New portal page at /connect:
- Shows platforms allocated to client's package
- Connect button per platform initiates OAuth flow
- Facebook OAuth: /api/connect/facebook → callback → store long-lived page token
- LinkedIn OAuth: /api/connect/linkedin → callback → store org token
- Status: Connected ✓ / Not Connected ⚠ per platform
- Connect banner on home page if any platform unconnected
- Facebook external clients blocked until Meta Standard Access confirmed
- LinkedIn connect blocked until API approved
- New SECURITY DEFINER functions: get_client_connect_status(), store_platform_token()

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| brand-scanner Edge Function | Async website scrape → logo → colours → c.client_brand_profile | Phase 3 |
| AI profile bootstrap Edge Function | Website + Facebook → Claude draft → client_ai_profile status=draft | Phase 3 |
| NDIS Support Catalogue data load | Load t.ndis_registration_group + t.ndis_support_item from NDIA Excel | Phase 3 |
| Portal sidebar redesign build | Collapsible sidebar, Invegent top, client footer, mobile bottom nav | Phase 3 |
| Platform OAuth connect page | /connect portal page, Facebook + LinkedIn OAuth routes | Phase 3 |
| Legal review of service agreement | L001 — hard gate before external client #1 | Before C1 |
| Prospect demo generator (F1) | ~1 day. Needed before first external client conversation | Phase 3 |
| Client health weekly report email (B5) | ~2 days. Sunday Edge Function via Resend | Phase 3 |
| Publisher schedule wiring | c.client_publish_schedule → publisher assigns scheduled_for | Phase 3 |
| AI compliance rule generator | ANZSCO tasks + code_of_conduct_url → Claude generates draft rules | Phase 3 |
| OpenClaw SOUL.md (F5) | ICE context for @InvegentICEbot | Near term |
| pgvector layer | Natural language queries on post_publish + content items | Phase 3 |
| Self-improving auto-approver thresholds | Rejection feedback → threshold update loop | Phase 3 |
| Instagram publisher | After Meta App Review approved | Phase 3 |
| IAE Phase A build | After all prerequisites in docs/iae/01 are met | Phase 3+ |
| Model router | When AI costs become significant | Phase 4 |
| video_short_avatar_conversation | After D081 maturity threshold met | Phase 4 |
| Nightly parallel intelligence council | 8-agent cross-client nightly analysis | Phase 4 |
| SaaS vs managed service | When 10 clients served 3+ months | Phase 4 |
