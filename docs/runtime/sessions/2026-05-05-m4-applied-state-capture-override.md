# Session: M4 applied — state-capture override — 2026-05-05 Sydney early afternoon

## Headline

M4 (Defect 5: enqueue `scheduled_for` source semantics + slot intent backfill for v4 drafts) **APPLIED** via `apply_migration` `m4_enqueue_scheduled_for_slot_intent_and_backfill`. Both D-01 reviews escalated with verbatim-identical generic pushback; PK approved Lesson #62 state-capture override. **8/8 post-apply verifications PASS.** Forward flow proven within minutes of apply.

## Context

PK directed M4 only at session start. Scope locked to Defect 5 fix per brief `docs/briefs/2026-05-05-queue-integrity-incident.md` v3 (commit `06510ff`):

- Backfill `pd.scheduled_for = slot.scheduled_publish_at` for v4 drafts where `pd.scheduled_for IS NULL`
- Patch cron jobid 48 to add `slot.scheduled_publish_at` to COALESCE chain (after `pd.scheduled_for`, before `get_next_scheduled_for` fallback)
- Preserve M3 `WHERE computed_scheduled_for IS NOT NULL` guard
- No v4 promotion / no legacy disable / no `p_shadow` change / no broad queue cleanup

## Pre-flight P1-P5

| # | Check | Result |
|---|---|---|
| P1 | jobid 48 SQL read | M3 guard + F-PUB-010 cap + ON CONFLICT confirmed preserved in patch design |
| P2 | schema verification | `pd.slot_id` uuid nullable; `s.scheduled_publish_at` timestamptz NOT NULL; FK `pd.slot_id → s.slot_id` confirmed |
| P3 | pre-state evidence | 147 backfill candidates; 48 of 49 v4-origin queued rows mismatch slot intent (1 matches via F-PUB-009 forward write) |
| P4 | dry-run vs current eligibility | 5/5 v4-null-pd → slot ✓; 0 legacy changed; 0 pd-set changed; 0 NULL-after-patch |
| P5 | trigger analysis + rollback | only `set_updated_at` fires on `scheduled_for` UPDATE; rollback via `updated_at` window + `cron.alter_job` restore |

## D-01 review fires (2 fires; both escalated)

**First fire `b03eaf14-75c5-4334-92e7-f65449a22a87`** — escalated with generic pushback ("Potential for data integrity issues if backfill is executed incorrectly..."). `verified_claims` acknowledged 147 rows + rollback path. `corrected_action` generic ("comprehensive validation and backup, monitoring").

**Re-fire `602b0fb2-7bce-4a3f-bad1-61750f6724e0`** after empirical strengthening — escalated with **VERBATIM-IDENTICAL** pushback. `verified_claims` acknowledged transaction-rollback test + zero residue. `corrected_action` remained generic.

PK approved Lesson #62 state-capture override based on: (a) two fires both generic, (b) verbatim-identical pushback, (c) no specific unaddressed objection, (d) `verified_claims` body acknowledges clearance.

## Empirical strengthening: transaction-rollback test

Inserted 4 synthetic rows (2 slots + 4 post_drafts + 4 ai_jobs) inside `BEGIN/ROLLBACK`. Ran patched COALESCE structure against synthetic + real schema. ROLLBACK at end — zero production residue.

| Scenario | Setup | Patched resolution | Result |
|---|---|---|---|
| A v4 null pd | slot_id set, pd=NULL, slot=2099-01-01 | 2099-01-01 (slot intent) | PASS — Defect 5 fix |
| B v4 pd set | slot_id set, pd=2099-02-15, slot=2099-03-01 | 2099-02-15 (pd preserved) | PASS — F-PUB-009 fwd-write intact |
| C legacy w/ schedule | slot_id NULL, pd NULL, linkedin | 2026-07-08 (`get_next_scheduled_for` output) | PASS — legacy unchanged |
| D legacy no schedule | slot_id NULL, pd NULL, tiktok (no schedule) | NULL → M3 guard skips | PASS — M3 preserved |

Backfill set determinism (read-only): 147/147 rows satisfy invariants — `slot_id IS NOT NULL`, `pd.scheduled_for IS NULL`, `slot.scheduled_publish_at IS NOT NULL`, no legacy leakage (0), no orphan slot_id references (0). Slot status distribution: 137 'filled' + 10 'failed'. Failed-slot drafts harmless: candidates CTE requires `j.status='succeeded'`, so failed-slot drafts will never enqueue regardless of backfill.

## Apply

**Migration:** `m4_enqueue_scheduled_for_slot_intent_and_backfill` (apply_migration via Supabase MCP per D-170).

**Apply timestamp:** ~2026-05-05 04:14 UTC (~14:14 AEST).

**Body (two atomic operations):**

1. `UPDATE m.post_draft pd SET scheduled_for = s.scheduled_publish_at FROM m.slot s WHERE pd.slot_id = s.slot_id AND pd.slot_id IS NOT NULL AND pd.scheduled_for IS NULL;`
2. `cron.alter_job(48, command := <patched>)` — adds `LEFT JOIN m.slot s ON s.slot_id = pd.slot_id` in candidates CTE outer + `s.scheduled_publish_at` as 2nd COALESCE arg. F-PUB-010 hard-cap, DISTINCT ON ordering, NOT EXISTS guards, M3 `IS NOT NULL` filter, ON CONFLICT clause all preserved verbatim.

## 8/8 post-apply verification

| # | Check | Result | Pass |
|---|---|---|---|
| V1 | exactly 147 rows backfilled | `rows_updated_in_apply_window=147` | ✓ |
| V2 | backfilled rows aligned to slot | aligned=160 (147 new + 13 prior F-PUB-009); diverging=0; still-null=0 | ✓ |
| V3 | cron 48 uses new resolution order | `LEFT JOIN m.slot` present; COALESCE order pd→slot→get_next | ✓ |
| V4 | M3 guard preserved | `WHERE computed_scheduled_for IS NOT NULL` present | ✓ |
| V5 | legacy fallback preserved | `public.get_next_scheduled_for(j.client_id, j.platform, NOW())` present | ✓ |
| V6 | queue NULL `scheduled_for` count | 0 | ✓ |
| V7 | scope-constraints | cron 75 still `p_shadow:=true`; cron 48 active=true; `p_shadow` param present; `is_shadow` columns present (2); M3 dead-row count unchanged (1); 0 new dead-letters in apply window | ✓ |
| V8 | both D-01 reviews close-the-loop | `action_taken='lesson_62_state_capture_override_applied_m4_2026_05_05'`; `escalation_resolved_at` set | ✓ |

**Forward-flow bonus:** 2 new v4-origin queue rows created post-apply by patched cron, both aligned to `slot.scheduled_publish_at`. Cron 48 actively producing correctly-routed enqueues.

## Lesson #62 — sixth vindication

Pattern reinforced: ChatGPT MCP escalates `sql_destructive` actions with generic pushback even when `verified_claims` body acknowledges clearance. Re-fire produces verbatim-identical pushback. Distinguishable from T-MCP-08 type-(b) genuine new knowledge by:

- pushback wording verbatim-identical between fires
- `corrected_action` remains generic (not empty)
- no specific empirical concern raised

**Sixth vindication.** Ready for canonical promotion (was at 5+ since v2.34; this session is +1).

## Carry-forward

- **47 v4-origin queue rows still mismatch slot intent** — pre-M4 legacy artifacts. M4 forward-only by design (does not retroactively rewrite existing queue rows). M6 Phase B address scope.
- **Residual unknown**: 2 anomalous queue rows (NDIS-LI 12:00 + 18:00 UTC, both 2026-05-04, no Bug 3 fingerprint, no clear mechanism). Defer per brief Q6.

## Closure budget impact

This session: ~1h (P1-P5 + 2 D-01 fires + transaction-rollback test + apply + 8-check verification + close-the-loop UPDATEs).

Day total: ~4.5h (Tier 1 morning ~3.5h + M4 afternoon ~1h).

Trailing-14d: ~23.5h. Above 8.0 floor.

## Standing rules honoured

- **D-01**: 2 fires (override applied per Lesson #62 PK directive after generic-only pushback)
- **D-170**: apply via Supabase MCP `apply_migration`
- **Lesson #61**: pre-flight P1-P5 honoured before apply
- **G1**: this session-detail file lives at `docs/runtime/sessions/`; sync_state remains lightweight pointer index
- **Lesson #62**: sixth vindication; ready for canonical promotion

## Net P0+P1 open

4 → 4 (M4 closed; M5 promoted to recommended-next).
