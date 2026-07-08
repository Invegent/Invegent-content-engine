# Brief — Property Pulse Static TMR Cross-Platform Quality Proof v1

**Created:** 2026-07-07 Sydney · **Author:** chat (orchestrator draft) · **Executor:** Claude Code
**Status:** ✅ Gate 1 APPROVED 2026-07-07 (D1–D7; D4 + acceptance PK-adjusted) — ⏸ HELD pending PP pool stabilisation + register reconcile (proof #1) · **Tier:** T2 · **Label:** PRODUCT_PROOF
**Result:** `docs/briefs/results/pp-static-tmr-cross-platform-quality-proof-v1-result.md`

---

## Task

Prove Property Pulse's **governed static `image_quote` TMR** works and looks good across every platform that supports static images today — so PP static-image TMR can be declared **closed / production-ready** before the Creatomate video sprint. Produce a cross-platform proof matrix (render + visual + publisher evidence per platform) and a final recommendation: close, or list exact blockers. **PP only · static image_quote only · governed TMR path only.** No expansion, no new assets, no video, no Creatomate/global work.

## Source context (grounded, to be confirmed in the lane)

- **The governed render is a single 1:1 square** (`centred-scrim-1x1`, `generic_market_insight_card_1x1_v1`), resolver-driven: `select_template → resolve_slot_assets → buildTmrRenderPlan → Creatomate render`. "Platform-specific" here means (a) the resolver's **per-platform eligible pool** (day-hero and some assets are platform-fenced, so a FB render may pick a different background than IG) and (b) how each platform **frames/crops/publishes** the same 1:1 image. Rendering static proofs uses the **existing proven image-worker→Creatomate path** — this is NOT the video/Creatomate sprint the boundary excludes.
- **Only 2 governed TMR-shape renders exist today** in `m.post_render_log` (`94afdff5`, `23024f4c`, both facebook, both `agreement`). A 5-category × multi-platform matrix will need **fresh proof renders** — the resolver picks the background by seed, so covering a specific category asset means seed-targeting it (the "witnessed-selection" seed-probe technique used in promotions).
- **⚠️ Prerequisite is currently UNMET — the PP pool is mid-promotion.** Required-proof #1 ("pool stable + register reconciled") cannot pass right now: the live eligible pool is **actively growing (9 → 17 in the last ~90 min, most recent update minutes ago)** and the register still says 9. This lane's proof #1 = wait for that promotion to settle, then reconcile the register to live truth, then freeze the pool for the proof. **This is a hard gate on the lane starting** (see D1).
- **LinkedIn publisher is blocked by a known lane:** cc-0028 (`linkedin-zapier-publisher` v1.3.0, native image_quote media-publish) is **committed locally but undeployed** — the live endpoint returns **v1.2.0**. LinkedIn *native-image publish proof* is therefore BLOCKED BY KNOWN LANE (cc-0028) until it's deployed/proven; LinkedIn *render + visual* proof can still pass now.
- **Website:** the readiness audit found PP publishes to fb/ig/li/yt only — **no website publish channel evidenced** (only Care-for-Welfare had one). Website is likely **NOT SUPPORTED FOR STATIC TMR** for PP — to be confirmed, not assumed.
- **Publisher-proof safety:** actually posting fresh test images to PP's **live** social accounts is an outward-facing, public, hard-to-reverse action. Default is to prove native-image publishing from **existing publish evidence** (PP already published a governed TMR render to Facebook — `6e8c2705`) + the publisher code path, NOT new live test posts (see D5).

## Scope

**In:** PP · static `image_quote` · governed TMR path · platforms **Facebook, Instagram, LinkedIn** (+ **Website only if** a rendered-static-image publish path exists for PP). Proof = render + platform-visual inspection + publisher evidence, plus the pool-stability/register reconcile prerequisite.

**Out (hard):** YouTube (belongs to the Creatomate/video sprint) · any video/Creatomate-template work · new image harvesting/sourcing · new asset intake · new asset promotion (unless separately approved) · global/other-client TMR · new DB schema · Spine Gen v2 or any generalisation work.

## Proof plan

1. **Prerequisite — pool stable + register reconciled.** Confirm the active promotion has stopped, count the settled governed pool, reconcile the register (and the declarative/dashboard surfaces if in-scope of the reconcile) to live truth, and **freeze the proof pool** (record the exact eligible set the proof runs against).
2. **Representative proof set (5 categories, not every asset)** — proposed mapping to live governed assets (D2): market/data → `bg_pp_market_data_chart_grid` · residential/interior → `bg_pp_kitchen_living_open_plan` · finance/advisory → `bg_pp_advisory_desk_flatlay` · sales/signage → `bg_pp_sold_sign_closeup` · premium → `bg_pp_coastal_waterfront` (or `bg_pp_perth_cbd_skyline_day_wide` skyline).
3. **Platform render proofs** — for each supported platform, produce governed proof renders covering the 5 categories (seed-targeted so each category asset is exercised; note per-platform fencing where an asset is IG-excluded).
4. **Visual inspection (the 6 gates)** per platform output: crop-safe · logo visible · text readable · no important image detail hidden · no legible unwanted background text · no poor contrast · no platform-specific framing issue.
5. **Publisher proof** per platform: FB native image · IG native image · LinkedIn native image (gated on cc-0028) · Website only if supported — from existing publish evidence + publisher code path by default (D5).
6. **Matrix + recommendation.** Per-platform verdict ∈ {PASS · PASS WITH CARRY · NOT SUPPORTED FOR STATIC TMR · BLOCKED BY KNOWN LANE} + screenshot/render references + final call: close PP static TMR & move to video, or exact blockers.

## Gate-1 decisions (PK)

- **D1 — pool-stability gate.** The lane cannot start proof #1 until the active promotion settles. Recommend: **hold the lane until the promotion stops**, then reconcile + freeze the pool. *(alt: pin the proof to the 5 named assets regardless of total count, and reconcile the register separately.)* **This also resolves your earlier "how to reconcile 9→11" — it becomes proof #1 here, once stable.**
- **D2 — proof-set mapping.** Adopt the 5 category→asset mapping above (all in the live governed pool)? Adjust any pick.
- **D3 — Website.** Confirm PP has no rendered-static-image website publish path → mark Website **NOT SUPPORTED FOR STATIC TMR** (recommended, pending a quick verify). *(If a path exists, add it.)*
- **D4 — LinkedIn (PK-DECIDED).** cc-0028 must NOT block the visual proof. Two rows: (1) **LinkedIn render/visual proof — REQUIRED in this lane**; (2) **LinkedIn native-publish proof — use cc-0028 if it closes in time, else PASS WITH CARRY / BLOCKED BY KNOWN LANE**. Closure does NOT require cc-0028 if: LinkedIn render/crop/visual PASSES · cc-0028 remains the ONLY publisher-side carry · the carry is explicitly recorded. If cc-0028 closes before this proof completes, include its PP native-image publish evidence. **No extra live LinkedIn posts from this lane.**
- **D5 — publisher-proof method.** Prove native-image publishing from **existing publish evidence + publisher code path** (no new live posts to PP's accounts) — recommended. *(alt: if you want a fresh live publish proof, that's a separate T3 outward-facing step needing explicit approval, since it posts publicly to the client's accounts.)*
- **D6 — render-generation method.** Fresh **seed-targeted** governed proof renders via the existing image-worker→Creatomate path (only 2 governed renders exist; seed-targeting covers all 5 categories). Recommended. *(alt: mine existing renders — insufficient coverage today.)*
- **D7 — visual-inspection method.** How the 6 gates are judged: I fetch each rendered image + inspect directly, and/or Claude-browser preview in each platform's composer. Recommend image-fetch + direct inspection first; browser-preview only if platform framing needs it.

## Acceptance

PP static-image TMR closes as **production-ready for the static pilot** when: **pool/register truth is stable + reconciled** · the **5-category render proof set passes** visual inspection · **Facebook = PASS or PASS WITH CARRY** · **Instagram = PASS or PASS WITH CARRY** · **LinkedIn render/visual = PASS**, with native publish either **PASS via cc-0028** or **PASS WITH CARRY** if cc-0028 remains open · **Website = PASS / PASS WITH CARRY / NOT SUPPORTED** · **YouTube explicitly out of scope** for static TMR · **no blocker large enough to justify delaying Creatomate video**. Final output: "close PP static-image TMR → move to Creatomate video" or the exact blockers.

## Boundaries (hard)

No new DB schema · no new global/other-client TMR work · no new image sourcing/harvesting · no new asset intake · no extra promotions unless separately approved · no video/Creatomate-template work · no Spine Gen v2 or generalisation. The lane produces proof renders and reads publish/config state; it changes **no** config, promotion, schema, or template. No new live public posts to PP accounts unless D5 elects it (separate approval).

## Success criteria / Stop

**Success:** pool reconciled + frozen; a complete FB/IG/LI (+Website-if-supported) × 5-category proof matrix with render + visual + publisher evidence; every platform carries a clear verdict; a final close/blockers recommendation. **Stop → PK:** the pool won't stabilise (promotion keeps running); a platform fails a visual gate in a way that isn't a small carry (e.g., logo cut off, unreadable text, unwanted legible signage); LinkedIn closure depends on cc-0028 and PK hasn't decided D4; or any step would require a real live post / promotion / schema change (out of bounds).
