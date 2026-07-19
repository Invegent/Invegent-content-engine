CLAIMED v5.91 · Static-Image Governance Dashboard arc closeout · main · docs-register + ledger-backfill lane · 2026-07-19T07:42:38Z (v5.90 taken first by concurrent NDIS Phase-1 Promotion #2 → renumbered v5.90→v5.91 per CCF-02 §4)

# Result — Static-Image Governance Dashboard arc (closeout)

**Lane:** Static-Image Governance Dashboard (invegent-dashboard `/creative-library`) + its two CE reader RPCs
**Tier / class:** T2 (read-only dashboard slices) + T3 (two service-role reader RPCs) · SIDE_PROVING (operator governance-visibility)
**Status:** ✅ CLOSED — all pieces LIVE in production (dashboard.invegent.com) and PK visual-proven
**Date:** 2026-07-19 Sydney
**Brief of record:** `docs/dashboard/static-image-governance-v1-brief.md` (dashboard repo; PK Gate-1, decisions D-A…D-H) · Slice-1 dynamic-keys: `docs/briefs/creative-library-slice1-dynamic-keys-brief-v1.md` (CE repo; PK Gate-1, DECISION-1 = eligible-only)

---

## What the arc delivered

`/creative-library` was hardcoded to Property Pulse. It is now a **client-aware, read-only governance surface** for Property Pulse **and** NDIS Yarns that lets an operator SEE the governed static-image state ICE actually enforces: the governed asset pool, what the resolver selects per slot and why it rejects the rest, and which formats are governed-enabled — all read live via service-role RPCs, never a direct `c.*` read.

## Shipped pieces (all LIVE)

| Piece | Repo / artifact | Evidence |
|---|---|---|
| Design brief (Gate-1, D-A…D-H) | dashboard `docs/dashboard/static-image-governance-v1-brief.md` | commit `9ca49b3` |
| **Slice 1** — client-aware `?client=` (PP + NDIS) | dashboard | commit `549e7a6` |
| **Slice 2** — Slot Eligibility (why-picked / why-not) via `resolve_slot_assets` | dashboard | commit `98059fc` |
| **D-B RPC** — `public.get_client_creative_governance` (enablement reader) | CE | commit `d627a8c`, ledger `20260719012947` |
| **Slice 3** — live Governance-enablement panel | dashboard | commit `803f484` |
| **`list_client_governed_assets` RPC** — governed-pool enumerator | CE | applied ledger `20260719041606`; source backfilled to main at THIS closeout (`supabase/migrations/20260719041606_create_list_client_governed_assets_rpc_v1.sql`) |
| **Slice-1 dynamic-keys** — Governed Assets panel reads the live pool (no hardcoded keys) | dashboard | commit `80ceb44` |

**Dashboard production HEAD:** `main == 80ceb44`; latest prod deploy `dpl_FvFUMotF2fsBfMkQ7FyTDoDRfxX1` READY, aliased `dashboard.invegent.com`.

## Gate discipline (per piece)

Each dashboard slice ran the T2 chain: isolated worktree → `tsc` + `next build` clean → branch-warden safe → external ChatGPT review pinned to the diff hash → **PK preview visual PASS on both `?client=` values** → fast-forward `main` → prod deploy READY. Each CE RPC ran the T3 chain: brief-author draft → PK Gate-1 → db-rls-auditor (SQL + in-txn ACL post-assert) → external review pinned to the migration hash → branch-warden safe → **PK apply gate** (apply_migration deny lifted then restored) → rollback written before apply (`DROP FUNCTION …`).

**Read-path design (why a new RPC was evidence-forced):** no existing reader enumerates a client's governed pool — `resolve_brand_assets` is whitelist-only (`= ANY(p_asset_keys)`, returns 0 rows for NULL/`{}`), `resolve_slot_assets` emits only the single deterministic winner + true rejects, and `get_client_creative_governance` is enablement-only. Hence `list_client_governed_assets` (eligible-only, `is_active AND approved`, service-role-only, SECURITY DEFINER + pinned empty `search_path` + explicit anon/authenticated revoke + in-txn ACL post-assert).

## Dynamic-panel proven live (the payoff)

At the Slice-1 dynamic-keys promote, the panel auto-reflected a pool that had grown since the lane's own pre-check: **PP = 30** (22 background + 8 logo, `geo_scope` populated); **NDIS = 14** (13 background + 1 logo), **not** the 6 the pre-check saw — because a **parallel PK-gated lane (v5.85) promoted 8 Phase-1 person-free REAL NDIS backgrounds** to eligible in the interim. The dynamic reader surfaced them with zero code change; the old hardcoded list would have shown 2. **PK confirmed the Phase-1 promotions are legitimate and authorized the promote.** This is the arc's motivating defect (a hardcoded list drifting stale vs. the live pool) demonstrated fixed in production.

## Correctness guard honored

`production_use_allowed` / `approval_status` are `asset_meta`-only keys that production reads nowhere; several PP backgrounds are `approved=true` yet `production_use_allowed=false`. Neither was ever presented as the eligibility verdict — the panels use the resolver's authoritative signal (`is_active + approved + license + bucket + text-safety`).

## Ledger reconciliation done at closeout

`list_client_governed_assets` was applied live (ledger `20260719041606`) but its migration file had never been committed to CE `main` (it lived only in the isolated worktree under the provisional pre-apply name `20260719160000_…`). This closeout backfills the byte-exact source onto `main` under the applied ledger version so the repo matches the live ledger (same pattern as v5.87 ice_readonly / v5.88 cc-0041). SQL body unchanged from the reviewed/applied text; only the apply-status header comment updated.

## Carries / backlog (non-blocking)

- `geo_scope` in the **Slot Eligibility** panel (Slice 2) — `resolve_slot_assets` still does not return it (the Governed Assets panel now does, via this RPC).
- Templates panel → link out to the existing `/create/templates` Template Registry (per D-H) — not built.

## Rollback / reversibility

- Dashboard: revert any slice commit / roll the Vercel production alias back to a prior READY deploy (`isRollbackCandidate` deploys exist).
- `list_client_governed_assets`: `DROP FUNCTION IF EXISTS public.list_client_governed_assets(text);` (in-file, reference). Read-only, service-role-only — dropping it degrades the dashboard panel to empty, touches no data.
- No data / governance state was mutated by any part of this arc; all reads.

---

## Follow-up (post-closeout) — geo_scope in Slot Eligibility · v5.96 (CLOSED, LIVE)

CLAIMED v5.96 · geo_scope Slot Eligibility carry closeout · isolated worktree off origin/main · 2026-07-19 (v5.92–v5.95 taken by concurrent lanes; the local unpushed deploy-verifier v5.94 was NOT touched, per PK — R4).

The `geo_scope in Slot Eligibility` carry from this arc is now **CLOSED — LIVE in production** (dashboard `main == fda2b51`, prod deploy `dpl_8K9SqCqhY562WNY3iKgYWmNSvnJ6`, `dashboard.invegent.com`).

- **What shipped:** the Slot Eligibility panel now renders a subtle `geo <value>` chip on **SELECTED** assets. `resolve_slot_assets` does NOT return `geo_scope` and is a LIVE production RPC (image-worker) — it was **NOT modified**. The server action joins `geo_scope` onto each selected item **in-process** from the `list_client_governed_assets` pool it already fetches (by `asset_key`). The chip is omitted for null/`none`. REJECTED/fenced assets are excluded from the eligible-only reader, so they intentionally carry no geo (no misleading empty column) — a full-pool reader would be needed to surface geo on fenced rejects.
- **Files:** `actions/creative-library.ts` + `components/creative-library/SlotEligibility.tsx` (dashboard). Diff sha256 `5ce90fa3bca1a252e1bdb0b9dbeaecd44f1a32080b914005c9cd03e3def7e256`.
- **T2 chain:** `tsc` + `next build` PASS · branch-warden safe (base dashboard `80ceb44`, isolated worktree) · external review partial/med/high → PK escalation with **no concrete defect** (null-safety statically verified: `Map<string,string|null>`, `.get() ?? null`, chip guarded on non-null/non-'none') · **self-verified live on both clients** (PP selected bg `bg_pp_open_home_entry` → `geo non_au`; NDIS all-null → no chip; rejected rows clean) · PK visual PASS · FF dashboard `main` `80ceb44..fda2b51` → prod READY.
- **Residual carry (now the ONLY remaining item for the whole arc):** Templates panel → link out to `/create/templates` Template Registry (per D-H).
- **Rollback:** revert `fda2b51` / roll the Vercel production alias to a prior READY deploy. Additive, read-only; no DB/RPC/migration touched.
- **Closeout mechanics:** recorded via an isolated worktree off `origin/main` because the shared CE `main` checkout was diverged (behind 6 / ahead 1) amid concurrent register churn; the ahead-1 local commit (another lane's unpushed deploy-verifier v5.94) was left untouched per PK/R4.
