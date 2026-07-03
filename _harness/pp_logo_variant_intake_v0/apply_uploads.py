"""PP Logo Variant Intake v0 — PK-approved upload apply (2026-07-03).

Uploads the 18 manifest files to brand-assets (upsert=false, overwrite-disabled),
then verifies each by public URL: HTTP 200 + byte size + sha256 vs local source.
"""
import json, os, sys, hashlib, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
MAN = json.load(open(os.path.join(HERE, "upload_manifest.json"), encoding="utf-8"))
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BASE = "https://mbkmaxqhsohbtwsqolns.supabase.co/storage/v1/object"

if not KEY:
    sys.exit("SUPABASE_SERVICE_ROLE_KEY missing")

results = []
fail = False

for f in MAN["files"]:
    local = os.path.join(REPO, *f["local_path"].split("/"))
    data = open(local, "rb").read()
    sha_local = hashlib.sha256(data).hexdigest()
    assert sha_local == f["sha256"], f"local sha mismatch pre-upload: {f['local_path']}"
    assert len(data) == f["bytes"], f"local size mismatch pre-upload: {f['local_path']}"

    url = f"{BASE}/{f['bucket']}/{f['target_path']}"
    req = urllib.request.Request(url, data=data, method="POST", headers={
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": f["content_type"],
        "x-upsert": "false",
        "cache-control": "max-age=3600",
    })
    try:
        with urllib.request.urlopen(req) as r:
            status = r.status
    except urllib.error.HTTPError as e:
        results.append(f"UPLOAD FAIL {f['target_path']} HTTP {e.code}: {e.read()[:200]}")
        fail = True
        continue

    # verify via public URL
    try:
        with urllib.request.urlopen(f["public_url"]) as r:
            got = r.read()
        sha_remote = hashlib.sha256(got).hexdigest()
        ok = (len(got) == f["bytes"]) and (sha_remote == f["sha256"])
        results.append(f"{'OK' if ok else 'VERIFY FAIL'} {f['target_path']} "
                       f"up={status} bytes={len(got)}/{f['bytes']} sha_match={sha_remote == f['sha256']}")
        if not ok:
            fail = True
    except Exception as e:
        results.append(f"VERIFY ERROR {f['target_path']}: {e}")
        fail = True

print("\n".join(results))
print(f"\n{'FAILED' if fail else 'ALL 18 UPLOADED + VERIFIED (HTTP 200, bytes, sha256)'}")
sys.exit(1 if fail else 0)
