# Gate-2 Implementation Packet — cc-0046 Slice 0.5: Dashboard Governance Authorization Foundation

> ## ⚠ WHAT THIS PACKET IS — AND WHAT IT AUTHORIZES
>
> This is the **T3 implementation-authorization request** (program **step 5**) for the Slice 0.5 authorization
> **foundation** — the build lane's Gate-1. It **pins the PK-ruled architecture** (decision pack v6.11) into an exact,
> reviewable implementation: schema, owner, tables, columns, keys, functions, grants, RLS policies, dashboard call
> sites, test matrix, and rollback artifact. **It authorizes nothing on its own.** No migration, DDL, DML, grant,
> RLS change, dashboard code change, deploy, role assignment, or governance write happens until (a) PK approves this
> packet (Gate-2 → authorizes the *build*), the build is completed local-only and re-reviewed on its final diff
> hashes, and then (b) PK gives the explicit **T3 apply/deploy gate**. **Enforcement must not be switched on until
> Batch 2 closeout (program step 4) — E-Q2, no exceptions.**

**Created:** 2026-07-23 Sydney · **Author:** orchestrator (Claude Code) · **Executor:** orchestrator + ef-builder (build) + PK gates
**Lane class / tier:** SAFETY_GATE · **T3** (authorization posture · DDL/grants/RLS · production-touching — nothing waived)
**Program position:** owns **steps 5–6** (Gate-2 + build). Does **not** open step 7 (governed-write) or step 8 (Slice 1).

## Inherited artifacts (pinned — this packet re-decides none of them)

| Artifact | Path | Identity |
|---|---|---|
| PK-approved Gate-1 brief | `docs/briefs/cc-0046-slice-0-5-dashboard-governance-authorization-model-brief-v1.md` | sha256 `cf1e19f9…` (register v6.10) |
| **PK decision sheet (rulings)** | `docs/briefs/cc-0046-slice-0-5-pk-decision-sheet-v1.md` | branch commit `d5cd65f` |
| Evidence appendix | `docs/briefs/cc-0046-slice-0-5-pk-decision-sheet-appendix-v1.md` | branch commit `d5cd65f` |
| **Result doc (canonical rulings + program order)** | `docs/briefs/results/cc-0046-slice-0-5-dashboard-governance-authorization-model-result-v1.md` | register **v6.11** |

## Repo coordinates (base SHAs for the build lane)

| Repo | Working branch | Base HEAD | Notes |
|---|---|---|---|
| `Invegent-content-engine` (CE) | `claude/new-session-6sh59v` | **`9718d78`** | merge commit = main `e232607` (cc-0049) + decision pack v6.11 (`439d41c`), PK-directed 2026-07-23; docs-only merge, verified conflict-free. Migration base. |
| `invegent-dashboard` | `claude/new-session-6sh59v` | **`6fe8d1e`** | live production SHA; Batch 2 landed (sink 1 deleted, sink 2 `assertUuid`-guarded). Dashboard-diff base. |

**Live evidence base:** all facts below re-derived read-only this lane against Supabase project **`mbkmaxqhsohbtwsqolns`** (PG **17.6**), 2026-07-23 — census §0 below. Zero material contradictions with the decision-pack appendix §B.

---

## 0. Live census (read-only, this lane) — the build-relevant facts

**Auth model (dashboard `6fe8d1e`):**
- `middleware.ts:28-30,53-55` — authentication only: `createServerClient` (anon key + cookies) → `auth.getUser()` → redirect `/login` if absent. Two public carve-outs (`/mcp-consent`, `/mcp-github-consent`, `:45-50`). No authorization anywhere.
- `lib/supabase/server.ts` — `createSupabaseServerClient()`: cookie-bound user client → in-DB `auth.uid()` = the signed-in user. **This is the A2-INV-2 enforcement client.**
- `lib/supabase/service.ts` — `createServiceClient()`: `SUPABASE_SERVICE_ROLE_KEY`, `persistSession:false`, server-only. **In-DB `auth.uid()` = NULL under this client** (self-DoS surface — A2-INV-2).
- `lib/supabase/sql.ts` — `sql()` wraps `createServiceClient().rpc('exec_sql', …)`.
- **Batch-1 reference guard** (`app/api/drafts/action/route.ts:10-13`): `createSupabaseServerClient().auth.getUser()` → 401, **above** `req.json()` (`:18`) **and above** `createServiceClient()` (`:25`). This is *authentication*-only ("operator-trusted boundary — no per-draft ownership check"); Slice 0.5 upgrades representative paths to an *authorization* check.

**Privileged surface (census this lane):** **35** `"use server"` modules — **1** guarded (`actions/emit-friction.ts`); **39** `route.ts` handlers — **2** guarded (`drafts/action`, `series/action`). Net **34/35 + 37/39 unguarded privileged** (service-role / `exec_sql` / service-key-bearer to edge fns). Invite: `actions/onboarding.ts:116` `inviteUserByEmail` inside `approveSubmission`, operator hardcoded `pk@invegent.com` (`:110`). Full inventory retained in the build record.

**DB catalog facts (project `mbkmaxqhsohbtwsqolns`, PG 17.6):**

| # | Fact | Live result | Consequence for this packet |
|---|---|---|---|
| 0.1 | BYPASSRLS floor | postgres=T, service_role=T, anon=F, authenticated=F, supabase_admin=T(super) | FORCE RLS bites only under a non-BYPASSRLS owner; `service_role` bypass handled by **granting it no direct DML** on authz tables |
| 0.2 | **No non-BYPASSRLS authz-owner role exists** | candidates present are unrelated (`dashboard_user`, `obs_readonly`, `op_reader`, …) | **Must CREATE** `authz_owner` (`NOLOGIN NOBYPASSRLS NOINHERIT`) |
| 0.3 | Schema homes | `audit`: anon/auth/**service_role** all NO USAGE, **0 tables** (empty); `authz`: **absent**; `public`/`c`: anon+auth USAGE | Home = **new `authz`** schema (clean, purpose-named); narrowly GRANT `service_role` USAGE for the mutation fn only |
| 0.4 | `pg_default_acl` | `public` tables born `anon/authenticated=arwdDxtm`; `public` fns born `anon/authenticated=X`; `c` tables `{service_role,inspector_ro}`, `c` **has no fn default-ACL** (→PUBLIC) | The read fn (only object in `public`) must **REVOKE PUBLIC, anon** and keep EXECUTE to `authenticated` only |
| 0.5 | Read-fn precedent | `public.auth_client_id()` = **zero-arg, SECDEF, STABLE, keyed on `auth.uid()`**; defects: `proconfig` NULL, ACL leading `=X` (PUBLIC), reads born-open `portal_user` | Copy the shape; **fix all 3 defects** |
| 0.6 | Actor-FK feasibility | `has_table_privilege('postgres','auth.users','REFERENCES')`=T; **8** FKs into `auth.users`, **0** from a non-auth schema | Creatable but **first of its kind** → `ON DELETE SET NULL` behaviour **must be proven on a scratch table pre-apply** |
| 0.7 | Existing authz objects | **none** (clean slate); `auth.users`=4, **0** with any `role` claim | Greenfield; **seed-then-enforce** (E.7) mandatory or every account (incl. PK) locks out |
| 0.8 | F-5 privileged fns | `exec_sql`, `draft_approve_and_enqueue`, `approve_onboarding`, `activate_client_from_submission` — all SECDEF, owner `postgres`, ACL `{postgres,service_role}` only, `search_path=public` | RLS ineffective on this definer path (C-3 defence-in-depth only) — enforcement sits at C-1/C-2 + C-6 grants/RLS |
| 0.9 | Slice-1 target tables | `c.*` owned by `postgres`, RLS mostly on/FORCE off (`client_brand_asset` RLS off) | **Context only — NOT touched by this lane** (governed-write/Slice 1) |

---

## 1. Object model (the canonical authorization objects)

### 1.1 Schema + owner

- **`CREATE ROLE authz_owner NOLOGIN NOBYPASSRLS NOINHERIT NOCREATEDB NOCREATEROLE;`** — a dedicated, non-login,
  **non-`BYPASSRLS`** role that owns every authz object (E-Q13). It cannot log in, cannot bypass RLS, and is not a
  runtime principal. Rationale (census 0.2): no existing role is a safe owner.
- **`CREATE SCHEMA authz AUTHORIZATION authz_owner;`** — non-REST-exposed, USAGE-fenced (census 0.3). E-Q10/E-Q4.
  **Pre-apply (E-Q11): re-confirm in the Supabase UI that `authz` is NOT in the exposed-schema list before apply.**
- Grants on schema `authz`: **none to `anon`/`authenticated`/PUBLIC.** `service_role` gets **USAGE only** (needed to
  EXECUTE the mutation function that lives in `authz`); no table privileges. `postgres` retains ownership-admin.

### 1.2 Role enum

```
CREATE TYPE authz.operator_role_kind AS ENUM ('viewer', 'governance_operator', 'administrator');
```
The **only** three roles (B-Q0). No aliases, no hierarchy object; `administrator ⊃ governance_operator` is enforced
in the decision primitive (§3), not by a DB inheritance object.

### 1.3 `authz.operator_role` — the canonical role table

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` | surrogate PK (`gen_random_uuid()` is a PG13+ `pg_catalog` built-in — safe under `search_path=''`) |
| `user_id` | `uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | the operator. CASCADE: deleting the account removes its authorization (no orphan grant). History is preserved in the audit table, not here |
| `role` | `authz.operator_role_kind NOT NULL` | fixed enum (1.2) |
| `environment` | `text NULL` | A-Q1 — **NULL = all environments.** No forced value. Optional `CHECK (environment IS NULL OR environment IN ('production','preview'))` |
| `client_id` | `uuid NULL` | B-Q1 — **NULL = global.** Carried now, **not enforced in v1**; no FK to `c.*` in v1 (avoids coupling authz to schema `c`; FK added when per-client is enabled) |
| `granted_by` | `uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL` | provenance actor |
| `granted_by_email_snapshot` | `text NULL` | immutable snapshot of grantor email at write time |
| `granted_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | maintained by the mutation fn |

- **Uniqueness:** `UNIQUE NULLS NOT DISTINCT (user_id, environment, client_id)` — one role per user per scope, treating
  NULL as a value (PG15+; verified available on PG17). Prevents duplicate/ambiguous grants.
- **Indexes:** the unique index covers the hot lookup `(user_id, environment, client_id)`; add `INDEX (role)` only if an
  admin-listing query needs it (deferred — 4 accounts).
- **Deletion behaviour:** row delete = revoke (via mutation fn only; last-admin protected §4). User delete = CASCADE.

### 1.4 `authz.operator_role_audit` — append-only authorization audit

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY` | |
| `action` | `text NOT NULL CHECK (action IN ('grant','change','revoke','bootstrap','recovery'))` | |
| `actor_user_id` | `uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL` | E-Q6 |
| `actor_uid_snapshot` | `uuid NOT NULL` | immutable — survives account deletion |
| `actor_email_snapshot` | `text NOT NULL` | immutable |
| `target_user_id` | `uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL` | affected operator |
| `target_uid_snapshot` | `uuid NOT NULL` | immutable |
| `target_email_snapshot` | `text NULL` | immutable (best-effort) |
| `old_role` | `authz.operator_role_kind NULL` | previous state |
| `new_role` | `authz.operator_role_kind NULL` | new state (NULL on revoke) |
| `environment` | `text NULL` | scope snapshot |
| `client_id` | `uuid NULL` | scope snapshot |
| `is_self_modification` | `boolean NOT NULL DEFAULT false` | E.8 distinguishability |
| `reason` | `text NULL` | |
| `correlation_id` | `text NULL` | request/trace id where available |
| `outcome` | `text NOT NULL DEFAULT 'applied'` | |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |

- **Append-only w.r.t. the application principal (A2-INV-5):** `service_role` gets **no** direct privilege on this
  table (not even INSERT). The **only** writer is the mutation function (definer = `authz_owner`), which INSERTs.
  There is **no UPDATE/DELETE policy** → updates/deletes are denied for everyone under FORCE RLS **except** the E-Q6
  referential action (`ON DELETE SET NULL`), which is the intended non-application exception (proof in §11).
- **Separated from application activity logging** — this is authorization-decision logging only; `m.system_audit_log`
  (a health-check run log) is untouched and unconflated (N-4).

**Future client-scope compatibility:** both tables carry `client_id` from day one (§1.3/§1.4). Enabling per-client
enforcement later = add the scope predicate to the decision primitive (§3) + optionally a FK — no table migration.

---

## 2. Identity mapping — how an authenticated user maps to a role record

- The map is **`authz.operator_role.user_id = auth.uid()`**, resolved **server-side only** through the read function
  (§3), which is issued on the **cookie-bound user client** (`createSupabaseServerClient`). In-DB, `auth.uid()`
  derives solely from the verified JWT `sub` claim (`current_setting('request.jwt.claim*')`).
- **The mapping cannot be selected by request parameters (INV-3 / A2-INV-1):** the read function takes **zero
  arguments**; there is no `p_user_id`, no body field, no header that can name a different operator. A forged
  request-body `user_id`/`role` is inert — nothing reads it for the authorization decision.
- **Under the service client `auth.uid()` is NULL** (census 0.8 / A2-INV-2) → the read returns NULL → deny. The
  adapter (§7) therefore issues the read on the cookie-bound client only, and constructs the service client **after**
  the check passes.

---

## 3. Authorization lookup — the single canonical decision primitive

### 3.1 DB read function (the source of truth read)

```
CREATE FUNCTION public.authz_current_operator_role()
  RETURNS authz.operator_role_kind
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp
AS $$
  SELECT r.role
  FROM authz.operator_role r
  WHERE r.user_id = auth.uid()      -- schema-qualify auth.uid() -> auth.uid()
    AND r.environment IS NULL        -- v1: global-only enforcement (B-Q1)
    AND r.client_id  IS NULL
  LIMIT 1;
$$;
ALTER FUNCTION public.authz_current_operator_role() OWNER TO authz_owner;
REVOKE ALL ON FUNCTION public.authz_current_operator_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authz_current_operator_role() TO authenticated;
```

- Lives in **`public`** (the only exposed schema `authenticated` has USAGE on) so it is RPC-callable — the **only**
  authz object in `public` (A2-INV-4). SECURITY DEFINER owned by `authz_owner` so it can read the fenced `authz`
  table; under FORCE RLS this requires the SELECT policy in §6.
- **Zero-arg, keyed on `auth.uid()`** (A2-INV-1 / E-Q9 shape A). `search_path` excludes `public`/`auth`; `auth.uid()`
  is called **schema-qualified** so it resolves regardless (F.3). `gen_random_uuid()` unaffected (F.3 correction).
- **NULL return = no authority** (E-1/E-3, deny-by-default).

### 3.2 Server-side decision primitive (dashboard) — `requireRole()`

`lib/authz.ts` (new). One choke-point that every enforced path calls; role interpretation is **not** duplicated per
route (C.4):

```
type OperatorRole = 'viewer' | 'governance_operator' | 'administrator';
const RANK = { viewer: 1, governance_operator: 2, administrator: 3 };

// Returns { userId, role } or throws a typed AuthzError mapped to 401/403.
async function requireRole(min: OperatorRole): Promise<{ userId: string; role: OperatorRole }> {
  const ssr = createSupabaseServerClient();                 // cookie-bound (A2-INV-2)
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) throw new AuthzError('unauthenticated', 401);  // E-2
  const { data, error } = await ssr.rpc('authz_current_operator_role');  // same client, per-request (A2-INV-3)
  if (error) throw new AuthzError('authz_unreadable', 403); // E-4 fail-closed
  const role = data as OperatorRole | null;
  if (!role) throw new AuthzError('no_governance_role', 403); // E-3 distinct identity
  if (RANK[role] < RANK[min]) throw new AuthzError('insufficient_role', 403);
  return { userId: user.id, role };
}
```

- **`administrator ⊃ governance_operator`** via `RANK` (result §5); `viewer` never satisfies `min ≥ governance_operator`.
- **No cross-request cache** (A2-INV-3) — resolved per request, on the cookie-bound client.
- **Deny-by-default everywhere** (E-1): unauthenticated → 401 (distinct); authenticated-unassigned → 403
  `no_governance_role` (distinct, non-guessing); read error/outage → 403 `authz_unreadable` (E-4 fail-closed, surfaced
  visibly per Slice-0 "LIVE READ FAILED" pattern, never rendered as "empty permissions").

---

## 4. Mutation contract (grant / change / revoke)

### 4.1 The mutation function (server-verified, `service_role`-only — E-Q14 shape B)

```
CREATE FUNCTION authz.set_operator_role(
    p_verified_actor_uid uuid,   -- the actor, ALREADY verified server-side via getUser()
    p_target_user_id     uuid,
    p_new_role           authz.operator_role_kind,   -- NULL sentinel handled via a separate revoke arg/overload
    p_environment        text,
    p_client_id          uuid,
    p_reason             text,
    p_correlation_id     text
) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp
AS $$ ... $$;
ALTER FUNCTION authz.set_operator_role(...) OWNER TO authz_owner;
REVOKE ALL ON FUNCTION authz.set_operator_role(...) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION authz.set_operator_role(...) TO service_role;
```

Function body invariants (all enforced in-function, in one transaction):
1. **Actor must be a live `administrator`.** It looks up `authz.operator_role` for `p_verified_actor_uid` and requires
   `role = 'administrator'`. **A caller-supplied uid is trusted only because** (a) EXECUTE is `service_role`-only, (b)
   `service_role` is server-only, (c) the server passes it **only after `getUser()`**, and (d) the two `exec_sql`
   sinks that could forge `auth.uid()`/call this are Batch-2-contained (**E-Q2 precondition — enforcement must not be
   enabled until Batch 2 closeout**). The function still re-verifies the actor's role, so a forged uid of a
   non-administrator is denied regardless.
2. **Valid role.** `p_new_role` is enum-constrained by type; invalid values are a type error.
3. **No self-elevation to a higher rank** without it being recorded — self-modification is **flagged**
   (`is_self_modification = (p_verified_actor_uid = p_target_user_id)`), not forbidden (E.8: an administrator can act
   by design; the useful invariant is distinguishability in the log).
4. **Last-administrator protection.** A change/revoke that would leave **zero** rows with `role='administrator'`
   (global scope) is rejected — enforced **in the DB** (E.8), not the UI.
5. **Atomic audit.** The role write and the `authz.operator_role_audit` INSERT happen in the same transaction; a
   failed mutation leaves no partial state. Actor/target snapshots (`*_uid_snapshot`, `*_email_snapshot`) are captured
   at write time from `auth.users`.

- **Who may:** grant/change/revoke — **`administrator` only** (enforced by invariant 1). `governance_operator` and
  `viewer` cannot mutate roles (they are not administrators). No dashboard client, browser, or general `authenticated`
  user can invoke this (EXECUTE is `service_role`-only, and there is no direct table DML grant anywhere).
- **Dashboard adapter** `grantOperatorRole()` (in `lib/authz.ts`): `requireRole('administrator')` → then
  `createServiceClient().rpc('authz.set_operator_role', { p_verified_actor_uid: userId, … })`. The verified `userId`
  comes from `requireRole`'s `getUser()`; the client never supplies the actor.

### 4.2 What is required to mutate authorization state

`administrator` role (in the DB) **and** a server-verified session **and** the `service_role`-only function path.
Three independent conditions; none alone suffices.

---

## 5. RLS, grants, ownership — every planned change, with justification

**Ownership:** every `authz.*` object owned by `authz_owner` (non-BYPASSRLS). The `public` read function also owned by
`authz_owner`. (E-Q13)

**RLS:** both `authz.operator_role` and `authz.operator_role_audit` get `ENABLE ROW LEVEL SECURITY` **and**
`FORCE ROW LEVEL SECURITY` (A2-INV-7). FORCE is load-bearing **because** the owner is non-BYPASSRLS (census 0.1).

**Minimal policy set (E-Q13 — demonstrated, not assumed).** Under non-BYPASSRLS owner + FORCE, the definer functions
(running as `authz_owner`) are themselves subject to RLS, so zero-policy-deny-all would deny the functions. The
minimal set that permits exactly the intended definer paths and nothing else:

| Table | Policy | Cmd | Predicate | Why |
|---|---|---|---|---|
| `authz.operator_role` | `role_owner_select` | SELECT | `USING (current_user = 'authz_owner')` | lets the read fn (definer) resolve the caller's role; its body already filters `user_id = auth.uid()` |
| `authz.operator_role` | `role_owner_write` | INSERT/UPDATE/DELETE | `USING / WITH CHECK (current_user = 'authz_owner')` | lets the mutation fn (definer) grant/change/revoke |
| `authz.operator_role_audit` | `audit_owner_insert` | INSERT | `WITH CHECK (current_user = 'authz_owner')` | lets the mutation fn append audit rows |
| `authz.operator_role_audit` | *(none for UPDATE/DELETE)* | — | — | **append-only**; the E-Q6 `SET NULL` referential action is the sole permitted mutation (RI context) |

> `current_user`-keyed policies restrict effect to executions running **as the definer** (`authz_owner`). Direct
> access by `anon`/`authenticated` is already impossible (no schema USAGE, no table grant — C-6); `service_role` has
> USAGE but **no table DML grant** (and its BYPASSRLS is irrelevant with nothing to bypass to); `postgres` bypasses
> RLS but is reachable only via `exec_sql` (Batch-2-contained) or PK. **The `authz_owner`+FORCE+`current_user`
> policy interaction, and the audit `ON DELETE SET NULL` under FORCE, are the two behaviours proven on a scratch
> table before any production apply (§11).**

**Grants (exhaustive):**

| Object | anon | authenticated | service_role | PUBLIC | Justification |
|---|---|---|---|---|---|
| schema `authz` (USAGE) | — | — | **USAGE** | — | service_role must reach `authz.set_operator_role` |
| `authz.operator_role` (table) | — | — | — | — | no direct DML for anyone; all access via functions |
| `authz.operator_role_audit` (table) | — | — | — | — | append-only; writer is the definer fn only |
| `public.authz_current_operator_role()` | **REVOKE** | **EXECUTE** | (inherits) | **REVOKE** | authenticated reads own role via RPC (A2-INV-6: revoke names PUBLIC+anon) |
| `authz.set_operator_role(...)` | **REVOKE** | **REVOKE** | **EXECUTE** | **REVOKE** | server-verified mutation path only (E-Q14) |

**Every `REVOKE` names `PUBLIC`, `anon`, AND `authenticated` in the same migration as the `CREATE`** (A2-INV-6 —
because `public` default-ACL grants `anon=X, authenticated=X` on new functions; a PUBLIC-only revoke leaves those).
A **fail-closed assertion** at the end of the migration verifies the resulting ACLs are exactly as tabled (aborts the
transaction otherwise).

---

## 6. Dashboard enforcement points (representative — sufficient to prove INV-9, not a full retrofit)

Slice 0.5 is the **foundation**. It enforces on a **narrow representative set** that exercises both boundary types
and both privileged classes, enough to prove INV-9 end-to-end. It does **not** retrofit the other ~69 unguarded paths
(that is a follow-on enforcement rollout / the governed-write lane).

| # | Path | Boundary | Change | Required role |
|---|---|---|---|---|
| EP-1 | `app/api/drafts/action/route.ts` (POST) | C-2 route handler | **Upgrade** the existing `getUser()` auth-gate to `requireRole('governance_operator')`, kept above `req.json()` + `createServiceClient()` | `governance_operator` |
| EP-2 | `actions/onboarding.ts::approveSubmission` (`'use server'`) | C-1 server action | Add `requireRole('governance_operator')` as the **first statement**; the `inviteUserByEmail` sub-step (`:116`, N-7) additionally requires **`administrator`** | `governance_operator` (+`administrator` for invite) |
| EP-3 | Role mutation itself (`grantOperatorRole` adapter → `authz.set_operator_role`) | C-1 + DB | Administrator-gated grant/revoke — the model's own write path | `administrator` |

- **Ordering (C.3):** every check precedes both `req.json()`/body parsing and `createServiceClient()` — asserted with
  `invocationCallOrder` (§10).
- **UI (C-4):** affordances a role cannot use are hidden **for convenience only** — never counted as enforcement.
- **Named limitation (C.4a):** the remaining unguarded server actions/routes and the ~18 REST-reachable
  `SECURITY DEFINER` functions (N-9, E-Q12) are **not** covered by Slice 0.5 and must not be presented as covered.
  A `requireRole()` completeness gate (build-time/test-time) is delivered as the sweep tool for the follow-on lane.

---

## 7. Bootstrap (first administrator — no permanent bypass) — E.7/E.8

1. **Ship inert.** The migration creates schema/tables/functions/grants/RLS but **no dashboard code reads them yet**
   (EP-1..3 land disabled behind the enforcement switch). Nothing is enforced.
2. **Seed the first `administrator` by governed SQL under a PK gate** — a one-time INSERT into `authz.operator_role`
   (`role='administrator'`, `user_id = <PK's auth.uid()>`, `environment=NULL`, `client_id=NULL`) **plus** a matching
   `authz.operator_role_audit` row (`action='bootstrap'`). Performed by **PK-run SQL** (not the mutation fn — no
   administrator exists yet; a UI-only grant path would be unbootstrappable). **Not browser-reachable; not based on
   editable metadata.**
3. **Verify** the seeded assignment reads back through `authz_current_operator_role()` (still inert).
4. **Prove the `auth.users` delete path against the actor FK** on a scratch table (E.5.1), still inert.
5. **Enable enforcement** behind the E-Q1 kill switch — **only after Batch 2 closeout** (E-Q2).
6. **Verify each role** behaves as modelled, including ≥1 negative case.

- **Bootstrap closes by exhaustion** — it is a one-time seeded row, not a standing grant path.
- **Break-glass recovery** = the **same** governed-SQL-under-PK mechanism (never depends on an existing admin); it is
  **itself audited** (`action='recovery'`).
- **Last-administrator protection** (§4 invariant 4) prevents removing/self-demoting the final administrator — in the DB.

---

## 8. Rollback artifact (restores the pre-Slice-0.5 state)

**Two rollback stages, matched to the two-phase rollout:**

- **Inert stage (before enforcement enabled):** rollback = a reverse migration that, in dependency order,
  `DROP FUNCTION authz.set_operator_role`, `DROP FUNCTION public.authz_current_operator_role`,
  `DROP TABLE authz.operator_role_audit`, `DROP TABLE authz.operator_role`, `DROP TYPE authz.operator_role_kind`,
  `REVOKE USAGE ON SCHEMA authz FROM service_role`, `DROP SCHEMA authz`, `DROP ROLE authz_owner`. No dashboard
  behaviour has changed at this stage, so nothing else to revert. **No orphaned grants/policies/functions/schema/role
  remain** (each created object has a named drop). Batch 1, Batch 2, cc-0049 untouched (path-disjoint).
- **Enforced stage:** primary rollback = **Vercel instant-rollback to the pinned pre-enforcement deployment ID**
  (E-Q1) — recorded in the result doc **before** enforcement is enabled (a target found after an incident is not a
  plan). Optionally followed by the inert-stage DB drop.

**Protection lost on rollback (stated):** the dashboard returns to *authenticated ⇒ operator-equivalent* — every
authenticated account (incl. client users, F-2) can again reach every governance surface. This is the accepted,
explicit cost of reverting; it is why the kill switch is a deliberate PK action, audited, and visibly announced (E.6).

---

## 9. Authorized change envelope (exact — nothing outside it)

- **CE:** one migration under `supabase/migrations/` (role + schema + enum + 2 tables + 2 functions + grants + RLS +
  policies + fail-closed ACL assertion) **+ its reverse-migration rollback artifact**. Migration base **`9718d78`**.
- **Dashboard (base `6fe8d1e`):** `lib/authz.ts` (new adapter: `requireRole`, `grantOperatorRole`, `AuthzError`) ·
  EP-1 edit (`drafts/action/route.ts`) · EP-2 edit (`actions/onboarding.ts`) · a thin admin grant/revoke entry point
  for EP-3 (server action, no full role-management console) · UI affordance gating (convenience) · tests + mutation
  tests · **`middleware.ts` NOT changed** (C-5).
- **Docs:** this packet, the result doc, register pointers.

**Explicitly NOT in envelope:** general permissions framework · per-feature capability matrix · client-entitlement
product logic · dashboard redesign · a role-management console · governed business-write (Slice 1) · scanner cleanup ·
onboarding refactor · unrelated RLS/SECDEF fixes · the other ~69 unguarded paths · re-enabling `/create/capability-matrix`.

---

## 10. Security posture requirements (bound into acceptance)

- **Canonical data protection:** no INSERT/UPDATE/DELETE by ordinary `authenticated` users (no schema USAGE, no table
  grant, FORCE RLS); no self-role-assignment (mutation is `administrator`-checked, `service_role`-only, server-verified);
  no role via editable Auth metadata (role truth is A2, not `user_metadata`); no browser service-role exposure
  (`SUPABASE_SERVICE_ROLE_KEY` server-only, never `NEXT_PUBLIC`).
- **Fail-closed:** unknown/missing/malformed/revoked/unsupported → deny (E-1/E-3/E-4). Unassigned ≠ unauthenticated
  (distinct error identities) but neither may perform privileged ops.
- **Role semantics:** `viewer` = read-only; `governance_operator` = approved governance ops only; `administrator` =
  authorization admin + `governance_operator` powers. **Administrators do NOT bypass DB policies** (no BYPASSRLS; no
  superuser semantics).
- **Service-role boundary:** possession of the service key is **not** authorization for the requesting user — every
  enforced path proves the human operator's role first (§3/§6), then constructs the service client.
- **SECURITY DEFINER hardening:** controlled `search_path = pg_catalog, pg_temp`; owner `authz_owner`; minimal grants;
  schema-qualified object references; `auth.uid()` schema-qualified; explicit input validation; **no caller-controlled
  object resolution**; no privilege broadening.
- **Auditability:** every mutation records affected user, previous+new role, actor (FK + immutable snapshot),
  timestamp, environment/scope, reason/correlation where available, self-mod flag, outcome. Minimal durable record —
  no broad audit platform invented.

---

## 11. Required proof matrix (built + run local in the build phase; pre-apply scratch proofs called out)

**Repository-native tests (dashboard, vitest) — zero-DB-call spies + distinct named error identity +
`invocationCallOrder` + positive controls (F.4); grep/count coverage forbidden:**

- **Identity & lookup:** assigned administrator / governance_operator / viewer resolve correctly · unassigned →
  fail-closed · unauthenticated → 401 · invalid uid → deny · revoked assignment → deny · environment-NULL semantics ·
  **request params cannot switch the resolved operator** (forged body `user_id`/`role` inert).
- **Role enforcement (per EP-1..3):** administrator allowed where specified · governance_operator allowed only where
  specified · viewer denied mutation · unassigned denied · unauthenticated denied · forged role value denied · forged
  user id denied · **hidden-UI / direct-invocation does not bypass** · **replayed request after revocation denied**.
- **Role mutation:** administrator can mutate · governance_operator cannot elevate · viewer cannot mutate · no
  self-elevation-without-flag · ordinary authenticated cannot write the table directly · invalid role rejected ·
  unsupported environment normalized/rejected · mutation records actor+timestamps · repeated/concurrent mutation
  deterministic · failed mutation leaves no partial state.
- **Mutation testing (must FAIL if the protection is removed):** role check removed · UI-visibility-as-authorization ·
  unassigned defaults to allowed · request-body role trusted · request-body uid selects operator · service-role
  proceeds without operator check · viewer allowed to mutate · governance_operator assigns administrator ·
  self-elevation permitted · RLS disabled · FORCE removed · owner changed to BYPASSRLS · PUBLIC EXECUTE/table grant ·
  SECDEF `search_path` unsafe · one entry point omits the adapter · revocation not respected on replay.

**Live / deployment-safe DB proofs:**

- **Pre-apply scratch-table proofs (mandatory, before production DDL):** (1) the `authz_owner`+FORCE+`current_user`
  policy interaction lets the definer functions read/write while direct principals are denied; (2) the E-Q6
  `ON DELETE SET NULL` referential action **fires and mutates the audit row** under FORCE RLS + non-BYPASSRLS owner
  (whether RLS bypass for referential *actions* extends here is **unresolved and must be settled on a scratch table**,
  brief E.7 step 4).
- **INV-9 direct-invocation proof (≥1 representative path):** normal UI-backed call · direct HTTP/server-action POST ·
  direct RPC where applicable · forged payload · stale/replayed request after revocation — **all unauthorized variants
  fail safely before the privileged mutation**.
- **Catalog readback (post-apply, §12):** RLS+FORCE on · owner = `authz_owner` (non-BYPASSRLS) · owner does not bypass
  the intended policy · anon no access · authenticated only intended (EXECUTE on the read fn) · service_role only
  required (USAGE + the one EXECUTE) · no PUBLIC grants · no shadow/overload bypass · schema USAGE minimal.

---

## 12. Deployment sequence (executes only AFTER the explicit T3 apply gate)

1. Reconfirm origin, artifact hashes, migration base `9718d78`, dashboard base `6fe8d1e`, clean trees.
2. **E-Q11 pre-apply:** re-confirm in the Supabase UI that `authz` is not REST-exposed.
3. Run the pre-apply scratch-table proofs (§11).
4. Apply the reviewed migration (PK-run).
5. Re-read every deployed object: definitions · owner · grants · RLS · FORCE · policies · function ACL · `search_path`
   · overload count. **Stop on any posture/artifact mismatch.**
6. Seed the first administrator by governed SQL under a PK gate (§7 step 2); verify readback.
7. Deploy the dashboard changes (adapter + EP-1..3) **inert** (enforcement switch off).
8. Verify production auth health; verify `authz_current_operator_role()` for the seeded identities.
9. **Only after Batch 2 closeout (E-Q2):** enable enforcement behind the E-Q1 kill switch; record the pre-enforcement
   Vercel deployment ID first.
10. Exercise EP-1..3 through authorized + unauthorized variants; prove direct invocation fails closed (INV-9).
11. Prove no read-only dashboard regression (E-7 route set).
12. Prove no regression to Batch 1, Batch 2, onboarding activation, cc-0049.
13. Backfill deployed migration into CE if needed; complete result doc, registers, reviews; clean trees + parity.

---

## 13. Reviewers (T3 full chain — final artifact, not an approximation)

`db-rls-auditor` (DB is the subject: grants/RLS/FORCE/policies/SECDEF/exposure) · `security-auditor` (privilege
escalation / self-elevation / owner-bypass / SECDEF resolution / PUBLIC exposure / trust boundary) · **external review
pinned to the exact migration + dashboard-diff hashes** · `branch-warden` · independent lead re-verification. Reviewers
examine the **final** artifact; any change re-triggers review (`reviewed_input_hash`). This packet is reviewed **before**
PK's Gate-2; the built diff is reviewed again **before** the apply gate.

---

## 14. Open items surfaced for PK at Gate-2 (recommendations pinned; none silently decided)

All are consistent with the ruled architecture; listed so PK can confirm or redirect at Gate-2:

- **O-1 Schema name — `authz` (recommended) vs existing `audit`.** Both ruled acceptable (E-Q10). `authz` is
  purpose-named, empty-namespace clean, and avoids overloading `audit`'s semantics. *Recommend `authz`.*
- **O-2 Owner role name `authz_owner`** (must be created; census 0.2). Cosmetic; recommend as named.
- **O-3 Representative enforcement set = EP-1/EP-2/EP-3** (§6). Recommend as the minimal INV-9-sufficient set;
  confirm it is neither too narrow (proof) nor a retrofit (scope).
- **O-4 [B]-items pinned as recommended by the decision pack:** E-Q1 Vercel-rollback kill switch · E-Q6
  `ON DELETE SET NULL` + snapshots (PII-retention tension is PK's to own) · E-Q9 zero-arg read shape. Confirm.
- **O-5 `client_id` carried WITHOUT a FK in v1** (avoids coupling to `c.*`; per-client dormant). Confirm.
- **O-6 Not this lane (restated):** D-Q1 (Slice 1 four-vs-five ops), D-Q2/D-Q3 (Slice 1 semantics) — belong to the
  governed-write/Slice 1 lane, **not** the foundation.

**Mandatory-stop conditions actively cleared by this packet:** A2 implementable as ruled (§1–5) · live identity map
matches the pack (§2, census 0.5/0.8) · non-BYPASSRLS owner safely creatable (§1.1, census 0.2) · FORCE RLS + minimal
policy set defined and provable, not breaking the definer path (§5/§11) · bootstrap has no permanent bypass (§7) ·
service-role paths authorize the human operator (§3/§4) · envelope does not expand into governed-write/Slice 1 (§9).
**Not yet cleared until proven in the build phase:** the two scratch-table proofs (§11) and the reviewer verdicts.
Any of these failing is a STOP back to PK, per the task's stop conditions.

---

## 15. Acceptance invariants (INV-1…9 + A2-INV-1…8) — where each is satisfied

| Invariant | Satisfied by |
|---|---|
| **INV-1** default deny | §3.2 (null/error → deny), E-1/E-3; F.4 negatives (§11) |
| **INV-2** server-side, first-statement | §6 EP-1..3 (above body-parse + service client); A2-INV-2; `invocationCallOrder` |
| **INV-3** authenticated cannot self-assign | §2/§3.1 zero-arg read; §4 admin-checked mutation |
| **INV-4** no write via exposed REST tables | §1.1 fenced `authz`; §5 REVOKE PUBLIC+anon+authenticated |
| **INV-5** ownership doesn't bypass protection | §1.1 non-BYPASSRLS owner + §5 FORCE + minimal policies |
| **INV-6** mutations auditable | §1.4 actor FK + snapshots; append-only; self-mod flag |
| **INV-7** bootstrap/recovery controlled | §7 governed-SQL under PK; last-admin protection in DB |
| **INV-8** service-role doesn't silently bypass operator authz | §3/§4/§6 enforce at server/DB boundary; N-9 named limitation (C.4a) |
| **INV-9** ⭐ UI-independent enforceability (PK, permanent) | §6 C-1/C-2/C-6; §11 INV-9 direct-invocation + guard-deleted/reordered + replay-after-revoke negatives |
| **A2-INV-1..8** | §3.1 (1), §3.2/census0.8 (2), §3.2 (3), §1.1/§5 (4), §1.4/§5 (5), §5 (6), §5 (7), §4 (8) |

---

## 16. Stop condition (this packet's own lane)

Return to PK with: this packet + the review-chain verdicts, for the **Gate-2 (implementation) decision**. **Then stop.**
No build (migration/adapter/tests) begins until PK approves Gate-2; no apply/deploy begins until the separate T3 apply
gate after the built diff is re-reviewed. Enforcement stays off until Batch 2 closeout regardless.
