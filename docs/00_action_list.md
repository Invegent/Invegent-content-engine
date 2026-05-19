# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-19 Sydney morning (**v2.84 — cc-0017c v1.0 + v1.1 BRIEF AUTHORED + 2× D-01 FIRED + BOTH CLOSE-THE-LOOPED + APPLY DEFERRED TO FRESH SESSION (Path C; no state-capture override consumed). v1.0 commit `92f9e868`; v1.1 commit `d3d8381f`. D-01 review_ids `a37eff28-...` (v1.0, partial verdict, corrected_action Option A satisfied) + `9e602a2d-...` (v1.1, partial verdict type-c echo, deferred per Path C). Both rows status=resolved. Production mutations 0. D-01 fires 2. T-MCP-02 cum 73→75. State-capture exceptions 1 unchanged. Apply gate remains closed. cc-0017c apply BLOCKED on fresh-session + PK explicit approval. Dashboard PHASES 37th consecutive deferral. 3-file atomic push_files close. 4 new lesson candidates v2.84.**) **Today/Next 5 rebuilt**: cc-0017c apply → rank 1 (BLOCKED on fresh-session); reconciliation diagnostic → rank 2; health_check V-C3 → rank 3; music library → rank 4; Platform Reconciliation View brief authoring → rank 5.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.83.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a (watcher → promotion-eligible v2.79) + L47-candidate + L-v2.81-a-candidate (now **2 occurrences, promotion-eligible per v2.83 PK directive**) carried. **D-IOL-001 (v2.77) carried.** **D-CC-0017B-Q1** (severity_override query-pattern note) carried. **4 NEW lesson candidates v2.84**: L-v2.84-a, L-v2.84-b, L-v2.84-c, L-v2.84-d.

**v2.84 ADDITIONS:**

- **cc-0017c brief authoring CLOSED — both v1.0 + v1.1.** v1.0 8-file commit `92f9e868`; v1.1 doc-only patch 8-file commit `d3d8381f` (Section C SQL narrowed to legal-domain-only per Path A; `'done'` recorded as out-of-scope).
- **cc-0017c v1.0 D-01 fire CLOSED.** review_id `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79`. Verdict partial. Corrected_action Option A (drop `'done'`) satisfied by v1.1 patch per PK Path A directive. close-the-loop UPDATE → status=resolved.
- **cc-0017c v1.1 D-01 re-fire CLOSED.** review_id `9e602a2d-1968-4f1d-b32a-24c514b491a0`. Verdict partial type-c (generic validation-process pushback; standard bridge auto-escalate for DDL). PK Path C: defer apply to fresh session; no state-capture override. close-the-loop UPDATE → status=resolved.
- **cc-0017c apply BLOCKED on fresh-session + PK explicit approval.** Pre-flight P-set rerun mandatory at apply session.
- **D-01 fires v2.84: 2.** T-MCP-02 cum **73 → 75**.
- **State-capture exceptions v2.84: 0.** Cumulative: 1 (unchanged — Path C consumed no override).
- **Today/Next 5 rebuilt v2.84**: cc-0017c apply → rank 1 (BLOCKED on fresh-session); reconciliation diagnostic → rank 2 (was rank 3 v2.83); health_check V-C3 → rank 3 (was rank 4); music library → rank 4 (was rank 5); Platform Reconciliation View brief authoring → rank 5 (NEW; unblocked per D-IOL-001 since v2.77).
- **L62 exercised twice v2.84** — full protocol applied to both D-01 cycles. Clean.
- **L41 not exercised v2.84** — no DDL via execute_sql; only DML on m.chatgpt_review (exempt per session memory).
- **L40 exercised v2.84** — runtime schema probe corrected column-name assumption on m.chatgpt_review (response field `review_id` ≠ DB column `id`).
- **L58 applied 3× v2.84** — v1.0 brief 8-file + v1.1 patch 8-file + this close 3-file. All atomic.
- **L-v2.81-a observed at v1.0 brief commit** (parent SHA mismatch with compaction-summary v2.83 close HEAD); observed not confirmed as occurrence 3. v1.1 patch parent matched cleanly.
- **L-v2.83-a candidate re-exercised 3×** (v1.0 + v1.1 + this close push_files calls).
- **L-v2.84-a candidate (NEW)** — empirical-finding precedence over idealised plan framing. First occurrence v1.0 brief.
- **L-v2.84-b candidate (NEW)** — defensive idempotent REVOKE/GRANT for permission migrations. First occurrence v1.0 brief.
- **L-v2.84-c candidate (NEW)** — D-01 corrected_action satisfaction pattern (Path A over state-capture override). First occurrence v1.1 patch.
- **L-v2.84-d candidate (NEW)** — schema-probe-before-DML-on-unfamiliar-table. First occurrence v1.0 D-01 close-the-loop initial UPDATE failure.
- **Closed Active rows v2.84**: cc-0017c brief authoring (v1.0 + v1.1); cc-0017c v1.0 D-01 fire; cc-0017c v1.1 D-01 re-fire.
- **New Active rows v2.84**: cc-0017c apply (BLOCKED on fresh-session + PK approval; P1 rank 1).
- **Dashboard PHASES sync: 37th consecutive deferral.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~4 (cc-0017c apply BLOCKED + recon daily diagnostic + health_check signal diagnostic + music library) — unchanged from v2.83 (cc-0017c D-01 closed; cc-0017c apply remains a single P1 item) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~17h (v2.83 1h + v2.84 ~2h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.84 cycle: ~2h total** (read sync_state v2.83 + verify v1.0 brief commit + author v1.0 brief 8-file + fire v1.0 D-01 + receive verdict + author v1.1 patch 8-file + close-the-loop v1.0 row + re-fire v1.1 D-01 + receive verdict + close-the-loop v1.1 row + 3-file atomic sync close). 0 schema mutations. 2 D-01 fires. 2 m.chatgpt_review close-the-loop UPDATEs (both rows new this session, neither in the 25-outstanding queue).

**State-capture exception count v2.84: 0**. Cumulative: 1 (unchanged — Path C consumed no override).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-19 Sydney morning (v2.84).
> **v2.84 note:** cc-0017c brief authoring fully closed (v1.0 + v1.1); both D-01 cycles closed. cc-0017c apply BLOCKED on fresh-session + PK explicit approval per Path C directive. **No apply this session.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0017c apply** | **P1 (rank 1 v2.84 — was rank 2 v2.83; status: BLOCKED on fresh-session)** | Brief v1.1 is the apply-time reference. v1.0 + v1.1 D-01 cycles complete. Per PK Path C: defer to fresh session. Pre-flight P-set rerun mandatory at apply session (drift detection vs v2.83 fact-finding reference). Fresh D-01 fire MAY be desired at apply session per PK choice. | chat → PK at fresh session | Fresh session start; PK explicit approval; pre-flight P-set rerun; (optional fresh D-01 with fresh evidence); single atomic apply_migration; 9 V-checks; close-the-loop UPDATE on apply-session D-01 row. |
| 2 | **Reconciliation daily cadence diagnostic** | **P1 (rank 2 v2.84 — was rank 3 v2.83)** | cron 85 next fire ≈2026-05-19 03:30 AEST (≈17:30 UTC). Question: did cc-0017b wrappers route correctly through unified `emit_event`? | chat → PK | Post-fire SQL count comparison + emit_event signature check. |
| 3 | **Health_check V-C3 + signal-production diagnostic** | **P1 (rank 3 v2.84 — was rank 4 v2.83)** | V-C3 still PENDING since 2026-05-15. Cowork brief reset to v3.0 `status: ready`. Awaiting next Cowork fire. | Cowork (scheduled) → chat | Check for new `docs/audit/health/YYYY-MM-DD.md` post-fire window; reconcile against friction.event. |
| 4 | **Music library activation** | **P2 (rank 4 v2.84 — was rank 5 v2.83)** | Code wired in video-worker v3.0.0. ~30 min PK-led with chat guidance. | PK + chat | Create bucket `post-music`; upload 9 tracks; set env var; smoke test one video render. |
| 5 | **Platform Reconciliation View brief authoring** | **P2 (rank 5 v2.84 — NEW; unblocked per D-IOL-001 since v2.77)** | Reconciliation surface design; cc-0010A + cc-0010B delivered; PK greenlight required. | PK → chat | When PK directs; multi-file brief structure following cc-0017* precedent. |

**Standing P0 (not ranked):** Personal businesses check-in. Crazy Domains refund + clean-up follow-up carry from v2.51.

**Passive observation v2.84**: Cron 82 + 83 + 84 + 85 (daily) + 86 unchanged. PRV v1 operator views queryable via `op_reader` role. **friction.* schema state v2.84**: 9 tables (unchanged); 12 functions (unchanged); 1 partial unique index (unchanged); 1 corrective fix on emit_event (unchanged); 3 emission_rule seeds active; 22 events + 22 cases (unchanged — no production mutations this session). PostgREST exposed_schemas includes `friction`. /operations route live. Next natural fires: cron 85 daily 03:30 AEST (≈17:30 UTC); cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (UPDATED v2.84)

**Status v2.84: ✅ SIGNED 2026-05-18 (v2.79). Wave 0a APPLIED + CLOSED v2.81. Wave 0b APPLIED-WITH-CORRECTIVE-MIGRATION + CLOSED v2.82. Wave 0b v1.1 doc patch CLOSED-APPLIED-ON-MAIN v2.83. Wave 0c brief authoring CLOSED v2.84 (v1.0 + v1.1). Wave 0c D-01 cycles CLOSED v2.84 (v1.0 partial→Path A; v1.1 partial type-c→Path C deferred). Wave 0c apply BLOCKED on fresh-session + PK explicit approval.**

**Documents committed:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`) — unchanged
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` (SIGNED with §5.5 + §9) — unchanged
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` (v1.1) — APPLIED v2.81
- Migration `cc_0017a_friction_foundational_schema` live at version `20260518065610` — APPLIED v2.81
- `docs/briefs/cc-0017b-friction-register-unified-emit-event.md` v1.1 — APPLIED v2.82, doc-patch CLOSED v2.83
- Migration `cc_0017b_friction_unified_emit_event` live (main) — APPLIED v2.82
- Migration `cc_0017b_emit_event_ambiguity_fix` live (corrective) — APPLIED v2.82
- **`docs/briefs/cc-0017c-friction-register-lockdown-and-backfill.md` v1.1** — **AUTHORED v2.84** (8-file structure: index + 7 sub-files under `docs/briefs/cc-0017c/`)
- **Migration `cc_0017c_friction_register_lockdown_and_backfill`** — **NAME RESERVED; NOT APPLIED v2.84** (BLOCKED on fresh-session)
- `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` — v2.79
- `docs/runtime/sessions/2026-05-18-cc-0017a-v1.1-and-d01-fire.md` — v2.80
- `docs/runtime/sessions/2026-05-18-cc-0017a-applied-l41-l47.md` — v2.81
- `docs/runtime/sessions/2026-05-18-cc-0017b-applied.md` — v2.82
- `docs/runtime/sessions/2026-05-18-v2.83-cc0017b-v1.1-close-cc0017c-open.md` — v2.83
- **`docs/runtime/sessions/2026-05-19-v2.84-cc0017c-v1.0-v1.1-d01-deferred.md`** — **v2.84 (this commit)**

**32 decisions governing execution + 2 within-amendment clarifications:** unchanged v2.84. D-CC-0017B-Q1 carried.

**Open gates v2.84:**
1. ✅ PK explicit approval of v1 + amendments → CLOSED 2026-05-18 (v2.79)
2. ✅ cc-0017a brief authored → CLOSED v2.80
3. ✅ D-01 review for cc-0017a → CLOSED v2.80
4. ✅ cc-0017a Wave 0a migration applied + V-checks PASS → CLOSED v2.81
5. ✅ cc-0017b brief authored + D-01 + apply → CLOSED v2.82
6. ✅ cc-0017b v1.1 doc patch → CLOSED-APPLIED-ON-MAIN v2.83
7. ✅ **cc-0017c brief authored → CLOSED v2.84 (v1.0 commit `92f9e868` + v1.1 doc-only patch `d3d8381f`)**
8. ✅ **cc-0017c v1.0 D-01 fire → CLOSED v2.84 (review_id `a37eff28-...`, status=resolved, corrected_action Option A satisfied)**
9. ✅ **cc-0017c v1.1 D-01 re-fire → CLOSED v2.84 (review_id `9e602a2d-...`, status=resolved, deferred per Path C)**
10. ⏳ **cc-0017c apply** — BLOCKED on fresh-session + PK explicit approval (P1 rank 1 v2.84)
11. ⏳ After cc-0017c applied: friction.event volume empirically observed for 1 week before pool view design (Wave 7)

**v2.84 provenance:** v1.0 + v1.1 brief commits + v1.0/v1.1 D-01 fires + v1.0/v1.1 close-the-loop UPDATEs + this 4-way sync close all by chat-side Claude this session. No parallel-agent contributions observed at v1.1 patch commit parent (matched v1.0 commit cleanly).

**Critical empirical findings preserved unchanged from v2.79–v2.83.**

---

## 🟢 cc-0017c Wave 0c — STATUS BLOCK (UPDATED v2.84)

**Status v2.84: ⏳ BRIEF AUTHORED (v1.0 + v1.1) + 2× D-01 CYCLES CLOSED + APPLY BLOCKED ON FRESH-SESSION + PK EXPLICIT APPROVAL.**

**Brief commits:**
- **v1.0**: `92f9e868` (8 files: index + 7 sub-files). 2026-05-19 Sydney morning.
- **v1.1 doc-only patch**: `d3d8381f` (8 files, same paths as v1.0). 2026-05-19 Sydney morning.

**v1.1 SQL changes from v1.0** (Path A per D-01 corrected_action + PK directive):
- `migration-sql.md` Section C: WHERE narrowed to `IN ('suppress','ignore','duplicate')`; CASE branch for `'done' → 'acted_on'` dropped
- `preflight-pset.md` P-3: `backfill_candidate_count` filter narrowed; `done_count_audit` added as defensive observation
- `vchecks.md` V-C1: filters narrowed; `done_count_audit` added
- `hardstop-rollback.md`: §5.5-C pre-apply snapshot WHERE narrowed; NEW hard-stop trigger §5.4-A3b for `done_count_audit > 0`
- `risks-and-grants.md §3.4`: Option A finalised; Option B + Option C documented as considered-and-not-selected
- `d01-postapply-deferred.md`: known_weak_evidence #1 rewritten to reflect Option A resolution; v1.0 close-the-loop SQL documented
- `lessons-metadata-changelog.md`: v1.1 changelog entry; new L-v2.84-c candidate recorded; Metadata version bumped
- Index file: brief version v1.0 → v1.1; status AUTHORED_PENDING_D01_REFIRE

**D-01 cycles:**
- **v1.0 D-01**: review_id `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79`. Verdict partial. risk medium. confidence high. routing `escalate_explicit_flag`. Corrected_action: "Revise to current-domain-only mapping (Option A): Drop 'done' from WHERE and from CASE". PK directive: Proceed with Path A. SATISFIED by v1.1 patch. Close-the-loop UPDATE 2026-05-19 00:08:58 UTC → status=resolved, resolved_by='cc-0017c-v1.0-path-A-corrected-action-accepted'.
- **v1.1 D-01**: review_id `9e602a2d-1968-4f1d-b32a-24c514b491a0`. Verdict partial. risk medium. confidence high. routing `escalate_explicit_flag`. Verified claims include "v1.1 patch authored and committed to satisfy v1.0 D-01 corrected action per PK directive 'Proceed with Path A'" and "P-3 backfill candidate probe confirms expected 0 for 'done' action decision". Pushback was generic validation-process echo (type-c) — "reassess testing process"; standard bridge auto-escalate for DDL. PK directive: Path C — defer apply to fresh session; no state-capture override consumed. Close-the-loop UPDATE 2026-05-19 00:18:04 UTC → status=resolved, resolved_by='cc-0017c-v1.1-path-C-deferred-fresh-session-no-override'.

**Apply status:** BLOCKED on **fresh-session + PK explicit approval**. Pre-flight P-set rerun mandatory at apply session (drift detection vs v2.83 fact-finding reference). Fresh D-01 fire at apply session is PK choice (v1.1 D-01 already gave verdict but is type-c; fresh fire with fresh pre-flight evidence may be substantively cleaner per PK call).

**Wave 0c scope (per PK 4-item directive — verbatim — UNCHANGED across v1.0/v1.1):**
1. FK hardening on `friction.event.source` — DROP CONSTRAINT `event_source_check` (CHECK enum) + ADD CONSTRAINT `event_source_fk` FK→`friction.source(source_code)`
2. Direct-write lockdown REVOKE — INSERT/UPDATE on `friction.event` + `friction.case` from service_role + PUBLIC + authenticated + anon
3. `resolved_at`/`resolution_kind` backfill — v1.1 narrowed to legal-domain-only set `('suppress','ignore','duplicate')`
4. Pre-flight grant capture for exact rollback

**Out of scope (carried unchanged across v1.0/v1.1):**
- `case.dedupe_fingerprint NOT NULL` (carried from cc-0017b)
- `emission_rule_history` audit trigger (carried from cc-0017b)
- Expanding `case_action_decision_check` to include `'done'` (Amendment G nomenclature work; not authorised at v2.84 per PK Path A directive)
- CHECK/trigger enforcing closure invariant write-side
- Wave 0d triage/resolution SECURITY DEFINER functions
- Wave 0e audit history shadow tables

**Empirical state at brief authoring (v2.83 fact-finding, carried unchanged across v1.0/v1.1):**
- 22 events / 22 cases / 3 source seeds (reconciliation, health_check, manual; all is_active=true)
- 0 backfill candidate rows (action_decision IN ('suppress','ignore','duplicate') AND resolved_at IS NULL)
- 22/22 events have valid FK target (orphan-free for FK swap)
- service_role grants: friction.event INSERT/SELECT; friction.case INSERT/SELECT/UPDATE
- No PUBLIC/authenticated/anon grants on either table
- `'done'` is NOT in legal `case_action_decision_check` domain

**Open follow-ups for Wave 0d+ (post-cc-0017c apply):**
- Wave 0d triage/resolution SECURITY DEFINER functions (required because service_role loses UPDATE on friction.case post-cc-0017c apply)
- Wave 0e audit history shadow tables (case_history)
- Empirical observation of friction.event volume post-cc-0017c across all 3 source paths for 1 week before Wave 7 pool view design

---

## 🟢 cc-0017b Wave 0b — STATUS BLOCK (carried unchanged from v2.83)

Unchanged. CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION v2.82 + v1.1 doc patch CLOSED-APPLIED-ON-MAIN v2.83.

---

## 🟢 cc-0017a Wave 0a — STATUS BLOCK (carried unchanged from v2.82)

Unchanged. CLOSED-APPLIED v2.81.

---

## 🟢 cc-0014 friction register — STATUS BLOCK (unchanged v2.84)

Unchanged. CLOSED-ARCHIVED 2026-05-18 (v2.77).

---

## 🟢 cc-0015 Friction Pool View — STATUS BLOCK (unchanged v2.84 — Wave 7)

Unchanged. AUTHORED PENDING_EXECUTION; SEQUENCED TO WAVE 7.

---

## 🟢 cc-0016 Friction Capture Evidence — STATUS BLOCK (unchanged v2.84 — Wave 8)

Unchanged. AUTHORED PENDING_EXECUTION; SEQUENCED TO WAVE 8.

---

## 🟢 cc-0012 / cc-0010B / cc-0010A — STATUS BLOCKS (carried unchanged v2.84)

All unchanged from v2.83. CLOSED-WITH-VERIFIED-VARIANCE or APPLIED+CLOSED per respective sessions.

---

## 🟢 Process Upgrades L44–L48 + L52–L65 + L-v2.76-a-f + L-v2.78-a + L47-candidate + L-v2.81-a-candidate + L-v2.84 NEW candidates — STATUS BLOCK (UPDATED v2.84)

**Status v2.84:** L40 reified v2.68. L44 + L45 + L46 + L48 baseline-eligible (carry). **L58 BASELINE v2.76** carried (applied 3× this session). **L62 baseline-eligible v2.77** — **exercised twice v2.84** (v1.0 + v1.1 D-01 cycles, both clean). L60 at 7 occurrences (carry). L63 + L64 + L65 candidates carry. L-v2.76-a through L-v2.76-f carry.

**v2.84 cycle outcomes:**

- **L41 not exercised v2.84** — no DDL via execute_sql; only DML on m.chatgpt_review (exempt per session memory). Cumulative occurrences v2.80–v2.84 = 6 (unchanged).
- **L58 applied 3× v2.84** — v1.0 brief 8-file + v1.1 patch 8-file + this close 3-file. All atomic.
- **L62 exercised 2× v2.84** — full protocol applied to both D-01 cycles. Clean.
- **L40 exercised v2.84** — runtime schema probe on m.chatgpt_review (column name `id` not `review_id`). Reinforces baseline.
- **L-v2.78-a watcher candidate**: not re-exercised v2.84 (no new reviewer convergence event). Unchanged at 2 occurrences.
- **L47 CANDIDATE v2.80**: not re-exercised v2.84. Unchanged at 1 occurrence.
- **L-v2.81-a CANDIDATE v2.81**: observed at v1.0 brief commit (parent SHA mismatch with compaction-summary v2.83 close HEAD) but not confirmed as occurrence 3. v1.1 patch parent matched cleanly. Unchanged at 2 occurrences. Promotion-eligible per v2.83 PK directive.
- **L-v2.83-a candidate**: re-exercised 3× v2.84 (v1.0 brief push 8/8 + v1.1 patch push 8/8 + this close push 3/3 to verify post-call). Movement toward promotion.
- **L-v2.84-a candidate (NEW v2.84)**: first occurrence — empirical-finding precedence over idealised plan framing. v1.0 brief surfaced Amendment F + G divergences explicitly via named options. Reviewer + PK selected cleanly from named options. Pattern validated.
- **L-v2.84-b candidate (NEW v2.84)**: first occurrence — defensive idempotent REVOKE/GRANT for permission migrations. v1.0 brief `migration-sql.md §5.2 Section B`. Carried unchanged in v1.1.
- **L-v2.84-c candidate (NEW v2.84)**: first occurrence — D-01 corrected_action satisfaction pattern (Path A over state-capture override). v1.1 patch satisfying v1.0 D-01 corrected_action Option A. Documented at `lessons-metadata-changelog.md` v1.1 entry.
- **L-v2.84-d candidate (NEW v2.84)**: first occurrence — schema-probe-before-DML-on-unfamiliar-table. Initial UPDATE on m.chatgpt_review failed: tool response field name `review_id` vs DB column name `id`. Lost ~1 tool call to assumption-based UPDATE.

**Cumulative recommendation v2.84:** L-v2.78-a + L-v2.81-a both at 2 occurrences each (unchanged); both eligible for baseline promotion. L-v2.83-a moved to 5+ occurrences (3 this session + 2 prior) — promotion candidate strengthening. L41 cumulative 6 across v2.80–v2.84 (unchanged); formal baseline tightening still recommended. 4 new lesson candidates v2.84 (L-v2.84-a through L-v2.84-d), all first occurrences.

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.84)

Unchanged. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

**v2.84 update:**
- **Reconciliation daily diagnostic soft deadline**: next cron 85 fire ≈2026-05-19 03:30 AEST (≈17:30 UTC). Worth re-checking post-fire to confirm cc-0017b wrappers route correctly through emit_event.
- **cc-0017c apply at fresh session**: no specific deadline; PK explicit approval gate.
- **No new v2.84 calendar items.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.84 application**: 2 D-01 fires this session (v1.0 + v1.1). Cumulative T-MCP-02: **75** (was 73 entering v2.84).

**L46 Evidence Gate v2.84**: exercised twice (both fires included verbatim P-set output and explicit weak-evidence disclosure).
**L62 v2.84 exercises**: 2 (full protocol both times, clean).
**State-capture exceptions v2.84: 0.** Cumulative: 1 (unchanged — Path C consumed no override).
**Close-the-loop UPDATEs v2.84: 2** (both rows new this session, neither in 25-outstanding queue). **25 outstanding** unchanged.

---

## 🤖 Cowork automation (D182)

**v2.84 status:** unchanged from v2.83. Cron 82 + 83 + 86 firing normally. V-C3 still PENDING live run.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0017c apply** | Wave 0c migration apply (single atomic apply_migration: FK swap + REVOKE lockdown + backfill UPDATE) | **P1 (rank 1 v2.84 — BLOCKED on fresh-session)** | BLOCKED on fresh-session + PK explicit approval per Path C directive. Pre-flight P-set rerun mandatory. Fresh D-01 fire is PK choice. | chat → PK at fresh session | Fresh session start; PK approval; pre-flight P-set rerun; (optional fresh D-01); apply_migration; 9 V-checks; close-the-loop UPDATE. |
| **Reconciliation daily cadence diagnostic** | First post-cc-0017b cron 85 fire ≈2026-05-19 03:30 AEST | **P1 (rank 2 v2.84 — was rank 3 v2.83)** | OPEN. Material exists; cc-0017b adds the question "did wrappers route through emit_event correctly?" | chat → PK | Post-fire SQL count comparison + emit_event signature check |
| **Health_check V-C3 + signal-production diagnostic** | Three sub-questions on Cowork pipe | **P1 (rank 3 v2.84 — was rank 4 v2.83)** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md` |
| **Music library activation** | Code wired in video-worker v3.0.0; env-var gated | **P2 (rank 4 v2.84 — was rank 5 v2.83)** | PENDING PK execution. | PK + chat | Create bucket; upload 9 tracks; set env var; smoke test |
| **Platform Reconciliation View brief authoring** | Reconciliation surface design; cc-0010A + cc-0010B delivered | **P2 (rank 5 v2.84 — NEW; unblocked per D-IOL-001)** | NOT YET STARTED. PK greenlight required. | PK → chat | When PK directs; multi-file brief structure following cc-0017* precedent |
| **cc-0015 friction-pool-view brief** | Authored PENDING_EXECUTION; Wave 7 | **P2 (Wave 7 v2.84 carry)** | DRAFTED. Commit `9a5dc155`. Wave 7 awaits empirical volume from Waves 1-6. | chat → PK (Wave 7) | Stage A re-scope when Wave 7 reached |
| **cc-0016 friction-capture-evidence brief** | Authored PENDING_EXECUTION; Wave 8 | **P2 (Wave 8 v2.84 carry)** | DRAFTED. Commit `f35f8ea4`. Wave 8 awaits Wave 7. | chat → PK (Wave 8) | Stage A unchanged as drafted |
| **cc-0017c v1.2 doc patch candidate** | Date correction + v1.1 D-01 reference + optional validation-narrative for fresh D-01 | **P3 (NEW v2.84)** | Brief content has "Sydney late evening 2026-05-18" dates; UTC empirical timestamps show 2026-05-19 morning. v1.1 D-01 row `9e602a2d-...` reference could be added. Optional validation-infrastructure narrative to D-01 evidence package §6 if fresh D-01 at apply session is chosen. | chat → PK | PK decides scope; doc-only patch |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | **P2 (carry v2.84)** | OBSERVED. Unblocked per D-IOL-001. | chat → PK | Verify throttles + dry-run + re-enable |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter + upstream chain | **P2 (carry v2.84)** | LOGGED. Unblocked per D-IOL-001. | chat → PK | Audit m.post_draft + decide filter expansion or chain investigation |
| **Dashboard PHASES sync** | PHASES array stale since 3 May | **P2 (carry v2.84 — 37th consecutive deferral)** | Unblocked per D-IOL-001. Discipline call increasingly overdue. | chat → PK | Update `app/(dashboard)/roadmap/page.tsx` at next dashboard session |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 (carry) | OPEN. | PK | When PK directs |
| **Close-the-loop batch sweep — 25 escalated remain** | Gated on PK directive | P2 (carry v2.84) | 22 historical + 3 v2.77 new. No additions v2.84 (the 2 new this session were closed in-session). | chat → future PK directive | Hold pending PK lift of CCH + meta resolution |
| **L-v2.78-a baseline promotion** | Reviewer convergence is high-signal | **P3 (carry v2.84 — eligible at next lesson cycle)** | 2 occurrences (unchanged). | chat → next lesson cycle | Promote alongside L-v2.81-a |
| **L47 baseline promotion** | Check list_recent_commits before retrying apparent push failures | **P3 (carry v2.84 — 1 occurrence)** | 1 occurrence. Not re-exercised v2.84. | chat → next session | Promote on re-exercise |
| **L-v2.81-a baseline promotion** | Parallel-session work coordination | **P3 (carry v2.84 — 2 occurrences, ELIGIBLE for promotion per v2.83 PK directive)** | 2 occurrences. Not confirmed re-exercise v2.84 (parent SHA observation at v1.0 brief commit was inconclusive). | chat → next lesson cycle | Promote alongside L-v2.78-a |
| **L-v2.83-a candidate promotion** | push_files response file-count verification (dual of L47) | **P3 (carry v2.84 — re-exercised 3× this session; 5+ occurrences cumulative)** | Strong promotion candidate. | chat → next lesson cycle | Promote based on cumulative occurrence count |
| **L-v2.84-a candidate** | Empirical-finding precedence over idealised plan framing | **P3 (NEW v2.84 — 1 occurrence)** | First occurrence at v1.0 brief authoring. Pattern validated by reviewer + PK selecting from named options. | chat → next session | Watcher; promote on re-exercise |
| **L-v2.84-b candidate** | Defensive idempotent REVOKE/GRANT for permission migrations | **P3 (NEW v2.84 — 1 occurrence)** | First occurrence at v1.0 brief `migration-sql.md §5.2 Section B`. | chat → next session | Watcher; promote on re-exercise |
| **L-v2.84-c candidate** | D-01 corrected_action satisfaction pattern (Path A over state-capture override) | **P3 (NEW v2.84 — 1 occurrence)** | First occurrence at v1.1 patch satisfying v1.0 D-01 Option A. | chat → next session | Watcher; promote on re-exercise |
| **L-v2.84-d candidate** | Schema-probe-before-DML-on-unfamiliar-table | **P3 (NEW v2.84 — 1 occurrence)** | First occurrence: m.chatgpt_review column-name mismatch (response field `review_id` ≠ DB column `id`). | chat → next session | Watcher; promote on re-exercise |
| **Brief v1.2 doc patch (cc-0017a)** | 6 defects + L60 + L63 + L64 + L65 + L-v2.76-a-f framing + L-v2.78-a + L47 + L-v2.81-a | P3 (carry v2.84) | DRAFT scope unchanged v2.84. Doc-only. | chat → future | Single doc patch when PK greenlights |
| **v1.1 cc-0012 minor doc patch (3 items)** | Var-A1 + Var-A2 + Var-A3 | P3 (carry) | HOLD | chat → future | Doc-only |
| **v1.6 cc-0010A doc patch (3 items)** | result_jsonb rename + trigger audit + queue_id non-FK | P3 (carry) | HOLD | chat → future | Doc-only |
| **v1.3 cc-0011 minor doc patch (5 items)** | E1 + Var-A/B/C/E | P3 (carry) | HOLD | chat → future | Doc-only |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 audit** | 3 geography rows + trigger filter | P3 (carry v2.71) | Strengthened v2.68. | chat → future | Separate cc-NNNN cleanup brief |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future | DDL + tile |
| **Publisher latent config risk** | verify_jwt = false doc patch | P3 (carry) | OPEN | chat → future | Single-file commit |
| **M8b separate brief authoring** | Function rename | P3 (carry) | NOT YET AUTHORED | PK → chat | When PK directs |
| **94-row un-publishable legacy draft cohort** | SQL filter per cc-0007 | P3 (carry) | LOGGED | PK → chat → future | If PK directs |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 inline secret | P2 (security, OPEN) | OPEN | chat → future (PK approval) | PK authorisation |
| **morning-inbox-sweep-v1 brief amendment** | PK personal-email morning triage | P3 (carry) | DRAFT exists | PK → chat | PK reviews |
| **22 escalated m.chatgpt_review rows** | 21 historical CCH-locked + 1 T-MCP-05 meta | P3 (carry; gated) | Untouched per CCH | chat → future PK directive | Hold |
| **Memory cap hygiene** | 19/30 v2.84, unchanged | P3 (carry) | 11 free slots. | chat → future | Add as needed |
| **Parallel agent coordination (L47)** | informational | P3 (carry) | v2.84: v1.0 brief commit parent SHA observation (inconclusive). v1.1 + close parents clean. | chat → future | Passive observation |
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
| **github MCP write tools (L58 baseline)** | Per-file or atomic-push depending on coordination | informational (baseline) | Atomic push_files applied 3× v2.84. | informational | — |
| **Localhost FAB cleanup** | `.env.local` still has flag enabled | P3 (carry) | OPEN — cross-surface duplicate risk | PK → future | Set value to false or delete line |
| **Close-the-loop UPDATEs for 3 v2.77 D-01 fires** | `3ff74643`, `6a90cacf`, `94bd6835` | P3 (carry from v2.77) | OPEN. Same close-the-loop class as 22 escalated. | chat → future PK directive | Include in next batch sweep |

**Closed v2.84:**
- **cc-0017c brief authoring v1.0** (v2.83 IN FLIGHT) → **CLOSED** ✅ (commit `92f9e868`).
- **cc-0017c brief v1.1 doc-only patch** (NEW this session) → **CLOSED** ✅ (commit `d3d8381f`).
- **cc-0017c v1.0 D-01 fire** (v2.83 P1 rank 1) → **CLOSED** ✅ (review_id `a37eff28-...`, status=resolved, corrected_action Option A satisfied).
- **cc-0017c v1.1 D-01 re-fire** (NEW this session) → **CLOSED** ✅ (review_id `9e602a2d-...`, status=resolved, deferred per Path C).

**Closed v2.83:**
- cc-0017b brief v1.1 patch (6 defects + 2 rollback bodies) → CLOSED-APPLIED-ON-MAIN ✅ via commits `65047388`–`7f40e554` by parallel agent.

**Closed v2.82:**
- cc-0017b Wave 0b authoring + apply → CLOSED-APPLIED-WITH-CORRECTIVE-MIGRATION ✅
- D-01 reviews `b612a8e4-...` + `a6415afa-...` → resolved

**Closed v2.81:**
- cc-0017a Wave 0a APPLY → CLOSED-APPLIED ✅

**Closed v2.80:**
- cc-0017a Wave 0a authoring + D-01 (`adcc8385-...`) → RESOLVED partial-type-c per PK Path B

**Closed v2.79:** PK approval gate; Amendment G reopen N → LOCKED 14 days; Amendment C triage metric basis → LOCKED phase-based.
**Closed v2.78:** No items closed (planning-only session).
**Closed v2.77:** cc-0014 operational window; cron 85 weekly→daily promotion.
**Closed v2.76:** cc-0014 Stage E close; cc-0014 Stage D production deploy.

---

## 💼 Personal businesses

**v2.84 carry (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check next session.

*(Standing P0 to ask at next session start. None raised v2.84.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.76 / v2.77 / v2.78 / v2.79 / v2.80 / v2.81 / v2.82 / v2.83.

---

## 📌 Backlog

**v2.84 changes:**

- **STATE CHANGE v2.84**: cc-0017c brief authoring v1.0 → CLOSED via commit `92f9e868`. 8 files atomic push.
- **STATE CHANGE v2.84**: cc-0017c v1.0 D-01 fire → CLOSED via review_id `a37eff28-2ba1-4a7a-8fbd-3e9aba738c79` (verdict partial, corrected_action Option A satisfied by v1.1 patch).
- **STATE CHANGE v2.84**: cc-0017c v1.1 doc-only patch → CLOSED via commit `d3d8381f`. 8 files atomic push.
- **STATE CHANGE v2.84**: cc-0017c v1.1 D-01 re-fire → CLOSED via review_id `9e602a2d-1968-4f1d-b32a-24c514b491a0` (verdict partial type-c echo, deferred per PK Path C).
- **STATE CHANGE v2.84**: cc-0017c apply → BLOCKED on fresh-session + PK explicit approval (was v2.83 "gated on D-01"; v2.84 D-01 cycles complete but PK selected Path C deferral).
- **STATE CHANGE v2.84**: T-MCP-02 cum 73 → 75 (+2 D-01 fires).
- **STATE CHANGE v2.84**: State-capture exceptions cum 1 (unchanged — Path C consumed no override).
- **STATE CHANGE v2.84**: friction.* schema state unchanged (no production mutations this session).
- **STATE CHANGE v2.84**: 4 new L-candidates (L-v2.84-a, L-v2.84-b, L-v2.84-c, L-v2.84-d), all first occurrences.
- **No new architectural decisions v2.84.**
- **3-file atomic push_files this session close** (sync_state + this file + new session file). L58 baseline applied correctly. v1.0 brief + v1.1 patch were separate atomic commits earlier in session.
- **CARRIED v2.84**: Dashboard roadmap PHASES — **37th** consecutive deferral.

**Pre-v2.84 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged from v2.83.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a + L47-candidate + L-v2.81-a-candidate framing carried per v2.84. **v2.84 updates:**

- **L41 not exercised v2.84** — only DML on m.chatgpt_review (exempt). Cumulative occurrences v2.80–v2.84 = 6 (unchanged).
- **L40 exercised v2.84** — runtime schema probe (m.chatgpt_review column-name correction). Reinforces baseline.
- **L52 / L53 / L55 / L57 / L59 / L60 / L63 / L64 / L65**: not re-exercised v2.84.
- **L58**: 3× atomic push_files v2.84 (v1.0 brief + v1.1 patch + this close).
- **L62 baseline-eligible since v2.77**: exercised 2× v2.84 (v1.0 + v1.1 D-01 cycles).
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.84; promotion still pending.
- **L-v2.78-a watcher candidate**: not re-exercised v2.84. Still at 2 occurrences. ELIGIBLE FOR BASELINE PROMOTION.
- **L47 CANDIDATE v2.80 (1 occurrence)**: not re-exercised v2.84.
- **L-v2.81-a CANDIDATE v2.81 (2 occurrences)**: observed but not confirmed at v1.0 brief commit; v1.1 + close parents clean. Unchanged. PROMOTION ELIGIBLE per v2.83 PK directive.
- **L-v2.83-a candidate**: re-exercised 3× v2.84. Cumulative 5+ occurrences. Strong promotion candidate.
- **L-v2.84-a candidate (NEW v2.84, 1 occurrence)**: empirical-finding precedence over idealised plan framing.
- **L-v2.84-b candidate (NEW v2.84, 1 occurrence)**: defensive idempotent REVOKE/GRANT for permission migrations.
- **L-v2.84-c candidate (NEW v2.84, 1 occurrence)**: D-01 corrected_action satisfaction pattern (Path A over state-capture override).
- **L-v2.84-d candidate (NEW v2.84, 1 occurrence)**: schema-probe-before-DML-on-unfamiliar-table.

**All candidates recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates.**

---

## v2.84 honest limitations

- All v2.31–v2.83 limitations apply.
- **Brief content references "Sydney late evening 2026-05-18"** but UTC empirical timestamps show v2.84 activity happened on Sydney 2026-05-19 morning (UTC+10). Session file dated 2026-05-19 to match empirical timestamps. v1.2 doc-only correction candidate flagged.
- **v1.1 D-01 outcome was type-c generic echo**, not substantive. Reviewer's specific pushback points are already addressed in brief (9 V-checks, 5 P-steps, 15 hard-stops). Standard bridge auto-escalate pattern for DDL plan_review. Future fresh-session apply may benefit from fresh D-01 fire with fresh pre-flight P-set evidence as the substantive review narrative.
- **L-v2.81-a observation at v1.0 brief commit parent SHA mismatch** (`586d30cd` ≠ compaction-summary v2.83 close HEAD `06a8421e`) was observed but not confirmed as occurrence 3. Could be benign Cowork edits or compaction-summary inaccuracy. v1.1 patch parent matched v1.0 cleanly so no mid-session interference.
- **L-v2.84-d new candidate**: lost ~1 tool call to assumption-based UPDATE on m.chatgpt_review (column name `review_id` doesn't exist; actual is `id`). Runtime probe corrected. Pattern documented as candidate.
- **3-file atomic push_files this commit** (sync_state + action_list + per-session file). v1.0 brief + v1.1 patch were separate atomic commits.
- **Dashboard PHASES at 37th consecutive deferral**. Discipline call increasingly overdue.
- **Memory cap 19/30** — unchanged.
- **Action_list size at v2.84**: ~52KB (was ~45KB v2.83). Growth driven by cc-0017c Wave 0c status block detail + 4 new L-candidates + closed v2.84 entries.
- **Per-session files v2.84**: 1 — `2026-05-19-v2.84-cc0017c-v1.0-v1.1-d01-deferred.md`.
- **Doc-sync v2.84**: 3 commits this session (v1.0 brief 8-file + v1.1 patch 8-file + this close 3-file). Dashboard PHASES 37th consecutive deferral.
- **Close-the-loop UPDATEs v2.84: 2** (both rows new this session). **25 outstanding** unchanged (22 historical CCH-locked + 3 v2.77 new).
- **State-capture exceptions v2.84: 0**. Cumulative: 1 (unchanged — Path C consumed no override).
- **Production mutations v2.84: 0**. No `apply_migration` calls; 0 cron mutations; 0 EF deploys; 0 vault writes; 0 memory edits; 0 friction.* / c.* / f.* / t.* DB rows touched. 2 m.chatgpt_review row UPDATEs (close-the-loop, exempt per session memory).

---

## Changelog

- v1.0–v2.83: per commit history + sync_state archive.
- **v2.84 (2026-05-19 Sydney morning, cc-0017c v1.0 + v1.1 BRIEF AUTHORED + 2× D-01 FIRED + BOTH CLOSE-THE-LOOPED + APPLY DEFERRED TO FRESH SESSION):**
  - **Build arc**: session resumed post-compaction → v1.0 brief 8-file atomic push (commit `92f9e868`) → v1.0 D-01 fire (review_id `a37eff28-...` partial verdict + corrected_action Option A) → PK Path A → v1.1 doc-only patch 8-file atomic push (commit `d3d8381f`) → v1.0 close-the-loop UPDATE → v1.1 D-01 re-fire (review_id `9e602a2d-...` partial type-c) → PK Path C → v1.1 close-the-loop UPDATE → 3-file atomic 4-way sync close.
  - **cc-0017c brief CLOSED (v1.0 + v1.1).** Wave 0c authoring complete. Section C SQL narrowed to legal-domain-only `('suppress','ignore','duplicate')` per Path A. `'done'` recorded as out-of-scope; future lifecycle-domain expansion if needed.
  - **2× D-01 cycles CLOSED.** v1.0 partial→Path A→v1.1 satisfaction; v1.1 partial type-c→Path C deferral. Both rows status=resolved.
  - **cc-0017c apply BLOCKED on fresh-session + PK explicit approval.** Pre-flight P-set rerun mandatory at apply session.
  - **Today/Next 5 rebuilt v2.84**: rank 1 = cc-0017c apply (BLOCKED fresh-session); rank 2 = reconciliation diagnostic (was 3); rank 3 = health_check V-C3 (was 4); rank 4 = music library (was 5); rank 5 = Platform Reconciliation View brief authoring (NEW).
  - **D-01 fires v2.84: 2.** T-MCP-02 cum **75** (was 73). State-capture exceptions unchanged at 1.
  - **L-series outcomes**: L62 exercised 2× clean; L41 not exercised; L40 exercised (schema probe); L58 applied 3×; L-v2.81-a observed inconclusively at v1.0 brief commit (parent SHA mismatch); L-v2.83-a re-exercised 3× (5+ cumulative); 4 NEW candidates L-v2.84-a/b/c/d all first occurrences.
  - **Active rows updated v2.84**: cc-0017c brief authoring + v1.0 D-01 fire + v1.1 D-01 re-fire all → CLOSED; cc-0017c apply → NEW BLOCKED P1 rank 1 (fresh-session gated); cc-0017c v1.2 doc patch candidate → NEW P3; 4 new L-candidate rows.
  - **STATUS BLOCK v2.84 updated**: Friction Register Consolidation Plan gates 7-9 closed (brief + 2× D-01); gate 10 added (apply BLOCKED on fresh-session). cc-0017c Wave 0c STATUS BLOCK rewritten with v1.0/v1.1 commit refs + 2× D-01 review_ids + close-the-loop timestamps + Path A/C history.
  - **Closure budget**: ~2h v2.84 cycle. Trailing-14-day cumulative ~17h above 8.0h floor.
  - **Doc-sync v2.84**: 3 commits this session (v1.0 brief + v1.1 patch + this close). Dashboard PHASES 37th consecutive deferral.
  - **Production mutations v2.84**: 0. 2 m.chatgpt_review row UPDATEs (close-the-loop, exempt). No `apply_migration` calls; 0 cron mutations; 0 EF deploys.
  - **T-MCP-02 cum**: 73 → 75. State-capture exceptions: 1 unchanged. L-v2.78-a 2 occurrences (unchanged). L47 1 occurrence (unchanged). L-v2.81-a 2 occurrences (unchanged). 4 new L-v2.84 candidates at 1 occurrence each.
