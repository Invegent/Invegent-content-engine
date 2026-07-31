# cc-sched-editor-p1 — Ledger Backfill Packet v1 (E3, bounded T1)

**Created:** 2026-07-31 · **Authority:** PK ruling E3 on `docs/briefs/branch-packet-retirement-batch-v1.md`
**Status:** AUTHORED — awaiting PK gate. **Nothing recovered, committed, or deleted by this packet.**
**Amended 2026-07-31 (pre-gate, packet not frozen):** §5 pre-gate verification record added; the §3
step-1 ledger check corrected from version-number-presence to migration-NAME-presence after the live
ledger read returned the actual applied identities (§5.2) — the branch filenames and the ledger
versions differ by the established MCP-apply pattern, a recorded fact, not a defect in the files.
**Tier:** T1 (docs/repo-record only — zero DB change; the migrations are ALREADY APPLIED live, verified v6.88)
**Boundary:** `cc-sched-editor-p1` is **NOT retired** (PK ruling); it stays the sole reference copy until this packet lands.

## 1. Scope — exactly seven files (the v6.88-named remainder, nothing else)

Source of truth for the list: `docs/briefs/results/dashboard-schedule-readiness-canonical-result-v1.md` §6.

| # | File | Lands at (canonical path, unchanged) | Class |
|---|---|---|---|
| F1 | `supabase/migrations/20260727100000_p1a_schedule_format_override_surface.sql` | same | applied-migration repo-record |
| F2 | `supabase/migrations/20260727100100_p1c_materialise_slots_honour_format_override.sql` | same | applied-migration repo-record |
| F3 | `docs/briefs/artifacts/p1-apply-deploy-packet-v1.md` | same | apply artifact |
| F4 | `docs/briefs/artifacts/p1-base-get_week_format_allocation-live.sql` | same | apply artifact (pre-image) |
| F5 | `docs/briefs/artifacts/p1-base-materialise_slots-live.sql` | same | apply artifact (pre-image) |
| F6 | `docs/briefs/artifacts/p1a-rollback.sql` | same | rollback artifact |
| F7 | `docs/briefs/artifacts/p1c-rollback.sql` | same | rollback artifact |

Why F1/F2 matter: `main`'s git history has no record of the migration SQL that produced its own live
schema (the `migration-ledger ≠ git history` failure mode, named in v6.88). This packet closes it.

## 2. Source conveyance (PK step — the branch lives only on PK's machine)

Option A (preferred): PK pushes the branch as-is — `git push origin cc-sched-editor-p1` — giving the
orchestrator a byte-addressable source ref with history. Option B: PK supplies the 7 files plus their
sha256 list out-of-band. Either way, **PK's conveyance fixes the authoritative hashes at the gate**;
this packet intentionally records none (this container cannot read the branch — no hash is invented).

## 3. Execution steps (docs-only register-lane discipline, verify-or-abort)

1. **Verify-or-abort (per file):** sha256 of each received file matches PK's conveyed hash; the F1/F2
   migration NAMES `p1a_schedule_format_override_surface` / `p1c_materialise_slots_honour_format_override`
   are ABSENT from `supabase/migrations/` on `main` under ANY version prefix (no collision) and PRESENT
   in the live `schema_migrations` ledger BY NAME (read-only check — proves these are records of applied
   history, not new migrations). The live ledger identities are `20260727032218` (p1a) and `20260727032613`
   (p1c) — NOT the branch filenames' `20260727100000`/`20260727100100`; this version-prefix difference is
   the established pattern for MCP-applied migrations already on `main` (precedents:
   `20260727120000_video_render_claim_rpc.sql` vs ledger `20260727101335`;
   `20260727150000_pb1_publish_cadence_write_rpc.sql` vs ledger `20260727090955`) and is RECORDED in the
   result note, never a STOP. Any hash mismatch, name-collision on `main`, or name-absence from the live
   ledger → STOP, return actuals.
2. **Byte-exact placement** at the canonical paths (no edits, no banner stamped into F1/F2 — an
   APPLIED-banner already in the files stays as-is; provenance goes in the commit message + result note).
3. **`branch-warden`** (authorized-main-docs mode): file set == exactly F1–F7, nothing else; readback diff.
4. **Commit on `main` on PK instruction** (suggested message:
   `docs(ledger): backfill cc-sched-editor-p1 applied-migration record + P1 apply artifacts (7 files, byte-exact)`);
   push on explicit PK instruction.
5. **Post-landing:** `cc-sched-editor-p1` becomes retire-ELIGIBLE — actual retirement goes in the next
   retirement batch, never this packet.

## 4. STOP conditions

Hash mismatch on any file · migration NAME collision on `main` (any version prefix) · either migration
NAME missing from the live ledger · any file content contradicting the live function bodies re-verified
in v6.88 (surface to PK — no hand-reconciliation) · any eighth file in the change set.

## 5. Pre-gate verification record — 2026-07-31 (from this container; conveyance still pending)

Everything checkable WITHOUT the branch was verified this session, ahead of PK's gate:

1. **No collision on `origin/main` (F1–F7):** `git ls-tree origin/main` shows no `p1a_*`/`p1c_*`
   migration under any version prefix, no `20260727100000`/`20260727100100`, and none of the five
   `docs/briefs/artifacts/p1-*` paths. All seven canonical landing paths are free.
2. **Live ledger presence BY NAME (read-only `list_migrations`, project `mbkmaxqhsohbtwsqolns`):**
   `20260727032218_p1a_schedule_format_override_surface` and
   `20260727032613_p1c_materialise_slots_honour_format_override` are both in the applied ledger.
   The branch filenames carry `20260727100000`/`20260727100100` (per v6.88 §6) — the prefix difference
   matches the two `main` precedents named in §3.1 (MCP `apply_migration` stamps its own apply-time
   version). Consequence to record, not fix, in this lane: like those precedents, the backfilled F1/F2
   will show as "not applied" to filename-based tooling (`supabase migration list` / `db push`) — a
   known cosmetic drift class on `main`; any repair-history step is a separate future PK decision,
   never part of this T1 lane.
3. **Conveyance NOT yet received:** `git ls-remote origin 'refs/heads/cc-sched-editor-p1*'` returns
   nothing — the branch exists only on PK's machine, and no out-of-band file+sha256 set has been
   supplied. **The lane is blocked at §2 until PK conveys (Option A push, or Option B files+hashes).**
4. **Retirement boundary re-confirmed:** `cc-sched-editor-p1` is deleted nowhere; per PK ruling it is
   assessed for retirement only AFTER this backfill lands (then via the next retirement batch).
