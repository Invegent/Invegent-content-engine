# Gate-1 Brief — Close Carry C1 (geo-pairing enforcement)

**Status:** DRAFT — **awaiting PK gate 1.** Nothing built, nothing changed, no DML, no DDL, no deploy.
**Tier (proposed):** **T3** — production DDL (`resolve_slot_assets`), governed render path, worker deploy.
**Label (proposed):** SAFETY_GATE.
**Author:** orchestrator, 2026-07-10. All claims below read from live DB / source on the day.

---

## 1. What C1 actually is

Recorded as: *"`label_constraint` is not enforced by the renderer."* That is true but understates it.

**C1 is a live defect on the production image path today.** It is not a future B-roll risk.

Property Pulse's live-eligible background pool is **17 backgrounds**, rotated by an FNV-1a seed hash
across the whole eligible set (`resolve_slot_assets` §5–6). The pool contains:

| asset_key | what it actually is | `geography` | `label_constraint` |
|---|---|---|---|
| `bg_pp_city_skyline_vantage` | **São Paulo, Brazil** | `generic_non_au` | *"NEVER label AU/Perth/WA/any Australian capital"* |
| `bg_pp_coastal_waterfront` | Whitehaven Beach, **QLD** | `au_qld_not_wa` | *"NEVER label Perth/WA (it is QLD)"* |
| `bg_sydney_cbd` | Sydney | — | *(none)* |
| `bg_brisbane_cbd` | Brisbane | — | *(none)* |

Property Pulse is a **Perth** brand. Its headlines read like
`"Perth median house price hits new record this quarter"` (`b1_production_test.ts:168`).

**Nothing reads `geography`. Nothing reads `label_constraint`.** A Perth headline can render over São
Paulo on any seed that selects it. The two assets that *document* the prohibition are the two most
dangerous assets in the pool, and their documentation stops nothing.

## 2. Why "make the renderer read `label_constraint`" is not a fix that exists

Three independent blockers, each verified:

1. **The resolver never sees the copy.** `resolve_slot_assets(p_client_slug, p_platform, p_format,
   p_template_id, p_seed)` — no headline, no location. It cannot evaluate a claim about text it is
   not given. It also returns **no `geography`** in its `selected[]` payload.
2. **`label_constraint` is prose.** *"NEVER label Perth/WA (it is QLD, not WA)"* is a sentence. So is
   the copy's geography — the place name lives **inside the free text of `image_headline`**.
   Comparing two prose strings is not enforcement.
3. **The structured field on the copy side is empty.** `B1Fields.location` is hardcoded `''` in
   production (`b1_production.ts`, `branch_b_proof.ts:53`). There is **no `image_location` column** on
   `m.post_draft`, and **no geo/location/region column anywhere** in schemas `m`, `c`, or `t`.

Closing C1 means **creating the structured facts on both sides first.** It is a build, not a flip.

## 3. The one thing that is already right

`buildTmrRenderPlan` holds **both** halves at once: the copy (`B1Fields`) and the resolved background
(`slot_resolution`). And the codebase already contains the exact shape to imitate —
`assertHeadlineWithinGate`: a **pure, fail-loud** assert that throws *before* any provider call, with
no truncation and no silent fallback. A geo-pairing assert belongs beside it.

## 4. The trap

**23 of the 25 live-eligible assets have no `geography` key.** (2/25 have it; 5/25 have a
`label_constraint`.) A fail-closed assert shipped against today's data rejects nearly every render and
**stops PP image production**. Any plan that enforces before the backfill is complete *and correct* is
an outage.

Precedent for the safe path exists in-repo: `docs/briefs/aci-slice-c-contract-validation-warn-only-brief.md`.

## 5. Backfill classification — **PIXEL-VERIFIED 2026-07-10**

All 17 live backgrounds downloaded from their public URLs and inspected at full resolution.
Artifacts: `_harness/c1_geo_verify_20260710/` (`sheet_geo_claimed.jpg`, `sheet_ambiguous.jpg`,
`sheet_neutral.jpg`, `zoom_perth_cbd_skyline.jpg`, `zoom_streetsign.jpg`).
Verdicts are **suggestive**; PK's visual verdict remains the only deciding act.

### 5a. The two Perth-named assets ARE Perth (the inverse hazard does NOT fire)

- **`bg_perth_cbd`** — ✅ **Perth WA**. Skyline located by gradient scan at 47.4% image height, zoomed
  3×: Perth CBD towers across the **Swan River**, viewed from South Perth, red-tile suburbs foreground.
- **`bg_pp_perth_cbd_skyline_day_wide`** — ✅ **Perth WA**. The Kings Park vantage: CBD towers,
  the freeway cutting below, Swan River and Elizabeth Quay beyond. Unambiguous.

Its `PASS_WITH_NOTE` verdict was not a geography doubt. **Open question 1 is answered: yes, both are Perth.**

### 5b. Location-specific, verified

| asset_key | verified as | proposed `geo_scope` |
|---|---|---|
| `bg_perth_cbd` | Perth WA (Swan R., from South Perth) | `au_wa_perth` |
| `bg_pp_perth_cbd_skyline_day_wide` | Perth WA (Kings Park vantage) | `au_wa_perth` |
| `bg_sydney_cbd` | **Sydney NSW** — harbour heads, Sydney Tower on the skyline | `au_nsw` |
| `bg_brisbane_cbd` | **Brisbane QLD** — Brisbane River, CBD towers, river bridge | `au_qld` |
| `bg_pp_city_skyline_vantage` | **non-Australian** dense high-rise (consistent with São Paulo) | `non_au` |
| `bg_pp_coastal_waterfront` | **Whitehaven / Hill Inlet, QLD** — the swirling white silica sandbar | `au_qld` |

### 5c. 🚨 NEW DEFECT — legible street signage in a LIVE asset

**`bg_pp_modern_home_exterior_front`** carries a fully legible council street blade:
**“MIDDLEBOROUGH TCE”**, with the cross-street **“NORTHAM …”** on the second blade
(`zoom_streetsign.jpg`, 4× crop).

This is **not a geography finding — it is a text-safety finding**, and it is live in production now.
It breaches the standing calibration rule (*readable third-party signage in the crop area → REJECT*)
that governs every image intake. Its recorded verdict is `PASS_WITH_NOTE`. The note did not name the
sign. It also makes the asset **location-identifying** by street name.

**This asset should be pulled from the live pool regardless of how C1 is resolved.** It fails the
signage rule on its own terms, independently of geo-pairing.

### 5d. Geography-neutral, verified (safe with any label) — `geo_scope: neutral`

`bg_pp_advisory_desk_flatlay` (tablet/pen flat-lay) · `bg_pp_market_data_chart_grid` (abstract chart) ·
`bg_pp_home_keys_contract_table` (model house + keys) · `bg_pp_kitchen_living_open_plan` (interior) ·
`bg_pp_mortgage_calculator_keys` (calculator + keys) · `bg_pp_new_build_construction_site` (roof
trusses against sky) · `bg_pp_subdivision_land_estate` (graded lots, aerial — no signage, no landmark)

**Text present but generic (not third-party branding), flag only:**
`bg_pp_inspection_checklist_clipboard` — handwritten “CHECK LIST” visible.
`bg_pp_sold_sign_closeup` — “SOLD” over “HOUSE FOR SALE”. Legible English; the sign *is* the subject.
Both compete with overlay text; neither is a geography or licence problem. (`bg_pp_sold_sign_closeup`
is already carry C3 for its portrait crop.)

### 5e. AU-generic, geography unconfirmed

`bg_pp_au_suburb_aerial_grid` — top-down suburb, red-tile roofs, reads Australian; no landmark and no
legible signage at inspection scale. Verdict `PASS_GENERIC_ONLY`. Propose `geo_scope: au_generic`,
**never** a city-specific label. Not verified to a state.

Plus the fenced B-roll: `broll_pp_au_suburb_aerial` (`au_nsw_sydney_hurstville`) and
`broll_pp_perth_skyline` (`au_wa_perth`).

**Location-specific (must never take a mismatched label):**
| asset_key | proposed `geo_scope` | note |
|---|---|---|
| `bg_pp_city_skyline_vantage` | `non_au` | São Paulo. Documented. |
| `bg_pp_coastal_waterfront` | `au_qld` | Whitehaven. Documented. |
| `bg_sydney_cbd` | `au_nsw` | ⚠ unmarked legacy asset — no `source_site`, no verdict, no constraint |
| `bg_brisbane_cbd` | `au_qld` | ⚠ same |
| `bg_perth_cbd` | `au_wa_perth` | ⚠ same — **is it actually Perth?** unverified |
| `bg_pp_perth_cbd_skyline_day_wide` | `au_wa_perth` | ⚠ verdict `PASS_WITH_NOTE`; Perth-ness **unconfirmed** |

> The last two are the dangerous inverse: if an asset named `perth` is **not** Perth, enforcement
> keyed on its name would *authorise* the very mislabel it was built to prevent.

**Geography-neutral (safe with any label) — proposed `geo_scope: neutral`:**
`bg_pp_advisory_desk_flatlay` · `bg_pp_market_data_chart_grid` · `bg_pp_home_keys_contract_table` ·
`bg_pp_inspection_checklist_clipboard` · `bg_pp_kitchen_living_open_plan` ·
`bg_pp_mortgage_calculator_keys` · `bg_pp_sold_sign_closeup`

**Ambiguous — ⚠ generic streetscape/housing, geography unconfirmed, must not be assumed AU:**
`bg_pp_au_suburb_aerial_grid` (verdict `PASS_GENERIC_ONLY`) · `bg_pp_modern_home_exterior_front` ·
`bg_pp_new_build_construction_site` · `bg_pp_subdivision_land_estate` (its own constraint says
*"geography unconfirmed"*)

Plus the fenced B-roll: `broll_pp_au_suburb_aerial` (`au_nsw_sydney_hurstville`) and
`broll_pp_perth_skyline` (`au_wa_perth`).

## 6. Proposed plan (T3 — none of this is authorised)

1. **Backfill** structured `geo_scope` on the 17 backgrounds (DML, fenced-neutral, reversible).
   Requires §5 resolved, which requires pixel verification of the ⚠ rows.
2. **Vocabulary + pairing matrix.** A closed set (`neutral` pairs with anything; `au_wa_perth` pairs
   with a Perth/WA label; `non_au` pairs with no place label at all). PK decision.
3. **Give the copy a structured geo field.** New column on `m.post_draft` (or on the TMR decision),
   populated by whatever authors the headline. **This is the largest piece and it is upstream of the
   renderer.** Without it there is nothing to compare the asset against.
4. **Widen `resolve_slot_assets`** to return `geo_scope` in `selected[]` (`CREATE OR REPLACE
   FUNCTION` — DDL, T3, migration = permanent identity).
5. **Pure `assertGeoPairingWithinGate(copyGeo, assetGeo)`** in `buildTmrRenderPlan`, mirroring
   `assertHeadlineWithinGate`. Hermetic tests.
6. **Warn-only first.** Record the verdict into `render_spec`, throw nothing. Observe real renders.
7. **Flip to fail-loud** in a second PK-gated lane. **C1 closes at step 7, not before.**

## 7. Interim options that need no build

- **(a) Narrow the pool.** Deactivate or un-approve `bg_pp_city_skyline_vantage` (São Paulo),
  `bg_sydney_cbd`, `bg_brisbane_cbd`, `bg_pp_coastal_waterfront`. One DML change, reversible, removes
  the live hazard **today**. The architectural defect remains open; the exposure does not.
- **(b) Accept the exposure knowingly** and record it. Currently it is accepted *un*knowingly, which
  is worse.

**Recommendation:** do **(a) now**, then run §6 properly. The hazard and the architecture are separate
problems and only one of them is live.

## 8. Open questions for PK

1. Is `bg_perth_cbd` / `bg_pp_perth_cbd_skyline_day_wide` **verifiably Perth**? (Nobody has checked.)
2. Who owns step 3 — which component authors the headline, and can it emit a structured geography?
3. What does `non_au` pair with? Any place label at all, or only fully place-free copy?
4. Do the three unmarked legacy assets (`bg_perth_cbd`, `bg_sydney_cbd`, `bg_brisbane_cbd`) belong in
   a governed pool at all? They have no `source_site`, no licence field, no review verdict.
5. Warn-only first (recommended), or fail-loud on day one?

## 9. Non-claims

- I have **not** verified any of the 17 backgrounds from their pixels. §5 is a reading of metadata,
  and metadata is exactly what this lane has spent the night falsifying.
- I have not established that `select_music`-style typed columns are the right shape here.
- No estimate of step 3's blast radius: it touches whatever writes `image_headline`, which I have not
  read.
