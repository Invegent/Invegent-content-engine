# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-18 Sydney evening (**v2.81 — cc-0017a Wave 0a APPLIED + 20/20 V-CHECKS PASS + L41/L47/L-v2.81-a.** Migration applied 2026-05-18 06:56:10 UTC by parallel Claude session under Path B clearance from D-01 review_id `adcc8385-...`. NOT v2.80-close chat (closed at 06:51:44 UTC with 0 mutations). NOT this session (read-only + V-checks only). Postgres `application_name=mgmt-api` connection signature confirms Supabase MCP origin. conversation_search project-scoped → parallel session in another project / Claude surface invisible. PK confirmed parallel apply, no security incident. **Path B → Path A conversion**: 15 read-only V-checks (V-A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A17, A18) PASS at session open; 5 write-based V-check pairs (V-A14a/b, V-A15a/b, V-A16a/b, V-A19a/b) + V-A20 cleanup PASS post-approval. Production state preserved: 22 cases / 22 events / 3 source seeds / 0 residual test rows. **Today/Next 5 rebuilt**: cc-0017b Wave 0b authoring → rank 1 (cc-0017a APPLY closed). T-MCP-02 cum unchanged at 71 (no new D-01). State-capture exceptions unchanged at 1. L41 exercised 3rd time across v2.80-v2.81 pair. L47 unchanged at 1 occurrence. **L-v2.81-a CANDIDATE PROPOSED**: parallel-session apply coordination — single applying chat per Path B clearance; next-session pre-flight non-skippable; applying session must update audit trail. 3-file atomic sync this commit (sync_state + this file + new per-session file). Dashboard PHASES **34th consecutive deferral**.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.80.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a (watcher → promotion-eligible v2.79) + L47-candidate carried. **D-IOL-001 (v2.77) carried.**

**v2.81 ADDITIONS:**
- **cc-0017a Wave 0a APPLIED + CLOSED.** Migration `cc_0017a_friction_foundational_schema` live at version `20260518065610`. 20/20 V-checks PASS. friction.* schema: 9 tables, 10 functions, 1 partial unique index. 22 existing cases backfilled.
- **D-01 review for cc-0017a closed at apply** (already resolved partial-type-c per PK Path B at 06:40 UTC v2.80; this session no new D-01).
- **cc-0017b Wave 0b authoring gate now OPEN.** P1 rank 1 v2.81.
- **Today/Next 5 rebuilt**: cc-0017b authoring → rank 1 (replaces cc-0017a APPLY which is now closed); ranks 2-4 unchanged from v2.80.
- **T-MCP-02 cum: 71** (unchanged from v2.80 — apply ran under prior clearance, no new D-01).
- **State-capture exceptions: 1** (unchanged).
- **L41 exercised 3rd time across v2.80-v2.81 pair**: (a) v1.0 brief existed pre-v2.80, (b) v1.1 patch ack-dropped, (c) parallel-session apply not in sync_state. Baseline tightening recommended at next lesson cycle.
- **L47 unchanged at 1 occurrence** (no GitHub MCP push-failure-with-dropped-ack this session).
- **L-v2.81-a CANDIDATE PROPOSED v2.81 (1 occurrence)**: *Parallel-session apply coordination. When a Path B clearance is granted, it can be acted on by ANY parallel Claude session with Supabase MCP access — across projects, across Claude surfaces, across browser tabs, across accounts. The chat-side audit trail (sync_state) cannot reliably observe parallel-session applies. Therefore: (i) operator should designate a single applying chat per Path B clearance; (ii) any next-session reading sync_state with an OPEN apply gate MUST run empirical pre-flight before assuming the gate is still open — sync_state is best-effort, pre-flight P-set is authoritative; (iii) applying session must commit audit-trail update to originating project's sync_state OR notify the operator to do so.* Promotion-eligible on re-exercise.
- **L-v2.78-a watcher candidate**: unchanged at 2 occurrences. Still eligible for baseline promotion.
- **3-file atomic push_files this session close** (sync_state + this file + new per-session file). L58 baseline applied correctly.
- **Dashboard PHASES sync: 34th consecutive deferral.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (recon daily diagnostic + health_check signal diagnostic + dashboard PHASES sync) — unchanged from v2.80 | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~13h (was ~11h v2.80; +cc-0017a apply v-check session + provenance investigation + close ≈ ~2h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.81 cycle: ~2h total** (session-open pre-flight HARD STOP + provenance investigation + 15 read-only V-checks + Path B→A conversion + 5 write-based V-check pairs + cleanup + 3-file atomic sync). 0 schema mutations this session.

**State-capture exception count v2.81: 0**. Cumulative: 1 (unchanged).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-18 Sydney evening (v2.81).
> **v2.81 note:** cc-0017a Wave 0a APPLIED + CLOSED this session via parallel-session apply confirmation + 20/20 V-check PASS pathway. cc-0017b Wave 0b authoring is the immediate next deliverable.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0017b Wave 0b authoring** | **P1 (rank 1 v2.81 — promoted from cc-0017a APPLY closed)** | cc-0017a Wave 0a delivered the foundational schema. Wave 0b is the unifying-emitter layer: `friction.emit_event(...)` per Amendment E (with `p_severity_override` + `p_dynamic_context`) + new attach-or-create trigger replacing `fn_promote_event_to_case` + reopen window N=14 days per §5.5 Clarification 1 + migration of 3 existing emit_* functions to thin wrappers + transition-step backfill of any NULL `dedupe_fingerprint` rows created between 0a apply (06:56 2026-05-18) and 0b apply. Per cc-0017a v1.1 brief shape. Brief authoring ~3-4h; D-01 + apply in separate sessions. | chat → PK | Read plan §6.7 + amendments E + §5.5 + cc-0014 + cc-0017a v1.1 + current `friction.*` schema state; author brief at `docs/briefs/cc-0017b-friction-register-unified-emit-event.md`. |
| 2 | **Reconciliation daily cadence diagnostic** | **P1 (rank 2 v2.81 carry from v2.80 rank 2)** | First daily fire 2026-05-17 17:30 UTC emitted 16 new friction events. Material exists. Three questions: did `r.cadence_drift_log` write rows? did `friction.event` write rows? are they paired correctly? Single read-only SQL run. | chat → PK | Post-fire SQL: count `r.cadence_drift_log` rows since 2026-05-17 17:00 + count `friction.event source='reconciliation'` rows same window. |
| 3 | **Health_check V-C3 + signal-production diagnostic** | **P1 (rank 3 v2.81 carry from v2.80 rank 3)** | V-C3 still PENDING since 2026-05-15. Cowork brief reset to v3.0 `status: ready` via commit `9215de77`. Awaiting next Cowork fire. | Cowork (scheduled) → chat | Check for new `docs/audit/health/YYYY-MM-DD.md` post-fire window; reconcile against friction.event. |
| 4 | **Music library activation** | **P2 (rank 4 v2.81 carry from v2.80 rank 4)** | Code wired in `video-worker` v3.0.0. ~30 min PK-led with chat guidance. | PK + chat | Create bucket `post-music`; upload 9 tracks; set env var; smoke test one video render. |
| — | (rank 5 unranked) | — | Next-natural candidate (close-the-loop batch sweep) gated on PK directive. Leave unranked until PK directs. | — | — |

**Standing P0 (not ranked):** Personal businesses check-in. Crazy Domains refund + clean-up follow-up carry from v2.51.

**Passive observation v2.81**: Cron 82 + 83 + 84 + 85 (daily) + 86 unchanged. PRV v1 operator views queryable via `op_reader` role. **friction.* schema state v2.81**: 9 tables (5 cc-0014 + 4 cc-0017a); 10 functions (9 cc-0014 + 1 new: `fn_compute_dedupe_fingerprint_v1`); 1 partial unique index (`case_open_dedupe_uniq`); `friction.event` = 22 rows; `friction.case` = 22 rows with sha256 `dedupe_fingerprint` all distinct + new columns at defaults; dedupe still broken until Wave 0b (max events/case = 1) — Wave 0b will close the gap with unified emit_event + new trigger. PostgREST exposed_schemas includes `friction`. /operations route live at HEAD `5753f41b`. Next natural fires: cron 85 daily 03:30 AEST (≈17:30 UTC); cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (UPDATED v2.81)

**Status v2.81: ✅ SIGNED 2026-05-18 (v2.79). Wave 0a APPLIED + CLOSED v2.81. Wave 0b authoring gate OPEN.**

**Documents committed:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`) — unchanged
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` (SIGNED with §5.5 + §9) — unchanged v2.81
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` (v1.0 at `068f8dcb`; v1.1 at `986e4bca`) — APPLIED v2.81
- Migration `cc_0017a_friction_foundational_schema` live at version `20260518065610` (single statement, 12,271 bytes, verbatim §5.2)
- `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` — v2.79
- `docs/runtime/sessions/2026-05-18-cc-0017a-v1.1-and-d01-fire.md` — v2.80
- `docs/runtime/sessions/2026-05-18-cc-0017a-applied-l41-l47.md` — v2.81 (this commit)

**32 decisions governing execution + 2 within-amendment clarifications:** unchanged v2.81.

**Open gates v2.81:**
1. ✅ PK explicit approval of v1 + amendments → CLOSED 2026-05-18 (v2.79)
2. ✅ cc-0017a brief authored → CLOSED v2.80 (v1.1 at `986e4bca`)
3. ✅ D-01 review for cc-0017a → CLOSED v2.80 (review_id `adcc8385-...`, resolved partial-type-c Path B)
4. ✅ **cc-0017a Wave 0a migration applied + V-checks PASS → CLOSED v2.81** (20/20 V-checks PASS, production state preserved, audit-trail provenance gap structural-only)
5. ⏳ **cc-0017b Wave 0b authoring + D-01 + apply → unblocks Waves 1-6** (next session priority rank 1)
6. ⏳ After 0b applied: friction.event volume should be empirically observed for 1 week before pool view design (Wave 7)

**v2.81 apply provenance disposition:** Migration applied 2026-05-18 06:56:10 UTC via Supabase Management API (`application_name=mgmt-api` connection signature) by a parallel Claude session under the Path B clearance from D-01 `adcc8385-...`. NOT v2.80-close session (8af15492, closed cleanly at 06:51:44 with explicit "0 production mutations"). NOT this v2.81 session (read-only + V-checks only). PK confirmed parallel-session apply. **No security incident.** Audit-trail gap structural (parallel-session apply not in originating project's sync_state) — addressed by L-v2.81-a candidate.

**Critical empirical findings preserved unchanged from v2.79.**

---

## 🟢 cc-0017a Wave 0a — STATUS BLOCK (NEW v2.81)

**Status v2.81: ✅ CLOSED-APPLIED.**

**Migration:** `cc_0017a_friction_foundational_schema` at version `20260518065610` (single statement, 12,271 bytes, verbatim brief v1.1 §5.2). Applied 2026-05-18 06:56:10 UTC via parallel Claude session under Path B clearance. PK confirmed.

**V-checks: 20/20 PASS** (15 read-only at session open; 5 write-based + V-A20 cleanup post-Path-A-conversion).

**Schema state delivered:**
- 4 new tables: `friction.source` (3 seed rows), `friction.emission_rule` (0 rows, DDL only), `friction.emission_rule_history` (0 rows, DDL only), `friction.notification_policy` (0 rows, DDL only)
- 9 new columns on `friction.case`: `resolved_at`, `effort_level`, `triaged_at`, `triaged_by`, `first_viewed_at`, `resolution_kind`, `reopen_count` (DEFAULT 0 NOT NULL), `predecessor_case_id`, `dedupe_fingerprint`
- 1 new function: `friction.fn_compute_dedupe_fingerprint_v1(text, text, jsonb) RETURNS text` (IMMUTABLE, SECURITY INVOKER)
- 1 partial unique index: `case_open_dedupe_uniq ON friction.case (dedupe_fingerprint) WHERE resolved_at IS NULL`
- 3 supporting indexes: `friction_case_open_idx`, `friction_case_triaged_idx`, `friction_case_predecessor_idx`
- 22 existing cases backfilled with sha256 fingerprints (all distinct, all open)
- Grants applied per role matrix

**Behavioural change scope: NONE.** Existing pipelines unchanged: 3 emit_* functions, `fn_promote_event_to_case` trigger, `friction-verification-daily` cron, cron 85 reconciliation daily fire — all run unchanged. New emitter cases continue to get `dedupe_fingerprint=NULL` (existing trigger doesn't set it); NULLs are distinct under partial unique index — no constraint violations. Wave 0b's transition step will backfill these NULLs before swapping the trigger.

**Open follow-ups for Wave 0b:**
- Author cc-0017b brief
- Transition-step backfill formula at start of cc-0017b migration
- emit_event signature finalisation (Amendment E params)
- Trigger replacement strategy (DROP + CREATE vs rename + parallel + drop)
- 3 emit_* functions migrated to thin wrappers

---

## 🟢 cc-0014 friction register — STATUS BLOCK (unchanged v2.81)

Unchanged. CLOSED-ARCHIVED 2026-05-18 (v2.77).

---

## 🟢 cc-0015 Friction Pool View — STATUS BLOCK (unchanged v2.81 — Wave 7)

Unchanged. AUTHORED PENDING_EXECUTION; SEQUENCED TO WAVE 7.

---

## 🟢 cc-0016 Friction Capture Evidence — STATUS BLOCK (unchanged v2.81 — Wave 8)

Unchanged. AUTHORED PENDING_EXECUTION; SEQUENCED TO WAVE 8.

---

## 🟢 cc-0012 PRV v1 — STATUS BLOCK (carried v2.81, condensed)

Unchanged. CLOSED-WITH-VERIFIED-VARIANCE v2.71.

---

## 🟢 cc-0010B ice-evidence-materialiser — STATUS BLOCK (carried v2.81, condensed)

Unchanged. CLOSED-WITH-VERIFIED-VARIANCE v2.68.

---

## 🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK (carried v2.81, condensed)

Unchanged. APPLIED + CLOSED v2.67.

---

## 🟢 Process Upgrades L44–L48 + L52–L65 + L-v2.76-a-f + L-v2.78-a + L47-candidate + L-v2.81-a-candidate — STATUS BLOCK (UPDATED v2.81)

**Status v2.81:** L40 reified v2.68. L44 + L45 + L46 + L48 baseline-eligible (carry from v2.76). **L58 BASELINE v2.76** carried (applied this session — atomic 3-file push_files). **L62 baseline-eligible v2.77** carried (not re-exercised v2.81 — no D-01 fire). L60 at 7 occurrences (carry). L63 + L64 + L65 candidates carry from v2.75. L-v2.76-a through L-v2.76-f carry.

**v2.81 cycle outcomes:**
- **L41 exercised 3rd time across v2.80-v2.81 pair**:
  - (a) v2.80: v1.0 brief existed at `068f8dcb` pre-v2.80 session, sync_state v2.79 didn't reference.
  - (b) v2.80: v1.1 patch push appeared to fail multiple times but had landed first time at `986e4bca`; ack dropped on MCP→client response chain.
  - (c) **v2.81 NEW**: migration applied at 06:56:10 UTC by parallel Claude session despite v2.80 sync_state explicit "0 production mutations / apply gate OPEN". Discovered via empirical pre-flight reconfirmation at session open. Cumulative L41 occurrences across v2.80-v2.81 pair: 3.
- **L58**: 3-file atomic push_files applied this session close — baseline correctly applied.
- **L62**: not re-exercised v2.81 (no D-01 fire — apply ran under prior v2.80 clearance).
- **L-v2.78-a watcher candidate**: not re-exercised v2.81 (no new reviewer convergence event). Unchanged at 2 occurrences. **STILL ELIGIBLE for baseline promotion at next session's lesson cycle.**
- **L47 CANDIDATE v2.80**: unchanged at 1 occurrence v2.81 (no push-failure-with-dropped-ack this session). Promotion eligible on re-exercise.
- **L-v2.81-a CANDIDATE PROPOSED v2.81 (1 occurrence)**: *Parallel-session apply coordination. When a Path B clearance is granted (apply deferred to a separate session), it can be acted on by ANY parallel Claude session with Supabase MCP access — across projects, across Claude surfaces (web / desktop / mobile / API client), across browser tabs, across accounts that share Supabase access. The chat-side audit trail (sync_state in any one project) cannot reliably observe parallel-session applies. Therefore: (i) operator should designate a single applying chat per Path B clearance and avoid spawning parallel sessions with apply rights; (ii) any next-session reading sync_state with an OPEN apply gate MUST run empirical pre-flight before assuming the gate is still open — sync_state is best-effort, pre-flight P-set is authoritative; (iii) applying session must commit audit-trail update to originating project's sync_state OR notify the operator to do so. If neither happens, the next session inherits a provenance gap that must be investigated via postgres logs (`application_name=mgmt-api`) + migration history + `m.chatgpt_review` + `conversation_search` + `recent_chats`.* Promotion-eligible on re-exercise. Baseline pattern would subsume L41 for cross-session DDL coordination.

**Cumulative recommendation v2.81:** With L41 exercised 3 times across v2.80-v2.81 pair, **formal baseline tightening recommended at next lesson cycle** — "empirical pre-flight before relying on sync_state for any execution decision." Defer the formal promotion call to PK at an appropriate session.

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.81)

Unchanged. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

**v2.81 update:**
- **Pre-flight evidence freshness from v2.80**: now historical and consumed by v2.81 apply session. No longer reusable for cc-0017b — fresh pre-flight P-set required at cc-0017b apply-session open.
- **Reconciliation daily diagnostic soft deadline carries** — next cron 85 fire ≈2026-05-19 03:30 AEST.
- **No new v2.81 calendar items.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.81 application**: 0 D-01 fires this session (apply ran under prior Path B clearance from v2.80). Cumulative T-MCP-02: **71** (unchanged from v2.80).

**L46 Evidence Gate v2.81**: not applied this session (no D-01).
**L62 v2.81 exercises**: 0 (no D-01). Baseline-eligible since v2.77; cumulative well past threshold.
**State-capture exceptions v2.81: 0.** Cumulative: 1 (unchanged).
**Close-the-loop UPDATEs v2.81: 0** (no new D-01 to close). **25 outstanding** (22 historical CCH-locked + 3 v2.77 new — unchanged from v2.80).

---

## 🤖 Cowork automation (D182)

**v2.81 status:** unchanged from v2.80. Cron 82 + 83 + 86 firing normally. V-C3 still PENDING live run.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0017b Wave 0b authoring** | Unified `friction.emit_event` + new trigger + reopen 14d + 3 emit_* to thin wrappers + 0a→0b NULL backfill | **P1 — rank 1 v2.81 (NEW, promoted from cc-0017a APPLY closed)** | EXECUTION GATE OPEN. Brief authoring ~3-4h. D-01 + apply in separate sessions per cc-0017a precedent. | chat → PK | Author `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` per cc-0017a v1.1 shape. |
| **Reconciliation daily cadence diagnostic** | First daily fire 2026-05-17 17:30 UTC; 16 new friction events emitted | **P1 (rank 2 v2.81 carry)** | OPEN. Material exists. Single read-only SQL session. | chat → PK | Post-fire SQL count comparison |
| **Health_check V-C3 + signal-production diagnostic** | Three sub-questions on Cowork pipe | **P1 (rank 3 v2.81 carry)** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md` |
| **Music library activation** | Code wired in video-worker v3.0.0; env-var gated | **P2 (rank 4 v2.81 carry)** | PENDING PK execution. | PK + chat | Create bucket; upload 9 tracks; set env var; smoke test |
| **cc-0015 friction-pool-view brief** | Authored PENDING_EXECUTION; Wave 7 | **P2 (Wave 7 v2.81 carry)** | DRAFTED. Commit `9a5dc155`. Wave 7 awaits empirical volume from Waves 1-6. | chat → PK (Wave 7) | Stage A re-scope when Wave 7 reached |
| **cc-0016 friction-capture-evidence brief** | Authored PENDING_EXECUTION; Wave 8 | **P2 (Wave 8 v2.81 carry)** | DRAFTED. Commit `f35f8ea4`. Wave 8 awaits Wave 7. | chat → PK (Wave 8) | Stage A unchanged as drafted |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | **P2 (carry v2.81)** | OBSERVED. Unblocked per D-IOL-001. | chat → PK | Verify throttles + dry-run + re-enable |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter + upstream chain | **P2 (carry v2.81)** | LOGGED. Unblocked per D-IOL-001. | chat → PK | Audit m.post_draft + decide filter expansion or chain investigation |
| **Dashboard PHASES sync** | PHASES array stale since 3 May | **P2 (carry v2.81 — 34th consecutive deferral)** | Unblocked per D-IOL-001. Trending strongly toward "first do dashboard sync, then continue" discipline call. | chat → PK | Update `app/(dashboard)/roadmap/page.tsx` at next dashboard session |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 (carry) | OPEN. | PK | When PK directs |
| **Close-the-loop batch sweep — 25 escalated remain** | Gated on PK directive | P2 (carry v2.81) | 22 historical + 3 v2.77 new. No additions v2.81 (no new D-01 this session). | chat → future PK directive | Hold pending PK lift of CCH + meta resolution |
| **L-v2.78-a baseline promotion** | Reviewer convergence is high-signal | **P3 (carry v2.81 — eligible at next lesson cycle)** | Still 2 occurrences (not re-exercised v2.81). | chat → next session | Promote to baseline at appropriate cycle |
| **L47 baseline promotion** | Check list_recent_commits before retrying apparent push failures | **P3 (carry v2.81 — 1 occurrence)** | 1 occurrence. Not re-exercised v2.81. | chat → next session | Promote on re-exercise |
| **L-v2.81-a baseline promotion (NEW v2.81)** | Parallel-session apply coordination | **P3 (NEW v2.81 — 1 occurrence)** | Proposed this session; cumulative L41 occurrences across v2.80-v2.81 pair = 3 supports baseline tightening direction. | chat → next session | Promote on re-exercise |
| **Brief v1.2 doc patch** | 6 defects + L60 + L63 + L64 + L65 + L-v2.76-a-f framing + L-v2.78-a + L47 + L-v2.81-a (if promoted) | P3 (carry, scope expanded v2.81) | DRAFT scope expanded v2.81 (add L-v2.81-a if promoted). Doc-only. | chat → future | Single doc patch when PK greenlights |
| **v1.1 cc-0012 minor doc patch (3 items)** | Var-A1 + Var-A2 + Var-A3 | P3 (carry) | HOLD | chat → future | Doc-only |
| **v1.6 cc-0010A doc patch (3 items)** | result_jsonb rename + trigger audit + queue_id non-FK | P3 (carry) | HOLD | chat → future | Doc-only |
| **v1.3 cc-0011 minor doc patch (5 items)** | E1 + Var-A/B/C/E | P3 (carry) | HOLD | chat → future | Doc-only |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 audit** | 3 geography rows + trigger filter | P3 (carry v2.71) | Strengthened v2.68. | chat → future | Separate cc-NNNN cleanup brief |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface | P2 — unblocked per D-IOL-001 | cc-0010A + cc-0010B delivered. | PK → chat | When PK greenlights |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future | DDL + tile |
| **Publisher latent config risk** | verify_jwt = false doc patch | P3 (carry) | OPEN | chat → future | Single-file commit |
| **M8b separate brief authoring** | Function rename | P3 (carry) | NOT YET AUTHORED | PK → chat | When PK directs |
| **94-row un-publishable legacy draft cohort** | SQL filter per cc-0007 | P3 (carry) | LOGGED | PK → chat → future | If PK directs |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 inline secret | P2 (security, OPEN) | OPEN | chat → future (PK approval) | PK authorisation |
| **morning-inbox-sweep-v1 brief amendment** | PK personal-email morning triage | P3 (carry) | DRAFT exists | PK → chat | PK reviews |
| **22 escalated m.chatgpt_review rows** | 21 historical CCH-locked + 1 T-MCP-05 meta | P3 (carry; gated) | Untouched per CCH | chat → future PK directive | Hold |
| **Memory cap hygiene** | 19/30 v2.81, unchanged | P3 (carry) | 11 free slots. | chat → future | Add as needed |
| **Parallel agent coordination (L47)** | informational | P3 (carry) | No conflicts observed (other than v2.81 parallel-session apply which is L-v2.81-a class). | chat → future | Passive observation |
| **Dashboard mobile responsiveness** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session | — |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → future | — |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future | — |
| **Vault `service_role_key` naming** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future | Read-only scope-check |
| **`00_overview.md` 11-section table** | Architecture review structure change | P3 | Required updates | chat → future | ~15 min |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure = Phase 2 B-09-14 | chat → Phase 2 | Bulk approve UI |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 natural OR synthetic test |
| **4× F-CRON-*-STALE** | jobids 1/29/30/31/39 | P2 | LOGGED | PK → future | Decide |
| **Emergency redeploy governance** | Expedited D-01? | P2 (PK decision) | PENDING PK | PK | PK rules |
| **`f4a0dd85` bridge health-check** | hygiene only | P3 (carry) | OBSERVED | PK → future | — |
| **Feature branch `feature/cc-0009-stage-b-ef-source`** | Audit artifact at HEAD `9796b0ee` | P3 (carry) | OBSERVED | PK → future | — |
| **3 pre-v2 forensic `r.reconciliation_run failed` rows** | cc-0010B Stage E pre-fire | P3 (carry v2.68) | PK forensic-accepted | informational | — |
| **github MCP write tools (L58 baseline)** | Per-file or atomic-push depending on coordination | informational (baseline) | Atomic push_files applied v2.81 (this 3-file sync close). | informational | — |
| **Localhost FAB cleanup** | `.env.local` still has flag enabled | P3 (carry) | OPEN — cross-surface duplicate risk | PK → future | Set value to false or delete line |
| **Close-the-loop UPDATEs for 3 v2.77 D-01 fires** | `3ff74643`, `6a90cacf`, `94bd6835` | P3 (carry from v2.77) | OPEN. Same close-the-loop class as 22 escalated. | chat → future PK directive | Include in next batch sweep |

**Closed v2.81:**
- **cc-0017a Wave 0a APPLY** (v2.80 rank 1) → **CLOSED-APPLIED** ✅ (20/20 V-checks PASS via Path A conversion path)
- **Provenance investigation for cc-0017a apply** → RESOLVED (parallel Claude session under Path B clearance from D-01 `adcc8385-...`; PK confirmed; no security incident; audit-trail gap structural-only and addressed by L-v2.81-a candidate)

**Closed v2.80:**
- cc-0017a Wave 0a authoring (v2.79 rank 1) → CLOSED ✅
- D-01 review for cc-0017a (`adcc8385-...`) → RESOLVED partial-type-c per PK Path B

**Closed v2.79:** PK approval gate (v2.78 rank 1); Amendment G reopen N → LOCKED 14 days; Amendment C triage metric basis → LOCKED phase-based.
**Closed v2.78:** No items closed (planning-only session).
**Closed v2.77:** cc-0014 operational window (archived early at Day 4); cron 85 weekly→daily promotion.
**Closed v2.76:** cc-0014 Stage E close; cc-0014 Stage D production deploy.
**Closed v2.75:** Stage D, E backend, E frontend, E promotion.
**Closed v2.71:** cc-0012 PRV v1 CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.70:** cc-0011 cadence-drift-checker CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.69:** cc-0010C reconciliation-matcher CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.68:** cc-0010B ice-evidence-materialiser CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.67:** cc-0010A v1.5 APPLIED + CLOSED.

---

## 💼 Personal businesses

**v2.81 carry (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check next session.

*(Standing P0 to ask at next session start. None raised v2.81.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.76 / v2.77 / v2.78 / v2.79 / v2.80.

---

## 📌 Backlog

**v2.81 changes:**

- **STATE CHANGE v2.81**: cc-0017a Wave 0a APPLY → CLOSED-APPLIED via parallel-session apply confirmation + 20/20 V-checks PASS via Path A conversion.
- **STATE CHANGE v2.81**: cc-0017b Wave 0b authoring → P1 rank 1 (NEW Active).
- **STATE CHANGE v2.81**: friction.* schema state advanced — 9 tables, 10 functions, 1 partial unique index, 22 cases backfilled with sha256 fingerprints.
- **STATE CHANGE v2.81**: T-MCP-02 cum 71 unchanged (no new D-01 — apply ran under prior clearance). State-capture exceptions unchanged at 1.
- **STATE CHANGE v2.81**: L41 exercised 3rd time across v2.80-v2.81 pair (parallel-session apply not in sync_state). Cumulative occurrences 3 — baseline tightening recommended at next lesson cycle.
- **STATE CHANGE v2.81**: L-v2.81-a candidate proposed (1 occurrence) — parallel-session apply coordination.
- **No new architectural decisions v2.81.**
- **3-file atomic push_files this session close** (sync_state + this file + new session file). L58 baseline applied correctly.
- **CARRIED v2.81**: Dashboard roadmap PHASES — **34th** consecutive deferral; still unblocked per D-IOL-001 for next dashboard session.

**Pre-v2.81 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged from v2.80.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a + L47-candidate + L-v2.81-a-candidate framing carried/added per v2.81. **v2.81 updates:**

- **L41 EXERCISED 3rd TIME v2.81**: parallel-session apply at 06:56:10 UTC not reflected in v2.80 sync_state "0 production mutations". Discovered via empirical pre-flight reconfirmation at session open. Cumulative L41 occurrences across v2.80-v2.81 pair: 3. Baseline pattern needs tightening — **empirical pre-flight is non-skippable even when sync_state is fresh and prior session ended cleanly**.
- **L52 / L53 / L55 / L57 / L59 / L60 / L63 / L64 / L65**: not re-exercised v2.81.
- **L58**: 3-file atomic push_files applied this session close (correct baseline application).
- **L62 baseline-eligible since v2.77**: not re-exercised v2.81 (no D-01 fire — apply ran under prior v2.80 clearance).
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.81; promotion still pending.
- **L-v2.78-a watcher candidate**: not re-exercised v2.81 (no new convergence event). Still at 2 occurrences. **ELIGIBLE FOR BASELINE PROMOTION at next session's lesson cycle.**
- **L47 CANDIDATE v2.80 (1 occurrence)**: not re-exercised v2.81 (no GitHub MCP push-failure-with-dropped-ack this session). Promotion-eligible on re-exercise.
- **L-v2.81-a CANDIDATE PROPOSED v2.81 (1 occurrence)**: *Parallel-session apply coordination — see Process Upgrades section above for full text.* Promotion-eligible on re-exercise. Baseline pattern would subsume L41 for cross-session DDL coordination.
- **No other new L-candidates v2.81.**

**All candidates recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates** (L37–L65 + L-v2.76-a-f + L-v2.78-a + L47-candidate + L-v2.81-a-candidate, plus standing baseline).

---

## v2.81 honest limitations

- All v2.31–v2.80 limitations apply.
- **The audit-trail provenance gap is a structural finding, not a fixed issue.** L-v2.81-a is candidate-only; until baseline, parallel-session apply discipline is non-codified operator-side practice.
- **Pre-flight evidence captured 06:40 UTC v2.80 in `m.chatgpt_review.context`** is now historical and consumed; cc-0017b will need a fresh pre-flight P-set.
- **friction.* schema state v2.81: 9 tables, 10 functions, 1 partial unique index.** Wave 0b will replace 3 emit_* functions + 1 trigger — introduces behavioural change scope deliberately deferred from 0a.
- **L47 still at 1 occurrence** — needs independent re-exercise.
- **L-v2.78-a still at 2 occurrences** — eligible for baseline promotion at next lesson cycle.
- **Cumulative L41 occurrences across v2.80-v2.81 pair: 3.** Formal baseline tightening recommended at next lesson cycle: "empirical pre-flight before relying on sync_state for any execution decision."
- **Dashboard PHASES at 34th consecutive deferral.** Friction work has pulled attention from dashboard sync for 30+ sessions. Trending strongly toward "first do dashboard sync, then continue" discipline call.
- **Memory cap 19/30** — unchanged. 11 free slots.
- **Action_list size at v2.81**: ~42KB (was ~38KB v2.80; net growth from v2.81 STATUS BLOCK additions + Today/Next 5 rebuild + L-v2.81-a candidate text + changelog).
- **Per-session files v2.81**: 1 — `2026-05-18-cc-0017a-applied-l41-l47.md` (this commit).
- **Doc-sync v2.81**: 1 commit this session (this 3-file atomic push_files). Dashboard PHASES 34th consecutive deferral.
- **Close-the-loop UPDATEs v2.81**: 0 (no new D-01). **25 outstanding** unchanged from v2.80.
- **State-capture exceptions v2.81: 0**. Cumulative: 1.
- **Production mutations v2.81**: 0 apply_migration; ~6 inserts + ~6 deletes on `friction.*` test rows via V-A14-A19 + V-A20 cleanup (net zero); 0 cron mutations; 0 EF deploys; 0 vault writes; 0 memory edits.
- **20/20 V-checks PASS** — strongest possible confirmation of correct schema state without re-applying the migration. Confidence very high.

---

## Changelog

- v1.0–v2.80: per commit history + sync_state archive.
- **v2.81 (2026-05-18 Sydney evening, cc-0017a Wave 0a APPLIED + 20/20 V-checks PASS + L41/L47/L-v2.81-a):**
  - **Build arc**: session open against v2.80 state → batched pre-flight reconfirmation returns post-apply state (HARD STOP) → migration history check confirms cc-0017a applied at 2026-05-18 06:56:10 UTC, single statement, 12,271 bytes, body verbatim §5.2 → present 3-path option to PK (A: self-confirm → V-checks; B: investigate provenance; C: rollback + re-apply) → PK directs Path B → 15 read-only V-checks PASS at session open → state recorded: "schema appears applied + valid; provenance unresolved" → Branch 2 read-only provenance investigation: postgres logs `application_name=mgmt-api` signature confirmed Supabase MCP path; API logs no DDL; m.chatgpt_review single D-01 (prior fire); migration history clean; conversation_search project-scoped, parallel session invisible → PK confirms parallel-session apply → Path B → Path A conversion → PK approves V-A14-A20 with 2 amendments (V-A20 unconditional; V-A15/16 split for audit clarity) → V-A14a/b PASS (closed cases same fingerprint, partial unique index correctly excludes closed) → V-A15a/b PASS (rule landed, duplicate raises 23505) → V-A16a/b PASS (policy landed, duplicate raises 23505) → V-A19 first attempt no-op (CTE laziness, no row written, no cleanup needed) → V-A19a PASS (emit_event fires, returns event_id) → V-A19b PASS (case created by existing trigger with dedupe_fingerprint=NULL on new column — observational invariant PROVEN) → V-A20 PASS (zero residual + production state preserved 22/22/3) → 4-way close drafted with L41/L47/L-v2.81-a parallel-session audit coordination note → PK approves with wording correction ("3 files in one atomic commit") → 3-file atomic push_files (this commit).
  - **cc-0017a Wave 0a CLOSED-APPLIED.** Migration `cc_0017a_friction_foundational_schema` live at version `20260518065610`. friction.* schema: 9 tables, 10 functions, 1 partial unique index. 22 cases backfilled with sha256 fingerprints all distinct.
  - **Provenance disposition**: parallel Claude session under Path B clearance from D-01 `adcc8385-...`. PK confirmed. No security incident. Audit-trail gap structural-only.
  - **Today/Next 5 rebuilt v2.81**: rank 1 = cc-0017b Wave 0b authoring (promoted from cc-0017a APPLY closed); ranks 2-4 unchanged from v2.80.
  - **D-01 fires v2.81: 0.** T-MCP-02 cum **71** unchanged. State-capture exceptions unchanged at 1.
  - **L-series outcomes**: L41 exercised 3rd time across v2.80-v2.81 pair (cumulative 3 — baseline tightening recommended). L47 unchanged at 1 occurrence. L62 not re-exercised. L58 applied (3-file atomic push_files). L-v2.78-a unchanged at 2 occurrences. **L-v2.81-a CANDIDATE PROPOSED (1 occurrence)**: parallel-session apply coordination — single applying chat per Path B clearance; next-session pre-flight non-skippable; applying session must update audit trail.
  - **Active rows updated v2.81**: cc-0017a APPLY → CLOSED; cc-0017b authoring → rank 1 Active NEW; L-v2.81-a baseline promotion row added P3.
  - **STATUS BLOCK v2.81 updated**: Friction Register Consolidation Plan gate 4 closed (apply + V-checks); gate 5 (cc-0017b authoring + D-01 + apply) now next. New STATUS BLOCK for cc-0017a Wave 0a CLOSED-APPLIED added.
  - **Closure budget**: ~2h v2.81 cycle. Trailing-14-day cumulative ~13h above 8.0h floor.
  - **Doc-sync v2.81**: 1 commit (this 3-file atomic push_files). Dashboard PHASES 34th consecutive deferral.
  - **Production mutations v2.81**: 0 apply_migration; ~6 inserts + ~6 deletes on friction.* test rows (net zero); 0 cron mutations; 0 EF deploys; 0 vault writes; 0 memory edits.
  - **T-MCP-02 cum**: 71 unchanged. State-capture exceptions: 1 unchanged. L-v2.78-a unchanged at 2 occurrences. L47 unchanged at 1 occurrence. L-v2.81-a candidate at 1 occurrence (proposed v2.81).
