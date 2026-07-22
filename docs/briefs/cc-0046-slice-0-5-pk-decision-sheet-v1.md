# PK Decision Sheet — cc-0046 Slice 0.5: Dashboard Governance Authorization Model

**Created:** 2026-07-22 Sydney · **Lane class/tier:** SAFETY_GATE · T1 (docs/architecture only — authorizes NO implementation)
**Source brief (PK-APPROVED Gate 1, v6.10):** `docs/briefs/cc-0046-slice-0-5-dashboard-governance-authorization-model-brief-v1.md` (sha256 `cf1e19f9…`)
**Evidence base re-verified against canonical:** CE `origin/main` `194e43e` · dashboard `origin/main` `1572fbd` (= the brief's evidence SHA — no drift). **All 7 [A]-blocker DB fact-sets re-derived LIVE from the catalog this lane (project `mbkmaxqhsohbtwsqolns`, orchestrator `execute_sql`), zero material contradictions** — appendix §B; the two open `exec_sql` sinks re-confirmed open in-file.
**Appendix:** `docs/briefs/cc-0046-slice-0-5-pk-decision-sheet-appendix-v1.md`

> **What PK is being asked to do.** Rule the **8 architecture blockers** below (the only decisions that gate the
> authorization *architecture*). Everything else is already settled, safely deferrable to the implementation lane,
> or a handoff. **Approving this sheet approves an architecture, not an implementation** — Slice 0.5 stays
> unbuilt and unswitched-on until (a) a *separate* implementation authorization and (b) Batch 2 closes both open
> `exec_sql` sinks (§Sequencing E-Q2). One blanket "approve" is the wrong response — rule the A-items individually.

---

## 1. Classification of all 23 decisions (one line each)

| ID | Class | Decision | Recommended ruling |
|---|---|---|---|
| **A-Q0** | **A — architecture blocker** | Role source: A1 / **A2** / A3 | **A2** — governed CE table, on audit-feasibility first |
| **A-Q1** | **A — architecture blocker** | Environment separation of role state | Carry a nullable `environment` column (free under A2, impossible under A1) |
| **B-Q0** | **A — architecture blocker** | Is the 3-role set right? | **Recommended (not settled)** — `viewer` / `governance_operator` / `administrator` |
| **B-Q1** | **A — architecture blocker** | Per-client scoping | **Model now** (nullable `client_id`, NULL=global), **enforce global-only in v1** |
| **E-Q3** | **A — architecture blocker** (evidence-settled) | Which schemas does PostgREST expose? | `public` **and** `c` are exposed → neither may host role/audit tables. Reconfirm via E-Q11 |
| **E-Q10** | **A — architecture blocker** | Which schema hosts role + audit tables? | A **non-exposed, USAGE-fenced** schema (`audit` or new `authz`). **Not `public`, not `c`** |
| **E-Q13** | **A — architecture blocker** | Owner: dedicated non-`BYPASSRLS` role vs `postgres`? | **Dedicated non-`BYPASSRLS` owner + `FORCE` RLS + a minimal policy set** (see failure-mode note) |
| **E-Q14** | **A — architecture blocker** | Caller shape for the role-MUTATION function | **Server verifies `getUser()` → passes verified uid → `service_role`-only fn** (A2-INV-8 unbuildable until ruled) |
| **E-Q2** | **C — sequencing (rule now)** | Ordering vs Batch 2 | **Close both `exec_sql` sinks before enforcement is switched on.** May design/build in parallel |
| **D-Q4** | **C — sequencing (rule now)** | Sequence CE governed-write lane, or re-scope Slice 1 | **Slice 0.5 alone does NOT unblock Slice 1** — a separate CE-side write-RPC lane is required |
| **G-1** | **C — sequencing (rule now)** | Merge arc brief `9e6bccf` to main, or supersede | Take at this gate — D.1/D.3/D.5 cite an unmerged commit |
| **E-Q11** | **Requires new evidence** *(brief classed [A]; re-bucketed here — see note)* | Re-confirm exposed-schema list in Supabase UI | **Immediately before any apply** — platform config, mutable, has changed once |
| **E-Q4** | **Requires new evidence** | Is a Next 14.2.35 server action invocable from an *arbitrary* route? | Untested. If yes, the two public middleware carve-outs become an anonymous entry point |
| **E-Q8** | **Requires new evidence** | `verify_jwt` posture of `onboarding-notifier` (called with no auth header) | Either anonymously callable, or these emails silently fail. Handoff |
| **E-Q1** | **B — implementation detail** | Kill-switch substrate | **Vercel instant-rollback to a pinned pre-enforcement deployment ID** (recorded before enforcement) |
| **E-Q6** | **B — implementation detail** | `ON DELETE` for the actor FK | **`SET NULL` + immutable snapshot columns**; carries a PII-retention tension |
| **E-Q9** | **B — implementation detail** | Read-function shape | **Zero-arg on the cookie-bound client** (A2-INV-1). Build one shape, not both |
| **D-Q2** | **B — implementation detail** | Does S1-c (shared-pool promote) require `administrator`? | Settle in Slice 1 lane (cross-client blast radius) |
| **D-Q3** | **B — implementation detail** | Is in-UI approval a two-person rule? | Settle in Slice 1 lane |
| **B-Q2** | **C — safe to defer** | Expected client-user population | Irrelevant to v1 — the binding constraint (`viewer` is the default role) is already fixed |
| **E-Q5** | **C — safe to defer** | Refresh-token revocation on role removal? | Recommend yes eventually (E-8); not an architecture blocker |
| **E-Q7** | **D — handoff** | Name `cron.job` as a boundary or exclusion? | Excluded for *this* adversary (no schema USAGE); belongs to P-1 as post-compromise persistence |
| **E-Q12** | **D — handoff** (`security-auditor`) | Out-of-app REST surface (N-9) | Pre-existing; **not a blocker**; must NOT be silently folded into Slice 0.5 |
| **D-Q1** | **C — safe to defer** | Slice 1 = four ops or five? (arc brief self-contradicts) | Not inferred — PK states before the Slice 1 map is treated complete |

*(23 substantive decisions. The seed named 21; review split two forks out — E-Q13 and E-Q14 — during the
security-auditor passes. G-2 and G-3 below are register housekeeping, not decisions on this architecture.)*

> **Note on the [A] set (transparency).** The brief carried **nine** [A]-items; this sheet's detailed blocker table
> (§2) lists **eight** because **E-Q11 is deliberately re-bucketed to "Requires new evidence."** Its force is fully
> preserved — it cannot be "settled now" (it is mutable platform config), so it is a **non-negotiable pre-apply
> re-check** (§2 evidence rider, §8), not an omission. No other [A]-item is dropped.

---

## 2. The architecture blockers — full detail (rule each individually)

| Decision ID | Decision | Recommended ruling | Why | Failure mode if wrong | Dependencies |
|---|---|---|---|---|---|
| **A-Q0** | Where does role truth live: A1 (`app_metadata`) / A2 (governed CE table) / A3 (hybrid)? | **A2**, role read through a zero-arg `SECURITY DEFINER` fn keyed on `auth.uid()`, granted `authenticated`, **never via `exec_sql`** — and **only with all 8 A2-INV bound in** | A2 is the **only** option that produces an FK to `auth.users.id` → the sole substrate for the audit contract (E-5); ICE has never had a real actor identity (N-5). Also: per-request revocation immediacy; role data stays out of the client JWT and out of `exec_sql` | **A1 chosen without accepting its cost** → no durable actor identity is ever possible; a revoked/compromised session keeps its role until token expiry. **A3 chosen** → the cache-hit/truth-unreadable path fails *open* — a stale grant survives the exact outage the design exists for | Requires **A-Q1, B-Q0, B-Q1, E-Q3, E-Q10, E-Q13, E-Q14** ruled at the same gate; A2-INV-1…8 are part of acceptance |
| **A-Q1** | Environment separation — one Supabase project serves prod + preview | **Carry a nullable `environment` column** in the role table from day one (cheap under A2; **not expressible under A1**) | Preview and production share one auth project, so without a column a preview grant is a production grant. Adding it later is a migration on a live security table | Omitted → a role granted for preview silently authorizes production; retrofitting means a security-table migration under load | Collapses into A2 acceptance (A-Q0) |
| **B-Q0** | Is the minimal role set `viewer` / `governance_operator` / `administrator` correct — 3 not 2? | **Yes, three.** Permissions **separately enumerated per role, default-deny**; `administrator` does inherit `governance_operator`'s powers **plus** grant/revoke + invite; **`viewer` is the default for every account, incl. all invitees** | 2 roles fail because membership-granting (`inviteUserByEmail`, N-7) must **not** be a governance power — else any operator mints operators and the model is self-circumventable. No evidence justifies 4+ (4 accounts; no RBAC matrices/inheritance/groups) | Collapsing invite into `governance_operator` → the role model is bypassable by design (N-7). Defaulting an invitee to `governance_operator` → a client user (F-2) is born operator-equivalent | N-7, F-2; grantor column in role table |
| **B-Q1** | Global vs per-client role scope | **Model now, enforce later:** nullable `client_id` scope column (NULL = global) in the schema from day one; enforce **global-only** in v1 | Every Slice 1 op is client-scoped by signature and client users may become auth members (F-2), so per-client scoping is *probably* required — but adding the column later is a migration on a security table; leaving it unused now costs nothing | Not modelled now → the first per-client requirement forces a security-table migration mid-flight, and E-4 "degrade to read-only" would then leak *every* client's data during an outage (C.5) | Schema-shape call; same gate as A-Q0 |
| **E-Q3** | Which schemas does PostgREST expose? (decides whether a `public`/`c` role table is anon-reachable) | **`public` AND `c` are both exposed**, and `anon`/`authenticated` hold USAGE on both → **neither may host the role/audit tables.** Evidence-settled (F.2.1), reconfirm at apply (E-Q11) | The whole placement decision (E-Q10) turns on this. A role table in an exposed schema with the born-open `public` table ACL is a **direct self-promotion-to-administrator primitive** reachable with the public anon key alone | Believing `c` (or `r`) is unexposed → a role table lands in a REST-reachable schema and the authorization model is bypassed at C-6 before it is ever enforced at C-1/C-2 | **E-Q10, E-Q11**; live catalog re-confirmation this lane (appendix §B) |
| **E-Q10** | Which schema hosts the role + audit tables? | A **non-exposed, USAGE-fenced** schema — the existing owner-only `audit`, or a new `authz`. **Only the read function** lives in `public`. **Not `public`, not `c`, never `r`** | `public` mints new tables `arwdDxtm` to anon+authenticated with RLS off, in an exposed schema (F.2); `c` is exposed with USAGE held and **no function default-ACL row** (new fns fall back to EXECUTE TO PUBLIC) | Placed in `public`/`c` → the trap that has already fired ~90× in this DB fires again, on the one table whose compromise *is* privilege escalation | **E-Q3, E-Q11, E-Q13**; A2-INV-4/6/7 |
| **E-Q13** | Owner of role + audit tables: dedicated non-`BYPASSRLS` role, or `postgres`? | **Dedicated non-`BYPASSRLS`, non-login owner + `ENABLE`+`FORCE` RLS + a deliberate minimal policy set** | `postgres` and `service_role` both have `rolbypassrls=TRUE`, so under `postgres` ownership `FORCE` RLS is **inert** against the definer path — A2-INV-7 buys nothing. A non-`BYPASSRLS` owner is the *only* config in which `FORCE` constrains anything | **Not free hardening:** with a non-`BYPASSRLS` owner + `FORCE`, **three** write paths run subject to RLS (audit-insert fn, role-mutation fn, the E-Q6 referential action) → the "RLS + zero policies = deny-all" house pattern would **deny all three**. So E-Q13 converts a zero-policy table into one needing an explicit minimal policy set — rule it *with* E-Q10, not after | **E-Q10**; A2-INV-5/7/8, E-Q6, E-Q14 |
| **E-Q14** | Caller shape for the role-MUTATION function (A2-INV-8) | **Server verifies via `getUser()`, passes the *verified* uid to a `service_role`-only mutation fn** (E-Q9's shape B applied to writes) | Both alternatives fail: `service_role`-invoked → `auth.uid()` is NULL inside, so it can check nothing or must trust a caller-supplied actor id (forbidden, E.5); cookie-bound → `authenticated` needs EXECUTE on a *mutation* fn (strictly worse C-6 exposure) | Left unruled → **A2-INV-8 is not buildable**, so "only `administrator` may grant roles" is enforced app-side only — and every dashboard path runs as `service_role`, so any future unguarded action (the 34-module failure mode) can rewrite roles | **A2-INV-8**; higher-stakes twin of E-Q9 (this is the role table's own write path) |

**Evidence rider (E-Q11 — Requires new evidence, non-negotiable):** the PostgREST exposed-schema list is *platform
config, not catalog state* — it is not readable from `pg_catalog`, is mutable from the Supabase UI, and has changed
at least once. The implementation brief **must** require a fresh Supabase UI/config verification of the exposed-schema
list **immediately before any apply**. A stale exposure assumption silently invalidates E-Q3/E-Q10.

---

## 3. Sequencing rulings (C-class — PK should rule now; they gate *when* things switch on)

- **E-Q2 — Batch 2 is an integrity precondition, not a parallel niceness.** While the two `exec_sql` sinks are open
  (**both re-confirmed open at `1572fbd` this lane** — `run-scans/route.ts` has no identity check; `onboarding-scans.ts:75`),
  the named adversary retains arbitrary SQL as `postgres`, and can therefore (a) write their own `administrator` row
  and (b) spoof `auth.uid()` via `set_config`. **Ruling: Slice 0.5 may be designed and built in parallel, but must not
  be *enabled* until both sinks are closed.** Enabling first is authorization theatre.
- **D-Q4 — Slice 0.5 is necessary but NOT sufficient to unblock Slice 1.** S1-a/-b/-c have **no** governed write RPC and
  S1-d has only its proof-recording half (N-8). The only alternatives are a new CE-side write-RPC lane (arc brief puts
  this out of scope) or dashboard-side interpolated `exec_sql` (reintroduces the exact defect Batch 1/2 are containing —
  **must not be adopted**). **Ruling needed: sequence the CE governed-write lane, or re-scope Slice 1.** See §Slice-1 note.
- **G-1 — the arc brief that defines Slice 0.5 and Slice 1 is not on main.** It exists only on unmerged `9e6bccf`;
  every Slice-1 scope statement is cited to it. **Ruling: merge it to main or explicitly supersede it with the brief.**

---

## 4. Priority-decision resolutions (task §Priority 1–8, compact)

1. **Role source →** A2 (§A-Q0). The recommendation to test *held* under adversarial review: governed CE table, keyed
   `auth.uid()`, zero-arg `SECURITY DEFINER`, `authenticated`-only, server-side enforcement at every protected boundary.
2. **Role model →** all three roles necessary (B-Q0); permissions **separately enumerated**, not additive across a
   hierarchy; **default = `viewer`**; **no role row = deny** (E-1/E-3); disabled/deleted/stale = deny; `administrator`
   **does** inherit `governance_operator` powers plus grant/invite. **Default-deny throughout.**
3. **Schema placement →** non-exposed USAGE-fenced schema (`audit` or new `authz`) — **E-Q3/E-Q10 settled by evidence,
   E-Q11 reconfirm at apply.** The stale "schema `r` is unexposed" claim is **corrected** (G-2) and must not be reused.
4. **Ownership & FORCE RLS →** dedicated non-login, non-`BYPASSRLS` owner; narrowly-owned authz objects; `FORCE` RLS +
   minimal policy set (E-Q13). Table-owner and `BYPASSRLS` bypass is explicitly accounted for (C.1).
5. **Role-mutation authority →** contract only (no SQL): no direct client table writes; narrow `SECURITY DEFINER`
   mutation fn; server-side administrator verification (E-Q14 shape); fixed role enum; controlled `search_path`
   (`pg_catalog, public, pg_temp`, `auth.uid()` schema-qualified — F.3); explicit EXECUTE grants; immutable audit event;
   last-administrator protection; bootstrap+recovery (below).
6. **Administrator bootstrap & recovery →** first admin seeded by **governed SQL under a PK gate** (cannot be a UI action —
   no admin exists yet; any UI-only grant path is unbootstrappable, E.7 step 2). Bootstrap closes by being a one-time
   seeded assignment, not a standing grant path. Break-glass recovery = the same governed-SQL-under-PK mechanism, and
   **is itself audited**. Last `administrator` cannot be removed/self-demoted — **enforced in the DB, not the UI** (E.8).
   If all admin access is lost → out-of-band governed SQL under PK gate re-seeds (the recovery path never depends on an
   existing admin).
7. **Enforcement boundaries →** six, matrix in appendix §D. Server-side at the **privileged server boundary**: C-1 server
   actions (mandatory, first statement, above `createServiceClient()`), C-2 route handlers (mandatory), C-3 DB
   defence-in-depth (RLS ineffective on this path — **not** primary — for **two independent reasons**, both of which
   must be stated together so a future "fix" doesn't drop `SECURITY DEFINER` and wrongly conclude RLS now applies:
   `service_role` itself has `rolbypassrls=TRUE` **and** the definer functions execute as `postgres`, which also has it —
   brief C.1), C-4 UI hiding (**convenience
   only, never enforcement**), C-5 middleware (auth only, unchanged), **C-6 direct PostgREST (grants+RLS are the SOLE
   boundary — the one C-1…C-5 cannot cover).** Existing service-role/`SECURITY DEFINER` paths **can** bypass a UI/route
   check — that is exactly why enforcement must sit at the server/DB boundary, and why N-9's ~18 REST-reachable functions
   are a named out-of-scope limitation (C.4a), not silent coverage.
8. **Audit model →** minimum contract: actor `auth.users.id` (**FK, not free text**) + immutable `actor_uid_snapshot` +
   `actor_email_snapshot`; target identity; old role; new role; action; reason; timestamp; correlation id where
   available; **append-only w.r.t. the application principal** (A2-INV-5: REVOKE UPDATE/DELETE from `service_role`,
   writes via INSERT-only `SECURITY DEFINER` fn in the fenced schema); permitted readers = `administrator` only;
   retention survives account deletion (E-Q6 `SET NULL` + snapshot). **Authorization-decision logging is separated from
   application activity logging** — `m.system_audit_log` is a health-check run log, not an actor log (N-4), and must not
   be conflated with the authz audit table.

---

## 5. Required invariants — mapped to the eight architectural statements

Every recommendation maps to the eight Slice 0.5 invariants (A2-INV-1…8, appendix §C). Restated as objectively
testable architectural statements:

| # | Testable invariant | Enforced by |
|---|---|---|
| 1 | **Default deny** — absence of an affirmative grant is a denial; no fallback role on any error path | E-1/E-3; F.4 negative tests |
| 2 | **Server-side enforcement** — every governed write re-resolves the session server-side as its first statement, above `createServiceClient()` | C-1/C-2/C.3; A2-INV-2; F.4 `invocationCallOrder` |
| 3 | **Authenticated identity cannot self-assign authority** — role read is zero-arg on `auth.uid()`; role writes only via the admin-checking fn | A2-INV-1/8; E-Q14 |
| 4 | **Role records cannot be written through exposed REST tables** — tables in a non-exposed USAGE-fenced schema; REVOKE names PUBLIC+anon+authenticated | A2-INV-4/6; E-Q3/E-Q10 |
| 5 | **Table ownership does not bypass intended protection** — non-`BYPASSRLS` owner + FORCE RLS + minimal policies | A2-INV-7; E-Q13 |
| 6 | **Privileged mutations are auditable** — actor FK + immutable snapshot; append-only w.r.t. the app principal; self-mods flagged | E-5/E.5; A2-INV-5; E-Q6; E.8 |
| 7 | **Administrator bootstrap and recovery are controlled** — governed SQL under PK gate; last-admin protection in the DB | E.7/E.8 |
| 8 | **Service-role paths do not silently bypass operator authorization** — enforcement at the server/DB boundary; N-9 REST surface named as an explicit limitation | C.1/C.4a; E-Q12 handoff |

---

## 6. Slice 1 dependency note (short — do not design the lane here)

**Slice 1 remains blocked.** Approval of this sheet authorizes an authorization *architecture*, not Slice 1.

- **Operations missing a governed write boundary:** S1-a (governance enable/disable), S1-b (pool policy), S1-c
  (asset promote/fence) have **no** governed write RPC; S1-d has only the proof-recording half
  (`record_tmr_proof_event`) — the **template-assignment** half has none. (Census: N-8, all non-system schemas, static
  body analysis; method limit stated.)
- **Why direct dashboard writes are unacceptable:** the only dashboard-side route to those tables is interpolated
  `exec_sql` at `postgres` privilege — the exact defect class Batch 1/2 are containing, on governance-critical writes.
- **How the future RPC contracts must inherit Slice 0.5:** each new CE-side write RPC must take a **server-verified**
  actor identity (never a caller-supplied string, E.5), enforce the same role check the dashboard boundary does, and
  write the same append-only actor-attributed audit event (E-5). i.e. the governed-write lane inherits Slice 0.5's
  identity, authorization, and audit decisions wholesale — it does not re-decide them.

**Sequencing (D-Q4):** a separate CE-side governed-write lane must be sequenced, or Slice 1 re-scoped. Not designed here.

---

## 7. Housekeeping (route to `register-reconciler` — not architecture blockers)

- **G-1** *(also §3)* — arc brief on unmerged `9e6bccf`; merge or supersede. Materially affects Slice-1 citations → surfaced at this gate.
- **G-2** — the stale claim *"schema `r` not REST-exposed (PGRST106)"* at `docs/00_action_list.md:652,658` is **contradicted**
  by PostgREST's own error text, the 2026-06-17 PK dashboard verification, and two live advisor findings. **Do not reuse
  the exposure premise.** (Its RLS leg may still hold.) → `register-reconciler`.
- **G-3** — two unrelated lanes both hold `cc-0046` (Operator-Capability Arc v6.07/08 and Orthogonal Gap Classification
  v6.06); neither renumbered. → `register-reconciler`.

---

## 8. What PK gets back, and the exact next gate

- **Decisions requiring a ruling now:** the 8 architecture blockers (§2) + 3 sequencing rulings (§3).
- **Recommended answer:** as tabled — A2 with 8 invariants; 3 roles; `audit`/`authz` schema; non-`BYPASSRLS` owner +
  FORCE + minimal policies; server-verified-uid role-mutation fn; carry env + client_id columns; Batch-2-before-enable.
- **Dissenting evidence (carried, not buried):** A1 is genuinely cheaper, needs no migration, and introduces **no**
  new `authenticated`-reachable DB object (a security edge A2 cannot match, C-6) — defensible if PK weighs availability
  and simplicity above audit feasibility, *provided* short token lifetimes and a written-down revocation lag. A3 is not
  recommended (doubles failure surface, fails open). E-Q6 `SET NULL`+snapshot deliberately **retains** a deleted user's
  email — a privacy/erasure-request tension PK owns.
- **Consequences of deferral:** deferring **E-Q3/E-Q10/E-Q13** past Gate-2 means the role table's schema+owner are
  chosen mid-implementation — the single most likely place to reproduce the ~90×-fired trap. Deferring **E-Q14** means
  A2-INV-8 is unbuildable and role mutation is app-side-only. Deferring **E-Q2/D-Q4** risks enabling authorization
  theatre or stranding Slice 1 mid-lane.
- **Exact next gate after approval:** a **separate T3 implementation authorization** (Gate 1 for the build lane), whose
  brief must: pin the A-item rulings; require the E-Q11 Supabase-UI exposed-schema reconfirm immediately before apply;
  prove the `auth.users` delete path against the actor FK on a scratch table; record the pre-enforcement Vercel
  deployment ID before enabling; and run the full T3 chain + rollback-proven + PK deploy gate. **Batch 2 must close
  first before enforcement is switched on.** Slice 1 stays blocked pending its own separate authorization.
