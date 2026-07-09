#!/usr/bin/env python3
"""FMA CC0 track harvester (mechanical). Given a track-page URL, extract the direct
CDN mp3 URL from the page HTML, download bytes, compute sha256/bytes/mime/duration.
NO judgment, NO upload, NO DB. Writes only under candidates/."""
import re, sys, os, hashlib, subprocess, json

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "candidates")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

def curl(url, out=None, head=False):
    args = ["curl", "-sS", "-L", "--max-time", "120", "-A", UA]
    if head:
        args += ["-I"]
    if out:
        args += ["-o", out]
    args += [url]
    r = subprocess.run(args, capture_output=True)
    return r

def fetch_html(url):
    r = subprocess.run(["curl","-sS","-L","--max-time","60","-A",UA,url], capture_output=True)
    return r.stdout.decode("utf-8","replace")

def extract_mp3(html):
    un = html.replace("\\/", "/")
    urls = re.findall(r'https://files\.freemusicarchive\.org/[^"\'\\ ]+?\.mp3', un)
    return sorted(set(urls))

def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1<<16), b""):
            h.update(chunk)
    return h.hexdigest()

def duration_mp3(p):
    from mutagen.mp3 import MP3
    m = MP3(p)
    return round(m.info.length, 3), m.info.bitrate

def harvest(track_key, page_url):
    html = fetch_html(page_url)
    mp3s = extract_mp3(html)
    if not mp3s:
        return {"track_key": track_key, "page_url": page_url, "error": "no_cdn_mp3_url_found"}
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
        "local_file": f"candidates/{track_key}.mp3",
        "bytes": os.path.getsize(out),
        "sha256": sha256_file(out),
        "mime": "audio/mpeg",
        "is_valid_mp3": is_mp3,
        "duration_seconds": dur,
        "bitrate": br,
    }

if __name__ == "__main__":
    # args: track_key page_url  (repeatable pairs)
    pairs = sys.argv[1:]
    results = []
    for i in range(0, len(pairs), 2):
        tk, url = pairs[i], pairs[i+1]
        res = harvest(tk, url)
        results.append(res)
        print(json.dumps(res))
    with open(os.path.join(CAND, "_harvest_out.json"), "w") as f:
        json.dump(results, f, indent=2)
