# ICE — Pre-Sales Audit Inventory

> ⚠️ **ARCHIVED 21 Apr 2026.** This file is the raw 18 April reconciliation audit. **Superseded by `docs/15_pre_post_sales_criteria.md`** which classifies every item from this audit's Section 12 (38 items) into pre-sales (A), post-sales tier 1–3 (B/C/D), or parked (E). Use file 15 for current gate status. Use this file only for tracing where a specific A/B/C/D item came from.

---

## Generated: 2026-04-18
## Type: Reconciliation audit
## Brief: docs/briefs/2026-04-18-pre-sales-audit.md

This is a reconciliation of docs vs live Supabase/GitHub state, produced for PK's follow-up classification session. It surfaces drift, gaps, stale commitments, and uncommitted work. It does NOT classify items as pre-sales / post-sales / tech debt — that is Section 12's job for PK.

---

## Summary Dashboard

| Metric | Count |
|---|---|
| Docs read | 22 (primary list) + briefs + subdirs |
| Edge Functions deployed (live) | 40 |
| Edge Functions in local repo `supabase/functions/` | 34 |
| Edge Functions deployed with NO local source | 8 |
| Edge Functions in local source but NOT deployed | 2 |
| Active cron jobs | 42 |
| Clients (all active) | 4 (NDIS-Yarns, Property Pulse, CFW, Invegent) |
| Publish profile rows | 14 |
| content_type_prompt rows | 24 (NY + PP × 4 platforms × 3 job types) |
| Feed sources total / active / deprecated | 60 / 40 / 20 |
| Storage buckets (all public) | 4 (brand-assets, client-assets, post-images, post-videos) |
| Tables across managed schemas (a/c/f/k/m/r/t) | 166 |
| Tables with NULL or TODO purpose | 22 |
| SECURITY DEFINER functions in public | 115 |
| Open pipeline incidents | 3 |
| Compliance review queue — pending (AI-reviewed) | 4 |
| Briefs with result files | 32 of 34 |
| Briefs without result files | 2 (041, 042) |
| Highest decision in 06_decisions.md | D146 |
| Hard gates open (L001/L002/L003/L005/consultant-audit 1–4) | 6 of 8 |

---

## Section 1 — Document drift findings

| # | Doc | Claim | Reality | Severity |
|---|---|---|---|---|
| 1.1 | `docs/00_sync_state.md` line 130 | "Edge Functions \| 42" | 40 active Edge Functions per `supabase_functions.functions` | MEDIUM |
| 1.2 | `docs/00_sync_state.md` lines 22, 131 | "63 cron jobs" (also stated "63 added"), "Active cron jobs \| 63" | 42 active jobs per `cron.job` | HIGH |
| 1.3 | `docs/00_sync_state.md` line 132 | "Active feeds \| 60, Deprecated feeds \| 20" | 40 active + 20 deprecated = 60 total. sync_state counted total as active. | MEDIUM |
| 1.4 | `docs/00_sync_state.md` lines 118–122, 287 | client-assets bucket private (HIGH priority — fix first) | `storage.buckets.public = true` for client-assets (and all other 3 buckets) | MEDIUM — issue is resolved but not closed in doc |
| 1.5 | `docs/00_sync_state.md` lines 147–155 | Auto-approver overall 50% pass rate; NY 57.1%, PP 26.3%, CFW 100% | Last 7 days: NY 23.1%, PP 24.4%, CFW 9.5% (from `m.post_draft`). Sync_state figure likely a one-day snapshot from 17 Apr; multi-day reality much lower. | HIGH |
| 1.6 | `docs/00_sync_state.md` line 293 | "12 feeds unassigned" | 0 unassigned active feeds (`f.feed_source` status='active' minus `c.client_source`). Matches sync_state's own D139 claim; sync_state internal contradiction. | LOW |
| 1.7 | `docs/00_sync_state.md` Token Calendar lines 243–251 | CFW/Invegent Facebook expiry "~Jun 2026" | `c.client_publish_profile.token_expires_at` is NULL for all CFW + Invegent platform rows. No tokens stored. | HIGH |
| 1.8 | `docs/00_sync_state.md` table lines 39–45 | "Facebook ✅ IG ✅ LI ✅" for CFW; "FB ✅ IG ✅ LI ✅" for Invegent | No tokens set for any CFW/Invegent platform (`token_expires_at IS NULL`, `mode IS NULL`). Pipeline cannot publish for these clients without tokens. | HIGH |
| 1.9 | `docs/00_sync_state.md` line 33 | Invegent WordPress not listed on platform row | Invegent has no WP profile — but also no content_type_prompts → no drafts generating (correctly reflected in lines 291, 293). Consistent. | — |
| 1.10 | `docs/10_consultant_audit_april_2026.md` (Audit 1) | "NDIS Yarns needs 4–8 weeks organic growth to produce numbers worth showing" | NY Facebook last publish 2026-04-13 (5 days ago). NY LinkedIn publishing daily. Audit 1 written 8 Apr — ~10 days elapsed. Still within 4–8w window. | Informational |
| 1.11 | `docs/23_legal_register.md` L002 | "Business verification In Review as of April 2026" | sync_state also says In Review. Consultant audit (8 Apr) flagged "contact dev support if stuck after 27 Apr 2026". Today is 18 Apr — 9 days before escalation trigger. | HIGH — time-sensitive |
| 1.12 | `docs/23_legal_register.md` L005 | "Build consent workflow into portal onboarding" | `c.client_audience_policy` table exists with RLS enabled. `docs/consent/avatar_consent_template.md` exists. `onboarding-notifier` Edge Function deployed. Cannot verify from SQL alone whether portal UI collects signed consent. | MEDIUM — partial / unverified |
| 1.13 | `docs/23_legal_register.md` L006 | Privacy policy current | `docs/Invegent_Privacy_Policy.md` dated 4 March 2026. Does NOT cover YouTube Data API (ICE_YOUTUBE_DATA_API_KEY found in code), HeyGen (7 heygen-* Edge Functions deployed), video analyser (video-analyser deployed). Stale vs capabilities in production. | MEDIUM |
| 1.14 | `docs/secrets_reference.md` | 11 Supabase vault secrets listed | Code references ~20 additional env vars (see Section 2 row 2.4). Reference doc is incomplete. | MEDIUM |
| 1.15 | `docs/00_sync_state.md` line 139 | `publisher v1.7.0` (schedule-aware) | `supabase/functions/publisher/index.ts` has uncommitted modifications (git status `M`). Source may not match deployed version. | LOW |

---

## Section 2 — Reality gaps (undocumented items)

| # | Finding | Documentation status | Suggested doc update |
|---|---|---|---|
| 2.1 | 8 Edge Functions deployed with NO matching source in `supabase/functions/`: `ingest`, `pipeline-doctor`, `pipeline-ai-summary`, `compliance-monitor`, `video-worker`, `video-analyser`, `heygen-intro`, `heygen-youtube-upload` | Not flagged in sync_state or docs | Either pull source into repo (source-of-truth) or document intentional platform-only deploys |
| 2.2 | 2 Edge Functions in local source but NOT deployed: `ai-diagnostic`, `linkedin-publisher` | Not flagged | Either deploy or remove. linkedin-publisher is superseded by linkedin-zapier-publisher (Brief 042). ai-diagnostic may be D100-era work. |
| 2.3 | 22 tables with NULL or `TODO: document purpose` in `k.vw_table_summary`: `c.brand_avatar`, `c.brand_stakeholder`, `c.client_avatar_profile`, `c.client_channel_allocation`, `c.client_service_agreement`, `c.onboarding_submission`, `c.platform_channel`, `c.service_package`, `c.service_package_channel`, `f.feed_discovery_seed`, `f.video_analysis`, `k.column_purpose_backup`, `k.column_purpose_import`, `k.subscription_register`, `k.table_registry`, `k.vw_column_enrichment_context`, `k.vw_doc_backlog_columns_priority`, `k.vw_feed_intelligence`, `m.ai_diagnostic_report`, `m.pipeline_incident`, `m.token_expiry_alert`, `m.topic_score_weight` | Column-registry backlog exists (`k.vw_doc_backlog_tables`) but not surfaced in docs | Prioritize c.* and m.* entries (client-facing / pipeline-critical) |
| 2.4 | Env vars referenced in Edge Function source but NOT in `docs/secrets_reference.md`: `AUTO_APPROVER_API_KEY`, `FB_APP_ID`, `FB_APP_SECRET`, `FB_GRAPH_VERSION`, `ICE_YOUTUBE_DATA_API_KEY`, `INSPECTOR_API_KEY`, `INSPECTOR_RO_DB_URL`, `INSPECTOR_SQL_API_KEY`, `MANAGER_REPORT_EMAIL`, `PIPELINE_FIXER_API_KEY`, `PORTAL_URL`, `PUBLISH_VALIDATE_TOKEN`, `RESEND_FROM_EMAIL`, `RSSAPP_API_KEY`, `CREATOMATE_API_KEY`, `ICE_HEYGEN_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` | Not listed | secrets_reference.md needs a full re-sync pass |
| 2.5 | `brief_036` missing (gap between 035 and 037 in docs/briefs) | Gap not noted in docs | Either record retrospectively or document intentional skip |
| 2.6 | 111 rows in `c.client_source`, but only 40 enabled. 71 historical/disabled assignments retained. | Not covered | Explain retention policy in 03_blueprint or 09_client_onboarding |
| 2.7 | 300 `m.post_draft` rows in last 7 days with `client_id IS NULL` (orphans) | Sync_state claims "D127 v2 — Backfilled client_id on all existing post_draft rows" — new orphans since? | Fix root cause: ai-worker may not be setting client_id on newly inserted drafts |
| 2.8 | `docs/00_sync_state.md` does not mention YouTube Data API integration | `ICE_YOUTUBE_DATA_API_KEY` used in code; feed-discovery has YouTube keyword route (D138) | Add to secrets_reference.md and privacy policy |
| 2.9 | HeyGen integration: 7 deployed functions (`heygen-worker`, `heygen-intro`, `heygen-youtube-upload`, `heygen-avatar-creator`, `heygen-avatar-poller`, `video-worker`, `video-analyser`) | HeyGen listed in subscription register with "TBC" cost; privacy policy doesn't mention it; legal register L005 says "before HeyGen integration is built" but it's already partially built | Reconcile legal gate vs build state |
| 2.10 | `storage.buckets` includes 4 buckets all public: `brand-assets`, `client-assets`, `post-images`, `post-videos` | Only client-assets mentioned in sync_state (now resolved); others undocumented | Document bucket purposes in 03_blueprint |
| 2.11 | `k.subscription_register` has 13 rows | Sync_state lists 12 subscriptions (~$314/mo + 4 TBC) | Reconcile 13th row; ensure Vercel/HeyGen/Claude Max/OpenAI TBC costs resolved |
| 2.12 | 115 SECURITY DEFINER functions in `public` schema | Not enumerated in 03_blueprint | Flag any without dashboard/Edge Function caller as dead code candidates (needs follow-up pass) |
| 2.13 | RLS enabled only on 8 of 138 tables surveyed (audience_asset, audience_performance, client_audience_policy, client_publish_schedule, post_draft, post_performance, post_publish, post_publish_queue, system_audit_log, public.portal_user). | 03_blueprint says "Multi-tenant via Supabase RLS (enforced at DB level)" | Major gap: most client-scoped tables have RLS OFF. Review before external client access. |

---

## Section 3 — Uncompleted briefs

Scanned `docs/briefs/`. All numbered briefs 011–045 accounted for except one gap (036). 2 briefs lack matching `_result.md`.

| # | Brief | Subject | Estimated status |
|---|---|---|---|
| 3.1 | `brief_041_cfw_platform_configuration.md` (14 Apr 2026) | Configure CFW for Facebook, LinkedIn, Instagram, YouTube with tokens, Page IDs, IG Business Account IDs. Explicitly requires PK to gather tokens before Claude Code can run. | PARTIAL — CFW has rows in `c.client_publish_profile` for fb/ig/li but `token_expires_at IS NULL` and `mode IS NULL`. Brief is blocked on PK token collection. |
| 3.2 | `brief_042_linkedin_zapier_bridge.md` (14 Apr 2026) | LinkedIn publishing via Zapier webhook bridge (workaround for pending Community Management API). | DONE but unlogged — `linkedin-zapier-publisher` Edge Function deployed (v7), `linkedin-zapier-publisher-every-20m` cron active (jobid 54), 47+ LinkedIn posts last 7d across 4 clients. Missing result file. |
| 3.3 | `brief_036` | Unknown — gap in numbering | Unknown. PK to confirm whether skipped intentionally or never written. |

---

## Section 4 — Hard gates status

### Gate 1 — Meta App Review (L002)
- Documented status: "Business verification In Review" (sync_state + legal register, consistent)
- Consultant audit (8 April): "contact dev support if stuck after 27 Apr 2026" — 9 days from audit date
- Current status (18 April): Cannot verify externally. sync_state mentions Meta verification 2FA cleared, App Review still In Review, invegent.com domain DNS TXT pending.
- **Open** — still within natural processing window; escalation trigger is 27 Apr.

### Gate 2 — Avatar consent workflow (L005)
- `c.client_audience_policy` table exists (RLS enabled)
- `c.client_avatar_profile` exists (TODO-documented)
- `c.brand_avatar` exists (TODO-documented)
- `docs/consent/avatar_consent_template.md` file exists
- `onboarding-notifier` Edge Function deployed (29 Mar)
- 5 heygen-* Edge Functions already deployed (HeyGen partially built — legal register said "Before HeyGen integration built")
- **Unverified / partial.** Database tables exist; portal UI not verifiable from SQL. Legal gate ordering is violated — HeyGen built before consent gate closed.

### Gate 3 — Legal review package (L001, L003, L004, L007)
- `docs/legal/service_agreement_v1.md` exists with ⚠️ LEGAL REVIEW REQUIRED banner
- Agreement specifies NSW governing law
- No confirmation Invegent has engaged a solicitor
- **External verification required — PK to confirm if solicitor engaged and review scheduled.**

### Consultant audit gates (Audit 1 — Product Consultant)
| # | Gate | Evidence found | Status |
|---|---|---|---|
| 4.1 | NDIS Yarns 4–8 weeks organic growth | NY FB has 375+ posts (sync_state). NY LinkedIn 11 posts in last 7 days. Cold-start data thin (legal register risk #5). Audit written 8 Apr — 10 days elapsed. | In progress, not yet at target |
| 4.2 | One-page proof document | No file found in `docs/` matching "proof", "one-page", or similar. `docs/briefs/brief_031_portal_performance.md` built performance page. Nothing client-facing. | NOT BUILT |
| 4.3 | Client portal "what ICE has done this month" dashboard | Portal exists (`invegent-portal`). Briefs 012, 024 (Portal Home), 031 (portal performance) built pages. Whether it is the "meaningful single dashboard" PK needs for sales demo — PK to assess. | Built — effectiveness unverified |
| 4.4 | 90-day money-back framing | `grep -i "90-day\|money.back"` across `docs/legal/service_agreement_v1.md` and `docs/11_sales_playbook.md` returns nothing. | NOT BUILT |

### Consultant audit (Audits 2–4) — gaps
- Audit 3 (Legal) flagged 5 issues → mapped to L001–L008 legal register; covered by Gate 3 above.
- Audit 4 (Technology) flagged: job queue for HeyGen (heygen-worker + heygen-avatar-poller deployed — PARTIAL), vector search (Phase 4), cron fragility at scale, publisher schedule (D022 built), Meta single point of failure (LinkedIn Zapier bridge = mitigated).

---

## Section 5 — Risk register reconciliation

Risk register extracted via Agent from `docs/05_risks.md`. 7 numbered risks shown to agent; register actually contains 9 per legal-register tie-ins.

| ID | Title | Documented severity / status | Current state vs doc | Delta |
|---|---|---|---|---|
| R1 | Meta API single point of failure | CRITICAL / HIGH — LinkedIn pending | LinkedIn now live via Zapier bridge (42 active cron includes jobid 54). Meta still only FB direct path. Risk partially mitigated. | ✅ Improved — update doc |
| R2 | Meta App Review gate | CRITICAL / IN PROGRESS | Unchanged. Still In Review. Watching 27 Apr trigger. | Same |
| R3 | NDIS compliance liability | HIGH / PARTIAL | 22 rules deployed. ToS template exists (not reviewed). compliance-monitor + compliance-reviewer monthly. 4 queue items pending human review since 1 Apr (17-day stale). | Unchanged — legal review still blocker |
| R4 | Solo founder bottleneck | HIGH / PARTIAL | Now at 4 clients (+2 since risk register likely written). Auto-approver pass rate dropped to ~23% from 50% claimed. Operational burden may be rising. | Worsening signal |
| R5 | Performance feedback loop | MEDIUM / PARTIAL | insights-worker + insights-feedback deployed, daily cron. NY/PP publishing daily. Data still thin for LinkedIn (just started 15 Apr). | Improving |
| R6 | Copyright & content provenance | MEDIUM / MONITORING | ingest-error-log active. canonical_content_body has give_up_paywall status. | Same |
| R7 | pg_cron concurrency at scale | MEDIUM / MONITORING | 42 active cron jobs at 4 clients. Risk doc said "31 jobs at 2 clients" → trajectory is ~10 jobs per additional client. At 10 clients ≈ 100 jobs. | Approaching concern zone |
| R8 | (Agent reported) avatar consent | — | See Gate 2. HeyGen built ahead of consent gate. | Violation of documented gate ordering |
| R9 | (Agent reported) cold-start / slow growth | — | NY data thin; audit acknowledged cold start. | Same |

---

## Section 6 — Legal register reconciliation

Source: `docs/23_legal_register.md` (verbatim extraction via Agent).

| ID | Title | Owner | Doc status | Reality today | Delta |
|---|---|---|---|---|---|
| L001 | NDIS Content Liability | PK | Partially mitigated — ToS clause + legal review required before first external client | service_agreement_v1.md exists; legal review not confirmed | Same — PK to confirm solicitor engaged |
| L002 | Meta API Development Tier | PK | Being resolved — do NOT onboard external client until Standard Access confirmed. Hard gate. Check date 14 Apr 2026. | 14 Apr check passed without status change. Consultant audit escalation trigger 27 Apr. | Past check date — confirm Meta still processing |
| L003 | RSS Feed Content & Copyright | PK | Monitoring — include in legal review, not verbatim reproduction | Pipeline uses canonical items + AI rewrite; compliant in design. Legal review still pending. | Same |
| L004 | Video Analyser & Platform ToS | PK | Open — before video analyser offered to clients | `video-analyser` Edge Function deployed (v9, 26 Mar). Unclear if offered to clients. | Built ahead of gate — verify client access |
| L005 | Avatar Consent (critical) | PK | Open — before HeyGen integration built | 5 heygen-* functions deployed; consent template in `docs/consent/`; c.client_audience_policy table exists with RLS. Consent workflow half-built; HeyGen fully built. | Gate ordering violated |
| L006 | Privacy Policy Currency | PK | Monitoring — update when new data-processing capabilities added | Policy dated 4 Mar 2026; YouTube Data API, HeyGen, video-analyser all added after. Policy stale. | Action required |
| L007 | AI Content Disclosure | PK | Monitoring — build labelling infrastructure now | No "AI-generated" label found in dashboard/portal briefs. | Action pending |
| L008 | Invegent Business Registration | PK | Closed | ABN active (39 769 957 807). Sole trader. | Same |

---

## Section 7 — Decisions log check

- `docs/06_decisions.md` highest D-number: **D146** (matches sync_state)
- D-entries detected via `^## D` grep: D001, D101, D126, D141, D142, D143, D144, D145, D146 (plus intermediate entries not starting with `## `)
- Recent high-numbered decisions per sync_state:
  - D140 Digest item scoring — **GATED** (Phase 3, disabled min_score=0)
  - D141 Pipeline synthesis — informational, logged
  - D142 Demand-aware seeder — **BUILT** (v2 live, seed_and_enqueue_ai_jobs_v1)
  - D143 Signal content type classifier — **GATED** (60d data required)
  - D144 Signal router — **GATED** (60d data required)
  - D145 Benchmark table — **GATED** (research phase)
  - D146 Feed pipeline score + intelligent retirement — **GATED** (60d data)
- Unexecuted/gated decisions: D140, D143, D144, D145, D146 (all waiting on insights data or Phase 3 milestones)
- D124 Boost Config UI — gated on Meta Standard Access (tied to L002)

---

## Section 8 — Infrastructure state

### Schema table counts (from `k.vw_table_summary`)
| Schema | Tables |
|---|---|
| a (enrichment) | 6 |
| c (client config) | 27 |
| f (feeds) | 14 |
| k (governance) | 22 |
| m (pipeline) | 38 |
| r (reference) | 3 |
| t (taxonomy) | 56 |
| **Total managed** | **166** |

### Edge Functions — deployed (40, ordered by last deploy)
brand-scanner v6, ai-worker v78, content_fetch v73, ingest v101, auto-approver v40, feed-discovery v5, image-worker v43, pipeline-sentinel v6, pipeline-healer v6, pipeline-diagnostician v6, publisher v65, insights-feedback v6, client-weekly-summary v6, compliance-reviewer v10, weekly-manager-report v9, instagram-publisher v6, inspector v88, inspector_sql_ro v43, insights-worker v39, feed-intelligence v26, email-ingest v21, draft-notifier v22, series-outline v21, series-writer v22, pipeline-doctor v19, pipeline-ai-summary v20, compliance-monitor v20, video-worker v20, youtube-publisher v21, pipeline-fixer v10, video-analyser v9, heygen-intro v6, heygen-youtube-upload v5, heygen-worker v6, heygen-avatar-creator v12, heygen-avatar-poller v15, onboarding-notifier v6, ai-profile-bootstrap v5, linkedin-zapier-publisher v7, wordpress-publisher v5.

### Edge Functions — drift between local source and deployed
- Deployed, NO local source (8): `ingest`, `pipeline-doctor`, `pipeline-ai-summary`, `compliance-monitor`, `video-worker`, `video-analyser`, `heygen-intro`, `heygen-youtube-upload`
- Local source, NOT deployed (2): `ai-diagnostic`, `linkedin-publisher`
- 32 functions align (source + deployed)

### Cron jobs (42 active, categorized)
- Content pipeline: rss-ingest-run-all-hourly (6h), content_fetch_every_10min, ai-worker-every-5m, seed-and-enqueue-facebook-every-10m, auto-approver-sweep (10m), enqueue-publish-queue-every-5m, publisher-every-10m (5m), sweep-stale-running-every-10m, digest-selector-every-30m
- Planner: planner-hourly
- Publishing: instagram-publisher-every-15m, linkedin-zapier-publisher-every-20m, wordpress-publisher-every-6h, youtube-publisher-every-30min
- Image/video: image-worker-15min, video-worker-every-30min, heygen-worker-every-30min
- Insights/feedback: insights-worker-daily (3am), insights-feedback-daily (3:30am), refresh-format-performance-daily (3:15am)
- Token health: token-health-daily-7am-sydney, token-expiry-alert-daily
- Notifications/reports: draft-notifier-every-30m, client-weekly-summary-monday-730am-aest, weekly-manager-report-monday-7am-aest, ai-diagnostic-daily
- Pipeline doctors: pipeline-doctor-every-30m, pipeline-doctor-log-harvester, pipeline-fixer-30min, pipeline-healer-every-15m, pipeline-sentinel-every-15m, pipeline-health-snapshot-30m, pipeline-ai-summary-hourly
- Governance: k-schema-refresh-weekly, ice-system-audit-weekly, dead-letter-sweep-daily, incident-auto-resolver-every-30m
- Compliance: compliance-monitor-monthly, compliance-reviewer-monthly
- Misc: feed-discovery-daily, feed-intelligence-weekly, email-ingest-every-2h

### Storage buckets (all public)
`brand-assets` (18 Mar), `client-assets` (12 Apr), `post-images` (18 Mar), `post-videos` (20 Mar)

### RLS coverage (sample)
RLS **enabled** (10 of ~138 tables surveyed): `c.client_audience_policy`, `c.client_publish_schedule`, `m.audience_asset`, `m.audience_performance`, `m.post_draft`, `m.post_performance`, `m.post_publish`, `m.post_publish_queue`, `m.system_audit_log`, `public.portal_user`.
RLS **disabled** for: all `c.client*` identity tables, all `f.*` feed tables, all `t.*` taxonomy, all `k.*` governance, most `m.*` pipeline logs. Acceptable for internal-only operations but material risk if client portal traffic routes through these directly.

### Secrets (documented vs referenced)
11 in `docs/secrets_reference.md` (Supabase vault section). 20+ env var names referenced in Edge Function code not documented — see Section 2 row 2.4.

---

## Section 9 — Client state

| Client | client_id | Created | Status | Platforms w/ profile | Content prompts | Tokens set | Publishing last 7d |
|---|---|---|---|---|---|---|---|
| NDIS-Yarns | fb98a472 | 2026-02-10 | active | FB(auto), IG, LI, YT(auto) | 12 rows (4 platforms × 3 types) | FB 31 May, YT 7 Apr 2031 | FB 5, LI 11 |
| Property Pulse | 4036a6b5 | 2026-02-10 | active | FB(auto), IG, LI, YT(auto) | 12 rows | FB 14 Jun, YT 2 Apr 2031 | FB 4, LI 18 |
| Care For Welfare | 3eca32aa | 2026-04-11 | active | FB, IG, LI (all mode=null) | 0 rows | NONE | LI 7 |
| Invegent | 93494a09 | 2026-04-14 | active | FB, IG, LI (all mode=null) | 0 rows | NONE | 0 |

- CFW publishing to LinkedIn (7 posts last 7d) despite mode=null and no token_expires_at — suggests Zapier bridge uses webhook URL in a different column (not token_expires_at). Works.
- Invegent has profiles but no prompts → no drafts → no publishing (consistent).
- Instagram: 0 published across all 4 clients in last 7 days despite IG profiles for all. Matches sync_state claim "prompts live, 0 published".
- YouTube: 0 published in last 7 days. Matches sync_state (prompts live, no recent publish).
- Publish schedules: Only NDIS-Yarns and Property Pulse have rows in `c.client_publish_schedule` (6 slots each, Facebook only). CFW + Invegent + other platforms have no schedule slots.

### Token calendar
| Client | Platform | Expires | Days away |
|---|---|---|---|
| NDIS-Yarns | Facebook | 2026-05-31 | 43 |
| Property Pulse | Facebook | 2026-06-14 | 57 |
| Property Pulse | YouTube | 2031-04-01 | 1809 |
| NDIS-Yarns | YouTube | 2031-04-15 | 1823 |

Two Facebook tokens expire in next 60 days — auto-alert fires at 30 days (c/o `token-expiry-alert-daily` cron).

---

## Section 10 — Repos and deployments

### `Invegent-content-engine` (working directory, main branch)
- Last commit (before this session): `43ea921 brief: pre-sales reconciliation audit for Claude Code execution 2026-04-18` (18 Apr)
- Commits in last 7 days: 99
- Uncommitted at session start: `supabase/functions/publisher/index.ts`, `supabase/functions/weekly-manager-report/index.ts`, `docs/ICE_Pipeline_Audit_Apr2026.md` (new), `supabase/functions/onboarding-notifier/` (new), `supabase/migrations/20260416_create_get_next_publish_slot.sql` (new)

### `invegent-dashboard`, `invegent-portal`, `invegent-web` (not present in this working directory)
- Cannot verify commit dates or open issues from this session: `gh` CLI not installed locally.
- Referenced in `docs/12_project_handoff.md` and `docs/22_product_charter.md`.
- See Section 13 for open question.

### Vercel projects (from 12_project_handoff)
- `invegent-dashboard` prj_iLsaEFCAqeuQjSdlbtfpfXC3jhxg
- `invegent-portal` prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa
- `invegent-web` prj_tXhG43iaqHBtVZpvU3osyG7dLLDZ
- Team ID: team_kYqCrehXYxW02AycsKVzwNrE
- Vercel MCP available only as `authenticate` / `complete_authentication` in this session — no `list_deployments`/`list_envs` without interactive auth. See Section 13.

---

## Section 11 — Live pipeline health

### Publishing last 7 days (from `m.post_publish`)
| Client | Platform | Posts | Last published |
|---|---|---|---|
| Care For Welfare Pty Ltd | linkedin | 7 | 2026-04-17 04:40 |
| NDIS-Yarns | facebook | 5 | 2026-04-13 06:05 |
| NDIS-Yarns | linkedin | 11 | 2026-04-17 05:40 |
| Property Pulse | facebook | 4 | 2026-04-15 23:20 |
| Property Pulse | linkedin | 18 | 2026-04-17 06:00 |

### Auto-approver pass rate last 7 days (via `m.post_draft.client_id` direct — joined through seed path no longer needed)
| Client | Total | Approved | Needs review | Rejected | Pass rate |
|---|---|---|---|---|---|
| Care For Welfare | 21 | 2 | 5 | 0 | 9.5% |
| NDIS-Yarns | 26 | 6 | 8 | 0 | 23.1% |
| Property Pulse | 45 | 11 | 8 | 0 | 24.4% |
| (NULL client_id) | 300 | 0 | 0 | 0 | — |

**Orphan alert:** 300 drafts with NULL client_id in last 7 days — D127 v2 claimed this was backfilled. New orphans since are a fresh pipeline defect.

### Open incidents (3)
| Incident | Client | Severity | Detected |
|---|---|---|---|
| ai_queue_depth (21 items) | NDIS-Yarns | WARNING | 2026-04-17 02:15 |
| ai_queue_depth (30 items) | Property Pulse | WARNING | 2026-04-17 02:00 |
| no_drafts_48h | Invegent | CRITICAL | 2026-04-17 01:00 |

All 3 are known per sync_state (transient queue drain + correct no-prompts-for-Invegent case).

### Compliance review queue (4 pending)
All 4 rows AI-reviewed by 2 Apr but status=`pending` (not yet human-reviewed). Detected 2026-04-01. **17 days stale.**
- NDIS Practice Standards Reform (high AI confidence)
- NDIS Practice Standards — Core Modules (low AI confidence)
- NDIS Commission Regulatory Priorities (high AI confidence)
- NDIS Code of Conduct (medium AI confidence)

---

## Section 12 — Items flagged for PK classification

This is the table PK will work from in the classification session. 38 items surfaced.

| # | Item | Source | Current state | Proposed classification | Notes |
|---|---|---|---|---|---|
| 1 | Meta App Review Standard Access | L002 + sync_state + consultant audit | In Review at Meta; no action from us; 27 Apr escalation trigger | — | Hard gate. Time-sensitive. |
| 2 | Legal review of service_agreement_v1.md + ToS clauses | L001/L003/L004/L007 | Template drafted with [LEGAL REVIEW REQUIRED] markers; solicitor status unknown | — | External blocker |
| 3 | Avatar consent workflow end-to-end (portal UI → signed DB row) | L005 | DB tables exist; HeyGen fully built; template in docs/consent/; portal UI unverified | — | Gate ordering violated |
| 4 | Privacy policy refresh for YouTube / HeyGen / video-analyser | L006 | Policy dated 4 Mar; capabilities added after | — | Compliance gap |
| 5 | AI content disclosure labelling | L007 | Not found in dashboard/portal briefs | — | Risk mitigator |
| 6 | One-page proof document | Consultant Audit 1 | NOT BUILT | — | Sales enablement |
| 7 | Portal "this month's ICE output" dashboard — is it the proof surface? | Consultant Audit 1 | Portal Home + Performance built (briefs 024, 031); not confirmed as a client-sales demo surface | — | Needs PK assessment |
| 8 | 90-day money-back framing | Consultant Audit 1 | Not in service agreement or sales playbook | — | Sales enablement |
| 9 | NDIS Yarns organic growth to sales-ready numbers | Consultant Audit 1 | Publishing active; reach thin; 4–8w window underway | — | Time-bound |
| 10 | sync_state.md drift — Edge Function count 42 vs 40 | Section 1.1 | Stale doc | — | Housekeeping |
| 11 | sync_state.md drift — 63 vs 42 active cron jobs | Section 1.2 | Stale doc | — | Housekeeping — potentially deeper: sync_state may be counting disabled/legacy jobs |
| 12 | sync_state.md drift — 60 feeds "active" vs 40 actual active | Section 1.3 | Stale doc | — | Housekeeping |
| 13 | client-assets bucket now public — sync_state claims it's private and blocks CFW logo | Section 1.4 | Resolved in reality | — | Close issue in sync_state |
| 14 | Auto-approver 7-day pass rate ~23% vs 50% claimed | Section 1.5 | Performance regression OR sync_state was point-in-time only | — | Quality/ops |
| 15 | CFW tokens not collected — Brief 041 blocked on PK | Section 3.1 | PK dependency | — | Phase 3 unblock |
| 16 | CFW + Invegent content_type_prompts absent (0 rows) | Section 9 + sync_state | Content session needed | — | Phase 3 unblock |
| 17 | CFW colours (primary/secondary/accent) NULL | sync_state line 188–190 | Manual entry needed | — | Phase 3 unblock |
| 18 | 8 Edge Functions deployed without local source | Section 2.1 | Source-of-truth gap | — | Tech debt — affects recovery/rollback |
| 19 | 2 Edge Functions local-only (ai-diagnostic, linkedin-publisher) | Section 2.2 | Either deploy or delete | — | Tech debt |
| 20 | 20+ env vars used in code but not in secrets_reference.md | Section 2.4 | Doc incomplete | — | Security hygiene |
| 21 | 22 tables with TODO/NULL purpose | Section 2.3 | Governance backlog | — | Tech debt |
| 22 | 300 post_drafts with NULL client_id in last 7d | Section 2.7 | New orphans despite D127 v2 backfill | — | Pipeline bug |
| 23 | RLS disabled on most c.* and m.* tables | Section 2.13 | Before multi-tenant portal traffic, review | — | Security |
| 24 | HeyGen integration built ahead of avatar consent legal gate | Section 6 L005 | Gate ordering violation | — | Legal/product |
| 25 | Video-analyser function deployed — offered to clients? | L004 + Section 6 | Deployed v9, unclear if live-reachable | — | Legal/product |
| 26 | Compliance review queue: 4 AI-reviewed pending since 1 Apr | Section 11 | 17-day stale | — | Compliance ops |
| 27 | Instagram 0 posts published in last 7d across all 4 clients | Section 9 | Prompts live, publisher deployed (v6), pipeline not producing | — | Pipeline bug or correct (no drafts yet reaching IG path) |
| 28 | Brief 041 (CFW platform config) status not logged | Section 3.1 | PARTIAL — needs result file | — | Doc hygiene |
| 29 | Brief 042 (LinkedIn Zapier bridge) done without result file | Section 3.2 | DONE in reality; result file missing | — | Doc hygiene |
| 30 | Brief 036 gap | Section 3.3 | Numbering gap | — | Low — doc hygiene |
| 31 | Subscription register has 13 rows; sync_state lists 12 | Section 2.11 | Reconcile 13th row | — | Ops |
| 32 | 4 TBC subscription costs (Vercel, HeyGen, Claude Max, OpenAI) | sync_state subscription register | Unresolved | — | Ops |
| 33 | Feed intelligence view `k.vw_feed_intelligence` has no documented purpose | Section 2.3 | Could be key surface, could be abandoned | — | Governance |
| 34 | `c.client_service_agreement` table — referenced but undocumented | Section 2.3 | Could hold client-signed agreement blob | — | Relates to Gate 3 |
| 35 | `c.onboarding_submission` table — undocumented | Section 2.3 | Core of onboarding pipeline | — | Doc hygiene |
| 36 | Publisher index.ts has uncommitted changes at session start | git status | Drift between committed and running versions | — | Source control hygiene |
| 37 | NDIS Yarns FB last published 5 days ago (2026-04-13); only 5 FB posts in 7d | Section 11 | Below posts-per-week target | — | Output volume |
| 38 | 115 SECURITY DEFINER functions in public — dead-code sweep not performed | Section 2.12 | Unknown usage surface | — | Security + tech debt |

---

## Section 13 — Open questions for PK

These items could not be resolved from this session's tools. PK input or follow-up session needed.

1. **Vercel state** — This session's Vercel MCP offers only `authenticate`/`complete_authentication` (interactive flow). Cannot retrieve deployment status, last-deployed timestamps, env var lists, or build errors for `invegent-dashboard`, `invegent-portal`, `invegent-web`. Needs either: (a) a browser session where PK completes `vercel login` and reruns the audit, or (b) Vercel CLI token available in env.

2. **Other Invegent GitHub repos (dashboard / portal / web)** — `gh` CLI not installed in the working environment. Cannot check last commit dates, open issues, branches. Needs: `gh` CLI install or PK runs `git log --oneline -1` in each repo and pastes.

3. **Meta App Review current status (18 Apr check)** — Documented as "In Review" on 14 Apr. Escalation trigger is 27 Apr. PK to confirm whether any Meta communication since 14 Apr.

4. **Legal solicitor engagement** — L001/L003/L004/L007 all say "before first external client sign-up". PK to confirm whether solicitor has been retained, quote received, review scheduled.

5. **Avatar consent workflow — portal UI state** — DB tables exist, template exists, onboarding-notifier deployed. Cannot verify from SQL alone whether portal collects signed consent, stores PDF/signature blob, and blocks HeyGen until stored. PK to confirm by portal walkthrough.

6. **Why 300 post_drafts have NULL client_id in last 7d** — D127 v2 in sync_state says this was backfilled. Either (a) D127 v2 works only on historical rows and ai-worker is still inserting NULLs, or (b) these are from a different seed path (email-ingest, series-writer) that bypasses client_id set. Needs code trace.

7. **Whether "One-page proof" was produced elsewhere (not in repo)** — Searched `docs/` — no hit. PK may have drafted outside the repo.

8. **Whether portal dashboard (Portal Home + Performance) is the intended sales-demo "meaningful dashboard"** — Consultant Audit 1 explicitly asked for "Here is what ICE has done for your page this month." Needs PK walk-through of portal to confirm this is the intended surface.

9. **brief_036 gap** — Was it intentionally skipped, renumbered, or never written?

10. **13th subscription_register row** — PK to name which row is the extra vs sync_state's 12-row listing.

11. **SQL query failures** — 3 SQL queries in the brief's query set failed on column-name mismatches (brief assumed `ps.id`, `pipeline_incident.status`, `compliance_review_queue.id` which don't exist). Refired with correct columns and captured above. Brief's query templates need updating.

12. **`k.vw_feed_intelligence` purpose** — name suggests material surface, but view has TODO purpose. PK to clarify.

13. **Vercel / HeyGen / Claude Max / OpenAI TBC subscription costs** — Still TBC in sync_state since at least 17 Apr. PK to invoice-chase.

---

*End of audit. Next step: PK reviews Section 12 in a Claude.ai session and produces `docs/15_pre_post_sales_criteria.md`.*
