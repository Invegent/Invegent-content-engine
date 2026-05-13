# Brief cc-0010C v1 — `reconciliation-matcher` EF end-to-end (Tier 1 only) (PRV-1 third build, sub-build 3 of 3)

**Created:** 2026-05-13 Sydney
**Last patched:** 2026-05-13 Sydney (v1 — initial authoring; re-authored from v2.68 context per PK directive after a prior in-session draft was confirmed non-persisted to disk)
**Author:** chat (Claude)
**Parent brief:** `docs/briefs/cc-0010-r-reconciliation-evidence-and-matcher.md` (SUPERSEDED-BY for execution per L48 split 2026-05-12)
**Sibling sub-brief (closed):** `docs/briefs/cc-0010A-r-reconciliation-ddl-foundation.md` — cc-0010A v1.5 APPLIED + CLOSED 2026-05-12 at commit `0589dce264f834a0d53eeb871562a57ae904aa38`
**Sibling sub-brief (closed-with-verified-variance):** `docs/briefs/cc-0010B-ice-evidence-materialiser.md` — cc-0010B CLOSED-WITH-VERIFIED-VARIANCE 2026-05-13 at v2.68 close commit `db14a00bf5fb8d32253c55b033156808b29fa150`; F4-hotfix at commit `62f319c8554b25ee06cf680bc548cf87f24521ba`; EF v2 ACTIVE; cron job 83 ACTIVE on `*/30 * * * *`; first post-v2 cron fire `c256dc99-484c-4206-80f5-7b4054c31532` succeeded 2026-05-13 02:00 UTC with rows_processed=72, rows_inserted=30, rows_updated=0, rows_skipped=42, duration_ms=3503.

**Status:** **AUTHORED v1 — docs-only. Stage B D-01 gate is OPEN — awaiting CCD narrow review + PK approval phrase before any Stage B source authoring begins.** No D-01 fired this commit. No apply. No deploy. No invocation. No `m.chatgpt_review` write. No source file written. No mutation of cc-0010A or cc-0010B artefacts.

**Executor (per stage — explicit per CCH R1 + R11 carried from cc-0009/cc-0010A/cc-0010B):**

| Stage | Owner | Mechanism |
|---|---|---|
| **B — EF source + `supabase/config.toml`** (`reconciliation-matcher` only) | **CC / Claude Code** (default), or **chat** under PK implicit reassignment | git commit to feature branch `feat/cc-0010C-reconciliation-matcher` → diff review → PK approval phrase → merge (CCH R11; NO direct-push to `main`) |
| **C — EF deploy** | **CC / Claude Code** | PowerShell `supabase functions deploy reconciliation-matcher --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns`; CLI-fallback path available per L53 NEW candidate from cc-0010B if Supabase MCP `deploy_edge_function` returns `InternalServerErrorException` |
| **D — pg_cron schedule** (`reconciliation_matcher_30min`) | **chat (ChatGPT-operated)** | Supabase MCP `apply_migration cc_0010c_pg_cron_reconciliation_matcher` (vault-backed secret sourcing per L42) |
| **E — first on-demand invocation** | **chat (ChatGPT-operated)** | Supabase MCP `execute_sql` (RPC-style `net.http_post`); cron-fire equivalent (per L43 closed-with-verified-variance pathway) acceptable under PK directive if MCP path is degraded |

**CCD / any other Claude Code instance remains read-only unless PK explicitly reassigns.** Stage B + C are the only explicit CC reassignments in cc-0010C. No autonomous Cowork loop participates in any cc-0010C apply gating. **Stage B never direct-pushes to `main`** (CCH R11 carried).

**Cron schedule (CCH R14 fixed UTC anchor carried):** Stage D installs `15-59/30 * * * *` UTC (every 30 minutes at :15 and :45 of every hour) as a **fixed UTC anchor** — no DST-aware Sydney-local shifting. Offset by 15 minutes from cc-0010B materialiser cron job 83 at `*/30` (:00, :30) so that materialiser-then-matcher sequencing is naturally enforced at runtime (materialiser fires at :00, completes within ~4 sec per cc-0010B v2.68 close evidence; matcher fires 15 min later reading the freshly-materialised evidence). PRV-0 §D-19 specifies "every 30 min" for both EFs; the offset is an implementation detail of the sequencing intent, not a cadence deviation.

**Vault-backed secret sourcing (L42 pattern):** `CRON_SECRET` sourced from `vault.decrypted_secrets WHERE name='CRON_SECRET' LIMIT 1`. Vault row id `0fede5c3-f92c-4bd6-8837-c0e304dfca4c` created 2026-05-11 in cc-0009 Stage D vault pivot; reused by cron job 82 (cadence-rule-generator-daily) + cron job 83 (cc-0010B ice-evidence-materialiser); same row reused here for the third reconciliation cron. NOT `current_setting('app.settings.cron_secret', true)` (KOI-03 disproved this on managed-PG).

**Authority:** PRV-0 design lock v2 — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7`.

**Source design sections:**
- PRV-0 v2 §3.4 (`r.ice_publication_evidence` shape — DELIVERED IN cc-0010A; POPULATED BY cc-0010B; cc-0010C consumes)
- PRV-0 v2 §3.7 (`r.reconciliation_match` — DELIVERED IN cc-0010A; cc-0010C is the populator)
- PRV-0 v2 §5.4 (reconciliation-matcher EF responsibilities)
- PRV-0 v2 §6 (matching engine — **Tier 1 only in cc-0010C; Tiers 2–5 deferred to PRV-2/3/4**)
- PRV-0 v2 §6.2 (status transitions — `matched` if `delta_minutes_late <= minutes_late_tolerance`; `late` deferred per §13 #3)
- PRV-0 v2 §6.3 (`r.matcher_config` — DELIVERED IN cc-0010A with 1 global default row; cc-0010C is the first consumer)
- PRV-0 v2 §8.3 (cc-0010 scope contract: Tier 1 only in cc-0010)
- PRV-0 v2 §D-19 (cron cadence)
- PRV-0 v2 §D-21 (manual override hard lock — matcher MUST include `WHERE override_by IS NULL` clause; non-negotiable)

**Process baseline:** `docs/runtime/cc_stage_template.md`. `docs/runtime/mcp_review_protocol.md` Evidence Gate (L46) baseline-confirmed through v2.68 (5 cumulative clean-agree-zero-pushback D-01 fires across v2.67 + v2.68).

---

## Patch history

- **2026-05-13 Sydney — v1** (initial authoring; docs-only). Authored after cc-0010B CLOSED-WITH-VERIFIED-VARIANCE at v2.68 close commit `db14a00`. Bakes the same authoring discipline as cc-0010B v1.3: L44 Runtime Proof Pre-flight applied to matcher write surfaces at §4; L45 post-mutation truth check + count-delta + 5-row sanity sample at §6; L46 clean brief surface to minimise GNB pushback at D-01; L48 atomicity satisfied (cc-0010C is single-EF, single-cron, single-invocation, single-actor per stage); L49 PG reserved-word check applied as authoring discipline though Stage D cron SQL uses inline literals with no `DECLARE` block. R1 trigger inventory probe carried at §4.10b. R2 run-id stamping carried at §5.2 + V12 + V14 (matcher writes `created_by_run_id` + `updated_by_run_id` on every `r.reconciliation_match` UPSERT using the Stage E audit run_id). D-21 hard lock (`WHERE override_by IS NULL`) called out explicitly in §5.2 source spec, §6.4 V12, §11.6 risk, §10.2.h HALT, and §Forbidden actions. Folds F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) into matcher horizon contract (today-forward, 7-day window default — same horizon as cc-0010B materialiser). **Re-authoring note:** an in-session draft of cc-0010C was authored 2026-05-13 but never persisted to disk; PK confirmed non-persistence and directed re-authoring from current v2.68 context with no fabrication from session memory. This v1 derives entirely from durable artefacts on disk: parent brief at `docs/briefs/cc-0010-r-reconciliation-evidence-and-matcher.md`; cc-0010A v1.5 brief; cc-0010B v1.3 brief; v2.68 close session log at `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md`; PRV-0 v2 design lock at the authority commit above; `r.matcher_config` global default row delivered by cc-0010A (1 row, NULL/NULL key).

---
## §1. Purpose and boundary

### 1.1 What cc-0010C owns

cc-0010C owns the **`reconciliation-matcher` Edge Function end-to-end (Tier 1 only)** across four stages:

1. **Stage B** — EF source (`supabase/functions/reconciliation-matcher/index.ts`) + `supabase/config.toml` amendment (one `[functions.reconciliation-matcher] verify_jwt = false` entry, alphabetised insertion after the cc-0010B entry).
2. **Stage C** — EF deploy via `supabase functions deploy reconciliation-matcher --no-verify-jwt`.
3. **Stage D** — pg_cron schedule `reconciliation_matcher_30min` at `15-59/30 * * * *` UTC with vault-backed `CRON_SECRET` sourcing and `timeout_milliseconds := 30000`.
4. **Stage E** — first on-demand `net.http_post` invocation producing initial rows in `r.reconciliation_match` from existing `r.ice_publication_evidence` (populated by cc-0010B since 2026-05-13 02:00 UTC), with corresponding status transitions on `r.expected_publication` (`expected` / `backfilled` → `matched`) gated by D-21.

### 1.2 What cc-0010C does NOT own (boundary)

- **`r.*` DDL** — DELIVERED IN cc-0010A v1.5. cc-0010C treats the following as dependency-satisfied: `r.reconciliation_match` table (16 cols incl. UNIQUE on expected_publication_id, the three CHECK constraints `reconcile_match_override_pair` / `reconcile_match_evidence_required_for_non_none` / `reconcile_match_tier_consistency`); the FK `r.expected_publication.matched_match_id → r.reconciliation_match.reconciliation_match_id` ON DELETE SET NULL (L38 candidate empirically vindicated at cc-0010A close); the cc-0009 CHECK `expected_status_match_pair` on `r.expected_publication`; `r.matcher_config` table with the 1 global default row (NULL/NULL key; defaults 60/60/24/0.850); `r.reconciliation_run` table; the `k.column_registry` rows for all the above (86 rows landed in cc-0010A §3.7).
- **`r.ice_publication_evidence` writes** — DELIVERED + POPULATED IN cc-0010B. cc-0010C reads only.
- **Tier 2–5 matching logic** — DEFERRED to PRV-2/3/4. cc-0010C ships **Tier 1 ONLY** (`matched_evidence_kind='ice'`, `matched_match_tier=1`, `matched_confidence=1.000`). Any reference in the matcher source to `r.platform_observation` or `r.platform_manual_observation` reads is a scope violation — chat HALTs at Stage B D-01.
- **`late` status transition** — DEFERRED per parent §Unresolved Assumption #6 and this brief §13 #3. cc-0010C v1 implements **`matched` only** (when `delta_minutes_late <= minutes_late_tolerance`). Rows whose evidence shows `delta_minutes_late > minutes_late_tolerance` stay in `expected_status='expected'` and are NOT written to `r.reconciliation_match` in v1.
- **`r.matcher_config` writes beyond the cc-0010A global default row** — DEFERRED. cc-0010C reads only.
- **Backfilling matches against `r.expected_publication` rows older than the materialiser horizon** — out of scope. cc-0010C operates on the same today-forward 7-day window as cc-0010B (F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) alignment).
- **Wiring `cadence-rule-generator` (cc-0009 EF, cron job 82) to read `r.matcher_config`** — out of scope.
- **`r.platform_observation` / `r.platform_manual_observation` / `r.platform_observer_health` writes** — DEFERRED to PRV-2/3/4.
- **Adding new columns or constraints to any existing `r.*` table** — out of scope.
- **Modifying cc-0010A or cc-0010B briefs, result files, or session files** — frozen per ICE-PROC-001 §9.1.
- **24 historical escalated `m.chatgpt_review` rows** — untouched per CCH directive carried.

### 1.3 Why now

cc-0010B Stage E cron-equivalent close 2026-05-13 02:00 UTC produced **30 rows** in `r.ice_publication_evidence` from the 72 in-window `r.expected_publication` rows (rows_processed=72, rows_inserted=30, rows_updated=0, rows_skipped=42). Cron job 83 continues firing every 30 min, so the evidence table grows on every horizon tick. Without the matcher:

- those evidence rows have no consumer;
- `r.reconciliation_match` stays empty;
- the 30 (and growing) evidence rows do not propagate into `r.expected_publication` status transitions;
- PRV-1 close gate criterion 3 (Tier 1 matching live for ICE-healthy clients) cannot be evaluated;
- cc-0011 cannot start because it consumes `r.reconciliation_match` output;
- the FK re-added at cc-0010A Stage A close remains unexercised on the FK-target side.

cc-0010C is the third and final link in the chain:

```
cc-0010A foundation ✓ CLOSED 2026-05-12 v2.67
       ↓
cc-0010B materialiser ✓ CLOSED-WITH-VERIFIED-VARIANCE 2026-05-13 v2.68
       ↓
cc-0010C matcher  ← THIS BRIEF
       ↓
PRV-1 close gate evaluable
```

### 1.4 What cc-0010C delivers (when all four stages close)

1. **1 new Edge Function deployed** — `reconciliation-matcher` (TypeScript, Deno) with `verify_jwt=false` declared in `supabase/config.toml`.
2. **1 new pg_cron job** — `reconciliation_matcher_30min` at `15-59/30 * * * *` UTC, vault-backed `CRON_SECRET`, `timeout_milliseconds := 30000`. Expected jobid 84 (next after job 83); empirical jobid recorded at Stage D close.
3. **M new rows in `r.reconciliation_match`** — M derived during verification from live `r.ice_publication_evidence` rows satisfying ALL of: `pipeline_state='published'` AND joined `r.expected_publication.expected_status IN ('expected','backfilled')` AND no manual override (`override_by IS NULL`, vacuously true at first invocation) AND `delta_minutes_late <= minutes_late_tolerance` (Tier 1 matched-only). Each row carries `matched_evidence_kind='ice'`, `matched_match_tier=1`, `matched_confidence=1.000`, computed `delta_minutes_late` (clamped ≥0), `matcher_run_id`, `created_by_run_id`, `updated_by_run_id` populated with the Stage E audit run_id (R2 pattern carried from cc-0010B v1.1).
4. **M status transitions on `r.expected_publication`** — `expected_status` flips from `expected` (or `backfilled`) → `matched`, `matched_match_id` and `matched_at` populated. UPSERT-then-UPDATE ordering satisfies CHECK `expected_status_match_pair`.
5. **1 new audit row in `r.reconciliation_run`** — `run_type='matching'`, `trigger='manual'` (or `'scheduled'` at first cron fire), `triggered_by='cc-0010C-stage-e-first'`, status='succeeded' (or 'partial'), `rows_*` populated, `summary_json` carrying horizon + Tier 1 breakdown + skip-reason histogram.
6. **PRV-1 close gate criterion 3 satisfied** (Tier 1 matching live) — gating cc-0011 readiness and PRV-1 close declaration in a subsequent session.

---
## §2. Dependency section

### 2.1 cc-0010A applied state (cc-0010C's hard dependency — schema)

Hard dependencies satisfied at cc-0010A v1.5 close (commit `0589dce`, 2026-05-12 v2.67):

- `r.reconciliation_match` table exists with the v1.5 column shape (16 cols) and three CHECKs.
- UNIQUE constraint on `r.reconciliation_match (expected_publication_id)` enables ON CONFLICT-driven idempotent upsert.
- FK `r.expected_publication.matched_match_id → r.reconciliation_match.reconciliation_match_id` ON DELETE SET NULL is live.
- `r.matcher_config` table exists with 1 global default row (NULL/NULL key; minutes_late_tolerance=60, caption_prefix_length=60, same_day_window_hours=24, fuzzy_levenshtein_threshold=0.850). UNIQUE NULLS NOT DISTINCT on (client_id, platform).
- `r.reconciliation_run` table exists from cc-0009.
- `r.normalise_text` + `r.to_sydney_local_date` + `r.compact_raw_json` helpers all present.
- `k.column_registry` row for `r.expected_publication.matched_match_id` carries the FK flag flipped + L38 vindication phrase.

### 2.2 cc-0010B applied state (cc-0010C's hard dependency — data + cron sequencing)

Hard dependencies satisfied at cc-0010B close (v2.68 commit `db14a00`, 2026-05-13):

- `r.ice_publication_evidence` populated with ≥30 rows; cron job 83 fires every 30 min on `*/30 * * * *` so the count grows on each tick.
- EF `ice-evidence-materialiser` v2 ACTIVE with verify_jwt=false; F4-hotfix at commit `62f319c` makes `post_publish_queue_id: null` in the publish path.
- `r.reconciliation_run` carries at least the cc-0010B success row id `c256dc99-484c-4206-80f5-7b4054c31532` plus forensic-accepted pre-v2 failed audit rows.
- Cron job 83 active at `*/30 * * * *` UTC. cc-0010C cron job 84 will fire 15 minutes offset (`15-59/30 * * * *`): materialiser at :00 → matcher at :15 → materialiser at :30 → matcher at :45. The 15-min gap is empirically safe given materialiser's measured 3.5-sec duration.

### 2.3 What cc-0010C reads at runtime

- `r.expected_publication` — WHERE `expected_status IN ('expected','backfilled')` AND in horizon window.
- `r.ice_publication_evidence` — WHERE `expected_publication_id` matches AND `pipeline_state='published'`.
- `r.matcher_config` — lookup order (client, platform) → (client, NULL) → (NULL, NULL); only `minutes_late_tolerance` consumed in v1.
- `r.reconciliation_match` — pre-read to honour D-21 manual override sticky semantics.
- `c.client` — read-only via JOIN for log/audit clarity; never written.

### 2.4 What cc-0010C writes at runtime

- `r.reconciliation_match` — UPSERT ON CONFLICT (expected_publication_id) DO UPDATE WHERE `override_by IS NULL` (D-21).
- `r.expected_publication` — UPDATE SET `expected_status='matched'`, `matched_match_id`, `matched_at=now()` for the just-upserted set. Sequenced AFTER matcher upsert.
- `r.reconciliation_run` — single audit row INSERT-then-UPDATE across the run lifecycle.

### 2.5 No upstream-driver ambiguity (cf. cc-0010B v1.3 §2.4)

cc-0010C does not have an analogous slot_id-driver question. The matcher's primary join key is `expected_publication_id` which exists on both `r.expected_publication` (PK) and `r.ice_publication_evidence` (UNIQUE FK). The join is unambiguous and verified at §4.6.

---

## §3. Open items / decision posture at brief authoring

### 3.1 Internal Q-table

| Q# | Question | Answer at v1 | Gate |
|---|---|---|---|
| Q1 | Hard dependencies satisfied on disk + in production? | Yes — cc-0010A v1.5 CLOSED + cc-0010B CLOSED-WITH-VERIFIED-VARIANCE | §4.1 re-verifies live |
| Q2 | Unresolved assumptions blocking Stage B D-01? | 0 (see §13 — none blocking) | None |
| Q3 | Tier 2–5 paths in v1? | NO — Tier 1 only | Chat HALT at Stage B D-01 if violated |
| Q4 | `late` transition in v1? | NO — deferred per §13 #3 | Chat HALT at Stage B D-01 if violated |
| Q5 | Cron offset conflicts with job 83? | NO — `15-59/30` ≠ `*/30` jobname; §4.10 verifies | §4.10 PASS required |
| Q6 | Brief narrow-reviewed by CCD? | NO — fire pending after freeze on main | Stage B D-01 packet includes this brief's commit SHA |

### 3.2 No firing of Stage B D-01 until

1. This brief is frozen on `main` (target action of the current session per PK directive).
2. CCD has performed a narrow review on the frozen brief SHA and returned a verdict.
3. PK has issued an approval phrase for Stage B authoring to begin.

---
## §4. Pre-flight verification (read-only)

All §4.x sub-checks are read-only against production via Supabase MCP `execute_sql` (or Invegent GitHub bridge for source-side checks). **Re-run each immediately preceding the relevant apply within ~60s** (P1–P5 discipline carried).

### 4.1 cc-0010A + cc-0010B outputs still in place (cross-brief)

```sql
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='reconciliation_match') AS rm_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='matcher_config') AS mc_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='ice_publication_evidence') AS ipe_exists,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='r' AND routine_name='compact_raw_json') AS fn_compact_exists,
  (SELECT COUNT(*) FROM r.matcher_config WHERE client_id IS NULL AND platform IS NULL) AS mc_global_default_rows,
  (SELECT COUNT(*) FROM r.ice_publication_evidence) AS ipe_row_count,
  (SELECT COUNT(*) FROM r.expected_publication) AS ep_row_count,
  (SELECT COUNT(*) FROM r.reconciliation_match) AS rm_existing_rows,
  (SELECT COUNT(*) FROM cron.job WHERE jobname='ice_evidence_materialiser_30min' AND active=true) AS cron_83_active;
```

**Decision rule:** all booleans true; `mc_global_default_rows = 1`; `ipe_row_count >= 30`; `ep_row_count >= 84`; `rm_existing_rows = 0` at first Stage E open (non-zero → surface to PK before invocation); `cron_83_active = 1`. Drift on any → HALT (§10.2.a–e).

### 4.2 FK `r.expected_publication.matched_match_id` still references `r.reconciliation_match`

```sql
SELECT pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='r' AND t.relname='expected_publication'
  AND c.contype='f'
  AND pg_get_constraintdef(c.oid) LIKE '%matched_match_id%';
```

**Decision rule:** exactly 1 row; def matches `FOREIGN KEY (matched_match_id) REFERENCES r.reconciliation_match(reconciliation_match_id) ON DELETE SET NULL`. Drift → HALT (§10.2.f).

### 4.3 (Stage B+C) No existing `reconciliation-matcher` EF or config.toml entry on `main`

Via Supabase MCP `list_edge_functions` + Invegent GitHub bridge read of `supabase/config.toml` on `main`.

**Decision rule:** EF slug absent; no `[functions.reconciliation-matcher]` section. Either present → HALT (§10.2.g).

### 4.4 (Stage D) Migration name uniqueness

```sql
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE name = 'cc_0010c_pg_cron_reconciliation_matcher';
```

**Decision rule:** 0 rows → PASS. Any row → HALT (§10.2.h).

### 4.5 (Stage E) Reconciliation_run baseline + run-id stamping precondition

```sql
SELECT (SELECT COUNT(*) FROM r.reconciliation_run) AS rr_baseline,
       (SELECT COUNT(*) FROM r.reconciliation_match) AS rm_baseline;
```

**Decision rule:** record `rr_baseline` and `rm_baseline` for L45 post-mutation delta. Stage E expects `rm_baseline=0` at first invocation.

### 4.6 (Stage E) Join correctness probe — Tier 1 candidate set

```sql
WITH candidates AS (
  SELECT ipe.ice_publication_evidence_id, ipe.expected_publication_id, ipe.pipeline_state,
         ipe.published_at, ipe.scheduled_for,
         ep.expected_status, ep.expected_window_end, ep.client_id, ep.platform
  FROM r.ice_publication_evidence ipe
  JOIN r.expected_publication ep
    ON ep.expected_publication_id = ipe.expected_publication_id
  WHERE ipe.pipeline_state = 'published'
    AND ep.expected_status IN ('expected','backfilled')
)
SELECT COUNT(*) AS candidates_total,
       COUNT(*) FILTER (WHERE published_at IS NOT NULL) AS with_published_at,
       COUNT(*) FILTER (WHERE published_at IS NULL) AS without_published_at;
```

**Decision rule:** `candidates_total >= 0`. `without_published_at` should be 0 (any non-zero is a materialiser-side anomaly — surface to PK; do not block matcher Stage E unless count > 0). Used at §6 V12b derivation.

### 4.7 (Stage E) Override-row precondition (D-21 idempotency safety)

```sql
SELECT COUNT(*) AS existing_overrides
FROM r.reconciliation_match
WHERE override_by IS NOT NULL;
```

**Decision rule:** at first invocation expect 0. Any non-zero is surfaced for PK awareness; matcher still honours `WHERE override_by IS NULL`.

### 4.8 (Stage E) `r.matcher_config` resolves the global default

```sql
SELECT minutes_late_tolerance, caption_prefix_length, same_day_window_hours, fuzzy_levenshtein_threshold
FROM r.matcher_config
WHERE client_id IS NULL AND platform IS NULL;
```

**Decision rule:** exactly 1 row; values 60/60/24/0.850. Drift → HALT (§10.2.i).

### 4.9 (Stage D) Vault row CRON_SECRET still resolvable

```sql
SELECT
  (SELECT COUNT(*) FROM vault.secrets WHERE name='CRON_SECRET') AS vault_row_count,
  EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name='CRON_SECRET' LIMIT 1) AS vault_resolvable,
  (SELECT length(decrypted_secret) FROM vault.decrypted_secrets WHERE name='CRON_SECRET' LIMIT 1) AS decrypted_length;
```

**Decision rule:** vault_row_count=1; vault_resolvable=true; decrypted_length>0 (length only; never raw value). Drift → HALT (§10.2.j).

### 4.10 (Stage D) cron jobname uniqueness

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'reconciliation_matcher_30min'
   OR schedule = '15-59/30 * * * *';
```

**Decision rule:** 0 rows on jobname match → PASS. Any row on jobname → HALT (§10.2.k). Rows on schedule-only match are informational (multiple jobs can share a schedule).

### 4.10b (Stage E) Trigger inventory probe on write targets (R1 carried)

```sql
SELECT n.nspname AS schema_name, c.relname AS table_name,
       t.tgname AS trigger_name, t.tgenabled,
       pg_get_triggerdef(t.oid) AS trigger_def
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'r'
  AND c.relname IN ('reconciliation_match','expected_publication','reconciliation_run')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;
```

**Decision rule:** enumerate any non-system triggers. Any unexpected trigger → SURFACE for chat review BEFORE Stage E invocation. R1 carried from cc-0010B v1.1.

### 4.11 (Stage E) `c.client` join surface still readable

```sql
SELECT COUNT(*) AS client_rows FROM c.client;
```

**Decision rule:** > 0; matcher join to `c.client` for log clarity does not fail.

---
## §5. EF specification — `reconciliation-matcher`

### 5.1 Endpoint contract

- HTTP method: POST.
- Path: `/functions/v1/reconciliation-matcher`.
- Auth: cron calls with `x-cron-secret` header; EF compares against `Deno.env.get('CRON_SECRET')`. Returns HTTP 401 on mismatch. `verify_jwt=false` declared in `supabase/config.toml`.
- Request body (optional JSON):
  - `horizon_days?: number` (default 7; matches cc-0010B materialiser)
  - `backfill_days?: number` (default 0; today-forward only per F-CC-0009 Option (a) folded)
  - `triggered_by?: string` (default `pg_cron_reconciliation_matcher_30min` when called by cron; manual invocations pass `'cc-0010C-stage-e-first'` or similar)
  - `dry_run?: boolean` (default false; if true, computes the match plan and returns counts but does not write to `r.reconciliation_match` or `r.expected_publication`)
- Response (HTTP 200):
  ```json
  {
    "run_id": "<uuid>",
    "rows_processed": <int>,
    "rows_inserted": <int>,
    "rows_updated": <int>,
    "rows_skipped": <int>,
    "duration_ms": <int>,
    "horizon_days": <int>,
    "summary": {
      "tier_1_matched": <int>,
      "skipped_no_evidence": <int>,
      "skipped_evidence_not_published": <int>,
      "skipped_late_beyond_tolerance": <int>,
      "skipped_override_protected": <int>,
      "skipped_other": <int>
    }
  }
  ```
- Response on error: HTTP 5xx with `{error: "<message>", run_id?: "<uuid-if-audit-row-created>"}`. `r.reconciliation_run.status='failed'` and `error_summary` populated.

### 5.2 Per-row matcher algorithm

For each `r.expected_publication` row in horizon window with `expected_status IN ('expected','backfilled')`, in deterministic order by `expected_publication_id`:

1. **Read Tier 1 evidence**: `SELECT * FROM r.ice_publication_evidence WHERE expected_publication_id = $1 AND pipeline_state = 'published'`. If 0 rows → skip with reason `skipped_no_evidence` or `skipped_evidence_not_published` depending on whether any evidence exists at all.
2. **Resolve `minutes_late_tolerance`**: lookup `r.matcher_config` in order (ep.client_id, ep.platform) → (ep.client_id, NULL) → (NULL, NULL). Default at v1 is 60 (global default row).
3. **Compute `delta_minutes_late`**: `GREATEST(0, EXTRACT(EPOCH FROM (ipe.published_at - ep.expected_window_end)) / 60)::int`. Negative = published before window end = on-time = 0.
4. **Apply v1 matched-only gate**: if `delta_minutes_late > minutes_late_tolerance`, skip with reason `skipped_late_beyond_tolerance`. **No write to `r.reconciliation_match`; no transition on `r.expected_publication`.** Row stays in `expected` for cc-0011 or a future v2 amendment to handle as `late`.
5. **Check override protection (D-21 hard lock)**: read `SELECT override_by FROM r.reconciliation_match WHERE expected_publication_id = $1`. If exactly 1 row and `override_by IS NOT NULL` → skip with reason `skipped_override_protected`. (At first invocation this is vacuously safe since the table is empty.)
6. **UPSERT `r.reconciliation_match`** within the run's transaction:
   ```sql
   INSERT INTO r.reconciliation_match (
     expected_publication_id, matched_evidence_kind, matched_evidence_id,
     matched_match_tier, matched_confidence, delta_minutes_late,
     matcher_run_id, created_by_run_id, updated_by_run_id
   ) VALUES (
     $expected_publication_id, 'ice', $ice_publication_evidence_id,
     1, 1.000, $delta_minutes_late,
     $run_id, $run_id, $run_id
   )
   ON CONFLICT (expected_publication_id) DO UPDATE
   SET matched_evidence_kind = EXCLUDED.matched_evidence_kind,
       matched_evidence_id   = EXCLUDED.matched_evidence_id,
       matched_match_tier    = EXCLUDED.matched_match_tier,
       matched_confidence    = EXCLUDED.matched_confidence,
       delta_minutes_late    = EXCLUDED.delta_minutes_late,
       matcher_run_id        = EXCLUDED.matcher_run_id,
       updated_by_run_id     = EXCLUDED.updated_by_run_id,
       updated_at            = now()
   WHERE r.reconciliation_match.override_by IS NULL                  -- D-21 hard lock
   RETURNING reconciliation_match_id;
   ```
   If RETURNING returns 0 rows (the WHERE clause matched an override-protected existing row), the row counts as `skipped_override_protected` and Step 7 is skipped.
7. **UPDATE `r.expected_publication`** for the just-upserted row:
   ```sql
   UPDATE r.expected_publication
   SET expected_status   = 'matched',
       matched_match_id  = $reconciliation_match_id,
       matched_at        = now(),
       updated_at        = now()
   WHERE expected_publication_id = $1
     AND expected_status IN ('expected','backfilled');
   ```
   Sequenced AFTER the matcher upsert so that the moment `expected_status` flips to `matched`, `matched_match_id` is already non-null and the CHECK `expected_status_match_pair` is satisfied throughout.
8. Increment `rows_inserted` or `rows_updated` (per RETURNING + per ON CONFLICT path).

**Idempotency**: full re-run on the same horizon is safe — Steps 6 + 7 are both idempotent under their WHERE clauses; the UPSERT updates in place; the UPDATE is no-op on rows already at `matched`.

**Tier 1 only — explicit code-level prohibition**: the matcher source MUST NOT contain `FROM r.platform_observation`, `FROM r.platform_manual_observation`, any `matched_evidence_kind` literal other than `'ice'`, or any `matched_match_tier` literal other than `1`. Chat reviews CC's diff at Stage B D-01 with a grep checklist.

**`late` deferral — explicit code-level prohibition**: the matcher source MUST NOT contain any `UPDATE r.expected_publication SET expected_status = 'late'` or any insert/update of `r.reconciliation_match` with `matched_evidence_kind != 'ice'`. Late detection deferred per §1.2 + §13 #3.

### 5.3 Run-lifecycle wrapping

At entry: INSERT `r.reconciliation_run (run_type='matching', trigger=<derived from triggered_by prefix>, triggered_by=$triggered_by, status='running', started_at=now(), summary_json='{}'::jsonb) RETURNING reconciliation_run_id`. Capture as `$run_id`.

At success: UPDATE that row: `SET status='succeeded', finished_at=now(), duration_ms=<computed>, rows_processed=<n>, rows_inserted=<n>, rows_updated=<n>, rows_skipped=<n>, summary_json=<built object per §5.1>`.

On per-row error: catch + log + mark `rows_skipped` with reason `skipped_other`; if all rows fail set `status='failed'`; if some fail, `status='partial'`. If a connection-level fault prevents the audit-row UPDATE, the row stays at `status='running'` — pre-flight §4.5 + V10 verify run completion explicitly.

### 5.4 EF source structure

```
supabase/functions/reconciliation-matcher/
├── index.ts                  -- Deno.serve handler + run lifecycle
├── lib/matcher.ts            -- per-row algorithm in §5.2
├── lib/types.ts              -- shared types (RunRecord, EvidenceRow, ExpectedRow, MatcherConfig)
└── lib/sql.ts                -- parameterised SQL helpers
```

Stage B authoring will produce these files on the feature branch `feat/cc-0010C-reconciliation-matcher`. Chat reviews the diff at Stage B D-01.

### 5.5 `supabase/config.toml` amendment

```toml
[functions.reconciliation-matcher]
verify_jwt = false
```

Alphabetised insertion (current ordering on main is `cadence-rule-generator` then `ice-evidence-materialiser`; `reconciliation-matcher` lands after both).

### 5.6 Stage C deploy commands (CC executes)

```powershell
cd C:\Users\parve\Invegent-content-engine
git checkout main
git pull origin main
supabase functions deploy reconciliation-matcher --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns
```

Per L53 NEW candidate from cc-0010B: if Supabase MCP `deploy_edge_function` is preferred but returns `InternalServerErrorException`, CLI fallback above is the L43 closed-with-verified-variance pathway; both atomic-roll back cleanly so no half-deploy state.

### 5.7 Stage D cron migration SQL (`cc_0010c_pg_cron_reconciliation_matcher`)

```sql
SELECT cron.schedule(
    'reconciliation_matcher_30min',
    '15-59/30 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/reconciliation-matcher',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
        ),
        body := jsonb_build_object(
            'horizon_days', 7,
            'backfill_days', 0,
            'triggered_by', 'pg_cron_reconciliation_matcher_30min'
        ),
        timeout_milliseconds := 30000
    );
    $$
);
```

Expected output: 1 row inserted into `cron.job`, jobid likely 84 (next free after job 83 from cc-0010B); empirical jobid recorded at Stage D close.

### 5.8 Stage E first invocation SQL

```sql
SELECT net.http_post(
    url := 'https://mbkmaxqhsohbtwsqolns.supabase.co/functions/v1/reconciliation-matcher',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := jsonb_build_object(
        'horizon_days', 7,
        'backfill_days', 0,
        'triggered_by', 'cc-0010C-stage-e-first'
    ),
    timeout_milliseconds := 30000
) AS request_id;
```

Followed by a brief `pg_sleep(8)` (matching cc-0009 / cc-0010B Stage E patterns) then V10–V14 verification reads. If the manual invocation pathway is degraded at Stage E open, the L43 cron-fire-equivalent pathway used at cc-0010B close 2026-05-13 (`c256dc99`) is available as PK-directable variance — observe the next cron tick (within ≤30 min) and accept that as the Stage E artefact.

---
## §6. V-checks (post-each-stage)

### V8 (Stage B + C) EF deploy verification

Via Supabase MCP `get_edge_function reconciliation-matcher`. PASS: status=ACTIVE; verify_jwt=false; latest version >= 1; `ezbr_sha256` matches the just-deployed asset hash. Manual probe: unauth POST returns HTTP 401.

### V9 (Stage D) Cron job created

```sql
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'reconciliation_matcher_30min';
```

**PASS:** 1 row; `active=true`; `schedule='15-59/30 * * * *'`; `command` contains `vault.decrypted_secrets`, the EF URL, `timeout_milliseconds := 30000`, `triggered_by` label.

### V10 (Stage E) Run record sanity

```sql
SELECT reconciliation_run_id, run_type, trigger, status, rows_processed, rows_inserted,
       rows_updated, rows_skipped, duration_ms, triggered_by, summary_json
FROM r.reconciliation_run
WHERE triggered_by IN ('cc-0010C-stage-e-first','pg_cron_reconciliation_matcher_30min')
ORDER BY started_at DESC
LIMIT 5;
```

**PASS:** at least 1 row; `run_type='matching'`; `status='succeeded'` (or `'partial'` with surfaced reason — PK-acceptable variance); duration_ms < 30000; `summary_json` carries the 6 skip-reason counters from §5.1.

### V11 (Stage E) L45 post-mutation truth check — delta against §4.5 baseline

```sql
SELECT (SELECT COUNT(*) FROM r.reconciliation_match) AS rm_after,
       (SELECT COUNT(*) FROM r.reconciliation_run WHERE run_type='matching') AS matching_run_count;
```

**PASS:** `rm_after = rm_baseline + rows_inserted` from V10. `matching_run_count` increases by exactly 1 vs §4.5 baseline.

### V12 (Stage E) Tier 1 hygiene + override protection + run-id stamping (R2)

```sql
SELECT
  (SELECT COUNT(*) FROM r.reconciliation_match)                                                                AS total_matches,
  (SELECT COUNT(*) FROM r.reconciliation_match WHERE matched_evidence_kind <> 'ice')                           AS non_tier_1_count,
  (SELECT COUNT(*) FROM r.reconciliation_match WHERE matched_match_tier <> 1)                                  AS bad_tier_count,
  (SELECT COUNT(*) FROM r.reconciliation_match WHERE matched_confidence <> 1.000)                              AS bad_confidence_count,
  (SELECT COUNT(*) FROM r.reconciliation_match WHERE created_by_run_id IS NULL OR updated_by_run_id IS NULL)   AS missing_run_id_count,
  (SELECT COUNT(*) FROM r.reconciliation_match WHERE override_by IS NOT NULL)                                  AS premature_override_count,
  (SELECT COUNT(*) FROM r.reconciliation_match WHERE matched_evidence_id IS NULL)                              AS evidence_id_null_count;
```

**PASS:** every count = 0 except `total_matches` (which equals V11 `rm_after`).

### V13 (Stage E) `r.expected_publication` status transitions

```sql
SELECT expected_status, COUNT(*) AS rows
FROM r.expected_publication
GROUP BY expected_status
ORDER BY expected_status;

SELECT COUNT(*) AS check_pair_violations
FROM r.expected_publication
WHERE expected_status = 'matched'
  AND (matched_match_id IS NULL OR matched_at IS NULL);
```

**PASS:** distribution shows a `matched` count equal to V11's `rows_inserted` (plus any pre-existing matched count — should be 0 at first invocation); `check_pair_violations = 0`. `suppressed` and other counts unchanged from §4.1 baseline.

### V14 (Stage E) L45 sanity sample — 5-row spot-check

```sql
SELECT rm.expected_publication_id, rm.matched_evidence_kind, rm.matched_match_tier,
       rm.matched_confidence, rm.delta_minutes_late, rm.matcher_run_id,
       rm.created_by_run_id, rm.updated_by_run_id,
       ep.expected_status, ep.matched_match_id, ep.matched_at,
       cli.client_slug, ep.platform, ep.expected_local_date,
       ipe.published_at, ipe.pipeline_state
FROM r.reconciliation_match rm
JOIN r.expected_publication ep ON ep.expected_publication_id = rm.expected_publication_id
JOIN r.ice_publication_evidence ipe ON ipe.ice_publication_evidence_id = rm.matched_evidence_id
JOIN c.client cli ON cli.client_id = ep.client_id
WHERE rm.matcher_run_id = (SELECT reconciliation_run_id FROM r.reconciliation_run
                            WHERE triggered_by='cc-0010C-stage-e-first' LIMIT 1)
ORDER BY rm.created_at ASC
LIMIT 5;
```

**PASS:** for each sampled row:
- `matched_evidence_kind = 'ice'`, `matched_match_tier = 1`, `matched_confidence = 1.000`.
- `matcher_run_id = created_by_run_id = updated_by_run_id` (R2 stamping consistent).
- `ep.expected_status = 'matched'`, `ep.matched_match_id = rm.reconciliation_match_id`, `ep.matched_at IS NOT NULL`.
- `ipe.pipeline_state = 'published'`, `ipe.published_at IS NOT NULL`.
- `delta_minutes_late >= 0` and `<= 60` (global default tolerance).

Any row failing → SURFACE for chat review + PK decision (likely revert via §10.3).

---

## §7. Gate sequence

### 7.1 Sequencing across stages

1. **This commit** — brief frozen on main at the SHA returned by the commit operation.
2. **CCD narrow review** — D-01 fired against the frozen brief SHA; verdict captured.
3. **PK approval phrase** — explicit approval to begin Stage B authoring.
4. **Stage B authoring** — CC (or chat under PK reassignment) writes EF source to feature branch; chat fires Stage B D-01 reviewing diff; PK approves; merge.
5. **Stage C deploy** — CLI or MCP path; V8 PASS; chat fires Stage C D-01 close-the-loop.
6. **Stage D cron** — `apply_migration cc_0010c_pg_cron_reconciliation_matcher`; V9 PASS.
7. **Stage E first invocation** — manual or cron-fire-equivalent (L43); V10–V14 PASS.
8. **Result file commit** + **4-way sync close** → cc-0010C CLOSED → cc-0010 parent closure declarable.

### 7.2 Gate enforcement

- No Stage B source written until step 3 lands.
- No Stage C deploy until Stage B merge + V8 pre-flight re-verify within 60s.
- No Stage D cron until Stage C V8 PASS.
- No Stage E invocation until Stage D V9 PASS.
- Each stage carries its own pre-flight re-run + D-01 + PK approval phrase + V-check cycle.

---
## §8. D-01 packet templates (4 fires total: B, C, D, E)

### 8.1 Stage B D-01 packet contents

- `decision_under_review`: "Merge feature branch `feat/cc-0010C-reconciliation-matcher` to main."
- `production_action_if_approved`: FF-merge or no-FF merge per repo policy; main HEAD advances; `supabase/functions/reconciliation-matcher/` becomes part of main; `supabase/config.toml` gains the new EF entry.
- `current_evidence`: branch HEAD SHA, blob SHAs for new files, diff summary, line counts, grep checklist results (`r.platform_observation` not referenced; `r.platform_manual_observation` not referenced; no `matched_evidence_kind` literal other than `'ice'`; no `matched_match_tier` literal other than `1`; no `expected_status = 'late'` write; `WHERE override_by IS NULL` clause present in upsert).
- `known_weak_evidence`: untested in production until Stage C deploy; CC's TypeScript may have lint warnings non-blocking; Supabase service-role JWT path not yet exercised against new tables.
- `action_type`: `plan_review`.

### 8.2 Stage C D-01 packet contents

- `decision_under_review`: "Deploy `reconciliation-matcher` to production (`mbkmaxqhsohbtwsqolns`)."
- `production_action_if_approved`: EF becomes live + reachable; cold-start invocations possible from this moment.
- `current_evidence`: main HEAD SHA equals the merge SHA from Stage B; deploy ref captured; CLI vs MCP path noted.
- `action_type`: `production_deploy` (KOI-02 may route to `plan_review`).

### 8.3 Stage D D-01 packet contents

- `decision_under_review`: "Apply migration `cc_0010c_pg_cron_reconciliation_matcher` (creates cron job `reconciliation_matcher_30min`)."
- `production_action_if_approved`: new row in `cron.job`; first cron fire occurs within 0–30 min after apply depending on wall-clock; that first fire becomes the Stage E observation candidate (L43 pathway).
- `current_evidence`: vault row CRON_SECRET still present (§4.9 PASS); no jobname collision (§4.10 PASS); cron 83 still active.
- `action_type`: `sql_destructive` (KOI-02 may route to `plan_review`).

### 8.4 Stage E D-01 packet contents

- `decision_under_review`: "Fire first manual invocation of `reconciliation-matcher`."
- `production_action_if_approved`: M new rows in `r.reconciliation_match` + M status transitions on `r.expected_publication` + 1 new `r.reconciliation_run` row.
- `current_evidence`: §4 pre-flight bundle; baseline counts; matcher_config defaults verified.
- `action_type`: `production_invocation` (KOI-02 may route to `plan_review`). If cron-fire-equivalent variance is being accepted instead, the packet captures that PK directive explicitly.

---

## §9. Risk catalog

1. **F-CC-0010C-TIER-SCOPE-CREEP** — CC matcher source references `r.platform_observation` or `r.platform_manual_observation`. Mitigation: §8.1 grep checklist; chat HALTs at Stage B D-01 if any match.
2. **F-CC-0010C-LATE-TRANSITION-PREMATURE** — CC matcher source writes `expected_status='late'` despite §1.2 deferral. Mitigation: §8.1 grep; HALT.
3. **F-CC-0010C-OVERRIDE-CLAUSE-MISSING** — D-21 hard lock not encoded in UPSERT. Mitigation: §8.1 grep for `override_by IS NULL`; HALT if missing.
4. **F-CC-0010C-CHECK-PAIR-RACE** — `r.expected_publication.expected_status` flipped to `matched` before `matched_match_id` is set; CHECK violation. Mitigation: §5.2 step 6 → step 7 ordering inside the same EF transaction; V13 second query enforces 0 violations.
5. **F-CC-0010C-CRON-OFFSET-DRIFT** — DST-aware Sydney-local cron expression accidentally introduced. Mitigation: §5.7 fixed UTC anchor literal; V9 verifies `schedule='15-59/30 * * * *'`.
6. **F-CC-0010C-DELTA-COMPUTATION-NEGATIVE** — `delta_minutes_late` allowed to be negative (early publish). Mitigation: §5.2 step 3 `GREATEST(0, ...)`.
7. **F-CC-0010C-MATCHER-WRITES-DURING-MATERIALISER** — matcher fires while materialiser is mid-write on `r.ice_publication_evidence`. Mitigation: 15-min cron offset; both EFs idempotent at row level; materialiser typical duration 3.5 sec.
8. **F-CC-0010C-RUN-ID-NULL** — R2 stamping omitted on rows. Mitigation: §5.2 step 6 explicit assignment; V12 `missing_run_id_count = 0`.
9. **F-CC-0010C-MATCHER-CONFIG-MISS** — lookup returns 0 rows (e.g. global default row deleted between cc-0010A close and Stage E). Mitigation: §4.8 pre-flight at Stage E open.
10. **F-CC-0010C-CONNECTION-POOL-EXHAUSTION** — large horizon + many candidate rows + per-row SELECT-then-UPSERT pattern triggers connection saturation. Mitigation: matcher source uses single service-role connection with sequential per-row processing; if scale becomes a problem post-v1, batch SELECT pattern is a v2 amendment.
11. **F-CC-0010C-PROCESSED-VS-INSERTED-COUNT-DRIFT** — `rows_processed != rows_inserted + rows_updated + rows_skipped`. Mitigation: V10 + V11 cross-check.
12. **F-CC-0010C-CRON-FIRE-BEFORE-MATERIALISER** — wall-clock skew causes matcher cron to fire before materialiser cron in a given hour. Mitigation: 15-min offset is empirically safe given measured 3.5-sec materialiser duration; matcher tolerates empty evidence (rows_inserted=0 is PASS-with-empirical-observation per L43).

---

## §10. Rollback / no-op / halt logic

### 10.1 No-op conditions

- §4 pre-flight surfaces 0 evidence rows in `pipeline_state='published'` AND 0 candidate expected rows → Stage E completes with `rows_inserted=0`; PASS-with-empirical-observation per L43.

### 10.2 HALT codes

- a–e: §4.1 booleans/counts fail
- f: §4.2 FK missing
- g: §4.3 EF or config.toml entry already present
- h: §4.4 migration name collision
- i: §4.8 matcher_config drift
- j: §4.9 vault row drift
- k: §4.10 jobname collision
- l: §4.10b unexpected trigger on write target
- m: V12 hygiene fail
- n: V13 check_pair_violations > 0
- o: V14 sanity sample row diverges
- p: §5.2 step 7 UPDATE returns 0 rows when step 6 returned a reconciliation_match_id (status-transition consistency fault)

### 10.3 Rollback paths

- **Stage B revert**: PR revert on feature branch; reverse merge; main HEAD rolls back.
- **Stage C revert**: re-deploy previous version via `supabase functions deploy reconciliation-matcher --no-verify-jwt` against a prior commit ref OR feature-branch revert + redeploy.
- **Stage D revert**: `SELECT cron.unschedule('reconciliation_matcher_30min');`. Idempotent.
- **Stage E revert**: under PK approval, `DELETE FROM r.reconciliation_match WHERE matcher_run_id = $1` followed by `UPDATE r.expected_publication SET expected_status = COALESCE(prior_status, 'expected'), matched_match_id = NULL, matched_at = NULL WHERE expected_publication_id IN (...)`. The prior_status capture requires a pre-Stage-E snapshot — see §10.4.

### 10.4 Pre-Stage-E snapshot recommendation (for reversibility)

Before Stage E first invocation, capture:
```sql
CREATE TEMP TABLE _cc0010c_pre_stage_e_snapshot AS
SELECT expected_publication_id, expected_status, matched_match_id, matched_at
FROM r.expected_publication
WHERE expected_status IN ('expected','backfilled');
```
Used at §10.3 Stage E revert only if PK directs revert. Default disposition: snapshot taken; never used.

---

## §11. Result file convention

Path: `docs/briefs/results/cc-0010C-reconciliation-matcher.md`. Created at FINAL stage close. Twelve-section template inherited from cc-0010A/B result file shape. Captures:
- Stage B+C+D+E commit/migration/deploy/jobid/run_id identifiers and timestamps.
- L42/L43/L44/L45/L46 reification narrative.
- Empirical row counts and V-check verdicts.
- PRV-1 close gate criterion 3 satisfaction declaration.
- Lessons-candidate disposition.

---
## §12. Stop condition + sequencing reminders

### 12.1 Stop condition

cc-0010C v1 is AUTHORED at this commit and CLOSED at result-file commit after Stage E V14 PASS. No automatic advancement; each stage waits on its gate.

### 12.2 Sequencing reminders (until each stage's gate clears, cc-0010C must NOT):

- Author Stage B source.
- Deploy any EF.
- Schedule any cron.
- Invoke any EF.
- Write to `r.reconciliation_match` or `r.expected_publication` outside the EF Stage E path.
- Touch `r.platform_observation` / `r.platform_manual_observation` / `r.platform_observer_health` in any form.
- Implement Tier 2–5 logic.
- Implement `late` status transition.
- Modify cc-0010A or cc-0010B artefacts.
- Mutate `m.chatgpt_review` beyond 4 stage close-the-loop UPDATEs.
- Direct-push to `main` for Stage B.
- Use DST-aware cron expressions.
- Use GUC-based secret sourcing.

Violation → HALT immediately + report to PK.

---

## §13. Unresolved assumptions / Open questions for PK direction

1. **Stage E sequencing mechanism** — manual `net.http_post` via `execute_sql` OR cron-fire-equivalent (L43 pathway used at cc-0010B close). PK direction at Stage E D-01.

2. **First-invocation timing** — fire Stage E manually after Stage D apply, OR wait for the next natural cron tick at the upcoming `:15` or `:45`. The latter requires no manual MCP call and is the cleanest L43-equivalent. PK direction at Stage D D-01 (since it determines whether Stage E is a separate gate or folds into the first-cron-fire observation).

3. **`late` status transition deferral** — cc-0010C v1 matched-only per parent §Unresolved Assumption #6; rows whose evidence shows `delta_minutes_late > minutes_late_tolerance` stay in `expected`. Three paths: (a) ship matched-only in v1 (chat default; this brief's path); (b) amend to cc-0010C v2 adding `late` transition before Stage B; (c) defer to cc-0011 cadence-drift-checker. PK direction before Stage B D-01.

4. **Backfill against historical evidence** — cc-0010C operates on the today-forward horizon. If historical `r.expected_publication` rows accumulate without matches, they sit at `expected` forever. PK may direct a one-off backfill invocation with `backfill_days > 0` after Stage E close; out of v1 scope.

5. **Telemetry / observability** — cc-0010C v1 logs to console (visible via Supabase EF logs) and writes audit rows to `r.reconciliation_run`. No dedicated alerts on `status='failed'`. PRV-5 Triage Inbox is the proper home; cc-0010C v1 emits the data, downstream surfaces consume it.

6. **`r.matcher_config` per-client overrides** — out of scope for cc-0010C v1; v1 only ever resolves the (NULL, NULL) global default. When per-client overrides land (future cc-NNNN), this brief's §5.2 step 2 lookup order is the consumer pattern.

7. **Resilience to cc-0010B materialiser bugs** — if a materialiser bug leaves `r.ice_publication_evidence` rows with `pipeline_state='published'` but `published_at IS NULL`, matcher's §5.2 step 3 returns NULL → `delta_minutes_late=NULL` written. §4.6 surfaces `without_published_at` count; if > 0, surface to PK before Stage E and consider deferring Stage E until cc-0010B emits the missing field. Default: log + surface; do not block.

8. **First cron-fire empirical learning** — cc-0010B taught that the first 3 cron fires can fail on a defect (F4 path (b)) before being caught. cc-0010C's first cron fire (whether at Stage E first-fire-equivalent or post-Stage-E manual) should be observed within the same session, not left for next-session discovery. Chat default: hold session open through the first natural cron fire post-Stage-D apply.

---

## §14. Ready status

**cc-0010C v1 is AUTHORED.** No D-01 fired. No production mutation. Brief is docs-only.

**Next gate:** CCD narrow review of this brief at its frozen-on-main SHA; verdict captured; PK approval phrase to begin Stage B authoring.

**Pre-conditions for next gate (all met at this commit):**
- cc-0010A v1.5 APPLIED + CLOSED ✓
- cc-0010B CLOSED-WITH-VERIFIED-VARIANCE ✓
- v2.68 sync state captured ✓
- Parent brief and both sibling briefs frozen on disk ✓
- PRV-0 v2 design lock unchanged ✓
- Vault row CRON_SECRET still resolvable (assumed; §4.9 re-verifies at Stage D) ✓
- Cron job 83 (cc-0010B materialiser) firing and producing rows ✓

---

*Brief authored 2026-05-13 Sydney by chat (Claude). v1 inputs: PRV-0 v2 design lock at authority commit; parent brief cc-0010 v1 (full body restored at `5d92e77`); cc-0010A v1.5 brief; cc-0010B v1.3 brief; v2.68 close session log; L33+L34+L35+L36+L37+L38(vindicated)+L41+L42+L43+L44+L45+L46+L48+L49+L52+L53 lesson lineage; F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) folded into matcher horizon contract; D-21 hard lock baked into §5.2 step 6 + §6 V12 + §9 risk 3 + §10.2 HALT + §12.2 forbidden actions; R1 trigger inventory probe at §4.10b; R2 run-id stamping at §5.2 + V12 + V14. v1 output: 4-stage gated build plan (B-C-D-E; A delivered upstream in cc-0010A) inheriting cc-0010B v1.3 pattern; 1 new Edge Function + 1 new cron job + Tier 1 ICE matching producing M rows in r.reconciliation_match plus M corresponding status transitions on r.expected_publication. Apply sequence requires 4 sequential D-01 fires + 4 PK approval phrases + V8 + V9 + V10–V14 + 4 close-the-loop UPDATEs. cc-0010C v1 remains AUTHORED ONLY. No D-01. No apply. No production mutation. Re-authored from durable v2.68 artefacts per PK directive 2026-05-13 after the prior in-session draft was confirmed non-persisted.*