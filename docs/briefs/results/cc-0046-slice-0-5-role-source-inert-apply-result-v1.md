CLAIMED v6.37 · cc-0046 Slice 0.5 authz inert role-source APPLIED · worktree friendly-nobel-345f8b · docs-record gate · 2026-07-27T09:16Z (renumbered from v6.35: cc-0083 v6.35 + Image Intake v6.36 landed on origin/main mid-flight)

# Result — cc-0046 Slice 0.5: Inert `authz` Role-Source APPLIED + First-Administrator Seed

**Date:** 2026-07-27 Sydney
**Lane class / tier:** SAFETY_GATE · **T3** (DDL + grants + RLS; authorization substrate)
**Outcome:** ✅ **APPLIED & VERIFIED LIVE · ENFORCEMENT OFF**
**Brief / package:** `docs/briefs/cc-0046-slice-0-5-role-source-package-v1.md` (frozen SQL `cc902a96…`)
**Census:** `docs/briefs/cc-0046-slice-0-5-protected-action-census-v1.md` (v1.1, refreshed to prod `4f10248`)
**Ruling packet:** `docs/briefs/cc-0046-slice-0-5-a-class-ruling-packet-v1.md`

---

## What shipped (project `mbkmaxqhsohbtwsqolns`)

Migration **`authz_role_source_inert_v1`** (ledger `20260727090227`; repo file
`supabase/migrations/20260727090227_authz_role_source_inert_v1.sql`; rollback
`…090228_authz_role_source_inert_rollback_v1.sql`):

- `CREATE SCHEMA authz` (USAGE-fenced: `anon`/`authenticated` no USAGE; `service_role` USAGE only).
- `authz.user_role` — `(user_id → auth.users ON DELETE CASCADE, role CHECK 3-role, client_id NULL pinned by CHECK,
  granted_by, granted_at)`, PK `(user_id, role)`, RLS **ENABLE+FORCE**, zero policies, `REVOKE ALL` from
  PUBLIC/anon/authenticated.
- `authz.role_audit` — append-only; `actor_user_id → auth.users ON DELETE SET NULL` + immutable
  `actor_uid_snapshot`/`actor_email_snapshot`; RLS ENABLE+FORCE, zero policies.
- `public.current_user_roles()` — **Shape A** (zero-arg, `SECURITY DEFINER`, `search_path=''`, keyed on
  `auth.uid()`), `REVOKE`→`GRANT EXECUTE TO authenticated` (the one, minimal, accepted C-6 exposure).
- `authz.grant_role` / `authz.revoke_role` — **Shape B** (`service_role`-only, re-validate actor is
  `administrator` inside → fail-closed 42501; `GET DIAGNOSTICS` outcome `applied`/`noop`; `FOR UPDATE`
  last-administrator concurrency guard).
- In-transaction **fail-closed ACL assertion** (schema USAGE · table privileges · RLS enable+force · function
  ACLs) — passed (a bad posture aborts the whole migration).

**First-administrator seed** (governed, one-time, TOCTOU-guarded, audit-idempotent) →
**`pk@invegent.com = administrator`** (1 role row + 1 `bootstrap/seeded` audit row, `is_self_mod=true`).

## Authorization & chain

- **Reviews:** `db-rls-auditor` concerns→2 fixes (all six live catalog facts verified, incl. `auth.uid()` NULL
  under service-role); `security-auditor` concerns/**GREEN-inert**→4 fixes; external `ask_chatgpt_review`
  `df82a33b` **partial→PK, no concrete_defect** (pinned `cc902a96`).
- **Apply authorization:** PK conditional apply (Convention 2) — refresh touched only the census, SQL §1–§6
  byte-identical to the reviewed artifact → apply per gate.
- **Pre-apply live STOPs (all passed):** `authz` absent · read fn absent · `pk@invegent.com` = 1 row · no
  migration-name collision.

## Verification (all PASS)

| Check | Result |
|---|---|
| Applied posture | `authz` present; both tables RLS enable+force; `authenticated` reads fn / no grant / no USAGE / no table SELECT; `anon` no read; `service_role` can grant |
| Read-back | `current_user_roles()` under PK's verified JWT → `administrator` (client_id NULL) |
| Fail-closed | unknown uid → 0 rows; NULL-uid (service-role) → 0 rows |
| Advisors (post-DDL) | only 3 expected by-design findings (2× `rls_enabled_no_policy` INFO + 1× `authenticated_security_definer_function_executable` WARN = the Shape-A read fn); zero unexpected; no new `function_search_path_mutable` |

## PK rulings applied to the census (v1.1)

N-7 = SPLIT (submission approval `governance_operator` / invite `administrator`) · H-1 = `administrator`
(`activateClient`) · D-Q2 = `administrator` (shared/global promotion; client-scoped → `governance_operator` once
client scope enforced) · K-1 = separate verified service-to-service shape (not `requireRole()`) · execution sinks
= fresh `exec_sql`/privileged-sink census MANDATORY before enforcement.

## Enforcement is OFF — held before any enable (separate PK gate)

1. **Deletion-path proof** (`auth.users` delete vs actor FK / sole-admin CASCADE lockout → re-bootstrap) —
   needs a scratch auth identity (account creation); **not performed autonomously.**
2. **Fresh `exec_sql`/privileged-sink census** (PK-mandated precondition).
3. Enforcement guards (`requireRole()` choke-point + completeness gate) · kill switch (E-6, Vercel
   instant-rollback to a pinned pre-enforcement deployment id) · wiring the five ruled role mappings.

**Dashboard Phase 1 (live product) untouched. Read-only surfaces unaffected.** Rollback
(`…090228_…rollback_v1.sql`) valid while inert.
