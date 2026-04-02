# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-02 (manual reconciliation — end of session)
> Next automated overwrite: midnight AEST by Cowork nightly reconciler

---

## HOW TO USE THIS FILE

At the start of every session involving ICE technical work, read this file
before answering any question or writing any code. It tells you what is
actually deployed right now — not what the docs say should be deployed.
If this file contradicts memory or 04_phases.md, this file wins.

---

## SESSION STARTUP PROTOCOL

**Do this at the start of every session, in order:**

1. Read this file (`docs/00_sync_state.md`)
2. For any table you are about to work with, query the k schema BEFORE running information_schema:
   ```sql
   SELECT schema_name, table_name, purpose, columns_list, fk_edges, allowed_ops
   FROM k.vw_table_summary
   WHERE schema_name = 'x' AND table_name = 'y';
   ```
3. For column-level detail on any table:
   ```sql
   SELECT column_name, data_type, column_purpose, value_semantics, is_foreign_key, fk_ref_schema, fk_ref_table
   FROM k.vw_db_columns
   WHERE schema_name = 'x' AND table_name = 'y';
   ```
4. Do NOT fall into discovery mode. k.vw_table_summary is the single-stop navigation layer.

**Why k schema:**
- 7+ hours of taxonomy + DB documentation work by PK went into the k schema
- Querying information_schema re-discovers what k already knows
- k.vw_table_summary has: purpose, columns_list (all columns with types), FK edges, allowed ops, refresh cadence
- k.vw_column_enrichment_context has: full schema + table + column context in one row

**k schema known gaps (as of 2 Apr 2026):**
- c and f schemas excluded from column auto-sync — use information_schema for those columns
- 23 tables still have TODO purpose; 358 columns undocumented
- sync_registries() function has a bug (object_type vs object_kind) — do not call it
- Repair brief: docs/briefs/k-schema-repair.md

---

## CLAUDE CODE AGENTIC LOOP

For well-scoped build tasks that don't require human judgment mid-execution:
1. Write a brief in `docs/briefs/YYYY-MM-DD-task-name.md`
2. Run Claude Code from `C:\Users\parve\Invegent-content-engine`
3. Point it at the brief: "Read docs/briefs/... and execute all tasks autonomously"
4. MCPs needed: Supabase MCP + GitHub MCP (both in claude_desktop_config.json)

Proven 2 Apr 2026 — 4 tasks, no human intervention, completed in minutes. (D067)

---

## CURRENT PHASE

**Phase 3 — Expand + Personal Brand** (active)
Phase 1 complete. Phase 2 mostly complete — LinkedIn API blocked externally.

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Version | Status | Notes |
|---|---|---|---|
| ai-worker | v2.7.0 | ACTIVE | Profession-scoped compliance rules (D066). OT = 22 rules, support worker = 19. |
| compliance-reviewer | v1.3.0 | ACTIVE | Vertical + profession scoped AI analysis |
| compliance-monitor | 14 | ACTIVE | Monthly 1st, 9:00 UTC |
| pipeline-doctor | 13 | ACTIVE | :15/:45 — logging via harvester |
| pipeline-fixer | v1.1.0 | ACTIVE | :25/:55 |
| youtube-publisher | v1.2.0 | ACTIVE | DB-driven credential lookup |
| publisher | 58 | ACTIVE | |
| auto-approver | v1.4.0 | ACTIVE | |
| image-worker | v3.9.1 | ACTIVE | |
| pipeline-ai-summary | 14 | ACTIVE | Hourly :55 |
| linkedin-publisher | 15 | ACTIVE | Code done, API blocked |
| All others | various | ACTIVE | See Supabase dashboard |

25 functions ACTIVE. No functions in error state.

---

## PIPELINE STATE

| Client | Platform | Status | Token expires | Profession |
|---|---|---|---|---|
| NDIS Yarns | Facebook | ✅ Active | 31 May 2026 (43 days) | occupational_therapy |
| NDIS Yarns | YouTube | ⏳ Needs Brand Account conversion | — | — |
| Property Pulse | Facebook | ✅ Active | Not tracked (env var) | NULL |
| Property Pulse | YouTube | ✅ Active | 5yr stored in DB | NULL |

**Pipeline health:** Queue depth 0. Doctor log 37 records. All 7 checks green.
Compliance queue: 5 NDIS items with AI analysis, status=pending (awaiting manual review).

---

## KEY SCHEMA CHANGES (2 Apr 2026)

| Table | Change |
|---|---|
| `m.post_seed` | Added `platform` column. Constraint: post_seed_uniq_run_item_platform |
| `m.post_publish_queue` | Added `acknowledged_at`, `acknowledged_by` |
| `m.compliance_review_queue` | Added `ai_analysis`, `ai_confidence`, `ai_reviewed_at`, `ai_error` |
| `m.compliance_policy_source` | Added `profession_slug`, `vertical_context` |
| `t.profession` | NEW TABLE — 12 professions. Added `anzsco_occupation_id`, `anzsic_class_code`, `code_of_conduct_url`, `code_of_conduct_name`, `regulator_website` |
| `t.5.7_compliance_rule` | Added `profession_slugs text[]` |
| `c.client` | Added `profession_slug` |

## KEY FUNCTIONS

| Function | Purpose |
|---|---|
| `public.get_compliance_rules(vertical, profession)` | Load scoped rules. Used by compliance-reviewer AND ai-worker |
| `public.store_compliance_ai_analysis(...)` | SECURITY DEFINER write to compliance queue |
| `m.harvest_pipeline_doctor_log()` | Reads doctor HTTP response, writes to log |

## PG_CRON ADDITIONS

| Job | Schedule | Name |
|---|---|---|
| compliance-reviewer-monthly | 5 9 1 * * | After compliance-monitor on 1st of month |
| pipeline-doctor-log-harvester | 17,47 * * * * | 2 min after each doctor run |
| weekly-token-alert | 0 22 * * 4 | Friday 8am AEST (D067/Cowork) |

---

## GITHUB — LATEST COMMITS (2 Apr 2026)

| Repo | Message |
|---|---|
| Invegent-content-engine | docs: reconciliation + D062-D068, Claude Code agentic loop proven |
| Invegent-content-engine | docs: Claude Code brief — profession compliance wire |
| invegent-dashboard | chore: roadmap sync 2 Apr 2026 |
| invegent-dashboard | feat: compliance page — AI analysis panel, Run AI Review button |

---

## VERCEL FRONTENDS — LIVE

| App | URL | Status |
|---|---|---|
| invegent-dashboard | dashboard.invegent.com | READY |
| invegent-portal | portal.invegent.com | READY |
| invegent-web | invegent.com | READY |

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Action |
|---|---|---|
| NDIS Yarns YouTube | MED | Convert channel to Brand Account, connect via dashboard |
| k schema repair | MED | See docs/briefs/k-schema-repair.md — Claude Code brief ready to run |
| Compliance queue pending | LOW | 5 items with AI analysis — mark reviewed in dashboard |
| OpenClaw SOUL.md | LOW | Define ICE context for @InvegentICEbot |
| Meta App Review | 🔵 External | Next check 10 Apr 2026 |
| LinkedIn API | 🔵 External | Community Management API in review |

---

## CREDENTIALS STATUS

| Credential | Status |
|---|---|
| Anthropic API | Active — primary |
| NDIS Yarns Facebook | Active — expires 31 May 2026 (43 days) |
| Property Pulse Facebook | Active — env var, not tracked |
| Property Pulse YouTube | Active — DB stored |
| NDIS Yarns YouTube | Pending Brand Account conversion |
| ElevenLabs Creator | Active |
| Creatomate Essential | Active — $54/mo |
| Resend | Active |

---

## OPENCLAW

| Item | Value |
|---|---|
| Telegram bot | @InvegentICEbot |
| Model | claude-sonnet-4-6 (Max plan) |
| Status | ✅ Working |

**After any laptop restart:** run `openclaw tui` in PowerShell and leave open.

---

## EXTERNAL BLOCKERS

- LinkedIn: Community Management API review in progress
- Meta App Review: Business verification In Review — next check 10 Apr 2026

---

## WHAT IS NEXT

**Immediate:**
1. Run k-schema-repair Claude Code brief (docs/briefs/k-schema-repair.md)
2. AI Diagnostic Tier 2 build (doctor log has 37 records — prerequisites met)
3. NDIS Yarns YouTube — Brand Account conversion
4. Mark compliance queue reviewed

**Phase 3 build queue:**
- Prospect demo generator (~1 day)
- Client health weekly report email (~2 days)
- Three Cowork auditor checks (1 hour)

Decisions through D068 in `docs/06_decisions.md`.
