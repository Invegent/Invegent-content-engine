CLAIMED v5.27 · pp-static-tmr-cross-platform-quality-proof-v1 · main-checkout · commit-gate · 2026-07-08T02:10Z (verify register head at commit — active churn)

# Result — Property Pulse Static TMR Cross-Platform Quality Proof v1

**Packet:** `docs/briefs/pp-static-tmr-cross-platform-quality-proof-v1-packet.md` (Gate 1 D1–D7 PK-approved; method = **Option A, assemble existing evidence** — PK-approved after the D6 render-mode blocker) · **Tier:** T2 · **Label:** PRODUCT_PROOF · **Completed:** 2026-07-08
**Status:** ✅ COMPLETE — read-only, zero mutation, inside all boundaries (no render generation, no publish, no promotion, no schema).

## Recommendation (plain English)

**Close Property Pulse static-image TMR as production-ready for the static pilot, and move to Creatomate video** — with the four carries below recorded. Facebook and Instagram PASS; LinkedIn visual PASSES with native-publish carried on cc-0028; Website is NOT SUPPORTED (no path); YouTube is out of scope. No carry is large enough to delay video — but **the geo-pairing carry (C1) is the most substantive** and PK may wish to act on it (fence/demote the 2 geographic-risk backgrounds) either now or as first polish.

## Method note (D6 adjustment, PK-approved)

Fresh seed-targeted governed renders (approved D6) proved **not available** — Lane W (v3.23.0) retired every manual/seed-targeted render mode to 410 guards; the only live governed-render path is the production queue, which can't be forced to a target background. PK approved **Option A**: assemble the proof from existing, already-PK-accepted evidence — the live governed renders, the intake/promotion composed crop-proofs, each asset's recorded review verdict, and (for the signage asset) direct source inspection. No re-rendering, no retired-code re-enable, no production touch.

## Baseline (proof #1 — met)

PP governed static background pool **frozen at 17** (fb 17 / li 15 / ig 14), **stable ~14 h**, register reconciled through **v5.26** (matches live exactly). No pool change in this lane.

## Cross-platform proof matrix

| Platform | Render / visual | Native-image publish | Verdict |
|---|---|---|---|
| **Facebook** | PASS (1:1 native; full card proven) | PROVEN — governed TMR render published to FB (`6e8c2705`) | **PASS** |
| **Instagram** | PASS (1:1 is IG's native feed format) | native image path (45 PP IG publishes) | **PASS** |
| **LinkedIn** | PASS (1:1 renders fine) | live publisher = v1.2.0; native `image_quote` media-publish = **cc-0028** (v1.3.0 committed, undeployed) | **PASS WITH CARRY** (visual PASS; publish carried on cc-0028) |
| **Website** | — | no PP website static-image publish path (audit: fb/ig/li/yt only) | **NOT SUPPORTED FOR STATIC TMR** (does not block closure) |
| **YouTube** | — | — | **OUT OF SCOPE** (Creatomate/video sprint) |

## 5-category proof set (representative, not every asset)

| Category | Asset | Evidence | Visual verdict |
|---|---|---|---|
| market / data | `bg_pp_market_data_chart_grid` | composed 1:1 scrim crop-proof (headline) viewed | **PASS** — dark chart bg, crisp high-contrast white headline+subtitle, no unwanted text |
| interior | `bg_pp_kitchen_living_open_plan` | **live governed full render** `bfe25171` (2026-07-08) viewed | **PASS** — full card strong: "PROPERTY NEWS" badge, **Property Pulse logo clear**, headline/subtitle/date/`propertypulse.com.au` footer all present, crop-safe; contrast borderline over the brightest zones (C2) |
| finance / advisory | `bg_pp_advisory_desk_flatlay` | recorded verdict `ACCEPT_VISUAL_ONLY` (warm-wood desk flat-lay; tablet/glasses/pen; no text, no branding, no faces) | **PASS** — non-geographic, text-safe (recorded-verdict-backed; no composed image) |
| sales / signage | `bg_pp_sold_sign_closeup` | source inspected directly | **PASS WITH CARRY** — text-safe (generic red SOLD / FOR-SALE sign; **no agent name / brand / phone**); BUT the only **portrait (2:3) source** → a 1:1 centre-crop frames it awkwardly (sign in top third, crop keeps mostly grass) — **unverified without a render** (C3) |
| premium | `bg_pp_coastal_waterfront` | composed 1:1 scrim crop-proof viewed (+ `city_skyline_vantage` sibling) | **PASS WITH CARRY** — composition works; but geo-pairing risk (C1) + borderline white-text contrast over bright water/sky (C2) |

Full-composition gate (logo + badge + date/website footer) is proven by the live kitchen render + `bg_perth_cbd`/`bg_brisbane_cbd` governed renders + the B0/B1 production_proven template. Per-background suitability is proven per asset (composed crop-proofs for market-data/coastal/skyline; recorded review verdicts for the rest).

## Carries (record; none block Creatomate video)

- **C1 — geo-pairing (most substantive).** Background selection is **decoupled** from the AI-authored headline's geography, and each asset's `label_constraint` is **not enforced** at render time. So a headline naming one place (e.g. "Perth") can render over a background whose location contradicts it — `bg_pp_coastal_waterfront` (Whitehaven **QLD**, fenced "never Perth/WA") or `bg_pp_city_skyline_vantage` (**generic São Paulo**, fenced "never AU/Perth/WA"). The stress-test crop-proofs show exactly this ("Perth property values" over a QLD beach / a foreign skyline). Non-geographic backgrounds (data/desk/interior/signage) are always safe. Low-frequency (2 of 17 assets), but skyline is the sharpest (a foreign city presented as Perth). **Recommend:** fence/demote the 2 geographic-risk backgrounds, or couple headline-geography → background eligibility, in polish. (Note: PK promoted `city_skyline_vantage` over an orchestrator weak-fit flag at its T3 gate — this carry re-surfaces that, quantified.)
- **C2 — scrim contrast on bright backgrounds.** Dark backgrounds render crisp white text; bright backgrounds (coastal water, sky, bright interiors) give **borderline** white-text contrast at the production scrim (0.48 default vs the 0.56 the crop-proofs used; some assets carry `suggested_scrim_opacity` 0.55–0.60 that may not be applied as a live override). **Recommend:** apply/raise per-asset `scrim_opacity_override` for bright assets, or a brightness-aware scrim, in polish.
- **C3 — sold_sign portrait crop-framing (unverified).** The one portrait (2:3) source may crop awkwardly to 1:1; no composed render exists to confirm. **Recommend:** confirm with a real render before relying on it, or lower its rotation weight.
- **C4 — LinkedIn native-image publish = cc-0028.** LinkedIn visual/render PASSES now; native `image_quote` media-publish waits on cc-0028 (v1.3.0) deploy/proof. Per Gate-1 D4 this is an accepted publisher-side carry and does **not** block closure. If cc-0028 closes, attach its PP native-image publish evidence here.

## Acceptance (met)

Pool/register stable + reconciled ✓ · representative proof set looks good ✓ · Facebook PASS ✓ · Instagram PASS ✓ · LinkedIn visual PASS + native-publish carried on cc-0028 ✓ · Website NOT SUPPORTED ✓ · YouTube excluded ✓ · no blocker large enough to delay Creatomate video ✓ (C1–C4 are polish/known-lane carries).

## Boundaries honoured

Read-only; no image sourcing/intake/promotion, no global expansion, no schema, no live publishing, no Creatomate/video work, no fresh render generation. Evidence: composed crop-proofs (`_harness/image_harvester_v0/{run7_mktdata_resource,run8_balcony_coastal}/*cropproof/`), live governed render `bfe25171` (bucket `post-images`), asset review verdicts (`c.client_brand_asset.asset_meta`), FB publish `6e8c2705`.

## Evidence references

- Live governed renders (4): `bfe25171` kitchen (2026-07-08), `1138701e` brisbane, `94afdff5` perth, `23024f4c` brisbane — the only TMR-shape renders in the fleet.
- Composed 1:1 crop-proofs: `mktdata_1x1_scrim056_headline.jpg`, `coastal_1x1_scrim056.jpg`, `skyline_1x1_scrim056.jpg`, `run5_b3m3/cropproof/02_1x1_1080_scrim056_headline.jpg`.
- Publish proof: FB governed TMR publish `6e8c2705` (v5.09).
- Promotions backing the pool: `GOODENOUGH_BATCH_PROMO_RESULT.md`, `SKYLINE_PROMO_RESULT.md`, `COASTAL_PROMO_RESULT.md` (register v5.26).
