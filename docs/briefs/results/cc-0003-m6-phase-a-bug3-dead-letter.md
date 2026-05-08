# Result cc-0003 — M6 Phase A apply (HALTED at §1.5)

**Brief:** `docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md` (v1 patched, blob `d181b16d…`, 43,497 B)  
**Executor:** Claude Code  
**Session date:** 2026-05-09 Sydney  
**Outcome status:** HALTED at §1.5 disjointness invariant fail (slot_driven_count=2; brief expected=0)  
**Production state changed:** NO (read-only SELECTs only; no apply_migration, no D-01 fire, no SQL writes)  
**Disposition:** cc-0003 v1 superseded by cc-0003 v2 patch (commit lands same session; this result file is preserved as v1 HALT audit trail)

---

## 1. Outcome

**Status:** Halted_v1  
**Reason:** §1.5 sanity check returned `slot_driven_count = 2` against brief-expected `0`. Brief decision rule: "HALT and escalate — the criterion may be capturing rows we don't intend." CC followed the rule and stopped before D-01.

No §1.6, no §1.7. No P1–P5 walk. No D-01 packet prepared. No `apply_migration` call. No close-the-loop. No 4-way sync. No memory edit.

---

## 2. Pre-flight evidence captured (§1.1–§1.5)

### §1.1 — column structure (PASS)

`m.post_publish_queue` columns confirmed: `queue_id` (uuid, NOT NULL), `client_id` (uuid, nullable), `platform` (text, nullable), `post_draft_id` (uuid, nullable), `status` (text, nullable), `dead_reason` (text, nullable), `scheduled_for` (tstz, nullable), `created_at` (tstz, NOT NULL), `updated_at` (tstz, NOT NULL).

`updated_at` IS present → v1 brief §3 note 3 amendment was applicable, but the apply never reached SQL execution.

### §1.2 — trigger surface (PASS)

Three non-internal triggers on `m.post_publish_queue`. None fire on the proposed UPDATE in a way that produces external side effects:

1. `tr_publish_queue_backoff_368_v1` — BEFORE UPDATE OF `last_error` only. Not fired by `status` UPDATE.
2. `tr_publish_queue_reset_on_success_v1` — BEFORE UPDATE OF `status`. Body inspected: only acts on `new.status = 'published'`. The proposed UPDATE moves to `dead`, so the IF branch is FALSE and the trigger no-ops.
3. `trg_gate_queue_on_asset_status` — BEFORE INSERT only. Not fired by UPDATE.

### §1.3 — Phase A target count (would PASS)

- `phase_a_target_count = 11` (matches v1 draft-time count)
- `partition_count = 3` distinct (client_id, platform) pairs
- `oldest_created_at = 2026-04-25T02:55:00Z`
- `newest_created_at = 2026-05-01T14:55:00Z`
- Inside [5, 25] — would have proceeded past §1.3

### §1.4 — target snapshot (captured for record)

11-row list captured. Of the 11:
- 9 rows have `pd.slot_id IS NULL` (legacy-origin; correctly Phase A scope)
- 2 rows have `pd.slot_id IS NOT NULL` (slot-driven; should NOT be Phase A scope per v1 §1.5 rationale)

The 2 slot-bound rows: `929ee2f9-7bd0-42ce-b6e0-1ff62b88f823` (CFW IG, 2026-04-27, draft `needs_review`, slot `082b081c…`) and `30fa6594-a233-4f1e-a984-7b37fa170fcb` (CFW IG, 2026-04-30, draft `needs_review`, slot `c95be2be…`).

Full queue_id snapshot is preserved in the chat session log of CC's HALT report.

### §1.5 — slot-driven sanity check (FAIL → HALT)

```sql
SELECT COUNT(*) AS slot_driven_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60
  AND pd.slot_id IS NOT NULL;
```

**Result:** `slot_driven_count = 2`. Brief expected `0`. HALT rule fired. Pre-flight terminated.

### §1.6, §1.7 — NOT RUN

Pre-state aggregates and `pre_dead_reason_count` baseline not captured. They are inputs to D-01 / V1 / V3 / V4, none of which were prepared.

---

## 3. Root cause (post-HALT diagnostic by chat)

Chat fired a read-only diagnostic on the 2 anomalous queue_ids (`929ee2f9…` and `30fa6594…`). Findings:

| Check | `929ee2f9…` | `30fa6594…` |
|---|---|---|
| `queue_distinct_from_slot` | TRUE | TRUE |
| `draft_matches_slot` (pd_sched = s_sched) | TRUE | TRUE |
| `queue_distinct_from_draft` | TRUE | TRUE |
| q_secs_after_q_created | 302.2s | 300.9s |
| s_secs_after_q_created | 64,531s (~17.9h) | 86,121s (~24.0h) |

**Diagnosis confirmed:** both rows are v4 mismatch (Phase B / cc-0004) rows that incidentally also match Bug 3's 5-min fingerprint. Sequence:

1. Pre-M3 (5 May): enqueue cron used `COALESCE(pd.scheduled_for, get_next_scheduled_for(...))`.
2. At queue insert (27 Apr / 30 Apr), `pd.scheduled_for` was NULL; fallback returned `q_created + 5 min` (Bug 3).
3. M4 (5 May, applied 2026-05-05 v2.50): backfilled `pd.scheduled_for = s.scheduled_publish_at` for 147 v4 drafts, including these 2.
4. M4 forward-only: did NOT rewrite existing queue rows. Their `q.scheduled_for` retains the Bug 3 5-min fingerprint.
5. Result: queue row's `scheduled_for` is anomalous against the slot's intended publish time AND incidentally matches the Bug 3 fingerprint.

The v1 brief §1.5 invariant assumption was wrong: M4 backfilled `pd.scheduled_for`, NOT `q.scheduled_for`. Slot-bound drafts CAN have queue rows with the Bug 3 fingerprint, and 2 production rows do.

---

## 4. Disposition

The v1 cc-0003 brief is superseded by cc-0003 v2 in the same commit. v2 narrows the Phase A criterion to `pd.slot_id IS NULL` and corrects the §1.5 invariant. The 2 slot-bound rows (`929ee2f9…`, `30fa6594…`) move to cc-0004 (Phase B) scope, where they are correctly captured by `pd.slot_id IS NOT NULL AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at`.

The v1 HALT outcome is preserved here as audit trail. CC will execute cc-0003 v2 in a subsequent session.

**Forward-propagation flag:** cc-0004 §1.5 disjointness check has the same v1 invariant assumption ("row matching BOTH Phase B AND Bug 3 fingerprint is anomalous"). Empirically there are 2 such rows. cc-0004 §1.5 needs a corresponding patch — deferred to a separate cycle, requires PK greenlight per patch-application protocol (cc-0004 §Notes).

---

## 5. Constraints honoured

- No EF deploys.
- No SQL writes (read-only SELECTs against `information_schema`, `pg_trigger`, `m.post_publish_queue`, `m.post_draft`, `m.slot`).
- No cron edits.
- No code changes.
- No Phase 0 scheduling.
- v1 cc-0003 brief itself untouched by CC (the v2 patch is chat's commit).
- No D-01 packet prepared (HALT precedes D-01 per v1 §5/§6 ordering).
- Diagnostic fired by chat post-HALT was scoped to 2 specific queue_ids, read-only, no D-01 needed for sql_read.
- STANDING_THREE untouched. `m.ef_drift_log` untouched.

---

## 6. Open issues (brief-runner-v0 trial feedback)

1. **First HALT outcome in apply-class brief-runner-v0 trial.** Confirms the HALT mechanism works: CC stopped at the rule, captured evidence, escalated to PK + chat. No production state touched. The brief's halt rules + decision-rule pattern are sufficient to stop before damage.
2. **Brief invariant assumptions can be empirically wrong.** v1 §1.5 rationale ("M4 backfilled pd.scheduled_for, so slot-driven drafts can't fingerprint Bug 3") sounded plausible from M4's design intent but was incorrect because M4 was forward-only on `pd`, not retroactive on `q`. Pattern for future apply-class briefs: any disjointness invariant claim should be pre-tested empirically with a read-only SELECT before being baked into the brief's HALT rule.
3. **Brief-runner-v0 lesson:** the existence of §1.5 saved the apply from incorrectly claiming 2 rows that belong to a different reason code. The HALT was correct and load-bearing. This validates the multi-step pre-flight pattern over a single "check count and apply" approach.
4. **Diagnostic-then-patch loop:** the HALT → read-only diagnostic → doc-only patch → re-execution loop adds ~1 cycle of latency but produces a correctly-scoped migration. Acceptable cost for non-rushed pipeline-integrity cleanup.

---

*Result file authored 2026-05-09 Sydney by chat from CC's HALT report (in-session) + post-HALT read-only diagnostic. v1 brief outcome: halted_at_pre_flight_section_1_5. v2 brief follows in same commit. cc-0004 §1.5 propagation patch deferred (separate PK-gated cycle).*
