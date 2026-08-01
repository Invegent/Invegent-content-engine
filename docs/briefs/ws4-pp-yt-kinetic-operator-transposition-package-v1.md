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
**Freeze (CCF-04 Hash Checkpoint, `author-freeze`, lane `ws4-pp-yt-kinetic-design`) — pin recorded
OUTSIDE this file from here forward, deliberately, to stop chasing a self-reference:** an earlier
version of this note tried to name this file's own resulting hash inline and got it wrong twice in a
row — writing the hash into the file changes the file's bytes, which changes the hash, forever one
edit behind itself. **Fix: this file no longer states its own current hash.** The authoritative
rollup for §5c's probe-firing authorisation is recorded in the orchestrator's session transcript at
the point PK authorised firing, and is re-derivable at any time by running
`.claude/helpers/hash-checkpoint.mjs` fresh against the three-file set (this file,
`ws4-creatomate-specialist-agent-charter-v1.md`, `.claude/agents/creatomate-specialist.md`) — never by
reading a number off this page. **Substantive content changes** (§5c's probes, the slot contract,
anything beyond this note) still require a fresh freeze before the probes are treated as
pinned-and-authorised; this note's own presence is exempt from that requirement since it can never
describe itself.

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

## 5c. Probe-render blocks — paste-ready, PK-fired (2026-08-01, PK-sequenced)

PK has sequenced these two probes **before** any editor time — per §14/§15, they resolve the two
highest-leverage unknowns in this design. **Neither touches the Creatomate key from this session —
both are plain `curl` blocks for PK to fire manually with `$CREATOMATE_API_KEY` set on PK's own
side**, per the standing EF-env-only-secret rule. Header/body shape matches the live code exactly
(`Authorization: Bearer <key>` + `Content-Type: application/json`, `video-worker/index.ts:509,804-
808`; template-mode body `{template_id, modifications, output_format}`, `index.ts:110-113`).

**Side-effect claim, narrowed (`apply-harness-auditor` pass, 2026-08-01, finding AHA-07-1):**
**ICE-side, verified by construction** — neither probe writes to any ICE table, creates a draft, or
affects any live selector output, because a manually-fired `curl` to `api.creatomate.com` never
calls Supabase; `select_template`'s output is determined purely by `c.creative_provider_template`
rows, which a third-party API call cannot touch. **Creatomate-side, an assumption, not a repo-proven
fact:** whether a render call ever mutates/caches/versions anything against the SAVED template
object itself (Q4 targets `46c5c4ac…`, the same id currently used in production), or only ever
creates an independent, immutable render resource, is not directly evidenced anywhere in this repo —
the closest indirect evidence (`_harness/cc_broll_parity_20260729/render_proof_parity_meta.json`,
two prior renders against the same template, no visible cross-contamination) is suggestive, not
dispositive. Treated here as a standard stateless job-submission API assumption, named rather than
silently relied on.

### Probe Q4 — does a bare top-level `duration` key override composition length?

**Why this template:** `46c5c4ac-4d35-488c-b57c-44e05d790fb9` (`AU_generic_national_Suburb_9:16_V1`)
is the one template in this repo with **already-proven** bare top-level `width`/`height` overrides
(`B1_VIDEO_TEMPLATE_OUTPUT_PARITY`, `b1_video_stat.ts:146-159`, evidenced live by
`_harness/cc_broll_parity_20260729/render_proof_parity_meta.json`). Testing `duration` on the same
template is the smallest, most-grounded extension of already-proven behaviour. **Isolating design:**
every element's own `.duration` is set to `5`; a bare top-level `"duration": 10` is added on top.
`10 ≠ 5` and `10 ≠` the template's native `8`, so the result is unambiguous either way.

```bash
curl -sS -X POST https://api.creatomate.com/v2/renders \
  -H "Authorization: Bearer ${CREATOMATE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "46c5c4ac-4d35-488c-b57c-44e05d790fb9",
    "output_format": "mp4",
    "modifications": {
      "duration": 10,
      "width": 1080,
      "height": 1920,
      "Background.duration": 5,
      "Logo.duration": 5,
      "Logo.source": "https://x.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png",
      "StatValue.duration": 5,
      "StatValue.text": "Q4 PROBE",
      "StatLabel.duration": 5,
      "StatLabel.text": "WS-4 duration-key probe -- not for publication",
      "ContextLine.duration": 5,
      "ContextLine.text": "Testing whether a bare top-level duration key overrides composition length.",
      "CtaText.duration": 5,
      "CtaText.text": "Discard this render.",
      "MusicBed.duration": 5,
      "VoiceAudio.duration": 5
    }
  }'
```

Then poll (mirrors `index.ts:753`'s poll shape AND its bound —
`apply-harness-auditor` finding AHA-08-1: the earlier draft named only the shape, not the ceiling)
until `"status":"succeeded"`:

```bash
curl -sS https://api.creatomate.com/v2/renders/<RENDER_ID_FROM_ABOVE> \
  -H "Authorization: Bearer ${CREATOMATE_API_KEY}"
```

**Poll bound, explicit:** every ~2-3s, up to ~48 attempts (~2 minutes total) — mirroring production's
own `POLL_INTERVAL_MS=2500`/`POLL_MAX_ATTEMPTS=48` ceiling (`index.ts:511-512`). If still not
`"succeeded"`/`"failed"` after ~2 minutes, **stop polling and treat as anomalous** — do not keep
waiting indefinitely.

**Observation to record:** the succeeded response's own `duration`/`output.duration` field (if
Creatomate reports one) AND the actual playable length of the downloaded mp4 (e.g. `ffprobe -v
error -show_entries format=duration -of csv=p=0 <file>.mp4` — `ffmpeg` is confirmed installed per
house notes).

**Cost note:** one render on an existing 8s-native template, ~10s output — negligible against the
2-minute ceiling; no different in cost class from any other stat probe already run in this repo.

**What each outcome means:**
- **Output ≈ 10s → PASS.** Bare `duration` is an authoritative top-level override, symmetric with
  `width`/`height`. §5's timing mechanism proceeds as designed: the kinetic template's variable
  20-45s composition length is set via one bare `duration` key per render, computed as the true
  Σ active-scene durations.
- **Output ≈ 5s (or anything ≠ 10s, but the render DID succeed) → FAIL, but not fatal.** Bare
  `duration` is ignored; composition length is governed purely by max per-element end-time, exactly
  as the existing `video_short_stat` comment already implies (`b1_video_stat.ts:141-143`: "the
  composition length is the max element duration"). **Workable fallback, no redesign needed beyond
  this:** the worker computes the kinetic composition's true end time and sets the trailing `Cta*`
  elements' `.time`/`.duration` to land exactly there — the composition naturally ends when its
  longest-running element does. §5's per-element flat-modification mechanism already does this for
  every element; only the (unused, if this fails) bare `duration` key is dropped from the design.
- **HTTP non-2xx from the POST, OR `"status":"failed"`/an `error_message` in the poll response →
  NEITHER PASS NOR FAIL** (`apply-harness-auditor` finding AHA-09-1). The probe did not validly run —
  do not draw the "duration key is ignored" conclusion from a request that never actually rendered.
  Investigate the error (bad `template_id`, malformed body, auth failure) and re-fire before
  recording an outcome.

### Probe Q2 — does a `duration: 0.01` element actually stay invisible?

**Isolating design:** a full-length (5s) background rectangle establishes the composition length
independent of the test element, so the probe measures ONLY the near-zero-duration guard, not a
confound from the whole composition collapsing to near-zero. One large, unmissable text element is
placed on-screen with `time: 0, duration: 0.01` — if it is visible at all, it will be obvious on
playback; if the guard works, the 5s clip shows nothing but the background.

```bash
curl -sS -X POST https://api.creatomate.com/v2/renders \
  -H "Authorization: Bearer ${CREATOMATE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "output_format": "mp4",
    "width": 1080,
    "height": 1920,
    "frame_rate": 30,
    "duration": 5,
    "elements": [
      { "name": "Background", "type": "shape", "shape": "rectangle", "fill_color": "#0A2A4A",
        "width": "1080px", "height": "1920px", "x": "0px", "y": "0px", "x_anchor": "0%", "y_anchor": "0%",
        "time": 0, "duration": 5 },
      { "name": "MarkerText", "type": "text",
        "text": "IF YOU CAN READ THIS THE 0.01s GUARD FAILED",
        "font_family": "Montserrat", "font_weight": "900", "font_size": "60px", "fill_color": "#FFFFFF",
        "width": "960px", "x_alignment": "50%", "y_alignment": "50%",
        "x": "60px", "y": "960px", "x_anchor": "0%", "y_anchor": "0%",
        "time": 0, "duration": 0.01 }
    ]
  }'
```

Poll the same way as Q4 (same ~2-3s / ~48-attempt / ~2-minute bound — see Q4's poll bound above).

**Observation to record — frame-accurate, not playback (`apply-harness-auditor` finding AHA-01-1):**
the test element's `duration: 0.01` is **below one frame interval at 30fps** (1/30 ≈ 0.0333s) — the
phenomenon being tested is inherently sub-frame, and ordinary playback is not a reliable instrument
for detecting or ruling out a single-frame flash (a human could both miss a real leak and imagine
one that isn't there). Extract every frame instead, mirroring the existing
`_harness/cc_broll_parity_20260729` frame-still idiom:
```bash
ffmpeg -i <downloaded_file>.mp4 -vf "select='not(mod(n\,1))'" -vsync 0 frame_%04d.png
```
Inspect all ~150 extracted stills (5s × 30fps) for `"IF YOU CAN READ THIS..."` — not just play the
clip back.

**Cost note:** source-mode, 5s, two elements — the cheapest possible probe render in this package.

**What each outcome means:**
- **Text never visible in any extracted frame → PASS.** The near-zero-duration guard is confirmed
  reliable; §4's 3-guard collapse mechanism stands as designed (all three guards independently
  sufficient, deliberately redundant).
- **Text visible in any extracted frame → FAIL, use the 2-guard fallback.** Drop reliance on
  `duration≈0` as an independent guard. The **empty-text + off-canvas** pair (§4 guards 2+3) are
  each trivially, independently reliable by construction (an empty string cannot render visible
  content; `y: "3000px"` is off the 1920px-tall canvas) — collapsed `PointN` slots stay governed by
  those two alone. `duration` for a collapsed slot can then simply be set to match the slot's
  neighbours' timing (no need for a special near-zero value at all) since it no longer carries any
  guard responsibility.
- **HTTP non-2xx from the POST, OR `"status":"failed"`/an `error_message` in the poll response →
  NEITHER PASS NOR FAIL.** Same as Q4's third branch — the probe did not validly run; investigate
  before recording an outcome.

**Both results — request + response + observation — go into this package's findings once run,**
per the probe-render precedent this repo already follows (capacity established by probe, never
assumed from source, `cc-0033-headline-capability-contract-wiring.md:38`).

## 5d. Probe-render results (2026-08-01, fired PK-approved, session-executed)

**Q4 — top-level `duration` override → PASS.** First fire (with `Logo.source` set to a
`brand-assets` Supabase Storage URL) returned `"status":"failed"`,
`"error_message":"A file could not be downloaded: https://x.supabase.co/storage/v1/object/public/
brand-assets/Property_Pulse/Logos/PP_logo_2.png (element Logo)"` — **NEITHER PASS NOR FAIL** per
the pre-declared third branch; the URL was not fetchable by Creatomate's renderer (unrelated to the
mechanism under test). **Design deviation:** re-fired with `Logo.source` dropped from
`modifications` entirely (the saved template's own default Logo asset used instead) — everything
else, including `"duration":10`, unchanged. Re-fire: POST → HTTP 202, `id
c31dcdd6-f4a7-43cc-b8a5-f2f03847f8ba`; polled to `"status":"succeeded"` in 3 attempts
(~5-7.5s); response reported `"duration":10` at top level. Downloaded the output mp4
(`file_size:5777252`) and measured actual playable length with `ffprobe -show_entries
format=duration`: **`10.000000`s exactly** — matches the override, not the elements' `5` or the
template's native `8`. Bare `duration` is confirmed an authoritative top-level override, symmetric
with the already-proven `width`/`height` behaviour. **§5's timing mechanism (variable composition
length via one bare `duration` key per render) proceeds as designed — no redesign needed.**

**Q2 — `duration: 0.01` collapse guard → FAIL.** POST → HTTP 202, `id
8acd4302-e2a9-4ff0-9114-5dc11342ff08`; polled to `"status":"succeeded"` on the first attempt
(`file_size:22384`). **Collapsed-slot observation (frame-accurate, not playback):** downloaded the
mp4, extracted all 150 frames (5s × 30fps) with `ffmpeg -vf "select='not(mod(n\,1))'"`, then cropped
each frame to the `MarkerText` region (`960x100` at `60,940`) and ran `signalstats` across every
frame. 149 of 150 frames measured a uniform `YAVG≈16.0`/`YMAX≈17` (pure background, no text). **Frame
0 (`pts_time:0`) measured `YAVG=64.29`, `YMAX=250`** — a clear outlier. Visual confirmation
(extracted `frame_0001.png`) shows the full marker text **"IF YOU CAN READ THIS THE 0.01s GUARD
FAILED" fully legible**, not a partial/sub-pixel flash. **The near-zero-duration guard does NOT
reliably suppress rendering — a `duration:0.01` element is fully visible in the composition's first
frame.** Per the pre-declared FAIL branch: **drop reliance on `duration≈0` as an independent guard.**
Collapsed `PointN` slots must be governed by the **empty-text + off-canvas pair alone** (§4 guards
2+3, each independently reliable by construction); a collapsed slot's `duration` can simply match
its neighbours' timing since it no longer carries guard responsibility.

**Downstream resolution (§15):** Q2 FAIL mechanically resolves Q1 per PK's conditional decision
(§15) — **fall back to the simpler fixed 1-2 point-slot design**, not the 3-slot default, since the
3-guard collapse mechanism the 3-slot design depended on is not sound. No further PK sitting needed
to pick between them; this is the named mechanical resolution.

## 5e. WS-5 handoff (2026-08-01) — revised slot contract, not the stale 3-slot calibration

WS-5 Phase 1 (`local_d28268f1-3836-416d-9059-7332ee8da5be`, "Design WS-5 constraints jsonb shape +
kinetic registration", worktree branch `claude/admiring-shtern-6fdb19`, not yet merged to main) had
already **CAPTURED** a kinetic template (`9ad024cc…`, scope=`generic`, 26 constraints rows, dark,
auditor-clean) ahead of these probes, per its own record: "NEXT probe renders (first: duration
override) → PK verdict → graduation." That capture predates today's Q2 FAIL and therefore reflects
the retired **3-point / near-zero-duration-guard** design, not the fixed 1-2 point-slot design this
package now resolves to.

**Sent directly to the WS-5 session (cross-session message, 2026-08-01):** the Q4 PASS / Q2 FAIL
results, the mechanical Q1 resolution (fixed 1-2 point slots), the 21-element slot contract (down
from 26 — Point3's 5 elements retired), and an explicit flag that its already-captured 26-row/3-slot
calibration must **not** be persisted or graduated as-is — it needs revision to match the fixed
1-2 point-slot contract (`docs/briefs/artifacts/ws4-kinetic-transposition-run-sheet-v1.md` §5)
before any graduation step. This is a fact/finding handoff only — no DB write was made by this
session; WS-5's own lane owns whether/how to revise its captured rows, under its own gates.

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

**PK decision (2026-08-01): voice variants DEFERRED out of mission 1 entirely** — mission 1 builds
**silent kinetic only** (`video_short_kinetic`, no VO/music). `VoiceAudio`/`MusicBed` elements
still exist in the template (§6.5, kept for forward compatibility so no re-transposition is needed
later) but stay unbound (`source:""` → silent, per house convention) for the v1 registration, and
no voice-variant registration/probe/graduation work is in scope for this mission.

**If a future mission builds a voice variant:** PK has also decided the approach in advance —
**deterministic narration composition**, mirroring stat's `composeGovernedVideoNarration` pattern: a
narration string built from the same structured scene fields already gated by §9, not a separate
free-text `narration_text` field. This was §15 Q3; it is now **decided, not open** — recorded here
so the choice isn't re-litigated when that future mission starts.

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

## 15. Open questions — PK-sequenced decisions (updated 2026-08-01)

- **Q1 — fixed-slot count. RESOLVED 2026-08-01 (mechanical, per Q2).** Q2 FAILED (§5d) → **fixed
  1-2 point-slot design**, not the 3-slot default. The 3-guard collapse mechanism the 3-slot design
  depended on is not sound (§5d), so the simpler fixed-slot design is the one to build.
- **Q2 — collapse mechanism trust. RESOLVED 2026-08-01 — FAIL (§5d).** The 3-guard collapse
  (near-zero duration + empty text + off-canvas position) does NOT hold: frame-accurate inspection
  (150 extracted frames, `signalstats` + visual confirmation) found the `duration:0.01` marker text
  fully legible in the composition's first frame. Drop `duration≈0` as an independent guard; govern
  collapsed slots by empty-text + off-canvas alone (§4 guards 2+3, §5c/§5d).
- **Q3 — voice variant approach. DECIDED, and out of scope for mission 1.** Deterministic narration
  composition (mirroring stat) — see §11. Voice variants themselves are deferred out of mission 1
  entirely, so this decision is recorded for a future mission, not acted on now.
- **Q4 — top-level `duration` override. RESOLVED 2026-08-01 — PASS (§5d).** Confirmed via
  `ffprobe`-measured actual output length (`10.000000`s exact match to the override) after a
  design-deviation re-fire dropped an unfetchable `Logo.source` URL from the first attempt. §5's
  timing mechanism proceeds as designed — no fallback needed, no redesign. This changes exactly which
  modification keys the operator's transposed template needs to expose.

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

## 18. WS-5 handoff — capture requirements for the `constraints` jsonb shape

**The WS-5 `constraints` jsonb shape is being designed as its own parallel T2 lane — not by this
package or this agent.** `db-rls-auditor`'s pass (§14 registration items) found `modification_key`
and `empty_ok` have no dedicated column on `c.creative_provider_template_field` and would need to
live in `constraints`, which is `NULL` on all 144 live field rows today — zero precedent to copy.
This section hands WS-5 the **requirements** this template's 26-field capture needs the eventual
shape to express — a named input, not a design.

1. **An element can need more than one modification key.** `HookHeadline`, for example, needs
   `.text` AND `.time` AND `.duration` simultaneously (§6.2, §8) — the shape must support a **list**
   of `{property, required, empty_ok}`-style entries per field row, not a single string. 19 of this
   template's 26 elements carry `.time`/`.duration` in addition to their content property
   (`.text`/`.source`/`.fill_color`); 4 persistent-chrome elements carry only their content property
   (§6.1); 2 audio elements carry only `.source` (§6.5).
2. **Modification-key form is `<element_name>.property`** (suffixed, cc-0049-resolved, §5b) — the
   shape should record the *property* per entry (`text`/`source`/`fill_color`/`time`/`duration`),
   not require re-deriving it from a free-text key string.
3. **A persistent-vs-scene-timed distinction.** 4 elements (§6.1) span the full composition and
   never carry `.time`/`.duration`; the other 22 always do. The shape needs to express this, since a
   future validator (or the intake-validation consumer, §14) should be able to tell "this element is
   missing its required timing modification" from "this element correctly has none."
4. **Scene-slot grouping.** Every element belongs to exactly one of `Hook`/`Point1`/`Point2`/
   `Point3`/`Cta` (§6.2-§6.4) — needed so a future consumer can check "all elements of an *active*
   scene slot are present," not just "all 26 elements individually exist," especially once Q1/Q2
   (§15) resolve which point-slot count is actually built.
5. **Conditional required/empty_ok, not flat booleans.** `PointNCounter`/`PointNBar`/
   `PointNHeadline` are required **only when that slot is active** (§6.3) — collapsed per §4/§5c when
   inactive. The shape needs to express "required conditional on slot-activation," not a single
   fixed `required: true/false` per element.
6. **Collapse-guard values, once Q2 resolves.** Whichever guard combination Q2's probe (§5c)
   confirms — either all three (duration≈0 + empty text + off-canvas) or the two-guard fallback
   (empty text + off-canvas only) — the shape should be able to record the actual sentinel values
   used (e.g. the off-canvas `y` coordinate), so a future registration-time validator can check the
   operator's saved template actually implements the confirmed mechanism, not just trust it did.
7. **Text-limit metadata may already have a home.** `creative-graph-auditor`'s pass found the Creative
   Library's **separate** `capability_contracts[].fields` mechanism (§7 of `registry-schema-v2.md`)
   already classifies fields as `ai_authored`/`derived`/`renderer_fixed`/`governed_assets` — WS-5
   should check whether §9's per-field `max_chars`/`overflow_risk` metadata belongs there instead of
   duplicating it inside the DB-side `constraints` jsonb; not this package's call to make.

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
