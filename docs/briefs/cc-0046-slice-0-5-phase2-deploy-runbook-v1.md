# Deploy Runbook — cc-0046 Slice 0.5 Phase 2 (first role-enforcement enable)

**Created:** 2026-07-28 · **Tier:** T3 (production authorization posture + deploy) · **PK-run.**
**Change under deploy:** dashboard commit `3b68557` (branch `claude/cc0046-requirerole-inert`, off `ee02b96`) —
wires `requireRole` onto 5 first-wave governance writes. Reviewed: lead re-verify · branch-warden safe · external
`94aaee39` agree (pinned wiring-diff sha256 `57d51b99…f2b8`). **Enforcement is not live until deployed.**

> **This runbook is the "prep" for the G4 deploy hard stop. Every step below is PK-run.** The Vercel connector is
> NOT authenticated in this session, so the orchestrator cannot deploy or hit the Vercel API — you run the deploy,
> the re-pin, and the drill. The orchestrator can help with the git steps on your instruction.

## What's live in prod already (context)
- DB substrate `authz` (inert role source) + `public.current_user_roles()` granted `authenticated`.
- **F-DEL-1 guard** (`trg_prevent_last_admin_delete`, ledger `20260728000335`) — blocks deleting the last admin.
- Only `pk@invegent.com` holds a role (`administrator`). The other 3 accounts are unseeded (denied by design).

## Step 0 — Pre-deploy STOPs (abort if any trips)
- Dashboard `origin/main` HEAD is still `ee02b96` (no new prod commits since review). If it moved → the wiring
  must rebase onto the new HEAD and the G3 chain re-runs (hash changes).
- Confirm the live production deployment **now** = the pre-enforcement build and record its id as the rollback
  target (package pin: `dpl_24S4QPsPtD1YBfQakwpS1FhRmg9R` = `ee02b96`, `isRollbackCandidate:true`). Whatever is
  live immediately before the enforcement deploy is the kill-switch target.

## Step 1 — Land the wiring on dashboard `main` (PK)
1. Push the branch: `git push -u origin claude/cc0046-requirerole-inert` (from `C:/Users/parve/ice-wt/dash-cc0046-requirerole-inert`).
2. Open a PR to dashboard `main` and merge (or fast-forward `main` to `3b68557` if you prefer). Commit `3b68557`
   is exactly the 10 reviewed files.

## Step 2 — Deploy (PK · Vercel)
- Vercel builds/deploys `main` on merge (or promote the resulting preview to Production). **No Vercel env var
  changes** — enforcement is compiled in. Not a Supabase EF, so `verify_jwt`/`--no-verify-jwt` do not apply.
- Record the new production deployment id as the enforcement build.

## Step 3 — Kill-switch drill (PK · MUST pass before declaring "enabled")
The kill switch is **redeploy the prior build** — there is no runtime toggle, and DB-side disable is forbidden
(the guard fails closed → self-DoS).
1. **Rollback** to the pinned pre-enforcement deployment (`dpl_24S4QP…`/`ee02b96`) via Vercel instant-rollback.
2. **Verify** pre-enforcement behaviour is restored (a wired action succeeds without a role check).
3. **Redeploy** the enforcement build (Step 2). Enforcement is "on" only after this drill passes.

## Step 4 — Three-tier + kill-switch proofs (Phase 5)
Real GoTrue sessions; no malformed-id probing of prod. All grant/revoke via governed `authz.grant_role` /
`authz.revoke_role` (actor = `pk@`, administrator), audited + reversible.
- **administrator (`pk@`):** perform an admin-only control (`activateClient`) and a governance control
  (`saveWeekFormatOverride`) → both **ACCEPT**.
- **Negative case (no seeding needed):** log in as an unseeded alt (e.g. `reviewer@invegent.com`) and attempt a
  wired governance action → **"Not authorized"** (deny-by-default). Satisfies the package's mandatory negative case.
- **governance_operator (temporary proof-grant):** `grant_role(pk, pk_email, <alt uid>, 'governance_operator')`;
  log in as that alt → governance controls **ACCEPT**, and `activateClient` (admin-only) **DENIED**; then
  `revoke_role(...)` back to unseeded.
- **viewer (temporary proof-grant):** `grant_role(... 'viewer')`; log in → every wired governance action
  **DENIED**; then `revoke_role(...)` back to unseeded.
- **Read-only surfaces unregressed:** `/create/format-capability`, `/creative-library`, `/overview`, reporting.
- **Kill switch** proven by Step 3.

## Step 5 — Record + close
Write the activation result (`docs/briefs/results/…`): enforcement build id, re-pinned rollback target, drill
outcome, the three-tier proofs, and the temporary proof-grants (granted→revoked, final state = only `pk@` seeded).
Register pointers only (Convention 1). Update the F-DEL-1 / enforcement memory to "enforcement LIVE (first wave)".

## Named limitation (do not over-claim)
Enforcement covers the **dashboard governance-write set** (5 wired now; 7 more declared for later waves). It does
**not** cover the C-6 out-of-app PostgREST SECDEF surface, nor the dashboard `exec_sql` arbitrary-SQL-as-postgres
channel (separate `security-auditor` lane). A postgres-capable caller is out of this model's scope.

## Rollback summary
Anything wrong post-enable → Vercel instant-rollback to `dpl_24S4QP…`/`ee02b96`. Never disable via the DB.
