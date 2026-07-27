# Result — cc-0046 Slice 0.5: Enforcement Readiness (four prerequisites)

**Date:** 2026-07-27 Sydney · **Lane class / tier:** SAFETY_GATE
**Outcome:** ✅ **ALL FOUR PREREQUISITES COMPLETE** — proofs clean, guards produced inert; **enforcement OFF**.
**Governing docs:** authorization-model brief `cc-0046-slice-0-5-dashboard-governance-authorization-model-brief-v1.md` ·
protected-action census `cc-0046-slice-0-5-protected-action-census-v1.md` (v1.1) · inert role-source apply
result `cc-0046-slice-0-5-role-source-inert-apply-result-v1.md` (v6.37).

> **The gate (PK, standing):** No role enforcement becomes active until all four proofs below are clean and PK
> approves a **separate T3 activation package**. This document produces the proofs/artifacts; it does not enable
> enforcement and authorizes no enable.

**Baseline (verified 2026-07-27):**
- Dashboard live production = commit **`ee02b96`** ("per-client publish-cadence editor, Path B") =
  deployment **`dpl_24S4QPsPtD1YBfQakwpS1FhRmg9R`** (target production, READY, rollback candidate). Verified
  from the Vercel deployments API — the deployed SHA, not just `origin/main`.
- DB substrate = the v6.37 inert `authz` schema (`user_role`/`role_audit` + `current_user_roles()` read fn +
  `grant_role`/`revoke_role`), `pk@invegent.com` seeded `administrator`. **ENFORCEMENT OFF.**

---

## Prerequisite 2 — Fresh `exec_sql` / privileged-bypass-surface census ✅ CLEAN

**Tier T2 · read-only · authorizes nothing.** Chain: `db-rls-auditor` (DB catalog facts) → `security-auditor`
(caller census + verdict). Baselined at dashboard `ee02b96` (read-only worktree pinned to the deployed SHA) +
the live DB catalog (project `mbkmaxqhsohbtwsqolns`).

### DB-side facts (`db-rls-auditor`)
- **`public.exec_sql` unchanged:** SECURITY DEFINER, owner `postgres` (`rolbypassrls=TRUE`), grants
  **`{postgres, service_role}` only** (anon/authenticated/PUBLIC absent); body concatenates the caller `query`
  into `EXECUTE` with **no filter/allowlist/parameterisation** — the total-authority primitive.
- **Privileged floor** (draft/onboarding/schedule/format/prompt writers) all SECDEF/postgres/`{postgres,
  service_role}` only.
- **Path B `save_publish_cadence` / `get_publish_cadence`:** SECDEF, owner postgres, `{postgres, service_role}`
  only, `search_path=''` — **correctly service-role-fenced; no anon/authenticated grant added.**
- **authz trio:** `grant_role`/`revoke_role` = `{postgres, service_role}`; `current_user_roles` additionally
  EXECUTE to `authenticated` (the intended enforcement read-path / C-6 exposure). Substrate INERT.
- **Out-of-app REST reachability (schema-USAGE-filtered):** **6 anon / 19 authenticated** truly-reachable SECDEF
  functions — advisor raw 41/50 **over-counts** (schema `m`'s 30 are unreachable: no anon/authenticated USAGE).
  Reachable set includes 12 `friction.*` case-mutation writers, `f.run_ai_worker_cron_v1`,
  `f.ai_worker_lock_jobs_v1`, `c.handle_schedule_rule_change`, `public.auth_client_id`.
- Advisors: `function_search_path_mutable`=92 (unchanged), `security_definer_view`=3, `rls_enabled_no_policy`=57
  (incl. the two inert authz tables + Path B `c.publish_cadence_change_log` — expected, enforcement-off).

### Caller-side census + verdict (`security-auditor`)
- **7/7 caller-controllable `exec_sql` containment HOLDS at `ee02b96`** — every sink keeps its
  `assertUuid`/`assertClientSlug`/`UUID_RE` shape-validator as the **first statement** above the privileged call
  (zero-DB-call-on-reject). `app/api/onboarding/run-scans/route.ts` confirmed **absent**. `discovery-keywords.ts`
  (the prior "false positive") does validate. Non-caller interpolations (constants, whitelisted enums,
  DB-derived ids in `clients/page.tsx`, quote-doubled) correctly excluded.
- **New-since-`524ca6d` delta:** Path A (`saveScheduleCapOverride`) and Path B (`savePublishCadence`) are
  **both bound-param; neither adds an `exec_sql` injection sink.**
- **✅ VERDICT: E-Q2 ("no `exec_sql` path reachable by a principal the role model intends to deny") is MET at
  `ee02b96`** — stated as a property, not a batch name.

### Residual — the role model's job, NOT containment (ranked by blast radius)
These are bound-param privileged writers, all **authenticated-equivalent with no role check**. None breaks E-Q2;
each is what enforcement (Lane C/D map) must close before enable:
1. `savePublishCadence` → real publishing throughput (credential table, bounded server-side). **HIGH**
2. onboarding lifecycle (`approveSubmission`→`approve_onboarding` + user invite; `activateClient`). **HIGH**
3. draft-approval writers (`draft_approve_and_enqueue`/`draft_set_status`). **HIGH**
4. `upsertDigestPolicy` / `saveWeekFormatOverride` / `addDiscoverySeeds`. **MEDIUM**
5. `saveScheduleCapOverride` (planning ceiling, advisory). **LOW**
6. **C-6 out-of-app SECDEF REST surface** (6 anon / 19 authenticated) — structurally outside the dashboard role
   model. **NAMED LIMITATION.** Handoff to `db-rls-auditor` for the directly-invocable-vs-trigger-only split.

### Non-blocking should-fix (defense-in-depth, inert today)
Two quote-doubled interpolants — `actions/client-creative-config-audit.ts:100`,
`actions/client-creative-evidence.ts:99` (`C = clientId.replace(/'/g,"''")`) — are inert (callers pass DB-derived
ids) but weaker than the `assertUuid`-first fleet pattern. Upgrade for consistency when those files are next edited.

**Census status: COMPLETE, CLEAN.** E-Q2 met; residual + C-6 limitation recorded for the role model / a separate
decision. Read-only — nothing applied, no rollback needed.

---

## Prerequisite 1 — `auth.users` deletion-path proof ✅ PROVEN (Supabase branch, torn down)

**Tier T3 · branch-isolated · PK-authorized (2026-07-27).** Ran on a temporary Supabase branch
(`bzgljlrqvwtxjevcdcjw`, `with_data=false`) with the `authz` migration applied and four real GoTrue-loginable
scratch identities (`admin_a`, `admin_b`, `gov`, `viewer`). **Zero production `auth.users` records created or
modified** — every write targeted the branch by its `project_id`. Branch **deleted** at completion (only `main`
remains). *(Branch auto-migration replay reported `MIGRATIONS_FAILED` on unrelated prod migrations; I applied the
`authz` migration to the branch directly — same SQL — and verified its posture matched production before proving.)*

| Required proof | Result | Evidence |
|---|---|---|
| **Deleting a normal administrator preserves audit history** | ✅ | Deleted non-sole `admin_a` (a 2nd admin `admin_b` present): its `authz.user_role` row **CASCADE-removed** (0), its **4 authored audit rows survive** with `actor_user_id` **SET NULL** but `actor_email_snapshot`/`actor_uid_snapshot` **intact**; deletion not blocked |
| **Sole administrator cannot be removed** (governed path) | ✅ | With `admin_b` the sole admin, `authz.revoke_role(admin_b→admin_b,'administrator')` raised **`23514` "cannot remove the last administrator"**; atomic (admin_b unchanged). Bonus: a non-admin `gov` revoke raised **`42501`** (actor gate) |
| **System not left unrecoverable / re-bootstrap works** | ✅ | Characterized the **sole-admin CASCADE lockout** honestly: a **raw** `auth.users` delete of the last admin bypasses the RPC guard and zeroes admins (guard lives in the RPC, not on `auth.users` deletion). Then the **governed §3 bootstrap** restored an administrator from zero (`admin_c`) → **recoverable** |
| **Audit integrity across the run** | ✅ | Final branch state: 5 audit rows, **all snapshots intact**, 4 actor-FKs nulled by deletions — accountability outlives account deletion |

**Finding for the activation package (F-DEL-1):** the `ON DELETE CASCADE` on `authz.user_role` means deleting the
**last administrator's `auth.users` account** silently zeroes administrators (governed `revoke_role` is bypassed).
Recovery is the governed re-bootstrap (proven). The activation package should either add a DB-level guard against
deleting the last admin's `auth.users` row, or explicitly accept re-bootstrap as the documented recovery.

---

## Prerequisite 3 — Enforcement guards + kill switch + protected-action map ✅ PRODUCED (inert) · external review → PK

**Tier T3 · authors INERT artifacts · no deploy/merge/wiring.** Built via `ef-builder` in isolated dashboard
worktree `claude/cc0046-requirerole-inert` (off `ee02b96`). Review packet sha256
**`beca046d84b38ce73bb8485b5d5c45893c2a22fae4339b8b5e239c71cdc5d255`** (4 files, 520 lines).

### Guards (INERT — wired into nothing)
- **`lib/authz/require-role.ts`** — `requireRole(allowed: Role[])`: resolves identity on the **cookie-bound
  client** (`createSupabaseServerClient().auth.getUser()` FIRST; never the service client — A2-INV-2), reads
  `current_user_roles()` on that same client, **fails closed** on RPC error → `ForbiddenRoleError`, drops unknown
  roles, **deny-by-default** intersection (E-1), no cross-request cache (A2-INV-3). Distinct `UNAUTHENTICATED` /
  `FORBIDDEN_ROLE` error codes (house style). Lead-verified + `branch-warden` `safe`.
- **`lib/authz/protected-actions.ts`** — typed `PROTECTED_ACTIONS` manifest (8 governance-write exports, all
  `wired:false`) with proposed role per PK rulings; OAuth (K-1) excluded; draft write mapped to its true sink
  `app/api/drafts/action/route.ts#POST` (not `approvals.ts`, which is read-only); invite-as-admin sub-step noted.
- **Completeness gate** (`tests/authz-completeness.test.ts`) — **report-only** (`ENFORCE_COMPLETENESS=false`,
  never fails the build); its drift detector is genuinely live — it flagged 5 undeclared governance writes
  (`requestMoreInfo`, `markReady`, `savePublishSchedule`, `updatePublishProfileToggle`, `upsertContentTypePrompt`)
  as `console.warn`. These must be declared before the switch can be flipped in the activation package.
- **`tests/require-role.test.ts`** — 11 F.4 mutation cases (unassigned/wrong-role/correct-role · UNAUTH vs
  FORBIDDEN code distinction · RPC-error fail-closed · unknown-role drop · **A2-INV-2** service-client-never-used ·
  **A2-INV-3** two-calls⇒two-reads · **invocationCallOrder** ordering). Full suite **268 pass**; `tsc`/`next build`
  clean; `git status` only new files (additive, inert).

### Kill switch (E-6) — pinned
Vercel **instant-rollback** to the pre-enforcement deployment **`dpl_24S4QPsPtD1YBfQakwpS1FhRmg9R`** (`ee02b96`,
current live prod, rollback candidate) — different substrate from the role source, PK-actionable without rebuild.
**Re-confirm the pin at enforcement-deploy time** (the last pre-enforcement deployment id, whatever is live then).

### Protected-action map (against live `ee02b96`)
The manifest above = the proposed enforcement-v1 set; the **complete** map is census v1.1 §2 + Lane A's ranked
residual (the 5 drift-flagged writes are governance_operator in census §2). PK rulings carried: N-7 SPLIT
(approve=G / invite=A) · H-1 `activateClient`=A · D-Q2 shared-promotion=A · K-1 OAuth=service-to-service.

### Chain / gate status
- `branch-warden` **safe** · orchestrator lead-review clean · **external review `partial` → escalated to PK**
  (medium risk, high confidence, **no concrete defect / no pushback point**): the reviewer raised no fault in the
  guard logic and escalated on (a) the general principle that a security mechanism warrants PK oversight
  [`policy_decision`] and (b) a request for adversarial **runtime** testing of `current_user_roles()`
  behaviour — role-injection, misconfiguration, races [`runtime_verification_required`].
- **Routing:** (a) is a PK oversight decision, not a defect to fix. (b) is delivered by **Prereq 1** (substrate
  delete/audit behaviour) and **Prereq 4** (live actor→role resolution), plus Lane A's already-proven E-Q2
  (no denied principal reaches `exec_sql`, so `request.jwt.claims`/`auth.uid()` cannot be spoofed by the modelled
  adversary). No autonomous clear — surfaced to PK; the artifact stays inert/unmerged.

**Artifact PRODUCED + locally verified inert. Not merged, not deployed, not wired.** Wiring + enabling is the
separate PK activation package.

---

## Prerequisite 4 — Weekly-format + cadence actor-resolution proof ✅ PROVEN (same branch)

**Tier T3 · proof-only · enforcement OFF.** On the same branch, using **real GoTrue-issued JWTs** (real
`POST /auth/v1/token?grant_type=password` sign-ins, HTTP 200, ES256 tokens with `sub` = each user's `auth.users`
id — not mirror tables):

| Required proof | Result |
|---|---|
| **A real non-admin authenticated session resolves to `governance_operator`** | ✅ `gov`'s real JWT claims → `current_user_roles()` = **`governance_operator`** (client_id NULL) |
| **Weekly-format + cadence controls accept the correct role and reject a viewer** | ✅ Applying `requireRole(['governance_operator'])` (the bar for `saveWeekFormatOverride` / `saveScheduleCapOverride` / `savePublishCadence`) to the **real** resolved role sets: `gov` = {governance_operator} → **ACCEPT**; `viewer` = {viewer} ∩ {governance_operator} = ∅ → **REJECT** (deny-by-default) |
| **Fail-closed** | ✅ unassigned uid → 0 rows; **NULL-sub (service-role-equivalent) → `auth.uid()` NULL → 0 rows** (A2-INV-2 — the exact reason `requireRole` must use the cookie-bound client) |

**Fidelity boundary (stated honestly):** the branch's PostgREST HTTP layer was degraded (`PGRST002`, schema-cache,
an artifact of the branch's `MIGRATIONS_FAILED` state), so the final REST hop could not be exercised. The
**security-critical resolution** (verified-JWT `sub` → `auth.uid()` → `current_user_roles()` → `authz.user_role`,
executed **as the `authenticated` role**, using the *actual claims from real GoTrue-issued tokens*) was proven at
the DB layer — exactly what PostgREST does internally after verifying the signature. The application segment
(`requireRole` calling the cookie-bound client, ordering, no-cache) is proven by Lane C's green unit suite. GoTrue
issuance itself was real. This is **not** a mirror-table proof: the real function, real table, real `authenticated`
role, and real JWT-derived identity were used throughout.

---

## Consolidation & the reserved gate

**All four prerequisites are complete and clean; enforcement remains OFF.**

| # | Prerequisite | Status |
|---|---|---|
| 2 | Fresh `exec_sql` / privileged-sink census | ✅ CLEAN — E-Q2 met at `ee02b96` |
| 1 | `auth.users` deletion path + last-admin + audit integrity | ✅ PROVEN (branch, torn down; no prod-auth mutation) |
| 4 | Weekly-format + cadence actor→role resolution | ✅ PROVEN (real GoTrue JWTs; gov ACCEPT / viewer REJECT) |
| 3 | Enforcement guards + kill switch + action map | ✅ PRODUCED inert; external escalation cleared by PK (no defect) |

**Separate hash-pinned T3 activation package delivered:**
`docs/briefs/cc-0046-slice-0-5-enforcement-activation-package-v1.md` — sha256
**`fc7a1f8767aa7fd85fd2d3168779da41001dff3762637cbb41cefed7ad87e43b`**. It carries the ordered E.7 seed-then-enforce
sequence, the v1 scope, the **kill-switch pin + rollback proof** (`dpl_24S4QPsPtD1YBfQakwpS1FhRmg9R` = `ee02b96`,
verified `isRollbackCandidate:true`; live drill is a named pre-enable STOP), the F-DEL-1 last-admin-delete decision,
the C-6 named limitation, and the full-T3 chain requirement.

**Enabling role enforcement requires a SEPARATE PK approval of that activation package** — nothing in this lane
enables enforcement, wires a guard, deploys, or grants a role. The guard files remain unwired/undeployed per PK's
ruling. **STOP here for PK.**
