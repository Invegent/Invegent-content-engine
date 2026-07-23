# Result / Record — cc-0046 Slice 0.5 Gate-2: BUILD Authorization (PK-GRANTED)

**Date:** 2026-07-23 Sydney
**Lane class / tier:** SAFETY_GATE · **T3** (authorization posture · DDL/grants/RLS · production-touching)
**Status:** **Gate-2 BUILD authorization GRANTED by PK** — build lane open (local-only). **No apply / DB mutation /
deploy / production administrator bootstrap / enforcement enablement is authorized by this ruling.** Next hard stop =
the separate **T3 apply gate**.

> **What this record is.** The canonical record of PK's Gate-2 ruling on the Slice 0.5 authorization **foundation**:
> the build lane may now implement locally from the frozen packet v2; it may not apply, deploy, bootstrap a production
> administrator, enable enforcement, or open the governed-write / Slice-1 lanes. Enforcement remains additionally
> gated on Batch 2 closeout (E-Q2).

---

## 1. Frozen artifacts (build only from these)

| Artifact | Path | sha256 | Role |
|---|---|---|---|
| **Gate-2 packet v2 (authoritative build contract)** | `docs/briefs/cc-0046-slice-0-5-gate-2-implementation-packet-v2.md` | **`e23735002fc99466818da6aca7eeb0ac74eb9630aa405d81309bc81a36a8f962`** | **Build only from this.** |
| Gate-2 packet v1 (first-review record) | `docs/briefs/cc-0046-slice-0-5-gate-2-implementation-packet-v1.md` | **`a1bc548f7518d83235494564354ca5715ca670fc98ffd3f0ee1d342492766428`** | Preserved byte-identical; historical. |

**Inherited (pinned):** decision sheet + appendix (`d5cd65f`) · result doc (register v6.11) · Gate-1 brief (`cf1e19f9…`).
**Base SHAs:** CE `9718d78` (migration base) · dashboard `6fe8d1e` (diff base).

## 2. PK Gate-2 ruling (verbatim intent — 2026-07-23)

**BUILD authorization GRANTED, subject to:**
1. Build only from frozen packet **v2** (`e2373500…`).
2. Preserve **v1** (`a1bc548f…`) as the historical first-review artifact.
3. **BLC-1/2/3 recorded as mandatory build controls and proven against the built diff** (§4).
4. **No SQL apply, database mutation, production deployment, or enforcement enablement** is authorized by this ruling.
5. **Any divergence from v2, or any BLC item that proves to require an architectural change, VOIDS the build
   authorization and returns to PK.**

**Governing distinction (PK):** v2 is the **frozen architectural + Gate-2 implementation contract**; BLC-1/2/3 are
**build-lane controls / verification requirements, not changes to the approved authorization architecture** — so no v3
is created merely to fold them in. They are carried into the build authorization, the implementation checklist, and
the built-artifact review.

## 3. Review-chain provenance (both packet versions, each pinned to its own hash)

| Reviewer | v1 (`a1bc548f…`) | v2 (`e2373500…`) |
|---|---|---|
| db-rls-auditor | `concerns` / 0 must_fix | `concerns` / 0 must_fix — **DB-security build-approvable**; wrapper chain DB-correct |
| security-auditor | `concerns` / 0 must_fix / GREEN-to-build | `concerns` / 0 must_fix / GREEN-to-build — wrapper **reduces** exposure |
| branch-warden | `safe` | `safe` (carried; sole delta = added v2 untracked doc) |
| external review | `partial` / med / no `concrete_defect` (escalated authz-home → PK ruled adopt = RC-1) | `partial` / med / no `concrete_defect` (defers Gate-2 go/no-go to PK) |

**No stop-condition triggered by either version** (privilege escalation · self-elevation · owner bypass · BYPASSRLS
exposure · unsafe SECDEF · PUBLIC exposure · request-parameter identity · UI-based authz · bootstrap permanent bypass ·
INV-9 failure · architectural contradiction). v2 folded every v1 should_fix; the authz-home refinement (RC-1) is
resolved in v2 and confirmed to reduce exposure.

## 4. BLC-1/2/3 — MANDATORY build controls (prove against the built diff)

| ID | Control | Proof requirement |
|---|---|---|
| **BLC-1** (db-rls SF-A / SEC-SF-A) | The canonical `authz.current_operator_role()` REVOKE **literally names `service_role`** (it holds `authz` schema USAGE; "revoke-from-PUBLIC-alone" is insufficient). | Built migration REVOKE names PUBLIC+anon+authenticated+service_role; the fail-closed ACL assertion checks `service_role` has NO EXECUTE on the canonical fn. |
| **BLC-2** (db-rls SF-B / SEC-SF-B) | In the mutation fn, the actor-administrator lookup **keys on `p_verified_actor_uid`** (NOT the `auth.uid()`-keyed canonical primitive — `auth.uid()`=NULL under the service client). "via the canonical primitive" wording is **struck**. | Built mutation body keys invariant-1 on `p_verified_actor_uid` + re-checks `role='administrator'`; test proves a non-admin verified uid is denied and no cookie-bound path can invoke the fn. |
| **BLC-3** (SEC-SF-C) | The sole REST-exposed wrapper returns **`authz.current_operator_role()::text`** (severs the `authz`-enum dependency from the exposed surface). **Guardrail (non-waivable): if the enum is retained and PostgREST cannot serialize it, the fix is the text-cast — NEVER granting `authenticated` USAGE on `authz`** (that breaks A2-INV-4 fencing). | Built wrapper returns text; live-proof confirms serialization with no `authz` USAGE grant; the guardrail is recorded so the enable-gate cannot widen fencing to make a feature work. |

**Also binding (packet-standing):** schema-qualify every reference in the mutation body (RC-2); migration name = a new
sequential number + distinct name, collision-checked against applied migrations; both **pre-apply scratch-table
proofs** (policy interaction; `ON DELETE SET NULL` under FORCE RLS); the `requireRole()` completeness build-gate (RC-6).

## 5. Build-lane boundaries (PK)

**MAY (now, local-only):** create the migration locally · implement the dashboard authorization adapter
(`lib/authz.ts`) + EP-1/EP-2/EP-3 protections · local tests, scratch proofs, mutation testing · obtain the **full
review chain against the EXACT built migration + dashboard hashes** · prepare rollback artifacts.

**MAY NOT:** apply the migration · deploy dashboard changes · bootstrap a production administrator · enable enforcement
in production · begin the governed-write lane · begin Slice 1.

**Next hard stop:** the separate **T3 apply gate**, after the built artifact and its final reviews are returned to PK.
Enforcement additionally stays off until Batch 2 closeout (E-Q2); the AMBER enable-gate preconditions (Batch-2 closure
verified · both scratch-proofs PASS · E-Q11 exposed-schema reconfirm · pre-enforcement Vercel deployment ID recorded)
are non-waivable and belong to the apply/enable phase, not this build authorization.

## 6. Git

Docs-only commit (Gate-2 outcome settled): frozen v1 review record · frozen v2 authoritative packet · this
build-authorization record · register pointer (v6.12). branch-warden-gated push. No implementation or migration
artifact is included in this commit — those are produced in the build lane and reviewed on their own hashes.
