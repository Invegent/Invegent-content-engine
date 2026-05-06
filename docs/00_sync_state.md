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
| 2026-05-07 | dashboard-architecture-review-completion | **Dashboard Architecture Review COMPLETE.** 12 docs (`00_overview.md` + `01_*` through `11_*`) committed to `docs/dashboard-review-2026-05/` across 11 sequential turns from kickoff (2026-05-04). 5-section IA locked (NOW + CLIENTS + CREATE + REPORTS + ADMIN). Option B locked (operational consolidation). Brief surface HYBRID generation locked. 6 product primitives at contract level. 17 build-blockers as PK execution checklist (§11.4). 4 top-tier residual risks with mitigations cited. 5-phase implementation plan (~44–54h total / 5–9 weeks elapsed). Zero production mutations across all 11 turns. Hold-state respected throughout (S30 still pending natural fire 17:00 UTC tonight). Next phase = implementation Phase 0 after S30 clearance + PK confirms 7 Phase 0 defaults. | `docs/runtime/sessions/2026-05-07-dashboard-architecture-review-completion.md` |
| 2026-05-07 | s30-paused-stuck-cluster-recheck | **Lightweight checkpoint + mid-hold audit + 4-way sync close.** S30 deferred to natural cron fire (17:00 UTC tonight). Read-only re-evaluation: PP×YT + LinkedIn-PP clusters CLEARED; NY×YT STILL BLOCKED by F-YT-NY-FORMAT-SELECTION; Invegent IG backlog same root cause as NY/PP IG (jobid 53 paused). Mid-hold pre-fire setup audit (read-only) confirmed all drift-check infrastructure correct. Vault `service_role_key`=15 chars flagged then cleared as NON-BLOCKING (drift-check `verify_jwt:false` + auto-injected `SUPABASE_SERVICE_ROLE_KEY` env). F-AI-WORKER-PARSER-SKIP-BUG V3+V5 PASS (28 jobs, 0 bug fingerprints; 4/4 sched written). V4 INCONCLUSIVE (no natural skip in 48h). Dashboard architecture review doc lookup completed (kickoff at `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md`; target doc location `docs/dashboard-review-2026-05/` decided but §1 not yet started). Lesson candidate #69 captured. Zero production mutations across full session. ~45 min closure. | `docs/runtime/sessions/2026-05-07-s30-paused-stuck-cluster-recheck.md` |
| 2026-05-07 | stage2a-cron-applied | F-EF-DRIFT-PREVENTION Stage 2a fully CLOSED. Daily drift-check + 90-day retention crons applied via Supabase MCP per D170 (D-01 review `c261e338` agree, no pushback). Two crons live (jobid 80 + 81). All 7 PK verification criteria PASS including dry-run smoke. | `docs/runtime/sessions/2026-05-07-stage2a-cron-applied.md` |
| 2026-05-07 | bef6be96-investigation-resolved | bef6be96 origin investigation RESOLVED. `pg_stat_statements` traced to same `postgres` DB role + chat-authored SQL fingerprint as v2.42 chat session itself. PK keep-both decision documented. Stage 2a UNBLOCKED. Lesson candidate #68 captured. | `docs/runtime/sessions/2026-05-07-bef6be96-investigation-resolved.md` |
| 2026-05-06 | f-ef-drift-prevention-stage2a-checkpoint | F-EF-DRIFT-PREVENTION Stage 2a CHECKPOINT — was BLOCKED on bef6be96 origin investigation; resolved + closed v2.44. drift-check EF v1.0.8 deployed (commit `d81de062`). T-MCP-02 37→40; T-MCP-08 1→2. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage2a-checkpoint.md` |
| 2026-05-06 | f-ef-drift-prevention-stage1-applied | F-EF-DRIFT-PREVENTION **Stage 1 APPLIED** (backend foundation). 3 D-01 fires. | `docs/runtime/sessions/2026-05-06-f-ef-drift-prevention-stage1-applied.md` |
| 2026-05-05 | f-ef-drift-prevention-locked | F-EF-DRIFT-PREVENTION Tier 2 inventory LOCKED at 46/46 EFs. Option F APPROVED. | `docs/runtime/sessions/2026-05-05-f-ef-drift-prevention-locked.md` |
| 2026-05-05 | ice-yt-oauth-restoration | F-YT-OAUTH-PP RESTORED for Property Pulse via dashboard `/connect`. | `docs/runtime/sessions/2026-05-05-ice-yt-oauth-restoration.md` |
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 (`p_shadow` / `is_shadow` removal) APPLIED. 7/7 PASS. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 (Defect 5: enqueue scheduled_for + 147-row backfill) APPLIED. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | M1+M2+M3 applied. 8/8 PASS. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | Dashboard review kickoff (4 review rounds, 11-section structure, 6-section IA, 3 foundational decisions). Target doc location `docs/dashboard-review-2026-05/` — not yet built. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | ai-worker v2.11.1; F-AAP-007 v2; F-PUB-009. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | B-AUDIT-CHECK5-DRIFT retired; F-AAP-007 v1→v2; F-PUB-009 brief. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 + runbook v2.1; F-HISTORIC-DEAD-CLEANUP retired. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied; 16 dead rows swept. | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation; 4 stalled streams. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | F-AAP-001 + F-AAP-002 + B-AUDIT-V4-PEERS clean. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 root cause. | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2. | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED. | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED. | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-07 Sydney — Dashboard Architecture Review Completion

**Outcome:** ICE Dashboard Architecture Review of 2026-05 **COMPLETE**. 12 docs committed across 11 sequential turns from kickoff (2026-05-04) to closure (today). Zero production mutations across all 11 turns. Hold-state respected throughout — S30 still pending natural fire 17:00 UTC tonight.

**12 docs landed at `docs/dashboard-review-2026-05/`:**
- `00_overview.md` (foundational; pre-existing) + `01_current_state_inventory.md` + `02_target_ia_mapping.md` + `03_operator_workflow_map.md` + `04_decision_criteria.md` + `05_ia_option_comparison.md` + `06_final_target_design.md` + `07_traceability_matrix.md` + `08_brief_and_comms_layer.md` + `09_implementation_plan.md` + `10_product_objects_and_data_model.md` + `11_final_consolidation.md`
- Commits: `487a761b` → `252e8d0a` → `10288db6` → `9f283221` → `fcd33676` → `a5f29ca0` → `4479379b` → `f66d66c4` → `9b096fa3` → `1e25725b` → `c30d5ac9`

**Locked decisions (~80 total; full list in `11_final_consolidation.md` §11.2):**
- **5-section IA**: NOW + CLIENTS + CREATE + REPORTS + ADMIN (replaces current 8)
- **NOW grouped sub-nav**: Daily (Overview, Inbox, Pipeline) + Investigate (Flow, Pipeline Log, Visual Pipeline, Agents)
- **Brief at NOW > Daily > Overview top block** — HYBRID generation (templated baseline + LLM enrichment with deterministic fallback); 3 sub-blocks (Alerts/Decisions/Summary); ≤~250 words total; 5 anti-pattern protections; 8 deterministic failure modes
- **Pipeline state-machine swimlane view replaces /queue**; 8 canonical states with derivation precedence rules
- **Inbox = hybrid flat list** with filter chips (All/Drafts/Policy/Format/Agent) + severity sort + bulk select; LOW severity excluded v1
- **6 product primitives** at contract level: `m.attention_item` (NEW table backing Inbox), `m.vw_pipeline_state`, `m.vw_agent_status`, scope (jsonb shape for multi-tenant readiness), `m.brief`, `m.action_event` (single-table audit with type discriminator)
- **Web canonical, Telegram nudge-only, email deferred to v2**
- **Anti-pattern severity**: AP3 + AP5 + AP6 = ship-blockers; AP1/AP2/AP4/AP7 = ship-and-fix per surface
- **5-phase implementation plan** (~44–54 chat hours / 5–9 weeks elapsed at 2–3 sessions/week)

**17 build-blockers as PK execution checklist (`11_final_consolidation.md` §11.4):**
- 2 hard blockers: S30 cleared + M5–M8 reconciliation
- 7 Phase 0 confirmation blockers (defaults exist; confirm/override): m.attention_item TABLE-not-VIEW + Phase 0 backfill + m.action_event single-table + agent status VIEW v1 + m.brief schema + scope as jsonb + polymorphic source reference
- 3 Phase 1 confirmation blockers: Q4 severity threshold + Telegram bot infra + push time
- 1 Phase 2 confirmation blocker: Q5 bulk approve UX safety
- 4 Phase 3 confirmation blockers: Q3 pre-fill mechanism + m.brief retention + LLM choice + multi-client scope
- 0 Phase 4 new blockers (4+ week dual-write window is independent gate)

**Top 4 residual risks (`11_final_consolidation.md` §11.5):**
1. Product risk — Brief = "nicer Overview." Mitigation: §8.6 acceptance test + PK 2-week feedback loop.
2. Migration risk — NDIS+PP column drop irreversible. Mitigation: 4+ week dual-write + telemetry + Supabase backup.
3. Operator risk — bulk approve HARD_BLOCK violation. Mitigation: confirmation modal + per-draft opt-out + 10s undo + audit.
4. System complexity risk — 6 primitives × 5 phases × 17 blockers. Mitigation: capacity discipline + rollback paths + D-01 review.

**0 D-01 fires this session** (documentation-only commits). T-MCP-02 quota unchanged at 41.

**Closure budget:** ~10–12 chat hours across the 11 sequential turns. Combined day with v2.45: ~14h. Trailing-14-day ~46h above 8.0 floor.

**4-way sync close at this commit:**
- Session file: `docs/runtime/sessions/2026-05-07-dashboard-architecture-review-completion.md` committed `68de41c0`
- Sync state (this file): inline summary refreshed; new index row added; next priorities updated
- Action list: v2.46 bump in this commit (architecture review COMPLETE noted under Closed; 17 build-blockers added as Active items)
- Memory: v2.46 entry queued via `memory_user_edits` after this commit
- Dashboard roadmap: `LAST_UPDATED` bumped via separate `invegent-dashboard` commit

**Open from this session (deferred to PK action):**
- `00_overview.md` 11-section table reconciliation — `11_final_consolidation.md` §11.1 specifies required updates; not applied this turn per files-changed minimisation
- Architecture review doc footers say "Created 2026-05-06 (Sydney)" but actual close is 2026-05-07 Sydney; 1-day discrepancy not retroactively fixed

**Hold-state in effect (per PK):**
- No Stage 2b / Stage 3 / P1 triage / NY×YT / M6
- No EF deploys
- No manual cron triggers
- No DML / DDL
- No close-the-loop UPDATEs
- No vault edits
- DO NOT REDEPLOY heygen-avatar-creator / heygen-avatar-poller / draft-notifier (P1 SECURITY-DEFINER regression-risk)
- `m.ef_drift_log` 98 rows preserved
- jobid 80 + 81 active=true 0 runs (correct — first natural fire 17:00 UTC tonight)

---

## 🟡 Next session priorities (rebuilt for v2.46)

1. **S30** — forward verification of first automated drift-check cron fire (17:00 UTC tonight). Run around 17:15 UTC / 03:15 AEST tomorrow. **Unchanged from v2.45.**
2. **Dashboard Architecture Review Phase 0 prerequisites** (NEW v2.46) — PK confirms 7 Phase 0 confirmation blockers (`11_final_consolidation.md` §11.4 items 3–9). Then schedule M-09-01 + M-09-02 + M-09-03 migrations + JSONB additive col + 4 inventory sweeps.
3. **F-EF-DRIFT-PREVENTION Stage 2b** (P1 after S30 green) — dashboard drift panel. Architecture review reserved a slot for this under NOW > Investigate per `06_final_target_design.md` §6.9 + `09_implementation_plan.md` Phase 4 B-09-36.
4. **F-EF-DRIFT-PREVENTION Stage 3** (P1) — `scripts/safe-deploy.sh`. ~30 min.
5. **P1 SECURITY-DEFINER regression-risk triage** (P1) — sequenced after Stage 2b live.
6. **insights-worker P1 functional drift** (P1) — manual review (D-PREV-07).
7. **F-YT-NY-FORMAT-SELECTION** (P1) — BLOCKED until Stage 2b close + P1 triage.
8. **M6 Phase A** (P1) — BLOCKED behind same gate. Note: dashboard architecture review's `m.vw_pipeline_state` view (Phase 0 M-09-03) must reconcile with M5–M8 schema; coordinate sequencing.
9. **T05 Meta dev support contact** (P1-urgent).
10. **Personal businesses check-in** (P0).
11. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts. Architecture review Phase 2 B-09-14 closes this with bulk approve.
12. **F-PUB-009 7-day flow check** (P2).
13. **F-AI-WORKER-PARSER-SKIP-BUG V4** — inconclusive at v2.45; either wait for natural skip event or schedule synthetic test.
14. **Vault `service_role_key` naming hygiene scope-check** (P3 from v2.45).
15. **`docs/audit/health/2026-05-06.md` follow-up** (P3) — investigate if still absent.
16. **17+ close-the-loop UPDATEs pending** to `m.chatgpt_review` — next batch closure.
17. **Dashboard roadmap reconciliation** (deferred from v2.45) — PHASES array hasn't been touched since 3 May; needs a dedicated session.
18. **`00_overview.md` 11-section table reconciliation** (NEW v2.46) — required updates specified in `11_final_consolidation.md` §11.1.

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 (`instagram-publisher-every-15m`) `active=false` — do not re-enable until S16 + T05; **note v2.45**: when re-enabled, ~104 IG-overdue posts will fire (NY 41 + PP 57 + Invegent 6) — cap-throttle planning required
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- 17+ review_ids close-the-loop pending (carry-over). Combine in next batch closure.
- 47 historic dead queue rows retained as audit trail (Phase 1.7 design)
- 32 historical `post_draft_not_found` orphans (16 NY-FB + 16 PP-FB) confirmed v2.45 — M6 Phase A scope (BLOCKED)
- 6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts` — quiescent
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design
- NDIS-Yarns LinkedIn slot `8f9e5c57-…` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 — punted to Cycle 3
- 108 historical Bug 3 fingerprint queue rows — intentionally retained as `queued`; M6 Phase A scope (BLOCKED)
- queue_id `ad573844-…` — dead-lettered; do not re-queue
- 47 v4-origin queue rows still mismatch slot intent — M6 Phase B scope
- 160 records previously flagged is_shadow=true lost flag metadata — acceptable, flag was inert
- 2 NY×YT avatar test drafts (a501aa6a, 80d8d2b7) from 2026-04-09 with expired HeyGen-hosted URLs — latent; confirmed v2.45 still in `dead` status with no video_url
- `is_shadow: true` JSONB residue persists in `m.post_draft.draft_format.ai` — investigate post-drift-check infrastructure
- 13 drift cases active in priority buckets (v2.40 inventory)
- 2 repo-only directories (ai-diagnostic, linkedin-publisher) — do not deploy or remove without PK direction
- `docs/audit/health/2026-05-06.md` absent — Cowork 02:00 AEST cron did not push 6 May. P3 follow-up.
- **v2.45: `m.ef_drift_log` retains 98 rows.** Keep-both per PK v2.43 decision. **Do not delete.**
- **v2.45: drift-check v1.0.8 LIVE.** Daily fire cron LIVE (jobid 80, 0 runs ever — first fire 17:00 UTC tonight). Retention cron LIVE (jobid 81).
- **v2.45: Standing don't-redeploy** for `heygen-avatar-creator`, `heygen-avatar-poller`, `draft-notifier`.
- **v2.45: Vault `service_role_key` 15-char value.** Confirmed non-blocking for drift-check (verify_jwt:false + auto-injected env). Other consumers not yet scope-checked. P3 hygiene cleanup logged.
- **v2.45: Dashboard roadmap PHASES array stale since 3 May.** No reconciliation done at v2.45 close (lightweight checkpoint scope). Defer to dedicated session.
- **v2.46: Dashboard Architecture Review COMPLETE.** 12 docs at `docs/dashboard-review-2026-05/`. 17 build-blockers as PK execution checklist. Phase 0 prerequisites (S30 + M5–M8 reconciliation + 7 confirm-defaults) gate Phase 0 start.
- **v2.46: `00_overview.md` 11-section table out-of-sync.** Required updates specified in `11_final_consolidation.md` §11.1; not applied at v2.46 close.
- **v2.46: Architecture review docs carry "Created 2026-05-06 (Sydney)" footer dating** based on UTC perspective during composition; actual Sydney close is 2026-05-07. 1-day discrepancy known; not retroactively fixed.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-07 Sydney — Dashboard Architecture Review COMPLETE (v2.46). Next: S30 after natural cron fire 17:00 UTC, then PK confirms 7 Phase 0 build-blocker defaults, then Phase 0 starts.*
