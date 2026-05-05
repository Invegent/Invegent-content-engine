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
| 2026-05-05 | m4-applied-state-capture-override | M4 (Defect 5: enqueue scheduled_for source + 147-row slot backfill) APPLIED via Lesson #62 state-capture override after both D-01 reviews escalated with verbatim-identical generic pushback. 8/8 post-apply verifications PASS. Forward flow proven (2 new v4 queue rows aligned). Lesson #62 sixth vindication. T-MCP-02 quota 29 → 31. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | Tier 1 queue integrity incident remediation applied: M1 (cleanup trigger filter by queue_id), M2 (publisher per-partition cap), M3 (get_next_scheduled_for NULL fallback + enqueue guards + 1-row dead-letter). All 8/8 post-apply verifications pass. T-MCP-08 vindicated twice. 108 historical anomalies intentionally untouched per scope item 5. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | ICE Dashboard Architecture Review formally kicked off — three foundational decisions locked. 11-section review document agreed; ~9-10h estimate; §1 starts when PK signals. Cowork night-task v2.2 owner-gate. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | Three queued items shipped: ai-worker v2.11.1 (F-AI-WORKER-PARSER-SKIP-BUG); audit matrix CASE patch (F-AAP-007 v2); m.fill_pending_slots scheduled_for write (F-PUB-009). 2/3 D-01 reviews state-capture override. Lesson #62 type-(c) at 5+ vindications. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
| 2026-05-04 | baudit-check5-retired-faap007-revised | B-AUDIT-CHECK5-DRIFT retired; F-AAP-007 brief v1→v2; F-PUB-009 brief authored; F-AI-WORKER-PARSER-SKIP-BUG diagnosed. T-MCP-11/12 each reinforced. F-RECOVER-LOOP-001 P1→P3. | `docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md` |
| 2026-05-03 | audit-readiness-completion-night | Migration 3 (audit views v2); runbook v1→v2→v2.1 across 2 ChatGPT external audits; F-HISTORIC-DEAD-CLEANUP retired; T-MCP-11/12 lessons. | `docs/runtime/sessions/2026-05-03-audit-readiness-completion-night.md` |
| 2026-05-03 | pipeline-relief-apply-night | Migration 1+2 applied; 16 dead rows swept; audit schema + 2 views; cap lift deferred. | `docs/runtime/sessions/2026-05-03-pipeline-relief-apply-night.md` |
| 2026-05-03 | pipeline-investigation-night | End-to-end investigation; 4 stalled streams; 3 structural issues identified. | `docs/runtime/sessions/2026-05-03-pipeline-investigation-night.md` |
| 2026-05-03 | tmcp05-batch-closure | T-MCP-05 closed; post-apply ACL gap surfaced via break-glass. | `docs/runtime/sessions/2026-05-03-tmcp05-batch-closure.md` |
| 2026-05-03 | faap001-002-apply | Stance retired + F-AAP-001 + F-AAP-002 applied + B-AUDIT-V4-PEERS clean; T05 returns P1-urgent. | `docs/runtime/sessions/2026-05-03-faap001-002-apply.md` |
| 2026-05-03 | faap001-rootcause | F-PUB-005 V3-V5 PASS + F-AAP-001 P1 root cause confirmed. | `docs/runtime/sessions/2026-05-03-faap001-rootcause.md` |
| 2026-05-03 | r01-calibration | R01 Data Auditor calibration v2 — 7 decisions + 3 lesson promotions. | `docs/runtime/sessions/2026-05-03-r01-calibration.md` |
| 2026-05-03 | t02-ratification | T02 Gate B body-health exit RATIFIED. | `docs/runtime/sessions/2026-05-03-t02-ratification.md` |
| 2026-05-03 | fpub005-apply | F-PUB-005 + F-PUB-010 patch APPLIED. | `docs/runtime/sessions/2026-05-03-fpub005-apply.md` |
| 2026-05-03 | mid-morning-chat-session-2 | F-PUB-007 closed + F-PUB-010 surfaced + F-PUB-005 brief v2 + F04 applied. | `docs/runtime/sessions/2026-05-03-mid-morning-chat-session-2.md` |

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-05 Sydney early afternoon — M4 applied (Lesson #62 state-capture override)

~1h chat-side. Full detail: `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md`. Brief: `docs/briefs/2026-05-05-queue-integrity-incident.md` v3 (commit `06510ff`).

**Migration applied:** `m4_enqueue_scheduled_for_slot_intent_and_backfill` ~04:14 UTC (~14:14 AEST). Two atomic ops:

1. `UPDATE m.post_draft` SET `scheduled_for = s.scheduled_publish_at` for v4 drafts where `pd.slot_id IS NOT NULL AND pd.scheduled_for IS NULL`. Touched exactly **147 rows** (deterministic; pre-state evidence + apply-window count match).
2. `cron.alter_job(48, command := …)` — adds `LEFT JOIN m.slot s` in candidates CTE outer + `s.scheduled_publish_at` as 2nd COALESCE arg. F-PUB-010 hard-cap, DISTINCT ON ordering, NOT EXISTS guards, M3 `IS NOT NULL` filter, ON CONFLICT clause all preserved verbatim.

**D-01 fires this session: 2.** Both escalated with verbatim-identical generic pushback ("Potential for data integrity issues if backfill is executed incorrectly..."). First fire `b03eaf14-...`; re-fire `602b0fb2-...` after empirical strengthening (transaction-rollback test covering 4 schedule-resolution scenarios + 147-row backfill determinism check). Re-fire's `verified_claims` acknowledged additional evidence; pushback unchanged. PK approved Lesson #62 state-capture override.

**Empirical strengthening:** Inserted 4 synthetic rows (2 slots + 4 post_drafts + 4 ai_jobs) inside `BEGIN/ROLLBACK`. Patched COALESCE behaviour proven across all 4 scenarios (A v4-null-pd → slot; B v4-pd-set → pd preserved; C legacy w/ schedule → `get_next_scheduled_for`; D legacy no-schedule → NULL → M3 guard skips). Zero production residue.

**8/8 post-apply verification:** all PASS. V1 (147 rows), V2 (alignment), V3 (resolution order + LEFT JOIN), V4 (M3 guard), V5 (legacy fallback), V6 (queue NULL count = 0), V7 (no v4 promotion / no legacy disable / no `p_shadow` change / no broad queue cleanup), V8 (both D-01 reviews close-the-loop UPDATEd via `m4_close_the_loop_d01_reviews` migration).

**Forward-flow bonus:** 2 new v4-origin queue rows created post-apply by patched cron, both aligned to `slot.scheduled_publish_at`. Patched cron is empirically operating correctly.

**Lesson #62 sixth vindication.** Ready for canonical promotion. Pattern: ChatGPT MCP escalates `sql_destructive` actions with generic pushback even when `verified_claims` acknowledges clearance; re-fire produces verbatim-identical pushback. Distinguishable from T-MCP-08 type-(b) by verbatim wording + non-empty generic `corrected_action`.

**Standing rules honoured:** D-01 (2 fires, override path), D-170 (apply via Supabase MCP), Lesson #61 (P1-P5), G1 (session-detail file separate). **T-MCP-02 quota:** 29 → 31. **Net P0+P1 open:** 4 (unchanged; M4 closed → M5 promoted recommended-next). **Closure budget:** +~1h, trailing-14d ~23.5h above 8.0 floor.

---

## 🟡 Next session priorities (carry-forward from action_list v2.37)

1. Personal businesses check-in
2. **M5 (recommended next start)** — `p_shadow` binary decision. Cost asymmetry analysis in brief Section 6 favours (a) remove unless PK names a use case. Pending PK call + separate D-01.
3. **T05 Meta dev support contact** (P1-urgent) — unchanged
4. **CFW LI fill cycle V3-V5 acid test** — ~05-06 03:04 UTC. Now QUADRUPLE-test window: parser fix + F-PUB-009 + M2 cap-tight + M4 slot-intent routing.
5. **3 stuck-item clusters from yesterday's health check** (P1) — re-evaluate post-Tier 1 + M4. M4 may have additionally cleared mismatched slot intent for v4 entries in those clusters.
6. **F-AAP-NEEDS-REVIEW-BACKLOG (P2)** — 28 drafts in `needs_review`
7. **F-PUB-009 7-day flow check (P2)** — combined with M4 forward-flow check
8. **Dashboard Architecture Review §1** — when PK signals; ~1.5h estimated

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 + T05 + cron `?limit=1` update
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- **9 review_ids close-the-loop pending** (4 from prior batches + v2.34's `ba234fce`/`e462597f`/`753930ad` + v2.37's M4 closures already resolved within session — net 7)
- **47 historic dead queue rows** retained as audit trail (Phase 1.7 design)
- **6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts`** — quiescent
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design, drains via publish rate
- NDIS-Yarns LinkedIn slot `8f9e5c57-...` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 — punted to Cycle 3
- **108 historical Bug 3 fingerprint queue rows** — intentionally retained as `queued`; deferred to M6 Phase A
- **queue_id `ad573844-c44a-4aa1-a43a-7f222e5b912e`** — dead-lettered with `dead_reason='m3_bug3_fallback_artifact_2026-05-05'`; do not re-queue.
- **NEW v2.37: 47 v4-origin queue rows still mismatch slot intent** — pre-M4 legacy artifacts. M4 is forward-only by design; does not retroactively rewrite existing queue rows. M6 Phase B address scope.

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-05 Sydney early afternoon — M4 applied state-capture override (v2.37).*
