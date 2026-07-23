# Result — Dashboard Privileged-Action Containment · Batch 2 (DEPLOYED · live functional verification PENDING)

**Brief:** `docs/briefs/dashboard-privileged-action-containment-batch-2-brief-v1.md` (CE `a14dff9`, sha256 `26d53068f66375f56af7d563c56a5c6a1364aeb00b5a5fc4eb34b526408e87b6`, PK-approved rev 2)
**Predecessor / threat model:** `docs/briefs/results/dashboard-privileged-action-containment-batch-1-result-v1.md` (register v6.09)
**Repo:** `invegent-dashboard` · base `origin/main` `1572fbd` → impl HEAD **`6fe8d1e`** (now `origin/main`)
**Final implementation diff hash:** sha256 `d4c2d5ff01dfa184a9a43ded3a246a05e8c5005c17dd4b2d68077ee07ed6abca` (base `1572fbd` → head `6fe8d1e`)
**Lane class / tier:** SAFETY_GATE · T2 · **Status:** `DEPLOYED to production under a PK Convention-2 sequence · live functional verification + PK operational acceptance PENDING`.

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

## 5. Post-deploy runtime verification (`runtime_verification_required`)

| # | Check | Status |
|---|---|---|
| 1 | Production deployment identity | ✅ VERIFIED (Vercel ground truth — §4) |
| 2 | Deleted route absent from the deployed artifact | ✅ VERIFIED at artifact level (production build of `6fe8d1e` has no `run-scans` route) |
| 3 | Deleted route returns 404/405 to a live caller | ⏳ **PK BROWSER** — not observable from this session: outbound egress policy blocks `dashboard.invegent.com` (agent-proxy 403), and middleware redirects unauthenticated `/api/**` → `/login` (307), masking the 404. The literal 404 is observable only with an authenticated session. |
| 4 | `/onboarding` list + detail load | ⏳ **PK BROWSER** (network-blocked + auth-gated here) |
| 5 | Brand scan + AI profile scan working paths healthy | ⏳ **PK BROWSER** |
| 6 | Activation accepts valid real IDs; no new console/server errors | ⏳ **PK BROWSER** |

**Honest note:** live functional verification (checks 3–6) requires an authenticated browser session against production, which this environment cannot reach (egress policy). The change is additive UUID guards on existing working paths plus a zero-caller route deletion, and the production build reached READY, so functional-regression risk is low — but the live authenticated proof is a **PK browser action** (analogous to Batch 1 §8's pending-operator-event). A failed legitimate onboarding scan/activation, or a 200 on the deleted route, reopens Batch 2.

## 6. Stop condition

Batch 2 closes the two identified onboarding privileged-input paths. It does not establish authorization (Slice 0.5) and does not remediate `exec_sql` generally. **Slice 1 remains blocked on Slice 0.5.** Batch 2 is the integrity precondition (Slice-0.5 brief E-Q2) to enabling Slice-0.5 enforcement — with both `exec_sql` sinks now closed, that precondition is satisfied. Handoff to the Slice 0.5 lane: **both onboarding `exec_sql` sinks are closed as of `6fe8d1e`** (evidence, not a decision — Slice 0.5 owns the enforcement-ordering ruling).
