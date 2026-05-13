# ICE — Sync State Index

> **This file is the lightweight session pointer index.** It never grows large. Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1) after two giant-file-rewrite truncation incidents in 24h. See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for the frozen pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-13 | cc-0012-closed-with-variance | **cc-0012 CLOSED-WITH-VERIFIED-VARIANCE (v2.71).** Platform Reconciliation View (PRV) v1 delivered as DDL-only build. Stage A `apply_migration cc_0012_op_platform_reconciliation_view` recorded at version `20260513094128`; `op` schema + `op_reader` role (NOLOGIN) + 5 plain views (`op.v_reconciliation_summary`, `op.v_per_client_rollup`, `op.v_per_platform_rollup`, `op.v_drift_rollup`, `op.v_freshness_rollup`) live. GRANT/REVOKE discipline: SELECT to `op_reader` + `service_role` only; REVOKE ALL from `PUBLIC` + `anon` + `authenticated`. Zero PostgREST exposure (`op` NOT added to `exposed_schemas`). Stage B V1–V10 all PASS read-only. V9 anti-write invariance verified: `pg_stat_user_tables` n_tup_ins/upd/del deltas all = 0 for r.* across apply window. **Reconciliation v1 + PRV v1 family complete end-to-end** (cc-0009 + cc-0010A + cc-0010B + cc-0010C + cc-0011 + cc-0012 all closed). 0 D-01 fires by chat this session (PK-direct directive cadence, same operational mode as cc-0010C v2.69 + cc-0011 v2.70). L45 truth: **Var-A1** = brief §6.1.3 `information_schema.columns` primitive excludes matviews; future correction `pg_attribute + pg_class.relkind IN ('r','m','v')`; **Var-A2** = brief §7 V5 narrative said 7 clients, source-derived count is 4 clients across 14 tuples (V5 PASS-with-empirical-observation per CCH R4); **Var-A3** = `op.v_freshness_rollup.attention_needed` can return NULL under LEFT JOIN + SQL 3VL with empty `r.platform_observer_health`; future correction `COALESCE(observer_is_healthy, true)`. **Candidate L57 NEW** = relkind-aware primitive selection (companion to L55 + L56). All Var-A1/A2/A3 explicitly carry-only — no silent resolution. cc-0013 Dashboard Phase 0 UNBLOCKED as next major. | `docs/runtime/sessions/2026-05-13-cc-0012-closed-with-variance.md` |
| 2026-05-13 | cc-0011-closed-with-variance | **cc-0011 CLOSED-WITH-VERIFIED-VARIANCE (v2.70).** cadence-drift-checker EF v2 ACTIVE at `2e10f0e2-7823-4b71-a96e-8a99a651cdae`; cron 85 `cadence_drift_checker_weekly` installed at `30 17 * * 0` UTC. Stage E retry run `7389ccc0-797f-4f6f-9b0f-ebe394344927` succeeded with 3 observer_stale drift_log rows in 8.3 sec after Var-D matcher_config column-name hotfix (Stage B v2 commit `e48ead84` + Stage C v2 redeploy preserved UUID, version 1→2). Reconciliation v1 family complete end-to-end (cc-0009 + cc-0010A + cc-0010B + cc-0010C + cc-0011). 15-turn single-session traversal including Var-D hotfix sub-cycle. Stage A apply HALTED on first attempt (`column ipe.evidence_at does not exist`; brief-time column-name assumption error; v1.2 patch substituted `COALESCE(ipe.published_at, ipe.created_at)` per PK Option C + §4.1.8 HALT-gate added). 0 D-01 fires by chat this session (PK-direct directive cadence — same operational mode as cc-0010C v2.69). L42 fully reified at 4-job cardinality (cron 82+83+84+85 share single vault row `0fede5c3-...`). L52 fourth-consecutive clean CLI deploy. L62 type-(c) NEW empirical use at Stage E v1 pre-flight (Var-D runtime failure was predictable via column inspection; fired single authorised invocation anyway per directive). L40 + L46 + L62 type-(b) full cycle at Stage A. Candidates L55 (Stage B grep checklist column-name verification against information_schema.columns) + L56 (PostgREST timestamptz vs date assumption) NEW. L45 truth: Var-A + Var-B RUNTIME-CONFIRMED HOLD; Var-D RESOLVED (via `e48ead84` + EF v2); E1 + Var-C + Var-E acknowledged carry. cc-0012 UNBLOCKED. | `docs/runtime/sessions/2026-05-13-cc-0011-closed-with-variance.md` |
| 2026-05-13 | cc-0010C-closed-stage-e-cron-equivalent | **cc-0010C CLOSED-WITH-VERIFIED-VARIANCE (v2.69).** reconciliation-matcher EF v1 deployed; cron job 84 installed at `15-59/30 * * * *` UTC. First natural cron 84 fire `caee6e61-2b9d-4419-80b3-53ce5a342951` succeeded with 5 Tier-1 ICE matches written + 5 `expected → matched` status transitions in 754ms. PK accepted cron runtime proof as Stage E-equivalent variance (L43 pattern, same as cc-0010B). Stage B merge commit `546fb79` (FF from feature branch). Stage C CLI deploy succeeded in 2.37 sec; EF id `daf4d9f1-b74d-48fe-9bd0-beec0ae43f64` v1 ACTIVE. Stage D apply_migration `cc_0010c_pg_cron_reconciliation_matcher`; jobid 84 vault-backed, no literal secret inlined. 0 D-01 fires from chat this session (PK-direct directive cadence — distinct from cc-0010B's chat-fired pattern). State-capture exceptions: 0. PRV-1 close gate criterion 3 empirically satisfied. L43 + L42 (cron 84 third reification) + L38 (consumer-side FK round-trip) reified. L54 NEW candidate (duration_ms audit-row vs response shape distinction). cc-0011 + PRV-2/3/4 UNBLOCKED. | `docs/runtime/sessions/2026-05-13-cc-0010C-closed-stage-e-cron-equivalent.md` |
| 2026-05-13 | cc-0010B-closed-stage-e-cron-equivalent | **cc-0010B CLOSED-WITH-VERIFIED-VARIANCE (v2.68).** ice-evidence-materialiser EF v2 deployed (post-F4 hotfix). First post-v2 cron fire `c256dc99-…` succeeded with 30 rows_inserted in 3.5 sec; PK accepted cron runtime proof as Stage E-equivalent variance. Stage B hotfix commit `62f319c` (F4 path (b): null post_publish_queue_id in publish path). Stage C v2 redeploy via CLI after 2x Supabase MCP InternalServerErrorException failures (clean atomic rollback). 4 D-01 fires this session, all clean agree zero pushback (5 cumulative including v2.67 v1.5). T-MCP-02 cum 64. State-capture exceptions: 0. L40 reified end-to-end at production runtime. L46 baseline strongest state to date. L52 + L53 NEW candidates. cc-0010C UNBLOCKED. | `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md` |
| 2026-05-12 | cc-0010A-applied | cc-0010A v1.5 APPLIED + CLOSED — r.* DDL foundation delivered (v2.67). | `docs/runtime/sessions/2026-05-12-cc-0010A-applied.md` |
| 2026-05-11 | post-cc0009-process-upgrades-l44-l48-applied | L44–L48 process upgrades FORMALISED + committed (v2.66). | `docs/runtime/sessions/2026-05-11-post-cc0009-process-upgrades-l44-l48-applied.md` |
| 2026-05-11 | cc-0009-stages-d-e-closed | cc-0009 Stages D + E CLOSED — PRV-1 second build COMPLETE (v2.65). | `docs/runtime/sessions/2026-05-11-cc-0009-stages-d-e-closed.md` |
| 2026-05-11 | cc-0009-stage-c-doc-sync | cc-0009 Stage C documentation sync (v2.64). | (no per-session file — retroactive doc-only) |
| 2026-05-11 | cc-0009-stage-b-applied-closed | cc-0009 Stage B applied + merged + closed (v2.63). | `docs/runtime/sessions/2026-05-11-cc-0009-stage-b-applied-closed.md` |
| 2026-05-10 | cc-0009-authored | cc-0009 v1 authored (v2.62). | `docs/runtime/sessions/2026-05-10-cc-0009-authored.md` |
| 2026-05-09 | cc-0008-applied | cc-0008 v5 applied (v2.61). | `docs/runtime/sessions/2026-05-09-cc-0008-applied.md` |
| 2026-05-09 | cc-0005-v4-m8a-applied-pipeline-integrity-complete | M8a Path A applied (v2.59). | `docs/runtime/sessions/2026-05-09-cc-0005-v4-m8a-applied-pipeline-integrity-complete.md` |
| 2026-05-09 | cc-0007-applied-ai-worker-401-recovered | cc-0007 (v2.58). | `docs/runtime/sessions/2026-05-09-cc-0007-applied-ai-worker-401-recovered.md` |
| 2026-05-09 | cc-0006-closed-cc-0005-v3-patched | cc-0006 (v2.57). | `docs/runtime/sessions/2026-05-09-cc-0006-closed-cc-0005-v3-patched.md` |
| 2026-05-09 | cc-0004-applied-m6-phase-b-closed | cc-0004 (v2.56). | `docs/runtime/sessions/2026-05-09-cc-0004-applied-m6-phase-b-closed.md` |
| 2026-05-09 | cc-0003-v2-applied-m6-phase-a-closed | cc-0003 v2 (v2.55). | `docs/runtime/sessions/2026-05-09-cc-0003-v2-applied-m6-phase-a-closed.md` |
| 2026-05-08 | video-worker-v3-deploy-verify-jwt-recovery | video-worker v3.0.0 deployed (v2.54). | `docs/runtime/sessions/2026-05-08-video-worker-v3-deploy-verify-jwt-recovery.md` |

*(Older sessions truncated for brevity — full index preserved in v2.66 archive.)*

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---
## 🟢 Most recent session — inline summary

### 2026-05-13 Sydney — cc-0010B CLOSED-WITH-VERIFIED-VARIANCE (v2.68)

**Outcome:** **ice-evidence-materialiser EF v2 live in production + runtime-validated.** F4 path (b) hotfix encoded, deployed, and validated by first post-v2 cron fire. cc-0010B closed with verified variance (cron-runtime Stage E equivalent vs manual). cc-0010C unblocked.

**Stage E variance accepted:** Stage E proof came from `triggered_by='pg_cron_ice_evidence_materialiser_30min'` rather than the brief''s prescribed manual `triggered_by='cc-0010B-stage-e-first'`. PK accepted at directive turn 25 because the cron-triggered run materially satisfies the Stage E objective (live production execution with succeeded `r.reconciliation_run` row + UPSERT rows materialised).

**Runtime proof:**
- `r.reconciliation_run` id `c256dc99-484c-4206-80f5-7b4054c31532`
- started_at 2026-05-13 02:00:03.317543 UTC (≈2 min 36 sec after v2 deploy)
- duration_ms 3503 (3.5 sec)
- rows_processed=72, **rows_inserted=30**, rows_updated=0, rows_skipped=42
- error_summary NULL
- F4 fix runtime-validated against live production data

**Build arc this session (post-compaction):**
- Stage B hotfix branch `feat/cc-0010B-fk-hotfix-publish-queue-null` + single commit `62f319c8554b25ee06cf680bc548cf87f24521ba` (turn 13). 2 surgical replacements in `lib/materialiser.ts` (F4 JSDoc + one code line `pp.queue_id` → `null`). 11 insertions + 1 deletion. github MCP `create_branch` timed out (local Claude Desktop MCP server unresponsive); recovered via Windows-MCP PowerShell local git.
- Stage B hotfix merge to main (turn 17). D-01 `446dcd34-…` clean agree zero pushback. FF-merge `e8e5539` → `62f319c`.
- Stage C v2 redeploy (turn 21). D-01 `7247fdf7-…` clean agree zero pushback. Supabase MCP `deploy_edge_function` failed TWICE with `InternalServerErrorException` (request_ids `req_011CayjGWY42S9kNSR9Sqi2S`, `req_011CayjTp6Hm6E8Kqho8infX`); both atomic-rolled back. Recovered via CLI `supabase functions deploy ice-evidence-materialiser --no-verify-jwt --project-ref mbkmaxqhsohbtwsqolns` in 2.2 sec. EF v1 → v2; `ezbr_sha256 2a64306511…` → `2bb6a1fc73…`.
- Post-v2 cron observation (turn 23). First fire `c256dc99-…` succeeded at 02:00:03 UTC.
- Governance close-out (turn 23). 2 D-01 rows closed in single atomic UPDATE: `446dcd34` + `7247fdf7` → status=`resolved`, resolved_by=`PK`, escalation_resolved_at=2026-05-13 02:15:14.476556 UTC, action_taken enriched.
- Final close-out (this commit, turn 25). cc-0010B CLOSED-WITH-VERIFIED-VARIANCE. L45 declaration table recorded (F1, F2, F3, F4, E1). 4-way sync close.

**L45 declaration table:**
- **F1** JS-side `compactRawEvidence` — accept-with-variance (semantically identical to DB `r.compact_raw_json`; avoids per-row RPC overhead)
- **F2** `published_url` nullability — accept-with-variance (m.post_publish has no published_url column; future enhancement may derive)
- **F3** all-or-nothing batch UPSERT semantics — runtime discovery (PostgREST behaviour; single FK violation rejects entire batch)
- **F4** publish-path FK hotfix path (b) — hotfix delivered + runtime-validated
- **E1** trigger-inventory drift carry — P3 to v1.6 cc-0010A doc patch (r.set_updated_at trigger not bound to r.ice_publication_evidence + r.reconciliation_run)

**D-01 fires this session (4, all clean agree zero pushback):**
1. `1729498a-49cf-41ef-b8b9-6ecbccc9c211` — Stage C v1 deploy (pre-compaction); resolved
2. `140dacb9-5cf1-4cb4-bbf3-b8495a00b0aa` — Stage D apply (pre-compaction); resolved
3. `446dcd34-b36b-4b8b-b19e-5397d228f057` — Stage B hotfix merge (turn 16); resolved
4. `7247fdf7-e1d8-41b6-b9d3-66283c4826ed` — Stage C v2 redeploy (turn 19); resolved

**5 consecutive clean pass-through D-01s including cc-0010A v1.5 (`752dfec6` at v2.67 close).** Longest streak to date.
**Pattern firsts this session (7):**
1. First multi-stage F4 hotfix cycle (Stage E defect detected pre-fire → Stage B remediation → Stage C v2 redeploy → Stage E cron equivalent)
2. First **CLOSED-WITH-VERIFIED-VARIANCE** result status
3. First Supabase MCP deploy failure → CLI deploy recovery (2 MCP failures vs 1 CLI success on same payload)
4. First runtime proof from production cron firing accepted as Stage E equivalent (PK variance acceptance)
5. First 5-consecutive-clean-pass-through D-01 streak ending in a single session
6. First L40 lesson reified end-to-end at production runtime
7. First L62 type-(b) escalation BEFORE D-01 fire (cron pre-fire observation pre-empted manual Stage E D-01 budget)

**L-series outcomes:**
- **L40 reified end-to-end at runtime.** TS-compile-vs-FK-runtime gap surfaced at Stage E cron pre-fire → encoded in Stage B hotfix → merged to main → deployed to runtime → first post-v2 cron fire confirmed fix.
- **L41 honored.** Pre-deploy local HEAD verification before CLI deploy at turn 21.
- **L46 baseline strongest state to date.** 4 consecutive clean pass-through D-01s this session (5 cumulative including v2.67 v1.5). 0 GNB classifications. 0 state-capture overrides.
- **L52 NEW candidate v2.68**: Supabase MCP `deploy_edge_function` has demonstrably higher transient-failure rate than CLI `supabase functions deploy` for the same source payload. Two MCP failures vs one CLI success in 2.2 sec, same payload. When a directive specifies CLI, route directly to CLI rather than attempting MCP first.
- **L53 NEW candidate v2.68**: FK reference integrity vs source-column-type asymmetry not caught by TypeScript compile. Brief-authoring discipline: when EF UPSERTs into a FK-constrained column, enumerate every FK target and confirm source pipeline column is (a) itself FK-constrained, (b) existence-check guarded, or (c) explicitly nullified.
- **L62 type-(b) empirically used.** Pre-flight observation of cron pre-fire (turn 9) was genuine new evidence; escalated BEFORE firing manual Stage E D-01 to preserve "exactly one invocation, no retry" budget.

**Production state at session close:**
- ice-evidence-materialiser EF v2 ACTIVE, `ezbr_sha256 2bb6a1fc7386cbf875b3f532973bf63d4e16d2127cc09b909e034139cd351bdd`, verify_jwt=false
- pg_cron jobid 83 `ice_evidence_materialiser_30min` schedule `*/30 * * * *` UTC, active=true, producing succeeded `r.reconciliation_run` rows every 30 min
- 30 `r.ice_publication_evidence` rows from first post-v2 cron fire (steady-state UPSERT idempotency on `expected_publication_id`)
- 3 pre-v2 forensic `r.reconciliation_run failed` rows retained per directives 12 + 24 + 25 (NO repair)
- T-MCP-02 cum: 64 (+4 from v2.67 close)
- State-capture exceptions v2.68: 0
- main HEAD = `62f319c8554b25ee06cf680bc548cf87f24521ba` + this close-out commit

**Production mutations this session (post-compaction):**
- 1 Supabase CLI `supabase functions deploy` (Stage C v2 success)
- 2 Supabase MCP `deploy_edge_function` (Stage C v2 attempts; both clean atomic rollback)
- 1 `execute_sql` write (2-row UPDATE on `m.chatgpt_review` close-the-loop)
- 2 ChatGPT MCP `ask_chatgpt_review` D-01 fires (turn 16 + turn 19)
- 1 GitHub commit (Stage B hotfix; merged to main at turn 17)
- 1 GitHub commit (this 4-way sync close)
- 0 EF deploys via MCP success path
- 0 cron mutations
- 0 schema changes
- 0 vault writes

---

### 2026-05-12 Sydney — cc-0010A v1.5 APPLIED + CLOSED (v2.67)

**Outcome:** cc-0010A r.* DDL foundation Stage A delivered. 6 new tables, 1 helper, 1 FK (L38 vindicated), 1 default config row, 6 k.table_registry UPSERTs, 86 k.column_registry rows via Fix A pattern. v1.3 atomic rollback recovered via v1.4 Fix A pattern + v1.5 V6c tightening. v1.5 D-01 (`752dfec6-…`) clean agree zero pushback. cc-0010B + cc-0010C unblocked. T-MCP-02 cum 60.

**See `docs/runtime/sessions/2026-05-12-cc-0010A-applied.md` for full session detail.** Inline summary truncated per v2.68 "1-2 sessions inlined" pattern (now superseded by v2.68 most-recent).

---
## 🟡 Next session priorities (rebuilt v2.68)

1. **cc-0010C authoring (reconciliation-matcher EF + Tier 1)** — **P1, NEW rank 1 v2.68.** Natural successor to cc-0010B closure. Tier 1 ICE-evidence match. Reads r.expected_publication + r.ice_publication_evidence (now populated via cc-0010B materialiser) + r.matcher_config (cc-0010A default row); writes r.reconciliation_match. Should apply v2.68 lessons: L52 (CLI deploy preference); L53 (FK source-column-type enumeration at brief-authoring).
2. **v1.6 doc-only patch to cc-0010A** — P2 (3 items now): (a) `out` → `result_jsonb` rename in §2.7 (carry from v2.67); (b) `r.set_updated_at` trigger audit (this session E1); (c) `m.post_publish.queue_id` non-FK semantics documentation for future brief authors (this session F4 → L53 candidate).
3. **Close-the-loop batch sweep (5-row + 24-row eligible)** — P2. 5 prior cc-NNNN rows (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) still `status='escalated'`. 24 unrelated historical escalated rows untouched per CCH directive at v2.67-v2.68 — eligible for review/sweep next session. 5-row batch now **10 sessions overdue v2.68**.
4. **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 trigger filter audit (combined P3 cleanup)** — P3. 3 geography rows + trigger filter investigation. Eligible for separate cc-NNNN cleanup brief.
5. **Platform Reconciliation View brief authoring** — P2 newly-eligible v2.67. Now both cc-0010A schema AND cc-0010B data are live. Can fully proceed once cc-0010C closes.
6. **Dashboard Architecture Review Phase 0 prerequisites** — P1 TOP. Unchanged.
7. **Dashboard PHASES reconciliation** — **24th** consecutive deferral v2.68.
8. **Personal businesses check-in** — standing P0.

Carries (lower priority unchanged from v2.67):
- F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec)
- Publisher latent config risk follow-up (P3)
- M8b separate brief (NOT YET AUTHORED)
- 94-row un-publishable legacy draft cohort
- Feature branch `feature/cc-0009-stage-b-ef-source` preservation (P3)
- Memory cap hygiene
- Dashboard mobile responsiveness (P3)
- AI cost view (P3 quick win)
- github MCP local server restart needed before next github-write op (turn 11 outage; recovered via Windows-MCP local git)

---

## ⛔ Carried-forward "do not touch" state

**v2.68 update on standing items:**

- **cc-0010B: CLOSED-WITH-VERIFIED-VARIANCE.** Stage E proof came from production cron firing (`triggered_by='pg_cron_ice_evidence_materialiser_30min'`) rather than manual `triggered_by='cc-0010B-stage-e-first'`. PK accepted variance. Result file at `docs/briefs/results/cc-0010B-ice-evidence-materialiser.md`. EF v2 ACTIVE, cron jobid 83 firing successfully, 30 evidence rows materialised at first post-v2 fire.
- **cc-0010A: APPLIED + CLOSED.** Unchanged from v2.67.
- **cc-0010C: UNBLOCKED v2.68.** Ready for authoring (becomes rank 1).
- **cc-0010B brief: FROZEN at v1.3** (commit `1b0bbff7`). v1.3 frozen by reference per ICE-PROC-001 §9.1.
- **L38 candidate VINDICATED v2.67 + reaffirmed v2.68.** Recommend promotion to baseline next cycle.
- **L40 reified end-to-end at runtime v2.68.** Full lesson cycle complete: source defect → caught at pre-flight → fixed in source → merged → deployed → runtime-validated.
- **L41 honored v2.68** at Stage C v2 CLI deploy (pre-flight local HEAD verified before deploy).
- **L44 baseline-eligible v2.67** unchanged; not re-exercised v2.68 (no SQL migration this session).
- **L45 baseline-eligible v2.67 + re-exercised v2.68.** Declaration table recorded (F1, F2, F3, F4, E1) for cc-0010B close.
- **L46 baseline STRONGEST state to date v2.68.** 5 consecutive clean pass-through D-01s (v2.67 v1.5 + 4 v2.68 fires). 0 GNB classifications. 0 state-capture overrides.
- **L47 still deferred v2.68.** No parallel-writer race opportunity observed.
- **L48 vindicated v2.67 + reaffirmed v2.68** (cc-0010A + cc-0010B both delivered atomically within their respective stage budgets).
- **L52 NEW candidate v2.68**: Supabase MCP deploy_edge_function transient-failure rate vs CLI. Promotion pending pattern repeat.
- **L53 NEW candidate v2.68**: FK reference integrity vs source-column-type asymmetry at brief authoring. Promotion pending pattern repeat.
- **L62 type-(b) empirically used v2.68** (cron pre-fire observation pre-empted manual Stage E D-01).
- **L49 carry from v2.67** (PG reserved-word collision check for PL/pgSQL DECLARE) — no PL/pgSQL-heavy work this session; promotion pending next opportunity.
- **cc-0009 PRV-1 second build: COMPLETE.** Unchanged.
- **5 prior close-the-loop carries: still pending, batch now 10 sessions overdue v2.68.**
- **24 unrelated historical escalated m.chatgpt_review rows**: intentionally untouched per CCH directive. Eligible for review.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION**: P3 OPEN; unchanged.
- **F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY**: P3 OPEN; eligible to fold into cc-0010C brief authoring or v1.6 doc patch.
- **L34 trigger filter audit**: P3 carry. Strengthened by E1 (this session): r.ice_publication_evidence + r.reconciliation_run have no `r.set_updated_at` trigger bound despite r.* registry membership; trigger inventory drift confirmed.
- **3 pre-v2 forensic `r.reconciliation_run failed` rows**: retained per directives 12 + 24 + 25 (PK forensic-accepted; NO repair).
- **T-MCP-02 quota: 64 cumulative v2.68** (+4 from 60 at v2.67).
- **State-capture exceptions v2.68: 0** (all 4 D-01 fires clean pass-through).
- Cron 82 cadence_rule_generator_daily firing normally.
- Cron 83 ice_evidence_materialiser_30min firing successfully against v2 binary every 30 min UTC.
- Dashboard roadmap PHASES — **24th** consecutive deferral.
- M-series total dead-letter rows cleared since 8 May 2026: 396 rows (unchanged).
- Standing don''t-redeploy three (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) — list unchanged.
- github MCP local server unresponsive for write tools since turn 11 (this session). Recovered via Windows-MCP local git workflow. Restart needed before next github-write-via-MCP operation.

---

## 📜 G1 convention (the rule)

Unchanged. Per-session file `docs/runtime/sessions/2026-05-13-cc-0010B-closed-stage-e-cron-equivalent.md` written; this sync_state + action_list updated; result file at `docs/briefs/results/cc-0010B-ice-evidence-materialiser.md` committed. All 4 files in single push commit. 4-way sync complete.

**This file size**: ~14KB after this update (v2.68 lean rewrite — v2.66 inline dropped per "1-2 sessions inlined" rule; v2.67 retained as "previous" with 1-line headline only and pointer to its session file).

---

*Last updated: 2026-05-13 Sydney — v2.68: **cc-0010B CLOSED-WITH-VERIFIED-VARIANCE — ice-evidence-materialiser EF v2 live + runtime-validated.** Stage E variance: cron-triggered runtime execution accepted as equivalent to manual fire. First post-v2 cron fire `c256dc99-484c-4206-80f5-7b4054c31532` succeeded with 30 rows_inserted in 3.5 sec. F4 path (b) hotfix encoded (commit `62f319c`), merged, deployed (CLI after 2x MCP failures), and runtime-validated. 4 D-01 fires this session, all clean agree zero pushback (5 cumulative including v2.67 v1.5). T-MCP-02 cum 64. State-capture exceptions: 0. L40 reified end-to-end at production runtime. L46 baseline strongest state. L52 + L53 NEW candidates. cc-0010C UNBLOCKED. Previous (v2.67): cc-0010A v1.5 APPLIED + CLOSED.*