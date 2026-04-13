# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-13 (Phase A/B/C/D complete — 13 briefs, all sessions done)
> Written by: PK + Claude reconciliation

---

## SESSION STARTUP PROTOCOL

1. Read this file (`docs/00_sync_state.md`)
2. For any table you are about to work with, query k schema FIRST:
   ```sql
   SELECT schema_name, table_name, purpose, columns_list, fk_edges, allowed_ops
   FROM k.vw_table_summary
   WHERE schema_name = 'x' AND table_name = 'y';
   ```
3. Do NOT fall into discovery mode. k.vw_table_summary is the single-stop navigation layer.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (verified 7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
**Phases A/B/C/D — ALL COMPLETE** (13 Apr 2026)

**Gate to first external client conversation is OPEN.**
**Legal review (L001) required before first external client signs.**
**CFW is an empty shell — acceptance test is the next build milestone.**

---

## VERCEL DEPLOYMENTS

| App | Domain | Status | Last deploy | Commit |
|---|---|---|---|---|
| invegent-dashboard | dashboard.invegent.com | READY | 13 Apr | `2e2d04b` nav restructure |
| invegent-portal | portal.invegent.com | READY | 13 Apr | `cdeb4761` queue view |
| invegent-web | invegent.com | READY | 13 Apr | `bf71fe48` NDIS landing page |

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Version | Status | Notes |
|---|---|---|---|
| ai-profile-bootstrap | 1 | ACTIVE | v1.0.0 |
| ai-worker | 72 | ACTIVE | v2.7.1 — writes compliance_flags |
| auto-approver | 30 | ACTIVE | v1.4.1 — CFW config added |
| brand-scanner | 1 | ACTIVE | v1.0.0 |
| client-weekly-summary | 1 | ACTIVE | v1.0.0 — Mon 7:30am AEST |
| compliance-monitor | 14 | ACTIVE | monthly |
| compliance-reviewer | 4 | ACTIVE | v1.3.0 |
| content_fetch | 65 | ACTIVE | |
| draft-notifier | 16 | ACTIVE | |
| email-ingest | 15 | ACTIVE | |
| feed-intelligence | 20 | ACTIVE | |
| heygen-avatar-creator | ACTIVE | v2.2.0 | |
| heygen-avatar-poller | ACTIVE | v2.0.0 | |
| heygen-worker | 2 | ACTIVE | v1.1.0 |
| image-worker | 37 | ACTIVE | v3.9.2 |
| ingest | 95 | ACTIVE | v8-youtube-channel |
| insights-feedback | 1 | ACTIVE | v1.0.0 — NEW 13 Apr, daily 3:30am UTC |
| insights-worker | 32 | ACTIVE | v14.0.0 |
| inspector | 82 | ACTIVE | |
| inspector_sql_ro | 37 | ACTIVE | |
| linkedin-publisher | 15 | ACTIVE | waiting on API approval |
| onboarding-notifier | 2 | ACTIVE | v2.0.0 |
| pipeline-ai-summary | 14 | ACTIVE | |
| pipeline-diagnostician | 1 | ACTIVE | v1.0.0 |
| pipeline-doctor | 13 | ACTIVE | |
| pipeline-healer | 1 | ACTIVE | v1.0.0 — every 15min offset |
| pipeline-sentinel | 1 | ACTIVE | v1.0.0 — every 15min |
| publisher | 58 | ACTIVE | |
| series-outline | 15 | ACTIVE | |
| series-writer | 16 | ACTIVE | |
| video-analyser | 4 | ACTIVE | v1.2.0 |
| video-worker | 14 | ACTIVE | v2.1.0 |
| weekly-manager-report | 1 | ACTIVE | v1.1.0 — now includes incident summary |
| youtube-publisher | 15 | ACTIVE | v1.5.0 |

---

## PIPELINE HEALTH — VERIFIED 13 Apr 2026

| Metric | Value | Status |
|---|---|---|
| Posts published last 7 days | 28 | ✅ Healthy |
| Drafts needing review | 0 | ✅ Clean |
| Stuck AI jobs (>2h) | 0 | ✅ Clean |
| Open incidents (CRITICAL) | 1 | CFW no_drafts_48h — expected |
| Active cron jobs | 38 | +4 from Phase B/C/D |
| Topic score weights | 2 | NDIS Yarns — seeded from live perf data |

---

## ALL DB TABLES + FUNCTIONS ADDED TODAY (13 Apr)

### New tables
- `m.pipeline_incident` — immutable incident log, delete trigger
- `m.topic_score_weight` — per-client per-topic engagement weight multipliers

### New functions (SECURITY DEFINER)
- `insert_pipeline_incident()` `resolve_pipeline_incident()`
- `heal_reset_stuck_ai_jobs()` `heal_reset_stuck_queue()`
- `get_portal_home_stats()` `get_portal_recent_posts()` (published_at IS NOT NULL fix applied)
- `get_portal_inbox_drafts()` `portal_approve_draft()` `portal_reject_draft()`
- `get_portal_performance()` `get_portal_upcoming_queue()`
- `recalculate_topic_weights()` — daily weight recalculation from engagement data

---

## NEW CRON JOBS (13 Apr)

| Job | Schedule | Function |
|---|---|---|
| pipeline-sentinel-every-15m | */15 * * * * | pipeline-sentinel |
| pipeline-healer-every-15m | 2,17,32,47 * * * * | pipeline-healer |
| client-weekly-summary-monday-730am-aest | 30 21 * * 0 | client-weekly-summary |
| insights-feedback-daily | 30 3 * * * | insights-feedback (job 52) |

---

## WHAT WAS BUILT TODAY — FULL SUMMARY

### Phase A — Revenue Readiness
- **024** Portal Home: week stats, platform status, recent posts, quick actions
- **025** Portal Inbox: draft approval workflow, approve/reject, inbox badge
- **026** invegent.com: full NDIS landing page, live proof stats, 8 sections, pricing

### Phase B — System Intelligence  
- **027** Sentinel: proactive 5-check health monitor every 15min, already caught CFW CRITICAL
- **028** Diagnostician: Claude-powered root cause analysis on-demand
- **029** Healer: auto-remediation for stuck jobs, logs every action
- **030** Dashboard operator briefing: status bar, today’s drafts+incidents+schedule

### Phase C — Client Experience
- **031** Portal Performance tab: engagement data, top posts, reach
- **032** Portal queue view: next 7 days on Home page
- **033** Client weekly summary email: Mon 7:30am AEST per client

### Phase D — Intelligence
- **034** Performance → scoring feedback loop: topic_score_weight, recalculate_topic_weights(), insights-feedback daily
- **035** Incident summary in B5 report: weekly-manager-report v1.1.0
- **037** Dashboard nav restructure: StatusStrip + 6-zone nav (Today/Monitor/Content/Config/System)

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Days |
|---|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 | ~1821d |
| YouTube | Property Pulse | 2 Apr 2031 | ~1816d |
| Facebook | NDIS-Yarns | 31 May 2026 | ~48d ⚠️ |
| Facebook | Property Pulse | 5 Jun 2026 | ~53d ⚠️ |

---

## EXTERNAL GATES

| Gate | Status | Action |
|---|---|---|
| Meta App Review | Business verification "In Review" | Do NOT edit BM. Contact developer support if stuck >2 more weeks. |
| LinkedIn Community Management API | "1 of 2. Access Form Review" | Waiting. Consider Late.dev middleware if still pending in 4 weeks. |
| Legal review (L001) | Not started | Hard gate before first external client signs. |

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| CFW empty shell | EXPECTED | Acceptance test — next build milestone after rest |
| Facebook tokens expiring ~48-53 days | MED | Refresh early June |
| 2 HeyGen intro items stuck pending (Apr 9) | LOW | Waiting on avatar builds |
| Bundler topic weight wiring | LOW | recalculate_topic_weights() built but bundler function not found — wire when bundler is next touched |
| GitHub Pages emails | RESOLVED | Unpublished 13 Apr |

---

## WHAT IS NEXT

1. **CFW wipe and restart** — run through full onboarding flow as acceptance test
2. **First external client conversation** — gate is open, legal review before signing
3. **Cowork daily inbox task** — Gmail MCP, archives noise, surfaces actions (backlog)
4. **LinkedIn middleware evaluation** — Late.dev if API still pending in 4 weeks
5. **Facebook token refresh** — early June
6. **Bundler wiring for topic weights** — when bundler is next updated
7. **F1 prospect demo generator** (Brief 036) — hold until ~mid-June (60 days NDIS Yarns data)
