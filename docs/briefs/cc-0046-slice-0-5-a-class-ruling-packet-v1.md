CLAIMED (no register version — non-terminal decision instrument) · cc-0046 Slice 0.5 · [A]-class ruling packet · session S1 Dashboard Authz · 2026-07-24 +1000 Sydney

# PK Ruling Packet — cc-0046 Slice 0.5 `[A]`-class decisions

**Status:** DRAFT — uncommitted, awaiting PK. The orchestrator session owns committing this and any register pointer.
**Governs:** `docs/briefs/cc-0046-slice-0-5-dashboard-governance-authorization-model-brief-v1.md` (sha256 `cf1e19f9…`, PK-APPROVED, register v6.10).
**Lane class / tier:** SAFETY_GATE · **T1** (decision instrument only — no code, no DDL, no grant, no deploy).

> ## What this is
>
> The Slice 0.5 brief poses **23 classed decisions**. **Nine are `[A]` — they block role source A2 and therefore
> block the whole model.** This packet is the decision instrument for those nine (plus `E-Q9`, which is classed
> `[B]` but is one fork with `[A]`-class `E-Q14` and cannot be taken separately).
>
> **It does not re-explain the brief.** Each block is: the question · the options · the consequence that actually
> decides it · a recommendation · what happens if PK rules the other way.
>
> **It authorizes nothing.** Answering these unblocks *designing and building* Slice 0.5. It does **not** authorize
> implementation, and per **E-Q2** it does **not** authorize switching enforcement on.

---

## 0. What changed since the brief was approved

Five facts re-derived from the live catalog in this lane (read-only, via `scripts/db-read.py`). **Three of them
change a recommendation**; two confirm the brief exactly.

| # | Finding | Effect |
|---|---|---|
| **P-1** | **Schema `authz` does not exist.** Non-system schemas are: `a · audit · auth · c · cron · extensions · f · friction · graphql · graphql_public · ice_ro · k · m · net · op · public · r · realtime · storage · supabase_migrations · t · vault` | E-Q10's "new `authz`" is a **create**, not a reuse. Costs one `CREATE SCHEMA` |
| **P-2** | **The `audit` schema is not an audit-log schema.** It holds **four `postgres`-owned reporting VIEWS** — `v_brand_platform_audit_matrix`, `v_publish_queue_summary`, `v_publish_success_recent`, `v_slot_health_by_client_platform` — and **zero tables**. `anon`/`authenticated`/**`service_role` all hold NO USAGE** on it | **Changes the E-Q10 recommendation.** Reusing `audit` means granting `service_role` USAGE into a schema that currently fences it out completely, and conflating authorization state with operational reporting views. **Recommend a fresh `authz` instead** |
| **P-3** | **REST exposure is not load-bearing for the tables.** PostgREST executes as `anon`/`authenticated`; both fail the **schema USAGE** check before exposure is ever consulted. Verified USAGE: `public` T/T · `c` T/T · `f` T/T · `r` T/F · `friction` F/T · `m` F/F · `k` F/F · `op` F/F · `t` F/F · `audit` F/F · `ice_ro` F/F | **Downgrades E-Q3 out of `[A]`.** A USAGE-fenced schema is safe regardless of the exposed-schema list. E-Q3's residual value collapses into E-Q11's pre-apply check |
| **P-4** | `public` table default-ACL is **`anon=arwdDxtm, authenticated=arwdDxtm`** (two rows, `postgres`- and `supabase_admin`-granted) | **Confirms brief F.2 exactly.** A role table in `public` is born self-promotable. Decisive against `public` |
| **P-5** | `c` table default-ACL is **`{service_role=r, inspector_ro=r}`** — SELECT-only, not born-open | **Minor correction to the brief's F.2.1 wording** (which implies a new `c` table is fenced only by absent grants). Conclusion is unchanged — `c` is still REST-exposed with `anon`/`authenticated` USAGE, so it remains the wrong home |

*Also re-confirmed unchanged at CE HEAD: `public.exec_sql(text)` — SECURITY DEFINER, owner `postgres`, `provolatile=v`, `SET search_path TO 'public'`, ACL `{postgres=X, service_role=X}`; body `EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query || ') t'`. `rolbypassrls`: `postgres` TRUE · `service_role` TRUE · `anon` FALSE · `authenticated` FALSE.*

**Named substitution (CCF-02 R1):** `auth.uid()`'s body could **not** be re-read in this lane — `ice_readonly` holds
no USAGE on schema `auth` (42501). The A2-INV-2 claim (it resolves `current_setting('request.jwt.claims')`, so it is
NULL under the service-role client and settable via `set_config`) is carried **on the brief's 2026-07-22
`db-rls-auditor` read**, not independently re-verified here.

---

## 1. The nine `[A]` decisions

### A-Q0 · Role source: A1 / A2 / A3 — **the root decision**

| | |
|---|---|
| **Options** | **A1** Supabase Auth `app_metadata` · **A2** governed CE table + zero-arg SECURITY DEFINER read keyed on `auth.uid()` · **A3** hybrid |
| **What decides it** | **Audit feasibility.** A2 is the only option that yields an FK to `auth.users.id`. ICE has *never* had a real actor identity (onboarding approvals hardcode `p_operator_email:'pk@invegent.com'`; `draft_approve_and_enqueue` hardcodes `approved_by='manual'`; zero FKs from any non-`auth` schema to `auth.users`). Under A1, E-5 audit logging is **not buildable** |
| **RECOMMEND** | **A2**, bound to invariants A2-INV-1…8 as part of the acceptance |
| **If PK rules A1** | Defensible and genuinely cheaper — no migration, no new `authenticated`-reachable DB object. **But E-5 must then be explicitly dropped or separately funded**, and the revocation lag (a JWT-baked claim survives to token expiry) must be written down and accepted. Do not accept A1 while still claiming E-5 |
| **A3** | **Not recommended.** Doubles the failure surface for a latency problem this dashboard does not have, and its cache-hit / truth-unreadable case fails **open** |

### A-Q1 · Environment separation of role state

| | |
|---|---|
| **Situation** | One Supabase project serves production **and** preview. Under A2 a role granted for preview testing is simultaneously live in production |
| **What decides it** | **The declared-control-not-consulted failure mode.** Adding an `environment` column that no code path reads creates a field that will be *recorded and scored as protection while enforcing nothing* — a named ICE failure mode |
| **RECOMMEND** | **Do not add an environment column in v1.** Instead record as an accepted, stated limitation: *preview deployments carry production authorization.* Unlike per-client scope (B-Q1), environment is not structural to any Slice 1 operation signature, so there is no schema-shape cost to deferring it |
| **If PK wants it now** | Add it **with a CHECK constraint pinning it to the single supported value**, so the column cannot silently hold an unenforced value. Never add it nullable-and-unread |

### B-Q0 · Is the three-role set right?

| | |
|---|---|
| **Proposed** | `viewer` · `governance_operator` · `administrator` |
| **What decides it** | **N-7 forces the third role.** `inviteUserByEmail` sits inside `approveSubmission`, a `'use server'` export with no identity check. If minting new authenticated users is a *governance* power, the role model is circumventable by its own operators — a `governance_operator` could invite an account and the population grows without administrator involvement |
| **RECOMMEND** | **Accept the three.** Deliberately excluded: permission matrices, custom roles, inheritance, groups, delegated administration, time-boxed grants. Four accounts do not justify enterprise RBAC |
| **If PK collapses to two** | Then `inviteUserByEmail` must be gated on something *other* than role — and nothing else is available. Two roles is not a viable simplification here |

### B-Q1 · Per-client scoping — model now, or defer entirely?

| | |
|---|---|
| **Situation** | Every Slice 1 operation is client-scoped by signature. Onboarding-invited client users are live members of the same `auth.users` (F-2) |
| **RECOMMEND** | **Carry a nullable `client_id` scope column from day one, enforce global-only in v1 — but add a CHECK pinning it to NULL while unenforced.** Dropping the CHECK is the v2 enable step |
| **Why the CHECK matters** | This is the same trap as A-Q1. A nullable scope column that nothing reads is a control that *appears* in the schema, will be cited in review, and enforces nothing. The CHECK makes the unenforced state **structurally honest**: the column cannot hold a scope value until enforcement lands |
| **Related, accepted now** | **C.5** — v1 authorizes *writes*, not *reads*. Server components load via the service client, so a global-read `viewer` sees every client's data. Accept explicitly so the first scoping change does not inherit an unstated gap |

### E-Q3 · Which schemas does PostgREST expose? — **RECOMMEND RECLASSIFY OUT OF `[A]`**

| | |
|---|---|
| **Why it was `[A]`** | It was thought to decide whether a role table is anon-reachable and how severe C-6 is |
| **What changed (P-3)** | PostgREST executes as `anon`/`authenticated`. **Both fail the schema USAGE check before exposure is consulted.** If the role and audit tables live in a USAGE-fenced schema (A2-INV-4), the exposed-schema list **cannot** make them reachable. The one object that *must* live in exposed `public` is the read function — and `public`'s exposure is not in doubt |
| **RECOMMEND** | **Reclassify E-Q3 from `[A]` to a pre-apply verification, merged into E-Q11.** It no longer blocks approving A2 |
| **Caveat — do not over-read** | This holds for the **direct-REST** path only. It says nothing about the `exec_sql` path, which runs as `postgres` and reaches every schema regardless of fencing. See §3 |

### E-Q10 · Which schema hosts the role + audit tables?

| | |
|---|---|
| **Options** | `public` · `c` · reuse `audit` · **create `authz`** |
| **Ruled out** | **`public`** — born `arwdDxtm` to `anon` and `authenticated` (P-4): a direct self-promotion-to-administrator primitive. **`c`** — REST-exposed, `anon`/`authenticated` hold USAGE, and it has **no function default-ACL row**, so a function created there falls back to PostgreSQL's built-in `EXECUTE TO PUBLIC` (harder to notice than `public`'s explicit grant). **Never `r`** |
| **RECOMMEND** | **Create a new `authz` schema** (P-1: it does not exist). **Do not reuse `audit`** — P-2 shows `audit` is not an audit-log schema at all but four operational reporting views, and `service_role` currently holds **no USAGE** on it. A2-INV-5/INV-8 require `service_role` USAGE on the hosting schema, so reusing `audit` means *widening a currently fully-fenced schema* and conflating two unrelated concerns |
| **Carries either way** | A fresh `authz` has **no default-ACL rows**, so functions created there inherit built-in `EXECUTE TO PUBLIC`. **A2-INV-6 is mandatory: `REVOKE` must name `PUBLIC` *and* `anon` *and* `authenticated`, in the same migration as the `CREATE`** |

### E-Q11 · Re-confirm the exposed-schema list before apply — **RECOMMEND RECLASSIFY TO A GATE**

| | |
|---|---|
| **Why it cannot be `[A]`** | The exposed-schema list is **Supabase platform config, not catalog state** — unreadable from `pg_catalog`, mutable from the UI, and it has changed at least once. It is not settleable *now* by anyone, so classing it `[A]` deadlocks the gate |
| **RECOMMEND** | **Reclassify to a named pre-apply STOP in the implementation lane**, absorbing E-Q3: PK confirms the list in the Supabase UI immediately before apply; a surprise entry is a STOP, not a note |

### E-Q13 · Should the role + audit tables be owned by a dedicated NON-`BYPASSRLS` role?

| | |
|---|---|
| **The appeal** | `FORCE ROW LEVEL SECURITY` (A2-INV-7) removes the **table-owner** bypass — but **not** the `BYPASSRLS` bypass. Under `postgres` ownership, `FORCE` is **inert** against the definer path. A non-`BYPASSRLS` owner is the only configuration where it constrains anything |
| **What decides it** | **It does not constrain the adversary this model names.** The threat is a principal holding `exec_sql` → `postgres`. That principal owns the schema and can `ALTER TABLE`, drop policies, or change ownership outright. Non-`BYPASSRLS` ownership buys nothing against it |
| **The cost is real** | With a non-`BYPASSRLS` owner **and** `FORCE`, **three** write paths become RLS-subject — the A2-INV-5 audit-insert function, the A2-INV-8 role-mutation function, and the E-Q6 referential action. The house pattern (**RLS + zero policies = deny-by-default**) would **deny all three**. It converts a zero-policy table into one needing a deliberate, minimal, correct policy set — new surface, each policy a place to be wrong |
| **RECOMMEND** | **NO.** Keep `postgres` ownership. Keep `ENABLE` + `FORCE` RLS with **zero policies** as documented deny-by-default, and **record in the migration comment that `FORCE` is inert against `postgres`/`service_role` and is defence-in-depth only** — so a later reader does not mistake it for the boundary |
| **The real boundary** | Schema USAGE-fencing + explicit `REVOKE` (A2-INV-4, A2-INV-6). That is complete against `anon`/`authenticated` (both `rolbypassrls=FALSE`) |
| **If PK rules YES** | Then E.7 step 4's proof becomes **mandatory and unresolved**: whether PostgreSQL's documented RLS bypass for referential *checks* extends to referential *actions* is not settled in either direction and must be proven on a scratch table **before** any production DDL |

### E-Q14 · Caller shape for the role-**MUTATION** function — *and* E-Q9 · shape for the role-**READ** function

**These are one fork and must be taken together.** The brief warns *"pick exactly one; do not build both"* — that
warning is about building **two shapes for the same operation**, not about reads and writes differing.

| | Shape A — zero-arg, cookie-bound client, granted `authenticated` | Shape B — `service_role`-only, takes the uid, server calls `getUser()` first |
|---|---|---|
| Identity | **Structurally unforgeable** — derives from `auth.uid()` on a verified JWT | **A parameter.** Trustworthy only if the server genuinely resolves it via `getUser()` |
| C-6 exposure | Adds an `authenticated`-reachable object | **Adds none** |
| Failure mode | — | `auth.uid()` is NULL inside it; any future `service_role` path can pass any uid |

| | |
|---|---|
| **RECOMMEND E-Q9 (read)** | **Shape A.** Zero-arg means a caller can learn **only their own** role — there is no cross-user disclosure and no impersonation primitive. C-6 exposure is minimal and the identity is unforgeable |
| **RECOMMEND E-Q14 (write)** | **Shape B.** Shape A here means granting `authenticated` EXECUTE on **the role table's own write path** — strictly worse than the read exposure C-6 already flags. **Mitigate the parameter foot-gun:** the function takes the verified actor uid *and* the target, and **re-validates the actor's `administrator` status inside the function** against the role table, so a wrong or forged actor id **fails closed** rather than escalating |
| **⚠ Consequence PK must accept with this** | Reads and writes then use **different identity paths**, so **A2-INV-2 must be restated, not silently voided**: *"the role **read** is issued on the cookie-bound user client, never the service client; the role **mutation** is issued on the service client with a uid the server has verified via `getUser()`, never a uid taken from request input."* The E.5 trust-boundary corollary binds the second clause |
| **If PK picks a single shape for both** | **Shape B for both** is coherent (no new `authenticated` object at all) but makes every role read depend on a correctly-wired `getUser()` call. **Shape A for both is not acceptable** — it grants `authenticated` EXECUTE on a role-mutation function |

---

## 2. Order of decision — three of the nine collapse

```
A-Q0 (A1/A2/A3)  ──►  if A1: E-Q10/E-Q13/E-Q14/E-Q9 all VOID (no table exists)
      │                  and E-5 audit logging must be explicitly dropped
      └─ if A2 ─► E-Q10 (schema home)  ─► E-Q13 (ownership)
                  E-Q9 + E-Q14 (caller shapes, taken as ONE fork)
                  B-Q0 (role set) ─► B-Q1 (scope column) ─► A-Q1 (env column)

RECLASSIFY OUT OF [A]:  E-Q3 → merged into E-Q11 → pre-apply STOP gate
```

**So PK is being asked for six rulings, not nine:** `A-Q0` · `A-Q1` · `B-Q0` · `B-Q1` · `E-Q10` · `E-Q13` ·
plus the single coupled `E-Q9/E-Q14` fork. `E-Q3` and `E-Q11` become one pre-apply gate.

## 3. What answering these does — and does not — unblock

**Does unblock:** *designing and building* Slice 0.5 — the migration, the read function, the guards.

**Does NOT unblock:**

1. **Switching enforcement on.** That is **E-Q2** — see the companion containment-boundary document.
   **A2-INV-4's USAGE fence does not protect the role table from the `exec_sql` path**, because `exec_sql` runs as
   `postgres`, which owns every non-`auth` schema. Fencing stops `anon`/`authenticated` over REST (C-6); it stops
   nothing that reaches `postgres`.
   **⚠ And E-Q2's precondition is not met by Batch 2 alone.** A read-only census in this lane found **six further
   caller-controllable, unvalidated `exec_sql` sites besides the two Batch 2 sinks — three of them reachable by a
   GET request with a query string.** Batch 2 closes two of eight. **The `[A]` decisions below are unaffected and can
   be ruled on now**; the enforcement-enable gate is what moves. See boundary doc §3.2 for the three sequencing
   options, which are PK's to choose.
2. **Slice 1.** Per **D-Q4**, Slice 0.5 does **not** unblock Slice 1: three of the four operations have **no governed
   write RPC at all**, and the fourth has only its proof-recording half. A CE-side governed-write lane is also
   required, or Slice 1 must be re-scoped.
3. **The out-of-app REST surface.** ~18 SECURITY DEFINER functions are directly invocable by any `authenticated`
   principal (~12 of them `friction.*` **writes** — confirmed here: `friction` grants `authenticated` USAGE and
   `anon` none). **No dashboard-side role model governs those paths.** Separate `security-auditor` lane (E-Q12).
4. **Anything in the `[B]`/`[C]`/`[D]` classes** — E-Q1 (kill switch), E-Q6 (actor FK `ON DELETE`), D-Q1 (four or
   five operations), G-1 (the arc brief is not on `main`). Unchanged and still open.

## 4. Non-claims

This packet implements nothing and approves nothing. It makes **no claim that any exploitation has occurred** — no
logs or forensics were reviewed, and per F.5 Vercel runtime traffic evidence is structurally unavailable on this
plan. The recommendations are recommendations; every `[A]` decision remains PK's. `auth.uid()`'s body was **not**
independently re-verified in this lane (named substitution, §0). The exposed-schema list is **not** verified here
and is deliberately routed to a pre-apply gate rather than asserted.
