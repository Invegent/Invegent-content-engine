# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-09 Sydney (**v2.61 — cc-0008 v5 APPLIED + CLOSED (PRV-1 first build delivered).** `c.client_cadence_rule` table created per PRV-0 v2 §3.2 + 14-row seed (12 active + 2 paused-IG cadence-preserved per PRV-0 v2 §11.4) + 1 `k.table_registry` UPSERT + 19 `k.column_registry` UPSERTs in single `apply_migration` (`cc_0008_client_cadence_rule`). All values trigger-aware via `INSERT ... ON CONFLICT DO UPDATE` (Path B per PK directive). Brief lineage v1 → v2 → v3 → v4 (rolled back at `uq_schema_table` due to event-trigger collision; auto-rolled back atomically; no production state changed) → **v5 (APPLIED)** in same session. v5 commit `d4cd3b08...` blob `2575f0bb` (67,494 B). V1–V7 all PASS (V1a 19 cols / V1b 7 CHECKs / V1c 1 FK / V1d 3 indexes / V1e `time[]` / V2 14/14/0 / V3 14:14 / V4 0/0/0 / V5 0 / V6 final state via UPSERT — V6c upgrade confirmed `allowed_ops='upsert'` UPDATEd from default 'read-only' / V7 paused-IG 2/2). Both D-01 rows resolved in `m.chatgpt_review`: v5 row `cd35b93b-...` `status='resolved'` `resolved_by='cc-0008-v5-apply-2026-05-09'`; v4 row `5c5e8f05-...` `status='resolved'` `resolved_by='cc-0008-v5-supersession-2026-05-09'` (NOT applied). cc-0009 UNBLOCKED. **Lessons L33–L36 reified:** L33 (event trigger pre-flight survey mandatory); L34 (`k.fn_sync_registry` is database architecture); L35 (ON CONFLICT defensive pattern for k.*); L36 (`m.chatgpt_review.chatgpt_review_status_check` enum is `{pending,completed,failed,escalated,resolved}` — unblocks 5 prior close-the-loop carries). PK Lesson #62 type-(c) state-capture override applied 2026-05-09. Hold-state intact: no EF deploy / cron / r.* / temp log / Phase 0. Result file commit (this 4-way sync) `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md`. T-MCP-02 +1; state-capture exceptions v2.61: 1. PHASES reconciliation **17th** consecutive carry. **PRV-1 first build delivered.** Per PK directive: cc-0009 next; Platform Reconciliation View remains rank 1 of Today/Next 5. Previous (v2.60): Brand Topic Notebook future-ideation backlog addition. Previous (v2.59): M8a Path A APPLIED and CLOSED via cc-0005 v4.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump that touches production state goes through ChatGPT cross-check before deploy/commit. **v2.61 application**: 1 D-01 fire this cycle (cc-0008 v5 D-01 review_id `cd35b93b-6d9f-4f09-8fa1-26a0c3d669b4`, action_type `sql_destructive`, verdict partial / escalate=true). PK Lesson #62 type-(c) state-capture exception override applied. v2.61 4-way sync close itself is doc-only and per protocol does not require a fire.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is approved target design. All stages CLOSED. **v2.61 application**: no drift fires this session.

**STANDING RULE (Lesson #62, v2.41 + v2.50 refinement)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override. **v2.61 application**: rule **EXERCISED** this cycle for cc-0008 v5 D-01 (matched type-(c) generic-non-specific-pushback pattern from v4 fire shape; `corrected_action='consider performing additional testing on a staging environment'` not actionable since ICE has no staging). PK explicit override 2026-05-09.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time**.

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery is now the default brief pattern for any CC dashboard/portal/web/script work.

**STANDING RULE (v2.50 — Acceptance integrity)**: Acceptance is not complete until the actual review artifact is received and reviewed. **v2.61 application**: cc-0008 v5 result file content authored locally and committed in this 4-way sync; will re-fetch via `get_file_contents` after commit lands per L31.

**STANDING RULE (v2.55 — brief-runner-v0 baseline patterns from cc-0003 cycle)**: L1–L4 are baseline:
- **L1 HALT mechanism is load-bearing.**
- **L2 doc-only patch → re-execution loop.**
- **L3 result-file preservation.**
- **L4 pre-state baseline pattern is now required.**

**v2.56 ADDITION**: **L6 (cross-brief patch propagation when invariant fails) is now baseline.**

**v2.57 ADDITIONS:** L10–L18.

**v2.58 ADDITIONS:** L22–L25.

**v2.59 vindications and promotions:** L19+L20+L21 VINDICATED; L11+L16+L17+L18 vindicated again. L17 promotion to baseline.

**v2.61 ADDITIONS (NEW from cc-0008 v4→v5 cycle):**
- **L33** Event trigger pre-flight survey is mandatory for DDL briefs in `k.schema_registry`-registered schemas. Strong empirical evidence from rollback root cause.
- **L34** `k.fn_sync_registry` auto-registration is part of database architecture. Affects all PRV-1 build briefs.
- **L35** `INSERT ... ON CONFLICT DO UPDATE` is the defensive pattern for k.* registry rows. V6c verifies upgrade.
- **L36** `m.chatgpt_review.chatgpt_review_status_check` enum `{pending,completed,failed,escalated,resolved}`; close-the-loop UPDATEs map all positive terminals to `resolved`. Unblocks 5 prior outstanding close-the-loop carries.

**All four recommended for promotion to baseline candidate at next cycle.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~2 (unchanged from v2.59/v2.60) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~65h (cc-0008 v5 cycle ~45 min chat work this session, plus prior v2.59) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This v2.61 cc-0008 v5 closure cycle: ~45 min total** (v5 brief patch authoring after v4 rollback ~25 min; pre-flight re-verify ~3 min; D-01 fire ~2 min; final re-verify + V1-V7 close-out ~10 min; close-the-loop UPDATEs ~3 min; result file authoring + 4-way sync ~15 min; this scaling reflects the deepest cc-NNNN cycle yet — only one with apply rollback recovery).

**State-capture exception count v2.61: 1** (cc-0008 v5 D-01 PK Lesson #62 type-(c) override 2026-05-09 — matched v4 fire shape; pushback A mitigated by §1.12 ~60s re-verify; pushback B addressed by atomic txn semantics + new ON CONFLICT strategy; pushback C generic future uncertainty; no specific empirical blocker raised).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-09 Sydney (v2.61).
> **v2.61 note:** cc-0008 v5 APPLIED + CLOSED. PRV-1 first build delivered. cc-0009 UNBLOCKED — should rank above current rank 1 (Platform Reconciliation View) at next session start since cc-0009 is the next sequenced PRV-1 step. Today/Next 5 promotion deferred to next session per minimal-scope discipline at this 4-way sync close. Platform Reconciliation View remains rank 1 of THIS table; cc-0009 + 5 close-the-loop UNBLOCKED carries are flagged in 🟡 Next session priorities of `00_sync_state.md` for next-session promotion.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Platform Reconciliation View — BRIEF AUTHORING** | **P2 → PROMOTED to rank 1 v2.59; v2.61 NOTE cc-0008 v5 closure delivered the cadence-rule canonical seed** | All three sequencing blockers cleared (cc-0007 v2.58, cc-0005 M8a v2.59, urgent pipeline-integrity closure v2.59). v2.61 cc-0008 v5 APPLIED delivers `c.client_cadence_rule` (referenced as cadence-side input). | PK directs scheduling. Brief authoring (chat) when greenlit. |
| 2 | **Dashboard Architecture Review Phase 0 prerequisites** | P1 TOP | Unchanged. M-series effectively complete v2.59. | PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. |
| 3 | **AI cost view** | P3 quick win | Unchanged. ~1h estimate. | Author `vw_ai_cost_monthly` view DDL on `m.ai_job` + add NOW dashboard tile. |
| 4 | **Publisher latent config risk follow-up** | P3 quick win | Carry from v2.58. | Single-file commit to `supabase/config.toml`. NO deploy required. ~5 min. |
| 5 | **Personal businesses check-in** | P0 standing | Carry. | PK reports any time-sensitive items + Crazy Domains clean-up status. |

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (unchanged from v2.55)

All stages CLOSED. Cron jobid 80 + 81 active=true. No drift fires this cycle.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`.

**v2.61 update:**
- ✅ S30 cleared v2.47.
- ✅ M5–M8 reconciliation effectively COMPLETE v2.59.
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override.

---

## 🟢 Tier 1 + M4 + M5 + M6 Phase A + M6 Phase B + M8a queue integrity & stability remediation — STATUS BLOCK

**v2.59 update — M-series effectively complete (preserved at v2.60/v2.61):**

| M-step | Closure version | Apply commit | Effect |
|---|---|---|---|
| M1 + M2 + M3 | v2.55 (lineage) | (5 May) | Tier 1 queue integrity foundations |
| M4 | v2.55 (lineage) | (5 May) | State-capture override; 8/8 PASS |
| M5 | v2.55 (lineage) | (5 May) | Corrected cascade fix; 7/7 PASS |
| M6 Phase A | v2.55 | `d60dcfbc` | 9 Bug 3 fingerprint rows dead-lettered |
| M6 Phase B | v2.56 | `9d5bdd37` | 43 v4-mismatch rows dead-lettered |
| M7 | doc-only fold | n/a | n/a |
| **M8a** | **v2.59** | result `eb820bae` | **344 legacy-origin future queue rows dead-lettered + cron 48 rewritten in place** |
| M8b | DEFERRED | TBD | function rename + COMMENT after manual caller remediation |

**Total residual rows cleared by M-series dead-letter cycles since 8 May 2026: 9 + 43 + 344 = 396 rows.**

**Urgent pipeline-integrity block now EFFECTIVELY COMPLETE v2.59. v2.61 unchanged.**

---

## 🟢 Platform Reconciliation View — BRIEF CANDIDATE STATUS BLOCK (PROMOTED to rank 1 v2.59)

**Status v2.61:** Unchanged from v2.59/v2.60. **PROMOTED to next major planning/work item per PK directive.**

**Classification:** pipeline observability / reconciliation. **NOT cosmetic dashboard work** (PK explicit framing 2026-05-09).

**Title:** Platform Reconciliation View — by day / client / platform.

**v2.61 cross-reference:** cc-0008 v5 brief (commit `d4cd3b08`, blob `2575f0bb`) APPLIED + CLOSED at v2.61. v5 supersedes v4 (which rolled back atomically at `uq_schema_table`). PRV-0 v2 design lock at commit `6e989517`; cc-0008 result file committed in this 4-way sync. PRV-1 first build delivered; cc-0009 next.

**Required scope (PK-directed 2026-05-09):**
- by day / client / platform reconciliation
- ICE expected cadence (`c.client_cadence_rule` now seeded — cc-0008 v5 APPLIED v2.61)
- ICE generated assets / drafts (`m.post_draft`)
- ICE queue state (`m.post_publish_queue`)
- ICE publisher result / logs
- platform-observed post evidence
- mismatch classification: `missing`, `late`, `duplicate`, `extra`, `wrong-content`, `stale`, `OK`
- evidence links / platform IDs where available
- manual override field for platforms where API ingestion is not yet available

**Seed manual observations (PK direct, 2026-05-09 Sydney; preserved across v2.58–v2.61 closes):**

| Client | Platform | Observation date | PK note |
|---|---|---|---|
| NDIS Yarns | YouTube Short | 7 May 2026 | — |
| Property Pulse | YouTube Short | 6 May 2026 | — |
| NDIS Yarns | Instagram | 1 May 2026 | — |
| Property Pulse | Instagram | 25 Apr 2026 | — |
| Invegent | Instagram | 25 Apr 2026 | — |
| Property Pulse | Facebook | 8 May 2026 | — |
| NDIS Yarns | Facebook | 8 May 2026 | — |
| Care for Welfare | Facebook | 1 May 2026 | — |
| Invegent | Facebook | 8 May 2026 | **wrong / irrelevant post** |
| Care for Welfare | LinkedIn | ~6 May 2026 | — |
| NDIS Yarns | LinkedIn | ~8 May 2026 | — |
| Property Pulse | LinkedIn | ~7 May 2026 | **two posts in one day** |
| Invegent | LinkedIn | (consistent) | "appears consistent" |

**Implementation gates:**
1. Phase 0 confirmation defaults still pending.
2. Architecture review §10 extension scope.
3. Manual override design.
4. API ingestion priority order.

**Brief author when promoted:** chat.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.54.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.61 application**: 1 D-01 fire this cycle (cc-0008 v5 D-01 `cd35b93b-6d9f-4f09-8fa1-26a0c3d669b4`, action_type `sql_destructive`). Cumulative T-MCP-02 = 56 (was 55 at v2.60). Cumulative T-MCP-08 unchanged at 2. State-capture exceptions v2.61: **1** (cc-0008 v5 D-01 PK Lesson #62 type-(c) override 2026-05-09).

**Close-the-loop UPDATEs to `m.chatgpt_review`:** v2.61 adds 2 (v5 row `cd35b93b-...` `status='resolved'` `resolved_by='cc-0008-v5-apply-2026-05-09'`; v4 row `5c5e8f05-...` `status='resolved'` `resolved_by='cc-0008-v5-supersession-2026-05-09'`). **5 prior cc-NNNN reviews pending close-the-loop** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) — UNBLOCKED v2.61 by L36 enum discovery; recommend batched close-out next session via single execute_sql with CASE expression.

---

## 🤖 Cowork automation (D182)

**v2.61 status (carry from v2.54–v2.60):** `docs/briefs/morning-inbox-sweep-v1.md` committed status=draft per PK hold. NOT scheduled in Cowork until PK amends.

**Existing Cowork status:** Weekly reconciliation Mon 7am AEST + ICE Nightly Health Check daily 02:00 AEST.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface; pipeline observability | **P2 → rank 1 v2.59 (PROMOTED); v2.61 NOTE cc-0008 v5 closure delivered cadence-rule canonical seed** | Sequencing blockers all cleared. cc-0008 v5 APPLIED v2.61 delivers `c.client_cadence_rule`. Brief NOT YET AUTHORED. | PK → chat | Brief authoring when PK greenlights. |
| **cc-0009 brief authoring — PRV-1 next step** | Create `r.*` schema tables (`r.reconciliation_run` + `r.expected_publication`) + deploy cadence-rule-generator EF + run first backfill against `c.client_cadence_rule` seed | **P2 NEW v2.61** | UNBLOCKED v2.61 by cc-0008 v5 closure. `r` schema confirmed pre-registered in `k.schema_registry` (status='active'). Brief NOT YET AUTHORED. cc-0009 brief MUST include §1.x event-trigger pre-flight survey + ON CONFLICT pattern (L33+L34+L35 reified v2.61). | PK → chat | Brief authoring when PK directs. Sequencing: cc-0010 / cc-0011 follow cc-0009 per PRV-0 v2 §8.2. |
| **Close-the-loop UPDATE batch (5 prior cc-NNNN D-01 rows — UNBLOCKED v2.61)** | Map cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 D-01 rows in `m.chatgpt_review` to `status='resolved'` with apply-outcome captured in `action_taken` + `resolved_by` text | **P3 NEW v2.61** | UNBLOCKED by L36 enum discovery. All 5 rows currently `status='escalated'`. Batch UPDATE in single `execute_sql` call. ~10 min when scheduled. | chat → next session | Single execute_sql with CASE expression. Already empirically tested at v2.61. |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults | P1 TOP (unchanged) | M-series effectively complete v2.59. 7 default-blockers still pending PK confirm/override. | PK | Confirm defaults via cc-0001. |
| **AI cost view** (carry from v2.49) | `vw_ai_cost_monthly` view + dashboard tile | P3 → Top 3 (carry) | Backlog | chat → next session | Author view DDL + add NOW dashboard tile. ~1h. |
| **Publisher latent config risk follow-up** | Doc-only patch adding `[functions.publisher] verify_jwt = false` | P3 (carry from v2.58) | OPEN. | chat → next session | Single-file commit to `supabase/config.toml`. NO deploy required. ~5 min. |
| **M8b separate brief authoring** | Function rename + COMMENT after manual caller remediation | P3 (NEW v2.59 Active item) | NOT YET AUTHORED. Sequencing gate: BOTH manual callers must first be remediated. | PK → chat | When PK directs. **Not blocking new work.** |
| **94-row un-publishable legacy draft cohort cleanup** | Drafts: `pd.slot_id IS NULL AND pd.scheduled_for IS NULL AND pd.created_by='seed_and_enqueue' AND pd.approval_status IN ('approved','scheduled')` | P3 (carry from v2.58) | LOGGED. Currently 94 rows. | PK → chat → future session | If PK directs, separate cc-NNNN brief. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** (carry, security) | Cron jobid 58 has secret hardcoded inline | P2 (security) | OPEN — unchanged v2.61 | chat → future session (PK approval required) | PK to authorise secret rotation. |
| **F-YT-PUB-AVATAR-EXCLUSION** (carry from v2.53) | youtube-publisher filter excludes `video_short_avatar` | P3 | LOGGED, no chat action | chat → future (passive) | Validator. |
| **morning-inbox-sweep-v1 brief amendment** (carry from v2.51) | PK personal-email morning triage | P3 | DRAFT exists at `docs/briefs/morning-inbox-sweep-v1.md` (status=draft) | PK → chat | PK reviews + proposes amendments. |
| **NEW v2.56 P3 backlog observation** | 1 LinkedIn queue row (`1a21199e-...`) was in queue with `pd.approval_status='draft'` | P3 | LOGGED, no chat action | chat → future (passive) | Investigation deferred. |
| **Dashboard mobile responsiveness — system-wide** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session OR Phase 1+ | Either dedicated session OR roll into architecture review Phase 1+ build sequence. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock readiness | P3 | OBSERVED | chat → T05 unblock session | Plan cap-throttle / rate-limit handling. |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | Investigate downstream pathway. |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates | chat → future session | Update `00_overview.md`. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 | chat → Phase 2 session | Bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45 → v2.61 (**17th deferral**) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |
| **F-CRON-COMPLIANCE-MONITOR-STALE** (carry) | cron jobid 31 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Decide. |
| **F-CRON-INGEST-STALE** (carry) | cron jobid 1 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PIPELINE-AI-SUMMARY-STALE** (carry) | cron jobid 30 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PIPELINE-DOCTOR-STALE** (carry) | cron jobids 29 + 39 call deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **Music library activation checklist** (carry) | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK ACTION | PK | PK to action when ready. |
| **Emergency redeploy governance question** (carry) | Should bounded production-restoration require expedited D-01? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules; chat documents. **v2.61 note:** cc-0008 v5 cycle (apply rollback recovery via super-patch + new D-01 fire) demonstrates standard D-01 protocol can handle even rollback recovery without expediting. |

**Closed v2.61:** **cc-0008 v5 (PRV-1 first build).** `c.client_cadence_rule` table created per PRV-0 v2 §3.2 + 14-row seed (12 active + 2 paused-IG cadence-preserved per PRV-0 v2 §11.4) + 1 `k.table_registry` UPSERT + 19 `k.column_registry` UPSERTs in single `apply_migration` (`cc_0008_client_cadence_rule`). v5 commit `d4cd3b08` blob `2575f0bb` (67,494 B). v4 apply attempt FAILED at `uq_schema_table`; auto-rolled back atomically; no production state changed; v4 D-01 row resolved as superseded. v5 supersedes via trigger-aware ON CONFLICT pattern. V1–V7 all PASS. Both D-01 rows resolved in `m.chatgpt_review`. cc-0009 UNBLOCKED. **L36 enum discovery (`chatgpt_review_status_check` = `{pending,completed,failed,escalated,resolved}`) UNBLOCKS 5 prior close-the-loop carries** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) — recommend batched close-out next session.

**Closed v2.60:** *(none — v2.60 was a single-file backlog addition only; no closures.)*

**Closed v2.59:** **M8 Path A (cc-0005 v4 / M8a)** — APPLIED via Supabase MCP `apply_migration` by CC. 344 rows dead-lettered. V1–V10' all PASS. No rollback. Result file commit `eb820bae`.

**Closed v2.58:** F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1) — cc-0007 result commit `411b85ee`.
**Closed v2.57:** F-CRON-PG-NET-TIMEOUT-5S (P2) — cc-0006 commit `c72bc327`.
**Closed v2.56:** M6 Phase B (P1) — cc-0004 commit `9d5bdd37`.
**Closed v2.55:** M6 Phase A (P1) — cc-0003 v2 commit `d60dcfbc`.
**Closed v2.54:** video-worker `verify_jwt` durable fix (P3).
**Closed v2.53:** F-YT-NY-FORMAT-SELECTION P1 (commit `1ccfe9a2`).
**Closed v2.52:** insights-worker P1 functional drift; F-HEYGEN-RPC-MIGRATIONS-MISSING; F-INSIGHTS-RPC-MIGRATIONS-MISSING.
**Closed v2.50:** P1 SECURITY-DEFINER triage.
**Closed v2.49:** F-EF-DRIFT-PREVENTION Stage 3.
**Closed v2.48:** Stage 2b dashboard drift panel.
**Closed v2.47:** S30.
**Closed v2.46:** Dashboard Architecture Review of 2026-05.
**Closed v2.44:** F-EF-DRIFT-PREVENTION Stage 2a finalisation.
**Closed v2.43:** bef6be96 origin investigation.
**Closed v2.41:** F-EF-DRIFT-PREVENTION Stage 1.
**Closed v2.40:** F-EF-DRIFT-PREVENTION investigation phase.

---

## 💼 Personal businesses

**v2.61 carry (unchanged from v2.55–v2.60):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK called CD on 2026-05-08. Remaining clean-up still PK to action manually:
  1. Cancel Website Builder auto-renewal (saves ~$251/yr ongoing)
  2. Disable Premium DNS auto-renewal (saves $26/yr; move DNS to Cloudflare — free)
  3. Disable Domain Guard on .com auto-renewal (saves $9/yr)
  4. Before Nov 2026: transfer invegent.com to Cloudflare Registrar (~A$15/yr); transfer invegent.com.au to VentraIP or similar (~A$25–35/yr).
  5. Decline the $521/3yr renewal quote from CD.

  **Total annual saving once cleaned up: ~A$286/yr ongoing. Three-year saving: ~A$860.**

  Not chat scope — PK actions manually. Re-check status next session.

*(no other items flagged at v2.61 close — standing P0 to ask at next session start.)*

---

## 🌱 Future ideation / content-pipeline expansion (NOT current pipeline-integrity work)

> **Classification:** Forward-looking ideation. Queue behind: (1) ~~cc-0008 / PRV-1 foundation~~ CLEARED v2.61, (2) Platform Reconciliation build, (3) AI Operating System Improvements / project skills. NOT pipeline-integrity work.
> **Status of section v2.61:** unchanged from v2.60 introduction. Forward visibility only. cc-0008 / PRV-1 foundation now CLOSED at v2.61 — first queue-behind item is now CLEARED. Remaining queue: Platform Reconciliation build + AI OS Improvements.

### v2.60 — Brand Topic Notebook → Episodic Podcast Source Pack (NotebookLM upstream feed)

**Logged:** 2026-05-09 Sydney (PK direction post cc-0008 v3 landing).

**Context.** PK observed that NotebookLM can create topic-specific notebooks and generate podcast-style Audio Overviews from source material. This could be connected to ICE brands as an upstream content ideation / source-pack system.

**Potential use:**
- One or more topic notebooks per brand (NDIS Yarns, Property Pulse, CFW, Invegent)
- NotebookLM Audio Overview generates an episodic discussion / draft
- ICE ingests transcript / summary / source pack → multi-platform derivatives (YT Shorts, LI, FB, IG, newsletter, possible long-form podcast scripts)

**Important framing (PK explicit):**
- Do NOT treat raw NotebookLM audio as final publishable brand content.
- Treat it as research / ideation / source-pack material requiring review.
- Near-term workflow likely semi-manual unless a reliable API / export path is confirmed.
- Future module name candidate: `Brand Topic Notebook → Episode Source Pack → Content Derivatives`.

**Queue behind (PK directive):**
1. ~~cc-0008 / PRV-1 foundation~~ CLEARED v2.61 (cc-0008 v5 APPLIED + CLOSED).
2. Platform Reconciliation build (Active table rank 1 promoted v2.59).
3. AI Operating System Improvements / project skills.

**Classification:** Future content-pipeline expansion, not current pipeline-integrity work.

**Open questions (deferred to brief-authoring time):**
- Reliable export path from NotebookLM (transcript text, audio file, source list)?
- Per-brand notebook count: one per brand, or one per topic-thread per brand?
- Source curation responsibility: PK manual vs ICE-ingested feed?
- Review gate before ICE generates publishable derivatives?
- Long-form podcast scripts: separate output channel, or downstream of Audio Overview?
- Storage / retention?
- Mismatch with cc-0008 cadence model: cadence-side intent (`c.client_cadence_rule` — now SEEDED v2.61) vs ideation-driven episodic cadence — how do they reconcile?

**Not actionable until upstream blockers clear.** Logged for forward visibility only.

---

## 📌 Backlog

**v2.61 changes**:

- **CLOSED v2.61**: **cc-0008 v5 (PRV-1 first build)** — `c.client_cadence_rule` table + 14-row seed + k.* registry rows applied via single `apply_migration` (`cc_0008_client_cadence_rule`) with trigger-aware `INSERT ... ON CONFLICT DO UPDATE` pattern. v5 supersedes v4 (which rolled back atomically). V1–V7 all PASS. Result file commit (this 4-way sync). cc-0009 UNBLOCKED.
- **UNBLOCKED v2.61**: 5 prior outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) — UNBLOCKED by L36 enum discovery (`chatgpt_review_status_check` = `{pending,completed,failed,escalated,resolved}`). Recommend batched close-out next session via single `execute_sql` with CASE expression mapping each row's apply outcome.
- **NEW v2.61 LESSONS L33–L36**: L33 (event trigger pre-flight survey mandatory for DDL in `k.schema_registry`-registered schemas); L34 (`k.fn_sync_registry` is database architecture not edge case); L35 (`INSERT ... ON CONFLICT DO UPDATE` defensive pattern for k.* registry rows); L36 (`m.chatgpt_review.chatgpt_review_status_check` enum discovery — close-the-loop UPDATEs map all positive terminals to `resolved` with semantic distinction in text fields). All four reified by cc-0008 v4→v5 cycle. **All four recommended for promotion to baseline candidate at next cycle.**
- **NEW v2.61 ACTIVE ROW**: cc-0009 brief authoring (P2) — PRV-1 next step. Brief NOT YET AUTHORED. Sequencing: cc-0010 / cc-0011 follow cc-0009 per PRV-0 v2 §8.2.
- **NEW v2.61 ACTIVE ROW**: Close-the-loop UPDATE batch (P3) — 5 prior cc-NNNN rows. Now unblocked. ~10 min when scheduled.
- **STATE CHANGE v2.61**: Future ideation block (Brand Topic Notebook) — first queue-behind item CLEARED (cc-0008 / PRV-1 foundation closed). Remaining queue: Platform Reconciliation build + AI OS Improvements.
- **CARRIED v2.61**: Dashboard roadmap PHASES — **17th** consecutive deferral (was 16th in v2.60).
- **CARRIED v2.61**: 4× v2.54 P2 cron findings.
- **CARRIED v2.61**: F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN unchanged).
- **CARRIED v2.61**: Publisher latent config risk follow-up (P3 quick win, doc-only patch, ~5 min).
- **CARRIED v2.61**: All v2.60 carries unchanged. Today/Next 5 unchanged at this close (cc-0009 promotion deferred to next session per minimal-scope discipline). Platform Reconciliation View remains rank 1 of Today/Next 5. M8b + 94-row cohort remain Active P3 rows.

**v2.60 changes**:

- **NEW v2.60**: Brand Topic Notebook → Episodic Podcast Source Pack (NotebookLM upstream feed concept). Per-brand topic notebooks → NotebookLM Audio Overview → ICE ingest → multi-platform derivatives. Raw NotebookLM audio NOT to be treated as final publishable content (PK explicit framing). Queued behind cc-0008/PRV-1 foundation, Platform Reconciliation build, AI Operating System Improvements / project skills. Classification: forward-looking ideation, NOT current pipeline-integrity work.

**v2.59 changes**:

- **CLOSED v2.59**: M8 Path A (cc-0005 v4 / M8a) — result commit `eb820bae`. 344 rows dead-lettered. V1–V10' all PASS.
- **PROMOTED v2.59**: Platform Reconciliation View → rank 1 of Today/Next 5 + first row in Active table.
- **STATE CHANGE v2.59**: M8b separate brief moved from carry-only to Active table P3 row.
- **STATE CHANGE v2.59**: 94-row un-publishable legacy draft cohort cleanup moved from carry-only to Active table P3 row.

**v2.55–v2.58 + earlier changes**: per prior changelog.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

- **Lesson #61** (P1–P5 must be empirically verified, not theoretically assumed) — reinforced again by cc-0005 v4 / M8a cycle and cc-0008 v5 cycle. **Promotion to canonical recommended (now reinforced 5 times: cc-0003 v2, cc-0004, cc-0006, cc-0005 v4, cc-0008 v5).**
- **Lesson #62 v2.50 refinement** — exercised at v2.61 (cc-0008 v5 D-01 type-(c) state-capture override).
- **L17 in-place patching pattern** — vindicated third time v2.59.
- **L11, L16, L18 vindicated again** — strong evidence; promotion next cycle.
- **L19, L20, L21 (v2.58 candidates)** — VINDICATED v2.59. Promotion to baseline candidates.

**v2.60 NEW lesson candidate (L32)**: future-ideation backlog quarantine pattern.

**v2.61 NEW lesson candidates (L33–L36)** — all four reified by cc-0008 v4→v5 cycle:

- **L33** Event trigger pre-flight survey is mandatory for DDL briefs in `k.schema_registry`-registered schemas (a/c/f/k/m/r/t). Strong empirical evidence from rollback root cause. **Recommended for promotion to baseline candidate at next cycle.** Reified across all PRV-1 build briefs (cc-0009 / cc-0010 / cc-0011).
- **L34** `k.fn_sync_registry` auto-registration is part of database architecture, not edge case. Strong empirical evidence from rollback root cause. **Recommended for promotion to baseline candidate at next cycle.**
- **L35** `INSERT ... ON CONFLICT DO UPDATE` is the defensive pattern for k.* registry rows. v5 §3.3+§3.4 verified PASS via V6c upgrade confirmation. **Recommended for promotion to baseline candidate at next cycle.**
- **L36** `m.chatgpt_review.chatgpt_review_status_check` CHECK enum is `{pending, completed, failed, escalated, resolved}`. Empirical fact: `execute_sql` DML on `m.chatgpt_review` works once the CHECK constraint is satisfied. **Strong empirical evidence from this turn's two successful close-the-loop UPDATEs.** Unblocks 5 prior outstanding close-the-loop carries. **Recommended for promotion to baseline candidate at next cycle.** Memory rule narrowing recommendation: "execute_sql can perform DML on `m.*` audit tables (`m.chatgpt_review`); for actual pipeline c/f/m/t mutations, prefer SECURITY DEFINER functions in public schema called via .rpc()".

- **v2.61 candidate cc-0008-cycle pattern**: "apply rollback → root cause investigation → v5 trigger-aware super-patch → new D-01 fire → apply success" cycle is durable. First brief in cc-NNNN series to demonstrate end-to-end recovery from atomic rollback. v4→v5 cycle proves both the apply rollback safety (atomic txn semantics held; no production state changed) and the recovery via super-patch (v5 added pre-flight + ON CONFLICT in same session).

---

## v2.61 honest limitations

- All v2.31–v2.60 limitations apply.
- **cc-0008 v5 APPLIED + CLOSED at v2.61.** First cc-NNNN cycle in series to demonstrate end-to-end recovery from atomic apply rollback. v4 rolled back at `uq_schema_table` due to event-trigger collision; v5 trigger-aware super-patch authored + new D-01 fire + apply success in same session. V1–V7 all PASS. Result file committed in this 4-way sync.
- **5 prior outstanding `m.chatgpt_review` close-the-loop UPDATEs UNBLOCKED at v2.61** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) — L36 enum discovery reveals all 5 carries map to `status='resolved'`. Batch close-out via single `execute_sql` with CASE expression. ~10 min when scheduled. Carry as P3 backlog (Active table row) for next session.
- **2 close-the-loop UPDATEs APPLIED v2.61** for cc-0008 itself (v5 row `cd35b93b-...` resolved as applied; v4 row `5c5e8f05-...` resolved as superseded). Empirical proof that `execute_sql` DML on `m.chatgpt_review` works once CHECK constraint satisfied.
- **L33 + L34 + L35 + L36 reified.** All future PRV-1 build briefs (cc-0009 / cc-0010 / cc-0011) MUST include §1.12 (`pg_event_trigger` survey) + §1.13 (`k.*` unique constraints + column defaults + schema_registry) pre-flight + ON CONFLICT pattern for k.* UPSERTs.
- **PK Lesson #62 type-(c) state-capture exception override applied 2026-05-09** for cc-0008 v5 D-01 `cd35b93b-...`. Generic-future-uncertainty pushback shape matched v4 fire (also Lesson #62 type-(c)). State-capture exception count v2.61: **1**.
- **Memory at 30-edit cap pre-session** (carry). v2.61 does NOT update memory directly. **L36 specifically warrants memory rule update** (narrow "execute_sql is read-only on c/f/m/t for DML" rule to exclude `m.chatgpt_review`).
- **Dashboard roadmap PHASES still stale** — **17th** consecutive deferral.
- **Sync state file size**: ~24KB at v2.61 close (was ~30KB at v2.59). Modest reduction due to streamlining inline summaries. Archive sweep **OVERDUE** since the 16KB threshold was crossed at v2.54.
- **Today/Next 5 promotion deferred to next session** per minimal-scope discipline at this 4-way sync close. cc-0009 + 5 close-the-loop UNBLOCKED carries are flagged in 🟡 Next session priorities of `00_sync_state.md` for next-session promotion.
- **Per-session file**: `docs/runtime/sessions/2026-05-09-cc-0008-applied.md` (~11KB).
- **Result file size**: ~19KB.
- **L23 (repo + deploy coordination rollback shape)** — still logged but not exercised.
- **cc-0008 v4→v5 brief-runner-v0 patterns observed** (NEW this cycle): apply rollback → root cause investigation (`uq_schema_table` constraint violation traced to `trg_k_registry_sync_on_create_table` event trigger via `pg_event_trigger` query + function body inspection) → v5 trigger-aware super-patch → new D-01 fire → apply success → V1–V7 PASS → both D-01 rows close-the-loop. **First end-to-end recovery cycle in cc-NNNN series.** Atomic transaction rollback safety vindicated empirically.
- **cc-0008 v5 brief landed at 67,494 B (v4 was 67,598 B)** — within practical envelope for `create_or_update_file` reliability.
- **Acceptance integrity adherence (v2.50)**: v5 brief commit `d4cd3b08` re-fetched via `Invegent GitHub:get_file_contents` post-commit. cc-0008 result file committed in this 4-way sync.
- **Per-session file split**: cc-0005 v4 inline summary preserved in v2.61 sync_state; cc-0007 v2.58 inline summary drops out of inline (still in session index table). 2-inline pattern maintained.

## v2.60 honest limitations

- All v2.31–v2.59 limitations apply.
- **cc-0008 v3 brief landed but NOT YET APPLIED** at v2.60. (v2.61 update: now APPLIED.)
- **No D-01 fire for v2.60** — single-file backlog addition was doc-only.
- **Brand Topic Notebook ideation note has open questions** (deferred to brief-authoring time).
- **L23 (repo + deploy coordination rollback shape)** — still logged but not exercised.

---

## Changelog

- v1.0–v2.58: per previous changelog.
- **v2.59 (2026-05-09 Sydney, M8a Path A applied + closed via cc-0005 v4):**
  - **M8 Path A (cc-0005 v4 / M8a) APPLIED and CLOSED** — cc-0005 v4 APPLIED via Supabase MCP `apply_migration` by CC in single atomic transaction (`m8a_cron48_rewrite_and_legacy_cleanup_v1`). 344 legacy-origin future queue rows dead-lettered. V1–V10' all PASS. Result file commit `eb820bae`.
  - **Component 3 DEFERRED to M8b** per v4 design.
  - **Brief-runner-v0 lessons** L19+L20+L21 VINDICATED. L11+L16+L17+L18 vindicated again.
  - **M-series total dead-letter rows since 8 May 2026:** 9 + 43 + 344 = **396 rows**.
  - **Urgent pipeline-integrity block now EFFECTIVELY COMPLETE.**
- **v2.60 (2026-05-09 Sydney, future ideation backlog addition — Brand Topic Notebook):**
  - **NEW**: Brand Topic Notebook → Episodic Podcast Source Pack — logged in new "🌱 Future ideation / content-pipeline expansion" section.
  - **Single-file doc-only commit** to `docs/00_action_list.md`. No D-01 fire.
  - **Carried**: all v2.59 carries unchanged.
- **v2.61 (2026-05-09 Sydney, cc-0008 v5 APPLIED + CLOSED — PRV-1 first build delivered):**
  - **cc-0008 v5 APPLIED and CLOSED** — `c.client_cadence_rule` table created per PRV-0 v2 §3.2 + 14-row seed (12 active publish_profile + 2 paused-IG cadence-preserved per PRV-0 v2 §11.4) + 1 `k.table_registry` UPSERT + 19 `k.column_registry` UPSERTs in single `apply_migration` (`cc_0008_client_cadence_rule`). All values trigger-aware via `INSERT ... ON CONFLICT DO UPDATE` (Path B per PK directive). Brief lineage v1 → v2 → v3 → v4 → v5 in same session. v4 commit `026dfbd7`; v5 commit `d4cd3b088c98b37667c85382a52b024ef3636b2d` blob `2575f0bb9c3d1a21035b729095eb126465dc7f9e` (67,494 B landed). Result file commit (this 4-way sync) at `docs/briefs/results/cc-0008-client-cadence-rule-table-and-seed.md`.
  - **v4 apply attempt 2026-05-09 ~11:55 UTC FAILED at `uq_schema_table`** due to event-trigger collision: `trg_k_registry_sync_on_create_table` (function `k.evtrg_sync_registry_on_create_table` → `k.fn_sync_registry`) auto-INSERTs stub `k.table_registry` + `k.column_registry` rows at `ddl_command_end`; v4 §3.3 explicit INSERT then collided. Atomic rollback; **no production state changed**. v4 D-01 row `5c5e8f05-...` SUPERSEDED.
  - **v5 supersession via trigger-aware ON CONFLICT pattern**. v5 changes from v4: §1.12 + §1.13 NEW pre-flight; §3.3 rewritten with `ON CONFLICT (schema_name, table_name) DO UPDATE`; §3.4 rewritten with `ON CONFLICT (table_id, column_name) DO UPDATE`; V6c NEW `allowed_ops` upgrade verification proves ON CONFLICT executed; §5.1.a NEW (v4 supersession close-the-loop direction); §6.2.m/n/o NEW HALT criteria. **DDL/seed values UNCHANGED from v4.**
  - **NEW v5 D-01 fire** (review_id `cd35b93b-6d9f-4f09-8fa1-26a0c3d669b4`, action_type `sql_destructive`). Verdict partial / escalate=true / risk=medium / confidence=high. Three pushbacks all generic-future-uncertainty. **PK Lesson #62 type-(c) state-capture exception override applied 2026-05-09**.
  - **V1–V7 all PASS post-apply**: V1a 19 cols / V1b 7 CHECKs / V1c 1 FK / V1d 3 indexes / V1e `time[]` / V2 14/14/0 / V3 14:14 / V4 0/0/0 / V5 0 / V6 final state via UPSERT — V6c upgrade confirmed / V7 paused-IG 2/2.
  - **TWO `m.chatgpt_review` close-the-loop UPDATEs APPLIED v2.61**: v5 row `cd35b93b-...` `status='resolved'` `resolved_by='cc-0008-v5-apply-2026-05-09'`. v4 row `5c5e8f05-...` `status='resolved'` (NOT `applied`) `resolved_by='cc-0008-v5-supersession-2026-05-09'`.
  - **L36 enum discovery (`chatgpt_review_status_check` = `{pending,completed,failed,escalated,resolved}`)**: both UPDATEs map to `resolved` with semantic distinction in `action_taken` + `resolved_by` text fields. **UNBLOCKS 5 prior outstanding close-the-loop carries** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4). **Recommend batched close-out next session**.
  - **Brief-runner-v0 lessons NEW v2.61**: L33 + L34 + L35 + L36 — all four reified by cc-0008 v4→v5 cycle. **All four recommended for promotion to baseline candidate at next cycle.**
  - **PRV-1 cc-0008 first build delivered. cc-0009 (r.* schema + cadence-rule-generator EF + first backfill) UNBLOCKED.** `r` schema confirmed pre-registered in `k.schema_registry` (status='active'). cc-0009 brief decision flag (PRV-0 v2 §5.1).
  - **NEW Active P2 row v2.61**: cc-0009 brief authoring (PRV-1 next step).
  - **NEW Active P3 row v2.61**: Close-the-loop UPDATE batch (5 prior cc-NNNN D-01 rows — UNBLOCKED v2.61).
  - **Constraints respected this turn**: No EF deploys. No cron edits. No `r.*` schema work. No temp log tables. No Phase 0 scheduling. No M8 work. No DDL/DML beyond cc-0008 v5 apply + 2 close-the-loop UPDATEs to `m.chatgpt_review`. STANDING_THREE EFs untouched. T-MCP-02 +1; cumulative T-MCP-02 = 56; state-capture exceptions v2.61: **1**.
  - **PK explicit approval phrase received** for cc-0008 v5 apply: PK Lesson #62 type-(c) state-capture exception override 2026-05-09.
  - **Closure budget**: ~45 min total chat work this cycle. Trailing-14-day ~65h above 8.0h floor. ~2 P0+P1 open.
  - **Production mutations chat-side this turn (4-way sync close)**: 2 close-the-loop UPDATEs to `m.chatgpt_review`. Plus 4-way sync close = 4 file commits.
  - **Today/Next 5 promotion deferred to next session** per minimal-scope discipline.
  - **Deferred per PK explicit scope this turn**: memory `recent_updates` v2.55–v2.61 entries; 5 prior outstanding `m.chatgpt_review` close-the-loop UPDATEs (UNBLOCKED v2.61, batched close-out next session); dashboard PHASES update (**17th** carry); cc-0009 brief authoring; M8b brief authoring; 94-row un-publishable legacy draft cohort cleanup; Phase 0 scheduling; Publisher latent config risk follow-up; Platform Reconciliation View brief authoring (still rank 1).
  - **Carried**: Crazy Domains refund follow-up; morning-inbox-sweep-v1 brief amendment (P3); 4 P2 cron findings from v2.54; F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN, unchanged); v2.60 Brand Topic Notebook future ideation (queue behind item 1 cleared); M8b separate brief; 94-row un-publishable legacy draft cohort.
