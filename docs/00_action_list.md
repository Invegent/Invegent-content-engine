# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-19 Sydney morning (**v2.85 — cc-0017c APPLIED-WITH-VCHECK-CORRECTION. Migration `20260519004545` + cleanup `20260519005322`. Fresh D-01 review_id `d18fa6db-...`: verdict=AGREE, status=resolved. 9/9 V-checks acceptable (V-B4 via PK Path 1 inline rewrite with 12-param emit_event signature). Friction.* Wave 0 COMPLETE. Wave 0d brief authoring NOW BLOCKING. T-MCP-02 75→76. 5 new L-v2.85 candidates (a HIGH-SIGNAL; e captures truncated-push retry). Dashboard PHASES 38th deferral carried. Initial push_files truncated; clean repush succeeded — no partial artefact on main.**) **Today/Next 5**: Wave 0d brief authoring → rank 1; reconciliation daily diagnostic → rank 2; health_check V-C3 → rank 3; music library → rank 4; Platform Reconciliation View → rank 5.

---

## How this file works

At session start, chat reads this file and: (1) rebuilds Today/Next 5; (2) runs Standing checks (S1–S29); (3) verifies D186 closure budget; (4) asks PK about Personal businesses; (5) surfaces Time-bound items.

**Standing rules unchanged from v2.84.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46-v2.58 + L33–L65 + L-v2.76-a-f + L-v2.78-a (promotion-eligible) + L47-candidate + L-v2.81-a-candidate (promotion-eligible) + L-v2.83-a (strong candidate) carried. **D-IOL-001 (v2.77)** carried. **D-CC-0017B-Q1** carried. **5 NEW L-v2.85 candidates**: a (HIGH-SIGNAL), b, c, d, e.

**v2.85 ADDITIONS:**

- **cc-0017c APPLIED-WITH-VCHECK-CORRECTION.** Migration version `20260519004545` (single atomic: Section A FK swap + Section B 8 REVOKEs + Section C 0-row UPDATE).
- **cc-0017c smoke cleanup APPLIED.** Migration version `20260519005322` (V-B4 artefact removal via postgres-owner DELETE).
- **Fresh D-01 CLOSED.** review_id `d18fa6db-...`. Verdict AGREE (empty pushback, empty corrected_action). status=resolved at 2026-05-19 00:54:22 UTC; resolved_by=`cc-0017c-v2.85-applied-with-vcheck-correction`.
- **9/9 V-checks acceptable.** V-A1/A2 PASS, V-A3 PARTIAL, V-B1/B2/B3 PASS, V-B4 PASS via PK Path 1 (corrected 12-param signature; smoke event `f4c94457-...` case_disposition `created_new`), V-C1/C2 PASS.
- **V-B4 brief defect remediated via PK Path 1** inline rewrite. Brief 7-param signature ≠ deployed 12-param. Migration structurally correct; brief defect ≠ migration defect.
- **Friction.* Wave 0 COMPLETE** — Waves 0a + 0b + 0c all APPLIED. Plan gate 10 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE. Gate 12 (Wave 0d) NEW BLOCKING.
- **Wave 0d NOW BLOCKING.** service_role lost UPDATE on friction.case post Section B. P1 rank 1 next session.
- **D-01 fires v2.85: 1.** T-MCP-02 cum **75 → 76**.
- **State-capture exceptions v2.85: 0.** Cumulative: 1 (unchanged).
- **L40 exercised, L41 not exercised, L46 exercised, L58 applied (with retry), L62 exercised.**
- **L-v2.85-a candidate (NEW, HIGH-SIGNAL)** — V-check function signature validation at brief authoring.
- **L-v2.85-b candidate (NEW)** — Inline V-check rewrite as Path 1 for brief-defect-during-apply.
- **L-v2.85-c candidate (NEW)** — SECURITY DEFINER bypass empirically confirmed post REVOKE.
- **L-v2.85-d candidate (NEW)** — Postgres-owner cleanup migration; Wave 0d helper recommendation.
- **L-v2.85-e candidate (NEW)** — Multi-file push_files response-construction length budget; mitigation: compact payloads + no per-session duplication; first occurrence v2.85 initial close truncated, clean retry succeeded.
- **Closed Active rows v2.85**: cc-0017c apply; fresh D-01 fire; V-B4 inline rewrite; V-B4 smoke cleanup; Plan Wave 0c apply (gate 10); Friction.* Wave 0 COMPLETE.
- **New Active rows v2.85**: Wave 0d brief authoring (P1 rank 1 BLOCKING); vchecks.md V-B4 doc patch (P3); cc-0017c v1.2 doc patch candidate (P3 EXPANDED).
- **Dashboard PHASES sync: 38th consecutive deferral** (carried per PK directive item 5).
- **NO decisions.md change.** Wave 0c apply is execution of v2.79-signed Friction Register Consolidation Plan.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~4 (Wave 0d BLOCKING + recon daily diagnostic + health_check signal diagnostic + music library) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~20h (v2.83 1h + v2.84 ~2h + v2.85 ~3h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.85 cycle: ~3h total.** 2 schema mutations via apply_migration. 1 fresh D-01 fire. 1 m.chatgpt_review close-the-loop. 1 retry on push_files close due to length truncation. **State-capture exception count v2.85: 0** (cumulative 1).

---

## ⭐ Today / Next 5

> Last rebuilt: 2026-05-19 Sydney morning (v2.85).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Wave 0d triage/resolution SECURITY DEFINER functions brief authoring** | **P1 (NEW BLOCKING)** | service_role lost UPDATE on friction.case post cc-0017c Section B REVOKE. Any case state change requires SECURITY DEFINER mediation. Scope: `friction.triage_case`, `friction.resolve_case`, `friction.reopen_case`, `friction.purge_test_event`. | chat → PK | PK scope confirmation; multi-file brief following cc-0017* precedent. |
| 2 | **Reconciliation daily cadence diagnostic** | **P1** | First post-cc-0017c cron 85 fire ≈2026-05-19 17:30 UTC. Confirms cc-0017b wrappers + FK-hardened state acceptance. | chat → PK | Post-fire SQL count + emit_event signature check. |
| 3 | **Health_check V-C3 + signal-production diagnostic** | **P1** | V-C3 still PENDING. Cowork brief v3.0 ready. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md`. |
| 4 | **Music library activation** | **P2** | Code wired in video-worker v3.0.0. ~30 min PK-led. | PK + chat | Create bucket, upload tracks, set env, smoke test. |
| 5 | **Platform Reconciliation View brief authoring** | **P2** | Reconciliation surface design. PK greenlight required. | PK → chat | When PK directs. |

**Standing P0:** Personal businesses check-in. Crazy Domains carry from v2.51.

**Passive observation v2.85**: Cron 82-86 unchanged. PRV v1 operator views queryable. friction.* state: 9 tables, 12 functions, 1 partial unique index, event_source_check → event_source_fk, service_role SELECT-only on event+case, 29 events + 29 cases. PostgREST exposes `friction`. Next fires: cron 85 daily ≈17:30 UTC; cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (UPDATED v2.85)

**Status v2.85: ✅ Wave 0 COMPLETE. Gate 10 CLOSED. Gate 11 (1-week observation 2026-05-19 → 2026-05-26) ACTIVE. Gate 12 (Wave 0d) NEW BLOCKING.**

**Documents:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`) — unchanged
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` SIGNED — unchanged
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` v1.1 — APPLIED v2.81 (migration `20260518065610`)
- `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` v1.1 — APPLIED v2.82 (+ corrective `cc_0017b_emit_event_ambiguity_fix`)
- `docs/briefs/cc-0017c-friction-register-lockdown-and-backfill.md` v1.1 — **APPLIED v2.85**
- **Migration `cc_0017c_friction_register_lockdown_and_backfill` live at version `20260519004545`** — APPLIED v2.85
- **Migration `cc_0017c_v_b4_smoke_cleanup` live at version `20260519005322`** — APPLIED v2.85 (smoke artefact removal)
- Per-session files: v2.79 / v2.80 / v2.81 / v2.82 / v2.83 / v2.84 / **v2.85 (this commit, after truncated-push retry)**

**32 decisions + 2 within-amendment clarifications:** unchanged v2.85.

**Open gates v2.85:**
1. ✅ PK approval (v2.79)
2-7. ✅ cc-0017a/b/c brief authoring + D-01 cycles (v2.80-v2.84)
8-9. ✅ cc-0017c v1.0 + v1.1 D-01 fires (v2.84)
10. ✅ **cc-0017c apply** → CLOSED-APPLIED-WITH-VCHECK-CORRECTION v2.85
11. ⏳ **1-week empirical observation window** ACTIVE 2026-05-19 → 2026-05-26
12. ⏳ **Wave 0d triage/resolution SECURITY DEFINER functions** — NEW v2.85, BLOCKING

**v2.85 provenance:** P-set + fresh D-01 + apply_migration + 9 V-checks + V-B4 PK Path 1 inline + smoke cleanup + close-the-loop + 4-way sync close all chat-side this session. Initial close push truncated mid-construction; clean repush succeeded (no partial on main). No parallel-agent contributions observed.

**Empirical findings v2.85:**
- emit_event SECURITY DEFINER bypass works post Section B REVOKE — V-B4 corrected confirmed.
- 0-row UPDATE invariant encoding — V-C2 act_now/track exact match brief = proof Section C affected no rows.
- cc-0017b unified emit_event signature is 12-param. Brief V-B4 7-param signature was memorial — corrected and validated.

---

## 🟢 cc-0017c Wave 0c — STATUS BLOCK (UPDATED v2.85)

**Status: ✅ CLOSED-APPLIED-WITH-VCHECK-CORRECTION.**

**Migrations live:** `20260519004545` (main) + `20260519005322` (cleanup).

**Brief commits:** v1.0 `92f9e868`; v1.1 `d3d8381f`; v1.2 doc patch candidate (NEW v2.85; expanded scope).

**D-01 cycles:**
- v1.0 `a37eff28-...`: partial → Path A → satisfied by v1.1 → resolved v2.84.
- v1.1 `9e602a2d-...`: partial type-c → Path C deferred → resolved v2.84.
- **Fresh v2.85 `d18fa6db-...`: AGREE (empty/empty; procedural escalate only) → resolved v2.85 at 00:54:22 UTC.**

**V-check final matrix:**
| Check | Status |
|---|---|
| V-A1 | ✅ PASS — CHECK dropped |
| V-A2 | ✅ PASS — FK definition match |
| V-A3 | ✅ PARTIAL — REVOKE-first acceptable |
| V-B1 | ✅ PASS — event INSERT REVOKED |
| V-B2 | ✅ PASS — case INSERT+UPDATE REVOKED |
| V-B3 | ✅ PASS — SELECT retained |
| V-B4 | ✅ PASS (corrected) — emit_event SECURITY DEFINER bypass empirically confirmed (smoke `f4c94457-.../fd573ea1-.../created_new`) |
| V-C1 | ✅ PASS — 0/0/0 |
| V-C2 | ✅ PASS — act_now=1/track=7 exact match brief; NULL=22 fully accounted (21 pre + 1 smoke) |

**Final empirical state (post-cleanup):** event=29, case=29, source=3/3, NULL=21/act_now=1/track=7/closed_class=0/done=0; smoke_event_remaining=0; smoke_case_remaining=0.

**Wave 0c scope (per PK 4-item directive, all applied):** FK hardening ✅; REVOKE lockdown ✅; resolved_at/resolution_kind backfill (legal-domain-only, 0 rows) ✅; pre-flight grant capture ✅.

**Out of scope (deferred):** dedupe_fingerprint NOT NULL; emission_rule_history trigger; case_action_decision_check 'done' expansion; closure-invariant CHECK/trigger write-side; **Wave 0d SECURITY DEFINER functions (NOW BLOCKING)**; Wave 0e audit history.

**Open follow-ups:** Wave 0d brief authoring BLOCKING; Wave 0e P3; 1-week observation window 2026-05-19 → 2026-05-26; vchecks.md V-B4 doc patch P3.

---

## 🟢 cc-0017b / cc-0017a / cc-0014 / cc-0015 / cc-0016 / cc-0012 / cc-0010A/B/C / cc-0011 / cc-0009 — STATUS BLOCKS

**v2.85 updates:**
- cc-0015 friction-pool-view (Wave 7): now also gated on Wave 0d + 1-week observation window.
- cc-0016 friction-capture-evidence (Wave 8): now also gated on Wave 0d + Wave 7.
- All others unchanged from v2.84.

---

## 🟢 Process Upgrades — STATUS BLOCK (UPDATED v2.85)

**L40 exercised v2.85** — m.chatgpt_review column-name discipline (lesson from v2.84 internalised; L-v2.84-d possibly auto-resolved).
**L41 not exercised v2.85.** Cumulative v2.80-v2.85 = 6 unchanged.
**L46 Evidence Gate exercised v2.85** — fresh D-01 with verbatim P-set + 9 known_weak_evidence items.
**L58 applied 1× v2.85** — 3-file atomic close (after retry; L-v2.85-e captures the truncation pattern).
**L62 exercised 1× v2.85** — fresh D-01 cycle clean.
**L-v2.78-a, L-v2.81-a**: 2 occurrences each, promotion-eligible (unchanged).
**L-v2.83-a**: 6+ occurrences (+1 v2.85 from this 3-file push). STRONG PROMOTION CANDIDATE.
**L-v2.84-a/b/c/d**: 1 occurrence each (L-v2.84-d possibly auto-resolved by L40 internalisation).
**L-v2.85-a candidate (NEW, HIGH-SIGNAL)**: V-check function signature validation at brief authoring. Recommendation: brief P-set should include `pg_get_function_identity_arguments` probe.
**L-v2.85-b candidate (NEW)**: Inline V-check rewrite as Path 1 pattern for brief-defect-during-apply.
**L-v2.85-c candidate (NEW)**: SECURITY DEFINER bypass empirically confirmed post REVOKE. Validates Amendment F.
**L-v2.85-d candidate (NEW)**: Postgres-owner cleanup migration when service_role lacks DELETE. Wave 0d recommendation: `friction.purge_test_event(uuid)` SECURITY DEFINER helper.
**L-v2.85-e candidate (NEW)**: Multi-file push_files response-construction length budget. Mitigation: compact payloads; check list_recent_commits after suspected truncation; re-push clean if no partial landed.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound

- **First cc-0017c-post-apply cron 85 fire** ≈2026-05-19 17:30 UTC.
- **1-week empirical observation window** — 2026-05-19 → 2026-05-26. Wave 7 (cc-0015) gated.
- No new v2.85 calendar items.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

v2.85: 1 fresh D-01 fire. T-MCP-02 cum **76** (was 75). L46 Evidence Gate exercised once (verbatim P-set + 9 weak_evidence items). L62 1× clean. State-capture exceptions v2.85: 0 (cum 1). Close-the-loop UPDATEs v2.85: 1 in-session (row `d18fa6db-...`). **22 outstanding** unchanged.

---

## 🤖 Cowork automation (D182)

Unchanged from v2.84. Cron 82/83/86 firing normally. V-C3 PENDING.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Wave 0d brief authoring** | friction.case triage/resolution SECURITY DEFINER (triage_case, resolve_case, reopen_case, purge_test_event) | **P1 (rank 1 NEW BLOCKING v2.85)** | NOT YET STARTED. service_role lost UPDATE on friction.case. | chat → PK | PK scope confirmation; multi-file brief. |
| **Reconciliation daily diagnostic** | First post-cc-0017c cron 85 fire | **P1 (rank 2 v2.85)** | OPEN. | chat → PK | Post-fire SQL + emit_event check. |
| **Health_check V-C3 diagnostic** | Cowork pipe | **P1 (rank 3 v2.85)** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire health doc. |
| **Music library activation** | video-worker v3.0.0 env-var gated | **P2 (rank 4 v2.85)** | PENDING PK. | PK + chat | Bucket + tracks + env + smoke. |
| **Platform Reconciliation View brief** | Reconciliation surface design | **P2 (rank 5 v2.85)** | NOT YET STARTED. | PK → chat | When PK directs. |
| **vchecks.md V-B4 doc patch** | Correct V-B4 to 12-param signature (L-v2.85-a follow-up) | **P3 (NEW v2.85)** | Doc-only. May fold into cc-0017c v1.2. | chat → PK | PK decides scope. |
| **cc-0017c v1.2 doc patch candidate** | Date correction + 3 D-01 references + V-B4 signature correction | **P3 (EXPANDED v2.85)** | Doc-only. | chat → PK | PK decides scope. |
| **cc-0015 friction-pool-view brief** (Wave 7) | Authored PENDING_EXECUTION | **P2 (Wave 7; gated on Wave 0d + 1-week window v2.85)** | DRAFTED commit `9a5dc155`. | chat → PK (Wave 7) | When window closes 2026-05-26. |
| **cc-0016 friction-capture-evidence brief** (Wave 8) | Authored PENDING_EXECUTION | **P2 (Wave 8; gated on Wave 0d + Wave 7)** | DRAFTED commit `f35f8ea4`. | chat → PK (Wave 8) | After Wave 7. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P2 carry | OBSERVED. | chat → PK | Verify + dry-run + re-enable. |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P2 carry | LOGGED. | chat → PK | Audit m.post_draft. |
| **Dashboard PHASES sync** | 38th consecutive deferral | P2 carry | Discipline call overdue. | chat → PK | Update roadmap page at next dashboard session. |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 carry | OPEN. | PK | When PK directs. |
| **Close-the-loop batch sweep — 22 escalated** | 21 historical CCH + 1 T-MCP-05 meta | P2 carry | Gated on PK directive. | chat → future PK | Hold. |
| **L-v2.78-a baseline promotion** | Reviewer convergence | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote alongside L-v2.81-a. |
| **L47 baseline promotion** | list_recent_commits before retry | P3 carry | 1 occurrence. **Re-exercised v2.85 in truncated-push detection** — see L-v2.85-e overlap. | chat → next session | Consider co-promotion with L-v2.85-e. |
| **L-v2.81-a baseline promotion** | Parallel-session coordination | P3 carry | 2 occurrences, eligible. | chat → next lesson cycle | Promote. |
| **L-v2.83-a promotion** | push_files response file-count verification | **P3 (6+ occurrences; STRONG CANDIDATE)** | Re-exercised v2.85. | chat → next lesson cycle | Promote. |
| **L-v2.84-a candidate** | Empirical-finding precedence | P3 carry | 1 occurrence; validated empirically v2.85. | chat → next session | Watcher. |
| **L-v2.84-b candidate** | Defensive idempotent REVOKE/GRANT | P3 carry | 1 occurrence; **validated empirically v2.85** (6 REVOKE no-ops + 2 effective all clean). | chat → next session | Watcher; eligible for promotion on re-exercise. |
| **L-v2.84-c candidate** | Path A corrected_action satisfaction | P3 carry | 1 occurrence. | chat → next session | Watcher. |
| **L-v2.84-d candidate** | Schema-probe-before-DML | P3 carry | 1 occurrence; possibly auto-resolved by L40 in v2.85 (no re-occurrence). | chat → next session | Watcher; resolve-by-baseline candidate. |
| **L-v2.85-a candidate (NEW)** | V-check function signature probe at brief authoring | **P3 NEW (1 occurrence; HIGH-SIGNAL)** | V-B4 7-param vs deployed 12-param. | chat → next session | Watcher; brief P-set probe recommendation. |
| **L-v2.85-b candidate (NEW)** | Inline V-check rewrite Path 1 | P3 NEW (1 occurrence) | PK Path 1 directive preserving correct migration. | chat → next session | Watcher. |
| **L-v2.85-c candidate (NEW)** | SECURITY DEFINER bypass post REVOKE | P3 NEW (1 occurrence) | V-B4 corrected confirmed. | chat → next session | Watcher; likely re-exercise at Wave 0d apply. |
| **L-v2.85-d candidate (NEW)** | Postgres-owner cleanup migration | P3 NEW (1 occurrence) | cc_0017c_v_b4_smoke_cleanup. | chat → Wave 0d | Recommendation: `friction.purge_test_event(uuid)` helper. |
| **L-v2.85-e candidate (NEW)** | push_files response-construction length budget | P3 NEW (1 occurrence) | Initial v2.85 close truncated mid-construction; clean repush succeeded after list_recent_commits verified no partial on main. | chat → next session | Watcher; mitigation: compact payloads + commit-state check on suspected truncation. |
| **Brief v1.2 doc patches (cc-0017a/c)** | Combined defects + lesson framing | P3 carry | DRAFT scope. | chat → future | Single doc patch when PK greenlights. |
| **Minor doc patches** (cc-0010A/0011/0012) | Various | P3 carry | HOLD. | chat → future | Doc-only. |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 audit** | 3 geography rows | P3 carry | OPEN. | chat → future | Cleanup brief. |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future | DDL + tile. |
| **Publisher latent config** | verify_jwt = false doc patch | P3 carry | OPEN. | chat → future | Single-file commit. |
| **M8b separate brief** | Function rename | P3 carry | NOT AUTHORED. | PK → chat | When PK directs. |
| **94-row un-publishable legacy cohort** | SQL filter per cc-0007 | P3 carry | LOGGED. | PK → chat | If PK directs. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 secret | P2 sec OPEN | PK approval gate. | chat → future | PK authorisation. |
| **morning-inbox-sweep-v1** | PK personal-email triage | P3 carry | DRAFT exists. | PK → chat | PK reviews. |
| **22 escalated m.chatgpt_review rows** | 21 CCH + 1 T-MCP-05 meta | P3 carry gated | Untouched per CCH. | chat → future PK | Hold. |
| **Memory cap hygiene** | 19/30 (11 free) | P3 carry | — | chat → future | As needed. |
| **Parallel agent coordination (L47)** | informational | P3 carry | No interference v2.85. | chat → future | Passive. |
| **Other carries** | Dashboard mobile / F-PUB-009 / CFW dead drafts / Vault service_role_key / 00_overview / F-AAP-NEEDS-REVIEW / F-AI-WORKER-PARSER-SKIP-BUG / 4× F-CRON-*-STALE / Emergency redeploy / f4a0dd85 health-check / feature branch `feature/cc-0009-stage-b-ef-source` / 3 pre-v2 forensic rows / Localhost FAB cleanup / 3 v2.77 D-01 close-the-loops | P2/P3 various | Unchanged from v2.84. | various | various |

**Closed v2.85:**
- cc-0017c apply (P1 rank 1 BLOCKED v2.84) → **CLOSED-APPLIED-WITH-VCHECK-CORRECTION** ✅ (`20260519004545`)
- Fresh D-01 fire (`d18fa6db-...`) → **resolved** ✅
- V-B4 PK Path 1 inline rewrite → **PASS** ✅
- V-B4 smoke cleanup → **applied** ✅ (`20260519005322`)
- Plan gate 10 → **CLOSED** ✅
- Friction.* Wave 0 → **COMPLETE** ✅

**Closed earlier:** v2.84 brief authoring + 2× D-01; v2.83 cc-0017b v1.1 doc patch; v2.82 cc-0017b apply; v2.81 cc-0017a apply; v2.80 cc-0017a authoring; v2.79 PK approval gate.

---

## 💼 Personal businesses

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK manual. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation

Unchanged from v2.76-v2.84.

---

## 📌 Backlog

**v2.85 state changes:**
- cc-0017c apply → CLOSED-APPLIED-WITH-VCHECK-CORRECTION (`20260519004545`).
- cc-0017c smoke cleanup → CLOSED-APPLIED (`20260519005322`).
- Fresh D-01 → resolved (`d18fa6db-...`, verdict AGREE).
- V-B4 brief defect → REMEDIATED via PK Path 1.
- Friction Register Consolidation Plan Wave 0 → COMPLETE; gate 11 ACTIVE; gate 12 NEW BLOCKING.
- Wave 0d brief authoring → P1 rank 1 BLOCKING (promoted from carry).
- T-MCP-02 cum 75 → 76 (+1 D-01).
- State-capture exceptions cum 1 (unchanged).
- friction.* schema: event_source_check → event_source_fk; service_role INSERT/UPDATE REVOKED on event+case; 0-row UPDATE no-op confirmed.
- 5 new L-candidates (a HIGH-SIGNAL, b, c, d, e).
- 3-file atomic push_files close (clean repush after initial truncation).
- Dashboard PHASES 38th carried.
- **No decisions.md change.**

---

## 🧊 Frozen / Deferred

Unchanged from v2.84.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a-f + L-v2.78-a + L47 + L-v2.81-a + L-v2.83-a + L-v2.84-a-d + L-v2.85-a-e candidates carried per v2.85.

- **L40 exercised v2.85** — column-name discipline maintained.
- **L41 not exercised v2.85** — cumulative 6 (v2.80-v2.85).
- **L46 exercised v2.85** — Evidence Gate.
- **L52-L65** various: not re-exercised v2.85.
- **L58 baseline**: 1× v2.85 (3-file close after retry; L-v2.85-e captures retry pattern).
- **L62 baseline-eligible**: exercised 1× v2.85 clean.
- **L-v2.76-a-f**: not re-exercised.
- **L-v2.78-a**: 2 occurrences, eligible.
- **L47**: 1 occurrence (overlap with L-v2.85-e detection step).
- **L-v2.81-a**: 2 occurrences, eligible per v2.83 PK directive.
- **L-v2.83-a**: 6+ occurrences, STRONG CANDIDATE.
- **L-v2.84-a/b/c/d**: 1 occurrence each (L-v2.84-d possibly auto-resolved by L40 in v2.85).
- **L-v2.85-a (HIGH-SIGNAL)** — V-check function signature validation at brief authoring.
- **L-v2.85-b** — Inline V-check rewrite Path 1 for brief-defect-during-apply.
- **L-v2.85-c** — SECURITY DEFINER bypass empirically confirmed post REVOKE.
- **L-v2.85-d** — Postgres-owner cleanup migration.
- **L-v2.85-e** — push_files length budget; truncation detection via list_recent_commits + clean repush.

All candidates recommended for promotion at appropriate cycle once empirical evidence accumulates.

---

## v2.85 honest limitations

- All v2.31–v2.84 limitations apply.
- **V-B4 brief defect was preventable.** L-v2.85-a addresses.
- **Cleanup migration entry** adds to history. Trade-off accepted.
- **V-A3 PARTIAL** is structural, anticipated by brief.
- **Wave 0d now BLOCKING** — case mutations require SECURITY DEFINER mediation.
- **Dashboard PHASES 38th deferral** carried per PK directive.
- **22 outstanding close-the-loop UPDATEs** unchanged.
- **Memory cap 19/30** unchanged.
- **Action_list size at v2.85**: ~28KB (compacted vs the truncated initial draft to mitigate L-v2.85-e).
- **Per-session files v2.85**: 1 — `2026-05-19-v2.85-cc0017c-applied-with-vcheck-correction.md`.
- **Doc-sync v2.85**: 1 commit (3-file atomic) after initial truncated attempt. Production mutations completed before truncation; no inconsistency.
- **Close-the-loop UPDATEs v2.85: 1** (in-session). 22 outstanding unchanged.
- **State-capture exceptions v2.85: 0**. Cumulative: 1.
- **Production mutations v2.85**: 2 apply_migration + 1 m.chatgpt_review row UPDATE (exempt).
- **No decisions.md change.**

---

## Changelog

- v1.0–v2.84: per commit history.
- **v2.85 (2026-05-19 Sydney morning, cc-0017c APPLIED-WITH-VCHECK-CORRECTION):**
  - Build arc: read sync_state v2.84 + brief sub-files → G3 review → PK G3 prep directive → P-set (5 read-only probes, all match/within envelope) → fresh D-01 fire (`d18fa6db-...` verdict AGREE) → PK apply approval → apply_migration `cc_0017c_friction_register_lockdown_and_backfill` v `20260519004545` → V-A1/A2/A3/B1/B2/B3 sequential PASS → V-B4 FAIL (brief defect 7-param vs deployed 12-param) → hard-stop + report → PK Path 1 directive → V-B4 corrected inline (12-param) ✅ PASS → V-C1/C2 ✅ PASS → cleanup migration `cc_0017c_v_b4_smoke_cleanup` v `20260519005322` → final state probe → close-the-loop UPDATE on `d18fa6db-...` → initial 3-file push_files truncated mid-construction → list_recent_commits confirmed no partial on main (HEAD still `2cdef219` v2.84 close) → clean repush succeeded (this commit).
  - cc-0017c APPLIED-WITH-VCHECK-CORRECTION. Wave 0 complete.
  - Fresh D-01 verdict AGREE — validates v2.84 honest limitation hypothesis (fresh empirical evidence delivers cleaner review than memorial pre-flight).
  - V-B4 brief defect remediated via PK Path 1; SECURITY DEFINER bypass empirically confirmed.
  - Wave 0d brief authoring NOW BLOCKING.
  - D-01 fires v2.85: 1. T-MCP-02 cum 76. State-capture exceptions 1 unchanged.
  - L-series: L40 exercised; L41 not exercised; L46 exercised; L58 applied (with retry); L62 exercised. L-v2.83-a +1 (6+ STRONG). 5 NEW L-v2.85 candidates (a HIGH-SIGNAL, b, c, d, e).
  - Active rows updated: cc-0017c apply + fresh D-01 + V-B4 + smoke cleanup → CLOSED; Wave 0d → NEW BLOCKING; vchecks.md V-B4 doc patch + cc-0017c v1.2 doc patch candidate → P3.
  - STATUS BLOCKS updated: Plan gate 10 CLOSED, gate 11 ACTIVE, gate 12 BLOCKING; cc-0017c rewritten.
  - Closure budget: ~3h v2.85. Trailing-14-day ~20h.
  - Doc-sync: 1 commit (3-file atomic after retry).
  - Production mutations: 2 apply_migration + 1 m.chatgpt_review UPDATE (exempt).
  - No decisions.md change.
