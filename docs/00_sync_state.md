# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Overwritten every 12 hours by the Cowork pulse task.
> Last written: 2026-03-31 03:37 UTC (1:37pm AEST)
> Written by: Claude Desktop — session 31 Mar 2026

---

## HOW TO USE THIS FILE

At the start of every session involving ICE technical work, read this file
before answering any question or writing any code. It tells you what is
actually deployed right now — not what the docs say should be deployed.
If this file contradicts memory or 04_phases.md, this file wins.

---

## CURRENT PHASE

**Phase 3 — Expand + Personal Brand** (active)
Phase 1 complete. Phase 2 mostly complete — LinkedIn API blocked externally.

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2) — 23 active functions

| Function | Deploy# | App version | Last changed |
|---|---|---|---|
| ai-worker | v65 | ai-worker-v2.6.1 | 2026-03-30 |
| publisher | v55 | publisher-v1.3.x | 2026-03-30 |
| video-worker | v10 | video-worker-v2.0.0 | 2026-03-30 |
| youtube-publisher | v7 | youtube-publisher-v1.0.0 | 2026-03-30 |
| image-worker | v31 | image-worker-v3.3.0 | 2026-03-30 |
| compliance-monitor | v11 | compliance-monitor-v1.2.0 | 2026-03-30 |
| pipeline-ai-summary | v11 | pipeline-ai-summary | 2026-03-30 |
| pipeline-doctor | v10 | pipeline-doctor-v1.0.0 | 2026-03-30 |
| series-writer | v13 | series-writer-v1.2.0 | 2026-03-30 |
| series-outline | v12 | series-outline-v1.2.0 | 2026-03-30 |
| auto-approver | v26 | auto-approver-v1.4.0 | 2026-03-30 |
| insights-worker | v29 | insights-worker-v18 | 2026-03-30 |
| ingest | v91 | ingest-worker | 2026-03-30 |
| content_fetch | v62 | content-fetch-v2.5 | 2026-03-30 |
| linkedin-publisher | v12 | linkedin-publisher-v1.1.0 | stable |
| email-ingest | v12 | email-ingest-v2 | 2026-03-30 |
| draft-notifier | v13 | draft-notifier-v1.1 | 2026-03-30 |
| feed-intelligence | v17 | feed-intelligence-v7 | 2026-03-30 |
| inspector | v79 | — | util |
| inspector_sql_ro | v34 | — | util |
| wasm-bootstrap | v10 | — | util |
| tts-test | v8 | — | util |
| youtube-token-test | v2 | — | util |

---

## PG_CRON — ACTIVE (22 jobs)

| Schedule | Job |
|---|---|
| every 5 min | ai-worker (limit 5), publisher (limit 2), enqueue-publish-queue |
| every 10 min | content_fetch, sweep-stale, seed-and-enqueue-facebook, auto-approver |
| every 15 min | linkedin-publisher, image-worker |
| every 30 min | draft-notifier, pipeline-health-snapshot, video-worker |
| :15 :45 | pipeline-doctor, youtube-publisher |
| :55 | pipeline-ai-summary |
| hourly :00 | planner (create_digest_run) |
| hourly :05 | run_pipeline_for_client (property) |
| every 2h | email-ingest |
| every 6h | ingest (RSS) |
| daily 0 21 UTC (8am AEDT) | run_pipeline_for_client (NDIS), token-health-write |
| daily 0 2 UTC | dead-letter-sweep |
| daily 0 3 UTC | insights-worker |
| weekly Sunday 0 2 UTC | feed-intelligence |
| 1st of month 0 9 UTC | compliance-monitor |

---

## VERCEL FRONTENDS — LIVE

| App | URL | Last deploy | Status |
|---|---|---|---|
| invegent-dashboard | dashboard.invegent.com | 2026-03-23 | READY |
| invegent-portal | portal.invegent.com | 2026-03-18 | READY |
| invegent-web | invegent.com | 2026-03-18 | READY |

Team: `pk-2528s-projects` (`team_kYqCrehXYxW02AycsKVzwNrE`)
Project IDs: dashboard=`prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg`, portal=`prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa`, web=`prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ`

---

## GITHUB — LATEST COMMITS

| Repo | SHA | Date | Message |
|---|---|---|---|
| Invegent-content-engine | — | 2026-03-31 | chore: mark credentials rotated 31 Mar 2026 |
| invegent-dashboard | fc9a778 | 2026-03-23 | chore: roadmap sync 2026-03-23 |
| invegent-portal | ~2026-03-18 | 2026-03-18 | portal /performance + calendar v2 |
| invegent-web | ~2026-03-18 | 2026-03-18 | public proof dashboard |

---

## KNOWN ACTIVE ISSUES

| Issue | Status | Action needed |
|---|---|---|
| Visual format publishing | 🔴 Unresolved | 0 image posts in 7 days. Fix needed in Claude Code. |
| PP zombie drafts (61) | ⚠️ NOT QUEUING | 61 approved drafts from Feb — null format. Clear with SQL (confirm with PK). |
| post_draft_not_found publisher error | 🔴 Active | PP posts entering queue but publisher can't find draft. Flagged every pipeline-ai-summary run. |
| Cowork scheduled task UUID | ⚠️ STALE | Still pointing at old Max plan UUID — sync state not auto-updated. Fix in Cowork settings. |
| LinkedIn publisher | 🔵 External blocker | Community Management API review in progress |
| Meta App Review | 🔵 External blocker | Business verification In Review. Data handling section still to complete. Calendar: 1 Apr |

---

## CLIENT PIPELINE STATUS

**NDIS Yarns** (`fb98a472-ae4d-432d-8738-2273231c1ef4`)
- Zombie drafts: ✅ CLEARED (24 dead, 0 approved blocking queue)
- 1 draft in needs_review as of 30 Mar 07:05 UTC
- Pipeline generating fresh drafts

**Property Pulse** (`4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`)
- 61 approved drafts from Feb (null format) — not queuing, need zombie clear
- publish_mode: auto, publish_enabled: true, max_per_day: 15 — config is correct
- post_draft_not_found errors on publisher — separate issue

---

## CLAUDE DESKTOP MCP CONFIG

Updated 30 Mar 2026 (D053). Credentials rotated 31 Mar 2026.
- Supabase: `C:\Users\parve\AppData\Roaming\npm\mcp-server-supabase.cmd`
- Xero: `C:\Users\parve\AppData\Roaming\npm\xero-mcp-server.cmd`
- GitHub: `C:\Users\parve\github-mcp-server\github-mcp-server.exe`

---

## CREDENTIALS STATUS

| Credential | Status |
|---|---------|
| Anthropic API | ✅ Active — primary AI provider |
| OpenAI API | ✅ Active — fallback only |
| Facebook page tokens | ✅ Active — both clients |
| LinkedIn org tokens | ✅ Stored — API approval pending |
| ElevenLabs Creator | ✅ Active — both voices confirmed |
| YouTube OAuth | ✅ Active — both channels |
| Creatomate Essential | ✅ Active — $54/mo |
| Resend | ✅ Active |
| Gmail OAuth (email-ingest) | ✅ Active |
| Supabase access token | ✅ Rotated 31 Mar 2026 |
| GitHub PAT | ✅ Rotated 31 Mar 2026 |
| Xero client secret | ✅ Rotated 31 Mar 2026 |

---

## WHAT IS NEXT

**Priority order (31 Mar):**
1. Clear PP zombie drafts (61 from Feb — confirm with PK then run SQL)
2. Fix visual format publishing — Claude Code session
3. Fix post_draft_not_found publisher error
4. Fix Cowork scheduled task UUID
5. Build nightly reconciler + auditor (Task 1 midnight AEST, Task 2 2am AEST → docs/00_audit_report.md)

**Phase 3 build queue:**
1. AI Diagnostic Agent Tier 2
2. m.post_format_performance population
3. Prospect demo generator
4. Client health weekly report email

Decisions D044–D053 in `docs/06_decisions.md`. Last decision: D053 (30 Mar 2026).
