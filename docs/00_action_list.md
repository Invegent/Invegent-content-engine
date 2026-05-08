# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-08 Sydney (v2.52 — productive close. 3 findings closed in single session: insights-worker P1 functional drift (commit `57daf877`); F-HEYGEN-RPC-MIGRATIONS-MISSING + F-INSIGHTS-RPC-MIGRATIONS-MISSING (combined commit `7555b98a`). 2 D-01 fires (T-MCP-02 47 → 49). 0 state-capture exceptions (Lesson #62 v2.50 testable-corrected-action path). 0 production mutations chat-side. Today/Next 5 rebuilt per PK direction: Dashboard Phase 0 → F-YT-NY-FORMAT-SELECTION → AI cost view.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump that touches production state goes through ChatGPT cross-check before deploy/commit. **v2.52 application**: 2 D-01 fires this session, both for production-touching commits (`57daf877` insights-worker forward-sync; `7555b98a` combined RPC migration orphan closure). Final v2.52 4-way sync close commit is doc-only (no production touch) and per protocol does not require a fire.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is approved target design. Stage 1 closed v2.41. Stage 2a closed v2.44. Stage 2a verified end-to-end via S30 v2.47. Stage 2b CLOSED v2.48. Stage 3 CLOSED v2.49. **P1 SECURITY-DEFINER triage CLOSED v2.50** with three sync-only commits.

**STANDING RULE (Lesson #62, v2.41 + v2.50 refinement)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override. **v2.50 refinement**: When the corrected_action is **low-cost and testable**, prefer empirical verification over override. When the corrected_action is **non-testable** (vague, tautological, no concrete acceptance criteria), override remains the default with PK approval as state-capture exception per existing protocol. **v2.52 application**: D-01 fire #1 for insights-worker forward-sync returned partial+escalate with two pushback points (byte-for-byte hash; RPC dependencies). Both corrected_actions were testable. Empirical verification path used; both pushbacks resolved cleanly. NO state-capture exception fired — empirical verification is distinct from override path.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`. Reopen triggers in `11_final_consolidation.md` §11.7. Amendment-doc protocol at `docs/dashboard-review-2026-05/amendments/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time** for the upcoming fire window, not "tonight" without qualifier.

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery (verify route convention, auth gate, UI library, schema column names, against actual repo + database before coding) is now the default brief pattern for any CC dashboard/portal/web/script work.

**STANDING RULE (v2.50 — Acceptance integrity)**: Acceptance is not complete until the actual review artifact is received and reviewed, regardless of artifact type. A "looks good" / "passed" / "matches" signal alone is NOT sufficient to declare acceptance. Chat does not advance state, close items, or trigger sync close on the basis of an unverified summary. **v2.52 application**: Both production-touching commits (`57daf877`, `7555b98a`) verified post-push by re-fetching the landed file content (or directory listing) from GitHub and confirming new blob SHAs + matching byte sizes / VERSION headers / content. No acceptance asserted on summary signal alone.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~5 (was ~6 v2.51; insights-worker P1 closed) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~54h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~1.5h** (insights-worker forward-sync + RPC discovery + combined RPC migration orphan closure + 4-way sync close).

**Day total v2.52: ~1.5h.**

**State-capture exception count v2.52: 0** (D-01 fire #1 escalated but resolved via empirical verification per Lesson #62 v2.50 refinement; D-01 fire #2 returned clean agree).

---

## ⭐ Today / Next 5 — REBUILT v2.52 PER PK DIRECTIVE

> **Last rebuilt:** 2026-05-08 Sydney (v2.52).
> **3 closures this session removed insights-worker drift and both RPC migration orphan findings from the queue.** PK explicitly designated next Top 3.

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **Dashboard Architecture Review Phase 0 prerequisites** | **P1 TOP** | Now first chat-actionable P1 after insights-worker drift closed | PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M5–M8 reconciliation independent. |
| 2 | **F-YT-NY-FORMAT-SELECTION** | P1 | Newly unblocked v2.50; carry from v2.51 | Read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. Brief committed `ff5ae6ae`. |
| 3 | **AI cost view** | P3 quick win | Cheap closure, ~1h estimate | Author `vw_ai_cost_monthly` on `m.ai_job` (read-only DDL) + add NOW dashboard tile. |
| 4 | **Personal businesses check-in** | P0 standing | Carry from v2.51: Crazy Domains refund follow-up | PK reports any time-sensitive items + Crazy Domains clean-up status. |
| 5 | **morning-inbox-sweep-v1 brief amendment** (carry from v2.51) | P3 | PK held for cool-headed amendment | PK reviews drafted brief; proposes amendments next session; chat applies + flips status=review_required; PK schedules in Cowork. |

**Carry-forward unchanged from v2.51 except for the 3 closures and the Top 3 reorder.**

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (unchanged from v2.51)

**Stage status:**
- Stage 1: CLOSED v2.41
- Stage 2a: CLOSED v2.44; verified end-to-end via S30 v2.47
- Stage 2b: CLOSED v2.48 — `dashboard.invegent.com/ef-drift` live, 5/5 SQL + 7/7 PK visual PASS
- Stage 3: CLOSED v2.49 — `scripts/safe-deploy.sh` live, A1–A8 PASS
- P1 SECURITY-DEFINER triage: CLOSED v2.50 — 3 sync-only commits as closure artifacts
- F-INSIGHTS-RPC-MIGRATIONS-MISSING: CLOSED v2.52 — repo-parity migration commit `7555b98a`
- F-HEYGEN-RPC-MIGRATIONS-MISSING: CLOSED v2.52 — repo-parity migration commit `7555b98a`

**Cron status (all live):**
- jobid 80 `drift-check-daily-fire` — `0 17 * * *` UTC, `active=true`
- jobid 81 `ef-drift-log-retention-90d` — `15 17 * * *` UTC, `active=true`
- 7-8 May fire window: 17:00 UTC 7 May = 03:00 AEST 8 May Sydney — should have grown `m.ef_drift_log` from 147 → 196 rows. Verifiable next session if needed.

**Adjacent open finding:** None remaining. All RPC migration orphan findings closed v2.52.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`.

**v2.52 update on hard blockers (unchanged from v2.51):**
- ✅ S30 cleared v2.47 — first hard blocker DONE.
- 🔲 M5–M8 reconciliation — second hard blocker still pending.
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override.

**Phase 0 still gated. Promoted to Top-1 next session priority v2.52.**

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.51. M6–M8 still pending. M6 Phase A unblocked since v2.50.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.51.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 49 of 5)

**v2.52 application**: 2 D-01 fires this session. Cumulative T-MCP-02: 47 → 49. Cumulative T-MCP-08: 2 (unchanged). State-capture exceptions v2.52: **0**.

**Fire ledger this session:**
- Fire #1 (`6e2e6e19`): config_change for insights-worker forward-sync. Verdict partial / escalate=true. Two pushback points: byte-for-byte hash unverified, RPC dependencies unchecked. Both corrected_actions testable. Empirical verification path used; both resolved cleanly. PK approved Path A.
- Fire #2 (`b50182f3`): config_change for combined RPC migration orphan closure. Verdict agree / proceed / risk=low / confidence=high. 0 pushback points. Clean approve. 8 verified_claims acknowledged.

**Close-the-loop UPDATEs to `m.chatgpt_review`:** v2.52 adds 2 more (cumulative ~23+ pending). Carried as P3 backlog.

---

## 🤖 Cowork automation (D182)

**v2.52 status (carry from v2.51):** `docs/briefs/morning-inbox-sweep-v1.md` committed status=draft per PK hold. NOT scheduled in Cowork until PK amends and flips status=review_required.

**Existing Cowork status (unchanged):** Weekly reconciliation Mon 7am AEST + ICE Nightly Health Check daily 02:00 AEST. `docs/audit/health/2026-05-06.md` still absent — carry as P3 follow-up. Sunset review: 12 May 2026.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults + M5–M8 reconciliation | P1 TOP (v2.52) | S30 cleared v2.47; M5–M8 + defaults pending | PK | Review §11.4 items 3–9; confirm defaults via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M5–M8 reconciliation independent. |
| **F-YT-NY-FORMAT-SELECTION** | Brief committed `ff5ae6ae` | P1 | Newly unblocked v2.50 | chat → next session | Read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **AI cost view** (carry from v2.49) | `vw_ai_cost_monthly` view on `m.ai_job` + NOW dashboard tile | P3 → quick win Top 3 (v2.52) | Backlog | chat → next session | Author view DDL (read-only); add NOW dashboard tile. ~1h estimate. |
| **morning-inbox-sweep-v1 brief amendment** (carry from v2.51) | PK personal-email morning triage | P3 | DRAFT exists at `docs/briefs/morning-inbox-sweep-v1.md` (status=draft); held by PK pending amendment | PK → chat | PK reviews drafted brief; proposes amendments next session; chat applies amendments + flips status=review_required; PK schedules in Cowork. Calibration anchor: 2026-05-08 Crazy Domains $251/yr auto-renewal discovery. |
| **M6 Phase A** (carry-forward) | 108 historical Bug 3 dead-letter | P1 | NEWLY UNBLOCKED v2.50 | PK → chat → future session | Coordinate with M-09-03 view definition. |
| **Dashboard mobile responsiveness — system-wide** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session OR Phase 1+ | Either dedicated session OR roll into architecture review Phase 1+ build sequence. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock readiness | P3 | OBSERVED | chat → T05 unblock session | Plan cap-throttle / rate-limit handling. |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | Investigate downstream pathway. |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check; rename if appropriate. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates in `11_final_consolidation.md` §11.1 | chat → future session | Update `00_overview.md`. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 | chat → Phase 2 session | After Phase 0 + Phase 1: bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45 → v2.52 (**8th deferral**) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |

**Closed v2.52:** insights-worker P1 functional drift (commit `57daf877`); F-HEYGEN-RPC-MIGRATIONS-MISSING (commit `7555b98a`); F-INSIGHTS-RPC-MIGRATIONS-MISSING (commit `7555b98a` — logged + closed same session).

**Closed v2.51:** (none — lightweight session, no closures.)
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

**v2.52 carry from v2.51 (unchanged):**

- **Crazy Domains refund + clean-up follow-up** (carry from v2.51) — PK called CD on 2026-05-08; at least one invoice refund verbally confirmed in progress. Remaining clean-up still PK to action manually:
  1. Cancel Website Builder auto-renewal (saves ~$251/yr ongoing)
  2. Disable Premium DNS auto-renewal (saves $26/yr; move DNS to Cloudflare — free)
  3. Disable Domain Guard on .com auto-renewal (saves $9/yr)
  4. Before Nov 2026: transfer invegent.com to Cloudflare Registrar (~A$15/yr); transfer invegent.com.au to VentraIP or similar (~A$25–35/yr). Total ongoing cost ~A$40–50/yr vs current ~A$326/yr.
  5. Decline the $521/3yr renewal quote from CD.

  **Total annual saving once cleaned up: ~A$286/yr ongoing. Three-year saving: ~A$860.**

  Not chat scope — PK actions manually. Re-check status next session.

*(no other items flagged at v2.52 close — standing P0 to ask at next session start.)*

---

## 📌 Backlog

**v2.52 changes**:

- **CLOSED v2.52**: insights-worker P1 functional drift (commit `57daf877`).
- **CLOSED v2.52**: F-HEYGEN-RPC-MIGRATIONS-MISSING (commit `7555b98a`).
- **CLOSED v2.52**: F-INSIGHTS-RPC-MIGRATIONS-MISSING (commit `7555b98a` — logged + closed same session).
- **PROMOTED v2.52**: AI cost view P3 → Top-3 next session priority (PK directive).
- **CARRIED v2.52 (corrected count)**: Dashboard roadmap PHASES — **8th** consecutive deferral (was 7th in v2.51).
- **CARRIED v2.52**: All v2.51 items unchanged except the 3 closures.

**v2.51 changes** (still active where not closed v2.52): per v2.51.

**v2.50 changes** (still active where not closed v2.52): per v2.50.

**v2.49 changes** (still active): per v2.49.

**v2.48 changes** (still active): per v2.48.

**v2.47 changes** (still active): per v2.47.

**v2.46 changes** (still active): per v2.46.

**v2.45 + v2.44 + v2.43 + v2.42 + v2.41 + v2.40 + v2.39 + v2.38 + v2.37 + v2.36 + v2.35 + v2.34 + v2.33 changes**: per v2.47.

**Carried from v2.31**: per v2.47.

---

## 🧊 Frozen / Deferred

Unchanged.

---

## 🎓 Canonical Lessons

Unchanged from v2.51. Lesson #62 v2.50 refinement intact and applied this session (v2.52 D-01 fire #1).

---

## v2.52 honest limitations

- All v2.31–v2.51 limitations apply.
- **Memory at 30-edit cap pre-session.** v2.52 update folded carry-forward bits from v2.51 (Crazy Domains follow-up + morning-inbox-sweep-v1 brief status) into a single combined replacement entry — both threads still tracked but in compressed form.
- **Dashboard roadmap PHASES still stale** — **8th** consecutive deferral. Risk unchanged from v2.51: roadmap doesn't reflect Stage 2b ship, Stage 3 ship, P1 SD triage closure, insights-worker drift closure, or RPC migration orphan closures. Reconciliation will need a dedicated session.
- **21+ close-the-loop UPDATEs to `m.chatgpt_review`** still pending — v2.52 adds 2 more (this session's two D-01 fires); cumulative pending ~23+.
- **F-INSIGHTS-RPC-MIGRATIONS-MISSING was logged + closed same session.** No time elapsed for the finding to be reviewed before closure. Acceptable because (a) finding was discovered as a deterministic byproduct of D-01 pushback resolution, (b) closure mechanism (idempotent migration file) is independently safe regardless of finding-quality assessment.
- **Migration files NOT applied to production** via `apply_migration`. They are CC-reference / fresh-DB-rebuild artifacts only. The deployed objects already exist; migration files exist to make a fresh DB recreate them.
- **No D-01 fire for the v2.52 4-way sync close commit** — doc-only, no production state touch. Documented in protocol notes above.

---

## Changelog

- v1.0–v2.51: per previous changelog.
- **v2.52 (2026-05-08 Sydney, productive close):**
  - **insights-worker forward-sync** — Single-file replace of `supabase/functions/insights-worker/index.ts` from repo v1.6.0 to deployed v14.0.0 (commit `57daf877`, blob `41b29a63…`, 13476 B, byte-equivalent to deployed source). Closes P1 functional drift item with documented defects fixed by alignment to v14.0.0.
  - **D-01 fire #1** — `6e2e6e19`. Verdict partial / escalate=true. Two pushback points (byte-for-byte hash; RPC dependencies). Both corrected_actions testable. Empirical verification path used per Lesson #62 v2.50 refinement: re-fetched deployed source (MD5 `370ff4a1…` identical, exit 0); read-only DB introspection confirmed 3 orphan dependencies. PK approved Path A. NO state-capture exception fired.
  - **F-INSIGHTS-RPC-MIGRATIONS-MISSING (P2) NEW v2.52** — Logged during D-01 fire #1 pushback resolution. 3 deployed objects absent from repo migrations: `public.upsert_format_performance(uuid, text, integer, integer, numeric x5, uuid x2)`, table `m.post_format_performance`, column `m.post_draft.recommended_format`.
  - **Combined RPC migration orphan closure** — Two-file commit (`7555b98a`) closing F-HEYGEN-RPC-MIGRATIONS-MISSING (5 SECURITY DEFINER fns: 4 from heygen-avatar-poller v2.0.0 + 1 from heygen-avatar-creator v2.2.0 broadened in-session) and F-INSIGHTS-RPC-MIGRATIONS-MISSING (1 fn + 1 table + 1 column + 1 btree index + 2 FK guards). Files: `20260508003500_f_heygen_rpc_migrations_missing.sql` (5487 B) + `20260508003600_f_insights_rpc_migrations_missing.sql` (7307 B). All idempotent: CREATE OR REPLACE FUNCTION / CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / DO blocks with NOT EXISTS guards for FK adds. NO production DDL applied — files are CC-reference / fresh-DB-rebuild artifacts only.
  - **D-01 fire #2** — `b50182f3`. Verdict agree / proceed / risk=low / confidence=high. 0 pushback. Clean approve. 8 verified_claims acknowledged.
  - **Today/Next 5 rebuilt per PK directive**: Top 3 = Dashboard Architecture Review Phase 0 prerequisites (P1 TOP) → F-YT-NY-FORMAT-SELECTION (P1) → AI cost view (P3 quick win). Plus Personal businesses (P0 standing) + morning-inbox-sweep-v1 brief amendment (P3 carry).
  - **State-capture exception count v2.52: 0**.
  - **Closure budget**: ~1.5h chat. Day total v2.52: ~1.5h. Trailing-14-day ~54h above 8.0 floor. ~5 P0+P1 open of 20 cap (was ~6 v2.51).
  - **0 production mutations chat-side.** No SQL DDL/DML applied, no EF deploys, no cron changes, STANDING_THREE array unchanged. Hold-state respected throughout.
  - **Acceptance-integrity adherence**: Both production-touching commits verified post-push by re-fetching from GitHub. No acceptance asserted on summary signal alone.
  - **Carried**: Crazy Domains refund follow-up (Personal businesses); morning-inbox-sweep-v1 brief amendment (P3); Dashboard roadmap PHASES — **8th** consecutive deferral.
