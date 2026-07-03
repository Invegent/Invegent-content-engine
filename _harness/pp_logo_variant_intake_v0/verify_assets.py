"""PP Logo Variant Intake v0 - technical verification of Claude Design export files.

Outputs verification_manifest.json + verification_manifest.csv next to this script.
Read-only over source/; no network, no DB.
"""
import os, sys, json, csv, hashlib, re, struct, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "source")

try:
    from PIL import Image
    HAVE_PIL = True
except ImportError:
    HAVE_PIL = False


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def sniff_format(data):
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    head = data[:512].lstrip()
    if head.startswith(b"<?xml") or head.startswith(b"<svg"):
        return "svg"
    if head.startswith(b"<!DOCTYPE html") or head.startswith(b"<!doctype html") or head.startswith(b"<html"):
        return "html"
    return "other"


def png_info(path):
    """Return width, height, colour type, has_alpha_channel, alpha_used, palette."""
    info = {}
    with open(path, "rb") as f:
        data = f.read()
    w, h = struct.unpack(">II", data[16:24])
    bitdepth, colortype = data[24], data[25]
    info["width"], info["height"] = w, h
    info["png_color_type"] = colortype
    info["has_alpha_channel"] = colortype in (4, 6) or b"tRNS" in data[:4096]
    if HAVE_PIL:
        im = Image.open(path).convert("RGBA")
        alpha = im.getchannel("A")
        mn, mx = alpha.getextrema()
        info["alpha_min"], info["alpha_max"] = mn, mx
        info["alpha_used"] = mn < 255
        # transparent pixel share
        hist = alpha.histogram()
        total = sum(hist)
        info["fully_transparent_pct"] = round(100.0 * hist[0] / total, 1)
        # dominant opaque colours
        small = im.resize((min(w, 256), min(h, 256)))
        counts = {}
        for r, g, b, a in small.getdata():
            if a > 200:
                key = (r // 8 * 8, g // 8 * 8, b // 8 * 8)
                counts[key] = counts.get(key, 0) + 1
        top = sorted(counts.items(), key=lambda kv: -kv[1])[:6]
        tot_opaque = sum(counts.values()) or 1
        info["dominant_colours"] = [
            {"hex": "#%02x%02x%02x" % k, "pct": round(100.0 * v / tot_opaque, 1)}
            for k, v in top
        ]
    return info


def svg_info(path):
    with open(path, "rb") as f:
        raw = f.read()
    text = raw.decode("utf-8", errors="replace")
    info = {}
    info["is_real_vector"] = True
    embedded_raster = bool(re.search(r"<image[\s>]", text)) or "base64" in text
    info["embedded_raster"] = embedded_raster
    if embedded_raster:
        info["is_real_vector"] = False
    m = re.search(r'viewBox="([^"]+)"', text)
    info["viewBox"] = m.group(1) if m else None
    mw = re.search(r'<svg[^>]*\swidth="([^"]+)"', text)
    mh = re.search(r'<svg[^>]*\sheight="([^"]+)"', text)
    info["svg_width"] = mw.group(1) if mw else None
    info["svg_height"] = mh.group(1) if mh else None
    info["path_count"] = len(re.findall(r"<path[\s>]", text))
    info["text_element_count"] = len(re.findall(r"<text[\s>]", text))
    info["uses_font_family"] = bool(re.search(r"font-family", text))
    fills = sorted(set(re.findall(r'fill="(#[0-9a-fA-F]{3,8})"', text)))
    info["fill_colours"] = fills
    info["bytes_text"] = len(raw)
    return info


def main():
    rows = []
    for root, _dirs, files in os.walk(SRC):
        for name in sorted(files):
            path = os.path.join(root, name)
            rel = os.path.relpath(path, SRC).replace("\\", "/")
            with open(path, "rb") as f:
                head = f.read(512)
            fmt = sniff_format(open(path, "rb").read(2048))
            row = {
                "rel_path": rel,
                "bytes": os.path.getsize(path),
                "sha256": sha256(path),
                "format": fmt,
            }
            ext = os.path.splitext(name)[1].lower()
            row["ext_matches_format"] = (
                (ext == ".png" and fmt == "png")
                or (ext == ".svg" and fmt == "svg")
                or (ext in (".csv", ".txt", ".json") and fmt == "other")
                or (ext == ".html" and fmt == "html")
            )
            try:
                if fmt == "png":
                    row.update(png_info(path))
                elif fmt == "svg":
                    row.update(svg_info(path))
            except Exception as e:
                row["verify_error"] = str(e)
            rows.append(row)

    out = {"pil_available": HAVE_PIL, "file_count": len(rows), "files": rows}
    with open(os.path.join(HERE, "verification_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)

    cols = ["rel_path", "format", "bytes", "width", "height", "has_alpha_channel",
            "alpha_used", "fully_transparent_pct", "path_count", "embedded_raster",
            "is_real_vector", "viewBox", "ext_matches_format", "sha256"]
    with open(os.path.join(HERE, "verification_manifest.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(f"verified {len(rows)} files (PIL={HAVE_PIL})")
    for r in rows:
        flag = ""
        if r.get("format") == "svg" and not r.get("is_real_vector", True):
            flag = "  << EMBEDDED RASTER"
        if not r.get("ext_matches_format", True):
            flag += "  << EXT/FORMAT MISMATCH"
        dims = f"{r.get('width','')}x{r.get('height','')}" if r.get("width") else ""
        alpha = f" alphaUsed={r.get('alpha_used')}" if "alpha_used" in r else ""
        paths = f" paths={r.get('path_count')}" if "path_count" in r else ""
        print(f"{r['rel_path']:<55} {r['format']:<5} {r['bytes']:>8}B {dims:>10}{alpha}{paths} {r['sha256'][:12]}{flag}")


if __name__ == "__main__":
    main()
