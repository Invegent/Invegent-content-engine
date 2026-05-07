#!/bin/bash
# ========================================================================
# safe-deploy.sh — pre-deploy drift gate
# ========================================================================
#
# Wraps `supabase functions deploy <ef_name>` with a hard gate based on
# m.vw_ef_drift_current. Hard-blocks the standing don't-redeploy three.
# Blocks Class A (in-spec — should not need redeploy). Blocks Class B
# (functional drift / regression risk) unless --allow-warn. Passes
# Classes C / D / repo-only and absent rows.
#
# Brief: docs/briefs/cc-stage-3-safe-deploy.md (v1.1)
# D-01 review_id: 39a588d4-3fb4-41e4-a5a4-07916b6d64c7 (PASS)
#
# Contract assumptions:
#   - m.vw_ef_drift_current is treated as ADVISORY drift log, not full
#     inventory. An absent row for <ef_name> = PASS (the script does not
#     refuse to deploy something the drift log has never observed).
#   - Standing-three list is encoded here. Updating it requires updating
#     docs/00_sync_state.md and docs/00_action_list.md FIRST.
#
# Connection method (per §1.5 pre-flight):
#   The Supabase CLI v2.75 has no ad-hoc SQL subcommand and psql is not
#   installed locally, so this script uses curl + the `exec_sql` RPC.
#   Required env: SUPABASE_SERVICE_ROLE_KEY
#   Optional env: SUPABASE_PROJECT_REF (defaults to mbkmaxqhsohbtwsqolns)
#
# Schema delta vs brief assumption (per §1.5 pre-flight):
#   Brief assumed columns named `function_name` and `class`. Actual view
#   columns are `slug` (function-name identifier) and `current_class`
#   (class label). This script asserts the REAL columns exist; missing
#   either → ABORT exit 3.
#
# Exit codes:
#   0  PASS
#   1  BLOCK (class-driven: A, A-LE, or unwarranted B; or usage error)
#   2  BLOCK (standing-three)
#   3  ABORT (pre-flight: connection or schema)
#
# Usage:
#   ./scripts/safe-deploy.sh <ef_name> [--check-only] [--allow-warn]
# ========================================================================

set -euo pipefail

# ---------- Standing don't-redeploy list -----------------------------------
# See docs/00_sync_state.md "Carried-forward" block and
# docs/00_action_list.md "Hold-state" notes.
# Update BOTH docs BEFORE removing any name from this array.
STANDING_THREE=(
  "draft-notifier"
  "heygen-avatar-creator"
  "heygen-avatar-poller"
)

# ---------- Config ---------------------------------------------------------
PROJECT_REF="${SUPABASE_PROJECT_REF:-mbkmaxqhsohbtwsqolns}"
RPC_URL="https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql"

usage() {
  cat <<EOF
Usage: $0 <ef_name> [--check-only] [--allow-warn]

  <ef_name>       Edge Function slug as stored in m.vw_ef_drift_current.slug
  --check-only    Run the gate; do not invoke deploy on PASS.
  --allow-warn    Permit Class B (B-FD/B-RR) to PASS with a WARN message.
                  Does NOT bypass standing-three or Class A.

Exit codes: 0=PASS, 1=BLOCK (class/usage), 2=BLOCK (standing-three),
            3=ABORT (pre-flight).
EOF
}

# ---------- Arg parsing ----------------------------------------------------
EF_NAME=""
CHECK_ONLY=0
ALLOW_WARN=0

if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

for arg in "$@"; do
  case "$arg" in
    --check-only) CHECK_ONLY=1 ;;
    --allow-warn) ALLOW_WARN=1 ;;
    -h|--help) usage; exit 0 ;;
    --*) echo "[safe-deploy] unknown flag: $arg" >&2; usage; exit 1 ;;
    *)
      if [[ -n "$EF_NAME" ]]; then
        echo "[safe-deploy] multiple positional args; only one <ef_name> accepted" >&2
        usage; exit 1
      fi
      EF_NAME="$arg"
      ;;
  esac
done

if [[ -z "$EF_NAME" ]]; then
  usage
  exit 1
fi

# Defensive validation of <ef_name> — alphanumerics, hyphen, underscore only.
# Prevents SQL injection via the slug value into the exec_sql query.
if [[ ! "$EF_NAME" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "[safe-deploy] invalid <ef_name>: '$EF_NAME' (allowed: alphanumeric, hyphen, underscore)" >&2
  exit 1
fi

# ---------- Standing-three check (FIRST — beats every other path) ---------
for blocked in "${STANDING_THREE[@]}"; do
  if [[ "$EF_NAME" == "$blocked" ]]; then
    printf '{"reason":"standing-three","function_name":"%s"}\n' "$EF_NAME"
    echo "[safe-deploy] BLOCK $EF_NAME — standing don't-redeploy list. Update sync_state + action_list before removing." >&2
    exit 2
  fi
done

# ---------- Pre-flight: connection + schema -------------------------------
abort() {
  echo "[safe-deploy] ABORT: $1" >&2
  exit 3
}

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  abort "curl method failed. Expected env: SUPABASE_SERVICE_ROLE_KEY + SUPABASE_PROJECT_REF."
fi

if ! command -v curl >/dev/null 2>&1; then
  abort "curl not on PATH; required for the REST connection method."
fi

# Schema fail-fast — assert real columns exist (slug + current_class).
SCHEMA_QUERY='SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema = '"'"'m'"'"' AND table_name = '"'"'vw_ef_drift_current'"'"' AND column_name IN ('"'"'slug'"'"', '"'"'current_class'"'"')'
SCHEMA_PAYLOAD=$(printf '{"query": "%s"}' "$SCHEMA_QUERY")

SCHEMA_RESP=$(curl -sS --fail-with-body -X POST "$RPC_URL" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$SCHEMA_PAYLOAD" 2>&1) || abort "exec_sql RPC unreachable. URL: $RPC_URL  curl-output: $SCHEMA_RESP"

SCHEMA_N=$(printf '%s' "$SCHEMA_RESP" | sed -nE 's/.*"n"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' | head -1)
if [[ -z "$SCHEMA_N" ]]; then
  abort "schema introspection returned unparseable response: $SCHEMA_RESP"
fi
if [[ "$SCHEMA_N" -ne 2 ]]; then
  abort "m.vw_ef_drift_current missing required columns. Expected 'slug' AND 'current_class' (got match-count=$SCHEMA_N). Update brief or view."
fi

# ---------- Fetch the matched row -----------------------------------------
ROW_QUERY='SELECT row_to_json(t) AS row FROM (SELECT * FROM m.vw_ef_drift_current WHERE slug = '"'"$EF_NAME"'"' LIMIT 1) t'
ROW_PAYLOAD=$(printf '{"query": "%s"}' "$ROW_QUERY")

ROW_RESP=$(curl -sS --fail-with-body -X POST "$RPC_URL" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$ROW_PAYLOAD" 2>&1) || abort "exec_sql row fetch failed. curl-output: $ROW_RESP"

# Detect absent row.  exec_sql wraps single-column SELECTs as [{"row": null}]
# when the inner SELECT has no rows; or as [] in some configurations.
ROW_PRESENT=1
if [[ "$ROW_RESP" == "[]" ]] || printf '%s' "$ROW_RESP" | grep -qE '"row"[[:space:]]*:[[:space:]]*null'; then
  ROW_PRESENT=0
fi

if [[ $ROW_PRESENT -eq 0 ]]; then
  if [[ $CHECK_ONLY -eq 1 ]]; then
    echo "[safe-deploy] PASS $EF_NAME (class=none — row absent in vw_ef_drift_current; advisory log treats absent as PASS)"
    exit 0
  fi
  echo "[safe-deploy] PASS $EF_NAME (class=none — row absent)"
  echo "[safe-deploy] invoking: supabase functions deploy $EF_NAME"
  exec supabase functions deploy "$EF_NAME"
fi

# Extract the inner row JSON (everything after the leading `[{"row":` and
# before the trailing `}]`) for emission in BLOCK/WARN paths.
INNER_ROW_JSON=$(printf '%s' "$ROW_RESP" | sed -E 's/^\[\{"row"[[:space:]]*:[[:space:]]*//; s/\}\]$//')

# Extract current_class from the response.
CLASS=$(printf '%s' "$ROW_RESP" | sed -nE 's/.*"current_class"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' | head -1)
if [[ -z "$CLASS" ]]; then
  abort "could not parse current_class from row response: $ROW_RESP"
fi

# ---------- Decision matrix -----------------------------------------------
case "$CLASS" in
  A|A-LE)
    printf '%s\n' "$INNER_ROW_JSON"
    echo "[safe-deploy] BLOCK $EF_NAME — class=$CLASS (in-spec; redeploy unnecessary)." >&2
    exit 1
    ;;
  B-FD|B-RR)
    if [[ $ALLOW_WARN -eq 1 ]]; then
      printf '%s\n' "$INNER_ROW_JSON"
      echo "[safe-deploy] WARN  $EF_NAME — class=$CLASS (drift detected; --allow-warn permits PASS)."
      if [[ $CHECK_ONLY -eq 1 ]]; then
        echo "[safe-deploy] PASS  $EF_NAME (class=$CLASS)"
        exit 0
      fi
      echo "[safe-deploy] invoking: supabase functions deploy $EF_NAME"
      exec supabase functions deploy "$EF_NAME"
    else
      printf '%s\n' "$INNER_ROW_JSON"
      echo "[safe-deploy] BLOCK $EF_NAME — class=$CLASS (drift detected; rerun with --allow-warn to override)." >&2
      exit 1
    fi
    ;;
  C|D|repo-only)
    if [[ $CHECK_ONLY -eq 1 ]]; then
      echo "[safe-deploy] PASS $EF_NAME (class=$CLASS)"
      exit 0
    fi
    echo "[safe-deploy] PASS $EF_NAME (class=$CLASS)"
    echo "[safe-deploy] invoking: supabase functions deploy $EF_NAME"
    exec supabase functions deploy "$EF_NAME"
    ;;
  *)
    # Unknown class — treat as PASS (advisory) but surface for review.
    echo "[safe-deploy] WARN  $EF_NAME — unknown class=$CLASS; treating as advisory PASS." >&2
    if [[ $CHECK_ONLY -eq 1 ]]; then
      echo "[safe-deploy] PASS $EF_NAME (class=$CLASS)"
      exit 0
    fi
    echo "[safe-deploy] invoking: supabase functions deploy $EF_NAME"
    exec supabase functions deploy "$EF_NAME"
    ;;
esac
