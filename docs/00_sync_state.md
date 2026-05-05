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
| 2026-05-05 | m5-applied-corrected-cascade-fix | M5 (`p_shadow` / `is_shadow` removal) APPLIED via `m5_remove_p_shadow_corrected_v2` after first attempt failed at view-rewrite (PostgreSQL `CREATE OR REPLACE VIEW` cannot drop columns). P3 dependency miss surfaced (`m.check_evergreen_threshold` reads view); corrected packet added cascade fix. 2 D-01 fires both clean first-fire proceed. 7/7 post-apply verifications PASS. M4 invariants intact. T-MCP-02 31→33. | `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` |
| 2026-05-05 | m4-applied-state-capture-override | M4 (Defect 5: enqueue scheduled_for source + 147-row slot backfill) APPLIED via Lesson #62 state-capture override after both D-01 reviews escalated with verbatim-identical generic pushback. 8/8 post-apply verifications PASS. Forward flow proven (2 new v4 queue rows aligned). Lesson #62 sixth vindication. T-MCP-02 quota 29 → 31. | `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` |
| 2026-05-05 | tier-1-queue-integrity-applied | Tier 1 queue integrity incident remediation applied: M1 (cleanup trigger filter by queue_id), M2 (publisher per-partition cap), M3 (get_next_scheduled_for NULL fallback + enqueue guards + 1-row dead-letter). All 8/8 post-apply verifications pass. T-MCP-08 vindicated twice. 108 historical anomalies intentionally untouched per scope item 5. | `docs/runtime/sessions/2026-05-05-tier-1-queue-integrity-applied.md` |
| 2026-05-04 | dashboard-architecture-review-kickoff | ICE Dashboard Architecture Review formally kicked off — three foundational decisions locked. 11-section review document agreed; ~9-10h estimate; §1 starts when PK signals. Cowork night-task v2.2 owner-gate. | `docs/runtime/sessions/2026-05-04-dashboard-architecture-review-kickoff.md` |
| 2026-05-04 | laptop-three-applies | Three queued items shipped: ai-worker v2.11.1; audit matrix CASE patch (F-AAP-007 v2); m.fill_pending_slots scheduled_for write (F-PUB-009). 2/3 D-01 reviews state-capture override. Lesson #62 type-(c) at 5+ vindications. | `docs/runtime/sessions/2026-05-04-laptop-three-applies.md` |
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

**Pre-2026-05-03 history**: frozen at `docs/runtime/archive/sync_state-pre-2026-05-03.md`.

---

## 🟢 Most recent session — inline summary

### 2026-05-05 Sydney late afternoon — M5 applied (corrected; cascade fix on m.check_evergreen_threshold)

~1.5h chat-side. Full detail: `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md`.

**Migration applied:** `m5_remove_p_shadow_corrected_v2` (~05:25 UTC). 7 atomic steps in one transaction:

1. DROP VIEW `m.evergreen_ratio_7d` (CREATE OR REPLACE cannot drop columns — first attempt failed with `42P16` here)
2. CREATE VIEW `m.evergreen_ratio_7d` with new minimal shape (no shadow_*, no live_* prefix)
3. CREATE OR REPLACE `m.check_evergreen_threshold` to read new view shape; PRESERVE consumed keys `alert` + `ratio_used`
4. CREATE OR REPLACE `m.fill_pending_slots(p_max_slots integer DEFAULT 5)` — drop p_shadow param + all is_shadow writes + JSONB keys
5. DROP old 2-arg function signature
6. cron.alter_job(75) — drop p_shadow := true argument
7. DROP COLUMN `is_shadow` from `m.post_draft` and `m.ai_job` (cascade-drops 2 indexes)

**D-01 fires this session: 2.** Both clean first-fire proceed (`b3609bc4-...` original packet, `713dc407-...` corrected packet adding cascade fix). Notable counter-pattern to recent `sql_destructive` escalation streak (T-MCP-06 elevated signal). Pattern observation: clean proceeds are possible when PK pre-approves + change is non-destructive at client-facing layer + evidence empirically grounded + rollback explicit.

**First apply attempt FAILED** at A1 with `42P16: cannot drop columns from view`. PostgreSQL `CREATE OR REPLACE VIEW` cannot drop columns; required explicit DROP + CREATE. Investigation revealed `m.check_evergreen_threshold` reads `live_*`/`shadow_*` columns and is called inside `m.fill_pending_slots` — original D-01 packet did not list it. PK directed re-fire with corrected packet. Atomic rollback meant zero production residue.

**Pre-flight P3 dependency miss**: touch-point inventory caught `m.check_evergreen_threshold` as "reporting reader" but didn't escalate to column-level dependency. Lesson candidate logged: P3 must trace transitive view→fn→fn dependencies, not just touch-points. Reinforces Lesson #61.

**7/7 post-apply verification PASS:** V1 (fn signature has no p_shadow), V2 (view columns clean), V3 (post_draft.is_shadow gone), V4 (ai_job.is_shadow gone), V5 (both indexes cascade-dropped), V6 (cron 75 has no p_shadow), V7 (`m.check_evergreen_threshold` for CFW returns `{alert:false, ratio_used:0, source:'live', filled_total:14, evergreen_ratio:0, recommendation:'healthy'}` — both consumed keys present, semantics correct).

**M4 invariants intact post-M5:** S27 drift=0; aligned v4 queue=3 (no regression). Pending-fill slots = 0 at apply time (next cron 75 fire will be a clean smoke test).

**Empirical proof flag was inert (driving Option A):** 37 records flagged `is_shadow=true` had already published live to all four real clients (CFW, Invegent, NDIS-Yarns, Property Pulse) on FB+LI between 27 Apr and 5 May. Removal changes zero observable behaviour.

**Standing rules honoured:** D-01 (2 fires, no override needed), D-170 (apply via Supabase MCP), Lesson #61 (P1-P5 — P3 miss caught at apply-time, fully completed second pass), G1 (session-detail file separate). **T-MCP-02 quota:** 31 → 33. **Net P0+P1 open:** 4 → 4 (M5 closed → M6 promoted recommended-next). **Closure budget:** +~1.5h, day total ~6h, trailing-14d ~25h above 8.0 floor.

---

## 🟡 Next session priorities (carry-forward from action_list v2.38)

1. Personal businesses check-in
2. **M6 Phase A (recommended next start)** — dead-letter the 108 historical Bug 3 fingerprint queue rows. Sequenced in v2.36 brief. Will not silently publish (most are Instagram on disabled profiles) but should be cleaned up. Pending separate D-01.
3. **47 v4-origin queue mismatch rows** (M6 Phase B) — address after M6 Phase A.
4. **T05 Meta dev support contact** (P1-urgent) — unchanged.
5. **CFW LI fill cycle V3-V5 acid test** — ~05-06 03:04 UTC. Now QUINTUPLE-test window: parser fix + F-PUB-009 + M2 cap-tight + M4 slot-intent + M5 no-shadow signature.
6. **3 stuck-item clusters from health check** (P1) — re-evaluate post-Tier 1 + M4 + M5.
7. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts in `needs_review`.
8. **F-PUB-009 7-day flow check** (P2) — combined with M4/M5 forward-flow check.
9. **Dashboard Architecture Review §1** — when PK signals; ~1.5h estimated.

---

## ⛔ Carried-forward "do not touch" state

- NDIS-Yarns IG `publish_enabled=false` — do not flip until T05 decides recovery
- Cron jobid 53 `active=false` — do not re-enable until S16 + T05 + cron `?limit=1` update
- Cron jobid 11/64/65 (`seed-and-enqueue-{fb,ig,li}`) — paused per slot-driven v4
- Jobid 12 (`planner-hourly`) — still active despite v3 orphan production (B-CRON-V3-ORPHAN)
- **9 review_ids close-the-loop pending** (carry-over)
- **47 historic dead queue rows** retained as audit trail (Phase 1.7 design)
- **6 CFW LinkedIn slots + 1 CFW Facebook slot in `exceeded_recovery_attempts`** — quiescent
- 1 NDIS-FB dead queue row preserved per F-PUB-005 carry-forward
- 5 over-cap (client, platform) combos hold queue depth — by design, drains via publish rate
- NDIS-Yarns LinkedIn slot `8f9e5c57-...` orphan since 4-27 — do not touch
- Property Pulse Facebook 1 orphan slot (B-PP-FB-ORPHAN-PENDING-FILL P3)
- C2-CAND-001 — punted to Cycle 3
- **108 historical Bug 3 fingerprint queue rows** — intentionally retained as `queued`; M6 Phase A scope
- **queue_id `ad573844-c44a-4aa1-a43a-7f222e5b912e`** — dead-lettered with `dead_reason='m3_bug3_fallback_artifact_2026-05-05'`; do not re-queue
- **47 v4-origin queue rows still mismatch slot intent** — pre-M4 legacy artifacts; M6 Phase B address scope
- **NEW v2.38: 160 records previously flagged is_shadow=true lost flag metadata** — acceptable, flag was inert; 37 had already published live regardless

---

## 📜 G1 convention (the rule)

**Each session writes its own file** at `docs/runtime/sessions/YYYY-MM-DD-{slug}.md`. At session end, chat updates this file ONLY by:

1. Inserting one row into the `📚 Session index` table at the top
2. Replacing the `🟢 Most recent session — inline summary` section with the new session's summary (demoting the prior summary into the index)
3. Optionally updating `🟡 Next session priorities` and `⛔ Carried-forward` blocks

**This file should never exceed ~10KB.** If it grows past that, archive the oldest inline summaries to a session file.

**Old monolithic file is frozen.** Pre-2026-05-03 → `docs/runtime/archive/sync_state-pre-2026-05-03.md`. Never modified again.

---

*Last updated: 2026-05-05 Sydney late afternoon — M5 applied corrected cascade fix (v2.38).*
