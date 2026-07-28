# Result — cc-0046 Slice 0.5: F-DEL-1 last-administrator delete guard

**Date:** 2026-07-28 Sydney · **Lane class / tier:** SAFETY_GATE · T3 (additive DDL on the `authz` substrate)
**Outcome:** ✅ **F-DEL-1 CLOSED** — DB guard applied + proven live on prod; role-model **enforcement remains OFF**.
**Parent lane:** Role Enforcement Activation v1 (plan `shiny-rolling-flamingo`), Phase 0 of 5.
**Governing docs:** activation package `docs/briefs/cc-0046-slice-0-5-enforcement-activation-package-v1.md` (§4 F-DEL-1) ·
readiness `docs/briefs/results/cc-0046-slice-0-5-enforcement-readiness-v1.md` (Prereq 1).

## PK ruling (2026-07-28)
F-DEL-1 handled by a **DB-level guard on `authz.user_role`** (an in-schema `BEFORE DELETE` trigger) — NOT a trigger
on GoTrue-managed `auth.users`, and NOT merely accepting re-bootstrap. Chosen over the `auth.users`-trigger variant
to avoid GoTrue-interference risk, and over accept-re-bootstrap to close the lockout outright.

## What F-DEL-1 was
`authz.user_role.user_id` → `auth.users(id)` `ON DELETE CASCADE`. A **raw `auth.users` delete of the last
administrator** cascades to `authz.user_role`, silently zeroing administrators and bypassing the governed
`authz.revoke_role` guard (which raises 23514 on the last admin). Reachable only by a console / service_role /
GoTrue-admin actor (never a dashboard operator); recovery was proven re-bootstrap. Now closed at the DB.

## The change (additive)
Migration `authz_last_admin_delete_guard_v1` — repo file `supabase/migrations/20260728090000_...v1.sql`
(sha256 `55c782e9…`), applied ledger version **`20260728000335`**. Paired rollback `…090001_…rollback_v1.sql`.
Adds SECURITY DEFINER `authz.prevent_last_admin_delete()` (owner postgres, `search_path=''`) + trigger
`trg_prevent_last_admin_delete BEFORE DELETE ON authz.user_role FOR EACH ROW WHEN (OLD.role='administrator')`:
returns OLD if session GUC `authz.allow_last_admin_delete='on'`; else counts admins excluding OLD.user_id; if 0,
RAISE 23514. No table/column/existing-grant change. **SECURITY DEFINER is required** — the GoTrue delete actor
`supabase_auth_admin` lacks `authz` USAGE and `rolbypassrls`, so a SECURITY INVOKER trigger would fail 42501
mid-cascade.

## Review chain (full T3, nothing waived)
- **db-rls-auditor:** PASS / high / zero must_fix — CASCADE fires the BEFORE DELETE trigger and RAISE aborts the
  parent atomically (FK `confdeltype='c'`); SECDEF justified + count sees all rows despite RLS FORCE; additive;
  rollback faithful; no advisor delta; multi-row simultaneous admin delete fails **safe** (blocks).
- **security-auditor:** GREEN / clean / high / zero must_fix — cross-repo grep (CE + dashboard + portal + web) =
  **zero runtime callers** of authz deletion / `deleteUser` / the GUC (docs only); GUC override is not an
  escalation (anon/authenticated USAGE-fenced from the DELETE regardless); over-blocks nothing beyond the intended
  last-admin case. Named separate residual: the dashboard `exec_sql` arbitrary-SQL-as-postgres channel could set
  the GUC or DROP the trigger — pre-existing dashboard-authz finding, **not** claimed fixed here.
- **branch-warden:** safe — change set = exactly the two migration files, no commit, isolated worktree, ahead 12 / behind 0.
- **External review** `ask_chatgpt_review` **`1aa1a893`**: agree / proceed, medium risk / high confidence, zero
  pushback, pinned to `reviewed_input_hash=55c782e9…`.

## Live proof (post-apply, on prod, via txn-rollback — nothing committed; 1 live administrator)
Install verified: owner `postgres` (rolbypassrls), `security_definer=true`, `search_path=""`, trigger enabled
(tgenabled=O) with WHEN-qual, anon/authenticated EXECUTE=false.

| # | Vector | Result |
|---|---|---|
| T1 | direct delete of sole admin row | **PASS** — 23514 blocked |
| T2 | `auth.users` delete → cascade (the real F-DEL-1 vector) | **PASS** — parent aborted atomically (23514) |
| T3 | delete an admin with a 2nd admin present | **PASS** — allowed (rows=1) |
| T4 | GUC override on last-admin delete | **PASS** — permitted (rows=1) |
| T5 | viewer-role delete (regression) | **PASS** — unaffected (rows=1) |

Post-proof DB state unchanged: admin_count=1, total_role_rows=1, `pk@invegent.com=administrator`. Every proof
self-rolled-back via a terminal `PROOF|…` RAISE.

## Standing residuals (named, not fixed here)
- **C-6 / dashboard `exec_sql`:** a postgres-capable caller can bypass or drop the guard — separate dashboard-authz
  lane, out of scope for F-DEL-1. The guard converts an *accidental/operational* raw-cascade last-admin loss from
  silent success into an explicit 23514 requiring a deliberate override; it is not a control against an attacker
  already holding postgres.
- **Governed-teardown runbook** for who may set `authz.allow_last_admin_delete='on'` (and its audit) — open,
  non-blocking (security-auditor open question).

## Repo reconciliation + Git↔DB parity proof (2026-07-28, PK-gated — v6.44)
The in-repo record is now **RECONCILED TO `main`** (this supersedes the "uncommitted" carry below).
Merge commit `83571fc` (`--no-ff`, from `origin/claude/sleepy-spence-56ff87` @ `3d1443c`) — additive only:
**4 paths, 234 insertions, 0 deletions**, zero collisions. The production migration was **NOT re-applied**.

**Parity is byte-exact, derived independently from both sides:**

| Evidence | Result |
|---|---|
| Migration file exists on `main` | ✅ `git ls-tree` — both `…090000_…v1.sql` + `…090001_…rollback_v1.sql` present |
| Content ≡ live guard | ✅ file **read from the merged `main` git object store**, minus its 7 comment-only post-apply annotation lines (11–17) + trailing newline → sha256 **`ad6c02fe415e0743e57881c60386b315c2d66337fc8c2d2c4589f847ad5ddfe6`**, **identical** to `sha256(supabase_migrations.schema_migrations.statements[1])` for the applied version |
| Ledger identity recorded | ✅ version `20260728000335`, name `authz_last_admin_delete_guard_v1`; **exactly 1** ledger row matching `%last_admin_delete%` (no duplicate apply) |
| Git↔DB drift | ✅ **CLOSED** — live `authz.prevent_last_admin_delete()` present (1) + `trg_prevent_last_admin_delete` present (1), non-internal |
| No dashboard enforcement enabled | ✅ change set contains **zero** code/`.ts`/`.tsx`/middleware/`requireRole` files; dashboard branch `claude/cc0046-requirerole-inert` @ `3b68557` **not merged, not deployed** |
| No role assignments changed | ✅ `authz.user_role` = 1 row (`pk@invegent.com`=administrator, `client_id` NULL); `authz.role_audit` = 1 row, still the original `2026-07-27 09:04:45Z` bootstrap seed — **no new role event**; the three alternates (`parveenkumar11@hotmail.com`, `pk+cfw@invegent.com`, `reviewer@invegent.com`) remain unseeded |

**⚠ Open provenance gap (not a defect).** Line 12 of the migration file pins
`Reviewed SQL sha256 = 55c782e9…` (the hash external review `1aa1a893` was pinned to). That hash is **NOT
reproducible** from the artifact under 12 canonicalizations (full file · LF/CRLF · annotation-stripped ·
comment-stripped · rollback alone · both files concatenated). The live guard and the repo file match each other
**exactly**, so this is a CLAUDE.md rule-4 *traceability* gap in the review pin, not a content discrepancy.
**Use `ad6c02fe…` (applied-SQL hash) as the parity anchor** — it is independently re-derivable from either side.
PK was notified before the merge and authorized proceeding as-is.

**Not pushed.** `main` is ahead of `origin/main` by 3 commits; push remains a separate PK gate.

## Carry / next
Phase 0 complete + repo-reconciled. Parent lane resumes at **Phase 1 — seed v1 roles** (needs PK to name roles for
`reviewer@invegent.com`, `pk+cfw@invegent.com`, `parveenkumar11@hotmail.com`; a 2nd administrator would also
soften F-DEL-1). Enforcement stays OFF until the separate deploy gate (Phase 4). **Held behind a fresh PK gate:**
dashboard merge + Vercel deploy · kill-switch drill · administrator/governance_operator/viewer three-tier proof.
