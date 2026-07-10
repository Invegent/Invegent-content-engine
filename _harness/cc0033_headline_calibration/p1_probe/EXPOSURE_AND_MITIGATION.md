# cc-0033 — published exposure + mitigation-lever verification (evidence record)

**Date:** 2026-07-10 · **Lane:** cc-0033 (image) · read-only. No writes, no renders, no deploy.
**Method:** orchestrator read-only SQL (CCF-02 R1 — the DB is not this lane's subject) + the
PIL wrap model already validated 3/3 against real Creatomate renders (`CALIBRATION_FINDINGS.md:40-49`).

---

## 1. What binds to `Headline` — the proxy was measuring the wrong column

`Headline.text` ← `post_draft.image_headline`.

Chain: `index.ts:791` `buildProofFieldsFromDraft({ image_headline: draft.image_headline, … })` →
`branch_b_proof.ts:41-57` returns `{ headline: draft.image_headline.trim(), … }` →
`b1_production.ts:152-161` `TMR_WINNER_TEXT_FIELDS['generic_market_insight_card_1x1_v1']` maps
`'Headline.text': f.headline`.

**`draft_title` never reaches the card.** The 76%-of-105-drafts proxy measured a column with no
binding to the rendered headline. It is not a lower-confidence version of the real number; it is a
different quantity. **Do not propagate 76%. There is no 41–76% band.**

## 2. The real exposure — 7 of 16 PUBLISHED governed cards (44%)

Population: every `m.post_render_log` row with `render_spec->>'label' = 'creative_library_b1_production'`
and `status='succeeded'`, joined to `m.post_draft` and `m.post_publish`. 23 rows → 6 `B1-v2 proof draft`
rows and 1 unpublished real render excluded → **16 published cards**.

Wrap model: Montserrat `wght=800` @ 74px, greedy wrap in the 86% × 1080 = 928.8px headline box.
`>3 lines` = overprint (headline bottom passes the subtitle's 540px top).

| Date | Platform | Chars | Lines | |
|---|---|---|---|---|
| 2026-06-27 | facebook | 71 | 4 | **OVERPRINT** |
| 2026-06-28 | instagram | 58 | 3 | ok |
| 2026-06-28 | facebook | 71 | 4 | **OVERPRINT** |
| 2026-06-29 | instagram | 63 | 3 | ok |
| 2026-06-29 | facebook | 69 | 3 | ok |
| 2026-06-30 | instagram | 69 | 4 | **OVERPRINT** |
| 2026-06-30 | facebook | 60 | 3 | ok |
| 2026-07-01 | instagram | 61 | 3 | ok |
| 2026-07-01 | facebook | 71 | 4 | **OVERPRINT** |
| 2026-07-02 | instagram | 75 | 4 | **OVERPRINT** |
| 2026-07-05 | facebook | 65 | 3 | ok |
| 2026-07-05 | facebook | 78 | 4 | **OVERPRINT** |
| 2026-07-07 | instagram | 53 | 3 | ok |
| 2026-07-08 | instagram | 52 | 3 | ok |
| 2026-07-08 | facebook | 74 | 4 | **OVERPRINT** ← PK's published screenshot ("…for your portfolio") |
| 2026-07-09 | instagram | 54 | 3 | ok |

**7 / 16 published = 44%.** Facebook **5/8 (63%)** · Instagram **2/8 (25%)** — FB headlines run longer.

PK's 8 July Facebook card is row 15: `"Rate relief slower than hoped — here is what that means for
your portfolio"` (74 chars, 4 lines). The model independently predicts the exact card PK photographed.

**Every governed card that overprints was published.** The earlier "7/17" counted renders; the
published count is 7/16. The defect's reach was never smaller than the lab number — it was the
lab number, all of it, live.

Scope note: the governed path began 2026-06-26. Cards published before that rendered on the legacy
path, which cannot exhibit this defect (§3). So 16 is the whole exposed population, not a sample.

## 3. Mitigation lever — VERIFIED, and the assumption was wrong twice over

**Question:** would flipping `c.client_creative_governance` (PP, `image_quote`) to `enabled=false`
stop the bleeding, or does the legacy path overprint identically?

**Answer: the flip would do nothing at all — because nothing on the image path reads that row.**

- `image-worker` contains **no read** of `c.client_creative_governance`. Its own header says so:
  *"NO read or flip of c.client_creative_governance.enabled"* (`index.ts:30`, repeated `:652`).
- The governed branch is gated by `isB1GovernedImageQuote(clientId)` (`index.ts:781`) — a comparison
  against the **hardcoded constant** `B1_GOVERNED_CLIENT_ID` (`b1_production.ts:28`).
- `select_template` and `resolve_slot_assets` do not consult the table either (no reference in any
  migration defining them).
- Only `video-worker` reads it (`video-worker/index.ts:772-783`, fail-closed).
- The row exists and reads `enabled=true` (verified live). **It is inert on this path.**

**And the fallback assumption is also false.** The legacy card (`buildImageQuoteScript`,
`index.ts:536-549`) is a direct-source design JSON with **no subtitle element at all** — a single
headline text element, `font_size: 62px`, `width: 860px`, **`height: '480px'`**, `y_alignment: '50%'`.
Bounded box, vertically centred, nothing beneath it to collide with. **The legacy path cannot produce
this defect.**

**Consequences.**

1. There is no cheap flip. Routing PP back to legacy requires a **code change + image-worker deploy** —
   the same deploy the actual fix needs. A "temporary mitigation" costs exactly what the cure costs,
   and buys a worse card (no background, no scrim, no location/date/footer, no TMR).
   **Recommendation: do not propose a flip. Ship the fix.**
2. **DoD criterion A1 does not measure what it claims.** A1's machine-check is
   `c.client_creative_governance (PP, image_quote).enabled = true` → **PASS**. That flag is read by
   nothing on the image path. The check passes against an inert row. `image_quote` is governed by a
   **hardcoded client-id constant**, not by the governance table.
   This is the same disease as `max_chars: 90` and the capability contract: **a declared control that
   the production path does not consult.** Third instance in this one lane. → handoff.
3. It is also a **D6 chokepoint**: `B1_GOVERNED_CLIENT_ID` is a PP identity literal on the governed
   worker path, and it is load-bearing for format gating. A second brand cannot be governed by
   configuration here.

## 4. Non-claims

- The wrap model is validated against 3 real renders and correctly predicts PK's published card; it is
  a model, not a pixel measurement of all 16. The 7 named cards are predictions, not re-renders.
- No claim about legacy-path behaviour on headlines long enough to overflow its 480px box — only that
  **no subtitle exists to be overprinted**.
- No claim that the governance row is unused system-wide: `video_short_stat` reads it. The claim is
  scoped to the **image** path.
