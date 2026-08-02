# WS-3 (a) — Asset Gap backlog read view — apply result v1

**Brief/packet:** `docs/briefs/ws3-asset-gap-read-view-packet-v1.md`
**Executed by:** Claude Code (orchestrator), PK-authorised at the T2 apply gate
**Completed:** 2026-08-02 Sydney
**Governing brief:** `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §3 WS-3(a)

---

## 1. Result status

`Complete` — applied clean, all six in-transaction assertions passed, both post-apply
verification reads returned the expected data.

## 2. Commit(s)

- DB migration only (no repo commit carries SQL — the artifact was already committed). This
  result doc is committed separately on `claude/asset-gap-routing-loop-proof-3nib47`.

## 3. Live database change

- **Migration minted:** `20260802010109` / `ws3_asset_gap_backlog_read_view_v1` (intended name
  matched exactly — `docs/briefs/results/ws3-asset-gap-routing-loop-proof-result-v1.md` §1.4
  named this as the step to record).
- **Object created:** `ice_ro.asset_gap_backlog` — one view, owner-rights (non-`security_invoker`),
  SELECT granted to `ice_readonly` only.
- Applied via `apply_migration` against the byte-verified frozen artifact
  `docs/briefs/artifacts/ws3-asset-gap-backlog-view-v1.sql` (sha256
  `8d5ca12d763f69f0d3f9d804fef40bc97a80d15322add52cd4fe20f62d2e8985`, re-confirmed
  immediately before the call). No edit to the file. Rollback on file:
  `docs/briefs/artifacts/ws3-asset-gap-backlog-view-v1-rollback.sql` (unused; not exercised
  by this clean apply).

## 4. Pre-apply gate re-check (immediately before the call)

- `ice_ro` relation count: **14** (unchanged from the §1.2 re-derivation earlier the same
  session). `ice_readonly` matching SELECT grants: **14**. No drift — the pin of 15 in the
  frozen SQL was correct at the moment of apply, not just at authoring.
- Artifact sha256 re-confirmed byte-exact immediately before the call.

## 5. In-transaction assertions (Section C of the artifact) — all six passed

The migration's own `RAISE NOTICE` on success: *"ws3 ok: ice_ro.asset_gap_backlog created,
non-security_invoker, ice_readonly-only SELECT, zero PUBLIC/anon/authenticated exposure,
schema total 15, confinement intact."* No assertion raised; `apply_migration` returned
`{"success":true}`.

## 6. Post-apply verification (packet §7)

```sql
SELECT status, count(*) FROM ice_ro.asset_gap_backlog GROUP BY status ORDER BY 1;
-- → open: 3, resolved: 5
```

```sql
SELECT client_slug, platform, format, slot_kind, subject_kind, failure_state, primary_route,
       asset_gap_drainability, demand_count
FROM ice_ro.asset_gap_backlog WHERE status='open' ORDER BY client_slug, platform;
-- → 3 rows: care-for-welfare-pty-ltd/facebook/carousel, care-for-welfare-pty-ltd/linkedin/carousel,
--   invegent/linkedin/carousel — exactly L-1/L-2/L-3 from
--   docs/briefs/results/ws3-asset-gap-register-reconciliation-result-v1.md §2.1
```

**Both match expectation exactly.** Note the packet's own §7 baseline text ("expected: open=4,
resolved=4") predates the WS-3(b)/P-5B apply that already moved the ledger to 3 open / 5
resolved on 2026-08-01 — this apply's correct comparison point is the *current* live ledger
state, not the packet's authoring-time snapshot, and it matches. The fourth previously-open
row (L-4, PP/youtube/video_short_stat) is correctly absent from the `open` set — it resolved
during the P-5B standing proving run, before this view existed to observe it either way.

**Grant confirmation, post-apply:** `ice_readonly` SELECT grants on `ice_ro` = **15** exactly
(assertion 5's own check, independently re-run).

### 6.1 Named residual — the zero-prompt path itself was not exercised end-to-end

Both verification queries above were run via `execute_sql` (service-role), not via
`python scripts/db-read.py` as the packet's §7 literally specifies, because this session's
sandboxed environment has no `ICE_READONLY_DSN` credential configured (`db-read.py` rejects
with "no credential" — confirmed, not a database-side finding). The **grant itself** is
independently confirmed correct via the catalog checks in §4/§6 (`ice_readonly` holds exactly
one SELECT grant on the new view, 15 total on the schema, zero write privileges, no
`PUBLIC`/`anon`/`authenticated` exposure) — so the operator path is provably *reachable*, but
was not *exercised* zero-prompt from this session. **Recommend:** the first operator session
with a working `db-read.py` credential runs the two §7 commands verbatim as a final live
confirmation; this is a low-risk, read-only follow-up, not a re-open of the apply gate.

## 7. Constraints confirmed

- No second view added (`m.asset_gap_observation` — out of scope, packet §Scope). Confirmed:
  only `asset_gap_backlog` was created.
- No change to `m.asset_gap_suggestion`, `public.run_asset_gap_analysis`, the `ice_readonly`
  role definition, or any of the 14 pre-existing `ice_ro` views.
- No grant to `anon`, `authenticated`, `PUBLIC`, or `inspector_ro` — confirmed by assertions 3
  and 6.
- No `USAGE` added on schema `m` or `c` to `ice_readonly` — confirmed by assertion 6.
- Not bundled with any other apply — this was the only DB change in this session.

## 8. Open issues

- §6.1's named residual (zero-prompt path not exercised end-to-end from this sandbox).
- Packet OQ-1 (whether `dismissed_reason` should be surfaced), OQ-2 (second view / demand-count
  reconciliation), OQ-3 (`ice_ro.format_mix_capability_gaps`) remain open and unaffected by
  this apply — none were in scope.

## 9. Next recommended step

WS-3's programme-brief §5 DoD is now **fully satisfied** —
see `docs/briefs/results/ws3-asset-gap-routing-loop-proof-result-v1.md` §7 for the full
clause-by-clause table, now updated by this apply. Recommend: (a) the §6.1 zero-prompt
confirmation from a credentialed operator session, (b) when a `docs-register-cut-continuation`
next opens, land the pointer entries this lane and its predecessor held (Convention 1),
(c) decide arming of `.claude/routines/asset-gap-error-monitor.ps1` at its own gate.

---

## 10. Verification (chat fills this)

**Verdict:** `Pass with notes` — clean apply, all assertions passed, both content
verifications correct; the one note is §6.1 (zero-prompt path unexercised, low-risk).

## 11. Non-claims

This result does not close §6.1's residual, does not arm the monitor routine, does not cut a
register version, and does not resolve OQ-1/OQ-2/OQ-3.
