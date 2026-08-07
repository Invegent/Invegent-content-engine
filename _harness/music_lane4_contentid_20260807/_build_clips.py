#!/usr/bin/env python3
"""Build Content-ID test clips for the Lane 4 minimum representative set (2026-08-07).

Each clip is a neutral dark still carrying the FULL track at UNITY gain — no VO, no attenuation,
nothing that would weaken the fingerprint Content-ID needs to match against. Identity is carried by
the filename because YouTube titles an upload from its filename.

The .mp4 outputs are deliberately NOT committed (matching this repo's standing practice: zero media
binaries tracked). They are regenerable from the batch-1 .mp3 sources with this script, and
_clips.json records both the clip sha256 and its source .mp3 sha256 so a rebuild is verifiable.

Produces evidence only. No upload, no DB write, no approval.
"""
import subprocess, os, json, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), "music_harvester_v0", "candidates")
OUT = os.path.join(HERE, "clips")

# Minimum representative set (PK 2026-08-07: minimum needed to prove multi-track selection).
# All three are BATCH-1 rows that ALREADY EXIST in production, so this lane carries no dependency
# on the blocked batch-2 apply. Chosen for mood diversity against the sole live track (calm).
TRACKS = [
    ("uplifting_composed_pluto_007", "uplifting", "sole uplifting track in batch 1"),
    ("warm_acoustic_simple_001",     "warm",     "shortest warm track (97.3s)"),
    ("neutral_short_4mei_009",       "neutral",  "shortest track overall (65.8s) - cheapest to test"),
]


def sha256(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def main():
    os.makedirs(OUT, exist_ok=True)
    results = []
    for tk, mood, why in TRACKS:
        src = os.path.join(SRC, f"{tk}.mp3")
        out = os.path.join(OUT, f"{tk}__contentid_test.mp4")
        if not os.path.exists(src):
            raise SystemExit(f"ABORT: source audio missing for {tk} — the batch-1 harness is the only copy")
        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "lavfi", "-i", "color=c=#101418:s=1280x720:r=15",
            "-i", src,
            "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-ar", "48000",
            "-shortest", "-movflags", "+faststart", out,
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            raise SystemExit(f"ABORT: ffmpeg failed for {tk}: {r.stderr[:300]}")
        results.append({
            "track_key": tk, "mood": mood, "rationale": why,
            "source_mp3_sha256": sha256(src),
            "clip": os.path.basename(out),
            "clip_bytes": os.path.getsize(out),
            "clip_sha256": sha256(out),
        })
        print(f"  built {os.path.basename(out):48} {os.path.getsize(out)/1e6:6.2f} MB")

    with open(os.path.join(OUT, "_clips.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(results, f, indent=2)
    print(f"\n{len(results)}/{len(TRACKS)} clips built")
    print("Upload UNLISTED or PRIVATE only. PK reads the verdict in YouTube Studio; "
          "no agent may infer or fabricate a Content-ID result.")


if __name__ == "__main__":
    main()
