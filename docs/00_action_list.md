# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-07 Sydney (v2.44 — **F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED.** Daily drift-check + 90-day retention crons applied via Supabase MCP per D170. Migration `f_ef_drift_prevention_stage2a_cron_jobs`. D-01 review `c261e338-5f4f-473f-900c-f5ad8d8711a9` agree, no pushback. Two crons live: `drift-check-daily-fire` (jobid 80, 03:00 AEST daily) + `ef-drift-log-retention-90d` (jobid 81, 03:15 AEST daily). All 7 PK verification criteria PASS including dry-run smoke. First automated scan tomorrow 2026-05-08 03:00 AEST. Stage 2b (dashboard panel) is now top P1. T-MCP-02 quota 40→41. Combined day ~9.5h, trailing-14-day ~36h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.44 application**: 1 D-01 fire this session (`c261e338` cron migration, agree, no pushback). T-MCP-02 quota 40→41.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is the approved target design. Build is staged. Stage 1 closed v2.41. **Stage 2a fully CLOSED v2.44** (EF v1.0.8 deployed v2.42 + writer fn migration v2.42 + bef6be96 origin investigation resolved v2.43 + cron migration applied v2.44). Stages 2b + 3 sequenced behind. Until Stage 2b live AND the 4 P1 triage cases are addressed (3 SECURITY-DEFINER syncs + insights-worker manual review), no further EF patching is safe — this includes M6 Phase A and F-YT-NY-FORMAT-SELECTION, both of which are explicitly BLOCKED.

**STANDING RULE (Lesson #62, v2.41)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, the default is NOT automatic state-capture override. State-capture override is reserved for cases where the reviewer's pushback genuinely is generic and the verified_claims body has cleared the substantive concerns.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline. A discarded first attempt cannot fall out of session memory just because a later formally-authorised replay supersedes it. **v2.44 application:** D-01 review fired BEFORE migration apply; review ID + outcome captured inline at moment of firing; no discarded actions this session.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~8 (T05 P1-urgent + Stage 2b/3 build pending + 3 P1 SECURITY-DEFINER triage + insights-worker P1 + F-YT-NY-FORMAT-SELECTION blocked + M6 Phase A blocked + 3 cluster diagnoses still active + 6 May health check follow-up). bef6be96 + Stage 2a finalisation both CLOSED. | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~36h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~70–80 min combined** (investigation + 4-file documentation commit + cron pre-flight + design proposal + D-01 + apply + 7 verifications + smoke + 4-way sync).

**Day total (6/7 May): ~9.5h** (Stage 1 morning + Stage 2a checkpoint afternoon + investigation + cron close).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-07 Sydney (v2.44).
> **This session: F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **F-EF-DRIFT-PREVENTION Stage 2b — dashboard drift panel** | **P1 TOP** | Stage 2a CLOSED v2.44; daily drift detection now live. Dashboard surfaces drift to PK at low friction. ~1–2h. | Design panel: reads `m.vw_ef_drift_current` + filtered queries on `m.ef_drift_log`. Class buckets; P1 SECURITY-DEFINER list highlighted; B-FD informational; state_changed=true badge; repo-only directories listed separately. CC writes; chat reviews; PK approves. |
| 2 | **F-EF-DRIFT-PREVENTION Stage 3 — `scripts/safe-deploy.sh`** | P1 | After #1. Pre-deploy `git status` clean check + local-matches-`origin/main` check. Warns but does NOT refuse. ~30 min. | Author script; commit; PK adopts on next manual deploy. |
| 3 | **P1 SECURITY-DEFINER regression-risk triage** | P1 | Three cases (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`). After Stage 2b live so the sync commits show up green in the dashboard. | Sync repo → deployed via Windows CLI `npx supabase functions download` for each, commit as sync-only commits. Verify drift-check classifies each as Class A post-sync. |
| 4 | **insights-worker P1 functional drift** | P1 | Deployed v14.0.0 vs repo v1.6.0. After Stage 2b live + P1 SECURITY-DEFINER triage. | PK reviews deployed source for correctness, then decides sync direction. |
| 5 | **Verify first automated drift-check scan** (2026-05-08 03:00 AEST) | P2 | Cron just went live. Confirm new `drift_check_run_id` appears with 49 rows; `state_changed=false` per slug against a2124145 baseline; SD-risk count remains 3. | Query `m.ef_drift_log` after 17:01 UTC (03:01 AEST) for new run; cross-check `m.vw_ef_drift_current`. |

**Demoted from prior Today/Next 5 in v2.43→v2.44 cycle:**

- **F-EF-DRIFT-PREVENTION Stage 2a finalisation (cron migration)** — CLOSED v2.44.

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (v2.44 update)

**Brief:** `docs/briefs/2026-05-05-f-ef-drift-prevention.md` (status APPROVED)
**Parent:** RECONCILE-EF-DRIFT (CLOSED 2026-05-05 morning, commit `7ba441e2`)

### Stage 1 — Backend foundation: ✅ COMPLETE 2026-05-06 (v2.41)

### Investigation phase: ✅ COMPLETE v2.40

### Stage 2a — drift-check EF + retention cron: ✅ **FULLY CLOSED v2.44**

#### Stage 2a — closed components

- drift-check **v1.0.8 DEPLOYED** (commit `d81de062`) — v2.42
- 8 EF iterations v1.0.0 → v1.0.8 with documented fixes — v2.42
- F1 multipart/form-data fix verified end-to-end — v2.42
- Writer fn migrated to `public.write_ef_drift_log(p_rows jsonb, p_run_id uuid DEFAULT NULL)` — v2.42
- Dry-run chunks 1-5 PASS all 6 PK criteria — v2.42
- Manual chunked write `a2124145` succeeded 49 rows — v2.42
- bef6be96 origin investigation RESOLVED — v2.43
- **Daily drift-check fire cron live** (`drift-check-daily-fire`, jobid 80, `0 17 * * *`) — v2.44
- **90-day retention cron live** (`ef-drift-log-retention-90d`, jobid 81, `15 17 * * *`) — v2.44
- All 7 PK verification criteria PASS post-apply — v2.44
- D-01 `c261e338-5f4f-473f-900c-f5ad8d8711a9` agree, no pushback — v2.44

### Stage 2b — Dashboard drift panel: ⏳ PENDING (NOW TOP P1)

Reads `m.vw_ef_drift_current` + filtered queries on `m.ef_drift_log`. Class buckets; P1 SECURITY-DEFINER list highlighted; B-FD informational; state_changed=true badge; repo-only directories listed separately. ~1–2h.

### Stage 3 — `scripts/safe-deploy.sh`: ⏳ PENDING

### Triage phase: ⏳ PENDING (after Stage 2b live)

### 13 existing drift cases — UNCHANGED

Confirmed by v1.0.8 baseline scan: `draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller` are the 3 P1 SECURITY-DEFINER cases (regression-risk on repo redeploy).

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.41-v2.43 — all migrations applied + verifications PASS. M6-M8 still pending; M6 Phase A explicitly BLOCKED behind F-EF-DRIFT-PREVENTION Stage 2b close + P1 triage per v2.44.

---

## 🔄 Standing session-start checks

Unchanged from v2.40 (S1–S29).

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged. **v2.44 status delta**: First automated drift-check scan tomorrow 2026-05-08 03:00 AEST.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 41 of 5)

**v2.44 application: 1 D-01 fire** this session.

- `c261e338-5f4f-473f-900c-f5ad8d8711a9` — cron migration `f_ef_drift_prevention_stage2a_cron_jobs`. Verdict: agree, risk medium, confidence high, no pushback. Applied successfully; verifications PASS.

**Lesson #62 boundary stable.** No override events this session.

**Lesson candidate #68 (NEW v2.43)** applied this session: D-01 review fired BEFORE migration apply; review ID + outcome captured inline at moment of firing.

**Cumulative T-MCP-02 quota: 41 of 5.** Cumulative T-MCP-08: 2. Cost still well under $0.50 cumulative.

---

## 🤖 Cowork automation (D182)

**v2.44 status delta:** Cowork ruled out as bef6be96 caller (v2.43 closed). `docs/audit/health/2026-05-06.md` still absent at v2.44 close — carry as P3 follow-up. Investigate only if not back online.

Sunset review: 12 May 2026 (unchanged).

---

## 🧭 ICE Dashboard Architecture Review (v2.35)

Unchanged. §1 (Current-state inventory) remains NEXT — when PK signals.

---

## 🟡 Active

Per v2.43 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **F-EF-DRIFT-PREVENTION Stage 2b** | Dashboard drift panel | **P1 TOP** | NOW UNBLOCKED v2.44 | chat → next session | Read `m.vw_ef_drift_current` + filtered drift queries; class buckets; P1 SECURITY-DEFINER highlighted. ~1–2h. |
| **F-EF-DRIFT-PREVENTION Stage 3** | `scripts/safe-deploy.sh` | P1 | PENDING (sequenced after 2b) | chat → future session | Author wrapper; commit; habit-builder. ~30 min. |
| **P1 SECURITY-DEFINER triage** | `heygen-avatar-creator` + `heygen-avatar-poller` + `draft-notifier` | P1 | Sequenced after Stage 2b live | PK + chat | Sync repo → deployed via Windows CLI; commit as sync-only commits. |
| **insights-worker P1 functional drift** | Deployed v14.0.0 vs repo v1.6.0 | P1 | D-PREV-07: no auto-sync; manual review first | PK | After Stage 2b live: PK reviews deployed source. |
| **F-YT-NY-FORMAT-SELECTION** (carry-forward) | Brief committed `ff5ae6ae` | P1 | **BLOCKED behind Stage 2b close + P1 triage** | chat → future session | After triage clears: read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **M6 Phase A — 108 historical Bug 3 dead-letter** (carry-forward) | Clean up `queued` rows with Bug 3 fingerprint | P1 | **BLOCKED behind Stage 2b close + P1 triage** | PK → chat → future session | After F-YT-NY-FORMAT-SELECTION clears: PK directs start. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **3 stuck-item clusters re-evaluation** | LinkedIn-PP + YouTube-PP + YouTube-NY | P1 | PP×YT cluster cleared by F-YT-OAUTH-PP; NY×YT cluster blocked on F-YT-NY-FORMAT-SELECTION | chat → next session | Re-query S21 audit matrix. |
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix | P1 | DEPLOYED v2.34; awaiting CFW LI fill cycle | chat → next session | Query `m.ai_job` after 2026-05-06 03:04 UTC. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P1 | APPLIED v2.34; combined forward-flow check | chat → next session | Query `m.post_draft` newly-filled rows. |
| **Verify first automated drift-check scan** (NEW v2.44) | Confirm 2026-05-08 03:00 AEST cron fires | P2 | Cron just went live | chat → next session | Query `m.ef_drift_log` after 17:01 UTC for new `drift_check_run_id`; cross-check `m.vw_ef_drift_current`. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried v2.41/v2.42/v2.43/v2.44 | chat → next session if still absent | Investigate Cowork status; not derailing. |
| **ICE Dashboard Architecture Review** | 11-section formal review | strategic-product | KICKOFF complete; §1 next | chat ↔ PK | PK signals start. |
| (others) | per v2.43 | — | — | — | per v2.43 |

**Closed v2.44:**

- **F-EF-DRIFT-PREVENTION Stage 2a finalisation** — cron migration `f_ef_drift_prevention_stage2a_cron_jobs` applied. Both crons live (jobid 80 + 81). All 7 PK verification criteria PASS. D-01 `c261e338` agree.

**Closed v2.43:** bef6be96 origin investigation.
**Closed v2.42:** (none)
**Closed v2.41:** F-EF-DRIFT-PREVENTION Stage 1.
**Closed v2.40:** F-EF-DRIFT-PREVENTION investigation phase.

---

## 💼 Personal businesses

*(none flagged at session start — PK confirmed nothing live; ICE proceeded)*

---

## 📌 Backlog

**v2.44 changes**:

- **CLOSED v2.44**: F-EF-DRIFT-PREVENTION Stage 2a finalisation (cron migration applied + verified).
- **NEW v2.44**: "Verify first automated drift-check scan" task (P2) — watch tomorrow 03:01 AEST.
- **NEW v2.44**: D-01 review `c261e338-5f4f-473f-900c-f5ad8d8711a9` close-the-loop UPDATE pending.
- **PROMOTED v2.44**: Stage 2b (dashboard panel) from PENDING to TOP P1.

**v2.43 changes** (still active):

- bef6be96 origin investigation CLOSED.
- Lesson candidate #68 captured.
- 98 rows in `m.ef_drift_log` (49 mine + 49 bef6be96). Both scans intentionally preserved.

**v2.42 changes** (still active where relevant):

- 5 lesson candidates surfaced #63-#67.
- drift-check v1.0.8 deployed.

**v2.41 changes** (still active):

- F-EF-DRIFT-PREVENTION Stages 2b, 3.
- `docs/audit/health/2026-05-06.md` follow-up (P3, watch-only).
- Lesson #62 boundary refinement v2.41.

**v2.40 changes** (still active):

- 13 existing drift cases triaged into priority buckets.
- D-PREV-13/14/15/16 in brief decisions log.

**v2.39 changes** (still active):

- T-MCP-15 lesson candidate.
- D-YT-OAUTH-1 standing rule.
- S29 standing check.

**v2.38 changes** (still active):

- T-MCP-13 + T-MCP-14 lesson candidates.

**v2.37 + v2.36 changes** (still active):

- M6-M8 sequenced (M6 Phase A explicitly BLOCKED).
- 108 historical Bug 3 fingerprint queue rows retained.
- queue_id `ad573844` dead-lettered.
- 47 v4-origin queue rows mismatch slot intent.

**v2.35 changes** (still active):

- 3 stuck-item clusters from health check.
- ICE Dashboard Architecture Review.

**v2.34 changes** (still active):

- F-AI-WORKER-PARSER-SKIP-BUG, F-AAP-007 v2, F-PUB-009 V3-V5 acid tests.

**v2.33 additions** (still active):

- F-AAP-NEEDS-REVIEW-BACKLOG (P2), B-TOKEN-HEALTH-EMPTY (P3), F-CFW-LI-DUP-SLOTS (P3).

**Carried from v2.31**: per v2.43.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Per v2.43 plus:

- **Lesson candidate #68 (v2.43)** applied this session — D-01 review fired BEFORE migration apply; review ID + outcome captured inline at moment of firing. Pending canonical promotion (1 reuse counted).
- **Lesson candidate #62** — boundary stable. No override events this session.
- **Lesson candidates #63-#67 (v2.42)** — defer canonical assessment.
- **F-EF-DRIFT-PREVENTION investigation pattern v2.40** — pending 1 reuse.
- **D-PREV-13 taxonomy split** — pending 1 reuse.

---

## v2.44 honest limitations

- All v2.31-v2.43 limitations apply.
- **Cron jobs are LIVE but UNTESTED in automated context.** First automated fire is tomorrow 2026-05-08 03:00 AEST. Manual smoke (single-slug dry-run) PASS, but the full 5-chunk parallel write hasn't fired via cron yet. If something fails tomorrow, expect a partial scan with row count <49 and possibly stale state vs a2124145.
- **`m.ef_drift_log` retains 98 rows by design.** Both scans byte-identical per slug.
- **bef6be96 origin investigation closure is best-effort** (carry-over from v2.43).
- **Standing don't-redeploy** for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`.
- **`ai-diagnostic` repo-only directory operational status remains unclear** (carry-over from v2.40).
- **16+ close-the-loop UPDATEs still pending** — v2.44 added `c261e338`. Combine in next batch closure.
- **`docs/audit/health/2026-05-06.md` did not push** (carried). Investigate next session only if still absent.
- **Closure budget remains well above floor** (~36h trailing-14-day).

---

## Changelog

- v1.0–2.43: per previous changelog.
- **v2.44 (2026-05-07 Sydney, F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED):**
  - **Cron migration applied** via Supabase MCP per D170. Migration name: `f_ef_drift_prevention_stage2a_cron_jobs`. D-01 review `c261e338-5f4f-473f-900c-f5ad8d8711a9` agree, no pushback. T-MCP-02 quota 40→41.
  - **Two crons live**: `drift-check-daily-fire` (jobid 80, `0 17 * * *`, parallel single-statement with shared scan_id) + `ef-drift-log-retention-90d` (jobid 81, `15 17 * * *`, 90-day DELETE). Both `active=true`, owner `postgres`.
  - **All 7 PK verification criteria PASS** including dry-run smoke (`?write=false&slug=publisher`, HTTP 200, `wrote_rows=false`, no DB mutation, `m.ef_drift_log` row count unchanged at 98).
  - **First automated scan tomorrow 2026-05-08 03:00 AEST.** New `drift_check_run_id` expected with 49 rows; SD-risk count expected 3.
  - **Stage 2b (dashboard panel) is now top P1.**
  - **Lesson candidate #68 applied** this session: D-01 fired BEFORE apply; review ID + outcome captured inline at moment of firing.
  - **Net P0+P1 open: 9 → 8** (Stage 2a finalisation closed).
  - **Closure budget**: combined ~70–80 min today (investigation + cron). Day total ~9.5h. Trailing-14-day ~36h above 8.0 floor.
  - **No row mutations** to `m.ef_drift_log`. **`m.ef_drift_log` retains 98 rows** by design.
  - **Hard stops still in effect:** do not start Stage 2b / Stage 3 / P1 triage / NY×YT / M6 in THIS session.
