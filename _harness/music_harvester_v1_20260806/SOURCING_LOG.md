# Music Library — BATCH 2 (four-brand mood cover) — SOURCING LOG

**Harvest date (UTC):** 2026-08-06
**Executor:** Claude Code (MECHANICAL sourcing only — no aural QA, no approval, no upload, no DB/git/bucket touch)
**Governing brief:** `docs/briefs/music-library-v0-manual-starter-harvest-brief.md` (gate1_approved 2026-07-09) —
the same allow-list, the same six-boolean fail-closed rule, the same fenced-intake mechanics.
Contingency path named at `docs/briefs/s3-m12-music-sourcing-plan-content-prep.md` §3a.
**Output:** 13 CC0 instrumental candidates in `candidates/` (keys `010`–`022`, continuing the batch-1
sequence); `manifest.json`; per-track `*.license.txt` evidence; `music_v1_batch2_intake_apply.sql`.
**Boundary honoured:** wrote ONLY under `_harness/music_harvester_v1_20260806/`. No `post-music`
upload, no DB row, no fence flip, no approval, no `select_music`/worker change. Upload + the
fenced-intake apply remain SEPARATE future PK gates.

---

## 1. Sources USED

### Free Music Archive — HoliznaCC0, four CC0 1.0 albums

| Album | Released | Tracks taken |
|---|---|---|
| `public-domain-lofi` | 2024-11-17 | 7 |
| `spring-woke-me-up` | 2026-05-31 | 3 |
| `summer-air-lo-fi` | 2026-04-29 | 2 |
| `we-drove-all-night-game-soundtrack` | 2026-05-03 | 1 |

Album licence statement (verbatim, identical on all four): *"The songs in this album are licensed
under: CC0 1.0 Universal"*.

**The album statement was NOT treated as sufficient.** The same FMA page also says *"Please check
individual tracks for their respective licenses"*, so a per-TRACK gate was added to the harvester
(`_harvest.py:extract_license` + the fail-closed branch): a track is downloaded **only if** its own
page carries `creativecommons.org/publicdomain/zero/1.0/` **and** carries **no**
`creativecommons.org/licenses/*` URL. All 13 passed; the check was re-run independently at
evidence-capture time (`_licence_evidence.py`) and all 13 passed again.

**Download mechanics** (unchanged from batch 1, still working): FMA's `/download` endpoint is
login-gated, but each public track page embeds the direct CDN URL
`https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/<hash>.mp3`, fetchable
unauthenticated. All 13 validated as real MP3 (ID3/MPEG frame header), all **320 kbps** — a quality
step up on batch 1 (which had two 128 kbps files).

**Six licence booleans** (identical derivation for all 13, from the CC0 1.0 deed):
`commercial_use_allowed=true` · `social_use_allowed=true` · `modification_allowed=true` ·
`paid_ads_allowed=true` · `attribution_required=false` · **`content_id_safe=false` (FAIL-CLOSED,
PK decision #3)** — CC0 waives the uploader's copyright but does not guarantee the absence of a
third-party YouTube Content-ID claim.

---

## 2. Sources ATTEMPTED but NOT usable (reported honestly)

### ⚠ FMA's own CC0 search filter is UNRELIABLE — the most important finding in this log

`freemusicarchive.org/search/?quicksearch=corporate&music-filter-CC0=1` returned four albums that
are **not CC0**. Every one was caught by per-album licence verification and **excluded before any
download**:

| Album surfaced by the "CC0" filter | Actual licence | Disposition |
|---|---|---|
| `audiocoffee/corporate` | CC BY-NC-ND 4.0 | EXCLUDED — attribution + non-commercial + no-derivatives |
| `synclab-music/corporate-2` | CC BY-ND 4.0 | EXCLUDED — attribution + no-derivatives |
| `waveloom/corporate-3` | CC BY-ND 4.0 | EXCLUDED — attribution + no-derivatives |
| `lowtone-music/this-upbeat-corporate-motivational-music` | CC BY-NC-ND 4.0 | EXCLUDED |
| `tolsetmusic/audio-logo` | CC BY-NC-ND 4.0 | EXCLUDED |

**Standing rule for any future music lane: never trust the FMA licence filter. Read the
`creativecommons.org/...` URL off the page itself, per track.** Had the filter been trusted, this
batch would have shipped attribution-required (and non-commercial) tracks into a library whose v0
rule is no-attribution-only, and ICE has no render-time attribution mechanism.

Also verified and excluded on the same basis: **Maarten Schellekens** albums other than the
batch-1 `public-domain-1` (`motion-score`, `soft-piano-music`, `cinematic-music`, `ambient-music`,
`soft-guitars` are CC BY / CC BY-NC).

### Pixabay Music — RE-ATTEMPTED 2026-08-06, STILL NOT HARVESTABLE
`https://pixabay.com/music/search/corporate/` now returns **HTTP 403** (Cloudflare) even for the
search page — worse than batch 1, where the page loaded but the mp3 URLs were JS/token-gated.
**→ remains a PK-manual source**, and it is exactly where the corporate gap would be filled.

### YouTube Audio Library — SKIPPED
Requires a YouTube Studio login unavailable in this environment. **→ PK-manual source.** Its
no-attribution subset is the other strong corporate/uplifting catalogue.

### ccMixter — NOT USED
Default licence CC-BY (attribution-required, excluded in v0). FMA CC0 coverage was sufficient for
the moods this batch could actually serve.

---

## 3. What was harvested (13) — all CC0, all 320 kbps, all instrumental

| track_key | title | mood* | dur (s) | sha256 (first 16) |
|---|---|---|---|---|
| `uplifting_lofi_hope_010` | Hope On Repeat | uplifting | 163.7 | `e781cf3926ea5b76` |
| `uplifting_lofi_springsight_011` | Spring In Sight | uplifting | 132.0 | `31b8701fbc795f05` |
| `uplifting_lofi_tranquilmind_012` | Tranquil Mindscape (Lofi, Happy, Reflection) | uplifting | 153.6 | `488d9693c13e44c5` |
| `uplifting_lofi_walkingaway_013` | Walking Away (Lofi, Peaceful, Motivating) | uplifting | 156.0 | `fd8a618a4076b76f` |
| `uplifting_lofi_bubbles_014` | Bubbles (Lofi, Bright, Relaxed) | uplifting | 147.6 | `73efb557d8cfcca0` |
| `warm_lofi_humanagain_015` | Feeling Human Again | warm | 230.9 | `896a6ddf192c6bca` |
| `warm_lofi_sunlight_016` | Faded in the Sunlight | warm | 178.2 | `0262718d6091a8a4` |
| `warm_lofi_warmfuzz_017` | Warm Fuzz (LoFi, Retro) | warm | 172.6 | `974ffd083b09aecb` |
| `warm_lofi_rooftops_018` | Roof Tops | warm | 214.5 | `f6e619fbfdc0898c` |
| `calm_lofi_calmcurrents_019` | Calm Currents (Lofi, Relax, Calm) | calm | 147.6 | `2dcb297376cfe0cb` |
| `calm_lofi_saturation_020` | Saturation (Lofi, Calm, Relaxed) | calm | 156.0 | `340a14dffd98001e` |
| `neutral_lofi_shimmer_021` | Shimmer (LoFi, Chill) | neutral | 180.7 | `5bf681363f35db4e` |
| `neutral_lofi_softreset_022` | Soft Reset | neutral | 185.6 | `9bedd59cdd0706be` |

`*mood` is a **harvester GUESS** from title/album/source-tag context (CHECK-valid value chosen),
**not** an aural judgment. PK's aural verdict is authoritative for every facet.

**Batch mood spread:** uplifting ×5, warm ×4, calm ×2, neutral ×2, **corporate ×0**.
**Library spread if this batch is applied:** warm 6 · uplifting 6 · neutral 5 · calm 4 · **corporate 1**.

### Dedup — clean
- **vs the 9 live rows:** zero `sha256` collisions, zero `track_key` collisions (checked against
  `ice_ro.music_governance_status`).
- **intra-batch:** `uplifting_lofi_bubbles_014` and `calm_lofi_calmcurrents_019` have an *identical*
  byte count (5,907,043) and identical duration (147.648 s), which looked like a disguised duplicate.
  It is not: hashing the MPEG audio frames with ID3 metadata stripped gives different digests
  (`0a3f676011b9ae01` vs `5308ac9e30d650a6`). Same 320 kbps CBR encode of the same duration produces
  the same file length — coincidence, not duplication. All 13 audio-frame hashes are distinct.

---

## 4. EXCLUSIONS (fail-closed)

- **All five non-CC0 albums in §2** — excluded on licence, before download.
- **Tracks excluded on tone**, not licence: `never-sleeping-lofi-dark-sad`,
  `canon-event-lofi-sad-reflection`, `seasonal-depression` (HoliznaCC0, all genuinely CC0) — the
  titles read explicitly dark/sad, which is wrong for all four brands and especially wrong for
  NDIS Yarns and Care For Welfare.
- **No CC-BY / CC-BY-SA / NC / ND / AI-generated / paid-stock track was sourced.**
- **No track with unknown commercial/social/no-attribution rights was included** — every candidate
  maps to the unambiguous CC0 1.0 deed.

---

## 5. Honest caveats for PK

1. **The corporate gap is NOT closed and this batch does not close it.** Zero corporate-mood tracks
   were added; the mood remains at 1 (`corporate_theme_medieval_008`, itself already flagged in the
   gate-1 packet as a probable mis-tag). Corporate beds are not harvestable from FMA CC0 — they live
   on Pixabay and the YouTube Audio Library, both PK-manual. **Invegent is the brand most exposed by
   this**, since corporate/neutral is its register.
   - Closest available substitute: `uplifting_lofi_walkingaway_013`, which the source itself tags
     *"Peaceful, Motivating"*. PK may elect `mood='corporate'` for it at the aural gate.
2. **All 13 are lo-fi.** That is a genuine stylistic narrowing versus batch 1's piano/acoustic/
   orchestral mix — it is what the CC0 catalogue actually offers at this quality. If a brand needs a
   non-lo-fi register, that is a PK-manual sourcing decision, not something this lane can fix.
3. **`genre='electronic'` on all 13** — lo-fi is sample-based/electronic and `lofi` is not in the
   CHECK vocabulary. An honest mapping, not a claim about instrumentation.
4. **No automated audio QA.** `loudness_lufs`, `bpm`, `text_overlay_safe` are all null — M1
   (automated loudness measurement) is the named prerequisite and has not landed.
5. **Four tracks exceed 180 s** (015 = 231 s, 018 = 214 s, 022 = 186 s, 021 = 181 s) — trim/loop
   candidates, not disqualifiers (`video-worker` requests a 12 s minimum).
6. **Brand fit in `manifest.json` is ADVISORY ONLY.** `m.music_track` is a GLOBAL pool with no
   `client_id`. Per-brand fit lives in `m.music_suitability` + `c.client_music_profile`, which belong
   to the scoped-approval gate — **not** to intake. The intake SQL writes neither.

---

## 6. The two standing blockers this batch does NOT change

Neither is a defect in this batch; both are named so the package is not mistaken for capability.

1. **Nothing here becomes selectable.** Live `select_music` requires `content_id_safe IS TRUE`
   unconditionally. All 13 are fail-closed `false`. Clearing that requires the **cc-0039 method** —
   PK builds a track-forward test clip, uploads it unlisted to a real YouTube channel, and reads the
   Content-ID status in YouTube Studio. That is an external, real-world act no agent can perform or
   fabricate.
2. **`select_music` still has no rotation.** Its ordering is
   `ORDER BY t.loudness_lufs NULLS LAST, t.duration_seconds DESC, t.track_key LIMIT 1` — one
   deterministic winner, forever. Because all 13 have `loudness_lufs = NULL` (sorts last),
   `calm_piano_drifting_006` would keep winning every call even if all 13 cleared Content-ID
   tomorrow. Growing the pool changes *which track could win*, never *whether the pool rotates*.
   A seed/rotation upgrade is its own PK-authorised resolver lane.

**STOP.** Returned for PK aural + final-licence review. No approval, upload, fence-flip, DB apply,
`select_music` change, or worker change performed or implied.
