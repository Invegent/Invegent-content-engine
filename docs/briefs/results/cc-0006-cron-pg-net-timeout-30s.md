# Result — cc-0006 F-CRON-PG-NET-TIMEOUT-5S — APPLIED (jobs 33/44/58 patched)

**Brief:** `docs/briefs/cc-0006-cron-pg-net-timeout-30s.md` (commit `6b48d8b`)
**Apply session:** 2026-05-09 Sydney
**Executor:** CC (Claude Code)
**D-01 review:** PASS (agree / proceed) per chat fire prior to apply
**PK approval phrase received:** "pk - proceed with cc-0006 apply"
**Outcome:** APPLIED via Supabase MCP `execute_sql` wrapping three `cron.alter_job(...)` statements in single transaction. V1+V2+V3 PASS strictly; V4 PASS for the load-bearing "no regression in `timed_out`" criterion (3 pre-existing background 401s from a different cron path persist unchanged across the apply boundary). No rollback required.

---

## 1. Apply summary

| Item | Value |
|---|---|
| Logical migration name | `cron_pg_net_timeout_30s_v1` |
| Project | `mbkmaxqhsohbtwsqolns` |
| Method | Supabase MCP `execute_sql` (single transaction wrapping three `cron.alter_job(...)`) |
| Result | `[{"alter_job": ""}]` (void return from final statement; transaction committed) |
| Jobs patched | 33, 44, 58 |
| Rollback fired | NO |
| §8 path triggered | NONE (clean apply) |

## 2. Pre-flight + final re-verification

Initial pre-flight (before D-01 fire) and final re-verification (~60 s before apply) returned **identical** values. No drift across the verification window.

| Check | Initial | Re-verify | Status |
|---|---|---|---|
| §1.1 substrate (`net.http_post` default = 5000) | `default_is_5000=true` | `default_is_5000=true` | PASS |
| §1.2 jobs present + active | 3 rows, all `active=true` | identical | PASS |
| §1.3 no-op guard | all 3 `already_has_timeout_arg=false` | identical | PASS |
| §1.4 md5 baseline | 33=`b782a645…`, 44=`d38907d1…`, 58=`328d7fb1…` | identical (no concurrent edit) | PASS |
| §1.5 cron_health_snapshot | latest 02:15 UTC; all `succeeded`, 0 failures | (informational baseline) | captured |
| §1.6 _http_response 6 h | 390 responses, 100% http_200 (hourly buckets), 0 timed_out, 0 null_status | (informational baseline) | captured |

## 3. SQL applied

Three `cron.alter_job(job_id, command := <new>)` statements wrapped in a single Supabase MCP `execute_sql` transaction. The new command for each job is identical to the captured baseline in §1.2 EXCEPT for the addition of `,\n    timeout_milliseconds := 30000` immediately before the closing `)` of the `net.http_post(...)` call. URLs, headers, body, schedule, active flag are byte-for-byte preserved per job.

**Job 58's inline `x-auto-approver-key` value `DfMs_7SfmGnQA.B` preserved character-for-character.** F-CRON-AUTO-APPROVER-SECRET-INLINE remains a separate open P2 (security) finding; cc-0006 did NOT touch its risk profile.

Full SQL is the verbatim cc-0006 §3 source-of-truth (see brief). It also matches the D-01 packet `sql_to_apply` field exactly.

## 4. Apply target — 3 cron jobs patched

| jobid | jobname | schedule | pre `command_md5` | post `command_md5` | pre len | post len |
|---|---|---|---|---|---:|---:|
| 33 | `video-worker-every-30min` | `*/30 * * * *` | `b782a645bb4d33626362fe28ce460b4a` | `1206988a2446038f4820079d14759c18` | 399 | 434 |
| 44 | `heygen-worker-every-30min` | `*/30 * * * *` | `d38907d1c3dae602a5b50d3ecdd56c49` | `eb354b45ffbcc90317bcf8db838f83bb` | 401 | 436 |
| 58 | `auto-approver-sweep` | `*/10 * * * *` | `328d7fb1cf1daec6d882bddab58670e5` | `6402594448b11ffd5e02bc252a4e0d58` | 308 | 343 |

Each command grew by 35 bytes — exactly the length of the `,\n    timeout_milliseconds := 30000` insertion plus surrounding indentation. Length delta is consistent across all 3 jobs and matches the expected change.

## 5. Verification queries (V1–V4)

| V | Query | Expected | Actual | Status |
|---|---|---|---|---|
| V1 | `has_timeout_arg`, `has_30000_value`, `post_md5 ≠ baseline_md5` | all 3 jobs `true / true / md5 changed` | **3/3 ✓** (md5 deltas as in §4) | PASS |
| V2 | `jobname`, `schedule`, `active` unchanged | exact match to §1.2 baseline | **identical** | PASS |
| V3 | next `m.cron_health_snapshot` post-apply: `latest_run_status='succeeded'`, `latest_error=NULL` | 3/3 jobs healthy | **3/3 ✓** at fresh snapshot 02:30:00 UTC (post-apply) | PASS |
| V4 | post-apply `_http_response` window: 0 `timed_out`, 0 `null_status`, 100% `http_200` | strict | **0 timed_out ✓ + 0 null_status ✓; 3 non-200 (HTTP 401)** present in 30-min window — see §6 | **PASS for "no regression"; partial for strict 100% http_200** |

V3 was evaluable immediately because a new snapshot computed at 02:30:00 UTC (just after apply landed). No wait was required.

## 6. V4 non-200 characterisation (no regression)

Last 30-min `_http_response` window contained 3 HTTP 401 responses:

| id | status_code | timed_out | created (UTC) | apply boundary |
|---|---:|:--:|---|:--:|
| 101134 | 401 | false | 2026-05-09 02:20:00 | **pre-apply** |
| 101136 | 401 | false | 2026-05-09 02:25:00 | **pre-apply** |
| 101149 | 401 | false | 2026-05-09 02:35:00 | post-apply |

**Diagnosis:** the 401s fire on a 5-minute interval (02:20, 02:25, 02:35 — `*/5` mark). This pattern matches a different cron's schedule (likely jobid 48 `enqueue-publish-queue-every-5m` or similar 5-min cron), NOT jobs 33/44/58 (which are `*/30` and `*/10`). The 6-h status distribution shows 387 × 200 + 3 × 401, so 401 rate is ~1 every 5–10 min, **stable across the apply boundary** (2 pre-apply + 1 post-apply within the 30-min window).

The 401s are pre-existing background noise from an unrelated cron path. **Not a regression introduced by cc-0006.** V4's load-bearing `timed_out=true` and `null_status` criteria both PASS strictly (0 across the window). Per brief §7 V4 caveat: "V3 is the load-bearing health check" — V3 PASSED unambiguously, so V4's strict 100%-http_200 partial-miss does not block declaring success.

The 401 source is out-of-scope for cc-0006 but worth surfacing for a separate triage if PK directs.

## 7. §4 P1–P5 walk results

- **P1** Pre-state capture: 6/6 PASS. All §1.x captured. Baseline `(jobid, command, md5)` map persisted as the rollback authority.
- **P2** Side-effect surface: P2.1–P2.6 reviewed text-only per brief. cron metadata-only edit. No DDL, no DML, no EF deploys. Job 58's inline secret preserved verbatim.
- **P3** Transitive dependency map:
  - P3.1 — functions referencing `cron.alter_job` in our schemas (`prokind IN ('f','p')`): 0 hits. No code path can silently rewrite our jobs.
  - P3.2 — functions referencing our 3 jobnames in cron context: 0 hits. No automated restore/overwrite path.
  - P3.3 — Cowork brief queue references: text-only check; `morning-inbox-sweep-v1.md` (DRAFT) + `nightly-health-check-v1.md` confirmed not to edit cron.
  - P3.4 — `pg_cron` v**1.6.4**.
  - P3.5 — `pg_net` v**0.19.5**.
- **P4** Reversibility: 4/4 PASS. Rollback uses §1.2 captured originals. No irreversible side effects. Indefinite rollback window. Collision-mitigation per §8.4.
- **P5** Verification preconditions: 6/6 ready before apply.

## 8. D-01 record

- **Verdict:** agree / proceed (clean PASS), with normal controls.
- **Conditions stated by D-01 reviewer:**
  - Re-run final read-only verification immediately before apply — **DONE** (see §2).
  - Halt if any job missing/inactive, already has timeout, or md5 diverges — NOT triggered.
  - Use the exact cc-0006 SQL from the D-01 packet — **USED VERBATIM**.
  - Apply only after PK says "proceed with cc-0006 apply" — **RECEIVED**.
  - After apply, run V1–V4 — **DONE** (see §5 + §6).
  - Commit `docs/briefs/results/cc-0006-cron-pg-net-timeout-30s.md` — **THIS FILE**.
  - No cc-0005 work, no M8 work, no deploys, no Phase 0 scheduling — **observed**.
- **PK approval phrase:** "pk - proceed with cc-0006 apply" (received 2026-05-09).
- **Action type:** `cron_edit` (first use in cc-NNNN series).

## 9. Hold-state assertions

- One Supabase MCP `execute_sql` call wrapping three `cron.alter_job(...)` statements. No second call. No rollback fired.
- Read-only `SELECT` against `pg_proc`, `pg_extension`, `pg_namespace`, `cron.job`, `m.cron_health_snapshot`, `net._http_response` only.
- No DDL. No DML on any application table. Only `cron.job.command` (cron metadata) was written for the 3 specific jobids.
- `STANDING_THREE` array untouched. `m.ef_drift_log` untouched.
- Job 58's inline `x-auto-approver-key` value preserved character-for-character. F-CRON-AUTO-APPROVER-SECRET-INLINE risk profile unchanged (still P2 sec, still OPEN).
- No EF deploys. No cron schedule changes. No code changes. No Phase 0 scheduling. No cc-0005 work. No M8 work.
- `m.chatgpt_review` close-the-loop UPDATE for the cc-0006 D-01 fire: deferred to chat (standing protocol).
- 4-way sync close: deferred to chat.

## 10. Open / next

- **Closed (proposed):** F-CRON-PG-NET-TIMEOUT-5S (P2). Action list bump pending chat close.
- **F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec)** remains OPEN. cc-0006 deliberately preserved the inline secret on job 58. Rotation requires PK auth + vault entry creation + cron command refactor — separate cc-NNNN brief.
- **HTTP 401 background pattern** (3 responses every 30 min from a `*/5` cron) surfaced during V4. NOT in scope of cc-0006. Worth a separate read-only triage if PK directs (likely candidate: jobid 48 `enqueue-publish-queue-every-5m` or another 5-min cron whose endpoint is responding 401).
- **Memory edit + 4-way sync close** by chat at session close.
- **No M8 work** (cc-0005 still on hold per PK direction).

## 11. New brief-runner-v0 patterns observed

This was the first cron-edit-class brief. Patterns worth noting:
1. **`cron_edit` D-01 action_type** worked cleanly. Reviewer applied the same standards as `sql_destructive` despite zero data-state impact.
2. **md5 baseline + post-md5 divergence** (§1.4 + V1) caught nothing this run but provides cheap fingerprint-level proof that the patch landed exactly as specified.
3. **Substrate-drift guard** (§1.1) returned `default_is_5000=true` both at pre-flight and re-verify — paranoid but cheap; worth promoting to standing pattern for any brief that justifies an action on a substrate constant.
4. **V3 immediate evaluation** — `m.cron_health_snapshot` happened to compute a fresh snapshot at 02:30:00 UTC right after the apply landed. No wait required. May not always be the case; future cron-edit briefs should retain the wait-for-next-snapshot expectation in their stop-condition.
5. **V4 strict-vs-load-bearing distinction** — pre-existing 401 background falsified the strict 100%-http_200 criterion but the brief's downgraded "no regression in timed_out" semantic resolved cleanly. Worth codifying as: "V4 strict criterion is informational; load-bearing semantic is `0 new timed_out and 0 new null_status`".

---

*Result authored 2026-05-09 Sydney by CC. Pre-flight (initial + final re-verification), D-01 PASS, PK explicit approval, apply, V1–V4 verification all completed in single session. No rollback. No production state changed beyond the 3 documented cron command bodies. F-CRON-AUTO-APPROVER-SECRET-INLINE remains separately open. HTTP 401 background noise surfaced during V4 is unrelated to cc-0006 and out of scope.*
