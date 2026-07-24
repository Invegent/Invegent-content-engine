CLAIMED (no register version — non-terminal) · Dashboard Containment Batch 2 · containment boundary + E-Q2 dependency proof · session S1 Dashboard Authz · 2026-07-24 +1000 Sydney

# Batch 2 — Containment Boundary + the E-Q2 Dependency Proof

**Status:** DRAFT — uncommitted, awaiting PK. The orchestrator session owns committing this.
**Companion to:** `docs/briefs/cc-0046-slice-0-5-a-class-ruling-packet-v1.md`
**Sources:** Batch 2 Gate-1 brief rev 2 (`origin/claude/containment-batch-2-brief` @ `a14dff9`) · Batch 1 result (register v6.09) · Slice 0.5 brief (`cf1e19f9…`, register v6.10)
**Evidence base:** dashboard `origin/main` = **`1572fbd`** — every source claim below re-read verbatim in this lane, not quoted from the briefs.

> ## Purpose
>
> Batch 2 is the kind of change that gets over-quoted six months later as *"the onboarding injection problem was
> fixed."* This document states **exactly what it does and does not contain**, so that sentence can be checked
> against something. §3 then proves the ordering claim **E-Q2** — that Batch 2 must land before Slice 0.5
> enforcement is switched on — from evidence rather than assertion.

---

## 0. What "Batch 2" is today — a design, not a change

| Fact | Verified |
|---|---|
| Batch 2 is a **Gate-1 brief, rev 2**. PK has answered D-1…D-4 (delete the route · validate all four entry points · include `clientId` · T2) | Brief §4 |
| It is **NOT implemented**, and has **NOT completed its own review chain** (§8: `security-auditor` → `branch-warden` → external review pinned to the brief hash → PK Gate 1) | Brief §8, §9 |
| **Its brief is not on CE `main`** — it lives only on the unmerged branch `origin/claude/containment-batch-2-brief` @ `a14dff9` | `git merge-base --is-ancestor a14dff9 origin/main` → **false**; the path does not exist on `origin/main` |
| **Both sinks are live in production right now** | Re-read verbatim from dashboard `origin/main` `1572fbd` in this lane |

**So: zero lines of production code have changed. Nothing is contained yet.** Any statement in the present tense
about Batch 2 having fixed something is wrong today.

*(Governance note for the orchestrator: a PK-approved Gate-1 brief sitting only on an unmerged branch is the same
recording gap the v6.13 recovery lane was opened to close. Flagged, not actioned — the CE registers are not this
session's to write.)*

---

## 1. What Batch 2 WOULD contain

### 1.A `app/api/onboarding/run-scans/route.ts` → **DELETE** (PK D-1)

Deletion removes, rather than guards:

- **A request-body-controlled dynamic-SQL interpolation** at `:20` — `WHERE submission_id = '${submission_id}'`,
  executed through `exec_sql` as `postgres`. `submission_id` is destructured straight from `await request.json()`.
- **Two privileged Edge Function invocations** carrying `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  (`brand-scanner`, `ai-profile-bootstrap`) with the caller-supplied id in the body, both wrapped in swallowing
  `try/catch` and explicitly non-fatal.
- **An entry point with no in-handler identity check whatsoever** — no `getUser()`, no session read.

**The DELETE disposition's evidence base, re-verified at `1572fbd` in this lane:** `git grep -n "run-scans"` across
the dashboard returns **only the route's own five `console.log`/`console.error` strings** — no component, action,
route, script, or config invokes it; `next.config.mjs` is `{}` (no rewrites, no redirects); `vercel.json` carries
only `build.env.NODE_VERSION` (no crons, no rewrites). The route was **deliberately superseded** by dashboard commit
`d2e1f93`, which created `onboarding-scans.ts` and in the same commit removed the `fetch('/api/onboarding/run-scans')`
call from the onboarding page.

**Carried caveat (do not drop it):** CE `docs/archive/ICE_Pipeline_Audit_Apr2026.md:115,118` names the "run-scans API"
as the on-demand invocation path. That is **documentation only and non-executable**, but it is an operator-habit
risk — a bookmark, a saved curl, or a Postman collection outside the four audited repos would break on deletion.
The census proves zero executable callers **in the four Invegent repos present on this machine**; it is not proof
that no external caller exists. Mitigations: the four-repo census re-run **at the implementation base as a named
pre-apply gate**, a post-deploy 404/405 observation as an explicit `runtime_verification_required` gate, and
rollback by a single `git revert`.

### 1.B `app/(dashboard)/actions/onboarding-scans.ts` → **`assertUuid` at four entry points** (PK D-2, D-3)

Five exports, read verbatim at `1572fbd`:

| Export | Privileged behaviour | Batch 2 |
|---|---|---|
| `getSubmissionScanResults(submissionId)` | `exec_sql` — `WHERE submission_id = '${submissionId}'` as `postgres` | **guard** — dynamic-SQL sink |
| `runBrandScan(submissionId)` | `fetch` → `brand-scanner` EF with **service-role Bearer** | **guard** — unvalidated input → privileged call |
| `runAiProfileScan(submissionId)` | `fetch` → `ai-profile-bootstrap` EF with **service-role Bearer** | **guard** — unvalidated input → privileged call |
| `activateClient(submissionId, clientId)` | RPC `activate_client_from_submission` — provisioning write | **guard both params** |
| `getClients()` | `exec_sql` with a **constant** query, no interpolant | untouched — not a sink |

**Verified in the catalog this lane:** `activate_client_from_submission(uuid, uuid)` — SECURITY DEFINER, owner
`postgres`, `search_path=public`, ACL `{postgres=X, service_role=X}`. Its parameters are **typed `uuid`**, so it is
**parameterised, not an injection sink** — but it is an unvalidated, unauthorized privileged *provisioning* call.
(Same shape confirmed for `draft_approve_and_enqueue(uuid)` and `approve_onboarding(uuid,text)`: no `anon`,
`authenticated`, or `PUBLIC` grant on any of the three — none is directly REST-reachable.)

> **Inventory language — carry the Batch 1 discipline.** Across both files: **two dynamic-SQL sinks**, plus **three
> unvalidated privileged non-SQL calls** (2 EF invocations + 1 provisioning RPC). **Never "five injection sinks"**
> or any similar collapse.

---

## 2. What Batch 2 does **NOT** contain — the over-quote guard

1. **It does not establish authorization.** Any authenticated user still reaches every surviving path with a
   well-formed UUID. `activateClient` still provisions a client for any authenticated caller. **Operator-equivalence
   is completely unchanged.** Batch 2 constrains the *shape* of input, never *who may act*.
2. **`exec_sql` is untouched.** Re-verified this lane: SECURITY DEFINER, owner `postgres` (`rolbypassrls=TRUE`),
   ACL `{postgres=X, service_role=X}`, `SET search_path TO 'public'`, body
   `EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query || ') t'` — **no statement filter, no
   parameterisation.** Batch 2 makes **zero DB changes**. Re-owning `exec_sql` to a restricted role is Batch 6, a
   separate unopened T3 lane.
3. **It does not address the other `exec_sql` callers — and there are six more, three of them GET-reachable.**
   **See §3.2. This is the finding that bounds what E-Q2 can actually promise**, and it means Batch 2 closes two of
   eight caller-controllable `exec_sql` paths, not the class.
4. **It does not make the Edge Functions safe.** `assertUuid` is a **shape constraint on what the dashboard
   forwards**, not a guarantee about `brand-scanner` / `ai-profile-bootstrap` internals. Their handling of
   `submission_id` is explicitly out of scope and **unverified in any lane so far**.
5. **Batch 1's residuals stay open:** the `${reason}` hand-rolled quote-doubling (byte-identical to pre-Batch-1;
   **must never be promoted into a live path or described as an approved SQL-safety mechanism**) ·
   `rejectSubmission` / `markReady` remain dead-but-present (cannot write; the buttons still exist and return
   `{ok:false}`) · the **authenticated-approval working-path proof remains pending a natural operator event**, and
   **a failed legitimate approval reopens Batch 1**.
6. **It does not touch the out-of-app REST surface.** ~18 SECURITY DEFINER functions are directly invocable over
   PostgREST by any `authenticated` principal, ~12 of them `friction.*` **writes**. Confirmed this lane: schema
   `friction` grants `authenticated` USAGE and `anon` none. **No dashboard code is involved in reaching those** — no
   dashboard-side change, Batch 2 or Slice 0.5, governs them. Separate `security-auditor` lane (E-Q12).
7. **It does not remove persistence.** Anything already planted in `cron.job` executes as `postgres` with no
   authorization boundary and **survives both a code fix and a key rotation**. Batch 2 is containment, not incident
   response.
8. **⚠ It closes a door; it does not establish that nobody went through it.** No logs or forensics have been
   reviewed and **no exploitation is claimed**. And this can never be established retrospectively: per Slice 0.5
   §F.5, production runtime logs on this Vercel plan return empty over **both** a 30-day and a 3-hour window, so
   **traffic evidence for these endpoints is structurally unavailable.** "No one called it" is not a statement
   anyone can make here.
9. **⚠ "Not anonymously reachable" is CONDITIONAL, not established.** `middleware.ts` deliberately admits two public
   path prefixes — `/mcp-consent` and `/mcp-github-consent` (verified at `1572fbd`, commented *"the page itself is
   intentionally public"*). **E-Q4 is untested:** whether a Next 14.2.35 server action is invocable from an
   *arbitrary* route or only from one whose manifest references it. If arbitrary, those carve-outs become an
   **anonymous** entry point into every unguarded `'use server'` export — which would also falsify Batch 1's
   *"nothing was anonymously reachable."* Until E-Q4 is tested, treat authenticated-only as an **assumption**.
10. **⚠ The `next` pin is load-bearing and must be treated as security-critical.** Verified at `1572fbd`:
    `"next": "14.2.35"` — above 14.2.25, so CVE-2025-29927's `x-middleware-subrequest` middleware bypass does not
    apply. **A downgrade below 14.2.25 re-opens every path in this document to anonymous callers.** Any Next
    downgrade or major upgrade must re-verify this pin as a gate.

---

## 3. E-Q2 — the proof that Batch 2 must precede enforcement

### 3.1 The proof chain

| # | Premise | Evidence |
|---|---|---|
| **P1** | `exec_sql` executes its argument as `postgres`, which bypasses RLS | `prosecdef=t`, owner `postgres`, `rolbypassrls=TRUE` — catalog read, this lane |
| **P2** | The argument lands in **subquery (`FROM`) position** | Body verified: `EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' \|\| query \|\| ') t'` |
| **P3** | Both sinks are live and carry **no in-handler identity check** | Both files read verbatim at `1572fbd` |
| **P4** | Every authenticated account is operator-equivalent | No role/RBAC/permission code exists in `app/`, `actions/`, `lib/`, `components/`; `middleware.ts` checks only that a user exists |

**P2 is the premise people get wrong.** The `SELECT … FROM ( … ) t` wrapper means a *bare* `INSERT`/`UPDATE` fails
to parse — which is why `rejectSubmission` and `markReady` are inert. **It does not make the primitive read-only.**
A **data-modifying CTE** is valid PostgreSQL in exactly that position:

```
SELECT * FROM ( WITH w AS (INSERT INTO <role table> … RETURNING 1) SELECT * FROM w ) t
```

and `exec_sql` is `provolatile='v'` in a read-write transaction, so volatile function calls are permitted too.
***A "SELECT-only" shape is a parse constraint, not a write constraint.*** *(Stated structurally. Nothing was
executed — no write, no probe, no exploit was attempted in this lane.)*

**⇒ C1 — While either sink is open, the modelled adversary can INSERT their own `administrator` row into whatever
table Slice 0.5 creates.** This holds **regardless of schema placement.** A2-INV-4's USAGE fence stops `anon` and
`authenticated` on the **direct-REST** path (boundary C-6); it stops **nothing** that reaches `postgres`, which owns
every non-`auth` schema. **This is the most likely over-read of the A2 design — "the table is in a fenced schema, so
it is safe" is false against this path.**

**⇒ C2 — The adversary can also forge the identity the read function keys on.** `auth.uid()` resolves
`current_setting('request.jwt.claims')`, and `set_config` is callable in SELECT position.
**⚠ Named substitution:** this premise is carried on the Slice 0.5 brief's 2026-07-22 `db-rls-auditor` read and was
**not** independently re-verified here — `ice_readonly` holds no USAGE on schema `auth` (42501). C1 alone is
sufficient for the conclusion; C2 strengthens it.

**⇒ Enabling enforcement while either sink is open produces a control the adversary can grant themselves.**
E-Q2 holds.

**The ordering is free.** Batch 2 is **T2** — code-only, zero DB state, rollback is one `git revert` + redeploy.
Slice 0.5 enforcement is **T3** with DDL and grants. There is no cost to sequencing Batch 2 first and no benefit to
the reverse.

**Corollary — C1 also settles E-Q13.** A principal holding `exec_sql` → `postgres` can `ALTER TABLE`, drop policies,
or change table ownership outright. Non-`BYPASSRLS` ownership therefore buys nothing against the adversary it would
be adopted to stop. (See the ruling packet, E-Q13.)

### 3.2 ⚠ Batch 2 is necessary and is **NOT sufficient** — six further paths, three of them GET-reachable

A bounded read-only `security-auditor` census at `origin/main` `1572fbd` asked one question: does any `exec_sql`
caller **other than** the two Batch 2 sinks interpolate a value an authenticated remote caller controls?
**Verdict: YES — `block`.** Six sites, in six files, with **no validation of any kind on the path.**

| # | Site | Entry point | Caller-controlled value | Reachability |
|---|---|---|---|---|
| 1 | `app/(dashboard)/client-profile/page.tsx:26,34,42` | server component page (×3 queries) | `searchParams.client` | **GET — a URL** |
| 2 | `app/api/visuals/route.ts:17→29` | `GET` route handler | `?client_id` → fragment, then **bare-spliced** into `WHERE 1=1 ${clientFilter}` | **GET — a URL** |
| 3 | `app/api/feeds/available/route.ts:18` | `GET` route handler | `?clientId` — presence check only, no shape check | **GET — a URL** |
| 4 | `actions/pipeline-stats.ts:47,50,53,56,59` | `fetchPipelineStats(clientSlug)` — `'use server'` | param 1, into five filter fragments | POST server action |
| 5 | `app/(dashboard)/actions/digest-policy.ts:20` | `getDigestPolicy(clientId)` — `'use server'` | param 1 | POST server action |
| 6 | `app/(dashboard)/actions/discovery-keywords.ts:32` | `getDiscoverySeeds(clientId)` — `'use server'` | param 1 | POST server action |

**Sites 1, 2 and 3 were spot-verified verbatim in this lane** (read directly from `origin/main`), not taken on the
census's word. Site 1 is the significant one:

> **The most reachable `exec_sql` injection point in the dashboard is not either Batch 2 sink — it is a GET-reachable
> page.** `/client-profile?client=<payload>` requires no POST, no `Next-Action` header, and no client-bundle
> inspection. It is strictly easier to reach than the two paths Batch 2 is scoped to close.

Every attacker value lands inside a **single-quoted literal** — which is a full breakout, not a mitigation: one `'`
terminates the literal and the payload lands in `FROM ( … ) t`, where §3.1's data-modifying-CTE argument applies
unchanged. All six sit behind `middleware.ts` session-only auth, which **is** the adversary (P4).

**⇒ Closing the two Batch 2 sinks does not deny the named adversary an arbitrary-write-as-`postgres` primitive.**
E-Q2's *conclusion* (Batch 2 before enforcement) survives; E-Q2's *precondition as written* does not.

**The "not tractable" judgment deserves re-examination.** The standing position is that ~140 `${}` interpolations
across the `exec_sql` caller files make per-site remediation intractable, so the durable fix is Batch 6 (re-owning
`exec_sql`). The census sharpens that: of 47 non-test files referencing `exec_sql`, the **caller-controllable and
unvalidated** subset is **six sites in six files**. Everything else is module constants, static SQL, no-parameter
actions, JS-side filtering, bound RPCs, or DB-sourced UUIDs — enumerated with a one-line reason each. **Remediating
six sites is a different proposition from remediating ~140**, and an in-repo pattern already exists:
`actions/classifier-metrics.ts:12-15` `safeSlug()` — anchored `/^[a-z0-9-]{1,40}$/`, fail-closed to *filter omitted*.

**This is PK's sequencing decision, not this session's.** The options, stated without a recommendation because the
seed forbids broadening Batch 2 and this lane is not authorized to open a remediation scope:

- **(1)** Extend containment to the six before enabling enforcement (a distinct, separately-gated lane — **not** a
  Batch 2 expansion).
- **(2)** Require Batch 6 (`exec_sql` re-ownership) before enforcement. Durable; that T3 lane is not opened.
- **(3)** Enable enforcement with the six open — **this is the outcome the Slice 0.5 brief names as "the appearance
  of authorization without the substance."**

**Settled here (closes a census open question):** `standard_conforming_strings = on`, `backslash_quote = safe_encoding`
(catalog read, this lane). So the three *quote-doubling* sites the census listed separately —
`client-creative-config-audit.ts`, `client-creative-evidence.ts`, and `onboarding.ts:150`'s `reason` — are escaped
under the live setting. **They are mitigated, not clean:** escaping is not validation, and
`client-creative-evidence.ts` carries an in-code comment asserting the `clientId` is "a UUID from our roster", which
is **false for a direct server-action POST**. Separately confirmed: **Batch 1's `assertUuid` coverage in
`actions/onboarding.ts` is submission-id-only — the `reason` interpolant at `:150` is not covered.** That is
consistent with Batch 1 §5 (the `${reason}` quote-doubling was deliberately not touched) and with `rejectSubmission`
being inert to injection, but it means the file is **not** fully validated and must not be described as such.

### 3.3 Recommended precondition wording

E-Q2 is currently phrased as *"close both `exec_sql` sinks before enforcement is switched on."* **Phrase it as the
property it is trying to buy, not the batch that is expected to buy it:**

> **No `exec_sql` path may be reachable by a principal the role model intends to deny, at the moment enforcement is
> enabled.**

Batch 2 is then *evidence toward* that precondition rather than a synonym for it — which is what keeps the gate
honest if §3.2 finds further reachable paths, and what prevents "Batch 2 shipped" from being quoted as "the
precondition is met."

---

## 4. Non-claims

This document implements nothing, authorizes nothing, and changes nothing. **No exploitation is claimed** — no logs
or forensics were reviewed, and none are available (§2.8). No write, probe, or exploit was executed against any
environment; the P2 argument is structural. The `run-scans` caller census re-verified here covers the
`invegent-dashboard` repo at `1572fbd` only, and is **not** proof that no external caller exists. `auth.uid()`'s
body was **not** re-verified in this lane (§3.1, C2).

On §3.2 specifically: the six sites are **source-to-sink reachability plus absence of validation**. **No payload was
constructed and no exploitation was attempted or is claimed.** Sites 1–3 were re-read verbatim in this lane; sites
4–6 rest on the census's trace. The cleared files are cleared **only** for "a caller-controllable value reaching
`exec_sql`" — not for any other vulnerability class. The census did not cover non-`exec_sql` sinks, the CE repo, or
any Edge Function, and it proposed no remediation. The three options in §3.2 are presented **without a
recommendation**: sequencing is PK's, and this session is not authorized to open a remediation scope.
