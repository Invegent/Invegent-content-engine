# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Overwritten every 12 hours by the Cowork pulse task.
> Last written: 2026-03-30 13:00 UTC (midnight AEST)
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

**Key recent changes (30 Mar 2026 — Claude Code session):**
- 16 functions bumped by Claude Code session. Exact nature of changes TBC — action plan work in progress.
- `pipeline-ai-summary` — 500 error fix attempted (status: verify)
- `publisher`, `image-worker`, `ai-worker` — visual format publishing fix attempted (status: verify)

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
| Invegent-content-engine | — | 2026-03-30 | chore: sync state 30 Mar 2026 — post Claude Code session |
| invegent-dashboard | fc9a778 | 2026-03-23 | chore: roadmap sync 2026-03-23 |
| invegent-portal | ~2026-03-18 | 2026-03-18 | portal /performance + calendar v2 |
| invegent-web | ~2026-03-18 | 2026-03-18 | public proof dashboard |

---

## KNOWN ACTIVE ISSUES

| Issue | Status | Action needed |
|---|---|---|
| pipeline-ai-summary | 🟡 Fix attempted 30 Mar | Verify 500 errors resolved — check next :55 run |
| Visual format publishing | 🟡 Fix attempted 30 Mar | Verify both clients generating non-text formats |
| Property Pulse 61 approved drafts | ⚠️ NOT QUEUING | 61 approved drafts stuck — enqueue logic or publish_mode issue. Check c.client_publish_profile |
| Cowork scheduled task UUID | ⚠️ STALE | Still pointing at old Max plan project UUID — sync state not auto-updated. Fix needed. |
| LinkedIn publisher | 🔵 External blocker | Community Management API review in progress |
| Meta App Review | 🔵 External blocker | Business verification In Review. Data handling section still to complete. Calendar: 1 Apr |

---

## CLIENT PIPELINE STATUS

**NDIS Yarns** (`fb98a472-ae4d-432d-8738-2273231c1ef4`)
- Zombie drafts: ✅ CLEARED (24 dead, 0 approved blocking queue)
- Queue: 0 posts — pipeline should now generate fresh drafts
- 1 draft in needs_review as of 30 Mar 07:05 UTC

**Property Pulse** (`4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`)
- 61 approved drafts, 0 in publish queue — INVESTIGATE
- Check: `c.client_publish_profile` publish_mode, enqueue-publish-queue logic

---

## CLAUDE DESKTOP MCP CONFIG

Updated 30 Mar 2026 (D053). Both npx -y @latest calls replaced with global npm installs:
- Supabase: `C:\Users\parve\AppData\Roaming\npm\mcp-server-supabase.cmd`
- Xero: `C:\Users\parve\AppData\Roaming\npm\xero-mcp-server.cmd`
- GitHub: `C:\Users\parve\github-mcp-server\github-mcp-server.exe` (unchanged)

---

## CREDENTIALS STATUS

| Credential | Status |
|---|---|
| Anthropic API | Active — primary AI provider. No fallback in last 24h. |
| OpenAI API | Active — fallback only |
| Facebook page tokens | Active — both clients |
| LinkedIn org tokens | Stored — publisher code ready, API approval pending |
| ElevenLabs Creator | Active — NDIS + PP voices confirmed |
| YouTube OAuth | Active — both channels, uploads unlisted by default |
| Creatomate Essential | Active — $54/mo |
| Resend | Active — magic link + draft notifier |
| Gmail OAuth (email-ingest) | Active — feeds@invegent.com |
| Supabase access token | ⚠️ ROTATE — was exposed in Claude Code session 30 Mar |
| GitHub PAT | ⚠️ ROTATE — was exposed in Claude Code session 30 Mar |
| Xero client secret | ⚠️ ROTATE — was exposed in Claude Code session 30 Mar |

---

## WHAT IS NEXT

**Priority order (ICE action plan 30 Mar):**
1. Verify pipeline-ai-summary 500 fix — check next :55 run logs
2. Verify visual format publishing — check next draft generation cycle
3. Investigate PP 61 approved drafts not queuing
4. Fix Cowork scheduled task UUID — resume auto sync state writes
5. Rotate exposed credentials (Supabase token, GitHub PAT, Xero secret)

**Phase 3 build queue:**
1. AI Diagnostic Agent Tier 2 (~1 Apr)
2. m.post_format_performance population
3. Prospect demo generator (2 days)
4. Client health weekly report email (2 days)

Decisions D044–D053 in `docs/06_decisions.md`. Last decision: D053 (30 Mar 2026).
