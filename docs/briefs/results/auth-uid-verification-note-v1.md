CLAIMED (no register version — non-terminal) · `auth.uid()` verification · closes a named substitution in cc-0046 Slice 0.5 · session S1 Dashboard Authz · 2026-07-24 +1000 Sydney

# Verification note — `auth.uid()` body, independently re-derived

**Status:** DRAFT — uncommitted, awaiting PK. The control tower owns committing this.
**Purpose:** close the **named substitution** carried in two committed documents, which relied on the Slice 0.5
brief's 2026-07-22 `db-rls-auditor` read rather than an independent one:

- `docs/briefs/cc-0046-slice-0-5-a-class-ruling-packet-v1.md` §0 — *"`auth.uid()`'s body could not be re-read in this
  lane … carried on the brief's read, not independently re-verified here."*
- `docs/briefs/dashboard-containment-batch-2-boundary-and-eq2-proof-v1.md` §3.1 C2 — same substitution.

**Both are now committed and pushed. This note SUPERSEDES the substitution; it does not edit them.**

## Why the earlier attempt failed, and what worked

`pg_get_functiondef('auth.uid()'::regprocedure)` failed **42501 — permission denied for schema `auth`**: the
`regprocedure` cast resolves the name *through* the schema, and `ice_readonly` holds no USAGE there.

**Route that works, and is worth reusing:** query `pg_proc` joined to `pg_namespace` **by name**, which touches only
world-readable `pg_catalog` and never resolves through `auth`:

```sql
SELECT p.proname, pg_get_userbyid(p.proowner), p.prosecdef, p.provolatile,
       p.proconfig::text, p.proacl::text, p.prosrc
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'auth' AND p.proname IN ('uid','role','jwt');
```

Run read-only via `python scripts/db-read.py` (R0 path, zero prompt).

## Result — the claim is CONFIRMED, verbatim

```sql
-- auth.uid()
select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
```

| Property | Value |
|---|---|
| Owner | `supabase_auth_admin` |
| `prosecdef` | **false** — SECURITY **INVOKER**, not DEFINER |
| `provolatile` | `s` — STABLE |
| `proconfig` | **NULL — mutable `search_path`** |
| `proacl` | `{=X/supabase_auth_admin, supabase_auth_admin=X, dashboard_user=X}` — the leading **`=X` is PUBLIC EXECUTE** |

`auth.role()` and `auth.jwt()` share the same shape (SECURITY INVOKER, STABLE, no `proconfig`, PUBLIC EXECUTE).

## What this settles

1. **A2-INV-2 is confirmed.** Identity derives entirely from `current_setting('request.jwt.claim.sub' / 'request.jwt.claims')`. A service-role JWT carries no `sub`, so **`auth.uid()` returns NULL under `createServiceClient()`** — the day-one self-DoS A2-INV-2 exists to prevent is real, not theoretical. The role read must be issued on the **cookie-bound** client.
2. **E-Q2 conclusion C2 is now independently verified, not carried.** Because identity is a GUC, it is settable via `set_config` — which is callable in SELECT position through `exec_sql`. **An adversary holding any `exec_sql` path can forge the identity the role-read function keys on.** The substitution is discharged; C1 (self-granting an `administrator` row) never depended on it, so the E-Q2 conclusion was never at risk.
3. **Slice 0.5 §F.3's schema-qualification instruction is confirmed necessary.** `auth.uid()` has **no `proconfig`**, so it inherits the caller's `search_path`. A SECURITY DEFINER role-read function must call it **schema-qualified as `auth.uid()`** and must **not** add `auth` to its own `search_path`.

## Newly recorded (not previously in the lane record)

- **`auth.uid()` carries PUBLIC EXECUTE** (`=X/supabase_auth_admin`) — the same `pg_default_acl`-shaped pattern the lane already tracks. **Not a defect:** it reads only the caller's own GUC and discloses nothing about another principal. Recorded so it is not later "discovered" as a finding.
- **`auth.uid()` is SECURITY INVOKER + STABLE.** It is safe to call from a SECURITY DEFINER function: it reads request-scoped GUCs, not `auth.users`, so it needs no privilege on the `auth` schema and grants none.
- **The by-name `pg_proc` route is a reusable capability** — schema-`auth` function metadata *is* readable via R0 without widening any grant. Prior lanes treated it as unreachable.

## Non-claims

A catalog read only. **No exploitation is claimed, attempted, or demonstrated**; no `set_config` call was made and no
payload was constructed. This note does **not** re-verify the Slice 0.5 brief's other DB claims, does **not** cover
`auth.users` contents or grants, and authorizes nothing. Directive item 4 only.
