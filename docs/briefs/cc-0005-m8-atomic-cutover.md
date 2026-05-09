# Brief cc-0005 — M8a Path A cutover (cron 48 in-place rewrite + legacy-origin future cleanup; function deprecation **DEFERRED to M8b**)

**Created:** 2026-05-09 Sydney  
**Author:** chat  
**Patched:** 2026-05-09 Sydney — **v4 patch (M8 staged → M8a only; Component 3 deferred to M8b)** under PK direction. Supersedes v3 (commit `245005a3`) after CC's v3 pre-flight HALT surfaced 2 non-cron manual callers of `public.get_next_scheduled_for` that v3 Component 3 (rename) would have broken.  
**Executor:** chat (apply via Supabase MCP `apply_migration`) OR Claude Code per brief-runner-v0  
**Status:** issued (v4 patched 2026-05-09; apply pending PK direction to schedule)  
**Result file:** `docs/briefs/results/cc-0005-m8a-cron48-rewrite-and-legacy-cleanup.md` (created on completion)

---

## Patch history

- **2026-05-09 Sydney — v4 patch (M8 staged → M8a only; Component 3 deferred to M8b)** under PK direction. **Trigger:** CC's v3 pre-flight HALT at §1.4 surfaced 2 non-cron manual callers of `public.get_next_scheduled_for`:
  - `public.draft_approve_and_enqueue`
  - `public.draft_approve_and_enqueue_scheduled`

  These are dashboard / manual-flow paths used by operators for individual draft approvals; they are NOT autonomous (do not run on cron). v3's Component 3 (`ALTER FUNCTION ... RENAME TO get_next_scheduled_for__deprecated_m8`) would have broken both manual flows the moment it landed. v3 §1.4 + V10 in-migration gate would have correctly HALTed apply (which is what they did at pre-flight), but the deeper question is: do we want to rename the function at all right now, or first remediate the manual callers? PK directive: **stage M8 into M8a (this brief) and M8b (separate cc-NNNN brief).**

  **v4 scope reduction (M8a only):**
  - **Component 1 (cron 48 in-place rewrite)** — RETAINED, unchanged from v3. Cron 48 keeps `active=true`. Removes the legacy fallback function call from the COALESCE chain in cron 48's command body.
  - **Component 2 (legacy-origin future cleanup)** — RETAINED. Count band re-banded from `[0, 200]` (v3) to `[250, 500]` (v4) around CC's v3 pre-flight observation of 344 rows. Both lower (250) and upper (500) bounds are HALT criteria. Lower bound prevents apply on a near-zero count (would indicate criterion regression or that the cohort already drained); upper bound prevents apply on a runaway count (would indicate scope creep). `v_min_expected` variable restored (v3 M3 "removed unused" reversed).
  - **Component 3 (function rename + COMMENT)** — **DEFERRED to M8b.** Removed entirely from §3 SQL. v4 does NOT rename `public.get_next_scheduled_for`. The function continues to exist with its original name and signature. cron 48 stops calling it post-Component-1; the 2 manual callers continue to call it post-M8a.

  **v4 verify gate restructure:**
  - V7 (cron 48 active=true + schedule unchanged + jobname unchanged) — RETAINED.
  - V8 (cron 48 command no longer contains a function-call to legacy fallback) — RETAINED with v3 function-call regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('`.
  - V9 (autonomous slot-driven enqueue path preserved) — RETAINED.
  - V10 (zero live callers) — **RETIRED for M8a.** Replaced with **V10' (expected callers list)**: exactly cron 48 + the 2 manual functions = 3 expected callers. HALT only if a caller surfaces OUTSIDE this expected set.
  - V10b (function rename paranoia) — RETIRED for M8a; folds into M8b.

  **v4 §1.4 expectation update:** v3 expected exactly 1 caller (cron 48). v4 expects exactly 3 callers (cron 48 + `draft_approve_and_enqueue` + `draft_approve_and_enqueue_scheduled`). HALT (v4 §8.2.g) if a caller outside this expected set surfaces.

  **v4 §1.4b retirement:** ORIGINAL_COMMENT capture is no longer needed (no rename in M8a). Removed.

  **v4 §1.5c (un-publishable cohort) rule update:** v3 captured this as informational with PK direction required pre-apply. v4 makes it informational ONLY — the 94 un-publishable legacy drafts CC observed at v3 pre-flight are recorded as a **separate follow-up finding / brief candidate** (out of M8a and M8b scope). Apply gates no longer include PK direction on this cohort. The cohort exists; M8a does not address it; future cleanup brief required if PK directs.

  **v4 dead_reason value:** unchanged from v3 — `m8_cutover_legacy_path_deprecated` (preserved for brief-patch minimalism; v3 value referred to the legacy *path* being deprecated from cron 48, which is still accurate for M8a).

  **v4 migration name:** changed from v3 `m8_atomic_cutover_v1` to `m8a_cron48_rewrite_and_legacy_cleanup_v1` (clearer phase signalling; v3 "atomic cutover" no longer accurate after Component 3 deferral). Migration name not burned (v3 was never applied).

  **v4 §8.3 rollback simplification:** reduced from 3-component reversal to 2-component reversal. Removed `<ORIGINAL_COMMENT>` placeholder + unique-dollar-quote-tag guidance (only 1 dollar-quoted body remains: cron 48 command). Apply-time amendment list reduced from 4 items (v3) to 2 items (v4): (a) `updated_at` per §1.1, (b) cleanup band integers if PK directs adjustment from [250, 500].

  **v4 NEW §M8b follow-up section** — documents the deferred work as a separate brief shape: (1) remediate `public.draft_approve_and_enqueue` caller; (2) remediate `public.draft_approve_and_enqueue_scheduled` caller; (3) re-verify zero callers; (4) `ALTER FUNCTION public.get_next_scheduled_for RENAME TO __deprecated_m8` + `COMMENT ON FUNCTION`. Brief shape mirrors cc-0005 v3 Component 3 + new pre-flight on the 2 manual callers. M8b is NOT the responsibility of this brief; this brief defers to it cleanly.

  **v4 brief-runner-v0 lesson candidates:**
  - **L19 (CC v3 pre-flight HALT pattern)** — v3 §1.4 caller check correctly HALTed at apply when expected callers (1) didn't match observed callers (3). Pattern vindicates the v3 H1-H6 expansion: pre-flight cohort surfacing (L18) caught a real blocker before apply, AND the function-call regex (L16) correctly identified all 3 callers (rather than hidden substring noise).
  - **L20 (in-place patch vs scope-reduce vs new brief)** — v3 was patched to v4 because v3 was never applied (consistent with L17). Component 3 was deferred to a NEW brief (M8b) rather than retried in-place because the dependency (manual caller remediation) is non-trivial and warrants its own pre-flight + verification + D-01.
  - **L21 (scope re-banding pattern)** — brief lower bounds matter as much as upper bounds. v3 had min=0 (allowing no-op); v4 re-bands to [250, 500] to REQUIRE a non-trivial cohort (validates brief premise; HALTs apply if observed count is suspiciously low).

  Patches in detail under §Patch history details below (~30-item enumeration covering all v4 changes vs v3).

- **2026-05-09 Sydney — v3 patch (regex correctness + H1-H6 + L2)** under PK direction. Five critical regex bugs in the v2 Path A patch (`f70cb41f`) would have blocked first apply: the in-migration verify gates V8 and V10 used substring matches (`ILIKE '%get_next_scheduled_for%'` / `~ 'get_next_scheduled_for'`) which would have matched the substring in the M8 Path A comment line in the rewritten cron 48 command body, fired `RAISE EXCEPTION`, and rolled back the transaction before Component 2 + Component 3 could run. v3 replaced all 8+ substring matches with function-call-syntax regex. v3 also reworded the M8 Path A comment in the rewritten cron 48 command body to remove the `get_next_scheduled_for` substring entirely ("legacy fallback removed from COALESCE chain.") as belt-and-braces. v3 additionally extended pre-flight scope per the H1-H6 review: distinct `pd.created_by` enumeration (H3), un-publishable legacy draft cohort query (H4), slot-driven alignment check (H5; HALT §8.2.l if misaligned), original COMMENT capture for rollback (H6), unique rollback dollar-quote tag guidance (M1), §Forbidden-actions amendment list expanded to 4 items (M2), removed unused `v_min_expected` variable (M3), TOCTOU acknowledgement (M4), expanded §1.2 trigger survey (L1), and explicit schedule capture in §1.3 + V7 (L2). **Superseded by v4 due to scope reduction (M8 staged into M8a + M8b).**

- **2026-05-09 Sydney — Path A patch (v2)** — commit `f70cb41f72e01c27c83639f1ae5bf0dac9353b70`. Component 1 changed from "disable cron 48" to "rewrite cron 48's command body in place". **Superseded by v3 due to regex correctness bugs.**

- **2026-05-09 Sydney (initial draft)** — commit `6f16c40e4947c19280b6f004c1ed3435a234b9ef`. Original Path C draft. Premise was incorrect (chat investigation 2026-05-09 established Path C would stop autonomous publishing).

---

## Investigation record (chat, 2026-05-09)

This Path A patch is informed by a read-only Supabase investigation conducted by chat 2026-05-09 (the turn immediately after cc-0004 closure / sync_state v2.56). Findings:

1. **Cron 48 is currently the SOLE autonomous inserter into `m.post_publish_queue`.** Confirmed by enumerating every function whose definition contains `INSERT INTO m.post_publish_queue` across all relevant schemas. Result: 4 hits beyond cron 48 — `public.draft_approve_and_enqueue`, `public.draft_approve_and_enqueue_scheduled`, `public.manual_post_insert`, `m.run_system_audit`. All 4 are dashboard-manual / audit paths; **none are autonomous**.

2. **`m.fill_pending_slots` inserts drafts + AI jobs only, NOT queue rows.** The fill function INSERTs / UPSERTs into `m.post_draft` and `m.ai_job`. The function NEVER touches `m.post_publish_queue`. Slot-driven drafts therefore depend on cron 48 to enqueue them.

3. **No trigger on `m.post_draft`, `m.slot`, `m.ai_job`, or `m.post_publish` inserts queue rows.**

4. **Disabling cron 48 with no replacement = autonomous publishing stops.** The original cc-0005 draft (Path C) component 1 (`cron.alter_job(48, active := false)`) would have stopped autonomous publishing.

5. **NEW v4: 2 non-cron manual callers of `public.get_next_scheduled_for` confirmed at v3 pre-flight (CC, 2026-05-09):**
   - `public.draft_approve_and_enqueue` — dashboard manual draft-approval flow.
   - `public.draft_approve_and_enqueue_scheduled` — dashboard scheduled-draft-approval flow.

   Both functions call `public.get_next_scheduled_for(...)` for non-cron, manual / dashboard-driven approval paths. v3 Component 3 (rename) would have broken both immediately. PK decision: defer Component 3 to M8b after these 2 callers are remediated.

6. **NEW v4: 94-row un-publishable legacy draft cohort observed at v3 pre-flight (CC, 2026-05-09).** Drafts where `pd.slot_id IS NULL AND pd.scheduled_for IS NULL AND created_by='seed_and_enqueue' AND approval_status IN ('approved','scheduled') AND no queue row exists`. Post-M8a: cron 48 won't enqueue these (rewritten WHERE filter drops legacy-unresolvable rows). They will silently never publish. **Recorded as separate follow-up finding / brief candidate — out of M8a and M8b scope.**

**Cron 48 current command body (captured by chat 2026-05-09):** three-element COALESCE chain inside the candidates CTE:

```sql
COALESCE(
  pd.scheduled_for,                                              -- (1) preferred; set by m.fill_pending_slots for slot-driven
  s.scheduled_publish_at,                                        -- (2) M4 LEFT JOIN safety net for slot-driven
  public.get_next_scheduled_for(j.client_id, j.platform, NOW())  -- (3) legacy fallback; Bug 3 source pre-M3 fix
)
```

The Path A cutover removes position (3) so legacy-unresolvable drafts are skipped via the existing `WHERE computed_scheduled_for IS NOT NULL` filter rather than fallback-scheduled.

**PK directed Path A staged: M8a (this brief) + M8b (deferred separate brief).** This v4 brief implements M8a only.

---

## Task (M8a only)

Execute the M8a Path A cutover. **Two coordinated components in a single atomic transaction** (was 3 in v3; Component 3 deferred to M8b):

1. **Rewrite cron 48 (`enqueue-publish-queue-every-5m`) command body in place** via `cron.alter_job(48, command := <new body>)`. **Cron 48 remains `active=true`.** The new command body is the current command MINUS `public.get_next_scheduled_for(...)` from the COALESCE chain in the candidates CTE — resulting COALESCE: `(pd.scheduled_for, s.scheduled_publish_at)`. Legacy rows with both NULL are **skipped** via the pre-existing `WHERE computed_scheduled_for IS NOT NULL` filter. v3-rephrased comment annotation retained (no longer contains the substring `get_next_scheduled_for`).
2. **Cleanup of legacy-origin future queue rows** — dead-letter all `m.post_publish_queue` rows where `pd.slot_id IS NULL AND pd.created_by='seed_and_enqueue' AND q.scheduled_for > NOW() AND q.status IN ('queued','failed')`. **Conditional on Component 1 verify gate passing** (cron 48 command no longer contains a function-call to `get_next_scheduled_for`); enforced via in-migration `RAISE EXCEPTION`. Count band: **[250, 500]** (v4 re-banded around CC's v3 pre-flight observation of 344). HALT (§8.2.a) if observed count outside band.
3. ~~**Deprecate `public.get_next_scheduled_for`**~~ — **DEFERRED to M8b.** Function NOT renamed in M8a. NOT touched by this brief.

Apply via Supabase MCP `apply_migration` as migration `m8a_cron48_rewrite_and_legacy_cleanup_v1`. Single atomic transaction.

**Sequencing:** cc-0003 v2 + cc-0004 confirmed Complete (commits `d60dcfb` + `9d5bdd37`).

---

## Source context

- **Investigation record above** (this brief; chat 2026-05-09).
- **CC v3 pre-flight HALT** (2026-05-09; surfaced 2 non-cron manual callers + 94-row un-publishable cohort + 344 cleanup count).
- `docs/briefs/2026-05-05-queue-integrity-incident.md` v3 §2 + §6 + §8.
- `docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md` §2.8 + §6 Q2 + §6 Q3.
- `docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md` (v2 patched) — pattern source.
- `docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` (post 2026-05-09 patch) — pattern source.
- `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` — v1 HALT result.
- `docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` — sequencing satisfied 2026-05-09.
- `docs/runtime/sessions/2026-05-09-cc-0006-closed-cc-0005-v3-patched.md` — v2.57 close.
- `docs/runtime/sessions/2026-05-05-m4-applied-state-capture-override.md` + `docs/runtime/sessions/2026-05-05-m5-applied-corrected-cascade-fix.md` — M4/M5 state.
- `docs/dashboard-review-2026-05/10_product_objects_and_data_model.md` §10.2.
- **v4 patch commit (this version)** — see Patch history; v3 patch commit `245005a3` superseded.

**`dead_reason` canonical value:** `m8_cutover_legacy_path_deprecated` (preserved from v3; refers to the legacy path being deprecated from cron 48; M8a still validates this even with function rename deferred to M8b).

## Scope (M8a)

**In scope:**
- Pre-flight verification (read-only SELECTs).
- One D-01 fire (`ask_chatgpt_review`) with packet specified in §5.
- Single Supabase MCP `apply_migration` call with the exact SQL in §3 (atomic 2-component migration with one in-migration verify gate).
- 9 post-apply verification queries V1–V9 + V10' (§7; was 10 + V10b in v3).
- Rollback within session if any verification fails (per §8); rollback reverses BOTH 2 components.
- Close-the-loop UPDATE to `m.chatgpt_review`.
- 4-way sync at session close.
- M8a closure documented in 4-way sync (M7 closure folds at M8b time).

**Out of scope (M8a):**
- **`public.get_next_scheduled_for` function rename** — DEFERRED to M8b.
- **`COMMENT ON FUNCTION` annotations** — DEFERRED to M8b.
- **Remediation of `public.draft_approve_and_enqueue` caller** — M8b scope.
- **Remediation of `public.draft_approve_and_enqueue_scheduled` caller** — M8b scope.
- **Cleanup of 94 un-publishable legacy drafts** — separate follow-up brief if PK directs (out of M8a/M8b scope).
- M-09-03 view DDL.
- Any change to cron jobs other than 48.
- Disabling cron 48 (Path A explicitly retains active=true).
- Any DDL.
- Any change to `m.post_draft` rows.
- Any change to `m.slot` rows.
- Any change to other tables.
- P1 SECURITY-DEFINER hold targets.
- `m.ef_drift_log`.
- EF deploys, dashboard/portal/web work.
- Building a replacement enqueue path.

## Allowed actions

- Read source files referenced in §Source context.
- Read-only `SELECT` against the database for pre-flight P1–P5 + post-apply verification.
- One `ask_chatgpt_review` D-01 fire per §5.
- One `apply_migration` call with the exact SQL in §3 (after PK explicit approval based on D-01 result, AND after §1.0 + sequencing gates pass).
- Up to 3 retries on the post-apply verification queries (network/timeout reasons only).
- One rollback migration per §8.3 if any verification fails.
- One close-the-loop UPDATE to `m.chatgpt_review` after success.
- One commit creating `docs/briefs/results/cc-0005-m8a-cron48-rewrite-and-legacy-cleanup.md`.
- 4-way sync close commits at session end.

## Forbidden actions

- No second `apply_migration` call beyond the one in §3 (and a rollback if verification fails).
- **SQL amendment list (2 items, reduced v4 from 4 in v3):** No modifications to the SQL in §3 except (a) to add or remove `updated_at = NOW()` per P1.1 outcome on `m.post_publish_queue`, and (b) to adjust the `[v_min_expected, v_max_expected] = [250, 500]` cleanup band integers if PK explicitly directs based on §1.5a fresh pre-flight count. v3 amendments (c) `2026-05-XX` date in COMMENT and (d) `<ORIGINAL_COMMENT>` placeholder — RETIRED in v4 (no Component 3, no rename). All v4 amendments are documented in the D-01 packet (§5.2 `sql_to_apply` field) before fire.
- **No `ALTER FUNCTION public.get_next_scheduled_for(...)` of any kind in M8a.** Deferred to M8b.
- **No `COMMENT ON FUNCTION public.get_next_scheduled_for(...)` in M8a.** Deferred to M8b.
- **No setting `cron.alter_job(48, active := false)`.** Path A explicitly retains cron 48 active. Component 1 only rewrites the `command` argument.
- No cron edits to ANY cron job other than jobid 48.
- No DDL of any kind. No new functions. No table DDL. No index DDL.
- No changes to `m.post_draft` rows. No changes to `m.slot` rows. No changes to any other table.
- No D-01 fire beyond the one in §5.
- No deletes. Cleanup is UPDATE only.
- No `apply_migration` if §1.0 sequencing gate fails.
- No `apply_migration` if cc-0003 v2 OR cc-0004 result file is missing or shows incomplete status.
- No `apply_migration` if pre-flight cleanup count returns outside [250, 500] (HALT path §8.2.a).
- No `apply_migration` if pre-flight §1.4 surfaces any caller of `public.get_next_scheduled_for` outside the **expected v4 set of 3**: cron 48 + `public.draft_approve_and_enqueue` + `public.draft_approve_and_enqueue_scheduled`.
- **No `apply_migration` if §1.5 P1.5d alignment check returns non-zero (HALT path §8.2.l).**
- No proceeding past D-01 if the verdict is anything other than `agree` with `proceed`.
- No assumption that `pd.created_by = 'seed_and_enqueue'` is the only legacy-origin filter — §1.5 P1.5b enumerates distinct values.
- No assumption that `pre_dead_reason_count` for `m8_cutover_legacy_path_deprecated` is 0. Always read from §1.8.
- No assumption that the Path A new cron 48 command body is byte-equivalent to the existing body except for the third COALESCE element. The complete rewritten body is specified in §3.
- No edit to `00_overview.md`, `04_phases.md`, `06_decisions.md` from this session unless 4-way sync requires it.
- No Phase 0 scheduling.
- No invocation of `m.fill_pending_slots` or any other v4 EF/function from within this brief's apply session.

---

## 1. Pre-flight verification (read-only, runs at apply session start)

### 1.0 Sequencing gate (HARD GATE; runs before §1.1)

**Pre-condition:** before any other pre-flight query, confirm:

1. **cc-0003 v2 result file shows status=Complete or NO-OP.** §1.9 verifies. **Confirmed v2.55 close (commit `08d4835`); cc-0003 v2 result at `d60dcfb` showing 9 rows dead-lettered, V1-V6 PASS.**
2. **cc-0004 result file shows status=Complete or NO-OP.** §1.9 verifies. **Confirmed v2.56 close (commit `ec3fd92e`); cc-0004 result at `9d5bdd37` showing 43 rows dead-lettered, V1-V6 PASS.**

**Decision rule:** Both confirmed (true as of 2026-05-09) → proceed to §1.1. Either missing/incomplete → HALT (§8.2.c).

### 1.1 Confirm table + column structure

```sql
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE (table_schema, table_name) IN (
  ('m', 'post_publish_queue'),
  ('m', 'post_draft')
)
AND column_name IN (
  'queue_id', 'status', 'dead_reason', 'scheduled_for', 'created_at', 'updated_at',
  'post_draft_id', 'client_id', 'platform',
  'slot_id', 'approval_status', 'created_by'
)
ORDER BY table_schema, table_name, column_name;
```

**Expected:** `m.post_publish_queue.{queue_id, status, dead_reason, scheduled_for, post_draft_id}` + `m.post_draft.{post_draft_id, slot_id, created_by}` confirmed present. **Critical:** `m.post_draft.created_by` MUST exist. HALT (§8.2.f) if absent.

### 1.2 Confirm trigger surface (expanded v3 per L1)

```sql
SELECT pn.nspname AS schema_name, c.relname AS table_name,
       t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) AS triggerdef
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace pn ON pn.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND (pn.nspname, c.relname) IN (
    ('m', 'post_publish_queue'),
    ('m', 'post_draft'),
    ('m', 'slot'),
    ('m', 'ai_job'),
    ('m', 'post_publish')
  )
ORDER BY pn.nspname, c.relname, t.tgname;
```

**Decision rule:** HALT if any trigger fires on UPDATE of `status` AND has external side-effects on `m.post_publish_queue`. Capture full list for D-01.

### 1.3 Cron 48 current state, command body, schedule, and history

```sql
SELECT jobid, jobname, schedule, command, active, database, username
FROM cron.job
WHERE jobid = 48;
```

**Capture (v3 explicit per L2):** `OLD_CRON_48_COMMAND` (the FULL `command` text) AND `OLD_CRON_48_SCHEDULE` (the schedule string). Both required by §8.3 rollback (command body) AND V7 (schedule unchanged check).

**Decision rule:**
- `active = false` → HALT (§8.2.j); Path A premise violated.
- Command does not contain a function-call to `get_next_scheduled_for(...)` (per the regex in §1.4) → component 1 is a no-op for the rewrite (idempotent); proceed but flag.
- Command contains the call (expected) → proceed.
- Command does not contain `INSERT INTO m.post_publish_queue` → HALT (§8.2.k).

```sql
SELECT jobid, runid, job_pid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = 48
ORDER BY start_time DESC
LIMIT 10;
```

If > 50% of last 10 runs show `status != 'succeeded'` — capture for D-01 (informational).

### 1.4 Identify all callers of `public.get_next_scheduled_for` (v4 — expected callers list updated)

**v3 fix (preserved in v4):** all three sub-queries use function-call-syntax regex `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` instead of substring `ILIKE '%get_next_scheduled_for%'`. Pattern correctly distinguishes function calls from comment-mentions.

```sql
-- Function/procedure callers
SELECT n.nspname AS schema_name, p.proname AS function_name, 'function' AS object_type,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind IN ('f','p')
  AND pg_get_functiondef(p.oid) ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
  AND NOT (n.nspname = 'public' AND p.proname IN ('get_next_scheduled_for', 'get_next_scheduled_for__deprecated_m8'))  -- exclude self
  AND n.nspname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')

UNION ALL

-- View callers
SELECT schemaname, viewname, 'view',
       NULL
FROM pg_views
WHERE definition ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
  AND schemaname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')

UNION ALL

-- Cron callers
SELECT 'cron' AS schema_name, jobname AS function_name, 'cron' AS object_type,
       'jobid=' || jobid AS args
FROM cron.job
WHERE command ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\(';
```

**v4 expected callers (3):**
1. `public.draft_approve_and_enqueue` (function row)
2. `public.draft_approve_and_enqueue_scheduled` (function row)
3. `enqueue-publish-queue-every-5m` (cron row, jobid=48)

**Decision rule (v4 updated from v3):**
- Exactly the 3 expected callers above surface (CC v3 pre-flight observation) → PROCEED.
- More than 3 callers OR a caller outside the expected set surfaces → HALT (§8.2.g, v4 rephrased). New non-cron callers means M8a's premise (the 2 manual callers we know about) is incomplete; investigate.
- Fewer than 3 callers surface → PROCEED but FLAG for D-01 (something has changed; possible caller already remediated independently).
- 0 cron callers (e.g. re-attempt after partial state) → proceed; component 1 is a no-op.

**Surface the EXACT signature of `public.get_next_scheduled_for`** (informational v4; no longer renamed, but useful for M8b reference):

```sql
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_next_scheduled_for';
```

**Decision rule (v4):** 0 rows → informational; the function is already absent which means M8b has effectively run separately. 1 row → capture `args` for the M8b reference. > 1 → HALT (§8.2.h, **rephrased v4** — not a hard blocker for M8a since we don't rename, but multiple sigs is unusual and worth flagging).

### 1.4b ~~Capture pre-existing COMMENT~~ — RETIRED v4

**v3 had this for rollback's COMMENT restoration. v4 doesn't rename, so no COMMENT is touched, so no capture or restoration is needed.** Removed.

### 1.5 Cleanup count check + 3 v3 sub-queries (v4 P1.5a re-banded; P1.5c rule updated)

#### P1.5a — Cleanup count check (v4 re-banded to [250, 500])

```sql
SELECT COUNT(*) AS m8a_cleanup_count,
       MIN(q.scheduled_for) AS earliest_future,
       MAX(q.scheduled_for) AS latest_future,
       COUNT(DISTINCT (q.client_id, q.platform)) AS partition_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW();
```

**Decision rule (v4):** 
- Outside [250, 500] → **HALT (§8.2.a)**. v3 band [0, 200] retired; v4 band re-anchored around CC's v3 pre-flight observation of 344. Lower bound 250 prevents apply on a near-zero count (criterion regression or cohort drained); upper bound 500 prevents apply on a runaway count (scope creep). 
- Inside [250, 500] → proceed. 
- Apply-time amendment: PK may direct band adjustment (§Forbidden actions amendment (b)) if fresh pre-flight reveals materially different count.

#### P1.5b — Distinct `pd.created_by` enumeration (NEW v3 per H3; carried into v4)

```sql
SELECT pd.created_by, COUNT(*) AS row_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
GROUP BY pd.created_by
ORDER BY row_count DESC;
```

**Decision rule:** capture all values for D-01. Informational; no HALT.

#### P1.5c — Un-publishable legacy draft cohort (NEW v3 per H4; v4 rule updated)

```sql
SELECT COUNT(*) AS unpublishable_legacy_draft_count,
       MIN(pd.created_at) AS oldest_unpublishable,
       MAX(pd.created_at) AS newest_unpublishable,
       COUNT(DISTINCT (pd.client_id, pd.platform)) AS partition_count
FROM m.post_draft pd
WHERE pd.slot_id IS NULL
  AND pd.scheduled_for IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND pd.approval_status IN ('approved','scheduled')
  AND NOT EXISTS (
    SELECT 1 FROM m.post_publish_queue q
    WHERE q.post_draft_id = pd.post_draft_id
  );
```

**v4 decision rule (RELAXED from v3):** capture for D-01 packet as informational. **NO PK direction blocker required for M8a apply.** v3 required PK direction on (a) apply as-is, (b) cleanup pre-Path-A, or (c) extend Path A scope. v4 RELAXES this: M8a applies as-is regardless of `unpublishable_legacy_draft_count`; the cohort is recorded as a **separate follow-up finding / brief candidate** (out of M8a and M8b scope). CC's v3 pre-flight observed 94 — carry that figure (or fresh count) into the result file as a closure note pointing to the follow-up.

#### P1.5d — Slot-driven `pd.scheduled_for` vs `s.scheduled_publish_at` alignment check (NEW v3 per H5; carried into v4)

```sql
SELECT COUNT(*) AS post_cc0004_misaligned_count,
       COUNT(DISTINCT pd.client_id) AS distinct_clients
FROM m.post_draft pd
JOIN m.slot s ON s.slot_id = pd.slot_id
WHERE pd.slot_id IS NOT NULL
  AND pd.scheduled_for IS DISTINCT FROM s.scheduled_publish_at
  AND pd.approval_status IN ('approved','scheduled');
```

**Decision rule (unchanged from v3):** Expected 0 post-cc-0004. **HALT (§8.2.l) if non-zero.** Path A would silently use misaligned `pd.scheduled_for` values.

#### P1.5 cross-check vs cc-0003 v2 + cc-0004 (unchanged)

```sql
SELECT
  COUNT(*) FILTER (WHERE pd.slot_id IS NULL
                       AND ABS(EXTRACT(EPOCH FROM (q.scheduled_for - q.created_at)) - 300) < 60)
    AS overlap_with_cc_0003_v2_criterion,
  COUNT(*) FILTER (WHERE pd.slot_id IS NOT NULL)
    AS overlap_with_cc_0004_criterion
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW();
```

**Decision rule:** Both expected 0. HALT (§8.2.i) if either non-zero.

### 1.6 Capture cleanup snapshot

```sql
SELECT q.queue_id, q.client_id, q.platform,
       q.scheduled_for AS queue_scheduled_for, q.created_at,
       q.status AS pre_status, q.post_draft_id,
       pd.approval_status AS draft_status, pd.slot_id, pd.created_by
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW()
ORDER BY q.scheduled_for, q.queue_id;
```

**Purpose:** target snapshot for V5 paranoia + rollback reconstruction. Persist queue_id list (≈344 per CC v3 pre-flight; fresh count at apply time).

### 1.7 Capture pre-state aggregates

```sql
SELECT status, COUNT(*) AS row_count
FROM m.post_publish_queue
GROUP BY status
ORDER BY status;
```

### 1.8 Capture pre-existing `dead_reason` baseline

```sql
SELECT COUNT(*) AS pre_dead_reason_count
FROM m.post_publish_queue
WHERE dead_reason = 'm8_cutover_legacy_path_deprecated';
```

**Do not assume = 0.** Always read.

### 1.9 Sequencing gate: verify cc-0003 v2 + cc-0004 completion

Read both result files via Invegent GitHub MCP:
- `docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md` — confirm Complete. **Confirmed v2.55 (commit `08d4835`); cc-0003 v2 result at `d60dcfb`.**
- `docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md` — confirm Complete. **Confirmed v2.56 (commit `ec3fd92e`); cc-0004 result at `9d5bdd37`.**

Decision rule: Both Complete/NO-OP → proceed. Either Partial/Blocked/missing → HALT (§8.2.c).

```sql
SELECT dead_reason, COUNT(*) AS row_count
FROM m.post_publish_queue
WHERE dead_reason IN (
  'anomalous_scheduled_for_bug3_fallback',
  'anomalous_pre_m4_v4_mismatch'
)
GROUP BY dead_reason
ORDER BY dead_reason;
```

**Expected:** Bug 3 row_count = 9; v4 mismatch row_count = 43. Capture for D-01.

---

## 2. Selection criterion (cleanup component, locked)

```sql
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW()
```

**Rationale + disjointness:** unchanged from v2/v3.

---

## 3. Proposed SQL (M8a v4, locked)

Applied via Supabase MCP `apply_migration`:
- **Migration name:** `m8a_cron48_rewrite_and_legacy_cleanup_v1`
- **Project ID:** `mbkmaxqhsohbtwsqolns`

```sql
-- M8a Path A cron 48 rewrite + legacy cleanup (v4 patched)
-- See: docs/briefs/cc-0005-m8-atomic-cutover.md (v4 patched 2026-05-09; M8a only)
--
-- TWO coordinated components in a single transaction (was 3 in v3; Component 3
-- function rename + COMMENT DEFERRED to M8b after manual caller remediation):
--   1. Rewrite cron 48 command body in place (drop legacy fallback from COALESCE)
--   2. Cleanup legacy-origin future queue rows
--
-- Both atomic. One in-migration verify gate (V7+V8+V9) enforces the conditional
-- dependency between Component 1 (cron rewrite) and Component 2 (cleanup).
--
-- v3 fix (preserved in v4): regex checks use ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
--                            (function-call syntax) instead of substring ILIKE.
-- v3 fix (preserved in v4): rewritten cron body comment no longer contains the
--                            substring 'get_next_scheduled_for' (belt-and-braces).
-- v4 change: V10 in-migration pre-rename gate REMOVED (no rename in M8a).
-- v4 change: Component 3 (ALTER FUNCTION + COMMENT) REMOVED entirely.
-- v4 change: Component 2 cleanup band re-banded to [250, 500].

-- =========================================================================
-- COMPONENT 1: Rewrite cron 48 command body in place (Path A) [v3 verbatim]
-- =========================================================================

DO $$
DECLARE
  v_old_command text;
  v_new_command text;
  v_active boolean;
BEGIN
  SELECT command, active INTO v_old_command, v_active
    FROM cron.job WHERE jobid = 48;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'M8a Path A HALT: cron jobid 48 not found.';
  END IF;

  IF v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'M8a Path A HALT: cron 48 active=% pre-rewrite; expected true. Path A retains cron 48 active.', v_active;
  END IF;

  -- v3 fix: idempotency check uses function-call regex, not substring match.
  IF v_old_command !~* 'get_next_scheduled_for(__deprecated_m8)?\s*\(' THEN
    RAISE NOTICE 'M8a Path A component 1: cron 48 command already has no function-call to the legacy fallback; treating component 1 as idempotent no-op. Verify gate proceeds.';
  ELSE
    v_new_command := $cron_body$
  WITH candidates AS (
    SELECT
      j.ai_job_id,
      j.post_draft_id,
      j.client_id,
      j.platform,
      COALESCE(
        pd.scheduled_for,
        s.scheduled_publish_at
        -- M8 Path A 2026-05-XX: legacy fallback removed from COALESCE chain.
        -- Legacy rows with both NULL are skipped via WHERE computed_scheduled_for IS NOT NULL.
      ) AS computed_scheduled_for
    FROM (
      SELECT DISTINCT ON (j2.client_id, j2.platform)
        j2.ai_job_id, j2.post_draft_id, j2.client_id, j2.platform
      FROM m.ai_job j2
      JOIN m.post_draft pd2 ON pd2.post_draft_id = j2.post_draft_id
      WHERE j2.status = 'succeeded'
        AND j2.post_draft_id IS NOT NULL
        AND pd2.approval_status IN ('approved', 'scheduled', 'published')
        AND NOT EXISTS (
          SELECT 1 FROM m.post_publish_queue q
          WHERE q.post_draft_id = j2.post_draft_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM m.post_publish p
          WHERE p.post_draft_id = j2.post_draft_id AND p.status = 'published'
        )
        -- F-PUB-010 hard-cap enforcement preserved verbatim
        AND (
          SELECT COUNT(*)
          FROM m.post_publish_queue q3
          WHERE q3.client_id = j2.client_id
            AND q3.platform = j2.platform
            AND q3.status = 'queued'
        ) < COALESCE(
          (
            SELECT cpp.max_queued_per_platform
            FROM c.client_publish_profile cpp
            WHERE cpp.client_id = j2.client_id
              AND cpp.platform = j2.platform
            LIMIT 1
          ),
          10
        )
      ORDER BY j2.client_id, j2.platform, j2.created_at ASC
    ) j
    JOIN m.post_draft pd ON pd.post_draft_id = j.post_draft_id
    LEFT JOIN m.slot s ON s.slot_id = pd.slot_id  -- M4: slot intent lookup
  )
  INSERT INTO m.post_publish_queue
    (ai_job_id, post_draft_id, client_id, platform, scheduled_for, status)
  SELECT
    ai_job_id, post_draft_id, client_id, platform, computed_scheduled_for, 'queued'
  FROM candidates
  WHERE computed_scheduled_for IS NOT NULL  -- M3 Bug 3 fix; M8 Path A: also filters legacy rows with no resolvable schedule
  ON CONFLICT (post_draft_id, platform) DO NOTHING;
  $cron_body$;

    PERFORM cron.alter_job(48, command := v_new_command);
    RAISE NOTICE 'M8a Path A component 1: cron 48 command body rewritten at % (Path A: legacy fallback removed from COALESCE).', NOW();
  END IF;
END $$;

-- =========================================================================
-- COMPONENT 1 verify gate (V7 + V8 + V9 in-migration check) [v3 verbatim]
-- =========================================================================

DO $$
DECLARE
  v_active boolean;
  v_command text;
BEGIN
  SELECT active, command INTO v_active, v_command
    FROM cron.job WHERE jobid = 48;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'M8a Path A HALT (Component 1 gate): cron 48 not found post-rewrite (catastrophic).';
  END IF;

  -- V7: cron 48 active=true
  IF v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'M8a Path A HALT (V7 gate): cron 48 active=% post-rewrite; expected true (Path A keeps cron 48 active).', v_active;
  END IF;

  -- V8 (v3 fix): cron 48 command no longer contains a function-call to the legacy fallback.
  IF v_command ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\(' THEN
    RAISE EXCEPTION 'M8a Path A HALT (V8 gate): cron 48 command still contains a function-call to the legacy fallback post-rewrite. Component 1 did not produce expected effect.';
  END IF;

  -- V9: autonomous slot-driven enqueue path is still represented by the rewritten command
  IF v_command !~ 'INSERT INTO m\.post_publish_queue' THEN
    RAISE EXCEPTION 'M8a Path A HALT (V9 gate): cron 48 command no longer contains INSERT INTO m.post_publish_queue post-rewrite (autonomous enqueue would stop).';
  END IF;
  IF v_command !~ 'pd\.scheduled_for' OR v_command !~ 's\.scheduled_publish_at' THEN
    RAISE EXCEPTION 'M8a Path A HALT (V9 gate): cron 48 command no longer references pd.scheduled_for AND s.scheduled_publish_at as COALESCE inputs.';
  END IF;

  RAISE NOTICE 'M8a Path A Component 1 verify gate: V7+V8+V9 PASS — cron 48 active=true, command rewritten (no legacy fallback call), autonomous enqueue path preserved.';
END $$;

-- =========================================================================
-- COMPONENT 2: Cleanup legacy-origin future queue rows
-- (conditional on Component 1 verify gate above passing)
-- =========================================================================
-- v4 change: cleanup band re-banded from [0, 200] (v3) to [250, 500] (v4).
-- v4 change: v_min_expected variable restored (v3 M3 "removed unused" reversed,
--            because v4 introduces a non-zero lower bound).
-- v3 note (preserved): TOCTOU gap between count check and UPDATE is negligible
-- because single transaction holds row locks; concurrent INSERTs targeting the
-- same criterion in the few seconds the migration runs are vanishingly unlikely
-- (cron 48 just had its command rewritten, so the legacy path that creates such
-- rows is gone within the same transaction).

DO $$
DECLARE
  v_count integer;
  v_min_expected integer := 250;
  v_max_expected integer := 500;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM m.post_publish_queue q
  JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
  WHERE q.status IN ('queued', 'failed')
    AND pd.slot_id IS NULL
    AND pd.created_by = 'seed_and_enqueue'
    AND q.scheduled_for > NOW();

  IF v_count < v_min_expected OR v_count > v_max_expected THEN
    RAISE EXCEPTION 'M8a cleanup SCOPE ANOMALY: % rows match criterion (expected band [%, %]). Halt for re-investigation.',
      v_count, v_min_expected, v_max_expected;
  END IF;

  RAISE NOTICE 'M8a Component 2: % rows match cleanup criterion (within band [%, %]). Proceeding with UPDATE.', v_count, v_min_expected, v_max_expected;
END $$;

UPDATE m.post_publish_queue
SET status = 'dead',
    dead_reason = 'm8_cutover_legacy_path_deprecated',
    updated_at = NOW()
WHERE queue_id IN (
  SELECT q.queue_id
  FROM m.post_publish_queue q
  JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
  WHERE q.status IN ('queued', 'failed')
    AND pd.slot_id IS NULL
    AND pd.created_by = 'seed_and_enqueue'
    AND q.scheduled_for > NOW()
);

-- =========================================================================
-- COMPONENT 3 — DEFERRED TO M8b (function rename + COMMENT)
-- =========================================================================
-- v4 explicitly removes Component 3 + V10 in-migration pre-rename gate from M8a.
-- public.get_next_scheduled_for continues to exist with its original name and
-- signature post-M8a apply. Two manual callers (public.draft_approve_and_enqueue,
-- public.draft_approve_and_enqueue_scheduled) continue to call it. M8b will
-- (1) remediate both manual callers and (2) rename + comment the function.
-- See §M8b follow-up section below.
```

**Notes on the SQL (v4 updated):**

1. **Atomicity:** single transaction. Any RAISE EXCEPTION rolls back BOTH 2 components.
2. **Idempotency:** both components individually idempotent. v3 fix preserved: Component 1's idempotency check uses function-call regex.
3. **Conditional dependency enforced via single in-migration verify gate:** Component 2 conditional on Component 1 gate (V7+V8+V9). v3's V10 pre-rename gate REMOVED (no rename in M8a).
4. **Apply-time amendments (2 items v4, reduced from 4 in v3):** (a) `updated_at` SET clause adjustment per §1.1; (b) `[v_min_expected, v_max_expected] = [250, 500]` cleanup band integers if PK directs adjustment from §1.5a fresh pre-flight.
5. **`updated_at = NOW()` for cleanup UPDATE:** matches cc-0003 v2 / cc-0004 patterns. §1.1 verifies.
6. **`WHERE queue_id IN (...)` subquery form** for cleanup UPDATE.
7. **`dead_reason='m8_cutover_legacy_path_deprecated'`** preserved from v3 (refers to the legacy path being deprecated from cron 48; M8a still validates this even with function rename deferred to M8b).
8. **No `DROP FUNCTION` / `ALTER FUNCTION` / `COMMENT ON FUNCTION` in M8a.** Deferred to M8b.
9. **Path A specifically does NOT set `cron.alter_job(48, active := false)`.**
10. **The new cron 48 command body is byte-for-byte identical** to the old body except: the third COALESCE element is removed AND two comment lines are added (v3-rephrased to remove the `get_next_scheduled_for` substring). All other clauses preserved verbatim.
11. **v3 regex pattern rationale (preserved in v4):** `~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('` matches function calls but NOT comment text.
12. **TOCTOU acknowledgement (v3 M4, preserved):** Component 2's count-vs-UPDATE gap is single-transaction-bounded. Negligible risk.
13. **v4 cleanup band rationale:** [250, 500] anchors around CC v3 pre-flight observation of 344. Upper 500 prevents runaway scope; lower 250 prevents apply on a near-zero count which would indicate criterion regression or that the cohort already drained between v3 pre-flight and v4 apply.

---

## 4. P1–P5 pre-flight checklist (per Lesson #61) (v4 — 13 items)

### P0 — Pre-condition gate

- [ ] **P0.1** §1.0 sequencing gate (cc-0003 v2 + cc-0004 Complete). Already structurally satisfied as of 2026-05-09.

### P1 — Pre-state capture (13 items v4, was 15 in v3)

- [ ] **P1.1** §1.1 information_schema check.
- [ ] **P1.2** §1.2 pg_trigger check (v3 expanded scope per L1).
- [ ] **P1.3** §1.3 cron 48 state check; capture `OLD_CRON_48_COMMAND` AND `OLD_CRON_48_SCHEDULE` (v3 explicit per L2). HALT (§8.2.j) if inactive. HALT (§8.2.k) if no queue INSERT.
- [ ] **P1.4** §1.4 callers + signature check; **v4 expected callers list = 3** (cron 48 + `draft_approve_and_enqueue` + `draft_approve_and_enqueue_scheduled`); HALT (§8.2.g, v4 rephrased) if any caller outside expected set surfaces. Function signature captured as informational (M8b reference).
- ~~**P1.4b**~~ — **RETIRED v4** (no rename in M8a, no COMMENT capture needed).
- [ ] **P1.5a** §1.5 cleanup count check. **HALT (§8.2.a) if outside [250, 500]** (v4 re-banded from v3 [0, 200]).
- [ ] **P1.5b** (NEW v3 per H3) §1.5 distinct `pd.created_by` enumeration. Informational; capture for D-01.
- [ ] **P1.5c** (NEW v3 per H4) §1.5 un-publishable legacy draft cohort query. **v4 RELAXED**: informational only; no PK direction required for M8a apply. Recorded as separate follow-up finding.
- [ ] **P1.5d** (NEW v3 per H5) §1.5 slot-driven alignment check. **HALT (§8.2.l) if non-zero.**
- [ ] **P1.5 cross-check** vs cc-0003 v2 / cc-0004. HALT (§8.2.i) if either overlap > 0.
- [ ] **P1.6** §1.6 cleanup snapshot.
- [ ] **P1.7** §1.7 pre-state aggregates.
- [ ] **P1.8** §1.8 pre_dead_reason_count baseline.
- [ ] **P1.9** §1.9 sequencing gate cross-check.

**Pass criterion:** P0.1 + all P1 checks PASS (13 items v4, down from 15 in v3 due to P1.4b retirement and merged P1.5 sub-counter).

### P2 — Side-effect surface

- [ ] **P2.1** `m.publisher_lock_queue_v2`.
- [ ] **P2.2** `m.cleanup_queue_on_publish_v1` trigger.
- [ ] **P2.3** Cron 48 — Component 1 target. Post-apply: active=true unchanged, command body rewritten, schedule unchanged (V7).
- [ ] **P2.4** Dashboard / portal queries.
- [ ] **P2.5** `m.vw_pipeline_state`.
- [ ] **P2.6** Cowork health-check.
- [ ] **P2.7** `m.fill_pending_slots` — chat investigation 2026-05-09 confirms inserts drafts + ai_jobs only, never queue rows. No conflict with Path A.
- [ ] **P2.8** Callers of `public.get_next_scheduled_for` — v4 expected 3 callers. Manual callers (`draft_approve_and_enqueue`, `draft_approve_and_enqueue_scheduled`) continue to function post-M8a apply (function still exists with original name).
- [ ] **P2.9** Future cron 48 fires post-apply — slot-driven drafts continue to enqueue; legacy-unresolvable drafts skipped via WHERE filter.
- [ ] **P2.10** (NEW v3 per H4; v4 relaxed) Un-publishable legacy drafts surfaced by P1.5c — informational; recorded as separate follow-up finding.

### P3 — Transitive dependency map

- [ ] **P3.1** Functions/views/triggers referencing `m.post_publish_queue.dead_reason`.
- [ ] **P3.2** Code-collision check on literal `'m8_cutover_legacy_path_deprecated'`.
- [ ] **P3.3** `m.post_draft.approval_status` distribution for cleanup queue rows.
- [ ] **P3.4** Cowork brief / scheduled task references.
- [ ] **P3.5** Forward-look on cron 48 post-rewrite.
- [ ] **P3.6** (v4 reframed) Active production callers of `public.get_next_scheduled_for` outside the expected v4 set of 3 — HALT (§8.2.g).

### P4 — Reversibility

- [ ] **P4.1** Rollback SQL drafted (§8.3) for **2 components (v4)**: restore old cron 48 command from §1.3, restore queue_id list. ~~Function rename reversal~~ removed v4 (no rename).
- [ ] **P4.2** No irreversible side-effects.
- [ ] **P4.3** Time-window for rollback bounded.
- [ ] **P4.4** Rollback uses captured artefacts (§1.3 + §1.6) and known constants.
- [ ] **P4.5** No partial state possible within migration.

### P5 — Post-state verification preconditions

- [ ] **P5.1** V1: dead_reason population delta.
- [ ] **P5.2** V2: zero matching queued/failed rows post-apply.
- [ ] **P5.3** V3: queued+failed depth decrease by N.
- [ ] **P5.4** V4: dead count increase by N.
- [ ] **P5.5** V5: paranoia row-set match.
- [ ] **P5.6** V6: per-status totals coherent.
- [ ] **P5.7** V7: cron 48 active=true AND schedule unchanged AND jobname unchanged.
- [ ] **P5.8** V8: cron 48 command no longer contains a function-call to the legacy fallback.
- [ ] **P5.9** V9: autonomous slot-driven enqueue path still represented.
- [ ] **P5.10** V10' (v4 reframed): expected callers list = 3 functions; HALT if outside set. ~~V10 (zero callers)~~ retired v4. ~~V10b (function rename paranoia)~~ retired v4.

**Pass criterion:** all 9 + V10' verification queries written and ready (§7; was 10 + V10b in v3).

---

## 5. D-01 packet content (NOT YET FIRED)

### 5.1 `proposal` (prose)

```
Apply M8a Path A v4 cutover: 2 coordinated components in a single transaction.
Cron 48 is REWRITTEN IN PLACE, not disabled. Function rename DEFERRED to M8b.

Migration name: m8a_cron48_rewrite_and_legacy_cleanup_v1
Project: mbkmaxqhsohbtwsqolns
Method: Supabase MCP apply_migration (single atomic transaction)

COMPONENT 1 — Rewrite cron 48 command body (cron stays active=true):
  - Removes legacy fallback function from COALESCE chain.
  - Resulting COALESCE: (pd.scheduled_for, s.scheduled_publish_at).
  - Legacy rows with both NULL are skipped via existing WHERE filter.
  - v3-rephrased comment: 'legacy fallback removed from COALESCE chain.'

IN-MIGRATION VERIFY GATE (V7 + V8 + V9): RAISE EXCEPTION if cron 48
  inactive, OR command still contains a function-call to the legacy fallback,
  OR autonomous enqueue path missing required structural elements.

COMPONENT 2 — Cleanup legacy-origin future queue rows:
  Scope: q.status IN ('queued','failed') AND pd.slot_id IS NULL
         AND pd.created_by='seed_and_enqueue' AND q.scheduled_for > NOW()
  Expected count: <N> (read-only verified <DATETIME>; halts if outside [250,500])
  UPDATE: SET status='dead', dead_reason='m8_cutover_legacy_path_deprecated',
               updated_at=NOW()

COMPONENT 3 (function rename + COMMENT) — DEFERRED TO M8b. Not in M8a SQL.
  Reason: 2 non-cron manual callers of public.get_next_scheduled_for surfaced
  at v3 pre-flight (public.draft_approve_and_enqueue and
  public.draft_approve_and_enqueue_scheduled). Renaming would break them.
  M8b is a separate cc-NNNN brief: remediate both manual callers, then rename.

v4 PRE-FLIGHT (preserved from v3):
  - §1.4 expected callers list = 3 (cron 48 + the 2 manual functions);
    HALT §8.2.g if any caller outside expected set surfaces.
  - §1.5a cleanup count band [250, 500].
  - §1.5b distinct pd.created_by enumeration (informational).
  - §1.5c un-publishable legacy draft cohort (94 at v3 pre-flight; informational;
    recorded as separate follow-up finding).
  - §1.5d slot-driven alignment check (HALT §8.2.l if non-zero).
  - §1.4b ORIGINAL_COMMENT capture RETIRED v4 (no rename).

ROLLBACK: single rollback migration; v4 reverses 2 components (no function
  rename reversal).

VERIFICATION: 9 + V10' post-apply queries (V1-V9 + V10' expected callers list).
  V10 zero-callers retired v4. V10b function-rename paranoia retired v4.
```

### 5.2 `context` (structured object)

```json
{
  "decision_under_review": "Apply M8a Path A v4 cutover: cron 48 in-place command rewrite + legacy-origin future cleanup. Function rename DEFERRED to M8b.",
  "production_action_if_approved": "Single Supabase MCP apply_migration call. Two components in one transaction with one in-migration verify gate: (1) cron.alter_job(48, command := <new body>) keeping active=true, (2) UPDATE m.post_publish_queue cleanup rows to dead/m8_cutover_legacy_path_deprecated. Component 3 (ALTER FUNCTION RENAME + COMMENT) deferred to M8b separate brief.",
  "consequence_if_delayed": "Moderate operational benefit if delayed. Pipeline-integrity benefit (single canonical schedule resolution path; legacy fallback retired from cron 48) is the primary residual reason to apply M8a. M8b (function rename + manual caller remediation) is a separate effort regardless of M8a timing.",
  "cost_of_waiting": "Low. Path A M8a is a structural cutover; no immediate operational degradation if delayed. M8b similarly low cost-of-waiting.",
  "current_evidence": [
    "Chat investigation 2026-05-09: cron 48 is the SOLE autonomous inserter into m.post_publish_queue.",
    "Chat investigation 2026-05-09: m.fill_pending_slots inserts drafts + ai_jobs only.",
    "Chat investigation 2026-05-09: no trigger inserts queue rows.",
    "CC v3 pre-flight 2026-05-09: 3 callers of public.get_next_scheduled_for surfaced — cron 48 + public.draft_approve_and_enqueue + public.draft_approve_and_enqueue_scheduled. v3 expected 1 (cron 48 only); HALTed correctly.",
    "CC v3 pre-flight 2026-05-09: cleanup count = 344 (within new v4 band [250, 500]).",
    "CC v3 pre-flight 2026-05-09: un-publishable legacy draft count = 94. Recorded as separate follow-up finding (out of M8a/M8b scope).",
    "Pre-flight §1.0: cc-0003 v2 result Complete (commit d60dcfb); cc-0004 result Complete (commit 9d5bdd37).",
    "Pre-flight §1.3: cron 48 active=<true|false>; OLD_CRON_48_COMMAND + OLD_CRON_48_SCHEDULE captured.",
    "Pre-flight §1.4: callers of legacy fallback — v4 expected 3 callers (HALT §8.2.g if outside expected set).",
    "Pre-flight §1.5a: fresh cleanup count <N> rows at <DATETIME>.",
    "Pre-flight §1.5b: distinct pd.created_by values + counts: <captured>.",
    "Pre-flight §1.5c: un-publishable legacy draft count: <captured> (carry CC's 94 figure or fresh count).",
    "Pre-flight §1.5d: post-cc-0004 slot-driven misaligned count: <captured> (HALT if non-zero).",
    "Pre-flight §1.5 cross-check: 0 overlap with cc-0003 v2 + cc-0004.",
    "Pre-flight §1.8: pre_dead_reason_count: <P>.",
    "Pre-flight §1.9: cc-0003 v2 dead_reason population: 9; cc-0004: 43.",
    "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md §2.8.",
    "docs/briefs/2026-05-05-queue-integrity-incident.md v3 §6 (original Path C; superseded by Path A)."
  ],
  "known_weak_evidence": [
    "v4 band [250, 500] is anchored around 1 observation (CC v3 pre-flight = 344). If natural drain or growth has occurred between v3 pre-flight and v4 apply, the band may need adjustment. Apply-time amendment (b) allows PK to direct band adjustment.",
    "Two coordinated components in one transaction is a smaller blast radius than v3's 3 components (function rename gone). Comprehensive rollback retained for both components.",
    "Cron edit (command rewrite) permission preserved from v3.",
    "DDL permission RETIRED v4 (no ALTER FUNCTION; deferred to M8b).",
    "Apply-time SQL has 2 amendments (updated_at, cleanup band integers). Apply session must verify both before D-01 fire.",
    "Rollback path uses captured OLD_CRON_48_COMMAND + queue_id list. No ORIGINAL_COMMENT logic v4.",
    "v4 P1.5c is informational: 94-row un-publishable legacy draft cohort will silently never publish post-M8a. Recorded as separate follow-up brief candidate — not addressed by M8a.",
    "M8b is a non-trivial separate effort: must remediate 2 manual callers (functional changes to dashboard flows) before function rename. M8b brief shape is sketched in §M8b follow-up section but not authored."
  ],
  "default_action": "proceed if D-01 returns clean agree AND §1.0 sequencing gate passed AND §1.4 confirmed exactly 3 expected callers (or fewer with FLAG) AND §1.5d alignment count = 0 AND §1.5a cleanup count in [250, 500]",
  "references": {
    "cc-0005 brief (v4 patched)": "docs/briefs/cc-0005-m8-atomic-cutover.md",
    "cc-0005 v3 (superseded by v4)": "commit 245005a3c86dc23cac8bd6cae41fea5fd135e5f9",
    "cc-0005 v2 Path A (superseded by v3)": "commit f70cb41f72e01c27c83639f1ae5bf0dac9353b70",
    "cc-0003 v2 brief": "docs/briefs/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "cc-0004 brief": "docs/briefs/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md",
    "cc-0003 v2 result": "docs/briefs/results/cc-0003-m6-phase-a-bug3-dead-letter.md",
    "cc-0004 result": "docs/briefs/results/cc-0004-m6-phase-b-v4-mismatch-dead-letter.md",
    "reconciliation brief": "docs/briefs/2026-05-09-m5-m8-vw-pipeline-state-reconciliation.md",
    "queue integrity v3": "docs/briefs/2026-05-05-queue-integrity-incident.md",
    "v2.57 sync close": "docs/runtime/sessions/2026-05-09-cc-0006-closed-cc-0005-v3-patched.md",
    "§10.2 view contract": "docs/dashboard-review-2026-05/10_product_objects_and_data_model.md"
  },
  "sql_to_apply": "<full SQL from cc-0005 §3 verbatim, with 2 apply-time amendments resolved: updated_at adjusted per §1.1, cleanup band [v_min_expected, v_max_expected] preserved or adjusted per PK direction>"
}
```

### 5.3 Decision rule on D-01 verdict

Unchanged from v2/v3: `agree` + `proceed` + risk ≤ medium + 0 pushback → apply. Lesson #62 v2.50 refinement applies.

---

## 6. Apply procedure

1. **Sequencing gate re-confirmation.**
2. **Final read-only re-verification** — re-run §1.3 + §1.4 + §1.5 (sub-queries a, b, c, d) + §1.6 + §1.8 within ~60s of apply. Confirm:
   - Cleanup count divergence < 30 rows from D-01 packet AND still inside [250, 500].
   - `OLD_CRON_48_COMMAND` + `OLD_CRON_48_SCHEDULE` unchanged from initial pre-flight.
   - Function signature unchanged (informational; M8b will use).
   - **§1.5d alignment count still = 0** (HALT §8.2.l if non-zero).
   - §1.4 still shows expected 3 callers (no new caller).
3. **Apply SQL amendment** — replace 2 placeholders: `updated_at` SET clause (per §1.1); cleanup band integers if PK directs adjustment from [250, 500]. Confirm `$cron_body$` block matches v3 locked body byte-for-byte (v4 inherits v3 cron body verbatim).
4. **`apply_migration` call** — single call.
5. **Capture the result** — record success/failure, exact return value, and all RAISE NOTICE messages: Component 1 rewrite (or no-op), Component 1 verify gate (V7+V8+V9 PASS), Component 2 count.
6. **Run all 9 + V10' verification queries (§7)** — if any fails, rollback per §8.3.
7. **If all PASS:** session continues to close-the-loop UPDATE on `m.chatgpt_review` and 4-way sync.

---

## 7. Verification queries (post-apply)

All 9 + V10' must PASS.

### V1 — dead_reason delta

```sql
SELECT COUNT(*) AS post_dead_reason_count
FROM m.post_publish_queue
WHERE dead_reason = 'm8_cutover_legacy_path_deprecated';
```

**Pass:** `post_dead_reason_count = pre_dead_reason_count + N`.

### V2 — Zero remaining matching queued/failed rows

```sql
SELECT COUNT(*) AS v2_count
FROM m.post_publish_queue q
JOIN m.post_draft pd ON pd.post_draft_id = q.post_draft_id
WHERE q.status IN ('queued', 'failed')
  AND pd.slot_id IS NULL
  AND pd.created_by = 'seed_and_enqueue'
  AND q.scheduled_for > NOW();
```

**Pass:** `v2_count = 0`.

### V3 — Queued+failed depth decrease by N

Same as cc-0003 v2 / cc-0004 V3.

### V4 — Dead count increase by N

Same as cc-0003 v2 / cc-0004 V4.

### V5 — Paranoia: only the captured rows changed

Same as cc-0003 v2 / cc-0004 V5.

### V6 — Coherence cross-check

Same as cc-0003 v2 / cc-0004 V6.

### V7 — Cron 48 active=true + schedule unchanged + jobname unchanged

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobid = 48;
```

**Pass:** `active = true` AND `jobname` unchanged from §1.3 capture AND `schedule` unchanged from `OLD_CRON_48_SCHEDULE`.

### V8 — Cron 48 command no longer contains a function-call to the legacy fallback

```sql
SELECT jobid,
       (command !~* 'get_next_scheduled_for(__deprecated_m8)?\s*\(') AS path_a_rewrite_complete,
       LENGTH(command) AS command_length
FROM cron.job
WHERE jobid = 48;
```

**Pass:** `path_a_rewrite_complete = true`.

### V9 — Autonomous slot-driven enqueue path still represented

```sql
SELECT jobid,
       (command ~ 'INSERT INTO m\.post_publish_queue') AS still_inserts_queue,
       (command ~ 'pd\.scheduled_for') AS uses_pd_scheduled_for,
       (command ~ 's\.scheduled_publish_at') AS uses_slot_scheduled_publish_at,
       (command ~ 'WHERE computed_scheduled_for IS NOT NULL') AS retains_skip_filter,
       (command ~ 'F-PUB-010') AS retains_pub_010_hard_cap_marker,
       (command ~ 'M4: slot intent lookup') AS retains_m4_annotation
FROM cron.job
WHERE jobid = 48;
```

**Pass:** all 6 columns true.

### V10' — Expected callers list (v4 reframed; replaces V10 zero-callers)

```sql
SELECT 'function' AS object_type, n.nspname || '.' || p.proname AS caller,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind IN ('f','p')
  AND pg_get_functiondef(p.oid) ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
  AND NOT (n.nspname = 'public' AND p.proname IN ('get_next_scheduled_for', 'get_next_scheduled_for__deprecated_m8'))
  AND n.nspname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')

UNION ALL

SELECT 'view', schemaname || '.' || viewname, NULL
FROM pg_views
WHERE definition ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\('
  AND schemaname IN ('m', 'public', 'c', 'f', 'a', 'k', 't')

UNION ALL

SELECT 'cron', jobname, 'jobid=' || jobid::text
FROM cron.job
WHERE command ~* 'get_next_scheduled_for(__deprecated_m8)?\s*\(';
```

**Pass (v4 reframed):** Result set must equal exactly the 2 expected non-cron callers:
- `public.draft_approve_and_enqueue` (function row)
- `public.draft_approve_and_enqueue_scheduled` (function row)

And zero cron rows (cron 48 should no longer match post-Component-1; if cron 48 surfaces, V8 already failed).

**Decision rule:** Result equals exactly the 2 expected non-cron functions → PASS. Result includes cron 48 → V8 already failed (apply rollback). Result includes additional callers → FAIL (unexpected caller emerged between pre-flight and post-apply; rollback). Result fewer than 2 functions → FAIL (a manual caller has been independently removed; investigate).

### ~~V10b~~ — RETIRED v4

v3's V10b (function rename + COMMENT paranoia) folds into M8b. Not run in M8a.

---

## 8. Rollback / no-op / halt logic

### 8.1 NO-OP path (run before D-01 fire)

Nuanced per-component NO-OP. v3 fix: Component 1 NO-OP detection uses function-call regex.

- Component 1 NO-OP if §1.3 shows command lacks function-call to legacy fallback.
- Component 2 NO-OP if §1.5a returns 0 (which would also fail HALT §8.2.a since 0 < 250).
- ~~Component 3 NO-OP~~ — retired v4 (no Component 3).

Both simultaneous NO-OP → no `apply_migration`. Document in result file.

Also §1.3 `active = false` → HALT (§8.2.j).

### 8.2 HALT paths

**8.2.a Cleanup count outside [250, 500]:** §1.5a outside band (v4 re-banded from v3 [0, 200]).
**8.2.b (RETIRED).**
**8.2.c Sequencing gate fail.**
**8.2.d (RETIRED).**
**8.2.e (RETIRED v2 Path A patch).**
**8.2.f `m.post_draft.created_by` column absent.**
**8.2.g (REPHRASED v4) Caller of legacy fallback outside expected set:** v3 read "live caller outside cron 48". v4 expected set is `{cron 48, draft_approve_and_enqueue, draft_approve_and_enqueue_scheduled}`. HALT if a caller outside this set surfaces.
**8.2.h (REPHRASED v4) Multiple overloaded signatures of `public.get_next_scheduled_for`:** informational v4 (no rename to break); flag for D-01 but does not necessarily HALT M8a unless D-01 reviewer escalates.
**8.2.i cc-0003 v2 / cc-0004 overlap > 0.**
**8.2.j Cron 48 already inactive (Path A premise violated).**
**8.2.k Cron 48 command no longer contains queue INSERT.**
**8.2.l Slot-driven misalignment count > 0:** §1.5d returns non-zero. Investigate before apply.

### 8.3 ROLLBACK path (verification fails after apply) — v4 simplified

If any of V1–V9 (or V10') FAIL:

1. Halt session continuation.
2. Apply rollback migration `m8a_cron48_rewrite_and_legacy_cleanup_v1_rollback`. v4 reverses 2 components only.

```sql
-- Rollback for m8a_cron48_rewrite_and_legacy_cleanup_v1 (v4)
-- Two reversals in single transaction. Order: 2 -> 1 (reverse of apply).
--
-- v4 Apply-time amendment rules (reduced from v3):
--   1. <UNIQUE_TAG_HERE>: apply session must pick a dollar-quote tag
--      that does NOT appear as a substring inside the captured
--      OLD_CRON_48_COMMAND. Verify via simple substring check before
--      templating. Suggested format: $rb_<random_8_chars>$ or
--      $cron_body_rollback_<UTC_unix_ts>$. NEVER use the literal
--      $cron_body_old$ shown below — that is a placeholder, not the
--      actual tag for any real apply session.
--   2. <OLD_CRON_48_COMMAND from §1.3>: paste the captured command
--      verbatim (without modification).

-- Reverse component 2: restore cleanup queue rows
UPDATE m.post_publish_queue
SET status = <pre_status>,  -- per §1.6 captured snapshot, mapped queue_id -> pre_status
    dead_reason = NULL,
    updated_at = NOW()
WHERE queue_id IN (<captured queue_id list from §1.6>);

-- Reverse component 1: restore cron 48 command body to OLD_CRON_48_COMMAND
DO $$
BEGIN
  -- v4 (preserved from v3 M1): apply session picks unique tag <UNIQUE_TAG_HERE>
  -- at runtime; the literal $cron_body_old$ shown below is illustrative.
  PERFORM cron.alter_job(48, command := $cron_body_old$<OLD_CRON_48_COMMAND from §1.3>$cron_body_old$);
  RAISE NOTICE 'M8a Path A rollback component 1: cron 48 command restored to pre-apply body.';
END $$;

-- v4: NO Component 3 reversal needed (no rename in M8a apply).
```

3. Re-run V1–V9 + V10' post-rollback. V1 = original `pre_dead_reason_count`. V2 = original §1.5a count. V7 = active=true (unchanged) + schedule unchanged. V8 returns `path_a_rewrite_complete = false` (the legacy fallback function-call is back). V10' returns expected 3 callers (cron 48 reappears in caller list since rollback restored its call).
4. Document failure mode + diagnosis.
5. PK escalation; cc-0005 v5 with corrective measures.

### 8.4 Why not template the rollback fully

v4 simplified: queue_id mapping known only at apply time. Cron jobid (48) and dollar-quote tag (apply-session unique) are the only per-apply-resolution items.

---

## 9. Stop condition

1. §1.0 sequencing gate passes.
2. §1 pre-flight all P1 checks PASS (13 items v4, down from 15 in v3).
3. §4 P0 + P1–P5 all PASS.
4. §5 D-01 fire returns clean agree + PK approval.
5. §6 apply procedure completes; in-migration verify gate (V7+V8+V9) PASSED inside transaction.
6. §7 verification V1–V9 + V10' all PASS.
7. Close-the-loop UPDATE on `m.chatgpt_review`.
8. Result file `docs/briefs/results/cc-0005-m8a-cron48-rewrite-and-legacy-cleanup.md` committed.
9. M8a closure documented in 4-way sync (M7 closure folds at M8b time; M8b is the next brief in sequence).
10. 4-way sync close.
11. **NEW v4: 94-row un-publishable legacy draft cohort recorded as separate follow-up finding/brief candidate** in 4-way sync close.

If any of §8.1, §8.2.{a,c,f,g,h,i,j,k,l}, or §8.3 paths trigger: report and stop.

---

## M8b follow-up section (NEW v4)

This section documents the deferred work as a separate brief shape. **M8b is NOT the responsibility of this v4 brief.** Sketched here for traceability.

### Scope (M8b, separate cc-NNNN)

1. **Remediate `public.draft_approve_and_enqueue` caller:**
   - Read function body to identify why it calls `public.get_next_scheduled_for(...)` and what semantic role the call serves (likely: compute a default scheduled_for when the manual approval flow doesn't supply one).
   - Replace the call with one of:
     - (a) inline equivalent computation (preferred if logic is short),
     - (b) replacement function with clearer naming + semantic boundary,
     - (c) require the caller to pass `scheduled_for` explicitly (push the responsibility upstream).
   - Test: dashboard manual-approval flow continues to function correctly.

2. **Remediate `public.draft_approve_and_enqueue_scheduled` caller:**
   - Same shape as above. May be structurally similar (likely a sibling function).

3. **Re-verify zero callers:** run §1.4 query post-remediation. Expected: 0 callers (cron 48 already removed in M8a; both manual functions remediated in M8b).

4. **Function rename + COMMENT:**
   ```sql
   ALTER FUNCTION public.get_next_scheduled_for(<ARGS>)
     RENAME TO get_next_scheduled_for__deprecated_m8b;

   COMMENT ON FUNCTION public.get_next_scheduled_for__deprecated_m8b(<ARGS>) IS
     '@deprecated M8b cutover <DATE>. Original name: public.get_next_scheduled_for. '
     'Replaced by slot-aware enqueue path (cron 48) + remediated dashboard flows. '
     'Function body retained for audit; do not call. '
     'See docs/briefs/cc-NNNN-m8b-function-deprecation.md for cutover context.';
   ```

   Note suffix `__deprecated_m8b` (was `__deprecated_m8` in v3); reflects that the deprecation lands in M8b phase.

### Pre-flight (M8b, sketched)

- M8a sequencing gate (this brief's result file Complete).
- Caller verification at apply time (expected 0 post-remediation).
- ORIGINAL_COMMENT capture per v3 H6 pattern (re-introduced in M8b).
- Standard pre-flight pattern (cc-0003 v2 / cc-0004 / cc-0005 v3 / v4 lineage).

### Verification (M8b, sketched)

- V1: function renamed (1 row at new name, 0 rows at original name).
- V2: COMMENT applied with `@deprecated M8b` annotation.
- V3: zero live callers of either name (expected after remediation).
- V4: dashboard manual-approval flows continue to function (smoke test).

### Apply gates (M8b, sketched)

- M8a result file Complete.
- Both manual callers remediated and tested.
- D-01 fire (`sql_destructive` action_type with DDL).
- PK explicit approval.

### Brief ID

Reserved as **cc-NNNN** — to be authored separately when M8a closes and PK directs M8b authoring.

---

## Separate follow-up: 94-row un-publishable legacy draft cohort

**NOT in M8a or M8b scope.** Recorded here as a follow-up finding / brief candidate.

**Cohort:** drafts where:
```sql
pd.slot_id IS NULL
AND pd.scheduled_for IS NULL
AND pd.created_by = 'seed_and_enqueue'
AND pd.approval_status IN ('approved','scheduled')
AND NOT EXISTS (SELECT 1 FROM m.post_publish_queue q WHERE q.post_draft_id = pd.post_draft_id)
```

**Observed at v3 pre-flight (CC, 2026-05-09):** 94 drafts.

**Post-M8a behaviour:** cron 48 will silently never enqueue these (rewritten WHERE filter drops legacy-unresolvable rows). They will sit in `m.post_draft` with `approval_status='approved'` or `'scheduled'` indefinitely.

**Resolution candidates (out of M8a/M8b scope):**
- (a) Bulk dead-letter (mark as failed with reason); pattern from cc-0003 v2 / cc-0004.
- (b) Manual triage per draft (likely too much manual work for 94 rows).
- (c) Schedule them retroactively via `m.fill_pending_slots` analogue (would require new code path).
- (d) Do nothing; let them sit indefinitely as historical artifact (lowest effort).

**Brief shape:** likely a small cc-NNNN single-component dead-letter brief if PK directs (a). Otherwise no brief.

**Follow-up trigger:** PK directive at M8a closure or earlier.

---

## Success criteria (for this brief draft, NOT for the apply)

v4 brief is correctly drafted when:

1. The brief file exists at `docs/briefs/cc-0005-m8-atomic-cutover.md`.
2. The apply procedure is executable using only this brief + read-only DB access + Supabase MCP.
3. **v4 scope reduction is explicit:** Component 3 deferred to M8b; only Components 1 + 2 remain.
4. **v4 cleanup band re-banded to [250, 500]** with `v_min_expected` restored.
5. SQL is locked to v4 §3, with 2 documented apply-time amendments (was 4 in v3).
6. Verification queries V1–V9 + V10' runnable post-amendment.
7. Rollback for 2 components concrete: `OLD_CRON_48_COMMAND` (§1.3), captured queue_id list (§1.6). No function rename reversal.
8. Sequencing gates re-confirmed at apply procedure step 1.
9. M8a closure folding into 4-way sync documented.
10. Forbidden actions explicitly prohibit `cron.alter_job(48, active := false)` AND `ALTER FUNCTION` AND `COMMENT ON FUNCTION`.
11. **v4 §M8b follow-up section sketches the deferred work** (manual caller remediation + function rename).
12. **v4 separate-follow-up section records the 94-row un-publishable legacy draft cohort** as out-of-M8a/M8b scope.
13. v3 regex/function-call checks preserved where still relevant (§1.4, §3 Component 1 idempotency, §3 Component 1 verify gate, §7 V8, §7 V10').
14. v3 V10 zero-callers in-migration gate REMOVED. V10b function-rename paranoia REMOVED. v3 §1.4b ORIGINAL_COMMENT capture RETIRED.
15. **v4 H1–H6 + L1–L2 + M1–M4 (where still relevant) preserved.** L19–L21 v4 lesson candidates documented.
16. No production state changed by drafting or by this v4 patch.

---

## Notes

This is the fourth cc-NNNN brief in the brief-runner-v0 trial; third apply-class brief; **first to undergo a critical doc-only correctness patch (v3) AND a scope-reduction patch (v4) before first apply**. v4 is the second in-place patch on this brief without any apply having occurred (consistent with L17 in-place-patching pattern: brief identifier + migration name preserved as long as brief was never applied; v4 changes migration name to `m8a_cron48_rewrite_and_legacy_cleanup_v1` to reflect the scope reduction, not because v3 was burned).

### Brief-runner-v0 watch items specific to cc-0005 (Path A v4)

1. **Path A staged into M8a + M8b** — chat investigation 2026-05-09 + CC v3 pre-flight HALT 2026-05-09 established that the function rename in v3 Component 3 would break 2 manual callers. PK directed staging.

2. **In-migration verify gate** — single gate in M8a (V7+V8+V9). v3's V10 pre-rename gate REMOVED in v4.

3. **Atomic 2-component migration with embedded dollar-quoted command body** — v4 reduces from 3 to 2 components.

4. **Cron edit permission** — retained from v3.

5. **DDL permission** — RETIRED in v4 (deferred to M8b).

6. **Cleanup count band re-banded to [250, 500]** — anchored around CC's v3 pre-flight observation of 344 rows.

7. **9 + V10' verification queries** (was 10 + V10b in v3). V10 zero-callers retired; V10b function-rename paranoia retired.

8. **Rollback complexity reduced** — v4 reverses 2 components instead of 3. ORIGINAL_COMMENT logic removed.

9. **M8a closure** — doc-only fold into 4-way sync. M7 closure folds at M8b time.

10. **§1.5 cross-check** — unique to cc-0005.

11. **Apply-time SQL amendments (2 items v4, down from 4 in v3)** — `updated_at` + cleanup band integers.

12. **In-place patching pattern (L17)** — v4 supersedes v3 in place because v3 was never applied. Brief identifier preserved (`cc-0005`); migration name updated for clarity (`m8a_*_v1`).

13. **Function-call regex pattern (L16)** — preserved from v3; correctly distinguished call-sites from comments AND surfaced all 3 callers at v3 pre-flight.

14. **Pre-flight cohort surfacing pattern (L18)** — vindicated by v3 pre-flight: surfaced 2 manual callers AND 94-row un-publishable cohort. Both surfaced cleanly; 2 callers triggered HALT (correct), 94-row cohort triggered informational capture (correct).

15. **NEW v4 — L19 (CC v3 pre-flight HALT pattern)** — v3 §1.4 caller check correctly HALTed at apply when expected callers (1) didn't match observed callers (3). Validates the v3 H1–H6 expansion.

16. **NEW v4 — L20 (in-place patch vs scope-reduce vs new brief)** — distinct from L17. L17: in-place patch when bugs are caught BEFORE apply. L20: when blocker requires non-trivial follow-up work, defer to a new brief rather than retry in-place. M8b is L20's exemplar.

17. **NEW v4 — L21 (scope re-banding pattern)** — brief lower bounds matter as much as upper bounds. v3 had min=0 (allowing no-op); v4 re-bands [250, 500] to REQUIRE non-trivial cohort.

### Patch history details (v4 patch, 2026-05-09)

Patches relative to v3 (commit `245005a3`):

1. **Title** — added v4 Patched line; renamed migration in title to "M8a Path A cutover (cron 48 in-place rewrite + legacy-origin future cleanup; function deprecation **DEFERRED to M8b**)".
2. **Header block** — added v4 Patched line with M8 staging summary.
3. **NEW v4 entry at top of §Patch history** — summarises CC's v3 pre-flight HALT, the 2 manual callers, the 94-row un-publishable cohort, and the M8a/M8b staging decision.
4. **§Forbidden actions amendment list** — reduced from 4 items (v3) to 2 items (v4): retired `2026-05-XX` date and `<ORIGINAL_COMMENT>` placeholder amendments.
5. **§Forbidden actions** — added explicit prohibition on `ALTER FUNCTION public.get_next_scheduled_for(...)` and `COMMENT ON FUNCTION public.get_next_scheduled_for(...)` in M8a.
6. **§Forbidden actions** — updated cleanup band to [250, 500].
7. **§Forbidden actions** — updated §1.4 expected callers to set of 3.
8. **Investigation record** — added items 5 + 6 documenting CC's v3 pre-flight HALT findings.
9. **§1.4** — query unchanged; decision rule rewritten for v4 expected callers list of 3.
10. **§1.4 signature surface** — decision rule rephrased (informational v4; M8b reference).
11. **§1.4b** — RETIRED v4 (no rename; no COMMENT capture needed).
12. **§1.5a** — cleanup count band re-banded from [0, 200] (v3) to [250, 500] (v4). Apply-time amendment (b) allows PK to direct band adjustment.
13. **§1.5c** — decision rule RELAXED v4: informational only; no PK direction blocker for M8a apply. 94-row figure recorded as separate follow-up finding.
14. **§3 Component 1** — unchanged from v3 (verbatim).
15. **§3 Component 1 verify gate** — unchanged from v3.
16. **§3 Component 2** — cleanup band re-banded to [250, 500]; `v_min_expected` variable restored (v3 M3 reversal).
17. **§3 V10 in-migration pre-rename gate** — REMOVED v4 (no rename in M8a).
18. **§3 Component 3** — REMOVED v4 (function rename + COMMENT deferred to M8b).
19. **§3 Notes** — reduced to 13 notes (was 12 in v3); updated for v4 scope.
20. **§4 P1–P5** — P1.4b removed; P1.4 expected callers set of 3; P1.5a re-banded; P1.5c relaxed; P5.10 reframed (V10' instead of V10/V10b). Pass criterion 13 P1 items (was 15).
21. **§5 D-01 packet** — proposal rewritten for v4 (M8a only); evidence + weak-evidence + references all updated.
22. **§6 Apply procedure** — step 2 expanded for fresh band check; step 3 reduced amendment list; step 5 reduced RAISE NOTICE expectations.
23. **§7 V10** — RETIRED v4 (zero-callers semantic invalid for M8a). Replaced with V10' (expected callers list).
24. **§7 V10b** — RETIRED v4 (function-rename paranoia not applicable).
25. **§8.1 NO-OP path** — Component 3 NO-OP retired.
26. **§8.2 HALT paths** — 8.2.g rephrased (caller outside expected set of 3); 8.2.h rephrased (multiple sigs informational, not hard HALT in v4).
27. **§8.3 Rollback** — Component 3 reversal removed; ORIGINAL_COMMENT placeholder removed; reduced to 2 reversals.
28. **§9 Stop condition** — P1 check count 15 → 13; verification 10 + V10b → 9 + V10'; added separate-follow-up record for 94-row cohort.
29. **NEW §M8b follow-up section** — sketches the deferred work as a separate brief shape.
30. **NEW §Separate follow-up** — records the 94-row un-publishable legacy draft cohort as out-of-M8a/M8b scope.
31. **§Notes brief-runner-v0 watch items** — added items 15 (L19), 16 (L20), 17 (L21) as v4 lesson candidates.
32. **§Notes Patch history details (this section)** — v4 patch enumeration (32 items).

### Open dependencies for the apply session (v4 updated)

Before cc-0005 (M8a v4) can apply:

- **cc-0003 v2 apply** complete. Confirmed Complete v2.55.
- **cc-0004 apply** complete. Confirmed Complete v2.56.
- **Pre-flight §1.4** confirms exactly 3 expected callers (cron 48 + 2 manual functions). v4 expected.
- ~~Pre-flight §1.4b~~ — RETIRED v4.
- **Pre-flight §1.3** confirms cron 48 currently `active=true`. Path A premise.
- **Pre-flight §1.5a** count inside [250, 500].
- **Pre-flight §1.5d** alignment count = 0 (HALT §8.2.l).
- ~~Pre-flight §1.5c PK direction~~ — RELAXED v4 (informational only).
- D-01 fire passes clean.
- PK explicit approval phrase received.

When all hold: M8a apply session can proceed.

**M8b is a separate effort and is NOT a prerequisite for M8a apply.** M8a applies independently; M8b authored later when manual caller remediation is scoped.

---

*Brief authored 2026-05-09 Sydney by chat. Path A patched 2026-05-09 (v2, commit `f70cb41f`). v3 patched 2026-05-09 under PK direction (regex correctness + H1-H6 + L2; commit `245005a3`). v4 patched 2026-05-09 under PK direction (M8 staged → M8a only; Component 3 deferred to M8b after CC's v3 pre-flight HALT surfaced 2 non-cron manual callers + 94-row un-publishable cohort). Inputs: cc-0003 v2 + cc-0004 brief shapes; reconciliation brief; queue integrity v3; chat investigation 2026-05-09; CC v3 pre-flight HALT 2026-05-09. Output: full apply brief (2-component cutover SQL with one in-migration verify gate using function-call regex throughout + P0 + P1–P5 + D-01 packet with 2-amendment SQL + 9 + V10' verification queries + 2-component rollback + halt paths + stop condition + M8b follow-up sketch + separate-follow-up for 94-row cohort). No production state changed by drafting v4. cc-0005 (M8a v4) apply gated by §1.0 sequencing (already met) + §1.4 expected callers set of 3 + §1.3 cron state + §1.5d alignment + §1.5a band [250, 500] + D-01 + PK approval. Awaiting PK direction to schedule apply session.*
