# WS-4 — PP YouTube Kinetic — FINAL Operator Transposition Run-Sheet (v1)

> **⚠ SUPERSEDED (2026-08-01) — DO NOT USE.** This run-sheet's 1-2 point-slot conclusion was
> reached without knowing a 3-point/26-element template was already built, captured, calibrated,
> and PK-visually-approved in a parallel session (WS-5). PK ruled directly to keep the 3-slot
> design and adopt off-timeline collapse instead (`ff5cacb` on `main`,
> `docs/briefs/results/ws5-constraints-shape-design-lane-result-v1.md` "POST-CLOSE ADDENDUM";
> retraction recorded at `docs/briefs/ws4-pp-yt-kinetic-operator-transposition-package-v1.md` §5e).
> **Use the real operator artifacts instead:** `docs/briefs/ws4-kinetic-transposition-operator-guide-v1.md`,
> `docs/briefs/artifacts/ws4-kinetic-declared-contract-v2-calibrated.json`, and
> `docs/briefs/artifacts/ws4-kinetic-template-source-corrected-v2.json`. This file is kept only as
> a historical record of this session's (incorrect) reasoning — see §12's open questions, which
> are also moot under the 3-slot design.

**Status:** PACKAGE_READY (creatomate-specialist, 2026-08-01). Design package only — no template
created/edited in Creatomate, no registry row written, nothing registered, proven, or graduated.
For PK to transpose into a saved Creatomate template in the editor.

**Supersedes:** the 5-slot / up-to-3-point design in
`docs/briefs/ws4-pp-yt-kinetic-operator-transposition-package-v1.md` (v1 draft, §4/§6). This
run-sheet is the design finalised **after** today's two probe results (§5d of that file):
Q4 PASS (bare top-level `duration` override confirmed) and **Q2 FAIL** (near-zero-duration collapse
guard confirmed unreliable), which mechanically resolved Q1 down to a **fixed 1-2 point-slot**
template.

---

## 1. Mission

- **Format key:** `video_short_kinetic`
- **Client:** Property Pulse (PP)
- **Purpose:** Governed YouTube Shorts kinetic-typography format — hook → 1-2 points → CTA —
  PP's multi-point narrative counterpart to `video_short_stat`'s single-stat reveal.
- **Executes:** D4 of the ratified Target Capability Matrix
  (`docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §1.2) — "graduate PP YouTube
  kinetic; do NOT collapse PP to stat-only."

## 2. Layout and purpose

A 3-4-scene-minimum kinetic-typography short for YouTube Shorts — hook → 1-2 points → CTA. Solid
brand-colour canvas, persistent top/bottom accent bars, governed logo top-left, large white kinetic
typography per scene with short fades/slides, a small N/Total progress counter during point scenes,
and a large faint "?" watermark during the CTA scene.

**The only structural change from the v1 draft:** the template is now fixed at exactly **1-2 point
slots** (Point1 always present, Point2 collapsible), not the 5-slot/3-point design v1 recommended —
mechanically forced by today's Q2 FAIL: the near-zero-duration guard the 3-slot design's collapse
mechanism depended on does not hold, so the design falls back to the two guards that remain
independently reliable by construction (empty text + off-canvas position), and per PK's
pre-committed conditional decision that fallback means building the simpler fixed 1-2 point-slot
template, not a 3-point one with a shakier collapse story.

## 3. Source-mode JSON (representative render)

Hook(6s) + Point1 **ACTIVE** (8s, with body) + Point2 **COLLAPSED** (empty-text + `y:3000px`
off-canvas — **no `duration≈0.01` anywhere**, per today's Q2 FAIL) + Cta(5s) = **19s total**,
demonstrating the exact collapse mechanism a 1-point script uses.

```json
{
  "output_format": "mp4",
  "width": 1080,
  "height": 1920,
  "frame_rate": 30,
  "duration": 19,
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

    { "name": "Point2Counter", "type": "text", "text": "",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "28px", "fill_color": "#1C8A8A", "opacity": 0.6,
      "x": "1020px", "y": "3000px", "x_anchor": "100%", "y_anchor": "50%", "time": 0, "duration": 19 },
    { "name": "Point2Bar", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A", "opacity": 0.7,
      "width": "5px", "height": "340px", "x": "60px", "y": "3000px", "x_anchor": "0%", "y_anchor": "0%", "time": 0, "duration": 19 },
    { "name": "Point2Headline", "type": "text", "text": "",
      "font_family": "Montserrat", "font_weight": "700", "font_size": "64px", "fill_color": "#FFFFFF",
      "width": "880px", "x": "100px", "y": "3000px", "x_anchor": "0%", "y_anchor": "0%", "time": 0, "duration": 19 },
    { "name": "Point2Divider", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A", "opacity": 0.4,
      "width": "880px", "height": "2px", "x": "100px", "y": "3000px", "x_anchor": "0%", "y_anchor": "0%", "time": 0, "duration": 19 },
    { "name": "Point2Body", "type": "text", "text": "",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "40px", "fill_color": "#CBD5E1",
      "width": "880px", "x": "100px", "y": "3000px", "x_anchor": "0%", "y_anchor": "0%", "time": 0, "duration": 19 },

    { "name": "CtaWatermark", "type": "text", "text": "?",
      "font_family": "Montserrat", "font_weight": "900", "font_size": "500px", "fill_color": "#1C8A8A", "opacity": 0.07,
      "width": "1080px", "x_alignment": "50%", "x": "0px", "y": "400px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 14, "duration": 5 },
    { "name": "CtaHeadline", "type": "text", "text": "Thinking of listing this spring?",
      "font_family": "Montserrat", "font_weight": "700", "font_size": "62px", "fill_color": "#FFFFFF", "line_height": "130%",
      "width": "880px", "height": "600px", "x_alignment": "50%", "y_alignment": "50%",
      "x": "100px", "y": "650px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 14.3, "duration": 4.4, "enter": { "effect": "fade", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.35 } },
    { "name": "CtaFooter", "type": "text", "text": "Follow Property Pulse for more",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "30px", "fill_color": "#1C8A8A", "opacity": 0.8,
      "width": "1080px", "x_alignment": "50%", "x": "0px", "y": "1450px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 14.9, "duration": 3.9, "enter": { "effect": "fade", "duration": 0.5 } },

    { "name": "VoiceAudio", "type": "audio", "source": "", "time": 0, "duration": 19, "volume": "100%" },
    { "name": "MusicBed", "type": "audio", "source": "", "time": 0, "duration": 19, "volume": "15%" }
  ]
}
```

Once saved as a template, these 21 names become the `modifications` dict keys for template-mode
renders, e.g. `{"duration": 19, "HookHeadline.text": "...", "HookHeadline.time": 0.4,
"HookHeadline.duration": 5.2, "Point2Headline.text": "", "Logo.source": "<resolved-url>",
"Background.fill_color": "<client primary>", ...}` — the bare top-level `duration` key is now
**confirmed authoritative** (Q4 PASS, ffprobe-measured exact match), so composition length is set
with **one** modification key computed as the true Σ active-scene durations, exactly as designed.

## 4. Scene/layer structure

Fixed 4-slot composition: **Hook** (always active, 2 elements) → **Point1** (always active, 5
elements) → **Point2** (optional/collapsible, 5 elements) → **Cta** (always active, 3 elements),
plus 4 persistent chrome elements spanning the full composition and 2 dormant audio elements. This
is a structural reduction from the v1 draft's 5-slot/Point1-3 design, forced by today's Q2 FAIL: the
3-guard collapse mechanism the 3-point design depended on (near-zero duration as one of three
guards) is not sound, so only the two guards that **are** independently reliable by construction
survive — empty text (an empty string cannot render visible content) and off-canvas position
(`y:3000px` is geometrically outside the 1920px-tall canvas, not a Creatomate-behaviour assumption).

## 5. Element names and slot contract

21 named elements total (down from the v1 draft's 26 — the removed 5 belonged to the retired
Point3 slot). 4 persistent-chrome elements never carry `.time`/`.duration` (span the full
composition). Hook (2) and Cta (3) are always-active slots.

| Element | Type | Modification key | Required | Empty OK |
|---|---|---|---|---|
| Background | shape | `Background.fill_color` | yes | no |
| BarTop | shape | `BarTop.fill_color` | yes | no |
| BarBottom | shape | `BarBottom.fill_color` | yes | no |
| Logo | image | `Logo.source` | yes | no |
| HookHeadline | text | `HookHeadline.text` (+ `.time`/`.duration`) | yes | no |
| HookSubtitle | text | `HookSubtitle.text` (+ `.time`/`.duration`) | no | yes |
| Point1Counter | text | `Point1Counter.text` (+ `.time`/`.duration`) | yes | no |
| Point1Bar | shape | `.time`/`.duration` only (colour baked) | yes | no |
| Point1Headline | text | `Point1Headline.text` (+ `.time`/`.duration`) | yes | no |
| Point1Divider | shape | `.time`/`.duration` only | no | yes |
| Point1Body | text | `Point1Body.text` (+ `.time`/`.duration`) | no | yes |
| Point2Counter | text | `Point2Counter.text` (+ `.time`/`.duration`) | no | yes |
| Point2Bar | shape | `.time`/`.duration` + position (off-canvas when collapsed) | no | yes |
| Point2Headline | text | `Point2Headline.text` (+ `.time`/`.duration`) | no | yes |
| Point2Divider | shape | `.time`/`.duration` + position | no | yes |
| Point2Body | text | `Point2Body.text` (+ `.time`/`.duration`) | no | yes |
| CtaWatermark | text | `.time`/`.duration` only (static glyph) | yes | no |
| CtaHeadline | text | `CtaHeadline.text` (+ `.time`/`.duration`) | yes | no |
| CtaFooter | text | `CtaFooter.text` (+ `.time`/`.duration`) | no | yes |
| VoiceAudio | audio | `VoiceAudio.source` | no | yes |
| MusicBed | audio | `MusicBed.source` | no | yes |

**Point1 is ALWAYS REQUIRED** — the AI content contract guarantees a minimum of 1 point scene.
**Point2 is CONDITIONALLY REQUIRED** — required+non-empty when the script authors a 2nd point,
collapsed (empty text on all 3 text sub-elements + `y:3000px` off-canvas on all 5 sub-elements,
including the 2 shapes, which have no `.text` property and rely on off-canvas alone) when the
script authors only 1 point.

**No element anywhere in this template uses `duration<=0.01` or any near-zero-duration value as a
collapse mechanism** — this was tested today (Q2) and found unreliable: a `duration:0.01` marker
element was fully visible in the render's first frame under frame-accurate `ffmpeg`/`signalstats`
inspection. `PointNCounter.text` is governed, worker-computed content (e.g. `"1/2"`), never
template-fixed.

**Named gap not present in the v1 draft — surfaced by this fixed-slot resolution, not this
package's to silently resolve:** the live `ai-worker` kinetic prompt (`ai-worker/index.ts:728`)
still authors 1-3 point scenes ("Produce exactly 3-5 scenes: one hook, one to three point scenes,
one cta"), but this template's fixed capacity is 1-2 points. A script with 3 point scenes **cannot**
be rendered against this template by any collapse mechanism (collapse hides an unused slot; it
cannot represent a 3rd slot that doesn't exist). Recommended governed behaviour, consistent with the
fail-loud/no-truncation discipline this package inherits from `b1_video_stat.ts`'s
`assertStatFieldsWithinGate`: the render-time build step must **hard-gate-throw** when the
AI-authored scene array contains more than 2 point-type scenes — never silently drop the 3rd point,
never silently merge two points into one. This is flagged as Open Question 1 below, not decided
here.

## 6. Text limits

| Field | Max chars/duration | Source | Overflow risk |
|---|---|---|---|
| Hook.headline | 60 chars (no slack) | `ai-worker/index.ts:728`; box unchanged 960×700 (`video-worker/index.ts:1089`) | high |
| Point.headline (Point1/Point2) | 55 chars | `ai-worker/index.ts:728`; box unchanged 880px wide (`video-worker/index.ts:1106`) | medium |
| Point.body (Point1/Point2) | 100 chars | `ai-worker/index.ts:728`; box unchanged 880px wide (`video-worker/index.ts:1113`) | low |
| Cta.headline | 65 chars | `ai-worker/index.ts:728`; box unchanged 880×600 (`video-worker/index.ts:1095`) | medium |
| Hook.duration_s | 5-7 (prompt); 4-8 recommended hard gate (widened) | `ai-worker/index.ts:728` | low |
| Point.duration_s (each active point) | 6-9 (prompt); 5-10 recommended hard gate (widened) | `ai-worker/index.ts:728` | low |
| Cta.duration_s | 4-6 (prompt); 3-7 recommended hard gate (widened) | `ai-worker/index.ts:728` | low |
| Point scene count (this template's fixed capacity) | **1-2, NOT 1-3** — template has exactly 2 point slots (Point1 required, Point2 collapsible) | this run-sheet's mechanical resolution of today's Q2 FAIL; see §5's named gap and Open Question 1 — the AI prompt still says 1-3 and is NOT yet amended to match | **high — a 3-point script cannot be represented by this template at all** |
| Total duration_s | `to_be_confirmed` — recompute of the v1 20-45s bound for the now-fixed 1-2 point template: min ~12s (4+5+3, 1 point at prompt minima) to max ~35s (8+10+10+7, 2 points at widened maxima); the live prompt's stated 25-40s total assumes up to 3 points and has NOT been re-derived for a 2-point cap | arithmetic on `ai-worker/index.ts:728`'s own per-field bounds; marked `to_be_confirmed` because it depends on the still-open prompt-amendment decision (Open Question 1) | medium |

## 7. Required assets

**Logo** — governed via `resolve_brand_assets`, required, fail-loud, no fallback (matches
`b1_video_stat.ts`'s governed branch, which has no client-name-text fallback unlike the legacy path
at `video-worker/index.ts:1079-1081`). **Background/BarTop/BarBottom** — brand primary/secondary
**colours** read from `client_brand_profile.brand_colour_primary`/`brand_colour_secondary` columns
(`video-worker/index.ts:946-952`), not `resolve_brand_assets` (these are not asset rows). No image
or B-roll background is proposed — kinetic's visual identity stays solid-colour typography, distinct
from `video_short_stat`'s B-roll-backed and generic-image-Background variants, preserving D4's "do
not collapse to stat-only" instruction at the visual-identity level.

## 8. Platform / aspect suitability

YouTube Shorts only, 9:16 (1080×1920). Per the ratified Target Capability Matrix (programme brief
§1.2), `video_short_kinetic` is committed for PP YT only — deferred (D3) for CFW/Invegent YT, not
in-matrix for FB/IG/LI (all video-format cells in the matrix are YT-only). No multi-aspect (1:1/4:5)
variant proposed.

## 9. Expected visual description

A vertical, full-bleed brand-colour canvas with two thin brand-secondary bars just inside the
top/bottom edges (clear of Shorts UI chrome) and a small square logo tucked top-left below the top
bar. The **HOOK** scene opens with a large bold white headline centred upper-middle, a faint "Keep
watching" cue fading in a beat later. The single mandatory **POINT** scene (Point1) follows the same
rhythm: a small "1/2" or "1/1" counter top-right, an accent bar sliding in from the right (270°), a
bold headline, and — when the script gave it a supporting line — a thin rule wiping in beneath a
smaller supporting sentence. If a second point exists, Point2 repeats the rhythm with its counter
reading "2/2" and its accent bar sliding in from the left (0°) for visual variety; if not, nothing
from Point2 is ever visible — no partial flash, no ghost frame, no near-zero blip, because the
collapse relies on geometric off-canvas placement and empty text, not a timing trick. The **CTA**
scene closes with a huge, barely-visible "?" watermark, a bold engagement-question headline over it,
and a small "Follow Property Pulse for more" line beneath.

## 10. Validation checklist

| Item | Rung ref | Status |
|---|---|---|
| All 21 named elements (not 26) present in the operator-saved template with exactly these names, case-sensitive | 2/3 | required before registration |
| Canvas 1080×1920, frame rate 30, output mp4 | 3 | required before registration |
| Top-level `duration` override — **already confirmed** (Q4 PASS); confirm only that the operator's saved template preserves this behaviour on the first real probe render | 4 | required before registration |
| Collapsed Point2 confirmed invisible on the **operator's saved template**, frame-accurately (same ffmpeg/signalstats method as today's Q2 probe) — do not assume the source-mode result transfers unchanged to template mode | 4 | required before registration |
| No `duration<=0.01` anywhere in the operator's saved template — hard NO per today's Q2 FAIL; catch as a build defect if a copy-paste reintroduces one | 2/3 | required before registration |
| Modification-key form (`<element_name>.property`) confirmed on this template family — today's Q4 probe used it successfully on a video template, supportive but not a full `.text`-override visual confirmation | 4 | required before registration |
| Render-time hard-gate-throw fires (never silently drops/merges) when an AI-authored scene array has >2 point scenes — new required build item, see Open Question 1 | n/a (new prerequisite) | required before registration |
| PointNBar/PointNDivider (shape elements) accept `.time`/`.duration` modification overrides the same way text elements do — no direct probe evidence yet, inferred only | 4 | required before graduation |
| `source:""` on VoiceAudio/MusicBed renders silent, not an error, re-confirmed on this composition | 4 | required before graduation |
| Wall-clock render time recorded per probe, trending away from the 2-minute ceiling (row-19 precedent: 62.5% PP-attributable timeout rate on the sibling stat format) | 6-9 | required before graduation |
| HookHeadline at 60 chars does not overrun its 960×700 box | 6 | required before graduation |
| PointNHeadline/PointNBody at max char limits do not collide with the divider rule or overrun into the caption-safe band (y1300+) | 6 | required before graduation |
| CtaHeadline at 65 chars fits its 880×600 box alongside the watermark on the operator's actual saved object | 6 | required before graduation |
| `creative_provider_template.scope` registered `'generic'`, not `'client'` — a `'client'`-scoped row is a silent, permanent `wrong_scope` rejection at `select_template` time | 2 | required before registration |
| WS-5's constraints jsonb shape has no existing precedent for this template's conditional-required/scene-slot-grouping needs (144 live field rows all `constraints=NULL` today) — WS-5 prerequisite, not fixed by this package | 2 | required before registration |

## 11. Render cost declaration

**Cheap by construction:** no B-roll/video background (solid colour fill only); one image asset
(Logo, 90×90); cheap transition types only (fade/slide/wipe, already proven at scale); silent by
default; **fewer elements and a shorter typical duration than the v1 draft** — 21 elements (down
from 26) and a realistic ~12-35s range (down from the v1 draft's nominal 20-45s, which assumed a
3rd point slot that no longer exists).

**Highest cost driver:** composition duration remains the primary driver relative to
`video_short_stat`'s fixed 12s — even narrowed to ~12-35s, a 35s render still has 3× the stat
format's frame count, and the sibling governed format's own row-19 precedent (62.5% PP-attributable
timeout rate) means this is not a hypothetical risk to wave off.

**Watch item for probe:** record wall-clock render time on every probe, watching whether the
shorter, lower-element-count design in fact renders measurably faster — if the trend still
approaches the 2-minute ceiling, that is grounds to tighten the duration bound further before
graduation.

## 12. Open questions — named PK decisions, not assumed

1. **AI-prompt / template-capacity mismatch.** The live `ai-worker` kinetic prompt authors 1-3
   point scenes, but this template's fixed capacity — forced by today's Q2 FAIL — is exactly 1-2.
   Should the prompt be amended (capped to 1-2 points) as a companion change **before** this
   template goes into rotation, or should the render path accept and hard-gate-throw on the
   resulting fraction of 3-point scripts until the prompt is amended separately? Neither silent
   option is acceptable (skip-the-gate silently mis-renders; fail-loud-until-fixed blocks a real
   fraction of drafts) — PK needs to choose the order of operations and who owns the `ai-worker`
   edit (outside this package's/agent's write scope).
2. **Total-duration bound recompute.** The bound has shifted from the v1 draft's nominal 20-45s to
   an unverified ~12-35s recompute for the now-fixed 1-2 point template (§6). Should the registered
   hard gate use this recompute now, or should PK/WS-5 independently re-derive it once (if) the
   prompt amendment above lands?

## 13. Evidence gaps (named, not silently assumed)

- **Template-mode parity:** Q4/Q2 were confirmed only via a raw source-mode POST, not against a
  saved, editor-created template object — template-mode behaviour is a different Creatomate code
  path per the specialist charter's own standing caution; validation checklist item 3/4 requires a
  first-probe re-confirmation on the operator's actual object.
- **Shape-element timing overrides:** no probe in this repo or today's session has tested a
  modification-key `.time`/`.duration` override on a shape-type element specifically; inferred only
  from source-mode JSON using the same property names on both types.
- **Total-duration bound:** the ~12-35s figure is an arithmetic recompute of the AI prompt's own
  per-field bounds, not a measured/probe-confirmed number, and depends on Open Question 1.

## 14. Non-claims

No template was created, imported, or modified in Creatomate. No registry row was written, no
probe render was executed by this agent — today's Q4/Q2 probes were fired and recorded by PK/
orchestrator in the source package before this run-sheet, not by this agent. Nothing here is
approved, registered, proven, or graduated. The orchestrator persisted this package to a file; the
agent that authored it has no write access. This run-sheet does not resolve the AI-prompt/
template-capacity mismatch it surfaces (§12) — that is a named open PK decision.

## 15. Modification-key form

`<element_name>.property` — per `docs/briefs/cc-0049-invegent-quote-card-winner-mapping-brief.md:
89,181` (original resolution, image quote cards) + `b1_video_stat.ts`'s own governed keys
(`StatValue.text`, `Logo.source`, etc.) + today's Q4 probe, which used the suffixed form on a video
template (`46c5c4ac…`) and succeeded — additional supportive evidence for this specific family,
though the `.text` overrides in that probe were not independently visually confirmed (only
`.duration` and top-level `duration` were instrument-measured), so a first-probe visual spot-check
on `.text` is still worth doing per the validation checklist.

## 16. Handoffs

- **`db-rls-auditor`:** once PK returns a transposed template — verify all 21 element names exist
  with exact case-sensitive matches, `scope='generic'` (not `'client'`), and that the WS-5
  constraints jsonb shape (still undesigned, carried unchanged from the v1 draft's §18) can express
  this run-sheet's conditional Point2 requirement before field-contract rows are captured.
- **WS-5:** the revised slot contract (21 elements, fixed 1-2 point slots, no near-zero-duration
  guard) has been handed to the WS-5 session directly (cross-session message, 2026-08-01) — see
  §5e of the source package.

---

**Evidence base:** `supabase/functions/video-worker/index.ts:1050-1123,686-693,946-952`,
`supabase/functions/video-worker/b1_video_stat.ts:130,146-164,198-217`,
`supabase/functions/ai-worker/index.ts:727-746`,
`docs/briefs/ws4-pp-yt-kinetic-operator-transposition-package-v1.md` (full, esp. §5d, §15),
`docs/briefs/cc-0049-invegent-quote-card-winner-mapping-brief.md:89,181`,
`docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §1.2/§2.4/§8,
`docs/briefs/results/creatomate-registry-integrity-graduation-contract-v1.md` §1.2/§2.4/§3.5/§4.

**Produced by:** `creatomate-specialist` (candidate, first mission — this run marks its first
recorded outcome). **Persisted by:** orchestrator (agent has no write access).
