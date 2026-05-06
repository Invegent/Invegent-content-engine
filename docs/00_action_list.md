# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-07 Sydney (v2.43 — **bef6be96 origin investigation RESOLVED.** Read-only forensics traced the unexpected prior scan to the same `postgres` DB role + chat-authored SQL fingerprint as the v2.42 chat session itself. `pg_stat_statements` recovered the exact 03:24:06 UTC SQL block: `-- Generate ONE scan_id, fire all 5 write chunks…` + CTE structure + `vault.decrypted_secrets` MCP convention. Most likely cause: discarded first parallel-block write attempt; chat re-did sequentially as a2124145 without recording the discard. PK decision: **keep both scans**, document, no row mutation. Finding doc at `docs/audit/findings/2026-05-06-ef-drift-duplicate-scan-origin.md`. Both scans byte-identical per slug; zero data corruption / zero production impact. Stage 2a UNBLOCKED — top P1 next is the cron migration (daily drift-check + 90-day retention). Lesson candidate #68 captured. ~30–40 min closure this session. Day total ~8h, trailing-14-day ~35.5h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.43 application**: 0 D-01 fires this session (read-only forensics). T-MCP-02 quota unchanged at 40.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is the approved target design. Build is staged. Stage 1 closed v2.41. Stage 2a EF-deploy DONE v2.42. **Stage 2a CHECKPOINT-BLOCK CLEARED v2.43** — bef6be96 origin investigation resolved; cron migration is the remaining Stage 2a component. Stages 2b + 3 sequenced behind. Until Stage 2a finalises (cron applied) AND the 4 P1 triage cases are addressed (3 SECURITY-DEFINER syncs + insights-worker manual review), no further EF patching is safe — this includes M6 Phase A and F-YT-NY-FORMAT-SELECTION, both of which are explicitly BLOCKED.

**STANDING RULE (Lesson #62, v2.41)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, the default is NOT automatic state-capture override. If the underlying ambiguity is real (multiple defensible design answers), Claude should propose revision first. State-capture override is reserved for cases where the reviewer's pushback genuinely is generic and the verified_claims body has cleared the substantive concerns.

**STANDING RULE (Lesson candidate #68, v2.43 NEW)**: All fired writes must be tracked inline. A discarded first attempt cannot fall out of session memory just because a later formally-authorised replay supersedes it. When chat fires a write that it later discards/replaces: acknowledge the fired write explicitly in the session record at the moment of firing; record the discard rationale and any cleanup intent inline; if discard → replay sequence is intentional, log both outcomes side by side. Defer canonical promotion until one reuse.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~9 (T05 P1-urgent + F-EF-DRIFT-PREVENTION Stage 2a finalisation = cron migration + Stage 2b/3 build pending + 3 P1 SECURITY-DEFINER triage + insights-worker P1 + F-YT-NY-FORMAT-SELECTION blocked + M6 Phase A blocked + 3 cluster diagnoses still active + 6 May health check follow-up). bef6be96 investigation CLOSED. | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~35.5h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~30–40 min** (read-only forensics + 4-file documentation commit).

**Day total (6/7 May): ~8h** (Stage 1 morning + Stage 2a checkpoint afternoon + investigation resolution).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-07 Sydney (v2.43).
> **This session: bef6be96 origin investigation RESOLVED — Stage 2a UNBLOCKED.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **F-EF-DRIFT-PREVENTION Stage 2a finalisation — daily drift-check + 90-day retention pg_cron** | **P1 TOP** | bef6be96 investigation resolved per v2.43; PK directed cron migration as next concrete step. Two cron jobs needed: (a) daily drift-check fire orchestrating 5 chunks with shared scan_id; (b) daily DELETE on `m.ef_drift_log WHERE checked_at < now() - interval '90 days'`. ~20–30 min. | Design + D-01 review + apply via Supabase MCP per D170. Sequential per-chunk fire pattern recommended (lesson #68 application); single-statement parallel only with documented justification. Verify daily DELETE clause. |
| 2 | **F-EF-DRIFT-PREVENTION Stage 2b — dashboard drift panel** | P1 | After #1 closes. Reads `m.vw_ef_drift_current` + filtered queries. Surfaces drift to PK at low friction. ~1–2h. | Design panel; lists by class bucket, P1 SECURITY-DEFINER list highlighted, B-FD informational, state_changed=true badge, repo-only directories listed separately. |
| 3 | **F-EF-DRIFT-PREVENTION Stage 3 — `scripts/safe-deploy.sh`** | P1 | After #2. Pre-deploy `git status` clean check + local-matches-`origin/main` check. Warns but does NOT refuse. ~30 min. | Author script; commit; PK adopts on next manual deploy. |
| 4 | **P1 SECURITY-DEFINER regression-risk triage** | P1 | Three cases (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`). After Stage 2b live so the sync commits show up green in the dashboard. | Sync repo → deployed via Windows CLI `npx supabase functions download` for each, commit as sync-only commits. Verify drift-check classifies each as Class A post-sync. |
| 5 | **insights-worker P1 functional drift** | P1 | Deployed v14.0.0 vs repo v1.6.0. After Stage 2b live + P1 SECURITY-DEFINER triage. | PK reviews deployed source for correctness, then decides sync direction. |

**Demoted from prior Today/Next 5 in v2.42→v2.43 cycle:**

- **bef6be96 origin investigation** — CLOSED v2.43. Finding doc filed. PK keep-both decision documented. No row mutation.
- **F-EF-DRIFT-PREVENTION Stage 2a finalisation** — was BLOCKED behind investigation; now unblocked at rank 1.

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (v2.43 update)

**Brief:** `docs/briefs/2026-05-05-f-ef-drift-prevention.md` (status APPROVED)
**Parent:** RECONCILE-EF-DRIFT (CLOSED 2026-05-05 morning, commit `7ba441e2`)

### Stage 1 — Backend foundation: ✅ COMPLETE 2026-05-06 morning (v2.41)

### Investigation phase: ✅ COMPLETE v2.40 (Tier 2 inventory locked at 46/46 EFs + 2 repo-only)

### Stage 2a — drift-check EF + retention cron: ⏳ EF DONE — CRON PENDING

#### Stage 2a — what's done

- drift-check **v1.0.8 DEPLOYED** (commit `d81de062`) via Windows CLI from `C:\Users\parve\Invegent-content-engine` (v2.42)
- 8 EF iterations v1.0.0 → v1.0.8 with documented fixes
- F1 multipart/form-data fix verified end-to-end (v2.42)
- Writer fn migrated to `public.write_ef_drift_log(p_rows jsonb, p_run_id uuid DEFAULT NULL)` (v2.42)
- Dry-run chunks 1-5 PASS all 6 PK criteria (v2.42)
- Manual chunked write `a2124145` succeeded 49 rows (v2.42)
- **bef6be96 origin investigation RESOLVED v2.43** — finding doc filed, PK keep-both decision documented, both scans preserved (98 rows total), `m.vw_ef_drift_current` correctly returns 49 latest-per-slug

#### Stage 2a — pending (top P1 next session)

| # | Component | Detail | Effort |
|---|---|---|---|
| 1 | Daily drift-check fire pg_cron | Sequential per-chunk fire pattern with shared scan_id; OR single-statement parallel with documented justification (lesson #68 application). 03:00 AEST daily recommended. | ~15–20 min |
| 2 | 90-day retention pg_cron | Daily DELETE on `m.ef_drift_log WHERE checked_at < now() - interval '90 days'` | ~5 min |

### Stage 2b — Dashboard drift panel: ⏳ PENDING

Reads `m.vw_ef_drift_current` + filtered queries on `m.ef_drift_log`. Drift by class. P1 SECURITY-DEFINER list highlighted. ~1–2h. Sequenced after Stage 2a finalises.

### Stage 3 — `scripts/safe-deploy.sh`: ⏳ PENDING

### Triage phase: ⏳ PENDING (after Stage 2b live)

### 13 existing drift cases — UNCHANGED FROM v2.40/v2.41/v2.42

Confirmed by v1.0.8 baseline scan: `draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller` are the 3 P1 SECURITY-DEFINER cases (regression-risk on repo redeploy).

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.41/v2.42 — all migrations applied + verifications PASS. M6-M8 still pending; M6 Phase A explicitly BLOCKED behind F-EF-DRIFT-PREVENTION Stage 2a finalisation + 2b close + P1 triage per v2.42/v2.43.

---

## 🔄 Standing session-start checks

Unchanged from v2.40 (S1–S29).

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.31. **v2.43 status delta**: bef6be96 origin investigation CLOSED. Cron migration is top P1 next session.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 40 of 5)

**v2.43 application: 0 D-01 fires** this session (read-only forensics).

**Lesson #62 boundary stable.** Override criterion last validated v2.42 (chunked-write proposal `d53c9918`). No new override events this session.

**Lesson candidate #68** added v2.43 (see Standing Rule above + finding doc).

**Cumulative T-MCP-02 quota: 40 of 5.** Cumulative T-MCP-08: 2. Cost still well under $0.50 cumulative.

---

## 🤖 Cowork automation (D182)

**v2.43 status delta:** Cowork ruled out as bef6be96 caller (investigation closed). `docs/audit/health/2026-05-06.md` still absent at v2.43 close — carry as P3 follow-up. Investigate only if not back online by next session.

Sunset review: 12 May 2026 (unchanged).

---

## 🧭 ICE Dashboard Architecture Review (v2.35)

Unchanged. §1 (Current-state inventory) remains NEXT — when PK signals.

---

## 🟡 Active

Per v2.42 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **F-EF-DRIFT-PREVENTION Stage 2a finalisation** | Daily drift-check + 90-day retention pg_cron | **P1 TOP** | UNBLOCKED v2.43 | chat → next session | Design + D-01 review + apply via Supabase MCP per D170. |
| **F-EF-DRIFT-PREVENTION Stage 2b** | Dashboard drift panel | P1 | PENDING (sequenced after Stage 2a finalises) | chat → future session | Read `m.vw_ef_drift_current` + filtered drift queries; class buckets; P1 SECURITY-DEFINER highlighted. ~1–2h. |
| **F-EF-DRIFT-PREVENTION Stage 3** | `scripts/safe-deploy.sh` | P1 | PENDING | chat → future session | Author wrapper; commit; habit-builder. ~30 min. |
| **P1 SECURITY-DEFINER triage** | `heygen-avatar-creator` + `heygen-avatar-poller` + `draft-notifier` | P1 | Sequenced after Stage 2b live | PK + chat | `npx supabase functions download` from `C:\Users\parve\Invegent-content-engine` for each, commit as sync-only commits. |
| **insights-worker P1 functional drift** | Deployed v14.0.0 vs repo v1.6.0 | P1 | D-PREV-07: no auto-sync; manual review first | PK | After Stage 2b live: PK reviews deployed source for correctness, then decides sync direction. |
| **F-YT-NY-FORMAT-SELECTION** (carry-forward) | Brief committed `ff5ae6ae` | P1 | **BLOCKED behind F-EF-DRIFT-PREVENTION Stage 2b close + P1 triage** | chat → future session | After triage clears: read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **M6 Phase A — 108 historical Bug 3 dead-letter** (carry-forward) | Clean up `queued` rows with Bug 3 fingerprint | P1 | **BLOCKED behind F-EF-DRIFT-PREVENTION Stage 2b close + P1 triage** | PK → chat → future session | After F-YT-NY-FORMAT-SELECTION clears: PK directs start; chat composes brief + D-01 + pre-flight P1-P5; apply via Supabase MCP DML. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **3 stuck-item clusters re-evaluation** | LinkedIn-PP + YouTube-PP + YouTube-NY | P1 | PP×YT cluster cleared by F-YT-OAUTH-PP; NY×YT cluster blocked on F-YT-NY-FORMAT-SELECTION | chat → next session | Re-query S21 audit matrix. |
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix | P1 | DEPLOYED v2.34; awaiting CFW LI fill cycle | chat → next session | Query `m.ai_job` after 2026-05-06 03:04 UTC. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P1 | APPLIED v2.34; combined forward-flow check | chat → next session | Query `m.post_draft` newly-filled rows. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried v2.41/v2.42/v2.43 | chat → next session if still absent | Investigate Cowork status; not derailing. Cowork ruled out as bef6be96 caller. |
| **ICE Dashboard Architecture Review** | 11-section formal review | strategic-product | KICKOFF complete; §1 next | chat ↔ PK | PK signals start. |
| (others) | per v2.42 | — | — | — | per v2.42 |

**Closed v2.43:**

- **bef6be96 origin investigation** — RESOLVED. Finding doc: `docs/audit/findings/2026-05-06-ef-drift-duplicate-scan-origin.md`. PK keep-both decision documented. No row mutations.

**Closed v2.42:** (none — Stage 2a was at CHECKPOINT, not closed.)
**Closed v2.41:** F-EF-DRIFT-PREVENTION Stage 1.
**Closed v2.40:** F-EF-DRIFT-PREVENTION investigation phase.
**Closed v2.39:** F-YT-OAUTH-PP for Property Pulse.
**Closed v2.38:** M5.

---

## 💼 Personal businesses

*(none flagged at 7 May session start — PK confirmed nothing live; ICE proceeded)*

---

## 📌 Backlog

**v2.43 changes**:

- **CLOSED v2.43**: bef6be96 origin investigation. Finding doc filed.
- **PROMOTED v2.43**: Stage 2a finalisation (cron migration) from BLOCKED to TOP P1.
- **NEW v2.43**: Lesson candidate #68 captured (all fired writes tracked inline; discarded first attempts cannot fall out of session memory).
- **CARRIED v2.43**: 5 lesson candidates from v2.42 (#63-#67) — defer canonical assessment.
- **CARRIED v2.43**: 98 rows in `m.ef_drift_log` (49 mine + 49 bef6be96). Both scans intentionally preserved per PK keep-both decision.

**v2.42 changes** (still active where relevant):

- 5 lesson candidates surfaced #63-#67.
- drift-check v1.0.8 deployed; cron NOT applied (rank 1 next session).

**v2.41 changes** (still active):

- F-EF-DRIFT-PREVENTION Stages 2a (cron pending), 2b, 3.
- `docs/audit/health/2026-05-06.md` follow-up (P3, watch-only).
- Lesson #62 boundary refinement v2.41.

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

**Carried from v2.31**: per v2.42.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Per v2.42 plus:

- **Lesson candidate #68 NEW v2.43**: All fired writes must be tracked inline. A discarded first attempt cannot fall out of session memory just because a later formally-authorised replay supersedes it. Complements Lesson #62 (#62 governs ChatGPT review escalations; #68 governs chat's own discarded actions). Defer canonical promotion until one reuse.
- **Lesson candidates v2.42 (defer assessment)**: #63-#67 unchanged.
- **Lesson #62 boundary refinement** validated v2.42 chunked-write override case. Pending canonical promotion.
- **F-EF-DRIFT-PREVENTION investigation pattern v2.40** — pending 1 reuse for promotion.
- **D-PREV-13 taxonomy split** (structural × directional axes) — pending 1 reuse for promotion.

---

## v2.43 honest limitations

- All v2.31-v2.42 limitations apply.
- **bef6be96 origin investigation closure is best-effort.** The discarded-first-attempt theory is medium-high confidence but not certain. The lower-confidence alternative (separate concurrent Claude session) is unfalsifiable from current data — PK's denial is the strongest evidence against it. If a future incident produces similar fingerprints, this conclusion may need revisiting.
- **`m.ef_drift_log` retains 98 rows by design.** Both scans byte-identical per slug. `m.vw_ef_drift_current` returns 49 latest-per-slug (a2124145). Future EF runs will compute `state_changed` correctly against a2124145 as the baseline.
- **Cron NOT yet applied.** Manual EF triggers remain safe; automated daily cron is top P1 next session.
- **bef6be96 caller theory unverifiable in absolute terms.** Best evidence available pointed to chat-self; doc'd as such; lesson #68 added to prevent recurrence.
- **Standing don't-redeploy** for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` (P1 SECURITY-DEFINER regression-risk) confirmed.
- **`ai-diagnostic` repo-only directory operational status remains unclear** (carry-over from v2.40).
- **15+ close-the-loop UPDATEs still pending** (carry-over). Combine in next batch closure.
- **`docs/audit/health/2026-05-06.md` did not push** (carried v2.41/v2.42). Investigate next session only if still absent.
- **Closure budget remains well above floor** (~35.5h trailing-14-day). v2.43 added ~30–40 min.

---

## Changelog

- v1.0–2.42: per previous changelog.
- **v2.43 (2026-05-07 Sydney, bef6be96 origin investigation RESOLVED, Stage 2a UNBLOCKED):**
  - **bef6be96 origin investigation CLOSED.** Read-only forensics traced the unexpected prior scan to the same `postgres` DB role + chat-authored SQL fingerprint as the v2.42 chat session itself. `pg_stat_statements` recovered the exact 03:24:06 UTC SQL block (`-- Generate ONE scan_id, fire all 5 write chunks…` + CTE structure + `vault.decrypted_secrets` MCP convention). Most likely cause: discarded first parallel-block write attempt; chat re-did sequentially as a2124145 without recording the discard.
  - **PK decision: keep both scans.** No row mutation. Documented in finding doc `docs/audit/findings/2026-05-06-ef-drift-duplicate-scan-origin.md`.
  - **Stage 2a UNBLOCKED.** EF (v1.0.8) + writer fn + baseline scan all in place. Top P1 next: cron migration (daily drift-check + 90-day retention).
  - **Lesson candidate #68 NEW**: All fired writes must be tracked inline. Complements Lesson #62.
  - **0 D-01 fires this session** (read-only forensics).
  - **Net P0+P1 open: 10 → 9** (bef6be96 investigation closed).
  - **Closure budget**: +~30–40 min this session. Day total ~8h. Trailing-14-day ~35.5h. Well above 8.0 floor.
  - **No row deletions.** No production impact. **`m.ef_drift_log` retains 98 rows by design.**
  - **Hard stops still in effect:** do not start dashboard / safe-deploy / P1 triage / NY×YT / M6 yet.
  - **Cron migration may proceed** per PK directive — design + D-01 review then apply.
