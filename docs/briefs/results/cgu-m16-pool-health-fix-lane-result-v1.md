# Result — CGU Final Build Lane (recycled from L2): M16 Pool-Health Fix (isolated, non-production)

**Seed:** cross-session control-tower dispatch, "M16 fix build" recycle (2026-08-06), per ratified v6.147 §2.1 (Option C + folded Option B)
**Governing ruling:** `docs/briefs/cgu-final-build-acceleration-ruling-v1.md` (isolated, non-production implementation only)
**Design authority:** `docs/briefs/results/s1-m16-cfw-pool-starvation-diagnosis-v1.md` (S1 root-cause diagnosis — implemented as diagnosed, no re-design)
**Executed by:** Claude Code orchestrator (live `pg_get_functiondef` baseline reads + W-1 evidence gathering) + `ef-builder` subagent + `branch-warden` verification
**Completed:** 2026-08-06 Sydney
**VERSION-LESS** — no register/sync-state cut (this doc is the record)

---

## 1. Result status

`Complete` — isolated build only, as scoped. E-1 precondition-2 ("this fix LANDED") is NOT yet met — that requires the post-watch apply, not this authoring lane.

## 2. Commits (isolated branch `lane/m16-pool-health-fix-build`, worktree `C:\Users\parve\ice-worktrees\m16-pool-health-fix`, based on main HEAD `e121f6b`)

- `7246c0f` — docs(m16): fresh `pg_get_functiondef` baselines for `check_pool_health` + `fill_pending_slots`
- `440e99e` — build(m16): pool-health decay visibility (Option C) + format-specific fitness gate (Option B) — NOT_APPLIED

Branch is purely local — no upstream configured, confirmed absent from `origin` via `git ls-remote`. `branch-warden` verdict: **safe** (HEAD `440e99e`, exactly these 2 commits + the expected 7-file set, clean tree, main checkout untouched at `e121f6b`).

## 3. Files changed

- `docs/briefs/artifacts/m16-live-baseline-check_pool_health-v1.sql` — created (live `pg_get_functiondef` baseline, orchestrator-authored)
- `docs/briefs/artifacts/m16-live-baseline-fill_pending_slots-v1.sql` — created (live `pg_get_functiondef` baseline, orchestrator-authored)
- `supabase/migrations/NOT_APPLIED_m16_pool_health_option_c_and_b_v1.sql` — created (354+ lines; `ef-builder`)
- `docs/briefs/artifacts/m16-w1-fleet-relevance-analysis-v1.md` — created (read-only analysis; `ef-builder`)
- `_harness/m16_pool_health_fix_v1/test_check_pool_health_defect_regression.sql` — created, force-added
- `_harness/m16_pool_health_fix_v1/test_check_pool_health_positive_cases.sql` — created, force-added
- `_harness/m16_pool_health_fix_v1/test_fitness_per_format_gate_unchanged.sql` — created, force-added

No `supabase/functions/**` file touched (pure DB-function work, as scoped).

## 4. Actions taken

**4.1 Live baseline capture (functiondef-gate discipline).** Before any fix was authored, the orchestrator pulled the CURRENT LIVE bodies of both target functions via `pg_get_functiondef`, routed through the R0 catalog path (`db-read.py` against `pg_proc`/`pg_attribute` — world-readable regardless of `ice_readonly`'s lack of `USAGE` on schema `m`, since Postgres system catalogs are globally visible). This avoided trusting the migration-file copy, which can drift from what's actually live (standing repo gotcha). Also confirmed live: `m.signal_pool.fitness_per_format` exists as a jsonb column and is currently unread by `check_pool_health()`; `check_pool_health(11)` and `check_pool_health(12)` both return `health:'green'` today (2026-08-06T03:55:21Z) — the exact masking state the S1 diagnosis describes.

**4.2 Option C — health-check decay visibility (`m.check_pool_health`).** `ef-builder` added body-fetch-health and reuse-decay visibility to the vertical-level health gate, general/client-agnostic (signature unchanged — `p_vertical_id` only):
- New per-row signal `body_health_pass` — the exact `f.canonical_content_body` predicate (`fetch_status='success'`, `LENGTH(TRIM(extracted_text))>=200`, `word_count>=300`) copied verbatim from `fill_pending_slots`' own candidate CTE, so the two functions agree on "usable."
- New per-row `reuse_multiplier` from `t.reuse_penalty_curve`, joined identically to `fill_pending_slots`.
- New derived `active_usable = COUNT(active AND body_health_pass AND reuse_multiplier >= 0.75)` — the 0.75 floor is a documented engineering judgment call (keeps reuse_count 0–1 rows "decay_healthy", excludes reuse_count≥2), flagged explicitly as not independently derived from any policy table.
- **The gate itself now decides on `active_usable`, not raw `active`.** All prior output keys preserved byte-for-byte; four new keys appended (`active_usable`, `body_health_pass_count`, `body_health_pass_rate`, `decay_healthy_floor`).
- **Worked arithmetic, not asserted:** for CFW's live-documented state (69–70 active rows; 35 fresh rows all body-health-failing per the S1 fetch-status table; 34 reused rows all body-health-passing but at `reuse_count=2` → multiplier 0.65 < 0.75 floor), `active_usable = 0` → `health` computes to **`'red'`** — the exact string `fill_pending_slots`' relax branch compares against (`= 'red'`, not merely non-green). This was explicitly checked against the live baseline file's call site rather than assumed.

**4.3 Option B — format-specific fitness gate (`m.fill_pending_slots`).** Both `effective_fitness`/`eff_fit` computation sites (main `candidate_pool` CTE and the post-relax `relaxed_pool` CTE) changed from the class-wide `sp.fitness_score_max` to:
```sql
COALESCE((sp.fitness_per_format->>v_chosen_format)::numeric, sp.fitness_score_max)
```
— fail-open to today's behavior when a row lacks a per-format breakdown. No other line of the 806-line function body was touched; `CREATE OR REPLACE` preserves existing grants (no REVOKE/GRANT added, per the standing repo gotcha). Verified, not merely asserted: old (`88 × 0.65 = 57.2`) vs new (`55 × 0.65 = 35.75`) — both remain below the `image_quote` threshold of 60, confirming the S1 diagnosis's own claim that this fix does not change CFW's current zero-qualifying outcome. It is correctness hygiene for every other class/format pair, not a CFW fix — the result doc does not overclaim this.

**4.4 W-1 fleet-relevance analysis (read-only, nothing applied).** NDIS-Yarns shares the identical verticals 11/12 with CFW (same `m.signal_pool` rows, confirmed via `c.client_content_scope`), and `t.format_quality_policy`/`t.format_synthesis_policy` are global per-format (no client scoping) — so the same masking mechanism applies. Conclusion, evidence-graded:
- **`pool_thin` skips (NDIS day-3: IG 3 · LI 2 · FB 1)** — go through the identical `check_pool_health()`-gated relax code path. Option C **plausibly extends the same relax opportunity** to these — not independently re-verified with a live per-format NDIS read (out of scope for a read-only analysis), so stated as plausible, not certain.
- **`bundle_diversity_insufficient` skips (NDIS day-3: FB 5 · LI 4)** — a structurally distinct source-diversity check reached only after the pool already clears the min-size gate; it never consults `check_pool_health()`. Option C **does not apply** to this category. Stated definitively, with the code-path citation showing why.

**4.5 Hermetic test fixtures.** Three files under `_harness/m16_pool_health_fix_v1/` (force-added past the `_harness/` gitignore, matching the M7/cc0046 precedent): a defect-regression proof (CFW-shaped fixture, confirms the new function would have satisfied the OLD green gate on raw numbers but now computes `active_usable=0` / `health='red'`, and explicitly checks the fixture nets to the literal string `'red'`, not just non-green), a positive-case proof (healthy + a differently-shaped degraded fixture, generalization check), and the Option-B old-vs-new arithmetic proof. **Not executed against a live/scratch database** — no `psql`/Docker available in the build environment, same constraint as the M7 lane. Disclosed honestly, not claimed green.

## 5. Constraints confirmed (per the build-acceleration ruling's prohibited list)

- No production database migration applied — confirmed: `NOT_APPLIED`-prefixed, not referenced by any migration-runner list, never executed against any database
- No live selector/palette/routing/voice-config change — not applicable (this is a schedule-fill scoring/health function, not those surfaces); no change is live
- No production worker deployment or cron activation — confirmed: zero `supabase/functions/**` touched
- No asset intake/promotion — not applicable
- Watch evidence untouched — confirmed: no write to any live table; the two `check_pool_health(11/12)` reads and the NDIS vertical lookup were read-only `SELECT`s via `execute_sql`/`db-read.py`, not part of the watch log itself
- Both fixes remain **general/client-agnostic** — confirmed: no CFW or NDIS literal, no `client_id` parameter added to either function signature
- `CREATE OR REPLACE` used for both functions (grants preserved) — confirmed, no REVOKE/GRANT statement added or needed
- The relax branch's `= 'red'` string comparison was not redefined — confirmed byte-unchanged in `fill_pending_slots`; the regression test explicitly checks for the literal string, not "non-green"

## 6. Open issues

1. **Hermetic fixtures not live-executed** — no `psql`/Docker in the build environment. Recommended before any Gate-1 apply review, same as the M7 lane's open issue.
2. **The 0.75 `decay_healthy_floor`** is an engineering judgment call, not derived from any policy table — flagged for `db-rls-auditor`/PK review at apply time, not treated as self-evidently correct.
3. **Option B's arithmetic proof covers only the `analytical`-class half** of CFW's 34-item pool (fitness_per_format=55 for `image_quote`, per the S1 diagnosis's own cited number) — no live number exists in the cited evidence for the `educational_evergreen` half, so that half is not independently arithmetic-checked (honestly disclosed in the test file rather than a fabricated number).
4. **W-1's `pool_thin` conclusion is a plausibility argument, not a live NDIS-specific re-measurement** — explicitly scoped that way per the seed's "analysis only" instruction. A live per-format NDIS pool read is a candidate follow-up if PK wants certainty before the M16 apply, but was not run here (out of scope for a read-only analysis and not requested).
5. This migration is not yet wired into any dashboard/monitoring surface that reads `check_pool_health()`'s output shape — the four new keys are additive, so no consumer should break, but this was not independently verified against every caller.

## 7. Next recommended step

A fresh Gate-1 to apply `NOT_APPLIED_m16_pool_health_option_c_and_b_v1.sql` — requires, at minimum: live/scratch-DB execution of the three hermetic fixtures, `db-rls-auditor` review (this touches two live SECURITY-relevant selection functions, `structural_DDL_DML_escalation`-tier per CLAUDE.md's external-review triage), external review pinned to the file's hash, `branch-warden` re-verification, and an explicit PK apply gate. **This is E-1's precondition-2 critical path** — the fix must LAND (be applied), not merely exist as an artifact, to satisfy it. **Watch-gated**: cannot proceed before the Phase-1 schedule watch reaches PASS and PK grants explicit production authorization (~2026-08-11 20:20 Sydney or later).

---

## 8. Verification

**Verdict:** `Pass`

**Notes:**
- Scope matched the seed's four numbered items exactly (Option C, Option B, W-1 analysis, hermetic fixtures) plus the result doc.
- The orchestrator did NOT delegate the live-baseline `pg_get_functiondef` reads to `ef-builder` (which has no DB tool access) — pulled them directly via the R0 catalog path and the `execute_sql` R1 path for the NDIS/vertical facts, then handed `ef-builder` the frozen baseline as ground truth. This is the correct division of labor per the team-table charter (`ef-builder` is local-only, no DB access).
- Independently re-read the Option C SQL and the W-1 analysis doc before accepting them — confirmed the gate arithmetic (`active_usable=0 → 'red'`, matching the relax branch's exact string comparison) and the W-1 skip-category split (pool_thin vs bundle_diversity_insufficient) both hold up against the cited evidence, not just against `ef-builder`'s self-report.
- `branch-warden` independently confirmed the exact file set and commit history rather than trusting `ef-builder`'s stated file list.

## 9. Learning notes

- When a build lane requires a `CREATE OR REPLACE` on a live function, pulling a fresh `pg_get_functiondef` baseline via the R0 catalog path (system catalogs are world-readable regardless of `ice_readonly`'s schema-`m`/`c` USAGE restriction) and handing it to `ef-builder` as a committed reference file works well — `ef-builder` has no DB tools, so this baseline-then-build split is the repeatable pattern for any future "fix a live function" build lane under the isolated-worktree contract.
- Two clients sharing the same content vertical (CFW + NDIS both on 11/12) turns a single-client root-cause diagnosis into a fleet-relevant one almost for free — worth checking `c.client_content_scope` overlap early in any future single-client starvation diagnosis, since the fix's blast radius (and the W-1-style fleet-relevance question) follows directly from vertical-sharing, not from anything client-specific in the code.
