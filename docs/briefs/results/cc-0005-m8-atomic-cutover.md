# Result — cc-0005 v4 / M8a Path A — APPLIED (cron 48 rewritten + 344 legacy-origin queue rows dead-lettered)

**Brief:** `docs/briefs/cc-0005-m8-atomic-cutover.md` (v4 patch, commit `577d8568`)
**Apply session:** 2026-05-09 Sydney
**Executor:** CC (Claude Code)
**D-01 review:** PASS (`agree / proceed`, M8a-only scope, normal controls)
**PK approval phrase received:** "pk proceed with cc-0005 v4 M8a apply"
**Outcome:** APPLIED via Supabase MCP `apply_migration` in single atomic transaction. **All V1–V10' PASS.** 344 rows dead-lettered. cron 48 rewritten in place (active=true preserved). Component 3 (function rename) deferred to M8b per v4 design. No rollback required.

---

## 1. Apply summary

| Item | Value |
|---|---|
| Migration name | `m8a_cron48_rewrite_and_legacy_cleanup_v1` |
| Project | `mbkmaxqhsohbtwsqolns` |
| Method | Supabase MCP `apply_migration` (single atomic transaction; 2 components + 2 in-migration verify gates) |
| `apply_migration` return | `{"success": true}` |
| Rows dead-lettered | **344** |
| Cron 48 command md5 | **`5113bc435fe5cb1a088931b66eabdbfe` → `57bbafb19a51308a69db18607c8ad991`** |
| Cron 48 command length | 2054 → 2203 (+149 bytes — matches the v3-rephrased comment additions; legacy fallback removed from COALESCE) |
| Rollback fired | NO |
| §8 path triggered | NONE (clean apply) |
| In-migration verify gates | V7+V8+V9 fired internally during Component 1 verify gate (RAISE NOTICE: cron 48 active=true, command rewritten, autonomous enqueue path preserved). Component 2 cleanup count fired RAISE NOTICE for 344 rows in band [250, 500]. |

## 2. Pre-flight + final re-verification

Initial pre-flight (before D-01 fire) and final re-verification (~60 s before apply) returned **identical** values across every gate. Cleanup count, slot alignment, cross-check overlaps, baselines all stable. `cron 48` md5 unchanged across the gap — no concurrent edit.

| Check | Initial | Re-verify | Status |
|---|---|---|---|
| §1.0 sequencing | cc-0003 v2 + cc-0004 both Complete | (not re-run; structural) | PASS |
| §1.1 columns + `created_by` | present NOT NULL | (not re-run; structural) | PASS |
| §1.2 trigger surface (5 tables) | 9 triggers, none INSERT into queue | (not re-run; structural) | PASS |
| §1.3 cron 48 active+command_md5 | active=true, md5=`5113bc4...`, len=2054, schedule=`*/5 * * * *` | identical | PASS |
| §1.4 callers list | exactly 3 (cron 48 + 2 manual) | (not re-run; same evidence) | PASS |
| §1.5a cleanup count | 344 (in [250, 500]) | **344** (identical) | PASS |
| §1.5b distinct created_by | only `seed_and_enqueue` | (not re-run) | PASS |
| §1.5c un-publishable cohort | 94 (informational) | (not re-run) | informational |
| §1.5d slot alignment | 0 misaligned | **0** | PASS |
| §1.5 cross-check (cc-0003v2 + cc-0004) | 0 + 0 | **0 + 0** | PASS |
| §1.6 snapshot | 344-row `queue_id` list captured to `/tmp/cc-0005-v4-targets-2026-05-09.json` (rollback authority) | re-captured at apply window | PASS |
| §1.7 pre-state aggregates | queued=441, dead=100, published=95 | identical | captured |
| §1.8 pre_dead_reason_count | 0 | **0** | captured for V1 |
| §1.9 dead_reason cross-check | Bug 3=9, v4=43 | (not re-run; same evidence) | PASS |

## 3. SQL applied

Verbatim from brief §3 (v4-locked). Single transaction wrapping:

1. **Component 1 (cron rewrite via DO block):** read old cron 48 command + active flag → assert active=true → check whether the command still contains a function-call to the legacy fallback (regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('`). If yes, build new command body removing the third COALESCE position and adding two v3-rephrased comment lines (which do NOT contain the substring `get_next_scheduled_for`), then `cron.alter_job(48, command := v_new_command)`. RAISE NOTICE on completion.
2. **Component 1 verify gate (V7+V8+V9 in-migration):** re-read cron 48 command; assert active=true (V7), command no longer contains a function-call to the legacy fallback (V8), command still contains `INSERT INTO m.post_publish_queue` AND `pd.scheduled_for` AND `s.scheduled_publish_at` (V9). RAISE EXCEPTION on any failure → automatic transaction rollback.
3. **Component 2 count gate:** assert cleanup count in band `[250, 500]`. RAISE EXCEPTION on out-of-band.
4. **Component 2 UPDATE:** `UPDATE m.post_publish_queue SET status='dead', dead_reason='m8_cutover_legacy_path_deprecated', updated_at=NOW() WHERE queue_id IN (SELECT q.queue_id FROM ... WHERE pd.slot_id IS NULL AND pd.created_by='seed_and_enqueue' AND q.scheduled_for > NOW() AND q.status IN ('queued','failed'))`.

**Component 3 (function rename + COMMENT) NOT in this migration** — deferred to M8b per v4 design. `public.get_next_scheduled_for(p_client_id uuid, p_platform text, p_from_utc timestamp with time zone) RETURNS timestamp with time zone` continues to exist with original name and signature; the 2 manual callers continue to call it.

## 4. Verification queries (V1–V10') — all PASS

| V | Query | Expected | Actual | Status |
|---|---|---|---|---|
| V1 | `COUNT(*)` where `dead_reason='m8_cutover_legacy_path_deprecated'` | `0 + 344 = 344` | **344** | PASS |
| V2 | `COUNT(*)` matching cleanup criterion in `(queued, failed)` | 0 | **0** | PASS |
| V3 | `COUNT(*) WHERE status IN ('queued','failed')` | `441 - 344 = 97` | **97** | PASS |
| V4 | `COUNT(*) WHERE status='dead'` | `100 + 344 = 444` | **444** | PASS |
| V5 | rows with `status='dead' AND dead_reason='m8_cutover_legacy_path_deprecated'` set-equal to captured 344-row snapshot | exactly the 344 captured | **344 returned, set-equal** (`diff` between `/tmp/captured-344.txt` and `/tmp/post-apply-344.txt` = empty) | PASS |
| V6 | per-status aggregates coherent | queued=441→97, dead=100→444, published=95 unchanged | `{dead: 444, queued: 97, published: 95}` ✓ | PASS |
| V7 | cron 48 active=true + schedule unchanged + jobname unchanged | active=true, schedule=`*/5 * * * *`, jobname=`enqueue-publish-queue-every-5m` | identical to pre-apply (only `command` and `command_md5` changed) | PASS |
| V8 | cron 48 command no longer contains a function-call to the legacy fallback | regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` matches false; substring `get_next_scheduled_for(` matches false | **`still_has_legacy_substr=false`** | PASS |
| V9 | autonomous slot-driven enqueue path still represented | command still contains `INSERT INTO m.post_publish_queue` AND `pd.scheduled_for` AND `s.scheduled_publish_at` | all three true | PASS |
| V10' | expected callers list = exactly 2 non-cron functions; 0 cron rows | `public.draft_approve_and_enqueue` + `public.draft_approve_and_enqueue_scheduled`; cron 48 dropped from list | **2 functions returned (the 2 manual callers); 0 cron rows** | PASS |

V5 set-comparison details: captured 344-row queue_id list was persisted to `/tmp/cc-0005-v4-targets-2026-05-09.json` (26871 bytes, 344 distinct queue_ids, all `pre_status='queued'`). Post-apply set of `(status='dead', dead_reason='m8_cutover_legacy_path_deprecated')` queue_ids returned exactly 344, set-equal to captured (no diff). No row outside the captured snapshot was touched.

## 5. §4 P0–P5 walk results

- **P0.1** sequencing gate — PASS (cc-0003 v2 + cc-0004 both Complete).
- **P1** Pre-state capture: 13/13 PASS.
- **P2** Side-effect surface: P2.1–P2.10 reviewed.
  - publisher_lock_queue_v2 (P2.1) loses 344 future-scheduled queue rows from its read set (cap-limited; trivial).
  - cleanup_queue_on_publish_v1 (P2.2) doesn't fire on this UPDATE.
  - cron 48 (P2.3) post-apply: active=true preserved; schedule + jobname unchanged; command rewritten as expected.
  - Dashboard / portal (P2.4): cosmetic count shifts.
  - vw_pipeline_state (P2.5) not yet built.
  - Cowork health-check (P2.6): cosmetic.
  - fill_pending_slots (P2.7) inserts drafts + ai_jobs only, never queue rows — no conflict.
  - Manual callers (P2.8) — `public.draft_approve_and_enqueue` and `public.draft_approve_and_enqueue_scheduled` both continue to function (their target function `public.get_next_scheduled_for` was NOT renamed in M8a).
  - Future cron 48 fires (P2.9) — slot-driven drafts still enqueue via `pd.scheduled_for` (M4-set) or `s.scheduled_publish_at` (M4 LEFT JOIN safety net); legacy-unresolvable drafts are silently skipped via `WHERE computed_scheduled_for IS NOT NULL`.
  - Un-publishable legacy cohort (P2.10) — 94 drafts will remain un-publishable post-M8a. Recorded as separate follow-up finding (out of M8a + M8b scope per v4 design).
- **P3** Transitive dependency map:
  - **P3.1** dead_reason references — 3 functions identified, all safe for this scope (`m.dead_letter_sweep` writes `status='locked'` rows only with dynamic `'sweep:'` value, disjoint; `m.fill_pending_slots` writes `m.post_draft.dead_reason=NULL` and `m.ai_job.dead_reason=NULL`, NOT post_publish_queue; `public.reset_stuck_ai_jobs` writes `m.ai_job` only).
  - **P3.2** code-collision check on `'m8_cutover_legacy_path_deprecated'` literal: **0 hits** → no live code writer.
  - **P3.3** draft state distribution: **344 / 344 `approval_status='approved'`** (no needs_review / draft / published / dead outliers).
  - **P3.4** Cowork brief queue_id references: none.
  - **P3.5** forward-look on rewritten cron 48: COALESCE chain reduced to `(pd.scheduled_for, s.scheduled_publish_at)`; legacy-unresolvable drafts silently skipped via `WHERE computed_scheduled_for IS NOT NULL`. Slot-driven drafts unaffected.
  - **P3.6** active production callers outside expected set of 3 (pre-apply): **0** (P1.4 surfaced exactly 3, all expected; post-apply 2 remain — cron 48 removed as caller is the intended outcome).
- **P4** Reversibility: 5/5 PASS.
- **P5** Verification preconditions: 10/10 written and ready before apply (V1–V9 + V10').

## 6. D-01 record

- **Verdict:** `agree / proceed`, M8a-only scope, normal controls.
- **Conditions stated by D-01 reviewer (all met):**
  - Re-run final read-only verification immediately before apply — DONE (§2).
  - Halt if cleanup count outside `[250, 500]` — NOT triggered (344 in band).
  - Halt if cron 48 command/md5 changed unexpectedly — NOT triggered (md5 unchanged at re-verify; only changed by our own Component 1 apply).
  - Capture fresh queue_id list before UPDATE; use it as rollback authority — DONE (`/tmp/cc-0005-v4-targets-2026-05-09.json`, 344 IDs persisted before UPDATE).
  - Use exact cc-0005 v4 §3 SQL — DONE (verbatim).
  - Apply only after PK says "proceed with cc-0005 v4 M8a apply" — RECEIVED.
  - After apply, run V1–V10' — DONE (all PASS).
  - Roll back only if verification fails — V1–V10' all PASS, no rollback fired.
  - Commit cc-0005 result file — THIS FILE.
- **PK approval phrase:** "pk proceed with cc-0005 v4 M8a apply" (received 2026-05-09).
- **Action type:** `sql_destructive`.

T-MCP-02: chat fired one D-01 review for cc-0005 v4. Close-the-loop UPDATE on `m.chatgpt_review` is chat-owned at v2.59 4-way sync close.

## 7. Hold-state assertions

- One `apply_migration` call. No second migration. No rollback fired (V1–V10' all PASS).
- Read-only `SELECT` against `cron.job`, `cron.job_run_details`, `m.post_publish_queue`, `m.post_draft`, `m.slot`, `pg_proc`, `pg_namespace`, `pg_views`, `pg_trigger`, `pg_class`, `information_schema.columns` only.
- Only `m.post_publish_queue` (UPDATE on 344 rows) and `cron.job` (cron.alter_job for jobid 48 only) were written. No DDL. No DELETEs. No other tables modified.
- `STANDING_THREE` array untouched. `m.ef_drift_log` untouched.
- `public.get_next_scheduled_for` **NOT renamed** (M8b deferred per v4 design). `public.draft_approve_and_enqueue` and `public.draft_approve_and_enqueue_scheduled` **NOT modified**.
- No cron schedule changes. No EF deploys. No code changes. No Phase 0 scheduling. No M8b work. cc-0006 / cc-0007 untouched.
- `m.chatgpt_review` close-the-loop UPDATE deferred to chat (standing protocol).
- 4-way sync close (session file + sync_state v2.59 pointer + action_list closure of M8 + memory `recent_updates` v2.59 entry) deferred to chat.

## 8. Open / next

- **Closed (proposed):** M8 Path A cutover — Component 1 (cron 48 in-place rewrite) + Component 2 (legacy-origin future cleanup). Action list bump pending chat close.
- **M8b deferred:** function rename + COMMENT on `public.get_next_scheduled_for`. Sequencing gate for M8b: both `public.draft_approve_and_enqueue` and `public.draft_approve_and_enqueue_scheduled` must first be remediated (either updated to call `public.get_next_scheduled_for__deprecated_m8`, or refactored to no longer call the function at all). Once both are remediated AND V10' returns 0 callers, M8b applies the rename. Separate cc-NNNN brief; not bundled.
- **94-row un-publishable legacy draft cohort** — recorded separately. Not in M8a scope. Recommend a follow-up brief to either dead-letter these drafts or repair their `pd.scheduled_for` (or `pd.slot_id`) so they become enqueueable. Drafts: `pd.slot_id IS NULL AND pd.scheduled_for IS NULL AND pd.created_by='seed_and_enqueue' AND pd.approval_status IN ('approved','scheduled')`. Currently 94 rows; oldest 2026-04-17, newest 2026-04-25 (10-day pre-M3/M4 era window).
- **Forward-watch:** the rewritten cron 48 has been live since `apply_migration` returned. Next fire (`*/5 * * * *`) will exercise the new COALESCE. CC did not wait to observe a post-apply cron 48 fire (V9 in-migration gate already verified the body shape; runtime behaviour will manifest at the next `*/5` mark). chat may want to spot-check `cron.job_run_details` for cron 48 in the next 30 minutes to confirm continued steady-state with the new command body.
- **No memory edit** by CC (chat-owned at v2.59 close).

## 9. New brief-runner-v0 patterns observed

This was the first M-series cutover-class brief to actually apply (cc-0003 v2 + cc-0004 were dead-letter-only; cc-0005 combines cron metadata edit with bulk UPDATE in a single transaction). Patterns worth noting:

1. **Multi-component single-transaction with in-migration verify gates** — Component 1 → V7+V8+V9 verify gate → Component 2 count gate → Component 2 UPDATE. Each RAISE EXCEPTION inside a DO block atomically rolls back the entire transaction. The pattern is sound and produced clean apply on first attempt.

2. **md5 fingerprint cron edit verification** — Component 1's effect was independently verifiable post-apply via cron 48 `command_md5` transition (`5113bc4...` → `57bbafb...`) and length delta (+149 bytes matching the comment-line additions). Cheap, deterministic, non-flaky.

3. **§1.6 snapshot persisted to local file** — captured 344-row queue_id JSON to `/tmp/cc-0005-v4-targets-2026-05-09.json` BEFORE the UPDATE. Set-comparison V5 used local diff between captured set and post-apply set (zero diff). Rollback authority was concretely materialised; no reliance on in-memory state.

4. **V10' "expected delta" framing** — pre-apply 3 callers, post-apply 2 callers (cron 48 dropped by design). The brief reframed from "zero callers required" (v3) to "exactly the 2 manual callers; 0 cron rows" (v4). This delta-framed verification is more accurate for partial-cutover patterns where the target is to remove SOME callers but preserve others.

5. **Function rename deferral via Component 3 → M8b** — v4's design choice to ship the cron rewrite + cleanup in M8a while deferring the rename to a later session (after manual caller remediation) materially reduced apply-time risk. The 2 manual callers continue to function unchanged. This is the cleanest path-A-with-incremental-cutover pattern in the M-series.

---

*Result authored 2026-05-09 Sydney by CC. Pre-flight, final re-verify, snapshot capture, single-transaction apply (Component 1 + verify gate + Component 2), V1–V10' verification all completed in single session. No rollback. cron 48 active=true preserved across apply boundary; only command body rewritten. M8b (function rename + manual caller remediation) deferred to a separate brief.*
