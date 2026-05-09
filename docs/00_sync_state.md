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
| 2026-05-09 | cc-0007-applied-ai-worker-401-recovered | **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT CLOSED / RECOVERED via cc-0007 APPLIED (v2.58).** Repo patch (`supabase/config.toml` `[functions.ai-worker] verify_jwt = false`, commit `5037e573`) + EF deploy (`supabase functions deploy ai-worker --no-verify-jwt`, exit=0 at 04:23:27Z) by CC. **First `ef_deploy` D-01 action_type in cc-NNNN series.** Recovery confirmed at first post-deploy cron 5 fire 04:25:00Z (~93 s after DEPLOY_TIMESTAMP); status_code=200; pattern transition unambiguous: 22+ × 401 pre-deploy → 200 immediately post-deploy. V1–V4 all PASS at first fire. No rollback. Class match to v2.54 video-worker regression (commit `6ed29bbc`); 2-step recovery pattern (config.toml entry + `--no-verify-jwt` deploy) now vindicated twice across distinct EFs. Result file commit `411b85ee0b8c8cd716af2c3226d6af423f563591` (blob `b21be653`, 11,401 B). Hypothesis empirically confirmed: ai-worker EF gateway had `verify_jwt: true` (CLI default for EFs absent from `supabase/config.toml`); cron 5's `Authorization: Bearer <publishable_key>` header was not a parseable JWT; gateway 401'd before function runs. EF source bytes unchanged across deploy boundary (Class A-LE; deploy=repo=2.12.0 since 2026-05-08 03:24Z). **Latent risk noted (NOT closed by cc-0007): publisher block remains ABSENT from `supabase/config.toml`; defensive patch held back per §1.4 strict rule + D-01 conditions; carried as v2.58 P3 follow-up.** HTTP 401 5-min cron triage candidate from v2.57 CLOSED (jobid 5 was the source). Brief-runner-v0 L22–L25 vindicated (`ef_deploy` action_type, repo+deploy coordination, P1 recovery timing, security hygiene in result files); L23 logged but rollback path not exercised. P0+P1 open: ~3 → ~2. PHASES reconciliation now **14th** carry. **cc-0005 M8a is the next pipeline-integrity apply candidate per PK directive.** | `docs/runtime/sessions/2026-05-09-cc-0007-applied-ai-worker-401-recovered.md` |
| 2026-05-09 | cc-0006-closed-cc-0005-v3-patched | **F-CRON-PG-NET-TIMEOUT-5S CLOSED via cc-0006 APPLIED + cc-0005 / M8 Path A v3 PATCHED (v2.57).** Combined doc-only close. cc-0006 (`cron_pg_net_timeout_30s_v1`) APPLIED by CC via Supabase MCP `execute_sql` wrapping 3 `cron.alter_job(...)` in single transaction; jobs 33/44/58 each patched with `timeout_milliseconds := 30000` (35-byte command growth, byte-for-byte URL/headers/schedule preservation, job 58 inline secret preserved character-for-character). V1+V2+V3 PASS strictly; V4 PASS for load-bearing "no regression in `timed_out`" (3 pre-existing background HTTP 401s on `*/5` schedule, stable across apply boundary). No rollback. Result file commit `c72bc327`. First `cron_edit` D-01 action_type. **F-CRON-AUTO-APPROVER-SECRET-INLINE remains separately OPEN (P2 sec) — cc-0006 deliberately preserved job 58's inline `x-auto-approver-key`.** **HTTP 401 5-min cron pattern surfaced as NEW v2.57 triage candidate** — likely jobid 48 or another `*/5` cron whose endpoint returns 401; out-of-scope for cc-0006; not a regression. **cc-0005 / M8 Path A v3 PATCHED** chat-side under PK direction (commit `245005a3`); supersedes v2 Path A (`f70cb41f`) which had 5 critical regex bugs. v3 fixes: function-call-syntax regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` at all 11 call sites; comment rephrase; H1–H6 extended pre-flight; M1–M4 hygiene; L1–L2. Brief-runner-v0 L10–L18 captured. T-MCP-02 +1 (cc-0006 D-01); cumulative pending close-the-loops 3. State-capture exceptions v2.57: 0. P0+P1 open: ~2 (cc-0006 was P2). PHASES reconciliation 13th carry. | `docs/runtime/sessions/2026-05-09-cc-0006-closed-cc-0005-v3-patched.md` |
| 2026-05-09 | cc-0004-applied-m6-phase-b-closed | **M6 Phase B CLOSED via cc-0004 APPLIED (v2.56).** 43 rows dead-lettered across 7 (client, platform) partitions; both cc-0003 v1 HALT slot-bound CFW IG rows captured. All V1–V6 PASS. No rollback. Result file commit `9d5bdd37`. **M6 dead-letter cycle now functionally complete: 9 (Phase A) + 43 (Phase B) = 52 residual rows cleared.** Schedule deltas -1d to +21d confirm pre-M4 residue. P3.3 outlier: 1 LinkedIn queue row with `pd.approval_status='draft'` dead-lettered (D-01 reviewer cleared). Brief-runner-v0 L6 validated end-to-end. New L7–L9 candidates logged. T-MCP-02 +1. P0+P1 open: ~3 → ~2. PHASES reconciliation 12th carry. | `docs/runtime/sessions/2026-05-09-cc-0004-applied-m6-phase-b-closed.md` |
| 2026-05-09 | cc-0003-v2-applied-m6-phase-a-closed | **M6 Phase A CLOSED via cc-0003 v2 APPLIED (v2.55).** Brief-runner-v0 HALT-then-correction loop completed end-to-end across 8–9 May. 9 rows dead-lettered, V1–V6 all PASS, no rollback. cc-0003 v2 commit `d60dcfbc`. 6 brief-runner-v0 lessons captured (L1–L6). T-MCP-02 +1. P0+P1 open: ~4 → ~3. PHASES reconciliation 11th carry. | `docs/runtime/sessions/2026-05-09-cc-0003-v2-applied-m6-phase-a-closed.md` |
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

### 2026-05-09 Sydney — cc-0007 APPLIED (F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT RECOVERED) (v2.58)

**Outcome:** **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1) CLOSED / RECOVERED.** cc-0007 APPLIED via repo patch + EF deploy by CC. Recovery confirmed at first post-deploy cron 5 fire (04:25:00 UTC, ~93 s after `DEPLOY_TIMESTAMP` 04:23:27 UTC). V1–V4 all PASS. No rollback. **First `ef_deploy` D-01 action_type in cc-NNNN series.** Class match to v2.54 video-worker regression (commit `6ed29bbc`); 2-step recovery pattern (config.toml entry + `--no-verify-jwt` deploy) now vindicated twice across distinct EFs.

**Apply summary:** repo patch commit `5037e573881c524dc244664c4a2fc08906c069bc` (`supabase/config.toml`, +5/-2 additive only); ai-worker added at end of custom-header-auth section after `[functions.auto-approver]`; section count comments updated 23→24 / 10→11. Deploy: `supabase functions deploy ai-worker --no-verify-jwt` exit=0 at `2026-05-09T04:23:27Z`. Result file commit `411b85ee0b8c8cd716af2c3226d6af423f563591` (blob `b21be653`, 11,401 B). EF source bytes unchanged across deploy boundary (Class A-LE; deploy=repo=2.12.0 since 2026-05-08 03:24Z); single semantic change was gateway `verify_jwt: true → false`. Hypothesis empirically confirmed.

**V1–V4 verification (all PASS at first post-deploy fire; no V1 retry needed):** V1 cron-side runid 173234 status=`succeeded`, return_message=`INSERT 0 1` (no UNAUTHORIZED). V1 HTTP authoritative (`m.worker_http_log ⋈ net._http_response`) http_response_id 101268, status_code=**200**, timed_out=false, error_class=null. V2 `post_deploy_jwt_format_401_count = 0`. V3 covered by V1 HTTP authoritative row. V4 `m.ef_drift_log` 0 unexpected entries in window (drift cron 80 next fires 17:00 UTC; not yet due).

**Pre-flight + final re-verify (no drift between initial §1 capture and ~60 s pre-deploy re-verify):** §1.1 cron 5 active=true + calls_ai_worker=true + command_md5 unchanged (`0f7a9e5d6e3ea11ab38862c09559506b`); strict return_message rule registered as cron blind spot (Note A in pre-flight) — §1.2 authoritative. §1.2: 22 × 401 jwt_format in 6h pre-flight; 24 by re-verify time (FIRST=02:20:00Z, LATEST=04:20:00Z; 100% failure rate of jobid 5 fires since onset). §1.3: `[functions.ai-worker]` block ABSENT in `supabase/config.toml` — hypothesis confirmed. §1.4: publisher block ABSENT; 0 × 401 in 6h on publisher; jobid 7 active — defensive patch NOT bundled per strict rule + D-01 conditions. §1.5: ai-worker EF state aligned with hypothesis.

**D-01 fires this cycle (chat side):** 1 fire (cc-0007 D-01 review by chat). Verdict `agree / proceed`, ai-worker-only scope, normal controls. PK approval phrase: `"pk proceed with cc-0007 apply ai-worker only"`. **First `ef_deploy` action_type in cc-NNNN series.** Conditions all met (re-run final verify; halt criteria not triggered; patch only `supabase/config.toml`; commit; deploy ai-worker `--no-verify-jwt` only; run V1–V4; redact bearer tokens / keys from result file; rollback only if verification fails). v2.58 4-way sync close commit (this) is doc-only and per protocol does NOT require a fire.

**Brief-runner-v0 lessons — cc-0007 cycle:**

- **L22 (`ef_deploy` D-01 action_type)** — VINDICATED. Reviewer applied appropriate standards; clean PASS / agree / proceed / 0 pushback / 0 escalation.
- **L23 (repo + deploy coordination rollback shape)** — LOGGED. cc-0007 was first apply with TWO production-touching steps; both succeeded; rollback shape prepared but not exercised.
- **L24 (P1 recovery timing)** — LOGGED. Wall-clock ~1h55m brief→closure including D-01 + final re-verify + repo patch + deploy + V1–V4 + result file authoring. P1 cost-of-waiting honoured without expediting D-01 protocol.
- **L25 (security hygiene in result files)** — VINDICATED. Bearer tokens / vault values successfully redacted from result file; only structural references appear.

**Brief-runner-v0 observations from CC apply session (§9 of result file; logged for future briefs):** cron blind spot for HTTP failures (`return_message` reflects last SQL statement, not gateway HTTP body); §1.2 threshold not regression-onset-aware; §1.5 first-failed-cron-fire query relies on same blind spot; `m.ef_drift_log` column-name mismatch (brief used `ef_slug` / `created_at`; actual schema is `slug` / `checked_at`).

**Latent risk for publisher (jobid 7) — NOT closed by cc-0007:** publisher block remains ABSENT from `supabase/config.toml`. Currently 0 × 401 (publisher's gateway is presumably already at `verify_jwt: false` from a prior dashboard-set or prior `--no-verify-jwt` deploy), but the next publisher deploy without the flag AND without a config.toml entry would regress identically. **Carried as v2.58 P3 follow-up: doc-only patch adding `[functions.publisher] verify_jwt = false` to `supabase/config.toml` (no deploy required).** PK directs scheduling.

**HTTP 401 5-min cron triage candidate (carried from v2.57): CLOSED.** Folded into cc-0007 closure; jobid 5 was the source. cc-0006 V4's earlier hypothesis ("likely jobid 48") corrected by CC's read-only triage 2026-05-09 (jobid 48's command body is pure PostgreSQL and cannot 401 against an EF gateway).

**cc-0005 M8a sequencing implications (next pipeline-integrity apply candidate per PK directive):** ai-worker is now generating drafts; m.ai_job rows are being processed; cron 48 has fresh succeeded ai_jobs to enqueue from. cc-0005 M8a v4 (commit `577d8568`) is the next P3 apply candidate. Apply gates remaining: §1.0 sequencing ✅ met v2.55/v2.56; §1.4 expected 3 callers; §1.3 cron state; §1.5a band [250, 500]; §1.5d alignment count = 0; D-01 fire; PK explicit approval phrase.

**Constraints respected this turn:** No Supabase writes. No D-01 fire. No cron edits. No EF deploys. No code changes. No Phase 0 scheduling. No M8 apply work. Single doc-only commit covering 3 files. cc-0003 / cc-0004 / cc-0005 / cc-0006 / cc-0007 briefs and result files **untouched**.

**Closed v2.58:** F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1) — cc-0007 result commit `411b85ee`.

**Open / deferred this turn (carried per PK explicit scope):** 4 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 D-01 fires) deferred per PK "no Supabase writes" scope; memory `recent_updates` v2.55+v2.56+v2.57+v2.58 entries chat-owned at next opportunity; dashboard PHASES reconciliation **14th** consecutive deferral; cc-0005 M8a v4 apply work awaiting PK direction; M8b brief authoring deferred until M8a closes; 94-row un-publishable legacy draft cohort cleanup separate follow-up if PK directs; Phase 0 scheduling still NOT scheduled; Publisher latent config risk follow-up (P3); Platform Reconciliation View brief candidate still queued behind cc-0005 M8a + pipeline-integrity closure.

---

### 2026-05-09 Sydney — cc-0006 CLOSED + cc-0005 v3 PATCHED (v2.57)

**Outcome:** Combined doc-only v2.57 close covering two prior cycles. **(1) F-CRON-PG-NET-TIMEOUT-5S CLOSED.** cc-0006 APPLIED via Supabase MCP `execute_sql` by CC (single transaction wrapping three `cron.alter_job(...)` statements). Jobs 33 (`video-worker-every-30min`), 44 (`heygen-worker-every-30min`), 58 (`auto-approver-sweep`) each patched with `timeout_milliseconds := 30000`. Each command grew by exactly 35 bytes; URLs/headers/body/schedule/active flag byte-for-byte preserved per job; job 58's inline `x-auto-approver-key` value preserved character-for-character. V1+V2+V3 PASS strictly. V4 PASS for load-bearing "no regression in `timed_out`" criterion (3 pre-existing background HTTP 401s on a `*/5` schedule, stable across apply boundary). No rollback. Result file commit `c72bc3276b7575c0c920b75c76ead396dbaa6a95` (blob `9613c133`, size 11,188 B). First `cron_edit` D-01 action_type in cc-NNNN series. **(2) cc-0005 / M8 Path A v3 PATCHED** chat-side under PK direction. v3 supersedes v2 Path A (`f70cb41f`) which had 5 critical regex bugs that would have blocked first apply at the in-migration verify gates (substring matches against `get_next_scheduled_for` would have matched comment text in the rewritten cron 48 body, fired RAISE EXCEPTION, rolled back the transaction). v3 fixes: function-call-syntax regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` at all 11 call sites; comment rephrase to "legacy fallback removed from COALESCE chain."; H1–H6 extended pre-flight; M1–M4 hygiene; L1–L2 defensive. v3 commit `245005a3c86dc23cac8bd6cae41fea5fd135e5f9` (blob `2284ef2d`, size 75,985 B).

**Inline post-v2.57 (between v2.57 and v2.58 closes; doc-only chat work):** cc-0005 v4 patch (commit `577d8568`, M8 staged → M8a only after CC's v3 pre-flight HALT surfaced 2 non-cron manual callers; Component 3 deferred to M8b separate brief; cleanup band re-banded to [250, 500] around CC's pre-flight observation of 344). cc-0007 P1 recovery brief draft (commit `7c45a927`, F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT, ai-worker `verify_jwt` regression class match to v2.54 video-worker). Platform Reconciliation View brief candidate (commit `a8a241d1`, pipeline observability / reconciliation class with 13 seed manual observations 2026-05-09; queued behind cc-0007 + cc-0005 M8a + pipeline-integrity closure).

**Triage candidate surfaced (NEW v2.57): HTTP 401 5-min cron pattern.** During cc-0006 V4, 3 HTTP 401 responses were observed in the 30-min `_http_response` window at 02:20, 02:25, 02:35 UTC. **Resolution v2.58: jobid 5 (`ai-worker-every-5m`) confirmed as source (NOT jobid 48); cc-0007 brief authored + applied; finding closed.**

**D-01 fires this cycle (chat side):** 1 fire (cc-0006 D-01 review, prior cycle by chat).

**Brief-runner-v0 lessons — cc-0006 + cc-0005 v3 cycles:** L10–L18 captured (cron_edit action_type, md5 fingerprint, substrate-drift guard, V3 immediate eval, V4 strict-vs-load-bearing, chat review pass before apply, function-call regex, in-place patching, pre-flight cohort surfacing). v2.58 update: **L10 vindicated again** (cc-0007 second apply for `ef_deploy` cousin to `cron_edit`); **L17 vindicated again** (cc-0005 v4 in-place supersedes v3 since v3 was never applied).

---

## 🟡 Next session priorities (rebuilt v2.58)

1. **Dashboard Architecture Review Phase 0 prerequisites** (P1 TOP) — unchanged from v2.55/v2.56/v2.57. PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M5–M8 reconciliation: M6 Phase A + B both **CLOSED v2.55/v2.56**; M7 (doc-only) + M8 (cc-0005 v4 patched, awaiting apply) still pending.
2. **AI cost view P3** (quick win, ~1h) — unchanged. Author `vw_ai_cost_monthly` view DDL on `m.ai_job` + add NOW dashboard tile.
3. **cc-0005 / M8 Path A v4 — APPLY scheduling** — **REPHRASED v2.58.** Brief patched to v4 inline post-v2.57 (commit `577d8568`); M8 staged → M8a only; Component 3 deferred to M8b separate brief. **cc-0007 closure clears the P1 ai-worker block; cc-0005 M8a is now the next pipeline-integrity apply candidate per PK directive.** Apply gates remaining: §1.0 sequencing ✅ met v2.55/v2.56; §1.4 expected 3 callers + §1.3 cron state + §1.5a band [250, 500] + §1.5d alignment count = 0 + D-01 fire (`sql_destructive` action_type for migration) + PK explicit approval phrase.
4. **Publisher latent config risk follow-up** — **NEW v2.58.** Doc-only patch adding `[functions.publisher] verify_jwt = false` to `supabase/config.toml`. No deploy required (publisher currently working). Removes regression risk for next publisher deploy. P3 quick win.
5. **Personal businesses check-in** — standing P0. Crazy Domains refund status + any new items from Care for Welfare / Property Buyers Agent / NDIS Accessories.

Carries (lower priority):
- **F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN)** — cc-0006 deliberately preserved job 58's inline `x-auto-approver-key` value. Rotation requires PK auth + vault entry creation + cron command refactor (separate cc-NNNN brief).
- **Platform Reconciliation View brief candidate (P2)** — added inline post-v2.57 (commit `a8a241d1`); pipeline observability / reconciliation class. **Sequencing per PK directive: queued behind cc-0005 M8a + pipeline-integrity closure** (cc-0007 closure satisfies the first blocker; cc-0005 M8a is the second).
- **M8b brief authoring** — separate cc-NNNN brief reserved for after M8a closes. Manual caller remediation + function rename + COMMENT.
- **94-row un-publishable legacy draft cohort cleanup** — separate follow-up brief if PK directs.
- F-YT-PUB-AVATAR-EXCLUSION (P3, latent)
- F-PUB-009 V3-V5 + 7-day flow (P2, passive monitoring)
- F-AAP-NEEDS-REVIEW-BACKLOG (P2)
- F-AI-WORKER-PARSER-SKIP-BUG V4 (P2, passive)
- morning-inbox-sweep-v1 brief amendment (P3)
- Vault `service_role_key` naming hygiene (P3)
- `docs/audit/health/2026-05-06.md` follow-up (P3)
- Dashboard mobile responsiveness (P3)
- 4 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 D-01 fires)
- Dashboard roadmap PHASES reconciliation (P3, **14th** consecutive deferral, was 13th in v2.57)
- `00_overview.md` 11-section table reconciliation (P3)
- Invegent IG cap-throttle planning (P3)
- CFW post-ai-worker dead drafts (P3)
- 4× F-CRON-*-STALE (P2): F-CRON-COMPLIANCE-MONITOR-STALE, F-CRON-INGEST-STALE, F-CRON-PIPELINE-AI-SUMMARY-STALE, F-CRON-PIPELINE-DOCTOR-STALE.
- Music library activation checklist (PK action) + Emergency redeploy governance question (PK decision) — carried from v2.54.
- v2.56 P3 backlog observation (LinkedIn queue row `1a21199e-...` with `draft.approval_status='draft'`).

---

## ⛔ Carried-forward "do not touch" state

Unchanged from v2.57 except for v2.58 closure deltas.

**v2.58 update on standing items:**

- **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT: CLOSED / RECOVERED.** cc-0007 result commit `411b85ee`. ai-worker EF `verify_jwt: true → false` via repo patch + redeploy. V1–V4 PASS at first post-deploy fire. No rollback.
- **Publisher latent config risk: OPEN as P3 follow-up.** `[functions.publisher]` block remains ABSENT from `supabase/config.toml`. Doc-only patch follow-up scheduled (no deploy required).
- **HTTP 401 5-min cron triage candidate: CLOSED.** Folded into cc-0007 closure (jobid 5 was the source).
- **cc-0005 / M8 Path A: v4 PATCHED, NOT APPLIED.** Commit `577d8568` (inline post-v2.57). v3 (`245005a3`) superseded by v4 due to scope reduction (Component 3 deferred to M8b after CC v3 pre-flight HALT surfaced 2 non-cron manual callers). Apply gates remaining: §1.0 sequencing ✅ met; §1.4 expected 3 callers + §1.3 cron state + §1.5a band [250, 500] + §1.5d alignment + D-01 + PK approval. **cc-0005 M8a is now the next pipeline-integrity apply candidate per PK directive.**
- **M8b brief: NOT YET AUTHORED.** Reserved as separate cc-NNNN brief for after M8a closes.
- **F-CRON-AUTO-APPROVER-SECRET-INLINE: still OPEN.** cc-0006 deliberately preserved job 58 inline secret. Rotation requires PK auth.
- **F-CRON-PG-NET-TIMEOUT-5S: still CLOSED.** v2.57 closure unchanged.
- **M7 closure** — doc-only; folds into cc-0005 / M8 4-way sync per reconciliation §6 Q2 when M8a lands.
- **T-MCP-02 quota:** cumulative +1 v2.58 for cc-0007 D-01 fire. **4 close-the-loop UPDATEs pending** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007); deferred per PK "no Supabase writes" scope across v2.55/v2.56/v2.57/v2.58.
- Cron-backed drift logging is LIVE (jobid 80 + 81 active=true). No drift fires this cycle.
- Standing don't-redeploy three (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — list unchanged.
- Dashboard roadmap PHASES array stale since 3 May — **14th** consecutive deferral.
- M6 dead-letter cycle complete (Phase A v2.55, Phase B v2.56). 52 residual rows cleared.
- cc-0003 / cc-0004 / cc-0005 / cc-0006 / cc-0007 briefs and result files — untouched by this turn.
- Memory `recent_updates` v2.55 + v2.56 + v2.57 + v2.58 entries **deferred** per PK explicit scope across all four versions.
- Platform Reconciliation View brief candidate (added inline post-v2.57 commit `a8a241d1`) sequencing: cc-0007 closure satisfies first blocker; cc-0005 M8a is the second; pipeline-integrity closure is third.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (oldest of the prior 1–2 inlined sessions drops out)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** **v2.58 status:** ~30KB after this update (was ~26KB at v2.57 close; v2.58 inline replaces v2.56 inline). Archive sweep **OVERDUE** since the 16KB threshold was crossed at v2.54 close. Sweep will require relocating older inlined sessions into a v2.50+ archive bucket; deferred to a separate cycle.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-09 Sydney — v2.58: **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT CLOSED / RECOVERED via cc-0007 APPLIED** by CC. Repo patch (`supabase/config.toml` `[functions.ai-worker] verify_jwt = false`, commit `5037e573`) + EF deploy (`supabase functions deploy ai-worker --no-verify-jwt`, exit=0 at 04:23:27Z). Recovery confirmed at first post-deploy cron 5 fire 04:25:00Z; status_code=200; pattern transition unambiguous (22+ × 401 pre-deploy → 200 immediately post-deploy). V1–V4 all PASS at first fire. No rollback. **First `ef_deploy` D-01 action_type in cc-NNNN series.** Class match to v2.54 video-worker regression. Result file commit `411b85ee` (blob `b21be653`, 11,401 B). HTTP 401 5-min cron triage candidate from v2.57 CLOSED (jobid 5 was the source). Latent risk noted (NOT closed): publisher block remains ABSENT from `supabase/config.toml`; carried as v2.58 P3 follow-up. T-MCP-02 +1 (cc-0007 D-01); cumulative pending close-the-loops now 4. State-capture exceptions v2.58: 0. P0+P1 open: ~3 → ~2. PHASES reconciliation now **14th** carry. **cc-0005 M8a is the next pipeline-integrity apply candidate per PK directive.** Brief-runner-v0 L22–L25 vindicated (`ef_deploy` action_type, repo+deploy coordination, P1 recovery timing, security hygiene in result files); L23 logged but rollback path not exercised. Inline post-v2.57 work (cc-0005 v4 patch commit `577d8568`; cc-0007 brief draft commit `7c45a927`; Platform Reconciliation View brief candidate commit `a8a241d1`) folded into v2.58 close. Previous (v2.57): F-CRON-PG-NET-TIMEOUT-5S CLOSED via cc-0006 APPLIED + cc-0005 / M8 Path A v3 PATCHED.*
