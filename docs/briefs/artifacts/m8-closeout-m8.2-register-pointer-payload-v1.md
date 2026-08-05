# Register-pointer payload — M8 closeout + M8.2 (version-less, pending assignment)

> **Not yet cut into `docs/00_sync_state.md`.** Per CCF-02's "Parallel-session claims" convention
> (CLAUDE.md), no version number is self-assigned here — whoever next cuts a register version
> should claim the next free `v6.NNN` (scan the current head first), paste the block below
> verbatim under that heading, and run `claim-stub` per the standing checklist.

```
> **✅ v6.NNN — M8 CLOSEOUT (PK-attested visual + full 8-row live badge-state evidence) + M8.2
CLOSED same day (scheduled_demand boolean contract repair, T2 · isolated 5-file dashboard fix,
zero DB/RPC/schedule/readiness-semantics touch)** — results:
`docs/briefs/results/m8-asset-gap-dashboard-panel-result-v1.md` (updated §0.1/§6/§7),
`docs/briefs/results/m8.2-scheduled-demand-contract-repair-result-v1.md` (new).
> · M8 closeout addendum: PK personally opened `/clients?tab=asset-gap` in production and
confirmed the tab + the Property Pulse row render correctly (§0.1) — supersedes the
agent-side "no screenshot" caveat for that client/row. Blocked/Autonomy-ready/Unclassified
badge states each now have a named, cited live row (§0 addendum). All 8 live
`ice_ro.asset_gap_backlog` rows confirmed as a full read, not a sample.
> · M8.2: the RPC's `scheduled_demand` was already correct (SQL boolean, `NOT is_probe_cell`) —
only the dashboard's `lib/production-readiness-queue.ts` mistyped/mis-parsed it as
`number | null`/`asNum`, silently nulling every real value. Retyped `boolean | null` +
`asBoolOrNull`; repaired the Production Readiness Queue tab's "Scheduled demand" cell and the
Asset Gap tab's `hasScheduledButNotExecutable` schedule-plan flag off the same field. Live-verified
directly (`execute_sql`, project `mbkmaxqhsohbtwsqolns`): 76/76 live cells across every current
client return a native JSON boolean, zero exceptions; `is_probe_cell=false`/`scheduled_demand=true`
paired on all 45 sampled rows; no live probe cell exists right now to observe the `false` branch
(evidenced instead by the migration's own CTE construction + the pre-existing test fixture).
9 new regression tests (true/false/null-missing/malformed); 371/371 total pass (was 362);
`tsc --noEmit` + `next build` clean; `branch-warden` confirmed exactly 5 files before commit.
Pushed `invegent-dashboard` `claude/asset-gap-dashboard-panel-bdey55` `b3440ec`. No DB/RPC/migration
touch, no deploy/merge.
> · Both dashboard-repo commits (M8's `1d87ec7`, M8.2's `b3440ec`) confirmed on the feature branch;
`main` remains fast-forwarded to `1d87ec7` as of this closeout (M8.2 not yet on `main` — awaits
the same PK merge posture as M8).
> · **M8.1 — dashboard legacy-route authority integration** remains OPEN, unstarted, non-blocking
(unchanged scope, see the M8 result doc §7).
```

**Files this payload cites (for the register-cutter's own verification, not to be re-derived):**

- `docs/briefs/results/m8-asset-gap-dashboard-panel-result-v1.md` (updated this session)
- `docs/briefs/results/m8.2-scheduled-demand-contract-repair-result-v1.md` (new this session)
- `docs/briefs/m8.2-scheduled-demand-contract-repair-gate1-brief-v1.md` (new this session)
- `invegent-dashboard` commit `b3440ec` on `claude/asset-gap-dashboard-panel-bdey55`
