CLAIMED v6.98 · programme-docs-hygiene · main · T1 docs-only · 2026-08-01T02:20Z

# Result — Creatomate Global Ultimate: programme docs/registry hygiene (T1)

**Governing brief:** `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §6 Week-1 item 5
(companion: `docs/briefs/creatomate-global-ultimate-strategic-inventory-v1.md` §Task 6)
**Executed by:** Claude Code (orchestrator-direct; docs-only register lane per CLAUDE.md)
**Completed:** 2026-08-01 Sydney
**Lane classification (CCF-02):** T1 · SIDE_PROVING · docs/registers only

---

## 1. Result status

`Complete` — all four sub-tasks done. **Zero code, DB, migration, deploy, EF, dashboard, branch-merge
or branch-delete change.** Eight documents landed on `main`; one stale result doc annotated; the
v6.94 double-assignment reconciled and recorded; the P-2 ratification pointer cut.

## 2. Sub-task 1 — land the off-main / untracked programme documents on `main`

Eight files, all additive (none previously on `main`).

**Recovered from branch `origin/claude/gate-1-capability-expansion-paw1ew` (off-main) — byte-exact,
verified by git blob-SHA identity (`git rev-parse <ref>:<path>` == `git hash-object <file>`), not by
eye or by diff:**

| File | blob SHA | sha256 (12) |
|---|---|---|
| `docs/briefs/capability-expansion-format-reachability-gate1-brief-v1.md` (S6 governing brief) | `f8707da7…` | `62868cc62be8` |
| `docs/briefs/capability-expansion-b1-implementation-packet-v1.md` (B1 packet) | `fb4e9833…` | `e1052fc1921d` |
| `docs/briefs/capability-expansion-b1-review-record-v1.md` (B1 review record) | `c851deb6…` | `9425f94f7f33` |

> **Corroboration:** the B1 packet's sha256 `e1052fc1…` is **identical to the frozen hash recorded at
> register v6.94** (`e1052fc1…10fc`) — the landed file is provably the same artifact that was frozen,
> externally reviewed, and applied. No re-freeze or re-review is implied or required by this landing.

**Landed from the working tree (previously untracked):**

| File | sha256 (12) |
|---|---|
| `docs/briefs/s7-durable-capability-enforcement-demand-grid-gate1-v1.md` (S7 brief) | `7975fc40c250` |
| `docs/briefs/s6-slice-a-ndis-format-mix-enrolment-gate1-brief-v1.md` (Slice-A brief) | `3515b6ff2631` |
| `docs/briefs/results/s6-slice-a-ndis-dry-run-result-v1.md` (Slice-A dry-run result) | `4505f789edcb` |
| `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` (programme brief) | `9ae22924f7a5` |
| `docs/briefs/creatomate-global-ultimate-strategic-inventory-v1.md` (companion inventory) | `bbc4c8f3d389` |

**Scope notes (named, not silently decided):**
- The named four were *S6 governing · S7 · Slice-A · programme brief*. Three further files were
  landed with them and are called out here rather than folded in silently: the **B1 packet** and
  **B1 review record** (the programme brief §2.4.6 names the B1 packet as part of the same hygiene
  defect: *"S6 governing brief + B1 packet off-main"*), and the **strategic inventory** (the
  programme brief cites it as its companion throughout; landing the brief without it would leave
  dangling citations on `main`).
- **Deliberately NOT landed** — two further files unique to that branch belong to unrelated lanes and
  are out of this scope: `docs/briefs/branch-packet-retirement-batch-v1.md` and
  `docs/briefs/cc-sched-editor-p1-ledger-backfill-packet-v1.md`. Neither is dropped — both remain on
  the branch, which is **not merged, not deleted, not pushed**.
- Landing a brief on `main` is a **records** action. It confers no approval, no gate clearance, and
  no authorisation: the S7 packet still requires its D1 exemption amendment before freeze, and
  Slice A remains halted at its dry-run STOP.

## 3. Sub-task 2 — reconcile the v6.94 double-assignment

**Finding: the collision was already resolved at source; `main` simply had no record of it.**

Reconstructed from git history (not from the registers):
1. Branch `claude/s5-cross-brand-evidence-schedule-x7rbn8` claimed v6.88–v6.90 (claim stub
   `2026-07-31T03:35Z`) from a v6.87 base.
2. `main` landed its own v6.88 (`c1a8aa6`, claim stub `2026-07-31T04:09:47Z`) and chained v6.89–v6.93.
3. S5 renumbered v6.88–v6.90 → **v6.94**–v6.96 (`19e0422`, 15:29).
4. `main` then landed **v6.94** for S6 Slice B1 (`e804112`, 15:53) — the second collision.
5. S5 re-renumbered v6.94–v6.96 → **v6.95–v6.97** (`7b80ee4`, 16:38), applying the same PK-ratified
   rule (main's landed history wins; S5 shifts pre-merge).

**Current state — verified, not assumed:** `v6.94` now resolves to exactly ONE lane, S6 Slice B1, on
`main`. A scan of every local and remote ref found `v6.95`/`v6.96`/`v6.97` claimed **only** by the S5
branch's own renumber, and `v6.98` unclaimed anywhere.

**Reconciliation action:** no renumber was performed by this lane — nothing needed one. The durable
fix is the missing *record*: `main` now carries the resolution (register entry v6.98) so the next
lane does not re-collide with S5's off-main block.

**Numbering decision (and why it is not v6.95):** CCF-04 `claim-stub` correctly reports the *sequential*
next cut as v6.95 and flagged the ahead-of-head claim (finding CS-01). Cutting v6.95 would force S5 to
renumber a **third** time. Per the CCF-02 claim protocol — *earlier timestamp keeps the number, later
claimant renumbers* — S5's claim to v6.95–v6.97 (2026-07-31) precedes this lane's (2026-08-01), so
**S5 keeps v6.95–v6.97 and this lane takes v6.98**. `v6.95–v6.97` are recorded on `main` as
RESERVED-off-main so the block is visible to any future claimant.

## 4. Sub-task 3 — correct the stale cc-0046 doc

`docs/briefs/results/cc-0046-orthogonal-gap-classification.md` declared
`Partial — awaiting PK T3 apply gate` and *"the three artifacts are UNAPPLIED"*, while register v6.06
records all three as applied and reconciled to `origin/main` at `a741335`.

**Verified against live truth rather than the register** (the register could equally have been the
stale side): a read-only `list_migrations` call against project `mbkmaxqhsohbtwsqolns` on 2026-08-01
confirms all three identities present in the **live** ledger —
`20260721100000_cc0046_asset_gap_orthogonal_classification_ddl_v1` ·
`20260721110000_cc0046_analyze_and_writer_orthogonal_v1` ·
`20260721120000_cc0046_backfill_open_rows_v1`. The result doc is therefore the stale side.

**Correction method — annotation, not rewrite** (house rule: no historical rewrite of result docs):
a superseding status banner was added at the head, and the three individually misleading claims
(§1 status, §2 commits, §5 constraints) each carry an inline `[SUPERSEDED 2026-08-01]` note. **No
original sentence was deleted or edited** — the body remains an accurate record of the build lane as
at 2026-07-21; the annotations distinguish that from current production truth.

## 5. Sub-task 4 — cut the P-2 ratification pointer

Programme brief §1.4 records PK's 2026-08-01 ratification of the **13-rung graduation contract**
(`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §4) as the **formal
proof authority for cell state-1 classification**, closing S6 OQ1, and states *"Register pointer to be
cut at the next register update."* That pointer is cut here, at v6.98.

**This records a ratification that PK already made; it does not make one.** No cell was reclassified,
no template graduated, and no proof re-judged by this lane.

## 6. Files changed

- 8 files added (§2).
- `docs/briefs/results/cc-0046-orthogonal-gap-classification.md` — annotated (§4).
- `docs/00_sync_state.md`, `docs/00_action_list.md` — v6.98 pointer (Convention-1 pointer-only).
- `docs/briefs/results/programme-docs-hygiene-v1-result.md` — this doc.

## 7. Constraints respected

- No code, DB, migration, DML/DDL, deploy, EF, dashboard, cron, render, or publish change.
- No branch merged, deleted, rebased, or pushed; `claude/gate-1-capability-expansion-paw1ew` and the
  S5 branch both untouched.
- No gate cleared, no brief approved, no artifact re-frozen, nothing marked proven.
- The only DB access was a single read-only `list_migrations` call (§4).
- Push remains a separate PK gate — not performed by this lane.

## 8. Open / carried

- **S5 branch (`claude/s5-cross-brand-evidence-schedule-x7rbn8`) still holds v6.95–v6.97 off-main.**
  Whoever merges it should expect those three entries to arrive *below* v6.98 in sequence — this is
  the recorded, PK-ratified outcome, not a new collision.
- The two out-of-scope branch files (§2) remain unlanded and are named for a future lane.
- Root cause unchanged and unaddressed by this lane: register numbers are claimed by reading the
  highest number in a working tree — a read-then-write race by construction (the standing
  `register-reconciler` finding; the durable fix is an allocator, not more diligence). This lane is
  the third collision-adjacent reconciliation in eight days.
