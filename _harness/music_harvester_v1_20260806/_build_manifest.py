#!/usr/bin/env python3
"""Build the batch-2 harvest manifest (2026-08-06).

Joins the mechanical harvest output (sha256/bytes/duration) + the licence-evidence hashes
+ the curated facet GUESSES into a manifest whose values are all CHECK-valid against the
LIVE schema (supabase/migrations/20260708224532_create_music_library_v0.sql:81-137).

Facets (mood/energy/tempo_band/genre) are HARVESTER GUESSES from title/album context — no
aural QA was performed by the harvester. PK's aural verdict is authoritative.

v2 (2026-08-07) — PK AURAL REVIEW COMPLETE:
  · CULLED 1 track (neutral_lofi_shimmer_021) -> 12 survivors.
  · loudness_lufs now WRITTEN from the independent technical audit's measured EBU R128 values
    (audit/technical-audio-decision-table-v1.csv) instead of NULL. Read from the CSV at build
    time so the value is traceable to its evidence rather than hand-transcribed.
  · bpm stays NULL: the audit supplies an estimate but explicitly flags it double-time
    ambiguous and unreliable on lo-fi. Fail-closed — do not write a value the source itself
    calls unreliable.
  · text_overlay_safe stays NULL: neither audit measured it (it is a visual judgment about
    text over video, not an audio property).
  · PK ruled NO facet corrections at this stage, so mood/energy/tempo_band/genre are unchanged.
"""
import csv, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "candidates")
AUDIT_CSV = os.path.join(HERE, "audit", "technical-audio-decision-table-v1.csv")

# PK aural review 2026-08-07 — the ONLY cull. PK kept all three tracks the technical audit
# placed on HOLD and culled this one instead; the aural verdict is the deciding act.
CULLED = {"neutral_lofi_shimmer_021": "PK aural review 2026-08-07 — culled"}

# Live library mood counts BEFORE this batch (ice_ro.music_governance_status, read 2026-08-06).
LIVE_LIBRARY_SPREAD = {"warm": 2, "calm": 2, "neutral": 3, "corporate": 1, "uplifting": 1}

# track_key -> (mood, energy, tempo_band, genre, brand_fit_advisory, facet_note)
# CHECK vocabularies (live schema):
#   mood       calm|corporate|uplifting|warm|neutral
#   energy     low|medium|high
#   tempo_band slow|mid|up
#   genre      ambient|corporate|acoustic|electronic|orchestral|other
FACETS = {
    "uplifting_lofi_hope_010":         ("uplifting", "medium", "mid",  "electronic", ["ndis-yarns", "care-for-welfare", "property-pulse"], "Title reads hopeful/forward-moving; strongest 'positive news' bed candidate in the batch."),
    "uplifting_lofi_springsight_011":  ("uplifting", "medium", "mid",  "electronic", ["ndis-yarns", "care-for-welfare"], "Spring/renewal framing; shortest uplifting track (132s)."),
    "uplifting_lofi_tranquilmind_012": ("uplifting", "low",    "slow", "electronic", ["ndis-yarns", "care-for-welfare"], "Source tags it 'Happy, Reflection' — uplifting but low-energy; sits between calm and uplifting."),
    "uplifting_lofi_walkingaway_013":  ("uplifting", "medium", "mid",  "electronic", ["invegent", "property-pulse"], "Source tags it 'Peaceful, Motivating' — the closest thing in this batch to a CORPORATE bed; PK may prefer re-tagging mood=corporate after a listen."),
    "uplifting_lofi_bubbles_014":      ("uplifting", "medium", "mid",  "electronic", ["property-pulse", "invegent"], "Source tags it 'Bright, Relaxed' — bright without being saccharine."),
    "warm_lofi_humanagain_015":        ("warm",      "low",    "slow", "electronic", ["ndis-yarns", "care-for-welfare"], "Longest in batch (231s) — trim/loop candidate. Human-centred title suits care-sector tone."),
    "warm_lofi_sunlight_016":          ("warm",      "low",    "slow", "electronic", ["care-for-welfare", "ndis-yarns"], "Soft/warm summer framing."),
    "warm_lofi_warmfuzz_017":          ("warm",      "medium", "mid",  "electronic", ["property-pulse", "care-for-welfare"], "Retro-tinted warmth; more texture than the other warm picks."),
    "warm_lofi_rooftops_018":          ("warm",      "low",    "slow", "electronic", ["property-pulse"], "214s — trim/loop candidate. Rooftop/urban framing reads property-adjacent."),
    "calm_lofi_calmcurrents_019":      ("calm",      "low",    "slow", "electronic", ["ndis-yarns", "care-for-welfare", "property-pulse"], "Source tags it 'Relax, Calm' — general-purpose calm bed."),
    "calm_lofi_saturation_020":        ("calm",      "low",    "slow", "electronic", ["property-pulse", "invegent"], "Source tags it 'Calm, Relaxed'."),
    "neutral_lofi_shimmer_021":        ("neutral",   "low",    "mid",  "electronic", ["invegent", "property-pulse"], "Unobtrusive chill bed — neutral backdrop, low personality."),
    "neutral_lofi_softreset_022":      ("neutral",   "low",    "slow", "electronic", ["invegent", "property-pulse"], "From a game-soundtrack album; restrained, non-narrative."),
}

BRAND_TONE = {
    "property-pulse":   "Property market news — professional, credible, non-salesy. Wants neutral/calm beds and restrained uplift for positive market data.",
    "ndis-yarns":       "NDIS/disability services — warmth and dignity, never clinical and never saccharine. Wants warm + genuinely hopeful uplift.",
    "care-for-welfare": "Welfare/care sector — warm, human, gentle. Wants warm + calm.",
    "invegent":         "Parent/consulting brand — neutral, composed, corporate-leaning. Wants neutral + corporate (the batch's thinnest mood — see gaps).",
}


def main():
    recs = []
    for f in ("_harvest_part1.json", "_harvest_part2.json"):
        recs += json.load(open(os.path.join(CAND, f)))
    lic_hashes = json.load(open(os.path.join(CAND, "_license_hashes.json")))
    meta = json.load(open(os.path.join(CAND, "_track_meta.json")))

    # Measured EBU R128 integrated loudness, read from the independent audit's own table.
    audit = {row["track_key"]: row
             for row in csv.DictReader(open(AUDIT_CSV, encoding="utf-8-sig"))}

    tracks, mood_spread, brand_index = [], {}, {b: [] for b in BRAND_TONE}
    culled = []
    for r in sorted(recs, key=lambda x: x["track_key"]):
        tk = r["track_key"]
        if r.get("error") or tk not in lic_hashes:
            continue
        if tk in CULLED:
            culled.append({"track_key": tk, "reason": CULLED[tk]})
            continue
        if tk not in audit:
            raise SystemExit(f"ABORT: no measured loudness for surviving track {tk}")
        mood, energy, tempo, genre, brands, note = FACETS[tk]
        mood_spread[mood] = mood_spread.get(mood, 0) + 1
        for b in brands:
            brand_index[b].append(tk)
        tracks.append({
            "music_track": {
                "track_key": tk,
                "title": meta[tk]["title"],
                "source": "manual_harvest",
                "storage_bucket": "post-music",
                "storage_path": f"post-music/global/{mood}/{tk}.mp3",
                "sha256": r["sha256"],
                "mime": "audio/mpeg",
                "bytes": r["bytes"],
                "duration_seconds": r["duration_seconds"],
                # Measured (EBU R128 integrated), from the independent technical audit.
                "loudness_lufs": float(audit[tk]["integrated_lufs"]),
                # Deliberately NULL — the audit's tempo estimate is flagged double-time
                # ambiguous and unreliable on lo-fi. Fail-closed.
                "bpm": None,
                "mood": mood,
                "energy": energy,
                "tempo_band": tempo,
                "genre": genre,
                "vocals": "instrumental_only",
                "text_overlay_safe": None,
                "approval_status": "intake_candidate",
                "approved": False,
                "production_use_allowed": False,
                "is_active": False,
            },
            "music_license": {
                "license_type": "cc0",
                "license_name": "CC0 1.0 Universal (Public Domain Dedication)",
                "source_url": r["page_url"],
                "license_snapshot_hash": lic_hashes[tk],
                "license_snapshot_path": f"_harness/music_harvester_v1_20260806/candidates/{tk}.license.txt",
                "commercial_use_allowed": True,
                "social_use_allowed": True,
                "modification_allowed": True,
                "paid_ads_allowed": True,
                "attribution_required": False,
                "content_id_safe": False,
                "expiry_date": None,
            },
            "advisory_only": {
                "brand_fit_suggestion": brands,
                "facet_note": note,
                "local_file": r["local_file"],
                "bitrate": r["bitrate"],
                "album_page_url": meta[tk]["album_url"],
            },
        })

    manifest = {
        "lane": "music-harvester-v1-batch2-four-brands",
        "status": "pk_aural_review_COMPLETE_pending_apply_gate",
        "harvest_date_utc": "2026-08-06",
        "harvester": "Claude Code (mechanical sourcing) — NO approval/upload/DB/git; all aural + final-licence judgment is PK's",
        "schema_target": "m.music_track + m.music_license (live migration 20260708224532)",
        "predecessor_batch": "_harness/music_harvester_v0 (9 tracks, keys 001-009) — this batch continues the key sequence at 010",
        "source_summary": {
            "used": "Free Music Archive — CC0 1.0 tracks by HoliznaCC0, albums: public-domain-lofi, spring-woke-me-up, summer-air-lo-fi, we-drove-all-night-game-soundtrack (direct CDN files.freemusicarchive.org)",
            "fma_cc0_search_filter": "UNRELIABLE — FMA's 'music-filter-CC0=1' search parameter returned CC BY-ND / CC BY-NC-ND albums (audiocoffee/corporate, synclab-music/corporate-2, waveloom/corporate-3, lowtone-music, tolsetmusic). ALL EXCLUDED after per-album licence verification. Never trust the filter; verify the licence URL on the page.",
            "pixabay_music": "RE-ATTEMPTED 2026-08-06, STILL NOT HARVESTABLE — https://pixabay.com/music/search/corporate/ returns HTTP 403 (Cloudflare). Unchanged from batch 1. Flagged PK-manual.",
            "youtube_audio_library": "SKIPPED — YouTube Studio login unavailable in this environment. PK-manual source.",
            "ccmixter": "NOT USED — default licence CC-BY (attribution-required, excluded in v0).",
        },
        "constraints_applied": {
            "license_types_present": ["cc0"],
            "attribution_required_on_every_track": False,
            "content_id_safe_on_every_track": False,
            "vocals": "instrumental_only",
            "per_track_licence_verification": "Every track page was independently re-checked for creativecommons.org/publicdomain/zero/1.0/ AND the absence of any creativecommons.org/licenses/* URL. Fail-closed: a non-CC0 page is excluded before download.",
            "storage_path_pattern": "post-music/global/<mood>/<track_key>.mp3 (PATH ONLY — nothing uploaded)",
            "dedup": "No sha256 or track_key collision with the 9 live rows. Intra-batch audio-frame hashing (ID3 stripped) found no duplicate recordings.",
        },
        "pk_aural_review": {
            "date": "2026-08-07",
            "verdict": "COMPLETE — 12 KEEP, 1 CULL",
            "culled": culled,
            "facet_corrections": "NONE required from PK review at this stage",
            "corporate_gap": "REMAINS OPEN — uplifting_lofi_walkingaway_013 NOT re-tagged corporate",
            "batch_identity": "all-lo-fi register ACCEPTED for this batch (sub-pool, not fleet identity)",
            "note": "PK retained all three tracks the independent technical audit placed on HOLD "
                    "(calm_lofi_saturation_020, uplifting_lofi_tranquilmind_012, warm_lofi_warmfuzz_017) "
                    "and culled neutral_lofi_shimmer_021 instead. The aural verdict is the deciding act; "
                    "the technical audit is advisory.",
        },
        "mood_spread_this_batch": mood_spread,
        "mood_spread_library_after_intake_if_applied": {
            k: LIVE_LIBRARY_SPREAD.get(k, 0) + mood_spread.get(k, 0)
            for k in sorted(set(LIVE_LIBRARY_SPREAD) | set(mood_spread))
        },
        "brand_fit_advisory": {
            "WARNING": "ADVISORY ONLY. m.music_track is a GLOBAL pool with no client_id column. Per-brand fit is expressed by m.music_suitability + c.client_music_profile rows, which belong to the SCOPED-APPROVAL gate, NOT to intake. Nothing in this section is applied by the intake SQL.",
            "brand_tone_basis": BRAND_TONE,
            "suggested_index": brand_index,
        },
        "count": len(tracks),
        "important_notes": [
            "NO track uploaded to the post-music bucket. NO DB row. NO fence flipped. NO approval. Upload + intake-apply are SEPARATE future PK gates.",
            "mood/energy/tempo_band/genre are HARVESTER GUESSES (CHECK-valid values only); PK aural review is authoritative for facets + eligibility.",
            "genre='electronic' on all survivors — lo-fi is sample-based/electronic and 'lofi' is not in the CHECK vocabulary. Honest mapping, not a claim about instrumentation.",
            "content_id_safe=false on ALL survivors (fail-closed, PK decision #3) => none are YouTube-eligible, and none become selectable by select_music, which requires content_id_safe IS TRUE.",
            "loudness_lufs is now MEASURED (EBU R128 integrated, from the independent technical audit) and written to every survivor row. SELECTION-NEUTRAL: the live winner calm_piano_drifting_006 is -27.2 LUFS and still sorts ahead of all survivors under select_music's ORDER BY loudness_lufs ASC.",
            "bpm stays NULL — the audit's tempo estimate is explicitly flagged double-time ambiguous and unreliable on lo-fi; fail-closed rather than write an unreliable value.",
            "text_overlay_safe stays NULL — neither audit measured it (it is a visual judgment about text over video, not an audio property).",
            "7 survivors carry POSITIVE true peaks (+0.01..+0.29 dBTP) and integrated loudness spans 6.22 dB. ICE has NO loudness normalisation or true-peak limiting in the render path (ffmpeg cannot run in an Edge Function; true-LUFS is a deferred Phase B). Bed volume is baked into the Creatomate template and is NOT readable from this repo — that value decides whether this is neutralised or real. Intake stores the licence-exact CC0 bytes; normalisation is a decision for when a track becomes selectable, NOT for intake (it would change every sha256).",
            "CORPORATE mood: ZERO added. The mood remains at 1 (the batch-1 'Medieval Theme', itself flagged as a mis-tag). Corporate beds are not harvestable from FMA CC0 — they live on Pixabay / YouTube Audio Library, both PK-manual. This is an unresolved gap, reported not papered over.",
            "uplifting_lofi_walkingaway_013 was NOT re-tagged corporate (PK 2026-08-07, backed by the audit: it clusters acoustically with the rest of the lo-fi batch and is not a distinct corporate register).",
            "Three survivors exceed 180s (015 231s, 018 214s, 022 186s) — trim/loop candidates, not disqualifiers (video-worker requests a 12s minimum).",
            "CULLED at the PK aural gate: neutral_lofi_shimmer_021. Its licence evidence and audio remain in the harness for provenance but it is NOT in the intake set. Culling it drops NEUTRAL to a single new track and reduces Invegent's advisory suggestions from 5 to 4 — Invegent stays the weakest-covered brand.",
        ],
        "tracks": tracks,
    }

    out = os.path.join(HERE, "manifest.json")
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"manifest.json written — {len(tracks)} tracks ({len(culled)} culled)")
    print("mood spread this batch:", mood_spread)
    for b, ks in brand_index.items():
        print(f"  {b:18} {len(ks)} suggested")


if __name__ == "__main__":
    main()
