# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Overwritten every 12 hours by the Cowork pulse task.
> Last written: 2026-03-31 06:45 UTC (4:45pm AEST)
> Written by: Claude.ai web session — 31 Mar 2026

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
| image-worker | v32 | image-worker-v3.9.1 | 2026-03-31 |
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

ai-worker v2.6.1 source committed to GitHub (31 Mar 2026).
image-worker v3.9.1 deployed and committed (31 Mar 2026) — carousel image_url bug fix.

---

## SQL FUNCTIONS — CHANGES 31 MAR 2026 (D054 + D055)

| Function | Change | Migration |
|---|---|---|
| `m.bundle_client_v4` | dedup windows 30→14 days, min_unique default 2→1 | reduce_bundle_dedup_windows_and_min_unique |
| `m.run_pipeline_for_client` | p_min_unique default 2→1 | reduce_run_pipeline_min_unique_default |
| `m.seed_client_to_ai_v2` | HAVING COUNT(*) >= 2 → >= 1 | seed_client_to_ai_v2_min_group_size_1 |
| trigger `trg_remap_video_format` | NEW — remaps video_short_* → image_quote on draft write | remap_video_format_to_image_quote_trigger |

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
| invegent-web | invegent.com | 2026-03-31 | READY ✅ NEW |

invegent-web: Full landing page now live (homepage with pricing, how it works, ABN, Privacy Policy).
Previous deploy showed "Coming soon" — root cause was Geist font import (Next.js 15 only) in layout.tsx.
Fixed: replaced with Inter. Meta business verification resubmitted against invegent.com.

Team: `pk-2528s-projects` (`team_kYqCrehXYxW02AycsKVzwNrE`)
Project IDs: dashboard=`prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg`, portal=`prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa`, web=`prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ`

---

## GITHUB — LATEST COMMITS

| Repo | SHA | Date | Message |
|---|---|---|---|
| Invegent-content-engine | 424e91f | 2026-03-31 | docs: add D054 + D055 to decisions log |
| invegent-dashboard | fc9a778 | 2026-03-23 | chore: roadmap sync 2026-03-23 |
| invegent-portal | ~2026-03-18 | 2026-03-18 | portal /performance + calendar v2 |
| invegent-web | a580c26 | 2026-03-31 | fix: replace Geist font with Inter (Next.js 14 compat) |

---

## KNOWN ACTIVE ISSUES

| Issue | Status | Action needed |
|---|---|---|
| Visual format publishing — trigger deployed | ✅ Confirmed | D055 trigger live (BEFORE INSERT/UPDATE). No video-format drafts produced yet — will remap on next run. |
| Carousel image_url = null | ✅ Fixed | image-worker v3.9.1 deployed. 5 drafts backfilled via SQL. Bug: carousel path set status without URL. |
| ai-worker v2.6.1 source not in GitHub | ✅ Fixed | Downloaded via `supabase functions download` and committed 31 Mar 2026. |
| LinkedIn publisher | 🔵 External blocker | Community Management API review in progress |
| Meta App Review | 🔵 External blocker | Business verification resubmitted 31 Mar. invegent.com now live. |
| Cowork tasks | ✅ Live | 3 tasks created manually: Reconciler (midnight AEST), Auditor (2am), Weekly (Mon 7am) |

---

## CLIENT PIPELINE STATUS

**NDIS Yarns** (`fb98a472-ae4d-432d-8738-2273231c1ef4`)
- Zombie drafts: ✅ CLEARED (24 dead)
- PP zombie drafts: ✅ CLEARED (61 dead, 31 Mar 2026)
- 1 new draft generated 31 Mar (text format, approved) — in publish queue
- Pipeline flowing. Dedup 14-day window active. Fresh content expected next ingest cycle.

**Property Pulse** (`4036a6b5-b4a3-406e-998d-c2fe14a8bbdd`)
- Zombie drafts: ✅ CLEARED (61 dead, 31 Mar 2026)
- 1 new draft generated 31 Mar (text format, needs_review)
- Ghost queue item killed (734 failed attempts, 5 Mar–31 Mar)
- Pipeline flowing. Dedup 14-day window active.

**Publish queue depth:** 2 (NDIS approved, PP needs_review pending auto-approver)
**Last published:** 2026-03-30 13:15 UTC — queue ran dry during pipeline stall

---

## CLAUDE DESKTOP MCP CONFIG

Updated 30 Mar 2026 (D053). Credentials rotated 31 Mar 2026.
- Supabase: `C:\Users\parve\AppData\Roaming\npm\mcp-server-supabase.cmd`
- Xero: `C:\Users\parve\AppData\Roaming\npm\xero-mcp-server.cmd`
- GitHub: `C:\Users\parve\github-mcp-server\github-mcp-server.exe`

**Claude Code note:** Always `cd` to the repo directory before launching Claude Code.
Correct: `cd C:\Users\parve\Invegent-content-engine && claude`
Wrong: launching from `C:\Users\parve` (home dir — no project context)

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

**Completed (31 Mar 2026 Claude Code session):**
1. ~~ai-worker v2.6.1 source committed to GitHub~~ ✅
2. ~~Carousel image_url=null bug fixed in image-worker v3.9.1~~ ✅ (deployed + 5 drafts backfilled)
3. ~~D055 trg_remap_video_format trigger confirmed~~ ✅ (active, awaiting first video-format draft)

**Next session priorities:**
1. Meta App Review — complete data handling + reviewer instructions section (overdue 1 Apr)
2. AI Diagnostic Agent Tier 2
3. m.post_format_performance population
4. Prospect demo generator
5. Client health weekly report email

**Phase 3 build queue:**
- Compliance-aware NDIS system prompt (pre-sales gate)
- Invegent own brand pages
- Client acquisition + onboarding flow (invegent.com/onboard)

Decisions through D055 in `docs/06_decisions.md`. Last decision: D055 (31 Mar 2026).
