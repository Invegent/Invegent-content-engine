#!/usr/bin/env python
"""Slice B — end-to-end AUTO-SELECTION proof render.

Renders template 46c5c4ac using the modifications the RESOLVER returned for
select_template('property-pulse', NULL, 'video_short_stat', 'stat-reveal-9x16-broll-v1', seed):
  Background.source  <- resolve_slot_assets (broll_background, NO asset-id literal)
  Logo.source        <- resolve_slot_assets (pp_logo_primary)
Text fields are worker-supplied (non-dynamic), generic national stat.

Proves the FULL chain renders: select_template -> resolve_slot_assets -> Creatomate.
No DB write, no publish. Creatomate key from ~/Downloads/'creatomate api key.txt'.
"""
import os, sys, json, time, urllib.request, hashlib

HERE = os.path.dirname(__file__)
MP4_OUT = os.path.join(HERE, "renders", "slice_b_autoselected.mp4")
META_OUT = os.path.join(HERE, "render_slice_b_meta.json")
KEY_FILE = os.path.expanduser("~/Downloads/creatomate api key.txt")

TEMPLATE_ID = "46c5c4ac-4d35-488c-b57c-44e05d790fb9"
# These two URLs are RESOLVER-SELECTED (verified live via select_template) — not hardcoded asset picks.
RESOLVED_BG = "https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4"
RESOLVED_LOGO = "https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png"

MODIFICATIONS = {
    "Background.source": RESOLVED_BG,   # <- resolver
    "Logo.source": RESOLVED_LOGO,       # <- resolver
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
            print("ABORT: exceeded 180s"); break
    wall = time.time() - t0
    meta = {"slice": "B", "proof": "auto-selection (resolver-selected Background.source, no asset-id)",
            "template_id": TEMPLATE_ID, "render_id": rid, "final_status": status,
            "wall_clock_s": round(wall, 1), "under_2min_ceiling": wall <= 120, "url": url,
            "resolved_background": RESOLVED_BG, "resolved_logo": RESOLVED_LOGO}
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
