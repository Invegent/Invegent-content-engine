# 2026-05-06 Wed morning — F-EF-DRIFT-PREVENTION Stage 1 APPLIED (backend foundation)

**Duration:** ~2.5h chat. Sydney morning session.
**Brief:** `docs/briefs/2026-05-05-f-ef-drift-prevention.md` (status APPROVED v2.40).
**Parent decisions:** D-PREV-13 (taxonomy locked), D-PREV-14/15/16 (Option F approved as target prevention design).
**Project:** mbkmaxqhsohbtwsqolns (ICE production).
**D-01 fires this session:** 3 (T-MCP-02 ticks 34 → 37). One escalated → revised → re-fired cleared. One bug-fix on patched function cleared.

---

## Outcome

F-EF-DRIFT-PREVENTION Stage 1 (backend foundation) is COMPLETE. The drift-check EF, retention pg_cron, dashboard panel, and `safe-deploy.sh` remain in Stages 2a / 2b / 3 (all separate sessions).

PK directed Stage 1 only this session. Stage scope was followed strictly: only the table, indexes, view, writer function, and grants. No EF deploy. No other workstreams touched.

---

## What was built

| Object | Type | Notes |
|---|---|---|
| `m.ef_drift_log` | table, 19 cols | Append-only daily snapshots; one row per (slug, run). |
| `ef_drift_log_pkey` | PK | `id uuid` |
| `ef_drift_log_slug_checked_at_idx` | btree | per-slug history navigation |
| `ef_drift_log_class_checked_at_idx` | btree | class-bucket reporting |
| `ef_drift_log_run_idx` | btree | run grouping |
| `ef_drift_log_sd_risk_idx` | partial btree | `WHERE security_definer_regression_risk = true` |
| `ef_drift_log_state_changed_idx` | partial btree | `WHERE state_changed = true` (NULLs auto-excluded — correct semantic for first-obs rows) |
| `ef_drift_log_class_chk` | CHECK | `current_class IN ('A','A-LE','B-RR','B-FD','C','D','repo-only')` |
| `ef_drift_log_direction_chk` | CHECK | `direction IS NULL OR IN ('regression-risk','forward-drift','clean','none')` |
| `ef_drift_log_repo_path_chk` | CHECK | `repo_path_status IN ('present','missing','repo_only')` |
| `ef_drift_log_severity_chk` | CHECK | `severity IN ('P1','P2','P3','none')` |
| `ef_drift_log_first_obs_consistency` | CHECK | enforces `is_first_observation` ⇔ (`previous_class IS NULL AND state_changed IS NULL`) |
| `m.vw_ef_drift_current` | view | latest-per-slug + derived `first_seen_in_class` + derived `last_resolved_at` |
| `public.write_ef_drift_log(jsonb)` | SECURITY DEFINER fn | Batch writer; computes is_first_observation, previous_class, state_changed against most-recent prior row per slug. |
| GRANTs | grants | `authenticated` SELECT on table + view; `service_role` only EXECUTE on writer fn (anon + authenticated revoked). |

**Migrations applied:**
- `f_ef_drift_prevention_stage1_v2_drift_log_table` (D-01 `10635f1d-c471-4b5b-b98b-bb3bcb4e5012`)
- `f_ef_drift_prevention_stage1_v2_fix_writer_fn_ambiguity` (D-01 `d2415cc4-9c0e-406a-ae37-413ecd054a0f`)

---

## Schema design rationale

### Naming + symmetry

PK directed clearer field/semantic split between current and prior state. Renamed `class` → `current_class` to mirror `previous_class`. Added `is_first_observation` boolean as the explicit first-run flag.

### state_changed semantics — null-tri-state

- `is_first_observation = true` → `previous_class = NULL` AND `state_changed = NULL` (no prior baseline to compare).
- `is_first_observation = false` AND no diff → `state_changed = false`.
- `is_first_observation = false` AND class diff OR deployed_hash_normalised diff OR repo_hash_normalised diff → `state_changed = true`.

The hash-based component covers cases where class stays the same but body content changed (e.g. B-RR slug patched again with new content). The `state_changed_idx` partial index uses `WHERE state_changed = true` which excludes NULLs by PostgreSQL semantics — correct for first-run rows.

### CHECK constraint enforces invariants

`ef_drift_log_first_obs_consistency` makes the (`is_first_observation`, `previous_class`, `state_changed`) tuple internally consistent at insert time. Bad data cannot be inserted.

### Writer fn — batch, idempotent within run, NULL-safe

- Single `RETURN QUERY WITH ... INSERT ... RETURNING` — atomic per call.
- Generates one `drift_check_run_id` per call.
- `prev_state` CTE pulls most-recent prior row per slug for slugs in the batch, before insert.
- `IS DISTINCT FROM` for hash comparison — NULL-safe.
- Returns `inserted_id, slug, is_first_observation, state_changed` for caller observability.
- `#variable_conflict use_column` directive added to disambiguate OUT-param/column references inside function body (caught in live test).

### View shape

`m.vw_ef_drift_current` — `DISTINCT ON (slug)` for latest-per-slug, plus correlated subqueries for `first_seen_in_class` and `last_resolved_at`. View is `CREATE OR REPLACE` so Stage 2 dashboard can reshape it freely once dashboard requirements are concrete.

---

## D-01 fire log

### Fire 1 — initial migration v1, ESCALATED

- Verdict: partial. Risk: medium. Confidence: high.
- Pushback (both echoes of self-disclosed weak evidence): (a) dashboard usage of view not validated; (b) state_changed semantic for first observations not deliberated.
- Initial read by chat: looked like Lesson #62 type-(c) consistency-bias.
- **PK explicit decision: NOT Lesson #62. Real design ambiguity. Revise the migration before applying.**

### Fire 2 — revised migration v2, AGREED

- Revisions per PK direction: rename `class` → `current_class`; add `is_first_observation`; nullable `state_changed` with NULL on first obs; CHECK constraint on the consistency invariant; broaden `state_changed` to fire on class diff OR deployed_hash diff OR repo_hash diff per PK's "previous class/hash differs".
- Verdict: agree. Risk: medium. Confidence: high. No pushback.
- Applied via `Supabase:apply_migration`.

### Fire 3 — bug fix on writer fn, AGREED

- Live test surfaced 42702 ambiguous-column error inside writer fn. OUT params (slug, is_first_observation, state_changed) collided with column references inside `prev_state` CTE.
- Fix: `#variable_conflict use_column` directive at top of function body + alias `prev_state` columns explicitly with `prev_*` prefix.
- Verdict: agree. Risk: low. Confidence: high.
- Applied via `Supabase:apply_migration`.

---

## Live test — 4 semantic cases proven

| Case | Setup | Expected | Observed |
|---|---|---|---|
| First observation | Run 1: slug `__TESTROW_001`, class A, hashes h1/h1 | is_first_observation=true, previous_class=NULL, state_changed=NULL | ✅ exactly |
| No change | Run 2: same slug, same class, same hashes | is_first_observation=false, previous_class=A, state_changed=false | ✅ exactly |
| Class diff | Run 2: slug `__TESTROW_002`, class A→C, deploy hash h1→h2 | is_first_observation=false, previous_class=A, state_changed=true | ✅ exactly |
| Hash diff within same class | Run 3: `__TESTROW_001`, class A→A, deploy hash h1→h2 | is_first_observation=false, previous_class=A, state_changed=true | ✅ exactly |

View `m.vw_ef_drift_current` queried mid-test returned correct latest state for both test slugs, with `first_seen_in_class` and `last_resolved_at` populated.

Test rows DELETEd post-test. Final state: 0 rows in `m.ef_drift_log`, 0 rows in view. Table left clean for Stage 2a's first real run.

---

## Pre-flight P1-P5 (Lesson #61)

All green at session start (single combined query):

| Check | Result |
|---|---|
| P1: table exists | false (clean create) |
| P1: view exists | false (clean create) |
| P1: function exists | false (clean create) |
| P2: existing refs to table | 0 |
| P2: schema m exists | true |
| P2: gen_random_uuid available | true |
| P3: existing tables in m | 47 |
| P4: exclusive locks on m | 0 |
| P5: current user | postgres |
| P5: current database | postgres |
| Extra: k.vw_table_summary exists | true |

---

## Health check follow-up

`docs/audit/health/2026-05-06.md` is absent at session start. Last nightly health check is `2026-05-05.md`. Cowork 02:00 AEST cron either ran late, didn't fire, or pushed somewhere else.

PK direction: log as follow-up only; do not derail the drift-prevention build. Logged. To investigate next session if not back online by then.

---

## Standing rules honoured

- D-01: 3 fires (T-MCP-02 34 → 37). One escalation correctly handled by PK as design ambiguity, not Lesson #62.
- D170: chat applied migrations via Supabase MCP, not CC.
- D186: closure ~2.5h this session. Trailing-14-day ~30h, above 8.0 floor.
- Lesson #61 mandatory pre-flight P1-P5: passed before each apply.
- G1: this session writes its own file (this one).
- D-PREV-16: Option F build proceeding via incremental stage gates.

---

## What remains for Stage 2a (next session)

1. **drift-check Edge Function** — daily 03:00 AEST pg_cron. Iterates 46 EFs via `Supabase:list_edge_functions`. For each: fetch deployed source via `get_edge_function`; fetch repo source from `supabase/functions/<slug>/index.ts` on `main`; CRLF-normalise both; compute body hashes; parse banner with permissive parser; classify A/A-LE/B-RR/B-FD/C/D; run targeted SECURITY-DEFINER regex detector; call `public.write_ef_drift_log()` once per run (~46-row batch). Lists repo-only directories in returned summary. ~2h.
2. **pg_cron 90-day retention sweep** — daily DELETE on `m.ef_drift_log WHERE checked_at < now() - interval '90 days'`. ~15min.

## What remains for Stage 2b

3. **Dashboard drift panel** — reads `m.vw_ef_drift_current` plus filtered queries on `m.ef_drift_log` for history. Lists by class bucket; SECURITY-DEFINER P1 list highlighted; `state_changed=true` rows get badge; repo-only directories listed separately. ~1-2h. View shape may be revisited here.

## What remains for Stage 3

4. **`scripts/safe-deploy.sh`** — wraps `npx supabase functions deploy <slug>`. Pre-deploy `git status` clean check + local-matches-`origin/main` check. Warns but does NOT refuse — habit-builder, hot-fix capability preserved. ~30min.

## Triage dependencies (unchanged from v2.40)

- **P1 SECURITY-DEFINER triage** (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) — defer until drift-check infrastructure live so sync commits show green in dashboard.
- **insights-worker P1 functional drift** — manual review per D-PREV-07.
- **F-YT-NY-FORMAT-SELECTION + M6 Phase A** — both still BLOCKED behind build close + P1 triage per D-PREV-16.

---

## Lesson #62 maturity update (candidate)

When ChatGPT MCP echoes back Claude's own self-disclosed weak evidence as objections, the default reading was "type-(c) consistency-bias → state-capture override." PK refined this 2026-05-06 morning: **echoing weak-evidence does not automatically classify as consistency-bias if the underlying ambiguity is real.** Claude should propose revision first, not state-capture override, when the objection points at a design choice that has multiple defensible answers.

Application this session: Fire 1's pushback on `state_changed` first-run semantic was ambiguous-by-design. PK's revision direction produced a strictly better schema (explicit `is_first_observation`, NULL-tri-state on `state_changed`, CHECK constraint enforcing consistency). Lesson #62 remains a candidate for promotion; this session refines its boundary condition.

---

*End of session file.*
