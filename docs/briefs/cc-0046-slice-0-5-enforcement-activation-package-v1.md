# T3 Activation Package — cc-0046 Slice 0.5 Dashboard Role Enforcement

**Created:** 2026-07-27 Sydney · **Status:** PROPOSAL — awaiting a SEPARATE PK approval. **Enforcement is OFF.**
**Tier:** T3 (production authorization posture + deploy). **This package enables nothing on its own.**
**Governing record:** `docs/briefs/results/cc-0046-slice-0-5-enforcement-readiness-v1.md` (all four prerequisites
CLEAN). Substrate applied inert at v6.37; guards produced inert at Lane C.

> **This is the "separate T3 activation package" the readiness gate reserves.** It is the ordered, gated plan to
> turn role enforcement ON. It is presented for PK approval; nothing here is executed until PK approves it and runs
> the deploy. Every irreversible step remains a PK hard stop.

---

## 0. Preconditions — all MET (evidence in the readiness doc)
- **P2 census:** E-Q2 injection-containment MET at live prod `ee02b96`; no `exec_sql` path reachable by a denied
  principal. Residual = the bound-param privileged writers this enforcement closes.
- **P1 deletion path:** normal-admin delete preserves audit history; sole-admin governed-revoke blocked (23514);
  re-bootstrap recovers; audit SET NULL + snapshots proven (Supabase branch, torn down; zero prod-auth mutation).
- **P4 resolution:** real GoTrue session → correct role; gov ACCEPT / viewer REJECT on the format+cadence bar;
  fail-closed on unassigned + NULL-sub.
- **P3 guards:** inert `requireRole()` + report-only completeness gate + F.4 suite (268 green), `branch-warden`
  safe, external review escalation cleared by PK (no concrete defect). Recorded, **unwired, undeployed**.

## 1. The ordered enable sequence (E.7 seed-then-enforce — each step a PK gate or a Convention-2 pinned sequence)

1. **Seed v1 roles for ALL operator accounts BEFORE enforcing** (E.7 ordering trap). Today only
   `pk@invegent.com = administrator` is seeded; the other 3 `auth.users` carry no role and would be denied on
   enable. Under a PK gate, grant each real operator account its role via the governed `authz.grant_role`
   (actor = an existing administrator). **PK must name the role for each account before this step.**
2. **Wire `requireRole` into the v1 governance-write set** (dashboard, isolated worktree, `ef-builder`):
   declare the 5 drift-flagged writes (`requestMoreInfo`, `markReady`, `savePublishSchedule`,
   `updatePublishProfileToggle`, `upsertContentTypePrompt`) into the manifest, flip the wired flags, set
   `ENFORCE_COMPLETENESS=true`, and **split the `inviteUserByEmail` sub-step behind `administrator`** (N-7).
   Guard placement = first statement, above `createServiceClient()` (C.3). Full F.4 mutation suite must stay green.
3. **Record the pre-enforcement deployment id** immediately before deploy (the kill-switch target — §3).
4. **Deploy** (PK-run). Standard Vercel prod deploy of the dashboard; **no `verify_jwt` concern** (dashboard is
   Next.js on Vercel, not a Supabase EF). Behind the §3 kill switch.
5. **Post-deploy verification:** each role behaves as modelled incl. **at least one negative case** (a denied role
   is actually denied) and every read-only surface (`/create/format-capability`, `/creative-library`, `/overview`,
   reporting) unregressed. No malformed-id probing of prod (guards' risk is over-rejection).

## 2. v1 enforcement scope (tight — from census §4 + Lane C manifest)
**administrator:** the split-out invite step · role grant/revoke · global format edit (`update_content_format`) ·
`activateClient`. **governance_operator:** submission approve/reject · draft approve/reject · `savePublishSchedule` ·
**`saveScheduleCapOverride`** · **`saveWeekFormatOverride`** · **`savePublishCadence`** · `updatePublishProfileToggle`
· avatar assign/clear · client-profile brand/platform/prompt/voice · `upsertDigestPolicy` · post-studio slot/intent.
**Deferred (mapped, later slice):** feeds/discovery · compliance rules · diagnostics/digest · creative-governance
(blocked on the CE write lane, D-Q4). **Out of interactive scope (separate track):** OAuth callbacks (K-1,
service-to-service).

## 3. Kill switch + rollback proof (E-6)
- **Mechanism:** Vercel **instant-rollback** to the pinned **pre-enforcement production deployment** — different
  substrate from the role source, PK-actionable in seconds without a rebuild, the proven pattern (Batch 1).
- **Pinned target (verified 2026-07-27):** **`dpl_24S4QPsPtD1YBfQakwpS1FhRmg9R`** = commit `ee02b96`, target
  `production`, state `READY`, **`isRollbackCandidate: true`** (read from the Vercel deployments API). This is the
  current live pre-enforcement deployment. **Rollback path proof:** the target exists and is a valid rollback
  candidate; the mechanism is the same Vercel instant-rollback proven in Batch 1 (`dpl_H5Ysoyd9…`).
- **STOP:** re-confirm the pin at deploy time (whatever is live immediately before the enforcement deploy) and
  record it in the activation result before enable. The live rollback **drill** is a named pre-enable STOP — enable
  is not authorized until the drill (rollback → verify pre-enforcement state → redeploy enforcement) passes.
- Non-negotiables: the flip is a deliberate PK action, never automatic; the flip is itself audited; the degraded
  state is visibly announced (E-4).

## 4. Findings that must be resolved in this package
- **F-DEL-1 (from P1):** `authz.user_role` `ON DELETE CASCADE` lets a **raw `auth.users` delete of the last
  administrator** zero the admins, bypassing the governed `revoke_role` guard. **PK decision:** add a DB-level guard
  (e.g. a `BEFORE DELETE` trigger on `auth.users` refusing the last admin, or a deferred check), OR explicitly
  accept the proven governed **re-bootstrap** as the documented recovery. Not a blocker for the proofs; a decision
  before enable.
- **C-6 named limitation (from P2):** the out-of-app PostgREST SECDEF surface (6 anon / 19 authenticated reachable)
  is structurally outside the dashboard role model. **NOT covered by this package** — a separate `security-auditor`
  grants lane. Enforcement must not be presented as covering it.

## 5. Required chain before enable (nothing waived — full T3)
`security-auditor` · `db-rls-auditor` (the DB is the subject) · `branch-warden` · **external review pinned to the
final wiring diff hash** · independent lead re-verification · **explicit PK gate** (or a Convention-2 hash-pinned
sequence) · named live pre-check STOPs · **kill-switch drill passed before enable** · rollback proven.

## 6. What this package explicitly does NOT do
Enable enforcement · wire any guard · deploy · grant any role · change any Vercel env var · touch the C-6 surface.
Those happen only under a separate PK approval of this package.

---

*Hash pin: this package's sha256 is recorded in the readiness doc and re-computed at review time; a change
invalidates any prior approval (Convention 2 / external-review rule 4).*
