# cc-0091 A1 — Asset Gap handoff: `video_short_kinetic` missing audio stream

**Created:** 2026-08-08 Sydney · **Author:** Claude Code (cc-0091 Gate A, A1)
**Status:** HANDOFF — **not written to any register or ledger.** Consumption is the Asset Gap
lane owner's act, under their own gate.
**Parent:** `docs/briefs/cc-0091-a1-instagram-video-format-determination-v1.md`
**Brief:** `docs/briefs/cc-0091-distribution-audience-growth-gate-a-brief-v3.md` (ISSUED, `241cb1c1`)

---

## The gap

`video_short_kinetic` renders **with no audio stream at all**. Measured by `ffprobe` across four
independent renders — 2026-07-16, 07-19, 07-26, 08-03 — all Property Pulse, all
`1080x1920 / h264 High / yuv420p / 30fps`, all returning **no audio stream**. Systematic, not a
one-off.

Its three siblings all carry AAC:

| Format | Audio | Duration |
|---|---|---|
| `video_short_stat` | aac 48 kHz 2ch | 12 s |
| `video_short_stat_voice` | aac 44.1 kHz 2ch | 20 s |
| `video_short_kinetic_voice` | aac 44.1 kHz 2ch | 27 s |
| **`video_short_kinetic`** | **none** | 27–34 s |

## Why it blocks Instagram

Instagram's Reels publishing requirements enumerate an audio codec (AAC, ≤48 kHz, 1–2 channels).
Every other requirement — container, video codec, chroma, width, aspect, frame rate, duration,
bitrate, file size, transport — **passes** for this format.

**Not asserted:** that Instagram rejects a silent MP4. That was **not tested**. This is why A1
classified the format `UNPROVEN` rather than `UNSUPPORTED_WITH_CAUSE`, and why the registry
correction leaves it at `instagram: false` with the cause recorded rather than flipping it.

## What would close it — two acceptable paths

- **(a) Governed audio attachment.** Attach a governed music bed at render time, matching its three
  siblings. This is asset demand and is the reason this handoff exists.
- **(b) Controlled silent-Reel proof.** One test publish. Accepted → the format is `SUPPORTED` and
  no asset is needed. Rejected → it becomes the first genuine `UNSUPPORTED_WITH_CAUSE` in the matrix.

**(b) is cheaper and should be tried first** — it may dissolve the asset requirement entirely. Both
paths are Gate B or later. Neither is authorised by cc-0091 Gate A.

## ⚠ Standing constraint — Lane 5 stays FROZEN

The obvious supplier for (a) is the `select_music` seed-rotation lane, **frozen** on branch
`lane5/select-music-seed-rotation @ b24ebe4` pending the Music Promotion gate raising the eligible
pool to 4.

**This dependency is RECORDED, NOT ACTIONED.** cc-0091's issued brief forbids unfreezing Lane 5 to
make this gate pass. If Lane 5 thaws on its own schedule, this gap may close as a side effect —
that is a welcome coincidence, not a reason to reprioritise it.

## ⚠ Register-fit problem — this gap fits neither half of the two-register model

Per `docs/briefs/ice-asset-gap-register-v1.md` §0.4 (D-1, PK 2026-08-01, Option C):

- `m.asset_gap_suggestion` / `ice_ro.asset_gap_backlog` is authoritative for **analyzer-detected,
  cell-attributable asset demand**.
- The markdown register is retained **only** for **pool-depth** items no detector can see.

This gap is **neither**. It is not pool depth — the music pool's size is irrelevant, because nothing
is being attached at all. And no analyzer detects it: the Asset Gap machinery tracks *asset demand*,
not *render-output shape defects*. A format emitting a structurally incomplete artifact is invisible
to both halves.

**Recommendation (PK decision, not taken here):** treat this as demand only if path (a) is chosen,
expressed as *"`video_short_kinetic` requires a governed audio bed at render time"* — which is
cell-attributable and would then belong in the DB ledger. Until (a) is chosen over (b), it is better
carried as an **A3 capability-state record** than forced into an asset register it does not fit.

That mismatch is itself a finding worth cc-0091 A3's attention: the current machinery can surface
*"we lack an asset"* but has no channel for *"the renderer emits an artifact that is structurally
unfit for the target platform."* Both are capability gaps; only one has a home.

## Non-claims

- Not claimed: that Instagram rejects silent video.
- Not claimed: that a music bed is required — (b) may remove the need entirely.
- Not claimed: any priority or severity rating. Severity is the Asset Gap lane owner's call under
  their own operating rule.
- Not done: no register edited, no ledger row written, no DB mutation of any kind.
