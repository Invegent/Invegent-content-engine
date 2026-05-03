# 2026-05-03 night Sydney — Pipeline relief apply + audit views v1

**Trigger**: PK directive following pipeline investigation; ChatGPT D-01 review_id `cee17af5` ESCALATED partial verdict → PK resolved option (a).

**Closure budget**: ~0.7h chat-side this apply session. Trailing-14d 14.7 → ~15.4h. Above 8.0h floor.

**Migration log**: 2 applied this session.

---

## Major events

### 1. State drift discovery + scope reduction

Between initial investigation (~12 UTC) and apply window (~21 UTC), state drifted:
- Dead queue rows: 10 → 17 (more accumulated)
- Invegent-LI slot 32afbe4a SELF-HEALED via `recover_stuck_slots` (was `pending_fill` past_due, now `filled` with draft `7802673f`, filled_at 5-3 12:40 UTC). Removed from Fix 5 scope.
- NDIS-LI slot 8f9e5c57 still in orphan state (`status=filled`, `filled_draft_id=NULL`, last touched 4-27).

Also flagged my own math error from previous session: cap=30 doesn't unblock 3 of 4 over-cap streams (queue depths 50/72/105 all > 30). Cap lift deferred entirely.

### 2. ChatGPT D-01 escalation cee17af5

Three pushback points: NDIS-FB carry-forward concern (STRONG), view efficiency without indexes (WEAK), orphan slot recovery loop interaction (MEDIUM). PK resolved option (a): proceed with reduced scope (skip Fix 5 orphan slot update; exclude 1 NDIS-FB dead row from sweep).

### 3. Migration 1 first attempt failed (constraint violation)

`m.system_audit_log.triggered_by` check constraint allows only `scheduled|manual|pre-deploy|post-incident`. Initial attempt used custom `pk_directive_pipeline_relief_v1`. Transaction rolled back cleanly (verified 17 rows still present post-fail).

### 4. Migration 1 v2 applied successfully

`pipeline_relief_dead_queue_sweep_v2`. Used `manual` triggered_by. Result:
- **16 rows deleted**: 12 PP-FB + 4 CFW-IG (NDIS-FB row preserved per F-PUB-005 carry-forward)
- Audit log row recorded with breakdown payload
- Verification: 1 dead row remaining (the protected NDIS-FB row)

### 5. Migration 2 applied successfully

`audit_schema_and_views_v1`. Created:
- Schema `audit` (with comment)
- `audit.v_publish_queue_summary` (aggregates m.post_publish_queue by client/platform/status with overdue/locked/error counters)
- `audit.v_slot_health_by_client_platform` (with CORRECTED slot status vocab: filled/future/failed/pending_fill; includes `orphan_filled_slots` column for the filled-but-NULL-draft pathology)

Smoke-tested both views immediately. Working.

### 6. New finding from first audit view query

The new `v_slot_health_by_client_platform` immediately surfaced **Property Pulse Facebook with 1 orphan_filled_slot + 1 pending_fill_slot** — not in tonight's original diagnosis. Logged as new finding for next session.

---

## State of the 4 stalled streams (post-apply)

| Stream | Last published | Hours ago | Tonight's effect |
|---|---|---|---|
| NDIS-Yarns LinkedIn | 5-1 00:00 | ~70h | unchanged (cap lift deferred) |
| CFW LinkedIn | 4-30 07:20 | ~88h | unchanged (recovery loop patch deferred) |
| CFW Facebook | 4-30 19:15 | ~76h | unchanged (was just normal cadence gap; resumes with next slot) |
| Invegent LinkedIn | 4-30 03:00 | ~92h | partially resolved — stuck pending_fill self-healed earlier today, will publish via filled draft |

For Property Pulse Facebook: 12 dead queue rows cleared, jobid 48 will re-enqueue underlying drafts at next 5-min tick. Queue 3 → expected ~15. Under cap 20. Will publish on cadence.

---

## Standing rules honoured

- **D-01**: ChatGPT review fired (`cee17af5`), ESCALATED with 3 pushback points, PK resolved option (a) explicitly. Modifications captured in revised migration scope.
- **D-170**: chat applied migrations only via `apply_migration`. No CLI use.
- **D-186**: closure +0.7h this session, trailing-14d 14.7 → 15.4h, above 8.0h floor.
- **F-PUB-005 carry-forward**: 1 NDIS-FB dead queue row preserved despite being eligible for sweep, per protected-stream caution.
- **G1 sync_state convention**: this session writes its own file at `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md`.

## Pattern signals

- **Lesson #62 type-(a) reinforced**: ChatGPT pushback on NDIS-FB exclusion was correctly classified as actionable (strong objection) vs the view-efficiency concern (weak). The 3-tier classification (strong/medium/weak) discipline held.
- **State drift between investigation and apply**: 9-hour gap saw dead row count grow 10→17 and 1 stuck slot self-heal. Pattern signal: pre-flight verification immediately before apply is essential. **Lesson candidate**: state-snapshot age ≥ 4h requires re-verification before any DML/DDL.
- **Audit view pays for itself on first use**: `v_slot_health_by_client_platform` surfaced PP-FB orphan/pending finding that ad-hoc SQL had missed. Validates the audit-view-as-summary pattern (subset of original 20-view proposal).

## What's deferred to next session

- **Cap lift** with revised per-stream targets (~80/100/130/30 paired with F-PUB-009 fix)
- **Fix 3** recovery loop function patch (CFW LinkedIn 4 marked_failed slots remain quiescent)
- **Fix 2** F-PUB-009 structural fix (legacy spread)
- **C3 audit view** v_brand_platform_audit_matrix (full rewrite from scratch)
- **PP-FB orphan + pending_fill** investigation (new finding from C2 view)
- **NDIS-LI orphan slot 8f9e5c57** (left untouched per Fix 5 deferral)
- **B-CRON-BLOAT** check (`cron.job_run_details` 260MB suspected bloat)

## Honest limitations

- The 16 deleted rows include 4 CFW-Instagram rows for a paused stream. Cleanup is hygiene only; no publishing benefit since cron 53 is inactive. Tracked but not blocking.
- `audit.v_publish_queue_summary` includes `array_agg` of error codes/heads which could become large if many distinct errors accumulate. At current scale (1-4 distinct errors per group) this is fine. Re-evaluate if size becomes an issue.
- Cap math error correction (cap=30 doesn't unblock) was caught only at apply-time. Should have been caught in initial proposal. Better pre-flight discipline next time.
- The PP-FB orphan/pending finding suggests there may be MORE orphan slots that the audit view will reveal across other (client, platform) pairs as time passes. Worth making the audit view part of nightly health check output.

---

## Migration record

| Migration name | Effect | Verified |
|---|---|---|
| pipeline_relief_dead_queue_sweep_v2 | DELETE 16 from m.post_publish_queue + INSERT 1 m.system_audit_log row | Yes (count check + audit row check) |
| audit_schema_and_views_v1 | CREATE SCHEMA audit + 2 CREATE OR REPLACE VIEW | Yes (smoke test queries returned expected shape + counts) |

*Author: chat. PK directed option (a). D-01 ESCALATED resolved by PK direction.*
