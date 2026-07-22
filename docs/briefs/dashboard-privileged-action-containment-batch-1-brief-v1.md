CLAIMED v6.09 · Dashboard Privileged-Action Containment — Batch 1 · worktree claude/dashboard-privileged-action-containment-b1 · gate 1 (PK rulings 2026-07-22) · 2026-07-22 +1000 Sydney

# Brief — Dashboard Privileged-Action Containment · Batch 1 (Gate-1, rev 2)

**Lane class / tier:** SAFETY_GATE · **T2** (code-only + narrow dev-only test tooling; no DB/grant/schema/migration/RLS change)
**Repo:** `invegent-dashboard` (separate from CE) · base = production `origin/main` **`f0ab7422`**
**Opened by:** PK ruling 2026-07-22, after a triage lane (`db-rls-auditor` **block** → `security-auditor` RED lane, 3 GREEN batches).
**Rev 2 incorporates:** `security-auditor` brief review (`concerns` / REVISE_THEN_PROCEED) + PK Gate-1 decisions D-1, D-2, D-3.
**Status:** Gate-1 DRAFT rev 2 — **no implementation until this brief completes its review chain and returns to PK.**

> **Classification (PK):** a confirmed production **security-design defect**, NOT a proven incident. No evidence of
> exploitation; no log or forensic review was performed and none is claimed.

---

## 1. Task

Apply the **narrowest possible** containment to two confirmed privileged paths that today execute service-role /
`postgres`-level authority with no authorization check. **This patch does NOT establish authorization** — it is
*authentication containment* plus *input validation*, pending the Slice 0.5 authorization architecture.

## 2. Source context — the defect

The dashboard has **authentication but zero authorization**. `middleware.ts` checks only that a Supabase user
exists; no role/RBAC/permission code exists anywhere in `app/`, `actions/`, `lib/`, `components/`. Every
authenticated user therefore crosses an operator-trusted boundary.

**Current risk statement (PK-ratified):** anonymous access remains blocked by middleware **and** database grants;
the service-role key remains server-only (`lib/supabase/service.ts` reads `SUPABASE_SERVICE_ROLE_KEY`, never
`NEXT_PUBLIC`); there is no evidence of exploitation. **However**, any authenticated user crosses the
operator-trusted boundary, and selected server actions / API routes then exercise service-role or `postgres`-level
authority without authorization. Account takeover or improperly issued membership could produce severe impact.

**Perimeter evidence (verified, load-bearing):** `next` is pinned **`14.2.35`** in both `package.json` and
`package-lock.json` — at/above `14.2.25`, so **CVE-2025-29927** (the `x-middleware-subrequest` middleware bypass)
does not apply. On a pre-`14.2.25` version all findings below would be **anonymously** reachable.
**`14.2.35` is a security-critical minimum dependency constraint.** The matcher
`/((?!_next/static|_next/image|favicon.ico|...).*)` does cover `/api/**` and server actions.

**Why the privileged floor is high:** `public.exec_sql(query text)` is SECURITY DEFINER owned by **postgres**
(`rolbypassrls=TRUE`, owner of all inspected `c.*`/`m.*`), body = `EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM ('
|| query || ') t'` — no statement filter, no allowlist, no parameterisation. Grants are correct and non-default
(`{postgres=X, service_role=X}`; anon/authenticated/PUBLIC all false), so **the application is the entire
perimeter** — and that perimeter performs no authz.

### 2.1 Invite-minted membership — corrected finding (PK-accepted)

The finding is carried by the **mechanism**, not by any address: approve → `inviteUserByEmail` → a live
`auth.users` member → middleware admits any `auth.users` member → operator-equivalent access.

- Submission `730049b9-937a-4032-b284-e40cd626ffa1` (Care For Welfare Pty Ltd) approved **2026-04-11 00:20:33.453886Z**.
- `auth.users` **`pk+cfw@invegent.com`** created **00:20:33.751201Z**, `invited_at 00:20:33.787Z` — **≈0.3 s after
  the approve; this is the account the approval produced.**
- `auth.users` **`parveenkumar11@hotmail.com`** created **01:12:18.420031Z** — **≈52 minutes later, a separate
  invite. It must NOT be attributed to that approval without further evidence.**

Both invite-minted accounts are confirmed and have signed in (`01:09:26Z`, `14:27:18Z`), and **both currently
receive operator-equivalent dashboard access because no authorization layer exists.** The two original accounts
(`pk@invegent.com`, `reviewer@invegent.com`) carry `invited_at = NULL`.

> **Corrected finding (recorded per PK, marked as such):** an earlier draft attributed the minted account to the
> submission's `contact_email`. That was a date-level correlation mistaken for causation; the sub-second sequence
> above supersedes it. **The identity of both invite-minted mailboxes is PK's to confirm — this brief neither
> asserts nor denies whose they are.**

**Separate investigation item (do NOT expand Batch 1 to resolve):** why the approve minted `pk+cfw@…` when the
submission's `contact_email` is `parveenkumar11@…`.

## 3. In scope — authorized Batch 1 (and ONLY this)

### A. Draft-action authentication guard

Apply the **already-shipped in-repo precedent** from `app/api/series/action/route.ts:15-26` to
`app/api/drafts/action/route.ts`.

**The precedent** (production `f0ab7422`; condensed — source destructures across :21-23, if-block :24-26):
```
// Session guard: operator-only route. Browser RPC calls used to run as the
// signed-in user; this consolidated route runs them as service_role, so we
// gate on an authenticated session here (operator-trusted boundary — no
// per-series ownership check).
const ssr = createSupabaseServerClient();
const { data: { user } } = await ssr.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

**Why this precedent:** same repo, same threat, same escalation (`service_role` RPC behind a browser-reachable
route), already reviewed and shipped, and its own comment states the doctrine. F3 is not a missing design — it is
one route that missed a pattern the codebase already has. No new concept, dependency, or vocabulary.

**Requirements:** `auth.getUser()` server-side · **401** on missing/invalid session, body `{error:"Unauthorized"}`
(contract-identical to the precedent) · **the guard must be the FIRST statements of the POST handler — above
`await req.json()` and above `createServiceClient()`** — hence before privileged RPC execution, before service-role
database work, and before any approval/enqueue behaviour. The quoted precedent already does this.

> **Recording constraint (PK):** this establishes **authentication containment only**. It does **not** distinguish
> PK, reviewers, invited client users, or governance operators — all remain equally privileged after Batch 1.

### B. Submission-ID validation — five-site invariant

One shared validator applied at **five** `submissionId` entry points in `actions/onboarding.ts`.

**Four sites interpolate the value into dynamic SQL** (production `f0ab7422`):

| # | Function (line) | Sink line | Statement | Live today? |
|---|---|---|---|---|
| 1 | `getSubmissionDetail(submissionId)` (:32) | **:49** `WHERE os.submission_id = '${submissionId}'` | `SELECT` via `exec_sql` (:34) | **YES — works** |
| 2 | `approveSubmission(submissionId)` (:88) | **:95** `WHERE submission_id = '${submissionId}'` | `SELECT` via `exec_sql` (:94) | **YES — works** |
| 3 | `rejectSubmission(submissionId, reason)` (:132) | **:145** `WHERE submission_id = '${submissionId}'` | `UPDATE` via `exec_sql` (:137) | **NO — dead (§3C)** |
| 4 | `markReady(submissionId)` (:152) | **:157** `WHERE submission_id = '${submissionId}'` | `UPDATE` via `exec_sql` (:156) | **NO — dead (§3C)** |

**The fifth site is NOT an injection sink.** `requestMoreInfo` (:57) passes `submissionId` to
`request_onboarding_info` (:65) as a **typed, parameterised RPC argument** — no interpolation. Its validation is
**consistency hardening and future-proofing**, not remediation of a current injection flaw.

> **Language constraint (PK, non-negotiable):** the inventory is **four dynamic-SQL sinks + one parameterised-RPC
> site**. It must **never** be described as "five injection sinks" — not in this brief, the result doc, registers,
> or a commit message.

`submissionId` also flows to `approve_onboarding(p_submission_id)` (:101), parameterised, inside sink-2's function —
covered by that function's entry assert.

**Full interpolation census of the file (7 sites — so "the four sinks" is not "all dynamic input"):** the four
above; :77 and :121 are URL literals (not SQL); **:141** is `operator_notes = '${reason.replace(/'/g, "''")}'` — a
**non-UUID** interpolation guarded only by hand-rolled quote-doubling, inside dead sink 3. **Deliberately untouched**
(a UUID assert cannot apply to free text) and recorded in §13. There is **no fifth UUID-shaped interpolation**.

**Placement requirement:** the assert **MUST be the first statement**, above `createServiceClient()` (currently the
first statement in all five functions) — otherwise the "zero DB calls on failure" evidence fails by construction.

> **Recording constraint (PK):** UUID validation is containment **for these sites only**. It must **not** be
> recorded as a general remediation of dynamic SQL or of `exec_sql`. The durable fix is a separate T3 lane
> (re-owning `exec_sql` to a restricted executor). Note a *`SELECT`-only guard on `exec_sql` is NOT containment* —
> input lands in `FROM (…) t`, so bare DML fails but any volatile SECURITY DEFINER writer may still be invoked from
> inside a `SELECT`.

### C. Dead actions — record, do not repair

**`rejectSubmission` and `markReady` are, per PK:** user-reachable UI actions · functionally **unable** to perform
their intended updates through the current wrapper · **NOT live SQL-injection execution paths**, because the
surrounding query fails parsing before execution · **separate functional defects requiring their own repair gate.**

**Mechanism:** both pass a bare `UPDATE c.onboarding_submission …` as `exec_sql`'s `query`, spliced into subquery
position: `SELECT jsonb_agg(row_to_json(t)) FROM ( <UPDATE …> ) t`. `UPDATE` is invalid in a `FROM` subquery and
`exec_sql` has **no EXCEPTION handler**, so it raises and both return `{ ok: false, error }`. Because the leading
`SELECT … FROM (` cannot be removed by the interpolant, **Postgres fails to parse the whole EXECUTE string before
running anything** — so these two are *inert to injection*, not merely broken. "Dead" means **cannot write**, not
unreachable: the UI still exposes the buttons and an operator pressing them gets `{ok:false}`.

**Corroboration (CE repo) — corroborates the OUTCOME, not the mechanism** (both attribute failure to schema
writability, not parse position): `supabase/functions/draft-notifier/index.ts:8` — *"instead of exec_sql UPDATE
which was silently failing (m schema not writable via exec_sql)"*; `heygen-avatar-creator/index.ts:128` — *"c schema
not writable via exec_sql or PostgREST"*.

**Support for "no live workflow depends on them":** `c.onboarding_submission` holds 2 rows (1 approved, 1 pending),
**zero** rejected, **zero** ready; the approved row's `reviewed_by` is the hardcoded `approveSubmission` literal.

> **PK constraint:** do NOT delete, redesign, or restore them in Batch 1. Do **NOT** promote the existing
> `${reason}` quote-doubling pattern into any live path, and do **not** describe it as an approved SQL-safety
> mechanism.

## 4. Call path — authenticated caller → privileged execution

**F3 / drafts route:** `app/(dashboard)/drafts/draft-actions.tsx:15` and `components/overview/DraftActionButtons.tsx:13`
→ `fetch("/api/drafts/action")` → route POST (**no in-handler identity check**) → `createServiceClient()` →
`draft_approve_and_enqueue(p_draft_id)` (SECDEF, owner postgres, **zero caller validation**) → `UPDATE m.post_draft`
+ `INSERT m.post_publish_queue` → **live publication to client social accounts**. Blast radius: 2,830 drafts (775
approved), 828 queue rows (29 queued). `approved_by` is the hardcoded literal `'manual'`; no audit trigger covers
the action, so **an incident is unattributable from DB state**.

**F1 / onboarding actions:** `app/(dashboard)/onboarding/page.tsx:56,69,86,95,540` → the **five in-scope call
sites** → `createServiceClient()`. **Four of them reach `exec_sql`** (executes as **postgres**, `rolbypassrls`);
**`requestMoreInfo` reaches the parameterised `request_onboarding_info` RPC** (`p_submission_id uuid`) and never
touches `exec_sql`. *(`actions/onboarding.ts` exports SIX server actions — the sixth, `getSubmissions`, is
unguarded but correctly out of scope: no `submissionId`, parameterised RPC.)*

**Critical:** the UI is not the gate. Server actions and the API route are directly invocable by any authenticated
session; middleware admits any `auth.users` member. Both routes' only callers are same-origin `"use client"`
components (default `credentials: "same-origin"` → cookies sent → `getUser()` resolves), and no EF/cron/script/portal
caller of `/api/drafts/action` exists — so the guard **closes F3's unauthenticated reachability** (not the
authorization gap, which §12 leaves explicitly open) and cannot break the working path. **Additional support:** all
five onboarding call sites pass a DB-sourced `detail.submission_id`, so no legitimate caller can supply a malformed
value — `assertUuid` cannot break the working path either.

> **Legend (from the triage lane):** **F1** = caller-supplied `submissionId` interpolated into `exec_sql`;
> **F2** = unguarded `inviteUserByEmail`; **F3** = unguarded `/api/drafts/action`.

## 5. Explicitly OUT of Batch 1

Role model or operator allowlist · Supabase metadata changes · CE authorization tables · RLS or grant changes ·
revocation of `exec_sql` · re-owning database functions · `pg_default_acl` changes · cron/vault/`net.http_post`
changes · portal identity separation · account-invite redesign · repository-wide interpolation cleanup ·
advisor/linter framework changes · onboarding workflow redesign · governance-write implementation · unrelated
dependency upgrades · **any MFA, password, session, account-status or leaked-password-protection change (§14)**.
**Do not revoke service-role access as an interim precaution.**

## 6. Test tooling (D-1 — PK-authorized, narrow)

**Authorized:** Vitest · one config file only if required · the smallest practical test set · one `test` script ·
**only the minimum dev dependencies**.

**Anticipated dependency change — declared before implementation, as required:**

| Item | Value |
|---|---|
| Added devDependency | **`vitest`** (single direct addition; latest stable major — exact resolved version reported at the diff gate) |
| Added production dependency | **NONE** |
| Config | **`vitest.config.ts`** — required, because `tsconfig.json` maps `@/* → ./*` and Vitest will not resolve that alias without an explicit `resolve.alias` |
| Environment | **`node`** — no jsdom, no browser env (we test a route handler and a pure validator, not React) |
| Script | `"test": "vitest run"` |
| Lockfile | `package-lock.json` grows by Vitest's dev-only transitive tree (**vite / esbuild / rollup**). Sizeable in line count, **entirely `devDependencies`**, zero production impact. Declared explicitly so the lockfile delta is not a surprise at review. |

**NOT introduced:** browser/E2E tooling · Playwright/Cypress · a framework migration · production dependencies ·
coverage infrastructure · unrelated test refactors · tests for the wider dashboard.

**Deploy-surface note (`security-auditor`):** `vercel.json` sets NODE_VERSION 20 and `.nvmrc` = 20, and Vercel
installs devDependencies at build time — so vite/esbuild/rollup **platform-optional binaries** enter
`package-lock.json` from a Windows dev machine and must resolve on Linux/Node 20. **A clean lockfile-only `npm ci`
is therefore added to §11** — a devDependency can break the production build if optional-binary entries are
incomplete. The resolved Vitest major and its `engines.node` must be checked against Node 20 and reported at the
diff gate.

**Expected non-failure, pre-declared:** esbuild emits an ignorable warning when bundling `actions/onboarding.ts`
(*"Module level directives cause errors when bundled — 'use server' was ignored"*). It is a **warning, not a
failure**, and the directive must **NOT** be deleted to silence it (that would be an out-of-scope production change).

**PK stop-condition assessment:** *not tripped* — integration is 1 devDependency + 1 config file, and the repo
already has TypeScript. `vitest.config.ts` may legitimately need `test.environment: 'node'` and possibly
`server.deps.inline: ['next']` for `next/server` alongside `resolve.alias`; that is **still one config file** and
does **not** trip the stop-condition. **If implementation discovers Vitest cannot be integrated without broader
configuration or dependency changes, STOP and return to PK — do not substitute a larger framework.**

## 7. Validation module (D-3 — PK-approved)

**`lib/validation.ts`**, single narrow public function: `assertUuid(value: string): string`.

**Implementation pinned to an anchored regex — NOT a library.** §6 declares *"Added production dependency: NONE"*,
and `lib/validation.ts` is production code; adopting "an established UUID parser" would contradict it. Exact grammar:

```
^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
```

- **No `m` flag** — with `/m`, `$` matches at a newline, so a value containing a newline followed by more text passes.
- **No `g` flag** — `lastIndex` is stateful across calls.
- **`typeof value === 'string'` MUST be checked BEFORE the regex.** `RegExp.prototype.test` coerces its argument, so
  a single-element array or an object with a `toString` returning a valid UUID would **pass**. Without the typeof
  guard the module is bypassable by a non-string.
- **Case policy: accept upper and lower hex; do NOT lowercase** — consistent with "must not mutate".
- **NOT version/variant-strict.** A v1–v5/v1–v8-gating validator narrows the accepted id space and could reject a
  legitimate live id — the exact "narrows too much" failure §11's live smoke exists to catch.

Also: reject surrounding whitespace rather than silently trimming · reject braces, prefixes, suffixes, comments,
SQL fragments, partial UUIDs · **no escaping** · **must not mutate** the accepted value · **must not become a
general-purpose validation library during Batch 1**.

### 7.1 Per-site failure contract (pinned — server actions have no HTTP status)

An uncaught throw from a `'use server'` export surfaces to the client inside `startTransition` as a Next error
digest, **replacing today's `{ok:false, error}` toast path** — a real UX regression on the live buttons. So:

| Site | On validation failure |
|---|---|
| `app/api/drafts/action/route.ts` (§3A) | HTTP **400** JSON, controlled message |
| `requestMoreInfo`, `approveSubmission`, `rejectSubmission`, `markReady` | `{ ok: false, error: '<controlled message>' }` — **no throw escapes** |
| `getSubmissionDetail` | **`null`**, preserving its `SubmissionDetail \| null` signature |

> Because `getSubmissionDetail` already returns `null` on any error and sinks 3–4 already return `{ok:false}`,
> **outcome-based tests cannot distinguish validated from unvalidated behaviour at those sites.** That is precisely
> why §9's evidence rests on zero-DB-call assertions plus a distinct validation-failure identity.

## 8. Anticipated file set (pinned — any additional application file = STOP + renewed scope review)

| Path | Change |
|---|---|
| `app/api/drafts/action/route.ts` | ADD the authentication guard (§3A), before body parse and all privileged work |
| `actions/onboarding.ts` | APPLY `assertUuid` at the five entry points (§3B), as the first statement in each |
| `lib/validation.ts` | NEW — single `assertUuid` export (§7) |
| test file(s) — narrow, path per repo convention | NEW — the §9 evidence |
| `vitest.config.ts` | NEW — minimal, `@/` alias + node environment |
| `package.json` | ADD `vitest` devDependency + `test` script |
| `package-lock.json` | lockfile result of the above |
| Batch-1 brief / result / register docs (CE) | documentation per convention |

**NOT authorized:** any database, migration, RLS, grant, RPC, middleware, onboarding-flow, portal, or
deployment-configuration file. **No CE application code. No SQL.**

## 9. Required automated evidence (PK-specified, hardened after `security-auditor` rev-2)

Mocking Supabase authentication and privileged calls **is permitted**.

> **Mutation-sensitivity is the governing requirement.** `security-auditor` demonstrated that PK's items 2, 6 and 8
> as originally written would **pass with the guard deleted**. Every item below is specified against an observable
> that changes when the guard is removed or reordered. **A suite that still passes with the guard deleted is not
> evidence.**

| # | Requirement | Mutation-sensitive observable |
|---|---|---|
| 1 | Unauthenticated draft action returns **401** | status **401** AND body `{error:"Unauthorized"}` (contract-identical to the precedent) |
| 2 | Authentication checked **before** privileged logic | (a) with `user: null`: **zero** calls on the `createServiceClient` spy AND the rpc spy, AND `req.json` not reached; (b) authenticated path: explicit order assertion `getUserMock.mock.invocationCallOrder[0] < rpcMock.mock.invocationCallOrder[0]`. **(a) alone does NOT detect reordering** — a guard moved below `svc.rpc(...)` still returns 401 after executing the RPC. |
| 3 | Malformed UUID rejected before any `exec_sql` / privileged RPC | **per named function**: zero calls on the `createServiceClient` spy AND a **distinct asserted validation-failure identity** (a named error class/code from `assertUuid`) — never a generic message or a bare falsy return |
| 4 | Valid canonical UUID accepted | proceeds; stub invoked |
| 5 | SQL payloads / suffixes / prefixes / whitespace / braces / non-canonical forms rejected | the pinned corpus in §9.1 |
| 6 | Failed validation yields **zero database calls** | requires `vi.mock('@/lib/supabase/service')` returning a recording stub whose `.rpc()` **resolves successfully**, PLUS a **positive control** in the same file asserting the stub **is** called exactly once for a valid UUID. **Without the positive control this item is vacuous** — `createServiceClient` throws `Missing Supabase env vars` when env is absent, so "zero DB calls" is true with or without the assert. |
| 7 | Authenticated valid input continues into the pre-existing path | assert the **exact** pre-existing RPC name and args — `draft_approve_and_enqueue` with `{p_draft_id}` — and cover **both** route branches (the reject branch calls `draft_set_status`; the guard sits above both) |
| 8 | Validator applied at **all five** submission-ID boundaries | **behavioural, per function** (`getSubmissionDetail`, `requestMoreInfo`, `approveSubmission`, `rejectSubmission`, `markReady`) using the item-3 observables. **A structural/grep-style check ("`assertUuid` appears 5 times") is FORBIDDEN** — it passes even if `assertUuid` were a no-op. |

### 9.1 Pinned rejection corpus (item 5)

Empty string · a single space · leading space · trailing space · trailing newline · UUID plus a trailing single
quote · a bare `OR` tautology fragment · UUID plus an `OR` tautology fragment · UUID plus a SQL line comment · UUID
plus a SQL block comment · brace-wrapped UUID · `urn:uuid:` prefixed · 32-hex unhyphenated · one char prepended ·
one char appended · truncated by one char · two UUIDs joined by a hyphen · and the **non-strings** `null`,
`undefined`, a number, a single-element array containing a valid UUID, and an object whose `toString` returns a
valid UUID (the last two being the coercion bypass).

**Test-level notes:** item 1's 401 is observable at **handler level**; at HTTP level `middleware.ts` returns a
**307 → /login** (`NextResponse.redirect` defaults to **307**, method-preserving — verified in the installed
`next@14.2.35` at `dist/server/web/spec-extension/response.js:95`, `?? 307`; **not 302**). Item 7 must not mutate
production data. `lib/supabase/server.ts` imports `next/headers` `cookies()` and must be mocked. Also cover: a
well-formed but **non-existent** UUID preserves today's not-found contract (`null` / `"Submission not found"`), and
an expired/invalid session yields **401, not 500**.

**Manual authenticated smoke verification remains REQUIRED after deployment** — unit tests do not prove production
middleware, routing, or environment behaviour. PK-observed.

## 10. Rollback plan

`git revert` of the single commit + redeploy. **No DB state to unwind** (no DB change), no grant to restore, no
migration to reverse. Reverting also removes the dev-only test tooling; no production artefact is affected.
**Pre-condition validated before apply:** §3C confirms sinks 3–4 are dead, so the assert cannot mask a working path.

## 11. Success criteria

Guard present in the deployed bundle · all §9 evidence passing · **tests demonstrably fail if the guard or the
assert is removed or reordered** · `branch-warden` clean with the changed set == §8 · `security-auditor` confirms the
patch **narrows** the two confirmed paths to authenticated callers with well-formed identifiers and **grants no new
authority** (it removes neither path — both remain reachable by any authenticated user) · external review clean on
the final hash · `tsc` + `next build` clean · **clean lockfile-only `npm ci`** (SF-3) · **PK-observed** live approve still works. *(A "no new advisor lints" check is a DB-advisor criterion in a lane with zero DB change — kept as a no-op confirmation only, not counted as evidence.)*

## 12. Explicit non-claim

**This patch does not establish authorization.** After Batch 1, any authenticated user still holds
operator-equivalent access; it merely ensures the caller is authenticated and the identifier is well-formed. The
authorization model is Slice 0.5 — neither designed nor authorized here. **Slice 0.5's review chain is PAUSED until
this lane reaches its PK gate; Slice 1 remains blocked on Slice 0.5.**

## 13. Recorded, NOT solved in Batch 1

The `contact_email` / invited-address mismatch (§2.1) · whether `portal.invegent.com` uses the same Supabase Auth
project (if yes, every future portal client is a dashboard admin) · `cron.job` review during any future suspected
compromise (`cron.schedule` has PUBLIC EXECUTE and `postgres=X*`, so scheduled SQL would survive a code fix and key
rotation) · the broad dynamic-SQL caller population (order-of-magnitude only — independent counts disagree: ~140
interpolations/30 files in triage vs 69 SQL-keyword-bearing interpolation lines/49 `exec_sql`-referencing files on
recount; **the counting method must be pinned before this is quoted**. Firm: **1 of 40** `app/api/**/route.ts` files
contains an identity check) · `exec_sql` ownership / restricted-executor redesign · missing privileged-action lint
rules (241 advisors name **none** of these functions — no rule class exists for dynamic SQL) · separation of client
members from dashboard operators · audit logging for role grants and privileged actions ·
`rejectSubmission`/`markReady` functional repair · the `${reason}` quote-doubling at :141 · latent
`m.ui_set_post_draft_status_v1` PUBLIC EXECUTE (zero callers; inert only via schema-`m` USAGE).

## 14. Account hardening — SEPARATE lane, no change here (PK §10)

**No MFA, password, session, account-status, or leaked-password-protection change is authorized in this lane.**
Recorded for a future PK action:

- `reviewer@invegent.com` is **dormant** (last sign-in 2026-03-16) and should be **ownership-reviewed**.
- Both invite-minted accounts (`pk+cfw@invegent.com`, `parveenkumar11@hotmail.com`) currently have
  **dashboard-equivalent access**.
- **All four accounts have zero verified MFA factors.**
- Enabling MFA should be planned **according to who controls each mailbox** (no automation risk: all four are
  email/password, none SSO, and no automation authenticates as a user — workers use the service-role key).
- Leaked-password protection appears **low-risk** (checks at password set/change only; no effect on existing
  sessions or automation) but still requires a **separate operational change authorization**.

## 15. Review chain + stop condition

`security-auditor` (rev 2) → `branch-warden` → external review **pinned to the final brief hash** → **PK gate**.
`db-rls-auditor` only if the §5/§8 SQL/grant/schema tripwire fires.

The security reviewer must verify: **no authority is added** · the patch narrows access but does **not** claim to
establish authorization · identity and UUID checks occur **before** privileged execution · **the tests would fail if
the guards were removed or reordered** · **the five-site language does not misrepresent the four dynamic-SQL sinks**.

**STOP: no implementation until this reviewed brief returns to PK.**
