# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-08 (session close — video pipeline session)
> Written by: PK + Claude reconciliation

---

## HOW TO USE THIS FILE

At the start of every session involving ICE technical work, read this file
before answering any question or writing any code. It tells you what is
actually deployed right now — not what the docs say should be deployed.
If this file contradicts memory or 04_phases.md, this file wins.

For the full document map, see `docs/00_docs_index.md`.

---

## SESSION STARTUP PROTOCOL

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

**k schema status:** New tables added this session — f.video_analysis, c.client_avatar_profile. Run k schema refresh before accessing these.

---

## CLAUDE CODE AGENTIC LOOP

For well-scoped build tasks that don't require human judgment mid-execution:
1. Write brief in `docs/briefs/YYYY-MM-DD-task-name.md`
2. Run Claude Code from `C:\Users\parve\Invegent-content-engine`
3. Prompt: "Read docs/briefs/... and execute all tasks autonomously"
4. MCPs needed: Supabase MCP + GitHub MCP

Proven: 2 Apr 2026 (D067), 8 Apr 2026 (YouTube channel ingest brief — 5 tasks, 17 min)

**IMPORTANT:** Claude Code sometimes completes Supabase/GitHub MCP tasks but fails to push the final dashboard commit. Always verify GitHub after Claude Code completes by checking the latest commit SHA matches.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (all 4 criteria verified 7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
Phase 2 mostly complete — LinkedIn API blocked externally.

**Gate to first external client conversation is OPEN.**
**Legal review required before first external client is signed — see docs/23_legal_register.md.**

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Deploy# | Status | Notes |
|---|---|---|---|
| ai-worker | 68 | ACTIVE | v2.7.0, profession-scoped compliance |
| auto-approver | 29 | ACTIVE | v1.4.0, 9-gate logic |
| compliance-monitor | 14 | ACTIVE | monthly hash check |
| compliance-reviewer | 4 | ACTIVE | v1.3.0, AI analysis |
| content_fetch | 65 | ACTIVE | |
| draft-notifier | 16 | ACTIVE | |
| email-ingest | 15 | ACTIVE | |
| feed-intelligence | 20 | ACTIVE | |
| heygen-test | **1** | ACTIVE | **NEW** — validates ICE_HEYGEN_API_KEY, lists avatars |
| image-worker | 37 | ACTIVE | v3.9.2 — carousel deadlock fix |
| ingest | **95** | ACTIVE | **v8-youtube-channel** — runYouTubeChannelSource() added |
| insights-worker | 32 | ACTIVE | v14.0.0 — C1 complete |
| inspector | 82 | ACTIVE | |
| inspector_sql_ro | 37 | ACTIVE | |
| linkedin-publisher | 15 | ACTIVE | waiting on API approval |
| pipeline-ai-summary | 14 | ACTIVE | |
| pipeline-doctor | 13 | ACTIVE | |
| pipeline-fixer | 4 | ACTIVE | |
| publisher | 58 | ACTIVE | |
| series-outline | 15 | ACTIVE | |
| series-writer | 16 | ACTIVE | |
| tts-test | 11 | ACTIVE | |
| video-analyser | **4** | ACTIVE | **v1.2.0** — oEmbed + timedtext + Data API + Claude |
| video-worker | **14** | ACTIVE | **v2.1.0** — approval_status bug fixed |
| wasm-bootstrap | 13 | ACTIVE | |
| youtube-publisher | 15 | ACTIVE | v1.5.0 |
| youtube-token-test | 5 | ACTIVE | |

27 functions deployed. All ACTIVE.

---

## PIPELINE STATE

### Publishing (confirmed working)

| Format | NDIS-Yarns | Property Pulse |
|---|---|---|
| facebook text | ✅ publishing daily | ✅ publishing daily |
| facebook video_short_kinetic | ❌ none generated | ✅ confirmed |
| facebook video_short_stat | ❌ none generated | ✅ confirmed |
| facebook image_quote | ✅ generating | ✅ confirmed |
| facebook carousel | ✅ unblocked 7 Apr | ✅ unblocked 7 Apr |
| youtube | ❌ no video drafts | ✅ 4 videos uploaded |

### Video pipeline — bug fixed 8 Apr 2026

video-worker v2.1.0 root bug: was only querying `approval_status = 'approved'`. Publisher marks drafts 'published' before video-worker runs every 30 min, causing all video drafts to be permanently skipped. Fix: now queries `approval_status IN ('approved', 'published')`.

7 drafts with `video_status = 'pending'` should process in the next few cron runs.

### Video analyser — live 8 Apr 2026

- video-analyser v1.2.0 deployed
- Uses YouTube oEmbed (title/channel/thumbnail) — no auth needed
- Uses YouTube Data API v3 (duration/views/description) — `ICE_YOUTUBE_DATA_API_KEY` secret active
- Tries timedtext API for transcript (works for public caption videos)
- Claude analysis: video_type, production_style, content_structure, key_hooks, ICE format suggestion, recreate brief
- Saves to `f.video_analysis` via SECURITY DEFINER function `public.insert_video_analysis`
- History accessible via `public.get_video_analyses`

### YouTube channel subscriptions — live 8 Apr 2026

- ingest-worker v95 handles `source_type_code = 'youtube_channel'`
- 2 active channels in f.feed_source:
  - Australian Property Mastery with PK Gupta (UCgpRs29idEHwGEXkIikpzXg)
  - Rask Australia (UCBtkIHFJGFVzB-kHEUGzELA)
- Picks up new videos every 6h via existing rss-ingest-run-all-hourly cron
- Analyses up to 3 new videos per run via video-analyser
- Skip-if-already-seen check against f.video_analysis
- Add new channels via Content Studio → Analyse → Channel Subscriptions

### HeyGen — connected 8 Apr 2026

- `ICE_HEYGEN_API_KEY` (named ICE_HEYGEN_API_KEY in vault) — tested, working
- 600 credits available (200 plan + free credits)
- 1,281 stock avatars available immediately
- heygen-test Edge Function deployed for health checks
- `c.client_avatar_profile` table created — ready for avatar IDs
- Avatar consent form: `docs/consent/avatar_consent_template.md` v1.0
- Legal gate L005 SATISFIED — consent form committed
- **Next: PK creates avatar in HeyGen UI tomorrow, then heygen-worker Edge Function**

### Token Calendar

| Platform | Client | Expiry | Days remaining |
|---|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 | ~1,825d |
| YouTube | Property Pulse | 2 Apr 2031 | ~1,820d |
| Facebook | Property Pulse | 6 Jun 2026 | ~59d |
| Facebook | NDIS-Yarns | 1 Jun 2026 | ~54d |

⚠️ Facebook tokens need refreshing in ~50 days.

### Performance Data (C1 — COMPLETE)

- 148 rows in m.post_performance
- Performance dashboard live at dashboard.invegent.com/monitor (Performance tab)

### Publishing Schedule

`c.client_publish_schedule` — 12 rows seeded. Schedule UI live.
⚠️ Publisher assignment not yet wired.

---

## NEW TABLES — 8 Apr 2026

| Table | Schema | Purpose |
|---|---|---|
| `video_analysis` | f | Stores YouTube video analysis results. Keyed by youtube_video_id. |
| `client_avatar_profile` | c | HeyGen avatar ID + ElevenLabs voice ID + consent record per client. |

**New SECURITY DEFINER functions:**
- `public.insert_video_analysis(...)` — DML bypass for f schema
- `public.get_video_analyses(p_client_id, p_limit)` — read f.video_analysis
- `public.insert_feed_source_youtube_channel(...)` — DML bypass for f schema

---

## DASHBOARD — invegent-dashboard

Last deploy: 8 Apr 2026 (multiple deploys)

**New this session:**
- Content Studio / Videos tab: human durations (35h not 2122min), Dismiss button for stalled videos, inline video modal (Play button no longer opens new tab)
- Content Studio / Analyse tab (NEW): YouTube URL paste → analysis → recreate brief, history panel, Channel Subscriptions (add/list/run-now)
- ModeToggle: Single Post | Content Series | Videos | **Analyse** (4 tabs now)

**Fixes this session:**
- Video tracker: Set spread → Array.from (tsconfig TS target fix)
- Video tracker action: createClient → createServiceClient
- runChannelIngestNow: reads ingest key from Supabase vault (no Vercel env var needed)

---

## NEW SECRETS — 8 Apr 2026

| Secret name | Where | Purpose |
|---|---|---|
| `ICE_YOUTUBE_DATA_API_KEY` | Supabase vault | YouTube Data API v3 — duration, views, description, captions |
| `ICE_HEYGEN_API_KEY` | Supabase vault | HeyGen API — avatar video generation |
| `INGEST_API_KEY` | Vercel env vars | Allows dashboard Run Now to call ingest Edge Function |

---

## GITHUB — LATEST COMMITS (8 Apr 2026)

| Repo | Message |
|---|---|
| Invegent-content-engine | docs: AI avatar consent form v1.0 — satisfies legal gate L005 |
| Invegent-content-engine | brief: YouTube channel subscription ingest — Claude Code task |
| invegent-dashboard | fix: runChannelIngestNow reads ingest key from Supabase vault |
| invegent-dashboard | feat: channel subscriptions UI — add/list/run-now in Analyse tab |
| invegent-dashboard | feat: video analyser — Analyse tab, YouTube URL → Claude brief |
| invegent-dashboard | fix: video tracker — human durations, dismiss, inline modal |

---

## VERCEL FRONTENDS — LIVE

| App | URL | Status |
|---|---|---|
| invegent-dashboard | dashboard.invegent.com | READY |
| invegent-portal | portal.invegent.com | READY |
| invegent-web | invegent.com | READY |

Team: pk-2528s-projects (team_kYqCrehXYxW02AycsKVzwNrE)

---

## DECISIONS LOG — CURRENT

D001–D075: See `docs/06_decisions.md`.
D076: YouTube page scraping abandoned — blocked by bot detection. Use oEmbed + timedtext + Data API instead.
D077: Ingest key read from Supabase vault at runtime — no duplication to Vercel env vars.

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| Facebook tokens expiring ~50 days | MED | Refresh early June 2026 |
| Publisher schedule not wired | LOW | Table+UI live, publisher reads own timing |
| NDIS Yarns no video drafts | LOW | Text-only vertical in practice. Not priority. |
| Meta App Review | 🔴 External | Business verification In Review. Next check: 14 Apr. |
| LinkedIn API | 🔴 External | Community Management API review. Next check: 14 Apr. |
| HeyGen avatar — no custom avatar yet | MED | PK creating avatar tomorrow. heygen-worker not built yet. |
| Legal review | 🔴 Business gate | $2–5k AUD. Initiate when Meta Standard Access confirmed. |

---

## WHAT IS NEXT

**Immediate — in order:**
1. **HeyGen avatar integration** — PK creates avatar tomorrow. Then heygen-worker Edge Function. Avatar consent form done ✅. c.client_avatar_profile table live ✅.
2. **B5 — Weekly manager report email** — Sunday Edge Function via Resend. ~2 sessions. Claude Code candidate.
3. **Publisher schedule wiring** — `c.client_publish_schedule` → publisher assigns `scheduled_for`. Half session.
4. **F5 — OpenClaw SOUL.md** — low effort, high leverage.
5. **F1 — Prospect demo generator** — needed before first external client conversation.

**External blockers (check 14 Apr):**
- Meta App Review: business verification In Review
- LinkedIn API: Community Management API review in progress

**HeyGen next steps specifically:**
- PK records 2-5 min footage in HeyGen UI → gets Avatar ID
- Set `ICE_HEYGEN_API_KEY` already done ✅
- Build heygen-worker Edge Function: script → HeyGen API → poll → download → storage → video_status = 'generated' → youtube-publisher picks up
- Dashboard: Avatar tab in Clients page showing avatar_status, consent_signed_at
