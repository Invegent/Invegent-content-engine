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

Standard pattern:
```sql
SELECT schema_name, table_name, purpose, columns_list, fk_edges
FROM k.vw_table_summary
WHERE schema_name = 'x' AND table_name = 'y';
```

---

## D069 — k Schema Full Repair
**Date:** 2 April 2026 | **Status:** ✅ Complete

All 8 schemas covered. 117 → 144 tables documented. Weekly pg_cron refresh active.
See earlier commit for full details.

---

## D070 — AI Diagnostic Agent v1.0.0 — Tier 2 Daily Health Report
**Date:** 2 April 2026 | **Status:** ✅ Live

ai-diagnostic Edge Function. Trend analysis, per-client scoring, AI recommendations.
/diagnostics page in dashboard.

---

## D071 — IAE Strategic Decision — Do Not Build Yet
**Date:** April 2026 | **Status:** ✅ Decided

Build trigger: 2-3 paying clients confirmed + demand validated + prerequisites met.
Documentation: docs/iae/

---

## D072 — Audience as Asset — Schema Pattern
**Date:** April 2026 | **Status:** ✅ Live — deployed 7 Apr 2026

c.client_audience_policy, m.audience_asset, m.audience_performance, k.vw_audience_summary.
3 tables deployed. 6 seed rows.

---

## D073 — External AI Agents Strategy — n8n for Client Success, Internal First
**Date:** 7 April 2026 | **Status:** ✅ Decided

Internal Supabase agent architecture first. n8n deferred until paying clients confirmed.

---

## D074 — QA Framework — Four-Layer Approach
**Date:** 7 April 2026 | **Status:** ✅ Partially live

Layer 3 (B4): m.run_system_audit() LIVE. Layer 2 (B3) + Layer 4 (B5) not yet built.

---

## D075 — OpenClaw Architecture Learnings
**Date:** 7 April 2026 | **Status:** ✅ Recorded

Gaps: vector search, parallel agents, self-improving prompts, nightly council.
Key principle: every piece feeds every other piece.

---

## D076 — Video Tracker + Video Analyser
**Date:** 8 April 2026 | **Status:** ✅ Live

video-worker v2.1.0, video-analyser v1.2.0, YouTube Data API, channel subscriptions.

---

## D077 — HeyGen Avatar Pipeline — Architecture
**Date:** 8 April 2026 | **Status:** ✅ Live

ICE_HEYGEN_API_KEY, c.client_avatar_profile, consent form v1.0.

---

## D078 — video_short_avatar is_buildable = true
**Date:** 9 April 2026 | **Status:** ✅ Live

---

## D079 — heygen-worker Script Resolution Pattern
**Date:** 9 April 2026 | **Status:** ✅ Live

---

## D080 — Alex Avatar Smile Issue
**Date:** 9 April 2026 | **Status:** ✅ Noted — cosmetic only

---

## D081 — Character Maturity Principle — Solo Videos Before Conversations
**Date:** 9 April 2026 | **Status:** ✅ Decided

Minimum 10 solo videos per character before conversation eligibility. Review ~June 2026.

---

## D082 — Dual-Character Conversation Format — Deferred to Phase 4
**Date:** 9 April 2026 | **Status:** ✅ Decided — deferred

Build trigger: both characters ≥10 solo videos + stitching solution validated.

---

## D083 — Client Onboarding Pipeline Architecture
**Date:** 11 April 2026 | **Status:** ✅ Live

7-step public form → dashboard review → atomic approve. All functions SECURITY DEFINER.
First client: Care for Welfare (3eca32aa). Portal confirmed working.

---

## D084 — NDIS Support Item Taxonomy — Reference Tables
**Date:** 11 April 2026 | **Status:** ✅ Tables built — data load pending (needs NDIA Excel)

4 tables created: t.ndis_registration_group, t.ndis_support_item,
c.client_registration_group, c.client_support_item.
Data source: NDIA Support Catalogue Excel (annual July FY publish).
Load task pending — requires Excel file from ndia.gov.au.

---

## D085 — ICE Compliance Philosophy — Medium Not Enforcer
**Date:** 11 April 2026 | **Status:** ✅ Decided and implemented

ICE is a content publishing medium, not a compliance enforcement service.
92% of NDIS providers are unregistered. Code of Conduct applies equally to both.
One HARD_BLOCK only: content that demeans or exploits people with disability.
All other rules are SOFT_WARN (flag for human review, client decides).
Self-declared fields only (serves_ndis_participants, ndis_registration_status).

---

## D086 — Provider Type on c.client — Two Fields, Self-Declared
**Date:** 11 April 2026 | **Status:** ✅ Live

serves_ndis_participants BOOL + ndis_registration_status TEXT on c.client.
Both self-declared, never enforced. CFW set to serves_ndis=true, registered.

---

## D087 — Onboarding Content Strategy Layer
**Date:** 11 April 2026 | **Status:** ✅ FULLY LIVE (12 Apr 2026 — Briefs 014–017)

All components built and deployed:
- Onboarding form: logo upload (Step 1), service list + NDIS questions (Step 2),
  content objectives multi-select (Step 4). Brief 014.
- Dashboard checklist: 9-item ReadinessChecklist, Run Scans button (violet). Brief 015.
- brand-scanner Edge Function v1.0.0: website scrape → logo → colours
  → submission JSONB pre-approval → copied to c.client_brand_profile on approval. Brief 016.
- ai-profile-bootstrap Edge Function v1.0.0: Jina + Claude → persona + system prompt
  → submission JSONB pre-approval → copied to c.client_ai_profile (status=draft) on approval. Brief 017.
- Portal CSS custom properties: layout reads c.client_brand_profile, injects
  --brand-primary/secondary/accent on root div. Sidebar shows client logo.
  Fallback: #06b6d4 (cyan-500). Brief 018.

Critical fix (12 Apr): c.onboarding_submission had no form_data JSONB column.
Added column + updated submit_onboarding() to preserve all new fields.

---

## D088 — Audit Trail Hardening + Portal Architecture
**Date:** 11 April 2026 | **Status:** ✅ FULLY LIVE (12 Apr 2026 — Briefs 012–013, 015)

All components built and deployed:
- m.post_draft: approved_by, approved_at, auto_approval_scores, compliance_flags added.
- Immutable triggers: cannot delete published drafts or post_publish records.
- require_client_approval on c.client_publish_profile.
- Portal sidebar: left collapsible sidebar, client identity footer, mobile bottom bar. Brief 012.
- Platform OAuth connect page /connect: Facebook + LinkedIn routes built,
  gated by FACEBOOK_OAUTH_ENABLED / LINKEDIN_OAUTH_ENABLED env vars. Brief 013.
- Connect banner on portal home if any platform unconnected.
- Resend SMTP configured for reliable magic link delivery.

Pending (external gates):
- FACEBOOK_OAUTH_ENABLED=true: set when Meta Standard Access confirmed
- LINKEDIN_OAUTH_ENABLED=true: set when LinkedIn API approved

---

## Decisions Pending

| Decision | Context | Target |
|---|---|---|
| NDIS Support Catalogue data load | Tables exist. Needs NDIA Excel from ndia.gov.au | Phase 3 |
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
