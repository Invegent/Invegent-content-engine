#!/usr/bin/env bash
# OBS Stage 0A — CI defence gates (8 + Gate #9).
# Run from repo root: bash scripts/obs/ci/run_obs_gates.sh
# Exit 0 = all gates pass; exit 1 = a gate failed (block the merge/deploy).
#
# Scoping rules:
#   OBSDIR  = the observer source only (TS). Term/0B/egress/import/RPC scans target this.
#   PKGALL  = the whole package EXCLUDING this CI dir (the CI dir contains the denylist
#             patterns by design; scanning it would self-trigger). Secret scans use PKGALL.
set -uo pipefail

OBSDIR="supabase/functions/obs-observer"
CIDIR="scripts/obs/ci"
PROD_REF="mbkmaxqhsohbtwsqolns"
OBS_REF="cvprkjpmlfhlwflokzvv"
SMOKE_DOC="docs/build-specs/asset-policy-stage0/0A-observer-smoke.md"
FAIL=0

note() { printf '  %s\n' "$1"; }
gate() { printf '\n[GATE] %s\n' "$1"; }
fail() { printf 'FAIL: %s\n' "$1"; FAIL=1; }
pass() { printf 'PASS: %s\n' "$1"; }

# Files actually present (so the script is safe to run before/after move into repo).
ts_files() { find "$OBSDIR" -type f -name '*.ts' 2>/dev/null; }

# Gate 1 — import scan: no shared publisher / ai-worker / _shared DB client imports.
gate "1 import-scan (no shared publisher/ai-worker DB clients)"
if grep -REn "import .*(from )?['\"].*(_shared|ai-worker|publisher)/" $(ts_files) 2>/dev/null; then
  fail "shared publisher/ai-worker DB client import found in observer source"
else pass "no shared DB client imports"; fi

# Gate 2 — Artefact-4 forbidden-term scan (later-stage difference/inference tokens).
gate "2 artefact-4 forbidden-term scan"
if grep -REnif "$CIDIR/artefact4_forbidden_terms.txt" $(ts_files) 2>/dev/null; then
  fail "forbidden 0B/comparison/inference token in 0A source"
else pass "no forbidden tokens in 0A source"; fi

# Gate 3 — migration target scan: the OBS package must never name production as a target.
gate "3 migration-target scan (no production project ref in OBS package)"
if grep -REn "$PROD_REF" "$OBSDIR" 2>/dev/null; then
  fail "production project ref present in observer package"
else pass "no production project ref in observer package"; fi

# Gate 4 — RPC / view / SECURITY DEFINER / cron scan (observer must define none).
gate "4 rpc/view/security-definer/cron scan"
if grep -REin "security[ _]definer|cron\.(schedule|unschedule)|create (or replace )?(function|view|materialized view)" $(ts_files) 2>/dev/null; then
  fail "observer source defines an RPC/view/SECURITY DEFINER/cron object"
else pass "observer defines no DB object / cron"; fi

# Gate 5 — egress scan: only the prod-read endpoint + OBS-write endpoint (both via DSN env).
# No fetch()/http(s) runtime calls in TS source. (deno.json build-time import map is exempt.)
gate "5 egress scan (no runtime fetch/http in observer source)"
if grep -REn "fetch\(|https?://" $(ts_files) 2>/dev/null; then
  fail "runtime fetch()/http(s) call in observer source"
else pass "no runtime fetch/http; only DSN-based DB connections"; fi

# Gate 6 — secret scan: no DSN-with-creds, JWT, service-role key, password, or private key.
gate "6 secret scan (whole package, excluding the CI denylist dir)"
SECRET_RE='postgres(ql)?://[^[:space:]]*:[^[:space:]]*@|eyJ[A-Za-z0-9_-]{20,}|service_role_key[[:space:]]*[:=]|-----BEGIN [A-Z ]*PRIVATE KEY-----|PASSWORD[[:space:]]+'\''[^<'\'' ]'
if grep -REn --exclude-dir="$(basename "$CIDIR")" "$SECRET_RE" \
     "$OBSDIR" .github docs/build-specs/asset-policy-stage0 2>/dev/null; then
  fail "possible committed secret/credential"
else pass "no committed DSN/key/password/token"; fi

# Gate 7 — no 0B artefact: no file or symbol declaring later-stage difference logic.
gate "7 no-0B artefact scan"
if grep -REin "stage[ _-]?0b|counterfactual|provider_inferred|values_differ" $(ts_files) 2>/dev/null; then
  fail "0B / inference artefact in 0A source"
else pass "no 0B artefact in 0A source"; fi

# Gate 8 — deno type check (only where deno is available; CI installs it).
gate "8 deno check (type check)"
if command -v deno >/dev/null 2>&1; then
  if deno check "$OBSDIR/index.ts" 2>/dev/null; then pass "deno check clean"; else fail "deno check failed"; fi
else
  note "deno not present in this environment — gate enforced in CI (setup-deno). Skipping locally."
fi

# Gate 9 — egress + secret boundary: no production read DSN VALUE committed, and no OBS
# project URL committed in observer/workflow files. (A bare project-ref identifier in a
# comment/README is an identifier, not a credential, and is permitted.)
gate "9 egress+secret boundary (no prod read DSN value / no OBS URL committed)"
if grep -REn "OBS_PROD_READONLY_DSN[[:space:]]*=[[:space:]]*[\"']?postgres" "$OBSDIR" .github 2>/dev/null; then
  fail "production read DSN value committed"
elif grep -REn "${OBS_REF}\.supabase\.co" "$OBSDIR" .github 2>/dev/null; then
  fail "OBS project URL present in observer/workflow files"
else
  pass "no prod read DSN value committed; no OBS URL in observer/workflow files"
fi
note "(smoke doc reference: $SMOKE_DOC)"

echo
if [ "$FAIL" -eq 0 ]; then echo "ALL GATES PASSED"; exit 0; else echo "ONE OR MORE GATES FAILED"; exit 1; fi
