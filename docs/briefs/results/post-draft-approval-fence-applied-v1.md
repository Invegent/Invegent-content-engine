# Result — `m.post_draft` approval-provenance fence — APPLIED

**Date:** 2026-08-01 Sydney · **Tier:** T3 (production DDL, new trigger on a hot table) ·
**Lane class:** SAFETY_GATE
**Status:** **APPLIED — LIVE.**
**Authorization:** PK Gate-2, 2026-08-01 final sitting item 4, relayed via `local_aac5adf2-…`
(CGU planning): *"Proceed with the exact reviewed approval-provenance fence Gate-2 apply."*
**Governing:** `docs/briefs/post-draft-approval-fence-gate1-brief-v1.md` (rev-3),
`docs/briefs/gate2-sitting-card-post-draft-approval-fence-v1.md`

---

## 1. What was applied

`m.guard_post_draft_approval_provenance()` (SECURITY DEFINER trigger function) +
`trg_guard_post_draft_approval_provenance` (`BEFORE INSERT OR UPDATE` on `m.post_draft`), from
`supabase/migrations/20260801120000_post_draft_approval_fence_guard_v1.sql`, frozen hash
`2bd2ae1eb34dd872ae17483a8aec2e627578bf0ab8c7f3f93e2df986fbb68fff`, commit `16e1b75` on
`lane/post-draft-approval-fence`.

**Live ledger identity:** `apply_migration` minted its own version `20260801085637` (standing
gotcha — the tool's own timestamp, not the file's `20260801120000`; the applied content is
byte-identical to the frozen file, which is what matters).

## 2. Pre-apply verification (immediately before, per authorization terms)

- Migration file re-hashed fresh from the isolated worktree: byte-identical to `2bd2ae1e…`.
- **Fresh `branch-warden` pass** (explicitly required, not a reuse of the earlier one): `safe` —
  HEAD pinned at `16e1b75`, working tree clean, not merged, not pushed, `main`/`origin/main`
  parity `0 ahead / 0 behind`.
- Live preconditions re-checked: function/trigger absent, migration ledger empty for this
  identity, `approval_status` CHECK constraint unchanged, 4 existing triggers on `m.post_draft`
  unchanged, `REVOKE` target's ACL/signature unchanged (shared precondition read with the grant
  apply, §2 of that result doc).

No drift on either check. Applied.

## 3. Apply

Submitted as one `apply_migration` call — single message, matching the atomicity requirement the
migration's own fail-closed assert block depends on. **The assert block did not raise** (function
presence, trigger presence, anon/authenticated EXECUTE-absence all held on the first try).

## 4. Post-apply verification — corrected procedural sequencing, disclosed

**A sequencing mistake happened here and is recorded rather than smoothed over.** Before running
`apply_migration`, I built the full live verification script (below) and ran it first, under the
mistaken assumption I had already applied the migration. Every "should be blocked" case came back
`NOT BLOCKED` and every "should succeed" case succeeded — a pattern that, on inspection, meant
only one thing: the trigger did not exist yet. I had skipped the apply step itself. Caught before
drawing any conclusion from it, confirmed zero rows had leaked (the check ran inside
`BEGIN…ROLLBACK` regardless, so nothing could have persisted either way), then actually applied
the migration (§3), then re-ran the identical verification script. The result below is from
**after** the real apply.

### Live 16-case verification (of the hermetic harness's 18; the 2 excluded by design are the
rollback-file's own syntax/reversal tests — already hermetically proven, and running them live
would immediately undo the fence just applied, which is not a meaningful post-apply check)

Run inside a single `BEGIN…ROLLBACK` transaction against the real `m.post_draft` table, each case
isolated via PL/pgSQL exception handling so one outcome never aborts the others. Nothing committed
regardless of outcome — confirmed via a post-verification row count against the test marker
(`draft_body='__gate2_verify__'`): **0 rows, both before and after this pass.**

```
[PASS] SC1_incident_insert: blocked 23514
[PASS] SC2a_draft_set_status_shaped_update: blocked 23514
[PASS] SC2b_ui_set_post_draft_status_v1_shaped_update: blocked 23514
[PASS] SC3_plausible_unrecognized_value: blocked 23514
[PASS] SC4a_auto_approver_pattern: succeeded
[PASS] SC4b_draft_approve_and_enqueue: succeeded
[PASS] SC4c_draft_approve_and_enqueue_scheduled: succeeded
[PASS] SC4d_portal_approve_draft: succeeded
[PASS] SC4e_manual_post_insert_queue_path: succeeded
[PASS] SUPP1_published_status_coverage: succeeded
[PASS] SC5a_unrelated_update_compliant_row: succeeded
[PASS] SC5b_unrelated_update_legacy_out_of_vocab_row: succeeded
[PASS] SC6_manual_post_insert_non_queue_null_approver: blocked 23514
[PASS] SC6b_update_path_null_approver_variant: blocked 23514
[PASS] SC7a_guc_override_bypasses: succeeded
[PASS] SC7b_guc_reset_restores_enforcement: blocked 23514

SUMMARY: PASS=16 FAIL=0 TOTAL=16
```

**16/16 PASS, 0 FAIL — live, against the real production table.** This is the same logic the
hermetic harness proved (`ef-builder`, `@electric-sql/pglite`, ephemeral WASM Postgres), re-run
here against the actual `m.post_draft` schema, actual FK constraints (`platform` required a real
`platform_code` value from `t."5.0_social_platform"`, not the ephemeral stub's free-text column —
adjusted, not a defect), and the actual live trigger. Both NULL-bypass cases that were the rev-2
defect (SC6, SC6b) are now correctly blocked. Both incident-replay cases (SC1, SC2a/b) and the
plausible-unrecognized-value case (SC3) are correctly blocked. All four confirmed-legitimate
writers, the unrelated-column no-op cases, and the deliberate GUC-override bypass all still
succeed exactly as designed.

## 5. Live object confirmation

| Check | Result |
|---|---|
| `to_regprocedure('m.guard_post_draft_approval_provenance()')` | present |
| `trg_guard_post_draft_approval_provenance` on `m.post_draft` | present |
| `has_function_privilege('anon', …, 'EXECUTE')` | `false` |
| `has_function_privilege('authenticated', …, 'EXECUTE')` | `false` |

## 6. Rollback (on file, not needed)

`supabase/migrations/20260801120001_post_draft_approval_fence_guard_rollback_v1.sql`, hash
`1a902c206e00a01f11e7a0b81f4a8dbc908d32fe10dbd8ab5f25c68ec1c48da2` — `DROP TRIGGER` then
`DROP FUNCTION`, own fail-closed assert. Hermetically proven correct; not run against production.

## 7. What this closes, and what it does not

**Closes:** the 2026-07-31 incident's exact structural bypass, for every current and future write
path — raw SQL, `draft_set_status`, `ui_set_post_draft_status_v1`, or anything not yet written.
No draft can be written into `approved`/`scheduled`/`published` with `approved_by` set to anything
outside the four confirmed hardcoded-safe values, and the NULL-bypass gap is closed.

**Does not close:** a determined actor already holding `postgres`/`service_role` access who knows
the four-value vocabulary could still write `approved_by='manual'` to blend in, or set the
trigger's own override GUC. No real actor-identity system exists anywhere in ICE — a separate,
unaddressed architectural gap, not something this trigger claims to solve (stated in the brief,
repeated here so it isn't lost at the moment of apply).

## 8. Non-claims

No historical row touched. No existing trigger, function, grant, or RLS policy altered. No other
object modified. The 16-case live verification is not literally identical in mechanism to the
hermetic proof (real table, real FK constraints, real trigger vs. an ephemeral stub) — it is the
same test logic, adapted for the real schema, and both independently produce the same result.
