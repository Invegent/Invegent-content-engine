# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Overwritten every night at midnight AEST by the Cowork reconciliation task.
> Last written: 2026-04-03 04:55 AEST (2026-04-02 18:55 UTC)
> Written by: Cowork nightly reconciliation

---

## HOW TO USE THIS FILE

At the start of every session involving ICE technical work, read this file
before answering any question or writing any code. It tells you what is
actually deployed right now — not what the docs say should be deployed.
If this file contradicts memory or 04_phases.md, this file wins.

---

## SESSION STARTUP PROTOCOL

**Do this at the start of every session, in order:**

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

**k schema status (as of 2 Apr 2026 — FULLY REPAIRED):**
- 117 tables documented across a, c, f, k, m, t schemas — zero TODO entries
- c and f schemas now fully registered and column-synced (207 + 149 columns)
- Weekly pg_cron: `k-schema-refresh-weekly` every Sunday 3am UTC
- `sync_registries()` and `refresh_column_registry()` bugs fixed
- Manually-coded purpose entries are preserved on every refresh — safe to re-run

---

## CLAUDE CODE AGENTIC LOOP

For well-scoped build tasks that don't require human judgment mid-execution:
1. Write brief in `docs/briefs/YYYY-MM-DD-task-name.md`
2. Run Claude Code from `C:\Users\parve\Invegent-content-engine`
3. Prompt: "Read docs/briefs/... and execute all tasks autonomously"
4. MCPs needed: Supabase MCP + GitHub MCP

Proven 2 Apr 2026 — 4 tasks, no human intervention, minutes not hours. (D067)

---

## CURRENT PHASE

**Phase 3 — Expand + Personal Brand** (active)
Phase 1 complete. Phase 2 mostly complete — LinkedIn API blocked externally.

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Deploy# | Status | Last updated |
|---|---|---|---|
| ai-worker | 68 | ACTIVE | 2026-03-22 04:54 UTC |
| auto-approver | 29 | ACTIVE | 2026-03-11 04:29 UTC |
| compliance-monitor | 14 | ACTIVE | 2026-03-19 21:48 UTC |
| compliance-reviewer | 4 | ACTIVE | 2026-04-02 10:57 UTC |
| content_fetch | 65 | ACTIVE | 2026-03-10 18:15 UTC |
| draft-notifier | 16 | ACTIVE | 2026-03-18 02:43 UTC |
| email-ingest | 15 | ACTIVE | 2026-03-10 23:49 UTC |
| feed-intelligence | 20 | ACTIVE | 2026-03-07 07:37 UTC |
| image-worker | 36 | ACTIVE | 2026-03-31 07:05 UTC |
| ingest | 94 | ACTIVE | 2026-01-26 06:29 UTC |
| insights-worker | 32 | ACTIVE | 2026-03-20 07:59 UTC |
| inspector | 82 | ACTIVE | 2026-02-02 22:10 UTC |
| inspector_sql_ro | 37 | ACTIVE | 2026-02-23 22:28 UTC |
| linkedin-publisher | 15 | ACTIVE | 2026-03-18 00:06 UTC |
| pipeline-ai-summary | 14 | ACTIVE | 2026-03-19 20:29 UTC |
| pipeline-doctor | 13 | ACTIVE | 2026-03-19 09:52 UTC |
| pipeline-fixer | 4 | ACTIVE | 2026-03-31 08:00 UTC |
| publisher | 58 | ACTIVE | 2026-03-20 04:13 UTC |
| series-outline | 15 | ACTIVE | 2026-03-19 02:40 UTC |
| series-writer | 16 | ACTIVE | 2026-03-20 12:32 UTC |
| tts-test | 11 | ACTIVE | 2026-03-20 10:50 UTC |
| video-worker | 13 | ACTIVE | 2026-03-20 10:53 UTC |
| wasm-bootstrap | 13 | ACTIVE | 2026-03-19 06:00 UTC |
| youtube-publisher | 13 | ACTIVE | 2026-04-01 00:52 UTC |
| youtube-token-test | 5 | ACTIVE | 2026-03-20 12:07 UTC |

25 functions deployed. All ACTIVE. No functions in error state.

---

## PIPELINE STATE

### Queue Depths

| Client | Queued | Published Total | Last Published At |
|---|---|---|---|
| NDIS-Yarns | 0 | 39 | 2026-03-01 02:10 UTC |
| Property Pulse | 0 | 3 | 2026-04-01 05:05 UTC |

### Draft State — Last 7 Days

| Client | Approval Status | Format | Count |
|---|---|---|---|
| NDIS-Yarns | published | text | 9 |
| NDIS-Yarns | published | (null) | 1 |
| Property Pulse | published | image_quote | 1 |
| Property Pulse | published | text | 1 |
| Property Pulse | published | video_short_kinetic | 1 |
| Property Pulse | published | video_short_stat | 2 |

**Summary:** 15 drafts published in the last 7 days (10 NDIS Yarns, 5 Property Pulse). No drafts currently in queued, approved, or needs_review status.

### Image Generation

No images currently pending in approved/needs_review drafts — image pipeline is clear.

**Last Creatomate render:** 2026-03-31 22:31 UTC — `video_short_kinetic` — succeeded (no error)

### Client Publish Profiles

| Client | Publish Enabled | Paused Until | Paused Reason | Auto Approve | Image Gen | Video Gen |
|---|---|---|---|---|---|---|
| Property Pulse | true | — | — | true | true | true |
| NDIS-Yarns | true | — | — | true | true | true |

Both clients fully enabled, no pauses active.

### AI Usage — Last 24h

| Provider | Model | Fallback Used | Calls | Cost (USD) |
|---|---|---|---|---|
| anthropic | claude-sonnet-4-6 | false | 6 | $0.3133 |

### AI Usage — This Month (April 2026)

| Total Cost (USD) | Total Calls | Fallback Calls |
|---|---|---|
| $0.3133 | 6 | 0 |

Zero fallback to OpenAI. Anthropic primary only.

### Last Pipeline AI Summary

- **Generated at:** 2026-04-02 17:55 UTC
- **Health OK:** true
- **Action needed:** none
- **Preview:** Pipeline running quietly overnight with zero activity in the last 2 hours. Queue depth remains at 0, no posts published, no images generated or failed. Today's total stands at 1 NDIS Yarns post, 0 Property Pulse posts. Doctor ran 4 health checks during this window, all 7 diagnostic tests passing...

### Orphaned Queue Items

0 stuck queue items (no `post_draft_not_found` errors).

### Dead Letter — Last 7 Days

| Dead Reason | Count |
|---|---|
| pre-visual-pipeline backlog cleared 2026-03-31 | 61 |
| stale scheduled post — missed Feb 11-12 window, image never generated, cleared by auditor 2026-04-01 | 6 |

67 total dead-lettered drafts — all from housekeeping cleanup, not pipeline failures.

---

## GITHUB — LATEST COMMITS

| Repo | SHA | Date | Message |
|---|---|---|---|
| Invegent-content-engine | 54225d7 | 2026-04-02 | docs: end-of-session reconciliation — k schema repair complete, D069 added |
| Invegent-content-engine | ab5e29a | 2026-04-02 | docs: D067-D068, session startup protocol, k schema navigation pattern, k repair brief |
| Invegent-content-engine | 3980d13 | 2026-04-02 | docs: brief progress + decisions log update for 2026-04-02 |
| invegent-dashboard | f88a4df | 2026-04-02 | chore: roadmap sync 2 Apr 2026 — k schema repair done, wire-up corrected to done, D069 |
| invegent-dashboard | 1a04635 | 2026-04-02 | chore: roadmap sync 2 Apr 2026 — compliance reviewer, profession dimension, pipeline fixes, doctor log |
| invegent-dashboard | a50a5f4 | 2026-04-02 | feat: compliance page — AI analysis panel, confidence badges, affected rules, Run AI Review button |
| invegent-portal | b734abe | 2026-03-19 | fix: portal calendar shows client timezone label |
| invegent-portal | 63008ef | 2026-03-19 | feat: add Invegent favicon to portal tab |
| invegent-portal | be5632b | 2026-03-18 | feat: send Resend confirmation email on feed suggestion submit |
| Invegent-web | 3f98799 | 2026-03-31 | feat: replace static 3-step how-it-works with animated 5-stage pipeline flow |
| Invegent-web | a580c26 | 2026-03-31 | fix: replace Geist font (Next.js 15 only) with Inter for Next.js 14 compatibility |
| Invegent-web | 26c782d | 2026-03-31 | feat: homepage — professional landing page for Invegent |

---

## VERCEL FRONTENDS — LIVE

| App | URL | Last deploy | Status | Commit SHA |
|---|---|---|---|---|
| invegent-dashboard | dashboard.invegent.com | 2026-04-02 12:26 UTC | READY | f88a4df |
| invegent-portal | portal.invegent.com | 2026-03-19 07:24 UTC | READY | b734abe |
| invegent-web | invegent.com | 2026-03-31 08:40 UTC | READY | 3f98799 |

Team: pk-2528s-projects (team_kYqCrehXYxW02AycsKVzwNrE)

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Action |
|---|---|---|
| Dead letter: 67 items cleared in last 7 days (housekeeping) | INFO | No action — planned cleanup |
| NDIS Yarns last publish was 2026-03-01 — 32 days ago | MED | Investigate if pipeline is generating new content for NDIS Yarns |
| NDIS Yarns YouTube | MED | Convert channel to Brand Account, connect via dashboard |
| Meta App Review | 🔴 External | Business verification In Review — next check 10 Apr 2026 |
| LinkedIn API | 🔴 External | Community Management API in review |
| AI usage this month only 6 calls ($0.31) — very low | INFO | Expected if pipeline is quiet; monitor |

---

## CLIENT PIPELINE STATUS

**NDIS Yarns** (fb98a472-ae4d-432d-8738-2273231c1ef4)
- Facebook: publishing enabled, auto-approve on, image+video generation on
- Queue: 0 queued, 39 published total (last publish 2026-03-01)
- Last 7 days: 10 drafts published (9 text, 1 unformatted)
- No pauses active. No stuck items.

**Property Pulse** (4036a6b5-b4a3-406e-998d-c2fe14a8bbdd)
- Facebook: publishing enabled, auto-approve on, image+video generation on
- Queue: 0 queued, 3 published total (last publish 2026-04-01)
- Last 7 days: 5 drafts published (1 image_quote, 1 text, 1 video_short_kinetic, 2 video_short_stat)
- No pauses active. No stuck items.

---

## CREDENTIALS STATUS

| Credential | Status |
|---|---|
| Anthropic API | Active — primary AI provider |
| OpenAI API | Active — fallback only (0 fallback calls this month) |
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
- Meta App Review: Business verification In Review — data handling section pending (calendar: 1 Apr 2026)

---

## WHAT IS NEXT

**Immediate (next session):**
1. AI Diagnostic Tier 2 — prerequisites met (doctor log 37 records). ~half day build.
2. NDIS Yarns YouTube — Brand Account conversion then connect.
3. Mark compliance queue reviewed (10 min in dashboard).

**Phase 3 build queue:**
- Prospect demo generator (~1 day) — needed before first client conversation
- Client health weekly report email (~2 days)
- Three Cowork auditor checks (1 hour)

Decisions through D069 in `docs/06_decisions.md`.
