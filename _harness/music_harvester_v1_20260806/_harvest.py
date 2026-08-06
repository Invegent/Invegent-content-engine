#!/usr/bin/env python3
"""FMA CC0 track harvester (mechanical) — batch 2, 2026-08-06.

Adapted verbatim in mechanics from _harness/music_harvester_v0/_harvest.py (the PROVEN
batch-1 path): fetch the public track page, regex-extract the direct CDN mp3 URL, download
the bytes, compute sha256-of-bytes + byte count + duration.

NO judgment, NO upload, NO DB, NO approval. Writes ONLY under candidates/.
"""
import re, sys, os, hashlib, subprocess, json

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "candidates")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"


def curl(url, out=None):
    args = ["curl", "-sS", "-L", "--max-time", "180", "-A", UA]
    if out:
        args += ["-o", out]
    args += [url]
    return subprocess.run(args, capture_output=True)


def fetch_html(url):
    r = subprocess.run(["curl", "-sS", "-L", "--max-time", "60", "-A", UA, url],
                       capture_output=True)
    return r.stdout.decode("utf-8", "replace")


def extract_mp3(html):
    un = html.replace("\\/", "/")
    urls = re.findall(r'https://files\.freemusicarchive\.org/[^"\'\\ ]+?\.mp3', un)
    return sorted(set(urls))


def extract_license(html):
    """Return the set of creativecommons licence URLs declared on the page."""
    return sorted(set(re.findall(r'creativecommons\.org/[a-z0-9/\.\-]*', html)))


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def duration_mp3(p):
    from mutagen.mp3 import MP3
    m = MP3(p)
    return round(m.info.length, 3), m.info.bitrate


def harvest(track_key, page_url):
    html = fetch_html(page_url)
    lic = extract_license(html)
    # FAIL-CLOSED: only the CC0 1.0 public-domain dedication is admissible.
    cc0 = [u for u in lic if "publicdomain/zero/1.0" in u]
    non_cc0 = [u for u in lic if "licenses/" in u]
    if not cc0 or non_cc0:
        return {"track_key": track_key, "page_url": page_url,
                "license_urls_found": lic,
                "error": "license_not_unambiguously_cc0_EXCLUDED"}

    mp3s = extract_mp3(html)
    if not mp3s:
        return {"track_key": track_key, "page_url": page_url,
                "error": "no_cdn_mp3_url_found"}
    mp3_url = mp3s[0]
    out = os.path.join(CAND, f"{track_key}.mp3")
    r = curl(mp3_url, out=out)
    if r.returncode != 0 or not os.path.exists(out) or os.path.getsize(out) < 1000:
        return {"track_key": track_key, "page_url": page_url, "mp3_url": mp3_url,
                "error": f"download_failed rc={r.returncode}"}

    b = open(out, "rb").read(4)
    is_mp3 = b[:3] == b"ID3" or (b[0] == 0xFF and (b[1] & 0xE0) == 0xE0)
    dur, br = (None, None)
    try:
        dur, br = duration_mp3(out)
    except Exception as e:
        dur = f"ERR:{e}"
    return {
        "track_key": track_key,
        "page_url": page_url,
        "mp3_url": mp3_url,
        "license_urls_found": lic,
        "local_file": f"candidates/{track_key}.mp3",
        "bytes": os.path.getsize(out),
        "sha256": sha256_file(out),
        "mime": "audio/mpeg",
        "is_valid_mp3": is_mp3,
        "duration_seconds": dur,
        "bitrate": br,
    }


if __name__ == "__main__":
    os.makedirs(CAND, exist_ok=True)
    pairs = sys.argv[1:]
    results = []
    for i in range(0, len(pairs), 2):
        tk, url = pairs[i], pairs[i + 1]
        res = harvest(tk, url)
        results.append(res)
        print(json.dumps(res))
    with open(os.path.join(CAND, "_harvest_out.json"), "w") as f:
        json.dump(results, f, indent=2)
