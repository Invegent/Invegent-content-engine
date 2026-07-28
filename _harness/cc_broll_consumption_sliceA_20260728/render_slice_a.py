#!/usr/bin/env python
"""Governed B-roll Consumption v1 — SLICE A: direct-bind render-capability proof.

Renders the PK-authored template AU_generic_national_Suburb_9:16_V1
(template_id 46c5c4ac-4d35-488c-b57c-44e05d790fb9) by TEMPLATE ID with explicit
modifications, exercising the DYNAMIC Background.source (video) binding path.

- No resolver, no production worker, no deploy, no DB write, no promotion.
- The AU-suburb B-roll clip stays FENCED (read of a public storage object only).
- Measures wall-clock render time against the 2-min Creatomate ceiling.
- Creatomate key read from ~/Downloads/'creatomate api key.txt' (env key stale). No secret printed.
"""
import os, sys, json, time, urllib.request, hashlib

HERE = os.path.dirname(__file__)
MP4_OUT = os.path.join(HERE, "renders", "slice_a_broll_au_suburb.mp4")
META_OUT = os.path.join(HERE, "render_meta.json")
KEY_FILE = os.path.expanduser("~/Downloads/creatomate api key.txt")

TEMPLATE_ID = "46c5c4ac-4d35-488c-b57c-44e05d790fb9"
BASE = "https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public"
BROLL = f"{BASE}/brand-assets/Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4"   # fenced 9:16, asset 2d62b04e
LOGO  = f"{BASE}/brand-assets/Property_Pulse/Logos/PP_logo_2.png"
MUSIC = f"{BASE}/post-music/global/neutral/neutral_piano_spring_005.mp3"

MODIFICATIONS = {
    "Background.source": BROLL,
    "Logo.source": LOGO,
    "MusicBed.source": MUSIC,
    "StatValue": "42%",
    "StatLabel": "of Australian renters plan to buy within two years",
    "ContextLine": "Buyer demand keeps building across the national market.",
    "CtaText": "Property Pulse — the numbers that matter.",
}
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"


def post_render(key):
    body = json.dumps({"template_id": TEMPLATE_ID, "modifications": MODIFICATIONS}).encode("utf-8")
    req = urllib.request.Request("https://api.creatomate.com/v1/renders", data=body, method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def poll(render_id, key):
    req = urllib.request.Request(f"https://api.creatomate.com/v1/renders/{render_id}",
        headers={"Authorization": f"Bearer {key}", "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main():
    if not os.path.exists(KEY_FILE):
        print(f"KEY FILE MISSING: {KEY_FILE}"); sys.exit(2)
    with open(KEY_FILE) as f:
        key = f.read().strip()
    t0 = time.time()
    resp = post_render(key)
    arr = resp if isinstance(resp, list) else [resp]
    rid = arr[0]["id"]
    status, url = arr[0].get("status"), arr[0].get("url")
    print(f"POSTed render id={rid} status={status}")
    while status in ("planned", "rendering", "transcribing", "waiting"):
        time.sleep(4)
        p = poll(rid, key)
        status, url = p.get("status"), p.get("url")
        print(f"  t+{time.time()-t0:5.1f}s  status={status}")
        if time.time() - t0 > 180:
            print("ABORT: exceeded 180s local wait"); break
    wall = time.time() - t0
    meta = {"slice": "A", "template_id": TEMPLATE_ID, "render_id": rid,
            "final_status": status, "wall_clock_s": round(wall, 1),
            "under_2min_ceiling": wall <= 120, "url": url,
            "broll_source": BROLL, "broll_asset_id": "2d62b04e-c1b5-44df-b382-59cbb991e166",
            "logo_source": LOGO, "music_source": MUSIC, "modifications": MODIFICATIONS}
    if status == "succeeded" and url:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=180) as r:
            data = r.read()
        os.makedirs(os.path.dirname(MP4_OUT), exist_ok=True)
        with open(MP4_OUT, "wb") as f:
            f.write(data)
        meta["mp4_bytes"] = len(data)
        meta["mp4_sha256"] = hashlib.sha256(data).hexdigest()
        meta["mp4_out"] = MP4_OUT
    with open(META_OUT, "w") as f:
        json.dump(meta, f, indent=2)
    print(json.dumps(meta, indent=2))
    sys.exit(0 if status == "succeeded" else 1)


if __name__ == "__main__":
    main()
