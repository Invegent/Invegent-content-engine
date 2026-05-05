# 2026-05-05 Sydney late afternoon — M5 applied (corrected; cascade fix on m.check_evergreen_threshold)

**Slug:** `m5-applied-corrected-cascade-fix`
**Duration (chat-side):** ~1.5h
**Outcome:** M5 (`p_shadow` / `is_shadow` removal) APPLIED via second migration `m5_remove_p_shadow_corrected_v2` after first attempt failed at view-rewrite step. 7/7 post-apply verifications PASS. M4 invariants intact (S27 drift = 0; aligned v4 queue holding at 3).

---

## Session arc

1. PK approved Option A (remove p_shadow / is_shadow). Rationale: 0 readers enforce, 37 already-published shadow records prove flag inert, 0 TS code references, keeping it is misleading.
2. Standing checks passed (S27 drift=0, aligned v4 queue=3; S22 all crons green; S21 12/14 partitions non-ok but known clusters).
3. Inspection complete: 13 touch points enumerated. Only DB writers/readers; zero TS references; queue boundary discards flag.
4. Empirical proof flag is inert: 37 `is_shadow=true` records already published live to 4 clients (CFW, Invegent, NDIS-Yarns, Property Pulse) on FB+LI between 27 Apr and 5 May.
5. Option A vs B compared. A: 5 DB-only changes, no TS deploys. B: ~10 changes including 5 publisher Edge Function deploys + decision on 160 existing flagged records. Recommended A.
6. **First D-01 fire** (`b3609bc4-9ea4-4075-8ffe-4439f7318f42`) — proceed/agree first-fire, no pushback. Notable counter-pattern to recent sql_destructive escalation trend.
7. **First apply attempt FAILED** at A1 with `42P16: cannot drop columns from view`. PostgreSQL `CREATE OR REPLACE VIEW` cannot drop columns. Transaction rolled back atomically; production state unchanged.
8. **Pre-flight P3 dependency miss surfaced**: `m.check_evergreen_threshold` reads `live_*` and `shadow_*` columns from the view, and is called inside `m.fill_pending_slots`. Original D-01 packet did not list this function as in-scope. Reported to PK; PK directed re-fire with corrected packet.
9. **5 pre-D-01 checks completed**:
   - C1 captured `m.check_evergreen_threshold` body verbatim
   - C2 proved `m.fill_pending_slots` consumes only 2 keys (`alert`, `ratio_used`) from threshold check JSONB
   - C3 refactored function preserves both consumed keys
   - C4 confirmed only `m.check_evergreen_threshold` references the live_*/shadow_* columns; zero other functions/views; zero TS references
   - C5 documented rollback path
10. **Second D-01 fire** (`713dc407-31ca-454b-825a-d846faf54384`) — proceed/agree, no pushback again.
11. Migration `m5_remove_p_shadow_corrected_v2` applied via Supabase MCP. 7-step atomic transaction: DROP VIEW → CREATE VIEW (new shape) → refactor `m.check_evergreen_threshold` → refactor `m.fill_pending_slots` → DROP old 2-arg function signature → cron 75 alter → drop columns from `m.post_draft` and `m.ai_job`.
12. **7/7 post-apply verifications PASS**:
    - V1 `m.fill_pending_slots(p_max_slots integer)` signature; p_shadow gone
    - V2 view columns: `client_id, client_name, filled_total, evergreen_count, evergreen_ratio, computed_at` — no shadow_*
    - V3 `is_shadow` absent from `m.post_draft`
    - V4 `is_shadow` absent from `m.ai_job`
    - V5 indexes `idx_post_draft_is_shadow` + `idx_ai_job_is_shadow_status` absent (cascade-dropped)
    - V6 cron 75 command: no `p_shadow`
    - V7 `m.check_evergreen_threshold` for CFW returns `{alert:false, ratio_used:0, source:'live', filled_total:14, evergreen_ratio:0, recommendation:'healthy'}` — both consumed keys present, semantics correct
13. M4 invariants confirmed intact post-M5: S27 drift=0; aligned v4 queue=3.

---

## Schema state delta

**Removed (DB-only):**
- `m.post_draft.is_shadow` column (and index `idx_post_draft_is_shadow`)
- `m.ai_job.is_shadow` column (and index `idx_ai_job_is_shadow_status`)
- `p_shadow` parameter from `m.fill_pending_slots` (old 2-arg signature dropped)
- `'is_shadow'` and `'shadow'` keys from `m.fill_pending_slots` JSONB I/O
- `shadow_filled_total`, `shadow_evergreen_count`, `shadow_evergreen_ratio` columns from `m.evergreen_ratio_7d` view
- `shadow_filled_total`, `shadow_evergreen_ratio` keys from `m.check_evergreen_threshold` return JSONB; ELSIF shadow fallback branch removed
- `live_*` column-name prefix on `m.evergreen_ratio_7d` (now `filled_total`, `evergreen_count`, `evergreen_ratio`)
- `p_shadow := true` argument from cron 75 command

**Preserved verbatim:**
- `m.fill_pending_slots` body except for the targeted removals (F-PUB-009 scheduled_for write, dedup logic, evergreen fallback, slot_fill_attempt INSERT, signal_pool reuse_count update, M4-aligned slot intent semantics — all untouched)
- `m.check_evergreen_threshold` return keys consumed by `m.fill_pending_slots`: `alert` (boolean), `ratio_used` (numeric)

**Data state:**
- 160 records previously flagged `is_shadow=true` (147 backfilled by M4 + 13 prior F-PUB-009) lost flag metadata. Acceptable: 37 had already published live regardless; flag had no semantic enforcement.
- 47 v4-origin queue mismatch rows still carried-forward (M6 Phase B scope; M4 forward-only).
- 108 historical Bug 3 fingerprint queue rows still queued (M6 Phase A scope).

---

## D-01 review summary (2 fires, both clean proceed)

| Fire | review_id | Verdict | Pushback | Outcome |
|---|---|---|---|---|
| 1 (original packet) | `b3609bc4-9ea4-4075-8ffe-4439f7318f42` | agree | none | proceed |
| 2 (corrected packet adding cascade fix) | `713dc407-31ca-454b-825a-d846faf54384` | agree | none | proceed |

**Notable**: First clean first-fire on `sql_destructive` after a streak of escalations (T-MCP-06 elevated signal). Pattern observation: `sql_destructive` can proceed without escalation when (a) PK pre-approves clearly, (b) change is non-destructive at client-facing layer, (c) evidence empirically grounded, (d) rollback path explicit. Worth tracking as T-MCP-06 nuance — clean proceeds are possible.

---

## Lesson reinforcement: pre-flight P3 must trace transitive dependencies

**Miss**: Original M5 inspection enumerated `m.check_evergreen_threshold` as "reads view for reporting" but didn't escalate it to a column-level dependency that would break under view rewrite. Caught at apply-time by `42P16` error (PostgreSQL refuses CREATE OR REPLACE VIEW that drops columns). No production damage (atomic rollback) but cost ~15 min of re-inspection + re-fire D-01.

**Lesson candidate (reinforces Lesson #61)**: pre-flight P3 dependency mapping must trace transitive readers across schema boundaries: view → function → function. Touch-point inventory is necessary but not sufficient. For any view rewrite that changes column names or drops columns, identify ALL downstream functions that reference those specific columns by name and refactor in same transaction.

Promote to canonical after 1 more vindication.

---

## Standing rules honoured

- D-01 — 2 fires, both proceed; no override needed
- D-170 — applied via Supabase MCP, not CC
- Lesson #61 — P1-P5 partial first time (P3 miss); fully completed second pass
- G1 — session detail in this file; sync_state index updated separately
- Lesson #62 — not vindicated this session (clean proceeds; not the type-(c) verbatim-stuck pattern)

---

## Closure budget delta

- This session: ~1.5h
- Day total (5 May): ~6.0h (Tier 1 ~3.5h + M4 ~1h + M5 ~1.5h)
- Trailing-14-day: ~25h above 8.0 floor
- Net P0+P1 open: 4 → 4 (M5 closed; M6 promoted recommended-next)
- T-MCP-02 quota: 31 → 33

---

## Carry-forward / next session

1. Personal businesses check-in
2. **M6 Phase A — 108 historical Bug 3 fingerprint dead-letter** (recommended next; sequenced in v2.36 brief). Will not silently publish (most are Instagram on disabled profiles) but should be cleaned up.
3. **47 v4-origin queue mismatch rows** (M6 Phase B) — sequenced after M6 Phase A.
4. **T05 Meta dev support contact** (P1-urgent) — unchanged, not addressed this session per PK direction.
5. **CFW LI fill cycle V3-V5 quadruple-test** ~05-06 03:04 UTC — now also exercises new no-shadow `m.fill_pending_slots` signature; quintuple-test in effect (parser + F-PUB-009 + M2 + M4 + M5).
6. **3 stuck-item clusters re-evaluation** (P1) — re-query after publisher cycles.
7. **F-AAP-NEEDS-REVIEW-BACKLOG** (P2) — 28 drafts.
8. **F-PUB-009 7-day forward-flow check** (P2) — combined with M4/M5 forward-flow.
9. **Dashboard Architecture Review §1** — when PK signals.

---

## Honest limitations

- 160 records lost their is_shadow=true marker. Audit trail of which v4 records were originally flagged is irretrievable. Acceptable because flag was inert.
- M5 only addresses the column-level shadow concept. Any future need for staging/dev-mode isolation requires a properly-designed mechanism (e.g., `mode` enum on `c.client_publish_profile`, dedicated test client).
- The reporting view `m.evergreen_ratio_7d` lost the live/shadow split. Any external dashboard query against the old column names would break. None known to exist; GitHub TS search returned 0 hits. PostgREST queries would need column-name updates if any exist.
- Pre-flight P3 dependency map should have caught `m.check_evergreen_threshold` before first apply. Lesson candidate logged.
