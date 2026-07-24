CLAIMED (no register version — non-terminal) · cc-0054 · Dashboard `exec_sql` caller-controlled containment · session S1 Dashboard Authz · gate 1 · 2026-07-24 +1000 Sydney

# Brief — cc-0054: Containment for the caller-controllable `exec_sql` sites (Gate-1)

**Created:** 2026-07-24 Sydney
**Author:** S1 (Dashboard Authz worker session)
**Executor:** orchestrator + PK gates — **NOT AUTHORIZED TO RUN**
**Status:** Gate-1 DRAFT — awaiting PK. **Implementation is NOT authorized by this document.**
**Lane class / tier:** SAFETY_GATE · **T2** (code-only, `git revert`-able, zero DB/RLS/grant/migration change)
**Repo:** `invegent-dashboard` · evidence base = production `origin/main` **`1572fbd`**
**Result file:** `docs/briefs/results/cc-0054-dashboard-exec-sql-caller-controlled-containment-result-v1.md` (on completion)

> ## ⚠ WHAT THIS IS AND IS NOT
>
> A **Gate-1 brief**. It authorizes **no code**. It does not open the repo-wide dynamic-SQL programme, does not
> touch `exec_sql` ownership (Batch 6, T3, unopened), and does not establish authorization — **all authenticated
> users remain operator-equivalent pending Slice 0.5.** Sibling lane, not a successor: **cc-0053 (Batch 2)** owns
> the two onboarding-scan sinks and is unaffected by this brief.

---

## 1. Task

Contain the **five** remaining `exec_sql` call sites at which a value an authenticated remote caller controls
reaches interpolated SQL executing as `postgres`, with no validation on the path. Reuse Batch 1's shipped
`lib/validation.ts`. **Do not implement.** Do not broaden beyond the five named sites.

## 2. Source context

- `docs/briefs/dashboard-containment-batch-2-boundary-and-eq2-proof-v1.md` §3.2 — the census that found these sites,
  **and the E-Q2 dependency this lane exists to help satisfy**. ⚠ **That document states SIX sites; the correct
  count is FIVE** — see §4.1, a correction this brief carries rather than silently fixing.
- `docs/briefs/results/dashboard-privileged-action-containment-batch-1-result-v1.md` — the shipped precedent
  (`assertUuid`, the mutation-sensitivity standard, the ordering invariant). Register v6.09.
- `docs/briefs/dashboard-privileged-action-containment-batch-2-brief-v1.md` — cc-0053, the sibling lane.
- `docs/briefs/cc-0046-slice-0-5-dashboard-governance-authorization-model-brief-v1.md` — the authorization model
  these sites bound. Register v6.10.
- `docs/briefs/cc-0046-slice-0-5-a-class-ruling-packet-v1.md` — the `[A]` rulings pending with PK.
- Dashboard `origin/main` `1572fbd`; `lib/validation.ts`; `actions/classifier-metrics.ts:12-15` (the in-repo
  validation pattern that works).

## 3. Why this lane exists — the E-Q2 arithmetic

Slice 0.5 **E-Q2** requires that no `exec_sql` path be reachable by a principal the role model intends to deny, at
the moment enforcement is enabled. There are **seven** such paths at `1572fbd`:

| Owner | Count | Sites |
|---|---|---|
| **cc-0053 (Batch 2)** | 2 | `app/api/onboarding/run-scans/route.ts:20` · `app/(dashboard)/actions/onboarding-scans.ts:75` |
| **cc-0054 (this brief)** | **5** | §4 below |

**cc-0053 + cc-0054 together are what would satisfy the E-Q2 precondition** — conditional on the census being
complete (it classified every non-test `exec_sql` file (51 files match `exec_sql` at `1572fbd`; 50 excluding `tests/`, 49 excluding the one `.md`); see §9 non-claims). **Neither lane alone does.** Sequencing
between "close all seven first" and "require Batch 6 first" is **PK's D3 decision and is not pre-empted here.**

## 4. Verified evidence — the five sites

**Every line below was read directly from `origin/main` `1572fbd`, not taken from the census.**

| # | Site | Entry point | Interpolant | Reachability | Guard today |
|---|---|---|---|---|---|
| **S-1** | `app/(dashboard)/client-profile/page.tsx:26, 34, 42` | server component page — `getBrandProfile` / `getPlatformProfiles` / `getContentTypePrompts` | `'${clientId}'` ×3 | **GET — a URL** | none (`searchParams.client ?? defaultClient`) |
| **S-2** | `app/api/visuals/route.ts:17 → 29` | `GET` handler | `'${client_id}'` in `clientFilter`, then **bare** `WHERE 1=1 ${clientFilter}` | **GET — a URL** | none |
| **S-3** | `app/api/feeds/available/route.ts:18` | `GET` handler | `'${clientId}'` | **GET — a URL** | presence only (`if (!clientId) 400`) |
| **S-4** | `actions/pipeline-stats.ts:47, 50, 53, 56, 59` (top-level `actions/`, **not** under `app/`) | `fetchPipelineStats(clientSlug?)` — `'use server'`, **also awaited by the `/monitor` page** | `'${clientSlug}'` ×5 filter fragments, each **bare**-spliced into the query | **GET — a URL** *(and POST)* | none |
| **S-5** | `app/(dashboard)/actions/digest-policy.ts:20` | `getDigestPolicy(clientId)` — `'use server'` | `'${clientId}'` | POST server action | none |

**FOUR of the five are GET-reachable, not three.** S-4 was mis-classified as POST-only in an earlier revision;
corrected here after adversarial review. `app/(dashboard)/monitor/page.tsx:50-51, 63` reads
`searchParams.client` and passes it straight to `fetchPipelineStats(clientSlug)` (imported at `:1`), so
**`/monitor?client=<payload>` reaches all five interpolations with no POST and no `Next-Action` header** — the same
property that makes S-1 severe. **Only S-5 requires a POST.**

**S-1 and S-4 are the most reachable `exec_sql` injection points in the dashboard** —
`/client-profile?client=<payload>` and `/monitor?client=<payload>` require no POST, no `Next-Action` header, and no
client-bundle inspection. Both are easier to reach than either cc-0053 sink.

**All five land inside a single-quoted literal, which is a full breakout, not a mitigation:** one `'` terminates the
literal and the payload lands in `exec_sql`'s `FROM ( … ) t` position, where a data-modifying CTE is valid. Verified
live-catalog facts (unchanged): `public.exec_sql(query text)` is SECURITY DEFINER, owner `postgres`
(`rolbypassrls=TRUE`), `provolatile='v'`, ACL `{postgres=X, service_role=X}`.
`standard_conforming_strings = on`, `backslash_quote = safe_encoding`.

**Reachability posture:** all five sit behind `middleware.ts` session-only auth. Per the standing threat model that
is **not** containment — every authenticated account is operator-equivalent. **E-Q4 is now resolved** (see
`docs/briefs/results/eq4-nextjs-server-action-route-scoping-verdict-v1.md`): none of these is *anonymously*
reachable, and that conclusion does not soften them.

### 4.1 ⚠ Correction carried forward — the count is FIVE, not six

The boundary document's §3.2 lists **`app/(dashboard)/actions/discovery-keywords.ts:32`** as a sixth unvalidated
site. **That is a false positive and must not be actioned.** Read at `origin/main`:

```
23:  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
26:  if (!UUID_RE.test(clientId)) return [];
```

The grammar is **anchored, hex-and-hyphen only, no `m` flag, no `g` flag** — it admits no quote, whitespace, or
comment character, so the site is **not injectable at `:32`**.

**Why the missing `typeof` guard is not exploitable here — stated precisely, because an earlier revision of this
reasoning was partly wrong.** `RegExp.prototype.test` and the template literal coerce the **same value through the
same `String()` conversion**, so anything passing the anchored grammar must also produce a UUID string at the
interpolation site. **The load-bearing precondition is that the two coercions cannot diverge** — i.e. no
TOCTOU: `.test()` at `:26` and the template at `:29-33` are separated only by a synchronous `createServiceClient()`
call at `:27`, **with no `await` between them**, so a stateful `toString` has no interleaving point. *That* is the
crux.

**Retracted from the earlier revision:** the claim that the RSC wire format *"delivers only plain values, never
objects carrying an adversarial `toString`"*. That is **false as written** — `decodeReply` can deliver arrays, Maps,
Sets, Dates, typed arrays and objects with an own `toString` bound to a server reference. The conclusion is
unchanged (attempts: `["<uuid>"]` coerces identically at both sites; an own `toString` bound to a `$F` server
reference resolves to a Promise, so `ToPrimitive` throws before either site sees a string; `Symbol.toPrimitive` is
not expressible in the wire format; numbers/`null`/`undefined` cannot match an anchored hyphenated grammar) — but
the *reason* was wrong and is corrected here.

**Reconciling the apparent conflict with Batch 1:** `lib/validation.ts:47-49` states the `typeof` check *"MUST stay
above the regex"*. **Both are correct, for different reasons.** `assertUuid` is a **general-purpose** validator
whose callers may separate validation from use, so it must not rely on a no-divergence precondition;
`discovery-keywords.ts` satisfies that precondition locally. **This is not a licence to omit the `typeof` guard
elsewhere** — it is why the site is not defective *as written*, not a pattern to copy.

**Recording obligation:** the boundary doc is already committed (`e2343a8`). **This brief does not edit it.** The
correction is routed to the control tower to sequence — a committed security document overstating a finding by one
site is a defect in the record, and silently dropping the site from this brief's scope without saying why would be
worse.

### 4.2 Adjacent, explicitly NOT in this lane

- `actions/client-creative-config-audit.ts` and `actions/client-creative-evidence.ts` — `clientId` protected by
  **quote-doubling only** (`replace(/'/g, "''")`), plus an in-code comment asserting the value is "a UUID from our
  roster", which is **false for a direct server-action POST**. Escaping is not validation. **Named, not scoped in**
  — adding them would change this from a five-site lane to a judgement call about escaping sufficiency, which
  deserves its own gate.
- `actions/onboarding.ts:150` — `reason` free text, quote-doubling only; **Batch 1's `assertUuid` coverage in that
  file is submission-id-only.** Inert (a bare `UPDATE` cannot parse in `exec_sql`'s subquery position) and already
  recorded as a Batch 1 residual. **Not repaired here.**
- **⚠ `app/(dashboard)/actions/digest-policy.ts:24-40` — `upsertDigestPolicy(params)`, in a file this lane
  modifies.** It passes caller-controlled `params.client_id` (and six more fields) to
  `createServiceClient().rpc('upsert_client_digest_policy', …)` with **no validation and no authz**. Bound
  parameters, so **not an injection sink** — but it is an unvalidated, unauthorized **privileged write**, exactly
  the class cc-0053's D-3 ruled *in* for `activateClient`. **Named here rather than silently omitted: a reader
  finishing cc-0054 would otherwise conclude `digest-policy.ts` is contained. Whether to scope it in is D-6.**
- **`app/(dashboard)/actions/discovery-keywords.ts:41-60` — `addDiscoverySeeds`** passes caller-controlled
  `client_id` / `keywords` / `example_urls` to `add_client_discovery_seeds` through the service-role client with no
  validation and no authz. **Same class as above.** This is why §4.1's finding is scoped precisely to *"not
  injectable at `:32`"* and **not** to "the file is not defective".
- The remaining interpolation sites repo-wide — module constants, static SQL, no-parameter actions, JS-side
  filtering, bound RPCs, or DB-sourced UUIDs. **Out of scope under §6.**

## 5. Assessment — can these be contained without DB or workflow redesign?

**Yes, for all five. No DB, RPC, EF, migration, RLS, grant, or workflow change is required**, and `lib/validation.ts`
already exists from Batch 1 — **no new module, no new dependency, no lockfile change.**

**But two distinct validators are needed, and conflating them would be a defect:**

- **S-1, S-2, S-3, S-5 take a `client_id` UUID** → `assertUuid` from `lib/validation.ts`, unchanged, applied as the
  **first statement** above any `createServiceClient()`.
- **S-4 takes a `client_slug`, not a UUID.** `assertUuid` is the wrong tool. The in-repo pattern that works is
  `actions/classifier-metrics.ts:12-15` `safeSlug()` — anchored `/^[a-z0-9-]{1,40}$/`, no quote/whitespace/comment
  character reachable. **Adding a `assertSlug`/`safeSlug` export to `lib/validation.ts` is a new export in an
  existing module** — still no new file, but it is a scope item PK should see rather than discover.

**Per-site failure contract** — these differ by boundary type and each must be stated, because a throw escaping the
wrong boundary is a new defect:

| Site | On invalid input |
|---|---|
| S-1 (server component page) | **Must not throw** — an uncaught throw renders a 500. **Verified: there is no `error.tsx`, `global-error.tsx` or `not-found.tsx` anywhere at `origin/main`, so nothing intercepts.** Render the page's existing empty/no-client state |
| S-2 (route handler) | `400` with a controlled message. ⚠ **`app/api/visuals/route.ts:14` calls `getSupabase()` BEFORE `searchParams` is read at `:15-16`** — the guard cannot simply be inserted; those lines must be **reordered** so validation precedes client construction. The helper is `getSupabase()`, not `createServiceClient()`. **Only the FIRST of the handler's three `exec_sql` calls (`:29`) is interpolated; `:38` and `:52` are static — do not "contain" those** |
| S-3 (route handler) | `400` with a controlled message. ⚠ **The whole handler is wrapped in `try { … } catch { … 500 }` (`:5`, `:22-24`) — a THROWN `InvalidUuidError` is swallowed into a 500, violating this contract.** The guard must **`return` a 400 explicitly**, not throw. *(That catch also already leaks raw `error.message`; noted, not scoped in.)* |
| **S-4 (`'use server'` AND a page)** | **Both boundaries apply.** No throw may escape the export **and** no throw may escape into `/monitor`, which has no error boundary — a throwing guard renders a 500 there. → see **D-2** |
| S-5 (`'use server'`) | **No throw may escape the export.** Returns `null` (its existing error shape) |

## 6. Explicitly OUT of scope

Any role model, allowlist, or authorization layer (Slice 0.5) · the repo-wide dynamic-SQL programme · `exec_sql`
ownership or restricted-executor redesign (Batch 6) · **the two cc-0053 sinks** · any DB, migration, RLS, grant, or
RPC change · Edge Function changes · middleware change · the §4.2 adjacent sites · re-opening Batch 1 or cc-0053 ·
converting any site to a parameterised RPC (a redesign, not containment) · UI or feature change of any kind.

## 7. Implementation envelope — pinned, still NOT authorized

| Path | Change |
|---|---|
| `app/(dashboard)/client-profile/page.tsx` | `assertUuid` on `selectedClientId` before the three getters |
| `app/api/visuals/route.ts` | `assertUuid` on `client_id`, above `getSupabase()` |
| `app/api/feeds/available/route.ts` | `assertUuid` on `clientId`, replacing the presence-only check |
| `actions/pipeline-stats.ts` | slug validation on `clientSlug`, above `createServiceClient()` |
| `app/(dashboard)/actions/digest-policy.ts` | `assertUuid` on `clientId` in `getDigestPolicy` |
| `lib/validation.ts` | **one new export** — the slug validator (D-1) |
| test file(s) — narrow | NEW — the §8 evidence |

**No** `package.json`, **no** lockfile, **no** new dependency, **no** `vitest.config.ts` change, **no** CE code,
**no** SQL, **no** middleware. **Any additional application file = STOP + renewed scope review.**

**Implementation-lane requirement:** cut an **isolated worktree from `origin/main`** at the then-current dashboard
main. **Never work in the local checkout** `C:\Users\parve\invegent-dashboard` — it sits on branch
`tmr-template-intake-ui-v0`, ahead 11 / behind 2.

## 8. Test design — mutation-sensitive, per Batch 1's standard

Batch 1 proved **outcome-based tests are mutation-blind on these paths**. Per site:

1. **Zero DB calls** on a mocked service-client spy whose `.rpc()` **resolves successfully**, plus a **positive
   control** proving the stub *is* called once for a valid input — otherwise the assertion is vacuous.
2. **Count `.rpc()`, not `createServiceClient()`** — the factory is not the privileged act.
3. A **distinct error identity** (`InvalidUuidError` / stable `code`), never a generic falsy return.
4. An explicit **`invocationCallOrder`** assertion — a guard moved below the RPC still returns the right shape and
   would pass a naive test.
5. **S-2 needs its own case for the bare-splice**: assert the assembled query contains no attacker text, since the
   fragment is spliced bare into `WHERE 1=1 ${clientFilter}`.
6. **S-4 needs a slug-grammar case**, not a UUID case.
7. **S-1 needs a "does not throw" assertion** alongside the zero-DB-call assertion — its failure contract is
   render-empty, not error.
8. **Forbidden:** grep/count-style structural checks.
9. The suite must **fail** under deliberate mutation of every guard (removed · moved below the RPC · made a no-op),
   then be restored, **with no mutation artifact committed** — branch-warden confirms the tree clean.

**⚠ Two sites where the standard above is NOT yet mutation-sensitive — fix in the build, do not inherit:**

- **S-1.** Item 7's *"does not throw"* is **mutation-blind on its own** — removing the guard entirely also does not
  throw. The load-bearing half is **zero-DB-calls**, and that is unobservable until **D-3** decides how the three
  module-private getters are watched. **§8 currently pre-specifies evidence it cannot execute; D-3 must be settled
  first, in the build.**
- **S-5.** `getDigestPolicy` returns `null` on a validation rejection **and** on a DB error (`digest-policy.ts:22`
  — `return ((data ?? [])[0]) ?? null`). A "returns null" assertion is therefore **identical with and without the
  guard** — precisely the Batch 1 trap this section cites. Item 3's *"distinct error identity"* cannot apply to a
  boundary whose contract is *return null*: **the discriminator must be call counts (zero `.rpc`) plus a
  call-through validation spy**, exactly as Batch 1's `getSubmissionDetail` case does it.

**⚠ Testability obstacle, named at Gate 1 rather than discovered mid-lane (D-3):** S-1's three getters are
**module-private** in `page.tsx` and are not exported, so they cannot be spied directly. Resolving this by exporting
them purely for test would widen the module's public surface. The alternative is to validate once at the page
component boundary and assert on the page function. **PK/implementer decision — do not let it be settled silently.**

## 8.1 ⚠ AC-LAYOUT — binding acceptance condition (PK ruling 2026-07-24)

**PK has elevated the E-Q4 finding from an observation to a binding acceptance criterion. It is a condition, not a
note, and it must be checked and its result recorded before this lane is accepted.**

> **AC-LAYOUT — No unguarded `'use server'` function may become reachable through `app/layout.tsx` or its
> transitive imports.**

**Why it is a condition and not a note.** Next 14.2.35 scopes server-action *execution* by worker ownership: an
action not owned by the requesting page is forwarded over a real HTTP fetch that **re-enters middleware**, so the
public carve-outs (`/mcp-consent`, `/mcp-github-consent`) are not an anonymous entry point. **But an action imported
— even transitively — by the root layout is owned by EVERY worker, including both carve-out pages, and therefore
executes in an UNAUTHENTICATED request context with no forward and no second middleware pass.** Full derivation:
`docs/briefs/results/eq4-nextjs-server-action-route-scoping-verdict-v1.md`. **Today this holds by accident of the
import graph, not by control. AC-LAYOUT is what converts it into a control.**

**⚠ Corrected after adversarial review — the earlier formulation was UNSOUND.** It computed the action set from a
hardcoded `app/mcp-*` glob. **`middleware.ts:35-40` also admits `/login` anonymously**, and
`app/(auth)/login/page.tsx:1` imports the `'use server'` export `login` from `actions/auth.ts` — so a lane could
satisfy the old criterion **in full while an action imported by the login page became anonymously reachable.** The
set must be **derived from `middleware.ts`**, never from a path glob: matching is by *pathname*, so a route group
(`app/(auth)/login/page`, or moving a consent page to `app/(public)/…`) changes the bundle path without changing
the pathname.

**Check procedure — run at the implementation base, then again on the final diff, and compare:**

1. `next build` in the isolated worktree.
2. **Derive P = the pathnames `middleware.ts` admits with no session.** Today: `/login`, `/mcp-consent`,
   `/mcp-github-consent`. **Read them from `middleware.ts`; do not hardcode.**
3. Map P → their build workers, then compute **A = every action owned by any of those workers** (this
   automatically covers root-layout-shared actions, rather than special-casing the layout).
4. Partition A into **guarded** (own cookie-bound `getUser()` deny check as the first statement) and a **named
   exception register** of actions that are legitimately unauthenticated. **`login`/`logout` belong in the
   register.** *Requiring a session check on the login action would make this criterion unsatisfiable — the register
   is what makes it both sound and passable.*
5. **FAIL if any member of A is in neither partition** — a new action became anonymously reachable without a
   deliberate ruling.
6. **Record A's full membership and both partitions in the result doc, as measured — never assumed.** The
   2026-07-02 figure of 1 (`emitFriction`) is **stale, wrong-branch evidence and must not be used as the baseline**
   (§9.1). Run order is **base → record → final diff → compare**; on the base run there is no prior baseline, so
   only the base→final comparison is a real growth check.

**Resolution caveat (step 3):** the manifest keys actions by hash and maps workers → **webpack module ids, not
source paths**. Resolving a member of A to its source module is therefore **not a pure manifest lookup** — the
E-Q4 precedent inferred it (all-35-workers ⇒ root-layout import, then read `app/layout.tsx`). Treat step 3 as
**reasoning to be shown in the result doc**, not as a mechanical lookup; if it cannot be resolved for some member,
say so rather than assuming.

**Failing AC-LAYOUT is a STOP**, not a finding to note and proceed past.

**Scope guard:** AC-LAYOUT is verified as a **named gate check** in this lane, run manually and recorded. It does
**not** authorize adding a CI script or any additional application file — §7's envelope is unchanged, and a new
file remains a STOP. **Whether AC-LAYOUT becomes CI-enforced is a follow-on decision (D-5), not this lane's to
take.** A check that is only ever run once is a gate, not a control; converting it to a control is the point of D-5.

**Applicability here:** cc-0054 modifies two `'use server'` modules (`pipeline-stats.ts`, `digest-policy.ts`) and one
page. None is expected to alter the root-layout import graph — **AC-LAYOUT is expected to be a no-change
confirmation.** It is required precisely so that expectation is *verified* rather than assumed.

## 9. Review chain

`security-auditor` → `db-rls-auditor` **only if** the §6 DB tripwire fires (not expected — no DB change) →
`branch-warden` → external review **pinned to the final diff hash** → **PK Gate 2**. A changed diff **voids** the
review. T2 per Convention 3; escalate to T3 if any grant, role, or enforcement surface is touched.

## 9.1 ⚠ Stale-evidence caveat — the AC-LAYOUT baseline is NOT current

**The `|A| = 1` figure (`emitFriction` alone owned by the carve-out workers) comes from
`.next/server/server-reference-manifest.json` dated 2026-07-02, produced from the local checkout's branch
`tmr-template-intake-ui-v0` — NOT from `origin/main` `1572fbd`.**

- The **E-Q4 mechanism** conclusion does *not* depend on it — that is read from pinned `next@14.2.35` source and
  stands independently.
- The **per-action baseline** does. **It must be re-derived by a build at the implementation base (AC-LAYOUT step 6)
  before it is relied on, and must never be quoted as the current state in the interim.**

This limitation is recorded per PK ruling 2026-07-24 rather than resolved here: re-deriving it requires a build,
and this lane is authoring-only.

## 10. Allowed actions (implementation lane, once authorized)

- Read-only analysis of the dashboard repo at `origin/main`.
- In an **isolated worktree**: edit exactly the seven paths in §7, add the narrow test file(s), run local checks
  (`tsc --noEmit`, `next build`, `npm test`) and the mutation suite.
- Return the diff + a deploy plan to the orchestrator for review and the PK gate.

## 11. Forbidden actions

- **No implementation until PK authorizes this brief** — Gate-1 approval alone does not authorize code.
- **No DB, migration, DDL, DML, RLS, GRANT/REVOKE, or `apply_migration`.**
- **Never revoke `exec_sql` from `service_role`** — it breaks the dashboard and ~15 CE edge functions. Break-glass
  only.
- **No deploy, redeploy, env-var change, or push** without an explicit PK gate.
- **Do not touch the two cc-0053 sinks**, `actions/onboarding.ts`, or the §4.2 adjacent sites.
- **Do not repair `discovery-keywords.ts`** — §4.1; it is not defective.
- **Do not manufacture the authenticated-approval proof** — it stays pending a natural operator event (standing PK
  ruling; a failed legitimate approval reopens Batch 1).
- **Do not broaden into the repo-wide dynamic-SQL programme or `exec_sql` re-ownership.**
- Do not commit, cut a register version, or push — the control tower serializes recording.
- Shared working directory: never `git add -A`, never `git commit -a`, never stage another session's work.

## 12. Success criteria

1. All five sites validate caller-controlled input as the **first statement**, above any service-client construction
   and above any DB call.
2. The correct validator per site — UUID for S-1/S-2/S-3/S-5, slug grammar for S-4.
3. Each site's §5 failure contract holds; **no throw escapes a `'use server'` export or the page**.
4. Mutation suite: every guard, mutated individually, **fails** the suite; all restored; **no artifact committed**.
5. `tsc --noEmit` · `next build` · full test suite clean; **no dependency or lockfile change**.
6. Changed set is **exactly** the §7 paths — `branch-warden` **safe**.
7. `discovery-keywords.ts` is **unchanged** — it is **not injectable at `:32`** (§4.1). *That is the precise claim;
   it is **not** a finding that the whole file is clean — see `addDiscoverySeeds` in §4.2.*
8. **AC-LAYOUT PASSES** (§8.1) — checked at the implementation base and again on the final diff, with `|A|` and its
   full membership **recorded as measured** in the result doc. A failure is a STOP.
9. The result doc states plainly that this lane **does not establish authorization** and **does not remediate
   `exec_sql`**.

## 13. Stop condition

Return to PK with the diff, the mutation evidence, the review verdicts, and a deploy plan. **Then stop.** Deploy is
a PK hard stop.

## 14. Open decisions for PK

| # | Decision | Note |
|---|---|---|
| **D-1** | Add the slug validator to `lib/validation.ts`, or keep it local to `pipeline-stats.ts`? | Batch 1 deliberately scoped that module to "exactly ONE concern". Adding a second export is defensible but is a stated widening, not a silent one |
| **D-2** | **S-4's fail-closed behaviour.** `classifier-metrics.ts` fails closed to *filter omitted* — for `pipeline-stats` that would silently return **global** stats for an invalid slug, i.e. a wider result set than the caller asked for | Recommend returning **zeroed/empty stats** instead. Flagged because "omit the filter" is the in-repo precedent and copying it here would be the natural mistake |
| **D-3** | S-1 testability — export the three getters for test, or validate at the page boundary? | §8. Do not settle silently |
| **D-4** | Confirm **T2**, given S-1 changes a user-visible page's behaviour on malformed input | Recommend T2 — code-only, `git revert`-able, no DB state |
| **D-5** | **Should AC-LAYOUT become CI-enforced**, or remain a per-lane gate check? | §8.1. A check run once per lane is a **gate**; a control is what stops the regression between lanes. Enforcing it needs a new file, which §7's envelope forbids — so it is a separate decision, deliberately not folded in |
| **D-6** | **Scope `upsertDigestPolicy` into this lane, or leave it named-and-excluded?** | §4.2. It is an unvalidated, unauthorized **privileged write** in a file this lane already edits — the same class cc-0053's **D-3 ruled IN** for `activateClient`. Consistency argues for including it; the pinned five-site scope argues against. **Recommend PK rule explicitly rather than let the precedent diverge silently** |

## 15. Non-claims

This brief authorizes nothing and implements nothing. **No exploitation is claimed** — the five sites are
source-to-sink reachability plus absence of validation; no payload was constructed and none was attempted. It does
**not** claim that completing cc-0054 establishes authorization, remediates `exec_sql`, or closes the dynamic-SQL
class. It does **not** claim to satisfy E-Q2 alone — only cc-0053 **and** cc-0054 together do, and only if the
underlying census is complete. That census covered the `invegent-dashboard` repo at `1572fbd` and classified every non-test `exec_sql` file; it did **not** cover non-`exec_sql` sinks, the CE repo, Edge Functions, or DB-side
functions that may themselves concatenate SQL.
