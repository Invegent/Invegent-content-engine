# Brief — PRV Production-Dashboard Port (localhost `/recon` → `invegent-dashboard`)

**Status:** AUTHORED — pending D-01 review (this lane). NO apply / NO deploy / NO merge yet.
**Lane:** PRV (Platform Reconciliation View). Continues the CCD-PRV-001…010 arc.
**Governing decision:** D-FR-RECON-001.
**Transport decision:** Option **(i)** — public `SECURITY DEFINER` read-only RPCs over the existing `op.*` views — **confirmed by PK 2026-05-29** (path/transport decision only; not approval to mutate production).
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
5. Do **not** apply DDL, deploy, or merge until the D-01 review is complete and PK gives the explicit approval phrase.
6. Scope includes: route/sidebar/auth integration, porting the PRV components/helpers, CCB visual, and verification against the localhost PRV output.
7. **End-state:** once production PRV is verified at parity and accepted, the localhost PRV must be deprecated and removed/archived — no two PRV implementations, no unnecessary direct-Postgres local tech debt.

## 3. Current state (localhost PRV — ground truth)

- Branch `feature/platform-reconciliation-view-readonly` @ `7287a1e0` (repo `Invegent-content-engine`); **unmerged, undeployed**. `main` untouched.
- Route `/recon` lives in the content-engine `dashboard/` **sibling Next.js app** (cc-0013), NOT in `invegent-dashboard`. No Vercel project serves it → it has never been deployed anywhere.
- Reads `op.*` via a **server-only direct-Postgres transport** (`dashboard/lib/db.ts`, `queryOp`, read-only session) as least-privilege role `prv_readonly` (migration `20260527011420`), because schema `op` is not on the PostgREST allowlist (CCD-PRV-001 finding).
- Page source: `dashboard/app/recon/page.tsx` (blob `f0b9cc10`). It is a SELECT-only server component. The three SQL constants (`SUMMARY_SQL`, `FRESHNESS_SQL`, `DRIFT_SQL`) define the **exact projections** the UI consumes (column subset + `::int`/`::float8`/`::text` casts + ORDER BY + `LIMIT 200` on drift).
- Display primitives it imports: `_components/AttentionBadge` (`AttentionBadge`, `AttentionBanner`), `_components/StateBlocks` (`EmptyState`, `ErrorState`, `PageFooter`), `_components/format` (`formatDate`, `formatNumber`, `formatPercent`, `formatRelativeMinutes`, `formatTimestamp`), `_components/tableStyles` (`TABLE`, `TABLE_WRAPPER`, `TD`, `TH`).

## 4. The migration — three SELECT-only read RPCs (proposed, UNAPPLIED)

File: `supabase/migrations/20260529120000_proposed_prv_op_read_rpcs.sql` (this lane). Marked PROPOSED; on the feature branch only (off `main`; content-engine has no CI → inert push).

**Design — parity by construction.** Each RPC's `RETURNS TABLE` contract reproduces the *exact* localhost projection for its view: same column subset, same `::int` / `::float8` / `::text` casts, same ORDER BY, same `LIMIT 200` (drift). Result: the ported React component keeps its existing `SummaryRow` / `FreshnessRow` / `DriftRow` types verbatim — the only change is the transport call. This is the single biggest parity-risk reducer.

**Security model (deny-by-default, learns from cc-0020).** All three are `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''` with fully-qualified `op.*` refs. Grants: `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` then `GRANT EXECUTE TO service_role` — the explicit `anon`/`authenticated` revoke is baked in from the start to avoid the Supabase default-privilege leak that required the cc-0020 `114333` hotfix.

**RPC contracts:**

| RPC | Wraps | Cols | Ordering / limit |
|---|---|---|---|
| `public.prv_get_reconciliation_summary()` | `op.v_reconciliation_summary` | all 15 | single row |
| `public.prv_get_freshness_rollup()` | `op.v_freshness_rollup` | 14 of 17 | `attention_needed DESC NULLS LAST, last_evidence_at ASC NULLS FIRST, client_slug, platform` |
| `public.prv_get_drift_rollup()` | `op.v_drift_rollup` | 12 of 17 | `is_actionable DESC NULLS LAST, created_at DESC LIMIT 200` |

Full verbatim SQL is in the migration file. Why RPCs work: `SECURITY DEFINER` executes as the function owner (postgres, which can read `op.*`), so service_role only needs `EXECUTE` on the function — `op` never has to be exposed to PostgREST and no grants on `op.*` to service_role are needed.

**Pre-flight evidence (read-only, captured 2026-05-29; re-confirm at apply):**
- All three views exist; column signatures captured and encoded in the contracts above.
- Event-trigger survey: `CREATE FUNCTION` fires only `extensions.issue_pg_graphql_access` (benign grant) and `extensions.pgrst_ddl_watch` (PostgREST cache reload → auto-exposes the new `public` RPCs; no manual `NOTIFY pgrst` needed). The `k.*` registry/catalog triggers (`trg_k_refresh_catalog`, `trg_k_registry_sync_on_create_table`) are TABLE/VIEW-scoped → they do **not** fire for a function-only migration. No `k.*` registry mutation.
- No `public.prv_get_*` name collision (only unrelated `public.write_ef_drift_log`).

**Apply approval phrase (Stage 2):** `PK APPROVES PRV READ-RPC MIGRATION APPLY`

## 5. Dashboard port plan (`invegent-dashboard`, Stage 3)

- New route (proposed `/reconciliation`, or keep `/recon`) as a server component on a feature branch.
- Reads via the dashboard's **existing service-role server client** calling `.rpc('prv_get_reconciliation_summary')` / `prv_get_freshness_rollup` / `prv_get_drift_rollup` (cc-0020 Stage 4-B service-role RPC-route precedent). No direct-Postgres, no DSN, no `NEXT_PUBLIC_` DB URL.
- Reuse the dashboard's existing display primitives where equivalents exist; port only the `_components` helpers that have no dashboard equivalent. Keep the row types verbatim (parity).
- Behind the dashboard auth middleware (route should `307 → /login` when unauthenticated, like `/operations`).
- Sidebar: add one nav entry under the Slice-0A IA — proposed **REPORTS** (or **NOW → Investigate**); final placement to CCB/PK.

## 6. Verification (Stage 4)

- **Parity:** run production PRV and localhost PRV **against the same DB at the same time** and diff — summary totals, freshness pair count + ordering, drift count + actionable count + ordering must match. (Do NOT compare against the stale v3.14 snapshot — live data has moved; parity = same-DB-same-moment equality.)
- **CCB visual PASS** on a Vercel preview before merge.
- Production liveness smoke (auth redirect, no 5xx).
- Merge gate phrase: `PK APPROVES PRV READ-ONLY PRODUCTION DEPLOY` → FF-merge → Vercel prod deploy.

## 7. Deprecation / end-state (Stage 5 — required by constraint 7)

Once production PRV is accepted at parity:
1. Remove the localhost `/recon` route, `dashboard/lib/db.ts` direct-PG transport, `.env`/`RECON_ENV_VAR` handling, and any `_components` made redundant — from the content-engine `dashboard/` app.
2. **DROP the now-unused `prv_readonly` role** (REVOKE its `op.*` grants then `DROP ROLE`) — its own `sql_destructive` D-01 + PK phrase.
3. Archive the `feature/platform-reconciliation-view-readonly` branch.
4. 4-way sync close recording the single-implementation end-state.

## 8. Staged gating sequence

| Stage | Action | Gate |
|---|---|---|
| 1 (now) | Brief + proposed migration authored; **D-01 sql_destructive review** | this lane — no mutation |
| 2 | Apply the 3-RPC migration to prod (re-run pre-flight; post-apply V-checks; close-the-loop on `m.chatgpt_review`) | PK phrase `PK APPROVES PRV READ-RPC MIGRATION APPLY` (+ apply-time D-01 per ICE-PROC-001) |
| 3 | Build PRV in `invegent-dashboard` (route/auth/sidebar/port) on a feature branch | no merge; CCB preview |
| 4 | Parity diff vs localhost + CCB visual PASS → merge + deploy | PK phrase `PK APPROVES PRV READ-ONLY PRODUCTION DEPLOY` |
| 5 | Deprecate/remove localhost PRV + drop `prv_readonly` role + archive branch | role-drop = own `sql_destructive` D-01 + PK phrase |

## 9. Out of scope

- Any write/action surface, RBAC, or observer wiring (that was Option C — not this lane).
- The two already-grant-covered rollup views (`op.v_per_client_rollup`, `op.v_per_platform_rollup`) — optional later increment.
- Any change to the `op.*` views themselves or to cc-0012.
- cc-0015 `/operations` C/D/E.

## 10. Risks

- **R1 — projection drift:** if an `op.*` view's columns change later, the RPC contract must be updated in lockstep. Mitigation: pre-flight column re-check at apply; contracts mirror the views exactly today.
- **R2 — grant leak:** mitigated by explicit `anon`/`authenticated` revoke (cc-0020 lesson baked in) + post-apply `has_function_privilege` checks.
- **R3 — parity false-pass against stale snapshot:** mitigated by same-DB-same-moment diff, not snapshot comparison.
- **R4 — leaving two implementations:** mitigated by the mandatory Stage 5 deprecation (constraint 7).
