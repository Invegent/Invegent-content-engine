# Brief cc-0010 — `r.*` second-wave tables + `r.matcher_config` + `r.compact_raw_json` helper + `r.expected_publication.matched_match_id` FK re-add + ice-evidence-materialiser EF + reconciliation-matcher EF Tier 1 only (PRV-1 third build)

**Created:** 2026-05-11 Sydney
**Last patched:** 2026-05-12 Sydney (split decision note added; full v1 body restored)
**Author:** chat (Claude)
**Executor (per stage — explicit per CCH directive R1 + R11 carried forward from cc-0009):**

| Stage | Owner | Mechanism |
|---|---|---|
| **A — DDL migration** (6 new tables + helper + ALTER FK re-add + k.* registry UPSERTs + matcher_config default) | **chat (ChatGPT-operated)** | Supabase MCP `apply_migration` |
| **B — EF source + `supabase/config.toml`** (2 EFs: ice-evidence-materialiser + reconciliation-matcher) | **CC / Claude Code** | git commit to feature branch → diff review → PK approval → merge (CCH R11 carried; NO direct-push to main) |
| **C — EF deploy** (2 EFs, sequenced: ice-evidence-materialiser first, then reconciliation-matcher) | **CC / Claude Code** | PowerShell `supabase functions deploy --no-verify-jwt` for each EF |
| **D — pg_cron schedules** (2 cron jobs: `ice_evidence_materialiser_30min` + `reconciliation_matcher_30min`) | **chat (ChatGPT-operated)** | Supabase MCP `apply_migration` (vault-backed secret sourcing per cc-0009 L42 pattern) |
| **E — first on-demand invocations** (2 invocations sequenced: materialiser then matcher) | **chat (ChatGPT-operated)** | Supabase MCP `execute_sql` (RPC-style `net.http_post`) × 2 |

**SUPERSEDED-BY (execution):** **cc-0010A + cc-0010B + cc-0010C** per L48 Atomicity Gate split decision 2026-05-12 — see `## Split decision (PK approved 2026-05-12)` below. v1 scope contract preserved fully inline as authoritative reference; execution flows through the three sub-briefs. CCD-corrected divergences from v1 DDL (no `is_stale` STORED column, `UNIQUE NULLS NOT DISTINCT` on `r.matcher_config`, plain `platform_obs_recent` index, PG15 + cross-schema PK-column probes) live in **cc-0010A v1.2** at `docs/briefs/cc-0010A-r-reconciliation-ddl-foundation.md`. Where the v1 DDL below differs from the cc-0010A v1.2 corrected DDL, **cc-0010A v1.2 is the authoritative apply text**.

**CCD / any other Claude Code instance remains read-only unless PK explicitly reassigns.** Stage B + C are the only explicit CC reassignments in cc-0010. No autonomous Cowork loop participates in cc-0010 apply gating. **Stage B never direct-pushes to `main`** (CCH R11 lock carried).

**Cron schedule (CCH R14 fixed UTC anchor carried):** Stage D installs `*/30 * * * *` UTC (every 30 minutes) for both EFs as **fixed UTC anchors** — no DST-aware Sydney-local shifting. PRV-0 §D-19 says "every 30 minutes" for both materialiser + matcher.

**Vault-backed secret sourcing (L42 pattern from cc-0009 Stage D vault pivot):** Both new cron jobs source `CRON_SECRET` from `vault.decrypted_secrets WHERE name='CRON_SECRET' LIMIT 1` (NOT from `current_setting('app.settings.cron_secret', true)`). The vault row was created in cc-0009 Stage D vault pivot (id `0fede5c3-f92c-4bd6-8837-c0e304dfca4c`); same secret reused.

**Status:** drafted v1 — **planning + documentation only per PK directive 2026-05-11.** **SUPERSEDED-BY cc-0010A + cc-0010B + cc-0010C for execution per 2026-05-12.** No `apply_migration`, no EF deploy, no cron enable, no RPC invocation, no D-01 fire until each sub-brief's gate cycle (pre-flight re-verify → D-01 → PK approval phrase → apply → V-checks → close-the-loop).

**Authority:** PRV-0 design lock v2 — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7`.
**Source design sections:** PRV-0 v2 §3.1 (schema grants — already applied in cc-0009 Stage A; cc-0010 references only), §3.4 (r.ice_publication_evidence), §3.5 (r.platform_observation), §3.6 (r.platform_manual_observation), §3.7 (r.reconciliation_match), §3.9 (r.platform_observer_health), §4.3 (r.compact_raw_json), §5.2 (ice-evidence-materialiser), §5.4 (reconciliation-matcher), §6 (matching engine — Tier 1 only in cc-0010), §6.3 (r.matcher_config), §8.3 (cc-0010 scope contract), §8.5 (PRV-1 close gate).
**Lineage:** inherits cc-0009 v2.1 brief — commit `ae301a92`; result file at SHA `0f6873f8` documents Stages A+B+C+D+E all CLOSED on 2026-05-11; `r.expected_publication` populated with 84 rows; `r.reconciliation_run` audit trail live; cron job 82 firing daily. Lessons L33+L34+L35+L36+L37 (vindicated)+L41 (vindicated)+L42 (new candidate)+L43 (new candidate) carried forward. F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY follow-up addressed in this brief per PK chat-recommended Option (a) — see §Lineage + §Design intent.
**Result file:** `docs/briefs/results/cc-0010-r-reconciliation-evidence-and-matcher.md` (created on completion of FINAL stage; intermediate stages may emit interim result fragments per stage close). **Note (post-split 2026-05-12):** with the split, sub-briefs may emit their own result files (`cc-0010A`, `cc-0010B`, `cc-0010C`). Parent result file may be a thin index summarising all three OR may be omitted in favour of sub-brief result files.

---

## Patch history

- **2026-05-11 Sydney — v1** (initial draft; planning only). Authored after cc-0009 PRV-1 second build COMPLETE (v2.65). 5-stage gated build plan inherits cc-0009 pattern. cc-0009 stages A+B+C+D+E closed; cron job 82 firing daily; `r.expected_publication` populated with 84 rows. **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) folded into this brief**: cc-0010 verification + matcher logic assumes EF forward-only weekday-filtered emission as the reference baseline; brief V10d-equivalent derivation patterns use today-forward windows. Cross-brief FK re-add for `r.expected_publication.matched_match_id` lifts L38 candidate to empirical vindication.
- **2026-05-12 Sydney — split decision note added; full v1 body retained** (doc-only; scope unchanged). L48 Atomicity Gate result recorded; brief marked SUPERSEDED-BY cc-0010A + cc-0010B + cc-0010C for execution. v1 sections below remain authoritative scope reference; sub-briefs inherit per-section. Initial doc commit `60c3202f` abbreviated the body; PK rejected the abbreviation; follow-up commit restores the full v1 body inline per PK directive.

---

## Split decision (PK approved 2026-05-12)

cc-0010 v1 was authored as a 5-stage atomic brief (Stages A–E). L48 Atomicity Gate (v2.66) was applied at pre-cc-0010A gating; result: **brief splits**.

### Atomicity Gate result

| Q | Question | Answer |
|---|---|---|
| Q1 | Can this brief succeed or fail as one atomic unit? | **no** — five stages produce durable independent production state across mixed actors (chat: A+D+E; CC: B+C). Stage failures leave partial state. |
| Q2 | More than 3 unresolved assumptions at brief approval? | **yes** — 8 explicitly enumerated in `## Unresolved assumptions` section below. |
| Q3 | Would a late-stage failure force rollback of earlier stages? | **no** — per-stage rollback paths defined in §10; L43 "closed with verified variance" pathway available for Stage E zero-evidence-rows case. |

**2 of 3 → split.**

### Final split (PK approved 2026-05-12)

| Sub-brief | Scope | Maps to v1 stages |
|---|---|---|
| **cc-0010A** | DDL / schema / catalog / FK / helper / default config only | Stage A only |
| **cc-0010B** | `ice-evidence-materialiser` end-to-end (source + deploy + cron + first invocation) | Stages B+C+D+E for materialiser EF only |
| **cc-0010C** | `reconciliation-matcher` end-to-end (Tier 1 only) — source + deploy + cron + first invocation; depends on cc-0010B evidence rows | Stages B+C+D+E for matcher EF only |

**Cron scheduling folds into each EF-owned sub-brief (cc-0010B owns the materialiser cron; cc-0010C owns the matcher cron). No orphan cron-only sub-brief.**

### Dependencies between sub-briefs

```
cc-0010A (DDL foundation)
   ├──► cc-0010B (materialiser; reads m.* pipeline, writes r.ice_publication_evidence)
   │       └──► cc-0010C (matcher; reads r.ice_publication_evidence, writes r.reconciliation_match)
```

cc-0010C cannot begin Stage E first invocation until cc-0010B has produced at least one evidence row (otherwise matcher writes zero match rows — valid but not informative for V-checks).

### Brief content carry from cc-0010 v1

The following sections of cc-0010 v1 carry into the sub-briefs verbatim where applicable:

- §Lineage / inheritance from cc-0009 → cc-0010A
- §Source context → split per sub-brief
- §Allowed/Forbidden actions → re-scoped per sub-brief
- §1 Pre-flight verification — §1.1–§1.7 carry to cc-0010A; §1.8–§1.13 carry to cc-0010B/C as appropriate
- §2 Proposed DDL → cc-0010A in full (with CCD-corrected divergences in v1.2)
- §3 k.* registry UPSERTs → cc-0010A in full
- §4 EF source for materialiser → cc-0010B
- §4 EF source for matcher → cc-0010C
- §5 Cron schedule for materialiser → cc-0010B
- §5 Cron schedule for matcher → cc-0010C
- §6 V-checks → split: V1–V7 → cc-0010A; V8a, V9 (materialiser cron), V10–V11 → cc-0010B; V8b, V9 (matcher cron), V12–V14 → cc-0010C
- §Risk catalog → cc-0010A inherits + extends with stored-generated-column volatility risk (cc-0010A v1.1 CCD correction) + NULL-uniqueness risk (cc-0010A v1.1 CCD correction)

### v1 brief disposition

cc-0010 v1 at commit `cfee0814` (file blob SHA) remains the authoritative scope reference. Full v1 body is preserved inline below this section. Apply happens via sub-briefs cc-0010A/B/C. Where v1 DDL conflicts with CCD-corrected cc-0010A v1.2 DDL, the sub-brief is the authoritative apply text — see `## Lineage` note above and cc-0010A v1.2 Patch history for the specific corrections.

---

## Lineage (PK directive 2026-05-11)

This brief inherits directly from cc-0009 v2.1. The following are not repeated assumptions but explicit predicates:

1. **`r.*` schema is live**: cc-0009 Stage A applied `cc_0009_r_schema_and_helpers` creating schema `r` with grants. cc-0010 references this schema; does NOT re-create it.
2. **2 existing r.* tables**: `r.reconciliation_run` (4 rows) and `r.expected_publication` (84 rows) are in place.
3. **2 existing r.* helpers**: `r.normalise_text` (cc-0009 v2 narrowed contract per R7 — lowercase + collapse whitespace + trim + preserve unicode; **no expansion in cc-0010**) and `r.to_sydney_local_date` (PRV-0 §4.2 verbatim).
4. **Existing FK pattern**: `r.expected_publication.matched_match_id` declared as bare `uuid` (no REFERENCES) in cc-0009 Stage A per CCH R10 cross-brief FK deferral (L38 candidate). cc-0010 Stage A re-adds this FK via `ALTER TABLE ... ADD CONSTRAINT ...` after `r.reconciliation_match` is created. **L38 candidate empirical vindication occurs at Stage A close.**
5. **Existing cron pattern**: cron job 82 `cadence_rule_generator_daily` at `5 16 * * *` UTC sources `CRON_SECRET` from `vault.decrypted_secrets WHERE name='CRON_SECRET' LIMIT 1` (per cc-0009 Stage D vault pivot, L42 candidate). cc-0010 Stage D follows the SAME vault-backed pattern for both new cron jobs.
6. **Existing EF deploy pattern**: cc-0009 Stage B+C delivered cadence-rule-generator via feature branch + diff review + PK approval + merge (CCH R11; L39 vindicated). cc-0010 Stage B+C follows the SAME workflow for ice-evidence-materialiser + reconciliation-matcher.
7. **Lessons reified across cc-0009**:
   - **L33** — `pg_event_trigger` survey mandatory in pre-flight (§1.6 of this brief covers).
   - **L34** — `k.fn_sync_registry` auto-inserts stub k.* rows on CREATE TABLE; cc-0010 Stage A §3.6+§3.7 UPSERTs upgrade in-place.
   - **L35** — `INSERT ... ON CONFLICT DO UPDATE` for k.* registry rows (used verbatim).
   - **L36** — `m.chatgpt_review.chatgpt_review_status_check` enum `{pending, completed, failed, escalated, resolved}`; close-the-loop UPDATE maps to `status='resolved'`.
   - **L42** — vault-backed secret sourcing for cron commands (carried into Stage D for both new cron jobs).
   - **L43** — "closed with verified variance" pathway available if Stage E first invocations diverge from pre-flight envelope; brief explicitly enumerates acceptance + reconciliation options.
8. **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) folded** (PK chat-recommended, confirmed at cc-0010 brief authoring): cc-0010 verification + matcher logic assumes deployed EF emits today-forward-only weekday-filtered rows. cc-0009 brief itself is NOT mutated by cc-0010 (cc-0009 brief is frozen at commit `ae301a92`); the alignment lives in cc-0010 §6 V10-equivalent derivations.

---

## Investigation record

**Trigger:** cc-0009 PRV-1 second build COMPLETE 2026-05-11 (v2.65 close). `r.expected_publication` populated with 84 rows; matcher (cc-0010) is the natural next step to convert those expected rows into matched/missing/late status via ICE pipeline evidence. PK directive 2026-05-11: author cc-0010 v1 brief under standard CCH → CCD → PK gate model. Phase 0 / PRV-1 close gate (§8.5 of PRV-0) requires Tier 1 (ICE evidence) matcher to be running before PRV-1 closure can be declared.

**Why now:** Without cc-0010, the 84 rows in `r.expected_publication` remain in `expected_status='expected'` forever — no transition to `matched|missing|late|observed_no_ice`. The reconciliation surface is half-built: prediction layer (cc-0009) live but no evidence/matching layer. PRV-1 close gate cannot be evaluated. cc-0011 (cadence-drift-checker + matrix views) cannot start because it consumes `r.reconciliation_match` output. PRV-2/3/4 (per-platform observers) cannot start because they target `r.platform_observation` which doesn't exist yet.

**Delivers (when ALL stages complete):**
1. 6 new tables in schema `r`:
   - `r.ice_publication_evidence` (PRV-0 §3.4) — ICE pipeline evidence per expected row
   - `r.platform_observation` (PRV-0 §3.5) — platform-side API observations
   - `r.platform_manual_observation` (PRV-0 §3.6) — human-submitted observations
   - `r.reconciliation_match` (PRV-0 §3.7) — match record per expected row
   - `r.platform_observer_health` (PRV-0 §3.9) — health summary per (client, platform)
   - `r.matcher_config` (PRV-0 §6.3) — tolerance defaults + 1 global default row insert
2. 1 new helper function: `r.compact_raw_json(jsonb) RETURNS jsonb` (PRV-0 §4.3).
3. 1 ALTER TABLE re-adding deferred FK: `r.expected_publication.matched_match_id REFERENCES r.reconciliation_match(reconciliation_match_id) ON DELETE SET NULL` (lifts L38 candidate to empirical vindication).
4. 1 UPDATE on `k.column_registry` flipping `r.expected_publication.matched_match_id` to `is_foreign_key=true` post FK ALTER.
5. Doc-catalog rows in `k.table_registry` (6 UPSERTs) + `k.column_registry` (UPSERTs across all 6 tables, trigger-aware ON CONFLICT per L35).
6. 2 new Edge Functions (TypeScript, Deno) deployed with `verify_jwt=false` declared in `supabase/config.toml`:
   - `ice-evidence-materialiser` (PRV-0 §5.2) — reads pipeline state, populates r.ice_publication_evidence
   - `reconciliation-matcher` (PRV-0 §5.4 + §6, **Tier 1 only in cc-0010**) — reads ice_publication_evidence + expected_publication, upserts reconciliation_match with `matched_evidence_kind='ice', matched_match_tier=1, matched_confidence=1.000`. Tiers 2-5 deferred to PRV-2/3/4 once observers exist.
7. 2 new pg_cron jobs at `*/30 * * * *` UTC (every 30 minutes) per PRV-0 §D-19:
   - `ice_evidence_materialiser_30min` calling ice-evidence-materialiser EF
   - `reconciliation_matcher_30min` calling reconciliation-matcher EF
   Both vault-backed (L42 pattern).
8. 2 first on-demand invocations producing initial rows in `r.ice_publication_evidence` + `r.reconciliation_match` from the 84 `r.expected_publication` rows already populated by cc-0009 Stage E.
9. `r.matcher_config` 1 global default row (NULL client_id, NULL platform, minutes_late_tolerance=60, caption_prefix_length=60, same_day_window_hours=24, fuzzy_levenshtein_threshold=0.850 — PRV-0 §6.3 verbatim).

**Does NOT deliver (out of cc-0010 scope; deferred to cc-0011 / PRV-2/3/4):**
- `r.cadence_drift_log` (cc-0011).
- `cadence-drift-checker` EF (cc-0011).
- Materialised views `r.mv_reconciliation_daily_matrix` + `r.mv_observer_freshness_summary` (cc-0011).
- Per-platform observer EFs `facebook-observer` / `instagram-observer` / `linkedin-observer` / `youtube-observer` (PRV-2/3/4).
- Tier 2-5 matching logic in reconciliation-matcher (depends on per-platform observers populating `r.platform_observation` / `r.platform_manual_observation`).
- Manual observation UI / CSV import full UX (PRV-2 brief; cc-0010 includes a minimal one-off CSV import RPC per PRV-0 §8.3 if scope-justified — see Unresolved Assumption #2 below).
- Triage Inbox UX (PRV-5).
- Auto-remediation rules (PRV-6+).
- Dashboard surfaces (PRV-2 / PRV-5 / PRV-6).
- `r.normalise_text` expansion for caption similarity (Tier 4/5 fuzzy matching) — cc-0009 R7 lock holds; future brief revision required when PRV-2/3/4 observers exist.
- DST-aware Sydney-local cron rescheduling (CCH R14 fixed UTC anchor lock holds).
- F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY follow-up reconciliation — Option (a) **folded into this brief's matcher/verification logic** but does NOT mutate the cc-0009 brief itself (cc-0009 brief frozen at commit `ae301a92`).

**Class:** Build-class brief, multi-stage, multi-actor. **5 stages, each with its own gate cycle.** Follows cc-0009 5-stage pattern A-E.

---

## Design intent

Land the evidence + matching layer of the Platform Reconciliation Subsystem. cc-0009 produced the prediction layer (84 `r.expected_publication` rows for May 11-18 weekday-filtered); cc-0010 produces the evidence (ICE pipeline state → `r.ice_publication_evidence`) and the match (evidence × expected → `r.reconciliation_match` with status transitions on `r.expected_publication`).

At cc-0010 close, the reconciliation surface answers "did ICE successfully publish what its cadence rules predicted?" for clients with healthy ICE pipelines — i.e., Tier 1 (ICE evidence) matching. Platform-side and manual observation evidence (Tiers 2-5) require per-platform observer EFs (PRV-2/3/4) and are out of scope here.

**Why Tier 1 only in cc-0010:** PRV-0 §8.3 mandates this scope. Tier 1 matches deterministically on `expected_publication_id` join to `r.ice_publication_evidence` populated from ICE pipeline state (`m.post_publish.published_at IS NOT NULL`). Tiers 2-5 depend on `r.platform_observation` / `r.platform_manual_observation` which are populated by per-platform observer EFs (PRV-2/3/4) that don't exist yet. Implementing Tier 2-5 logic in cc-0010 without observers would create dead code paths. Better to ship Tier 1 production-ready and add Tier 2-5 alongside the observers that populate the inputs.

**Why ALTER TABLE for FK re-add at Stage A start of cc-0010:** The dependency chain is `r.expected_publication.matched_match_id` → `r.reconciliation_match(reconciliation_match_id)`. cc-0009 created the source side; cc-0010 creates the target side. The FK re-add MUST occur after `r.reconciliation_match` is created within Stage A's single transactional unit. Standard FK re-add pattern (cc-0008 v5 established): drop nothing, just ALTER TABLE ... ADD CONSTRAINT. **L38 candidate empirical vindication.**

**Why ice-evidence-materialiser before reconciliation-matcher (Stage E ordering):** Materialiser populates `r.ice_publication_evidence` from existing pipeline state; matcher reads that table. Running matcher first against an empty evidence table would produce 0 matches (all 84 expected rows would route to `expected_status='missing'` artificially). Sequencing materialiser-then-matcher is mandatory for Stage E correctness. The two cron jobs both fire every 30 min independently and converge over time, but the FIRST invocation must be sequenced.

**Why fold F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) into cc-0010 instead of patching cc-0009:** cc-0009 brief is frozen per ICE-PROC-001 §9.1 at commit `ae301a92`. Modifying cc-0009 retroactively would break the brief-freeze discipline that cc-0009 itself locked in. cc-0010 is a new brief; aligning its verification model to the deployed EF's forward-only-weekday-filtered emission is the cleanest path. Specifically:

- cc-0010 V-checks (§6 V10+V11+V12 equivalents) derive expected row counts assuming today-forward-only weekday emission.
- cc-0010 Stage E first invocation operates on the 84 rows produced by cc-0009 Stage E backfill (all today-forward, May 11-18 weekday-filtered) — no past-portion expected.
- ice-evidence-materialiser EF logic respects this: only materialises evidence for r.expected_publication rows that exist (today-forward window), not for hypothetical historical past rows.
- reconciliation-matcher EF logic similarly only matches against existing r.expected_publication rows.

**No production behaviour changes upstream of cc-0010.** ICE pipeline reads no `r.*` table. cc-0010 is downstream-only from existing pipeline state. Pipeline state IS read by ice-evidence-materialiser (m.post_publish + m.post_publish_queue + m.post_draft + m.slot) but only as read-only data — no writes to `m.*`.

**Why r.compact_raw_json helper now even though cc-0010 doesn't yet populate raw_payload heavily:** PRV-0 §4.3 specifies the helper for use by per-platform observer EFs (PRV-2/3/4) when populating `r.platform_observation.raw_payload`. cc-0010 creates the helper alongside the table it serves, so PRV-2/3/4 briefs can rely on it being present. The keys_to_drop list is hardcoded per PRV-0 §4.3: `['__internal_debug','request_headers','response_headers','full_html']`. Expansion (e.g., based on actual platform payload analysis) is a future-revision concern.

**Why r.platform_observer_health created but empty at cc-0010 close:** Per PRV-0 §8.3, the table is in cc-0010 scope (created + k.* registry) but rows are written by per-platform observer EFs (PRV-2/3/4). cc-0010 creates the empty table; first row appears when first PRV-2/3/4 observer runs.

---

## Blast radius

**Direct write surface (cc-0010 stages combined):**
- 6 new tables in schema `r`: all created with 0 rows except `r.matcher_config` which gets 1 INSERT (global default row).
- 1 new helper function in `r`: `r.compact_raw_json` (idempotent CREATE OR REPLACE).
- ALTER on `r.expected_publication` ADDing FK constraint for matched_match_id; no row data changes.
- 1 UPDATE on `k.column_registry` flipping `is_foreign_key=true` for `r.expected_publication.matched_match_id` post FK ALTER.
- `k.table_registry` (6 UPSERTs; trigger pre-inserts 6 stub rows).
- `k.column_registry` (UPSERTs across all 6 new tables; trigger pre-inserts stub rows + 1 UPDATE for matched_match_id FK flag).
- `supabase/functions/ice-evidence-materialiser/` (NEW directory + index.ts) — feature branch + merge per CCH R11.
- `supabase/functions/reconciliation-matcher/` (NEW directory + index.ts) — feature branch + merge per CCH R11.
- `supabase/config.toml` (added 2 `[functions.<slug>] verify_jwt = false` entries) — feature branch + merge per CCH R11.
- pg_cron `cron.job` table (2 NEW rows: jobids TBD; jobnames `ice_evidence_materialiser_30min` + `reconciliation_matcher_30min`; both at `*/30 * * * *` UTC).
- `r.reconciliation_run` (2 NEW rows from Stage E first invocations: run_type='ice_evidence_materialisation' + run_type='matching').
- `r.ice_publication_evidence` (NEW rows from Stage E first materialiser invocation; expected count derived during verification from live `r.expected_publication` rows that have corresponding ICE pipeline state — see Unresolved Assumption #5 below).
- `r.reconciliation_match` (NEW rows from Stage E first matcher invocation; one row per matched expected_publication; matcher Tier 1 only).
- `r.expected_publication` status transitions: rows with successful Tier 1 matches transition from `expected_status='expected'` to `expected_status='matched'`. `matched_match_id` + `matched_at` populated.

**Read-only surface (no writes):**
- `c.client` (FK target).
- `c.client_publish_profile` (read by materialiser for context).
- `c.client_cadence_rule` (read by matcher for cadence cross-reference).
- `m.post_publish` (read by materialiser; pipeline_state='published' rows).
- `m.post_publish_queue` (read by materialiser; pipeline_state='queued' / 'attempted' / 'failed' rows).
- `m.post_draft` (read by materialiser; pipeline_state='drafted' rows).
- `m.slot` (read by materialiser for slot ↔ expected join logic).
- `m.vw_pipeline_state` (read by materialiser; view).
- `k.*` registry (read by pre-flight).
- `cron.job` + `cron.job_run_details` (read by pre-flight).
- `supabase_migrations.schema_migrations` (read by pre-flight).
- `r.reconciliation_run` (read by matcher for chained-run lineage; written via INSERT only).

**Indirect risk:**
1. **Cross-brief FK re-add fails on existing rows that have invalid `matched_match_id` values.** — But cc-0009 Stage A's CHECK `expected_status_match_pair` ensures `matched_match_id IS NOT NULL` only when `expected_status='matched'`; cc-0009 Stage E produced 0 matched rows (all 84 are expected or suppressed). Therefore at cc-0010 Stage A apply time, `matched_match_id` is uniformly NULL across all 84 rows. ALTER TABLE ADD FK won't fail on data. **Mitigation:** §1.9 pre-flight verifies `SELECT COUNT(*) FROM r.expected_publication WHERE matched_match_id IS NOT NULL = 0`.
2. **k.column_registry FK flag update race with trigger auto-insert.** — Trigger `trg_k_registry_sync_on_create_table` doesn't fire on ALTER TABLE; only CREATE TABLE. So FK flag update is plain UPDATE on existing row. **Mitigation:** §3.7 plain UPDATE WHERE expected_publication match.
3. **ice-evidence-materialiser EF wrong join semantics → wrong evidence rows.** — The materialiser joins `m.post_publish` to `r.expected_publication` via (client_id, platform, scheduled_for date) OR via slot_id. If join is wrong, evidence misattributes pipeline rows to wrong expected rows. **Mitigation:** §6 V10 per-(client, platform) breakdown sample; V11 join verification on first 5 rows.
4. **reconciliation-matcher upserts override manual rows.** — D-21 hard lock: matcher MUST include `WHERE override_by IS NULL` clause. At cc-0010 Stage E first run, 0 manual overrides exist, so this is enforced for forward-compatibility only. **Mitigation:** §4.6 EF spec calls out the WHERE clause explicitly; chat reviews CC's diff against this requirement during Stage B D-01.
5. **Tier 1 matcher transitions expected_status='matched' but cc-0009 leaves it as 'expected'.** — Status transition pattern: matcher UPDATEs `r.expected_publication` SET expected_status='matched', matched_match_id, matched_at WHERE expected_publication_id IN (...). The CHECK `expected_status_match_pair` requires `matched_match_id IS NOT NULL AND matched_at IS NOT NULL` when status='matched'. Order matters: UPSERT `r.reconciliation_match` FIRST, then UPDATE `r.expected_publication` SET expected_status='matched' with non-null matched_match_id. **Mitigation:** §4.6 EF spec sequences these correctly; §6 V13 verifies no CHECK violations.
6. **First materialiser invocation produces 0 evidence rows.** — If `m.post_publish` is empty for the May 11-18 window covered by cc-0009 expected rows, materialiser writes 0 evidence rows; matcher then writes 0 reconciliation_match rows; all 84 expected_publication rows stay in 'expected' status. This is **not necessarily wrong** — it reflects that no posts have actually been published yet within the window. **Mitigation:** §6 V14 explicitly reports the 0-evidence-rows case as PASS-with-empirical-observation; expected_status distribution post-Stage-E confirms `expected` count matches input minus matches found.
7. **`r.compact_raw_json` IMMUTABLE assertion fails.** — The PL/pgSQL body uses array iteration; PostgreSQL should accept it as IMMUTABLE because no side effects, no time-dependent functions, no random functions. **Mitigation:** §3.4 helper test in V3 confirms IMMUTABLE volatility.
8. **EF source on feature branch but unable to merge due to PR conflicts.** — cc-0009 Stage B already added `cadence-rule-generator` entry to supabase/config.toml on main; cc-0010 adds 2 more entries (alphabetised insertion). If main has unrelated config.toml changes after cc-0009, Stage B feature branch needs rebase. **Mitigation:** Stage B D-01 packet includes "main HEAD SHA at branch creation" + "feature branch commit SHA" — chat verifies no main mutations to supabase/config.toml between the two.
9. **Cron schedule collision at `*/30 * * * *` with existing cron jobs.** — §1.10 surveys existing crons at this schedule. **Mitigation:** §1.10 query; HALT path §9.2.h for collision.
10. **Vault-backed secret sourcing fails because vault.secrets row missing.** — Should not happen because cc-0009 Stage D vault pivot created CRON_SECRET (id `0fede5c3-...`). **Mitigation:** §1.11 verifies vault.secrets row still present + resolvable.
11. **`reconciliation-matcher` Tier 1 only logic accidentally implements Tier 2-5 paths.** — Per PRV-0 §8.3, cc-0010 ships Tier 1 ONLY. If CC's EF code includes Tier 2-5 paths even gated behind feature flags, that's scope creep. **Mitigation:** Stage B D-01 packet includes Tier 1-only assertion; chat reviews CC's matcher code for any reference to `r.platform_observation` or `r.platform_manual_observation` (red flag for premature Tier 2+ logic).

**Cost-of-waiting:** Medium. PRV-1 close gate cannot evaluate without Tier 1 matcher running. cc-0011 cannot start. PRV-2/3/4 (per-platform observers) are unblocked but lower-priority. Each day cc-0010 is delayed = +1 day until first matched rows show in dashboard.

---

## Source context

- **PRV-0 v2 design lock** — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7`. Authoritative for §3.4-§3.7, §3.9, §4.3, §5.2, §5.4, §6, §6.3, §8.3, §8.5.
- **cc-0009 v2.1 brief** — `docs/briefs/cc-0009-r-schema-and-cadence-rule-generator.md` commit `ae301a92` blob `df0f027268773a327ef233bfe5d3eaafa023d841`. Direct lineage; pattern template.
- **cc-0009 result file** — `docs/briefs/results/cc-0009-r-schema-and-cadence-rule-generator.md` SHA `0f6873f8`. Documents Stages A+B+C+D+E all CLOSED; `r.expected_publication` populated with 84 rows; F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY follow-up.
- **cc-0008 v5 brief** — transitively inherited via cc-0009 lineage; provides `c.client_cadence_rule` 14-row seed.
- **`r.reconciliation_run`** — 4 rows post-cc-0009 (3 Stage C V5 + 1 Stage E backfill).
- **`r.expected_publication`** — 84 rows post-cc-0009 (72 expected + 12 suppressed across May 11-18 weekday-filtered).
- **`r.normalise_text`** — cc-0009 v2 narrowed contract per R7 (lock holds; no expansion in cc-0010).
- **`r.to_sydney_local_date`** — PRV-0 §4.2 verbatim; DST-aware.
- **`c.client` / `c.client_cadence_rule` / `c.client_publish_profile`** — read-only by cc-0010 EFs.
- **`m.post_publish` / `m.post_publish_queue` / `m.post_draft` / `m.slot` / `m.vw_pipeline_state`** — read-only by ice-evidence-materialiser.
- **`k.table_registry` + `k.column_registry`** — doc-catalog targets per L34.
- **`m.chatgpt_review`** — D-01 audit trail (5 D-01 fires expected; only `m.*` writes permitted per R5).
- **vault.secrets CRON_SECRET** — id `0fede5c3-f92c-4bd6-8837-c0e304dfca4c` (created cc-0009 Stage D vault pivot 2026-05-11 10:18 UTC).
- **F-CRON-PG-NET-TIMEOUT-30S** — `timeout_milliseconds := 30000` is the standard for cron-invoked EF calls.
- **F-EF-DRIFT-PREVENTION** — `supabase/config.toml` is durable source of truth for `verify_jwt`.
- **L33+L34+L35+L36+L37+L38+L41+L42+L43** — cc-0008+cc-0009 reified lessons; carry forward.
- **PRV-0 §6 matcher tier hierarchy** — Tier 1 only in cc-0010; Tiers 2-5 deferred to PRV-2/3/4.
- **D-21 manual override hard lock** — matcher MUST include `WHERE override_by IS NULL` clause; non-negotiable.
- **Memory standing rule on dev workflow** — direct-push-to-main is dev default for Claude Code; cc-0010 v1 follows cc-0009 CCH R11 override for Stage B (feature branch + review + merge required for EF source).
- **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY** — P3 OPEN follow-up; Option (a) folded into cc-0010 (cc-0010 verification + matcher logic assumes EF forward-only weekday-filtered emission as reference baseline).

---

## Scope

**In scope (across 5 stages, with explicit per-CCH-R1 ownership + R11 branch discipline carried from cc-0009):**

| Stage | Component | Owner (R1) | Apply method | Gate |
|---|---|---|---|---|
| **A** | DDL: 6 new tables (`r.ice_publication_evidence`, `r.platform_observation`, `r.platform_manual_observation`, `r.reconciliation_match`, `r.platform_observer_health`, `r.matcher_config`) + 1 helper (`r.compact_raw_json`) + ALTER TABLE re-adding `r.expected_publication.matched_match_id` FK + k.* registry UPSERTs for 6 tables + UPDATE `k.column_registry` for matched_match_id FK flag + `r.matcher_config` global default INSERT | **chat (ChatGPT-operated)** | single `apply_migration cc_0010_r_evidence_and_matcher_schema` | NEW Stage-A D-01 fire + PK approval phrase + §1 final re-verify + V1–V8 PASS |
| **B** | EF source for both EFs: `supabase/functions/ice-evidence-materialiser/index.ts` + `supabase/functions/reconciliation-matcher/index.ts` + `supabase/config.toml` amendment (2 entries) | **CC / Claude Code** | **git commit to feature branch → diff review → PK approval → merge** (CCH R11 — NO direct-push to `main`) | NEW Stage-B D-01 fire (chat fires after CC pushes to feature branch; reviews diff) + PK approval phrase → merge |
| **C** | EF deploys sequenced: `supabase functions deploy ice-evidence-materialiser --no-verify-jwt` then `supabase functions deploy reconciliation-matcher --no-verify-jwt` | **CC / Claude Code** (PowerShell from `C:\Users\parve\Invegent-content-engine`; runs against post-merge `main`) | CLI deploy × 2 sequenced | NEW Stage-C D-01 fire + PK approval phrase + post-deploy verification per EF (`get_edge_function` + manual probe) |
| **D** | pg_cron schedules: 2 cron.job rows at `*/30 * * * *` UTC (every 30 min, fixed UTC anchor per CCH R14) calling each EF via `net.http_post` with vault-backed CRON_SECRET sourcing (L42 pattern) | **chat (ChatGPT-operated)** | `apply_migration cc_0010_pg_cron_evidence_and_matcher` | NEW Stage-D D-01 fire + PK approval phrase + V9 PASS |
| **E** | First on-demand invocations sequenced: ice-evidence-materialiser first (populates r.ice_publication_evidence from m.post_publish for the 84 expected rows in window), then reconciliation-matcher (matches Tier 1 ICE evidence ↔ expected, transitions matched rows from 'expected' to 'matched') | **chat (ChatGPT-operated)** | `execute_sql` (RPC-style `net.http_post`) × 2 sequenced | NEW Stage-E D-01 fire + PK approval phrase + V10–V14 PASS |

**CCD / any other Claude Code instance is read-only by default. Only Stages B + C reassign execution to CC. PK explicit approval would be required to reassign any other stage or admit any other actor. Stage B may NOT direct-push to `main` per CCH R11.**

**Out of scope (defer per PRV-0 v2 §8.3 + §8.4):**
- `r.cadence_drift_log` (cc-0011).
- `cadence-drift-checker` EF + weekly cron (cc-0011).
- Materialised views `r.mv_reconciliation_daily_matrix` + `r.mv_observer_freshness_summary` (cc-0011).
- Per-platform observer EFs (PRV-2/3/4).
- Tier 2-5 matching logic (depends on observers).
- Manual observation CSV import / UI / full UX (PRV-2 brief; see Unresolved Assumption #2).
- Triage Inbox UX (PRV-5).
- Auto-remediation rules (PRV-6+).
- Dashboard surfaces (PRV-2 / PRV-5 / PRV-6).
- `r.normalise_text` expansion (cc-0009 R7 lock).
- M8b separate brief work.
- 5 prior outstanding `m.chatgpt_review` close-the-loop UPDATEs (batch overdue 7 sessions; carry).
- F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY cc-0009 brief mutation (cc-0009 frozen; folded into cc-0010 verification only).
- Memory `recent_updates` v2.55-v2.65 entries (separate; PK explicit deferral).
- Dashboard PHASES reconciliation (carry; 21st consecutive deferral).
- F-CRON-AUTO-APPROVER-SECRET-INLINE (separate; PK approval required).
- DST-aware Sydney-local cron rescheduling (CCH R14 fixed UTC anchor lock).

## Allowed actions

- Read-only `SELECT` against `c.*`, `r.*`, `m.*`, `k.*`, `pg_*`, `information_schema.*`, `cron.job`, `cron.job_run_details`, `supabase_migrations.schema_migrations`, `vault.secrets`, `vault.decrypted_secrets` (read length-only flag, never raw secret) for pre-flight + verification across all stages.
- 5 `ask_chatgpt_review` D-01 fires (one per stage A–E).
- 1 `apply_migration` named `cc_0010_r_evidence_and_matcher_schema` (Stage A): 6 new tables + helper + ALTER FK + k.* registry UPSERTs + matcher_config default INSERT + k.column_registry UPDATE for matched_match_id FK flag, all in one transactional unit per memory standing rule.
- 1 `apply_migration` named `cc_0010_pg_cron_evidence_and_matcher` (Stage D): 2 cron.schedule calls.
- Up to 3 retry attempts on each V-check stage (network/timeout only).
- 5 `m.chatgpt_review` UPDATE post-each-stage (close-the-loop, status='resolved' per L36). **Per R5 carried from cc-0009, these are the ONLY permitted `m.*` writes in cc-0010.**
- 1 commit creating `docs/briefs/results/cc-0010-r-reconciliation-evidence-and-matcher.md` at FINAL stage close.
- 1 commit per 4-way sync close (potentially per-stage at PK directive; default = single commit at FINAL stage).
- Stage B+C (CC owners): **CC commits the EF sources (2 EFs) + `supabase/config.toml` amendment to a feature branch (e.g., `feat/cc-0010-evidence-and-matcher`) per CCH R11, runs diff review, awaits PK approval phrase, then merges to `main`.** Stage C deploy runs against post-merge `main` for both EFs sequentially.
- Stage E (chat owner): 2 sequenced `execute_sql` calls invoking `select net.http_post(...)` against deployed EF URLs for first invocations. Materialiser first, then matcher.

## Forbidden actions

- **No `apply_migration` before each stage's D-01 returns clean agree + PK explicit approval phrase.**
- **No `execute_sql` for any DDL** (memory standing rule). Stage A uses `apply_migration`. Stage D uses `apply_migration` (cron.schedule wraps DDL semantics).
- **No plain `INSERT INTO k.table_registry` or `INSERT INTO k.column_registry`** (L35). All k.* writes via `INSERT ... ON CONFLICT DO UPDATE` (except the lone UPDATE for matched_match_id FK flag, which is plain UPDATE since the row pre-exists from cc-0009 Stage A).
- **No DDL deviation from PRV-0 v2 §3.4/§3.5/§3.6/§3.7/§3.9/§4.3/§6.3** unless §1 pre-flight surfaces a genuine blocker.
- **No Tier 2-5 matcher logic in cc-0010** — Tier 1 only per PRV-0 §8.3. Any reference in matcher source to `r.platform_observation` / `r.platform_manual_observation` reads = scope violation; chat HALTs at Stage B D-01.
- **No EF deploy by chat** — Stage C is CC-only per CCH R1 + memory standing rule.
- **No direct-push to `main` for Stage B** (CCH R11 carried). Stage B EF sources + `supabase/config.toml` MUST land on a feature branch first; merge happens only after diff review + PK approval phrase.
- **No cron schedule cadence outside fixed UTC anchor `*/30 * * * *`** (per PRV-0 §D-19 + CCH R14 lock carried). No DST-aware Sydney-local cron expression.
- **No `verify_jwt: true`** for either new EF (v2.54 lesson carried; custom-header internal cron pattern).
- **No GUC-based secret sourcing** (`current_setting('app.settings.cron_secret', true)`) — cc-0009 KOI-03 proved this doesn't persist on managed-PG. Vault-backed sourcing only (L42 pattern; same vault row `0fede5c3-...` used by cron job 82).
- **No write to `c.*`, `f.*`, `t.*`, `a.*`, `m.*` (beyond R5 close-the-loop)** schemas.
- **No `r.*` table creation beyond the 6 specified** (no `r.cadence_drift_log` — that's cc-0011; no per-platform observer tables — those don't exist as separate tables; observations all funnel into `r.platform_observation`).
- **No `r.*` function creation beyond `r.compact_raw_json`** (`r.normalise_text` + `r.to_sydney_local_date` already exist from cc-0009; no expansion of `r.normalise_text` per R7 lock).
- **No EF deploys outside ice-evidence-materialiser + reconciliation-matcher** (no observers, no cadence-drift-checker, no admin EFs).
- **No cron schedule for any other reconciliation EF** (cc-0011 / PRV-2/3/4).
- **No M8 work, no Phase 0 scheduling, no temp log tables, no F-CRON-AUTO-APPROVER-SECRET-INLINE work.**
- **No proceeding past any stage's D-01 if verdict != `agree` with `proceed`** (or PK explicit Lesson #62 type-(c) state-capture override).
- **No skip of inter-stage gate** (e.g., proceeding to Stage D before Stage C deploy V8 PASS for BOTH EFs).
- **No reassignment of CCD / other Claude Code instances** without PK explicit approval.
- **No matcher invocation against empty r.ice_publication_evidence** at Stage E (sequencing enforces materialiser first).
- **No modification of cc-0009 brief** at commit `ae301a92` (cc-0009 frozen per ICE-PROC-001 §9.1; F-CC-0009 follow-up reconciled in cc-0010 verification logic only).
- **No second cron job creation beyond the 2 specified** — cron job 82 (cc-0009 cadence-rule-generator) is the existing third reconciliation cron; cc-0010 adds 2 (total 3 reconciliation crons after cc-0010 close).

---

## §1. Pre-flight verification (read-only) — TO RUN AT EACH STAGE'S APPLY GATE

All §1.x sub-checks are read-only against production via Supabase MCP `execute_sql`. **Re-run each immediately preceding apply within ~60s** to confirm no drift (P1–P5 discipline per Lesson #61 carried).

### 1.1 cc-0009 outputs still in place (cross-brief verification per PRV-0 §9.2)

```sql
SELECT
  EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='r') AS schema_r_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='reconciliation_run') AS rr_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='r' AND table_name='expected_publication') AS ep_exists,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='r' AND routine_name='normalise_text') AS fn_normalise_exists,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='r' AND routine_name='to_sydney_local_date') AS fn_to_syd_exists,
  (SELECT COUNT(*) FROM r.expected_publication) AS ep_row_count,
  (SELECT COUNT(*) FROM r.reconciliation_run) AS rr_row_count,
  (SELECT COUNT(*) FROM r.expected_publication WHERE matched_match_id IS NOT NULL) AS ep_rows_with_match_id;
```

**Decision rule:** all booleans true; ep_row_count >= 84 (cc-0009 produced 84; cron job 82 may have added more daily forward rows); rr_row_count >= 4 (cc-0009 produced 4); **ep_rows_with_match_id = 0** (critical for FK ALTER — if any row has non-null matched_match_id, the FK to non-existent r.reconciliation_match would fail at ALTER). Drift on any → HALT (§9.2.a-d).

### 1.2 r.* table absence (cc-0010 targets must not pre-exist)

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'r'
  AND table_name IN (
    'ice_publication_evidence', 'platform_observation', 'platform_manual_observation',
    'reconciliation_match', 'platform_observer_health', 'matcher_config'
  );
```

**Decision rule:** 0 rows → PASS. Any row → HALT (§9.2.e prior partial cc-0010 apply).

### 1.3 r.compact_raw_json absence

```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_schema='r' AND routine_name='compact_raw_json'
) AS fn_exists;
```

**Decision rule:** false → PASS. true → SURFACE for PK (function uses CREATE OR REPLACE so idempotent; pre-existence may indicate external drift).

### 1.4 Existing FK status on r.expected_publication.matched_match_id

```sql
SELECT con.conname, pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con
JOIN pg_class t ON t.oid = con.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='r' AND t.relname='expected_publication'
  AND con.contype = 'f'
  AND pg_get_constraintdef(con.oid) LIKE '%matched_match_id%';
```

**Decision rule:** 0 rows → PASS (FK still deferred as expected). Any row → HALT (§9.2.f — FK already added externally).

### 1.5 (Stage A) Migration name uniqueness

```sql
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE name IN ('cc_0010_r_evidence_and_matcher_schema', 'cc_0010_pg_cron_evidence_and_matcher')
ORDER BY name;
```

**Decision rule:** 0 rows → PASS. Any row → HALT (§9.2.g).

### 1.6 (Stage A — L33+L34) Event-trigger survey on `k.*` (carry from cc-0009 §1.6)

```sql
SELECT evtname, evtevent, evtenabled, pg_proc.proname AS function_name
FROM pg_event_trigger
JOIN pg_proc ON pg_proc.oid = pg_event_trigger.evtfoid
JOIN pg_namespace ns ON ns.oid = pg_proc.pronamespace
WHERE ns.nspname = 'k' AND pg_event_trigger.evtenabled IN ('O', 'R', 'A')
ORDER BY evtname;
```

**Decision rule:** Expect (per cc-0009 §1.6 verification): `trg_k_refresh_catalog` + `trg_k_registry_sync_on_create_table`. Both must be `evtenabled` IN ('O', 'R', 'A'). Drift → HALT (§9.2.h).

### 1.7 (Stage A — L34) `k.*` UNIQUE constraints (carry from cc-0009 §1.7)

```sql
SELECT t.relname, c.conname, c.contype, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='k' AND t.relname IN ('table_registry', 'column_registry')
  AND c.contype IN ('p','u','f')
ORDER BY t.relname, c.conname;
```

**Decision rule:** Same as cc-0009 §1.7 — `uq_schema_table` UNIQUE `(schema_name, table_name)`; `uq_table_column` UNIQUE `(table_id, column_name)`; FK CASCADE. Drift → HALT (§9.2.i).

### 1.8 (Stage B+C) Existing EF inventory — no `ice-evidence-materialiser` or `reconciliation-matcher`

Via MCP `list_edge_functions`.

**Decision rule:** neither slug present → PASS. Any present → HALT (§9.2.j idempotency violated).

### 1.9 (Stage B+C) `supabase/config.toml` current state

CC reads file at head of feature branch and confirms:
- Sections `[functions.ice-evidence-materialiser]` + `[functions.reconciliation-matcher]` do NOT exist on `main` (Stage B feature branch is the introducer of both).
- Both sections present on feature branch ready for diff review.
- Existing entries (cadence-rule-generator from cc-0009 + any pre-cc-0009 EFs) unchanged on `main`.

**Decision rule:** existing entry for either new slug on `main` → HALT (§9.2.j). Other EFs missing entries on `main` → SURFACE for PK; not blocking for Stage B but flag.

### 1.10 (Stage D) cron job collision survey at `*/30 * * * *`

```sql
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE active = true AND schedule = '*/30 * * * *'
ORDER BY jobid;
```

**Schedule lock per CCH R14 + PRV-0 §D-19:** `*/30 * * * *` UTC is the canonical schedule for both new cron jobs. Fixed UTC anchor; no DST-aware shifting.

**Decision rule:** Existing job at exact `*/30 * * * *` schedule → SURFACE for PK awareness (multiple jobs can share the schedule; not a collision per se). Existing job matching jobname `ice_evidence_materialiser_30min` OR `reconciliation_matcher_30min` → HALT (§9.2.k jobname collision).

### 1.11 (Stage D) Vault row CRON_SECRET still present

```sql
SELECT
  (SELECT COUNT(*) FROM vault.secrets WHERE name = 'CRON_SECRET') AS vault_row_count,
  EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1
  ) AS vault_resolvable,
  (SELECT length(decrypted_secret) FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1) AS decrypted_length;
```

**Decision rule:** vault_row_count = 1; vault_resolvable = true; decrypted_length > 0 (length-only flag, never raw value into chat). Drift → HALT (§9.2.l).

### 1.12 (Stage E) Stage A+B+C+D outputs in place

```sql
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='r' AND table_name IN ('ice_publication_evidence','platform_observation','platform_manual_observation','reconciliation_match','platform_observer_health','matcher_config')) AS new_tables_count,
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='r' AND routine_name='compact_raw_json') AS fn_compact_present,
  EXISTS (SELECT 1 FROM cron.job WHERE jobname='ice_evidence_materialiser_30min' AND active=true) AS cron_materialiser_active,
  EXISTS (SELECT 1 FROM cron.job WHERE jobname='reconciliation_matcher_30min' AND active=true) AS cron_matcher_active,
  (SELECT COUNT(*) FROM r.ice_publication_evidence) AS evidence_existing_rows,
  (SELECT COUNT(*) FROM r.reconciliation_match) AS match_existing_rows,
  (SELECT COUNT(*) FROM r.matcher_config) AS matcher_config_rows;
```

**Decision rule:** new_tables_count=6; fn_compact_present=true; both crons active=true; evidence_existing_rows=0 AND match_existing_rows=0 (first invocation); matcher_config_rows=1 (global default row from Stage A INSERT). Drift → HALT (§9.2.m sequencing or prior partial).

### 1.13 (Stage E) m.* pipeline state inventory (informational for materialiser expected output)

```sql
SELECT
  (SELECT COUNT(*) FROM m.post_publish WHERE published_at >= '2026-05-04') AS published_rows_in_window,
  (SELECT COUNT(*) FROM m.post_publish_queue WHERE created_at >= '2026-05-04') AS queue_rows_in_window,
  (SELECT COUNT(*) FROM m.post_draft WHERE created_at >= '2026-05-04') AS draft_rows_in_window;
```

**Decision rule:** Informational only — no HALT. Numbers used in V14 expected_count derivation. If all 0 across all 3, Stage E will produce 0 evidence rows (which is empirically valid and recorded as PASS-with-empirical-observation, not failure).

---

## §2. Proposed DDL — Stage A (single `apply_migration cc_0010_r_evidence_and_matcher_schema`)

> **Note (post-split 2026-05-12):** v1 DDL below is preserved as scope reference. CCD-corrected DDL (no `is_stale` STORED column on `r.platform_observation`, `UNIQUE NULLS NOT DISTINCT` on `r.matcher_config`, plain `platform_obs_recent` index) lives in **cc-0010A v1.2 §2**. Where the v1 DDL below differs from cc-0010A v1.2, the sub-brief is the authoritative apply text.

All DDL + helper function + ALTER FK + k.* registry rows + matcher_config default INSERT in ONE transactional unit per memory standing rule. Trigger fires at `ddl_command_end` of each `CREATE TABLE`, auto-inserting stub k.* rows; brief's UPSERTs in §3.6+§3.7 enrich in-place (L35).

### 2.1 `r.ice_publication_evidence` (PRV-0 §3.4 verbatim)

```sql
CREATE TABLE IF NOT EXISTS r.ice_publication_evidence (
    ice_publication_evidence_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expected_publication_id      uuid NOT NULL REFERENCES r.expected_publication(expected_publication_id) ON DELETE CASCADE,
    pipeline_state               text NOT NULL CHECK (pipeline_state IN ('drafted','queued','attempted','published','failed')),
    post_draft_id                uuid REFERENCES m.post_draft(post_draft_id) ON DELETE SET NULL,
    post_publish_queue_id        uuid REFERENCES m.post_publish_queue(post_publish_queue_id) ON DELETE SET NULL,
    post_publish_id              uuid REFERENCES m.post_publish(post_publish_id) ON DELETE SET NULL,
    slot_id                      uuid REFERENCES m.slot(slot_id) ON DELETE SET NULL,
    platform_post_id             text,
    published_url                text,
    scheduled_for                timestamptz,
    published_at                 timestamptz,
    failure_reason               text,
    raw_evidence                 jsonb DEFAULT '{}',
    created_at                   timestamptz NOT NULL DEFAULT now(),
    updated_at                   timestamptz NOT NULL DEFAULT now(),
    created_by_run_id            uuid,
    updated_by_run_id            uuid,
    UNIQUE (expected_publication_id)
);

CREATE INDEX IF NOT EXISTS ice_evidence_state_recent
    ON r.ice_publication_evidence (pipeline_state, updated_at DESC);

CREATE INDEX IF NOT EXISTS ice_evidence_platform_post
    ON r.ice_publication_evidence (platform_post_id)
    WHERE platform_post_id IS NOT NULL;

COMMENT ON TABLE r.ice_publication_evidence IS 'Authoritative evidence from ICE pipeline state. Populated by ice-evidence-materialiser. UNIQUE constraint on expected_publication_id means ICE evidence is exclusive per expected row — multiple ICE pipeline rows for the same expected slot collapse into one evidence row (latest wins). Tier 1 matcher reads this table.';
```

### 2.2 `r.platform_observation` (PRV-0 §3.5 verbatim) — **see cc-0010A v1.2 for CCD-corrected version without `is_stale` STORED column**

```sql
CREATE TABLE IF NOT EXISTS r.platform_observation (
    platform_observation_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                 text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    platform_post_id         text NOT NULL,
    observed_at              timestamptz NOT NULL,
    published_at_observed    timestamptz,
    observed_local_date      date NOT NULL,
    caption_text             text,
    caption_normalised       text,
    media_count              int CHECK (media_count IS NULL OR media_count >= 0),
    has_video                boolean,
    permalink_url            text,
    raw_payload              jsonb DEFAULT '{}',
    fetch_run_id             uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    is_stale                 boolean GENERATED ALWAYS AS (observed_at < (now() - interval '24 hours')) STORED,
    notes                    text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    UNIQUE (platform, platform_post_id),
    CONSTRAINT platform_obs_observed_dates_consistent CHECK (
        published_at_observed IS NULL
        OR observed_at >= published_at_observed
    )
);

CREATE INDEX IF NOT EXISTS platform_obs_client_platform_date
    ON r.platform_observation (client_id, platform, observed_local_date);

CREATE INDEX IF NOT EXISTS platform_obs_caption_normalised
    ON r.platform_observation USING gin (caption_normalised gin_trgm_ops)
    WHERE caption_normalised IS NOT NULL;

CREATE INDEX IF NOT EXISTS platform_obs_recent_fresh
    ON r.platform_observation (client_id, platform, observed_at DESC)
    WHERE is_stale = false;

COMMENT ON TABLE r.platform_observation IS 'Observations fetched from platform APIs by per-platform observer EFs (PRV-2/3/4). UNIQUE (platform, platform_post_id) means each post observed exactly once — re-fetches must use UPSERT. is_stale auto-computed; D-12 says stale rows do not match. cc-0010 creates this table empty; first row appears when PRV-2/3/4 observers run.';
```

**Note on `pg_trgm` index dependency:** `platform_obs_caption_normalised` uses GIN with `gin_trgm_ops` operator class. Requires `pg_trgm` extension. §1 pre-flight in cc-0009 §1.1 verified `pg_trgm_installed` (and noted it as not blocking for cc-0009 but flagged for cc-0010). cc-0010 §1.1 must re-verify; if `pg_trgm` missing, ENABLE it via `CREATE EXTENSION IF NOT EXISTS pg_trgm` as part of Stage A migration (single transactional unit).

**CCD-CORRECTED DIVERGENCE (cc-0010A v1.2):** The v1 `is_stale` STORED GENERATED column with `now()` is INVALID at apply time (PostgreSQL immutability requirement). cc-0010A v1.2 removes `is_stale` entirely and replaces the partial-WHERE-`is_stale=false` index with a plain `platform_obs_recent` index. Freshness becomes a consumer-side query-time predicate. **Apply cc-0010A v1.2 §2.2, not this v1 §2.2.**

### 2.3 `r.platform_manual_observation` (PRV-0 §3.6 verbatim)

```sql
CREATE TABLE IF NOT EXISTS r.platform_manual_observation (
    platform_manual_observation_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                       uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                        text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    platform_post_id                text,
    permalink_url                   text,
    observed_local_date             date NOT NULL,
    published_at_observed           timestamptz,
    caption_text                    text,
    caption_normalised              text,
    media_count                     int CHECK (media_count IS NULL OR media_count >= 0),
    has_video                       boolean,
    raw_evidence_url                text,
    observation_method              text CHECK (observation_method IN ('csv_import','manual_form','screenshot','email_forward','phone_report')),
    confidence                      text CHECK (confidence IN ('high','medium','low')),
    notes                           text,
    submitted_by                    text NOT NULL,
    submitted_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_manual_obs_post_id_uniq
    ON r.platform_manual_observation (platform, platform_post_id)
    WHERE platform_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS platform_manual_obs_client_platform_date
    ON r.platform_manual_observation (client_id, platform, observed_local_date);

CREATE INDEX IF NOT EXISTS platform_manual_obs_caption_normalised
    ON r.platform_manual_observation USING gin (caption_normalised gin_trgm_ops)
    WHERE caption_normalised IS NOT NULL;

CREATE INDEX IF NOT EXISTS platform_manual_obs_recent
    ON r.platform_manual_observation (client_id, platform, submitted_at DESC);

COMMENT ON TABLE r.platform_manual_observation IS 'Human-submitted observations. Lives alongside r.platform_observation; matcher Tier 1 does NOT read this table (Tier 1 = ICE evidence only); Tier 3 reads this (PRV-2+). cc-0010 creates table empty.';
```

**Note on PRV-0 §3.6 syntax adjustment**: PRV-0 §3.6 spec uses `UNIQUE (platform, platform_post_id) WHERE platform_post_id IS NOT NULL` inline. PostgreSQL doesn't support inline partial UNIQUE constraints; must use `CREATE UNIQUE INDEX ... WHERE` instead (semantically equivalent). Reflected above.

### 2.4 `r.reconciliation_match` (PRV-0 §3.7 verbatim)

```sql
CREATE TABLE IF NOT EXISTS r.reconciliation_match (
    reconciliation_match_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expected_publication_id   uuid NOT NULL REFERENCES r.expected_publication(expected_publication_id) ON DELETE CASCADE,
    matched_evidence_kind     text NOT NULL CHECK (matched_evidence_kind IN ('ice','platform','manual','fuzzy_platform','fuzzy_manual','none')),
    matched_evidence_id       uuid,
    matched_match_tier        int NOT NULL CHECK (matched_match_tier BETWEEN 1 AND 5),
    matched_confidence        numeric(4,3) NOT NULL CHECK (matched_confidence BETWEEN 0.000 AND 1.000),
    delta_minutes_late        int,
    delta_caption_similarity  numeric(4,3),
    override_by               text,
    override_at               timestamptz,
    override_reason           text,
    matcher_run_id            uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    created_at                timestamptz NOT NULL DEFAULT now(),
    created_by_run_id         uuid,
    updated_at                timestamptz NOT NULL DEFAULT now(),
    updated_by_run_id         uuid,
    UNIQUE (expected_publication_id),
    CONSTRAINT reconcile_match_override_pair CHECK (
        (override_by IS NULL AND override_at IS NULL)
        OR (override_by IS NOT NULL AND override_at IS NOT NULL)
    ),
    CONSTRAINT reconcile_match_evidence_required_for_non_none CHECK (
        (matched_evidence_kind = 'none' AND matched_evidence_id IS NULL)
        OR (matched_evidence_kind <> 'none' AND matched_evidence_id IS NOT NULL)
    ),
    CONSTRAINT reconcile_match_tier_consistency CHECK (
        (matched_evidence_kind = 'ice'              AND matched_match_tier = 1)
        OR (matched_evidence_kind = 'platform'      AND matched_match_tier = 2)
        OR (matched_evidence_kind = 'manual'        AND matched_match_tier = 3)
        OR (matched_evidence_kind = 'fuzzy_platform' AND matched_match_tier = 4)
        OR (matched_evidence_kind = 'fuzzy_manual'  AND matched_match_tier = 5)
        OR (matched_evidence_kind = 'none')
    )
);

CREATE INDEX IF NOT EXISTS reconcile_match_evidence
    ON r.reconciliation_match (matched_evidence_kind, matched_evidence_id)
    WHERE matched_evidence_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS reconcile_match_override_audit
    ON r.reconciliation_match (override_at DESC)
    WHERE override_by IS NOT NULL;

COMMENT ON TABLE r.reconciliation_match IS 'One row per expected_publication describing how it matched (or not). UNIQUE on expected_publication_id means re-running matcher upserts in place. matched_evidence_kind=none means matcher found no match. Manual override is sticky: cron re-matcher MUST include WHERE override_by IS NULL clause (D-21 hard lock). Tier consistency CHECK prevents misclassification. cc-0010 ships Tier 1 only; Tiers 2-5 deferred to PRV-2/3/4.';
```

### 2.5 `r.platform_observer_health` (PRV-0 §3.9 verbatim)

```sql
CREATE TABLE IF NOT EXISTS r.platform_observer_health (
    platform_observer_health_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                    uuid NOT NULL REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                     text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','youtube')),
    last_observed_at             timestamptz,
    last_successful_run_id       uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    last_failure_run_id          uuid REFERENCES r.reconciliation_run(reconciliation_run_id) ON DELETE SET NULL,
    last_failure_reason          text,
    consecutive_failure_count    int NOT NULL DEFAULT 0 CHECK (consecutive_failure_count >= 0),
    is_healthy                   boolean GENERATED ALWAYS AS (consecutive_failure_count = 0) STORED,
    updated_at                   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (client_id, platform)
);

CREATE INDEX IF NOT EXISTS platform_observer_health_unhealthy
    ON r.platform_observer_health (platform, consecutive_failure_count DESC)
    WHERE consecutive_failure_count > 0;

COMMENT ON TABLE r.platform_observer_health IS 'Lightweight health summary per (client, platform) observer. Updated by per-platform observer EFs after each run (PRV-2/3/4). cc-0010 creates empty; rows appear when observers run.';
```

### 2.6 `r.matcher_config` (PRV-0 §6.3 verbatim) + global default INSERT — **see cc-0010A v1.2 for CCD-corrected UNIQUE NULLS NOT DISTINCT version**

```sql
CREATE TABLE IF NOT EXISTS r.matcher_config (
    matcher_config_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                    uuid REFERENCES c.client(client_id) ON DELETE CASCADE,
    platform                     text CHECK (platform IS NULL OR platform IN ('facebook','instagram','linkedin','youtube')),
    minutes_late_tolerance       int NOT NULL DEFAULT 60 CHECK (minutes_late_tolerance >= 0),
    caption_prefix_length        int NOT NULL DEFAULT 60 CHECK (caption_prefix_length >= 10),
    same_day_window_hours        int NOT NULL DEFAULT 24 CHECK (same_day_window_hours >= 1),
    fuzzy_levenshtein_threshold  numeric(4,3) NOT NULL DEFAULT 0.850 CHECK (fuzzy_levenshtein_threshold BETWEEN 0.500 AND 1.000),
    notes                        text,
    created_at                   timestamptz NOT NULL DEFAULT now(),
    updated_at                   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (client_id, platform)
);

-- Global default row (PRV-0 §6.3 mandates 1 row at table creation)
INSERT INTO r.matcher_config (client_id, platform, notes)
VALUES (NULL, NULL, 'cc-0010 Stage A global default — PRV-0 §6.3 verbatim defaults: 60 min late tolerance, 60 char caption prefix, 24h same-day window, 0.850 Levenshtein threshold. Per-client and per-(client, platform) overrides land via future config admin paths.')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE r.matcher_config IS 'Tolerance defaults for reconciliation matcher. Lookup order: (client, platform) → (client, NULL) → (NULL, NULL). cc-0010 inserts the global default at Stage A. cc-0010 matcher reads minutes_late_tolerance + fuzzy_levenshtein_threshold (Tier 1 only uses minutes_late_tolerance for delta classification per PRV-0 §6.2).';
```

**CCD-CORRECTED DIVERGENCE (cc-0010A v1.2):** The v1 plain `UNIQUE (client_id, platform)` does NOT enforce uniqueness for the global `(NULL, NULL)` row because default PostgreSQL UNIQUE treats NULLs as distinct — a re-apply would insert a duplicate global default. cc-0010A v1.2 replaces with `CONSTRAINT matcher_config_client_platform_key UNIQUE NULLS NOT DISTINCT (client_id, platform)` (PG15+) and explicit `ON CONFLICT (client_id, platform) DO NOTHING`. **Apply cc-0010A v1.2 §2.6, not this v1 §2.6.**

### 2.7 `r.compact_raw_json` helper (PRV-0 §4.3 verbatim)

```sql
CREATE OR REPLACE FUNCTION r.compact_raw_json(j jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    keys_to_drop text[] := ARRAY['__internal_debug','request_headers','response_headers','full_html'];
    out jsonb := j;
    k text;
BEGIN
    IF j IS NULL OR jsonb_typeof(j) != 'object' THEN RETURN j; END IF;
    FOREACH k IN ARRAY keys_to_drop LOOP
        out := out - k;
    END LOOP;
    RETURN out;
END;
$$;

COMMENT ON FUNCTION r.compact_raw_json IS 'PRV-0 §4.3: Strips known-bulky internal-only keys from raw API payloads before storage. Used by per-platform observer EFs (PRV-2/3/4) when populating r.platform_observation.raw_payload. keys_to_drop list hardcoded in cc-0010 v1; expansion in future revision when actual platform payloads inform real bulky keys.';
```

### 2.8 ALTER TABLE re-adding `r.expected_publication.matched_match_id` FK (L38 candidate empirical vindication)

```sql
ALTER TABLE r.expected_publication
    ADD CONSTRAINT expected_publication_matched_match_id_fkey
    FOREIGN KEY (matched_match_id)
    REFERENCES r.reconciliation_match(reconciliation_match_id)
    ON DELETE SET NULL;

COMMENT ON CONSTRAINT expected_publication_matched_match_id_fkey ON r.expected_publication IS 'cc-0010 Stage A re-adds FK deferred from cc-0009 §2.3 per L38 candidate cross-brief FK deferral pattern. Reference target r.reconciliation_match created in cc-0010 §2.4 (same Stage A migration transactional unit). ON DELETE SET NULL preserves expected_publication row when match record is deleted.';
```

**Dependency ordering in single transactional Stage A migration**: §2.1 → §2.2 → §2.3 → §2.4 (r.reconciliation_match) → §2.5 → §2.6 → §2.7 → §2.8 (ALTER FK references §2.4) → §3 k.* + matcher_config default INSERT. The ALTER FK at §2.8 succeeds because §2.4 already created the target table within the same transaction.

---

## §3. Proposed DML — Stage A k.* registry UPSERTs + matched_match_id FK flag UPDATE

When Stage A apply_migration runs, 6 `CREATE TABLE r.*` statements each fire `trg_k_registry_sync_on_create_table` at `ddl_command_end`. The trigger inserts 6 stub `k.table_registry` rows + per-column stubs into `k.column_registry`. §3.6 + §3.7 UPSERTs upgrade in-place (L35).

In addition, §3.8 UPDATEs the pre-existing `k.column_registry` row for `r.expected_publication.matched_match_id` to flip `is_foreign_key=true` after the FK ALTER lands.

### 3.5 (NOTE on trigger interaction)

Same as cc-0009 §3.1 — trigger fires on each CREATE TABLE; UPSERT upgrades stub rows; matcher_config default INSERT is plain INSERT (not k.* table; not subject to trigger).

### 3.6 `k.table_registry` — 6 UPSERTs for the 6 new tables

```sql
INSERT INTO k.table_registry (
    schema_name, table_name, table_kind, status, owner,
    source_system, source_reference, refresh_method, refresh_cadence,
    allowed_ops, pii_risk, purpose,
    primary_use_cases, join_keys, rules_summary, advisory
) VALUES
('r', 'ice_publication_evidence', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.4', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'Authoritative evidence from ICE pipeline state. Populated by ice-evidence-materialiser EF (PRV-0 §5.2). UNIQUE constraint on expected_publication_id collapses multiple pipeline rows per expected slot to latest evidence.',
 'Tier 1 matcher input; ICE pipeline state truth surface; published_at/scheduled_for evidence for matcher delta classification.',
 'expected_publication_id → r.expected_publication; post_publish_id → m.post_publish; post_publish_queue_id → m.post_publish_queue; post_draft_id → m.post_draft; slot_id → m.slot.',
 'Materialiser EF runs every 30 min. raw_evidence jsonb contains compacted pipeline payload via r.compact_raw_json. UNIQUE (expected_publication_id) is the materialiser idempotency key.',
 'cc-0010 introduces this table. Tier 1 matcher (cc-0010) reads. PRV-7+ may add webhook-driven incremental updates.'),
('r', 'platform_observation', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.5', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'Observations fetched from platform APIs by per-platform observer EFs (PRV-2/3/4). UNIQUE (platform, platform_post_id) enforces each post observed once.',
 'Tier 2/4/5 matcher inputs (PRV-2/3/4); platform-side truth surface; staleness detection.',
 'client_id → c.client; fetch_run_id → r.reconciliation_run.',
 'cc-0010 creates empty table. UNIQUE constraint = (platform, platform_post_id). is_stale auto-computed via STORED GENERATED column. Caption similarity uses gin_trgm_ops index. Stale rows (>24h) do not match per D-12.',
 'cc-0010 creates empty; populated by PRV-2/3/4 observer EFs. Tier 4/5 fuzzy match against caption_normalised (depends on r.normalise_text expansion — deferred per cc-0009 R7 lock).'),
('r', 'platform_manual_observation', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.6', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'Human-submitted observations. Lives alongside r.platform_observation. Tier 3 / Tier 5 fuzzy matcher inputs (PRV-2+). cc-0010 creates empty table.',
 'Tier 3 matcher input (PRV-2+); CSV import target (PRV-2 brief); manual override evidence trail.',
 'client_id → c.client. UNIQUE constraint partial on (platform, platform_post_id) WHERE platform_post_id IS NOT NULL.',
 'observation_method enum: csv_import / manual_form / screenshot / email_forward / phone_report. confidence enum: high/medium/low. URL-only entries tolerate duplicate (no platform_post_id required).',
 'cc-0010 creates empty. PRV-2 brief adds full manual entry UI + CSV import pipeline.'),
('r', 'reconciliation_match', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.7', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'One row per expected_publication describing how it matched. UNIQUE on expected_publication_id means matcher upserts in place. Manual override sticky (D-21).',
 'Match record output; expected_status transitions; manual override audit; tier diagnostics.',
 'expected_publication_id → r.expected_publication; matched_evidence_id is logical FK (no DB constraint — schema differs across kinds).',
 'Tier consistency CHECK pairs matched_evidence_kind with matched_match_tier. matcher cron MUST include WHERE override_by IS NULL clause (D-21 hard lock). matched_confidence in [0.000, 1.000].',
 'cc-0010 ships Tier 1 only. cc-0010 reconciliation-matcher EF populates. Tier 2-5 deferred to PRV-2/3/4.'),
('r', 'platform_observer_health', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-3.9', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'Lightweight health summary per (client, platform) observer. Updated by per-platform observer EFs (PRV-2/3/4). cc-0010 creates empty.',
 'Observer health dashboard surface; alert input when consecutive_failure_count >= 3.',
 'client_id → c.client; last_successful_run_id → r.reconciliation_run; last_failure_run_id → r.reconciliation_run.',
 'UNIQUE (client_id, platform). is_healthy auto-computed via STORED GENERATED column from consecutive_failure_count.',
 'cc-0010 creates empty. PRV-2/3/4 observer EFs populate after each run.'),
('r', 'matcher_config', 'table', 'active', 'invegent',
 'manual', 'docs/dashboard-review-2026-05/prv-0-design-lock.md#section-6.3', 'manual_upsert', 'on_change',
 'upsert', 'none',
 'Matcher tolerance defaults. Lookup order: (client, platform) → (client, NULL) → (NULL, NULL). cc-0010 inserts 1 global default row.',
 'Matcher Tier 1 delta classification (minutes_late_tolerance); future Tier 4/5 thresholds (caption_prefix_length, fuzzy_levenshtein_threshold).',
 'client_id → c.client (NULL for global).',
 'UNIQUE (client_id, platform). Global default row: client_id=NULL, platform=NULL, defaults per PRV-0 §6.3 (60 min late, 60 char prefix, 24h window, 0.850 fuzzy threshold).',
 'cc-0010 introduces this table + 1 global default row. Per-client overrides via future config admin paths.')
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

### 3.7 `k.column_registry` — UPSERTs for all 6 new tables

CTE-driven pattern from cc-0009 §3.6. Six CTE blocks (one per new table) + combined INSERT...ON CONFLICT DO UPDATE.

Due to brief length, the full CTE-driven INSERT for all 6 tables follows the same shape as cc-0009 §3.6 — a `t_<table>` CTE per table to look up `table_id`, a `cols_<table>` CTE per table to pull from `information_schema.columns`, a `purposes_<table>` CTE with column_name + fk_schema + fk_table + fk_column + column_purpose VALUES, and the final INSERT...SELECT...UNION ALL across all 6 tables ON CONFLICT DO UPDATE.

**Column purposes summary (full text in migration body at apply time; chat reviews against PRV-0 §3.4-§3.7+§3.9+§6.3 specs at Stage A D-01):**
- `r.ice_publication_evidence` (17 cols): expected_publication_id (FK r.expected_publication), pipeline_state (5-enum CHECK), post_draft_id (FK m.post_draft), post_publish_queue_id (FK m.post_publish_queue), post_publish_id (FK m.post_publish), slot_id (FK m.slot), platform_post_id, published_url, scheduled_for, published_at, failure_reason, raw_evidence (jsonb), created_at, updated_at, created_by_run_id, updated_by_run_id, ice_publication_evidence_id (PK).
- `r.platform_observation` (16 cols in cc-0010A v1.2 — v1 said 17 incl. is_stale; CCD removed): client_id (FK c.client), platform (4-enum CHECK), platform_post_id, observed_at, published_at_observed, observed_local_date, caption_text, caption_normalised, media_count, has_video, permalink_url, raw_payload (jsonb), fetch_run_id (FK r.reconciliation_run), is_stale (GENERATED — REMOVED in v1.2), notes, created_at, platform_observation_id (PK).
- `r.platform_manual_observation` (17 cols): client_id (FK c.client), platform, platform_post_id, permalink_url, observed_local_date, published_at_observed, caption_text, caption_normalised, media_count, has_video, raw_evidence_url, observation_method (5-enum CHECK), confidence (3-enum CHECK), notes, submitted_by, submitted_at, platform_manual_observation_id (PK).
- `r.reconciliation_match` (16 cols): expected_publication_id (FK r.expected_publication), matched_evidence_kind (6-enum CHECK), matched_evidence_id, matched_match_tier (1-5 CHECK), matched_confidence (0.000-1.000 CHECK), delta_minutes_late, delta_caption_similarity, override_by, override_at, override_reason, matcher_run_id (FK r.reconciliation_run), created_at, created_by_run_id, updated_at, updated_by_run_id, reconciliation_match_id (PK).
- `r.platform_observer_health` (10 cols): client_id (FK c.client), platform, last_observed_at, last_successful_run_id (FK r.reconciliation_run), last_failure_run_id (FK r.reconciliation_run), last_failure_reason, consecutive_failure_count, is_healthy (GENERATED), updated_at, platform_observer_health_id (PK).
- `r.matcher_config` (10 cols): client_id (FK c.client; NULL for global), platform, minutes_late_tolerance, caption_prefix_length, same_day_window_hours, fuzzy_levenshtein_threshold, notes, created_at, updated_at, matcher_config_id (PK).

**Total k.column_registry rows added: 86 across all 6 tables.**

### 3.8 `k.column_registry` UPDATE for matched_match_id FK flag (post FK ALTER)

```sql
UPDATE k.column_registry
SET is_foreign_key = true,
    fk_ref_schema = 'r',
    fk_ref_table = 'reconciliation_match',
    fk_ref_column = 'reconciliation_match_id',
    column_purpose = REPLACE(column_purpose, 'FK deferred to cc-0010 ALTER TABLE (L38 candidate per R10)', 'FK added in cc-0010 Stage A ALTER TABLE (L38 candidate empirically vindicated)'),
    updated_at = now()
WHERE table_id = (SELECT table_id FROM k.table_registry WHERE schema_name='r' AND table_name='expected_publication')
  AND column_name = 'matched_match_id';
```

**Note on REPLACE pattern**: The `column_purpose` text from cc-0009 §3.6 explicitly captures the deferral; this UPDATE rewrites that fragment to reflect post-cc-0010 truth. If the column_purpose text differs from cc-0009's exact phrasing (e.g., due to manual edits), the REPLACE is a no-op on that fragment but still sets `is_foreign_key=true` + fk_ref_* fields. V6 verifies post-UPDATE state.

---

## §4. Stage B+C — ice-evidence-materialiser + reconciliation-matcher Edge Functions (CCH R11 carried)

### 4.0 Branch discipline (CCH R11 carried lock)

Same pattern as cc-0009 Stage B: CC creates feature branch `feat/cc-0010-evidence-and-matcher`, commits both EF sources + config.toml amendment, pushes to GitHub; chat fires Stage B D-01 reviewing the diff; PK approves; merge to main. Stage C deploys from post-merge main for both EFs sequentially. **Direct-push to main forbidden** (carried from CCH R11).

### 4.1 ice-evidence-materialiser EF responsibilities (PRV-0 §5.2)

- Read `r.expected_publication` rows in current window (Sydney-local: today − 8 days through today + horizon_days, default horizon_days=7 per CCH R3 / F-CC-0009 Option (a) alignment; cron invocation passes `horizon_days=7, backfill_days=0` for forward-only daily updates).
- For each expected_publication row, attempt match against ICE pipeline state via:
  1. **slot_id join** if `r.expected_publication.slot_id` is non-null (cc-0009 emits NULL by current EF design; future cc-0009 EF version may emit slot_id).
  2. **(client_id, platform, scheduled_for date)** join via `m.post_publish_queue.scheduled_for::date = r.expected_publication.expected_local_date` AND matching client + platform.
  3. **(client_id, platform, published_at date)** join via `m.post_publish.published_at::date = r.expected_publication.expected_local_date` AND matching client + platform (Sydney-local date via `r.to_sydney_local_date`).
- For each match, UPSERT `r.ice_publication_evidence(expected_publication_id, pipeline_state, post_*_id, platform_post_id, published_url, scheduled_for, published_at, failure_reason, raw_evidence)` ON CONFLICT (expected_publication_id) DO UPDATE.
- `raw_evidence` jsonb populated with compacted source row via `r.compact_raw_json(row_to_json(pipeline_row)::jsonb)`.
- Wrap in `r.reconciliation_run(run_type='ice_evidence_materialisation', trigger='scheduled'|'manual'|'rpc', triggered_by=...)` audit row.
- Idempotency: ON CONFLICT (expected_publication_id) DO UPDATE makes re-runs safe.
- Latest-wins semantics: if multiple m.* rows match the same expected_publication, materialiser picks the one with latest `published_at` (or latest `created_at` if not yet published).
- HTTP 200 response with `{run_id, rows_planned, rows_inserted, rows_updated, duration_ms}`.

### 4.2 reconciliation-matcher EF responsibilities (PRV-0 §5.4 + §6, **Tier 1 only**)

- Read `r.expected_publication` rows in current window WHERE `expected_status IN ('expected','backfilled')` (not yet matched, not suppressed).
- For each, attempt Tier 1 match: read `r.ice_publication_evidence` WHERE expected_publication_id matches AND pipeline_state='published'.
- If Tier 1 match found:
  - Compute `delta_minutes_late` = `(published_at - expected_window_end) / interval '1 minute'`. Negative → 0.
  - Read `r.matcher_config` (lookup order client+platform → client+NULL → NULL+NULL) for `minutes_late_tolerance`.
  - Status transition rule (PRV-0 §6.2): delta_minutes_late <= minutes_late_tolerance → `matched`; else → `late`. **NOTE: cc-0010 v1 implements only `matched`, not `late` — see Unresolved Assumption #6 below.**
  - UPSERT `r.reconciliation_match(expected_publication_id, matched_evidence_kind='ice', matched_evidence_id=ice_publication_evidence_id, matched_match_tier=1, matched_confidence=1.000, delta_minutes_late, matcher_run_id, ...)` ON CONFLICT (expected_publication_id) DO UPDATE WHERE override_by IS NULL (D-21 hard lock).
  - UPDATE `r.expected_publication` SET expected_status='matched', matched_match_id=reconciliation_match_id, matched_at=now() WHERE expected_publication_id=...
- If no Tier 1 evidence: do NOTHING in cc-0010 (Tier 2-5 deferred). Row stays in `expected_status='expected'`.
- Wrap in `r.reconciliation_run(run_type='matching', ...)`.
- Idempotency: ON CONFLICT (expected_publication_id) DO UPDATE WHERE override_by IS NULL makes re-runs safe.
- HTTP 200 response with `{run_id, rows_planned, rows_matched_tier_1, rows_skipped_no_evidence, duration_ms}`.

### 4.3 EF source structures (CC writes per Stage B; commits to feature branch)

```
supabase/functions/ice-evidence-materialiser/
└── index.ts
supabase/functions/reconciliation-matcher/
└── index.ts
```

Key TypeScript components (not full code — chat fires Stage-B D-01 on CC's actual diff):
- `Deno.serve` HTTP handler. POST with optional body `{horizon_days?: number, backfill_days?: number, triggered_by?: string}`. Defaults: `horizon_days=7, backfill_days=0` for both.
- Supabase client: `service_role` JWT from env `SUPABASE_SERVICE_ROLE_KEY`.
- Auth: cron calls with `x-cron-secret` header; EF compares against `Deno.env.get('CRON_SECRET')`. Returns 401 if mismatch.
- Error handling: per-row try/catch; `r.reconciliation_run.status='partial'` if any row fails but others succeed.
- Logging: console.log per stage; final summary_json includes counts.

### 4.4 `supabase/config.toml` amendments (2 entries committed to feature branch)

```toml
[functions.ice-evidence-materialiser]
verify_jwt = false

[functions.reconciliation-matcher]
verify_jwt = false
```

Alphabetised insertion in supabase/config.toml. Durable source-of-truth per F-EF-DRIFT-PREVENTION.

### 4.5 Stage C deploy commands (CC executes sequentially)

```powershell
cd C:\Users\parve\Invegent-content-engine
git checkout main
git pull origin main
supabase functions deploy ice-evidence-materialiser --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns
supabase functions deploy reconciliation-matcher --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns
```

### 4.6 Stage C deploy verification (V8a + V8b per EF)

Same shape as cc-0009 §4.5 — `get_edge_function` per EF + manual probe (401 expected without x-cron-secret).

---

## §5. Stage D — pg_cron schedules (2 cron jobs, vault-backed per L42 pattern)

### 5.1 `apply_migration cc_0010_pg_cron_evidence_and_matcher`

```sql
-- Cron job 1: ice-evidence-materialiser every 30 minutes
SELECT cron.schedule(
    'ice_evidence_materialiser_30min',
    '*/30 * * * *',                                       -- Fixed UTC anchor (CCH R14): every 30 minutes. No DST-aware shifting.
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

-- Cron job 2: reconciliation-matcher every 30 minutes (offset by 15 to allow materialiser to complete first)
SELECT cron.schedule(
    'reconciliation_matcher_30min',
    '15-59/30 * * * *',                                   -- 15 and 45 of every hour, offset 15 min from materialiser (PRV-0 §D-19 + sequencing intent)
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

**Offset rationale**: Both EFs cannot run simultaneously without race risk (matcher reads evidence that materialiser is mid-write). 15-minute offset gives materialiser ~15 min to complete before matcher fires. Materialiser at :00, :30; matcher at :15, :45. PRV-0 §D-19 says "every 30 min" for both; the offset is an implementation detail respecting the cadence intent.

**Vault-backed secret**: Same `vault.decrypted_secrets WHERE name='CRON_SECRET'` pattern as cron job 82 (cc-0009 vault pivot L42). Same vault row `0fede5c3-...`.

---

## §6. Stage E — first on-demand invocations (sequenced: materialiser, then matcher)

### 6.1 Stage E first invocation 1: ice-evidence-materialiser

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
        'triggered_by', 'cc-0010-stage-e-materialiser-first'
    ),
    timeout_milliseconds := 30000
) AS request_id;
```

### 6.2 Stage E first invocation 2: reconciliation-matcher (after materialiser completes)

Wait for materialiser `r.reconciliation_run.status='succeeded'` (via brief `pg_sleep(8)` + read like cc-0009 Stage E), then:

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
        'triggered_by', 'cc-0010-stage-e-matcher-first'
    ),
    timeout_milliseconds := 30000
) AS request_id;
```

**Expected Stage E output:**
- 2 new `r.reconciliation_run` rows: run_type='ice_evidence_materialisation' + run_type='matching'; both status='succeeded'.
- N new `r.ice_publication_evidence` rows: derived during verification from live `m.post_publish` / `m.post_publish_queue` / `m.post_draft` for the 84 r.expected_publication rows in window. May be 0 if no ICE pipeline activity yet for May 11-18 window.
- M new `r.reconciliation_match` rows: M = number of evidence rows with `pipeline_state='published'` (subset of N).
- M `r.expected_publication` rows transitioned from `expected_status='expected'` to `expected_status='matched'` with `matched_match_id` + `matched_at` populated.
- Per CCH R4 carried: expected row counts derived during verification from live pipeline inputs.

---

## §6 (Verification queries V1–V14, post-each-stage)

All relevant V-checks run via Supabase MCP `execute_sql` (read-only) within ~60s of each stage's apply completion.

### V1 — (Stage A) Schema + extensions + helper exist

Same pattern as cc-0009 V1. Verify: 6 new tables exist; r.compact_raw_json function exists; r.matcher_config has 1 row (global default); FK on r.expected_publication.matched_match_id exists.

### V2 — (Stage A) Tables exist with expected shape

Same pattern as cc-0009 V2. Verify per-table: column count, CHECK constraints, FK constraints, indexes.

Expected column counts:
- r.ice_publication_evidence: 17 cols
- r.platform_observation: 16 cols (cc-0010A v1.2: was 17 in v1 incl. is_stale; CCD removed)
- r.platform_manual_observation: 17 cols
- r.reconciliation_match: 16 cols
- r.platform_observer_health: 10 cols
- r.matcher_config: 10 cols

### V3 — (Stage A) Helper functions exist with expected signatures (now includes r.compact_raw_json)

Same as cc-0009 V3 + new function test:
```sql
SELECT routine_schema, routine_name, data_type AS return_type, security_type, is_deterministic
FROM information_schema.routines
WHERE routine_schema='r';
```

Verify: 3 functions (existing 2 from cc-0009 + new r.compact_raw_json); all IMMUTABLE.

### V4 — (Stage A) r.compact_raw_json empirical correctness

```sql
SELECT
  r.compact_raw_json(NULL)::text                                                AS test_null,                      -- NULL
  r.compact_raw_json('null'::jsonb)::text                                       AS test_jsonb_null,                -- null
  r.compact_raw_json('[1,2,3]'::jsonb)::text                                    AS test_array,                     -- [1,2,3] (not object → unchanged)
  r.compact_raw_json('{"keep": 1, "__internal_debug": "x"}'::jsonb)::text       AS test_strip_one,                 -- {"keep": 1}
  r.compact_raw_json('{"a": 1, "request_headers": {"x": 1}, "response_headers": [], "full_html": "<html>"}'::jsonb)::text AS test_strip_multiple, -- {"a": 1}
  r.compact_raw_json('{"keep": 1, "other": 2}'::jsonb)::text                    AS test_no_strip;                  -- {"keep": 1, "other": 2}
```

### V5 — (Stage A) ALTER FK on r.expected_publication.matched_match_id

```sql
SELECT con.conname, pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con
JOIN pg_class t ON t.oid = con.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='r' AND t.relname='expected_publication'
  AND con.contype = 'f'
  AND pg_get_constraintdef(con.oid) LIKE '%matched_match_id%';
```

**Pass:** 1 row, def matches `FOREIGN KEY (matched_match_id) REFERENCES r.reconciliation_match(reconciliation_match_id) ON DELETE SET NULL`.

### V6 — (Stage A) k.column_registry matched_match_id FK flag flipped

```sql
SELECT cr.column_name, cr.is_foreign_key, cr.fk_ref_schema, cr.fk_ref_table, cr.fk_ref_column,
       LEFT(cr.column_purpose, 100) AS purpose_preview
FROM k.column_registry cr
JOIN k.table_registry tr ON tr.table_id = cr.table_id
WHERE tr.schema_name='r' AND tr.table_name='expected_publication'
  AND cr.column_name = 'matched_match_id';
```

**Pass:** is_foreign_key=true; fk_ref_schema='r'; fk_ref_table='reconciliation_match'; fk_ref_column='reconciliation_match_id'; column_purpose contains 'L38 candidate empirically vindicated' (or similar; verifies REPLACE landed). **cc-0010A v1.2 strengthens this V6 with `ILIKE '%L38 candidate empirically vindicated%'` hard-fail clause.**

### V7 — (Stage A) k.table_registry + k.column_registry final state

Same pattern as cc-0009 V5+V6. Verify: 6 new k.table_registry rows; ~86 new k.column_registry rows; all `purpose` populated (not 'auto-registered'); all `is_foreign_key` flags correct.

### V8 — (Stage B + C) EF deploy verification (per EF)

Via `get_edge_function` per slug + manual probe. Both EFs must reach ACTIVE / verify_jwt=false / probe returns 401.

### V9 — (Stage D) Cron jobs created with expected shape

```sql
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname IN ('ice_evidence_materialiser_30min', 'reconciliation_matcher_30min');
```

**Pass:** 2 rows; both active=true; schedules `*/30 * * * *` + `15-59/30 * * * *` respectively; commands contain vault.decrypted_secrets pattern, EF URLs, timeout 30000, triggered_by labels.

### V10 — (Stage E first invocation 1) Materialiser output

```sql
-- V10a: r.reconciliation_run row for materialiser
SELECT reconciliation_run_id, run_type, trigger, status, rows_processed, rows_inserted, rows_updated, duration_ms, triggered_by
FROM r.reconciliation_run
WHERE triggered_by = 'cc-0010-stage-e-materialiser-first';

-- V10b: r.ice_publication_evidence breakdown by pipeline_state
SELECT pipeline_state, COUNT(*) AS rows
FROM r.ice_publication_evidence
GROUP BY pipeline_state
ORDER BY pipeline_state;

-- V10c: r.ice_publication_evidence breakdown by client/platform via join to r.expected_publication
SELECT cli.client_slug, ep.platform, ipe.pipeline_state, COUNT(*) AS rows
FROM r.ice_publication_evidence ipe
JOIN r.expected_publication ep ON ep.expected_publication_id = ipe.expected_publication_id
JOIN c.client cli ON cli.client_id = ep.client_id
GROUP BY cli.client_slug, ep.platform, ipe.pipeline_state
ORDER BY cli.client_slug, ep.platform, ipe.pipeline_state;
```

**Pass criteria** (per CCH R4 carried — counts derived live):
- V10a: 1 row; run_type='ice_evidence_materialisation'; status='succeeded'; duration < 30s.
- V10b/c: row counts derived during verification from live m.post_publish/m.post_publish_queue/m.post_draft inputs. May be 0 across the board if no pipeline activity for May 11-18 window — PASS-with-empirical-observation, NOT failure.

### V11 — (Stage E first invocation 1) Materialiser join correctness sample

```sql
SELECT cli.client_slug, ep.platform, ep.expected_local_date,
       ipe.pipeline_state, ipe.scheduled_for, ipe.published_at, ipe.platform_post_id
FROM r.ice_publication_evidence ipe
JOIN r.expected_publication ep ON ep.expected_publication_id = ipe.expected_publication_id
JOIN c.client cli ON cli.client_id = ep.client_id
ORDER BY cli.client_slug, ep.platform, ep.expected_local_date
LIMIT 5;
```

**Pass:** For each row, verify ep.client_id matches the underlying pipeline row's client_id; ep.platform matches; ep.expected_local_date matches `r.to_sydney_local_date(scheduled_for OR published_at)` within ±1 day tolerance for tz boundary.

### V12 — (Stage E first invocation 2) Matcher output

```sql
-- V12a: r.reconciliation_run for matcher
SELECT reconciliation_run_id, run_type, status, rows_processed, rows_inserted, rows_updated, duration_ms
FROM r.reconciliation_run
WHERE triggered_by = 'cc-0010-stage-e-matcher-first';

-- V12b: r.reconciliation_match breakdown
SELECT matched_evidence_kind, matched_match_tier, matched_confidence, COUNT(*) AS rows
FROM r.reconciliation_match
GROUP BY matched_evidence_kind, matched_match_tier, matched_confidence
ORDER BY matched_match_tier, matched_evidence_kind;
```

**Pass:** V12a status='succeeded'; V12b shows ONLY Tier 1 ICE matches (matched_evidence_kind='ice', matched_match_tier=1, matched_confidence=1.000). No Tier 2-5 entries (would indicate scope creep).

### V13 — (Stage E) r.expected_publication status transitions

```sql
SELECT expected_status, COUNT(*) AS rows
FROM r.expected_publication
GROUP BY expected_status
ORDER BY expected_status;
```

**Pass:** Compared to pre-Stage E baseline (72 expected + 12 suppressed): `matched` count = number of Tier 1 matches; `expected` count = 72 - matched count; `suppressed` count = 12 (unchanged). All matched rows have matched_match_id IS NOT NULL AND matched_at IS NOT NULL (expected_status_match_pair CHECK satisfied).

### V14 — (Stage E) Anomaly scan + idempotency integrity

```sql
SELECT
  -- Hard-fail anomaly checks
  (SELECT COUNT(*) FROM r.reconciliation_match WHERE matched_match_tier NOT BETWEEN 1 AND 5)               AS bad_tier_count,
  (SELECT COUNT(*) FROM r.reconciliation_match WHERE matched_confidence NOT BETWEEN 0.000 AND 1.000)       AS bad_confidence_count,
  (SELECT COUNT(*) FROM r.reconciliation_match WHERE matched_evidence_kind = 'ice' AND matched_match_tier != 1) AS tier_consistency_violation_count,
  (SELECT COUNT(*) FROM r.reconciliation_match WHERE override_by IS NOT NULL) AS premature_override_count,
  (SELECT COUNT(*) FROM r.expected_publication WHERE expected_status = 'matched' AND (matched_match_id IS NULL OR matched_at IS NULL)) AS check_pair_violation_count,
  -- Idempotency integrity
  (SELECT COUNT(*) FROM r.reconciliation_match)                                                            AS total_matches,
  (SELECT COUNT(DISTINCT expected_publication_id) FROM r.reconciliation_match)                             AS distinct_expected_in_matches;
```

**Pass:** All bad/violation counts = 0; total_matches = distinct_expected_in_matches (UNIQUE constraint enforced).

---

## §8. Risk articulation per stage (PK directive 6.2 carried from cc-0009)

See §Blast radius for the 11-risk catalog. Per-stage summary:

- **Stage A**: FK ALTER on existing 84 rows; matched_match_id all NULL (verified §1.1); no data risk. pg_trgm dependency for caption gin indexes.
- **Stage B**: CC code review; Tier 1-only assertion; D-21 hard lock; matcher upsert ordering.
- **Stage C**: 2 deploys sequenced; verify_jwt=false durable.
- **Stage D**: 2 cron jobs at fixed UTC anchor with offset; vault-backed; collision check.
- **Stage E**: Sequenced invocations (materialiser first, matcher second); 0-evidence-rows case is PASS-with-empirical-observation; status transitions validated.

---

## §9. D-01 packet contents (5 fires; ALL pending)

Template from cc-0009 §8 carried. Each D-01 packet must include: decision_under_review, production_action_if_approved, consequence_if_delayed, cost_of_waiting, current_evidence, known_weak_evidence, default_action. Action_type per stage same as cc-0009: A = sql_destructive (KOI-02 workaround → plan_review); B = plan_review (code review); C = production_deploy (likely plan_review per KOI-02); D = sql_destructive (plan_review); E = production_invocation (plan_review).

---

## §10. Rollback / no-op / halt logic

Same shape as cc-0009 §9. HALT codes §10.2.a-p extend cc-0009's pattern. ROLLBACK paths per stage (Stage A DROP TABLE in reverse FK order; Stage B/C revert via feature-branch + PR per CCH R11; Stage D cron.unschedule; Stage E mark r.reconciliation_run partial + optionally revert match rows under PK approval).

---

## §11. Result-file convention

Same template as cc-0009 §10 — 12 standard sections one composite file across 5 stages. Path: `docs/briefs/results/cc-0010-r-reconciliation-evidence-and-matcher.md`.

---

## §12. Stop condition

Same template as cc-0009 §11 — per-stage gate (pre-flight → D-01 → PK approval phrase → apply → V-checks → close-the-loop). Stage B-specific gate per CCH R11 carried.

FOR FINAL CLOSURE (after Stage E):
- Result file committed.
- PRV-1 cc-0010 closure documented in 4-way sync close.
- **PRV-1 close gate evaluable** per PRV-0 §8.5: (1) c.client_cadence_rule 14 rows ✓ (cc-0008); (2) r.expected_publication generated daily ✓ (cc-0009 cron 82); (3) r.reconciliation_match Tier 1 matching for ICE-healthy clients ✓ (cc-0010); (4) manual observation CSV import exercised — DEFERRED (see Unresolved Assumption #2); (5) cadence-drift-checker fires weekly — cc-0011; (6) dashboard daily matrix view — cc-0011; (7) m.ef_drift_log clean for recon EFs — ongoing observation.
- cc-0011 readiness signal logged for next session: r.cadence_drift_log + cadence-drift-checker + materialised views.
- PRV-2/3/4 readiness signals logged: per-platform observers can begin (r.platform_observation + r.platform_manual_observation + r.platform_observer_health all created and empty; matcher Tier 2-5 extension awaits observer data).

---

## §13. Notes

This is the **tenth cc-NNNN brief** and the **third multi-stage build in PRV-1** (cc-0008 single-stage; cc-0009 5-stage; cc-0010 5-stage). Pattern proven; L37 fully vindicated.

### Brief-runner-v0 watch items specific to cc-0010

1. **First cross-brief FK re-add** — ALTER TABLE r.expected_publication ADD CONSTRAINT for matched_match_id. **L38 candidate empirical vindication occurs at Stage A close.**
2. **First multi-EF stage B** — 2 EF sources committed in one feature branch + merge. CC carries the workload; chat reviews diff for both.
3. **First offset-cron pair** — materialiser at :00/:30 + matcher at :15/:45 implements PRV-0 §D-19 "every 30 min for both" while respecting materialiser-before-matcher sequencing. Pattern likely repeats in PRV-2/3/4 (4 observer EFs at staggered offsets) and cc-0011 (cadence-drift-checker at independent weekly schedule).
4. **First explicit Tier-limit scope** — Tier 1 only in cc-0010; Tiers 2-5 deferred to PRV-2/3/4. Forbidden actions explicitly bar Tier 2-5 code paths. Chat reviews CC's matcher source for any reference to r.platform_observation / r.platform_manual_observation as red flag.
5. **First fold of a P3 follow-up into a downstream brief** — F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) folded into cc-0010 verification logic. Pattern: P3 follow-ups from cc-NNNN closure can be folded into cc-(NNNN+1) brief without mutating the frozen brief.
6. **First brief inheriting vault-backed cron secret from prior brief** — cc-0009 Stage D vault pivot created CRON_SECRET; cc-0010 reuses without re-creation. Same vault row.
7. **First brief with 86+ k.column_registry rows in single Stage A** — 6 tables × ~14 cols each. Pattern scales (cc-0008 had 1 table, cc-0009 had 2; cc-0010 has 6; cc-0011 will have 1 table + 2 mat views).

### Lesson candidate notes

- **L37 candidate VINDICATED through cc-0009 5-stage closure**; cc-0010 reinforces. Pattern is baseline-eligible at L37 promotion next cycle.
- **L38 candidate EMPIRICAL VINDICATION at cc-0010 Stage A close** (cross-brief FK re-add via ALTER TABLE in downstream-brief Stage A migration).
- **L42 candidate VINDICATED through cc-0010 Stage D vault-backed secret sourcing** (carries the L42 pattern forward to 2 new cron jobs).
- **L43 candidate** (closed-with-verified-variance pathway) is available for cc-0010 Stage E if first invocations diverge from pre-flight envelopes (e.g., 0 evidence rows when m.* pipeline has activity unaccounted for, or vice versa).

### Open dependencies for the apply session(s)

1. cc-0009 outputs in place (verified at §1.1).
2. CC availability for Stages B + C.
3. PK availability for 5 approval phrases.
4. PRV-0 v2 design lock unchanged.
5. Vault row CRON_SECRET still present.
6. pg_trgm extension installed (or installed at Stage A via `CREATE EXTENSION IF NOT EXISTS pg_trgm` in same transaction).
7. m.* pipeline rows for May 11-18 window — informational only; 0 rows is PASS-with-empirical-observation at Stage E.

### Sequencing reminders

cc-0010 v1 must NOT (until each stage's gate clears):
- Apply any DDL.
- Deploy any EF.
- Schedule any cron.
- Invoke any EF.
- Mutate cc-0009 brief.
- Implement Tier 2-5 matcher logic.
- Mutate `m.chatgpt_review` beyond 5 stage close-the-loop UPDATEs.
- Touch any out-of-scope table (cc-0011 / PRV-2/3/4 targets).
- Expand `r.normalise_text` beyond cc-0009 R7 minimal contract.
- Direct-push to `main` for Stage B.
- Use DST-aware cron expressions.
- Use GUC-based secret sourcing (KOI-03 disprovenance).

Violation → HALT immediately + report to PK.

---

## Unresolved assumptions / Open questions for PK direction (before Stage A D-01)

1. **Stage E sequencing mechanism** — Brief proposes 2 sequenced `net.http_post` calls via `execute_sql` with `pg_sleep(8)` in between (matching cc-0009 Stage E pattern). Alternative: invoke materialiser, poll `r.reconciliation_run` for completion, then invoke matcher. Stricter but slower. PK direction at Stage E D-01.

2. **Manual observation CSV import RPC** — PRV-0 §8.3 mentions "Manual observation CSV import RPC (one-off; PRV-2 brief gives full UI)" in cc-0010 scope. cc-0010 v1 brief defers this to PRV-2 (i.e., not in cc-0010 scope). Rationale: CSV import requires a separate code path beyond the 2 EFs already in scope; PRV-2 will deliver the full pipeline. Brief flags this as a deferred decision; PK can direct inclusion at brief-amendment time if desired.

3. **`r.compact_raw_json` keys_to_drop list** — Hardcoded per PRV-0 §4.3: `['__internal_debug','request_headers','response_headers','full_html']`. May need expansion based on actual platform API payloads (e.g., Meta returns large `signed_request` or `paging` blobs). cc-0010 v1 implements PRV-0 verbatim; future revision possible when PRV-2/3/4 observers reveal real bulky keys.

4. **Whether Stage A is single migration or 2 migrations** — cc-0009 Stage A bundled all DDL + helpers + ALTER + k.* + matcher_config default in single `apply_migration`. cc-0010 follows the same pattern. Alternative would be (a) DDL + ALTER as one migration, (b) k.* + matcher_config default as second. Single migration is simpler; chat default unless PK directs otherwise.

5. **Stage E first invocation expected outputs** — Per CCH R4 carried, expected row count derived during verification. ice-evidence-materialiser output depends on `m.post_publish` / `m.post_publish_queue` / `m.post_draft` rows for May 11-18 window. §1.13 surfaces these counts at pre-flight. If all are 0, Stage E produces 0 evidence rows + 0 match rows + 0 status transitions — brief flags this as PASS-with-empirical-observation. PK may want a different Stage E definition-of-done if 0 outputs feel wrong (alternative: defer Stage E until ICE pipeline has produced posts for the window).

6. **Late detection in cc-0010 matcher** — PRV-0 §6.2 specifies that delta_minutes_late > minutes_late_tolerance → `expected_status='late'`. cc-0010 v1 matcher implements ONLY `matched` (delta within tolerance). Late detection deferred to cc-0011 cadence-drift-checker OR cc-0010 v2 patch. Reason for deferral: late-detection requires "the window has fully closed" check (now() > expected_window_end), which is a separate cron sweep pattern from the per-evidence match in cc-0010 v1. **PK direction**: ship Tier 1 matched-only in cc-0010 OR include late detection in cc-0010 v2 amendment OR defer to cc-0011. Chat default: ship matched-only in v1; late detection in cc-0011.

7. **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) brief mutation** — cc-0010 v1 folds Option (a) into cc-0010 verification + matcher logic without mutating cc-0009 brief (frozen at `ae301a92`). If PK prefers Option (a) be formalised by amending cc-0009 to v2.2, that would require a separate ICE-PROC-001 §9.x unfreeze + patch. Chat default: keep cc-0009 frozen; cc-0010 carries the alignment.

8. **k.column_registry UPDATE in same migration as ALTER FK** — §3.8 plain UPDATE happens within Stage A single transaction. If FK ALTER fails (e.g., orphan matched_match_id values discovered post-pre-flight), the entire migration rolls back including the UPDATE. Single-transaction integrity → desired. Alternative: separate migration after FK confirmed. Chat default: single migration.

---

## Ready for D-01 review?

**Brief status: AUTHORED v1, ready for D-01 review on a PER-STAGE basis** — not as a single brief-level D-01 (the multi-stage gate model requires per-stage D-01 fires at each apply gate, not at brief authoring).

**Recommended sequencing for PK at apply time:**
1. PK reviews this brief; confirms or rejects scope + decisions + unresolved assumptions.
2. PK directs cc-0010 brief patch (v1.1 / v2) if any scope changes desired before Stage A.
3. Once brief is finalised, chat fires Stage A pre-flight (§1.1–§1.7) within ~60s of Stage A apply window.
4. Chat fires Stage A D-01 (`ask_chatgpt_review` action_type=plan_review per KOI-02).
5. PK gives explicit approval phrase if D-01 returns clean agree.
6. Chat applies `cc_0010_r_evidence_and_matcher_schema`.
7. Chat verifies V1–V7 PASS.
8. Chat fires close-the-loop UPDATE on m.chatgpt_review.
9. Repeat per-stage for B, C, D, E.

**Post-split 2026-05-12:** This v1 sequencing is superseded by cc-0010A/B/C sub-brief sequencing per the L48 Atomicity Gate split decision. See `## Split decision` section above and the three sub-brief files.

**Brief authoring this session is non-mutating per PK directive 2026-05-11:** no D-01, no apply, no EF deploy, no cron enable, no RPC invocation. Brief is doc-only.

---

*Brief authored 2026-05-11 Sydney by chat (Claude). v1 inputs: PRV-0 v2 design lock §3.4-§3.7 + §3.9 + §4.3 + §5.2 + §5.4 + §6 + §6.3 + §8.3 + §8.5; cc-0009 v2.1 brief structure + result file SHA `0f6873f8`; L33+L34+L35+L36+L37+L38+L41+L42+L43 lessons; F-CRON-PG-NET-TIMEOUT-30S + F-EF-DRIFT-PREVENTION + L42 vault-backed-secret pattern; F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) folded into verification logic. v1 output: 5-stage gated build plan (A-E) inheriting cc-0009 pattern; 6 new tables + 1 helper + 1 ALTER FK + 86+ k.* rows + 2 EFs + 2 cron jobs + 2 first invocations. Apply sequence requires 5 sequential D-01 fires + 5 PK approval phrases + 14 V-checks + 5 close-the-loop UPDATEs. cc-0010 v1 remains AUTHORED ONLY. No D-01. No apply. No production mutation.*

*Split decision note added 2026-05-12 Sydney post-L48 Atomicity Gate (PK approved). Parent brief marked SUPERSEDED-BY cc-0010A + cc-0010B + cc-0010C for execution. v1 scope contract preserved fully inline as authoritative reference; sub-briefs (cc-0010A v1.2 with CCD-corrected DDL) are the apply-active versions. Initial doc commit `60c3202f` abbreviated the body; follow-up commit restores the full v1 body per PK directive.*
