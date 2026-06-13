# 2026-06-13 — Content Studio active-client roster fix: deploy close-out (PASS)

**Status:** DEPLOYED. PK-approved D-01 `c172a188-4ca3-4a0d-b1f6-8ab9fd3d526d`.
**Cause:** Content Studio selectors imported a hardcoded `CLIENTS` constant (NY + PP only) → active clients CFW + Invegent unselectable → T1 Ideas could not reach CFW (where the verification intents live). T1 UI visibility was PARTIAL.
**Fix:** DB-driven roster (read-only). No pipeline/write/T2 change.

---

## 1. Shipped
- **content-engine `main` `879f68ce`** ← merge of `feat/cs-active-clients-roster` (`79b73611`). `public.list_active_clients()` applied to prod as `list_active_clients` — verified STABLE (read-only), service-role-only grants, returns all 4 active clients (CFW, Invegent, NY, PP).
- **dashboard `main` `fe12c8c9`** ← merge of `feat/cs-active-clients-roster` (`6c138203`). Vercel prod `dpl_A2fAYtt3aVxSwu8t2oJLWg6dcJB1` READY (`dashboard.invegent.com`). `GET /api/clients` + `useActiveClients()` hook (static fallback) wired into the 4 Content Studio selectors (Ideas/Single Post/Series×2). `constants.ts` + non-studio consumers unchanged.

## 2. Post-deploy verification (read-only, prod)
- **CFW in selector:** `list_active_clients()` → `[CFW, Invegent, NDIS Yarns, Property Pulse]` — CFW present (id `3eca32aa`).
- **CFW intents appear:** `list_creative_intents(CFW)` lists both `0d0a45a0` and `f8c10b91`.
- **Each opens in detail:** `get_creative_intent_detail` → `ok:true` for both.
- **Child outcomes / reasons / governance:** both intents — every child `draft_intent_id`=parent (linkage), `selected_canonical_ids_count=0`, `skip_reason` present verbatim (compliance_skip / t1_verification_hold). Derived status `failed`.

## 3. Scope confirmation
One read-only DB object (`list_active_clients`, STABLE/SELECT-only/service-role) + one read-only route (`/api/clients`) + a read hook + import/usage swaps in 4 selectors. No write RPC; no pipeline/Advisor/compliance/render/publisher/ai-worker edit; `create_creative_intent` / `get_creative_intent_detail` / `list_creative_intents` / `fill_pending_slots` untouched. T2 and register reconciliation not touched.

## 4. Validation
PGlite 10/10 (`docs/briefs/cs-active-clients-roster-validation.mjs`); dashboard `tsc --noEmit` exit 0; Vercel build READY (no error); live read-only confirmations above.

## 5. Rollback
- DB: `DROP FUNCTION public.list_active_clients()` (additive read fn; nothing depends on it).
- Dashboard: revert merge / redeploy prior Vercel deployment (`dpl_2Te6pxyZhYCN1r4VePFrHe8MTPZT`) — selectors fall back to the still-present static `CLIENTS` constant.
- Independent per repo; zero data migration.

T1 UI visibility is now PASS (CFW reachable). F-INTENT-STATUS-ROLLUP carry stands.
