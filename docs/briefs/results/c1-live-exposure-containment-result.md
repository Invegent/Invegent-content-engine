CLAIMED v5.49 · c1-live-exposure-containment · shared default worktree (main) · register pointer (T1) · 2026-07-10T11:25:00Z

# Result — C1 Live Exposure Containment (5-asset deactivation)

**Lane:** c1-live-exposure-containment · **Date:** 2026-07-10 · **Tier:** T3 (production DML on the
governed asset pool; changes what production renders select) · **Label:** SAFETY_GATE
**Verdict:** APPLIED + PROVEN. **This does NOT close carry C1.**
**Statement:** `_harness/c1_geo_verify_20260710/deactivation_statement.sql` (sha256 `a6bd8619…`)
**Gate-1 brief:** `docs/briefs/c1-geo-pairing-enforcement-gate1-brief.md`

## What was wrong

Property Pulse is a **Perth** brand. Its live-eligible background pool contained assets that cannot
honestly take a Perth label — and **nothing in the render path reads `label_constraint` or
`geography`** (carry C1). A Perth headline could render over São Paulo on any seed that selected it.

This was **live on the production image path**, not a future B-roll risk. The two assets that
*documented* the prohibition were among the most dangerous in the pool; their documentation stopped
nothing.

## Pixel verification (all 17 live backgrounds, 2026-07-10)

Downloaded from their public URLs and inspected at full resolution.
Artifacts: `_harness/c1_geo_verify_20260710/`.

- **Both Perth-named assets ARE Perth.** `bg_perth_cbd` (Swan River, from South Perth — skyline
  located by gradient scan, zoomed 3×) and `bg_pp_perth_cbd_skyline_day_wide` (Kings Park vantage).
  **The inverse hazard did not fire.** Open question 1 of the brief is closed.
- `bg_sydney_cbd` = Sydney (harbour heads, Sydney Tower). `bg_brisbane_cbd` = Brisbane (river, CBD).
  `bg_pp_coastal_waterfront` = Whitehaven/Hill Inlet QLD. `bg_pp_city_skyline_vantage` = non-Australian.
- 🚨 **NEW DEFECT, not previously known:** `bg_pp_modern_home_exterior_front` carries a **fully legible
  council street blade — "MIDDLEBOROUGH TCE" / "NORTHAM …"** (`zoom_streetsign.jpg`, 4× crop). This is
  a **text-safety** breach of the standing signage rule, live in production, independent of geography.
  Its recorded verdict was `PASS_WITH_NOTE`; the note never mentioned the sign. **Nobody had looked at
  the pixels.**

## What was applied

PK decision 2026-07-10: **(A)** for the four pairing withdrawals, **(B)** for the signage asset.

| asset_key | `is_active` | `approved` | why |
|---|---|---|---|
| `bg_pp_city_skyline_vantage` | false | **true** | (A) pairing withdrawal — correctly approved as an image |
| `bg_pp_coastal_waterfront` | false | **true** | (A) pairing withdrawal |
| `bg_sydney_cbd` | false | **true** | (A) pairing withdrawal |
| `bg_brisbane_cbd` | false | **true** | (A) pairing withdrawal |
| `bg_pp_modern_home_exterior_front` | false | **false** | (B) **failed review** — `approved=true` was a review error, not a pairing call |

The (A)/(B) split is deliberate: `approved` means *"passed visual review at intake."* For 1–4 that is
still true; they are withdrawn for a **pairing** reason. For 5 it was never true.

All five stamped `updated_at 2026-07-10 11:18:14+00`.

## Guards (all inside one transaction, fail-closed)

1. Pre-check: exactly 5 live-eligible targets, else abort.
2. Pre-check: pool shape 25 = 17 bg + 8 logo, else abort on drift.
3. `get diagnostics` rowcount asserted **separately** per branch: 4 for (A), 1 for (B).
4. **(B) type assertion:** `approved` landed as a JSON **boolean** `false`, not the string `"false"`
   (`jsonb_typeof(...) = 'boolean'`). `(asset_meta->>'approved')::boolean` would accept a string and
   break later, invisibly.
5. Post-check: pool 20 = 12 bg + 8 logo.
6. **Fail-closed floors:** `backgrounds >= 1` and `logos >= 1` — `resolve_slot_assets` returns
   `no_governed_background` / `missing_required_logo` at zero, which would stop production.
7. `branch-warden` **before** the apply (correcting the prior lane's post-apply deviation).
8. All 8 `RAISE` statements checked for placeholder/arg parity and zero `%%` literals **before**
   execution — the Music-lane bug that both static reviews missed and only surfaced at apply time.

## Live proof (not the DO block's own assertions)

`resolve_slot_assets('property-pulse','facebook','image_quote', 0e006c5c…, <seed>)` called read-only
across four seeds. All four return `status: ok` — the renderer is **not stranded**. Backgrounds
selected: `bg_pp_inspection_checklist_clipboard`, `bg_pp_au_suburb_aerial_grid`,
`bg_pp_home_keys_contract_table`, `Perth_CBD_Suburbs.jpg`. **No São Paulo, no Sydney, no Brisbane, no
street sign.** `Scrim.opacity` 48 throughout (all 17 were `needs_scrim`; no text-safe asset was lost).

## Accepted side effect

`resolve_slot_assets` picks by `FNV-1a(seed) % count`. Shrinking 17 → 12 **changes which background a
given seed selects.** Already-rendered posts are unaffected. Future renders of the same draft may show
a different — still governed, still approved — background. A rotation change, not a defect.

## Rollback (validated, unused)

Restores **both** fences: `is_active` on all five, **and** `approved` back to boolean `true` on the
signage row. A rollback restoring only `is_active` would leave that asset in a state it was never in,
silently persisting a review verdict PK did not make. Statement in the SQL file, with its own rowcount
assertions (4 and 1).

## ⚠ What this does NOT do

**C1 is NOT closed.** The renderer still reads neither `label_constraint` nor `geography`. This removed
the *exposure*, not the *defect*. Two of the four fences (`production_use_allowed`, `approval_status`)
remain decorative. The row is inert only because `resolve_slot_assets` filters
`usage IN ('background','logo')` — **B-roll promotion means widening THAT predicate, not flipping a
fence.**

Real closure is the §6 plan in the Gate-1 brief: structured `geo_scope` backfill → pairing vocabulary →
a structured geo field on the copy (there is none: `B1Fields.location` is hardcoded `''`, and no
`image_location` column exists) → widen `resolve_slot_assets` (DDL) → pure fail-loud assert beside
`assertHeadlineWithinGate` → **warn-only first** → flip. C1 closes at the flip.

## Standing

- Live-eligible pool: **20** (12 backgrounds + 8 logos). Renderer healthy on 4 seeds.
- `bg_pp_modern_home_exterior_front` should **not** be re-approved without a fresh review; it fails the
  signage rule on its own terms.
- Open questions 2–5 of the Gate-1 brief remain unanswered.
- Four cross-lane tracked modifications sit in the shared worktree. Stage by explicit path, never `-A`.
