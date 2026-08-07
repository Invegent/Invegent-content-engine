# Music Batch 2 — technical audio audit

## Executive verdict

- 13/13 filenames present.
- 13/13 SHA-256 hashes match the supplied manifest.
- 13/13 byte counts match.
- 13/13 decoded audio streams are unique.
- All files are stereo MP3 at 48 kHz; no major mono-cancellation risk was detected.
- Technical shortlist: **10 keep/conditional**, **3 hold pending human listen**.
- **7 tracks have positive original true peaks** and require controlled normalisation/limiting before production use.
- No licence text files were included in the ZIP, so this audit did not independently re-hash the licence snapshots.

## Decision recommendations

| # | Track | Verdict | VO masking | LUFS | TP dBTP | First 3s | Best loop |
|---:|---|---|---|---:|---:|---|---|
| 1 | `uplifting_lofi_walkingaway_013` | **KEEP — DO NOT RETAG YET** | Medium | -13.28 | 0.01 | moderate | 42.0–57.0s (15s) |
| 2 | `uplifting_lofi_hope_010` | **KEEP — PRIORITY** | Low–medium | -15.38 | 0.05 | low | 56.5–76.5s (20s) |
| 3 | `warm_lofi_humanagain_015` | **KEEP — NORMALISE** | Low | -13.93 | 0.25 | moderate | 159.0–174.0s (15s) |
| 4 | `neutral_lofi_shimmer_021` | **KEEP — NORMALISE** | Low–medium | -14.15 | 0.29 | low | 82.0–102.0s (20s) |
| 5 | `uplifting_lofi_springsight_011` | **KEEP — CONDITIONAL** | Low | -16.73 | -0.20 | low | 90.5–105.5s (15s) |
| 6 | `uplifting_lofi_tranquilmind_012` | **HOLD** | High | -13.79 | 0.23 | high | 113.0–133.0s (20s) |
| 7 | `uplifting_lofi_bubbles_014` | **KEEP — CONDITIONAL** | Medium | -13.69 | 0.02 | low | 58.0–73.0s (15s) |
| 8 | `warm_lofi_sunlight_016` | **KEEP — PRIORITY** | Low | -15.83 | -0.09 | low | 34.0–54.0s (20s) |
| 9 | `warm_lofi_warmfuzz_017` | **HOLD** | High | -14.17 | 0.10 | low | 35.0–50.0s (15s) |
| 10 | `warm_lofi_rooftops_018` | **KEEP — CONDITIONAL** | Low–medium | -14.88 | -0.20 | low | 95.5–110.5s (15s) |
| 11 | `calm_lofi_calmcurrents_019` | **KEEP** | Low | -15.08 | -0.90 | low | 16.5–46.5s (30s) |
| 12 | `calm_lofi_saturation_020` | **HOLD** | High | -10.51 | -0.09 | moderate | 117.0–137.0s (20s) |
| 13 | `neutral_lofi_softreset_022` | **KEEP** | Low–medium | -14.08 | -0.05 | low | 105.5–120.5s (15s) |

## Batch-level decisions

### Corporate gap

`uplifting_lofi_walkingaway_013` should **not** be re-tagged corporate from technical evidence alone. Its audio fingerprint clusters closely with the other lo-fi tracks; it is not a distinct corporate register. Keep the corporate gap open and hand-source at least one genuinely non-lo-fi corporate bed.

### All-lo-fi register

Acceptable as a **batch identity or lo-fi sub-pool**, but not as the final identity for all four brands. The tracks are acoustically tightly clustered, so PP and especially Invegent still need at least one non-lo-fi/corporate alternative.

### Timing

Do not intake all 13 automatically. Complete the human listen, retain the technical shortlist, and apply only survivors. Because every track remains `content_id_safe=false` and non-selectable, intake is pool-neutral, but there is no quality benefit in applying before the aural gate.

## Per-track notes

### `uplifting_lofi_walkingaway_013`

- **Verdict:** KEEP — DO NOT RETAG YET
- **Why:** Usable loop and moderate masking, but it is acoustically close to the other lo-fi tracks rather than technically distinct as corporate.
- **Facet note:** Keep uplifting/neutral-adjacent until a human corporate-tone verdict.

### `uplifting_lofi_hope_010`

- **Verdict:** KEEP — PRIORITY
- **Why:** Strong general-purpose technical profile: moderate voice-band density, sensible loudness and usable loop.
- **Facet note:** No technical reason to change uplifting; limiter needed after normalisation.

### `warm_lofi_humanagain_015`

- **Verdict:** KEEP — NORMALISE
- **Why:** Low voice-band masking and excellent loop point; long file and positive true peak need controlled excerpting.
- **Facet note:** Tempo may feel mid-time rather than slow.

### `neutral_lofi_shimmer_021`

- **Verdict:** KEEP — NORMALISE
- **Why:** Useful neutral bed with gentle opening and good dynamic range; original has positive true peak.
- **Facet note:** Neutral remains plausible; human listen still authoritative.

### `uplifting_lofi_springsight_011`

- **Verdict:** KEEP — CONDITIONAL
- **Why:** Lowest masking risk and quietest master, but highly dynamic and the weakest loop seam in the batch.
- **Facet note:** Tempo estimator is double-time ambiguous; retain pending listen.

### `uplifting_lofi_tranquilmind_012`

- **Verdict:** HOLD
- **Why:** Busy first three seconds, high onset density, high voice-band energy and positive true peak.
- **Facet note:** Energy likely reads above low; calm/uplifting boundary needs human review.

### `uplifting_lofi_bubbles_014`

- **Verdict:** KEEP — CONDITIONAL
- **Why:** Excellent short-loop seam and workable brightness; slightly hot peak and moderate voice-band density.
- **Facet note:** Tempo may feel slower than the manifest's mid label.

### `warm_lofi_sunlight_016`

- **Verdict:** KEEP — PRIORITY
- **Why:** Gentle fade-in, low voice-band masking, good dynamics and a solid 20-second loop.
- **Facet note:** Warm/slow remains technically consistent.

### `warm_lofi_warmfuzz_017`

- **Verdict:** HOLD
- **Why:** Excellent loopability but extremely high voice-band energy; most likely to mask narration.
- **Facet note:** Energy/tempo need human review; use only if texture is intentionally prominent.

### `warm_lofi_rooftops_018`

- **Verdict:** KEEP — CONDITIONAL
- **Why:** Warm, relatively low masking profile; loop seam is only workable rather than excellent.
- **Facet note:** Tempo may feel mid-time rather than slow.

### `calm_lofi_calmcurrents_019`

- **Verdict:** KEEP
- **Why:** Cleanest calm VO bed: low mid-band masking, safe true peak, good dynamics.
- **Facet note:** Keep calm; tempo may read mid-time rather than slow.

### `calm_lofi_saturation_020`

- **Verdict:** HOLD
- **Why:** Very loud and highly compressed (LRA 0.7 dB) with heavy mid-band energy; likely to compete with narration.
- **Facet note:** Energy should be reviewed upward; not a low-energy technical profile.

### `neutral_lofi_softreset_022`

- **Verdict:** KEEP
- **Why:** Balanced neutral candidate with strong loop candidates and moderate voice-band density.
- **Facet note:** Keep neutral; slow classification is technically plausible.

## Method and limitations

- Integrity: SHA-256, byte count, decoded-stream MD5 and metadata comparison.
- Audio QA: EBU R128 integrated loudness, loudness range, true peak, dynamics, clipping scan, stereo correlation, spectral balance and first-three-second transient analysis.
- Loop candidates: boundary similarity across chroma, loudness and spectral centroid at 15, 20 and 30 seconds.
- Tempo is algorithmic and frequently double-time ambiguous on lo-fi material.
- Mood, emotional tone, corporate character, clinical/saccharine feel and final brand fit remain human decisions.