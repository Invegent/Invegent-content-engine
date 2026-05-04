# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-04 laptop Sydney session-end (v2.34 — **F-AI-WORKER-PARSER-SKIP-BUG deployed (ai-worker v98→v99), F-AAP-007 v2 applied, F-PUB-009 applied; 2 of 3 D-01 reviews escalated with type-(c) signature, both overridden via state-capture exception with PK explicit approval; Lesson #62 type-(c) at 5+ vindications, ready for canonical promotion**). Closure budget: +0.5h this session, trailing-14-day ~18.5 → ~19.0h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S22)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.34 application**: 3 D-01 reviews fired this session (`ba234fce` ef_deploy clean; `e462597f` sql_destructive escalated overridden; `753930ad` sql_destructive escalated overridden). T-MCP-02 quota 21 → **24**.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~4 (T05 P1-urgent + 3 P1 fixes shipped pending V3-V5 confirmation; F-AI-WORKER-PARSER-SKIP-BUG, F-PUB-009, F-AAP-007 v2 all applied this session) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~19.0h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~0.5h** (laptop session: 3 applies — ai-worker v2.11.1 deploy + audit matrix view patch + m.fill_pending_slots patch).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-04 laptop Sydney session-end (v2.34).
> **This session: 3 P1 fixes shipped in ~30min of execution time after morning phone session pre-flight.** Two D-01 reviews escalated, both overridden via type-(c) state-capture exception with PK explicit approval; both fixes shipped clean.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **T05 Meta dev support contact** | **P1-urgent** | Unchanged from v2.29 | PK fills 2 placeholders and sends |
| 3 | **CFW LI fill cycle V3-V5 acid test** | **P1** | Next CFW LI slot at ~05-06 03:04 UTC simultaneously tests parser fix (skip-path) + F-PUB-009 (scheduled_for write). Pre-fix: 33% success rate on CFW LI image_quote. Post-fix: legitimate compliance skips should produce slot.status='skipped' + ai_job.output_payload.skipped=true. | Next session: query `m.ai_job WHERE updated_at >= '2026-05-06 03:00+00' AND client_id = '3eca32aa-...' AND platform='linkedin'`. Verify (a) succeeded with skipped or normal output, (b) `m.post_draft.scheduled_for = m.slot.scheduled_publish_at` for new fills. |
| 4 | **F-AAP-NEEDS-REVIEW-BACKLOG (P2)** | P2 | 28 drafts piled in needs_review; CFW IG 15 (oldest 11 days), Invegent IG 10, CFW FB 2, CFW LI 1 | Decide: ship a needs_review processor, change auto-approver thresholds, or trigger manual review session. |
| 5 | **F-PUB-009 7-day flow check** | P2 | `legacy_spread_mismatch_count` is a stock measure (47 across 9 streams currently). New fills will queue with correct timing per the patch; old queue rows drain at current cadence. | After ~50 newly-filled slots in next week, re-query `audit.v_brand_platform_audit_matrix` and confirm legacy_spread_mismatch_count trending down. |

**Demoted from prior Today/Next 5 in v2.33→v2.34 cycle:**
- **F-AI-WORKER-PARSER-SKIP-BUG** ✅ DEPLOYED v2.34 — ai-worker v98→v99 via Supabase MCP `deploy_edge_function`. D-01 review `ba234fce` clean (agree, medium risk, high confidence, no escalation). V1 ✅ version 99 ACTIVE; V2 ✅ partial (one ai_job at 09:00 UTC succeeded under v2.11.1, normal success path, no regression). V3-V5 pending CFW LI fill cycle (~17h).
- **F-AAP-007 fix v2 (Option B)** ✅ APPLIED v2.34 — ONE CASE branch in `audit.v_brand_platform_audit_matrix` split into two (`approved_not_queued_cap_blocked` verified-cap-breached + `approved_not_queued_genuine_gap` sibling). D-01 review `e462597f` ESCALATED (type-(c)); state-capture override with PK explicit approval. V1-V4 ✅ all green. Bonus: fix de-conflates publishing_disabled from cap_blocked for IG streams.
- **F-PUB-009 fix (improved Pattern 1)** ✅ APPLIED v2.34 — surgical edit to `m.fill_pending_slots` INSERT/UPSERT block (one less statement than brief's original Pattern 1 — uses existing UPSERT atomicity, no race window). D-01 review `753930ad` ESCALATED (type-(c)); state-capture override with PK explicit approval. V1+V2 ✅. V3-V5 pending next fill cycle when slots are pending.

**Demoted from prior Today/Next 5 in v2.32→v2.33 cycle:**
- B-AUDIT-CHECK5-DRIFT **RETIRED v2.33**
- B-PIPELINE-INCIDENT-REMEDIATION superseded by F-AI-WORKER-PARSER-SKIP-BUG + F-PUB-009 (both shipped v2.34)

**Demoted from prior Today/Next 5 in v2.31→v2.32 cycle:**
- C3 audit view rewrite ✅ DONE v2.31
- F-INVESTIGATE-DRAFT-NOT-FOUND ✅ DONE v2.31 (clarified v2.32)
- F-RUNBOOK-V2 ✅ DONE v2.31 (→ v2.1 patch v2.32)
- F-HISTORIC-DEAD-CLEANUP **RETIRED v2.32 as miscategorised**

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate | (per v2.30) | (per v2.30) |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.34 note**: 24 fires total (3 this session + 21 historical). Plan_review escalation rate now 9 of 10 (90%). sql_destructive escalation rate climbing — 2 of last 2 escalated with type-(c) signature this session. Strong T-MCP-06 + Lesson #62 type-(c) signal. |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at ~19.0h trailing-14-day — well above 8.0 floor.** |
| S19 | R01 Data Auditor closure effectiveness | (per v2.30) | (per v2.30) |
| S21 | Pipeline incident health | `SELECT * FROM audit.v_brand_platform_audit_matrix ORDER BY CASE likely_bottleneck WHEN 'ok_or_recently_active' THEN 99 ELSE 1 END, client_slug, platform;` | Watch for: classification shifts. v2.34 added new `approved_not_queued_genuine_gap` label. |
| S22 | Cron heartbeat health | `SELECT jobname, status, minutes_since_last, consecutive_misses FROM m.cron_health_status WHERE status != 'green';` | Empty result = all crons healthy. |
| **S23 NEW v2.34** | **F-PUB-009 forward-flow check** | `SELECT count(*) FROM m.post_draft d JOIN m.slot s ON s.filled_draft_id = d.post_draft_id WHERE d.created_at >= NOW() - INTERVAL '24 hours' AND d.scheduled_for IS NOT NULL` | Should be > 0 within 24h post-apply, growing toward majority of new slot-driven drafts having scheduled_for populated. |
| **S24 NEW v2.34** | **F-AI-WORKER-PARSER-SKIP-BUG forward verification** | `SELECT count(*) FROM m.ai_job WHERE updated_at >= NOW() - INTERVAL '24 hours' AND status='succeeded' AND output_payload->>'skipped' = 'true'` | Should be > 0 within 24h post-apply when CFW LI fill cycles fire. Validates parser fix lets compliance skips reach the existing skip handler. |

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.31.

**v2.34 status delta**: Three of the deferred structural fixes (F-AI-WORKER-PARSER-SKIP-BUG, F-AAP-007 v2, F-PUB-009) all shipped this session. Audit infrastructure now both deployed AND label-precision-corrected. Pipeline progressively un-blocking.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 24 of 5)

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | ✅ DONE | Closed | — |
| T-MCP-02 | ✅ EXCEEDED 24 of 5 | — | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17 |
| T-MCP-05 | ✅ DONE v2.29 | — | — |
| T-MCP-05-NEW | Close-the-loop UPDATE on `1bae5068-...` | P3 | PK confirm |
| T-MCP-05-NEW2 | Close-the-loop UPDATE on 3 review_ids | P3 | Combine in next batch closure (now 7 total: 4 carry-overs + 3 from v2.34) |
| T-MCP-06 | Investigate plan_review + sql_destructive escalation rates | P3 | **v2.34 strong signal**: sql_destructive at 2-of-2 escalated this session (both type-(c)). May indicate sql_destructive scope is intrinsically PK-decision-required, similar to plan_reviews. |
| T-MCP-08 | ✅ PROMOTED canonical v2.29 | — | — |
| T-MCP-09 | Lesson candidate: post-apply ACL verification | P3 | After 1-2 more instances |
| T-MCP-10 | Lesson candidate: state-snapshot age ≥ 4h re-verification | P3 | After 1-2 more instances |
| T-MCP-11 | Lesson candidate: pre-flight discipline includes verifying log/health table actually contains data | P3 | Bundle with T-MCP-12 for promotion |
| T-MCP-12 | Lesson candidate: query EVERY annotation column when verifying table contents | P3 | Bundle with T-MCP-11 for promotion |

---

## 🤖 Cowork automation (D182)

Unchanged from v2.30. Sunset review: 12 May 2026.

---

## 🟡 Active

Per v2.31 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix on CFW LI × image_quote | P1 | DEPLOYED v2.34; awaiting CFW LI fill cycle ~17h | chat → next session | Query `m.ai_job` after 2026-05-06 03:04 UTC for CFW LI rows with `output_payload->>'skipped' = 'true'` |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P1 | APPLIED v2.34; awaiting next fill cycle | chat → next session | Query `m.post_draft` newly-filled rows for `scheduled_for IS NOT NULL` matching slot.scheduled_publish_at |
| (others) | per v2.31 | — | — | — | per v2.31 |

---

## 💼 Personal businesses

*(none flagged — PK to confirm at next session start)*

---

## 📌 Backlog

**v2.34 changes**:

- **F-AI-WORKER-PARSER-SKIP-BUG, F-AAP-007 v2, F-PUB-009** — all shipped this session; only V3-V5 acid tests remain (logged as Active row + S23/S24 standing checks).

**v2.33 additions** (still active):

- **F-AAP-NEEDS-REVIEW-BACKLOG (P2)** — 28 drafts piled in `needs_review`. Top P2 next-up.
- **B-TOKEN-HEALTH-EMPTY (P3)** — `m.platform_token_health` empty for all clients.
- **F-CFW-LI-DUP-SLOTS (P3)** — 2 CFW LI failed slots both 2026-05-04 03:04. (Now part of the 6 historic exceeded_recovery_attempts cluster post-investigation.)
- **B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING** ✅ CLOSED v2.34 (bundled into v2.11.1 deploy via `AiParseError` + outer catch raw-response capture).

**Carried from v2.31**:

- **B-WORKER-LOG-GAP (P3)** — instrumentation gap.
- **B-AUDIT-FRAMEWORK-PROPOSAL (P3)** — 18 additional views from ChatGPT proposal v2 (deferred).
- **B-CRON-BLOAT (P3)** — `cron.job_run_details` ~260MB suspected bloat.
- **F-AAP-003 (P3)** — misleading metric in `m.vw_ops_pipeline_health`.
- **B-CRON-V3-ORPHAN (P3)** + **B-CRON-V3-ORPHAN-READERS (P3)**.
- **F-AAP-004/005/006 (P3-P4 dormant)**.
- **F-AAP-001 dead-join cleanup**.
- **B-AUDIT-CYCLE3**.
- **F-PUB-008** — NULL platform_post_id (P2).
- **B-INV-LinkedIn-PhantomPublishes** (P2).
- **B39** — Drain over-cap queues (P3, by design).
- **B-PP-FB-ORPHAN-PENDING-FILL (P3)** — PP Facebook 1 orphan + 1 pending_fill.
- **F-RECOVER-LOOP-001 (P3 demoted v2.33)** — recovery loop refactor; defence-in-depth, no longer urgent post F-AI-WORKER-PARSER-SKIP-BUG.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15)
- Lesson #51 (HONOURED v2.34 sixteenth — pre-flight Q6/Q7/PF6 all re-run at apply time, not just at brief-authoring time)
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication)
- **Lesson #62 type-(c) — REINFORCED v2.34 to 5+ VINDICATIONS** (3 from v2.32 + 2 today, both sql_destructive). Identical signature: verified_claims affirm every substantive fact; pushback is generic-risk speculation without specific consumer-break / data-corruption evidence; corrected_action restates the existing apply-path plan. **Ready for canonical promotion** with default-presumption framing: "type-(c) escalations carry a default presumption of generic-bias unless reviewer surfaces specific consumer-break, data-corruption, or regression evidence; state-capture exception applies after PK explicit approval; cost-of-waiting reasoning weighs proceed."
- G1 sync_state restructure (v2.23) — honoured through v2.34
- Lessons #40, #41, #42 promoted canonical (R01 calibration v2 v2.25)
- T-MCP-08 PROMOTED canonical v2.29
- T-MCP-09 lesson candidate: post-apply ACL verification (since v2.29)
- T-MCP-10 lesson candidate: state-snapshot age ≥ 4h re-verification (since v2.30)
- T-MCP-11 lesson candidate: pre-flight discipline includes verifying log/health tables actually contain data (since v2.31, reinforced v2.33)
- T-MCP-12 lesson candidate: query EVERY annotation column when verifying table contents (since v2.32, reinforced v2.33)
- **NEW lesson candidate (since v2.33, reinforced v2.34)**: when investigating cascading symptoms across multiple findings, drill into the source code of the worker producing the symptom — DB-only inspection missed F-AI-WORKER-PARSER-SKIP-BUG for 7+ days, EF source-read found it in one query. Reinforced in v2.34 apply phase: deploying the parser fix without first reading deployed source via `get_edge_function` would have produced a patch against a guessed-at version. Source-first rule continues to pay off. Promote to canonical after 1 more vindication.
- **NEW lesson candidate v2.34 — improved-Pattern-1**: when the brief's original fix shape involves a separate trailing UPDATE, check the existing function/view body for an existing block that can be edited surgically instead. F-PUB-009 brief's Pattern 1 was a separate UPDATE; source read showed an existing INSERT/UPSERT block where the patch could land in one statement. Cleaner, no race window, atomic. Pattern: read source, look for existing edit points, prefer surgical to additive. Promote to canonical after 1 more vindication.

---

## v2.34 honest limitations

- All v2.31-v2.33 limitations apply.
- **D-01 review escalations are becoming routine on sql_destructive proposals.** 2-of-2 this session. Need to assess whether (a) the bridge's escalation logic over-weights on partial verdicts, (b) sql_destructive scope is intrinsically PK-decision-required (parallel to plan_review's 90% rate), or (c) my proposals are systematically missing something the reviewer is correctly flagging. The verified_claims pattern argues for (a) or (b) — the reviewer agrees on substance but escalates anyway. T-MCP-06 expanded to cover sql_destructive + plan_review jointly.
- **V3-V5 verification windows for two of the three fixes are 17+ hours away.** Cannot fully close until next CFW LI fill cycle and next pending_fill cron tick respectively. Not a fix-quality concern; just a timing reality.
- **Lesson #62 type-(c) at 5+ vindications**, but I'm noticing the bridge's escalation message itself doesn't yet differentiate between type-(a) (genuine new evidence), type-(b) (verifiable-claim correction needed), and type-(c) (consistency-bias generic risk). Bridge-side classifier work could automate the type-(c) detection. Logged as future T-MCP enhancement.
- **Closure budget continues climbing well above floor** (~19.0h trailing 14-day). Risk: building automation while behind on closure is not a current concern, but rate continues high. Worth a session-start "closure breather" decision soon.

---

## Changelog

- v1.0–2.32: per previous changelog.
- v2.33 (2026-05-04 morning Sydney phone session): per previous changelog.
- **v2.34 (2026-05-04 laptop Sydney session-end, three applies):**
  - **F-AI-WORKER-PARSER-SKIP-BUG DEPLOYED**: ai-worker v2.11.0 → v2.11.1 via Supabase MCP `deploy_edge_function`. Three changes: callClaude parser checks skip before title/body, callOpenAI mirror, outer per-job catch persists rawResponse via new AiParseError class. D-01 review `ba234fce`: clean, no escalation. Version 98 → 99 ACTIVE. Closes B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING.
  - **F-AAP-007 v2 APPLIED**: ONE CASE branch split into two in `audit.v_brand_platform_audit_matrix` (cap-verified vs sibling genuine-gap label). Pre-flight Q6=6, Q7=0. D-01 review `e462597f` ESCALATED type-(c); state-capture override with PK approval. V1-V4 ✅. Bonus: de-conflates publishing_disabled from cap_blocked for IG streams.
  - **F-PUB-009 APPLIED**: improved-Pattern-1 surgical edit to `m.fill_pending_slots` INSERT/UPSERT block (cleaner than brief's original Pattern 1 — uses existing UPSERT atomicity). PF6 ✅ 145/145 pre-existing scheduled_for NULL. D-01 review `753930ad` ESCALATED type-(c); state-capture override with PK approval. V1+V2 ✅. V3-V5 pending next fill cycle.
  - **Lesson #62 type-(c) at 5+ vindications**: 2 escalations this session with identical signature (verified_claims affirm; pushback is generic-risk speculation; corrected_action restates plan). Ready for canonical promotion with default-presumption framing.
  - **NEW S23 + S24 standing checks** added for F-PUB-009 forward-flow + F-AI-WORKER-PARSER-SKIP-BUG forward verification.
  - **NEW lesson candidate**: improved-Pattern-1 — when brief's fix shape involves a trailing UPDATE, check existing source for surgical edit points instead.
  - **T-MCP-02 quota**: 21 → 24 (3 D-01 fires this session: 1 ef_deploy clean + 2 sql_destructive escalated overridden).
  - **Closure budget**: +0.5h this phase. Trailing-14d ~18.5 → ~19.0h. Above floor.
  - **Net P0+P1 open**: 7 → 4.
  - **3 reviews in close-the-loop pending batch** (`ba234fce`, `e462597f`, `753930ad`) added to v2.32 carry-over.
- v2.33 (2026-05-04 morning Sydney): per previous changelog.
- v2.32 (3 May Sunday late-night Sydney): per previous changelog.
- v2.31 and earlier: per prior changelog.
