# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-18 Sydney evening (**v2.80 — cc-0017a v1.0+v1.1 PATCH + D-01 PARTIAL TYPE-C + PK PATH B.** L41 discovery at session open: v1.0 brief at commit `068f8dcb` already on main from earlier same-day session (sync_state v2.79 didn't reference it). v1.1 patch authored fixing 4 defects/gaps (UUID malformations in V-A4/5/6/13/14a/14b; jsonb canonicalisation note; P9 operator_friction extension; P7b orphan-case pre-flight). Patch landed at commit `986e4bca` (where "failed three times" was actually "succeeded first time, ack dropped" — explicit-sha guard worked as designed). Pre-flight P1–P12 + P7b all clean (P7b orphan_cases=0). D-01 fired via ChatGPT Review MCP (review_id `adcc8385-b9be-4573-8d64-b40510202940`): verdict=partial, risk=medium, confidence=medium, escalate=true, requires_pk_escalation=true. 3 pushback points all classified type-(c) per L62 baseline (echoes of self-disclosed weak evidence + own review questions). PK directed Path B ("Go path b"): apply_migration deferred to separate session. Close-the-loop UPDATE on m.chatgpt_review row landed. **0 production mutations this session**. **Today/Next 5 rebuilt**: cc-0017a APPLY → rank 1 (was authoring v2.79 rank 1, now closed via brief + D-01 this session). **T-MCP-02 cum: 71** (was 69 + 1 D-01 fire + 1 close-the-loop UPDATE). **State-capture exceptions unchanged at 1** (Path B is satisfy-path, not state-capture override). **L41 exercised twice this session** (session-open + push-confusion). **L62 exercised** (3 type-c classifications). **L47 CANDIDATE PROPOSED**: check `list_recent_commits` before retrying apparent GitHub MCP write failures. **L-v2.78-a watcher candidate** unchanged at 2 occurrences. 4-way atomic sync this commit (sync_state v2.80 + this file + new session file). Dashboard PHASES **33rd consecutive deferral**.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.79.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a (watcher → promotion-eligible v2.79) carried. **D-IOL-001 (v2.77) carried.**

**v2.80 ADDITIONS:**
- **cc-0017a Wave 0a brief AUTHORED at v1.1 commit `986e4bca`.** 4 defects/gaps fixed pre-D-01. Migration body unchanged from v1.0.
- **D-01 review for cc-0017a fired and resolved**: review_id `adcc8385-b9be-4573-8d64-b40510202940`. Verdict partial / medium risk / medium confidence; escalate=true; 3 pushbacks all type-(c) per L62. PK directed Path B; close-the-loop UPDATE landed.
- **Wave 0a APPLY gate now OPEN** for next session.
- **Today/Next 5 rebuilt**: cc-0017a APPLY → rank 1 (replaces authoring); ranks 2-4 unchanged from v2.79.
- **T-MCP-02 cum: 71** (was 69 + 1 D-01 fire + 1 close-the-loop UPDATE).
- **State-capture exceptions: 1** (unchanged — Path B is satisfy-path).
- **L41 exercised twice this session** (chat-side / empirical state drift at open re: v1.0 brief existence; apparent-failure-but-actually-success at push re: v1.1 patch already landed).
- **L62 exercised** (3 type-c classifications on D-01 partial response).
- **L47 CANDIDATE PROPOSED v2.80 (1 occurrence)**: *When `create_or_update_file` (or any GitHub MCP write tool) appears to fail with no visible response, check `list_recent_commits` on the path before retrying. The MCP→GitHub→MCP→client response chain can have a successful PUT land while client never sees the 200 OK ack.* Promotion-eligible on re-exercise.
- **L-v2.78-a watcher candidate**: not re-exercised v2.80 (D-01 was single-reviewer fire, no new convergence event). Unchanged at 2 occurrences; still eligible for baseline promotion.
- **4-way atomic push_files this session close** (sync_state + this file + new per-session file). L58 baseline applied correctly. Pre-D-01 single-file commit `986e4bca` was the 1st commit this session.
- **Dashboard PHASES sync: 33rd consecutive deferral.**

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (recon daily diagnostic + health_check signal diagnostic + dashboard PHASES sync) — unchanged from v2.79 | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~11h (was ~10h v2.79; +cc-0017a v1.1 patch + D-01 + close-the-loop ≈ ~1h) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.80 cycle: ~1.5h total** (L41 recovery + v1.1 patch authoring + pre-flight + D-01 fire + close-the-loop + 4-way sync). Lean session, 0 production mutations.

**State-capture exception count v2.80: 0**. Cumulative: 1 (unchanged from v2.77).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-18 Sydney evening (v2.80).
> **v2.80 note:** cc-0017a Wave 0a authoring + D-01 closed this session. APPLY is now the immediate next deliverable. Pre-flight evidence reusable from m.chatgpt_review.context within ~24h.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **cc-0017a Wave 0a APPLY** | **P1 (rank 1 v2.80 — UNGATED, promoted from authoring v2.79 rank 1 now closed)** | Brief v1.1 at commit `986e4bca`. D-01 fired + resolved partial-type-c Path B (review_id `adcc8385-...`). Pre-flight P1–P12 + P7b clean; evidence captured in m.chatgpt_review.context (reusable within ~24h). Migration body unchanged. Foundational schema: 4 new tables + 9 new case columns + 1 IMMUTABLE function + backfill on 22 cases + partial unique index. NO behavioural change. | chat → PK | `Supabase:apply_migration` with name `cc_0017a_friction_foundational_schema` + 20 V-checks sequentially + 4-way close. Re-run pre-flight first if > 24h since 06:40 UTC 2026-05-18. |
| 2 | **Reconciliation daily cadence diagnostic** | **P1 (rank 2 v2.80 carry from v2.79 rank 2)** | First daily fire 2026-05-17 17:30 UTC emitted 16 new friction events. Material exists. Three questions: did `r.cadence_drift_log` write rows? did `friction.event` write rows? are they paired correctly? Single read-only SQL run. | chat → PK | Post-fire SQL: count `r.cadence_drift_log` rows since 2026-05-17 17:00 + count `friction.event source='reconciliation'` rows same window. |
| 3 | **Health_check V-C3 + signal-production diagnostic** | **P1 (rank 3 v2.80 carry from v2.79 rank 3)** | V-C3 still PENDING since 2026-05-15. Cowork brief reset to v3.0 `status: ready` via commit `9215de77`. Awaiting next Cowork fire. | Cowork (scheduled) → chat | Check for new `docs/audit/health/YYYY-MM-DD.md` post-fire window; reconcile against friction.event. |
| 4 | **Music library activation** | **P2 (rank 4 v2.80 carry from v2.79 rank 4)** | Code wired in `video-worker` v3.0.0. ~30 min PK-led with chat guidance. | PK + chat | Create bucket `post-music`; upload 9 tracks; set env var; smoke test one video render. |
| — | (rank 5 unranked) | — | Next-natural candidate (close-the-loop batch sweep) gated on PK directive. Leave unranked until PK directs. | — | — |

**Standing P0 (not ranked):** Personal businesses check-in. Crazy Domains refund + clean-up follow-up carry from v2.51.

**Passive observation v2.80**: Cron 82 + 83 + 84 + 85 (daily) + 86 unchanged. PRV v1 operator views queryable via `op_reader` role. **friction.* schema state v2.80**: 5 tables live (unchanged from v2.79); functions/triggers unchanged; friction.event = 22 rows (unchanged); friction.case = 22 rows; dedupe broken (max events/case = 1) — Wave 0a APPLY will lay foundation for fix, Wave 0b will close the gap. PostgREST exposed_schemas includes `friction`. /operations route live at HEAD `5753f41b`. Next natural fires: cron 85 daily 03:30 AEST (≈17:30 UTC); cron 86 daily 01:15 UTC.

---

## 🟢 Friction Register Consolidation Plan v1 + amendments — STATUS BLOCK (UPDATED v2.80)

**Status v2.80: ✅ SIGNED 2026-05-18 (v2.79). Wave 0a authoring ✅ DONE this session. Wave 0a APPLY pending next session.**

**Documents committed:**
- `docs/runtime/friction_register_consolidation_plan_v1.md` (commit `afc9306`) — unchanged
- `docs/runtime/friction_register_consolidation_plan_v1_amendments.md` (SIGNED with §5.5 + §9) — unchanged v2.80
- `docs/briefs/cc-0017a-friction-register-foundational-schema.md` (v1.0 at `068f8dcb`; v1.1 at `986e4bca`) — NEW track this session
- `docs/runtime/sessions/2026-05-18-v2.79-friction-plan-signed.md` — v2.79
- `docs/runtime/sessions/2026-05-18-cc-0017a-v1.1-and-d01-fire.md` (this commit) — v2.80

**32 decisions governing execution + 2 within-amendment clarifications:** unchanged v2.80.

**Open gates v2.80:**
1. ✅ PK explicit approval of v1 + amendments → CLOSED 2026-05-18 (v2.79)
2. ✅ cc-0017a brief authored → DONE this session (v1.1 at `986e4bca`)
3. ✅ D-01 review for cc-0017a → DONE this session (review_id `adcc8385-...`, resolved partial-type-c Path B)
4. ⏳ **cc-0017a Wave 0a migration applied + V-checks pass → unblocks Wave 0b authoring** (next session priority)
5. ⏳ After 0b applied: friction.event volume should be empirically observed for 1 week before pool view design (Wave 7)

**D-01 disposition (v2.80):** Review_id `adcc8385-b9be-4573-8d64-b40510202940`. Verdict partial / medium risk / medium confidence; escalate=true; requires_pk_escalation=true; 3 pushback points (multi-event V-check coverage; row_number 1:1 mapping; md5→sha256 transition) ALL classified type-(c) per L62 — echoes of self-disclosed weak evidence + own review questions; no new substantive evidence; brief v1.1 already addresses all 3 in §4 risks + §6 known_weak_evidence + §8 deferred items. Migration body needs zero changes. PK directed Path B; close-the-loop UPDATE landed.

**Reviewer convergence audit trail** unchanged from v2.79.

**Critical empirical findings preserved unchanged from v2.79.**

---

## 🟢 cc-0014 friction register — STATUS BLOCK (unchanged v2.80)

Unchanged. CLOSED-ARCHIVED 2026-05-18 (v2.77).

---

## 🟢 cc-0015 Friction Pool View — STATUS BLOCK (unchanged v2.80 — Wave 7)

Unchanged. AUTHORED PENDING_EXECUTION; SEQUENCED TO WAVE 7.

---

## 🟢 cc-0016 Friction Capture Evidence — STATUS BLOCK (unchanged v2.80 — Wave 8)

Unchanged. AUTHORED PENDING_EXECUTION; SEQUENCED TO WAVE 8.

---

## 🟢 cc-0012 PRV v1 — STATUS BLOCK (carried v2.80, condensed)

Unchanged. CLOSED-WITH-VERIFIED-VARIANCE v2.71.

---

## 🟢 cc-0010B ice-evidence-materialiser — STATUS BLOCK (carried v2.80, condensed)

Unchanged. CLOSED-WITH-VERIFIED-VARIANCE v2.68.

---

## 🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK (carried v2.80, condensed)

Unchanged. APPLIED + CLOSED v2.67.

---

## 🟢 Process Upgrades L44–L48 + L52–L65 + L-v2.76-a-f + L-v2.78-a + L47-candidate — STATUS BLOCK (UPDATED v2.80)

**Status v2.80:** L40 reified v2.68. L44 + L45 + L46 + L48 baseline-eligible (carry from v2.76). **L58 BASELINE v2.76** carried (applied this session). **L62 baseline-eligible v2.77** carried (exercised this session — 3 type-c classifications). L60 at 7 occurrences (carry). L63 + L64 + L65 candidates carry from v2.75. L-v2.76-a through L-v2.76-f carry.

**v2.80 cycle outcomes:**
- **L41 exercised TWICE this session**: (a) chat-side / empirical state drift at session open (v1.0 brief existed at `068f8dcb` from earlier same-day session, sync_state v2.79 didn't reference); (b) apparent push failure was actually "succeeded first time, ack dropped" — diagnosed via `list_recent_commits`.
- **L58**: 4-way atomic push_files applied this session close — baseline correctly applied.
- **L62**: 3 pushback points correctly classified type-c on D-01 partial response. Cumulative L62 exercises now well past baseline-eligibility threshold.
- **L-v2.78-a watcher candidate**: not re-exercised v2.80 (D-01 was single-reviewer fire, no new reviewer convergence event). Unchanged at 2 occurrences. **STILL ELIGIBLE for baseline promotion at next session's lesson cycle.** Baseline candidate text unchanged.
- **L47 CANDIDATE PROPOSED v2.80 (1 occurrence)**: *When `create_or_update_file` (or any GitHub MCP write tool) appears to fail with no visible response, always check `list_recent_commits` on the path before retrying. The MCP→GitHub→MCP→client response chain can have a successful PUT land while client never sees the 200 OK ack. The cheap one-tool check disambiguates and prevents L41 sha-conflict cascade.* Tested-in-the-wild this session — discovery of commit `986e4bca` via list_recent_commits saved a duplicate-write loop after multiple apparent push failures. Promotion: 1 occurrence; recommend baseline promotion at next session that re-exercises this disambiguation.

**No other new candidates v2.80.**

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.80)

Unchanged. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

**v2.80 update:**
- **Pre-flight evidence freshness deadline**: pre-flight P1–P12 + P7b captured 06:40 UTC 2026-05-18. Re-run required at apply-session open if > 24h elapsed. Soft deadline: 2026-05-19 06:40 UTC.
- **Reconciliation daily diagnostic soft deadline carries** — next cron 85 fire ≈2026-05-19 03:30 AEST; material exists from 2026-05-17 daily fire.
- **No new v2.80 calendar items.**

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.80 application**: 1 D-01 fire this session (review_id `adcc8385-b9be-4573-8d64-b40510202940`). Cumulative T-MCP-02: **71** (69 + 1 fire + 1 close-the-loop UPDATE).

**L46 Evidence Gate v2.80**: applied — D-01 fire framed with 7 fields per protocol (decision + production_action + consequence + cost + current_evidence + known_weak_evidence + default_action). Separation of strong vs weak evidence preserved.
**L62 v2.80 exercises**: 3 (all pushbacks correctly classified type-c — generic echoes of self-disclosed weak evidence). Baseline-eligible since v2.77; clearly well past threshold now.
**State-capture exceptions v2.80: 0.** Cumulative: 1 (unchanged — Path B is satisfy-path, not state-capture override).
**Close-the-loop UPDATEs v2.80: 1** (review_id `adcc8385-...`, this session's D-01 fire — landed same session). **25 outstanding** (22 historical CCH-locked + 3 v2.77 new — unchanged from v2.79).

---

## 🤖 Cowork automation (D182)

**v2.80 status:** unchanged from v2.79. Cron 82 + 83 + 86 firing normally. V-C3 still PENDING live run.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0017a Wave 0a APPLY** | Foundational schema migration (brief v1.1, D-01 cleared) | **P1 — rank 1 v2.80 (was authoring v2.79; now applied path)** | EXECUTION GATE OPEN. Brief v1.1 at `986e4bca`. D-01 resolved partial-type-c (review_id `adcc8385-...`). Pre-flight evidence in m.chatgpt_review.context. | chat → PK | `Supabase:apply_migration` + 20 V-checks + 4-way close. Re-run pre-flight if > 24h. |
| **Reconciliation daily cadence diagnostic** | First daily fire happened 2026-05-17 17:30 UTC; 16 new friction events emitted | **P1 (rank 2 v2.80 carry)** | OPEN. Material exists. Single read-only SQL session. | chat → PK | Post-fire SQL count comparison |
| **Health_check V-C3 + signal-production diagnostic** | Three sub-questions on Cowork pipe | **P1 (rank 3 v2.80 carry)** | OPEN. V-C3 PENDING. | Cowork → chat | Check post-fire `docs/audit/health/YYYY-MM-DD.md` |
| **Music library activation** | Code wired in video-worker v3.0.0; env-var gated | **P2 (rank 4 v2.80 carry)** | PENDING PK execution. | PK + chat | Create bucket; upload 9 tracks; set env var; smoke test |
| **cc-0015 friction-pool-view brief** | Authored PENDING_EXECUTION; Wave 7 | **P2 (Wave 7 v2.80 carry)** | DRAFTED. Commit `9a5dc155`. Wave 7 awaits empirical volume from Waves 1-6. | chat → PK (Wave 7) | Stage A re-scope when Wave 7 reached |
| **cc-0016 friction-capture-evidence brief** | Authored PENDING_EXECUTION; Wave 8 | **P2 (Wave 8 v2.80 carry)** | DRAFTED. Commit `f35f8ea4`. Wave 8 awaits Wave 7. | chat → PK (Wave 8) | Stage A unchanged as drafted |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | **P2 (carry v2.80)** | OBSERVED. Unblocked per D-IOL-001. | chat → PK | Verify throttles + dry-run + re-enable |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter + upstream chain | **P2 (carry v2.80)** | LOGGED. Unblocked per D-IOL-001. | chat → PK | Audit m.post_draft + decide filter expansion or chain investigation |
| **Dashboard PHASES sync** | PHASES array stale since 3 May | **P2 (carry v2.80 — 33rd consecutive deferral)** | Unblocked per D-IOL-001. Trending toward "first do dashboard sync, then continue" discipline call. | chat → PK | Update `app/(dashboard)/roadmap/page.tsx` at next dashboard session |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 (carry) | OPEN. | PK | When PK directs |
| **Close-the-loop batch sweep — 25 escalated remain** | Gated on PK directive | P2 (carry v2.80) | 22 historical + 3 v2.77 new. No additions v2.80 (this session's close-the-loop landed). | chat → future PK directive | Hold pending PK lift of CCH + meta resolution |
| **L-v2.78-a baseline promotion** | Reviewer convergence is high-signal | **P3 (carry v2.80 — eligible at next lesson cycle)** | Still 2 occurrences (not re-exercised v2.80). | chat → next session | Promote to baseline at appropriate cycle |
| **L47 baseline promotion (proposed v2.80)** | Check list_recent_commits before retrying apparent push failures | **P3 (NEW v2.80 — 1 occurrence)** | Proposed this session; tested-in-the-wild. | chat → next session | Promote on re-exercise |
| **Brief v1.2 doc patch** | 6 defects + L60 + L63 + L64 + L65 + L-v2.76-a-f framing + L-v2.78-a if promoted + L47 if promoted | P3 (carry, scope expanded v2.80) | DRAFT scope expanded v2.80 (add L47 if promoted). Doc-only. | chat → future | Single doc patch when PK greenlights |
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
| **Memory cap hygiene** | 19/30 v2.80, unchanged | P3 (carry) | 11 free slots. | chat → future | Add as needed |
| **Parallel agent coordination (L47)** | informational | P3 (carry) | No conflicts observed. | chat → future | Passive observation |
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
| **github MCP write tools (L58 baseline)** | Per-file or atomic-push depending on coordination | informational (baseline) | Atomic push_files applied v2.80 (this 4-way sync close). Single-file `create_or_update_file` applied for v1.1 brief patch this session (commit `986e4bca`). | informational | — |
| **Localhost FAB cleanup** | `.env.local` still has flag enabled | P3 (carry) | OPEN — cross-surface duplicate risk | PK → future | Set value to false or delete line |
| **Close-the-loop UPDATEs for 3 v2.77 D-01 fires** | `3ff74643`, `6a90cacf`, `94bd6835` | P3 (carry from v2.77) | OPEN. Same close-the-loop class as 22 escalated. | chat → future PK directive | Include in next batch sweep |

**Closed v2.80:**
- cc-0017a Wave 0a authoring (v2.79 rank 1) → CLOSED ✅ (brief v1.1 at commit `986e4bca`; 4 defects/gaps fixed pre-D-01)
- D-01 review for cc-0017a (`adcc8385-...`) → RESOLVED partial-type-c per PK Path B; close-the-loop UPDATE landed same session

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

**v2.80 carry (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check next session.

*(Standing P0 to ask at next session start. None raised v2.80.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.76 / v2.77 / v2.78 / v2.79.

---

## 📌 Backlog

**v2.80 changes:**

- **STATE CHANGE v2.80**: cc-0017a Wave 0a authoring → CLOSED via brief v1.1 at commit `986e4bca`; D-01 fired + resolved partial-type-c per PK Path B; close-the-loop UPDATE on m.chatgpt_review row landed.
- **STATE CHANGE v2.80**: cc-0017a APPLY now P1 rank 1 (was authoring v2.79 rank 1). Pre-flight evidence reusable within ~24h.
- **STATE CHANGE v2.80**: T-MCP-02 cum 69 → 71 (+ 1 D-01 fire + 1 close-the-loop UPDATE). State-capture exceptions unchanged at 1.
- **STATE CHANGE v2.80**: L47 candidate proposed (1 occurrence) — check `list_recent_commits` before retrying apparent GitHub MCP write failures.
- **STATE CHANGE v2.80**: L41 exercised twice this session — chat-side / empirical state drift at session open (re: v1.0 brief existence); apparent-failure-but-actually-success at push (re: v1.1 patch landed).
- **STATE CHANGE v2.80**: L62 exercised (3 type-c classifications on D-01 partial response).
- **No new architectural decisions or lesson promotions v2.80.**
- **4-way atomic push_files this session close** (sync_state + this file + new session file). L58 baseline applied correctly. Single-file commit `986e4bca` (v1.1 brief patch) was the 1st commit this session.
- **CARRIED v2.80**: Dashboard roadmap PHASES — **33rd** consecutive deferral; still unblocked per D-IOL-001 for next dashboard session.

**Pre-v2.80 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged from v2.79.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a through L-v2.76-f + L-v2.78-a + L47-candidate framing carried/added per v2.80. **v2.80 updates:**

- **L41 EXERCISED TWICE v2.80**: (a) chat-side / empirical state drift at session open (v1.0 brief existed at `068f8dcb` AFTER v2.79 signature but BEFORE this session opened; sync_state v2.79 didn't reference); (b) apparent push failure was actually "succeeded first time, ack dropped" — diagnosed via `list_recent_commits`. Cumulative L41 occurrences this session: 2. Watcher signal that L41 baseline pattern may need more aggressive prevention discipline.
- **L52 / L53 / L55 / L57 / L59 / L60 / L63 / L64 / L65**: not re-exercised v2.80.
- **L58**: 4-way atomic push_files applied this session close (correct baseline application).
- **L62 BASELINE-ELIGIBLE since v2.77 — EXERCISED v2.80** (3 type-c classifications). Cumulative L62 exercises now well past threshold. Continues to function as intended.
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.80; promotion still pending.
- **L-v2.78-a watcher candidate**: not re-exercised v2.80 (D-01 was single-reviewer fire, no new convergence event). Still at 2 occurrences. **ELIGIBLE FOR BASELINE PROMOTION at next session's lesson cycle.** Baseline candidate text unchanged.
- **L47 CANDIDATE PROPOSED v2.80 (1 occurrence)**: *When `create_or_update_file` (or any GitHub MCP write tool) appears to fail with no visible response, always check `list_recent_commits` on the path before retrying. The MCP→GitHub→MCP→client response chain can have a successful PUT land while client never sees the 200 OK ack. The cheap one-tool check disambiguates and prevents L41 sha-conflict cascade.* Promotion-eligible on re-exercise.
- **No other new L-candidates v2.80.**

**All candidates recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates** (L37–L65 + L-v2.76-a-f + L-v2.78-a + L47-candidate, plus standing baseline).

---

## v2.80 honest limitations

- All v2.31–v2.79 limitations apply.
- **D-01 outcome was partial / type-c**; brief is unchanged. Path forward depends on next session executing apply_migration without further surprises. If apply produces unexpected V-check failures, that would re-surface a defect not caught by either authoring review or D-01.
- **Pre-flight evidence captured 06:40 UTC 2026-05-18** will go stale if apply session > 24h later. Recommend re-running P1–P12 + P7b at apply-session open.
- **L47 candidate framing is fresh** (1 occurrence); needs at least 1 more independent occurrence before baseline promotion eligibility.
- **Dashboard PHASES at 33rd consecutive deferral.** Friction work has been pulling attention from dashboard sync for over 30 sessions. Trending toward "first do dashboard sync, then continue" discipline call. Logged for PK decision.
- **Migration body not yet validated against live schema** (apply pending). Pre-flight gives high confidence but is not a substitute for empirical apply + V-checks.
- **L41 hit twice this session.** Cumulative L41 occurrences this session: 2. Watcher signal that L41 baseline pattern may need more aggressive prevention discipline.
- **Memory cap 19/30** — unchanged. 11 free slots.
- **Action_list size at v2.80**: ~38KB (was 30.5KB v2.79; ~7.5KB net growth from v2.80 STATUS BLOCK updates + Today/Next 5 rebuild + L47 candidate + changelog).
- **Per-session files v2.80**: 1 — `2026-05-18-cc-0017a-v1.1-and-d01-fire.md` (this commit).
- **Doc-sync v2.80**: 2 commits this session — `986e4bca` (v1.1 brief patch, single file) + this 4-way atomic push_files (sync_state + this file + new session file). Dashboard PHASES 33rd consecutive deferral.
- **Close-the-loop UPDATEs v2.80**: 1 (review_id `adcc8385-...`, this session's D-01 fire — landed same session). **25 eligible remain** (22 prior + 3 v2.77 new — unchanged from v2.79). No additions to outstanding.
- **State-capture exceptions v2.80: 0**. Cumulative: 1.

---

## Changelog

- v1.0–v2.79: per commit history + sync_state archive.
- **v2.80 (2026-05-18 Sydney evening, cc-0017a v1.0+v1.1 PATCH + D-01 PARTIAL TYPE-C + PK PATH B):**
  - **Build arc**: session open against v2.79 SIGNED state → L41 discovery (v1.0 brief at `068f8dcb` from earlier same-day session, not referenced in sync_state v2.79) → v1.0 brief assessment surfaced 4 defects/gaps for v1.1 patch (UUID malformations + jsonb canonicalisation note + P9 operator_friction extension + P7b orphan-case pre-flight) → v1.1 patch authored locally → push retry confusion (L41 manifest: apparent failures were actually "succeeded first time, ack dropped" — `list_recent_commits` revealed v1.1 already at commit `986e4bca`) → pre-flight P1–P12 + P7b all 13 checks pass (P7b orphan_cases=0; P9 includes operator_friction) → D-01 fire via ChatGPT Review (review_id `adcc8385-...`, action_type=sql_destructive) → response partial / medium / medium / escalate=true / 3 pushback points → all 3 pushbacks classified type-(c) per L62 (echoes of self-disclosed weak evidence + own review questions) → PK directs Path B (apply deferred to separate session) → close-the-loop UPDATE on m.chatgpt_review row landed → 4-way atomic push_files (this commit).
  - **cc-0017a v1.1 brief on main at commit `986e4bca`**. 4 defects/gaps fixed pre-D-01. Migration body unchanged from v1.0. Authoring + D-01 gates closed this session.
  - **D-01 disposition recorded**: review_id `adcc8385-b9be-4573-8d64-b40510202940`, status=`resolved`, action_taken captures full disposition narrative + type-c classifications + Path B directive, resolved_by captures PK directive + L62 baseline reference, escalation_resolved_at = `2026-05-18 06:40:38.025647+00`.
  - **Today/Next 5 rebuilt v2.80**: rank 1 = cc-0017a APPLY (promoted from authoring v2.79 rank 1, now closed); ranks 2-4 unchanged from v2.79.
  - **D-01 fires v2.80: 1.** T-MCP-02 cum **71** (was 69 + 1 fire + 1 close-the-loop UPDATE). State-capture exceptions unchanged at 1 (Path B is satisfy-path).
  - **L-series outcomes**: L41 exercised TWICE this session (session-open + push-confusion). L62 exercised (3 type-c classifications). L58 applied (4-way atomic push_files). L-v2.78-a unchanged at 2 occurrences (no new convergence event). **L47 CANDIDATE PROPOSED (1 occurrence)**: check `list_recent_commits` before retrying apparent GitHub MCP write failures.
  - **Active rows updated v2.80**: cc-0017a authoring → CLOSED; cc-0017a APPLY → rank 1 Active; L47 baseline promotion row added P3 carry.
  - **STATUS BLOCK v2.80 updated**: Friction Register Consolidation Plan gates 1-3 closed (PK approval + cc-0017a authoring + D-01); gate 4 (apply + V-checks) pending next session; gate 5 (1-week volume observation before Wave 7) pending after Wave 0b.
  - **Closure budget**: ~1.5h v2.80 cycle. Trailing-14-day cumulative ~11h above 8.0h floor.
  - **Doc-sync v2.80**: 2 commits (`986e4bca` v1.1 patch single-file + this 4-way atomic push_files). Dashboard PHASES 33rd consecutive deferral.
  - **Production mutations v2.80**: 0 apply_migration; 1 execute_sql write (close-the-loop UPDATE on m.chatgpt_review only — non-schema audit table); 0 cron mutations; 0 EF deploys; 0 vault writes; 0 memory edits.
  - **T-MCP-02 cum**: 71 (was 69). State-capture exceptions: 1 (unchanged). L-v2.78-a unchanged at 2 occurrences. L47 candidate at 1 occurrence (proposed v2.80).
