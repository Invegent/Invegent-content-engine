# ICE — Action List

> **Single active action index for what's queued, in flight, blocked, or frozen.**
> Source-of-truth details remain in sync_state, run states, decisions, briefs, and commits.
> Read at the start of every session alongside `docs/00_sync_state.md`.
>
> Last updated: 2026-05-08 Sydney (v2.51 — lightweight close. Personal finance interlude (Crazy Domains $251/yr auto-renewal bleed identified, refund in progress) + morning-inbox-sweep-v1 Cowork brief authored, committed status=draft per PK hold-pending-amendment. 0 production mutations. No D-01 fire (doc-only bump). Today/Next 5 carries unchanged from v2.50.)

---

## How this file works

**At session start**, chat reads this file and:
1. Rebuilds the Today / Next 5 view
2. Runs Standing checks (S1–S29)
3. **Verifies D186 closure budget**
4. Asks PK about Personal businesses
5. Surfaces Time-bound items due today/tomorrow

**Standing rule (D-01)**: every production patch + action_list version bump that touches production state goes through ChatGPT cross-check before deploy/commit. **v2.51 application**: 0 D-01 fires — v2.51 is documentation-only (1 new draft brief, 1 new Active row, 1 new Personal businesses entry). No production mutations, no schema changes, no EF changes, no cron changes. Per protocol, doc-only bumps with no production state touch don't require a fire.

**Standing rule (D-186)**: closure work has a hard time budget. 20-finding cap on P0+P1 open items + 4h/week closure floor + 2-week pause trigger.

**Standing rule (D-YT-OAUTH-1, v2.39)**: invegent-dashboard `/connect` first for FB/IG/LI/YT OAuth reconnects.

**Standing rule (D-PREV-16, v2.40)**: F-EF-DRIFT-PREVENTION Option F is approved target design. Stage 1 closed v2.41. Stage 2a closed v2.44. Stage 2a verified end-to-end via S30 v2.47. Stage 2b CLOSED v2.48. Stage 3 CLOSED v2.49. **P1 SECURITY-DEFINER triage CLOSED v2.50** with three sync-only commits.

**STANDING RULE (Lesson #62, v2.41 + v2.50 refinement)**: When ChatGPT MCP echoes Claude's self-disclosed weak evidence as objections, default is NOT automatic state-capture override. **v2.50 refinement**: When the corrected_action is **low-cost and testable**, prefer empirical verification over override. When the corrected_action is **non-testable** (vague, tautological, no concrete acceptance criteria), override remains the default with PK approval as state-capture exception per existing protocol.

**STANDING RULE (Lesson candidate #68, v2.43)**: All fired writes must be tracked inline.

**STANDING RULE (v2.46 — Dashboard Architecture Review)**: All architecture-level decisions live in `docs/dashboard-review-2026-05/`. Reopen triggers in `11_final_consolidation.md` §11.7. Amendment-doc protocol at `docs/dashboard-review-2026-05/amendments/`.

**STANDING RULE (v2.47 — Documentation framing)**: Sync_state framing of cron timing always anchors to **UTC clock-time + Sydney clock-time** for the upcoming fire window, not "tonight" without qualifier.

**STANDING RULE (v2.48 — Pre-flight discovery as standard CC pattern)**: §1.5-style pre-flight discovery (verify route convention, auth gate, UI library, schema column names, against actual repo + database before coding) is now the default brief pattern for any CC dashboard/portal/web/script work.

**STANDING RULE (v2.50 — Acceptance integrity)**: Acceptance is not complete until the actual review artifact is received and reviewed, regardless of artifact type. A "looks good" / "passed" / "matches" signal alone is NOT sufficient to declare acceptance. Chat does not advance state, close items, or trigger sync close on the basis of an unverified summary.

---

## 📊 Closure budget tracking (per D186)

| Metric | Current | Limit | Status |
|---|---|---|---|
| Open findings + investigations (P0+P1) | ~6 (unchanged from v2.50) | 20 | ✅ within budget |
| Trailing-14-day closure hours | ~52.5h | 8.0 floor | ✅ above floor |
| Pause trigger active? | NO | — | New automation authoring still allowed |

**This session's closure hours: ~0.5h** (personal finance analysis + brief authoring + session close).

**Day total v2.51: ~0.5h.**

**State-capture exception count v2.51: 0** (no D-01 fires this session).

---

## ⭐ Today / Next 5 — REBUILD AT EVERY SESSION START

> **Last rebuilt:** 2026-05-08 Sydney (v2.51).
> **This session: lightweight close — personal finance interlude + draft Cowork brief. Today/Next 5 unchanged from v2.50.**

| Rank | Item | Priority | Why now | Next action |
|---|---|---|---|---|
| 1 | **insights-worker P1 functional drift** | **P1 TOP** | NEWLY UNBLOCKED v2.50 (was sequenced after triage trio) | PK reviews deployed source v14.0.0 vs repo v1.6.0. D-PREV-07: manual review, no auto-sync. |
| 2 | **Personal businesses check-in** | P0 | Standing P0. v2.51 added: Crazy Domains refund follow-up | PK reports any time-sensitive items from Care for Welfare / Property Buyers Agent / NDIS Accessories + Crazy Domains clean-up status. |
| 3 | **Dashboard Architecture Review Phase 0 prerequisites** | P1 | Independent of #1 timeline; can run in parallel | PK confirms 7 default-blockers via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M5–M8 reconciliation independent. |
| 4 | **F-HEYGEN-RPC-MIGRATIONS-MISSING** (carry from v2.50) | P2 | Cheap closure adjacent to recent work; resolves orphan-deployed RPC drift | `pg_get_functiondef` (read-only) on the 4 RPCs → single migration file → commit. ~30 min. |
| 5 | **AI cost view P3** (carry from v2.49) | P3 | Cheap closure from ruflo analysis 6 May | Author `vw_ai_cost_monthly` on `m.ai_job` + NOW dashboard tile. ~1h estimate. |

**Carry-forward unchanged from v2.50.**

---

## 🟢 F-EF-DRIFT-PREVENTION — STATUS BLOCK (unchanged from v2.50)

**Stage status:**
- Stage 1: CLOSED v2.41
- Stage 2a: CLOSED v2.44; verified end-to-end via S30 v2.47
- Stage 2b: CLOSED v2.48 — `dashboard.invegent.com/ef-drift` live, 5/5 SQL + 7/7 PK visual PASS
- Stage 3: CLOSED v2.49 — `scripts/safe-deploy.sh` live, A1–A8 PASS
- P1 SECURITY-DEFINER triage: CLOSED v2.50 — 3 sync-only commits as closure artifacts

**Cron status (all live):**
- jobid 80 `drift-check-daily-fire` — `0 17 * * *` UTC, `active=true`
- jobid 81 `ef-drift-log-retention-90d` — `15 17 * * *` UTC, `active=true`
- 7-8 May fire window: 17:00 UTC 7 May = 03:00 AEST 8 May Sydney — should have grown `m.ef_drift_log` from 147 → 196 rows. Verifiable next session if needed.

**Adjacent open finding (carry from v2.50):**
- F-HEYGEN-RPC-MIGRATIONS-MISSING (P2) — ~30 min next session.

---

## 🟢 ICE Dashboard Architecture Review — STATUS BLOCK

**Status:** COMPLETE at v2.46. 12 docs at `docs/dashboard-review-2026-05/`.

**v2.51 update on hard blockers (unchanged from v2.50):**
- ✅ S30 cleared v2.47 — first hard blocker DONE.
- 🔲 M5–M8 reconciliation — second hard blocker still pending.
- 🔲 7 Phase 0 confirmation-blocker defaults — pending PK confirm/override.

**Phase 0 still gated.**

---

## 🟢 Tier 1 + M4 + M5 + F-YT-OAUTH-PP queue integrity & stability remediation — STATUS BLOCK

Unchanged from v2.50. M6–M8 still pending. M6 Phase A unblocked since v2.50.

---

## 🔄 Standing session-start checks

S1–S29 unchanged. S30 closed PASS v2.47.

---

## 🔴 Time-bound (calendar-driven deadlines)

Unchanged from v2.50.

---

## 🛠 Meta-tooling — ChatGPT Review MCP (T-MCP-02 quota at 47 of 5)

**v2.51 application**: 0 D-01 fires this session (doc-only bump, no production patch). Cumulative T-MCP-02: 47 (unchanged). Cumulative T-MCP-08: 2 (unchanged). State-capture exceptions v2.51: 0.

---

## 🤖 Cowork automation (D182)

**v2.51 NEW DRAFT**: `docs/briefs/morning-inbox-sweep-v1.md` committed status=draft per PK hold. Daily 06:00 AEST personal-email triage sweep. Read-only Gmail. Three-bucket classifier (URGENT/FYI/NOISE). Calibration anchor: 2026-05-08 Crazy Domains discovery. NOT scheduled in Cowork until PK amends and flips status=review_required.

**Existing Cowork status (unchanged):** Weekly reconciliation Mon 7am AEST + ICE Nightly Health Check daily 02:00 AEST. `docs/audit/health/2026-05-06.md` still absent — carry as P3 follow-up. Sunset review: 12 May 2026.

---

## 🟡 Active

| ID | Item | Priority | Status | Owner | Next action |
|---|---|---|---|---|---|
| **insights-worker P1 functional drift** | Deployed v14.0.0 vs repo v1.6.0 | P1 TOP | NEWLY UNBLOCKED v2.50 | PK | PK reviews deployed source. |
| **Dashboard Architecture Review Phase 0 prerequisites** | 7 confirm-defaults + M5–M8 reconciliation | P1 | S30 cleared v2.47; M5–M8 + defaults pending | PK | Review §11.4 items 3–9; confirm defaults via `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`. M5–M8 reconciliation independent. |
| **F-HEYGEN-RPC-MIGRATIONS-MISSING** (carry from v2.50) | 4 RPCs called by heygen-avatar-poller v2.0.0 not in repo migrations | P2 | NEW v2.50 | chat → next session | `pg_get_functiondef` (read-only) on 4 RPCs → write single migration file → commit. ~30 min. |
| **morning-inbox-sweep-v1 brief amendment** (NEW v2.51) | PK personal-email morning triage | P3 | DRAFT exists at `docs/briefs/morning-inbox-sweep-v1.md` (status=draft); held by PK pending amendment | PK → chat | PK reviews drafted brief; proposes amendments in next session; chat applies amendments + flips status=review_required; PK schedules in Cowork. Calibration anchor: 2026-05-08 Crazy Domains $251/yr auto-renewal discovery. Pre-amendment checklist included in brief itself. |
| **F-YT-NY-FORMAT-SELECTION** (carry-forward) | Brief committed `ff5ae6ae` | P1 | NEWLY UNBLOCKED v2.50 | chat → future session | Read v2.11.1 source post-build; locate `format-advisor-v1`; decide between 4 fix shapes. |
| **M6 Phase A** (carry-forward) | 108 historical Bug 3 dead-letter | P1 | NEWLY UNBLOCKED v2.50 | PK → chat → future session | Coordinate with M-09-03 view definition. |
| **AI cost view** (carry from v2.49) | `vw_ai_cost_monthly` view on `m.ai_job` + NOW dashboard tile | P3 | Backlog | chat → future session | Author view DDL (read-only); add NOW dashboard tile. ~1h estimate. |
| **Dashboard mobile responsiveness — system-wide** | Whole-dashboard gap | P3 | OBSERVED | chat → dedicated session OR Phase 1+ | Either dedicated session OR roll into architecture review Phase 1+ build sequence. |
| **47 v4 mismatch queue rows** (M6 Phase B) | Pre-M4 legacy artifacts | P3 | Sequenced after M6 Phase A | Backlog | After M6 Phase A. |
| **F-PUB-009 V3-V5 + 7-day flow** | Forward acid-test | P2 | Passive monitoring | chat → next session | Continue passive monitoring. |
| **Invegent IG cap-throttle planning** | jobid 53 unblock readiness | P3 | OBSERVED | chat → T05 unblock session | Plan cap-throttle / rate-limit handling. |
| **CFW post-ai-worker dead drafts** | Drafts dying after AI succeeds | P3 | OBSERVED | chat → future session | Investigate downstream pathway. |
| **Vault `service_role_key` naming hygiene** | 15-char value; misleadingly named | P3 | OBSERVED | chat → future session | Read-only scope-check; rename if appropriate. |
| **`docs/audit/health/2026-05-06.md` follow-up** | Cowork 02:00 AEST cron 6 May did not push | P3 | Carried | chat → next session if still absent | Investigate Cowork status. |
| **`00_overview.md` 11-section table reconciliation** | Architecture review changed actual section structure | P3 | Required updates in `11_final_consolidation.md` §11.1 | chat → future session | Update `00_overview.md`. ~15 min. |
| **F-AAP-NEEDS-REVIEW-BACKLOG** | 28 drafts pending review | P2 | Closure target = architecture review Phase 2 B-09-14 | chat → Phase 2 session | After Phase 0 + Phase 1: bulk approve UI in Phase 2. |
| **Dashboard roadmap PHASES reconciliation** | PHASES array stale since 3 May | P3 | Carried v2.45 → v2.51 (**7th deferral**) | chat → dedicated session | Open `app/(dashboard)/roadmap/page.tsx` and bring PHASES + LAST_UPDATED current. |
| **F-AI-WORKER-PARSER-SKIP-BUG V4** | Forward acid-test inconclusive | P2 | Passive monitoring | chat → future | V4 needs natural skip event OR synthetic test. |

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

**v2.51 NEW entry:**

- **Crazy Domains refund + clean-up follow-up** (NEW v2.51) — PK called CD on 2026-05-08; at least one invoice refund verbally confirmed in progress. Remaining clean-up still PK to action manually:
  1. Cancel Website Builder auto-renewal (saves ~$251/yr ongoing)
  2. Disable Premium DNS auto-renewal (saves $26/yr; move DNS to Cloudflare — free)
  3. Disable Domain Guard on .com auto-renewal (saves $9/yr)
  4. Before Nov 2026: transfer invegent.com to Cloudflare Registrar (~A$15/yr); transfer invegent.com.au to VentraIP or similar (~A$25–35/yr). Total ongoing cost ~A$40–50/yr vs current ~A$326/yr.
  5. Decline the $521/3yr renewal quote from CD.

  **Total annual saving once cleaned up: ~A$286/yr ongoing. Three-year saving: ~A$860.**

  Not chat scope — PK actions manually. Re-check status next session.

*(no other items flagged at session start — standing P0 to ask at next session start.)*

---

## 📌 Backlog

**v2.51 changes**:

- **NEW v2.51 (P3)**: morning-inbox-sweep-v1 brief amendment task (Active table). Daily 06:00 AEST personal-email triage Cowork brief drafted at `docs/briefs/morning-inbox-sweep-v1.md` (status=draft per PK hold).
- **NEW v2.51 (Personal businesses)**: Crazy Domains refund + clean-up follow-up. ~A$286/yr saving once actioned.
- **CARRIED v2.51 (corrected count)**: Dashboard roadmap PHASES — **7th** consecutive deferral (was 6th in v2.50).
- **CARRIED v2.51**: All v2.50 items unchanged.

**v2.50 changes** (still active): per v2.50.

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

Unchanged from v2.50. Lesson #62 v2.50 refinement intact.

---

## v2.51 honest limitations

- All v2.31–v2.50 limitations apply.
- **Crazy Domains refund verbal confirmation only** — PK reported a refund in progress on the call. No email confirmation cited. If the refund doesn't appear within 5–7 business days, follow up via the Crazy Domains web form for a paper trail.
- **morning-inbox-sweep-v1 pre-flight unverified** — the brief assumes a single Gmail account but `pk@invegent.com` may be a separate Workspace account. Confirmation deferred to first run rather than pre-checked. Brief documents this honestly as a pre-flight question.
- **Dashboard roadmap PHASES still stale** — 7th consecutive deferral. Risk unchanged from v2.50: roadmap doesn't reflect Stage 2b ship, Stage 3 ship, P1 SD triage closure, or any recent work.
- **21+ close-the-loop UPDATEs to `m.chatgpt_review`** still pending — v2.51 adds 0 (no fires this session); cumulative pending unchanged at 21+.
- **No D-01 fire for v2.51 bump** — doc-only, no production state touch. Documented in protocol notes above. If PK prefers fires for all version bumps regardless of production touch, raise next session.

---

## Changelog

- v1.0–v2.50: per previous changelog.
- **v2.51 (2026-05-08 Sydney, lightweight close):**
  - **Personal finance interlude** — PK Crazy Domains $521/3yr renewal quote analysed. Identified $251/yr Website Builder auto-renewal bleed (started Nov 25 free trial, auto-converted Feb 26) + $26/yr Premium DNS + Domain Guard ×2 fluff. PK called CD; ≥1 invoice refund verbally confirmed in progress. Total annual saving once cleaned up: ~A$286/yr.
  - **NEW Cowork brief drafted** at `docs/briefs/morning-inbox-sweep-v1.md` — daily 06:00 AEST personal-email triage. Tier 0 read-only Gmail. Three-bucket classifier (URGENT / FYI / NOISE). Self-addressed email ping as only write action. Calibration anchor: 2026-05-08 Crazy Domains discovery. **Status=draft** per PK hold-pending-amendment. Pre-amendment checklist included in brief itself.
  - **NEW Active row**: morning-inbox-sweep-v1 brief amendment (P3).
  - **NEW Personal businesses entry**: Crazy Domains refund + clean-up follow-up.
  - **No D-01 fire** — doc-only bump (no production patch, no schema change, no EF change, no cron change).
  - **State-capture exception count v2.51: 0**.
  - **Closure budget**: ~0.5h chat. Day total v2.51: ~0.5h. Trailing-14-day ~52.5h above 8.0 floor. ~6 P0+P1 open (unchanged from v2.50).
  - **Today/Next 5**: unchanged from v2.50.
  - **Carried**: Dashboard roadmap PHASES — 7th consecutive deferral.
  - **0 production mutations chat-side.** No SQL DDL/DML, no EF deploys, no cron changes, STANDING_THREE array unchanged. Hold-state respected throughout.
