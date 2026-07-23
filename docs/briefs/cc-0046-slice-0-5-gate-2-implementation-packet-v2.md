# Gate-2 Implementation Packet — cc-0046 Slice 0.5: Dashboard Governance Authorization Foundation (v2)

> ## ⚠ WHAT THIS PACKET IS — AND WHAT IT AUTHORIZES
>
> This is the **T3 implementation-authorization request** (program **step 5**) for the Slice 0.5 authorization
> **foundation**. It **pins the PK-ruled architecture** (decision pack v6.11) into an exact, reviewable
> implementation: schema, owner, tables, columns, keys, functions, grants, RLS policies, dashboard call sites, test
> matrix, and rollback artifact. **It authorizes nothing on its own.** No migration, DDL, DML, grant, RLS change,
> dashboard code change, deploy, role assignment, or governance write happens until (a) PK approves this packet
> (Gate-2 → authorizes the *build*), the build is completed local-only and re-reviewed on its final diff hashes, and
> then (b) PK gives the explicit **T3 apply/deploy gate**. **Enforcement must not be switched on until Batch 2
> closeout (program step 4) — E-Q2, no exceptions.**

**Created:** 2026-07-23 Sydney · **Author:** orchestrator (Claude Code) · **Executor:** orchestrator + ef-builder (build) + PK gates
**Lane class / tier:** SAFETY_GATE · **T3** (authorization posture · DDL/grants/RLS · production-touching — nothing waived)
**Program position:** owns **steps 5–6** (Gate-2 + build). Does **not** open step 7 (governed-write) or step 8 (Slice 1).

## Revision — v2 supersedes v1 for the Gate-2 decision

**v1** (`docs/briefs/cc-0046-slice-0-5-gate-2-implementation-packet-v1.md`, sha256 `a1bc548f…766428`) was run through the
full T3 review chain (verdicts in §R below). **v2 leaves v1 byte-identical as the reviewed-at-`a1bc548f` record** and
folds in the reviewers' recommendations + PK's confirmed refinement:

- **RC-1 (PK point-6, db-rls-auditor SF-1 / security-auditor SEC-SF-1):** the canonical decision primitive is homed in
  **`authz.current_operator_role()`**, exposed via a **thin `public.authz_current_operator_role()` wrapper that is
  `SECURITY DEFINER OWNER authz_owner`, zero-arg, pure delegation** — §3.1. Removes any need to grant `authenticated`
  USAGE on `authz`; identity (`auth.uid()`) is preserved; no new exposure.
- **RC-2 (SF-3):** the mutation-fn body schema-qualifies **every** reference (§4.1) — build-verified on the diff.
- **RC-3 (SF-4):** the mutation function is a **single NULL-sentinel signature** (no overload) — §4.1.
- **RC-4 (SF-2):** A2-INV-6-literal revoke idiom for the read wrapper — §3.1/§5.
- **RC-5 (SF-5):** `service_role` grant on the read path stated explicitly (`—`, not "inherits") — §5.
- **RC-6 (SEC-SF-6):** `correlation_id` populated at the call site; the `requireRole()` completeness sweep is a hard
  build-time gate — §6/§11.
- **RC-7 (OBS-2):** the last-administrator count predicate matches the v1 enforcement predicate — §4.1.
- **RC-8 (OBS-6):** the bootstrap seed INSERT + its audit row run in **one transaction** — §7.

## Inherited artifacts (pinned — this packet re-decides none of them)

| Artifact | Path | Identity |
|---|---|---|
| PK-approved Gate-1 brief | `docs/briefs/cc-0046-slice-0-5-dashboard-governance-authorization-model-brief-v1.md` | sha256 `cf1e19f9…` (register v6.10) |
| **PK decision sheet (rulings)** | `docs/briefs/cc-0046-slice-0-5-pk-decision-sheet-v1.md` | branch commit `d5cd65f` |
| Evidence appendix | `docs/briefs/cc-0046-slice-0-5-pk-decision-sheet-appendix-v1.md` | branch commit `d5cd65f` |
| **Result doc (canonical rulings + program order)** | `docs/briefs/results/cc-0046-slice-0-5-dashboard-governance-authorization-model-result-v1.md` | register **v6.11** |
| Gate-2 packet v1 (reviewed record) | `docs/briefs/cc-0046-slice-0-5-gate-2-implementation-packet-v1.md` | sha256 `a1bc548f…766428` |

## Repo coordinates (base SHAs for the build lane)

| Repo | Working branch | Base HEAD | Notes |
|---|---|---|---|
| `Invegent-content-engine` (CE) | `claude/new-session-6sh59v` | **`9718d78`** | merge commit = main `e232607` (cc-0049) + decision pack v6.11 (`439d41c`); docs-only, conflict-free. Migration base. |
| `invegent-dashboard` | `claude/new-session-6sh59v` | **`6fe8d1e`** | live production SHA; Batch 2 landed (sink 1 deleted, sink 2 `assertUuid`-guarded). Dashboard-diff base. |

**Live evidence base:** all facts re-derived read-only against Supabase project **`mbkmaxqhsohbtwsqolns`** (PG **17.6**),
2026-07-23 — census §0. Zero material contradictions with the decision-pack appendix §B.

---

## 0. Live census (read-only) — the build-relevant facts

**Auth model (dashboard `6fe8d1e`):** `middleware.ts:28-30,53-55` authentication only (cookie-bound `getUser()`, two
public carve-outs `:45-50`). `lib/supabase/server.ts` `createSupabaseServerClient()` = cookie-bound user client →
in-DB `auth.uid()` = signed-in user (**A2-INV-2 enforcement client**). `lib/supabase/service.ts` `createServiceClient()`
= service-role, server-only → **`auth.uid()` = NULL** (self-DoS surface). `lib/supabase/sql.ts` `sql()` → `exec_sql`.
Batch-1 reference guard `app/api/drafts/action/route.ts:10-13`: `getUser()` → 401 **above** `req.json()` (`:18`) and
`createServiceClient()` (`:25`); *authentication*-only ("no per-draft ownership check").

**Privileged surface (census):** **35** `"use server"` modules — **1** guarded; **39** `route.ts` handlers — **2**
guarded. Net **34/35 + 37/39 unguarded privileged**. Invite: `actions/onboarding.ts:116` `inviteUserByEmail` in
`approveSubmission`, operator hardcoded `pk@invegent.com` (`:110`).

**DB catalog facts (project `mbkmaxqhsohbtwsqolns`, PG 17.6):**

| # | Fact | Live result | Consequence |
|---|---|---|---|
| 0.1 | BYPASSRLS floor | postgres=T, service_role=T, anon=F, authenticated=F, supabase_admin=T(super) | FORCE RLS bites only under a non-BYPASSRLS owner; `service_role` bypass handled by granting it **no direct DML** |
| 0.2 | Non-BYPASSRLS authz-owner role | **none suitable exists** | **CREATE** `authz_owner` (`NOLOGIN NOBYPASSRLS NOINHERIT`) |
| 0.3 | Schema homes | `audit`: no USAGE for anon/auth/**service_role**, empty; `authz`: **absent**; `public`/`c`: anon+auth USAGE | Home = new **`authz`** (PK-confirmed); narrowly GRANT `service_role` USAGE for the mutation fn |
| 0.4 | `pg_default_acl` | `public` tables born `anon/auth=arwdDxtm`; `public` fns born `anon/auth=X`; `c` has no fn default-ACL (→PUBLIC) | REVOKE names PUBLIC+anon+authenticated on every new fn (A2-INV-6) |
| 0.5 | Read-fn precedent | `public.auth_client_id()` zero-arg SECDEF STABLE `auth.uid()`-keyed; 3 defects | Copy the shape; fix all 3 |
| 0.6 | Actor-FK feasibility | `postgres` REFERENCES `auth.users`=T; **0** non-auth FKs into it | Creatable, first of its kind → scratch-proof `ON DELETE` pre-apply |
| 0.7 | Existing authz objects | **none**; 4 users, 0 role claims | Greenfield; seed-then-enforce mandatory |
| 0.8 | F-5 privileged fns | `exec_sql`, `draft_approve_and_enqueue`, `approve_onboarding`, `activate_client_from_submission` — SECDEF owner postgres, `{postgres,service_role}`, `search_path=public` | RLS ineffective on this definer path (C-3 defence only) |
| 0.9 | Slice-1 target tables | `c.*` owned postgres, RLS mostly on/FORCE off (`client_brand_asset` RLS off) | **Context only — NOT touched by this lane** |

---

## 1. Object model

### 1.1 Schema + owner
- **`CREATE ROLE authz_owner NOLOGIN NOBYPASSRLS NOINHERIT NOCREATEDB NOCREATEROLE;`** — dedicated non-login,
  non-`BYPASSRLS` owner of every authz object (E-Q13; census 0.2 — must be created).
- **`CREATE SCHEMA authz AUTHORIZATION authz_owner;`** — non-REST-exposed, USAGE-fenced (E-Q10; census 0.3).
  **Pre-apply (E-Q11): re-confirm in the Supabase UI that `authz` is NOT in the exposed-schema list.**
- Schema grants: **none** to `anon`/`authenticated`/PUBLIC; `service_role` gets **USAGE only** (to EXECUTE the mutation
  fn); no table privileges. `authz_owner` owns.

### 1.2 Role enum
`CREATE TYPE authz.operator_role_kind AS ENUM ('viewer','governance_operator','administrator');` — the only three
roles (B-Q0); no aliases/hierarchy object (`administrator ⊃ governance_operator` enforced in the primitive, §3).

### 1.3 `authz.operator_role` — canonical role table

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` | `gen_random_uuid()` = PG13+ `pg_catalog` built-in |
| `user_id` | `uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | delete account → remove authorization (no orphan grant); history preserved in the audit table |
| `role` | `authz.operator_role_kind NOT NULL` | fixed enum |
| `environment` | `text NULL` | A-Q1 — NULL = all environments; optional `CHECK (environment IS NULL OR environment IN ('production','preview'))` |
| `client_id` | `uuid NULL` | B-Q1 — NULL = global; carried, **not enforced v1**, **no FK v1** (O-5 approved) |
| `granted_by` | `uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL` | provenance |
| `granted_by_email_snapshot` | `text NULL` | immutable snapshot |
| `granted_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | maintained by the mutation fn |

- **Uniqueness:** `UNIQUE NULLS NOT DISTINCT (user_id, environment, client_id)` (PG17) — one role per user per scope,
  NULL treated as a value. **Index** covers the hot lookup.

### 1.4 `authz.operator_role_audit` — append-only authorization audit

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY` | |
| `action` | `text NOT NULL CHECK (action IN ('grant','change','revoke','bootstrap','recovery'))` | |
| `actor_user_id` | `uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL` | E-Q6 |
| `actor_uid_snapshot` | `uuid NOT NULL` | immutable |
| `actor_email_snapshot` | `text NOT NULL` | immutable |
| `target_user_id` | `uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL` | |
| `target_uid_snapshot` | `uuid NOT NULL` | immutable |
| `target_email_snapshot` | `text NULL` | immutable (best-effort) |
| `old_role` / `new_role` | `authz.operator_role_kind NULL` | previous / new (NULL on revoke) |
| `environment` / `client_id` | `text NULL` / `uuid NULL` | scope snapshot |
| `is_self_modification` | `boolean NOT NULL DEFAULT false` | E.8 distinguishability |
| `reason` | `text NULL` | |
| `correlation_id` | `text NULL` | **populated from the request trace at the call site (RC-6)** |
| `outcome` | `text NOT NULL DEFAULT 'applied'` | |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |

- **Append-only w.r.t. the application principal (A2-INV-5):** `service_role` gets **no** direct privilege (not even
  INSERT); the **only** writer is the mutation fn (definer = `authz_owner`), which INSERTs. **No UPDATE/DELETE policy**
  → denied under FORCE RLS for everyone **except** the E-Q6 `ON DELETE SET NULL` referential action (the intended
  non-application exception; proof §11).
- Separated from application activity logging (`m.system_audit_log` untouched, N-4).

**Future client-scope compatibility:** both tables carry `client_id` day one; enabling per-client later = add the scope
predicate to the primitive (§3) + optionally a FK — no table migration.

---

## 2. Identity mapping

- The map is **`authz.operator_role.user_id = auth.uid()`**, resolved **server-side only** through the read primitive
  (§3), issued on the **cookie-bound user client**. In-DB `auth.uid()` derives solely from the verified JWT `sub`.
- **Unselectable by request parameters (INV-3 / A2-INV-1):** the read primitive and its public wrapper take **zero
  arguments**; no `p_user_id`/body/header can name a different operator. Forged body `user_id`/`role` is inert.
- **Under the service client `auth.uid()` is NULL** (census 0.8 / A2-INV-2) → read returns NULL → deny. The adapter
  (§3.2) issues the read on the cookie-bound client; the service client is constructed **after** the check passes.

---

## 3. Authorization lookup — the single canonical decision primitive (RC-1: authz-homed)

### 3.1 Canonical DB read primitive (in `authz`) + thin `public` wrapper

**Canonical primitive — lives in `authz` (the authorization schema owns its own decision logic):**
```
CREATE FUNCTION authz.current_operator_role()
  RETURNS authz.operator_role_kind
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp
AS $$
  SELECT r.role
  FROM authz.operator_role r
  WHERE r.user_id = auth.uid()      -- schema-qualified; identity from the verified JWT sub only
    AND r.environment IS NULL         -- v1: global-only enforcement (B-Q1)
    AND r.client_id  IS NULL
  LIMIT 1;
$$;
ALTER FUNCTION authz.current_operator_role() OWNER TO authz_owner;
REVOKE ALL ON FUNCTION authz.current_operator_role() FROM PUBLIC, anon, authenticated;
-- No GRANT: unreachable directly (authz not REST-exposed; anon/authenticated hold no USAGE on authz).
-- Only authz_owner (owner) executes it, from within the wrapper / the mutation fn.
```

**Thin `public` wrapper — the ONLY REST-callable authz object (documented compatibility shim, RC-1):**
```
CREATE FUNCTION public.authz_current_operator_role()
  RETURNS authz.operator_role_kind
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp
AS $$
  SELECT authz.current_operator_role();   -- pure delegation, zero-arg, no logic
$$;
ALTER FUNCTION public.authz_current_operator_role() OWNER TO authz_owner;
REVOKE ALL ON FUNCTION public.authz_current_operator_role() FROM PUBLIC, anon, authenticated;  -- A2-INV-6-literal (RC-4)
GRANT EXECUTE ON FUNCTION public.authz_current_operator_role() TO authenticated;
```

- **Why this shape (RC-1).** A function RPC-called by the cookie-bound `authenticated` client must live in a
  PostgREST-**exposed** schema; `authz` is deliberately fenced/unexposed (a direct `authz` RPC → PGRST106). The wrapper
  is `SECURITY DEFINER OWNER authz_owner`, so during its execution `current_user = authz_owner` (which owns `authz`,
  has USAGE, and satisfies the FORCE-RLS `current_user='authz_owner'` SELECT policy) — the inner call resolves and
  reads. **SECDEF changes `current_user`, NOT the JWT claims**, so `auth.uid()` inside the canonical fn still resolves
  to the **caller's** verified `sub`. **`authenticated` therefore needs only EXECUTE on the `public` wrapper + USAGE on
  `public` — never USAGE on `authz`** (A2-INV-4 fencing preserved). The wrapper is **zero-arg and passes nothing
  inward** — no impersonation surface. It is documented here as a compatibility shim; **`public` is not the long-term
  home of the logic — `authz` is.**
- **NULL return = no authority** (E-1/E-3, deny-by-default).
- Both functions carry the born-open ACL treatment, the fail-closed ACL assertion (§5), and the overload/shadow catalog
  readback (§11) — the readback covers **all three** authz functions (wrapper, canonical, mutation).

### 3.2 Server-side decision primitive (dashboard) — `requireRole()`

`lib/authz.ts` (new) — one choke-point; role interpretation is not duplicated per route (C.4):
```
type OperatorRole = 'viewer' | 'governance_operator' | 'administrator';
const RANK = { viewer: 1, governance_operator: 2, administrator: 3 };
async function requireRole(min: OperatorRole): Promise<{ userId: string; role: OperatorRole }> {
  const ssr = createSupabaseServerClient();                       // cookie-bound (A2-INV-2)
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) throw new AuthzError('unauthenticated', 401);        // E-2
  const { data, error } = await ssr.rpc('authz_current_operator_role');  // public wrapper; same client; per-request (A2-INV-3)
  if (error) throw new AuthzError('authz_unreadable', 403);       // E-4 fail-closed
  const role = data as OperatorRole | null;
  if (!role) throw new AuthzError('no_governance_role', 403);     // E-3 distinct identity
  if (RANK[role] < RANK[min]) throw new AuthzError('insufficient_role', 403);
  return { userId: user.id, role };
}
```
- `administrator ⊃ governance_operator` via `RANK`; `viewer` never satisfies `min ≥ governance_operator`.
- **No cross-request cache** (A2-INV-3); resolved per request on the cookie-bound client. **Deny-by-default** with
  distinct error identities (E-1/E-2/E-3/E-4); E-4 surfaced visibly (Slice-0 "LIVE READ FAILED" pattern).

---

## 4. Mutation contract (grant / change / revoke)

### 4.1 The mutation function — server-verified, `service_role`-only, single signature (E-Q14 shape B; RC-2/RC-3/RC-7)

```
CREATE FUNCTION authz.set_operator_role(
    p_verified_actor_uid uuid,                 -- actor, ALREADY verified server-side via getUser()
    p_target_user_id     uuid,
    p_new_role           authz.operator_role_kind,   -- NULL = REVOKE (single NULL-sentinel signature, RC-3; no overload)
    p_environment        text,
    p_client_id          uuid,
    p_reason             text,
    p_correlation_id     text
) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp        -- body schema-qualifies EVERY ref: authz.*, auth.uid(), auth.users, gen_random_uuid() (RC-2)
AS $$ ... $$;
ALTER FUNCTION authz.set_operator_role(...) OWNER TO authz_owner;
REVOKE ALL ON FUNCTION authz.set_operator_role(...) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION authz.set_operator_role(...) TO service_role;
```
In-function invariants (one transaction):
1. **Actor must be a live `administrator`** — looks up `authz.operator_role` for `p_verified_actor_uid` (via the
   canonical primitive or an equivalent guarded read) and requires `role='administrator'`. A caller-supplied uid is
   trusted only because EXECUTE is `service_role`-only, `service_role` is server-only, the server passes it **only
   after `getUser()`**, and the two `exec_sql` sinks are Batch-2-contained (**E-Q2 — enable-gated**). A forged
   non-administrator uid is inert.
2. **Valid role** — enum-typed.
3. **Self-modification flagged not forbidden** — `is_self_modification = (p_verified_actor_uid = p_target_user_id)`
   (E.8). Only `administrator` can invoke, so a self-mod is at most a self-demotion (caught by 4) or lateral.
4. **Last-administrator protection** — reject any change/revoke leaving **zero** rows with `role='administrator'`
   **using the v1 enforcement predicate `environment IS NULL AND client_id IS NULL` (RC-7)** so a scoped admin row
   cannot mask loss of the global admin. Enforced **in the DB** (E.8).
5. **Atomic audit** — the role write and the `authz.operator_role_audit` INSERT (snapshots captured at write time from
   `auth.users`; `correlation_id` from `p_correlation_id`, RC-6) occur in one transaction; a failed mutation leaves no
   partial state.
- **Who may:** `administrator` only (invariant 1). `governance_operator`/`viewer` cannot (not administrators; and
  EXECUTE is `service_role`-only with no direct table DML anywhere).
- **Dashboard adapter** `grantOperatorRole()`/`revokeOperatorRole()` (`lib/authz.ts`): `requireRole('administrator')`
  → `createServiceClient().rpc('set_operator_role', { p_verified_actor_uid: userId, p_correlation_id: <trace>, … })`.
  The verified `userId` comes from `requireRole`'s `getUser()`; the client never supplies the actor.

### 4.2 Required to mutate
`administrator` role (DB) **and** a server-verified session **and** the `service_role`-only function path — three
independent conditions; none alone suffices.

---

## 5. RLS, grants, ownership — every planned change, justified

**Ownership:** every `authz.*` object **and** the `public` read wrapper owned by `authz_owner` (non-BYPASSRLS).

**RLS:** both `authz` tables `ENABLE` + `FORCE ROW LEVEL SECURITY` (A2-INV-7; FORCE load-bearing under the
non-BYPASSRLS owner, census 0.1).

**Minimal policy set (E-Q13 — demonstrated):**

| Table | Policy | Cmd | Predicate | Why |
|---|---|---|---|---|
| `authz.operator_role` | `role_owner_select` | SELECT | `USING (current_user = 'authz_owner')` | read primitive (definer) resolves the caller's role; body filters `user_id=auth.uid()` |
| `authz.operator_role` | `role_owner_write` | INSERT/UPDATE/DELETE | `USING/WITH CHECK (current_user='authz_owner')` | mutation fn (definer) grant/change/revoke; also covers `operator_role`'s own RI actions |
| `authz.operator_role_audit` | `audit_owner_insert` | INSERT | `WITH CHECK (current_user='authz_owner')` | mutation fn appends audit rows |
| `authz.operator_role_audit` | *(none for UPDATE/DELETE)* | — | — | **append-only**; E-Q6 `ON DELETE SET NULL` is the sole permitted mutation (RI context, proof §11) |

> `current_user`-keyed policies restrict effect to executions running **as the definer** (`authz_owner`). Direct access
> by anon/authenticated is impossible (no schema USAGE, no grant); `service_role` has USAGE but no table DML (its
> BYPASSRLS is irrelevant with nothing to bypass to); `postgres` bypasses RLS but is reachable only via `exec_sql`
> (Batch-2-contained) or PK.

**Grants (exhaustive) — RC-5 (explicit `—`, no "inherits"):**

| Object | anon | authenticated | service_role | PUBLIC | Justification |
|---|---|---|---|---|---|
| schema `authz` (USAGE) | — | — | **USAGE** | — | service_role must reach `authz.set_operator_role` |
| `authz.operator_role` (table) | — | — | — | — | no direct DML for anyone; all access via functions |
| `authz.operator_role_audit` (table) | — | — | — | — | append-only; writer = definer fn only |
| `authz.current_operator_role()` (canonical) | **REVOKE** | **REVOKE** | **REVOKE** | **REVOKE** | unreachable directly; owner-only, called from wrapper/mutation |
| `public.authz_current_operator_role()` (wrapper) | **REVOKE** | **EXECUTE** | **—** | **REVOKE** | the only REST-callable authz object; authenticated reads own role |
| `authz.set_operator_role(...)` | **REVOKE** | **REVOKE** | **EXECUTE** | **REVOKE** | server-verified mutation path only (E-Q14) |

*`service_role` on the read wrapper is `—` (RC-5): after `REVOKE FROM PUBLIC`, service_role does not inherit EXECUTE and
does not need it — the read is always on the cookie-bound client; under the service client `auth.uid()` is NULL → deny.*

**Every `REVOKE` names `PUBLIC`, `anon`, AND `authenticated`** in the same migration as the `CREATE` (A2-INV-6). An
end-of-migration **fail-closed ACL assertion** verifies the resulting ACLs on **all three functions + both tables +
schema USAGE** are exactly as tabled (aborts otherwise).

---

## 6. Dashboard enforcement points (representative — INV-9-sufficient, not a retrofit)

| # | Path | Boundary | Change | Role |
|---|---|---|---|---|
| EP-1 | `app/api/drafts/action/route.ts` (POST) | C-2 route | **Upgrade** existing `getUser()` gate → `requireRole('governance_operator')`, above `req.json()`+`createServiceClient()` | `governance_operator` |
| EP-2 | `actions/onboarding.ts::approveSubmission` (`'use server'`) | C-1 action | `requireRole('governance_operator')` as **first statement**; `inviteUserByEmail` (`:116`, N-7) additionally requires **`administrator`** | `governance_operator` (+admin for invite) |
| EP-3 | role mutation adapter → `authz.set_operator_role` | C-1 + DB | administrator-gated grant/revoke — the model's own write path | `administrator` |

- **Ordering (C.3):** every check precedes both body parse and `createServiceClient()` — asserted via
  `invocationCallOrder` (§11). **UI (C-4):** convenience only, never enforcement.
- **Completeness gate (RC-6/C.4):** a `requireRole()` completeness sweep (build-/test-time) that fails when a
  governance-write export omits the adapter is a **hard build-time gate** — the primary control preventing a future
  unguarded `service_role` path from reaching the mutation fn.
- **Named limitation (C.4a):** the remaining ~69 unguarded server actions/routes + ~18 REST-reachable `SECURITY
  DEFINER` `friction.*` functions (N-9, E-Q12) are **not** covered by Slice 0.5 and must not be presented as covered.
  Slice 0.5 proves the INV-9 *mechanism*; broad containment lands in the follow-on enforcement/governed-write lane.

---

## 7. Bootstrap (first administrator — no permanent bypass) — E.7/E.8; RC-8

1. **Ship inert** — schema/tables/functions/grants/RLS created; EP-1..3 land disabled behind the enforcement switch.
2. **Seed the first `administrator` by governed SQL under a PK gate** — a **single transaction (RC-8)** containing the
   INSERT into `authz.operator_role` (`role='administrator'`, `user_id=<PK's auth.uid()>`, `environment=NULL`,
   `client_id=NULL`) **and** its `authz.operator_role_audit` row (`action='bootstrap'`), so the audit contract is
   unbroken at genesis. PK-run (not the mutation fn — no admin exists yet). **Browser-unreachable; not metadata-trusting.**
3. **Verify** readback through `authz_current_operator_role()` (inert).
4. **Prove the `auth.users` delete path against the actor FK** on a scratch table (E.5.1), inert.
5. **Enable enforcement** behind the E-Q1 kill switch — **only after Batch 2 closeout (E-Q2)**.
6. **Verify each role** behaves as modelled, incl. ≥1 negative case.
- Bootstrap **closes by exhaustion** (one-time seed, not a standing path). **Break-glass recovery** = the same
  governed-SQL-under-PK mechanism, **itself audited** (`action='recovery'`), never depends on an existing admin.
  Last administrator unremovable in the DB (§4 invariant 4).

---

## 8. Rollback artifact

- **Inert stage:** reverse migration, dependency order: `DROP FUNCTION authz.set_operator_role`,
  `DROP FUNCTION public.authz_current_operator_role`, **`DROP FUNCTION authz.current_operator_role`**,
  `DROP TABLE authz.operator_role_audit`, `DROP TABLE authz.operator_role`, `DROP TYPE authz.operator_role_kind`,
  `REVOKE USAGE ON SCHEMA authz FROM service_role`, `DROP SCHEMA authz`, `DROP ROLE authz_owner`. No dashboard behaviour
  changed at this stage. **No orphaned grants/policies/functions/schema/role remain.** Batch 1/2/cc-0049 untouched.
- **Enforced stage:** primary = **Vercel instant-rollback to the pinned pre-enforcement deployment ID** (E-Q1),
  recorded **before** enforcement is enabled; optionally followed by the inert-stage drop.
- **Protection lost on rollback (stated):** returns to *authenticated ⇒ operator-equivalent* — the accepted, explicit
  cost; why the kill switch is a deliberate, audited, visibly-announced PK action (E.6).

---

## 9. Authorized change envelope (exact)

- **CE (base `9718d78`):** one migration — role + schema + enum + 2 tables + **3 functions** (canonical read + public
  wrapper + mutation) + grants + RLS + policies + fail-closed ACL assertion — **+ reverse-migration rollback**.
  Migration name = a **new sequential number + distinct name**, collision-checked against applied migrations at build
  (locked rule; RC/open item).
- **Dashboard (base `6fe8d1e`):** `lib/authz.ts` (`requireRole`, `grantOperatorRole`/`revokeOperatorRole`, `AuthzError`)
  · EP-1/EP-2 edits · a thin admin grant/revoke entry point for EP-3 (no full console) · UI affordance gating
  (convenience) · the `requireRole()` completeness gate · tests + mutation tests · **`middleware.ts` NOT changed** (C-5).
- **Docs:** this packet, result doc, register pointers.

**NOT in envelope:** general permissions framework · per-feature capability matrix · client-entitlement product logic ·
dashboard redesign · role-management console · governed business-write (Slice 1) · scanner cleanup · onboarding
refactor · unrelated RLS/SECDEF fixes · the other ~69 unguarded paths · re-enabling `/create/capability-matrix`.

---

## 10. Security posture requirements (bound into acceptance)

- **Canonical data protection:** no INSERT/UPDATE/DELETE by ordinary `authenticated` users (no schema USAGE, no table
  grant, FORCE RLS); no self-role-assignment; no role via editable Auth metadata; no browser service-role exposure.
- **Fail-closed:** unknown/missing/malformed/revoked/unsupported → deny (E-1/E-3/E-4); unassigned ≠ unauthenticated
  (distinct identities) but neither may act.
- **Role semantics:** `viewer` read-only · `governance_operator` approved governance ops only · `administrator`
  authz-admin + `governance_operator` powers. Administrators do **not** bypass DB policies (no BYPASSRLS, no superuser).
- **Service-role boundary:** possession of the service key is **not** authorization for the requesting user — every
  enforced path proves the operator's role first, then constructs the service client.
- **SECURITY DEFINER hardening:** `search_path=pg_catalog,pg_temp`; owner `authz_owner`; minimal grants;
  schema-qualified references (incl. the elided mutation body, RC-2); `auth.uid()` schema-qualified; no caller-controlled
  object resolution; no privilege broadening; single mutation signature (RC-3) → one ACL to assert.
- **Auditability:** every mutation records affected user, previous+new role, actor (FK + immutable snapshot),
  timestamp, environment/scope, reason/correlation, self-mod flag, outcome. Minimal durable record.

---

## 11. Required proof matrix

**Repository-native tests (vitest) — zero-DB-call spies + distinct named error identity + `invocationCallOrder` +
positive controls (F.4); grep/count coverage forbidden:** identity & lookup (roles resolve · unassigned/unauth/invalid
uid/revoked → deny · env-NULL semantics · request params cannot switch operator) · role enforcement per EP-1..3
(admin/gov_op/viewer/unassigned/unauth/forged-role/forged-uid/hidden-UI/direct-invoke/replay-after-revoke) · role
mutation (admin mutates · gov_op cannot elevate · viewer cannot · no self-elevation-without-flag · authenticated cannot
write the table directly · invalid role rejected · env normalized · records actor+timestamps · repeated/concurrent
deterministic · failed mutation no partial state) · **mutation testing (must FAIL if protection removed):** role check
removed · UI-as-authorization · unassigned-defaults-allowed · request-body role/uid trusted · service-role without
operator check · viewer mutates · gov_op assigns admin · self-elevation · RLS disabled · FORCE removed · owner→BYPASSRLS
· PUBLIC EXECUTE/table grant · SECDEF search_path unsafe · one entry point omits the adapter · revocation not respected
on replay.

**Live / deployment-safe DB proofs:**
- **Pre-apply scratch-table proofs (mandatory):** (1) the `authz_owner`+FORCE+`current_user` policy interaction lets
  the definer functions read/write while direct principals are denied; (2) the E-Q6 `ON DELETE SET NULL` referential
  action **fires and mutates the audit row** under FORCE RLS + non-BYPASSRLS owner (**unresolved — settle on a scratch
  table**; if RI is subject to RLS-as-`authz_owner`, a narrow scoped-UPDATE policy or FK `NO ACTION`+snapshots is the
  build-phase remediation; capture which role deletes `auth.users` and whether it is BYPASSRLS).
- **INV-9 direct-invocation proof (≥1 path):** normal UI call · direct HTTP/server-action POST · direct RPC · forged
  payload · stale/replayed request after revocation — all unauthorized variants fail safely before the mutation.
- **Catalog readback (post-apply):** RLS+FORCE on · owner=`authz_owner` (non-BYPASSRLS) · owner does not bypass the
  policy · anon no access · authenticated only intended (EXECUTE on the public wrapper) · service_role only required
  (USAGE + the one mutation EXECUTE) · no PUBLIC grants · **overload/shadow readback across all three functions** · schema
  USAGE minimal.

---

## 12. Deployment sequence (executes only AFTER the explicit T3 apply gate)

1. Reconfirm origin, hashes, migration base `9718d78`, dashboard base `6fe8d1e`, clean trees.
2. **E-Q11 pre-apply:** re-confirm in the Supabase UI that `authz` is not REST-exposed.
3. Run the pre-apply scratch-table proofs (§11).
4. Apply the reviewed migration (PK-run).
5. Re-read every deployed object (definitions · owner · grants · RLS · FORCE · policies · function ACL · search_path ·
   overload count across all three functions). **Stop on any mismatch.**
6. Seed the first administrator (single-txn, §7 step 2); verify readback.
7. Deploy dashboard changes **inert** (enforcement switch off).
8. Verify production auth health; verify `authz_current_operator_role()` for the seeded identities.
9. **Only after Batch 2 closeout (E-Q2):** record the pre-enforcement Vercel deployment ID, then enable enforcement
   behind the E-Q1 kill switch.
10. Exercise EP-1..3 authorized + unauthorized; prove direct invocation fails closed (INV-9).
11. Prove no read-only dashboard regression (E-7).
12. Prove no regression to Batch 1, Batch 2, onboarding activation, cc-0049.
13. Backfill deployed migration into CE if needed; complete result doc, registers, reviews; clean trees + parity.

---

## 13. Reviewers (T3 full chain)

`db-rls-auditor` · `security-auditor` · **external review pinned to the exact migration + dashboard-diff hashes** ·
`branch-warden` · independent lead re-verification. Reviewers examine the **final** artifact; any change re-triggers
review (`reviewed_input_hash`). **This v2 packet is re-reviewed before PK's Gate-2; the built diff is reviewed again
before the apply gate.**

---

## 14. Open items — status at v2

- **O-1 schema `authz`** — **PK-CONFIRMED.**
- **O-3 representative set EP-1/EP-2/EP-3** — **PK-CONFIRMED.**
- **O-4 [B]-items** (Vercel-rollback kill switch · `ON DELETE SET NULL`+snapshots · zero-arg read) — **PK-approved.**
- **O-5 `client_id` carried without a FK in v1** — **PK-approved.**
- **RC-1 authz-home refinement** — **RESOLVED in v2** (§3.1): canonical `authz.current_operator_role()` + thin `public`
  SECDEF wrapper; no `authenticated` USAGE on `authz`.
- **Folded as build-lane requirements (verified on the built diff / pre-apply):** RC-2 (schema-qualify mutation body) ·
  RC-3 (single NULL-sentinel signature) · RC-4/RC-5 (revoke idiom / explicit grant table) · RC-6 (correlation_id +
  completeness gate) · RC-7 (last-admin predicate) · RC-8 (single-txn bootstrap) · migration naming (new number,
  collision-checked).
- **Not this lane:** D-Q1 (Slice 1 four-vs-five ops), D-Q2/D-Q3 (Slice 1 semantics) — the governed-write/Slice 1 lane.

**Enable-gate preconditions (AMBER, non-waivable — from the v1 review chain, carried to v2):** independently **verify
Batch 2 closure** of both `exec_sql` sinks (load-bearing for the whole trust chain) · both **scratch-table proofs PASS**
· **E-Q11** Supabase-UI exposed-schema reconfirm · pre-enforcement Vercel deployment ID recorded · enable only after
Batch 2 closeout.

---

## R. Review-chain provenance (v1, pinned to `a1bc548f…766428`)

| Reviewer | Verdict | must_fix | Native |
|---|---|---|---|
| db-rls-auditor | `concerns` | 0 | DB-security design sound; SF-1..5 (all folded into v2 or build-lane) |
| security-auditor | `concerns` | 0 | **GREEN-to-build / AMBER-to-enable**; SEC-SF-1/3/4/6/2-5 (folded) |
| branch-warden | `safe` | 0 | correct branch/HEAD/merge-topology; nothing pushed |
| external review | `partial` (med/high) | — | no `concrete_defect`; escalated the authz-home wrapper (policy_decision) + INV-9 (runtime_verification) → PK ruled adopt (RC-1) |

**No stop-condition triggered** (no privilege escalation · owner bypass · BYPASSRLS exposure · unsafe SECDEF · PUBLIC
exposure · request-parameter identity · UI-based authz · bootstrap permanent bypass · INV-9 failure · architectural
contradiction). v2 folds every should_fix; the residuals are the build-lane gates and the AMBER enable-gate
preconditions above.

---

## 15. Acceptance invariants (INV-1…9 + A2-INV-1…8) — where each is satisfied

| Invariant | Satisfied by |
|---|---|
| **INV-1** default deny | §3.2, E-1/E-3; F.4 negatives |
| **INV-2** server-side first-statement | §6 EP-1..3; A2-INV-2; `invocationCallOrder` |
| **INV-3** authenticated cannot self-assign | §2/§3.1 zero-arg read (canonical + wrapper); §4 admin-checked mutation |
| **INV-4** no write via exposed REST tables | §1.1 fenced `authz`; §5 REVOKE PUBLIC+anon+authenticated; **only the public wrapper is REST-reachable** |
| **INV-5** ownership doesn't bypass protection | §1.1 non-BYPASSRLS owner + §5 FORCE + minimal policies |
| **INV-6** mutations auditable | §1.4 actor FK + snapshots; append-only; self-mod flag; correlation_id |
| **INV-7** bootstrap/recovery controlled | §7 governed-SQL under PK (single-txn); last-admin protection in DB |
| **INV-8** service-role doesn't silently bypass operator authz | §3/§4/§6 server/DB boundary; N-9 named limitation (C.4a) |
| **INV-9** ⭐ UI-independent enforceability | §6 C-1/C-2/C-6; §11 direct-invocation + guard-deleted/reordered + replay-after-revoke negatives |
| **A2-INV-1..8** | §3.1 canonical+wrapper (1), §3.2/census0.8 (2), §3.2 (3), §1.1/§3.1/§5 (4), §1.4/§5 (5), §5 (6), §5 (7), §4 (8) |

---

## 16. Stop condition (this packet's own lane)

Return to PK with v2 + the re-run review-chain verdicts, for the **Gate-2 (implementation) decision**. **Then stop.**
No build begins until PK approves Gate-2; no apply/deploy begins until the separate T3 apply gate after the built diff
is re-reviewed. Enforcement stays off until Batch 2 closeout regardless.
