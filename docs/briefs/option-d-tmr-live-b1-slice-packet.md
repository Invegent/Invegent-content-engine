# Option D — TMR-Live B1 Slice — Gate 1 Design Packet

**Created:** 2026-07-05 Sydney · **Authority:** PK "path b please" (2026-07-05) after the template-deletion incident; Option D previously ratified as the durable direction ("Option A-now-D-later", Lane 4)
**Status:** Gate 1 PK-approved (D1–D7 as recommended, 2026-07-05) → built + full review chain complete — **awaiting the PK hash/deploy gate (HARD STOP)**.
**Pinned diff hash: `3bf13a3553560b7d76b040685317d52158fb7146766a71e452a48f646a34f97d`** (worktree `C:\Users\parve\ice-worktrees\option-d-tmr-live-b1`, branch `option-d-tmr-live-b1-slice` off main @ `4e8805f`, uncommitted; orchestrator-recomputed).
**Chain (all on the pinned code):** ef-builder (5 files + PGlite harness; image-worker v3.22.0; stale VERSION-const carry closed) → deno **90/90 + 17/17**, `deno check` clean, PGlite shape-proof vs real migrations **24/24 ×2** → branch-warden **safe** (exact file set, no leak, parity 0/0) → db-rls-auditor **concerns → 1 must-fix FIXED+re-tested** (top-level `render_spec.background_key` restored — without it the S1 stamper would stamp `background_match=false` on every Option-D render, inverting D7; Background/Logo asset_keys now extracted fail-closed from slot_resolution.selected) + live re-derivations (posture service-role-only; probes ×3 ok/winner-stable; registry field truth 1:1 with the vendored map; m.slot read safe; LOW platform-asymmetry → stamper-v2 carry) → security-auditor **GREEN zero-remediation** (zero privilege gain; no injection surface, live prosrc verified; blast radius same-or-better; all paths fail-closed; no evidence leakage) → external review **agree/proceed zero-pushback** (`review_id afb6d83f-9b5f-4387-879b-875069226394`).
**Classification:** PRODUCT_PROOF (this is product-proof gate 4: TMR controls one approved PP production slice)

## 1. Incident context (why now)

The legacy B1 production template `fb9820f8…` was deleted from Creatomate's Default Project during the template cleanup (PK, ~2026-07-02/03; one account, two projects — the earlier "second account" theory was wrong and is corrected on the record). PP image_quote production is DOWN (first failed render 2026-07-04 21:45Z, draft `8bbbd34c…`, fail-safe held — nothing broken published). All other formats are direct-source and unaffected. Restoring the legacy template (Path A) would rebuild an artifact scheduled to die under Option D at near-equal governance cost; PK chose Path B.

## 2. What changes (image-worker only)

Inside the existing PP-gated B1 branch (client gate + headline gate + per-draft try/catch + failure semantics ALL unchanged):

| Legacy (dead) | Option D |
|---|---|
| `selectB1BackgroundKey()` FNV over hardcoded 5-key pool | `public.select_template('property-pulse', platform, 'image_quote', NULL, seed=post_draft_id)` — one RPC returns winner template + embedded slot_resolution (Background.source · Logo.source · Scrim.opacity 48) |
| `resolve_brand_assets` for [logo, background] | not needed — slot_resolution carries governed asset URLs + reason codes |
| render template `fb9820f8` (deleted) | render the WINNER's `provider_template_id` (ICE project — templates exist, governed, visually approved) |
| hardcoded text modifications | same text values mapped to the winner's field schema |

**Discovery fact that makes this small:** the live winner for PP/image_quote is `generic_market_insight_card_1x1_v1` (48cba556…), whose dynamic field set is **exactly** the legacy one — `CategoryBadge, Headline, Subtitle, Location, Date, Footer, Background, Logo (+static Scrim)`. The legacy text mapping ports 1:1 (CategoryBadge='PROPERTY NEWS', Headline=draft headline, Subtitle=derived from draft_body, Date=render date, Footer='propertypulse.com.au', Location=''). Winner selection does NOT depend on the seed (seed only rotates backgrounds), so the winner is deterministic until registry truth changes.

## 3. Design decisions for PK (D1–D7)

- **D1 — Supported winners (recommended: fail-closed allowlist).** v1 ships a vendored text-mapping for `generic_market_insight_card_1x1_v1` ONLY. If the selector ever returns a winner without a mapping (ranking flip, approval change, future intent calls), the render **fails loud** (`image_status='failed'`, clear error) — never guesses a layout. quote_card/intent support = follow-up mapping additions. (The 11-template image_quote eligibility pool is over-broad — testimonial/listicle can't be filled from a news draft; format-bridge tightening = recorded carry, PARKED.)
- **D2 — Platform arg:** pass the draft's slot platform when resolvable; NULL otherwise (selector emits the visible `platform_input_missing` warning — permissive, never silent).
- **D3 — Evidence continuity (recommended: keep label).** `render_spec.label` stays `creative_library_b1_production` (the S1 stamper's scan predicate keys on it — forward shadow rows continue automatically). NEW additive `render_spec.tmr` block: selector_version, winner key/id, assignment_id, slot_resolution reasons/warnings, seed. Post-D, B1 shadow rows measure pipeline consistency (expected `background_match=true` by construction) — recorded, understood.
- **D4 — Contract stamp (recommended: leave at v2 this lane).** ai-worker untouched; the v2 contract's background pool text describes the retired rotation — recorded as stale-by-succession, contract v3 (`policy: tmr_spine`) = separate docs/contract carry.
- **D5 — Legacy retirement:** `B1_BACKGROUND_KEYS`, `selectB1BackgroundKey`, `NEWS_STATIC_CENTERED_SCRIM_1x1` usage in the production branch retired (Option D's promise: "the constant dies"). Rotation-equivalence tests retire with them; new tests cover the selector-consuming path hermetically (PGlite with real migrations, per house pattern).
- **D6 — Registry status:** templates stay `visually_approved` at deploy. After the first successful production render + publish, a separate PK-gated recording flips `market_insight` (and any subsequent production winners) to `production_proven` with publish-evidence proofs.
- **D7 — First supervised render:** after deploy, PK-gated reset of the failed Monday draft `8bbbd34c…` (`image_status 'failed' → 'pending'`) → next worker tick renders it as the FIRST TMR-controlled production render → supervised `stamp_tmr_shadow_forward()` = the outstanding S1 live proof (expect stamped:1, `background_match=true`).

## 4. Chain + gates (Tier-3-equivalent: production-touching)

ef-builder isolated worktree → hermetic tests (selector-path unit + PGlite) → db-rls-auditor (selector grants/callers now LIVE) → security-auditor (first production caller of the SECDEF spine) → branch-warden → external review pinned to diff hash → **PK hash gate + conditional deploy sequence** (image-worker only, `--no-verify-jwt`, mandatory STOPs incl. pre-deploy live probe: `select_template` returns ok/winner-mapped for PP/facebook) → D7 supervised render + stamper → result doc + registers (pointer format) → production_proven recording gate (D6).

## 5. Boundaries

PP image_quote slice ONLY · no publisher/queue/dashboard/Format-Mix change · no other client/format touched · no video · no DB migration (RPCs already live) · no cron change · ai-worker untouched (D4) · fail-loud everywhere, no silent fallback. Rollback: redeploy prior image-worker artifact (fn84) — NOTE: rollback restores the code but NOT service (legacy template is gone); true rollback floor = PP image_quote stays down, which is the current state anyway. Incident carries recorded: provider-side deletion guard (template-inventory audit vs live constants before any Creatomate cleanup) · CREATOMATE_GENERICS_API_KEY secret split · format-bridge tightening.
