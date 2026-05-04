# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-04 laptop Sydney evening session-end (v2.35 — **ICE Dashboard Architecture Review formally kicked off; three foundational decisions LOCKED (Strategic Renovation, Brief+alerts on Telegram only, lighter agent surface); 11-section review document agreed; doc location BOTH repos. Cowork night-task unblock + manual run nightly-health-check-v1 v2.1 clean pass.**). Closure budget: +0.5h this session (cowork unblock only; architecture work excluded per standing rule), trailing-14-day ~19.0h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S24)
3. **Verifies D186 closure budget** (per § "Closure budget tracking" below)
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **Mechanism**: `ask_chatgpt_review` MCP tool. **Procedure**: `docs/runtime/mcp_review_protocol.md` v2.17. **v2.35 application**: 0 D-01 reviews fired this session — queue/docs/workflow maintenance below D-01 production-patch threshold. T-MCP-02 quota 24 (unchanged from v2.34).

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger on new automation if closure falls behind.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~4 (T05 P1-urgent + 3 P1 fixes shipped pending V3-V5 confirmation) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~19.0h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~0.5h** (cowork unblock + queue reset). Architecture review work (~2.5h) excluded from closure budget per standing rule (product/architecture work, not finding closure).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-04 laptop Sydney evening session-end (v2.35).
> **This session: Dashboard Architecture Review kickoff (~2.5h, three foundational decisions locked) + Cowork night-task unblock (~30 min)**.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **Tomorrow's autonomous Cowork run validation** | **P1** | 5 May ~02:00 AEST is the real test of v2.2 owner-gate. Today's manual run was rehearsal. | Verify `docs/audit/health/2026-05-05.md` exists and clean; check `docs/runtime/runs/nightly-health-check-v1-2026-05-05*.md` state; confirm no cc-owned briefs were picked up. |
| 3 | **T05 Meta dev support contact** | **P1-urgent** | Unchanged from v2.29 | PK fills 2 placeholders and sends |
| 4 | **CFW LI fill cycle V3-V5 acid test** | **P1** | Next CFW LI slot at ~05-06 03:04 UTC simultaneously tests parser fix (skip-path) + F-PUB-009 (scheduled_for write). Pre-fix: 33% success rate on CFW LI image_quote. Post-fix: legitimate compliance skips should produce slot.status='skipped' + ai_job.output_payload.skipped=true. | Next session: query `m.ai_job WHERE updated_at >= '2026-05-06 03:00+00' AND client_id = '3eca32aa-...' AND platform='linkedin'`. Verify (a) succeeded with skipped or normal output, (b) `m.post_draft.scheduled_for = m.slot.scheduled_publish_at` for new fills. |
| 5 | **3 stuck-item clusters from health check** | **P1** | Surfaced today by Section 10 of nightly-health-check-v1 v2.1: LinkedIn-PP residual (2 items, oldest 2.5 days), YouTube-PP unexpected (2 items — YouTube is ingest-only architecturally), YouTube-NY unexpected (1 item — points at upstream config bug) | Diagnose each cluster; YouTube clusters likely indicate upstream config bug needing root-cause investigation; LinkedIn-PP residual likely related to F-AI-WORKER-PARSER-SKIP-BUG forward-only nature (won't recover historic stuck items). |

**Demoted from prior Today/Next 5 in v2.34→v2.35 cycle** (still active, just not Top 5):

- F-AAP-NEEDS-REVIEW-BACKLOG (P2) — 28 drafts in `needs_review`. Top P2 next-up. (Demoted because tomorrow's Cowork validation + 3 cluster diagnoses are time-sensitive.)
- F-PUB-009 7-day flow check (P2) — `legacy_spread_mismatch_count` decline trajectory after ~50 newly-filled slots. (Demoted because it's calendar-paced.)

**Demoted from prior Today/Next 5 in v2.33→v2.34 cycle** (per v2.34):

- F-AI-WORKER-PARSER-SKIP-BUG ✅ DEPLOYED v2.34 — V3-V5 active row (see Active section)
- F-AAP-007 fix v2 (Option B) ✅ APPLIED v2.34 — verification complete
- F-PUB-009 fix (improved Pattern 1) ✅ APPLIED v2.34 — V3-V5 active row (see Active section)

**Demoted from prior Today/Next 5 in v2.32→v2.33 cycle:**

- B-AUDIT-CHECK5-DRIFT **RETIRED v2.33**
- B-PIPELINE-INCIDENT-REMEDIATION superseded by F-AI-WORKER-PARSER-SKIP-BUG + F-PUB-009 (both shipped v2.34)

---

## 🔄 Standing session-start checks

| # | Check | How | Threshold to act |
|---|---|---|---|
| S1–S15 | (per v2.13) | (see v2.13) | (see v2.13) |
| S16 | Auto-approver fresh-approval rate | (per v2.30) | (per v2.30) |
| S17 | ChatGPT Review MCP cost + idempotency rate | (per v2.25) | **v2.35 note**: 24 fires total (unchanged this session — no D-01 fires). 7d escalation rate now 13/25 = 52% (T-MCP-06 signal climbing). |
| S18 | D186 closure budget (per session start) | (per v2.25) | **Currently at ~19.0h trailing-14-day — well above 8.0 floor.** |
| S19 | R01 Data Auditor closure effectiveness | (per v2.30) | (per v2.30) |
| S21 | Pipeline incident health | `SELECT * FROM audit.v_brand_platform_audit_matrix ORDER BY CASE likely_bottleneck WHEN 'ok_or_recently_active' THEN 99 ELSE 1 END, client_slug, platform;` | Watch for: classification shifts. v2.34 added new `approved_not_queued_genuine_gap` label. |
| S22 | Cron heartbeat health | `SELECT jobname, status, minutes_since_last, consecutive_misses FROM m.cron_health_status WHERE status != 'green';` | Empty result = all crons healthy. |
| S23 | F-PUB-009 forward-flow check | `SELECT count(*) FROM m.post_draft d JOIN m.slot s ON s.filled_draft_id = d.post_draft_id WHERE d.created_at >= NOW() - INTERVAL '24 hours' AND d.scheduled_for IS NOT NULL` | Should be > 0 within 24h post-apply, growing toward majority of new slot-driven drafts having scheduled_for populated. |
| S24 | F-AI-WORKER-PARSER-SKIP-BUG forward verification | `SELECT count(*) FROM m.ai_job WHERE updated_at >= NOW() - INTERVAL '24 hours' AND status='succeeded' AND output_payload->>'skipped' = 'true'` | Should be > 0 within 24h post-apply when CFW LI fill cycles fire. Validates parser fix lets compliance skips reach the existing skip handler. |
| **S25 NEW v2.35** | **Cowork autonomous run check** | Verify `docs/audit/health/{tomorrow}.md` exists and is clean after autonomous run; check no cc-owned briefs were picked up by Cowork (owner-gate working). | Empty health file or any cc-owned brief picked up = v2.2 owner-gate failure; investigate. |

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.31.

**v2.35 status delta**: Three deferred structural fixes (F-AI-WORKER-PARSER-SKIP-BUG, F-AAP-007 v2, F-PUB-009) shipped v2.34. Cowork pipeline reliability blocker resolved this session via v1-spec owner-gate addition. Tomorrow's autonomous run is the real validation.

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
| T-MCP-05-NEW2 | Close-the-loop UPDATE on 3 review_ids from v2.34 | P3 | Combine in next batch closure (now 7 total: 4 carry-overs + 3 from v2.34) |
| T-MCP-06 | Investigate plan_review + sql_destructive escalation rates | P3 | **v2.34 strong signal**: sql_destructive at 2-of-2 escalated this session (both type-(c)). May indicate sql_destructive scope is intrinsically PK-decision-required, similar to plan_reviews. |
| T-MCP-08 | ✅ PROMOTED canonical v2.29 | — | — |
| T-MCP-09 | Lesson candidate: post-apply ACL verification | P3 | After 1-2 more instances |
| T-MCP-10 | Lesson candidate: state-snapshot age ≥ 4h re-verification | P3 | After 1-2 more instances |
| T-MCP-11 | Lesson candidate: pre-flight discipline includes verifying log/health table actually contains data | P3 | Bundle with T-MCP-12 for promotion |
| T-MCP-12 | Lesson candidate: query EVERY annotation column when verifying table contents | P3 | Bundle with T-MCP-11 for promotion |

---

## 🤖 Cowork automation (D182)

**v2.35 update**: v1 spec extended with owner-field semantics (`cowork | cc/cowork | cc | chat | PK | empty`). cowork_prompt v2.1 → v2.2 with owner-gate filter. Manual run of nightly-health-check-v1 v2.1 confirmed clean execution; tomorrow's autonomous run is the real test.

Sunset review: 12 May 2026 — unchanged.

---

## 🧭 ICE Dashboard Architecture Review (NEW v2.35)

**Status:** Kickoff complete. Three foundational decisions LOCKED. Doc location decided (BOTH repos). 11-section review structure adopted. ~9-10h chat estimate over 3 sessions.

**Decisions locked v2.35:**

1. **Strategic renovation** (not greenfield, not conservative renovation) — design from first principles, implement through staged migration. Existing pages as evidence/source material.
2. **Multi-channel scope: Brief + alerts on Telegram only** — no mobile inbox, no voice approval, no Telegram-driven decisions. Web is the workspace; non-web is the nudge.
3. **Agents as status surface** — status cards on Overview + section in Investigate. NO calibration UI / threshold tuning / profile pages as MVP. Defer "colleague" framing to v2.

**Doc location LOCKED:** BOTH repos. Review content in `Invegent-content-engine/docs/dashboard-review-2026-05/`. Link from `invegent-dashboard/docs/architecture-review/`.

**Refreshed final-form IA (subject to §5 confirmation):**

```
NOW (3): Overview, Inbox, Pipeline
CLIENTS (4): All Clients, Feeds, Onboarding, Connect
CREATE (2): Content Studio, Formats
INVESTIGATE (4): Flow, Pipeline Log, Visual Pipeline, Agents
REPORTS (1 nav, 3 tabs): Performance + Costs + Calibration
ADMIN (4): Reviews, Compliance Rules, Subscriptions, Roadmap
```

**11-section structure:**

| § | Section | Effort | Status |
|---|---|---|---|
| 1 | Current-state inventory | ~1.5h | NEXT |
| 2 | Operator workflow map | ~1h | pending |
| 3 | Decision criteria | ~30 min | pending |
| 4 | IA option comparison (5 options scored) | ~1h | pending |
| 5 | Recommended target IA | ~30 min | pending |
| 6 | Page-by-page fate table | ~2h | pending |
| 7 | Brief + Telegram channel plan | ~30 min | pending |
| 8 | Layer 1/2 boundary | ~30 min | pending |
| 9 | New product objects | ~1h | pending |
| 10 | Migration sequence | ~1h | pending |
| 11 | Risks + open decisions | continuous | continuous |

**Five open decisions deferred to §3:**

1. Agent integration shape — overlays vs Investigate section
2. Pipeline state-machine surface — replace Queue or keep both
3. Reviews as own section vs nested in Admin
4. Roadmap fate — Admin / separate deployment / markdown-only
5. Layer 1/2 boundary — Performance for clients goes to portal, ops Performance stays here

**Trigger to start §1**: PK signals "start §1" or "go" at any session start. No rush per PK.

---

## 🟡 Active

Per v2.31 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix on CFW LI × image_quote | P1 | DEPLOYED v2.34; awaiting CFW LI fill cycle | chat → next session | Query `m.ai_job` after 2026-05-06 03:04 UTC for CFW LI rows with `output_payload->>'skipped' = 'true'` |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P1 | APPLIED v2.34; awaiting next fill cycle | chat → next session | Query `m.post_draft` newly-filled rows for `scheduled_for IS NOT NULL` matching slot.scheduled_publish_at |
| **NEW v2.35: Cowork autonomous run validation** | Tomorrow ~02:00 AEST | P1 | Manual rehearsal passed v2.35; autonomous run pending | chat → next session | Verify `docs/audit/health/{tomorrow}.md` clean; check no cc-owned briefs picked up |
| **NEW v2.35: 3 stuck-item clusters** | LinkedIn-PP residual + YouTube-PP unexpected + YouTube-NY unexpected | P1 | Surfaced by health check 2026-05-04 | chat → next session | Diagnose each cluster; YouTube clusters likely upstream config bug |
| **NEW v2.35: ICE Dashboard Architecture Review** | 11-section formal review | strategic-product | KICKOFF complete v2.35; §1 next | chat ↔ PK | PK signals start, write §1 in `Invegent-content-engine/docs/dashboard-review-2026-05/01-current-state-inventory.md` (~1.5h) |
| (others) | per v2.31 | — | — | — | per v2.31 |

---

## 💼 Personal businesses

*(none flagged — PK to confirm at next session start)*

---

## 📌 Backlog

**v2.35 changes**:

- **F-COWORK-OWNER-GATE-BUG ✅ CLOSED v2.35** — bundled into 4-file commit `e2cecc6` (queue.md row flips + cc brief frontmatter patch + v1-spec owner semantics + cowork_prompt v2.2).
- **NEW v2.35**: 3 stuck-item clusters from health check (LinkedIn-PP / YouTube-PP / YouTube-NY) — promoted to Active at P1.
- **NEW v2.35**: ICE Dashboard Architecture Review — Active strategic workstream.

**v2.34 changes** (still active):

- F-AI-WORKER-PARSER-SKIP-BUG, F-AAP-007 v2, F-PUB-009 — V3-V5 acid tests remain (Active rows).

**v2.33 additions** (still active):

- **F-AAP-NEEDS-REVIEW-BACKLOG (P2)** — 28 drafts piled in `needs_review`. Top P2 next-up.
- **B-TOKEN-HEALTH-EMPTY (P3)** — `m.platform_token_health` empty for all clients.
- **F-CFW-LI-DUP-SLOTS (P3)** — 2 CFW LI failed slots both 2026-05-04 03:04. (Now part of the 6 historic exceeded_recovery_attempts cluster post-investigation.)
- **B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING** ✅ CLOSED v2.34.

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
- Lesson #51 (HONOURED v2.35 seventeenth — pre-flight P1-P5 honoured before each commit this session)
- Lesson #58 candidate, #59 candidate, #60 candidate
- Lesson #61 PROMOTED canonical (REINFORCED v2.25, seventh vindication)
- **Lesson #62 type-(c) — at 5+ vindications since v2.34** (3 from v2.32 + 2 from v2.34, both sql_destructive). Identical signature: verified_claims affirm every substantive fact; pushback is generic-risk speculation without specific consumer-break / data-corruption evidence; corrected_action restates the existing apply-path plan. **Ready for canonical promotion** with default-presumption framing: "type-(c) escalations carry a default presumption of generic-bias unless reviewer surfaces specific consumer-break, data-corruption, or regression evidence; state-capture exception applies after PK explicit approval; cost-of-waiting reasoning weighs proceed."
- G1 sync_state restructure (v2.23) — honoured through v2.35
- Lessons #40, #41, #42 promoted canonical (R01 calibration v2 v2.25)
- T-MCP-08 PROMOTED canonical v2.29
- T-MCP-09 lesson candidate: post-apply ACL verification (since v2.29)
- T-MCP-10 lesson candidate: state-snapshot age ≥ 4h re-verification (since v2.30)
- T-MCP-11 lesson candidate: pre-flight discipline includes verifying log/health tables actually contain data (since v2.31, reinforced v2.33)
- T-MCP-12 lesson candidate: query EVERY annotation column when verifying table contents (since v2.32, reinforced v2.33)
- **Lesson candidate (since v2.33, reinforced v2.34)**: when investigating cascading symptoms across multiple findings, drill into the source code of the worker producing the symptom — DB-only inspection missed F-AI-WORKER-PARSER-SKIP-BUG for 7+ days, EF source-read found it in one query. Promote to canonical after 1 more vindication.
- **Lesson candidate v2.34 — improved-Pattern-1**: when the brief's original fix shape involves a separate trailing UPDATE, check the existing function/view body for an existing block that can be edited surgically instead. Promote to canonical after 1 more vindication.
- **NEW lesson candidate v2.35 — owner-gate as v1-spec invariant**: when an executor traverses a queue of mixed-owner items, owner-field filtering must be encoded in the spec, not in ad-hoc executor logic. Two nights of nightly-health-check missed because a cc-owned brief blocked queue progress. Pattern: any queue-walking executor must first declare which owner-fields it claims; spec owns the contract, not the executor. Promote to canonical after 1 more vindication.

---

## v2.35 honest limitations

- All v2.31-v2.34 limitations apply.
- **Tomorrow morning's autonomous Cowork run remains untested** — today's manual run validated the v2.1 SQL fix and the v2.2 prompt under PK-supervised execution but not the v2.2 owner-gate's fully autonomous behaviour. If tomorrow's run picks up a cc-owned brief, the owner-gate has failed; if it produces an empty health file, the health-check brief has failed.
- **Three Cowork-surfaced stuck-item clusters deferred** (LinkedIn-PP residual, YouTube-PP unexpected, YouTube-NY unexpected). The YouTube clusters are particularly notable because YouTube is ingest-only architecturally — any YouTube items in publishing queues indicate upstream config bug.
- **Architecture review work consumed significant chat tokens this session** (4 rounds + 3 batches of market research + 4 rounds of refinement). §1 next session should anticipate similar token weight.
- **The 11-section review structure is provisional** — sections may merge or split as §1-§3 conversations surface real shape. Effort estimate of ~9-10h is a guess, not a contract.
- **Dashboard roadmap page (`app/(dashboard)/roadmap/page.tsx` in invegent-dashboard) NOT updated this session.** The architecture review is meta-work; PK to decide next session whether the roadmap page should reflect it.
- **Closure budget remains well above floor** (~19.0h trailing 14-day). Risk: building automation while behind on closure is not a current concern, but rate continues high.

---

## Changelog

- v1.0–2.32: per previous changelog.
- v2.33 (2026-05-04 morning Sydney phone session): per previous changelog.
- v2.34 (2026-05-04 laptop Sydney mid-session): per previous changelog.
- **v2.35 (2026-05-04 laptop Sydney evening session-end, dashboard architecture review kickoff + cowork recovery):**
  - **ICE Dashboard Architecture Review formally KICKED OFF**. Four rounds of review iteration with PK-supplied reviewer notes + external standards research + own market research. Three foundational decisions LOCKED:
    - Strategic renovation (design from first principles, staged migration)
    - Multi-channel: Brief + alerts on Telegram only (web primary for everything else)
    - Agents as status surface (no calibration UI / colleague framing as MVP)
  - **Doc location LOCKED**: BOTH repos. Review content in `Invegent-content-engine/docs/dashboard-review-2026-05/`. Link from `invegent-dashboard/docs/architecture-review/`.
  - **Refreshed final-form IA**: 6 sections, ~18 nav items (NOW / CLIENTS / CREATE / INVESTIGATE / REPORTS / ADMIN). Compliance / Performance / Visuals each split.
  - **11-section structure adopted, ~9-10h chat estimate over 3 sessions**. §1 starts next session whenever PK signals.
  - **Cowork night-task unblock**: v1-spec extended with owner-field semantics (`cowork | cc/cowork | cc | chat | PK | empty`); cowork_prompt v2.1→v2.2 with owner-gate filter; cc brief frontmatter patched. Commit `e2cecc6`. Two nights of health checks lost (3 May + 4 May).
  - **Manual Cowork run nightly-health-check-v1 v2.1**: clean pass (~4 min, ~25.5k tokens, 5-of-7 thresholds, 0 corrections, 0 production writes). Section 10 surfaced 5 true-stuck items in 3 clusters (LinkedIn-PP / YouTube-PP / YouTube-NY) — promoted to Active at P1.
  - **Queue row reset commit `46255fde`** for next nightly fire ~02:00 AEST 5 May (real autonomous test of v2.2 owner-gate).
  - **NEW S25 standing check** added for Cowork autonomous run validation.
  - **NEW lesson candidate**: owner-gate as v1-spec invariant — queue-walking executors must declare owner-field claims in spec, not ad-hoc.
  - **F-COWORK-OWNER-GATE-BUG closed** in same commit as the patch.
  - **T-MCP-02 quota**: 24 (unchanged this session — no D-01 fires).
  - **Closure budget**: +0.5h cowork unblock; architecture work excluded per standing rule. Trailing-14d ~19.0h. Above floor.
  - **Net P0+P1 open**: 4 → 4 (cowork bug closed, 3 cluster diagnoses promoted). Effectively unchanged.
- v2.34 (2026-05-04 laptop Sydney mid-session): per previous changelog.
- v2.33 (2026-05-04 morning Sydney): per previous changelog.
- v2.32 (3 May Sunday late-night Sydney): per previous changelog.
- v2.31 and earlier: per prior changelog.
