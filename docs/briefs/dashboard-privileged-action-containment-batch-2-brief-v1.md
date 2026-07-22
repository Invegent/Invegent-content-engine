CLAIMED (no register version yet — non-terminal) · Dashboard Privileged-Action Containment — Batch 2 · worktree claude/containment-batch-2-brief · gate 1 (PK-opened 2026-07-22) · 2026-07-22 +1000 Sydney

# Brief — Dashboard Privileged-Action Containment · Batch 2 (Gate-1)

**Lane class / tier:** SAFETY_GATE · **T2** (PK-confirmed 2026-07-22, D-4)
**Repo:** `invegent-dashboard` · evidence base = production `origin/main` **`f0ab7422`**… now **`1572fbd`** (Batch 1 deployed; neither Batch 2 file was touched by it)
**Opened by:** PK ruling 2026-07-22 §4, after `security-auditor` MF-1 on the Batch 1 implementation.
**Predecessor:** `docs/briefs/results/dashboard-privileged-action-containment-batch-1-result-v1.md` (CE `1740938`, register v6.09)
**Status:** Gate-1 DRAFT rev 2 — **PK has answered D-1…D-4 (§4). Implementation is STILL NOT authorized** until this brief completes its review chain and returns to PK.

> **Standing constraint inherited from Batch 1 (non-negotiable):** Batch 1 contained the **four dynamic-SQL sinks in
> `actions/onboarding.ts`**. It did **not** contain the onboarding submission-id injection surface, and it does
> **not** establish authorization — **all authenticated users remain operator-equivalent pending Slice 0.5.**
> Batch 2 does not change that either.

---

## 1. Task

Design containment for the two onboarding scan paths left open by Batch 1. **Do not implement.** Do **not** broaden
into the repository-wide dynamic-SQL programme — that remains a separate, unopened T3 lane.

## 2. Verified evidence (read-only, production `origin/main`)

### 2.1 `app/api/onboarding/run-scans/route.ts` — the higher-severity path

**Every claim below is read from source.**

- **NO in-handler identity check.** The handler is `export async function POST(request)` with no
  `auth.getUser()`, no session read, nothing. The only gate is `middleware.ts`, which admits **any** `auth.users`
  member.
- **`submission_id` is taken straight from the request body** (`const { submission_id } = body`) and interpolated
  into `exec_sql` at **:20** — `WHERE submission_id = '${submission_id}'` — executing as **postgres**
  (`rolbypassrls=TRUE`, owner of all `c.*`/`m.*`).
- **It then fires two Edge Functions with the service-role key as a Bearer token** —
  `POST {supabaseUrl}/functions/v1/brand-scanner` and `.../ai-profile-bootstrap`, both with
  `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` and the caller-supplied `submission_id` in the body. Both
  invocations are wrapped in `try/catch` and are **explicitly non-fatal** ("Non-fatal: log and continue").
- **⭐ It is a DELIBERATELY SUPERSEDED route with zero executable callers.** Two separate findings:
  - **Supersession (the decisive evidence).** Dashboard commit **`d2e1f93`** (2026-04-17, *"feat: onboarding run
    scans button + scan results panel"*) **created `onboarding-scans.ts` and, in the same commit, removed
    `await fetch('/api/onboarding/run-scans', {…})` from `app/(dashboard)/onboarding/page.tsx`**, replacing it with
    `runBrandScan(sid)` / `runAiProfileScan(sid)`. Route history: created `56578dd` → wired `66933bc`/`cd76d56`
    → **caller deliberately replaced `d2e1f93`**. This is an *intentionally* replaced orphan, not an accidentally
    unwired one — an evidenced supersession, not an absence-of-evidence argument.
  - **Caller census across FOUR local Invegent repos** (`invegent-dashboard`, `Invegent-content-engine`,
    `invegent-portal`, `invegent-web`): **zero executable callers.** In the dashboard, `git grep -rn "run-scans"`
    returns only its own five `console.log`/`console.error` strings; no component, action, route, script, CI
    workflow, or config invokes it; `next.config.mjs` is empty (no rewrites/redirects) and `vercel.json` carries
    only `build.env.NODE_VERSION` (no crons/rewrites); no dynamic `/api` path construction anywhere reaches it;
    portal and web return zero hits entirely.
  - **Disclosed counter-signal (CE, docs-only — non-executable).** `docs/archive/ICE_Pipeline_Audit_Apr2026.md:115,118`
    records `brand-scanner` and `ai-profile-bootstrap` as invoked "On-demand" via the **"run-scans API"**, and
    `docs/briefs/brief_015_onboarding_checklist.md:177` carries the original `fetch('/api/onboarding/run-scans')`
    design. `git grep -in run-scans HEAD -- . ':!docs/'` in CE returns empty, so these are documentation only —
    **but an archived architecture doc naming this route as the on-demand invocation path is exactly the
    operator-habit risk D-1 asks PK about, and it is disclosed here rather than left implicit.**

  **The route is live and HTTP-reachable regardless.**

So this single file combines: no identity check · request-body-controlled SQL interpolation as postgres · privileged
Edge Function invocation · **and no legitimate caller to protect.** It is a strictly worse posture than the F3 route
Batch 1 just fixed, and it is the cheapest thing to contain because nothing depends on it.

### 2.2 `app/(dashboard)/actions/onboarding-scans.ts` — larger than "one sink"

The file is `'use server'` with **five exports, none of which performs any auth, authz, or input validation**. All
five are imported by exactly one caller, `app/(dashboard)/onboarding/page.tsx` (`:12-13`):

| Export | Called at | Privileged behaviour | Class |
|---|---|---|---|
| `getSubmissionScanResults(submissionId)` | page `:121` | `exec_sql` — `WHERE submission_id = '${submissionId}'` (**:75**) as postgres | **dynamic-SQL sink** |
| `runBrandScan(submissionId)` | page `:107` | `fetch` → `brand-scanner` EF with **service-role Bearer** | unvalidated input → privileged call |
| `runAiProfileScan(submissionId)` | page `:114` | `fetch` → `ai-profile-bootstrap` EF with **service-role Bearer** | unvalidated input → privileged call |
| `activateClient(submissionId, clientId)` | page `:141` | RPC `activate_client_from_submission` — **provisioning write** | unvalidated ×2 → privileged write |
| `getClients()` | page `:56` | `exec_sql` with a **constant** query, no interpolant | **not a sink** — no user input |

**DB facts (read-only catalog):** `activate_client_from_submission(p_submission_id uuid, p_client_id uuid)` is
SECURITY DEFINER, `search_path=public`, owner **postgres**, ACL `{postgres=X, service_role=X}` — anon and
authenticated cannot reach it directly over REST. Its parameters are **typed `uuid`**, so it is **parameterised,
NOT an injection sink** — but it is an unvalidated, unauthorized privileged *provisioning* call.

> **Inventory language (carry the Batch 1 discipline):** across both files there is **ONE additional dynamic-SQL
> sink** (`onboarding-scans.ts:75`) plus **one request-body-controlled dynamic-SQL sink** (`run-scans:20`) —
> **two dynamic-SQL sinks total** — alongside **three unvalidated privileged non-SQL calls** (2 EF invocations +
> 1 provisioning RPC). Do **not** collapse these into "five injection sinks" or any similar phrasing.

### 2.3 Reachability summary

Both paths require an **authenticated session** (middleware's matcher covers `/api/**` and server actions) — neither
is anonymously reachable, and `next` remains pinned **14.2.35** so CVE-2025-29927 does not apply. But since the
dashboard has **no authorization**, *authenticated == operator-equivalent*, and the onboarding invite path can
expand that population (Batch 1 result §2.1). The service-role key is server-only and does not reach clients.

## 3. Can these be contained without database or workflow redesign? — YES (assessment)

**`run-scans` route: DELETE (PK D-1).** Because the route has zero executable callers and was deliberately
superseded by `d2e1f93`, deletion removes the exposure entirely rather than guarding it — no workflow to preserve,
no false-success contract to inherit, and nothing left to re-audit later. The rejected alternative was to retain it
behind the Batch-1 session guard + `assertUuid` (patterns already shipped at `1572fbd`: the session guard once in
`app/api/drafts/action/route.ts:6-16`; `assertUuid` at five entry points in `actions/onboarding.ts`). **No DB, RPC, EF, or workflow change is required for either.** `assertUuid` from Batch 1 is reusable
as-is. **Recommendation: (a), with (b) as the fallback if PK wants the endpoint retained** — but this is a PK scope
decision, and §4 records the caveat.

**`onboarding-scans.ts`: validate all four entry points, both `activateClient` parameters (PK D-2 + D-3).**
Apply `assertUuid` as the **first statement** of `runBrandScan`, `runAiProfileScan`, `activateClient` (to **both**
`submissionId` and `clientId`) and `getSubmissionScanResults`, exactly as Batch 1 did — above any
`createServiceClient()` or `fetch`. `getClients()` needs nothing: zero parameters, constant query. **No DB, RPC, EF,
or workflow change required.** The existing `lib/validation.ts` is reused; **no new module, no new dependency.**

**Per-site failure contract** (server actions have no HTTP status; no throw may escape a `'use server'` export):
`getSubmissionScanResults` → `{brand_scan_result:null, ai_profile_scan_result:null}` (its existing error shape);
`runBrandScan` / `runAiProfileScan` / `activateClient` → `{ok:false, error:'<controlled message>'}`.

**What this would NOT fix:** neither path would gain *authorization* — any authenticated user would still reach
them with a well-formed UUID. That is Slice 0.5's job and must be stated in the result doc. **Nor does it make the
Edge Functions safe:** `assertUuid` on the EF paths is a **shape constraint on what the dashboard forwards**, not a
guarantee about `brand-scanner` / `ai-profile-bootstrap` internals — their handling of `submission_id` is **out of
scope (§5) and UNVERIFIED in this lane.**

## 4. PK DECISIONS — RESOLVED (2026-07-22)

| # | Decision | PK ruling |
|---|---|---|
| **D-1** | `run-scans` disposition | **DELETE the route.** |
| **D-2** | Scope in `onboarding-scans.ts` | **Validate ALL FOUR** `submissionId` entry points (not only the `:75` sink). |
| **D-3** | `activateClient`'s `clientId` | **INCLUDE** — validate both parameters. |
| **D-4** | Tier | **T2.** |

**Consequences now fixed, not optional:**

- **Deletion is the disposition**, so §7.1's deletion-branch evidence standard is **ACTIVE**, not conditional —
  including the **four-repo caller census re-run at the implementation base as a named pre-apply gate** and the
  **post-deploy 404/405 observation as an explicit `runtime_verification_required` gate**.
- PK accepted deletion **with the CE archive counter-signal disclosed** (§2.1): `docs/archive/ICE_Pipeline_Audit_Apr2026.md`
  names the "run-scans API" as the on-demand invocation path. **If an out-of-band caller exists, it breaks on
  deletion** — the mitigation is the pre-apply census plus the fact that rollback is a single `git revert`.
- Because the route is deleted, option (b)'s false-success defect (a retained route returning `200 {ok:true}` when
  both EF calls threw) is **moot** and needs no fix.
- `activateClient` gains **per-parameter** validation, so §7 item 6's two-case requirement is **mandatory**.

### 4.1 Named, NOT to be fixed in Batch 2

Low-severity error-text disclosure to an authenticated (== operator-equivalent) user: `activateClient` returns raw
Postgres `error.message` to the browser (`:60`), and `runBrandScan`/`runAiProfileScan` return EF `data.error`
(`:19`, `:37`). Adding `assertUuid` reduces the malformed-uuid case as a side effect. **Not a Batch 2 objective.**

Also for accuracy: `middleware.ts:53-55` **redirects** unauthenticated requests to `/login` — it does **not** return
401. §7's "401 before body parse" is correct for the **in-handler** guard; nothing here should be read as claiming
middleware returns 401.

**Implementation-lane hazard (for whenever implementation is authorized):** the local dashboard checkout
`C:\\Users\\parve\\invegent-dashboard` sits on branch `tmr-template-intake-ui-v0` (ahead 11 / behind 2).
Implementation **must** cut an isolated worktree from `origin/main` `1572fbd`, never work in that checkout.

## 5. Explicitly OUT of Batch 2

Any role model, allowlist, or authorization layer (Slice 0.5) · repository-wide interpolation cleanup or the
dynamic-SQL programme · `exec_sql` ownership / restricted-executor redesign · any DB, migration, RLS, grant, or RPC
change · Edge Function changes (`brand-scanner`, `ai-profile-bootstrap` are **not** in scope) · middleware redesign ·
onboarding workflow redesign · portal identity separation · account/MFA/session changes · the `${reason}`
quote-doubling · `rejectSubmission`/`markReady` repair · re-opening Batch 1.

## 6. Implementation envelope (pinned by D-1…D-4 — still NOT authorized)

| Path | Change |
|---|---|
| `app/api/onboarding/run-scans/route.ts` | **DELETE** (D-1) |
| `app/(dashboard)/actions/onboarding-scans.ts` | `assertUuid` at 4 entry points; **both** params in `activateClient` (D-2, D-3) |
| test file(s) — narrow | NEW — the §7 evidence |

**No** `package.json`, **no** lockfile, **no** new dependency (`vitest` + `lib/validation.ts` already exist from
Batch 1). **No** `vitest.config.ts` change. **No** CE application code, **no** SQL, **no** migration, **no** EF,
**no** middleware. Any additional application file = **STOP + renewed scope review.**

**Implementation-lane requirement:** cut an **isolated worktree from `origin/main`** at the then-current dashboard
main — never work in the local checkout (`C:\\Users\\parve\\invegent-dashboard`, branch
`tmr-template-intake-ui-v0`, ahead 11 / behind 2).

## 7. Test design — must be mutation-sensitive (Batch 1's hard-won lesson)

Batch 1 proved that **outcome-based tests are mutation-blind on these paths**: `getSubmissionScanResults` returns
`{brand_scan_result:null, ai_profile_scan_result:null}` on *any* error, so a "returns nulls" assertion is identical
with and without validation. Evidence must therefore assert, **per named export**:

1. **Zero calls** on a mocked `@/lib/supabase/service` spy whose `.rpc()` **resolves successfully**, plus a
   **positive control** proving the stub *is* called once for a valid UUID (otherwise the assertion is vacuous).
2. **Zero `fetch` calls** on the EF paths (`runBrandScan`/`runAiProfileScan`) when validation fails — this is the
   `fetch`-side analogue of the DB spy and is **essential**, since these paths never touch the DB helper.
3. A **distinct `InvalidUuidError` / `code` identity**, never a generic falsy return.
4. For a guarded `run-scans`: **401 before body parse**, plus an **`invocationCallOrder`** assertion (a guard moved
   below the privileged work still returns 401 and would pass a naive test).
6. **`activateClient` needs PER-PARAMETER cases** (if D-3 includes `clientId`): *(valid `submissionId` + malformed
   `clientId`)* → zero `.rpc` calls, **and** *(malformed `submissionId` + valid `clientId`)* → zero `.rpc` calls,
   each with its own positive control. **A single "malformed input" case is mutation-blind** — a guard applied to
   only the first parameter would pass it.
7. **Count the right call.** The privileged act is **`.rpc()`**, not the `createServiceClient()` factory. Assert
   zero **`.rpc`** invocations (ideally both counters).
8. **⚠ Module-scope env capture — a real trap.** `onboarding-scans.ts:5-6` reads `supabaseUrl`/`serviceKey` at
   **module scope**, unlike `actions/onboarding.ts` which reads env **inside** the function (`:81`). Batch 1's
   `delete process.env.NEXT_PUBLIC_SUPABASE_URL` in `beforeEach` is therefore **too late** here — env is already
   captured at import, and the §7.2 **positive control** would silently degrade to asserting against
   `undefined/functions/v1/brand-scanner`. Env must be set **before import** (vitest config `env`, or `vi.stubEnv`
   + dynamic import). The zero-fetch *safety* assertion is unaffected; only the positive control is.
9. **Forbidden:** grep/count-style structural checks.
10. The suite must **fail** under deliberate mutation of every guard, then be restored, with no artifact committed.

### 7.1 Evidence standard for the DELETION branch (D-1 option (a))

§7's items above pre-specify only the *guard* branch. Deletion cannot be proven by a DB spy or a `fetch` spy, and
"assert the module no longer resolves" is precisely the structural check item 9 forbids. **If PK selects (a), the
evidence standard is:** `tsc --noEmit` + `next build` clean with **no unresolved import** · the **four-repo caller
census re-run at the implementation base** as a *named pre-apply gate* (not a one-off) · and a **post-deploy 404/405
observation declared as an explicit `runtime_verification_required` gate**. Until D-1 is answered, **this brief does
not yet carry a complete evidence plan for its own recommended option** — stated plainly rather than glossed.

## 8. Review chain + stop condition

`security-auditor` → `branch-warden` → external review **pinned to the final brief hash** → **PK Gate 1**.
`db-rls-auditor` only if the §5 DB/grant/schema tripwire fires (not expected — no DB change is contemplated).

**STOP: no implementation until this brief completes the chain, PK answers D-1…D-4, and it returns to PK.**

## 9. Non-claims

This brief authorizes nothing. It does not implement, delete, guard, or deploy anything. It makes **no claim that
exploitation has occurred** — no logs or forensics were reviewed. It does **not** claim Batch 2 would establish
authorization, and it does **not** claim that completing Batch 2 would remediate `exec_sql` or dynamic SQL
generally. The `run-scans` finding is a **four-repo grep result plus a supersession commit** — it proves zero
executable callers in the four Invegent repositories present on this machine at review time. It is **NOT** proof
that no external caller exists (an operator curl, a bookmark, a Postman collection outside the repos, or a caller
in a repo not on this machine). See D-1. Roughly **40 further interpolation sites exist repo-wide** and are
correctly **out of scope** under §5 — naming the count here so it is not later mistaken for new discovery.
