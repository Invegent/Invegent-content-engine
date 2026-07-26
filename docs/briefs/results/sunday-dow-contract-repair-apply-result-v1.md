# Sunday `day_of_week` Contract Repair — Apply Result: APPLIED & PROVEN (v1)

> **Lane:** S2 · Sunday `day_of_week` contract repair (`isodow`→`dow` across all live consumers + coupled labeler) · **Apply hand:** S1 (independent; S2 authored) · **Type:** T3 apply result · **Verdict: PASS**
> **Outcome:** **APPLIED to production and PROVEN.** All three live consumers now use `dow` (Sunday=0); the Slice-A allocator labeler moved to `0..6`; Mon–Fri/Saturday allocations unchanged; disabled Sunday rows inert; a Sunday row is now seen consistently by rule + materialiser + allocation; rollback proven exact.
> **Applied artifact:** `docs/briefs/schedule-day-of-week-contract-repair-packet-v5.md`, sha256 **`f9aa9ed8…`**, from immutable ref **`097091a`** (parent = origin `6ca551bc`, rebased; byte-equivalent to reviewed v5). Applied as ONE atomic `execute_sql` `BEGIN…COMMIT` (channel: single-call, per §11). No `apply_migration` (no ledger version); identity = packet hash @ ref, `txn_xid 3910102`.
> **Target:** project `mbkmaxqhsohbtwsqolns`. **Applied:** 2026-07-25 (UTC).

---

## 1 · Pre-apply verification (all byte-equivalence STOP conditions passed)

| Check | Result |
|---|---|
| packet from `097091a` | ✅ `f9aa9ed8…` / 43439 B |
| `097091a` ancestor scope | ✅ parent = origin `6ca551bc`; origin move was claim-stub-only (verified disjoint) |
| §5 pins (all 3 fns) | ✅ md5 · `EXTRACT(isodow FROM d)` counts 1/2/1 · any-isodow 1/2/2 · `NOT BETWEEN 1 AND 7` 0/0/1 — all match live |
| E1–E5 present, E5 not dropped | ✅ the coupled labeler predicate present exactly once in `get_week_format_allocation` |
| file/function set | ✅ census = exactly the 3 functions (no 4th consumer) |
| grants/owners/security | ✅ owner postgres · secdef true · volatility s/v/s · proacl per §5 — unchanged |
| disabled Sunday rows inert | ✅ 24 Sunday rows, **0 enabled**; enabled set Mon–Fri only |
| rollback restores E1–E5 | ✅ proven exact (§4) |

## 2 · The apply (committed, one atomic transaction)

Assembled the packet's §6/§7 SQL verbatim (A0/A0′ baselines · PRE-0…7 · POST-1…8) plus the three mechanical **capture-verify-substitute-re-emit** transform blocks (bodies derived from verified-live source via `replace()`, never a transcribed blob — the S8 discipline). Executed as one `execute_sql` call. Result: **`SUNDAY REPAIR OK -- all PRE/POST gates passed`**, `txn_xid 3910102`, **71 zero-delta rows checked** (70 enabled schedules + 1 enrolled client).

- **PRE-0…7** passed: rollback baseline pinned · 3 md5s == §5 · isodow counts 1/2/1 · labeler present · owner/secdef/vol/proacl == §5 · CHECK `0..6` · 0 enabled Sunday · census = the 3 functions.
- **E1** `m.compute_rule_slot_times` (1 site) · **E2/E3** `m.materialise_slots` (2 sites) · **E4/E5** `public.get_week_format_allocation` (1 site + `NOT BETWEEN 1 AND 7`→`0 AND 6`) — each md5-gated, count-gated, `CREATE OR REPLACE`d.
- **POST-1…8** passed: 0 `EXTRACT(isodow FROM d)` remain · `dow` counts 1/2/1 · surviving isodow **string literal** intact (`day_of_week_out_of_isodow_range`) · labeler `0..6` · posture unchanged · **zero-delta over 71 rows** · **txid atomicity** (POST-7 == A0′ pin — the transaction was never split) · Saturday non-regression.

## 3 · Post-apply verification (dispatch's six)

| # | Check | Result |
|---|---|---|
| 1 | all live consumers use `dow` | ✅ `EXTRACT(dow FROM d)` = 1/2/1; **0** `EXTRACT(isodow FROM d)` anywhere |
| 2 | no relevant `isodow` comparison remains | ✅ only the string literal survives; census now = `get_week_format_allocation` only (both `m.*` fully off isodow) |
| 3 | existing disabled Sunday rows remain disabled | ✅ 24 Sunday rows, 0 enabled — unchanged |
| 4 | Mon–Fri allocations unchanged; Saturday unchanged | ✅ POST-6 zero-delta (71 rows) + POST-8 Saturday non-regression |
| 5 | Sunday `0` seen consistently by BOTH materialisation and allocation | ✅ **P3** (below) |
| 6 | rollback executable | ✅ **§4** — all 3 restore to §5 md5 originals |

**P3 — transaction-local Sunday consistency (rolled back, zero committed data):** enabled one disabled Sunday row in a `BEGIN…ROLLBACK` txn; (a) `m.compute_rule_slot_times` produced Sunday-**local** slots (2026-07-26 / 2026-08-02 at 09:06 Sydney — all Sunday in the client tz; before the repair a Sunday row matched nothing and returned **zero**); (b) `m.materialise_slots` wrote a Sunday `m.slot`; (c) `get_week_format_allocation` did **not** flag it `sunday_written_as_zero`. All three agree — no contradiction (E5 load-bearing). `ROLLBACK` → no committed Sunday demand.

> **Note on a corrected in-flight assertion:** P3's first run tripped my own check because I read `dow` in UTC — the schedule's 09:06 Sydney Sunday is stored as 23:06 UTC Saturday. The repair was correct; the assertion was fixed to read `dow` in the client timezone, and P3 then passed. This is a verification-side correction, not a repair defect.

## 4 · Rollback (proven exact, executable)

The repair writes no data (pure function-body swap), so nothing needs undoing beyond restoring bodies. **Rollback proven** in a `BEGIN…ROLLBACK` txn: inverse-substituted the three live (repaired) bodies (`EXTRACT(dow FROM d)`→`EXTRACT(isodow FROM d)`; `NOT BETWEEN 0 AND 6`→`NOT BETWEEN 1 AND 7`) and confirmed each restores to its **§5 original md5** (`d7e5b94d` / `e5b340b7` / `b12639d8`), then discarded so the repair stays live. The rollback is deterministic and md5-exact. (The packet's capture-based §8 rollback is equivalent; the inverse-substitution form is md5-verified against the same pins.)

## 5 · Final committed state (after all rolled-back proofs)

`EXTRACT(isodow FROM d)` total = **0**; `m.materialise_slots` md5 = `48e2db58…` (post-repair); Sunday rows 24 / **0 enabled**; **0** committed `m.slot` rows for any Sunday schedule (P3's enable + materialise were rolled back — no production Sunday demand created, honouring PK's "do not enable a Sunday production schedule to prove it").

## 6 · Scope / carried debt (unchanged)

Repaired exactly the 3 live consumers (E1–E4) + the one coupled labeler predicate (E5). **Not touched:** the `reason_code` CASE / string cleanup (dead-but-harmless after E5), `save_publish_schedule`, Saturday logic, any schedule-row activation/migration, any dashboard file, cc-0079. **Carried separately (NOT bundled):** the two `m.*` functions are `SECURITY DEFINER` with `proacl = NULL` (default = anon+authenticated executable) — a **pre-existing** anon-executable-SECDEF exposure; POST-5 asserted the repair is ACL-**neutral** (neither widened nor narrowed). Recorded for its own `db-rls-auditor`/`security-auditor` triage lane.

## 7 · Non-claims

The only production change is the three `CREATE OR REPLACE FUNCTION` body swaps (isodow→dow ×4 + one labeler predicate), via one atomic `execute_sql` transaction. No DML, no schema/constraint/grant change, no data written, no migration, no commit/push/deploy by this lane. Every proof (P3, rollback) ran in explicitly rolled-back transactions — zero committed production data mutated. No R3a deployment while the Sunday window was open. All facts live as of 2026-07-25.
