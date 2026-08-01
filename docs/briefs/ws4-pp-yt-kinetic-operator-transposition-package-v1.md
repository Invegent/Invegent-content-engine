# WS-4 First Mission — PP YouTube Kinetic Operator-Transposition Package (v1)

**Created:** 2026-08-01 Sydney · **Author:** `creatomate-specialist` charter, exercised inline
(chat/Claude Code orchestrator) — first mission per
`docs/briefs/ws4-creatomate-specialist-agent-charter-v1.md` §6.
**Status:** `PACKAGE_READY` — design deliverable only. **No PK gate needed to produce this
document** (design work, per PK's standing note); every act after this document — the operator
transposition sitting, registry capture, probe renders, PK visual verdict, graduation — stays fully
gated exactly as the programme brief §4.3/§0 requires. Nothing here is applied, deployed,
registered, or proven.
**Executes:** D4 of the ratified Target Capability Matrix
(`docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §1.2) — "graduate PP YouTube
kinetic; do NOT collapse PP to stat-only."
**Mission format:** `video_short_kinetic` (v1 scope). `video_short_kinetic_voice` is explicitly
**out of this package's build scope** — see §11 (Audio) for why, and how it activates later without
a re-transposition.

---

## 0. Non-claims (read first)

- Nothing in this package has been probe-rendered. Every layout coordinate is **carried forward
  unchanged from the proven, live legacy `buildKineticTextSpec`** (`supabase/functions/video-worker/
  index.ts:1053-1123`) — the ungoverned direct-source path PP's YouTube kinetic content renders
  through *today*. This is a **transposition of a proven design into a governed template**, not a
  new design. Where this package proposes something the legacy code does *not* already prove
  (mainly: collapsing to a fixed-slot template and per-element flat-modification timing), it is
  marked `to_be_confirmed` and listed as a required probe-render item (§14).
- No numeric limit below is invented. Every text/duration limit is the literal AI-generation
  contract already live in `supabase/functions/ai-worker/index.ts:728` (the kinetic system prompt),
  widened only where explicitly stated and justified (§9).
- This package does not decide whether kinetic gets a voice variant, whether the fixed-slot design
  is correct, or how many point slots to build. Those are named PK decisions (§15), not defaults
  silently assumed.

---

## 1. Recommended layout and purpose

**Purpose:** a 3-scene-minimum, 5-scene-maximum kinetic-typography short for YouTube Shorts —
**hook → 1-3 points → CTA** — narrative pattern distinct from `video_short_stat`'s single-stat
reveal (per `docs/architecture/current-ice-decision-tree.md:62`: "kinetic = multi-scene hook/point/
CTA; stat = single-stat reveal — there is no independent narrative dimension"). D4's instruction not
to collapse PP to stat-only is exactly this: kinetic is PP's **multi-point narrative** format, stat
is its **single-number** format — different content shapes need different templates, not one
template doing double duty.

**Recommended layout, at a glance:** solid brand-colour canvas (not a background image or video) ·
persistent top/bottom accent bars in the brand's secondary colour · governed logo, top-left ·
large white kinetic typography per scene, entering/exiting with short fades/slides · a small
`N/Total` progress counter during point scenes · a large, faint decorative "?" watermark during the
CTA scene to differentiate it visually from the point scenes without adding new colour.

## 2. Design provenance (why these exact values, not invented ones)

Every coordinate, font size, weight, colour role, and animation effect below is **read directly**
from the live legacy scene-graph builder, not designed fresh:

| Aspect | Source |
|---|---|
| Canvas 1080×1920, 30fps, mp4 | `video-worker/index.ts:1062,1122` |
| Brand bars, logo position, chrome layout (v3.0.0 "C" — moved to clear Shorts UI) | `video-worker/index.ts:1072-1081` |
| Hook scene layout | `video-worker/index.ts:1089-1092` |
| Point scene layout (counter/accent-bar/headline/divider/body) | `video-worker/index.ts:1100-1114` |
| CTA scene layout | `video-worker/index.ts:1094-1098` |
| Point entry-direction rotation (270/0/180) | `video-worker/index.ts:1101` (`slideDirForPoint`) |
| Caption band reservation (y1300-1520, kept clear by the layout above) | `video-worker/index.ts:965-973` (v3.1.0) |
| Content contract (scene count, per-field char limits, durations) | `ai-worker/index.ts:728` (kinetic system prompt) |
| Governed hard-gate pattern (fail-loud, no truncation, no legacy fallback) | `video-worker/b1_video_stat.ts:196-217` (`assertStatFieldsWithinGate`, the sibling format's proven gate) |
| Flat per-element `.duration`/`.width`/`.height` modification-key precedent | `video-worker/b1_video_stat.ts:146-159` (`B1_VIDEO_TEMPLATE_OUTPUT_PARITY`) |
| Governed asset resolution, fail-loud, no text-fallback | `video-worker/b1_video_stat.ts:1210-1221` (governed branch has no client-name fallback, unlike the legacy path at `index.ts:1079-1081`) |

Where this package **diverges** from the legacy code, it is a deliberate governance decision, named
inline with its reasoning (§5, §11).

## 3. Canvas and output contract

| Property | Value | Note |
|---|---|---|
| `width` × `height` | 1080 × 1920 (9:16) | Matches `video_short_stat`'s governed output spec exactly (`B1_VIDEO_GOVERNED_OUTPUT_SPEC`) — YouTube Shorts. |
| `frame_rate` | 30 | Matches legacy. |
| `output_format` | `mp4` | Matches legacy and the governed stat path. |
| `duration` | **variable**, computed per-render as Σ active scene durations (20-45s bound, §9) | **The single biggest structural divergence from `video_short_stat`**, whose governed duration is a fixed 12s. Kinetic cannot use a single fixed-duration output-parity overlay; see §5/§14 for the mechanism. |

## 4. Scene/layer structure — fixed 5-slot design (recommendation, PK decision needed)

Creatomate templates are saved, fixed-composition objects — there is no API to add or remove
elements per render. The legacy code's variable scene count (3-5, AI-decided) cannot be represented
as a template with a variable element count. **Recommendation:** build the template with **5 fixed
top-level scene slots** — `Hook`, `Point1`, `Point2`, `Point3`, `Cta` — covering the AI contract's
maximum (1 hook + 3 points + 1 cta = 5). A render using fewer points (the AI contract allows 1-3)
**collapses the unused `PointN` slot(s)** rather than omitting them from the template. This mirrors
`video_short_stat`'s own fixed-slot precedent (4 text elements, always present, some ultimately
carrying governed-empty content) rather than inventing a new pattern.

**Collapse mechanism for an unused `PointN` slot (defense-in-depth, three independent guards —
mirrors the row-17 retirement's own "deliberately redundant" idiom,
`creatomate-registry-integrity-graduation-contract-v1.md` §3.5):**
1. `duration` set to a near-zero value (`0.01`, not literal `0` — Creatomate may treat a falsy `0`
   as "unset" and default to full-composition duration, which would leak the slot into the render;
   **this exact behaviour must be probe-confirmed, §14**),
2. all text sub-elements' `.text` set to an empty string,
3. position moved off-canvas (`y: "3000px"`) as a belt-and-braces guard independent of (1) and (2).

No single guard is trusted alone, exactly because (1)'s Creatomate-side behaviour is not yet proven
in this repo.

**This is a recommendation, not a decision** — §15 Q1 names the alternative (a 3-point-fixed
template, discarding the 3-point AI-contract upper bound) as a simpler but lossier option.

## 5. Timing mechanism — flat per-element modifications (not nested groups)

The legacy code computes each scene's absolute `{start, duration}` in JavaScript
(`video-worker/index.ts:1064`, the `timings` array) and bakes those values directly into each
`elements[]` entry. The governed template-mode equivalent must reproduce this with **modification
keys**, since Creatomate exposes render-time overrides as a flat `ElementName.property` dict, not a
JS closure.

**Recommendation: flat per-element `.time`/`.duration` modification keys**, computed by the worker
exactly as the legacy `timings` array already computes them today, applied individually to every
one of the ~24 named elements (§7). This is the **already-proven mechanism** — identical in shape to
`B1_VIDEO_TEMPLATE_OUTPUT_PARITY`'s per-element `.duration` overrides (`b1_video_stat.ts:146-159`),
just applied to more elements.

**Explicitly rejected (for now): Creatomate composition/group nesting** (a top-level group per
scene whose own `.time`/`.duration` would cascade to children at scene-relative offsets, which would
cut the modification-key count roughly 5×). **No file in this repository demonstrates or exercises
Creatomate's nested-composition/group element type** — adopting it here would be an invented
assumption about an unproven Creatomate behaviour, which the branch-b contract discipline
(`branch-b-template-capability-contracts.md` §1: "never invent; mark TBC") forbids. If a future probe
independently confirms group-relative timing works as expected, it is a legitimate **simplification**
to propose in a v2 of this package — not a v1 assumption.

## 5a. Source-mode JSON — representative preview/build artifact

A complete, POST-ready `/v2/renders` **source-mode** body (`CREATOMATE_API =
'https://api.creatomate.com/v2/renders'`, `video-worker/index.ts:509` — the live, production
endpoint; no `template_id`, a full `elements[]` scene graph instead) for a **representative render**:
hook + 2 active points + 1 collapsed point (demonstrating the §4 collapse mechanism) + cta,
27s total. Per §3 of the charter, this is the artifact PK previews/iterates against and then
**visually recreates as named editor objects** — every element carries the exact `name` the
operator must assign in the editor, matching §6/§7's slot contract 1:1, so the transposition has
zero naming ambiguity.

Absolute `time`/`duration` values are computed exactly as the legacy `timings` array computes them
(`index.ts:1064`) — cumulative scene starts, then the same internal per-element stagger offsets
already proven in `buildKineticTextSpec` (§2), just applied as **flat, absolute values** per §5
rather than nested/relative ones.

```json
{
  "output_format": "mp4",
  "width": 1080,
  "height": 1920,
  "frame_rate": 30,
  "duration": 27,
  "elements": [
    { "name": "Background", "type": "shape", "shape": "rectangle", "fill_color": "#0A2A4A",
      "width": "1080px", "height": "1920px", "x": "0px", "y": "0px", "x_anchor": "0%", "y_anchor": "0%" },
    { "name": "BarTop", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A",
      "width": "1080px", "height": "8px", "x": "0px", "y": "140px", "x_anchor": "0%", "y_anchor": "0%" },
    { "name": "BarBottom", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A",
      "width": "1080px", "height": "8px", "x": "0px", "y": "1620px", "x_anchor": "0%", "y_anchor": "100%" },
    { "name": "Logo", "type": "image", "source": "https://x.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png",
      "width": "90px", "height": "90px", "x": "44px", "y": "160px", "x_anchor": "0%", "y_anchor": "0%", "fit": "contain" },

    { "name": "HookHeadline", "type": "text", "text": "Perth rents just hit a 10-year high",
      "font_family": "Montserrat", "font_weight": "900", "font_size": "76px", "fill_color": "#FFFFFF",
      "line_height": "130%", "width": "960px", "height": "700px", "x_alignment": "50%", "y_alignment": "50%",
      "x": "60px", "y": "560px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 0.4, "duration": 5.2, "enter": { "effect": "fade", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.35 } },
    { "name": "HookSubtitle", "type": "text", "text": "↓ Keep watching",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "26px", "fill_color": "#1C8A8A", "opacity": 0.75,
      "width": "1080px", "x_alignment": "50%", "x": "0px", "y": "1480px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 1.2, "duration": 4.4, "enter": { "effect": "fade", "duration": 0.6 }, "exit": { "effect": "fade", "duration": 0.35 } },

    { "name": "Point1Counter", "type": "text", "text": "1/2",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "28px", "fill_color": "#1C8A8A", "opacity": 0.6,
      "x": "1020px", "y": "290px", "x_anchor": "100%", "y_anchor": "50%",
      "time": 6.15, "duration": 7.6, "enter": { "effect": "fade", "duration": 0.3 }, "exit": { "effect": "fade", "duration": 0.3 } },
    { "name": "Point1Bar", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A", "opacity": 0.7,
      "width": "5px", "height": "340px", "x": "60px", "y": "480px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 6.3, "duration": 7.4, "enter": { "effect": "slide", "direction": "270", "duration": 0.4 }, "exit": { "effect": "fade", "duration": 0.3 } },
    { "name": "Point1Headline", "type": "text", "text": "Median asking rent: $650/week",
      "font_family": "Montserrat", "font_weight": "700", "font_size": "64px", "fill_color": "#FFFFFF", "line_height": "130%",
      "width": "880px", "x": "100px", "y": "480px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 6.5, "duration": 7.2, "enter": { "effect": "fade", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.35 } },
    { "name": "Point1Divider", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A", "opacity": 0.4,
      "width": "880px", "height": "2px", "x": "100px", "y": "870px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 6.75, "duration": 7.0, "enter": { "effect": "wipe", "direction": "270", "duration": 0.4 }, "exit": { "effect": "fade", "duration": 0.3 } },
    { "name": "Point1Body", "type": "text", "text": "Up 9% since this time last year",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "40px", "fill_color": "#CBD5E1", "line_height": "145%",
      "width": "880px", "x": "100px", "y": "895px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 6.9, "duration": 7.0, "enter": { "effect": "fade", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.35 } },

    { "name": "Point2Counter", "type": "text", "text": "2/2",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "28px", "fill_color": "#1C8A8A", "opacity": 0.6,
      "x": "1020px", "y": "290px", "x_anchor": "100%", "y_anchor": "50%",
      "time": 14.15, "duration": 7.6, "enter": { "effect": "fade", "duration": 0.3 }, "exit": { "effect": "fade", "duration": 0.3 } },
    { "name": "Point2Bar", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A", "opacity": 0.7,
      "width": "5px", "height": "340px", "x": "60px", "y": "480px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 14.3, "duration": 7.4, "enter": { "effect": "slide", "direction": "0", "duration": 0.4 }, "exit": { "effect": "fade", "duration": 0.3 } },
    { "name": "Point2Headline", "type": "text", "text": "Vacancy rate sits at just 0.8%",
      "font_family": "Montserrat", "font_weight": "700", "font_size": "64px", "fill_color": "#FFFFFF", "line_height": "130%",
      "width": "880px", "x": "100px", "y": "480px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 14.5, "duration": 7.2, "enter": { "effect": "fade", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.35 } },
    { "name": "Point2Divider", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A", "opacity": 0.4,
      "width": "880px", "height": "2px", "x": "100px", "y": "870px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 14.75, "duration": 7.0, "enter": { "effect": "wipe", "direction": "0", "duration": 0.4 }, "exit": { "effect": "fade", "duration": 0.3 } },
    { "name": "Point2Body", "type": "text", "text": "Tenants are competing for every listing",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "40px", "fill_color": "#CBD5E1", "line_height": "145%",
      "width": "880px", "x": "100px", "y": "895px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 14.9, "duration": 7.0, "enter": { "effect": "fade", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.35 } },

    { "name": "Point3Counter", "type": "text", "text": "",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "28px", "fill_color": "#1C8A8A", "opacity": 0.6,
      "x": "1020px", "y": "3000px", "x_anchor": "100%", "y_anchor": "50%", "time": 0, "duration": 0.01 },
    { "name": "Point3Bar", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A", "opacity": 0.7,
      "width": "5px", "height": "340px", "x": "60px", "y": "3000px", "x_anchor": "0%", "y_anchor": "0%", "time": 0, "duration": 0.01 },
    { "name": "Point3Headline", "type": "text", "text": "",
      "font_family": "Montserrat", "font_weight": "700", "font_size": "64px", "fill_color": "#FFFFFF",
      "width": "880px", "x": "100px", "y": "3000px", "x_anchor": "0%", "y_anchor": "0%", "time": 0, "duration": 0.01 },
    { "name": "Point3Divider", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A", "opacity": 0.4,
      "width": "880px", "height": "2px", "x": "100px", "y": "3000px", "x_anchor": "0%", "y_anchor": "0%", "time": 0, "duration": 0.01 },
    { "name": "Point3Body", "type": "text", "text": "",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "40px", "fill_color": "#CBD5E1",
      "width": "880px", "x": "100px", "y": "3000px", "x_anchor": "0%", "y_anchor": "0%", "time": 0, "duration": 0.01 },

    { "name": "CtaWatermark", "type": "text", "text": "?",
      "font_family": "Montserrat", "font_weight": "900", "font_size": "500px", "fill_color": "#1C8A8A", "opacity": 0.07,
      "width": "1080px", "x_alignment": "50%", "x": "0px", "y": "400px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 22, "duration": 5 },
    { "name": "CtaHeadline", "type": "text", "text": "Thinking of listing this spring?",
      "font_family": "Montserrat", "font_weight": "700", "font_size": "62px", "fill_color": "#FFFFFF", "line_height": "130%",
      "width": "880px", "height": "600px", "x_alignment": "50%", "y_alignment": "50%",
      "x": "100px", "y": "650px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 22.3, "duration": 4.4, "enter": { "effect": "fade", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.35 } },
    { "name": "CtaFooter", "type": "text", "text": "Follow Property Pulse for more",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "30px", "fill_color": "#1C8A8A", "opacity": 0.8,
      "width": "1080px", "x_alignment": "50%", "x": "0px", "y": "1450px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 22.9, "duration": 3.9, "enter": { "effect": "fade", "duration": 0.5 } },

    { "name": "VoiceAudio", "type": "audio", "source": "", "time": 0, "duration": 27, "volume": "100%" },
    { "name": "MusicBed", "type": "audio", "source": "", "time": 0, "duration": 27, "volume": "15%" }
  ]
}
```

**Reading this as the template-mode contract:** once the operator saves this as a template, the
same 26 names become the `modifications` dict keys for every future governed render — e.g.
`{"HookHeadline.text": "...", "HookHeadline.time": 0.4, "HookHeadline.duration": 5.2, "Point3Headline.duration": 0.01, "Logo.source": "<resolved-url>", "Background.fill_color": "<client primary>", ...}` —
computed fresh per render from the AI-authored scene array, exactly mirroring how
`buildGovernedVideoStatPlan` turns validated fields into a flat `modifications` object today
(`b1_video_stat.ts:372+`).

## 5b. Modification-key form — declared, not guessed

Creatomate's API supports **two different key shapes** for template-mode modifications, and
guessing between them is a named house failure mode: `cc-0049-invegent-quote-card-winner-mapping-
brief.md:89` — "the key *shape* conflicts with the only registered mapping... Both forms exist in
Creatomate's API. Guessing which form the quote card requires is exactly the 'never guess a layout'
failure the guard prevents." That lane's resolution (`:181`) is the standing precedent this package
adopts: **`<element_name>.text` (suffixed), confirmed against live, production-proven behaviour** —
not the bare, unsuffixed form. Every modification key in this package (§5a, §6) uses the suffixed
form (`HookHeadline.text`, `Logo.source`, `Background.fill_color`, etc.), consistent with
`b1_video_stat.ts`'s own governed keys (`StatValue.text`, `Logo.source`, …) and the cc-0049
resolution. **This is a declared assumption inherited from a resolved precedent, not a fresh guess**
— still worth a one-render confirmation at the first probe (§14), since cc-0049's resolution was for
a different template family (image quote cards, not video).

## 6. Element names and slot contract

Mirrors the `dynamic_elements` shape from `branch-b-template-capability-contracts.md` §1
(`name` / `type` / `modification_key` / `required` / `empty_ok`), extended with each element's
persistent-vs-scene-bound behaviour.

### 6.1 Persistent chrome (no `.time`/`.duration` modification — spans the full composition)

| name | type | modification_key | required | empty_ok | notes |
|---|---|---|---|---|---|
| `Background` | shape (rectangle, full-bleed 1080×1920) | `Background.fill_color` | true | false | Solid **brand primary colour**, not an image asset — `client_brand_profile.brand_colour_primary` (fallback `#0A2A4A`, `video-worker/index.ts:951`), NOT `resolve_brand_assets` (this is a colour column, not an asset row). |
| `BarTop` | shape (rectangle, 1080×8) | `BarTop.fill_color` | true | false | Brand **secondary** colour (`brand_colour_secondary`, fallback `#1C8A8A`). |
| `BarBottom` | shape (rectangle, 1080×8) | `BarBottom.fill_color` | true | false | Same colour source as `BarTop`. |
| `Logo` | image | `Logo.source` | true | **false** | Governed via `resolve_brand_assets`, fail-loud. **Deliberately drops the legacy client-name-text fallback** (`index.ts:1079-1081`) — governed paths in this repo never substitute ungoverned content for a missing asset (`b1_video_stat.ts`'s governed branch has no such fallback either). A client with no governed logo asset fails the render, not degrades it. |

### 6.2 `Hook` slot (always active)

| name | type | modification_key | required | empty_ok |
|---|---|---|---|---|
| `HookHeadline` | text | `HookHeadline.text` (+ `.time`/`.duration`) | true | false |
| `HookSubtitle` | text | `HookSubtitle.text` (+ `.time`/`.duration`) | false | true — static decorative string, collapsed entirely (duration≈0) when a future voice/caption variant is active (§11) |

### 6.3 `Point1` / `Point2` / `Point3` slots (1-3 active; unused slots collapsed per §4)

Repeat per index N ∈ {1,2,3}; entry direction is **baked per slot**, not a modification
(`Point1`→270°, `Point2`→0°, `Point3`→180°, mirroring `slideDirForPoint`'s existing rotation
— now index-bound at build time instead of computed at render time, a simplification the
fixed-slot design enables).

| name | type | modification_key | required (when slot active) | empty_ok |
|---|---|---|---|---|
| `PointNCounter` | text | `PointNCounter.text` (+ `.time`/`.duration`) | true | false — governed content, worker-computed (e.g. `"1/2"`), see §6.4 |
| `PointNBar` | shape (accent bar, 5×340) | `PointNBar.fill_color`? no — colour fixed to secondary at build time; `.time`/`.duration` only | true | n/a (decorative) |
| `PointNHeadline` | text | `PointNHeadline.text` (+ `.time`/`.duration`) | true | false |
| `PointNDivider` | shape (rule, 880×2) | `.time`/`.duration` only | false | n/a — present only when `PointNBody` is non-empty |
| `PointNBody` | text | `PointNBody.text` (+ `.time`/`.duration`) | false | true — the AI contract allows a point scene with no body (single supporting line is optional per-scene, `ai-worker/index.ts:728`) |

### 6.4 `Cta` slot (always active)

| name | type | modification_key | required | empty_ok |
|---|---|---|---|---|
| `CtaWatermark` | text (static `"?"` glyph) | `.time`/`.duration` only | true | n/a — decorative, not AI content |
| `CtaHeadline` | text | `CtaHeadline.text` (+ `.time`/`.duration`) | true | false |
| `CtaFooter` | text | `CtaFooter.text` (+ `.time`/`.duration`) | false | true — governed content, worker-computed (`"Follow {ClientName} for more"`, mirroring `index.ts:1098`'s existing string; collapsed when a future caption variant is active) |

**`PointNCounter.text` is governed, worker-computed content, not template-fixed text** — the worker
knows the true active-point count from the AI-authored scene array (exactly as the legacy code
computes `${pointNum}/${pointSceneCount}` today) and writes e.g. `"1/2"` / `"2/2"` into the two
active counters, leaving `Point3Counter` collapsed. This avoids baking a wrong or misleading count
into the saved template.

### 6.5 Audio (present in the template, inactive for the v1 mission — see §11)

| name | type | modification_key | required (v1) | empty_ok |
|---|---|---|---|---|
| `VoiceAudio` | audio | `VoiceAudio.source` | **false** | true — `source:""` renders silent (proven Creatomate behaviour, `creatomate-api-gotchas` house note) |
| `MusicBed` | audio | `MusicBed.source` | false | true — silent-by-design when unbound, matching the stat template's N1 convention |

## 7. Full element inventory (count)

4 persistent + 2 (Hook) + 3×5 (Point1-3) + 3 (Cta) + 2 (audio) = **26 named elements**, of which
**19 carry per-render `.time`/`.duration` modifications** (everything except the 4 persistent-chrome
elements and the 2 audio elements, which span the full composition by convention).

## 8. Animation settings

Directly transposed from the legacy builder, unchanged:

| Element(s) | Enter | Exit |
|---|---|---|
| `HookHeadline` | fade, 0.5s | fade, 0.35s |
| `HookSubtitle` | fade, 0.6s (starts 1.2s into scene) | fade, 0.35s |
| `PointNCounter` | fade, 0.3s | fade, 0.3s |
| `PointNBar` | slide, direction per-slot (270/0/180), 0.4s | fade, 0.3s |
| `PointNHeadline` | fade, 0.5s | fade, 0.35s |
| `PointNDivider` | wipe, direction per-slot, 0.4s | fade, 0.3s |
| `PointNBody` | fade, 0.5s | fade, 0.35s |
| `CtaWatermark` | none (static, opacity 0.07 throughout) | — |
| `CtaHeadline` | fade, 0.5s | fade, 0.35s |
| `CtaFooter` | fade, 0.5s | — (persists to scene end) |

Internal stagger offsets within each scene (e.g. `PointNHeadline` starts 0.5s after scene start,
`PointNBody` at 0.9s) are preserved exactly per `video-worker/index.ts:1104-1113` and become part of
each element's absolute `.time` value once the worker computes cumulative scene start times.

## 9. Text limits and duration bounds

Source: the live AI-generation contract (`ai-worker/index.ts:728`), **widened** by the stated margin
to give the render-time hard-gate slack the prompt itself doesn't guarantee (mirrors the existing
`clampField` safety-net idiom already used for `video_short_stat`, `ai-worker/index.ts:767-770` —
**note, §16, this exact clamp does not yet exist for kinetic scenes and is a named gap**).

| Field | AI-prompt limit | Recommended hard gate | Container | Overflow risk |
|---|---|---|---|---|
| `Hook.headline` | ≤60 chars | ≤60 chars (no slack — box is fixed at 960×700, `overflow_risk: high` per the B0 lesson) | `HookHeadline` 960×700 | high — `max_lines: to_be_calibrated`, recommend a probe sweep at 40/50/60 chars |
| `Point.headline` | ≤55 chars | ≤55 chars | `PointNHeadline` 880px wide, no fixed height in legacy | medium — `max_lines: to_be_calibrated` |
| `Point.body` | ≤100 chars | ≤100 chars | `PointNBody` 880px wide | low — legacy's own font-shrink threshold (150 chars) is never reached at this tighter gate |
| `Cta.headline` | ≤65 chars | ≤65 chars | `CtaHeadline` 880×600 | medium |
| `Hook.duration_s` | 5-7 | **4-8** (widened) | — | n/a |
| `Point.duration_s` (×1-3) | 6-9 | **5-10** (widened) | — | n/a |
| `Cta.duration_s` | 4-6 | **3-7** (widened) | — | n/a |
| Scene count | 3-5 (1 hook + 1-3 point + 1 cta) | unchanged | — | fixed-slot design assumes exactly this range (§4) |
| Total duration | 25-40s | **20-45s** (widened bound; template `duration` computed as the actual Σ, not clamped to a round number) | — | flagged in §14 — top-level `duration` override is `to_be_confirmed` |

**No truncation, no AI rewrite** — mirrors `assertStatFieldsWithinGate`'s policy (`hard_gate_throw`,
`b1_video_stat.ts:196-199`). A field over its hard gate should fail the draft loud, not silently clip.

## 9a. Render-cost and timeout-risk declaration

Creatomate renders operate under a **hard 2-minute ceiling**
(`creatomate-global-ultimate-programme-brief-v1.md` §2.4 item 8, permanent constraint), and the
sibling governed format already shows this is not a theoretical risk: `video_short_stat`'s
provider-template default carries a **62.5% PP-attributable timeout rate** on its own attributable
evidence (row 19, `creatomate-registry-integrity-graduation-contract-v1.md` §2.4) — real, sustained,
and the exact reason the programme brief §8 requires "D4's kinetic graduation must record
render-reliability evidence as part of rung proof," not just a one-time visual check.

This design is kept **render-cheap by construction**, not by hope:
- **No B-roll/video background** — solid colour fill only (§10); video decode/encode is the
  costliest Creatomate operation, and this design has none.
- **One image asset** (`Logo`, 90×90) — everything else is text or flat-colour shapes.
- **Cheap transition types only** — `fade`/`slide`/`wipe`, the same set already proven at scale in
  the live legacy path and in the governed stat template; no 3D, no particle, no video-composite
  effects.
- **Silent by default** (§11) — no audio decode/mix cost for the v1 mission.
- **Longer duration than stat is the one real cost driver**: 20-45s vs. stat's fixed 12s (§3) means
  more frames to render even with a cheap element set. **This is the specific risk to watch at the
  probe-render stage** (§14) — record wall-clock render time per probe alongside the visual
  verdict, and if it trends toward the 2-minute ceiling, that is grounds to tighten the duration
  bound (§9) before graduation, not after a production timeout pattern repeats row 19's.

## 10. Required assets

- **Logo** — governed, `resolve_brand_assets`, required, fail-loud (§6.1). No fallback.
- **Background / bars** — brand primary/secondary **colours**, read from `client_brand_profile`
  columns, not `resolve_brand_assets` (they are not asset rows). No image or B-roll background is
  proposed for kinetic — the format's identity is solid-colour kinetic typography, distinct from
  `video_short_stat`'s B-roll-backed variant (`broll-production-activation-live` memory) and
  distinct from `video_short_stat`'s optional generic image-Background variant
  (`b1_video_stat.ts:186-188`). This preserves D4's "do not collapse to stat-only" instruction at the
  visual-identity level, not just the registry level.

## 11. Audio — explicitly deferred design decision, not a default

The legacy kinetic path treats `audioUrl`/`musicUrl` as fully optional, and burns in captions **only**
for `video_short_kinetic_voice` (`index.ts:1061`, `withCaptions`). The governed `video_short_stat`
path, by contrast, treats voiceover as **always required** regardless of the `_voice` suffix
(`b1_video_stat.ts` — "VO REQUIRED" — a `cc-0032` design decision specific to stat). These are two
different existing conventions; **this package does not silently pick one for kinetic.**

**v1 mission scope: silent kinetic only** (`video_short_kinetic`, no VO/music, matching the WS-4
mission text's "voice variants as PK elects" — implying they are an election, not the default).
`VoiceAudio`/`MusicBed` elements exist in the template (§6.5) but stay unbound (`source:""` →
silent, per house convention) for the v1 registration.

**If PK later elects a voice variant:** two options, named but not decided here —
(a) mirror stat's `composeGovernedVideoNarration` pattern — a **deterministic** narration string
built from the same structured scene fields already gated by §9 (no separate free-text
`narration_text` field, no duration-fit risk against the visual timing), or
(b) accept the AI's free-form `narration_text` (as the legacy path does today) and accept an
unmeasured VO-vs-visual duration-fit risk. **Recommendation: (a)**, for the same reason stat adopted
it — deterministic composition from already-gated fields cannot desync from the visual timing the
way free narration text can. **This is §15 Q3, a named PK decision, not assumed.**

## 12. Platform / aspect suitability

**YouTube Shorts only, 9:16 (1080×1920).** Per the ratified Target Capability Matrix
(programme brief §1.2), `video_short_kinetic` is 🎯 committed **for PP YT only** — ⏸ deferred
(D3) for CFW/Invegent YT, and not in-matrix at all for FB/IG/LI (video formats are YT-only cells
across the whole matrix). This package proposes **no** multi-aspect variant — a 1:1 or 4:5 kinetic
cut is out of scope for this mission and would be its own future package if a platform cell is ever
committed for it.

## 13. Expected visual description (for PK's sanity check before opening the editor)

A vertical, full-bleed brand-colour canvas. Two thin brand-secondary-colour bars sit just inside the
top and bottom edges (clear of YouTube's Shorts UI chrome), with a small square logo tucked
top-left, just below the top bar. The **hook** scene opens with a large, bold white headline
centred in the upper-middle of the frame, with a faint "keep watching" cue beneath it that fades in
a beat later. Each **point** scene that follows uses the same rhythm: a small `N/Total` counter
ticks in top-right, a short accent bar slides in from a rotating direction (right, then centre, then
left, so consecutive points don't feel identical), a bold headline appears, and — when the AI gave
this point a supporting line — a thin rule wipes in beneath it followed by a smaller supporting
sentence. The **CTA** scene closes the video with a huge, barely-visible "?" watermark filling the
background, a bold engagement-question headline over it, and a small "Follow {Client} for more"
line beneath. Nothing else moves; the whole video reads as one continuous typographic voice, not a
slideshow — text fades and slides, it never hard-cuts.

## 14. Validation checklist (probe-render items — required before registration)

Mapped to the relevant rung(s) of the 13-rung graduation ladder
(`creatomate-registry-integrity-graduation-contract-v1.md` §4) where applicable.

**Structural (must pass before any registry capture — rung 2/3):**
- [ ] All 26 named elements (§7) present in the operator-saved template with **exactly** these names
  (case-sensitive — `select_template`'s slot resolution and the worker's modification keys both
  depend on exact element-name matches, per the stat precedent).
- [ ] Canvas is 1080×1920; frame rate 30; output `mp4` (rung 3).

**Behavioural (Creatomate-specific, `to_be_confirmed` — must be probe-rendered, not assumed):**
- [ ] **Top-level `duration` is overridable via a bare `duration` modification key**, symmetric with
  the proven `width`/`height` override (`B1_VIDEO_TEMPLATE_OUTPUT_PARITY`) — §3/§5. If not
  overridable, the fixed-slot template needs a different duration mechanism entirely (e.g. building
  to the AI contract's maximum 45s and using the same collapse-to-near-zero technique on trailing
  unused time, which is a materially different and riskier design — escalate to PK if this fails).
- [ ] **A near-zero-duration element (`0.01`) does not render a visible frame** and Creatomate does
  not silently reinterpret it as "unset → full composition" (§4). If it does, the three-guard
  collapse mechanism (§4) still holds via guards 2+3 alone — confirm that combination independently.
- [ ] **`PointNBar`/`PointNDivider` shape elements accept `.time`/`.duration` modification overrides**
  the same way text elements do (no repo evidence yet that shape-type elements behave identically to
  text-type elements under modification keys — inferred from the legacy source-mode JSON using the
  same properties on both types, but template-mode override behaviour is a different code path).
- [ ] **`source:""` on `VoiceAudio`/`MusicBed` renders silent, not an error** (cited house convention
  from the Creatomate API gotchas note — re-confirm specifically for this template, since it has not
  been probe-rendered on this composition).

**Reliability (§9a — record every probe, not just the first):**
- [ ] Wall-clock render time recorded per probe render, trending away from the 2-minute ceiling
  (§9a) — a rising or near-ceiling trend is a STOP on graduation, not a note, per the row-19
  precedent.
- [ ] Modification-key form (§5b) confirmed on the first real probe against this template family
  specifically (video, not image) — the cc-0049 resolution was proven on a different template
  family.

**Content/text (rung 6 — visual approval; and ongoing rung 13 monitoring):**
- [ ] `HookHeadline` at 60 chars does not overrun its 960×700 box (§9 — the single highest-risk
  field, mirroring the B0 headline-overflow lesson that took 3 iterations to fix).
- [ ] `PointNHeadline`/`PointNBody` at their max char limits do not collide with the divider rule or
  overrun into the caption-safe band (y1300+), even though captions are inactive for v1 (§11) — keep
  the layout compatible with the deferred voice variant so it doesn't need a second transposition.
- [ ] `CtaHeadline` at 65 chars fits its 880×600 box alongside the faint "?" watermark without a
  contrast or legibility problem (watermark is `opacity: 0.07`, legacy-proven, but re-confirm on the
  operator's actual saved object — editor re-saves have altered geometry before, per the B0 lesson).

**Registration (rungs 4-9, ICE's job — not the specialist's — listed here only for completeness):**
- [ ] Field-contract match: every element in §6 has a corresponding
  `c.creative_provider_template_field` row (rung 2).
  `inventory_status='captured_from_manual_entry'` at capture (graduation contract §1.2 state 1).
- [ ] **`creative_provider_template.scope` must be `'generic'`, not `'client'`** — `db-rls-auditor`
  pass (2026-08-01, live `pg_get_functiondef` on `select_template`, matching migration
  `20260730140000_cc_0089_selector_policy_and_asset_gap_decoupling_v1.sql`) confirms the live
  selector admits **only** `scope='generic'` provider templates; a row registered `scope='client'`
  would be permanently `wrong_scope`-rejected with no error at insert time. Given the "PP YouTube
  kinetic" mission framing, registering with `scope='client'` is an easy, silent mistake — this
  template must be captured `scope='generic'` (matching every other currently-registered
  `generic_*` template) with PP bound only via `creative_template_client_assignment`, consistent
  with §10's brand-agnostic-reusable intent. **This is a WS-5 registration-step item, not a defect
  in this package**, named here so it isn't rediscovered.
- [ ] **`modification_key` and `empty_ok` (§6's slot-contract vocabulary) have no dedicated column**
  on `c.creative_provider_template_field` — same `db-rls-auditor` pass, live-sampled all 144 field
  rows across every registered template: `constraints` (the only schemaless jsonb column) is `NULL`
  on every one, zero existing precedent for a shape. **WS-5 must design that jsonb shape before
  capturing this template's 26 field rows** — not this package's job, but a real prerequisite gap,
  named so WS-5 doesn't assume the mapping is mechanical.
- [ ] Governed asset resolution succeeds for `Logo.source` for at least one real client/seed (rung 4).
- [ ] `select_template` actually returns this template for PP/YouTube/`video_short_kinetic` once
  registered — a live RPC call, not a status read (rung 10, the row-17 lesson: status columns can be
  "right" while an unrelated column still excludes the row).
- [ ] Rollback proof + PK visual approval + real render → real draft → publish, per rungs 6-9,
  11-12.

## 14a. Creative-graph-auditor pass (2026-08-01) — forward-looking, PASS

`creative-graph-auditor` reviewed this package against the **declarative** Creative Library v2
graph (`docs/creative-library/*.json` + `registry-schema-v2.md`) — a separate, parallel
description system from the DB-side TMR-3/4 registry §14's checklist targets. **Verdict: PASS** —
this package proposes zero writes to `docs/creative-library/*.json` (confirmed by grep), so nothing
was there to fail. Two advisory, non-blocking findings for whoever eventually attempts a Creative
Library capture of this template (not a defect in this design):

1. **No structured per-element vocabulary exists in `registry-schema-v2.md` today.** Neither the
   §3 variant object (flat `required_fields`/`expected_assets` arrays) nor the §7 capability-contract
   `fields` classes have a home for §6's `{name, type, modification_key, required, empty_ok}` shape
   or §7's per-element `.time`/`.duration` timing — the vocabulary this package borrows traces to
   `branch-b-template-capability-contracts.md` §1, which was **never folded into the schema**
   (`docs/creative-library/template-contracts/` does not exist on disk). A future JSON capture needs
   a schema amendment first, as its own PK-gated lane.
2. **The same `client_slug`-mandatory-everywhere blocker `db-rls-auditor` found on the DB side
   (§14's `scope='generic'` item) is confirmed still live on the Creative Library JSON side too** —
   `client_slug` is mandatory at every level of `property-pulse.json`, with no brand-agnostic/generic
   object type. This is **one architectural limitation surfacing in both parallel registries**, not
   two unrelated gaps — worth carrying as a single named item if either registry's fix is ever
   scoped.

Confirmed clean: the runtime-import guard holds (nothing in this package implies wiring the
declarative JSON into a production worker — registration routes exclusively through the DB TMR
registry, matching `db-rls-auditor`'s reading); no vendored-registry drift; the Creative Library
graph has held video variants before (`stat-reveal-9x16-video-v1/v2`, `property-pulse.json:249-292`)
so a video template per se is not unprecedented, only this template's element count/timing
structure is.

## 15. Open questions — named PK decisions, not assumed

- **Q1 — fixed-slot count.** Build to the AI contract's max (3 point slots, this package's default,
  §4) or a simpler fixed 1 or 2 point slots (discarding some of the AI contract's range, fewer
  elements to register/maintain, less flexible content)? Recommend the 3-slot default; PK may elect
  otherwise before the operator sitting.
- **Q2 — collapse mechanism trust.** Once §14's structural probes run, does the 3-guard collapse
  (near-zero duration + empty text + off-canvas position) prove sufficient, or does an unused slot
  leak a frame? This gates whether the fixed-slot design (§4) is viable at all, or whether kinetic
  needs a different mechanism (e.g. separate 3-scene / 4-scene / 5-scene template variants — more
  registry rows, no collapse-risk).
- **Q3 — voice variant approach.** Deterministic narration composition (mirroring stat, recommended,
  §11) vs. free AI `narration_text` (matches the legacy UX but carries an unmeasured duration-fit
  risk) — only relevant once PK elects to build `video_short_kinetic_voice`.
- **Q4 — top-level `duration` override.** If §14's probe shows this is NOT overridable via a bare
  key, this package's core timing mechanism (§5) needs a redesign before any registration proceeds —
  flagged as the single highest-leverage probe to run first.

## 16. Named gap surfaced by this design pass (not this package's job to fix)

`ai-worker`'s kinetic generation path (`index.ts:727-745`) has **no per-field character clamp**
before the parsed script is persisted — unlike `video_short_stat`'s `clampField` safety net
(`index.ts:767-770`, added specifically because "an over-long model field \[was] observed
\[cta_text=133]"). A kinetic scene whose AI-authored headline/body exceeds this package's §9 hard
gate would currently reach the (future) worker-side gate and fail the draft loud rather than
silently overflow — which is the correct fail-loud behaviour, but a clamp at generation time (like
stat's) would avoid the wasted draft entirely. Named here as a follow-on candidate for whoever
implements the render-side hard gate; not fixed in this design-only package.

---

## Package summary (per the charter's §2 step-1 deliverable list)

| Deliverable | Location in this doc |
|---|---|
| Recommended layout + purpose | §1 |
| Creatomate source-mode JSON / structured build spec | §5a (complete, POST-ready `/v2/renders` body) + §6-§8 (the named-element/modification-key contract the source-mode JSON is built from, and that production template-mode rendering will target after transposition) |
| Scene/layer structure | §4 |
| Element names | §6, §7 |
| Animation settings | §8 |
| Slot contract | §6 |
| Text limits | §9 |
| Required assets | §10 |
| Platform/aspect suitability | §12 |
| Expected visual description | §13 |
| Validation checklist | §14 |

**Verdict: `PACKAGE_READY`**, with four named open questions (§15) that gate the operator-transposition
sitting, and one required first probe (§14/§15 Q4 — top-level `duration` overridability) that should
run before PK invests editor time in the fixed-slot build.
