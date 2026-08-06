#!/usr/bin/env python3
"""Capture per-track licence evidence snapshots for batch 2 (2026-08-06).

Mirrors the batch-1 evidence format (_harness/music_harvester_v0/candidates/*.license.txt)
exactly. For each track: re-fetch the PUBLIC track page, re-verify the per-track licence is
the unambiguous CC0 1.0 deed (fail-closed — the album page's own text says "Please check
individual tracks for their respective licenses", so the per-TRACK check is the real gate),
extract the track title, write the evidence snapshot, and compute its sha256 as the
license_snapshot_hash.

Evidence capture only. No aural QA, no approval, no upload, no DB.
"""
import os, re, json, html, hashlib, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "candidates")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

CC0_DEED = (
    "No Copyright. The person who associated a work with this deed has dedicated the work "
    "to the public domain by waiving all of his or her rights to the work worldwide under "
    "copyright law, including all related and neighboring rights, to the extent allowed by "
    "law. You can copy, modify, distribute and perform the work, even for commercial "
    "purposes, all without asking permission."
)

ALBUM_STATEMENT = (
    '"The songs in this album are licensed under: CC0 1.0 Universal" '
    "— HoliznaCC0 / Free Music Archive album page. The same page adds "
    '"Please check individual tracks for their respective licenses", so the per-TRACK '
    "licence was independently re-verified for this track (see PER-TRACK VERIFICATION below)."
)

TEMPLATE = """MUSIC LIBRARY v0 — LICENCE EVIDENCE SNAPSHOT
track_key: {track_key}
artist / creator: HoliznaCC0
source: Free Music Archive (freemusicarchive.org) — manual_harvest
title: {title}
track_page_url: {track_url}
album_page_url: {album_url}
direct_download_cdn_host: files.freemusicarchive.org/storage-freemusicarchive-org/tracks/*.mp3

=== LICENCE AS STATED ON SOURCE (verbatim) ===
license_type: CC0 1.0 Universal (Public Domain Dedication)
license_url: https://creativecommons.org/publicdomain/zero/1.0/
album_license_statement (verbatim from FMA album page):
{album_statement}

=== PER-TRACK VERIFICATION (fail-closed gate, batch 2) ===
creativecommons URLs found on THIS track's page: {lic_urls}
cc0_dedication_present: YES
attribution_licence_present (any creativecommons.org/licenses/*): NO
verdict: ADMISSIBLE — unambiguous CC0 1.0, no attribution-required licence on the page.
(Any track whose page carried a creativecommons.org/licenses/* URL was EXCLUDED at harvest
time by _harvest.py and never downloaded.)

=== CC0 1.0 UNIVERSAL DEED — VERBATIM WAIVER (from https://creativecommons.org/publicdomain/zero/1.0/) ===
{deed}

=== SIX LICENCE BOOLEANS — DERIVATION (fail-closed) ===
commercial_use_allowed = TRUE  — CC0 deed: "even for commercial purposes ... without asking permission".
social_use_allowed     = TRUE  — CC0 waives all rights worldwide; social/platform use permitted.
modification_allowed   = TRUE  — CC0 deed: "You can copy, modify, distribute and perform the work".
paid_ads_allowed       = TRUE  — CC0 imposes NO use restriction (incl. paid advertising).
attribution_required   = FALSE — CC0 waives copyright; no attribution obligation. (Publisher: attribution appreciated but NOT required.)
content_id_safe        = FALSE/UNKNOWN — FAIL-CLOSED per PK gate-1 decision #3. CC0 waives the uploader's copyright but does NOT guarantee the absence of a third-party YouTube Content-ID claim. NOT YouTube-eligible in v0.

NOTE: This is a downloaded-evidence snapshot captured mechanically during sourcing. No aural QA,
no approval, no upload. PK performs the aural + final licence judgment. Evidence-only.
"""


def fetch(url):
    r = subprocess.run(["curl", "-sS", "-L", "--max-time", "60", "-A", UA, url],
                       capture_output=True)
    return r.stdout.decode("utf-8", "replace")


def title_of(page_html, fallback):
    m = re.search(r"<title>(.*?)</title>", page_html, re.S | re.I)
    if not m:
        return fallback
    t = html.unescape(re.sub(r"\s+", " ", m.group(1))).strip()
    # FMA renders "<Track Title> - Free Music Archive" (and occasionally a "|" separator).
    t = re.sub(r"\s*[-–—|]\s*Free Music Archive.*$", "", t, flags=re.I)
    t = re.sub(r"^HoliznaCC0\s*[-–—]\s*", "", t)
    # Collapse FMA's spaced-out parenthetical mood tags: "( Lofi , Happy )" -> "(Lofi, Happy)"
    t = re.sub(r"\(\s*", "(", t)
    t = re.sub(r"\s*\)", ")", t)
    t = re.sub(r"\s+,", ",", t)
    return t.strip() or fallback


def main(harvest_files):
    records = []
    for hf in harvest_files:
        with open(os.path.join(CAND, hf)) as f:
            records.extend(json.load(f))

    hashes, meta = {}, {}
    for rec in records:
        if rec.get("error"):
            print("SKIP (harvest error):", rec["track_key"], rec["error"])
            continue
        tk, url = rec["track_key"], rec["page_url"]
        page = fetch(url)
        lic = sorted(set(re.findall(r"creativecommons\.org/[a-z0-9/\.\-]*", page)))
        cc0 = [u for u in lic if "publicdomain/zero/1.0" in u]
        bad = [u for u in lic if "licenses/" in u]
        if not cc0 or bad:
            print("FAIL-CLOSED EXCLUDE:", tk, lic)
            continue
        album_url = url.rstrip("/").rsplit("/", 1)[0]
        title = title_of(page, tk)
        body = TEMPLATE.format(
            track_key=tk, title=title, track_url=url, album_url=album_url,
            album_statement=ALBUM_STATEMENT, lic_urls=", ".join(lic), deed=CC0_DEED,
        )
        out = os.path.join(CAND, f"{tk}.license.txt")
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            f.write(body)
        hashes[tk] = hashlib.sha256(body.encode("utf-8")).hexdigest()
        meta[tk] = {"title": title, "album_url": album_url, "license_urls": lic}
        print(f"OK {tk:34} {title[:44]:46} {hashes[tk][:16]}")

    with open(os.path.join(CAND, "_license_hashes.json"), "w") as f:
        json.dump(hashes, f, indent=2)
    with open(os.path.join(CAND, "_track_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print(f"\n{len(hashes)} licence-evidence snapshots written.")


if __name__ == "__main__":
    main(sys.argv[1:] or ["_harvest_part1.json", "_harvest_part2.json"])
