# Result — cc-0004 M6 Phase B — APPLIED (v4 mismatch dead-letter closed)

**Brief:** `docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` (patched 2026-05-09; commit `6675aa7`)
**Apply session:** 2026-05-09 Sydney
**Executor:** CC (Claude Code)
**D-01 review:** PASS (agree / proceed) per chat fire prior to apply
**PK approval phrase received:** "proceed with cc-0004 apply"
**Outcome:** APPLIED via Supabase MCP `apply_migration`. All 6 verification checks (V1–V6) PASS. 43 rows dead-lettered. No rollback required.

---

## 1. Apply summary

| Item | Value |
|---|---|
| Migration name | `m6_phase_b_v4_mismatch_dead_letter_v1` |
| Project | `mbkmaxqhsohbtwsqolns` |
| Method | Supabase MCP `apply_migration` (single atomic transaction) |
| `apply_migration` return | `{"success": true}` |
| Rows updated | 43 |
| Rollback fired | NO |
| §8 path triggered | NONE (clean apply) |
| Sequencing gate | MET (cc-0003 v2 result file commit `d60dcfb` shows v2 APPLIED, V1–V6 PASS) |

## 2. Pre-flight + final re-verification

Initial pre-flight (before D-01 fire) and final re-verification (~60s before apply) returned identical values. No drift across the verification window.

| Check | Initial | Re-verify | Status |
|---|---|---|---|
| §1.1 columns | required cols present across queue + draft + slot; `m.post_publish_queue.updated_at` NOT NULL ✓ | (not re-run; structural) | PASS |
| §1.2 triggers | 3 surveyed; only `tr_publish_queue_reset_on_success_v1` fires on UPDATE OF status; inner IF acts only on `new.status='published'` (no-op for our 'dead') | (not re-run; structural) | PASS |
| §1.3 phase_b_target_count | 43 (in `[20, 65]`) | **43** | PASS |
| §1.5 Bug 3 co-occurrence (informational, post-patch) | 2 (the CFW IG pair) | **2** | informational; no halt |
| §1.7 pre_dead_reason_count | 0 | **0** | captured for V1 |
| §1.4 captured queue_id list | 43 IDs (all `queued`) | **43 IDs identical, all still `queued`** | PASS |

## 3. SQL applied

`updated_at = NOW()` amendment was applied per brief §3 note 3 ("if P1 confirms `updated_at` column exists AND no auto-trigger maintains it on UPDATE, AMEND the SQL"). P1.1 confirmed `updated_at` is NOT NULL on `m.post_publish_queue`; the trigger surface (P1.2) does not auto-maintain it. The applied SET clause was:

```sql
SET status = 'dead',
    dead_reason = 'anomalous_pre_m4_v4_mismatch',
    updated_at = NOW()
```

The full DO-block + UPDATE statement applied is the verbatim D-01 packet `sql_to_apply` value (multi-table criterion via `WHERE queue_id IN (subquery)` form, JOINs to `m.post_draft` and `m.slot` for criterion derivation only).

## 4. Apply target — 43 queue_ids dead-lettered (alphabetical)

```
0f3de985-afa2-4147-a267-5f165139892c
111d3044-46ed-4707-a18f-087e9d795918
19fa7542-4cde-4462-a870-7aca9adba00c
1a21199e-d22c-4139-b95a-693c642f086b   ← LinkedIn, draft.approval_status='draft' (P3.3 outlier)
25bfe3d5-68d1-4732-9bf4-307e1325c289
30fa6594-a233-4f1e-a984-7b37fa170fcb   ← cc-0003 v1 HALT slot-bound CFW IG row #2
31fe2a72-7483-4693-81ba-6f4aefc49f7d
3600b4ef-35ae-4f1c-9d47-9c8606022866
41f78e86-6d10-4645-9d91-9dfc70429527
42651b54-3861-47cd-a46d-111aa53f4fc4
4509994a-44f5-406a-9327-c601263a83d0
4af2288b-253e-4b65-beea-ab39d926dd83
4f173c56-dce0-454e-a9ce-3860c94ed36e
52ba5a88-56b7-4636-a9a5-28f066affb28
564c83cb-61e7-4e9e-9129-d5ff1cebf524
5aef51df-cf11-44c5-bf89-895a6fd1333d
605a40a2-7c77-4406-88b3-fafce0432a1c
6a876e96-4b03-4d16-9435-efe1f50f8b4e
743f20b6-7e4d-4a7b-b172-c7fa440218e8
7925b95e-e89d-4c91-b66e-33523eded878
829457fa-3928-4cc4-b7e2-71e97ed44ff0
83045bbd-b781-49bd-8a40-aaa98651cb81
8c1294fd-333c-4741-af40-7bf8a92681b6
8d594dba-2b75-4075-b467-6499f5b34dce
8f30f6a0-04de-4087-9988-9ee794bbdd91
91e054c7-efa7-4f56-997e-aa02dac9a1f0
929ee2f9-7bd0-42ce-b6e0-1ff62b88f823   ← cc-0003 v1 HALT slot-bound CFW IG row #1
98f7f4cf-630f-4972-a22d-a9f3c533c2e3
9b6e3309-d270-46b1-b19b-fe2a4f0c9f9c
a51c5db0-9d60-4107-88b3-7cc697bfdcdd
aaf1f5ec-9a78-4252-9b20-dced0cd4659d
b5042c4e-4e7b-40bd-9d67-bd68f0699925
b6a7eede-4624-4e45-a2d9-2e8e03773868
b7fa75de-76e7-4357-8036-6f2e6e26adb1
ba30858b-584e-4f72-bd23-444a1ac2a1e8
bd71cd5a-3d4b-4846-8059-a7c4f1530bdc
cec33032-ce0a-41f2-9d36-ab7746ab553c
d481bc8a-0d7a-4c3c-b6b3-bd89e80b2732
d7bc42f0-affd-46b5-9db9-a5bc942b05db
d948556f-0873-43c3-821b-06952f40ccd2
e2bfa9ea-6094-4522-a671-728874d5b39a
ea972c6b-eba5-428e-945d-9d9918e9f190
fa1ad125-f2cb-4956-b043-8c2c10b42242
```

All 43: `pre_status='queued'`, `pre_dead_reason=NULL`, `pd.slot_id IS NOT NULL`, `q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at`. Post-apply: `status='dead'`, `dead_reason='anomalous_pre_m4_v4_mismatch'`, `updated_at=NOW()`.

Partition characterization (7 distinct (client, platform) pairs):

| client_id | platform | rows | min Δsec | max Δsec |
|---|---|---:|---:|---:|
| `3eca32aa-…` | facebook | 1 | +440343 (+5.1 d) | +440343 |
| `3eca32aa-…` | instagram | 7 | -71504 | +20642 |
| `3eca32aa-…` | linkedin | 1 | +1029368 (+11.9 d) | +1029368 |
| `4036a6b5-…` (NY) | facebook | 10 | +1188899 (+13.8 d) | +1814400 (+21 d) |
| `4036a6b5-…` (NY) | youtube | 10 | +621899 (+7.2 d) | +1728000 (+20 d) |
| `93494a09-…` (CFW) | instagram | 6 | -85821 | +22185 |
| `fb98a472-…` (PP) | youtube | 8 | -84572 | +604800 (+7 d) |

Schedule deltas range from -85821s (-1 day, queue earlier than slot) to +1814400s (+21 days, queue later than slot). Confirms these are pre-M4 residue with materially wrong scheduling — not minor drift.

## 5. Verification queries (V1–V6) — all PASS

| V | Query | Expected | Actual | Status |
|---|---|---:|---:|---|
| V1 | `COUNT(*) WHERE dead_reason='anomalous_pre_m4_v4_mismatch'` | `0 + 43 = 43` | **43** | PASS |
| V2 | `COUNT(*)` matching v4 mismatch criterion in `(queued, failed)` | `0` | **0** | PASS |
| V3 | `COUNT(*) WHERE status IN ('queued','failed')` | `479 - 43 = 436` | **436** | PASS |
| V4 | `COUNT(*) WHERE status='dead'` | `57 + 43 = 100` | **100** | PASS |
| V5 | result list of `(status='dead', dead_reason=target)` queue_ids | exactly the 43 captured set (since `pre_dead_reason_count=0`) | **43 IDs returned, set-equal to capture, no extras; both CFW IG rows confirmed present** | PASS |
| V6 | per-status totals coherence | queued: 479→436, dead: 57→100, published: 95 unchanged, failed: absent both sides | **queued=436, dead=100, published=95** | PASS |

## 6. §4 P1–P5 walk results

- **P1** Pre-state capture: 7/7 PASS (all §1.x captured, values in §2 above).
- **P2** Side-effect surface:
  - P2.1 publisher loses 43 eligible queue rows (cap-limited, trivial)
  - P2.2 cleanup_queue_on_publish_v1 doesn't fire on this UPDATE
  - P2.3 cron 48 enqueue conflict-guard prevents re-insertion of dead rows (per brief assertion; not re-verified by CC this turn)
  - P2.4 UI counts shift cosmetically
  - P2.5 vw_pipeline_state not yet built
  - P2.6 health-check Cowork sees the count shift
  - P2.7 `m.fill_pending_slots` on conflict touches `m.post_draft.dead_reason=NULL` only, NOT `m.post_publish_queue.dead_reason`. Safe.
- **P3** Transitive dependency map:
  - P3.1 — 3 functions reference `dead_reason`; all safe for this scope:
    - `m.dead_letter_sweep`: writes to `m.post_publish_queue.dead_reason` only `WHERE status='locked'` (disjoint from our `status='queued'` targets) with dynamic `'sweep:'` value (not our literal).
    - `m.fill_pending_slots`: writes only `m.post_draft.dead_reason=NULL` and `m.ai_job.dead_reason=NULL`, NOT `m.post_publish_queue.dead_reason`.
    - `public.reset_stuck_ai_jobs`: writes to `m.ai_job.dead_reason`, NOT `m.post_publish_queue.dead_reason`.
  - P3.2 code-collision check on `'anomalous_pre_m4_v4_mismatch'`: 0 hits. No live code writer.
  - P3.3 draft state distribution: 28 approved + 14 needs_review + **1 draft** = 43. The 1 'draft' row (queue_id `1a21199e-d22c-4139-b95a-693c642f086b`, LinkedIn, schedule_delta +11.9d) is unusual — drafts in 'draft' status typically shouldn't be in the publish queue. Per D-01 reviewer assessment: "noted but not blocking; the queue row should be dead-lettered and the draft itself remains unchanged." Confirmed: queue row dead-lettered, draft state unchanged.
  - P3.4 slot data quality: 43/43 with `s.scheduled_publish_at` NOT NULL.
  - P3.5 no Cowork brief queue_id references.
- **P4** Reversibility: 5/5 PASS (rollback templated from captured 43-queue_id list, no irreversible side effects, indefinite rollback window, no collision risk, P4.5 acknowledged that rolled-back rows would re-match Phase B criterion — fresh cycle if needed).
- **P5** Verification preconditions: 6/6 ready before apply.

## 7. D-01 record

- **Verdict:** agree / proceed (clean PASS).
- **Conditions stated by D-01 reviewer:**
  - Re-run final read-only verification immediately before apply — **DONE** (see §2).
  - Halt if count is 0 or outside `[20, 65]` — NOT triggered (count was 43).
  - Halt and report if the 43-row set changes materially, if `pre_dead_reason_count` changes, or if the two CFW IG rows are unexpectedly absent — none of these triggered (set identical to pre-flight, baseline=0, both CFW rows present).
  - Use the SQL from the D-01 packet with `updated_at = NOW()` — USED VERBATIM.
  - Apply only after PK says "proceed with cc-0004 apply" — RECEIVED.
  - After apply, run V1–V6 — DONE (all PASS).
  - Commit `docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` — THIS FILE.
- **PK approval phrase:** "proceed with cc-0004 apply" (received 2026-05-09).

## 8. Hold-state assertions

- One `apply_migration` call. No second migration. No rollback fired.
- Read-only `SELECT` against `m.post_publish_queue`, `m.post_draft`, `m.slot`, `information_schema.columns`, `pg_trigger`, `pg_proc` only.
- Only `m.post_publish_queue` was written (UPDATE on 43 rows). No DDL. No DELETEs. No other tables modified.
- `STANDING_THREE` array untouched. `m.ef_drift_log` untouched.
- No cron edits. No EF deploys. No code changes. No Phase 0 scheduling. No M8 work.
- `m.chatgpt_review` close-the-loop UPDATE deferred to chat (standing protocol).
- 4-way sync close (session file + sync_state v2.55 pointer + action_list v2.55 closure of M6 Phase B + memory `recent_updates` v2.55 entry) deferred to chat.

## 9. Open / next

- **Closed v2.55 (proposed):** M6 Phase B (commit referencing this result file). Action list bump pending chat close.
- **M-series progress:** with cc-0003 v2 (Phase A) + cc-0004 (Phase B) both APPLIED, the M6 dead-letter cycle is functionally complete. The 52 row total (9 Phase A + 43 Phase B) cleared the residual cohorts of pre-M3 Bug 3 fingerprint rows and pre-M4 v4 mismatch rows. Together they leave `m.post_publish_queue` in a state where `status IN ('queued','failed')` rows reflect current intent, not historical drift.
- **Remaining M-series work (not in scope this turn):** M7 (documentation-only; folds into M8 4-way sync per reconciliation §6 Q2). M8 atomic cutover (cc-0005 brief authored upstream during this session at `docs/briefs/cc-0005-m8-atomic-cutover.md`). M-09-03 view DDL (Phase 0 work).
- **No memory edit** by CC (chat-owned at v2.55 close).

---

*Result authored 2026-05-09 Sydney by CC. Pre-flight (initial + re-verification), D-01 PASS, PK approval, apply, V1–V6 verification all completed in single session. No rollback. No production state changed beyond the 43 documented rows. cc-0005 (M8 atomic cutover) sequencing gate state to be evaluated separately by chat / PK.*
