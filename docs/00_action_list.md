# ICE — Action List

> **Single active action index for what''s queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-13 Sydney (**v2.69 — cc-0010C CLOSED-WITH-VERIFIED-VARIANCE.** reconciliation-matcher EF v1 live in production at `daf4d9f1-b74d-48fe-9bd0-beec0ae43f64`. First natural cron 84 fire `caee6e61-2b9d-4419-80b3-53ce5a342951` succeeded with 5 Tier-1 ICE matches + 5 `expected → matched` status transitions in 754ms. PK accepted cron runtime proof as Stage E-equivalent variance (L43, same pattern as cc-0010B v2.68). Single-session traversal: brief re-authoring + freeze (`8204ab5`) → Stage B source authoring (`546fb79`) → FF-merge → CLI deploy (2.37 sec) → Stage D cron install (jobid 84 vault-backed) → Stage E cron-fire-equivalent observation → close-out. **0 chat-fired D-01s this session** (PK-direct directive cadence — new operational mode distinct from cc-0010B v2.68 chat-fired pattern). State-capture exceptions: 0. PRV-1 close gate criterion 3 empirically satisfied. L38 second exercise (consumer-side FK round-trip). L42 third reification (cron 82+83+84 same vault row). L43 second cycle. L52 + L53 promotion eligible at next cycle. L54 NEW candidate (audit-row schema vs EF-response-shape duration_ms distinction). cc-0011 + PRV-2/3/4 UNBLOCKED. **Next major:** cc-0011 (cadence-drift-checker + matrix views) + v1.6 cc-0010A doc patch (3 items) + close-the-loop batch sweeps.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.67.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L53 carried.

**v2.68 ADDITIONS:**
- **L40 reified end-to-end at runtime v2.68.** TS-compile-vs-FK-runtime gap surfaced at Stage E cron pre-fire → encoded in Stage B hotfix → merged → deployed → first post-v2 cron fire validated fix. Full lesson cycle complete. Strongest single-session reification of L40 to date.
- **L41 honored v2.68** at Stage C v2 CLI deploy (pre-flight local HEAD verified before deploy).
- **L46 baseline STRONGEST state to date v2.68**: 4 consecutive clean pass-through D-01s this session (5 cumulative including v2.67 v1.5). 0 GNB classifications. 0 state-capture overrides. Demonstrates that improving brief surface + accurate runtime probes eliminates override pathways across multi-stage builds.
- **L52 NEW candidate v2.68**: Supabase MCP `deploy_edge_function` has demonstrably higher transient-failure rate than CLI `supabase functions deploy` for the same source payload. Two MCP failures (clean atomic rollback both times) vs one CLI success in 2.2 sec, same payload. When a directive specifies CLI as the approved command, route directly to CLI rather than attempting MCP first. **Promotion pending one more repeat instance.**
- **L53 NEW candidate v2.68**: FK reference integrity vs source-column-type asymmetry not caught by TypeScript compile. Brief-authoring discipline: when an EF UPSERTs into a FK-constrained column, enumerate every FK-constrained INSERT target and confirm the source pipeline column is either (a) itself FK-constrained to the same parent, (b) handled with existence-check guard, or (c) explicitly nullified. F4 caught this gap empirically; v1.6 cc-0010A doc patch should fold an authoring-time check.
- **L62 type-(b) empirically used v2.68**: Pre-flight observation of cron pre-fire result (turn 9) constituted genuine new evidence not in PK''s possession at directive issue; escalated BEFORE firing the manual Stage E D-01 to preserve "exactly one invocation, no retry" budget. PK accepted; F4 hotfix cycle proceeded cleanly.

**v2.69 ADDITIONS:**
- **L38 second-cycle empirical exercise v2.69.** cc-0010A Stage A close added the FK on the producer side (`r.expected_publication.matched_match_id → r.reconciliation_match.reconciliation_match_id`); cc-0010C Stage E first cron fire exercised the FK on the consumer side via 5 round-trip writes verified in V14 5-row sample. L38 now has multi-stage end-to-end vindication.
- **L42 third-cycle reification v2.69.** Cron 84 reconciliation_matcher_30min sources `CRON_SECRET` from the same vault row `0fede5c3-f92c-4bd6-8837-c0e304dfca4c` shared with cron 82 (cadence-rule-generator) + cron 83 (ice-evidence-materialiser). Three cron jobs, single vault row; L42 fully reified.
- **L43 second-cycle pattern proven v2.69.** Cron-fire-equivalent Stage E variance accepted by PK at directive turn 7. Same pattern as cc-0010B v2.68 close (cron 83 first post-v2 fire `c256dc99-...` → accepted as Stage E equivalent). cc-0010C cron 84 first fire `caee6e61-...` → accepted as Stage E equivalent. Pattern proven across two sub-builds.
- **L46 new operational mode flagged v2.69.** Chat fired 0 D-01s this session by directive design (PK-direct cadence per stage). The "clean-agree pass-through" semantics is preserved by vacuity. **Distinguishing chat-fired vs PK-direct directive cadence as separate metrics going forward** to avoid conflating "no fires" with "no clean-agree streak". Both modes are healthy; just different operational shapes.
- **L52 NEW candidate v2.69 second repeat.** Stage C deploy routed directly to CLI per directive (no MCP attempt). The directive-side decision to skip MCP is itself the operational embodiment of L52 carry-forward. **L52 promotion eligible at next cycle.**
- **L53 NEW candidate v2.69 preventive reification.** Stage B authoring applied L53 protections proactively via `assertUuid` fail-fast pattern at row-construction time (`lib/matcher.ts` L147 + 3 call sites). No FK source-column-type asymmetry surfaced in Stage E first fire. **L53 promotion eligible at next cycle** (cc-0010B F4 reactive + cc-0010C Stage B preventive = 2 cycles).
- **L54 NEW candidate v2.69.** V-check authoring should derive duration from `(finished_at - started_at)` timestamps rather than assume a `r.reconciliation_run.duration_ms` column (which lives in the EF response shape only, not the audit row). Empirically reified at cc-0010C Stage E observation turn 6 with 1-attempt re-query.

**All sixteen candidates (L37 + L38 + L39 + L40 + L41 + L42 + L43 + L44 + L45 + L46 + L47 + L48 + L49 + L52 + L53 + L54 — plus standing baseline) recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~2 (cc-0010C + Phase 0; cc-0010A + cc-0010B both CLOSED v2.67 + v2.68) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~78h (v2.68 ~3h for Stage B hotfix + Stage C v2 redeploy + cron observation + close-out) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**v2.68 cycle: ~3h total** (Stage B hotfix branch+commit+merge + Stage C v2 redeploy + post-v2 cron observation + governance close-out + final close-out 4-way sync).

**State-capture exception count v2.68: 0** (all 4 D-01 fires clean pass-through).

---
## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-13 Sydney (v2.69).
> **v2.69 note:** cc-0010C CLOSED-WITH-VERIFIED-VARIANCE. cc-0011 promoted rank 1 (natural successor — cadence-drift-checker + matrix views; reads r.reconciliation_match which is now populating on every :15/:45 cron tick). v1.6 doc patch rank 2 (3 items unchanged from v2.68). Close-the-loop batches rank 3 (5-row + 24-row, still unblocked). F-K-SCHEMA + L34 trigger rank 4. Platform Reconciliation View rank 5 (now fully eligible — schema + data + matches all live). Dashboard Phase 0 rank 6.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0011 authoring (cadence-drift-checker + r.cadence_drift_log + r.mv_reconciliation_daily_matrix + r.mv_observer_freshness_summary)** | **P1 (NEW rank 1 v2.69)** | Natural successor to cc-0010C closure. cc-0010A delivered the 6 r.* tables; cc-0010B populates r.ice_publication_evidence (every 30 min cron); cc-0010C populates r.reconciliation_match (every :15/:45 cron 84 tick) + transitions r.expected_publication. cc-0011 reads r.reconciliation_match output for cadence drift detection + materialised view aggregates. Also handles late status transition deferred from cc-0010C (brief §13 #3). Should apply v2.69 lessons: L43 (cron-fire-equivalent Stage E variance pattern now proven across two sub-builds); L53 (assertUuid fail-fast preventive pattern for FK source columns); L54 (V-check authoring should derive duration from started_at/finished_at timestamps). | chat → next session | Author brief at `docs/briefs/cc-0011-cadence-drift-checker.md`. |
| 2 | **v1.6 doc-only patch to cc-0010A (3 items)** | P2 | Fold disclosures into brief: (a) `out` → `result_jsonb` rename in §2.7 + PRV-0 §4.3 update (carry from v2.67); (b) `r.set_updated_at` trigger audit (this session E1: trigger not bound to r.ice_publication_evidence + r.reconciliation_run despite r.* registry membership); (c) `m.post_publish.queue_id` non-FK semantics documentation for future brief authors (this session F4 → L53 candidate). No production mutation. | chat → next session or before cc-0010C authoring | Doc-only patch via local git (github MCP write tools still need server restart). |
| 3 | **Close-the-loop batch sweep (5-row + 24-row eligible)** | P2 (5-row UNBLOCKED 10 sessions overdue v2.68; 24-row historical eligible) | 5 prior cc-NNNN rows (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) still `status='escalated'`. 24 unrelated historical escalated rows untouched per CCH directive at v2.67-v2.68 — eligible for review/sweep next session. | chat → next session | Single execute_sql UPDATE with CASE expression for 5-row batch; separate review for 24-row historical batch. |
| 4 | **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 trigger filter audit (combined P3 cleanup)** | P3 | F-K-SCHEMA: 3 geography rows (country, country_subdivision, country_timezone) registered to schema `r`. L34: trigger filter investigation strengthened by E1 (this session): r.ice_publication_evidence + r.reconciliation_run have no `r.set_updated_at` trigger bound despite registry membership. | chat → future session | Separate cc-NNNN cleanup brief. |
| 5 | **Platform Reconciliation View — BRIEF AUTHORING** | P2 — fully eligible v2.68 | cc-0010A delivered schema (v2.67); cc-0010B delivered data (v2.68 — 30 evidence rows + steady-state cron). Can fully proceed once cc-0010C closes Tier 1 matches. | PK → chat | Brief authoring when PK greenlights. |
| 6 | **Dashboard Architecture Review Phase 0 prerequisites** | P1 TOP | Unchanged. 7 default-blockers still pending PK confirm/override. | PK | Confirm defaults via cc-0001. |
| 7 | **Personal businesses check-in** | P0 standing | Carry. | PK reports any time-sensitive items + Crazy Domains clean-up status. |

**Passive observation v2.69**: Cron 83 ice_evidence_materialiser_30min — every 30 min UTC (steady-state). Cron 84 reconciliation_matcher_30min — every :15/:45 UTC (NEW v2.69; steady-state expected: rows_processed=72-N, rows_inserted=0-N (new matches as upstream publishes complete), rows_updated=0-5 (existing match refreshes), rows_skipped reflects 41 no-evidence + 25 evidence-not-published + 1 late-beyond-tolerance baseline). Sustained-health observation lives at PRV-5 Triage Inbox (future); until then, ad-hoc r.reconciliation_run + r.reconciliation_match read-checks acceptable.

---

## 🟢 cc-0010B ice-evidence-materialiser — STATUS BLOCK (NEW v2.68)

**Status v2.68:** **CLOSED-WITH-VERIFIED-VARIANCE.** Stage E proof came from production cron firing (`triggered_by='pg_cron_ice_evidence_materialiser_30min'`) rather than manual `triggered_by='cc-0010B-stage-e-first'`. PK accepted variance at directive turn 25.

**Brief lineage:** v1 → v1.3 frozen by reference at commit `1b0bbff7a442883dc443debd54b1dd2bf4fe1761` per ICE-PROC-001 §9.1.

**Stages delivered:**
- Stage A: authored (prior session)
- Stage B v1: EF source merged to main (commit `e8e55399`) (prior session)
- Stage C v1: Edge Function deployed via Supabase MCP (prior in this session; pre-compaction)
- Stage D: pg_cron jobid 83 install via apply_migration (prior in this session)
- Stage E (initial): HELD per L62 type-(b) escalation after pre-flight observed cron pre-fire failure
- Stage B hotfix: branch `feat/cc-0010B-fk-hotfix-publish-queue-null` + commit `62f319c8554b25ee06cf680bc548cf87f24521ba` (F4 path (b): null `post_publish_queue_id` in publish path)
- Stage B hotfix merge to main (D-01 `446dcd34-…` clean agree)
- Stage C v2 redeploy: EF v1 → v2 via CLI after 2x Supabase MCP InternalServerErrorException failures (clean atomic rollback; D-01 `7247fdf7-…` clean agree)
- Stage E (cron equivalent): First post-v2 cron fire `r.reconciliation_run` id `c256dc99-484c-4206-80f5-7b4054c31532` succeeded with 30 rows_inserted (variance accepted by PK)

**Production state:**
- ice-evidence-materialiser EF v2 ACTIVE in production; EF id `9f4d53e6-8aa4-486c-af56-c63738489d6c`; `ezbr_sha256 2bb6a1fc7386cbf875b3f532973bf63d4e16d2127cc09b909e034139cd351bdd`; verify_jwt=false; custom x-cron-secret auth gate
- pg_cron jobid 83 `ice_evidence_materialiser_30min` schedule `*/30 * * * *` UTC, active=true
- 30 `r.ice_publication_evidence` rows from first post-v2 cron fire; steady-state UPSERT idempotency on `expected_publication_id`
- main HEAD = `62f319c` + this close-out commit

**L45 declaration table:**
- **F1** JS-side `compactRawEvidence` — accept-with-variance (semantically identical to DB `r.compact_raw_json`; avoids per-row RPC overhead)
- **F2** `published_url` nullability — accept-with-variance (m.post_publish has no published_url column)
- **F3** all-or-nothing batch UPSERT semantics — runtime discovery (PostgREST single-FK-violation rejects entire batch)
- **F4** publish-path FK hotfix path (b) — hotfix delivered + runtime-validated
- **E1** trigger-inventory drift carry — P3 to v1.6 cc-0010A doc patch

**D-01 fires this session (4, all clean agree zero pushback):**
1. `1729498a-49cf-41ef-b8b9-6ecbccc9c211` — Stage C v1 deploy
2. `140dacb9-5cf1-4cb4-bbf3-b8495a00b0aa` — Stage D apply
3. `446dcd34-b36b-4b8b-b19e-5397d228f057` — Stage B hotfix merge
4. `7247fdf7-e1d8-41b6-b9d3-66283c4826ed` — Stage C v2 redeploy

5 consecutive clean pass-through D-01s including cc-0010A v1.5 — strongest L46 baseline state.

**Result file:** `docs/briefs/results/cc-0010B-ice-evidence-materialiser.md`.
**Session file:** `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md`.

**Open follow-ups:**
- v1.6 cc-0010A doc patch (rank 2 above; 3 items now)
- 3 pre-v2 forensic `r.reconciliation_run failed` rows retained per directives 12 + 24 + 25 (PK forensic-accepted; NO repair)
- cc-0010C reconciliation-matcher authoring (rank 1 above)
- L52 + L53 NEW candidates v2.68 — promotion pending pattern repeat

---
## 🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK (carried v2.68, condensed)

**Status v2.68:** **APPLIED + CLOSED v2.67.** Stage A delivered. 6 r.* tables + 1 helper + 1 FK (L38 vindicated) + 1 default row + 6 k.table_registry rows + 86 k.column_registry rows live.

**v2.68 carry items (3) into v1.6 doc patch:**
1. PL/pgSQL `out` → `result_jsonb` rename in §2.7 + PRV-0 §4.3 (from v2.67 L45)
2. `r.set_updated_at` trigger audit (this session E1) — trigger not bound to r.ice_publication_evidence + r.reconciliation_run despite r.* registry membership; r.reconciliation_run has no `updated_at` column (correct); r.ice_publication_evidence has `updated_at` column without trigger binding (drift)
3. `m.post_publish.queue_id` non-FK semantics documentation (this session F4 → L53 candidate)

**Result file:** `docs/briefs/results/cc-0010A-r-reconciliation-ddl-foundation.md`.

---

## 🟢 Process Upgrades L44–L48 — STATUS BLOCK (UPDATED v2.68)

**Status v2.68:** **L44 + L45 + L46 + L48 all live-exercised + reified.** L40 reified end-to-end at runtime v2.68. L52 + L53 NEW candidates added v2.68.

- **L40**: **REIFIED END-TO-END AT RUNTIME v2.68.** TS-compile-vs-FK-runtime gap surfaced at Stage E cron pre-fire → encoded in Stage B hotfix → merged to main → deployed to runtime → first post-v2 cron fire validated fix. Full lesson cycle complete.
- **L41**: honored v2.68 at Stage C v2 CLI deploy.
- **L44 (Runtime Proof Pre-flight)**: 3 live exercises complete (v1.3 + v1.4 + v1.5 cc-0010A). Baseline-eligible.
- **L45 (Post-mutation truth check)**: 2 live exercises complete (cc-0010A v1.5 + cc-0010B v2.68 declaration table F1/F2/F3/F4/E1). Baseline-eligible.
- **L46 (Reviewer Evidence Gate)**: **STRONGEST baseline state v2.68.** 5 consecutive clean pass-through D-01s (cc-0010A v1.5 → Stage C v1 → Stage D → Stage B merge → Stage C v2). 0 GNB classifications. 0 state-capture overrides.
- **L47**: still deferred. No parallel-writer race opportunity v2.68.
- **L48 (Atomicity Gate)**: vindicated v2.67 (cc-0010A split delivery) + reaffirmed v2.68 (cc-0010B delivered within stage budget).
- **L49 carry from v2.67**: PG reserved-word collision check for PL/pgSQL DECLARE. No PL/pgSQL-heavy work v2.68; promotion pending next opportunity.
- **L52 NEW candidate v2.68**: Supabase MCP `deploy_edge_function` higher transient-failure rate vs CLI for same payload.
- **L53 NEW candidate v2.68**: FK reference integrity vs source-column-type asymmetry not caught by TypeScript compile.

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.68)

Unchanged from v2.65–v2.67. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.67.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.68 application**: 4 D-01 fires this session, all clean agree zero pushback:
1. `1729498a-49cf-41ef-b8b9-6ecbccc9c211` (Stage C v1 deploy, pre-compaction)
2. `140dacb9-5cf1-4cb4-bbf3-b8495a00b0aa` (Stage D apply, pre-compaction)
3. `446dcd34-b36b-4b8b-b19e-5397d228f057` (Stage B hotfix merge to main)
4. `7247fdf7-e1d8-41b6-b9d3-66283c4826ed` (Stage C v2 hotfix redeploy)

Cumulative T-MCP-02: **64** (+4 from 60 at v2.67). State-capture exceptions v2.68: **0** (all 4 clean pass-through).

**L46 Evidence Gate**: **STRONGEST baseline state to date.** 5 consecutive clean pass-through D-01s (cc-0010A v1.5 `752dfec6` + this session''s 4). Demonstrates that improving brief surface + accurate runtime probes + L62 type-(b) escalation discipline eliminates need for state-capture override pathways across a 5-D-01-stage multi-stage build.

**Close-the-loop UPDATEs to m.chatgpt_review v2.68:** 4 (1729498a + 140dacb9 + 446dcd34 + 7247fdf7), all → status=`resolved`, resolved_by varies (chat for first two pre-compaction; PK for last two via turn 23 atomic UPDATE).

**5 prior cc-NNNN reviews still pending — batch now 10 sessions overdue v2.68. 24 unrelated historical escalated rows untouched per CCH directive — eligible for next-session review.**

---

## 🤖 Cowork automation (D182)

**v2.68 status:** unchanged from v2.67. Cron 82 firing daily. Cron 83 firing every 30 min (newly added v2.68; cc-0010B Stage D).

---
## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0011 authoring (cadence-drift-checker + matrix views)** | Tier-1 drift detection over r.reconciliation_match; r.cadence_drift_log + 2 materialised views (r.mv_reconciliation_daily_matrix + r.mv_observer_freshness_summary); also handles late status transition deferred from cc-0010C (brief §13 #3). | **P1 (NEW rank 1 v2.69)** | UNBLOCKED v2.69 (cc-0010C closed). Brief NOT YET AUTHORED. | chat → next session | Author brief at `docs/briefs/cc-0011-cadence-drift-checker.md`. Apply L43 + L53 + L54 v2.69 lessons. |
| **cc-0010C closed** (v2.69) | ARCHIVED reference row | — | CLOSED-WITH-VERIFIED-VARIANCE 2026-05-13 v2.69 via L43 cron-fire-equivalent pattern; first cron 84 fire `caee6e61-...` succeeded with 5 Tier-1 ICE matches + 5 status transitions. Result file at `docs/briefs/results/cc-0010C-reconciliation-matcher.md`. | — | — |
| **v1.6 doc-only patch to cc-0010A (3 items)** | (a) `result_jsonb` rename in §2.7 + PRV-0 §4.3 (v2.67); (b) r.set_updated_at trigger audit (v2.68 E1); (c) m.post_publish.queue_id non-FK semantics (v2.68 F4 → L53) | **P2 (rank 2 v2.68)** | NEW v2.67 + expanded v2.68 (now 3 items). No production mutation. | chat → next session or before cc-0010C | Single doc patch commit. |
| **Close-the-loop batch sweep** | 5-row UNBLOCKED 10 sessions overdue + 24-row historical eligible | **P2 (rank 3 v2.68)** | UNBLOCKED v2.61 for 5-row. 24-row historical untouched per CCH directive. | chat → next session | Single execute_sql UPDATE with CASE for 5-row batch; separate review for 24-row historical batch. |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 trigger filter audit (combined)** | 3 geography rows registered to schema `r` + trigger filter investigation | **P3 (rank 4 v2.68)** | Strengthened v2.68 by E1: r.ice_publication_evidence + r.reconciliation_run have no r.set_updated_at trigger bound despite registry membership. | chat → future session | Separate cc-NNNN cleanup brief. |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface | **P2 — fully eligible v2.68** | cc-0010A delivered schema; cc-0010B delivered data. | PK → chat | Brief authoring when PK greenlights. |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults | P1 TOP (unchanged) | Carry. | PK | Confirm via cc-0001. |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future session | DDL + tile. |
| **Publisher latent config risk follow-up** | `[functions.publisher] verify_jwt = false` doc patch | P3 (carry) | OPEN | chat → future | Single-file commit. |
| **M8b separate brief authoring** | Function rename | P3 (carry) | NOT YET AUTHORED | PK → chat | When PK directs. |
| **94-row un-publishable legacy draft cohort cleanup** | SQL filter per cc-0007 | P3 (carry) | LOGGED | PK → chat → future | If PK directs. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 inline secret | P2 (security, OPEN) | OPEN; cc-0009 + cc-0010B (jobid 83) both use vault-backed pattern. | chat → future (PK approval) | PK authorisation for rotation. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P3 (carry) | LOGGED | chat → future (passive) | — |
| **morning-inbox-sweep-v1 brief amendment** | PK personal-email morning triage | P3 (carry) | DRAFT exists | PK → chat | PK reviews. |
| **24 unrelated historical escalated m.chatgpt_review rows** | Historical escalated review backlog | **P3 (carry v2.68)** | Untouched per CCH at v2.67-v2.68. Eligible for next-session sweep. | chat → next session | Single execute_sql query to enumerate + categorise, then batched UPDATEs. |
| **Memory cap hygiene carry** | Memory at 30/30 cap; line-replacement strategy | P3 (carry) | OBSERVED. v2.68: 0 memory edits this session. | PK → future | PK to consider pruning cadence. |
| **Parallel agent coordination observation** | L47 informational | P3 (carry) | v2.68: no parallel-writer conflicts observed. Path A likely sufficient. | chat → future | Continue passive observation. |
| **Dashboard mobile responsiveness** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session | — |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | — |
| **Invegent IG cap-throttle planning** | jobid 53 unblock readiness | P3 | OBSERVED | chat → T05 unblock session | — |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | — |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session | — |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates | chat → future session | ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 | chat → Phase 2 session | Bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried (**24th deferral v2.68**) | chat → dedicated session | Update PHASES + LAST_UPDATED. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 natural skip event OR synthetic test. |
| **4× F-CRON-*-STALE** | jobids 1/29/30/31/39 call slugs whose folders are absent | P2 | LOGGED | PK → future session | Decide. |
| **Music library activation checklist** | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK ACTION | PK | — |
| **Emergency redeploy governance question** | Expedited D-01 for bounded production-restoration? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules. |
| **`f4a0dd85` bridge health-check `sql_read` row** | hygiene only | P3 (carry) | OBSERVED | PK → future | — |
| **Feature branch `feature/cc-0009-stage-b-ef-source`** | Audit artifact at HEAD `9796b0ee` | P3 (carry) | OBSERVED | PK → future | — |
| **3 pre-v2 forensic `r.reconciliation_run failed` rows** | cc-0010B Stage E pre-fire failures | P3 (carry v2.68) | Retained per directives 12 + 24 + 25 (NO repair). PK forensic-accepted. | informational | — |
| **github MCP local server restart needed** | Write tools unresponsive since turn 11 this session | P3 (operational carry v2.68) | Recovered via Windows-MCP local git workflow. | PK | Restart Claude Desktop MCP server before next github-write op. |
**Closed v2.68:**
- **cc-0010B CLOSED-WITH-VERIFIED-VARIANCE.** ice-evidence-materialiser EF v2 live in production. First post-v2 cron fire `r.reconciliation_run` id `c256dc99-484c-4206-80f5-7b4054c31532` succeeded with 30 rows_inserted in 3.5 sec. PK accepted cron runtime proof as Stage E-equivalent variance at directive turn 25. F4 path (b) hotfix (commit `62f319c`) encoded → merged → deployed via CLI (after 2x Supabase MCP InternalServerErrorException failures with clean atomic rollback) → runtime-validated. 4 D-01 fires this session, all clean agree zero pushback. L45 declaration table recorded (F1/F2/F3/F4/E1). Result file at `docs/briefs/results/cc-0010B-ice-evidence-materialiser.md`.

**Closed v2.67:**
- cc-0010A v1.5 APPLIED + CLOSED. Pre-cc-0010A gating items (L62 attribution + L47 lock scope + L48 application) all closed.

**Closed v2.66:** L44–L48 process upgrades formalised + committed.
**Closed v2.65:** cc-0009 PRV-1 second build COMPLETE.
**Closed v2.64:** cc-0009 Stage C documentation sync.
**Closed v2.63:** cc-0009 Stage A + Stage B.
**Closed v2.61:** cc-0008 v5.
**Closed v2.59:** M8 Path A (cc-0005 v4 / M8a) — 344 rows.
*(Older closures truncated; see v2.66 archive.)*

---

## 💼 Personal businesses

**v2.68 carry (unchanged from v2.55–v2.67):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check status next session.

*(no other items flagged at v2.68 close — standing P0 to ask at next session start.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.67.

---

## 📌 Backlog

**v2.68 changes:**

- **CLOSED v2.68**: cc-0010B CLOSED-WITH-VERIFIED-VARIANCE. ice-evidence-materialiser EF v2 live + runtime-validated. cc-0010C UNBLOCKED.
- **STATE CHANGE v2.68**: cc-0010C promoted rank 1 (was rank 4 v2.67 gated on cc-0010B); v1.6 doc patch expanded to 3 items rank 2 (was 1 item v2.67); close-the-loop batches rank 3 (5-row now 10 sessions overdue + 24-row historical); F-K-SCHEMA + L34 trigger filter rank 4 (combined cleanup, strengthened by E1); Platform Reconciliation View rank 5 (now fully eligible — schema + data both live); Phase 0 rank 6; Personal businesses rank 7.
- **NEW v2.68 ACTIVE ROWS**: cc-0010C authoring (P1) + 3 pre-v2 forensic failed rows carry (P3 informational) + github MCP server restart op carry (P3).
- **NEW v2.68 LESSON CANDIDATES**: L52 (MCP vs CLI deploy reliability) + L53 (FK source-column-type asymmetry at brief authoring).
- **L40 REIFIED END-TO-END AT RUNTIME v2.68** — strongest single-session reification to date.
- **L46 STRONGEST baseline state to date v2.68** — 5 consecutive clean pass-through D-01s.
- **L41 honored v2.68** at Stage C v2 CLI deploy (pre-flight local HEAD verified).
- **L62 type-(b) empirically used v2.68** (cron pre-fire observation pre-empted manual Stage E D-01 budget).
- **CARRIED v2.68**: Dashboard roadmap PHASES — **24th** consecutive deferral. F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY OPEN. All v2.67 carries unchanged otherwise.

**Pre-v2.68 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

L37–L49 unchanged from v2.67 framing. **v2.68 updates:**

- **L40**: **REIFIED END-TO-END AT RUNTIME v2.68.** Source defect (FK reference asymmetry not caught by TS compile) → caught at runtime pre-flight (cron pre-fire observation) → encoded in source (Stage B hotfix commit `62f319c`) → merged to main → deployed to runtime (CLI after 2x MCP failures) → first post-v2 cron fire validated fix (30 rows_inserted, error_summary NULL). Full lesson cycle complete. **Strongest single-session reification to date.**
- **L41**: honored v2.68 at Stage C v2 CLI deploy (pre-flight local HEAD verified before deploy to prevent chat-side-MCP-vs-local-deploy-machine drift).
- **L44**: 3 live exercises complete (v2.67); not re-exercised v2.68 (no SQL migration this session). Baseline-eligible.
- **L45**: 2 live exercises complete (cc-0010A v1.5 + cc-0010B v2.68 declaration F1/F2/F3/F4/E1). Baseline-eligible.
- **L46**: **STRONGEST baseline state to date v2.68.** 5 consecutive clean pass-through D-01s (cc-0010A v1.5 → Stage C v1 → Stage D → Stage B merge → Stage C v2). 0 GNB classifications. 0 state-capture overrides.
- **L47**: still deferred. No race opportunity v2.68.
- **L48**: vindicated v2.67 + reaffirmed v2.68 (cc-0010B delivered within stage budget despite F4 hotfix cycle).
- **L49 carry from v2.67**: PG reserved-word collision check. No PL/pgSQL-heavy work v2.68.
- **L52 NEW candidate v2.68**: Supabase MCP `deploy_edge_function` higher transient-failure rate vs CLI for same payload. Two MCP failures (clean atomic rollback both times: request_ids `req_011CayjGWY42S9kNSR9Sqi2S`, `req_011CayjTp6Hm6E8Kqho8infX`) vs one CLI success in 2.2 sec, same source payload. When a directive specifies CLI, route directly to CLI rather than attempting MCP first. **Promotion pending one more repeat instance.**
- **L53 NEW candidate v2.68**: FK reference integrity vs source-column-type asymmetry not caught by TypeScript compile. Brief-authoring discipline addition: when an EF UPSERTs into a FK-constrained column, enumerate every FK-constrained INSERT target and confirm the source pipeline column is either (a) itself FK-constrained to the same parent, (b) handled with existence-check guard, or (c) explicitly nullified. F4 caught this gap empirically (m.post_publish.queue_id NOT FK-constrained to m.post_publish_queue.queue_id despite type matching; 94% orphan rate). v1.6 cc-0010A doc patch should fold an authoring-time check.

**All fifteen candidates (L37 + L38 + L39 + L40 + L41 + L42 + L43 + L44 + L45 + L46 + L47 + L48 + L49 + L52 + L53) recommended for promotion to baseline at appropriate cycle.**

---
## v2.68 honest limitations

- All v2.31–v2.67 limitations apply.
- **L40 REIFIED END-TO-END AT RUNTIME v2.68** — strongest empirical reification to date but still pattern-of-one for this specific (FK source-column-type asymmetry → publish-path) defect class.
- **L46 STRONGEST baseline state to date v2.68** — 5 consecutive clean pass-through D-01s. But still need additional clean pass-throughs across non-cc-0010 builds before claiming the baseline holds broadly.
- **L52 + L53 NEW candidates v2.68** are both pattern-of-one. Promotion pending repeat.
- **L41 honored v2.68** — pre-flight verified local HEAD = `62f319c` (matches deploy ref) before CLI deploy at turn 21. Single occurrence; pattern continues to be exercised case-by-case.
- **L47 conditional build still deferred** — no parallel-writer conflicts observed at v2.68.
- **F4 path (b) selected** based on F3 + L53 evidence (publish-path FK rejection rate vs queue-path; 94% orphan rate on m.post_publish.queue_id globally). Path (b) preserves audit trail in raw_evidence; semantically sound. **But**: future restoration of m.post_publish.queue_id semantics to live FK (if ever desired) would require schema migration. Currently treating queue_id on publish records as historical/audit pointer is correct given empirical data.
- **3 pre-v2 forensic `r.reconciliation_run failed` rows retained** per directives 12 + 24 + 25. No repair scope v2.68. Future "clean up forensic rows" decision belongs to PK.
- **F1 + F2 (compactRawEvidence + published_url nullability)** disclosed in EF JSDoc + this result file. Brief §5.2 and §3.x not updated post-implementation; recommend v1.6 doc patch covers both (in addition to the 3 stated v1.6 items).
- **Stage E variance accepted**: cron-triggered runtime execution accepted as Stage E equivalent. The runtime evidence is strong (succeeded, 30 inserts, error_summary NULL, F4 path empirically exercised). But the attribution `triggered_by='pg_cron_ice_evidence_materialiser_30min'` rather than `'cc-0010B-stage-e-first'` means future audit queries for cc-0010B Stage E will need to know about this variance.
- **5 prior outstanding m.chatgpt_review close-the-loop UPDATEs UNBLOCKED v2.61, still pending v2.68** — batch now **10 sessions overdue**.
- **24 unrelated historical escalated rows** untouched per CCH directive — eligible for next-session review.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION** still P3; geography drift still present.
- **L34 trigger filter audit empirically strengthened v2.68 by E1**: r.ice_publication_evidence + r.reconciliation_run lack r.set_updated_at trigger binding despite r.* registry membership. Eligible for combined P3 cleanup brief (rank 4).
- **Dashboard roadmap PHASES still stale** — **24th** consecutive deferral.
- **Action_list file size**: ~30KB at v2.68 close (target was 10KB — historically over since v2.30s). Sync_state ~19KB (target 16KB).
- **Per-session file written v2.68**: `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md`.
- **Result file written v2.68**: `docs/briefs/results/cc-0010B-ice-evidence-materialiser.md`.
- **Doc-sync this session**: single 4-way close commit (this commit). Production payload commit `62f319c` (Stage B hotfix) already landed via local git earlier in this session at turn 17.
- **Close-the-loop UPDATEs on m.chatgpt_review v2.68**: 4 (1729498a + 140dacb9 pre-compaction, 446dcd34 + 7247fdf7 at turn 23). 5 prior + 24 historical still eligible for next-session.
- **State-capture exceptions v2.68: 0.** All 4 D-01 fires clean pass-through.
- **Supabase MCP `deploy_edge_function` reliability concern v2.68**: 2 InternalServerErrorException failures in same session on same payload before CLI success in 2.2 sec. L52 candidate. Recommend always have CLI path available + L41 pre-flight when CLI used.
- **github MCP local server unresponsive since turn 11 this session**: write tools (`create_branch`, `push_files`, `create_or_update_file`) all timing out. Read tools (Invegent GitHub bridge) functional. Recovery: Windows-MCP local git workflow. Restart needed before next github-write-via-MCP operation.

---

## Changelog

- v1.0–v2.66: per commit history + sync_state archive.
- **v2.67 (2026-05-12 Sydney, cc-0010A v1.5 APPLIED + CLOSED — r.* DDL foundation delivered)**: as documented in v2.67 changelog entry (carried in commit history).
- **v2.68 (2026-05-13 Sydney, cc-0010B CLOSED-WITH-VERIFIED-VARIANCE — ice-evidence-materialiser EF v2 live + runtime-validated):**
  - **Build arc**: Stage A authored + Stage B v1 source merged (prior session) → Stage C v1 deploy (this session pre-compaction, D-01 `1729498a-…` clean agree) → Stage D pg_cron jobid 83 install (this session pre-compaction, D-01 `140dacb9-…` clean agree) → **Stage E (initial) HELD per L62 type-(b)** after pre-flight observed cron pre-fire `r.reconciliation_run` id `feff354a-…` failed with FK violation → F4 root cause investigation (m.post_publish.queue_id 94% orphan rate; NOT a live FK to m.post_publish_queue.queue_id) → F4 path (b) selected by PK → **Stage B hotfix** branch `feat/cc-0010B-fk-hotfix-publish-queue-null` + single commit `62f319c8554b25ee06cf680bc548cf87f24521ba` (turn 13) → **Stage B hotfix merge to main** (turn 17, D-01 `446dcd34-…` clean agree, FF-merge e8e5539→62f319c) → **Stage C v2 redeploy** (turn 21, D-01 `7247fdf7-…` clean agree, Supabase MCP deploy_edge_function failed TWICE with InternalServerErrorException — clean atomic rollback both times — recovered via CLI `supabase functions deploy ice-evidence-materialiser --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns` in 2.2 sec; v1 → v2; ezbr_sha256 `2a64306511…` → `2bb6a1fc73…`) → **post-v2 cron observation** (turn 23, first post-v2 fire `r.reconciliation_run` id `c256dc99-…` succeeded 2026-05-13 02:00:03 UTC with rows_inserted=30, error_summary NULL) → **governance close-out** (turn 23, 2-row UPDATE on m.chatgpt_review for 446dcd34 + 7247fdf7 → resolved) → **PK accepted cron runtime proof as Stage E-equivalent variance** (directive turn 25) → **final cc-0010B close-out 4-way sync** (this commit).
  - **Stage E variance**: production cron firing (`triggered_by='pg_cron_ice_evidence_materialiser_30min'`) accepted as equivalent to manual fire (`triggered_by='cc-0010B-stage-e-first'`). PK acceptance reason: cron-triggered run materially satisfies Stage E objective (live production execution, succeeded status, real data, F4 path empirically exercised).
  - **L45 declaration table** (per directive 25): **F1** JS-side compactRawEvidence (accept-with-variance, semantically identical to DB r.compact_raw_json); **F2** published_url nullability (accept-with-variance, m.post_publish has no published_url column); **F3** all-or-nothing batch UPSERT semantics (runtime discovery — PostgREST single-FK-violation rejects entire batch); **F4** publish-path FK hotfix path (b) (hotfix delivered + runtime-validated); **E1** trigger-inventory drift carry (P3 to v1.6 cc-0010A doc patch — r.ice_publication_evidence + r.reconciliation_run have no r.set_updated_at trigger bound).
  - **D-01 fires (4, all clean agree zero pushback)**: 1729498a + 140dacb9 + 446dcd34 + 7247fdf7. **5 consecutive clean pass-through D-01s including cc-0010A v1.5 `752dfec6` at v2.67 close — strongest L46 baseline state to date.**
  - **L-series outcomes**: L40 REIFIED END-TO-END AT RUNTIME (strongest single-session reification). L41 honored at Stage C v2 CLI deploy. L46 STRONGEST baseline state. L52 NEW candidate (MCP vs CLI deploy reliability). L53 NEW candidate (FK source-column-type asymmetry at brief authoring). L62 type-(b) empirically used (cron pre-fire observation pre-empted manual Stage E D-01).
  - **Pattern firsts (7)**: first multi-stage F4 hotfix cycle; first CLOSED-WITH-VERIFIED-VARIANCE result status; first Supabase MCP deploy failure → CLI recovery; first runtime proof from production cron accepted as Stage E equivalent; first 5-consecutive-clean-pass-through D-01 streak; first L40 reified end-to-end at production runtime; first L62 type-(b) escalation BEFORE D-01 fire.
  - **Today/Next 5 rebuild**: cc-0010C = rank 1 (UNBLOCKED v2.68); v1.6 doc patch (3 items now) = rank 2; close-the-loop batches (5-row + 24-row) = rank 3; F-K-SCHEMA + L34 trigger filter (combined) = rank 4; Platform Reconciliation View = rank 5 (fully eligible); Phase 0 = rank 6; Personal businesses = rank 7.
  - **Active rows updated v2.68**: cc-0010C ADDED (P1 rank 1); 3 pre-v2 forensic failed rows carry ADDED (P3 informational); github MCP server restart op ADDED (P3 operational carry). cc-0010B row MOVED TO Closed v2.68. v1.6 doc patch row expanded to 3 items.
  - **NEW STATUS BLOCK v2.68**: "🟢 cc-0010B ice-evidence-materialiser — STATUS BLOCK". cc-0010A status block condensed.
  - **Closure budget**: ~3h v2.68 cycle. Trailing-14-day ~78h above 8.0h floor. ~2 P0+P1 open (cc-0010C + Phase 0; within 20-finding cap).
  - **Doc-sync this session**: single commit (this commit) with 4 files: result file + session file + sync_state + action_list. Production payload commit `62f319c` (Stage B hotfix) landed via local git earlier in this session (turn 17).
  - **Production mutations this session**: 0 apply_migration this turn-window (Stage D apply was pre-compaction in this session); 0 MCP deploy success (2 attempts failed, clean atomic rollback both times); 1 CLI deploy success (Stage C v2 via PK local machine); 1 execute_sql write (2-row close-the-loop UPDATE); 2 ask_chatgpt_review D-01 fires (446dcd34 + 7247fdf7 at turns 16 + 19); 2 GitHub commits (`62f319c` Stage B hotfix merge + this close-out commit); 0 memory edits this turn-window. Zero schema changes. Zero vault writes. Zero cron mutations.
  - **T-MCP-02 cum**: 64 (+4 from 60). State-capture exceptions: 0. L46 baseline: 5 consecutive clean pass-through D-01s (strongest to date).