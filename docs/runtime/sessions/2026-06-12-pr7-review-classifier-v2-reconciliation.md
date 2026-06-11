# PR #7 Review — Classifier v2 Repair Reconciliation — 2026-06-12

**Directive:** PR #7 Review Directive (PK, 12 June 2026). Review only.
**PR branch:** `repair/classifier-v2-telemetry` → main. **Reviewer:** CCH.
**Method note:** the standard GitHub MCP (PR API) was unresponsive (4-min timeout); review performed via the Invegent bridge (branch-ref file/tree reads) + live production reads via `execute_sql`. Tree-SHA comparison branch↔main used in place of the PR file list.
**Production effect of this review:** none (0 writes / 0 migrations / 0 deploys / 0 backfills / 0 register updates).

---

## A. Findings

**A1. Repo↔production function parity — CONFIRMED (logic-exact).** Live `m.classify_canonical`, `m.classify_canonicals_unclassified`, and `m.reclassify_canonicals` were pulled in full via `pg_get_functiondef` and compared line-by-line against the migration's PARTs 5–7. Logic is identical in every respect: created_at-based recency, telemetry emit shape, NULL-only picker, bounded reclassify (advisory lock + `p_max_total` ceiling + version-distinct picker). The only difference is that the live bodies lack the migration's explanatory comments — i.e. the repo file is an **annotated re-authoring** of what was applied, not a byte-identical transcript. Logic parity is the standard that matters here; no functional drift exists.

**A2. Both apply-time hotfixes are consolidated — CONFIRMED.** Production history carries three entries: `20260611223123` (main apply), `20260611223306` (`fix_input_used_array_append`), `20260611223401` (`fix_min_uuid_aggregate`). Both fixes are present in the consolidated file AND in the live functions: the `::text` casts on `input_used` array appends, and `(array_agg(rule_id ORDER BY rule_id))[1]` in place of `MIN(uuid)`. No missing hotfixes; no stale pre-hotfix content.

**A3. Rule repairs — CONFIRMED byte-identical live↔migration, and faithful to the audit.** All 8 repaired rule rows (`updated_at` 2026-06-11) match the migration configs exactly; every other rule untouched (2026-04-24); all `is_current` classes at `version='v2'`; timely g1's `recency_window` AND-partner is intact, so the repaired source leg correctly remains "recent AND gov/news source". The six regex repairs map 1:1 to the audit's named defects (`^why` question-shape, `explained:` word boundary, `10 Money Lessons` intervening words, verb-sense `breaking`, title-anchored `meet`, stat source substring), and the new `supabase/tests/classifier_v2_repair_smoke.sql` (read-only) asserts both fire AND non-fire directions using the audit's exact examples.

**A4. Telemetry — CONFIRMED complete and audit-sufficient.** All nine directive-required signals are implemented: `classification_method` (with guarded CHECK), `matched_rule_id`+`matched_rule_name`, `matched_rule_priority`, `matched_signal`, `input_used`, `body_available`, `defaulted`, `insufficient_content`, plus the pre-existing `classifier_version`. Live verification: all 9 columns + constraint present; **0 of the 100 v2 rows missing `classification_method`**. This makes rule-matched vs defaulted vs insufficient analytical first-class — exactly the D1 (backstop-conflation) fix the audit demanded. Future audits can now be run from telemetry alone.

**A5. Safety — CONFIRMED clean.** Tree-SHA comparison branch↔main: `app/`, `dashboard/`, `scripts/`, `supabase/functions/`, `supabase/config.toml`, `supabase/sql/` are **SHA-identical** — no Advisor, publisher, render-chain, or format-policy code is touched. Live checks: `t.platform_format_mix_default` last touched 2026-04-22 (no reseed); latest drafts still carry `format-advisor-v1`; the one classifier-related cron (`classify-canonicals-every-5m`, jobid 68, `m.classify_canonicals_unclassified(100)`) pre-dates this lane — running since 2026-04-24, 14,027 runs, command unchanged (the function was replaced in place, drop-in signature). No cron schedule change. Option C untouched.

**A6. Backfill — CONFIRMED bounded at exactly 100.** `classifier_version='v2'` rows: **100 total, all 100 are pre-apply rows** (the gated backfill); **4,371 v1 rows remain**. No mass-reclassification path exists: the cron-invoked function has a NULL-only picker (will never touch classified rows even across version bumps); `m.reclassify_canonicals` is the only reprocessing path, is hard-bounded (`LEAST(batch,max_total)` + ceiling + advisory lock), and is **not scheduled** — no cron references it.

**A7. Migration integrity — sound within the repo's known regime, with notes.** Ordering: `20260612093000` sorts after every repo migration ✓. Fresh-environment truth: a truly fresh environment would fail at PART 1 because no repo migration creates `f.canonical_content_body` — this is the repo-wide pre-existing condition (~280 DB-only history entries; `db push` already retired), **not a defect introduced by PR #7**; the file is consistent with the established applied-state-record convention. Re-applying the file against production would be harmless (IF NOT EXISTS columns, guarded constraint, CREATE OR REPLACE, idempotent UPDATEs). Two robustness notes: (n1) the rule UPDATEs target hardcoded UUIDs with no rows-affected assertions — they would silently no-op in an environment lacking those rows (verified applied in prod, so no live impact); (n2) the internal `BEGIN;…COMMIT;` will emit a harmless "transaction already in progress" warning under wrapped appliers.

**A8. Carry-forwards — CONFIRMED correctly represented.** (1) Remaining v1 rows: 4,371, awaiting any future gated reclassify decisions ✓. (2) `first_seen_at` drift: deliberately NOT fixed (out of scope); the classifier now sidesteps it via immutable `created_at`, and the drift remains an open data-quality carry ✓. (3) Repo↔prod migration-timestamp mapping: prod's three history entries vs the repo's single `20260612093000` file is a known, intentional divergence under the no-db-push regime — carried, with a suggested (optional, post-merge) one-line mapping note so a future history-repair never double-counts.

**A9. Review limitation (disclosed).** Without the PR API, the docs-tree delta between branch and main could not be enumerated file-by-file (only `docs/`, `supabase/migrations/`, and the new `supabase/tests/` differ at tree level; all code trees are identical). The docs delta is benign by class; PK should eyeball PR #7's "Files changed" tab once before merging to confirm it contains only the migration, the smoke suite, and docs.

## B. Repo ↔ Production parity

**Confirmed** — at the logic level for all three functions, byte level for all 8 rule configs, structural level for telemetry columns/constraint, and version level (v2 everywhere current). The repo file is an annotated consolidation of the three applied prod migrations; no functional drift in either direction.

## C. Risks (unresolved, none blocking)

1. **Timely g1 source-name breadth** — substrings like "Google News" and "Ministers" mean any ≤48h item from those sources is `timely_breaking`. Watch the post-repair class distribution for timely over-firing; tune the name list if needed (future lane).
2. **multi_point `{0,2}` intervening words** — marginal over-fire potential (e.g. "3 dead after crash…signs of…"). Watch item only.
3. **Silent-no-op UPDATE pattern** (A7-n1) — adopt rows-affected DO-block assertions in future rule-mutation migrations (D175-style).
4. **Timestamp-mapping carry** (A8.3) — record the 3-entry↔1-file mapping in the register or a follow-up comment; do not edit the migration now (review constraint).
5. **PR file list unverified via API** (A9) — one-glance UI check before merge.

## D. Merge recommendation

**Merge now.** All notes above are watch items or future-lane hygiene; none change what merging does, since production already runs this exact logic and merging only reconciles the repository record.

---

## Required verdict

**Approve with notes.**

---

**Authority impact:**
none
