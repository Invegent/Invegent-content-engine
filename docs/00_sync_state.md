# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-02 (end-of-session reconciliation)
> Next automated overwrite: midnight AEST by Cowork nightly reconciler

---

## HOW TO USE THIS FILE

Read this file at session start before any code or queries.
If this file contradicts memory or 04_phases.md, this file wins.

---

## SESSION STARTUP PROTOCOL

**Do this at the start of every session, in order:**

1. Read this file (`docs/00_sync_state.md`)
2. For any table you are about to work with, query k schema FIRST:
   ```sql
   SELECT schema_name, table_name, purpose, columns_list, fk_edges, allowed_ops
   FROM k.vw_table_summary
   WHERE schema_name = 'x' AND table_name = 'y';
   ```
3. For column-level detail:
   ```sql
   SELECT column_name, data_type, column_purpose, is_foreign_key, fk_ref_schema, fk_ref_table
   FROM k.vw_db_columns
   WHERE schema_name = 'x' AND table_name = 'y';
   ```
4. Do NOT fall into discovery mode. k.vw_table_summary is the single-stop navigation layer.

**k schema status (as of 2 Apr 2026 — FULLY REPAIRED):**
- 117 tables documented across a, c, f, k, m, t schemas — zero TODO entries
- c and f schemas now fully registered and column-synced (207 + 149 columns)
- Weekly pg_cron: `k-schema-refresh-weekly` every Sunday 3am UTC
- `sync_registries()` and `refresh_column_registry()` bugs fixed
- Manually-coded purpose entries are preserved on every refresh — safe to re-run

---

## CLAUDE CODE AGENTIC LOOP

For well-scoped build tasks that don't require human judgment mid-execution:
1. Write brief in `docs/briefs/YYYY-MM-DD-task-name.md`
2. Run Claude Code from `C:\Users\parve\Invegent-content-engine`
3. Prompt: "Read docs/briefs/... and execute all tasks autonomously"
4. MCPs needed: Supabase MCP + GitHub MCP

Proven 2 Apr 2026 — 4 tasks, no human intervention, minutes not hours. (D067)

---

## CURRENT PHASE

**Phase 3 — Expand + Personal Brand** (active)
Phase 1 complete. Phase 2 mostly complete — LinkedIn API blocked externally.

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Version | Notes |
|---|---|---|
| ai-worker | v2.7.0 | Profession-scoped compliance. OT = 22 rules, global rules included |
| compliance-reviewer | v1.3.0 | AI analysis of policy changes, profession-scoped |
| compliance-monitor | 14 | Monthly 1st, 9:00 UTC |
| pipeline-doctor | 13 | :15/:45 — harvested to m.pipeline_doctor_log |
| pipeline-fixer | v1.1.0 | :25/:55 |
| youtube-publisher | v1.2.0 | DB-driven credential lookup |
| publisher | 58 | |
| auto-approver | v1.4.0 | |
| image-worker | v3.9.1 | |
| pipeline-ai-summary | 14 | Hourly :55 |
| linkedin-publisher | 15 | Code done, API in review |

25 functions ACTIVE. No functions in error state.

---

## PIPELINE STATE

| Client | Platform | Status | Token expires | Profession |
|---|---|---|---|---|
| NDIS Yarns | Facebook | ✅ Active | 31 May 2026 (43 days) | occupational_therapy |
| NDIS Yarns | YouTube | ⏳ Needs Brand Account conversion | — | — |
| Property Pulse | Facebook | ✅ Active | Not tracked (env var) | NULL |
| Property Pulse | YouTube | ✅ Active | 5yr stored in DB | NULL |

**Compliance queue:** 5 NDIS items with AI analysis — status=pending, awaiting manual mark-reviewed in dashboard.

---

## KEY SCHEMA — 2 APR 2026 CHANGES

| Table | Change |
|---|---|
| `m.post_seed` | Added `platform`. Constraint: post_seed_uniq_run_item_platform |
| `m.post_publish_queue` | Added `acknowledged_at`, `acknowledged_by` |
| `m.compliance_review_queue` | Added `ai_analysis`, `ai_confidence`, `ai_reviewed_at`, `ai_error` |
| `m.compliance_policy_source` | Added `profession_slug`, `vertical_context` |
| `t.profession` | NEW — 12 professions, `anzsco_occupation_id`, `code_of_conduct_url`, `regulator_website` |
| `t.5.7_compliance_rule` | Added `profession_slugs text[]` |
| `c.client` | Added `profession_slug` |
| `k.*` | All 3 refresh functions fixed; c+f schemas added; 117 tables fully documented |

## KEY FUNCTIONS

| Function | Purpose |
|---|---|
| `public.get_compliance_rules(vertical, profession)` | Scoped rule loading — used by ai-worker + compliance-reviewer |
| `public.store_compliance_ai_analysis(...)` | SECURITY DEFINER write to compliance queue |
| `m.harvest_pipeline_doctor_log()` | Reads doctor HTTP response → writes to log |
| `k.refresh_catalog()` | Syncs all schemas into k registry (runs Sunday 3am UTC) |

## PG_CRON SCHEDULE

| Job | Schedule | Purpose |
|---|---|---|
| compliance-reviewer-monthly | 5 9 1 * * | AI analysis after compliance-monitor |
| pipeline-doctor-log-harvester | 17,47 * * * * | 2 min after each doctor run |
| weekly-token-alert | 0 22 * * 4 | Friday 8am AEST token expiry check |
| k-schema-refresh-weekly | 0 3 * * 0 | Sunday 3am UTC — refresh_catalog() |

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
| Compliance queue 5 items pending | LOW | Mark reviewed in dashboard Monitor > Compliance |
| NDIS Yarns YouTube | MED | Convert channel to Brand Account, connect via dashboard |
| OpenClaw SOUL.md | LOW | Define ICE context for @InvegentICEbot |
| Meta App Review | 🔴 External | Next check 10 Apr 2026 |
| LinkedIn API | 🔴 External | Community Management API in review |

---

## WHAT IS NEXT

**Immediate (next session):**
1. AI Diagnostic Tier 2 — prerequisites met (doctor log 37 records). ~half day build.
2. NDIS Yarns YouTube — Brand Account conversion then connect.
3. Mark compliance queue reviewed (10 min in dashboard).

**Phase 3 build queue:**
- Prospect demo generator (~1 day) — needed before first client conversation
- Client health weekly report email (~2 days)
- Three Cowork auditor checks (1 hour)

Decisions through D069 in `docs/06_decisions.md`.
