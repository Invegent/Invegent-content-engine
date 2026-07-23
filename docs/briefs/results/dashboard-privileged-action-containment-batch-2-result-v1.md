# Result — Dashboard Privileged-Action Containment · Batch 2 (DEPLOYED · CONTAINMENT VERIFIED · PK-ACCEPTED)

**Brief:** `docs/briefs/dashboard-privileged-action-containment-batch-2-brief-v1.md` (CE `a14dff9`, sha256 `26d53068f66375f56af7d563c56a5c6a1364aeb00b5a5fc4eb34b526408e87b6`, PK-approved rev 2)
**Predecessor / threat model:** `docs/briefs/results/dashboard-privileged-action-containment-batch-1-result-v1.md` (register v6.09)
**Repo:** `invegent-dashboard` · base `origin/main` `1572fbd` → impl HEAD **`6fe8d1e`** (now `origin/main`)
**Final implementation diff hash:** sha256 `d4c2d5ff01dfa184a9a43ded3a246a05e8c5005c17dd4b2d68077ee07ed6abca` (base `1572fbd` → head `6fe8d1e`)
**Lane class / tier:** SAFETY_GATE · T2 · **Status:** `DEPLOYED to production under a PK Convention-2 sequence · CONTAINMENT VERIFIED via live production test · PK-ACCEPTED (containment) 2026-07-23 · deployment retained`.
**PK ruling (2026-07-23):** rollback **REJECTED** — the live activation failure is not a Batch 2 regression (evidence below); Batch 2 closeout finalized; the activation defect is a **separate out-of-scope handoff** (new lane **cc-0049 / F-ONB-ACTIVATE-NOLOGO-1**), read-only diagnosis + Gate-1 brief only, no fix authorized.

> **Scope truth (do not overstate):** Batch 2 closes the two **identified onboarding privileged-input paths** left open by Batch 1. It does **NOT** establish authorization — every authenticated user still reaches these paths with a well-formed UUID (that is Slice 0.5). `assertUuid` on the EF paths is a shape constraint on what the dashboard forwards, **not** a guarantee about `brand-scanner`/`ai-profile-bootstrap` internals (out of scope). ~40 further repo-wide interpolation sites remain correctly out of scope.

## 1. What was implemented (PK decisions D-1…D-4)

**D-1 — DELETE `app/api/onboarding/run-scans/route.ts`.** A deliberately-superseded orphan (replaced by `onboarding-scans.ts` in `d2e1f93`) whose POST handler took request-body `submission_id` straight into `exec_sql WHERE submission_id='${submission_id}'` as `postgres`, then fired two service-role Edge Functions. Deleted whole; parent `app/api/onboarding/` directory is now empty. `git grep run-scans` → 0 matches.

**D-2 / D-3 — validate the four user-input exports in `app/(dashboard)/actions/onboarding-scans.ts`.** `assertUuid` (from `lib/validation.ts`, shipped in Batch 1, **unchanged**) is the FIRST statement of each guarded export, above any `createServiceClient()` / `fetch` / `.rpc()`:

| Export | Guard | Failure contract (no throw escapes `'use server'`) |
|---|---|---|
| `runBrandScan(submissionId)` | `assertUuid(submissionId)` | `{ok:false, error:'Invalid submission id'}` → zero fetch |
| `runAiProfileScan(submissionId)` | `assertUuid(submissionId)` | `{ok:false, error:'Invalid submission id'}` → zero fetch |
| `activateClient(submissionId, clientId)` | `assertUuid(submissionId)` then `assertUuid(clientId)` (two guards, distinct messages) | `{ok:false, error:'Invalid submission id'}` / `{ok:false, error:'Invalid client id'}` → zero rpc |
| `getSubmissionScanResults(submissionId)` | `assertUuid(submissionId)` | `{brand_scan_result:null, ai_profile_scan_result:null}` → zero rpc |

`getClients()` (no user input, constant query) unchanged.

**D-4 — Tier T2.**

## 2. Evidence

**Changed-file envelope (exactly 3):** `M app/(dashboard)/actions/onboarding-scans.ts` · `D app/api/onboarding/run-scans/route.ts` · `A tests/onboarding-scans-actions.test.ts`. Unchanged (verified): `lib/validation.ts`, `vitest.config.ts`, `package.json`, `package-lock.json`, `tsconfig.json`.

**Automated:** narrow suite 45/45 · full suite **128/128** · `tsc --noEmit` exit 0 · clean `npm ci` (177 pkgs) · `next build` exit 0 (deleted route absent from build manifest; no unresolved import; restoring the route reintroduces it to the manifest, then absent again after re-delete — absence-check is sensitive).

**Mutation checks (all caught → red, all restored byte-identical to golden, no artifact committed; branch-warden confirmed clean):**

| Mutation | Result |
|---|---|
| `runBrandScan` guard removed | 8 fail |
| `runAiProfileScan` guard removed | 8 fail |
| `getSubmissionScanResults` guard removed | 8 fail |
| both `activateClient` guards removed | 16 fail |
| ONLY `submissionId` guard removed | exactly the 8 malformed-submissionId(valid-clientId) cases fail |
| ONLY `clientId` guard removed | exactly the 8 malformed-clientId(valid-submissionId) cases fail (per-parameter D-3 proof) |
| validator no-op | 40 fail |

**Caller census (D-1 pre-apply gate, re-run at implementation base `1572fbd`):** zero executable callers of `run-scans` in the two repos present in this session (`invegent-dashboard`, `Invegent-content-engine`). `invegent-portal` + `invegent-web` are NOT present in this session; their zero-caller result is carried from the `a14dff9` review. PK ruling: an unknown external caller would be a loud 404, covered by single-commit rollback.

## 3. Review chain (T2, §8)

| Stage | Verdict |
|---|---|
| `security-auditor` | **clean / GREEN**, high confidence, zero must_fix / should_fix |
| `branch-warden` | **safe** — HEAD `6fe8d1e`, 1 ahead / 0 behind `1572fbd`, clean isolated worktree, exact 3-file envelope |
| external review (impl, pinned to `d4c2d5ff…`) | **agree / proceed**, no escalation, medium risk / high confidence, no pushback — review_id `a68b5c2f-e25c-4dc7-a967-57e7884779a4` |

`db-rls-auditor` not required — no DB/grant/schema change (§8 tripwire did not fire).

## 4. Deploy (PK Convention-2 sequence — pinned `6fe8d1e` / `d4c2d5ff…`)

Pre-flight STOP-checks all held: origin/main unmoved at `1572fbd`, HEAD == `6fe8d1e`, diff hash == `d4c2d5ff…`, exact 3-file envelope. Landed via FF `origin/main` `1572fbd → 6fe8d1e` (clean fast-forward), triggering the Vercel production deploy from `main`.

- **Production deployment identity:** **`dpl_F8Npuxdd2yZ7xgSaRpQgaHP2i9mr`** — `state=READY`, `target=production`, `githubCommitSha=6fe8d1e`, `aliasError=null`, aliased to `dashboard.invegent.com` / `invegent-dashboard.vercel.app`. Deployed-artifact STOP-check: deployed sha == pinned head ✅. (The same commit had already built green as a preview `dpl_945G7RpaQUeX3K6ufs417R3HmQuL`.)
- **Rollback (validated, ready):** `git revert 6fe8d1e` + redeploy, **or** Vercel instant-rollback to `dpl_6qx1dcHGLp4Xw1CTY6U463fjPGXH` (= `1572fbd`, the pre-Batch-2 production deployment, `isRollbackCandidate:true`). **No DB state to unwind**, no grant, no migration.

## 5. Post-deploy runtime verification (`runtime_verification_required`) — PK live production test, 2026-07-23

PK ran the five checks in an authenticated browser against production (deployment `dpl_F8Npuxdd2yZ7xgSaRpQgaHP2i9mr`). Verbatim outcomes, reframed against **Batch 2's actual scope**:

| # | Check | PK result | Batch-2 verdict |
|---|---|---|---|
| 1 | Deleted route gone | `fetch('/api/onboarding/run-scans', POST)` (authenticated) → **404** | ✅ **PASS** — orphan route verified absent live |
| 2 | Onboarding screen works | Submissions list rendered; "ZZ Lane B Smoke Test" detail + scan panel loaded, no error banner | ✅ **PASS** |
| 3 | Scans run on a real submission | Brand scan completed (**"no logo found"** — benign warning); AI profile scan completed, persona/voice populated; **no "Invalid submission id" anywhere** | ✅ **PASS** — a valid UUID cleared the new guard and reached the live path |
| 4 | Activation | Selected "Care For Welfare Pty Ltd" → Activate → failed with DB error `new row for relation "client_brand_profile" violates check constraint "client_brand_profile_logo_extraction_method_check"` | ✅ **Batch-2 boundary PASS** / ⚠ **separate defect** — see below |
| 5 | No new errors | The constraint error above surfaced during activation | ✅ **no Batch-2-introduced error** — see below |

**Check 4 / 5 — accurate reading (PK ruling 2026-07-23).** The activation failure is **NOT** a Batch 2 regression:

- The error is **not** the guard (`"Invalid submission id"` / `"Invalid client id"`) — it is a **downstream Postgres check-constraint violation**, which proves the guard **admitted the valid IDs** and the RPC **executed**. That is the guard behaving exactly as designed.
- Batch 2's only change to this path is `assertUuid(submissionId)` / `assertUuid(clientId)`; `assertUuid` returns the value **verbatim** and the RPC is called with the **original, unmutated** variables. For valid IDs the guard is a pass-through → the RPC received **byte-identical inputs to pre-Batch-2**. The same activation of the same no-logo submission would have failed identically at `1572fbd` (and pre-Batch-1).
- Batch 2 changed **no** DB schema, RPC, migration, constraint, or brand-scanner code (its envelope was 3 dashboard files). The deleted `run-scans` route was a zero-caller orphan and plays no part in the scan or activation paths PK exercised.
- **Conclusion:** the constraint error is **surfaced by** a genuine end-to-end test, not **introduced by** this change. It is a **pre-existing production defect** in the onboarding→activation data contract (no-logo brand scans write a `logo_extraction_method` outside the constraint's `{scraped, uploaded, manual}` allowed set), independent of Batch 2.

**Deploy artifact + identity checks (session-side):** production deployment identity ✅ verified (Vercel ground truth, §4); deleted route absent from the deployed artifact ✅ verified (build manifest of `6fe8d1e`).

**⚠ This result does NOT claim onboarding activation works end-to-end for no-logo submissions.** A genuine production test surfaced a **separate, pre-existing defect** that breaks activation for any client whose brand scan finds no logo. That defect is handed off to a distinct lane — **cc-0049 / F-ONB-ACTIVATE-NOLOGO-1** (read-only diagnosis + Gate-1 brief; no fix authorized by the Batch 2 lane or the 2026-07-23 ruling). It is **not** a Batch 2 acceptance failure.

**Batch 2 containment — VERIFIED + PK-ACCEPTED (2026-07-23):** deleted orphan route absent (404 live) · valid identifiers admitted through the new guards (scans ran) · malformed privileged-input paths contained (128 automated + mutation tests) · no Batch-2-caused production regression · deployment retained.

## 6. Stop condition & handoffs

Batch 2 closes the two identified onboarding privileged-input paths. It does not establish authorization (Slice 0.5) and does not remediate `exec_sql` generally. **Slice 1 remains blocked on Slice 0.5.** Batch 2 is the integrity precondition (Slice-0.5 brief E-Q2) to enabling Slice-0.5 enforcement — with both `exec_sql` sinks now closed, that precondition is satisfied.

**Handoffs (evidence, not decisions):**
- **Slice 0.5:** both onboarding `exec_sql` sinks are closed as of `6fe8d1e` (Slice 0.5 owns the enforcement-ordering ruling, E-Q2).
- **cc-0049 / F-ONB-ACTIVATE-NOLOGO-1 (new lane):** onboarding activation fails for no-logo submissions on `client_brand_profile_logo_extraction_method_check`. Surfaced by the Batch 2 production test; **pre-existing, DB/RPC-layer, out of Batch 2 scope.** Authorized (2026-07-23) for read-only diagnosis + a Gate-1 brief only — no fix, migration, RPC, constraint, or data change. Batch 2 closeout does not wait on it.
