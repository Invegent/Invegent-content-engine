# cc-0091 A1 — Instagram short-video format determination

**Created:** 2026-08-08 Sydney
**Author:** chat
**Status:** determination complete — **NOTHING APPLIED**
**Parent brief:** `docs/briefs/cc-0091-distribution-audience-growth-gate-a-brief-v1.md`
**Question:** for each of the five short-video formats, can an Instagram Reel be produced and
published through the current governed pipeline **without changing the render artifact**?

---

## Method

Four sources reconciled, in order of authority (measured > declared):

1. **Artifact ground truth** — `ffprobe` run against real rendered `.mp4` files pulled from
   `m.post_render_log.storage_url` (public Supabase bucket, no signed token). This is
   measurement, not inference.
2. **Transport** — HTTP range-probe of each artifact URL (all returned `206`).
3. **Publisher capability** — `supabase/functions/instagram-publisher/index.ts`
   (`IG_VIDEO_FORMATS` at :154-158, `media_type = 'REELS'` at :328).
4. **Declared registry** — `t."5.3_content_format".platform_support->>'instagram'`.

## Measured artifact table

| Format | w×h | aspect | codec / pix_fmt | fps | audio | duration | size | v-bitrate |
|---|---|---|---|---|---|---|---|---|
| `video_short_avatar` | 720×1280 | 9:16 | h264 High / yuv420p | 25 | aac 48k 2ch | 32.9s | 7.6 MB | 1.85 Mbps |
| `video_short_stat` | 1080×1920 | 9:16 | h264 High / yuv420p | 30 | aac 48k 2ch | 12.0s | 3.4–9.7 MB | ≤6.5 Mbps |
| `video_short_stat_voice` | 1080×1920 | 9:16 | h264 High / yuv420p | 30 | aac 44.1k 2ch | 20.0s | 0.55 MB | 0.22 Mbps |
| `video_short_kinetic_voice` | 1080×1920 | 9:16 | h264 High / yuv420p | 30 | aac 44.1k 2ch | 27.0s | 1.03 MB | 0.31 Mbps |
| `video_short_kinetic` | 1080×1920 | 9:16 | h264 High / yuv420p | 30 | **NONE (4/4 samples)** | 27–34s | 0.15–0.20 MB | 0.05 Mbps |

Samples: `video_short_kinetic` probed across **four** renders (2026-07-16, 07-19, 07-26, 08-03) —
the missing audio stream is **systematic, not a one-off**. `video_short_stat` re-probed on two
**real brand** renders (Property Pulse 08-04, NDIS Yarns 08-02) after the first sample came from
`_smoke/`; both carry AAC.

## Against the Instagram Reels publishing requirements

| Requirement | Threshold | Measured | Result |
|---|---|---|---|
| Container | MP4 / MOV | `mov,mp4,m4a,…` (all) | PASS all |
| Video codec | H264 or HEVC | h264 High (all) | PASS all |
| Chroma | 4:2:0 | `yuv420p` (all) | PASS all |
| Width | 540–1920 px | 720 / 1080 | PASS all |
| Aspect | 9:16 recommended | exactly 9:16 (all) | PASS all |
| Frame rate | 23–60 fps | 25 / 30 | PASS all |
| Duration | 3 s – 15 min | 12–34 s | PASS all |
| Video bitrate | VBR ≤ 25 Mbps | ≤ 6.5 Mbps | PASS all |
| File size | ≤ 1 GB | ≤ 9.7 MB | PASS all |
| Audio | AAC, ≤48 kHz, 1–2 ch | aac 44.1/48 k 2 ch | PASS 4 · **ABSENT on `video_short_kinetic`** |
| Transport | publicly fetchable URL | public bucket, HTTP 206 | PASS all |

**Every geometry, codec, duration and transport requirement passes for all five formats.**
The single deviation across the entire matrix is the missing audio stream on `video_short_kinetic`.

## Determination

| Format | Registry says | Publisher allows | Live IG evidence | **Verdict** |
|---|---|---|---|---|
| `video_short_avatar` | `true` | yes | **6 Reels published**, latest 2026-06-19 | **SUPPORTED** — live-proven |
| `video_short_stat` | **`false`** | yes | none | **SUPPORTED** — spec-proven, live-unproven |
| `video_short_stat_voice` | **`null`** | yes | none | **SUPPORTED** — spec-proven, live-unproven |
| `video_short_kinetic_voice` | **`null`** | yes | none | **SUPPORTED** — spec-proven, live-unproven |
| `video_short_kinetic` | `false` | yes | none | **UNPROVEN** — cause identified: no audio stream |

**No format is UNSUPPORTED_WITH_CAUSE.** Nothing in the artifact or the transport justifies a
`false`.

### The leading hypothesis is confirmed: this is a registry defect

Three formats (`video_short_stat`, `video_short_stat_voice`, `video_short_kinetic_voice`) are
fully spec-compliant, already whitelisted by the publisher, and hosted on the **same public bucket
host that Instagram has already successfully fetched from six times**. Their `false`/`null` values
have **no discoverable cause**.

**The coincidence must not be over-read.** `video_short_kinetic` is marked `false` and does have a
genuine audio gap — but `video_short_stat` is *also* marked `false` and has no gap at all. Had the
flags been derived from artifact inspection, `video_short_stat` would read `true`. The flags were
therefore **not** derived from the artifacts, and `video_short_kinetic`'s correctness is
coincidental rather than evidence of a considered decision.

### Scope correction — `animated_*` are NOT part of this defect

`animated_data` and `animated_text_reveal` are also `false` for Instagram, but they are **absent
from `IG_VIDEO_FORMATS`** — the publisher would not publish them either way. Their `false` is
*consistent* with the publisher and is out of scope for A1. Only the `video_short_*` family
diverges.

### `video_short_kinetic` — why UNPROVEN, not UNSUPPORTED

Instagram's published Reels requirements enumerate an audio codec. A silent MP4 may still be
accepted by the Content Publishing API — I have **not** tested it and will not assert either way.
Two clean resolutions, both cheap:

- **(a)** One test publish. Accepted → flip to SUPPORTED. Rejected → genuine
  UNSUPPORTED_WITH_CAUSE, first real one in the matrix.
- **(b)** Attach the governed music bed, which makes the question moot and aligns the format with
  its three siblings.

**(b) connects to work already in flight:** the Lane 5 `select_music` seed-rotation lane is
**FROZEN** on branch `lane5/select-music-seed-rotation @ b24ebe4`, pending the Music Promotion gate
raising the eligible pool to 4. If that lane resumes, `video_short_kinetic`'s only Instagram
blocker closes as a side effect. **This is a dependency to record, not a reason to unfreeze
Lane 5.**

## What this changes about the incident

The Instagram regression is **narrower and more contained** than cc-0091 assumed. There is no
render or transport work to do. The repair is:

1. Correct three registry values (`video_short_stat`, `video_short_stat_voice`,
   `video_short_kinetic_voice` → `true`), leave `video_short_kinetic` at `false` **with a recorded
   cause** until (a) or (b) resolves it.
2. Restore a governed Instagram mix carrying a real discovery share.
3. A3 — make the renormaliser surface the gap instead of rebalancing into static.

**A3's importance is reinforced, not reduced.** The renormaliser consumed three values that had no
evidentiary basis and silently rewrote the Instagram mix to 100% static on 2026-07-25. It did not
fail — it did exactly what it was told, using data nobody had validated. The defect class is
*unvalidated capability data driving irreversible mix decisions with no surfaced gap*, and
correcting three booleans does nothing to prevent the next instance.

## Proposed amendments to cc-0091 (for PK review — not applied)

- **A1 scope narrows** to a 3-value registry correction + 1 recorded-cause entry. Delete the
  "determine whether ICE can produce an Instagram-shaped asset" investigation — answered here:
  it can, at 1080×1920 9:16 h264/AAC, and has been since 2026-03-31.
- **A1 gains** a `video_short_kinetic` audio-gap entry handed to the Asset Gap lane, with the
  Lane 5 dependency named.
- **Success criteria amend** — "no format left as an unexplained `false`/`null`" is now met for
  four of five; the fifth needs the cause *recorded*, not resolved, inside Gate A.
- **New risk to carry:** `video_short_avatar` is the only **live-proven** Instagram video format
  and is HeyGen-rendered (legacy API sunset ~Oct 2026). The three newly-SUPPORTED Creatomate
  formats are spec-proven but have never published a Reel. Gate B should publish **one Reel per
  format** before any mix leans on them — otherwise the mix would be restored on an untested path.
- **A2 caution:** do not weight the restored mix toward `video_short_kinetic` until its audio
  question closes.

## Non-claims

- Not claimed: that Instagram will accept the three newly-SUPPORTED formats in a live publish.
  Spec compliance is necessary, not sufficient — one live Reel per format is the proof.
- Not claimed: that Instagram rejects silent video.
- Not claimed: any reach or growth outcome. A1 is a capability determination only.
- Not verified: `animated_*` formats, LinkedIn/YouTube support values, or any client-level
  `c.client_format_config` override that may further filter these formats.

## Evidence index

- `ffprobe` measurements — 11 artifact probes, 2026-08-08, URLs from `m.post_render_log`.
- `m.post_render_log` — succeeded renders: kinetic 46 · kinetic_voice 17 · stat 45 ·
  stat_voice 25 · avatar 90 (heygen).
- `m.post_publish` (platform `instagram`) — `single_image` 172 · `carousel` 22 · legacy-null 22 ·
  `reel` 6 (all `video_short_avatar`, latest 2026-06-19).
- `t.platform_format_mix_default` — current IG rows `carousel` 60% + `image_quote` 40%,
  effective 2026-07-25, `evidence_source = cc-0079-slice-2`.
- `supabase/functions/instagram-publisher/index.ts:154-158, :328, :341-342`
  (the :341 comment "No reel has published yet" is **stale** — six have).
