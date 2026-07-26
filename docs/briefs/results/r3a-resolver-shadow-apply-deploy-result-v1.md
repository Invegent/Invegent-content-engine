# R3a Resolver-Enforcement SHADOW — Apply + Deploy Result (v1)

> **Lane:** R3a resolver enforcement, SHADOW posture (9 additive `m.post_draft` columns + `m.resolve_final_format` + ai-worker v2.21.0 shadow wiring) · **Apply/deploy hand:** S1 (independent; S6 authored) · **Type:** T3 migration + EF-deploy result · **Verdict: PASS**
> **Outcome:** **APPLIED + DEPLOYED + PROVEN.** Additive, shadow-only, NO R3c flip. The governed resolver runs in shadow; `recommended_format` remains advisor-owned; unsupported formats can never become shadow-effective; rollback symmetric.
> **Artifacts (all from pushed ref `e290537`, hashes match):** migration `07313a89`, packet `03da7862`, ai-worker diff `c578f98d`, runbook `093daf48`, evidence `5250875e`.
> **Target:** project `mbkmaxqhsohbtwsqolns`. **Applied/deployed:** 2026-07-25 (UTC). Migration BEFORE deploy (hard order honoured).

---

## 1 · Order & pre-gate

Migration applied FIRST, then the STEP-2 ordering gate, then the worker deploy — per the runbook's executable ordering guard. Pre-state verified live: **0 of 9 shadow columns, resolver absent** (the migration's fail-closed §Part-1 pre-assertion would abort otherwise); no `resolve_final_format`/`r3a` name in the 400+ migration ledger.

## 2 · Migration (artifact 1) — applied & proven

Applied `r3a-resolver-shadow-migration-v4.sql` (`07313a89`) via the migration channel as `r3a_resolver_shadow_columns_and_resolve_final_format_v4`. *(apply_migration mints its own ledger version — the repo filename vs applied-ledger version diverge per the standing ICE nuance; a recording note for the control tower.)* Success.

**STEP-1 post-apply proof (all PASS):**
- **(a) 9 columns present** on `m.post_draft` (advisor_format · requested_format · format_mode · shadow_resolved_format · final_format_authority · final_format_reason · format_policy_version · format_resolved_at · resolver_evidence).
- **(b) resolver grant-disciplined** — `prosecdef=true`, `search_path=""`, `provolatile=STABLE`, ACL = `postgres=X/postgres | service_role=X/postgres` (no anon/authenticated).
- **(c) role probe** — anon + authenticated **denied 42501**, service_role **OK**.
- **(d) smoke exact** — `resolve_final_format(PP,'linkedin',NULL,'legacy','carousel')` → `effective_format='text'`, `authority='resolver_fallback'`, `reason='legacy_advisor_ineligible:carousel'` (carousel is `linkedin:false` post-Slice-2 → deterministic fallback to the highest-share eligible = text).
- **Representative precedence cases** (all correct): legacy-advisor-eligible→`advisor` · policy-out-of-policy→`policy`/`text` · fixed-eligible→`planner` · fixed-ineligible→`resolver_fallback` · null-client→`governed_skip`.

**STEP-2 ordering gate:** `columns_present = true` AND `resolver_present = true` — deploy authorised.

## 3 · Deploy (artifact 2) — ai-worker v2.21.0

Landed the reviewed change on main first (like Step B): copied the worktree v2.21.0 `index.ts` (blob `c83ac6d` = the reviewed diff's result; base `148934c` matched main), staged the one file, committed **`5488e85`** (parent `e290537`, exactly 1 file, branch-warden **safe**), pushed `e290537..5488e85`. Then the sanctioned path: drift refresh → **B-FD** → `scripts/safe-deploy.sh ai-worker --allow-warn` → **exit 0** → re-refresh → **A-LE clean**.

- **verify_jwt preserved `false`** (via `config.toml` pin; the 401→502 flip did not occur).
- **Bundles-from-CWD trap defended** — deployed bundle carries `ai-worker-v2.21.0` + `async function resolveShadow` + `resolve_final_format` + `shadow_resolved_format`.
- **deploy-verifier: overall PASS** — `deploy_content_verdict PASS` (marker + VERSION v2.21.0 in the deployed bundle; deployed==repo `5488e85`/`c83ac6d`; `verify_jwt=false`), `drift_verdict CLEAN` (A-LE normalise-equal, deployed==repo v2.21.0, hashes match). Deployed internal version 123.

## 4 · Post-deploy shadow-boundary proofs (dispatch 7–10 + required)

| # | Proof | Result |
|---|---|---|
| 7 | worker writes ONLY shadow outputs | ✅ resolver is `STABLE` (no side effects — cannot write any row); the deployed diff keeps `recommended_format`/`recommended_reason` on their exact current writers on both paths (main `decidedFormat`/`advisorReason`; evergreen `job.input_payload?.format ?? 'text'`), with the 9 shadow columns added additively (shown in-hunk). Resolver call is fail-safe (error→null, `final_format_reason='resolver_unavailable'`) |
| 8 | live `recommended_format` stays Advisor-owned (unchanged) | ✅ the resolver never writes `recommended_format` (it's `STABLE`, returns jsonb); the column is untouched by the migration and by the rollback (§10 proof: `recommended_format` still present after a full rollback) |
| 9 | unsupported formats cannot be shadow-effective | ✅ **80-case sweep** (every client × 5 platform/unsupported pairs × 4 modes): **0** cases where `effective_format == the unsupported input`, **0** cases where `effective_format` is a non-`platform_support` format. By construction effective is drawn only from the support-gated eligible set, its highest-share fallback, or NULL |
| 10 | rollback symmetry | ✅ in a `BEGIN…ROLLBACK` txn the runbook rollback dropped exactly the 9 columns + the function (cols→0, resolver absent) while `recommended_format` stayed present, then rolled back — R3a intact. The migration's pre-assertion proved apply owns all 10 objects, so rollback drops only migration-owned objects, never operator data/definitions |
| — | no publication/render behavioural change | ✅ the diff touches only the `post_draft` update objects (adds shadow columns); no render/publish/selection code path changed; shadow columns gate nothing |
| — | shadow VALUES populated on live drafts | ⏳ **pending the next ai-worker fill cycle** — 0 drafts written since the ~22:44Z deploy (2850 existing rows predate v2.21.0, all shadow-null). The wiring + resolver correctness are proven; live population is a natural-traffic observation (same posture as a first-fill signal), not a defect |

## 5 · Rollback (proven, additive-only, zero data)

Artifact 1: `DROP FUNCTION IF EXISTS m.resolve_final_format(uuid,text,text,text,text)` + `ALTER TABLE m.post_draft DROP COLUMN IF EXISTS …` (9 columns) — proven executable+symmetric (§4 row 10), idempotent (`IF EXISTS`), zero data (additive columns, no backfill). Artifact 2: redeploy ai-worker v2.20.0 (prior version). No data mutated by either.

## 6 · Boundary (R3a does NOT authorise)

R3c flip · planner W3 writes · live resolver authority · `cta_text` · PP-2B candidacy · any client/schedule mutation. The `buildable`/`publisher_path`/`template_provider` gate predicates are honestly recorded `not_evaluated_r3a` (code/registry-side, for the R3c gate to complete). §10 carried debt (anon-executable SECDEF on the two `m.*` schedule functions) is a separate lane — untouched here.

## 7 · Non-claims

Production changes: one additive migration (9 nullable columns + one SECURITY-DEFINER shadow function, grant-disciplined) + one ai-worker EF redeploy (v2.20.0→v2.21.0) + one FF commit to CE main (`5488e85`, 1 file) + two slug-scoped drift-log refreshes (bookkeeping). No `recommended_format`/render/publish/selection behaviour change; nothing downstream reads the shadow columns in R3a. Every behavioral/rollback proof ran read-only or in explicitly rolled-back transactions — zero committed production data mutated. Migration applied BEFORE deploy. All facts live as of 2026-07-25.
