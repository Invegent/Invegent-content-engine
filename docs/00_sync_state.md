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
| 2026-05-09 | cc-0005-v4-m8a-applied-pipeline-integrity-complete | **M8a Path A APPLIED and CLOSED via cc-0005 v4 (v2.59).** Single-transaction `apply_migration` (`m8a_cron48_rewrite_and_legacy_cleanup_v1`); 344 legacy-origin future queue rows dead-lettered with `dead_reason='m8_cutover_legacy_path_deprecated'`. Cron 48 rewritten in place (`active=true`, schedule `*/5 * * * *`, jobname all preserved); legacy `public.get_next_scheduled_for(...)` fallback removed from COALESCE chain; autonomous slot-driven enqueue path preserved (V9 in-migration gate verified `INSERT INTO m.post_publish_queue` + `pd.scheduled_for` + `s.scheduled_publish_at` all still represented). cron 48 command_md5 `5113bc4...` → `57bbafb...` (+149 bytes). V1–V10' all PASS. No rollback. **Component 3 (function rename + COMMENT) DEFERRED to M8b** per v4 design; `public.get_next_scheduled_for` NOT renamed; manual callers `public.draft_approve_and_enqueue` + `public.draft_approve_and_enqueue_scheduled` NOT modified. V10' delta-framed verification confirmed exactly 2 manual callers post-apply (cron 48 dropped from caller list as intended). Result file commit `eb820bae6951b66bfd1dd9a61e3e0cb235d5d8ad` (blob `ebd2fb05`, 16,052 B). **Urgent pipeline-integrity block now effectively complete** (M1+M2+M3, M4, M5, M6 Phase A + B, M7 folds-in, M8a CLOSED; M8b is the only residual M-series item, gated on manual caller remediation, not blocking new work). **Per PK directive: Platform Reconciliation View becomes the next major planning/work item after this sync close.** Brief-runner-v0 lessons L19–L21 VINDICATED (CC pre-flight HALT pattern; in-place patch vs scope-reduce vs new brief; scope re-banding); L11+L16+L17+L18 vindicated again (md5 fingerprint, function-call regex, in-place patching, pre-flight cohort surfacing). M-series total dead-letter rows since 8 May: 9 + 43 + 344 = 396. T-MCP-02 +1 (cc-0005 v4 D-01); cumulative pending close-the-loops now 5. State-capture exceptions v2.59: 0. P0+P1 open: ~2 → ~2 (cc-0005 v4 / M8a was P3 scheduling). PHASES reconciliation now **15th** carry. | `docs/runtime/sessions/2026-05-09-cc-0005-v4-m8a-applied-pipeline-integrity-complete.md` |
| 2026-05-09 | cc-0007-applied-ai-worker-401-recovered | **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT CLOSED / RECOVERED via cc-0007 APPLIED (v2.58).** Repo patch (`supabase/config.toml` `[functions.ai-worker] verify_jwt = false`, commit `5037e573`) + EF deploy (`supabase functions deploy ai-worker --no-verify-jwt`, exit=0 at 04:23:27Z) by CC. **First `ef_deploy` D-01 action_type in cc-NNNN series.** Recovery confirmed at first post-deploy cron 5 fire 04:25:00Z (~93 s after DEPLOY_TIMESTAMP); status_code=200; pattern transition unambiguous: 22+ × 401 pre-deploy → 200 immediately post-deploy. V1–V4 all PASS at first fire. No rollback. Class match to v2.54 video-worker regression (commit `6ed29bbc`); 2-step recovery pattern (config.toml entry + `--no-verify-jwt` deploy) now vindicated twice across distinct EFs. Result file commit `411b85ee` (blob `b21be653`, 11,401 B). Latent risk noted (NOT closed): publisher block remains ABSENT from `supabase/config.toml`. HTTP 401 5-min cron triage candidate from v2.57 CLOSED (jobid 5 was the source). Brief-runner-v0 L22–L25 vindicated (`ef_deploy` action_type, repo+deploy coordination, P1 recovery timing, security hygiene); L23 logged but rollback not exercised. P0+P1 open: ~3 → ~2. PHASES reconciliation 14th carry. | `docs/runtime/sessions/2026-05-09-cc-0007-applied-ai-worker-401-recovered.md` |
| 2026-05-09 | cc-0006-closed-cc-0005-v3-patched | **F-CRON-PG-NET-TIMEOUT-5S CLOSED via cc-0006 APPLIED + cc-0005 / M8 Path A v3 PATCHED (v2.57).** Combined doc-only close. cc-0006 (`cron_pg_net_timeout_30s_v1`) APPLIED by CC via Supabase MCP `execute_sql` wrapping 3 `cron.alter_job(...)` in single transaction; jobs 33/44/58 each patched with `timeout_milliseconds := 30000`. V1+V2+V3 PASS strictly; V4 PASS load-bearing. No rollback. Result file commit `c72bc327`. First `cron_edit` D-01 action_type. F-CRON-AUTO-APPROVER-SECRET-INLINE remains separately OPEN. cc-0005 v3 PATCHED chat-side; v3 fixes regex bugs + H1–H6 + M1–M4 + L1–L2. Brief-runner-v0 L10–L18 captured. T-MCP-02 +1. P0+P1 open: ~2. PHASES reconciliation 13th carry. | `docs/runtime/sessions/2026-05-09-cc-0006-closed-cc-0005-v3-patched.md` |
| 2026-05-09 | cc-0004-applied-m6-phase-b-closed | **M6 Phase B CLOSED via cc-0004 APPLIED (v2.56).** 43 rows dead-lettered across 7 (client, platform) partitions. All V1–V6 PASS. No rollback. Result commit `9d5bdd37`. M6 dead-letter cycle now functionally complete (52 rows total). Brief-runner-v0 L6 validated. T-MCP-02 +1. P0+P1 open: ~3 → ~2. PHASES reconciliation 12th carry. | `docs/runtime/sessions/2026-05-09-cc-0004-applied-m6-phase-b-closed.md` |
| 2026-05-09 | cc-0003-v2-applied-m6-phase-a-closed | **M6 Phase A CLOSED via cc-0003 v2 APPLIED (v2.55).** Brief-runner-v0 HALT-then-correction loop completed end-to-end. 9 rows dead-lettered, V1–V6 all PASS, no rollback. cc-0003 v2 commit `d60dcfbc`. 6 brief-runner-v0 lessons captured (L1–L6). T-MCP-02 +1. P0+P1 open: ~4 → ~3. PHASES reconciliation 11th carry. | `docs/runtime/sessions/2026-05-09-cc-0003-v2-applied-m6-phase-a-closed.md` |
| 2026-05-08 | video-worker-v3-deploy-verify-jwt-recovery | **video-worker v3.0.0 DEPLOYED + verify_jwt regression recovered + durable `supabase/config.toml` LANDED (v2.54).** | `docs/runtime/sessions/2026-05-08-video-worker-v3-deploy-verify-jwt-recovery.md` |
| 2026-05-08 | f-yt-ny-format-fix | **F-YT-NY-FORMAT-SELECTION CLOSED end-to-end (v2.53).** | `docs/runtime/sessions/2026-05-08-f-yt-ny-format-fix.md` |
| 2026-05-08 | v2.52-insights-sync-rpc-closure | **Productive close (v2.52).** 3 findings closed in single session. | `docs/runtime/sessions/2026-05-08-v2.52-insights-sync-rpc-closure.md` |
| 2026-05-08 | personal-finance-cowork-inbox-brief | **Lightweight close (v2.51).** | `docs/runtime/sessions/2026-05-08-personal-finance-cowork-inbox-brief.md` |
| 2026-05-07 | p1-sd-triage-sync | **P1 SECURITY-DEFINER triage CLOSED (v2.50).** | `docs/runtime/sessions/2026-05-07-p1-sd-triage-sync.md` |
| 2026-05-07 | stage3-safe-deploy | **Stage 3 SHIPPED + VERIFIED (v2.49).** `scripts/safe-deploy.sh` live. | `docs/runtime/sessions/2026-05-07-stage3-safe-deploy.md` |
| 2026-05-07 | stage2b-shipped-accepted | **Stage 2b SHIPPED + ACCEPTED on desktop (v2.48).** | `docs/runtime/sessions/2026-05-07-stage2b-shipped-accepted.md` |
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

### 2026-05-09 Sydney — cc-0005 v4 / M8a APPLIED (M8 Path A complete; pipeline-integrity block effectively closed) (v2.59)

**Outcome:** **M8a Path A APPLIED and CLOSED.** cc-0005 v4 APPLIED via Supabase MCP `apply_migration` by CC in single atomic transaction (`m8a_cron48_rewrite_and_legacy_cleanup_v1`). 344 legacy-origin future queue rows dead-lettered with `dead_reason='m8_cutover_legacy_path_deprecated'`. Cron 48 rewritten in place; `active=true` and `schedule='*/5 * * * *'` and `jobname='enqueue-publish-queue-every-5m'` all preserved unchanged across apply boundary. Legacy `public.get_next_scheduled_for(...)` fallback removed from cron 48's COALESCE chain. Autonomous slot-driven enqueue path preserved (V9 in-migration gate verified). V1–V10' all PASS. No rollback. **Component 3 (function rename + COMMENT) deferred to M8b per v4 design.** `public.get_next_scheduled_for` continues to exist with original name and signature; manual callers `public.draft_approve_and_enqueue` + `public.draft_approve_and_enqueue_scheduled` NOT modified.

**Apply summary:** migration `m8a_cron48_rewrite_and_legacy_cleanup_v1`; 344 rows dead-lettered with `dead_reason='m8_cutover_legacy_path_deprecated'`; cron 48 command_md5 `5113bc435fe5cb1a088931b66eabdbfe` → `57bbafb19a51308a69db18607c8ad991` (+149 bytes; matches v3-rephrased comment additions). `apply_migration` returned `{"success": true}`. Result file commit `eb820bae6951b66bfd1dd9a61e3e0cb235d5d8ad` (blob `ebd2fb05`, 16,052 B); CC retained brief filename (`docs/briefs/results/cc-0005-m8-atomic-cutover.md`), not M8a-specific.

**V1–V10' verification (all PASS):** V1 `dead_reason` count = 344 (= 0 + 344). V2 cleanup criterion in `(queued, failed)` = 0. V3 queued+failed depth = 97 (= 441 - 344). V4 dead count = 444 (= 100 + 344). V5 set-equality between captured 344-row snapshot and post-apply dead+m8 set (zero diff). V6 per-status totals coherent. V7 cron 48 `active=true` + schedule unchanged + jobname unchanged. V8 cron 48 command no longer contains function-call to legacy fallback. V9 autonomous slot-driven enqueue path still represented (`INSERT INTO m.post_publish_queue` + `pd.scheduled_for` + `s.scheduled_publish_at` all true). V10' expected callers list = exactly 2 manual functions; 0 cron rows (cron 48 dropped from caller list as intended; manual callers preserved).

**Pre-flight + final re-verify (no drift between initial §1 capture and ~60 s pre-apply re-verify):** §1.0 sequencing gate cleared (cc-0003 v2 + cc-0004 both Complete v2.55/v2.56). §1.3 cron 48 `active=true`, command_md5 unchanged at re-verify. §1.4 callers list = exactly 3 expected (cron 48 + 2 manual functions); v4 §8.2.g HALT criterion not triggered. §1.5a cleanup count 344 (in band [250, 500]) at both initial and re-verify. §1.5d slot alignment misaligned count = 0 (HALT §8.2.l not triggered). §1.5 cross-check vs cc-0003 v2 + cc-0004 = 0 + 0 (no overlap). §1.6 snapshot captured to `/tmp/cc-0005-v4-targets-2026-05-09.json` (26,871 bytes; 344 distinct queue_ids; all `pre_status='queued'`) BEFORE the UPDATE fired. §1.5c un-publishable cohort = 94 (informational; recorded as separate follow-up per v4 design).

**D-01 fires this cycle (chat side):** 1 fire (cc-0005 v4 D-01 review by chat). Verdict `agree / proceed`, M8a-only scope, normal controls. PK approval phrase: `"pk proceed with cc-0005 v4 M8a apply"`. Action type: `sql_destructive`. Conditions all met. v2.59 4-way sync close commit (this) is doc-only and per protocol does NOT require a fire.

**Brief-runner-v0 lessons — cc-0005 v4 / M8a cycle:**

- **L19 (CC v3 pre-flight HALT pattern)** — **VINDICATED** by full closure cycle. v3 §1.4 caller check HALTed correctly when expected (1) didn't match observed (3); v4 reframed and applied cleanly on first attempt. Promotion to baseline candidate.
- **L20 (in-place patch vs scope-reduce vs new brief)** — **VINDICATED**. v4 retired Component 3 in-place; M8b reserved as separate cc-NNNN brief. v4 applied cleanly without retrying Component 3 in-line.
- **L21 (scope re-banding pattern)** — **VINDICATED**. v4's [250, 500] band held; observed count 344 was inside band; no apply-time amendment required.
- **L11 (md5 baseline + post-md5 fingerprint)** — **VINDICATED AGAIN** (cc-0006 + cc-0005 v4). Promotion to baseline candidate.
- **L17 (in-place patching pattern)** — **VINDICATED AGAIN** (cc-0003 v2, cc-0005 v3 → v4, cc-0005 v4 itself was the in-place super of v3; v3 never applied). Promotion to baseline candidate.
- **L16 (function-call regex pattern)** — **VINDICATED AGAIN** (cc-0005 v3 review pass + cc-0005 v4 applied verification gates). Promotion to baseline candidate.
- **L18 (pre-flight cohort surfacing pattern)** — **VINDICATED AGAIN**. §1.5c un-publishable cohort (94 rows) surfaced cleanly; cohort recorded as separate follow-up out-of-scope for M8a/M8b.

**Brief-runner-v0 patterns observed (§9 of result file):** multi-component single-transaction with in-migration verify gates (Component 1 → V7+V8+V9 → Component 2 count gate → Component 2 UPDATE; each `RAISE EXCEPTION` atomically rolls back); md5 fingerprint cron edit verification (independently verifiable post-apply); §1.6 snapshot persisted to local file (rollback authority concretely materialised; V5 used local diff); V10' "expected delta" framing (3 callers → 2 callers; cron 48 dropped by design); function rename deferral via Component 3 → M8b (cleanest path-A-with-incremental-cutover pattern in M-series).

**M-series closure milestone (total residual rows cleared by dead-letter cycles since 8 May 2026):** M6 Phase A (9) + M6 Phase B (43) + M8a (344) = **396 rows**.

**Urgent pipeline-integrity block now effectively complete:**

| Block | Status | Closure |
|---|---|---|
| cc-0007 ai-worker 401 recovery | CLOSED | v2.58 |
| cc-0005 M8a Path A | **CLOSED** | **v2.59 (this)** |
| Urgent pipeline-integrity closure work | **EFFECTIVELY COMPLETE** | v2.59 (M8b is the only residual M-series item, gated on manual caller remediation; not blocking new work) |

**Per PK directive recorded at Platform Reconciliation View brief candidate addition (commit `a8a241d1`): with all three sequencing blockers now cleared, Platform Reconciliation View becomes the next major planning/work item after this sync close.** Implementation gates: Phase 0 confirmation defaults still pending (P1 TOP carry); architecture review §10 extension scope to be decided at brief-authoring time; manual override design + API ingestion priority order to be decided at brief-authoring time. Brief author when promoted: chat. 13 seed manual observations from 2026-05-09 captured in dedicated 🟢 status block in `docs/00_action_list.md` (preserved across v2.58 and v2.59 closes).

**Constraints respected this turn:** No Supabase writes. No D-01 fire. No cron edits. No EF deploys. No code changes. No Phase 0 scheduling. No M8b apply work. Single doc-only commit covering 3 files. cc-0003 / cc-0004 / cc-0005 / cc-0006 / cc-0007 briefs and result files **untouched**.

**Closed v2.59:** **M8 Path A (cc-0005 v4 / M8a)** — Component 1 (cron 48 in-place rewrite) + Component 2 (legacy-origin future cleanup, 344 rows). Result commit `eb820bae`.

**Open / deferred this turn (carried per PK explicit scope):** 5 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 D-01 fires); memory `recent_updates` v2.55+v2.56+v2.57+v2.58+v2.59 entries chat-owned at next opportunity; dashboard PHASES reconciliation **15th** consecutive deferral; M8b brief authoring deferred (gated on manual caller remediation); 94-row un-publishable legacy draft cohort cleanup separate follow-up if PK directs; Phase 0 scheduling still NOT scheduled; Publisher latent config risk follow-up (P3, carry); F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN, carry); Platform Reconciliation View promotes to next major work item per PK directive.

---

### 2026-05-09 Sydney — cc-0007 APPLIED (F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT RECOVERED) (v2.58)

**Outcome:** **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1) CLOSED / RECOVERED.** cc-0007 APPLIED via repo patch + EF deploy by CC. Recovery confirmed at first post-deploy cron 5 fire (04:25:00 UTC, ~93 s after `DEPLOY_TIMESTAMP` 04:23:27 UTC). V1–V4 all PASS. No rollback. **First `ef_deploy` D-01 action_type in cc-NNNN series.** Class match to v2.54 video-worker regression (commit `6ed29bbc`); 2-step recovery pattern (config.toml entry + `--no-verify-jwt` deploy) now vindicated twice across distinct EFs.

**Apply summary:** repo patch commit `5037e573881c524dc244664c4a2fc08906c069bc` (`supabase/config.toml`, +5/-2 additive only); ai-worker added at end of custom-header-auth section after `[functions.auto-approver]`; section count comments updated 23→24 / 10→11. Deploy: `supabase functions deploy ai-worker --no-verify-jwt` exit=0 at `2026-05-09T04:23:27Z`. Result file commit `411b85ee0b8c8cd716af2c3226d6af423f563591` (blob `b21be653`, 11,401 B). EF source bytes unchanged across deploy boundary (Class A-LE; deploy=repo=2.12.0 since 2026-05-08 03:24Z); single semantic change was gateway `verify_jwt: true → false`. Hypothesis empirically confirmed.

**Latent risk for publisher (jobid 7) — NOT closed by cc-0007:** publisher block remains ABSENT from `supabase/config.toml`. Carried as v2.58 P3 follow-up: doc-only patch adding `[functions.publisher] verify_jwt = false` (no deploy required). PK directs scheduling. **v2.59 update: still carried as P3 (no implicit closure).**

**HTTP 401 5-min cron triage candidate (carried from v2.57): CLOSED.** Folded into cc-0007 closure; jobid 5 was the source.

**Brief-runner-v0 lessons:** L22 (`ef_deploy` D-01 action_type) VINDICATED. L23 (repo+deploy coordination) LOGGED (rollback shape prepared but not exercised). L24 (P1 recovery timing) LOGGED (~1h55m brief→closure). L25 (security hygiene in result files) VINDICATED.

---

## 🟡 Next session priorities (rebuilt v2.59)

1. **Platform Reconciliation View** — **PROMOTED to next major planning/work item per PK directive** (recorded at commit `a8a241d1`). All three prior blockers cleared: cc-0007 (v2.58), cc-0005 M8a (v2.59), urgent pipeline-integrity closure (v2.59). Brief authoring (chat) when scheduled. Implementation gates remaining: Phase 0 confirmation defaults; architecture review §10 extension scope; manual override design; API ingestion priority order. 13 seed manual observations from 2026-05-09 in `docs/00_action_list.md`.
2. **Dashboard Architecture Review Phase 0 prerequisites** (P1 TOP) — unchanged from v2.55/v2.56/v2.57/v2.58. PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M5–M8 reconciliation status: **M6 Phase A + B both CLOSED v2.55/v2.56; M8a CLOSED v2.59; M7 doc-only fold complete; M8b deferred (gated on manual caller remediation, not blocking new work).**
3. **AI cost view P3** (quick win, ~1h) — unchanged. Author `vw_ai_cost_monthly` view DDL on `m.ai_job` + add NOW dashboard tile.
4. **Publisher latent config risk follow-up** (P3 quick win, ~5 min) — unchanged from v2.58. Doc-only patch adding `[functions.publisher] verify_jwt = false` to `supabase/config.toml`. No deploy required.
5. **Personal businesses check-in** — standing P0. Crazy Domains refund status + any new items from Care for Welfare / Property Buyers Agent / NDIS Accessories.

Carries (lower priority):
- **F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN, carry from v2.57 unchanged)** — cc-0006 deliberately preserved job 58's inline `x-auto-approver-key` value. Rotation requires PK auth + vault entry creation + cron command refactor (separate cc-NNNN brief).
- **M8b separate brief** — NOT YET AUTHORED. Reserved as separate cc-NNNN brief. Sequencing gate: BOTH manual callers (`public.draft_approve_and_enqueue` + `public.draft_approve_and_enqueue_scheduled`) must first be remediated. Once remediated AND V10' returns 0 callers, M8b applies the rename.
- **94-row un-publishable legacy draft cohort cleanup** — separate follow-up brief if PK directs. Out of M8a/M8b scope.
- F-YT-PUB-AVATAR-EXCLUSION (P3, latent)
- F-PUB-009 V3-V5 + 7-day flow (P2, passive monitoring)
- F-AAP-NEEDS-REVIEW-BACKLOG (P2)
- F-AI-WORKER-PARSER-SKIP-BUG V4 (P2, passive)
- morning-inbox-sweep-v1 brief amendment (P3)
- Vault `service_role_key` naming hygiene (P3)
- `docs/audit/health/2026-05-06.md` follow-up (P3)
- Dashboard mobile responsiveness (P3)
- 5 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 D-01 fires)
- Dashboard roadmap PHASES reconciliation (P3, **15th** consecutive deferral, was 14th in v2.58)
- `00_overview.md` 11-section table reconciliation (P3)
- Invegent IG cap-throttle planning (P3)
- CFW post-ai-worker dead drafts (P3) — v2.58 noted to observe self-resolution after cc-0007 recovery; carry for one more cycle if pattern persists.
- 4× F-CRON-*-STALE (P2): F-CRON-COMPLIANCE-MONITOR-STALE, F-CRON-INGEST-STALE, F-CRON-PIPELINE-AI-SUMMARY-STALE, F-CRON-PIPELINE-DOCTOR-STALE.
- Music library activation checklist (PK action) + Emergency redeploy governance question (PK decision) — carried from v2.54.
- v2.56 P3 backlog observation (LinkedIn queue row `1a21199e-...` with `draft.approval_status='draft'`).

---

## ⛔ Carried-forward "do not touch" state

Unchanged from v2.58 except for v2.59 closure deltas.

**v2.59 update on standing items:**

- **M8 Path A (cc-0005 v4 / M8a): CLOSED.** Result commit `eb820bae`. 344 rows dead-lettered; cron 48 rewritten in place; `active=true` and schedule preserved; legacy fallback removed from COALESCE; autonomous enqueue path preserved. V1–V10' all PASS. No rollback. **Component 3 deferred to M8b**; `public.get_next_scheduled_for` NOT renamed; manual callers NOT modified.
- **M8b separate brief: NOT YET AUTHORED.** Reserved as separate cc-NNNN brief. Sequencing gate: BOTH manual callers must first be remediated. Not blocking new work.
- **94-row un-publishable legacy draft cohort: still recorded as separate follow-up.** Drafts: `pd.slot_id IS NULL AND pd.scheduled_for IS NULL AND pd.created_by='seed_and_enqueue' AND pd.approval_status IN ('approved','scheduled')`. Currently 94 rows; oldest 2026-04-17, newest 2026-04-25. Post-M8a these will silently never publish (cron 48's WHERE filter drops them). Resolution candidates documented in cc-0005 v4 brief §Separate follow-up section: (a) bulk dead-letter, (b) per-draft triage, (c) retroactive scheduling, (d) leave indefinitely.
- **Urgent pipeline-integrity block: EFFECTIVELY COMPLETE.** All sequencing blockers cleared (cc-0007 v2.58, cc-0005 M8a v2.59).
- **Platform Reconciliation View brief candidate: PROMOTED.** Becomes next major planning/work item per PK directive. Implementation gates documented above.
- **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT: still CLOSED.** v2.58 closure unchanged.
- **Publisher latent config risk: OPEN as P3 follow-up.** Unchanged from v2.58.
- **F-CRON-AUTO-APPROVER-SECRET-INLINE: still OPEN.** cc-0006 deliberately preserved job 58 inline secret. Rotation requires PK auth.
- **F-CRON-PG-NET-TIMEOUT-5S: still CLOSED.** v2.57 closure unchanged.
- **M7 closure** — doc-only fold complete with M8a 4-way sync per reconciliation §6 Q2.
- **T-MCP-02 quota:** cumulative +1 v2.59 for cc-0005 v4 D-01 fire. **5 close-the-loop UPDATEs pending** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4); deferred per PK "no Supabase writes" scope across v2.55–v2.59.
- Cron-backed drift logging is LIVE (jobid 80 + 81 active=true). No drift fires this cycle.
- Standing don't-redeploy three (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — list unchanged.
- Dashboard roadmap PHASES array stale since 3 May — **15th** consecutive deferral.
- M-series total dead-letter rows cleared since 8 May 2026: 9 (M6 Phase A) + 43 (M6 Phase B) + 344 (M8a) = **396 rows**.
- cc-0003 / cc-0004 / cc-0005 / cc-0006 / cc-0007 briefs and result files — untouched by this turn.
- Memory `recent_updates` v2.55 + v2.56 + v2.57 + v2.58 + v2.59 entries **deferred** per PK explicit scope.
- Platform Reconciliation View brief candidate (added inline post-v2.57 commit `a8a241d1`) sequencing: **all three blockers cleared as of v2.59; PROMOTED to next major planning/work item.**

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (oldest of the prior 1–2 inlined sessions drops out)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** **v2.59 status:** ~30KB after this update (was ~29KB at v2.58; v2.59 inline replaces v2.57 inline). Archive sweep **OVERDUE** since the 16KB threshold was crossed at v2.54 close. Sweep will require relocating older inlined sessions into a v2.50+ archive bucket; deferred to a separate cycle.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-09 Sydney — v2.59: **M8a Path A APPLIED and CLOSED via cc-0005 v4** by CC. Single-transaction `apply_migration` (`m8a_cron48_rewrite_and_legacy_cleanup_v1`); 344 legacy-origin future queue rows dead-lettered with `dead_reason='m8_cutover_legacy_path_deprecated'`. Cron 48 rewritten in place (`active=true`, schedule `*/5 * * * *`, jobname all preserved); legacy `public.get_next_scheduled_for(...)` fallback removed from COALESCE chain; autonomous slot-driven enqueue path preserved. cron 48 command_md5 `5113bc4...` → `57bbafb...` (+149 bytes). V1–V10' all PASS. No rollback. **Component 3 (function rename + COMMENT) DEFERRED to M8b** per v4 design; `public.get_next_scheduled_for` NOT renamed; manual callers `public.draft_approve_and_enqueue` + `public.draft_approve_and_enqueue_scheduled` NOT modified. V10' delta-framed verification confirmed exactly 2 manual callers post-apply (cron 48 dropped from caller list as intended). Result file commit `eb820bae6951b66bfd1dd9a61e3e0cb235d5d8ad` (blob `ebd2fb05`, 16,052 B). **Urgent pipeline-integrity block now effectively complete.** Brief-runner-v0 L19–L21 VINDICATED (CC pre-flight HALT pattern; in-place patch vs scope-reduce vs new brief; scope re-banding); L11+L16+L17+L18 vindicated again. M-series total dead-letter rows since 8 May: 9 + 43 + 344 = 396. T-MCP-02 +1 (cc-0005 v4 D-01); cumulative pending close-the-loops now 5. State-capture exceptions v2.59: 0. P0+P1 open: ~2 → ~2 (cc-0005 v4 / M8a was P3 scheduling; pipeline-integrity block effectively complete). PHASES reconciliation now **15th** carry. **Per PK directive: Platform Reconciliation View becomes the next major planning/work item after this sync close.** Carry: M8b separate brief (NOT YET AUTHORED; gated on manual caller remediation), 94-row un-publishable legacy draft cohort follow-up, publisher latent config risk follow-up, F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN unchanged), 5 outstanding `m.chatgpt_review` close-the-loop UPDATEs. Previous (v2.58): F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT CLOSED via cc-0007 APPLIED.*
