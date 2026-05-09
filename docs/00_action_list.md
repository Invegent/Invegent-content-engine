# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-09 Sydney (**v2.58 — F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT CLOSED / RECOVERED via cc-0007 APPLIED** by CC. Repo patch `supabase/config.toml` `[functions.ai-worker] verify_jwt = false` (commit `5037e573`) + EF deploy `supabase functions deploy ai-worker --no-verify-jwt` (exit=0 at 04:23:27Z). Recovery confirmed at first post-deploy cron 5 fire 04:25:00Z; status_code=200; pattern transition unambiguous: 22+ × 401 pre-deploy → 200 immediately post-deploy. V1–V4 all PASS at first fire. No rollback. **First `ef_deploy` D-01 action_type in cc-NNNN series.** Class match to v2.54 video-worker regression (commit `6ed29bbc`); 2-step recovery pattern (config.toml entry + `--no-verify-jwt` deploy) now vindicated twice across distinct EFs. Result file commit `411b85ee` (blob `b21be653`, 11,401 B). HTTP 401 5-min cron triage candidate from v2.57 CLOSED (jobid 5 was the source; cc-0006's earlier hypothesis of jobid 48 corrected by CC's read-only triage 2026-05-09). Latent risk noted (NOT closed): publisher block remains ABSENT from `supabase/config.toml`; carried as v2.58 P3 follow-up. **cc-0005 M8a is the next pipeline-integrity apply candidate per PK directive.** Brief-runner-v0 L22–L25 vindicated (`ef_deploy` action_type, repo+deploy coordination, P1 recovery timing, security hygiene in result files); L23 logged but rollback path not exercised. Inline post-v2.57 work (cc-0005 v4 patch commit `577d8568`; cc-0007 brief draft commit `7c45a927`; Platform Reconciliation View brief candidate commit `a8a241d1`) folded into v2.58 close. Closed v2.58: F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1). Previous (v2.57): F-CRON-PG-NET-TIMEOUT-5S CLOSED via cc-0006 APPLIED + cc-0005 / M8 Path A v3 PATCHED.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump that touches production state goes through ChatGPT cross-check before deploy/commit. **v2.58 application**: 1 D-01 fire chat-side prior cycle for cc-0007 apply (clean PASS / agree / proceed / 0 pushback / 0 escalation; **first `ef_deploy` action_type in cc-NNNN series**). v2.58 4-way sync close commit (this) is doc-only and per protocol does not require a fire. Inline post-v2.57 doc-only commits (cc-0005 v4 patch, cc-0007 brief draft, Platform Reconciliation View brief candidate, action_list reconciliation `a8a241d1`) all doc-only and per protocol did not require fires.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is approved target design. All stages CLOSED. **v2.58 application**: no drift fires this session (cc-0007 EF deploy logged in `m.ef_drift_log` as expected ai-worker entry; V4 PASS).

**STANDING RULE (Lesson #62, v2.41 + v2.50 refinement)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override. **v2.58 application**: D-01 fire for cc-0007 returned clean agree / 0 pushback / 0 escalation; rule not exercised.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time**.

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery is now the default brief pattern for any CC dashboard/portal/web/script work.

**STANDING RULE (v2.50 — Acceptance integrity)**: Acceptance is not complete until the actual review artifact is received and reviewed. **v2.58 application**: cc-0007 result file commit `411b85ee` verified by re-fetching landed file content via Invegent GitHub MCP — blob `b21be653`, size 11,401 B; V1–V4 verification table + D-01 conditions + bearer-token redaction + brief-runner-v0 §9 observations all present. cc-0007 repo patch commit `5037e573` verified by re-fetching landed `supabase/config.toml` content — blob `3d98d88f`, 4,496 B; `[functions.ai-worker] verify_jwt = false` block present at end of custom-header section; section count comments updated 23→24 / 10→11; all other entries preserved verbatim.

**STANDING RULE (v2.55 — brief-runner-v0 baseline patterns from cc-0003 cycle)**: L1–L4 are baseline:
- **L1 HALT mechanism is load-bearing.**
- **L2 doc-only patch → re-execution loop.**
- **L3 result-file preservation.**
- **L4 pre-state baseline pattern is now required.**

**v2.56 ADDITION**: **L6 (cross-brief patch propagation when invariant fails) is now baseline.**

**v2.57 ADDITIONS (candidates from cc-0006 + cc-0005 v3 cycles, promotion after one more vindication each):** L10–L18.

**v2.58 ADDITIONS (candidates from cc-0007 cycle, promotion after one more vindication each):**
- **L22** `ef_deploy` D-01 action_type — **VINDICATED** by cc-0007. Reviewer applied appropriate standards (same as `sql_destructive`); clean PASS / agree / proceed / 0 pushback / 0 escalation. Cousin to L10 (`cron_edit`); both proven robust.
- **L23** repo + deploy coordination rollback shape — **LOGGED** by cc-0007. cc-0007 was first apply with TWO production-touching steps: (a) `git push` of `supabase/config.toml`, (b) `supabase functions deploy`. Both succeeded; rollback shape (git revert + redeploy without flag) was prepared but NOT exercised. Pattern is durable but not yet vindicated through actual rollback.
- **L24** P1 recovery timing — **LOGGED** by cc-0007. Wall-clock ~1h55m brief→closure including D-01 fire + final re-verify + repo patch + deploy + V1–V4 + result file authoring. P1 cost-of-waiting honoured without expediting D-01 protocol.
- **L25** security hygiene in result files — **VINDICATED** by cc-0007. Bearer tokens / vault values successfully redacted from result file; only structural references (`vault.decrypted_secrets WHERE name='X'`) appear. Pattern is now standard for any brief touching authentication-related cron commands.

**v2.58 vindications of prior candidates:**
- **L10** `cron_edit` action_type — vindicated again indirectly (sibling `ef_deploy` action_type also clean). Promotion to baseline candidate next cycle.
- **L17** in-place patching pattern — vindicated again by cc-0005 v4 (in-place supersedes v3 since v3 was never applied). Promotion to baseline candidate next cycle.

**v2.57 promotion candidates (carry-forward, after one more vindication each):** L5, L7, L8, L9.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~2 (was ~3 v2.57; cc-0007 P1 closed v2.58) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~62h (carry from v2.57 + ~2h cc-0007 cycle + ~30m sync close) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This v2.58 4-way sync close: ~30 min** (read 3 docs + cc-0007 result file + supabase/config.toml verification + author 3 doc files + acceptance integrity verify).

**State-capture exception count v2.58: 0** (cc-0007 D-01 fire returned clean agree; no escalation, no override).

---

## ⭐ Today / Next 5 — REBUILT v2.58

> **Last rebuilt:** 2026-05-09 Sydney (v2.58).
> **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT CLOSED v2.58 (P1).** cc-0007 repo patch + EF deploy applied; V1–V4 PASS. ai-worker now generating drafts; pipeline starvation cleared. **cc-0005 M8a is the next pipeline-integrity apply candidate per PK directive.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Dashboard Architecture Review Phase 0 prerequisites** | **P1 TOP** | Unchanged from v2.55/v2.56/v2.57. M6 Phase A + B closed; M7 (doc-only) + M8 (cc-0005 v4 patched, awaiting apply) still pending. | PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. |
| 2 | **cc-0005 / M8 Path A v4 — APPLY scheduling** | **P3 (PK direction required; PROMOTED v2.58)** | **cc-0007 closure clears the P1 ai-worker block** — ai-worker is now generating drafts; m.ai_job rows being processed; cron 48 has fresh succeeded ai_jobs to enqueue from. cc-0005 M8a v4 (commit `577d8568`) is now the next pipeline-integrity apply candidate per PK directive. | PK directs whether to schedule apply session (chat-driven via Supabase MCP OR CC-driven per brief-runner-v0). v4 apply gates: §1.0 sequencing ✅ MET v2.55/v2.56 + §1.4 expected 3 callers + §1.3 cron state + §1.5a band [250, 500] + §1.5d alignment count = 0 + D-01 fire (`sql_destructive` action_type for migration) + PK explicit approval phrase. |
| 3 | **AI cost view** | P3 quick win | Unchanged. ~1h estimate. | Author `vw_ai_cost_monthly` on `m.ai_job` (read-only DDL) + add NOW dashboard tile. |
| 4 | **Publisher latent config risk follow-up** | **P3 (NEW v2.58)** | cc-0007 §1.4 surfaced publisher block ABSENT from `supabase/config.toml`. Currently 0 × 401 (gateway presumably already at `verify_jwt: false`), but next publisher deploy without flag AND without config.toml entry would regress identically. | Doc-only patch adding `[functions.publisher] verify_jwt = false` to `supabase/config.toml`. No deploy required (publisher currently working). PK directs scheduling. ~5 min. |
| 5 | **Personal businesses check-in** | P0 standing | Carry. | PK reports any time-sensitive items + Crazy Domains clean-up status. |

**Carry-forward unchanged from v2.57 except v2.58 deltas (cc-0007 closure, cc-0005 promoted to rank 2, publisher latent config risk added at rank 4).**

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (unchanged from v2.55)

All stages CLOSED. Cron jobid 80 + 81 active=true. No drift fires this cycle (cc-0007 EF deploy logged in `m.ef_drift_log` as expected ai-worker entry; V4 PASS).

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`.

**v2.58 update on hard blockers:**
- ✅ S30 cleared v2.47 — first hard blocker DONE.
- 🔲 M5–M8 reconciliation — partial progress: M6 Phase A **CLOSED v2.55**; M6 Phase B **CLOSED v2.56**. M7 (doc-only) + M8 (cc-0005 v4 patched, awaiting apply) still pending.
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override (cc-0001 result file in place).

**Phase 0 still gated. Remains Top-1 next session priority v2.58.**

---

## 🟢 Tier 1 + M4 + M5 + M6 Phase A + M6 Phase B queue integrity & stability remediation — STATUS BLOCK

**v2.58 update:**
- M1 + M2 + M3 — CLOSED 2026-05-05
- M4 — CLOSED 2026-05-05
- M5 — CLOSED 2026-05-05
- **M6 Phase A — CLOSED v2.55** via cc-0003 v2 (commit `d60dcfbc`, 9 rows)
- **M6 Phase B — CLOSED v2.56** via cc-0004 (commit `9d5bdd37`, 43 rows)
- **M6 dead-letter cycle: COMPLETE.** Total 52 residual rows cleared.
- **M7 closure — PENDING (folds into cc-0005 / M8 4-way sync per reconciliation §6 Q2; doc-only)**
- **M8 atomic cutover — cc-0005 v4 PATCHED** (M8 staged → M8a only; commit `577d8568`, blob `96567ddd`, 80,912 B). v3's Component 3 (function rename + COMMENT) deferred to M8b separate brief after CC's v3 pre-flight HALT surfaced 2 non-cron manual callers of `public.get_next_scheduled_for`. v4 retains Component 1 (cron 48 in-place rewrite) + Component 2 (legacy cleanup, count band re-banded to [250, 500] around CC's pre-flight observation of 344). M8b is a separate cc-NNNN brief reserved for: remediate 2 manual callers → re-verify zero callers → ALTER FUNCTION RENAME + COMMENT. M8b NOT YET AUTHORED. Also separate follow-up: 94-row un-publishable legacy draft cohort (out of M8a/M8b scope). **NOT YET APPLIED. cc-0005 M8a is now the next pipeline-integrity apply candidate per PK directive (v2.58).**

---

## 🟢 Platform Reconciliation View — BRIEF CANDIDATE STATUS BLOCK (added inline post-v2.57, 2026-05-09; unchanged v2.58)

**Status:** brief candidate — NOT yet authored. Reserved as cc-NNNN; promotes to numbered brief when scheduled.

**v2.58 sequencing update:** cc-0007 closure (v2.58) satisfies the **first** of three blockers. Remaining: **cc-0005 M8a closure** (next apply candidate per PK directive); **current pipeline-integrity closure work** (M8b deferred separate brief; 94-row un-publishable legacy draft cohort separate follow-up; M5–M8 reconciliation residual). **Implementation NOT to start now per PK explicit direction.**

13 seed manual observations + scope + brief shape sketch + open dependencies preserved verbatim from inline post-v2.57 addition (commit `a8a241d1`). See full block in commit `a8a241d1` if needed; not duplicated here to keep file size bounded.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.54.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 54 cumulative; close-the-loop ~28+ pending; 4 cc-NNNN reviews pending close-the-loop)

**v2.58 application**: 1 D-01 fire chat-side prior cycle for cc-0007 apply. Cumulative T-MCP-02: 53 → 54. Cumulative T-MCP-08: 2 (unchanged). State-capture exceptions v2.58: **0**.

**Fire ledger this cycle:**
- Fire #1 (cc-0007 D-01, review_id pending close-the-loop capture): action_type **`ef_deploy`** (**first use in cc-NNNN series**). Verdict agree / proceed / risk ≤ medium / confidence high. 0 pushback. 0 escalation. Clean approve. Conditions: re-run final read-only verification immediately before apply (PASSED — no drift); halt if ai-worker self-resolves OR config already correct OR 401 pattern absent (NOT triggered); patch only `supabase/config.toml` adding `[functions.ai-worker] verify_jwt = false` (DONE — commit `5037e573`); commit repo patch (DONE); deploy only `supabase functions deploy ai-worker --no-verify-jwt` (DONE — exit=0); after deploy run V1–V4 (DONE — all PASS at first fire); redact bearer tokens / keys from result file (DONE — only structural references in result file); rollback only if verification fails (NOT TRIGGERED).

**Inline post-v2.57: 0 D-01 fires** (cc-0005 v4 patch + cc-0007 brief draft + Platform Reconciliation View candidate + action_list reconciliation `a8a241d1` are all doc-only).

**Close-the-loop UPDATEs to `m.chatgpt_review`:** v2.58 adds 1 more (cumulative ~28+ pending). **4 cc-NNNN reviews pending close-the-loop** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007). Carried as P3 backlog. **Deferred this turn per PK explicit "no Supabase writes" scope.** v2.55 (cc-0003 v2) + v2.56 (cc-0004) + v2.57 (cc-0006) close-the-loops also still pending.

---

## 🤖 Cowork automation (D182)

**v2.58 status (carry from v2.54/v2.55/v2.56/v2.57):** `docs/briefs/morning-inbox-sweep-v1.md` committed status=draft per PK hold. NOT scheduled in Cowork until PK amends and flips status=review_required.

**Existing Cowork status (unchanged):** Weekly reconciliation Mon 7am AEST + ICE Nightly Health Check daily 02:00 AEST. `docs/audit/health/2026-05-06.md` still absent — carry as P3 follow-up.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults + M5–M8 reconciliation | P1 TOP | S30 cleared v2.47; M6 Phase A closed v2.55; M6 Phase B closed v2.56; M7 + M8 + defaults pending | PK | Review §11.4 items 3–9; confirm defaults via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. |
| **cc-0005 / M8 Path A v4 — APPLY scheduling** | Apply Path A v4 cutover (cron 48 in-place rewrite + legacy-origin future cleanup; M8a only; Component 3 deferred to M8b) | **P3 (PK direction required); PROMOTED to rank 2 v2.58** | Brief PATCHED to v4 inline post-v2.57 (commit `577d8568`, blob `96567ddd`, 80,912 B). M8 staged → M8a only after CC v3 pre-flight HALT surfaced 2 non-cron manual callers. **NOT YET APPLIED.** **cc-0007 closure clears the P1 ai-worker block; cc-0005 M8a is now the next pipeline-integrity apply candidate per PK directive.** | PK → chat OR CC | PK directs whether to schedule apply session (chat-driven via Supabase MCP OR CC-driven per brief-runner-v0). v4 apply gates: §1.0 sequencing ✅ MET v2.55/v2.56 + §1.4 expected 3 callers + §1.3 cron state + §1.5a band [250, 500] + §1.5d alignment count = 0 + D-01 fire (`sql_destructive` action_type for migration) + PK explicit approval phrase. M8b is a separate cc-NNNN brief reserved for manual caller remediation + function deprecation — NOT YET AUTHORED. |
| **AI cost view** (carry from v2.49) | `vw_ai_cost_monthly` view on `m.ai_job` + NOW dashboard tile | P3 → Top 3 (carry from v2.55) | Backlog | chat → next session | Author view DDL (read-only); add NOW dashboard tile. ~1h estimate. |
| **Publisher latent config risk follow-up** | Doc-only patch adding `[functions.publisher] verify_jwt = false` to `supabase/config.toml` | **P3 (NEW v2.58)** | cc-0007 §1.4 surfaced; defensive patch held back per strict rule + D-01 conditions. Currently 0 × 401 (gateway presumably already at correct setting), but next publisher deploy without flag AND config.toml entry would regress identically. | chat → next session | Single-file commit to `supabase/config.toml` adding `[functions.publisher] verify_jwt = false`. NO deploy required (publisher currently working). ~5 min. PK directs scheduling. |
| **Platform Reconciliation View — BRIEF CANDIDATE** | by day / client / platform reconciliation surface; pipeline observability (NOT cosmetic dashboard) | **P2** | OBSERVATION-stage; brief NOT YET AUTHORED. 13 seed manual observations 2026-05-09 captured in dedicated 🟢 status block. **v2.58 update: cc-0007 closure satisfies first blocker.** | PK → chat → future session | **Queued behind:** ~~(1) cc-0007 ai-worker 401 recovery~~ **CLOSED v2.58**, (2) cc-0005 M8a, (3) current pipeline-integrity closure work. PK explicit "do not start implementation now" 2026-05-09 still standing. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** (carry, security) | Cron jobid 58 has secret hardcoded inline; cc-0006 deliberately preserved character-for-character | P2 (security) | OPEN — unchanged v2.58 | chat → future session (PK approval required for rotation) | PK to authorise secret rotation + vault entry creation + cron command refactor. Separate cc-NNNN brief required. |
| **F-YT-PUB-AVATAR-EXCLUSION** (carry from v2.53) | youtube-publisher `.in()` filter excludes `video_short_avatar` | P3 | LOGGED, no chat action | chat → future (passive) | Validator: any future NY×YT or PP×YT slot where advisor picks `video_short_avatar`. |
| **morning-inbox-sweep-v1 brief amendment** (carry from v2.51) | PK personal-email morning triage | P3 | DRAFT exists at `docs/briefs/morning-inbox-sweep-v1.md` (status=draft) | PK → chat | PK reviews + proposes amendments; chat applies + flips status=review_required. |
| **NEW v2.56 P3 backlog observation** | 1 LinkedIn queue row (`1a21199e-...`) was in queue with `pd.approval_status='draft'` (cc-0004 P3.3 outlier; queue dead-lettered, draft itself unchanged) | P3 | LOGGED, no chat action | chat → future (passive) | Investigation deferred. |
| **Dashboard mobile responsiveness — system-wide** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session OR Phase 1+ | Either dedicated session OR roll into architecture review Phase 1+ build sequence. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock readiness | P3 | OBSERVED | chat → T05 unblock session | Plan cap-throttle / rate-limit handling. |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | Investigate downstream pathway. **v2.58 note:** with cc-0007 recovery, ai-worker is now succeeding; observe whether this finding self-resolves over next 24–48h. |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check; rename if appropriate. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates in `11_final_consolidation.md` §11.1 | chat → future session | Update `00_overview.md`. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 | chat → Phase 2 session | After Phase 0 + Phase 1: bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45 → v2.58 (**14th deferral**) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |
| **F-CRON-COMPLIANCE-MONITOR-STALE** (carry) | cron jobid 31 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Decide: re-author repo source OR retire deployed slug + cron. |
| **F-CRON-INGEST-STALE** (carry) | cron jobid 1 calls deployed `ingest-v8-youtube-channel`; folder absent | P2 | LOGGED | PK → future session | Same shape as compliance-monitor. |
| **F-CRON-PIPELINE-AI-SUMMARY-STALE** (carry) | cron jobid 30 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PIPELINE-DOCTOR-STALE** (carry) | cron jobids 29 + 39 call deployed slug; folder absent. **NOT** a rename of `pipeline-diagnostician`. | P2 | LOGGED | PK → future session | Same shape. |
| **Music library activation checklist** (carry) | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK ACTION | PK | PK to action when music tracks are ready. |
| **Emergency redeploy governance question** (carry) | Should bounded production-restoration require expedited D-01? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules; chat documents in `docs/06_decisions.md`. **v2.58 note:** cc-0007 P1 recovery cycle (~1h55m brief→closure) demonstrates standard D-01 protocol can handle P1 timing without expediting. Empirical input for the decision.

**Closed v2.58:** **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1)** — cc-0007 APPLIED via repo patch + EF deploy by CC. Repo patch commit `5037e573` (`supabase/config.toml` `[functions.ai-worker] verify_jwt = false`); EF deploy `supabase functions deploy ai-worker --no-verify-jwt` exit=0 at `2026-05-09T04:23:27Z`. Recovery confirmed at first post-deploy cron 5 fire `04:25:00Z`; status_code=200; pattern transition unambiguous (22+ × 401 pre-deploy → 200 immediately post-deploy). V1–V4 all PASS at first fire. No rollback. Result file commit `411b85ee` (blob `b21be653`, 11,401 B). HTTP 401 5-min cron triage candidate from v2.57 also closed (jobid 5 was the source). First `ef_deploy` D-01 action_type. Class match to v2.54 video-worker regression vindicated twice.

**Closed v2.57:** F-CRON-PG-NET-TIMEOUT-5S (P2) — cc-0006 commit `c72bc327`.
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

**v2.58 carry (unchanged from v2.55/v2.56/v2.57):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK called CD on 2026-05-08; at least one invoice refund verbally confirmed in progress. Remaining clean-up still PK to action manually:
  1. Cancel Website Builder auto-renewal (saves ~$251/yr ongoing)
  2. Disable Premium DNS auto-renewal (saves $26/yr; move DNS to Cloudflare — free)
  3. Disable Domain Guard on .com auto-renewal (saves $9/yr)
  4. Before Nov 2026: transfer invegent.com to Cloudflare Registrar (~A$15/yr); transfer invegent.com.au to VentraIP or similar (~A$25–35/yr).
  5. Decline the $521/3yr renewal quote from CD.

  **Total annual saving once cleaned up: ~A$286/yr ongoing. Three-year saving: ~A$860.**

  Not chat scope — PK actions manually. Re-check status next session.

*(no other items flagged at v2.58 close — standing P0 to ask at next session start.)*

---

## 📌 Backlog

**v2.58 changes**:

- **CLOSED v2.58**: F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT (P1; cc-0007 result commit `411b85ee`).
- **CLOSED v2.58 (folded into cc-0007)**: HTTP 401 5-min cron triage candidate from v2.57 (jobid 5 was the source; cc-0006's earlier hypothesis of jobid 48 corrected).
- **PROMOTED v2.58**: cc-0005 / M8 Path A v4 APPLY scheduling → Top 2 next session priority + Active table rank 2. cc-0007 closure clears the P1 ai-worker block; cc-0005 M8a is now the next pipeline-integrity apply candidate per PK directive.
- **NEW v2.58**: Publisher latent config risk follow-up → Top 4 next session priority + Active table P3 row. Doc-only patch (no deploy required).
- **CARRIED v2.58**: Dashboard roadmap PHASES — **14th** consecutive deferral (was 13th in v2.57).
- **CARRIED v2.58**: 4 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 D-01 fires).
- **CARRIED v2.58**: 4× v2.54 P2 cron findings (F-CRON-COMPLIANCE-MONITOR-STALE, F-CRON-INGEST-STALE, F-CRON-PIPELINE-AI-SUMMARY-STALE, F-CRON-PIPELINE-DOCTOR-STALE).
- **CARRIED v2.58**: F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec) — risk profile UNCHANGED. PK auth required.
- **NEW v2.58 LESSON CANDIDATES**: L22–L25 from cc-0007 cycle (`ef_deploy` action_type VINDICATED, repo+deploy coordination LOGGED, P1 recovery timing LOGGED, security hygiene VINDICATED).
- **VINDICATED v2.58**: L10 (`cron_edit` action_type, by sibling `ef_deploy` clean apply); L17 (in-place patching pattern, by cc-0005 v4 in-place superseding v3).
- **CARRIED v2.58**: All v2.55/v2.56/v2.57 items unchanged except F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT closure, HTTP 401 triage closure (folded into cc-0007), cc-0005 promoted to rank 2, publisher follow-up added.
- **CARRIED v2.58**: Platform Reconciliation View brief candidate (commit `a8a241d1`) — first blocker (cc-0007) cleared; remaining: cc-0005 M8a + pipeline-integrity closure.
- **CARRIED v2.58**: cc-0005 v4 patch (commit `577d8568`); M8b NOT YET AUTHORED (separate cc-NNNN brief reserved for after M8a closes); 94-row un-publishable legacy draft cohort separate follow-up if PK directs.

**v2.55 + v2.56 + v2.57 + earlier changes**: per prior changelog.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Unchanged from v2.57 except:
- **Lesson #61** (P1–P5 must be empirically verified, not theoretically assumed) — reinforced again by cc-0007 cycle (final re-verify confirmed no drift; pre-flight queries empirically gathered before D-01). **Promotion to canonical recommended.**
- **Lesson #62 v2.50 refinement** — not exercised this cycle.
- **L22–L25 (v2.58)** — added; promotion to baseline candidate after one more vindication each.

---

## v2.58 honest limitations

- All v2.31–v2.57 limitations apply.
- **Memory at 30-edit cap pre-session** (carry). v2.58 update DEFERRED per PK explicit scope (no memory edit this turn). Memory `recent_updates` v2.54 entry remains canonical until next chat-owned memory update opportunity (will need to reflect v2.55 + v2.56 + v2.57 + v2.58 closures + inline post-v2.57 additions in a single rolling entry).
- **Dashboard roadmap PHASES still stale** — **14th** consecutive deferral. Risk unchanged.
- **~28+ close-the-loop UPDATEs to `m.chatgpt_review`** still pending — v2.58 adds 1 (cc-0007 D-01 fire); v2.55 + v2.56 + v2.57 each added 1; cumulative pending ~28+. **4 cc-NNNN reviews pending close-the-loop** (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007). All deferred per PK "no Supabase writes" scope.
- **cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 D-01 review_ids not captured in 4-way sync files**. Will surface when close-the-loop UPDATEs are fired.
- **Sync state file size**: ~30KB at v2.58 close (was ~26KB at v2.57 close). Archive sweep **OVERDUE** since the 16KB threshold was crossed at v2.54; deferred.
- **cc-0005 v4 brief is NOT YET APPLIED.** Apply gates remaining: §1.4 expected 3 callers + §1.3 cron state + §1.5a band [250, 500] + §1.5d alignment count = 0 + D-01 fire + PK approval. cc-0005 M8a is now the next pipeline-integrity apply candidate per PK directive (v2.58).
- **Publisher latent config risk** — carried as v2.58 P3 follow-up. Doc-only patch only (no deploy). Removes regression risk for next publisher deploy without affecting current state.
- **No D-01 fire for the v2.58 4-way sync close commit** — doc-only, no production state touch.
- **No D-01 fire for inline post-v2.57 additions** (cc-0005 v4 patch + cc-0007 brief draft + Platform Reconciliation View brief candidate + action_list reconciliation `a8a241d1`) — all doc-only.
- **L23 (repo + deploy coordination rollback shape)** — logged but rollback path was NOT exercised in cc-0007. Pattern is durable on the apply side; rollback shape remains theoretical until exercised.
- **Brief-runner-v0 §1.x quality observations** from cc-0007 (logged in result file §9): cron blind spot for HTTP failures; §1.2 threshold not regression-onset-aware; §1.5 first-failed-cron-fire query relies on same blind spot; `m.ef_drift_log` column-name mismatch (`ef_slug` → `slug`, `created_at` → `checked_at`). Worth incorporating into brief-template work.

---

## Changelog

- v1.0–v2.57: per previous changelog.
- **v2.58 (2026-05-09 Sydney, F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT closure via cc-0007 APPLIED):**
  - **F-CRON-AI-WORKER-401-INVALID-JWT-FORMAT CLOSED / RECOVERED** — cc-0007 APPLIED via repo patch + EF deploy by CC. Repo patch commit `5037e573881c524dc244664c4a2fc08906c069bc` modified `supabase/config.toml` adding `[functions.ai-worker] verify_jwt = false` at end of custom-header-auth section after `[functions.auto-approver]`; section count comments updated 23→24 / 10→11; +5/-2 additive only; all other entries preserved verbatim. EF deploy `supabase functions deploy ai-worker --no-verify-jwt` returned exit=0 at `DEPLOY_TIMESTAMP 2026-05-09T04:23:27Z`. EF source bytes unchanged across deploy boundary (Class A-LE; deploy=repo=2.12.0 since 2026-05-08 03:24Z); single semantic change was gateway `verify_jwt: true → false`. Recovery confirmed at first post-deploy cron 5 fire `04:25:00Z` (~93 s after deploy returned); status_code=200; pattern transition unambiguous (22+ × 401 pre-deploy → 200 immediately post-deploy). V1–V4 all PASS at first fire (V1 cron-side runid 173234 status=`succeeded`, return_message=`INSERT 0 1` no UNAUTHORIZED; V1 HTTP authoritative http_response_id 101268 status_code=200 timed_out=false; V2 post_deploy_jwt_format_401_count=0; V3 covered by V1 HTTP authoritative row; V4 0 unexpected `m.ef_drift_log` entries in window). No rollback. Result file commit `411b85ee0b8c8cd716af2c3226d6af423f563591` (blob `b21be653`, 11,401 B).
  - **First `ef_deploy` D-01 action_type** in cc-NNNN series. Reviewer applied same standards as `sql_destructive` (production state change with rollback path). Verdict agree / proceed / risk ≤ medium / confidence high. 0 pushback. 0 escalation. Clean approve. PK approval phrase: `"pk proceed with cc-0007 apply ai-worker only"`.
  - **Class match validation:** identical recovery vector to v2.54 video-worker regression (commit `6ed29bbc`). 2-step pattern (config.toml entry + `--no-verify-jwt` deploy) now vindicated twice across two distinct EFs. Pattern is durable.
  - **HTTP 401 5-min cron triage candidate from v2.57 CLOSED** (folded into cc-0007 closure). cc-0006's earlier hypothesis ("likely jobid 48") was wrong; CC's read-only triage 2026-05-09 corrected to jobid 5 (`ai-worker-every-5m`). jobid 48's command body is pure PostgreSQL and cannot 401 against an EF gateway.
  - **Latent risk noted (NOT closed by cc-0007): publisher block remains ABSENT from `supabase/config.toml`.** Currently 0 × 401 (gateway presumably already at `verify_jwt: false`), but next publisher deploy without flag AND without config.toml entry would regress identically. cc-0007 §1.4 surfaced; defensive patch held back per strict rule + D-01 conditions. Carried as v2.58 P3 follow-up: doc-only patch adding `[functions.publisher] verify_jwt = false` (no deploy required). PK directs scheduling.
  - **cc-0005 M8a is now the next pipeline-integrity apply candidate per PK directive.** ai-worker is now generating drafts; m.ai_job rows are being processed; cron 48 has fresh succeeded ai_jobs to enqueue from. cc-0005 M8a v4 (commit `577d8568`) apply gates remaining: §1.0 sequencing ✅ met v2.55/v2.56; §1.4 expected 3 callers; §1.3 cron state; §1.5a band [250, 500]; §1.5d alignment count = 0; D-01 fire (`sql_destructive` action_type for migration); PK explicit approval phrase.
  - **Brief-runner-v0 lessons — cc-0007 cycle:**
    - **L22 (`ef_deploy` D-01 action_type) VINDICATED** — reviewer applied appropriate standards; clean PASS. Cousin to L10 (`cron_edit`); both proven robust.
    - **L23 (repo + deploy coordination rollback shape) LOGGED** — first apply with TWO production-touching steps; both succeeded; rollback prepared but NOT exercised. Pattern durable on apply side; rollback shape theoretical until exercised.
    - **L24 (P1 recovery timing) LOGGED** — wall-clock ~1h55m brief→closure including D-01 fire + final re-verify + repo patch + deploy + V1–V4 + result file. P1 cost-of-waiting honoured without expediting D-01 protocol. Empirical input for Emergency redeploy governance question.
    - **L25 (security hygiene in result files) VINDICATED** — bearer tokens / vault values successfully redacted; only structural references appear.
  - **L10 + L17 vindicated again v2.58** (sibling action_type clean apply; in-place patching pattern via cc-0005 v4 superseding v3). Promotion to baseline candidate next cycle.
  - **Brief-runner-v0 observations from CC apply session (§9 of result file; logged for future briefs):** cron blind spot for HTTP failures (`return_message` reflects last SQL statement, not gateway HTTP body); §1.2 threshold not regression-onset-aware; §1.5 first-failed-cron-fire query relies on same blind spot; `m.ef_drift_log` column-name mismatch (brief used `ef_slug` / `created_at`; actual schema is `slug` / `checked_at`). Worth incorporating into brief-template work.
  - **D-01 fire** — 1 cc-0007 fire (prior cycle by chat), action_type `ef_deploy`. Verdict agree / proceed / risk ≤ medium / confidence high. 0 pushback. 0 escalation. Clean approve. v2.58 4-way sync close (this) is doc-only and per protocol does NOT require a fire. Inline post-v2.57 additions all doc-only and per protocol did not require fires.
  - **PK explicit approval phrase received** for cc-0007 apply: `"pk proceed with cc-0007 apply ai-worker only"`.
  - **State-capture exception count v2.58: 0**.
  - **Closure budget**: ~30 min chat 4-way sync close. Trailing-14-day ~62h above 8.0 floor. ~2 P0+P1 open of 20 cap (was ~3 v2.57; cc-0007 P1 closed v2.58).
  - **0 production mutations chat-side this turn** — 4-way sync close is doc-only. Production mutations in this cycle were the cc-0007 repo patch (`5037e573`, by CC via git push) and cc-0007 EF deploy (by CC via shell command) — both prior to this sync close.
  - **STANDING_THREE array unchanged**. `m.ef_drift_log` untouched by chat (cc-0007 EF deploy logged 1 expected ai-worker entry; V4 PASS). No cron edits this turn. No EF deploys this turn. No code changes this turn. No Phase 0 scheduling.
  - **Acceptance-integrity adherence** (v2.50): cc-0007 result file commit `411b85ee` verified by re-fetching landed file content via Invegent GitHub MCP — blob `b21be653`, 11,401 B; V1–V4 verification table + D-01 conditions + bearer-token redaction + brief-runner-v0 §9 observations all present. cc-0007 repo patch commit `5037e573` verified by re-fetching landed `supabase/config.toml` content — blob `3d98d88f`, 4,496 B; `[functions.ai-worker] verify_jwt = false` block confirmed at end of custom-header section; section count comments updated 23→24 / 10→11; all other entries preserved verbatim.
  - **Deferred per PK explicit scope this turn**: memory `recent_updates` v2.55 + v2.56 + v2.57 + v2.58 entries; 4 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 + cc-0006 + cc-0007 D-01 fires); dashboard PHASES update (**14th** carry); cc-0005 M8a v4 apply work (awaiting PK direction); M8b brief authoring (deferred until M8a closes); 94-row un-publishable legacy draft cohort cleanup (separate follow-up if PK directs); Phase 0 scheduling (carry); Publisher latent config risk follow-up (P3, scheduled separately).
  - **Carried**: Crazy Domains refund follow-up (Personal businesses); morning-inbox-sweep-v1 brief amendment (P3); 4 P2 cron findings from v2.54; F-CRON-AUTO-APPROVER-SECRET-INLINE (P2 sec, OPEN, unchanged); Platform Reconciliation View brief candidate (sequencing: cc-0007 cleared, cc-0005 M8a + pipeline-integrity closure remain).
