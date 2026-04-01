# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Overwritten every night at midnight AEST by the Cowork reconciliation task.
> Last written: 2026-04-01 14:00 UTC
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
| inspector | 82 | ACTIVE | 2026-02-02 |
| ingest | 94 | ACTIVE | 2026-01-26 |
| content_fetch | 65 | ACTIVE | 2026-03-10 |
| ai-worker | 68 | ACTIVE | 2026-03-22 |
| publisher | 58 | ACTIVE | 2026-03-20 |
| inspector_sql_ro | 37 | ACTIVE | 2026-02-23 |
| auto-approver | 29 | ACTIVE | 2026-03-11 |
| insights-worker | 32 | ACTIVE | 2026-03-20 |
| feed-intelligence | 20 | ACTIVE | 2026-03-07 |
| email-ingest | 15 | ACTIVE | 2026-03-11 |
| draft-notifier | 16 | ACTIVE | 2026-03-18 |
| linkedin-publisher | 15 | ACTIVE | 2026-03-18 |
| image-worker | 36 | ACTIVE | 2026-03-31 |
| series-outline | 15 | ACTIVE | 2026-03-19 |
| series-writer | 16 | ACTIVE | 2026-03-20 |
| wasm-bootstrap | 13 | ACTIVE | 2026-03-19 |
| pipeline-doctor | 13 | ACTIVE | 2026-03-19 |
| pipeline-ai-summary | 14 | ACTIVE | 2026-03-19 |
| compliance-monitor | 14 | ACTIVE | 2026-03-19 |
| video-worker | 13 | ACTIVE | 2026-03-20 |
| tts-test | 11 | ACTIVE | 2026-03-20 |
| youtube-publisher | 13 | ACTIVE | 2026-04-01 |
| youtube-token-test | 5 | ACTIVE | 2026-03-20 |
| pipeline-fixer | 4 | ACTIVE | 2026-03-31 |

All 24 functions ACTIVE. No functions in error state.

---

## PIPELINE STATE

### Queue Depths

| Client | Queued | Published (total) | Last published at |
|---|---|---|---|
| Property Pulse | 0 | 3 | 2026-04-01 05:05 UTC |
| NDIS-Yarns | 0 | 39 | 2026-03-01 02:10 UTC |

⚠️ **ANOMALY — NDIS queue last_published_at**: post_publish_queue shows NDIS last published via queue on 2026-03-01, yet the pipeline-ai-summary (generated 2026-04-01 12:55 UTC) references "4 NDIS Yarns posts today". The draft state also shows 13 NDIS-Yarns drafts with approval_status='published' in the last 7 days. Discrepancy likely means: (a) approval_status='published' in post_draft is set on approval, not on successful Facebook publish, OR (b) the NDIS queue updated_at is not being refreshed on publish. Requires investigation.

### Draft State — Last 7 Days

| Client | Approval status | Format | Count |
|---|---|---|---|
| NDIS-Yarns | published | text | 12 |
| NDIS-Yarns | published | (null) | 1 |
| Property Pulse | published | image_quote | 1 |
| Property Pulse | published | text | 1 |
| Property Pulse | published | video_short_kinetic | 1 |
| Property Pulse | published | video_short_stat | 1 |

No drafts in needs_review, approved, or pending states (queue is empty, all clear).

### Image Generation

No rows returned for approved/needs_review drafts with image_status — queue is empty, no backlog.

Last Creatomate render: 2026-03-31 22:31 UTC — `video_short_kinetic` — **succeeded** — no error.

### Client Publish Profiles (Facebook)

| Client | publish_enabled | paused_until | auto_approve | image_gen | video_gen |
|---|---|---|---|---|---|
| Property Pulse | true | — | true | true | true |
| NDIS-Yarns | true | — | true | true | true |

Both clients active, not paused, all generation types enabled.

### AI Usage — Last 24h

| Provider | Model | Fallback | Calls | Cost (USD) |
|---|---|---|---|---|
| anthropic | claude-sonnet-4-6 | false | 3 | $0.1007 |

No fallback calls. All AI traffic on primary Anthropic provider.

### AI Usage — This Month (April 2026)

| Total cost | Total calls | Fallback calls |
|---|---|---|
| $0.0000 | 0 | 0 |

Month just started (April 1 AEST = March 31 14:00 UTC). The 3 calls shown in last 24h occurred on March 31 AEST and fall within the March monthly bucket. April cost will accumulate from today.

### Last Pipeline AI Summary

- Generated: 2026-04-01 12:55 UTC
- health_ok: **true**
- action_needed: null
- Preview: "The pipeline has been quiet over the last 2 hours with no publishing activity, which is normal for late evening hours. The system shows 0 items in queue and no recent publications, with consistent readings across all health snapshots. Today's total stands at 4 NDIS Yarns posts and 0 Property Pulse p[osts]..."

### Dead Letter — Last 7 Days

| Dead reason | Count |
|---|---|
| pre-visual-pipeline backlog cleared 2026-03-31 | 61 |
| stale scheduled post — missed Feb 11-12 window, image never generated, cleared by auditor 2026-04-01 | 6 |

Both dead letter batches are intentional auditor/manual clears — not organic pipeline failures.

---

## GITHUB — LATEST COMMITS

| Repo | SHA | Date | Message |
|---|---|---|---|
| Invegent-content-engine | ef61c06 | 2026-04-01 | chore: sync state 1 Apr 2026 — YouTube activated, OpenClaw live, inbox fixes |
| Invegent-content-engine | 4111cd7 | 2026-04-01 | docs: add D058-D061 (PP compliance, format perf, YouTube activation, OpenClaw) |
| Invegent-content-engine | a72f1b5 | 2026-04-01 | fix: youtube-publisher v1.2.0 — read credential_env_key from DB |
| invegent-dashboard | dbd9784 | 2026-04-01 | fix: hide ClientProfileShell picker when called from clients hub; swap inbox pills before tabs |
| invegent-dashboard | a6196bf | 2026-04-01 | feat: unified clients hub — client picker first, sub-tabs second, connect includes YouTube |
| invegent-dashboard | 2cb5f8d | 2026-04-01 | chore: roadmap sync 1 Apr 2026 — YouTube activated, OpenClaw live, inbox fixes |
| invegent-portal | b734abe | 2026-03-19 | fix: portal calendar shows client timezone label |
| invegent-portal | 63008ef | 2026-03-19 | feat: add Invegent favicon to portal tab |
| invegent-portal | be5632b | 2026-03-18 | feat: send Resend confirmation email on feed suggestion submit |
| Invegent-web | 3f98799 | 2026-03-31 | feat: replace static 3-step how-it-works with animated 5-stage pipeline flow |
| Invegent-web | a580c26 | 2026-03-31 | fix: replace Geist font (Next.js 15 only) with Inter for Next.js 14 compatibility |
| Invegent-web | 26c782d | 2026-03-31 | feat: homepage — professional landing page for Invegent |

---

## VERCEL FRONTENDS — LIVE

| App | URL | Last deploy | Status | SHA |
|---|---|---|---|---|
| invegent-dashboard | dashboard.invegent.com | 2026-04-01 07:41 UTC | READY | dbd9784 |
| invegent-portal | portal.invegent.com | 2026-03-19 07:24 UTC | READY | b734abe |
| invegent-web | invegent.com | 2026-03-31 08:40 UTC | READY | 3f98799 |

Team: pk-2528s-projects (team_kYqCrehXYxW02AycsKVzwNrE)

All 3 frontends READY. No ERROR states on current production deploys.

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Action |
|---|---|---|
| YouTube upload not confirmed (PP) | HIGH | Fix YOUTUBE_REFRESH_TOKEN_PP secret propagation: Supabase dashboard → Settings → Edge Functions → Secrets → edit → Save (no change needed). Reset queue and test on next :15/:45 run. |
| NDIS queue last_published_at anomaly | MED | post_publish_queue.last_published_at for NDIS shows 2026-03-01 but AI summary reports publishing today. Investigate whether approval_status='published' in post_draft is set on approval vs. actual Facebook publish. |
| OpenClaw SOUL.md not written | MED | Define ICE context for agent — pipeline-aware responses |
| Cowork → Supabase conversion | MED | Nightly reconciler + auditor are laptop-dependent — convert to Edge Functions |
| Meta App Review | 🔵 External | Business verification In Review — next check 10 Apr 2026 (calendar set) |
| LinkedIn API | 🔵 External | Community Management API "1 of 2. Access Form Review" in progress |

---

## CLIENT PIPELINE STATUS

**NDIS Yarns** (fb98a472-ae4d-432d-8738-2273231c1ef4)
publish_enabled, auto_approve, image+video generation all on. Queue empty, 0 queued. 39 lifetime published via queue (last queue publish recorded 2026-03-01 — see anomaly above). 13 drafts with approval_status='published' in last 7 days (12× text, 1× null format). Pipeline AI summary reports 4 posts today.

**Property Pulse** (4036a6b5-b4a3-406e-998d-c2fe14a8bbdd)
publish_enabled, auto_approve, image+video generation all on. Queue empty, 0 queued. 3 lifetime published via queue, last published 2026-04-01 05:05 UTC. 4 drafts with approval_status='published' in last 7 days (image_quote, text, video_short_kinetic, video_short_stat). YouTube test post (video_short_kinetic) awaiting upload confirmation — see known issues.

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

## EXTERNAL BLOCKERS

- LinkedIn publisher: Community Management API review in progress
- Meta App Review: Business verification In Review — next check 10 Apr 2026 (calendar set)

---

## WHAT IS NEXT

**Immediate (next session):**
1. Fix YouTube secret propagation (Supabase dashboard → edit secret → save)
2. Confirm PP YouTube upload works end-to-end
3. Write OpenClaw SOUL.md for ICE context
4. Convert Cowork nightly tasks to Supabase Edge Functions (laptop independence)
5. Investigate NDIS queue last_published_at anomaly (March 1 vs. AI summary saying publishing today)

**Phase 3 build queue:**
- Client health weekly report email (~2 days Claude Code)
- Prospect demo generator (~1 day Claude Code)
- Invegent brand pages (own ICE client setup)
- Auditor improvements (3 new checks: config completeness, post-publish verification, video staleness)

Decisions through D061 in `docs/06_decisions.md`.
