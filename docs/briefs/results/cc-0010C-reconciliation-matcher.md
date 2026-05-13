# Result — cc-0010C reconciliation-matcher

**Brief:** `docs/briefs/cc-0010C-reconciliation-matcher.md` at v1 (frozen on main at commit `8204ab540a0775034b927e8c86d4cb255e8ace26`).
**Status:** **CLOSED-WITH-VERIFIED-VARIANCE.** Stage E proof came from the first natural pg_cron 84 fire rather than the brief's prescribed manual `triggered_by='cc-0010C-stage-e-first'` invocation. Same L43 pattern as cc-0010B v2.68 close.

---

## 1. Outcome

The reconciliation-matcher Edge Function is live in production at v1, runtime-validated against live data by the first natural cron 84 fire (`r.reconciliation_run` id `caee6e61-2b9d-4419-80b3-53ce5a342951`). 5 Tier-1 ICE matches written across 3 clients × 2 platforms; 5 corresponding `r.expected_publication` rows transitioned `expected → matched`; zero FK violations; zero CHECK violations; 754ms EF duration end-to-end. PRV-1 close gate criterion 3 (Tier 1 matching live for ICE-healthy clients) **empirically satisfied**.

## 2. Lineage (Stages B through E)

- **Authoring** (this session, turn 1): cc-0010C v1 brief re-authored from v2.68 context after prior in-session draft was confirmed non-persisted to disk. Source artefacts: cc-0010 parent brief, cc-0010A v1.5, cc-0010B v1.3, v2.68 close session log, PRV-0 v2 design lock. Brief frozen on main at commit `8204ab540a0775034b927e8c86d4cb255e8ace26` blob `cb47a188afc76570f854279ff62b65be4a78b805`, 53,580 bytes / 587 lines.
- **Stage B authoring** (this session, turn 2): EF source authored on feature branch `feat/cc-0010C-reconciliation-matcher` (commit `546fb79631fbe8db9d5fb8ad07f8c4c0bdf6aa02`). Five files / 1,184 insertions: `supabase/functions/reconciliation-matcher/deno.json` (336 b, blob `720edcbb`), `supabase/functions/reconciliation-matcher/index.ts` (16,988 b, blob `40a48d89`), `supabase/functions/reconciliation-matcher/lib/db.ts` (15,513 b, blob `23a507af`), `supabase/functions/reconciliation-matcher/lib/matcher.ts` (15,370 b, blob `4eaefdb3`), `supabase/config.toml` (+3 lines, blob `e27c5c41`). Tier-1 scope lock, D-21 pre-filter pattern, R2 run-id stamping (homogeneous-shape split), L53 `assertUuid` fail-fast all encoded.
- **Stage B merge** (this session, turn 3): FF-merge of `feat/cc-0010C-reconciliation-matcher@546fb79` to main per CCH R11; `8204ab5..546fb79 main -> main`; no merge commit (matches cc-0010B v2.68 FF precedent).
- **Stage C deploy** (this session, turn 4): `supabase functions deploy reconciliation-matcher --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns` via Supabase CLI v2.75.0 on PK's local Windows machine. Exit 0; duration 2,370 ms. EF id `daf4d9f1-b74d-48fe-9bd0-beec0ae43f64` v1 ACTIVE, verify_jwt=false. Two unauth POST probes both returned HTTP 401 `{"error":"unauthorized"}` — `ensureCronSecret` gate confirmed live.
- **Stage D cron install** (this session, turn 5): `apply_migration cc_0010c_pg_cron_reconciliation_matcher` via Supabase MCP. Cron jobid 84 `reconciliation_matcher_30min` ACTIVE at `15-59/30 * * * *` UTC. Vault-backed `CRON_SECRET` via inline subquery on `vault.decrypted_secrets` (same vault row `0fede5c3-f92c-4bd6-8837-c0e304dfca4c` reused). No literal secret in cron command (POSITION check). Body shape per directive: 3 fields `{horizon_days:7, backfill_days:0, triggered_by:'pg_cron_reconciliation_matcher_30min'}`.
- **Stage E equivalent** (this session, turn 6): First natural cron 84 fire at 2026-05-13 05:45:00.429 UTC (gateway enqueue) → EF start 05:45:02.464 → EF finish 05:45:03.219 UTC. `r.reconciliation_run` id `caee6e61-2b9d-4419-80b3-53ce5a342951`: status=`succeeded`, triggered_by=`pg_cron_reconciliation_matcher_30min`, rows_processed=72, rows_inserted=5, rows_updated=0, rows_skipped=67, derived_duration_ms=754, error_summary NULL. PK accepted as Stage E-equivalent at directive turn 7.

## 3. Variance disclosed

**Stage E proof method**: production-cron runtime execution (`triggered_by='pg_cron_reconciliation_matcher_30min'`) rather than the brief's prescribed manual fire (`triggered_by='cc-0010C-stage-e-first'`).

**Why accepted:** The brief's Stage E objective is "live production execution of the matcher against real data, producing a successful `r.reconciliation_run` row + Tier-1 match rows + corresponding `r.expected_publication` status transitions". The cron-triggered run satisfies this materially: succeeded status, 5 Tier-1 inserts, 5 status transitions, real production data across 3 clients × 2 platforms, full V-check battery PASS. Attribution string is the only difference. PK accepted at directive turn 7. Same L43 cron-fire-equivalent acceptance pattern as cc-0010B v2.68 close.

## 4. Production state changes (this session arc)

| Mechanism | Count | Detail |
|---|---:|---|
| Brief commit on main | 1 | `8204ab5` — cc-0010C v1 brief frozen |
| EF source commit on feature branch | 1 | `546fb79` — 5 files / 1,184 insertions |
| FF-merge to main (CCH R11) | 1 | `8204ab5..546fb79 main -> main`; no merge commit |
| Supabase CLI `supabase functions deploy` | 1 success | reconciliation-matcher v1 ACTIVE in 2.37 sec |
| `apply_migration` (Stage D) | 1 | `cc_0010c_pg_cron_reconciliation_matcher`; cron jobid 84 installed |
| `m.chatgpt_review` UPDATEs (close-the-loop) | 0 | No cc-0010C-pertinent rows present; D-01 review cycles happened off-loop between PK and CCD/Claude Code; chat fired zero `ask_chatgpt_review` calls this session |
| ChatGPT MCP `ask_chatgpt_review` D-01 fires (this session) | 0 | All Stage approvals issued by PK directive directly; no chat-side D-01 fires |
| GitHub commits (close-out 4-way sync) | 1 | This commit |
| `r.reconciliation_match` rows written | 5 | Via cron 84 first fire (`caee6e61-...`); not chat-initiated |
| `r.expected_publication` status transitions | 5 | Via same cron 84 first fire; `expected → matched` |
| `r.reconciliation_run` audit rows | 1 | `caee6e61-...`; status=`succeeded` |

## 5. L45 declaration table (per directive turn 7)

| # | Finding / Exception | Type | Description |
|---|---|---|---|
| **L1** | D-21 PostgREST pre-filter race window | accept-with-variance | Brief §5.2 step 6 specifies `INSERT ... ON CONFLICT DO UPDATE WHERE override_by IS NULL ... RETURNING reconciliation_match_id`. PostgREST does not support `WHERE` clauses on the UPDATE side of `.upsert()`. Implementation pre-filters via `fetchExistingMatchRows` (read) → `planMatcherPass` (filter `if (existing && existing.override_by !== null)`) → upsert payloads exclude override-protected rows. **Race window**: between the read and the upsert, a manual override could in principle be inserted by an out-of-band actor and the matcher would still UPSERT in its own window. **First-fire empirical observation**: `existing_match_rows_fetched=0`, `skipped_override_protected=0`, vacuously safe; pre-filter pattern validated under empty-table conditions. Future fires with non-empty `r.reconciliation_match` will exercise the race window; window narrows to milliseconds against a slow human-write surface. PK accepted at Stage B merge directive (turn 3 carry-forward). |
| **L2** | `r.reconciliation_run.trigger='manual'` default from 3-field cron body | accept-with-variance | Brief §5.7 cron body specifies 3 fields `{horizon_days, backfill_days, triggered_by}` — no `run_mode`. EF `index.ts` body parse defaults `runMode = "manual"` when the field is absent; `triggerLabel = "manual"` is written to `r.reconciliation_run.trigger`. **Authoritative provenance signal is `r.reconciliation_run.triggered_by = 'pg_cron_reconciliation_matcher_30min'`** which is correctly set on every cron fire. Identical pattern to cc-0010B job 83. PK accepted at Stage D directive (turn 5 body-shape approval). Future amendment may add `run_mode: 'scheduled'` to cron body if `trigger` field accuracy becomes consequential; out of v1 scope. |
| **L3** | E1 `duration_ms` verification query mismatch | runtime discovery | Initial Stage E observation query at turn 6 referenced `r.reconciliation_run.duration_ms` column which does not exist on the live schema. The audit row carries `started_at` + `finished_at` only; duration is derived (`EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000`) at query time and lives in the API response only via index.ts's `Date.now() - startedAt`. Mirrors the same gap in cc-0010B v2.68 closing session. Candidate **L54 NEW** for promotion: "EF response shape duration_ms vs audit row schema are intentionally separate — verification queries should derive from timestamps, not assume a duration_ms column. Future briefs authoring V-checks against `r.reconciliation_run` should template the derived form." Non-blocking; first attempt re-queried correctly within seconds. |
| **L4** | Stage B accepted implementation variances vs brief literal SQL | accept-with-variance | Two implementation-level deviations from brief §5.2 literal SQL, both functionally equivalent: **(a)** brief specified `INSERT ... ON CONFLICT DO UPDATE WHERE override_by IS NULL` for the matcher upsert; PostgREST does not support WHERE on conflict-update natively. Implementation pre-filters in `planMatcherPass` (see L1) — observable semantics identical for non-override-protected rows; behaviour for override-protected rows is identical (skip without write). **(b)** Brief §5.2 step 7 specified a single `UPDATE r.expected_publication SET expected_status='matched', matched_match_id=$1, matched_at=now() WHERE expected_publication_id=$2 AND expected_status IN ('expected','backfilled')`. PostgREST does not natively support batch UPDATE with per-row values; `updateExpectedToMatched` in `lib/db.ts` implements a JS-loop of per-row PostgREST UPDATEs. At v1 scale (≤30 matches per fire, ~150ms aggregate update latency), the per-row pattern is well within the 30s EF timeout. PK accepted at Stage B merge directive (turn 3). |

## 6. D-01 fires (this session)

| # | review_id | Stage | Verdict | Pushback | Status |
|---|---|---|---|---|---|
| — | — | — | — | — | **0 D-01 fires from chat this session.** All cc-0010C Stage approvals came as direct PK directives; CCD narrow reviews (if any) happened off-loop between PK and Claude Code via tooling that does not write to `m.chatgpt_review`. Result: no cc-0010C-pertinent rows in `m.chatgpt_review` to close-the-loop. **Distinct from cc-0010B v2.68 close pattern** where chat fired 4 D-01s; here chat fired 0. Action_list standing rule preserved: 24 unrelated historical escalated rows untouched per CCH directive carry-forward. |
## 7. Empirical proof — Stage E first-fire metrics

| Metric | Value | Source |
|---|---|---|
| `r.reconciliation_run_id` | `caee6e61-2b9d-4419-80b3-53ce5a342951` | EF run-lifecycle write |
| `run_type` | `matching` | EF |
| `trigger` | `manual` (EF default; see L2) | EF |
| `triggered_by` | `pg_cron_reconciliation_matcher_30min` | cron 84 body |
| `status` | `succeeded` | EF close |
| `started_at` (UTC) | 2026-05-13 05:45:02.464648 | EF |
| `finished_at` (UTC) | 2026-05-13 05:45:03.219 | EF |
| Derived duration | 754 ms | timestamp diff |
| `rows_processed` | 72 | EF |
| `rows_inserted` | 5 | EF (= `summary_json.tier_1_matched`) |
| `rows_updated` | 0 | EF |
| `rows_skipped` | 67 | EF (see histogram below) |
| `rows_transitioned` (in summary_json) | 5 | EF — `r.expected_publication` `expected → matched` count |
| `evidence_rows_fetched` | 31 | EF — full `r.ice_publication_evidence` for in-window expected ids |
| `existing_match_rows_fetched` | 0 | EF — `r.reconciliation_match` baseline (first invocation) |
| `matcher_config_rows_fetched` | 1 | EF — cc-0010A global default only (per v1 boundary) |
| `error_summary` | NULL | EF — no error path exercised |
| Horizon | 2026-05-13 → 2026-05-20 (7-day; backfill 0; today Sydney = 2026-05-13) | EF `summary_json` |
| Cron-side enqueue duration | 65 ms | `cron.job_run_details` runid 187209 |
| End-to-end cron→EF completion | ~2.79 sec | gateway start → EF finish |
| 30s timeout headroom | ≥ 27 sec | bounded |

**Skip-reason histogram (per brief §5.1 response shape):**

| Skip reason | Count | Interpretation |
|---|---:|---|
| `skipped_no_evidence` | 41 | Expected publication has no row in `r.ice_publication_evidence` at all |
| `skipped_evidence_not_published` | 25 | Evidence exists but `pipeline_state != 'published'` (Tier 1 only matches `published`) |
| `skipped_late_beyond_tolerance` | 1 | Evidence is `published` but `delta_minutes_late > 60` (global default); brief §13 #3 defers `late` transition to cc-0011 or v2 amendment |
| `skipped_override_protected` | 0 | D-21 — vacuously safe at first invocation; baseline was 0 rows |
| `skipped_other` | 0 | No per-row exceptions caught |
| **Total skipped** | **67** | matches `rows_skipped` |

**Math closure:**
- `rows_inserted + rows_updated + rows_skipped = 5 + 0 + 67 = 72 = rows_processed` ✓
- Skip-reason sum: `41 + 25 + 1 + 0 + 0 = 67` ✓
- Evidence funnel: 31 evidence fetched → 6 at `pipeline_state='published'` → 5 within 60-min tolerance → 5 matched ✓
- Status transitions: `rows_transitioned (5) == rows_inserted (5)` ✓ (no §10.2.p drift HALT triggered)

## 8. V-check verdicts

| V-check | Verdict | Notes |
|---|---|---|
| V8 (Stage B+C) EF deploy verification | PASS | Two unauth POST probes (no-header + empty-header) returned HTTP 401; `verify_jwt=false` declared in config.toml; deployed source matches main @ `546fb79` (CLI uploaded from clean working tree) |
| V9 (Stage D) Cron job created | PASS | jobid 84, jobname `reconciliation_matcher_30min`, schedule `15-59/30 * * * *`, active=true, command uses `vault.decrypted_secrets`, command_length=565, no literal secret inlined |
| V10 (Stage E) Run record sanity | PASS | Audit row `caee6e61-...` present; `run_type='matching'`; `status='succeeded'`; duration sub-second; `summary_json` carries 5 skip-reason counters |
| V11 (Stage E) L45 post-mutation truth check | PASS | `r.reconciliation_match` count delta: 0 → 5 (matches `rows_inserted`); `matching_run_count` delta: 0 → 1 |
| V12 (Stage E) Tier 1 hygiene + override + R2 stamping | PASS | All 5 rows: `matched_evidence_kind='ice'`, `matched_match_tier=1`, `matched_confidence=1.000`, `created_by_run_id IS NOT NULL`, `updated_by_run_id IS NOT NULL`, `override_by IS NULL`, `matched_evidence_id IS NOT NULL` |
| V13 (Stage E) Status transitions + CHECK pair | PASS | `expected_status` distribution: `{matched:5, expected:91, suppressed:16}`; `check_pair_violations = 0` (CHECK `expected_status_match_pair` satisfied throughout) |
| V14 (Stage E) 5-row sanity sample | PASS | All 5 rows uniform: R2 self-consistency (matcher_run_id = created_by_run_id = updated_by_run_id), FK round-trip (ep.matched_match_id = rm.reconciliation_match_id), evidence-id round-trip (ipe.ice_publication_evidence_id = rm.matched_evidence_id), `pipeline_state='published'`, `delta_minutes_late = 0`, cross-client coverage |
## 9. Cross-brief checkpoints

- **PRV-1 close gate criterion 3** (Tier 1 ICE matching live for ICE-healthy clients) — **EMPIRICALLY SATISFIED** by `caee6e61-...` first cron fire. Full PRV-1 close gate criterion set per PRV-0 §8.5 now stands at 3 of 7 satisfied (criteria 1–3); criterion 4 (manual observation CSV import) DEFERRED to PRV-2; criterion 5 (cadence-drift-checker weekly) DEFERRED to cc-0011; criterion 6 (dashboard daily matrix view) DEFERRED to cc-0011; criterion 7 (m.ef_drift_log clean for recon EFs) — ongoing observation, healthy through v2.69 close.
- **L38 candidate** (cross-brief FK re-add via ALTER TABLE in downstream-brief Stage A migration) — **second empirical exercise**: cc-0010A Stage A close added the FK on the producer side; cc-0010C Stage E first fire exercised the FK on the consumer side via `r.expected_publication.matched_match_id` round-trip (verified in V14 5-row sample). L38 now has multi-stage end-to-end vindication; eligible for promotion to baseline at next cycle.
- **L42 vault-backed cron secret** — third cron job (cron 84) sources `CRON_SECRET` from the same vault row `0fede5c3-...`. Cron 82 + cron 83 + cron 84 all share the row. L42 fully reified across 3 cron jobs.
- **L43 closed-with-verified-variance pathway** — second cycle exercised: cc-0010B v2.68 close used L43 for cron-fire-equivalent acceptance; cc-0010C v2.69 close uses the same L43 pattern. Pattern proven across two sub-builds.
- **L44 Runtime Proof Pre-flight** — Stage D pre-flight at turn 5 verified all §4 gates via consolidated live `execute_sql` read; ipe row count empirically 31 (not assumed at 30 from cc-0010B close). Pattern continues to catch drift cleanly.
- **L45 post-mutation truth check** — V11 + V14 sample exercised; post-fire reads from `r.reconciliation_run` + `r.reconciliation_match` + `r.expected_publication` cross-checked against EF response. No drift surfaced.
- **L46 baseline clean-agree pass-through** — chat fired 0 D-01s this session; the streak is preserved by abstention (no fires, no GNB classifications possible). The directive-only governance pattern of cc-0010C is a **new operational mode** distinct from cc-0010B v2.68's chat-fired pattern; consider distinguishing "chat-fired D-01 clean streak" vs "PK-direct directive cadence" as separate metrics going forward.
- **L48 atomicity gate** — cc-0010C single-EF / single-cron / single-actor-per-stage; atomicity satisfied by construction; no split needed.
- **L49 PG reserved-word check** — Stage D SQL uses inline literal text, no PL/pgSQL `DECLARE` block; vacuously satisfied.
- **L52 NEW candidate** (Supabase MCP `deploy_edge_function` higher transient-failure rate than CLI for same source payload) — **second repeat instance**: cc-0010C Stage C deploy used CLI directly per directive (no MCP attempt); the directive-side decision to skip MCP and route directly to CLI is itself the operational embodiment of L52 carry-forward. L52 promotion threshold ("pending one more repeat instance") is eligible to advance at next cycle.
- **L53 NEW candidate** (FK source-column-type asymmetry not caught by TypeScript compile) — Stage B authoring applied L53 protections proactively via `assertUuid` fail-fast at row-construction time; no FK source-column-type asymmetry surfaced. L53 is reinforced as an authoring-discipline practice; **L53 promotion is eligible** at next cycle (one prior reification at cc-0010B F4 + one preventive reification at cc-0010C Stage B authoring = 2 cycles).
- **L54 NEW candidate** (audit-row schema vs EF-response-shape distinction at V-check authoring) — first surfaced at cc-0010B v2.68 close in latent form, empirically reified at cc-0010C Stage E observation turn 6 with a 1-attempt re-query. Pattern: `r.reconciliation_run` audit rows carry `started_at`/`finished_at` but NOT `duration_ms` (which lives in the API response only via `Date.now() - startedAt`). V-check authoring should template the derived form `EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000` rather than assume a `duration_ms` column.

## 10. Forward signals / unblocked items

- **cc-0011** (cadence-drift-checker + r.cadence_drift_log + r.mv_reconciliation_daily_matrix + r.mv_observer_freshness_summary) — UNBLOCKED. cc-0011 reads `r.reconciliation_match` output which is now populated and growing on every `:15`/`:45` cron tick.
- **PRV-2/3/4** (per-platform observer EFs) — UNBLOCKED on the schema side (`r.platform_observation` + `r.platform_manual_observation` + `r.platform_observer_health` all exist from cc-0010A v1.5 Stage A; remain empty). Matcher Tier 2-5 extension awaits observer data; cc-0010C ships Tier 1 only per parent §8.3.
- **PRV-1 close declaration** — eligible to declare in a subsequent session once criteria 4–7 are addressed (see §9).
- **Steady-state monitoring** — cron 84 continues firing at `15-59/30 * * * *` UTC; each fire writes audit row to `r.reconciliation_run`; sustained-health observation lives at PRV-5 Triage Inbox (future). Until then, ad-hoc observation acceptable.
- **`late` status transition** (brief §13 #3 deferral) — first cron fire surfaced 1 candidate row (`skipped_late_beyond_tolerance=1`). The cc-0011 cadence-drift-checker is the proper home; alternatively, a cc-0010C v2 amendment could add `late` transition before cc-0011 ships. PK direction pending.
- **Per-client `r.matcher_config` overrides** — first cron fire used global default only (`matcher_config_rows_fetched=1`). Future cc-NNNN brief may introduce per-client / per-(client, platform) override rows; cc-0010C source already implements the lookup chain in `resolveLateTolerance` per brief §5.2 step 2.

## 11. Files touched (this session arc)

| File | Action | Blob (post-close) | Size |
|---|---|---|---|
| `docs/briefs/cc-0010C-reconciliation-matcher.md` | NEW (brief v1 frozen at `8204ab5`) | `cb47a188afc76570f854279ff62b65be4a78b805` | 53,580 b |
| `supabase/functions/reconciliation-matcher/deno.json` | NEW | `720edcbbe6638cd5bef7107e367f6985419a3e78` | 336 b |
| `supabase/functions/reconciliation-matcher/index.ts` | NEW | `40a48d89707582219f2661dcdac29babf42ff2de` | 16,988 b |
| `supabase/functions/reconciliation-matcher/lib/db.ts` | NEW | `23a507af7b705bba73163f989453803f84ab9a53` | 15,513 b |
| `supabase/functions/reconciliation-matcher/lib/matcher.ts` | NEW | `4eaefdb30940d04898b480606dea3a51b91845d9` | 15,370 b |
| `supabase/config.toml` | MOD (+3 lines) | `e27c5c414a1071cbcfd6127504ec167d21bc23ca` | (modified) |
| `docs/briefs/results/cc-0010C-reconciliation-matcher.md` | NEW (this file) | TBD at close-out commit | — |
| `docs/runtime/sessions/2026-05-13-cc-0010C-closed-stage-e-cron-equivalent.md` | NEW | TBD | — |
| `docs/00_sync_state.md` | MOD (1 row added to session index + last-updated header) | TBD | — |
| `docs/00_action_list.md` | MOD (v2.68 → v2.69; Today/Next 5 rebuild; carry-forward narrative) | TBD | — |

## 12. Final state declaration

cc-0010C is **CLOSED-WITH-VERIFIED-VARIANCE** at v2.69 sync close. Stages B + C + D + E (cron-fire-equivalent) all closed. EF `reconciliation-matcher` v1 ACTIVE; cron 84 `reconciliation_matcher_30min` ACTIVE at `15-59/30 * * * *` UTC. `r.reconciliation_match` populated with 5 Tier-1 ICE matches; `r.expected_publication` distribution shows 5 matched / 91 expected / 16 suppressed. PRV-1 close gate criterion 3 empirically satisfied. cc-0011 + PRV-2/3/4 unblocked.

No production data mutation by chat at close-out: chat performed 4 read-only `execute_sql` queries (m.chatgpt_review schema discovery + Stage E observation triangle); no `apply_migration`; no `net.http_post`; no review-row writes (zero cc-0010C-pertinent rows existed in `m.chatgpt_review`). All 5 Tier-1 match writes + 5 `expected → matched` status transitions originated from the natural cron 84 fire at 05:45 UTC, not from any chat-initiated action.

---

*Result authored 2026-05-13 Sydney by chat (Claude) at v2.69 sync close. Mirrors cc-0010B v2.68 close template + 12-section shape. Brief frozen at `8204ab5`; Stage B merged at `546fb79`; Stage C deployed at `daf4d9f1-b74d-48fe-9bd0-beec0ae43f64` v1; Stage D cron jobid 84; Stage E cron-fire-equivalent `caee6e61-2b9d-4419-80b3-53ce5a342951`. L43 cron-fire-equivalent variance accepted by PK at directive turn 7. cc-0010C CLOSED.*