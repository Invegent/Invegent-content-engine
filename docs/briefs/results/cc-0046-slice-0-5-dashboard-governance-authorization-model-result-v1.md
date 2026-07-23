CLAIMED v6.11 · cc-0046 Slice 0.5 authorization-architecture PK rulings · shared worktree (branch claude/slice-0-5-auth-decisions-b0frc7) · Gate-1 decision closeout · 2026-07-23 Sydney

# Result — cc-0046 Slice 0.5: Dashboard Governance Authorization Model — PK RULINGS (Gate-1 decision closeout)

**Date:** 2026-07-23 Sydney
**Lane class / tier:** SAFETY_GATE · T1 (documentation/architecture only)
**Status:** **CLOSED — all Gate-1 architecture decisions RULED by PK.** Authorizes NO implementation.
**Brief:** `docs/briefs/cc-0046-slice-0-5-dashboard-governance-authorization-model-brief-v1.md` (PK-APPROVED Gate 1, sha256 `cf1e19f9…`)
**Decision pack ruled on:** `docs/briefs/cc-0046-slice-0-5-pk-decision-sheet-v1.md` + `…-appendix-v1.md` (branch commit `d5cd65f`)
**Repo coordinates:** CE `origin/main` `194e43e` · dashboard `origin/main` `1572fbd` (= the brief's evidence SHA — no drift)

> **What this record is.** The canonical record of PK's rulings on the Slice 0.5 authorization architecture. It
> settles the architecture; it authorizes **no** implementation, migration, role table, grant, RLS change, deploy, or
> governance write. Slice 0.5 implementation requires a **separate T3 Gate-2 authorization** (program step 5), and it
> must not be *enabled* until Batch 2 closes both `exec_sql` sinks.

---

## 1. Lane summary

The Slice 0.5 decision lane reconstructed the dashboard authorization architecture from canonical evidence, reduced
the 21 seed questions (23 after two forks split out in review) into a one-page decision sheet, re-verified the
load-bearing DB facts live against canonical state, and returned the [A]-blocker + sequencing decisions to PK.
**PK ruled 2026-07-23: every recommendation approved as tabled, plus one new permanent invariant and a fixed program
order.**

**Re-verification performed this lane (orchestrator `execute_sql`, project `mbkmaxqhsohbtwsqolns`):** all 7
[A]-blocker DB fact-sets re-derived live — **zero material contradictions** (detail: decision-sheet appendix §B).
The `db-rls-auditor` subagent had no DB credential this session and correctly refused to fabricate; the orchestrator
held `execute_sql` and re-derived directly. Both open `exec_sql` sinks re-confirmed open at `1572fbd`.

**Review chain (this lane, on the decision pack):** `security-auditor` → **clean, no must-fix** (faithful,
correctly-classified distillation; all four should-fix polish items applied at `d5cd65f`); `branch-warden` → **safe**
(base commit `18d8342`, docs-only, file-set matched). The underlying brief carried its own full chain
(security-auditor ×3 · db-rls-auditor · branch-warden · external `0b9096f3` pinned `cf1e19f9`, no concrete_defect).

## 2. PK rulings (verbatim intent — 2026-07-23)

### Architecture blockers — all APPROVED

| ID | Decision | PK ruling |
|---|---|---|
| **A-Q0** | Role source A1 / A2 / A3 | **APPROVE A2.** Durable governance source; auditable; independent of transient auth claims; scales to future per-client permissions; aligns with ICE governance rather than authentication. **Reject A3.** A1 remains a documented alternative, not selected |
| **A-Q1** | Environment separation | **APPROVE nullable `environment` column.** No benefit in separate structures today; future-proofing is effectively free |
| **B-Q0** | Three-role model | **APPROVED** — `viewer` / `governance_operator` / `administrator`. **Default: no role = no governance authority** |
| **B-Q1** | Client scope | **APPROVED as proposed.** Model now; enforce globally in v1; per-client authorization remains **dormant until explicitly enabled** |
| **E-Q3 / E-Q10** | Schema placement | **APPROVED.** Authorization objects must **not** live in `public` or `c`. **Implementation brief must require fresh Supabase verification immediately before apply — never rely on historical assumptions** |
| **E-Q13** | Ownership + FORCE RLS | **APPROVED.** Authorization tables owned by a **non-`BYPASSRLS` role**; **FORCE RLS**; **minimal policy surface.** The implementation brief **must explicitly demonstrate the policy set rather than assuming FORCE RLS is sufficient** |
| **E-Q14** | Role-mutation caller shape | **APPROVED.** Role mutation must be **server-verified**; dashboard clients never mutate authorization rows directly. Contract: authenticated identity verified server-side → `service_role` privileged execution **only after** verification → immutable audit event · constrained role enum · administrator protections |

### Sequencing rulings — all APPROVED

| ID | Decision | PK ruling |
|---|---|---|
| **E-Q2** | Ordering vs Batch 2 | **APPROVED.** Batch 2 must close **before** enforcement is enabled. **No exceptions** |
| **D-Q4** | Slice 1 unblock | **APPROVED.** Slice 0.5 does **not** unblock Slice 1. Slice 1 requires its own governed-write architecture |
| **G-1** | Arc brief on unmerged `9e6bccf` | **APPROVED.** Merge or supersede the historical architecture brief. Do not maintain competing architectural truth |

## 3. New permanent authorization invariant (PK addition — 2026-07-23)

PK added one explicit standing invariant, to become a **permanent authorization invariant**:

> **INV-9 — UI-independent enforceability.** *Authorization must always be enforceable independently of UI visibility.*
> Every privileged operation must fail safely even if: UI checks are removed · routes are called directly · API clients
> are constructed manually · requests are replayed.

**Placement.** INV-9 is a **boundary-level** invariant (it holds regardless of the role source), complementing the
eight A2-specific invariants (A2-INV-1…8). It formalizes and elevates the brief's C.1 / C.4 / N-1 content —
"middleware and hidden buttons are insufficient; not rendering a button removes no capability" — into a named,
testable standing requirement. It maps directly onto the F.4 test expectations already required
(guard-deleted-mutation caught · guard-reordered-mutation caught · direct service-client invocation caught) and onto
boundaries C-1/C-2 (server-side, first-statement) and C-6 (direct PostgREST). **The Gate-2 implementation brief must
carry INV-9 in its acceptance set and prove it with negative tests.**

## 4. Fixed program order (PK — nothing jumps ahead of this chain)

1. ✅ Batch 1 complete
2. Batch 2 implementation
3. Batch 2 deployment
4. Batch 2 closeout
5. Slice 0.5 Gate-2 implementation authorization
6. Slice 0.5 implementation
7. Governed-write (Slice 1 prerequisite)
8. Slice 1

**This lane closes at the boundary between step 4 and step 5.** Batch 2 (steps 2–4) is the parallel implementation
lane and is authoritative for its own scope. Slice 0.5 implementation (step 6) may be *built* in parallel once its
Gate-2 (step 5) is authorized, but must **not** be *enabled* until Batch 2 closeout (step 4) is done (E-Q2).

## 5. Approved architecture — settled shape (for the Gate-2 brief to inherit, not re-decide)

- **Role source:** A2 — governed CE authorization table, keyed on `auth.uid()`, read through a zero-arg
  `SECURITY DEFINER` function granted to `authenticated`, **never via `exec_sql`**; carries nullable `environment` and
  nullable `client_id` (NULL = global) columns from day one; global-only enforcement in v1.
- **Roles:** `viewer` (default-none = no authority) / `governance_operator` / `administrator`; `administrator`
  inherits `governance_operator` + grant/revoke + invite; `inviteUserByEmail` is administrator-only (N-7).
- **Schema + ownership:** role + audit tables in a non-REST-exposed, USAGE-fenced schema (`audit` or new `authz`),
  **not `public`, not `c`**; owned by a dedicated non-login **non-`BYPASSRLS`** role; ENABLE + FORCE RLS + an
  explicit minimal policy set (demonstrated, not assumed). Only the read function lives in `public`. Every REVOKE
  names PUBLIC + anon + authenticated in the CREATE migration.
- **Role mutation:** server-verified identity → `service_role`-only mutation function → immutable audit event;
  constrained role enum; last-administrator protection enforced in the DB.
- **Audit:** actor `auth.users.id` FK (`ON DELETE SET NULL`) + immutable `actor_uid_snapshot` + `actor_email_snapshot`;
  append-only w.r.t. the application principal; administrator-only readers; separated from application activity logging.
- **Bootstrap/recovery:** first administrator + break-glass recovery via governed SQL under a PK gate (never UI-only);
  both audited; last administrator unremovable in the DB.
- **Kill switch:** Vercel instant-rollback to a pinned pre-enforcement deployment ID, recorded before enforcement.
- **Standing invariant:** INV-9 (UI-independent enforceability) + A2-INV-1…8.

## 6. Open items carried forward (NOT this lane's to resolve)

- **Implementation-gate decisions (settle at Gate-2 / implementation):** E-Q1 (kill-switch substrate — recommend
  Vercel instant-rollback), E-Q5 (refresh-token revocation on role removal), E-Q6 (`ON DELETE SET NULL` + snapshot;
  PII-retention tension), E-Q9 (zero-arg read shape), E-Q11 (**mandatory** fresh Supabase-UI exposed-schema reconfirm
  immediately before apply), B-Q2, D-Q2 (S1-c administrator?), D-Q3 (two-person rule?), D-Q1 (Slice 1 four-vs-five ops).
- **Handoffs → `register-reconciler`:** G-2 (stale "schema `r` not REST-exposed" claim at `docs/00_action_list.md:652,658`
  — contradicted; live-confirmed this lane that `r` is anon-USAGE), G-3 (two unrelated lanes both hold `cc-0046`).
- **Handoff → `security-auditor` sibling lane:** E-Q12 (out-of-app REST surface, N-9 — ~18 SECURITY DEFINER functions
  REST-invocable by `authenticated`; pre-existing; NOT folded into Slice 0.5), E-Q7 (cron persistence, P-1), E-Q8
  (`onboarding-notifier` `verify_jwt` posture — requires new evidence), E-Q4 (Next 14.2.35 arbitrary-route invocability
  — requires a test).

## 7. Next gate

**Slice 0.5 Gate-2 — a separate T3 implementation authorization** (program step 5), which must: pin these rulings;
carry INV-9 + A2-INV-1…8 in its acceptance set; require the E-Q11 Supabase-UI exposed-schema reconfirm immediately
before apply; **demonstrate the E-Q13 minimal policy set** rather than assuming FORCE RLS suffices; prove the
`auth.users` delete path against the actor FK on a scratch table; record the pre-enforcement Vercel deployment ID;
run the full T3 chain + rollback-proven + PK deploy gate. **Enforcement must not be switched on until Batch 2 closeout
(program step 4).** Slice 1 stays blocked pending step 7 (governed-write) + its own authorization.
