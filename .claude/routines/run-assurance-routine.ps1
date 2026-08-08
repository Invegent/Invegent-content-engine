# ICE Assurance Routine v1 — daily launcher (Windows Task Scheduler target).
# Read-only, inform-only: the runner cannot remediate, gate, approve, or mutate registers.
# Full output: _harness/assurance_routine/logs/YYYY-MM-DD-routine-v1.md
# Operator attention (NEW FLAG / RECOVERED / UNKNOWN only): _harness/assurance_routine/ATTENTION-latest.md
# Registered task: "ICE Assurance Routine v1 daily" — first trigger 2026-08-12 08:00 (after the
# mutation-watch expiry ~2026-08-11 20:20 Sydney, per PK wiring instruction 2026-08-08).
$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\parve\Invegent-content-engine'
$logDir = '_harness\assurance_routine\logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
node scripts\assurance\routine-v1.mjs --daily *> (Join-Path $logDir ("task-console-{0}.log" -f (Get-Date -Format 'yyyy-MM-dd')))
exit 0  # inform-only: the task never reports failure on a FLAG
