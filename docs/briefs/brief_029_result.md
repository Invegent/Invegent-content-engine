# Brief 029 Result — Healer Agent

**Executed:** 13 April 2026
**Commit:** 1de0381

## Task Results
| Task | Status |
|------|--------|
| SECURITY DEFINER heal functions (2) | COMPLETED |
| Edge Function: pipeline-healer | COMPLETED — ACTIVE |
| pg_cron: pipeline-healer-every-15m (job 50) | COMPLETED |
| Sentinel fix_action context | Already present from Brief 027 |
| Deploy | COMPLETED |

## Heal Functions
- `heal_reset_stuck_ai_jobs(uuid)` — resets pending >2h AI jobs to queued
- `heal_reset_stuck_queue(uuid)` — resets stuck publish queue items to queued

## Governance
- Never touches tokens, external APIs, or client config
- Only resets status fields back to retriable state
- Every heal logged via resolve_pipeline_incident with resolved_by='healer-auto'
- Cron schedule: minutes 2,17,32,47 (2 min after Sentinel)
