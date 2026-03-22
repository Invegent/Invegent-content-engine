# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Overwritten every 12 hours by the Cowork pulse task.
> Last written: 2026-03-22 05:00 UTC (16:00 AEST)
> Written by: Claude reconciliation — session 22 Mar 2026

---

## HOW TO USE THIS FILE

At the start of every session, read this file before doing any technical work.
It tells you what is actually deployed right now — not what the docs say should be deployed.
If this file contradicts memory or the docs, **this file wins**.

---

## CURRENT PHASE

**Phase 3 — Expand + Personal Brand** (active)
Phase 1 complete. Phase 2 mostly complete — only LinkedIn publisher blocked (external API).

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2) | 23 active functions

| Function | Deploy# | App version | Last changed |
|---|---|---|---|
| ai-worker | v64 | ai-worker-v2.6.1 | 2026-03-22 |
| publisher | v54 | publisher-v1.3.x | 2026-03-21 |
| video-worker | v9 | video-worker-v2.0.0 | 2026-03-21 |
| youtube-publisher | v6 | youtube-publisher-v1.0.0 | 2026-03-21 |
| image-worker | v30 | image-worker-v3.3.0 | 2026-03-20 |
| compliance-monitor | v10 | compliance-monitor-v1.2.0 | 2026-03-20 |
| pipeline-ai-summary | v10 | pipeline-ai-summary-v1 | 2026-03-20 |
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

**Key recent change:** ai-worker v2.6.1 fixes format advisor always deciding `text`.
Both `rewrite_v1` and `synth_bundle_v1` now correctly extract nested body content
before the format advisor call. Deployed ~21 Mar 2026. See D051.

---

## PG_CRON — ACTIVE JOBS (22 total)

| Schedule | Job |
|---|---|
| every 5 min | ai-worker (limit 5), publisher (limit 2), enqueue-publish-queue |
| every 10 min | content_fetch, sweep-stale-running, seed-and-enqueue-facebook, auto-approver |
| every 15 min | linkedin-publisher, image-worker |
| every 30 min | draft-notifier, pipeline-health-snapshot, video-worker |
| :15 :45 | pipeline-doctor, youtube-publisher |
| :55 | pipeline-ai-summary |
| hourly :00 | planner (create_digest_run_for_client) |
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

| App | URL | Last deploy | Commit | Status |
|---|---|---|---|---|
| invegent-dashboard | dashboard.invegent.com | 2026-03-22 | chore: roadmap sync 2026-03-22 | READY |
| invegent-portal | portal.invegent.com | 2026-03-18 | portal /performance + calendar v2 | READY |
| invegent-web | invegent.com | 2026-03-18 | public proof dashboard | READY |

Team: `pk-2528s-projects` | `team_kYqCrehXYxW02AycsKVzwNrE`
Project IDs: dashboard=`prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg`, portal=`prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa`, web=`prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ`

---

## GITHUB — LATEST COMMITS

| Repo | SHA | Date | Message |
|---|---|---|---|
| Invegent-content-engine | d1887f5 | 2026-03-22 | chore: weekly reconciliation 2026-03-22 — D051 |
| invegent-dashboard | ec58325 | 2026-03-22 | chore: roadmap sync 2026-03-22 |
| invegent-portal | ~2026-03-18 | 2026-03-18 | portal /performance + calendar v2 |
| invegent-web | ~2026-03-18 | 2026-03-18 | public proof dashboard |

---

## KNOWN ACTIVE ISSUES

| Issue | Status | Action required |
|---|---|---|
| NDIS draft queue empty | NEEDS ACTION | 24 zombie approved drafts (Feb, GPT-era) blocking fresh generation. Confirm: `UPDATE m.post_draft SET approval_status='dead', dead_reason='pre-visual backlog cleared 2026-03-22' WHERE client_id='fb98a472-ae4d-432d-8738-2273231c1ef4' AND approval_status='approved'` |
| LinkedIn publisher | External blocker | Community API review in progress. Status: "1 of 2 Access Form Review". Calendar check: 25 Mar. |
| Meta App Review | External blocker | Business verification In Review. Complete data handling + reviewer instructions section. Calendar: 1 Apr. |

---

## CLIENT PIPELINE STATUS

**NDIS Yarns** (`fb98a472-ae4d-432d-8738-2273231c1ef4`)
- Last published: 2026-03-22 04:00 UTC
- Queued: 0 — BLOCKED by zombie backlog (see above)
- Action: clear 24 zombie approved drafts to unblock image-format generation

**Property Pulse** (`4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`)
- Last published: 2026-03-21 05:00 UTC
- Queued: 7 posts for 2026-03-23
- Status: HEALTHY — no action needed

---

## CREDENTIAL STATUS

| Credential | Status | Notes |
|---|---|---|
| Anthropic API | Active | Primary AI provider, claude-sonnet-4-6 |
| OpenAI API | Active | Fallback only |
| Facebook page tokens | Active | Both clients. Check token_expires_at monthly. |
| LinkedIn org tokens | Stored | Publisher code ready. API approval pending. |
| ElevenLabs Creator | Active | NDIS: iamiUYVj7ixJcRZQkS8B (AU female), PP: YCxeyFA0G7yTk6Wuv2oq (male) |
| YouTube OAuth | Active | Both channels connected. Uploads unlisted by default. |
| Creatomate Essential | Active | $54/mo. 1080×1080 PNG + 9:16 MP4. |
| Resend | Active | Portal magic link + draft notifier |
| Gmail OAuth | Active | feeds@invegent.com, email-ingest function |

---

## WHAT'S NEXT

**Immediate:**
1. Confirm NDIS zombie draft clear (PK approval needed)
2. LinkedIn API status check — calendar 25 Mar
3. Meta App Review data handling section — calendar 1 Apr

**Phase 3 active build queue:**
1. Cowork nightly pipeline health task
2. AI Diagnostic Agent Tier 2 (~1 Apr, after 1-2 weeks of Tier 1 validation)
3. `m.post_format_performance` population (closes format advisor feedback loop)
4. Prospect demo generator (2 days effort)
5. Client health weekly report via email (2 days effort)

**Decisions log:** D001–D051 in `docs/06_decisions.md`. Latest: D051 (22 Mar 2026).
