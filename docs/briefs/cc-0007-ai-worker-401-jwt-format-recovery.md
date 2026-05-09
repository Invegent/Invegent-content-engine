# Brief cc-0007 — F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT recovery (ai-worker `verify_jwt` regression; same class as v2.54 video-worker)

**Created:** 2026-05-09 Sydney  
**Author:** chat  
**Executor:** Claude Code (CC) per brief-runner-v0 — single CC session edits `supabase/config.toml`, commits, pushes, then runs `supabase functions deploy ai-worker --no-verify-jwt` from `C:\Users\parve\Invegent-content-engine`. Chat fires D-01 + PK approval gate beforehand.  
**Status:** issued (apply pending PK direction to schedule)  
**Finding:** `F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT` (P1)  
**Result file:** `docs/briefs/results/cc-0007-ai-worker-401-jwt-format-recovery.md` (created on completion)

---

## Patch history

- **2026-05-09 Sydney — initial draft (v1)** under PK direction. Authored after CC's read-only HTTP 401 triage post-v2.57 confirmed jobid 5 (`ai-worker-every-5m`) as the source of the persistent 401 `UNAUTHORIZED_INVALID_JWT_FORMAT` pattern observed during cc-0006 V4 verification. Hypothesis: ai-worker EF gateway has `verify_jwt=true` (or equivalent default behaviour for EFs missing from `supabase/config.toml`) — same class as the v2.54 video-worker `verify_jwt` regression which was recovered via (a) `supabase/config.toml` entry + (b) `--no-verify-jwt` redeploy.

---

## Investigation record

Source: CC's read-only HTTP 401 triage (2026-05-09 Sydney, post-v2.57 close).

**Triage origin:** v2.57 sync close logged "HTTP 401 5-min cron pattern" as a NEW triage candidate after cc-0006 V4 observed 3 HTTP 401 responses in a 30-min `_http_response` window at 02:20, 02:25, 02:35 UTC — pattern matching a `*/5` cron. cc-0006 noted likely jobid 48 (`enqueue-publish-queue-every-5m`) or another 5-min cron whose endpoint returns 401. CC's read-only follow-up triage definitively identified the source as **jobid 5 (`ai-worker-every-5m`)**, not jobid 48.

**Why jobid 48 is exonerated:** jobid 48's command body is pure PostgreSQL (`DO $$` block + `WITH candidates AS (...) INSERT INTO m.post_publish_queue ...`) per the cc-0005 v3/v4 brief investigation record. It does NOT call an Edge Function via `net.http_post` and therefore cannot receive a 401 from the EF gateway. cc-0006's earlier hypothesis ("likely jobid 48") was wrong; CC's triage corrected it.

**CC triage findings (read-only):**
1. jobid 5 (`ai-worker-every-5m`) is firing on its `*/5` schedule.
2. Each fire produces a `net._http_response` row with `status_code=401` and `error_msg` (or response body) containing `UNAUTHORIZED_INVALID_JWT_FORMAT`.
3. The pattern is **persistent** — no successful 200 fires in the recent window.
4. Same class as v2.54 video-worker regression: missing entry in `supabase/config.toml` causes the EF gateway to apply default `verify_jwt=true`; the bearer token cron 5 sends does not validate as a JWT format (likely a service_role key / other non-JWT bearer) so the gateway 401s before the function ever runs.

**Class match — v2.54 video-worker recovery (per memory recent_updates):**
- video-worker v3.0.0 DEPLOYED + verify_jwt regression recovered + durable `supabase/config.toml` LANDED (v2.54).
- Supabase config.toml landed at commit `6ed29bbc` with 23 EFs.
- video-worker recovered via `--no-verify-jwt` deploy plus config.toml entry.

If ai-worker is missing from the 23-EF config.toml that landed at v2.54 (or was added but with `verify_jwt=true` or omitted-block), the same class of fix applies.

---

## Symptom

**jobid 5 `ai-worker-every-5m` returns persistent 401 `UNAUTHORIZED_INVALID_JWT_FORMAT` on every fire.** Frequency: every 5 minutes (288 fires per day, all 401). Started: at or before cc-0006 V4 window (2026-05-09 ≈ 02:20 UTC); duration unknown without `_http_response` history beyond the 6-h window cc-0006 captured. Exact first-failure timestamp determined at apply-session pre-flight (§1.2).

## Root hypothesis

**ai-worker Edge Function gateway has `verify_jwt=true` (default) because `ai-worker` is missing from `supabase/config.toml` — OR — ai-worker IS in config.toml but with `verify_jwt=true` (explicit or default).** The bearer token in cron 5's command body does not validate as a well-formed JWT, so the gateway 401s the request with `UNAUTHORIZED_INVALID_JWT_FORMAT` before the function code runs.

This is the **same class** as the v2.54 video-worker regression. Recovery pattern there: (a) repo patch adding `[functions.video-worker] verify_jwt = false` to `supabase/config.toml`; (b) production redeploy of video-worker via `supabase functions deploy video-worker --no-verify-jwt`.

The same 2-step pattern is proposed here for ai-worker.

## Blast radius

**Autonomous AI generation stage may be blocked.** ai-worker is the EF that processes `m.ai_job` rows (status='queued' → 'succeeded') by invoking the model API and writing AI-generated content to `m.post_draft`. If ai-worker has been 401-ing on every fire since the regression started:

1. Queued `m.ai_job` rows are NOT being processed.
2. Drafts are NOT being generated.
3. Cron 48 (`enqueue-publish-queue-every-5m`) has fewer (or zero) successfully-completed `m.ai_job` rows to enqueue from — publishing pipeline starves upstream.
4. Auto-approver agent has nothing to process — idle.
5. Publisher agent has nothing to publish — idle.

**P1 because the central pipeline mission (autonomous content generation) is blocked.** Cost-of-waiting is high — every 5 minutes another failed run, no AI generation.

Secondary impact (defensive check): if `publisher` EF is in the same regression class (also missing from config.toml, also receiving 401s on its own cron), the publishing tier is doubly blocked. Pre-flight §1.4 verifies.

---

## Source context

- **CC's read-only HTTP 401 triage** (2026-05-09 Sydney; details summarised in Investigation record above).
- `docs/briefs/results/cc-0006-cron-pg-net-timeout-30s.md` §6 — the 401 background pattern surfaced during V4 (commit `c72bc327`, blob `9613c133`).
- `docs/runtime/sessions/2026-05-09-cc-0006-closed-cc-0005-v3-patched.md` §1.3 — v2.57 close logged the triage candidate.
- `docs/runtime/sessions/2026-05-08-video-worker-v3-deploy-verify-jwt-recovery.md` — v2.54 prior recovery of same class.
- `supabase/config.toml` — the 23-EF config.toml landed at v2.54 (commit `6ed29bbc`).
- `cron.job` jobid 5 — `ai-worker-every-5m`.
- `net._http_response` — persistent 401 evidence.
- `m.worker_http_log` (if present) — join target for higher-resolution diagnosis.
- `m.ef_drift_log` — ai-worker deploy history.

## Scope

**In scope:**
- Read-only pre-flight verification (§1).
- One D-01 fire (`ask_chatgpt_review`) per §5; action_type `ef_deploy`.
- One repo patch commit to `supabase/config.toml` adding `[functions.ai-worker] verify_jwt = false`.
- Optionally one defensive repo patch addition for `[functions.publisher]` IF pre-flight §1.4 confirms publisher is also missing AND showing 401s on its cron AND PK directs.
- One production deploy: `supabase functions deploy ai-worker --no-verify-jwt` from `C:\Users\parve\Invegent-content-engine` (CC-driven; chat cannot run shell commands).
- Optionally one defensive production deploy: `supabase functions deploy publisher --no-verify-jwt` (only if pre-flight §1.4 evidence justifies AND PK directs).
- 4 post-deploy verification queries V1–V4 (§4).
- Rollback within session if any verification fails (per §6).
- Close-the-loop UPDATE to `m.chatgpt_review`.
- 4-way sync at session close.

**Out of scope:**
- ai-worker code changes (no repo edits beyond `supabase/config.toml`).
- Authentication mechanism changes (cron 5 bearer token NOT modified).
- `cron.job` row edits (no cron edits).
- Any DDL or DML.
- M8 work (cc-0005 v4 separate brief).
- Phase 0 scheduling.
- `m.ef_drift_log` writes (read-only).
- Other EFs not specifically named (defensive scope limited to publisher only IF justified).
- Deploy of "standing don't-redeploy three" (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — forbidden regardless of evidence.

## Allowed actions

- Read-only `SELECT` against `cron.job`, `cron.job_run_details`, `net._http_response`, `m.worker_http_log` (if present), `m.ef_drift_log`, `pg_extension`, `pg_namespace` for pre-flight + verification.
- Read `supabase/config.toml` via Invegent GitHub MCP for §1.3 + §1.4.
- One `ask_chatgpt_review` D-01 fire per §5.
- One git commit to `main` (CC-driven OR chat-pushed) editing `supabase/config.toml` to add `[functions.ai-worker] verify_jwt = false` (and optionally `[functions.publisher] verify_jwt = false` per §1.4 evidence + PK direction).
- One CC shell command from `C:\Users\parve\Invegent-content-engine`: `supabase functions deploy ai-worker --no-verify-jwt`.
- Optionally one additional CC shell command: `supabase functions deploy publisher --no-verify-jwt` (only if evidence + PK direct).
- Up to 3 retries on the post-deploy verification queries (network/timeout reasons only).
- One rollback redeploy + git revert per §6.3 if verification fails.
- One close-the-loop UPDATE to `m.chatgpt_review` after success.
- One commit creating `docs/briefs/results/cc-0007-ai-worker-401-jwt-format-recovery.md`.
- 4-way sync close commits at session end.

## Forbidden actions

- No deploy of any EF beyond the named `ai-worker` (and conditionally `publisher`).
- **No deploy of "standing don't-redeploy three":** `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`. List unchanged from v2.46+.
- No source code changes to ai-worker (`supabase/functions/ai-worker/index.ts` etc).
- No DDL of any kind.
- No DML on any application table.
- No cron edits to ANY cron job (jobid 5 command body NOT modified by this brief).
- No changes to bearer-token / authentication logic.
- No D-01 fire beyond the one in §5.
- No `apply_migration` calls (this is an EF deploy, not a SQL migration).
- No deploy if §1 pre-flight contradicts root hypothesis (HALT §6.2.a).
- No deploy if `m.ef_drift_log` shows a recent ai-worker redeploy with `verify_jwt=false` already attempted (HALT §6.2.b — fix has been tried and failed; need different approach).
- No deploy if pre-flight reveals the 401 pattern stopped recently of its own accord (HALT §6.2.c — problem may have self-resolved).
- No proceeding past D-01 if the verdict is anything other than `agree` with `proceed`.
- No assumption that `ai-worker` IS in config.toml; pre-flight §1.3 verifies.
- No assumption that `publisher` is at-risk; pre-flight §1.4 verifies.
- No defensive publisher deploy without explicit pre-flight evidence AND explicit PK direction.
- No edit to `00_overview.md`, `04_phases.md`, `06_decisions.md` from this session unless 4-way sync requires it.
- No Phase 0 scheduling.

---

## 1. Pre-flight verification (read-only)

All §1.x sub-checks run before D-01 fire. Re-run §1.1–§1.5 within ~60s of apply (final re-verification) to confirm no drift.

### 1.1 Confirm jobid 5 cron command/auth pattern

```sql
SELECT jobid, jobname, schedule, command, active, database, username
FROM cron.job
WHERE jobid = 5;
```

**Capture:** `OLD_CRON_5_COMMAND` (FULL `command` text, redact bearer token value before logging to result file — security hygiene).

**Decision rule:**
- `active = false` → HALT (§6.2.d); cron is inactive, fix premise weakens.
- `command` does NOT contain a `net.http_post` call to ai-worker URL → HALT (§6.2.e); cron 5 is not actually invoking ai-worker.
- `command` contains the call → proceed.

```sql
SELECT jobid, runid, job_pid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = 5
ORDER BY start_time DESC
LIMIT 20;
```

**Decision rule:** Confirm ≥ 80% of last 20 fires show 401 evidence in `return_message` (or status='failed'). If not, HALT (§6.2.c — problem may have self-resolved).

### 1.2 Confirm recent 401s via `net._http_response` joined to `m.worker_http_log`

First confirm `m.worker_http_log` exists and inspect schema:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'm' AND table_name = 'worker_http_log'
ORDER BY ordinal_position;
```

If table exists, run the joined query (adjust join key based on schema):

```sql
SELECT 
  r.id AS http_response_id,
  r.status_code,
  r.timed_out,
  r.created AS response_created,
  CASE
    WHEN r.content::text ~* 'UNAUTHORIZED_INVALID_JWT_FORMAT' THEN 'jwt_format'
    WHEN r.content::text ~* 'UNAUTHORIZED' THEN 'unauthorized_other'
    ELSE 'other'
  END AS error_class,
  whl.worker AS worker_name,
  whl.created AS log_created
FROM net._http_response r
LEFT JOIN m.worker_http_log whl ON whl.http_response_id = r.id  -- adjust if join key differs
WHERE r.created > NOW() - INTERVAL '6 hours'
  AND r.status_code = 401
ORDER BY r.created DESC;
```

If `m.worker_http_log` does NOT exist (table absent), fall back to `_http_response` only:

```sql
SELECT 
  r.id, r.status_code, r.timed_out,
  r.created AS response_created,
  CASE
    WHEN r.content::text ~* 'UNAUTHORIZED_INVALID_JWT_FORMAT' THEN 'jwt_format'
    WHEN r.content::text ~* 'UNAUTHORIZED' THEN 'unauthorized_other'
    ELSE 'other'
  END AS error_class
FROM net._http_response r
WHERE r.created > NOW() - INTERVAL '6 hours'
  AND r.status_code = 401
ORDER BY r.created DESC
LIMIT 100;
```

**Decision rule:**
- > 50 rows of `error_class='jwt_format'` in 6h → confirms persistent 401 pattern; proceed.
- 0 rows of any 401 in 6h → problem may have self-resolved → HALT (§6.2.c).
- Mixed pattern with non-`jwt_format` 401s dominant → different fix path needed; HALT and re-investigate.

**Capture:** `FIRST_401_TIMESTAMP` (earliest 401 in window) and `LATEST_401_TIMESTAMP` (most recent) for the result file.

### 1.3 Confirm `ai-worker` missing (or misconfigured) from `supabase/config.toml`

Read via Invegent GitHub MCP:

```
get_file_contents(owner=Invegent, repo=Invegent-content-engine, path=supabase/config.toml, ref=main)
```

**Inspect for:**
- Presence/absence of `[functions.ai-worker]` block.
- If present, value of `verify_jwt` (true / false / absent which defaults to true).

**Decision rule:**
- `[functions.ai-worker]` block ABSENT → hypothesis confirmed (default `verify_jwt=true`); proceed with patch.
- `[functions.ai-worker]` block PRESENT with `verify_jwt = false` → hypothesis WRONG; HALT (§6.2.a). Different fix path.
- `[functions.ai-worker]` block PRESENT with `verify_jwt = true` (or absent verify_jwt key) → hypothesis confirmed in alternate form; proceed with patch flipping value to `false`.

**Capture:** current state of the `[functions.ai-worker]` block (absent / present-true / present-false) for the result file.

### 1.4 Check whether `publisher` is also missing and at-risk

In the same `supabase/config.toml` read at §1.3:

**Inspect for:**
- Presence/absence of `[functions.publisher]` block.
- If present, value of `verify_jwt`.

In parallel, check whether publisher EF is currently being invoked by any cron and whether 401s are firing:

```sql
SELECT jobid, jobname, schedule
FROM cron.job
WHERE command ~* 'publisher'
  AND active = true;
```

```sql
-- 401 rate for publisher specifically (if there's a way to identify publisher's responses in _http_response)
SELECT COUNT(*) AS publisher_401_count_6h
FROM net._http_response r
WHERE r.created > NOW() - INTERVAL '6 hours'
  AND r.status_code = 401
  AND r.url ~* '/functions/v1/publisher';  -- adjust based on actual URL pattern
```

**Decision rule (publisher defensive scope):**
- Publisher block ABSENT in config.toml AND publisher cron is firing AND publisher_401_count_6h > 0 → publisher is in same regression class; defensive patch + deploy JUSTIFIED. Surface to PK in D-01 packet for explicit direction.
- Publisher block ABSENT but publisher_401_count_6h = 0 → publisher may not be JWT-protected (e.g. no cron invokes it directly, or invocation pattern is different) OR has been gracefully tolerating the regression. Defensive patch NOT justified without further evidence.
- Publisher block PRESENT (with or without `verify_jwt = false`) → publisher is configured; no defensive action needed.
- Publisher cron does not exist OR is inactive → publisher is not currently exposed to this regression class; no defensive action.

**Capture:** publisher's config.toml state + cron state + 6h 401 rate for the result file.

### 1.5 Check latest EF drift/deploy state for ai-worker

```sql
SELECT *
FROM m.ef_drift_log
WHERE ef_slug = 'ai-worker'
ORDER BY created_at DESC
LIMIT 10;
```

**Inspect for:**
- Most recent deploy timestamp.
- `verify_jwt` value (or equivalent flag) at last deploy.
- Any drift fires referencing ai-worker.
- Any failed prior deploy attempts.

**Decision rule:**
- Latest deploy was recent AND with `verify_jwt=false` → hypothesis WRONG (deploy already in correct state); HALT (§6.2.b). Investigate why 401s persist despite correct deploy state.
- Latest deploy was older (e.g. weeks/months ago) AND `verify_jwt=true` (or unspecified) → hypothesis aligns; proceed with re-deploy at `--no-verify-jwt`.
- Multiple failed prior deploy attempts in last 24h → HALT and surface to PK; something else is wrong.
- `m.ef_drift_log` table missing OR no rows for ai-worker → informational; proceed with deploy but flag for D-01.

**Also check (informational):** `pg_cron.job_run_details` for jobid 5 around the suspected first-failure timestamp to bracket when the regression started.

```sql
SELECT MIN(start_time) AS first_failed_run
FROM cron.job_run_details
WHERE jobid = 5
  AND status = 'failed'
  AND return_message ~* 'UNAUTHORIZED'
  AND start_time > NOW() - INTERVAL '14 days';
```

Useful for the result file's incident-timeline narrative.

---

## 2. Proposed repo patch

**File:** `supabase/config.toml` (single file, single commit).

**Patch (additive):**

```toml
[functions.ai-worker]
verify_jwt = false
```

Insertion location: alphabetical position relative to existing `[functions.X]` blocks (between `[functions.<the previous block alphabetically>]` and `[functions.<next>]`). If the file uses a non-alphabetical convention, insert at end of `[functions.*]` section. Apply session inspects existing structure and chooses the consistent position.

**If §1.3 reveals `[functions.ai-worker]` block is PRESENT with `verify_jwt = true`** (or absent verify_jwt key inside the present block), patch flips/adds the value:

```toml
# Before:
[functions.ai-worker]
verify_jwt = true  # or absent
# (other keys preserved)

# After:
[functions.ai-worker]
verify_jwt = false
# (other keys preserved)
```

**Conditional defensive addition for publisher** — ONLY IF §1.4 evidence justifies AND PK explicitly directs in D-01 approval:

```toml
[functions.publisher]
verify_jwt = false
```

Do NOT add the publisher block speculatively. Avoid adding speculative entries for any other EF.

**Commit shape:**
- Single commit on `main`.
- Commit message format: `fix(config): add [functions.ai-worker] verify_jwt=false (cc-0007 recovery)`
  - If publisher also patched: `fix(config): add [functions.ai-worker] + [functions.publisher] verify_jwt=false (cc-0007 recovery)`
- No other files touched in this commit.

---

## 3. Proposed production recovery

**Method:** CC-driven shell from `C:\Users\parve\Invegent-content-engine`. Chat cannot run shell commands.

**Primary command:**

```bash
cd C:\Users\parve\Invegent-content-engine
supabase functions deploy ai-worker --no-verify-jwt
```

**Conditional defensive command** (only if §1.4 evidence justifies AND PK explicitly directs):

```bash
supabase functions deploy publisher --no-verify-jwt
```

**Wait time:** ~30 seconds after deploy command completes before running V1 (allows gateway propagation + next cron 5 fire).

**Apply session capture:** record exact deploy command output (success / failure indicator + timing) for the result file.

**Order:**
1. Pre-flight §1.1–§1.5 PASS.
2. D-01 fire returns clean agree + PK approval phrase.
3. Final read-only re-verification (re-run §1.1–§1.5 within ~60s).
4. Repo patch commit + push.
5. Wait for Vercel/CI propagation if any (typically not relevant for `supabase/config.toml` since it's a CLI-side config file, not a deployed artifact).
6. Run `supabase functions deploy ai-worker --no-verify-jwt`.
7. Capture deploy output and timestamp.
8. Wait ~30s for gateway propagation.
9. Run V1–V4 (§4).
10. If V1–V4 PASS → proceed to result file + 4-way sync.
11. If V1–V4 FAIL → rollback per §6.3.

**If publisher defensive deploy approved** (PK direct in D-01 only): insert step 6.5 between primary deploy and verification: `supabase functions deploy publisher --no-verify-jwt`. Run V1–V4 cover BOTH ai-worker AND publisher in that case (§4 verification queries amended at apply time).

---

## 4. Verification queries (post-deploy)

All 4 must PASS. Run after waiting ~30s post-deploy.

### V1 — Next jobid 5 fire returns 200 (or success)

```sql
SELECT jobid, runid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = 5
  AND start_time > <DEPLOY_TIMESTAMP>
ORDER BY start_time DESC
LIMIT 5;
```

**Pass:** at least 1 row with `status = 'succeeded'` and `return_message` does NOT contain `UNAUTHORIZED` substring.

Note: cron 5 fires every 5 min. If apply session waits < 5 min after deploy, no new run may have fired yet — retry V1 up to 3 times with 60s spacing. If still no new run after 6 min, inspect `cron.job` for `active=true` (§1.1 verified earlier) and investigate.

### V2 — No new `UNAUTHORIZED_INVALID_JWT_FORMAT` post-deploy

```sql
SELECT COUNT(*) AS post_deploy_jwt_format_401_count
FROM net._http_response r
WHERE r.created > <DEPLOY_TIMESTAMP>
  AND r.status_code = 401
  AND r.content::text ~* 'UNAUTHORIZED_INVALID_JWT_FORMAT';
```

**Pass:** `post_deploy_jwt_format_401_count = 0`.

### V3 — `m.worker_http_log` links successful responses (if table exists)

```sql
-- If m.worker_http_log table exists per §1.2 schema check
SELECT 
  whl.id, whl.worker, whl.http_response_id, whl.created,
  r.status_code
FROM m.worker_http_log whl
JOIN net._http_response r ON r.id = whl.http_response_id
WHERE whl.worker = 'ai-worker'
  AND whl.created > <DEPLOY_TIMESTAMP>
ORDER BY whl.created DESC
LIMIT 10;
```

**Pass:** ≥ 1 row with `status_code = 200` (or whatever success indicator the worker uses) AND `worker = 'ai-worker'`.

**If `m.worker_http_log` does not exist:** V3 reduces to inspecting `_http_response` for the ai-worker URL pattern with `status_code=200` post-deploy.

### V4 — No EF drift regression

```sql
SELECT *
FROM m.ef_drift_log
WHERE created_at > <DEPLOY_TIMESTAMP>
ORDER BY created_at DESC
LIMIT 20;
```

**Pass:**
- 1 expected ai-worker entry showing the recovery deploy with `verify_jwt=false`.
- 0 unexpected drift fires for any other EF (i.e. STANDING_THREE not touched; no collateral redeploys).
- 0 entries showing config.toml drift.

If `m.ef_drift_log` does not exist OR is not populated for this scenario, V4 reduces to: `m.ef_drift_log` query returns 0 rows beyond the expected ai-worker entry.

---

## 5. D-01 packet content (NOT YET FIRED)

### 5.1 `proposal` (prose)

```
Apply cc-0007 ai-worker verify_jwt regression recovery:

  1. Repo patch: add `[functions.ai-worker] verify_jwt = false` to
     supabase/config.toml. (Optional: also add `[functions.publisher]
     verify_jwt = false` if pre-flight §1.4 evidence justifies AND
     PK explicitly directs; otherwise leave publisher untouched.)

  2. Production deploy: `supabase functions deploy ai-worker
     --no-verify-jwt` from CC shell at C:\Users\parve\Invegent-content-engine.
     (Optional defensive deploy: `supabase functions deploy publisher
     --no-verify-jwt` only if §1.4 + PK direct.)

Class match: v2.54 video-worker verify_jwt regression recovery.
Finding ID: F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1).

Symptom: jobid 5 ai-worker-every-5m persistent 401
  UNAUTHORIZED_INVALID_JWT_FORMAT on every fire.

Root hypothesis: ai-worker EF gateway has verify_jwt=true (default for
  EFs missing from supabase/config.toml). Bearer token in cron 5
  command is not a well-formed JWT, so gateway 401s before function runs.

Blast radius: P1 — autonomous AI generation stage blocked.

Verification: V1 (next cron 5 fire returns 200), V2 (no new
  UNAUTHORIZED_INVALID_JWT_FORMAT post-deploy), V3 (m.worker_http_log
  links successful responses if table exists), V4 (no EF drift
  regression). All 4 must PASS.

Rollback: `supabase functions deploy ai-worker` (without --no-verify-jwt)
  + git revert of supabase/config.toml patch.
```

### 5.2 `context` (structured object)

```json
{
  "decision_under_review": "Recover ai-worker EF from persistent 401 UNAUTHORIZED_INVALID_JWT_FORMAT regression by adding verify_jwt=false config.toml entry + redeploying with --no-verify-jwt.",
  "production_action_if_approved": "(1) Single commit + push to main editing supabase/config.toml to add [functions.ai-worker] verify_jwt = false (and conditionally [functions.publisher] verify_jwt = false). (2) CC shell command: supabase functions deploy ai-worker --no-verify-jwt. (3) Optional CC shell command for publisher if §1.4 + PK direct.",
  "consequence_if_delayed": "P1 — autonomous AI generation continues to be blocked. Every 5 minutes another failed cron 5 fire. Drafts not generated. Pipeline starvation upstream of cron 48.",
  "cost_of_waiting": "High. Confirmed persistent regression. Class match to v2.54 video-worker recovery (proven fix pattern). Delay = continued pipeline starvation.",
  "current_evidence": [
    "CC's read-only HTTP 401 triage 2026-05-09: jobid 5 (ai-worker-every-5m) returns 401 UNAUTHORIZED_INVALID_JWT_FORMAT on every fire.",
    "cc-0006 V4 observation: 3 HTTP 401s on */5 schedule at 02:20/02:25/02:35 UTC; pattern persisted across cc-0006 apply boundary.",
    "v2.54 video-worker recovery: same class of regression (missing config.toml entry); recovered via supabase/config.toml entry + --no-verify-jwt deploy at commit 6ed29bbc.",
    "Pre-flight §1.1: jobid 5 active=<true|false>; OLD_CRON_5_COMMAND captured.",
    "Pre-flight §1.2: <N> 401 UNAUTHORIZED_INVALID_JWT_FORMAT in 6h window; FIRST_401_TIMESTAMP=<DT>; LATEST_401_TIMESTAMP=<DT>.",
    "Pre-flight §1.3: [functions.ai-worker] block status in supabase/config.toml = <absent | present-true | present-false>.",
    "Pre-flight §1.4: [functions.publisher] block status = <absent | present-true | present-false>; publisher cron firing = <yes/no>; publisher 6h 401 count = <N>.",
    "Pre-flight §1.5: ai-worker last deploy at <DT>; verify_jwt at last deploy = <true | false | unknown>; m.ef_drift_log entries for ai-worker = <N>."
  ],
  "known_weak_evidence": [
    "Bearer token format inside cron 5 command is not inspected by this brief (security — do not log tokens). Hypothesis assumes token is non-JWT format causing UNAUTHORIZED_INVALID_JWT_FORMAT; alternate hypothesis: token IS a JWT but expired, in which case verify_jwt=false bypasses the check anyway (still recoveries) but root cause is different.",
    "m.worker_http_log table existence is uncertain; §1.2 falls back to _http_response only if table absent.",
    "m.ef_drift_log row pattern for ai-worker is uncertain; §1.5 may return 0 rows for valid reasons.",
    "Deploy command output is not parsed for granular success/failure; relies on V1–V4 to confirm post-deploy behaviour.",
    "Defensive publisher deploy is conditional; specific evidence threshold for PK direction is judgement-call."
  ],
  "default_action": "proceed if D-01 returns clean agree AND §1.1–§1.5 confirm hypothesis (§1.3 ai-worker block absent or with verify_jwt=true, §1.5 last deploy not already at verify_jwt=false, §1.2 ≥ 50 401s in 6h)",
  "references": {
    "cc-0007 brief (this)": "docs/briefs/cc-0007-ai-worker-401-jwt-format-recovery.md",
    "cc-0006 result": "docs/briefs/results/cc-0006-cron-pg-net-timeout-30s.md",
    "v2.54 video-worker prior recovery": "docs/runtime/sessions/2026-05-08-video-worker-v3-deploy-verify-jwt-recovery.md",
    "v2.57 sync close (HTTP 401 triage candidate logged)": "docs/runtime/sessions/2026-05-09-cc-0006-closed-cc-0005-v3-patched.md",
    "supabase/config.toml (current)": "supabase/config.toml at HEAD"
  },
  "sql_to_apply": "N/A — this is an EF deploy, not a SQL migration. The repo patch is the supabase/config.toml additions described in §2. The deploy command is described in §3."
}
```

### 5.3 Decision rule on D-01 verdict

- `agree` + `proceed` + risk ≤ medium + 0 pushback → apply (with PK explicit phrase received).
- `agree` + `proceed` + reviewer adds defensive publisher conditions → PK direct on whether to include publisher; default is "NOT include" unless PK affirms.
- `disagree` OR risk=high OR ≥1 pushback → do not proceed; surface to PK for state-capture-exception consideration per Lesson #62 v2.50 refinement.
- `partial` → read corrected_action; if corrected action substantively differs from §2/§3, do not proceed without PK direction.

---

## 6. Rollback / no-op / halt logic

### 6.1 NO-OP path (run before D-01 fire)

- Pre-flight §1.3 reveals `[functions.ai-worker]` already PRESENT with `verify_jwt = false` → hypothesis wrong; HALT (§6.2.a). No-op.
- Pre-flight §1.5 reveals last deploy was already `--no-verify-jwt` AND recent → HALT (§6.2.b). No-op.
- Pre-flight §1.2 returns 0 401s in 6h window AND §1.1 cron 5 last 5 fires all `succeeded` → problem may have self-resolved; HALT (§6.2.c). No-op.

Document the no-op outcome in result file.

### 6.2 HALT paths

**6.2.a Pre-flight contradicts hypothesis:** §1.3 OR §1.5 shows ai-worker config is already in correct state. HALT; surface to PK; investigate alternate fix paths.

**6.2.b Recent failed deploy attempt:** §1.5 m.ef_drift_log shows ai-worker has been redeployed with `verify_jwt=false` recently (last 24h) but 401s persist. The fix has been tried and didn't work; need different approach. HALT; surface to PK.

**6.2.c Self-resolved:** §1.2 + §1.1 indicate the 401 pattern stopped on its own. HALT; do not deploy speculatively. Document as no-op outcome.

**6.2.d Cron inactive:** §1.1 shows jobid 5 `active = false`. Recovery premise weakens (no fires can succeed even after fix until cron is re-activated). HALT; surface to PK.

**6.2.e Cron 5 not invoking ai-worker:** §1.1 reveals cron 5 command body does not contain a `net.http_post` call to ai-worker URL. Wrong cron identified; restart triage. HALT.

**6.2.f Bearer token issue (alternate root cause):** if D-01 reviewer or PK identifies that the actual problem is the bearer token in cron 5's command body (not the gateway verify_jwt setting), HALT cc-0007 and author cc-0008 (or amend cron 5 directly via separate cron-edit class brief).

**6.2.g Multiple unexpected EFs at risk:** §1.4 reveals more than just publisher is at risk (e.g. 3+ EFs missing from config.toml AND firing 401s). Scope creep; HALT cc-0007, escalate to PK for staged recovery brief covering multiple EFs.

### 6.3 ROLLBACK path (verification fails after deploy)

If any of V1–V4 FAIL:

1. Halt session continuation.
2. Run rollback redeploy (CC shell):
   ```bash
   cd C:\Users\parve\Invegent-content-engine
   supabase functions deploy ai-worker  # without --no-verify-jwt
   ```
   This restores ai-worker to gateway-verify-jwt=true (the regression state). 401s will resume but no NEW failure mode introduced.
3. Git revert the `supabase/config.toml` patch:
   ```bash
   git revert <COMMIT_SHA from §2>
   git push origin main
   ```
4. (If publisher was also deployed defensively:) `supabase functions deploy publisher` (without --no-verify-jwt) to restore prior state.
5. Re-run V1–V4 post-rollback to confirm restoration:
   - V1 returns to 401 (regression state).
   - V2 increments past `<DEPLOY_TIMESTAMP>` (new 401s firing).
   - V3 `m.worker_http_log` continues to show 401s.
   - V4 `m.ef_drift_log` has 2 new entries (the rollback redeploys).
6. Document failure mode + diagnosis in result file.
7. PK escalation; cc-0007 v2 brief with corrective measures.

### 6.4 Why not template the rollback fully

The rollback target (previous deploy state) is captured implicitly by the `supabase functions deploy ai-worker` command without `--no-verify-jwt` flag. The git revert SHA is known only at apply time (after the patch commit lands). These per-apply-resolution items are noted in the brief but not pre-templated.

---

## 7. Result-file convention

**Path:** `docs/briefs/results/cc-0007-ai-worker-401-jwt-format-recovery.md`

**Standard sections (mirror cc-0006 result pattern):**

1. **Header** — brief reference, apply session date, executor, D-01 verdict, PK approval phrase, outcome summary.
2. **Apply summary** — logical action, project, method, result, files patched, deploys executed, rollback fired (yes/no), §6 path triggered (or NONE).
3. **Pre-flight + final re-verification** — table comparing initial pre-flight values vs ~60s-before-apply re-verification values for §1.1–§1.5; status PASS/FAIL per row. Capture FIRST_401_TIMESTAMP, LATEST_401_TIMESTAMP, ai-worker config.toml state, publisher config.toml state.
4. **Repo patch applied** — the exact `supabase/config.toml` diff that landed (ai-worker block; publisher block if applicable). Commit SHA. Commit message.
5. **Production deploy executed** — exact commands run; deploy timestamp; raw output (redact any secrets / tokens); ai-worker version SHA from deploy output if surfaced; publisher deploy details if applicable.
6. **Verification (V1–V4)** — status table per V; for V1 record next-cron-5-fire timestamp + return_message; for V2 record `post_deploy_jwt_format_401_count`; for V3 record successful response count + first success timestamp; for V4 record m.ef_drift_log entries.
7. **D-01 record** — verdict, conditions stated by reviewer, PK approval phrase, action_type (`ef_deploy`), close-the-loop UPDATE status (deferred/done).
8. **Hold-state assertions** — STANDING_THREE untouched, m.ef_drift_log not written by chat (only by deploy automation), no DDL, no DML, no cron edits, no Phase 0 scheduling, no M8 work.
9. **Open / next** — propose closure of F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1); flag publisher follow-up if defensive deploy NOT executed despite §1.4 evidence; flag any new findings observed during recovery.
10. **New brief-runner-v0 patterns observed** — capture lessons for future EF-deploy-class briefs (this is the first cc-NNNN brief with `ef_deploy` action_type).

**Do NOT include in result file:** bearer token values from cron 5 command body; service_role / anon keys observed in logs; any secrets. Redact before committing.

---

## 8. Stop condition

1. §1 pre-flight all §1.1–§1.5 PASS (no HALT triggered).
2. §5 D-01 fire returns clean agree + PK explicit approval phrase.
3. Final read-only re-verification confirms no drift (re-run §1.1–§1.5).
4. §2 repo patch commit lands on main.
5. §3 production deploy command completes successfully.
6. §4 verification V1–V4 all PASS.
7. Close-the-loop UPDATE on `m.chatgpt_review`.
8. Result file `docs/briefs/results/cc-0007-ai-worker-401-jwt-format-recovery.md` committed.
9. F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT closure documented in 4-way sync close.
10. (Optional, conditional) publisher defensive deploy + V1–V4 publisher coverage if PK directed.
11. 4-way sync close.

If any of §6.1, §6.2.{a-g}, or §6.3 paths trigger: report and stop.

---

## Notes

This is the **fifth cc-NNNN brief** in the brief-runner-v0 trial; **first ef-deploy-class apply brief**; first to use `ef_deploy` action_type with D-01 reviewer; first to combine repo patch + CC shell command in single coordinated apply session; first P1 recovery class (cc-0001 through cc-0006 were P2/P3 plus M6 P1 which was a SQL migration class).

### Brief-runner-v0 watch items specific to cc-0007

1. **First `ef_deploy` D-01 action_type** — cc-0006 was first `cron_edit` action_type. cc-0007 introduces `ef_deploy`. Reviewer should apply same standards as `sql_destructive` (production state change with rollback path).

2. **Repo patch + CC shell command coordination** — first brief where the apply session has TWO production-touching steps that must both succeed: (a) git commit pushing config.toml, (b) supabase functions deploy. Failure modes: commit lands but deploy fails (config drift); deploy succeeds but commit fails (gateway state out of sync with git). Brief assumes both succeed; rollback handles either-or-both failure.

3. **P1 recovery class** — first cc-NNNN brief at P1 recovery level. Should test whether brief-runner-v0 can handle expedited timing (P1 cost-of-waiting is high; standard D-01 protocol still applies but reviewer may compress turnaround).

4. **Class-match to v2.54 video-worker recovery** — the recovery pattern (config.toml + --no-verify-jwt) was already proven once in v2.54. cc-0007 vindicates the L17 "in-place patching pattern" lesson at a different layer: when the same fix pattern is needed for a sibling EF, brief shape replicates the prior recovery rather than reinventing.

5. **Conditional defensive scope (publisher)** — first brief with explicit conditional secondary action gated on pre-flight evidence + PK direction in D-01. Pattern: brief proposes the conditional action; pre-flight gathers evidence; D-01 reviewer surfaces; PK directs.

6. **Bearer token exclusion from result file** — first brief with explicit security hygiene rule (do NOT log tokens / secrets in result file). Pattern: when pre-flight reads cron command bodies that include bearer tokens, brief author + apply session BOTH redact before committing artefacts.

7. **Lesson candidates from cc-0007 cycle (post-apply):**
   - **L22 (ef_deploy D-01 action_type)** — will validate cleanly if D-01 fires, reviewer applies appropriate standards, and apply session executes without surprises.
   - **L23 (repo + deploy coordination)** — will codify the rollback shape (git revert + redeploy without flag) when the 2-track apply pattern is proven.
   - **L24 (P1 recovery timing)** — will track whether P1 cost-of-waiting affects D-01 protocol and brief-runner-v0 cycle time.
   - **L25 (security hygiene in result files)** — will codify the bearer-token redaction pattern as standard for any brief touching authentication-related cron commands.

### Open dependencies for the apply session

Before cc-0007 can apply:

- **Pre-flight §1.1** confirms jobid 5 active=true + invokes ai-worker.
- **Pre-flight §1.2** confirms persistent 401 UNAUTHORIZED_INVALID_JWT_FORMAT pattern (≥ 50 in 6h, no self-resolution).
- **Pre-flight §1.3** confirms `[functions.ai-worker]` block missing OR present with verify_jwt=true.
- **Pre-flight §1.4** establishes whether publisher is also at risk (informational; PK directs defensive scope).
- **Pre-flight §1.5** confirms ai-worker last deploy is NOT already at verify_jwt=false.
- D-01 fire passes clean.
- PK explicit approval phrase received.

When all hold: apply session can proceed.

**No M8 dependency. cc-0007 can apply independently of cc-0005 v4 status.**

---

*Brief authored 2026-05-09 Sydney by chat. Inputs: CC's read-only HTTP 401 triage 2026-05-09; cc-0006 V4 observations; v2.54 video-worker recovery session record; v2.57 sync close. Output: full apply brief (5-step pre-flight + repo patch + CC shell deploy + V1–V4 verification + D-01 packet with ef_deploy action_type + rollback path + result-file convention). No production state changed by drafting. cc-0007 apply gated by §1 pre-flight + D-01 + PK approval. Awaiting PK direction to schedule apply session.*
