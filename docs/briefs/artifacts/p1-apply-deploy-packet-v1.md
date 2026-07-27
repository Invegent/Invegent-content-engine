# Phase-1 Authoritative Weekly Schedule Editor — Apply / Deploy Packet v1

**Lane:** authoritative-weekly-schedule-editor-phase-1 (Gate-1 approved 2026-07-27).
**Tiers:** 1a = T2, 1b = T2, 1c = **T3** (production nightly function; requires live materialise proof).
**Boundary (unchanged):** Phase 1 = authoritative schedule *planning* + durable slot *intent*. The Advisor may still replace the format downstream in production — that is the accepted Phase-1 boundary, NOT a defect. No `ai-worker` / `recommended_format` / resolver change here.

This packet is the FINAL artifact for external review + the PK apply/deploy gate. Nothing herein has been applied, deployed, committed, or pushed.

---

## Artifacts (CE worktree `cc-sched-editor-p1` @ base 3a63e8a; dashboard worktree `dash-sched-editor-p1` @ base origin/main 07d9c42)

**DB (CE), apply order 1a → 1c:**
- `supabase/migrations/20260727100000_p1a_schedule_format_override_surface.sql` — additive: `c.client_publish_schedule.format_override` column; `public.save_week_format_override(uuid,jsonb)` RPC (SECURITY DEFINER, service_role-only, two-pass fail-closed); `public.get_week_format_allocation` extended additively (new per-entry `format_override`/`effective_format`/`effective_is_valid` + top-level `selectable_formats`; `contract_version` stays `slice_a_allocation_v1`).
- `supabase/migrations/20260727100100_p1c_materialise_slots_honour_format_override.sql` — `m.materialise_slots` honours `format_override` (token-only; wins over allocator + legacy; forward-only via unchanged `ON CONFLICT DO NOTHING`).

**Rollbacks + byte-exact live pre-images:**
- `docs/briefs/artifacts/p1a-rollback.sql`, `docs/briefs/artifacts/p1c-rollback.sql`
- `docs/briefs/artifacts/p1-base-get_week_format_allocation-live.sql` (md5 `11e566b52347dd396f04b481e299bb7c`)
- `docs/briefs/artifacts/p1-base-materialise_slots-live.sql` (md5 `48e2db58c8696f091e60051321a1fcb8`)

**Dashboard (1b):** modified `app/(dashboard)/clients/page.tsx`; new `actions/week-format-plan.ts`, `components/clients/WeekFormatPlanTab.tsx`, `lib/week-format-plan.ts`. One new tab on `/clients` (no new route). Reads the extended wrapper (v1 superset); writes via `save_week_format_override`.

---

## Ordered apply/deploy steps

### Pre-checks (STOP on any failure)
- P0. Live-body drift guard: `md5(pg_get_functiondef('public.get_week_format_allocation(uuid,date)'))` == `11e566b52347dd396f04b481e299bb7c` AND `md5(pg_get_functiondef('m.materialise_slots(integer)'))` == `48e2db58c8696f091e60051321a1fcb8`. Any mismatch → STOP (live changed since authoring; re-capture + re-review).
- P1. `c.client_publish_schedule.format_override` does NOT yet exist; `public.save_week_format_override` does NOT yet exist.
- P2. branch-warden `safe` on both worktrees; change sets == the expected file sets, nothing stray.
- P3. All review verdicts clean/PASS (db-rls-auditor, dashboard-ia-lint, apply-harness-auditor shadow, external review pinned to this packet's hash).

### DB apply (PK-run; HARD STOP gate)
1. **Apply 1a** via `apply_migration` (name `p1a_schedule_format_override_surface`, body = the 1a file). `apply_migration` mints its own version — record the applied name↔repo-file mapping after.
2. **Post-1a verify (STOP on fail):**
   - `format_override` column present, nullable, no default.
   - `save_week_format_override` EXECUTE = service_role/postgres only; anon + authenticated denied (42501). No PUBLIC.
   - `get_week_format_allocation` still returns `contract_version='slice_a_allocation_v1'`; new fields present; existing Slice-A v1 dashboard panel still parses (version unchanged).
3. **Apply 1c** via `apply_migration` (name `p1c_materialise_slots_honour_format_override`, body = the 1c file). Precheck: 1a applied (column exists); live materialise md5 still `48e2db58…` immediately before apply.
4. **Post-1c LIVE PROOF (T3 — criterion 5/6; STOP on fail):**
   a. On a test schedule row, `save_week_format_override(client, [{schedule_id, format_override:<valid format for that platform>}])` → stored on the exact row, `set_count=1`.
   b. Adversarial: `save_week_format_override` with an unsupported combo (e.g. `carousel`/linkedin, `text`/youtube) → RAISES, zero write (fail-closed). And a clear (`format_override:null`) → `cleared_count=1`.
   c. Run `m.materialise_slots(<days_forward reaching a not-yet-materialised future week>)` → the new `m.slot` rows for the overridden schedule carry `format_preference = ARRAY[<override>]`.
   d. A NULL-override row still receives its computed allocation (no regression).
   e. Prove one enrolled client (`property-pulse`) and one legacy client path.
   f. Confirm all seven days incl. Sunday (day_of_week=0) seed + materialise (no Sunday drop).

### Dashboard deploy (separate; after DB is live)
5. Merge `dash-sched-editor-p1` → dashboard `origin/main` (PR) → Vercel deploy (dashboard's own path; not an EF deploy). Then browser-verify the Format Plan tab: seed from allocation; suggested-vs-override visible; edit + Save persists; invalid combo rejected with the RPC error surfaced; **reseed preserves overrides**; all seven days incl. Sunday render with correct dow labels. (Env note: the worktree has no Supabase env, so visual acceptance happens post-deploy.)

---

## STOP conditions (Convention 2 — non-removable)
Live-body md5 drift (P0) · unexpected origin movement on either base · any non-clean review verdict · any post-1a/post-1c verify failure · an unexpected file in either change set · an invalidated/failed rollback · the existing Slice-A v1 panel breaking after 1a. A tripped STOP voids the remainder; resumption needs a fresh PK gate.

## Rollback (if needed, reverse order)
- Roll back **1c first** (`p1c-rollback.sql`: CREATE OR REPLACE `m.materialise_slots` to base md5 `48e2db58…`) — it references `format_override`.
- Then **1a** (`p1a-rollback.sql`: restore `get_week_format_allocation` to base md5 `11e566…` → DROP `save_week_format_override` → DROP COLUMN `format_override`).
- Dashboard: revert the merge / redeploy prior Vercel build.

## Change detail (self-contained, for external review)

**1a — column:** `ALTER TABLE c.client_publish_schedule ADD COLUMN IF NOT EXISTS format_override text;` (nullable, no default, no backfill).

**1a — save RPC** `public.save_week_format_override(p_client_id uuid, p_overrides jsonb)` — SECURITY DEFINER, `search_path=''`, service_role-only (REVOKE PUBLIC/anon/authenticated; GRANT service_role; OWNER postgres). Two-pass: PASS 1 validates EVERY element with zero writes and RAISEs before PASS 2 applies. `p_overrides` = array of `{schedule_id, format_override}`. Rejections (all fail-closed, no write): schedule_id not owned by client (23503); unknown `ice_format_key`; `platform_support[platform]` absent OR false (`COALESCE(...,false)`); any bad element → RAISE 23514. `format_override` NULL/'' → clears the override (allowed). PASS 2 backs each write with `GET DIAGNOSTICS … = ROW_COUNT` and counts only rows actually updated; a validated row that updates 0 rows (concurrent delete between passes) RAISEs 23503 and rolls back the whole single-call txn (fail-closed, never over-counts). Returns `{ok, set_count, cleared_count}` = confirmed-applied row counts.

**1a — wrapper additive edits** to `public.get_week_format_allocation` (byte-exact live dow base md5 `11e566…`, `contract_version` unchanged `slice_a_allocation_v1`): occ CTE `+ s.format_override`; marked CTE `+ occ.format_override`; scored CTE `+ LEFT JOIN t."5.3_content_format" fo ON fo.ice_format_key = COALESCE(mk.format_override, mk.assigned_format)` and `+ (fo.platform_support ->> mk.platform) AS eff_support_raw`; entries `+ format_override, effective_format=COALESCE(override,assigned), effective_is_valid`; top-level `+ selectable_formats` (per-platform valid `ice_format_key[]`). No existing field/ordering/version changed.

**1c — materialiser edits** to `m.materialise_slots` (byte-exact live base md5 `48e2db58…`): driving `FOR v_rule` SELECT `+ cps.format_override`; immediately before the unchanged `INSERT … ON CONFLICT DO NOTHING`, `IF v_rule.format_override IS NOT NULL THEN v_format_pref := ARRAY[v_rule.format_override]; END IF;` (token-only; wins over allocator + legacy). INSERT column list / VALUES / conflict target unchanged.

## Review chain status
- **branch-warden: SAFE/caution** — both worktrees isolated on feature branches, change sets exact (CE 6 untracked; dash 1 mod + 3 new), no stray files. Caution = CE base is 3 unpushed commits ahead of origin (push-hygiene, not an apply blocker).
- **db-rls-auditor: CLEAN / pass (high confidence)** — provably additive; save RPC service_role-only + fail-closed all paths; wrapper ACL service_role-only live and preserved by CREATE OR REPLACE; materialiser edit changes only the format_preference value (idx_slot_unique_active identity unchanged); rollbacks byte-identical to live pre-images; live md5 zero drift; fresh migration names. PK-awareness (pre-existing, NOT introduced): latent m.materialise_slots anon/auth SECDEF ACL (blocked by no schema-m USAGE — separate T3 lane) + cosmetic save-RPC count-vs-rows edge under concurrent delete (no invalid write).
- **dashboard-ia-lint: NO BLOCK (NO_GOVERNING_RULE)** — no IA invariant violated (no new route, correct ?client= scoping, no status-vocab/approval-surface regression). Open PK product decision: the IA docs neither name nor place a "format-authority planning" surface, so whether a /clients config tab is its canonical home (vs SCHEDULE beat / Content Studio) is a product ruling. One naming WARN ("Slot times" → "Publish times") FIXED.
- **apply-harness-auditor (shadow): CONCERNS (low) → ADDRESSED.** Check 7 (rollback identity) + 9 other checks clean. Sole finding: save-RPC counts were intent-counts not ROW_COUNT-backed (over-report under a concurrent-delete race, no invalid write). FIXED in the 1a RPC (GET DIAGNOSTICS + fail-closed RAISE on 0-row validated update). Shadow mode clears no gate; recorded for completeness.
- **ask_chatgpt_review: AGREE / proceed** on hash `47360cbf…` (medium risk, high confidence, no pushback, no escalation; review_id `435c3dfa-7b50-4bec-b152-7586ea6f2d04`). SUPERSEDED — the apply-harness fix changed the 1a save-RPC SQL, so that review is stale; re-run pinned to the new packet hash below.
- **ask_chatgpt_review (re-run, current): ESCALATE / partial** on hash `de0e12a81274c855da1e628f92f763d7` (medium risk, medium confidence; review_id `c6ee429a-cf80-4400-8d52-6ce0533eb459`). Bridge auto-escalated to PK. Verified: the ROW_COUNT fix closes the shadow finding; branch-warden safe, db-rls-auditor clean. Pushback = generic caution: (i) concurrent-transaction interactions of the new PASS 2 — the named case (0-row validated update) is now fail-closed; (ii) "downstream production effects of applying both migrations" — covered by the Phase-1 boundary (materialiser sets only the fill-time `format_preference`; no downstream authority change). Its concrete mitigation ("apply 1a and validate before 1c") is ALREADY the declared apply order. No named concrete defect. → PK adjudication gate (this footer line is post-review record-keeping; the reviewed substance/SQL at hash `de0e12a8…` is unchanged).

> **Re-review trigger:** if the ordered steps, STOP conditions, or Change-detail SQL change, the review is stale and must be re-run against the new packet hash.
