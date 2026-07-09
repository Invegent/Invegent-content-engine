# Music Harvester v0 — manual starter-harvest workspace

> **Status: SCAFFOLD (prep). NO tracks harvested yet.** The Music Library v0 schema is LIVE
> (applied 2026-07-09, ships dark). This workspace stages the **manual** starter harvest for
> PK's gate-1 review. Nothing here is approved, uploaded live, or made selectable.
> Governing design: `docs/briefs/music-library-v0-schema-packet.md`. Live schema:
> `supabase/migrations/20260708224532_create_music_library_v0.sql`.

## What this lane is / is NOT
- **IS:** manually source a small pool of licence-clean **instrumental** background tracks →
  capture full provenance → build a manifest → human aural + licence review → **fenced** intake
  (all 4 fences false; nothing selectable).
- **IS NOT:** approval, promotion, fence-flip, live-selectable upload, `select_music()` build,
  `video-worker` change, `VIDEO_WORKER_MUSIC_ENABLED` flip, Creatomate wiring. Each of those is a
  separate future PK gate.

## Source allow-list (no-attribution-only — PK decision #1)
Admit ONLY licences that need **no attribution** and clear commercial + social use. Fail-closed:
any unknown right ⇒ the track is ineligible.

| Source | Licence class → `license_type` | Notes |
|---|---|---|
| Pixabay Music | Pixabay Content License → `royalty_free_no_attrib` | No attribution, commercial OK. Capture the licence text + per-track page URL. |
| YouTube Audio Library | (no-attribution subset only) → `royalty_free_no_attrib` | Use ONLY tracks marked no-attribution-required. Skip "attribution required" tracks. |
| CC0 sources (FMA CC0 filter, ccMixter CC0) | CC0 → `cc0` | Public-domain dedication; still capture source + licence snapshot. |
| Public-domain recordings | → `public_domain` | Verify PD status; capture evidence. |

**EXCLUDED in v0:** CC-BY, CC-BY-SA (attribution-required — ICE has no render-time attribution
mechanism, mirroring the image-lane CC-BY exclusion) · NC-only where commercial is needed ·
anything with unknown commercial/social/Content-ID rights.

## Starter target (PK decision #8)
5–10 tracks · `vocals = instrumental_only` · text-overlay-safe (not too busy under a voiceover) ·
moods ∈ {calm, corporate, uplifting, warm, neutral} · Property-Pulse-video-first but globally
reusable. Aim ~1–2 per mood for a balanced spread.

## Per-track metadata to capture (maps to the live columns)
For every candidate, record (→ `m.music_track` / `m.music_license`):
- **identity/provenance:** `track_key` (stable slug, e.g. `calm_corporate_neutral_001`), `title`,
  `creator`, `source='manual_harvest'`, `source_url`, `sha256` (of downloaded bytes), `bytes`,
  `mime`, `duration_seconds`.
- **licence (the 6 fail-closed booleans, set EXPLICITLY per track):** `license_type`,
  `license_name`, `license_snapshot` (saved text/screenshot) + `license_snapshot_hash`,
  `commercial_use_allowed`, `social_use_allowed`, `modification_allowed`, `paid_ads_allowed`,
  `attribution_required` (MUST be false for v0), `content_id_safe` (unknown ⇒ NOT YouTube-eligible).
- **facets (CHECK-valid values only — see packet §4):** `mood` ∈ calm/corporate/uplifting/warm/
  neutral · `energy` ∈ low/medium/high · `tempo_band` ∈ slow/mid/up · `genre` ∈ ambient/corporate/
  acoustic/electronic/orchestral/other · `vocals='instrumental_only'`.
- **human-judged (nullable in v0):** `loudness_lufs`, `bpm`, `text_overlay_safe`.
- **storage:** `storage_bucket='post-music'`, `storage_path='post-music/global/<mood>/<track_key>.mp3'`.

## Lane flow (PK non-rigid order)
1. Source/download candidates → `_harness/music_harvester_v0/candidates/` (this lane).
2. Compute `sha256` + capture licence evidence → `manifest.json` (this lane).
3. Human **aural + licence review** (this lane).
4. **Fenced intake** — INSERT into `m.music_track` + `m.music_license`, all 4 fences false,
   `WHERE NOT EXISTS`, storage byte-precheck + sha256 verify, in-txn neutrality assert (0 selectable)
   — mirrors `_harness/ndis_yarns_logo_intake_v0/ndis_logo_intake_apply.sql` (this lane, T2 dark apply).
5. **PK aural / scoped-approval gate** — SEPARATE, later.
6. **Upload-to-live + fence-flip** — SEPARATE, later.

## Files
- `README.md` — this plan (scaffold).
- `manifest.template.json` — per-track manifest shape (fill one entry per candidate).
- `candidates/` — downloaded candidate audio (empty until PK approves the harvest brief).
- `intake_template.sql` — (added with the gate-1 brief) fenced-INSERT template for the live schema.

## Open questions for PK (carried into the gate-1 brief)
- Does PK want to hand-pick tracks (aural judgment) or delegate the shortlist for PK review?
- Per-source `content_id_safe` posture: treat Pixabay/CC0 as content-id-safe, or mark unknown
  (⇒ not YouTube-eligible) until verified per track?
- Track length target (e.g. ~20–60s usable, or full-length + loopable)?
