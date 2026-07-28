CLAIMED (pending register-commit gate) · ndis-logo-completion · main-checkout `C:\Users\parve\Invegent-content-engine` · 2026-07-28

# Result — NDIS Yarns logo completion (Asset Sufficiency P1-5)

**Status: ✅ APPLIED + VERIFIED, 2026-07-28.** All 7 remaining fenced NDIS Yarns logo candidates
promoted. **PK-accepted consequence realized:** the live `resolve_slot_assets` Logo pick for
NDIS Yarns switched from the mark-only icon (`d1b10015`) to the full-colour ringed primary
(`d1b10010`) — confirmed by a direct resolver call post-apply, not merely inferred.

**Brief:** [`docs/briefs/ndis-logo-completion-gate1-packet-v1.md`](../ndis-logo-completion-gate1-packet-v1.md).
**Tier:** T2/T3 (additive DB flag-flip, same shape as the proven 2026-07-18 D7 promotion; escalated
to explicit PK re-confirmation by external review because of the live identity-switch consequence).

## What landed

`UPDATE c.client_brand_asset` in one guarded transaction — `d1b10010`, `d1b10011`, `d1b10012`,
`d1b10013`, `d1b10014`, `d1b10016`, `d1b10017` → `is_active=true`, `asset_meta.approved=true`,
`approval_status='governed'`, `production_use_allowed=true`, `promoted_by='PK'`,
`promotion_lane='ndis-logo-completion-gate1-packet-v1'`. `d1b10015` (already governed) untouched.
9 SVG `logo_vector_source` rows untouched (retained fenced, inert under the current resolver).

**Governed NDIS logo count: 1 → 8.** Other-brand governed-logo pool unchanged (10, pre/post-check
both passed in-transaction). `c.client_brand_profile.brand_logo_url` unchanged
(`NDIS-Yarns_Logo.png`, `updated_at` still `2026-03-31`) — legacy fallback preserved as required.

## Review chain

- **Live pre-check** (fresh SELECT immediately before apply): confirmed exactly 1 governed NDIS
  logo (`d1b10015`) and other-brand pool = 10, and confirmed all 17 original candidate rows share
  an **identical `created_at`** (`2026-07-08 09:19:16.911775+00`) — proving the resolver's tie-break
  is pure `asset_id` order, the load-bearing fact behind the whole risk analysis.
- **External review** (`ask_chatgpt_review`, `review_id 94321014-8765-4fe0-bc45-9c023cdb2c44`,
  `reviewed_input_hash 1e3f42ed57f7d2477c…`): verdict `partial`, risk `high`, **escalated** — SQL
  mechanics verified correct (assertions, scoping, no injection risk); the escalation was the
  `policy_decision` class (brand-identity switch), not a defect. Routed to PK per CCF-02 triage
  (`policy_decision → PK decision gate`).
- **PK re-confirmation** (explicit, post-escalation): PK selected "Yes, proceed as planned" on a direct
  question naming the exact consequence (mark-only → full-colour ringed primary switch) before
  execution.
- **db-rls-auditor** groundwork from the Gate-1 investigation (2026-07-28, prior turn): confirmed
  zero cross-brand collision, confirmed grants (`resolve_slot_assets` service-role-only), confirmed
  `updated_at` is not trigger-maintained on this table (informational, not a blocker).

## Post-apply proof

| Check | Result |
|---|---|
| Governed NDIS logo rows | ✓ 8 (`d1b10010`–`d1b10014`, `d1b10015`–`d1b10017`) |
| Other-brand governed-logo pool | ✓ unchanged, 10 |
| `brand_profile.brand_logo_url` | ✓ unchanged |
| In-txn assertions | ✓ all passed (no exception raised, transaction committed) |
| **Live resolver behavior** | ✓ `resolve_slot_assets('ndis-yarns','facebook',NULL,<template>,'gate-verify-1')` → `status=ok`, **`Logo.asset_key='ny_logo_full_colour'` (`d1b10010`)** — confirms the predicted identity switch actually occurred, not just theoretically possible |
| Unrelated slot impact | ✓ Background slot resolved normally (`bg_ny_accessible_boardwalk`), unaffected |

## Non-claims

No render was triggered by this lane (the resolver check above is a read-only RPC call, no
Creatomate render, no publish). The NEXT real NDIS `image_quote` render (any platform, any format)
will pick up the full-colour ringed logo automatically via the existing cron/production path —
not separately verified visually in this lane; flag for a visual spot-check on the next natural
NDIS render if desired. `resolve_slot_assets` was not modified. No SVG vector-source rows were
touched. cc-0043 writer branches, music, and video B-roll were not touched (out of boundary, as
instructed).

## Register pointers (DRAFT — hold for PK commit; commit message per PK instruction, no trailer
unless PK asks; push only on explicit PK instruction)

**sync_state (new head, above v6.46):**
> `✅ NDIS Yarns logo completion (Asset Sufficiency P1-5) — APPLIED 2026-07-28. 7 remaining fenced logo candidates promoted (d1b10010-14, d1b10016, d1b10017); governed NDIS logo count 1→8. PK-accepted consequence: live Logo pick switched from mark-only (d1b10015) to full-colour ringed primary (d1b10010) — resolver has no placement-aware selection, confirmed live post-apply. Other-brand pool unchanged (10); brand_profile fallback untouched. External review escalated (policy_decision, not a defect) → PK explicit re-confirmation → applied. Record: docs/briefs/results/ndis-logo-completion-result-v1.md.`

**action_list (current marker):**
> `- NDIS Yarns logo completion APPLIED: governed logo count 1→8; live pick now full-colour ringed primary (was mark-only); brand_profile untouched; other brands unaffected → docs/briefs/results/ndis-logo-completion-result-v1.md. NEXT (Asset Sufficiency ranking): P2-1 music promotion.`
