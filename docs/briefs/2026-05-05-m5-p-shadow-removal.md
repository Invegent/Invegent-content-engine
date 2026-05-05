# M5 — `p_shadow` / `is_shadow` removal

**Brief type:** Traceability (post-hoc record of a completed change).
**Authored:** 2026-05-05 Sydney late afternoon, after closeout.
**Migration of record:** `m5_remove_p_shadow_corrected_v2` (`supabase_migrations.schema_migrations.version = 20260505052442`, applied ~05:25 UTC = ~15:25 AEST).
**Status:** ✅ APPLIED · 7/7 post-apply verifications PASS · M4 invariants intact.
**Cross-refs:** `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` (apply session), `docs/runtime/sessions/2026-05-05-m5-applied-externally-observed-closeout.md` (observation session, this thread), `docs/00_action_list.md` v2.38, `docs/00_sync_state.md` (M5 row at top of session index).

---

## 1. Why M5 existed

The slot-driven v4 fill pipeline carried two parallel signals of "shadow mode" that never became a real isolation boundary:

- `m.fill_pending_slots(p_shadow boolean DEFAULT true)` parameter
- `m.post_draft.is_shadow` and `m.ai_job.is_shadow` columns (both `boolean NOT NULL DEFAULT false`)
- Reporting split (`live_*` / `shadow_*`) on the `m.evergreen_ratio_7d` view

No downstream component enforced the flag. Empirical proof: 37 records flagged `is_shadow=true` had already published live to all four real clients (CFW, Invegent, NDIS-Yarns, Property Pulse) on Facebook + LinkedIn between 27 Apr and 5 May 2026, each with a real `platform_post_id`. The flag was misleading metadata.

## 2. Decision

**Option A (remove)** approved by PK over Option B (enforce). Rationale recorded in PK approval message: no real shadow use case exists; flag never provided isolation; 37 already-published live; 0 TS readers; keeping it is misleading and creates future safety risk.

## 3. Inspection touch-point inventory (13 points)

| Layer | Component | Role |
|---|---|---|
| DB column | `m.post_draft.is_shadow` (160 rows TRUE / 1626 FALSE at apply time) | Storage |
| DB column | `m.ai_job.is_shadow` (160 / 1575) | Storage |
| DB function | `m.fill_pending_slots(p_max_slots, p_shadow)` | Sole writer (7 mentions) |
| DB function | `m.auto_approver_fetch_drafts` | NOT a reader — no filter on `is_shadow` |
| DB view | `m.evergreen_ratio_7d` | Reporting reader (split stats live/shadow) |
| DB function | **`m.check_evergreen_threshold`** | **Reader missed in original D-01 packet — see §5** |
| DB index | `m.idx_post_draft_is_shadow` | Effectively unused |
| DB index | `m.idx_ai_job_is_shadow_status` | Effectively unused |
| Cron | `cron.job 75` | Hardcoded `p_shadow := true` |
| Cron | `cron.job 48` | No filter on `is_shadow` |
| Publisher TS (5 fns: facebook, linkedin-zapier, instagram, youtube, wordpress) | No references | — |
| Auto-approver TS | No references | — |
| `m.post_publish_queue` table | No `is_shadow` column | Boundary discards flag |

GitHub TS code search for `is_shadow` / `p_shadow` / `shadow` filtered to `extension:ts` returned **0 hits**.

## 4. The corrected applied migration

Migration `m5_remove_p_shadow_corrected_v2` is one atomic transaction. Order matters because the view's removed columns are referenced by `m.check_evergreen_threshold`, which is in turn called by `m.fill_pending_slots`.

1. **`DROP VIEW m.evergreen_ratio_7d`** — `CREATE OR REPLACE VIEW` cannot drop columns; explicit DROP is required (see §5).
2. **`CREATE VIEW m.evergreen_ratio_7d`** with new shape — columns reduced to `client_id, client_name, filled_total, evergreen_count, evergreen_ratio, computed_at` (no `live_*` prefix, no `shadow_*` split).
3. **`CREATE OR REPLACE FUNCTION m.check_evergreen_threshold`** — refactored to read the new view shape; PRESERVES the two return keys consumed by `m.fill_pending_slots` (`alert` boolean, `ratio_used` numeric); shadow ELSIF fallback removed.
4. **`CREATE OR REPLACE FUNCTION m.fill_pending_slots(p_max_slots integer DEFAULT 5)`** — single-arg signature; all `is_shadow` writes removed from `m.post_draft` and `m.ai_job` INSERT + ON CONFLICT UPDATE; `'is_shadow'` and `'shadow'` keys removed from `input_payload` and return JSONB; F-PUB-009 `scheduled_for` slot-intent write preserved verbatim; M4-aligned slot intent semantics preserved verbatim.
5. **`DROP FUNCTION IF EXISTS m.fill_pending_slots(integer, boolean)`** — eliminates the old 2-arg signature so any stale caller errors loudly rather than silently picking the wrong overload.
6. **`SELECT cron.alter_job(75, command := …)`** — drops `p_shadow := true` arg from the heartbeat block call.
7. **`ALTER TABLE m.post_draft DROP COLUMN is_shadow`** + **`ALTER TABLE m.ai_job DROP COLUMN is_shadow`** — cascade-drops `idx_post_draft_is_shadow` and `idx_ai_job_is_shadow_status`.

## 5. Sequence of events (sessions perspective)

**Session A (apply session, parallel window):**
1. Inspection complete; original D-01 packet lists 5 in-scope components (view + function + cron + 2 columns).
2. First D-01 fire `b3609bc4-9ea4-4075-8ffe-4439f7318f42` — `agree / proceed / no pushback`.
3. First apply attempt **fails** at A1 with `42P16: cannot drop columns from view`. PostgreSQL `CREATE OR REPLACE VIEW` does not allow column removal. Atomic rollback; production state unchanged.
4. Diagnosis surfaces missed P3 dependency: `m.check_evergreen_threshold` reads the columns being dropped and is itself called by `m.fill_pending_slots`. Original D-01 packet did not list it.
5. Pre-flight expanded; second D-01 fire `713dc407-31ca-454b-825a-d846faf54384` with corrected packet — `agree / proceed / no pushback`.
6. Migration `m5_remove_p_shadow_corrected_v2` applied via Supabase MCP `apply_migration`. 7/7 post-apply verifications PASS.

**Session B (this thread, observation session):**
1. Standing checks ran clean (S27 drift=0, aligned v4 queue=3; S22 all crons green; S21 12/14 partitions non-ok but known clusters).
2. Independently performed the same Option A inspection. Identified the same 13 touch points.
3. Fired its own D-01 (`b3609bc4-…` — same review_id; idempotent within UTC day).
4. Attempted apply of the **uncorrected** migration; same `42P16` failure; clean rollback.
5. Discovered the same `m.check_evergreen_threshold` dependency miss; reported to PK; received the same Option A re-fire directive.
6. During pre-flight for the corrected re-fire, observed via fresh state queries that **the migration had already been applied between snapshots** (Session A had completed). Halted all apply paths.
7. Ran the V1–V6 post-apply verification suite from this thread's perspective (see §6). 7/7 PASS.
8. Closeout: this brief, action_list lesson candidate, memory update.

## 6. Post-apply verification matrix (V1–V7)

| ID | Check | Result | Verdict |
|---|---|---|---|
| V1 | `m.fill_pending_slots(p_max_slots integer)` signature exists; no `p_shadow` arg | signature confirmed | ✅ PASS |
| V2 | `m.evergreen_ratio_7d` columns: `client_id, client_name, filled_total, evergreen_count, evergreen_ratio, computed_at`; no `shadow_*` | no shadow columns | ✅ PASS |
| V3 | `is_shadow` column absent from `m.post_draft` and `m.ai_job` | both absent | ✅ PASS |
| V4 | Indexes `idx_post_draft_is_shadow` + `idx_ai_job_is_shadow_status` absent | both gone (cascade-dropped with their columns) | ✅ PASS |
| V5 | Cron 75 command does not contain `p_shadow` | confirmed clean | ✅ PASS |
| V6 | Zero `m.ai_job` rows since apply with `is_shadow`-related error text | 0 found | ✅ PASS |
| V7 | `m.check_evergreen_threshold` returns the two keys `m.fill_pending_slots` consumes (`alert`, `ratio_used`) for any active client | both keys present, semantics correct | ✅ PASS |

**M4 invariants intact post-M5**: S27 drift = 0; aligned v4 queue rows = 3 (no regression). Empirical confirmation in Session B's V6d/V6e checks.

## 7. Honest limitations

- **160 records lost their `is_shadow=true` marker.** Audit trail of which v4 records were originally flagged is irretrievable. Acceptable: flag was inert, 37 had already published live regardless.
- **`m.evergreen_ratio_7d` view lost the `live_*` / `shadow_*` split.** Any external dashboard query against the old column names would break. None known to exist; GitHub TS search returned 0 hits.
- **Future need for staging / dev-mode isolation** — if it materialises, design it explicitly (e.g., `mode` enum on `c.client_publish_profile`, dedicated test client, feature flag with explicit downstream filters) rather than reviving a half-implemented column.
- **Pre-flight P3 dependency map should have caught `m.check_evergreen_threshold` before the first apply.** Cost was ~15 min of re-inspection + re-fire D-01 only. Atomic rollback meant zero production residue.
- **Parallel-actor risk surfaced.** Session B's independent inspection ran in parallel with Session A's apply. Without a fresh state re-snapshot immediately before the apply attempt, Session B would have re-applied an already-applied migration. The atomic transaction would have errored loudly (column does not exist on second drop), but reliance on "the database will catch us" is not a substitute for capturing fresh state. New lesson candidate logged (see §8 and `00_action_list.md` T-MCP-14).

## 8. Lessons captured

**T-MCP-13 (added v2.38):** pre-flight P3 must trace transitive view→fn→fn dependencies, not just touch-points. A reader that only "reports" via a view can still break under view rewrite if it consumes specific columns by name. Reinforces Lesson #61. Promote to canonical after one more vindication.

**T-MCP-14 (NEW — added by this brief):** destructive apply should re-snapshot state immediately before apply if more than ~5 minutes have passed since the last state capture, especially when parallel sessions or windows may exist. Memory and reasoning windows can drift out of sync with the database within minutes when a parallel actor is operating. The canonical hedge is a fresh `SELECT` against the relevant catalog tables and migration history at apply-time minus zero. Will reinforce Lesson #61 P1 (state-capture). Promote to canonical after one more vindication.

**Counter-pattern observation (also v2.38):** 2-of-2 D-01 fires this session proceeded first-time without escalation despite `sql_destructive` action_type, against a recent streak of escalations. Pattern signals worth tracking under T-MCP-06 for nuance: clean proceeds occur when (a) PK pre-approves clearly, (b) change is non-destructive at the client-facing layer, (c) evidence is empirically grounded, (d) rollback path is explicit.

## 9. Net state delta

| Item | Before | After |
|---|---|---|
| `m.post_draft.is_shadow` | column present, 160 TRUE / 1626 FALSE, 1 index | column gone, index gone |
| `m.ai_job.is_shadow` | column present, 160 TRUE / 1575 FALSE, 1 index | column gone, index gone |
| `m.fill_pending_slots` signature | `(integer, boolean)` 2-arg | `(integer)` 1-arg |
| `m.fill_pending_slots` body | 7 mentions of `is_shadow` / `p_shadow` | 0 mentions |
| `m.check_evergreen_threshold` | reads `live_*`/`shadow_*`; returns 4 split keys | reads `filled_total`/`evergreen_ratio`; returns 2 unified keys (`alert`, `ratio_used` preserved) |
| `m.evergreen_ratio_7d` view | 9 columns including `shadow_*` | 6 columns, no shadow split |
| `cron.job 75` command | `… p_shadow := true …` | `… p_max_slots := 5 …` |
| Net P0+P1 open | 4 | 4 (M5 closed → M6 Phase A promoted) |
| T-MCP-02 quota | 31 | 33 |
| Closure budget (trailing-14d) | ~23.5h | ~25h |
