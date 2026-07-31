# cc-sched-editor-p1 — Ledger Backfill Packet v1 (E3, bounded T1)

**Created:** 2026-07-31 · **Authority:** PK ruling E3 on `docs/briefs/branch-packet-retirement-batch-v1.md`
**Status:** AUTHORED — awaiting PK gate. **Nothing recovered, committed, or deleted by this packet.**
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

1. **Verify-or-abort (per file):** sha256 of each received file matches PK's conveyed hash; F1/F2
   version identities `20260727100000`/`20260727100100` are ABSENT from `supabase/migrations/` on
   `main` (no collision) and PRESENT in the live `schema_migrations` ledger (read-only check — proves
   these are records of applied history, not new migrations). Any mismatch → STOP, return actuals.
2. **Byte-exact placement** at the canonical paths (no edits, no banner stamped into F1/F2 — an
   APPLIED-banner already in the files stays as-is; provenance goes in the commit message + result note).
3. **`branch-warden`** (authorized-main-docs mode): file set == exactly F1–F7, nothing else; readback diff.
4. **Commit on `main` on PK instruction** (suggested message:
   `docs(ledger): backfill cc-sched-editor-p1 applied-migration record + P1 apply artifacts (7 files, byte-exact)`);
   push on explicit PK instruction.
5. **Post-landing:** `cc-sched-editor-p1` becomes retire-ELIGIBLE — actual retirement goes in the next
   retirement batch, never this packet.

## 4. STOP conditions

Hash mismatch on any file · migration-version collision on `main` · either version missing from the live
ledger · any file content contradicting the live function bodies re-verified in v6.88 (surface to PK — no
hand-reconciliation) · any eighth file in the change set.
