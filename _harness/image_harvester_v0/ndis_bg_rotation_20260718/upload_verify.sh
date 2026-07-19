#!/usr/bin/env bash
# NDIS bg ROTATION POOL — storage upload + public-URL sha256 verify (14 assets).
# Uploads intake_bytes/<key>.jpg -> brand-assets/NDIS_Yarns/Backgrounds/<key>.jpg, x-upsert:false.
# Fail-closed: any non-200, existing-object collision, or sha mismatch => STOP (non-zero exit).
# Secret: uses $SUPABASE_SERVICE_ROLE_KEY + $SUPABASE_URL from env, NEVER printed. USE-only.
set -euo pipefail
: "${SUPABASE_URL:?SUPABASE_URL unset}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY unset}"
DIR="$(cd "$(dirname "$0")" && pwd)"
BYTES="$DIR/intake_bytes"
BASE_OBJ="$SUPABASE_URL/storage/v1/object/brand-assets/NDIS_Yarns/Backgrounds"
BASE_PUB="$SUPABASE_URL/storage/v1/object/public/brand-assets/NDIS_Yarns/Backgrounds"
fail=0; ok=0
for f in "$BYTES"/*.jpg; do
  key="$(basename "$f" .jpg)"
  local_sha="$(sha256sum "$f" | cut -d' ' -f1)"
  # upload (x-upsert:false -> 200 on new; existing object returns 409/400 = collision STOP)
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE_OBJ/$key.jpg" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "x-upsert: false" -H "Content-Type: image/jpeg" \
      --data-binary "@$f")"
  if [ "$code" != "200" ]; then echo "STOP upload $key http=$code (expected 200; 4xx=collision/error)"; fail=1; break; fi
  # public-URL sha256 verify (served bytes == uploaded bytes)
  served_sha="$(curl -sS -L "$BASE_PUB/$key.jpg" | sha256sum | cut -d' ' -f1)"
  if [ "$served_sha" != "$local_sha" ]; then echo "STOP sha-mismatch $key local=$local_sha served=$served_sha"; fail=1; break; fi
  echo "OK  $key  http=200  sha=$local_sha (served==local)"
  ok=$((ok+1))
done
echo "---"
if [ "$fail" = "0" ] && [ "$ok" = "14" ]; then echo "UPLOAD+VERIFY PASS: 14/14"; else echo "UPLOAD+VERIFY FAILED (ok=$ok) — STOP, do not run INSERT"; exit 1; fi
