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
| 2026-05-08 | personal-finance-cowork-inbox-brief | **Lightweight close (v2.51).** Personal finance interlude: PK Crazy Domains $521/3yr renewal quote analysed; identified $251/yr Website Builder auto-renewal bleed (Nov 25 free trial → Feb 26 auto-convert) + $26/yr Premium DNS + $18/yr Domain Guard ×2 fluff. PK called CD; ≥1 refund verbally in progress. Total annual saving once cleaned up: ~A$286. NEW Cowork brief drafted: `morning-inbox-sweep-v1` (daily 06:00 AEST personal-email triage; Tier 0 read-only Gmail; URGENT/FYI/NOISE classifier; calibration anchor=Crazy Domains discovery; money-out flags every match regardless of amount). Brief committed status=draft per PK hold-pending-amendment. Logged P3 in Active. NEW Personal businesses entry: CD refund + clean-up follow-up. No D-01 fire (doc-only bump). 0 production mutations chat-side. Today/Next 5 unchanged from v2.50. | `docs/runtime/sessions/2026-05-08-personal-finance-cowork-inbox-brief.md` |
| 2026-05-07 | p1-sd-triage-sync | **P1 SECURITY-DEFINER triage CLOSED (v2.50).** All 3 standing-three EFs now repo-aligned to deployed source via sync-only commits: `a83ab4c0` (draft-notifier, 77 lines, UNDER threshold), `448eeb30` (heygen-avatar-creator, 86 lines, UNDER), `5aefd6e6` (heygen-avatar-poller, 269 lines, OVER cond i; held → diff reviewed in chat against actual artifact → PK approved). 3 D-01 fires: `32ade261` advisory partial → STEP C.5 adopted; `9cbc7de3` verification partial → corrected_action verified empirically (surfaced orphan-RPC finding); `4a48024f` sync-close partial → non-testable corrected_action, PK override approved (state-capture exception). NEW finding F-HEYGEN-RPC-MIGRATIONS-MISSING P2. NEW standing rule: acceptance integrity (generalised from v2.49 visual-acceptance integrity). Lesson #62 refinement: testable corrected_action → verify; non-testable → override. T-MCP-02 44 → 47. State-capture exceptions v2.50: 1. 0 production mutations chat-side. | `docs/runtime/sessions/2026-05-07-p1-sd-triage-sync.md` |
| 2026-05-07 | stage3-safe-deploy | **Stage 3 SHIPPED + VERIFIED (v2.49).** `scripts/safe-deploy.sh` live. CC commit `3d43796`. §1.5 schema delta adapted; curl + `exec_sql` RPC connection method. All 8 acceptance tests PASS. T-MCP-02 42 → 44. P1 SECURITY-DEFINER triage trio NEWLY UNBLOCKED. Hold-state respected; 0 production mutations chat-side. | `docs/runtime/sessions/2026-05-07-stage3-safe-deploy.md` |
| 2026-05-07 | stage2b-shipped-accepted | **Stage 2b SHIPPED + ACCEPTED on desktop (v2.48).** CC commit `66aea99` + `9564297`. Live at `dashboard.invegent.com/ef-drift`. 5/5 SQL V1–V5 PASS. PK visual acceptance 7/7 desktop checks PASS. | `docs/runtime/sessions/2026-05-07-stage2b-shipped-accepted.md` |
| 2026-05-07 | s30-pass-stage2b-kickoff | **S30 PASS + Stage 2b kickoff (v2.47).** Cron-backed drift logging confirmed live. | `docs/runtime/sessions/2026-05-07-s30-pass-stage2b-kickoff.md` |
| 2026-05-07 | dashboard-architecture-review-completion | **Dashboard Architecture Review COMPLETE.** 12 docs at `docs/dashboard-review-2026-05/`. | `docs/runtime/sessions/2026-05-07-dashboard-architecture-review-completion.md` |
| 2026-05-07 | s30-paused-stuck-cluster-recheck | Lightweight checkpoint. PP×YT + LinkedIn-PP CLEARED; NY×YT STILL BLOCKED. | `docs/runtime/sessions/2026-05-07-s30-paused-stuck-cluster-recheck.md` |
| 2026-05-07 | stage2a-cron-applied | F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED. | `docs/runtime/sessions/2026-05-07-stage2a-cron-applied.md` |
| 2026-05-07 | bef6be96-investigation-resolved | bef6be96 origin RESOLVED. Stage 2a UNBLOCKED. | `docs/runtime/sessions/2026-05-07-bef6be96-investigation-resolved.md` |
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

### 2026-05-08 Sydney — Personal finance interlude + Cowork inbox-sweep brief drafted (v2.51)

**Outcome:** Lightweight session. ICE chat-side: 0 production mutations, 0 D-01 fires, 0 SQL DDL/DML, 0 EF deploys, 0 cron changes. STANDING_THREE array unchanged. Hold-state respected throughout.

This was a personal-finance + automation-design session triggered by an out-of-cycle PK question about a Crazy Domains 3-year renewal quote. Surfaced a meaningful auto-renewal bleed and produced a draft Cowork brief that PK held for cool-headed amendment.

**Personal finance interlude:**
- PK uploaded 5 Crazy Domains invoices spanning Nov 2025 → May 2026 ($246.68 total).
- Identified $251/yr Website Builder auto-renewal bleed (Nov 25 free trial auto-converted Feb 26; today's $62.67 was the 2nd auto-renewal).
- Plus $26/yr Premium DNS + $18/yr Domain Guard ×2 + ~$35 one-off Domain Expiry Protection — ~$212 of the $246.68 was unnecessary spend.
- PK called Crazy Domains during the session; ≥1 invoice refund verbally confirmed in progress.
- Recommended clean-up: cancel Website Builder + Premium DNS + Domain Guard auto-renewals; transfer to Cloudflare Registrar (.com) + VentraIP (.com.au) before Nov 2026; decline the $521/3yr quote. Total annual saving once actioned: ~A$286.

**NEW Cowork brief drafted:** `docs/briefs/morning-inbox-sweep-v1.md` (status=draft).
- Daily 06:00 AEST personal-email triage sweep. Read-only Gmail. Three-bucket classifier (URGENT / FYI / NOISE).
- Money-out triggers fire on every match regardless of dollar amount — calibration anchor is today's Crazy Domains discovery.
- Existing ICE Gmail labels (`newsletter/ndis`, `newsletter/property`) auto-suppressed since those belong to the content engine, not PK personally.
- Single write exception: self-addressed email ping confirming the file is ready. No external recipients under any circumstance.
- Sunset review at 4 weeks (2026-06-08).
- PK held the commit pending cool-headed amendment. Pre-amendment checklist included in the brief itself.

**No D-01 fire this session.** Per protocol, D-01 fires before production patches and action_list version bumps that touch production state. v2.51 is documentation-only (1 new draft brief, 1 new Active row, 1 new Personal businesses entry); no production mutations, no schema changes, no EF changes, no cron changes. State-capture exception count v2.51: **0**.

**Closure budget:** ~0.5h chat. Day total v2.51: ~0.5h. Trailing-14-day ~52.5h above 8.0 floor. ~6 P0+P1 open of 20 cap. ✅ within budget.

**Today/Next 5 carries unchanged from v2.50:**
1. insights-worker P1 functional drift (P1 TOP)
2. Personal businesses check-in (P0; v2.51 added Crazy Domains refund follow-up)
3. Dashboard Architecture Review Phase 0 prerequisites (P1)
4. F-HEYGEN-RPC-MIGRATIONS-MISSING (P2)
5. AI cost view (P3)

**4-way sync close at this commit:**
- Session file: `docs/runtime/sessions/2026-05-08-personal-finance-cowork-inbox-brief.md`
- Sync state (this file): refreshed v2.51
- Action list: v2.51 bump (NEW Active row + NEW Personal businesses entry; Today/Next 5 carries from v2.50)
- Memory: v2.51 entry committed
- Brief draft: `docs/briefs/morning-inbox-sweep-v1.md` committed status=draft

**Hold-state respected throughout.** 0 EF redeploys, 0 SQL DDL/DML, 0 cron changes, STANDING_THREE array unchanged.

**Open from this session:**
- morning-inbox-sweep-v1 brief amendment (P3, NEW v2.51) — PK reviews + amends + flips status
- Crazy Domains refund + clean-up follow-up (Personal businesses, NEW v2.51) — PK actions manually
- Dashboard roadmap PHASES — **7th** consecutive deferral (was 6th in v2.50)
- 21+ close-the-loop UPDATEs to `m.chatgpt_review` still pending; v2.51 adds 0 (no fires)

---

## 🟡 Next session priorities (carries unchanged from v2.50)

1. **insights-worker P1 functional drift** (P1 TOP) — manual review by PK. Deployed v14.0.0 vs repo v1.6.0. D-PREV-07: manual review, no auto-sync.
2. **Personal businesses check-in** (P0 standing) — v2.51 adds Crazy Domains refund + clean-up status check.
3. **Dashboard Architecture Review Phase 0 prerequisites** (P1) — 7 confirm-defaults via `cc-0001-dashboard-phase-0-defaults.md` + M5–M8 reconciliation.
4. **F-HEYGEN-RPC-MIGRATIONS-MISSING** (P2 carry) — `pg_get_functiondef` (read-only) + new migration file. ~30 min.
5. **AI cost view P3** (carry) — `vw_ai_cost_monthly` + NOW dashboard tile. ~1h.
6. **morning-inbox-sweep-v1 brief amendment** (P3 NEW v2.51) — if PK has cool-headed time to amend.
7. **F-YT-NY-FORMAT-SELECTION** (P1 carry).
8. **M6 Phase A** (P1 carry).
9. **Dashboard mobile responsiveness** (P3).
10. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2).
11. **F-PUB-009 7-day flow check** (P2).
12. **F-AI-WORKER-PARSER-SKIP-BUG V4** (P2).
13. **Vault `service_role_key` naming hygiene** (P3).
14. **`docs/audit/health/2026-05-06.md` follow-up** (P3).
15. **21+ close-the-loop UPDATEs** to `m.chatgpt_review`.
16. **Dashboard roadmap reconciliation** (P3, **7th** consecutive deferral).
17. **`00_overview.md` 11-section table reconciliation** (P3).

---

## ⛔ Carried-forward "do not touch" state

Unchanged from v2.50. All 30+ items intact (NDIS-Yarns IG `publish_enabled=false`, cron 53/11/64/65 paused, jobid 12 planner-hourly, 21+ close-the-loop UPDATEs pending, 47 dead queue rows, 32 historical orphans, etc.).

**v2.51 update on standing items:**
- Cron-backed drift logging is LIVE (jobid 80 + 81 active=true).
- 7-8 May fire window: 17:00 UTC 7 May = 03:00 AEST 8 May should have grown `m.ef_drift_log` from 147 → 196 rows. Verifiable next session if needed; no action this session.
- Standing don't-redeploy three (`heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`) — confirmed via cron-driven scan AND mechanically encoded in `scripts/safe-deploy.sh` STANDING_THREE array. v2.51: list unchanged from v2.50.
- Dashboard roadmap PHASES array stale since 3 May — **7th** consecutive deferral (was 6th in v2.50).
- F-HEYGEN-RPC-MIGRATIONS-MISSING P2 — carry from v2.50.
- AI cost view P3 — carry from v2.49.
- morning-inbox-sweep-v1 brief at `docs/briefs/morning-inbox-sweep-v1.md` status=draft — do not pick up in Cowork until PK amends and flips status.
- Crazy Domains clean-up — PK to action manually; chat tracks via Personal businesses entry, no chat-side action without PK direction.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-08 Sydney — Lightweight close (v2.51). Personal finance interlude (Crazy Domains $251/yr auto-renewal bleed identified, refund in progress) + morning-inbox-sweep-v1 Cowork brief drafted, committed status=draft per PK hold. NEW Active row (P3). NEW Personal businesses entry. No D-01 fire (doc-only bump). 0 production mutations chat-side. Today/Next 5 carries unchanged from v2.50.*
