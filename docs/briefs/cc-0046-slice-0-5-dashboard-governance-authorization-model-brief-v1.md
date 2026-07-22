# Brief — cc-0046 Slice 0.5: Dashboard Governance Authorization Model

**Created:** 2026-07-22 Sydney
**Author:** orchestrator (Claude Code)
**Executor:** orchestrator + PK gates
**Status:** draft — awaiting PK Gate 1
**Lane class / tier:** SAFETY_GATE · **T1 for this brief** (documentation/architecture only, nothing written to any app) · **the implementation it designs is T3** (authorization posture + almost certainly DDL/grants) and is **NOT authorized by this brief**
**Result file:** `docs/briefs/results/cc-0046-slice-0-5-dashboard-governance-authorization-model-result-v1.md` (on completion)

**Repo coordinates at authoring time:**
- CE `origin/main` = **`5fc72e4`** (worktree `claude/cc-0046-slice-0-5-authz-brief-v2`; cut off `1740938`, then fast-forwarded onto `5fc72e4` — the single intervening commit adds one automated run-record under `docs/runtime/runs/`, **path-disjoint** from `docs/briefs/`, registers and `CLAUDE.md`; independently verified benign per Convention 2)
- `invegent-dashboard` `origin/main` = **`1572fbd`** (read-only detached worktree; this is the live production SHA per Batch 1 §2)

> ## ⚠ WHAT THIS BRIEF IS
>
> A **design document and decision request**. It recommends an authorization model; it does not build one.
> **No implementation, role table, middleware change, server-action guard, migration, RLS/grant change, deploy,
> or governance write is authorized by this document.** Slice 1 remains blocked until this brief is PK-approved
> **and** its implementation receives a *separate* authorization.

---

## Task

Design the dashboard's first authorization model. The dashboard has **authentication but zero authorization** —
for every governed surface it has exactly two privilege levels, *anonymous* and *everything*. Decide where role
truth lives, what the minimal role set is, which boundaries must enforce it, exactly which Slice 1 actions each
role may perform, and how the system behaves when role data is missing or unreadable. Return the decisions to PK;
build nothing.

**The adversary this model authorizes against — named, because it changes priority order.** Not an external
attacker: the perimeter holds against one (F-6). The primary adversary is a **legitimately authenticated,
non-operator account** — in practice an invited client user (F-2), a dormant account, or a compromised session.
Every account in `auth.users` today is operator-equivalent. That framing makes the two open `exec_sql` sinks
(§Scope, precondition P-1) the top-priority control and the Next.js CVE pin a secondary one.

## Source context

**Governing lane records (CE `1740938` unless noted):**
- `docs/briefs/results/dashboard-privileged-action-containment-batch-1-result-v1.md` — **the threat model**. Batch 1
  deployed and PK-accepted 2026-07-22; §1 states the authentication/authorization gap, §10 the residual findings.
- `docs/briefs/results/dashboard-operator-capability-arc-result-v1.md` — Slice 0 (read-only matrix), ACCEPTED, then
  dark-retired by Slice 0.1.
- `docs/briefs/results/cc-0046-slice-0-1-capability-surface-ia-reconciliation-result-v1.md` — Slice 0.1; confirms
  `/create/format-capability` as the durable capability owner and `/create/capability-matrix` as inert.
- `docs/briefs/dashboard-privileged-action-containment-batch-2-brief-v1.md` — Batch 2 Gate-1 (branch
  `claude/containment-batch-2-brief` @ `a14dff9`); **parallel documentation lane, implementation unauthorized**.
- `CLAUDE.md` (tiers T1–T3, review chain, R0 read path) · `docs/00_sync_state.md` (marker **v6.09**).

**⚠ Finding G-1 — the brief that defines Slice 0.5 and Slice 1 is NOT on `main`.**
`docs/briefs/dashboard-operator-capability-arc-brief-v1.md` — cited as the governing brief by the Slice 0 result
(§"Brief:") — exists **only** on the unmerged branch `origin/claude/cc-0044-review-rjkgp5` @ **`9e6bccf`**
(`git merge-base --is-ancestor 9e6bccf origin/main` → **not an ancestor**). Every Slice-0.5 and Slice-1 scope
statement in this brief is therefore cited to `9e6bccf`, not to `main`. **PK decision required:** merge the arc
brief to `main` or explicitly supersede it with this document. Until then the arc's definition of its own
remaining slices is not on the mainline. *(Handoff candidate: `register-reconciler`.)*

## Scope

**In scope:** sections A–F below — role source of truth, role model, enforcement boundaries, the Slice 1
protected-action map, failure/recovery posture, and the implementation envelope. Read-only evidence gathering
across both repos and read-only DB reads.

**Out of scope:** all implementation; the repo-wide dynamic-SQL programme; `exec_sql` re-ownership; Batch 2
implementation; Content Studio changes; dashboard feature expansion; re-enabling `/create/capability-matrix`;
account hardening (MFA, dormant accounts, leaked-password protection) — a separate PK operational action;
auth-provider replacement.

## ⚠ Precondition P-1 — Batch 2 is an integrity precondition, not a parallel lane

Batch 2's *implementation* stays out of scope, but its **ordering relationship to Slice 0.5 must be stated,
because it determines whether this model delivers containment at all.**

Two `exec_sql` sinks remain open at `1572fbd` (Batch 1 §9, re-verified in this lane):
`app/api/onboarding/run-scans/route.ts:20` (API route, **no in-handler identity check**, `submission_id` taken
straight from the request body) and `app/(dashboard)/actions/onboarding-scans.ts:75` (directly-invocable
`'use server'` export, same pattern). Both interpolate into `exec_sql` — SECURITY DEFINER, owner `postgres`,
`rolbypassrls=TRUE`, no statement filter.

**Consequence:** the exact adversary named above retains arbitrary SQL execution as `postgres`. That adversary
could therefore (a) **write their own `administrator` row into whatever role table this model creates**, and
(b) **spoof the identity the model keys on** — `auth.uid()` resolves `current_setting('request.jwt.claims')`,
which is settable via `set_config` inside `exec_sql`. A "SELECT-only" shape is **not** containment: a `SELECT`
can call a volatile function.

> **Enabling enforcement before those sinks are closed produces the appearance of authorization without the
> substance**, and makes §B's separation of `governance_operator` from `administrator` unenforceable.
> **PK decision E-Q2: Batch 2 (or equivalent closure of both sinks) must land before Slice 0.5 enforcement is
> enabled.** Slice 0.5 may be *designed and built* in parallel; it must not be *switched on* first.

---

# 1. Verified production facts (the threat model this model must answer)

All independently re-derived in this lane at CE `1740938` / dashboard `1572fbd` unless attributed.

| # | Fact | Evidence |
|---|---|---|
| **F-1** | **Authentication present, authorization absent.** `middleware.ts` resolves a Supabase user (`:28-30`) and redirects to `/login` when absent (`:53-55`) — that is its entire check. No role/RBAC/permission code exists in `app/`, `actions/`, `lib/`, `components/`. **⚠ Two path prefixes are deliberately public** (`:42-50`): `/mcp-consent` and `/mcp-github-consent`, commented *"the page itself is intentionally public"*; the matcher (`:60-64`) additionally excludes common image extensions. | `middleware.ts:28-30, 42-50, 53-55, 60-64` (read at `1572fbd`); Batch 1 §1 |
| **F-2** | **Onboarding-created users are live members of the dashboard's own auth project and are operator-equivalent.** `approveSubmission` calls `supabase.auth.admin.inviteUserByEmail(...)` on the **service client for the dashboard's own project**, with `redirectTo: 'https://portal.invegent.com/callback'`. The invitee therefore lands in the same `auth.users` that `middleware.ts` authenticates against. **`auth.users` = 4 · invited = 2 · signed in = 4.** | `actions/onboarding.ts:116-118`; live read (§below) |
| **F-3** | **Batch 1 narrows selected paths; it does not distinguish operators from client users.** Its own §"WHAT THIS DID AND DID NOT DO": *"All authenticated users remain operator-equivalent pending Slice 0.5."* | Batch 1 result, banner + §3A |
| **F-4** | **Server-side authorization is mandatory before governance writes.** Server code already runs as service-role → `exec_sql` → `postgres` (`rolbypassrls=TRUE`). | Batch 1 §1; `pg_proc` read below |
| **F-5** | **The privileged floor.** `public.exec_sql`, `public.draft_approve_and_enqueue`, `public.approve_onboarding` are **all SECURITY DEFINER owned by `postgres`**. `exec_sql` has no statement filter and no parameterisation. | live `pg_proc` read, 2026-07-22 |
| **F-6** | **Why the perimeter is not already broken** — **for the four functions named in F-5** grants are correct and non-default (`{postgres, service_role}` only; anon/authenticated/PUBLIC false, no direct REST path); the service-role key is server-only, never `NEXT_PUBLIC`; **`next` is pinned `14.2.35` ≥ 14.2.25** — verified in **both** `package.json:17` **and** `package-lock.json` — so CVE-2025-29927 (`x-middleware-subrequest` middleware bypass) does not apply. | Batch 1 §1; `package.json:17` + lockfile re-verified at `1572fbd` |

> **F-6 is a security-critical standing constraint.** Below `next@14.2.25` the middleware check is bypassable and
> every surface in this document becomes **anonymously** reachable. Any Next downgrade or major upgrade must
> re-verify this pin. This is not a nice-to-have — it is the only thing making "the application is the entire
> perimeter" a *true* statement rather than a hopeful one.
>
> **⚠ F-6 is scoped to the four F-5 functions and must NOT be read as a database-wide statement.** Live security
> advisors currently return **41 `anon_security_definer_function_executable`** and **49
> `authenticated_security_definer_function_executable`** findings across schemas `m`, `c`, `f`, `friction`, and
> `anon`/`authenticated` do hold USAGE on schema `c`. Whether any is genuinely reachable depends on which schemas
> PostgREST exposes — **open question E-Q3, routed to `db-rls-auditor`**. This is context that qualifies F-6; it
> is **not** this lane's work to fix. Note also that **advisors name none of the F-5 functions** — there is no
> advisor rule class for dynamic SQL, so the linter must never be cited as coverage for this lane.

## 1.1 Findings this lane adds

- **N-1 — the server-action surface is ~17× larger than the route surface and far less guarded.**
  At `1572fbd`: **2 of 40** `app/api/**/route.ts` files carry an in-handler identity check
  (`app/api/drafts/action/route.ts` — added by Batch 1 — and `app/api/series/action/route.ts`).
  **But only 1 of 35** `'use server'` modules does (`actions/emit-friction.ts`).
  *Batch 1 §10 records "1 of 40"; that was the pre-Batch-1 figure. Both numbers are stated here as measured.*
  **Next.js server actions are directly invocable POST endpoints, not merely UI callbacks** — invoked by POSTing
  to a route with a `Next-Action` header carrying a build-specific action ID discoverable from the client bundle.
  So those 34 unguarded modules are an authorization surface of the same kind as the route handlers, not a lesser
  one, and **not rendering a button removes no capability whatsoever**.
  **This, not the route count, is the surface Slice 0.5 must actually cover.**
  *(Whether an action is invocable from an **arbitrary** route or only from one whose manifest references it is
  version-dependent in Next 14 and was **not** tested here — see E-Q4. The conclusion above holds either way,
  because these actions are reachable from the pages that use them.)*

- **N-2 — onboarding approvals are attributed to PK regardless of who performs them.**
  `approveSubmission` passes a **hardcoded literal**: `p_operator_email: 'pk@invegent.com'`
  (`actions/onboarding.ts:110`). This is stronger than "an unverified caller string" — the operator identity is
  not merely unverified, it is **falsified to a specific real person** by construction.

- **N-3 — `draft_approve_and_enqueue` hardcodes the approver.** Function body contains
  `approved_by = 'manual'` (live `pg_get_functiondef`, 2026-07-22).

- **N-4 — no audit trigger covers draft approval, draft status change, or onboarding approval.**
  `m.post_draft` carries exactly four non-internal triggers — `trg_handle_draft_rejection`,
  `trg_post_draft_updated_at`, `trg_prevent_published_draft_delete`, `trg_release_queue_on_asset_ready` — all
  functional, **none an audit/attribution trigger**. Onboarding tables carry **zero** triggers.
  **Consequence: an incident is unattributable from DB state.**

- **N-5 — unattributability is system-wide, not local to these two functions.** Every actor-ish column in the
  database is free-text `text` and **there is not one foreign key from any non-`auth` schema to `auth.users`**:
  `c.client_format_mix_audit.actor` · `c.creative_template_inventory_audit.{captured_by,reviewed_by}` ·
  `c.client_publish_profile_audit.changed_by` (**defaults `'dashboard'`**) ·
  `c.client_control_tower_enrollment.{approved_by,changed_by}` · `c.creative_template_client_assignment.approved_by` ·
  `c.creative_template_variant_candidate.reviewed_by` · `c.onboarding_submission.reviewed_by` ·
  `m.compliance_review_queue.reviewed_by` · `m.music_review_event.actor` · `m.chatgpt_review.actor`
  (**defaults `'claude'`**). `m.system_audit_log` is a **health-check run log**, not an actor log
  (`triggered_by` defaults to `'manual'`).
  **⚠ `c.creative_template_client_assignment.approved_by` is the write target of S1-d** — so the very operation
  this model is being built to authorize records an unverifiable approver string today.
  **ICE has never had a cryptographically-grounded actor identity. There is no substrate to reuse — Section E
  requires building one.**

- **N-6 — no role data exists in either candidate source today.** Of 4 `auth.users`, **zero** carry a `role` key
  in `raw_app_meta_data` and **zero** in `raw_user_meta_data`; **zero verified MFA factors**. No role, permission,
  or authorization table exists in any non-system schema. **Both Section A candidates start empty** — which makes
  the Section E rollout-ordering trap unavoidable rather than hypothetical.
  **⚠ Qualification (and good news): the *pattern* is not unprecedented, only the *role data* is.** A live,
  working `auth.uid()`-keyed identity mapping already exists — `public.portal_user` (RLS enabled, one policy
  `auth.uid() = user_id`) read by `public.auth_client_id()` (SECURITY DEFINER, STABLE,
  `SELECT client_id FROM public.portal_user WHERE user_id = auth.uid()`). **That is exactly the A2 shape, already
  running in this project**, which materially de-risks the design. Cite it as precedent — **and copy none of its
  THREE defects:**
  1. `auth_client_id()` has **no `proconfig`** (mutable `search_path`).
  2. Its ACL is `{=X/postgres, postgres=X, anon=X, authenticated=X, service_role=X}` — the leading **`=X` is
     `PUBLIC`**, not merely anon/authenticated, because `ALTER DEFAULT PRIVILEGES … GRANT` *adds to* PostgreSQL's
     built-in `EXECUTE TO PUBLIC` default rather than replacing it. **That is the mechanical proof of A2-INV-6.**
  3. **⚠ `public.portal_user` is itself an instance of the F.2 trap** — a table in `public` carrying the born-open
     ACL `{postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm}`,
     `relrowsecurity=true` but `relforcerowsecurity=false`. **The only thing stopping an authenticated user from
     INSERTing themselves a row is that its single policy is `FOR SELECT` and no INSERT/UPDATE/DELETE policy
     exists**, so RLS denies those by default. **It is saved by RLS *despite* its grants — one policy away from a
     self-assignment hole, reached by accident rather than design.** This is the strongest available argument for
     A2-INV-6: **revoke AND enable RLS; never RLS alone.** *(No exploit is claimed — `portal_user` is not
     currently exploitable. The configuration simply must not be reproduced.)*

  *(`portal_user` is also direct evidence bearing on B-Q2: a user↔client mapping for portal users already exists.)*

- **N-9 — ⚠ an authorization surface exists OUTSIDE the application, so "the app is the entire perimeter" is
  false for at least one schema.** Applying the real reachability test (schema REST-exposed **and** role holds
  schema USAGE **and** role holds EXECUTE), **~6 SECURITY DEFINER functions are `anon`-reachable and ~18 are
  `authenticated`-reachable** over PostgREST. *(These two counts are **conditional on the F.2.1 exposed-schema
  table**, whose basis is strong but indirect — see F.2.1's verification note and E-Q11. The schema-USAGE facts
  underneath them are directly verified; the exposure premise is not.)* Among the `authenticated`-reachable set are ~12 `friction.*`
  functions — mostly **writes** (`triage_case`, `resolve_case`, `reopen_case`, `mark_duplicate`, `emit_event`, …).
  **Any authenticated principal — including an onboarded client user (F-2) — can invoke those directly, with zero
  application involvement.** Two `f.*` functions are HIGH and `anon`-reachable
  (`run_ai_worker_cron_v1`, `ai_worker_lock_jobs_v1`).
  **All pre-existing; none introduced by this design; NOT this lane's to fix** — but it bounds what Slice 0.5 can
  honestly claim, and it is why boundary **C-6** exists. *(The raw advisor counts of 41/49 over-state reachability:
  the 30 in schema `m` and 1 in `k` are unreachable — `anon`/`authenticated` hold no USAGE there. The advisor
  counts the EXECUTE grant only and ignores schema USAGE.)* **Handoff: `security-auditor` sibling lane + PK.**

- **N-7 — `inviteUserByEmail` is unguarded and self-circumventing.** It sits inside `approveSubmission`, a
  `'use server'` export with no identity check beyond middleware (N-1). **Whatever role source is chosen, this
  path must be administrator-gated in the same lane** — otherwise any authenticated user can mint a new
  authenticated user, and the role model is circumventable by design.

- **N-8 — ⚠ STRUCTURAL: the governed write path for Slice 1 is almost entirely absent.** Census method: **all
  non-system schemas**, `provolatile='v'`, function body referencing **any of the six D.1 target tables**
  (`client_creative_governance` · `client_asset_pool_policy` · `client_brand_asset` · `shared_creative_asset` ·
  `creative_template_client_assignment` · `creative_template_proof_event`) **and** containing
  `insert into|update … set|delete from|merge into`. Three holes were closed explicitly: **trigger-mediated
  writes** (the six targets carry **zero** non-internal triggers), **writes through updatable views** (the only
  dependent view is the read-only R0 `ice_ro.asset_governance_status`), and **other schemas** (full scan).
  *Method limit, stated: this is static body analysis, so it cannot see a write performed through dynamic SQL
  (`EXECUTE format(...)`) or in a non-SQL/PL-pgSQL language — "no write path detectable by body analysis", not a
  proof of absence.* Findings:
  - **S1-a (governance enable/disable) — no write RPC.** Only a read, `get_client_creative_governance`.
  - **S1-b (pool policy) — no write RPC.**
  - **S1-c (asset promote/fence) — no write RPC.**
  - **S1-d — PARTIALLY covered.** `public.record_tmr_proof_event` (SECURITY DEFINER, `{postgres, service_role}`)
    inserts into `c.creative_template_proof_event`, covering the **proof-recording** half. **The template
    *assignment* half has no write RPC.** *And it takes `p_recorded_by text` — another unverified caller string,
    reinforcing N-5.*

  Two functions *reference* target tables but are **not** Slice 1 write paths — they read the targets and write
  elsewhere: `run_asset_gap_analysis` (writes `m.asset_gap_suggestion` / `m.asset_gap_observation`) and
  `stamp_tmr_shadow_forward` (writes `c.tmr_shadow_decision`). Recorded so a later reader does not mistake either
  for coverage.

  cc-0044 performed all of these via raw `execute_sql`/`apply_migration` under PK gates. **Authorization alone
  does not make Slice 1 buildable** — see §D.5. This is the single most consequential finding for sequencing, and
  it is a PK decision, not a defect this lane can close.
  **Corollary extending N-4:** the six Slice 1 target tables carry **zero non-internal triggers between them** —
  so there is no audit trigger on any table Slice 1 will write, either.

---

# A. Role source of truth

**Failure-mode column is the deciding column** — the entire lane exists because over-privileged accounts already
exist, so *how fast a grant can be withdrawn* outranks latency and convenience.

| Dimension | **A1 — Supabase Auth `app_metadata`** | **A2 — governed CE authorization table** | **A3 — hybrid (A1 cache over A2 truth)** |
|---|---|---|---|
| Who may assign/revoke | Service-role admin API only. **`app_metadata` is not user-writable** (unlike `user_metadata`, which is self-settable and must never be used) | Governed SQL under PK gate; later an administrator UI | Both — and they can disagree |
| Auditability / history | **None.** No durable change record, reason, or actor. `auth.audit_log_entries` is Supabase-internal, not a governance record | **Full** — companion audit table with actor, reason, timestamp, and **FK to `auth.users.id`**; the only option that fixes N-5 | A2's, if the cache never becomes the de-facto record |
| Propagation / caching | **Baked into the JWT at issuance → stale until refresh.** A revoke does not take effect until the session token expires | **Per-request read → immediate revocation** | Fast, but revocation is only as fast as the invalidation path |
| Service-role exposure | Role readable from the verified JWT server-side; **no service-role needed, and it introduces NO new REST-reachable DB object** — a real, under-appreciated advantage | **Must not go through `exec_sql`.** Correct design: a narrow `SECURITY DEFINER` function keyed on `auth.uid()`, granted to `authenticated` only. **⚠ But this becomes the system's FIRST `authenticated`-reachable governance object — see C-6** | Widest — both paths exposed |
| **Missing / unreadable** | Claim absent → **deny** (clean). Auth outage → no session at all | Row absent → **deny** (clean). **DB unreadable → deny → dashboard degrades to read-only** (availability cost, fail-closed) | Ambiguous: cache-hit + truth-unreadable → **the dangerous case**; stale grant survives an outage |
| Portability across envs | One auth project serves all envs → **preview and production share role state** | Same DB across envs, but the table **can carry an environment column**; A1 cannot | Inherits both |
| Operational burden | Lowest — no migration | Migration + rollback + a read function | Highest — two systems, two failure modes |
| Migration / rollback | Set/unset a claim; **JWT staleness on both** | Reversible migration; grants revocable; rollback = drop enforcement flag, then table | Two rollbacks that must be ordered |

## A.1 Recommendation (PK decides — this is not settled)

**Recommend A2, the governed CE authorization table**, with role read through a **narrow `SECURITY DEFINER`
function keyed on `auth.uid()` and granted to `authenticated`** — explicitly **not** through `exec_sql`.

Three reasons, in order of weight **after** adversarial review:

1. **It is the precondition for Section E — the reason that survives attack unconditionally.** N-5 shows ICE has
   never had a real actor identity, and A2 is the only option producing an FK to `auth.users.id`.
   **Audit logging is not achievable without it.**
2. **Revocation immediacy.** A JWT-baked claim (A1) cannot be withdrawn promptly — a compromised or
   mistakenly-granted session retains its role until token expiry. *But this advantage is **conditional** on
   invariant A2-INV-3 below; without it, A2 silently degrades into A3.*
3. **Blast-radius containment.** Role data stays out of a client-inspectable token and out of the
   containment-critical `exec_sql` path.

**Argued against A1 honestly:** it is genuinely cheaper, needs no migration, its read requires no service-role,
**and it introduces no new `authenticated`-reachable DB object at all** — a security advantage A2 cannot match
(C-6). If PK weighs availability and simplicity above audit feasibility, A1 is defensible **provided** short
token lifetimes are configured and the revocation lag is written down and accepted. **A3 is not recommended:** it
doubles the failure surface for a latency problem this dashboard does not have, and its cache-hit /
truth-unreadable case fails *open*.

## A.2 Binding invariants if A2 is chosen — each is a one-line design constraint that decides whether it works

| ID | Invariant | Why it is load-bearing |
|---|---|---|
| **A2-INV-1** | The role-read function **takes zero arguments.** Identity derives **solely** from `auth.uid()` | A `p_user_id` argument turns it into a cross-user role-disclosure and (if the shape is later reused for writes) impersonation primitive, enumerable by any authenticated user directly over REST (C-6). *An alternative shape exists — server verifies the uid via `supabase.auth.getUser()`, then calls a **`service_role`-only** function with `p_user_id`. **Pick exactly one; do not build both** (E-Q9).* |
| **A2-INV-2** | The read is issued on the **cookie-bound user client** (`lib/supabase/server.ts`), **never** `createServiceClient()` — and `createServiceClient()` may only be constructed **after** the role check passes | **Confirmed by DB audit:** `auth.uid()` is `coalesce(nullif(current_setting('request.jwt.claim.sub',true),''), (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid`. The service-role JWT carries **no `sub`**, so `auth.uid()` returns **NULL** and, under E-1 deny-by-default, **every caller is denied — a total self-DoS on day one**, which E-4 would mask as an availability event rather than a wiring bug. The dashboard's *dominant* path is the service client, so this is the default mistake. **This is the same invariant as C.3's ordering rule — they must be satisfied together, not separately.** *(It also cannot go through `lib/supabase/sql.ts` → `exec_sql`, which §A.1 already forbids for an independent reason — two reasons converge.)* |
| **A2-INV-3** | **No cross-request caching of role.** A per-request memo is the only permitted memoization | Without this, an implementer adding a "60-second role cache for performance" converts A2 into A3 — whose cache-hit/truth-unreadable case this brief itself calls the dangerous, fail-open case. A2's reason #2 evaporates silently |
| **A2-INV-4** | Role and audit tables live in a schema that is **NOT PostgREST-exposed** and on which `anon`/`authenticated` hold **no USAGE** — the existing owner-only `audit` schema, or a new `authz`. **Not `public`. Not `c`.** Only the *read function* lives in `public` (it must, to be RPC-callable by `authenticated`) | See F.2. **`public` AND `c` are both REST-exposed**, and `anon`/`authenticated` hold USAGE on both. `public` additionally mints new tables **`arwdDxtm` to `anon` and `authenticated`** — a direct self-promotion-to-administrator primitive reachable with the public anon key |
| **A2-INV-5** | The audit table is **append-only with respect to the application principal** — `REVOKE UPDATE, DELETE` from `service_role`; writes via an INSERT-only SECURITY DEFINER function. **That function lives in the fenced schema (not `public`), and `service_role` gets USAGE on that schema + EXECUTE on the function — nothing more** | Otherwise the principal that writes an audit row can erase it — and `administrator`, the role §B calls audit-critical, is exactly the actor most motivated to. **The "with respect to the application principal" scoping is deliberate: the E-Q6 FK's `ON DELETE SET NULL` referential action DOES update audit rows, and that is an INTENDED non-application exception — do not "fix" it by dropping the FK or blocking the update.** *(Note the `audit` schema has no default-ACL rows at all, so a function created there falls back to built-in `EXECUTE TO PUBLIC` — fenced in practice only by absent schema USAGE. Revoke explicitly.)* |
| **A2-INV-6** | Every `REVOKE` names **`PUBLIC`, `anon`, AND `authenticated`** — all three — in the **same migration as the `CREATE`** | **`REVOKE FROM PUBLIC` alone is insufficient**: the `pg_default_acl` grants are *explicit* to `anon` and `authenticated` and survive a PUBLIC-only revoke. This is the standing ICE gotcha. *(Inverse: `CREATE OR REPLACE` preserves an existing ACL — the trap fires on fresh `CREATE` only.)* |
| **A2-INV-7** | Tables carry `ENABLE` **and `FORCE`** `ROW LEVEL SECURITY` | **RLS is fully effective against `anon`/`authenticated`** (both `rolbypassrls=FALSE`) — that is boundary C-6, and it is the real reason to enable it. **`FORCE` is defence-in-depth only**: it removes the *table-owner* bypass, **not** the `BYPASSRLS` bypass, so it does **not** constrain `postgres` or `service_role` (per C.1). It becomes load-bearing only if the tables are owned by a **non-`BYPASSRLS`** role — see **E-Q13** |
| **A2-INV-8** | **Role mutations go only through an `administrator`-checking SECURITY DEFINER function**, living in the fenced schema (not `public`); `service_role` gets USAGE on that schema + EXECUTE on the function and **no direct DML** on the role table | Without this, §B's central separation — only `administrator` may grant roles — is enforced **app-side only**. Every dashboard path runs as `service_role`, so any code path, including a future unguarded server action (the exact 34-module failure mode C.4 warns about), could change roles. Same shape as A2-INV-5; costs one function. **⚠ Not buildable until E-Q14 is answered** — the function's caller shape is an open fork, see below |

**These are invariants, not suggestions.** A2 was recommended on the assumption **all eight (A2-INV-1…8)** hold;
if PK accepts A2, they are part of the acceptance.
*(A2-INV-1 is conditional on **E-Q9** resolving to the zero-argument shape. Under the alternative shape the read
is issued on the service client after a server-side `getUser()`, which **A2-INV-2 forbids as currently worded** —
so resolving E-Q9 the other way requires restating INV-1 **and** INV-2 together, not silently voiding one.)*

> ### ⚠ A2-INV-8 is not buildable until E-Q14 is answered — the same fork as E-Q9, for writes
>
> INV-8 says `service_role` holds EXECUTE on an `administrator`-checking function. **But how does that function
> learn who the caller is?** Both answers cost something this brief has already analysed for the *read* path:
>
> - **Invoked by `service_role`** (what "`service_role` holds EXECUTE" implies) → **`auth.uid()` is NULL inside
>   it** — the identical failure A2-INV-2 exists to prevent. It can then check nothing, so it either denies every
>   call or must accept a **caller-supplied actor id**, which **E.5's trust-boundary corollary forbids**.
> - **Invoked on the cookie-bound client** → `authenticated` needs EXECUTE on a **mutation** function, which is
>   **strictly worse C-6 exposure than the read path** it already flags.
>
> **The likely resolution is the server-verifies-then-passes shape** (server calls `getUser()`, passes the
> *verified* uid to a `service_role`-only function) — i.e. E-Q9's shape B applied to writes, even if shape A is
> chosen for reads. **But that is PK's decision, not an inference this brief should make.** The stakes are higher
> than E-Q9's because this is the write path for the role table itself.

**Open decision A-Q1:** environment separation. One Supabase project serves production and preview
(Slice 0/0.1 records). Under A2 an environment column is cheap now and a migration later; under A1 it is not
expressible at all. **PK's call.**

---

# B. Initial role model

**This is a recommendation, not a settled decision — the role set is PK's call in the same way the role source
is (A-Q0).** Smallest set the evidence supports: **three, not two** — because N-7 shows membership-granting must
not be a governance power, or the model is self-circumventable.

| Role | Permitted | Explicitly forbidden | Scope | Who may grant |
|---|---|---|---|---|
| **`viewer`** | Read every existing read-only surface (`/create/format-capability`, `/create/templates`, `/creative-library`, `/overview`, reporting) | Any governance write · draft approval · onboarding approval · invites · role changes | Global read; **per-client read scoping deferred** — see B-Q1 | `administrator` |
| **`governance_operator`** | The four Slice 1 governance writes (§D) · draft approval (`app/api/drafts/action`) · onboarding approve/reject | **Inviting or creating users** (N-7) · granting/revoking any role · changing enforcement config · anything not on the §D map | Per-client where the operation is client-scoped (§D); global otherwise | `administrator` |
| **`administrator`** | Everything `governance_operator` may · **grant/revoke roles** · **invite users** (`inviteUserByEmail`) | Nothing in-model — **therefore this role is the audit-critical one**: every administrator action must be logged with actor identity | Global | `administrator` (bootstrap: PK, via governed SQL — see E.7 step 2) |

**Deliberately NOT designed:** permission matrices, custom role creation, role inheritance/hierarchy, group or
team objects, delegated administration, time-boxed grants. No evidence requires them; 4 accounts do not justify
enterprise RBAC.

**B-Q1 — global vs per-client scope (PK decision, with a recommendation).** Every Slice 1 operation is
client-scoped by signature (`client_creative_governance(client, format)`, `client_asset_pool_policy(client)`), and
F-2 means client-side users may become auth members. So per-client scoping is *probably* required.
**Recommendation: carry a nullable `client_id` scope column in the schema from day one (NULL = global), but
enforce only global roles in v1.** Adding the column later is a migration on a security table; leaving it unused
now costs nothing. **This is a schema-shape decision PK should make at Gate 1, not mid-implementation.**

**B-Q2 — the portal question, partially resolved.** The seed carried this as the single question that most
changes the role model. **The mechanism half is now answered by F-2:** the dashboard itself mints portal invitees
into *its own* auth project, so a portal client is already a dashboard-admissible member **regardless of what
`portal.invegent.com` authenticates against**. What remains open is only the **population size and trajectory** —
how many client users will exist, and whether they will ever be numerous enough to require per-client scoping to
be enforced (B-Q1) rather than merely modelled. The portal repo was not on this machine and was not inspected.
**Implication either way: `viewer` must be the default role for any invited account, never `governance_operator`.**

---

# C. Enforcement boundaries

## C.1 The load-bearing statement

> **Middleware and hidden buttons are insufficient — individually and together — and must never be described as
> the security boundary.**
>
> `middleware.ts` establishes only *that a session exists* (F-1); it runs before routing and cannot know which
> action is being invoked or on whose data. UI visibility is trivially bypassed: server actions are directly
> invocable POST endpoints (N-1), so not rendering a button removes no capability whatsoever.
>
> **The reason this is fatal rather than merely weak:** by the time either gate has been passed, the server code
> is already running **as service-role → `exec_sql` → `postgres`** (F-4, F-5). There is no second line of defence
> underneath. RLS cannot save this path — and for **two independent reasons**, both of which must be stated:
> **`service_role` itself has `rolbypassrls=TRUE`**, *and* the SECURITY DEFINER functions execute as `postgres`,
> which also has it. Either alone defeats RLS, and `FORCE ROW LEVEL SECURITY` does not change it (that constrains
> a table *owner*, not a `BYPASSRLS` role). *Stating only the SECURITY DEFINER half would invite a future "fix"
> that drops `SECURITY DEFINER` and wrongly concludes RLS now applies.* A UI-only or middleware-only gate
> therefore constrains **nothing** about what the process may do to the database.

## C.2 Boundaries that must enforce

| # | Boundary | Requirement | Why |
|---|---|---|---|
| **C-1** | **Server actions** (`'use server'` exports) | **Mandatory.** Every governance-write export re-resolves the session server-side and checks role as its **first statement**, above any `createServiceClient()` | N-1: 34 of 35 modules unguarded; directly invocable |
| **C-2** | **Route handlers** (`app/api/**/route.ts`) | **Mandatory** for governance/privileged routes; first statements of the handler, above `req.json()` and above `createServiceClient()` | Batch 1's shipped precedent (`drafts/action`, `series/action`) |
| **C-3** | **DB functions / policies** | **Defence-in-depth, NOT the primary boundary.** RLS is ineffective against the `postgres`-owned SECURITY DEFINER path. Any *new* Slice 1 write function should take an explicit actor argument and validate it | F-4, F-5 |
| **C-4** | **UI visibility** | **Convenience only.** Hide affordances a role cannot use so operators are not shown dead controls. **Never counted as enforcement; never cited as evidence in a review** | N-1 |
| **C-5** | **Middleware** | Unchanged — remains an authentication gate only. **Not extended into an authorization gate** | F-1; keeps the boundary legible |
| **C-6** | **⚠ Direct PostgREST access by the `authenticated` principal** | **NEW — and it is the boundary that C-1…C-5 structurally cannot cover.** Every authenticated user holds a real user JWT in cookies, and the anon key is public by construction (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). Such a user can call PostgREST **directly**, bypassing middleware, route handlers, server actions and UI entirely. **For any object A2 introduces, DB grants + RLS are the SOLE and PRIMARY boundary — C-3's demotion of RLS is exactly inverted here**, because `anon` and `authenticated` have `rolbypassrls=FALSE`, so grants and RLS *are* fully effective against them | A2's role-read function granted to `authenticated` would be the **first** authenticated-reachable governance object in the system |

**C.2a Two boundaries deliberately NOT enumerated — stated as exclusions, not omissions.**

- **Scheduled SQL (`cron.job`) — E-Q7. NOT reachable by this model's adversary — applying the same test used in
  N-9 and G-2.** `cron.schedule`/`cron.unschedule` do carry PUBLIC EXECUTE (`{=X/supabase_admin, …,
  postgres=X*}`, and `has_function_privilege` is TRUE for both `anon` and `authenticated`) — **but schema `cron`
  is `{supabase_admin=UC, postgres=U*, inspector_ro=U}` and neither `anon` nor `authenticated` holds USAGE on
  it.** So the authenticated non-operator **cannot schedule anything**, and cron is *not* an authorization
  boundary for the adversary named in §Task.
  **It belongs to P-1 instead, as a post-compromise persistence primitive:** anyone who reaches
  `postgres`/`service_role` **through the two open `exec_sql` sinks** can plant a scheduled job that executes as
  `postgres` with no authorization boundary and **survives both a code fix and a key rotation**. That is a direct
  argument for closing Batch 2 *before* enforcement, not a separate v1 boundary.
  *(Recorded this way deliberately: the raw "PUBLIC EXECUTE" fact, quoted without the USAGE test, over-states the
  exposure — the exact error this brief flags twice elsewhere.)*
- **Edge Functions — E-Q8.** §C enumerates no EF boundary. `actions/onboarding.ts:82-87` and `:128-133` POST to
  `{SUPABASE_URL}/functions/v1/onboarding-notifier` with **no `Authorization` header and no `apikey`**, inside a
  swallowing `try/catch`. That is two-horned and **both horns matter**: either `verify_jwt=false` (an
  anonymously-callable EF that sends email on demand — a boundary outside §C entirely) **or** `verify_jwt=true`
  (in which case these onboarding notification emails have been **silently failing**). Unresolved; handoff.

**C.3 Ordering invariant (carried from Batch 1's mutation findings).** Every check must precede *both* request-body
parsing and service-client construction. Batch 1 proved a guard placed below `createServiceClient()` still returns
the right status code and still passes a naive test — so **placement is a correctness property, not style**, and
must be asserted explicitly (see F.4). **Reference implementation already in production:**
`app/api/drafts/action/route.ts` — session resolution `:10-13`, deny `:14-16`, above `req.json()` `:18`, above
`createServiceClient()` `:25`. Cite that, not an abstraction.

**C.4 Completeness, which is a different problem from correctness.** C-1 requires a check as the first statement
of every governance-write export, and F.4 forbids grep/count coverage *as evidence*. Neither guarantees the
**36th** server action does not simply forget. Recommend a single choke-point helper (`requireRole()`) plus a
build-time or test-time completeness gate that fails when a governance-write export does not call it.
**34 unguarded modules × manual discipline is precisely how the present state was reached.**

**C.4a ⚠ The honest limit of this model — C-6 is partly outside the dashboard's reach.**
N-9 establishes that ~18 SECURITY DEFINER functions are directly invocable over REST by any authenticated
principal, ~12 of them `friction.*` **writes**. **A role model enforced only at C-1/C-2 does not govern those
paths at all** — no dashboard-side code is involved in reaching them. This is recorded as a **named limitation of
Slice 0.5's own scope**, so no reader infers full coverage: closing it is a **grants** problem in a separate
`security-auditor` lane (E-Q12), not something the role model can solve. **Slice 0.5 must not be presented as
covering the whole authorization surface.**

**C.5 Read authorization at the loader boundary — an accepted v1 limitation, stated rather than left silent.**
C-1…C-6 are write-focused. Server components render at request time and load data via the service client, so a
role check placed in an action but not in the page's loader leaks **data**, not writes. That is consistent with a
global-read `viewer` in v1 — but it must be recorded as an accepted limitation now, so the first per-client
scoping change (B-Q1) does not silently inherit an unstated gap.

---

# D. Slice 1 dependency map

**Slice 1 source:** arc brief `9e6bccf` §Scope (see G-1 — not on `main`).

## D.1 The four named operations

| # | Slice 1 operation (verbatim intent) | Target | Required check | Scope |
|---|---|---|---|---|
| **S1-a** | enable/disable `client_creative_governance(client, format)` | `c.client_creative_governance` | `governance_operator` **for that client** | per-client |
| **S1-b** | set/change `client_asset_pool_policy` (`client_only` / `client_preferred` / `best_fit` · `allow_global_shared`) | `c.client_asset_pool_policy` | `governance_operator` **for that client** | per-client |
| **S1-c** | promote/fence a shared background or brand asset (fenced→governed CAS flip) | `c.client_brand_asset`, `c.shared_creative_asset` | `governance_operator`; **arc brief names this the most sensitive — PK gate retained per-asset** | per-client, but shared assets are cross-client — see D.4 |
| **S1-d** | assign a template + record `visual_approval` proof | `c.creative_template_client_assignment` (assignment) + `c.creative_template_proof_event` (proof) | `governance_operator` **for that client** | per-client |

## D.2 Adjacent privileged actions that must be mapped in the same lane

Not Slice 1 governance writes, but they run at the same privilege and are reachable by the same population:

| Action | Site | Required check |
|---|---|---|
| Draft approval → live social publishing | `app/api/drafts/action/route.ts` (authenticated-only today) | `governance_operator` |
| Onboarding approve / reject | `actions/onboarding.ts` | `governance_operator` |
| **User invitation** | `actions/onboarding.ts:116` | **`administrator` — non-negotiable (N-7)** |
| Role grant / revoke | does not exist yet | **`administrator`** |

## D.3 ⚠ Marked uncertainty — four or five operations?

The arc brief is **internally inconsistent** and I have not invented a resolution:

- §Scope, Slice 1 enumerates **four** lettered operations, (a)–(d).
- §Success criteria, S1 requires the operator complete *"each of the **five** cc-0044 governed operations"*.

The cc-0044 CP-D record names five governed applies (shared-bg promote · pool policy · governance enable ·
assignment+proof · auto-close). **The plausible fifth is requirement auto-close — but it is not listed in Slice 1's
own scope, and I will not add an action to a security map by inference.** **PK must state whether Slice 1 is four
or five operations before the map is treated as complete.**

## D.4 Further uncertainties — not invented

- **S1-c cross-client blast radius.** `c.shared_creative_asset` is a *shared pool*; promoting a shared asset can
  affect clients other than the one in whose UI the operator is acting. **A per-client role grant may therefore be
  insufficient authorization for a shared-pool promotion.** PK ruling needed on whether S1-c requires
  `administrator`, or `governance_operator` plus the retained per-asset PK gate.
- **In-UI human-approval step.** The arc brief requires one for every governance write. Whether the *approver*
  must be a different principal from the *initiator* (two-person rule) is **not specified**. Not designed here.
- **Slice 2 / Slice 3** actions are out of scope and deliberately unmapped.

## D.5 ⚠ The structural blocker (N-8) — read before scheduling Slice 1

**S1-a, S1-b and S1-c have no governed write RPC at all, and S1-d has only its proof-recording half** (N-8).
For everything not covered, Slice 1 has only two possible shapes:

- **(i)** New CE-side write RPCs — which the arc brief itself puts **out of scope**, requiring *"a separate CE-side
  brief/gate"* (`9e6bccf` §Out of scope).
- **(ii)** Dashboard-side `exec_sql` with interpolated SQL — **which reintroduces the exact defect class Batch 1
  and Batch 2 are containing, at `postgres` privilege, on governance-critical writes.**

**Option (ii) should not be adopted.** The consequence is that **Slice 0.5 is necessary but not sufficient** to
unblock Slice 1: a CE-side governed-write lane is also required. **PK decision: sequence that CE lane, or
re-scope Slice 1.** Naming this at Gate 1 is the point — discovering it mid-implementation would strand the lane.

---

# E. Failure and recovery posture

| # | Condition | Required behaviour |
|---|---|---|
| **E-1** | **Deny by default** | Absence of an affirmative grant is a denial. No implicit role, no "authenticated ⇒ operator", no fallback role on any error path |
| **E-2** | **Unauthenticated** | Unchanged — middleware redirects to `/login`; API/actions return 401 |
| **E-3** | **Authenticated but unassigned** | **Deny governance writes; existing read-only surfaces continue to work.** Return a distinct, non-guessing error ("no governance role assigned"), never a generic failure. **On day one this is all four accounts (N-6)** |
| **E-4** | **Role source unreadable** | **Fail closed → deny.** The dashboard degrades to read-only. It must be *visibly* degraded, never silently — reuse Slice 0's proven per-source "LIVE READ FAILED — not shown as empty" pattern rather than rendering an empty/disabled state that reads as "you have no permissions". **⚠ This posture is fail-closed only while reads are unscoped.** The day per-client **read** scoping is enforced (B-Q1), "degrade to read-only" means every authenticated user — including client users (F-2) — sees **every client's data** during an outage. E-4 must be re-derived at that point |
| **E-5** | **Audit logging** | Every governance write, role change, and invitation records **actor `auth.users.id` (FK, not free text)**, action, target, timestamp, outcome. **Append-only w.r.t. the application principal (A2-INV-5).** **See E.5 — currently unachievable; the lane's hardest requirement** |
| **E-6** | **Emergency rollback** | **See E.6 — the substrate matters more than the switch.** The control must live on a **different substrate from the role source**, be PK-actionable without a rebuild, and never flip automatically |
| **E-7** | **Existing read-only routes unaffected** | `/create/format-capability`, `/create/templates`, `/creative-library`, `/overview` and reporting must be regression-free. Batch 1's live-verification set is the precedent |
| **E-8** | **Deprovisioning ≠ revocation** | Removing a role revokes *authorization*; it does **not** revoke the *session*. A downgraded account still passes middleware and still reaches every unguarded surface. **PK decision E-Q5: is refresh-token revocation required on role removal?** Concrete, not theoretical — Batch 1 §10 records a dormant account and zero verified MFA factors across all four |

## E.5 Audit logging is not achievable today — name it now

N-2/N-3/N-4/N-5 compound into one blocker:

- `approveSubmission` **hardcodes `p_operator_email: 'pk@invegent.com'`** — approvals are attributed to a real
  person who may not have performed them (worse than anonymous).
- `draft_approve_and_enqueue` hardcodes `approved_by = 'manual'`.
- **No audit trigger** covers draft approval, draft status change, or onboarding approval.
- **No existing audit table carries a real actor** — all free text, no FK to `auth.users`; `m.system_audit_log` is
  a health-check log, not an actor log.

> **Therefore E-5 requires threading genuine actor identity into these call paths — a change to function
> signatures and their callers — and building an actor-attributed audit substrate that does not exist.
> It is not a logging add-on. This is named at Gate 1 precisely so it is not discovered mid-lane.**
>
> **Corollary — the trust boundary:** an actor argument passed from the client is worth nothing. Actor identity
> must be resolved **server-side from the verified session**, never accepted from request input. `p_approved_by` /
> `p_operator_email` are today unverified caller strings and must not be promoted into evidence of who acted.

**E.5.1 — The actor FK is creatable, but neither obvious `ON DELETE` works.** `postgres` holds `REFERENCES` on
`auth.users` (confirmed: `has_table_privilege('postgres','auth.users','REFERENCES') = true`), so the constraint
is creatable. But it would be **the first of its kind in this database** — all 18 existing FKs into `auth` are
`auth`→`auth`, so there is no precedent to lean on. And both defaults fail:

- **`CASCADE`** (what all 18 existing auth FKs use) **erases the audit history when an account is deleted** —
  destroying exactly the accountability E-5 exists to create, and handing an `administrator` a one-step
  history-erase.
- **`RESTRICT` / `NO ACTION`** preserves history but **makes user deletion fail**. That delete is issued by
  `supabase_auth_admin`, which holds **no USAGE** on the target schema; RI enforcement runs under the referencing
  table's owner context so it *should* still fire, but that is untested here.

**Recommended shape:** `actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL`, **plus immutable
snapshot columns written at insert time** (`actor_uid_snapshot uuid NOT NULL`, no FK; `actor_email_snapshot text
NOT NULL`). Integrity is enforced at write; history survives account deletion; deletion is never blocked.
**A no-FK alternative** — a SECURITY DEFINER insert function validating `EXISTS (SELECT 1 FROM auth.users …)` —
gives the same write-time integrity without coupling the audit table to a Supabase-managed schema's delete
semantics, and is closer to Supabase's own guidance. **E-Q6 is PK's call**, and it carries a **privacy tension**:
`SET NULL` + an email snapshot deliberately retains a deleted user's identifier, which is an erasure-request
decision, not an implementation detail. Whichever is chosen, **the implementation lane must prove the
`auth.users` delete path against the new constraint before enforcement is enabled** (E.7 step 4).

## E.6 ⚠ The kill switch — where the obvious two designs both fail

Adversarial review found E-4 and E-6 in direct contradiction. Both candidate substrates fail:

- **An env-var switch is not an emergency control.** A Vercel environment variable is injected into the
  serverless function environment at **deployment** time; a running deployment never observes a change, so a
  redeploy is always required (proven live in Slice 0.1 §4, where deleting the flag left production still
  rendering the surface until a redeploy). An emergency control that needs a rebuild is not one.
- **A DB-backed switch is worse, two ways.** (i) It is read from **the same database whose unreadability
  triggers E-4** — unavailable during precisely the incident it exists for. (ii) It is **writable by anyone
  holding the P-1 `exec_sql` path** — attacker-flippable.

> *Argument hygiene:* a third objection — "its OFF state grants every authenticated account full governance" —
> is **not** a discriminator and is deliberately **not** relied on. Reverting to the pre-enforcement posture
> *is* authenticated⇒permitted, so **any** rollback control has that end state, including the one recommended
> below. What actually differs is **who can cause the flip** (PK-controlled Vercel account access vs. a DB row
> writable via the P-1 path) and **whether it can happen silently**. Both are addressed by the three
> non-negotiables at the end of this section.

**Recommended instead (PK's call): Vercel instant-rollback to a pinned pre-enforcement deployment ID.** Different
substrate from the role source · no rebuild · PK-actionable in seconds · already the proven pattern in this repo
(Batch 1 §7 pins `dpl_H5Ysoyd9HfUezMHBUNvygek1yXvk`). **The pre-enforcement deployment ID must be recorded in the
result doc before enforcement is enabled** — a rollback target identified after an incident is not a rollback plan.

Whatever substrate PK chooses, three properties are non-negotiable: **the flip is a deliberate PK action, never
automatic** (otherwise a role-source outage silently converts a fail-closed design into a fail-open one) ·
**the flip is itself audited** · **the degraded state is visibly announced in the UI**, as E-4 already requires.

## E.7 ⚠ Rollout ordering trap

**Roles must be seeded BEFORE enforcement is enabled.** N-6 confirms **zero** accounts carry any role in either
candidate source, and E-3 makes "authenticated but unassigned" a denial. **Enabling enforcement first locks every
account — including PK's — out of every governance surface simultaneously.**

Required order, and the bootstrap paradox it resolves:

1. Ship the role source **inert** (no enforcement reads it).
2. Seed roles by **governed SQL under a PK gate** — including the **first `administrator`**. This step *cannot*
   be performed through the administrator UI, because no administrator exists yet to authorize it. Any design
   that can only grant roles through the UI is unbootstrappable.
3. **Verify** the seeded assignments read back correctly through the enforcement path, still inert.
4. **Prove the `auth.users` delete path against the new actor FK** (E.5.1) — a destructive-path proof, still inert.
   **Under the recommended `ON DELETE SET NULL`, what must be proven is that the referential action *fires and
   successfully mutates the audit row*** — not that deletion is unblocked (it is; that is why SET NULL was
   recommended). **This is conditional on E-Q13:** under `postgres` ownership the action bypasses RLS by role
   attribute and the question is moot; under a non-`BYPASSRLS` owner plus `FORCE` (A2-INV-7) it is not, and
   **whether PostgreSQL's documented RLS bypass for referential *checks* extends to referential *actions* is
   unresolved — it is not assumed in either direction here** and must be settled on a scratch table in the
   implementation lane before any production DDL. *(If PK instead elects `RESTRICT`/`NO ACTION`, the proof
   inverts: that a Supabase account deletion does not begin failing.)*
5. Enable enforcement behind the E-6 kill switch.
6. Verify each role behaves as modelled — **including at least one negative case** (a role that must be denied
   actually is).

## E.8 Getting back in, not just in

E.7 resolves bootstrap-*in*; two further invariants resolve
bootstrap-*back-in*:

- **Last-administrator protection.** Nothing may remove or self-demote the final `administrator`. **Enforced in
  the DB, not only in the UI** (C-6: the UI is not a boundary). Out-of-band recovery is governed SQL under a PK
  gate — the same mechanism as E.7 step 2.
- **Self-modification is flagged, not forbidden.** An `administrator` can do anything by design, so prohibiting
  self-edits is theatre. The useful invariant is **distinguishability**: a self-modification must be marked as
  such in the audit record, or a silent self-escalation is indistinguishable from routine administration **in
  exactly the log E-5 exists to produce**.

---

# F. Expected implementation envelope

**F.1 — ⚠ The exact file set cannot be claimed yet, and is deliberately not claimed.** It is determined by the
Section A decision: A1 (`app_metadata`) needs no migration and no CE change; A2 needs a CE migration, a read
function, and grants. Committing to a file list now would be a fabricated precision. What follows is the
*envelope*, explicitly bounded.

| Item | Expectation |
|---|---|
| **Dashboard files (likely)** | A new authorization helper (`lib/authz.ts` or similar) · guards added to the governance-write server actions and privileged route handlers · `actions/onboarding.ts` (administrator gate on invite, N-7) · UI affordance gating (convenience only) · **`middleware.ts` NOT expected to change** (C-5) |
| **CE files** | **A2 only:** one migration (role table + audit table + read function + grants). **A1:** none |
| **Migration likely?** | **Yes under A2; no under A1.** Decision-dependent |
| **RLS / grants likely?** | **Grants yes under A2** — see **F.2**, which is a hard prerequisite, not a note. **RLS is the PRIMARY boundary for A2's own objects** (C-6), and defence-in-depth everywhere else |
| **Risk tier** | **T3.** Authorization posture is production-touching by definition; DDL/grants under A2 put it ≥ T2 independently. **Nothing waived** |
| **Review chain** | Full T3: `security-auditor` · `db-rls-auditor` (mandatory — the DB is the subject under A2) · `branch-warden` · external review **pinned to the final diff hash** · independent lead re-verification · explicit PK gate · named live pre-check STOPs · **rollback proven before apply** |
| **Deployment / proof gates** | Seed-then-enforce (**E.7**) as an ordered sequence with the kill switch (**E.6**) validated **before** enforcement is enabled; live post-deploy verification that every existing read-only surface is unregressed (E-7) |

## F.2 ⚠ `pg_default_acl` — the trap is carried only half by prior lanes, and the missing half is the dangerous one

Batch 1 §10 recorded that new `public` **functions** are born anon-executable. Live `pg_default_acl` for schema
`public` carries **two** relevant entries:

| `objtype` | Default grant |
|---|---|
| `f` (functions) | `anon=X`, `authenticated=X` — the half already known |
| **`r` (relations/tables)** | **`anon=arwdDxtm`, `authenticated=arwdDxtm`** — **the missing half** |

**A role table created in `public` is therefore born INSERT/UPDATE/DELETE-able by `anon` and `authenticated`,
with RLS disabled by default, in a REST-exposed schema. That is a direct self-promotion-to-administrator
primitive reachable with nothing but the public anon key** — and it would sit behind none of C-1…C-5.

**Live proof this is not hypothetical:** schema `public` holds only three relations and **all three** carry the
born-open ACL. One of them, `public.vw_proof_ndis_yarns`, is a `postgres`-owned view with `reloptions` NULL — so
**not** `security_invoker`, meaning it executes as `postgres` (`rolbypassrls=TRUE`), granted to `anon`, in an
exposed schema: **a live anon-readable object with underlying RLS bypassed** (advisor `security_definer_view`,
ERROR). That is precisely the failure mode this section exists to prevent.

### F.2.1 Which schemas are REST-exposed — the correction that changes the placement decision

| Exposed (PostgREST) | Not exposed |
|---|---|
| `public` · **`c`** · `m` · `f` · `t` · `r` · `k` · `friction` · `graphql_public` (likely `a`) | `audit` · `ice_ro` · `op` · `auth` · `storage` · `extensions` · `realtime` · `vault` · `cron` · `net` · `supabase_migrations` |

> **⚠ This corrects an earlier draft of this brief**, which suggested schema `c` as the safer home. **`c` is
> REST-exposed and `anon`/`authenticated` both hold USAGE on it** — the *only* thing fencing a new `c` table is
> the absence of a table-level grant, with no schema-level or exposure-level backstop. Worse, **`c` has no
> *function* default-ACL row**, so a new function created there falls back to the PostgreSQL built-in default of
> `EXECUTE TO PUBLIC` — strictly more dangerous than `public`'s explicit grant because it is easier to miss.
> (Live precedent of exactly that miss: `c.handle_schedule_rule_change`, `proacl` NULL.)

**Required (A2-INV-4, A2-INV-6, A2-INV-7):** put the role and audit tables in a schema that is **not exposed**
and on which `anon`/`authenticated` hold **no USAGE** — the existing owner-only `audit` schema, or a new `authz`.
Put **only** the read function in `public`. Regardless of schema, the migration must carry in one transaction:
`REVOKE ALL … FROM PUBLIC, anon, authenticated` · `ENABLE` **and `FORCE`** `ROW LEVEL SECURITY` · a documented
policy posture (RLS + zero policies = deny-by-default is the established house pattern) · and a **fail-closed
assertion** that the resulting ACLs are as intended.

**The trap has already fired ~90 times in this database** (F-6's advisor counts). The mitigation is routinely
missed, which is exactly why it is written as an invariant rather than a reminder.

**Placement is a Gate-1 decision (E-Q10), not an implementation detail** — it is the same class of schema-shape
call as B-Q1. `public` for the tables is the worst of the three options and should be argued against explicitly;
never schema `r` (its table default-ACL makes new tables `anon`-SELECTable).

> **Verification note carried honestly:** the exposed-schema list is **platform config, not in-database state** —
> it is not readable from `pg_catalog`. The table above is settled from a captured PostgREST error message
> (2026-05-15), a PK dashboard verification (2026-06-17), a recorded `anon` probe on `c` (42501, not PGRST106),
> and working production code paths — a strong but **indirect** basis. It is mutable from the Supabase UI and has
> changed at least once. **The implementation lane must re-confirm it in the UI immediately before apply (E-Q11).**

## F.3 `search_path` for the A2 read function

House pattern for the F-5 functions is `SET search_path TO 'public'`. **Do not copy it verbatim.**

The good news first: neither `anon` nor `authenticated` holds CREATE on schema `public` (USAGE only), so the
**CVE-2018-1058 shadowing precondition is not met** for the modelled adversary — a genuine reassurance worth
recording rather than leaving unexamined.

**But `SET search_path = public` is still incomplete.** `pg_database.datacl` grants `TEMPORARY` to PUBLIC, and
PostgreSQL implicitly searches **`pg_temp` first** unless it is named explicitly — so the house pattern resolves
as `pg_temp, public`. Exploitability here is low (PostgREST gives `anon`/`authenticated` no DDL surface, and the
only arbitrary-DDL path, `exec_sql`, is `service_role`-only), but elimination is free.

**For the new function:** `SET search_path = pg_catalog, public, pg_temp` — or `''` with full qualification — and
**call `auth.uid()` schema-qualified**, which resolves regardless of `search_path`. **Do not add `auth` to the
`search_path`.** A better in-house precedent than the `exec_sql` trio already exists: the `c`/`f` trigger
functions use `{search_path=public, pg_temp}`.
**Carry forward the correction from D-2026-06-16-002:** `search_path=''` does **not** break `gen_random_uuid()`
(a `pg_catalog` core built-in since PG13). Do not re-derive that retired assumption.
*(There are 92 advisor `function_search_path_mutable` findings project-wide — the new function must not become #93.)*

## F.4 Test expectations (Batch 1's hard-won standard applies unchanged)
 Outcome-based tests are
**mutation-blind** on these paths. Evidence must use **zero-DB-call spies** + a **distinct named error identity**
+ an explicit **`invocationCallOrder`** assertion (a guard moved below the RPC still returns the right status and
would pass a naive test — C.3) + **positive controls** (a mock that genuinely resolves, else "zero DB calls" is
vacuously true because `createServiceClient` throws without env). **Grep/count-style coverage is forbidden.**
Required negative cases: unassigned user denied · wrong-role user denied · **correct-role user permitted**
(the positive control) · guard-deleted mutation caught · guard-reordered mutation caught · **role-cache mutation
caught** (a cross-request cache must fail the suite — A2-INV-3) · **service-client invocation caught**
(A2-INV-2).

## F.5 Environment constraints that will shape execution
- **No runtime logging on this Vercel plan** (production runtime logs return empty over 30 days *and* 3 hours) —
  **traffic evidence for any endpoint is unavailable**, so "no one is calling it" can never be evidenced. Design
  and review must not rely on it.
- **Vercel env vars do not reach a running deployment.** `NEXT_PUBLIC_*` vars are inlined into the client bundle
  at **build** time; server-only vars are injected into the serverless function environment at **deployment**
  time. Either way an existing deployment never observes a change and a **redeploy is always required** (proven
  live in Slice 0.1 §4). **This is why an env-var kill switch is not an emergency control — see E.6**, which
  also explains why the obvious DB-backed alternative is worse, and what to use instead.
- **Setting a Vercel env var is a PK-in-the-UI action** — the local `VERCEL_TOKEN` is invalid at User scope and
  *overrides* the CLI auth store; the connected Vercel MCP exposes no env tool.

---

## Allowed actions (this brief's own lane)

- Read-only analysis of both repos, registers, and prior lane records.
- Read-only DB reads: R0 `ice_ro` views via `scripts/db-read.py` first; `execute_sql` only where R0 cannot
  serve (catalog/`auth`/`m` reads — the DB *is* this lane's subject, permitted under CCF-02 R1 with
  `db-rls-auditor` in the chain).
- Author **this brief** and its result doc; run the §Review chain; return decisions to PK.

## Forbidden actions

- **No implementation of any kind** — no role table, no middleware change, no server-action guard, no UI gating.
- **No migration, DDL, DML, RLS change, GRANT/REVOKE, or `apply_migration`.**
- **No deploy, redeploy, env-var change, push to any `main`, or governance write.**
- **No role assignment to any account**, including PK's.
- **No account change** — no MFA enrolment, no invitation, no deactivation of the dormant account.
- **Do not approve a draft or an onboarding submission** to manufacture evidence (Batch 1 §8, standing PK ruling).
- No Batch 2 implementation · no Content Studio change · no dashboard feature expansion · no re-enabling
  `/create/capability-matrix` · no broadening into the repo-wide dynamic-SQL programme or `exec_sql` re-ownership.
- **Do not derive anchors from, or commit to, the shared checkout** `C:\Users\parve\Invegent-content-engine`
  (23 behind `origin/main`, ~285 dirty paths).
- **No register version claimed at Gate 1.** A Gate-1 brief is non-terminal → Convention 1 gives it a pointer at
  **closeout only**. **v6.10 is free but Batch 2 is a parallel documentation lane — coordinate before either
  takes it.**

## Success criteria

1. Section A returns a **recommended** role source with all eight **comparison dimensions** compared for all three options, and
   the recommendation is legible as a recommendation, not a settled decision.
2. Section B returns a minimal role set where **every** role has permitted actions, explicitly forbidden actions,
   scope, and grantor — and the enterprise-RBAC omissions are stated as deliberate.
3. Section C states, unambiguously, that middleware and hidden buttons are insufficient, **and ties it to the
   service-role/`postgres` privilege fact** — including boundary **C-6** (direct PostgREST), for which grants and
   RLS are the *primary* boundary rather than defence-in-depth.
4. Section D maps every Slice 1 action to a check, and **every under-specification is marked rather than
   invented** — including the four-vs-five discrepancy (D.3) and the no-write-RPC blocker (D.5).
5. Section E covers deny-by-default, all three unauthenticated/unassigned/unreadable behaviours, audit
   expectations, emergency rollback, read-only-route safety, **and the rollout ordering trap with its bootstrap
   resolution**.
6. Section F gives the envelope, **explicitly declines to claim an exact file set**, and names tier + chain.
7. The accountability finding (N-2…N-5) and the `inviteUserByEmail` finding (N-7) are both carried.
8. Review chain complete: `security-auditor` · `db-rls-auditor` · `branch-warden` · external review **pinned to
   the final brief hash** → PK Gate 1.
9. **Zero implementation artifacts exist** — no code, migration, role, grant, or deploy.
10. The ordering constraint (P-1 / E-Q2) is stated: **Slice 0.5 may be designed and built in parallel with Batch 2
    but must not be switched on before both `exec_sql` sinks are closed.**

## Stop condition

Return to PK with: recommended role source of truth · proposed minimal role set · the Slice 1 protected-action
map · expected implementation envelope · unresolved decisions · review verdicts.
**Then stop.** Slice 1 remains blocked pending PK approval of this brief **and** a separate implementation
authorization. Implementation is not authorized by approval of this brief alone.

---

## Notes — decisions PK is being asked to make

> **⚠ Read the `Class` column first.** This table carries **21** decisions. They are **not** equivalent, and a
> single blanket approval would be the wrong response to a SAFETY_GATE brief. Classes:
>
> | Class | Meaning |
> |---|---|
> | **[A] Blocks A2** | Must be settled **before** the role source can be approved at all |
> | **[B] Implementation gate** | Settle when the implementation lane opens, not now |
> | **[C] Sequencing** | Ordering rulings that govern when things may switch on |
> | **[D] Handoff** | Recorded, routed elsewhere, **explicitly not a blocker for this brief** |

| ID | Class | Decision | Recommendation |
|---|---|---|---|
| **A-Q0** | **[A]** | **Role source: A1 / A2 / A3** | **A2**, on **audit feasibility** first and revocation immediacy second — and **only with A2-INV-1…8 bound in** |
| **A-Q1** | **[A]** | Environment separation of role state | Expressible under A2, not under A1 |
| **B-Q0** | **[A]** | **Is the three-role set right?** (`viewer` / `governance_operator` / `administrator`) | Recommended, not settled — same status as A-Q0 |
| **B-Q1** | **[A]** | Per-client scoping | **Model now (nullable scope column), enforce later** |
| **B-Q2** | **[B]** | Expected client-user population — the still-open half of the portal question | — |
| **D-Q1** | **[C]** | **Is Slice 1 four operations or five?** (arc brief contradicts itself) | Not inferred — PK must state |
| **D-Q2** | **[B]** | Does S1-c (shared-pool promotion, cross-client blast radius) require `administrator`? | — |
| **D-Q3** | **[B]** | Is the in-UI approval a two-person rule, or may the initiator approve? | — |
| **D-Q4** | **[C]** | **Sequence the CE-side governed-write lane, or re-scope Slice 1** (N-8 / D.5) | Slice 0.5 alone does **not** unblock Slice 1 |
| **E-Q1** | **[B]** | **Kill-switch substrate** — both obvious designs fail (E.6). **Hard dependency of E.7 step 5** — it cannot slip past the moment enforcement is enabled | **Vercel instant-rollback to a pinned pre-enforcement deployment ID**, recorded before enforcement |
| **E-Q2** | **[C]** | **Ordering vs Batch 2** (precondition P-1) | Close both `exec_sql` sinks **before** enforcement is switched on |
| **E-Q3** | **[A]** | **Which schemas does PostgREST expose?** Decides C-6 severity and whether a `public` role table is anon-reachable | Routed to `db-rls-auditor`; **settle before A2 is approved** |
| **E-Q4** | **[D]** | In Next 14.2.35, is a server action invocable from an **arbitrary** route, or only a manifest-referencing one? | **Untested.** If arbitrary, the two public middleware carve-outs (F-1) become an anonymous entry point into the 34 unguarded modules — which would falsify Batch 1's "nothing was anonymously reachable" and re-order this lane's priorities |
| **E-Q5** | **[D]** | Is refresh-token revocation required on role removal? (E-8) | — |
| **E-Q6** | **[B]** | **`ON DELETE` semantics for the actor FK** — or drop the FK for write-time `EXISTS` validation? | **`SET NULL` + immutable snapshot columns** (E.5.1). Creatable (`postgres` holds REFERENCES) but **first of its kind here**. Carries a PII-retention tension |
| **E-Q7** | **[D]** | Should `cron.job` be named as an enforcement boundary or an explicit exclusion? | Batch 1 §10: `cron.schedule` has PUBLIC EXECUTE; scheduled SQL runs as `postgres` with no authz boundary and survives a code fix |
| **E-Q8** | **[D]** | `verify_jwt` posture of `onboarding-notifier` (called with **no** auth header at `actions/onboarding.ts:82-87, 128-133`, inside a swallowing `try/catch`) | Either it is anonymously callable (a boundary outside §C entirely) **or** these notification emails have been silently failing. Handoff |
| **E-Q9** | **[B]** | **Read-function shape:** zero-arg on the cookie-bound client, **or** `service_role`-only taking `p_user_id` after the server verifies `getUser()` | Zero-arg (A2-INV-1). Both viable; **building both is not** |
| **E-Q10** | **[A]** | **Which schema hosts the role + audit tables?** | A **non-exposed, USAGE-fenced** schema (`audit` or new `authz`). **Not `public`, not `c`** — both are REST-exposed (F.2.1) |
| **E-Q11** | **[A]** | Re-confirm the PostgREST exposed-schema list in the Supabase UI **immediately before apply** | It is platform config, not catalog state; mutable, and has changed at least once |
| **E-Q12** | **[D]** | Open a sibling `security-auditor` lane for the out-of-app REST surface (N-9 / C.4a) | Pre-existing; **not a blocker for approving this brief**; must **not** be silently folded in |
| **E-Q13** | **[A]** | **Should the role + audit tables be owned by a dedicated NON-`BYPASSRLS` role rather than `postgres`?** | **That is the only configuration in which A2-INV-7's `FORCE` RLS actually constrains anything** — `postgres` and `service_role` both hold `rolbypassrls=TRUE`, so under `postgres` ownership `FORCE` is inert against the definer path. Same class as E-Q10; take at the same gate. **⚠ Not free hardening:** with a non-`BYPASSRLS` owner AND `FORCE`, **three** write paths execute subject to RLS — the A2-INV-5 audit-insert function, the A2-INV-8 role-mutation function, and the E-Q6 referential action — so F.2's "RLS + zero policies = deny-by-default" house pattern would **deny all three**. Adopting E-Q13 converts a zero-policy table into one needing a deliberate minimal policy set |
| **E-Q14** | **[A]** | **Caller shape for the A2-INV-8 role-MUTATION function** — `service_role`-invoked (then `auth.uid()` is NULL) vs cookie-bound (`authenticated` needs EXECUTE on a mutation function) | **A2-INV-8 is not buildable until this is answered.** Likely: server verifies via `getUser()`, passes the **verified** uid to a `service_role`-only function — E-Q9's shape B applied to writes. Higher stakes than E-Q9: this is the role table's own write path |
| **G-1** | **[C]** | Merge the arc brief (`9e6bccf`) to `main`, or supersede it with this document | Take at the same gate — D.1/D.3/D.5 all cite an unmerged commit |
| **G-2** | **[D]** | **Register correction → `register-reconciler`.** `docs/00_action_list.md:652,658` assert *"schema `r` not REST-exposed (PGRST106)"* and use that to downgrade a finding. **Contradicted** by PostgREST's own error text, the PK dashboard verification (2026-06-17), and two live advisor findings (`r.mv_observer_freshness_summary`, `r.mv_reconciliation_daily_matrix` selectable by **`anon`** — note the advisor's "anon or authenticated" wording over-states: `authenticated` holds **no USAGE** on schema `r`) | The downgrade may still hold on its RLS leg, but its exposure premise is false. **Do not reuse that claim.** Not a blocker for this brief |
| **G-3** | **[D]** | Task-ID collision → `register-reconciler` | **Two unrelated lanes both hold `cc-0046`** — the Dashboard Operator-Capability Arc (v6.07/v6.08) and Orthogonal Gap Classification (v6.06); neither renumbered. Pre-existing |
