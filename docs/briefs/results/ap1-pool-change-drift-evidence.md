CLAIMED v5.11 · ap1-pool-change-drift-evidence · shared-main-docs · commit-gate · 2026-07-06T00:40Z

# Result — AP-1 — Pool-Change Drift Evidence (TMR Autopilot sprint, lane 1/5)

**Sprint:** TMR Autopilot + Safety Closure (PK-approved order AP-1→5) · **Tier:** T2 read-only · **Label:** SAFETY_GATE · **Completed:** 2026-07-06

## 1. Headline: NO SILENT DRIFT after the day-hero pool change — proven live

- Resolver pool (full filter chain, rank order): **6 keys** — `[perth, sydney, brisbane, aerial_grid, home_keys, `**`bg_pp_perth_cbd_skyline_day_wide`**`]` (day-hero promoted v5.02).
- Every production render since the promotion is TMR-shaped with `background_key` **∈ the current pool**: `23024f4c…` (brisbane) · `94afdff5…` (perth, picked from the mod-6 rotation post-change). Zero failures.
- Forward shadow stream: **2/2 `agreement`, `background_match=true`** — including the post-change render. Under the retired Lane-4 constant this pool change would have silently re-diverged production (the recorded mod-count hazard); under Option D it is a non-event. **The runtime-resolver architecture is now evidence-backed against pool churn.**

## 2. Known-lag inventory (display/evidence surfaces only — no production impact)

| Surface | Declares | DB truth | Consumer impact |
|---|---|---|---|
| `docs/creative-library/property-pulse.json` v0.4 | 5-key pool | 6 | docs only → AP-3 sweep |
| Dashboard vendored registry (v0.4 @ b9d02ca) + assets-panel expectedKeys | 5 keys | 6 | display only → AP-3 sweep |
| Vendored contract v2 `governed_assets.background` (both workers) | 5 keys | 6 | evidence-stamp only → AP-4 (v3 makes the binding policy-based, ending per-key lag permanently) |
| Workers | no pool constants (Option D) | — | ✅ nothing to lag |

## 3. Feeds forward

**AP-2 drift probe acceptance case (blind):** the probe must independently flag exactly the three lagging surfaces above and nothing else (provider↔registry are currently 1:1 clean; the 490ad9ea/fb9820f8/bc32f52f deletions are already reconciled). **AP-3:** sweep list = the two doc surfaces (+ expectedKeys 5→6). **AP-4:** contract v3's policy binding is the permanent fix for the third row.

Read-only throughout; zero mutation.
