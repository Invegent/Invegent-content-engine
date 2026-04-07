# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-08 (session close)
> Written by: PK + Claude reconciliation

---

## HOW TO USE THIS FILE

At the start of every session involving ICE technical work, read this file
before answering any question or writing any code. It tells you what is
actually deployed right now — not what the docs say should be deployed.
If this file contradicts memory or 04_phases.md, this file wins.

For the full document map, see `docs/00_docs_index.md`.

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
- New tables added 7–8 Apr: c.client_audience_policy, m.audience_asset, m.audience_performance, c.client_publish_schedule, m.system_audit_log
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

**Gate to first external client conversation is OPEN.**
**Legal review required before first external client is signed — see docs/23_legal_register.md.**

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
| insights-worker | 32 | ACTIVE | **v14.0.0** — metric names fixed, C1 complete |
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

---

## PIPELINE STATE

### Publishing (confirmed working)

| Format | NDIS-Yarns | Property Pulse |
|---|---|---|
| facebook text | ✅ publishing daily | ✅ publishing daily |
| facebook video_short_kinetic | ❌ none generated | ✅ confirmed |
| facebook video_short_stat | ❌ none generated | ✅ confirmed |
| facebook image_quote | ✅ generating | ✅ confirmed |
| facebook carousel | ✅ unblocked 7 Apr | ✅ unblocked 7 Apr |
| youtube | ❌ no video drafts generated | ✅ 4 videos uploaded |

### Token Calendar

| Platform | Client | Expiry | Days remaining |
|---|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 | ~1,825d |
| YouTube | Property Pulse | 2 Apr 2031 | ~1,820d |
| Facebook | Property Pulse | 6 Jun 2026 | ~59d |
| Facebook | NDIS-Yarns | 1 Jun 2026 | ~54d |

⚠️ Facebook tokens need refreshing in ~50 days.

### Performance Data (C1 — COMPLETE 8 Apr 2026)

- insights-worker v14.0.0 deployed: fixed metric names (`post_impressions_unique_28d` was invalid, replaced with `post_impressions`, `post_engaged_users`, `post_clicks`)
- 148 rows in m.post_performance
- Performance dashboard live at dashboard.invegent.com/monitor (Performance tab)
- `/api/performance` server action + `/performance` page deployed

### Publishing Schedule

`c.client_publish_schedule` — 12 rows seeded. Schedule UI live.
⚠️ Publisher assignment not yet wired (reads schedule, doesn't use it to set `scheduled_for`). Next build.

### System Audit (B4) — Live

12 checks, 12/12 pass. Weekly cron Sunday 13:00 UTC.

---

## DASHBOARD — invegent-dashboard

Last deploy: 8 Apr 2026

**Changes 8 Apr 2026:**
- Content Studio / Single Post: All platforms now shown (Facebook ✅, LinkedIn greyed “API approval pending”, Instagram greyed “Coming after Meta App Review”)
- Content Studio / Content Series: Clicking tab now opens new series form directly (not history). History moved to “My Series” link top-right. Platform selector added to series form.
- Roadmap: “By Layer” section added above “By Phase” — 8 layers with % bars, what works, what's missing. Overall ~65%.
- Monitor / Performance tab: live performance data from m.post_performance

**Changes 7 Apr 2026:**
- Monitor/Flow: Publisher health fixed, client selector tabs added
- Clients: Schedule tab built — 7-day grid, tier enforcement, capacity bar, save
- image-worker v3.9.2, youtube-publisher v1.5.0

---

## GITHUB — LATEST COMMITS (8 Apr 2026)

| Repo | Message |
|---|---|
| Invegent-content-engine | docs: business document suite — vision, business plan, product charter, legal register, risk register rewrite |
| Invegent-content-engine | docs: video is core not aspirational; revenue targets deferred until product proven |
| Invegent-content-engine | docs: ICE video pipeline deep research — April 2026 |
| Invegent-content-engine | docs: independent consultant audit — product, business, legal, technology |
| invegent-dashboard | fix: Content Studio — platform visibility, series UX, roadmap by-layer view |
| invegent-dashboard | feat: add platform selector to Content Series form |
| invegent-dashboard | feat: C1 performance dashboard — actions/performance.ts + /performance page |

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

D001–D069: See `docs/06_decisions.md`.
D070: AI Diagnostic Tier 2 — /diagnostics page live.
D071: IAE — do not build yet.
D072: Audience as asset schema — live.
D073: External AI agents — n8n for client success post-C1.
D074: QA framework — four layers, L1–L3 live.
D075: OpenClaw learnings — 6 gaps identified for ICE roadmap.

---

## DOCUMENT SUITE (NEW — 8 Apr 2026)

Five business documents created and committed:

| File | Purpose |
|---|---|
| `docs/20_vision.md` | Vision, north star, what ICE will never become |
| `docs/21_business_plan.md` | Market, model, economics, SaaS transition criteria |
| `docs/22_product_charter.md` | Scope boundaries, video layers, vertical rules, decision framework |
| `docs/23_legal_register.md` | L001–L008 legal issues tracked with owner and deadline |
| `docs/05_risks.md` | Full rewrite — 9 risks, current status, monthly checklist |
| `docs/00_docs_index.md` | Map of all 20+ docs in /docs with reading order |

**Key positions confirmed in these documents:**
- Video pipeline is CORE to ICE, not optional or aspirational
- Revenue targets deliberately not set — prove the product works in 12 months, then forecast
- Legal review ($2,000–5,000 AUD) required before first external client signs
- Avatar consent workflow must exist before HeyGen integration is built (L005)
- Meta Standard Access is a hard gate before any external client is onboarded to Facebook

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| Facebook tokens expiring ~50 days | MED | Refresh early June 2026 |
| Publisher schedule not wired | LOW | Table+UI live, publisher reads own timing |
| NDIS Yarns no video drafts | LOW | Text-only vertical in practice. Not priority. |
| Meta App Review | 🔴 External | Business verification In Review. Next check: 14 Apr. |
| LinkedIn API | 🔴 External | Community Management API review. Next check: 14 Apr. |
| Avatar consent workflow | 🔴 Legal gate | Must build before HeyGen integration. See L005. |
| Legal review | 🔴 Business gate | $2–5k AUD. Initiate when Meta Standard Access confirmed. |

---

## WHAT IS NEXT

**Immediate — in order:**
1. **B5 — Weekly manager report email** — Sunday Edge Function via Resend. ~2 sessions. Claude Code candidate.
2. **Video visibility tracker** — Video tab in Content Studio showing production status, ETA, draft cards. No schema changes. ~1 session.
3. **Publisher schedule wiring** — `c.client_publish_schedule` → publisher assigns `scheduled_for`. Half session.
4. **F5 — OpenClaw SOUL.md** — low effort, high leverage for @InvegentICEbot.
5. **F1 — Prospect demo generator** — needed before first external client conversation.

**Near-term (next 2–4 sessions):**
- Video analyser tool — paste URL → transcript + analysis + recreate brief. Supadata + Apify + Claude.
- YouTube channel ingest — source_type_code = 'youtube_channel', YouTube Data API polling.
- HeyGen avatar integration — after avatar consent workflow and legal review.

**External blockers (check 14 Apr):**
- Meta App Review: business verification In Review
- LinkedIn API: Community Management API review in progress
