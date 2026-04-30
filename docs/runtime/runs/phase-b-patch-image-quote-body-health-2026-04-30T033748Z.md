# Run State: phase-b-patch-image-quote-body-health-gate

Status: review_required
Risk tier: 2
Started: 2026-04-30T03:37:48Z
Finished: 2026-04-30T03:37:48Z (drafted; awaiting chat to apply via Supabase MCP and run the four-step rollback test)

## Work completed

- Read brief in full at `docs/briefs/phase-b-patch-image-quote-body-health-gate.md`.
- Ran the four pre-flight queries verbatim from the brief:
  1. `pg_get_functiondef('m.fill_pending_slots(integer, boolean)'::regprocedure)` — captured ~12k-char definition verbatim.
  2. `SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname = 'fill_pending_slots'` — exactly 1 row, args `p_max_slots integer, p_shadow boolean`. No overload ambiguity.
  3. `pg_get_viewdef('m.hot_breaking_pool'::regclass, true)` — captured view body verbatim.
  4. Dependents check via `pg_depend` joined to `pg_class`/`pg_namespace`, filtered to non-system schemas — empty result. Zero dependents on either object.
- Drafted `supabase/migrations/20260430033748_phase_b_patch_image_quote_body_health_gate.sql`:
  - `-- ROLLBACK SQL:` header comment containing the verbatim original `CREATE OR REPLACE FUNCTION m.fill_pending_slots(...)` and `CREATE OR REPLACE VIEW m.hot_breaking_pool AS ...` definitions captured during pre-flight, every line prefixed with `-- ` so the file is self-contained for rollback.
  - `BEGIN; ... COMMIT;` wrapper so the function and view replacement apply atomically.
  - Patched `CREATE OR REPLACE FUNCTION m.fill_pending_slots(integer, boolean)` — single edit relative to original: the body-health `EXISTS` clause from the brief appended to the WHERE block of (a) the `candidate_pool` CTE (after the two `NOT EXISTS` dedup clauses) and (b) the `relaxed_pool` CTE (after the one `NOT EXISTS` dedup clause). All other code byte-identical to captured definition.
  - Patched `CREATE OR REPLACE VIEW m.hot_breaking_pool` — single edit relative to original: the same `EXISTS` clause appended to the existing `WHERE`. Column list, joins, and `ORDER BY` byte-identical to the captured view body.
- Added brief row to `docs/briefs/queue.md` Active queue with status `review_required`.

## Questions asked

- *(none — pre-flight was clean)*

## Answers received

- *(none)*

## Corrections applied

- *(none)*

## Validation results

- **Pre-flight 1 (function captured):** `pg_get_functiondef` returned the function definition by exact regprocedure cast. Captured verbatim into the rollback header.
- **Pre-flight 1a (overload count):** 1 row returned. Safe to proceed (brief required STOP if >1).
- **Pre-flight 2 (view captured):** `pg_get_viewdef` returned the view body. Captured verbatim into the rollback header.
- **Pre-flight 3 (dependents):** 0 rows in non-system schemas. Rollback is clean.
- **Diff discipline:** the only character-level changes between captured original and patched output are the two new `AND EXISTS (...)` blocks plus a `-- Phase B patch — body-health gate` marker comment immediately above each. No other whitespace or semantic changes.

## Stop conditions

- *(none triggered)*

## Needs PK approval (and chat to drive)

Per brief and the user's hand-off message, chat (with PK oversight) takes the next four steps. CC does not apply migrations.

1. **Apply** `supabase/migrations/20260430033748_phase_b_patch_image_quote_body_health_gate.sql` via Supabase MCP `apply_migration`.
2. **Reproducibility verification:** re-run the body-health filter query against the 12 canonicals selected across the 3 fill cycles for the 4 failed slots. Expect: **9 excluded, 3 pass.**
3. **Pool retention check:** after the patch, count active signal_pool rows that pass the body-health filter for each client. Expect:
   - Care For Welfare → 132 (± small drift from natural pool churn)
   - NDIS-Yarns → 132 (± small drift)
   - Property Pulse → 64 (± small drift)
   - Invegent → 13 (± small drift; thin-pool signal already captured in D174)
4. **Four-step rollback test sequence (Rollback plan §5):**
   1. Apply patch → confirm patched definitions are live (`pg_get_functiondef` / `pg_get_viewdef` show the new EXISTS clauses).
   2. Apply rollback (the `CREATE OR REPLACE` statements from the rollback header in the migration file) → confirm originals are live.
   3. Re-apply patch → confirm patched definitions are live again.
   4. Closure note records the timestamps of all four state transitions.

## Token usage (optional)

- *(not tracked)*

## Issues encountered

- *(none — pre-flight clean, draft generated cleanly, no surprises)*

## Next step

Chat applies the migration, runs reproducibility + retention verification, runs the four-step rollback test, then authors the closure section of this run state including:

- Reproducibility result (9/3 split confirmed or actual numbers if drift)
- Pool retention numbers per client (CFW/NDIS-Yarns/PP/Invegent)
- Timestamps of all four rollback-test state transitions
- The four +24h observation queries from the brief (post-patch checkpoint protocol — no new `exceeded_recovery_attempts`, shadow `ai_job` fail rate < 5%, no new `slot_fill_no_body_content` errors, no sharp rise in `pool_thin` skips)
- Update queue.md row status from `review_required` → `done`

The migration includes its own rollback SQL inline, so the rollback test does not require separate file authorship.
