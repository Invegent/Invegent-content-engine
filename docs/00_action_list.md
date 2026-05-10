# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-10 Sydney (**v2.62 — cc-0009 v1 AUTHORED (doc-only; PRV-1 second build planning).** Brief committed at commit `97b8d8442c4538b1af57bb9444d741bd5ac0463a`; landed file blob `2bf870497c3286f9ef6895d3aa0636e0aebd3e35` (85,308 B). 5-stage gated build plan: Stage A (DDL migration, chat) + Stage B (EF source/config, CC) + Stage C (EF deploy, CC) + Stage D (pg_cron schedule, chat) + Stage E (first backfill, chat). Each stage requires pre-flight, risk articulation, D-01, PK approval phrase, apply/deploy, verification, close-the-loop. Lineage from cc-0008 v5 explicit; L33+L34+L35+L36 reified in §1.6+§1.7+§3.5+§3.6. **Option B locked** for paused-IG suppression (`expected_status='suppressed'`) per PK direction. Cross-brief FK deferral for `r.expected_publication.matched_match_id` documented (cc-0010 ALTER TABLE re-adds; L38 candidate flagged). **Status: AUTHORED.** Documentation-complete and pending review and gated Stage A cycle. NOT applied. NOT approved. NOT production-ready. **NO production mutation this turn:** no `apply_migration`, no EF deploy, no cron enable, no RPC invocation, no D-01 fire (`ask_chatgpt_review` not called), no `m.chatgpt_review` row created or modified, no memory edit. T-MCP-02 unchanged at 56 cumulative; state-capture exceptions unchanged cumulative. 4-way sync close commits 4 documentation files only (this file + sync_state + per-session file + result file documenting AUTHORED state). Dashboard PHASES reconciliation **18th** consecutive carry. Per PK directive: cc-0009 v1 brief review is NEXT NATURAL WORK; cc-0009 Stage A apply gate is sequenced after review; 5-row close-the-loop batch remains queued (UNBLOCKED v2.61) pending PK direction. Previous (v2.61): cc-0008 v5 APPLIED + CLOSED — PRV-1 first build delivered. Previous (v2.60): Brand Topic Notebook future-ideation backlog addition.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump that touches production state goes through ChatGPT cross-check before deploy/commit. **v2.62 application**: 0 D-01 fires this cycle. v2.62 4-way sync close itself is doc-only and per protocol does not require a fire (cc-0009 v1 AUTHORED state is documentation, not production action).

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is approved target design. All stages CLOSED. **v2.62 application**: no drift fires this session.

**STANDING RULE (Lesson #62, v2.41 + v2.50 refinement)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override. **v2.62 application**: rule **NOT EXERCISED** this cycle (no D-01 fire; doc-only authoring close).

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline. **v2.62 application**: 0 fired writes; 4 documentation file commits only.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time**. cc-0009 v1 brief follows this in §1.10 (locks `5 16 * * *` AEST = 02:05 Sydney).

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery is now the default brief pattern for any CC dashboard/portal/web/script work. **cc-0009 v1 §1.x covers all 12 sub-checks across all 5 stages.**

**STANDING RULE (v2.50 — Acceptance integrity)**: Acceptance is not complete until the actual review artifact is received and reviewed. **v2.62 application**: cc-0009 v1 brief content authored locally and committed; landed file re-fetched via `get_file_contents` post-commit (blob `2bf87049`, 85,308 B confirmed).

**STANDING RULE (v2.55 — brief-runner-v0 baseline patterns from cc-0003 cycle)**: L1–L4 are baseline:
- **L1 HALT mechanism is load-bearing.**
- **L2 doc-only patch → re-execution loop.**
- **L3 result-file preservation.**
- **L4 pre-state baseline pattern is now required.**

**v2.56 ADDITION**: **L6 (cross-brief patch propagation when invariant fails) is now baseline.**

**v2.57 ADDITIONS:** L10–L18.

**v2.58 ADDITIONS:** L22–L25.

**v2.59 vindications and promotions:** L19+L20+L21 VINDICATED; L11+L16+L17+L18 vindicated again. L17 promotion to baseline.

**v2.61 ADDITIONS** (NEW from cc-0008 v4→v5 cycle):
- **L33** Event trigger pre-flight survey is mandatory for DDL briefs in `k.schema_registry`-registered schemas. Strong empirical evidence from rollback root cause.
- **L34** `k.fn_sync_registry` auto-registration is part of database architecture. Affects all PRV-1 build briefs.
- **L35** `INSERT ... ON CONFLICT DO UPDATE` is the defensive pattern for k.* registry rows. V6c verifies upgrade.
- **L36** `m.chatgpt_review.chatgpt_review_status_check` enum `{pending,completed,failed,escalated,resolved}`; close-the-loop UPDATEs map all positive terminals to `resolved`. Unblocks 5 prior outstanding close-the-loop carries.

**All four recommended for promotion to baseline candidate at next cycle.**

**v2.62 ADDITIONS** (NEW from cc-0009 v1 doc-only authoring; lessons not yet vindicated empirically):
- **L37 candidate** Multi-stage cc-NNNN brief authoring pattern: 5 stages with own D-01 + PK approval + close-the-loop each. cc-0009 is first multi-stage brief in PRV-1 series. Empirical vindication awaits Stage A apply.
- **L38 candidate** Cross-brief FK deferral pattern: when PRV design lock specifies an FK target that doesn't yet exist, declare column without REFERENCES in the introducing brief; ALTER TABLE in the brief that creates the target. cc-0009 §2.3 + the PRV-0 §3.3 deviation note are the reified pattern. Empirical vindication awaits cc-0010 ALTER TABLE.
- Both candidates flagged in `docs/briefs/cc-0009-r-schema-and-cadence-rule-generator.md` §12 Notes → Brief-runner-v0 watch items.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~2 (unchanged from v2.61) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~65h (v2.62 cc-0009 doc-only authoring + 4-way sync ~75 min chat work this session) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This v2.62 cc-0009 v1 doc-only authoring cycle: ~75 min total** (lineage + investigation + design intent ~20 min; §1 pre-flight specifications ~10 min; §2 DDL + §3 DML drafting ~15 min; §4–§6 EF + cron + invocation + V-checks ~15 min; §7–§12 risks + D-01 packets + rollback + result + stop + notes ~10 min; 4-way sync close ~5 min).

**State-capture exception count v2.62: 0** (doc-only authoring close; no D-01 fire).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-10 Sydney (v2.62).
> **v2.62 note:** cc-0009 v1 AUTHORED. Documentation-complete. Pending review + gated Stage A cycle. cc-0009 v1 brief review and Stage A apply gate now occupy ranks 1+2 of Today/Next 5. Platform Reconciliation View moves from rank 1 to rank 3. cc-0009 Stage A apply is the FIRST production mutation gate post-cc-0008 v5 close.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0009 v1 brief review** | **P1 (NEW v2.62; PRV-1 next sequenced step)** | v1 brief committed `97b8d844`; landed blob `2bf87049` (85,308 B). Read-through / redline by ChatGPT MCP or PK before any apply. | PK or ChatGPT reviews v1 brief; chat issues v2 patch if substantive items emerge. Stage A apply gate cannot start until review clean. |
| 2 | **cc-0009 Stage A apply gate** | **P1 (NEW v2.62)** | Sequenced after rank 1 review closes clean. First production mutation in cc-0009 lifecycle. | Final §1.1–§1.7 re-verify (~60s pre-apply) → NEW Stage-A D-01 fire → PK explicit approval phrase → `apply_migration cc_0009_r_schema_and_helpers` → V1–V8 verification → close-the-loop UPDATE. |
| 3 | **Platform Reconciliation View — BRIEF AUTHORING** | **P2 — demoted from rank 1 v2.62 (cc-0009 v1 takes rank 1+2)** | All three sequencing blockers cleared. v2.61 cc-0008 v5 APPLIED. Brief NOT YET AUTHORED. Can proceed in parallel with cc-0009 stages C–E if PK directs. | PK directs scheduling. Brief authoring (chat) when greenlit. |
| 4 | **Dashboard Architecture Review Phase 0 prerequisites** | P1 TOP | Unchanged. M-series effectively complete v2.59. cc-0008 v5 APPLIED v2.61. | PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. |
| 5 | **AI cost view** | P3 quick win | Unchanged. ~1h estimate. | Author `vw_ai_cost_monthly` view DDL on `m.ai_job` + add NOW dashboard tile. |
| 6 | **Personal businesses check-in** | P0 standing | Carry. | PK reports any time-sensitive items + Crazy Domains clean-up status. |

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (unchanged from v2.55)

All stages CLOSED. Cron jobid 80 + 81 active=true. No drift fires this cycle.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`. PRV-0 v2 design lock at commit `6e989517` is direct cc-0008 + cc-0009 input.

**v2.62 update:**
- ✅ S30 cleared v2.47.
- ✅ M5–M8 reconciliation effectively COMPLETE v2.59.
- ✅ PRV-1 first build delivered v2.61 (cc-0008 v5 APPLIED).
- 🔲 PRV-1 second build AUTHORED v2.62 (cc-0009 v1 brief committed; pending review + Stage A apply gate).
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override.

---

## 🟢 Tier 1 + M4 + M5 + M6 Phase A + M6 Phase B + M8a queue integrity & stability remediation — STATUS BLOCK

**v2.59 update — M-series effectively complete (preserved at v2.60/v2.61/v2.62):**

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

**Urgent pipeline-integrity block now EFFECTIVELY COMPLETE v2.59. v2.62 unchanged.**

---

## 🟢 Platform Reconciliation View — BRIEF CANDIDATE STATUS BLOCK (PROMOTED to rank 1 v2.59; demoted to rank 3 v2.62)

**Status v2.62:** demoted from rank 1 to rank 3 of Today/Next 5 because cc-0009 v1 AUTHORED is the next sequenced PRV-1 step. **Still PROMOTED to next major planning/work item after cc-0009 lifecycle.**

**Classification:** pipeline observability / reconciliation. **NOT cosmetic dashboard work** (PK explicit framing 2026-05-09).

**Title:** Platform Reconciliation View — by day / client / platform.

**v2.62 cross-reference:** cc-0009 v1 brief (commit `97b8d844`, blob `2bf87049`) AUTHORED v2.62. cc-0009 stages A–E will produce `r.expected_publication` (Stage E first backfill ~140 rows) which is the primary input to the Platform Reconciliation View matcher (cc-0010+) and matrix view (cc-0011). The Platform Reconciliation View brief authoring may proceed in parallel with cc-0009 stages C–E once Stage A+B are clean, if PK directs.

**Required scope (PK-directed 2026-05-09):**
- by day / client / platform reconciliation
- ICE expected cadence (`c.client_cadence_rule` SEEDED v2.61; `r.expected_publication` populated v2.62 Stage E if cc-0009 closes)
- ICE generated assets / drafts (`m.post_draft`)
- ICE queue state (`m.post_publish_queue`)
- ICE publisher result / logs
- platform-observed post evidence
- mismatch classification: `missing`, `late`, `duplicate`, `extra`, `wrong-content`, `stale`, `OK`
- evidence links / platform IDs where available
- manual override field for platforms where API ingestion is not yet available

**Seed manual observations (PK direct, 2026-05-09 Sydney; preserved across v2.58–v2.62 closes):**

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

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (NEW v2.62)

**Status v2.62:** v1 brief AUTHORED. Documentation-complete. Pending review + gated Stage A cycle.

**Brief reference:**
- Path: `docs/briefs/cc-0009-r-schema-and-cadence-rule-generator.md`
- Authoring commit: `97b8d8442c4538b1af57bb9444d741bd5ac0463a`
- Landed blob: `2bf870497c3286f9ef6895d3aa0636e0aebd3e35`
- Size: 85,308 bytes
- Authority: PRV-0 design lock v2 commit `6e989517ceaf600e1373f7f319ab5b7d5c2c7147` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7`
- Source design sections: PRV-0 v2 §3.1 + §3.3 + §3.8 + §3.12 + §4.1 + §4.2 + §5.1 + §8.2 + §11.4
- Lineage: cc-0008 v5 brief commit `d4cd3b08...` blob `2575f0bb` (67,494 B). L33+L34+L35+L36 reified verbatim.

**Locked design decisions (v2.62):**

1. **Option B for paused-IG suppression** (PRV-0 v2 §5.1 v2 amendment) — generator emits `r.expected_publication(expected_status='suppressed', suppression_reason='publish_profile_paused: <paused_reason>')` for paused (client × platform). Auditability + drift-checker compatibility + resumption transparency rationale; trivial storage cost. Locked at v2.62 brief authoring.
2. **Cross-brief FK deferral** (PRV-0 §3.3 deviation; cc-0009 §2.3) — `r.expected_publication.matched_match_id` declared without REFERENCES in cc-0009; cc-0010 ALTER TABLE re-adds the FK after `r.reconciliation_match` is created.
3. **Default cron schedule** `5 16 * * *` AEST = 02:05 Sydney (locked at Stage D D-01 per §1.10 collision-avoidance survey).

**5-stage gated build plan:**

| Stage | Action | Actor | Apply method | Gate sequence |
|---|---|---|---|---|
| **A** | DDL: CREATE SCHEMA r + grants + 2 tables (`r.reconciliation_run`, `r.expected_publication`) + 2 helpers (`r.normalise_text`, `r.to_sydney_local_date`) + k.* registry UPSERTs | chat | `apply_migration cc_0009_r_schema_and_helpers` | §1.1–§1.7 pre-flight → NEW Stage-A D-01 fire → PK approval phrase → apply → V1–V8 PASS → close-the-loop UPDATE on `m.chatgpt_review` |
| **B** | EF source: `supabase/functions/cadence-rule-generator/index.ts` + `supabase/config.toml` amendment | CC | git commit + push to `main` | §1.8–§1.9 pre-flight → NEW Stage-B D-01 fire (chat reviews CC diff) → PK approval phrase → close-the-loop UPDATE |
| **C** | EF deploy: `supabase functions deploy cadence-rule-generator --no-verify-jwt` | CC (PowerShell from `C:\Users\parve\Invegent-content-engine`) | CLI deploy | NEW Stage-C D-01 fire → PK approval phrase → deploy → V8 verification (`get_edge_function` + manual probe) → close-the-loop UPDATE |
| **D** | pg_cron schedule: `cron.schedule('cadence_rule_generator_daily', '5 16 * * *', ...)` calling deployed EF via `net.http_post` with `timeout_milliseconds := 30000` | chat | `apply_migration cc_0009_pg_cron_cadence_generator` | §1.10–§1.11 pre-flight → NEW Stage-D D-01 fire → PK approval phrase → apply → V9 PASS → close-the-loop UPDATE |
| **E** | First on-demand backfill invocation: `select net.http_post(...)` with `horizon_days=7 + backfill_days=7` | chat | `execute_sql` (RPC-style net.http_post, NOT DDL) | §1.12 pre-flight → NEW Stage-E D-01 fire → PK approval phrase → invoke → V10–V12 PASS → close-the-loop UPDATE |

**Each stage requires:**
1. Pre-flight §1.x re-verify within ~60s of apply.
2. Risk articulation per cc-0009 §7.
3. NEW D-01 fire (`ask_chatgpt_review`) per cc-0009 §8.
4. PK explicit approval phrase.
5. Apply / deploy / invoke (one production action per stage).
6. Verification (V-checks subset per stage per cc-0009 §6).
7. Close-the-loop UPDATE on `m.chatgpt_review` (status='resolved' per L36).

**No stage may bypass its gate sequence.** No stage may proceed before the prior stage closes clean. PK can revoke approval at any stage's D-01 without compromising prior stages.

**Total expected production actions across cc-0009 lifecycle:**
- 2 `apply_migration` calls (Stage A + Stage D).
- 1 EF deploy (Stage C, CC).
- 1 EF invocation via `net.http_post` (Stage E).
- 5 D-01 fires (one per stage).
- 5 close-the-loop UPDATEs to `m.chatgpt_review`.
- 1 result file commit (composite, all 5 stages).
- 1 4-way sync close commit at FINAL stage.

**Standing rule violations forbidden across all cc-0009 stages:**
- No `execute_sql` for DDL.
- No plain `INSERT INTO k.table_registry` or `INSERT INTO k.column_registry` (L35 — ON CONFLICT DO UPDATE only).
- No EF deploy by chat (Stage C is CC-only per memory standing rule).
- No DDL deviation from PRV-0 v2 §3.1 / §3.3 / §3.8 / §4.1 / §4.2 / §5.1 unless §1 pre-flight surfaces a genuine blocker.
- No write to `c.*`, `m.*`, `f.*`, `t.*`, `a.*` schemas anywhere in cc-0009.
- No `r.*` work beyond cc-0009 scope (other r.* tables / EFs are cc-0010 / cc-0011 / PRV-2/3/4).
- No M8 work, no Phase 0 scheduling, no temp log tables.
- No skip of inter-stage gate.

**Open items (NOT for resolution this turn):**
- Stage D `app.settings.cron_secret` vs vault-lookup pattern: locked at Stage D D-01 fire per §1.10 actual existing-cron-pattern survey.
- Stage B EF auth pattern (x-cron-secret vs Authorization Bearer JWT): locked at Stage B D-01 review of CC's diff.
- Stage E backfill row math has weekday-boundary tolerance ±10 documented in V10a Pass criteria.

**Carry to next session:** rank 1 (cc-0009 v1 brief review) + rank 2 (cc-0009 Stage A apply gate). Possible parallel work item: 5-row close-the-loop UPDATE batch (separately) and Platform Reconciliation View brief authoring (rank 3) if PK directs.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.54.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.62 application**: 0 D-01 fires this cycle (doc-only authoring close). Cumulative T-MCP-02 unchanged at 56. Cumulative T-MCP-08 unchanged at 2. State-capture exceptions v2.62: **0**.

**Close-the-loop UPDATEs to `m.chatgpt_review`:** v2.62 adds 0. **5 prior cc-NNNN reviews still pending close-the-loop** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) — UNBLOCKED v2.61 by L36 enum discovery; recommend batched close-out next session via single `execute_sql` with CASE expression. Carry unchanged from v2.61.

---

## 🤖 Cowork automation (D182)

**v2.62 status (carry from v2.54–v2.61):** `docs/briefs/morning-inbox-sweep-v1.md` committed status=draft per PK hold. NOT scheduled in Cowork until PK amends.

**Existing Cowork status:** Weekly reconciliation Mon 7am AEST + ICE Nightly Health Check daily 02:00 AEST.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0009 v1 brief review** | read-through / redline before Stage A apply gate | **P1 (NEW v2.62; rank 1)** | AUTHORED commit `97b8d844`; landed blob `2bf87049` (85,308 B). Documentation-complete; pending review. NOT applied. NOT approved. | PK / ChatGPT MCP | PK or ChatGPT MCP reviews v1 brief; chat issues v2 patch if substantive items emerge; clean review unblocks Stage A apply gate. |
| **cc-0009 Stage A apply gate** | DDL migration (CREATE SCHEMA r + 2 tables + 2 helpers + k.* UPSERTs) | **P1 (NEW v2.62; rank 2)** | SEQUENCED post rank 1 review. Pre-flight §1.1–§1.7 specified in brief; not yet re-verified → ≥1 D-01 fire required → PK approval phrase required → V1–V8 verification required → close-the-loop required. | chat | When rank 1 closes clean: §1 final re-verify → NEW Stage-A D-01 fire → PK approval phrase → `apply_migration cc_0009_r_schema_and_helpers` → V1–V8 → close-the-loop UPDATE on `m.chatgpt_review`. |
| **cc-0009 Stage B+C+D+E apply gates** | EF source/config; EF deploy; pg_cron schedule; first backfill | **P1 (NEW v2.62; sequenced)** | All 4 stages each require own D-01 + PK approval + V-checks + close-the-loop. Cannot start until Stage A closes clean. CC owns Stages B+C; chat owns Stages D+E. | mixed | Each stage has its own gate cycle per cc-0009 §6 V-checks + §8 D-01 packets. |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface; pipeline observability | **P2 — demoted from rank 1 to rank 3 v2.62 (cc-0009 v1 occupies ranks 1+2)** | Sequencing blockers all cleared. Brief NOT YET AUTHORED. Can proceed in parallel with cc-0009 stages C–E once Stage A+B are clean, if PK directs. | PK → chat | Brief authoring when PK greenlights. Possibly parallel with cc-0009 stages C–E. |
| **Close-the-loop UPDATE batch (5 prior cc-NNNN D-01 rows — UNBLOCKED v2.61, still pending v2.62)** | Map cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4 D-01 rows in `m.chatgpt_review` to `status='resolved'` with apply-outcome captured in `action_taken` + `resolved_by` text | P3 (carry from v2.61) | UNBLOCKED by L36 enum discovery. All 5 rows currently `status='escalated'`. Batch UPDATE in single `execute_sql` call. ~10 min when scheduled. | chat → next session OR between cc-0009 stages | Single execute_sql with CASE expression. Already empirically tested at v2.61. |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults | P1 TOP (unchanged) | M-series effectively complete v2.59. cc-0008 v5 APPLIED v2.61. cc-0009 v1 AUTHORED v2.62. 7 default-blockers still pending PK confirm/override. | PK | Confirm defaults via cc-0001. |
| **AI cost view** (carry from v2.49) | `vw_ai_cost_monthly` view + dashboard tile | P3 → Top 5 (carry) | Backlog | chat → future session | Author view DDL + add NOW dashboard tile. ~1h. |
| **Publisher latent config risk follow-up** | Doc-only patch adding `[functions.publisher] verify_jwt = false` | P3 (carry from v2.58) | OPEN. | chat → future session | Single-file commit to `supabase/config.toml`. NO deploy required. ~5 min. |
| **M8b separate brief authoring** | Function rename + COMMENT after manual caller remediation | P3 (carry from v2.59) | NOT YET AUTHORED. Sequencing gate: BOTH manual callers must first be remediated. | PK → chat | When PK directs. **Not blocking new work.** |
| **94-row un-publishable legacy draft cohort cleanup** | Drafts: `pd.slot_id IS NULL AND pd.scheduled_for IS NULL AND pd.created_by='seed_and_enqueue' AND pd.approval_status IN ('approved','scheduled')` | P3 (carry from v2.58) | LOGGED. Currently 94 rows. | PK → chat → future session | If PK directs, separate cc-NNNN brief. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** (carry, security) | Cron jobid 58 has secret hardcoded inline | P2 (security) | OPEN — unchanged v2.62. cc-0009 Stage B + D will design AROUND this lesson by using x-cron-secret env-var pattern (not inline). The finding itself is NOT remediated by cc-0009. | chat → future session (PK approval required) | PK to authorise secret rotation for cron jobid 58 specifically. |
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
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45 → v2.62 (**18th deferral**) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |
| **F-CRON-COMPLIANCE-MONITOR-STALE** (carry) | cron jobid 31 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Decide. |
| **F-CRON-INGEST-STALE** (carry) | cron jobid 1 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PIPELINE-AI-SUMMARY-STALE** (carry) | cron jobid 30 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PIPELINE-DOCTOR-STALE** (carry) | cron jobids 29 + 39 call deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **Music library activation checklist** (carry) | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK ACTION | PK | PK to action when ready. |
| **Emergency redeploy governance question** (carry) | Should bounded production-restoration require expedited D-01? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules; chat documents. **v2.62 note:** cc-0008 v5 cycle (apply rollback recovery via super-patch + new D-01 fire) demonstrated standard D-01 protocol can handle even rollback recovery without expediting. cc-0009 multi-stage gating extends this empirical evidence. |

**Closed v2.62:** *(none — v2.62 is doc-only authoring close. cc-0009 v1 is AUTHORED, not applied. No production action taken.)*

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

**v2.62 carry (unchanged from v2.55–v2.61):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK called CD on 2026-05-08. Remaining clean-up still PK to action manually:
  1. Cancel Website Builder auto-renewal (saves ~$251/yr ongoing)
  2. Disable Premium DNS auto-renewal (saves $26/yr; move DNS to Cloudflare — free)
  3. Disable Domain Guard on .com auto-renewal (saves $9/yr)
  4. Before Nov 2026: transfer invegent.com to Cloudflare Registrar (~A$15/yr); transfer invegent.com.au to VentraIP or similar (~A$25–35/yr).
  5. Decline the $521/3yr renewal quote from CD.

  **Total annual saving once cleaned up: ~A$286/yr ongoing. Three-year saving: ~A$860.**

  Not chat scope — PK actions manually. Re-check status next session.

*(no other items flagged at v2.62 close — standing P0 to ask at next session start.)*

---

## 🌱 Future ideation / content-pipeline expansion (NOT current pipeline-integrity work)

> **Classification:** Forward-looking ideation. Queue behind: (1) cc-0009 PRV-1 second build (currently AUTHORED v2.62, lifecycle pending), (2) Platform Reconciliation build, (3) AI Operating System Improvements / project skills. NOT pipeline-integrity work.
> **Status of section v2.62:** unchanged from v2.61. cc-0008 / PRV-1 first build CLOSED at v2.61; cc-0009 / PRV-1 second build AUTHORED at v2.62. Remaining queue: cc-0009 lifecycle (Stages A–E) + Platform Reconciliation build + AI OS Improvements.

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
1. cc-0009 / PRV-1 second build (currently AUTHORED v2.62; lifecycle Stages A–E pending).
2. Platform Reconciliation build (Active table rank 3, demoted from rank 1 v2.62).
3. AI Operating System Improvements / project skills.

**Classification:** Future content-pipeline expansion, not current pipeline-integrity work.

**Open questions (deferred to brief-authoring time):**
- Reliable export path from NotebookLM (transcript text, audio file, source list)?
- Per-brand notebook count: one per brand, or one per topic-thread per brand?
- Source curation responsibility: PK manual vs ICE-ingested feed?
- Review gate before ICE generates publishable derivatives?
- Long-form podcast scripts: separate output channel, or downstream of Audio Overview?
- Storage / retention?
- Mismatch with cc-0008 cadence model: cadence-side intent (`c.client_cadence_rule` SEEDED v2.61; `r.expected_publication` populated v2.62 Stage E if cc-0009 closes) vs ideation-driven episodic cadence — how do they reconcile?

**Not actionable until upstream blockers clear.** Logged for forward visibility only.

---

## 📌 Backlog

**v2.62 changes**:

- **NEW v2.62 ACTIVE ROW**: cc-0009 v1 brief review (P1, rank 1 of Today/Next 5) — read-through / redline before Stage A apply gate. Documentation-complete; pending review.
- **NEW v2.62 ACTIVE ROW**: cc-0009 Stage A apply gate (P1, rank 2 of Today/Next 5) — sequenced post review close clean.
- **NEW v2.62 ACTIVE ROW**: cc-0009 Stage B+C+D+E apply gates (P1, sequenced) — all 4 stages each require own D-01 + PK approval + V-checks + close-the-loop. CC owns Stages B+C; chat owns Stages D+E.
- **STATE CHANGE v2.62**: Platform Reconciliation View brief authoring — demoted from rank 1 to rank 3 of Today/Next 5 (cc-0009 v1 occupies ranks 1+2). Still PROMOTED to next major work item after cc-0009 lifecycle. Can proceed in parallel with cc-0009 stages C–E once Stage A+B clean.
- **NEW v2.62 LESSON CANDIDATES L37+L38**: L37 (multi-stage cc-NNNN brief authoring pattern); L38 (cross-brief FK deferral pattern). Both reified in cc-0009 v1 brief; awaiting Stage A apply / cc-0010 ALTER TABLE for empirical vindication respectively.
- **STATE CHANGE v2.62**: cc-0009 PRV-1 Second Build STATUS BLOCK added to action_list.
- **STATE CHANGE v2.62**: Future ideation block (Brand Topic Notebook) — queue updated: cc-0009 / PRV-1 second build (AUTHORED) is queue-behind item 1 (in lifecycle); Platform Reconciliation build is item 2; AI OS Improvements is item 3.
- **CARRIED v2.62**: Dashboard roadmap PHASES — **18th** consecutive deferral (was 17th in v2.61).
- **CARRIED v2.62**: 4× v2.54 P2 cron findings.
- **CARRIED v2.62**: F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN unchanged) — cc-0009 designs around lesson; finding itself not remediated by cc-0009.
- **CARRIED v2.62**: Publisher latent config risk follow-up (P3 quick win, doc-only patch, ~5 min).
- **CARRIED v2.62**: 5-row close-the-loop UPDATE batch (P3, UNBLOCKED v2.61, still pending) — recommend batching between cc-0009 stages or at next dedicated session.
- **CARRIED v2.62**: M8b separate brief NOT YET AUTHORED.
- **CARRIED v2.62**: 94-row un-publishable legacy draft cohort cleanup.
- **CARRIED v2.62**: All v2.61 carries unchanged otherwise. M8b + 94-row cohort remain Active P3 rows.

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
- **CARRIED v2.61**: Publisher latent config risk follow-up (P3 quick win, ~5 min).
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

- **Lesson #61** (P1–P5 must be empirically verified, not theoretically assumed) — reinforced again by cc-0009 v1 brief authoring (§1.x pre-flight specifications enumerate empirical re-verification of every assumption pre-apply). **Promotion to canonical recommended (now reinforced 6 times: cc-0003 v2, cc-0004, cc-0006, cc-0005 v4, cc-0008 v5, cc-0009 v1 brief).**
- **Lesson #62 v2.50 refinement** — NOT exercised this turn (no D-01 fire).
- **L17 in-place patching pattern** — vindicated third time v2.59.
- **L11, L16, L18 vindicated again** — strong evidence; promotion next cycle.
- **L19, L20, L21 (v2.58 candidates)** — VINDICATED v2.59. Promotion to baseline candidates.

**v2.60 NEW lesson candidate (L32)**: future-ideation backlog quarantine pattern.

**v2.61 NEW lesson candidates (L33–L36)** — all four reified by cc-0008 v4→v5 cycle:

- **L33** Event trigger pre-flight survey is mandatory for DDL briefs in `k.schema_registry`-registered schemas (a/c/f/k/m/r/t). Strong empirical evidence from rollback root cause. **Recommended for promotion to baseline candidate at next cycle.** Reified across all PRV-1 build briefs (cc-0009 §1.6 — reified verbatim from cc-0008 v5 §1.12).
- **L34** `k.fn_sync_registry` auto-registration is part of database architecture, not edge case. **Reified in cc-0009 §1.7 + §3.1 NOTE on trigger interaction.**
- **L35** `INSERT ... ON CONFLICT DO UPDATE` is the defensive pattern for k.* registry rows. **Reified in cc-0009 §3.5 + §3.6 verbatim from cc-0008 v5 §3.3 + §3.4.**
- **L36** `m.chatgpt_review.chatgpt_review_status_check` CHECK enum is `{pending, completed, failed, escalated, resolved}`. **Reified in cc-0009 §8 (5 close-the-loop UPDATEs map to status='resolved').**

**v2.62 NEW lesson candidates (L37–L38)** — reified by cc-0009 v1 brief authoring; awaiting empirical vindication:

- **L37 candidate** Multi-stage cc-NNNN brief authoring pattern: 5 stages with own D-01 + PK approval + close-the-loop each. cc-0009 is first multi-stage brief in PRV-1 series. **Empirical vindication awaits Stage A apply.** Pattern refines L17 (in-place patching) for cases where the apply unit cannot be a single transaction (cross-actor / cross-system stages).
- **L38 candidate** Cross-brief FK deferral pattern: when PRV design lock specifies an FK target that doesn't yet exist, declare column without REFERENCES in the introducing brief; ALTER TABLE in the brief that creates the target. cc-0009 §2.3 + the PRV-0 §3.3 deviation note are the reified pattern. **Empirical vindication awaits cc-0010 ALTER TABLE.** Pattern enables PRV-1 staged build sequence (cc-0008 → cc-0009 → cc-0010 → cc-0011) without requiring any single brief to create all dependent tables.

- **v2.61 candidate cc-0008-cycle pattern**: "apply rollback → root cause investigation → v5 trigger-aware super-patch → new D-01 fire → apply success" cycle is durable.
- **v2.62 candidate cc-0009-cycle pattern**: "multi-stage brief authoring → doc-only commit → review gate → staged apply with per-stage gate cycles" pattern. cc-0009 v1 is first multi-stage brief in PRV-1 series. Awaiting Stage A apply for empirical vindication.

---

## v2.62 honest limitations

- All v2.31–v2.61 limitations apply.
- **cc-0009 v1 AUTHORED at v2.62.** Doc-only commit. NOT applied. 5 stages still ungated. Each stage (A–E) requires its own D-01 fire + PK explicit approval phrase + V-checks subset + close-the-loop UPDATE on `m.chatgpt_review`.
- **No production mutation occurred this turn.** No `apply_migration`. No EF deploy. No cron enable. No RPC invocation. No D-01 fire (`ask_chatgpt_review` not called). No `m.chatgpt_review` row created or modified. No memory edit. 4 documentation file commits only (sync_state + this file + per-session file + result file).
- **5 prior outstanding `m.chatgpt_review` close-the-loop UPDATEs still UNBLOCKED at v2.61, still pending v2.62** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) — L36 enum discovery from v2.61 unchanged. Recommend batched close-out next session OR between cc-0009 stages.
- **L33 + L34 + L35 + L36 reified verbatim in cc-0009 v1 brief.** All future PRV-1 build briefs (cc-0010 / cc-0011) will reify them as well.
- **L37 + L38 candidates flagged** in cc-0009 v1 brief §12 Notes; awaiting empirical vindication.
- **Memory at 30-edit cap pre-session** (carry from v2.61). v2.62 does NOT update memory directly. L36 specifically still warrants memory rule update (narrow "execute_sql is read-only on c/f/m/t for DML" rule to exclude `m.chatgpt_review`).
- **Dashboard roadmap PHASES still stale** — **18th** consecutive deferral.
- **Sync state file size**: ~26KB at v2.62 close (was ~24KB at v2.61). Modest growth due to cc-0009 v1 inline summary. Archive sweep **OVERDUE** since the 16KB threshold was crossed at v2.54.
- **Today/Next 5 promotion completed at v2.62**: cc-0009 v1 brief review = rank 1; cc-0009 Stage A apply gate = rank 2; Platform Reconciliation View brief authoring demoted from rank 1 to rank 3.
- **Per-session file**: `docs/runtime/sessions/2026-05-10-cc-0009-authored.md` (NEW, this 4-way sync).
- **Result file**: `docs/briefs/results/cc-0009-r-schema-and-cadence-rule-generator.md` (NEW, this 4-way sync; documents AUTHORED state, NOT applied state).
- **Acceptance integrity adherence (v2.50)**: cc-0009 v1 brief commit `97b8d844` re-fetched via `Invegent GitHub:get_file_contents` post-commit; landed blob `2bf87049` (85,308 B) confirmed.
- **Per-session file split**: cc-0009 v1 AUTHORED inline summary preserved in v2.62 sync_state; cc-0008 v5 inline summary kept (v2.61) per 2-inline pattern; cc-0005 v4 inline summary drops out (still in session index table). 2-inline pattern maintained.

## v2.61 honest limitations

- All v2.31–v2.60 limitations apply.
- **cc-0008 v5 APPLIED + CLOSED at v2.61.** First cc-NNNN cycle in series to demonstrate end-to-end recovery from atomic apply rollback. v4 rolled back at `uq_schema_table` due to event-trigger collision; v5 trigger-aware super-patch authored + new D-01 fire + apply success in same session. V1–V7 all PASS. Result file committed in this 4-way sync.
- **5 prior outstanding `m.chatgpt_review` close-the-loop UPDATEs UNBLOCKED at v2.61** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 + cc-0005 v4) — L36 enum discovery reveals all 5 carries map to `status='resolved'`. Batch close-out via single `execute_sql` with CASE expression. ~10 min when scheduled. Carry as P3 backlog (Active table row) for next session.
- **2 close-the-loop UPDATEs APPLIED v2.61** for cc-0008 itself (v5 row `cd35b93b-...` resolved as applied; v4 row `5c5e8f05-...` resolved as superseded). Empirical proof that `execute_sql` DML on `m.chatgpt_review` works once CHECK constraint satisfied.
- **L33 + L34 + L35 + L36 reified.** All future PRV-1 build briefs (cc-0009 / cc-0010 / cc-0011) MUST include §1.12 (`pg_event_trigger` survey) + §1.13 (`k.*` unique constraints + column defaults + schema_registry) pre-flight + ON CONFLICT pattern for k.* UPSERTs.
- **PK Lesson #62 type-(c) state-capture exception override applied 2026-05-09** for cc-0008 v5 D-01 `cd35b93b-...`. Generic-future-uncertainty pushback shape matched v4 fire (also Lesson #62 type-(c)). State-capture exception count v2.61: **1**.

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
  - **cc-0008 v5 APPLIED and CLOSED** — `c.client_cadence_rule` table created per PRV-0 v2 §3.2 + 14-row seed (12 active publish_profile + 2 paused-IG cadence-preserved per PRV-0 v2 §11.4) + 1 `k.table_registry` UPSERT + 19 `k.column_registry` UPSERTs in single `apply_migration` (`cc_0008_client_cadence_rule`). All values trigger-aware via `INSERT ... ON CONFLICT DO UPDATE` (Path B per PK directive). v5 commit `d4cd3b088c98b37667c85382a52b024ef3636b2d` blob `2575f0bb9c3d1a21035b729095eb126465dc7f9e` (67,494 B landed). Result file commit (this 4-way sync).
  - **v4 apply attempt 2026-05-09 ~11:55 UTC FAILED at `uq_schema_table`** due to event-trigger collision; auto-rolled back atomically; **no production state changed**. v4 D-01 row `5c5e8f05-...` SUPERSEDED.
  - **v5 supersession via trigger-aware ON CONFLICT pattern**.
  - **NEW v5 D-01 fire**, PK Lesson #62 type-(c) state-capture exception override applied 2026-05-09.
  - **V1–V7 all PASS post-apply.**
  - **TWO `m.chatgpt_review` close-the-loop UPDATEs APPLIED v2.61.**
  - **L36 enum discovery**: UNBLOCKS 5 prior outstanding close-the-loop carries.
  - **Brief-runner-v0 lessons NEW v2.61**: L33 + L34 + L35 + L36.
  - **PRV-1 cc-0008 first build delivered. cc-0009 UNBLOCKED.**
  - **NEW Active P2 row v2.61**: cc-0009 brief authoring (PRV-1 next step).
  - **NEW Active P3 row v2.61**: Close-the-loop UPDATE batch.
- **v2.62 (2026-05-10 Sydney, cc-0009 v1 AUTHORED — PRV-1 second build planning, doc-only):**
  - **cc-0009 v1 brief AUTHORED** — 5-stage gated build plan committed to `docs/briefs/cc-0009-r-schema-and-cadence-rule-generator.md` at commit `97b8d8442c4538b1af57bb9444d741bd5ac0463a` blob `2bf870497c3286f9ef6895d3aa0636e0aebd3e35` (85,308 B landed). Authority: PRV-0 v2 design lock commit `6e989517` blob `3b5f382096abfa7ac5e0aff4bc4bdd327e95d6f7`. Lineage: cc-0008 v5 (commit `d4cd3b08` blob `2575f0bb` 67,494 B). L33+L34+L35+L36 reified in §1.6+§1.7+§3.5+§3.6.
  - **Status: AUTHORED.** Documentation-complete. Pending review and gated Stage A cycle. NOT applied. NOT approved. NOT production-ready.
  - **Locked design decisions:** (1) Option B for paused-IG suppression (`expected_status='suppressed'` + `suppression_reason='publish_profile_paused: <paused_reason>'`) per PK direction — auditability + drift-checker compatibility + resumption transparency rationale; (2) Cross-brief FK deferral for `r.expected_publication.matched_match_id` per cc-0009 §2.3 (PRV-0 §3.3 deviation; cc-0010 ALTER TABLE re-adds; L38 candidate); (3) Default cron schedule `5 16 * * *` AEST = 02:05 Sydney (locked at Stage D D-01 per §1.10 collision-avoidance survey).
  - **5-stage gated build plan:** Stage A (DDL migration, chat) + Stage B (EF source/config, CC) + Stage C (EF deploy, CC) + Stage D (pg_cron schedule, chat) + Stage E (first backfill, chat). Each stage requires pre-flight + risk articulation + D-01 fire + PK approval phrase + apply/deploy + verification + close-the-loop UPDATE.
  - **NEW lesson candidates v2.62**: L37 (multi-stage cc-NNNN brief authoring pattern) + L38 (cross-brief FK deferral pattern). Both reified in cc-0009 v1 brief; awaiting Stage A apply / cc-0010 ALTER TABLE for empirical vindication respectively.
  - **NO production mutation this turn.** No `apply_migration`. No EF deploy. No cron enable. No RPC invocation. No D-01 fire (`ask_chatgpt_review` not called). No `m.chatgpt_review` row created or modified. No memory edit. 4 documentation file commits only.
  - **4-way sync close documents only:** sync_state pointer index update + this file version bump (v2.62) + per-session file (`docs/runtime/sessions/2026-05-10-cc-0009-authored.md`, NEW) + result file (`docs/briefs/results/cc-0009-r-schema-and-cadence-rule-generator.md`, NEW; documents AUTHORED state — NOT an applied-state result file).
  - **Today/Next 5 promotion**: cc-0009 v1 brief review = rank 1 (NEW); cc-0009 Stage A apply gate = rank 2 (NEW); Platform Reconciliation View brief authoring demoted from rank 1 to rank 3.
  - **NEW Active rows v2.62**: cc-0009 v1 brief review (P1, rank 1); cc-0009 Stage A apply gate (P1, rank 2); cc-0009 Stage B+C+D+E apply gates (P1, sequenced).
  - **STATE CHANGE v2.62**: cc-0009 PRV-1 Second Build STATUS BLOCK added to action_list (above Active table).
  - **STATE CHANGE v2.62**: Future ideation block (Brand Topic Notebook) — queue updated: cc-0009 / PRV-1 second build (AUTHORED) is queue-behind item 1 (in lifecycle); Platform Reconciliation build is item 2; AI OS Improvements is item 3.
  - **T-MCP-02 unchanged at 56.** State-capture exceptions unchanged cumulative. No D-01 fire this cycle.
  - **5 prior close-the-loop UPDATEs to `m.chatgpt_review` UNBLOCKED v2.61, still pending v2.62.** Recommend batched close-out next session OR between cc-0009 stages.
  - **PK explicit directive received** for v2.62 doc-only authoring close: "Perform doc-only 4-way sync close for cc-0009 v1 AUTHORED. ... Documentation updates only. No production mutation."
  - **Closure budget**: ~75 min total chat work this cycle (cc-0009 v1 brief authoring ~70 min; this 4-way sync close ~5 min). Trailing-14-day ~65h above 8.0h floor. ~2 P0+P1 open; 2 NEW P1 active rows for cc-0009 lifecycle (rank 1+2) within 20-finding cap.
  - **Production mutations chat-side this turn (4-way sync close)**: 0. **4 documentation file commits.**
  - **Carried**: Crazy Domains refund follow-up; morning-inbox-sweep-v1 brief amendment (P3); 4 P2 cron findings from v2.54; F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN, unchanged); v2.60 Brand Topic Notebook future ideation (queue-behind shape updated); M8b separate brief; 94-row un-publishable legacy draft cohort; 5-row close-the-loop batch UNBLOCKED still pending; Platform Reconciliation View brief authoring (now rank 3); Dashboard roadmap PHASES (**18th** carry).
