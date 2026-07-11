# TMR Generic Template Library — Foundation v1

**Created:** 2026-07-11 Sydney · **Author:** chat (orchestrator) · **Status:** DRAFT for PK review — **Gate 1** (foundational model sign-off)
**Lane class:** SIDE_PROVING · **Tier:** T1 (docs-only — no build, no DB write, no migration, no render, no deploy)
**Scope:** the **generic**, metadata-driven creative template library — **all media types** (static image · static quote · short video · long video) in **one** model. **Not** Property Pulse–specific. Vertical/brand fit is expressed as *tags*, never as separate templates.

**Purpose.** Settle, on paper, the single model every template is described by, so that (a) intake captures the same metadata for a static card and a 30s reel, and (b) selection can automatically pick the best template for a request by matching tags — before we touch the schema or intake a single row.

**What this doc decides (Gate 1):** the unified dimension model · the tag taxonomy · the canonical slot vocabulary · the coverage matrix (how many templates, phased) · the two schema additions needed. **What it does NOT do:** no migration, no write RPC, no Creatomate authoring, no render, no template promoted/proven. Everything here is a proposal for PK sign-off.

**Grounding.** The registry already exists: 8 `c.creative_template_*` tables, applied 2026-06-30 (migration `20260630042316`), schema `c` (non-REST-exposed, service-role-only, deny-all RLS). Column facts below are read from that live DDL. Gaps named in §7 are real (verified against the DDL), not speculative.

> **⚠ Correction (2026-07-11, post-Gate-1):** this doc originally described the registry as "currently empty." db-rls-auditor verified it is **live and populated** — **17 template families, 19 provider templates, read by 7 production RPCs**. The model below is unaffected (it holds regardless of row count; the live `news_card` in §6.5 is one of those 19), but the "empty" framing was stale (carried from the 30-Jun TMR-3 result). The schema-gap additions in §7 were applied additively/dark as **TMR-4** on 2026-07-11 (`docs/briefs/tmr4-generic-template-tags-asset-appetite-apply-result.md`).

---

## 1. Core principle

> A template is a **generic motion + layout**. Its industry, use-case, tone, and length are **metadata tags**, not baked identity. One "stat reveal" serves real estate *and* entertainment *and* finance — you build it once and tag it. **Vertical does not multiply template count; it is free.**

Three rules that follow:

1. **One methodology across media.** A static image, a static quote card, a 10s video, and a 30s video are the **same kind of record** — differentiated by columns and tags (`output_type`, `duration_seconds`, `length_class`), never by a separate schema. No "static system" and "video system."
2. **Selection = metadata filter + rank.** Given a request (vertical, use-case, platform, aspect, length, tone, available assets), the selector **filters** to eligible templates and **ranks** by proof-state → priority → tone/brand match. The intelligence lives entirely in the tags.
3. **Proof-gated.** A template is never auto-selectable until it has a real render + visual approval (a `proof_event`). Fenced until proven.

---

## 2. The unified dimension model (one row shape for every media type)

Every template — static or video — is described by the **same** dimension set. Mapped to the live registry columns:

| Dimension | Lives in | static image | static quote | short video (10s) | long video (30s) |
|---|---|---|---|---|---|
| `output_type` | `creative_provider_template.output_type` | `static_image` | `static_image` | `video` | `video` |
| `duration_seconds` | `…provider_template.duration_seconds` | null | null | 10 | 30 |
| **`length_class`** *(new — §7)* | tag | `still` | `still` | `short` | `long` |
| **`motion_treatment`** *(new — §7)* | tag | `static` | `static` | e.g. `counter_reveal` | e.g. `staggered_slide` |
| `aspect_ratio` / `width`×`height` | `…provider_template` | ✓ | ✓ | ✓ | ✓ |
| **`vertical` / `use_case` / `tone`** *(new — §7)* | tag | ✓ | ✓ | ✓ | ✓ |
| **canonical content slots** | `creative_provider_template_field` | ✓ (same vocab §4) | ✓ (same vocab) | ✓ (same vocab) | ✓ (same vocab) |
| **asset appetite** *(new — §7)* | `…provider_template` cols | image count, needs-bg | image count | image count | image count |
| lifecycle status | `…provider_template.status` | shared ladder | shared ladder | shared ladder | shared ladder |
| platform suitability | `creative_template_platform_suitability` | ✓ per platform | ✓ | ✓ | ✓ |
| proof | `creative_template_proof_event` | ✓ | ✓ | ✓ | ✓ |

**Alignment rule:** `static quote` is **not** a different type from `static image` or `video quote`. It is `output_type=static_image` + `use_case:quote` + the same `Quote`/`Attribution`/`Logo` canonical slots a video quote uses. Media type and length are **dimensions**, not separate systems. §6 proves this by classifying a live static card and four videos in one shape.

---

## 3. Tag taxonomy (the selection intelligence)

Namespaced tags, **many per template**. A request matches against these; the ranker breaks ties.

| Namespace | Purpose (drives…) | Starter values |
|---|---|---|
| `vertical` | industry fit — **the free axis** | `real_estate` · `finance` · `entertainment` · `ndis_disability` · `nfp` · `generic` |
| `use_case` | the content job — **primary filter** | `stat_reveal` · `multi_stat` · `tips_listicle` · `quote_statement` · `announcement_hero` · `comparison` · `showcase_carousel` · `signoff_outro` |
| `tone` | brand/voice match | `dramatic` · `calm` · `premium` · `playful` · `authoritative` |
| `motion_treatment` | animation style (`static` for images) | `static` · `counter_reveal` · `masked_reveal` · `staggered_slide` · `carousel` · `kinetic_text` |
| `length_class` | attention/platform fit | `still` · `short` (≤~15s) · `standard` (~15–30s) · `long` (>30s) |
| `aspect_fit` | placement fit (also derivable from dims) | `9x16` · `1x1` · `4x5` · `16x9` |

`duration_seconds` stays the **source of truth**; `length_class` is the **selectable bucket** derived from it (thresholds PK-set). Tags are additive metadata — they do not change how a template renders.

---

## 4. Canonical slot vocabulary (the one binding namespace)

Every template — static or video — **normalizes its raw element names to these slots** on intake, so the renderer binds by canonical name and selection never cares about a template's internal naming. Grouped by the archetype that uses them; `src` = governed (brand/asset resolver) · AI (authored text) · data (supplied) · baked.

| Slot | Used by | src |
|---|---|---|
| `Title` / `Headline` | tips · multi-stat · quote · announcement · comparison | AI |
| `StatValue` · `StatLabel` · `ContextLine` | stat_reveal · rate/finance | AI |
| `Stat1Value`/`Stat1Label` … `Stat3*` | multi_stat | AI |
| `Point1` · `Point2` · `Point3` | tips_listicle | AI |
| `Line1` · `Line2` · `Line3` | kinetic quote/statement | AI |
| `Quote` · `Attribution` | quote_statement | AI |
| `CategoryBadge` | any (e.g. "MARKET UPDATE") | AI/baked |
| `CtaText` | all | AI |
| `Logo` | all | **governed** (brand resolver / `brand_logo_url`) |
| `Background` | showcase · hero · suburb · quote-with-photo | **governed** bg / b-roll (separate supply lane) |
| `Scrim` | any over-photo | baked/derived (legibility) |
| `AccentColor` | all | baked per brand |
| `AgentName` · `AgentPhoto` · `Email` · `Phone` | signoff_outro / contact card | **governed** host identity *(new entity — carry)* |

> **Note (new governed entity):** the contact/agent slots (`AgentName`…`Phone`) require a per-host identity we do not model today (we govern `brand_logo_url` only). This ties to the parked **Brand Host Designation** work. Flagged as a carry — the `signoff_outro` archetype is blocked on it, the other 7 are not.

---

## 5. Coverage matrix — how many templates, phased

Count is driven by **archetype × format** only (not vertical — that is tags). Formats that matter: `static 1:1` · `static 4:5` · `short video 9:16` (dominant) · `short video 1:1` · `long video 9:16/1:1`. `16:9` is a phase-2 YouTube/web add.

**Legend:** ● build-now (Foundation) · ○ core library (Phase 1) · ▹ phase-2 · — skip/n-a

| Archetype (`use_case`) | static 1:1 | static 4:5 | short 9:16 | short 1:1 | long 9:16/1:1 | b-roll? |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `stat_reveal` | ○ | ▹ | ● | ○ | — | no |
| `multi_stat` | ○ | ▹ | ● | ○ | ▹ | no |
| `tips_listicle` | ● | ○ | ● | ○ | ▹ | no |
| `quote_statement` | ● *(live)* | ○ | ○ | ○ | — | opt |
| `announcement_hero` | ○ | ▹ | ● | ○ | ▹ | opt |
| `comparison` | ○ | ▹ | ○ | ▹ | — | no |
| `showcase_carousel` | — | — | ● | ○ | ○ | **yes** |
| `signoff_outro` *(component)* | ○ | — | ○ | ○ | ○ | no |

**Phased counts:**

| Phase | Definition | Count |
|---|---|---|
| **Foundation** | one strong template per archetype, single best format (the ● cells' breadth) | **~8–10** |
| **Core library** | each archetype in its 2–3 real formats (● + ○) | **~20** |
| **Full coverage** | add 4:5, 16:9, long-video, 2nd tone for top archetypes (▹) | **~40–50** (demand-driven; not a goal) |

**Where you are:** ~6 today (2 initial + 4 added). **Target: ~20 (core).** Build **breadth first** (one per archetype so selection always has *something*), then depth only for archetypes the content calendar actually posts. **B-roll is a dependency, not a multiplier** — only `showcase_carousel` (and optionally hero/quote-with-photo) consume it; 6 of 8 archetypes render on brand colour and don't wait on the footage lane.

---

## 6. Five worked classifications (the proof the shape holds)

Four of your video templates + one **live production-proven static** card, all in one row shape. This is the test: if a static card and four very different videos all fit, the unification holds (§7 lists what they exposed as missing).

### 6.1 `New_listing_Story_9x16_V1` — `ac25cc1e-c209-4186-8593-25463e0fcce5`
- **output:** `video` · 720×1280 · `9x16` · 13s → `length_class:short`
- **use_case:** `showcase_carousel` · **motion_treatment:** `carousel` (+ `counter_reveal` on the price) · **tone:** `clean`
- **raw fields → canonical:** `Photo-1..4`→`Background`(×4 sequence) · `Price`→(drop / `StatValue` if re-skinned) · `Address`·`Details`→(drop) · `CTA-Text`→`CtaText` · `Title`→`Title` · progress-bar (baked)
- **asset appetite:** 4 images · needs-bg = **yes**
- **re-skin verdict:** the **text-counter** motion is the prize → seeds `stat_reveal`; the 4-photo carousel is b-roll-dependent → holds for `showcase_carousel`. Drop listing slots.

### 6.2 `Searchlight_Reveal_6x4_v1` — `8f1f6175-e601-482b-b061-54b64643a369`
- **output:** `video` · 1080×720 · **`6x4`/3:2** · 14s → `length_class:short`
- **use_case:** `quote_statement` · **motion_treatment:** `masked_reveal` · **tone:** `dramatic`
- **raw fields → canonical:** `Text-1`/`Text-2`→`Line1`/`Line2` · `Photo`→`Background`(opt) · `Brand`(logo+name)→`Logo`
- **asset appetite:** 1 image (optional) · needs-bg = opt
- **re-skin verdict:** strong dramatic-quote motion, but **3:2 is the wrong ratio for social** → rebuild at `9x16` + `1x1`. Keep the searchlight mask.

### 6.3 `Real_Estate_Banner_4x5_V1` — `4f9dc082-58a3-44e9-a3ef-00b205204f0e`
- **output:** **`static_image`** · 720×900 · `4x5` · duration null → `length_class:still` · `motion_treatment:static`
- **use_case:** `tips_listicle` / `multi_stat` (feature-list layout) · **tone:** `clean`
- **raw fields → canonical:** `Feature-1..3`→`Point1..3` · `Price`→(drop / `StatValue`) · `Description`→`ContextLine` · `Photo-1..3`→`Background`
- **asset appetite:** 3 images · needs-bg yes
- **re-skin verdict:** it is a **static image, not a video** — routes to the **static lane**. Reuse the checkmarked feature-list layout for a static tips/multi-stat card.

### 6.4 `Real_estate_Detailed_1x1_V1` — `44526a88-bac5-4446-915b-c2ad2aea9bd9`
- **output:** `video` · 1080×1080 · `1x1` · ~17s (13 + 4.04 outro) → `length_class:standard`
- **use_case:** `tips_listicle`/`multi_stat` + `signoff_outro` (component) · **motion_treatment:** `staggered_slide` · **tone:** `premium`
- **raw fields → canonical:** `Details-1`/`Details-2`(line-split)→`Point1..3`/`Stat*` · `Address`→(drop) · outro `Name`·`Email`·`Phone-Number`·`Picture`·`Brand-Name`→`AgentName`·`Email`·`Phone`·`AgentPhoto`·`Logo`
- **asset appetite:** 5 images · needs-bg yes · **+ host identity (blocked — §4 carry)**
- **re-skin verdict:** the **staggered line-slide** → tips/multi-stat; the **outro card** → a reusable PP sign-off component across every video. Drop property/agent-listing data.

### 6.5 `property_pulse.image_quote.news_card.v1` — provider `fb9820f8-3fee-4448-b324-3d500fa74b40` *(LIVE)*
- **output:** `static_image` · ≈1080×1080 · `1x1` · null → `length_class:still` · `motion_treatment:static`
- **use_case:** `quote_statement`/`announcement_hero` · **vertical:** `real_estate`+`generic` · **tone:** `authoritative`
- **canonical slots:** `Headline` (AI, ~90 char, hard-gated) · `Background` (governed photo) · `Scrim` · `CategoryBadge` ("MARKET UPDATE") · `Logo` (governed)
- **asset appetite:** 1 image · needs-bg yes
- **lifecycle:** **`production_proven`** — PP × facebook + instagram (2 published drafts; evidence in `format-variant-intake-pp-image-quote-pilot-v1.md`)
- **why it's here:** it is *already shipping*, and it fits the identical row shape as the four new videos. **The unification is not theoretical — it describes production today.**

---

## 7. Schema gaps found (feeds Step 3 — the additive migration)

The classification in §6 exposed exactly what the empty registry is missing for the generic, tag-driven, multi-media vision. All **additive** — cheapest to add now, with zero rows in the tables.

1. **Multi-tag dimension — MISSING.** Today `industry_vertical` is a **single** text column on `creative_template_family`; there is **no** tags/labels table and no `use_case`/`tone`/`motion_treatment`/`length_class`. A template cannot carry `real_estate + entertainment + finance`, and selection cannot filter on tone or motion.
   → **Add `c.creative_template_tag`** (`template_id` FK, `namespace` CHECK-vocab, `value`, `unique(template_id, namespace, value)`). Namespaces = §3.
2. **`length_class` — MISSING as a selectable bucket.** `duration_seconds` exists (source of truth) but "short vs long" is not queryable.
   → folded into the tag table as `namespace='length_class'`.
3. **Asset appetite — MISSING.** No way to express "this template consumes 4 images / needs a governed background," which selection needs to avoid picking a 5-photo template when 1 image exists.
   → **Add columns** to `creative_provider_template`: `image_slot_min int` · `image_slot_max int` · `needs_governed_background bool` · `text_overlay_safe_required bool`.
4. **Host/agent identity — MISSING (carry, not this migration).** The `signoff_outro` contact slots need a governed per-host entity (Brand Host Designation). Blocks 1 of 8 archetypes only; deferred to its own lane.

**Unchanged / already sufficient:** `output_type` + `duration_seconds` (media unification ✓) · one lifecycle ladder ✓ · per-platform suitability ✓ · proof_event gating ✓ · `scope` generic/brand/client ✓ · jsonb `constraints` for overflow ✓.

---

## 8. What Gate 1 approves, and what's next

**Approving this doc ratifies:** the unified dimension model (§2) · the tag taxonomy (§3) · the canonical slot vocabulary (§4) · the coverage matrix + ~20-core target (§5) · that the additive schema changes in §7 are the agreed next build.

**It does NOT:** author or re-skin any template · write any registry row · run any migration · render or publish anything · mark anything proven.

**Next step after approval (Step 3):** I draft the **additive migration packet** for §7 items 1–3 (tag table + asset-appetite columns), through db-rls-auditor + external review, to a PK apply gate. Then the intake loop (re-skin → intake → smoke → approve) can begin.

**Open questions for PK:**
- Q1. `length_class` thresholds — confirm `short ≤15s` · `standard 15–30s` · `long >30s`, or set your own.
- Q2. Tags primarily at the **provider_template** level (concrete renderable) — agree? (Family can carry defaults; the concrete template is what selection resolves to.)
- Q3. Is `signoff_outro` in-scope for the first library, or parked with Brand Host Designation? (Recommend: park — don't block 7 archetypes on 1.)
