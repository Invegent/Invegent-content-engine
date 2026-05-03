# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-03 late evening Sydney session-end reconcile (v2.29 — **T-MCP-05 batch closed end-to-end via reusable SECURITY DEFINER function; post-apply ACL gap surfaced + closed via break-glass; T-MCP-08 promoted candidate → canonical (3rd vindication); new lesson candidate logged**). Closure budget: +0.7h this session, trailing-14-day 13.1 → 13.8h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S20)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.29 application**: ONE plan_review fired (`1bae5068-...` T-MCP-05 batch), ESCALATED, corrected_action honoured via narrative validation cycle producing 3 material amendments — type (a) actionable. ONE break-glass D-01 SKIP recorded for migration #2 (grants hardening) under explicit PK direction — session-local exception, not standing-rule erosion.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~8 (T-MCP-05 was P3 task; no count change) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~13.8h (13.1h prior + 0.7h v2.29) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This bump's closure hours: ~0.7h** (two brief drafts + plan_review + 3-session-file validation + 2 migrations + 3 verification rounds + session reconciliation).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-03 late evening Sydney session-end reconcile.
> **T-MCP-05 closed.** Two new findings have ready-for-night-job briefs.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **T05 Meta dev support contact** | **P1-urgent** | Unchanged from v2.28. Both message variants drafted in 2026-05-03 conversation history. PK fills 2 placeholders (App ID + submission date) and sends. | PK opens Meta dev support conversation using one of the two drafted variants. |
| 3 | **F-AAP-007 fix — apply path** | P2 | Brief committed at f793ddbf (`docs/briefs/2026-05-04-or-later-faap007-fix.md`). Audit Check 8 misreporting fail cnt=56 and growing as F-AAP-001 drain continues. Same fix shape as F-AAP-002 but for F-PUB-010 backpressure. | Check whether night-job ran pre-flight (output at `docs/audit/runs/2026-05-04-faap007-preflight.md`). If yes, review pre-flight + finalise SQL + fire MCP review + apply via apply_migration + verify. If no, run pre-flight in chat session. |
| 4 | **B-AUDIT-CHECK5-DRIFT fix — apply path** | P3 | Brief committed at f793ddbf (`docs/briefs/2026-05-04-or-later-baudit-check5-drift-fix.md`). Check 5 vocabulary drift (`status='locked'` not in current vocab). Pure cleanup; older drift, not v4-specific. | Same flow as F-AAP-007: check night-job pre-flight, finalise, MCP review, apply, verify. |
| 5 | **publish-queue-and-publish CC brief execution** | P2 | Brief at `docs/briefs/2026-05-03-publish-queue-and-publish-column-purposes.md` `status: ready`. ~70-95min CC closure budget. Two 0%-documented tables. Honours D-186 closure-first. Still queued from v2.27. | Trigger CC with brief. CC pre-flights + drafts migration; chat applies via Supabase MCP per D170. |

**Demoted from prior Today/Next 5** (still tracked):
- T-MCP-05 batch closure ✅ DONE v2.29 (5 review_ids closed end-to-end + grants hardened)
- B-AUDIT-V4-PEERS-EF read-only audit — demoted to backlog (P3, CC-suitable; will resurface when bandwidth allows)

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate post-F-AAP-001 | `SELECT client_slug, platform, count(*) FILTER (WHERE approval_status='approved' AND approved_at > NOW() - INTERVAL '24 hours') AS fresh_approvals_24h FROM m.post_draft d JOIN c.client c USING (client_id) WHERE d.created_at > '2026-05-03 09:25:00'::timestamptz GROUP BY 1,2;` | **Reinstated v2.28** post-F-AAP-001 fix. Watch for sustained throughput across drain period. |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.29 note**: 18 fires total (1 new this session: `1bae5068` plan_review T-MCP-05 ESCALATED type-(a) validation). |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at 13.8h trailing-14-day — well above 8.0 floor.** |
| S19 | R01 Data Auditor closure effectiveness | Read trailing-3-cycle structural closure rate from `docs/audit/open_findings.md` § "Closure effectiveness — historical" | **Currently at 28.6% (cycles 1-2 only); next cycle will be the third data point.** |
| ~~S20~~ | ~~Operational stance retire criteria~~ | — | **RETIRED v2.28** (stance retired explicit by PK). |

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.28 except where noted.

| ID | Item | Priority | Due | Owner | Next action / Done when |
|---|---|---|---|---|---|
| T02 | Gate B exit decision | — | ✅ DONE | — | Session: `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| T04 | R01 calibration session | — | ✅ DONE | — | Session: `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| **T05** | **Meta dev support contact** | **P1-urgent** | **Unblocked v2.28**. Send within next 7 days for momentum. | PK | Both message variants drafted; PK fills 2 placeholders and sends. |
| T06 | Reconnect YouTube OAuth — UNBLOCKED | P1 | Within 7 days | PK | Reconnect OAuth at user/account level |
| T07 | Instagram publisher recovery | P1 | Gated on S16 + T05 + cron `?limit=1` update | mixed | Step 4 cannot retry until ALL gates clear |
| T08 | Auto-approver patch | — | ✅ DONE 2 May late evening via B31 | — | `docs/runtime/runs/2026-05-02-b31-auto-approver-v160-deploy.md` |
| T09 | Safe-to-resume publisher checklist | P0 | Walk before each cron flip | PK | brief: `06_t09_*` |
| T10 | Pre-fix queue disposition | P0 | Now appropriate post-W1 | PK | brief: `07_t10_*` |
| T11 | YouTube failed-draft replay plan | P1 | After T17 + T06 | chat → MCP review → PK | next session |
| T12 | F-PUB-005 trigger gate | — | ✅ DONE 3 May mid-morning | — | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| T13a | LinkedIn Zapier publisher gate v1.1.0 | P0 | ✅ DONE 2026-05-01 | — | brief: `03_t13_*` |
| T13b | LinkedIn direct publisher gate v1.2.0 | P0 | ✅ DONE 2026-05-01 | — | brief: `03_t13_*` |
| T16 | Audit needs_review LinkedIn published drafts | P1 | This week | PK | Full window since 2026-03-12 |
| T17 | YouTube publisher gate v1.6.0 | P0 | ✅ DONE 2026-05-01 | — | brief: `01_t17_*` |
| T18 | FB publisher gate v1.8.0 | P0 | ✅ DONE 2026-05-01 | — | brief: `02_t18_*` |

**Workstream 1 status: COMPLETE.** **Workstream 2 status: ✅ COMPLETE.** **Phase B body-health gate: ✅ RATIFIED.** **R01 Data Auditor calibration v2: ✅ COMPLETE.** **Operational stance: ✅ RETIRED v2.28.** **B-AUDIT-V4-PEERS audit pass: ✅ COMPLETE v2.28.** **F-AAP-001 fix: ✅ CLOSED v2.28.** **F-AAP-002 fix: ✅ CLOSED v2.28.** **T-MCP-05 batch closure (5 v2.20-v2.28 review_ids): ✅ CLOSED v2.29.** **G1 sync_state restructure: COMPLETE.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP (v2.29 update — T-MCP-02 quota at 18 of 5)

One new fire this session:
- review_id `1bae5068-c77a-40f1-a2a6-769fbc5988b9`, action_type=`plan_review` (T-MCP-05 batch closure), ESCALATED, corrected_action=narrative validation against historical records, type (a) actionable — produced 3 material amendments via session-file cross-reference. **Self-similar pattern**: this fire #18 is itself now pending T-MCP-05-style closure (logged in backlog).

| ID | Item | Priority | Trigger |
|---|---|---|---|
| T-MCP-01 | ✅ DONE | Closed | — |
| T-MCP-02 | ✅ EXCEEDED 18 of 5 | — | — |
| T-MCP-03 | Rotate `MCP_BRIDGE_BEARER_TOKEN` | P2 | Within 7 days |
| T-MCP-04 | Operationalise D-01 standing rule | P1 | Half-codified v2.17. Pending PK manual update. |
| T-MCP-05 | Close-the-loop UPDATE on 5 v2.20-v2.28 review_ids (`2bab95d5`, `521628d0`, `1e5ab2eb`, `745482fb`, `d4e25cfa`) | ✅ **DONE v2.29** | Session: `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| **T-MCP-05-NEW** | **Close-the-loop UPDATE on `1bae5068-...` (fire #18 from this session itself)** | **P3** | PK confirmation required. Use `public.close_chatgpt_review` directly. |
| T-MCP-06 | Investigate sql_destructive escalation rate (~50%) | P3 | **v2.29 update**: hypothesis still under test. plan_review escalation rate at ~6 of 7 (high). sql_destructive at ~50% (3 of 6). Distinct outcome split: T-MCP-08 (new-knowledge) vs Lesson #62 type-(c) (consistency-bias). |
| T-MCP-07 | Retrospective MCP review on R01 calibration v2 | P3 | Optional. PK fires if desired. |
| **T-MCP-08** | **Lesson PROMOTED candidate → canonical v2.29** (3rd vindication: v2.27 plan_review EF source inspection + v2.28 sql_destructive replay test + v2.29 plan_review narrative validation). Pattern shape canonical now: "On MCP escalation where corrected_action requests downstream verification one tool-call away from chat, escalation is high-value — produces measured evidence that confirms/refutes/amends. Distinct from Lesson #62 type-(c) consistency-bias." | ✅ PROMOTED | Future MCP escalations evaluated against this canonical pattern. |
| **T-MCP-09 (NEW v2.29)** | **Lesson candidate**: post-apply ACL verification. "For migrations involving function privileges in Supabase public schema, post-apply verification MUST query `information_schema.routine_privileges` directly. REVOKE FROM PUBLIC alone is insufficient — anon and authenticated may still hold individual EXECUTE grants from Supabase defaults. ChatGPT plan_review cannot detect this since it sees proposed SQL only." | P3 | After 1-2 more such instances (currently 1: this session migration #1 → #2 hardening), promote to canonical. |

---

## 🤖 Cowork automation (D182 — v2.29)

Unchanged from v2.28. 11 briefs run; 3 brief shapes validated; 0 production writes from automation; 1 scheduled task live (nightly health check 02:00 AEST). Sunset review: 12 May 2026.

**v2.29 dependency**: F-AAP-007 + B-AUDIT-CHECK5-DRIFT briefs at `docs/briefs/2026-05-04-or-later-{...}.md` are scoped for night-job pickup (read-only pre-flight + migration draft only). If night-job runs them, pre-flight reports land at `docs/audit/runs/2026-05-04-{...}-preflight.md`.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| F-AAP-007 | Audit Check 8 doesn't account for F-PUB-010 backpressure | P2 | brief committed at f793ddbf; ranked #3 in Today/Next 5 | chat → night-job (pre-flight) → chat (apply) | Check night-job pre-flight result; finalise SQL; MCP review + apply. |
| B-AUDIT-CHECK5-DRIFT | Audit Check 5 vocabulary drift (`status='locked'` not in current vocab) | P3 | brief committed at f793ddbf; ranked #4 in Today/Next 5 | chat → night-job (pre-flight) → chat (apply) | Same flow as F-AAP-007. |
| publish-queue-and-publish-column-purposes | New CC brief | P2 | status: ready | cc | Trigger CC with brief. Ranked #5 in Today/Next 5. |
| B-INV-LinkedIn-Queue-Stall | Investigate 5 LinkedIn × Property Pulse true-stuck drafts | P1 | investigation complete v2.20 — remediation pending PK review | chat | Findings: `docs/audit/runs/2026-05-03-fpub006-linkedin-investigation.md` |
| **T-MCP-05-NEW (NEW v2.29)** | Close-the-loop UPDATE on `1bae5068-...` fire #18 | P3 | Self-similar to closed T-MCP-05 batch | chat → PK confirm | Use new `public.close_chatgpt_review` function directly; no need to author another. |

---

## 💼 Personal businesses

*(none flagged this session — PK to confirm at next session start)*

---

## 📌 Backlog

**v2.29 additions**: none beyond T-MCP-05-NEW (already in Active above) and T-MCP-09 lesson candidate (already in MCP tooling above).

**Demoted from Today/Next 5 v2.29**:
- **B-AUDIT-V4-PEERS-EF (P3)** — EF-side caller audit for `match_demand_to_canonicals`, `diagnose_match_pool_adequacy`, `summarise_match_pool_adequacy`. Verifies F-AAP-005 severity. CC-suitable. Resurface when bandwidth allows.

**Other backlog (carried from v2.28)**:

- **F-AAP-003 (P3)** — `m.vw_ops_pipeline_health` misleading-metric. Audit doc: `docs/audit/runs/2026-05-03-baudit-v4-peers.md`.
- **B-CRON-V3-ORPHAN (P3)** — jobid 12 hourly orphan production. Gate: B-CRON-V3-ORPHAN-READERS audit must complete first.
- **B-CRON-V3-ORPHAN-READERS (P3)** — reader-side audit on `m.digest_item` / `m.digest_run` consumers (EFs, dashboards, ad-hoc queries) before pausing jobid 12.
- **F-AAP-004 (P3-dormant)** — `match_demand_to_canonicals` INNER JOIN through digest_item. Reachable only via paused crons 11/64/65. Gate to resumption: must fix or deprecate.
- **F-AAP-005 (P3-dormant)** — `diagnose_match_pool_adequacy` + `summarise_match_pool_adequacy`. EF caller audit pending (B-AUDIT-V4-PEERS-EF).
- **F-AAP-006 (P4-dormant)** — `cluster_digest_items_v1`. Operates on digest_item only.
- **F-AAP-001 dead-join cleanup** — `LEFT JOIN m.digest_run dr` is now unreferenced post-fix; Postgres planner optimises away. Cleanup-candidate.
- **B-AUDIT-CYCLE3** — Cycle 3 R01 Data Auditor run (first test of calibration v2 mechanisms; picks up C2-CAND-001 punted from v2.25 calibration).
- **F-PUB-008** — NDIS-Yarns FB publishes with NULL platform_post_id (P2, not investigated).
- **F-PUB-009** — Scheduling drift to August/October (P3, bounded by F-PUB-005 patch v2).
- **B-INV-LinkedIn-PhantomPublishes** — Daily phantom 00:00 UTC PP-LinkedIn publishes (P2, reproducible).
- **B39** — Drain over-cap queues (P3, by design).

---

## 🧊 Frozen / Deferred

Unchanged from v2.20.

---

## 🎓 Canonical Lessons

- Lesson #46 (PROMOTED, third vindication v2.15)
- Lesson #51 (HONOURED v2.29 eleventh — pre-flight discipline applied to T-MCP-05 batch closure work, schema lookup + status vocab check + role privilege check before drafting)
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication)
- Lesson #62 type-(c) APPLIED v2.28 (F-AAP-002), distinguished from type-(a) v2.29 (T-MCP-05 plan_review). Framework working as designed.
- G1 sync_state restructure (v2.23) — honoured v2.25/v2.27/v2.28/**v2.29**
- Lessons #40, #41, #42 promoted candidate → canonical (R01 calibration v2 v2.25)
- **T-MCP-08 PROMOTED candidate → canonical v2.29** (3rd vindication: v2.27 + v2.28 + v2.29). Pattern: "On MCP escalation where corrected_action requests downstream verification one tool-call away from chat, escalation is high-value — produces measured evidence. Distinct from Lesson #62 type-(c) consistency-bias."
- **T-MCP-09 NEW lesson candidate v2.29**: post-apply ACL verification. First instance this session.

---

## v2.29 honest limitations

- All v2.28 limitations apply.
- **PK "Verification Complete" mid-session message did not match ACL ground truth.** Source unclear (could be: dictation framing, external tool report that didn't fire, AI-generated status text). Trust-but-verify discipline caught the discrepancy via direct ACL query. Pattern signal: even authoritative-sounding state reports require direct verification for production-state claims.
- **Migration #2 was BREAK-GLASS D-01 SKIP.** Recorded explicit by PK as session-local exception for active security gap introduced in same session. Not standing-rule erosion, but the bar for break-glass should remain high — if break-glass becomes routine the rule loses meaning. v2.29 is the first instance in this trailing window. Track frequency.
- **ChatGPT plan_review cannot detect post-apply ACL gaps.** Reviewer sees proposed SQL only, not effective post-apply state. Mitigation: T-MCP-09 lesson candidate — post-apply ACL verification step required for migrations involving function privileges in Supabase public schema.
- **T-MCP-05-NEW (fire #18 close-the-loop) self-similar to closed T-MCP-05 batch.** Will use new `public.close_chatgpt_review` function directly (no new function authoring needed). Demonstrates the function's reusability proposition. Worth tracking: how many uses of the function before it has paid back the authoring cost?
- All v2.28 honest limitations carry forward unchanged.

---

## Changelog

- v1.0–2.28: per previous changelog.
- **v2.29 (3 May Sunday late evening Sydney session-end reconcile): T-MCP-05 batch closed end-to-end; post-apply ACL gap surfaced + closed via break-glass; T-MCP-08 promoted candidate → canonical; new lesson candidate T-MCP-09 logged.**
  - **Two ready-for-night-job briefs committed** at f793ddbf: F-AAP-007 fix (P2) + B-AUDIT-CHECK5-DRIFT fix (P3). Both scoped read-only pre-flight + migration draft only; apply gated on MCP review next chat session.
  - **T-MCP-05 batch closure** end-to-end via reusable SECURITY DEFINER function `public.close_chatgpt_review`. plan_review fired (`1bae5068-...`) ESCALATED with type-(a) actionable corrected_action; 3 session files cross-referenced; 3 material amendments produced; PK approved validated package; migration #1 applied.
  - **Verification round 2 (function ACL) surfaced gap**: anon + authenticated still held EXECUTE post-apply. Root cause: Supabase default role-specific grants not affected by REVOKE FROM PUBLIC. Migration #2 applied under explicit PK BREAK-GLASS D-01 SKIP. Verification round 3 confirmed clean (postgres + service_role only).
  - **PK "Verification Complete" mid-session message** claimed REVOKE was applied; direct ACL query showed grants unchanged. Trust-but-verify discipline caught the discrepancy; chat applied REVOKE itself.
  - **T-MCP-08 PROMOTED candidate → canonical** (3 vindications met).
  - **T-MCP-09 NEW lesson candidate** logged: post-apply ACL verification.
  - **T-MCP-05-NEW** logged for fire #18 (`1bae5068`) self-similar follow-up.
  - **T-MCP-02 quota**: 17 → 18.
  - **Today/Next 5 rebuilt**: rank 1 personal businesses; rank 2 T05 P1-urgent; rank 3 F-AAP-007 apply path; rank 4 B-AUDIT-CHECK5-DRIFT apply path; rank 5 publish-queue-and-publish CC brief.
  - **Closure budget**: +0.7h. Trailing-14-day 13.1 → 13.8h. Above 8.0 floor.
  - **No production DML.** 2 DDL via apply_migration (function + 5 SELECT invocations as one atomic unit; then 2 REVOKE statements).
- v2.28 (3 May evening Sydney session-end reconcile): Stance retired explicit + F-AAP-001 + F-AAP-002 applied end-to-end + B-AUDIT-V4-PEERS clean + T05 returns to P1-urgent + 2 new findings logged.
- v2.27 (3 May late-afternoon Sydney F-AAP-001 close-out): F-PUB-005 V3-V5 PASS + B-INV-CFW-Invegent-Silent-Approver resolved + F-AAP-001 P1 logged with confirmed root cause + ChatGPT correction validated.
- v2.26 (3 May late-morning Sydney session-end reconcile): T05 deferred + Operational stance recorded + Today/Next 5 rebuilt.
- v2.25 (3 May late-morning Sydney R01 calibration session-end): T04 R01 Data Auditor calibration v2 COMPLETE.
- v2.24 (3 May late-morning Sydney T02 ratification session-end): T02 Gate B body-health exit RATIFIED.
- v2.23 (3 May mid-morning Sydney F-PUB-005 apply session-end): F-PUB-005 + F-PUB-010 CLOSED + G1 sync_state restructure.
- v2.22–v2.15: per prior changelog.
