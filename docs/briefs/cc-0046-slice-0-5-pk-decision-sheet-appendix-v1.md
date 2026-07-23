# Evidence Appendix — cc-0046 Slice 0.5 PK Decision Sheet

**Companion to:** `docs/briefs/cc-0046-slice-0-5-pk-decision-sheet-v1.md`
**Full narrative source (PK-APPROVED Gate 1):** `docs/briefs/cc-0046-slice-0-5-dashboard-governance-authorization-model-brief-v1.md` (sha256 `cf1e19f9…`)
**Purpose:** back every ruling in the one-page sheet with its evidence, and record the live re-verification performed this lane. The main sheet stays compact; the weight is here.

---

## A. Canonical-state verification (this lane)

| Check | Result |
|---|---|
| CE `origin/main` | `194e43e` — carries the PK-approved brief (`5d8ae1b`) + register v6.10 (`194e43e`); branch `claude/slice-0-5-auth-decisions-b0frc7` == main (0 ahead) |
| Dashboard `origin/main` | `1572fbd` — **identical to the brief's evidence SHA**, so the dashboard threat model is current, not stale |
| Brief Gate-1 status | PK-APPROVED (register v6.10); recorded next gate = "PK settles the [A]-class decisions" — i.e. this sheet |
| Two open `exec_sql` sinks | **Both re-confirmed open at `1572fbd`, in-file** (see §C) |

## B. Live DB re-verification of the [A]-blocker basis (orchestrator `execute_sql`, project `mbkmaxqhsohbtwsqolns`, this lane)

> The `db-rls-auditor` subagent had **no** live read path this session (`db-read.py` → "no credential"; Supabase MCP
> not exposed to the subagent) and correctly **refused to fabricate** — returning `concerns` = "unverified", not a
> false pass. The orchestrator holds `execute_sql`, so the seven catalog/auth fact-sets were re-derived here directly.
> This is read-only catalog/auth verification, permitted for this decision lane under CCF-02 R1 (the DB is the subject).

| # | Fact (grounds) | Expected | **Observed live** | Verdict |
|---|---|---|---|---|
| 1 | **BYPASSRLS floor** (E-Q13, C.1) | pg=T, sr=T, anon=F, auth=F | `postgres` rolbypassrls=**true**, `service_role`=**true**, `anon`=**false**, `authenticated`=**false** | ✅ match |
| 2 | **No role data** (N-6, A-source both-empty) | ~4 users, 0 role keys, no role table, no authz schema | `auth.users`=**4**; `raw_app_meta_data ? 'role'`=**0**; `raw_user_meta_data ? 'role'`=**0**; app-schema role/permission/authz table=**0**; `authz` schema=**absent** | ✅ match¹ |
| 3 | **Schema USAGE** (E-Q3/E-Q10/C-6, G-2) | public+c both; audit/ice_ro none | `public` anon+auth=**USAGE**; `c` anon+auth=**USAGE**; `audit`=**none/none**; `ice_ro`=**none/none**; **`r` = anon USAGE, authenticated NONE** | ✅ match (+ G-2 validated) |
| 4 | **pg_default_acl trap** (F.2, A2-INV-4/6) | public tables born anon/auth=arwdDxtm; public fns anon/auth=X; c no fn row | `public` objtype `r` = **`anon=arwdDxtm, authenticated=arwdDxtm`**; objtype `f` = **`anon=X, authenticated=X`**; schema `c` has **no `f` (function) default-ACL row** | ✅ match² |
| 5 | **portal_user + auth_client_id precedent** (N-6 qual, A2-INV-6) | RLS on-not-forced, born-open ACL, 1 SELECT policy; fn mutable search_path + PUBLIC EXECUTE | `portal_user`: relrowsecurity=**true**, relforcerowsecurity=**false**, relacl=**`{…anon=arwdDxtm, authenticated=arwdDxtm…}`**, **1** policy, cmd=**SELECT**; `auth_client_id()`: proconfig=**NULL**, prosecdef=**true**, proacl leading **`=X`** (PUBLIC), owner=postgres, STABLE | ✅ match (all 3 defects live) |
| 6 | **Actor-FK feasibility** (E-Q6, E.5.1) | postgres REFERENCES=TRUE; only auth→auth FKs | `has_table_privilege('postgres','auth.users','REFERENCES')`=**true**; FKs referencing `auth.users`=**8**; from a **non-auth** schema=**0** | ✅ match³ |
| 7 | **F-5 privileged fns** (F-5/F-6) — 3 named, verified | each SECDEF, owner postgres, `{postgres,service_role}` only | `exec_sql`, `draft_approve_and_enqueue`, `approve_onboarding` — each **prosecdef=true**, owner=**postgres**, proacl=**`{postgres=X, service_role=X}`** (anon/authenticated/PUBLIC absent) | ✅ match⁴ |

**Footnotes (honest nuances — recorded, not buried):**

- **¹** The name-pattern scan returned exactly one hit, `auth.oauth_authorizations` — a **Supabase-internal `auth`
  schema** table, not an application role table. N-6's claim ("no role table in any non-system schema") therefore
  holds; the match is a false positive from including schema `auth` in the ILIKE sweep.
- **²** Refinement to the brief's occasional loose framing of schema `c`: `c`'s **table** default-ACL is
  `{service_role=r, inspector_ro=r}` — i.e. a new `c` *table* is **not** born-open to anon/authenticated (unlike
  `public`'s `arwdDxtm`). This does **not** change the E-Q10 ruling: `c` is still excluded because it is REST-exposed
  **with** anon/authenticated USAGE (item 3) **and** has no function default-ACL row, so a new `c` *function* falls back
  to the PostgreSQL built-in EXECUTE-TO-PUBLIC default (the more-dangerous, easier-to-miss half — brief F.2.1). The
  fenced-schema recommendation (`audit`/`authz`) is the correct home regardless.
- **⁴** Count nuance: F-5 names **three** functions while the brief's F-6 prose says "the four functions named in
  F-5" (a self-inconsistency at brief lines 103–104). This lane verified the **three** named (`exec_sql`,
  `draft_approve_and_enqueue`, `approve_onboarding`); all are `{postgres, service_role}`-only, so the count
  discrepancy is not security-material. Flagged for the brief's own cleanup, not a finding against the placement rulings.
- **³** The brief states "18 existing FKs into `auth` are all auth→auth"; this lane measured **8** FKs referencing
  specifically `auth.users` (a subset of the `auth`-schema total — consistent, not contradictory). The load-bearing
  claim — **zero** FKs into `auth.users` from a non-auth schema — is confirmed, so the proposed actor FK would indeed
  be first of its kind and the E.5.1 `ON DELETE`-untested caveat stands.

**Standing limitation (unchanged by this verification):** the PostgREST **exposed-schema** list (E-Q3/E-Q11) is
platform config, **not** catalog-readable. Items 3–4 verify the in-DB USAGE/ACL facts *underneath* the exposure
premise; they do not verify exposure itself. **The implementation lane must re-confirm the exposed-schema list in the
Supabase UI immediately before any apply (E-Q11).**

## C. The two open `exec_sql` sinks (dashboard `1572fbd`, re-read in-file this lane)

| Sink | Location | Observed |
|---|---|---|
| Sink 1 (higher severity) | `app/api/onboarding/run-scans/route.ts:5-24` | `POST` handler; `submission_id` taken straight from `request.json()`; **no in-handler identity check**; interpolated directly into `exec_sql`: `WHERE submission_id = '${submission_id}'` |
| Sink 2 | `app/(dashboard)/actions/onboarding-scans.ts:~73` (`getSubmissionScanResults`) | `'use server'` export; `submissionId` interpolated into `exec_sql`: `WHERE submission_id = '${submissionId}'` |

Both call `exec_sql` (SECURITY DEFINER, owner `postgres`, `rolbypassrls=TRUE`, no statement filter — item 7). This is
the mechanical basis for **E-Q2** (Batch-2-before-enable) and the P-1 consequence: the named adversary retains
arbitrary SQL as `postgres` → can write their own `administrator` row and spoof `auth.uid()` via `set_config`. A
"SELECT-only" shape is not containment (a SELECT can call a volatile function).

---

## D. Enforcement-boundary matrix (task §Priority 7 — six boundaries)

| # | Boundary | Min role / requirement | Server-side point | Failure response | Audit | UI hiding supplementary? | Existing bypass risk |
|---|---|---|---|---|---|---|---|
| **C-1** | Server actions (`'use server'`) | **Mandatory** role check as first statement | Above `createServiceClient()` in each governance-write export | 401/403, distinct error identity | Yes (E-5) | Supplementary only | **Yes** — 34/35 modules unguarded today; directly invocable POST endpoints |
| **C-2** | Route handlers (`app/api/**`) | **Mandatory** for privileged routes | First statements, above `req.json()` + `createServiceClient()` | 401/403 | Yes | Supplementary only | Batch 1 precedent (`drafts/action`, `series/action`) |
| **C-3** | DB functions / policies | Defence-in-depth, **NOT primary** | New Slice 1 write fns take + validate an explicit actor arg | deny | n/a | n/a | RLS ineffective on the `postgres` definer path (items 1,7) |
| **C-4** | UI visibility | **Convenience only** | — | hide dead controls | n/a | **This IS the "merely supplementary" row** — never enforcement, never review evidence | n/a |
| **C-5** | Middleware | Auth gate only, unchanged | — | redirect `/login` / 401 | n/a | n/a | Not extended into authz (keeps boundary legible) |
| **C-6** | **Direct PostgREST by `authenticated`** | **Grants + RLS are the SOLE + PRIMARY boundary** | DB grants/RLS on every A2 object | PostgREST 401/403 | via DB | n/a | **This is the boundary C-1…C-5 structurally cannot cover** — anon key is public; `authenticated` has `rolbypassrls=FALSE` so grants+RLS *are* effective here (item 1) |

**Named out-of-scope limitation (C.4a):** ~18 SECURITY DEFINER functions are directly REST-invocable by any
`authenticated` principal (~12 `friction.*` writes) — a **grants** problem for a separate `security-auditor` lane
(E-Q12), **not** something the role model covers. Slice 0.5 must not be presented as covering the whole authz surface.

## E. Role model (task §Priority 2 — full table)

| Role | Permitted | Forbidden | Default? | No role row / disabled / stale | Inherits |
|---|---|---|---|---|---|
| `viewer` | Read all existing read-only surfaces | Any governance write, approval, invite, role change | **Yes — default for every account incl. invitees** | deny (E-1/E-3) | — |
| `governance_operator` | 4 Slice 1 writes + draft approval + onboarding approve/reject | Invite/create users (N-7), grant/revoke roles, enforcement config | No | deny | — |
| `administrator` | All `governance_operator` + grant/revoke roles + invite | Nothing in-model → **audit-critical** | No | deny | **Yes — inherits `governance_operator`** |

Permissions **separately enumerated per role**, not additive across a hierarchy (only `administrator`⊃`governance_operator`
is an inheritance). **Deliberately not built:** permission matrices, custom roles, group/team objects, delegated admin,
time-boxed grants — no evidence justifies them at 4 accounts.

## F. The eight binding invariants (A2 acceptance conditions — verbatim intent)

| ID | Invariant | Live grounding this lane |
|---|---|---|
| A2-INV-1 | Role-read fn takes **zero args**; identity from `auth.uid()` only | E-Q9 shape A |
| A2-INV-2 | Read on the **cookie-bound** user client, never the service client (`auth.uid()` is NULL under service-role JWT → total self-DoS) | item 1 (service_role has no `sub`) |
| A2-INV-3 | **No cross-request role caching** (a per-request memo only) | prevents silent A2→A3 degradation |
| A2-INV-4 | Role/audit tables in a **non-exposed, USAGE-fenced** schema; only the read fn in `public` | items 3, 4 (`public`/`c` exposed+USAGE; `audit`/`ice_ro` fenced) |
| A2-INV-5 | Audit table **append-only w.r.t. the app principal** (REVOKE UPDATE/DELETE from `service_role`; INSERT-only SECDEF fn) | — |
| A2-INV-6 | Every REVOKE names **PUBLIC + anon + authenticated** in the CREATE migration | item 4 (explicit anon/auth default grants survive a PUBLIC-only revoke); item 5 (portal_user is the near-miss) |
| A2-INV-7 | Tables `ENABLE` **and `FORCE`** RLS | item 1 — `FORCE` only bites under a **non-`BYPASSRLS`** owner (E-Q13) |
| A2-INV-8 | Role **mutations** only via an `administrator`-checking SECDEF fn (fenced schema; `service_role` USAGE+EXECUTE, no direct DML) | **not buildable until E-Q14 resolves the caller shape** |

## G. Audit contract (task §Priority 8)

Minimum authorization-audit event: `actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL`
(E-Q6) **+ immutable `actor_uid_snapshot uuid NOT NULL` + `actor_email_snapshot text NOT NULL`** · target identity ·
old role · new role · action · reason · timestamp · correlation/request id where available · outcome. Append-only
w.r.t. the app principal (A2-INV-5). Readers: `administrator` only. Retention survives account deletion (snapshot).
Self-modifications **flagged, not forbidden** (E.8). **Separated from application activity logging** — `m.system_audit_log`
is a health-check run log, not an actor log (N-4), and the six Slice 1 target tables carry **zero** audit triggers today.

## H. Review-chain provenance (from the approved brief)

security-auditor rev-1 (9 must-fix) · db-rls-auditor (6 must-fix — settled the exposed-schema question) · security-auditor
rev-2 (caught a self-introduced FORCE-RLS/C.1 contradiction + 5) · security-auditor rev-3 (4, incl. the E-Q14 fork) ·
branch-warden (stop → benign origin move, FF'd) · external review `0b9096f3` pinned `cf1e19f9` (partial → PK, medium
risk, **no `concrete_defect`**, `policy_decision` character). Every verdict drove a real correction; none rubber-stamped.

## I. Decision-count reconciliation

Seed named **21** open questions. Review split two write-path forks out during the security-auditor passes — **E-Q13**
(ownership/FORCE-RLS) and **E-Q14** (role-mutation caller shape) — giving **23** substantive A/B/D/E decisions. G-1/G-2/G-3
are register housekeeping, not decisions on this architecture. The main sheet classifies all 23 and routes the 3 G-items.
