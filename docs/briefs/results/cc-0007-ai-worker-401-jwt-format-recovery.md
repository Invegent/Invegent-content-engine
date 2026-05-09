# Result — cc-0007 F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT — RECOVERED

**Brief:** `docs/briefs/cc-0007-ai-worker-401-jwt-format-recovery.md` (commit `7c45a92`)
**Apply session:** 2026-05-09 Sydney
**Executor:** CC (Claude Code)
**D-01 review:** PASS (`agree / proceed`, ai-worker-only scope, normal controls)
**PK approval phrase received:** "pk proceed with cc-0007 apply ai-worker only"
**Outcome:** RECOVERED. Repo patch + EF deploy applied; V1–V4 all PASS at first cron 5 fire post-deploy. No rollback required.

---

## 1. Apply summary

| Item | Value |
|---|---|
| Repo patch commit | `5037e573881c524dc244664c4a2fc08906c069bc` |
| Repo file changed | `supabase/config.toml` (single file, +5/-2 — additive) |
| EF deployed | ai-worker only (NOT publisher; defensive scope held per §1.4 strict rule) |
| Deploy command | `supabase functions deploy ai-worker --no-verify-jwt` |
| Deploy command exit | 0 |
| DEPLOY_TIMESTAMP | `2026-05-09T04:23:27Z` |
| First post-deploy cron 5 fire | `2026-05-09T04:25:00Z` (~93 s after DEPLOY_TIMESTAMP) |
| First post-deploy cron 5 outcome | `status_code=200`, `error_class=null` |
| Rollback fired | NO |
| §6 path triggered | NONE (clean recovery) |

Bearer tokens / keys are **not logged** anywhere in this result file. Only structural shape (vault references like `vault.decrypted_secrets WHERE name='publishable_key'`) is captured. No literal secret values appear.

## 2. Pre-flight + final re-verification

Initial pre-flight (before D-01 fire) and final re-verification (~60 s before apply) were consistent. The 401 pattern remained ongoing at re-verify time (latest 401 captured at 04:20:00 UTC, 3 min before deploy).

| Check | Initial | Re-verify | Status |
|---|---|---|---|
| §1.1 cron 5 active+calls ai-worker | active=true, calls_ai_worker=true, command_md5=`0f7a9e5d6e3ea11ab38862c09559506b` | identical (same md5; no concurrent edit) | PASS |
| §1.1 cron return_message reflects 401 (≥80%) | 0% (cron blind spot — `return_message` is `INSERT 0 1` from chained worker_http_log write) | identical | brief gap (Note A in pre-flight report); §1.2 authoritative |
| §1.2 401 jwt_format count last 6h on jobid 5 | 22 (FIRST=02:20:00Z, LATEST=04:10:00Z, 100% failure rate of jobid 5 fires since onset) | extended: 24 by re-verify time (04:15+04:20 added) | PASS qualitatively |
| §1.3 `[functions.ai-worker]` block | ABSENT | ABSENT | PASS (hypothesis confirmed) |
| §1.4 publisher block / 401 count | ABSENT block; 0 × 401 in 6h; jobid 7 active | (not re-verified — not in scope) | defensive patch NOT bundled per §1.4 strict rule + D-01 conditions |
| §1.5 ai-worker EF state | A-LE deploy=repo=2.12.0 since 2026-05-08 03:24Z; CLI list version 101 last 2026-05-08 03:22:10Z | (no drift scan since 2026-05-08 17:00 UTC; next scheduled 17:00 UTC today) | PASS (hypothesis aligns) |

## 3. Repo patch

**File:** `supabase/config.toml`
**Diff:** +5/-2 (additive only)

Insertion:
```toml
[functions.ai-worker]
verify_jwt = false
```

Inserted at end of the `Custom-header-auth EFs` section (after `[functions.auto-approver]` block, before the `Service-role-pattern EFs (13)` section divider). Section count comments updated: header-comment "23 functions total — 10 custom-header" → "24 functions total — 11 custom-header"; section-comment "Custom-header-auth EFs (10)" → "Custom-header-auth EFs (11)".

ai-worker matches the custom-header-auth pattern (cron sends `Authorization: Bearer <vault.publishable_key>` + `apikey: <vault.publishable_key>` + `x-ai-worker-key: <vault.ai_worker_api_key>`). All other config.toml entries preserved verbatim.

Commit: `5037e573881c524dc244664c4a2fc08906c069bc` on `main`. Push to `origin/main` succeeded.

## 4. Deploy

```
supabase functions deploy ai-worker --no-verify-jwt
```

Output (verbatim, no secrets):
```
WARNING: Docker is not running
Uploading asset (ai-worker): supabase/functions/ai-worker/index.ts
Deployed Functions on project mbkmaxqhsohbtwsqolns: ai-worker
You can inspect your deployment in the Dashboard: https://supabase.com/dashboard/project/mbkmaxqhsohbtwsqolns/functions
A new version of Supabase CLI is available: v2.98.2 (currently installed v2.75.0)
exit=0
```

Wall-clock 3 s (DEPLOY_START 04:23:24Z → DEPLOY_END 04:23:27Z). EF source unchanged; only the gateway flag (`verify_jwt: true → false`) was the semantic change.

## 5. Verification (V1–V4) — all PASS

| V | Query | Expected | Actual | Status |
|---|---|---|---|---|
| V1 | next jobid 5 fire post-deploy returns SQL `succeeded` AND `return_message` lacks `UNAUTHORIZED` | ≥1 row succeeded, no UNAUTHORIZED | runid 173234 at 04:25:00.491Z, status=succeeded, return_message=`INSERT 0 1` (no UNAUTHORIZED) | PASS |
| V1 (HTTP authoritative) | `worker_http_log` ⋈ `_http_response` for cron_jobid=5 post-deploy | status_code=200, no error_class | http_response_id 101268 at 04:25:00.491Z, status_code=**200**, timed_out=false, error_class=null | PASS |
| V2 | `_http_response` post-deploy with 401 + UNAUTHORIZED_INVALID_JWT_FORMAT | 0 | **0** | PASS |
| V3 | `worker_http_log` ⋈ `_http_response` shows ai-worker successful response | ≥1 row status_code=200 | covered by V1 HTTP authoritative row above | PASS |
| V4 | `ef_drift_log` post-deploy: no unexpected drift fires | 0 unexpected entries (drift cron 80 fires 17:00 UTC daily; not yet due in window) | 0 rows in window | PASS |

**Recovery confirmed at first post-deploy fire.** No retry of V1 was needed (brief allowed up to 3× retry with 60 s spacing). Pattern transition from 22+ consecutive 401s pre-deploy → 200 immediately post-deploy is unambiguous: the gateway flag change is the load-bearing fix.

## 6. Hypothesis-vs-evidence

The pre-flight hypothesis was: ai-worker EF gateway has `verify_jwt: true` (CLI default for EFs absent from `supabase/config.toml`); cron 5's `Authorization: Bearer <publishable_key>` header is not a parseable JWT; gateway 401s before function runs. The recovery vector mirrored the v2.54 video-worker recovery (commit `6ed29bbc`).

**Hypothesis confirmed empirically.** The single semantic change between the pre-deploy state (22+ × 401) and the post-deploy state (200 immediately) was the `--no-verify-jwt` flag on the deploy plus the corresponding `supabase/config.toml` repo entry (`[functions.ai-worker] verify_jwt = false`). EF source bytes (`supabase/functions/ai-worker/index.ts`) were unchanged across the deploy boundary; only the gateway-level setting flipped. This rules out alternate hypotheses (token expiry, code-level auth bug, etc.).

The `weak evidence` line about "alternate hypothesis: token IS a JWT but expired" is now retired by the empirical recovery — if the token were expired but JWT-formatted, gateway-level `verify_jwt: false` would still recover the call (which it does), but the recovery would also have worked under the `INVALID_JWT_FORMAT` reading (which is what the response body literally said). Both readings collapse to the same fix; the empirical 401 body content (`UNAUTHORIZED_INVALID_JWT_FORMAT`) supports the format-not-format hypothesis primarily.

## 7. D-01 record

- **Verdict:** `agree / proceed`, ai-worker-only scope, normal controls.
- **Conditions stated by D-01 reviewer (all met):**
  - Re-run final read-only verification immediately before apply — DONE (§2 above).
  - Halt if ai-worker self-resolves, if `[functions.ai-worker] verify_jwt=false` already exists, or if 401 pattern no longer present — none triggered.
  - Patch only `supabase/config.toml` by adding `[functions.ai-worker] verify_jwt = false` — DONE (commit `5037e57`).
  - Commit that repo patch — DONE.
  - Deploy only: `supabase functions deploy ai-worker --no-verify-jwt` — DONE (exit 0).
  - After deploy, run V1–V4 — DONE (all PASS).
  - Result file must redact bearer tokens / keys — DONE (no literal token values in this file; only structural references like `vault.decrypted_secrets WHERE name='X'`).
  - Roll back only if verification fails — V1–V4 PASS, no rollback fired.
- **PK approval phrase:** "pk proceed with cc-0007 apply ai-worker only" (received 2026-05-09).

T-MCP-02: chat fired one D-01 review for cc-0007; close-the-loop UPDATE on `m.chatgpt_review` is chat-owned at v2.58 4-way sync close.

## 8. Hold-state assertions

- One repo commit (`5037e57`) modifying only `supabase/config.toml` (single file). One EF deploy command. No other commits, no other deploys.
- ai-worker only — publisher NOT touched (latent risk noted; deferred to a future brief if PK directs).
- No DDL. No DML. No `apply_migration`. No `cron.alter_job`. No `execute_sql` writes against Supabase.
- Read-only `SELECT` against `cron.job`, `cron.job_run_details`, `m.worker_http_log`, `m.ef_drift_log`, `net._http_response` only.
- `STANDING_THREE` (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) **untouched**. `m.ef_drift_log` untouched. No cron edits. No cron schedule changes. No code changes.
- No M8 / cc-0005 work. No Phase 0 scheduling. cc-0006 untouched.
- `m.chatgpt_review` close-the-loop UPDATE for the cc-0007 D-01 fire: deferred to chat (standing protocol).
- 4-way sync close (session file + sync_state v2.58 pointer + action_list closure of F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT + memory `recent_updates` v2.58 entry): deferred to chat.

## 9. Open / next

- **Closed (proposed):** F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1). Action list bump pending chat close.
- **Latent risk for publisher (jobid 7):** publisher block remains ABSENT from `supabase/config.toml`. Currently 0 × 401 (publisher's gateway is presumably already at `verify_jwt: false` from a prior dashboard-set or prior `--no-verify-jwt` deploy), but the next publisher deploy without the flag AND without a config.toml entry would regress identically. Recommended: add `[functions.publisher] verify_jwt = false` to config.toml in a follow-up doc-only patch (no deploy needed since publisher is currently working). This was the §1.4 conditional defensive item that the brief held back per strict rule + D-01 conditions; surfacing here for PK consideration.
- **Brief-runner-v0 observations:**
  - §1.1 strict decision rule (return_message contains 401 evidence) is structurally inappropriate for HTTP-failure regression classes. Future briefs targeting cron-driven HTTP regressions should rely on `m.worker_http_log` ⋈ `net._http_response` joins instead.
  - §1.2 threshold (>50 401s in 6h) does not parameterise for regression freshness. A regression onset-time-aware threshold (e.g. ">80% failure rate over the last 6 fires") would generalise better.
  - §1.5 first-failed-cron-fire query relies on `cron.job_run_details.status='failed'` which never fires on HTTP-only failures. Same cron blind spot. `_http_response.created` of first 401 is the actual signal.
  - drift_log column-name mismatch (brief used `ef_slug` / `created_at`; actual schema is `slug` / `checked_at`). Trivial adapt at apply time but worth fixing in any brief-template work.
- **No memory edit** by CC (chat-owned at v2.58 close).

---

*Result authored 2026-05-09 Sydney by CC. Pre-flight, final re-verify, repo patch, deploy, V1–V4 verification all completed in single session. Recovery confirmed at first post-deploy fire (04:25:00 UTC). No rollback. Bearer tokens / keys redacted from this file per D-01 conditions; only structural references captured.*
