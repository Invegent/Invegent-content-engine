# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-05 Sydney late-evening session-end (v2.40 — **F-EF-DRIFT-PREVENTION Tier 2 LOCKED at 46/46 EFs. Option F APPROVED by PK as target prevention design (drift-check EF + m.ef_drift_log + CRLF-normalised body hashing + SECURITY DEFINER regression detector + dashboard drift panel + non-blocking safe-deploy.sh). Build effort ~4-5h split across two sessions — SEPARATE session, not this one. 13 drift cases triaged into priority buckets. M6 Phase A + F-YT-NY-FORMAT-SELECTION remain BLOCKED behind build close + P1 SECURITY-DEFINER triage.**). Closure budget: ~3h this session, day total ~10h, trailing-14-day ~28h.

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch and action_list version bump from v2.5 onward goes through ChatGPT cross-check before deploy/commit. **v2.40 application**: 0 D-01 fires this session (read-only inspection scope; no patches, no deploys, no DML).

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**NEW STANDING RULE (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is the approved target design. Build is a separate session item. Until the drift-check infrastructure is live AND the 4 P1 triage cases are addressed (3 SECURITY-DEFINER syncs + insights-worker manual review), no further EF patching is safe — this includes M6 Phase A and F-YT-NY-FORMAT-SELECTION, both of which are explicitly BLOCKED.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~7 (T05 P1-urgent + F-EF-DRIFT-PREVENTION build pending + 3 P1 SECURITY-DEFINER triage + insights-worker P1 + F-YT-NY-FORMAT-SELECTION blocked + M6 Phase A blocked + 3 cluster diagnoses still active) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~28h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~3h** (Batch 4 + 5 inspection + taxonomy cleanup + recommendation lock + brief APPROVED status + 4-way sync).

**Day total (5 May): ~10h** (Tier 1 morning ~3.5h + M4 ~1h + M5 ~1.5h + F-YT-OAUTH-PP ~1h + F-EF-DRIFT-PREVENTION batches ~3h).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-05 Sydney late-evening session-end (v2.40).
> **This session: F-EF-DRIFT-PREVENTION Tier 2 LOCKED + Option F APPROVED + 4-way sync.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | Personal businesses check-in | P0 | ICE is bonus | Ask at next session start |
| 2 | **F-EF-DRIFT-PREVENTION build phase — Option F** | **P1 (TOP next session)** | Approved as target design v2.40. Daily drift-check EF + `m.ef_drift_log` + dashboard panel + non-blocking deploy wrapper. Surfaces existing drift to PK at low friction; catches the highest-severity SECURITY-DEFINER regression-risk class via targeted regex. ~4-5h estimated, splittable. Until live, no further EF patching is safe. | Compose CC-stage briefs for the four components (drift-check EF, migration for `m.ef_drift_log`, dashboard panel, `safe-deploy.sh`). Apply migration via Supabase MCP per D170. Deploy drift-check via Windows CLI from `C:\Users\parve\Invegent-content-engine`. |
| 3 | **P1 SECURITY-DEFINER regression-risk triage** | **P1** | Three cases (heygen-avatar-creator, heygen-avatar-poller, draft-notifier) where repo redeploy = silent production bug. Best sequenced AFTER drift-check infrastructure live so the sync commits show up green in the dashboard. | Sync repo → deployed via Windows CLI `npx supabase functions download` for each, commit as sync-only commits. Verify drift-check classifies each as Class A post-sync. |
| 4 | **insights-worker P1 functional drift** | **P1** | Deployed v14.0.0 vs repo v1.6.0 — substantial drift. Per D-PREV-07, do NOT auto-sync; PK manually reviews deployed source for correctness first. | After drift-check live: PK reviews deployed source; if canonical, sync repo → deployed; if not, manual repair. |
| 5 | **F-YT-NY-FORMAT-SELECTION** (P1) **BLOCKED** | P1 | Sequenced behind drift-check live + 3 SECURITY-DEFINER triage + insights-worker review. The drift-check infrastructure must be live before any further EF code work touches the v4 fix path. | After ranks 2-4 close: read v2.11.1 source, locate `format-advisor-v1` call site, decide between 4 candidate fix shapes from brief `ff5ae6ae`. |

**Demoted from prior Today/Next 5 in v2.39→v2.40 cycle:**

- **RECONCILE-EF-DRIFT** — ALREADY CLOSED 2026-05-05 morning by sync commit `7ba441e2`. Was incorrectly carried as Active in v2.39; corrected v2.40.
- **M6 Phase A** — demoted from Today/Next 5 (still Active, but explicitly BLOCKED behind F-EF-DRIFT-PREVENTION build close + P1 triage; was rank 4 in v2.39, now sequenced behind everything else).
- **T05 Meta dev support contact** — still P1-urgent, demoted to standing-list because F-EF-DRIFT-PREVENTION displaced it.

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (NEW v2.40)

**Brief:** `docs/briefs/2026-05-05-f-ef-drift-prevention.md` (status APPROVED)
**Parent:** RECONCILE-EF-DRIFT (CLOSED 2026-05-05 morning, commit `7ba441e2`)

### Investigation phase: ✅ COMPLETE v2.40

Tier 2 inventory locked at 46/46 deployed EFs + 2 repo-only directories.

Final classification:
| Class | Count | % |
|---|---|---|
| A (clean) | 26 | 57% |
|    byte-identical | 17 | |
|    line-ending only (CRLF/LF) | 9 | |
| B-RR (regression-risk; deployed > repo) | 5 | 11% |
| B-FD (forward-drift; repo > deployed) | 1 | 2% |
| C (banner-same body-differs trap) | 7 (current) / 8 (ever-observed) | 15% |
| D (repo file missing) | 7 | 15% |
| Repo-only directories | 2 | (separate state) |

Three commits this session: `bec80b73` Batch 4, `7bb588fa` taxonomy cleanup, `0abd8ca5` Batch 5 + lock.

### Approved design: Option F

| # | Component | Detail | Effort |
|---|---|---|---|
| 1 | `drift-check` Edge Function | Daily 03:00 AEST pg_cron. Iterates 46 EFs. CRLF-normalised body hashing. Permissive banner parser. Classifies A/B-RR/B-FD/C/D. Targeted SECURITY-DEFINER pattern detector (regex catches `exec_sql` UPDATE on c/m/f/t schemas in repo when deployed has replaced with non-`exec_sql` rpc). Writes to `m.ef_drift_log`. Lists repo-only directories. | ~2h |
| 2 | `m.ef_drift_log` table | Columns: slug, checked_at, class, direction, deploy_version, repo_version, deployed_hash, repo_hash, security_definer_regression_risk (boolean), previous_class, state_changed (boolean), notes. Indexes on (slug, checked_at) + (class, checked_at). 90-day retention. | ~15min |
| 3 | Dashboard drift panel | Drift by class. P1 SECURITY-DEFINER regression-risk list (urgent). B-FD informational. Class C/D + repo-only lists. State_changed notification badge. | ~1-2h |
| 4 | `scripts/safe-deploy.sh` | Pre-deploy `git status` clean check + local matches `origin/main` check. Warns but does NOT refuse. Habit-builder. PK retains hot-fix capability. | ~30min |

**Total: ~4-5h split across two sessions. Build is a SEPARATE session item, not this one.**

Not building: CI deploy policy (Option D — too friction-heavy for solo); real-time deploy hook (daily cadence sufficient); auto-backfill from deployed to repo (sync commits remain manual decisions).

### Build phase: ⏳ PENDING (separate session)

### Triage phase: ⏳ PENDING (after build phase)

### 13 existing drift cases (priority buckets, action items)

| Priority | Slug | Detail | Required action |
|---|---|---|---|
| **P1 SECURITY-DEFINER** | heygen-avatar-creator | Deployed v2.2.0 uses `save_avatar_generation()` SECURITY DEFINER fn; repo v2.0.0 uses broken `exec_sql` UPDATE on `c.brand_avatar`. **Repo redeploy = silent fail (c schema not writable via exec_sql).** | Sync repo → deployed (download deployed v2.2.0 source, commit). Best after drift-check live so commit shows green in dashboard. |
| **P1 SECURITY-DEFINER** | heygen-avatar-poller | Deployed v2.0.0 uses 4 SECURITY DEFINER fns + `api2.heygen.com/v2/avatar_group` endpoints; repo v1.0.0 uses broken `exec_sql` UPDATE + `api.heygen.com/v2/photo_avatar/train` endpoints. **Repo redeploy = silent fail + broken endpoints.** | Sync repo → deployed. |
| **P1 SECURITY-DEFINER** | draft-notifier | Deployed v1.1.0 uses `mark_drafts_notified()` SECURITY DEFINER fn; repo v1.0.0 uses broken `exec_sql` UPDATE on `m.post_draft`. **Repo redeploy = drafts never marked notified → every 30min cron sends duplicate review-emails.** | Sync repo → deployed. |
| **P1 functional drift** | insights-worker | Deployed v14.0.0 vs repo v1.6.0 — substantial functional drift. Per D-PREV-07, no auto-sync. | PK manually reviews deployed source for correctness; if canonical, sync; if not, manual repair. |
| **P2 feature drift** | series-writer | Deployed v1.3.0 reads `c.content_series.source_material` and `format_preference` (added 20 Mar 2026); repo v1.2.0 doesn't. Repo redeploy would lose features but not corrupt data. | Sync repo → deployed. |
| **P2 forward-drift (PK decision)** | feed-discovery | Repo v1.2.0 ahead of deployed v1.1.0 with explicit alignment-commit banner (`config.url`→`config.feed_url` + OR-fallback dedupe). Pending deploy state. | PK decides: deploy repo v1.2.0 to live OR leave deployed v1.1.0 in place. |
| **P3 Class C polish-sync** | image-worker | Deployed minified, repo formatted; functionally equivalent. | **Skip per D-PREV-05** (no sync needed). |
| **P3 Class C polish-sync** | feed-intelligence | Repo has dead code removed; deployed still has it. | Sync repo → deployed (low priority). |
| **P3 Class C polish-sync** | onboarding-notifier | Deployed has comments stripped + 1 type annotation added (Studio inline-edit signature). | Sync repo → deployed (low priority). |
| **P3 Class C polish-sync** | ai-profile-bootstrap | Repo extracted slug as variable in `buildPrompt`. | Sync repo → deployed (low priority). |
| **P3 Class C polish-sync** | series-outline | **Affects content quality.** Deployed has carousel guidance + narrative-arc instruction in prompt; repo doesn't. | Sync repo → deployed (medium priority). |
| **P3 Class C polish-sync** | email-ingest | Deployed has section dividers + slightly different `console.warn` text; repo single-line compacted. Cosmetic only. | Sync repo → deployed (very low priority). |
| **P3 Class C polish-sync** | compliance-reviewer | **Affects content quality.** Deployed has different system prompt and rules-scope label (`[Universal]` vs `[Universal — all professions in vertical]`). | Sync repo → deployed (medium priority). |
| **P3 Class D** | ingest, pipeline-doctor, pipeline-ai-summary, compliance-monitor, video-analyser, heygen-intro, heygen-youtube-upload | Deployed but no repo file. | Per slug: commit deployed source to repo OR remove deployed EF. |
| **Repo-only triage** | ai-diagnostic | Repo v1.0.0; no deployed slug. Project memory says it runs daily but no deployed evidence. | Investigate: deploy from repo OR remove dead repo file. |
| **Repo-only triage** | linkedin-publisher | Repo v1.2.0; deliberate forward-staging for B24/F06 (LinkedIn Community Management API approval). Banner explicitly notes "not deployed yet." | Leave alone. |

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.39 — all migrations applied + verifications PASS. M6-M8 still pending; M6 Phase A explicitly BLOCKED behind F-EF-DRIFT-PREVENTION build close + P1 triage per v2.40.

---

## 🔄 Standing session-start checks

Unchanged from v2.39 (S1–S29).

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.31. **v2.40 status delta**: F-EF-DRIFT-PREVENTION investigation closed; build phase queued for separate session.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 34 of 5)

Unchanged from v2.39. **v2.40 application: 0 D-01 fires** (read-only inspection scope). Cumulative: 34 fires total.

---

## 🤖 Cowork automation (D182)

Unchanged from v2.39. Sunset review: 12 May 2026.

---

## 🧭 ICE Dashboard Architecture Review (v2.35)

Unchanged. §1 (Current-state inventory) remains NEXT — when PK signals.

---

## 🟡 Active

Per v2.39 except:

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **NEW v2.40: F-EF-DRIFT-PREVENTION build phase** | Option F: drift-check EF + m.ef_drift_log + dashboard panel + safe-deploy.sh | **P1 (top next session)** | APPROVED 2026-05-05 v2.40; build separate session | chat → next session(s) | Compose CC-stage briefs for the 4 components; apply migration via Supabase MCP; deploy drift-check via Windows CLI. ~4-5h splittable. |
| **NEW v2.40: P1 SECURITY-DEFINER triage** | heygen-avatar-creator + heygen-avatar-poller + draft-notifier | P1 | Sequenced after drift-check infrastructure live | PK + chat | `npx supabase functions download` from `C:\Users\parve\Invegent-content-engine` for each, commit as sync-only commits. |
| **NEW v2.40: insights-worker P1 functional drift** | Deployed v14.0.0 vs repo v1.6.0 | P1 | D-PREV-07: no auto-sync; manual review first | PK | After drift-check live: PK reviews deployed source for correctness, then decides sync direction. |
| **F-YT-NY-FORMAT-SELECTION** (carry-forward) | Brief committed `ff5ae6ae` | P1 | **BLOCKED behind F-EF-DRIFT-PREVENTION build close + P1 triage** | chat → future session | Read v2.11.1 source post-build/triage; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **M6 Phase A — 108 historical Bug 3 dead-letter** (carry-forward) | Clean up `queued` rows with Bug 3 fingerprint | P1 | **BLOCKED behind F-EF-DRIFT-PREVENTION build close + P1 triage** | PK → chat → future session | After F-YT-NY-FORMAT-SELECTION clears: PK directs start; chat composes brief + D-01 + pre-flight P1-P5; apply via Supabase MCP DML. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **3 stuck-item clusters re-evaluation** | LinkedIn-PP residual + YouTube-PP unexpected + YouTube-NY unexpected | P1 | PP×YT cluster cleared by F-YT-OAUTH-PP; NY×YT cluster blocked on F-YT-NY-FORMAT-SELECTION | chat → next session | Re-query S21 audit matrix. |
| **F-AI-WORKER-PARSER-SKIP-BUG V3-V5** | Forward acid-test of parser fix | P1 | DEPLOYED v2.34; awaiting CFW LI fill cycle | chat → next session | Query `m.ai_job` after 2026-05-06 03:04 UTC. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test of slot intent write | P1 | APPLIED v2.34; combined forward-flow check | chat → next session | Query `m.post_draft` newly-filled rows. |
| **ICE Dashboard Architecture Review** | 11-section formal review | strategic-product | KICKOFF complete; §1 next | chat ↔ PK | PK signals start. |
| (others) | per v2.39 | — | — | — | per v2.39 |

**Closed v2.40:**

- **F-EF-DRIFT-PREVENTION investigation phase** ✅ — Tier 2 inventory locked at 46/46 EFs + 2 repo-only. Recommendation Option F APPROVED. Build phase + triage phase remain Active. Brief: `docs/briefs/2026-05-05-f-ef-drift-prevention.md` (status APPROVED). Traceability: `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md`.

**Closed v2.39:** F-YT-OAUTH-PP for Property Pulse.
**Closed v2.38:** M5.

---

## 💼 Personal businesses

*(none flagged — PK to confirm at next session start)*

---

## 📌 Backlog

**v2.40 changes**:

- **NEW v2.40**: F-EF-DRIFT-PREVENTION build phase (Active, P1 top next session).
- **NEW v2.40**: 13 existing drift cases triaged into priority buckets (Active under STATUS BLOCK section above).
- **NEW v2.40**: D-PREV-13/14/15/16 added to brief decisions log.
- **NEW v2.40**: D-PREV-16 — PK approved Option F (target prevention design).
- **Closed v2.40**: F-EF-DRIFT-PREVENTION investigation phase (build phase + triage phase remain Active).
- M6 Phase A explicitly BLOCKED behind F-EF-DRIFT-PREVENTION build close + P1 triage (was Active P1 #4 in v2.39; still Active but blocked).
- F-YT-NY-FORMAT-SELECTION explicitly BLOCKED behind same gate.

**v2.39 changes** (still active):

- T-MCP-15 lesson candidate — code-search 0-hits ≠ feature missing.
- D-YT-OAUTH-1 standing rule.
- S29 standing check.

**v2.38 changes** (still active):

- T-MCP-13 + T-MCP-14 lesson candidates.

**v2.37 + v2.36 changes** (still active):

- M6-M8 sequenced (now blocked).
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

**Carried from v2.31**: per v2.39.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Per v2.39 plus:

- **F-EF-DRIFT-PREVENTION investigation pattern v2.40 — candidate canonical**: Tier 2 chunked-batch inventory (~10 EFs each) + structural/directional taxonomy + targeted pattern detection for the most-dangerous regression class is reproducible for any future cross-system audit (e.g. SQL function drift, dashboard component drift, migration-vs-deployed-schema drift). Surfaced v2.40; promote to canonical after 1 reuse.
- **D-PREV-13 taxonomy split** (structural × directional axes) — candidate canonical for any drift/version audit work; promote after 1 reuse.

---

## v2.40 honest limitations

- All v2.31-v2.39 limitations apply.
- **F-EF-DRIFT-PREVENTION investigation closed but build NOT done.** The 13 drift cases identified remain unchanged in production until the build phase ships. Most are benign; the 3 P1 SECURITY-DEFINER cases are the active risk — a redeploy of any of those repo files would silently break production. PK is aware; do not redeploy heygen-avatar-creator, heygen-avatar-poller, or draft-notifier from repo until sync’d.
- **M6 Phase A and F-YT-NY-FORMAT-SELECTION are now explicitly blocked.** This is a deliberate sequencing choice (per D-PREV-16) so source-safety infrastructure is in place before further EF code work.
- **The drift-check infrastructure does not exist yet.** Until it does, drift accumulation between sessions is invisible. The recommendation is to build it before any other EF deploy, but PK retains the call on sequencing.
- **`ai-diagnostic` repo-only directory operational status remains unclear.** Project memory claims daily 6am AEST runs against `m.ai_diagnostic_report`; no deployed slug `ai-diagnostic` exists. Either functionality has been folded into another deployed EF, or the EF was authored but never deployed. Triage candidate, not yet investigated.
- **12 close-the-loop UPDATEs still pending** (carry-over). v2.40 added 0. Combine in next batch closure.
- **Closure budget remains well above floor** (~28h trailing-14-day). v2.40 added ~3h.

---

## Changelog

- v1.0–2.39: per previous changelog.
- **v2.40 (2026-05-05 Sydney late-evening session-end, F-EF-DRIFT-PREVENTION Tier 2 LOCKED + Option F APPROVED):**
  - **F-EF-DRIFT-PREVENTION investigation phase CLOSED.** Tier 2 inventory locked at 46/46 deployed EFs + 2 repo-only directories surveyed. Final classification: 26 A (17 byte-identical + 9 line-ending-only) + 5 B-RR + 1 B-FD + 7 C (current; 8 ever-observed) + 7 D + 2 repo-only. Brief status updated to APPROVED.
  - **Option F APPROVED by PK** as the target prevention design: daily drift-check EF at 03:00 AEST + `m.ef_drift_log` table + CRLF-normalised body hashing + SECURITY DEFINER regression detector + dashboard drift panel + non-blocking safe-deploy.sh wrapper. Build effort ~4-5h split across two sessions; explicitly NOT this session.
  - **13 existing drift cases triaged into priority buckets:** P1 SECURITY-DEFINER (heygen-avatar-creator, heygen-avatar-poller, draft-notifier), P1 functional (insights-worker), P2 feature (series-writer), P2 forward-drift (feed-discovery), P3 Class C polish-sync ×7, P3 Class D ×7, repo-only triage ×2.
  - **D-PREV-16 added**: PK approved Option F; build is separate session; M6 Phase A and F-YT-NY-FORMAT-SELECTION remain blocked behind build close + P1 SECURITY-DEFINER triage + insights-worker manual review.
  - **Three commits this session prior to sync:** `bec80b73` Batch 4, `7bb588fa` taxonomy cleanup, `0abd8ca5` Batch 5 + Tier 2 lock.
  - **D-01 fires this session: 0** (read-only inspection scope).
  - **Net P0+P1 open: 5 → 7** (F-EF-DRIFT-PREVENTION build pending + 3 P1 SECURITY-DEFINER triage + insights-worker P1 promoted; F-EF-DRIFT-PREVENTION investigation closed). Within 20-finding cap.
  - **Closure budget**: +~3h F-EF-DRIFT-PREVENTION batches 4+5 + lock + 4-way sync. Day total ~10h. Trailing-14-day ~28h. Above 8.0 floor.
  - **No EF deploys.** **M6 untouched.** **No DML.**
  - **RECONCILE-EF-DRIFT carry-forward correction**: was incorrectly listed as Active P1 in v2.39 (it was already closed by sync commit `7ba441e2` morning of 2026-05-05). Removed from Active in v2.40.
