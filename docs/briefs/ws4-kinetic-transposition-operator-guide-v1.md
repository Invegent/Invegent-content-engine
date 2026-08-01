# PK Operator Guide — Kinetic Template Transposition (step by step)

**What you're doing:** recreating the PP YouTube kinetic design as a saved Creatomate template.
Takes roughly 30–45 minutes. Companion to
`ws4-pp-yt-kinetic-operator-transposition-package-v1.md` (the full design rationale); this guide
is self-contained — you don't need the other doc open.

**Why the JSON here differs from the package §5a:** §5a shows a *sample render* where the unused
`Point3` slot is collapsed (hidden). A saved template must have Point3 built out like the other
two — the system hides unused slots per render. The JSON below is the corrected **template
state**: all 3 point slots visible, 35 s preview timeline, counters reading 1/3 · 2/3 · 3/3.

---

## Step 1 — Create the template

1. In Creatomate: **Templates → New → blank template** (don't pick a gallery design).
2. Set the canvas: **1080 × 1920**, frame rate **30**, output **MP4**.

## Step 2 — Get the design in

**Easiest path:** open the editor's **JSON / source view** (in the editor look for a `{...}` /
"Source" toggle) and paste the *entire* JSON from Step 6 below over the existing content. All 26
elements appear with the right names, positions, and animations.

**If you can't find a source view:** create the elements by hand from the same JSON — each object
in the `elements` list is one element; `name` is the element's name (rename it EXACTLY, it's
case-sensitive), and the other keys are its position/size/font/colour/timing.

## Step 3 — Sanity-check the names (the one thing that must be perfect)

The layer list must show exactly these 26 names, spelled and capitalised exactly like this:

> Background · BarTop · BarBottom · Logo ·
> HookHeadline · HookSubtitle ·
> Point1Counter · Point1Bar · Point1Headline · Point1Divider · Point1Body ·
> Point2Counter · Point2Bar · Point2Headline · Point2Divider · Point2Body ·
> Point3Counter · Point3Bar · Point3Headline · Point3Divider · Point3Body ·
> CtaWatermark · CtaHeadline · CtaFooter ·
> VoiceAudio · MusicBed

Everything else (exact pixel positions, colours, fonts) you may adjust to taste — the names are
the machine contract; a renamed element silently breaks rendering.

## Step 4 — Adjust visually (your part of the craft)

Preview it. Expected look: solid dark-blue vertical canvas, thin teal bars top/bottom, small PP
logo top-left; a big white hook headline; three "point" scenes each with a small `N/3` counter
top-right, a teal accent bar sliding in (from a different direction each time), bold headline +
smaller grey supporting line; a closing question with a huge faint "?" watermark and a "Follow
Property Pulse for more" line. Text fades and slides — no hard cuts.

Move/resize/restyle whatever looks off. Two things to leave alone:
- don't put anything in the band **y ≈ 1300–1520** (reserved for future captions);
- keep the two audio elements even though they're silent (their `source` stays empty).

Note down anything you changed from the pasted values — I record those deviations at capture.

## Step 5 — Save and send back three things

1. Save the template. **Name it: `generic_kinetic_text_9x16_v1`** (recommended; if you prefer
   another name, that's fine — just tell me exactly what you saved it as).
2. Copy the **template ID** — the long UUID in the browser URL when the template is open (or in
   the template's settings panel).
3. Reply to me with: **template name · template ID · your list of visual deviations** (or "none").

That's it — that unblocks Phase 2 on my side (registry capture → validation → probe renders →
your visual verdict).

## Step 6 — The paste JSON (template state — all 3 points active, 35 s)

> **⚠ SUPERSEDED (2026-08-01, found by probe 2):** the JSON below carries two defects inherited
> from the design package's §5a syntax — (1) shape elements use `"shape": "rectangle"` where
> Creatomate templates require a `path` (the editor silently dropped the key, so all 10 shapes
> rendered NOTHING — black background, no bars/dividers); (2) opacity values are CSS-style
> fractions (`0.7`) which the editor read as **percent** (`0.7%` ≈ invisible). **Use the
> corrected source instead:** `docs/briefs/artifacts/ws4-kinetic-template-source-corrected-v2.json`
> (adds full-rect `path` to all shapes, converts 12 opacities to percent strings — verified
> against a production-proven template's syntax on this account). Kept below unchanged for the
> record.

```json
{
  "output_format": "mp4",
  "width": 1080,
  "height": 1920,
  "frame_rate": 30,
  "duration": 35,
  "elements": [
    { "name": "Background", "type": "shape", "shape": "rectangle", "fill_color": "#0A2A4A",
      "width": "1080px", "height": "1920px", "x": "0px", "y": "0px", "x_anchor": "0%", "y_anchor": "0%" },
    { "name": "BarTop", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A",
      "width": "1080px", "height": "8px", "x": "0px", "y": "140px", "x_anchor": "0%", "y_anchor": "0%" },
    { "name": "BarBottom", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A",
      "width": "1080px", "height": "8px", "x": "0px", "y": "1620px", "x_anchor": "0%", "y_anchor": "100%" },
    { "name": "Logo", "type": "image", "source": "https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png",
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

    { "name": "Point1Counter", "type": "text", "text": "1/3",
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

    { "name": "Point2Counter", "type": "text", "text": "2/3",
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

    { "name": "Point3Counter", "type": "text", "text": "3/3",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "28px", "fill_color": "#1C8A8A", "opacity": 0.6,
      "x": "1020px", "y": "290px", "x_anchor": "100%", "y_anchor": "50%",
      "time": 22.15, "duration": 7.6, "enter": { "effect": "fade", "duration": 0.3 }, "exit": { "effect": "fade", "duration": 0.3 } },
    { "name": "Point3Bar", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A", "opacity": 0.7,
      "width": "5px", "height": "340px", "x": "60px", "y": "480px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 22.3, "duration": 7.4, "enter": { "effect": "slide", "direction": "180", "duration": 0.4 }, "exit": { "effect": "fade", "duration": 0.3 } },
    { "name": "Point3Headline", "type": "text", "text": "New listings are down 12% on last spring",
      "font_family": "Montserrat", "font_weight": "700", "font_size": "64px", "fill_color": "#FFFFFF", "line_height": "130%",
      "width": "880px", "x": "100px", "y": "480px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 22.5, "duration": 7.2, "enter": { "effect": "fade", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.35 } },
    { "name": "Point3Divider", "type": "shape", "shape": "rectangle", "fill_color": "#1C8A8A", "opacity": 0.4,
      "width": "880px", "height": "2px", "x": "100px", "y": "870px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 22.75, "duration": 7.0, "enter": { "effect": "wipe", "direction": "180", "duration": 0.4 }, "exit": { "effect": "fade", "duration": 0.3 } },
    { "name": "Point3Body", "type": "text", "text": "Sellers who list early face less competition",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "40px", "fill_color": "#CBD5E1", "line_height": "145%",
      "width": "880px", "x": "100px", "y": "895px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 22.9, "duration": 7.0, "enter": { "effect": "fade", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.35 } },

    { "name": "CtaWatermark", "type": "text", "text": "?",
      "font_family": "Montserrat", "font_weight": "900", "font_size": "500px", "fill_color": "#1C8A8A", "opacity": 0.07,
      "width": "1080px", "x_alignment": "50%", "x": "0px", "y": "400px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 30, "duration": 5 },
    { "name": "CtaHeadline", "type": "text", "text": "Thinking of listing this spring?",
      "font_family": "Montserrat", "font_weight": "700", "font_size": "62px", "fill_color": "#FFFFFF", "line_height": "130%",
      "width": "880px", "height": "600px", "x_alignment": "50%", "y_alignment": "50%",
      "x": "100px", "y": "650px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 30.3, "duration": 4.4, "enter": { "effect": "fade", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.35 } },
    { "name": "CtaFooter", "type": "text", "text": "Follow Property Pulse for more",
      "font_family": "Montserrat", "font_weight": "400", "font_size": "30px", "fill_color": "#1C8A8A", "opacity": 0.8,
      "width": "1080px", "x_alignment": "50%", "x": "0px", "y": "1450px", "x_anchor": "0%", "y_anchor": "0%",
      "time": 30.9, "duration": 3.9, "enter": { "effect": "fade", "duration": 0.5 } },

    { "name": "VoiceAudio", "type": "audio", "source": "", "time": 0, "duration": 35, "volume": "100%" },
    { "name": "MusicBed", "type": "audio", "source": "", "time": 0, "duration": 35, "volume": "15%" }
  ]
}
```

*Derivation note (for the record, not for the sitting): this is package §5a with the Point3 slot
un-collapsed per §4/§6.3 — Point3 mirrors Point1/2's geometry with its baked 180° entry
direction, timings extend the proven +8 s scene spacing (22.15 series), Cta shifts to t=30,
total 35 s, counters read N/3. Placeholder text on Point3 is preview copy only; all real content
is written per render.*

## If something goes wrong

- **Logo doesn't load** — the JSON above now carries the real production URL (verified serving,
  from `c.client_brand_profile.brand_logo_url`; the package §5a had a placeholder host). Either
  way the element is re-pointed to the governed asset at render time — what matters is that the
  element exists, named `Logo`.
- **Fonts:** Montserrat is a built-in Google font in Creatomate; weights 400/700/900.
- **Pasting the JSON errors out** — tell me the exact error message and I'll adapt the JSON to
  what your editor version expects.
- Don't delete "empty-looking" elements (the two audio tracks, the faint watermark) — they're
  intentional.
