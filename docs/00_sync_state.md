# ICE — Sync State Index

> **This file is the lightweight session pointer index.** It never grows large. Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1) after two giant-file-rewrite truncation incidents in 24h. See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for the frozen pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-09 | cc-0008-applied | **cc-0008 v5 APPLIED + CLOSED (PRV-1 first build) (v2.61).** `c.client_cadence_rule` table created per PRV-0 v2 §3.2 + 14-row seed (12 active + 2 paused-IG cadence-preserved per PRV-0 v2 §11.4) + 1 `k.table_registry` UPSERT + 19 `k.column_registry` UPSERTs in single `apply_migration`. All values trigger-aware via `INSERT ... ON CONFLICT DO UPDATE` (Path B per PK directive). Brief lineage v1 → v2 → v3 → v4 (rolled back at `uq_schema_table` due to event-trigger collision; auto-rolled back atomically; no production state changed) → **v5 (APPLIED)** in same session. v5 commit `d4cd3b08...` blob `2575f0bb` (67,494 B). V1–V7 all PASS. Both D-01 rows resolved in `m.chatgpt_review`: v5 row `cd35b93b-...` `status='resolved'` `resolved_by='cc-0008-v5-apply-2026-05-09'`; v4 row `5c5e8f05-...` `status='resolved'` `resolved_by='cc-0008-v5-supersession-2026-05-09'` (NOT applied). cc-0009 UNBLOCKED. **Lessons L33–L36 reified:** L33 (event trigger pre-flight survey mandatory); L34 (`k.fn_sync_registry` is database architecture); L35 (ON CONFLICT defensive pattern for k.*); L36 (`m.chatgpt_review.chatgpt_review_status_check` enum is `{pending,completed,failed,escalated,resolved}` — unblocks 5 prior close-the-loop carries). PK Lesson #62 type-(c) state-capture override applied 2026-05-09. T-MCP-02 +1; state-capture exceptions v2.61: 1. PHASES reconciliation **17th** consecutive carry. **PRV-1 first build delivered.** | `docs/runtime/sessions/2026-05-09-cc-0008-applied.md` |
| 2026-05-09 | cc-0005-v4-m8a-applied-pipeline-integrity-complete | **M8a Path A APPLIED and CLOSED via cc-0005 v4 (v2.59).** Single-transaction `apply_migration` (`m8a_cron48_rewrite_and_legacy_cleanup_v1`); 344 legacy-origin future queue rows dead-lettered. Cron 48 rewritten in place (`active=true`, schedule `*/5 * * * *`, jobname all preserved); legacy `public.get_next_scheduled_for(...)` fallback removed from COALESCE chain; autonomous slot-driven enqueue path preserved. cron 48 command_md5 `5113bc4...` → `57bbafb...` (+149 bytes). V1–V10' all PASS. No rollback. **Component 3 (function rename + COMMENT) DEFERRED to M8b** per v4 design. Result file commit `eb820bae`. **Urgent pipeline-integrity block now effectively complete** (M-series: M1+M2+M3, M4, M5, M6 Phase A + B, M7, M8a CLOSED; M8b not blocking new work). Brief-runner-v0 lessons L19–L21 VINDICATED. M-series total dead-letter rows since 8 May: 9 + 43 + 344 = 396. | `docs/runtime/sessions/2026-05-09-cc-0005-v4-m8a-applied-pipeline-integrity-complete.md` |
| 2026-05-09 | cc-0007-applied-ai-worker-401-recovered | **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT CLOSED / RECOVERED via cc-0007 APPLIED (v2.58).** Repo patch + EF deploy by CC. Recovery confirmed at first post-deploy cron 5 fire; status_code=200. V1–V4 all PASS. No rollback. Result file commit `411b85ee`. | `docs/runtime/sessions/2026-05-09-cc-0007-applied-ai-worker-401-recovered.md` |
| 2026-05-09 | cc-0006-closed-cc-0005-v3-patched | **F-CRON-PG-NET-TIMEOUT-5S CLOSED via cc-0006 APPLIED + cc-0005 / M8 Path A v3 PATCHED (v2.57).** cc-0006 (`cron_pg_net_timeout_30s_v1`) APPLIED; jobs 33/44/58 patched with `timeout_milliseconds := 30000`. V1+V2+V3 PASS. Result file commit `c72bc327`. cc-0005 v3 PATCHED chat-side. Brief-runner-v0 L10–L18 captured. | `docs/runtime/sessions/2026-05-09-cc-0006-closed-cc-0005-v3-patched.md` |
| 2026-05-09 | cc-0004-applied-m6-phase-b-closed | **M6 Phase B CLOSED via cc-0004 APPLIED (v2.56).** 43 rows dead-lettered across 7 (client, platform) partitions. All V1–V6 PASS. Result commit `9d5bdd37`. | `docs/runtime/sessions/2026-05-09-cc-0004-applied-m6-phase-b-closed.md` |
| 2026-05-09 | cc-0003-v2-applied-m6-phase-a-closed | **M6 Phase A CLOSED via cc-0003 v2 APPLIED (v2.55).** 9 rows dead-lettered, V1–V6 all PASS. cc-0003 v2 commit `d60dcfbc`. 6 brief-runner-v0 lessons captured (L1–L6). | `docs/runtime/sessions/2026-05-09-cc-0003-v2-applied-m6-phase-a-closed.md` |
| 2026-05-08 | video-worker-v3-deploy-verify-jwt-recovery | **video-worker v3.0.0 DEPLOYED + verify_jwt regression recovered + durable `supabase/config.toml` LANDED (v2.54).** | `docs/runtime/sessions/2026-05-08-video-worker-v3-deploy-verify-jwt-recovery.md` |
| 2026-05-08 | f-yt-ny-format-fix | **F-YT-NY-FORMAT-SELECTION CLOSED end-to-end (v2.53).** | `docs/runtime/sessions/2026-05-08-f-yt-ny-format-fix.md` |
| 2026-05-08 | v2.52-insights-sync-rpc-closure | **Productive close (v2.52).** 3 findings closed in single session. | `docs/runtime/sessions/2026-05-08-v2.52-insights-sync-rpc-closure.md` |
| 2026-05-08 | personal-finance-cowork-inbox-brief | **Lightweight close (v2.51).** | `docs/runtime/sessions/2026-05-08-personal-finance-cowork-inbox-brief.md` |
| 2026-05-07 | p1-sd-triage-sync | **P1 SECURITY-DEFINER triage CLOSED (v2.50).** | `docs/runtime/sessions/2026-05-07-p1-sd-triage-sync.md` |
| 2026-05-07 | stage3-safe-deploy | **Stage 3 SHIPPED + VERIFIED (v2.49).** | `docs/runtime/sessions/2026-05-07-stage3-safe-deploy.md` |
| 2026-05-07 | stage2b-shipped-accepted | **Stage 2b SHIPPED + ACCEPTED (v2.48).** | `docs/runtime/sessions/2026-05-07-stage2b-shipped-accepted.md` |
| 2026-05-07 | s30-pass-stage2b-kickoff | **S30 PASS + Stage 2b kickoff (v2.47).** | `docs/runtime/sessions/2026-05-07-s30-pass-stage2b-kickoff.md` |
| 2026-05-07 | dashboard-architecture-review-completion | **Dashboard Architecture Review COMPLETE.** | `docs/runtime/sessions/2026-05-07-dashboard-architecture-review-completion.md` |
| 2026-05-07 | s30-paused-stuck-cluster-recheck | Lightweight checkpoint. | `docs/runtime/sessions/2026-05-07-s30-paused-stuck-cluster-recheck.md` |
| 2026-05-07 | stage2a-cron-applied | F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED. | `docs/runtime/sessions/2026-05-07-stage2a-cron-applied.md` |
| 2026-05-07 | bef6be96-investigation-resolved | bef6be96 origin RESOLVED. | `docs/runtime/sessions/2026-05-07-bef6be96-investigation-resolved.md` |
| 2026-05-06 | f-ef-drift-prevention-stage2a-checkpoint | Stage 2a CHECKPOINT. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md` |
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | Stage 1 APPLIED. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | Tier 2 inventory LOCKED. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 APPLIED. 7/7 PASS. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 APPLIED. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | M1+M2+M3 applied. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | Dashboard review kickoff. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | ai-worker v2.11.1; F-AAP-007 v2; F-PUB-009. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | B-AUDIT-CHECK5-DRIFT retired. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 + runbook v2.1. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied. | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | F-AAP-001 + F-AAP-002 + B-AUDIT-V4-PEERS clean. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-09 Sydney — cc-0008 v5 APPLIED + CLOSED (PRV-1 first build delivered) (v2.61)

**Outcome:** **cc-0008 v5 APPLIED and CLOSED via single `apply_migration cc_0008_client_cadence_rule`.** New `c.client_cadence_rule` table created per PRV-0 v2 §3.2 + 14-row seed (12 active publish_profile + 2 paused-IG cadence-preserved per PRV-0 v2 §11.4) + 1 `k.table_registry` UPSERT + 19 `k.column_registry` UPSERTs — all values trigger-aware via `INSERT ... ON CONFLICT DO UPDATE` (Path B per PK directive 2026-05-09). Brief lineage v1 → v2 → v3 → v4 → v5 in same session. **v4 apply attempt 2026-05-09 ~11:55 UTC FAILED at `uq_schema_table` due to event-trigger collision** (`trg_k_registry_sync_on_create_table` → `k.fn_sync_registry` auto-INSERTs stub k.* rows at `ddl_command_end`); auto-rolled back atomically; no production state changed. **v5 supersedes v4 with trigger-aware ON CONFLICT pattern; APPLIED CLEANLY.**

**Apply summary:** v5 commit `d4cd3b088c98b37667c85382a52b024ef3636b2d` blob `2575f0bb9c3d1a21035b729095eb126465dc7f9e` (67,494 B landed). NEW v5 D-01 fire (review_id `cd35b93b-6d9f-4f09-8fa1-26a0c3d669b4`, action_type `sql_destructive`, verdict partial / escalate=true / risk=medium / confidence=high). Three pushbacks all generic-future-uncertainty matching v4 fire shape; `corrected_action='consider performing additional testing on a staging environment'` not actionable since ICE has no staging environment. **PK Lesson #62 type-(c) state-capture exception override applied 2026-05-09.** `apply_migration` returned `{"success":true}`. Result file commit (this 4-way sync) `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md`.

**V1–V7 verification (all PASS):** V1a `table_exists=true`, `column_count=19`. V1b CHECK count = 7 (5 inline + 2 named). V1c FK count = 1. V1d index count = 3. V1e `preferred_local_times` `data_type=ARRAY` `udt_name=_time`. V2 14/14/0. V3 expected:seeded pairs 14:14. V4 null + period + window violations 0/0/0. V5 invariant violations 0. V6a `allowed_ops='upsert'` (UPDATEd from default 'read-only'); rich fields populated. V6b 19 column rows; `is_foreign_key` 1+18; all `column_purpose` populated; `client_id` FK detail correct. **V6c (NEW v5) `allowed_ops` upgrade confirmed — proves ON CONFLICT executed.** V7 paused-IG 2/2 rows carry all 4 tokens. `expected_format` breakdown: 4×`image_quote` + 4×`image` + 4×`linkedin_post` + 2×`youtube_short` = 14 non-null.

**Pre-flight + final re-verify:** §1.12 (event trigger survey, NEW v5) + §1.13 (k.* unique constraints + column defaults + schema_registry membership, NEW v5) all PASS at brief authoring + final ~60s re-verify; no drift. `r` schema confirmed pre-registered in `k.schema_registry` (cc-0009 readiness — schema row exists; cc-0009 only creates tables within it).

**D-01 close-the-loop (TWO rows resolved this turn):** v5 row `cd35b93b-...` `status='resolved'` `resolved_by='cc-0008-v5-apply-2026-05-09'` `escalation_resolved_at=2026-05-09 21:41:47 UTC`. v4 row `5c5e8f05-...` `status='resolved'` (NOT `applied`) `resolved_by='cc-0008-v5-supersession-2026-05-09'`. **`m.chatgpt_review.chatgpt_review_status_check` enum discovered: `{pending, completed, failed, escalated, resolved}`** — both UPDATEs map to `resolved`; "applied vs superseded" semantic distinction lives in `action_taken` + `resolved_by` text fields. **L36 candidate** — also unblocks 5 prior outstanding close-the-loop carries (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) which were blocked by the same enum constraint.

**Brief-runner-v0 lessons (NEW this cycle, L33–L36):**

- **L33** Event trigger pre-flight survey is mandatory for DDL briefs in `k.schema_registry`-registered schemas (a/c/f/k/m/r/t). v4 rolled back precisely because v4 brief did not survey active event triggers in `k.*`. v5 added §1.12 survey + §1.13 constraint inspection. Reified across all PRV-1 build briefs (cc-0009 / cc-0010 / cc-0011).
- **L34** `k.fn_sync_registry` auto-registration is part of database architecture, not edge case.
- **L35** `INSERT ... ON CONFLICT DO UPDATE` is the defensive pattern for k.* registry rows. v5 §3.3+§3.4 use ON CONFLICT for both `k.table_registry` (target `(schema_name, table_name)`) and `k.column_registry` (target `(table_id, column_name)`). V6c verifies the upgrade actually executed.
- **L36** `m.chatgpt_review.chatgpt_review_status_check` enum is `{pending, completed, failed, escalated, resolved}`. Empirical fact: `execute_sql` DML on `m.chatgpt_review` works once the CHECK constraint is satisfied — memory standing rule "execute_sql is effectively read-only on c/f/m/t schemas for DML" appears over-cautious for `m.chatgpt_review` specifically.

**Earlier reified lessons (cc-0008 lineage, in this session):** L26–L32.

**PRV-1 cc-0008 first build delivered. cc-0009 (r.* + cadence-rule-generator EF + first backfill) UNBLOCKED.** cc-0009 brief-decision flag (PRV-0 v2 §5.1): for paused-IG rows, cadence-rule-generator EF must choose option (a) skip OR option (b) `expected_status='suppressed'`. v5 seed correct under either path.

**Constraints respected this turn:** No EF deploys. No cron edits. No `r.*` schema work. No temp log tables. No Phase 0 scheduling. No M8 work. No DDL/DML beyond `c.client_cadence_rule` + its k.* rows + 2 close-the-loop UPDATEs to `m.chatgpt_review`. STANDING_THREE EFs untouched. T-MCP-02 +1 (cc-0008 v5 D-01); state-capture exceptions v2.61: 1.

**Closed v2.61:** **cc-0008 v5 (PRV-1 first build).** Result file commit landed in this 4-way sync. PRV-1 cc-0008..cc-0011 sequence: cc-0008 CLOSED; cc-0009 NEXT; cc-0010 / cc-0011 sequenced after cc-0009.

---

### 2026-05-09 Sydney — cc-0005 v4 / M8a APPLIED (M8 Path A complete; pipeline-integrity block effectively closed) (v2.59)

**Outcome:** **M8a Path A APPLIED and CLOSED.** cc-0005 v4 APPLIED via Supabase MCP `apply_migration` by CC in single atomic transaction (`m8a_cron48_rewrite_and_legacy_cleanup_v1`). 344 legacy-origin future queue rows dead-lettered with `dead_reason='m8_cutover_legacy_path_deprecated'`. Cron 48 rewritten in place; `active=true` and schedule preserved. Legacy `public.get_next_scheduled_for(...)` fallback removed from cron 48's COALESCE chain. V1–V10' all PASS. No rollback. **Component 3 (function rename + COMMENT) deferred to M8b per v4 design.**

**Apply summary:** migration `m8a_cron48_rewrite_and_legacy_cleanup_v1`; 344 rows dead-lettered; cron 48 command_md5 `5113bc4...` → `57bbafb...` (+149 bytes). Result file commit `eb820bae` (blob `ebd2fb05`, 16,052 B).

**V1–V10' verification (all PASS):** V1 dead_reason count = 344. V2 cleanup criterion = 0. V3 queued+failed depth = 97. V4 dead = 444. V5 set-equality. V6 per-status totals coherent. V7 cron 48 active=true + schedule unchanged. V8 cron 48 command no longer contains legacy fallback. V9 autonomous enqueue path still represented. V10' expected callers list = 2 manual functions; cron 48 dropped as intended.

**Brief-runner-v0 lessons:** L19–L21 VINDICATED. L11+L16+L17+L18 vindicated again.

**M-series total dead-letter rows since 8 May 2026:** 9 + 43 + 344 = **396 rows.**

---

## 🟡 Next session priorities (rebuilt v2.61)

1. **cc-0009 brief authoring** — **PRV-1 next sequenced step** post cc-0008 closure. Creates `r.*` schema tables (`r.reconciliation_run` + `r.expected_publication`), deploys cadence-rule-generator EF, runs first backfill against `c.client_cadence_rule` seed. Brief-decision flag (PRV-0 v2 §5.1): option (a) skip vs option (b) `expected_status='suppressed'` for paused-IG rows. L33+L34+L35 reified — cc-0009 brief MUST include `pg_event_trigger` survey in §1.x pre-flight + ON CONFLICT pattern for any k.* UPSERTs. Brief author when scheduled: chat. **PK directs scheduling.**
2. **Close-the-loop UPDATE batch (5 prior carries — UNBLOCKED v2.61)** — cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 D-01 rows in `m.chatgpt_review` were blocked by `chatgpt_review_status_check` enum mismatch (now mapped: all to `resolved` with semantic distinction in `action_taken`+`resolved_by`). Batch close-out is straightforward: 5 UPDATEs in one execute_sql call. ~10 min when scheduled.
3. **Platform Reconciliation View — BRIEF AUTHORING** (rank 1 carry from v2.59) — **PROMOTED to next major planning/work item per PK directive**. All three sequencing blockers cleared. Implementation gates remaining: Phase 0 confirmation defaults; architecture review §10 extension scope; manual override design; API ingestion priority order. 13 seed manual observations from 2026-05-09 in `docs/00_action_list.md`.
4. **Dashboard Architecture Review Phase 0 prerequisites** (P1 TOP) — unchanged. PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`.
5. **AI cost view P3** (quick win, ~1h) — unchanged.
6. **Personal businesses check-in** — standing P0.

Carries (lower priority):
- **Publisher latent config risk follow-up** (P3 quick win, ~5 min)
- **F-CRON-AUTO-APPROVER-SECRET-INLINE** (P2 sec, OPEN, carry from v2.57)
- **M8b separate brief** — NOT YET AUTHORED. Reserved as separate cc-NNNN brief.
- **94-row un-publishable legacy draft cohort cleanup** — separate follow-up brief if PK directs.
- F-YT-PUB-AVATAR-EXCLUSION (P3, latent)
- F-PUB-009 V3-V5 + 7-day flow (P2, passive monitoring)
- F-AAP-NEEDS-REVIEW-BACKLOG (P2)
- F-AI-WORKER-PARSER-SKIP-BUG V4 (P2, passive)
- morning-inbox-sweep-v1 brief amendment (P3)
- Vault `service_role_key` naming hygiene (P3)
- `docs/audit/health/2026-05-06.md` follow-up (P3)
- Dashboard mobile responsiveness (P3)
- Dashboard roadmap PHASES reconciliation (P3, **17th** consecutive deferral)
- `00_overview.md` 11-section table reconciliation (P3)
- Invegent IG cap-throttle planning (P3)
- CFW post-ai-worker dead drafts (P3)
- 4× F-CRON-*-STALE (P2)
- Music library activation checklist (PK action) + Emergency redeploy governance question (PK decision)
- v2.56 P3 backlog observation (LinkedIn queue row `1a21199e-...`)
- v2.60 future ideation Brand Topic Notebook (queued behind cc-0008/PRV-1, Platform Reconciliation, AI OS Improvements)

---

## ⛔ Carried-forward "do not touch" state

**v2.61 update on standing items:**

- **cc-0008 v5 / PRV-1 first build: CLOSED.** v5 apply commit succeeded; result file committed in this 4-way sync. v4 apply attempt FAILED at `uq_schema_table`; auto-rolled back; no production state changed; v4 D-01 row resolved as `superseded` (NOT `applied`). v5 D-01 row resolved as `applied`. **PRV-1 cc-0008 sequence delivered; cc-0009 next.**
- **cc-0009 readiness: UNBLOCKED.** `r` schema pre-registered in `k.schema_registry` (status='active'). Brief author when PK directs. cc-0009 must include §1.x event-trigger pre-flight survey + ON CONFLICT pattern for k.* UPSERTs (L33+L34+L35).
- **5 prior close-the-loop carries: UNBLOCKED v2.61.** L36 enum discovery makes batch close-out straightforward at next session.
- **L33+L34+L35+L36 lessons reified.** All future PRV-1 build briefs (cc-0009 / cc-0010 / cc-0011) MUST include event trigger pre-flight survey + ON CONFLICT pattern.
- **M8 Path A (cc-0005 v4 / M8a): still CLOSED.** v2.59 closure unchanged.
- **M8b separate brief: NOT YET AUTHORED.** Not blocking new work.
- **94-row un-publishable legacy draft cohort: still recorded as separate follow-up.**
- **Urgent pipeline-integrity block: EFFECTIVELY COMPLETE.**
- **Platform Reconciliation View brief candidate: still PROMOTED.** Remains rank 1 carry.
- **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT: still CLOSED.** v2.58 closure unchanged.
- **Publisher latent config risk: OPEN as P3 follow-up.**
- **F-CRON-AUTO-APPROVER-SECRET-INLINE: still OPEN.**
- **F-CRON-PG-NET-TIMEOUT-5S: still CLOSED.** v2.57 closure unchanged.
- **M7 closure** — doc-only fold complete with M8a 4-way sync.
- **T-MCP-02 quota:** cumulative +1 v2.61 for cc-0008 v5 D-01 fire. 5 close-the-loop UPDATEs UNBLOCKED v2.61. 2 close-the-loop UPDATEs APPLIED v2.61 (cc-0008 v5 + v4 supersession).
- Cron-backed drift logging is LIVE. No drift fires this cycle.
- Standing don't-redeploy three (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — list unchanged.
- Dashboard roadmap PHASES array stale since 3 May — **17th** consecutive deferral.
- M-series total dead-letter rows cleared since 8 May 2026: 9 + 43 + 344 = **396 rows.** No new M-series rows v2.61 (cc-0008 is PRV-1 build, not M-series queue integrity).
- cc-0003 / cc-0004 / cc-0005 / cc-0006 / cc-0007 / cc-0008 briefs and result files — cc-0008 result file committed in this 4-way sync; others untouched.
- Memory `recent_updates` v2.55–v2.61 entries **deferred** per PK explicit scope across multiple closes.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (oldest of the prior 1–2 inlined sessions drops out)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** **v2.61 status:** ~25KB after this update. Archive sweep **OVERDUE** since the 16KB threshold was crossed at v2.54 close. Sweep deferred to a separate cycle.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-09 Sydney — v2.61: **cc-0008 v5 APPLIED + CLOSED (PRV-1 first build delivered).** `c.client_cadence_rule` table created per PRV-0 v2 §3.2 + 14-row seed + 1 `k.table_registry` UPSERT + 19 `k.column_registry` UPSERTs in single `apply_migration` (`cc_0008_client_cadence_rule`). All values trigger-aware via `INSERT ... ON CONFLICT DO UPDATE` (Path B per PK directive). Brief lineage v1 → v2 → v3 → v4 (rolled back at `uq_schema_table`; auto-rolled back atomically; no production state changed) → **v5 (APPLIED)** in same session. v5 commit `d4cd3b08...` blob `2575f0bb` (67,494 B). V1–V7 all PASS. Both D-01 rows resolved: v5 row `cd35b93b-...` `status='resolved'` `resolved_by='cc-0008-v5-apply-2026-05-09'`; v4 row `5c5e8f05-...` `status='resolved'` `resolved_by='cc-0008-v5-supersession-2026-05-09'` (NOT applied). cc-0009 UNBLOCKED. **Lessons L33–L36 reified.** PK Lesson #62 type-(c) state-capture override applied 2026-05-09. T-MCP-02 +1; state-capture exceptions v2.61: 1. PHASES reconciliation **17th** carry. **PRV-1 first build delivered.** Carry: cc-0009 next; 5 prior close-the-loop carries UNBLOCKED at next session; M8b separate brief, 94-row un-publishable legacy draft cohort, publisher latent config risk, F-CRON-AUTO-APPROVER-SECRET-INLINE; v2.60 Brand Topic Notebook future ideation queued. Previous (v2.59): M8a Path A APPLIED via cc-0005 v4. Previous (v2.58): F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT CLOSED via cc-0007 APPLIED.*
