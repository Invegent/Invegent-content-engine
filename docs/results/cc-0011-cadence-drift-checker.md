# cc-0011 — cadence-drift-checker — RESULT ARTIFACT

**Status:** CLOSED-WITH-VERIFIED-VARIANCE
**Closed:** 2026-05-13 Sydney (v2.70 sync)
**Brief:** `docs/briefs/cc-0011-cadence-drift-checker.md` v1.2 frozen at commit `b9ef92e594cae7f7d4c8f0ed97cb20b4ba2d9028` (blob `da8abd38afded545ac1444ca1ed8037fbffa1965`)
**Close basis:** Stage E retry run `7389ccc0-797f-4f6f-9b0f-ebe394344927` succeeded at 2026-05-13 08:30:52 UTC.

---

## 1. Delivery summary by stage

| Stage | Outcome | Identifier(s) |
|---|---|---|
| **A** — schema foundation | APPLIED | Migration `cc_0011_r_cadence_drift_log_and_views_foundation` recorded. r.cadence_drift_log table + 5 indexes + 4 CHECK constraints + 5 FK constraints + r.set_updated_at trigger; r.mv_observer_freshness_summary (14 rows); r.mv_reconciliation_daily_matrix (112 rows); both UNIQUE indexes on MV; r.refresh_cc_0011_views() SECURITY DEFINER helper (service_role EXECUTE). Case C run_type extension honoured — `r.reconciliation_run.run_type` constraint unchanged at 9 values (`cadence_drift_check` already present from cc-0010A seed). |
| **B v1** — EF source authored | MERGED | Feature branch `feat/cc-0011-cadence-drift-checker` → main FF-merge at commit `de81e52affb0629a721bfa814541758964e5ceab`. 5 files / 1,124 insertions: `supabase/functions/cadence-drift-checker/{deno.json, index.ts, lib/db.ts, lib/drift.ts}` + `supabase/config.toml` (+3 lines for `[functions.cadence-drift-checker] verify_jwt = false`). All 8 brief §7 grep checklist gates PASS. PK directive overrides folded: #4 late-state log-only; #6 MV refresh start-of-run. |
| **B v2** — Var-D hotfix | MERGED | Hotfix branch `feat/cc-0011-vard-hotfix-matcher-config-column` → main FF-merge at commit `e48ead84cf7fa160157a3467b9a8e590b3e1c7e9`. 2 files / 3 insertions / 3 deletions: column-name swap `late_tolerance_minutes` → `minutes_late_tolerance` at exactly 3 sites (lib/db.ts L206 fetchMatcherConfig select; lib/drift.ts L80 MatcherConfigRow field; lib/drift.ts L179 resolveLateToleranceMinutes accessor). Zero logic / threshold / auth / MV changes. |
| **C v1** — EF deploy | DEPLOYED | Edge Function `cadence-drift-checker` UUID `2e10f0e2-7823-4b71-a96e-8a99a651cdae` v1 ACTIVE; deployed via CLI v2.75.0 (`supabase functions deploy ... --no-verify-jwt`); duration 2,237 ms; updated_at 2026-05-13 07:50:17 UTC; verify_jwt=false; unauth POST → HTTP 401 `{"error":"unauthorized"}`. |
| **C v2** — Var-D redeploy | DEPLOYED | Same EF UUID `2e10f0e2-...` version bumped 1 → 2 ACTIVE; deployed via CLI; duration 1,768 ms; updated_at 2026-05-13 08:24:48 UTC; verify_jwt=false; unauth probes → HTTP 401. **L52 fourth-consecutive clean CLI deploy** (cc-0010B v2 + cc-0010C + cc-0011 v1 + cc-0011 v2). |
| **D** — cron install | INSTALLED | Migration `cc_0011_pg_cron_cadence_drift_checker` recorded. Cron jobid 85 `cadence_drift_checker_weekly` ACTIVE on `30 17 * * 0` UTC (Sundays 17:30 UTC = Mondays 03:30 Sydney AEST). Vault-backed via shared row `0fede5c3-f92c-4bd6-8837-c0e304dfca4c` — **L42 fully reified at 4-job cardinality** (cron 82+83+84+85 all share same vault row). Body 3 fields per directive; 60s timeout; literal secret absence verified (`POSITION(decrypted_secret IN command) = 0`). |
| **E v1** — manual invocation | FAILED → VAR-D SURFACED | Run `dc568313-ffc3-4969-9427-c9ad8e669a9f` (`triggered_by='cc-0011-stage-e-first'`); status=failed; error_summary=`"cc-0011 fetchMatcherConfig failed: column matcher_config.late_tolerance_minutes does not exist"`; duration 3,616 ms; 0 drift_log rows written; MV refresh DID execute pre-failure (Var-B observable). Retained as audit evidence; not deleted. |
| **E v2** — retry post-Var-D | SUCCEEDED | Run `7389ccc0-797f-4f6f-9b0f-ebe394344927` (`triggered_by='cc-0011-stage-e-second'`); status=succeeded; rows_processed=42; rows_inserted=3 (3 observer_stale findings — info severity — for (client, platform) pairs with no_evidence_ever); rows_updated=0 (Var-A invariance); rows_skipped=39; error_summary=null; duration 8,331 ms. Anti-write invariants all hold; ep/ipe/rm/mc deltas all zero. |

---
## 2. L45 truth table at close

| Variance / Finding | Source | Status at close | Evidence |
|---|---|---|---|
| **E1** — cadence_anomaly trigger/severity wording mismatch | Brief §3.1 internal inconsistency (trigger says |dev|>1; severity table says info=1-unit-dev). Implementation chose severity-table reading at `lib/drift.ts` L233–L239. | **ACKNOWLEDGED (carry forward)** — PK accepted at Stage B merge as non-blocking; deferred to future minor doc patch (v1.3 candidate). | Stage E v2 cadence_anomaly_count=0; not empirically discriminated this run. |
| **Var-A** — late-state log-only (brief §3.2 UPDATE deferred) | PK Stage B directive override #4. v1 EF emits drift_type='late'/'missing' findings to r.cadence_drift_log but does NOT UPDATE r.expected_publication.expected_status. | **RUNTIME-CONFIRMED HOLDS** — Stage E v2: `late_transitions=0`; `rows_updated=0`; ep_status histogram identical pre/post `{matched: 5, expected: 91, suppressed: 16}`. | Stage E v2 run row + summary_json + read-only ep_status histogram pre/post comparison. |
| **Var-B** — MV refresh ordering reversed (brief §3.3 end-of-run deferred) | PK Stage B directive override #6. v1 EF calls `r.refresh_cc_0011_views()` BEFORE drift evaluation at `index.ts` L134 (gated by `!dry_run`). | **RUNTIME-CONFIRMED HOLDS** — MV `refreshed_at` advanced from `2026-05-13 08:07:57.590 UTC` (pre-fire) to `2026-05-13 08:30:53.151 UTC` (post-fire); summary_json `mv_refresh.mv_*_refreshed_at = 2026-05-13T08:30:53.030Z` confirms refresh ~750ms into the 8.3s run, BEFORE the 3 observer_stale findings were classified from freshly-refreshed MV data. | Stage E v2 timestamps + summary_json + 3 successful observer_stale rows requiring valid MV reads. |
| **Var-C** — §2.1 stray `evidence_at` cosmetic reference | Brief authoring carry from v1 — §2.1 reads-columns-of-interest list still names `evidence_at` (a non-existent column that was the original source of the cc-0011 Stage A apply HALT). | **NOT RUNTIME-OBSERVABLE (carry)** — prose-only; SQL surfaces all consume v1.2-corrected `COALESCE(published_at, created_at)` path successfully. mv_observer_freshness_summary refreshed cleanly during Stage E v2; 3 observer_stale rows showed valid `last_evidence_at: null` semantics. PK may fold into future minor doc patch. | Stage E v2 mv_refresh success + observer_stale findings with valid drift_details. |
| **Var-D** — matcher_config column name mismatch | EF source v1 assumed `late_tolerance_minutes`; actual cc-0010A r.matcher_config column is `minutes_late_tolerance` (integer NOT NULL, value=60 in global default). Same defect class as cc-0011 Stage A apply HALT (brief-time column-name assumption error). | **RESOLVED** — Stage B v2 hotfix `e48ead84` (3-site column-name swap) + Stage C v2 redeploy (EF v2 ACTIVE); Stage E v2 reached fetchMatcherConfig + downstream flow without column-not-found error. | Stage E v2 status='succeeded'; error_summary=null; full EF flow executed. |
| **Var-E** — under-detection of per-row drift findings | Suspected `expected_window_end` date-parsing in `classifyExpectedRow` at `lib/drift.ts`: `new Date(\`${ep.expected_window_end}T00:00:00Z\`)` assumes YYYY-MM-DD but may receive full timestamptz from PostgREST → `Number.isNaN(windowEndUtc)` early-return null for all per-row classifications. | **OBSERVATIONAL CARRY** — PK accepted as non-blocking at close per directive scope ("succeeded or partial-with-expected-warnings → READY"). Stage E v2: rows_processed=42, rows_inserted=3 (all aggregate observer_stale; 0 per-row late/missing) despite 29 baseline candidates past 60min tolerance. Aggregate classifiers unaffected (don't share the date-parsing path). | Stage E v2 summary_json `drift_findings: {late:0, missing:0, cadence_anomaly:0, observer_stale:3}` vs baseline `late_missing_candidate_count: 29`. Deferred to future minor amendment or v1.4 brief patch. |

---
## 3. Production state delta (cc-0011 contribution)

**Schema additions:**
- `r.cadence_drift_log` table (0 rows at Stage A; 3 rows after Stage E v2)
- `r.mv_observer_freshness_summary` (14 rows; Stage A initial materialisation; refreshed twice — once at Stage E v1 pre-failure, once at Stage E v2)
- `r.mv_reconciliation_daily_matrix` (112 rows; same refresh history)
- `r.refresh_cc_0011_views()` SECURITY DEFINER function

**Edge Function additions:**
- `cadence-drift-checker` UUID `2e10f0e2-7823-4b71-a96e-8a99a651cdae` v2 ACTIVE on production (UUID preserved across v1→v2 redeploy)

**Cron additions:**
- jobid 85 `cadence_drift_checker_weekly` on `30 17 * * 0` UTC (Sundays 17:30 UTC = Mondays 03:30 Sydney AEST); vault-backed via shared row `0fede5c3-...`; 60s timeout; active=true

**Audit row additions (during cc-0011 work):**
- 2 new `r.reconciliation_run` rows with `run_type='cadence_drift_check'`:
  - `dc568313-ffc3-4969-9427-c9ad8e669a9f` — Stage E v1 (status=failed; Var-D evidence; retained)
  - `7389ccc0-797f-4f6f-9b0f-ebe394344927` — Stage E v2 (status=succeeded; close basis)

**Business-data row deltas vs Stage A baseline:**
- r.cadence_drift_log: 0 → 3 (Δ=+3; all observer_stale + info + no_evidence_ever from Stage E v2)
- r.expected_publication: 112 → 112 (Δ=0; Var-A invariance — no late-state UPDATEs)
- r.ice_publication_evidence: 31 → 31 (Δ=0)
- r.reconciliation_match: 5 → 5 (Δ=0)
- r.matcher_config: 1 → 1 (Δ=0)

**Reconciliation cron family complete at cc-0011 close:**

| jobid | name | schedule (UTC) | sync target |
|---|---|---|---|
| 82 | cadence_rule_generator_daily | `5 16 * * *` | cc-0009 cadence-rule-generator v5 |
| 83 | ice_evidence_materialiser_30min | `*/30 * * * *` | cc-0010B ice-evidence-materialiser v2 |
| 84 | reconciliation_matcher_30min | `15-59/30 * * * *` | cc-0010C reconciliation-matcher v1 |
| **85** | **cadence_drift_checker_weekly** | **`30 17 * * 0`** | **cc-0011 cadence-drift-checker v2** ← NEW |

All 4 jobs active=true; all 4 share vault row `0fede5c3-f92c-4bd6-8837-c0e304dfca4c` (L42 fully reified at 4-job cardinality).

**Edge Function inventory at close:**

| Slug | UUID | Version | Status | Updated_at UTC | Project |
|---|---|---|---|---|---|
| cadence-rule-generator | `68c57e7f-b513-4bc8-a4fa-4e95dea12592` | 5 | ACTIVE | 2026-05-11 07:11:02 | cc-0009 |
| ice-evidence-materialiser | `9f4d53e6-8aa4-486c-af56-c63738489d6c` | 2 | ACTIVE | 2026-05-13 01:57:27 | cc-0010B post-F4-hotfix |
| reconciliation-matcher | `daf4d9f1-b74d-48fe-9bd0-beec0ae43f64` | 1 | ACTIVE | 2026-05-13 05:33:14 | cc-0010C |
| **cadence-drift-checker** | **`2e10f0e2-7823-4b71-a96e-8a99a651cdae`** | **2** | **ACTIVE** | **2026-05-13 08:24:48** | **cc-0011 post-Var-D-hotfix** ← NEW |

---
## 4. Lesson reifications during cc-0011

**Promoted-eligible from this cycle:**
- **L42** fully reified at 4-job cardinality — cron 82+83+84+85 all share vault row `0fede5c3-...`. Single secret rotation point serves the entire reconciliation cron family.
- **L52** fourth-consecutive clean CLI deploy (cc-0010B v2 + cc-0010C + cc-0011 v1 + cc-0011 v2). When directives specify CLI as approved command, route direct to CLI rather than attempting MCP first. **Strong promotion candidate at next cycle.**
- **L53** preventive assertUuid pattern at 5 FK-source call sites in `lib/drift.ts`; zero FK-stamping violations observed at Stage E v2 (r2_violations=0 across 3 drift_log rows; vacuously satisfied but preventive pattern preserved).
- **L62 type-(c)** newly empirically used at Stage E v1 pre-flight — runtime EF failure (Var-D) was PREDICTABLE at pre-fire inspection via direct `information_schema.columns` probe of `r.matcher_config`. Fired single authorised invocation anyway per directive scope; runtime confirmed the prediction verbatim.

**NEW candidates surfaced this cycle:**
- **Candidate L55** — Stage B grep checklist should verify EF-source column-name strings against `information_schema.columns` for every read-target table named in the brief. Had this check existed at cc-0011 Stage B authoring, Var-D would have been caught at grep-checklist time instead of Stage E runtime. Companion to L54 (V-check authoring discipline).
- **Candidate L56** (informal) — `expected_window_end` and similar timestamptz columns returned by PostgREST may produce ISO-8601 timestamps not pure dates. EF-source date-parsing logic that concatenates `"T00:00:00Z"` should pre-validate input shape. Var-E candidate root cause; not empirically confirmed but suspected.

**Already-acknowledged carry forward:**
- L40, L41, L43, L46, L54 — all preserved unchanged from v2.69 close.

---

## 5. Close declaration

cc-0011 cadence-drift-checker is **CLOSED-WITH-VERIFIED-VARIANCE** at v2.70.

Reconciliation v1 family (cc-0009 + cc-0010A + cc-0010B + cc-0010C + cc-0011) = **CLOSED** end-to-end. All four EFs ACTIVE on production; all four cron jobs ACTIVE; all schema foundations live; all five sub-builds closed-with-variance or clean.

**cc-0012 = UNBLOCKED** (natural successor; scope TBD pending PK authoring direction).

Carry items for future minor doc patch (no production work required):
- E1 cadence_anomaly wording mismatch in brief §3.1
- Var-A late-state UPDATE deferred from brief §3.2 to v2 amendment
- Var-B MV refresh start-of-run vs brief §3.3 end-of-run
- Var-C §2.1 stray `evidence_at` cosmetic reference
- Var-E `classifyExpectedRow` date-parsing under-detection (suspected; not empirically confirmed)

---

*Artefact authored 2026-05-13 Sydney by chat at v2.70 sync close. Captures cc-0011 end-state per PK close directive scope ("Produce cc-0011 result artifact").*