# ICE — Live System State

> **This file is machine-written. Do not edit manually.**
> Last written: 2026-03-31 08:05 UTC (6:05pm AEST)
> Written by: Claude.ai web session — 31 Mar 2026 (end of day)

---

## HOW TO USE THIS FILE

Read this file before any ICE work session. It tells you what is actually deployed.
If this file contradicts memory or 04_phases.md, this file wins.

---

## CURRENT PHASE

**Phase 3 — Expand + Personal Brand** (active)
Phase 1 complete. Phase 2 mostly complete — LinkedIn API blocked externally.

---

## SUPABASE EDGE FUNCTIONS — LIVE

Project: `mbkmaxqhsohbtwsqolns` (ap-southeast-2)

| Function | Deploy# | App version | Last changed |
|---|---|---|---|
| ai-worker | v65 | ai-worker-v2.6.1 | 2026-03-30 |
| publisher | v55 | publisher-v1.3.x | 2026-03-30 |
| video-worker | v10 | video-worker-v2.0.0 | 2026-03-30 |
| youtube-publisher | v7 | youtube-publisher-v1.0.0 | 2026-03-30 |
| image-worker | v32 | image-worker-v3.9.1 | 2026-03-31 |
| pipeline-fixer | v2 | pipeline-fixer-v1.1.0 | 2026-03-31 ✅ NEW |
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

## VERCEL FRONTENDS — LIVE

| App | URL | Last deploy | Status |
|---|---|---|---|
| invegent-dashboard | dashboard.invegent.com | 2026-03-31 | READY (pipeline flow diagram + ReactFlow) |
| invegent-portal | portal.invegent.com | 2026-03-18 | READY |
| invegent-web | invegent.com | 2026-03-31 | READY |

---

## GITHUB — LATEST COMMITS

| Repo | Latest | Message |
|---|---|---|
| Invegent-content-engine | e938f6a | docs: AI Diagnostic Tier 2 build spec |
| invegent-dashboard | (pipeline diagram commit) | feat: pipeline flow diagram — ReactFlow 3-layer live diagram |
| invegent-portal | ~2026-03-18 | portal /performance + calendar v2 |
| invegent-web | a580c26 | fix: replace Geist font with Inter |

**Build specs saved:**
- `docs/build-specs/visual-pipeline-v1.md` — image rendering (done)
- `docs/build-specs/pipeline-diagram-v1.md` — pipeline flow diagram (dashboard done, website next)
- `docs/build-specs/ai-diagnostic-tier2-v1.md` — Tier 2 agent (done)

---

## KNOWN ACTIVE ISSUES

| Issue | Status |
|---|---|
| Visual format (D055 trigger) | 🟡 Live, awaiting first video-format draft to confirm remap |
| LinkedIn publisher | 🔵 External — Community API review in progress |
| Meta App Review | 🔵 External — Business verification resubmitted 31 Mar. Next check 10 Apr. |
| invegent.com pipeline diagram | ⬜ Next Claude Code session — replace static 3-step with 5-stage animated flow |
| NDIS compliance prompt review | ⬜ Calendar reminder 2 Apr — check first drafts under D056 |

---

## CLIENT PIPELINE STATUS

**Both clients:** Pipeline flowing. 14-day dedup window active. 2 recent drafts generated (text format).
**Last published:** 2026-03-30 13:15 UTC
**NDIS compliance prompt (D056):** Live since 07:33 UTC 31 Mar — next NDIS draft will use new rules.

---

## COWORK SCHEDULED TASKS — ACTIVE (3 tasks, Max plan)

| Task | Schedule | First run |
|---|---|---|
| Nightly Reconciler | Daily 12:01 AM AEST | Tonight |
| Nightly Auditor | Daily 2:00 AM AEST | Tonight |
| Weekly Reconciliation | Weekly Monday 7:00 AM AEST | Apr 5 |

Recreated under Max plan 31 Mar. Team plan to be cancelled.

---

## CREDENTIALS STATUS

All active. Supabase, GitHub PAT, Xero all rotated 31 Mar 2026.

---

## WHAT IS NEXT

**Next Claude Code session:**
1. invegent.com pipeline diagram — brief in `docs/build-specs/pipeline-diagram-v1.md`
   Paste: `Read docs/build-specs/pipeline-diagram-v1.md from Invegent-content-engine.
   Build the WEBSITE version (Surface 2). Replace the static 3-step 'How it works'
   section in app/page.tsx (Invegent-web repo) with an animated 5-stage pipeline flow.`

**After that:**
- Compliance-aware Property Pulse system prompt (financial advice rules, different from NDIS)
- Client health weekly report email
- Prospect demo generator
- Invegent brand pages (own ICE client setup)

**External blockers (nothing to action):**
- Meta App Review: next check 10 Apr
- LinkedIn: waiting on API

Decisions through D057 in `docs/06_decisions.md`.
