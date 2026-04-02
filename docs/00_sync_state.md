# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-04-02 (manual reconciliation — end of session)
> Next automated overwrite: midnight AEST by Cowork nightly reconciler

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

| Function | Version | Status | Notes |
|---|---|---|---|
| inspector | 82 | ACTIVE | |
| ingest | 94 | ACTIVE | |
| content_fetch | 65 | ACTIVE | |
| ai-worker | 68 | ACTIVE | Uses compliance rules — profession scoping via get_compliance_rules() NOT YET wired |
| publisher | 58 | ACTIVE | |
| inspector_sql_ro | 37 | ACTIVE | |
| auto-approver | 29 | ACTIVE | v1.4.0, 9-gate logic |
| insights-worker | 32 | ACTIVE | |
| feed-intelligence | 20 | ACTIVE | |
| email-ingest | 15 | ACTIVE | |
| draft-notifier | 16 | ACTIVE | |
| linkedin-publisher | 15 | ACTIVE | Code done, API approval pending |
| image-worker | 36 | ACTIVE | v3.9.1 |
| series-outline | 15 | ACTIVE | |
| series-writer | 16 | ACTIVE | |
| wasm-bootstrap | 13 | ACTIVE | |
| pipeline-doctor | 13 | ACTIVE | Runs at :15/:45 — now writing to log via harvester |
| pipeline-ai-summary | 14 | ACTIVE | Hourly at :55 |
| compliance-monitor | 14 | ACTIVE | Monthly 1st, 9:00 UTC |
| compliance-reviewer | 4 | ACTIVE | v1.3.0 — NEW 2 Apr 2026. Vertical + profession scoped AI analysis |
| video-worker | 13 | ACTIVE | |
| tts-test | 11 | ACTIVE | |
| youtube-publisher | 13 | ACTIVE | v1.2.0 — DB-driven credential lookup |
| youtube-token-test | 5 | ACTIVE | |
| pipeline-fixer | 4 | ACTIVE | v1.1.0, runs at :25/:55 |

25 functions ACTIVE. No functions in error state.

---

## PIPELINE STATE

### Client Status

| Client | Platform | Publishing | Token expires | profession_slug |
|---|---|---|---|---|
| NDIS Yarns | Facebook | ✅ Active | 31 May 2026 | occupational_therapy |
| NDIS Yarns | YouTube | ⏳ Pending Brand Account conversion | — | occupational_therapy |
| Property Pulse | Facebook | ✅ Active | — (env var) | NULL |
| Property Pulse | YouTube | ✅ Active | 5yr (stored in DB) | NULL |

### Key Pipeline Numbers (as of 2 Apr 2026)

- Queue depth: 0 (both clients)
- NDIS Yarns: publishing daily via Facebook, 5+ posts/week
- Property Pulse: publishing, first YouTube Short live
- Doctor: 7 checks running every 30 min, all passing, now logged
- AI Diagnostic: hourly summaries generating, health_ok = true

### Compliance Queue

5 NDIS policy URLs flagged as changed (1 Apr 2026 detection).
All 5 now have AI analysis written by compliance-reviewer v1.3.0:
- NDIS Pricing: HIGH relevance, action required (new 2025-26 pricing)
- NDIS Commission Regulatory Priorities: HIGH relevance, action required
- NDIS Practice Standards Reform: HIGH relevance, action required (mandatory registration July 2026)
- NDIS Practice Standards Core Modules: MEDIUM relevance, action required
- NDIS Code of Conduct: HIGH relevance, no action required

All 5 still status='pending' — awaiting your manual mark-reviewed.

---

## SCHEMA — NEW TABLES / COLUMNS (2 Apr 2026)

| Table | Change | Notes |
|---|---|---|
| `m.post_seed` | Added `platform text` column | Constraint `post_seed_uniq_run_item_platform` on (digest_run_id, digest_item_id, platform) replaces old (digest_run_id, digest_item_id) |
| `m.post_publish_queue` | Added `acknowledged_at`, `acknowledged_by` | Items with acknowledged_at set are skipped by doctor alerting |
| `m.compliance_review_queue` | Added `ai_analysis`, `ai_confidence`, `ai_reviewed_at`, `ai_error` | Written by compliance-reviewer |
| `m.compliance_policy_source` | Added `profession_slug`, `vertical_context` | Profession scope for URLs; vertical description for AI prompt |
| `t.profession` | New table | 12 professions: 7 NDIS, 5 property |
| `t.5.7_compliance_rule` | Added `profession_slugs text[]` | NULL = universal; array = scoped professions |
| `c.client` | Added `profession_slug` | Care for Welfare = occupational_therapy |

## SCHEMA — NEW FUNCTIONS

| Function | Purpose |
|---|---|
| `public.get_compliance_rules(vertical, profession)` | Load scoped rules: universal + profession-matching. Used by compliance-reviewer and (next) ai-worker |
| `public.store_compliance_ai_analysis(review_id, analysis, confidence, error)` | SECURITY DEFINER write to m.compliance_review_queue ai_* columns |
| `m.harvest_pipeline_doctor_log()` | Reads doctor HTTP response from net._http_response, writes to m.pipeline_doctor_log |

## PG_CRON — NEW JOBS

| Job | Schedule | Name |
|---|---|---|
| compliance-reviewer-monthly | 5 9 1 * * | Fires 5 min after compliance-monitor on 1st of month |
| pipeline-doctor-log-harvester | 17,47 * * * * | 2 min after each doctor run |

---

## GITHUB — LATEST COMMITS (2 Apr 2026)

| Repo | Message |
|---|---|
| Invegent-content-engine | feat: compliance-reviewer v1.3.0 — vertical + profession scoped rule loading |
| Invegent-content-engine | docs: D062-D066 — pipeline fix, doctor log, compliance reviewer, profession dimension |
| invegent-dashboard | feat: compliance page — AI analysis panel, confidence badges, Run AI Review button |
| invegent-dashboard | fix: monitor nav — Flow tab on all sub-pages, publisher health, client pills on pipeline |

---

## VERCEL FRONTENDS — LIVE

| App | URL | Status |
|---|---|---|
| invegent-dashboard | dashboard.invegent.com | READY |
| invegent-portal | portal.invegent.com | READY |
| invegent-web | invegent.com | READY |

---

## KNOWN ACTIVE ISSUES

| Issue | Priority | Action |
|---|---|---|
| NDIS Yarns YouTube | MED | Convert channel to Brand Account in Google settings, then connect via dashboard Connect tab |
| ai-worker profession scoping | MED | get_compliance_rules() built but not yet wired into ai-worker. Content generation currently loads all NDIS rules regardless of profession. Wire in next session. |
| Compliance queue pending | LOW | 5 items with AI analysis written — mark reviewed in dashboard Monitor → Compliance |
| OpenClaw SOUL.md not written | LOW | Define ICE context for @InvegentICEbot |
| Meta App Review | 🔵 External | Business verification In Review — next check 10 Apr 2026 |
| LinkedIn API | 🔵 External | Community Management API review in progress |

---

## CREDENTIALS STATUS

| Credential | Status |
|---|---|
| Anthropic API | Active — primary AI provider |
| OpenAI API | Active — fallback only |
| NDIS Yarns Facebook token | Active — expires 31 May 2026, tracked in DB |
| Property Pulse Facebook | Active — env var |
| LinkedIn org tokens | Stored — API approval pending |
| ElevenLabs Creator | Active — NDIS + PP voices |
| YouTube OAuth — PP | Active — refresh token stored in DB (c.client_channel) |
| YouTube OAuth — NDIS | Pending — needs Brand Account conversion first |
| Creatomate Essential | Active — $54/mo |
| Resend | Active |
| Gmail OAuth (email-ingest) | Active — feeds@invegent.com |
| Supabase access token | ✅ Rotated 31 Mar 2026 |
| GitHub PAT | ✅ Rotated 31 Mar 2026 |

---

## OPENCLAW — LIVE

| Item | Value |
|---|---|
| Telegram bot | @InvegentICEbot |
| Model | anthropic/claude-sonnet-4-6 (Max plan) |
| Gateway | Windows login item — auto-starts on boot |
| TUI | Must be launched manually: `openclaw tui` |
| Status | ✅ WORKING |

**CRITICAL:** After any laptop restart, run `openclaw tui` in PowerShell and leave open.

---

## EXTERNAL BLOCKERS

- LinkedIn publisher: Community Management API review in progress
- Meta App Review: Business verification In Review — next check 10 Apr 2026

---

## WHAT IS NEXT

**Immediate (next session):**
1. Wire `get_compliance_rules(vertical, profession)` into ai-worker — profession-scoped content generation
2. AI Diagnostic Tier 2 — prerequisites met (doctor log live, 12+ records)
3. NDIS Yarns YouTube — convert to Brand Account, then connect via dashboard
4. Review compliance queue — 5 items have AI analysis, mark reviewed

**Phase 3 build queue:**
- Prospect demo generator (~1 day) — needed before first client conversation
- Client health weekly report email (~2 days)
- Invegent brand pages as own ICE client

Decisions through D066 in `docs/06_decisions.md`.
