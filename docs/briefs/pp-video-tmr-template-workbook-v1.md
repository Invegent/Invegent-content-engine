# Property Pulse — Video TMR Template Workbook v1

**Created:** 2026-07-08 Sydney · **Author:** chat (orchestrator) · **Status:** DRAFT for PK review — build paused pending roster agreement
**Scope:** Property Pulse only · Creatomate video only · **no** HeyGen/avatar · **no** ElevenLabs/voice (first slice) · **no** render/publish/DB/schema/provider-registration · **no** further Creatomate template authoring until this workbook is reviewed.
**Purpose:** the video analog of the static TMR template roster — plan the template library first, then build + smoke-test the strongest P0 templates.

**Evidence base:** PP published content + content pillars (from the static 17-background pool: market/data · residential/interior · finance/advisory · sales/signage · premium/coastal · construction · land · inspection); legacy `video-worker` formats (`buildStatRevealSpec` = single-stat reveal; `buildKineticTextSpec` = scene-based kinetic text; `video_short_stat/kinetic` + `_voice`); the `video_short_stat` preview just rendered (Creatomate `/v2` raw composition, 1080×1920, 18 s render, succeeded — "works, plain").

**Design axis that drives priority:** whether a template needs a **governed background image**. The first governed slice (D2) governs **logo + brand identity only, no background pool** — so *data/text-driven* templates (brand-coloured background, no photo) are the lowest-risk, most-reusable P0. Templates that want a property/suburb/lifestyle photo reopen the "governed background pool for video" question → P1/P2.

---

## Sheet 1 — Video Template Catalogue

| template_key | template_name | content_pillar | example use case | format type | aspect | duration | motion style | required fields | reusable across brands? | PP-specific? | priority | build complexity | smoke-test rec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `vid_market_stat_reveal` | Market Stat Reveal | market update / finance | "Perth median value up 34.2% YoY" | single-stat animated card | 9:16 | 18–20s | stat scale-bounce + accent wipe/slide/fade | StatValue · StatLabel · ContextLine · CtaText · Logo | **Yes** (any data-driven brand) | No | **P0** | Low (tested) | **YES — first** |
| `vid_three_point_tips` | 3-Point Tips / Listicle | buyer-seller education / advisory | "3 things to check before you sell" | sequential 3-point reveal | 9:16 | 20–25s | staggered point entrances (slide/fade) | Title · Point1 · Point2 · Point3 · CtaText · Logo | **Yes** (universal) | No | **P0** | Low–Med | **YES** |
| `vid_multi_stat_card` | Multi-Stat Data Card | market / data | "3 numbers that matter this month" | 2–3 stat grid reveal | 9:16 | 20s | staggered stat reveals | Title · Stat1Value · Stat1Label · Stat2Value · Stat2Label · Stat3Value · Stat3Label · CtaText · Logo | **Yes** | No | **P0** | Med | **YES** |
| `vid_kinetic_quote` | Kinetic Text / Statement | advisory / education | "In this market, timing beats luck." | scene-based kinetic text (legacy `video_short_kinetic`) | 9:16 | 15–20s | word/line kinetic scenes | Title · Line1 · Line2 · Line3 · CtaText · Logo | **Yes** | No | P1 | Med | later |
| `vid_rate_finance_update` | Rate / Finance Commentary | rate / finance | "RBA holds cash rate at 4.35%" | stat + directional accent | 9:16 | 18–20s | stat + up/down arrow motion | StatValue · StatLabel · DirectionIndicator · ContextLine · CtaText · Logo | Yes (finance) | No | P1 | Med | later |
| `vid_suburb_spotlight` | Suburb Spotlight | suburb / property insight | "Spotlight: Scarborough — 3 key numbers" | suburb name + stats **+ background photo** | 9:16 | 20–25s | photo Ken-Burns + stat reveals | SuburbName · Stat1Value · Stat1Label · Stat2Value · Stat2Label · Background · Logo · scrim | Low (real-estate) | **Yes** | P1 | Med–High (**needs bg pool**) | later |
| `vid_sales_result` | Sales Result / SOLD | sales / results | "SOLD in 12 days — 8% over reserve" | result announcement **+ optional property image** | 9:16 | 12–15s | SOLD stamp + stat pop | Headline · StatValue · StatLabel · Background(optional) · Logo | Low (real-estate) | **Yes** | P1 | Med–High (**bg question**) | later |
| `vid_premium_lifestyle` | Premium / Lifestyle Cinematic | premium / coastal / lifestyle | brand-feel reel over coastal/skyline | cinematic **background video/image** + minimal text | 9:16 | 20s | cinematic pan + text fade | Headline · CtaText · Background(video/image) · Logo · scrim | Yes (lifestyle) | No | P2 | High (**bg video, cinematic**) | later |
| `vid_construction_supply` | Construction / Supply Update | construction / land / supply | "Dwelling approvals down 6% this quarter" | stat + construction motif | 9:16 | 18–20s | stat + motif accent | StatValue · StatLabel · ContextLine · CtaText · Logo | Yes | No | P2 | Med | later |
| `vid_before_after_compare` | Year-on-Year Comparison | market | "2024 vs 2025 — what changed" | two-column comparison reveal | 9:16 | 20s | dual-column staggered reveal | Title · LeftLabel · LeftValue · RightLabel · RightValue · CtaText · Logo | Yes | No | P2 | Med–High | later |

**Baked vs governed (all templates):** `AccentColor` = **baked** PP brand (#1E2532 bg / #ECA02D accent) in the PP-specific template; `Logo` = **governed** (from brand identity resolver); `Background` (where present) = the deferred governed-video-background question; all text fields = AI-authored from the draft `video_script`.

**Design status (per template — 4 states: `technical proof only` · `needs premium redesign` · `ready to build` · `later`):**

| template | design_status |
|---|---|
| `vid_market_stat_reveal` | **needs premium redesign** (technical proof exists — preview rendered — but plain; polish before production use) |
| `vid_three_point_tips` | ready to build |
| `vid_multi_stat_card` | ready to build |
| `vid_kinetic_quote` · `vid_rate_finance_update` · `vid_suburb_spotlight` · `vid_sales_result` · `vid_premium_lifestyle` · `vid_construction_supply` · `vid_before_after_compare` | later |

---

## Sheet 2 — Property Pulse Content Pillars → Video Templates

| PP content pillar | Primary template(s) | Secondary |
|---|---|---|
| Market update | `vid_market_stat_reveal` (P0) · `vid_multi_stat_card` (P0) | `vid_before_after_compare` (P2) |
| Rate / finance commentary | `vid_rate_finance_update` (P1) | `vid_market_stat_reveal` (P0) |
| Suburb / property insight | `vid_suburb_spotlight` (P1) | `vid_multi_stat_card` (P0) |
| Buyer / seller education | `vid_three_point_tips` (P0) | `vid_kinetic_quote` (P1) |
| Construction / supply | `vid_construction_supply` (P2) | `vid_multi_stat_card` (P0) |
| Sales / results | `vid_sales_result` (P1) | — |
| Premium / lifestyle | `vid_premium_lifestyle` (P2) | — |
| Advisory / tips | `vid_three_point_tips` (P0) | `vid_kinetic_quote` (P1) |

**Read:** the four P0 templates (stat reveal · 3-point tips · multi-stat · [kinetic]) cover PP's **highest-volume** pillars — market updates + education/advisory — with **zero** background-image dependency. Suburb/sales/premium (the photo-hungry pillars) are deliberately P1/P2 behind the governed-video-background decision.

---

## Sheet 3 — Required Creatomate Fields (stable binding names)

Field-name vocabulary the governed renderer binds by element **name** (content overridden at render; names stable across versions):

| Field | Used by | Source | Notes |
|---|---|---|---|
| `Title` | tips · multi-stat · kinetic · compare | `video_script.title` | headline/topic line |
| `StatValue` | market_stat · rate · construction | `video_script.stat_value` | the hero number |
| `StatLabel` | market_stat · rate · construction | `video_script.stat_label` | UPPERCASE label |
| `ContextLine` | market_stat · rate · construction | `video_script.context_line` | supporting sentence |
| `Stat1Value`/`Stat1Label` … `Stat3*` | multi-stat · suburb | `video_script.stats[]` | 2–3 stat pairs |
| `Point1` / `Point2` / `Point3` | tips | `video_script.points[]` | sequential bullets |
| `Line1` / `Line2` / `Line3` | kinetic | `video_script.lines[]` | kinetic scene lines |
| `Headline` | sales_result · premium | `video_script.headline` | announcement line |
| `SuburbName` | suburb_spotlight | `video_script.suburb` | location |
| `DirectionIndicator` | rate_finance | derived (up/down/hold) | arrow/colour cue |
| `CtaText` | all | `video_script.cta_text` | call to action |
| `Logo` | all | **governed** brand identity | `pp_logo_primary` (resolver) |
| `Background` | suburb · sales · premium only | **deferred** governed-video-bg | not in P0 |
| `AccentColor` | (baked) | PP brand profile | #ECA02D — baked, not a render field in v1 |

**Convention:** P0 templates use ONLY `{StatValue,StatLabel,ContextLine}` / `{Title,Point1-3}` / `{Stat1-3}` + `CtaText` + `Logo`. No `Background` field in any P0 template → no governed-background dependency for the first build batch.

---

## Sheet 4 — Smoke Test Plan (first 3 P0)

**1. `vid_market_stat_reveal`** — *build/polish first.*
- **Why first:** already renders (preview succeeded); the market-update workhorse; lowest risk; becomes the first governed proof.
- **Draft/script:** a `video_short_stat` draft with `stat_value`, `stat_label`, `context_line`, `cta_text`.
- **Success:** stat legible + bounces cleanly · label/context/CTA readable over dark bg · logo crisp · brand gold accents · clean 9:16 (no bottom-UI collision) · <25 s render.
- **Fail:** stat/text overflow or clipping · unreadable contrast · off-brand colour · logo distorted · element overlap.

**2. `vid_three_point_tips`** — *build second.*
- **Why:** buyer/seller **education** is PP's highest-volume non-market pillar; universal + globally reusable; no background.
- **Script:** `title` + `points[3]` + `cta_text`.
- **Success:** 3 points reveal in sequence, all legible, no overlap, balanced spacing; title + CTA clear.
- **Fail:** points overlap/clip · a 4th point is needed (fixed-3 too rigid) · long point text truncates badly.

**3. `vid_multi_stat_card`** — *build third.*
- **Why:** richer market-data than single-stat; differentiates; no background.
- **Script:** `title` + `stats[2–3]{value,label}` + `cta_text`.
- **Success:** 2–3 stats laid out balanced + legible; staggered reveal reads well.
- **Fail:** crowding at 3 stats · small/unreadable values · unbalanced when only 2 supplied.

**Common gate (all 3):** exactly the governed field names bind (StatValue/Point1/Stat1Value/…); render via the governed video path (V2), not the legacy inline path; the run stamps the governed video shape; visual inspection of the mp4 (no publish).

---

## Sheet 5 — Reuse / Global Potential

| template | NDIS Yarns | Care for Welfare | Invegent | Global potential |
|---|---|---|---|---|
| `vid_market_stat_reveal` | ✅ ("X% of participants…") | ✅ (service metrics) | ✅ (any KPI) | **HIGH** |
| `vid_three_point_tips` | ✅ (education is core NDIS) | ✅ | ✅ | **HIGH** |
| `vid_multi_stat_card` | ✅ | ✅ | ✅ | **HIGH** |
| `vid_kinetic_quote` | ✅ | ✅ | ✅ | **HIGH** |
| `vid_rate_finance_update` | ➖ | ➖ | ✅ (finance) | MED |
| `vid_suburb_spotlight` | ❌ | ❌ | ❌ | LOW (real-estate) |
| `vid_sales_result` | ❌ | ❌ | ❌ | LOW (real-estate) |
| `vid_premium_lifestyle` | ➖ | ➖ | ➖ | MED (lifestyle) |
| `vid_construction_supply` | ❌ | ❌ | ➖ | LOW–MED |
| `vid_before_after_compare` | ✅ | ✅ | ✅ | MED–HIGH |

**Strategic read:** the **P0 data/text templates are the most globally reusable** — they carry straight into the Ultimate-TMR multi-client generalisation (NDIS/CFW/Invegent all need stat/tips/data video). The real-estate-specific templates (suburb/sales) are PP-only and lower priority. This means the P0 build doubles as the *reusable video substrate* for later clients — high leverage.

---

## Sheet 6 — Build Roadmap

- **P0 first batch (build + smoke now, after roster sign-off):** `vid_market_stat_reveal` (polish the tested one) · `vid_three_point_tips` · `vid_multi_stat_card`. All data/text-driven, no background, most reusable.
- **First governed proof template:** **`vid_market_stat_reveal`** — it already renders, lowest risk; govern + prove it end-to-end (V2 wiring + governed render + YouTube-inspect), then the other two P0s reuse the proven pattern.
- **P1 follow-up:** `vid_kinetic_quote` · `vid_rate_finance_update`, then the **governed-video-background decision** unlocks `vid_suburb_spotlight` · `vid_sales_result`.
- **P2 later / advanced:** `vid_premium_lifestyle` (cinematic bg video) · `vid_construction_supply` · `vid_before_after_compare`.
- **Gating decision before P1 photo templates:** whether/how to give video a governed background pool (reuse the static 17-bg pool? new video-safe pool? none?) — its own Gate-1.

---

## Summary + recommendations

- **Recommended first 3 P0 templates:** `vid_market_stat_reveal`, `vid_three_point_tips`, `vid_multi_stat_card` — they cover PP's highest-volume pillars (market + education), need **no governed background** (lowest risk), and are the **most globally reusable** (carry into NDIS/CFW/Invegent).
- **On the existing `video_short_stat` template — KEEP as P0, REDESIGN, do NOT demote.** It is `vid_market_stat_reveal` — the proven baseline and the market-update workhorse; it stays the **first governed proof template**. The "nothing fancy" feedback = a **visual polish pass** folded into the P0 build (stronger motion/accents/hierarchy in the Creatomate editor), not a demotion. It is not merely proof-only — it's a real production P0 that just needs styling.
- **Guardrail carried from static:** keep the P0 batch **background-free** so the first governed video slice doesn't inherit the background-pool question; that stays a deliberate later Gate-1 before the photo-hungry P1 templates.

**Output note:** editable spreadsheet emitted → `docs/briefs/pp-video-tmr-template-workbook-v1.xlsx` (6 sheets, PP-branded, colour-coded priority + design_status). This Markdown is the source summary; both carry the same 10-template roster.

**First governed proof (recommended):** `vid_market_stat_reveal` — after its premium redesign; it already renders and is the market workhorse, so govern + prove it first, then the other two P0s reuse the proven pattern.

**Next manual Creatomate design step (after this workbook is approved):** premium-redesign `vid_market_stat_reveal` in the Creatomate editor — **keep the 5 named fields** (`StatValue`, `StatLabel`, `ContextLine`, `CtaText`, `Logo`), target a more premium look (gradient / stronger hierarchy / richer motion). That redesigned template then becomes the first governed proof; only after that do we save a `provider_template_id` and resume the build.

**Do-not (until roster agreed):** no template authoring, no provider_template_id save, no V2 wiring, no render/publish/DB/registration. Awaiting your review + sign-off on the roster.
