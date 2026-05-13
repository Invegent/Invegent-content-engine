# Session — 2026-05-13 Sydney — cc-0011 CLOSED-WITH-VERIFIED-VARIANCE (v2.70)

**Headline:** cadence-drift-checker EF v2 ACTIVE at `2e10f0e2-7823-4b71-a96e-8a99a651cdae`; cron 85 `cadence_drift_checker_weekly` installed at `30 17 * * 0` UTC; Stage E retry run `7389ccc0-797f-4f6f-9b0f-ebe394344927` succeeded with 3 observer_stale drift_log rows after Var-D column-name hotfix; cc-0011 closed; **reconciliation v1 family complete** (cc-0009 + cc-0010A + cc-0010B + cc-0010C + cc-0011 all closed end-to-end).

Full identifier register + L45 truth table + production state delta in companion result artifact: `docs/results/cc-0011-cadence-drift-checker.md`.

---

## Arc

Single-session traversal of all five cc-0011 stages plus Var-D hotfix sub-cycle, totalling 15 PK directives:

1. Brief v1 authoring (15-section template; 55,783 b)
2. Brief v1.1 patch (§5.1.4 run_type extension reshape)
3. Stage A apply attempt 1 — **HALTED** at `apply_migration` runtime: `column ipe.evidence_at does not exist`; atomic rollback clean; L62 type-(b) escalation
4. Brief v1.2 patch (PK Option C: `COALESCE(ipe.published_at, ipe.created_at)` substitution; §4.1.8 HALT-gate added)
5. Stage A apply attempt 2 — SUCCEEDED; r.cadence_drift_log + 2 MVs + helper function live
6. Stage B EF source authoring on `feat/cc-0011-cadence-drift-checker` (4 source files + config.toml; PK directive overrides #4 + #6 folded)
7. Stage B FF-merge to main at `de81e52`
8. Stage C CLI deploy v1 (EF UUID `2e10f0e2-...` v1 ACTIVE; 2.24s)
9. Stage D cron install (jobid 85; vault-backed; 4-job L42 reification)
10. Stage E manual invocation v1 — **FAILED**: Var-D surfaced (`fetchMatcherConfig` column-name mismatch); predicted at pre-flight, confirmed at runtime; HTTP 200 with status=failed payload
11. PK selected Option A (Var-D hotfix cycle); Stage B v2 hotfix authoring on `feat/cc-0011-vard-hotfix-matcher-config-column` (3-site column-name swap)
12. Stage B v2 hotfix FF-merge to main at `e48ead84`
13. Stage C CLI redeploy v2 (same UUID, version bumped 1→2; 1.77s)
14. Stage E retry — SUCCEEDED at run `7389ccc0-...` with 3 observer_stale findings
15. Close-out (this turn): close-the-loop no-op + result artifact + session log + sync_state + action_list

## Stages reified

| Stage | Action | D-01 fired by chat | Outcome |
|---|---|---|---|
| Brief v1 → v1.2 | 8 chunked `Add-Content` appends (WinError 206 pattern); v1.1 + v1.2 patches via `str_replace`-style PowerShell .Replace() | — (no D-01 fires by chat this session) | v1.2 frozen on main at `b9ef92e`; blob `da8abd38...`; size 61,740 b / 586 lines |
| A (attempt 1) | `apply_migration cc_0011_r_cadence_drift_log_and_views_foundation` v1.1 body | — | HALTED: `column ipe.evidence_at does not exist` at §5.1.2 MV definition; atomic rollback; no production state mutation |
| A (attempt 2) | `apply_migration` v1.2 body (COALESCE corrected) | — | APPLIED; r.cadence_drift_log + 2 MVs + r.refresh_cc_0011_views() + indexes + trigger; Case C honoured (no ALTER on r.reconciliation_run) |
| B v1 | EF source authoring; commit `de81e52`; 5 files / 1,124 insertions | — | merged to main via FF |
| C v1 | `supabase functions deploy cadence-drift-checker --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns` via CLI v2.75.0; 2,237 ms | — | EF `2e10f0e2-...` v1 ACTIVE |
| D | `apply_migration cc_0011_pg_cron_cadence_drift_checker` via Supabase MCP; cron jobid 85 installed at `30 17 * * 0` UTC; vault-backed | — | cron 85 ACTIVE; 4-job L42 reification complete |
| E v1 | Single `net.http_post` via `execute_sql` (pg_net request 107802); body `{observation_window_days: 14, mv_refresh_window_days: 30, triggered_by: 'cc-0011-stage-e-first'}` | — | FAILED: run `dc568313-...` status=failed; error_summary captured Var-D verbatim; HTTP 200 with failed payload; MV refresh DID execute pre-failure |
| B v2 | Var-D hotfix branch + commit `e48ead84`; 3-site column-name swap (db.ts L206 + drift.ts L80 + drift.ts L179) | — | merged to main via FF |
| C v2 | CLI redeploy via same command; 1,768 ms | — | EF `2e10f0e2-...` v2 ACTIVE (UUID preserved; version bumped 1→2); **L52 fourth-consecutive clean CLI deploy** |
| E v2 | Single `net.http_post` (pg_net request 107833); body `{..., triggered_by: 'cc-0011-stage-e-second'}` | — | SUCCEEDED: run `7389ccc0-...` status=succeeded; rows_processed=42; rows_inserted=3 (3 observer_stale info findings); error_summary=null; duration 8,331 ms |

## Key events (chronological — abbreviated; full identifiers in result artifact)

### Turn 1 — Brief v1 authoring
Authored `docs/briefs/cc-0011-cadence-drift-checker.md` v1 via 8 chunked `Add-Content` appends. Mirrors cc-0010C 15-section template shape. Final: 55,783 b / 575 lines / commit `043f2b81` / blob `8155d69b`. Main `a3203dd → 043f2b8` FF push.

### Turn 2 — Brief v1.1 patch
`§5.1.4` run_type extension reshape (Case A/B/C; placeholder + ADD VALUE IF NOT EXISTS pattern); §4.1.6 HALT rule added. Commit `35c0822f` / blob `e4feb7db`. v1.1: 58,719 b / 583 lines.

### Turn 3 — Stage A apply HALTED (L62 type-(b) escalation)
Read-only §4 pre-flight clean; Case C empirically confirmed (`'cadence_drift_check'` already in 9-value constraint). `apply_migration` v1.1 body **HALTED at runtime**: `ERROR 42703: column ipe.evidence_at does not exist`. Transaction-wrapped — clean atomic rollback (zero objects created; cc-0010 row counts intact). Direct `information_schema.columns` inspection of `r.ice_publication_evidence`: actual columns are `scheduled_for`, `published_at` (nullable), `created_at` (NOT NULL default now()), `updated_at` — NO `evidence_at`. Surfaced 3 substitution options to PK (A: created_at observer-fallback / B: published_at platform-truth / C: COALESCE both).

### Turn 4 — Brief v1.2 patch (PK Option C)
PK selected COALESCE substitution. `§5.1.2` rewrite — all 5 `ipe.evidence_at` refs replaced with `COALESCE(ipe.published_at, ipe.created_at)`; alias `last_evidence_at` preserved. §4.1.8 NEW pre-flight gate verifying both columns present + HALT rule if either absent. Commit `b9ef92e5` / blob `da8abd38`. v1.2: 61,740 b / 586 lines. **L40 + L46 + L62 type-(b) full cycle**: brief authoring defect → runtime catch → escalation → patch → re-fired pre-flight now includes preventive gate.

### Turn 5 — Stage A apply SUCCEEDED
v1.2 body applied cleanly. Production state added: `r.cadence_drift_log` table + 5 named indexes + PK + 4 CHECK constraints + 5 FK constraints + `r.set_updated_at` trigger; `r.mv_observer_freshness_summary` (14 rows initial); `r.mv_reconciliation_daily_matrix` (112 rows initial); `r.refresh_cc_0011_views()` SECURITY DEFINER with `proconfig=["search_path=\"\""]` + service_role EXECUTE; PUBLIC absent from `proacl`. Case C honoured — `r.reconciliation_run.run_type` constraint unchanged at 9 values (byte-for-byte identical pre/post via `pg_get_constraintdef`). cdl=0; cc-0010A/B/C row counts intact.

### Turn 6 — Stage B EF source authoring
Branch `feat/cc-0011-cadence-drift-checker` created from main. Four EF source files authored under `supabase/functions/cadence-drift-checker/`:
- `deno.json` (208 b, blob `4628b859`)
- `index.ts` (11,496 b / 275 lines, blob `b92722cd`) — 11-step HTTP handler flow; `refreshDriftViews()` at L134 BEFORE reads (PK directive #6); 0 r.expected_publication UPDATE call sites (PK directive #4)
- `lib/db.ts` (11,535 b / 251 lines, blob `6cd3fabe`) — service-role helpers; `ensureCronSecret`, `openReconciliationRun`/`closeReconciliationRun` (run_type='cadence_drift_check'), `refreshDriftViews` (.rpc('refresh_cc_0011_views')), 6 fetch helpers including soft-fail `fetchCadenceRules` cross-schema
- `lib/drift.ts` (20,771 b / 467 lines, blob `ff5d8890`) — pure functions: `assertUuid` (L29; L53 fail-fast); `computeDriftWindow` (Sydney-local UTC+10); `resolveLateToleranceMinutes`; `classifyExpectedRow` per-row late/missing; `classifyAggregateAnomalies` cadence_anomaly from MV+rules; `classifyObserverStale` from MV; `buildDriftLogRowsForInsert` with R2 + L53 protections (5 assertUuid call sites at L454/462/468/481/499)

`supabase/config.toml` edited (+3 lines at L98 after `reconciliation-matcher`) — line-aware insertion fallback after initial multi-line `.Replace()` failed on line-ending mismatch.

Stage B 8-line grep checklist PASS: 0 platform_observation* refs; 4 drift_type strings; 3 drift_severity strings; assertUuid def + 5 call sites; 0 expected_status='late' UPDATE sites (Var-A); 1 refreshDriftViews(client) call (Var-B); 3 R2 stamping sites; 1 ensureCronSecret call.

Commit `de81e52a` on feature branch; pushed; main untouched at `b9ef92e`.

### Turn 7 — Stage B FF-merge to main
Pre-merge state verification (read-only `execute_sql` for Stage A schema state); all gates clear; `git merge --ff-only` → `Updating b9ef92e..de81e52 Fast-forward`; push `b9ef92e..de81e52 main -> main`. CCH R11 honoured. main HEAD = `de81e52`. PK accepted **E1 cadence_anomaly trigger/severity wording mismatch** (brief §3.1 internal inconsistency between trigger language and severity table) as non-blocking carry forward.

### Turn 8 — Stage C CLI deploy v1
Pre-flight L41 clean; CLI v2.75.0; deploy duration 2,237 ms; exit 0; all 4 assets uploaded. EF UUID `2e10f0e2-7823-4b71-a96e-8a99a651cdae` v1 ACTIVE; updated_at 2026-05-13 07:50:17 UTC; verify_jwt=false; 2 unauth POST probes → HTTP 401. **L52 third-consecutive clean CLI deploy.**

### Turn 9 — Stage D cron install
First §4.4 pre-flight attempt failed on cosmetic placeholder `supabase_functions.hooks` dummy probe (non-existent relation; my authoring error; no production side-effect). Recovered with clean pre-flight: migration name unique; vault row resolvable (id `0fede5c3-...` continuity); jobname unique; no exact-schedule collision at `30 17 * * 0` (co-fire with cron 83 at :30 minute accepted per directive carry). `apply_migration cc_0011_pg_cron_cadence_drift_checker` body per brief §5.6: `SELECT cron.schedule('cadence_drift_checker_weekly', '30 17 * * 0', $$ SELECT net.http_post(... vault subquery ... 3-field body ... timeout_milliseconds := 60000); $$)`. Response `{success: true}`. cron jobid 85 allocated; active=true; literal secret absent from command. **L42 fully reified at 4-job cardinality.**
### Turn 10 — Stage E manual invocation v1 (FAILED; Var-D surfaced)
First §4.5 baseline-capture attempt ALSO failed on `late_tolerance_minutes` column reference (same defect class — I had encoded the wrong column name in both EF source AND the baseline-capture query). Re-ran baseline cleanly. Discovered via direct `information_schema.columns` probe that actual cc-0010A r.matcher_config column is `minutes_late_tolerance`, not `late_tolerance_minutes`. **L62 type-(c) pre-flight prediction**: EF source `lib/db.ts fetchMatcherConfig` (L206) + `lib/drift.ts MatcherConfigRow` (L80) + `lib/drift.ts resolveLateToleranceMinutes` (L179) all reference `late_tolerance_minutes`; the EF would fail at fetchMatcherConfig PostgREST 42703 error.

Fired the single authorised `net.http_post` anyway per directive scope ("perform exactly one authorised manual invocation" + failure-capture branch). pg_net request 107802. After `pg_sleep(8)`, verified: HTTP 200 from EF with `status='failed'` payload; run row `dc568313-ffc3-4969-9427-c9ad8e669a9f`; error_summary verbatim `"cc-0011 fetchMatcherConfig failed: column matcher_config.late_tolerance_minutes does not exist"`. Var-D confirmed at runtime exactly as predicted at pre-flight. MV refresh DID execute pre-failure (advanced from `07:26:50 UTC` → `08:07:57.510 UTC`) — **Var-B start-of-run ordering observable in the failure trace**. Anti-write invariants intact (ep/ipe/rm/mc all unchanged; cdl=0; ep_status histogram identical).

L45 truth table v1: Var-A + Var-B observed HOLD; Var-C + E1 not runtime-observable; **Var-D blocks close**. Returned **NEEDS HUMAN DECISION**.

### Turn 11 — PK Option A directive: Var-D hotfix cycle
PK selected Option A (Var-D source patch + redeploy + Stage E rerun). Scope: fix matcher_config column-name mismatch only; 3 minimal source edits; no logic/threshold/auth/MV/docs changes; source-only this turn.

Hotfix branch `feat/cc-0011-vard-hotfix-matcher-config-column` created from main HEAD `de81e52`. Pre-edit grep confirmed exactly 3 occurrences of `late_tolerance_minutes` at the 3 directive-named sites. Applied 3 minimal swaps via guarded `.Replace()` (each guarded by exactly-1-match assertion):
- Edit A: `lib/db.ts` L206 `.select(...)` column list
- Edit B: `lib/drift.ts` L80 MatcherConfigRow interface field
- Edit C: `lib/drift.ts` L179 resolveLateToleranceMinutes accessor

Post-edit grep: 0 old-name + 3 new-name at expected sites. Stage B 8-line grep checklist re-verified PASS (no protections or structural elements touched). Diff vs main: 2 files / 3 insertions / 3 deletions (column-name swap only; nothing else changed).

Commit `e48ead84cf7fa160157a3467b9a8e590b3e1c7e9` on hotfix branch; pushed to origin; main untouched.

### Turn 12 — Stage B v2 hotfix FF-merge to main
Pre-merge state verification clean; `git merge --ff-only` → `Updating de81e52..e48ead8 Fast-forward`; push clean. main HEAD `e48ead84`. Diff stat matches commit verbatim (2 files / 3 insertions / 3 deletions; no extra changes).

### Turn 13 — Stage C CLI redeploy v2
Pre-flight L41 clean; deploy duration 1,768 ms (faster than v1's 2,237 ms — same-day cache-warm advantage); exit 0; all 4 assets uploaded. EF UUID `2e10f0e2-...` **version bumped 1 → 2 ACTIVE** (UUID preserved per Supabase EF deployment semantics); updated_at advanced from `07:50:17 UTC` (v1) to `08:24:48 UTC` (v2). 2 unauth POST probes → HTTP 401. Patched-source grep proxy: 0 old-name + 3 new-name on main (which IS deployed source per L41 invariant). **L52 fourth-consecutive clean CLI deploy.**

### Turn 14 — Stage E retry (SUCCEEDED)
Baseline filtered for `triggered_by='cc-0011-stage-e-second'` returned 0 rows. Single `net.http_post` fired (pg_net request 107833). Body verbatim per directive. After `pg_sleep(8)`, first verification query failed on cosmetic SQL composition error (`jsonb_object_keys` set-returning function inside `array_agg`); re-ran with simpler sample shape. **Outcome:** HTTP 200; run `7389ccc0-797f-4f6f-9b0f-ebe394344927`; status=**succeeded**; rows_processed=42; rows_inserted=3; rows_updated=0; rows_skipped=39; error_summary=null; duration 8,331 ms. Three observer_stale + info drift_log rows written (3 (client, platform) tuples with no_evidence_ever; instagram × 2 + youtube × 1). MV refreshed_at advanced from `08:07:57 UTC` → `08:30:53 UTC` (Var-B runtime-confirmed). Anti-write invariants all hold (ep/ipe/rm/mc Δ=0).

**Observed anomaly (Var-E candidate):** 0 per-row late/missing findings despite ~21 in-window 'expected'-status ep rows past 60-min tolerance. Suspected `classifyExpectedRow` date-parsing bug (`expected_window_end` treated as YYYY-MM-DD; PostgREST returns full timestamptz → `Number.isNaN` early-return null path). Aggregate classifiers unaffected (different code path; 3 successful observer_stale findings). PK accepted as **observational carry only** per directive scope ("succeeded → READY — cc-0011 may close"); not directive-blocking. Deferred to future minor amendment.

### Turn 15 — Close-out (this session) and 4-way sync
PK approved CLOSED-WITH-VERIFIED-VARIANCE. Close-the-loop UPDATE on `m.chatgpt_review` for `(status='escalated' AND cc-0011 string-match)`: 0 rows affected (no cc-0011 D-01 fires were ever made by chat this session — entire cc-0011 cycle was PK-directive-bound). 24 historical escalated rows untouched per v2.69 carry. 4-way sync commit produced:
- `docs/results/cc-0011-cadence-drift-checker.md` (NEW; full identifier register + L45 truth + lesson reifications)
- `docs/runtime/sessions/2026-05-13-cc-0011-closed-with-variance.md` (this file)
- `docs/00_sync_state.md` (new session index row + v2.70 inline section)
- `docs/00_action_list.md` (v2.70 ADDITIONS + Today/Next 5 update)

## L45 truth table (summary; full version in result artifact §2)

| Item | Status |
|---|---|
| E1 cadence_anomaly trigger/severity wording mismatch | ACKNOWLEDGED (carry) |
| Var-A late-state log-only | RUNTIME-CONFIRMED HOLDS |
| Var-B MV refresh start-of-run | RUNTIME-CONFIRMED HOLDS |
| Var-C §2.1 stray `evidence_at` cosmetic ref | ACKNOWLEDGED (cosmetic carry) |
| **Var-D matcher_config column name** | **RESOLVED via `e48ead84` + EF v2** |
| Var-E classifyExpectedRow under-detection | OBSERVATIONAL CARRY (PK accepted non-blocking) |

## Production state at close (summary; full inventory in result artifact §3)

- **EFs on production:** cadence-rule-generator v5 / ice-evidence-materialiser v2 / reconciliation-matcher v1 / **cadence-drift-checker v2 (NEW)** — all ACTIVE; all `verify_jwt=false`
- **Cron jobs on production:** 82 / 83 / 84 / **85 (NEW)** — all active=true; all share vault row `0fede5c3-f92c-4bd6-8837-c0e304dfca4c` (**L42 4-job reification complete**)
- **`r.*` row inventory at close:** ep=112 (`{matched:5, expected:91, suppressed:16}` unchanged); ipe=31; rm=5; mc=1; **cdl=3 (3 observer_stale + info; from Stage E v2)**; rr=31 (24 pre-existing + 2 cc-0011 cadence_drift_check + 5 natural cron 83/84 fires during the session window 07:08-08:31 UTC)
- **r.mv_observer_freshness_summary:** 14 rows; refreshed_at `2026-05-13 08:30:53 UTC`
- **r.mv_reconciliation_daily_matrix:** 112 rows; refreshed_at `2026-05-13 08:30:53 UTC`

## Lesson reifications (summary; full discussion in result artifact §4)

- **L40 + L46 + L62 type-(b) full cycle** at Stage A: brief authoring defect → runtime catch → escalation → patch → re-fired pre-flight now includes preventive §4.1.8 HALT-gate
- **L42 fully reified at 4-job cardinality** (cron 82+83+84+85 share single vault row)
- **L52 fourth-consecutive clean CLI deploy** (promotion-strong candidate at next cycle)
- **L53 preventive** assertUuid pattern at 5 FK-source call sites; r2_violations=0 at Stage E v2
- **L62 type-(c) NEW empirical use** at Stage E v1 pre-flight: runtime EF failure (Var-D) was PREDICTABLE via direct column inspection; fired anyway per directive scope; runtime confirmed prediction verbatim
- **Candidate L55** NEW (companion to L54): Stage B grep checklist should verify EF-source column-name strings against `information_schema.columns` for every read-target table. Would have caught Var-D at grep-checklist time instead of Stage E runtime
- **Candidate L56** NEW (informal): PostgREST may return full timestamptz where YYYY-MM-DD assumed; EF date-parsing logic should pre-validate input shape (Var-E suspected root cause)

## Final state

**cc-0011 = CLOSED-WITH-VERIFIED-VARIANCE at v2.70.** Reconciliation v1 family = CLOSED end-to-end (cc-0009 + cc-0010A + cc-0010B + cc-0010C + cc-0011 all closed-with-variance or clean). **cc-0012 = UNBLOCKED** (next eligible project; scope TBD pending PK direction).

**Operational state:** 4 reconciliation EFs ACTIVE, 4 cron jobs ACTIVE, full vault-backed auth chain (L42 4-job reification), schema foundation + matrix views + drift log all live; first natural cron 85 fire scheduled for Sunday 2026-05-17 17:30 UTC (Monday 03:30 Sydney AEST).

---

*Session log authored 2026-05-13 Sydney by chat at v2.70 sync close. Mirrors cc-0010C v2.69 session-log shape with adjustments for the 15-turn cc-0011 traversal (vs cc-0010C's 8 turns) and the Var-D hotfix sub-cycle. 6 read-only `execute_sql`, 1 close-the-loop UPDATE (0 rows affected — no-op), 2 `apply_migration` (Stage A + Stage D cron), 1 `net.http_post` (Stage E v1; failed), 1 `net.http_post` (Stage E v2; succeeded), 2 Supabase CLI deploys (v1 + v2), 5 chat-side git commits (brief v1 + v1.1 + v1.2 + Stage B v1 + Stage B v2 Var-D hotfix), plus this close-out commit. Zero chat-fired `ask_chatgpt_review` D-01s (PK-direct directive cadence — same operational mode as cc-0010C v2.69).*