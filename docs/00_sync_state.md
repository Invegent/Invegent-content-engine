# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-09 (session close — PP avatar pipeline in progress, paused at training)
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
| ai-worker | 71 | ACTIVE | v2.7.1 — video_short_avatar support |
| auto-approver | 29 | ACTIVE | v1.4.0 |
| compliance-monitor | 14 | ACTIVE | monthly hash check |
| compliance-reviewer | 4 | ACTIVE | v1.3.0 |
| content_fetch | 65 | ACTIVE | |
| draft-notifier | 16 | ACTIVE | |
| email-ingest | 15 | ACTIVE | |
| feed-intelligence | 20 | ACTIVE | |
| heygen-avatar-creator | NEW | ACTIVE | **v2.2.0** — fire-and-forget photo avatar generation |
| heygen-avatar-poller | NEW | ACTIVE | **v1.8.0** — state machine, advances generating→training→active |
| heygen-worker | 2 | ACTIVE | v1.1.0 — reads stakeholder_role from video_script |
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
| video-analyser | 4 | ACTIVE | v1.2.0 |
| video-worker | 14 | ACTIVE | v2.1.0 |
| youtube-publisher | 15 | ACTIVE | v1.5.0 |

---

## NDIS YARNS AVATAR CAST — COMPLETE ✅ (9 Apr 2026)

All 7 roles × 2 styles = 14 slots. All have avatar_id + voice_id assigned.

| Role | Realistic | Animated | Voice |
|---|---|---|---|
| NDIS Participant (Alex) | ✅ `b3a7e888...` | ✅ `9b8b0b70...` | `WaFYykjEkTFpHMit8egg` |
| Support Coordinator | ✅ `7e98bd38...` | ✅ `e24ad30d...` | `P2AIevlJPypjV8xL6zXE` |
| Local Area Coordinator | ✅ `45addba0...` | ✅ `1b376e46...` | `tweVhPmvCaH9FHkXStKT` |
| Allied Health Provider | ✅ `a3c323dd...` | ✅ `dfa72313...` | `wzGb1z85RFicc4sA2pQ8` |
| Plan Manager | ✅ `01a1f24e...` | ✅ `073a6d33...` | `gmGBcI4Ay4BqAUa6viFq` |
| Support Worker | ✅ `88e6431c...` | ✅ `9cb85cfc...` | `IAfCHMRVp9GOvZIE0GSv` |
| Family / Carer | ✅ `28a12591...` | ✅ `77c8e1b9...` | `zSyIsT1kTH7ds4r1Jf7N` |

---

## PROPERTY PULSE AVATAR CAST — IN PROGRESS 🟡 (9 Apr 2026)

Automated pipeline built and deployed. Paused mid-run due to HeyGen API credit exhaustion ($40 spent).
**ALL 14 avatar groups have been created in HeyGen** (group_id set).
Training is the remaining step — needs more API credits to complete.

### Current state (as of session end 9 Apr 2026)

| Role | Realistic | Animated | Status |
|---|---|---|---|
| First Home Buyer | has_group ✅ | has_group ✅ | ❌ failed — needs API credits to train |
| Property Investor | has_group ✅ | has_group ✅ | ❌ failed — needs API credits to train |
| Mortgage Broker | has_group ✅ | has_group ✅ | ❌ failed — needs API credits to train |
| Buyer's Agent | has_group ✅ | has_group ✅ | ❌ failed — needs API credits to train |
| Real Estate Agent | has_group ✅ | has_group ✅ | ❌ failed — needs API credits to train |
| Landlord | has_group ✅ | has_group ✅ | ❌ failed — needs API credits to train |
| Tenant | has_group ✅ | generating | ❌ Tenant realistic still generating |

### To resume tomorrow — 3 steps:

**Step 1 — Add HeyGen API credits**
Go to app.heygen.com → Settings → API → Add funds.
Add at least $30 more (training × 14 slots is the main cost).

**Step 2 — Reset all failed slots to 'training' and let cron advance them**
All failed slots have their group_id set — only training needs to re-run.
Run this SQL:
```sql
UPDATE c.brand_avatar ba
SET avatar_gen_status = 'training',
    avatar_gen_error  = NULL
FROM c.brand_stakeholder bs
WHERE ba.stakeholder_id = bs.stakeholder_id
  AND bs.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
  AND ba.avatar_gen_status = 'failed'
  AND ba.group_id IS NOT NULL;
```

**Step 3 — Wait and monitor**
The pg_cron poller (heygen-avatar-poller-every-60s) runs every 60 seconds.
It polls each group's training status and advances to 'active' when done.
Check status:
```sql
SELECT bs.role_label, ba.render_style, ba.avatar_gen_status,
       ba.heygen_avatar_id IS NOT NULL AS has_avatar
FROM c.brand_avatar ba
JOIN c.brand_stakeholder bs ON bs.stakeholder_id = ba.stakeholder_id
WHERE bs.client_id = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd'
ORDER BY bs.sort_order, ba.render_style;
```
When all 14 show avatar_gen_status = 'active' → PP cast complete.

**Step 4 — After PP cast is active**
Assign voice IDs via dashboard → Clients → Property Pulse → Avatars tab.

### Known constraint: HeyGen trains 1 avatar at a time per account
The poller handles this automatically — it polls each group and only marks 'active'
when HeyGen reports training complete. Concurrent train calls return "already in progress"
which is a known HeyGen API behaviour, not a bug. The poller retries on next cron cycle.

---

## HEYGEN AVATAR PIPELINE — ARCHITECTURE (built 9 Apr 2026)

### New functions deployed

**heygen-avatar-creator v2.2.0** (fire-and-forget)
- POST `{client_id, render_style}` or `{stakeholder_id, render_style}`
- Calls `POST /v2/photo_avatar/photo/generate` → saves generation_id → returns immediately
- GET `?client_id=xxx` → returns job status for all slots

**heygen-avatar-poller v1.8.0** (state machine, cron every 60s)
Complete 7-step flow discovered through Claude Code (28 min autonomous session):
1. Poll generation: `GET /v2/photo_avatar/generation/{id}` → image_url_list
2. Download first image from image_url_list
3. Upload to `upload.heygen.com/v1/asset` (raw binary, NOT multipart) → image_key in format `image/{hash}/original.jpg`
4. Create group: `POST /v2/photo_avatar/avatar_group/create` with `{name, image_key, generation_id}` → group_id
5. Wait for group status = 'completed' (10-20s processing) — DO NOT train immediately
6. Train: `POST /v2/photo_avatar/train` with `{group_id}`
7. Poll training: `GET /v2/photo_avatar/{group_id}` → when completed → list avatars → get talking_photo_id

**Key learnings (Claude Code found these):**
- Upload endpoint: `upload.heygen.com/v1/asset` NOT `api.heygen.com/v1/asset`
- image_key from generation poll response (`photo_generation/{id}/{uuid}.jpg`) does NOT work for createGroup — must upload and get `image/{hash}/original.jpg` format
- Group must reach 'completed' status before train can be called — ~10-20s after createGroup
- HeyGen allows only 1 concurrent training per account

**New SECURITY DEFINER functions:**
- `public.save_avatar_generation(stakeholder_id, render_style, generation_id)`
- `public.advance_avatar_to_creating(brand_avatar_id, group_id, image_url_list)`
- `public.complete_avatar_training(brand_avatar_id, stakeholder_id, avatar_id, display_name)`
- `public.fail_avatar_generation(brand_avatar_id, error)`
- `public.store_gen_poll_response(brand_avatar_id, response)`

**New columns on c.brand_avatar:**
- `generation_id TEXT` — HeyGen generation_id
- `group_id TEXT` — HeyGen avatar group_id
- `avatar_gen_status TEXT` — state machine: empty→generating→training→active|failed
- `avatar_gen_error TEXT` — last error for debugging
- `image_url_list JSONB` — images from generation poll
- `gen_poll_response TEXT` — full raw poll response (debugging)
- `gen_started_at TIMESTAMPTZ`
- `gen_completed_at TIMESTAMPTZ`

**New columns on c.brand_stakeholder:**
- `character_brief JSONB` — HeyGen generation params (name, age, gender, ethnicity, orientation, pose, style, appearance)
- `refinement_notes TEXT` — freetext feedback for regeneration
- `brief_version INTEGER`
- `last_generated_at TIMESTAMPTZ`

**HeyGen style enum for animated render_style:** `'Pixar'` (NOT 'Animated' — that's invalid)
**Valid HeyGen ethnicity values:** White, Black, Asian American, East Asian, South East Asian, South Asian, Middle Eastern, Pacific, Hispanic, Unspecified

**pg_cron job:** `heygen-avatar-poller-every-60s` — every minute, `* * * * *`

---

## PG_CRON JOBS — ALL ACTIVE

| Job | Schedule | Function |
|---|---|---|
| rss-ingest-run-all-hourly | every 6h | ingest /run-all |
| video-worker-every-30min | every 30 min | video-worker |
| heygen-worker-every-30min | every 30 min | heygen-worker |
| heygen-avatar-poller-every-60s | every 60s | heygen-avatar-poller (NEW) |
| youtube-publisher (15 min) | every 15 min | youtube-publisher |
| auto-approver | every 30 min | auto-approver |
| k-schema-refresh-weekly | Sunday 3am UTC | k schema refresh |
| system-audit-weekly | Sunday 13:00 UTC | B4 health check |
| compliance-monitor-monthly | 1st of month | compliance hash check |

---

## PIPELINE STATE

### Publishing

| Format | NDIS-Yarns | Property Pulse |
|---|---|---|
| facebook text | ✅ daily | ✅ daily |
| facebook image_quote | ✅ | ✅ |
| facebook carousel | ✅ | ✅ |
| youtube video_short_avatar | ✅ 2 test videos | ❌ |

### Token Calendar

| Platform | Client | Expiry |
|---|---|---|
| YouTube | NDIS-Yarns | 7 Apr 2031 |
| YouTube | Property Pulse | 2 Apr 2031 |
| Facebook | Property Pulse | ~6 Jun 2026 (~57d) |
| Facebook | NDIS-Yarns | ~1 Jun 2026 (~52d) |

⚠️ Facebook tokens need refreshing in ~50 days.

---

## DECISIONS LOG

D001–D080: see docs/06_decisions.md.
D081: Character maturity principle — solo videos before conversations (10 video threshold).
D082: video_short_avatar_conversation deferred to Phase 4.
D083: heygen-avatar-creator + heygen-avatar-poller pipeline architecture — automated AI photo avatar generation via HeyGen API.

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Status |
|---|---|---|
| PP avatar training — needs HeyGen API credits | 🔴 BLOCKER | Add $30+ at app.heygen.com → API → Add funds |
| Tenant realistic — still in generating state | MED | Will auto-advance once credits added |
| Facebook tokens expiring ~50 days | MED | Refresh early June 2026 |
| Meta App Review | 🔴 External | Business verification In Review. Next check: 14 Apr. |
| LinkedIn API | 🔴 External | Community Management API review. Next check: 14 Apr. |
| Legal review | 🔴 Business gate | $2–5k AUD. Initiate when Meta Standard Access confirmed. |

---

## WHAT IS NEXT

**Immediate (tomorrow morning):**
1. Add HeyGen API credits (app.heygen.com → Settings → API → Add funds, ~$30)
2. Reset failed PP avatar slots to 'training' (SQL above in PP section)
3. Wait 20-30 min for cron poller to advance all to 'active'
4. Assign PP voice IDs via dashboard → Clients → Property Pulse → Avatars tab
5. Check Meta App Review + LinkedIn status (14 Apr was calendar target)

**After PP cast is complete:**
- B5 — Weekly manager report email
- F1 — Prospect demo generator
- Publisher schedule wiring
