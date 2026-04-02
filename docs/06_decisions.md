# ICE — Decisions Log

## Purpose

Every significant architectural, strategic, or product decision
is recorded here with context and reasoning.

---

## D001–D043 — See previous commits

---

## D044–D057 — See commit 9b810f0 (31 Mar 2026)

---

## D058 — Property Pulse Compliance-Aware System Prompt
**Date:** 31 March 2026 | **Status:** ✅ Live

Embedded ASIC/AFSL financial compliance rules into PP brand_identity_prompt.
Five hard-block groups: investment returns, credit/lending, tax/depreciation,
product promotion, disclaimer rule.

---

## D059 — m.post_format_performance Aggregation
**Date:** 31 March 2026 | **Status:** ✅ Live

refresh_post_format_performance() SQL function. Aggregates post_performance
by ice_format_key per client, 7/30/all-time windows. pg_cron daily 3:15am UTC.

---

## D060 — YouTube Pipeline Activation (Both Clients)
**Date:** 1 April 2026 | **Status:** ✅ Live

youtube-publisher v1.2.0 — DB-driven credential_env_key lookup.
OAuth tokens for both channels. PP YouTube connected and first Short published.
NDIS Yarns YouTube pending Brand Account conversion.

---

## D061 — OpenClaw Installed (Telegram Remote Control)
**Date:** 1 April 2026 | **Status:** ✅ Live

OpenClaw v2026.3.31. @InvegentICEbot. anthropic/claude-sonnet-4-6 via Max plan.
Gateway auto-starts on boot. Run `openclaw tui` after each restart.

---

## D062 — post_seed Platform Column + Constraint Fix
**Date:** 2 April 2026 | **Status:** ✅ Live

Added `platform text` column to `m.post_seed`. Replaced `post_seed_uniq_run_item`
constraint with `post_seed_uniq_run_item_platform` on (digest_run_id, digest_item_id, platform).
Updated `seed_client_to_ai_v2` to exclude YouTube from text pipeline.

---

## D063 — Pipeline Doctor Log Harvester
**Date:** 2 April 2026 | **Status:** ✅ Live

`m.harvest_pipeline_doctor_log()` SECURITY DEFINER function reads doctor HTTP response
from `net._http_response` and writes to log. pg_cron at :17/:47. 37 records in log.

---

## D064 — post_publish_queue acknowledged_at Pattern
**Date:** 2 April 2026 | **Status:** ✅ Live

Added `acknowledged_at` + `acknowledged_by` to `m.post_publish_queue`.
Doctor harvester skips acknowledged dead items from issues_found count.

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

t.profession table (12 professions). profession_slugs[] on compliance rules.
profession_slug on m.compliance_policy_source, m.compliance_review_queue, c.client.
Care for Welfare = occupational_therapy.
get_compliance_rules(vertical, profession) SECURITY DEFINER function.
OT gets 22 rules. Support worker gets 19. No false positives.

---

## D067 — Claude Code Agentic Loop — First Autonomous Execution
**Date:** 2 April 2026 | **Status:** ✅ Proven

**Decision:**
Establish the Claude Code agentic loop as the standard execution pattern
for well-scoped ICE build tasks that do not require human decision-making.

**What happened:**
A detailed brief (`docs/briefs/2026-04-02-profession-compliance-wire.md`) was written
in chat, committed to GitHub, then Claude Code was pointed at it from
`C:\Users\parve\Invegent-content-engine`. All 4 tasks completed autonomously:

1. ai-worker v2.7.0 deployed — profession-scoped compliance rules (22 for OT, 19 for support worker)
2. t.profession extended — 5 columns added, all 12 professions backfilled
3. k.table_registry — 7 tables updated from TODO to full documentation
4. Cowork token alert task created + token health log initialised

Claude Code handled one data discrepancy correctly: ANZSIC code 8699 didn't exist
in the DB, so it used NULL rather than forcing an invalid FK. No human intervention.

**The brief format that works:**
- Current state check query at the start of each task (idempotent)
- Exact SQL/code with no ambiguity
- Verification query with explicit expected result
- Error handling instructions (skip and log, don't guess)
- Completion protocol (write progress file)

**Pattern going forward:**
Any task that is: well-scoped + has clear verification criteria + doesn't require
human judgment mid-execution → write a brief, commit it, run Claude Code.
Complex or ambiguous tasks stay in the chat interface.

**Directory:** `C:\Users\parve\Invegent-content-engine`
**MCPs needed:** Supabase MCP + GitHub MCP (both in claude_desktop_config.json)

---

## D068 — k Schema as Primary Navigation Tool for AI Sessions
**Date:** 2 April 2026 | **Status:** ✅ Adopted

**Decision:**
Replace ad-hoc `information_schema.columns` discovery queries with structured
nav queries against `k.vw_table_summary` and `k.vw_db_columns` at session start.

**Rationale:**
Every session was spending 3-5 tool calls discovering column names and FK relationships
that already exist in the k schema registry. The k schema was built for exactly this
purpose but was not being used by Claude.

**Standard session startup pattern:**
```sql
-- Before working with any table, run:
SELECT schema_name, table_name, purpose, columns_list, fk_edges
FROM k.vw_table_summary
WHERE schema_name = 'x' AND table_name = 'y';
```

**Known k schema gaps (to be fixed in next Claude Code brief):**
- `c` and `f` schemas excluded from `refresh_column_registry()` — their columns not synced
- `sync_registries()` has a bug: references `object_type` but view has `object_kind`
- No pg_cron job for `refresh_catalog()` — only fires on CREATE TABLE, not ALTER TABLE
- 23 tables still have TODO purpose; 358 columns undocumented
- Manually-coded purpose entries preserved on refresh (correct) but no AI-assisted
  generation for new tables

**See:** `docs/briefs/2026-04-02-k-schema-repair.md` for the repair brief.

---

## Decisions Pending

| Decision | Context | Target Date |
|---|---|---|
| k schema repair | Fix refresh_column_registry (add c+f schemas), fix sync_registries bug, add pg_cron schedule, AI-assisted purpose generation for TODO tables | Next Claude Code brief |
| Wire ai-worker profession scoping | **DONE by Claude Code 2 Apr 2026** | ✅ Complete |
| AI Diagnostic Tier 2 | Prerequisites met (doctor log 37 records). Build: pre-approved action list | Next session |
| NDIS Yarns YouTube | Convert channel to Brand Account, then connect via dashboard | Next session |
| Compliance queue review | 5 items with AI analysis — mark reviewed in dashboard | Next session |
| Prospect demo generator | ~1 day. Needed before first external client conversation | Phase 3 |
| Client health weekly report (email) | ~2 days. Sunday night Edge Function via Resend | Phase 3 |
| Invegent brand pages setup | Own ICE client | Phase 3 |
| OpenClaw SOUL.md | Define ICE context for @InvegentICEbot | Phase 3 |
| Instagram publisher | 0.5 days after Meta App Review approved | Phase 3 |
| YouTube Stage C — HeyGen avatar | Phase 4 | Phase 4 |
| Model router implementation | When AI costs become significant | Phase 4 |
| SaaS vs managed service long-term | When 10 clients served for 3+ months | Phase 4 |
