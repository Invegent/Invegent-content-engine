# Candidate promotion review v2 — best 2–3 for PK ratification (2026-07-06)

**Lane:** selection/review only — **read-only, no DB mutation.** This picks the best 2–3 of the 15 inactive intake candidates for promotion; on your ratification the promotion DML is a **separate PK-gated lane** (day-hero/P0 pattern) and a **live Option-D rotation change**. Visual: `promotion_ranking_v2.jpg`.

## The lens (unchanged, now with Option D live)
Background selection is **blind seeded rotation** — no theme awareness — so a promoted asset must be safe under **any** property headline. Two more filters: **variety** (the live 6-pool is city/suburb-aerial + skyline heavy, plus one keys still-life — it lacks interiors, lifestyle, and professional-desk imagery), and **production impact** (each promotion grows the per-platform eligible pool; Option D drives live rotation from it).

Current live pool (6): perth_cbd · brisbane_cbd · sydney_cbd · au_suburb_aerial_grid · home_keys_contract_table · perth_cbd_skyline_day_wide → **fb 6 / li 6 / ig 5**.

## Recommendation: promote 2, option on a 3rd

| Rank | Asset | Verdict / scope | Why | Risk under blind rotation |
|---|---|---|---|---|
| **#1 PROMOTE** | `bg_pp_kitchen_living_open_plan` (fb/ig/li) | PASS · verified-AU · 8640×5760 | **Biggest variety add — the pool's first interior.** Verified Australian luxury open-plan; theme-neutral (reads as "home/property" behind any headline); huge, high text-safety. | None. Warm sunset-flare mood is aesthetic-only; scrim tunable. |
| **#2 PROMOTE** | `bg_pp_advisory_desk_flatlay` (fb/ig/li) | PASS zero-scope-flags · 6000×4000 | **Safest theme-neutral of the whole set** — a person-free professional desk works under *any* advice/market/finance/tips headline; clean blank-screen + wood overlay zones; adds the missing professional-desk register. | None. Person-free, no readable brand/text. |
| **#3 OPTIONAL** | `bg_pp_family_backyard_summer` (fb/ig **only**) | PASS_WITH_NOTE · verified Gold Coast | Adds outdoor-lifestyle/family variety. | Soft: filmic haze (aesthetic); **scope is fb/ig only** — grows the fb/ig pools but not linkedin. Alternative #3 = `bg_pp_contract_signing_closeup` (fb/ig/li, cleanest object, near-white → use ≥0.60 scrim) if you'd rather add on all three platforms. |

## Deferred (with the reason each defers — same discipline as the P0 review)
- **Redundant with the live pool:** `bg_pp_transaction_keys_contract` (pool already has home_keys_contract_table) · `bg_pp_au_suburb_texture` (pool already has au_suburb_aerial_grid) — good assets, low marginal value now.
- **Theme-specific → unsafe under blind rotation:** `bg_pp_sold_sign_closeup` ("SOLD" text) · `bg_pp_for_sale_sign_street` ("FOR SALE", PARTIAL_FIT) — first-rate for their *own* theme once theme-aware selection exists.
- **Niche / lower text-safety:** `bg_pp_new_build_construction_site` (needs 0.72 scrim, busy) · `bg_pp_subdivision_land_estate` (never-Perth label constraint) · `bg_pp_mortgage_calculator_keys` (concept props + keys-redundant) · `bg_pp_inspection_checklist_clipboard` (niche theme, fb/ig) · `bg_pp_modern_home_exterior_front` (townhouse) · `bg_pp_open_home_entry` (US-style porch) · `bg_pp_perth_skyline_dawn_moody` (dawn mood + redundant vs 3 skylines).

## What promotion would change (for the DML gate, NOT this lane)
Each promoted asset flips is_active/approved/production_use_allowed=true, joins the resolver pool, and **ranks last by created_at** (unseeded winner stays `bg_perth_cbd`; seeded rotation spreads wider). Per-platform pool after the recommended set:
- **#1 + #2** (both fb/ig/li) → **fb 8 / li 8 / ig 7** (from 6/6/6/5).
- **+ #3 backyard** (fb/ig) → fb 9 / ig 8 / li 8. **+ contract instead** (fb/ig/li) → fb 9 / li 9 / ig 8.

A meaningful live rotation change on the affected platforms — handled with the standard CAS-guarded, pool-asserted promotion DML + db-rls-auditor + external review + PK hash gate, per asset/batch.

## PK decisions requested
1. Ratify the promotion set: **#1 kitchen + #2 advisory desk** (recommended), optionally **+ #3** (backyard fb/ig, or contract fb/ig/li).
2. Confirm the deferrals stay inactive (revisited at theme-aware selection or as pool-variety needs grow).
3. On ratification I prepare the promotion DML gate (stop-at-hash, live rotation change acknowledged).
