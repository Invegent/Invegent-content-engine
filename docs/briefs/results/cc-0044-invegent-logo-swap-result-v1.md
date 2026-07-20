# cc-0044 Invegent logo swap — square brand-badge live, full-colour retired — result v1

**Lane:** cc-0044 invegent logo rotation (Proof #1 follow-up) · **Tier:** T3 (production rotation) · **Class:** PRODUCT_PROOF
**Date:** 2026-07-20 · **Verdict:** APPLIED LIVE, verified · **Base:** origin/main `827ea29`

## Why

Proof #1's PK-approved render (`9725a8c3`) used `invegent_logo_square_brand_bg` (contrast-safe on the
mixed-lit shared background), but invegent's governed/active logo was still `invegent_logo_full_colour`
— so production would not have matched the approved look. This swaps the governed logo so it does.

## Change (applied)

Fail-closed `DO` block (single txn) on `c.client_brand_asset`, invegent only:
- **Promote** `invegent_logo_square_brand_bg` (`d3d10017…`): `is_active=true`, `asset_meta.approved='true'`.
- **Retire** `invegent_logo_full_colour` (`d3d10010…`): `is_active=false`, `asset_meta.approved='false'`.
- CAS preconditions (full_colour sole active+approved · square fenced · exactly 1 active invegent logo)
  and postconditions (exactly 1 active logo · `select_template('invegent',fb,image_quote)` Logo ==
  `invegent_logo_square_brand_bg`) — any drift aborts the whole txn.

resolve_slot_assets Logo eligibility = `is_active AND asset_meta.approved` (+ client_match, license_ok).
This is a **data rotation**, not a schema migration — no migration-ledger entry expected (consistent
with the NDIS logo-promote pattern, registers ~v5.74/v5.82).

## Proof

**Pre-apply (rolled-back trials, no persistence):** post-swap resolver picks `square_brand_bg`, exactly
1 active logo, background unchanged; apply→rollback fidelity restores `full_colour`.

**Post-apply (live, this lane verified):**
- `square_brand_bg`: `is_active=true`, `approved=true`; `full_colour`: `is_active=false`, `approved=false`.
- invegent active-logo count = **1**.
- `select_template('invegent','facebook','image_quote')` → Logo = **`invegent_logo_square_brand_bg`**,
  Background = shared `bg_shared_datacentre_server.jpg` (unchanged).
- Visual already PK-approved (Proof #1 render `9725a8c3` used this exact logo) — no re-render needed.

## Reviews & apply

- `db-rls-auditor`: **pass**, no must-fix (live CAS baseline matches; pool-neutral — per-client active-logo
  counts CFW=1/ndis-yarns=1/invegent=1/PP=8 unaffected; pure DML, no RLS/grant/DDL; fail-closed correct).
- External review (`sql_destructive`): `partial`/high/med → escalated (review_id `c3578026`, pinned to apply
  sha256 `a7822d88…`). Triage: `policy_decision` (brand identity = PK's call) — no concrete defect; its
  cautions were pre-covered (baseline verified, pool-neutrality proven, visual pre-approved).
- **Apply:** PK-run via `execute_sql` at the T3 gate. Live-verified by this lane afterward.

## Artifacts

- Apply: `_harness/cc0044_invegent_logo_swap_20260720/apply_logo_swap.sql` (sha256 `a7822d88…`)
- Rollback (fidelity-proven): `_harness/cc0044_invegent_logo_swap_20260720/rollback_logo_swap.sql` (sha256 `330ced86…`) — re-activates full_colour, re-fences square.

## Status

**invegent's governed logo is now the square brand-badge across its (image_quote) render path.**
Production output matches the PK-approved Proof #1 look: shared datacentre background + square-badge logo.
Remaining cc-0044 invegent follow-up: footer LinkedIn banner (`task_a6e31a0f`).

## Register pointer (Convention 1)

> **cc-0044 invegent logo swap — square brand-badge LIVE, full-colour retired (T3 · PRODUCT_PROOF)** — makes production match the PK-approved Proof #1 render: promote `invegent_logo_square_brand_bg` (`d3d10017…`, active+approved) / retire `invegent_logo_full_colour` (`d3d10010…`) via fail-closed CAS DO block (apply sha `a7822d88…`); pool-neutral (invegent-only 2 rows; other clients' logo counts unchanged); db-rls-auditor pass · external `c3578026` partial→PK-applied (execute_sql); live-verified exactly 1 active logo + resolver Logo=square_brand_bg (bg still shared datacentre); visual pre-approved (`9725a8c3`); rollback fidelity-proven (`330ced86…`); data rotation (no migration ledger). Follow-up: footer banner `task_a6e31a0f`. Result: `docs/briefs/results/cc-0044-invegent-logo-swap-result-v1.md`.
