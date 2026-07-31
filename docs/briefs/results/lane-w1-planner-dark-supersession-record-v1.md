# Supersession record — `lane-w1-planner-dark`

**Created:** 2026-07-31 Sydney
**Author:** chat (orchestrator, read-only disposition review)
**Status:** Record only. **Nothing merged, deleted, or applied.** PK still needs to run the actual
branch/worktree deletion (commands below) — this record only establishes it is safe to do so.

---

## 1. Ruling

Per PK instruction (2026-07-31): **`format_override` is the canonical long-term path** for durable
per-slot schedule format assignment. `lane-w1-planner-dark`'s dark-table design is formally superseded,
not because it was wrong, but because a simpler mechanism shipped and became the live production path
for the same operator need.

## 2. What was superseded

| | `lane-w1-planner-dark` (superseded) | `format_override` (canonical) |
|---|---|---|
| Mechanism | New dark table `c.client_schedule_format_assignment`, keyed by natural tuple `(client_id, platform, day_of_week, publish_time)` + read-only RPC `get_schedule_planner_state` | New column `c.client_publish_schedule.format_override` + write RPC `public.save_week_format_override` |
| Migration | `supabase/migrations/20260725130000_w1_planner_dark_schedule_format_assignment_v1.sql` (staged, never applied) | `supabase/migrations/20260727100000_p1a_schedule_format_override_surface.sql` + `20260727100100_p1c_materialise_slots_honour_format_override.sql` (applied, live) |
| Governing brief | `docs/briefs/writable-planner-format-per-slot-contract-gate1-v1.md` (W1+W2 approved 2026-07-25; W3 write-path deferred to cc-0079 R3c) | `cc-sched-editor-p1` / "Authoritative Weekly Schedule Editor Phase 1" |
| Status | Designed, staged migration authored, never applied. Branch orphaned in a 2026-07-28 machine-restart recovery snapshot. | **Applied to production 2026-07-27, end-to-end proven live (all 7 days incl. Sunday), materialiser honours it.** |

## 3. Verification that the dark migration was never applied (live, 2026-07-31)

Three independent checks, all negative (consistent with "never applied"):

1. **Table absent:** `SELECT table_name FROM information_schema.tables WHERE table_schema='c' AND table_name='client_schedule_format_assignment'` → 0 rows.
2. **RPC absent:** `SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_name='get_schedule_planner_state'` → 0 rows.
3. **Ledger absent:** `SELECT version, name FROM supabase_migrations.schema_migrations WHERE version='20260725130000' OR name ILIKE '%w1_planner_dark%'` → 0 rows.

Read via `db-read.py` (checks 1–2) and `mcp__supabase__execute_sql` (check 3, project `mbkmaxqhsohbtwsqolns`). No writes performed.

## 4. Branch-safety verification (branch-warden, read-only, 2026-07-31)

- `lane-w1-planner-dark` (tip `28a506b`) is **not** an ancestor of `main`, and `main` does not depend on it — exactly one unmerged commit, a dead-end.
- **No other branch is built on top of it** (checked local + remote `--contains 28a506b`).
- **Content is independently preserved elsewhere:** the staged migration was already rebase-copied byte-identical onto `origin/lane/w1-planner-dark-v2` (commit `391f47f`, remote-only, itself unmerged/unapplied) — deleting `lane-w1-planner-dark` loses no unique content.
- Working tree clean throughout; no mutations performed by the check.
- `origin/main` and local `main` are in sync (`0 0`); `main` has moved 142 commits past this branch's fork point (`341a949`), none of which depend on it.

## 5. Disposition

**`lane-w1-planner-dark`: safe to delete.** Prepared for retirement, not deleted (per instruction — "do not merge or delete anything" from the prior review carries forward as the default; PK executes).

**Also flagged, same disposition, PK's call whether to action now:** `origin/lane/w1-planner-dark-v2` (remote-only, commit `391f47f`) carries the identical superseded migration content, rebased onto a more recent `main` but still unmerged/unapplied. Not named in this turn's branch list, so not independently re-verified beyond confirming it's a byte-identical copy — surfaced so it isn't left as a second, less-obvious copy of retired work.

## 6. Retirement commands (PK to run — not executed here)

```bash
# lane-w1-planner-dark is checked out in its own isolated worktree; remove that first
git worktree remove C:/Users/parve/ice-worktrees/lane-w1-planner-dark
git branch -D lane-w1-planner-dark

# optional — the rebased duplicate, remote-only
git push origin --delete lane/w1-planner-dark-v2
```

## 7. Docs updated this pass

- `docs/briefs/writable-planner-format-per-slot-contract-gate1-v1.md` — supersession banner added at
  the top (surgical, content otherwise unchanged, nothing else in the file touched).

**Not touched:** `docs/briefs/resolver-enforcement-r3-contract-gate1-v1.md` (also references the W1
natural-tuple-key identity choice for its own §7 D1) — out of scope for this record; if cc-0079 R3c is
still a live future lane, it should re-derive its own storage design from `format_override` rather than
inherit W1's, but that's a decision for whoever picks up R3c, not this retirement.
