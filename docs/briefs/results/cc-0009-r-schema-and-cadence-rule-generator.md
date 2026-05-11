# cc-0009 Stage A + Stage B + Stage C + Stage D + Stage E — Result

**Brief:** `docs/briefs/cc-0009-r-schema-and-cadence-rule-generator.md` @ commit `ae301a92`
**Process freeze:** ICE-PROC-001 @ `860fd0a9`
**Stage A applied:** 2026-05-11 01:38 UTC (Sydney: 11:38 AEST)
**Stage B merged:** 2026-05-11 04:38 UTC (Sydney: 14:38 AEST)
**Stage C closed:** 2026-05-11 07:26:28 UTC (Sydney: 17:26 AEST)
**Stage D applied:** 2026-05-11 09:34 UTC (Sydney: 19:34 AEST), vault-pivoted 10:18 UTC, closed 09:36:35 UTC
**Stage E executed:** 2026-05-11 10:50 UTC (Sydney: 20:50 AEST), closed 10:56:34 UTC

---

## Stage scope statement

**This result file covers Stages A through E — cc-0009 complete.** Each stage creates a distinct durable artifact: Stage A creates database structure; Stage B lands EF source on `main`; Stage C deploys the EF + V1–V7; Stage D registers the pg_cron schedule + V9; Stage E performs the first backfill invocation + V10–V12. cc-0009 PRV-1 second build is now CLOSED.

| Stage | Scope | Status after this close-out |
|---|---|---|
| **A** | schema r + 2 tables + 2 helper functions + k.* registry UPSERTs | **APPLIED + VERIFIED + CLOSED** (2026-05-11 01:38 UTC) |
| **B** | EF source for cadence-rule-generator on feature branch per CCH R11, then merged to main | **APPLIED + REVIEWED + MERGED + CLOSED** (2026-05-11 04:38 UTC) |
| **C** | EF deploy from post-merge main + V1–V7 + runtime remediation via `cc_0008_service_role_grants_fix` | **DEPLOYED + V1–V7 VERIFIED + REMEDIATED + CLOSED** (2026-05-11 07:26:28 UTC) |
| **D** | pg_cron schedule registration + V9, secret-source pivoted from GUC to vault | **APPLIED + V9 VERIFIED + VAULT-PIVOTED + CLOSED** (2026-05-11 09:36:35 UTC) |
| **E** | First backfill invocation via execute_sql net.http_post + V10–V12 | **EXECUTED + VARIANCE-VERIFIED + CLOSED WITH VERIFIED VARIANCE** (2026-05-11 10:56:34 UTC) |

**Explicit negative-state declarations at this close-out:**
- Edge Function `cadence-rule-generator` deployed in Stage C (version 4 ACTIVE; `verify_jwt=false`); not redeployed in Stages D or E.
- pg_cron job 82 `cadence_rule_generator_daily` registered in Stage D at `5 16 * * *` UTC; command pivoted to vault.decrypted_secrets lookup at 10:18 UTC; job remains intact post-Stage-E.
- Stage E backfill invocation produced 84 rows on a forward-only weekday-filtered horizon — see Stage E section + follow-up `F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY` for variance against pre-flight 154-row envelope.
- Production data mutations across Stages A–E: `r.*` schema/table creation + helper functions + `k.*` registry UPSERTs (Stage A); GitHub commits on feature branch + main (Stage B); EF deploy + service_role grant remediation via `cc_0008_service_role_grants_fix` (Stage C); pg_cron job 82 registration + vault pivot via `cron.alter_job` (Stage D); first 84 rows inserted into `r.expected_publication` + 1 audit row in `r.reconciliation_run` (Stage E); `m.chatgpt_review` close-the-loop UPDATEs (5 total across stages — 1 each for A, B, D, E + 3 for C).

---

# Stage A — Result

**Applied:** 2026-05-11 01:38 UTC (Sydney: 11:38 AEST)
**Migration name:** `cc_0009_r_schema_and_helpers`
**Routing:** Lesson #62 type-(c) generic escalation — PK explicit type-(c) override

## Stage A routing summary

Stage A D-01 was fired twice via `action_type=plan_review` (forced from `sql_destructive` by KOI-02). Both fires returned identical generic pushback:

| Fire | review_id | verdict | risk | pushback | new specific evidence |
|---|---|---|---|---|---|
| #1 | `1a097da6-fceb-4898-b2f5-5d58753558fa` | partial | high | 4 generic concerns | n/a |
| #2 | `52f4ae5d-8dea-4bc2-aa4e-c5c10ca03ca2` | partial | high | Same 4 generic concerns, verbatim | None |

All three Lesson #62 type-(c) markers present. PK issued explicit override phrase. Both review rows closed via `apply_migration` UPDATE: `status='resolved'`, `resolved_by='cc-0009-stage-a-apply-2026-05-11'`, `escalation_resolved_at=2026-05-11 01:39:31 UTC`.

## Stage A drift check — GREEN

Final read-only check executed within ~60s pre-apply window. Zero divergence from baseline across 11 checks (schema/table/function existence, extension installation, c.client_cadence_rule fingerprint 14/14/14, cc_0009 migration name collisions=0, event triggers enabled, k.* unique constraints intact, cron job at `5 16 * * *` UTC = 0).

## Stage A apply

| Field | Value |
|---|---|
| Migration name | `cc_0009_r_schema_and_helpers` |
| Apply mechanism | Supabase MCP `apply_migration` (chat-driven, per D-170) |
| Result | `{"success": true}` |
| Transaction | Single unit |
| Rollback executed | None — apply succeeded; V1–V8 all PASS |

**Migration content (per brief §2.1–§2.5 + §3.5–§3.6 verbatim):**
1. `CREATE SCHEMA IF NOT EXISTS r` + grants + `ALTER DEFAULT PRIVILEGES`
2. `CREATE TABLE r.reconciliation_run` (14 columns, 4 CHECK + PK + self-FK + 2 indexes)
3. `CREATE TABLE r.expected_publication` (17 columns, 4 CHECK + PK + UNIQUE generator idempotency key + 2 FKs + 2 indexes; `matched_match_id` declared as bare `uuid` per L38 deferral)
4. `CREATE OR REPLACE FUNCTION r.normalise_text(text)` IMMUTABLE — R7 narrowed body
5. `CREATE OR REPLACE FUNCTION r.to_sydney_local_date(timestamptz)` IMMUTABLE — PRV-0 §4.2 verbatim
6. `INSERT ... ON CONFLICT DO UPDATE` into `k.table_registry` for both new tables (L35)
7. CTE-driven `INSERT ... ON CONFLICT DO UPDATE` into `k.column_registry` for all 31 columns

## Stage A V-checks — all PASS

**V1 schema+grants**: schema r exists; service_role/anon/authenticator USAGE all true.
**V2 tables**: r.reconciliation_run (14 cols, 6 constraints); r.expected_publication (17 cols, 8 constraints); 7 indexes total.
**V3 functions**: r.normalise_text returns text; r.to_sydney_local_date returns date.
**V4a R7 transforms + R13 idempotency**: 8 transform tests pass; 4 idempotency assertions return true. Unicode preserved; punctuation/URLs/mentions/hashtags/emoji unchanged per R7 narrowing; f(f(x))=f(x).
**V4b DST**: AEST and AEDT boundaries verified across 5 inputs.
**V5 k.table_registry rows**: both r.* tables active/upsert/none/all-flags-true. L35 trigger-aware UPSERT pattern reified cleanly.
**V6 k.column_registry**: 14+17=31 rows; 31 of 31 purposes populated; matched_match_id correctly is_foreign_key=false per L38 deferral; zero duplicate (table_id, column_name) groups.
**V7 row counts**: r.reconciliation_run=0; r.expected_publication=0.
**V8 constraint integrity**: 6 constraints on reconciliation_run + 8 on expected_publication match brief specification exactly. matched_match_id FK count in pg_constraint = 0 (L38 catalog-level confirmation).

## Stage A anomalies

None.

## Stage A rollback status

Not executed. Apply succeeded; V1–V8 all PASS. Rollback path remains available per brief §9.3.

---

# Stage B — Result

**Merged to main:** 2026-05-11 04:38 UTC (Sydney: 14:38 AEST)
**Merge commit on main:** `dbd41438df887ef085d39d724c28c5bb0f8d4b65`
**Feature branch:** `feature/cc-0009-stage-b-ef-source` (preserved at HEAD `9796b0ee5f5aaa16052432cd9339780f142f4b1a` as audit artifact)
**Routing:** **CLEAN AGREE** on Stage B D-01 re-fire post-D1-fix; no Lesson #62 override needed

## Stage B closure gate — all 5 criteria met

| Gate (cc-0009 brief §11) | Evidence | Status |
|---|---|---|
| (a) feature-branch commit + push | `23355f97` → `9796b0ee` (D1 fixup) | ✓ |
| (b) Stage B D-01 fire | review_id `7feb52d5-b9d0-419a-86ae-d2ce4afbc5c1` | ✓ |
| (c) PK approval phrase | "yes go ahead / Stage B merge only" | ✓ |
| (d) merge of feature branch into main | `db4143ce` → `dbd41438` | ✓ |
| (e) close-the-loop UPDATE on m.chatgpt_review | `apply_migration cc_0009_stage_b_close_the_loop` | ✓ |

## Stage B branch lineage

| Commit SHA | Source | Description |
|---|---|---|
| `23355f97` | initial push (prior session) | 5 EF source files on feature branch |
| `9796b0ee` | D1 fixup | Removed `tolerance_minutes` references |
| `dbd41438` | merge to main | Squash-equivalent merge bringing `9796b0ee` file tree onto main |

**Merge mechanism advisory:** executed as a single new commit on `main` via MCP `push_files` rather than a literal Git merge commit with PR, because the GitHub MCP toolset available this session did not expose `merge_pull_request` or `create_pull_request`. End state on main is byte-identical to feature branch HEAD `9796b0ee`. Feature branch preserved as audit artifact. **PR URL: none.** Merge commit SHA `dbd41438` serves the result-file template §10 step 5 role under squash-equivalent interpretation.

## Stage B D-01 activity

**Fire #1** (prior session): defect surfaced — `c.client_cadence_rule.tolerance_minutes` does not exist in applied cc-0008 v5 schema. Outcome: directed D1 fixup.

**Fire #2** (this session, post-D1-fix re-review):
- review_id: `7feb52d5-b9d0-419a-86ae-d2ce4afbc5c1`
- action_type: `plan_review` (KOI-02 workaround)
- verdict: agree; risk: low; confidence: high; routing: proceed
- pushback_points: []; corrected_action: ""; requires_pk_escalation: false
- 5 verified_claims covering D1 fix, branch contents, x-cron-secret enforcement, DB scope, idempotency contract

**CLEAN AGREE first re-fire post-fix.** PK approval phrase followed.

**Close-the-loop UPDATE** via `apply_migration cc_0009_stage_b_close_the_loop`: review row `7feb52d5` → `status='resolved'`, `resolved_by='cc-0009-stage-b-merge-2026-05-11'`, `escalation_resolved_at=2026-05-11 04:40:11.678254 UTC`.

## Stage B D1 defect — empirical evidence

Initial Stage B EF source referenced `c.client_cadence_rule.tolerance_minutes` in `lib/db.ts` `.select()` projection + `lib/cadence.ts` interface + usage. Empirical schema query (pre-fix) confirmed `tolerance_minutes` absent from applied cc-0008 v5 schema (19 columns). Per cc-0009 brief §4.1, per-rule tolerance overrides were always intended to live in `r.matcher_config` (cc-0010), with hardcoded fallback of 60 in cc-0009.

## Stage B fix

Single commit `9796b0ee` removed all `tolerance_minutes` references across `lib/db.ts` projection, `lib/cadence.ts` CadenceRule interface, and the `tolerance` const derivation. Post-fix `grep` returned 0 matches.

## Stage B functional contract delivered on main

After merge, cadence-rule-generator EF source on `main` satisfies all 7 functional requirements: auth (x-cron-secret only, verify_jwt=false at gateway, body auth enforced); inputs (POST JSON with defaults, 400 on invalid); reads (c.client_cadence_rule, c.client_publish_profile only); writes (r.reconciliation_run, r.expected_publication only); idempotency (R9 ON CONFLICT key matches Stage A UNIQUE); horizon (15 calendar dates inclusive, Sydney-local); suppressed rows emitted (not skipped) per Option B.

## Stage B anomalies

- One mechanical deviation from brief result-file template §10 step 5 wording (no PR; squash-equivalent push_files merge). Not a semantic deviation.
- No other anomalies.

## Stage B rollback status

Not executed. Merge succeeded; close-the-loop succeeded; functional contract met.

---

# Stage C — Result

**Closed:** 2026-05-11 07:26:28 UTC (Sydney: 17:26 AEST)
**Deploy command:** `supabase functions deploy cadence-rule-generator --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns` (CC manual, PowerShell from `C:\Users\parve\Invegent-content-engine`)
**Routing:** clean execution per CC manual deploy; runtime defect surfaced at V5 + remediated via `cc_0008_service_role_grants_fix` apply; V5 re-run PASS

**Documentation sync note.** This Stage C section was patched into the result file retrospectively as a documentation-sync step before Stage D D-01. The Stage C work itself completed on 2026-05-11 earlier in the day; this section records the closure facts so that repo documentation matches runtime truth before Stage D begins. The patch was committed as part of the v2.64 doc-sync cycle and triggered no production mutation.

## Stage C closure summary

Stage C deploys the `cadence-rule-generator` Edge Function from post-merge `main` (commit `dbd41438`) and verifies the runtime contract via V1–V7.

| Sub-step | Outcome |
|---|---|
| EF deploy | Succeeded |
| Function slug | `cadence-rule-generator` |
| Function status | `ACTIVE` |
| Deployed version | 4 |
| `verify_jwt` | `false` |
| V1–V4 + V6–V7 | PASS (per PK report) |
| V5 initial | FAIL — `fetchActiveCadenceRules failed: permission denied for table client_cadence_rule` |
| Remediation applied | `cc_0008_service_role_grants_fix` (service_role SELECT grant on `c.client_cadence_rule`) |
| V5 post-remediation | PASS — HTTP 200; `r.reconciliation_run` row `63c7aef9-9d55-4581-ac6f-5f335761bdf5` at 2026-05-11 07:20:59 UTC status=`succeeded`, rows_inserted=0, rows_skipped=0 |
| `r.expected_publication` delta | 0 (table remained empty post V5; first population deferred to Stage E backfill) |
| Audit close-out | 3 review rows resolved at 2026-05-11 07:26:28 UTC |

## Stage C empirical evidence (this doc-sync session pre-flight)

The Stage D pre-flight read-only checks ran in the v2.64 session confirm Stage C runtime truth from a database + EF metadata perspective:

**`r.reconciliation_run` latest 3 rows (verified via `execute_sql`):**

| reconciliation_run_id | started_at | status | rows_inserted | error_summary |
|---|---|---|---|---|
| `63c7aef9-9d55-4581-ac6f-5f335761bdf5` | 2026-05-11 07:20:59 UTC | `succeeded` | 0 | null |
| `ed72cb99-1c56-433d-8366-52045dd2aef6` | 2026-05-11 07:13:26 UTC | `failed` | 0 | `fetchActiveCadenceRules failed: permission denied for table client_cadence_rule` |
| `49955e8d-afeb-43ad-afa7-03296946f892` | 2026-05-11 07:12:29 UTC | `failed` | 0 | `fetchActiveCadenceRules failed: permission denied for table client_cadence_rule` |

The two pre-remediation failed runs are consistent with the V5 narrative reported by PK. The succeeded run at 07:20:59 UTC is the post-remediation re-test that closed V5. Sequence on the wall clock: V5 fail × 2 → `cc_0008_service_role_grants_fix` apply → V5 re-run PASS at 07:20:59 → audit close-out at 07:26:28.

**Edge Function current state (verified via `get_edge_function`):**

| Field | Value |
|---|---|
| status | `ACTIVE` |
| version | 4 |
| verify_jwt | `false` |
| slug | `cadence-rule-generator` |

## Stage C audit close-out

Three `m.chatgpt_review` rows resolved as Stage C close-the-loop (per PK report):

| review_id | resolved_by | escalation_resolved_at |
|---|---|---|
| `bea1bca4-7517-4382-bb20-5ddcf3770f4e` | `cc-0009-stage-c-close-2026-05-11` | 2026-05-11 07:26:28 UTC |
| `48304b04-0c86-4ed4-8ec3-1ad34d5d72aa` | `cc-0009-stage-c-close-2026-05-11` | 2026-05-11 07:26:28 UTC |
| `4ac0cfce-6765-40dc-b151-4bd35a8bb935` | `cc-0009-stage-c-close-2026-05-11` | 2026-05-11 07:26:28 UTC |

Empirical row-state verification of `m.chatgpt_review` not performed this turn (documentation-sync hard constraint did not include read-only m.* checks; PK report is the authoritative source for the three review row IDs and closure timestamp).

## Stage C carry-forward advisories

- **`r.expected_publication` remains empty after Stage C.** First population is Stage E's first backfill invocation. The V5 succeeded run at 07:20:59 UTC produced `rows_inserted=0` because the V5 test was a probe; full empirical verification deferred to Stage E first backfill.
- **Service-role grant remediation** is tracked under the `cc_0008_*` migration namespace because it patches the cc-0008 cadence-rule table's grants. The migration is correctly attributed to its target table, not to cc-0009.
- **CRON_SECRET storage observation** (surfaced during Stage D pre-flight this session): CRON_SECRET present in EF secrets but absent from `vault.secrets`. Stage D D-01 / pre-flight §1.10+§1.11 should design cron command construction around EF-only storage (inject literal from EF env, or read from a vault path that exists). Not a Stage C defect — a Stage D design input.

## Stage C anomalies

- V5 initial failure due to missing `service_role` SELECT grant on `c.client_cadence_rule`. Grant added by `cc_0008_service_role_grants_fix`. **L41 NEW candidate** noted below.

## Stage C rollback status

Not executed. Deploy succeeded; remediation succeeded; V1–V7 post-remediation all PASS.

---

# Stage D — Result

**Applied:** 2026-05-11 09:34 UTC (Sydney: 19:34 AEST)
**Vault-pivot applied:** 2026-05-11 10:18 UTC (Sydney: 20:18 AEST)
**Closed:** 2026-05-11 09:36:35 UTC (Sydney: 19:36 AEST) — review row resolved before vault pivot; pivot was a tactical adjustment within Stage D closure window
**Migrations applied:** `cc_0009_pg_cron_cadence_generator` + `cc_0009_pg_cron_cadence_generator_vault_pivot`
**Routing:** Stage D D-01 = CLEAN AGREE; vault pivot under separate CCH directive (no second D-01 fire)

## Stage D closure summary

Stage D registers a pg_cron schedule invoking the deployed cadence-rule-generator EF on a fixed UTC anchor (CCH R14). Stage D was completed in two phases: (1) initial migration applied GUC-based secret sourcing per brief §5.1; (2) vault pivot applied within the same Stage D closure window when the GUC path did not durably persist on this managed-PG instance.

## Stage D phase 1 — initial apply (GUC-based command)

| Field | Value |
|---|---|
| Migration name | `cc_0009_pg_cron_cadence_generator` |
| Apply mechanism | Supabase MCP `apply_migration` |
| Result | `{"success": true}` |
| Created cron job | `jobid=82`, `jobname=cadence_rule_generator_daily`, `schedule='5 16 * * *'` UTC |
| Initial secret-source | `current_setting('app.settings.cron_secret', true)` (per brief §5.1) |

**V9 verification — all 10 assertions PASS:**

| Assertion | Result |
|---|---|
| `jobid = 82` | ✓ |
| `jobname = 'cadence_rule_generator_daily'` | ✓ |
| `schedule = '5 16 * * *'` | ✓ |
| `active = true` | ✓ |
| command contains `net.http_post` | ✓ |
| command contains EF URL | ✓ |
| `timeout_milliseconds := 30000` | ✓ |
| body `'horizon_days', 7` | ✓ (initial command) |
| body `'backfill_days', 0` | ✓ (initial command) |
| body `'triggered_by', 'pg_cron_cadence_rule_generator_daily'` | ✓ |
| header contains `x-cron-secret` | ✓ |

## Stage D D-01 activity

- **Review fired:** `action_type=plan_review` (KOI-02 workaround)
- **review_id:** `18c5cc02-aaa5-4149-a39b-6c36a6de99ca`
- **Verdict:** agree; **risk:** medium (generic advisory; not escalation criterion); **confidence:** high
- **pushback_points:** []; **routing_decision:** proceed; **requires_pk_escalation:** false
- **5 verified_claims** covering PK's 5 focus areas: schedule correctness, target slug correctness, auth mechanism (x-cron-secret), cron collision risk (zero), scope isolation (no Stage E bundled)
- **PK approval phrase** received: "go ahead"
- **Close-the-loop UPDATE** via `apply_migration cc_0009_stage_d_close_the_loop`: review row `18c5cc02` → `status='resolved'`, `resolved_by='cc-0009-stage-d-apply-2026-05-11'`, `escalation_resolved_at=2026-05-11 09:36:35.754568 UTC`

## Stage D phase 2 — vault pivot (secret-source change)

**Trigger:** post-apply read-only verification confirmed `app.settings.cron_secret` GUC was NULL in fresh sessions and `pg_db_role_setting` had zero rows for `cron_secret`. PK attempted `ALTER DATABASE postgres SET app.settings.cron_secret = '<value>'` twice; both attempts did not durably persist (likely Supabase managed-PG restriction on the `postgres` system database). PK then issued CCH directive to pivot to vault-backed secret sourcing.

| Step | Owner | Outcome |
|---|---|---|
| Insert CRON_SECRET into `vault.secrets` | PK (via Supabase Dashboard) | row id `0fede5c3-f92c-4bd6-8837-c0e304dfca4c`, created_at 2026-05-11 10:18:10.864628 UTC, decrypted length 15 chars |
| Apply migration `cc_0009_pg_cron_cadence_generator_vault_pivot` via `cron.alter_job(82, command := <new>)` | chat | `{"success": true}` |
| EF env `CRON_SECRET` rotation | PK | rotated to same string in same operation; vault ↔ EF env match preserved |

## Stage D vault-pivot verification (V2 + V3) — all PASS

**V2 (cron job 82 shape post-pivot, 12/12 assertions):**
- jobid=82 preserved; jobname/schedule/active/database/username unchanged
- command contains `vault.decrypted_secrets`; does NOT contain `current_setting('app.settings.cron_secret'`
- header `x-cron-secret`, URL, `timeout_milliseconds := 30000`, body `horizon_days/backfill_days/triggered_by` all unchanged from phase 1

**V3 (duplicate cron check, all PASS):**
- 1 job matching jobname `cadence_rule_generator_daily`
- 1 job matching command URL `%cadence-rule-generator%`
- 1 active job at schedule `5 16 * * *`
- `cron.alter_job` mutated in place; no new row created

## Stage D anomalies

- **`app.settings.cron_secret` GUC failed to persist across two PK retry attempts.** This is the empirical trigger for the vault pivot. Brief §5.1 NOTE anticipated this possibility ("Stage D apply may need a one-line precursor ALTER DATABASE postgres SET app.settings.cron_secret = '<value>' IF this pattern is not already in use"); the alternative pattern was selected. No Stage D defect — design contingency exercised.
- The vault-pivot migration was NOT preceded by a separate D-01 fire. Justification: the change is a tactical secret-source adjustment within Stage D's closure window, not a new Stage D plan; the original D-01 review covered Stage D as a unit of work; PK's CCH pivot directive constituted the approval phrase. **Audit asymmetry** flagged: one of cc-0009's five close-the-loop write slots (Stage D) is associated with two migrations rather than one. Not a Forbidden Actions violation; brief §5.1 NOTE explicitly permits the alternative pattern.

## Stage D rollback status

Not executed. Both phase-1 apply and phase-2 vault pivot succeeded. Vault row + EF env value match (PK rotation). Stage D V9 + post-pivot V2/V3 all PASS.

---

# Stage E — Result

**Executed:** 2026-05-11 10:50:05.282994 UTC (Sydney: 20:50 AEST)
**Closed:** 2026-05-11 10:56:34.55239 UTC (Sydney: 20:56 AEST) — **CLOSED WITH VERIFIED VARIANCE**
**Invocation mechanism:** `execute_sql net.http_post` (chat-driven, per brief §5.2 + D-170 + CCH R6 "invokes EF via net.http_post, then verifies completion using r.reconciliation_run + downstream row checks")
**Routing:** Stage E D-01 = CLEAN AGREE; PK approval phrase received; backfill executed clean with envelope variance against pre-flight model; PK accepted variance as not-a-failure

## Stage E closure summary

Stage E performs the first on-demand backfill invocation of the deployed cadence-rule-generator EF. The EF wrote 1 audit row to `r.reconciliation_run` + 84 rows to `r.expected_publication`. All hard-fail anomaly checks returned zero. A row-envelope variance against the pre-flight model (154 expected vs 84 actual) was observed and accepted by PK as a verified variance; follow-up `F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY` opened for cc-0010+ reconciliation of brief vs deployed-EF horizon semantics.

## Stage E D-01 activity

- **Review fired:** `action_type=plan_review` (KOI-02 workaround)
- **review_id:** `339ae9e4-e51f-46d0-bf73-812d959233a1`
- **Verdict:** agree; **risk:** medium (generic advisory; not escalation criterion); **confidence:** high
- **pushback_points:** []; **routing_decision:** proceed; **requires_pk_escalation:** false
- **4 verified_claims** covering PK's 5 focus areas: payload contract matches deployed EF, secret lookup safe (vault path), idempotency maintained, expected-effect 154-row envelope justified; scope isolation implicit (no pushback)
- **PK approval phrase** received: "PK APPROVES Stage E execution for cc-0009"
- **Close-the-loop UPDATE** via `apply_migration cc_0009_stage_e_close_the_loop`: review row `339ae9e4` → `status='resolved'`, `resolved_by='cc-0009-stage-e-apply-2026-05-11'`, `escalation_resolved_at=2026-05-11 10:56:34.55239 UTC`

## Stage E correction packet applied pre-D-01

Per CCD-identified payload contract correction before D-01 fire: deployed EF reads body `run_mode` + `triggered_by`; stale brief §4.1 fields `horizon_days` + `backfill_days` are ignored by the deployed EF. Stage E invocation payload corrected to:

```json
{
  "run_mode": "backfill",
  "triggered_by": "cc-0009-stage-e-first-backfill"
}
```

Live row-envelope derivation (replacing brief's stale ~140 estimate) computed pre-D-01: 154 rows (132 expected + 22 suppressed) across 15-calendar-date inclusive horizon. EF actual emitted 84 rows — see Stage E variance below.

## Stage E invocation

```sql
SELECT net.http_post(
    url := 'https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/cadence-rule-generator',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := jsonb_build_object(
        'run_mode', 'backfill',
        'triggered_by', 'cc-0009-stage-e-first-backfill'
    ),
    timeout_milliseconds := 30000
) AS request_id;
```

**pg_net request_id:** `104822`

## Stage E HTTP response (verification 1)

| Field | Value |
|---|---|
| status_code | **200** |
| error_msg | null |
| response body | `{"reconciliation_run_id":"55306576-08f2-4328-8e45-69ff74eb7b97","rows_planned":84,"rows_inserted":84,"rows_skipped_idempotent":0,"rows_suppressed":12,"rules_processed":14,"rules_failed":0,"horizon":{"start":"2026-05-04","end":"2026-05-18"},"duration_ms":743}` |
| response timestamp | 2026-05-11 10:50:03.39793 UTC |

**EF response semantics clarified:** `rows_inserted=84` is the grand total written to `r.expected_publication`; `rows_suppressed=12` is a sub-count of that 84 (rows with `expected_status='suppressed'`), not additive. DB matches EF: 84 total = 72 expected + 12 suppressed.

## Stage E r.reconciliation_run row (verification 2)

| Field | Value |
|---|---|
| reconciliation_run_id | `55306576-08f2-4328-8e45-69ff74eb7b97` |
| run_type | `backfill` |
| trigger | `backfill` |
| status | **`succeeded`** |
| started_at | 2026-05-11 10:50:05.282994 UTC |
| finished_at | 2026-05-11 10:50:05.788 UTC |
| DB-measured duration | 505 ms (EF self-reported 743 ms including startup) |
| rows_processed / rows_inserted / rows_skipped | 84 / 84 / 0 |
| triggered_by | `cc-0009-stage-e-first-backfill` |
| error_summary | null |
| summary_json | `{run_mode: backfill, horizon_start: 2026-05-04, horizon_end: 2026-05-18, rules_processed: 14, rules_failed: 0, rows_suppressed: 12, client_filter: null}` |

## Stage E r.expected_publication breakdown (verification 3)

| Metric | Count |
|---|---|
| Total rows in table | **84** |
| Of which `expected_status='expected'` | 72 |
| Of which `expected_status='suppressed'` | 12 |
| Of which other statuses | 0 |
| Rows attributed to this run (`created_by_run_id`) | 84 (100%) |
| Distinct idempotency keys `(client_id, platform, expected_local_date, cadence_rule_id)` | 84 (perfectly unique) |

## Stage E suppression detail (verification 4 — brief V12)

| Client/Platform | Suppressed rows | suppression_reason |
|---|---|---|
| ndis-yarns/instagram | 6 | `publish_profile_paused: meta_subcode_2207051_block_2026-05-01_ndis_yarns_ig_anti_spam` |
| property-pulse/instagram | 6 | `publish_profile_paused: meta_subcode_2207051_block_25_apr_pp_ig_anti_spam` |

Both paused-IG rules preserved per Option B semantics. No other (client × platform) appears as suppressed. Reason format `'publish_profile_paused: <paused_reason>'` matches brief §4.1 spec exactly.

## Stage E per-(client × platform) breakdown

14 (client × platform) cadence pairs × 6 dates each = 84 rows. Uniform 6 rows per pair indicates uniform weekday filter across all 14 rules.

| Client | Platform | Status | Rows | Date range |
|---|---|---|---|---|
| care-for-welfare-pty-ltd | facebook | expected | 6 | 2026-05-11 .. 2026-05-18 |
| care-for-welfare-pty-ltd | instagram | expected | 6 | 2026-05-11 .. 2026-05-18 |
| care-for-welfare-pty-ltd | linkedin | expected | 6 | 2026-05-11 .. 2026-05-18 |
| invegent | facebook | expected | 6 | 2026-05-11 .. 2026-05-18 |
| invegent | instagram | expected | 6 | 2026-05-11 .. 2026-05-18 |
| invegent | linkedin | expected | 6 | 2026-05-11 .. 2026-05-18 |
| ndis-yarns | facebook | expected | 6 | 2026-05-11 .. 2026-05-18 |
| ndis-yarns | instagram | **suppressed** | 6 | 2026-05-11 .. 2026-05-18 |
| ndis-yarns | linkedin | expected | 6 | 2026-05-11 .. 2026-05-18 |
| ndis-yarns | youtube | expected | 6 | 2026-05-11 .. 2026-05-18 |
| property-pulse | facebook | expected | 6 | 2026-05-11 .. 2026-05-18 |
| property-pulse | instagram | **suppressed** | 6 | 2026-05-11 .. 2026-05-18 |
| property-pulse | linkedin | expected | 6 | 2026-05-11 .. 2026-05-18 |
| property-pulse | youtube | expected | 6 | 2026-05-11 .. 2026-05-18 |

## Stage E envelope variance (verified variance — PK-accepted)

| Metric | Pre-flight envelope | EF actual | Delta |
|---|---|---|---|
| Total rows | 154 | 84 | −70 |
| Expected-status | 132 | 72 | −60 |
| Suppressed-status | 22 | 12 | −10 |
| Distinct dates | 15 (today−7 → today+7) | 6 (today → today+7, weekdays only) | −9 |

**Root cause from row inspection:** All 84 rows fall in dates `[2026-05-11, 2026-05-12, 2026-05-13, 2026-05-14, 2026-05-15, 2026-05-18]` — exclusively today and forward, weekday-filtered. Zero rows for past dates (2026-05-04..2026-05-10) within the announced horizon. EF response and `r.reconciliation_run.summary_json` both report `horizon: {start: 2026-05-04, end: 2026-05-18}` — the **horizon variable** is full 15-day, but the **emitted rows** span only today→today+7 (weekday-filtered).

**PK Decision 2026-05-11:** accept EF behavior as authoritative; live-derived EF behavior is now the reference baseline for verification envelopes. Do NOT re-fire the backfill, do NOT attempt to insert the missing 70 rows, do NOT treat the delta as a Stage E execution failure. The brief §4.1 + §6 V10d horizon model is the pre-flight side that needs reconciliation (follow-up `F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY`), not the actual rows.

## Stage E anomaly scan — hard-fail anomalies all zero

| Anomaly check | Count |
|---|---|
| Rows with premature `matched_match_id` set | 0 |
| Rows with premature `matched_at` set | 0 |
| Rows with invalid window (`end ≤ start`) | 0 |
| Rows missing `created_by_run_id` | 0 |
| Rows with past dates (before 2026-05-11) | 0 |
| Rows with far-future dates (after 2026-05-18) | 0 |

EF execution clean: `rules_failed=0`, `rows_skipped=0`, well under 30 000 ms timeout.

## Stage E soft observations (recorded for cc-0010+ planning)

1. **Backfill horizon semantics mismatch** — EF emits today-forward weekday-filtered only; brief §4.1 implies past-portion of horizon should also be populated. The brief V10d derivation model assumed full 15-day. Deployed EF is the authoritative source per PK Decision 2026-05-11. See follow-up `F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY`.
2. **Weekday cardinality uniform across all 14 rules** — every (client × platform) returned exactly 6 dates over the 8-day forward window. Implies all 14 cadence rules carry `weekdays=[1,2,3,4,5]` (Mon–Fri ISODOW) or equivalent. cc-0008 seed shape consistency observation. Not a defect; recorded for future planning.
3. **No weekend dates emitted** — Sat 2026-05-16 and Sun 2026-05-17 absent (consistent with point 2). If any rule should fire on weekends, that's a cc-0008 seed concern, not a cc-0009 EF concern.
4. **Idempotency was not re-tested by re-invocation** — per PK directive "first backfill only" scope. Property inferred from data shape (distinct_keys=total_rows=84) + EF design (`ON CONFLICT DO NOTHING`). Empirical idempotency re-fire deferred unless PK separately approves.

## Stage E rollback status

Not executed. Invocation succeeded; close-the-loop succeeded; envelope variance accepted by PK as verified variance (not an execution failure).

---

# Follow-up findings recorded at cc-0009 closure

## F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY

**Category:** brief vs deployed-EF semantics reconciliation
**Severity:** P3 — informational / planning input for cc-0010+; no production impact (cc-0009 closed with verified variance, accepted by PK)
**Opened:** 2026-05-11 (Stage E closure)
**Empirical evidence:** Stage E first backfill emitted 84 rows across the today→today+7 weekday-filtered window (today=2026-05-11, dates 11-12-13-14-15-18 May), zero rows for the today−7→today-1 past-portion of the announced horizon. EF + `r.reconciliation_run.summary_json` both report `horizon: {start: 2026-05-04, end: 2026-05-18}` while emitted rows occupy only 8 of the 15 calendar dates.
**Finding wording (exact):** Deployed `cadence-rule-generator` Edge Function emits `r.expected_publication` rows only for today + future-portion of horizon, weekday-filtered, not for past-portion of horizon. Brief §4.1 + §6 V10d pre-flight derivation model assumed full 15-calendar-date inclusive horizon (today−7 → today+7). Empirically verified at Stage E first backfill 2026-05-11 (84 rows actual vs 154 model). PK Decision 2026-05-11: accept EF behavior as authoritative; live-derived EF behavior is now the reference baseline for verification envelopes. Future pre-flight envelope derivations must model forward-only weekday-filtered horizon. Reconciliation options for cc-0010+ to consider: (a) update brief §4.1 + §6 V10d to match EF; OR (b) update EF source to populate past-portion of horizon; OR (c) leave as-is and document the asymmetry between brief intent and EF reality. PK to direct.
**Authority for any path:** PK directive at cc-0010 brief authoring OR a dedicated cc-0009 v2.2 doc-only brief revision (post-freeze; requires separate authorisation).
**Until directed otherwise:** live-derived EF behavior is the reference baseline.

---

## Lessons captured this close-out (candidates)

- **L37 candidate VINDICATED for the full A–E lifecycle** — multi-stage cc-NNNN brief authoring pattern: cc-0009 Stages A through E now all closed end-to-end across heterogeneous actor types (chat migration; CC source authoring + chat merge; CC deploy + chat remediation; chat migration with tactical mid-stage pivot; chat invocation + verification + variance acceptance).
- **L38 candidate** — cross-brief FK deferral: `matched_match_id` declared bare in cc-0009 §2.3, FK addition deferred to cc-0010 ALTER TABLE. Awaits cc-0010 ALTER TABLE for full empirical vindication. cc-0009 Stage E V12 + Stage E anomaly scan confirmed `matched_match_id` correctly remained NULL across 84 inserted rows.
- **L39 candidate VINDICATED** — feature-branch + diff-review + PK-approval workflow per CCH R11: Stage B end-to-end through 2 sessions and 7 turns.
- **L40 NEW candidate** — squash-equivalent merge mechanism via `push_files` when `merge_pull_request` unavailable.
- **L41 NEW candidate** — runtime grant defect surfaced at V-check + fixed in-place during the same Stage close cycle: Stage C V5. Reinforces L17.
- **L42 NEW candidate** — in-stage tactical pivot pattern: Stage D's GUC-based secret-source path did not persist on this managed-PG instance across two PK retry attempts. Brief §5.1 NOTE had anticipated the contingency and named the alternative pattern (vault.decrypted_secrets lookup). The vault pivot was applied as a tactical adjustment within Stage D's closure window using `cron.alter_job` (preserving jobid), under a CCH pivot directive (no second D-01 fire because the change was a tactical secret-source adjustment within the unit of work already approved). Audit asymmetry noted: one of cc-0009's 5 close-the-loop write slots is associated with 2 migrations rather than 1. Pattern is durable when (a) brief documents the alternative in advance, (b) `cron.alter_job` or equivalent in-place mechanism preserves identifiers, and (c) PK directive explicitly authorises the pivot.
- **L43 NEW candidate** — pre-flight envelope variance pattern: a live-derived pre-flight envelope can still diverge from the deployed EF semantics if the brief's derivation model differs from the EF's actual behavior. The variance is a verified variance, not a failure, when (a) EF execution itself is clean (zero failures, zero skips, hard-fail anomalies all zero), (b) idempotency integrity holds (distinct_keys=total_rows), (c) PK accepts the variance as an acknowledged source-of-truth question to be resolved in a follow-up brief, and (d) the divergence is recorded as a named follow-up finding. Establishes empirical-vs-modelled source-of-truth precedence for future cc-NNNN closures.

Promotion to global lesson registry deferred until further empirical vindication.

---

## KOI activity during cc-0009 build (cumulative)

- **KOI-01** (Stage A) — mcp-chatgpt-bridge OAuth re-auth: triggered, recovered via Option 2b.
- **KOI-02 NEW** (Stage A) — Anthropic GitHub issue #56757: MCP Tool Permissions Not Persisting. Workaround: route via `action_type=plan_review`. Used in Stage A fires + Stage B re-review + Stage D fire + Stage E fire.
- No new KOI activity during Stage B, C, D, or E work.

---

## cc-0009 closure — stop condition reached

All five stages CLOSED. PRV-1 second build is complete. `r.*` schema delivered; cadence-rule-generator EF deployed and active; pg_cron schedule registered; first backfill executed and verified with verified variance.

**Next gate (separate brief):** cc-0010 — r.* second-wave tables (r.ice_publication_evidence, r.platform_observation, r.platform_manual_observation, r.reconciliation_match, r.platform_observer_health, r.matcher_config) + ice-evidence-materialiser + reconciliation-matcher EFs + ALTER TABLE to add `r.expected_publication.matched_match_id` FK constraint (L38 final vindication) + (per F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY) brief vs EF horizon-semantics reconciliation.

---

**Confirmation:** `cc-0009 Stage A is applied, verified, and closed. cc-0009 Stage B is reviewed, merged, and closed. cc-0009 Stage C is deployed, V1–V7 verified, remediated via cc_0008_service_role_grants_fix, and closed. cc-0009 Stage D is applied, V9 verified, vault-pivoted, and closed. cc-0009 Stage E is invoked, V10–V12 verified, closed with verified variance against pre-flight envelope (PK-accepted). All five stages CLOSED. PRV-1 second build complete. Follow-up F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY opened for cc-0010+ reconciliation.`
