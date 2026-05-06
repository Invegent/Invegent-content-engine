# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-06 Sydney afternoon (v2.42 — **F-EF-DRIFT-PREVENTION Stage 2a CHECKPOINT — BLOCKED on unexpected prior scan origin.** drift-check EF iterated v1.0.0 → v1.0.8 (final fix: F1 multipart/form-data parsing — Management API `/body` returns multipart, not raw text). Publisher correctly Class A; auto-approver still Class C with real 4-byte diff at byte 8790. Dry-run chunks 1-5 PASS all 6 PK criteria. Writer fn migrated to accept caller-supplied `p_run_id`. Chunked write succeeded with scan_id `a2124145-…` 49 rows. Verification surfaced unexpected prior scan `bef6be96-…` (49 rows at 03:24 UTC, 6 min before mine, 5 concurrent parallel-fire) from unidentified caller. `m.ef_drift_log` now has 98 rows. `m.vw_ef_drift_current` returns 49 latest-per-slug, internally consistent. **Stage 2a BLOCKED.** Cron NOT applied. No row deletions. Next session must begin with bef6be96 origin investigation.). Closure budget: ~5h this session, day total ~7.5h, trailing-14-day ~35h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.42 application**: 3 D-01 fires this session (T-MCP-02 37 → 40). v1.0.x EF deploy series (consolidated entry); writer-fn migration `0a9012e7` agree, applied; chunked-write proposal `d53c9918` escalated on self-undermining single objection → state-capture override per PK pre-auth (T-MCP-08 1 → 2).

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is the approved target design. Build is staged. Stage 1 closed v2.41. Stage 2a CHECKPOINT BLOCKED v2.42 (multipart fix proven; baseline write succeeded; unexpected prior scan caller unknown). Stages 2b + 3 sequenced behind. Until Stage 2a finalises (cron applied) AND the 4 P1 triage cases are addressed (3 SECURITY-DEFINER syncs + insights-worker manual review), no further EF patching is safe — this includes M6 Phase A and F-YT-NY-FORMAT-SELECTION, both of which are explicitly BLOCKED.

**STANDING RULE (Lesson #62, v2.41)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, the default is NOT automatic state-capture override. If the underlying ambiguity is real (multiple defensible design answers), Claude should propose revision first. State-capture override is reserved for cases where the reviewer's pushback genuinely is generic and the verified_claims body has cleared the substantive concerns. **v2.42 application:** chunked-write proposal `d53c9918` had a SINGLE self-undermining pushback ("non-atomic rollback… although there is a rollback plan in place"). PK had explicitly pre-authorised this exact path in the same directive. Override invoked transparently.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~10 (T05 P1-urgent + bef6be96 origin investigation NEW + F-EF-DRIFT-PREVENTION Stage 2a finalisation pending + Stage 2b/3 build pending + 3 P1 SECURITY-DEFINER triage + insights-worker P1 + F-YT-NY-FORMAT-SELECTION blocked + M6 Phase A blocked + 3 cluster diagnoses still active + 6 May health check follow-up) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~35h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~5h** (8 EF iterations + multipart fix discovery + writer fn migration + dry-run chunks + chunked write + verification + anomaly investigation + 4-way sync).

**Day total (6 May): ~7.5h** (Stage 1 morning + Stage 2a checkpoint afternoon).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-06 Sydney afternoon (v2.42).
> **This session: F-EF-DRIFT-PREVENTION Stage 2a CHECKPOINT — BLOCKED on unexpected prior scan origin.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Investigate `bef6be96` scan origin** | **P1 (TOP next session)** | `m.ef_drift_log` has an unexplained 49-row scan written at 03:24 UTC 6 May, six minutes before the intentional baseline. Five concurrent parallel-fire invocations from an unknown caller. No matching `cron.job`. Stage 2a cannot finalise until origin understood. | Ask PK directly first. If denied, cross-check Cowork task history at 13:24 AEST 6 May; check dashboard request logs; check Vercel function logs; inspect Supabase EF logs for `X-Forwarded-For`/Authorization fingerprint of request IDs 96457-96461. Then PK decides cleanup strategy (A keep both / B roll back both / C bef6be96 only — NOT recommended). |
| 2 | **F-EF-DRIFT-PREVENTION Stage 2a finalisation — apply 90-day retention pg_cron** | **P1** | Stage 2a is blocked at #1. Once resolved and cleanup applied, the cron migration completes the stage. ~15min. | Apply via Supabase MCP per D170 only after #1 resolves and PK approves. Verify daily DELETE on `m.ef_drift_log WHERE checked_at < now() - interval '90 days'`. |
| 3 | **F-EF-DRIFT-PREVENTION Stage 2b — dashboard drift panel** | **P1** | Reads `m.vw_ef_drift_current` + filtered queries on `m.ef_drift_log`. Surfaces drift to PK at low friction. ~1-2h. | After Stage 2a finalises: design panel; lists by class bucket, P1 SECURITY-DEFINER list highlighted, B-FD informational, state_changed=true badge, repo-only directories listed separately. |
| 4 | **F-EF-DRIFT-PREVENTION Stage 3 — `scripts/safe-deploy.sh`** | **P1** | Wraps `npx supabase functions deploy <slug>`. Pre-deploy `git status` clean check + local-matches-`origin/main` check. Warns but does NOT refuse. ~30min. | Author script; commit; PK adopts on next manual deploy. Habit-builder. |
| 5 | **P1 SECURITY-DEFINER regression-risk triage** | **P1** | Three cases (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) where repo redeploy = silent production bug. Confirmed by v1.0.8 baseline scan. Sequence AFTER Stage 2b live so the sync commits show up green in the dashboard. | Sync repo → deployed via Windows CLI `npx supabase functions download` for each, commit as sync-only commits. Verify drift-check classifies each as Class A post-sync. |

**Demoted from prior Today/Next 5 in v2.41→v2.42 cycle:**

- **F-EF-DRIFT-PREVENTION Stage 2a (drift-check EF + retention cron)** — split: EF deploy DONE (v1.0.8 live, multipart fix proven, baseline scan written); pg_cron migration BLOCKED at rank 2 behind origin investigation rank 1.
- **insights-worker P1 functional drift** — still Active P1 but sequenced after Stage 2b live + P1 SECURITY-DEFINER triage; was rank 6 in v2.41.

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (v2.42 update)

**Brief:** `docs/briefs/2026-05-05-f-ef-drift-prevention.md` (status APPROVED)
**Parent:** RECONCILE-EF-DRIFT (CLOSED 2026-05-05 morning, commit `7ba441e2`)

### Stage 1 — Backend foundation: ✅ COMPLETE 2026-05-06 morning (v2.41)

Unchanged from v2.41. `m.ef_drift_log` table + `m.vw_ef_drift_current` view + `public.write_ef_drift_log()` writer + GRANTs all live.

### Investigation phase: ✅ COMPLETE v2.40 (Tier 2 inventory locked at 46/46 EFs + 2 repo-only)

### Stage 2a — drift-check EF + retention cron: ⏳ CHECKPOINT (afternoon, v2.42) — **BLOCKED**

**Status: BLOCKED on origin investigation of unexpected prior scan `bef6be96-…`.**

#### Stage 2a — what's done (v2.42)

- **drift-check v1.0.8 DEPLOYED** (commit `d81de062`) via Windows CLI from `C:\Users\parve\Invegent-content-engine`.
- **8 EF iterations** v1.0.0 → v1.0.8 with documented fixes (banner parsing, secrets namespace, JWT verify, chunking, scan_id flow, multipart fix).
- **F1 multipart/form-data fix** — Management API `/body` returns multipart, not raw text. v1.0.0-v1.0.7 read it as text → universal 47-of-47 false drift. v1.0.8 mirrors supabase CLI's `downloadWithServerSideUnbundle` parse path. Verified end-to-end against CLI ground truth.
- **Writer fn migration** `f_ef_drift_prevention_writer_accept_run_id` — new signature `public.write_ef_drift_log(p_rows jsonb, p_run_id uuid DEFAULT NULL)` enables chunked writes with shared correlation key. D-01 `0a9012e7` agree, applied.
- **Dry-run chunks 1-5 PASS all 6 PK criteria** — 49 rows (A:16, A-LE:9, B-FD:1, B-RR:5, C:9, D:7, repo-only:2); SD-risks exactly 3 (`draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller`); Class C dropped from 34 (v1.0.6) to 9; repo-only deduped to chunk 1 only.
- **Manual chunked write succeeded** with scan_id `a2124145-a519-4fbf-b0b0-1da28782f152` (5 sequential chunks, 49 rows, all HTTP 200, errors=[]).
- Functional state internally consistent — both scans byte-identical per slug.

#### Stage 2a — what's BLOCKED

- **Unexpected prior scan `bef6be96-dbca-4a1f-ba29-f9bbcb95f1b3`** (49 rows at 03:24 UTC, 6 minutes before intentional write). 5 concurrent parallel-fire invocations from unidentified caller. No matching `cron.job`. Possible callers: PK in parallel session/script; automation tool; dashboard action; another Claude session — none confirmed.
- **Cron migration NOT applied.** PK directive: "Do not apply cron yet until the manual write and verification pass." Verification is BLOCKED on bef6be96 origin.
- **No row deletions.** 98 rows preserved in `m.ef_drift_log`.

#### Stage 2a — pending (after origin investigation closes)

| # | Component | Detail | Effort |
|---|---|---|---|
| 1 | bef6be96 origin investigation | Ask PK; cross-check Cowork / dashboard / Vercel / Supabase EF logs. PK decides cleanup A/B/C. | 30min-1h |
| 2 | pg_cron 90-day retention sweep | Daily DELETE on `m.ef_drift_log WHERE checked_at < now() - interval '90 days'` (only after #1 closes) | ~15min |

### Stage 2b — Dashboard drift panel: ⏳ PENDING

Reads `m.vw_ef_drift_current` + filtered queries on `m.ef_drift_log`. Drift by class. P1 SECURITY-DEFINER list highlighted. B-FD informational. State_changed badge. Repo-only directories listed separately. ~1-2h. Sequenced after Stage 2a finalises.

### Stage 3 — `scripts/safe-deploy.sh`: ⏳ PENDING

Pre-deploy `git status` + `origin/main` check. Warns but does NOT refuse. Habit-builder. ~30min.

### Triage phase: ⏳ PENDING (after Stage 2b live)

### 13 existing drift cases — UNCHANGED FROM v2.40/v2.41

See v2.41 entry for the full triage table. Confirmed by v1.0.8 baseline scan: `draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller` are the 3 P1 SECURITY-DEFINER cases (regression-risk on repo redeploy). All 3 also classified as B-RR (deployed ahead of repo).

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.41 — all migrations applied + verifications PASS. M6-M8 still pending; M6 Phase A explicitly BLOCKED behind F-EF-DRIFT-PREVENTION Stage 2a finalisation + 2b close + P1 triage per v2.42.

---

## 🔄 Standing session-start checks

Unchanged from v2.40 (S1–S29).

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.31. **v2.42 status delta**: bef6be96 origin investigation is top P1 next session.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 40 of 5)

**v2.42 application: 3 D-01 fires** this session.

- v1.0.x EF deploy series (consolidated entry — TBD if separate review-id; reconcile in next batch closure)
- Writer-fn migration `0a9012e7-ac0f-45ca-a5b2-bc3b1f8623c9` — agree, no pushback. Applied.
- Chunked-write proposal `d53c9918-0c71-419d-a641-0f49e7872c63` — escalated on a single self-undermining objection ("Sequential writes have no atomic rollback. Failure in one chunk can lead to data inconsistency, although there is a rollback plan in place."). PK had explicitly pre-authorised this exact path in the directive. State-capture override invoked per Lesson #62 boundary; T-MCP-08 1 → 2.

**Lesson #62 boundary stable this session.** Override criterion was met cleanly: (a) PK explicit pre-authorisation in same directive; (b) single pushback was self-undermining (acknowledged the rollback plan in the same sentence as raising the concern); (c) verified_claims confirmed dry-runs PASS, table-empty status, EF resource limits clear.

**Cumulative T-MCP-02 quota: 40 of 5.** Cumulative T-MCP-08: 2. Cost still well under $0.50 cumulative.

---

## 🤖 Cowork automation (D182)

**v2.42 status delta:** **`docs/audit/health/2026-05-06.md` did not push at 02:00 AEST 6 May** (carried from v2.41). Cowork ICE Nightly Health Check is part of D182 standing automation. Cron either ran late, didn't fire, or pushed to wrong location. Logged as P3 follow-up. Investigate next session if not back online.

Sunset review: 12 May 2026 (unchanged).

**v2.42 angle of suspicion:** Cowork is one possible caller of the unexplained `bef6be96` scan. Cross-check Cowork task history at 13:24 AEST 6 May during bef6be96 investigation.

---

## 🧭 ICE Dashboard Architecture Review (v2.35)

Unchanged. §1 (Current-state inventory) remains NEXT — when PK signals.

---

## 🟡 Active

Per v2.41 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **NEW v2.42: bef6be96 scan origin investigation** | Identify caller of unexpected 49-row write at 03:24 UTC 6 May | **P1 (TOP next session)** | OPEN | PK + chat | Ask PK directly; cross-check Cowork / dashboard / Vercel / Supabase EF logs; PK decides cleanup strategy. |
| **F-EF-DRIFT-PREVENTION Stage 2a finalisation** | Apply 90-day retention pg_cron migration | P1 | BLOCKED behind bef6be96 investigation | chat → next session | After origin resolves and cleanup applied: apply migration via Supabase MCP per D170. |
| **F-EF-DRIFT-PREVENTION Stage 2b** | Dashboard drift panel | P1 | PENDING (sequenced after Stage 2a finalises) | chat → future session | Read `m.vw_ef_drift_current` + filtered drift queries; class buckets; P1 SECURITY-DEFINER highlighted. ~1-2h. |
| **F-EF-DRIFT-PREVENTION Stage 3** | `scripts/safe-deploy.sh` | P1 | PENDING | chat → future session | Author wrapper; commit; habit-builder. ~30min. |
| **P1 SECURITY-DEFINER triage** | `heygen-avatar-creator` + `heygen-avatar-poller` + `draft-notifier` | P1 | Sequenced after Stage 2b live (confirmed by v1.0.8 baseline scan as B-RR + SD-risk) | PK + chat | `npx supabase functions download` from `C:\Users\parve\Invegent-content-engine` for each, commit as sync-only commits. |
| **insights-worker P1 functional drift** | Deployed v14.0.0 vs repo v1.6.0 | P1 | D-PREV-07: no auto-sync; manual review first | PK | After Stage 2b live: PK reviews deployed source for correctness, then decides sync direction. |
| **F-YT-NY-FORMAT-SELECTION** (carry-forward) | Brief committed `ff5ae6ae` | P1 | **BLOCKED behind F-EF-DRIFT-PREVENTION Stage 2b close + P1 triage** | chat → future session | After triage clears: read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **M6 Phase A — 108 historical Bug 3 dead-letter** (carry-forward) | Clean up `queued` rows with Bug 3 fingerprint | P1 | **BLOCKED behind F-EF-DRIFT-PREVENTION Stage 2b close + P1 triage** | PK → chat → future session | After F-YT-NY-FORMAT-SELECTION clears: PK directs start; chat composes brief + D-01 + pre-flight P1-P5; apply via Supabase MCP DML. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **3 stuck-item clusters re-evaluation** | LinkedIn-PP residual + YouTube-PP unexpected + YouTube-NY unexpected | P1 | PP×YT cluster cleared by F-YT-OAUTH-PP; NY×YT cluster blocked on F-YT-NY-FORMAT-SELECTION | chat → next session | Re-query S21 audit matrix. |
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix | P1 | DEPLOYED v2.34; awaiting CFW LI fill cycle | chat → next session | Query `m.ai_job` after 2026-05-06 03:04 UTC. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P1 | APPLIED v2.34; combined forward-flow check | chat → next session | Query `m.post_draft` newly-filled rows. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried v2.41 | chat → next session if still absent | Investigate Cowork status; not derailing. **v2.42:** Cowork is also a candidate caller of bef6be96 — cross-check during origin investigation. |
| **ICE Dashboard Architecture Review** | 11-section formal review | strategic-product | KICKOFF complete; §1 next | chat ↔ PK | PK signals start. |
| (others) | per v2.41 | — | — | — | per v2.41 |

**Closed v2.42:**

- (None — Stage 2a is at CHECKPOINT, not closed.)

**Closed v2.41:** F-EF-DRIFT-PREVENTION Stage 1 — Backend foundation.
**Closed v2.40:** F-EF-DRIFT-PREVENTION investigation phase.
**Closed v2.39:** F-YT-OAUTH-PP for Property Pulse.
**Closed v2.38:** M5.

---

## 💼 Personal businesses

*(none flagged at 6 May session start — PK confirmed nothing live today; ICE proceeded)*

---

## 📌 Backlog

**v2.42 changes**:

- **NEW v2.42**: bef6be96 scan origin investigation (Active P1 top next session).
- **NEW v2.42**: F-EF-DRIFT-PREVENTION Stage 2a finalisation (Active P1, BLOCKED behind investigation).
- **NEW v2.42**: 5 lesson candidates surfaced — #63 SUPABASE_* secrets namespace; #64 verify_jwt:false convention; #65 EF resource limits ≠ wall-clock; #66 Management API `/body` is multipart/form-data; #67 writer-fn caller-supplied `run_id` pattern. Defer canonical assessment to next session.
- **NEW v2.42**: 98 rows in `m.ef_drift_log` preserved (49 mine + 49 unexplained). Do not delete.
- **CARRIED v2.42**: drift-check v1.0.8 deployed but cron NOT applied; manual triggers safe.

**v2.41 changes** (still active):

- F-EF-DRIFT-PREVENTION Stages 2a, 2b, 3 (Stage 2a CHECKPOINT BLOCKED v2.42).
- `docs/audit/health/2026-05-06.md` follow-up (P3, watch-only).
- Lesson #62 boundary refinement v2.41 (validated by v2.42 chunked-write override case).

**v2.40 changes** (still active):

- 13 existing drift cases triaged into priority buckets (3 P1 SECURITY-DEFINER confirmed by v1.0.8 baseline scan).
- D-PREV-13/14/15/16 in brief decisions log.

**v2.39 changes** (still active):

- T-MCP-15 lesson candidate — code-search 0-hits ≠ feature missing.
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

**Carried from v2.31**: per v2.41.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Per v2.41 plus:

- **Lesson candidates v2.42 (defer assessment)**:
  - **#63 SUPABASE_* secrets reserved by CLI** — must use `MANAGEMENT_API_TOKEN` not `SUPABASE_ACCESS_TOKEN` in EF env vars (CLI strips `SUPABASE_*` prefix on deploy).
  - **#64 `verify_jwt:false` convention** — auth bridges should drop internal bearer self-validation; rely on Edge Function-level JWT verification (match draft-notifier pattern).
  - **#65 EF resource limits ≠ wall-clock only** — also memory/CPU per invocation; chunking must be multi-invocation, not Promise.all within one (v1.0.5 hit WORKER_RESOURCE_LIMIT despite serial fetch-loop time being well under 60s).
  - **#66 Management API `/body` returns `multipart/form-data`** — text-parsing produces false drift. Must mirror supabase CLI's `downloadWithServerSideUnbundle` parse path: `Accept: multipart/form-data` + `Response.formData()` + read `metadata.entrypoint_path` + pick file part.
  - **#67 Writer-fn caller-supplied `run_id`** — `COALESCE(p_run_id, gen_random_uuid())` pattern enables chunked writes with shared correlation key for atomic cleanup later.
- **Lesson #62 boundary refinement** validated this session — chunked-write override case meets all three criteria (PK explicit pre-auth + single self-undermining objection + verified_claims clears substantive concerns). Pending canonical promotion.
- **F-EF-DRIFT-PREVENTION investigation pattern v2.40** — still pending 1 reuse for promotion.
- **D-PREV-13 taxonomy split** (structural × directional axes) — still pending 1 reuse for promotion.

---

## v2.42 honest limitations

- All v2.31-v2.41 limitations apply.
- **F-EF-DRIFT-PREVENTION Stage 2a NOT closed.** drift-check v1.0.8 is deployed and proven, but cron is not applied and the bef6be96 origin is unknown. The 13 drift cases identified in v2.40 remain unchanged in production. The 3 P1 SECURITY-DEFINER cases are confirmed by the v1.0.8 baseline scan as B-RR + SD-risk — repo redeploy of any of those files would silently break production. **Do not redeploy `heygen-avatar-creator`, `heygen-avatar-poller`, or `draft-notifier` from repo until sync'd.**
- **`m.ef_drift_log` has 98 rows, not 49 as expected.** 49 are mine (`a2124145-…`), 49 are unexplained (`bef6be96-…`). **Do not delete any rows** until PK decides cleanup strategy after origin investigation.
- **`m.vw_ef_drift_current` returns 49 latest-per-slug** (mine) — internally consistent for ongoing drift detection. Future EF runs will compute `state_changed` correctly against my scan as the baseline.
- **Cron NOT applied.** Manual EF triggers are safe (proven this session); automated daily cron pending Stage 2a finalisation.
- **bef6be96 caller unknown.** Possible callers: PK in parallel session/script; automation tool not in `cron.job`; dashboard action; another Claude session — all unconfirmed. Investigation is rank 1 next session.
- **Standing don't-redeploy** for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER regression-risk) confirmed.
- **`ai-diagnostic` repo-only directory operational status remains unclear** (carry-over from v2.40).
- **14+ close-the-loop UPDATEs still pending** (carry-over). v2.42 added 2 review_ids (`0a9012e7-…`, `d53c9918-…`) and a TBD consolidated v1.0.x EF deploy series entry. Combine in next batch closure.
- **`docs/audit/health/2026-05-06.md` did not push** (carried v2.41). Investigate next session only if still absent. Cowork is also a candidate caller of bef6be96 — cross-check during origin investigation.
- **Closure budget remains well above floor** (~35h trailing-14-day). v2.42 added ~5h.

---

## Changelog

- v1.0–2.41: per previous changelog.
- **v2.42 (2026-05-06 Sydney afternoon, F-EF-DRIFT-PREVENTION Stage 2a CHECKPOINT — BLOCKED on unexpected prior scan origin):**
  - **drift-check v1.0.8 DEPLOYED** (commit `d81de062`) after 8 EF iterations. Final fix (F1): `multipart/form-data` parsing — Management API `/body` returns multipart, not raw text. v1.0.0-v1.0.7 read it as text producing universal 47-of-47 false drift. v1.0.8 mirrors supabase CLI's parse path. Verified end-to-end against CLI ground truth.
  - **Writer fn migrated** to `public.write_ef_drift_log(p_rows jsonb, p_run_id uuid DEFAULT NULL)` enabling chunked writes with shared correlation key. D-01 `0a9012e7` agree.
  - **Dry-run chunks 1-5 PASS all 6 PK criteria** — 49 rows; SD-risks exactly 3; class distribution plausible; no return to 47/47 universal drift; repo-only deduped.
  - **Manual chunked write succeeded** with scan_id `a2124145-a519-4fbf-b0b0-1da28782f152` (49 rows, 5 sequential chunks).
  - **Verification surfaced unexpected prior scan `bef6be96-dbca-4a1f-ba29-f9bbcb95f1b3`** — 49 rows at 03:24 UTC (6 min before mine), 5 concurrent parallel-fire from unidentified caller. Per-slug byte-identical to mine. No matching `cron.job`. **Stage 2a BLOCKED.**
  - **3 D-01 fires this session** (T-MCP-02 37 → 40). Chunked-write proposal `d53c9918` escalated on single self-undermining objection — state-capture override invoked per PK explicit pre-auth in directive (T-MCP-08 1 → 2).
  - **Lesson #62 boundary refinement validated** — override criterion met cleanly.
  - **5 lesson candidates surfaced** (#63-#67) — defer canonical assessment.
  - **Net P0+P1 open: 9 → 10** (bef6be96 origin investigation added; Stage 2a still active but blocked). Within 20-finding cap.
  - **Closure budget**: +~5h this session. Day total ~7.5h. Trailing-14-day ~35h. Well above 8.0 floor.
  - **No row deletions.** **Cron NOT applied.** **No more EF deploys.** **M6 untouched.** **F-YT-NY-FORMAT-SELECTION still blocked.**
  - **Hard stops in effect:** do not mark Stage 2a complete; do not apply cron; do not delete rows; do not run more writes; do not start dashboard / safe-deploy / P1 triage / NY×YT / M6.
  - **Next session must begin with bef6be96 origin investigation** before deciding cleanup A/B/C.
