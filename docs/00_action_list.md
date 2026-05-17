# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-16 Sydney (**v2.76 — cc-0014 FULLY CLOSED + 14-DAY WINDOW OPEN + FAB LIVE ON PRODUCTION + cc-0015 + cc-0016 DRAFTED.** Stage E close executed via migration `cc_0014_e_close_experiment_run_start`. PK pre-execution review caught 3 verification defects pre-fire (trigger probe structurally wrong; probe isolation broken; Day-19 wording confusion). 4 post-INSERT verifications PASS. **14-day window OPEN: 2026-05-15 06:20 UTC → 2026-05-29 06:20 UTC. Day-19 verdict review = 2026-05-29 Sydney.** **FAB live on production** via Vercel env var DASHBOARD_FRICTION_FAB_ENABLED=true (Production + Preview). 2 mid-execution defects caught + recovered (wrong project ID cited; uppercase value silent failure). Live FAB smoke test + triage end-to-end PASS — event `fbd1b12d`, auto-promoted case `b7369dc9`, triaged to acknowledged + quality_flag=true + action_decision=track. Emitter coverage diagnostic refuted initial chat diagnosis. **cc-0015 + cc-0016 briefs drafted PENDING_EXECUTION** (commits 9a5dc155 + f35f8ea4). **Memory edit cycle 30/30 → 19/30** (11 free slots; 1 mid-cycle unauthorised remove identified + recovered). **0 D-01 fires** per brief §13. T-MCP-02 cum unchanged at **66**. State-capture exceptions cum unchanged at **1**. **6 NEW L-candidates v2.76 (a-f)**. **L58 PROMOTED TO BASELINE**. 3-of-4-way sync via 3 single-file chat MCP commits (dashboard PHASES **29th consecutive deferral** per IOL hold-stance). **Next major**: in-window operational FAB use (target ≥3 manual events); Cowork output pipeline recovery; mid-window check-in ~2026-05-22; Day-19 verdict 2026-05-29 Sydney.)
>
> **Mid-session reconciliation 2026-05-17 Sydney (not a version bump):** docs-only patches in this file + `docs/00_sync_state.md` to correct stale framings. (1) Cowork blocker correctly diagnosed — not OpenClaw, brief was `status: review_required`; commit `9215de77` reset to v3.0 `status: ready`; V-C3 still PENDING. (2) Close-the-loop safe buckets complete: 6 rows resolved (2 v2.72 carries + 4 cc-NNNN family); 22 escalated remain (21 historical + 1 T-MCP-05 meta); full sweep NOT complete. (3) Manual FAB events: 2/3 logged; one more needed. (4) cc-0015 + cc-0016 still BLOCKED until Day-19 verdict.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.75.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L65 + L-v2.76-a through L-v2.76-f carried.

**v2.76 ADDITIONS:**
- **cc-0014 FULLY CLOSED.** All stages A-E applied through window-open INSERT. Migration `cc_0014_e_close_experiment_run_start` applied via apply_migration MCP. friction.experiment_run row live with status=running, starts_at 2026-05-15 06:20 UTC, ends_at 2026-05-29 06:20 UTC, criteria_snapshot brief §10 verbatim immutable.
- **FAB live on production.** Vercel env var DASHBOARD_FRICTION_FAB_ENABLED=true set with Production + Preview scope. Deployment `dpl_9Geda1dbh...` serving dashboard.invegent.com. Live FAB smoke test + triage end-to-end PASS.
- **cc-0015 friction-pool-view brief drafted PENDING_EXECUTION.** Commit `9a5dc155`. 7 stages including dashboard_ui category split + Stage F full surface copy. Blocked-on cc-0014 Day-19 verdict.
- **cc-0016 friction-capture-evidence brief drafted PENDING_EXECUTION.** Commit `f35f8ea4`. 5 stages including Supabase Storage bucket + 18-month auto-delete. Blocked-on cc-0014 Day-19 verdict. Parallel-executable with cc-0015.
- **6 NEW L-candidates this session**: L-v2.76-a through L-v2.76-f.
- **L58 PROMOTED TO BASELINE v2.76**: 3 consecutive preventive applications within consistent context with zero failures. Per-file single-commit strategy now default for any multi-file sync.
- **L41 + L45 strengthened to 5+ exercises**.
- **L48 re-exercised** (1 atomic migration).
- **0 D-01 fires this session** per brief §13. T-MCP-02 cum stays at 66. State-capture exceptions stay at 1 cumulative.
- **Memory edit cycle executed**: 30/30 → 19/30 (11 free slots headroom). 11 approved removals + 2 in-place updates + 1 unauthorised remove identified mid-cycle and recovered to authorised state.
- **Sync debt resolved this commit**: 1 new session file + sync_state v2.75 → v2.76 + action_list v2.75 → v2.76. **3 single-file chat MCP commits this session** per L58 (now baseline). 3-of-4-way sync (docs + memory updated; dashboard PHASES intentionally deferred — **29th consecutive** — per IOL hold-stance pending Day-19 verdict 2026-05-29).

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (Cowork output pipeline recovery + mid-window check-in pending + Day-19 verdict scheduled) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~8h v2.76 | 8.0 floor | ✅ at floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**v2.76 cycle: ~8h total** (Stage E close ~1.5h + FAB env var setup + recovery ~1h + smoke tests ~30min + emitter diagnostic ~30min + cc-0015 brief ~1h + cc-0016 brief ~1h + memory cycle ~45min + 3-commit sync ~2h).

**State-capture exception count v2.76: 0** (no D-01 fires this session; v2.72's count of 1 carries cumulatively).

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-16 Sydney (v2.76).
> **v2.76 note:** cc-0014 fully CLOSED through window-open INSERT. 14-day window running 2026-05-15→2026-05-29. FAB live on production. cc-0015 + cc-0016 briefs drafted PENDING_EXECUTION (post Day-19). Memory edit cycle complete at 19/30. Primary focus shifts to operational use of FAB during the window, mid-window check-in, and Day-19 verdict execution. cc-0013 stays deprioritised pending verdict.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **In-window operational FAB use** | **P1 (rank 1 v2.76)** | **Currently 2/3 in-window events from source=manual as of 2026-05-17 — one more manual event still needed.** Criterion 3 requires ≥2 sources × ≥3 events. Manual is only realistic source-of-events during window unless Cowork recovers or Monday reconciliation fires. Target: PK files real friction observations via dashboard.invegent.com FAB; each auto-promotes via promotion trigger; PK triages within 72h to maintain late_triage_ratio ≤ 0.50 invalidation gate. | PK → dashboard.invegent.com | Continuous through 2026-05-29. Capture as friction surfaces; triage within 72h. |
| 2 | **Cowork output pipeline recovery** | **P1 (rank 2 v2.76 carry from v2.75)** | **Blocker corrected 2026-05-17**: Cowork has been firing nightly ~16:02 UTC since 2026-05-05; the actual blocker was `docs/briefs/nightly-health-check-v1.md` remaining `status: review_required` since 2026-05-04, so Cowork's owner-gate skipped it each fire. Commit `9215de77` reset brief to v3.0 `status: ready`. Awaiting next Cowork fire (expected ~2026-05-17 16:02 UTC). Once Cowork picks up the v3.0 brief, health_check becomes viable second source for criterion 3. **V-C3 still PENDING** live run. | Cowork (scheduled fire) → chat | Wait for next scheduled Cowork fire; chat runs V-C3 reconciliation probe post-run. |
| 3 | **Mid-window check-in at ~Day 7** | **P1 (rank 3 v2.76 NEW)** | Target 2026-05-22 Sydney. Empirical reading of all 5 criteria + invalidation gates. If criterion 3 looks structurally unsatisfiable at Day 7, flag for honest INVALID-EXTEND vs FAIL conversation. Also triage discipline check. | chat → PK | Single execute_sql Q1-Q10 vs current state; comparison to thresholds; PK direction. |
| 4 | **Day-19 verdict execution** | **P1 (rank 4 v2.76)** | 2026-05-29 Sydney. Execute all 10 brief §11 scoring queries. Render verdict PASS / FAIL / INVALID. Author postmortem within 14 days per brief §14. If PASS: cc-0015 + cc-0016 unblock. If FAIL: per brief §14 — emitters removed, tables archived. If INVALID: identify cause, decide re-run vs cc-0014-v2. | chat → PK | Plan execution at or after 2026-05-29 Sydney. |
| 5 | **Brief v1.2 doc patch** | **P3 (rank 5 v2.75 carry, scope expanded v2.76)** | Doc-only consolidation: 6 fixture defects + L60 + L63 + L64 + L65 + L-v2.76-a through L-v2.76-f framing. Defer to post Day-19. | chat → future (post Day-19) | Single doc patch via local git. |
| 6 | **cc-0013 Dashboard Phase 0** | **P2 (DEPRIORITISED — rank 6 carry)** | Hold pending cc-0014 Day-19 verdict. If PASS: fold IOL surface as new anchor. If FAIL: return to original scope. If INVALID: address cause first. | chat → future post-Day 19 | Hold. |
| 7 | **Close-the-loop batch sweep — safe buckets COMPLETE; remainder NOT complete** | P2 (rank 7 v2.76) | **Updated 2026-05-17**: 6 rows resolved this session via 2 atomic apply_migration calls — 2 v2.72 carries (`903cfd8e` + `873985f7`) + 4 cc-NNNN family rows (`32ade261` + `9cbc7de3` + `4a48024f` + `defc0fe1`). m.chatgpt_review distribution now: completed 29 / resolved 29 / escalated 22 / total 80. **Remaining: 22 escalated rows** = 21 historical CCH-locked + 1 T-MCP-05 meta (`1bae5068`). **Not to be closed without explicit PK directive** lifting CCH standing rule + resolving meta recursion. | chat → future PK directive | Hold remainder pending explicit directive. |

**Standing P0 (not ranked):** Personal businesses check-in. Crazy Domains refund + clean-up follow-up carry from v2.51.

**Passive observation v2.76**: Cron 83 + 84 (steady-state); cron 85 (Sun 17:30 UTC); cron 86 `friction-verification-daily` (01:15 UTC, active). PRV v1 operator views queryable via `op_reader` role. **friction.* schema state v2.76**: 5 tables live; functions/triggers all from Stage A-E; **`friction.experiment_run` row LIVE: status=running, brief_id=cc-0014, starts_at 2026-05-15 06:20 UTC, ends_at 2026-05-29 06:20 UTC**; **3 DELETE/UPDATE-protection triggers ACTIVE-while-running**. PostgREST exposed_schemas includes `friction`. **6 events + 6 cases** (5 baseline + 1 in-window manual; all 6 acknowledged via /operations). **/operations route live in invegent-dashboard at HEAD `5753f41b`**. **Vercel invegent-dashboard production serving `dpl_9Geda1dbh...` with FAB enabled**. Next natural fires: cron 85 next Sun 17 May 17:30 UTC (first reconciliation opportunity during window); cron 86 daily 01:15 UTC.

---

## 🟢 cc-0014 friction register experiment — STATUS BLOCK (UPDATED v2.76)

**Status v2.76: FULLY CLOSED — 14-day operational window OPEN.** All stages A-E applied through window-open INSERT. Migration `cc_0014_e_close_experiment_run_start` applied 2026-05-16 Sydney. **14-day operational window: 2026-05-15 06:20:13 UTC → 2026-05-29 06:20:13 UTC. Day-19 verdict review = 2026-05-29 Sydney.** No further build work — experiment now in operational phase.

**Brief lineage:** v1.0 → v1.1 final (frozen at commit `34305092f4`). All stages applied through window-open INSERT without further D-01 cycles per §13 governance gate.

**Stages delivered (full list, v2.76 close):**
- Stage A v1.1 (v2.72): schema + grants + 2 triggers + 11 V-checks PASS
- Stage B (v2.73): reconciliation emitter + 5 V-checks PASS
- Stage C (v2.74): health-check emitter + Cowork brief v3.0 + 5 V-checks PASS (V-C3 PENDING)
- Stage D (v2.74 backend + v2.75 frontend close): manual FAB; **v2.76 production deploy** via Vercel env var
- Stage E backend (v2.75): fn_recent_cases + fn_triage_case + 2 V-checks PASS
- Stage E frontend (v2.75): /operations route at HEAD `5753f41b` + V-E3 PASS
- Stage E promotion (v2.75): fn_promote_event_to_case + BEFORE INSERT trigger + 8 V-checks PASS + 5 orphans backfilled
- **Stage E close (v2.76)**: defensive cleanup + experiment_run INSERT with brief §10 verbatim criteria_snapshot; V-E5 PASS post-INSERT; trigger activation probes PASS. **14-day window OPEN.**

**Stages pending:** NONE. Operational phase begins through 2026-05-29.

**V-C3 live verification still pending** (as of 2026-05-17 mid-session): requires live Cowork run. **Blocker corrected 2026-05-17** — prior "silent since 2026-05-06" framing was wrong; Cowork was firing nightly but skipping the brief due to `status: review_required`. Commit `9215de77` reset brief to v3.0 `status: ready`. Awaiting next scheduled Cowork fire.

**Production state at v2.76 close:**
- `friction` schema live in Supabase `mbkmaxqhsohbtwsqolns`
- 5 tables: category (6+1), **event (6 rows — 5 baseline + 1 in-window manual)**, **case (6 rows — all 6 acknowledged via /operations)**, emit_error (0 rows), **experiment_run (1 row, status=running)**
- 4 CHECK constraints on `friction.case`
- **4 triggers in `friction.*`**: 3 ACTIVE-while-running + 1 always-active (promotion BEFORE INSERT)
- 1 active trigger on r.cadence_drift_log (no firings since 2026-05-13)
- 8 functions in `friction.*` (unchanged from v2.75)
- 5 pg_cron jobs (82-86 unchanged)
- PostgREST exposed_schemas: includes `friction` (carry)
- Cowork brief v3.0 at HEAD `bc32e86`
- `invegent-dashboard` HEAD: `5753f41b` (unchanged — env var only)
- **Vercel invegent-dashboard production**: deployment `dpl_9Geda1dbhitN5ykTfV7UxF9A3pKc` with DASHBOARD_FRICTION_FAB_ENABLED=true
- Localhost `.env.local` still has flag enabled (cleanup post-window recommended)
- main HEAD: this commit building on `98c6227c` (sync_state) building on `e3a2d6a7` (session file) building on `f35f8ea4` (cc-0016 brief) building on `9a5dc155` (cc-0015 brief)

**Stage E close V-check evidence (v2.76):**

| V-check | Evidence |
|---|---|
| V-E4 | PASS pre-flight: 0/0/0 residue across friction.event/case/emit_error; cron-86 verify/2026-05-15 marker deleted in migration |
| V-E5 pre-state | PASS: 0 running rows, 0 cc-0014 rows, 0 total |
| V-E5 post-INSERT | PASS: brief_id=cc-0014, status=running, window=14 days exact, criteria_locked_at set, all 5 criterion keys + invalidation present |
| DELETE-protection trigger probe | PASS: INSERT real test row (outer subtxn), DELETE (inner subtxn), trigger fired P0001, outer rollback successful; 0 residual |
| criteria_snapshot immutability probe | PASS: UPDATE on criteria_snapshot raised P0001 |
| notes mutability probe | PASS: UPDATE on notes succeeded, then reverted via subtxn rollback |
| final state | PASS: 5 events / 5 cases / 0 emit_errors / 1 running run / notes=NULL / 0 residual |

(6 events/6 cases count reflects post-INSERT in-window event filed via live FAB.)

**FAB live on production V-check evidence (v2.76):**

| Check | Evidence |
|---|---|
| Env var present | Vercel UI: DASHBOARD_FRICTION_FAB_ENABLED, Production + Preview scope |
| Redeploy fired | API: deployment `dpl_9Geda1dbhitN5ykTfV7UxF9A3pKc`, target=production, state=READY, action=redeploy |
| Code unchanged | originalDeploymentId points at v2.75 close state at commit `5753f41b` |
| Custom domain | API: `dashboard.invegent.com` resolves to this deployment |
| Live FAB renders | PK confirmed FAB visible on /content-studio |
| Live FAB submits | Form returned event_id `fbd1b12d-27fd-4444-a861-8051ac3a9937`; DB confirmed source=manual + in_window=true + auto-derived fields |
| Promotion trigger fires | DB: case `b7369dc9-f0d1-4f70-903c-6a590c21a657` created same txn |
| Live triage round-trip | DB: 8 fields persisted (triage_state=acknowledged, quality_flag=true, action_decision=track, next_review_at=2026-05-23, capture_reason=routine_log, capture_reason_note='dashboard review', reviewed_at) |

**D-01 fires this session: 0** (per brief §13).

**Cumulative D-01 history for cc-0014** (resolution status cells updated 2026-05-17):
| review_id | brief version | session | verdict | classification | resolution status |
|---|---|---|---|---|---|
| `903cfd8e` | v1.0 | v2.72 | partial | type-(b) | PK-resolved (Path A re-fire); close-the-loop UPDATE **RESOLVED 2026-05-17** (migration `close_chatgpt_review_v2_72_carries`) |
| `873985f7` | v1.1 | v2.72 | partial | type-(c) | PK-resolved (state-capture override per L62; brief frozen at v1.1); close-the-loop UPDATE **RESOLVED 2026-05-17** (migration `close_chatgpt_review_v2_72_carries`) |

**Result file:** deferred to Day-19 verdict 2026-05-29.

**Session files:**
- 2026-05-14 Stage A (v2.72)
- 2026-05-15 Stage B (v2.73)
- 2026-05-15 Stage C (v2.74)
- 2026-05-15 Stage D + E prerun (v2.75)
- **2026-05-16 v2.76 stage E close + window open (NEW v2.76)**

**Open follow-ups:**
- In-window operational FAB use (rank 1 v2.76)
- Cowork output pipeline recovery (rank 2 v2.76)
- Mid-window check-in at ~Day 7 (rank 3 v2.76)
- Day-19 verdict execution (rank 4 v2.76)
- V-C3 live Cowork verification (depends on Cowork recovery)
- Close-the-loop UPDATEs on 2 v2.72 rows: **RESOLVED 2026-05-17** (migration `close_chatgpt_review_v2_72_carries`)
- Brief v1.2 doc patch (scope expanded v2.76)
- L58 + L59 + L60 + L63 + L64 + L65 + L-v2.76-a-f candidates — promotion pending (L58 now baseline)
- Localhost FAB cleanup post-window

---

## 🟢 cc-0015 Friction Pool View — STATUS BLOCK (NEW v2.76)

**Status v2.76:** **AUTHORED, PENDING_EXECUTION.** Commit `9a5dc155`. File: `docs/briefs/cc-0015-friction-pool-view.md` (20.3 KB). Strategic anchor: extends cc-0014. Operationalises register as pool consumed in concentrated sessions. **Depends on:** cc-0014 complete + Day-19 verdict resolved (PASS or INVALID-EXTEND). Do not execute under FAIL verdict.

**7 stages drafted:**
- Stage A — Schema additions (`dashboard_ui` category split + `pool_session` table + backfill plan)
- Stage B — Pool view UI on /operations (filter bar, saved views, sort, count badge)
- Stage C — Batch resolution (checkboxes, batch action bar, per-case execution loop)
- Stage D — Pool dashboard widget (status strip + click-through)
- Stage E — Pool session tracking (light-touch table, operator-initiated)
- Stage F — **Operator surface copy** (highest value — addresses cc-0014 first-week gap; FrictionFieldHelp component + source-of-truth dict)
- Stage G — Process doc `docs/process/ICE-PROC-002-pooled-resolution.md` (Fri 0900 Sydney cadence)

**D-01 framing:** Fire one D-01 before Stage A. 7 questions.

**Effort:** 12-15h over ~3 sessions.

**Open decisions deferred to stage execution:** Pool session UI placement; quality_flag auto-set behaviour; dashboard_ui auto-suggest `track`; status strip oldest-age display.

---

## 🟢 cc-0016 Friction Capture Evidence — STATUS BLOCK (NEW v2.76)

**Status v2.76:** **AUTHORED, PENDING_EXECUTION.** Commit `f35f8ea4`. File: `docs/briefs/cc-0016-friction-capture-evidence.md` (24.8 KB). Strategic anchor: extends cc-0014. **Depends on:** cc-0014 complete + Day-19 verdict resolved. Parallel-executable with cc-0015.

**5 stages drafted:**
- Stage A — Storage bucket `friction-evidence` + `friction.event.attachments` jsonb column + helper view
- Stage B — FAB upload UX (drag-and-drop / paste / file-picker; client-side UUID; thumbnail strip; 3 max, 5MB each, JPG/PNG/WebP)
- Stage C — Extended `fn_emit_manual_event` (adds `p_event_id` + `p_attachments`; backward-compatible)
- Stage D — Attachment display on /operations (thumbnails, lightbox, signed URLs cached)
- Stage E — Lifecycle (18-month auto-delete pg_cron weekly; storage cost cap)

**D-01 framing:** Fire one D-01 before Stage A. 7 questions.

**Effort:** 8-10h over ~2 sessions.

**Out of scope (v1.0):** Video; audio/voice notes; PII detection/redaction; annotation tools; multi-tenant scoping.

---

## 🟢 cc-0012 PRV v1 — STATUS BLOCK (carried v2.76, condensed)

**Status v2.76:** **CLOSED-WITH-VERIFIED-VARIANCE v2.71.** Unchanged. 3 carry items in v1.1 doc patch (P3 deprioritised).

---

## 🟢 cc-0010B ice-evidence-materialiser — STATUS BLOCK (carried v2.76, condensed)

**Status v2.76:** **CLOSED-WITH-VERIFIED-VARIANCE v2.68.** Unchanged. Result: `docs/briefs/results/cc-0010B-ice-evidence-materialiser.md`.

---

## 🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK (carried v2.76, condensed)

**Status v2.76:** **APPLIED + CLOSED v2.67.** v1.6 doc patch DEPRIORITISED to P3. Result: `docs/briefs/results/cc-0010A-r-reconciliation-ddl-foundation.md`.

---

## 🟢 Process Upgrades L44–L48 + L52–L65 + L-v2.76-a through L-v2.76-f — STATUS BLOCK (UPDATED v2.76)

**Status v2.76:** L40 reified v2.68. L44 + L45 + L46 + L48 baseline-eligible. **L58 PROMOTED TO BASELINE v2.76** (3 consecutive preventive applications in cc-0014 lineage with zero failures). L60 at 7 occurrences (all within cc-0014; promotion pending pattern repeat in independent brief). L63 + L64 + L65 candidates carry from v2.75 (1 each). **6 NEW L-candidates v2.76 (a-f):**

- **L41**: re-exercised v2.76 (Vercel API + post-INSERT trigger probes + post-FAB DB probes). 5+ exercises now.
- **L44**: re-exercised v2.76 (V-E4 + V-E5 + baseline exclusion audit). 7 cycles cumulative. Baseline-eligible.
- **L45**: re-exercised v2.76 (4 post-INSERT verifications + Vercel API + DB probes). 5+ exercises now.
- **L46**: not exercised v2.76 (0 D-01 fires). Pattern shape v2.76 reinforces v2.73 + v2.74 + v2.75: four consecutive 0-D-01 stage-execution sessions.
- **L47**: still deferred.
- **L48**: re-exercised v2.76 (1 atomic migration).
- **L52**: not exercised v2.76 (no EF deploys).
- **L53**: not exercised v2.76.
- **L54**: not exercised v2.76.
- **L55**: not exercised v2.76 (PK pre-execution review caught probe defect class L-v2.76-c pre-fire).
- **L56**: not exercised v2.76.
- **L57**: not exercised v2.76.
- **L58 PROMOTED TO BASELINE v2.76.** 3rd preventive application this session. Cumulative: 1 reactive (v2.72) + 3 preventive (v2.73 + v2.74 + v2.75) + 1 baseline (v2.76). Per-file single-commit strategy now default.
- **L59**: vindicated by trigger activation this session (DELETE-protection P0001 fired). Not re-exercised in new code.
- **L60**: NOT exercised v2.76 — different defect class. 7 occurrences cumulative. Promotion pending.
- **L62**: not exercised v2.76 (0 D-01 fires).
- **L63 + L64 + L65 candidates carry from v2.75**: not re-exercised. 1 occurrence each. Promotion pending.
- **L-v2.76-a NEW** — Project IDs cited in chat must be verified from userMemories at point of citation. v2.76 burned by `prj_EpPsX7gCu5wGbiSJr1SA3CmjVlAa` confidently asserted as invegent-dashboard when it's invegent-portal. Pattern: query userMemories before typing a project ID. 1 occurrence; promotion pending.
- **L-v2.76-b NEW** — Env-gated feature flag setup directives must explicitly state literal value shape (case sensitivity, no quotes, no whitespace). Strict `=== "true"` gates fail silently. Pattern: explicit literal in directive. 1 occurrence; promotion pending.
- **L-v2.76-c NEW** — Row-level BEFORE DELETE trigger probes require existing row + savepoint-rollback DO block. DELETE on non-existent rows produces false PASS. Pattern: INSERT test row first, then DELETE, then force outer rollback. 1 occurrence (caught pre-fire by PK); promotion pending.
- **L-v2.76-d NEW** — Post-stage emitter coverage verification at window-open moment. Pattern: window-open checklist for each declared emitter. 1 occurrence; promotion pending.
- **L-v2.76-e NEW (positive)** — PK pre-execution review caught 3 verification defects before chat-side fire. Confirms pre-fire review value. Generalisable. 1 occurrence; promotion pending.
- **L-v2.76-f NEW** — Destructive memory operations must check each target against explicit approved-list at moment of execution, not against re-derived intent. Same class as L-v2.76-a (chat operating from cached internal state when authoritative source available). 1 occurrence; promotion pending.

**L-v2.76-a + L-v2.76-f share deeper class**: chat operates from cached internal state when authoritative source is available. Both could have been prevented by "look up source-of-truth at moment of action, not from working memory."

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.76)

Unchanged from v2.65–v2.75. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

**v2.76 update:**
- **Day-19 verdict for cc-0014: 2026-05-29 Sydney.** Capture window ends_at = 2026-05-29 06:20:13 UTC. **LOCKED**.
- **Mid-window check-in target: ~2026-05-22 Sydney (Day 7).** Soft deadline.

Other items unchanged from v2.75.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.76 application**: 0 D-01 fires. Cumulative T-MCP-02 stays at **66**.

**L46 Evidence Gate v2.76**: not exercised. Pattern reinforced v2.76 (extends v2.73 + v2.74 + v2.75): four consecutive 0-D-01 stage-execution sessions under brief §13 governance gate.

**Close-the-loop UPDATEs v2.76: 0.** 5 prior + 2 v2.72 + 24 historical = **31 eligible** (unchanged).

**Close-the-loop UPDATEs 2026-05-17 reconciliation: 6** (2 v2.72 carries + 4 cc-NNNN family rows). Migrations: `close_chatgpt_review_v2_72_carries` + `close_chatgpt_review_cc_nnnn_family`. **22 escalated rows remain** = 21 historical CCH-locked + 1 T-MCP-05 meta (`1bae5068`). Not to be closed without explicit PK directive. Safe buckets complete; full sweep NOT complete.

---

## 🤖 Cowork automation (D182)

**v2.76 status (updated 2026-05-17):** Cowork brief v3.0 frozen at HEAD `bc32e86`. Cron 82 + 83 + 86 firing normally. **Cowork pipeline blocker corrected 2026-05-17**: prior "silent since 2026-05-06" framing was empirically wrong — Cowork has been firing nightly ~16:02 UTC since 2026-05-05 (12 consecutive `docs/runtime/runs/no-ready-briefs-*.md` state files). Actual blocker: nightly-health-check-v1 brief stuck `status: review_required` since 2026-05-04; Cowork's owner-gate skipped it each fire. Commit `9215de77` reset brief to v3.0 `status: ready` (2026-05-17). Awaiting next scheduled Cowork fire (~2026-05-17 16:02 UTC). P1 rank 2 OPEN until V-C3 PASS on first live run after `9215de77`.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0014 operational window** | 14-day window OPEN; manual FAB live; mid-window + Day-19 scheduled | **P1 (rank 1-4 v2.76)** | OPEN. starts_at 2026-05-15 06:20 UTC, ends_at 2026-05-29 06:20 UTC. 1 in-window event + 1 case (manual via live FAB, acknowledged + quality_flag=true). | PK + chat | Continuous FAB use; mid-window ~2026-05-22; verdict 2026-05-29 |
| **cc-0014 Stage E close** | Window-open INSERT | **P1 (CLOSED v2.76)** | CLOSED. 4 post-INSERT verifications PASS. | informational | (closed) |
| **cc-0014 Stage D production deploy** | Vercel env var + redeploy on live | **P1 (CLOSED v2.76 NEW)** | CLOSED. Env var DASHBOARD_FRICTION_FAB_ENABLED=true set. dpl_9Geda1dbh... serving. Smoke test + triage PASS. | informational | (closed) |
| **cc-0015 friction-pool-view brief** | Authored PENDING_EXECUTION | **P3 (post Day-19)** | DRAFTED. Commit `9a5dc155`. Blocked-on Day-19 verdict. | chat → post Day-19 | If PASS: execute A→G (12-15h over 3 sessions) |
| **cc-0016 friction-capture-evidence brief** | Authored PENDING_EXECUTION | **P3 (post Day-19)** | DRAFTED. Commit `f35f8ea4`. Blocked-on Day-19 verdict. Parallel-executable. | chat → post Day-19 | If PASS: execute A→E (8-10h over 2 sessions) |
| **cc-0014 Stage C** | Health-check Cowork brief v3.0 dual-write + pg_cron | P1 (APPLIED, V-C3 PENDING) | APPLIED v2.74. V-C3 pending live Cowork run. | chat → Cowork / PK manual | Wait natural OR `openclaw tui` |
| **V-C3 live Cowork verification** | Live Cowork run produces friction.event matching markdown finding_ids | **P1 (rank 2 v2.76)** | PENDING. **Blocker corrected 2026-05-17**: Cowork was scheduler-firing nightly but skipping the brief due to `status: review_required`. Commit `9215de77` reset to v3.0 `status: ready`. Awaiting next scheduled fire. | Cowork (scheduled) → chat | Chat runs V-C3 reconciliation probe after next `docs/audit/health/YYYY-MM-DD.md` + run-state file land |
| **Mid-window check-in at Day 7** | Empirical reading of brief §11 Q1-Q10 at ~2026-05-22 Sydney | **P1 (rank 3 v2.76 NEW)** | SCHEDULED ~2026-05-22 | chat → PK | Single execute_sql Q1-Q10; PK direction |
| **Day-19 verdict execution** | Final 10 scoring queries + verdict + postmortem | **P1 (rank 4 v2.76 NEW)** | SCHEDULED 2026-05-29 Sydney | chat → PK | Execute scoring; render PASS/FAIL/INVALID; postmortem within 14 days |
| **Brief v1.2 doc patch** | 6 defects + L60/L63/L64/L65/L-v2.76-a-f framing | **P3 (rank 5 v2.76)** | DRAFT scope expanded. Doc-only. | chat → future (post Day-19) | Single doc patch when PK greenlights |
| **cc-0013 Dashboard Phase 0** | DEPRIORITISED pending verdict | P2 (DEPRIORITISED carry) | HOLD. /operations + live FAB consumable. | chat → post-Day 19 | Hold |
| **v1.1 cc-0012 minor doc patch (3 items)** | Var-A1 + Var-A2 + Var-A3 | P3 (carry v2.72) | HOLD | chat → future | Doc-only |
| **v1.6 cc-0010A doc patch (3 items)** | result_jsonb rename + trigger audit + queue_id non-FK | P3 (carry v2.72) | HOLD | chat → future | Doc-only |
| **v1.3 cc-0011 minor doc patch (5 items)** | E1 + Var-A/B/C/E | P3 (carry v2.72) | HOLD | chat → future | Doc-only |
| **Close-the-loop batch sweep — safe buckets COMPLETE; remainder NOT complete** | 6 resolved 2026-05-17 (2 v2.72 + 4 cc-NNNN family); 22 remain (21 historical CCH-locked + 1 T-MCP-05 meta) | P2 (rank 7 v2.76) | PARTIAL COMPLETE 2026-05-17. Safe buckets closed via 2 atomic migrations. Remainder gated on explicit PK directive. | chat → future PK directive | Hold remaining 22 until PK lifts CCH standing rule (21 historical) + resolves T-MCP-05 meta recursion (1 row) |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 audit** | 3 geography rows + trigger filter | P3 (carry v2.71) | Strengthened v2.68. | chat → future | Separate cc-NNNN cleanup brief |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface | P2 — fully eligible v2.68 | cc-0010A + cc-0010B delivered. | PK → chat | When PK greenlights |
| **Dashboard Architecture Review Phase 0** | 7 confirm-defaults | P1 TOP (unchanged) | Carry. | PK | Confirm via cc-0001 |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future | DDL + tile |
| **Publisher latent config risk** | verify_jwt = false doc patch | P3 (carry) | OPEN | chat → future | Single-file commit |
| **M8b separate brief authoring** | Function rename | P3 (carry) | NOT YET AUTHORED | PK → chat | When PK directs |
| **94-row un-publishable legacy draft cohort** | SQL filter per cc-0007 | P3 (carry) | LOGGED | PK → chat → future | If PK directs |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 inline secret | P2 (security, OPEN) | OPEN | chat → future (PK approval) | PK authorisation |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter | P3 (carry) | LOGGED | chat → future | — |
| **morning-inbox-sweep-v1 brief amendment** | PK personal-email morning triage | P3 (carry) | DRAFT exists | PK → chat | PK reviews |
| **22 escalated m.chatgpt_review rows remain (updated 2026-05-17)** | 21 historical CCH-locked + 1 T-MCP-05 meta (`1bae5068`); post safe-buckets sweep | P3 (carry; gated) | Untouched per CCH; not to be closed without explicit PK directive | chat → future PK directive | Hold pending PK lift of CCH standing rule + resolution of meta recursion |
| **Memory cap hygiene** | 19/30 v2.76 (down from 30/30) | **DOWNGRADED to P3 v2.76** | 11 free slots; not urgent. | chat → future | Add v2.77+ memories as needed |
| **Parallel agent coordination (L47)** | informational | P3 (carry) | No conflicts observed v2.76. | chat → future | Passive observation |
| **Dashboard mobile responsiveness** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session | — |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | — |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | P3 | OBSERVED | chat → T05 unblock | — |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future | — |
| **Vault `service_role_key` naming** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future | Read-only scope-check |
| **Cowork output pipeline — blocker corrected 2026-05-17** | Brief was `status: review_required` since 2026-05-04 — Cowork's owner-gate skipped it each fire (Cowork itself was firing nightly). Reset to v3.0 `status: ready` via commit `9215de77`. | **P1 (rank 2 v2.76)** | OPEN until V-C3 PASS on first live run after `9215de77` | Cowork (scheduled) → chat | Wait for next scheduled fire; chat runs V-C3 reconciliation probe |
| **`00_overview.md` 11-section table** | Architecture review structure change | P3 | Required updates | chat → future | ~15 min |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure = Phase 2 B-09-14 | chat → Phase 2 | Bulk approve UI |
| **Dashboard roadmap PHASES** | PHASES array stale since 3 May | P3 | Carried (**29th deferral v2.76**) | chat → post-cc-0014 verdict | Update after Day 19 |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 natural OR synthetic test |
| **4× F-CRON-*-STALE** | jobids 1/29/30/31/39 | P2 | LOGGED | PK → future | Decide |
| **Music library activation** | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK | PK | — |
| **Emergency redeploy governance** | Expedited D-01? | P2 (PK decision) | PENDING PK | PK | PK rules |
| **`f4a0dd85` bridge health-check** | hygiene only | P3 (carry) | OBSERVED | PK → future | — |
| **Feature branch `feature/cc-0009-stage-b-ef-source`** | Audit artifact at HEAD `9796b0ee` | P3 (carry) | OBSERVED | PK → future | — |
| **3 pre-v2 forensic `r.reconciliation_run failed` rows** | cc-0010B Stage E pre-fire | P3 (carry v2.68) | PK forensic-accepted | informational | — |
| **github MCP write tools (baseline per L58 v2.76)** | Per-file single-commit default | informational (baseline) | L58 promoted to baseline. | informational | — |
| **Localhost FAB cleanup post-window** | `.env.local` still has flag enabled | P3 (carry v2.76 NEW) | OPEN — cross-surface duplicate risk | PK → post Day-19 | Set value to false or delete line |

**Closed v2.76:** cc-0014 Stage E close (window-open INSERT); cc-0014 Stage D production deploy (Vercel env var enabling FAB on live).
**Closed v2.75:** Stage D, E backend, E frontend, E promotion.
**Closed v2.74:** (none — Stage C is a milestone.)
**Closed v2.73:** (none — Stage B is a milestone.)
**Closed v2.72:** (none — Stage A is a milestone.)
**Closed v2.71:** cc-0012 PRV v1 CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.70:** cc-0011 cadence-drift-checker CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.69:** cc-0010C reconciliation-matcher CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.68:** cc-0010B ice-evidence-materialiser CLOSED-WITH-VERIFIED-VARIANCE.
**Closed v2.67:** cc-0010A v1.5 APPLIED + CLOSED.

---

## 💼 Personal businesses

**v2.76 carry (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check next session.

*(no other items flagged at v2.76 close — standing P0 to ask at next session start.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.75.

---

## 📌 Backlog

**v2.76 changes:**

- **NEW v2.76**: cc-0014 fully CLOSED through window-open INSERT. 14-day operational window OPEN 2026-05-15 → 2026-05-29.
- **NEW v2.76**: FAB live on production via Vercel env var. Deployment dpl_9Geda1dbh... serving dashboard.invegent.com.
- **NEW v2.76**: cc-0015 friction-pool-view brief AUTHORED PENDING_EXECUTION (commit 9a5dc155). Blocked-on Day-19.
- **NEW v2.76**: cc-0016 friction-capture-evidence brief AUTHORED PENDING_EXECUTION (commit f35f8ea4). Parallel-executable.
- **STATE CHANGE v2.76**: Today/Next 5 reshuffled — rank 1 in-window FAB use; rank 2 Cowork recovery; rank 3 mid-window check-in NEW; rank 4 Day-19 verdict NEW; rank 5 brief v1.2 doc patch (scope expanded); rank 6 cc-0013; rank 7 close-the-loop.
- **L58 PROMOTED TO BASELINE v2.76**.
- **6 NEW L-candidates v2.76 (a-f)**.
- **L41 + L45 re-exercised v2.76**: 5+ exercises now.
- **L44 re-exercised v2.76**: 7 cycles. Baseline-eligible.
- **L48 re-exercised v2.76**.
- **L60 NOT exercised v2.76**.
- **0 D-01 fires this session**. T-MCP-02 cum 66. Four consecutive 0-D-01 stage-execution sessions.
- **Memory edit cycle v2.76**: 30/30 → 19/30. Hygiene DOWNGRADED P1→P3.
- **Sync via 3 single-file chat MCP commits** per L58 baseline.
- **Brief v1.2 doc patch scope expanded v2.76**.
- **CARRIED v2.76**: Dashboard roadmap PHASES — **29th** consecutive deferral.
- **NEW v2.76 carry**: Localhost FAB cleanup post-window.

**Pre-v2.76 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a through L-v2.76-f framing carried + extended from v2.75. **v2.76 updates:**

- **L41 + L45 re-exercised v2.76**: 5+ exercises.
- **L44 re-exercised v2.76**: 7 cycles. Baseline-eligible.
- **L46**: not exercised v2.76 (4 consecutive 0-D-01 stage-execution sessions).
- **L48 re-exercised v2.76**: 1 atomic migration.
- **L52 / L53 / L55 / L57**: not exercised v2.76.
- **L58 PROMOTED TO BASELINE v2.76**.
- **L59**: vindicated by trigger activation this session.
- **L60**: NOT exercised v2.76. 7 occurrences cumulative. Promotion pending.
- **L62**: not exercised v2.76.
- **L63 + L64 + L65 carry from v2.75**: 1 occurrence each. Promotion pending.
- **L-v2.76-a through L-v2.76-f NEW candidates**: 1 occurrence each. Promotion pending.

**All candidates recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates** (L37–L65 + L-v2.76-a-f, plus standing baseline).

---

## v2.76 honest limitations

- All v2.31–v2.75 limitations apply.
- **cc-0014 fully closed through window-open but verdict not yet rendered.** Day-19 = 2026-05-29 Sydney. 14-day window running with 1 in-window event from 1 source (manual). Criterion 3 likely structurally challenging unless Cowork recovers or Monday reconciliation fires.
- **V-C3 PENDING live Cowork run.** Cowork silent 11+ days.
- **L58 PROMOTED TO BASELINE v2.76.** All 3 preventive applications within cc-0014 lineage. One more independent occurrence in non-cc-0014 context would strengthen but not strictly required.
- **L60 candidate all within single brief** (cc-0014). 7 occurrences. Promotion pending pattern repeat in cc-NNNN ≠ 0014.
- **L63 + L64 + L65 each at 1 occurrence within cc-0014**. Promotion pending.
- **6 NEW L-candidates v2.76 (a-f) each at 1 occurrence**. Promotion pending. a + f share class.
- **0 clean pass-through D-01s v2.76** — 4 consecutive 0-D-01 stage-execution sessions under brief §13.
- **5 prior + 2 v2.72 + 24 historical close-the-loop UPDATEs** — 17 sessions overdue.
- **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION** still P3.
- **Dashboard PHASES** — **29th** consecutive deferral.
- **Memory cap 19/30 v2.76** — DOWNGRADED to P3. 11 free slots.
- **Action_list ~50KB at v2.76 close**.
- **Per-session files v2.76**: 1 — 2026-05-16-v2.76-stage-e-close-and-window-open.md.
- **Result file v2.76**: N/A (cc-0014 result at Day-19 verdict).
- **Doc-sync v2.76**: 3 separate single-file chat MCP commits per L58 baseline. Dashboard PHASES 29th deferral intentional.
- **Close-the-loop UPDATEs v2.76**: 0. 31 eligible.
- **State-capture exceptions v2.76: 0**. Cumulative: 1.
- **Cowork output pipeline silence P1 OPEN rank 2** — escalated v2.76.
- **Memory edit defect recovery v2.76**: 1 unauthorised remove of #10 caught + recovered. L-v2.76-f.
- **Vercel project ID error recovery v2.76**: wrong ID cited; PK navigated by name. L-v2.76-a.
- **Env var value shape error recovery v2.76**: TRUE uppercase silent failure. L-v2.76-b.
- **Trigger probe defect catch v2.76 (positive)**: PK pre-execution review caught probe defect class pre-fire. L-v2.76-c + L-v2.76-e.

---

## Changelog

- v1.0–v2.75: per commit history + sync_state archive.
- **v2.76 (2026-05-16 Sydney, cc-0014 FULLY CLOSED + 14-DAY WINDOW OPEN + FAB LIVE ON PRODUCTION + cc-0015 + cc-0016 DRAFTED):**
  - **Build arc**: pre-flight V-E4 + V-E5 + baseline exclusion audit → **PK pre-execution review caught 3 verification defects** → corrected migration with savepoint-rollback DO blocks + Day-19 wording fix → migration `cc_0014_e_close_experiment_run_start` applied single-shot → 4 post-INSERT verifications all PASS → FAB env var directive → 2 mid-execution defects caught + recovered (wrong project ID + uppercase value) → second redeploy succeeded → live FAB smoke test + triage end-to-end PASS → emitter coverage diagnostic refuted initial chat claim → cc-0015 brief drafting + commit `9a5dc155` → cc-0016 brief drafting + commit `f35f8ea4` → memory edit cycle (30→19 with 1 unauthorised remove caught + recovered) → 3-commit sync drafting.
  - **Stage E close V-check pattern**: V-E4 + V-E5 pre-state + V-E5 post-INSERT + DELETE-protection probe + criteria_snapshot immutability + notes mutability + final state = all PASS.
  - **FAB production deploy V-check pattern**: env var + redeploy + code unchanged + custom domain + live render + live submit + promotion trigger + live triage round-trip = all PASS.
  - **D-01 fires (0)**: per brief §13. T-MCP-02 cum 66. State-capture exceptions cum 1.
  - **L-series outcomes**: L41 + L45 re-exercised (5+ exercises). L44 re-exercised (7 cycles, baseline-eligible). L48 re-exercised. L55 + L60 NOT exercised. **L58 PROMOTED TO BASELINE**. **6 NEW L-candidates (a-f)**. a + f share deeper class.
  - **Pattern firsts (5)**: (1) first cc-NNNN to fully complete through window-open INSERT; (2) first session with PK pre-execution review catching 3 verification defects pre-fire; (3) first session with 2 mid-execution defects caught + recovered via PK route-around; (4) first session where chat-side caught + recovered its own unauthorised destructive memory operation mid-cycle; (5) first session with 2 follow-up briefs drafted in same session as parent brief closure.
  - **Today/Next 5 rebuild**: rank 1 in-window FAB use; rank 2 Cowork recovery; rank 3 mid-window check-in NEW; rank 4 Day-19 verdict NEW; rank 5 brief v1.2 doc patch (scope expanded); rank 6 cc-0013; rank 7 close-the-loop.
  - **Active rows updated v2.76**: new "cc-0014 operational window" row P1 rank 1-4; Stage E close CLOSED; Stage D production deploy CLOSED; cc-0015 + cc-0016 brief rows added P3; mid-window + Day-19 verdict added P1; Cowork silence escalated P1 rank 2; memory cap hygiene DOWNGRADED P3; localhost FAB cleanup carry added P3.
  - **STATUS BLOCK v2.76**: cc-0014 with full A-E closure + Stage E close V-check evidence + FAB production deploy V-check evidence; new cc-0015 status block; new cc-0016 status block.
  - **Closure budget**: ~8h v2.76 cycle. Trailing-14-day cumulative ~116h above 8.0h floor.
  - **Doc-sync v2.76**: 3 separate single-file chat MCP commits per L58 baseline. 13 memory edits (11 removes + 1 unauthorised remove caught + 1 restore + 2 in-place replaces; final 19/30). Dashboard PHASES NOT updated — 29th consecutive deferral.
  - **Production mutations v2.76**: 1 apply_migration; ~12 execute_sql; 0 EF deploys; 0 cron mutations; 0 vault writes; 0 D-01 fires; 3 chat MCP GitHub commits (cc-0015 brief + cc-0016 brief + 3-file sync close); 0 CCD commits; 1 PK manual Vercel UI change (env var + value correction); 1 PK manual Vercel UI action (Redeploy); 13 memory edits.
  - **T-MCP-02 cum**: 66. State-capture exceptions: 1. L46 baseline: not exercised.
