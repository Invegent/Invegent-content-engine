# PP market-data — pool-neutral INTAKE gate packet (1 asset)

**Lane:** `pp-bg-mktdata-intake (2026-07-06)` · **Tier T2 · SAFETY_GATE** · cc-0027 · **fenced candidate only — NOT approval/promotion.**
**apply hash:** `9fc52c38c3db88a7a79f825a7d88035da218d7ba2dd9fe204f830b0a7da59c4c` (`mktdata_intake_apply.sql`, 6435 bytes)
**rollback hash:** `9eb0b2488f581794e402da6dcc77116f3d9e09891f4f2ea567585e34777ef1aa` (`mktdata_intake_rollback.sql`, 657 bytes)

## Roster reconciliation (why 1, not 9)
PK's directive named a 9-asset batch; that roster is the pre-intake "accepted-not-intaken" list from before the v5.12/v5.14/v5.16 lanes landed. Live DB (read-only, 2026-07-06):

| Asset | DB state | Action here |
|---|---|---|
| **bg_pp_market_data_chart_grid** | **ABSENT (0 rows)** | **← intaken here (the only new one)** |
| bg_pp_kitchen_living_open_plan | GOVERNED/ACTIVE (promoted v5.16, live) | none |
| au_suburb_texture · transaction_keys_contract · family_backyard_summer · new_build_construction_site · subdivision_land_estate · mortgage_calculator_keys · inspection_checklist_clipboard (7) | intake_candidate — already fenced (v5.12 batch) | none |

Re-intaking the other 8 would be a no-op (dedup guard) and conceptually wrong for kitchen (governed/active). **This gate intakes the 1 genuinely-absent asset.**

## What applies (fenced, double-locked)
- **1 upload** → `brand-assets/Property_Pulse/Backgrounds/bg_pp_market_data_chart_grid.jpg` (Pexels 6203470, cottonbro; sha `d3cb9b1c…`, 1147375 bytes, 2400×3600) — **only after PK hash/upload gate.**
- **1 INSERT-only** row `b3a20011…` — `is_active=false` · `asset_meta.approved=false` · `production_use_allowed=false` · `approval_status=intake_candidate`. NOT-EXISTS dedup on asset_key.
- **asset_meta records (PK-required):** source Pexels 6203470 · `visual_review_verdict=ACCEPT_VISUAL_ONLY` · zero-legible-text crop proof PASSED · scrim proof `1:1, 1080, 0.56` · AI-diffusion exclusion CLEARED (real photo-of-screen).

## Pool-neutrality (machine-asserted, in-transaction, fail-closed → rollback)
- Storage size precheck (bytes) before INSERT.
- Post-INSERT: exactly 1 fenced row with the locked fence fields + sha.
- **Eligible pool UNCHANGED at all=8 / fb=8 / li=8 / ig=7** (current, re-verified read-only 2026-07-06). `is_active=false` ⇒ `resolve_slot_assets` rejects it at its first filter ⇒ zero production rotation change on facebook/linkedin/instagram. Any deviation `RAISE EXCEPTION` → full `ROLLBACK`.

## Not in scope (explicit)
No approval, no promotion, no `is_active`/`approved`/`production_use_allowed` flip, no resolver eligibility, no production pool change. **Promotion is a later, separate PK gate.**

## Review chain
db-rls-auditor (read-only) → `ask_chatgpt_review` (hash-pinned `9fc52c38…`) → **PK hash/upload gate** → upload → apply → post-apply read-only verify (pool still 8/8/8/7, row fenced) → result doc.
Rollback `9eb0b2488…` standing (guarded delete of the unpromoted lane row; storage object excluded).
