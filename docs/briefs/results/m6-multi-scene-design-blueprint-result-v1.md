# Result — M6 multi-scene design package + first real M13 Blueprint JSON (v1)

**Brief file:** control-tower seed relay (session `local_aac5adf2-b0c4-458f-a67c-8262f198b51d`, **informational — no authority conveyed**, PK confirmed "Go ahead, proceed as specified" 2026-08-06 in this session)
**Executed by:** Claude Code (orchestrator) + `creatomate-specialist` subagent (run `ae5924be310089a5b`)
**Completed:** 2026-08-06 Sydney
**Lane classification:** T1 (read-only design; no network to Creatomate, no DB writes, no template creation, no registry mutation) · SIDE_PROVING (creatomate-specialist candidate agent's first real mission)

---

## 1. Result status

`Complete` — design package produced (verdict `PACKAGE_READY`), transcribed into a valid Blueprint JSON instance, mechanically validated, self-check-diffed both positive and negative. **Two real schema-fit gaps found and documented (§6), not silently worked around.** No PK gate crossed beyond the go-ahead already given — this is design/documentation output only, nothing is registered, proven, or approved.

## 2. Commit(s)

N/A — no commit made this lane. Working-tree artifacts only, per the seed's own instruction ("Result doc + version-less payload → control tower; working-tree only, control tower persists"). Commit/push remain PK's call.

## 3. Files changed

- [docs/briefs/artifacts/m6-triptych-specialist-design-package-v1.json](../artifacts/m6-triptych-specialist-design-package-v1.json) — created (verbatim `creatomate-specialist` return value, `PACKAGE_READY` verdict preserved)
- [docs/briefs/artifacts/m6-triptych-blueprint-v1.json](../artifacts/m6-triptych-blueprint-v1.json) — created (M13 v1 Blueprint JSON instance, transcribed)
- [docs/briefs/artifacts/m6-triptych-capture-selfcheck-v1.json](../artifacts/m6-triptych-capture-selfcheck-v1.json) — created (hand-derived self-check Capture, NOT a real Creatomate read)
- `docs/briefs/results/m6-multi-scene-design-blueprint-result-v1.md` — this file

## 4. Actions taken

1. Located grounding materials via a read-only recon agent: proven single-scene render-spec builders (`buildStatRevealSpec`/`buildKineticTextSpec` in `video-worker/index.ts`, plus governed `b1_video_stat.ts`/`b1_video_kinetic.ts`), the governed content contract (`ai-worker/index.ts`'s live system prompts — there is no standalone contract doc), the 2-minute render-poll ceiling (`creatomate_submit.ts:37-38`, `POLL_INTERVAL_MS=2500 × POLL_MAX_ATTEMPTS=48`), the M13 Blueprint schema, and real proven registry/source-JSON examples.
2. Invoked `creatomate-specialist` (candidate agent, first real mission since 2026-08-01 charter approval) with the fixed M6 shape (3 scenes, 30–45s, hard max 45s) and the located evidence as mandatory grounding. Verdict: **`PACKAGE_READY`**.
3. Read `docs/creative-library/m13-blueprint-capture-schema-v1.md` in full plus the real fixture pair (`.claude/helpers/fixtures/m13-blueprint-capture-diff/blueprint-pp-carousel-cover-v1.json` / `capture-pp-carousel-cover-clean.json`) to confirm the exact field shape and JSON conventions before transcribing.
4. Transcribed the specialist's 13-element design into a valid Blueprint JSON instance (`m6-triptych-blueprint-v1.json`), computing a real sha256 `artifact_hash` (canonicalized, sorted-key JSON, hash field itself excluded from the hash input) rather than a placeholder.
5. Ran `.claude/helpers/m13-blueprint-capture-diff.mjs` against the Blueprint and a hand-derived self-check Capture — **positive test: `clean`, 0 findings.** Ran a second **negative test** (element removed + an undeclared element added, scratch-only, not persisted) — **`blocked`, 2 findings** (`missing_in_capture` BLOCK + `extra_in_capture` ADVISORY), confirming the diff engine's fail-detection actually fires, not just its happy path.
6. Documented two real schema-fit gaps found during transcription (§6 below) rather than papering over them.

## 5. Constraints confirmed

- No Creatomate API call made at any point (specialist has no network tool; orchestrator made none either) — confirmed not done.
- No Creatomate template created/edited/imported — confirmed not done.
- No DB write, no registry row written, no `resolve_slot_assets`/`select_template` mutation — confirmed not done.
- No git commit/push — confirmed not done (working-tree only, per the seed's instruction).
- No numeric limit invented — every char/duration limit in the Blueprint is cited from `ai-worker/index.ts` or borrowed-and-flagged from `b1_video_stat.ts`/`b1_video_kinetic.ts` with an explicit `to_be_calibrated` note where the borrow is uncertain (§7).
- Nothing marked proven/approved/graduated — `proof_posture: "draft"` throughout; the self-check diff's `clean` verdict is explicitly labeled as proving nothing about a live template (see the artifact's own `_selfcheck_note`).

## 6. Blueprint-schema-fit findings (the mission's "document the gap precisely" instruction)

The mission asked: *"if the schema cannot express 3 scenes in one scalar Blueprint, DOCUMENT the gap precisely — that finding feeds the M13 multi-object lane and is valuable, not a failure."* Two findings came out of doing this transcription for real:

**Finding A — the 3-scene question itself: NO gap.** The M13 v1 scalar schema expresses M6's 3-scene design with zero extension. This is because the specialist's design resolves the M13 packet's own named (a)/(b) fork (`m13-governed-template-build-pack-scoping-packet-v1.md:249-279`) as **(a): one Creatomate render with a richer flat `elements[]` array** (13 elements, time-offset within a single composition — exactly how `buildKineticTextSpec`/`buildStatRevealSpec` already work in live production), **not** (b) N-stitched sub-renders. Per the packet's own §7 (quoted by the specialist): *"If (a), M6 needs no multi-object Blueprint/Capture support at all... M13's v1 scalar schema already covers it with no extension."* Every element's `sub_sequence_key` stays `null` — the dormant seam is exercised as designed (reserved, unused). **This is the finding the mission most expected, and it came back negative — worth recording precisely because it closes an open question, not because it surfaces a defect.**

**Finding B — a real gap found in the process, not anticipated by the mission: `compatible_ice_format_keys` presupposes an EXISTING format taxonomy.** `registry-schema-v2.md:90`, reused verbatim by the Blueprint schema, states *"existing governed format keys only, no new taxonomy invented by a Blueprint."* But M6 has no format_key today — `ai-worker/index.ts`'s `formatKey ===` branches cover only `video_short_kinetic[_voice]`, `video_short_stat[_voice]`, `video_short_avatar`; no third branch exists (specialist's own `mission.format_key` note). The Blueprint I produced names a **proposed** key (`video_short_triptych`) in that field, which is, strictly, in violation of the schema's own "existing only" constraint by construction — I flagged this inline in the artifact's `_transcription_note` rather than silently treating the proposed key as though it were already governed. **This is a real structural precondition the M13 schema doc doesn't currently name**: a Blueprint for a genuinely NEW format cannot be schema-compliant on this one field until a format_key is minted elsewhere first (an ai-worker/product decision, not a Blueprint-authoring one). Worth carrying into the M13 Lane 3+ registry work as a named open item.

**Minor related finding — `composed_of_patterns` has nothing to cite.** No registered Pattern object anywhere in the Creative Library (`property-pulse.json`, `registry-schema-v2.md`) covers video-*scene* composition — every registered pattern is a static/carousel branding or headline pattern (`pp_branding_strip_v1`, `pp_headline_block_v1`). Left as `[]` rather than inventing a pattern_key.

## 7. What the tooling can and cannot check today (mission step 3)

**Can check (mechanically verified this lane, both directions):**
- `validateBlueprint()`'s five required-field + `elements[]`-shape checks, plus the conditional `duration_seconds` requirement when `output_type` looks like video — the Blueprint passed cleanly.
- All four finding classes (`missing_in_capture` BLOCK, `dimension_output_mismatch` BLOCK, `extra_in_capture` ADVISORY/escalates on reserved-name collision, `field_class_mismatch` ADVISORY-only) — confirmed live via the self-check pair: **positive run → `clean`, 0 findings**; **negative run (element dropped + an unexpected element added, scratch-only)** → **`blocked`, 2 findings**, exactly matching the documented rollup rule (any BLOCK ⇒ `blocked`).

**Cannot check (by design, named in the schema/helper itself, not a limitation of this lane's execution):**
- Field-*value*/business correctness (a stat value that's wrong, a headline that's off-brand) — explicitly out of scope for the diff engine.
- Whether the design is actually renderable inside the ~120s poll ceiling — no live render exists; `render_cost_declaration.watch_item_for_probe` names this as the single biggest unverified risk.
- Anything about a REAL Creatomate template, because none exists — every Capture-side artifact in this lane is hand-derived, not a live `GET /v1/templates/{id}` read (the self-check artifact's own `_selfcheck_note` says so explicitly). Lane 5 (real end-to-end proof) remains unbuilt, per the schema doc's own Handoff section.

## 8. Design package — full detail (transcribed from `creatomate-specialist` run `ae5924be310089a5b`; verbatim JSON preserved separately at [m6-triptych-specialist-design-package-v1.json](../artifacts/m6-triptych-specialist-design-package-v1.json))

**Verdict: `PACKAGE_READY`.**

### 8.1 Layout — 3 fixed scenes, one Creatomate render, 9:16 / 1080×1920

| Scene | Beat | Window | Purpose | Modeled on |
|---|---|---|---|---|
| 1 | Hook | 0–6s | Pattern-interrupt headline | `buildKineticTextSpec` hook scene (`index.ts:1257-1261`) |
| 2 | Proof | 6–32s | Stat/value reveal + supporting context (the payload — longest scene) | `buildStatRevealSpec` stat-card scene (`index.ts:1319-1327`) |
| 3 | CTA | 32–38s | Engagement question + follow prompt | `buildKineticTextSpec` cta scene (`index.ts:1262-1267`) |

Worked example totals **38s** — inside the PK-ratified 30–45s band with headroom under the 45s hard max.

### 8.2 Element / slot contract (13 elements)

| Element | Type | field_class | Limit / policy | Source |
|---|---|---|---|---|
| BarTop | shape | derived | `brand_colour_secondary` via `getBrand()` | `index.ts:1115-1121` |
| BarBottom | shape | derived | same | `index.ts:1115-1121` |
| Logo | image | governed_asset | resolver-driven, REQUIRED fail-loud, no fallback; `pp_logo_primary` | `b1_video_kinetic.ts:266-273` |
| Scene1Headline | text | ai_authored | 60 chars | `b1_video_kinetic.ts:91` + `ai-worker/index.ts:813` |
| Scene1Subtitle | text | renderer_fixed | fixed literal "↓ Keep watching" | `index.ts:1261` / `b1_video_kinetic.ts:315` |
| Scene2Circle | shape | renderer_fixed | decorative, not modifiable | design proposal |
| Scene2StatValue | text | ai_authored | 12 chars (**borrowed, `to_be_calibrated`**) | `b1_video_stat.ts:92` |
| Scene2Rule | shape | renderer_fixed | decorative, not modifiable | design proposal |
| Scene2StatLabel | text | ai_authored | 48 chars (**borrowed, `to_be_calibrated`**) | `b1_video_stat.ts:93` |
| Scene2ContextLine | text | ai_authored | 160 chars (**borrowed, `to_be_calibrated`**) | `b1_video_stat.ts:94` |
| Scene3Watermark | text | renderer_fixed | decorative "?" glyph, not modifiable | design proposal |
| Scene3Headline | text | ai_authored | 65 chars (**contested — see open Q3**) | `b1_video_kinetic.ts:94` |
| Scene3Footer | text | renderer_fixed | fixed literal "Follow {ClientName} for more" | `index.ts:1267` / `b1_video_kinetic.ts:384` |

Modification-key form: **suffixed `<element_name>.property`** (e.g. `Logo.source`), per `b1_video_kinetic.ts:17-22` — the proven form, **not** `b1_video_stat.ts`'s bare-key form (that template's own comment warns it is template-specific). **Caveat carried forward:** this form is proven on the *existing* kinetic template, not yet probed against a newly-created M6 template.

### 8.3 Complete Creatomate source-mode JSON (representative worked example)

```json
{
  "output_format": "mp4",
  "width": 1080,
  "height": 1920,
  "frame_rate": 30,
  "duration": 38,
  "fill_color": "#1E2532",
  "elements": [
    { "name": "BarTop", "type": "shape", "shape": "rectangle", "fill_color": "#ECA02D", "width": "1080px", "height": "8px", "x": "0px", "y": "140px", "x_anchor": "0%", "y_anchor": "0%" },
    { "name": "BarBottom", "type": "shape", "shape": "rectangle", "fill_color": "#ECA02D", "width": "1080px", "height": "8px", "x": "0px", "y": "1620px", "x_anchor": "0%", "y_anchor": "100%" },
    { "name": "Logo", "type": "image", "source": "{{GOVERNED_LOGO_URL}}", "width": "90px", "height": "90px", "x": "44px", "y": "160px", "x_anchor": "0%", "y_anchor": "0%", "fit": "contain" },

    { "name": "Scene1Headline", "type": "text", "text": "3-BEDROOM HOMES ARE VANISHING", "font_family": "Montserrat", "font_weight": "900", "font_size": "76px", "fill_color": "#FFFFFF", "line_height": "130%", "width": "960px", "height": "700px", "x_alignment": "50%", "y_alignment": "50%", "x": "60px", "y": "560px", "x_anchor": "0%", "y_anchor": "0%", "time": 0.4, "duration": 5.2, "enter": { "effect": "fade", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.35 } },
    { "name": "Scene1Subtitle", "type": "text", "text": "↓ Keep watching", "font_family": "Montserrat", "font_weight": "400", "font_size": "26px", "fill_color": "#ECA02D", "opacity": 0.75, "width": "1080px", "x_alignment": "50%", "x": "0px", "y": "1480px", "x_anchor": "0%", "y_anchor": "0%", "time": 1.2, "duration": 4.4, "enter": { "effect": "fade", "duration": 0.6 }, "exit": { "effect": "fade", "duration": 0.35 } },

    { "name": "Scene2Circle", "type": "shape", "shape": "circle", "fill_color": "#ECA02D", "opacity": 0.06, "width": "900px", "height": "900px", "x": "50%", "y": "48%", "x_anchor": "50%", "y_anchor": "50%", "time": 6, "duration": 26, "enter": { "effect": "scale", "duration": 1.2, "easing": "ease-out" } },
    { "name": "Scene2StatValue", "type": "text", "text": "34.2%", "font_family": "Montserrat", "font_weight": "900", "font_size": "180px", "fill_color": "#FFFFFF", "width": "1080px", "x_alignment": "50%", "x": "0px", "y": "680px", "x_anchor": "0%", "y_anchor": "0%", "time": 7.5, "duration": 24.5, "enter": { "effect": "scale", "duration": 0.9, "easing": "bounce" }, "exit": { "effect": "fade", "duration": 0.4 } },
    { "name": "Scene2Rule", "type": "shape", "shape": "rectangle", "fill_color": "#ECA02D", "width": "640px", "height": "6px", "x": "220px", "y": "1060px", "x_anchor": "0%", "y_anchor": "0%", "time": 9.5, "duration": 22.5, "enter": { "effect": "wipe", "direction": "270", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.3 } },
    { "name": "Scene2StatLabel", "type": "text", "text": "MEDIAN PRICE GROWTH", "font_family": "Montserrat", "font_weight": "600", "font_size": "36px", "fill_color": "#ECA02D", "width": "1080px", "x_alignment": "50%", "x": "0px", "y": "1090px", "x_anchor": "0%", "y_anchor": "0%", "time": 10.5, "duration": 21.5, "enter": { "effect": "slide", "direction": "270", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.3 } },
    { "name": "Scene2ContextLine", "type": "text", "text": "Perth dwelling values over the past 12 months, outpacing the national average.", "font_family": "Montserrat", "font_weight": "400", "font_size": "34px", "fill_color": "#CBD5E1", "line_height": "145%", "width": "860px", "x_alignment": "50%", "x": "110px", "y": "1200px", "x_anchor": "0%", "y_anchor": "0%", "time": 12.5, "duration": 19.5, "enter": { "effect": "fade", "duration": 0.7 }, "exit": { "effect": "fade", "duration": 0.4 } },

    { "name": "Scene3Watermark", "type": "text", "text": "?", "font_family": "Montserrat", "font_weight": "900", "font_size": "500px", "fill_color": "#ECA02D", "opacity": 0.07, "width": "1080px", "x_alignment": "50%", "x": "0px", "y": "400px", "x_anchor": "0%", "y_anchor": "0%", "time": 32, "duration": 6 },
    { "name": "Scene3Headline", "type": "text", "text": "Ready to see what your suburb is doing?", "font_family": "Montserrat", "font_weight": "700", "font_size": "62px", "fill_color": "#FFFFFF", "line_height": "130%", "width": "880px", "height": "600px", "x_alignment": "50%", "y_alignment": "50%", "x": "100px", "y": "650px", "x_anchor": "0%", "y_anchor": "0%", "time": 32.3, "duration": 5.4, "enter": { "effect": "fade", "duration": 0.5 }, "exit": { "effect": "fade", "duration": 0.35 } },
    { "name": "Scene3Footer", "type": "text", "text": "Follow {{ClientName}} for more", "font_family": "Montserrat", "font_weight": "400", "font_size": "30px", "fill_color": "#ECA02D", "opacity": 0.8, "width": "1080px", "x_alignment": "50%", "x": "0px", "y": "1450px", "x_anchor": "0%", "y_anchor": "0%", "time": 32.9, "duration": 4.9, "enter": { "effect": "fade", "duration": 0.5 } }
  ]
}
```

`{{GOVERNED_LOGO_URL}}` / `{{ClientName}}` are placeholder tokens for the resolver-injected values — mirrors both proven builders' patterns. No live Creatomate call produced this JSON.

### 8.4 Required assets

`Logo` — governed asset, resolver-driven, REQUIRED fail-loud (`pp_logo_primary` for the property-pulse placeholder scoping). `client_brand_profile.brand_colour_primary` (composition background) and `brand_colour_secondary` (bars/accent text) via `getBrand()` — not `resolve_brand_assets`, no asset row involved. `client_brand_profile.brand_name` for the footer string. **No background image asset** — deliberate, to stay cheap-by-construction across a longer total duration than any single-scene template.

### 8.5 Platform/aspect suitability

9:16 / 1080×1920 — same as every governed video template today. Cited precedent is YouTube Shorts (kinetic's proven production graduation). Instagram Reels/TikTok/Facebook Reels are plausible same-aspect extensions, **not independently evidenced** — `platform_scope` enforcement (M4) is itself flagged as still-open in the delta audit.

### 8.6 Human-transposition checklist (for PK's future Creatomate editor session)

1. Create a new template in the Creatomate editor: 1080×1920, mp4, 30fps.
2. Create all 13 elements listed in §8.2 with **exact, case-sensitive names** — no more, no fewer.
3. Set each element's `time`/`duration`/position/animation per the worked JSON in §8.3 (a starting point, not a pixel-perfect mandate — PK/design judgment governs final look).
4. Confirm the saved template's default duration lands inside **[30, 45] seconds inclusive**.
5. Confirm `Logo.source` and the two bar `fill_color`s are dynamic (marked `dynamic: true` or editor-equivalent) so the resolver can inject them — **do not** bake a specific client's logo/colours into the saved template.
6. Decide the audio question (open Q5) deliberately before adding or omitting any audio element — do not default silently either way.
7. **Do not** register a `provider_template_id` in any registry file until `db-rls-auditor` + the full T3 chain has run (see §9 below) — transposition alone does not graduate anything.

### 8.7 Validation checklist (13-rung graduation ladder + M13 precondition)

| # | Item | Rung | Status |
|---|---|---|---|
| 1 | Real `provider_template_id` exists on the Creatomate account | rung 1 | required_before_registration |
| 2 | All 13 element names match exactly, case-sensitive, no more/fewer | rung 2 | required_before_registration |
| 3 | Output format/dimensions/duration match this contract exactly (mp4, 1080×1920, [30,45]s) | rung 3 | required_before_registration |
| 4 | `resolve_slot_assets`-equivalent succeeds for `Logo.source` on a real client before any real render | rung 4 | required_before_proof |
| 5 | Silent-audio scope confirmed deliberately (or a different audio decision made) | rung 5 (N/A if silent confirmed) | required_before_registration |
| 6 | PK visual approval on a controlled/manual render, with a concrete proof_event | rung 6 | required_before_graduation |
| 7 | A real render succeeds through the actual worker path — **measure submit-to-succeeded wall-clock vs the 120s ceiling** | rung 7 | required_before_graduation |
| 8 | That render is consumed into a real `m.post_draft` | rung 8 | required_before_graduation |
| 9 | The draft is actually published for the specific client/platform | rung 9 | required_before_graduation |
| 10 | `select_template` actually returns this template for the intended client/platform/format (needs a format_key first) | rung 10 | required_before_graduation |
| 11 | Byte-exact rollback proof exists before any DB registration apply | rung 11 | required_before_registration |
| 12 | `assignment_status` only moves to `production_proven` on client-attributable evidence | rung 12 | required_before_graduation |
| 13 | Post-promotion render/timeout/publish-failure rate is watched going forward | rung 13 | required_before_graduation |
| — | An M13 Blueprint document exists transcribing this design (this result doc + its artifacts) BEFORE the operator transposition sitting | M13 §7 sequencing precondition | **satisfied by this lane** |

## 9. Open issues (specialist's `open_questions`, all PK decisions, none resolved by this lane)

1. **format_key naming** — no `video_short_triptych` or equivalent exists; naming is a PK/product call.
2. **Client scope** — client-generic (this design) vs. client-scoped-first (mirroring stat-reveal's PP-specific v1)?
3. **Scene3Headline char limit** — 65 (kinetic cta convention, used here) vs. a fresh M6-specific number once a real prompt is authored; stat's differing 90-char CtaText limit was NOT used and should not be assumed compatible.
4. **Internal scene duration split** — the ~6s/17–36s-flexible/6s split is this lane's arithmetic proposal, not evidence-cited; only the 30–45s total is PK-ratified.
5. **Audio scope** — silent v1 (recommended, lower risk, mirrors kinetic) vs. voiceover/music bed (mirrors stat's combo-audio v2, but carries kinetic's own documented `VoiceAudio.source` regression risk).

Plus the two schema-fit findings in §6 (format_key taxonomy precondition; no citable video-scene pattern).

## 10. Next recommended step

PK decision on open questions #1–2 (format_key name + client scope) is the natural next gate — everything downstream (an M6-specific ai-worker prompt, a `db-rls-auditor` pass once a real template exists, the human transposition sitting itself) keys off those two answers. No autonomous next step is recommended; this lane's mandate (design + Blueprint transcription) is complete.

---

## 11. Verification (chat fills this)

**Verdict:** `Pass`

**Notes:**

- Output matches the four-task mission: (1) specialist invoked and returned `PACKAGE_READY`, (2) transcribed into a valid Blueprint JSON instance with the 3-scene question resolved as "no schema extension needed" and one real gap (format-key taxonomy) found and documented instead, (3) mechanically validated both positive (`clean`) and negative (`blocked`) against the real diff helper, (4) packaged with design doc, Blueprint JSON, transposition checklist, platform suitability, and the full 13-rung + 1 validation checklist.
- Constraints respected: zero network/DB/git/Creatomate-API touches at any point; nothing marked proven.
- No unexpected files changed — exactly the 4 files listed in §3.
- The mission's own "if the schema cannot express 3 scenes... document the gap" framing anticipated a gap that, on investigation, wasn't there — the real gap surfaced somewhere the mission didn't point (`compatible_ice_format_keys`'s existing-taxonomy-only constraint). Recording both the expected-and-absent finding and the unexpected-and-present one seemed more honest than only reporting the one the mission asked about.

## 12. Learning notes (chat fills this)

- The M13 fixture pair (`blueprint-pp-carousel-cover-v1.json` / `capture-pp-carousel-cover-clean.json`) is an excellent transcription template — reading it before authoring the M6 instance avoided guessing at field shape.
- `creatomate-specialist`'s first real mission produced a large, well-cited, internally-consistent package with explicit `to_be_calibrated` flags rather than invented numbers — matches its charter. Candidate-level scrutiny (per CLAUDE.md) still applies; nothing here should be treated as more authoritative than a first candidate-agent run warrants.
- Worth naming for a future M13 Lane 3 (registry persistence) brief: a Blueprint targeting a genuinely new format_key is currently schema-non-compliant on `compatible_ice_format_keys` by construction, until something (an earlier micro-step, or a relaxed schema note for "proposed, not yet governed" keys) resolves that ordering. Small, precise, worth carrying forward rather than fixing unilaterally here.
