# Probe 1 — duration overridability (WS-4 pkg §15 Q4 / §14 behavioural) — ANSWERED: YES

**Date:** 2026-08-01 · **Template:** `generic_kinetic_text_9x16_v1` / `0bd871ae-79c1-431a-a7bd-9f631a6cf75a`
(registry `9ad024cc-3eda-488e-b346-bc661ec70a6a`) · **Authorised:** PK ("run the first probe").
**Key conveyance:** local file per cc-0033 precedent; key ROTATED since cc-0033 — new pin
`bcde13d1` (sha256 prefix), validated read-only before spend; value never in transcript.

| Probe | Request | Result | Measured duration (ffprobe) | Wall-clock | Render id |
|---|---|---|---|---|---|
| A_control | template-mode render, `HookHeadline.text` modified, NO duration override | succeeded | **35.00 s** (= saved timeline) | 30.9 s | `982e8abb-1e48-4240-94b9-39ef2fd57526` |
| B_bare_duration_mod | same + bare `"duration": 27` INSIDE `modifications` | succeeded | **27.00 s** | 23.4 s | `fc7e2707-7507-4d82-bb29-e690112b0ae4` |
| C_toplevel_duration | fallback — NOT RUN (B succeeded exactly) | — | — | — | — |

## Findings

1. **Q4 = YES.** A bare `duration` key inside template-mode `modifications` overrides the saved
   composition duration exactly (35 → 27.00 s measured). The WS-4 §5 timing mechanism (worker
   computes Σ scene durations, writes per-element `.time`/`.duration` + top-level `duration`) is
   viable as designed — no redesign needed.
2. **Modification-key form confirmed on the video family** (§14/§5b): the suffixed
   `HookHeadline.text` key was accepted and applied on both renders (cc-0049's resolution, proven
   before only on image quote cards, now holds for this video template).
3. **Reliability (§9a):** 30.9 s and 23.4 s wall-clock — comfortably clear of the 2-minute
   ceiling; the render-cheap-by-construction claim (solid colour + text, no video decode) is
   supported. Note the tiny file sizes (173 KB / 142 KB for 35 s / 27 s 1080×1920) — flat-colour
   content compresses extremely well.
4. **Bonus rung-1 evidence:** the template's provider existence was confirmed by DIRECT API read
   (`GET /v1/templates` shows id + exact name) — stronger than the vendored-JSON method the
   graduation contract describes as the current best available.

## Evidence files (local, not committed — sha256 recorded)

- `A_control.mp4` — sha256 `58abac67b05a03b56f320ab5289d266f2dd0dd4806ee960a1f49c05a17dfbc1c`
- `B_bare_duration_mod.mp4` — sha256 `bc8c6e9d56c9d99bb612fd4ee0ede992b4105b05405ce4aa3c9b5e30a4f52866`
- `probe1_results.json` — full records (committed)

## What this does NOT prove (remaining probe queue)

Collapse-mechanism behaviour (§15 Q2: near-zero-duration slot leak), shape-element `.time`/
`.duration` overrides, `source:""` silence on THIS composition, and the 10 text-calibration items
(hook/point/CTA max_lines sweeps, worker-string max_chars) — next probe batches.
