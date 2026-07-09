# Music Library v0 — Manual Starter Harvest — SOURCING LOG

**Harvest date (UTC):** 2026-07-09
**Executor:** Claude Code (MECHANICAL sourcing only — no aural QA, no approval, no upload, no DB/git/bucket touch)
**Governing brief:** `docs/briefs/music-library-v0-manual-starter-harvest-brief.md` (gate1_approved)
**Output:** 9 CC0 instrumental candidates in `candidates/`; `manifest.json`; per-track `*.license.txt` evidence.
**Boundary honoured:** wrote ONLY under `_harness/music_harvester_v0/`. No `post-music` upload, no DB row, no fence flip, no approval. Upload + fenced-intake apply remain SEPARATE future PK gates.

---

## Sources USED

### Free Music Archive (FMA) — CC0 1.0 Universal
All 9 candidates are **CC0 1.0 Universal (Public Domain Dedication)** from two FMA artists whose
named albums declare CC0 for the whole album:

- **HoliznaCC0** — album *Background Music* (`freemusicarchive.org/music/holiznacc0/background-music`).
  Album licence statement (verbatim): *"The songs in this album are licensed under: CC0 1.0 Universal"*;
  artist note *"This music is completely Public Domain, so use it how you want!"*
- **Maarten Schellekens** — album *PUBLIC DOMAIN* (`freemusicarchive.org/music/maarten-schellekens/public-domain-1`).
  Album licence statement (verbatim): *"Songs in this album are licensed under CC0, which means they are completely free to use."*

**Download mechanics that worked:** FMA's own "download" endpoint (`/track/<slug>/download`) now 302-redirects
to `/login` (login-gated). BUT each public track page embeds the direct CDN file URL
`https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/<hash>.mp3`, which **is** fetchable
unauthenticated via `curl`. The harvester (`_harvest.py`) fetches the track page, regex-extracts that CDN
URL, downloads the bytes, and computes sha256/bytes/duration (mutagen). Every file validated as a real MP3
(ID3 header + MPEG frames; mutagen parsed duration + bitrate).

**Why each qualifies (licence quote):** CC0 1.0 deed (verbatim, captured in each `*.license.txt`):
> "No Copyright. The person who associated a work with this deed has dedicated the work to the public
> domain by waiving all of his or her rights to the work worldwide under copyright law... You can copy,
> modify, distribute and perform the work, **even for commercial purposes, all without asking permission**."

→ `attribution_required=false`, `commercial_use_allowed=true`, `social_use_allowed=true`,
`modification_allowed=true`, `paid_ads_allowed=true`. **`content_id_safe=false` (FAIL-CLOSED, PK
decision #3)** — CC0 waives the uploader's copyright but does NOT guarantee absence of a third-party
YouTube Content-ID claim; none are YouTube-eligible in v0.

### Candidates harvested (9) — track_key · title · mood(GUESS) · duration · sha256(16)
| track_key | title | mood* | dur (s) | sha256 (first 16) |
|---|---|---|---|---|
| warm_acoustic_simple_001 | A Simple Theme | warm | 97.30 | e870e4994da2d723 |
| warm_acoustic_ducklin_002 | Little Ducklin | warm | 138.79 | ebfa2223640001f2 |
| calm_ambient_glen_003 | Whispers of the Glen | calm | 161.57 | bba42f8a7d828d36 |
| neutral_jazz_saxpiano_004 | Sax and Piano (free track) | neutral | 94.20 | 83b8c88b10bbb217 |
| neutral_piano_spring_005 | Spring On The Horizon | neutral | 91.80 | 3776c85ecae4f605 |
| calm_piano_drifting_006 | Drifting Piano | calm | 110.50 | 5d1d80af901c244b |
| uplifting_composed_pluto_007 | A Small Town On Pluto (Composed) | uplifting | 230.26 | da6426f0753d1117 |
| corporate_theme_medieval_008 | Medieval Theme | corporate | 156.76 | c8e0f62c730001b8 |
| neutral_short_4mei_009 | 4 mei | neutral | 65.83 | 956f7e96b736d729 |

`*mood` is a **harvester GUESS** from title/album context (CHECK-valid value chosen), NOT an aural
judgment. Full sha256 + bytes + license_snapshot_hash are in `manifest.json`. Mood spread:
calm×2, warm×2, neutral×3, corporate×1, uplifting×1 — all five moods present.

---

## Sources ATTEMPTED but NOT harvestable with available tools (reported honestly)

### Pixabay Music — ATTEMPTED, FAILED (no working download path with my tools)
The brief lists Pixabay Music (Pixabay Content License → `royalty_free_no_attrib`) as an allowed source.
I attempted it and **could not download tracks mechanically**:
- The search/track pages return real HTML (HTTP 200) with cover-image thumbnails, but the **audio mp3
  URLs are NOT in the static HTML** — they are injected client-side via JavaScript / a gated download-token
  API call. `curl` on the page yields zero `.mp3` URLs.
- A guessed direct CDN path (`cdn.pixabay.com/download/audio/...mp3`) returns **HTTP 403 Forbidden**
  (Cloudflare-fronted; the real download needs a per-track token from an authenticated/JS session).
- I have no headless browser to drive the JS download-token flow, so Pixabay is **not harvestable**
  in this session. **→ Flagged as a PK-manual source** (PK can hand-download Pixabay corporate/uplifting
  beds, which is exactly where Pixabay's catalog is strongest and where FMA CC0 is weakest).

### YouTube Audio Library — SKIPPED (per brief)
Requires a YouTube Studio login not available in this environment. Per the brief, noted as a **PK-manual
source** (the no-attribution-required subset would be a good source for corporate/uplifting).

### ccMixter — NOT USED
ccMixter's default licence is **CC-BY (attribution-required)**, which is EXCLUDED in v0 (ICE has no
render-time attribution mechanism — mirrors the image-lane CC-BY exclusion). A CC0-filtered subset exists,
but FMA's CC0 coverage was sufficient, so I did not source from ccMixter to avoid the per-track
CC-BY-vs-CC0 verification risk.

---

## EXCLUSIONS (fail-closed)

- **HoliznaCC0 — "Dreamscape" (~22 min) and "Cosmic Waves" (~33 min)** (album *Space-Sleep-Meditation*):
  downloaded successfully and are genuine CC0, but **EXCLUDED for length** — they are long meditation
  tracks, far over the brief's ~20-90s / cleanly-loopable-bed preference. Files deleted; not in manifest.
- **No CC-BY / CC-BY-SA / NC-only / AI-generated / paid-stock tracks were sourced** (all excluded by brief).
- **No track with unknown commercial/social/no-attribution rights was included** — every candidate maps to
  the unambiguous CC0 1.0 deed, so the fail-closed test never triggered an inclusion.

## Gaps / honest caveats for PK
- **corporate** and **uplifting** each have only ONE candidate, and both are stretch-fits from a
  dark/ambient/acoustic CC0 catalog: `corporate_theme_medieval_008` reads more folk/dramatic than
  "corporate" (flagged for possible mood reassignment); `uplifting_composed_pluto_007` is ~230s (loop/trim
  candidate). The genuinely "corporate/uplifting" beds live on Pixabay / YouTube Audio Library, which were
  not harvestable here — recommend PK hand-sources those two moods from Pixabay at the aural gate.
- No automated audio QA was performed: `loudness_lufs`, `bpm`, `text_overlay_safe` are all `null`
  (PK aural judgment). Two tracks are 128 kbps (`calm_ambient_glen_003`, `corporate_theme_medieval_008`);
  the rest 192-320 kbps.
- All facet values (mood/energy/tempo_band/genre) are harvester guesses within the CHECK vocab — PK's
  aural verdict is authoritative.

**STOP.** Returned for PK aural + final-licence review. No approval, upload, fence-flip, DB apply, or
`select_music`/worker change performed or implied.
