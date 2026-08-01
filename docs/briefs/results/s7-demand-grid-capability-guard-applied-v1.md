# RESULT — S7 demand-grid capability guard APPLIED / LIVE-PROVEN (P-3B executed)

**Date:** 2026-08-01 Sydney · **Lane:** S7 WS-2 (Ultimate programme brief rev-2) · **Tier:** T3 · **Class:** SAFETY_GATE
**Packet:** `docs/briefs/s7-demand-grid-capability-guard-apply-packet-v1.md` — frozen sha256 `c6d5b622bfe041fc9d9606de183a6338e1d3b6fa7e89a1985997fa44d230fcbf` (hash-checkpoint STABLE, rollup `ada411a7d9a66c6710fc553d496b1d98f46c1394d4223f0992b2932c59539a47`); hash re-verified byte-exact immediately before apply (P-1 STOP passed).
**Migration:** `s7_demand_grid_capability_guard_v1` — applied via `apply_migration`, project `mbkmaxqhsohbtwsqolns`, single transaction; ledger row confirmed.
**Authorisation:** PK P-3B sitting 2026-08-01 ("P-3B authorised — apply against the frozen hash") — separate from P-1/P-3A per §4.3 gate separation.

## What is now live

`m.build_weekly_demand_grid` carries the amended S7 capability predicate — `platform_support ∩ (select_template not fail-closed ∪ {text})`, fail-closed on NULL/error — as one `capability_gated` CTE between `enabled_set` and `policy_backed`. New body md5 `9e51956f0f0fc27184962037c29f9615` (baseline was `2dff1dab88fb1f9e3f341ea6f9f843c7`). Signature, return shape, STABLE volatility, ownership, ACL: unchanged. No grant changes.

## In-transaction gates (all executable, all PASSED at apply)

C-1 baseline md5 gate · C-4 txn-identity guard (`s7_txn_guard`) · C-2 marker assert · C-3 strict 14-row matrix equality (both clients, both directions). Any failure would have rolled back the entire migration.

## Post-apply live verification (read-only)

1. **Grid readback:** exactly the frozen 14-row AFTER matrix for both clients —
   PP: FB `image_quote 40/2 · carousel 33.33/2 · text 26.67/1`, IG `carousel 60/3 · image_quote 40/2`, LI `text 57.14/3 · image_quote 42.86/2` (all three platforms IDENTICAL to pre-apply), YT `video_short_stat 100/5` (the only PP behaviour change).
   NDIS: FB `image_quote 60/17 · text 40/11`, IG `image_quote 100/28`, LI unchanged, YT `video_short_stat 100/28`.
2. **`get_week_format_allocation` (PP, week 2026-07-27):** all 20 slots valid (`invalid_count` 0 on all four platforms), `allocation_source=format_mix_allocator`, zero `format_override` rows disturbed; YouTube slots now allocate `video_short_stat` ×5 — the RPC reports the gated grid, as predicted in packet §5.
3. **Marker present** in the deployed body; migration ledger row present.

## Review chain of record (all pinned to `c6d5b622…`)

apply-harness-auditor (SHADOW) CONCERNS → AHA-05-1/AHA-07-1 both remediated pre-freeze (executable C-4 guard; §9 live `BEGIN…ROLLBACK` rehearsal, zero persistence) · db-rls-auditor **clean/pass** (high confidence, 0 must-fix; every live-truth claim verified incl. the `get_week_format_allocation` real-caller correction) · external review **agree/medium/high, zero pushback**, explicit `structural_DDL_DML_escalation` → resolved by this P-3B sitting (review `12852f0c-f013-47f5-8120-23770c3b806e`) · branch-warden **safe** (pin verified twice across concurrent v6.99/v6.100 pushes, no collision).

## Rollback posture

`s7_demand_grid_capability_guard_v1_rollback` (packet §3): byte-exact restore of the captured baseline, self-verifying (C-R1 md5 gate), rehearsal-proven end-to-end on live prod pre-freeze. Not run; standing.

## Accepted observations / carries

- **S7-RLS-OBS-1 (accepted posture):** ad-hoc grid calls by `inspector_ro`/`retool_ui`/`obs_readonly` now fail 42501 inside `select_template` — loud, fail-closed, no production path affected; deliberately NOT grant-widened.
- `search_path` pin on the grid: still absent (pre-existing advisor WARN) — named carry, deliberately excluded from this byte-minimal change.
- `ice_ro.format_mix_capability_gaps` diagnostic view — named future T2 lane.
- Three-way predicate consolidation (`build_weekly_demand_grid` / `resolve_final_format` / `get_week_format_allocation`) — carry.
- Self-healing property: excluded cells re-enter allocation automatically when a template graduates (live `select_template` becomes non-fail-closed); no code change needed.

## Programme effects

S7 guard LIVE → Slice A unblock condition met (per §4.1 hard sequence) · P-8 interim-containment question moot (the degrading PP YT kinetic allocation is now structurally excluded; PP FB/LI text is D1-governed and allocating) · B2 reachability tranches may now proceed under their own gates.

**Not done here (PK-instructed steps only):** git commit/push of the packet + this result doc; register pointer cut (v6.10x); Slice A resumption.
