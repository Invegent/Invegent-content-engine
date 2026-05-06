# 2026-05-06 — F-EF-DRIFT-PREVENTION Stage 2a checkpoint — blocked on unexpected prior scan origin

> **STATUS: CHECKPOINT / HANDOFF.** Stage 2a is **NOT** marked complete. Cron migration **NOT** applied. No row deletions. No further writes pending PK direction.

## TL;DR

Stage 2a build went through 8 EF iterations (v1.0.0 → v1.0.8), ending with a multipart/form-data parsing fix that resolved a 47-of-47 false-positive-drift bug. Dry-run chunks 1–5 of v1.0.8 passed all six PK criteria. Manual chunked write of the baseline succeeded with intended scan_id `a2124145-…` (49 rows). Verification then surfaced an unexpected prior scan `bef6be96-…` (also 49 rows) at 03:24 UTC — six minutes before the intentional write — from an unidentified caller. `m.ef_drift_log` now has 98 rows. `m.vw_ef_drift_current` is internally consistent (49 latest-per-slug). **Stage 2a is BLOCKED pending investigation of the bef6be96 origin.**

## Confirmed checkpoint state (per PK enumeration)

1. `drift-check` v1.0.8 deployed (commit `d81de062`).
2. Multipart parsing fix worked.
3. Publisher now correctly classifies clean / Class A (deployed_hash_normalised matches CLI exactly).
4. Auto-approver still detects real Class C drift (4-byte diff at byte position 8790 — `\"` vs `"` inside template literal; Studio inline-edit signature).
5. Dry-run chunks 1–5 passed after the multipart fix.
6. Manual chunked write attempted with scan_id `a2124145-a519-4fbf-b0b0-1da28782f152`.
7. Verification found unexpected prior scan `bef6be96-dbca-4a1f-ba29-f9bbcb95f1b3`.
8. The unexpected scan inserted 49 rows around 03:24 UTC, before the intentional scan.
9. The intentional scan inserted another 49 rows around 03:30 UTC.
10. `m.ef_drift_log` currently has 98 rows.
11. `m.vw_ef_drift_current` returns the latest 49 rows and is internally consistent.
12. SD-risk slugs match expected: `draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller`.
13. Stage 2a is **BLOCKED** pending origin investigation of the unexpected `bef6be96` scan.
14. Cron migration was **NOT** applied.
15. Next session must begin with investigation of the unexpected scan origin before deciding whether to keep both scans, delete both, or accept current state.

## Iteration history (v1.0.0 → v1.0.8)

| Version | Commit | Issue resolved |
|---|---|---|
| v1.0.0 | `10c3d460` | Initial build |
| v1.0.1 | `4f7b73c3` | Reuse existing GITHUB_PAT; hardcode owner/repo/ref; derive PROJECT_REF |
| v1.0.2 | `3ed84967` | Rename SUPABASE_ACCESS_TOKEN → MANAGEMENT_API_TOKEN (CLI reserves SUPABASE_*) |
| v1.0.3 | `96fc6b6f` | Drop internal bearer self-validation (match draft-notifier convention) |
| v1.0.4 | `3b11975a` | banner-version parser fix (extractSemver for X.Y.Z) |
| v1.0.5 | `10dc05e4` | Chunked parallel via Promise.all (insufficient — still hit WORKER_RESOURCE_LIMIT) |
| v1.0.6 | `0188ebbd` | Multi-invocation chunking (offset/limit/scan_id; `[scan=<uuid>]` notes prefix) |
| v1.0.7 | `975a102e` | scan_id flows to writer as `p_run_id` → `drift_check_run_id` column (notes prefix removed) |
| **v1.0.8** | **`d81de062`** | **F1 multipart/form-data fix** — `fetchDeployedBody` now sends `Accept: multipart/form-data`, parses `Response.formData()`, reads `metadata.entrypoint_path`, picks file. Verified against `supabase/cli` source. |

## F1 multipart fix — root cause + verification

The Management API endpoint `GET /v1/projects/{ref}/functions/{slug}/body` returns `multipart/form-data` (the same wire format the supabase CLI's `downloadWithServerSideUnbundle` uses, per its source on `raw.githubusercontent.com`). v1.0.0–v1.0.7 read the response body as text, capturing boundary markers + headers + the file content. CRLF normalisation could not save it — the deployed_hash_normalised was always computed over multipart wire bytes, producing a universal 47-of-47 false drift.

**Fix in v1.0.8 `fetchDeployedBody`:**
- Set `Accept: multipart/form-data` request header
- Parse via `await response.formData()`
- Read `metadata` form value (JSON) to get `entrypoint_path`
- Pick the matching file part's content as the deployed body

**Verification (CLI ground-truth via `npx supabase functions download`, retained in `C:\Users\parve\AppData\Local\Temp\ef-drift-debug`):**
- **publisher** Class A: deployed_hash_normalised `91d26289…` matches CLI download exactly; repo_hash_normalised matches deployed → genuinely clean.
- **auto-approver** Class C: deployed `089f5a3e…` matches CLI download; repo `6f05095a…` matches local repo file; real 4-byte diff at byte 8790 (`\"` vs `"` inside template literal — Studio inline-edit signature).

## Writer fn migration (Stage 2a)

D-01 review_id `0a9012e7-ac0f-45ca-a5b2-bc3b1f8623c9` agree/proceed.

Migration `f_ef_drift_prevention_writer_accept_run_id` applied via `Supabase:apply_migration`. New signature:

```sql
public.write_ef_drift_log(p_rows jsonb, p_run_id uuid DEFAULT NULL)
```

Body byte-identical to Stage 1 except `v_run_id := COALESCE(p_run_id, gen_random_uuid())`. Verified via rolled-back tx: (a) default NULL → auto-gen; (b) explicit `p_run_id` → verbatim; (c) `is_first_observation` / `state_changed` / `previous_class` semantics preserved.

## Dry-run aggregate (v1.0.8) — all 6 PK criteria PASS

| # | PK check | Result |
|---|---|---|
| 1 | All HTTP 200 | ✅ chunks 1–5 |
| 2 | All `errors=[]` | ✅ |
| 3 | Class distribution plausible | ✅ A:16, A-LE:9, B-FD:1, B-RR:5, C:9, D:7, repo-only:2 = **49** |
| 4 | No return to 47/47 universal drift | ✅ Class C dropped from 34 (v1.0.6) to 9 |
| 5 | SD-risk count consistent with brief | ✅ exactly 3: `draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller` |
| 6 | repo-only rows only on chunk 1 | ✅ chunks 2–5 all `repo_only_count=0` |

## Chunked write — intended

D-01 review_id `d53c9918-0c71-419d-a641-0f49e7872c63` escalated on a single self-undermining objection ("non-atomic rollback… although there is a rollback plan in place"). Lesson #62 state-capture override invoked per PK pre-authorisation in directive ("If all dry-runs pass, proceed to option 2: chunked write with one shared scan_id"). Override logged transparently; T-MCP-08 1 → 2.

**scan_id:** `a2124145-a519-4fbf-b0b0-1da28782f152`

Five sequential write chunks (request IDs 96479-96484) at 03:30:33 – 03:32:44 UTC. All 5 returned HTTP 200 with `wrote_rows=true`, `errors=[]`. Cumulative rows-in-table verification 12 → 22 → 32 → 42 → 49 against scan_id matched exactly per chunk.

## Verification — anomaly

Per-scan summary:

| drift_check_run_id | rows | earliest UTC | latest UTC | first_obs=true | sd_risk |
|---|---|---|---|---|---|
| `bef6be96-dbca-4a1f-ba29-f9bbcb95f1b3` | 49 | 03:24:10.159 | 03:24:10.954 | 49 | 3 |
| `a2124145-a519-4fbf-b0b0-1da28782f152` (mine) | 49 | 03:30:33.025 | 03:32:44.817 | **0** | 3 |

Per-slug JOIN: 49 of 49 byte-identical (`current_class`, `severity`, `deployed_hash_normalised`, `repo_hash_normalised` match across both scans).

`m.vw_ef_drift_current` returns 49 rows — most-recent-per-slug = mine.

My scan correctly shows `state_changed=false` (49/49), `previous_class` populated (49/49), `is_first_observation=false` (0/49). The writer fn worked as designed against prior data — the bug isn't in the writer or my chunks; it's that someone/something inserted prior data before my intentional baseline.

## bef6be96 origin investigation — what's known

`net._http_response` audit, `version='drift-check-v1.0.8'`, 03:20-03:30 UTC:

| request_id | created (UTC) | scan_id | write | offset | wrote |
|---|---|---|---|---|---|
| 96453 | 03:21:09.491 | a4148a6e-… | false | 10 | 0 |
| 96454 | 03:21:09.491 | f471b56d-… | false | 20 | 0 |
| 96455 | 03:22:10.582 | 38995101-… | false | 30 | 0 |
| 96456 | 03:22:10.582 | 91fef771-… | false | 40 | 0 |
| **96457** | **03:24:06.786** | **bef6be96-…** | **true** | **0** | **12** |
| **96458** | **03:24:06.786** | **bef6be96-…** | **true** | **10** | **10** |
| **96459** | **03:24:06.786** | **bef6be96-…** | **true** | **20** | **10** |
| **96460** | **03:24:06.786** | **bef6be96-…** | **true** | **30** | **10** |
| **96461** | **03:24:06.786** | **bef6be96-…** | **true** | **40** | **7** |
| 96465-96468 | 03:25:15-03:27:07 | various | false | 10/20/30/40 | 0 (mine — chunks 2-5 dry-run) |
| 96479-96484 | 03:30:33+ | a2124145-… | true | 0/10/20/30/40 | 12/10/10/10/7 (mine — chunked write) |

**Pattern of bef6be96:** 5 concurrent invocations all completing at the same millisecond (03:24:06.78579 UTC) — this is a parallel-fire pattern (e.g., `Promise.all`), not a serial chunked write. Preceded by 4 dry-run chunks at 03:21-03:22 UTC (96453-96456) covering offsets 10/20/30/40 — no chunk-1 dry-run for that actor.

**Possible callers (none confirmed):**
- PK in a parallel session/script.
- An automation tool not registered in pg_cron (`cron.job` has no drift-check entries — verified).
- A dashboard action / Vercel deployment trigger.
- Another Claude session.

**Evidence to gather next session:**
- PK confirms or denies a parallel run.
- Check Cowork task history around 03:24 UTC (13:24 AEST 6 May).
- Check dashboard request logs (if available).
- Inspect Supabase EF logs for the `X-Forwarded-For` / Authorization fingerprint of requests 96457-96461.

## Functional state — what's safe

The data is internally consistent — both scans agree byte-for-byte. My scan correctly flags `state_changed=false` (49) and populates `previous_class` (49). View `m.vw_ef_drift_current` returns the right 49 rows.

The cron migration was **NOT** applied. PK directive: "Do not apply cron yet until the manual write and verification pass." Verification is BLOCKED on bef6be96 origin.

## Hard stops in effect (per PK directive)

- Do not mark Stage 2a complete.
- Do not apply cron migration.
- Do not delete any rows from `m.ef_drift_log` (98 rows preserved).
- Do not run more writes.
- Do not start dashboard / safe-deploy / P1 triage / NY×YT / M6.
- Next session must begin with origin investigation before any cleanup.

## Cleanup options for next session (PK to decide)

A. **Keep both scans** — `bef6be96` becomes the legitimate "first observation"; mine acts as a no-change second observation. Future runs compute `state_changed` against my scan (most recent). Pro: data integrity intact, view clean. Con: unexplained prior write remains in audit trail.

B. **Roll back both scans** — `DELETE FROM m.ef_drift_log` then re-run with full chain of custody. Pro: clean ledger. Con: loses the bef6be96 evidence record.

C. **Roll back `bef6be96` only** — breaks integrity of mine (mine references `previous_class` from `bef6be96` rows that no longer exist). **Not recommended.**

## Counters (this session)

- T-MCP-02 quota: 37 → 40 (Stage 1 closed at 37; this session +3: stage-2a EF deploy entry + writer-fn migration + chunked-write proposal).
- T-MCP-08: 1 → 2 (state-capture override on chunked-write proposal).
- Closure budget: ~5h this session. Day total ~7.5h. Trailing-14-day ~35h (well above 8.0 floor).

## D-01 review_ids this session (close-the-loop pending)

- `0a9012e7-ac0f-45ca-a5b2-bc3b1f8623c9` — writer-fn migration (agree, applied)
- `d53c9918-0c71-419d-a641-0f49e7872c63` — chunked-write proposal (escalated, state-capture override per PK pre-auth)
- (Earlier in session — TBD if separate review for v1.0.4-v1.0.8 deploy series; reconcile in next batch closure)

## Lesson candidates surfaced (defer to next session for canonical assessment)

- **#63** SUPABASE_* secrets namespace reserved by CLI — use `MANAGEMENT_API_TOKEN`.
- **#64** `verify_jwt:false` convention for auth bridges (drop internal bearer self-validation — match draft-notifier).
- **#65** EF resource limits ≠ wall-clock only — also memory/CPU per invocation; chunking must be multi-invocation, not Promise.all within one.
- **#66** Management API `/body` returns `multipart/form-data` — text-parsing produces false drift; must mirror CLI's parse path.
- **#67** Writer-fn caller-supplied `run_id` pattern enables chunked writes with shared correlation key.

## Resumption instructions for next session

1. **Read this checkpoint file first.**
2. **Investigate `bef6be96` origin** — start with PK direct question, then cross-check Cowork / dashboard / Vercel / Supabase EF logs.
3. **PK decides cleanup strategy** (A / B / C above).
4. After cleanup decision applied: PROCEED to cron migration (Stage 2a finalisation) only if PK approves.
5. Stage 2b dashboard panel and Stage 3 safe-deploy.sh remain sequenced after Stage 2a closes.
6. P1 SECURITY-DEFINER triage remains deferred until Stage 2b live.

## State preserved

- v1.0.8 deployed (commit `d81de062`).
- Writer fn patched (signature `(p_rows jsonb, p_run_id uuid DEFAULT NULL)`).
- 98 rows in `m.ef_drift_log` (preserved per PK directive).
- Local CLI-downloaded files retained in `C:\Users\parve\AppData\Local\Temp\ef-drift-debug` for further inspection.

---

*Session label: F-EF-DRIFT-PREVENTION Stage 2a checkpoint — blocked on unexpected prior scan origin.*
