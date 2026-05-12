# Brief cc-0010B v1.1 — `ice-evidence-materialiser` EF end-to-end (PRV-1 third build, sub-build 2 of 3)

**Created:** 2026-05-12 Sydney
**Last patched:** 2026-05-12 Sydney (v1.1 — CCD review corrections D1 + R1 + R2 applied; Assumption #3 marked PK-DECISION-REQUIRED-BEFORE-STAGE-B-D-01)
**Author:** chat (Claude)
**Parent brief:** `docs/briefs/cc-0010-r-reconciliation-evidence-and-matcher.md` (SUPERSEDED-BY for execution per L48 split 2026-05-12)
**Sibling sub-brief (closed):** `docs/briefs/cc-0010A-r-reconciliation-ddl-foundation.md` (cc-0010A v1.5 APPLIED + CLOSED 2026-05-12)
**Sibling sub-brief (gated, out of scope here):** `cc-0010C-reconciliation-matcher.md` (not yet authored; gated on cc-0010B Stage E close)
**Status:** **AUTHORED v1.1 — docs-only; CCD review accepted with corrections applied at this commit. Ready for Stage B D-01 ONCE PK resolves Assumption #3 (slot_id join precedence) per §13.** No D-01 fired this commit. No apply. No deploy. No invocation. No `m.chatgpt_review` write.

**Executor (per stage — explicit per CCH R1 + R11 carried from cc-0009):**

| Stage | Owner | Mechanism |
|---|---|---|
| **B — EF source + `supabase/config.toml`** (`ice-evidence-materialiser` only) | **CC / Claude Code** | git commit to feature branch → diff review → PK approval phrase → merge (CCH R11; NO direct-push to `main`) |
| **C — EF deploy** | **CC / Claude Code** | PowerShell `supabase functions deploy ice-evidence-materialiser --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns` |
| **D — pg_cron schedule** (`ice_evidence_materialiser_30min`) | **chat (ChatGPT-operated)** | Supabase MCP `apply_migration cc_0010b_pg_cron_ice_evidence_materialiser` (vault-backed secret sourcing per L42) |
| **E — first on-demand invocation** | **chat (ChatGPT-operated)** | Supabase MCP `execute_sql` (RPC-style `net.http_post`) |

**CCD / any other Claude Code instance remains read-only unless PK explicitly reassigns.** Stage B + C are the only explicit CC reassignments in cc-0010B. No autonomous Cowork loop participates in any cc-0010B apply gating. **Stage B never direct-pushes to `main`** (CCH R11 carried).

**Cron schedule (CCH R14 fixed UTC anchor carried):** Stage D installs `*/30 * * * *` UTC (every 30 minutes) as a **fixed UTC anchor** — no DST-aware Sydney-local shifting. PRV-0 §D-19 says "every 30 min" for materialiser. The `:00 / :30` slots are reserved for cc-0010B materialiser; cc-0010C matcher will take `:15 / :45` for sequencing.

**Vault-backed secret sourcing (L42 pattern):** `CRON_SECRET` sourced from `vault.decrypted_secrets WHERE name='CRON_SECRET' LIMIT 1`. Vault row id `0fede5c3-f92c-4bd6-8837-c0e304dfca4c` created 2026-05-11 in cc-0009 Stage D vault pivot; reused here. NOT `current_setting('app.settings.cron_secret', true)` (KOI-03 disproved this on managed-PG).

**Authority:** PRV-0 design lock v2 — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7`.
**Source design sections:** PRV-0 v2 §3.4 (`r.ice_publication_evidence` shape — DELIVERED IN cc-0010A; cc-0010B is the populator), §4.3 (`r.compact_raw_json` — DELIVERED IN cc-0010A; cc-0010B consumes), §5.2 (ice-evidence-materialiser EF), §6.1 (materialiser join semantics), §8.3 (cc-0010 scope contract), §D-19 (cron cadence).
**Process baseline:** `docs/runtime/cc_stage_template.md` blob `5657b69e`. `docs/runtime/mcp_review_protocol.md` Evidence Gate (L46) baseline-confirmed v2.67.

---

## Patch history

- **2026-05-12 Sydney — v1.1** (docs-only; CCD review corrections from commit `d2984c20` accepted). **D1 correction**: replaced all references to `rows_skipped_no_evidence` with `rows_skipped` matching the live `r.reconciliation_run` schema — applied at §5.2 HTTP response field list, §5.2 audit-row UPDATE spec, §6.4 V10 SELECT projection, §6.4 V10 PASS criterion. Full-file zero-leftover check passes. **R1 included**: new §4.10b pre-flight probe enumerating non-system triggers on `r.ice_publication_evidence` + `r.reconciliation_run` write targets; halt rule surfaces any unexpected trigger for chat review before Stage E execution. **R2 included**: §5.2 EF spec now explicitly requires materialiser to set `created_by_run_id` + `updated_by_run_id` on every UPSERTed `r.ice_publication_evidence` row using the Stage E audit run_id; §6.7 L45 sanity sample now verifies sampled rows have both columns IS NOT NULL. **Assumption #3 (slot_id join precedence)** marked **PK-DECISION-REQUIRED-BEFORE-STAGE-B-D-01** with default recommendation explicit (forward-compatible guarded branch) and decision paths A/B enumerated. CCD verdict carried: agree-with-corrections, risk low, commit d2984c20 accepted, Stage B D-01 gate now hinges on PK Assumption #3 resolution.
- **2026-05-12 Sydney — v1.0** (initial authoring; docs-only). Authored after cc-0010A v1.5 APPLIED + CLOSED 2026-05-12 (4-way sync close at commit `0589dce264f834a0d53eeb871562a57ae904aa38`). Bakes L44 (Runtime Proof Pre-flight + §1.7b NOT NULL enumeration probe), L45 (post-mutation truth check + count-delta + 5-row sanity sample + mismatch declaration), L46 (clean brief surface to avoid GNB pushback), L48 (atomic sub-build per parent split), L49 NEW (PG reserved-word collision check for PL/pgSQL DECLARE variables — applied as authoring discipline though Stage D cron SQL uses inline literal, no `DECLARE` block). Folds F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) into materialiser horizon contract (today-forward, weekday-filtered, 7-day window default).

---

## §1. Purpose and boundary

### 1.1 What cc-0010B owns

cc-0010B owns the **`ice-evidence-materialiser` Edge Function end-to-end**:

1. **Stage B** — EF source (`supabase/functions/ice-evidence-materialiser/index.ts`) + `supabase/config.toml` amendment (one `[functions.ice-evidence-materialiser] verify_jwt = false` entry).
2. **Stage C** — EF deploy via `supabase functions deploy ice-evidence-materialiser --no-verify-jwt`.
3. **Stage D** — pg_cron schedule `ice_evidence_materialiser_30min` at `*/30 * * * *` UTC with vault-backed `CRON_SECRET` sourcing.
4. **Stage E** — first on-demand `net.http_post` invocation producing initial rows in `r.ice_publication_evidence` from existing pipeline state (`m.post_publish` / `m.post_publish_queue` / `m.post_draft` joined to `r.expected_publication`).

### 1.2 What cc-0010B does NOT own (boundary)

- **`r.*` DDL** — DELIVERED IN cc-0010A v1.5. cc-0010B treats the schema, helper function, FK constraint, and `r.matcher_config` default row as dependency-satisfied.
- **`reconciliation-matcher` EF** — DEFERRED to cc-0010C. cc-0010B writes `r.ice_publication_evidence` but does NOT write `r.reconciliation_match`, does NOT transition `r.expected_publication.expected_status` from `expected` to `matched`, does NOT touch `r.matcher_config`, does NOT compute `delta_minutes_late`.
- **`r.platform_observation` writes** — DEFERRED to PRV-2/3/4. cc-0010B is Tier 1 ICE-evidence only; no platform-side API reads.
- **`r.platform_manual_observation` writes** — DEFERRED to PRV-2.
- **`r.platform_observer_health` writes** — DEFERRED to PRV-2/3/4.
- **v1.6 doc-only patch to cc-0010A** — DEFERRED to separate scope (P2 rank 2 in v2.67 action list). cc-0010B does not amend cc-0010A's brief, result file, or session file.
- **24 historical escalated `m.chatgpt_review` rows** — untouched per CCH directive carried from v2.67.

### 1.3 Why now

`r.expected_publication` has ≥84 rows (cc-0009 Stage E baseline) and is being added to daily by cron job 82 (`cadence_rule_generator_daily`). Without the materialiser, those rows have no evidence linkage — every row stays in `expected_status='expected'` indefinitely. PRV-1 close gate (PRV-0 §8.5 criterion 3) requires Tier 1 ICE matching live; that gates on:

```
cc-0010B materialiser → r.ice_publication_evidence populated
       ↓
cc-0010C matcher → r.reconciliation_match populated + status transitions
       ↓
PRV-1 close gate evaluable
```

cc-0010B is the second link in the chain. cc-0010A delivered the schema; cc-0010B delivers the data. cc-0010C delivers the match.

### 1.4 What cc-0010B delivers (when all four stages close)

1. **1 new Edge Function deployed** — `ice-evidence-materialiser` (TypeScript, Deno) with `verify_jwt=false` declared in `supabase/config.toml` (durable per F-EF-DRIFT-PREVENTION).
2. **1 new pg_cron job** — `ice_evidence_materialiser_30min` at `*/30 * * * *` UTC, vault-backed `CRON_SECRET`, `timeout_milliseconds := 30000` per F-CRON-PG-NET-TIMEOUT-30S.
3. **N new rows in `r.ice_publication_evidence`** — N derived during verification from live `m.*` pipeline state for `r.expected_publication` rows in window. Empirical observation; may be 0 in test envelope (PASS-with-empirical-observation per L43 pattern). Each row carries `created_by_run_id` + `updated_by_run_id` populated with the Stage E audit run_id (per R2 v1.1 requirement).
4. **1 new audit row in `r.reconciliation_run`** — `run_type='ice_evidence_materialisation'`, `triggered_by='cc-0010B-stage-e-first'`.
5. **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) reconciled** at materialiser horizon contract.

---

## §2. Dependency section

### 2.1 cc-0010A applied state (cc-0010B's hard dependency)

cc-0010B Stage D + Stage E **REQUIRE** the following cc-0010A v1.5 outputs to be live at the moment of apply:

| Object | Type | Source (cc-0010A v1.5) | cc-0010B usage |
|---|---|---|---|
| `r.ice_publication_evidence` | table (17 cols, UNIQUE on expected_publication_id) | §2.1 of cc-0010A | **WRITE target — primary** |
| `r.reconciliation_run` | table (cc-0009 carry; cc-0010A unchanged) | cc-0009 Stage A | **WRITE target — audit row** |
| `r.expected_publication` | table (84+ rows, cc-0009 carry) | cc-0009 Stage A + Stage E backfill | **READ — driver query** |
| `r.compact_raw_json(jsonb) → jsonb` | function (IMMUTABLE plpgsql; **§2.7 helper renamed `out` → `result_jsonb` at apply construction**) | §2.7 of cc-0010A v1.5 | **CALL** during raw_evidence compaction |
| `r.expected_publication.matched_match_id FK → r.reconciliation_match` | FK constraint (L38 vindicated) | §2.8 of cc-0010A v1.5 | **READ-ONLY** (cc-0010B doesn't write this column; cc-0010C does) |
| `r.matcher_config` global default row | data row (1 row, NULL/NULL keys) | §2.6 of cc-0010A v1.5 | **NOT USED IN cc-0010B** (matcher reads this; materialiser doesn't) |

### 2.2 cc-0010A v1.5 L45 accepted variances (carry as context for cc-0010B)

cc-0010B authoring + future apply must remain aware of the 5 L45 mismatches that landed accept-with-variance:

| # | Variance | cc-0010B impact |
|---|---|---|
| 1 | `r.compact_raw_json` body uses `result_jsonb` (not `out` as in cc-0010A brief §2.7) due to PG reserved-word collision in PL/pgSQL DECLARE. **Semantically identical.** | cc-0010B EF code calls `r.compact_raw_json(...)` — the rename is internal to the function body; the public signature `r.compact_raw_json(jsonb) RETURNS jsonb` is unchanged. **No cc-0010B impact.** |
| 2 | V3 baseline function count is 4 (live) vs 3 (cc-0010A brief expected) due to `r.set_updated_at` cc-0009 trigger helper carry-over | cc-0010B does NOT install new `r.*` functions. Pre-flight §3.2 expects ≥4 routines, not =3. |
| 3 | V6 purpose-marker REPLACE was a no-op on cc-0010A v1.5 (substantive FK fields correct; brief §3.8 footnote anticipated). Fix-forward in v1.6 doc patch (separate scope). | cc-0010B does NOT touch `k.column_registry` for `r.expected_publication.matched_match_id`. **No cc-0010B impact.** |
| 4 | `k.table_registry` r.* live baseline = 5, not 2 (3 geography rows: country, country_subdivision, country_timezone — F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION P3 OPEN) | cc-0010B does NOT insert new `k.table_registry` rows. Pre-flight §3.4 baseline expectation = 11 (5 pre-cc-0010A + 6 from cc-0010A). |
| 5 | `k.column_registry` r.* live baseline = 95 + 86 from cc-0010A = 181, not the cc-0010A-brief-implicit 17 | cc-0010B does NOT insert new `k.column_registry` rows. Pre-flight §3.4 baseline expectation = 181. |

### 2.3 cc-0009 outputs cc-0010B depends on

| Object | Status | cc-0010B usage |
|---|---|---|
| `r.expected_publication` (84+ rows live) | cc-0009 Stage A + Stage E backfill; cron 82 adds daily | **READ — driver query (Stage E)** |
| `r.normalise_text(text) → text` | cc-0009 v2 narrowed contract (R7 lock holds) | NOT used by cc-0010B (caption normalisation is observer/matcher concern) |
| `r.to_sydney_local_date(timestamptz) → date` | cc-0009 helper | **CALL** when joining `m.post_publish.published_at::date` to `r.expected_publication.expected_local_date` (Sydney-local) |
| `cron.job` jobid 82 `cadence_rule_generator_daily` at `5 16 * * *` UTC | cc-0009 Stage D vault-pivot, firing daily | informational only; cc-0010B does NOT touch this job |
| `vault.secrets.CRON_SECRET` row id `0fede5c3-f92c-4bd6-8837-c0e304dfca4c` | cc-0009 Stage D vault pivot 2026-05-11 10:18 UTC | **READ** at Stage D cron command construction via `vault.decrypted_secrets` |

### 2.4 ICE pipeline (`m.*`) read dependencies

cc-0010B is read-only against `m.*`. **No `m.*` writes** beyond R5-style `m.chatgpt_review` close-the-loop (4 stage UPDATEs, status='resolved').

| Table | Used by materialiser for | Join key candidates |
|---|---|---|
| `m.post_publish` | `pipeline_state='published'` evidence (published_at populated) | `client_id`, `platform`, `published_at::date` (Sydney-local) |
| `m.post_publish_queue` | `pipeline_state='queued'/'attempted'/'failed'` evidence | `queue_id` (PK), `client_id`, `platform`, `scheduled_for::date` (Sydney-local) |
| `m.post_draft` | `pipeline_state='drafted'` evidence | `post_draft_id`, `client_id`, `platform`, `created_at::date` (Sydney-local) |
| `m.slot` | direct join via `r.expected_publication.slot_id` when non-null | `slot_id` |

**Naming asymmetry caught in cc-0010A v1.3 L44 pre-flight:** `m.post_publish_queue` PK column is `queue_id`, not `post_publish_queue_id`. cc-0010A's FK on `r.ice_publication_evidence.post_publish_queue_id` correctly targets `m.post_publish_queue(queue_id)`. cc-0010B's materialiser SQL must follow the same naming when SELECTing — use `mppq.queue_id` for join + INSERT.

### 2.5 Naming + structural conventions inherited

- **EF slug:** `ice-evidence-materialiser` (PRV-0 §5.2 verbatim)
- **Migration name (Stage D only):** `cc_0010b_pg_cron_ice_evidence_materialiser` (snake_case; chat-only apply per L36 + memory standing rule on DDL routing)
- **Cron jobname:** `ice_evidence_materialiser_30min`
- **`run_type` for audit row:** `ice_evidence_materialisation` (consistent with parent cc-0010 v1 §6.1)
- **`triggered_by` (Stage E):** `cc-0010B-stage-e-first`
- **`triggered_by` (cron firing):** `pg_cron_ice_evidence_materialiser_30min`

### 2.6 What cc-0010B does NOT depend on

- `r.platform_observation` — empty (cc-0010A created; PRV-2/3/4 populates). cc-0010B does not read this.
- `r.platform_manual_observation` — empty (cc-0010A created; PRV-2 populates). cc-0010B does not read this.
- `r.platform_observer_health` — empty (cc-0010A created; PRV-2/3/4 populates). cc-0010B does not read this.
- `r.matcher_config` — present (cc-0010A inserted 1 global default). cc-0010B does not read this; cc-0010C will.
- `r.reconciliation_match` — empty (cc-0010A created; cc-0010C populates). cc-0010B does not read this.

---

## §3. Atomicity and scope

### 3.1 Atomicity gate (L48 — Stage B onward of already-split brief; parent decision carries)

Per `docs/runtime/cc_stage_template.md`: "For Stage B onward of an already-split brief, this section is omitted; the parent atomicity decision carries." The parent cc-0010 atomicity gate result (2 of 3 = split) lives in cc-0010 v1 `## Split decision` section. cc-0010B inherits the **split outcome** and is itself atomic-as-a-4-stage-sub-build (Stages B+C+D+E for materialiser only).

**cc-0010B internal atomicity reasoning:**

| Q | Question | Answer |
|---|---|---|
| Internal Q1 | Can cc-0010B succeed or fail as one logical sub-unit? | **yes** — all 4 stages target one EF + one cron + one first invocation; each stage has its own rollback path; failures at any stage do not poison cc-0010A's already-applied state |
| Internal Q2 | More than 3 unresolved assumptions at cc-0010B v1.1 approval? | **1** (Assumption #3 slot_id join precedence — PK decision required before Stage B D-01; others resolved via R1/R2 inclusion at v1.1) |
| Internal Q3 | Would a late-stage failure force rollback of earlier stages? | **no** — Stage B+C revertible via feature-branch revert; Stage D revertible via `cron.unschedule`; Stage E revertible via `r.reconciliation_run.status='partial'` mark + optional row delete under PK approval |

No further split needed. cc-0010B proceeds as a 4-stage atomic sub-build.

### 3.2 Exact production surface cc-0010B creates or alters

**Stage B creates (on feature branch first, then merged to main):**

1. New directory + file: `supabase/functions/ice-evidence-materialiser/index.ts`
2. New section in `supabase/config.toml`:
   ```toml
   [functions.ice-evidence-materialiser]
   verify_jwt = false
   ```
   Alphabetised insertion. cadence-rule-generator (cc-0009) + other existing entries preserved unchanged.

**Stage C creates (production deploy, not VCS):**

3. New deployed Edge Function on Supabase project `mbkmaxqhsohbtwsqolns`, slug `ice-evidence-materialiser`, status ACTIVE, `verify_jwt=false`, accessible at `https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/ice-evidence-materialiser`.

**Stage D creates:**

4. New row in `cron.job` with `jobname='ice_evidence_materialiser_30min'`, schedule `*/30 * * * *`, command sourcing `CRON_SECRET` from `vault.decrypted_secrets`, body `{horizon_days: 7, backfill_days: 0, triggered_by: 'pg_cron_ice_evidence_materialiser_30min'}`, `timeout_milliseconds := 30000`. `active=true`.
5. New row in `supabase_migrations.schema_migrations` (`cc_0010b_pg_cron_ice_evidence_materialiser`).

**Stage E creates:**

6. 1 row in `r.reconciliation_run` (`run_type='ice_evidence_materialisation'`, `triggered_by='cc-0010B-stage-e-first'`, status='succeeded' or 'partial').
7. N rows in `r.ice_publication_evidence` (N derived live; per CCH R4 carried; may be 0 — PASS-with-empirical-observation valid). Each row carries `created_by_run_id` + `updated_by_run_id` populated with the Stage E audit run_id (R2 v1.1 requirement).

### 3.3 Out of scope (explicit)

- Any `r.*` DDL (cc-0010A delivered).
- Any new `r.*` function (cc-0010A delivered `r.compact_raw_json`; cc-0009 delivered `r.normalise_text` + `r.to_sydney_local_date` + `r.set_updated_at`).
- `reconciliation-matcher` EF source, deploy, cron, invocation (cc-0010C).
- Any write to `r.reconciliation_match`, `r.platform_observation`, `r.platform_manual_observation`, `r.platform_observer_health`, `r.matcher_config`.
- Any UPDATE on `r.expected_publication` (cc-0010C handles status transitions; cc-0010B is purely an evidence inserter).
- Any `k.*` writes (cc-0010A delivered registry catalog for the 6 r.* tables; cc-0010B does not amend or add registry rows).
- `r.normalise_text` expansion (cc-0009 R7 lock holds).
- DST-aware Sydney-local cron rescheduling (CCH R14 fixed UTC anchor lock).
- M8b separate brief work.
- 5-row close-the-loop batch sweep + 24-row historical batch (separate scope; v2.67 ranks 3).
- Dashboard PHASES reconciliation (23rd consecutive deferral; carry).
- F-CRON-AUTO-APPROVER-SECRET-INLINE (separate; PK approval required).
- v1.6 doc patch to cc-0010A (separate scope).

### 3.4 No orphan cron-only work

Per the parent cc-0010 v1 split decision: "Cron scheduling folds into each EF-owned sub-brief (cc-0010B owns the materialiser cron; cc-0010C owns the matcher cron). No orphan cron-only sub-brief." cc-0010B Stage D installs the materialiser cron in the same sub-build as the materialiser EF source/deploy/first-invocation. No separate cron-only PR/migration.

### 3.5 Forbidden actions (Stage B–E)

- **No `apply_migration` before each stage's D-01 returns clean agree + PK explicit approval phrase.**
- **No `execute_sql` for any DDL** (memory standing rule).
- **No DDL deviation from cc-0010A v1.5 applied state** unless §3 pre-flight surfaces a genuine blocker (in which case HALT + escalate to brief amendment).
- **No `r.platform_observation` / `r.platform_manual_observation` / `r.reconciliation_match` / `r.matcher_config` reference in materialiser EF code** (Tier 1 ICE evidence only; reference is scope creep — chat HALTs at Stage B D-01 diff review).
- **No EF deploy by chat** — Stage C is CC-only per CCH R1 + memory standing rule.
- **No direct-push to `main` for Stage B** (CCH R11 carried).
- **No cron schedule cadence outside fixed UTC anchor `*/30 * * * *`** (CCH R14 + PRV-0 §D-19 lock).
- **No `verify_jwt: true`** (v2.54 lesson; custom-header internal cron pattern).
- **No GUC-based secret sourcing** (`current_setting('app.settings.cron_secret', true)` — KOI-03 disprovenance).
- **No matcher cron job creation** (`reconciliation_matcher_30min` is cc-0010C's territory).
- **No writes to `c.*`, `f.*`, `t.*`, `a.*`, `m.*` beyond R5 close-the-loop** (4 stage UPDATEs on `m.chatgpt_review` only).
- **No proceeding past any stage's D-01 if verdict != `agree` with `proceed`** (or PK explicit Lesson #62 / L46 type-(c) state-capture override).
- **No skip of inter-stage gate** (e.g., proceeding to Stage D before Stage C deploy V8a PASS).
- **No reassignment of CCD / other CC instances** without PK explicit approval.
- **No mutation of cc-0010A** at commit `3db84322` or its result file (cc-0010A frozen per ICE-PROC-001 §9.1; v1.6 doc patch is separately scoped).
- **No touching of 24 historical escalated `m.chatgpt_review` rows.**
- **No expansion of `r.normalise_text`** (cc-0009 R7 lock).
- **No PL/pgSQL DECLARE blocks in any cc-0010B SQL using reserved words** (`out`, `result`, `record`, `row`, etc. — L49 NEW candidate v2.67 baked in; safe variable names mandatory; Stage D cron migration uses inline literal SQL only, no DECLARE — verified at authoring).
- **No firing of Stage B D-01 until PK resolves Assumption #3** (slot_id join precedence — §13 #3 carries the explicit gate).

---

## §4. Pre-flight verification (read-only) — TO RUN AT EACH STAGE'S APPLY GATE

All §4.x sub-checks are read-only against production via Supabase MCP `execute_sql`. **Re-run each immediately preceding each apply within ~60s** to confirm no drift (P1–P5 discipline per Lesson #61; L44 Runtime Proof Pre-flight v2.67 baseline-eligible).

### 4.1 (All stages) cc-0010A v1.5 applied state still in place

```sql
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='ice_publication_evidence') AS ipe_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='reconciliation_run')      AS rr_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='expected_publication')   AS ep_exists,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='r' AND routine_name='compact_raw_json') AS fn_compact_exists,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='r' AND routine_name='to_sydney_local_date') AS fn_to_syd_exists,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='r' AND routine_name='normalise_text')   AS fn_normalise_exists,
  (SELECT COUNT(*) FROM r.ice_publication_evidence) AS ipe_existing_rows,
  (SELECT COUNT(*) FROM r.expected_publication)     AS ep_row_count,
  (SELECT COUNT(*) FROM r.reconciliation_run)       AS rr_row_count,
  (SELECT COUNT(*) FROM r.matcher_config)           AS matcher_config_rows;
```

**Decision rule:**
- All booleans `true`.
- `ipe_existing_rows = 0` at Stage D pre-flight (materialiser not yet fired) and `= 0` at Stage E pre-flight (Stage E IS the first invocation).
- `ep_row_count >= 84` (cc-0009 baseline; cron 82 may have added more).
- `rr_row_count >= 5` (cc-0009: 4 from Stage C+E + cc-0010A: 0; cron 82 firings since 2026-05-11 may have added).
- `matcher_config_rows = 1` (cc-0010A global default).

Drift on any → HALT (§9.2.a).

### 4.2 (All stages) cc-0010A FK constraint still live (matched_match_id)

```sql
SELECT con.conname, pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con
JOIN pg_class t ON t.oid = con.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='r' AND t.relname='expected_publication'
  AND con.contype = 'f'
  AND pg_get_constraintdef(con.oid) LIKE '%matched_match_id%';
```

**Decision rule:** 1 row; def matches `FOREIGN KEY (matched_match_id) REFERENCES r.reconciliation_match(reconciliation_match_id) ON DELETE SET NULL`. Drift → HALT (§9.2.b — cc-0010A regression).

### 4.3 (All stages) `r.compact_raw_json` empirical sanity (L45 variance carry)

cc-0010A v1.5 §2.7 helper installed with `result_jsonb` variable name (renamed from brief's `out`). Verify functional behaviour:

```sql
SELECT
  r.compact_raw_json('{"keep":1,"__internal_debug":"x"}'::jsonb)::text AS strip_one,
  r.compact_raw_json('{"a":1,"request_headers":{"x":1},"response_headers":[],"full_html":"<html>"}'::jsonb)::text AS strip_multiple,
  r.compact_raw_json(NULL)::text AS null_in,
  r.compact_raw_json('null'::jsonb)::text AS jsonb_null_in;
```

**Decision rule:** `strip_one = '{"keep": 1}'`; `strip_multiple = '{"a": 1}'`; `null_in IS NULL`; `jsonb_null_in = 'null'`. Drift → HALT (§9.2.c — cc-0010A function regression, escalate to v1.6 fix-forward).

### 4.4 (Stage B + C) `ice-evidence-materialiser` slug + config.toml absence

Via MCP `list_edge_functions`:

```
Expect: no slug 'ice-evidence-materialiser' in current EF list (slug is cc-0010B's introducer).
```

CC reads `supabase/config.toml` on `main`:

```
Expect: no `[functions.ice-evidence-materialiser]` section on main (cc-0010B Stage B introduces).
Other entries (cadence-rule-generator, pre-cc-0009 EFs) unchanged.
```

**Decision rule:** EF slug not present AND config.toml section not present on main → PASS. Either present → HALT (§9.2.d — idempotency violated; investigate prior partial apply).

### 4.5 (Stage D) Cron jobname collision survey

```sql
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname IN ('ice_evidence_materialiser_30min')
   OR (active = true AND schedule = '*/30 * * * *')
ORDER BY jobid;
```

**Decision rule:**
- 0 rows with `jobname='ice_evidence_materialiser_30min'` → PASS for jobname.
- Existing job(s) at `*/30 * * * *` schedule → SURFACE for PK awareness (multiple jobs can share schedule; not a collision per se).
- 1+ row with jobname collision → HALT (§9.2.e).

### 4.6 (Stage D) Vault row CRON_SECRET still resolvable (no secret value into chat)

```sql
SELECT
  (SELECT COUNT(*) FROM vault.secrets WHERE name = 'CRON_SECRET') AS vault_row_count,
  EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1) AS vault_resolvable,
  (SELECT length(decrypted_secret) FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1) AS decrypted_length;
```

**Decision rule:** `vault_row_count = 1`; `vault_resolvable = true`; `decrypted_length > 0` (length-only flag; secret value NEVER captured into chat or migration body). Drift → HALT (§9.2.f).

### 4.7 (Stage D) Migration name uniqueness

```sql
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE name IN ('cc_0010b_pg_cron_ice_evidence_materialiser')
ORDER BY name;
```

**Decision rule:** 0 rows → PASS. 1+ row → HALT (§9.2.g — prior partial cc-0010B apply).

### 4.8 (Stage D) Existing `[functions.ice-evidence-materialiser]` entry verification post-merge

After Stage B feature branch merges + Stage C deploy succeeds, before Stage D apply, re-verify:

```sql
-- via list_edge_functions only; SQL cannot read supabase/config.toml directly
```

CC + chat coordinate: CC confirms Stage B merge SHA + post-merge `supabase/config.toml` state; chat confirms `list_edge_functions` shows slug ACTIVE with `verify_jwt=false`. Both checks must PASS within ~60s of Stage D apply.

### 4.9 (Stage E) Stage B + C + D outputs in place

```sql
SELECT
  EXISTS (SELECT 1 FROM cron.job WHERE jobname='ice_evidence_materialiser_30min' AND active=true) AS cron_active,
  (SELECT command FROM cron.job WHERE jobname='ice_evidence_materialiser_30min' LIMIT 1) AS cron_command_preview,
  (SELECT COUNT(*) FROM r.ice_publication_evidence) AS evidence_existing_rows;
```

**Decision rule:**
- `cron_active = true`.
- `cron_command_preview` contains `'vault.decrypted_secrets'` + `'ice-evidence-materialiser'` + `'timeout_milliseconds := 30000'`.
- `evidence_existing_rows = 0` (Stage E IS the first invocation; cron may have fired in interim if Stage D landed > 30 min before Stage E — see §10.2.h flagged-but-non-blocking path).

Drift → HALT (§9.2.h).

### 4.10 (Stage E) `m.*` pipeline state inventory (informational; expected materialiser output sizing)

```sql
SELECT
  (SELECT COUNT(*) FROM m.post_publish      WHERE published_at >= now() - interval '7 days') AS published_rows_7d,
  (SELECT COUNT(*) FROM m.post_publish_queue WHERE created_at  >= now() - interval '7 days') AS queue_rows_7d,
  (SELECT COUNT(*) FROM m.post_draft        WHERE created_at  >= now() - interval '7 days') AS draft_rows_7d,
  (SELECT COUNT(*) FROM r.expected_publication WHERE expected_local_date BETWEEN (now() AT TIME ZONE 'Australia/Sydney')::date - interval '8 days'
                                                                              AND (now() AT TIME ZONE 'Australia/Sydney')::date + interval '7 days') AS ep_in_window;
```

**Decision rule:** Informational. No HALT. Numbers used in V11 expected-count derivation (per CCH R4 carried). If all `m.*` counts are 0, Stage E will produce 0 evidence rows — empirically valid; PASS-with-empirical-observation per L43.

### 4.10b (Stage E + Stage D defensive — R1 v1.1 carry) Trigger inventory on cc-0010B write targets

**Purpose:** Surface any non-system trigger attached to `r.ice_publication_evidence` or `r.reconciliation_run` before Stage E execution. cc-0009 + cc-0010A established `r.set_updated_at` as the canonical trigger pattern on r.* tables (carried as V3 +1 in cc-0010A v1.5 L45 mismatch declaration #2). Any trigger BEYOND `r.set_updated_at` is a red flag — could indicate external instrumentation, audit hooks, or unintended cross-table dependencies that would interact with materialiser writes in unexpected ways.

```sql
SELECT
    c.relname AS table_name,
    t.tgname,
    pg_get_triggerdef(t.oid) AS trigger_def
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'r'
  AND c.relname IN ('ice_publication_evidence', 'reconciliation_run')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;
```

**Decision rule:**
- **Expected triggers (PASS):** `r.set_updated_at` style trigger on each table (BEFORE UPDATE setting `updated_at = now()`). Trigger name conventionally `set_updated_at` or `trg_set_updated_at`. Trigger def references `r.set_updated_at()` function. **Both tables must show exactly one such trigger.**
- **Any additional non-system trigger** (e.g., `audit_log_*`, `validate_*`, `notify_*`, anything cross-table) → **SURFACE for chat review BEFORE Stage E executes**. Halt rule §9.2.o.
- **Missing `set_updated_at` trigger on either table** → SURFACE; cc-0010A v1.5 V3 reported `r.set_updated_at` as present, so missing here indicates regression. HALT §9.2.o.

**When to run:** Stage D pre-flight (defensive — Stage D doesn't write to either table, but Stage E will; surfacing earlier gives chat / PK time to investigate). MUST re-run within ~60s of Stage E apply gate.

### 4.11 (L44 §1.7b NOT NULL enumeration carry — defensive)

cc-0010A v1.4 introduced §1.7b NOT NULL column enumeration after the v1.3 atomic rollback exposed `k.column_registry.ordinal_position` blind spot. cc-0010B does NOT insert any `k.*` rows, so the L44 §1.7b probe does not apply directly. However, defensive carry:

```sql
-- Verify r.ice_publication_evidence INSERT shape covers all NOT NULL columns
SELECT column_name, is_nullable, data_type, column_default
FROM information_schema.columns
WHERE table_schema='r' AND table_name='ice_publication_evidence'
  AND is_nullable='NO' AND column_default IS NULL
ORDER BY ordinal_position;
```

**Decision rule:** Enumerate NOT NULL columns without default. Materialiser EF INSERT body must explicitly set each one OR the INSERT will fail at runtime. Expected NOT NULL without default (per cc-0010A v1.5 §2.1):
- `expected_publication_id` (uuid) — materialiser sets from driver query
- `pipeline_state` (text CHECK 5-enum) — materialiser sets from join state classification

Columns with `DEFAULT gen_random_uuid()` (`ice_publication_evidence_id`) or `DEFAULT now()` (`created_at`, `updated_at`) — defaults cover; materialiser does not set.

Columns `created_by_run_id` + `updated_by_run_id` are NULLABLE (no NOT NULL constraint), BUT per R2 v1.1 the materialiser MUST set both explicitly using the Stage E audit run_id — see §5.2 for the requirement and §6.7 for L45 verification.

This probe is run at Stage B D-01 (chat reviews CC's diff against this NOT NULL list).

### 4.12 (L49 NEW v2.67 — PG reserved-word collision check on PL/pgSQL DECLARE)

cc-0010B Stage D migration uses inline literal SQL inside `cron.schedule()` second-argument string — no `DECLARE` block, no PL/pgSQL function body. **L49 collision-risk: NONE for cc-0010B Stage D migration.**

The materialiser EF (Stage B) is TypeScript / Deno — no PL/pgSQL DECLARE at all. **L49 collision-risk: NONE for Stage B.**

Authoring discipline confirms: cc-0010B introduces zero new PL/pgSQL functions. No reserved-word check needed in pre-flight. **Recorded for transparency.**

### 4.13 Probe verdict template (L44 verbatim capture)

At each stage's apply gate:

```
Q4.1 output: { ... }
Q4.2 output: { ... }
...
Q4.10b output: { table_name, tgname, trigger_def } rows
...

Q4.1 verdict: PASS — all booleans true; ipe_existing_rows = 0; ep_row_count = NNN.
Q4.2 verdict: PASS — FK live with expected def.
...
Q4.10b verdict: PASS — only r.set_updated_at on both tables / FLAGGED — additional trigger <name> present, surface to PK.
...
```

Probe output captured verbatim, not paraphrased. Halt condition: any probe contradicts a brief assumption → halt stage, amend brief, re-fire D-01.

---

## §5. Apply section

### 5.1 Apply boundary discipline (CCH mutation-only-after-PK-approval)

Each stage applies ONLY after:
1. Stage pre-flight (§4.x) returns clean PASS.
2. Stage D-01 fires (`ask_chatgpt_review`) and returns verdict=`agree` with `proceed` direction (L46 Evidence Gate baseline-confirmed v2.67).
3. PK gives explicit approval phrase (verbatim, in chat).

No autonomous apply. No "implicit" approval from prior stage approval. No state-capture override unless PK explicitly invokes L46 type-(c) carryover path.

**Additional gate at Stage B:** Stage B D-01 must NOT fire until PK resolves Assumption #3 (slot_id join precedence) per §13 — path A (forward-compatible guarded branch) OR path B (no-slot path; slot_id deferred).

### 5.2 Stage B — EF source + `supabase/config.toml` amendment (CC-owned)

**Mechanism:** CC creates feature branch `feat/cc-0010B-ice-evidence-materialiser`, commits source + config amendment, pushes to GitHub. Chat fires Stage B D-01 reviewing CC's diff via GitHub MCP. PK approves. CC merges to `main` (no direct push; CCH R11 carried).

**Files created on feature branch:**

1. `supabase/functions/ice-evidence-materialiser/index.ts` — TypeScript / Deno EF source. Spec below.
2. `supabase/config.toml` — alphabetised insertion of:
   ```toml
   [functions.ice-evidence-materialiser]
   verify_jwt = false
   ```

**EF responsibilities (PRV-0 §5.2):**

- **HTTP handler:** `Deno.serve` POST. Body schema `{horizon_days?: number, backfill_days?: number, triggered_by?: string}`. Defaults: `horizon_days=7`, `backfill_days=0`, `triggered_by='manual'`.
- **Auth:** `x-cron-secret` header compared to `Deno.env.get('CRON_SECRET')`. 401 on mismatch. No body without header → 401.
- **Supabase client:** `service_role` JWT from `SUPABASE_SERVICE_ROLE_KEY` env var.
- **Driver query:** `r.expected_publication` rows in window `expected_local_date BETWEEN today_sydney - backfill_days AND today_sydney + horizon_days` WHERE `expected_status IN ('expected', 'backfilled')` (skip 'suppressed' and already-'matched').
- **Per-row match attempt order** (subject to PK Assumption #3 resolution per §13):
  1. **slot_id direct join** if `r.expected_publication.slot_id` is non-null — guarded path; current cc-0009 emits all-NULL slot_id, so this branch is dead-code-ready and exercised only when future cc-0009 EF version emits slot_id. Look up `m.slot` row; trace forward through `m.post_draft` → `m.post_publish_queue` → `m.post_publish` via `slot_id` linkage.
  2. **(client_id, platform, scheduled_for date)** join via `m.post_publish_queue.scheduled_for::date AT TIME ZONE 'Australia/Sydney' = r.expected_publication.expected_local_date`.
  3. **(client_id, platform, published_at date)** join via `m.post_publish.published_at::date AT TIME ZONE 'Australia/Sydney' = r.expected_publication.expected_local_date`.
- **Pipeline_state classification** (PRV-0 §3.4 CHECK enum):
  - `m.post_publish` row found with `published_at IS NOT NULL` → `pipeline_state='published'`.
  - `m.post_publish_queue` row found, no `m.post_publish` linkage → classify by queue status: `failed` if queue.status='failed'; `attempted` if queue.status='processing' or similar; `queued` otherwise.
  - `m.post_draft` row found, no queue linkage → `pipeline_state='drafted'`.
  - No match across all three → **emit NO evidence row** (driver loop continues to next expected_publication; increment `rows_skipped` counter).
- **UPSERT on `r.ice_publication_evidence`:** `ON CONFLICT (expected_publication_id) DO UPDATE` (UNIQUE constraint enforces idempotency). Latest-wins semantics: when multiple pipeline rows match the same expected_publication, materialiser picks the one with maximum `COALESCE(published_at, scheduled_for, created_at)`.
- **`raw_evidence` compaction:** populate via `r.compact_raw_json(row_to_json(pipeline_row)::jsonb)`. Helper strips `['__internal_debug', 'request_headers', 'response_headers', 'full_html']` per cc-0010A v1.5 delivery.
- **Run-id stamping (R2 v1.1 REQUIREMENT):** Materialiser MUST set BOTH `created_by_run_id` AND `updated_by_run_id` on every UPSERTed `r.ice_publication_evidence` row, using the **Stage E audit run_id** (the `reconciliation_run_id` from the `INSERT INTO r.reconciliation_run` performed at the start of the EF invocation). On INSERT path: both columns = current run_id. On UPDATE path (idempotent re-run hitting `ON CONFLICT`): `updated_by_run_id` = current run_id; `created_by_run_id` is preserved unchanged (i.e., `ON CONFLICT (expected_publication_id) DO UPDATE SET ..., updated_by_run_id = EXCLUDED.updated_by_run_id` — do NOT set `created_by_run_id` in the UPDATE clause). The audit trail thereby distinguishes the original materialisation run from the most-recent refresh.
- **Audit row:** INSERT into `r.reconciliation_run` BEFORE the driver loop with `run_type='ice_evidence_materialisation'`, `status='running'`, `trigger=...`, `triggered_by=...`. UPDATE at end with `status` ∈ {`succeeded`, `partial`, `failed`}, `rows_processed`, `rows_inserted`, `rows_updated`, `rows_skipped`, `duration_ms`. The `rows_skipped` counter records expected_publication rows that found no pipeline match (no evidence emitted) — column name matches the live `r.reconciliation_run` schema per D1 v1.1 correction.
- **Error handling:** per-row try/catch; one row's failure does not abort the whole run; aggregate failures land in `r.reconciliation_run.error_summary`. If ALL rows fail, run status = `failed`.
- **No writes outside `r.ice_publication_evidence` + `r.reconciliation_run`.** No writes to `m.*`. No reads of `r.platform_observation` / `r.platform_manual_observation` / `r.reconciliation_match` / `r.matcher_config` (Tier 1 ICE-only; scope-creep guard).
- **HTTP response:** 200 with `{run_id, rows_planned, rows_inserted, rows_updated, rows_skipped, duration_ms}`.

**F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) alignment (carried from parent cc-0010 v1):**

- Materialiser horizon contract uses `backfill_days=0` by default, matching cc-0009 EF's today-forward-only weekday-filtered emission baseline.
- If a future cc-0009 EF revision emits past-portion rows, materialiser is forward-compatible (driver query is purely date-range-based; no assumption about which dates exist).

### 5.3 Stage C — EF deploy (CC-owned)

**Mechanism:** CC runs from `C:\Users\parve\Invegent-content-engine` after `git checkout main && git pull origin main`:

```powershell
supabase functions deploy ice-evidence-materialiser --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns
```

**`--no-verify-jwt` rationale:** Custom-header auth (`x-cron-secret`) used instead of JWT. `verify_jwt=false` declared durably in `supabase/config.toml` per F-EF-DRIFT-PREVENTION; CLI flag matches.

**Post-deploy verification** (V8a in §6): chat fires `get_edge_function` + manual probe (POST without `x-cron-secret` → expect 401; POST with wrong secret → expect 401).

### 5.4 Stage D — pg_cron schedule (chat-owned)

**Migration:** `cc_0010b_pg_cron_ice_evidence_materialiser`.

**SQL body (single transactional unit, inline literal — NO PL/pgSQL DECLARE, L49 collision-risk-free):**

```sql
SELECT cron.schedule(
    'ice_evidence_materialiser_30min',
    '*/30 * * * *',  -- Fixed UTC anchor (CCH R14): every 30 minutes. No DST-aware shifting.
    $$
    SELECT net.http_post(
        url := 'https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/ice-evidence-materialiser',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
        ),
        body := jsonb_build_object(
            'horizon_days', 7,
            'backfill_days', 0,
            'triggered_by', 'pg_cron_ice_evidence_materialiser_30min'
        ),
        timeout_milliseconds := 30000
    );
    $$
);
```

**Schedule rationale:**
- `*/30 * * * *` UTC → fires at :00 and :30 of every hour, every day. Fixed UTC anchor per CCH R14 lock; no Sydney-local DST shifting.
- Materialiser at :00/:30 reserved for cc-0010B. cc-0010C matcher will use `15-59/30 * * * *` (:15/:45) to preserve materialiser-before-matcher sequencing every 30-minute window.

**Vault sourcing rationale (L42 pattern carried):**
- Same vault row `0fede5c3-f92c-4bd6-8837-c0e304dfca4c` as cc-0009 cron job 82.
- `decrypted_secret` resolved at cron firing time, not at schedule time. Rotation of the vault row affects subsequent firings; existing scheduled job picks up new value transparently.
- `vault.decrypted_secrets` is the canonical resolution view (not `vault.secrets` which holds encrypted blob).

**Timeout:** `30000` ms per F-CRON-PG-NET-TIMEOUT-30S standard. Materialiser p95 expected < 5s for 100 r.expected_publication rows in window; 30s cap is generous safety margin.

### 5.5 Stage E — first on-demand invocation (chat-owned)

**Mechanism:** Supabase MCP `execute_sql`, single statement:

```sql
SELECT net.http_post(
    url := 'https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/ice-evidence-materialiser',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := jsonb_build_object(
        'horizon_days', 7,
        'backfill_days', 0,
        'triggered_by', 'cc-0010B-stage-e-first'
    ),
    timeout_milliseconds := 30000
) AS request_id;
```

**Sequencing protection:**
- If Stage D landed > 30 min before Stage E, cron may have fired once or more in the interim and produced its own evidence rows (`triggered_by='pg_cron_ice_evidence_materialiser_30min'`).
- This is **not a failure** — Stage E's `triggered_by='cc-0010B-stage-e-first'` distinguishes the on-demand fire from cron fires for V-check attribution.
- V11 explicitly filters `r.reconciliation_run WHERE triggered_by = 'cc-0010B-stage-e-first'` for the Stage E audit row count delta.
- If cron has already fired, `r.ice_publication_evidence` may have rows from cron + Stage E first invocation; the UPSERT semantics ensure idempotency (latest evidence wins per `expected_publication_id`).

**Wait + poll pattern (after `net.http_post` returns request_id):**

```sql
-- Wait briefly for materialiser to complete
SELECT pg_sleep(8);

-- Then read the audit row
SELECT reconciliation_run_id, run_type, status, rows_processed, rows_inserted, rows_updated, rows_skipped,
       duration_ms, error_summary
FROM r.reconciliation_run
WHERE triggered_by = 'cc-0010B-stage-e-first'
ORDER BY started_at DESC
LIMIT 1;
```

If `status='running'` after `pg_sleep(8)` — repeat read after another `pg_sleep(8)`. Max 3 polls before HALT (§9.2.j).

### 5.6 Separation of production mutation from documentation

**Mutation-bearing artefacts:**
- Stage B: feature-branch commits + merge commit (CC).
- Stage C: `supabase functions deploy` PowerShell output (CC).
- Stage D: `apply_migration cc_0010b_pg_cron_ice_evidence_materialiser` (chat).
- Stage E: `execute_sql` `net.http_post` call (chat).

**Documentation-only artefacts:**
- This brief (`docs/briefs/cc-0010B-ice-evidence-materialiser.md`) — authored docs-only at v1.0 and patched to v1.1 docs-only.
- Result file (`docs/briefs/results/cc-0010B-ice-evidence-materialiser.md`) — written after Stage E close.
- Session file (`docs/runtime/sessions/YYYY-MM-DD-cc-0010B-*.md`) — written after each apply session.
- Updates to `docs/00_sync_state.md` + `docs/00_action_list.md` — per 4-way sync close convention.

**Each stage's apply session emits one git commit covering doc updates (result file fragment + session file + sync_state + action_list) AND, in CC's case, the feature-branch merge commit lives separately.**

---

## §6. Verification section

### 6.1 V-check inventory (cc-0010B-specific)

Pre-mutation expected state defined BEFORE apply per L44 baseline-eligible:

- **V8a** — Stage C: EF deployed, slug ACTIVE, `verify_jwt=false`, manual probe returns 401 without secret.
- **V9** — Stage D: cron.job row exists, schedule + command shape correct, vault-backed.
- **V10** — Stage E: `r.reconciliation_run` audit row exists with expected shape.
- **V11** — Stage E: `r.ice_publication_evidence` rows shape + join correctness.
- **V12** — Stage E: anomaly scan + idempotency integrity.

(Parent cc-0010 v1 numbers V8-V14; cc-0010B owns V8a, V9 for materialiser, V10, V11 (materialiser-specific renumbering of V10/V11 from parent), V12 (anomaly subset). V8b, V12-14 in parent are matcher-specific and belong to cc-0010C.)

### 6.2 V8a — Stage C EF deploy verification

```
Via Supabase MCP get_edge_function 'ice-evidence-materialiser':
  - slug = 'ice-evidence-materialiser'
  - status = 'ACTIVE'
  - verify_jwt = false

Manual probe (chat-fired):
  - POST without x-cron-secret header → expect HTTP 401
  - POST with wrong secret → expect HTTP 401
  - (Probe with correct secret is reserved for Stage E first invocation)
```

**PASS criteria:** all three above. **FAIL → HALT (§9.2.k); CC redeploys or investigates `--no-verify-jwt` flag application.**

### 6.3 V9 — Stage D cron.job shape

```sql
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'ice_evidence_materialiser_30min';
```

**PASS criteria:**
- 1 row.
- `jobname = 'ice_evidence_materialiser_30min'`.
- `schedule = '*/30 * * * *'`.
- `active = true`.
- `command` contains substrings: `'vault.decrypted_secrets'`, `'ice-evidence-materialiser'`, `'timeout_milliseconds := 30000'`, `'horizon_days, 7'` (jsonb_build_object output ordering may vary; substring check tolerates), `'pg_cron_ice_evidence_materialiser_30min'`.

**FAIL → HALT (§9.2.l); chat reviews migration body vs. live command for drift.**

### 6.4 V10 — Stage E audit row (`r.reconciliation_run`)

```sql
SELECT reconciliation_run_id, run_type, trigger, status, rows_processed, rows_inserted, rows_updated, rows_skipped,
       duration_ms, triggered_by, started_at, ended_at, error_summary
FROM r.reconciliation_run
WHERE triggered_by = 'cc-0010B-stage-e-first'
ORDER BY started_at DESC
LIMIT 1;
```

**PASS criteria:**
- 1 row.
- `run_type = 'ice_evidence_materialisation'`.
- `trigger = 'manual'` (or 'rpc' depending on EF source convention).
- `status IN ('succeeded', 'partial')`. **`failed` → HALT (§9.2.j).**
- `duration_ms < 30000` (timeout cap).
- `rows_inserted + rows_updated + rows_skipped = rows_processed`. **(D1 v1.1 correction — `rows_skipped` matches the live `r.reconciliation_run` schema; previously v1.0 used the non-existent column name `rows_skipped_no_evidence`.)**

**`status='partial'` is accept-with-variance per L45 if `error_summary` is reasonable** (e.g., specific m.* rows had unparseable raw payloads). Chat captures verbatim and declares in L45 mismatch table.

### 6.5 V11 — `r.ice_publication_evidence` shape + join correctness

**V11a — pipeline_state distribution:**

```sql
SELECT pipeline_state, COUNT(*) AS rows
FROM r.ice_publication_evidence
GROUP BY pipeline_state
ORDER BY pipeline_state;
```

**Expected:** distribution across `{drafted, queued, attempted, published, failed}` derived live from §4.10 m.* pre-flight inventory. Per CCH R4 carried, exact counts not predicted in brief; chat captures and reports.

**V11b — per-client / per-platform breakdown:**

```sql
SELECT cli.client_slug, ep.platform, ipe.pipeline_state, COUNT(*) AS rows
FROM r.ice_publication_evidence ipe
JOIN r.expected_publication ep ON ep.expected_publication_id = ipe.expected_publication_id
JOIN c.client cli ON cli.client_id = ep.client_id
GROUP BY cli.client_slug, ep.platform, ipe.pipeline_state
ORDER BY cli.client_slug, ep.platform, ipe.pipeline_state;
```

**V11c — join correctness sample (5 rows across shape variants):**

```sql
SELECT cli.client_slug, ep.platform, ep.expected_local_date,
       ipe.pipeline_state, ipe.scheduled_for, ipe.published_at,
       ipe.platform_post_id, ipe.post_publish_id, ipe.post_publish_queue_id, ipe.post_draft_id, ipe.slot_id,
       ipe.created_by_run_id, ipe.updated_by_run_id
FROM r.ice_publication_evidence ipe
JOIN r.expected_publication ep ON ep.expected_publication_id = ipe.expected_publication_id
JOIN c.client cli ON cli.client_id = ep.client_id
ORDER BY ep.client_id, ep.platform, ep.expected_local_date
LIMIT 5;
```

**PASS criteria (per row sampled):**
- `client_slug` matches the underlying `m.*` pipeline row's client (if traceable via post_publish_id / post_publish_queue_id / post_draft_id).
- `ep.platform` matches `ipe`-linked `m.*` row's platform.
- `ep.expected_local_date` falls within ±1 day of `r.to_sydney_local_date(COALESCE(published_at, scheduled_for))` (tz boundary tolerance).
- Exactly one of `post_publish_id` / `post_publish_queue_id` / `post_draft_id` is non-null when `pipeline_state` corresponds to that source (e.g., `published` → `post_publish_id IS NOT NULL`). Caveat: `slot_id` may be non-null independently (subject to Assumption #3 resolution).
- **R2 v1.1 verification:** `created_by_run_id IS NOT NULL` AND `updated_by_run_id IS NOT NULL` on every sampled row. **Both columns must point to a valid `r.reconciliation_run.reconciliation_run_id`** (cross-reference verified via §6.7 L45 sanity check).

**Empty-pipeline envelope (V11a returns 0 rows):** PASS-with-empirical-observation per L43. Declared in L45 mismatch table as expected condition matching §4.10 informational pre-flight; not a re-fire / rollback / escalate condition.

### 6.6 V12 — Anomaly scan + idempotency integrity

```sql
SELECT
  -- Hard-fail anomaly checks
  (SELECT COUNT(*) FROM r.ice_publication_evidence WHERE pipeline_state NOT IN ('drafted','queued','attempted','published','failed')) AS bad_pipeline_state,
  (SELECT COUNT(*) FROM r.ice_publication_evidence WHERE expected_publication_id NOT IN (SELECT expected_publication_id FROM r.expected_publication)) AS orphan_ep_ref,
  (SELECT COUNT(*) FROM r.ice_publication_evidence WHERE pipeline_state='published' AND published_at IS NULL) AS published_without_timestamp,
  -- R2 v1.1 audit trail integrity
  (SELECT COUNT(*) FROM r.ice_publication_evidence WHERE created_by_run_id IS NULL) AS missing_created_by_run_id,
  (SELECT COUNT(*) FROM r.ice_publication_evidence WHERE updated_by_run_id IS NULL) AS missing_updated_by_run_id,
  -- Idempotency integrity (UNIQUE constraint check)
  (SELECT COUNT(*) FROM r.ice_publication_evidence) AS total_evidence,
  (SELECT COUNT(DISTINCT expected_publication_id) FROM r.ice_publication_evidence) AS distinct_ep_in_evidence;
```

**PASS criteria:**
- `bad_pipeline_state = 0`.
- `orphan_ep_ref = 0` (FK enforces; defensive check).
- `published_without_timestamp = 0` (data integrity — published rows must carry timestamp).
- `missing_created_by_run_id = 0` (R2 v1.1).
- `missing_updated_by_run_id = 0` (R2 v1.1).
- `total_evidence = distinct_ep_in_evidence` (UNIQUE constraint integrity; idempotency proven).

**FAIL on any → HALT (§9.2.n).**

### 6.7 L45 post-mutation truth check (REQUIRED after Stage E apply)

Per L45 baseline-eligible v2.67 template:

**Count-delta table:**

| What | Pre-Stage-E | Post-Stage-E | Delta | Expected | Match? |
|---|---|---|---|---|---|
| `r.ice_publication_evidence` rows | 0 (or cron-fired count if Stage D > 30 min before Stage E) | N (live) | +N | derived live per CCH R4 | accept-with-variance / PASS |
| `r.reconciliation_run` rows | M (cc-0009 baseline + cron 82 firings) | M+1 | +1 | +1 | PASS |
| `r.expected_publication` `expected_status` distribution | unchanged | unchanged | 0 | 0 | PASS — cc-0010B does NOT transition status (cc-0010C's job) |
| `r.reconciliation_match` rows | 0 | 0 | 0 | 0 | PASS — cc-0010B does NOT write match rows |

**5-row shape-variant sanity sample:** captured via V11c. Each row must show a distinct combination of (pipeline_state, FK linkage column populated). Variants:
1. `published` + `post_publish_id` populated
2. `queued` + `post_publish_queue_id` populated
3. `drafted` + `post_draft_id` populated
4. `failed` + `post_publish_queue_id` populated (queue.status='failed')
5. `attempted` + `post_publish_queue_id` populated (queue.status='processing')

If fewer than 5 distinct variants exist in live data → capture as many as available; declare missing variants in L45 mismatch table as **accept-with-variance** (empty-pipeline envelope per §4.10).

**R2 v1.1 verification on the same 5-row sample:**

For every row sampled in V11c, verify:

- `created_by_run_id IS NOT NULL` ✓
- `updated_by_run_id IS NOT NULL` ✓
- Both columns reference a valid `r.reconciliation_run.reconciliation_run_id`. Cross-check query:

```sql
SELECT ipe.ice_publication_evidence_id,
       ipe.created_by_run_id,
       ipe.updated_by_run_id,
       rr_created.run_type AS created_run_type,
       rr_created.triggered_by AS created_triggered_by,
       rr_updated.run_type AS updated_run_type,
       rr_updated.triggered_by AS updated_triggered_by
FROM r.ice_publication_evidence ipe
LEFT JOIN r.reconciliation_run rr_created ON rr_created.reconciliation_run_id = ipe.created_by_run_id
LEFT JOIN r.reconciliation_run rr_updated ON rr_updated.reconciliation_run_id = ipe.updated_by_run_id
ORDER BY ipe.created_at DESC
LIMIT 5;
```

**PASS criteria:**
- Both join columns produce a hit (no NULLs from the LEFT JOIN, meaning the FK-style reference resolves to a real run row).
- `created_run_type` AND `updated_run_type` = `'ice_evidence_materialisation'`.
- `created_triggered_by` AND `updated_triggered_by` correspond to either `'cc-0010B-stage-e-first'` (Stage E origin) OR `'pg_cron_ice_evidence_materialiser_30min'` (cron origin — valid post-Stage-D-precedes-Stage-E case).

**FAIL on any row → declare in L45 mismatch table; depending on cause: re-fire (if EF code bug) or rollback (if data corruption).**

**Mismatch declaration template:**

| # | What | Expected | Actual | Decision |
|---|---|---|---|---|
| ... | ... | ... | ... | accept-with-variance / re-fire / rollback / escalate |

### 6.8 Failure + rollback expectations

| V-check | Failure path |
|---|---|
| V8a | CC redeploys + chat re-fires V8a (max 1 retry). If still fails → HALT, investigate `--no-verify-jwt` + config.toml drift |
| V9 | chat reviews migration body vs. live `cron.job.command`; if migration text and live row diverge → HALT and escalate |
| V10 status=`failed` | HALT; chat inspects `error_summary`, may need to re-deploy EF if logic bug; rollback path = `cron.unschedule('ice_evidence_materialiser_30min')` |
| V10 status=`partial` | accept-with-variance per L45 if `error_summary` is bounded + reasonable; otherwise re-fire Stage E |
| V11 join correctness violation | HALT; investigate join semantics — likely Sydney-local date vs UTC date bug or tz boundary handling |
| V11 R2 verification failure (`created_by_run_id` or `updated_by_run_id` NULL) | HALT (§9.2.p); CC fixes EF UPSERT clause to set run-id columns explicitly; redeploy; re-fire Stage E |
| V12 anomaly | HARD FAIL → rollback Stage E `r.ice_publication_evidence` inserts (cascading via `r.reconciliation_run` if needed under PK approval) |

**Rollback by stage:**

- **Stage B rollback** = revert merge commit on `main`; cherry-pick out feature-branch changes.
- **Stage C rollback** = `supabase functions delete ice-evidence-materialiser` (CC PowerShell).
- **Stage D rollback** = `SELECT cron.unschedule('ice_evidence_materialiser_30min');` via execute_sql (single-row write to `cron.job`).
- **Stage E rollback** = mark `r.reconciliation_run` row `status='reverted'`, optionally DELETE the produced evidence rows WHERE `created_by_run_id = <Stage E run_id>` — but ONLY under PK explicit approval (data-mutating revert).

---

## §7. Review gates

### 7.1 Authoring → CCD → D-01 → PK → Apply (gate sequence)

| Step | Trigger | Action | Output |
|---|---|---|---|
| 1 | v1.0 commit `d2984c20` | cc-0010B v1.0 brief authored, docs-only | v1.0 file |
| 2 | PK directs CCD review | CCD reads brief, produces corrections (verdict + risk + blocking/non-blocking suggestions) | CCD response: agree-with-corrections, risk low, commit d2984c20 accepted |
| 3 | CCD blocking + non-blocking corrections | chat patches v1.0 → v1.1 (D1 mandatory; R1 + R2 cheap-and-useful included) | **THIS COMMIT (v1.1)** |
| 4 | PK resolves Assumption #3 (slot_id join precedence) per §13 | path A or path B chosen | chat optionally patches v1.1 → v1.2 to reflect chosen path |
| 5 | Brief frozen per ICE-PROC-001 §9.1 | freeze marker at chosen commit | freeze marker |
| 6 | PK instructs Stage B apply gate | chat runs §4.1+§4.2+§4.3+§4.4 pre-flight | probe output captured |
| 7 | chat fires Stage B D-01 (`ask_chatgpt_review` action_type=plan_review for CC's diff) | D-01 fire with packet (§8 below) | D-01 verdict |
| 8 | If D-01 returns clean agree + PK approval phrase | CC merges feature branch to main | merge commit on main |
| 9 | chat fires Stage C D-01 (CC deploy command + post-deploy probe plan) | D-01 fire | D-01 verdict |
| 10 | CC deploys + chat verifies V8a | CC PowerShell + chat get_edge_function + manual probe | V8a PASS |
| 11 | chat fires Stage D D-01 (`ask_chatgpt_review` action_type=sql_destructive) | D-01 fire | D-01 verdict |
| 12 | chat applies `cc_0010b_pg_cron_ice_evidence_materialiser` | apply_migration | success |
| 13 | chat verifies V9 | execute_sql | V9 PASS |
| 14 | chat fires Stage E D-01 (`ask_chatgpt_review` action_type=production_invocation; likely routes to plan_review per KOI-02) | D-01 fire | D-01 verdict |
| 15 | chat invokes materialiser via execute_sql | net.http_post | request_id |
| 16 | chat polls + verifies V10 + V11 + V12 | execute_sql | PASS or HALT |
| 17 | chat runs L45 truth check + 5-row sanity sample + mismatch declaration + R2 run-id verification | execute_sql + brief text | mismatch table captured |
| 18 | chat fires close-the-loop UPDATEs on 4 m.chatgpt_review rows | execute_sql | rows resolved |
| 19 | chat writes result file + session file + sync_state + action_list updates in one push_files commit | github MCP | 4-way sync close commit |

### 7.2 Gate enforcement

- **CCD review must happen BEFORE any D-01 fire.** v1.1 captures CCD-accepted state; further amendments require fresh CCD pass if material.
- **PK Assumption #3 resolution must happen BEFORE Stage B D-01 fires.** This is a hard gate established by CCD at v1.1; not relitigated mid-stage.
- **D-01 must return verdict=`agree` with `proceed` direction** OR PK invokes L46 type-(c) state-capture override path (rare; v2.67 had zero such overrides at cc-0010A v1.5 D-01).
- **PK approval phrase is verbatim, in chat, after D-01 returns.** Approval prior to D-01 fire is informational only, not gate-clearing.
- **Each stage has its own gate.** Stage B approval ≠ Stage C approval ≠ Stage D approval ≠ Stage E approval. Four PK approval phrases total across cc-0010B's lifecycle.

---

## §8. D-01 packet contents (4 fires)

Per `docs/runtime/mcp_review_protocol.md` (L46 Evidence Gate baseline-confirmed v2.67), each D-01 packet must include all 7 fields. Below: per-stage packet skeletons; actual fields populated at fire time.

### 8.1 Stage B D-01 packet (action_type: `plan_review`)

**PRE-CONDITION:** PK Assumption #3 resolved per §13 — path A (forward-compatible guarded branch) OR path B (no-slot, deferred). Without this, Stage B D-01 does NOT fire.

| Field | Content |
|---|---|
| decision_under_review | Whether to merge feature branch `feat/cc-0010B-ice-evidence-materialiser` to `main`, landing `supabase/functions/ice-evidence-materialiser/index.ts` + `supabase/config.toml` amendment |
| production_action_if_approved | CC merges feature branch to main; main HEAD advances; production state unchanged until Stage C deploy |
| consequence_if_delayed | cc-0010B Stage C blocked; cc-0010C blocked transitively; PRV-1 close gate criterion 3 cannot be evaluated |
| cost_of_waiting | ~1 day per delay cycle; no on-pipeline degradation |
| current_evidence | §4.1 + §4.2 + §4.3 + §4.4 pre-flight passes captured verbatim; CC's feature-branch diff SHA + diff body; main HEAD SHA at branch creation; absence of `[functions.ice-evidence-materialiser]` on main; PK Assumption #3 resolution recorded (A or B) |
| known_weak_evidence | Materialiser join semantics not exercised against live `m.*` data until Stage E — Stage B D-01 is reviewing TYPESCRIPT correctness + Tier-1-only scope + raw_evidence compaction call shape + R2 v1.1 run-id stamping presence in UPSERT clause, not runtime behaviour |
| default_action | If D-01 escalates with GNB pushback: chat re-evaluates per L46 Evidence Gate; if 2 GNBs, PK invokes Path A (refine brief to address weak surface) or Path B (state-capture override) |

### 8.2 Stage C D-01 packet (action_type: `production_deploy` — likely routes to `plan_review` per KOI-02)

| Field | Content |
|---|---|
| decision_under_review | Whether CC executes `supabase functions deploy ice-evidence-materialiser --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns` against post-merge `main` |
| production_action_if_approved | New EF slug becomes ACTIVE on Supabase project `mbkmaxqhsohbtwsqolns`; reachable at .../functions/v1/ice-evidence-materialiser; verify_jwt=false |
| consequence_if_delayed | Stage D + Stage E blocked; cc-0010C blocked transitively |
| cost_of_waiting | ~1 day per delay; no on-pipeline degradation |
| current_evidence | §4.4 EF absence pre-flight; main HEAD SHA at deploy time; CC's `supabase functions list` output (pre-deploy) |
| known_weak_evidence | Manual probe + V8a happens AFTER deploy; pre-deploy we cannot verify the deployed binary matches the source on main beyond CLI return code |
| default_action | If D-01 escalates: re-confirm `--no-verify-jwt` flag + `verify_jwt=false` config.toml entry alignment; chat reviews CC's PowerShell session output |

### 8.3 Stage D D-01 packet (action_type: `sql_destructive`)

| Field | Content |
|---|---|
| decision_under_review | Whether to apply `cc_0010b_pg_cron_ice_evidence_materialiser` migration installing the `ice_evidence_materialiser_30min` cron job |
| production_action_if_approved | 1 new row in `cron.job`; job becomes `active=true`; will fire every 30 min at :00/:30 UTC starting from next anchor |
| consequence_if_delayed | Stage E first invocation can still be performed manually; ongoing materialisation deferred until cron lands |
| cost_of_waiting | Low; on-demand invocation works without cron |
| current_evidence | §4.5 + §4.6 + §4.7 + §4.8 pre-flight passes; §4.10b trigger inventory clean (or surfaced); vault row resolvable; jobname unique; EF slug ACTIVE |
| known_weak_evidence | First cron firing happens at next `*/30 * * * *` anchor, not at apply time; we don't observe cron actually firing in Stage D |
| default_action | If D-01 escalates: re-verify §4.5 jobname collision + §4.6 vault resolvability immediately before re-fire; chat re-reads PRV-0 §D-19 cadence + CCH R14 fixed UTC anchor |

### 8.4 Stage E D-01 packet (action_type: `production_invocation` — likely routes to `plan_review` per KOI-02)

| Field | Content |
|---|---|
| decision_under_review | Whether to fire first on-demand `net.http_post` invocation of materialiser EF via execute_sql |
| production_action_if_approved | 1 new `r.reconciliation_run` row + N new `r.ice_publication_evidence` rows (N derived live), each carrying `created_by_run_id` + `updated_by_run_id` populated per R2 v1.1 |
| consequence_if_delayed | Cron may fire in interim; not a blocker but reduces V-check attribution clarity |
| cost_of_waiting | Negligible if cron has landed (Stage D); higher if Stage D also pending |
| current_evidence | §4.9 + §4.10 + §4.10b pre-flight; m.* inventory captured; trigger inventory clean; cron firing history (if any since Stage D) |
| known_weak_evidence | Materialiser join semantics not previously exercised against live data; V11 join correctness validation happens AFTER invocation; R2 run-id stamping validation happens at V11c + §6.7 post-apply |
| default_action | If D-01 escalates: review V11c expected join semantics + R2 run-id UPSERT clause; chat verifies materialiser EF source one more time against §5.2 spec |

---

## §9. Rollback / no-op / halt logic

### 9.1 General principles

- **Each stage has its own rollback path** — failures at one stage do not require unwinding earlier stages unless explicitly directed by PK.
- **No automatic rollback at any stage** — all rollbacks require PK explicit approval before chat / CC executes.
- **`r.reconciliation_run` audit trail is preserved across rollback** — even a `status='reverted'` row stays in the table for forensic value.

### 9.2 HALT codes

- **§9.2.a** — §4.1 cc-0010A applied state regression. Investigate cc-0010A artefact drift; escalate to PK for v1.6 doc patch or cc-0010A-revisit scope.
- **§9.2.b** — §4.2 FK constraint missing. Same as §9.2.a; cc-0010A regression.
- **§9.2.c** — §4.3 `r.compact_raw_json` empirical failure. Escalate to cc-0010A v1.6 doc patch (likely PG version drift or function body mutation).
- **§9.2.d** — §4.4 EF slug or config.toml entry pre-exists on main. Prior partial Stage B; CC investigates branch history; chat verifies no main-side merge happened outside cc-0010B.
- **§9.2.e** — §4.5 cron jobname collision. External job with same jobname pre-exists; investigate `pg_cron` history.
- **§9.2.f** — §4.6 vault row missing / unresolvable. Vault row may have been deleted or KMS key rotated; escalate to PK + Anthropic Vault doc.
- **§9.2.g** — §4.7 migration name collision. Migration already recorded in `supabase_migrations.schema_migrations` from prior attempt; chat investigates `version` field and `name` overlap.
- **§9.2.h** — §4.9 Stage E pre-flight; cron may have fired earlier than expected (Stage D landed > 30 min before Stage E). **Flagged-but-non-blocking:** Stage E proceeds; V-checks attribute the cc-0010B-stage-e-first run row distinctly.
- **§9.2.i** — V10 status='failed'. Chat reads `error_summary`; if bounded → fix in CC redeploy; if systemic → escalate.
- **§9.2.j** — V10 status='running' after 3 polls (24s total). EF stuck; investigate `Deno.serve` blocking, network egress, or `r.reconciliation_run` insert deadlock.
- **§9.2.k** — V8a fails. Most likely cause: `--no-verify-jwt` deploy flag didn't apply; CC reruns deploy.
- **§9.2.l** — V9 cron.job shape divergence. Chat reads `command` field and compares to migration body verbatim.
- **§9.2.m** — V11 join correctness violation. Likely Sydney-local date vs UTC date bug. Halt + brief amendment + re-deploy CC's EF source.
- **§9.2.n** — V12 anomaly. HARD FAIL; rollback Stage E rows under PK approval; investigate UPSERT idempotency.
- **§9.2.o** — §4.10b unexpected non-system trigger on `r.ice_publication_evidence` or `r.reconciliation_run`. SURFACE for chat review; do not proceed to Stage E until trigger understood (may be benign external instrumentation OR may interfere with materialiser writes). PK decides Stage E proceed / pause / amend brief.
- **§9.2.p** — V11/V12/§6.7 R2 run-id verification failure: any `r.ice_publication_evidence` row with NULL `created_by_run_id` or `updated_by_run_id`. EF UPSERT clause missing run-id stamping; CC patches + redeploys; re-fire Stage E. If failure happens AFTER Stage E (e.g., backfilled rows from cron with NULL run-ids), this indicates a deploy regression — rollback under PK approval.

### 9.3 Per-stage rollback steps

- **Stage B rollback** (after merge, before Stage C): CC creates revert branch; chat fires D-01 on revert plan; CC merges revert to main. Feature branch can be re-iterated.
- **Stage C rollback** (after deploy, before Stage D): CC runs `supabase functions delete ice-evidence-materialiser` via CLI. config.toml entry can stay or be reverted depending on next-attempt plan.
- **Stage D rollback** (after cron lands, before Stage E): chat runs `SELECT cron.unschedule('ice_evidence_materialiser_30min');` via execute_sql.
- **Stage E rollback** (after first invocation): chat marks `r.reconciliation_run` row `status='reverted'`; if PK approves DELETE: `DELETE FROM r.ice_publication_evidence WHERE created_by_run_id = '<Stage E run_id>'` (data-mutating; explicit PK approval required).

---

## §10. Close-the-loop section

### 10.1 What gets updated after successful Stage E close

Per ICE-PROC-001 + session-close convention:

1. **`m.chatgpt_review` rows for cc-0010B's 4 D-01 fires (Stage B + Stage C + Stage D + Stage E)** — single execute_sql UPDATE batching all 4 rows:

```sql
UPDATE m.chatgpt_review
SET status = 'resolved',
    resolved_by = 'cc-0010B-' || (
      CASE m.chatgpt_review.review_id
        WHEN '<stage-b-review-id>' THEN 'stage-b-apply'
        WHEN '<stage-c-review-id>' THEN 'stage-c-apply'
        WHEN '<stage-d-review-id>' THEN 'stage-d-apply'
        WHEN '<stage-e-review-id>' THEN 'stage-e-apply'
      END
    ) || '-YYYY-MM-DD',
    action_taken = 'cc-0010B Stage X applied + V-checks PASS (or accept-with-variance per L45)',
    escalation_resolved_at = now()
WHERE review_id IN (<stage-b-review-id>, <stage-c-review-id>, <stage-d-review-id>, <stage-e-review-id>);
```

2. **Result file:** `docs/briefs/results/cc-0010B-ice-evidence-materialiser.md` — created on Stage E close, summarising all 4 stages + L45 truth check + L46 outcomes + V-check verdicts + R1 trigger probe outcome + R2 run-id verification outcome.

3. **Session file(s):** `docs/runtime/sessions/YYYY-MM-DD-cc-0010B-stage-X.md` per apply session (one per stage if applied across multiple sessions, OR a single composite session file if all 4 stages applied same day).

4. **`docs/00_sync_state.md`** updated to v2.68 (or higher) reflecting cc-0010B closure + cc-0010C unblocked.

5. **`docs/00_action_list.md`** updated:
   - Close cc-0010B from "Active" rows.
   - Promote cc-0010C to rank 1 in Today/Next 5.
   - Close pre-cc-0010B gating items if any.
   - Carry / re-rank everything else.

6. **4-way sync close commit** — single `push_files` commit landing all four files: result file + session file + sync_state + action_list.

### 10.2 What does NOT get touched at close

- **24 unrelated historical escalated `m.chatgpt_review` rows** — explicitly NOT modified per CCH directive carried from v2.67. Eligible for separate review/sweep in future session; not in cc-0010B scope.
- **5-row close-the-loop batch from prior cc-NNNN reviews** — separately scoped (P2 rank 3 in v2.67 action list); not in cc-0010B scope unless PK explicitly batches with cc-0010B close-out.
- **cc-0010A artefacts (brief, result file, session file)** — frozen per ICE-PROC-001 §9.1 at commit `3db84322`. cc-0010B does NOT amend.
- **cc-0010 parent brief (v1 SUPERSEDED-BY)** — not amended; the SUPERSEDED-BY marker already directs to sub-briefs.
- **PRV-0 design lock document** — not amended; cc-0010B is downstream consumer.

### 10.3 Forward-looking close artefacts

- **cc-0010C readiness signal:** logged in sync_state Next-Session-Priorities. cc-0010C is unblocked once cc-0010B Stage E delivers ≥1 row in `r.ice_publication_evidence` (matcher needs evidence to match against). If Stage E delivers 0 rows under empty-pipeline envelope (L43 path), cc-0010C is still technically unblocked but pragmatically should wait for m.* pipeline to produce posts before cc-0010C Stage E can produce informative matches.
- **L44 + L45 + L46 + L48 second-live-exercise signals:** cc-0010B's 4-stage closure provides a second live exercise of L44/L45/L46/L48 patterns (after cc-0010A's first). Adds to baseline-eligibility evidence.

---

## §11. Risk catalogue

### 11.1 Risk: Dependency drift from cc-0010A

**Vector:** Between cc-0010A v1.5 apply (2026-05-12) and cc-0010B Stage D apply, an external process mutates the r.* schema (e.g., adds/drops columns, alters FK, breaks `r.compact_raw_json`).

**Likelihood:** Low. cc-0010A is frozen per ICE-PROC-001 §9.1; no scheduled re-applies. cron jobs (incl. job 82) do not mutate r.* schema.

**Detection:** §4.1 + §4.2 + §4.3 pre-flight at each cc-0010B apply gate. Probe outputs captured verbatim; any divergence from expected → HALT (§9.2.a / §9.2.b / §9.2.c).

**Mitigation:** Pre-flight gate is the canonical mitigation. If drift detected, escalate to cc-0010A v1.6 fix-forward or cc-0010A-revisit scope; do NOT silently work around.

### 11.2 Risk: Registry baseline ambiguity

**Vector:** `k.table_registry` r.* row count (11) and `k.column_registry` r.* row count (181) include the 3 geography rows (country / country_subdivision / country_timezone) per F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION P3. A future cleanup brief may delete these rows, shifting cc-0010B's pre-flight expected baselines.

**Likelihood:** Low during cc-0010B's apply window (cleanup brief not yet scoped or applied).

**Detection:** §4.1 pre-flight reads counts; if baseline shifts post-cleanup, pre-flight expected values diverge.

**Mitigation:** cc-0010B does NOT insert `k.*` rows. Registry baseline drift is informational only for cc-0010B; no apply blocked by it. If cleanup lands between cc-0010B Stage D and Stage E, pre-flight at Stage E still works because Stage E doesn't touch `k.*`.

### 11.3 Risk: Materialiser idempotency failure

**Vector:** UPSERT `ON CONFLICT (expected_publication_id) DO UPDATE` on `r.ice_publication_evidence` fails because expected_publication_id is not actually unique (UNIQUE constraint failure) — or because the EF code uses INSERT instead of UPSERT.

**Likelihood:** Low for constraint correctness (cc-0010A v1.5 §2.1 verified `UNIQUE (expected_publication_id)`). Medium for EF code correctness (depends on CC's TypeScript).

**Detection:** V12 idempotency integrity check (`total_evidence = distinct_ep_in_evidence`).

**Mitigation:** Stage B D-01 diff review by chat verifies EF code uses `.upsert(..., { onConflict: 'expected_publication_id' })` or equivalent. If V12 fails → HALT (§9.2.n); investigate; rollback rows under PK approval.

### 11.4 Risk: Duplicate evidence rows

**Vector:** Two simultaneous materialiser invocations (cron + Stage E first; or two cron fires due to schedule overlap) race to UPSERT the same expected_publication_id, producing duplicate rows.

**Likelihood:** Low. Single cron schedule `*/30 * * * *` does not overlap with itself unless individual runs exceed 30 min (timeout cap at 30s prevents this). Stage E + cron overlap: idempotency via UPSERT ON CONFLICT handles this — last writer wins, no duplicates.

**Detection:** V12 idempotency check + UNIQUE constraint enforcement (constraint violation would be the canonical signal).

**Mitigation:** UNIQUE constraint + UPSERT semantics. No additional locking needed for cc-0010B (single-writer pattern per expected_publication_id; latest-wins acceptable).

### 11.5 Risk: Cron / EF sequencing failure

**Vector:** cc-0010C matcher cron at `15-59/30 * * * *` fires before materialiser cron at `*/30 * * * *` has populated evidence for the latest window → matcher produces 0 matches for that 30-min window.

**Likelihood:** Out of cc-0010B's direct scope (cc-0010C owns matcher cron). But cc-0010B's `*/30 * * * *` slot reservation is the upstream pre-condition for the sequencing pattern.

**Detection:** cc-0010C V-checks will surface 0-match cases attributable to materialiser-not-yet-fired. cc-0010B's V11 surfaces materialiser-side throughput.

**Mitigation:** Schedule offset (materialiser :00/:30; matcher :15/:45) gives materialiser ~15 min runway. Materialiser p95 << 15 min for current data volumes; safe envelope. If matcher cron ends up regularly firing before materialiser settles, cc-0010C may need to tighten its pre-condition check or extend offset.

### 11.6 Risk: Vault / secret leakage

**Vector:** A pre-flight probe (§4.6) or migration body (§5.4) inadvertently logs the decrypted CRON_SECRET value into chat or commit history.

**Likelihood:** Low if discipline followed. The probe at §4.6 reads `length(decrypted_secret)` only — never the value. The migration body at §5.4 uses an inline subquery `(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='CRON_SECRET' LIMIT 1)` — the secret is resolved at cron firing time inside Postgres; the literal value never enters the migration text or the chat transcript.

**Detection:** Authoring review — every cc-0010B-touching SQL is checked for `SELECT decrypted_secret` outside an `INSERT`/`UPDATE`/`net.http_post` second-order context.

**Mitigation:**
- Pre-flight §4.6 uses `length()` wrapper.
- Stage D migration body uses inline subquery, not literal.
- Stage E execute_sql wraps the secret in the `net.http_post` headers parameter; the request_id return does not include the secret.
- If accidentally logged: rotate vault row immediately (PK action; cc-0010B does not rotate secrets).

### 11.7 Risk: Partial deploy / apply split risk

**Vector:** Stage B merges feature branch to main but Stage C deploy doesn't happen (CC's environment fails or PK doesn't approve). Live state: `supabase/config.toml` declares `[functions.ice-evidence-materialiser] verify_jwt = false` but no deployed EF matches. Subsequent `supabase functions deploy` of an UNRELATED EF re-reads config.toml and applies (or rejects) the materialiser entry.

**Likelihood:** Low if PK gates Stage C immediately after Stage B merge.

**Detection:** §4.4 pre-flight + manual `supabase functions list` check between Stage B merge and Stage C deploy.

**Mitigation:**
- Stage B and Stage C scheduled close together (same session preferred).
- If split: Stage C deploy is idempotent (deploys whatever main currently declares); a delayed Stage C just deploys the materialiser later. No corrupted state.
- Rollback path: revert Stage B merge if Stage C deferred indefinitely.

### 11.8 Risk: Materialiser join semantics wrong → wrong evidence rows

**Vector:** Materialiser EF joins `m.post_publish` to `r.expected_publication` via wrong key (e.g., uses `created_at` instead of `published_at`; misuses Sydney-local date conversion). Evidence rows misattribute pipeline rows to wrong expected slots.

**Likelihood:** Medium for v1.0 first-deploy; this is the highest-risk semantics issue in cc-0010B.

**Detection:** V11c 5-row sanity sample — chat manually verifies each row's join correctness against underlying `m.*` data.

**Mitigation:**
- Stage B D-01 diff review explicitly checks join keys.
- §5.2 spec lists the 3-step match order verbatim.
- Sydney-local date conversion uses `r.to_sydney_local_date` (cc-0009 helper) — DST-aware.
- If V11c fails: HALT (§9.2.m); CC fixes EF source; redeploy.

### 11.9 Risk: Empty pipeline envelope → 0 evidence rows misclassified as failure

**Vector:** Stage E fires; `m.post_publish` has 0 rows for the 7-day window; materialiser produces 0 evidence rows; V11 shows empty table; uncritical V-check fail.

**Likelihood:** Possible for test envelope where pipeline has slow weeks.

**Detection:** §4.10 informational pre-flight surfaces empty `m.*` BEFORE Stage E fires.

**Mitigation:** L43 "closed with verified variance" pathway — 0 evidence rows declared PASS-with-empirical-observation in L45 mismatch table; not re-fire / rollback / escalate. Brief explicitly anticipates this case (§6.4 V11 empty-pipeline envelope clause).

### 11.10 Risk: L49 PG reserved-word collision (defensive carry)

**Vector:** A future cc-0010B amendment introduces a PL/pgSQL function with `DECLARE` block using reserved words (`out`, `result`, `record`, `row`, etc.) — collision at apply time.

**Likelihood:** None in cc-0010B v1.1 (no PL/pgSQL DECLARE blocks introduced; verified at §4.12).

**Detection:** Brief-authoring checklist; pre-D-01 reserved-word scan.

**Mitigation:** L49 lesson candidate v2.67 added to brief-authoring discipline. If future amendment adds PL/pgSQL: variable names checked against PG reserved word list before D-01 fire.

### 11.11 Risk: Tier 2-5 scope creep in materialiser EF code

**Vector:** CC's EF source accidentally references `r.platform_observation` / `r.platform_manual_observation` / `r.reconciliation_match` / `r.matcher_config` — implying premature Tier 2+ logic or expanded scope.

**Likelihood:** Low if Stage B D-01 diff review enforces.

**Detection:** Stage B D-01 packet explicitly checks materialiser EF source for these table names. Any occurrence = red flag.

**Mitigation:** §3.5 Forbidden actions list calls this out explicitly. §5.2 spec restricts EF responsibilities to evidence + audit only.

### 11.12 Risk: Materialiser duration > 30s cron timeout

**Vector:** As `r.expected_publication` grows (cron 82 adds daily; over time hundreds of rows in 7-day window), materialiser exceeds 30s timeout.

**Likelihood:** Low at cc-0010B initial deploy (~84 rows). Medium 6+ months out.

**Detection:** V10 `duration_ms` check. Future cron job runs monitored via `cron.job_run_details`.

**Mitigation:**
- Materialiser internal pagination / chunking if row count > 500.
- Timeout cap of 30000 ms per F-CRON-PG-NET-TIMEOUT-30S; if exceeded, cron marks run failed; next cron fire retries.
- Long-term: separate brief for batching pattern if needed.

### 11.13 Risk: Unexpected non-system trigger on `r.ice_publication_evidence` or `r.reconciliation_run` (R1 v1.1)

**Vector:** External process (audit framework, observability hook, prior unfinished brief) attached a trigger to one or both write targets that runs custom logic on INSERT/UPDATE. Materialiser writes succeed but produce side effects (extra rows in audit log, custom row-level validation rejecting some writes, etc).

**Likelihood:** Low — cc-0010A v1.5 V3 reported `r.set_updated_at` style trigger present on r.* tables, but did not enumerate all triggers comprehensively. Defensive probe added per CCD R1.

**Detection:** §4.10b pre-flight enumerates non-system triggers on both write targets.

**Mitigation:**
- If only expected `set_updated_at` style trigger present → PASS.
- If additional trigger present → SURFACE for chat review BEFORE Stage E (HALT §9.2.o).
- chat investigates trigger function body; if benign (e.g., another audit hook with no side effects on materialiser) → PK approves continuation; if functional risk → trigger must be dropped or brief amended before Stage E proceeds.

### 11.14 Risk: Missing `created_by_run_id` / `updated_by_run_id` audit trail (R2 v1.1)

**Vector:** Materialiser EF UPSERT clause omits run-id stamping — evidence rows carry NULL in both columns; audit trail loses provenance.

**Likelihood:** Low if Stage B D-01 diff review enforces R2 v1.1 requirement.

**Detection:**
- Stage B D-01 diff review (chat reads CC's UPSERT clause).
- V12 anomaly check (`missing_created_by_run_id = 0` AND `missing_updated_by_run_id = 0`).
- §6.7 L45 sanity sample cross-join to `r.reconciliation_run` verifies non-null + resolvable references.

**Mitigation:**
- §5.2 EF spec mandates BOTH columns set on every UPSERT — INSERT path sets both; UPDATE path sets only `updated_by_run_id`, preserves `created_by_run_id` unchanged.
- HALT (§9.2.p) on V11/V12/§6.7 NULL detection; CC patches UPSERT clause + redeploys.

---

## §12. Notes

### 12.1 Brief-runner-v0 watch items specific to cc-0010B

1. **First single-EF Stages B+C+D+E sub-build from L48-split parent** — cc-0010B is the first sub-brief to exercise the 4-stage atomic-sub-build pattern (cc-0010A was 1-stage; cc-0009 was 5-stage as a non-split parent). Pattern likely repeats in cc-0010C and future per-platform observer briefs (PRV-2/3/4).
2. **First materialiser-only EF** — sets the template for read-many-write-one materialisers in r.* (cc-0010C is the corresponding read-many-write-one matcher pattern). Future observer EFs (PRV-2/3/4) are read-platform-API-write-observation; different shape.
3. **First in-cc-0010B carry of cc-0010A L45 variances** — §2.2 explicitly catalogues the 5 accept-with-variance entries from cc-0010A's apply; cc-0010B authoring + apply both inherit them. Establishes the pattern of "applied-with-variance lineage propagation".
4. **First brief authored against an L46 baseline-confirmed protocol** — cc-0010A v1.5 D-01 was the first clean-pass-through zero-pushback D-01 (v2.67). cc-0010B authoring discipline aims to repeat this — clean brief surface, no L46-override anticipation.
5. **First explicit Tier-1-only assertion in materialiser context** — cc-0010A's V3 assertion was about function count; cc-0010B's Stage B D-01 packet asserts EF source has no `r.platform_observation` / `r.platform_manual_observation` / `r.reconciliation_match` / `r.matcher_config` references.
6. **First L49 defensive pre-flight carry** — even though cc-0010B introduces no PL/pgSQL DECLARE blocks, §4.12 records the L49 collision-risk check as authoring-discipline ledger. Establishes pattern: every future brief explicitly records L49 risk as NONE / SCANNED / IDENTIFIED.
7. **First trigger-inventory pre-flight probe in cc-NNNN series (R1 v1.1)** — §4.10b enumerates non-system triggers on r.* write targets defensively. Pattern likely repeats in every cc-NNNN brief writing to r.* tables (cc-0010C, PRV-2/3/4 observer briefs).
8. **First run-id audit trail requirement made explicit at brief level (R2 v1.1)** — `created_by_run_id` + `updated_by_run_id` stamping requirement formalised in §5.2 + V12 + §6.7. Pattern repeats in cc-0010C matcher (which similarly writes to `r.reconciliation_match` with its own run-id stamping).

### 12.2 Lesson candidate notes

- **L44 (Runtime Proof Pre-flight)**: cc-0010B will provide a **fourth live exercise** at apply time. Strengthens baseline eligibility.
- **L45 (Post-mutation truth check)**: cc-0010B will provide a **second live exercise** at apply time. Strengthens baseline eligibility.
- **L46 (Reviewer Evidence Gate)**: cc-0010B authoring aims for clean-pass-through D-01s across all 4 stages — would be the first cc-NNNN brief with 4 consecutive zero-pushback D-01s if achieved. Baseline confirmation strengthens.
- **L48 (Atomicity Gate)**: cc-0010B is the second sub-build from the cc-0010 split; together with cc-0010A's atomic delivery, L48 split-then-atomic-sub-build pattern is vindicated through 2 of 3 sub-builds.
- **L49 NEW candidate**: cc-0010B records risk as NONE for v1.1 (no PL/pgSQL DECLARE); next PL/pgSQL-heavy brief will provide the next live exercise.
- **L50 NEW candidate v1.1**: trigger-inventory pre-flight probe before write-target mutations — promote to baseline if pattern repeats in cc-0010C + observer briefs without surfacing real unexpected triggers (would indicate the probe is consistently informational-only) OR confirm value if it does surface (probe earns its keep).

### 12.3 Open dependencies for the apply session(s)

1. cc-0010A v1.5 applied state still in place (verified at §4.1 + §4.2 + §4.3).
2. CC availability for Stages B + C.
3. PK availability for 4 approval phrases + Assumption #3 resolution before Stage B D-01.
4. PRV-0 v2 design lock unchanged.
5. vault row CRON_SECRET still present (§4.6).
6. `m.*` pipeline rows in window — informational only; 0 rows is PASS-with-empirical-observation at Stage E.
7. `pg_trgm` extension v1.6 installed (cc-0010A v1.5 confirmed; cc-0010B does not require but defensive read).
8. §4.10b trigger inventory clean OR surfaced + reviewed before Stage E.

### 12.4 Sequencing reminders

cc-0010B v1.1 must NOT (until each stage's gate clears):
- Apply any DDL.
- Deploy any EF.
- Schedule any cron.
- Invoke any EF.
- Mutate cc-0010A brief, result file, or session file.
- Implement Tier 2-5 matcher logic (cc-0010C territory).
- Touch `r.platform_observation` / `r.platform_manual_observation` / `r.reconciliation_match` / `r.matcher_config` / `r.platform_observer_health` write paths.
- Mutate `m.chatgpt_review` beyond 4 stage close-the-loop UPDATEs (or batched if PK directs).
- Touch 24 unrelated historical escalated `m.chatgpt_review` rows.
- Touch 5-row prior cc-NNNN close-the-loop batch (separate scope).
- Direct-push to `main` for Stage B (CCH R11).
- Use DST-aware cron expressions (CCH R14).
- Use GUC-based secret sourcing (KOI-03).
- Introduce PL/pgSQL DECLARE blocks with reserved words (L49 carry).
- Fire Stage B D-01 before PK resolves Assumption #3 (§13).
- Omit `created_by_run_id` / `updated_by_run_id` stamping in materialiser UPSERT (R2 v1.1).

Violation → HALT + report to PK.

---

## §13. Unresolved assumptions / Open questions for PK direction (before Stage B D-01)

1. **Stage E sequencing mechanism** — Brief proposes `net.http_post` via `execute_sql` + `pg_sleep(8)` + read of `r.reconciliation_run` for completion. Alternative: invoke + poll for `status != 'running'` with max 3 polls. Brief defaults to single 8s sleep + read; PK may direct stricter polling at Stage E D-01.

2. **Stage E expected row count under empty-pipeline envelope** — §4.10 informational pre-flight may surface 0 rows in `m.post_publish` / `m.post_publish_queue` / `m.post_draft` for the 7-day window. Stage E will then produce 0 evidence rows. Brief flags this as PASS-with-empirical-observation per L43; PK may want a different Stage E definition-of-done (e.g., defer Stage E until ICE pipeline has produced ≥1 post in window).

3. **slot_id join precedence — PK DECISION REQUIRED BEFORE STAGE B D-01.** §5.2 step 1 specifies slot_id direct join when non-null. cc-0009 EF emits `slot_id=NULL` for all 84 rows (per cc-0009 design); slot_id-direct join is forward-compatibility code.

   **Default recommendation (Path A):** Include the slot_id branch as forward-compatible, but guard it so the current cc-0009 all-NULL slot_id state exercises the non-slot path cleanly. Concretely: the slot_id branch becomes `if (ep.slot_id !== null) { /* slot path */ } else { /* fall through to client+platform+date matching */ }`. With cc-0009's all-NULL state, the else branch is exercised on every iteration of the driver loop, ensuring the non-slot path is the validated runtime path while the slot path is dead-code-ready for future enablement when a future cc-0009 EF version emits non-null slot_id.

   **Stage B D-01 must NOT fire until PK explicitly confirms either:**
   - **Path A** — forward-compatible slot_id branch included, guarded and non-blocking (default recommendation above); CC's Stage B diff implements the guarded `if (slot_id !== null) ... else ...` pattern.
   - **Path B** — simpler no-slot_id branch for cc-0010B; slot_id support entirely deferred to a future cc-0010B v2 amendment or a separate cc-0010D brief authored when cc-0009 EF starts emitting slot_id. CC's Stage B diff implements only the (client_id, platform, date) join path; §5.2 step 1 wording is amended at v1.2 to mark slot_id-step explicitly out-of-scope.

   This is a brief-content decision that affects CC's Stage B implementation, not a runtime decision deferrable to later stages. Resolved silently → CCD's recommended-blocker not honoured; trust in v1.1's review-gate discipline degraded. PK must give explicit A or B before chat fires Stage B D-01. CCD verdict at v1.0 review explicitly elevated this from "open assumption" (v1.0) to "PK-decision-required-before-Stage-B-D-01" (v1.1).

4. **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) carry** — cc-0010B v1.1 inherits parent cc-0010's stance: alignment lives in materialiser horizon contract (today-forward, weekday-filtered, 7-day default); cc-0009 brief frozen unmodified. PK may direct alternative (e.g., formalise cc-0009 → v2.2 patch).

5. **Stage D migration includes Stage E's audit-row INSERT?** — Brief separates Stage D (cron) from Stage E (first invocation). Alternative: Stage D migration could `INSERT INTO r.reconciliation_run` pre-populating a placeholder row before any EF fire. Chat default: keep Stage D pure-DDL-equivalent; Stage E owns the first runtime artefact.

6. **Whether to bundle Stage B + C into a single CC session** — Chat default: B and C scheduled close together (within minutes) to avoid §11.7 split risk. PK may prefer staggered sessions for change-management visibility.

---

## §14. Ready for Stage B D-01?

**Brief status: AUTHORED v1.1; CCD review accepted with corrections applied.** Not yet ready for Stage B D-01 — gated on PK resolving Assumption #3 (slot_id join precedence) per §13.

**CCD verdict captured at v1.1:** agree-with-corrections; risk low; commit `d2984c20` (v1.0) accepted; cc-0010B may proceed to Stage B D-01 once D1 + R1 + R2 applied (this commit) + Assumption #3 resolved.

**Recommended next-steps for PK:**

1. PK reviews this v1.1 brief and §13 Assumption #3.
2. PK gives explicit Path A or Path B decision for slot_id join precedence.
3. If Path A confirmed: brief freezes at v1.1 commit per ICE-PROC-001 §9.1; chat fires Stage B D-01 at chosen session window.
4. If Path B confirmed: chat patches v1.1 → v1.2 (small edit to §5.2 step 1 marking slot_id explicitly out-of-scope); brief freezes at v1.2; chat fires Stage B D-01 at chosen session window.

**Brief authoring this v1.1 commit is non-mutating per CCH directive 2026-05-12:**
- No D-01 fired.
- No `apply_migration` called.
- No EF deployed.
- No cron enabled.
- No `net.http_post` invocation.
- No `m.chatgpt_review` write (cc-0010B's 4 D-01 fires + close-the-loop UPDATEs all remain ahead in time).
- No `r.*` write.
- No `m.*` write.
- No `k.*` write.
- No mutation to cc-0010A artefacts.
- No mutation to cc-0010 parent brief.
- No mutation to cc-0010C (not yet authored).
- 24 unrelated historical escalated `m.chatgpt_review` rows: untouched.

---

*Brief authored 2026-05-12 Sydney by chat (Claude). v1.0 → v1.1 patch 2026-05-12 Sydney by chat after CCD review of commit `d2984c20`. v1.1 inputs: CCD verdict (agree-with-corrections, risk low) carried at v1.1 commit; D1 correction (`rows_skipped_no_evidence` → `rows_skipped` at §5.2 HTTP response field list, §5.2 audit-row UPDATE spec, §6.4 V10 SELECT, §6.4 V10 PASS criterion); R1 inclusion (§4.10b trigger inventory probe on `r.ice_publication_evidence` + `r.reconciliation_run` with halt rule on unexpected non-system triggers); R2 inclusion (§5.2 EF spec explicit `created_by_run_id` + `updated_by_run_id` stamping requirement using Stage E run_id; §6.7 L45 sanity sample cross-join verification + §6.5 V11c column addition + §6.6 V12 anomaly checks); Assumption #3 marked PK-DECISION-REQUIRED-BEFORE-STAGE-B-D-01 with explicit Path A (default; forward-compatible guarded slot_id branch) and Path B (simpler no-slot, slot_id deferred) decision paths.*

*v1.1 output: 4-stage gated build plan (B+C+D+E) for `ice-evidence-materialiser` EF only, with CCD-accepted corrections baked in. 1 new EF + 1 new cron job + 1 first invocation. Apply sequence requires 4 sequential D-01 fires + 4 PK approval phrases + V8a + V9 + V10 + V11 + V12 V-checks + L45 truth check + R1 trigger inventory probe + R2 run-id verification + 4 close-the-loop UPDATEs. cc-0010B v1.1 remains AUTHORED ONLY. No D-01. No apply. No production mutation. 24 historical escalated rows untouched. cc-0010A unchanged. cc-0010C still gated. Stage B D-01 still gated on PK Assumption #3 resolution.*
