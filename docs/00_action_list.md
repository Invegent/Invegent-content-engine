# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-12 Sydney (**v2.67 — cc-0010A v1.5 APPLIED + CLOSED.** apply_migration cc_0010a_r_evidence_matcher_schema_foundation succeeded after prior v1.3 atomic rollback. v1.4 Fix A pattern (purposes CTE joined to information_schema.columns) hydrated 86 k.column_registry NOT NULL columns. v1.5 V6c row-count tightened `>= 86` → `= 86` per CCD narrow review. v1.5 D-01 (`752dfec6-6f9a-4956-b7d7-a4112009b93c`) returned clean agree with **zero pushback** — first cc-0010A D-01 to do so. Apply delivered 6 r.* tables, 1 helper function (with `out` → `result_jsonb` rename disclosed in L45 — PG reserved-word collision), 1 FK constraint (L38 VINDICATED), 1 matcher_config global default row, 6 k.table_registry UPSERTs, 86 k.column_registry rows via Fix A, 1 k.column_registry FK-flag UPDATE. V-checks 10 PASS + 1 accept-with-variance (V6 purpose marker REPLACE no-op; substantive FK fields correct). L45 5 mismatches all accept-with-variance. Close-the-loop on BOTH D-01 rows (8a4b93fb v1.3 escalated→resolved + 752dfec6 v1.5 completed→resolved) in single 2-row UPDATE. cc-0010B + cc-0010C UNBLOCKED. 24 unrelated historical escalated rows intentionally untouched per CCH directive. T-MCP-02 +1 (cum=60). State-capture exceptions: 0. L38 VINDICATED. L44 + L45 baseline-eligible. L46 baseline confirmed. NEW lesson candidate (L49): PG reserved-word collision check for PL/pgSQL DECLARE variables must be brief-authoring pre-D-01 checklist item. Three pre-cc-0010A gating items from v2.66 all CLOSED v2.67 (L62 attribution: clean pass-through D-01 indicates ChatGPT MCP noise not systemic; L47 lock scope: no parallel-writer conflict observed during apply, Path A likely sufficient; L48 application: split delivered cc-0010A atomic). **Next major:** cc-0010B authoring + v1.6 doc patch + 24-row + 5-row close-the-loop batch.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.66.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (now L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L48 carried.

**v2.67 ADDITIONS:**
- **L38 VINDICATED v2.67**: Cross-brief FK deferral pattern empirically vindicated at cc-0010A Stage A close (cc-0009 declared column without REFERENCES; cc-0010A ALTER TABLE added FK after `r.reconciliation_match` came into existence in same transaction). **Recommend promotion to baseline next cycle.**
- **L44 baseline-eligible v2.67**: Runtime Proof Pre-flight has 3 live exercises complete. v1.3 caught queue_id PK-name drift; v1.4 added §1.7b NOT NULL enumeration after v1.3 apply failure exposed UNIQUE-only blind spot; v1.5 pre-flight all 12 probes clean.
- **L45 baseline-eligible v2.67**: Post-mutation truth check first full live exercise complete. Count-delta + 5-row shape-variant sanity sample + 5-row mismatch declaration template all exercised end-to-end. All 5 mismatches resolved accept-with-variance.
- **L46 baseline CONFIRMED v2.67**: Reviewer Evidence Gate has 3 live applications. v1.3 D-01 had 2 GNB → PK Path B override → apply failed downstream (failure was downstream SQL rendering defect, not protocol issue). v1.5 D-01 returned **zero pushback** clean pass-through — demonstrates that improving brief surface (Fix A + V6c tightening) eliminates need for overrides. **L46 baseline confirmed.**
- **L47 still deferred v2.67**: No parallel-writer conflict observed during v1.5 apply window. Path A (doc-only pause cron) likely sufficient when next race opportunity arises.
- **L48 vindicated v2.67**: Atomicity Gate split delivered cc-0010A as atomic sub-build; cc-0010B + cc-0010C unblocked.
- **L49 NEW candidate v2.67**: PG reserved-word collision check for PL/pgSQL DECLARE variables (`out`, `result`, `record`, `row`, etc.). PRV-0 §4.3 had `out` which would cause syntax error if not caught at apply construction; neither CCD nor D-01 caught it. Must be brief-authoring pre-D-01 checklist item.

**All thirteen candidates (L37 + L38 + L39 + L40 + L41 + L42 + L43 + L44 + L45 + L46 + L47 + L48 + L49 — plus standing baseline) recommended for promotion to baseline at appropriate cycle.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (3 pre-cc-0010A gating items CLOSED v2.67; cc-0010A CLOSED; cc-0010B + cc-0010C now P1) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~75h (v2.67 ~3h for v1.5 doc patch + pre-flight + D-01 + apply + V-checks + L45 + close-the-loop + 4-way sync) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**v2.67 cycle: ~3h total (v1.5 doc patch + pre-flight + D-01 + apply + V-checks + L45 + close-the-loop + 4-way sync).**

**State-capture exception count v2.67: 0** (v1.5 D-01 clean pass-through).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-12 Sydney (v2.67).
> **v2.67 note:** cc-0010A CLOSED. cc-0010B becomes rank 1 (natural successor). v1.6 doc patch rank 2. Close-the-loop batches rank 3 (5-row UNBLOCKED + 24-row historical eligible). cc-0010C rank 4 (gated on cc-0010B). Cleanup briefs rank 5 (F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 trigger filter audit).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0010B authoring (ice-evidence-materialiser EF end-to-end)** | **P1 (NEW rank 1 v2.67)** | Natural successor to cc-0010A closure. cc-0010A delivered the 6 r.* tables; cc-0010B authors the materialiser EF that reads m.post_publish_queue/post_publish/post_draft/slot and writes r.ice_publication_evidence. First full Stage A–E build since cc-0009. Should apply v1.5 lessons: PG reserved-word collision check for PL/pgSQL DECLARE; inline literal SQL for k.* writes; §1.7b NOT NULL enumeration probe in pre-flight; fold F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY reconciliation. | chat → next session | Author brief at `docs/briefs/cc-0010B-ice-evidence-materialiser.md`. |
| 2 | **v1.6 doc-only patch to cc-0010A** | P2 | Fold L45 disclosures into brief: (a) §2.7 PL/pgSQL `out` → `result_jsonb` rename + PRV-0 §4.3 update; (b) V6 purpose-marker fix-forward UPDATE design. No production mutation. | chat → next session or before cc-0010B authoring | Doc-only patch via github MCP. |
| 3 | **Close-the-loop batch sweep (5-row + 24-row eligible)** | P2 (5-row UNBLOCKED 9 sessions overdue v2.67; 24-row historical eligible) | 5 prior cc-NNNN rows (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) still `status='escalated'`. 24 unrelated historical escalated rows untouched per CCH directive at v2.67 — eligible for review/sweep next session. | chat → next session | Single execute_sql UPDATE with CASE expression for 5-row batch; separate review for the 24-row historical batch. |
| 4 | **cc-0010C authoring (reconciliation-matcher EF + Tier 1)** | **P1 (gated on cc-0010B)** | Tier 1 ICE-evidence match. Reads r.expected_publication + r.ice_publication_evidence (via cc-0010B) + r.matcher_config (now live); writes r.reconciliation_match (now live). | chat → after cc-0010B closes | Author brief at `docs/briefs/cc-0010C-reconciliation-matcher.md`. |
| 5 | **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 trigger filter audit (combined P3 cleanup)** | P3 | F-K-SCHEMA-REGISTRY: 3 geography rows registered to schema `r` (country, country_subdivision, country_timezone) empirically observed at v1.5 close-out. L34: v1.5 apply confirmed `evtrg_sync_registry_on_create_table` did NOT pre-insert for r.* CREATE TABLE (Fix A pattern is trigger-independent so non-blocking). | chat → future session | Separate cc-NNNN cleanup brief. |
| 6 | **Platform Reconciliation View — BRIEF AUTHORING** | P2 — now newly-eligible | cc-0010A delivered schema; cc-0010B/C will deliver data. Can begin authoring once cc-0010B brief stabilises. | PK → chat | Brief authoring when PK greenlights. |
| 7 | **Dashboard Architecture Review Phase 0 prerequisites** | P1 TOP | Unchanged. 7 default-blockers still pending PK confirm/override. | PK | Confirm defaults via cc-0001. |
| 8 | **Personal businesses check-in** | P0 standing | Carry. | PK reports any time-sensitive items + Crazy Domains clean-up status. |

**Passive observation v2.67**: Cron 82 cadence_rule_generator_daily — verify next fire post-v1.5 apply produces expected r.reconciliation_run row.

---

## 🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK (NEW v2.67)

**Status v2.67:** **APPLIED + CLOSED.** Stage A delivered via apply_migration cc_0010a_r_evidence_matcher_schema_foundation 2026-05-12.

**Brief lineage:**
- v1 (initial draft) → v1.1 (CCD corrections) → v1.2 (arithmetic + strengthened PK probe) → v1.3 (L44 FK target correction) → **v1.3 apply attempt FAILED atomically 08:15:13 UTC** → v1.4 (Fix A pattern) → CCD narrow re-review (agree-with-corrections, low risk) → v1.5 (V6c tightening) → v1.5 D-01 clean agree → **v1.5 apply SUCCESS**.

**v1.5 commit:** `3db84322951e2404b26589e49bb43d5c40cf0db5`. v1.4 commit: `2035a3a83b3a7b3fc783ebbd36be9e5784adb486`.

**Delivered:**
- 6 r.* tables (ice_publication_evidence 17 cols, platform_observation 16, platform_manual_observation 17, reconciliation_match 16, platform_observer_health 10, matcher_config 10 = 86 total)
- 1 helper function `r.compact_raw_json` (IMMUTABLE, plpgsql; with `out` → `result_jsonb` rename disclosed in L45)
- 1 FK constraint `expected_publication_matched_match_id_fkey` (L38 VINDICATED)
- 1 r.matcher_config global default row
- 6 k.table_registry UPSERTs
- 86 k.column_registry rows via Fix A pattern
- 1 k.column_registry FK-flag UPDATE
- pg_trgm v1.6 confirmed (no-op)

**V-checks:** 10 PASS + 1 accept-with-variance.
**L45 mismatches:** 5, all accept-with-variance.
**Close-the-loop:** 2 D-01 rows (8a4b93fb + 752dfec6) both → resolved in single 2-row UPDATE.
**24 historical escalated rows:** intentionally untouched per CCH directive.

**Result file:** `docs/briefs/results/cc-0010A-r-reconciliation-ddl-foundation.md`.
**Session file:** `docs/runtime/sessions/2026-05-12-cc-0010A-applied.md`.

**Outputs available to downstream:**
- 6 r.* tables ready for cc-0010B + cc-0010C
- r.compact_raw_json helper available
- r.matcher_config global default in place
- matched_match_id FK live
- pg_trgm v1.6 indexes ready

**Open follow-ups:**
- v1.6 doc patch (rank 2 above)
- V6 purpose-marker fix-forward UPDATE
- F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION P3 (rank 5 above)
- L34 trigger filter audit (rank 5 above)
- F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY fold into cc-0010B (rank 1 above)

---

## 🟢 Process Upgrades L44–L48 — STATUS BLOCK (UPDATED v2.67)

**Status v2.67:** **L44 + L45 + L46 + L48 all live-exercised at cc-0010A.** L47 still deferred (no parallel-writer race opportunity observed during v1.5 apply).

- **L44 (Runtime Proof Pre-flight)**: **3 live exercises + baseline-eligible.** v1.3 pre-flight caught queue_id PK-name drift before D-01; v1.4 added §1.7b NOT NULL enumeration probe after v1.3 apply failure exposed UNIQUE-only blind spot; v1.5 pre-flight all 12 probes clean.
- **L45 (Post-mutation truth check)**: **first full live exercise + baseline-eligible.** Count-delta + 5-row shape-variant sanity sample + 5-row mismatch declaration template all exercised end-to-end. All 5 mismatches accept-with-variance.
- **L46 (Reviewer Evidence Gate)**: **3 live applications + baseline confirmed.** v1.3 had 2 GNB → PK Path B override → apply failed downstream (downstream SQL rendering defect not L46 protocol issue). v1.5 had zero pushback clean pass-through. Demonstrates improving brief surface eliminates need for overrides.
- **L47**: still deferred. No parallel-writer race observed at v1.5 apply window. Path A likely sufficient when needed.
- **L48 (Atomicity Gate)**: vindicated v2.67. cc-0010 split into A/B/C; cc-0010A delivered atomically.
- **L49 NEW candidate v2.67**: PG reserved-word collision check for PL/pgSQL DECLARE variables.

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.67)

Unchanged from v2.66. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.66.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.67 application**: 1 D-01 fire (v1.5, `752dfec6-6f9a-4956-b7d7-a4112009b93c`, clean agree, zero pushback). Cumulative T-MCP-02: **60** (+1 from 59). State-capture exceptions v2.67: **0** (clean pass-through).

**L46 Evidence Gate**: **3rd live application complete + baseline confirmed.** v1.5 D-01 zero-pushback demonstrates clean-surface path.

**Close-the-loop UPDATEs to m.chatgpt_review v2.67:** 2 (8a4b93fb v1.3 + 752dfec6 v1.5). **5 prior cc-NNNN reviews still pending UNBLOCKED v2.61, batch now 9 sessions overdue. 24 unrelated historical escalated rows untouched per CCH directive — eligible for next-session review.**

---

## 🤖 Cowork automation (D182)

**v2.67 status:** unchanged from v2.66. Cron 82 firing daily.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0010B authoring (ice-evidence-materialiser EF)** | EF end-to-end: source + deploy + cron + invocation; writes r.ice_publication_evidence | **P1 (NEW v2.67, rank 1)** | UNBLOCKED v2.67. Brief NOT YET AUTHORED. Inherits cc-0010A outputs. | chat → next session | Author brief at `docs/briefs/cc-0010B-ice-evidence-materialiser.md`. Apply v1.5 lessons: PG reserved-word check for PL/pgSQL DECLARE; inline k.* SQL; §1.7b NOT NULL probe. Fold F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY. |
| **v1.6 doc-only patch to cc-0010A** | Document `out` → `result_jsonb` rename in §2.7 + update PRV-0 §4.3; document V6 purpose-marker fix-forward design | **P2 (NEW v2.67, rank 2)** | NEW. No production mutation. | chat → next session or before cc-0010B | Single github MCP patch. |
| **Close-the-loop batch sweep** | 5-row UNBLOCKED 9 sessions overdue + 24-row historical eligible | **P2 (rank 3 v2.67)** | UNBLOCKED v2.61 for 5-row. 24-row historical untouched per CCH directive at v2.67. | chat → next session | Single execute_sql UPDATE with CASE for 5-row batch; separate review for 24-row historical batch. |
| **cc-0010C authoring (reconciliation-matcher EF + Tier 1)** | Tier 1 ICE-evidence match | **P1 (gated on cc-0010B)** | UNBLOCKED v2.67 (gated on cc-0010B completion). | chat → after cc-0010B closes | Author brief. |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 trigger filter audit (combined)** | 3 geography rows registered to schema `r` + trigger filter investigation | **P3 (rank 5 v2.67)** | Empirically observed at v1.5 close-out. | chat → future session | Separate cc-NNNN cleanup brief. |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface | **P2 — newly eligible v2.67** | cc-0010A delivered schema. | PK → chat | Brief authoring when PK greenlights. |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults | P1 TOP (unchanged) | Carry. | PK | Confirm via cc-0001. |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future session | DDL + tile. |
| **Publisher latent config risk follow-up** | `[functions.publisher] verify_jwt = false` doc patch | P3 (carry) | OPEN | chat → future | Single-file commit. |
| **M8b separate brief authoring** | Function rename | P3 (carry) | NOT YET AUTHORED | PK → chat | When PK directs. |
| **94-row un-publishable legacy draft cohort cleanup** | SQL filter per cc-0007 | P3 (carry) | LOGGED | PK → chat → future | If PK directs. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 inline secret | P2 (security, OPEN) | OPEN; cc-0009 vault precedent set | chat → future (PK approval) | PK authorisation for rotation. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P3 (carry) | LOGGED | chat → future (passive) | — |
| **morning-inbox-sweep-v1 brief amendment** | PK personal-email morning triage | P3 (carry) | DRAFT exists | PK → chat | PK reviews. |
| **24 unrelated historical escalated m.chatgpt_review rows** | Historical escalated review backlog (24 rows untouched per CCH at v2.67) | **P3 (NEW v2.67 hygiene)** | NEW v2.67. Eligible for next-session review/sweep. | chat → next session | Single execute_sql query to enumerate + categorise, then batched UPDATEs as appropriate. |
| **Memory cap NEW v2.66 hygiene carry** | Memory at 30/30 cap; line-replacement strategy | P3 (carry) | OBSERVED. v2.67: 0 memory edits this session. | PK → future | PK to consider pruning cadence. |
| **Parallel agent coordination observation** | L47 informational | P3 (carry) | v2.67: no parallel-writer conflicts observed at v1.5 apply window. Path A likely sufficient. | chat → future | Continue passive observation. |
| **Dashboard mobile responsiveness** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session | — |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | — |
| **Invegent IG cap-throttle planning** | jobid 53 unblock readiness | P3 | OBSERVED | chat → T05 unblock session | — |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | — |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session | — |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates | chat → future session | ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 | chat → Phase 2 session | Bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried (**23rd deferral v2.67**) | chat → dedicated session | Update PHASES + LAST_UPDATED. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 natural skip event OR synthetic test. |
| **4× F-CRON-*-STALE** | jobids 1/29/30/31/39 call slugs whose folders are absent | P2 | LOGGED | PK → future session | Decide. |
| **Music library activation checklist** | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK ACTION | PK | — |
| **Emergency redeploy governance question** | Expedited D-01 for bounded production-restoration? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules. |
| **`f4a0dd85` bridge health-check `sql_read` row** | hygiene only | P3 (carry) | OBSERVED | PK → future | — |
| **Feature branch `feature/cc-0009-stage-b-ef-source`** | Audit artifact at HEAD `9796b0ee` | P3 (carry) | OBSERVED | PK → future | — |

**Closed v2.67:**
- **cc-0010A v1.5 APPLIED + CLOSED.** apply_migration cc_0010a_r_evidence_matcher_schema_foundation succeeded after prior v1.3 atomic rollback. v1.4 Fix A pattern (purposes CTE joined to information_schema.columns) hydrated 86 k.column_registry NOT NULL columns. v1.5 V6c row-count tightened `>= 86` → `= 86`. v1.5 D-01 (`752dfec6`) returned clean agree with zero pushback. Apply delivered 6 r.* tables + 1 helper + 1 FK (L38 VINDICATED) + 1 default row + 6 k.table_registry rows + 86 k.column_registry rows. V-checks 10 PASS + 1 accept-with-variance. L45 5 mismatches accept-with-variance. Close-the-loop on BOTH D-01 rows (8a4b93fb + 752dfec6) in single 2-row UPDATE. Result file at `docs/briefs/results/cc-0010A-r-reconciliation-ddl-foundation.md`.
- **Pre-cc-0010A gating items (3 items from v2.66) all CLOSED v2.67**: L62 attribution (clean pass-through D-01 indicates not systemic ChatGPT MCP noise); L47 lock scope (no parallel-writer conflict observed at v1.5 apply; Path A likely sufficient); L48 application (split delivered cc-0010A atomic).

**Closed v2.66:** L44–L48 process upgrades formalised + committed.
**Closed v2.65:** cc-0009 PRV-1 second build COMPLETE.
**Closed v2.64:** cc-0009 Stage C documentation sync.
**Closed v2.63:** cc-0009 Stage A + Stage B.
**Closed v2.61:** cc-0008 v5.
**Closed v2.59:** M8 Path A (cc-0005 v4 / M8a) — 344 rows.
*(Older closures truncated; see v2.66 archive.)*

---

## 💼 Personal businesses

**v2.67 carry (unchanged from v2.55–v2.66):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check status next session.

*(no other items flagged at v2.67 close — standing P0 to ask at next session start.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.66.

---

## 📌 Backlog

**v2.67 changes:**

- **CLOSED v2.67**: cc-0010A v1.5 APPLIED + CLOSED. Pre-cc-0010A gating items (L62 attribution + L47 lock scope + L48 application) all closed.
- **STATE CHANGE v2.67**: cc-0010B promoted rank 1 (was rank 2 v2.66 cc-0010A); v1.6 doc patch rank 2 (NEW); close-the-loop batches rank 3 (5-row + 24-row); cc-0010C rank 4 (gated on cc-0010B); F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 trigger filter audit rank 5 (combined cleanup); Platform Reconciliation View newly-eligible rank 6.
- **NEW v2.67 ACTIVE ROWS**: cc-0010B authoring (P1) + v1.6 doc patch (P2) + 24-row historical close-the-loop batch hygiene (P3).
- **NEW v2.67 LESSON CANDIDATE**: L49 — PG reserved-word collision check for PL/pgSQL DECLARE variables.
- **L38 VINDICATED v2.67** — recommend promotion to baseline next cycle.
- **L44 + L45 baseline-eligible v2.67.**
- **L46 baseline CONFIRMED v2.67.**
- **CARRIED v2.67**: Dashboard roadmap PHASES — **23rd** consecutive deferral. F-CC-0009-EF-BACKFILL-HORIZON-FORWARD-ONLY OPEN (likely fold into cc-0010B). All v2.66 carries unchanged otherwise.

**Pre-v2.67 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

L37–L48 unchanged from v2.66 framing. **v2.67 updates:**

- **L37**: continued vindication through cc-0010A v1 → v1.5.
- **L38**: **EMPIRICALLY VINDICATED v2.67.** Recommend promotion to baseline next cycle.
- **L44**: **3rd live exercise complete v2.67 + baseline-eligible.**
- **L45**: **first full live exercise complete v2.67 + baseline-eligible.**
- **L46**: **3rd live application complete v2.67 + baseline confirmed.**
- **L47**: still deferred (no race opportunity at v1.5).
- **L48**: **VINDICATED v2.67** through cc-0010 split delivering cc-0010A as atomic sub-build.
- **L49 NEW candidate v2.67**: PG reserved-word collision check for PL/pgSQL DECLARE variables. PRV-0 §4.3 had `out` which would cause `syntax error at or near "out"` if not caught at apply construction. Neither CCD nor D-01 caught it. Must be brief-authoring pre-D-01 checklist item. Promotion candidate at next-PL/pgSQL-heavy brief close.

**All thirteen candidates (L37 + L38 + L39 + L40 + L41 + L42 + L43 + L44 + L45 + L46 + L47 + L48 + L49) recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates.**

---

## v2.67 honest limitations

- All v2.31–v2.66 limitations apply.
- **L44 + L45 baseline-eligible but not yet promoted.** Baselining requires PK confirmation at promotion cycle.
- **L46 baseline confirmed via clean pass-through** — but only one zero-pushback D-01 in cc-0010A's lifecycle. Need additional clean pass-throughs before claiming L46 is fully vindicated.
- **L47 conditional build still deferred** — no parallel-writer conflicts observed at v1.5 apply window. Path A (doc-only pause cron) presumed sufficient pending next race opportunity.
- **L48 vindicated empirically through cc-0010A delivery.** cc-0010B + cc-0010C will provide additional vindication if their atomic sub-build pattern works smoothly.
- **L49 NEW candidate v2.67** is high-confidence (real bug caught) but pattern repeat unknown until next PL/pgSQL-heavy brief.
- **`r.compact_raw_json` function body uses `result_jsonb` instead of brief-specified `out`.** Disclosure in L45 mismatch declaration. v1.6 doc patch will fold this into brief §2.7 + PRV-0 §4.3.
- **V6 purpose marker not present** on matched_match_id k.column_registry row. Substantive FK fields correct. Brief §3.8 footnote anticipated. Fix-forward in v1.6 or future k.* maintenance brief.
- **5 prior outstanding m.chatgpt_review close-the-loop UPDATEs UNBLOCKED v2.61, still pending v2.67** — batch now 9 sessions overdue. 24 additional unrelated historical escalated rows untouched per CCH directive — eligible for next-session review.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION** empirically confirmed at v1.5 close-out (3 geography rows registered to schema `r`).
- **L34 trigger filter audit empirically informed v2.67**: `evtrg_sync_registry_on_create_table` did NOT pre-insert stub rows for r.* CREATE TABLE during v1.5 apply (Fix A INSERT hit fresh path not ON CONFLICT). Fix A pattern is trigger-independent so non-blocking; trigger filter investigation eligible for P3 cleanup brief.
- **Dashboard roadmap PHASES still stale** — **23rd** consecutive deferral.
- **Action_list file size**: ~52KB at v2.67 close. Sync_state ~30KB. Both above their 10KB / 16KB respective targets.
- **Per-session file written v2.67**: `docs/runtime/sessions/2026-05-12-cc-0010A-applied.md`.
- **Result file written v2.67**: `docs/briefs/results/cc-0010A-r-reconciliation-ddl-foundation.md`.
- **Doc-sync this session**: single push_files commit with 4 files (result file + session file + sync_state + action_list). Production payload commit `3db84322` (v1.5 doc patch) already landed earlier in the session via github MCP.
- **Close-the-loop UPDATEs on m.chatgpt_review this session**: 2 (8a4b93fb + 752dfec6). 5 prior + 24 historical still eligible.
- **State-capture exceptions v2.67: 0.** v1.5 D-01 was clean pass-through.

---

## Changelog

- v1.0–v2.65: per commit history + sync_state archive.
- **v2.66 (2026-05-11 Sydney, post-cc-0009 process upgrades L44–L48 formalised + committed)**: as documented.
- **v2.67 (2026-05-12 Sydney, cc-0010A v1.5 APPLIED + CLOSED — r.* DDL foundation delivered):**
  - **Apply chain**: v1.3 apply at 2026-05-12 08:15:13 UTC FAILED atomically (PG error 23502 on k.column_registry.ordinal_position NOT NULL; zero persistent effect). v1.4 doc patch (`2035a3a8`) introduced Fix A pattern (purposes CTE joined to information_schema.columns) + §1.7b NOT NULL enumeration probe + HALT codes H7b + H10. CCD narrow re-review of v1.4: agree-with-corrections, low risk, no blocking corrections. v1.5 doc patch (`3db84322`) tightened V6c row-count assertion `>= 86` → `= 86` per CCD non-blocking suggestion. v1.5 live pre-flight all 12 probes PASS. v1.5 D-01 (`752dfec6-6f9a-4956-b7d7-a4112009b93c`) clean agree zero pushback — first cc-0010A D-01 to do so. PK approval. Fast drift re-check clean. **apply_migration cc_0010a_r_evidence_matcher_schema_foundation SUCCESS.**
  - **Apply delivered**: 6 r.* tables (ice_publication_evidence 17 cols, platform_observation 16, platform_manual_observation 17, reconciliation_match 16, platform_observer_health 10, matcher_config 10 = 86 total), 1 helper function r.compact_raw_json (with `out` → `result_jsonb` rename disclosed in L45), 1 FK expected_publication_matched_match_id_fkey (L38 VINDICATED), 1 r.matcher_config global default row, 6 k.table_registry UPSERTs, 86 k.column_registry rows via Fix A pattern, 1 k.column_registry FK-flag UPDATE, pg_trgm v1.6 confirmed (no-op).
  - **V-checks**: 10 PASS + 1 accept-with-variance (V6 purpose marker REPLACE no-op; substantive FK fields correct; brief §3.8 footnote anticipated).
  - **L45 truth check**: count-delta 18/18 match; 5-row shape-variant sanity sample all show ordinal_position populated; **5 mismatches all accept-with-variance**: (1) PL/pgSQL `out` → `result_jsonb` rename; (2) V3 function count 3→4 (r.set_updated_at cc-0009 carry); (3) V6 purpose marker absent; (4) k.table_registry r.* baseline 2→5; (5) k.column_registry r.* baseline ~17→95 (4 + 5 per F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION).
  - **Close-the-loop**: single 2-row UPDATE on m.chatgpt_review — 8a4b93fb v1.3 (escalated→resolved) + 752dfec6 v1.5 (completed→resolved). Both `resolved_by='chat'`, `escalation_resolved_at=2026-05-12 09:33:17.63959+00`.
  - **24 unrelated historical escalated m.chatgpt_review rows: intentionally untouched per CCH directive.**
  - **L38 VINDICATED v2.67**: recommend promotion to baseline.
  - **L44 baseline-eligible v2.67**: 3 live exercises complete.
  - **L45 baseline-eligible v2.67**: first full live exercise complete with 5 accept-with-variance mismatches.
  - **L46 baseline confirmed v2.67**: 3 live applications; v1.5 clean pass-through demonstrates clean-surface path eliminates need for overrides.
  - **L48 vindicated v2.67**: cc-0010 split delivered cc-0010A atomic.
  - **L49 NEW candidate v2.67**: PG reserved-word collision check for PL/pgSQL DECLARE variables.
  - **Pattern firsts (6)**: first L48 split outcome applied; first L44+L45+L46+L48 first-live-exercise cycle complete; first single-stage sub-brief from split parent; first apply-time-driven correction (v1.4 from v1.3 atomic rollback); first L46 clean pass-through D-01 (v1.5); first CCD narrow re-review accepting prior commit.
  - **3 pre-cc-0010A gating items from v2.66 all CLOSED v2.67**: L62 attribution; L47 lock scope; L48 application.
  - **cc-0010B + cc-0010C UNBLOCKED v2.67.**
  - **Today/Next 5 rebuild**: cc-0010B = rank 1; v1.6 doc patch = rank 2; close-the-loop batches = rank 3 (5-row + 24-row); cc-0010C = rank 4 (gated); cleanup briefs = rank 5; Platform Reconciliation View = rank 6 (newly eligible); Phase 0 = rank 7; Personal businesses = rank 8.
  - **Active rows updated v2.67**: cc-0010B + v1.6 doc patch + 24-row historical close-the-loop hygiene ADDED. cc-0010A row CLOSED. Pre-cc-0010A gating items CLOSED.
  - **NEW STATUS BLOCK v2.67**: "🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK".
  - **Closure budget**: ~3h v2.67 cycle. Trailing-14-day ~75h above 8.0h floor. ~3 P0+P1 open (cc-0010B + cc-0010C + Phase 0; within 20-finding cap).
  - **Doc-sync this session**: single push_files commit (this commit) with 4 files: result file + session file + sync_state + action_list. Production payload commit `3db84322` (v1.5 doc patch) already landed earlier in the session.
  - **Production mutations this session**: 1 apply_migration (success) + 1 execute_sql write (close-the-loop 2-row UPDATE) + 1 ask_chatgpt_review (D-01) + 2 GitHub commits + 0 memory edits. Zero EF deploys. Zero cron changes. Zero vault writes. Zero secret value entered chat context.
  - **T-MCP-02 cum**: 60 (+1 from 59). State-capture exceptions: 0.
