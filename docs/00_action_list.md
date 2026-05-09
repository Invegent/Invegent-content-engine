# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-09 Sydney (v2.56 — **M6 Phase B CLOSED** via cc-0004 APPLIED by CC via Supabase MCP `apply_migration` (commit `9d5bdd37`, 43 rows dead-lettered across 7 (client, platform) partitions, V1–V6 all PASS, no rollback). Both cc-0003 v1 HALT slot-bound CFW IG rows (`929ee2f9-...`, `30fa6594-...`) captured. **M6 dead-letter cycle now functionally complete: 9 (Phase A) + 43 (Phase B) = 52 residual rows cleared.** Schedule deltas -1d to +21d confirm pre-M4 residue, not minor drift. P3.3 outlier: 1 LinkedIn queue row with `pd.approval_status='draft'` dead-lettered (D-01 reviewer cleared as not blocking; logged P3 backlog passive validator). cc-0005 §1.0 PK confirmation gate: items 3 + 4 now MET v2.55/v2.56; items 1 + 2 still blocked. Chat investigation 9 May (turn prior to v2.56 close) established cron 48 is SOLE autonomous inserter into m.post_publish_queue — disabling it = autonomous publishing stops. **Recommended Path (A) cutover:** rewrite cron 48 command body in place via `cron.alter_job` to remove `public.get_next_scheduled_for` from COALESCE chain; do NOT disable cron 48. cc-0005 brief premise (component 1 = disable cron 48) is incorrect as written; Path (A) patch deferred to PK direction. Brief-runner-v0 L6 (cross-brief propagation) VALIDATED end-to-end this cycle. New L7–L9 candidates logged. Closed v2.56: M6 Phase B (P1). Previous (v2.55): M6 Phase A CLOSED via cc-0003 v2 APPLIED.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump that touches production state goes through ChatGPT cross-check before deploy/commit. **v2.56 application**: 1 D-01 fire chat-side for cc-0004 apply (clean PASS / agree / proceed / 0 pushback / 0 escalation). v2.56 4-way sync close commit (this) is doc-only and per protocol does not require a fire.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is approved target design. All stages CLOSED. **v2.56 application**: no drift fires this session.

**STANDING RULE (Lesson #62, v2.41 + v2.50 refinement)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override. **v2.56 application**: D-01 fire for cc-0004 returned clean agree / 0 pushback / 0 escalation; rule not exercised.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time**.

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery is now the default brief pattern for any CC dashboard/portal/web/script work.

**STANDING RULE (v2.50 — Acceptance integrity)**: Acceptance is not complete until the actual review artifact is received and reviewed. **v2.56 application**: cc-0004 result file commit `9d5bdd37` verified post-CC-push by re-fetching landed file content via Invegent GitHub MCP — blob `94fe31850e1455c056c63f9226e1afcb3d35a3d1`, size 11,491 B. Migration return value `{"success": true}` per CC's report. V1–V6 verification all PASS per result file. Partition characterization table verified. P3.3 outlier documented. No acceptance asserted on summary signal alone.

**STANDING RULE (v2.55 — brief-runner-v0 baseline patterns from cc-0003 cycle)**: L1–L4 are baseline:
- **L1 HALT mechanism is load-bearing.**
- **L2 doc-only patch → re-execution loop.**
- **L3 result-file preservation.**
- **L4 pre-state baseline pattern is now required.**

**v2.56 ADDITION**: **L6 (cross-brief patch propagation when invariant fails) is now baseline** — validated end-to-end this cycle (cc-0003 v1 HALT → chat-authored cc-0004 §1.5 patch → CC executed cc-0004 cleanly post-cc-0003 v2 with no friction; both surfaced CFW IG rows correctly captured in apply set).

**v2.56 promotion candidates** (after one more vindication each):
- **L5** invariants must be empirically pre-tested
- **L7** "informational, expected non-zero" co-occurrence pattern (used in cc-0004 §1.5 post-patch)
- **L8** multi-table criterion via IN-subquery pattern at production scale
- **L9** schedule-delta evidence in result files validates dead-letter rationale post-apply

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~2 (was ~3 v2.55; M6 Phase B P1 closed) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~60h (was ~59.5h v2.55; +30m this 4-way sync close) | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This 4-way sync close: ~30 min** (read result file + author 3 doc files + acceptance integrity verify).

**State-capture exception count v2.56: 0** (D-01 fire returned clean agree; no escalation, no override).

---

## ⭐ Today / Next 5 — REBUILT v2.56

> **Last rebuilt:** 2026-05-09 Sydney (v2.56).
> **M6 dead-letter cycle now functionally complete.** cc-0005 / M8 cutover Path (A) patch promoted to Top 3 (PK direction required).

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Dashboard Architecture Review Phase 0 prerequisites** | **P1 TOP** | Unchanged from v2.55. M6 Phase A + B both closed; M5–M8 reconciliation partially advanced. | PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M7 (doc-only) + M8 still pending. |
| 2 | **AI cost view** | P3 quick win | Unchanged. ~1h estimate. | Author `vw_ai_cost_monthly` on `m.ai_job` (read-only DDL) + add NOW dashboard tile. |
| 3 | **cc-0005 / M8 atomic cutover — Path (A) patch** | **P3 (PK direction required)** | M6 dead-letter cycle complete v2.56; cc-0005 §1.0 gate items 3 + 4 MET. Items 1 + 2 still blocked. Chat investigation established Path (A) is recommended architecture. | PK direction needed: confirm Path (A) (rewrite cron 48 in place via `cron.alter_job` to remove `get_next_scheduled_for` from COALESCE) OR alternative approach. If Path (A) confirmed, chat issues cc-0005 doc-only patch (no apply). |
| 4 | **Personal businesses check-in** | P0 standing | Carry. | PK reports any time-sensitive items + Crazy Domains clean-up status. |
| 5 | **morning-inbox-sweep-v1 brief amendment** (carry from v2.51) | P3 | PK held for cool-headed amendment. | PK reviews drafted brief; chat applies amendments + flips status=review_required. |

**Carry-forward unchanged from v2.55 except for the M6 Phase B closure and cc-0005 Path (A) promotion.**

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (unchanged from v2.55)

All stages CLOSED. Cron jobid 80 + 81 active=true. No drift fires this cycle.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`.

**v2.56 update on hard blockers:**
- ✅ S30 cleared v2.47 — first hard blocker DONE.
- 🔲 M5–M8 reconciliation — partial progress: M6 Phase A **CLOSED v2.55**; M6 Phase B **CLOSED v2.56**. M7 (doc-only) + M8 still pending.
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override (cc-0001 result file in place).

**Phase 0 still gated. Remains Top-1 next session priority v2.56.**

---

## 🟢 Tier 1 + M4 + M5 + M6 Phase A + M6 Phase B queue integrity & stability remediation — STATUS BLOCK

**v2.56 update:**
- M1 + M2 + M3 — CLOSED 2026-05-05
- M4 — CLOSED 2026-05-05
- M5 — CLOSED 2026-05-05
- **M6 Phase A — CLOSED v2.55** via cc-0003 v2 (commit `d60dcfbc`, 9 rows)
- **M6 Phase B — CLOSED v2.56** via cc-0004 (commit `9d5bdd37`, 43 rows)
- **M6 dead-letter cycle: COMPLETE.** Total 52 residual rows cleared.
- **M7 closure — PENDING (folds into cc-0005 / M8 4-way sync per reconciliation §6 Q2; doc-only)**
- **M8 atomic cutover — cc-0005 brief drafted commit `6f16c40e`; PARKED at §1.0. Items 3 + 4 MET v2.55/v2.56; items 1 + 2 still blocked. Path (A) cutover architecture recommended; patch deferred to PK direction.**

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.54.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 52 cumulative; close-the-loop ~26+ pending)

**v2.56 application**: 1 D-01 fire chat-side for cc-0004 apply. Cumulative T-MCP-02: 51 → 52. Cumulative T-MCP-08: 2 (unchanged). State-capture exceptions v2.56: **0**.

**Fire ledger this cycle:**
- Fire #1 (cc-0004 D-01, review_id pending close-the-loop capture): action_type `sql_destructive`. Verdict agree / proceed / risk=medium / confidence=high. 0 pushback. 0 escalation. Clean approve. Conditions: re-run final read-only verification immediately before apply (PASSED — no drift); halt if count is 0 or outside [20, 65] (NOT triggered — count was 43); halt if 43-row set changes materially OR `pre_dead_reason_count` changes OR both CFW IG rows unexpectedly absent (none triggered); use SQL from packet with `updated_at = NOW()` (USED VERBATIM); apply only after PK says "proceed with cc-0004 apply" (RECEIVED); after apply, run V1–V6 (DONE — all PASS); commit result file (DONE — commit `9d5bdd37`).

**Close-the-loop UPDATEs to `m.chatgpt_review`:** v2.56 adds 1 more (cumulative ~26+ pending). Carried as P3 backlog. **Deferred this turn per PK explicit "no Supabase writes" scope.** v2.55 cc-0003 v2 D-01 fire close-the-loop also still pending.

---

## 🤖 Cowork automation (D182)

**v2.56 status (carry from v2.54/v2.55):** `docs/briefs/morning-inbox-sweep-v1.md` committed status=draft per PK hold. NOT scheduled in Cowork until PK amends and flips status=review_required.

**Existing Cowork status (unchanged):** Weekly reconciliation Mon 7am AEST + ICE Nightly Health Check daily 02:00 AEST. `docs/audit/health/2026-05-06.md` still absent — carry as P3 follow-up.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults + M5–M8 reconciliation | P1 TOP (v2.56) | S30 cleared v2.47; M6 Phase A closed v2.55; M6 Phase B closed v2.56; M7 + M8 + defaults pending | PK | Review §11.4 items 3–9; confirm defaults via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. |
| **AI cost view** (carry from v2.49) | `vw_ai_cost_monthly` view on `m.ai_job` + NOW dashboard tile | P3 → Top 2 (carry from v2.55) | Backlog | chat → next session | Author view DDL (read-only); add NOW dashboard tile. ~1h estimate. |
| **cc-0005 / M8 atomic cutover — Path (A) patch** | Rewrite cron 48 command body in place via `cron.alter_job` to remove `get_next_scheduled_for` from COALESCE; do NOT disable cron 48 | P3 → Top 3 (NEW v2.56) | Brief at `docs/briefs/cc-0005-m8-atomic-cutover.md` (commit `6f16c40e`, blob `9d24805c`) is incorrect as written (component 1 = disable cron 48 would stop autonomous publishing). §1.0 gate items 3 + 4 MET; items 1 + 2 still blocked. Path (A) recommended by chat investigation 9 May. | PK → chat | PK directs Path (A) confirmation OR alternative. If Path (A) confirmed, chat issues cc-0005 doc-only patch (no apply). §1.0 PK confirmation gate item 1 (post-cutover enqueue path) becomes "cron 48 in place is the path; legacy fallback removed" — trivially confirmed. Item 2 (no live callers outside cron 48) remains a structural check. Apply only after Path (A) patch + new D-01 fire + PK approval. |
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
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45 → v2.56 (**12th deferral**) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |
| **F-CRON-COMPLIANCE-MONITOR-STALE** (carry) | cron jobid 31 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Decide: re-author repo source OR retire deployed slug + cron. |
| **F-CRON-INGEST-STALE** (carry) | cron jobid 1 calls deployed `ingest-v8-youtube-channel`; folder absent | P2 | LOGGED | PK → future session | Same shape as compliance-monitor. |
| **F-CRON-PIPELINE-AI-SUMMARY-STALE** (carry) | cron jobid 30 calls deployed slug; folder absent | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PIPELINE-DOCTOR-STALE** (carry) | cron jobids 29 + 39 call deployed slug; folder absent. **NOT** a rename of `pipeline-diagnostician`. | P2 | LOGGED | PK → future session | Same shape. |
| **F-CRON-PG-NET-TIMEOUT-5S** (carry) | cron jobid 33, 44, 58 timed out at 5000ms pg_net default | P2 | LOGGED | chat → future session | Defer until separate cron-reliability triage cycle. |
| **F-CRON-AUTO-APPROVER-SECRET-INLINE** (carry, security) | Cron jobid 58 has secret hardcoded inline | P2 (security) | LOGGED | chat → future session (PK approval required for rotation) | PK to authorise secret rotation. |
| **Music library activation checklist** (carry) | 9 mp3 upload + bucket + env var | P3 (PK action) | PENDING PK ACTION | PK | PK to action when music tracks are ready. |
| **Emergency redeploy governance question** (carry) | Should bounded production-restoration require expedited D-01? | P2 (PK decision) | PENDING PK DECISION | PK | PK rules; chat documents in `docs/06_decisions.md`. |

**Closed v2.56:** **M6 Phase B (P1)** — cc-0004 APPLIED via Supabase MCP `apply_migration` (commit `9d5bdd37`). 43 rows dead-lettered across 7 (client, platform) partitions. Both cc-0003 v1 HALT slot-bound CFW IG rows captured. All V1–V6 PASS. No rollback. **M6 dead-letter cycle now functionally complete: 9 (Phase A) + 43 (Phase B) = 52 residual rows cleared.** Brief-runner-v0 L6 (cross-brief propagation) validated end-to-end this cycle.

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

**v2.56 carry from v2.55 (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK called CD on 2026-05-08; at least one invoice refund verbally confirmed in progress. Remaining clean-up still PK to action manually:
  1. Cancel Website Builder auto-renewal (saves ~$251/yr ongoing)
  2. Disable Premium DNS auto-renewal (saves $26/yr; move DNS to Cloudflare — free)
  3. Disable Domain Guard on .com auto-renewal (saves $9/yr)
  4. Before Nov 2026: transfer invegent.com to Cloudflare Registrar (~A$15/yr); transfer invegent.com.au to VentraIP or similar (~A$25–35/yr).
  5. Decline the $521/3yr renewal quote from CD.

  **Total annual saving once cleaned up: ~A$286/yr ongoing. Three-year saving: ~A$860.**

  Not chat scope — PK actions manually. Re-check status next session.

*(no other items flagged at v2.56 close — standing P0 to ask at next session start.)*

---

## 📌 Backlog

**v2.56 changes**:

- **CLOSED v2.56**: M6 Phase B P1 (cc-0004; commit `9d5bdd37`).
- **PROMOTED v2.56**: cc-0005 / M8 cutover Path (A) patch → Top 3 next session priority + Active table P3 row. Brief premise (component 1 = disable cron 48) is incorrect as written; chat investigation 9 May established Path (A) is recommended cutover architecture. PK direction required before cc-0005 patch.
- **NEW v2.56 P3 backlog observation**: 1 LinkedIn queue row (`1a21199e-...`) was in queue with `pd.approval_status='draft'` (cc-0004 P3.3 outlier; dead-lettered, draft unchanged); investigation deferred as passive validator.
- **CARRIED v2.56**: Dashboard roadmap PHASES — **12th** consecutive deferral (was 11th in v2.55).
- **CARRIED v2.56**: Two outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 D-01 fires).
- **CARRIED v2.56**: 6 v2.54 P2 cron findings.
- **NEW STANDING RULE v2.56 PROMOTION**: brief-runner-v0 L6 (cross-brief propagation when invariant fails) — promoted from candidate to baseline pattern after end-to-end vindication this cycle.
- **CARRIED v2.56**: All v2.55 items unchanged except M6 Phase B closure and cc-0005 Path (A) promotion.

**v2.55 + earlier changes**: per prior changelog.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Unchanged from v2.55 except:
- **Lesson #61** (P1–P5 must be empirically verified, not theoretically assumed) — reinforced again by L6 vindication this cycle. **Now strongly suggesting promotion to canonical.**
- **Lesson #62 v2.50 refinement** — not exercised this cycle.

---

## v2.56 honest limitations

- All v2.31–v2.55 limitations apply.
- **Memory at 30-edit cap pre-session** (carry). v2.56 update DEFERRED per PK explicit scope (no memory edit this turn). Memory `recent_updates` v2.54 entry remains canonical until next chat-owned memory update opportunity (will need to reflect v2.55 + v2.56 closures in a single rolling entry).
- **Dashboard roadmap PHASES still stale** — **12th** consecutive deferral. Risk unchanged.
- **~26+ close-the-loop UPDATEs to `m.chatgpt_review`** still pending — v2.56 adds 1 (cc-0004 D-01 fire); v2.55 added 1 (cc-0003 v2 D-01 fire); cumulative pending ~26+. Both deferred per PK "no Supabase writes" scope across both versions.
- **cc-0003 v2 + cc-0004 D-01 review_ids not captured in 4-way sync files**. Will surface when close-the-loop UPDATEs are fired (chat session log holds the values).
- **Sync state file size**: ~24KB at v2.56 close (was ~24KB at v2.55). Archive sweep **OVERDUE** since the 16KB threshold was crossed at v2.54; deferred.
- **cc-0005 brief is incorrect as written** — component 1 (disable cron 48) would stop autonomous publishing. Chat investigation last turn established Path (A) is recommended (rewrite cron 48 in place). Brief patch deferred to PK direction. **No cc-0005 apply work should occur until brief is patched.**
- **No D-01 fire for the v2.56 4-way sync close commit** — doc-only, no production state touch. Documented in protocol notes above.
- **cc-0004 P3.3 LinkedIn 'draft' queue-row outlier** (`1a21199e-...`) is now dead-lettered; underlying draft unchanged. Whether a similar pattern is producing other outlier rows is unknown until passive validator fires.
- **Client labels in cc-0004 partition table** preserved verbatim from CC's result file. `c.client.client_id` cross-check with memory's NY/PP/CFW/Invegent mapping deferred (out of scope this turn).

---

## Changelog

- v1.0–v2.55: per previous changelog.
- **v2.56 (2026-05-09 Sydney, M6 Phase B closure via cc-0004 APPLIED):**
  - **M6 Phase B CLOSED** — cc-0004 APPLIED via Supabase MCP `apply_migration` by CC. Migration `m6_phase_b_v4_mismatch_dead_letter_v1` on project `mbkmaxqhsohbtwsqolns`. `apply_migration` return `{"success": true}`. Single atomic transaction. 43 rows updated from `status='queued'` to `status='dead'` with `dead_reason='anomalous_pre_m4_v4_mismatch'` and `updated_at=NOW()`. All V1–V6 verifications PASS. No rollback. Result file commit `9d5bdd37`.
  - **M6 dead-letter cycle now functionally complete** — cc-0003 v2 (9 rows Phase A) + cc-0004 (43 rows Phase B) = 52 residual rows cleared. `m.post_publish_queue` `status IN ('queued','failed')` rows now reflect current intent, not historical drift.
  - **Both cc-0003 v1 HALT slot-bound CFW IG rows captured** in cc-0004 apply set (`929ee2f9-...`, `30fa6594-...`). Brief-runner-v0 L6 (cross-brief propagation) validated end-to-end — the rows were filtered out of cc-0003 v2 (criterion narrowed to `pd.slot_id IS NULL`) and correctly captured by cc-0004 (criterion `pd.slot_id IS NOT NULL`).
  - **D-01 fire** — 1 cc-0004 fire, action_type `sql_destructive`. Verdict agree / proceed / risk=medium / confidence=high. 0 pushback. 0 escalation. Clean approve.
  - **PK explicit approval phrase received**: `"proceed with cc-0004 apply"`.
  - **Schedule deltas** range -85,821 s (-1 day) to +1,814,400 s (+21 days) across 7 (client, platform) partitions — confirms pre-M4 residue with materially-wrong scheduling, not minor drift.
  - **P3.3 outlier**: 1 of 43 rows had `pd.approval_status='draft'` (queue_id `1a21199e-...`, LinkedIn). D-01 reviewer cleared as not blocking; queue dead-lettered, draft unchanged. Logged as P3 backlog passive validator.
  - **cc-0005 §1.0 PK confirmation gate state** (post v2.56): items 3 + 4 (sequencing) MET v2.55/v2.56; items 1 + 2 (post-cutover enqueue path + `get_next_scheduled_for` callers) still blocked. Chat investigation 9 May established **Path (A) is recommended cutover architecture** (rewrite cron 48 in place via `cron.alter_job` to remove `get_next_scheduled_for` from COALESCE; do NOT disable cron 48). cc-0005 brief premise incorrect as written; Path (A) patch deferred to PK direction.
  - **Brief-runner-v0 L6 (cross-brief patch propagation when invariant fails) — PROMOTED to baseline pattern v2.56**. L7 + L8 + L9 logged as new candidates from cc-0004 cycle.
  - **State-capture exception count v2.56: 0**.
  - **Closure budget**: ~30 min chat 4-way sync close. Trailing-14-day ~60h above 8.0 floor. ~2 P0+P1 open of 20 cap (was ~3 v2.55).
  - **0 production mutations chat-side this turn** — 4-way sync close is doc-only. Production mutation in this cycle was the cc-0004 `apply_migration` call by CC (separate session).
  - **STANDING_THREE array unchanged**. `m.ef_drift_log` untouched. No cron edits. No EF deploys. No code changes. No Phase 0 scheduling.
  - **Acceptance-integrity adherence**: cc-0004 result file commit `9d5bdd37` verified post-CC-push by re-fetching landed file content via Invegent GitHub MCP — blob `94fe31850e1455c056c63f9226e1afcb3d35a3d1`, size 11,491 B, all 43 queue_ids enumerated, V1–V6 PASS table present, partition characterization table present, P3.3 outlier documented. 4-way sync close commit (this) verified post-push.
  - **Deferred per PK explicit scope this turn**: memory `recent_updates` v2.55 + v2.56 entries; 2 outstanding `m.chatgpt_review` close-the-loop UPDATEs (cc-0003 v2 + cc-0004 D-01 fires); dashboard PHASES update (**12th** carry); cc-0005 Path (A) patch (awaiting PK direction).
  - **Carried**: Crazy Domains refund follow-up (Personal businesses); morning-inbox-sweep-v1 brief amendment (P3); 6 P2 cron findings from v2.54.
