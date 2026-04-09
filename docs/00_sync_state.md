# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-09 (session close — avatar pipeline milestone)
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
3. Do NOT fall into discovery mode. k.vw_table_summary is the single-stop navigation layer.

---

## CURRENT PHASE

**Phase 1 — COMPLETE** (all 4 criteria verified 7 Apr 2026)
**Phase 3 — Expand + Personal Brand** (active)
Phase 2 mostly complete — LinkedIn API blocked externally.

**Gate to first external client conversation is OPEN.**
**Legal review required before first external client is signed.**

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Version | Status | Notes |
|---|---|---|---|
| ai-worker | 71 | ACTIVE | **v2.7.1** — video_short_avatar support added |
| auto-approver | 29 | ACTIVE | v1.4.0 |
| compliance-monitor | 14 | ACTIVE | monthly hash check |
| compliance-reviewer | 4 | ACTIVE | v1.3.0 |
| content_fetch | 65 | ACTIVE | |
| draft-notifier | 16 | ACTIVE | |
| email-ingest | 15 | ACTIVE | |
| feed-intelligence | 20 | ACTIVE | |
| heygen-intro | 2 | ACTIVE | one-shot test function |
| heygen-test | 6 | ACTIVE | API health check + video status |
| heygen-worker | **2** | ACTIVE | **v1.1.0** — reads stakeholder_role from video_script |
| heygen-youtube-upload | 1 | ACTIVE | one-shot direct upload test |
| image-worker | 37 | ACTIVE | v3.9.2 |
| ingest | 95 | ACTIVE | v8-youtube-channel |
| insights-worker | 32 | ACTIVE | v14.0.0 |
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
| video-analyser | 4 | ACTIVE | v1.2.0 |
| video-worker | 14 | ACTIVE | v2.1.0 |
| wasm-bootstrap | 13 | ACTIVE | |
| youtube-publisher | 15 | ACTIVE | v1.5.0 |
| youtube-token-test | 5 | ACTIVE | |

29 functions deployed. All ACTIVE.

---

## AVATAR PIPELINE — MILESTONE COMPLETE (9 Apr 2026)

The full AI avatar video pipeline is live and automated. No human steps required.

### Flow
```
Signal arrives → ingest → bundler → ai_job created
  → ai-worker v2.7.1:
      - format advisor selects video_short_avatar for conversational/educational content
      - generateVideoScript() runs:
          - queries c.brand_avatar for active stakeholder roles
          - generates narration_text + stakeholder_role + render_style
          - writes to draft_format.video_script via set_draft_video_script
          - sets video_status = 'pending'
  → auto-approver approves
  → heygen-worker v1.1.0 (every 30 min):
      - reads narration_text from draft_format.video_script
      - reads stakeholder_role → looks up c.brand_avatar → gets talking_photo_id + voice_id
      - submits HeyGen job (POST /v2/video/generate)
      - polls until complete (~70 seconds)
      - downloads MP4 → uploads to post-videos storage bucket
      - sets video_url (storage URL), video_status = 'generated'
  → youtube-publisher (every 15 min):
      - uploads to YouTube
      - sets video_status = 'published'
```

### Timing benchmarks (proven 9 Apr 2026)
- HeyGen render: ~70 seconds for a 10-12 second talking photo video
- Full pipeline (script → YouTube): under 5 minutes when workers are running
- Credit cost: ~2-4 credits per minute of video

### Avatar cast — NDIS Yarns (fb98a472...)

| Role | Realistic | Animated | Voice |
|---|---|---|---|
| NDIS Participant (Alex) | `b3a7e888d11843d79cd66f61a8f941f4` ✅ | `9b8b0b70f8934bdeb0488100cb3ae864` ✅ | `WaFYykjEkTFpHMit8egg` |
| Support Coordinator | not assigned | not assigned | — |
| Local Area Coordinator | not assigned | not assigned | — |
| Allied Health Provider | not assigned | not assigned | — |
| Plan Manager | not assigned | not assigned | — |
| Support Worker | not assigned | not assigned | — |
| Family / Carer | not assigned | not assigned | — |

### Avatar cast — Property Pulse (4036a6b5...)
All 7 roles unassigned — to be built after NDIS Yarns cast is complete.

### YouTube test videos (unlisted)
- Realistic Alex: https://www.youtube.com/watch?v=mJNe1EjnwKw
- Animated Alex: https://www.youtube.com/watch?v=ZuD-_XWRGBw

### Known issue: smile expression
Both Alex avatars have an overly broad smile (from the photo generation prompt).
Fix for next avatar: add "neutral, composed expression — not smiling broadly" to the
"Describe your avatar" field in HeyGen. Doesn't affect pipeline functionality.

---

## SCHEMA — NEW TABLES (9 Apr 2026)

| Table | Schema | Purpose |
|---|---|---|
| `brand_stakeholder` | c | Cast of roles per brand (7 roles each for NDIS Yarns + PP) |
| `brand_avatar` | c | Avatar assignment per stakeholder × render_style. Replaces client_avatar_profile. |
| `video_analysis` | f | YouTube video analysis results |

**New SECURITY DEFINER functions (9 Apr 2026):**
- `public.get_brand_stakeholders(p_client_id)` — returns stakeholder list with avatar counts
- `public.get_brand_avatars(p_client_id)` — returns avatar assignments with role info
- `public.assign_brand_avatar(id, avatar_id, voice_id, name)` — assigns avatar to slot
- `public.clear_brand_avatar(id)` — clears an avatar assignment

**Note:** `c.client_avatar_profile` is superseded by `c.brand_stakeholder` + `c.brand_avatar`.
Do not use `client_avatar_profile` in new code.

---

## FORMAT PALETTE UPDATE (9 Apr 2026)

`video_short_avatar` in `t.5.3_content_format`:
- `is_buildable = true` (was false)
- `advisor_description` updated — format advisor will now select it for conversational/educational content
- `best_for` = conversational education, participant guides, stakeholder Q&A, advocacy

---

## PG_CRON JOBS — ALL ACTIVE

| Job | Schedule | Function |
|---|---|---|
| rss-ingest-run-all-hourly | every 6h | ingest /run-all |
| video-worker-every-30min | every 30 min | video-worker |
| **heygen-worker-every-30min** | **every 30 min** | **heygen-worker (NEW)** |
| youtube-publisher (15 min) | every 15 min | youtube-publisher |
| auto-approver | every 30 min | auto-approver |
| k-schema-refresh-weekly | Sunday 3am UTC | k schema refresh |
| system-audit-weekly | Sunday 13:00 UTC | B4 health check |
| compliance-monitor-monthly | 1st of month | compliance hash check |

---

## DASHBOARD — invegent-dashboard

Last deploy: 9 Apr 2026

**Changes 9 Apr 2026:**
- Clients page: **Avatars tab** — stakeholder cast grid, realistic + animated slots per role,
  assign/clear flow with inline form, A/B test explanation, Browse HeyGen avatars link
- Roadmap: Avatar cast UI added to Phase 3, `is_buildable` for video_short_avatar updated,
  date bumped to 9 Apr 2026
- Newlines fix: roadmap/page.tsx had literal \n corruption — fixed
- `actions/avatars.ts` — getBrandStakeholders, getBrandAvatars, assignAvatar, clearAvatar
- `components/clients/AvatarTab.tsx` — full avatar management UI

---

## PIPELINE STATE

### Publishing

| Format | NDIS-Yarns | Property Pulse |
|---|---|---|
| facebook text | ✅ daily | ✅ daily |
| facebook image_quote | ✅ | ✅ |
| facebook carousel | ✅ | ✅ |
| facebook video_short_kinetic | ❌ | ✅ |
| facebook video_short_stat | ❌ | ✅ |
| youtube video_short_* | ❌ | ✅ 4 videos |
| youtube video_short_avatar | ✅ 2 test videos | ❌ |

### Token Calendar

| Platform | Client | Expiry |
|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 |
| YouTube | Property Pulse | 2 Apr 2031 |
| Facebook | Property Pulse | ~6 Jun 2026 (~58d) |
| Facebook | NDIS-Yarns | ~1 Jun 2026 (~53d) |

⚠️ Facebook tokens need refreshing in ~50 days.

---

## DECISIONS LOG

D001–D077: see docs/06_decisions.md.
D078: video_short_avatar is_buildable=true — format advisor may now select avatar format automatically.
D079: heygen-worker reads narration_text + stakeholder_role from draft_format.video_script (set by ai-worker via set_draft_video_script RPC). Top-level draft_format fields also supported as override.
D080: Alex avatar smile issue noted — next avatar brief to include "neutral, not smiling broadly".

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| Facebook tokens expiring ~50 days | MED | Refresh early June 2026 |
| Publisher schedule not wired | LOW | Table+UI live, publisher reads own timing |
| NDIS Yarns no kinetic/stat video drafts | LOW | Text vertical. Not priority. |
| Meta App Review | 🔴 External | Business verification In Review. Next check: 14 Apr. |
| LinkedIn API | 🔴 External | Community Management API review. Next check: 14 Apr. |
| Alex avatar — smile expression | LOW | Cosmetic only. Fix on next avatar creation. |
| Legal review | 🔴 Business gate | $2–5k AUD. Initiate when Meta Standard Access confirmed. |
| Support Coordinator avatar not assigned | MED | Needed for conversational pair with Participant. |
| PP avatar cast not assigned | LOW | NDIS Yarns first, PP second. |

---

## WHAT IS NEXT

**Immediate — in order:**
1. **Create Support Coordinator avatar in HeyGen** — pair with Alex (Participant) for first
   conversational dual-avatar scene. Use "neutral, composed" expression in prompt.
2. **B5 — Weekly manager report email** — Sunday Edge Function via Resend.
3. **Publisher schedule wiring** — c.client_publish_schedule → publisher assigns scheduled_for.
4. **F1 — Prospect demo generator** — before first external client conversation.
5. **Check Meta App Review + LinkedIn (14 Apr)** — both are external blockers.

**Avatar pipeline next steps:**
- Create Support Coordinator avatar (HeyGen UI) → assign in dashboard Avatars tab
- ai-worker will start generating dual-stakeholder narration scripts automatically
- heygen-worker will render and upload to YouTube
- Monitor first auto-generated avatar videos for quality

**External blockers (check 14 Apr):**
- Meta App Review: business verification In Review
- LinkedIn API: Community Management API review in progress
