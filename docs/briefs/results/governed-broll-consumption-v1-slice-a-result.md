# Result — Governed B-roll Consumption v1 · SLICE A (direct-bind render-capability proof)

**Date:** 2026-07-28 Sydney
**Lane:** Governed B-roll Consumption v1 (PRODUCT_PROOF) · Slice A · **Tier T2 contained proof** (no production code change, no deploy, no DB write, no promotion)
**Brief:** `docs/briefs/governed-broll-consumption-v1-gate1-brief-DRAFT.md` (PK Gate-1 approved 2026-07-27)
**Verdict:** ✅ **PASSED PK visual gate** (2026-07-28)

## What was proven

The existing single-scene `video_short_stat` render path **can consume a full-frame B-roll VIDEO background layer**. A standalone Creatomate render of the PK-authored template `AU_generic_national_Suburb_9:16_V1` (`template_id 46c5c4ac-4d35-488c-b57c-44e05d790fb9`), rendered **by template id** with explicit `modifications`, dynamically bound `Background.source` (video element) to the fenced AU-suburb clip and composited the governed stat/logo/text over moving footage with audible audio.

This proves render **capability** only — NOT that ICE can *select* the clip automatically (that is Slice B).

## Criteria (all met)

| # | PK criterion | Result |
|---|---|---|
| 1 | Full-frame B-roll video layer in `video_short_stat` | ✅ aerial footage full-frame, z-under scrim/text/logo |
| 2 | No manual production promotion | ✅ clip `2d62b04e…` stayed **fenced** (`is_active=false`, `approved=false`, `production_use_allowed=false`, `approval_status='intake_candidate'`); public storage object read only |
| 3 | Acceptable framing + motion | ✅ native 9:16; footage visibly moves (frames 0.5s→6.5s show camera travel) — playing video, not a still |
| 4 | Audible audio | ✅ AAC stereo 48kHz / 277 kb/s (neutral music bed `neutral_piano_spring_005.mp3`) |
| 5 | Retry + timeout behaviour unchanged | ✅ zero worker/DB/deploy change — standalone harness, production untouched |
| 6 | No external publishing | ✅ contained render, downloaded to `_harness/` only; no `post_publish`, no draft row |
| — | Render time vs 2-min ceiling | ✅ **17.6s** wall-clock (8s clip @ 720×1280, 30fps) |

## Evidence

- Harness sub-root: `_harness/cc_broll_consumption_sliceA_20260728/`
- Render: `render_id 950a88d9-e747-4033-9d3d-03b4e31aa672`, `status=succeeded`, `wall_clock_s=17.6`
- Output: `renders/slice_a_broll_au_suburb.mp4` — `mp4_sha256 58fd69c13eb34da54c681c02722da65b4e8a06b4e18d3cb48c98c6ee72150882`, 4,429,318 B, 720×1280, 8.00s, h264 + AAC stereo
- Template element names bound to the worker contract (`Background`, `StatValue`, `StatLabel`, `ContextLine`, `CtaText`, `Logo`, `MusicBed`, `VoiceAudio`) → Slice B's worker side is verify-only
- Clip: `broll_pp_au_suburb_aerial.mp4` (asset `2d62b04e-c1b5-44df-b382-59cbb991e166`), native 9:16, silent, national-only geo

## Carry / notes

- **Polish (fold into template before Slice B production use):** in the first ~1s the "42%" hero sits over bright sky and is slightly low-contrast (clip is `needs_gradient_scrim`) — add a bottom-up dark gradient behind the text in the Creatomate editor.
- **Geo (C1):** the AU-suburb clip is national-only — never label it Perth/WA; `label_constraint`/`geo_scope` are not machine-enforced (promotion precondition).

## Next

**Slice B — governed resolver integration (T3):** (1) promote exactly one clip via the existing PK-controlled asset-promotion process (→ `approved=true`, `is_active=true`); (2) extend `resolve_slot_assets` to select `broll_background` (the named "danger point"); (3) register template `46c5c4ac` as a selectable PP `video_short_stat` variant with a `Background` (video) field; (4) prove automatic selection with no asset-ID literal. Eligibility gates (`is_active`/`approved`) stay unchanged. Full T3 chain + PK deploy hard stop + rollback-proven.
