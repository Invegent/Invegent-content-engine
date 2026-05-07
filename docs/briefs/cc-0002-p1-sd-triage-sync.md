# CC Brief 0002 — P1 SECURITY-DEFINER triage (B-RR sync-only)

**Status:** EXECUTED + CLOSED — 2026-05-07 Sydney (v2.50)
**Owner:** PK (orchestrator: chat) → executed: CC
**Repo:** github.com/Invegent/Invegent-content-engine
**Project:** mbkmaxqhsohbtwsqolns (ap-southeast-2)

**D-01 advisory:** `32ade261-5f99-4c75-a643-5a20c7c978ae` — partial → STEP C.5 corrected_action adopted; no re-fire per PK directive 2026-05-07.
**D-01 verification:** `9cbc7de3-537f-425c-8e77-b1245a76a2e1` — partial → corrected_action verified empirically (orphan-RPC finding surfaced; F-HEYGEN-RPC-MIGRATIONS-MISSING P2 logged).
**D-01 sync-close:** `4a48024f-e361-4876-b5a0-89651eb7c662` — partial → non-testable corrected_action; PK override approved per Lesson #62 v2.50 refinement; state-capture exception count for v2.50: 1.

**Closure artifacts:**
- `a83ab4c0` — chore(sync): align draft-notifier (under-threshold; 77 line changes; +15.0% size delta)
- `448eeb30` — chore(sync): align heygen-avatar-creator (under-threshold; 86 line changes; -9.3% size delta)
- `5aefd6e6` — chore(sync): align heygen-avatar-poller (held + diff reviewed in chat against actual artifact + PK approved; 269 line changes condition (i) breached; +34.3% size delta condition (ii) under)

**Standing rules in scope:** D-01, D-186, D-PREV-16, Lesson #62 (with v2.50 refinement), v2.48 §1.5 pre-flight default, v2.50 acceptance-integrity (generalised from v2.49 visual-acceptance integrity).

---

## OBJECTIVE

For each of the standing-three Edge Functions (`draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller`):

1. Confirm `scripts/safe-deploy.sh` BLOCKs at exit code 2.
2. Compare repo source vs deployed source.
3. Sync repo → deployed source if drift exists. Sync-only commit. NO redeploy. NO Supabase mutations. NO cron changes.

These three are class B-RR (regression risk, security-definer adjacent). They stay on the standing-three don't-redeploy list indefinitely. The sync work is repo-text alignment only — establishes a clean baseline so any future legitimate fix can diff cleanly.

---

## §1.5 PRE-FLIGHT (verify before coding)

1. Working tree clean: `git status --porcelain` returns empty. If not: STOP, surface to PK.
2. On main, current with origin: `git fetch && git status -sb`. If behind: `git pull` first.
3. `scripts/safe-deploy.sh` exists at sha `c82c36a9` (commit `3d43796` live as of v2.49). Mode 100755.
4. Env vars present:
   - `SUPABASE_SERVICE_ROLE_KEY` (used by safe-deploy.sh)
   - `SUPABASE_ACCESS_TOKEN` (used by `supabase functions download`)

   If access token missing: `supabase login` may be needed.
5. Repo path for each EF: `supabase/functions/<ef>/index.ts` (single file — confirmed via GitHub list_directory 2026-05-07). File sizes at HEAD:
   - `draft-notifier`: 5987 bytes
   - `heygen-avatar-creator`: 7365 bytes
   - `heygen-avatar-poller`: 8979 bytes
6. CLI: `supabase --version` should be ≥ 2.75. Confirm `supabase functions download` is available (`supabase functions --help`). If missing: STOP, surface to PK.

---

## EXECUTION (per EF, in this order)

For `ef in [draft-notifier, heygen-avatar-creator, heygen-avatar-poller]`:

### STEP A — safe-deploy gate check
```
./scripts/safe-deploy.sh <ef> --check-only
```
Expect: exit code 2, stderr contains `BLOCK <ef> — standing don't-redeploy list`, stdout JSON `{"reason":"standing-three","function_name":"<ef>"}`.

Capture: full stdout + stderr + exit code.

### STEP B — capture deployed source
Working dir = repo root.

```
git show HEAD:supabase/functions/<ef>/index.ts > /tmp/<ef>-repo-head.ts
supabase functions download <ef> --project-ref mbkmaxqhsohbtwsqolns
```

This writes (or overwrites) `supabase/functions/<ef>/index.ts` with deployed source.

### STEP C — diff capture
```
git diff --numstat supabase/functions/<ef>/index.ts
git diff --stat supabase/functions/<ef>/index.ts
git diff supabase/functions/<ef>/index.ts > /tmp/<ef>-diff.patch
```

Compute size delta:
- `head_size` = byte size of `/tmp/<ef>-repo-head.ts`
- `depl_size` = byte size of current `supabase/functions/<ef>/index.ts`
- `pct_delta` = `abs(depl_size - head_size) / head_size * 100`

### STEP C.5 — diff-size gate (per D-01 32ade261, PK 2026-05-07)

THRESHOLDS (either condition triggers STOP):
- (i) insertions + deletions > 100 lines
- (ii) `pct_delta` > 50%

If BOTH thresholds clear (under-threshold): proceed to Step D for this EF.

If EITHER threshold exceeded (at-or-over):
- STOP for this EF only. Other EFs proceed independently.
- Do NOT commit. Do NOT `git checkout --` (preserve working tree state for PK inspection).
- Report to chat: ef name + insertions + deletions + head_size + depl_size + pct_delta + full diff contents.
- Wait for explicit PK approval phrase: `proceed with <ef> sync`.
- Only after that phrase: resume Step D for this EF.

### STEP D — sync OR revert (under-threshold path, or after PK approval)

If git diff is EMPTY (deployed == repo HEAD):
```
git checkout -- supabase/functions/<ef>/index.ts
```
Mark `<ef>` = ALIGNED, no commit.

If git diff is NON-EMPTY:
```
git add supabase/functions/<ef>/index.ts
git commit -m "chore(sync): align <ef> repo to deployed source

B-RR sync-only. No redeploy. No behaviour change.
Standing don't-redeploy list (safe-deploy.sh STANDING_THREE).
See docs/00_action_list.md v2.49 + brief
docs/briefs/cc-0002-p1-sd-triage-sync.md."
```

Mark `<ef>` = SYNCED, capture commit SHA. Push at end (single push for all three): `git push origin main`.

---

## HARD CONSTRAINTS

- ✗ Do NOT run `supabase functions deploy` for any EF.
- ✗ Do NOT modify `scripts/safe-deploy.sh` STANDING_THREE list.
- ✗ Do NOT touch crons (no `cron.schedule`, no `cron.unschedule`).
- ✗ Do NOT execute SQL DDL or DML against Supabase.
- ✗ Do NOT modify any other files in this session.
- ✗ Do NOT remove any EF directory or file.
- ✓ Direct-push to main is OK per dev workflow standing rule (no PR ceremony required).
- ✗ Do NOT bypass STEP C.5 thresholds even if a diff "looks safe".

---

## ACCEPTANCE CRITERIA (CC self-checks before reporting)

- A1: 3× safe-deploy --check-only ran, all exit code 2.
- A2: 3× JSON outputs cite `reason="standing-three"`.
- A3: Deployed source captured for all 3.
- A4: Diff captured for all 3 (numstat + stat + full patch), even if empty.
- A5: STEP C.5 thresholds evaluated for all 3. For any EF over threshold: full diff reported to chat AND no commit fired until explicit PK "proceed with <ef> sync" phrase received.
- A6: Sync commits exist ONLY where drift detected AND EITHER under-threshold OR PK-approved.
- A7: Zero `supabase functions deploy` invocations in shell history.
- A8: Zero SQL executions against project (no `psql`, no curl to `/rest/v1/rpc/exec_sql` except what `safe-deploy.sh` runs internally).
- A9: Working tree clean after final push.

---

## EXECUTION OUTCOME (recorded post-execution 2026-05-07)

### A1–A4 safe-deploy outputs (all PASS, all exit 2)

```
===STEP A1: draft-notifier===
{"reason":"standing-three","function_name":"draft-notifier"}
[safe-deploy] BLOCK draft-notifier — standing don't-redeploy list. Update sync_state + action_list before removing.
EXIT_CODE=2

===STEP A2: heygen-avatar-creator===
{"reason":"standing-three","function_name":"heygen-avatar-creator"}
[safe-deploy] BLOCK heygen-avatar-creator — standing don't-redeploy list. Update sync_state + action_list before removing.
EXIT_CODE=2

===STEP A3: heygen-avatar-poller===
{"reason":"standing-three","function_name":"heygen-avatar-poller"}
[safe-deploy] BLOCK heygen-avatar-poller — standing don't-redeploy list. Update sync_state + action_list before removing.
EXIT_CODE=2
```

All three exited 2 via standing-three pre-DB block path; no schema fail-fast, no `exec_sql` calls fired during the gate path.

### Diff metrics

| EF | head_size | depl_size | pct_delta | ins | del | ins+del | C.5 result |
|---|---|---|---|---|---|---|---|
| draft-notifier | 5987 | 6885 | +15.0% | 57 | 20 | 77 | UNDER |
| heygen-avatar-creator | 7365 | 6679 | -9.3% | 34 | 52 | 86 | UNDER |
| heygen-avatar-poller | 8979 | 12059 | +34.3% | 157 | 112 | 269 | OVER cond (i) |

### heygen-avatar-poller held-diff semantic review (chat-side)

v1.0.0 → v2.0.0 architectural migration. 5 coherent change clusters:

1. Version + header bump documenting HeyGen endpoint discovery via browser network inspection.
2. `hgGet` / `hgPost` defensive hardening — text-first parse with JSON.parse try/catch, better non-JSON error messages.
3. `advanceGenerating` flow change — v1 went `generating → training` directly; v2 inserts an intermediate step (download generated image, re-upload to `HG_UPLOAD_BASE`, create avatar group via `HG_CREATE_GROUP`, transition to `creating` state via new RPC `advance_avatar_to_creating`).
4. `advanceTraining` rewrite — three-strategy fallback (`api2.heygen.com` group detail → look list → original `api.heygen.com` fallback). On success: `complete_avatar_training`. On no-avatar-found: `store_gen_poll_response` debug + `waiting:no_avatar_found`.
5. **Inline SQL → parameterised RPCs** — all four DML paths in v1 used `exec_sql` with `.replace(/'/g, "''")` quote-escaping; v2 replaces with named RPCs: `fail_avatar_generation`, `store_gen_poll_response`, `advance_avatar_to_creating`, `complete_avatar_training`. Net security posture **improves on read** — v2 is structurally safer than v1.

Direction-of-sync correct: repo aligned to what was already running in production. Standing-three gate prevents future redeploy regardless.

### F-HEYGEN-RPC-MIGRATIONS-MISSING (P2, NEW v2.50)

Diff review surfaced four RPCs called by heygen-avatar-poller v2.0.0 deployed source:
- `store_gen_poll_response`
- `advance_avatar_to_creating`
- `complete_avatar_training`
- `fail_avatar_generation`

Filename scan of `supabase/migrations/` (46 entries) found no matches. Scan caveat: filename-only scan, not file-content grep — confidence high but not 100%. Production EF works correctly, so RPCs definitely exist in DB; gap is migration-side (orphan-deployed). Pre-existing drift, not introduced by this sync. Logged as P2 backlog item: ~30 min next session via `pg_get_functiondef` (read-only) + new migration file.

### Anomalies / §1.5 deltas

- §1.5 step 4 delta: `SUPABASE_ACCESS_TOKEN` was NOT set in env. The `supabase` CLI auths via cached login state from a prior `supabase login` and worked correctly for `functions list` and `functions download`. No `supabase login` required during this run.
- §1.5 step 5 confirmed: file sizes at HEAD matched brief exactly (5987 / 7365 / 8979).
- Pre-flight step 2: local main was 1 commit behind origin (v2.49 docs sync `535489ed`); fast-forward pull applied before any work.
- Git emitted `LF will be replaced by CRLF` warnings on the Windows working copy when staging. Committed blob content is the deployed source verbatim — diff inspection confirmed real semantic changes, not line-ending churn. No CRLF rewrites in the committed text (autocrlf normalises to LF on commit).
- `supabase functions download` printed `WARNING: Docker is not running` but proceeded; CLI quirk for the download path only, did not block the operation.
- Diff inspection of `draft-notifier` confirmed the deployed source already calls `public.mark_drafts_notified(uuid[])`, referenced as a SECURITY DEFINER function in the deployed comment header. Sync brings repo into alignment with that contract; no SD-rights change in this work since no DDL/DML executed.

---

## REPORT FORMAT (verbatim from CC)

Received as documented in `docs/runtime/sessions/2026-05-07-p1-sd-triage-sync.md`.
