# 2026-05-09 Sydney — cc-0004 APPLIED (M6 Phase B closed; M6 dead-letter cycle now functionally complete)

**Slug:** `cc-0004-applied-m6-phase-b-closed`  
**Duration (chat-side, this closure turn):** ~30 min (4-way sync close only)  
**Outcome:** **M6 Phase B CLOSED.** cc-0004 (v4 mismatch dead-letter) APPLIED via Supabase MCP `apply_migration` by CC. 43 rows dead-lettered across 7 `(client, platform)` partitions; both v1 HALT slot-bound CFW IG rows captured (`929ee2f9-...`, `30fa6594-...`). All 6 verification queries (V1–V6) PASS. No rollback. cc-0004 result file commit `9d5bdd37`. **M6 dead-letter cycle now functionally complete: 9 (Phase A) + 43 (Phase B) = 52 residual rows cleared.**

---

## Session arc (cc-0004 apply + close, 9 May Sydney)

1. **2026-05-09 ~01:20 UTC** — CC fired cc-0004 D-01 review (chat) → verdict `agree` / `proceed` / clean PASS. PK explicit approval phrase received: `"proceed with cc-0004 apply"`.
2. **2026-05-09 01:20 UTC** — cc-0004 APPLIED by CC via Supabase MCP `apply_migration` (commit `9d5bdd37`). `{"success": true}`. Final read-only re-verification (~60s before apply): identical to initial pre-flight (no drift on §1.3, §1.5, §1.7, or §1.4 queue_id list — all 43 rows still queued, both CFW IG rows present). Single atomic transaction. 43 rows updated. V1–V6 all PASS. No rollback.
3. **This turn (chat-side 4-way sync close v2.56):** new session file (this) + sync_state v2.56 + action_list v2.56. Doc-only single commit. No Supabase writes. No D-01. No cron edits. No deploys. No Phase 0 scheduling.

---

## Migration apply summary (from cc-0004 result file, commit `9d5bdd37`)

| Item | Value |
|---|---|
| Migration name | `m6_phase_b_v4_mismatch_dead_letter_v1` |
| Project | `mbkmaxqhsohbtwsqolns` |
| Method | Supabase MCP `apply_migration` (single atomic transaction) |
| `apply_migration` return | `{"success": true}` |
| Rows dead-lettered | 43 |
| `dead_reason` | `anomalous_pre_m4_v4_mismatch` |
| Rollback fired | NO |
| §8 path triggered | NONE (clean apply) |
| Sequencing gate | MET (cc-0003 v2 result file `d60dcfb` shows v2 APPLIED, V1–V6 PASS) |
| Result file commit | `9d5bdd37ff95efa64aeaa3b5f311603bd7a8d6d8` on main |
| Result file blob | `94fe31850e1455c056c63f9226e1afcb3d35a3d1` (11,491 B) |

## Verification results (V1–V6 all PASS)

| V | Query | Expected | Actual | Status |
|---|---|---:|---:|---|
| V1 | `COUNT(*) WHERE dead_reason='anomalous_pre_m4_v4_mismatch'` | `0 + 43 = 43` | **43** | PASS |
| V2 | `COUNT(*)` matching v4 mismatch criterion in `(queued, failed)` | `0` | **0** | PASS |
| V3 | `COUNT(*) WHERE status IN ('queued','failed')` | `479 - 43 = 436` | **436** | PASS |
| V4 | `COUNT(*) WHERE status='dead'` | `57 + 43 = 100` | **100** | PASS |
| V5 | result list of `(status='dead', dead_reason=target)` queue_ids | exactly the 43 captured set | **43 IDs returned, set-equal to capture, no extras; both CFW IG rows confirmed present** | PASS |
| V6 | per-status totals coherence | queued=436, dead=100, published=95, failed absent both sides | **queued=436, dead=100, published=95** | PASS |

## Partition characterization (7 distinct `(client_id, platform)` pairs)

(Labels per CC's result file. Schedule delta = `q.scheduled_for - s.scheduled_publish_at` in seconds.)

| client_id | platform | rows | min Δsec | max Δsec |
|---|---|---:|---:|---:|
| `3eca32aa-…` | facebook | 1 | +440343 (+5.1 d) | +440343 |
| `3eca32aa-…` | instagram | 7 | -71504 | +20642 |
| `3eca32aa-…` | linkedin | 1 | +1029368 (+11.9 d) | +1029368 |
| `4036a6b5-…` | facebook | 10 | +1188899 (+13.8 d) | +1814400 (+21 d) |
| `4036a6b5-…` | youtube | 10 | +621899 (+7.2 d) | +1728000 (+20 d) |
| `93494a09-…` | instagram | 6 | -85821 | +22185 |
| `fb98a472-…` | youtube | 8 | -84572 | +604800 (+7 d) |

**Schedule deltas** range from **-85821s (-1 day)** to **+1814400s (+21 days)** — confirms these were materially-wrong scheduling artifacts (pre-M4 residue), not minor drift. Validates cc-0004's design rationale (publisher would have published at wrong times had these been left in queue).

**Both v1 HALT slot-bound CFW IG rows present in apply set:**
- `929ee2f9-7bd0-42ce-b6e0-1ff62b88f823` (CFW IG row #1)
- `30fa6594-a233-4f1e-a984-7b37fa170fcb` (CFW IG row #2)

This closes the loop on the cc-0003 v1 HALT scope-rescue: those 2 rows were filtered out of cc-0003 v2 (criterion narrowed to `pd.slot_id IS NULL`) and correctly captured by cc-0004 (criterion `pd.slot_id IS NOT NULL AND q.scheduled_for IS DISTINCT FROM s.scheduled_publish_at`). Brief-runner-v0 L6 (cross-brief propagation when invariant fails) validated end-to-end.

## P3.3 outlier (noted, not blocking)

1 of 43 rows had `pd.approval_status='draft'` (queue_id `1a21199e-d22c-4139-b95a-693c642f086b`, LinkedIn, schedule_delta +11.9 d). Drafts in 'draft' status typically shouldn't appear in the publish queue. D-01 reviewer assessed: "noted but not blocking; queue row should be dead-lettered, draft itself unchanged." Confirmed: queue row dead-lettered, draft state unchanged. Worth a passive-validator follow-up to understand how the row reached the queue in 'draft' status — likely related to a manual or pre-M4 path; deferred as P3 backlog observation.

---

## M6 dead-letter cycle — functionally complete

| Brief | Phase | Migration | dead_reason | Rows | Apply commit |
|---|---|---|---:|---|---|
| cc-0003 v2 | M6 Phase A | `m6_phase_a_bug3_fingerprint_dead_letter_v2` | `anomalous_scheduled_for_bug3_fallback` | 9 | `d60dcfb` |
| cc-0004 | M6 Phase B | `m6_phase_b_v4_mismatch_dead_letter_v1` | `anomalous_pre_m4_v4_mismatch` | 43 | `9d5bdd37` |
| **Total** | | | | **52** | |

The two phases together cleared the residual cohorts of pre-M3 Bug 3 fingerprint rows AND pre-M4 v4 mismatch rows. Together they leave `m.post_publish_queue` in a state where `status IN ('queued','failed')` rows reflect current intent, not historical drift. M-series queue-integrity remediation (M1–M5 source-path closures + M6 cleanup) is now substantively complete; M7 (doc-only) and M8 (cutover) are the remaining M-series items.

---

## Brief-runner-v0 lessons — cc-0004 cycle additions

Builds on L1–L6 captured in v2.55 (cc-0003 cycle).

**L6 (cross-brief propagation) VALIDATED end-to-end this cycle.** The cc-0003 v1 HALT triggered a chat-authored cc-0004 §1.5 patch (commit `6675aa7c`) on 9 May 00:03 UTC, BEFORE cc-0003 v2 was applied. CC subsequently executed cc-0004 cleanly post-cc-0003 v2 with no friction. The 2 CFW IG rows surfaced in cc-0004 §1.5 (= 2, informational, post-patch) and were correctly captured in the apply set. **Pattern works:** when a sister brief shares an empirically-falsified invariant, propagating the patch in the same cycle prevents a cascade of HALTs. Cross-brief propagation is now a baseline pattern alongside L1–L4.

**L7 candidate — "informational, expected non-zero" co-occurrence pattern works.** cc-0004 §1.5 was downgraded from HALT-on-overlap to capture-for-D-01-packet (informational; expected ≥ 2). Pre-flight returned exactly 2; D-01 packet captured the value; apply proceeded. Pattern prevents false halts when a brief has a structural disjointness invariant elsewhere (here: `pd.slot_id IS NOT NULL` mutually exclusive with cc-0003 v2's `IS NULL`) but a cosmetic co-occurrence that would have tripped a literal disjointness HALT. Promote to canonical after one more vindication.

**L8 candidate — multi-table criterion via IN-subquery pattern works at production scale.** cc-0004 was the first multi-table criterion (JOIN to `m.post_draft` + `m.slot`) bulk UPDATE in the M-series. cc-0003 v2's IN-subquery pattern (with the same criterion in WHERE clause) replicated cleanly. SQL applied verbatim from D-01 packet; clean V1–V6 PASS. Pattern is portable to future apply-class briefs that need to UPDATE rows of one table based on JOIN-derived criteria. Promote to canonical after one more vindication.

**L9 candidate — Schedule-delta evidence validates dead-letter rationale post-apply.** Range -85,821 s to +1,814,400 s confirms the rows were materially-wrong scheduling, not minor drift. Pattern: include partition characterization with magnitude evidence in result files (not just count + dead_reason). Helps reviewers (and future readers) confirm the dead-letter decision was warranted rather than over-broad. Promote candidate.

---

## Sequencing gate state (post cc-0004 closure)

- **cc-0004 (M6 Phase B):** **CLOSED v2.56** (this turn).
- **cc-0005 (M8 atomic cutover):** **REMAINS PARKED.** §1.0 hard PK confirmation gate state:
  - ✅ Item 3: cc-0003 v2 result file shows status=Complete (commit `d60dcfb`) — met v2.55.
  - ✅ Item 4: cc-0004 result file shows status=Complete (commit `9d5bdd37`) — **met v2.56 (this turn).**
  - 🔲 Item 1: post-cutover enqueue path — **NOT confirmed.** Chat investigation 9 May (turn prior to this close) revealed: cron 48 is the SOLE autonomous path that INSERTs into `m.post_publish_queue`; `m.fill_pending_slots` creates drafts + ai_jobs but never queue rows; no triggers on `m.post_draft`/`m.slot`/`m.ai_job` insert queue rows; the 4 other inserters (`public.draft_approve_and_enqueue`, `public.draft_approve_and_enqueue_scheduled`, `public.manual_post_insert`, `m.run_system_audit`) are dashboard-manual / audit paths. Disabling cron 48 with no replacement = autonomous publishing stops. cc-0005 brief premise (component 1 = disable cron 48) is incorrect as written.
  - 🔲 Item 2: `public.get_next_scheduled_for` callers — 1 caller confirmed (cron 48). PK confirmation pending whether the rename would be safe given the path-A recommendation below.

**Recommended next direction for cc-0005** (chat synthesis last turn, not yet acted on):
- **Path (A) — lowest-risk:** rewrite cc-0005 component 1 from "disable cron 48" to "`cron.alter_job(48, command := <new body>)` removing the `public.get_next_scheduled_for` fallback from the COALESCE chain in cron 48's command body". COALESCE becomes `(pd.scheduled_for, s.scheduled_publish_at)` only; the legacy fallback is deprecated at the call site. Cron 48 keeps handling autonomous v4 enqueue. Components 2 (cleanup legacy futures) + 3 (rename function) remain valid. Requires cc-0005 patch (doc-only), not apply yet.
- **Path (B):** build a replacement enqueue path (trigger on `m.ai_job` UPDATE→'succeeded' OR new EF). Significant new build work; likely its own brief.
- **Path (C):** disable cron 48 with no replacement. Not viable; autonomous publishing stops.

No cc-0005 patch has been issued in this turn (PK has not directed). cc-0005 brief at `docs/briefs/cc-0005-m8-atomic-cutover.md` remains as authored (commit `6f16c40e`). PK direction needed before next cc-0005 work.

---

## Standing rules honoured

- **D-01** — One fire chat-side for cc-0004 apply (separate from cc-0003 v2 fire); clean PASS (agree / proceed / 0 pushback / 0 escalation).
- **D-170** — Apply via Supabase MCP `apply_migration`, not `supabase db push`.
- **Lesson #61** — P1–P5 walk completed in cc-0004 result file (full 7/7 P1, P2.1–P2.7 reviewed, P3.1–P3.5 reviewed, P4 5/5, P5 6/6).
- **Lesson #62** — Not exercised this cycle (D-01 returned clean agree, no escalation, no override).
- **G1 convention** — New session file at `docs/runtime/sessions/2026-05-09-cc-0004-applied-m6-phase-b-closed.md`; sync_state index updated separately at v2.56.
- **Acceptance integrity (v2.50 standing rule)** — cc-0004 result file commit `9d5bdd37` verified post-CC-push by re-fetching landed file content via Invegent GitHub MCP — blob `94fe31850e1455c056c63f9226e1afcb3d35a3d1`, size 11,491 B, all 43 queue_ids enumerated, V1–V6 PASS table present, partition characterization table present, P3.3 outlier documented. 4-way sync close commit (this) verified post-push.
- **STANDING_THREE** — Untouched.
- **`m.ef_drift_log`** — Untouched.
- **`m.chatgpt_review`** — Two close-the-loop UPDATEs deferred (cc-0003 v2 fire from v2.55 + cc-0004 fire from v2.56); chat-owned standing protocol; both deferred per PK explicit "no Supabase writes" scope.

---

## Closure budget delta

- This 4-way sync close (chat-side): **~30 min** (read result file + author 3 doc files + acceptance integrity verify).
- M6 Phase B P1 closed → P0+P1 open count: ~3 → ~2.
- T-MCP-02 quota: cumulative +1 (cc-0004 D-01 fire `<id pending close-the-loop>`).
- Trailing-14-day closure hours: ~59.5h + ~30m = ~60h (well above 8.0 floor).
- New automation authoring still allowed (no D-186 pause trigger).

---

## Constraints respected this turn (chat-side 4-way sync close)

- No Supabase writes (DDL, DML, or RPC). All reads from GitHub via Invegent GitHub MCP only.
- No D-01 fire (doc-only).
- No cron edits.
- No EF deploys.
- No code changes.
- No Phase 0 scheduling.
- No cc-0005 apply work — brief unchanged from `6f16c40e`; recommended Path (A) patch deferred to PK direction.
- Single doc-only commit covering 3 files: this session file + `docs/00_sync_state.md` (v2.56) + `docs/00_action_list.md` (v2.56).
- cc-0003 / cc-0004 / cc-0005 briefs and result files **untouched** (CC's commits + chat's prior commits stay canonical).
- Memory `recent_updates` v2.56 entry **deferred** (carry from v2.55 deferral; chat-owned at next opportunity per standing 4-way sync convention).
- Dashboard PHASES update **deferred** (carry; **12th** consecutive deferral, was 11th in v2.55).
- `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 D-01 fires) **deferred** (Supabase writes; PK explicit scope excludes).

---

## Carry-forward / next session

1. **Personal businesses check-in** (P0 standing).
2. **cc-0005 / M8 atomic cutover** — §1.0 hard PK confirmation gate items 3 + 4 now MET; items 1 + 2 still require resolution. Recommended Path (A) needs PK direction before chat issues a cc-0005 patch.
3. **`m.chatgpt_review` close-the-loop UPDATEs** — 2 fires pending (cc-0003 v2 + cc-0004); deferred this cycle per PK scope.
4. **Memory `recent_updates`** — v2.55 + v2.56 entries pending; chat-owned at next opportunity.
5. **Dashboard PHASES reconciliation** — **12th** consecutive deferral.
6. **F-CRON-* findings carry from v2.54** (P2 backlog) — unchanged.
7. **AI cost view P3** (Top 2 next-session priority).
8. **Dashboard Architecture Review Phase 0 prerequisites** (P1 TOP, unchanged carry).
9. Standing carries unchanged: F-AAP-NEEDS-REVIEW-BACKLOG P2; F-PUB-009 V3-V5 + 7-day flow P2; F-AI-WORKER-PARSER-SKIP-BUG V4 P2; morning-inbox-sweep-v1 brief amendment P3; Vault `service_role_key` naming hygiene P3; `docs/audit/health/2026-05-06.md` follow-up P3; Invegent IG cap-throttle planning P3; CFW post-ai-worker dead drafts P3; F-YT-PUB-AVATAR-EXCLUSION P3.
10. **NEW v2.56 P3 backlog observation** — 1 LinkedIn queue row (`1a21199e-...`) was in queue with `draft.approval_status='draft'` (P3.3 outlier in cc-0004); investigation deferred as passive-validator.

---

## Honest limitations

- 4-way sync this turn is partial (3 of 4 ways): session file + sync_state + action_list. Memory edit + dashboard PHASES update + 2 outstanding `m.chatgpt_review` close-the-loops remain deferred per PK explicit scope.
- Brief-runner-v0 trial: this cycle reinforces L6 (cross-brief propagation) end-to-end. L7–L9 are new candidates; L1–L4 + L6 are now baseline patterns. L5 remains promotion candidate.
- The cc-0004 D-01 review_id was not captured into this session file (chat session log only). Close-the-loop UPDATE will recover it from `m.chatgpt_review` when fired.
- Sync state file size: was ~24KB at v2.55; v2.56 will replace v2.54 inline (drop) with v2.56 inline (add) and keep v2.55 inline. Net file size approximately stable. Archive sweep remains overdue per the 16KB threshold trigger; deferred to a separate cycle.
- The P3.3 LinkedIn 'draft' queue-row outlier (`1a21199e-...`) is now dead-lettered; the underlying *draft* row is unchanged. Whether a similar pattern is producing other outlier rows is unknown until passive validator fires (someone would have to check manually or after the next fill cycle).
- cc-0005 §1.0 PK confirmation gate items 1 + 2 remain blockers. Chat investigation last turn established Path (A) as the recommended cutover architecture, but cc-0005 brief is still at its original draft (commit `6f16c40e`); a Path (A) patch would require PK direction, which has not been given as of this turn.
- Client labels in the partition table (`4036a6b5`, `fb98a472`, `93494a09`, `3eca32aa`) preserved verbatim from CC's result file. Memory's client-id mapping should be cross-checked against `c.client.client_id` if any client-name labels in result files conflict with memory. Non-blocking; out of scope for this close.

---

*Session file authored 2026-05-09 Sydney by chat. Captures cc-0004 apply outcome (43 rows dead-lettered, V1–V6 all PASS, no rollback) plus M6 dead-letter cycle completion (52 rows total = 9 Phase A + 43 Phase B). Single doc-only commit pairs this file with sync_state v2.56 + action_list v2.56. No production state touched. cc-0005 (M8 atomic cutover) remains PARKED at §1.0 hard PK confirmation gate (items 3 + 4 now MET; items 1 + 2 still pending; recommended Path (A) patch deferred to PK direction).*
