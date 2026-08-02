# ICE — Asset Gap live writer: daily error_count monitor (PROPOSED, NOT ARMED).
#
# STATUS: drafted 2026-08-02 as an operator-carry proposal from the WS-3 (Asset Gap
#   Activation) closeout lane. This file is NOT wired into any scheduler. Arming it
#   (Windows Task Scheduler / cron / equivalent) is a separate, explicitly named T1/T2
#   gate — drafting the script is not authorisation to run it unattended.
#
# PURPOSE
#   WS-3 (b)'s P-5B apply result (docs/briefs/results/ws3-asset-gap-live-writer-result-v1.md
#   §4) named the `error_count > 0` check on `m.asset_gap_analysis_run` as a MANUAL named
#   read, not an automated alert, for the first week (then weekly). This routine automates
#   exactly that read, no more — it follows the proven silent-on-clean / surface-on-error
#   shape of `.claude/routines/broll-rotation-monitor.ps1` (ARMED 2026-07-30, v6.78).
#
# CONTRACT (proposed — PK ratifies at the arming gate)
#   * Runs daily (proposed: same cadence class as the analyzer's own schedule, offset to
#     run shortly after the 16:50 UTC fire — e.g. 17:10 UTC).
#   * Silent when every run since the last check has error_count = 0 — no notification, no
#     lane reopen, one append-only heartbeat line only.
#   * On ANY run with error_count > 0: writes a trigger file and stops re-arming. A
#     human/agent session then reopens the monitoring outcome, reads the offending run's
#     full row, and decides remediation. Re-arming is a deliberate human act (delete the
#     trigger file), same as the B-roll monitor's contract — a fired monitor never quietly
#     overwrites the evidence it captured.
#   * It never mutates production, never re-runs the analyzer, never touches the writer or
#     the schedule.
#
# MATCH CONDITION
#   Any row in `m.asset_gap_analysis_run` with `error_count > 0` and `ran_at` after the
#   last time this routine last saw a clean state (tracked via the heartbeat log's last
#   timestamp, read back at each run — not a separate state file, to keep this a single
#   append-only artifact per the B-roll monitor's own pattern).
#
# READ PATH
#   `m.asset_gap_analysis_run` is not one of the 10 R0 `ice_ro` views (it is a run-log
#   table, not a status view), so this routine reads it via gated `execute_sql` today —
#   named here as a residual, not a defect. Adding an `ice_ro` view over run-log rows is
#   its own future T2 lane if the daily prompt cost becomes a problem (CLAUDE.md "Coverage
#   gap → new view, not a workaround").
#
# ⚠ NAMED LIMITATION — this checks `error_count > 0` only. It does NOT check for a missed
#   fire (no row at all where one was expected) — that is `cron_health_check`'s job
#   (`ice_ro.cron_health` is already R0-readable) and is deliberately out of this routine's
#   scope to keep it a single-purpose monitor, per the seed packet's ask for "a small daily
#   monitor routine."

$ErrorActionPreference = "Stop"

$repoRoot   = "C:\Users\parve\Invegent-content-engine"
$monDir     = Join-Path $repoRoot "docs\runtime\monitoring"
$heartbeat  = Join-Path $monDir "asset-gap-error-monitor.log"
$trigger    = Join-Path $monDir "asset-gap-error-FIRST-MATCH.md"

if (-not (Test-Path $monDir)) { New-Item -ItemType Directory -Path $monDir -Force | Out-Null }

Set-Location $repoRoot
$stamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

# Already fired: stay silent and do nothing. Re-arming is a deliberate human act.
if (Test-Path $trigger) {
  Add-Content -Path $heartbeat -Value "$stamp  DISARMED (trigger file present — awaiting reopen)"
  exit 0
}

# NOTE (proposal-time): this SELECT requires gated execute_sql (mcp__supabase__execute_sql
# or an equivalent authenticated path) — scripts/db-read.py's ice_readonly role cannot
# reach schema m. The arming gate must decide the actual invocation (service-role script,
# not shown here as a stub to avoid embedding any credential-handling detail unreviewed).
$query = @"
SELECT run_id, ran_at, triggered_by, scanned, inserted, updated, reconciled_resolved, error_count
FROM m.asset_gap_analysis_run
WHERE error_count > 0
ORDER BY ran_at DESC
"@

Add-Content -Path $heartbeat -Value "$stamp  PROPOSAL ONLY — not armed, no read executed. See file header."
exit 0
