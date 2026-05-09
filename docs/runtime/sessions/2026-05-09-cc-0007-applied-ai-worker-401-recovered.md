# 2026-05-09 Sydney — cc-0007 APPLIED (F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT RECOVERED) (v2.58)

**Outcome:** **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1) CLOSED / RECOVERED.** cc-0007 APPLIED via repo patch + EF deploy by CC. Recovery confirmed at first post-deploy cron 5 fire (04:25:00 UTC, ~93 s after `DEPLOY_TIMESTAMP` 04:23:27 UTC). V1–V4 all PASS. No rollback. **First `ef_deploy` D-01 action_type in cc-NNNN series.** v3 PK directive sequencing now restored: cc-0007 closure clears the P1 ai-worker block; **cc-0005 M8a is the next pipeline-integrity apply candidate**.

**Apply summary:**

| Item | Value |
|---|---|
| Repo patch commit | `5037e573881c524dc244664c4a2fc08906c069bc` |
| Repo file changed | `supabase/config.toml` (single file, +5/-2; additive only) |
| Section structure post-patch | 24 functions total = 11 custom-header + 13 service-role; ai-worker added at end of custom-header section after `[functions.auto-approver]` |
| Section count comments updated | header `23 → 24`; section `Custom-header-auth EFs (10) → (11)` |
| EF deployed | ai-worker only (NOT publisher — defensive scope held per §1.4 strict rule + D-01 conditions) |
| Deploy command | `supabase functions deploy ai-worker --no-verify-jwt` |
| Deploy command exit | 0 (clean) |
| `DEPLOY_TIMESTAMP` | `2026-05-09T04:23:27Z` |
| First post-deploy cron 5 fire | `2026-05-09T04:25:00Z` (~93 s after DEPLOY_TIMESTAMP) |
| First post-deploy cron 5 outcome | `status_code=200`, `error_class=null` |
| Rollback fired | NO |
| `cc-0007` brief §6 path triggered | NONE (clean recovery) |
| Result file commit | `411b85ee0b8c8cd716af2c3226d6af423f563591` (blob `b21be653`, 11,401 B) |
| EF source bytes changed across deploy boundary | NONE (Class A-LE; deploy=repo=2.12.0 since 2026-05-08 03:24Z) |

**The single semantic change between 22+ × 401 pre-deploy and 200 immediately post-deploy was the gateway flag flip (`verify_jwt: true → false`).** EF source bytes unchanged. Rules out alternate hypotheses (token expiry, code-level auth bug). Hypothesis empirically confirmed; `INVALID_JWT_FORMAT` reading aligns with the literal 401 body content.

**Class match validation:** identical recovery vector to v2.54 video-worker regression (commit `6ed29bbc`). 2-step pattern (config.toml entry + `--no-verify-jwt` deploy) now vindicated twice across two distinct EFs. Pattern is durable.

**V1–V4 verification (all PASS at first post-deploy fire; no V1 retry needed):**

| V | Source | Expected | Actual | Status |
|---|---|---|---|---|
| V1 (cron-side) | `cron.job_run_details` | ≥1 row `succeeded` AND `return_message` lacks `UNAUTHORIZED` | runid 173234, 04:25:00.491Z, status=`succeeded`, return_message=`INSERT 0 1` | PASS |
| V1 (HTTP authoritative) | `m.worker_http_log ⋈ net._http_response` | `status_code=200`, no error_class | http_response_id 101268 at 04:25:00.491Z, status_code=**200**, timed_out=false, error_class=null | PASS |
| V2 | `net._http_response` post-deploy | 0 rows with 401 + `UNAUTHORIZED_INVALID_JWT_FORMAT` | **0** | PASS |
| V3 | `m.worker_http_log ⋈ net._http_response` for `worker='ai-worker'` post-deploy | ≥1 row status_code=200 | covered by V1 HTTP authoritative row | PASS |
| V4 | `m.ef_drift_log` post-deploy window | 0 unexpected drift fires (drift cron 80 next fires 17:00 UTC; not yet due) | 0 rows in window | PASS |

**Pre-flight + final re-verify (no drift between initial §1 capture and ~60 s pre-deploy re-verify):**

| Check | Initial | Re-verify | Status |
|---|---|---|---|
| §1.1 cron 5 active + calls ai-worker | active=true, calls_ai_worker=true, command_md5=`0f7a9e5d6e3ea11ab38862c09559506b` | identical (no concurrent edit) | PASS |
| §1.1 strict return_message rule | 0% (cron blind spot — `return_message` is `INSERT 0 1` from chained worker_http_log write, never the gateway 401 body) | identical | brief gap noted (Note A in pre-flight); §1.2 authoritative |
| §1.2 401 jwt_format count last 6h on jobid 5 | 22 (FIRST=02:20:00Z, LATEST=04:10:00Z; 100% failure rate of jobid 5 fires since onset) | 24 by re-verify time (04:15+04:20 added) | PASS qualitatively |
| §1.3 `[functions.ai-worker]` block in `supabase/config.toml` | ABSENT | ABSENT | PASS (hypothesis confirmed) |
| §1.4 publisher block / 401 count | block ABSENT; 0 × 401 in 6h on publisher; jobid 7 active | (not re-verified — not in scope) | defensive patch NOT bundled per §1.4 strict rule + D-01 conditions |
| §1.5 ai-worker EF state | A-LE deploy=repo=2.12.0 since 2026-05-08 03:24Z; CLI list version 101 last 2026-05-08 03:22:10Z; `m.ef_drift_log` slug=`ai-worker` no recent rows | (no drift scan since 2026-05-08 17:00 UTC; next 17:00 UTC today) | PASS (hypothesis aligns) |

**D-01 fires this cycle:** 1 fire (cc-0007 D-01 review by chat). Verdict `agree / proceed`, ai-worker-only scope, normal controls. PK approval phrase: `"pk proceed with cc-0007 apply ai-worker only"`. **First `ef_deploy` action_type in cc-NNNN series.** Reviewer applied same standards as `sql_destructive` (production state change with rollback path) per L22 v4 lesson candidate. Conditions all met (re-run final verify; halt criteria not triggered; patch only `supabase/config.toml`; commit; deploy ai-worker `--no-verify-jwt` only; run V1–V4; redact bearer tokens / keys from result file; rollback only if verification fails).

v2.58 4-way sync close commit (this) is doc-only and per protocol does NOT require a fire.

**Brief-runner-v0 lessons — cc-0007 cycle:**

- **L22 (`ef_deploy` D-01 action_type)** — VINDICATED. Reviewer applied appropriate standards; clean PASS / agree / proceed / 0 pushback / 0 escalation. Promotion to baseline candidate.
- **L23 (repo + deploy coordination rollback shape)** — LOGGED. cc-0007 was first apply with TWO production-touching steps: (a) `git push` of `supabase/config.toml`, (b) `supabase functions deploy`. Both succeeded; rollback shape (git revert + redeploy without flag) was prepared but not exercised. Pattern is durable but not yet vindicated through actual rollback.
- **L24 (P1 recovery timing)** — LOGGED. cc-0007 cycle: brief authored 03:50:45Z; result committed 05:45:30Z. Wall-clock ~1h55m brief→closure including D-01 fire + final re-verify + repo patch + deploy + V1–V4 + result file authoring. P1 cost-of-waiting honoured without expediting D-01 protocol.
- **L25 (security hygiene in result files)** — VINDICATED. Bearer tokens / vault values successfully redacted from result file; only structural references (`vault.decrypted_secrets WHERE name='publishable_key'`) appear. Pattern is now standard for any brief touching authentication-related cron commands.

**Brief-runner-v0 observations from CC apply session (logged in result file §9 for future briefs):**

- **Cron blind spot for HTTP failures.** §1.1 strict decision rule ("return_message contains 401 evidence in ≥80% of last 20 fires") is structurally inappropriate for HTTP-failure regression classes. `cron.job_run_details.return_message` reflects the LAST SQL statement executed inside the DO block (typically `INSERT 0 1` from the chained `m.worker_http_log` write), not the `net.http_post` HTTP response. Future briefs targeting cron-driven HTTP regressions should rely on `m.worker_http_log ⋈ net._http_response` joins instead.
- **§1.2 threshold not regression-onset-aware.** `>50 rows in 6h` does not parameterise for regression freshness. A regression-onset-aware threshold (e.g. ">80% failure rate over the last 6 fires") would generalise better.
- **§1.5 first-failed-cron-fire query relies on the same cron blind spot.** `cron.job_run_details.status='failed'` never fires on HTTP-only failures. `_http_response.created` of first 401 is the actual signal.
- **`m.ef_drift_log` column-name mismatch.** Brief used `ef_slug` / `created_at`; actual schema is `slug` / `checked_at`. Trivial adapt at apply time but worth fixing in brief-template work.

**Latent risk for publisher (jobid 7) — NOT closed by cc-0007:** publisher block remains ABSENT from `supabase/config.toml`. Currently 0 × 401 (publisher's gateway is presumably already at `verify_jwt: false` from a prior dashboard-set or prior `--no-verify-jwt` deploy), but the next publisher deploy without the flag AND without a config.toml entry would regress identically. cc-0007 §1.4 surfaced this; defensive patch was held back per strict rule + D-01 conditions. **Carried as v2.58 P3 follow-up: doc-only patch adding `[functions.publisher] verify_jwt = false` to `supabase/config.toml` (no deploy required since publisher is currently working).** PK directs scheduling.

**Hypothesis-vs-evidence (recap from result file §6):** the pre-flight hypothesis was: ai-worker EF gateway has `verify_jwt: true` (CLI default for EFs absent from `supabase/config.toml`); cron 5's `Authorization: Bearer <publishable_key>` header is not a parseable JWT; gateway 401s before function runs. **Hypothesis confirmed empirically.** The `weak evidence` line about "alternate hypothesis: token IS a JWT but expired" is now retired — the empirical 401 body content (`UNAUTHORIZED_INVALID_JWT_FORMAT`) supports the format-not-format reading primarily.

**cc-0005 M8a sequencing implications (next pipeline-integrity apply candidate, per PK directive):**

- ai-worker is now generating drafts and writing successful AI completions. Upstream pipeline is no longer starved.
- m.ai_job rows are being processed; cron 48 has fresh succeeded ai_jobs to enqueue from.
- cc-0005 M8a v4 (commit `577d8568`) is the next P3 apply candidate per PK explicit framing 2026-05-09. Apply gates remaining: §1.0 sequencing ✅ met v2.55/v2.56; §1.4 expected 3 callers; §1.3 cron state; §1.5a band [250, 500]; §1.5d alignment count = 0; D-01 fire; PK explicit approval phrase.
- M8b (function rename + manual caller remediation) NOT YET AUTHORED — separate cc-NNNN brief reserved for after M8a closes.
- 94-row un-publishable legacy draft cohort recorded as separate follow-up (out of M8a/M8b scope).

**Constraints respected this turn:** No Supabase writes. No D-01 fire. No cron edits. No EF deploys. No code changes. No Phase 0 scheduling. No M8 apply work. Single doc-only commit covering 3 files. cc-0003 / cc-0004 / cc-0005 / cc-0006 / cc-0007 briefs and result files **untouched**.

**Closed v2.58:** F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1) — cc-0007 result commit `411b85ee`.

**Open / deferred this turn (carried per PK explicit scope):**

- 4 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 D-01 fires) — Supabase writes, PK excluded.
- Memory `recent_updates` v2.55 + v2.56 + v2.57 + v2.58 entries (chat-owned at next opportunity).
- Dashboard PHASES reconciliation — **14th** consecutive deferral.
- cc-0005 M8a v4 apply work — awaiting PK direction to schedule apply session.
- M8b brief authoring — deferred until M8a closes.
- 94-row un-publishable legacy draft cohort cleanup — separate follow-up brief if PK directs.
- Phase 0 scheduling — still NOT scheduled.
- Publisher latent config risk — doc-only `[functions.publisher] verify_jwt = false` patch follow-up (P3; PK directs scheduling).
- HTTP 401 5-min cron triage candidate from v2.57 — **CLOSED** (folded into cc-0007 closure; jobid 5 was the source).

**P0+P1 open count delta:** ~3 → ~2 (cc-0007 P1 closed; F-CRON-AUTO-APPROVER-SECRET-INLINE remains P2 sec OPEN; cc-0005 M8a is P3 scheduling not P0+P1).

**State-capture exception count v2.58: 0** (cc-0007 D-01 fire returned clean agree; no escalation, no override).

**Sequencing state for next session:**

1. **cc-0005 M8a** is the next pipeline-integrity apply candidate (P3, PK direction required to schedule).
2. **Phase 0 confirmation defaults** still gated (P1 TOP).
3. **AI cost view** (P3 quick win, ~1h estimate).
4. **Personal businesses check-in** (P0 standing).
5. **Publisher latent config risk follow-up** (P3, doc-only patch).
