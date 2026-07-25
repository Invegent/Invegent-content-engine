# S8 Six-Slot Invalid-Future-Slot Repair — Applied & Proven (v1)

> **Lane:** already-materialised invalid slot repair (S8) · **Apply hand:** S1 (independent; S8 authored) · **Type:** T3 APPLY-lane result
> **Outcome:** **APPLIED — committed — post-repair proof PASSED.** All six invalid future PP slots now carry publishable formats; the invalid-future population is **0**. The `4d81ae7c…` LinkedIn self-fill (deadline 2026-07-26 01:50 UTC) is averted.
> **Applied artifact:** `docs/briefs/materialised-invalid-slot-repair-packet-v2.md`, sha256 **`14eca2c4d87c017f495d0f18726909a1164058ed536db9c76083c27732e3335e`**, 44395 B — §5 extracted byte-exact from ref `92c02a4` (`91cf4e0e…`) and submitted as ONE `execute_sql` call.
> **Base:** CE `HEAD == origin/main == 92c02a4`, parity 0/0. **Target:** project `mbkmaxqhsohbtwsqolns` (`content_engine`). **Applied:** 2026-07-25 ~01:52 UTC.

---

## 1 · Authorization chain (all gates clean before mutation)

| Gate | Result |
|---|---|
| ① stale-ref (twice: preflight + immediately pre-apply) | PASS — `92c02a4` == origin == ls-remote, parity 0/0 |
| ② hash from ref | PASS — packet `14eca2c4…`; §5 extract `91cf4e0e…` identical on re-extract |
| ③ project | PASS — `mbkmaxqhsohbtwsqolns` = `content_engine` |
| ④ `db-rls-auditor` | clean (orchestrator-run); S1 independently reproduced every DB-mechanics check live |
| review | External review `e553bcd2` pinned to `14eca2c4…`; `partial` + PK-escalation, **no concrete defect** — residual `policy_decision`, surfaced to PK |
| ⑤ Slice-2-proven | PASS (v6.25); also machine-enforced in-txn by `P-PRECOND` |
| ⑦ PK apply gate | **PK authorized apply** |

## 2 · The apply — committed

Executed §5 verbatim from ref `92c02a4` (channel C-1, one call). Returned its single result set and committed:

```
status        : REPAIR OK -- all assertions passed
rows_repaired : 6
txn_xid       : 3885995
```

All nine assertion blocks executed and passed inside the transaction (the `REPAIR OK` row is only reachable after all of them): `G-ATOMIC` · `P-PRECOND` · `A-IDENT` (presence+absence) · `A-DEP` (5 FKs + commitment) · `A-TARGET` · `A-PROJ` (per-slot live re-derivation) · `U1` (CAS-guarded, exactly 6) · `A-POST` · `A-BLAST`.

**The six repaired rows (from the verbatim result set):**

| slot | platform | sched (UTC) | was | now |
|---|---|---|---|---|
| `4d81ae7c…` | linkedin | 07-27 02:00 | carousel | **[text]** |
| `cdb9cc97…` | linkedin | 07-28 02:00 | carousel | **[image_quote]** |
| `a8c70f51…` | instagram | 07-30 00:00 | video_short_kinetic | **[carousel]** |
| `fbcbd5cd…` | facebook | 07-30 21:30 | video_short_kinetic | **[text]** |
| `94d61b80…` | instagram | 07-31 00:00 | video_short_stat_voice | **[image_quote]** |
| `16127789…` | linkedin | 07-31 02:00 | video_short_kinetic | **[image_quote]** |

## 3 · Post-repair proof (§9.3) — PASS

**Part 1 — all 6 targets valid.** Each slot re-read live: `format_preference` = the repaired value, `status='future'`, `is_valid=true` on all six (`text / image_quote / carousel / text / image_quote / image_quote`).

**Part 2 — population cleared.** The §1 invalid-future-slot population query re-run returns **0 rows**. No future slot anywhere carries an unpublishable format. This is also machine-asserted by `A-POST`'s absence branch inside the transaction.

## 4 · Blast radius & safety

`A-BLAST` confirmed in-transaction: `m.slot` row count unchanged, **exactly 6** rows changed `format_preference`, all 6 in the pinned set, and no immutable column altered / no target became filled mid-txn. `A-DEP` confirmed zero downstream work on all six before mutating (0 rows across `post_draft`/`ai_job`/`slot_fill_attempt`/`slot_alerts`/`ice_publication_evidence`; 0 committed) — the repair orphaned nothing. Only `format_preference` (and `updated_at`) changed on exactly the 6 rows.

## 5 · Rollback availability

The §7.1 by-identity, CAS-guarded rollback remains valid and does not depend on this result set (prior values are literals in the packet). It would restore `carousel / carousel / video_short_kinetic / video_short_kinetic / video_short_stat_voice / video_short_kinetic`. Residual: `updated_at` would not return to its pre-repair value; `format_preference` restores exactly. Rolling back returns the slots to a known-broken (unpublishable) state — a recovery path, not a resting place.

## 6 · Scope, residual, and what's next

**Did:** repaired exactly 6 `m.slot` rows, column `format_preference` only, to the governed publishable format the live allocator assigns each slot's ordinal. **Did not:** touch past slots (~50, already terminal), change `m.materialise_slots` or `m.fill_pending_slots`, add a `platform_support` gate to the fill path, or touch any other client/row/lane.

**Standing residual (unchanged, PK-owned):** the nightly cron still materialises new invalid slots (this is why the population grew 3→6 pre-apply). This repair is a **stopgap that will need re-running until S7's durable grid-time `platform_support` intersection lands** — which is the argument for prioritising S7 next, not for widening this data lane. Per PK's order: (1) Slice 2 proven [DONE, v6.25] → (2) this repair [DONE] → (3) prove downstream consistency → (4) S7 durable fix.

## 7 · Non-claims

Nothing beyond the six-row `m.slot` DML was mutated; no schema/function change, no migration, no commit, no push, no deploy. The external review's residual `policy_decision` (generic data-integrity caution) was surfaced to PK and decided at the gate; its three named concerns (completeness · atomicity · unfilled-slot safety) were discharged by live verification and the in-transaction assertions. All counts, ids, timestamps and formats are live as of 2026-07-25; identity/dependency/completeness/projection were re-verified by the script itself at apply time. This lane was not combined with any other database window.
