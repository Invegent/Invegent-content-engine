# SEED PACKET — S1 · Dashboard Authz

**Issued:** 2026-07-24 by the ICE orchestrator, under PK ruling of 2026-07-24.
**You are:** a worker session. The orchestrator session ("Orchestrator manual") is the control tower
and registrar. **You do not cut register entries or push. You return findings and packets to PK.**

---

## 0. Read first (in this order)

1. `CLAUDE.md` (repo root) — the standing orchestration contract. Binding on you.
2. `docs/00_sync_state.md` entries **v6.13, v6.10, v6.09** — your lane's truth-of-record.
3. `docs/briefs/cc-0046-slice-0-5-dashboard-governance-authorization-model-brief-v1.md` — the
   PK-APPROVED Slice 0.5 design (sha256 `cf1e19f9…`).
4. `docs/briefs/results/dashboard-privileged-action-containment-batch-1-result-v1.md` — what shipped.

**Do not re-derive these from scratch.** They are current as of `origin/main adfd0f0`.

## 1. What you own (sole writer)

**The `invegent-dashboard` repository** — `C:\Users\parve\invegent-dashboard` (separate repo,
deploys to `dashboard.invegent.com` via Vercel). No other session writes there.

You do **not** own: the CE repo's edge functions, DB migrations, or the registers.

## 2. Task IDs

- **Slice 0.5 decision work continues under `cc-0046`** — do not renumber it. (⚠ `cc-0046` is a known
  double-allocation: this Dashboard Operator-Capability Arc *and* an unrelated Orthogonal Gap
  Classification lane. `grep cc-0046` returns both — always check which you have.)
- **Batch 2 is a genuinely new governed task → take `cc-0053`.**
- Further new child tasks: **cc-0054–cc-0057 reserved to you.** Unused ≠ recyclable.
- Register block **v6.20–v6.29** reserved to you — but **you draft pointers, the orchestrator commits
  them.** Never pick a version by reading the highest number in the tree.

## 3. Entry state — established, do not re-litigate

**The confirmed defect:** the dashboard has **authentication but ZERO authorization**. `middleware.ts`
checks only that a Supabase user exists; no role/RBAC/permission code exists anywhere in `app/`,
`actions/`, `lib/`, `components/`. Every authenticated account is operator-equivalent.

**Batch 1 is DEPLOYED and PK-ACCEPTED** (commit `1572fbd`, prod `dpl_6qx1dcHGLp4Xw1CTY6U463fjPGXH`):
an authenticated-session guard on the draft-approval route + canonical UUID validation at five
submission-ID boundaries. **Batch 1 did NOT establish authorization and did NOT close the onboarding
injection surface.**

**Batch 2 — the two sinks still open (your primary target):**
- `app/api/onboarding/run-scans/route.ts:20` — API route, **no identity check at all**,
  `submission_id` straight from the request body into `exec_sql`. **Higher severity than anything
  Batch 1 fixed.**
- `app/(dashboard)/actions/onboarding-scans.ts:75` — directly-invocable `'use server'`, same pattern.

## 4. Your mission (PK-specified, in order)

1. **Turn the `[A]`-class decisions into a compact PK ruling packet.** The Slice 0.5 brief poses 23
   classed decisions; `[A]` blocks the recommended role source A2. PK needs a short decision
   instrument — options, consequences, recommendation — not a re-explanation of the brief.
   Forks `E-Q9`, `E-Q13`, `E-Q14` are posed and unresolved.
2. **Establish the exact Batch 2 containment boundary** — precisely what is and is not contained,
   stated so it cannot be over-quoted later.
3. **Prove Batch 2 precedes enforcement** (E-Q2). Make the dependency legible and evidence-backed.
4. **Make NO enforcement implementation** until the `[A]` decisions are settled.

## 5. Hard constraints

- **Do NOT assume Slice 0.5 unblocks Slice 1.** It does not (D-Q4): there is no governed write RPC
  for 3 of the 4 operations, and only the proof half of the 4th. Slice 1 needs its own authorization.
- **Batch 2 must NOT broaden into the repo-wide dynamic-SQL programme.** There are ~140 unsanitised
  `${}` interpolations across 30 `exec_sql` caller files. Per-site remediation is **not tractable**;
  the durable fix is Batch 6 (re-owning `exec_sql` to a restricted role), a separate T3 lane.
- **NEVER revoke `exec_sql` from `service_role` as a precaution** — it breaks the whole dashboard and
  ~15 CE edge functions. Break-glass only.
- **Do not manufacture the authenticated-approval proof.** It remains pending a *natural* operator
  event. Do not approve a draft to produce evidence. A failed legitimate approval reopens Batch 1.
- No deploy, no migration, no RLS/grant change, no governance write without an explicit PK gate.

## 6. Gotchas that will cost you a day if you miss them

- **`next` is pinned 14.2.35 — treat the pin as SECURITY-CRITICAL.** Above 14.2.25 means
  CVE-2025-29927 middleware bypass does not apply, which is the only reason these sinks are not
  anonymously reachable. Dropping below re-opens all of them to anon.
- **A "SELECT-only guard" on `exec_sql` is NOT containment.** Input lands in `FROM (…) t`, so bare DML
  fails — but a SELECT may call any volatile SECURITY DEFINER writer.
- **`auth.uid()` is NULL under the service-role client.** Any role lookup must use the cookie-bound
  client, or you build a self-DoS.
- **`public` AND `c` are both REST-exposed.** Role tables belong in a non-exposed, USAGE-fenced schema.
  REVOKE must name `PUBLIC` **and** `anon` **and** `authenticated`; RLS needs **FORCE**.
- **Outcome-based tests here are mutation-BLIND** — `getSubmissionDetail` returns `null` on any error
  and the dead actions already return `{ok:false}`, so a test suite can pass **with the guard
  deleted**. Evidence must be zero-DB-call spies + a distinct error identity + an
  `invocationCallOrder` assertion + positive controls.
- **Vercel env vars bind at BUILD time.** Setting or deleting one does nothing without a redeploy.
- `rejectSubmission` / `markReady` in `actions/onboarding.ts` are **DEAD CODE** — they can never have
  worked (UPDATEs silently fail through `exec_sql`).
- Advisors will **never** catch this class — there is no advisor rule for dynamic-SQL functions.

## 7. Review chain

Tier per `CLAUDE.md` Convention 3. Batch 2 is code-only and `git revert`-able → **T2**; anything
touching grants, roles, or enforcement → **T3**. Use `security-auditor` **after** `db-rls-auditor`
has gathered DB facts. External review pinned to the diff hash; a changed diff **voids** the review.

## 8. First gate

**Return to PK: the `[A]`-class ruling packet + the Batch 2 containment boundary.** Do not implement
past it. Report outcome-only — blockers, scope changes, security concerns, failed verifications,
approval gates, final results. No step-by-step narration.
