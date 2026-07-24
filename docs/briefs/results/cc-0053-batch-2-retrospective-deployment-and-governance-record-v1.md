CLAIMED (no register version — non-terminal) · cc-0053 · Batch 2 retrospective deployment + governance reconciliation · session S1 Dashboard Authz · 2026-07-24 +1000 Sydney

# cc-0053 — Containment Batch 2: Retrospective Deployment Proof + Governance Correction

**Status:** DRAFT — uncommitted, awaiting PK. The control tower owns committing this.
**Lane class / tier:** SAFETY_GATE · **T1** (verification + recording; zero production mutation)
**Re-scoped by PK 2026-07-24** from an implementation lane to a **retrospective deployment/proof and
governance-reconciliation lane**, after this session found the work already shipped.

> ## ⚠ THE CORRECTION — read before quoting any Batch 2 record
>
> **Containment Batch 2 was implemented, merged, pushed AND deployed to production on 2026-07-22 23:54 UTC** —
> roughly **36 hours before its Gate 1 was approved**, and before every document that describes it.
>
> **Registers v6.14 and v6.16, the landed Batch 2 brief, and `cc-0053-containment-batch-2-gate1-finalization-v1.md`
> all state that Batch 2 is NOT IMPLEMENTED. That was already false when written.**
>
> **This is superseding evidence. No committed record is edited and no history is rewritten.**

---

## 1. Stale-ref gate (the control this lane's own failure produced)

Run before any analysis, per the new standing gate. `git fetch origin --prune` on both repos, then compared against
`git ls-remote` as the authoritative source:

| Repo | Fetched `origin/main` | `ls-remote` (authoritative) | Match |
|---|---|---|---|
| `invegent-dashboard` | `6fe8d1e198d8afaff22483c36072f07a8be5d4eb` | `6fe8d1e198d8afaff22483c36072f07a8be5d4eb` | ✅ |
| `Invegent-content-engine` | `ce3e4b8cfd65951e1719e936aa5b12d77b6573d4` | `ce3e4b8cfd65951e1719e936aa5b12d77b6573d4` | ✅ (local HEAD identical, parity 0/0) |

**Divergence found and declared:** this session's abandoned branch `claude/cc-0053-containment-b2` (`423f864`) has
base **`1572fbd`** — **one commit stale**. That is why it is abandoned, not merged.

**Root cause of the original error:** every `origin/main` read earlier in this lane resolved against a
remote-tracking ref last fetched **before `6fe8d1e` existed locally**. The commit was on GitHub the whole time.
`branch-warden`'s fetch surfaced it. No fetch was performed at lane start.

## 2. What is actually in production — verified

**Commit `6fe8d1e198d8afaff22483c36072f07a8be5d4eb`**
· *"fix(security): containment Batch 2 — delete superseded run-scans route + validate onboarding-scans entry points"*
· author `Claude <noreply@anthropic.com>` · **2026-07-22 23:54:41 +0000** · signature **verified** · on `origin/main`.

**Changed set (3 files, +246 / −81):** `app/(dashboard)/actions/onboarding-scans.ts` (+10) ·
`app/api/onboarding/run-scans/route.ts` (**deleted, −81**) · `tests/onboarding-scans-actions.test.ts` (+236, new).

**Deployment — `dpl_F8Npuxdd2yZ7xgSaRpQgaHP2i9mr`:**

| Field | Value |
|---|---|
| `githubCommitSha` | **`6fe8d1e198d8afaff22483c36072f07a8be5d4eb`** |
| `target` | **production** · `readyState` **READY** · `aliasError` **null** |
| **`alias`** | **`dashboard.invegent.com`**, `invegent-dashboard.vercel.app`, +2 |
| Built | `buildingAt` 1784765327044 → `ready` 1784765378592 (~52 s), region `iad1` |
| Ref / verification | branch `main` · `githubCommitVerification: verified` |
| Rollback | `isRollbackCandidate: true`; prior production = `dpl_6qx1dcHGLp4Xw1CTY6U463fjPGXH` (Batch 1, `1572fbd`) |

**⇒ `dashboard.invegent.com` serves `6fe8d1e`. Batch 2 is LIVE.**

## 3. Production behaviour of both containment changes

**Verified from the deployed artifact's content, with NO production probe** — see §3.1 for why a probe cannot
serve here.

| Change | Evidence | Result |
|---|---|---|
| **Route deletion** | `origin/main` tree: `git cat-file -e origin/main:app/api/onboarding/run-scans/route.ts` → **absent**. Independent `next build` of that content: `routes-manifest.json` contains **no** `run-scans` route, and **no `app/api/onboarding` directory exists in the build output at all** | **The route is not present in the deployed build.** The request-body-controlled `exec_sql` interpolation and the two service-role-Bearer EF invocations are gone, not guarded |
| **`onboarding-scans` guards** | Same build: the guard's distinct failure string `'Invalid submission id'` is present in the emitted server chunk (`.next/server/chunks/4767.js`) — the guards survive bundling and are not tree-shaken | **Guards are in the deployed bundle** |

**Independent corroboration:** this session implemented the same containment from the brief without knowledge of
`6fe8d1e`, and the two converged **functionally identically** — same four guarded entry points, both
`activateClient` parameters, same error strings. The source delta between them is **comment-only**. Two independent
derivations from the same brief agreeing is meaningful evidence that the shipped change matches the approved design.

### 3.1 ⚠ What could NOT be verified, and why no probe was attempted

The Batch 2 brief §7.1 named a **post-deploy 404/405 observation** as a `runtime_verification_required` gate.
**That observation is not obtainable unauthenticated:** `middleware.ts`'s matcher covers `/api/**` and redirects any
unauthenticated request to `/login`, so an anonymous probe returns a redirect **whether or not the route exists** —
it cannot distinguish the two. Obtaining it needs an authenticated session.

**No probe was made.** A `POST` to the route would be the only behaviourally decisive request, and if the deletion
had *not* taken effect that request would fire two privileged Edge Functions — which is not an acceptable
production action to establish a fact already provable from the artifact. The build-output evidence above is
offered in its place and is stronger: it shows the route does not exist in the deployed bundle at all.

**Still unverified (not claimed):** the authenticated working-path behaviour of the guards in production — i.e. that
a legitimate operator's scan/activation still succeeds. **Consistent with the standing PK ruling, no draft,
submission, or scan was triggered to manufacture that evidence.** It remains pending a natural operator event.

## 4. Governance correction

| Record | States | Actual |
|---|---|---|
| Landed Batch 2 brief (v6.14) | *"Batch 2 remains NOT IMPLEMENTED"* | Implemented + deployed **2026-07-22 23:54Z** |
| Register **v6.14** | Batch 2 not implemented; review chain not run | Already live |
| Register **v6.16** | cc-0053 = 2 paths, **pending** | Those 2 paths were **already contained in production** |
| `cc-0053-…-gate1-finalization-v1.md` §0 | *"zero lines of production code have changed. Nothing is contained yet."* | **False at time of writing** |

**Class:** identical to the gap the **v6.13 governance-recovery lane** was opened to close — work reaching
`origin/main` **and production** with no committed brief-to-deployment chain. **It recurred after that lane.** The
distinguishing feature here is that a PK-approved Gate-1 brief *existed*; what was missing was any record that the
implementation had happened.

**Corrected E-Q2 arithmetic (supersedes v6.16's "cc-0053 = 2 · pending"):**

| | Status |
|---|---|
| 7 caller-controllable `exec_sql` paths | total at `6fe8d1e` |
| **2 (cc-0053)** | ✅ **ALREADY CONTAINED IN PRODUCTION** |
| **5 (cc-0054)** | 🔴 **STILL OPEN** — re-verified at fresh `6fe8d1e`: zero validators, all interpolations intact |

**PK D3 = Option 1 is unchanged:** enforcement stays blocked until all seven are contained. **The remaining
blocker is cc-0054 alone.**

## 5. Disposition of this session's implementation artifact

**`423f864` (branch `claude/cc-0053-containment-b2`) is ABANDONED per PK ruling.** Not merged, not pushed, not
preserved as implementation evidence.

Its verification work stands on its own and is recorded here because it independently exercised the shipped design:
132/132 tests · **7/7 deliberate mutations caught** (each guard removed individually · `assertUuid` no-op'd · a
guard moved below `createServiceClient`) · all restored, **zero mutation residue** (`branch-warden`-confirmed,
`lib/validation.ts` byte-identical) · `tsc --noEmit`, `next build` clean · changed set exactly the three paths ·
nothing pushed. `branch-warden` verdict: **stop** (stale base + duplicate work) — correct, and the reason for
abandonment.

**Marginal delta vs. what shipped, for the record:** the upstream test file contains **no `invocationCallOrder`
assertion** and no `getClients` pinning test. This session's M7 mutation showed the reorder is already caught by the
zero-DB-call assertion, so **that is not a coverage gap** — it is belt-and-braces. Whether to cherry-pick either is
PK's call; **no recommendation is made and nothing was merged.**

## 6. AC-LAYOUT — first real execution (recorded here as it was run at this base)

Derived from `middleware.ts` (**not** a path glob), route-group-aware:
**P = `/login`, `/mcp-consent`, `/mcp-github-consent`** → workers `app/(auth)/login/page`, `app/mcp-consent/page`,
`app/mcp-github-consent/page`.

**|A| = 3** — against a stale baseline of 1. Partitioned:

| Action | Owned by | Resolution | Partition |
|---|---|---|---|
| `ce6ce7406c7ccd3a…` | **38/38 workers** | `emitFriction` ← `app/layout.tsx:3` → `FrictionFAB` | **GUARDED** — cookie-bound `getUser()` at `actions/emit-friction.ts:97` |
| `0081ee734c5bea2c…` | 34/38, public-set: login only | `login` ← `app/(auth)/login/page.tsx:1` | **EXCEPTION REGISTER** — public by design |
| `f6b7726c6526c38c…` | 34/38, public-set: login only | `logout` ← `components/sidebar.tsx:38` (same module, `actions/auth.ts`) | **EXCEPTION REGISTER** — public by design |

**Verdict: PASS** — every member in exactly one partition. **The glob formulation would have counted one and missed
two**, confirming the review finding empirically rather than by argument. R-1 (does the login worker own `logout`?)
is now **RESOLVED: yes**.

## 7. Non-claims

**No production mutation of any kind** — no deploy, redeploy, rollback, merge, push, DB write, migration, grant, or
flag change. **No production probe was made**; §3 is artifact evidence, and §3.1 states plainly what that cannot
cover. **No exploitation is claimed, attempted, or demonstrated.**

This document does **not** claim Batch 2 establishes authorization — **all authenticated users remain
operator-equivalent pending Slice 0.5**. It does **not** claim `exec_sql` is remediated (Batch 6, T3, unopened), nor
that the Edge Functions are safe (their handling of `submission_id` is unverified in any lane). It does **not**
claim the authenticated working path was proven in production (§3.1). It edits no committed record and rewrites no
history. It closes no finding and authorizes nothing.
