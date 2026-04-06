# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Overwritten every night at midnight AEST by the Cowork reconciliation task.
> Last written: 2026-04-06 14:00 UTC
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
| auto-approver | 29 | ACTIVE | 2026-03-11 04:33 UTC |
| compliance-monitor | 14 | ACTIVE | 2026-03-19 21:55 UTC |
| compliance-reviewer | 4 | ACTIVE | 2026-04-02 11:01 UTC |
| content_fetch | 65 | ACTIVE | 2026-03-10 18:14 UTC |
| draft-notifier | 16 | ACTIVE | 2026-03-18 02:43 UTC |
| email-ingest | 15 | ACTIVE | 2026-03-11 00:03 UTC |
| feed-intelligence | 20 | ACTIVE | 2026-03-07 07:37 UTC |
| image-worker | 36 | ACTIVE | 2026-03-31 07:11 UTC |
| ingest | 94 | ACTIVE | 2026-01-26 06:28 UTC |
| insights-worker | 32 | ACTIVE | 2026-03-20 08:00 UTC |
| inspector | 82 | ACTIVE | 2026-02-02 22:07 UTC |
| inspector_sql_ro | 37 | ACTIVE | 2026-02-23 22:34 UTC |
| linkedin-publisher | 15 | ACTIVE | 2026-03-18 00:06 UTC |
| pipeline-ai-summary | 14 | ACTIVE | 2026-03-19 20:38 UTC |
| pipeline-doctor | 13 | ACTIVE | 2026-03-19 09:52 UTC |
| pipeline-fixer | 4 | ACTIVE | 2026-03-31 08:01 UTC |
| publisher | 58 | ACTIVE | 2026-03-20 04:21 UTC |
| series-outline | 15 | ACTIVE | 2026-03-19 02:40 UTC |
| series-writer | 16 | ACTIVE | 2026-03-20 12:31 UTC |
| tts-test | 11 | ACTIVE | 2026-03-20 10:43 UTC |
| video-worker | 13 | ACTIVE | 2026-03-20 10:46 UTC |
| wasm-bootstrap | 13 | ACTIVE | 2026-03-19 06:00 UTC |
| youtube-publisher | 13 | ACTIVE | 2026-04-01 01:01 UTC |
| youtube-token-test | 5 | ACTIVE | 2026-03-20 12:00 UTC |

25 functions deployed. All ACTIVE. No version changes since last reconcile (2026-04-03).

---

## PIPELINE STATE

### Queue Depths

| Client | Queued | Published Total | Last Published At |
|---|---|---|---|
| Property Pulse | 2 | 3 | 2026-04-01 05:05 UTC |
| NDIS-Yarns | 0 | 39 | 2026-03-01 02:10 UTC |

⚠️ Property Pulse has 2 items in queue (up from 0 at last reconcile). Pipeline AI summary confirms 1 PP post published today and a carousel currently processing.

### Draft State — Last 7 Days

| Client | Approval Status | Format | Count |
|---|---|---|---|
| NDIS-Yarns | published | text | 6 |
| Property Pulse | needs_review | carousel | 2 |
| Property Pulse | published | image_quote | 1 |
| Property Pulse | published | text | 1 |
| Property Pulse | published | video_short_kinetic | 2 |
| Property Pulse | published | video_short_stat | 1 |

**Summary:** 11 drafts published in the last 7 days (6 NDIS Yarns text, 5 Property Pulse mixed formats). 2 Property Pulse carousels are currently in `needs_review` status awaiting approval.

### Image Generation

| Image Status | Count |
|---|---|
| pending | 2 |

2 images pending generation in `approved`/`needs_review` drafts — likely associated with the 2 Property Pulse carousels in needs_review.

**Last Creatomate render:** 2026-03-31 22:31 UTC — `video_short_kinetic` — succeeded (no error)
_(Note: m.post_render_log query failed — column `client_name` does not exist in that table. Previous value retained. Query in SKILL.md needs updating to join c.client.)_

### Client Publish Profiles

| Client | Publish Enabled | Paused Until | Paused Reason | Auto Approve | Image Gen | Video Gen |
|---|---|---|---|---|---|---|
| Property Pulse | true | — | — | true | true | true |
| NDIS-Yarns | true | — | — | true | true | true |

Both clients fully enabled. No pauses active.

### AI Usage — Last 24h

| Provider | Model | Fallback Used | Calls | Cost (USD) |
|---|---|---|---|---|
| anthropic | claude-sonnet-4-6 | false | 4 | $0.1159 |

### AI Usage — This Month (April 2026)

| Total Cost (USD) | Total Calls | Fallback Calls |
|---|---|---|
| $0.5595 | 14 | 0 |

Zero fallback to OpenAI. Anthropic primary only.

### Last Pipeline AI Summary

- **Generated at:** 2026-04-06 06:55 UTC
- **Health OK:** true
- **Action needed:** none
- **Preview:** Pipeline has been stable over the last 2 hours with 2 items consistently queued and no publishing activity since 1:30pm when 1 post went live. Today's output shows 2 NDIS Yarns posts and 1 Property Pulse post successfully published. The system is currently processing a Property Pulse carousel about...

### Orphaned Queue Items

0 stuck queue items (no `post_draft_not_found` errors).

### Dead Letter — Last 7 Days

| Dead Reason | Count |
|---|---|
| pre-visual-pipeline backlog cleared 2026-03-31 | 61 |
| stale scheduled post — missed Feb 11-12 window, image never generated, cleared by auditor 2026-04-01 | 6 |

67 total dead-lettered drafts — all from housekeeping cleanup, not pipeline failures. Unchanged from last reconcile.

---

## GITHUB — LATEST COMMITS

| Repo | SHA | Date | Message |
|---|---|---|---|
| Invegent-content-engine | e231b52 | 2026-04-02 | feat: ai-diagnostic v1.0.0 — Tier 2 daily health report with trend, per-client scoring, recommendations, predictions |
| Invegent-content-engine | f3e789d | 2026-04-02 | chore: nightly reconcile 2026-04-03 |
| Invegent-content-engine | d86a1d7 | 2026-04-02 | audit: nightly report 2026-04-03 — 3 WARN, 2 INFO |
| invegent-dashboard | 0439f73 | 2026-04-02 | feat: AI Diagnostic Tier 2 — /diagnostics page + /api/diagnostics route |
| invegent-dashboard | a27220f | 2026-04-02 | fix: compliance PATCH — use SECURITY DEFINER rpc instead of exec_sql for m schema DML |
| invegent-dashboard | f88a4df | 2026-04-02 | chore: roadmap sync 2 Apr 2026 — k schema repair done, wire-up corrected to done, D069 |
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
| invegent-dashboard | dashboard.invegent.com | 2026-04-02 20:32 UTC | READY | 0439f73 |
| invegent-portal | portal.invegent.com | 2026-03-19 07:24 UTC | READY | b734abe |
| invegent-web | invegent.com | 2026-03-31 08:40 UTC | READY | 3f98799 |

Team: pk-2528s-projects (team_kYqCrehXYxW02AycsKVzwNrE)

Note: invegent-dashboard updated since last reconcile — now at 0439f73 (AI Diagnostic Tier 2 page deployed).

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Action |
|---|---|---|
| NDIS Yarns last publish 2026-03-01 — now 36 days ago | MED | Investigate if pipeline is generating new NDIS content |
| 2 Property Pulse carousels in needs_review | INFO | Awaiting approval — auto-approve is on, may process automatically |
| 2 images pending in approved/needs_review drafts | INFO | Image-worker should pick these up; monitor |
| Dead letter: 67 items cleared in last 7 days (housekeeping) | INFO | No action — planned cleanup, not pipeline failures |
| Meta App Review | 🔴 External | Business verification In Review — data handling section pending |
| LinkedIn API | 🔴 External | Community Management API review in progress |
| m.post_render_log query schema error | LOW | `client_name` column does not exist — SKILL.md query needs a JOIN to c.client |

---

## CLIENT PIPELINE STATUS

**NDIS Yarns** (fb98a472-ae4d-432d-8738-2273231c1ef4)
- Facebook: publishing enabled, auto-approve on, image+video generation on
- Queue: 0 queued, 39 published total (last publish 2026-03-01 — 36 days ago)
- Last 7 days: 6 text drafts published
- Pipeline AI summary confirms 2 NDIS posts published today (2026-04-06)
- No pauses active. No stuck items.

**Property Pulse** (4036a6b5-b4a3-406e-998d-c2fe14a8bbdd)
- Facebook: publishing enabled, auto-approve on, image+video generation on
- Queue: 2 queued, 3 published total (last publish 2026-04-01)
- Last 7 days: 5 drafts published (1 image_quote, 1 text, 2 video_short_kinetic, 1 video_short_stat); 2 carousels in needs_review
- Pipeline AI summary confirms 1 PP post published today; carousel processing
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
