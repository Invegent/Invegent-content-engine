# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Overwritten every night at midnight AEST by the Cowork reconciliation task.
> Last written: 2026-03-31 14:00 UTC (midnight AEST 2026-04-01)
> Written by: Cowork nightly reconciliation

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

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Deploy# | Status | Last updated |
|---|---|---|---|
| inspector | v80 | ACTIVE | 2026-02-02 |
| ingest | v92 | ACTIVE | 2026-01-26 |
| content_fetch | v63 | ACTIVE | 2026-03-10 |
| ai-worker | v66 | ACTIVE | 2026-03-21 |
| publisher | v56 | ACTIVE | 2026-03-19 |
| inspector_sql_ro | v35 | ACTIVE | 2026-02-22 |
| auto-approver | v27 | ACTIVE | 2026-03-11 |
| insights-worker | v30 | ACTIVE | 2026-03-20 |
| feed-intelligence | v18 | ACTIVE | 2026-03-07 |
| email-ingest | v13 | ACTIVE | 2026-03-11 |
| draft-notifier | v14 | ACTIVE | 2026-03-18 |
| linkedin-publisher | v13 | ACTIVE | 2026-03-18 |
| image-worker | v34 | ACTIVE | 2026-03-31 |
| series-outline | v13 | ACTIVE | 2026-03-19 |
| series-writer | v14 | ACTIVE | 2026-03-20 |
| wasm-bootstrap | v11 | ACTIVE | 2026-03-19 |
| pipeline-doctor | v11 | ACTIVE | 2026-03-19 |
| pipeline-ai-summary | v12 | ACTIVE | 2026-03-19 |
| compliance-monitor | v12 | ACTIVE | 2026-03-19 |
| video-worker | v11 | ACTIVE | 2026-03-20 |
| tts-test | v9 | ACTIVE | 2026-03-20 |
| youtube-publisher | v8 | ACTIVE | 2026-03-20 |
| youtube-token-test | v3 | ACTIVE | 2026-03-20 |
| series-outline | v13 | ACTIVE | 2026-03-19 |
| pipeline-fixer | v2 | ACTIVE | 2026-03-31 |

All 25 functions ACTIVE. No degraded or inactive functions detected.

---

## SQL CHANGES — 31 MAR 2026

| Change | Detail |
|---|---|
| D054 | bundle_client_v4 dedup 30→14d, min_unique 2→1; run_pipeline_for_client + seed_client_to_ai_v2 same |
| D055 | trg_remap_video_format trigger — video_short_* → image_quote on post_draft write |
| D056 | NDIS Yarns brand_identity_prompt updated — full compliance rules embedded (7,625 chars) |
| D057 | m.pipeline_fixer_log table created; pipeline-fixer pg_cron job #36 (:25 and :55 every hour) |

---

## PG_CRON — ACTIVE (23 jobs)

Previous 22 jobs unchanged. Added:
- Job #36: pipeline-fixer at :25 and :55 every hour

---

## PIPELINE STATE

### Queue Depths

| Client | Queued | Published (total) | Last published at |
|---|---|---|---|
| NDIS-Yarns | 0 | 39 | 2026-03-01 02:10 UTC |
| Property Pulse | 0 | 2 | 2026-03-05 06:45 UTC |

⚠️ **Anomaly:** NDIS-Yarns queue shows last_published_at as 2026-03-01 but post_draft table shows 11 NDIS posts published in the last 7 days. Possible that publisher marks drafts 'published' without updating post_publish_queue updated_at, or queue records are cleared after publish. Needs investigation.

### Draft State — Last 7 Days

| Client | Status | Format | Count |
|---|---|---|---|
| NDIS-Yarns | draft | (null) | 1 |
| NDIS-Yarns | published | text | 11 |
| NDIS-Yarns | published | (null) | 1 |
| Property Pulse | published | image_quote | 1 |
| Property Pulse | published | text | 1 |
| Property Pulse | published | video_short_kinetic | 1 |
| Property Pulse | published | video_short_stat | 1 |

Total published last 7 days: 16 posts (12 NDIS, 4 PP). 1 NDIS draft still in draft state.

### Image Generation

No drafts currently in approved/needs_review state — image generation queue is clear.
Last Creatomate render: 2026-03-20 13:00 UTC — format: carousel — status: succeeded — no error.

### Client Publish Profiles (Facebook)

| Client | publish_enabled | paused_until | paused_reason | auto_approve | image_gen | video_gen |
|---|---|---|---|---|---|---|
| Property Pulse | true | — | — | true | true | false |
| NDIS-Yarns | true | 2026-03-01 01:34 UTC | Manual pause from ICE Control Room | true | true | false |

⚠️ **Note:** NDIS-Yarns paused_until (2026-03-01) is in the past — pause has technically expired. Publishing appears to be proceeding normally based on draft state (11 published in 7 days). The stale paused_until value may be a cleanup item for the ICE Control Room UI.

### AI Usage — Last 24h

| Provider | Model | Fallback | Calls | Cost (USD) |
|---|---|---|---|---|
| anthropic | claude-sonnet-4-6 | false | 4 | $0.1165 |

No OpenAI fallback calls. All calls via Anthropic primary.

### AI Usage — This Month (April 2026)

Total calls: 0 | Total cost: $0.00 | Fallback calls: 0

(Month just rolled over at midnight AEST — no April calls yet at time of reconciliation.)

### Last Pipeline AI Summary

- Generated: 2026-03-31 12:55 UTC
- health_ok: **true**
- action_needed: null
- Preview: "The pipeline processed 1 Property Pulse post in the last 2 hours, published at 9:55 PM with an image quote format, though the image is still pending generation. Queue depth dropped from 3 items at 8:00 PM to empty by 9:30 PM, indicating normal processing flow. Today's totals show 2 NDIS Yarns posts..."

### Dead Letter — Last 7 Days

| Dead reason | Count |
|---|---|
| pre-visual-pipeline backlog cleared 2026-03-31 | 61 |

This is a deliberate bulk cleanup of old backlog drafts on 31 Mar — not an error condition.

---

## GITHUB — LATEST COMMITS

| Repo | SHA | Date | Message |
|---|---|---|---|
| Invegent-content-engine | 9b810f0 | 2026-03-31 | docs: add D056 (NDIS compliance prompt) + D057 (pipeline-fixer Tier 2) |
| Invegent-content-engine | e4f94fd | 2026-03-31 | chore: final sync state — 31 Mar 2026 full day |
| Invegent-content-engine | 42e991d | 2026-03-31 | feat: pipeline-fixer v1.1.0 — Tier 2 AI diagnostic auto-fixer (D057) |
| invegent-dashboard | 0f84150 | 2026-03-31 | chore: roadmap sync 2026-03-31 — 6 Phase 3 items updated |
| invegent-dashboard | 233dfd5 | 2026-03-31 | fix: Monitor nav routing, pipeline-stats SQL bug, add SectionTabs to flow diagram page |
| invegent-dashboard | 4613417 | 2026-03-31 | feat: pipeline flow diagram — live system monitor with ReactFlow |
| invegent-portal | b734abe | 2026-03-19 | fix: portal calendar shows client timezone label |
| invegent-portal | 63008ef | 2026-03-19 | feat: add Invegent favicon to portal tab |
| invegent-portal | be5632b | 2026-03-18 | feat: send Resend confirmation email on feed suggestion submit |
| Invegent-web | 3f98799 | 2026-03-31 | feat: replace static 3-step how-it-works with animated 5-stage pipeline flow |
| Invegent-web | a580c26 | 2026-03-31 | fix: replace Geist font (Next.js 15 only) with Inter for Next.js 14 compatibility |
| Invegent-web | 26c782d | 2026-03-31 | feat: homepage — professional landing page for Invegent |

---

## VERCEL FRONTENDS — LIVE

| App | URL | Last deploy | Status |
|---|---|---|---|
| invegent-dashboard | dashboard.invegent.com | 2026-03-31 | READY |
| invegent-portal | portal.invegent.com | 2026-03-19 | READY |
| invegent-web | invegent.com | 2026-03-31 | READY |

Team: pk-2528s-projects (team_kYqCrehXYxW02AycsKVzwNrE)

Latest dashboard commit on Vercel: `0f84150` — "chore: roadmap sync 2026-03-31 — 6 Phase 3 items updated"
Latest web commit on Vercel: `3f98799` — animated 5-stage pipeline flow (Phase 3 website build done ✅)
Portal unchanged since 2026-03-19.

---

## KNOWN ACTIVE ISSUES

| Issue | Status |
|---|---|
| NDIS queue last_published_at discrepancy | 🟡 Queue shows 2026-03-01 but draft table shows 11 posts published in 7 days — possible tracking gap |
| NDIS paused_until stale value | 🟡 2026-03-01 (past) — pause technically expired, publishing proceeding. Stale value in DB |
| LinkedIn publisher | 🔵 External — Community Management API review in progress |
| Meta App Review | 🔵 External — Business verification In Review. Calendar: check 10 Apr 2026 |
| 1 NDIS draft in 'draft' status | ⬜ 1 draft in m.post_draft without approval_status progress — monitor next run |

No stuck queue items (0). No Edge Function errors. All Vercel frontends READY.

---

## CLIENT PIPELINE STATUS

**NDIS Yarns** (fb98a472-ae4d-432d-8738-2273231c1ef4)
Pipeline active. 11 posts published in last 7 days (text format). 1 new NDIS compliance prompt (D056) live since 2026-03-31 07:33 UTC — next NDIS drafts will use full compliance rules. image_generation_enabled=true, video_generation_enabled=false. paused_until value is stale (past date, publishing proceeding normally).

**Property Pulse** (4036a6b5-b4a3-406e-998d-c2fe14a8bbdd)
4 posts published in last 7 days across formats (image_quote, text, video_short_kinetic, video_short_stat). auto_approve=true, image_gen=true, video_gen=false. Not paused.

---

## CREDENTIALS STATUS

| Credential | Status |
|---|---|
| Anthropic API | Active — primary AI provider |
| OpenAI API | Active — fallback only |
| Facebook page tokens | Active — both clients |
| LinkedIn org tokens | Stored — API approval pending |
| ElevenLabs Creator | Active — NDIS + PP voices confirmed |
| YouTube OAuth | Active — both channels, uploads unlisted |
| Creatomate Essential | Active — $54/mo |
| Resend | Active — magic link + draft notifier |
| Gmail OAuth (email-ingest) | Active — feeds@invegent.com |
| Supabase access token | ✅ Rotated 31 Mar 2026 |
| GitHub PAT | ✅ Rotated 31 Mar 2026 |
| Xero client secret | ✅ Rotated 31 Mar 2026 |

---

## EXTERNAL BLOCKERS

- LinkedIn publisher: Community Management API review in progress
- Meta App Review: Business verification In Review — next check 10 Apr 2026

---

## WHAT IS NEXT

**✅ DONE since last sync (confirmed by GitHub commits 2026-03-31):**
- invegent.com pipeline diagram — animated 5-stage pipeline flow live (`3f98799` in Invegent-web) ✅
- Dashboard pipeline flow diagram (ReactFlow /monitor page) — live (`4613417` in invegent-dashboard) ✅

**Next Claude Code session:**
- Compliance-aware Property Pulse system prompt (financial advice rules, different from NDIS)
- Client health weekly report email
- Prospect demo generator
- Invegent brand pages (own ICE client setup)
- Investigate NDIS queue last_published_at discrepancy (queue tracking gap?)
- Clear stale NDIS paused_until value in client_publish_profile if no longer needed

**External blockers (nothing to action):**
- Meta App Review: next check 10 Apr
- LinkedIn: waiting on API

Decisions through D057 in `docs/06_decisions.md`.
