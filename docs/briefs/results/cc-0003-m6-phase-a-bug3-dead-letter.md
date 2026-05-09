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

---

# Result — cc-0003 v2 — APPLIED (M6 Phase A v2 closed)

**Brief:** `docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md` (status v2; commit `f91d9c7`)
**Apply session:** 2026-05-09 Sydney
**Executor:** CC (Claude Code)
**D-01 review:** PASS (agree / proceed) per chat fire prior to apply
**PK approval phrase received:** "myself pk approve - proceed with cc-0003 v2 apply"
**Outcome:** APPLIED via Supabase MCP `apply_migration`. All 6 verification checks (V1–V6) PASS. 9 rows dead-lettered. No rollback required.

---

## v2.1 Apply summary

| Item | Value |
|---|---|
| Migration name | `m6_phase_a_bug3_fingerprint_dead_letter_v2` |
| Project | `mbkmaxqhsohbtwsqolns` |
| Method | Supabase MCP `apply_migration` (single atomic transaction) |
| `apply_migration` return | `{"success": true}` |
| Rows updated | 9 |
| Rollback fired | NO |
| §8 path triggered | NONE (clean apply path) |

## v2.2 Pre-flight + final re-verification

Initial pre-flight (run before D-01 fire) and final re-verification (~60s before apply) returned identical values. No drift across the verification window.

| Check | Initial value | Re-verify value | Status |
|---|---|---|---|
| §1.1 columns | required columns present; `updated_at` NOT NULL on queue; `slot_id` nullable on draft | (not re-run; structural) | PASS |
| §1.2 triggers | 3 surveyed; only `tr_publish_queue_reset_on_success_v1` fires on UPDATE OF status; inner IF only acts on `new.status='published'` (no-op for our 'dead' UPDATE) | (not re-run; structural) | PASS |
| §1.3 phase_a_target_count | 9 (in `[3, 20]`) | **9** | PASS |
| §1.5 partition arithmetic | 9 + 2 = 11 (slot_driven_incidental=2 in `[0, 7]`) | **9 + 2 = 11** | PASS |
| §1.7 pre_dead_reason_count | 0 | **0** | PASS |
| §1.4 captured queue_id list | 9 IDs (all `queued`) | **9 IDs identical, all still `queued`** | PASS |

## v2.3 Apply target — final 9 queue_ids dead-lettered

| # | queue_id | client | platform |
|---|---|---|---|
| 1 | `7bf95451-ce60-4a05-b013-ef72cc153cc3` | NY | instagram |
| 2 | `e9f9646c-6a32-48a2-9976-65c64a23c8d2` | NY | instagram |
| 3 | `2a20945f-5686-4e18-a578-7f647123df12` | NY | instagram |
| 4 | `198cafdd-7be0-47a6-a166-ffbe91a86750` | NY | instagram |
| 5 | `1ee24789-b388-4424-ab91-422372f69d53` | NY | instagram |
| 6 | `f93f8072-8f56-4371-a002-26dd6141a8f8` | NY | instagram |
| 7 | `958a6c98-bd5e-4db4-9aaf-18f358890f26` | NY | instagram |
| 8 | `c736a6ff-7c1a-49f0-821d-7e0da51460ab` | PP | instagram |
| 9 | `7bcb5574-4932-4720-ad8d-160012195935` | PP | instagram |

All 9: `pre_status='queued'`, `pre_dead_reason=NULL`, `pd.slot_id=NULL`, `pd.approval_status='approved'`. Post-apply: `status='dead'`, `dead_reason='anomalous_scheduled_for_bug3_fallback'`, `updated_at=NOW()`.

## v2.4 Verification queries (V1–V6) — all PASS

| V | Query | Expected | Actual | Status |
|---|---|---:|---:|---|
| V1 | `COUNT(*) WHERE dead_reason='anomalous_scheduled_for_bug3_fallback'` | `0 + 9 = 9` | **9** | PASS |
| V2 | `COUNT(*)` matching v2 criterion in `(queued, failed)` | `0` | **0** | PASS |
| V3 | `COUNT(*) WHERE status IN ('queued','failed')` | `488 - 9 = 479` | **479** | PASS |
| V4 | `COUNT(*) WHERE status='dead'` | `48 + 9 = 57` | **57** | PASS |
| V5 | result list of `(status='dead', dead_reason=target)` queue_ids | exactly the 9 captured set (since `pre_dead_reason_count=0`) | **9 IDs returned, set-equal to capture, no extras** | PASS |
| V6 | per-status totals coherence | queued: 488→479, dead: 48→57, published: 95 unchanged, failed: absent both sides | **queued=479, dead=57, published=95** | PASS |

V5 result list (alphabetical), confirmed set-equal to §1.4 capture:
```
198cafdd-7be0-47a6-a166-ffbe91a86750
1ee24789-b388-4424-ab91-422372f69d53
2a20945f-5686-4e18-a578-7f647123df12
7bcb5574-4932-4720-ad8d-160012195935
7bf95451-ce60-4a05-b013-ef72cc153cc3
958a6c98-bd5e-4db4-9aaf-18f358890f26
c736a6ff-7c1a-49f0-821d-7e0da51460ab
e9f9646c-6a32-48a2-9976-65c64a23c8d2
f93f8072-8f56-4371-a002-26dd6141a8f8
```

## v2.5 §4 P1–P5 walk results

- **P1** Pre-state capture: 7/7 PASS (all §1.x captured, values in v2.2 above).
- **P2** Side-effect surface: P2.1–P2.6 all reviewed. Publisher loses 9 eligible queue rows (cap-limited; trivial); cleanup_queue_on_publish_v1 doesn't fire on this UPDATE; cron 48 unaffected; UI counts shift; vw_pipeline_state not yet built; health-check Cowork sees the count shift.
- **P3.1** dead_reason references — 3 functions identified, all safe:
  - `m.dead_letter_sweep`: writes to `m.post_publish_queue.dead_reason` only `WHERE status='locked' AND locked_at < now() - interval '2 hours'` (disjoint from our `status='queued'` targets) with dynamic `'sweep: ...'` value (different from our literal). No collision.
  - `m.fill_pending_slots`: only sets `dead_reason = NULL` on slot-fill, touches slot-bound rows only. Our targets are `pd.slot_id IS NULL`. No collision.
  - `public.reset_stuck_ai_jobs`: writes to `m.ai_job.dead_reason`, NOT `m.post_publish_queue`. Out of scope.
- **P3.2** code-collision check on `'anomalous_scheduled_for_bug3_fallback'`: 0 hits. No live code writer.
- **P3.3** draft state distribution: 9/9 `approval_status='approved'`. Per §10.2 precedence rule 1, view `state` becomes `dead` because queue is dead, drafts unchanged.
- **P3.4** Cowork brief queue_id references: none.
- **P3.5** forward-look slot-driven incidentals to cc-0004: both 2 rows confirmed `will_match_phase_b=true`.
- **P4** Reversibility: 4/4 PASS (rollback path templated from captured queue_id list, no irreversible side effects, indefinite rollback window, no collision risk).
- **P5** Verification preconditions: 6/6 ready before apply.

## v2.6 D-01 record

- **Verdict:** agree / proceed (clean PASS).
- **Conditions:** re-run final read-only verification immediately before apply (PASSED — see v2.2); halt if count is 0 or outside `[3, 20]` (NOT triggered — count was 9); use exact cc-0003 v2 SQL from packet (USED VERBATIM); apply only after PK explicit approval (RECEIVED); after apply, run V1–V6 (DONE — all PASS); write/append v2 result file (THIS SECTION).
- **PK approval phrase:** "myself pk approve - proceed with cc-0003 v2 apply" (received 2026-05-09).

T-MCP-02: chat fired one D-01 review; close-the-loop UPDATE on `m.chatgpt_review` is a chat-owned action at v2.55 4-way sync close.

## v2.7 Hold-state assertions (this apply turn)

- One `apply_migration` call. No second migration. No rollback fired (V1–V6 all PASS).
- Read-only `SELECT` against `m.post_publish_queue`, `m.post_draft`, `information_schema.columns`, `pg_trigger`, `pg_proc`, `pg_views`, `m.slot` only. No DDL. No DELETEs.
- Only `m.post_publish_queue` was written (UPDATE on 9 rows). No other tables modified.
- `STANDING_THREE` array untouched. `m.ef_drift_log` untouched. No cron edits. No EF deploys. No code changes. No Phase 0 scheduling.
- `m.chatgpt_review` close-the-loop UPDATE deferred to chat (standing protocol).
- 4-way sync close (session file + sync_state v2.55 pointer + action_list v2.55 closure of M6 Phase A + memory `recent_updates` v2.55 entry) deferred to chat.

## v2.8 Open / next

- **Closed v2.55 (proposed):** M6 Phase A (v2; commit referencing this result file). Action list bump pending chat close.
- **Sequencing unblock:** cc-0004 (M6 Phase B) sequencing gate is **MET** (cc-0003 v2 result status `Complete`). cc-0004 apply session can be scheduled when PK directs. Per cc-0004 brief §6 step 1, the apply session will read this result file and verify status before proceeding.
- **2 slot-driven CFW IG rows** (`929ee2f9-7bd0-42ce-b6e0-1ff62b88f823`, `30fa6594-a233-4f1e-a984-7b37fa170fcb`) remain in `(queued, slot_id IS NOT NULL, fingerprint-matching)` state. P3.5 confirmed `will_match_phase_b=true` for both. They will be cleaned up by cc-0004.
- **No memory edit** by CC (chat-owned at v2.55 close).

---

*v2 outcome appended 2026-05-09 Sydney by CC. Pre-flight, final re-verification, D-01-conditioned apply, V1–V6 verification all PASS in single session. No rollback. cc-0004 sequencing gate now met.*
