#!/usr/bin/env python
"""B-roll Production Activation v1 — POST-APPLY RENDER PROOF with MEASURED audio.

Renders template 46c5c4ac (the one PP's production call now selects) with the
PRODUCTION-SHAPED payload: the resolver-selected Background+Logo, the worker's text
fields, AND the two audio keys buildGovernedVideoStatPlan always binds
('VoiceAudio.source', 'MusicBed.source').

DECISIVE TEST: the Slice B control render bound NO audio keys and still produced a
soun track (baked audio, -29.0 LUFS). If binding VoiceAudio.source produces a
BYTE-IDENTICAL output, the template has no VoiceAudio element and production would
silently DROP the governed voiceover -- the declared-not-measured failure class.

No DB write. No publish. Creatomate key read out-of-transcript.
"""
import os, sys, json, time, urllib.request, hashlib, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "renders")
os.makedirs(OUT_DIR, exist_ok=True)
KEY_FILE = os.path.expanduser("~/Downloads/creatomate api key.txt")

TEMPLATE_ID = "46c5c4ac-4d35-488c-b57c-44e05d790fb9"
# Resolver-selected live (select_template('property-pulse', NULL, 'video_short_stat', NULL, seed))
RESOLVED_BG = "https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Broll/broll_pp_au_suburb_aerial.mp4"
RESOLVED_LOGO = "https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/brand-assets/Property_Pulse/Logos/PP_logo_2.png"
# A real, reachable, governed public mp3 used as the AUDIO BIND PROBE.
PROBE_AUDIO = "https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object/public/post-music/global/calm/calm_piano_drifting_006.mp3"

BASE_MODS = {
    "Background.source": RESOLVED_BG,
    "Logo.source": RESOLVED_LOGO,
    "StatValue": "42%",
    "StatLabel": "of Australian renters plan to buy within two years",
    "ContextLine": "Buyer demand keeps building across the national market.",
    "CtaText": "Property Pulse — the numbers that matter.",
}
# Production shape: the worker ALWAYS adds these two keys (b1_video_stat.ts:326-327).
PROD_MODS = dict(BASE_MODS)
PROD_MODS["VoiceAudio.source"] = PROBE_AUDIO
PROD_MODS["MusicBed.source"] = PROBE_AUDIO

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"


def render(key, mods, label):
    body = json.dumps({"template_id": TEMPLATE_ID, "modifications": mods}).encode("utf-8")
    req = urllib.request.Request(
        "https://api.creatomate.com/v1/renders", data=body, method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "User-Agent": UA})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=120) as r:
        js = json.loads(r.read().decode())
    rid = js[0]["id"] if isinstance(js, list) else js["id"]
    url, status = None, None
    while time.time() - t0 < 180:
        time.sleep(4)
        q = urllib.request.Request(f"https://api.creatomate.com/v1/renders/{rid}",
                                   headers={"Authorization": f"Bearer {key}", "User-Agent": UA})
        with urllib.request.urlopen(q, timeout=60) as r:
            st = json.loads(r.read().decode())
        status = st.get("status")
        if status in ("succeeded", "failed"):
            url = st.get("url")
            break
    wall = round(time.time() - t0, 1)
    if status != "succeeded":
        raise SystemExit(f"{label}: render {status} (render_id={rid})")
    path = os.path.join(OUT_DIR, f"{label}.mp4")
    dl = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(dl, timeout=180) as r, open(path, "wb") as f:
        f.write(r.read())
    data = open(path, "rb").read()
    return {"label": label, "render_id": rid, "wall_clock_s": wall, "url": url,
            "path": path, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def measure(path):
    """MEASURED audio -- never declared."""
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    raw = open(path, "rb").read()
    hands, i = [], 0
    while True:
        j = raw.find(b"hdlr", i)
        if j < 0:
            break
        hands.append(raw[j + 12:j + 16].decode("latin1"))
        i = j + 4
    p = subprocess.run([ff, "-hide_banner", "-nostats", "-i", path, "-map", "0:a:0",
                        "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    err = p.stderr
    out = {"handlers": hands, "has_soun": "soun" in hands, "has_vide": "vide" in hands}
    for ln in err.splitlines():
        s = ln.strip()
        if s.startswith("Duration:"):
            out["duration"] = s.split(",")[0].replace("Duration:", "").strip()
        if "Video:" in s and "Stream #" in s:
            out["video_stream"] = s
        if "Audio:" in s and "Stream #" in s and "->" not in s:
            out["audio_stream"] = s
    lines = err.splitlines()
    for idx, ln in enumerate(lines):
        if "Integrated loudness:" in ln:
            for k in range(idx, min(idx + 4, len(lines))):
                if lines[k].strip().startswith("I:"):
                    out["integrated_lufs"] = lines[k].split("I:")[1].strip()
        if "True peak:" in ln:
            for k in range(idx, min(idx + 4, len(lines))):
                if "Peak:" in lines[k]:
                    out["true_peak"] = lines[k].split("Peak:")[1].strip()
    return out


def main():
    key = open(KEY_FILE, "r", encoding="utf-8-sig").read().strip()
    results = {}
    for label, mods in (("control_baked_only", BASE_MODS), ("production_shape_with_audio", PROD_MODS)):
        r = render(key, mods, label)
        r["audio"] = measure(r["path"])
        results[label] = r
        print(f"\n=== {label} ===")
        print(json.dumps(r, indent=2))

    a, b = results["control_baked_only"], results["production_shape_with_audio"]
    verdict = {
        "byte_identical": a["sha256"] == b["sha256"],
        "control_sha": a["sha256"], "production_sha": b["sha256"],
        "control_lufs": a["audio"].get("integrated_lufs"),
        "production_lufs": b["audio"].get("integrated_lufs"),
    }
    verdict["audio_keys_bind"] = not verdict["byte_identical"]
    print("\n=== VERDICT ===")
    print(json.dumps(verdict, indent=2))
    json.dump({"results": results, "verdict": verdict},
              open(os.path.join(HERE, "render_proof_meta.json"), "w"), indent=2)


if __name__ == "__main__":
    main()
