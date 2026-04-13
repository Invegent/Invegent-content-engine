# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-13 (Phase A/B/C complete — 10 briefs, 6 sessions)
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

**Phase 1 — COMPLETE** (all 4 criteria verified 7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
Phase A/B/C builds complete 13 Apr 2026.

**Gate to first external client conversation is OPEN.**
**Legal review required before first external client is signed (L001).**
**CFW is an empty shell — acceptance test after Phase D complete.**

---

## VERCEL DEPLOYMENTS

| App | Domain | Status | Last deploy | Commit |
|---|---|---|---|---|
| invegent-dashboard | dashboard.invegent.com | READY | 13 Apr | `a84a64f0` operator briefing |
| invegent-portal | portal.invegent.com | READY | 13 Apr | `cdeb4761` upcoming queue view |
| invegent-web | invegent.com | READY | 13 Apr | `bf71fe48` full NDIS landing page |

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Status | Notes |
|---|---|---|
| ai-profile-bootstrap | ACTIVE | v1.0.0 |
| ai-worker | ACTIVE | v2.7.1 — writes compliance_flags |
| auto-approver | ACTIVE | v1.4.1 — CFW config added |
| brand-scanner | ACTIVE | v1.0.0 |
| client-weekly-summary | ACTIVE | v1.0.0 — NEW 13 Apr, Mon 7:30am AEST |
| compliance-monitor | ACTIVE | monthly hash check |
| compliance-reviewer | ACTIVE | v1.3.0 |
| content_fetch | ACTIVE | |
| draft-notifier | ACTIVE | |
| email-ingest | ACTIVE | |
| feed-intelligence | ACTIVE | |
| heygen-avatar-creator | ACTIVE | v2.2.0 |
| heygen-avatar-poller | ACTIVE | v2.0.0 |
| heygen-worker | ACTIVE | v1.1.0 |
| image-worker | ACTIVE | v3.9.2 |
| ingest | ACTIVE | v8-youtube-channel |
| insights-worker | ACTIVE | v14.0.0 |
| inspector | ACTIVE | |
| inspector_sql_ro | ACTIVE | |
| linkedin-publisher | ACTIVE | waiting on API approval |
| onboarding-notifier | ACTIVE | v2.0.0 |
| pipeline-ai-summary | ACTIVE | |
| pipeline-diagnostician | ACTIVE | v1.0.0 — NEW 13 Apr |
| pipeline-doctor | ACTIVE | |
| pipeline-healer | ACTIVE | v1.0.0 — NEW 13 Apr |
| pipeline-sentinel | ACTIVE | v1.0.0 — NEW 13 Apr, every 15min |
| publisher | ACTIVE | |
| series-outline | ACTIVE | |
| series-writer | ACTIVE | |
| video-analyser | ACTIVE | v1.2.0 |
| video-worker | ACTIVE | v2.1.0 |
| weekly-manager-report | ACTIVE | v1.0.0 — Mon 7am AEST |
| youtube-publisher | ACTIVE | v1.5.0 |

---

## PIPELINE HEALTH — VERIFIED 13 Apr 2026

| Metric | Value | Status |
|---|---|---|
| Posts published last 7 days | 28 | ✅ Healthy |
| Drafts needing review | 0 | ✅ Clean |
| Stuck AI jobs (>2h) | 0 | ✅ Clean |
| Clients active | 3 | NDIS-Yarns, Property Pulse, Care For Welfare |
| Open incidents (CRITICAL) | 1 | CFW no_drafts_48h — expected (empty shell) |
| pg_cron jobs active | 37 | +3 from Phase B/C |

---

## AGENT INTELLIGENCE LAYER — LIVE (13 Apr 2026)

### Sentinel (pipeline-sentinel v1.0.0)
- Every 15 minutes via pg_cron
- 5 checks per active client: no_drafts_48h, no_posts_48h, ai_queue_depth, stuck_ai_jobs, feed_ingest_stalled (global)
- Writes to m.pipeline_incident on failure
- Duplicate suppression: 4h/2h/1h lookback windows
- Telegram alert on CRITICAL severity
- **Already caught:** CFW no_drafts_48h CRITICAL at 09:03 UTC 13 Apr

### Diagnostician (pipeline-diagnostician v1.0.0)
- On-demand via dashboard "Run Diagnosis" button
- Gathers 10 state fields per client
- Claude-powered root cause analysis
- Returns: finding, probable_cause, recommended_fix, auto_fixable
- Writes finding back to pipeline_incident.context

### Healer (pipeline-healer v1.0.0)
- Every 15 minutes (offset 2 min after Sentinel)
- Safe auto-remediation only: reset_stuck_ai_jobs, reset_stuck_queue
- Logs every action via resolve_pipeline_incident()
- Governance boundary: never touches tokens, external APIs, or client config

---

## NEW DB TABLE

### m.pipeline_incident
- Columns: incident_id, client_id, detected_at, check_name, severity, description, context, auto_healable, auto_healed, action_taken, resolved_at, resolved_by
- Immutable: delete trigger prevents row deletion
- Indexes: client_id, detected_at DESC, severity (WHERE resolved_at IS NULL)
- 1 row as of 13 Apr (CFW no_drafts_48h)

---

## NEW DB FUNCTIONS (13 Apr 2026)

| Function | Purpose |
|---|---|
| insert_pipeline_incident() | Sentinel writes incidents |
| resolve_pipeline_incident() | Healer resolves incidents |
| heal_reset_stuck_ai_jobs() | Healer: reset pending>2h ai_jobs |
| heal_reset_stuck_queue() | Healer: reset stuck queue items |
| get_portal_home_stats() | Portal home: week stats, platforms |
| get_portal_recent_posts() | Portal home: last 5 published posts (published_at IS NOT NULL filter applied 13 Apr) |
| get_portal_inbox_drafts() | Portal inbox: needs_review drafts |
| portal_approve_draft() | Portal: approve + enqueue draft |
| portal_reject_draft() | Portal: reject draft with reason |
| get_portal_performance() | Portal: engagement data from m.post_performance |
| get_portal_upcoming_queue() | Portal: next 7 days scheduled posts |

---

## PORTAL ARCHITECTURE — COMPLETE (13 Apr 2026)

```
Portal Home (/home):
  • Week stats: posts this week, next scheduled, drafts to review
  • Platform status: per connected platform, health dot
  • Recent posts: last 5 published (title, body preview, date)
  • Quick actions: inbox badge if drafts pending
  • Coming up: next 7 days queue view

Portal Inbox (/inbox):
  • Draft cards: title, body, platform, format badge
  • Expand to full body
  • Approve: calls portal_approve_draft() → draft_approve_and_enqueue()
  • Reject: optional reason → calls portal_reject_draft()
  • Sidebar badge count from layout.tsx

Portal Performance (/performance):
  • Summary cards: posts tracked, avg engagement %, total reach
  • Top 3 posts by engagement
  • Empty state if no m.post_performance data yet

Portal Connect (/connect):
  • Platform OAuth routes (gated by env vars)
```

---

## WEBSITE — invegent.com LIVE (13 Apr 2026)

Full NDIS-focused landing page. 8 sections:
1. Hero — "Your NDIS practice posts every day. Without you touching it."
2. The problem
3. How it works (3 steps)
4. Live proof (NDIS Yarns live post counts)
5. Who built this (PK — CPA + Plan Manager + OT practice admin)
6. Pricing (3 tiers: $500/$800/$1,500/mo)
7. FAQ (5 questions)
8. Final CTA — mailto:hello@invegent.com

---

## DASHBOARD — OPERATOR BRIEFING (13 Apr 2026)

Overview page rebuilt as daily operator briefing:
- Zone 1: System status bar (green/amber/red)
- Zone 2: Drafts to review + open incidents (2-column)
- Zone 3: Today's publishing schedule
- Zone 4: 4 quick stat cards

Diagnostics page: "Run Diagnosis" button → pipeline-diagnostician

---

## WEEKLY EMAILS — BOTH LIVE

| Email | Recipient | Schedule | Function |
|---|---|---|---|
| Manager report (B5) | pk@invegent.com | Mon 7:00am AEST | weekly-manager-report |
| Client summary | Each active client | Mon 7:30am AEST | client-weekly-summary |

---

## TOKEN CALENDAR

| Platform | Client | Expiry | Days |
|---|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 | ~1821d |
| YouTube | Property Pulse | 2 Apr 2031 | ~1816d |
| Facebook | NDIS-Yarns | 31 May 2026 | ~48d ⚠️ |
| Facebook | Property Pulse | 5 Jun 2026 | ~53d ⚠️ |

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| CFW empty shell | EXPECTED | Acceptance test — wipe and onboard after Phase D |
| Facebook token expiry ~50 days | MED | Will appear in Monday report. Refresh early June. |
| 2 HeyGen intro items stuck pending (Apr 9) | LOW | Waiting on avatar builds — non-blocking |
| Meta App Review | 🔴 External | Business verification In Review. No progress 13 Apr. |
| LinkedIn API | 🔴 External | Community Management API review. No progress 13 Apr. |
| Legal review (L001) | 🔴 Business gate | Before first external client signs. |

---

## WHAT IS NEXT — PHASE D

1. **Brief 034** — Performance → scoring feedback loop (~3h)
2. **Brief 035** — Incident summary in B5 manager report (~1h)
3. **Brief 036** — F1 Prospect demo generator — HOLD until NDIS Yarns has 60+ days data (~mid-June)
4. **Brief 037** — Dashboard restructure (three-zone nav) — after Portal complete
5. **CFW wipe and restart** — acceptance test after Phase D complete

**External gates:**
- Meta Standard Access → FACEBOOK_OAUTH_ENABLED=true in Vercel portal
- LinkedIn API → LINKEDIN_OAUTH_ENABLED=true in Vercel portal
- Legal review → first external client signs
