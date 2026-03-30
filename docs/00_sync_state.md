# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Overwritten every 12 hours by the Cowork pulse task.
> Last written: 2026-03-30 11:00 UTC (22:00 AEST)
> Written by: Claude Desktop — session 30 Mar 2026

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
| ai-worker | v64 | ai-worker-v2.6.1 | 2026-03-22 |
| publisher | v54 | publisher-v1.3.x | 2026-03-21 |
| video-worker | v9 | video-worker-v2.0.0 | 2026-03-21 |
| youtube-publisher | v6 | youtube-publisher-v1.0.0 | 2026-03-21 |
| image-worker | v30 | image-worker-v3.3.0 | 2026-03-20 |
| compliance-monitor | v10 | compliance-monitor-v1.2.0 | 2026-03-20 |
| pipeline-ai-summary | v10 | pipeline-ai-summary | 2026-03-20 |
| pipeline-doctor | v9 | pipeline-doctor-v1.0.0 | 2026-03-19 |
| series-writer | v12 | series-writer-v1.2.0 | 2026-03-19 |
| series-outline | v11 | series-outline-v1.2.0 | 2026-03-19 |
| auto-approver | v25 | auto-approver-v1.4.0 | stable |
| insights-worker | v28 | insights-worker-v18 | stable |
| ingest | v90 | ingest-worker | stable |
| content_fetch | v61 | content-fetch-v2.5 | stable |
| linkedin-publisher | v11 | linkedin-publisher-v1.1.0 | stable |
| email-ingest | v11 | email-ingest-v2 | stable |
| draft-notifier | v12 | draft-notifier-v1.1 | stable |
| feed-intelligence | v16 | feed-intelligence-v7 | stable |
| inspector | v78 | — | util |
| inspector_sql_ro | v33 | — | util |
| wasm-bootstrap | v9 | — | util |
| tts-test | v7 | — | util |
| youtube-token-test | v1 | — | util |

**Key recent changes:**
- `ai-worker v2.6.1` — format advisor seed extraction fix (22 Mar 2026, D051).
- `video-worker v2.0.0` — ElevenLabs TTS voice added (21 Mar 2026, D045).
- `youtube-publisher v1.0.0` — OAuth 2.0 YouTube upload, unlisted by default (21 Mar 2026, D045).

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
| invegent-dashboard | dashboard.invegent.com | 2026-03-22 | READY |
| invegent-portal | portal.invegent.com | 2026-03-18 | READY |
| invegent-web | invegent.com | 2026-03-18 | READY |

Team: `pk-2528s-projects` (`team_kYqCrehXYxW02AycsKVzwNrE`)
Project IDs: dashboard=`prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg`, portal=`prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa`, web=`prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ`

---

## GITHUB — LATEST COMMITS

| Repo | SHA | Date | Message |
|---|---|---|---|
| Invegent-content-engine | 30 Mar 2026 | 2026-03-30 | chore: sync state update 2026-03-30 |
| invegent-dashboard | ec58325 | 2026-03-22 | chore: roadmap sync 2026-03-22 |
| invegent-portal | ~2026-03-18 | 2026-03-18 | portal /performance + calendar v2 |
| invegent-web | ~2026-03-18 | 2026-03-18 | public proof dashboard |

---

## KNOWN ACTIVE ISSUES

| Issue | Status | Action needed |
|---|---|---|
| NDIS draft queue empty | ⚠️ NEEDS ACTION | 24 zombie approved drafts from Feb 2026 blocking fresh generation. SQL ready to run on PK confirmation. |
| pipeline-ai-summary | 🔴 500 errors | Unresolved — needs investigation |
| Visual format publishing | 🔴 Both clients text-only | Format advisor thresholds + image-worker gate + publisher hold logic all need fixes |
| Cowork scheduled task UUID | ⚠️ STALE | Still pointing at old Max plan project UUID — sync state not auto-updated since 22 Mar |
| LinkedIn publisher | 🔵 External blocker | Community Management API review in progress |
| Meta App Review | 🔵 External blocker | Business verification In Review. Data handling section still to complete. Calendar: 1 Apr |

---

## CLIENT PIPELINE STATUS

**NDIS Yarns** (`fb98a472-ae4d-432d-8738-2273231c1ef4`)
- Queue: 0 posts — BLOCKED by zombie backlog
- Action: confirm and run zombie draft SQL to unblock

**Property Pulse** (`4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`)
- Status: HEALTHY (7 posts queued as of 22 Mar — verify current state)

---

## CREDENTIALS STATUS

| Credential | Status |
|---|---|
| Anthropic API | Active — primary AI provider |
| OpenAI API | Active — fallback only |
| Facebook page tokens | Active — both clients |
| LinkedIn org tokens | Stored — publisher code ready, API approval pending |
| ElevenLabs Creator | Active — NDIS + PP voices confirmed |
| YouTube OAuth | Active — both channels, uploads unlisted by default |
| Creatomate Essential | Active — $54/mo |
| Resend | Active — magic link + draft notifier |
| Gmail OAuth (email-ingest) | Active — feeds@invegent.com |

---

## WHAT IS NEXT

**Priority order (from ICE_Action_Plan_29Mar2026):**
1. Fix pipeline-ai-summary 500 errors
2. Fix visual format publishing (format advisor + image-worker gate + publisher hold)
3. Fix Cowork scheduled task UUID — resume auto sync state writes
4. Clear NDIS zombie drafts — confirm with PK then run SQL

**Phase 3 build queue:**
1. AI Diagnostic Agent Tier 2 (~1 Apr)
2. m.post_format_performance population
3. Prospect demo generator (2 days)
4. Client health weekly report email (2 days)

Decisions D044–D051 in `docs/06_decisions.md`. Last decision: D051 (22 Mar 2026).
