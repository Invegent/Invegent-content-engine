CLAIMED v6.09 · Dashboard Privileged-Action Containment — Batch 1 · worktree claude/dashboard-privileged-action-containment-b1 · gate: PK deployment acceptance 2026-07-22 · 2026-07-22 +1000 Sydney

# Result — Dashboard Privileged-Action Containment · Batch 1 (DEPLOYED + ACCEPTED)

**Brief:** `docs/briefs/dashboard-privileged-action-containment-batch-1-brief-v1.md` (CE `2ff208a` — rebased onto main, brief blob unchanged; sha256 `24994059b33adefca44fc477deb5845589c14adc96db45f0395599a0b3e19ae4`, PK-accepted rev 3)
**Lane class / tier:** SAFETY_GATE · **T2** (code-only + dev-only test tooling)
**Repo:** `invegent-dashboard` (separate from CE)
**Status:** `DEPLOYED · OPERATIONALLY ACCEPTED` (PK 2026-07-22)

> ## ⚠ WHAT THIS DID AND DID NOT DO — read before quoting this document anywhere
>
> - **Four dynamic-SQL sinks in `actions/onboarding.ts` were contained.**
> - **Five submission-ID boundaries now enforce canonical UUID validation.**
> - **The draft approval route now requires a valid authenticated session.**
> - **TWO further onboarding scan paths remain OPEN and belong to Batch 2.**
> - **All authenticated users remain operator-equivalent pending Slice 0.5.**
>
> **Batch 1 does NOT establish authorization, and does NOT close the onboarding injection surface.**
> Any statement to the contrary is wrong.

---

## 1. The defect

The dashboard has **authentication but zero authorization**: `middleware.ts` checks only that a Supabase user
exists, and no role/RBAC/permission code exists anywhere in `app/`, `actions/`, `lib/`, `components/`. Two
privileged paths then executed service-role / `postgres`-level authority with no authz check:

- **F3** — `app/api/drafts/action/route.ts`: POST handler with **no in-handler identity check**, calling
  `draft_approve_and_enqueue` (SECURITY DEFINER, owner `postgres`, zero caller validation) → enqueues content for
  **live social publishing**. Blast radius at review: 2,830 drafts (775 approved), 828 queue rows (29 queued).
- **F1** — `actions/onboarding.ts`: a `'use server'` module with no auth check interpolating a caller-supplied
  `submissionId` into `public.exec_sql` — SECURITY DEFINER owned by **postgres** (`rolbypassrls=TRUE`), body
  `EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query || ') t'`, no statement filter, no parameterisation.

**Classification: a confirmed production security-DESIGN DEFECT, not a proven incident.** No logs or forensics were
reviewed and no exploitation is claimed. Verified mitigations: DB grants are correct and non-default
(`exec_sql` and the RPCs are `{postgres, service_role}` only; anon/authenticated/PUBLIC all false — no direct REST
path), the service-role key is server-only, and `next` is pinned **14.2.35** so CVE-2025-29927 does not apply.
**Nothing was anonymously reachable; the application is the entire perimeter, and any authenticated user crossed it.**

## 2. Identity

| Item | Value |
|---|---|
| Reviewed brief hash | `24994059b33adefca44fc477deb5845589c14adc96db45f0395599a0b3e19ae4` (CE `2ff208a`, committed byte-exact; the brief commit was rebased onto `5a6c998`, blob hash unchanged) |
| **Implementation commit** | **`1572fbdf7225b089b8cdfcb4926419e2de271ee2`** |
| **Reviewed diff hash** | **`cbf3c05024fb71a2f0a71d084516e37d4357909e1d4cbd6b3d39e0514d1bc33c`** (`f0ab7422..1572fbd`) |
| Superseded diff hash | `3e7bf6938d6ce00b63e1a9dc077647c28e746c449ba3de485ad1630c3758cf80` — voided by the SF-1 one-word fix; **no review carried across** |
| Base | `f0ab7422` |
| Merge to dashboard `main` | **clean fast-forward `f0ab742..1572fbd`** (no merge commit) |
| **Production deployment** | **`dpl_6qx1dcHGLp4Xw1CTY6U463fjPGXH`** — READY, `target=production`, `aliasError: null` |
| Serving | `dashboard.invegent.com` → sha `1572fbd` |

**Changed set — exactly the 9 pinned paths:** `app/api/drafts/action/route.ts` · `actions/onboarding.ts` ·
`lib/validation.ts` (new) · `tests/{validation,drafts-action-route,onboarding-actions}.test.ts` (new) ·
`vitest.config.ts` (new) · `package.json` · `package-lock.json`. `+1746/−85`; **the source portion is purely
additive — zero removed lines.** All four SQL template strings **sha256-identical** to `f0ab7422`.

**No database, migration, RLS, grant, RPC, middleware, or Edge Function change.** `middleware.ts` diffs empty.

## 3. What was implemented

**A. Draft-action authentication guard** — `app/api/drafts/action/route.ts:10-16`, applying the already-shipped
in-repo precedent from `app/api/series/action/route.ts:15-26`. First statements of POST, above `await req.json()`
(:18) and above `createServiceClient()` (:25). Returns **401** `{error:"Unauthorized"}`.
**This is authentication containment only — it does not distinguish PK, reviewers, invited client users, or
governance operators.**

**B. `lib/validation.ts`** — single export `assertUuid(value)` + `InvalidUuidError` with stable code
`INVALID_UUID`. `typeof value === 'string'` is checked **before** the regex (because `RegExp.prototype.test`
coerces — a single-element array or an object whose `toString` returns a UUID would otherwise pass). Anchored
regex, **no `m` flag** (a trailing newline plus payload would otherwise pass), **no `g` flag** (`lastIndex` is
stateful). Accepts upper and lower hex, **returns the value unmutated**, and is deliberately **not**
version/variant-strict so it cannot reject a legitimate pre-existing id. No escaping.

**C. Five submission-ID boundaries** in `actions/onboarding.ts`, each the first statement of its function above
`createServiceClient()` (`:35, :66, :97, :144, :165`). **No throw escapes any `'use server'` export** —
`getSubmissionDetail` returns `null`; the other four return `{ok:false,error}`.

| # | Function | Nature |
|---|---|---|
| 1 | `getSubmissionDetail` | dynamic-SQL sink (live) |
| 2 | `approveSubmission` | dynamic-SQL sink (live) |
| 3 | `rejectSubmission` | dynamic-SQL sink (**dead** — §5) |
| 4 | `markReady` | dynamic-SQL sink (**dead** — §5) |
| 5 | `requestMoreInfo` | **parameterised RPC — NOT an injection sink**; consistency hardening only |

> **Language constraint (PK, non-negotiable):** this is **four dynamic-SQL sinks + one parameterised-RPC site**.
> It must **never** be described as "five injection sinks".

**UUID validation is containment for these sites only. It is NOT a general remediation of dynamic SQL or of
`exec_sql`** — re-owning `exec_sql` to a restricted executor remains a separate, unopened T3 lane.

## 4. Evidence

**Automated:** 83/83 tests pass. **Mutation checks: 10/10 caught**, all restored, **no mutation artifact committed**
(branch-warden confirmed the tree clean) — guard removed · guard moved below `createServiceClient()` · guard moved
below both RPC calls · validation removed from each of the five boundaries individually · `typeof` check dropped ·
`assertUuid` made a no-op.

> **The finding that made this evidence real:** `security-auditor` proved the *originally specified* test items
> would have **passed with the guard deleted**. Outcome-based tests are mutation-blind here because
> `getSubmissionDetail` already returns `null` on any error and the dead actions already return `{ok:false}`. The
> suite therefore rests on **zero-DB-call spies**, a **distinct `InvalidUuidError`/code identity**, an explicit
> **`invocationCallOrder`** assertion (a guard moved below the RPC still returns 401 and would pass a naive test),
> and **positive controls** (the mock genuinely resolves — otherwise "zero DB calls" is vacuously true because
> `createServiceClient` throws without env). Grep/count-style coverage is forbidden and absent.

**Build/install:** clean wiped-`node_modules` `npm ci` · `tsc --noEmit` · `next build` 66/66 pages · `npm test` —
all pass locally; Vercel build succeeded (deps `41 added / 4 removed / 3 changed`, matching the declared delta).

**Dependencies:** `vitest 4.1.10`, the single new devDependency. It pulls **vite 8 + rolldown + lightningcss**
(native binaries), **not** the esbuild/rollup tree the brief anticipated — reported, not hidden. Linux x64/arm64
gnu+musl binaries present. **The binding Node floor is transitive `vite@8.1.5` (`^20.19.0 || >=22.12.0`)**, not
vitest's looser range; the Node 20 deploy pin resolves above 20.19. Three existing packages moved within unchanged
semver ranges (`nanoid 3.3.11→3.3.16`, `postcss 8.5.8→8.5.21`, `tinyglobby 0.2.15→0.2.17`). **No production
DIRECT dependency changed;** `nanoid` is production-*reachable* via `next`'s nested postcss. `tslib` at top level
is a de-duplication of two nested copies at identical 2.8.1, not a new dependency.

**Live production verification (authenticated, 2026-07-22):** `/drafts` · `/onboarding` · `/overview` ·
`/create/format-capability` all healthy, **zero console errors**. **A real production onboarding UUID was accepted
through the new validation boundary** — clicking a submission invoked `getSubmissionDetail` (guarded sink 1) and
the full detail panel rendered; had `assertUuid` rejected a live id the function returns `null` and the panel would
be empty. The guarded endpoint was **deliberately not probed**: sending a POST to an approve-and-enqueue route to
manufacture a 401 is not an acceptable production action, and the behaviour is already proven by the mutation suite.

## 5. Dead actions — recorded, deliberately not repaired

`rejectSubmission` and `markReady` are: **user-reachable UI actions** · **functionally unable** to perform their
intended updates through the current wrapper · **NOT live SQL-injection execution paths**, because the surrounding
query fails parsing before execution · **separate functional defects requiring their own repair gate.**

Both pass a bare `UPDATE` as `exec_sql`'s `query`, spliced into subquery position. Since the leading
`SELECT … FROM (` cannot be removed by the interpolant, Postgres fails to **parse** the whole EXECUTE string before
running anything — so they are *inert to injection*, not merely broken. "Dead" means **cannot write**, not
unreachable: the buttons still exist and return `{ok:false}`. Supporting state: `c.onboarding_submission` holds 2
rows, **zero** rejected, **zero** ready.

**Not repaired, redesigned, or deleted in Batch 1.** The `${reason}` hand-rolled quote-doubling at `:141` is
**byte-identical to `f0ab7422`** and was NOT touched; it must **not** be promoted into any live path or described
as an approved SQL-safety mechanism.

## 6. Review chain

| Stage | Verdict |
|---|---|
| `db-rls-auditor` (triage) | **block** — DB evidence; grants correct, exposure architectural |
| `security-auditor` (brief rev 1) | `concerns` — 3 must-fix, applied |
| `security-auditor` (brief rev 2) | `concerns` — 7 must-fix, applied (incl. the mutation-insensitivity proof) |
| external review (brief, `24994059…`) | `8b5f7fa8` **partial → PK**, no concrete defect |
| **PK ruling on that escalation** | **`PK-RESOLVED SCOPE CONCERN — containment may proceed; authorization remains mandatory follow-on work under Slice 0.5.`** The recommendation to combine RBAC with Batch 1 was **rejected**: Batch 1 is an immediate containment patch, Slice 0.5 owns durable authorization, and combining them would materially increase risk, scope, review burden, and time to containment. |
| `security-auditor` (implementation) | `concerns` — *"I would sign the code."* MF-1 → Batch 2; SF-1 → fixed |
| external review (diff, `cbf3c05…`) | `3393362f` **partial → PK**, medium risk, high confidence, **no concrete defect**; sole pushback was the Batch 2 deferral PK had already ruled on |
| `branch-warden` (pre-deploy) | **safe** — 9 files exactly, tree clean, no mutation artifact, forbidden paths absent |
| **PK deployment acceptance** | **ACCEPTED 2026-07-22** |

## 7. Rollback

`git revert 1572fbd` + redeploy, **or** Vercel instant-rollback to `dpl_H5Ysoyd9HfUezMHBUNvygek1yXvk` (= `f0ab7422`).
**No DB state to unwind**, no grant to restore, no migration to reverse; the revert also removes the dev-only
tooling. No production artefact other than the dashboard bundle is affected.

## 8. Pending natural event (non-blocking)

**Authenticated approval working-path proof: `PENDING NATURAL OPERATOR EVENT — non-blocking`.**
PK ruling: **do not create or approve a draft solely to manufacture evidence.** At the next *legitimate* draft
approval, verify: approval succeeds · enqueue behaviour unchanged · no unexpected 401 or validation error · the
expected publish lifecycle continues. **A failed legitimate approval reopens Batch 1 immediately.** Until then the
automated, mutation, build, deployment-identity, route-health and real-UUID evidence is sufficient for acceptance.

## 9. Open — Batch 2 (authorized as Gate-1 brief + read-only evidence ONLY)

A repo-wide census of `submission_id = '${` finds **SIX** sites. Batch 1 contained four. **Two remain OPEN:**

- **`app/api/onboarding/run-scans/route.ts:20`** — API route, **NO in-handler identity check**, takes
  `submission_id` **straight from the request body** and interpolates it into `exec_sql` as postgres. The **same
  posture as the route Batch 1 just fixed, plus an injection sink** — the higher severity of the two.
- **`app/(dashboard)/actions/onboarding-scans.ts:75`** — directly-invocable `'use server'` export, same pattern.

Both live in the same onboarding UI flow and are reachable by the same authenticated caller population; both were
confirmed still live during post-deploy verification (the detail panel's BRAND SCAN / AI PROFILE sections render
through that unguarded path). Batch 2 is **not implemented** and must **not** be broadened into the full
repository-wide dynamic-SQL programme.

## 10. Also recorded, not solved

Whether `portal.invegent.com` uses the same Supabase Auth project (if yes, every future portal client is a
dashboard admin) · `cron.job` review during any future suspected compromise (`cron.schedule` has PUBLIC EXECUTE and
`postgres=X*`, so scheduled SQL survives a code fix and key rotation) · `exec_sql` ownership / restricted-executor
redesign · the `${reason}` quote-doubling · `rejectSubmission`/`markReady` functional repair · **1 of 40**
`app/api/**/route.ts` files carries an identity check · advisors name **none** of these functions (no rule class
for dynamic SQL — only code review catches it) · latent `m.ui_set_post_draft_status_v1` PUBLIC EXECUTE (zero
callers; inert only via schema-`m` USAGE) · `pg_default_acl` on `public` (new functions born anon-executable, new
tables born anon-writable) · account hardening: **all four `auth.users` accounts have zero verified MFA factors**,
`reviewer@invegent.com` is dormant, and both invite-minted accounts hold dashboard-equivalent access (separate PK
operational action; **no account change was made in this lane**).

## 11. Stop condition

Batch 1 is **deployed and operationally accepted**. **Slice 0.5 resumes** (documentation/architecture only, threat
model updated with the verified production facts). **Batch 2 opens as Gate-1 brief + read-only evidence only.**
No further dashboard feature expansion or governance-write implementation is authorized while those two
foundations remain unresolved. **Slice 1 remains blocked on Slice 0.5.**
