# Brief cc-XXXX — `supabase/migrations/` directory hygiene (GATE 1)

**Created:** 2026-08-07 Sydney
**Author:** Lane 5 (S3) — **opened as a SEPARATE bounded task per PK, 2026-08-07**
**Executor:** TBD — **not yet issued**
**Status:** **draft — awaiting PK Gate-1 approval**
**Task ID:** `cc-XXXX` — **PK to allocate** (single cut owner; out-of-channel allocation is the
documented collision cause).
**Result file:** `docs/briefs/results/cc-XXXX-migration-directory-hygiene.md` (on completion)
**Tier:** **T1** — file moves and documentation only. **No production DB change of any kind.**
**Lane classification (CCF-02):** SAFETY_GATE.

> **Boundary, stated first because it is the point of a separate task:** this lane **must not modify
> or delay the Lane 5 resolver contract** (PK, explicit). It does not touch
> `docs/briefs/artifacts/lane5-select-music-seed-rotation-{FORWARD,ROLLBACK}.sql`, the
> `select_music` design, or any Lane 5 gate. If this lane finds something that appears to bear on
> Lane 5, it **reports** it — it does not act on it.

---

## Task

`supabase/migrations/` is a **discovery path**: tooling (`supabase db push` and equivalents) scans it
and can execute what it finds. It currently holds **8 untracked/uncommitted files**. Classify every
one, get the executable-risk and rollback artifacts **out** of that path without losing provenance,
and reconcile the rest against the live migration ledger.

This generalises a risk PK already closed once. Under **R1 (2026-08-07)** the cc-0038 draft — an
unapplied, untracked 175-line `DROP`+`CREATE` of a **live production function** — was retired from
this directory. It was one instance of a class. The class is not closed.

**Highest priority, per PK: rollback scripts inside `supabase/migrations/`.** A rollback swept into
an apply run does not fail loudly — it **succeeds at reverting something live**.

---

## Source context

- `docs/briefs/artifacts/NOT_APPLIED_SUPERSEDED_cc0038_select_music_per_platform_scope_20260711003222.sql`
  — the **R1 precedent**: retained-with-provenance, banner-marked, moved out of the discovery path.
  Body verified byte-identical to the original (`65c77b6a…2385`). **Follow this pattern.**
- `docs/briefs/select-music-seed-rotation-gate1-brief-v1.md` §R1 — the reasoning behind the retirement.
- `supabase_migrations.schema_migrations` — the live applied ledger; the only authority on what is
  actually applied.
- Standing gotcha: **migration name = permanent identity.** A revision gets a new number and a
  distinct name, never the same name with different SQL.
- Memory: migration ledger ≠ git — verify function state via `pg_get_functiondef`, not repo files.

## The inventory to resolve (established read-only, 2026-08-07)

Ledger membership verified live. **Classification below is the starting hypothesis, not the finding
— the lane re-verifies each.**

| # | File | Ledger? | Provisional class |
|---|---|---|---|
| 1 | `ROLLBACK_20260725120000_durable_platform_support_guard.sql` | n/a | **ROLLBACK ARTIFACT — HIGHEST PRIORITY** |
| 2 | `20260725120000_durable_platform_support_guard_grid_and_materialiser.sql` | **NOT applied** | **UNAPPLIED EXECUTABLE RISK** |
| 3 | `NOT_APPLIED_cc0080_reconcile_publish_status_v1.sql` | **NOT applied** | **UNAPPLIED EXECUTABLE RISK** (self-declared) |
| 4 | `20260710024629_add_recorded_at_and_backfill_drifting_piano_approval.sql` | applied | provenance gap |
| 5 | `20260710024829_create_select_music_rpc.sql` | applied | provenance gap |
| 6 | `20260710115043_select_music_require_content_id_safe.sql` | applied | provenance gap |
| 7 | `20260710121423_create_record_music_usage_rpc.sql` | applied | provenance gap |
| 8 | `20260725004336_slice_a_get_week_format_allocation_readonly_wrapper.sql` | applied | provenance gap |

**Note on #1/#2:** the guard migration is **not applied**, yet its rollback sits beside it. Both need
disposition, and the pair should be reasoned about together — a rollback for something never applied
is doubly hazardous.

**Note on #6:** this is the **currently live** `select_music` definition. It is applied, and its
repo copy is uncommitted. **Do not move, edit, or "tidy" it in a way that loses the exact text** —
Lane 5's rollback is transcribed from it and pins
`md5(pg_get_functiondef(...)) = 61a18d15e9f49830bd257265e8c5ffbe`. Treat it as read-sensitive.

---

## Scope

**In scope:**

1. **Classify all 8** as exactly one of: `unapplied executable risk` · `rollback artifact` ·
   `applied-but-uncommitted provenance gap`. Re-verify ledger membership live; do not inherit the
   table above.
2. **Move** every `unapplied executable risk` and `rollback artifact` **out of
   `supabase/migrations/`**, into a non-scanned retention location (the R1 precedent:
   `docs/briefs/artifacts/` with a `NOT_APPLIED` / `ROLLBACK — DO NOT RUN` banner recording original
   path, ledger status, what supersedes it if anything, and the retirement date).
   **Provenance is never deleted; bodies stay byte-identical** (verify with a hash of the
   post-banner body against the original, as R1 did).
3. **Reconcile** each `applied-but-uncommitted` file against the live ledger **and** repo history:
   does an equivalent tracked copy exist elsewhere? Does the file's SQL match what is actually live?
   Name any divergence; **do not "fix" it here.**
4. **Return a before/after inventory** plus any genuine collisions or provenance gaps.

**Out of scope:**

- **Any production DB change.** No DDL, no DML, no migration apply, no rollback execution, no
  `GRANT`/`REVOKE`, no deploy. This lane is file moves and documentation.
- Anything touching **Lane 5's resolver contract**, its artifacts, or its gates.
- Rewriting, correcting, or re-cutting the SQL inside any of the 8 files.
- Retro-committing applied migrations to reconstruct history, unless PK rules it separately —
  **that is a finding to report, not an action to take** (it is how migration identity gets
  accidentally rewritten).
- Deleting anything.
- The other worktrees' copies of these files (25 active worktrees) — report if relevant, do not touch.

## Allowed actions

- Read-only ledger and catalog reads (prefer `db-read.py`; `execute_sql` for `m.*`/ledger reads).
- Read repo files and git history.
- **Move** files out of `supabase/migrations/` into a retention location, prepending a banner and
  leaving the body byte-identical.
- Verify byte-integrity by hashing the post-banner body against the pre-move original.
- `branch-warden` before any commit; commit only on PK instruction.

## Forbidden actions

- **No production DB change of any kind.** If a file's disposition seems to require one, **stop and
  report.**
- **Never execute** any of the 8 files, in any direction, for any reason — including "to see what it
  does". A rollback script is the specific thing that succeeds destructively.
- Do NOT delete any file or any provenance.
- Do NOT edit the SQL body of any file — banner-prepend only.
- Do NOT move anything **into** `supabase/migrations/`.
- Do NOT touch `20260710115043_select_music_require_content_id_safe.sql`'s content (read-sensitive —
  Lane 5's rollback is transcribed from it).
- Do NOT modify, gate, delay, or comment on the Lane 5 resolver contract (PK, explicit).
- Do NOT cut a register version; hand pointer text to PK as text. Do NOT push without explicit PK
  instruction, separate from commit.
- **Standing hold:** the Phase-1 production-write watch (~2026-08-11 20:20 Sydney) stands. This lane
  should not need it — if it ever does, that means the lane has left its scope.

## Success criteria

1. All 8 files classified, each with **live ledger evidence** (not inference).
2. **Zero** unapplied-executable or rollback artifacts remain in `supabase/migrations/`. Verified by
   re-listing the directory's untracked set before and after.
3. Every moved file retained with provenance intact and body **byte-identical** (hash-verified).
4. Applied-but-uncommitted files reconciled: for each, a stated finding — matches live / diverges
   from live / duplicate of a tracked copy — with the evidence.
5. **Before/after inventory returned**, plus a list of genuine collisions or provenance gaps.
6. **Zero production DB change** — demonstrable: no ledger row added, no function definition changed.
   Re-assert `md5(pg_get_functiondef(select_music)) = 61a18d15e9f49830bd257265e8c5ffbe` at the end as
   a cheap proof the lane did not touch the live resolver.
7. Lane 5's artifacts and contract **untouched** — verified by hash.

## Stop condition

Report per the result template, then stop. **Stop and surface to PK immediately** if: a file's
disposition appears to require a DB change · a moved file's body hash does not match its original ·
a file in the directory turns out to be applied under a **different name** than its filename implies
(a genuine migration-identity collision) · or anything in the set touches `select_music`.

---

## Notes

- **Why this is a separate task and not a Lane 5 cleanup:** PK ruled Lane 5 stays focused on the
  resolver. The two lanes share only the R1 precedent for how to retire a file safely.
- **Expected size:** small — 3 moves, 5 reconciliations, one inventory. It is priority-ordered rather
  than large: item #1 is the one that can actually cause damage.
- **The risk is not hypothetical.** R1 removed an unapplied `DROP`+`CREATE` of a live production
  function from this directory. Items #1–#3 are the same class, and #1 is worse: a rollback does not
  fail when swept up, it **succeeds**.
