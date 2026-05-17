# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-18 Sydney (**v2.77 — cc-0014 CLOSED-ARCHIVED + RECON CRON DAILY + IOL HOLD-STANCE LIFTED.** Closed 11 days before scheduled Day-19 verdict by PK reframing decision. Migration `cc_0014_close_archived` applied (`friction.experiment_run.status` running→archived; notes 2001 chars verbatim rationale; `criteria_snapshot` preserved immutable as audit trail). Migration `cc_0014_recon_daily_cadence` applied (cron 85 schedule `30 17 * * 0` → `30 17 * * *` daily; jobname stays cosmetic `cadence_drift_checker_weekly` — rename blocked by permissions). **D-IOL-001 logged** in `docs/06_decisions.md`: friction register reframed from experiment requiring verdict to standing operational infrastructure. **IOL hold-stance LIFTED**: cc-0015 + cc-0016 + publisher recovery sequence + dashboard PHASES + brief authoring all unblocked. Postmortem authored per brief §14 commitment at `docs/postmortems/cc-0014-closing-note.md`. **2 D-01 fires this session** (review_id `6a90cacf` close-as-archived 3 type-(c) generic + review_id `94bd6835` recon daily 1 type-(c) generic; PK explicit approval stood per L62 in both cases). Yesterday's review_id `3ff74643` (close-as-passed proposal) returned 4 type-(b) genuine pushbacks correctly identifying overclaim — pushback satisfied by revised plan to archived rather than passed. **T-MCP-02 cum: 69** (+3 across v2.77 cycle). **State-capture exceptions cum unchanged at 1** — type-(c) PK approval is not override of type-(b). **L62 baseline-eligible** (3+ exercises cumulative). **No new L-candidates this session.** **Atomic 4-file push** commit `d6bf9e4a` (postmortem + session note + decisions D-IOL-001 + sync_state v2.77). This file (`docs/00_action_list.md` v2.77 rebuild) is a follow-up commit. Dashboard PHASES **30th consecutive deferral** — now eligible for next dashboard session per D-IOL-001. **Day-19 calendar item retired**; mid-window check-in retired.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rules unchanged from v2.76.** D-01 + D-186 + D-YT-OAUTH-1 + D-PREV-16 + Lesson #62 (L46) + #68 + v2.46/47/48/50/55/56/57/58 + L33–L65 + L-v2.76-a through L-v2.76-f carried. **D-IOL-001 NEW v2.77.**

**v2.77 ADDITIONS:**
- **cc-0014 CLOSED-ARCHIVED.** Closed Day 4 of 14-day window by PK reframing decision. `friction.experiment_run.status` = `archived` (terminal neutral state). `criteria_snapshot` preserved immutable on archived row as audit trail. Postmortem at `docs/postmortems/cc-0014-closing-note.md`.
- **Reconciliation cron 85 promoted weekly → daily.** Migration `cc_0014_recon_daily_cadence`. Schedule now `30 17 * * *`. First daily fire 2026-05-19 03:30 AEST.
- **D-IOL-001 logged in decisions.md.** Friction register = standing operational infrastructure, not experiment. No sunset (structural reframing).
- **IOL hold-stance LIFTED.** cc-0015 + cc-0016 + publisher recovery + dashboard PHASES + brief authoring all unblocked.
- **3 D-01 fires across v2.77 cycle** (1 yesterday close-as-passed + 2 today close-as-archived + recon daily). T-MCP-02 cum 66→69. State-capture exceptions unchanged at cumulative 1.
- **L62 re-exercised 2× this session** (3+ cumulative; baseline-eligible).
- **No new L-candidates this session.**
- **Atomic 4-file push** (postmortem + session note + decisions + sync_state) commit `d6bf9e4a`. This action_list update is the v2.77 follow-up commit.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~3 (recon daily diagnostic + health_check signal diagnostic + dashboard PHASES sync) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~10h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring allowed |

**v2.77 cycle: ~1.5h total** (2 migrations + atomic docs push + memory edits + action_list rebuild).

**State-capture exception count v2.77: 0** (3 D-01 fires across cycle; all type-(b) satisfied or type-(c) PK approval; no override consumed). Cumulative: 1.

---

## ⭐ Today / Next 5

> **Last rebuilt:** 2026-05-18 Sydney (v2.77).
> **v2.77 note:** cc-0014 closed-archived. Verdict ritual retired. Friction register transitions to standing infrastructure. Three diagnostic streams (manual proven; recon needs daily-cadence observation; health_check needs V-C3 + signal-production investigation). Publisher recovery sequence (music/IG/YT) and cc-0015 + cc-0016 now in normal queue.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Reconciliation daily cadence diagnostic** | **P1 (rank 1 v2.77 NEW)** | First daily fire 2026-05-19 03:30 AEST. Observe whether daily cadence detects drift that weekly missed. If `r.cadence_drift_log` rows land + `friction.event` source='reconciliation' rows emit, signal pipe is alive. If `r.cadence_drift_log` rows land but `friction.event` doesn't get rows, trigger defect. If neither, no real drift in pipeline. Three failure modes possible; read-only diagnosis. | chat → PK | Post-fire SQL: count `r.cadence_drift_log` rows since 2026-05-18 17:30 UTC + count `friction.event` source='reconciliation' rows same window. |
| 2 | **Health_check V-C3 + signal-production diagnostic** | **P1 (rank 2 v2.77 carry)** | V-C3 still PENDING since 2026-05-15. Cowork brief reset to v3.0 `status: ready` via commit `9215de77` (2026-05-17). Awaiting next Cowork fire. Three sub-questions: (a) does Cowork fire and write `docs/audit/health/YYYY-MM-DD.md`? (b) does the markdown contain findings? (c) do those findings emit `friction.event` source='health_check' rows? Each is its own diagnostic. | Cowork (scheduled) → chat | Check for new `docs/audit/health/YYYY-MM-DD.md` post-fire window; reconcile against friction.event. |
| 3 | **Music library activation** | **P2 (rank 3 v2.77 NEW promoted from P3)** | Code already wired in `video-worker` v3.0.0 (deployed 8 May). Activation gated by env var `VIDEO_WORKER_MUSIC_ENABLED=true` + 9 mp3 tracks at `post-music/{news,upbeat,calm}/track-{1,2,3}.mp3`. ~30 min PK-led with chat guidance. Quickest infrastructure win after cc-0014 close. | PK + chat | Create bucket `post-music`; upload tracks; set env var; smoke test one video render. |
| 4 | **cc-0015 friction-pool-view Stage A authoring** | **P2 (rank 4 v2.77 promoted from P3)** | Brief drafted PENDING_EXECUTION at commit `9a5dc155`. Now unblocked per D-IOL-001. Stage A = schema additions (`dashboard_ui` category split + `pool_session` table + backfill plan). D-01 fire per brief §13. ~2-3h session. | chat → PK | When PK directs. |
| 5 | **Publisher recovery sequence — IG cron 53 re-enable OR YT diagnostic (pick one)** | **P2 (rank 5 v2.77 promoted from P3)** | Both unblocked per D-IOL-001. IG: verify throttles + dry-run smoke test + re-enable cron 53. ~1h. YT: audit `m.post_draft` recommended_format + video_status; decide on filter expansion (`video_short_avatar`) or upstream chain investigation. 1-2h depending on findings. | chat → PK | When PK directs sequence. |
| 6 | **Dashboard PHASES sync** | **P2 (rank 6 v2.77 promoted from P3 — 30th consecutive deferral)** | Now eligible per D-IOL-001 hold-stance lift. Updates `app/(dashboard)/roadmap/page.tsx` in `invegent-dashboard` repo (PHASES array + lastUpdated). Separate repo write. | chat → PK | When PK directs next dashboard session. |
| 7 | **Close-the-loop batch sweep — 22 escalated rows remaining** | P2 (rank 7 v2.77 carry) | Gated on explicit PK directive lifting CCH standing rule (21 historical) + resolving T-MCP-05 meta recursion (1 row). Not affected by D-IOL-001. | chat → future PK directive | Hold. |

**Standing P0 (not ranked):** Personal businesses check-in. Crazy Domains refund + clean-up follow-up carry from v2.51.

**Passive observation v2.77**: Cron 82 + 83 + 84 + 86 unchanged. Cron 85 promoted **weekly → daily** (first daily fire 2026-05-19 03:30 AEST). PRV v1 operator views queryable via `op_reader` role. **friction.* schema state v2.77**: 5 tables live (unchanged); functions/triggers unchanged. **`friction.experiment_run` row: status=archived, brief_id=cc-0014, criteria_snapshot preserved immutable**. **3 DELETE/UPDATE-protection triggers now DORMANT** (no run is `running`). 1 always-active promotion BEFORE INSERT trigger remains operational. PostgREST exposed_schemas includes `friction`. **6 events + 6 cases** (no change). **/operations route live in invegent-dashboard at HEAD `5753f41b`**. **Vercel invegent-dashboard production serving with FAB enabled** (unchanged). Next natural fires: cron 85 next daily fire 2026-05-19 03:30 AEST; cron 86 daily 01:15 UTC.

---

## 🟢 cc-0014 friction register — STATUS BLOCK (UPDATED v2.77 — CLOSED-ARCHIVED)

**Status v2.77: CLOSED-ARCHIVED 2026-05-18.** Closed Day 4 of 14-day operational window by PK reframing decision. Migration `cc_0014_close_archived` applied 2026-05-18 Sydney. `friction.experiment_run.status` = `archived` (terminal neutral state per CHECK enum). `criteria_snapshot` preserved immutable as audit trail. Notes column captures 2001 chars of verbatim reframing rationale. Postmortem authored per brief §14 commitment at `docs/postmortems/cc-0014-closing-note.md`. **Day-19 verdict 2026-05-29 RETIRED. Mid-window check-in RETIRED.** Friction register transitions from experiment to standing operational infrastructure per **D-IOL-001** (logged in `docs/06_decisions.md`).

**Brief lineage:** v1.0 → v1.1 final (frozen at commit `34305092f4`). Brief itself unchanged; closure is via experiment_run state transition, not brief modification.

**Stages delivered (final):**
- Stage A v1.1 (v2.72): schema + grants + 2 triggers + 11 V-checks PASS
- Stage B (v2.73): reconciliation emitter + 5 V-checks PASS
- Stage C (v2.74): health-check emitter + Cowork brief v3.0 + 5 V-checks PASS (V-C3 PENDING, now an infrastructure follow-up)
- Stage D (v2.74 backend + v2.75 frontend + v2.76 production deploy): manual FAB live on dashboard.invegent.com
- Stage E backend (v2.75): fn_recent_cases + fn_triage_case + 2 V-checks PASS
- Stage E frontend (v2.75): /operations route + V-E3 PASS
- Stage E promotion (v2.75): fn_promote_event_to_case + BEFORE INSERT trigger + 8 V-checks PASS
- Stage E close (v2.76): experiment_run INSERT with criteria_snapshot
- **v2.77 close (2026-05-18):** experiment_run.status running → archived. 14-day window closed at Day 4.

**Why closed early at Day 4 (per postmortem):**
- Manual FAB source proven operationally by Day 3 (3/3 events, validated workflow)
- Reconciliation source under-frequenced (weekly cadence × 14 days = ≤2 fires; insufficient for criterion 3)
- Health_check source produced zero signal due to upstream Cowork blocker (root cause = brief stuck `status: review_required`, unrelated to register design)
- Day-19 verdict on this trajectory would have read INVALID (procedural verdict, not insight verdict)
- PK reframing: register is operational spine, not experiment

**Why status=archived (not passed/failed/invalid/superseded):**
- `passed`: would overclaim against criterion 3 (1 of 3 sources)
- `failed`: window did not run to completion; criteria not properly tested
- `invalid`: instrument worked; closure was operator-driven
- `superseded`: would require new CHECK enum value + migration
- `archived`: brief's neutral terminal state, honest fit

**Section 14 commitments — disposition:**
- Pass-path next-layer design → cc-0015 friction-pool-view (already drafted, now unblocked)
- Pass-path health_check pg_cron migration → folded into infrastructure diagnostic phase
- Fail-path table archival → NOT invoked (schema and emitters remain live)
- Fail-path postmortem within 14 days → satisfied at `docs/postmortems/cc-0014-closing-note.md`

**Production state at v2.77 close:**
- `friction` schema unchanged: 5 tables, 8 functions, 4 triggers, 1 active trigger on `r.cadence_drift_log`, 5 pg_cron jobs (82-86, with 85 now daily)
- **friction.experiment_run: 1 row, status=archived**, brief_id=cc-0014, notes=verbatim rationale, criteria_snapshot immutable (939 chars)
- friction.event: 6 rows (no change since v2.76)
- friction.case: 6 rows (no change, all acknowledged)
- friction.emit_error: 0 rows
- 3 DELETE-protection / criteria-snapshot-immutability triggers now DORMANT (no run is `running`)
- 1 always-active promotion BEFORE INSERT trigger continues to operate
- Cowork brief v3.0 at HEAD `bc32e86` (no change)
- invegent-dashboard HEAD: `5753f41b` (no change — env var only)
- Vercel invegent-dashboard production: deployment `dpl_9Geda1dbhitN5ykTfV7UxF9A3pKc` serving with `DASHBOARD_FRICTION_FAB_ENABLED=true`
- Localhost `.env.local` cleanup still pending (carry, low priority)

**Cumulative D-01 history for cc-0014 (FINAL):**

| review_id | brief version / session | verdict | classification | resolution status |
|---|---|---|---|---|
| `903cfd8e` | v1.0 (v2.72) | partial | type-(b) | PK-resolved Path A re-fire; close-the-loop UPDATE RESOLVED 2026-05-17 |
| `873985f7` | v1.1 (v2.72) | partial | type-(c) | PK-resolved state-capture override per L62; brief frozen v1.1; close-the-loop UPDATE RESOLVED 2026-05-17 |
| `3ff74643` | close-as-passed (v2.77 cycle, 2026-05-17) | partial | type-(b) | PK accepted pushback; revised plan to archived |
| `6a90cacf` | close-as-archived (v2.77, 2026-05-18) | partial | type-(c) | PK explicit approval per L62; archived applied |
| `94bd6835` | recon daily cadence (v2.77, 2026-05-18) | partial | type-(c) | PK explicit approval per L62; daily cadence applied |

Total D-01 fires for cc-0014 lineage: **5**. State-capture exceptions consumed by cc-0014: **0** (override only applies to type-(b) genuine pushbacks; cc-0014's type-(b) was satisfied by revision, not overridden).

**Result file:** N/A — postmortem at `docs/postmortems/cc-0014-closing-note.md` satisfies brief §14 commitment.

**Session files:**
- 2026-05-14 Stage A (v2.72)
- 2026-05-15 Stage B (v2.73)
- 2026-05-15 Stage C (v2.74)
- 2026-05-15 Stage D + E prerun (v2.75)
- 2026-05-16 v2.76 stage E close + window open
- **2026-05-18 v2.77 archived + recon daily (NEW)**

**Open follow-ups (now standing infrastructure, not blocking):**
- Reconciliation daily cadence diagnostic (P1 rank 1 v2.77)
- Health_check V-C3 + signal-production diagnostic (P1 rank 2 v2.77)
- V-C3 live verification (depends on Cowork fire post-`9215de77`)
- Localhost FAB cleanup (P3 carry)

---

## 🟢 cc-0015 Friction Pool View — STATUS BLOCK (UPDATED v2.77 — UNBLOCKED)

**Status v2.77: AUTHORED, PENDING_EXECUTION, UNBLOCKED** per D-IOL-001. Commit `9a5dc155`. File: `docs/briefs/cc-0015-friction-pool-view.md` (20.3 KB). Strategic anchor: extends cc-0014. Operationalises register as pool consumed in concentrated sessions. **Priority: P2** (was P3 blocked-on-Day-19; now normal queue).

**7 stages drafted (unchanged):**
- Stage A — Schema additions (`dashboard_ui` category split + `pool_session` table + backfill plan)
- Stage B — Pool view UI on /operations (filter bar, saved views, sort, count badge)
- Stage C — Batch resolution (checkboxes, batch action bar, per-case execution loop)
- Stage D — Pool dashboard widget (status strip + click-through)
- Stage E — Pool session tracking (light-touch table, operator-initiated)
- Stage F — **Operator surface copy** (FrictionFieldHelp component + source-of-truth dict)
- Stage G — Process doc `docs/process/ICE-PROC-002-pooled-resolution.md` (Fri 0900 Sydney cadence)

**D-01 framing:** Fire one D-01 before Stage A. 7 questions.

**Effort:** 12-15h over ~3 sessions.

**Open decisions deferred to stage execution:** Pool session UI placement; quality_flag auto-set behaviour; dashboard_ui auto-suggest `track`; status strip oldest-age display.

---

## 🟢 cc-0016 Friction Capture Evidence — STATUS BLOCK (UPDATED v2.77 — UNBLOCKED)

**Status v2.77: AUTHORED, PENDING_EXECUTION, UNBLOCKED** per D-IOL-001. Commit `f35f8ea4`. File: `docs/briefs/cc-0016-friction-capture-evidence.md` (24.8 KB). Parallel-executable with cc-0015. **Priority: P2** (was P3 blocked-on-Day-19).

**5 stages drafted (unchanged):**
- Stage A — Storage bucket `friction-evidence` + `friction.event.attachments` jsonb column + helper view
- Stage B — FAB upload UX (drag-and-drop / paste / file-picker; client-side UUID; thumbnail strip; 3 max, 5MB each, JPG/PNG/WebP)
- Stage C — Extended `fn_emit_manual_event` (adds `p_event_id` + `p_attachments`; backward-compatible)
- Stage D — Attachment display on /operations (thumbnails, lightbox, signed URLs cached)
- Stage E — Lifecycle (18-month auto-delete pg_cron weekly; storage cost cap)

**D-01 framing:** Fire one D-01 before Stage A. 7 questions.

**Effort:** 8-10h over ~2 sessions.

**Out of scope (v1.0):** Video; audio/voice notes; PII detection/redaction; annotation tools; multi-tenant scoping.

---

## 🟢 cc-0012 PRV v1 — STATUS BLOCK (carried v2.77, condensed)

**Status v2.77:** **CLOSED-WITH-VERIFIED-VARIANCE v2.71.** Unchanged. 3 carry items in v1.1 doc patch (P3 deprioritised).

---

## 🟢 cc-0010B ice-evidence-materialiser — STATUS BLOCK (carried v2.77, condensed)

**Status v2.77:** **CLOSED-WITH-VERIFIED-VARIANCE v2.68.** Unchanged. Result: `docs/briefs/results/cc-0010B-ice-evidence-materialiser.md`.

---

## 🟢 cc-0010A r.* DDL Foundation — STATUS BLOCK (carried v2.77, condensed)

**Status v2.77:** **APPLIED + CLOSED v2.67.** v1.6 doc patch DEPRIORITISED to P3. Result: `docs/briefs/results/cc-0010A-r-reconciliation-ddl-foundation.md`.

---

## 🟢 Process Upgrades L44–L48 + L52–L65 + L-v2.76-a through L-v2.76-f — STATUS BLOCK (UPDATED v2.77)

**Status v2.77:** L40 reified v2.68. L44 + L45 + L46 + L48 baseline-eligible (carry from v2.76). **L58 BASELINE v2.76** (per-file/atomic-push strategy default). **L62 baseline-eligible v2.77** (3+ exercises now). L60 at 7 occurrences (carry). L63 + L64 + L65 candidates carry from v2.75 (1 each). L-v2.76-a through L-v2.76-f carry (1 each).

**v2.77 cycle outcomes:**
- **L41 + L45**: re-exercised v2.77 (post-mutation execute_sql verifications)
- **L44**: not exercised v2.77 (no V-check pattern this session)
- **L46**: not exercised v2.77 (D-01s fired; not 0)
- **L47**: still deferred
- **L48**: re-exercised v2.77 (2 atomic migrations)
- **L52 / L53 / L54 / L55 / L56 / L57**: not exercised v2.77
- **L58**: baseline applied v2.77 (atomic 4-file push for docs sync)
- **L59**: not re-exercised (no new trigger build)
- **L60**: not exercised v2.77
- **L62 baseline-eligible v2.77**: 3 exercises cumulative (v2.72 `873985f7` + v2.77 `6a90cacf` + v2.77 `94bd6835` — all type-(c) classifications). One more independent occurrence outside cc-0014 lineage would strengthen confidence.
- **L63 + L64 + L65**: not re-exercised v2.77
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.77; promotion still pending

**No new L-candidates this session.**

---

## 🟢 cc-0009 PRV-1 Second Build — STATUS BLOCK (unchanged v2.77)

Unchanged from v2.65–v2.76. ALL STAGES CLOSED at v2.65.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

**v2.77 update:**
- **Day-19 verdict for cc-0014: RETIRED.** Original deadline 2026-05-29 Sydney. Superseded by D-IOL-001 reframing 2026-05-18.
- **Mid-window check-in: RETIRED.** Was target ~2026-05-22 Sydney.
- **NEW v2.77**: First daily reconciliation cron 85 fire: 2026-05-19 03:30 AEST. Soft deadline for diagnostic observation.

Other items unchanged from v2.76.

---

## 🛠 Meta-tooling — ChatGPT Review MCP

**v2.77 application**: 3 D-01 fires across cycle (1 yesterday `3ff74643` close-as-passed + 2 today `6a90cacf` close-as-archived + `94bd6835` recon daily). Cumulative T-MCP-02: **69** (66 prior + 3 v2.77 cycle).

**L46 Evidence Gate v2.77**: not exercised — D-01s fired by design for production mutations per ICE-PROC-001, not skipped under brief §13 governance.

**L62 v2.77 exercises:**
- `6a90cacf` (close-as-archived): 3 type-(c) generic objections echoing self-disclosed open questions. PK explicit approval per L62 stood.
- `94bd6835` (recon daily): 1 type-(c) generic objection (performance speculation on already-deployed EF). PK explicit approval stood.
- Yesterday's `3ff74643` (close-as-passed): 4 type-(b) genuine pushbacks. Pushback satisfied by revision (archived instead of passed), not by override.

**State-capture exceptions v2.77: 0.** Cumulative: 1 (unchanged from v2.72).

**Close-the-loop UPDATEs v2.77: 0.** 22 escalated rows still gated on PK directive. The 3 v2.77 D-01s will themselves need close-the-loop UPDATEs at some future sweep (deferred to next batch).

---

## 🤖 Cowork automation (D182)

**v2.77 status:** Cowork brief v3.0 frozen at HEAD `bc32e86`. Cron 82 + 83 + 86 firing normally. **V-C3 still PENDING live run** post-commit `9215de77` (2026-05-17 reset to `status: ready`). Awaiting next scheduled Cowork fire. **No longer P1 rank 2** — health_check signal production is now standing infrastructure follow-up under D-IOL-001 (P1 rank 2 v2.77 is the health_check diagnostic itself, not the Cowork pipeline silence).

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **cc-0014 operational window** | 14-day window — CLOSED early at Day 4 | **CLOSED-ARCHIVED v2.77** | CLOSED 2026-05-18. friction.experiment_run.status=archived. Postmortem at `docs/postmortems/cc-0014-closing-note.md`. Day-19 + mid-window check-in retired. | informational | (closed) |
| **Reconciliation daily cadence diagnostic** | First daily fire 2026-05-19 03:30 AEST | **P1 (rank 1 v2.77 NEW)** | OPEN. Cron 85 schedule promoted weekly→daily via `cc_0014_recon_daily_cadence`. | chat → PK | Post-fire SQL count comparison `r.cadence_drift_log` vs `friction.event` source='reconciliation' |
| **Health_check V-C3 + signal-production diagnostic** | Three sub-questions on Cowork pipe | **P1 (rank 2 v2.77 carry)** | OPEN. V-C3 PENDING. Cowork brief reset via `9215de77`. | Cowork → chat | Check for new `docs/audit/health/YYYY-MM-DD.md` post-fire; reconcile against friction.event |
| **cc-0015 friction-pool-view brief** | Authored PENDING_EXECUTION | **P2 (rank 4 v2.77 UNBLOCKED)** | DRAFTED. Commit `9a5dc155`. Unblocked per D-IOL-001. | chat → PK | Stage A authoring when PK directs |
| **cc-0016 friction-capture-evidence brief** | Authored PENDING_EXECUTION | **P2 (rank 4 v2.77 UNBLOCKED, parallel)** | DRAFTED. Commit `f35f8ea4`. Unblocked per D-IOL-001. | chat → PK | Stage A authoring when PK directs (parallel-executable with cc-0015) |
| **Music library activation** | Code wired in video-worker v3.0.0; env-var gated | **P2 (rank 3 v2.77 PROMOTED)** | PENDING PK execution. Code already deployed. | PK + chat | Create bucket; upload 9 tracks; set env var; smoke test |
| **Invegent IG cap-throttle planning** | jobid 53 unblock | **P2 (rank 5 v2.77 PROMOTED)** | OBSERVED. Now unblocked per D-IOL-001. | chat → PK | Verify throttles + dry-run + re-enable |
| **F-YT-PUB-AVATAR-EXCLUSION** | youtube-publisher filter + upstream chain | **P2 (rank 5 v2.77 PROMOTED)** | LOGGED. Now unblocked per D-IOL-001. | chat → PK | Audit m.post_draft + decide filter expansion or chain investigation |
| **Dashboard PHASES sync** | PHASES array stale since 3 May | **P2 (rank 6 v2.77 UNBLOCKED)** | 30th consecutive deferral. Now unblocked per D-IOL-001. | chat → PK | Update `app/(dashboard)/roadmap/page.tsx` at next dashboard session |
| **cc-0013 Dashboard Phase 0** | 7 confirm-defaults | P2 (carry) | OPEN — no longer gated on Day-19. | PK | When PK directs |
| **Close-the-loop batch sweep — 22 escalated remain** | Gated on PK directive | P2 (rank 7 v2.77 carry) | PARTIAL COMPLETE 2026-05-17. 22 remain (21 historical CCH-locked + 1 T-MCP-05 meta). | chat → future PK directive | Hold remainder pending PK lift of CCH + meta resolution |
| **Brief v1.2 doc patch** | 6 defects + L60 + L63 + L64 + L65 + L-v2.76-a-f framing | P3 (carry) | DRAFT scope expanded. Doc-only. | chat → future | Single doc patch when PK greenlights |
| **v1.1 cc-0012 minor doc patch (3 items)** | Var-A1 + Var-A2 + Var-A3 | P3 (carry) | HOLD | chat → future | Doc-only |
| **v1.6 cc-0010A doc patch (3 items)** | result_jsonb rename + trigger audit + queue_id non-FK | P3 (carry) | HOLD | chat → future | Doc-only |
| **v1.3 cc-0011 minor doc patch (5 items)** | E1 + Var-A/B/C/E | P3 (carry) | HOLD | chat → future | Doc-only |
| **F-K-SCHEMA-REGISTRY-R-STALE-DESCRIPTION + L34 audit** | 3 geography rows + trigger filter | P3 (carry v2.71) | Strengthened v2.68. | chat → future | Separate cc-NNNN cleanup brief |
| **Platform Reconciliation View — BRIEF AUTHORING** | reconciliation surface | P2 — fully eligible v2.68; now unblocked per D-IOL-001 | cc-0010A + cc-0010B delivered. | PK → chat | When PK greenlights |
| **AI cost view** | `vw_ai_cost_monthly` | P3 quick win | Carry. | chat → future | DDL + tile |
| **Publisher latent config risk** | verify_jwt = false doc patch | P3 (carry) | OPEN | chat → future | Single-file commit |
| **M8b separate brief authoring** | Function rename | P3 (carry) | NOT YET AUTHORED | PK → chat | When PK directs |
| **94-row un-publishable legacy draft cohort** | SQL filter per cc-0007 | P3 (carry) | LOGGED | PK → chat → future | If PK directs |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** | Cron jobid 58 inline secret | P2 (security, OPEN) | OPEN | chat → future (PK approval) | PK authorisation |
| **morning-inbox-sweep-v1 brief amendment** | PK personal-email morning triage | P3 (carry) | DRAFT exists | PK → chat | PK reviews |
| **22 escalated m.chatgpt_review rows** | 21 historical CCH-locked + 1 T-MCP-05 meta | P3 (carry; gated) | Untouched per CCH | chat → future PK directive | Hold |
| **Memory cap hygiene** | 19/30 v2.76, unchanged v2.77 | P3 (carry) | 11 free slots. | chat → future | Add as needed |
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
| **github MCP write tools (L58 baseline)** | Per-file or atomic-push depending on coordination | informational (baseline) | L58 baseline. Atomic push applied v2.77. | informational | — |
| **Localhost FAB cleanup** | `.env.local` still has flag enabled | P3 (carry) | OPEN — cross-surface duplicate risk | PK → future | Set value to false or delete line |
| **Close-the-loop UPDATEs for 3 v2.77 D-01 fires** | `3ff74643`, `6a90cacf`, `94bd6835` | P3 (carry NEW v2.77) | OPEN. Same close-the-loop class as 22 escalated. | chat → future PK directive | Include in next batch sweep |

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

**v2.77 carry (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK actions manually. Re-check next session.

*(Standing P0 to ask at next session start.)*

---

## 🌱 Future ideation / content-pipeline expansion

Unchanged from v2.76.

---

## 📌 Backlog

**v2.77 changes:**

- **NEW v2.77**: cc-0014 CLOSED-ARCHIVED. friction.experiment_run.status=archived. Postmortem at `docs/postmortems/cc-0014-closing-note.md`.
- **NEW v2.77**: Cron 85 promoted weekly → daily. Migration `cc_0014_recon_daily_cadence`.
- **NEW v2.77**: D-IOL-001 logged in decisions.md. Friction register = standing infrastructure.
- **NEW v2.77**: IOL hold-stance LIFTED. cc-0015 + cc-0016 + publisher recovery + dashboard PHASES + brief authoring all unblocked.
- **STATE CHANGE v2.77**: Today/Next 5 rebuilt — rank 1 recon diagnostic NEW; rank 2 health_check diagnostic carry; rank 3 music activation PROMOTED; rank 4 cc-0015 Stage A PROMOTED; rank 5 IG/YT diagnostic PROMOTED; rank 6 dashboard PHASES UNBLOCKED; rank 7 close-the-loop carry.
- **STATE CHANGE v2.77**: Day-19 verdict + mid-window check-in calendar items RETIRED.
- **L62 baseline-eligible v2.77** (3+ exercises cumulative).
- **3 D-01 fires across v2.77 cycle**. T-MCP-02 cum 66→69. State-capture exceptions unchanged at 1.
- **CARRIED v2.77**: Dashboard roadmap PHASES — **30th** consecutive deferral; **now unblocked** per D-IOL-001 for next dashboard session.
- **NEW v2.77 carry**: Close-the-loop UPDATEs for 3 v2.77 D-01 fires.
- **No new L-candidates this session.**

**Pre-v2.77 changes**: per commit history + sync_state archive.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

L37–L65 + L-v2.76-a through L-v2.76-f framing carried from v2.76. **v2.77 updates:**

- **L41 + L45**: re-exercised v2.77 (post-mutation execute_sql verifications).
- **L44**: not exercised v2.77.
- **L46**: not exercised v2.77 (3 D-01 fires; not 0).
- **L48**: re-exercised v2.77 (2 atomic migrations).
- **L52 / L53 / L55 / L57 / L58 / L59 / L60 / L63 / L64 / L65**: not re-exercised v2.77.
- **L58**: baseline applied v2.77 (atomic 4-file push for docs sync).
- **L62 baseline-eligible v2.77**: 3 exercises cumulative.
- **L-v2.76-a through L-v2.76-f**: not re-exercised v2.77; promotion still pending.
- **No new L-candidates v2.77.**

**All candidates recommended for promotion to baseline at appropriate cycle once empirical evidence accumulates** (L37–L65 + L-v2.76-a-f, plus standing baseline).

---

## v2.77 honest limitations

- All v2.31–v2.76 limitations apply.
- **cc-0014 closed-archived 11 days before scheduled Day-19.** Closure was operator-driven reframing, not brief mechanics. `criteria_snapshot` preserved immutable on archived row as audit trail; future review can see what would have been scored had window completed. Honest fit was `archived` not `passed` (criterion 3 was not met by 1-of-3 source coverage at closure).
- **V-C3 still PENDING.** Cowork brief reset via `9215de77`. Awaiting next live fire. Now infrastructure follow-up, not blocking.
- **Reconciliation daily cadence is new and unobserved.** First fire 2026-05-19 03:30 AEST. Three failure modes possible (no drift / detection-too-tight / trigger-gap). Diagnostic capacity built into next session.
- **L58 baseline applied v2.77 in atomic-push mode** (4 files single commit), which is the L58-permitted alternative to per-file commits when files form a coordinated state change.
- **L62 baseline-eligible v2.77** at 3 exercises. One more independent occurrence outside cc-0014 lineage would strengthen confidence.
- **L-v2.76 candidates** still at 1 occurrence each. Promotion pending pattern repeat.
- **3 close-the-loop UPDATEs newly outstanding** for v2.77 D-01 fires (`3ff74643`, `6a90cacf`, `94bd6835`). Joined to existing 22-row carry.
- **22 escalated m.chatgpt_review rows** still gated on PK directive.
- **Dashboard PHASES** — **30th** consecutive deferral; now eligible.
- **Memory cap 19/30** — unchanged. 11 free slots.
- **Action_list size at v2.77**: ~40KB (down from ~50KB at v2.76 close via condensing v2.76 details).
- **Per-session files v2.77**: 1 — `2026-05-18-cc-0014-archived-and-recon-daily.md`.
- **Result file v2.77**: N/A (postmortem at `docs/postmortems/cc-0014-closing-note.md`).
- **Doc-sync v2.77**: 1 atomic 4-file push (commit `d6bf9e4a`) + 1 follow-up single-file commit for this action_list update. Dashboard PHASES deferred to next dashboard session (30th deferral, now structural-only).
- **Close-the-loop UPDATEs v2.77**: 0. **25 eligible** (22 prior + 3 new this cycle).
- **State-capture exceptions v2.77: 0**. Cumulative: 1.

---

## Changelog

- v1.0–v2.76: per commit history + sync_state archive.
- **v2.77 (2026-05-18 Sydney, cc-0014 CLOSED-ARCHIVED + RECON CRON DAILY + IOL HOLD-STANCE LIFTED):**
  - **Build arc**: yesterday-evening reframing diagnosis → D-01 `3ff74643` close-as-passed surfaced 4 type-(b) genuine pushbacks → revised plan to archived → D-01 `6a90cacf` on archived returned 3 type-(c) generic → migration `cc_0014_close_archived` applied single-shot → D-01 `94bd6835` on recon daily returned 1 type-(c) → migration `cc_0014_recon_daily_cadence` applied (rename blocked, schedule-only succeeded) → atomic 4-file push `d6bf9e4a` (postmortem + session note + decisions D-IOL-001 + sync_state v2.77) → memory edits #8 + #15 → this action_list update.
  - **D-IOL-001 NEW**: friction register = standing operational infrastructure. No sunset.
  - **Hold-stance lifted**: cc-0015 + cc-0016 + publisher recovery + dashboard PHASES all unblocked.
  - **D-01 fires (3 across cycle)**: 1 type-(b) satisfied by revision; 2 type-(c) PK approval per L62. T-MCP-02 cum 66→69. State-capture exceptions unchanged at 1.
  - **L-series outcomes**: L41 + L45 + L48 re-exercised. L58 baseline atomic-push mode applied. L62 baseline-eligible (3+ exercises). No new candidates.
  - **Today/Next 5 rebuild**: rank 1 recon daily diagnostic NEW; rank 2 health_check diagnostic carry; rank 3 music activation PROMOTED; rank 4 cc-0015 PROMOTED; rank 5 IG/YT diagnostic PROMOTED; rank 6 dashboard PHASES UNBLOCKED; rank 7 close-the-loop carry.
  - **Active rows updated v2.77**: cc-0014 operational window CLOSED; cc-0015 + cc-0016 promoted P3→P2 unblocked; music + IG + YT + dashboard PHASES promoted P3→P2 unblocked; Day-19 + mid-window check-in retired.
  - **STATUS BLOCK v2.77**: cc-0014 with closure rationale + final D-01 history (5 fires); cc-0015 + cc-0016 status block headers updated to UNBLOCKED.
  - **Closure budget**: ~1.5h v2.77 cycle. Trailing-14-day cumulative ~10h above 8.0h floor.
  - **Doc-sync v2.77**: 1 atomic 4-file push + this action_list update. Dashboard PHASES still deferred (30th, now structural-only — eligible for next dashboard session).
  - **Production mutations v2.77**: 2 apply_migration (`cc_0014_close_archived` + `cc_0014_recon_daily_cadence`); ~5 execute_sql; 1 cron mutation (cron.alter_job); 1 GitHub atomic push (4 files); 1 GitHub single-file commit (this); 3 D-01 fires; 2 memory edits; 0 EF deploys; 0 vault writes.
  - **T-MCP-02 cum**: 69. State-capture exceptions: 1. L62 baseline-eligible.
