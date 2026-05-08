# 2026-05-08 Sydney — video-worker v3.0.0 deploy + verify_jwt regression recovered (mid-v2.53)

**Outcome:** F-VIDEO-QUALITY-UPGRADE-A-B-C shipped via two CLI invocations within ~5 minutes:
1. `./scripts/safe-deploy.sh video-worker --allow-warn` → gate WARN/PASS, CLI `Deployed Functions on project mbkmaxqhsohbtwsqolns: video-worker`, exit 0. Repo `4ae5b5a` v3.0.0 took the slot, replacing deployed v2.1.0.
2. **Regression detected:** cron jobid 33 began 401'ing. Root cause: CLI default sets `verify_jwt: true` on the gateway when there is no `supabase/config.toml`. Cron post calls without a JWT.
3. **Recovery (same session):** `supabase functions deploy video-worker --no-verify-jwt`. Same v3.0.0 source, only the gateway flag flipped. Exit 0. Cron jobid 33 unblocked.

Two new P2 findings logged from a parallel investigation of cron auth patterns (auto-approver, compliance-monitor, ingest). Hold-state preserved: `STANDING_THREE` untouched, no other EFs deployed, no DB DDL/DML, no cron schedule changes.

---

## 1. Deploy chronology

| Time (UTC, approx) | Action | Outcome |
|---|---|---|
| Earlier | Pre-fire drift scan `6a381ec7-dc37-418c-8ff1-e7b8d76801ca` (06:17:56 UTC) | video-worker class B-FD, repo 3.0.0 ahead of deploy 2.1.0, `previous_class=A`, `state_changed=true`, severity P3 |
| Earlier | D-01 fire `4e0e9c00-11d3-4096-afd3-ec765b296b36` | PASS (per chat) |
| Earlier | `safe-deploy.sh video-worker --allow-warn` | WARN line printed, gate PASS, CLI invoked, `Deployed Functions on project mbkmaxqhsohbtwsqolns: video-worker`, exit 0 |
| Mid-session | Cron jobid 33 begins returning 401 | verify_jwt regression surfaced |
| Same session | `supabase functions deploy video-worker --no-verify-jwt` | exit 0; gateway flag flipped to `verify_jwt: false` without source change |

Live deployed source unchanged across the two invocations — only the gateway auth flag differs.

## 2. verify_jwt regression — root cause and durable fix path

The CLI's gateway default is `verify_jwt: true` whenever there is no `supabase/config.toml`. A previous deploy of video-worker had `verify_jwt: false` set (matching the cron's auth-less invocation pattern). The first deploy of v3.0.0 today regressed that to `true` because the repo has never carried a `config.toml`.

Recovery used the explicit CLI override `--no-verify-jwt`. This is correct for the immediate fix but is not durable — any future deploy that omits the flag will re-regress. The durable fix is a `supabase/config.toml` with per-function `verify_jwt` settings tracked in repo. **Out of scope this session** (queued as a follow-up; see "open queued work" below).

## 3. Cron auth-pattern survey (Part 2 investigation)

Read `cron.job` rows for jobids 1, 31, 58 via service-role `exec_sql` SELECT. Cross-checked each slug against `m.vw_ef_drift_current` and against `supabase/functions/<slug>/`.

| jobid | jobname | schedule | active | auth in cron call | repo folder | drift class | status |
|---|---|---|---|---|---|---|---|
| 58 | `auto-approver-sweep` | `*/10 * * * *` | yes | header `x-auto-approver-key` (literal value) | `supabase/functions/auto-approver/` PRESENT | C (body-drift; banner equal at 1.6.0) | OK — needs `verify_jwt = false` once `config.toml` lands |
| 31 | `compliance-monitor-monthly` | `0 9 1 * *` | yes | none beyond `Content-Type` (no auth header) | MISSING | D (`repo_path_status=missing`; deploy 1.2.0; notes "Deployed slug has no repo directory.") | **F-CRON-COMPLIANCE-MONITOR-STALE — P2 (NEW)** |
| 1 | `rss-ingest-run-all-hourly` | `0 */6 * * *` | yes | header `x-ingest-key` (vault secret) | MISSING | D (`repo_path_status=missing`; deploy `ingest-v8-youtube-channel`) | **F-CRON-INGEST-STALE — P2 (NEW)** |

### 3.1 ingest — git-history rename hunt

Git log shows the prior repo location was `supabase/functions/Ingest/index.ts` (capital I). It was removed in commit `961482c` on 2026-03-08:

```
chore: remove stale Ingest folder (superseded by ingest v75)
 supabase/functions/Ingest/index.ts | 637 -------------------------------------
```

The removal note says "superseded by ingest v75" but the lowercase `ingest/` folder was never re-added, so the deployed slug (currently `ingest-v8-youtube-channel`) no longer has a corresponding repo source. This explains the Class D classification.

**Conclusion:** ingest is stale. Per brief direction, **exclude from `config.toml`** when that work lands, and pursue F-CRON-INGEST-STALE separately.

### 3.2 compliance-monitor — no rename evidence

No commit in `git log --diff-filter=D` references `compliance-monitor` under `supabase/functions/`. The deployed slug appears never to have had a repo source in this repo's history (or it was moved before history begins for that path). Drift view classifies as Class D `repo_path_status=missing`.

**Conclusion:** stale; cannot be ingested into `config.toml` without first authoring or recovering the source.

### 3.3 auto-approver — no stale finding

Folder present at `supabase/functions/auto-approver/index.ts`. Drift class C means banner versions match (both 1.6.0) but bodies diverge — this is the body-drift trap, not a missing-source problem. **No new finding.** When `config.toml` work lands, include `auto-approver` with `verify_jwt = false` (cron uses its own header `x-auto-approver-key`, not a JWT).

## 4. Drift round-trip — COMPLETED

Drift round-trip COMPLETED by chat earlier this session. Scan `cb7fe77b-2011-48cf-8ffc-806d63e535aa` at 2026-05-08 07:20:56 UTC.

video-worker:
- `current_class`  = `A-LE`
- `previous_class` = `B-FD`
- `state_changed`  = `true`
- `repo_version`   = `3.0.0`
- `deploy_version` = `3.0.0`

Textbook B-FD → A-LE post-deploy round-trip. Confirmed via `m.vw_ef_drift_current`.

## 5. m.chatgpt_review close-the-loop — COMPLETED

m.chatgpt_review close-the-loop COMPLETED by chat earlier this session. 4 reviews closed via UPDATE on `m.chatgpt_review` with `escalation_resolved_at`, `resolved_by`, `action_taken` populated:

- **`8bd6ac37-fa9e-43af-803f-75a171080554`** — `sql_destructive`, F-YT-PUB-AVATAR-EXCLUSION fire #1. Escalated → resolved by re-fire `fa4322e5` PASS. status: `resolved`. resolved_by: `chat-via-refire-fa4322e5-pass`.
- **`fa4322e5-69a7-4b77-a745-cdd0296dccc4`** — `sql_destructive` fire #2, PASS. action_taken: catalog UPDATE applied 2026-05-08 05:24:00.472666 UTC removing `youtube` from `t."5.3_content_format".platform_support` for `video_short_avatar`. status: `completed`.
- **`ee27dd37-472a-443c-b29d-dd07f8a8c7d3`** — `ef_deploy` video-worker fire #1. Escalated → resolved by re-fire `4e0e9c00` PASS. status: `resolved`. resolved_by: `chat-via-refire-4e0e9c00-pass`.
- **`4e0e9c00-11d3-4096-afd3-ec765b296b36`** — `ef_deploy` video-worker fire #2, PASS. action_taken: deploy completed + verify_jwt regression+recovery saga documented inline. status: `completed`.

## 6. YT cadence retraction

Prior-session memory entry claimed NDIS-Yarns / Property Pulse YouTube had a "~3-day cadence" with "next fill 49h forward". **INCORRECT.**

Actual state:
- **NDIS-Yarns YouTube:** Mon–Fri 19:00 AEST / 09:00 UTC, **5 slots/week**.
- **Property Pulse YouTube:** Mon–Fri 17:00 AEST / 07:00 UTC, **5 slots/week**.
- Slot pipeline healthy via cron jobid 72 nightly (`m.materialise_slots(7)`) + jobids 73/75/76 slot processing.

Root of error:
- Sat–Sun weekend gap mislabelled as "cadence".
- `fill_window_opens_at` conflated with `scheduled_publish_at`.

System issue: NONE. Reporting issue: corrected. Memory `recent_updates` v2.54 entry will reflect this retraction (chat-owned at session end).

## 7. Hold-state assertions

| Constraint | Status |
|---|---|
| `STANDING_THREE` array in `scripts/safe-deploy.sh` | unchanged |
| Other EFs deployed | none (only video-worker, twice) |
| Cron schedules altered | none |
| DB DDL / DML executed | none (only read-only `SELECT` via `exec_sql` for drift view + `cron.job` survey) |
| `supabase/config.toml` | not created (deferred — durable fix for verify_jwt regression vector) |
| Files modified in repo | session file (this) + action_list deltas (this turn). No `supabase/functions/<slug>/index.ts` edits. |

## 8. Acceptance integrity (per v2.50 standing rule)

- Deploy CLI confirmation lines captured (`Deployed Functions on project mbkmaxqhsohbtwsqolns: video-worker`).
- exit code captured (0).
- Pre-fire drift run id captured (`6a381ec7…`) — matches the brief's pre-fire scan.
- D-01 review id quoted from brief (`4e0e9c00…`); CC did not fire its own review.
- Cron auth survey results sourced from live `cron.job` table via service-role SELECT (not from documentation).
- Folder existence verified by direct `[ -d supabase/functions/<slug> ]` checks (not from documentation).
- `m.vw_ef_drift_current` queried for each slug; `repo_path_status` field used to corroborate folder check.
- No acceptance asserted on summary/signal alone.

## 9. Open queued work

### 9.1 Closed in this turn (v2.54)

- **Durable verify_jwt fix: COMPLETED in this turn.** `supabase/config.toml` covers 23 EFs (10 custom-header + 13 service-role). Excluded as stale: `ingest`, `compliance-monitor`, `pipeline-ai-summary`, `pipeline-doctor` (all 4 confirmed missing during pre-flight folder check; per source-recovery commit `8ee27b4` 30 Mar 2026, the latter two were in the deploy-only ghost bucket of 9 EFs and never recovered). Commit SHA recorded in v2.54 close.
- **Drift round-trip:** completed by chat earlier this session — see Section 4.
- **m.chatgpt_review close-the-loop:** completed by chat earlier this session — see Section 5.
- **YT cadence retraction:** captured in Section 6 + sync_state v2.54.

### 9.2 v2.54 → v2.55 deferred actions

- **F-CRON-PG-NET-TIMEOUT-5S (P2)** — cron timeout fix for jobid 33 (video-worker), 44 (heygen-worker), 58 (auto-approver). Proposed: `cron.alter_job` to add explicit `timeout_milliseconds := 30000`.
- **F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 security)** — secret rotation + vault refactor. PK approval required for rotation; chat refactors via `cron.alter_job` matching the vault pattern in jobid 1/4/27/33.
- **F-CRON-INGEST-STALE (P2)** + **F-CRON-COMPLIANCE-MONITOR-STALE (P2)** + **F-CRON-PIPELINE-AI-SUMMARY-STALE (P2)** + **F-CRON-PIPELINE-DOCTOR-STALE (P2)** — four deploy-only ghost slugs. PK decision per slug: re-author repo source OR formally retire deployed slug + cron.
- **First deploy that uses the new `config.toml` WILL require D-01.** Suggested validation deploy candidate: a controlled redeploy of one custom-header EF (e.g. `content_fetch`) post-`config.toml` to verify the gate flag is preserved across redeploys.
- **Music library activation checklist (P3 PK action)** — bucket + 9 mp3 tracks + env var `VIDEO_WORKER_MUSIC_ENABLED=true`. video-worker v3.0.0 already ships music gated OFF; activation requires no second deploy.
- **Emergency redeploy governance question (P2 PK decision)** — does bounded production-restoration require expedited D-01 fire, or is it exempt when reversible? Document outcome in `docs/06_decisions.md`.
- **Memory `recent_updates` v2.54 entry** — chat handles at session end via memory_user_edits; out of scope for CC.
- **PHASES reconciliation** — now **10th**-deferred; needs dedicated session (this v2.54 turn does not touch the dashboard repo).

## 10. Commits

- This session file: this turn's content-engine commit (see action_list `Mid-v2.53` block).
- Action_list deltas: same commit as session file.
- Dashboard `roadmap/page.tsx` PHASES + LAST_UPDATED: separate commit, separate repo (`Invegent/invegent-dashboard`).

T-MCP-02 cumulative: unchanged (CC fired no D-01 reviews this session — deploy used the brief's pre-fire `4e0e9c00`).
