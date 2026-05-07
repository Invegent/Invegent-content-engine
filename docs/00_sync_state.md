# ICE — Sync State Index

> **This file is the lightweight session pointer index.** It never grows large. Per-session detail lives at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`.
>
> Restructured 2026-05-03 (G1) after two giant-file-rewrite truncation incidents in 24h. See `docs/runtime/archive/sync_state-pre-2026-05-03.md` for the frozen pre-restructure history.

---

## ⚠️ Session-start reading order (per memory entry 1)

1. **`docs/00_sync_state.md`** (this file) — pointer index + last 1-2 sessions inlined
2. **`docs/00_action_list.md`** — running queued/active/blocked/frozen backlog
3. Open the most-recent session file from the index below if deeper context is needed

---

## 📚 Session index (reverse chronological)

| Date | Slug | Headline | File |
|---|---|---|---|
| 2026-05-07 | stage3-safe-deploy | **Stage 3 SHIPPED + VERIFIED (v2.49).** `scripts/safe-deploy.sh` live. CC commit `3d43796`. §1.5 schema delta adapted (`function_name` → `slug`, `class` → `current_class`); curl + `exec_sql` RPC connection method (CLI v2.75 has no ad-hoc SQL subcommand, psql not installed). All 8 acceptance tests PASS. Above-spec defensive additions: SQL-injection guard, standing-three pre-DB ordering, unknown-class fallback. 2 D-01 fires (brief + read-only verification, both PASS). T-MCP-02 42 → 44. P1 SECURITY-DEFINER triage trio NEWLY UNBLOCKED. v2.49 manifest folded: 5th-deferral correction, visual-acceptance integrity standing rule, AI cost view P3, cc-0001 parenthetical. Hold-state respected; 0 production mutations chat-side. | `docs/runtime/sessions/2026-05-07-stage3-safe-deploy.md` |
| 2026-05-07 | stage2b-shipped-accepted | **Stage 2b SHIPPED + ACCEPTED on desktop (v2.48).** CC commit `66aea99` (dashboard) + `9564297` (result file). Live at `dashboard.invegent.com/ef-drift`. 5/5 SQL V1–V5 PASS. PK visual acceptance 7/7 desktop checks PASS. Pre-flight (§1.5) deltas: no `/admin/*` group; single-tier middleware auth; Tailwind+lucide. Mobile responsiveness bucketed system-wide P3. Stage 3 + P1 SECURITY-DEFINER triage trio NEWLY UNBLOCKED. F-YT-NY-FORMAT-SELECTION + M6 Phase A still BLOCKED behind P1 triage. Hold-state respected; 0 production mutations chat-side. `m.ef_drift_log` 147 rows. | `docs/runtime/sessions/2026-05-07-stage2b-shipped-accepted.md` |
| 2026-05-07 | s30-pass-stage2b-kickoff | **S30 PASS + Stage 2b kickoff (v2.47).** Cron-backed drift logging confirmed live: jobid 80 fired, succeeded, wrote 49 rows under `c3446a47`. `m.ef_drift_log` 98 → 147. All 8 S30 criteria PASS. Stage 2b brief authored. T-MCP-02 41 → 42. 0 production mutations. | `docs/runtime/sessions/2026-05-07-s30-pass-stage2b-kickoff.md` |
| 2026-05-07 | dashboard-architecture-review-completion | **Dashboard Architecture Review COMPLETE.** 12 docs at `docs/dashboard-review-2026-05/`. 5-section IA Option B locked. HYBRID Brief locked. 6 product primitives at contract level. 17 build-blockers as PK execution checklist (§11.4). 5-phase implementation plan ~44–54h. | `docs/runtime/sessions/2026-05-07-dashboard-architecture-review-completion.md` |
| 2026-05-07 | s30-paused-stuck-cluster-recheck | Lightweight checkpoint. PP×YT + LinkedIn-PP clusters CLEARED; NY×YT STILL BLOCKED. F-AI-WORKER-PARSER-SKIP-BUG V3+V5 PASS, V4 INCONCLUSIVE. | `docs/runtime/sessions/2026-05-07-s30-paused-stuck-cluster-recheck.md` |
| 2026-05-07 | stage2a-cron-applied | F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED. Two crons live (jobid 80 + 81). | `docs/runtime/sessions/2026-05-07-stage2a-cron-applied.md` |
| 2026-05-07 | bef6be96-investigation-resolved | bef6be96 origin RESOLVED. Stage 2a UNBLOCKED. Lesson candidate #68. | `docs/runtime/sessions/2026-05-07-bef6be96-investigation-resolved.md` |
| 2026-05-06 | f-ef-drift-prevention-stage2a-checkpoint | Stage 2a CHECKPOINT. drift-check EF v1.0.8 deployed. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md` |
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | Stage 1 APPLIED. 3 D-01 fires. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | Tier 2 inventory LOCKED. Option F APPROVED. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED via dashboard `/connect`. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 APPLIED. 7/7 PASS. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 APPLIED. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | M1+M2+M3 applied. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | Dashboard review kickoff. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | ai-worker v2.11.1; F-AAP-007 v2; F-PUB-009. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | B-AUDIT-CHECK5-DRIFT retired. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 + runbook v2.1. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied. | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | F-AAP-001 + F-AAP-002 + B-AUDIT-V4-PEERS clean. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-07 Sydney — Stage 3 SHIPPED + VERIFIED (v2.49)

**Outcome:** F-EF-DRIFT-PREVENTION Stage 3 closed end-to-end. `scripts/safe-deploy.sh` is now the canonical pre-deploy gate. CC executed brief in ~14 min. All 8 acceptance tests PASS. Two D-01 fires (brief + read-only verification of result), both PASS. P1 SECURITY-DEFINER triage trio newly executable using the tool we just built.

**CC execution:**
- Brief commit: `3f1135b9` (chat) → implementation commit: `3d43796` (CC).
- Files: `scripts/safe-deploy.sh` (mode 100755, 9095 bytes) + `scripts/README.md` (1590 bytes). No other files modified.
- §1.5 pre-flight deltas, all documented in commit body:
  - **§1.5.1** shebang `#!/bin/bash` + `set -euo pipefail` per existing scripts; no root `package.json` so no npm-script alias
  - **§1.5.2** CLI v2.75 has no ad-hoc SQL subcommand; psql not installed; **adopted method (c) curl + `exec_sql` RPC**. Required env `SUPABASE_SERVICE_ROLE_KEY`; optional env `SUPABASE_PROJECT_REF`.
  - **§1.5.3 SCHEMA DELTA (significant)** — brief assumed columns `function_name` and `class`; actual columns are **`slug` and `current_class`**. Adapted per §1.5 step 5 mandate. Documented in script header AND README.
  - **§1.5.4** standing-three slug values match exactly. All three currently class B-RR severity P1 with `security_definer_regression_risk=true`.

**Above-spec defensive additions (CC, net-positive):**
- SQL-injection guard via regex `^[A-Za-z0-9_-]+$` on `<ef_name>` before SQL interpolation
- Standing-three check fires BEFORE pre-flight — block holds even if Supabase is down or schema check fails
- Default case for unknown future class values — surfaces as WARN, treats as advisory PASS

**A1–A8 acceptance — all PASS:**
- A1: usage + exit 1
- A2–A4: standing-three synthetic JSON + BLOCK exit 2 (`draft-notifier`, `heygen-avatar-creator`, `heygen-avatar-poller`)
- A5: `insights-worker` B-RR row JSON + BLOCK exit 1
- A6: same row + WARN + PASS exit 0 (`--allow-warn`)
- A7: `nonexistent-fn` PASS class=none exit 0
- A8: git index mode 100755

**D-01 fires (2):**
- Brief D-01: `39a588d4-3fb4-41e4-a5a4-07916b6d64c7` — verdict agree, risk medium, 0 pushback
- Result D-01 (read-only verification): `82aff9d3-5176-41e9-9102-71f30a90e130` — verdict agree, risk **LOW** (downgraded — implementation strictly safer than contract), 0 pushback
- T-MCP-02 cumulative 42 → 44

**v2.49 sync close manifest folded in:**
- **Sequence-honesty cleanup**: dashboard roadmap PHASES carry-forward bumped 4th → **5th** consecutive deferral; NEW standing rule on visual-acceptance integrity; honest-limitation bullet added re: v2.48 premature acceptance documentation.
- **AI cost view P3** (from ruflo analysis 6 May): NEW Active row — `vw_ai_cost_monthly` view on `m.ai_job` + NOW dashboard tile. ~1h estimate.
- **cc-0001 status note**: parenthetical added to existing tracked Phase 0 row noting brief-runner-v0 cycle #1 (`docs/briefs/cc-0001-dashboard-phase-0-defaults.md`) open and unexecuted. No new tracking row.

**Hold-state respected throughout.** 0 production mutations chat-side. Standing-three not redeployed; merely encoded as gate logic in the new script.

**Closure budget:** ~1.0h chat. Day total v2.47+v2.48+v2.49 ~4.5h. Trailing-14-day ~50.5h above 8.0 floor.

**Closures this session:**
- F-EF-DRIFT-PREVENTION Stage 3 → CLOSED (`scripts/safe-deploy.sh` live + verified)

**Newly unblocked:**
- **P1 SECURITY-DEFINER regression-risk triage trio** — next session can use `safe-deploy.sh --check-only` against each to confirm BLOCK, then sync repo → deployed source via Windows CLI as sync-only commits
- **insights-worker P1 functional drift manual review** — sequenced after triage trio

**4-way sync close at this commit:**
- Session file: `docs/runtime/sessions/2026-05-07-stage3-safe-deploy.md`
- Sync state (this file): refreshed
- Action list: v2.49 bump (Stage 3 closed; P1 SD triage promoted to TOP; AI cost view P3 added; sequence-honesty corrections folded in)
- Memory: v2.49 entry committed separately

**Open from this session:**
- Mobile responsiveness — whole dashboard (carried P3)
- Dashboard roadmap PHASES — **5th** consecutive deferral (sequence-honesty corrected)
- 18+ close-the-loop UPDATEs to `m.chatgpt_review`

---

## 🟡 Next session priorities (rebuilt for v2.49)

1. **P1 SECURITY-DEFINER regression-risk triage** (P1 TOP, NEWLY UNBLOCKED) — use `safe-deploy.sh --check-only` against `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` to confirm BLOCK; then sync repo → deployed source via Windows CLI as sync-only commits.
2. **insights-worker P1 functional drift** (P1) — manual review by PK. After triage trio.
3. **Personal businesses check-in** (P0).
4. **Dashboard Architecture Review Phase 0 prerequisites** (P1) — 7 confirm-defaults via `cc-0001-dashboard-phase-0-defaults.md` + M5–M8 reconciliation. Independent of triage timeline; can run in parallel.
5. **F-YT-NY-FORMAT-SELECTION** (P1) — unblocks after #1.
6. **M6 Phase A** (P1) — unblocks after #1.
7. **AI cost view P3** (NEW v2.49) — `vw_ai_cost_monthly` + NOW dashboard tile. ~1h.
8. **Dashboard mobile responsiveness — system-wide** (P3).
9. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts.
10. **F-PUB-009 7-day flow check** (P2).
11. **F-AI-WORKER-PARSER-SKIP-BUG V4** — inconclusive.
12. **Vault `service_role_key` naming hygiene scope-check** (P3).
13. **`docs/audit/health/2026-05-06.md` follow-up** (P3, still absent).
14. **18+ close-the-loop UPDATEs** to `m.chatgpt_review` — next batch closure.
15. **Dashboard roadmap reconciliation** (P3, **5th** consecutive deferral).
16. **`00_overview.md` 11-section table reconciliation** (P3, carry from v2.46).

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 (`instagram-publisher-every-15m`) `active=false` — do not re-enable until S16 + T05; ~104 IG-overdue posts will fire when re-enabled
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- 18+ review_ids close-the-loop pending
- 47 historic dead queue rows retained as audit trail
- 32 historical `post_draft_not_found` orphans (16 NY-FB + 16 PP-FB) — M6 Phase A scope (BLOCKED)
- 6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts` — quiescent
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design
- NDIS-Yarns LinkedIn slot `8f9e5c57-…` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 — punted to Cycle 3
- 108 historical Bug 3 fingerprint queue rows — M6 Phase A scope (BLOCKED)
- queue_id `ad573844-…` — dead-lettered; do not re-queue
- 47 v4-origin queue rows still mismatch slot intent — M6 Phase B scope
- 160 records previously flagged is_shadow=true lost flag metadata — acceptable
- 2 NY×YT avatar test drafts (a501aa6a, 80d8d2b7) from 2026-04-09 — latent
- `is_shadow: true` JSONB residue in `m.post_draft.draft_format.ai`
- 13 drift cases active in priority buckets (v2.40 inventory)
- 2 repo-only directories (ai-diagnostic, linkedin-publisher) — do not deploy or remove without PK direction
- `docs/audit/health/2026-05-06.md` absent — Cowork did not push 6 May. P3.
- **Cron-backed drift logging is LIVE.** jobid 80 + 81 active=true. Next fire 2026-05-07 17:00 UTC = 03:00 AEST 8 May.
- **`m.ef_drift_log` retains 147 rows.** Keep-both per PK v2.43 decision. Do not delete.
- **3 distinct `drift_check_run_id` values** (`bef6be96` + `a2124145` + `c3446a47`).
- **drift-check v1.0.8 LIVE.**
- **Standing don't-redeploy** for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier` — confirmed via cron-driven scan AND now mechanically encoded in `scripts/safe-deploy.sh` STANDING_THREE array.
- **Vault `service_role_key` 15-char value.** Confirmed non-blocking for drift-check. P3 hygiene cleanup logged.
- **Dashboard roadmap PHASES array stale since 3 May. FIFTH consecutive deferral** (corrected v2.49 from prior "fourth" framing per sequence-honesty cleanup).
- **v2.49: `scripts/safe-deploy.sh` LIVE.** Pre-deploy gate consuming `m.vw_ef_drift_current`. Hard-blocks standing three. CC commit `3d43796`. All 8 acceptance tests PASS. Read-only D-01 verification PASS.
- **v2.49: P1 SECURITY-DEFINER triage UNBLOCKED.** Sequenced for next session. Use `safe-deploy.sh` as the gate.
- **v2.49 NEW STANDING RULE — Visual acceptance integrity.** Visual acceptance is not complete until the actual visual review artifact (screenshot, screen recording, or equivalent direct visual confirmation) is received and reviewed. A "looks good" signal alone is NOT sufficient to declare acceptance. Chat does not advance state, close items, or trigger sync close on the basis of an unverified visual signal.
- **v2.49 honest limitation — v2.48 premature acceptance documentation.** Stage 2b acceptance was declared in chat ahead of the actual visual review artifact arriving; subsequent screenshots reconciled the claim post-hoc. Documentation gap noted: chat sequenced the v2.48 close with "5/5 SQL PASS → declared accept → committed → screenshots → 7/7 visual PASS post-hoc → correction commit reconciles." Standing rule above prevents recurrence.
- **v2.49 NEW (P3) — AI cost view.** `vw_ai_cost_monthly` on `m.ai_job` + NOW dashboard tile. Concept from ruflo analysis 6 May (`ruflo-cost-tracker` plugin). ~1h estimate. Logged in action_list Active table.
- **v2.48: Stage 2b SHIPPED + ACCEPTED on desktop.** Live at `dashboard.invegent.com/ef-drift`. CC commits `66aea99` (dashboard) + `9564297` (result file). 5/5 SQL + 7/7 PK visual checks PASS.
- **v2.46: Dashboard Architecture Review COMPLETE.** 12 docs at `docs/dashboard-review-2026-05/`. 17 build-blockers. Phase 0 prerequisites: S30 cleared v2.47; M5–M8 reconciliation + 7 confirm-defaults remain. cc-0001 brief-runner-v0 cycle #1 open and unexecuted at `docs/briefs/cc-0001-dashboard-phase-0-defaults.md`.
- **v2.46: `00_overview.md` 11-section table out-of-sync.** Required updates in `11_final_consolidation.md` §11.1.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-07 Sydney — Stage 3 SHIPPED + VERIFIED (v2.49). `scripts/safe-deploy.sh` live; 8/8 acceptance PASS; read-only D-01 PASS. P1 SECURITY-DEFINER triage NEWLY UNBLOCKED. v2.49 manifest folded: 5th-deferral correction, visual-acceptance integrity standing rule, AI cost view P3, cc-0001 parenthetical.*
