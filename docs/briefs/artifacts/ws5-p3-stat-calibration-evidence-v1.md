# Probe-calibration evidence — `video_stat_reveal_9x16_v2` (Lane A P3, 2026-08-03)

**Method:** WS-5 kinetic probe precedent. 6 out-of-band template-mode renders of provider
`c11bb8ab-18bd-45ff-aedd-0a59cb3773ab` (post-eyebrow-parameterisation save, source fingerprint
`f98a8e082ac87655a44fbf8f4823ad0a5f2f81d8839f771a48952631e3751423`), direct API, NO
`select_template`, ZERO DB writes, NO publish. Judgment frames at t=10s (all elements settled).
Harness: `_harness/ws5_p3_stat_calibration/` (probe-render.ts + renders/ + frames/).
All renders 27–33s (2-min ceiling never approached).

## Probe register

| Probe | Render id | Local sha256 | Key inputs |
|---|---|---|---|
| R1 realistic-max | `62085407-e4ef-48bc-8cf2-a01a20c79072` | `843eafba…` | Stat `$1,234,567` 10ch · Label 35ch · Context 75ch · CTA 49ch · Eyebrow `MARKET UPDATE` |
| R2 gate-max wide | `b5378ff9-7e44-4a24-bff6-b7526c3c99cb` | `3811aef9…` | Stat `+$88,888,888` 12ch · Label 48ch · Context 160ch · CTA 90ch · Eyebrow `NDIS UPDATE` |
| R3 defect regression | `3e6fbe96-809c-403b-a226-87bfa652771a` | `67f7daa8…` | Stat `2 people` (8ch, 2 words — the oCrtq6R9VFQ fixture) |
| R4 bisect-low | `bb5033c6-fcec-43ab-8526-61e61c4967fd` | `2fb3e511…` | Stat `$62.17/hr` 9ch · Label 26ch · Context 103ch · CTA 38ch |
| R5 bisect-high | `4e0905ff-0c70-4d15-a980-7d63aff89b4e` | `206d88d8…` | Stat `$650,000` 8ch · Label 30ch · Context 130ch · CTA 42ch |
| R6 stat 7ch pin | `1f6cb404-f4b7-40ca-8349-cd09c15290de` | `6b923661…` | Stat `$88,888` 7ch wide-glyph (others known-pass) |

Also in evidence: the PP non-regression PASS render `a955d1f6…` (Eyebrow 13ch + defaults).

## Findings per element

- **StatValue** (92% width, y49, 20 vmin ≈ 216px Montserrat 900; NO autoscale): single tokens
  overflow-clip at canvas edges (12ch/9ch clip; 8ch edge-clips `$`); multi-word values WRAP —
  line 1 collides with EyebrowText, line 2 with StatLabel (R3 = exact live-incident geometry).
  **7ch wide-glyph single token passes (R6).** → `max_chars 7 · max_lines 1 · max_words 1`, all
  probe_calibrated. (The render-gate constant 12 and old prompt limit 12 were never one-line-safe.)
- **StatLabel** (single-line pill, y62, 4.2 vmin + 6% letter-spacing): clips at 35ch (R1),
  passes at 30ch (R5). → `max_chars 30 · max_lines 1`. (Render-gate 48 unsafe; old prompt 35 unsafe.)
- **ContextLine** (84% width, y72, 3.9 vmin, lh 142%): wraps gracefully; 103ch=3 lines clean (R4),
  130ch=4 lines pass (R5), 160ch=5 lines crowds label/CTA (R2). → `max_chars 130 · max_lines 4`.
  (Render-gate 160 = crowding; old prompt 75 was safe but needlessly tight? 75 stays well inside.)
- **CtaText** (single-line pill, y85, 4.4 vmin): 38ch clean (R4), 42ch flush-borderline (R5),
  49ch clips (R1). → `max_chars 38 · max_lines 1`. (Render-gate 90 and old prompt 65 far past safe.)
- **EyebrowText** (y40, 3.6 vmin, 38% letter-spacing): `MARKET UPDATE` 13ch wide margins
  (R1/R4/R6/a955d1f6), `NDIS UPDATE` 11ch (R2/R3/R5) — dynamic binding proven with BOTH
  governed values. → `max_chars 13 · max_lines 1`.
- **Consequence:** the deployed render-gate char constants (12/48/160/90) remain only a coarse
  floor; the persisted envelope above is the operative production guard (ai-worker v2.26.0
  enforces it at generation; the render gate stays as belt-and-braces).
