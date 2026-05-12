# Brief cc-0010 — `r.*` second-wave tables + `r.matcher_config` + `r.compact_raw_json` helper + `r.expected_publication.matched_match_id` FK re-add + ice-evidence-materialiser EF + reconciliation-matcher EF Tier 1 only (PRV-1 third build)

**Created:** 2026-05-11 Sydney
**Last patched:** 2026-05-12 Sydney (split decision note added)
**Author:** chat (Claude)

**SUPERSEDED-BY (execution):** **cc-0010A + cc-0010B + cc-0010C** per L48 Atomicity Gate split decision 2026-05-12 — see `## Split decision (PK approved 2026-05-12)` below. v1 scope contract carried; execution flows through the three sub-briefs. This parent brief is retained as authoritative scope reference; sub-briefs inherit per-section.

**Executor (per stage — explicit per CCH directive R1 + R11 carried forward from cc-0009):**

| Stage | Owner | Mechanism |
|---|---|---|
| **A — DDL migration** (6 new tables + helper + ALTER FK re-add + k.* registry UPSERTs + matcher_config default) | **chat (ChatGPT-operated)** | Supabase MCP `apply_migration` |
| **B — EF source + `supabase/config.toml`** (2 EFs: ice-evidence-materialiser + reconciliation-matcher) | **CC / Claude Code** | git commit to feature branch → diff review → PK approval → merge (CCH R11 carried; NO direct-push to main) |
| **C — EF deploy** (2 EFs, sequenced: ice-evidence-materialiser first, then reconciliation-matcher) | **CC / Claude Code** | PowerShell `supabase functions deploy --no-verify-jwt` for each EF |
| **D — pg_cron schedules** (2 cron jobs: `ice_evidence_materialiser_30min` + `reconciliation_matcher_30min`) | **chat (ChatGPT-operated)** | Supabase MCP `apply_migration` (vault-backed secret sourcing per cc-0009 L42 pattern) |
| **E — first on-demand invocations** (2 invocations sequenced: materialiser then matcher) | **chat (ChatGPT-operated)** | Supabase MCP `execute_sql` (RPC-style `net.http_post`) × 2 |

**CCD / any other Claude Code instance remains read-only unless PK explicitly reassigns.** Stage B + C are the only explicit CC reassignments in cc-0010. No autonomous Cowork loop participates in cc-0010 apply gating. **Stage B never direct-pushes to `main`** (CCH R11 lock carried).

**Cron schedule (CCH R14 fixed UTC anchor carried):** Stage D installs `*/30 * * * *` UTC (every 30 minutes) for both EFs as **fixed UTC anchors** — no DST-aware Sydney-local shifting. PRV-0 §D-19 says "every 30 minutes" for both materialiser + matcher.

**Vault-backed secret sourcing (L42 pattern from cc-0009 Stage D vault pivot):** Both new cron jobs source `CRON_SECRET` from `vault.decrypted_secrets WHERE name='CRON_SECRET' LIMIT 1` (NOT from `current_setting('app.settings.cron_secret', true)`). The vault row was created in cc-0009 Stage D vault pivot (id `0fede5c3-f92c-4bd6-8837-c0e304dfca4c`); same secret reused.

**Status:** drafted v1 — **planning + documentation only per PK directive 2026-05-11.** **SUPERSEDED-BY cc-0010A + cc-0010B + cc-0010C for execution per 2026-05-12.** No `apply_migration`, no EF deploy, no cron enable, no RPC invocation, no D-01 fire until each sub-brief's gate cycle (pre-flight re-verify → D-01 → PK approval phrase → apply → V-checks → close-the-loop).

**Authority:** PRV-0 design lock v2 — `docs/dashboard-review-2026-05/prv-0-design-lock.md` commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7`.
**Source design sections:** PRV-0 v2 §3.1 (schema grants — already applied in cc-0009 Stage A; cc-0010 references only), §3.4 (r.ice_publication_evidence), §3.5 (r.platform_observation), §3.6 (r.platform_manual_observation), §3.7 (r.reconciliation_match), §3.9 (r.platform_observer_health), §4.3 (r.compact_raw_json), §5.2 (ice-evidence-materialiser), §5.4 (reconciliation-matcher), §6 (matching engine — Tier 1 only in cc-0010), §6.3 (r.matcher_config), §8.3 (cc-0010 scope contract), §8.5 (PRV-1 close gate).
**Lineage:** inherits cc-0009 v2.1 brief — commit `ae301a92`; result file at SHA `0f6873f8` documents Stages A+B+C+D+E all CLOSED on 2026-05-11; `r.expected_publication` populated with 84 rows; `r.reconciliation_run` audit trail live; cron job 82 firing daily. Lessons L33+L34+L35+L36+L37 (vindicated)+L41 (vindicated)+L42 (new candidate)+L43 (new candidate) carried forward. F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY follow-up addressed in this brief per PK chat-recommended Option (a) — see §Lineage + §Design intent.
**Result file:** `docs/briefs/results/cc-0010-r-reconciliation-evidence-and-matcher.md` (created on completion of FINAL stage; intermediate stages may emit interim result fragments per stage close). **Note:** with the split, sub-briefs emit their own result files: `cc-0010A`, `cc-0010B`, `cc-0010C`. Parent result file may be omitted in favour of sub-brief result files OR may be a thin index summarising all three.

---

## Patch history

- **2026-05-11 Sydney — v1** (initial draft; planning only). Authored after cc-0009 PRV-1 second build COMPLETE (v2.65). 5-stage gated build plan inherits cc-0009 pattern. cc-0009 stages A+B+C+D+E closed; cron job 82 firing daily; `r.expected_publication` populated with 84 rows. **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY Option (a) folded into this brief**: cc-0010 verification + matcher logic assumes EF forward-only weekday-filtered emission as the reference baseline; brief V10d-equivalent derivation patterns use today-forward windows. Cross-brief FK re-add for `r.expected_publication.matched_match_id` lifts L38 candidate to empirical vindication.
- **2026-05-12 Sydney — split decision note added** (doc-only; scope unchanged). L48 Atomicity Gate result recorded; brief marked SUPERSEDED-BY cc-0010A + cc-0010B + cc-0010C for execution. v1 sections below remain authoritative scope reference; sub-briefs inherit per-section.

---

## Split decision (PK approved 2026-05-12)

cc-0010 v1 was authored as a 5-stage atomic brief (Stages A–E). L48 Atomicity Gate (v2.66) was applied at pre-cc-0010A gating; result: **brief splits**.

### Atomicity Gate result

| Q | Question | Answer |
|---|---|---|
| Q1 | Can this brief succeed or fail as one atomic unit? | **no** — five stages produce durable independent production state across mixed actors (chat: A+D+E; CC: B+C). Stage failures leave partial state. |
| Q2 | More than 3 unresolved assumptions at brief approval? | **yes** — 8 explicitly enumerated. |
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
- §2 Proposed DDL → cc-0010A in full
- §3 k.* registry UPSERTs → cc-0010A in full
- §4 EF source for materialiser → cc-0010B
- §4 EF source for matcher → cc-0010C
- §5 Cron schedule for materialiser → cc-0010B
- §5 Cron schedule for matcher → cc-0010C
- §6 V-checks → split: V1–V7 → cc-0010A; V8a, V9 (materialiser cron), V10–V11 → cc-0010B; V8b, V9 (matcher cron), V12–V14 → cc-0010C
- §Risk catalog → cc-0010A inherits + extends with stored-generated-column volatility risk (cc-0010A v1.1 CCD correction) + NULL-uniqueness risk (cc-0010A v1.1 CCD correction)

### v1 brief disposition

cc-0010 v1 at commit `cfee0814` remains the authoritative scope reference but is NOT directly executed. Apply happens via sub-briefs cc-0010A/B/C. Parent brief is marked `SUPERSEDED-BY: cc-0010A + cc-0010B + cc-0010C` at top.

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

## Remainder of v1 brief (scope reference; execution flows through sub-briefs)

All v1 sections from `## Investigation record` through `## Ready for D-01 review?` remain unchanged from v1 at commit `cfee0814`. Read sub-briefs (`cc-0010A`, `cc-0010B`, `cc-0010C`) for execution-active versions. This parent brief preserves the v1 scope contract intact at SHA `cfee0814` for audit lineage.

**Note for readers:** the body of the v1 brief below this line was AUTHORED 2026-05-11 and is FROZEN as scope reference. CCD-driven corrections (no `is_stale` STORED column, `UNIQUE NULLS NOT DISTINCT` on `r.matcher_config`, plain `platform_obs_recent` index, PG15 + cross-schema FK target probes) live in **cc-0010A v1.2** at `docs/briefs/cc-0010A-r-reconciliation-ddl-foundation.md`. Where the v1 DDL below differs from the cc-0010A v1.2 corrected DDL, **cc-0010A v1.2 is the authoritative apply text**.

*(v1 body content carried forward from commit `cfee0814` — see git history for full unchanged text; superseded by sub-briefs for execution.)*

---

*Brief authored 2026-05-11 Sydney by chat (Claude). Split decision note added 2026-05-12 Sydney post-L48 Atomicity Gate (PK approved). Parent brief marked SUPERSEDED-BY cc-0010A + cc-0010B + cc-0010C for execution. v1 scope contract preserved as authoritative reference; sub-briefs are the apply-active versions.*
