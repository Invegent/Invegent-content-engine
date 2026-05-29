# Brief — PRV Production-Dashboard Port (localhost `/recon` → `invegent-dashboard`)

**Status:** Stage 2 (read-RPC migration) **APPLIED + VERIFIED 2026-05-29**. Stages 3–5 gated. NO dashboard port / NO deploy / NO merge / localhost PRV not yet deprecated.
**Lane:** PRV (Platform Reconciliation View). Continues the CCD-PRV-001…010 arc.
**Governing decision:** D-FR-RECON-001.
**Transport decision:** Option **(i)** — public `SECURITY DEFINER` read-only RPCs over the existing `op.*` views — **confirmed by PK 2026-05-29**.
**Author:** CCH, 2026-05-29 (Sydney).

---

## 1. Objective

Move PRV from a **local-only** route into the **production operations dashboard** (`invegent-dashboard` → `dashboard.invegent.com`), behind real auth and sidebar nav, reading the three existing cc-0012 `op.*` reconciliation views through the dashboard's existing Supabase/service-role server-side transport — **not** the localhost direct-Postgres pattern. Once production PRV is verified at parity and accepted, the localhost PRV and its direct-Postgres tech debt are removed so only **one** PRV implementation is maintained.

This is the gated `PK APPROVES PRV READ-ONLY PRODUCTION DEPLOY` work. Sizing (confirmed 2026-05-28 discovery): **multi-session**, cc-0020 Stage 4-A→4-D shape. Zero new tables/views.

## 2. PK constraints (binding)

1. No new tables or reconciliation views.
2. RPCs must only wrap the existing `op.v_reconciliation_summary`, `op.v_freshness_rollup`, `op.v_drift_rollup` views.
3. Live dashboard stays on the existing Supabase / service-role server-side access pattern.
4. Do **not** port the local direct-Postgres `prv_readonly` DSN into Vercel.
5. Do **not** apply DDL, deploy, or merge until the D-01 review is complete and PK gives the explicit approval phrase. *(Stage 2 apply now done under this gate.)*
6. Scope includes: route/sidebar/auth integration, porting the PRV components/helpers, CCB visual, and verification against the localhost PRV output.
7. **End-state:** once production PRV is verified at parity and accepted, the localhost PRV must be deprecated and removed/archived — no two PRV implementations, no unnecessary direct-Postgres local tech debt.

## 3. Current state (localhost PRV — ground truth)

- Branch `feature/platform-reconciliation-view-readonly` (repo `Invegent-content-engine`); **unmerged, undeployed**. `main` untouched.
- Route `/recon` lives in the content-engine `dashboard/` **sibling Next.js app** (cc-0013), NOT in `invegent-dashboard`. No Vercel project serves it → it has never been deployed anywhere.
- Reads `op.*` via a **server-only direct-Postgres transport** (`dashboard/lib/db.ts`, `queryOp`, read-only session) as least-privilege role `prv_readonly` (migration `20260527011420`), because schema `op` is not on the PostgREST allowlist (CCD-PRV-001 finding).
- Page source: `dashboard/app/recon/page.tsx` (blob `f0b9cc10`). SELECT-only server component. The three SQL constants (`SUMMARY_SQL`, `FRESHNESS_SQL`, `DRIFT_SQL`) define the **exact projections** the UI consumes (column subset + `::int`/`::float8`/`::text` casts + ORDER BY + `LIMIT 200` on drift).
- Display primitives imported: `_components/AttentionBadge` (`AttentionBadge`, `AttentionBanner`), `_components/StateBlocks` (`EmptyState`, `ErrorState`, `PageFooter`), `_components/format` (`formatDate`, `formatNumber`, `formatPercent`, `formatRelativeMinutes`, `formatTimestamp`), `_components/tableStyles` (`TABLE`, `TABLE_WRAPPER`, `TD`, `TH`).

## 4. The migration — three SELECT-only read RPCs — APPLIED 2026-05-29

**APPLY RECORD:** applied to production `mbkmaxqhsohbtwsqolns` as canonical migration **`20260529065224_prv_op_read_rpcs`** (the proposed file `20260529120000_proposed_prv_op_read_rpcs.sql` is now a tombstone). Stored statement md5 `9103b26e948baa9bb3c3d582b2a53c20`.

**Governance:** D-FR-RECON-001 ; PK phrase `PK APPROVES PRV READ-RPC MIGRATION APPLY` (2026-05-29) ; D-01 `87c618a5` (agree/proceed), prior `103f5a6c` (partial/type-c) superseded — both closed-loop on `m.chatgpt_review` (status=completed).

**Post-apply V-checks (all PASS):** 3 functions present, `prosecdef=t` / `provolatile=s`; `EXECUTE` to `service_role` only (`anon`/`authenticated` = false); RPC-vs-view row-count parity 1 / 14 / 40 (drift under the 200 cap), 26 actionable drift. Pre-flight contract-drift check returned zero rows.

**Design — parity by construction.** Each RPC's `RETURNS TABLE` contract reproduces the *exact* localhost projection for its view: same column subset, same `::int` / `::float8` / `::text` casts, same ORDER BY, same `LIMIT 200` (drift). The ported React component keeps its existing `SummaryRow` / `FreshnessRow` / `DriftRow` types verbatim — only the transport call changes.

**Security model (deny-by-default).** All three are `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''` with fully-qualified `op.*` refs. Grants: `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` then `GRANT EXECUTE TO service_role` — the explicit `anon`/`authenticated` revoke avoids the Supabase default-privilege leak that required the cc-0020 `114333` hotfix. A self-aborting in-migration DO-block guard asserts all 41 (view,column,udt) tuples before creating anything.

**RPC contracts:**

| RPC | Wraps | Cols | Ordering / limit |
|---|---|---|---|
| `public.prv_get_reconciliation_summary()` | `op.v_reconciliation_summary` | all 15 | single row |
| `public.prv_get_freshness_rollup()` | `op.v_freshness_rollup` | 14 of 17 | `attention_needed DESC NULLS LAST, last_evidence_at ASC NULLS FIRST, client_slug, platform` |
| `public.prv_get_drift_rollup()` | `op.v_drift_rollup` | 12 of 17 | `is_actionable DESC NULLS LAST, created_at DESC LIMIT 200` |

Why RPCs work: `SECURITY DEFINER` executes as the owner (postgres, which can read `op.*`), so service_role needs only `EXECUTE` — `op` never has to be exposed to PostgREST.

## 5. Dashboard port plan (`invegent-dashboard`, Stage 3 — GATED)

- New route **`/reconciliation`** (PK preference, 2026-05-29) as a server component on a feature branch.
- Reads via the dashboard's **existing service-role server client** calling `.rpc('prv_get_reconciliation_summary')` / `prv_get_freshness_rollup` / `prv_get_drift_rollup` (cc-0020 Stage 4-B precedent). No direct-Postgres, no DSN, no `NEXT_PUBLIC_` DB URL.
- Reuse the dashboard's existing display primitives where equivalents exist; port only the `_components` helpers with no dashboard equivalent. Keep row types verbatim (parity).
- Behind the dashboard auth middleware (route should `307 → /login` when unauthenticated, like `/operations`).
- Sidebar: one nav entry under **REPORTS** (PK preference, 2026-05-29).

## 6. Verification (Stage 4 — GATED)

- **Parity:** run production PRV and localhost PRV **against the same DB at the same time** and diff — summary totals, freshness pair count + ordering, drift count + actionable count + ordering must match. (Not against a stale snapshot — parity = same-DB-same-moment equality.)
- **CCB visual PASS** on a Vercel preview before merge.
- Production liveness smoke (auth redirect, no 5xx).
- Merge gate phrase: `PK APPROVES PRV READ-ONLY PRODUCTION DEPLOY` → FF-merge → Vercel prod deploy.

## 7. Deprecation / end-state (Stage 5 — GATED, required by constraint 7)

Once production PRV is accepted at parity:
1. Remove the localhost `/recon` route, `dashboard/lib/db.ts` direct-PG transport, `.env`/`RECON_ENV_VAR` handling, and any redundant `_components` — from the content-engine `dashboard/` app.
2. **DROP the now-unused `prv_readonly` role** (REVOKE its `op.*` grants then `DROP ROLE`) — its own `sql_destructive` D-01 + PK phrase.
3. Archive the `feature/platform-reconciliation-view-readonly` branch.
4. 4-way sync close recording the single-implementation end-state.

## 8. Staged gating sequence

| Stage | Action | Gate | State |
|---|---|---|---|
| 1 | Brief + proposed migration authored; D-01 review | this lane | DONE (D-01 87c618a5 agree) |
| 2 | Apply the 3-RPC migration to prod (pre-flight; V-checks; close-the-loop) | PK phrase `PK APPROVES PRV READ-RPC MIGRATION APPLY` | **DONE + VERIFIED** (mig `20260529065224`) |
| 3 | Build PRV in `invegent-dashboard` (`/reconciliation` under REPORTS; auth; port) on a feature branch | no merge; CCB preview | GATED |
| 4 | Parity diff vs localhost + CCB visual PASS → merge + deploy | PK phrase `PK APPROVES PRV READ-ONLY PRODUCTION DEPLOY` | GATED |
| 5 | Deprecate/remove localhost PRV + drop `prv_readonly` role + archive branch | role-drop = own `sql_destructive` D-01 + PK phrase | GATED |

## 9. Out of scope

- Any write/action surface, RBAC, or observer wiring.
- The two already-grant-covered rollup views (`op.v_per_client_rollup`, `op.v_per_platform_rollup`) — optional later increment.
- Any change to the `op.*` views themselves or to cc-0012.
- cc-0015 `/operations` C/D/E.

## 10. Risks

- **R1 — projection drift:** if an `op.*` view's columns change, the RPC contract must update in lockstep. Mitigated by the in-migration contract-drift guard (aborts on drift) + pre-flight check.
- **R2 — grant leak:** mitigated by explicit `anon`/`authenticated` revoke + post-apply `has_function_privilege` checks (verified false).
- **R3 — parity false-pass against stale snapshot:** mitigated by same-DB-same-moment diff at Stage 4.
- **R4 — leaving two implementations:** mitigated by the mandatory Stage 5 deprecation (constraint 7).
