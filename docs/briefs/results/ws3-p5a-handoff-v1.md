# WS-3 Asset Gap — P-5A mission handoff (session close)

**Created:** 2026-08-01 Sydney · **Author:** Claude Code (orchestrator)
**Status:** **P-5A COMPLETE.** No live activation authority granted or exercised.
**Continuation session:** `asset-gap-p5b-apply-and-closeout`
**Canonical records:** `docs/briefs/results/ws3-asset-gap-activation-lane-result-v1.md` (lane result) ·
`docs/briefs/ws3-asset-gap-live-writer-scheduler-packet-v1.md` (P-5A packet, §0.1–§0.5 review
history) · `docs/briefs/ws3-asset-gap-read-view-packet-v1.md` (T2 read view) ·
`docs/briefs/results/ws3-asset-gap-register-reconciliation-result-v1.md` ·
`docs/briefs/results/ws3-responsible-lane-routing-design-v1.md`

---

## 1. The eight frozen hashes

Re-verified **byte-exact at handoff**. These are the exact values P-5B runs against; any
mismatch at the next sitting is a STOP, not a discrepancy to reconcile.

| # | Artifact | Channel | sha256 |
|---|---|---|---|
| 1 | `ws3-live-writer-stage-a-dark-infra-v2.sql` | `apply_migration` | `dfa4d8149f81f61596b73a970ec6b19f4ccf33e17921233579a4718f68944fbe` |
| 2 | `ws3-live-writer-stage-b-proving-run-v2.sql` | `execute_sql` | `cdc9527da08c373db94e6925c45ed1369389754038afa6a9c64ab4e8dec2b15d` |
| 3 | `ws3-live-writer-stage-c-schedule-v2.sql` | `execute_sql` | `d997ec3edacbc503cae1cfbdf5ba93d432cdc1741d7776431f3acd74c9b79c80` |
| 4 | `ws3-live-writer-stage-a-dark-infra-v2-rollback.sql` | `apply_migration` | `c4fe9f7483380ec75ffb3dd6d3ffd82635acf0b3f2f36c5b606b06a9085b4172` |
| 5 | `ws3-live-writer-stage-b-proving-run-v2-rollback.sql` | `execute_sql` | `40467e06c08b388295f6a14424180b06405104bddf072cba36d40dfbe981afe8` |
| 6 | `ws3-live-writer-stage-c-schedule-v2-rollback.sql` | `execute_sql` | `7cbaff07386319990f7d670f56605baadd6b2588f1bbfb78b6b940be8be49a82` |
| 7 | `ws3-asset-gap-backlog-view-v1.sql` | `apply_migration` | `8d5ca12d763f69f0d3f9d804fef40bc97a80d15322add52cd4fe20f62d2e8985` |
| 8 | `ws3-asset-gap-backlog-view-v1-rollback.sql` | `apply_migration` | `7d41520f2de6e3d3840311ef82635d3b34e22679b75c4fb9a4331c3a9121e014` |

All under `docs/briefs/artifacts/`. Stage-A intended migration name
`ws3_asset_gap_live_writer_stage_a_dark_infra_v2`; read view
`ws3_asset_gap_backlog_read_view_v1` — **neither is the ledger identity until
`apply_migration` mints its own version.** Record the minted version, not the intended name.

**Reviews pinned to these hashes:** `82ca26aa` (read view) · `66fb08f0` (rev-4 set) ·
`e09a739f` (rev-4a rollback-B — terminating, **non-escalating**).

## 2. Outstanding decisions — exactly four

| # | Gate | Options | Recommendation |
|---|---|---|---|
| **D-1** | WS-3(c), independent of P-5B | A route-then-demote *(WITHDRAWN — disproved)* · B demote now · **C two-register model** | **C.** B silently drops ~10 live backlog items with nothing inheriting them. |
| **D-3** | Read view, **separate T2 gate** | **INNER** join `c.client` · LEFT | **INNER.** `client_id` is NOT NULL with an FK on NO ACTION, so the orphan row LEFT guards against is unreachable. |
| **D-4** | Read view, **separate T2 gate** | **KEEP** grant-total pin at 15 · DROP | **KEEP.** The brittleness is the control — it turns a silent over-grant into an abort. |
| **OQ-10** | P-5B | **A declare** *(ruled 2026-08-01)* · B tighten to run attribution | **Confirm A.** All four acceptance facts re-verified live at card time and still hold. |

**D-3 and D-4 gate the READ VIEW, not P-5B.** Approving P-5B does not apply them.

**OQ-10 carries a standing re-open trigger:** the Stage-B rollback is a whole-table restore, so
it would destroy concurrent third-party writes to `m.asset_gap_suggestion` /
`m.asset_gap_observation` **and its verification would still report success**. Accepted only
because those tables are provably unread. **If any consumer or writer of them is ever added,
this must be re-decided before that lane ships.**

*(Already decided, not outstanding: OQ-11 → B, no second ledger version to rehearse rollback A.)*

## 3. P-5B remains UNTAKEN

P-5B is a separate PK activation gate. It has **not** been taken, granted, or exercised. The
sitting card is staged and delivered to CGU planning; PK has it queued at priority 5. **No
live activation authority was held or conveyed by this session.**

## 4. Nothing was applied — verified live at handoff

| Object | State |
|---|---|
| `m.asset_gap_analysis_run` (run-log table) | **ABSENT** |
| `m.run_asset_gap_analysis_scheduled` (wrapper) | **ABSENT** |
| `ice_ro.asset_gap_backlog` (read view) | **ABSENT** |
| cron job `asset-gap-analysis-daily` (scheduler) | **ABSENT** |
| `m.cron_health_check` row for that job | **ABSENT** |
| migrations matching `%ws3%` in the live ledger | **0** |
| `public.run_asset_gap_analysis` dry-run default | **`true` — unchanged** |
| gap ledger | **8 rows / 4 open — unchanged since 2026-07-20** |

No writer, scheduler, wrapper, run-log table, or read view was applied. Zero DML, zero DDL,
zero deploys. Nothing committed, nothing pushed. Every DB interaction was a SELECT or catalog
read, plus one session-local `CREATE TEMP TABLE` used solely to settle the `age(xmin)`
question, which vanished with its session.

## 5. First actions for `asset-gap-p5b-apply-and-closeout`

1. **Re-verify all eight hashes before anything else.** Drift = STOP; do not reconcile.
2. Re-run the §4 live-state table — it is the pre-apply baseline every Stage-B guard is bounded against.
3. Confirm the four decisions above are ruled before touching P-5B.
4. `branch-warden` first: this lane ran in the **shared default worktree**, HEAD moved 3× mid-lane, and session-bootstrap parity was **stale and backwards** (local `main` is AHEAD of origin, not behind). Re-derive ahead/behind and the exact commit list before any push; stage only explicit paths, never `git add -A`.
5. On approval, follow packet §5.1 steps 1–7 in order — the rollback rehearsal happens **inside** P-5B (OQ-11 ruling), not before it.
6. Send the real outcome-delta to `docs-hygiene-register-reconciliation-t1` — including the **minted** Stage-A migration version. Version-less; that lane is the single register-cut owner.

## 6. Non-claims

This session held no apply, deploy, or activation authority and exercised none. It does not
approve any artifact, clear any gate, or pre-empt P-5B. The read view is unapplied and its own
T2 gate is untaken. The markdown register was **not** demoted (pending D-1). WS-3(d) was
designed, not built. Carried and explicitly not closed: OQ-3 (run-log retention), OQ-5
(unbounded reconcile pass), OQ-6 (automated alerting), OQ-8 (transitive selector-policy
coupling), OQ-9 (column-drift assertion).
