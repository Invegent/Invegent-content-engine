# Day-hero intake (gl7nkS_h4lo) — RESULT

**APPLIED + VERIFIED** — 2026-07-05, project mbkmaxqhsohbtwsqolns, exact PK-approved artifact (hash re-verified `96746e53…` immediately pre-apply), applied as postgres.

## Sequence as executed
1. **Upload:** `bg_pp_perth_cbd_skyline_day_wide.jpg` → `brand-assets/Property_Pulse/Backgrounds/` (`x-upsert:false`, HTTP 200; staged file re-hashed before send).
2. **Mandatory post-upload verification:** public-URL download → **2,386,153 bytes + sha256 `620c77b4…` exact match**.
3. **Apply:** committed — in-transaction assertions all passed (storage size precheck · 1 row in full fenced candidate state · **eligible pool UNCHANGED at exactly 5** · 5 governed background keys untouched).
4. **Live post-apply proof (production-relevant, since Option D drives PP image_quote from this pool):**
   - New row verified: `is_active=false`, `approved=false`, `intake_candidate`, `production_use_allowed=false`.
   - `resolve_brand_assets('property-pulse', [day-hero key])` → **0 rows**.
   - `resolve_slot_assets` on the **live production winner template (market_insight)**: unseeded Background winner **still `bg_perth_cbd`**, 2 slots selected as normal, and the day-hero appears in `rejected` exactly once with reason **`inactive`** — production selection provably unaffected.

## Standing state
- `bg_pp_perth_cbd_skyline_day_wide` (asset_id `b2a10008…`) is governed inventory: full Unsplash provenance, reviewer PASS_WITH_NOTE verbatim, PK acceptance recorded, scrim 0.48 suggestion, **Option-D promotion warning embedded in pk_decision + notes**.
- The bright-day Perth skyline sourcing carry is **CLOSED** (sourcing + intake). Promotion to the live 5-pool is a separate future PK gate and a production-rotation change (would make the pool 6 and shift B1/TMR seeded selection composition).
- Rollback standing: `dayhero_rollback.sql` (`229553ec…`) — promotion-guarded single-row delete; storage object separately gated.
- Boundaries held: no approval/promotion/production_use_allowed, no pool change (machine-asserted + live-proven), no render/publish/deploy; packet commit/push = separate PK gate.
