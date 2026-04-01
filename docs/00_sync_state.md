# ICE — Live System State

> **This file is manually updated at session end when nightly Cowork task has not yet run.**
> Last written: 2026-04-01 ~17:00 AEST (manual end-of-session sync)

---

## CURRENT PHASE

**Phase 3 — Expand + Personal Brand** (active)
Phase 1 complete. Phase 2 mostly complete — LinkedIn API blocked externally.

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Version | Status | Notes |
|---|---|---|---|
| youtube-publisher | v1.2.0 | ACTIVE | DB-driven credential_env_key lookup. Source in GitHub. |
| pipeline-fixer | v1.1.0 | ACTIVE | :25 and :55 every hour |
| ai-worker | v2.6.1 | ACTIVE | Format advisor seed fix |
| image-worker | v3.3.0 | ACTIVE | Creatomate Essential |
| publisher | v1.3.0 | ACTIVE | Facebook + photo endpoint |
| linkedin-publisher | v1.1 | ACTIVE | API review pending |
| All others | — | ACTIVE | Unchanged from 31 Mar |

---

## SQL CHANGES — 1 APR 2026

| Change | Detail |
|---|---|
| D060 | YouTube publish profiles created for both clients in c.client_publish_profile |
| D060 | video_generation_enabled = true on both clients' Facebook publish profiles |
| D060 | trg_remap_video_format (D055) trigger DROPPED — no longer needed |
| D059 | refresh_post_format_performance() running daily 3:15am UTC |

---

## PG_CRON — ACTIVE (23 jobs)

All 23 jobs unchanged. Notable:
- Job #36: pipeline-fixer at :25 and :55 every hour
- Job for refresh_post_format_performance: daily 3:15am UTC
- youtube-publisher: every 15 min at :15 and :45

---

## PIPELINE STATE

### Property Pulse YouTube Upload — PENDING

- Test video: Gold Coast housing, 28s kinetic
- post_draft_id: `8b75c2ce-2586-4e30-b0f4-678ef00a8c47`
- video_status: `generated` (MP4 in Supabase Storage — confirmed)
- Queue: reset to `queued` — will attempt on next :15 or :45 run
- Known issue: youtube-publisher v1.2.0 reads `credential_env_key` from DB correctly (`YOUTUBE_REFRESH_TOKEN_PP`). Secret exists in Supabase dashboard. May need dashboard edit (save without changes) to force secret propagation to Edge Function runtime.

### Client Publish Profiles — Video Generation

| Client | video_gen_enabled | YouTube credential_env_key | YouTube channel_id |
|---|---|---|---|
| Property Pulse | true | YOUTUBE_REFRESH_TOKEN_PP | UCudcAtOaVbYNc-9mXvou7Wg |
| NDIS Yarns | true | YOUTUBE_REFRESH_TOKEN_NDIS | UCqCTvPSR1BwhIi5Cui9_9Mw |

---

## OPENCLAW — LIVE

| Item | Value |
|---|---|
| Version | 2026.3.31 |
| Telegram bot | @InvegentICEbot |
| Model | anthropic/claude-sonnet-4-6 (Max plan) |
| Auth method | setup-token (anthropic:anthropic-max profile) |
| Gateway | Windows login item — auto-starts on boot |
| TUI | Must be launched manually: `openclaw tui` |
| Pairing | PK's Telegram account paired (code U36F5PNA approved) |
| Status | ✅ WORKING — bot responds to Telegram messages |

**CRITICAL:** After any laptop restart, run `openclaw tui` in PowerShell and leave open.

---

## DASHBOARD — LATEST DEPLOYS

| Deploy | SHA | Status | What |
|---|---|---|---|
| dpl_8BRdad2G78Qeqp9npNawBGqbrcmD | 0e493f2 | READY | Inbox: tab order, sort fix, em dash, client filter pills |
| dpl_2JXqhq7ffJb4GcEwZFNKBAyhLnaB | 5f35cad | READY | Previous inbox fix (superseded) |

Latest production deploy: `dpl_8BRdad2G78Qeqp9npNawBGqbrcmD`

---

## GITHUB — LATEST COMMITS

| Repo | SHA | Message |
|---|---|---|
| Invegent-content-engine | 4111cd7 | docs: add D058-D061 |
| Invegent-content-engine | e009c0d | docs: add D056-D057 |
| invegent-dashboard | 0e493f2 | fix: inbox tab order, sort, em dash, client filter pills |
| invegent-dashboard | 5f35cad | fix: inbox queue sort order, em dash, client filter |
| invegent-web | 3f98799 | feat: animated 5-stage pipeline flow |

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Action |
|---|---|---|
| YouTube upload not confirmed | HIGH | Go to Supabase dashboard → Settings → Edge Functions → Secrets → edit YOUTUBE_REFRESH_TOKEN_PP → Save (no change needed — forces propagation). Then reset queue and test. |
| YouTube secrets CLI set fails | MED | Token contains `//` — use quotes: `supabase secrets set YOUTUBE_REFRESH_TOKEN_PP="token"` or use dashboard |
| OpenClaw SOUL.md not written | MED | Define ICE context for agent — pipeline aware responses |
| Cowork → Supabase conversion | MED | Nightly reconciler + auditor are laptop-dependent — convert to Edge Functions |
| Meta App Review | 🔵 External | Business verification In Review — check 10 Apr |
| LinkedIn API | 🔵 External | Community Management API review in progress |

---

## EXTERNAL BLOCKERS

- Meta App Review: Business verification In Review — next check 10 Apr 2026 (calendar set)
- LinkedIn: Community Management API "1 of 2. Access Form Review"

---

## WHAT IS NEXT

**Immediate (next session):**
1. Fix YouTube secret propagation (Supabase dashboard → edit secret → save)
2. Confirm PP YouTube upload works end-to-end
3. Write OpenClaw SOUL.md for ICE context
4. Convert Cowork nightly tasks to Supabase Edge Functions (laptop independence)

**Phase 3 build queue:**
- Client health weekly report email (~2 days Claude Code)
- Prospect demo generator (~1 day Claude Code)
- Invegent brand pages (own ICE client setup)
- Auditor improvements (3 new checks: config completeness, post-publish verification, video staleness)

Decisions through D061 in `docs/06_decisions.md`.
