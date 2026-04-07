# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-07 (session close)
> Written by: PK + Claude reconciliation

---

## HOW TO USE THIS FILE

At the start of every session involving ICE technical work, read this file
before answering any question or writing any code. It tells you what is
actually deployed right now — not what the docs say should be deployed.
If this file contradicts memory or 04_phases.md, this file wins.

---

## SESSION STARTUP PROTOCOL

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

**k schema status (fully repaired, 2 Apr 2026):**
- 117 tables documented across a, c, f, k, m, t schemas — zero TODO entries
- New tables added 7 Apr: c.client_audience_policy, m.audience_asset, m.audience_performance, c.client_publish_schedule, m.system_audit_log
- Weekly pg_cron: `k-schema-refresh-weekly` every Sunday 3am UTC — safe to re-run

---

## CLAUDE CODE AGENTIC LOOP

For well-scoped build tasks that don't require human judgment mid-execution:
1. Write brief in `docs/briefs/YYYY-MM-DD-task-name.md`
2. Run Claude Code from `C:\Users\parve\Invegent-content-engine`
3. Prompt: "Read docs/briefs/... and execute all tasks autonomously"
4. MCPs needed: Supabase MCP + GitHub MCP

Proven 2 Apr 2026 — 4 tasks, no human intervention. (D067)

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (all 4 criteria verified 7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
Phase 2 mostly complete — LinkedIn API blocked externally.

**Phase 1 done criteria — verified with live data:**
- Auto-approver: 0 manual backlog both clients ✔
- Both clients: 5+ posts/week for 6+ consecutive weeks ✔
- 26 active feeds (13 per client) ✔
- Dashboard stable (system audit 12/12 pass) ✔

**Gate to first external client conversation is open.**

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Deploy# | Status | Notes |
|---|---|---|---|
| ai-worker | 68 | ACTIVE | v2.7.0, profession-scoped compliance |
| auto-approver | 29 | ACTIVE | v1.4.0, 9-gate logic |
| compliance-monitor | 14 | ACTIVE | monthly hash check |
| compliance-reviewer | 4 | ACTIVE | v1.3.0, AI analysis |
| content_fetch | 65 | ACTIVE | |
| draft-notifier | 16 | ACTIVE | |
| email-ingest | 15 | ACTIVE | |
| feed-intelligence | 20 | ACTIVE | |
| image-worker | **37** | ACTIVE | **v3.9.2** — carousel deadlock fix (7 Apr) |
| ingest | 94 | ACTIVE | |
| insights-worker | 32 | ACTIVE | |
| inspector | 82 | ACTIVE | |
| inspector_sql_ro | 37 | ACTIVE | |
| linkedin-publisher | 15 | ACTIVE | waiting on API approval |
| pipeline-ai-summary | 14 | ACTIVE | |
| pipeline-doctor | 13 | ACTIVE | |
| pipeline-fixer | 4 | ACTIVE | |
| publisher | 58 | ACTIVE | |
| series-outline | 15 | ACTIVE | |
| series-writer | 16 | ACTIVE | |
| tts-test | 11 | ACTIVE | |
| video-worker | 13 | ACTIVE | |
| wasm-bootstrap | 13 | ACTIVE | |
| youtube-publisher | **15** | ACTIVE | **v1.5.0** — post_publish INSERT fix (7 Apr) |
| youtube-token-test | 5 | ACTIVE | |

25 functions deployed. All ACTIVE.

**Version changes this session:**
- image-worker: 36 → 37 (v3.9.2 — carousel approval_status deadlock fixed)
- youtube-publisher: 13 → 15 (v1.5.0 — publish_meta → response_payload, attempt_no added)

---

## PIPELINE STATE

### Publishing (confirmed working — 7 Apr 2026)

| Format | NDIS-Yarns | Property Pulse |
|---|---|---|
| facebook text | ✅ publishing daily | ✅ publishing daily |
| facebook video_short_kinetic | ❓ none generated | ✅ confirmed |
| facebook video_short_stat | ❓ none generated | ✅ confirmed |
| facebook image_quote | ❓ pending | ✅ confirmed once (31 Mar) |
| facebook carousel | ⏳ unblocked 7 Apr | ⏳ unblocked 7 Apr |
| youtube | ❌ no video drafts generated | ✅ 4 videos uploaded |

**Carousel status:** 2 PP carousels unblocked this session. image-worker v3.9.2 will generate slides at next :00/:15/:30/:45 cron. Publisher will post within 10 min of image generation.

**YouTube PP status:** 4 videos live on channel (IDs: l-kkoFkZ6A4, qCs9fula6qU, Oxs18VJKzNg, KvBzUZIpwTA). Post_publish audit rows were missing (bug fixed in v1.5.0). Future videos will have correct audit rows. Existing 4 can be backfilled if needed.

**NDIS Yarns YouTube:** Brand Account conversion done 7 Apr. Token valid until 7 Apr 2031. No video format drafts are generated for NDIS-Yarns — text-only vertical in practice despite video_generation_enabled=true. Root cause: ai-worker doesn't assign video formats to NDIS content. Not a priority bug — NDIS content works better as text.

### Token Calendar

| Platform | Client | Expiry | Days remaining |
|---|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 | 1,825d |
| YouTube | Property Pulse | 2 Apr 2031 | 1,820d |
| Facebook | Property Pulse | 6 Jun 2026 | 59d |
| Facebook | NDIS-Yarns | 1 Jun 2026 | 54d |

Facebook tokens need refreshing in ~50 days.

### Client Publish Profiles

| Client | Publish Enabled | Auto Approve | Image Gen | Video Gen | Max/Day | Min Gap |
|---|---|---|---|---|---|---|
| Property Pulse | true | true | true | true | 2 | 360 min |
| NDIS-Yarns | true | true | true | true | 2 | 360 min |

Max per day dropped 15 → 2, min gap raised to 360 min (burst publishing stopped).

### Publishing Schedule (seeded 7 Apr)

`c.client_publish_schedule` table live. 12 rows seeded. Schedule UI live at dashboard.invegent.com/clients (Schedule tab).

| Client | Schedule | Days |
|---|---|---|
| NDIS-Yarns | 8am Mon, 12pm Tue, 7pm Wed, 8am Thu, 12pm Fri, 10am Sat AEST | Mon–Sat |
| Property Pulse | 7:30am Mon, 12pm Tue, 7:30am Wed, 12pm Thu, 5pm Fri, 10am Sat AEST | Mon–Sat |

⚠️ Publisher assignment logic (reading schedule to set `scheduled_for`) is not yet wired. Data and UI are live; publisher still uses its own timing. This is the next build step after C1.

### System Audit (B4) — Live

`m.run_system_audit(p_triggered_by)` deployed. 12 checks across operational, data_integrity, compliance, structural. Last run 7 Apr: 12/12 pass. Weekly cron: `ice-system-audit-weekly` every Sunday 13:00 UTC.

### AI Usage — This Month (April 2026)

| Total Cost (USD) | Total Calls | Fallback |
|---|---|---|
| ~$0.56 | ~14 | 0 |

Zero fallback to OpenAI. Anthropic primary only.

---

## NEW SCHEMA — 7 APR 2026

| Table | Schema | Purpose |
|---|---|---|
| client_audience_policy | c | Per-client audience build config (platforms, pixel IDs) |
| audience_asset | m | Fact table — built audiences per client (6 rows seeded) |
| audience_performance | m | IAE campaign results (future) |
| client_publish_schedule | c | Per-client per-platform day/time schedule (12 rows seeded) |
| system_audit_log | m | B4 audit run results |

All 5 tables registered in k catalog.

`public.save_publish_schedule()` SECURITY DEFINER function deployed for schedule saves.

---

## DASHBOARD — invegent-dashboard

Last deploy: 7 Apr 2026 (multiple deploys this session)

**Changes this session:**
- Monitor/Flow: Publisher health fixed (`queueOverdue` not `queueQueued`)
- Monitor/Flow: Client selector tabs added (All / NDIS-Yarns / PP via `?client=` param)
- Monitor/AI Costs: Flow tab restored (was missing)
- Clients: Schedule tab built — 7-day grid, tier enforcement, capacity bar, save

---

## GITHUB — LATEST COMMITS (7 Apr 2026)

| Repo | SHA | Message |
|---|---|---|
| Invegent-content-engine | 40982b9 | fix: youtube-publisher v1.5.0 + image-worker v3.9.2 |
| Invegent-content-engine | 3c9df4a | docs: add D075 OpenClaw learnings |
| Invegent-content-engine | (migration) | fix_stuck_carousel_approval_status |

---

## VERCEL FRONTENDS — LIVE

| App | URL | Status |
|---|---|---|
| invegent-dashboard | dashboard.invegent.com | READY |
| invegent-portal | portal.invegent.com | READY |
| invegent-web | invegent.com | READY |

Team: pk-2528s-projects (team_kYqCrehXYxW02AycsKVzwNrE)

---

## DECISIONS LOG — CURRENT

D001–D069: See earlier commits.
D070: AI Diagnostic Tier 2 — /diagnostics page live.
D071: IAE — do not build yet.
D072: Audience as asset schema — live.
D073: External AI agents — n8n for client success post-C1.
D074: QA framework — four layers, L1-L3 live.
D075: OpenClaw learnings — 6 gaps identified for ICE roadmap.

Full log: `docs/06_decisions.md`

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| Carousel never published | RESOLVED | image-worker v3.9.2 + migration (7 Apr) |
| youtube post_publish missing rows | RESOLVED | youtube-publisher v1.5.0 (7 Apr) |
| Facebook tokens expiring ~50 days | MED | Refresh early June 2026 |
| Publisher schedule not wired | LOW | Table+UI live, publisher reads own timing. Wire after C1. |
| NDIS Yarns no video drafts | LOW | Text-only vertical in practice. Not a priority. |
| Meta App Review | 🔴 External | Business verification In Review. Next check: 14 Apr. |
| LinkedIn API | 🔴 External | Community Management API review in progress. Next check: 14 Apr. |
| 4 PP YouTube videos missing post_publish rows | LOW | Can backfill manually. Videos are live on YouTube. Fixed for future. |

---

## WHAT IS NEXT

**Immediate — in order:**
1. **C1 — Facebook Insights back-feed** (Phase 2.1) — highest priority. Gates B3, D4, client success workflow, IAE. Brief: insights-worker Edge Function + m.post_performance table.
2. **B5 — Weekly manager report email** — brief ready at `docs/briefs/2026-04-07-qa-framework-phase2.md`. ~2 days. Claude Code candidate.
3. **F5 — OpenClaw SOUL.md** — bumped in priority per D075. Low effort, high leverage for @InvegentICEbot.
4. **F1 — Prospect demo generator** — needed before first external client conversation.
5. **Publisher schedule wiring** — c.client_publish_schedule → publisher assigns `scheduled_for` from table.

**External blockers (check 14 Apr):**
- Meta App Review: business verification In Review
- LinkedIn API: Community Management API review in progress
