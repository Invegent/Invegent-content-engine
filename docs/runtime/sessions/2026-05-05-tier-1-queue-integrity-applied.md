# 2026-05-05 — Tier 1 Queue Integrity Remediation Applied (M1 + M2 + M3)

**Session window:** ~02:08–03:30 UTC (Sydney early morning)
**Slug:** `tier-1-queue-integrity-applied`
**Outcome:** All three Tier 1 migrations from the queue integrity incident brief (commit `06510ff`) live and verified. Exactly one Bug 3 fingerprint row dead-lettered. 108 historical anomalies intentionally untouched per scope. M4-M8 deferred.

---

## Headline

Three production migrations applied via Supabase MCP in one session. D-01 reviews fired for each. M2 and M3 escalated on first review and re-fired with strengthened empirical evidence (transaction-rollback synthetic state injection + CTE-filter test); both proceeded on second fire. All verification queries passed.

---

## Migrations applied

### M1 — `m1_cleanup_trigger_filter_by_queue_id` (~02:08 UTC)

- **Bug:** `m.cleanup_queue_on_publish_v1` deleted ALL queue rows for a `post_draft_id` on publish, including rows on other platforms (cross-platform queue wipe).
- **Fix:** Added `WHERE queue_id = NEW.queue_id` to the trigger DELETE, with `NEW.queue_id IS NOT NULL` guard so direct-publish rows (queue_id NULL) leave the queue alone.
- **D-01:** review_id `02557e30-0bc0-4183-af83-6cd1bc20a8ef` — agree, medium risk, high confidence, proceed (first fire).
- **Verification (4/4 PASS):**
  - V1: pg_get_functiondef confirms new body.
  - V2: trigger still attached.
  - V3: queue_id IS NULL audit unchanged at 34 rows (12 website + 22 instagram direct-publish; guard correctly no-ops).
  - V4: behavioural test BEFORE: fb=false / li=false (bug); AFTER: fb=false / li=TRUE (fix verified).
- **Loop closed** via `public.close_chatgpt_review`.

### M2 — `m2_publisher_lock_queue_v2_per_partition_cap` (~02:35 UTC)

- **Bug:** `m.publisher_lock_queue_v2` could lock up to `p_limit` rows per `(client, platform)` partition per call when partition had ≥3 eligible rows and min_gap was satisfied — cap loose by `p_limit - remaining_cap`.
- **Fix:** ONE new WHERE clause in picked CTE: `where e.rn <= GREATEST(0, COALESCE(e.max_per_day, 999) - e.published_today)`. Eligible CTE preserved exactly. Signature unchanged. FIFO preserved.
- **D-01 first fire:** review_id `5850dc5a-3e58-4d12-8dba-110992a7f01c` — escalate=true. Pushback: "Scenario B not empirically validated due to time-of-day constraints."
- **D-01 re-fire:** review_id `e464d685-d87c-4284-8c96-526fa2973089` — agree, medium risk, high confidence, proceed. verified_claims included synthetic + empirical multi-partition test.
- **Strengthened evidence for re-fire:** transaction-rollback test with in-transaction synthetic published-row injection (real draft FKs, queue_id=NULL safe vs M1 trigger). Y=Invegent-LI(remaining=2) + Z=CFW-LI(at-cap via 2 synthetic publishes today) → BEFORE: y_locked=3 (Bug 2 in multi-partition; overage), z_locked=0 (at-cap Z does NOT block Y). AFTER: y_locked=2, z_locked=0.
- **Verification (5/5 PASS):**
  - V1: new picked-CTE WHERE present; eligible CTE filters all preserved (max_per_day, min_gap, paused_until, stale-lock, running-check); FIFO preserved.
  - V2: signature unchanged.
  - V3: caller `m.publisher_lock_queue_v1` still references v2.
  - V4: empirical Scenario A re-run: test_rows_locked=2 (BEFORE=3).
  - V5: empirical Scenario B re-run: y_locked=2, z_locked=0 (BEFORE=3,0).
- **Loop closed** via `public.close_chatgpt_review`.

### M3 — `m3_get_next_scheduled_for_null_fallback_and_enqueue_guards` (~02:56 UTC)

Five components in one atomic apply_migration call:

1. **Patched `public.get_next_scheduled_for`:** replaced `RETURN p_from_utc + INTERVAL '5 minutes'` with `RETURN NULL`. Slot search logic preserved. Old text retained as commented documentation `-- (was: ...)`.
2. **Patched cron jobid 48 (legacy enqueue) via `cron.alter_job`:** wrapped existing query in `WITH candidates AS (...)` + added `WHERE computed_scheduled_for IS NOT NULL` before INSERT. ON CONFLICT preserved. All eligibility filters verbatim.
3. **Patched `public.draft_approve_and_enqueue`:** captured `v_scheduled_for`, added `IF v_scheduled_for IS NULL THEN RAISE NOTICE + RETURN` guard.
4. **Patched `public.draft_approve_and_enqueue_scheduled`:** added `IF v_enqueue_at IS NULL THEN RAISE NOTICE + RETURN jsonb_build_object('ok', false, 'reason', 'no_schedule_configured', ...)` guard.
5. **Dead-lettered ONE row:** `queue_id ad573844-c44a-4aa1-a43a-7f222e5b912e` (PP-YT, post_draft `4f07da94`, scheduled `2026-05-03 10:00:57.655901 UTC`, sub-second Bug 3 fingerprint) with `dead_reason='m3_bug3_fallback_artifact_2026-05-05'`. Belt-and-braces guards on UPDATE (`status='queued' AND scheduled_for=...`).

- **D-01 first fire:** review_id `ba0fe26f-e1cd-4792-9dcc-8d76c403422d` — escalate=true. Pushbacks: "multi-object complexity" + "no empirical CTE-wrapper test."
- **D-01 re-fire:** review_id `6657f70c-73d6-42d8-a317-ee1cd57f1123` — agree, medium risk, high confidence, proceed.
- **Strengthened evidence for re-fire:** synthetic VALUES-based empirical CTE-filter test exercising the exact patched WHERE clause from cron 48. Pre-fix simulation passed 3 candidates (incl NULL); post-fix simulation passed 2 (NULL excluded). test_passed=true.
- **Verification (8/8 PASS):**
  - V1 stricter (comment-aware): active code has `RETURN NULL`; no active old fallback; old text exists only in `-- (was: ...)` documentation.
  - V2: cron 48 has CTE wrapper + IS NOT NULL filter + ON CONFLICT preserved + still active.
  - V3: both manual approval functions have NULL guards.
  - V4: no-slot path returns NULL (was NOW()+5min pre-fix).
  - V5: normal-path returns valid slot timestamps for all 14 (client × configured-platform) combos.
  - V6: end-to-end empirical (CFW-YT no-slot filtered out; Invegent-LI passes filter).
  - V7: dead-letter row state correct (status='dead', dead_reason='m3_bug3_fallback_artifact_2026-05-05').
  - V8: 0 rows in queue with NULL scheduled_for (unchanged from baseline; structural guards prevent introduction).
- **Loop closed** via `public.close_chatgpt_review`.

---

## 8-check post-apply verification (PK directive)

| # | Check | Verdict |
|---|---|---|
| 1 | Full function+CTE pipeline (no-slot client → NULL → filtered) | PASS |
| 2 | `m.post_publish_queue` NULL `scheduled_for` count = 0 | PASS |
| 3 | Normal configured-slot clients return valid slot timestamps | PASS (14 / 14) |
| 4 | Manual approval helpers don't insert NULL `scheduled_for` | PASS (transaction-rollback empirical test, both helpers, synthetic CFW-YT post_drafts) |
| 5 | Only `queue_id ad573844` dead-lettered with M3 reason | PASS (1 row, exact match) |
| 6 | No broad future legacy rows dead-lettered | PASS (108 historical anomalies still queued, was 109 pre-M3) |
| 7 | No v4 promotion / legacy disable / p_shadow change | PASS (cron 48 active=true; m.fill_pending_slots intact; m.bundle_client_v4 intact; only m1/m2/m3 in today's migration history) |
| 8 | D-01 review loops closed | PASS (all 3 closed: 02557e30 / e464d685 / 6657f70c — all `status=completed, resolved_by=PK`) |

V1 false-positive treated as verification-pattern issue (regex matched commented documentation). V1-strict pattern with comment-stripping confirms active code path is correct. No comment removal performed (scope expansion not justified).

---

## Scope honor (PK 8-item directive)

- ✓ Fallback no longer returns `p_from_utc + INTERVAL '5 minutes'`
- ✓ Preferred behaviour `NULL` when no enabled slot found
- ✓ Legacy enqueue path safely skips NULL via `WHERE IS NOT NULL` filter; manual approval functions raise NOTICE + skip
- ✓ Early-safe cleanup: 1 row only (queue_id ad573844)
- ✓ NO broad legacy dead-letter (108 historical anomalies intentionally untouched, deferred to M6 Phase A)
- ✓ NO v4 promotion (m.bundle_client_v4 unchanged)
- ✓ NO legacy enqueue disable (cron jobid 48 still active=true, just patched)
- ✓ NO p_shadow change (m.fill_pending_slots untouched)

---

## Lessons reinforced

**T-MCP-08 (re-fire after escalation produces genuine new knowledge):** vindicated twice this session.

- M2 escalation pushback on synthetic-only Scenario B → re-fired with empirical multi-partition transaction-rollback test → proceed.
- M3 escalation pushback on no empirical CTE-wrapper test → re-fired with synthetic VALUES-based CTE-filter test → proceed.
- Both re-fires produced new `verified_claims` content reflecting the additional evidence and empty `corrected_action`. Distinguishable from Lesson #62 type-(c) consistency-bias.

**Lesson #61 (P1-P5 pre-flight):** honoured before each of M1, M2, M3 — function definitions captured, all callers identified, signatures documented, rollback paths recorded, verification queries designed.

**Lesson #51 (sync_state restructure honour):** G1 convention followed — this session writes its own file; sync_state pointer-index update only.

---

## Pending after this session

- **M4** (Defect 5: enqueue cron `pd.scheduled_for` source semantics + slot backfill for v4 drafts) — pending separate D-01 + PK approval. Recommended next.
- **M5** (`p_shadow` binary decision — keep or rip) — pending PK call.
- **M6** (Phase A dead-letter — 108 historical Bug 3 fingerprint anomalies) — sequenced after M4 confirms upstream bugs fully fixed.
- **M7 + M8** (promote v4 + disable legacy + Phase B dead-letter) — sequenced last.

**7 close-the-loop UPDATEs pending** (4 carry-overs from prior batches + 3 from v2.34) — unchanged this session (3 new closures fired and resolved cleanly within session).

---

## Standing-rule honours

- **D-01:** every production patch routed through ChatGPT Review MCP (5 fires this session — 3 first-fires + 2 re-fires; 0 final escalations remained unresolved).
- **D-170:** chat applies migrations via Supabase MCP (all 3 via `apply_migration`).
- **D-186 closure budget:** ~3.5h closure work this session. Trailing-14-day ~22.5h above 8.0 floor.
- **G1 convention:** session-detail file lives here; sync_state pointer index lightly updated.
- **Lesson #61:** P1-P5 pre-flight before each migration.

---

## Closure budget delta

| Metric | Pre-session | Post-session |
|---|---|---|
| P0+P1 open findings | 4 | 4 (3 cluster diagnoses still active; M4-M8 pending) |
| Trailing-14-day closure hours | ~19.0h | ~22.5h |
| D-01 fires (T-MCP-02 quota) | 24 | 29 (5 fires this session: 3 first + 2 re-fires) |
| Pending close-the-loop UPDATEs | 7 | 7 (3 closed this session, none new accumulated) |

---

## Files & artefacts

- Brief: `docs/briefs/2026-05-05-queue-integrity-incident.md` (commit `06510ff`)
- Migrations applied (3): `m1_cleanup_trigger_filter_by_queue_id`, `m2_publisher_lock_queue_v2_per_partition_cap`, `m3_get_next_scheduled_for_null_fallback_and_enqueue_guards`
- D-01 review IDs: `02557e30-...` (proceed); `5850dc5a-...` (escalated) → `e464d685-...` (re-fire proceed); `ba0fe26f-...` (escalated) → `6657f70c-...` (re-fire proceed)
- All loops closed via `public.close_chatgpt_review`

---

*Session file written 2026-05-05 ~03:30 UTC. Closes the queue integrity incident Tier 1 phase. M4 (next priority) NOT started this session per PK directive.*
