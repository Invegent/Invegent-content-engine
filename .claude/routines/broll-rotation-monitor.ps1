# ICE — Governed B-roll Rotation Governance v1: daily condition check.
#
# ARMED 2026-07-30 (register v6.78) against the monitoring baseline recorded at
#   docs/briefs/results/broll-rotation-governance-v1-monitoring-baseline-result-v1.md
#
# PURPOSE
#   `resolve_slot_assets` v1.5 (Rotation Governance v1) went live 2026-07-29 22:50:34Z, but NO
#   natural production render has exercised it yet — every queued PP `video_short_stat` slot was
#   already filled with a pre-parity, static-background draft. This routine waits, silently, for
#   the FIRST natural production render and does nothing else.
#
# CONTRACT (PK, 2026-07-30)
#   * Runs daily.
#   * Silent when there is no matching render — no notification, no lane reopen, no file churn
#     beyond one append-only heartbeat line.
#   * On the FIRST match: writes a trigger file and stops re-arming. A human/agent session then
#     reopens the monitoring outcome and collects the full twelve-field evidence record.
#   * It never mutates production, never renders, never touches the resolver.
#
# MATCH CONDITION
#   Property Pulse (4036a6b5-b4a3-406e-998d-c2fe14a8bbdd)
#   · ice_format_key = 'video_short_stat'
#   · client_id IS NOT NULL          (excludes SMOKE renders — they carry client_id NULL and are
#                                     excluded from rotation history by resolver design)
#   · created_at > 2026-07-29 22:50:34Z   (the v1.5 apply)
#   · selected Background asset_key LIKE 'broll_%'
#
# ⚠ NAMED LIMITATION — the `broll_` predicate is verified AT REOPEN, not here.
#   This check reads the allowlisted read-only path (`scripts/db-read.py`, confined by schema-USAGE
#   to the 10 `ice_ro` views). No view exposes `m.post_render_log.render_spec`, so the background
#   asset_key is not reachable from this routine. Closing that gap means adding a secret-free
#   `ice_ro` view under its own T2/T3 gate — deliberately NOT done as a side effect of arming a
#   monitor. Consequence: this routine fires on the first non-smoke PP `video_short_stat` render
#   after the apply, and the reopened session confirms the `broll_` prefix. A render that turns out
#   to carry a STATIC background is not a false alarm to be discarded — it is itself the material
#   finding (parity not reaching production), and the reopened session records it and re-arms.

$ErrorActionPreference = "Stop"

$repoRoot   = "C:\Users\parve\Invegent-content-engine"
$monDir     = Join-Path $repoRoot "docs\runtime\monitoring"
$heartbeat  = Join-Path $monDir "broll-rotation-monitor.log"
$trigger    = Join-Path $monDir "broll-rotation-FIRST-MATCH.md"

$clientId   = "4036a6b5-b4a3-406e-998d-c2fe14a8bbdd"   # property-pulse
$applyTs    = "2026-07-29 22:50:34+00"                  # resolve_slot_assets v1.5 apply

if (-not (Test-Path $monDir)) { New-Item -ItemType Directory -Path $monDir -Force | Out-Null }

Set-Location $repoRoot
$stamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

# Already fired: stay silent and do nothing. Re-arming is a deliberate human act (delete the
# trigger file) so a fired monitor can never quietly overwrite the evidence it captured.
if (Test-Path $trigger) {
  Add-Content -Path $heartbeat -Value "$stamp  DISARMED (trigger file present — awaiting reopen)"
  exit 0
}

$query = @"
SELECT render_log_id, post_draft_id, status, attempt_number, render_duration_ms, created_at
FROM ice_ro.render_status
WHERE ice_format_key = 'video_short_stat'
  AND client_id = '$clientId'
  AND client_id IS NOT NULL
  AND created_at > '$applyTs'
ORDER BY created_at
"@

$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$out = & python (Join-Path $repoRoot "scripts\db-read.py") $query 2>&1 | Out-String
$rc  = $LASTEXITCODE
$ErrorActionPreference = $prevEAP

if ($rc -ne 0) {
  # Fail LOUD in the log, but never fabricate a verdict and never reopen the lane on an error.
  Add-Content -Path $heartbeat -Value "$stamp  ERROR (read failed, rc=$rc) — no verdict, monitor stays armed"
  Add-Content -Path $heartbeat -Value ($out.TrimEnd())
  exit 1
}

if ($out -match "\(0 rows\)") {
  Add-Content -Path $heartbeat -Value "$stamp  no matching render — silent, still armed"
  exit 0
}

# MATCH. Write the trigger and stop. Collecting the evidence record is the reopened session's job.
$body = @"
# 🔔 B-roll Rotation Governance v1 — FIRST NATURAL PRODUCTION RENDER DETECTED

Detected: $stamp (UTC) by ``.claude/routines/broll-rotation-monitor.ps1``
Baseline: ``docs/briefs/results/broll-rotation-governance-v1-monitoring-baseline-result-v1.md``

The monitor is now DISARMED and will stay silent until this file is deleted.

## Matching render(s) — coarse condition only

``````
$($out.TrimEnd())
``````

## What the reopened session must do

1. **Confirm the `broll_` predicate** the monitor cannot see — read
   ``m.post_render_log.render_spec -> 'template' -> 'tmr'`` for each render above and check the
   ``slot_reasons[] ? (@.slot == "Background")`` ``asset_key`` starts with ``broll_``.
   *A static ``bg_pp_*`` key is NOT a false alarm — it means parity is not reaching production.
   Record it and re-arm.*
2. **Collect the full twelve-field evidence record**: selected asset · previous two assets ·
   consecutive-repeat count · geography requested · geography selected · generic-fallback usage ·
   compatibility rejects · asset-shortage failures · resolver-reachable pool count · render
   dimensions + duration · render failure/retry count · whether an immediate retry retained the
   same asset.
3. **Apply the alert conditions** (any consecutive repeat · contradictory geography · reachable
   pool < 6 · declared ≠ reachable · disproportionate generic fallback · immediate retry changing
   the asset · output-parity regression · a clip unreachable/unhealthy).
4. **Note the baseline exception:** the FIRST natural B-roll render runs with **no effective
   B-roll-history exclusion** (the window then held two static ``bg_pp_*`` keys). Exclusion becomes
   load-bearing from the second natural render onward. Do not read that as a rotation defect.
5. Then either declare monitored steady state, or open a narrowly scoped remediation lane.
"@

Set-Content -Path $trigger -Value $body -Encoding UTF8
Add-Content -Path $heartbeat -Value "$stamp  *** MATCH — trigger written, monitor DISARMED ***"
exit 0
