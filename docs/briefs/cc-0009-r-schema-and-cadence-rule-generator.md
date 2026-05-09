# Brief cc-0009 — `r.*` schema + `r.reconciliation_run` + `r.expected_publication` + helper functions + cadence-rule-generator EF + first backfill (PRV-1 second build)

**Created:** 2026-05-10 Sydney
**Author:** chat (Claude)
**Executor:** mixed across stages — chat applies DDL via Supabase MCP `apply_migration` per memory standing rule ("apply_migration is the ONLY correct DDL path for c/m/f/t/r schemas"); CC authors `cadence-rule-generator` EF source under `supabase/functions/cadence-rule-generator/` + amends `supabase/config.toml` + pushes; chat reviews CC patch + applies pg_cron schedule via `apply_migration` + invokes first backfill via `execute_sql` RPC. Multi-actor, multi-stage.
**Status:** drafted v1 — **planning + documentation only per PK directive 2026-05-10.** No `apply_migration`, no EF deploy, no cron enable, no RPC invocation, no D-01 fire until each stage's gate cycle (pre-flight re-verify → D-01 → PK approval phrase → apply → V-checks → close-the-loop).
**Authority:** PRV-0 design lock v2 — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7`
**Source design sections:** PRV-0 v2 §3.1 (schema + grants), §3.3 (`r.expected_publication`), §3.8 (`r.reconciliation_run`), §3.12 (k.* doc-catalog standing rule), §4.1 (`r.normalise_text`), §4.2 (`r.to_sydney_local_date`), §5.1 (`cadence-rule-generator` EF), §8.2 (cc-0009 scope contract), §11.4 (PK v2 amendments — paused-profile suppression model)
**Lineage:** inherits cc-0008 v5 brief — commit `d4cd3b088c98b37667c85382a52b024ef3636b2d` blob `2575f0bb9c3d1a21035b729095eb126465dc7f9e`. Lessons L33+L34+L35+L36 reified in this brief's pre-flight + write-pattern + close-the-loop discipline. cc-0008 seeded `c.client_cadence_rule` with 14 rows (12 active + 2 paused-IG cadence-preserved); cc-0009 first backfill is the first downstream consumer.
**Result file:** `docs/briefs/results/cc-0009-r-schema-and-cadence-rule-generator.md` (created on completion of FINAL stage; intermediate stages may emit interim result fragments per stage close).

---

## Patch history

- **2026-05-10 Sydney — v1** (initial draft; planning only). Lineage from cc-0008 v5; trigger-aware ON CONFLICT pattern (L35) embedded by default; explicit `pg_event_trigger` survey in §1.6 (L33+L34); paused-profile suppression model resolved to **Option B (`expected_status='suppressed'`)** with PK directive rationale.

---

## Lineage (PK directive 2026-05-10)

This brief inherits directly from cc-0008 v5. The following are not repeated assumptions but explicit predicates:

1. **PRV-1 identifier set continues:** PRV-0 v2 design lock is the canonical authority; cc-0009 implements PRV-0 v2 §3.1+§3.3+§3.8+§4.1+§4.2+§5.1+§8.2 verbatim where DDL/function bodies are specified.
2. **v4→v5 lesson chain reified:**
   - **L33** — DDL briefs in `k.schema_registry`-registered schemas (here: `r`) MUST include `pg_event_trigger` survey in §1 pre-flight. **§1.6 of this brief covers this.**
   - **L34** — `k.fn_sync_registry` is database architecture, not edge case. The trigger `trg_k_registry_sync_on_create_table` will fire on every `CREATE TABLE r.*` in this brief and auto-INSERT stub `k.table_registry` + `k.column_registry` rows. Brief-side k.* writes MUST be trigger-aware.
   - **L35** — `INSERT ... ON CONFLICT DO UPDATE` is the defensive pattern for k.* registry rows. **§3.5 + §3.6 of this brief use this verbatim** (one block per new table). Plain INSERT into k.* is forbidden by this brief's §FORBIDDEN ACTIONS.
   - **L36** — `m.chatgpt_review.chatgpt_review_status_check` enum is `{pending, completed, failed, escalated, resolved}`. Each cc-0009 stage's D-01 close-the-loop UPDATE maps to `status='resolved'` with apply-outcome captured in `action_taken` + `resolved_by`.
3. **The v4 `uq_schema_table` collision is the empirical anchor.** v4 attempted plain `INSERT` into `k.table_registry` after the event trigger had already auto-inserted the stub row; collision → atomic rollback. v5 fixed by ON CONFLICT DO UPDATE. cc-0009 follows the v5 pattern from the start. **Re-litigating the v5 fix is not required; replicating it is.**
4. **cc-0008 seed integrity is a prerequisite.** §1.4 verifies `c.client_cadence_rule` row count = 14 with the cc-0008 fingerprint before any cc-0009 apply proceeds. Drift triggers HALT.
5. **`r` schema is already pre-registered in `k.schema_registry`** (verified at cc-0008 v5 §1.13 — `r` row `status='active'`). The trigger fires on `CREATE TABLE r.*` from the first table in this brief.

---

## Investigation record

**Trigger:** PRV-0 v2 §8.2 cc-0009 scope contract is the next sequenced step after cc-0008 v5 closure (v2.61, 2026-05-09). PK directive 2026-05-10: author cc-0009 v1 brief.

**Why now:** cc-0008 v5 closed v2.61 with `c.client_cadence_rule` table created + 14-row seed live. cc-0009 is the first downstream consumer. Without it, the seed is dead weight — no `r.expected_publication` rows are generated, no reconciliation surface emerges, the seed cannot demonstrate value. cc-0010 (matcher + evidence) cannot start until cc-0009 produces expected rows for matching against.

**Delivers (when ALL stages complete):**
1. New `r` schema with grants for `service_role`, `authenticator`, `anon`.
2. New table `r.reconciliation_run` (audit row per generator/materialiser/checker invocation).
3. New table `r.expected_publication` (one row per (client × platform × expected_local_date × cadence_rule)).
4. Two new helper functions in `r`: `r.normalise_text(text)`, `r.to_sydney_local_date(timestamptz)`.
5. Doc-catalog rows in `k.table_registry` + `k.column_registry` for both new tables (trigger-aware ON CONFLICT).
6. New Edge Function `cadence-rule-generator` (TypeScript, Deno, pattern matches existing pipeline workers) with `verify_jwt=false` declared in `supabase/config.toml`.
7. New pg_cron job scheduled daily 02:00 Sydney (= 16:00 UTC standard time / 15:00 UTC during AEDT) calling cadence-rule-generator EF via `net.http_post`. (Brief notes the 30-second `timeout_milliseconds` standard per F-CRON-PG-NET-TIMEOUT-30S closure v2.57.)
8. First on-demand invocation that runs the 7-day backfill + 7-day forward window (D-23 — 14-day initial horizon).

**Does NOT deliver (out of cc-0009 scope; deferred to cc-0010 / cc-0011 / PRV-2/3/4):**
- `r.ice_publication_evidence` / `r.platform_observation` / `r.platform_manual_observation` / `r.reconciliation_match` / `r.platform_observer_health` / `r.matcher_config` (all cc-0010).
- `r.compact_raw_json` helper (cc-0010).
- `r.cadence_drift_log` table + `cadence-drift-checker` EF (cc-0011).
- `ice-evidence-materialiser` EF + `reconciliation-matcher` EF (cc-0010).
- Per-platform observer EFs `facebook-observer` / `instagram-observer` / `linkedin-observer` / `youtube-observer` (PRV-2/3/4).
- Materialised views `r.mv_reconciliation_daily_matrix` + `r.mv_observer_freshness_summary` (cc-0011).
- Tier 2–5 matching, manual override semantics, dashboard surfaces.
- Re-adding the `r.expected_publication.matched_match_id` FK to `r.reconciliation_match` — that table doesn't exist in cc-0009 (see §2 deferred FK note).

**Class:** Build-class brief, multi-stage, multi-actor. **5 stages, each with its own gate cycle.**

---

## Design intent

Establish the reconciliation prediction surface (`r.expected_publication`) and its production loop (cadence-rule-generator) so that every (client × platform × day) the cadence rule expects a publication, a row exists describing that expectation. Subsequent matchers (cc-0010+) collapse this row's `expected_status` into `matched | missing | late | unscheduled_published | observed_no_ice | suppressed` based on evidence.

**Why a separate `r` schema not extension of `m`:** PRV-0 D-1 lock — reconciliation reads from publish-side as data, never writes to `m.*`. Schema separation makes the read-only contract structurally enforced (matcher Edge Functions deploy with grants on `r` only).

**Why functions in `r` not `public`:** Co-located with the schema they serve; matches `r.compact_raw_json` (cc-0010) and `r.normalise_text` (cc-0009) pattern. `r.to_sydney_local_date` is used everywhere `expected_local_date` / `observed_local_date` is computed from a timestamptz — putting it in `r` makes the dependency obvious.

**Why option B (`expected_status='suppressed'`) for paused-IG, not option A (skip):** PK directive 2026-05-10 confirms the recommended default is option (b). Rationale (this brief, captured for the §3.4 design decision lock):

1. **Auditability.** A suppressed row preserves the audit trail "we WOULD have expected a publication here, but the publish profile was paused." Option (a) leaves a gap in the matrix that the operator must remember to re-interpret.
2. **Drift-checker compatibility (cc-0011).** `cadence-drift-checker` compares cadence-rule predictions vs publish-side predictions per (client × platform × day). With Option B, both sides agree on row count (cadence emits N rows, N of which are `suppressed`; publish-side suppresses N publishes). With Option A, cadence side emits 0 rows for paused days, publish-side ALSO emits 0 → drift = 0 by accident, masking the underlying state.
3. **Resumption transparency.** When `c.client_publish_profile.publish_enabled` flips back to true, the next generator run inserts normal `expected` rows. With Option B, the matrix shows a clean transition from `suppressed` to `expected` on the resume date. With Option A, the matrix shows an ambiguous "no row" period until the resume date.
4. **Storage cost trivial.** Two paused-IG profiles × 5 weekdays × 365 days = ~520 suppressed rows per year. Negligible.

**Decision lock for cc-0009:** **Option B.** Generator emits `r.expected_publication(expected_status='suppressed', suppression_reason='publish_profile_paused: <paused_reason>')` for paused (client × platform) profiles. PRV-0 v2 §5.1 v2 amendment honoured.

**No production behaviour changes upstream of cc-0009.** ICE pipeline reads no `r.*` table. cc-0009 is downstream-only from existing pipeline state.

---

## Blast radius

**Direct write surface:**
- New schema `r` (creates from empty).
- New `r.reconciliation_run` (creates with 0 rows; first invocation inserts 1 row).
- New `r.expected_publication` (creates with 0 rows; first invocation inserts ~94–98 rows for 14-day backfill at 14 cadence rules × 5 weekdays/week = ~98 days × 1 row/day, minus weekends + suppressed pairs).
- New helper functions in `r` (idempotent CREATE OR REPLACE).
- `k.table_registry` (2 UPSERTs; trigger pre-inserts 2 stub rows).
- `k.column_registry` (~30 UPSERTs across both tables; trigger pre-inserts ~30 stub rows).
- `supabase/functions/cadence-rule-generator/` (NEW directory + index.ts).
- `supabase/config.toml` (added `[functions.cadence-rule-generator] verify_jwt = false`).
- pg_cron `cron.job` table (NEW row jobid TBD; jobname `cadence_rule_generator_daily`).

**Read-only surface (no writes):**
- `c.client_cadence_rule` (14 rows; cc-0008 seed).
- `c.client_publish_profile` (paused-detection at runtime).
- `c.client` (FK target).

**Indirect risk:**
1. **Wrong helper function semantics → all downstream date math wrong.** `r.to_sydney_local_date` is used everywhere by the generator. A bug here produces wrong `expected_local_date` for every row. **Mitigation:** §4 V-checks include explicit `r.to_sydney_local_date(now())` evaluation against known-good Sydney clock-time at apply.
2. **Trigger collision on `CREATE TABLE r.*`.** If `trg_k_registry_sync_on_create_table` config has drifted since cc-0008 v5 §1.13, plain INSERT into k.* would collide. **Mitigation:** §1.6 re-survey + §3.5 + §3.6 use ON CONFLICT DO UPDATE (L35).
3. **First backfill produces wrong row count.** Off-by-one in horizon math, or paused-profile detection bug, or weekday mismatch → wrong `r.expected_publication` rows. **Mitigation:** §4 Stage E V-checks include row-count breakdown per (client × platform × expected_status); PK reviews before next stage proceeds.
4. **Cron timing collision with other 02:00 Sydney jobs.** **Mitigation:** §1.10 reads `cron.job` table; if a 02:00 Sydney job already runs, cc-0009 schedules at 02:05 Sydney to spread load.
5. **EF JWT verification inheritance regression.** v2.54 lesson — `verify_jwt: false` must be set explicitly per deploy. **Mitigation:** `supabase/config.toml` entry + `--no-verify-jwt` flag in deploy command. Stage C V-check confirms.
6. **FK to `r.reconciliation_match` cannot be added** because that table is in cc-0010. PRV-0 §3.3 shows `matched_match_id uuid REFERENCES r.reconciliation_match(...) ON DELETE SET NULL` — cc-0009 omits the REFERENCES clause; cc-0010 brief adds it via `ALTER TABLE r.expected_publication ADD CONSTRAINT ...` after `r.reconciliation_match` exists. **This is a deliberate cross-brief FK deferral** captured in §2.3 + §1.11 + the cc-0010 readiness signal in §STOP CONDITION.

**Cost-of-waiting:** Low. PRV-1 cannot proceed without it. No live system is degraded; cc-0008 seed sits unread.

---

## Source context

- **PRV-0 v2 design lock** — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147`. Authoritative for §3.1, §3.3, §3.8, §3.12, §4.1, §4.2, §5.1, §8.2, §11.4.
- **cc-0008 v5 brief** — `docs/briefs/cc-0008-client-cadence-rule-table-and-seed.md` commit `d4cd3b088c98b37667c85382a52b024ef3636b2d` blob `2575f0bb9c3d1a21035b729095eb126465dc7f9e`. Direct lineage; §1.13 verified `r` schema pre-registered.
- **cc-0008 v5 result file** — `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md` (committed in v2.61 4-way sync). Empirical evidence of 14-row seed shape.
- **`c.client_cadence_rule`** — 14 rows from cc-0008 v5 seed. PRIMARY input to generator.
- **`c.client_publish_profile`** — `publish_enabled` + `paused_reason` per (client × platform). Generator queries to detect paused profiles for Option B suppression.
- **`c.client`** — FK target (4 active rows).
- **`k.table_registry` + `k.column_registry`** — doc-catalog targets (PRV-0 §3.12).
- **`m.chatgpt_review`** — D-01 audit trail (5 D-01 fires expected across cc-0009 stages).
- **F-CRON-PG-NET-TIMEOUT-30S closure (v2.57)** — `timeout_milliseconds := 30000` is the standard for cron-invoked EF calls.
- **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT closure (v2.58)** — cron `Authorization` header pattern; JWT format strict.
- **F-EF-DRIFT-PREVENTION (Stage 1–3 closed v2.41–v2.49)** — `supabase/config.toml` is durable source of truth for `verify_jwt`.
- **video-worker v3.0.0 deploy + verify_jwt regression recovery (v2.54)** — `verify_jwt: false` set explicitly + `--no-verify-jwt` deploy flag.
- **L33+L34+L35+L36** — cc-0008 v5 reified lessons; carry forward verbatim.
- **PRV-0 §11.4** — PK v2 amendments: minute-precision cadence + paused-profile suppression model.

---

## Scope

**In scope (across 5 stages):**

| Stage | Component | Actor | Apply method | Gate |
|---|---|---|---|---|
| **A** | DDL: `CREATE SCHEMA r` + grants + 2 tables + 2 functions + k.* registry UPSERTs | chat | single `apply_migration cc_0009_r_schema_and_helpers` | NEW Stage-A D-01 fire + PK approval phrase + §1 final re-verify + V1–V8 PASS |
| **B** | EF source: `supabase/functions/cadence-rule-generator/index.ts` + `supabase/config.toml` amendment | CC | git commit + push to `main` | NEW Stage-B D-01 fire (chat fires after CC pushes; reviews diff) + PK approval phrase |
| **C** | EF deploy: `supabase functions deploy cadence-rule-generator --no-verify-jwt` | CC (manual; PowerShell from `C:\Users\parve\Invegent-content-engine` per memory standing rule) | CLI deploy | NEW Stage-C D-01 fire + PK approval phrase + post-deploy verification (`get_edge_function` + manual probe) |
| **D** | pg_cron schedule: insert `cron.job` row jobname `cadence_rule_generator_daily` running daily 02:05 Sydney via `net.http_post` to deployed EF URL | chat | `apply_migration cc_0009_pg_cron_cadence_generator` | NEW Stage-D D-01 fire + PK approval phrase + V-check on `cron.job` |
| **E** | First invocation: synchronous `select net.http_post(...)` against deployed EF for backfill horizon −7..+7 | chat | `execute_sql` (RPC-style) | NEW Stage-E D-01 fire + PK approval phrase + V-check on `r.reconciliation_run` + `r.expected_publication` row counts |

**Out of scope (defer per PRV-0 v2 §8.2):**
- All other `r.*` tables (cc-0010): `r.ice_publication_evidence`, `r.platform_observation`, `r.platform_manual_observation`, `r.reconciliation_match`, `r.platform_observer_health`, `r.matcher_config`, `r.cadence_drift_log` (cc-0011).
- `r.compact_raw_json` helper (cc-0010).
- All other reconciliation EFs: `ice-evidence-materialiser`, `reconciliation-matcher` (cc-0010); `cadence-drift-checker` (cc-0011).
- Per-platform observers `facebook-observer` / `instagram-observer` / `linkedin-observer` / `youtube-observer` (PRV-2/3/4).
- Materialised views (cc-0011).
- Tier 2–5 matching logic (cc-0010+ EFs).
- Manual override UI (PRV-5).
- Dashboard surfaces (PRV-2 / PRV-5).
- M8b separate brief work.
- 5 prior outstanding `m.chatgpt_review` close-the-loop UPDATEs (separate brief / batched at next session per v2.61 carry).
- Memory `recent_updates` v2.55–v2.61 entries (separate; PK explicit deferral).
- Dashboard PHASES reconciliation (17th carry).
- F-CRON-AUTO-APPROVER-SECRET-INLINE (separate; PK approval required).
- Re-adding `r.expected_publication.matched_match_id` FK to `r.reconciliation_match` (cc-0010 ALTER TABLE).

## Allowed actions

- Read-only `SELECT` against `c.client`, `c.client_publish_profile`, `c.client_cadence_rule`, `k.*`, `m.chatgpt_review`, `pg_*`, `information_schema.*`, `cron.job`, `cron.job_run_details`, `supabase_migrations.schema_migrations` for pre-flight + verification across all stages.
- 5 `ask_chatgpt_review` D-01 fires (one per stage A–E).
- 1 `apply_migration` named `cc_0009_r_schema_and_helpers` (Stage A): schema + grants + 2 tables + 2 functions + k.* registry UPSERTs, all in one transactional unit per memory standing rule.
- 1 `apply_migration` named `cc_0009_pg_cron_cadence_generator` (Stage D): cron.schedule call + ALTER on jobid post-create if needed for `timeout_milliseconds`.
- Up to 3 retry attempts on each V-check stage (network/timeout only).
- 5 `m.chatgpt_review` UPDATE post-each-stage (close-the-loop, status='resolved' per L36).
- 1 commit creating `docs/briefs/results/cc-0009-r-schema-and-cadence-rule-generator.md` at FINAL stage close (interim per-stage logs append into this single result file).
- 1 commit per 4-way sync close (potentially per-stage at PK directive; default = single commit at FINAL stage).
- Stage B+C: CC commits to `supabase/functions/cadence-rule-generator/` + `supabase/config.toml` per `docs/briefs/cc-0009-r-schema-and-cadence-rule-generator.md`-derived sub-brief.
- Stage E: 1 `execute_sql` call invoking `select net.http_post(...)` against deployed EF URL for first backfill.

## Forbidden actions

- **No `apply_migration` before each stage's D-01 returns clean agree + PK explicit approval phrase.**
- **No `execute_sql` for any DDL** (memory standing rule). Stage A uses `apply_migration`. Stage D uses `apply_migration` (cron.schedule wraps DDL semantics).
- **No plain `INSERT INTO k.table_registry` or `INSERT INTO k.column_registry`** (L35). All k.* writes via `INSERT ... ON CONFLICT DO UPDATE`.
- **No DDL deviation from PRV-0 v2 §3.1 / §3.3 / §3.8 / §4.1 / §4.2** unless §1 pre-flight surfaces a genuine blocker.
- **No PRV-0 §3.3 `matched_match_id REFERENCES r.reconciliation_match` clause** in cc-0009 — that FK depends on cc-0010. Column exists without REFERENCES; cc-0010 ALTER TABLE adds.
- **No EF deploy by chat** — Stage C is CC-only per memory standing rule ("Windows MCP PowerShell — long-running CLI commands time out; run manually from `C:\Users\parve\Invegent-content-engine`").
- **No cron schedule cadence outside daily 02:05 Sydney** (per §1.10 collision-avoidance with existing 02:00 Sydney cron) without PK approval.
- **No `verify_jwt: true`** for cadence-rule-generator (v2.54 lesson; custom-header internal cron pattern).
- **No first invocation horizon outside −7..+7 days** (PRV-0 D-23 lock).
- **No write to `c.*`, `m.*`, `f.*`, `t.*`, `a.*`** schemas anywhere in cc-0009.
- **No `r.*` table creation beyond `r.reconciliation_run` + `r.expected_publication`** (other r.* tables are cc-0010).
- **No `r.*` function creation beyond `r.normalise_text` + `r.to_sydney_local_date`** (`r.compact_raw_json` is cc-0010).
- **No EF deploys outside cadence-rule-generator** (no ice-evidence-materialiser, no reconciliation-matcher, no cadence-drift-checker, no per-platform observers).
- **No cron schedule for any other reconciliation EF** (cc-0010 / cc-0011).
- **No M8 work, no Phase 0 scheduling, no temp log tables, no F-CRON-AUTO-APPROVER-SECRET-INLINE work.**
- **No update to `m.chatgpt_review` beyond the 5 stage close-the-loop UPDATEs.**
- **No proceeding past any stage's D-01 if verdict != `agree` with `proceed`** (or PK explicit Lesson #62 type-(c) state-capture override).
- **No skip of inter-stage gate** (e.g., proceeding to Stage D before Stage C deploy verified).

---

## §1. Pre-flight verification (read-only) — TO RUN AT EACH STAGE'S APPLY GATE

All §1.x sub-checks are read-only against production via Supabase MCP `execute_sql`. **Re-run each immediately preceding apply within ~60s** to confirm no drift (P1–P5 discipline per Lesson #61). Empirical results captured here at brief authoring will be re-captured at apply time and embedded in each stage's D-01 packet `verified_claims`.

This section's order: §1.1–§1.4 are common to all stages; §1.5–§1.7 are Stage A; §1.8–§1.9 are Stage B+C; §1.10–§1.12 are Stage D+E.

### 1.1 Schema readiness

```sql
SELECT
  EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='r') AS schema_r_exists,
  EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='c') AS schema_c_exists,
  EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='k') AS schema_k_exists,
  EXISTS (SELECT 1 FROM pg_extension WHERE extname='pgcrypto') AS pgcrypto_installed,
  EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') AS pg_cron_installed,
  EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_net') AS pg_net_installed,
  EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_trgm') AS pg_trgm_installed;
```

**Decision rule (Stage A):** `schema_r_exists=true` → HALT (§6.2.a, idempotency violated). `schema_c_exists=false` OR `schema_k_exists=false` OR `pgcrypto_installed=false` → HALT. `pg_cron_installed=false` OR `pg_net_installed=false` → HALT (Stage D dependency). `pg_trgm_installed=false` → not blocking for cc-0009 (used by cc-0010 platform_observation gin index).

### 1.2 `r` schema status in `k.schema_registry` (L34 carry from cc-0008 v5 §1.13)

```sql
SELECT schema_name, status, registered_at
FROM k.schema_registry
WHERE schema_name = 'r';
```

**Decision rule:** 1 row, `status='active'` → PASS. 0 rows OR `status != 'active'` → HALT (§6.2.b). Per cc-0008 v5 §1.13 verification, `r` is pre-registered. Trigger `trg_k_registry_sync_on_create_table` will fire on Stage A `CREATE TABLE r.reconciliation_run` and `CREATE TABLE r.expected_publication` and auto-INSERT stub rows into `k.table_registry` + `k.column_registry`.

### 1.3 cc-0008 seed integrity (FIRST downstream consumer must verify upstream)

```sql
SELECT
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE is_active=true) AS active_rows,
  COUNT(*) FILTER (WHERE preferred_local_times IS NOT NULL
                     AND array_length(preferred_local_times, 1) >= 1) AS rows_with_times,
  COUNT(*) FILTER (WHERE expected_format IS NOT NULL) AS rows_with_format,
  COUNT(DISTINCT (client_id, platform)) AS distinct_pairs,
  COUNT(*) FILTER (WHERE created_by = 'cc-0008-chat-seed') AS cc_0008_authored
FROM c.client_cadence_rule;
```

**Decision rule:** All must equal 14. Drift on any → HALT (§6.2.c). cc-0008 v5 result file commits this fingerprint as the canonical reference.

### 1.4 `c.client_publish_profile` readability for paused detection (Option B input)

```sql
SELECT cli.client_slug, cpp.platform, cpp.publish_enabled, cpp.paused_reason
FROM c.client_publish_profile cpp
JOIN c.client cli ON cli.client_id = cpp.client_id
WHERE cli.status = 'active'
ORDER BY cli.client_slug, cpp.platform;
```

**Decision rule:** 14 rows expected (matching §1.3 distinct_pairs). 12 with `publish_enabled=true`, 2 with `publish_enabled=false` (NDIS-Yarns × IG, Property Pulse × IG) carrying `paused_reason ILIKE 'meta_subcode_2207051%'`. Drift → SURFACE for PK (paused-profile shape changed since cc-0008; generator semantics may need review).

### 1.5 (Stage A) Migration name uniqueness

```sql
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE name IN ('cc_0009_r_schema_and_helpers', 'cc_0009_pg_cron_cadence_generator')
ORDER BY name;
```

**Decision rule:** 0 rows → PASS. Any row → HALT (§6.2.d).

### 1.6 (Stage A — L33+L34) Event-trigger survey on `k.*`

```sql
SELECT evtname, evtevent, evtenabled, pg_proc.proname AS function_name,
       pg_get_functiondef(pg_proc.oid) AS function_body
FROM pg_event_trigger
JOIN pg_proc ON pg_proc.oid = pg_event_trigger.evtfoid
JOIN pg_namespace ns ON ns.oid = pg_proc.pronamespace
WHERE ns.nspname = 'k'
  AND pg_event_trigger.evtenabled IN ('O', 'R', 'A')
ORDER BY evtname;
```

**Decision rule:** Expect (per cc-0008 v5 §1.12):
- `trg_k_refresh_catalog` (function `k.evt_refresh_catalog`) — informational
- `trg_k_registry_sync_on_create_table` (function `k.evtrg_sync_registry_on_create_table` → `k.fn_sync_registry`) — auto-INSERTs stubs into `k.table_registry` + `k.column_registry`

If either is `evtenabled='D'`, removed, or function body diverges from cc-0008 v5 capture → HALT (§6.2.e). The body comparison MUST confirm the auto-INSERT semantics are unchanged (NOT EXISTS guards on both INSERTs; default `purpose='auto-registered'`, `allowed_ops='read-only'`, `is_foreign_key=false`).

### 1.7 (Stage A — L34) `k.*` UNIQUE constraints + column defaults (re-check cc-0008 v5 §1.13)

```sql
SELECT t.relname, c.conname, c.contype, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'k' AND t.relname IN ('table_registry', 'column_registry')
  AND c.contype IN ('p', 'u', 'f')
ORDER BY t.relname, c.conname;
```

**Decision rule:** Expect:
- `k.table_registry.uq_schema_table` UNIQUE `(schema_name, table_name)` ✓
- `k.column_registry.uq_table_column` UNIQUE `(table_id, column_name)` ✓
- `k.column_registry.<fk_name>` FK on `table_id` → `k.table_registry(table_id)` ON DELETE CASCADE ✓

Drift on any → HALT (§6.2.f). These are the conflict targets for Stage A §3.5 + §3.6 ON CONFLICT clauses.

### 1.8 (Stage B+C) Existing EF inventory — no `cadence-rule-generator`

```sql
SELECT slug, version, status, verify_jwt, deployed_at
FROM supabase_functions.list  -- pseudocode; in practice MCP list_edge_functions
WHERE slug = 'cadence-rule-generator';
```

Via MCP `list_edge_functions` then filter; OR `pg_stat_user_functions` + Edge Functions admin API via Supabase MCP.

**Decision rule:** 0 rows → PASS. Any row → HALT (§6.2.g, idempotency violated). Stage C deploy is a fresh deploy.

### 1.9 (Stage B+C) `supabase/config.toml` current state

CC reads the file at `supabase/config.toml` head and confirms:
- Section `[functions.cadence-rule-generator]` does NOT exist
- Other deployed EFs that have `[functions.<slug>] verify_jwt = false` already have entries (precondition; F-EF-DRIFT-PREVENTION durable-source-of-truth)

**Decision rule:** existing entry for cadence-rule-generator → HALT (§6.2.g idempotency). Other EFs missing entries → SURFACE for PK; not blocking for Stage B but flag.

### 1.10 (Stage D) cron job collision survey at 02:00 Sydney

```sql
SELECT jobid, jobname, schedule, command, active, nodename
FROM cron.job
WHERE active = true
  AND (schedule LIKE '0 2 * * *' OR schedule LIKE '0 16 * * *' OR schedule LIKE '0 17 * * *' OR schedule LIKE '5 2 * * *')
ORDER BY jobid;
```

(Schedules are UTC. 02:00 Sydney = 16:00 UTC AEST or 15:00 UTC AEDT — UTC schedule should be `0 16 * * *` for AEST or `0 15 * * *` for AEDT. cc-0009 chooses Sydney clock-time semantics via cron expression timezone. Default pg_cron treats schedule as UTC — so cc-0009 schedule will be `5 16 * * *` (AEST) OR `5 15 * * *` (AEDT) depending on current Sydney offset; brief locks **`5 16 * * *`** (AEST, valid Apr–Oct) given cc-0009 first-apply target window 2026-05-10..2026-05-31. Rationale: Australia is in AEST through October; daylight savings in NSW resumes early October. NOTE: this is a deviation from PRV-0 D-19 "daily 02:00 Sydney" — chat selects 02:05 Sydney to avoid unspecified collision; PK directs final time at Stage D D-01 review.)

**Decision rule:** Existing job at 02:00 Sydney equivalent UTC → schedule cc-0009 at 02:05 Sydney equivalent UTC (`5 16 * * *` AEST / `5 15 * * *` AEDT). No collision → schedule at 02:00 Sydney equivalent UTC (`0 16 * * *` AEST / `0 15 * * *` AEDT). Cron expression locked at Stage D D-01 fire time per pre-flight result.

### 1.11 (Stage D) Existing cron job for cadence-rule-generator

```sql
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'cadence_rule_generator_daily';
```

**Decision rule:** 0 rows → PASS. Any row → HALT (§6.2.h, idempotency violated).

### 1.12 (Stage E) Stage A+D outputs in place

Verifies prior stages landed before first invocation:

```sql
SELECT
  EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='r') AS schema_r_present,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='reconciliation_run') AS rr_present,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='expected_publication') AS ep_present,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='r' AND routine_name='to_sydney_local_date') AS fn_to_syd_present,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='r' AND routine_name='normalise_text') AS fn_normalise_present,
  EXISTS (SELECT 1 FROM cron.job WHERE jobname='cadence_rule_generator_daily' AND active=true) AS cron_active,
  (SELECT COUNT(*) FROM r.reconciliation_run) AS rr_existing_rows,
  (SELECT COUNT(*) FROM r.expected_publication) AS ep_existing_rows;
```

**Decision rule:** All 6 boolean fields = true → PASS. `rr_existing_rows = 0` AND `ep_existing_rows = 0` → PASS (first invocation). Any false OR > 0 row counts → HALT (§6.2.i, sequencing violation OR prior partial backfill).

---

## §2. Proposed DDL — Stage A (single `apply_migration cc_0009_r_schema_and_helpers`)

All DDL + helper functions + k.* registry rows in ONE transactional unit per memory standing rule. cc-0008 v5 pattern: trigger fires at `ddl_command_end` of each `CREATE TABLE`, auto-inserting stub k.* rows; brief's UPSERTs in §3.5 + §3.6 enrich in-place (L35).

### 2.1 `CREATE SCHEMA r` + grants (PRV-0 §3.1 verbatim)

```sql
CREATE SCHEMA IF NOT EXISTS r;
GRANT USAGE ON SCHEMA r TO authenticator, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA r TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA r TO anon, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA r GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA r GRANT SELECT ON TABLES TO anon, authenticator;
```

### 2.2 `CREATE TABLE r.reconciliation_run` (PRV-0 §3.8 verbatim)

```sql
CREATE TABLE IF NOT EXISTS r.reconciliation_run (
    reconciliation_run_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type                 text NOT NULL CHECK (run_type IN (
        'cadence_generation','ice_evidence_materialisation','platform_observation','manual_observation',
        'matching','cadence_drift_check','backfill','manual_override','adhoc'
    )),
    trigger                  text NOT NULL CHECK (trigger IN ('scheduled','manual','rpc','backfill','dependency')),
    started_at               timestamptz NOT NULL DEFAULT now(),
    finished_at              timestamptz,
    status                   text NOT NULL DEFAULT 'running'
        CHECK (status IN ('running','succeeded','failed','partial','cancelled')),
    rows_processed           int,
    rows_inserted            int,
    rows_updated             int,
    rows_skipped             int,
    error_summary            text,
    summary_json             jsonb DEFAULT '{}',
    triggered_by             text,
    parent_run_id            uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    CONSTRAINT recon_run_finished_when_done CHECK (
        (status IN ('running') AND finished_at IS NULL)
        OR (status NOT IN ('running'))
    )
);

CREATE INDEX IF NOT EXISTS recon_run_type_recent
    ON r.reconciliation_run (run_type, started_at DESC);

CREATE INDEX IF NOT EXISTS recon_run_status_failed
    ON r.reconciliation_run (status, started_at DESC)
    WHERE status IN ('failed','partial','cancelled');

COMMENT ON TABLE r.reconciliation_run IS 'One row per scheduled or manual run of any reconciliation EF. parent_run_id permits chained runs (e.g., backfill_run kicks ice_evidence_materialisation_run and child references parent). Retention: 90 days for succeeded; 365 days for failed/partial/cancelled (D-11).';
```

### 2.3 `CREATE TABLE r.expected_publication` (PRV-0 §3.3 — **`matched_match_id` REFERENCES clause OMITTED in cc-0009**; cc-0010 ALTER TABLE adds back)

**Deferred FK note:** PRV-0 §3.3 specifies `matched_match_id uuid REFERENCES r.reconciliation_match(reconciliation_match_id) ON DELETE SET NULL`. Since `r.reconciliation_match` is created in cc-0010, cc-0009 omits the REFERENCES clause. cc-0010 ALTER TABLE adds the constraint after `r.reconciliation_match` is created. Column type, name, nullability all preserved.

```sql
CREATE TABLE IF NOT EXISTS r.expected_publication (
    expected_publication_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                 text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    cadence_rule_id          uuid NOT NULL REFERENCES c.client_cadence_rule(cadence_rule_id) ON DELETE RESTRICT,
    expected_local_date      date NOT NULL,
    expected_window_start    timestamptz NOT NULL,
    expected_window_end      timestamptz NOT NULL,
    expected_format          text,
    expected_status          text NOT NULL DEFAULT 'expected'
        CHECK (expected_status IN ('expected','matched','missing','late','unscheduled_published','observed_no_ice','backfilled','suppressed')),
    suppression_reason       text,
    matched_match_id         uuid,                                       -- PRV-0 §3.3 FK to r.reconciliation_match deferred to cc-0010 ALTER TABLE
    matched_at               timestamptz,
    notes                    text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    created_by_run_id        uuid,                                       -- intended FK to r.reconciliation_run; PRV-0 §3.3 doesn't enforce; left as bare uuid for now
    updated_at               timestamptz NOT NULL DEFAULT now(),
    updated_by_run_id        uuid,
    UNIQUE (client_id, platform, expected_local_date, cadence_rule_id),
    CONSTRAINT expected_window_valid CHECK (expected_window_end > expected_window_start),
    CONSTRAINT expected_status_match_pair CHECK (
        (expected_status IN ('matched') AND matched_match_id IS NOT NULL AND matched_at IS NOT NULL)
        OR (expected_status NOT IN ('matched'))
    )
);

CREATE INDEX IF NOT EXISTS expected_publication_client_platform_date
    ON r.expected_publication (client_id, platform, expected_local_date);

CREATE INDEX IF NOT EXISTS expected_publication_status_open
    ON r.expected_publication (expected_local_date, expected_status)
    WHERE expected_status IN ('expected','missing','late','observed_no_ice');

COMMENT ON TABLE r.expected_publication IS 'Generated by cadence-rule-generator from c.client_cadence_rule. One row per (client, platform, expected_local_date, cadence_rule_id). expected_status transitions to matched/missing/late by reconciliation-matcher (cc-0010). backfilled rows are inserted retroactively by manual entry or backfill cron. suppressed rows are emitted (cc-0009 v1 Option B lock) when c.client_publish_profile.publish_enabled=false at generation time — they preserve the cadence prediction without firing missing/late alerts. PRV-0 §3.3 matched_match_id FK to r.reconciliation_match is deferred to cc-0010 ALTER TABLE.';
```

### 2.4 `CREATE FUNCTION r.normalise_text` (PRV-0 §4.1 verbatim)

```sql
CREATE OR REPLACE FUNCTION r.normalise_text(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    out text;
BEGIN
    IF input IS NULL THEN RETURN NULL; END IF;
    out := lower(input);
    out := regexp_replace(out, 'https?://\S+', '[URL]', 'g');
    out := regexp_replace(out, '@\w+', '', 'g');
    out := regexp_replace(out, '#\w+', '', 'g');
    out := regexp_replace(out, '[\x{1F000}-\x{1FFFF}]', '', 'g');
    out := regexp_replace(out, '[\x{2600}-\x{27BF}]', '', 'g');
    out := regexp_replace(out, '\s+', ' ', 'g');
    out := trim(out);
    RETURN out;
END;
$$;

COMMENT ON FUNCTION r.normalise_text IS 'D-16 spec: lowercase + collapse whitespace + strip emoji + replace URL substrings with [URL] + strip @mentions and #hashtags. Used by matcher tier 4/5 caption similarity (cc-0010+).';
```

### 2.5 `CREATE FUNCTION r.to_sydney_local_date` (PRV-0 §4.2 verbatim)

```sql
CREATE OR REPLACE FUNCTION r.to_sydney_local_date(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT (ts AT TIME ZONE 'Australia/Sydney')::date;
$$;

COMMENT ON FUNCTION r.to_sydney_local_date IS 'D-17 spec: interpret ts in Sydney timezone, return the date. Used everywhere observed_local_date / expected_local_date is computed from a timestamptz.';
```

---

## §3. Proposed DML — Stage A k.* registry UPSERTs (L35 trigger-aware ON CONFLICT)

### 3.1 (NOTE on trigger interaction)

When Stage A apply_migration runs, the `CREATE TABLE r.reconciliation_run` and `CREATE TABLE r.expected_publication` statements each fire `trg_k_registry_sync_on_create_table` at `ddl_command_end`. The trigger executes `k.fn_sync_registry` which inserts:
- 1 stub row into `k.table_registry` per CREATE TABLE (`purpose='auto-registered'`, `allowed_ops='read-only'` defaults)
- N stub rows into `k.column_registry` per CREATE TABLE (one per column from `information_schema.columns`; defaults `is_foreign_key=false`, `pii_risk='none'`, `column_purpose=NULL`)

By the time §3.5 + §3.6 INSERTs run within the same transaction, the stubs already exist. The ON CONFLICT clauses upgrade the rich metadata in-place. This is the v5 lesson L35 pattern.

### 3.5 `k.table_registry` — UPSERT for both new tables

```sql
INSERT INTO k.table_registry (
    schema_name, table_name, table_kind, status, owner,
    source_system, source_reference, refresh_method, refresh_cadence,
    allowed_ops, pii_risk, purpose,
    primary_use_cases, join_keys, rules_summary, advisory
) VALUES
('r', 'reconciliation_run', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.8', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'One row per scheduled or manual run of any reconciliation EF. Audit trail for cadence-rule-generator (cc-0009), ice-evidence-materialiser (cc-0010), platform observers (PRV-2/3/4), reconciliation-matcher (cc-0010), cadence-drift-checker (cc-0011).',
 'Audit run lookups; failed-run debugging; chained-run lineage via parent_run_id.',
 'parent_run_id -> r.reconciliation_run(reconciliation_run_id) self-reference.',
 'Retention: 90 days succeeded; 365 days failed/partial/cancelled (D-11). One row per EF invocation. status transitions running -> succeeded|failed|partial|cancelled.',
 'cc-0009 introduces this table. cc-0010 adds reconciliation_run_id references from r.platform_observation.fetch_run_id, r.reconciliation_match.matcher_run_id, r.platform_observer_health.last_*_run_id.'),
('r', 'expected_publication', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.3', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'Generated by cadence-rule-generator from c.client_cadence_rule. One row per (client, platform, expected_local_date, cadence_rule_id). expected_status transitions to matched/missing/late by reconciliation-matcher (cc-0010). backfilled rows inserted retroactively. suppressed rows (Option B lock) emitted when c.client_publish_profile.publish_enabled=false.',
 'PRV-1 reconciliation surface; matrix view input (cc-0011); matcher input (cc-0010); manual override target (PRV-5).',
 'client_id -> c.client(client_id); cadence_rule_id -> c.client_cadence_rule(cadence_rule_id); matched_match_id -> r.reconciliation_match(reconciliation_match_id) (FK deferred to cc-0010 ALTER TABLE).',
 'UNIQUE (client_id, platform, expected_local_date, cadence_rule_id) prevents duplicate generation. Generator INSERT ON CONFLICT DO NOTHING for idempotent re-runs. expected_status enum drives reconciliation surface state machine. Option B suppression: status=suppressed for paused publish_profile.',
 'cc-0009 introduces this table + first 14-day backfill via on-demand EF invocation. cc-0010 adds matched_match_id FK constraint. cc-0011 adds materialised view r.mv_reconciliation_daily_matrix consuming this table.')
ON CONFLICT (schema_name, table_name) DO UPDATE SET
    table_kind        = EXCLUDED.table_kind,
    status            = EXCLUDED.status,
    owner             = EXCLUDED.owner,
    source_system     = EXCLUDED.source_system,
    source_reference  = EXCLUDED.source_reference,
    refresh_method    = EXCLUDED.refresh_method,
    refresh_cadence   = EXCLUDED.refresh_cadence,
    allowed_ops       = EXCLUDED.allowed_ops,
    pii_risk          = EXCLUDED.pii_risk,
    purpose           = EXCLUDED.purpose,
    primary_use_cases = EXCLUDED.primary_use_cases,
    join_keys         = EXCLUDED.join_keys,
    rules_summary     = EXCLUDED.rules_summary,
    advisory          = EXCLUDED.advisory,
    updated_at        = now();
```

### 3.6 `k.column_registry` — UPSERT for both new tables

CTE-driven pattern from cc-0008 v5 §3.4. One CTE block per new table; combined into a single statement via UNION ALL across the two purposes tables.

```sql
WITH t_rr AS (
    SELECT table_id FROM k.table_registry WHERE schema_name='r' AND table_name='reconciliation_run'
),
t_ep AS (
    SELECT table_id FROM k.table_registry WHERE schema_name='r' AND table_name='expected_publication'
),
cols_rr AS (
    SELECT column_name, ordinal_position, data_type, udt_name,
           (is_nullable='YES') AS is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='r' AND table_name='reconciliation_run'
),
cols_ep AS (
    SELECT column_name, ordinal_position, data_type, udt_name,
           (is_nullable='YES') AS is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='r' AND table_name='expected_publication'
),
purposes_rr (column_name, fk_schema, fk_table, fk_column, column_purpose) AS (
    VALUES
    ('reconciliation_run_id', NULL::text, NULL::text, NULL::text, 'Surrogate primary key. One row per reconciliation EF run.'),
    ('run_type',              NULL, NULL, NULL, 'CHECK enum: cadence_generation | ice_evidence_materialisation | platform_observation | manual_observation | matching | cadence_drift_check | backfill | manual_override | adhoc.'),
    ('trigger',               NULL, NULL, NULL, 'CHECK enum: scheduled | manual | rpc | backfill | dependency.'),
    ('started_at',            NULL, NULL, NULL, 'Run start timestamp. NOT NULL; default now().'),
    ('finished_at',           NULL, NULL, NULL, 'Run end timestamp. NULL while status=running; non-null otherwise per recon_run_finished_when_done CHECK.'),
    ('status',                NULL, NULL, NULL, 'CHECK enum: running | succeeded | failed | partial | cancelled. Default running.'),
    ('rows_processed',        NULL, NULL, NULL, 'Total rows scanned by the run.'),
    ('rows_inserted',         NULL, NULL, NULL, 'Rows inserted by the run.'),
    ('rows_updated',          NULL, NULL, NULL, 'Rows updated by the run.'),
    ('rows_skipped',          NULL, NULL, NULL, 'Rows skipped (idempotency / suppression / out-of-window).'),
    ('error_summary',         NULL, NULL, NULL, 'Free-text error description for failed/partial runs.'),
    ('summary_json',          NULL, NULL, NULL, 'Structured run summary jsonb. Generator emits per-client breakdown; matcher emits per-tier breakdown.'),
    ('triggered_by',          NULL, NULL, NULL, 'Username/system label that triggered the run (e.g., pg_cron, manual_rpc, chat).'),
    ('parent_run_id',         'r', 'reconciliation_run', 'reconciliation_run_id', 'Self-FK ON DELETE SET NULL. Backfill runs reference parent ad-hoc runs; child runs reference scheduling parent.')
),
purposes_ep (column_name, fk_schema, fk_table, fk_column, column_purpose) AS (
    VALUES
    ('expected_publication_id', NULL::text, NULL::text, NULL::text, 'Surrogate primary key. One row per (client, platform, expected_local_date, cadence_rule).'),
    ('client_id',               'c', 'client', 'client_id', 'FK to c.client. ON DELETE CASCADE.'),
    ('platform',                NULL, NULL, NULL, 'CHECK enum: facebook | instagram | linkedin | youtube. Excludes website (PRV-0 D-22).'),
    ('cadence_rule_id',         'c', 'client_cadence_rule', 'cadence_rule_id', 'FK to c.client_cadence_rule. ON DELETE RESTRICT — cadence rules cannot be deleted while expected rows reference them.'),
    ('expected_local_date',     NULL, NULL, NULL, 'Sydney-local date the publication was expected on. Computed from r.to_sydney_local_date(expected_window_start).'),
    ('expected_window_start',   NULL, NULL, NULL, 'Earliest moment the publication is considered on-time. Computed from cadence_rule.preferred_local_times + tolerance.'),
    ('expected_window_end',     NULL, NULL, NULL, 'Latest moment the publication is considered on-time. After this, status transitions to late (matcher).'),
    ('expected_format',         NULL, NULL, NULL, 'Tier 4 fuzzy-match hint. Inherited from c.client_cadence_rule.expected_format at generation time.'),
    ('expected_status',         NULL, NULL, NULL, 'CHECK enum: expected | matched | missing | late | unscheduled_published | observed_no_ice | backfilled | suppressed. Default expected. State machine driven by reconciliation-matcher (cc-0010).'),
    ('suppression_reason',      NULL, NULL, NULL, 'Free-text reason populated by generator when expected_status=suppressed. cc-0009 Option B: ''publish_profile_paused: <paused_reason>''.'),
    ('matched_match_id',        NULL, NULL, NULL, 'PRV-0 §3.3 specifies FK to r.reconciliation_match(reconciliation_match_id). cc-0009 declares column without REFERENCES; cc-0010 ALTER TABLE adds FK after r.reconciliation_match exists.'),
    ('matched_at',              NULL, NULL, NULL, 'Timestamp matcher transitioned status to matched. NULL until matched. Required when expected_status=matched per expected_status_match_pair CHECK.'),
    ('notes',                   NULL, NULL, NULL, 'Free-text narrative. Generator populates with cadence-derivation provenance; manual override populates with override reason.'),
    ('created_at',              NULL, NULL, NULL, 'Row creation timestamp. NOT NULL; default now().'),
    ('created_by_run_id',       NULL, NULL, NULL, 'Intended FK to r.reconciliation_run(reconciliation_run_id) — declared as bare uuid in cc-0009; FK enforcement deferred (PRV-0 §3.3 leaves unconstrained).'),
    ('updated_at',              NULL, NULL, NULL, 'Last-modified timestamp. NOT NULL; default now().'),
    ('updated_by_run_id',       NULL, NULL, NULL, 'Intended FK to r.reconciliation_run(reconciliation_run_id) — same handling as created_by_run_id.')
)
INSERT INTO k.column_registry (
    table_id, column_name, ordinal_position, data_type, udt_name,
    is_nullable, column_default,
    is_foreign_key, fk_ref_schema, fk_ref_table, fk_ref_column,
    column_purpose, pii_risk
)
SELECT t_rr.table_id, c.column_name, c.ordinal_position, c.data_type, c.udt_name,
       c.is_nullable, c.column_default,
       (p.fk_schema IS NOT NULL), p.fk_schema, p.fk_table, p.fk_column,
       p.column_purpose, 'none'
FROM cols_rr c
JOIN purposes_rr p USING (column_name)
CROSS JOIN t_rr
UNION ALL
SELECT t_ep.table_id, c.column_name, c.ordinal_position, c.data_type, c.udt_name,
       c.is_nullable, c.column_default,
       (p.fk_schema IS NOT NULL), p.fk_schema, p.fk_table, p.fk_column,
       p.column_purpose, 'none'
FROM cols_ep c
JOIN purposes_ep p USING (column_name)
CROSS JOIN t_ep
ON CONFLICT (table_id, column_name) DO UPDATE SET
    column_purpose  = EXCLUDED.column_purpose,
    is_foreign_key  = EXCLUDED.is_foreign_key,
    fk_ref_schema   = EXCLUDED.fk_ref_schema,
    fk_ref_table    = EXCLUDED.fk_ref_table,
    fk_ref_column   = EXCLUDED.fk_ref_column,
    pii_risk        = EXCLUDED.pii_risk,
    updated_at      = now();
```

**Expected `is_foreign_key=true` distribution post-Stage A:**
- `r.reconciliation_run`: 1 row (`parent_run_id` self-FK).
- `r.expected_publication`: 2 rows (`client_id`, `cadence_rule_id`). NOTE: `matched_match_id` is `is_foreign_key=false` in cc-0009 (FK deferred to cc-0010). cc-0010 brief MUST UPDATE this row to `is_foreign_key=true` after ALTER TABLE.

---

## §4. Stage B+C — `cadence-rule-generator` Edge Function

### 4.1 EF responsibilities (PRV-0 §5.1 v2 contract)

- Read `c.client_cadence_rule` rules where `is_active=true AND (valid_to IS NULL OR valid_to >= current_date)`.
- For each rule: compute `horizon_dates` = (current_date − backfill_days)..(current_date + horizon_days), filtered by `weekdays` set + excluded by `suppression_dates`.
- For each (rule × date): read paired `c.client_publish_profile.publish_enabled` + `paused_reason`.
- **Option B (this brief lock):** if `publish_enabled=false` → INSERT `expected_status='suppressed'` row with `suppression_reason='publish_profile_paused: <paused_reason>'`.
- Otherwise: INSERT `expected_status='expected'` row.
- Window computation per row: for each `time t` in `preferred_local_times[]`:
  - `expected_window_start` = (date AT TIME ZONE 'Australia/Sydney') + t
  - `expected_window_end` = `expected_window_start` + (matcher_config.minutes_late_tolerance × interval '1 minute'); cc-0009 reads global default `minutes_late_tolerance=60` from PRV-0 §6.3 (note: `r.matcher_config` is cc-0010; cc-0009 hardcodes 60 fallback in EF code with comment pointing to cc-0010 read source).
- INSERT ... ON CONFLICT (client_id, platform, expected_local_date, cadence_rule_id) DO NOTHING — idempotent re-runs.
- Wrap entire EF body in `r.reconciliation_run` audit row: insert at start (`status='running'`), update at end (`status='succeeded'|'failed'`, `summary_json={...}`).

### 4.2 EF source structure (CC writes per Stage B sub-brief)

```
supabase/functions/cadence-rule-generator/
├── index.ts                     # main handler: HTTP POST -> run generator
└── (no separate sub-files needed; pattern matches existing single-file workers)
```

Key TypeScript components (not full code — chat fires Stage-B D-01 on CC's actual diff):
- `Deno.serve` HTTP handler accepts POST with optional body `{horizon_days?: number, backfill_days?: number, triggered_by?: string}`.
- Defaults: `horizon_days=7`, `backfill_days=7` (matches D-23 14-day total).
- Supabase client: `service_role` JWT from env `SUPABASE_SERVICE_ROLE_KEY`.
- Auth: cron calls with `x-cron-secret` header; EF compares against `Deno.env.get('CRON_SECRET')`. Returns 401 if mismatch (memory standing rule on F-CRON-AUTO-APPROVER-SECRET-INLINE: secrets via env, not inline cron command).
- Reads: 1 query for cadence rules (~14 rows), 1 query for publish profiles (~14 rows), 1 query per (rule × dates batch) for existing expected rows (idempotency).
- Writes: 1 INSERT into `r.reconciliation_run`; N INSERTs into `r.expected_publication` (UPSERT-style).
- Error handling: per-rule try/catch; `r.reconciliation_run.status='partial'` if any rule fails but others succeed.
- Logging: console.log per stage; final summary_json includes `{rules_processed, dates_per_rule_avg, rows_inserted, rows_skipped_suppressed, rows_skipped_existing, errors:[]}`.

### 4.3 `supabase/config.toml` amendment

CC adds (alphabetised among existing function entries):

```toml
[functions.cadence-rule-generator]
verify_jwt = false
```

Durable source-of-truth per F-EF-DRIFT-PREVENTION (Stage 3 closure v2.49). Without this entry, future redeploys may regress to `verify_jwt=true` (v2.54 lesson).

### 4.4 Stage C deploy command (CC executes manually per memory standing rule)

```powershell
cd C:\Users\parve\Invegent-content-engine
supabase functions deploy cadence-rule-generator --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns
```

`--no-verify-jwt` flag is belt-and-braces alongside config.toml (v2.54 lesson — config.toml alone has been observed to regress in past deploys).

### 4.5 Stage C deploy verification

Via Supabase MCP `get_edge_function`:

```
get_edge_function(slug='cadence-rule-generator')
  → expect: status='ACTIVE', verify_jwt=false, version=1, deployed_at within last 5 min
```

Follow with manual probe (no body, expect 401 due to missing x-cron-secret) to confirm deploy reachable.

---

## §5. Stage D — pg_cron schedule + §6 — Stage E first invocation

### 5.1 (Stage D) `apply_migration cc_0009_pg_cron_cadence_generator`

Locked at apply time per §1.10 collision-avoidance (default `5 16 * * *` AEST = 02:05 Sydney; `5 15 * * *` AEDT for Oct–Apr). Brief author's recommendation: schedule at 02:05 Sydney to avoid unspecified 02:00 Sydney collision until §1.10 pre-flight confirms.

```sql
SELECT cron.schedule(
    'cadence_rule_generator_daily',
    '5 16 * * *',                                        -- AEST 02:05 Sydney = 16:05 UTC; PK confirms at Stage D D-01
    $$
    SELECT net.http_post(
        url := 'https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/cadence-rule-generator',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', current_setting('app.settings.cron_secret', true)
        ),
        body := jsonb_build_object(
            'horizon_days', 7,
            'backfill_days', 0,                          -- daily run forward-only; first invocation Stage E does the 7-day backfill
            'triggered_by', 'pg_cron_cadence_rule_generator_daily'
        ),
        timeout_milliseconds := 30000                    -- F-CRON-PG-NET-TIMEOUT-30S closure v2.57 standard
    );
    $$
);
```

**NOTE on `app.settings.cron_secret`:** memory standing rule references vault for secrets. Stage D apply may need a one-line precursor `ALTER DATABASE postgres SET app.settings.cron_secret = '<value>'` IF this pattern is not already in use. §1.10 pre-flight verifies pattern by reading existing cron commands.

**Alternative pattern (if `app.settings.cron_secret` is NOT in use):** read secret from `vault.secrets` via inline lookup. Stage D D-01 packet captures the actual pattern selected.

### 5.2 (Stage E) First on-demand backfill invocation

Via `execute_sql` (RPC-style; not DDL):

```sql
SELECT net.http_post(
    url := 'https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/cadence-rule-generator',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', '<chat reads from vault>'
    ),
    body := jsonb_build_object(
        'horizon_days', 7,
        'backfill_days', 7,
        'triggered_by', 'cc-0009-stage-e-first-backfill'
    ),
    timeout_milliseconds := 30000
) AS request_id;
```

This is the FIRST execution producing rows. Backfill window: today − 7 days to today + 7 days (D-23 lock, 14-day initial horizon).

**Expected Stage E output:**
- 1 new `r.reconciliation_run` row, `run_type='backfill'`, `trigger='manual'`, `status='succeeded'`, `triggered_by='cc-0009-stage-e-first-backfill'`.
- ~94–98 new `r.expected_publication` rows. Math: 14 cadence rules × ~10 weekdays in 14-day Mon-Fri window = ~140 (rule, date) pairs. Subtract weekend dates already excluded by weekdays filter (already accounted). Subtract suppressed = 2 paused-IG × ~10 weekdays = 20 → 20 rows are `expected_status='suppressed'`. Active rows: ~120 are `expected_status='expected'`. **Stage E V-checks confirm exact counts.**

Note on row math: 14-day backfill window = 14 calendar days; weekdays-only filter on cadence rule retains ~10 weekdays (depending on which days fall in window). Stage E V-check computes exact expected per-rule dates from `r.to_sydney_local_date(now())` minus 7 to plus 7 → enumerate weekdays.

---

## §6. Verification queries (V1–V12, post-each-stage)

All relevant V-checks to run via Supabase MCP `execute_sql` (read-only) within ~60s of each stage's apply completion. Tagged by stage.

### V1 — (Stage A) Schema + extensions + grants

```sql
SELECT
  EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='r') AS schema_r_exists,
  has_schema_privilege('service_role', 'r', 'USAGE') AS service_role_usage,
  has_schema_privilege('anon', 'r', 'USAGE') AS anon_usage,
  has_schema_privilege('authenticator', 'r', 'USAGE') AS auth_usage;
```

**Pass:** all true.

### V2 — (Stage A) Tables exist with expected shape

```sql
-- V2a: existence + column counts
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='reconciliation_run') AS rr_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='expected_publication') AS ep_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='r' AND table_name='reconciliation_run') AS rr_col_count,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='r' AND table_name='expected_publication') AS ep_col_count;

-- V2b: CHECK + FK constraints per table
SELECT t.relname, con.conname, con.contype, pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con
JOIN pg_class t ON t.oid = con.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='r' AND t.relname IN ('reconciliation_run', 'expected_publication')
  AND con.contype IN ('c', 'f', 'u', 'p')
ORDER BY t.relname, con.contype, con.conname;

-- V2c: indexes
SELECT t.relname AS table_name, i.relname AS index_name, pg_get_indexdef(idx.indexrelid) AS def
FROM pg_index idx
JOIN pg_class i ON i.oid = idx.indexrelid
JOIN pg_class t ON t.oid = idx.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='r' AND t.relname IN ('reconciliation_run', 'expected_publication')
ORDER BY t.relname, i.relname;
```

**Pass:**
- V2a: rr_exists=true, ep_exists=true, rr_col_count=14, ep_col_count=17.
- V2b: r.reconciliation_run = 2 CHECK (run_type IN, trigger IN, status IN inline + recon_run_finished_when_done named) — actually 4 CHECK total (run_type, trigger, status inline + named); 1 PK + 1 self-FK. r.expected_publication = 3 CHECK (platform IN, expected_status IN inline + expected_window_valid + expected_status_match_pair named) = 4 CHECK total; 1 PK + 1 UNIQUE + 2 FK (client_id, cadence_rule_id). Note: matched_match_id has NO FK in cc-0009 (deferred to cc-0010).
- V2c: ≥ 5 indexes (PK on rr, recon_run_type_recent, recon_run_status_failed, PK on ep, expected_publication_client_platform_date, expected_publication_status_open, plus UNIQUE constraint indexes).

### V3 — (Stage A) Helper functions exist with expected signatures

```sql
SELECT routine_schema, routine_name, data_type AS return_type,
       (SELECT array_agg(parameter_name || ':' || data_type ORDER BY ordinal_position)
        FROM information_schema.parameters p
        WHERE p.specific_name = r.specific_name) AS params
FROM information_schema.routines r
WHERE routine_schema='r' AND routine_name IN ('normalise_text', 'to_sydney_local_date');
```

**Pass:** 2 rows; `r.normalise_text(input:text) → text`; `r.to_sydney_local_date(ts:timestamp with time zone) → date`.

### V4 — (Stage A) Helper functions empirical correctness

```sql
SELECT
  r.normalise_text('Check this https://example.com @user #tag 🚀 Out!') AS norm_test,
  r.to_sydney_local_date(now()) AS today_sydney,
  r.to_sydney_local_date('2026-05-09 23:30:00+00'::timestamptz) AS test_utc_to_syd,
  -- Edge cases:
  r.normalise_text(NULL) AS norm_null,
  r.normalise_text('') AS norm_empty,
  r.normalise_text('Multiple    spaces') AS norm_spaces;
```

**Pass:**
- `norm_test = 'check this [URL] out!'` (lowercase, URL replaced, mention stripped, hashtag stripped, emoji stripped, whitespace collapsed).
- `today_sydney` = current Sydney local date (compare against PK's clock-time observation at apply ± 1 day for tz boundary tolerance).
- `test_utc_to_syd`: 23:30 UTC on 2026-05-09 = 09:30 Sydney AEST on 2026-05-10 → result = `2026-05-10`.
- `norm_null = NULL`.
- `norm_empty = ''`.
- `norm_spaces = 'multiple spaces'` (single space).

### V5 — (Stage A) `k.table_registry` final state via UPSERT (L35 verification)

```sql
SELECT schema_name, table_name, table_kind, status, allowed_ops, pii_risk,
       LEFT(purpose, 60) AS purpose_preview,
       owner, source_system, refresh_method, refresh_cadence,
       (primary_use_cases IS NOT NULL) AS has_use_cases,
       (join_keys IS NOT NULL) AS has_join_keys,
       (rules_summary IS NOT NULL) AS has_rules,
       (advisory IS NOT NULL) AS has_advisory
FROM k.table_registry
WHERE schema_name='r' AND table_name IN ('reconciliation_run', 'expected_publication')
ORDER BY table_name;
```

**Pass:** 2 rows. Both `status='active'`, `allowed_ops='upsert'` (UPDATEd from default 'read-only' — proves ON CONFLICT DO UPDATE executed), `pii_risk='none'`, `owner='invegent'`, `source_system='manual'`, `refresh_method='manual_upsert'`, `refresh_cadence='on_change'`. All 4 boolean has_* = true. `purpose` populated with rich text from §3.5 (NOT 'auto-registered').

### V6 — (Stage A) `k.column_registry` final state via UPSERT

```sql
SELECT tr.table_name,
       COUNT(*) AS column_rows,
       COUNT(*) FILTER (WHERE cr.column_purpose IS NOT NULL) AS purposes_populated,
       COUNT(*) FILTER (WHERE cr.is_foreign_key) AS fk_columns,
       array_agg(cr.column_name ORDER BY cr.ordinal_position) FILTER (WHERE cr.is_foreign_key) AS fk_column_names
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name='r' AND tr.table_name IN ('reconciliation_run', 'expected_publication')
GROUP BY tr.table_name
ORDER BY tr.table_name;
```

**Pass:**
- `r.expected_publication`: column_rows=17, purposes_populated=17, fk_columns=2, fk_column_names = ARRAY['client_id','cadence_rule_id']. (matched_match_id is_foreign_key=false in cc-0009; cc-0010 brief MUST UPDATE this row when ALTER TABLE adds the FK.)
- `r.reconciliation_run`: column_rows=14, purposes_populated=14, fk_columns=1, fk_column_names = ARRAY['parent_run_id'].

### V7 — (Stage A) No NULL violations

```sql
-- Both tables empty post-Stage A; this V passes trivially. Re-run after Stage E to verify generator output integrity.
SELECT 'r.reconciliation_run' AS table_name, COUNT(*) AS row_count FROM r.reconciliation_run
UNION ALL
SELECT 'r.expected_publication', COUNT(*) FROM r.expected_publication;
```

**Pass (Stage A):** both row_count = 0. **Pass (Stage E):** rr ≥ 1, ep ≥ ~94 (rolling V-check below).

### V8 — (Stage B + C) EF deploy verification

Via Supabase MCP `get_edge_function(slug='cadence-rule-generator')`:

**Pass:**
- `status = 'ACTIVE'`
- `verify_jwt = false`
- `version = 1` (first deploy)
- `deployed_at` within last 5 min of Stage C completion

Manual probe (curl/wget):
```bash
curl -X POST 'https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/cadence-rule-generator' \
  -H 'Content-Type: application/json' -d '{}'
# expect 401 due to missing x-cron-secret header
```

### V9 — (Stage D) Cron job created with expected shape

```sql
SELECT jobid, jobname, schedule, command, active, nodename, database, username
FROM cron.job
WHERE jobname = 'cadence_rule_generator_daily';

-- Verify command matches §5.1 expected
SELECT command FROM cron.job WHERE jobname = 'cadence_rule_generator_daily';
```

**Pass:**
- 1 row, `active=true`, `schedule` matches Stage D D-01 lock (default `5 16 * * *`).
- `command` contains `net.http_post`, EF URL, `timeout_milliseconds := 30000`, `'horizon_days', 7`, `'backfill_days', 0`.

### V10 — (Stage E) First backfill row counts

```sql
-- V10a: r.reconciliation_run row
SELECT reconciliation_run_id, run_type, trigger, status,
       rows_processed, rows_inserted, rows_skipped,
       finished_at - started_at AS duration,
       triggered_by
FROM r.reconciliation_run
WHERE triggered_by = 'cc-0009-stage-e-first-backfill';

-- V10b: r.expected_publication breakdown
SELECT cli.client_slug, ep.platform, ep.expected_status, COUNT(*) AS rows
FROM r.expected_publication ep
JOIN c.client cli ON cli.client_id = ep.client_id
GROUP BY cli.client_slug, ep.platform, ep.expected_status
ORDER BY cli.client_slug, ep.platform, ep.expected_status;

-- V10c: total rows by status
SELECT expected_status, COUNT(*) AS rows
FROM r.expected_publication
GROUP BY expected_status
ORDER BY expected_status;
```

**Pass:**
- V10a: 1 row, `run_type='backfill'`, `trigger='manual'`, `status='succeeded'`, duration < 30s, `rows_inserted` matches expected math (~120 active + ~20 suppressed = ~140 total; brief locks tolerance ±10 for weekday boundary edge cases).
- V10b: per (client × platform) breakdown matches cc-0008 seed: 12 active pairs × ~10 weekdays = ~120 expected; 2 paused-IG pairs × ~10 weekdays = ~20 suppressed.
- V10c: `expected ≈ 120`, `suppressed ≈ 20`, `matched=0`, `missing=0`, `late=0`.

### V11 — (Stage E) Window math correctness

```sql
SELECT cli.client_slug, ep.platform, ep.expected_local_date,
       ep.expected_window_start AT TIME ZONE 'Australia/Sydney' AS window_start_syd,
       ep.expected_window_end AT TIME ZONE 'Australia/Sydney' AS window_end_syd,
       (ep.expected_window_end - ep.expected_window_start) AS window_duration,
       ccr.preferred_local_times[1] AS rule_time
FROM r.expected_publication ep
JOIN c.client cli ON cli.client_id = ep.client_id
JOIN c.client_cadence_rule ccr ON ccr.cadence_rule_id = ep.cadence_rule_id
ORDER BY cli.client_slug, ep.platform, ep.expected_local_date
LIMIT 14;
```

**Pass:** for each row, `window_start_syd::time` = `rule_time` exactly; `window_duration = interval '60 minutes'` (matches matcher_config global default); `expected_local_date = window_start_syd::date`.

### V12 — (Stage E) Suppression correctness (Option B)

```sql
SELECT cli.client_slug, ep.platform, ep.expected_status, ep.suppression_reason
FROM r.expected_publication ep
JOIN c.client cli ON cli.client_id = ep.client_id
WHERE ep.expected_status = 'suppressed'
ORDER BY cli.client_slug, ep.platform, ep.expected_local_date
LIMIT 20;
```

**Pass:** all rows are NDIS-Yarns × IG OR Property Pulse × IG (the 2 paused-IG pairs from cc-0008 seed). `suppression_reason ILIKE 'publish_profile_paused: meta_subcode_2207051%'` on every row. No other (client × platform) appears as `suppressed`.

---

## §7. Risk articulation per stage (PK directive 6.2)

| Stage | Specific risks at this stage | Mitigation |
|---|---|---|
| **A** | (1) Trigger collision recurrence if §1.6 fails. (2) Cross-table FK to `r.reconciliation_match` would block CREATE — addressed by §2.3 deferred FK. (3) Helper function syntax error fails entire transaction. | §1.6+§1.7 re-survey ~60s pre-apply; §3.5+§3.6 ON CONFLICT DO UPDATE; helpers verbatim from PRV-0 §4.1+§4.2; V4 validates empirically. |
| **B** | (1) CC writes EF that doesn't compile (Deno/TypeScript). (2) `supabase/config.toml` mis-formed. (3) Auth pattern mismatch with existing crons (x-cron-secret vs Authorization Bearer JWT). (4) Service role key not in env. | Stage B D-01 fires AFTER CC pushes; chat reviews diff. Existing cron pattern survey at §1.10 informs auth. v2.58 ai-worker-401 lesson recall for JWT format. |
| **C** | (1) Deploy succeeds but verify_jwt regresses to true. (2) EF endpoint unreachable post-deploy. (3) Function start-up exceeds 250ms cold-start tolerance. | `--no-verify-jwt` flag + config.toml entry; V8 manual probe; cold-start out of scope (low complexity EF). |
| **D** | (1) Cron schedule UTC vs Sydney mismatch. (2) Collision with existing 02:00 Sydney job. (3) `pg_net` extension missing or x-cron-secret env not set on Postgres role. (4) `timeout_milliseconds < 30000` regression. | §1.10 collision survey; default `5 16 * * *` AEST (02:05 Sydney) with PK confirm at Stage D D-01; F-CRON-PG-NET-TIMEOUT-30S standard hardcoded. |
| **E** | (1) Backfill produces wrong row count (off-by-one in date math). (2) Sydney/UTC boundary sends wrong expected_local_date for early-morning runs. (3) Suppression detection wrong for paused IG. (4) EF crashes mid-run, leaves partial state. | V10/V11/V12 explicit checks; backfill is on-demand at PK-chosen hour for tz boundary safety; per-rule try/catch in EF code yields `status='partial'` not lost runs. |

---

## §8. D-01 packet contents (5 fires; ALL pending)

### Stage A D-01 — `sql_destructive` (DDL + DML)

```
decision_under_review: Apply cc-0009 Stage A: CREATE SCHEMA r + grants +
  CREATE TABLE r.reconciliation_run + CREATE TABLE r.expected_publication
  + CREATE FUNCTION r.normalise_text + CREATE FUNCTION r.to_sydney_local_date
  + UPSERT k.table_registry (2 rows) + UPSERT k.column_registry (~31 rows)
  in single apply_migration cc_0009_r_schema_and_helpers.
production_action_if_approved: One Supabase MCP apply_migration call;
  trigger trg_k_registry_sync_on_create_table will fire 2x at
  ddl_command_end (one per CREATE TABLE) and auto-INSERT stub k.* rows;
  brief's ON CONFLICT DO UPDATE upgrades stubs in-place (L35).
consequence_if_delayed: cc-0009 Stages B-E cannot proceed; PRV-1 stalls.
cost_of_waiting: Low.
current_evidence: PRV-0 v2 §3.1+§3.3+§3.8+§4.1+§4.2 verbatim;
  cc-0008 v5 §1.13 confirmed r schema pre-registered;
  L33+L34+L35 reified in this brief's §1.6+§3.5+§3.6.
known_weak_evidence: matched_match_id FK to r.reconciliation_match
  deferred to cc-0010 ALTER TABLE (PRV-0 §3.3 deviation; documented);
  Stage A is largest single transaction in PRV-1 build sequence.
default_action: proceed if D-01 returns clean agree AND PK explicit
  approval phrase received AND §1.1-§1.7 final re-verify within ~60s
  shows no drift.
```

### Stage B D-01 — `code_review` (CC patch review)

```
decision_under_review: Approve CC's cadence-rule-generator EF source
  + supabase/config.toml amendment as committed by CC (commit SHA TBD).
production_action_if_approved: Stage C deploys this committed source.
consequence_if_delayed: Stage C blocked.
cost_of_waiting: Low.
current_evidence: §4.1 EF spec; PRV-0 §5.1 contract; existing cron EF
  patterns from F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT closure;
  v2.54 verify_jwt regression precedent.
known_weak_evidence: First reconciliation EF; pattern not yet proven
  in production for r.* schema reads/writes.
default_action: proceed if D-01 returns clean agree on diff +
  PK approval phrase.
```

### Stage C D-01 — `production_deploy` (EF deploy)

```
decision_under_review: CC executes supabase functions deploy
  cadence-rule-generator --no-verify-jwt against project mbkmaxqhsohbtwsqolns.
production_action_if_approved: New EF live; reachable at
  /functions/v1/cadence-rule-generator; verify_jwt=false.
consequence_if_delayed: Stage D cron has nothing to call.
cost_of_waiting: Low.
current_evidence: Stage B D-01 closed clean; commit SHA captured;
  --no-verify-jwt flag + config.toml redundancy per v2.54.
known_weak_evidence: First-version deploy can fail on cold-start syntax;
  V8 manual probe is post-deploy gate.
default_action: proceed if Stage B closed AND PK approval phrase.
```

### Stage D D-01 — `sql_destructive` (cron schedule)

```
decision_under_review: Apply cc-0009 Stage D: cron.schedule
  cadence_rule_generator_daily at <5 16 * * * AEST OR locked time per
  §1.10 collision result> calling deployed EF via net.http_post with
  timeout_milliseconds=30000 + x-cron-secret header.
production_action_if_approved: New cron.job row; daily auto-invocation
  at locked Sydney clock-time.
consequence_if_delayed: Stage E first backfill possible without cron;
  daily updates won't auto-fire.
cost_of_waiting: Medium (Stage E covers initial state; daily-update
  delay is acceptable for short windows).
current_evidence: §1.10 cron survey result; F-CRON-PG-NET-TIMEOUT-30S
  standard; V8 EF reachable confirmed.
known_weak_evidence: Sydney/UTC mapping depends on AEST/AEDT phase;
  brief locks AEST since 2026-05-10 is firmly AEST.
default_action: proceed if Stage C closed AND PK approval phrase.
```

### Stage E D-01 — `production_invocation` (RPC call producing rows)

```
decision_under_review: Invoke cadence-rule-generator EF on-demand with
  horizon_days=7 + backfill_days=7 producing first ~140 r.expected_publication
  rows + 1 r.reconciliation_run audit row.
production_action_if_approved: One execute_sql net.http_post call;
  EF runs synchronously; rows inserted into r.* tables.
consequence_if_delayed: cc-0009 closure delayed; PRV-1 has no produced rows.
cost_of_waiting: Low.
current_evidence: Stages A-D all closed clean; V8+V9 confirmed deploy +
  cron live; §1.12 confirms tables empty; backfill math expected ~120
  active + ~20 suppressed = ~140.
known_weak_evidence: First production write to r.* tables; row math
  has weekday-boundary edge cases (Sydney/UTC tz).
default_action: proceed if Stages A-D closed AND PK approval phrase
  AND §1.12 final re-verify shows tables still empty.
```

---

## §9. Rollback / no-op / halt logic

### 9.1 NO-OP paths

- §1.1 reveals `schema_r_exists=true` → HALT (§9.2.a). Investigate prior cc-0009 Stage A apply.
- §1.3 reveals cc-0008 seed not 14 rows → HALT (§9.2.c). cc-0008 closure regressed.
- §1.5 reveals migration name already used → HALT (§9.2.d).
- §1.8 reveals cadence-rule-generator already deployed → HALT (§9.2.g).
- §1.11 reveals `cadence_rule_generator_daily` cron job exists → HALT (§9.2.h).
- §1.12 reveals tables non-empty → HALT (§9.2.i).

Document any no-op outcome in result file.

### 9.2 HALT paths

- **9.2.a** Schema `r` already exists at Stage A.
- **9.2.b** `r` not in `k.schema_registry` OR status != active.
- **9.2.c** cc-0008 seed regressed (count != 14, or cc-0008-chat-seed signature missing).
- **9.2.d** Migration name `cc_0009_r_schema_and_helpers` OR `cc_0009_pg_cron_cadence_generator` already in `supabase_migrations.schema_migrations`.
- **9.2.e** Event trigger config drift since cc-0008 v5 §1.12 capture.
- **9.2.f** k.* UNIQUE constraint drift since cc-0008 v5 §1.13 capture.
- **9.2.g** EF `cadence-rule-generator` already deployed.
- **9.2.h** cron job `cadence_rule_generator_daily` already exists.
- **9.2.i** Stage E pre-flight reveals `r.expected_publication` or `r.reconciliation_run` non-empty (prior partial backfill).
- **9.2.j** PRV-0 v2 §3.1/§3.3/§3.8/§4.1/§4.2/§5.1 deviation required by pre-flight constraint.
- **9.2.k** Sequencing violation attempted: any out-of-order Stage apply (e.g., Stage D before Stage C deploy V8 PASS).
- **9.2.l** PK seed/EF/cron/invocation review rejection at any stage's D-01 review.

### 9.3 ROLLBACK paths

**Stage A rollback** (V1–V7 fail post-Stage A):

```sql
-- Single apply_migration cc_0009_rollback_stage_a
-- Order matters: drop tables before functions; drop k.* before drop schema (to prevent cascade orphans)

DELETE FROM k.table_registry
WHERE schema_name='r' AND table_name IN ('reconciliation_run', 'expected_publication');
-- k.column_registry rows auto-cascade via FK ON DELETE CASCADE

DROP TABLE IF EXISTS r.expected_publication CASCADE;
DROP TABLE IF EXISTS r.reconciliation_run CASCADE;
DROP FUNCTION IF EXISTS r.normalise_text(text);
DROP FUNCTION IF EXISTS r.to_sydney_local_date(timestamptz);
DROP SCHEMA IF EXISTS r CASCADE;
```

**Stage B/C rollback** (V8 fails or EF deploy regression):

```
# CC executes:
cd C:\Users\parve\Invegent-content-engine
supabase functions delete cadence-rule-generator --project-ref mbkmaxqhsohbtwsqolns

# Then CC reverts the supabase/functions/cadence-rule-generator/ dir + config.toml entry:
git revert <Stage B commit SHA>
git push origin main
```

**Stage D rollback** (V9 fails or cron command malformed):

```sql
SELECT cron.unschedule('cadence_rule_generator_daily');
```

**Stage E rollback** (V10/V11/V12 fail post-invocation):

```sql
-- Option 1 (preferred): leave audit row, mark partial; let cc-0010 build atop
UPDATE r.reconciliation_run
SET status = 'partial',
    error_summary = 'cc-0009 Stage E V-checks failed: <details>',
    finished_at = COALESCE(finished_at, now())
WHERE triggered_by = 'cc-0009-stage-e-first-backfill' AND status = 'succeeded';

-- Option 2 (only if data semantically corrupt): truncate r.expected_publication
-- DELETE FROM r.expected_publication WHERE created_by_run_id = '<run_id>';
-- chat does NOT issue option 2 without explicit PK approval
```

Document failure mode + diagnosis in result file. PK escalation; cc-0009 v2 brief on substantive issue.

---

## §10. Result-file convention

**Path:** `docs/briefs/results/cc-0009-r-schema-and-cadence-rule-generator.md`

**Standard sections (one composite file across 5 stages):**

1. **Header** — brief reference (cc-0009 v1), apply session date(s), executor mix, 5 D-01 verdicts captured, PK approval phrases captured per stage, outcome summary, brief version applied.
2. **Stage-by-stage apply summary** — one table row per stage A-E with: planned action, actual action, project, method, result, V-check status, rollback fired (yes/no), §9 path triggered (or NONE).
3. **Pre-flight + final re-verification** — table per §1.x: initial value (brief authoring) → ~60s-pre-apply value → drift status (PASS/FAIL).
4. **Stage A applied DDL** — exact CREATE statements + helper function bodies; UPSERT row counts (2 + ~31 = ~33 final state).
5. **Stage B + C delivered** — CC commit SHA for source + config.toml; EF deploy version + verify_jwt + manual probe result.
6. **Stage D applied** — cron.schedule call result; jobid; final UTC schedule; first auto-invocation due timestamp.
7. **Stage E executed** — request_id from net.http_post; r.reconciliation_run row id; r.expected_publication row count breakdown.
8. **Verification (V1–V12)** — status table per V; row counts where applicable.
9. **D-01 records** — 5 m.chatgpt_review row ids; verdicts; conditions; PK approval phrases; close-the-loop UPDATEs (status='resolved', resolved_by='cc-0009-stage-{a,b,c,d,e}-{action}-2026-05-XX').
10. **Hold-state assertions** — STANDING_THREE EFs untouched; no other r.* tables created; no other reconciliation EFs deployed; no cc-0010+ work; no Phase 0 scheduling.
11. **Open / next** — cc-0010 readiness gate (r.* second-wave tables + matcher EF; matched_match_id FK ALTER TABLE re-add); flag any seed-vs-runtime divergences observed; flag any new findings.
12. **New brief-runner-v0 patterns observed** — capture any new lessons (likely candidate cc-0009 lesson L37: multi-stage cc-NNNN brief authoring pattern; L38 if discovered: cross-brief FK deferral pattern).

---

## §11. Stop condition

FOR EACH STAGE A through E (in order, no skip):

1. §1 pre-flight relevant sub-checks all PASS (no HALT triggered).
2. PK seed/EF/cron/invocation review COMPLETE for the stage.
3. NEW Stage-X §8 D-01 fire returns clean agree; reviewer's notes match stage scope; substantive pushback resolved or PK Lesson #62 type-(c) state-capture override applied.
4. Final read-only re-verification confirms no drift (~60s pre-apply).
5. §3 (Stage A) / §4.4 (Stage C) / §5.1 (Stage D) / §5.2 (Stage E) action completes (single transactional unit / single deploy / single cron / single net.http_post).
6. §6 verification subset for the stage all PASS.
7. Close-the-loop UPDATE on m.chatgpt_review for the stage's D-01 row (status='resolved').

FOR FINAL CLOSURE (after Stage E):

8. Result file `docs/briefs/results/cc-0009-r-schema-and-cadence-rule-generator.md` committed.
9. PRV-1 cc-0009 closure documented in 4-way sync close (sync_state pointer + per-session file + action_list version bump + dashboard PHASES update if scope permits).
10. cc-0010 readiness signal logged for next session pickup with explicit cc-0010-brief-decision flags: (a) FK ALTER TABLE re-add pattern + cross-brief FK deferral lesson; (b) k.column_registry update for matched_match_id is_foreign_key=true; (c) all other r.* tables sequenced.

If any of §9.1, §9.2.{a-l}, or §9.3 paths trigger at any stage: report and stop. Subsequent stages cannot fire until the failed stage is closed clean (rollback + new vN+1 brief if substantive).

---

## §12. Notes

This is the **ninth cc-NNNN brief** and the **first multi-stage brief in PRV-1**. Earlier briefs were single-action (cc-0001..cc-0007) or DDL+seed-only (cc-0008).

### Brief-runner-v0 watch items specific to cc-0009 v1

1. **First multi-stage cc-NNNN brief** — 5 D-01 fires, 5 PK approval phrases, 5 close-the-loop UPDATEs across A-E. Lesson candidate **L37** at closure.
2. **First cross-brief FK deferral** (`matched_match_id` to cc-0010 ALTER TABLE). Lesson candidate **L38**.
3. **First reconciliation EF deploy** (cadence-rule-generator). cc-0010 will deploy 2 more EFs (ice-evidence-materialiser + reconciliation-matcher); cc-0011 deploys 1 more (cadence-drift-checker); PRV-2/3/4 deploy 4 more (per-platform observers). Pattern proven here.
4. **First on-demand backfill** producing rows in `r.*`. Tests v2.57 timeout standard + v2.58 JWT format + v2.54 verify_jwt durability simultaneously.
5. **First brief running both helper-function CREATE and table CREATE in one transaction** — function + table dependency ordering not currently relevant (helpers are referenced by EF code, not by table DDL).
6. **Two-table k.* registry UPSERT in single CTE-driven INSERT** — extension of cc-0008 v5 single-table pattern.
7. **Stage gate discipline** — sequential gates ensure no skip; PK can revoke approval at any stage's D-01 without compromising prior stages.
8. **Trigger-aware UPSERT pattern carries forward verbatim from cc-0008 v5** (L35 reified; not re-litigated).

### Open dependencies for the apply session(s)

1. cc-0008 seed integrity (verified at §1.3 each apply gate).
2. CC availability for Stages B + C (TypeScript EF source + manual deploy from PowerShell).
3. PK availability for 5 approval phrases (one per stage) — likely span 1-3 sessions depending on cadence.
4. PRV-0 v2 design lock unchanged (commit `6e989517` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7`) — chat re-confirms at Stage A pre-flight.
5. CRON_SECRET env var configured on EF runtime + `app.settings.cron_secret` (or vault) accessible from Postgres role used by pg_cron.
6. Sydney clock-time at Stage A apply: brief-author recommends apply during AEST (firmly through October 2026); AEDT crossover not relevant for cc-0009 timeline.

### Sequencing reminders (PK directives 2026-05-10)

cc-0009 v1 must NOT (until each stage's gate clears):
- Apply any DDL.
- Deploy the EF.
- Schedule the cron.
- Invoke the EF.
- Mutate `m.chatgpt_review`.
- Touch any out-of-scope table (r.ice_publication_evidence, r.platform_observation, r.reconciliation_match, r.cadence_drift_log, etc).
- Author cc-0010 / cc-0011 briefs in this turn.
- Address F-CRON-AUTO-APPROVER-SECRET-INLINE.
- Address 5 prior outstanding `m.chatgpt_review` close-the-loop carries.

Violation of any sequencing rule → HALT immediately + report to PK.

---

*Brief authored 2026-05-10 Sydney by chat (Claude). Planning + documentation only per PK directive 2026-05-10. v1 inputs: PRV-0 v2 design lock §3.1+§3.3+§3.8+§3.12+§4.1+§4.2+§5.1+§8.2+§11.4; cc-0008 v5 brief structure + L33+L34+L35+L36 lessons; F-CRON-PG-NET-TIMEOUT-30S + F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT + verify_jwt durability lessons. v1 output: 5-stage gated build plan; Option B paused-profile suppression locked per PK directive 2026-05-10; cross-brief FK deferral pattern documented for cc-0010 readiness. Apply sequence (A→B→C→D→E) requires 5 sequential D-01 fires + 5 PK approval phrases + 12 V-checks + 5 close-the-loop UPDATEs. NEW D-01 fires required for each stage; no apply may proceed until each stage's gate cycle is clean.*
