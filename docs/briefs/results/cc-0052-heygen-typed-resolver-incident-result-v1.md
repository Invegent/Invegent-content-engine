# Result cc-0052 — HeyGen Avatar Typed-Resolver: `DEPLOYED → INCIDENT → ROLLED_BACK`

**Status:** `DEPLOYED → INCIDENT → ROLLED_BACK` · implementation NOT on main and NOT to be reintroduced
**Lane classification (CCF-02):** SAFETY_GATE / production incident · T3 (EF deploy)
**Recorded:** 2026-07-24 (retrospective — governance recovery lane; PK ruling of 2026-07-24)
**Brief:** `docs/briefs/cc-0052-heygen-avatar-typed-resolver-brief.md` — ⛔ refuted, do not execute
**Canonical ID:** `cc-0052` — renumbered from `cc-0048`; see §6.

> ⚠ **RETROSPECTIVE record.** This lane produced no result document at the time. It is reconstructed
> from git, the live deployed Edge Function bundle, and live DB state. **The parent planning lane
> (`cc-0047`) remains PK-ACCEPTED and valid — this is the failure of its *named next slice*, not of
> the plan itself.**

---

## 1. What was attempted

Replace `lookupAvatar`'s string-interpolated `exec_sql` query in `supabase/functions/heygen-worker/index.ts`
with a supabase-js query-builder resolver, claimed at **strict behavioural parity**. The brief pinned
the mechanism to an Edge Function query-builder implementation and explicitly de-scoped an RPC, with
a STOP condition: *"an awkward or materially expanded join needed to hold strict parity → STOP →
return to PK."*

**Motivation was legitimate:** the `exec_sql` call interpolates `clientId` / `renderStyle` /
`stakeholderRole` directly into SQL — the same injection shape as the dashboard `exec_sql` findings.
The *goal* was right; the *mechanism* was wrong and the STOP did not fire.

## 2. What shipped

**Commit `69541fd`** — `feat(heygen-worker): cc-0048 avatar lookup exec_sql→query-builder v2.4.0
(strict parity)`, 2026-07-23T04:30:01Z, parent `af0d9b7`.
**On branch `origin/claude/new-session-swx6cf` only — never on `origin/main`.**
Scope: `supabase/functions/heygen-worker/index.ts` +30/−14, plus `index.test.ts` (+177 across the
branch). Deployed to project `mbkmaxqhsohbtwsqolns` as heygen-worker **v2.4.0**.

## 3. The defect

The rewritten lookup was:

```
.schema('c').from('brand_avatar')
.select('…, brand_stakeholder!brand_avatar_stakeholder_id_fkey!inner(role_code)')
```

and it destructured **only `data`** — `error` was never checked.

**Root cause:** the **`c`-schema PostgREST `!inner` embed does not resolve via supabase-js at
runtime**; the query errors. Because `error` was discarded, the failure surfaced as a **false null**
→ `lookupAvatar` returned null → the caller threw *"No active avatar"*.

**Proven a false negative, not a data change:** the SQL-equivalent inner-join still returns the NDIS
avatar (`7e98bd38…` / voice `P2AIevlJPypjV8xL6zXE`), and every prior day the `exec_sql` path selected
it. No avatar row was deactivated or altered.

**"Strict parity" was asserted, not demonstrated.** The claim compared an `exec_sql` string join
against a query-builder `!inner` embed on a **non-`public` schema** — two materially different
execution paths — and was validated by unit tests that could not exercise the live PostgREST
resolution.

## 4. Incident and casualty

| | |
|---|---|
| Deploy window opens | `69541fd` 2026-07-23T04:30:01Z |
| **Live casualty** | NDIS Yarns `video_short_avatar` draft → `video_status='failed'` at **2026-07-23T09:30:04Z** |
| Rollback complete | heygen-worker fn **43**, 2026-07-23T10:21:04Z |

The failed draft is the only avatar-draft state change inside the window.

**No `m.post_render_log` row exists for the outage — by design, not missing evidence.** Submit-phase
failures are deliberately not logged (no `provider_job_id` exists yet; the telemetry is scoped to
terminal render outcomes). Anyone auditing this incident via `post_render_log` alone will find
nothing and must not conclude the outage did not occur.

## 5. Rollback — mechanics and live verification

**Sanctioned path, PK-elected.** CWD `heygen-worker` on `main` (`e232607`) was byte-identical to the
v2.3.0 `exec_sql` source → `scripts/safe-deploy.sh heygen-worker --allow-warn`.

The gate first read **stale A-LE** (drift last checked before the bad deploy) → **BLOCK**. A targeted
`drift-check?write=true&slug=heygen-worker` refresh reclassified **B-RR** (deployed ahead of repo) →
`--allow-warn` **PASS** → deploy → final refresh **A-LE clean**.

**Live verification by this recovery lane (2026-07-24, read-only)** — the deployed bundle was re-read
and inspected directly:

| Check | Result |
|---|---|
| `VERSION` | `heygen-worker-v2.3.0` ✅ |
| Supabase function version | **43** |
| `lookupAvatar` implementation | uses **`exec_sql`** ✅ (rollback content-proven) |
| `!inner` embed / `brand_avatar_stakeholder_id_fkey` | **ABSENT** ✅ |
| `verify_jwt` | **`false`** ✅ (401→502 guard intact; pinned by `config.toml`) |
| Drift (`ice_ro.deploy_drift_status`, 07-23T17:00:06Z) | **A-LE clean**, deploy == repo `2.3.0` |

A CLI redeploy mints a **new function version number and a different `ezbr`**, so version identity
alone proves nothing — the authoritative check is grepping the **deployed bundle** for the marker,
per the bundles-from-CWD trap.

## 6. Canonical ID

Renumbered `cc-0048` → **`cc-0052`**, PK ruling 2026-07-24 (final). `cc-0048` was already claimed by
the image-worker creative-contract registry recovery (`5a6c998`, 2026-07-22T06:41:26Z) — which was an
**ancestor of this lane's own branch**. Earliest committed claim keeps the number.
Alias trail preserved in the brief header and in
`docs/briefs/results/governance-recovery-lane-2026-07-24-result-v1.md` §3.

## 7. ⚠ Governance gap — the gate that was crossed

Branch register **v6.12** (`af0d9b7`, 2026-07-23T01:29:03Z) stated:

> *"The brief authorises **NO code, DB change, deployment, cutover or production-selection change** —
> issuance only… **Next gate: explicit PK authorisation to open the cc-0048 implementation lane.**"*

**Three hours later `69541fd` implemented it, and it was deployed.** No artifact records the PK
authorization the register itself declared to be the required next gate.

**Either the authorization was given and never recorded, or the gate was crossed. This cannot be
determined from available evidence and is NOT guessed.** No result doc, register entry, external
review id, or deploy-gate artifact exists for the implementation or the deploy.

## 8. Reusable lessons

1. **A supabase-js query that destructures only `data` hides every query error as a false null.**
   Always destructure and check `error`. This is the defect; everything else is context.
2. **"Strict parity" between an `exec_sql` string join and a query-builder `!inner` embed is not a
   safe assumption on non-`public` schemas.** The `c` schema is reachable over PostgREST, but embed
   resolution is not equivalent to an in-SQL join.
3. **Verify a resolver change against a real live submit**, not against a parity claim and unit tests.
4. **A worker whose failure path writes no telemetry row is invisible to log-based auditing** —
   know where a lane's failures *do not* appear before trusting an all-clear.
5. **A pinned mechanism in a brief is a risk concentrator.** Pinning the query-builder and de-scoping
   the RPC removed the fallback that would have avoided this.

## 9. Disposition

- **Implementation NOT landed on main and NOT to be reintroduced** (PK ruling 2026-07-24).
  `69541fd` remains on `origin/claude/new-session-swx6cf` as historical evidence.
- **The `exec_sql` injection shape in `lookupAvatar` therefore REMAINS OPEN** — the rollback restored
  the vulnerable-shaped code. This is accepted for now: the security concern is real but not
  anon-reachable (service-role only), while the outage was immediate and customer-visible.
- **Any future typed-resolver attempt requires a NEW brief under a new gate**, and must prove its
  contract and error behaviour (including a live submit) before deploy. It must not inherit this
  brief's pinned mechanism.
- Owner: **S3 — AGP Identity**, which begins **planning-only** and must not touch heygen-worker until
  `cc-0047` is durably on main and a new implementation gate is approved.
- **Branch retirement** is gated on all durable evidence being present on main; this document, the
  landed `cc-0047` brief + result, and the landed `cc-0052` brief are that evidence.

## 10. Status vocabulary applied

`PLANNED` yes (brief `191db5f`) · `DEPLOYED` **yes** (v2.4.0, branch-only source) ·
**`ROLLED_BACK` yes** (v2.3.0, fn 43, content-verified §5) · `RECOVERED` **yes** (avatar path
restored; NDIS casualty draft is a separate recoverable item) · `PROVEN` **n/a — approach REFUTED** ·
`PK-ACCEPTED` **no artifact found for the implementation or the deploy** (§7).
