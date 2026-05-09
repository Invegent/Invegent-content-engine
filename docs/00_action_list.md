# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-09 Sydney (v2.57 — **F-CRON-PG-NET-TIMEOUT-5S CLOSED** via cc-0006 APPLIED by CC via Supabase MCP `execute_sql` (commit `c72bc327`, jobs 33/44/58 each patched with `timeout_milliseconds := 30000`, 35-byte command growth, byte-for-byte URL/headers/schedule preservation, job 58 inline secret preserved character-for-character, V1+V2+V3 PASS strictly, V4 PASS load-bearing "no regression" criterion, no rollback). First `cron_edit` D-01 action_type. **F-CRON-AUTO-APPROVER-SECRET-INLINE remains separately OPEN (P2 sec)** — cc-0006 deliberately preserved the inline secret on job 58. **HTTP 401 5-min cron pattern surfaced as NEW v2.57 triage candidate** — likely jobid 48 or another `*/5` cron whose endpoint returns 401; out-of-scope for cc-0006; not a regression. **cc-0005 / M8 Path A v3 PATCHED** chat-side under PK direction (commit `245005a3`); supersedes v2 Path A (`f70cb41f`) which had 5 critical regex bugs (substring matches against `get_next_scheduled_for` would have matched comment text in rewritten cron 48 body and fired V8/V10 RAISE EXCEPTION). v3 fixes: function-call regex at all 11 call sites; comment rephrase; H1–H6 extended pre-flight (alignment HALT §8.2.l added; un-publishable cohort + distinct created_by enumeration + ORIGINAL_COMMENT capture); M1–M4 hygiene; L1–L2 defensive. **Brief ready for pre-flight gating, NOT apply.** Apply gates remaining: §1.5d alignment=0 + §1.5c PK direction on un-publishable cohort + D-01 + PK approval. Brief-runner-v0 L10–L18 candidates captured from cc-0006 + cc-0005 v3 cycles. Closed v2.57: F-CRON-PG-NET-TIMEOUT-5S (P2). Previous (v2.56): M6 Phase B CLOSED via cc-0004 APPLIED.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump that touches production state goes through ChatGPT cross-check before deploy/commit. **v2.57 application**: 1 D-01 fire chat-side prior cycle for cc-0006 apply (clean PASS / agree / proceed / 0 pushback / 0 escalation; first `cron_edit` action_type). v2.57 4-way sync close commit (this) is doc-only and per protocol does not require a fire. cc-0005 v3 patch (prior turn) was doc-only and did not require a fire.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is approved target design. All stages CLOSED. **v2.57 application**: no drift fires this session.

**STANDING RULE (Lesson #62, v2.41 + v2.50 refinement)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override. **v2.57 application**: D-01 fire for cc-0006 returned clean agree / 0 pushback / 0 escalation; rule not exercised.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time**.

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery is now the default brief pattern for any CC dashboard/portal/web/script work.

**STANDING RULE (v2.50 — Acceptance integrity)**: Acceptance is not complete until the actual review artifact is received and reviewed. **v2.57 application**: cc-0006 result file commit `c72bc327` verified by re-fetching landed file content via Invegent GitHub MCP — blob `9613c133`, size 11,188 B; md5 deltas + V1–V4 verification table + D-01 conditions all present. cc-0005 v3 patch commit `245005a3` verified by re-fetching landed file content — blob `2284ef2d`, size 75,985 B; all 13 v3 fix categories verified present.

**STANDING RULE (v2.55 — brief-runner-v0 baseline patterns from cc-0003 cycle)**: L1–L4 are baseline:
- **L1 HALT mechanism is load-bearing.**
- **L2 doc-only patch → re-execution loop.**
- **L3 result-file preservation.**
- **L4 pre-state baseline pattern is now required.**

**v2.56 ADDITION**: **L6 (cross-brief patch propagation when invariant fails) is now baseline.**

**v2.57 ADDITIONS (candidates from cc-0006 + cc-0005 v3 cycles, promotion after one more vindication each):**
- **L10** `cron_edit` D-01 action_type works cleanly
- **L11** md5 baseline + post-md5 fingerprint pattern for any brief that touches a fingerprintable artifact
- **L12** substrate-drift guard pattern (paranoid but cheap)
- **L13** V3 immediate evaluation — cron_health_snapshot may compute right after apply; cannot be relied on in general
- **L14** V4 strict-vs-load-bearing distinction — informational vs blocking criteria
- **L15** chat review pass before apply — explicit doc-review step before D-01 fire materially reduces apply-time risk for any new brief shape
- **L16** function-call regex pattern — portable PostgreSQL pattern for verifying call presence/absence in function/view/cron bodies
- **L17** in-place patching pattern — a brief with critical correctness or premise bugs caught at review time can be in-place patched as long as it has not yet been applied
- **L18** pre-flight cohort surfacing pattern — when a brief retires or modifies a code path, surface the cohorts the retired path was processing; PK decides handling

**v2.57 promotion candidates (carry-forward from v2.56, after one more vindication each):**
- **L5** invariants must be empirically pre-tested
- **L7** "informational, expected non-zero" co-occurrence pattern
- **L8** multi-table criterion via IN-subquery pattern at production scale
- **L9** schedule-delta evidence in result files

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~2 (unchanged from v2.56; cc-0006 was P2) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~60h (was ~60h v2.56; +30m this 4-way sync close) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This 4-way sync close: ~30 min** (read 3 docs + cc-0006 result file + author 3 doc files + acceptance integrity verify).

**State-capture exception count v2.57: 0** (cc-0006 D-01 fire returned clean agree; no escalation, no override).

---

## ⭐ Today / Next 5 — REBUILT v2.57

> **Last rebuilt:** 2026-05-09 Sydney (v2.57).
> **F-CRON-PG-NET-TIMEOUT-5S CLOSED v2.57.** cc-0005 v3 PATCHED chat-side, ready for pre-flight gating. HTTP 401 5-min cron triage NEW v2.57.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Dashboard Architecture Review Phase 0 prerequisites** | **P1 TOP** | Unchanged from v2.55/v2.56. M6 Phase A + B closed; M7 (doc-only) + M8 (cc-0005 v3 patched, awaiting apply) still pending. | PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. |
| 2 | **AI cost view** | P3 quick win | Unchanged. ~1h estimate. | Author `vw_ai_cost_monthly` on `m.ai_job` (read-only DDL) + add NOW dashboard tile. |
| 3 | **cc-0005 / M8 Path A v3 — APPLY scheduling** | **P3 (PK direction required)** | **Rephrased v2.57.** Brief patched to v3 (commit `245005a3`); v2 Path A had 5 critical regex bugs that would have blocked first apply. v3 ready for pre-flight gating. | PK directs whether to schedule apply session. Apply gates remaining: §1.5d alignment=0 + §1.5c PK direction on un-publishable cohort + D-01 fire + PK approval. |
| 4 | **HTTP 401 5-min cron triage** | **P3 (NEW v2.57)** | Surfaced during cc-0006 V4. NOT a regression. Likely jobid 48 or another `*/5` cron returning 401. | PK directs. Read-only triage to identify the 5-min cron source. Likely a brief shape similar to cc-0006 (cron-edit class) IF resolution is config or auth. |
| 5 | **Personal businesses check-in** | P0 standing | Carry. | PK reports any time-sensitive items + Crazy Domains clean-up status. |

**Carry-forward unchanged from v2.56 except v2.57 deltas (cc-0006 closure, cc-0005 v3 patch landed, HTTP 401 triage candidate added).**

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (unchanged from v2.55)

All stages CLOSED. Cron jobid 80 + 81 active=true. No drift fires this cycle.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`.

**v2.57 update on hard blockers:**
- ✅ S30 cleared v2.47 — first hard blocker DONE.
- 🔲 M5–M8 reconciliation — partial progress: M6 Phase A **CLOSED v2.55**; M6 Phase B **CLOSED v2.56**. M7 (doc-only) + M8 (cc-0005 v3 patched but NOT applied) still pending.
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override (cc-0001 result file in place).

**Phase 0 still gated. Remains Top-1 next session priority v2.57.**

---

## 🟢 Tier 1 + M4 + M5 + M6 Phase A + M6 Phase B queue integrity & stability remediation — STATUS BLOCK

**v2.57 update:**
- M1 + M2 + M3 — CLOSED 2026-05-05
- M4 — CLOSED 2026-05-05
- M5 — CLOSED 2026-05-05
- **M6 Phase A — CLOSED v2.55** via cc-0003 v2 (commit `d60dcfbc`, 9 rows)
- **M6 Phase B — CLOSED v2.56** via cc-0004 (commit `9d5bdd37`, 43 rows)
- **M6 dead-letter cycle: COMPLETE.** Total 52 residual rows cleared.
- **M7 closure — PENDING (folds into cc-0005 / M8 4-way sync per reconciliation §6 Q2; doc-only)**
- **M8 atomic cutover — cc-0005 v3 PATCHED v2.57 commit `245005a3`** (supersedes v2 Path A `f70cb41f` due to 5 critical regex bugs caught in chat review). **NOT YET APPLIED.** Apply gates remaining: §1.5d alignment + §1.5c PK direction + D-01 + PK approval.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.54.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 53 cumulative; close-the-loop ~27+ pending)

**v2.57 application**: 1 D-01 fire chat-side prior cycle for cc-0006 apply. Cumulative T-MCP-02: 52 → 53. Cumulative T-MCP-08: 2 (unchanged). State-capture exceptions v2.57: **0**.

**Fire ledger this cycle:**
- Fire #1 (cc-0006 D-01, review_id pending close-the-loop capture): action_type **`cron_edit`** (first use in cc-NNNN series). Verdict agree / proceed / risk=medium / confidence=high. 0 pushback. 0 escalation. Clean approve. Conditions: re-run final read-only verification immediately before apply (PASSED — no drift); halt if any job missing/inactive/already-has-timeout/md5-divergent (NOT triggered); use exact cc-0006 SQL from packet (USED VERBATIM); apply only after PK explicit phrase (RECEIVED); after apply run V1–V4 (DONE — V1+V2+V3 PASS strictly, V4 PASS load-bearing); commit result file (DONE — commit `c72bc327`).

**Close-the-loop UPDATEs to `m.chatgpt_review`:** v2.57 adds 1 more (cumulative ~27+ pending). Carried as P3 backlog. **Deferred this turn per PK explicit "no Supabase writes" scope.** v2.55 (cc-0003 v2) + v2.56 (cc-0004) close-the-loops also still pending.

---

## 🤖 Cowork automation (D182)

**v2.57 status (carry from v2.54/v2.55/v2.56):** `docs/briefs/morning-inbox-sweep-v1.md` committed status=draft per PK hold. NOT scheduled in Cowork until PK amends and flips status=review_required.

**Existing Cowork status (unchanged):** Weekly reconciliation Mon 7am AEST + ICE Nightly Health Check daily 02:00 AEST. `docs/audit/health/2026-05-06.md` still absent — carry as P3 follow-up.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults + M5–M8 reconciliation | P1 TOP (v2.56) | S30 cleared v2.47; M6 Phase A closed v2.55; M6 Phase B closed v2.56; M7 + M8 + defaults pending | PK | Review §11.4 items 3–9; confirm defaults via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. |
| **AI cost view** (carry from v2.49) | `vw_ai_cost_monthly` view on `m.ai_job` + NOW dashboard tile | P3 → Top 2 (carry from v2.55) | Backlog | chat → next session | Author view DDL (read-only); add NOW dashboard tile. ~1h estimate. |
| **cc-0005 / M8 Path A v3 — APPLY scheduling** | Apply Path A v3 cutover (cron 48 in-place rewrite + legacy-origin future cleanup + function deprecation) | P3 → Top 3 (rephrased v2.57) | Brief PATCHED to v3 (commit `245005a3`, blob `2284ef2d`, 75,985 B). v2 Path A (`f70cb41f`) superseded due to 5 critical regex bugs (C1–C5) caught in chat review. v3 also adds H1–H6 + M1–M4 + L1–L2 fixes. **NOT YET APPLIED.** | PK → chat OR CC | PK directs whether to schedule apply session (chat-driven via Supabase MCP OR CC-driven per brief-runner-v0). Apply gates remaining: §1.5d alignment count = 0 (HALT §8.2.l if non-zero) + §1.5c PK direction on un-publishable legacy draft cohort + D-01 fire + PK explicit approval phrase. |
| **HTTP 401 5-min cron triage** | 3 HTTP 401 responses in 30-min window on `*/5` schedule observed during cc-0006 V4 (likely jobid 48 `enqueue-publish-queue-every-5m` or another 5-min cron) | P3 (NEW v2.57) | OBSERVED, not a regression (stable across cc-0006 apply boundary) | PK → chat | Read-only triage if PK directs. Step 1: identify the 5-min cron whose endpoint returns 401. Step 2: classify whether it's an auth issue, an expected-401 endpoint, or a legitimate fix needed. Step 3: separate cc-NNNN brief if fix is required. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** (carry, security) | Cron jobid 58 has secret hardcoded inline; cc-0006 deliberately preserved character-for-character | P2 (security) | OPEN — cc-0006 did NOT touch risk profile | chat → future session (PK approval required for rotation) | PK to authorise secret rotation + vault entry creation + cron command refactor. Separate cc-NNNN brief required. |
| **F-YT-PUB-AVATAR-EXCLUSION** (carry from v2.53) | youtube-publisher `.in()` filter excludes `video_short_avatar` | P3 | LOGGED, no chat action | chat → future (passive) | Validator: any future NY×YT or PP×YT slot where advisor picks `video_short_avatar`. |
| **morning-inbox-sweep-v1 brief amendment** (carry from v2.51) | PK personal-email morning triage | P3 | DRAFT exists at `docs/briefs/morning-inbox-sweep-v1.md` (status=draft) | PK → chat | PK reviews + proposes amendments; chat applies + flips status=review_required. |
| **NEW v2.56 P3 backlog observation** | 1 LinkedIn queue row (`1a21199e-...`) was in queue with `pd.approval_status='draft'` (cc-0004 P3.3 outlier; queue dead-lettered, draft itself unchanged) | P3 | LOGGED, no chat action | chat → future (passive) | Investigation deferred. Pattern: investigate how the row reached the queue in 'draft' status (likely manual or pre-M4 path). |
| **Dashboard mobile responsiveness — system-wide** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session OR Phase 1+ | Either dedicated session OR roll into architecture review Phase 1+ build sequence. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock readiness | P3 | OBSERVED | chat → T05 unblock session | Plan cap-throttle / rate-limit handling. |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | Investigate downstream pathway. |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check; rename if appropriate. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates in `11_final_consolidation.md` §11.1 | chat → future session | Update `00_overview.md`. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 | chat → Phase 2 session | After Phase 0 + Phase 1: bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45 → v2.57 (**13th deferral**) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |
| **F-CRON-COMPLIANCE-MONITOR-STALE** (carry) | cron jobid 31 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Decide: re-author repo source OR retire deployed slug + cron. |
| **F-CRON-INGEST-STALE** (carry) | cron jobid 1 calls deployed `ingest-v8-youtube-channel`; folder absent | P2 | LOGGED | PK → future session | Same shape as compliance-monitor. |
| **F-CRON-PIPELINE-AI-SUMMARY-STALE** (carry) | cron jobid 30 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PIPELINE-DOCTOR-STALE** (carry) | cron jobids 29 + 39 call deployed slug; folder absent. **NOT** a rename of `pipeline-diagnostician`. | P2 | LOGGED | PK → future session | Same shape. |
| **Music library activation checklist** (carry) | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK ACTION | PK | PK to action when music tracks are ready. |
| **Emergency redeploy governance question** (carry) | Should bounded production-restoration require expedited D-01? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules; chat documents in `docs/06_decisions.md`. |

**Closed v2.57:** **F-CRON-PG-NET-TIMEOUT-5S (P2)** — cc-0006 APPLIED via Supabase MCP `execute_sql` (commit `c72bc327`). Jobs 33/44/58 patched with `timeout_milliseconds := 30000`. V1+V2+V3 PASS strictly; V4 PASS for load-bearing "no regression in `timed_out`" criterion. 3 pre-existing background HTTP 401s on `*/5` schedule (stable across apply boundary) — NOT a regression; logged as separate triage candidate. No rollback. Job 58's inline `x-auto-approver-key` value preserved character-for-character — F-CRON-AUTO-APPROVER-SECRET-INLINE remains separately OPEN.

**Closed v2.56:** M6 Phase B (P1) — cc-0004 commit `9d5bdd37`.
**Closed v2.55:** M6 Phase A (P1) — cc-0003 v2 commit `d60dcfbc`.
**Closed v2.54:** video-worker `verify_jwt` durable fix (P3) — landed via `supabase/config.toml`.
**Closed v2.53:** F-YT-NY-FORMAT-SELECTION P1 (commit `1ccfe9a2`).
**Closed v2.52:** insights-worker P1 functional drift; F-HEYGEN-RPC-MIGRATIONS-MISSING; F-INSIGHTS-RPC-MIGRATIONS-MISSING.
**Closed v2.50:** P1 SECURITY-DEFINER triage.
**Closed v2.49:** F-EF-DRIFT-PREVENTION Stage 3.
**Closed v2.48:** Stage 2b dashboard drift panel.
**Closed v2.47:** S30.
**Closed v2.46:** Dashboard Architecture Review of 2026-05.
**Closed v2.44:** F-EF-DRIFT-PREVENTION Stage 2a finalisation.
**Closed v2.43:** bef6be96 origin investigation.
**Closed v2.41:** F-EF-DRIFT-PREVENTION Stage 1.
**Closed v2.40:** F-EF-DRIFT-PREVENTION investigation phase.

---

## 💼 Personal businesses

**v2.57 carry from v2.55/v2.56 (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK called CD on 2026-05-08; at least one invoice refund verbally confirmed in progress. Remaining clean-up still PK to action manually:
  1. Cancel Website Builder auto-renewal (saves ~$251/yr ongoing)
  2. Disable Premium DNS auto-renewal (saves $26/yr; move DNS to Cloudflare — free)
  3. Disable Domain Guard on .com auto-renewal (saves $9/yr)
  4. Before Nov 2026: transfer invegent.com to Cloudflare Registrar (~A$15/yr); transfer invegent.com.au to VentraIP or similar (~A$25–35/yr).
  5. Decline the $521/3yr renewal quote from CD.

  **Total annual saving once cleaned up: ~A$286/yr ongoing. Three-year saving: ~A$860.**

  Not chat scope — PK actions manually. Re-check status next session.

*(no other items flagged at v2.57 close — standing P0 to ask at next session start.)*

---

## 📌 Backlog

**v2.57 changes**:

- **CLOSED v2.57**: F-CRON-PG-NET-TIMEOUT-5S P2 (cc-0006; commit `c72bc327`).
- **PROMOTED v2.57**: HTTP 401 5-min cron triage → Top 4 next session priority + Active table P3 row. NEW finding surfaced during cc-0006 V4 (3 responses in 30-min window on `*/5` schedule; not a regression; out-of-scope for cc-0006). Likely candidates: jobid 48 `enqueue-publish-queue-every-5m` or another 5-min cron whose endpoint returns 401.
- **REPHRASED v2.57**: cc-0005 / M8 cutover Active row — brief patched to v3 (commit `245005a3`); supersedes v2 Path A (`f70cb41f`) which had 5 critical regex bugs (substring matches against `get_next_scheduled_for` would have matched comment text in rewritten cron 48 body and fired V8/V10 RAISE EXCEPTION). v3 fixes regex (function-call syntax) + comment rephrase + H1–H6 (P1.5b distinct created_by, P1.5c un-publishable cohort, P1.5d alignment HALT §8.2.l, §1.4b ORIGINAL_COMMENT capture) + M1–M4 hygiene + L1–L2 defensive. **NOT YET APPLIED.** Apply gates remaining: §1.5d alignment=0 + §1.5c PK direction + D-01 + PK approval.
- **CARRIED v2.57**: Dashboard roadmap PHASES — **13th** consecutive deferral (was 12th in v2.56).
- **CARRIED v2.57**: 3 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 D-01 fires).
- **CARRIED v2.57**: 4× v2.54 P2 cron findings (F-CRON-COMPLIANCE-MONITOR-STALE, F-CRON-INGEST-STALE, F-CRON-PIPELINE-AI-SUMMARY-STALE, F-CRON-PIPELINE-DOCTOR-STALE).
- **CARRIED v2.57**: F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec) — cc-0006 deliberately did NOT touch this finding; risk profile UNCHANGED. PK auth required.
- **NEW v2.57 LESSON CANDIDATES**: L10–L18 from cc-0006 + cc-0005 v3 cycles. Promotion to canonical or baseline after one more vindication each.
- **CARRIED v2.57**: All v2.55/v2.56 items unchanged except F-CRON-PG-NET-TIMEOUT-5S closure, cc-0005 v3 patch landed, HTTP 401 triage added.

**v2.55 + v2.56 + earlier changes**: per prior changelog.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Unchanged from v2.56 except:
- **Lesson #61** (P1–P5 must be empirically verified, not theoretically assumed) — reinforced again by L15 (chat review pass before apply) and L17 (in-place patching pattern) this cycle. **Promotion to canonical recommended.**
- **Lesson #62 v2.50 refinement** — not exercised this cycle.

---

## v2.57 honest limitations

- All v2.31–v2.56 limitations apply.
- **Memory at 30-edit cap pre-session** (carry). v2.57 update DEFERRED per PK explicit scope (no memory edit this turn). Memory `recent_updates` v2.54 entry remains canonical until next chat-owned memory update opportunity (will need to reflect v2.55 + v2.56 + v2.57 closures in a single rolling entry).
- **Dashboard roadmap PHASES still stale** — **13th** consecutive deferral. Risk unchanged.
- **~27+ close-the-loop UPDATEs to `m.chatgpt_review`** still pending — v2.57 adds 1 (cc-0006 D-01 fire); v2.55 + v2.56 each added 1; cumulative pending ~27+. All deferred per PK "no Supabase writes" scope across v2.55/v2.56/v2.57.
- **cc-0003 v2 + cc-0004 + cc-0006 D-01 review_ids not captured in 4-way sync files**. Will surface when close-the-loop UPDATEs are fired (chat session log holds the values).
- **Sync state file size**: ~25KB at v2.57 close (was ~24KB at v2.56). Archive sweep **OVERDUE** since the 16KB threshold was crossed at v2.54; deferred.
- **cc-0005 v3 brief is NOT YET APPLIED.** Apply gates remaining: §1.5d alignment=0 + §1.5c PK direction on un-publishable legacy draft cohort + D-01 fire + PK approval. v3 supersedes v2 Path A (`f70cb41f`) due to 5 critical regex bugs caught in chat review pass; in-place patch preserved brief identifier + migration name (`m8_atomic_cutover_v1`) since v2 was never applied.
- **No D-01 fire for the v2.57 4-way sync close commit** — doc-only, no production state touch. Documented in protocol notes above.
- **No D-01 fire for cc-0005 v3 patch** — doc-only patch, prior turn. Will require D-01 at apply time when scheduled.
- **HTTP 401 5-min cron pattern** — surfaced as triage candidate; not yet investigated. Could be: legitimate auth issue requiring fix; expected behaviour from a cron that returns 401 deliberately; misconfiguration. Read-only triage to identify the 5-min cron source is the next step.
- **cc-0006 P2 closure was within budget but should NOT be confused with addressing F-CRON-AUTO-APPROVER-SECRET-INLINE** — cc-0006 deliberately preserved job 58's inline secret. Rotation requires PK auth and is a separate effort.

---

## Changelog

- v1.0–v2.56: per previous changelog.
- **v2.57 (2026-05-09 Sydney, F-CRON-PG-NET-TIMEOUT-5S closure via cc-0006 APPLIED + cc-0005 / M8 Path A v3 PATCHED chat-side):**
  - **F-CRON-PG-NET-TIMEOUT-5S CLOSED** — cc-0006 APPLIED via Supabase MCP `execute_sql` by CC. Logical migration `cron_pg_net_timeout_30s_v1` on project `mbkmaxqhsohbtwsqolns`. Single transaction wrapping three `cron.alter_job(...)` statements. `execute_sql` return `[{"alter_job": ""}]` (transaction committed). Jobs 33 (`video-worker-every-30min`), 44 (`heygen-worker-every-30min`), 58 (`auto-approver-sweep`) each patched with `timeout_milliseconds := 30000`. Each command grew by exactly 35 bytes. URLs/headers/body/schedule/active flag byte-for-byte preserved per job. Job 58's inline `x-auto-approver-key` value `DfMs_7SfmGnQA.B` preserved character-for-character. V1+V2+V3 PASS strictly; V4 PASS for load-bearing "no regression in `timed_out`" criterion. No rollback. Result file commit `c72bc3276b7575c0c920b75c76ead396dbaa6a95` (blob `9613c133`, 11,188 B).
  - **First `cron_edit` D-01 action_type** in cc-NNNN series. Reviewer applied same standards as `sql_destructive` despite zero data-state impact.
  - **HTTP 401 5-min cron pattern surfaced as new triage candidate** — 3 HTTP 401 responses in 30-min `_http_response` window during cc-0006 V4 (02:20, 02:25, 02:35 UTC); pattern matches `*/5` cron schedule. NOT a regression introduced by cc-0006 (stable across apply boundary). Out-of-scope for cc-0006. Likely candidates: jobid 48 `enqueue-publish-queue-every-5m` or another 5-min cron whose endpoint returns 401. Logged for separate triage.
  - **F-CRON-AUTO-APPROVER-SECRET-INLINE remains separately OPEN (P2 sec)** — cc-0006 deliberately preserved job 58's inline secret. Rotation requires PK auth + vault entry creation + cron command refactor (separate cc-NNNN brief).
  - **cc-0005 / M8 Path A v3 PATCHED chat-side** under PK direction (commit `245005a3c86dc23cac8bd6cae41fea5fd135e5f9`, blob `2284ef2dd9297fc7685d9819910d5b31bba636be`, 75,985 B). Supersedes v2 Path A (`f70cb41f`) which had 5 critical regex bugs (C1–C5) that would have blocked first apply at the in-migration verify gates V8 and V10. The bugs: substring matches against `get_next_scheduled_for` would have matched comment text in the rewritten cron 48 command body, fired RAISE EXCEPTION, and rolled back the transaction before Component 2 + Component 3 could run.
  - **v3 critical fixes:** all 11 ILIKE/substring call sites replaced with function-call-syntax regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('`. Pattern correctly distinguishes function calls from comment-mentions, AND covers both the original name and the post-rename deprecated name. Belt-and-braces comment rephrase: new cron 48 command body comment changed to "legacy fallback removed from COALESCE chain." — substring `get_next_scheduled_for` no longer present in rewritten cron body.
  - **v3 H1–H6 extended pre-flight:** §1.4b original COMMENT capture for rollback (H6); §1.5 P1.5b distinct `pd.created_by` enumeration (H3); §1.5 P1.5c un-publishable legacy draft cohort query (H4, informational); §1.5 P1.5d slot-driven alignment check (H5, **HALT §8.2.l if non-zero**).
  - **v3 M1–M4 hygiene:** §8.3 unique dollar-quote tag guidance (M1); §Forbidden actions amendment list expanded from 2 items to 4 (M2); removed unused `v_min_expected` variable (M3); TOCTOU acknowledgement in §3 Notes (M4).
  - **v3 L1–L2 defensive:** §1.2 trigger query expanded to also survey `m.post_draft / slot / ai_job / post_publish` (L1); §1.3 explicit `OLD_CRON_48_SCHEDULE` capture and §7 V7 expanded to verify schedule unchanged (L2).
  - **Brief now ready for pre-flight gating; NOT YET APPLIED.** Apply gates remaining: §1.0 sequencing (✅ met v2.55/v2.56) + §1.4 caller check + §1.3 cron state + §1.5d alignment count = 0 + §1.5c PK direction on un-publishable cohort + D-01 fire + PK approval.
  - **D-01 fire** — 1 cc-0006 fire (prior cycle by chat), action_type `cron_edit`. Verdict agree / proceed / risk=medium / confidence=high. 0 pushback. 0 escalation. Clean approve. cc-0005 v3 patch (prior turn by chat) is doc-only and did NOT require a fire. v2.57 4-way sync close (this) is doc-only and per protocol does NOT require a fire.
  - **PK explicit approval phrase received** for cc-0006 apply: `"pk - proceed with cc-0006 apply"`.
  - **Brief-runner-v0 lesson candidates** — L10–L14 from cc-0006 cycle (cron_edit action_type, md5 fingerprint, substrate-drift guard, V3 immediate eval, V4 strict-vs-load-bearing); L15–L18 from cc-0005 v3 (review pass before apply, function-call regex, in-place patching, pre-flight cohort surfacing). Promotion to canonical or baseline after one more vindication each.
  - **State-capture exception count v2.57: 0**.
  - **Closure budget**: ~30 min chat 4-way sync close. Trailing-14-day ~60h above 8.0 floor. ~2 P0+P1 open of 20 cap (unchanged from v2.56; cc-0006 was P2).
  - **0 production mutations chat-side this turn** — 4-way sync close is doc-only. Production mutations in this 2-cycle window were the cc-0006 `execute_sql` call by CC (separate session, prior cycle) and the cc-0005 v3 patch chat commit (doc-only, prior turn).
  - **STANDING_THREE array unchanged**. `m.ef_drift_log` untouched. No cron edits this turn. No EF deploys. No code changes. No Phase 0 scheduling.
  - **Acceptance-integrity adherence** (v2.50): cc-0006 result file commit `c72bc327` verified by re-fetching landed file content via Invegent GitHub MCP — blob `9613c133`, 11,188 B; md5 deltas + V1–V4 verification table + D-01 conditions all present. cc-0005 v3 patch commit `245005a3` verified by re-fetching landed file content — blob `2284ef2d`, 75,985 B; all 13 v3 fix categories verified present in landed file.
  - **Deferred per PK explicit scope this turn**: memory `recent_updates` v2.55 + v2.56 + v2.57 entries; 3 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 D-01 fires); dashboard PHASES update (**13th** carry); cc-0005 v3 apply work (awaiting PK direction); HTTP 401 5-min cron triage (awaiting PK direction); Phase 0 scheduling (carry from v2.56).
  - **Carried**: Crazy Domains refund follow-up (Personal businesses); morning-inbox-sweep-v1 brief amendment (P3); 4 P2 cron findings from v2.54.
