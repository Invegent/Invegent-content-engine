# Result — cc-0010B ice-evidence-materialiser

**Brief:** `docs/briefs/cc-0010B-ice-evidence-materialiser.md` at v1.3 (frozen by reference at commit `1b0bbff7a442883dc443debd54b1dd2bf4fe1761`).
**Status:** **CLOSED-WITH-VERIFIED-VARIANCE.** Stage E proof came from pg_cron runtime execution rather than manual `triggered_by='cc-0010B-stage-e-first'`.

---

## 1. Outcome

The ice-evidence-materialiser Edge Function is live in production at v2 (post-F4-hotfix), runtime-validated against live data by the first post-v2 cron fire (`r.reconciliation_run` id `c256dc99-484c-4206-80f5-7b4054c31532`). 30 evidence rows materialised in 3.5 sec; zero FK violations; F4 path (b) hotfix end-to-end validated. cc-0010C unblocked.

## 2. Lineage (Stages A through E + F4 hotfix cycle)

- **Stage A** (prior session): cc-0010B v1 authored → v1.3 frozen by reference
- **Stage B** (prior session): EF source landed via squash-merge of `feat/cc-0010B-ice-evidence-materialiser` to main (commit `e8e55399381263dc75dd2c8ccc6f23dee00348df`)
- **Stage C v1** (this session, pre-compaction): Edge Function deployed via Supabase MCP `deploy_edge_function`. D-01 review_id `1729498a-49cf-41ef-b8b9-6ecbccc9c211` — clean agree. EF id `9f4d53e6-8aa4-486c-af56-c63738489d6c`, version 1, ACTIVE, verify_jwt=false, `ezbr_sha256 2a64306511e92d8d5b78b8f0d6a8cc7489f8d14f893bf59cf138cd9e0e03e159`. Custom `x-cron-secret` auth gate firing 401 on unauth POST probe.
- **Stage D** (this session, pre-compaction): pg_cron schedule installed via `apply_migration cc_0010b_pg_cron_ice_evidence_materialiser` (version `20260513000443`). D-01 review_id `140dacb9-5cf1-4cb4-bbf3-b8495a00b0aa` — clean agree. Cron jobid 83 `ice_evidence_materialiser_30min` schedule `*/30 * * * *` UTC, active=true. Vault-backed `CRON_SECRET` via inline subquery on `vault.decrypted_secrets`. No literal secret in cron command.
- **Stage E (held)** (this session, pre-compaction): Pre-flight at turn 9 observed cron job 83 had pre-fired at 2026-05-13 00:30:04 UTC and produced `r.reconciliation_run` id `feff354a-f051-4e8a-acf4-2f79c8459421` with `status=failed` due to FK violation `ice_publication_evidence_post_publish_queue_id_fkey`. Per Lesson #62 type-(b) — genuine new evidence — manual Stage E HELD BEFORE firing D-01. Escalation to PK with three fix-candidate paths.
- **F4 root cause**: `m.post_publish.queue_id` empirically established as historical/audit pointer — 94% orphan rate globally (807 of 858 rows have queue_id values that do not resolve in `m.post_publish_queue`); 42 orphans in 7-day materialiser window. cc-0010A v1.5 FK constraint correctly rejected the orphan-containing batch (PostgREST all-or-nothing UPSERT).
- **F4 path (b)** selected by PK (directive turn 12): nullify `post_publish_queue_id` in `buildEvidenceFromPublish`; preserve queue linkage only in `buildEvidenceFromQueue`; retain `pp.queue_id` in `raw_evidence` jsonb for forensic audit.
- **Stage B hotfix** (turn 13): branch `feat/cc-0010B-fk-hotfix-publish-queue-null` from main `e8e55399`; single commit `62f319c8554b25ee06cf680bc548cf87f24521ba` to `supabase/functions/ice-evidence-materialiser/lib/materialiser.ts` — 11 insertions (F4 JSDoc + inline comment) + 1 deletion. Blob `0cb03b18…` → `654c502e…`. github MCP `create_branch` timed out; recovered via Windows-MCP local git.
- **Stage B hotfix merge** (turn 17): D-01 `446dcd34-b36b-4b8b-b19e-5397d228f057` clean agree zero pushback. Fast-forward to main; main HEAD `e8e5539` → `62f319c`.
- **Stage C v2 redeploy** (turn 21): D-01 `7247fdf7-e1d8-41b6-b9d3-66283c4826ed` clean agree zero pushback. Supabase MCP `deploy_edge_function` failed TWICE with `InternalServerErrorException` (request_ids `req_011CayjGWY42S9kNSR9Sqi2S`, `req_011CayjTp6Hm6E8Kqho8infX`); both atomic-rolled back. Recovered via directive''s "Approved command" `supabase functions deploy ice-evidence-materialiser --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns` in 2.2 sec, exit 0. Version 1 → 2; `ezbr_sha256 2bb6a1fc7386cbf875b3f532973bf63d4e16d2127cc09b909e034139cd351bdd`. All 6 verification points PASS.
- **Stage E equivalent** (turn 23): First post-v2 cron fire 2026-05-13 02:00:03 UTC. `r.reconciliation_run` id `c256dc99-484c-4206-80f5-7b4054c31532`: status=succeeded, triggered_by=`pg_cron_ice_evidence_materialiser_30min`, rows_processed=72, rows_inserted=30, rows_updated=0, rows_skipped=42, duration_ms=3503, error_summary NULL. F4 fix runtime-validated. PK accepted as Stage E-equivalent at directive turn 25.

## 3. Variance disclosed

**Stage E proof method**: production-cron runtime execution (`triggered_by='pg_cron_ice_evidence_materialiser_30min'`) rather than the brief''s prescribed manual fire (`triggered_by='cc-0010B-stage-e-first'`).

**Why accepted:** The brief''s Stage E objective is "live production execution of the materialiser against real data, producing a successful `r.reconciliation_run` row + UPSERT rows materialised". The cron-triggered run satisfies this materially: succeeded status, 30 inserts, real production data, F4 path empirically exercised. Attribution string is the only difference. PK accepted at directive turn 25.

## 4. Production state changes (this session arc)

| Mechanism | Count | Detail |
|---|---:|---|
| `apply_migration` (Stage D, prior in session) | 1 | `cc_0010b_pg_cron_ice_evidence_materialiser` version `20260513000443` |
| Supabase MCP `deploy_edge_function` (Stage C v1, prior) | 1 success | ice-evidence-materialiser v1 ACTIVE |
| Supabase MCP `deploy_edge_function` (Stage C v2, this session) | 2 failed, 0 success | Both `InternalServerErrorException`; clean atomic rollback both times |
| Supabase CLI `supabase functions deploy` (Stage C v2 recovery) | 1 success | v1 → v2 in 2.2 sec |
| `m.chatgpt_review` UPDATEs (close-the-loop) | 4 this session | 1729498a + 140dacb9 + 446dcd34 + 7247fdf7 → status=`resolved` |
| ChatGPT MCP `ask_chatgpt_review` D-01 fires | 4 this session | All clean agree, zero pushback |
| GitHub commits (production payload) | 1 | `62f319c` (Stage B hotfix; merged to main) |
| GitHub commits (close-out 4-way sync) | 1 | This commit |
| Forensic rows retained | 3 | Pre-v2 `r.reconciliation_run` failed rows; PK forensic-accepted; no repair per directives 12 + 24 + 25 |
## 5. L45 declaration table (per directive 25)

| # | Finding / Exception | Type | Description |
|---|---|---|---|
| **F1** | JS-side `compactRawEvidence` | accept-with-variance | Brief §5.2 specified populating `raw_evidence` via DB RPC `r.compact_raw_json`. EF implementation does the equivalent strip-by-key operation in JS (`lib/materialiser.ts` function `compactRawEvidence`). Semantically identical (same 4 keys stripped: `__internal_debug`, `request_headers`, `response_headers`, `full_html`). Avoids per-row RPC overhead. Documented in JSDoc above the function. |
| **F2** | `published_url` nullability | accept-with-variance | Brief implied `published_url` would populate for publish-state matches. EF writes `published_url: null` because `m.post_publish` has no `published_url` column. cc-0010A v1.5 `r.ice_publication_evidence.published_url` is nullable. Future enhancement may derive URL from `destination_id` + platform conventions. Documented in JSDoc above `buildEvidenceFromPublish`. |
| **F3** | All-or-nothing batch UPSERT semantics | runtime discovery | PostgREST `.upsert(rows, { onConflict: ... })` is all-or-nothing: a single FK violation rejects the ENTIRE batch (`rows_inserted=0` even if 71 of 72 rows are FK-valid). Empirically observed at first cron pre-fire (turn 9): `rows_processed=72, rows_inserted=0, rows_skipped=44`. Documented PostgREST behaviour but worth recording. |
| **F4** | Publish-path FK hotfix (path (b)) | hotfix delivered + runtime-validated | `m.post_publish.queue_id` is historical/audit pointer (94% orphan rate; 42 orphans in 7-day window); NOT a live FK to `m.post_publish_queue.queue_id`. F4 path (b): nullify `post_publish_queue_id` in `buildEvidenceFromPublish`; preserve queue linkage only in `buildEvidenceFromQueue`; retain `pp.queue_id` in `raw_evidence` for audit. Delivered via commit `62f319c`; runtime-validated at first post-v2 cron fire `c256dc99-…`. |
| **E1** | Trigger-inventory drift carry | P3 carry to v1.6 cc-0010A doc patch | Pre-flight at turn 7 observed `r.ice_publication_evidence` and `r.reconciliation_run` have no `r.set_updated_at` trigger bound despite r.* registry membership. `r.reconciliation_run` has no `updated_at` column (trigger correctly absent). `r.ice_publication_evidence` has `updated_at` column but no trigger binding. Non-blocking; EF writes `updated_by_run_id` per UPSERT path. Carry to v1.6 cc-0010A doc patch. |

## 6. D-01 fires (4 this session, all clean agree pass-through)

| # | review_id | Stage | Verdict | Pushback | Status |
|---|---|---|---|---|---|
| 1 | `1729498a-49cf-41ef-b8b9-6ecbccc9c211` | Stage C v1 deploy (prior in session) | agree | zero | resolved |
| 2 | `140dacb9-5cf1-4cb4-bbf3-b8495a00b0aa` | Stage D apply (prior in session) | agree | zero | resolved |
| 3 | `446dcd34-b36b-4b8b-b19e-5397d228f057` | Stage B hotfix merge to main (turn 16) | agree | zero | resolved |
| 4 | `7247fdf7-e1d8-41b6-b9d3-66283c4826ed` | Stage C v2 hotfix redeploy (turn 19) | agree | zero | resolved |

**5 consecutive clean pass-through D-01s including cc-0010A v1.5 (`752dfec6` at v2.67 close).** Strongest L46 baseline state to date.
## 7. Lesson outcomes

- **L40 reified end-to-end at runtime.** TypeScript-compile-vs-FK-runtime gap surfaced at Stage E cron pre-fire → encoded in source (Stage B hotfix) → merged to main → deployed to runtime → first post-v2 cron fire confirmed fix. Full lesson cycle complete.
- **L41 honored.** Pre-deploy local HEAD verification performed before CLI deploy at turn 21 (chat-side MCP commits can drift local deploy machine).
- **L46 baseline strengthening.** 4 consecutive clean pass-through D-01s in this session (5 cumulative including v2.67 v1.5). 0 GNB classifications, 0 state-capture overrides. Demonstrates improving brief surface + accurate runtime probes eliminates override pathways.
- **L52 NEW candidate v2.68**: Supabase MCP `deploy_edge_function` has demonstrably higher transient-failure rate than CLI `supabase functions deploy` for the same source payload. Two MCP failures (clean atomic rollback both times) vs one CLI success in 2.2 sec, same payload. When a directive specifies CLI as the approved command, route directly to CLI. Promotion pending one more repeat instance.
- **L53 NEW candidate v2.68**: FK reference integrity vs source-column-type asymmetry not caught by TypeScript compile. Brief-authoring discipline: when an EF UPSERTs into a FK-constrained column, enumerate every FK-constrained INSERT target and confirm the source pipeline column is either (a) itself FK-constrained to the same parent, (b) handled with existence-check guard, or (c) explicitly nullified. F4 caught this gap empirically.
- **L62 type-(b) escalation pattern empirically used.** Pre-flight observation of cron pre-fire result (turn 9) constituted genuine new evidence not in PK''s possession at directive issue; escalated BEFORE firing the manual Stage E D-01. PK accepted; F4 hotfix cycle proceeded cleanly.

## 8. Pattern firsts (in this session)

1. First multi-stage F4 hotfix cycle (Stage E defect detected pre-fire → Stage B remediation → Stage C v2 redeploy → Stage E cron equivalent)
2. First **CLOSED-WITH-VERIFIED-VARIANCE** result status
3. First Supabase MCP deploy failure → CLI deploy recovery (2 MCP failures vs 1 CLI success on same payload)
4. First runtime proof from production cron firing accepted as Stage E equivalent (PK variance acceptance)
5. First 5-consecutive-clean-pass-through D-01 streak ending in a single session
6. First L40 lesson reified end-to-end at production runtime (source defect → caught → fixed → runtime-validated)
7. First L62 type-(b) escalation BEFORE D-01 fire (cron pre-fire observation pre-empted the manual Stage E D-01 invocation budget)

## 9. Outputs available downstream

- ice-evidence-materialiser EF v2 ACTIVE in production. EF id `9f4d53e6-8aa4-486c-af56-c63738489d6c`. `ezbr_sha256 2bb6a1fc7386cbf875b3f532973bf63d4e16d2127cc09b909e034139cd351bdd`. verify_jwt=false. Custom x-cron-secret auth gate firing 401 on missing header.
- pg_cron jobid 83 `ice_evidence_materialiser_30min` schedule `*/30 * * * *` UTC, active=true. Steady-state producing succeeded `r.reconciliation_run` rows every 30 min.
- 30 `r.ice_publication_evidence` rows from first post-v2 cron fire. Steady-state UPSERTs preserve idempotency on `expected_publication_id`.
- cc-0010C reconciliation-matcher EF can now consume `r.ice_publication_evidence` rows (gating dependency cleared).

## 10. Open follow-ups

- **v1.6 cc-0010A doc patch** (3 items now): (a) `result_jsonb` rename in §2.7 (carry from v2.67), (b) `r.set_updated_at` trigger audit (this session E1), (c) document `m.post_publish.queue_id` non-FK semantics for future brief authors (this session F4 → L53 candidate)
- 5-row prior cc-NNNN close-the-loop batch — now 10 sessions overdue
- 24-row historical escalated `m.chatgpt_review` batch — eligible for review
- **cc-0010C reconciliation-matcher authoring** — UNBLOCKED v2.68
- L52 + L53 NEW candidates v2.68 — promotion pending pattern repeat
- Cron job 83 continues to fire every 30 min; no maintenance required
- 3 pre-v2 forensic `r.reconciliation_run failed` rows remain per directives 12 + 24 + 25 ("no repair")
- Stage E manual invocation: declined by PK; cron runtime proof accepted as equivalent variance

## 11. Stop condition checklist

- [x] ice-evidence-materialiser EF live at v2 in production
- [x] Cron job 83 firing successfully against v2 binary
- [x] First post-v2 cron fire status=succeeded with rows_inserted > 0 (30 inserts)
- [x] All 4 D-01 review rows resolved with full close-the-loop metadata
- [x] L45 declaration table recorded (F1, F2, F3, F4, E1)
- [x] **CLOSED-WITH-VERIFIED-VARIANCE** status documented (variance: cron-equivalent Stage E vs manual)
- [x] Result file committed (this file)
- [x] Session file written
- [x] 4-way sync close (sync_state + action_list + session file + this result file)
- [x] cc-0010C UNBLOCKED notice logged in sync_state

**cc-0010B CLOSED-WITH-VERIFIED-VARIANCE. cc-0010C UNBLOCKED.**

---

*Result file authored 2026-05-13 Sydney by chat (Claude). Brief lineage: v1 → v1.3 frozen by reference. Stages: A authored + B source landed (prior session) + C v1 deploy + D cron + E held + B hotfix + C v2 redeploy + E cron-equivalent (this session). D-01 fires: 4 clean agree pass-through. Production EF runtime validated against live data via first post-v2 cron fire. F4 path (b) hotfix encoded, deployed, runtime-validated. CLOSED-WITH-VERIFIED-VARIANCE.*