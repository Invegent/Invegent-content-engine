CLAIMED (no register version — non-terminal) · cc-0053 · Containment Batch 2 — Gate-1 finalization · session S1 Dashboard Authz · 2026-07-24 +1000 Sydney

# cc-0053 — Containment Batch 2: Gate-1 Finalization

**Status:** DRAFT — uncommitted, awaiting PK. The control tower owns committing this.
**Lane class / tier:** SAFETY_GATE · **T2** (PK-confirmed, D-4)
**Repo:** `invegent-dashboard` · evidence base = production `origin/main` **`1572fbd`**

> ## What this document is
>
> The Batch 2 Gate-1 brief is **already on CE `origin/main`**, landed docs-only at register v6.14 with a provenance
> header (byte-exact from `origin/claude/containment-batch-2-brief` `a14dff9`; that branch is **not merged and not
> retired**).
>
> **This document does not edit it.** Per PK ruling 2026-07-24, corrections are recorded as **superseding evidence
> without rewriting history**. This finalization adds the four things the landed brief cannot carry: the **task ID**,
> the new **AC-LAYOUT acceptance condition**, the **corrected site arithmetic**, and the **D3 consequence**.
>
> **It authorizes no code.** Batch 2 remains NOT IMPLEMENTED.

---

## 1. Task identity

**`cc-0053` = Dashboard Privileged-Action Containment, Batch 2.** Assigned from S1's reserved range
(cc-0053–cc-0057) per the orchestrator directive. The landed brief predates the assignment and carries no task ID;
**this document is where `cc-0053` attaches.** Sibling: **`cc-0054`** (the five caller-controllable `exec_sql`
sites) — a distinct lane, not a successor.

**Unchanged from the landed brief:** PK rulings D-1 (DELETE the `run-scans` route) · D-2 (validate **all four**
`submissionId` entry points) · D-3 (include `activateClient`'s `clientId` — both parameters) · D-4 (T2). The
implementation envelope, per-site failure contracts, §7 test design, and §7.1 deletion-branch evidence standard are
all unchanged and remain binding.

## 2. ⚠ Corrected arithmetic — SUPERSEDES the count in the landed documents

The landed Batch 2 brief's companion header and
`docs/briefs/dashboard-containment-batch-2-boundary-and-eq2-proof-v1.md` §3.2 (committed `e2343a8`, now pushed)
state **six** further caller-controllable `exec_sql` sites. **The correct figure is five.**

**`app/(dashboard)/actions/discovery-keywords.ts:32` was a census false positive.** Read at `origin/main`:

```
23:  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
26:  if (!UUID_RE.test(clientId)) return [];
```

Anchored, hex-and-hyphen only, **no `m` flag, no `g` flag** — admits no quote, whitespace, or comment character, so
the site is **not injectable at `:32`**. The missing `typeof` guard is not exploitable **because
`RegExp.prototype.test` and the template literal coerce the same value through the same `String()` conversion, and
the two coercions cannot diverge**: `:26` and `:29-33` are separated only by a synchronous call at `:27`, with **no
`await` between them**, so a stateful `toString` has no interleaving point. **It must not be "fixed".**

*Precision, per adversarial review:* the claim is **"not injectable at `:32`"**, not "the file is clean" — see
`addDiscoverySeeds` (cc-0054 §4.2). And an earlier revision justified this with *"the RSC wire format delivers only
plain values"*, which is **false as written** and is retracted; the no-divergence argument above is the load-bearing
one. Full reasoning and the reconciliation with `lib/validation.ts:47-49` is in **cc-0054 §4.1**.

**Corrected totals — the figures to quote from here on:**

| | Count | Owner |
|---|---|---|
| Caller-controllable `exec_sql` paths at `1572fbd` | **7** | — |
| `app/api/onboarding/run-scans/route.ts:20` · `app/(dashboard)/actions/onboarding-scans.ts:75` | **2** | **cc-0053** |
| The five sites in `client-profile/page.tsx`, `api/visuals/route.ts`, `api/feeds/available/route.ts`, `pipeline-stats.ts`, `digest-policy.ts` | **5** | **cc-0054** |

**Recording route:** superseding evidence in the next recording pass. **Do not edit the committed boundary doc or
the landed brief.**

## 3. D3 ruling and what it means for cc-0053

**PK ruled D3 = Option 1: Slice 0.5 enforcement may NOT be enabled until ALL SEVEN caller-controllable `exec_sql`
paths are contained.**

> **⇒ Completing cc-0053 does NOT unblock enforcement. cc-0053 and cc-0054 must BOTH land first.**
>
> This must be stated in the cc-0053 result doc. "Batch 2 shipped" is **not** a synonym for "the E-Q2 precondition
> is met" — the precondition is the property *no `exec_sql` path is reachable by a principal the role model intends
> to deny*, and cc-0053 discharges two sevenths of it.

**Also unchanged and still true:** cc-0053 does **not** establish authorization (all authenticated users remain
operator-equivalent), does **not** remediate `exec_sql` (Batch 6, T3, unopened), and does **not** make
`brand-scanner` / `ai-profile-bootstrap` safe — `assertUuid` constrains only what the dashboard forwards.

## 4. ⚠ AC-LAYOUT — new binding acceptance condition (PK ruling 2026-07-24)

**PK has elevated the E-Q4 finding from an observation to a binding acceptance criterion.**

> **AC-LAYOUT — No unguarded `'use server'` function may become reachable from any worker that `middleware.ts`
> admits anonymously** — whether imported by that page directly, or pulled in transitively via `app/layout.tsx` or
> any component it renders.

*PK's ruling worded this as "through `app/layout.tsx` or its transitive imports". That is the **most likely
route** into the anonymous surface, but not the **whole set** — the root layout is one way in, and `/login` imports
an action directly. The wording above is the same condition stated over the set that actually matters; it is
strictly broader and subsumes PK's formulation.*

**Why.** Next 14.2.35 forwards an action not owned by the requesting page over a real HTTP fetch that **re-enters
middleware**, so the carve-outs are *not* an anonymous entry point for the `(dashboard)` surface. **But an action
owned by an anonymously-admitted page's worker — including every root-layout-shared action — executes in an
UNAUTHENTICATED request context with no forward and no second middleware pass.**
Derivation: `docs/briefs/results/eq4-nextjs-server-action-route-scoping-verdict-v1.md`. **Today this holds by
accident of the import graph, not by control.**

**⚠ Corrected after adversarial review — the first formulation was UNSOUND.** It derived the action set from a
hardcoded `app/mcp-*` glob. **`middleware.ts:35-40` also admits `/login` anonymously**, and
`app/(auth)/login/page.tsx:1` imports the `'use server'` export `login` from `actions/auth.ts` — so a lane could
satisfy the old criterion **in full while an action imported by the login page became anonymously reachable.**
The set must be **derived from `middleware.ts`**, never from a path glob (matching is by *pathname*, so a route
group changes the bundle path without changing the pathname).

**Check procedure — run at the implementation base, then on the final diff, and compare:**

1. `next build` in the isolated worktree.
2. **Derive P = the pathnames `middleware.ts` admits with no session** — today `/login`, `/mcp-consent`,
   `/mcp-github-consent`. Read them from `middleware.ts`; do not hardcode.
3. Map P → their build workers; **A = every action owned by any of those workers** (this covers root-layout-shared
   actions without special-casing the layout).
4. Partition A into **guarded** (own cookie-bound `getUser()` deny check as first statement) and a **named
   exception register** of legitimately-unauthenticated actions. **`login`/`logout` belong in the register** —
   demanding a session check on the login action would make the criterion unsatisfiable.
5. **FAIL if any member of A is in neither partition.**
6. **Record A's membership and both partitions in the result doc, as measured** — never assumed. Order is
   base → record → final diff → compare; the base run has no prior baseline, so only base→final is a real
   growth check.

**Resolution caveat:** the manifest maps workers → **webpack module ids, not source paths**, so step 3 is
**reasoning to be shown**, not a mechanical lookup. If a member cannot be resolved, say so rather than assume.

**Failing AC-LAYOUT is a STOP.**

**Why it is not a formality for cc-0053 specifically:** this lane **deletes a route** (`run-scans`) and edits a
`'use server'` module. **Deleting a route removes a worker and changes the manifest**, so the before/after
comparison is not vacuous here even though no root-layout import is expected to change. Run it on both sides.

**Scope guard:** AC-LAYOUT is a **named gate check**, run manually and recorded. It does **not** authorize a CI
script or any additional application file — the landed brief's §6 envelope is unchanged and any additional
application file remains a **STOP + renewed scope review**. Whether AC-LAYOUT becomes CI-enforced is a follow-on
decision, tracked as **cc-0054 D-5**, and is deliberately not folded into either lane.

## 5. ⚠ Stale-evidence caveat — the AC-LAYOUT baseline is NOT current

The `|A| = 1` figure (`emitFriction` alone, via `FrictionFAB` in `app/layout.tsx`) was read from
`.next/server/server-reference-manifest.json` dated **2026-07-02**, built from the local checkout's branch
`tmr-template-intake-ui-v0` — **not** `origin/main` `1572fbd`.

- The **E-Q4 mechanism** conclusion does **not** depend on it (pinned `next@14.2.35` source) and stands.
- The **per-action baseline** does, and **must be re-derived at the implementation base (step 6) before reliance.
  It must never be quoted as the current state in the interim.**

Recorded per PK ruling rather than resolved: re-deriving requires a build, and this lane is authoring-only.

## 6. Review chain — status

| Stage | Status |
|---|---|
| PK D-1…D-4 | **ANSWERED** (2026-07-22), unchanged |
| `security-auditor` (brief) | **run in this lane — see §7** |
| `db-rls-auditor` | **not required** — §5 DB tripwire has not fired; no DB, grant, or schema change is contemplated. Substitution named per CCF-02 R1 |
| `branch-warden` | **N/A at Gate 1** — nothing is staged, committed, or branched; this lane authors only. Required before any Gate-2 commit |
| External review pinned to the brief hash | **PK gate — not run in this lane.** See §8 |
| **PK Gate 1** | **PENDING** |

## 7. `security-auditor` verdict on this finalization

**Verdict: `concerns` (AMBER)** — 7 must-fix, 10 should-fix. **All 7 must-fix were verified by me against source
and applied**; the review's own conclusion was *"the five-site correction, the seven-path conclusion, the 'do not
fix discovery-keywords' call, and the T2 tier all survive adversarial checking and should stand."*

The consequential one was **MF-1: AC-LAYOUT as first written was unsound** — a compliant lane could satisfy it
while regressing the invariant, because `/login` is anonymously admitted and owns a `'use server'` export.
Corrected in §4 (derive from `middleware.ts` + exception register) and in the E-Q4 verdict, which was
**rev-2'd to retract its "exactly one action" headline**.

Full evidence, finding-by-finding disposition, and the residual open items:
`docs/briefs/results/cc-0053-cc-0054-gate1-review-evidence-v1.md`.

## 8. Open items for PK

| # | Item |
|---|---|
| **F-1** | **External review** is pinned to a hash and is a PK-gated outbound call. This lane did not run it. Confirm whether the Gate-1 external review runs on the **landed brief hash**, on **this finalization**, or on **both as one packet** — a review of the landed brief alone would not cover AC-LAYOUT or the corrected arithmetic |
| **F-2** | **Retirement of `origin/claude/containment-batch-2-brief`** — the landing explicitly did not retire it. Still a PK call |
| **F-3** | **Sequencing cc-0053 vs cc-0054.** D3 requires both before enforcement but does not order them between themselves. cc-0054 contains the **GET-reachable** sites, which are more reachable than either cc-0053 sink — relevant to ordering, but the call is PK's and **no recommendation is made here** |
| **F-4** | **AC-LAYOUT as a control (cc-0054 D-5)** — a per-lane gate check does not stop a regression *between* lanes |

## 9. Non-claims

This document authorizes nothing and implements nothing. It does **not** edit the landed Batch 2 brief or the
committed boundary document. **No exploitation is claimed** — no payload was constructed and none was attempted.
It does **not** claim cc-0053 satisfies E-Q2, establishes authorization, or remediates `exec_sql`. The `|A| = 1`
baseline is **explicitly not current** (§5). The seven-path total rests on a census of the `invegent-dashboard` repo
at `1572fbd` covering every non-test `exec_sql` file (51 match `exec_sql`; 50 excluding `tests/`); it did **not** cover non-`exec_sql` sinks, the CE repo, Edge
Functions, or DB-side functions that may themselves concatenate SQL.
